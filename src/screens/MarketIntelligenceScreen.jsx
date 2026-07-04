// DeepBench v6.0.18 | MarketIntelligenceScreen.jsx | S-MARKET-INTEL-01a — 3-column scaffold, live Column 1 chat
// FEATURE: MI-01 — Market Intelligence screen, three-column layout per market-intelligence-v4.html
// FEATURE: MI-02 — deterministic human-decision layer (Q/A path only this session; Theory/Forecast/
// Correct/Escalate's hypothesis-pick/commit controls ship in S-MARKET-INTEL-01b)
import { useState, useRef } from "react";
import { T, display, body, mono } from "../tokens.js";
import { TENANT_ID } from "../config.js";
import { AppShell } from "../AppShell.jsx";
import { Card, Corners, AiBadge, FeatureBadge, AgentAvatar } from "../components/SharedUI.jsx";
import { useAgents } from "../hooks/useAgents.js";
import { setAIStatus, clearAIStatus } from "../hooks/useAIStatus.js";
import { AI_PAT } from "../aiPatterns.js";

// FEATURE: MI-01 §10b — on-load example questions, fire the real pipeline (not canned text)
const EXAMPLE_QUESTIONS = [
  { id: "clean",  label: "Japan is Apple's fastest-growing GEO in 2025 — what is driving that?" },
  { id: "review", label: "Why is our EMEA retail partner's co-op budget utilization so low this quarter?" },
  { id: "fail",   label: "How is our authorized reseller network performing in Vietnam?" },
];

const NON_QA_PLACEHOLDER = (intent) =>
  `That reads as a "${intent}" request. Running a Theory, tracking a Forecast, asserting a Correction, or Escalating for deeper research ships in the next build (S-MARKET-INTEL-01b) — ask a direct question for now.`;

async function callCapability({ intent_slug, message, conversationContext }) {
  const res = await fetch("/api/capabilities/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      capability_slug: "channel-intelligence",
      intent_slug,
      agent_id: "marcus",
      task_context: { goal: message },
      runtime_context: conversationContext,
      tenant_id: TENANT_ID,
    }),
  });
  if (!res.ok) throw new Error(`channel-intelligence ${intent_slug} failed: ${res.status}`);
  const result = await res.json();
  // FEATURE: MI-01 — /api/capabilities/execute's sendRequest() returns the model's structured
  // output under `content` (deliverable_id/handler/debug live alongside it at the top level,
  // per api/prompt/request-receivable.js Step 5) — never spread directly. First UI caller of
  // this pipeline; unwrapped once here so runIntentPipeline below can read routing.intent /
  // qa.answer directly, matching the already-proven ci-routing-intent/ci-answer-intent schemas.
  return result.content || {};
}

// FEATURE: MI-02 — intent confirmation is implicit for Q/A (non-destructive, per design doc §2:
// "non-destructive actions can proceed straight from agent classification"). Theory/Forecast/
// Correct/Escalate all write or propose consequential state and get their own explicit human
// controls in S-MARKET-INTEL-01b — never silently answered as if they were Q/A.
async function runIntentPipeline(message, conversationContext) {
  const routing = await callCapability({ intent_slug: "ci-routing-intent", message, conversationContext });
  if (routing.intent !== "qa") {
    return { kind: "non_qa", intent: routing.intent, text: NON_QA_PLACEHOLDER(routing.intent) };
  }
  const qa = await callCapability({ intent_slug: "ci-answer-intent", message, conversationContext });
  return { kind: "qa", ...qa };
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
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
        <div style={{fontFamily:mono,fontSize:9.5,color:T.brassDeep,marginTop:4,letterSpacing:0.3}}>
          ⚑ NEEDS REVIEW — {msg.review_reason || "flagged for review"}
        </div>
      )}
      {!isUser && !msg.needs_review && msg.kind === "qa" && (
        <div style={{marginTop:4}}><AiBadge label={AI_PAT.AGENT_ROUTING}/></div>
      )}
    </div>
  );
}

// FEATURE: MI-03 — structural placeholder only this session. Live Data Room charts +
// Theory Evidence swap-on-hypothesis-select ship in S-MARKET-INTEL-03 / 01b.
function EvidenceColumn() {
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
          Data Room evidence charts and Theory Evidence view ship in S-MARKET-INTEL-01b / 03.
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

// FEATURE: MI-04 — structural placeholder only this session. Real event log (Intent Routing,
// Proofreader, Stress Test, Intake Assistant, Reasoner) ships in S-MARKET-INTEL-01b / 02.
function AuditColumn() {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.muted}}>Audit</div>
      <div style={{background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:16}}>
        <div style={{fontFamily:body,fontSize:12,color:T.muted}}>
          Pipeline Log, About Market Intelligence, and Demo Reset controls ship in S-MARKET-INTEL-01b / 03.
        </div>
      </div>
    </div>
  );
}

function InteractColumn() {
  const agents = useAgents();
  const marcus = agents.find(a => a.id === "marcus");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const conversationContext = () =>
    messages.map(m => `${m.role}: ${m.text}`).join("\n");

  const submit = async (text) => {
    const clean = (text || "").trim();
    if (!clean || loading || !marcus) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: clean }]);
    setLoading(true);
    setAIStatus("Marcus is thinking…");
    try {
      const result = await runIntentPipeline(clean, conversationContext());
      const assistantMsg = result.kind === "qa"
        ? { role: "assistant", text: result.answer, needs_review: !!result.needs_review, review_reason: result.review_reason, kind: "qa" }
        : { role: "assistant", text: result.text, kind: "non_qa" };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: "Something went wrong reaching Marcus — try again.", kind: "error" }]);
      console.error("[MarketIntelligenceScreen]", e.message);
    } finally {
      setLoading(false);
      clearAIStatus();
    }
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
            messages.map((m, i) => <MessageBubble key={i} msg={m}/>)
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
          <InteractColumn/>
          <EvidenceColumn/>
          <AuditColumn/>
        </div>
      </div>
    </AppShell>
  );
}
