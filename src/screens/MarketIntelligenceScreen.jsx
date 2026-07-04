// DeepBench v6.0.20 | MarketIntelligenceScreen.jsx | S-MARKET-INTEL-01c — Proofreader retrofit (two-layer needs_review + retry-once-on-block) + Pipeline Log
// FEATURE: MI-01 — Market Intelligence screen, three-column layout per market-intelligence-v4.html
// FEATURE: MI-02 — deterministic human-decision layer: hypothesis pick/write + Discard are explicit
// human controls (Track as Assumption / Make Permanent ship in S-MARKET-INTEL-01d)
// FEATURE: MI-03 — Theory Evidence swap-on-hypothesis-select (live); Data Room default charts still roadmap
// FEATURE: AI-39 — two-layer needs_review OR-gate (Marcus self-flag OR Owen/Proofreader eval.result
// ==='revise'), plus retry-once-on-block, rebuilt as Layer 2 orchestration (ARCHITECTURE.md §19b)
// FEATURE: MI-04 — Pipeline Log, real events only (Intent Routing, Q&A Answer, Proofreader, Stress Test)
import { useState, useRef, useEffect } from "react";
import { T, display, body, mono } from "../tokens.js";
import { TENANT_ID } from "../config.js";
import { AppShell } from "../AppShell.jsx";
import { Card, Corners, AiBadge, FeatureBadge, AgentAvatar } from "../components/SharedUI.jsx";
import { useAgents } from "../hooks/useAgents.js";
import { setAIStatus, clearAIStatus } from "../hooks/useAIStatus.js";
import { AI_PAT } from "../aiPatterns.js";

const EXAMPLE_QUESTIONS = [
  { id: "clean",  label: "Japan is Apple's fastest-growing GEO in 2025 — what is driving that?" },
  { id: "review", label: "Why is our EMEA retail partner's co-op budget utilization so low this quarter?" },
  { id: "fail",   label: "How is our authorized reseller network performing in Vietnam?" },
];

const ESCALATE_PLACEHOLDER =
  `That reads as an "escalate" request. Escalating for deeper research ships in a future build — ask a direct question, or run a Theory/Forecast/Correct for now.`;

const QA_FAILURE_TEXT =
  `Marcus couldn't produce an answer that passed review after two attempts — try rephrasing the question.`;

const INTENT_LABEL = { theory: "Theory", forecast: "Forecast", correct: "Correct" };

// FEATURE: MI-04 — capability display metadata, sourced from the same SERVICE_CATALOG entries
// already live in useAIActivity.js (not duplicated data — just the 3 slugs this screen calls)
const SERVICE_LABEL = {
  "channel-intelligence": { name: "Channel Intelligence", patterns: "Structured Output, RAG, Case-Based Reasoning" },
  "quality-gate": { name: "Quality Gate", patterns: "Structured Output, Guardrails / Output Filtering, LLM-as-Judge / Verifier" },
  "hypothesis-evaluation": { name: "Hypothesis Evaluation", patterns: "Structured Output, RAG, Case-Based Reasoning" },
};

// FEATURE: MI-04 — real event summaries, driven entirely by actual call responses (evt.data),
// never scripted text. Color: T.moss = pass/clean, T.brass = flagged/revise, T.flag = blocked.
function describePipelineEvent(evt) {
  switch (evt.type) {
    case "intent_routing":
      return { capability: "channel-intelligence", summary: `Classified intent: ${evt.data.intent} (confidence: ${evt.data.confidence})`, color: T.navyMid };
    case "qa_answer":
      return { capability: "channel-intelligence", summary: `Answered${evt.attempt === 2 ? " (attempt 2)" : ""} · confidence_tier: ${evt.data.confidence_tier} · self-flag: ${evt.data.needs_review ? "yes" : "no"}`, color: evt.data.needs_review ? T.brass : T.moss };
    case "proofreader": {
      const g = evt.data.guardrail || {}, e = evt.data.eval || {};
      if (g.result === "block") {
        return { capability: "quality-gate", summary: `Guardrail: block — ${g.rule_violated}${evt.attempt === 1 ? " → retrying" : " (attempt 2) — answer withheld"}`, color: T.flag };
      }
      return { capability: "quality-gate", summary: `Guardrail: pass${evt.attempt === 2 ? " (attempt 2)" : ""} · Eval: ${e.result}${e.result === "revise" ? ` — ${e.critique}` : ""}`, color: e.result === "revise" ? T.brass : T.moss };
    }
    case "stress_test":
      return { capability: "hypothesis-evaluation", summary: `Stress test complete · confidence: ${evt.data.confidence}`, color: T.moss };
    default:
      return { capability: null, summary: "", color: T.muted };
  }
}

// FEATURE: MI-02 — generalized to accept any capability/agent/task_context (was hardcoded to
// channel-intelligence/marcus/{goal:message}) — same contract execute.js already exposes, now
// used by Marcus's channel-intelligence calls, Priya's hypothesis-evaluation calls, and Owen's
// quality-gate calls.
async function callCapability({ capability_slug, intent_slug, agent_id, task_context, runtime_context = null, format_skill_profile_slug = null, display_agent_id = null }) {
  const res = await fetch("/api/capabilities/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      capability_slug, intent_slug, agent_id, task_context, runtime_context,
      format_skill_profile_slug, display_agent_id,
      tenant_id: TENANT_ID,
    }),
  });
  if (!res.ok) throw new Error(`${capability_slug} ${intent_slug} failed: ${res.status}`);
  const result = await res.json();
  return result.content || {};
}

// FEATURE: AI-39 — two-layer needs_review OR-gate (self-flag OR Proofreader eval.result==='revise')
// plus retry-once-on-block. This is a Layer 2 orchestration of two ordinary execute.js calls —
// the retry mechanism used to live inside a standalone quality-gate.js route (S-APPLE-02c) that
// directly imported runChannelIntelligence; S-CAPABILITY-EXEC-02 deleted that route entirely when
// it generalized every capability onto execute.js (ARCHITECTURE.md §19b: cross-capability handoff
// is Layer 2's job, never Layer 3's). Rebuilt here, same behavior, no capability-specific Layer 3 code.
async function runQaWithQualityGate(message, conversationContext, onEvent) {
  const answer = async (attempt) => {
    const qa = await callCapability({
      capability_slug: "channel-intelligence", intent_slug: "ci-answer-intent", agent_id: "marcus",
      task_context: { goal: message }, runtime_context: conversationContext,
    });
    onEvent({ type: "qa_answer", agentId: "marcus", attempt, data: qa });
    return qa;
  };

  // FEATURE: AI-39 — question included for the first time (gap in the original S-APPLE-02c design:
  // qg-review-intent scores a `responsiveness` dimension that cannot be judged without the question).
  const review = async (qa, attempt) => {
    const gate = await callCapability({
      capability_slug: "quality-gate", intent_slug: "qg-review-intent", agent_id: "owen",
      task_context: { question: message, candidate_answer: qa.answer, confidence_tier: qa.confidence_tier, citations: qa.citations },
    });
    const retrying = gate.guardrail?.result === "block" && attempt === 1;
    onEvent({ type: "proofreader", agentId: "owen", secondaryAgentId: retrying ? "marcus" : null, attempt, data: gate });
    return gate;
  };

  let qa = await answer(1);
  let gate = await review(qa, 1);

  if (gate.guardrail?.result === "block") {
    if (!message) throw new Error("message required to retry a blocked answer");
    qa = await answer(2);
    gate = await review(qa, 2);
    if (gate.guardrail?.result === "block") {
      return { kind: "qa_failed", text: QA_FAILURE_TEXT };
    }
  }

  const needs_review = !!qa.needs_review || gate.eval?.result === "revise";
  const review_reason = qa.needs_review ? qa.review_reason : (gate.eval?.result === "revise" ? gate.eval.critique : null);
  return { kind: "qa", answer: qa.answer, confidence_tier: qa.confidence_tier, citations: qa.citations, needs_review, review_reason };
}

async function runIntentPipeline(message, conversationContext, onEvent) {
  const routing = await callCapability({
    capability_slug: "channel-intelligence", intent_slug: "ci-routing-intent", agent_id: "marcus",
    task_context: { goal: message }, runtime_context: conversationContext,
  });
  onEvent({ type: "intent_routing", agentId: "marcus", data: routing });
  if (routing.intent === "escalate") {
    return { kind: "non_qa", text: ESCALATE_PLACEHOLDER };
  }
  if (routing.intent !== "qa") {
    return { kind: "hyp_entry", intent: routing.intent, extractedHypothesis: routing.extracted_hypothesis, flaggedQuestion: message };
  }
  return runQaWithQualityGate(message, conversationContext, onEvent);
}

// FEATURE: MI-02/MI-03 — Generate Hypotheses (Priya/hypothesis-evaluation). Skips straight to
// the picker, pre-filled, when the director already wrote their own claim.
async function generateHypotheses({ flaggedQuestion, flaggedAnswer, reviewReason }) {
  const gen = await callCapability({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-generation-intent", agent_id: "priya",
    task_context: {
      flagged_question: flaggedQuestion,
      flagged_answer: flaggedAnswer || "",
      review_reason: reviewReason || "director-initiated, no explicit claim extracted",
    },
  });
  return gen.hypotheses || [];
}

// FEATURE: MI-02/MI-03 — live Stress Test (Priya/hypothesis-evaluation), rendered via Alex
// Reeves's intelligence-review-format Format Skill (format-last, AA-77) — the 8-field schema
// lives entirely on Alex's Skill Profile, never hardcoded here (ARCHITECTURE.md §13 rule 14).
async function runStressTest({ hypothesis, intent, flaggedQuestion, flaggedAnswer, priorStressTest }) {
  return callCapability({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-stress-test-intent", agent_id: "priya",
    task_context: {
      hypothesis, intent,
      flagged_question: flaggedQuestion || "", flagged_answer: flaggedAnswer || "",
      prior_stress_test: priorStressTest || null,
    },
    format_skill_profile_slug: "intelligence-review-format",
    display_agent_id: "alex",
  });
}

function MessageBubble({ msg, onReview }) {
  const isUser = msg.role === "user";

  if (msg.kind === "hyp_submitted") {
    return (
      <div style={{marginBottom:12,maxWidth:"96%"}}>
        <div style={{background:T.card,border:`1px solid ${T.brassLight}`,borderLeft:`4px solid ${T.brass}`,borderRadius:3}}>
          <div style={{background:"#f6ecd8",padding:"7px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:T.brassDeep}}>Submitted Hypothesis</span>
            <span style={{fontFamily:mono,fontSize:9,padding:"2px 7px",background:T.brass,color:T.card,borderRadius:2,textTransform:"uppercase"}}>{INTENT_LABEL[msg.intent] || msg.intent}</span>
          </div>
          <div style={{padding:"11px 13px",fontFamily:body,fontSize:12,lineHeight:1.55,color:T.ink}}>{msg.text}</div>
        </div>
      </div>
    );
  }

  if (msg.kind === "stress_test") {
    const st = msg.stressTest || {};
    const sections = [
      { key: "supports",    label: "✓ Supports",      color: T.moss,      data: st.supports },
      { key: "complicates", label: "⚠ Complicates",   color: T.flag,      data: st.complicates },
      { key: "consider",    label: "→ Consider also",  color: T.mutedDeep, data: st.consider },
    ];
    return (
      <div style={{marginBottom:12,maxWidth:"96%"}}>
        <div style={{background:T.card,border:`1px solid ${T.line}`,borderLeft:`4px solid ${T.navy}`,borderRadius:3}}>
          <div style={{background:T.cardAlt,padding:"7px 12px"}}>
            <span style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:T.navy}}>AI Stress Test · Priya Nair</span>
          </div>
          <div style={{padding:"11px 13px",display:"flex",flexDirection:"column",gap:9}}>
            {st.headline && <div style={{fontFamily:body,fontSize:13,fontWeight:600,color:T.ink}}>{st.headline}</div>}
            {sections.map(s => (s.data && s.data.text) ? (
              <div key={s.key}>
                <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:s.color,marginBottom:3}}>{s.label}</div>
                <p style={{margin:0,fontFamily:body,fontSize:11.5,lineHeight:1.5,color:T.ink}}>{s.data.text}</p>
              </div>
            ) : null)}
          </div>
        </div>
      </div>
    );
  }

  if (msg.kind === "hyp_discard") {
    return <div style={{marginBottom:12,fontFamily:body,fontSize:12,fontStyle:"italic",color:T.muted}}>{msg.text}</div>;
  }

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:isUser?"flex-end":"flex-start",marginBottom:12}}>
      <div style={{
        maxWidth:"85%",padding:"10px 14px",fontFamily:body,fontSize:13,lineHeight:1.5,
        background: isUser ? T.navy : (msg.needs_review ? "#f3e6cc" : T.card),
        color: isUser ? T.card : T.ink,
        border: isUser ? "none" : `1px solid ${msg.needs_review ? T.brass : T.line}`,
        borderRadius:3,
      }}>
        {msg.text}
      </div>
      {!isUser && msg.needs_review && (
        <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
          <div style={{fontFamily:mono,fontSize:9.5,color:T.brassDeep,letterSpacing:0.3}}>
            ⚑ NEEDS REVIEW — {msg.review_reason || "flagged for review"}
          </div>
          <button onClick={() => onReview(msg)}
            style={{alignSelf:"flex-start",background:"none",border:`1px solid ${T.brass}`,color:T.brassDeep,fontFamily:body,fontSize:11.5,padding:"5px 10px",borderRadius:2,cursor:"pointer"}}>
            Review This Answer →
          </button>
        </div>
      )}
      {!isUser && !msg.needs_review && msg.kind === "qa" && (
        <div style={{marginTop:4}}><AiBadge label={AI_PAT.AGENT_ROUTING}/></div>
      )}
    </div>
  );
}

function EvidenceColumn({ hypFlow, onIntentChange, onSelectHypothesis, onDiscard }) {
  const [customText, setCustomText] = useState("");

  useEffect(() => {
    if (hypFlow && hypFlow.prefillText) setCustomText(hypFlow.prefillText);
  }, [hypFlow && hypFlow.prefillText]);

  if (!hypFlow) {
    const layers = [
      { label: "Sourced",     color: T.moss },
      { label: "Inferred",    color: T.brass },
      { label: "Synthesized", color: T.mutedDeep },
      { label: "Learned",     color: T.navyMid },
    ];
    return (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.muted}}>Evidence</div>
        <div style={{background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:16,position:"relative"}}>
          <div style={{fontFamily:body,fontSize:12,color:T.muted,marginBottom:12}}>
            Data Room charts ship in S-MARKET-INTEL-03. Run a Theory, Forecast, or Correct to see live Theory Evidence here.
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {layers.map(l => (
              <span key={l.label} style={{fontFamily:mono,fontSize:9,padding:"3px 8px",border:`1px solid ${l.color}`,color:l.color}}>
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const st = hypFlow.stressTest;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.muted}}>Theory Evidence</div>
      <div style={{background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:16,display:"flex",flexDirection:"column",gap:14}}>

        <div style={{display:"flex",gap:6}}>
          {["theory","forecast","correct"].map(i => (
            <button key={i} onClick={() => onIntentChange(i)}
              style={{flex:1,padding:"8px 6px",fontFamily:mono,fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",
                background: hypFlow.intent === i ? T.brass : "transparent",
                color: hypFlow.intent === i ? T.card : T.muted,
                border:`1px solid ${T.brass}`,cursor:"pointer"}}>
              {INTENT_LABEL[i] || i}
            </button>
          ))}
        </div>

        {hypFlow.stage === "generating" && (
          <div style={{fontFamily:mono,fontSize:11,color:T.muted}}>Priya is generating hypotheses…</div>
        )}

        {hypFlow.candidates && hypFlow.candidates.length > 0 && hypFlow.stage !== "generating" && (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Select or write a hypothesis</div>
            {hypFlow.candidates.map(h => (
              <div key={h.id} onClick={() => onSelectHypothesis(h.text)}
                style={{padding:"9px 11px",background:T.card,border:`1px solid ${hypFlow.chosenText===h.text?T.brass:T.lineSoft}`,
                  fontFamily:body,fontSize:12,color:T.ink,cursor:"pointer",display:"flex",gap:8}}>
                <span style={{fontFamily:mono,fontSize:10,color:T.brassDeep,flexShrink:0}}>{h.id}</span>
                <span>{h.text}</span>
              </div>
            ))}
          </div>
        )}

        {hypFlow.stage !== "generating" && (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {!hypFlow.candidates && <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Write your hypothesis</div>}
            <textarea rows={2} value={customText} onChange={e => setCustomText(e.target.value)}
              placeholder="...or write your own explanation"
              style={{padding:"9px 11px",border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:12,background:T.card,color:T.ink,resize:"vertical"}}/>
            <button onClick={() => { if (customText.trim()) { onSelectHypothesis(customText.trim()); setCustomText(""); } }}
              disabled={!customText.trim()}
              style={{alignSelf:"flex-start",padding:"6px 12px",background:T.navy,color:T.card,border:"none",fontFamily:body,fontSize:11.5,cursor:customText.trim()?"pointer":"default"}}>
              Use this hypothesis
            </button>
          </div>
        )}

        {hypFlow.stage === "testing" && (
          <div style={{fontFamily:mono,fontSize:11,color:T.muted}}>Priya is stress-testing this hypothesis…</div>
        )}

        {st && hypFlow.stage === "result" && (
          <>
            {st.override_warning && (
              <div style={{padding:"9px 11px",background:"#f3e6cc",border:`1px solid ${T.brass}`,fontFamily:body,fontSize:11,color:T.brassDeep}}>
                ⚑ AI flagged a complicating factor not fully resolved by this hypothesis. Committing will log this as an override.
              </div>
            )}

            {Array.isArray(st.projected_state) && st.projected_state.length > 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Current vs. Projected</div>
                {st.projected_state.map((m, i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",fontFamily:body,fontSize:11.5,color:T.ink,padding:"6px 0",borderBottom:`1px solid ${T.lineSoft}`}}>
                    <span>{m.metric}</span>
                    <span style={{color:T.muted}}>{m.current} <span style={{color:T.brassDeep}}>→</span> {m.projected} {m.unit}</span>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(st.key_data_points) && st.key_data_points.length > 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Key Data Points</div>
                {st.key_data_points.map((d, i) => (
                  <div key={i} style={{fontFamily:body,fontSize:11,color:T.ink}}>
                    <b>{d.label}:</b> {d.value} <span style={{color:T.muted,fontFamily:mono,fontSize:9.5}}>· {d.source} · {d.confidence}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {hypFlow.stage === "result" && (
          <div style={{display:"flex",gap:6,marginTop:4}}>
            <button onClick={onDiscard}
              style={{flex:1,padding:"8px 6px",background:"transparent",border:`1px solid ${T.line}`,fontFamily:body,fontSize:11,color:T.ink,cursor:"pointer"}}>
              Discard
            </button>
            <button disabled title="Ships in the next Market Intelligence session"
              style={{flex:1,padding:"8px 6px",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:11,color:T.muted,cursor:"not-allowed"}}>
              Track as Assumption
            </button>
            <button disabled title="Ships in the next Market Intelligence session"
              style={{flex:1,padding:"8px 6px",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:11,color:T.muted,cursor:"not-allowed"}}>
              Make Permanent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// FEATURE: MI-04 — Pipeline Log: real event log driven by actual agent calls (Intent Routing,
// Q&A Answer, Proofreader pass/block/revise incl. retry hand-off, Stress Test). Intake Assistant
// triage and Reasoner Memory Consolidation are not rendered — neither is called anywhere on this
// screen yet (01d scope) — never fabricate an event type nothing on the page actually triggers.
function AuditColumn({ events }) {
  const agents = useAgents();
  const agentById = (id) => agents.find(a => a.id === id);
  const ordered = [...events].reverse(); // newest event on top, confirmed with John

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.muted}}>Audit</div>
      <div style={{background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:16,display:"flex",flexDirection:"column",gap:10}}>
        <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.muted}}>Pipeline Log</div>
        {ordered.length === 0 ? (
          <div style={{fontFamily:body,fontSize:12,color:T.muted}}>
            Real agent-call events appear here as the conversation runs. About Market Intelligence and Demo Reset controls ship in S-MARKET-INTEL-01d / 03.
          </div>
        ) : ordered.map(evt => {
          const { capability, summary, color } = describePipelineEvent(evt);
          const svc = SERVICE_LABEL[capability];
          const primary = agentById(evt.agentId);
          const secondary = evt.secondaryAgentId ? agentById(evt.secondaryAgentId) : null;
          return (
            <div key={evt.id} style={{borderLeft:`3px solid ${color}`,paddingLeft:10,display:"flex",flexDirection:"column",gap:4}}>
              <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:6}}>
                {primary && <AgentAvatar who={primary.id} size={20}/>}
                <span style={{fontFamily:body,fontSize:11.5,fontWeight:600,color:T.ink}}>{primary ? primary.name : evt.agentId}</span>
                <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{primary ? primary.role : ""}</span>
                {secondary && (
                  <>
                    <span style={{fontFamily:mono,fontSize:10,color:T.muted}}>→</span>
                    <AgentAvatar who={secondary.id} size={20}/>
                    <span style={{fontFamily:body,fontSize:11.5,fontWeight:600,color:T.ink}}>{secondary.name}</span>
                    <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{secondary.role}</span>
                  </>
                )}
              </div>
              {svc && <div style={{fontFamily:mono,fontSize:9,color:T.muted}}>{svc.name} · {svc.patterns}</div>}
              <div style={{fontFamily:body,fontSize:11.5,color:T.ink}}>{summary}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InteractColumn({ messages, loading, onSubmit, onReview }) {
  const agents = useAgents();
  const marcus = agents.find(a => a.id === "marcus");
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  const submit = (text) => {
    const clean = (text || "").trim();
    if (!clean || loading || !marcus) return;
    setInput("");
    onSubmit(clean);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,minHeight:0,flex:1}}>
      <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.brass}}>Interact</div>
      <div style={{background:"#fffdf8",border:`1px solid ${T.line}`,borderRadius:3,position:"relative",display:"flex",flexDirection:"column",flex:1,minHeight:420}}>
        <Corners/>
        <div style={{padding:"13px 16px",borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",gap:10}}>
          {marcus && <AgentAvatar who={marcus.id} size={28}/>}
          <div>
            <div style={{fontFamily:display,fontSize:13,fontWeight:600,color:T.navy}}>{marcus ? marcus.name : "GEO CSO Expert"}</div>
            <div style={{fontFamily:mono,fontSize:9.5,color:T.muted}}>Channel Intelligence · Q/A · Theory · Forecast · Correct · Escalate</div>
          </div>
        </div>

        <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:16,minHeight:0}}>
          {messages.length === 0 ? (
            <div>
              <div style={{fontFamily:body,fontSize:13,color:T.ink,lineHeight:1.6,marginBottom:16}}>
                Ask a question, run a theory, forecast a trend, correct the record, or escalate for deeper
                research — five ways to work with the Data Room. Start with a real question below, or try one
                of these:
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {EXAMPLE_QUESTIONS.map(q => (
                  <button key={q.id} onClick={() => submit(q.label)} disabled={loading}
                    style={{textAlign:"left",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:"10px 12px",fontFamily:body,fontSize:12.5,color:T.ink,cursor:loading?"default":"pointer"}}>
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => <MessageBubble key={i} msg={m} onReview={onReview}/>)
          )}
          {loading && <div style={{fontFamily:mono,fontSize:11,color:T.muted}}>Marcus is thinking…</div>}
        </div>

        <div style={{padding:"10px 14px",borderTop:`1px solid ${T.line}`,display:"flex",gap:8}}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(input); }}
            placeholder="Ask about channel performance…"
            disabled={loading}
            style={{flex:1,padding:"9px 12px",border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:13,background:T.card,color:T.ink}}
          />
          <button onClick={() => submit(input)} disabled={loading || !input.trim()}
            style={{padding:"9px 16px",background:T.navy,color:T.card,border:"none",fontFamily:body,fontSize:13,cursor:loading?"default":"pointer"}}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MarketIntelligenceScreen() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hypFlow, setHypFlow] = useState(null);
  const [pipelineEvents, setPipelineEvents] = useState([]);

  const logEvent = (evt) => setPipelineEvents(prev => [...prev, { ...evt, id: prev.length }]);

  const conversationContext = () =>
    messages.filter(m => typeof m.text === "string").map(m => `${m.role}: ${m.text}`).join("\n");

  const enterHypothesisFlow = async ({ intent, extractedHypothesis, flaggedQuestion, flaggedAnswer, reviewReason }) => {
    if (extractedHypothesis) {
      setHypFlow({ stage:"choosing", intent, candidates:null, prefillText:extractedHypothesis, chosenText:null,
        flaggedQuestion, flaggedAnswer, reviewReason, stressTest:null, priorStressTest:null });
      return;
    }
    setHypFlow({ stage:"generating", intent, candidates:null, prefillText:null, chosenText:null,
      flaggedQuestion, flaggedAnswer, reviewReason, stressTest:null, priorStressTest:null });
    try {
      const candidates = await generateHypotheses({ flaggedQuestion, flaggedAnswer, reviewReason });
      setHypFlow(prev => prev && ({ ...prev, stage:"choosing", candidates }));
    } catch (e) {
      console.error("[MarketIntelligenceScreen] generateHypotheses", e.message);
      setHypFlow(null);
    }
  };

  const submit = async (text) => {
    const clean = (text || "").trim();
    if (!clean || loading) return;
    setMessages(prev => [...prev, { role:"user", text: clean }]);
    setLoading(true);
    setAIStatus("Marcus is thinking…");
    try {
      const result = await runIntentPipeline(clean, conversationContext(), logEvent);
      if (result.kind === "qa") {
        setMessages(prev => [...prev, { role:"assistant", text: result.answer, needs_review: !!result.needs_review, review_reason: result.review_reason, question: clean, kind:"qa" }]);
      } else if (result.kind === "qa_failed") {
        setMessages(prev => [...prev, { role:"assistant", text: result.text, kind:"non_qa" }]);
      } else if (result.kind === "hyp_entry") {
        setMessages(prev => [...prev, { role:"assistant", text: `Got it — treating that as a ${INTENT_LABEL[result.intent] || result.intent}. Pick or refine a hypothesis on the right.`, kind:"non_qa" }]);
        await enterHypothesisFlow({ intent: result.intent, extractedHypothesis: result.extractedHypothesis, flaggedQuestion: result.flaggedQuestion, flaggedAnswer: null, reviewReason: null });
      } else {
        setMessages(prev => [...prev, { role:"assistant", text: result.text, kind:"non_qa" }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role:"assistant", text: "Something went wrong reaching Marcus — try again.", kind:"error" }]);
      console.error("[MarketIntelligenceScreen]", e.message);
    } finally {
      setLoading(false);
      clearAIStatus();
    }
  };

  const onReview = (msg) => {
    enterHypothesisFlow({ intent:"theory", extractedHypothesis:null, flaggedQuestion: msg.question, flaggedAnswer: msg.text, reviewReason: msg.review_reason });
  };

  const onIntentChange = (intent) => setHypFlow(prev => prev && ({ ...prev, intent }));

  const onSelectHypothesis = async (text) => {
    if (!hypFlow) return;
    const { intent, flaggedQuestion, flaggedAnswer, stressTest } = hypFlow;
    setHypFlow(prev => ({ ...prev, stage:"testing", chosenText: text }));
    setMessages(prev => [...prev, { role:"assistant", kind:"hyp_submitted", text, intent }]);
    setAIStatus("Priya is stress-testing…");
    try {
      const st = await runStressTest({ hypothesis: text, intent, flaggedQuestion, flaggedAnswer, priorStressTest: stressTest || null });
      logEvent({ type: "stress_test", agentId: "priya", data: st });
      setMessages(prev => [...prev, { role:"assistant", kind:"stress_test", stressTest: st }]);
      setHypFlow(prev => prev && ({ ...prev, stage:"result", chosenText: text, stressTest: st, priorStressTest: prev.stressTest || null }));
    } catch (e) {
      console.error("[MarketIntelligenceScreen] runStressTest", e.message);
      setHypFlow(prev => prev && ({ ...prev, stage:"choosing" }));
    } finally {
      clearAIStatus();
    }
  };

  const onDiscard = () => {
    setMessages(prev => [...prev, { role:"assistant", kind:"hyp_discard", text: "Theory discarded — not written to the Data Room." }]);
    setHypFlow(null);
  };

  return (
    <AppShell>
      <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",minHeight:0,background:T.paperDeep,padding:"20px 28px 28px"}}>
        <FeatureBadge id="MI-01"/>
        <div style={{marginBottom:18}}>
          <div style={{fontFamily:display,fontSize:24,fontWeight:700,color:T.navy}}>Market Intelligence</div>
          <div style={{fontFamily:body,fontSize:13,color:T.muted,marginTop:2}}>Channel performance, agent-orchestrated — GEO CSO Expert and team</div>
        </div>
        <div style={{position:"relative",display:"grid",gridTemplateColumns:"1.15fr 1fr 0.9fr",gap:18,flex:1,minHeight:0,alignItems:"start"}}>
          <FeatureBadge id="MI-02"/>
          <InteractColumn messages={messages} loading={loading} onSubmit={submit} onReview={onReview}/>
          <EvidenceColumn hypFlow={hypFlow} onIntentChange={onIntentChange} onSelectHypothesis={onSelectHypothesis} onDiscard={onDiscard}/>
          <AuditColumn events={pipelineEvents}/>
        </div>
      </div>
    </AppShell>
  );
}
