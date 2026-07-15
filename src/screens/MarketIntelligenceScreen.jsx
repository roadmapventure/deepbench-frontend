// DeepBench v6.2.38 | MarketIntelligenceScreen.jsx | MI-64 — Desktop InteractColumn's message
// list now auto-scrolls to bottom on new message/workingStatus change (reusing FetchContext.jsx's
// existing scroll-to-bottom-with-user-override pattern, replicated locally, not imported) and
// EvidenceColumn now threads workingStatus through to render a duplicate AgentWorkingIndicator
// near the top of both its empty and populated states.
// FEATURE: MI-64
//
// DeepBench v6.2.35 | MarketIntelligenceScreen.jsx | MI-61 — Evidence column's empty-state
// sentence (MI-59's getEvidencePanelSentence(), !hypFlow branch) tightened per John's direct
// copy request: "Once your chat has analysis data for you to interact with, it will appear
// here" -> "Once your chat has analysis data for interaction, it will appear here...". Copy-only,
// single string; populated-state branch untouched.
// FEATURE: MI-61
//
// DeepBench v6.2.33 | MarketIntelligenceScreen.jsx | MI-60 — InteractColumn's empty state (shown
// only before the first message) gains a 4th seed box beneath the existing 3 EXAMPLE_QUESTIONS
// buttons: a collapsed Drawer (SharedUI.jsx, reused unmodified) titled "Browse 20 more example
// questions" with a (20) count badge and maxHeight:220 internal scroll, revealing the 20 realistic
// VP-of-Channel-Sales questions (MORE_EXAMPLE_QUESTIONS, drafted/pipeline-tested by the 2026-07-08/09
// overnight AA-172/AA-173 session). Clicking any of the 20 auto-sends via the same submit() as the
// existing 3 (no populate-then-review). Because messageList (and this whole empty-state block) is
// shared by both InteractColumn's bare (mobile) and non-bare (desktop) branches, this ships on both
// by construction — no useIsMobile() branch, no changes to Drawer or EXAMPLE_QUESTIONS. See kickoff
// docs/kickoffs/v6.2.33-MI-60-seed-question-drawer.md.
// FEATURE: MI-60
//
// DeepBench v6.2.30 | MarketIntelligenceScreen.jsx | MI-59 — EvidenceColumn's !hypFlow branch
// becomes purely informational ("Once your chat has analysis data for you to interact with, it
// will appear here"), the 4 dummy data-type pills (Sourced/Analysis/Source Simulation/Learned —
// no click handler, no flow tie) removed outright, not just hidden. Populated branch's header
// unified to "Evidence" (was "Theory Evidence") and gains a new intent-prefixed sentence (e.g.
// "Theory — Data for you to interact with your chat..."), placed directly under the header. Both
// strings come from one new getEvidencePanelSentence(hypFlow) helper so they can't drift apart.
// describeDataType() itself is unchanged, still used by its other 2 call sites (Data Sources
// drawer, Pipeline Log confidence_tier summary) — see STYLE-GUIDE.md §19's MI-59 amendment.
// FEATURE: MI-59
//
// DeepBench v6.2.29 | MarketIntelligenceScreen.jsx | MI-58 — estimateChainMs() rewritten to a
// depth-weighted expected-value-per-call model: depth0's p75 (always paid) plus each further
// depth's p75 weighted by how often that depth is actually reached relative to depth0's call
// count, reading the new byKind[kind].byDepth data from useAgents.js. formatExpectation() and all
// 3 call sites unchanged (same ms-in/string-out contract). See kickoff
// docs/kickoffs/v6.2.29-MI-58-expected-time-estimate-fix.md.
// FEATURE: MI-58
//
// DeepBench v6.2.27 | MarketIntelligenceScreen.jsx | MI-57 — desktop's InteractColumn (non-bare
// branch) now accepts onClear and renders a Clear control in its input row, after Send — reuses
// MobileBody's existing Clear link style verbatim (MI-51/MI-56). Mobile (bare) branch unchanged;
// onClear's own reset semantics (~line 1759) unchanged. See kickoff
// docs/kickoffs/v6.2.27-MI-57-desktop-clear-button.md.
// FEATURE: MI-57
//
// DeepBench v6.2.25 | MarketIntelligenceScreen.jsx | MI-56 — mobile MI's permanent Question box/Send/
// Clear strip merged from two stacked rows into one: input (flex:1) — Send — thin T.lineSoft divider
// — Clear. Was a mobile shell bug (Clear rendered orphaned on its own near-empty row underneath).
// Pure layout merge, no handler/behavior change. See STYLE-GUIDE.md §21's 2026-07-14 MI-56 amendment
// and kickoff docs/kickoffs/v6.2.25-MI-56-mobile-chat-input-clear-row-merge.md.
// FEATURE: MI-56
//
// DeepBench v6.2.24 | MarketIntelligenceScreen.jsx | MI-55 — AuditColumn's Agent Routing Drawer
// (desktop only) opts into SharedUI.jsx's new `resizable` prop alongside its existing maxHeight={280}
// — drag-to-resize taller, floor locked at 280, ceiling min(80vh, real content height), not persisted.
// The other 4 drawers (Agents/Data Sources/Analysis/Agent Reasoning) are unchanged.
// FEATURE: MI-55
//
// DeepBench v6.2.22 | MarketIntelligenceScreen.jsx | MI-54 — EvidenceColumn (desktop Column 2)
// bounded to the grid row height with an internal scroll region, matching InteractColumn's existing
// pattern (action buttons/ConfirmationCard now scroll into view inside the card instead of growing
// the whole page past the fold). MI-53 (real Display-Agent hop for Nadia's pending_confirmation
// proposal) REVERTED 2026-07-14, same commit -- the new data-patch-display-intent hop let Michelle's
// agent-selection route an unconfirmed correction to a write-capable agent (Eleanor Voss/
// library-write-intent), which executed a real the_library INSERT before any human confirmation.
// Reverted at John's explicit direction pending a proper fix to delegate_to_agent's target-capability
// restriction (task_773e8b06). See kickoff docs/kickoffs/v6.2.22-MI-53-MI-54-confirmation-format-column2-scroll.md.
// FEATURE: MI-54
// DeepBench v6.2.20 | MarketIntelligenceScreen.jsx | MI-52 — Agent Routing log normalization: one
// agent per row (arrow/secondary-avatar block removed from RoutingEventRow; firstName helper
// extracted to module scope, shared by describeDelegationEvent() and RoutingEventRow), agent_selection/
// display_format re-pointed so the row's one visible agent is whoever the row is actually about
// (picker vs. formatter, not the requester), duplicated/fabricated durationMs fixed (agent_selection
// shows null, never a copy of display_format's real number or a hardcoded 0), and in-flight
// delegation/delegation_return rows are now replaced in place by their real completion event instead
// of sitting duplicated forever (logEvent's new additive `{ replaces }` call shape). See kickoff
// docs/kickoffs/v6.2.20-MI-52-agent-routing-log-normalization.md.
// FEATURE: MI-52 — see STYLE-GUIDE.md §5 (2026-07-14 amendment, reverses S-MI-49's drawer-scope note)
// DeepBench v6.2.18 | MarketIntelligenceScreen.jsx | S-MI-51 — guided review->theory->decide journey:
// every qa answer ends with an explicit "Good, thanks / Have Priya generate theories" choice (not just
// internally-flagged ones); mobile Chat/Evidence become a permanent tab bar (Evidence disabled until a
// theory flow is active, symmetric flash on unseen content) replacing the old hidden-overlay pattern;
// elapsed/expect/status becomes a permanent strip (fixes 30s dead-air behind the old Evidence overlay);
// theory testing requires an explicit "Have Priya test this theory ->" click, no longer auto-fired on
// selection; end decision collapses from 3 buttons (Discard/Track as Assumption/Make Permanent) to 2
// (Info Only/Store as Forecast); confirmation card gets a plain-language intro line naming Nadia; the
// Theory/Forecast/Correct switcher UI is removed from EvidenceColumn (underlying intent routing
// unchanged). "Agent & Data Info" (renamed from "Activity") relocates to the page-title row, mobile-only.
// Also corrects MI-50's stale FEATURES.md/CLAUDE-STATE.md tracking (code was already live, see kickoff).
// FEATURE: MI-51 — see STYLE-GUIDE.md §21 (2026-07-14 amendment)
// DeepBench v6.2.15 | MarketIntelligenceScreen.jsx | S-MI-50 — mobile MobileBody: bottom-edge scroll
// affordance (fade gradient + bouncing chevron, reuses dbounce keyframe) on the pinned Agent Routing
// feed, shown only when there's real unscrolled content below (dynamic, re-checked on scroll and on
// event-list growth). See STYLE-GUIDE.md §21's 2026-07-14 amendment. FEATURE: MI-50.
// DeepBench v6.2.0 | MarketIntelligenceScreen.jsx | S-MOBILE-NAV-01 — rename (MI-46): page title +
// Agent Routing empty-state copy "Market Intelligence" → "Channel Sales Intelligence", display-text
// only, see STYLE-GUIDE.md §25.
// DeepBench v6.1.46 | MarketIntelligenceScreen.jsx | S-MI-45 — mobile-responsive composition: new
// isMobile branch (useIsMobile()) renders MobileBody (chat flex:3 + pinned Agent Routing feed
// flex:1, Evidence/Activity full-screen overlays) below MOBILE_BREAKPOINT (768px); desktop's
// existing 3-column grid is completely unchanged. RoutingEventRow (Agent Routing event row) and
// AuditDrawersBody (Agents/Data Sources/Analysis/Agent Reasoning drawers) extracted out of
// AuditColumn so both desktop and mobile render the exact same shared JSX (Category M).
// FEATURE: MI-45 — see STYLE-GUIDE.md §21-23
// DeepBench v6.1.44 | MarketIntelligenceScreen.jsx | S-MI-43 — Agents drawer latency rows: new shared
// LatencyStatRow component replaces the old justifyContent:"space-between" full-string right-justify
// with a fixed-width label column (ellipsis-truncated) + fixed-width right-aligned leading number, so
// the decimal point/units digit lines up across rows regardless of label length or 1-vs-2-digit values
// DeepBench v6.1.43 | MarketIntelligenceScreen.jsx | S-MI-42 -- live SSE delegation events + MI-41 macro-hop swap, all 3 agent flows
// DeepBench v6.1.41 | MarketIntelligenceScreen.jsx | S-MI-34 — MI-32/33 scroll-fix completion (3-column
// grid alignItems:"start" removed, restoring default stretch so InteractColumn's own overflow chain gets
// a real bounded height); Column 3 drawer height cap (MI-34, Drawer's new maxHeight prop, Agent Routing
// only) + reorder (MI-39, Agent Reasoning moved to last); 3 copy fixes (MI-37/38/40); expected-time
// indicator + timer reformat (MI-35, formatElapsed now "Xm Ys"/"Xs", new expectation field on
// workingStatus with a two-stage ceiling→chain-based estimate)
// DeepBench v6.1.35 | MarketIntelligenceScreen.jsx | AA-164 — runQaWithQualityGate() emits an agent_selection Pipeline Log event when Marcus's ci-answer-intent turn threads a real internal request_help hop (qa.last_help_selection), reusing the existing generic agent_selection case unchanged
// DeepBench v6.1.23 | MarketIntelligenceScreen.jsx | S-MI-30/MI-30+MI-31 — Agents drawer: added "riley" to PROPOSED_MI_AGENT_IDS + html-display to MI_LOOP_SCOPE (Riley Torres visibility fix); added a "Baseline" rollup row (rollupBaseline(), speed-baseline-test tenant) as the first entry in each agent's byKind breakdown
// DeepBench v6.1.21 | MarketIntelligenceScreen.jsx | S-MI-29/MI-29 — three silent-reset async catch blocks (enterHypothesisFlow/onSelectHypothesis/onCommit) now surface the real e.message as a chat error bubble and a Pipeline Log "error" row (T.flag), matching the pattern onSend's catch already used
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
// FEATURE: MI-02 — deterministic human-decision layer: hypothesis pick/write + commit actions are
// explicit human controls, all live as of 01d. FEATURE: MI-51 — commit actions relabeled/collapsed
// from 3 buttons (Discard/Track as Assumption/Make Permanent) to 2 (Info Only/Store as Forecast).
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
import { Card, Corners, FeatureBadge, AgentAvatar, UserAvatar, ConfirmationCard, ChartRenderer, Drawer } from "../components/SharedUI.jsx";
import { useAgents, useLearnedContext, useAgentActivitySummary, useDataSources } from "../hooks/useAgents.js";
import { useIsMobile } from "../hooks/useIsMobile.js"; // FEATURE: MI-45
import AIDiamond from "../components/AIDiamond.jsx";
import { PATTERN_CATALOG } from "../hooks/useAIActivity.js"; // FEATURE: AI-50c
// FEATURE: MI-51 — AI_PAT/AiBadge import removed: the qa card's AiBadge(AI_PAT.AGENT_ROUTING) rendering
// (previously shown only on non-flagged answers) is superseded by the universal guided review prompt
// below, which now renders on every qa message regardless of needs_review — no remaining call site.

const EXAMPLE_QUESTIONS = [
  { id: "clean",  label: "Japan is Apple's fastest-growing GEO in 2025 — what is driving that?" },
  { id: "review", label: "Why is our EMEA retail partner's co-op budget utilization so low this quarter?" },
  { id: "fail",   label: "How is our authorized reseller network performing in Vietnam?" },
];

// FEATURE: MI-60 — the 20 VP-of-Channel-Sales questions drafted/pipeline-tested by the
// 2026-07-08/09 overnight session (AA-172/AA-173). Same {id, label} shape as EXAMPLE_QUESTIONS.
const MORE_EXAMPLE_QUESTIONS = [
  { id: 1,  label: "Why is co-op budget utilization so low for our EMEA large-format retail partner this quarter?" },
  { id: 2,  label: "What made Crest Wireless's recent upgrade promotion successful, and can we replicate it with other US partners?" },
  { id: 3,  label: "What's going on with Meridian Electronics' digital shelf compliance issue in France and Italy?" },
  { id: 4,  label: "How is Jinhua Digital recovering after its sales decline in Greater China?" },
  { id: 5,  label: "What risks should we watch as Elevate Mobility rapidly expands in India?" },
  { id: 6,  label: "What is Nippo Carrier in Japan doing that makes them our top performer, and how do we scale it to other partners?" },
  { id: 7,  label: "How is the installment plan program performing with Altiplano Móvil in Mexico?" },
  { id: 8,  label: "What's the training compliance gap at Vitrine Tech in Brazil, and what's the risk to their certification?" },
  { id: 9,  label: "Why is Horizon Store in Vietnam so much more ready for our new product introduction than Signal Mobile in Thailand and Indonesia?" },
  { id: 10, label: "What is our channel strategy outlook for EMEA Emerging markets — India, Middle East, and Africa?" },
  { id: 11, label: "What is our channel strategy outlook for Latin America this year?" },
  { id: 12, label: "What is our channel strategy outlook for Southeast Asia?" },
  { id: 13, label: "How does our co-op/MDF utilization compare to industry benchmarks?" },
  { id: 14, label: "How does our partner training and turnover rate compare to industry benchmarks?" },
  { id: 15, label: "What is the smartphone growth trajectory in emerging markets, and how should that shape our channel investment?" },
  { id: 16, label: "How has our GEO revenue trended from 2023 to 2025, and which regions are growing fastest?" },
  { id: 17, label: "What are the public requirements for a partner to become an Apple Authorized Reseller?" },
  { id: 18, label: "How do smartphone upgrade cycles vary by country, and what does that mean for our channel replenishment planning?" },
  { id: 19, label: "Across all our channel partners globally, which ones are the biggest at-risk accounts this quarter, and why?" },
  { id: 20, label: "What is our co-op utilization rate for our partner in South Korea?" },
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

// FEATURE: AI-50c — slug -> human label, built from the same PATTERN_CATALOG useAIActivity.js owns
const PATTERN_NAME = Object.fromEntries(PATTERN_CATALOG.map(p => [p.slug, p.name]));

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

// FEATURE: MI-42 -- mirrors CreateWorkOrderScreen.jsx's own proven reader (res.body.getReader() +
// TextDecoder, data: <json> lines, data: [DONE] sentinel) -- same idiom, not a new one. Buffers a
// trailing partial line across chunk boundaries (chunks don't align to \n\n boundaries). `type:
// 'result'` resolves the promise; `type: 'error'` throws (this is how a streamed request's failure
// surfaces now that the HTTP status is locked at 200 once streaming starts -- see execute.js
// streamResult()); every other type is forwarded to onProgress as a live delegation event.
async function readSSEResult(res, onProgress) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let final;
  let gotResult = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      let evt;
      try { evt = JSON.parse(data); } catch { continue; }
      if (evt.type === 'result') { final = evt.result; gotResult = true; }
      else if (evt.type === 'error') { throw Object.assign(new Error(evt.message), { status: evt.status, detail: evt.detail }); }
      else { onProgress(evt); }
    }
  }
  if (!gotResult) throw new Error('Stream ended without a result event');
  return final;
}

// FEATURE: MI-23 — live elapsed timer for the chat-embedded working-status indicator
// FEATURE: MI-35 — reformatted from "m:ss" (e.g. "1:04") to "Xm Ys"/"Xs" for consistency with the
// new expected-time estimate rendered next to it (formatExpectation, below) — same unit style,
// same font, read as one continuous phrase.
function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// FEATURE: MI-35 — known intent chains per user-facing action that has one. Only chains this
// session can ground in real, already-logged data get an entry — do not invent chains for
// working-status triggers not listed here (patch resolution, memory consolidation, etc.); those
// pass expectation: null and render no estimate, out of scope this session.
const INTENT_CHAINS = {
  qa: [["marcus","ci-routing-intent"], ["marcus","ci-answer-intent"], ["owen","qg-review-intent"], ["marcus","ci-answer-display-intent"]],
  escalate: [["marcus","ci-routing-intent"]],
  hypothesis_generation: [["priya","hyp-generation-intent"]],
  hypothesis_test: [["priya","hyp-hypothesis-test-intent"], ["priya","hyp-hypothesis-test-display-intent"]],
};

// FEATURE: MI-58 — was: sum one blended avgLatency per intent, treating each as a single LLM
// turn. Real data (ai_activity_log's :depthN tag) shows the heaviest intents in this chain loop
// through multiple real turns before returning to the frontend far more often than not (e.g.
// ci-answer-intent reaches depth1 on ~69% of calls) — a single blended average understates the
// true per-call cost. Now: depth0's p75 (the call always pays this) plus each further depth's p75
// weighted by how often that depth is actually reached (relative to depth0's call count) — an
// expected-value-per-call model instead of expected-value-per-turn. Returns null (unchanged
// contract) whenever depth0 has no historical data yet, same "fall back to the generic ceiling"
// behavior as before.
function estimateChainMs(chain, agentActivity) {
  let total = 0;
  for (const [agentId, kind] of chain) {
    const byDepth = agentActivity?.[agentId]?.byKind?.[kind]?.byDepth;
    const depth0 = byDepth?.depth0;
    if (!depth0?.p75 || !depth0.calls) return null;
    let hopTotal = depth0.p75;
    for (let i = 1; ; i++) {
      const d = byDepth[`depth${i}`];
      if (!d) break;
      hopTotal += d.p75 * (d.calls / depth0.calls);
    }
    total += hopTotal;
  }
  return total;
}

// FEATURE: MI-35 — "expect > Xs" (<60s) or "expect > Xm Ys" (>=60s). Rounds up to the nearest
// 5s so the floor framing ("greater than") stays honest against small variance in the historical
// average it's built from. FEATURE: MI-47 — label renamed from "expect" to "question".
// FEATURE: MI-49 — reverted back to "expect": now that this renders on its own line directly under
// the user's question bubble, it reads unambiguously without needing to distinguish itself from the
// per-agent timer on the same line (that need no longer exists post-MI-49's two-line layout).
function formatExpectation(ms) {
  const roundedSec = Math.ceil(ms / 1000 / 5) * 5;
  const m = Math.floor(roundedSec / 60);
  const s = roundedSec % 60;
  return m > 0 ? `expect > ${m}m ${s}s` : `expect > ${s}s`;
}

// FEATURE: MI-23 — replaces the header's global AI status dot for this screen; one line, swaps
// message + resets its timer each time control passes to a new agent (only one agent ever runs
// at a time on this platform today, confirmed no concurrent dispatch anywhere in this file or the
// execute.js harness loop — see kickoff CONTEXT). Keyed by startedAt at the call site (not here)
// so React fully remounts this component on every new turn instead of trying to reset internal
// tick state — the simplest correct way to guarantee the timer starts at 0:00 every time.
// FEATURE: MI-49 — two-line layout (John's live review of MI-47's shipped one-line layout): line 1
// is the total elapsed + estimate on its own row, no diamond; line 2 is the diamond + activity
// message + bare per-agent time (drops the old "(...this Agent)" parenthetical, no label — line 1
// already carries the explicit "elapsed"/"expect" labels).
function AgentWorkingIndicator({ message, startedAt, turnStartedAt, expectation }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:12,position:"relative"}}>
      <FeatureBadge id="MI-47"/>
      <FeatureBadge id="MI-49"/>
      <span style={{fontFamily:mono,fontSize:10,color:T.brassDeep}}>
        elapsed {formatElapsed(now - turnStartedAt)}{expectation ? ` | ${expectation}` : ""}
      </span>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <AIDiamond size="7px" color={T.brass}/>
        <span style={{fontFamily:mono,fontSize:11,color:T.muted,fontStyle:"italic",fontWeight:400}}>{message}</span>
        <span style={{fontFamily:mono,fontSize:10,color:T.brassDeep}}>{formatElapsed(now - startedAt)}</span>
      </div>
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
        return { capability: "quality-gate", summary: `Guardrail: block — ${g.rule_violated}`, color: T.flag };
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
    // FEATURE: MI-29 -- surfaces the real caught error (e.message) in the existing Pipeline Log
    // instead of it only ever reaching a devtools-only console.error. Reuses T.flag, the same
    // alert color already used for guardrail "block" results above -- no new color introduced.
    case "error":
      return { capability: evt.data.step || null, summary: `Failed: ${evt.data.message}`, color: T.flag };
    // FEATURE: MI-47 -- permanent drawer rows for every live handoff shown in the chat status line
    // (onDelegationProgress), alongside the pre-existing coarse checkpoint events above.
    case "delegation":
      return { capability: null, summary: evt.data.message, color: T.navyMid };
    case "delegation_return":
      return { capability: null, summary: evt.data.message, color: T.moss };
    default:
      return { capability: null, summary: "", color: T.muted };
  }
}

// FEATURE: MI-52 — shared module-scope "first name only" resolver. Previously a local const
// duplicated inside describeDelegationEvent (MI-49); RoutingEventRow now needs the identical
// behavior (Task 1: drawer row headers switch from full name to first-name-only, matching the
// chat status line), so this is the one implementation both call, not a second copy.
function firstNameFor(id, agentById) {
  return (agentById(id)?.name || id).split(" ")[0];
}

// FEATURE: MI-42 -- generic across every agent pair, no hardcoded names or capability-specific
// branches (matches ARCHITECTURE.md §19d's own anti-hardcoding discipline) -- copy is derived
// entirely from the event's own fromAgentId/toAgentId, resolved against the real roster.
// FEATURE: MI-52 -- was MI-49's first-name-only treatment, scoped to this function only with the
// Agent Routing drawer's own row headers explicitly out of scope (still full names). MI-52 reverses
// that scope note per John's direct instruction this session: RoutingEventRow now also renders
// first name only (see below), via the same firstNameFor() helper this function calls.
function describeDelegationEvent(evt, agents) {
  const agentById = (id) => agents.find(a => a.id === id);
  const fromName = firstNameFor(evt.fromAgentId, agentById);
  const toName = firstNameFor(evt.toAgentId, agentById);
  if (evt.type === 'delegation_return') {
    return `${fromName} is back — wrapping up…`; // FEATURE: MI-48 -- was toName (named who control
    // returns TO, not who was actually away and is now done) -- confirmed against the real live SSE
    // payload: fromAgentId is the sub-agent who was helping, toAgentId is who receives control back.
  }
  switch (evt.viaTool) {
    case 'request_help':
      return `${fromName} is asking ${toName} who should help…`;
    case 'critique':
      return `${toName} is reviewing ${fromName}'s proposal…`;
    case 'delegate_to_agent':
    default:
      return `${fromName} is routing this to ${toName}…`;
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
async function resolveInProgress(result, onProgress = null) {
  let iterations = 0;
  while (result.status === "in_progress") {
    if (++iterations > MAX_CONTINUE_ITERATIONS) {
      throw new Error(`Chain did not complete after ${MAX_CONTINUE_ITERATIONS} continuations (job_id: ${result.job_id})`);
    }
    const res = await fetch("/api/capabilities/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "continue", job_id: result.job_id, stream: !!onProgress }),
    });
    if (!res.ok) throw new Error(`continue (job_id: ${result.job_id}) failed: ${res.status}`);
    result = onProgress ? await readSSEResult(res, onProgress) : await res.json();
  }
  return result;
}

async function callCapability({ capability_slug, intent_slug, agent_id, task_context, runtime_context = null, format_skill_profile_slug = null, display_agent_id = null, onProgress = null }) {
  const res = await fetch("/api/capabilities/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      capability_slug, intent_slug, agent_id, task_context, runtime_context,
      format_skill_profile_slug, display_agent_id,
      tenant_id: TENANT_ID,
      stream: !!onProgress,
    }),
  });
  if (!res.ok) throw new Error(`${capability_slug} ${intent_slug} failed: ${res.status}`);
  const first = onProgress ? await readSSEResult(res, onProgress) : await res.json();
  const result = await resolveInProgress(first, onProgress);
  if (result.status) return result;
  return result.content || {};
}

// FEATURE: MI-01d — resolve a pending_confirmation (accept/reject/edit). Generic across any
// capability — the confirmation_id already encodes which capability/agent/intent it belongs to.
// FEATURE: MI-42 — gains the identical onProgress/stream treatment for consistency (Nadia's
// confirmation-resolve path); no live call site opts in this session (see Task 3g), future-proofing.
async function resolveConfirmation({ confirmation_id, resolution, edited_task_context = null, onProgress = null }) {
  const res = await fetch("/api/capabilities/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "resolve", confirmation_id, resolution, edited_task_context, stream: !!onProgress }),
  });
  if (!res.ok) throw new Error(`resolve ${resolution} failed: ${res.status}`);
  const first = onProgress ? await readSSEResult(res, onProgress) : await res.json();
  return resolveInProgress(first, onProgress);
}

// FEATURE: MI-01d — Owen's own delegate_to_agent call replaces the screen-scripted retry
// (AI-39, S-MARKET-INTEL-01c) that bypassed the mechanism AA-82/S-ARCH-AGENT-LOOP-03 specifically
// built for this exact live-caller case. Orchestrator-workers pattern (Anthropic, "Building
// Effective Agents"): Owen decides whether a block is worth one retry and calls Marcus himself;
// his own final output (final_answer) carries the delegated result forward, since nothing outside
// his own tool-call loop is visible to this caller otherwise -- same shape Nadia's
// data-patch-execute-intent already uses for her promote action's Eleanor delegation (S-APPLE-04b).
async function runQaWithQualityGate(message, conversationContext, onEvent, setStatus, onProgress) {
  let t0 = Date.now();
  const qa = await callCapability({
    capability_slug: "channel-intelligence", intent_slug: "ci-answer-intent", agent_id: "marcus",
    task_context: { goal: message }, runtime_context: conversationContext, onProgress,
  });
  onEvent({ type: "qa_answer", agentId: "marcus", data: qa, durationMs: Date.now() - t0 });
  // FEATURE: AA-164 -- surfaces an internal request_help hop Marcus's own ci-answer-intent turn
  // took (e.g. delegating to Eleanor Voss for a catalog question, AA-162) using the exact same
  // generic Pipeline Log case already rendering Michelle's Display-agent hand-off below (same
  // shape, same execute.js code path -- not a new event type).
  if (qa.last_help_selection) {
    // FEATURE: MI-52 -- agentId re-pointed to the picker (Michelle) whose own reasoning is the row's
    // summary text, not the requester (Marcus) -- secondaryAgentId dropped, RoutingEventRow no longer
    // renders a second agent. durationMs: null (was a fabricated 0) -- not separately measurable from
    // the client, this hop shares its one real round trip with qa_answer above.
    onEvent({ type: "agent_selection", agentId: qa.last_help_selection.selected_by_agent_id, data: qa.last_help_selection, durationMs: null });
  }

  t0 = Date.now();
  setStatus("Owen is reviewing…"); // FEATURE: MI-42 (was MI-41) -- macro-hop swap, was invisible before
  const gate = await callCapability({
    capability_slug: "quality-gate", intent_slug: "qg-review-intent", agent_id: "owen",
    task_context: {
      question: message, candidate_answer: qa.answer, confidence_tier: qa.confidence_tier, citations: qa.citations,
      agent_id: "marcus", capability_slug: "channel-intelligence", intent_slug: "ci-answer-intent",
    },
    onProgress,
  });
  const retried = !!gate.final_answer;
  // FEATURE: MI-52 -- secondaryAgentId dropped; the retry is already named in this row's own summary
  // text (describePipelineEvent's "proofreader" case: " (Owen retried via Marcus)"), no info loss.
  onEvent({ type: "proofreader", agentId: "owen", data: gate, durationMs: Date.now() - t0 });

  if (gate.guardrail?.result === "block") {
    // FEATURE: AA-171 fix (S-ARCH-QG-ESCALATION-01) -- Owen's own qg-review-intent turn now
    // performs the escalation hand-off itself (request_help -> Michelle's real recommendation ->
    // delegate_to_agent, non-final) when a block isn't fixable by his own retry. This screen no
    // longer inspects gate.guardrail and picks the next call on Owen's behalf -- that was the
    // AA-171 Rule #1 violation ARCHITECTURE.md §19d exists to prevent. gate.triage carries
    // whatever the real delegate returned, copied verbatim by Owen; gate.last_help_selection
    // carries Michelle's own real reasoning for the pick, surfaced the same way AA-164 already
    // surfaces Marcus's own request_help hop above (qa.last_help_selection).
    if (gate.last_help_selection) {
      // FEATURE: MI-52 -- same re-pointing as the request_help hop above: agentId is the picker
      // (Michelle), not the requester (Owen); secondaryAgentId dropped; durationMs: null (was a
      // fabricated 0) -- not separately measurable from the client.
      onEvent({ type: "agent_selection", agentId: gate.last_help_selection.selected_by_agent_id, data: gate.last_help_selection, durationMs: null });
    }
    onEvent({ type: "failure_triage", agentId: gate.last_help_selection?.selected_by_agent_id || "owen", data: gate.triage, durationMs: 0 });
    return { kind: "qa_failed", text: buildFailureText(gate.guardrail, gate.triage) };
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
  setStatus("Marcus is preparing the response…"); // FEATURE: MI-42 (was MI-41)
  const display = await callCapability({
    capability_slug: "channel-intelligence", intent_slug: "ci-answer-display-intent", agent_id: "marcus",
    task_context: { answer: finalAnswer.answer, citations: finalAnswer.citations, confidence_tier: finalAnswer.confidence_tier, needs_review, review_reason },
    onProgress,
  });
  // FEATURE: MI-52 -- agent_selection (the picker's reasoning) and display_format (the formatter's
  // completion) describe two sub-phases of one un-separable server round trip -- one callCapability()
  // call, one client-observable elapsed time. agent_selection's agentId is now the picker (Michelle),
  // not the requester (Marcus); durationMs: null there (not a fabricated duplicate of the real
  // number below). display_format's agentId is now the actual formatter (display.display_agent_id),
  // not the picker with a requester fallback; it keeps the one real, actually-measured durationMs.
  // secondaryAgentId dropped from both -- RoutingEventRow no longer renders a second agent.
  if (display.selection) {
    onEvent({ type: "agent_selection", agentId: display.selection.selected_by_agent_id, data: display.selection, durationMs: null });
  }
  onEvent({ type: "display_format", agentId: display.display_agent_id, data: display, durationMs: Date.now() - t0 });

  // FEATURE: AA-137 — callCapability() returns a raw string when the display/format hand-off
  // declines its tool call and responds with plain text instead (e.g. it recognizes a real problem
  // with the answer it was asked to format). Every field below would read undefined off a string,
  // rendering an empty card and silently discarding the model's own message. Falls back to showing
  // that text directly. Also closes AA-135 (display_format's confidence_tier: undefined in the
  // Pipeline Log was this same string-not-object case).
  // FEATURE: S-ARCH-STRING-CONTENT-01 (AA-135) — extends the AA-137 string fallback above to a
  // second cause: display is a genuine object (display_agent_card/display_agent_id ARE present)
  // but its real content is a string (e.g. Riley's html-display-format output, which has no schema
  // tool and terminates via plain-text model response) rather than the expected headline/body
  // object. Post-Task-1 fix, buildFinalDelegationResult() no longer spreads that string's
  // characters as numeric junk, so headline/body are genuinely absent here — same blank-card risk
  // as the pure-decline case, different cause, so the copy below is kept cause-neutral.
  if (typeof display === "string" || typeof display.content === "string") {
    const rawText = typeof display === "string" ? display : display.content;
    return {
      kind: "qa",
      headline: null, body: [{ text: rawText }], key_data_points: null,
      citations: finalAnswer.citations, confidence_tier: finalAnswer.confidence_tier,
      needs_review: true, review_reason: "Display agent output couldn't be rendered in the expected format — see message below.",
      displayAgentCard: typeof display === "string" ? null : display.display_agent_card,
      displayAgentId: typeof display === "string" ? null : display.display_agent_id,
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

async function runIntentPipeline(message, conversationContext, onEvent, setStatus, onProgress) {
  const t0 = Date.now();
  const routing = await callCapability({
    capability_slug: "channel-intelligence", intent_slug: "ci-routing-intent", agent_id: "marcus",
    task_context: { goal: message }, runtime_context: conversationContext, onProgress,
  });
  onEvent({ type: "intent_routing", agentId: "marcus", data: routing, durationMs: Date.now() - t0 });
  if (routing.intent === "escalate") {
    return { kind: "non_qa", text: ESCALATE_PLACEHOLDER };
  }
  if (routing.intent !== "qa") {
    return { kind: "hyp_entry", intent: routing.intent, extractedHypothesis: routing.extracted_hypothesis, flaggedQuestion: message };
  }
  return runQaWithQualityGate(message, conversationContext, onEvent, setStatus, onProgress);
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
async function runHypothesisTest({ hypothesis, intent, flaggedQuestion, flaggedAnswer, priorHypothesisTest, onEvent, setStatus, onProgress }) {
  const analysis = await callCapability({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-hypothesis-test-intent", agent_id: "priya",
    task_context: {
      hypothesis, intent,
      flagged_question: flaggedQuestion || "", flagged_answer: flaggedAnswer || "",
      prior_hypothesis_test: priorHypothesisTest || null,
    },
    onProgress,
  });

  const t0 = Date.now();
  const display = await callCapability({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-hypothesis-test-display-intent", agent_id: "priya",
    task_context: { supports: analysis.supports, complicates: analysis.complicates, consider: analysis.consider, confidence: analysis.confidence },
    onProgress,
  });
  // FEATURE: MI-52 -- same treatment as runQaWithQualityGate()'s Display-agent hand-off above:
  // agent_selection's agentId is the picker (Michelle), durationMs: null (not a fabricated duplicate);
  // display_format's agentId is the actual formatter (display.display_agent_id), real durationMs kept.
  // secondaryAgentId dropped from both.
  if (display.selection) {
    onEvent({ type: "agent_selection", agentId: display.selection.selected_by_agent_id, data: display.selection, durationMs: null });
  }
  onEvent({ type: "display_format", agentId: display.display_agent_id, data: display, durationMs: Date.now() - t0 });

  // FEATURE: AA-137 — same string-fallback case as runQaWithQualityGate() above, Priya's path.
  // MessageBubble's hypothesis_test case only ever renders st.headline/st.supports/.complicates/
  // .consider — a plain-text decline needs somewhere to land; headline is the only field it
  // unconditionally renders when present (line 330), so that's where the raw text goes.
  // FEATURE: S-ARCH-STRING-CONTENT-01 (AA-135) — mirrors runQaWithQualityGate()'s extended
  // fallback above: display can be a genuine object whose real content is a string (Riley's
  // html-display-format shape) rather than the pure-decline string-only case AA-137 already
  // handled.
  return typeof display === "string"
    ? { headline: display, supports: null, complicates: null, consider: null, confidence: null, display_agent_card: null, display_agent_id: null, selection: null }
    : typeof display.content === "string"
    ? { headline: display.content, supports: null, complicates: null, consider: null, confidence: null, display_agent_card: display.display_agent_card, display_agent_id: display.display_agent_id, selection: display.selection }
    : display; // final_delegation shape: {...intelligence-review-format's fields, display_agent_card, display_agent_id, selection}
}

// FEATURE: MI-51 — index/onGoodThanks added so a specific message's reviewChoice can be set
// (Good, thanks / exploring / undecided), threaded through from the parent's messages array.
function MessageBubble({ msg, index, onReview, onGoodThanks }) {
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
        {/* FEATURE: MI-42 -- same final-timeline caption as the qa bubble, msg.totalElapsedMs set
            by onSelectHypothesis(). */}
        {msg.totalElapsedMs != null && (
          <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,marginTop:4}}>
            Full Agent Routing & Answer Given in {formatElapsed(msg.totalElapsedMs)}
          </div>
        )}
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
        {/* FEATURE: MI-42 -- final-timeline caption, reuses formatElapsed() unchanged (already
            produces "47s"/"1m 30s"-style output). msg.totalElapsedMs is a simple end-start diff,
            set at the submit()/onSelectHypothesis() call sites -- mathematically identical to
            summing each displayed segment's duration since hops are strictly sequential with zero
            gaps, computed the simpler way. */}
        {msg.totalElapsedMs != null && (
          <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,marginTop:4}}>
            Full Agent Routing & Answer Given in {formatElapsed(msg.totalElapsedMs)}
          </div>
        )}
        {/* FEATURE: MI-51 — universal guided prompt, rendered on every qa message regardless of
            needs_review (was a plain "Review This Answer ->" link, shown only when self/gate-flagged).
            The flag itself is now informational only, no longer the sole gate for the choice below. */}
        {msg.needs_review && (
          <div style={{fontFamily:mono,fontSize:9.5,color:T.brassDeep,letterSpacing:0.3,marginTop:6}}>
            ⚑ Marcus flagged this — {msg.review_reason || "flagged for review"}
          </div>
        )}
        {msg.reviewChoice === "good" && (
          <div style={{marginTop:6,fontFamily:body,fontSize:11,fontStyle:"italic",color:T.muted}}>✓ Good, thanks — no further action.</div>
        )}
        {msg.reviewChoice === "exploring" && (
          <div style={{marginTop:6,fontFamily:body,fontSize:11,fontStyle:"italic",color:T.muted}}>→ Sent to Priya for deeper theories. See the Evidence tab.</div>
        )}
        {!msg.reviewChoice && (
          <div style={{marginTop:6,padding:"10px 11px",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,display:"flex",flexDirection:"column",gap:8}}>
            <div style={{fontFamily:body,fontSize:12,fontStyle:"italic",color:T.mutedDeep}}>Good with this analysis, or would you prefer deeper theories?</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <button onClick={() => onGoodThanks(index)}
                style={{textAlign:"left",background:"none",border:`1px solid ${T.line}`,color:T.mutedDeep,fontFamily:body,fontSize:11.5,padding:"7px 11px",cursor:"pointer"}}>
                Good, thanks
              </button>
              <button onClick={() => onReview(index)}
                style={{textAlign:"left",background:"none",border:`1px solid ${T.brass}`,color:T.brassDeep,fontWeight:600,fontFamily:body,fontSize:11.5,padding:"7px 11px",cursor:"pointer"}}>
                Have Priya (Forecast/Theory/Performance Expert) generate a few theories →
              </button>
            </div>
          </div>
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
      {/* FEATURE: MI-51 — mirrors the qa branch's universal 3-state guided prompt above, for the
          non-qa needs_review case (no message today reaches this with needs_review true, but this
          keeps the treatment consistent should a future non-qa kind carry the flag). */}
      {!isUser && msg.needs_review && (
        <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
          <div style={{fontFamily:mono,fontSize:9.5,color:T.brassDeep,letterSpacing:0.3}}>
            ⚑ Marcus flagged this — {msg.review_reason || "flagged for review"}
          </div>
          {msg.reviewChoice === "good" && (
            <div style={{fontFamily:body,fontSize:11,fontStyle:"italic",color:T.muted}}>✓ Good, thanks — no further action.</div>
          )}
          {msg.reviewChoice === "exploring" && (
            <div style={{fontFamily:body,fontSize:11,fontStyle:"italic",color:T.muted}}>→ Sent to Priya for deeper theories. See the Evidence tab.</div>
          )}
          {!msg.reviewChoice && (
            <div style={{padding:"10px 11px",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontFamily:body,fontSize:12,fontStyle:"italic",color:T.mutedDeep}}>Good with this analysis, or would you prefer deeper theories?</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <button onClick={() => onGoodThanks(index)}
                  style={{textAlign:"left",background:"none",border:`1px solid ${T.line}`,color:T.mutedDeep,fontFamily:body,fontSize:11.5,padding:"7px 11px",cursor:"pointer"}}>
                  Good, thanks
                </button>
                <button onClick={() => onReview(index)}
                  style={{textAlign:"left",background:"none",border:`1px solid ${T.brass}`,color:T.brassDeep,fontWeight:600,fontFamily:body,fontSize:11.5,padding:"7px 11px",cursor:"pointer"}}>
                  Have Priya (Forecast/Theory/Performance Expert) generate a few theories →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// FEATURE: MI-51 — Theory/Forecast/Correct switcher UI removed (onIntentChange kept as a prop for
// call-site parity, no longer invoked from inside this component — hypFlow.intent is still set at
// entry via enterHypothesisFlow()/runIntentPipeline() classification and passed through unchanged to
// onSelectHypothesis/onCommit, see CONTEXT item 13); guided theory selection (soft-link reveals a
// write-your-own textarea only on click, was always-visible); explicit "test this theory" invocation
// (was auto-fired on selection); honest verdict rendering (Supports/Complicates/Consider always shown,
// chart/key-data-points only when present); 2-outcome decision (Info Only/Store as Forecast, was 3);
// reframed confirmation intro line naming Nadia.

// FEATURE: MI-59 — one shared sentence source for both EvidenceColumn states, so the
// empty-state and populated-state copy can't drift apart as separate hardcoded strings.
function getEvidencePanelSentence(hypFlow) {
  // FEATURE: MI-61 — empty-state sentence tightened, trailing ellipsis added (copy-only).
  if (!hypFlow) return "Once your chat has analysis data for interaction, it will appear here...";
  const label = INTENT_LABEL[hypFlow.intent] || hypFlow.intent;
  return `${label} — Data for you to interact with your chat...`;
}

function EvidenceColumn({ hypFlow, workingStatus, onIntentChange, onSelectHypothesis, onDiscard, onCommit, onResolveConfirmation }) {
  const [customText, setCustomText] = useState("");
  const [showOwnTheory, setShowOwnTheory] = useState(false);
  const agents = useAgents();
  const nadia = agents.find(a => a.id === "nadia");

  useEffect(() => {
    if (hypFlow && hypFlow.prefillText) { setCustomText(hypFlow.prefillText); setShowOwnTheory(true); }
  }, [hypFlow && hypFlow.prefillText]);

  if (!hypFlow) {
    // FEATURE: MI-59 — informational-only empty state; the 4 dummy data-type pills that used
    // to render here (Sourced/Analysis/Source Simulation/Learned) had no click handler and no
    // tie to any flow or action (confirmed live) — removed outright, not just hidden for this
    // state. STYLE-GUIDE.md §19's shared taxonomy still has 2 other real render sites
    // (Pipeline Log confidence_tier summary, Data Sources drawer) — describeDataType() itself
    // is unchanged and still imported/used there.
    return (
      <div style={{display:"flex",flexDirection:"column",gap:14,position:"relative"}}>
        <FeatureBadge id="MI-59"/>
        <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.muted}}>Evidence</div>
        {/* FEATURE: MI-64 — duplicate compact status indicator so someone watching Evidence sees
            progress without needing to look at chat; same AgentWorkingIndicator component, unmodified. */}
        {workingStatus && <AgentWorkingIndicator key={workingStatus.startedAt} message={workingStatus.message} startedAt={workingStatus.startedAt} turnStartedAt={workingStatus.turnStartedAt} expectation={workingStatus.expectation}/>}
        <div style={{background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:16}}>
          <div style={{fontFamily:body,fontSize:12,color:T.muted}}>
            {getEvidencePanelSentence(hypFlow)}
          </div>
        </div>
      </div>
    );
  }

  const st = hypFlow.hypothesisTest;

  return (
    // FEATURE: MI-54 — bounded to the grid row height with an internal scroll region, matching
    // InteractColumn's existing pattern (flex:1/minHeight:0 outer, overflow:hidden card,
    // overflowY:"auto" inner content div) -- action buttons/ConfirmationCard now scroll into view
    // inside the card instead of growing the whole page past the fold.
    <div style={{display:"flex",flexDirection:"column",gap:14,minHeight:0,flex:1,position:"relative"}}>
      <FeatureBadge id="MI-59"/>
      {/* FEATURE: MI-59 — header stays "Evidence" in both states, never switches to "Theory Evidence" */}
      <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.muted}}>Evidence</div>
      {/* FEATURE: MI-64 — duplicate compact status indicator, same component as InteractColumn's */}
      {workingStatus && <AgentWorkingIndicator key={workingStatus.startedAt} message={workingStatus.message} startedAt={workingStatus.startedAt} turnStartedAt={workingStatus.turnStartedAt} expectation={workingStatus.expectation}/>}
      <div style={{background:T.cardAlt,border:`1px solid ${T.lineSoft}`,display:"flex",flexDirection:"column",flex:1,minHeight:0,overflow:"hidden"}}>
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:14,overflowY:"auto",flex:1,minHeight:0}}>

        {/* FEATURE: MI-59 — shared sentence, intent-prefixed. The MI-59 kickoff doc specced this as
            rendering "above the intent-toggle buttons," but MI-51 already removed that button row
            entirely (onIntentChange is kept only for call-site parity, no longer invoked here — see
            the MI-51 comment just below) — there is no toggle row left to anchor to, so this renders
            directly under the header instead, in the same position the toggle row used to occupy. */}
        <div style={{fontFamily:body,fontSize:12,color:T.muted}}>
          {getEvidencePanelSentence(hypFlow)}
        </div>

        {/* FEATURE: MI-51 — Theory/Forecast/Correct switcher REMOVED. hypFlow.intent is still set at
            entry (enterHypothesisFlow, direct-typed classification via runIntentPipeline) and still
            passed through unchanged to onSelectHypothesis/onCommit; it is simply no longer a visible,
            switchable control. */}

        {hypFlow.stage === "generating" && (
          <div style={{padding:12,background:T.card,border:`1px dashed ${T.lineSoft}`,fontFamily:body,fontSize:11.5,lineHeight:1.6,color:T.mutedDeep,fontStyle:"italic"}}>
            Priya is generating theories from the Data Room. Live progress is shown below.
          </div>
        )}

        {hypFlow.stage === "choosing" && hypFlow.candidates && (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Review or Select a theory to include in the analysis</div>
            {hypFlow.candidates.map(h => (
              <div key={h.id} onClick={() => { setShowOwnTheory(false); onSelectHypothesis(h.text); }}
                style={{padding:"9px 11px",background:T.card,border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:12,color:T.ink,cursor:"pointer",display:"flex",gap:8}}>
                <span style={{fontFamily:mono,fontSize:10,color:T.brassDeep,flexShrink:0}}>{h.id}</span>
                <span>{h.text}</span>
              </div>
            ))}
            {showOwnTheory ? (
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <textarea rows={2} value={customText} onChange={e => setCustomText(e.target.value)}
                  placeholder="Write your own explanation"
                  style={{padding:"9px 11px",border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:12,background:T.card,color:T.ink,resize:"vertical"}}/>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={() => { if (customText.trim()) { onSelectHypothesis(customText.trim()); setCustomText(""); setShowOwnTheory(false); } }}
                    disabled={!customText.trim()}
                    style={{padding:"6px 12px",background:T.navy,color:T.card,border:"none",fontFamily:body,fontSize:11.5,cursor:customText.trim()?"pointer":"default"}}>
                    Save
                  </button>
                  <button onClick={() => { setShowOwnTheory(false); setCustomText(""); }}
                    style={{padding:"6px 12px",background:"transparent",color:T.muted,border:`1px solid ${T.line}`,fontFamily:body,fontSize:11.5,cursor:"pointer"}}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowOwnTheory(true)}
                style={{alignSelf:"flex-start",background:"none",border:"none",padding:0,fontFamily:body,fontSize:11.5,fontStyle:"italic",color:T.brassDeep,textDecoration:"underline",cursor:"pointer"}}>
                ...or write your own explanation
              </button>
            )}
          </div>
        )}

        {hypFlow.stage === "ready" && hypFlow.chosenText && (
          <>
            <div style={{background:T.card,borderLeft:`3px solid ${T.brass}`,padding:"9px 12px"}}>
              <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4}}>Theory selected</div>
              <p style={{margin:0,fontFamily:body,fontSize:12,lineHeight:1.5,color:T.ink,fontStyle:"italic"}}>{hypFlow.chosenText}</p>
            </div>
            <button onClick={() => onSelectHypothesis(hypFlow.chosenText, { startTest:true })}
              style={{alignSelf:"flex-start",background:"none",border:`1px solid ${T.brass}`,color:T.brassDeep,fontWeight:600,fontFamily:body,fontSize:12,padding:"9px 12px",cursor:"pointer"}}>
              Have Priya (Forecast/Theory/Performance Expert) test this theory →
            </button>
          </>
        )}

        {hypFlow.stage === "testing" && (
          <div style={{padding:12,background:T.card,border:`1px dashed ${T.lineSoft}`,fontFamily:body,fontSize:11.5,lineHeight:1.6,color:T.mutedDeep,fontStyle:"italic"}}>
            Priya is testing this theory against the evidence. Live progress is shown below.
          </div>
        )}

        {st && hypFlow.stage === "result" && (
          <>
            {st.override_warning && (
              <div style={{padding:"9px 11px",background:"#f3e6cc",border:`1px solid ${T.brass}`,fontFamily:body,fontSize:11,color:T.brassDeep}}>
                ⚑ AI flagged a complicating factor not fully resolved by this theory. Committing will log this as an override.
              </div>
            )}

            {/* FEATURE: MI-51 — honest verdict: Supports/Complicates/Consider always render when
                present (mirrors MessageBubble's existing hypothesis_test rendering); chart/key data
                points below render only when present, captioned as agent-judgment-dependent. */}
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {st.supports && (<div><div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.moss,marginBottom:3}}>✓ Supports</div><p style={{margin:0,fontFamily:body,fontSize:11.5,lineHeight:1.5,color:T.ink}}>{st.supports.text || st.supports}</p></div>)}
              {st.complicates && (<div><div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.flag,marginBottom:3}}>⚠ Complicates</div><p style={{margin:0,fontFamily:body,fontSize:11.5,lineHeight:1.5,color:T.ink}}>{st.complicates.text || st.complicates}</p></div>)}
              {st.consider && (<div><div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.mutedDeep,marginBottom:3}}>→ Consider also</div><p style={{margin:0,fontFamily:body,fontSize:11.5,lineHeight:1.5,color:T.ink}}>{st.consider.text || st.consider}</p></div>)}
            </div>

            {st.visualization && (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Current vs. Projected <span style={{textTransform:"none",fontStyle:"italic",fontWeight:400}}>— shown when Priya judges it useful, not every time</span></div>
                <ChartRenderer type={st.visualization.chart_type} data={st.visualization.chart_data} caption={st.visualization.caption}/>
              </div>
            )}
            {Array.isArray(st.key_data_points) && st.key_data_points.length > 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Key Data Points <span style={{textTransform:"none",fontStyle:"italic",fontWeight:400}}>— shown when Priya judges it useful, not every time</span></div>
                {st.key_data_points.map((d, i) => (
                  <div key={i} style={{fontFamily:body,fontSize:11,color:T.ink}}>
                    <b>{d.label}:</b> {d.value} <span style={{color:T.muted,fontFamily:mono,fontSize:9.5}}>· {d.source} · {d.confidence}</span>
                  </div>
                ))}
              </div>
            )}

            {/* FEATURE: MI-51 — end decision collapses from 3 outcomes (Discard/Track as Assumption/
                Make Permanent) to 2 (Info Only/Store as Forecast); both backend calls (Elena's
                reasoner-intent, unconditional; Nadia's data-patch-intent, always confirmation-gated)
                are unchanged underneath, see onCommit()/onDiscard() below. */}
            {!hypFlow.confirmation && (
              <>
                <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Info only, or store this as a forecast?</div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={onDiscard}
                    style={{flex:1,padding:"8px 6px",background:"transparent",border:`1px solid ${T.line}`,fontFamily:body,fontSize:11,color:T.ink,cursor:"pointer"}}>
                    Info Only
                  </button>
                  <button onClick={() => onCommit()}
                    style={{flex:1,padding:"8px 6px",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:11,color:T.ink,cursor:"pointer"}}>
                    Store as Forecast
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {hypFlow.confirmation && (
          <>
            {/* FEATURE: MI-51 — plain intro line above the unchanged ConfirmationCard, so this reads
                as reviewing the actual save (Nadia's real data-patch-intent draft), not a surprise
                second decision. */}
            <div style={{fontFamily:body,fontSize:12,fontStyle:"italic",color:T.mutedDeep}}>
              Nadia (Data Expert) drafted this Data Room entry — review it before it's saved:
            </div>
            <ConfirmationCard
              agent={nadia}
              proposedAction={hypFlow.confirmation.proposed_action}
              critique={hypFlow.confirmation.critique}
              onResolve={onResolveConfirmation}
            />
          </>
        )}
        </div>
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
const PROPOSED_MI_AGENT_IDS = ["marcus", "priya", "nadia", "owen", "sam", "elena", "michelle", "alex", "dan", "eleanor", "riley"];

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
    "html-display",
  ],
  featurePrefixes: [
    "channel-intelligence:", "hypothesis-evaluation:", "quality-gate:", "pipeline-triage:",
    "project-manager:agent-selection-intent:",
    "screen-controls:qa-answer-format:", "screen-controls:intelligence-review-format:",
    "html-display:",
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

// FEATURE: MI-43 — shared row renderer for the Agents drawer's per-agent latency stats
// (Baseline, byKind, AA-149 byModel sub-rows). Fixed-width label column (ellipsis-truncated)
// + fixed-width right-aligned leading number is what makes the decimal point/units digit land
// in the same horizontal position across rows, regardless of label length or 1-vs-2-digit
// seconds values — replaces the old justifyContent:"space-between" full-string right-justify,
// which right-aligned the whole string and never actually lined up the numbers (John, 2026-07-09).
function LatencyStatRow({ label, valueNumber, restText, indent, fontSize }) {
  return (
    <div style={{display:"flex",gap:6,fontFamily:mono,fontSize:fontSize ?? 9,color:indent?T.mutedDeep:T.muted,paddingLeft:indent?10:0}}>
      <span style={{width:110,flexShrink:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{label}</span>
      <span style={{display:"flex",color:T.navy,fontWeight:700}}>
        <span style={{display:"inline-block",minWidth:34,textAlign:"right",flexShrink:0}}>{valueNumber}</span>
        <span>{restText}</span>
      </span>
    </div>
  );
}

// FEATURE: MI-31 — rolls a per-agent speed-baseline-test summary (already deduped by
// useAgentActivitySummary()'s classifyRow(), same as any other byKind data) into a single blended
// number for the "Baseline" row. Reuses stats.byKind rather than averaging raw rows so the
// wrapper/agent-turn dedup fix (MI-30/Task 2) applies here too. Returns null when there is no
// baseline data at all (e.g. Dan Bingham) so the caller can omit the row entirely.
function rollupBaseline(stats) {
  if (!stats?.byKind) return null;
  const kinds = Object.values(stats.byKind).filter(k => k.latencyCount > 0);
  if (kinds.length === 0) return null;
  const totalLatency = kinds.reduce((sum, k) => sum + k.totalLatency, 0);
  const latencyCount = kinds.reduce((sum, k) => sum + k.latencyCount, 0);
  const maxLatency = Math.max(...kinds.map(k => k.maxLatency));
  const calls = kinds.reduce((sum, k) => sum + k.calls, 0);
  return { avgLatency: Math.round(totalLatency / latencyCount), maxLatency, calls };
}

// FEATURE: MI-45 — extracted from AuditColumn's former inline .map() block so the exact same
// per-event row renders in both desktop's Agent Routing Drawer and mobile's pinned Agent Routing
// feed (STYLE-GUIDE.md §21) — one render path, two shells around it (Category M).
// FEATURE: MI-52 — secondary/arrow/AgentAvatar-for-secondary block removed entirely (Task 1, Design
// Rule: "every visible row names exactly one agent"). primary.name swapped to firstNameFor() so the
// header matches the chat status line's existing first-name-only treatment (describeDelegationEvent,
// above); primary.role stays unchanged.
function RoutingEventRow({ evt, agentById }) {
  const { capability, summary, color } = describePipelineEvent(evt);
  const svc = SERVICE_LABEL[capability];
  // FEATURE: AI-50c — prefer real evt.data.patterns_used over the static SERVICE_LABEL string;
  // fall back to the static string only when no real value is present (event types with no
  // capability response at all — delegation/delegation_return placeholders, error).
  const realPatterns = Array.isArray(evt.data?.patterns_used) ? evt.data.patterns_used : null;
  const patternLabel = realPatterns && realPatterns.length > 0
    ? realPatterns.map(slug => PATTERN_NAME[slug] || slug).join(', ')
    : svc?.patterns;
  const primary = agentById(evt.agentId);
  return (
    <div style={{borderLeft:`3px solid ${color}`,paddingLeft:10,display:"flex",flexDirection:"column",gap:4}}>
      <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:6}}>
        <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{evt.id + 1}</span>
        {primary && <AgentAvatar who={primary.id} size={20}/>}
        <span style={{fontFamily:body,fontSize:11.5,fontWeight:600,color:T.ink}}>{primary ? firstNameFor(evt.agentId, agentById) : evt.agentId}</span>
        <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{primary ? primary.role : ""}</span>
      </div>
      {(svc || patternLabel) && <div style={{fontFamily:mono,fontSize:9,color:T.muted}}>{svc?.name}{svc?.name && patternLabel ? ' · ' : ''}{patternLabel}</div>}
      <div style={{fontFamily:body,fontSize:11.5,color:T.ink}}>{summary}{evt.durationMs != null ? ` · ${formatDuration(evt.durationMs)}` : ""}</div>
    </div>
  );
}

// FEATURE: MI-45 — extracted from AuditColumn's former inline body: the four non-routing drawers
// (Agents, Data Sources, Analysis, Agent Reasoning) now render from one shared function, called by
// desktop's AuditColumn (right after its own Agent Routing Drawer) and mobile's Activity overlay
// (STYLE-GUIDE.md §21, "Activity" carries Audit's other four drawers) — byte-identical drawer
// content, sourced from the same function, per the kickoff's Task 2b requirement. learned/
// dataSources/baselineActivity are computed here via the same hooks AuditColumn used to call
// directly, so both call sites need only pass the two values (agents, agentActivity) that
// genuinely differ per caller, rather than threading three additional hook results through props
// for a single shared consumer.
function AuditDrawersBody({ agents, agentActivity }) {
  const learned = useLearnedContext();
  const dataSources = useDataSources();
  // FEATURE: MI-31 — separate hook instance (own useState/useEffect), scoped to the
  // 'speed-baseline-test' tenant, unfiltered by MI_LOOP_SCOPE (scope: null) since those rows are
  // already fully isolated deliberate test data, not production MI-loop traffic.
  const baselineActivity = useAgentActivitySummary(PROPOSED_MI_AGENT_IDS, null, 'speed-baseline-test');
  const agentById = (id) => agents.find(a => a.id === id);
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
    <>
      <Drawer title="Agents" count={`${activeIds.length} active · ${potentialIds.length} potential`}>
        {activeIds.map(id => {
          const agent = agentById(id);
          if (!agent) return null;
          const stats = agentActivity[id];
          const baseline = rollupBaseline(baselineActivity[id]);
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
              {(baseline || (stats?.byKind && Object.keys(stats.byKind).length > 0)) && (
                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                  {baseline && (
                    <LatencyStatRow
                      label="Baseline"
                      valueNumber={(baseline.avgLatency/1000).toFixed(1)}
                      restText={`s avg (${baseline.calls} call${baseline.calls === 1 ? "" : "s"}, max ${(baseline.maxLatency/1000).toFixed(1)}s)`}
                    />
                  )}
                  {stats?.byKind && Object.entries(stats.byKind)
                    .sort((a, b) => (b[1].avgLatency || 0) - (a[1].avgLatency || 0))
                    .map(([kind, k]) => (
                      <div key={kind} style={{display:"flex",flexDirection:"column",gap:2}}>
                        <LatencyStatRow
                          label={formatKindLabel(kind)}
                          valueNumber={k.avgLatency != null ? (k.avgLatency/1000).toFixed(1) : "—"}
                          restText={`${k.avgLatency != null ? "s avg" : ""} (${k.calls} call${k.calls === 1 ? "" : "s"}${k.latencyCount > 1 ? `, max ${(k.maxLatency/1000).toFixed(1)}s` : ""})`}
                        />
                        {/* FEATURE: AA-149 -- per-model sub-rows, shown only when a kind has genuinely used more
                            than one model (true today only for ci-answer-intent post-Haiku-switch during any
                            overlap window, and for any future model experiment on any intent). Every other kind
                            in the drawer today has exactly one model and renders with zero visual change. */}
                        {k.byModel && Object.keys(k.byModel).length > 1 &&
                          Object.entries(k.byModel)
                            .sort((a, b) => (b[1].avgLatency || 0) - (a[1].avgLatency || 0))
                            .map(([model, km]) => (
                              <LatencyStatRow
                                key={model}
                                label={`↪ ${model}`}
                                valueNumber={km.avgLatency != null ? (km.avgLatency/1000).toFixed(1) : "—"}
                                restText={`${km.avgLatency != null ? "s avg" : ""} (${km.calls} call${km.calls === 1 ? "" : "s"})`}
                                indent={true}
                                fontSize={8}
                              />
                            ))
                        }
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
    </>
  );
}

// FEATURE: MI-04/MI-01d — Pipeline Log: real event log driven by actual agent calls (Intent
// Routing, Q&A Answer, Proofreader pass/block/revise incl. real retry hand-off, AI - Hypothesis Test,
// Memory Consolidation, Data Integrity Patch proposal/resolution, Failure Triage).
// FEATURE: MI-45 — slimmed to the Agent Routing drawer only (RoutingEventRow, shared with mobile's
// pinned feed) plus AuditDrawersBody for the remaining four drawers — net-zero visual change,
// extraction only (STYLE-GUIDE.md §21).
function AuditColumn({ events, agentActivity }) {
  const agents = useAgents();
  const agentById = (id) => agents.find(a => a.id === id);
  const ordered = [...events].reverse(); // newest event on top, confirmed with John

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,position:"relative"}}>
      <FeatureBadge id="MI-17"/>
      <FeatureBadge id="MI-06"/>
      <FeatureBadge id="MI-18"/>
      <FeatureBadge id="MI-15"/>
      <FeatureBadge id="MI-21"/>
      <FeatureBadge id="MI-22"/>
      <FeatureBadge id="MI-30"/>
      <FeatureBadge id="MI-31"/>
      <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.muted}}>Audit</div>
      {/* FEATURE: MI-55 — resizable opt-in, Agent Routing only */}
      <Drawer title="Agent Routing" count={`${ordered.length} event${ordered.length === 1 ? "" : "s"}`} defaultOpen={true} maxHeight={280} resizable>
        {ordered.length === 0 ? (
          <div style={{fontFamily:body,fontSize:12,color:T.muted}}>
            Real agent-call events appear here as the conversation runs. About Channel Sales Intelligence and Demo Reset controls ship in S-MARKET-INTEL-01d / 03.
          </div>
        ) : ordered.map(evt => <RoutingEventRow key={evt.id} evt={evt} agentById={agentById}/>)}
      </Drawer>
      <AuditDrawersBody agents={agents} agentActivity={agentActivity}/>
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

// FEATURE: MI-45 — noMinHeight is an additive, default-false prop; desktop's call site never
// passes it, so minHeight stays exactly 420 there (zero desktop change). Originally passed by
// MobileBody's non-bare InteractColumn call so the chat card could shrink below 420px on a short
// mobile viewport instead of squeezing the pinned Agent Routing feed toward zero height.
// FEATURE: MI-51 — MobileBody now calls InteractColumn with `bare` instead (Task 1d), which never
// applies the 420px minHeight in the first place — noMinHeight is unused by any call site as of
// this session, kept on the signature for any future non-bare-but-height-constrained caller.
// FEATURE: MI-51 — bare prop added: when true (mobile's Chat tab), renders only the message-scroll
// region + its own input row, no outer bordered card/avatar-name-caption header/AgentWorkingIndicator
// (MobileBody renders the permanent status strip and input/Clear separately, tab-independent). When
// bare is falsy (every pre-existing call site — desktop's grid), behavior is byte-identical to before.
function InteractColumn({ messages, loading, workingStatus, onSubmit, onReview, onGoodThanks, onClear, noMinHeight, bare }) {
  const agents = useAgents();
  const marcus = agents.find(a => a.id === "marcus");
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  // FEATURE: MI-64 — tracks whether the user has manually scrolled away from the bottom, same
  // pattern as FetchContext.jsx's fetchUserScrolledRef/scrollToLatest (Agent Fetch feed) — auto-scroll
  // below respects this so a user reading earlier history isn't yanked back down.
  const userScrolledRef = useRef(false);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    userScrolledRef.current = !atBottom;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolledRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, workingStatus]);

  const submit = (text) => {
    const clean = (text || "").trim();
    if (!clean || loading || !marcus) return;
    setInput("");
    onSubmit(clean);
  };

  const messageList = (
    <div ref={scrollRef} onScroll={handleScroll} style={{flex:1,overflowY:"auto",padding:16,minHeight:0}}>
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
          <div style={{marginTop:8}}>
            {/* FEATURE: MI-60 — 4th seed box, collapsed by default, capped/scrolling internally */}
            <Drawer title="Browse 20 more example questions" count={MORE_EXAMPLE_QUESTIONS.length} maxHeight={220}>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {MORE_EXAMPLE_QUESTIONS.map(q => (
                  <button key={q.id} onClick={() => submit(q.label)} disabled={loading}
                    style={{textAlign:"left",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:"10px 12px",fontFamily:body,fontSize:12.5,color:T.ink,cursor:loading?"default":"pointer"}}>
                    {q.label}
                  </button>
                ))}
              </div>
            </Drawer>
          </div>
        </div>
      ) : (
        messages.map((m, i) => <MessageBubble key={i} msg={m} index={i} onReview={onReview} onGoodThanks={onGoodThanks}/>)
      )}
      {!bare && workingStatus && <AgentWorkingIndicator key={workingStatus.startedAt} message={workingStatus.message} startedAt={workingStatus.startedAt} turnStartedAt={workingStatus.turnStartedAt} expectation={workingStatus.expectation}/>}
    </div>
  );

  // FEATURE: MI-51 — bare mode renders ONLY the message list, no embedded input row: the question
  // box/Send is now a single permanent element owned by MobileBody (Task 1d), shown regardless of
  // active tab, not duplicated per-tab. (Live-verified this session: rendering an input row here too
  // produced two stacked "Ask about channel performance…" boxes on the Chat tab — fixed by dropping
  // it here entirely; `input`/`setInput`/`submit` above are unused in this branch as a result, kept
  // on the component for the non-bare branch below.)
  if (bare) {
    return (
      <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
        {messageList}
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,minHeight:0,flex:1}}>
      <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.brass}}>Interact</div>
      <div style={{background:"#fffdf8",border:`1px solid ${T.line}`,borderRadius:3,position:"relative",display:"flex",flexDirection:"column",flex:1,minHeight: noMinHeight ? 0 : 420}}>
        <Corners/>
        <FeatureBadge id="MI-64"/>
        <div style={{padding:"13px 16px",borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",gap:10}}>
          {marcus && <AgentAvatar who={marcus.id} size={28}/>}
          <div>
            <div style={{fontFamily:display,fontSize:13,fontWeight:600,color:T.navy}}>{marcus ? marcus.name : "GEO CSO Expert"}</div>
            <div style={{fontFamily:mono,fontSize:9.5,color:T.muted}}>Channel Intelligence · Q&A · Theory · Forecast · Correct · Escalate</div>
          </div>
        </div>
        {messageList}
        <div style={{padding:"10px 14px",borderTop:`1px solid ${T.line}`,display:"flex",alignItems:"center",gap:8}}>
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
          {/* FEATURE: MI-57 — desktop Clear control, style reused verbatim from MobileBody's Clear
              link (~line 1705, MI-51/MI-56) — same font/size/color/casing/cursor, no new visual
              pattern. Wired to the same onClear handler MobileBody already uses; reset semantics
              (messages/hypFlow/workingStatus, no confirm dialog) unchanged. */}
          <button onClick={onClear} style={{background:"none",border:"none",color:T.muted,fontFamily:mono,fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",cursor:"pointer",flexShrink:0,padding:"0 2px"}}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

// FEATURE: MI-51 — mobile composition (STYLE-GUIDE.md §21, superseding S-MI-45's overlay pattern):
// Chat and Evidence are a permanent tab bar (Evidence disabled until a theory flow is active, then
// flashes on unseen content — symmetric with Chat flashing when a new answer lands while on Evidence).
// Elapsed/expect/agent-status is a permanent strip under either tab (fixes the 30s dead-air bug: the
// one progress indicator that existed lived inside chat's scrollback, invisible the instant the old
// Evidence overlay covered it). Question box/Send/Clear are permanent, reachable regardless of tab.
// Agent Routing feed stays pinned/bottom, unchanged content/behavior (MI-50's scroll-hint relocated,
// not reimplemented). "Agent & Data Info" (renamed from "Activity") moves to the page-title row —
// showAgentInfo/setShowAgentInfo are now owned by the parent (Task 1a) so the trigger button can live
// there instead of inside this component.
function MobileBody({ messages, loading, workingStatus, onSubmit, onReview, onGoodThanks, onClear, hypFlow, onIntentChange, onSelectHypothesis, onDiscard, onCommit, onResolveConfirmation, events, agentActivity, showAgentInfo, setShowAgentInfo }) {
  const [mobileTab, setMobileTab] = useState("chat");
  const [chatUnseen, setChatUnseen] = useState(false);
  const [evidenceUnseen, setEvidenceUnseen] = useState(false);
  const agents = useAgents();
  const agentById = (id) => agents.find(a => a.id === id);
  const hasActiveFlow = !!hypFlow;
  const ordered = [...events].reverse();

  const prevMsgCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMsgCount.current && mobileTab !== "chat") setChatUnseen(true);
    prevMsgCount.current = messages.length;
  }, [messages.length, mobileTab]);

  const prevStage = useRef(hypFlow?.stage);
  useEffect(() => {
    if (hypFlow && hypFlow.stage !== prevStage.current && mobileTab !== "evidence") setEvidenceUnseen(true);
    prevStage.current = hypFlow?.stage;
  }, [hypFlow?.stage, mobileTab]);

  // FEATURE: MI-51 — Evidence auto-activates (switches to the active tab) the moment a theory flow
  // starts (hasActiveFlow false -> true, i.e. right when the user clicks "Have Priya... generate a
  // few theories ->"), so the live elapsed/expect status strip is immediately visible without an
  // extra manual tap. This is a one-time switch at flow start, not on every stage change — the user
  // can freely navigate back to Chat mid-generation (status strip stays visible either way, Evidence
  // flashes via the effect above once new content is ready).
  const prevHasFlow = useRef(hasActiveFlow);
  useEffect(() => {
    if (hasActiveFlow && !prevHasFlow.current) {
      setMobileTab("evidence");
      setEvidenceUnseen(false);
    }
    prevHasFlow.current = hasActiveFlow;
  }, [hasActiveFlow]);

  const selectTab = (tab) => {
    if (tab === "evidence" && !hasActiveFlow) return;
    setMobileTab(tab);
    if (tab === "chat") setChatUnseen(false);
    if (tab === "evidence") setEvidenceUnseen(false);
  };

  // FEATURE: MI-50 — bottom-edge scroll affordance for the pinned Agent Routing feed.
  // UNCHANGED from current dev — do not re-implement, only relocate within the new shell.
  const [routingCanScrollMore, setRoutingCanScrollMore] = useState(false);
  const routingFeedRef = useRef(null);
  const checkRoutingScroll = () => {
    const el = routingFeedRef.current;
    if (!el) return;
    setRoutingCanScrollMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  };
  useEffect(() => { checkRoutingScroll(); }, [ordered.length]);

  const tabStyle = (active, disabled) => ({
    flex:1, padding:"9px 6px", fontFamily:mono, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em",
    background: active ? "rgba(182,135,58,.07)" : "transparent",
    color: disabled ? T.line : (active ? T.navy : T.muted),
    border:"none", borderBottom:`2.5px solid ${active ? T.brass : "transparent"}`,
    cursor: disabled ? "not-allowed" : "pointer",
    display:"flex", alignItems:"center", justifyContent:"center", gap:6,
  });
  const flashDot = { width:5, height:5, borderRadius:"50%", background:T.brass, animation:"aiBlink 1.3s ease-in-out infinite" };
  const overlayHeadStyle = {flexShrink:0,background:T.navy,color:T.card,padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`3px solid ${T.brass}`};
  const backBtnStyle = {fontFamily:mono,fontSize:10,letterSpacing:"0.04em",textTransform:"uppercase",color:T.brassLight,border:"1px solid rgba(228,199,134,.4)",background:"transparent",padding:"5px 10px",cursor:"pointer"};

  return (
    <div style={{position:"relative",flex:1,minHeight:0,display:"flex",flexDirection:"column",gap:8}}>

      <div style={{display:"flex",flexShrink:0,background:T.card,borderBottom:`1px solid ${T.line}`}}>
        <button onClick={() => selectTab("chat")} style={tabStyle(mobileTab==="chat", false)}>
          Chat {chatUnseen && mobileTab!=="chat" && <span style={flashDot}/>}
        </button>
        <button onClick={() => selectTab("evidence")} style={tabStyle(mobileTab==="evidence", !hasActiveFlow)}>
          Evidence {hasActiveFlow && evidenceUnseen && mobileTab!=="evidence" && <span style={flashDot}/>}
        </button>
      </div>

      <div style={{flex:1,minHeight:0,display:"flex",flexDirection:"column"}}>
        {mobileTab === "chat" ? (
          <InteractColumn messages={messages} loading={loading} onSubmit={onSubmit} onReview={onReview} onGoodThanks={onGoodThanks} bare/>
        ) : (
          <div style={{flex:1,minHeight:0,overflowY:"auto",padding:14}}>
            <EvidenceColumn hypFlow={hypFlow} onIntentChange={onIntentChange} onSelectHypothesis={onSelectHypothesis} onDiscard={onDiscard} onCommit={onCommit} onResolveConfirmation={onResolveConfirmation}/>
          </div>
        )}
      </div>

      {workingStatus && (
        <div style={{flexShrink:0,padding:"8px 14px",background:"#fbf6ea",borderTop:`1px solid ${T.lineSoft}`}}>
          <AgentWorkingIndicator key={workingStatus.startedAt} message={workingStatus.message} startedAt={workingStatus.startedAt} turnStartedAt={workingStatus.turnStartedAt} expectation={workingStatus.expectation}/>
        </div>
      )}

      {/* FEATURE: MI-56 — merged input+Send+Clear into one row (was two stacked rows, Clear read as a
          stray orphaned element on its own near-empty row underneath). See STYLE-GUIDE.md §21's
          2026-07-14 MI-56 amendment: divider does double duty as visual grouping + accidental-tap
          mitigation for the no-confirm-dialog Clear action (that S-MI-51 decision unchanged here). */}
      <div style={{flexShrink:0,padding:"9px 14px 8px",display:"flex",alignItems:"center",gap:8,background:T.card,borderTop:`1px solid ${T.line}`}}>
        <input id="mobile-chat-input" placeholder="Ask about channel performance…" disabled={loading}
          onKeyDown={e => { if (e.key === "Enter") { onSubmit(e.target.value); e.target.value = ""; } }}
          style={{flex:1,padding:"9px 12px",border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:13,background:T.card,color:T.ink}}/>
        <button onClick={() => { const el = document.getElementById("mobile-chat-input"); onSubmit(el.value); el.value = ""; }} disabled={loading}
          style={{padding:"9px 16px",background:T.navy,color:T.card,border:"none",fontFamily:body,fontSize:13,cursor:loading?"default":"pointer",flexShrink:0}}>
          Send
        </button>
        <div style={{width:1,alignSelf:"stretch",background:T.lineSoft,flexShrink:0}}/>
        <button onClick={onClear} style={{background:"none",border:"none",color:T.muted,fontFamily:mono,fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",cursor:"pointer",flexShrink:0,padding:"0 2px"}}>
          Clear
        </button>
      </div>

      <div style={{flexShrink:0,height:118,background:T.cardAlt,border:`1px solid ${T.lineSoft}`,display:"flex",flexDirection:"column",position:"relative"}}>
        <div style={{flexShrink:0,padding:"6px 10px",display:"flex",alignItems:"center",gap:6,borderBottom:`1px solid ${T.lineSoft}`}}>
          <span style={{width:5,height:5,borderRadius:"50%",background:T.brass,animation:"aiBlink 1.3s ease-in-out infinite"}}/>
          <span style={{fontFamily:mono,fontSize:8.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:T.muted}}>Agent Routing · Live</span>
        </div>
        <div ref={routingFeedRef} onScroll={checkRoutingScroll} style={{flex:1,minHeight:0,overflowY:"auto",padding:"7px 10px",display:"flex",flexDirection:"column",gap:6}}>
          {ordered.length === 0
            ? <div style={{fontFamily:body,fontSize:11,color:T.muted}}>Real agent-call events appear here as the conversation runs.</div>
            : ordered.map(evt => <RoutingEventRow key={evt.id} evt={evt} agentById={agentById}/>)}
        </div>
        {routingCanScrollMore && (
          <div style={{position:"absolute",left:0,right:0,bottom:0,height:26,background:`linear-gradient(to bottom, transparent, ${T.cardAlt} 70%)`,display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:2,pointerEvents:"none"}}>
            <span style={{fontFamily:mono,fontSize:10,color:T.brass,animation:"dbounce 1.4s ease-in-out infinite"}}>⌄</span>
          </div>
        )}
      </div>

      {showAgentInfo && (
        <div style={{position:"absolute",inset:0,background:T.paperDeep,zIndex:5,display:"flex",flexDirection:"column"}}>
          <div style={overlayHeadStyle}>
            <span style={{fontFamily:display,fontSize:15,fontWeight:600}}>Agent &amp; Data Info</span>
            <button onClick={()=>setShowAgentInfo(false)} style={backBtnStyle}>← Back to Chat</button>
          </div>
          <div style={{flex:1,minHeight:0,overflowY:"auto",padding:14}}>
            <AuditDrawersBody agentActivity={agentActivity} agents={agents}/>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarketIntelligenceScreen() {
  const isMobile = useIsMobile(); // FEATURE: MI-45
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hypFlow, setHypFlow] = useState(null);
  const [pipelineEvents, setPipelineEvents] = useState([]);
  const [workingStatus, setWorkingStatus] = useState(null); // { message, startedAt, turnStartedAt, expectation, kind } | null
  // FEATURE: MI-51 — showAgentInfo lifted here (was MobileBody-local showActivity) so the trigger
  // button can live in the shared page-title block (Task 1b) instead of inside MobileBody.
  const [showAgentInfo, setShowAgentInfo] = useState(false);
  // FEATURE: MI-35 — lifted from AuditColumn so it's available at every setWorkingStatus( call
  // site below, not just inside AuditColumn.
  const agentActivity = useAgentActivitySummary(PROPOSED_MI_AGENT_IDS, MI_LOOP_SCOPE);
  const agents = useAgents(); // FEATURE: MI-42 -- needed here for describeDelegationEvent()'s name resolution

  // FEATURE: MI-51 — Clear resets chat + any active flow back to the seed-question empty state,
  // same end state as a page refresh, no confirm dialog (this session's explicit design decision).
  const onClear = () => {
    setMessages([]);
    setHypFlow(null);
    setWorkingStatus(null);
  };

  // FEATURE: MI-42 -- one shared status-setter for both MI-41's macro-hop swaps (explicit calls
  // below) and this session's live micro-hop delegation events (via onDelegationProgress, forwarded
  // into every callCapability() call as onProgress) -- both write the same workingStatus, so they
  // can never drift into two different timers.
  const setStatus = (message, { expectation, kind = 'scripted' } = {}) =>
    setWorkingStatus(prev => ({
      message,
      startedAt: Date.now(),
      turnStartedAt: prev?.turnStartedAt ?? Date.now(),
      expectation: expectation !== undefined ? expectation : (prev?.expectation ?? null),
      kind,
    }));
  // FEATURE: MI-52 -- tracks still-pending in-flight delegation/delegation_return rows, keyed by the
  // agent expected to produce the real completion event (correlation's own awaitingAgentId). Map<
  // awaitingAgentId, { id, key } >. Not React state -- purely an internal bookkeeping side-table for
  // logEvent's own replace-in-place check below, never read for rendering.
  const pendingDelegationsRef = useRef(new Map());

  // FEATURE: MI-52 -- logEvent gained a second, additive call shape: logEvent(evt, { replaces }),
  // where replaces = { key, awaitingAgentId }. When supplied (only onDelegationProgress does this,
  // below), the pushed row is registered as still-pending under that key instead of being final.
  // Every other, pre-existing call site keeps calling logEvent(evt) with no options -- unchanged --
  // but that plain path now also checks whether its own evt.agentId satisfies a still-pending row's
  // awaitingAgentId; if so, it splices/updates that row in place (same array index, same id) instead
  // of appending a new one, and clears the pending marker. A pending row that's never claimed (e.g.
  // an error path with no follow-up for that agent) simply stays in the array forever, unmodified --
  // never silently removed, per this task's design rule.
  const logEvent = (evt, { replaces } = {}) => {
    if (replaces) {
      setPipelineEvents(prev => {
        const id = prev.length;
        pendingDelegationsRef.current.set(replaces.awaitingAgentId, { id, key: replaces.key });
        return [...prev, { ...evt, id }];
      });
      return;
    }
    setPipelineEvents(prev => {
      const pending = pendingDelegationsRef.current.get(evt.agentId);
      if (pending) {
        pendingDelegationsRef.current.delete(evt.agentId);
        return prev.map(e => (e.id === pending.id ? { ...evt, id: pending.id } : e));
      }
      return [...prev, { ...evt, id: prev.length }];
    });
  };

  // FEATURE: MI-47 -- also logs every live handoff as its own permanent Agent Routing drawer row
  // (describePipelineEvent's new "delegation"/"delegation_return" cases), alongside the pre-existing
  // coarse checkpoint events -- additive only, does not replace/dedupe any existing event type.
  // FEATURE: MI-52 -- that row is no longer permanent once a real outcome lands: it's logged via
  // logEvent's new { replaces } shape, keyed on evt.toAgentId (the agent who will produce the real
  // completion -- for 'delegation' that's who the hand-off is going TO; for 'delegation_return',
  // per api/capabilities/execute.js's non-terminal loop-continuation path, it's the agent whose turn
  // resumes next, e.g. Owen after Marcus's retry-via-Marcus hop). The next event logged for that
  // agentId (any ordinary logEvent(evt) call, unmodified elsewhere in this file) replaces this row
  // in place instead of sitting duplicated above it.
  const onDelegationProgress = (evt) => {
    const message = describeDelegationEvent(evt, agents);
    setStatus(message, { kind: 'orchestration' });
    const correlationKey = `${evt.fromAgentId}:${evt.toAgentId}:${evt.viaTool || ''}`;
    logEvent({
      type: evt.type, // 'delegation' | 'delegation_return'
      agentId: evt.fromAgentId,
      secondaryAgentId: evt.type === 'delegation' ? evt.toAgentId : null,
      data: { message, viaTool: evt.viaTool || null },
      durationMs: null, // in-flight signal, not a completed duration -- RoutingEventRow already guards on != null
    }, { replaces: { key: correlationKey, awaitingAgentId: evt.toAgentId } });
  };

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
    {
      const est = estimateChainMs(INTENT_CHAINS.hypothesis_generation, agentActivity);
      setStatus("Priya is generating hypotheses…", { expectation: est != null ? formatExpectation(est) : null });
    }
    try {
      const candidates = await generateHypotheses({ flaggedQuestion, flaggedAnswer, reviewReason });
      logEvent({ type: "hypothesis_generation", agentId: "priya", data: { candidates }, durationMs: Date.now() - t0 });
      setHypFlow(prev => prev && ({ ...prev, stage:"choosing", candidates }));
    } catch (e) {
      // FEATURE: MI-29 -- surface real error to chat + Pipeline Log instead of a silent reset
      console.error("[MarketIntelligenceScreen] generateHypotheses", e.message);
      logEvent({ type: "error", agentId: "priya", data: { step: "hypothesis_generation", message: e.message }, durationMs: Date.now() - t0 });
      setMessages(prev => [...prev, { role: "assistant", text: "Something went wrong generating hypotheses — try again.", kind: "error" }]);
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
    const turnStart = Date.now(); // FEATURE: MI-42 -- captured once, feeds Task 4's final-timeline caption
    setStatus("Marcus is thinking…", { expectation: "expect < 2m" }); // FEATURE: MI-49 -- reverted from "question < 2m"
    try {
      // FEATURE: MI-35 — onEvent still does its existing logEvent(evt) behavior; additionally,
      // once intent_routing resolves to a qa question (a few seconds in, well before the rest of
      // the chain runs), upgrade the ceiling estimate to the real routing-chain-based figure.
      const result = await runIntentPipeline(clean, conversationContext(), (evt) => {
        logEvent(evt);
        if (evt.type === "intent_routing" && evt.data.intent === "qa") {
          setWorkingStatus(prev => {
            if (!prev) return prev;
            const est = estimateChainMs(INTENT_CHAINS.qa, agentActivity);
            return est != null ? { ...prev, expectation: formatExpectation(est) } : prev;
          });
        }
      }, setStatus, onDelegationProgress);
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
          totalElapsedMs: Date.now() - turnStart, // FEATURE: MI-42 -- Task 4's caption reads this
          reviewChoice: null, // FEATURE: MI-51 -- explicit, not relying on undefined (undecided/good/exploring)
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

  // FEATURE: MI-51 — onReview/onGoodThanks are now index-based (were msg-object-based) so a
  // specific message's reviewChoice can be set, driving the universal 3-state guided prompt
  // (undecided/good/exploring) on every qa message, not just internally-flagged ones.
  const onGoodThanks = (msgIndex) => {
    setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, reviewChoice: "good" } : m));
  };

  const onReview = (msgIndex) => {
    const msg = messages[msgIndex];
    if (!msg) return;
    setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, reviewChoice: "exploring" } : m));
    enterHypothesisFlow({ intent:"theory", extractedHypothesis:null, flaggedQuestion: msg.question, flaggedAnswer: msg.text, citations: msg.citations || [], reviewReason: msg.review_reason });
  };

  const onIntentChange = (intent) => setHypFlow(prev => prev && ({ ...prev, intent }));

  // FEATURE: MI-51 — theory testing is no longer auto-fired on selection. Choosing a theory (no
  // second argument, or { startTest: false }) lands on the new "ready" stage showing the chosen
  // theory + an explicit "Have Priya test this theory ->" button; only that button's click passes
  // { startTest: true }, which is when runHypothesisTest() actually runs.
  const onSelectHypothesis = async (text, { startTest } = {}) => {
    if (!hypFlow) return;
    if (!startTest) {
      setHypFlow(prev => prev && ({ ...prev, stage:"ready", chosenText: text }));
      return;
    }
    const { intent, flaggedQuestion, flaggedAnswer, hypothesisTest } = hypFlow;
    setHypFlow(prev => ({ ...prev, stage:"testing", chosenText: text }));
    setMessages(prev => [...prev, { role:"assistant", kind:"hyp_submitted", text, intent }]);
    const t0 = Date.now();
    const turnStart = t0; // FEATURE: MI-42 -- Task 4's caption reads this
    {
      const est = estimateChainMs(INTENT_CHAINS.hypothesis_test, agentActivity);
      setStatus("Priya is running a hypothesis test…", { expectation: est != null ? formatExpectation(est) : null });
    }
    try {
      const st = await runHypothesisTest({ hypothesis: text, intent, flaggedQuestion, flaggedAnswer, priorHypothesisTest: hypothesisTest || null, onEvent: logEvent, setStatus, onProgress: onDelegationProgress });
      logEvent({ type: "hypothesis_test", agentId: "priya", data: st, durationMs: Date.now() - t0 });
      setMessages(prev => [...prev, { role:"assistant", kind:"hypothesis_test", hypothesisTest: st, displayAgentCard: st.display_agent_card, displayAgentId: st.display_agent_id, totalElapsedMs: Date.now() - turnStart }]);
      setHypFlow(prev => prev && ({ ...prev, stage:"result", chosenText: text, hypothesisTest: st, priorHypothesisTest: prev.hypothesisTest || null }));
    } catch (e) {
      // FEATURE: MI-29 -- surface real error to chat + Pipeline Log instead of a silent reset
      console.error("[MarketIntelligenceScreen] runHypothesisTest", e.message);
      logEvent({ type: "error", agentId: "priya", data: { step: "hypothesis_test_display", message: e.message }, durationMs: Date.now() - t0 });
      setMessages(prev => [...prev, { role: "assistant", text: "Something went wrong running that hypothesis test — try again.", kind: "error" }]);
      setHypFlow(prev => prev && ({ ...prev, stage:"choosing" }));
    } finally {
      setWorkingStatus(null);
    }
  };

  const onDiscard = () => {
    // FEATURE: MI-51 — "Info Only" copy (was "Theory discarded — not written to the Data Room.",
    // the old "Discard" button's text) — same no-op outcome, reworded for the 2-outcome decision.
    setMessages(prev => [...prev, { role:"assistant", kind:"hyp_discard", text: "Kept as info only — nothing stored in the Data Room." }]);
    setHypFlow(null);
  };

  // FEATURE: MI-01d — Track as Assumption / Make Permanent. Calls Elena (memory-consolidation,
  // unconditional, self-gated, no confirmation) and Nadia (data-analysis, unconditional, always
  // pending_confirmation) directly — no Intake Assistant involvement, no delegation, no nesting
  // (see kickoff CONTEXT for why intake-commit-intent's route_to fan-out is deliberately unused).
  // FEATURE: MI-51 — intent parameter dropped (was onCommit("forecast")/onCommit("correct") for the
  // old 2-of-3 buttons that shared this call) — single "Store as Forecast" outcome now, hypFlow's own
  // intent (set at flow entry, unchanged) is used below instead of a per-button override.
  const onCommit = async () => {
    if (!hypFlow) return;
    const { intent, flaggedQuestion, flaggedAnswer, citations, chosenText, hypothesisTest } = hypFlow;
    setHypFlow(prev => prev && ({ ...prev, stage: "committing" }));
    // FEATURE: MI-29 -- t0/step hoisted above try so the catch block can log which agent was running
    let t0 = Date.now();
    let step = "memory_consolidation";
    try {
      const disputedChunkId = Array.isArray(citations) && citations.length === 1 ? citations[0] : null;
      const hypothesisTestText = hypothesisTest
        ? [hypothesisTest.supports?.text, hypothesisTest.complicates?.text, hypothesisTest.consider?.text].filter(Boolean).join(" ")
        : "";

      setStatus("Elena is consolidating this into memory…");
      const elenaResult = await callCapability({
        capability_slug: "memory-consolidation", intent_slug: "reasoner-intent", agent_id: "elena",
        task_context: {
          original_question: flaggedQuestion || "", flagged_answer: flaggedAnswer || "",
          committed_hypothesis: chosenText, intent, hypothesis_test: hypothesisTestText,
          was_override: !!hypothesisTest?.override_warning,
        },
        onProgress: onDelegationProgress,
      });
      logEvent({ type: "memory_consolidation", agentId: "elena", data: elenaResult, durationMs: Date.now() - t0 });

      step = "patch_proposed";
      t0 = Date.now();
      setStatus("Nadia is drafting a data patch…");
      const nadiaResult = await callCapability({
        capability_slug: "data-analysis", intent_slug: "data-patch-intent", agent_id: "nadia",
        task_context: {
          disputed_chunk_id: disputedChunkId, correction: chosenText,
          user_reasoning: hypothesisTestText || chosenText,
        },
        onProgress: onDelegationProgress,
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
      // FEATURE: MI-29 -- surface real error to chat + Pipeline Log instead of a silent reset
      console.error("[MarketIntelligenceScreen] onCommit", e.message);
      logEvent({ type: "error", agentId: step === "memory_consolidation" ? "elena" : "nadia", data: { step, message: e.message }, durationMs: Date.now() - t0 });
      setMessages(prev => [...prev, { role: "assistant", text: "Something went wrong committing that — try again.", kind: "error" }]);
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
    setStatus("Nadia is processing your response…");
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
      // FEATURE: MI-51 — accept-branch copy now tells the user exactly where the saved item can be
      // found (was result.content?.confirmation_note || "Recorded."); Nadia's data-patch-intent write
      // already surfaces there today via groupDataSources()'s "Analysis" bucket, no backend change.
      setMessages(prev => [...prev, { role: "assistant", kind: "hyp_discard",
        text: resolution === "accept" ? "Saved — Nadia (Data Expert) logged this. Find it anytime under Agent & Data Info → Analysis." : "Nadia's proposal was rejected — not recorded." }]);
      setHypFlow(null);
    } finally {
      setWorkingStatus(null);
    }
  };

  return (
    <AppShell>
      <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",minHeight:0,background:T.paperDeep,padding: isMobile ? "14px 14px 16px" : "20px 28px 28px"}}>
        <FeatureBadge id="MI-01"/>
        {/* FEATURE: MI-51 — "Agent & Data Info" (renamed from "Activity") relocates here, next to the
            page title, mobile-only — was a small button inside MobileBody's own pane-button row. */}
        <div style={{marginBottom: isMobile ? 12 : 18, display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:10}}>
          <div>
            <div style={{fontFamily:display,fontSize: isMobile ? 19 : 24,fontWeight:700,color:T.navy}}>Channel Sales Intelligence</div>
            <div style={{fontFamily:body,fontSize: isMobile ? 11 : 13,color:T.muted,marginTop:2}}>LLM Wiki - Channel performance analysis, agent-orchestrated</div>
          </div>
          {isMobile && (
            <button onClick={() => setShowAgentInfo(true)} style={{flexShrink:0,fontFamily:mono,fontSize:9,letterSpacing:"0.05em",textTransform:"uppercase",padding:"6px 10px",border:`1px solid ${T.brass}`,color:T.brassDeep,background:T.card,cursor:"pointer",whiteSpace:"nowrap"}}>
            Agent &amp; Data Info
            </button>
          )}
        </div>
        {isMobile ? (
          <MobileBody
            messages={messages} loading={loading} workingStatus={workingStatus} onSubmit={submit} onReview={onReview} onGoodThanks={onGoodThanks} onClear={onClear}
            hypFlow={hypFlow} onIntentChange={onIntentChange} onSelectHypothesis={onSelectHypothesis} onDiscard={onDiscard} onCommit={onCommit} onResolveConfirmation={onResolveConfirmation}
            events={pipelineEvents} agentActivity={agentActivity} showAgentInfo={showAgentInfo} setShowAgentInfo={setShowAgentInfo}
          />
        ) : (
          <div style={{position:"relative",display:"grid",gridTemplateColumns:"1.15fr 1fr 0.9fr",gap:18,flex:1,minHeight:0}}>
            <FeatureBadge id="MI-02"/>
            <InteractColumn messages={messages} loading={loading} workingStatus={workingStatus} onSubmit={submit} onReview={onReview} onGoodThanks={onGoodThanks} onClear={onClear}/>
            <EvidenceColumn hypFlow={hypFlow} workingStatus={workingStatus} onIntentChange={onIntentChange} onSelectHypothesis={onSelectHypothesis} onDiscard={onDiscard} onCommit={onCommit} onResolveConfirmation={onResolveConfirmation}/>
            <AuditColumn events={pipelineEvents} agentActivity={agentActivity}/>
          </div>
        )}
      </div>
    </AppShell>
  );
}
