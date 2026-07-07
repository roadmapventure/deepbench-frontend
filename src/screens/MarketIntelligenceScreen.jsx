// DeepBench v6.1.11 | MarketIntelligenceScreen.jsx | S-MI-27/MI-27+MI-28 — Submitted Hypothesis card gets a "Submitted by You" attribution row (UserAvatar); AI - Hypothesis Test header swapped to actor-first order (Priya Nair · AI - Hypothesis Test), matching the Q&A card's existing order
// DeepBench v6.1.10 | MarketIntelligenceScreen.jsx | S-MI-26/MI-26 — Data Sources drawer: section headers (Sourced/Simulation/category) bumped to 12.5px matching row title size, DataSourceRow title dropped to fontWeight:400
// DeepBench v6.1.9 | MarketIntelligenceScreen.jsx | S-MI-25/MI-25 — Data Sources drawer: section headers (Sourced/Simulation/category) swapped to T.ink, DataSourceRow title swapped to T.muted
// DeepBench v6.1.6 | MarketIntelligenceScreen.jsx | S-MI-24/MI-24 — Column 3 drawer rename (Pipeline Log -> Agent Routing, Learned Context -> Agent Reasoning)
// DeepBench v6.1.5 | MarketIntelligenceScreen.jsx | S-MI-23 — chat-embedded AgentWorkingIndicator replaces header dot + Theory Evidence duplicate lines
// v6.1.5 — S-MI-23 workingStatus wiring, all 6 turns
// DeepBench v6.1.3 | MarketIntelligenceScreen.jsx | S-MI-21/MI-21 — Pipeline Log converted to a Drawer, default open
// DeepBench v6.1.4 | MarketIntelligenceScreen.jsx | S-MI-22 — Data Sources drawer regrouped into
// Sourced/Simulation (sub-grouped by category)/Analysis sections; Analysis moved to its own Drawer
// DeepBench v6.0.47 | MarketIntelligenceScreen.jsx | S-MI-15 — Data Sources drawer + describeDataType() display-label taxonomy
// DeepBench v6.0.46 | MarketIntelligenceScreen.jsx | S-MI-20 — latency broken out by kind, blended stat removed
// DeepBench v6.0.44 | MarketIntelligenceScreen.jsx | S-MI-18c — Agents drawer sorted descending by calls
// DeepBench v6.0.43 | MarketIntelligenceScreen.jsx | S-MI-18b — full loop roster + page-scoped metrics
// DeepBench v6.0.40 | MarketIntelligenceScreen.jsx | MI-18 — Agent Activity drawer, Column 3 (closes MI-06)
// DeepBench v6.0.36 | MarketIntelligenceScreen.jsx | MI-17 — Learned Context drawer, Column 3
// DeepBench v6.0.25 | MarketIntelligenceScreen.jsx | S-MI-14 — full terminology rename sweep
// (AI - Hypothesis Test branding, generalized human-operator term); no mechanism/behavior change.
// DeepBench v6.0.24 | MarketIntelligenceScreen.jsx | S-MI-13 — EvidenceColumn consumes the
// generic ChartRenderer (ARCHITECTURE.md §19g) via st.visualization, replaces the retired
// st.projected_state plain-text block
// FEATURE: MI-01 — Market Intelligence screen, three-column layout per market-intelligence-v4.html
// FEATURE: MI-02 — deterministic human-decision layer: hypothesis pick/write + Discard + commit
// actions (Track as Assumption / Make Permanent) are explicit human controls, all live as of 01d
// FEATURE: MI-03 — Theory Evidence swap-on-hypothesis-select (live); Data Room default charts still roadmap
// FEATURE: AI-39 — two-layer needs_review OR-gate (Marcus self-flag OR Owen/Proofreader eval.result
// ==='revise'), plus real retry-once-on-block via Owen's own delegate_to_agent call (01d correction —
// see runQaWithQualityGate below; the 01c screen-scripted retry was an architecture regression)
// FEATURE: MI-04 — Pipeline Log, real events only (Intent Routing, Q&A Answer, Proofreader incl. real
// retry hand-off, AI - Hypothesis Test, Memory Consolidation, Data Integrity Patch, Failure Triage, and now
// (S-ARCH-DISPLAY-LOOP-01) Agent Selection + Display Format for Marcus's real Display-agent hand-off)
// FEATURE: MI-13 — Theory Evidence renders via the generic visualization mechanism, not a hardcoded chart
import { useState, useRef, useEffect } from "react";
import { T, display, body, mono } from "../tokens.js";
import { TENANT_ID } from "../config.js";
import { AppShell } from "../AppShell.jsx";
import { Card, Corners, AiBadge, FeatureBadge, AgentAvatar, UserAvatar, ConfirmationCard, ChartRenderer, Drawer } from "../components/SharedUI.jsx";
import { useAgents, useLearnedContext, useAgentActivitySummary, useDataSources } from "../hooks/useAgents.js";
import AIDiamond from "../components/AIDiamond.jsx";
import { AI_PAT } from "../aiPatterns.js";

const EXAMPLE_QUESTIONS = [
  { id: "clean",  label: "Japan is Apple's fastest-growing GEO in 2025 — what is driving that?" },
  { id: "review", label: "Why is our EMEA retail partner's co-op budget utilization so low this quarter?" },
  { id: "fail",   label: "How is our authorized reseller network performing in Vietnam?" },
];

const ESCALATE_PLACEHOLDER =
  `That reads as an "escalate" request. Escalating for deeper research ships in a future build — ask a direct question, or run a Theory/Forecast/Correct for now.`;

const INTENT_LABEL = { theory: "Theory", forecast: "Forecast", correct: "Correct" };

// FEATURE: AA-130 — Sam's intake-failure-intent schema (traits.schema, confirmed live in Supabase)
// only ever outputs recommend_escalate/suggested_research_request, per the original spec
// (APPLE-AGENT-1-v5-DESIGN.md §5.9) — he was never designed to produce an explanatory string, and
// the prior hardcoded phrase (falsely attributed to Sam, wrongly implying a Data Room gap in the
// live case that surfaced this, AA-130) was fabricated at the frontend layer, not real agent output.
// Owen's guardrail object already carries a real, specific `reason` explaining the actual failure —
// this now surfaces that, correctly attributed to Owen, instead of inventing something on Sam's behalf.
function buildFailureText(guardrail, triage) {
  const base = `Marcus couldn't produce an answer that passed review (${guardrail?.rule_violated || "review failed"}).`;
  const reason = guardrail?.reason ? ` ${guardrail.reason}` : "";
  if (!triage) return `${base}${reason} Try rephrasing the question.`;
  const suggestion = triage.suggested_research_request ? ` Suggested next step: "${triage.suggested_research_request}"` : "";
  return triage.recommend_escalate
    ? `${base}${reason}${suggestion}`
    : `${base}${reason} Try rephrasing the question.`;
}

// FEATURE: MI-04 — capability display metadata, sourced from the same SERVICE_CATALOG entries
// already live in useAIActivity.js (not duplicated data — just the slugs this screen calls)
const SERVICE_LABEL = {
  "channel-intelligence": { name: "Channel Intelligence", patterns: "Structured Output, RAG, Case-Based Reasoning" },
  "quality-gate": { name: "Quality Gate", patterns: "Structured Output, Guardrails / Output Filtering, LLM-as-Judge / Verifier, Agent Delegation" },
  "hypothesis-evaluation": { name: "Hypothesis Evaluation", patterns: "Structured Output, RAG, Case-Based Reasoning" },
  "memory-consolidation": { name: "Memory Consolidation", patterns: "Structured Output, Memory Consolidation, Transfer Learning" },
  "data-analysis": { name: "Data Analysis", patterns: "Structured Output, Agent Delegation" },
  "pipeline-triage": { name: "Pipeline Triage", patterns: "Structured Output, Agent Delegation" },
};

// FEATURE: AA-125 — shared free-text shaping so every event type that embeds a raw
// model-authored string (reasoning/critique/notes) gets the same "short, readable log
// line" treatment instead of each switch case deciding independently. Prefers the
// first full sentence (reads as real reasoning, not a mid-word chop); falls back to a
// hard character cap only when no sentence boundary exists within range.
function shapeForLog(text, maxLen = 140) {
  const s = (text || "").trim();
  if (!s) return "";
  const firstSentence = s.match(/^[^.!?]*[.!?]/);
  // Guard: a genuine sentence boundary in the free-text agent output this shapes (reasoning,
  // critiques, opinions) is rarely under ~20 chars -- a shorter match is almost always a decimal
  // point or abbreviation (e.g. "14.57%", "U.S.", "e.g.") false-triggering the regex, not a real
  // sentence end. Fall through to hard truncation instead of returning a nonsense short fragment.
  if (firstSentence && firstSentence[0].trim().length >= 20 && firstSentence[0].trim().length <= maxLen) {
    return firstSentence[0].trim();
  }
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen).trim()}…`;
}

// FEATURE: MI-19 — render a per-step Pipeline Log duration the same way everywhere.
function formatDuration(ms) {
  if (ms == null) return "";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

// FEATURE: MI-23 — live m:ss elapsed timer for the chat-embedded working-status indicator
function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// FEATURE: MI-23 — replaces the header's global AI status dot for this screen; one line, swaps
// message + resets its timer each time control passes to a new agent (only one agent ever runs
// at a time on this platform today, confirmed no concurrent dispatch anywhere in this file or the
// execute.js harness loop — see kickoff CONTEXT). Keyed by startedAt at the call site (not here)
// so React fully remounts this component on every new turn instead of trying to reset internal
// tick state — the simplest correct way to guarantee the timer starts at 0:00 every time.
function AgentWorkingIndicator({ message, startedAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <AIDiamond size="7px" color={T.brass}/>
      <span style={{fontFamily:mono,fontSize:11,color:T.muted,fontStyle:"italic"}}>{message}</span>
      <span style={{fontFamily:mono,fontSize:10,color:T.brassDeep}}>{formatElapsed(now - startedAt)}</span>
    </div>
  );
}

// FEATURE: MI-15 — shared display-label mapping for the raw data_type (the_library rows) /
// confidence_tier (Q&A answers) vocabulary. Display-layer relabel only — the stored enum strings
// (sourced/inferred/synthesized/learned/na) are unchanged everywhere else (DB, all 7 live Skill
// Profile schemas). Locked mapping: STYLE-GUIDE.md Section 19 — do not re-litigate without
// re-reading it. whoTag only ever applies to the "Analysis" label, sourced from the_library.source
// (user->"Human", agent->"AI"); a confidence_tier context has no source column, so it's implicitly
// AI but still renders no who-tag (per the locked table, only the_library rows carry a source col).
function describeDataType(dataType, { isBaseline, source } = {}) {
  const whoTag = source === 'user' ? "Human" : source === 'agent' ? "AI" : null;

  switch (dataType) {
    case 'sourced':
      return { label: "Sourced", color: T.moss, whoTag: null };
    case 'inferred':
      return { label: "Analysis", color: T.brass, whoTag };
    case 'synthesized':
      return isBaseline
        ? { label: "Source Simulation", color: T.mutedDeep, whoTag: null }
        : { label: "Analysis", color: T.brass, whoTag };
    case 'learned':
      return { label: "Learned", color: T.navyMid, whoTag: null };
    default:
      return { label: "—", color: T.muted, whoTag: null };
  }
}

// FEATURE: MI-22 — category→label lookup for the Simulation sub-grouping. Genuinely new/minimal;
// reuses the existing category-badge text style (mono, uppercase, T.muted) already used for
// row.category below rather than inventing a new visual. Not a duplicate of describeDataType()'s
// data_type→label mapping — this maps the_library.category, a different column entirely.
const SIMULATION_CATEGORY_LABELS = { geo_briefing: "GEO", partner_scenario: "Partner" };

// FEATURE: MI-22 — pure grouping helper for the Data Sources / Analysis drawers. Buckets the raw
// dataSources rows into Sourced (pinned top) / Simulation (sub-grouped by category, first-seen
// key order, no pre-seeded categories) / Analysis. Calls describeDataType() exactly once per row
// (Category M — single source of truth for the data_type→label mapping) and carries the result
// forward on each row as `_display`, so no render path below ever needs to re-derive it. Rows
// keep the hook's existing arrival order within each bucket (already title-sorted).
function groupDataSources(rows) {
  const sourced = [];
  const simulationByCategory = {};
  const analysis = [];
  for (const row of rows) {
    const display = describeDataType(row.data_type, { isBaseline: row.is_baseline, source: row.source });
    const decorated = { ...row, _display: display };
    if (display.label === "Sourced") {
      sourced.push(decorated);
    } else if (display.label === "Source Simulation") {
      const key = row.category;
      if (!simulationByCategory[key]) simulationByCategory[key] = [];
      simulationByCategory[key].push(decorated);
    } else if (display.label === "Analysis") {
      analysis.push(decorated);
    }
  }
  return { sourced, simulationByCategory, analysis };
}

// FEATURE: MI-04 — real event summaries, driven entirely by actual call responses (evt.data),
// never scripted text. Color: T.moss = pass/clean, T.brass = flagged/revise, T.flag = blocked.
function describePipelineEvent(evt) {
  switch (evt.type) {
    case "intent_routing":
      return { capability: "channel-intelligence", summary: `Classified intent: ${evt.data.intent} (confidence: ${evt.data.confidence})`, color: T.navyMid };
    case "qa_answer":
      // FEATURE: MI-15 — confidence_tier routed through describeDataType() instead of the raw enum string
      return { capability: "channel-intelligence", summary: `Answered · confidence_tier: ${describeDataType(evt.data.confidence_tier).label} · self-flag: ${evt.data.needs_review ? "yes" : "no"}`, color: evt.data.needs_review ? T.brass : T.moss };
    case "proofreader": {
      const g = evt.data.guardrail || {}, e = evt.data.eval || {};
      if (g.result === "block") {
        return { capability: "quality-gate", summary: `Guardrail: block — ${g.rule_violated} — escalated to Sam`, color: T.flag };
      }
      const retriedNote = evt.data.final_answer ? " (Owen retried via Marcus)" : "";
      return { capability: "quality-gate", summary: `Guardrail: pass${retriedNote} · Eval: ${e.result}${e.result === "revise" ? ` — ${shapeForLog(e.critique)}` : ""}`, color: e.result === "revise" ? T.brass : T.moss };
    }
    case "failure_triage":
      return { capability: "pipeline-triage", summary: evt.data.recommend_escalate ? `Recommends escalating: ${shapeForLog(evt.data.suggested_research_request)}` : "Escalating would not help here", color: T.brass };
    case "hypothesis_test":
      return { capability: "hypothesis-evaluation", summary: `Hypothesis test complete · confidence: ${evt.data.confidence}`, color: T.moss };
    case "memory_consolidation":
      return { capability: "memory-consolidation", summary: evt.data.action === "consolidate" ? `Consolidated: ${shapeForLog(evt.data.content)}` : "No pattern worth consolidating (no_action)", color: evt.data.action === "consolidate" ? T.moss : T.muted };
    case "patch_proposed":
      return { capability: "data-analysis", summary: `Proposed: ${evt.data.proposed_action?.action || "?"}${evt.data.proposed_action?.version_note ? ` — ${shapeForLog(evt.data.proposed_action.version_note)}` : ""}`, color: T.brass };
    case "patch_resolved":
      return { capability: "data-analysis", summary: evt.data.resolution === "accept" ? `Accepted: ${shapeForLog(evt.data.result?.content?.confirmation_note) || "recorded"}` : `${evt.data.resolution === "reject" ? "Rejected" : "Edited"} by user`, color: evt.data.resolution === "accept" ? T.moss : T.muted };
    // FEATURE: S-ARCH-DISPLAY-LOOP-01 — the two connected hand-off entries proving the real
    // request_help -> Michelle -> delegate_to_agent(is_final:true) round trip: Marcus asking for
    // help (Michelle's own reasoning field, never a placeholder), then Michelle's pick handing off
    // to the chosen Display agent.
    case "agent_selection":
      return { capability: "channel-intelligence", summary: shapeForLog(evt.data.reasoning), color: T.moss };
    case "display_format":
      // FEATURE: MI-15 — confidence_tier routed through describeDataType() instead of the raw enum string
      return { capability: "channel-intelligence", summary: `Formatted for on-screen display · confidence_tier: ${describeDataType(evt.data.confidence_tier).label}`, color: T.moss };
    // FEATURE: MI-23 — Priya's hyp-generation-intent turn, previously unlogged anywhere on this screen.
    case "hypothesis_generation":
      return { capability: "hypothesis-evaluation", summary: `Generated ${evt.data.candidates?.length ?? 0} hypothesis candidate${evt.data.candidates?.length === 1 ? "" : "s"}`, color: T.moss };
    default:
      return { capability: null, summary: "", color: T.muted };
  }
}

// FEATURE: MI-02 — generalized to accept any capability/agent/task_context (was hardcoded to
// channel-intelligence/marcus/{goal:message}) — same contract execute.js already exposes, now
// used by Marcus's channel-intelligence calls, Priya's hypothesis-evaluation calls, Owen's
// quality-gate calls, and (MI-01d) Elena's memory-consolidation / Nadia's data-analysis calls.
// FEATURE: MI-01d — a capability whose Skill Profile sets requires_human_confirmation: true
// (Nadia's data-patch-intent) short-circuits execute.js's normal terminal dispatch and returns
// a flat { status:'pending_confirmation', confirmation_id, proposed_action, critique, ... } object
// with no `.content` wrapper (api/capabilities/execute.js runCapability(), the pending_confirmation
// branch) — found live this session, first UI caller of that branch anywhere. Unwrapping `.content`
// unconditionally (the pre-01d behavior) would silently discard confirmation_id/proposed_action/
// critique and hand the screen an empty object. Any response carrying a top-level `status` field
// is one of execute.js's own flat early-return shapes (pending_confirmation, depth_exceeded) and
// is returned as-is; only the ordinary terminal-dispatch shape is unwrapped from `.content`.
const MAX_CONTINUE_ITERATIONS = 10; // client-side safety cap -- generous headroom over a real
// chain's expected hop count (harness's own MAX_LOOP_DEPTH is 5), guards against an unbounded
// client loop if something's genuinely wrong server-side rather than duplicating that ceiling.

// FEATURE: AA-139 (S-ARCH-DURABLE-LOOP-02b) -- a chain that risked the shared 60s Vercel ceiling
// checkpoints server-side (S-ARCH-DURABLE-LOOP-02a) instead of dying silently, returning
// {status:'in_progress', job_id} instead of a terminal result. This continues it until a terminal
// status, so every existing caller keeps its current contract unchanged -- none of them ever need
// to know a checkpoint happened. Shared by callCapability() and resolveConfirmation() -- one
// implementation, not two copies of the same loop.
async function resolveInProgress(result) {
  let iterations = 0;
  while (result.status === "in_progress") {
    if (++iterations > MAX_CONTINUE_ITERATIONS) {
      throw new Error(`Chain did not complete after ${MAX_CONTINUE_ITERATIONS} continuations (job_id: ${result.job_id})`);
    }
    const res = await fetch("/api/capabilities/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "continue", job_id: result.job_id }),
    });
    if (!res.ok) throw new Error(`continue (job_id: ${result.job_id}) failed: ${res.status}`);
    result = await res.json();
  }
  return result;
}

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
  const result = await resolveInProgress(await res.json());
  if (result.status) return result;
  return result.content || {};
}

// FEATURE: MI-01d — resolve a pending_confirmation (accept/reject/edit). Generic across any
// capability — the confirmation_id already encodes which capability/agent/intent it belongs to.
async function resolveConfirmation({ confirmation_id, resolution, edited_task_context = null }) {
  const res = await fetch("/api/capabilities/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "resolve", confirmation_id, resolution, edited_task_context }),
  });
  if (!res.ok) throw new Error(`resolve ${resolution} failed: ${res.status}`);
  return resolveInProgress(await res.json());
}

// FEATURE: MI-01d — Owen's own delegate_to_agent call replaces the screen-scripted retry
// (AI-39, S-MARKET-INTEL-01c) that bypassed the mechanism AA-82/S-ARCH-AGENT-LOOP-03 specifically
// built for this exact live-caller case. Orchestrator-workers pattern (Anthropic, "Building
// Effective Agents"): Owen decides whether a block is worth one retry and calls Marcus himself;
// his own final output (final_answer) carries the delegated result forward, since nothing outside
// his own tool-call loop is visible to this caller otherwise -- same shape Nadia's
// data-patch-execute-intent already uses for her promote action's Eleanor delegation (S-APPLE-04b).
async function runQaWithQualityGate(message, conversationContext, onEvent) {
  let t0 = Date.now();
  const qa = await callCapability({
    capability_slug: "channel-intelligence", intent_slug: "ci-answer-intent", agent_id: "marcus",
    task_context: { goal: message }, runtime_context: conversationContext,
  });
  onEvent({ type: "qa_answer", agentId: "marcus", data: qa, durationMs: Date.now() - t0 });

  t0 = Date.now();
  const gate = await callCapability({
    capability_slug: "quality-gate", intent_slug: "qg-review-intent", agent_id: "owen",
    task_context: {
      question: message, candidate_answer: qa.answer, confidence_tier: qa.confidence_tier, citations: qa.citations,
      agent_id: "marcus", capability_slug: "channel-intelligence", intent_slug: "ci-answer-intent",
    },
  });
  const retried = !!gate.final_answer;
  onEvent({ type: "proofreader", agentId: "owen", secondaryAgentId: retried ? "marcus" : null, data: gate, durationMs: Date.now() - t0 });

  if (gate.guardrail?.result === "block") {
    const t0 = Date.now();
    const triage = await callCapability({
      capability_slug: "pipeline-triage", intent_slug: "intake-failure-intent", agent_id: "sam",
      task_context: { guardrail_failure: gate.guardrail, original_question: message },
    });
    onEvent({ type: "failure_triage", agentId: "sam", data: triage, durationMs: Date.now() - t0 });
    return { kind: "qa_failed", text: buildFailureText(gate.guardrail, triage) };
  }

  const finalAnswer = retried ? gate.final_answer : qa;
  const needs_review = !!qa.needs_review || gate.eval?.result === "revise";
  const review_reason = qa.needs_review ? qa.review_reason : (gate.eval?.result === "revise" ? gate.eval.critique : null);

  // FEATURE: S-ARCH-DISPLAY-LOOP-01 — real Display-agent hand-off (AA-101/AA-114/AA-115), proven
  // here via Marcus's Q&A path: request_help -> Michelle (agent-selection-intent) ->
  // delegate_to_agent(is_final:true) -> whichever Display agent she ranked highest. Runs after the
  // Proofreader gate/retry sequence resolves, on finalAnswer (whichever of qa/gate.final_answer
  // won) — Owen's own evaluation semantics above are completely unchanged by this step.
  t0 = Date.now();
  const display = await callCapability({
    capability_slug: "channel-intelligence", intent_slug: "ci-answer-display-intent", agent_id: "marcus",
    task_context: { answer: finalAnswer.answer, citations: finalAnswer.citations, confidence_tier: finalAnswer.confidence_tier, needs_review, review_reason },
  });
  if (display.selection) {
    onEvent({ type: "agent_selection", agentId: "marcus", secondaryAgentId: display.selection.selected_by_agent_id, data: display.selection, durationMs: Date.now() - t0 });
  }
  onEvent({ type: "display_format", agentId: display.selection?.selected_by_agent_id || "marcus", secondaryAgentId: display.display_agent_id, data: display, durationMs: Date.now() - t0 });

  // FEATURE: AA-137 — callCapability() returns a raw string when the display/format hand-off
  // declines its tool call and responds with plain text instead (e.g. it recognizes a real problem
  // with the answer it was asked to format). Every field below would read undefined off a string,
  // rendering an empty card and silently discarding the model's own message. Falls back to showing
  // that text directly. Also closes AA-135 (display_format's confidence_tier: undefined in the
  // Pipeline Log was this same string-not-object case).
  if (typeof display === "string") {
    return {
      kind: "qa",
      headline: null, body: [{ text: display }], key_data_points: null,
      citations: finalAnswer.citations, confidence_tier: finalAnswer.confidence_tier,
      needs_review: true, review_reason: "Display agent declined to format — see message.",
      displayAgentCard: null, displayAgentId: null,
    };
  }
  return {
    kind: "qa",
    headline: display.headline, body: display.body, key_data_points: display.key_data_points,
    citations: display.citations, confidence_tier: display.confidence_tier,
    needs_review: display.needs_review, review_reason: display.review_reason,
    displayAgentCard: display.display_agent_card, displayAgentId: display.display_agent_id,
  };
}

async function runIntentPipeline(message, conversationContext, onEvent) {
  const t0 = Date.now();
  const routing = await callCapability({
    capability_slug: "channel-intelligence", intent_slug: "ci-routing-intent", agent_id: "marcus",
    task_context: { goal: message }, runtime_context: conversationContext,
  });
  onEvent({ type: "intent_routing", agentId: "marcus", data: routing, durationMs: Date.now() - t0 });
  if (routing.intent === "escalate") {
    return { kind: "non_qa", text: ESCALATE_PLACEHOLDER };
  }
  if (routing.intent !== "qa") {
    return { kind: "hyp_entry", intent: routing.intent, extractedHypothesis: routing.extracted_hypothesis, flaggedQuestion: message };
  }
  return runQaWithQualityGate(message, conversationContext, onEvent);
}

// FEATURE: MI-02/MI-03 — Generate Hypotheses (Priya/hypothesis-evaluation). Skips straight to
// the picker, pre-filled, when the user already wrote their own claim.
async function generateHypotheses({ flaggedQuestion, flaggedAnswer, reviewReason }) {
  const gen = await callCapability({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-generation-intent", agent_id: "priya",
    task_context: {
      flagged_question: flaggedQuestion,
      flagged_answer: flaggedAnswer || "",
      review_reason: reviewReason || "user-initiated, no explicit claim extracted",
    },
  });
  return gen.hypotheses || [];
}

// FEATURE: S-ARCH-DISPLAY-LOOP-02 (AA-116) — real Display-agent hand-off for AI - Hypothesis
// Test, mirroring runQaWithQualityGate's real two-call chain (S-ARCH-DISPLAY-LOOP-01/AA-115):
// Priya's own hyp-hypothesis-test-intent call (her genuine analytical schema, separate from
// Alex's presentational one) followed by a real request_help -> Michelle (agent-selection-intent)
// -> delegate_to_agent(is_final:true) hand-off via hyp-hypothesis-test-display-intent. Alex is one
// candidate Michelle reasons over, not a guaranteed/hardcoded target — the old bundled
// format_skill_profile_slug/display_agent_id override (AA-77 format-last pattern) is gone entirely.
async function runHypothesisTest({ hypothesis, intent, flaggedQuestion, flaggedAnswer, priorHypothesisTest, onEvent }) {
  const analysis = await callCapability({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-hypothesis-test-intent", agent_id: "priya",
    task_context: {
      hypothesis, intent,
      flagged_question: flaggedQuestion || "", flagged_answer: flaggedAnswer || "",
      prior_hypothesis_test: priorHypothesisTest || null,
    },
  });

  const t0 = Date.now();
  const display = await callCapability({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-hypothesis-test-display-intent", agent_id: "priya",
    task_context: { supports: analysis.supports, complicates: analysis.complicates, consider: analysis.consider, confidence: analysis.confidence },
  });
  if (display.selection) {
    onEvent({ type: "agent_selection", agentId: "priya", secondaryAgentId: display.selection.selected_by_agent_id, data: display.selection, durationMs: Date.now() - t0 });
  }
  onEvent({ type: "display_format", agentId: display.selection?.selected_by_agent_id || "priya", secondaryAgentId: display.display_agent_id, data: display, durationMs: Date.now() - t0 });

  // FEATURE: AA-137 — same string-fallback case as runQaWithQualityGate() above, Priya's path.
  // MessageBubble's hypothesis_test case only ever renders st.headline/st.supports/.complicates/
  // .consider — a plain-text decline needs somewhere to land; headline is the only field it
  // unconditionally renders when present (line 330), so that's where the raw text goes.
  return typeof display === "string"
    ? { headline: display, supports: null, complicates: null, consider: null, confidence: null, display_agent_card: null, display_agent_id: null, selection: null }
    : display; // final_delegation shape: {...intelligence-review-format's fields, display_agent_card, display_agent_id, selection}
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
          {/* FEATURE: MI-27 -- attribution row, same shape as the existing "Formatted by [Agent]"
              byline on the qa/hypothesis_test cards below, but with UserAvatar instead of
              AgentAvatar since this is always the human's own submission, never an agent's. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 13px 11px 13px' }}>
            <UserAvatar size={16} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#888', letterSpacing: '0.02em' }}>Submitted by</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#b6873a', letterSpacing: '0.02em' }}>You</span>
          </div>
        </div>
      </div>
    );
  }

  if (msg.kind === "hypothesis_test") {
    const st = msg.hypothesisTest || {};
    const sections = [
      { key: "supports",    label: "✓ Supports",      color: T.moss,      data: st.supports },
      { key: "complicates", label: "⚠ Complicates",   color: T.flag,      data: st.complicates },
      { key: "consider",    label: "→ Consider also",  color: T.mutedDeep, data: st.consider },
    ];
    return (
      <div style={{marginBottom:12,maxWidth:"96%"}}>
        <div style={{background:T.card,border:`1px solid ${T.line}`,borderLeft:`4px solid ${T.navy}`,borderRadius:3}}>
          <div style={{background:T.cardAlt,padding:"7px 12px"}}>
            <span style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:T.navy}}>Priya Nair · AI - Hypothesis Test</span>
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
          {msg.displayAgentCard && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 13px 11px 13px' }}>
              <AgentAvatar who={msg.displayAgentId} size={16} ring={false} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#888', letterSpacing: '0.02em' }}>Formatted by</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#b6873a', letterSpacing: '0.02em' }}>{msg.displayAgentCard.name}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#777' }}>{msg.displayAgentCard.role}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (msg.kind === "hyp_discard") {
    return <div style={{marginBottom:12,fontFamily:body,fontSize:12,fontStyle:"italic",color:T.muted}}>{msg.text}</div>;
  }

  // FEATURE: S-ARCH-DISPLAY-LOOP-01 — Marcus's Q&A answer, formatted by a real Display agent
  // (request_help -> Michelle -> delegate_to_agent(is_final:true)), never {msg.text} raw markdown.
  // Reuses the exact hypothesis_test bubble's card treatment (border/header/spacing) — a consistency
  // requirement, not a new visual pattern (DESIGN RULES). Byline visual treatment matches
  // CreateWorkOrderScreen.jsx's existing "Screen formatted by [Name] [Role]" byline exactly, with
  // AgentAvatar added per Style Guide Section 17 (avatar mandatory, never name-only text).
  if (msg.kind === "qa") {
    return (
      <div style={{marginBottom:12,maxWidth:"96%"}}>
        <div style={{background:T.card,border:`1px solid ${T.line}`,borderLeft:`4px solid ${T.navy}`,borderRadius:3}}>
          <div style={{background:T.cardAlt,padding:"7px 12px"}}>
            <span style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:T.navy}}>Marcus Webb · Channel Intelligence</span>
          </div>
          <div style={{padding:"11px 13px",display:"flex",flexDirection:"column",gap:9}}>
            {msg.headline && <div style={{fontFamily:body,fontSize:13,fontWeight:600,color:T.ink}}>{msg.headline}</div>}
            {(msg.body || []).map((b, i) => (
              <div key={i}>
                {b.heading && <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.mutedDeep,marginBottom:3}}>{b.heading}</div>}
                <p style={{margin:0,fontFamily:body,fontSize:11.5,lineHeight:1.5,color:T.ink}}>{b.text}</p>
              </div>
            ))}
            {Array.isArray(msg.keyDataPoints) && msg.keyDataPoints.length > 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Key Data Points</div>
                {msg.keyDataPoints.map((d, i) => (
                  <div key={i} style={{fontFamily:body,fontSize:11,color:T.ink}}>
                    <b>{d.label}:</b> {d.value} <span style={{color:T.muted,fontFamily:mono,fontSize:9.5}}>· {d.source} · {d.confidence}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {msg.displayAgentCard && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 13px 11px 13px' }}>
              <AgentAvatar who={msg.displayAgentId} size={16} ring={false} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#888', letterSpacing: '0.02em' }}>
                Formatted by
              </span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#b6873a', letterSpacing: '0.02em' }}>
                {msg.displayAgentCard.name}
              </span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#777' }}>
                {msg.displayAgentCard.role}
              </span>
            </div>
          )}
        </div>
        {msg.needs_review && (
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
        {!msg.needs_review && (
          <div style={{marginTop:4}}><AiBadge label={AI_PAT.AGENT_ROUTING}/></div>
        )}
      </div>
    );
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
    </div>
  );
}

function EvidenceColumn({ hypFlow, onIntentChange, onSelectHypothesis, onDiscard, onCommit, onResolveConfirmation }) {
  const [customText, setCustomText] = useState("");
  const agents = useAgents();
  const nadia = agents.find(a => a.id === "nadia");

  useEffect(() => {
    if (hypFlow && hypFlow.prefillText) setCustomText(hypFlow.prefillText);
  }, [hypFlow && hypFlow.prefillText]);

  if (!hypFlow) {
    // FEATURE: MI-15 — legend now routes through describeDataType() instead of 4 hardcoded
    // {label,color} pairs, so it stays in sync with the locked taxonomy (STYLE-GUIDE.md §19).
    // Context-free static legend — no who-tag shown here, it isn't tied to a specific row.
    const layers = [
      describeDataType('sourced'),
      describeDataType('inferred'),
      describeDataType('synthesized', { isBaseline: true }),
      describeDataType('learned'),
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

  const st = hypFlow.hypothesisTest;

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

        {st && hypFlow.stage === "result" && (
          <>
            {st.override_warning && (
              <div style={{padding:"9px 11px",background:"#f3e6cc",border:`1px solid ${T.brass}`,fontFamily:body,fontSize:11,color:T.brassDeep}}>
                ⚑ AI flagged a complicating factor not fully resolved by this hypothesis. Committing will log this as an override.
              </div>
            )}

            {st.visualization && (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Current vs. Projected</div>
                <ChartRenderer type={st.visualization.chart_type} data={st.visualization.chart_data} caption={st.visualization.caption}/>
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

        {hypFlow.stage === "result" && !hypFlow.confirmation && (
          <div style={{display:"flex",gap:6,marginTop:4}}>
            <button onClick={onDiscard}
              style={{flex:1,padding:"8px 6px",background:"transparent",border:`1px solid ${T.line}`,fontFamily:body,fontSize:11,color:T.ink,cursor:"pointer"}}>
              Discard
            </button>
            <button onClick={() => onCommit("forecast")}
              style={{flex:1,padding:"8px 6px",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:11,color:T.ink,cursor:"pointer"}}>
              Track as Assumption
            </button>
            <button onClick={() => onCommit("correct")}
              style={{flex:1,padding:"8px 6px",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:11,color:T.ink,cursor:"pointer"}}>
              Make Permanent
            </button>
          </div>
        )}

        {hypFlow.confirmation && (
          <ConfirmationCard
            agent={nadia}
            proposedAction={hypFlow.confirmation.proposed_action}
            critique={hypFlow.confirmation.critique}
            onResolve={onResolveConfirmation}
          />
        )}
      </div>
    </div>
  );
}

// FEATURE: MI-18 — this screen's own proposed roster for the Agents drawer. Lives here, not on
// agents.js, so the roster stays platform-wide/page-agnostic — closes MI-06's AI-38 dependency,
// no isAppleChannel/section field needed. Any future screen wanting this drawer defines its own
// list the same way, passed to the same reusable useAgentActivitySummary()/Drawer pieces.
// FEATURE: S-MI-18b — expanded from the original 6 front-line agents to the full cast that
// actually touches this page's Agent Loop: Michelle Manning (PP-01, PM broker), Alex Reeves
// (ED-01, Format Skill), Dan Bingham (PS-01, Prompt Service), Eleanor Voss (LB-01, Librarian) —
// confirmed live via ai_activity_log this design session, not hypothetical (Michelle alone: 595
// all-time calls). Still page-local, not stored on agents.js — same platform-wide-roster
// principle as the original MI-18 design.
const PROPOSED_MI_AGENT_IDS = ["marcus", "priya", "nadia", "owen", "sam", "elena", "michelle", "alex", "dan", "eleanor"];

// FEATURE: S-MI-18b — this page's own loop-access scope, passed to useAgentActivitySummary() so
// the drawer's metrics reflect real Market Intelligence activity, not a shared broker/utility
// agent's platform-wide total. Every value below verified live this design session against the
// entire ai_activity_log table (not just these 10 agents) — confirmed zero leakage to any
// non-MI/legacy agent_id. Deliberately excludes the generic bare 'request-receivable' ai_type and
// any ai_type not seen in real, current production data (conservative: undercounts rather than
// risks a false match).
const MI_LOOP_SCOPE = {
  aiTypes: [
    "channel-intelligence", "hypothesis-evaluation", "quality-gate", "pipeline-triage",
    "memory-consolidation", "data-analysis",
    "project-manager", "screen-controls", "agent-directory",
    "librarian", "librarian-write", "data-room-custody",
    "reflect", "synthesis",
    "guardrails-check",
  ],
  featurePrefixes: [
    "channel-intelligence:", "hypothesis-evaluation:", "quality-gate:", "pipeline-triage:",
    "project-manager:agent-selection-intent:",
    "screen-controls:qa-answer-format:", "screen-controls:intelligence-review-format:",
  ],
};

function StatCell({ val, label }) {
  return (
    <div style={{textAlign:"center"}}>
      <div style={{fontFamily:mono,fontSize:11,fontWeight:800,color:T.navy}}>{val}</div>
      <div style={{fontFamily:mono,fontSize:7,color:T.muted,textTransform:"uppercase",letterSpacing:"0.03em"}}>{label}</div>
    </div>
  );
}

// FEATURE: S-MI-20 — generic title-case formatter for a raw kind key (an intent_slug like
// "ci-answer-intent" or a standalone ai_type like "guardrails-check") into a readable label.
// Deliberately not a hardcoded per-intent label map (e.g. "ci-answer-intent" -> "Answer
// generation") — that would need manual upkeep every time a new intent/capability ships across
// any of the 10 agents. This stays generic and maintenance-free; exact wording is less polished
// but always correct and never goes stale.
function formatKindLabel(kind) {
  return kind.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// FEATURE: MI-04/MI-01d — Pipeline Log: real event log driven by actual agent calls (Intent
// Routing, Q&A Answer, Proofreader pass/block/revise incl. real retry hand-off, AI - Hypothesis Test,
// Memory Consolidation, Data Integrity Patch proposal/resolution, Failure Triage).
function AuditColumn({ events }) {
  const agents = useAgents();
  const learned = useLearnedContext();
  const dataSources = useDataSources();
  const agentActivity = useAgentActivitySummary(PROPOSED_MI_AGENT_IDS, MI_LOOP_SCOPE);
  const agentById = (id) => agents.find(a => a.id === id);
  const ordered = [...events].reverse(); // newest event on top, confirmed with John
  const activeIds = PROPOSED_MI_AGENT_IDS
    .filter(id => agentActivity[id]?.calls > 0)
    .sort((a, b) => (agentActivity[b]?.calls || 0) - (agentActivity[a]?.calls || 0));
  const potentialIds = PROPOSED_MI_AGENT_IDS.filter(id => !agentActivity[id]?.calls);

  // FEATURE: MI-22 — Sourced/Simulation(sub-grouped)/Analysis buckets, single describeDataType()
  // pass per row via groupDataSources() (Category M) — replaces S-MI-15's flat count reduce.
  const { sourced, simulationByCategory, analysis } = groupDataSources(dataSources);
  const simulationCategories = Object.keys(simulationByCategory).sort();
  const simulationTotal = simulationCategories.reduce((n, cat) => n + simulationByCategory[cat].length, 0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,position:"relative"}}>
      <FeatureBadge id="MI-17"/>
      <FeatureBadge id="MI-06"/>
      <FeatureBadge id="MI-18"/>
      <FeatureBadge id="MI-15"/>
      <FeatureBadge id="MI-21"/>
      <FeatureBadge id="MI-22"/>
      <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.muted}}>Audit</div>
      <Drawer title="Agent Routing" count={`${ordered.length} event${ordered.length === 1 ? "" : "s"}`} defaultOpen={true}>
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
                <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{evt.id + 1}</span>
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
              <div style={{fontFamily:body,fontSize:11.5,color:T.ink}}>{summary}{evt.durationMs != null ? ` · ${formatDuration(evt.durationMs)}` : ""}</div>
            </div>
          );
        })}
      </Drawer>
      <Drawer title="Agent Reasoning" count={`${learned.length} pattern${learned.length === 1 ? "" : "s"}`}>
        {learned.length === 0 ? (
          <div style={{fontFamily:body,fontSize:12,color:T.muted,fontStyle:"italic"}}>
            No patterns synthesized yet. When a correction or opinion is confirmed, it's written here as reusable reasoning.
          </div>
        ) : learned.map(entry => {
          const author = agentById(entry.agent_id);
          return (
            <div key={entry.id} style={{borderLeft:`3px solid ${T.brass}`,paddingLeft:10,display:"flex",flexDirection:"column",gap:4}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                {author && <AgentAvatar who={author.id} size={20}/>}
                <span style={{fontFamily:body,fontSize:11.5,fontWeight:600,color:T.ink}}>{author ? author.name : entry.agent_id}</span>
                {entry.confidence && (
                  <span style={{fontFamily:mono,fontSize:9,color:T.muted,textTransform:"uppercase"}}>{entry.confidence} confidence</span>
                )}
              </div>
              {entry.source_question && (
                <div style={{fontFamily:mono,fontSize:9,color:T.muted,fontStyle:"italic"}}>&ldquo;{shapeForLog(entry.source_question, 100)}&rdquo;</div>
              )}
              <div style={{fontFamily:body,fontSize:11.5,color:T.ink}}>{shapeForLog(entry.content, 220)}</div>
            </div>
          );
        })}
      </Drawer>
      <Drawer title="Agents" count={`${activeIds.length} active · ${potentialIds.length} potential`}>
        {activeIds.map(id => {
          const agent = agentById(id);
          if (!agent) return null;
          const stats = agentActivity[id];
          return (
            <div key={id} style={{display:"flex",flexDirection:"column",gap:6,paddingBottom:10,borderBottom:`1px dashed ${T.lineSoft}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <AgentAvatar who={agent.id} size={24}/>
                <div style={{display:"flex",flexDirection:"column"}}>
                  <span style={{fontFamily:body,fontSize:12,fontWeight:600,color:T.ink}}>{agent.name}</span>
                  <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{agent.role}</span>
                </div>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {agent.specialty.split(" · ").map(chip => (
                  <span key={chip} style={{fontFamily:mono,fontSize:8,color:T.brassDeep,background:T.paperDeep,border:`1px solid ${T.lineSoft}`,borderRadius:10,padding:"2px 7px"}}>{chip}</span>
                ))}
              </div>
              <div style={{display:"flex",gap:16}}>
                <StatCell val={stats?.calls ?? 0} label="Calls"/>
                <StatCell val={stats?.avgCost != null ? `$${stats.avgCost.toFixed(2)}` : "—"} label="Avg Cost"/>
              </div>
              {stats?.byKind && Object.keys(stats.byKind).length > 0 && (
                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                  {Object.entries(stats.byKind)
                    .sort((a, b) => (b[1].avgLatency || 0) - (a[1].avgLatency || 0))
                    .map(([kind, k]) => (
                      <div key={kind} style={{display:"flex",justifyContent:"space-between",gap:8,fontFamily:mono,fontSize:9,color:T.muted}}>
                        <span>{formatKindLabel(kind)}</span>
                        <span style={{color:T.navy,fontWeight:700,flexShrink:0}}>
                          {k.avgLatency != null ? `${(k.avgLatency/1000).toFixed(1)}s avg` : "—"} ({k.calls} call{k.calls === 1 ? "" : "s"}{k.latencyCount > 1 ? `, max ${(k.maxLatency/1000).toFixed(1)}s` : ""})
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
        {potentialIds.map(id => {
          const agent = agentById(id);
          if (!agent) return null;
          return (
            <div key={id} style={{display:"flex",alignItems:"center",gap:8,opacity:0.38}}>
              <AgentAvatar who={agent.id} size={24}/>
              <div style={{display:"flex",flexDirection:"column"}}>
                <span style={{fontFamily:body,fontSize:12,fontWeight:600,color:T.ink}}>{agent.name}</span>
                <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{agent.role} · not yet used on this screen</span>
              </div>
            </div>
          );
        })}
      </Drawer>
      {/* FEATURE: MI-15 — Data Sources drawer, read-only reference list of the Data Room's
          available data (John: "just like a real library index card booth" — explicitly not
          interactive/clickable). Reuses the same Drawer shell as Learned Context/Agents above.
          FEATURE: MI-22 — regrouped into Sourced (pinned top) + Simulation (sub-grouped by
          category, alphabetical by raw category string). Analysis moved to its own Drawer below. */}
      <Drawer title="Data Sources" count={`${sourced.length + simulationTotal} dataset${sourced.length + simulationTotal === 1 ? "" : "s"} · ${sourced.length} sourced · ${simulationTotal} simulation`}>
        {sourced.length === 0 && simulationTotal === 0 ? (
          <div style={{fontFamily:body,fontSize:12,color:T.muted,fontStyle:"italic"}}>
            No Data Room content loaded yet.
          </div>
        ) : (
          <>
            {sourced.length > 0 && (
              <>
                {/* FEATURE: MI-26 — section-header fontSize bumped to 12.5 to match row title size */}
                <div style={{fontFamily:mono,fontSize:12.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.ink}}>Sourced ({sourced.length})</div>
                {sourced.map(row => <DataSourceRow key={row.id} row={row}/>)}
              </>
            )}
            {simulationTotal > 0 && (
              <>
                <div style={{fontFamily:mono,fontSize:12.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.ink}}>Simulation ({simulationTotal})</div>
                {simulationCategories.map(cat => (
                  <div key={cat} style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{fontFamily:mono,fontSize:12.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.ink}}>
                      {SIMULATION_CATEGORY_LABELS[cat] ?? cat} ({simulationByCategory[cat].length})
                    </div>
                    {simulationByCategory[cat].map(row => <DataSourceRow key={row.id} row={row}/>)}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </Drawer>

      {/* FEATURE: MI-22 — Analysis pulled out into its own sibling Drawer, same AuditColumn
          wrapper/shell: interpretive content layered on top of Sourced/Simulation's raw Data
          Room material, conceptually distinct (John's design-session call). */}
      <Drawer title="Analysis" count={`${analysis.length} item${analysis.length === 1 ? "" : "s"}`}>
        {analysis.length === 0 ? (
          <div style={{fontFamily:body,fontSize:12,color:T.muted,fontStyle:"italic"}}>
            No analysis content yet.
          </div>
        ) : analysis.map(row => <DataSourceRow key={row.id} row={row}/>)}
      </Drawer>
    </div>
  );
}

// FEATURE: MI-22 — shared per-row card markup for the Data Sources / Analysis drawers, unchanged
// visually from S-MI-15 (title, badge, who-tag, category line, metadata line) — only extracted so
// it can be reused across the three new render paths (Sourced, each Simulation sub-group, Analysis)
// without a second describeDataType() call site; label/color/whoTag come from groupDataSources()'s
// already-computed `_display`.
function DataSourceRow({ row }) {
  const { label, color, whoTag } = row._display;
  const meta = [row.geo, row.program_area, row.period, row.partner_id].filter(Boolean).join(" · ");
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4,paddingBottom:10,borderBottom:`1px dashed ${T.lineSoft}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        {/* FEATURE: MI-25 — row title/section-header color weighting swapped (John's request) */}
        {/* FEATURE: MI-26 — row title fontWeight dropped to 400 (normal), now matches section-header fontSize */}
        <span style={{fontFamily:body,fontSize:12.5,fontWeight:400,color:T.muted}}>{row.title}</span>
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          <span style={{fontFamily:mono,fontSize:9,padding:"2px 7px",border:`1px solid ${color}`,color}}>{label}</span>
          {whoTag && <span style={{fontFamily:mono,fontSize:8,color:T.muted}}>· {whoTag}</span>}
        </div>
      </div>
      {row.category && (
        <span style={{fontFamily:mono,fontSize:9,color:T.muted,textTransform:"uppercase"}}>{row.category}</span>
      )}
      {meta && (
        <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{meta}</span>
      )}
    </div>
  );
}

function InteractColumn({ messages, loading, workingStatus, onSubmit, onReview }) {
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
          {workingStatus && <AgentWorkingIndicator key={workingStatus.startedAt} message={workingStatus.message} startedAt={workingStatus.startedAt}/>}
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
  const [workingStatus, setWorkingStatus] = useState(null); // { message, startedAt } | null

  const logEvent = (evt) => setPipelineEvents(prev => [...prev, { ...evt, id: prev.length }]);

  const conversationContext = () =>
    messages.filter(m => typeof m.text === "string").map(m => `${m.role}: ${m.text}`).join("\n");

  const enterHypothesisFlow = async ({ intent, extractedHypothesis, flaggedQuestion, flaggedAnswer, citations, reviewReason }) => {
    if (extractedHypothesis) {
      setHypFlow({ stage:"choosing", intent, candidates:null, prefillText:extractedHypothesis, chosenText:null,
        flaggedQuestion, flaggedAnswer, citations: citations || [], reviewReason, hypothesisTest:null, priorHypothesisTest:null, confirmation:null });
      return;
    }
    setHypFlow({ stage:"generating", intent, candidates:null, prefillText:null, chosenText:null,
      flaggedQuestion, flaggedAnswer, citations: citations || [], reviewReason, hypothesisTest:null, priorHypothesisTest:null, confirmation:null });
    const t0 = Date.now();
    setWorkingStatus({ message: "Priya is generating hypotheses…", startedAt: t0 });
    try {
      const candidates = await generateHypotheses({ flaggedQuestion, flaggedAnswer, reviewReason });
      logEvent({ type: "hypothesis_generation", agentId: "priya", data: { candidates }, durationMs: Date.now() - t0 });
      setHypFlow(prev => prev && ({ ...prev, stage:"choosing", candidates }));
    } catch (e) {
      console.error("[MarketIntelligenceScreen] generateHypotheses", e.message);
      setHypFlow(null);
    } finally {
      setWorkingStatus(null);
    }
  };

  const submit = async (text) => {
    const clean = (text || "").trim();
    if (!clean || loading) return;
    setMessages(prev => [...prev, { role:"user", text: clean }]);
    setLoading(true);
    setWorkingStatus({ message: "Marcus is thinking…", startedAt: Date.now() });
    try {
      const result = await runIntentPipeline(clean, conversationContext(), logEvent);
      if (result.kind === "qa") {
        // FEATURE: S-ARCH-DISPLAY-LOOP-01 — msg.text stays a plain-text join of the formatted body
        // (headline + paragraphs) so conversationContext()/onReview's flaggedAnswer keep working
        // unchanged (both need a plain string, not the structured card shape); rendering itself
        // reads the structured fields below, never {msg.text}, for kind === "qa" bubbles.
        const plainText = [result.headline, ...(result.body || []).map(b => b.text)].filter(Boolean).join("\n\n");
        setMessages(prev => [...prev, {
          role:"assistant", text: plainText, kind:"qa",
          headline: result.headline, body: result.body, keyDataPoints: result.key_data_points,
          displayAgentCard: result.displayAgentCard, displayAgentId: result.displayAgentId,
          needs_review: !!result.needs_review, review_reason: result.review_reason,
          question: clean, citations: result.citations || [],
        }]);
      } else if (result.kind === "qa_failed") {
        setMessages(prev => [...prev, { role:"assistant", text: result.text, kind:"non_qa" }]);
      } else if (result.kind === "hyp_entry") {
        setMessages(prev => [...prev, { role:"assistant", text: `Got it — treating that as a ${INTENT_LABEL[result.intent] || result.intent}. Pick or refine a hypothesis on the right.`, kind:"non_qa" }]);
        await enterHypothesisFlow({ intent: result.intent, extractedHypothesis: result.extractedHypothesis, flaggedQuestion: result.flaggedQuestion, flaggedAnswer: null, citations: [], reviewReason: null });
      } else {
        setMessages(prev => [...prev, { role:"assistant", text: result.text, kind:"non_qa" }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role:"assistant", text: "Something went wrong reaching Marcus — try again.", kind:"error" }]);
      console.error("[MarketIntelligenceScreen]", e.message);
    } finally {
      setLoading(false);
      setWorkingStatus(null);
    }
  };

  const onReview = (msg) => {
    enterHypothesisFlow({ intent:"theory", extractedHypothesis:null, flaggedQuestion: msg.question, flaggedAnswer: msg.text, citations: msg.citations || [], reviewReason: msg.review_reason });
  };

  const onIntentChange = (intent) => setHypFlow(prev => prev && ({ ...prev, intent }));

  const onSelectHypothesis = async (text) => {
    if (!hypFlow) return;
    const { intent, flaggedQuestion, flaggedAnswer, hypothesisTest } = hypFlow;
    setHypFlow(prev => ({ ...prev, stage:"testing", chosenText: text }));
    setMessages(prev => [...prev, { role:"assistant", kind:"hyp_submitted", text, intent }]);
    const t0 = Date.now();
    setWorkingStatus({ message: "Priya is running a hypothesis test…", startedAt: t0 });
    try {
      const st = await runHypothesisTest({ hypothesis: text, intent, flaggedQuestion, flaggedAnswer, priorHypothesisTest: hypothesisTest || null, onEvent: logEvent });
      logEvent({ type: "hypothesis_test", agentId: "priya", data: st, durationMs: Date.now() - t0 });
      setMessages(prev => [...prev, { role:"assistant", kind:"hypothesis_test", hypothesisTest: st, displayAgentCard: st.display_agent_card, displayAgentId: st.display_agent_id }]);
      setHypFlow(prev => prev && ({ ...prev, stage:"result", chosenText: text, hypothesisTest: st, priorHypothesisTest: prev.hypothesisTest || null }));
    } catch (e) {
      console.error("[MarketIntelligenceScreen] runHypothesisTest", e.message);
      setHypFlow(prev => prev && ({ ...prev, stage:"choosing" }));
    } finally {
      setWorkingStatus(null);
    }
  };

  const onDiscard = () => {
    setMessages(prev => [...prev, { role:"assistant", kind:"hyp_discard", text: "Theory discarded — not written to the Data Room." }]);
    setHypFlow(null);
  };

  // FEATURE: MI-01d — Track as Assumption / Make Permanent. Calls Elena (memory-consolidation,
  // unconditional, self-gated, no confirmation) and Nadia (data-analysis, unconditional, always
  // pending_confirmation) directly — no Intake Assistant involvement, no delegation, no nesting
  // (see kickoff CONTEXT for why intake-commit-intent's route_to fan-out is deliberately unused).
  const onCommit = async (intent) => {
    if (!hypFlow) return;
    const { flaggedQuestion, flaggedAnswer, citations, chosenText, hypothesisTest } = hypFlow;
    setHypFlow(prev => prev && ({ ...prev, stage: "committing" }));
    try {
      const disputedChunkId = Array.isArray(citations) && citations.length === 1 ? citations[0] : null;
      const hypothesisTestText = hypothesisTest
        ? [hypothesisTest.supports?.text, hypothesisTest.complicates?.text, hypothesisTest.consider?.text].filter(Boolean).join(" ")
        : "";

      let t0 = Date.now();
      setWorkingStatus({ message: "Elena is consolidating this into memory…", startedAt: t0 });
      const elenaResult = await callCapability({
        capability_slug: "memory-consolidation", intent_slug: "reasoner-intent", agent_id: "elena",
        task_context: {
          original_question: flaggedQuestion || "", flagged_answer: flaggedAnswer || "",
          committed_hypothesis: chosenText, intent, hypothesis_test: hypothesisTestText,
          was_override: !!hypothesisTest?.override_warning,
        },
      });
      logEvent({ type: "memory_consolidation", agentId: "elena", data: elenaResult, durationMs: Date.now() - t0 });

      t0 = Date.now();
      setWorkingStatus({ message: "Nadia is drafting a data patch…", startedAt: t0 });
      const nadiaResult = await callCapability({
        capability_slug: "data-analysis", intent_slug: "data-patch-intent", agent_id: "nadia",
        task_context: {
          disputed_chunk_id: disputedChunkId, correction: chosenText,
          user_reasoning: hypothesisTestText || chosenText,
        },
      });
      logEvent({ type: "patch_proposed", agentId: "nadia", data: nadiaResult, durationMs: Date.now() - t0 });

      setHypFlow(prev => prev && ({
        ...prev, stage: "result",
        confirmation: {
          confirmation_id: nadiaResult.confirmation_id,
          proposed_action: nadiaResult.proposed_action,
          critique: nadiaResult.critique,
          disputed_chunk_id: disputedChunkId,
          user_reasoning: hypothesisTestText || chosenText,
        },
      }));
    } catch (e) {
      console.error("[MarketIntelligenceScreen] onCommit", e.message);
      setHypFlow(prev => prev && ({ ...prev, stage: "result" }));
    } finally {
      setWorkingStatus(null);
    }
  };

  const onResolveConfirmation = async (resolution, editedText = null) => {
    if (!hypFlow?.confirmation) return;
    const { confirmation_id, disputed_chunk_id } = hypFlow.confirmation;
    const edited_task_context = resolution === "edit"
      ? { disputed_chunk_id, correction: editedText, user_reasoning: editedText }
      : null;
    const t0 = Date.now();
    setWorkingStatus({ message: "Nadia is processing your response…", startedAt: t0 });
    try {
      const result = await resolveConfirmation({ confirmation_id, resolution, edited_task_context });

      if (resolution === "edit") {
        logEvent({ type: "patch_resolved", agentId: "nadia", data: { resolution, result }, durationMs: Date.now() - t0 });
        setHypFlow(prev => prev && ({
          ...prev,
          confirmation: { ...prev.confirmation, confirmation_id: result.confirmation_id, proposed_action: result.proposed_action, critique: result.critique },
        }));
        return;
      }

      logEvent({ type: "patch_resolved", agentId: "nadia", data: { resolution, result }, durationMs: Date.now() - t0 });
      setMessages(prev => [...prev, { role: "assistant", kind: "hyp_discard",
        text: resolution === "accept" ? (result.content?.confirmation_note || "Recorded.") : "Nadia's proposal was rejected — not recorded." }]);
      setHypFlow(null);
    } finally {
      setWorkingStatus(null);
    }
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
          <InteractColumn messages={messages} loading={loading} workingStatus={workingStatus} onSubmit={submit} onReview={onReview}/>
          <EvidenceColumn hypFlow={hypFlow} onIntentChange={onIntentChange} onSelectHypothesis={onSelectHypothesis} onDiscard={onDiscard} onCommit={onCommit} onResolveConfirmation={onResolveConfirmation}/>
          <AuditColumn events={pipelineEvents}/>
        </div>
      </div>
    </AppShell>
  );
}
