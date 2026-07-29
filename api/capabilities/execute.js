// DeepBench v6.3.205 | api/capabilities/execute.js | LOG-71 -- durable_hops now persists LOG-67's config-half snapshot and all three resumeCapability() re-entries recover it, so a resumed hop logs the same frozen signature its first hop did instead of a fact-half-only row
// DeepBench v6.3.190 | api/capabilities/execute.js | LOG-77-9 -- delegate_to_agent turn rows capture verbatim delegation_target/task_provenance call_facts (§19k backing facts for the read-time delegated_to_provenance derivation); request_help turns deliberately unchanged
// DeepBench v6.3.184 | api/capabilities/execute.js | LOG-95 -- hop-event span identity (§19p): all 10 streamed delegation-family onEvent payloads carry trace_id + from_span_id/to_span_id; lastHelpSelection and buildFinalDelegationResult() carry the credited execution's trace_id/span_id
// DeepBench v6.3.182 | api/capabilities/execute.js | HAR-17 -- transient model-call failures checkpoint-recover once per hop (recovery_ledger, checked write) before surfacing; enable_web_search persisted across resume
// DeepBench v6.3.181 | api/capabilities/execute.js | HAR-18 -- nested in_progress guards at the broker and critique dispatch sites (the two of four nested call sites that lacked them)
// DeepBench v6.3.180 | api/capabilities/execute.js | HAR-15 -- both error paths forward failureClass/faultCode/upstreamStatus
// DeepBench v6.3.166 | api/capabilities/execute.js | LOG-79 -- runLoop()'s final-answer response now carries trace_id/span_id (one generic passthrough line) so the Agent Routing drawer can join its hop events to the ai_call_patterns view; error/pending_confirmation/depth_exceeded returns deliberately unchanged
// DeepBench v6.3.154 | api/capabilities/execute.js | LOO-20 -- persists requires_human_confirmation + critique_capability_slug/critique_intent_slug across checkpoint/resume (durable_hops migration + checkpointAndReturn/resume plumbing) so a resumed confirmation-gated chain re-lands on the human-confirmation gate instead of the hardcoded requiresHumanConfirmation:false the three resume sites used -- restores the empty Draft Forecast card / bypassed Data Room gate; also patches the durable_hops row terminal when the gate fires on a resumed job so a stray re-resume can't write a duplicate pending_confirmations row
// DeepBench v6.3.153 | api/capabilities/execute.js | LOG-49 -- completes the signature fact-half: threads span_id/parent_span_id chain links (one span per runCapability execution; a delegated child points parent_span_id at the caller's span; persisted across checkpoint/resume via durable_hops exactly as trace_id is), stamps input_references_other_deliverable once a delegate result is folded back into the loop's input, and captures the model's quarantined self_reported_claims -- all on the agent-turn write path
// DeepBench v6.3.142 | api/capabilities/execute.js | LOG-67 -- config-half signature snapshot merged into call_facts on the agent-turn write path
// DeepBench v6.3.133 | api/capabilities/execute.js | LOG-37b -- Layer A call-fact capture on the agent-turn write path: logAgentTurn() now records the real tool name the turn called (delegate_to_agent vs request_help vs a schema tool, plus web_search) in the new call_facts jsonb column, instead of only the frozen pattern slug derived from a boolean. patterns_used deliberately unchanged -- Layer A is purely additive, Layer B reclassifies at read time later.
// DeepBench v6.3.119 | LOO-19 -- Michelle's request_help dispatch passes task_context as a real object, not a stringified blob; JS's Object.entries() on a string iterates characters, which combined with HAR-06's new generic pass-through corrupted her prompt on every request_help call since 2026-07-18
// DeepBench v6.3.102 | api/capabilities/execute.js | LOO-17 -- resolveAccept()/continue branch no longer mark a checkpoint as a completed accept; new accept_failed terminal state; widened eligibility guards
// DeepBench v6.3.88 | api/capabilities/execute.js | S-LOO-015 -- requester's own turn now credited on the request_help+delegationRequired branch, was completely invisible before
// DeepBench v6.3.87 | api/capabilities/execute.js | S-LOO-014 -- originating agent's delegation_complete credit now fires before the 'delegation' placeholder, fixing hop-order (was: target numbered before originator)
// DeepBench v6.3.86 | api/capabilities/execute.js | S-LOO-012 -- delegation_complete events now carry real content (reasoning/task) at the two call sites that previously had none
// DeepBench v6.3.81 | api/capabilities/execute.js | S-LOO-011 -- delegation_complete event added to credit the originating agent's own turn in the plain delegate_to_agent + final branch
// DeepBench v6.3.74 | api/capabilities/execute.js | S-LOO-009d -- delegation_complete event added for the broker's own leg in the request_help + delegationRequired auto-resolve branch
// DeepBench v6.3.71 | api/capabilities/execute.js | S-LOO-009 -- delegation_complete event added at both dispatchDelegation() final-outcome returns
// DeepBench v6.3.49 | api/capabilities/execute.js | S-HAR-04 -- runLoop()'s two call sites (callModel(), sendRequest()) now pass their existing deadline value through, no new computation
// DeepBench v6.3.28 | api/capabilities/execute.js | S-ARCH-LOOP-CONTINUITY-01 (LOO-001/LOO-004) -- requesting_agent_id threaded into request_help's task_context; is_active gate added to resolveCapabilityHolder()
// DeepBench v6.1.43 | api/capabilities/execute.js | S-MI-42 -- _onEvent plumbing, live delegation/delegation_return events at all 5 real dispatch points; v6.1.43 -- S-MI-42 opt-in stream:true SSE transport, all handler branches
// DeepBench v6.1.35 | api/capabilities/execute.js | AA-164 -- thread lastHelpSelection into the normal (non-checkpointed) terminal return
// FEATURE: AA-76 — one generic route for every AI-pattern capability. No capability-specific
// logic lives here, ever — model/max_tokens/schema come entirely from Skill Profile data via
// assemblePrompt() (AA-75). A new capability requires zero changes to this file — only new
// Supabase rows (Skill Profiles + capability_skill_profiles + agent_capability_assignments).
// FEATURE: AA-77 — format_skill_profile_slug/display_agent_id generalize the "format-last"
// pattern api/plan.js already uses for Work Orders (AA-69), so any capability can have its
// output shaped by a display agent's Format Skill in the same single call — not capability-
// specific logic, this applies to every caller that opts in via these two new params.
// FEATURE: AA-139 — promotes AA-138's proven checkpoint/resume POC into the real loop. The
// existing loop body is extracted into runLoop(), shared by both a fresh runCapability() call
// and a new resumeCapability() call. Hybrid, not unconditional: runCapability() stays fully
// in-process/synchronous by default (zero added latency for the common case) — only when a
// chain has run long enough that another hop risks the shared maxDuration ceiling does runLoop()
// checkpoint state to durable_hops and return control to the caller instead of recursing
// further. lib/durable-loop-poc.js (AA-138's isolated proof copy) is retired by this session —
// ARCHITECTURE.md §19b bans two live copies of shared pipeline loop logic.
// FEATURE: AA-144 -- fixes AA-126's empty-content guard misfiring on a NESTED final_delegation.
// delegateResult may itself be a flat final_delegation-shaped object (no `.content` key) when an
// is_final hand-off recurses into a second is_final hand-off -- the guard read `undefined` and
// threw "returned no content" even though the nested call produced perfectly good content, just
// spread flat instead of nested. buildFinalDelegationResult() now always mirrors the real content
// under a `.content` key on every final_delegation result, in addition to the existing flat
// spread, so the shape is self-describing/consistent at any recursion depth -- the same invariant
// the ordinary sendRequest() shape already provides.
// FEATURE: S-ARCH-DURABLE-RESUME-01 -- one root cause, two gaps, both in runLoop()/resumeCapability()
// and the durable_hops table (AA-141 + AA-145). (1) resumeCapability() hardcoded task_context: null
// on every resume -- durable_hops never persisted it (new jsonb column this session) -- so a
// resumed chain's delegate hop got only a free-text task paraphrase, losing real structured data
// (AA-145, live-confirmed: Alex's stored response literally "I don't see the raw answer data").
// (2) runLoop()'s is_final branch had no check for a NESTED delegateResult.status === 'in_progress'
// (the delegate's own budget ran out first) -- it fell through into buildFinalDelegationResult(),
// which threw on missing .content, surfacing as a generic 500 and orphaning the outer durable_hops
// row at 'in_progress' forever (AA-141's real mechanism). checkpointAndReturn() is now a shared
// helper used at both the original top-of-loop site and this new nested-checkpoint site; resumed
// jobs that genuinely throw are now marked 'status: failed' with a real error instead of sitting
// orphaned -- DB bookkeeping only, the HTTP error contract is unchanged.

import { assemblePrompt, mergeCallFacts } from '../prompt/db-assembly.js';
import { enrichPrompt } from '../prompt/ai-enrichment.js';
// FEATURE: LOG-49 -- extractSelfReportedClaims + its allowlist live in request-receivable.js (a
// single shared constant, extensible in one place); imported here so the agent-turn write path uses
// the identical set as the model-call write path.
// FEATURE: LOG-77-9 -- extractDelegationProvenanceFacts shares the same home (pure extractor,
// generic delegation vocabulary, no capability-specific read). See request-receivable.js.
import { sendRequest, callModel, extractSelfReportedClaims, extractDelegationProvenanceFacts } from '../prompt/request-receivable.js';
import { insertPendingConfirmation, getPendingConfirmation, markEdited, resolvePendingConfirmation, getOnAcceptIntentSlug, markAcceptedDelegated, linkCheckpointJob, markAcceptFailed, getConfirmationByCheckpointJobId } from '../_lib/handlers/confirmation.js';
import { createDurableHopRow, loadDurableHopRow, patchDurableHopRow, patchDurableHopRowChecked } from '../_lib/handlers/durable-loop.js';
import { logActivity } from '../../lib/activity-log.js';

export const config = { maxDuration: 60, runtime: "nodejs" };

// FEATURE: AA-80 — platform-level hard ceiling on delegate hops per top-level request. Not
// data-overridable by any Skill Profile — infrastructure, same category as the maxDuration/
// AbortSignal.timeout() limits already in request-receivable.js. ARCHITECTURE.md §19d.
const MAX_LOOP_DEPTH = 5;

// FEATURE: AA-139 — the hybrid trigger's budget constants, grounded in real measured data, not
// guessed. AA-138's live run and the original incident measured real hop latencies ranging
// 0.15s (agent-directory lookup) to 26.1s (Marcus's own Sonnet-based answer generation) to 26.9s
// peak observed elsewhere in AA-120's prior incident report.
const MAX_ESTIMATED_HOP_MS = 30000; // worst real hop observed (AA-120/AA-138): Marcus's Sonnet answer turn, 26.1s, + buffer
const SAFETY_MARGIN_MS = 5000;      // checkpoint write + response round trip
const HOP_BUDGET_RESERVE_MS = MAX_ESTIMATED_HOP_MS + SAFETY_MARGIN_MS;

// FEATURE: AA-139 — test-only override for HOP_BUDGET_RESERVE_MS's comparison. Defaults to null,
// which is a no-op (runLoop() computes the real `deadline - Date.now()` remaining-time value on
// every hop, exactly as production does). When a test sets this, runLoop() uses this value in
// place of the computed remaining time instead, so a test can force the checkpoint branch
// deterministically without waiting out a real ~55s chain. Does not gate on NODE_ENV — this repo
// has no existing test/production env split convention to hook into; the override is inert
// whenever a test doesn't explicitly call it, which is the real safety property that matters.
let __testBudgetMs = null;
export function __setTestBudgetMs(ms) {
  __testBudgetMs = ms;
}

// FEATURE: S-ARCH-DURABLE-RESUME-02 -- mirrors __testBudgetMs exactly (same inert-by-default
// pattern). Gates the NEW pre-dispatch budget check independently of the existing top-of-loop
// check, so a test can force either branch deterministically without the other interfering.
let __testPreDispatchBudgetMs = null;
export function __setTestPreDispatchBudgetMs(ms) {
  __testPreDispatchBudgetMs = ms;
}

// FEATURE: HAR-17 -- classify a MODEL-CALL failure for the one-recovery rule (§19o). Consumes
// HAR-15's failureClass contract verbatim; adds only the classes HAR-15's throw sites don't
// stamp. Scoped to runLoop()'s callModel() catch ONLY -- at any other site a raw TypeError is
// as likely a Supabase/bookkeeping fault (deliverable-duplication risk, see kickoff §2), which
// is why this helper must never be called from dispatch/sendRequest catch paths.
function classifyModelCallFailure(e) {
  if (e?.failureClass === 'transient' || e?.failureClass === 'permanent') return e.failureClass;
  if (e?.status === 422) return 'transient'; // schema dice-roll: "Parse failed" / "Retry skipped" (request-receivable.js)
  const name = e?.name || '';
  // name-based match alongside instanceof: cross-realm errors (and deterministic test injections,
  // which are plain Errors with a name prop) must classify identically to the real thing.
  if (name === 'TimeoutError' || name === 'AbortError' || name === 'TypeError' || name === 'SyntaxError'
    || e instanceof TypeError || e instanceof SyntaxError) {
    return 'transient'; // raw fetch/abort/body-stream failures of the model call itself
  }
  return 'permanent'; // statusless default is SURFACE, never recover (config faults, unknown throws)
}

// FEATURE: HAR-17 -- deterministic failure injection for the Category L tests; inert (null) in
// production. Matches the __setTestBudgetMs precedent (same inert-by-default reasoning above).
let __testModelCallFailure = null; // { times: N, props: {...} } | null
export function __setTestModelCallFailure(cfg) { __testModelCallFailure = cfg; }

// FEATURE: AA-196 -- per-capability/intent hop budget estimate, replacing the flat
// HOP_BUDGET_RESERVE_MS constant used for every hop type regardless of real latency shape.
// Real ai_activity_log data (2026-07-16) showed the flat constant is wrong in both
// directions: routing/selection/review hops (p99 8-22s) over-reserve unnecessarily, while
// several genuinely slow hops (data-room-custody p99 46.2s, data-escalate-intent p99 40.4s,
// hyp-hypothesis-test-intent p99 36.1s, html-display p99 34.0s) already exceed the current
// "worst case" -- a real risk of a hard maxDuration timeout, not just wasted margin. Generic
// by construction: computed identically for every capability_slug/intent_slug pair from real
// logged data, zero capability-specific branching. Falls back to the existing constant
// whenever a pair has too few samples to trust (cold start / brand-new intent) -- zero
// regression risk for anything unmeasured.
const HOP_ESTIMATE_CACHE_TTL_MS = 15 * 60 * 1000;
const HOP_ESTIMATE_MIN_SAMPLES = 10;
const HOP_ESTIMATE_FLOOR_MS = 10000; // never let the reserve drop below this regardless of how fast a hop type measures -- preserves SAFETY_MARGIN_MS's own checkpoint-write/round-trip purpose
let _hopEstimateCache = null;
let _hopEstimateCacheAt = 0;

// FEATURE: AA-196 -- linear-interpolation percentile, matching Postgres's percentile_cont()
// semantics exactly (same formula already proven against real data by MI-58's client-side
// percentile() in src/hooks/useAgents.js -- duplicated here, not imported: api/ and src/ are
// separate layers by ARCHITECTURE.md §6 and must not cross-import).
function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// FEATURE: AA-196 patch (S-ARCH-HOP-BUDGET-01-patch) -- a single request's `limit=3000` was
// silently truncated to 1000 rows by this Supabase project's own PostgREST cap (confirmed live,
// Content-Range: 0-999/3868 returned for the original request), excluding older-but-still-real
// samples for infrequently-called capabilities (data-room-custody's 21 real samples, dated
// 07-08 through 07-14, all fell outside the resulting 1000-row window) -- silently defeating
// the fix for exactly the capabilities it exists to protect. Paginate instead: the table has
// ~3900 total agent-turn rows today, small enough to fetch in full. MAX_PAGES is a safety bound
// (10,000 rows), not a targeted window -- stops when a page returns fewer than PAGE_SIZE rows
// (no more data) well before that bound in practice.
async function refreshHopEstimateCache() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  const PAGE_SIZE = 1000; // this project's real per-request PostgREST cap, confirmed live 2026-07-16
  const MAX_PAGES = 10;
  let rows = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/ai_activity_log?ai_type=eq.agent-turn&latency_ms=not.is.null&select=feature,latency_ms&order=created_at.desc&offset=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`,
      { headers }
    );
    if (!res.ok) throw new Error(`Failed to load ai_activity_log for hop estimates (page ${page}): ${res.status}`);
    const pageRows = await res.json();
    rows = rows.concat(pageRows);
    if (pageRows.length < PAGE_SIZE) break;
  }
  const byKey = {};
  for (const row of rows) {
    if (!row.feature) continue;
    const key = row.feature.split(':').slice(0, 2).join(':'); // capability_slug:intent_slug, strips :depthN/:apiRetryN
    (byKey[key] ||= []).push(row.latency_ms);
  }
  const estimates = {};
  for (const [key, latencies] of Object.entries(byKey)) {
    if (latencies.length < HOP_ESTIMATE_MIN_SAMPLES) continue;
    estimates[key] = percentile(latencies, 0.99);
  }
  _hopEstimateCache = estimates;
  _hopEstimateCacheAt = Date.now();
}

// FEATURE: AA-196 -- replaces the flat HOP_BUDGET_RESERVE_MS at both existing check sites in
// runLoop(). Falls back to the original constant, unchanged, whenever the cache is stale and a
// refresh fails, or the specific capability_slug/intent_slug pair has too few real samples --
// exactly today's behavior in either case. Exported (matching the existing __setTestBudgetMs
// convention) so the Node/Category L test can call it directly against real data.
export async function getHopBudgetReserveMs(capability_slug, intent_slug) {
  if (!_hopEstimateCache || Date.now() - _hopEstimateCacheAt > HOP_ESTIMATE_CACHE_TTL_MS) {
    try {
      await refreshHopEstimateCache();
    } catch (e) {
      console.warn(`[execute.js] hop estimate cache refresh failed, using default: ${e.message}`);
      return HOP_BUDGET_RESERVE_MS;
    }
  }
  const key = `${capability_slug}:${intent_slug || 'none'}`;
  const p99 = _hopEstimateCache?.[key];
  if (p99 == null) return HOP_BUDGET_RESERVE_MS;
  return Math.max(HOP_ESTIMATE_FLOOR_MS, p99 + SAFETY_MARGIN_MS);
}

function getSupabaseHeaders(key) {
  return { "Content-Type": "application/json", "apikey": key, "Authorization": `Bearer ${key}` };
}

// FEATURE: AA-120 -- fire-and-forget latency logging for every callModel() turn inside this
// loop. AA-118 (S-ARCH-LOOP-LATENCY-01) fixed null latency_ms on the three explicit hop-wrapper
// functions (librarian/agent-directory/guardrails-check) but never touched the delegating
// agent's own reasoning turns -- the callModel() calls right here in this loop -- which produced
// zero row at all, not even null. Confirmed live 2026-07-07: a full ci-answer-display-intent call
// completing in 33.4s had two entirely unlogged gaps (Marcus's own two turns) accounting for
// ~16.5s of that total -- the same blind spot AA-120's incident report described as "a hop AA-118
// never touched." Generic to every capability's own turns, not capability-specific.
// FEATURE: HAR-05 -- usedWebSearch is a new optional param, same mechanical-only contract as
// request-receivable.js's sendRequest() detection (ARCHITECTURE.md §19i): true only when THIS
// turn's own raw Anthropic response actually contains a server_tool_use/web_search block, never
// inferred from enableWebSearch being offered. Needed because a delegating turn (e.g. Jordan
// Ellsworth's ws-news-search-intent, which always ends in delegate_to_agent, never a final
// sendRequest() call) would otherwise have its real web_search tool-use invisible to the AI Audit
// entirely -- sendRequest()'s own detection only ever sees a capability's FINAL, non-delegating
// turn. Found live during this session's own Category L verification (a real Jordan->Alex run
// showed zero 'tool-use' pattern logged for Jordan's own turn) -- fixed here rather than left as a
// known gap, since it directly contradicts this session's own AI PATTERN CHECK requirement that
// Jordan's web_search call be logged mechanically. Unset (every existing caller) is byte-identical.
// FEATURE: LOG-37b -- ARCHITECTURE.md §19i Layer A, agent-turn write path (37.0% of all logged
// calls, the single largest slice). This function already knew everything Layer A needs and threw
// it away: `is_delegate_call` is true for BOTH harness delegation tools, so which one actually
// fired -- delegate_to_agent or request_help -- was never recorded (LOG-44 is open precisely
// because nobody can tell those 2,796 rows apart), and `usedWebSearch` collapses into the same
// 'tool-use' slug request-receivable.js writes for a JSON schema call (LOG-46's conflation, at a
// second write site). `tool_calls` records the real tool identifiers instead, in order.
// Deliberately additive: the patternsUsed block below is byte-identical to pre-LOG-37b, including
// the `intent_technical_services` spread -- that spread is a *declared* list with no runtime check,
// which is exactly the untrustworthy-declaration mechanism §19i exists to kill, but removing it
// would change patterns_used behavior and needs its own row. Layer A's job here is to capture the
// real facts alongside it so Layer B can eventually reclassify at read time and ignore the
// declaration; it is not to reclassify anything now.
export async function logAgentTurn({ capability_slug, intent_slug, agent_id, tenant_id, model, depth, latency_ms, is_delegate_call, api_retry_count, input_tokens, output_tokens, intent_technical_services = [], trace_id, usedWebSearch = false, tool_calls = [], signatureConfig = null, spanId = null, parentSpanId = null, inputReferencesOtherDeliverable = false, selfReportedClaims = null, delegationTarget = null, taskProvenance = null }) {
  // FEATURE: LOG-37b -- real tool names, never pattern names. 'web_search' is the literal
  // server-side tool Anthropic ran (same mechanical detection the caller already does for
  // usedWebSearch), not a slug; folded in here rather than at the call site so any future caller
  // that passes usedWebSearch gets the fact recorded too. Set-deduped for consistency with the
  // patternsUsed block below; at the single real call site tool_calls holds at most one name.
  const toolCallFacts = Array.from(new Set([
    ...tool_calls,
    ...(usedWebSearch ? ['web_search'] : []),
  ]));
  // FEATURE: LOG-49 -- fact-half additions. self_reported_claims stays quarantined in its own key
  // (never merged into tool_calls); input_references_other_deliverable is a boolean, both omitted
  // when empty. Combined with the config-half via mergeCallFacts below, preserving the "null not {}"
  // contract (mergeCallFacts returns null when the whole object is empty).
  const factHalf = {
    ...(toolCallFacts.length > 0 ? { tool_calls: toolCallFacts } : {}),
    ...(inputReferencesOtherDeliverable ? { input_references_other_deliverable: true } : {}),
    ...(selfReportedClaims && Object.keys(selfReportedClaims).length > 0 ? { self_reported_claims: selfReportedClaims } : {}),
    // FEATURE: LOG-77-9 -- §19k `delegated_to_provenance` backing facts, verbatim, no comparison,
    // no conclusion (the derived boolean lives in the Displayer view only). Plumbing keys with
    // literal agent ids in them -- never legal criteria keys (§19k locked constraint 2).
    ...(delegationTarget ? { delegation_target: delegationTarget } : {}),
    ...(taskProvenance ? { task_provenance: taskProvenance } : {}),
  };
  logActivity({
    tenantId: tenant_id || 'global',
    agentId: agent_id || null,
    aiType: 'agent-turn',
    feature: `${capability_slug || 'unknown'}:${intent_slug || 'none'}:depth${depth}${api_retry_count ? `:apiRetry${api_retry_count}` : ''}`,
    model: model || null,
    latencyMs: latency_ms,
    inputTokens: input_tokens ?? null,
    outputTokens: output_tokens ?? null,
    patternsUsed: Array.from(new Set([
      ...(is_delegate_call ? ['agent-delegation'] : []),
      ...(usedWebSearch ? ['tool-use'] : []),
      ...intent_technical_services,
    ])),
    traceId: trace_id,
    // FEATURE: LOG-49 -- the chain links for this agent-turn row.
    spanId,
    parentSpanId,
    // FEATURE: LOG-67 -- fact-half (tool_calls + LOG-49's input_references/self_reported_claims) +
    // config-half (signature snapshot) in one call_facts. mergeCallFacts() returns null when both
    // halves are empty, preserving LOG-37b's "null not {}" contract.
    callFacts: mergeCallFacts(Object.keys(factHalf).length > 0 ? factHalf : null, signatureConfig),
  });
}

// FEATURE: AA-87 -- live resolver, replaces the removed executing_agent_id/critique_agent
// fields. A Skill Profile may only name a capability_slug; the harness resolves who currently
// holds it at the moment of dispatch, never a static agent reference. Single-holder assumption
// (AA-93 covers the future multi-holder case -- not built here). ARCHITECTURE.md §19d/§19e.
// FEATURE: LOO-004 -- adds the same is_active gate lib/project-manager.js's isActiveAgent()
// already applies elsewhere; this primitive never had one. A deactivated holder is treated
// identically to "no agent holds this capability" -- same error, no new error shape, no new
// decision logic. Two-query shape (not a PostgREST embed) matches the existing isActiveAgent()
// idiom in this codebase rather than introducing a new pattern.
async function resolveCapabilityHolder(capability_slug) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase not configured');
  const headers = getSupabaseHeaders(supabaseKey);
  const res = await fetch(
    `${supabaseUrl}/rest/v1/agent_capability_assignments?capability_slug=eq.${encodeURIComponent(capability_slug)}&select=agent_id&limit=1`,
    { headers }
  );
  if (!res.ok) throw new Error(`Failed to resolve holder of capability "${capability_slug}"`);
  const rows = await res.json();
  if (!rows.length) throw new Error(`No agent currently holds capability "${capability_slug}"`);
  const agentId = rows[0].agent_id;
  const activeRes = await fetch(
    `${supabaseUrl}/rest/v1/agents?id=eq.${encodeURIComponent(agentId)}&select=is_active`,
    { headers }
  );
  if (!activeRes.ok) throw new Error(`Failed to verify active status for capability "${capability_slug}" holder "${agentId}"`);
  const activeRows = await activeRes.json();
  if (!activeRows?.[0]?.is_active) throw new Error(`No agent currently holds capability "${capability_slug}"`);
  return agentId;
}

// FEATURE: S-ARCH-DISPLAY-LOOP-01 -- shared helper, extracted from fetchFormatOverride()'s inline
// agent-card lookup so the new terminal-delegation path (is_final branch below) and the existing
// bundled format-override path share one fetch, never two copies of the same lookup.
async function fetchAgentCard(agentId, headers, supabaseUrl) {
  if (!agentId) return null;
  try {
    const agRes = await fetch(
      `${supabaseUrl}/rest/v1/agents?id=eq.${encodeURIComponent(agentId)}&select=name,role,specialty,bio&limit=1`,
      { headers }
    );
    if (agRes.ok) {
      const [agRow] = await agRes.json();
      return agRow || null;
    }
  } catch (e) {
    console.warn('[execute] agent card fetch failed:', e.message);
  }
  return null;
}

// FEATURE: AA-77 — fetch a display agent's Format Skill by slug and build the override pieces.
// Mirrors api/plan.js lines 198-234 exactly (same fetch, same formatContract shape) — generalized
// here so any capability can opt in, not duplicated a third time.
async function fetchFormatOverride({ format_skill_profile_slug, display_agent_id, tenant_id }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) return { formatContract: null, formatSection: null, displayAgentCard: null };
  const headers = getSupabaseHeaders(supabaseKey);

  let formatContract = null;
  let formatSection = null;
  try {
    const fspRes = await fetch(
      `${supabaseUrl}/rest/v1/skill_profiles?slug=eq.${encodeURIComponent(format_skill_profile_slug)}&select=*&limit=1`,
      { headers }
    );
    if (fspRes.ok) {
      const [fsp] = await fspRes.json();
      if (fsp) {
        const traits = fsp.traits || {};
        const outputType = traits.output_type || 'json';
        const formatParts = [`Output type: ${outputType}`];
        if (traits.section_structure) formatParts.push(`Structure: ${traits.section_structure}`);
        formatSection = `=== OUTPUT FORMAT ===\n${formatParts.join('\n')}`;
        formatContract = {
          output_type: outputType,
          skill_profile_slug: fsp.slug,
          schema: traits.schema || null,
          handler: traits.handler || 'store',
          guardrails: fsp.guardrails || { must: [], must_not: [] },
        };
      }
    }
  } catch (e) {
    console.warn('[execute] format override fetch failed:', e.message);
  }

  const displayAgentCard = display_agent_id ? await fetchAgentCard(display_agent_id, headers, supabaseUrl) : null;

  return { formatContract, formatSection, displayAgentCard };
}

// FEATURE: AA-144 -- extracted from runLoop()'s inline is_final block so the shape-normalization
// fix below is unit-testable without hitting Supabase/Anthropic. Fixes AA-126's empty-content
// guard misfiring on a NESTED final_delegation: delegateResult may itself be a flat
// final_delegation-shaped object (no `.content` key) when an is_final hand-off recurses into a
// second is_final hand-off. The single-line fix: always mirror the real content under a `.content`
// key on every final_delegation result, in addition to the existing flat spread -- this makes the
// shape self-describing/consistent at any recursion depth, so a nested guard check (or any future
// reader) can rely on `.content` being populated whenever real content exists, same invariant the
// ordinary sendRequest() shape already provides. The flat spread is unchanged -- byte-identical to
// today for the frontend (MarketIntelligenceScreen.jsx's callCapability() returns `result` verbatim
// whenever `result.status` is set, so an added `content` key is additive, never breaking).
export function buildFinalDelegationResult({ delegateResult, targetAgentId, targetCapabilitySlug, targetIntentSlug, finalPatterns, displayAgentCard, lastHelpSelection }) {
  const content = delegateResult.content;
  if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
    throw new Error(`delegate_to_agent: ${targetAgentId}/${targetCapabilitySlug}${targetIntentSlug ? '/' + targetIntentSlug : ''} returned no content for a final delegation (violations: ${JSON.stringify(delegateResult.violations || [])})`);
  }
  const isPlainObject = typeof content === 'object' && content !== null;
  return {
    status: 'final_delegation',
    content,
    ...(isPlainObject ? content : {}),
    patterns_used: finalPatterns,
    display_agent_card: displayAgentCard,
    display_agent_id: targetAgentId,
    selection: lastHelpSelection,
    trace_id: delegateResult.trace_id ?? null,  // LOG-95 (§19p): the delegate's own execution
    span_id: delegateResult.span_id ?? null,    // LOG-95 (§19p) -- recursion: nested final_delegation results carry ids by this same line
  };
}

// FEATURE: AA-152 -- extracted from the delegate_to_agent branch's is_final block so the new
// delegationRequired auto-resolve path (Task 3, in the request_help branch) reuses the exact same
// finalize-and-checkpoint logic instead of a second copy -- same "extract when a second real call
// site needs it" discipline checkpointAndReturn() itself was built under (AA-139's own comment).
// FEATURE: AA-126 -- fail loudly instead of silently returning a hollow card. Before this guard (now
// inside buildFinalDelegationResult()), a delegate that couldn't produce its schema-required output
// (insufficient task_context, a guardrail block, a decline -- exact sub-mode not distinguished here,
// deliberately: any of them means something real went wrong) resulted in `...delegateResult.content`
// spreading nothing into finalResult, no error surfaced, no way for the frontend to tell an empty
// card from a legitimate response. Same "fail safe, never fake" principle as AA-108's assemblePrompt()
// guard -- a genuine platform fault, not something the calling agent is expected to gracefully recover
// from.
// FEATURE: S-ARCH-DISPLAY-LOOP-01 -- delegateResult.content holds the delegate's own structured
// output (e.g. qa-answer-format's headline/body/citations/...); spread at the top level, same place
// callers already read it after callCapability()'s existing `.content` unwrap for the ordinary
// terminal-dispatch shape. `status: 'final_delegation'` reuses callCapability()'s existing generic
// `if (result.status) return result;` passthrough (already built for pending_confirmation/
// depth_exceeded) so this flat shape survives the frontend unwrap unchanged -- no capability-specific
// branch added to callCapability() itself. patterns_used: start from the delegate's own patterns
// (e.g. Alex's structured-output), then guarantee 'agent-delegation' is present -- this hop, by
// definition, just delegated (delegationOccurred is already true by the time either call site here
// is reached), regardless of whether the delegate itself further delegated.
async function finalizeDelegation({ delegateResult, targetAgentId, targetCapabilitySlug, targetIntentSlug, lastHelpSelection, job_id }) {
  const finalPatterns = Array.from(new Set([...(delegateResult.patterns_used || []), 'agent-delegation']));
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const headers = getSupabaseHeaders(supabaseKey);
  const finalResult = buildFinalDelegationResult({
    delegateResult, targetAgentId, targetCapabilitySlug, targetIntentSlug,
    finalPatterns, displayAgentCard: await fetchAgentCard(targetAgentId, headers, supabaseUrl),
    lastHelpSelection,
  });
  if (job_id) {
    await patchDurableHopRow(job_id, { status: 'complete', result: finalResult });
  }
  return finalResult;
}

// FEATURE: S-ARCH-DURABLE-RESUME-01 (AA-141/AA-145) -- extracted from runLoop()'s inline top-of-loop
// checkpoint block so a second call site (the nested is_final delegate check, below) can reuse the
// exact same create/patch-row logic instead of duplicating it. Also the fix for AA-145: now accepts
// and persists task_context (durable_hops didn't capture it before this session), so a resumed chain
// can forward the real structured task_context to a delegate instead of falling back to task-string-
// only forwarding.
// FEATURE: HAR-17 -- gains enableWebSearch (persisted on create AND on the always-run patch, so a
// resumed chain recovers the real flag instead of HAR-05's accepted silent-false gap) and
// recoveryLedger (null everywhere except the model-call recovery seam: null -> ordinary
// fire-and-forget patch, byte-identical budget-path behavior; non-null -> patchDurableHopRowChecked,
// because an unpersisted ledger entry would make "recover once per hop" unbounded).
async function checkpointAndReturn({ job_id, tenant_id, capability_slug, intent_slug, agent_id, enriched, canRequestHelp, delegationRequired, requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug, task_context, conversationHistory, depth, delegationOccurred, lastHelpSelection, pendingDelegation, enableWebSearch = false, recoveryLedger = null, trace_id, span_id = null, parent_span_id = null, signatureConfig = null }) {
  let row_id = job_id;
  if (!row_id) {
    const row = await createDurableHopRow({
      tenant_id, capability_slug, intent_slug, agent_id, task_context,
      system_prompt: enriched.system_prompt, format_contract: enriched.format_contract,
      llm: { model: enriched.llm.model, max_tokens: enriched.llm.max_tokens, temperature: enriched.llm.temperature }, can_request_help: canRequestHelp,
      delegation_required: delegationRequired === true,
      // FEATURE: LOO-20 -- persist the confirmation-gate overrides so a resume re-reads the real
      // gate instead of the hardcoded false; snake_case column names, same as delegation_required.
      requires_human_confirmation: requiresHumanConfirmation === true,
      critique_capability_slug: critiqueCapabilitySlug || null,
      critique_intent_slug: critiqueIntentSlug || null,
      // FEATURE: HAR-17 -- same persist-on-checkpoint pattern as delegation_required above.
      enable_web_search: enableWebSearch === true,
      trace_id,
    });
    row_id = row.id;
  }
  const patchFields = {
    conversation_history: conversationHistory, hop_counter: depth,
    delegation_occurred: delegationOccurred, last_help_selection: lastHelpSelection,
    pending_delegation: pendingDelegation ?? null,
    // FEATURE: LOG-49 -- persist the span across the checkpoint exactly as trace_id is persisted,
    // so a resumed continuation keeps the SAME span identity (resumeCapability reads it back below)
    // rather than minting a new one -- the parent->child tree stays intact across a checkpoint.
    // Written via this always-run patch (durable_hops now carries these columns from Task 1's
    // migration) rather than createDurableHopRow, so no separate handler change is needed.
    span_id, parent_span_id,
    // FEATURE: HAR-17 -- included on the always-run patch too, so a pre-existing row (resume-path
    // re-checkpoint, whose create ran before this session's column existed) still carries the flag.
    enable_web_search: enableWebSearch === true,
    // FEATURE: LOG-71 -- persist LOG-67's config-half snapshot across the checkpoint, exactly as
    // LOG-49 persists span_id here: via the always-run patch, so a pre-existing row created before
    // this column existed still gains it. Written ONLY when non-null -- a checkpoint that doesn't
    // have the snapshot must never erase one the row already carries (a resume-path re-checkpoint
    // on a pre-migration row would otherwise null out a value a later hop could have used).
    ...(signatureConfig ? { signature_config: signatureConfig } : {}),
  };
  if (recoveryLedger !== null) {
    // FEATURE: HAR-17 -- the recovery seam's write MUST be confirmed persisted before the caller
    // returns in_progress; a silent failure here would allow unbounded re-recovery of one hop.
    await patchDurableHopRowChecked(row_id, { ...patchFields, recovery_ledger: recoveryLedger });
  } else {
    await patchDurableHopRow(row_id, patchFields);
  }
  return { status: 'in_progress', job_id: row_id };
}

// FEATURE: AA-195 (S-ARCH-FAILURE-DETAIL-01) -- captures the full rejected-request detail
// postToAnthropicWithRetry() already attaches to a thrown error (.detail, request-receivable.js)
// but which was previously dropped before reaching durable_hops -- Supabase-only observability,
// no external log access required (John's explicit call, 2026-07-16: permanent, not temporary).
// Truncated to 2000 chars, same defensive precedent as AA-157's retryDetail.slice(0, 1000).
function formatErrorForPersistence(e) {
  const detail = typeof e.detail === 'string' ? e.detail.slice(0, 2000) : null;
  return detail ? `${e.message}\n\nDetail: ${detail}` : e.message;
}

// FEATURE: AA-195 -- also extends persistence to runCapability()'s fresh-call path, which
// previously had zero failure record at all (only resumeCapability() persisted anything --
// confirmed by direct read, not assumed). Creates a row first when job_id is null (fresh call),
// otherwise patches the existing one (resumed call) -- same create-if-absent shape
// checkpointAndReturn() already uses for the success/checkpoint path.
async function persistFailureAndRethrow(e, { job_id, tenant_id, capability_slug, intent_slug, agent_id, enriched, canRequestHelp, delegationRequired, task_context, trace_id, span_id = null, parent_span_id = null }) {
  // FEATURE: HAR-17 -- this function is now also called from runLoop()'s model-call seam (with the
  // live job_id), and the rethrown error still propagates up to runCapability()'s/resumeCapability()'s
  // existing outer catch, which calls here again. For a resumed row that second call would be a
  // harmless re-patch to status:'failed'; on a FRESH call (job_id null at both sites) it would
  // create a duplicate failed row. This marker guard makes the second call a pure rethrow either
  // way -- the row the seam already persisted is the record.
  if (e && e.__failurePersisted) throw e;
  let row_id = job_id;
  if (!row_id) {
    const row = await createDurableHopRow({
      tenant_id, capability_slug, intent_slug, agent_id, task_context,
      system_prompt: enriched.system_prompt, format_contract: enriched.format_contract,
      llm: { model: enriched.llm.model, max_tokens: enriched.llm.max_tokens, temperature: enriched.llm.temperature },
      can_request_help: canRequestHelp, delegation_required: delegationRequired === true,
      trace_id,
    });
    row_id = row.id;
  }
  // FEATURE: LOG-49 -- record the span on the failure row too (a failed row is never resumed, but
  // this keeps its place in the parent->child tree honest).
  await patchDurableHopRow(row_id, { status: 'failed', error: formatErrorForPersistence(e), span_id, parent_span_id });
  try { e.__failurePersisted = row_id; } catch { /* frozen/exotic error object: fall back to the harmless re-persist */ }
  throw e;
}

// FEATURE: S-ARCH-DURABLE-RESUME-02 (AA-185/AA-187) -- extracted verbatim from runLoop()'s former
// inline request_help/delegate_to_agent dispatch blocks, parameterized by via_tool/tool_input
// instead of reading turn.tool_name/turn.tool_input directly, so it can be called either inline
// (live, right after the model decides) or from resumeCapability() (a checkpoint's persisted
// pending_delegation, no `turn` object at all). Does not append the assistant's own decision turn
// to conversationHistory -- the caller does that once, immediately after callModel() returns a
// delegate call, before the new pre-dispatch budget check, so it is already present in
// conversationHistory whether this hop dispatches live or checkpoints pending.
async function dispatchDelegation({
  via_tool, tool_input, tool_use_id, agent_id, capability_slug, intent_slug, tenant_id, task_context,
  delegationRequired, conversationHistory, hopCounter, deadline, job_id, delegationOccurred,
  lastHelpSelection, onEvent, trace_id,
  // FEATURE: LOG-49 -- the dispatching execution's OWN span. Every nested runCapability() below
  // passes _parent_span_id: span_id, so the child execution points its parent_span_id at this
  // caller -- exactly parallel to the _trace_id: trace_id each already passes.
  span_id = null,
}) {
  let delegateResult;
  let returningFromAgentId = null;
  let returningFromCapabilitySlug = null;

  if (via_tool === 'request_help') {
    const pmAgentId = await resolveCapabilityHolder('project-manager');
    // FEATURE: LOO-015 — credits the REQUESTER's own turn (real work up to and including deciding
    // to ask for help) before the 'delegation' announcement below creates its own placeholder for
    // the broker. Without this, for any delegationRequired capability, the requester's own row is
    // fully overwritten once the broker's own credit (LOO-009d, below) claims it — the requester has
    // ZERO trace anywhere in the drawer (confirmed live 2026-07-21, John's own screenshot: a real
    // Jordan->Michelle->Brent chain showed only Michelle and Brent, Jordan completely absent).
    // Scoped to delegationRequired only, matching LOO-011/LOO-014's identical guard on the other
    // branch: for the ordinary (non-delegationRequired) request_help case, the requester keeps its
    // own turn and eventually answers directly, already credited by callCapability()'s automatic
    // Shape-1 detection (LOO-010) once the whole call resolves — firing here too would double-credit
    // that case. For a delegationRequired capability specifically, that Shape-1 detection never
    // fires (this call always resolves via a delegation, display_agent_id always ends up set), so
    // this is the only credit this agent's own turn will ever get. Content mirrors LOO-012's
    // parity-restoration principle: tool_input.task_description/skill_needed is the same real field
    // the delegateTaskContext below already reads, not new data.
    if (delegationRequired) {
      onEvent({ type: 'delegation_complete', fromAgentId: null, fromCapabilitySlug: null, toAgentId: agent_id, toCapabilitySlug: capability_slug, toIntentSlug: intent_slug, viaTool: 'request_help', task: tool_input.task_description || tool_input.skill_needed || null, trace_id, from_span_id: null, to_span_id: span_id }); // LOG-95 (§19p)
    }
    onEvent({ type: 'delegation', fromAgentId: agent_id, fromCapabilitySlug: capability_slug, toAgentId: pmAgentId, toCapabilitySlug: 'project-manager', toIntentSlug: 'agent-selection-intent', viaTool: 'request_help', trace_id, from_span_id: span_id, to_span_id: null }); // LOG-95 (§19p): PM's execution not started yet -- null, never fabricated
    // FEATURE: LOO-001 -- requesting_agent_id threaded into Michelle's task_context (generic,
    // always-present field, never omitted) so her own reasoning can recognize and reject a
    // self-referral, per the no_match output LOO-002 adds. tool_input itself never carries this
    // key (REQUEST_HELP_TOOL's schema has no agent_id field), so there is no collision risk.
    delegateResult = await runCapability({
      capability_slug: 'project-manager', intent_slug: 'agent-selection-intent', agent_id: pmAgentId,
      task_context: { ...tool_input, requesting_agent_id: agent_id }, tenant_id, _hop_counter: hopCounter, _deadline: deadline, _onEvent: onEvent,
      _trace_id: trace_id, _parent_span_id: span_id,
    });
    // FEATURE: HAR-18 -- the broker call can checkpoint (budget today; transient recovery after
    // HAR-17b), exactly like the two nested dispatch calls below. Same handling as L592/L635:
    // convert to a nested_checkpoint outcome so runLoop() persists pending_delegation
    // {waiting_on_job_id, tool_use_id} and resumeCapability()'s waiting branch drives the broker
    // job to completion, then feeds its result back as this request_help turn's tool_result.
    // Before this guard, an in_progress return fell through to the L558 .content reads (nulls),
    // then either the L569 throw (delegationRequired -- a healthy checkpoint surfaced as
    // "no valid recommended_agent_id") or the L650 tool_result append (the model received a raw
    // {"status":"in_progress"} blob as its help result).
    if (delegateResult?.status === 'in_progress') {
      return { outcome: 'nested_checkpoint', lastHelpSelection, waitingOnJobId: delegateResult.job_id, toolUseId: tool_use_id };
    }
    // FEATURE: LOG-15 — lastHelpSelection never carried patterns_used, even though the real value
    // (delegateResult.patterns_used) was already computed one line above by the shared
    // buildPatternsUsed() mechanism (request-receivable.js) — this is a thread-the-value fix, not new
    // detection. This one object is reused 3 ways downstream (last_help_selection on non-final
    // results, selection inside buildFinalDelegationResult()'s return) — fixing it here fixes every
    // agent_selection event in the Agent Routing drawer at once.
    lastHelpSelection = {
      selected_by_agent_id: pmAgentId,
      reasoning: delegateResult?.content?.reasoning ?? null,
      candidates_considered: delegateResult?.content?.candidates ?? null,
      patterns_used: delegateResult?.patterns_used || [],
      trace_id: delegateResult?.trace_id ?? trace_id ?? null,   // LOG-95 (§19p)
      span_id: delegateResult?.span_id ?? null,                 // LOG-95 (§19p): the picker's own span, never the requester's
    };

    if (delegationRequired) {
      const rec = delegateResult?.content;
      const matchedCandidate = rec?.candidates?.find(c => c.agent_id === rec.recommended_agent_id && c.capability_slug === rec.recommended_capability_slug);
      if (!rec?.recommended_agent_id || !matchedCandidate) {
        throw new Error(`request_help: delegationRequired capability's agent-selection-intent response had no valid recommended_agent_id matching a real candidate (capability_slug: ${capability_slug}/${intent_slug})`);
      }
      // FEATURE: LOO-009d — the broker's own leg (this request_help call to pmAgentId) just
      // resolved with a real pick. This delegationRequired path takes an early 'final' return
      // below and never reaches the ordinary returningFromAgentId/delegation_return block further
      // down in this function (the signal that already correctly covers the non-delegationRequired
      // case) — so this leg needs its own explicit completion event here, or the broker's real,
      // completed work stays permanently invisible. Fires only after the candidate is confirmed
      // valid, never on the throw path above.
      // FEATURE: LOO-012 — attaches the real reasoning already computed one line above (rec.reasoning,
      // via lastHelpSelection) to this event, restoring the content the old Shape-2 "agent_selection"
      // declaration used to carry before LOO-009b removed it as a redundant crediting mechanism —
      // redundant for crediting, not for content, which is the gap this closes.
      onEvent({ type: 'delegation_complete', fromAgentId: agent_id, fromCapabilitySlug: capability_slug, toAgentId: pmAgentId, toCapabilitySlug: 'project-manager', toIntentSlug: 'agent-selection-intent', viaTool: 'request_help', reasoning: rec.reasoning ?? null, trace_id, from_span_id: span_id, to_span_id: delegateResult?.span_id ?? null }); // LOG-95 (§19p): credits the PM -- her own resolved span
      const delegateTaskContext = (task_context && typeof task_context === 'object')
        ? { ...task_context, delegation_task: tool_input.task_description || tool_input.skill_needed }
        : { delegation_task: tool_input.task_description || tool_input.skill_needed };
      onEvent({ type: 'delegation', fromAgentId: pmAgentId, fromCapabilitySlug: 'project-manager', toAgentId: rec.recommended_agent_id, toCapabilitySlug: rec.recommended_capability_slug, toIntentSlug: matchedCandidate.intent_slug || null, viaTool: 'delegate_to_agent', reasoning: rec.reasoning ?? null, trace_id, from_span_id: delegateResult?.span_id ?? null, to_span_id: null }); // LOG-95 (§19p): target's execution not started yet
      const autoResolvedResult = await runCapability({
        capability_slug: rec.recommended_capability_slug, intent_slug: matchedCandidate.intent_slug || null,
        agent_id: rec.recommended_agent_id, task_context: delegateTaskContext, tenant_id, _hop_counter: hopCounter, _deadline: deadline, _onEvent: onEvent,
        _trace_id: trace_id, _parent_span_id: span_id,
      });
      if (autoResolvedResult.status === 'in_progress') {
        return { outcome: 'nested_checkpoint', lastHelpSelection, waitingOnJobId: autoResolvedResult.job_id, toolUseId: tool_use_id };
      }
      // FEATURE: LOO-009 — the delegation announced above never got a matching completion event
      // when it resolved final (no return trip possible) — this is that event, same shape as
      // delegation/delegation_return, fired exactly where finalizeDelegation() learns the real
      // terminal agent. Nested is_final-in-is_final chains need no special handling: _onEvent is
      // already threaded into the nested runCapability() call above, so a deeper final hand-off
      // fires its OWN delegation_complete at its own level automatically.
      onEvent({ type: 'delegation_complete', fromAgentId: pmAgentId, fromCapabilitySlug: 'project-manager', toAgentId: rec.recommended_agent_id, toCapabilitySlug: rec.recommended_capability_slug, toIntentSlug: matchedCandidate.intent_slug || null, viaTool: 'delegate_to_agent', trace_id, from_span_id: delegateResult?.span_id ?? null, to_span_id: autoResolvedResult?.span_id ?? null }); // LOG-95 (§19p): credits the recommended target's own execution
      return { outcome: 'final', result: await finalizeDelegation({ delegateResult: autoResolvedResult, targetAgentId: rec.recommended_agent_id, targetCapabilitySlug: rec.recommended_capability_slug, targetIntentSlug: matchedCandidate.intent_slug || null, lastHelpSelection, job_id }) };
    }
    returningFromAgentId = pmAgentId;
    returningFromCapabilitySlug = 'project-manager';
  } else if (via_tool === 'delegate_to_agent') {
    const { agent_id: targetAgentId, capability_slug: targetCapabilitySlug, intent_slug: targetIntentSlug, task } = tool_input;
    const delegateTaskContext = (task_context && typeof task_context === 'object') ? { ...task_context, delegation_task: task } : { delegation_task: task };
    // FEATURE: LOO-014 — delegationRequired/tool_input.is_final are both already known here, before
    // any dispatch happens — neither depends on the nested call's result. Computed once, reused
    // below, so the early-fire decision and the existing final-branch check share one evaluation,
    // never two independently-computed conditions that could drift out of sync.
    const willResolveFinal = delegationRequired || tool_input.is_final === true;
    if (willResolveFinal) {
      // FEATURE: LOO-014 — moved from after the nested call resolves (LOO-011's original position)
      // to here, before the 'delegation' announcement below creates its own placeholder. Fixes a
      // real hop-order bug found live 2026-07-21 (John's screenshot): hop numbers are array-creation
      // order, oldest first: the 'delegation' announcement below always created the EARLIEST row for
      // this exchange, so the target's own credit (LOO-009, which claims that early row in place)
      // kept the early position even though its content arrives last — while the originator's credit
      // (LOO-011), firing only after the nested call resolved, always created a genuinely later row.
      // Result: target numbered before originator, backwards from real chronology. Firing here
      // instead gives the originator's own row the true earliest position — their real work
      // genuinely happens first — while the 'delegation' placeholder (and the target's later claim
      // on it) correctly becomes the second, later hop. Content unchanged from LOO-011/LOO-012 — only
      // the firing point moved.
      onEvent({ type: 'delegation_complete', fromAgentId: null, fromCapabilitySlug: null, toAgentId: agent_id, toCapabilitySlug: capability_slug, toIntentSlug: intent_slug, viaTool: 'delegate_to_agent', task: task ?? null, trace_id, from_span_id: null, to_span_id: span_id }); // LOG-95 (§19p): credits the current agent's own execution
    }
    onEvent({ type: 'delegation', fromAgentId: agent_id, fromCapabilitySlug: capability_slug, toAgentId: targetAgentId, toCapabilitySlug: targetCapabilitySlug, toIntentSlug: targetIntentSlug || null, viaTool: 'delegate_to_agent', trace_id, from_span_id: span_id, to_span_id: null }); // LOG-95 (§19p): target's execution not started yet
    delegateResult = await runCapability({
      capability_slug: targetCapabilitySlug, intent_slug: targetIntentSlug || null, agent_id: targetAgentId,
      task_context: delegateTaskContext, tenant_id, _hop_counter: hopCounter, _deadline: deadline, _onEvent: onEvent,
      _trace_id: trace_id, _parent_span_id: span_id,
    });
    if (delegateResult.status === 'in_progress') {
      return { outcome: 'nested_checkpoint', lastHelpSelection, waitingOnJobId: delegateResult.job_id, toolUseId: tool_use_id };
    }
    if (willResolveFinal) {
      // FEATURE: LOO-009 — unchanged: credits the target, claiming the 'delegation' placeholder above.
      onEvent({ type: 'delegation_complete', fromAgentId: agent_id, fromCapabilitySlug: capability_slug, toAgentId: targetAgentId, toCapabilitySlug: targetCapabilitySlug, toIntentSlug: targetIntentSlug || null, viaTool: 'delegate_to_agent', trace_id, from_span_id: span_id, to_span_id: delegateResult?.span_id ?? null }); // LOG-95 (§19p): credits the target's own resolved execution
      return { outcome: 'final', result: await finalizeDelegation({ delegateResult, targetAgentId, targetCapabilitySlug, targetIntentSlug, lastHelpSelection, job_id }) };
    }
    returningFromAgentId = targetAgentId;
    returningFromCapabilitySlug = targetCapabilitySlug;
  }

  if (returningFromAgentId) {
    onEvent({ type: 'delegation_return', toAgentId: agent_id, toCapabilitySlug: capability_slug, fromAgentId: returningFromAgentId, fromCapabilitySlug: returningFromCapabilitySlug, trace_id, from_span_id: delegateResult?.span_id ?? null, to_span_id: span_id }); // LOG-95 (§19p): row credits the returning delegate
  }
  conversationHistory = [
    ...conversationHistory,
    { role: 'user', content: [{ type: 'tool_result', tool_use_id, content: JSON.stringify(delegateResult) }] },
  ];
  return { outcome: 'continue', conversationHistory, lastHelpSelection };
}

// FEATURE: AA-139 -- the shared loop body, extracted unchanged in behavior from runCapability()'s
// former in-place `for` loop, plus the new hybrid budget check. Takes fully explicit state, never
// reads closure variables, so both a fresh call (runCapability(), conversationHistory: [],
// job_id: null) and a resumed call (resumeCapability(), state loaded from durable_hops,
// job_id: row.id) share this one implementation. No second copy of the loop logic anywhere.
async function runLoop({
  capability_slug, intent_slug, agent_id, tenant_id, task_context, enriched, canRequestHelp,
  // FEATURE: HAR-05 -- enableWebSearch threaded through runLoop() the same explicit-param way
  // canRequestHelp already is (read from promptRequest in runCapability(), below -- ai-enrichment.js
  // drops unknown fields from `enriched`, same reason canRequestHelp can't be read from there either).
  // FEATURE: HAR-17 -- now persisted to durable_hops (enable_web_search, this session's migration)
  // at every checkpointAndReturn() site and recovered by resumeCapability()'s three runLoop()
  // re-entries, closing HAR-05's accepted gap: the recovery seam makes checkpoint/resume a normal
  // path for ANY hop, including a web-search one, so the flag can no longer be silently dropped.
  // (display_agent_* remains a documented residual -- HAR-17 row in FEATURES.md; signatureConfig is
  // no longer one, LOG-71 closed it the same way.)
  enableWebSearch = false,
  // FEATURE: HAR-17 -- the per-hop recovery ledger (§19o): [{ o, fault, at }] entries keyed by hop
  // ordinal (conversationHistory.length at the top of the hop). [] on a fresh call; recovered from
  // durable_hops.recovery_ledger on resume. Only the model-call seam below ever appends to it.
  recoveryLedger = [],
  delegationRequired,
  requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug,
  display_agent_id, display_agent_card,
  conversationHistory, delegationOccurred, lastHelpSelection, hopCounter, deadline,
  job_id = null, // set only when resuming -- lets a checkpoint on the very next hop update its own row instead of creating a duplicate
  trace_id, // FEATURE: AI-46a -- always supplied by both real callers (runCapability()/resumeCapability()); pure passthrough, same category as job_id/hopCounter/deadline
  // FEATURE: LOG-49 -- this execution's own span (span_id) and its caller's span (parent_span_id),
  // threaded exactly like trace_id: stamped on every row this loop writes, and handed to every
  // nested runCapability() as the child's _parent_span_id. Recovered from durable_hops on resume so
  // a resumed hop keeps its original span/parent, same category as trace_id above.
  span_id = null, parent_span_id = null,
  onEvent, // FEATURE: MI-42 -- always a real function by the time this fires; runCapability()/resumeCapability() already default it to a no-op
  // FEATURE: LOG-67 -- the config-half signature snapshot from promptRequest (runCapability() reads it
  // off db-assembly's raw output, same reason canRequestHelp can't come from `enriched`).
  // FEATURE: LOG-71 -- no longer null on the resume path: durable_hops.signature_config (this session's
  // migration) is written at every checkpointAndReturn() site below and recovered by resumeCapability()'s
  // three runLoop() re-entries, so a resumed hop logs the SAME frozen config-half its pre-checkpoint
  // hops did instead of a fact-half-only row that no config-half criterion can ever match. Frozen, never
  // recomputed -- buildSignatureConfig() would read today's skill profiles and reintroduce the very drift
  // LOG-67 exists to prevent. Null now only for a pre-migration row (one-time, self-clearing).
  signatureConfig = null,
}) {
  let delegationRetried = false;
  // FEATURE: LOG-49 -- fact 2: flips true once a delegate's returned result has been folded back
  // into conversationHistory (dispatchDelegation()'s 'continue' outcome below). From that point on
  // in this loop, every logAgentTurn row -- and the terminal sendRequest write -- carries
  // input_references_other_deliverable: true, because this turn's input now structurally embeds a
  // prior sub-call's real output (the "integrate"/synthesis step). A pure final hand-off never
  // reaches 'continue' (it returns 'final'), so it correctly never sets this.
  let integratedDelegateResult = false;
  for (let depth = hopCounter.n; ; depth++) {
    // FEATURE: AA-139 -- the hybrid trigger. Checked before every hop, not just once: a chain
    // that's already spent most of its budget on earlier hops checkpoints here instead of risking
    // the next one blowing the shared maxDuration ceiling. Cheap chains (the common case) never
    // hit this -- remainingMs stays well above HOP_BUDGET_RESERVE_MS for a short chain's whole
    // life. __testBudgetMs, when set by a test, stands in for the computed remaining time so the
    // branch can be forced deterministically; it is null (inert) in every real request.
    const remainingMs = __testBudgetMs !== null ? __testBudgetMs : (deadline - Date.now());
    const hopReserveMs = await getHopBudgetReserveMs(capability_slug, intent_slug);
    if (remainingMs < hopReserveMs) {
      return checkpointAndReturn({
        job_id, tenant_id, capability_slug, intent_slug, agent_id, enriched, canRequestHelp, delegationRequired,
        requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug,
        task_context, conversationHistory, depth, delegationOccurred, lastHelpSelection,
        pendingDelegation: null, enableWebSearch,
        trace_id, span_id, parent_span_id,
        // FEATURE: LOG-71 -- carry LOG-67's frozen config-half onto the row so the resume recovers it.
        signatureConfig,
      });
    }

    const turnStart = Date.now();
    // FEATURE: HAR-04 -- threads this loop's existing deadline (AA-139's own hop-budget value,
    // no new computation) one level deeper into callModel()'s internal Anthropic call(s), so a
    // hop that passes the pre-hop budget check can't still blow the shared maxDuration ceiling
    // from inside callModel()'s own parse-failure retry. AA-69/S-SES003-TSR-design.
    let turn;
    try {
      // FEATURE: HAR-17 -- deterministic failure injection for the Category L tests; inert (null) in production.
      if (__testModelCallFailure && __testModelCallFailure.times > 0) {
        __testModelCallFailure.times--;
        throw Object.assign(new Error(__testModelCallFailure.props.message || 'injected model-call failure'), __testModelCallFailure.props);
      }
      turn = await callModel({
        systemPrompt: enriched.system_prompt,
        model: enriched.llm.model,
        max_tokens: enriched.llm.max_tokens,
        temperature: enriched.llm.temperature,
        format_contract: enriched.format_contract,
        canRequestHelp,
        enableWebSearch,
        conversation_history: conversationHistory,
        deadline,
      });
    } catch (e) {
      // FEATURE: HAR-17 -- §19o: classify first; a transient model-call failure gets exactly one
      // checkpoint-resume recovery per hop before surfacing. Hop identity = conversationHistory.length
      // at the top of the hop -- stable across checkpoint/resume (depth is NOT: a resumed continuation
      // re-enters at the decision hop's depth), monotonic within a chain.
      const hopOrdinal = conversationHistory.length;
      const alreadyRecovered = recoveryLedger.some(r => r.o === hopOrdinal);
      if (classifyModelCallFailure(e) === 'transient' && !alreadyRecovered) {
        try {
          const newLedger = [...recoveryLedger, { o: hopOrdinal, fault: e.faultCode || e.name || String(e.status || 'unknown'), at: new Date().toISOString() }];
          const checkpoint = await checkpointAndReturn({
            job_id, tenant_id, capability_slug, intent_slug, agent_id, enriched, canRequestHelp, delegationRequired,
            requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug,
            task_context, conversationHistory, depth, delegationOccurred, lastHelpSelection,
            pendingDelegation: null, enableWebSearch, recoveryLedger: newLedger,
            trace_id, span_id, parent_span_id,
            // FEATURE: LOG-71 -- carry LOG-67's frozen config-half onto the row so the resume recovers it.
            signatureConfig,
          });
          // FEATURE: HAR-17 -- the recovery payload rides the in_progress response body: every call
          // site's resolveInProgress() sees it (streamed or not) -- the client half is S-HAR-17c.
          return { ...checkpoint, recovery: { fault: e.faultCode || e.name || 'transient', agent_id, capability_slug, intent_slug } };
        } catch (ledgerWriteError) {
          // Checked ledger write failed -- recovering anyway would be unbounded. Fail safe: surface.
          console.error(`[execute] recovery ledger write failed (${ledgerWriteError.message}); surfacing original failure`);
        }
      }
      return await persistFailureAndRethrow(e, { job_id, tenant_id, capability_slug, intent_slug, agent_id, enriched, canRequestHelp, delegationRequired, task_context, trace_id, span_id, parent_span_id });
    }
    // FEATURE: HAR-05 -- same mechanical-only shape as request-receivable.js's sendRequest()
    // detection: only true when this turn's own raw response actually contains a server-executed
    // web_search block. See logAgentTurn()'s own comment for why this call site needs its own
    // detection rather than relying on sendRequest()'s (a delegating turn never reaches sendRequest()).
    const turnUsedWebSearch = (turn.raw_content || []).some(
      b => (b.type === 'server_tool_use' && b.name === 'web_search') || b.type === 'web_search_tool_result'
    );
    logAgentTurn({
      capability_slug, intent_slug, agent_id, tenant_id,
      model: enriched.llm.model, depth, latency_ms: Date.now() - turnStart,
      is_delegate_call: turn.is_delegate_call, api_retry_count: turn.apiRetryCount || 0,
      input_tokens: turn.usage?.input_tokens ?? null,
      output_tokens: turn.usage?.output_tokens ?? null,
      intent_technical_services: enriched.intent_technical_services || [],
      trace_id,
      usedWebSearch: turnUsedWebSearch,
      // FEATURE: LOG-49 -- chain links for this row; the integrate flag (true once a delegate result
      // was folded back into this turn's input); and the model's own declared reference-ids extracted
      // from its structured output (turn.tool_input), quarantined into its own call_facts key.
      spanId: span_id, parentSpanId: parent_span_id,
      inputReferencesOtherDeliverable: integratedDelegateResult,
      selfReportedClaims: extractSelfReportedClaims(turn.tool_input),
      // FEATURE: LOG-67 -- the config-half snapshot, threaded from runCapability() (off promptRequest),
      // merged into this row's call_facts alongside the fact-half tool_calls below.
      signatureConfig,
      // FEATURE: LOG-37b -- the real tool this turn called, written verbatim. Already in scope and
      // already trusted here: the delegation-routing block below (nextCapabilitySlug /
      // nextIntentSlug / pendingDelegation.via_tool) reads this same field to decide where the hop
      // goes, while the log write recorded only the is_delegate_call boolean derived from it.
      // Never derived, translated, or normalized -- 'delegate_to_agent' and 'request_help' are
      // different facts and collapsing them is the bug LOG-44 exists to fix. Null on a plain text
      // turn (parseModelTurn(), request-receivable.js:171), which correctly yields call_facts null.
      tool_calls: turn.tool_name ? [turn.tool_name] : [],
      // FEATURE: LOG-77-9 -- §19k backing facts for the read-time `delegated_to_provenance`
      // derivation, captured verbatim ONLY on a delegate_to_agent turn (a structural harness-tool
      // check, never an agent/capability conditional). request_help turns deliberately get
      // nothing: they carry no target. task_context is already in scope (it threads to
      // persistFailureAndRethrow); resumed loops capture identically (AA-145 persists it).
      ...(turn.tool_name === 'delegate_to_agent'
        ? (() => { const f = extractDelegationProvenanceFacts(turn.tool_input, task_context); return { delegationTarget: f.delegationTarget, taskProvenance: f.taskProvenance }; })()
        : {}),
    });

    if (!turn.is_delegate_call) {
      // FEATURE: AA-142 -- delegationRequired intents (ci-answer-display-intent,
      // hyp-hypothesis-test-display-intent) must always complete via request_help/delegate_to_agent
      // -- their entire job is handing off, never answering directly. tool_choice:'auto' (harness
      // tools present) + AA-97's legitimate text-completion path (for intents that CAN validly
      // answer in text, e.g. hyp-stress-test-intent) together let the model narrate its intended
      // hand-off in prose instead of completing it -- previously accepted as an ordinary final
      // answer with no distinction. Retry once with a direct correction (same one-retry shape as
      // AA-113's transient-API-error retry, different failure class); fail loudly on a second
      // occurrence rather than silently presenting narration as a real answer, same "fail safe,
      // never fake" principle as AA-108/AA-126. Deliberately inert for any capability that never
      // declares delegation_required -- a capability that can legitimately answer in text (no
      // schema, can_request_help, delegation_required NOT set) is completely unaffected.
      if (delegationRequired && !delegationRetried) {
        delegationRetried = true;
        conversationHistory = [
          ...(conversationHistory.length > 0 ? conversationHistory : [{ role: 'user', content: enriched.system_prompt }]),
          { role: 'assistant', content: turn.raw_content },
          { role: 'user', content: 'You responded with plain text describing your intended hand-off instead of actually completing it. This task must always be completed by calling request_help, then delegate_to_agent -- call the appropriate tool now, do not describe your plan in words.' },
        ];
        continue;
      }
      if (delegationRequired && delegationRetried) {
        throw new Error(`${capability_slug}/${intent_slug}: agent ended its turn with a text response instead of completing a required delegation, twice in a row (depth ${depth})`);
      }

      // FEATURE: AA-87 -- consequential-action gate now lives on the capability's own final
      // output (its own Intent Skill Profile traits), not the deleted delegate-object shape.
      // Critique dispatch resolves live via resolveCapabilityHolder(), same as request_help
      // below -- never a named agent anywhere in this mechanism. ARCHITECTURE.md §19d.
      if (requiresHumanConfirmation) {
        let critique = null;
        if (critiqueCapabilitySlug) {
          if (hopCounter.n >= MAX_LOOP_DEPTH) {
            return { status: 'depth_exceeded', depth: MAX_LOOP_DEPTH, agent_id, capability_slug };
          }
          hopCounter.n++;
          const critiqueAgentId = await resolveCapabilityHolder(critiqueCapabilitySlug);
          // FEATURE: MI-42 -- fires the instant the target is resolved, before the nested call's own
          // latency -- never speculative, the critique agent is always real by the time this fires.
          onEvent({ type: 'delegation', fromAgentId: agent_id, fromCapabilitySlug: capability_slug, toAgentId: critiqueAgentId, toCapabilitySlug: critiqueCapabilitySlug, toIntentSlug: critiqueIntentSlug, viaTool: 'critique', trace_id, from_span_id: span_id, to_span_id: null }); // LOG-95 (§19p): critique execution not started yet
          critique = await runCapability({
            capability_slug: critiqueCapabilitySlug,
            intent_slug: critiqueIntentSlug,
            agent_id: critiqueAgentId,
            task_context: turn.tool_input,
            tenant_id,
            _hop_counter: hopCounter,
            _deadline: deadline,
            _onEvent: onEvent,
            // FEATURE: LOG-49 -- this nested call previously threaded no _trace_id, so its rows fell
            // outside the interaction's trace; a bare parent_span_id link across a trace boundary is
            // meaningless. Thread both, so the critique execution joins the same trace and points its
            // parent_span_id at this execution -- consistent with dispatchDelegation()'s nested calls.
            _trace_id: trace_id, _parent_span_id: span_id,
          });
        }
        // FEATURE: HAR-18 -- the critique dispatch can checkpoint mid-flight. There is no tool_use
        // in conversationHistory for a critique (it fires in the terminal text branch), so the
        // waiting_on_job_id resume shape cannot carry it. Deliberate v1 degrade: proceed to the
        // confirmation gate without a critique rather than storing a {status:'in_progress'} job
        // stub into pending_confirmations.critique (the corruption this fixes). The orphaned
        // nested critique row is bounded, logged here, and tracked under HAR-18's residual note
        // in docs/FEATURES.md.
        if (critique?.status === 'in_progress') {
          console.error(`[execute] critique dispatch checkpointed mid-flight (job ${critique.job_id}); proceeding without critique`);
          critique = null;
        }
        const confirmation_id = await insertPendingConfirmation({
          tenant_id, agent_id, capability_slug, intent_slug,
          proposed_action: turn.tool_input, critique,
          prompt_request: { system_prompt: enriched.system_prompt, format_contract: enriched.format_contract, llm: enriched.llm },
          delegation_occurred: delegationOccurred, depth,
        });
        // FEATURE: LOO-20 -- on a resumed job (job_id set) the gate fires without any row patch,
        // leaving the durable_hops row orphaned at 'in_progress' and re-resumable into a DUPLICATE
        // pending_confirmations insert. Mark it terminal here, mirroring the plain terminal path's
        // own patch below -- a stray re-resume then hits resumeCapability()'s already-terminal
        // early-return and does nothing. (Fresh top-level calls have no job_id, unchanged.)
        if (job_id) {
          await patchDurableHopRow(job_id, {
            status: 'complete',
            result: { status: 'pending_confirmation', confirmation_id, proposed_action: turn.tool_input, critique, depth, agent_id, capability_slug },
          });
        }
        return { status: 'pending_confirmation', confirmation_id, proposed_action: turn.tool_input, critique, depth, agent_id, capability_slug };
      }

      // FEATURE: HAR-04 -- same deadline passthrough as the callModel() call above.
      const result = await sendRequest({
        prompt_request: enriched, agent_id, capability_slug, tenant_id,
        precomputed_turn: turn, delegation_occurred: delegationOccurred,
        turn_started_at: turnStart,
        // FEATURE: LOG-49 -- the terminal model-call write gets the same span links and the
        // integrate flag: if this final answer's input embedded a delegate's returned result, its
        // row carries input_references_other_deliverable: true.
        trace_id, span_id, parent_span_id, input_references_other_deliverable: integratedDelegateResult, deadline,
      });
      // FEATURE: LOG-79 -- the response now carries the loop's trace identity (generic, every
      // capability identically) so the client can join hop events to the ai_call_patterns view.
      // Deliberately NOT added to error/pending_confirmation/depth_exceeded returns -- those
      // never display pattern lines.
      const finalResult = { ...result, display_agent_card, display_agent_id: display_agent_id || null, last_help_selection: lastHelpSelection, trace_id, span_id };
      if (job_id) {
        await patchDurableHopRow(job_id, { status: 'complete', result: finalResult });
      }
      return finalResult;
    }

    // FEATURE: AA-87 -- turn.is_delegate_call is now true only for the two harness-generic
    // tools (request_help, delegate_to_agent) -- there is no more data-driven delegate array
    // to match against. The same shared hopCounter ceiling applies to both. ARCHITECTURE.md §19d.
    if (hopCounter.n >= MAX_LOOP_DEPTH) {
      return { status: 'depth_exceeded', depth: MAX_LOOP_DEPTH, agent_id, capability_slug };
    }
    hopCounter.n++;
    delegationOccurred = true;

    // FEATURE: S-ARCH-DURABLE-RESUME-02 (AA-185/AA-187) -- the assistant's own decision turn is
    // appended to conversationHistory exactly once, here, immediately after callModel() returns a
    // delegate call and BEFORE the new pre-dispatch budget check below -- so it is already present
    // in conversationHistory whether this hop dispatches live or checkpoints pending.
    conversationHistory = [
      ...(conversationHistory.length > 0 ? conversationHistory : [{ role: 'user', content: enriched.system_prompt }]),
      { role: 'assistant', content: turn.raw_content },
    ];

    // FEATURE: S-ARCH-DURABLE-RESUME-02 (AA-185/AA-187) -- the fix: check budget BEFORE dispatch,
    // not after. Before this, onEvent fired and the nested runCapability() call started immediately
    // after the model decided to delegate, with no check that there was enough remaining budget for
    // that nested call to finish. If it checkpointed mid-flight, the outer call also checkpointed
    // (AA-141), and on resume, resumeCapability() re-entered runLoop() from persisted
    // conversation_history -- re-asking the model for a turn it already answered (AA-185's duplicate
    // "routing to X" event) while the nested call's own partial work was simply abandoned, never
    // resumed (AA-187's orphaned durable_hops rows). Checkpointing HERE instead -- before onEvent
    // fires, before the nested call starts -- persists the already-decided delegation
    // (pendingDelegation) so the resume can dispatch it directly with a fresh full budget: no
    // re-asking the model, no re-firing onEvent, no partial nested work ever started until there's a
    // real budget to finish it.
    const preDispatchRemainingMs = __testPreDispatchBudgetMs !== null ? __testPreDispatchBudgetMs : (deadline - Date.now());
    // FEATURE: AA-196 -- estimate the NEXT call's profile, not the current hop's: for
    // delegate_to_agent the target is already known (turn.tool_input), for request_help the
    // next call is always project-manager/agent-selection-intent -- the same fixed broker
    // relationship resolveCapabilityHolder('project-manager') already encodes elsewhere in
    // this file, not a new hardcode.
    const nextCapabilitySlug = turn.tool_name === 'delegate_to_agent' ? turn.tool_input?.capability_slug : 'project-manager';
    const nextIntentSlug = turn.tool_name === 'delegate_to_agent' ? turn.tool_input?.intent_slug : 'agent-selection-intent';
    const preDispatchReserveMs = await getHopBudgetReserveMs(nextCapabilitySlug, nextIntentSlug);
    if (preDispatchRemainingMs < preDispatchReserveMs) {
      return checkpointAndReturn({
        job_id, tenant_id, capability_slug, intent_slug, agent_id, enriched, canRequestHelp, delegationRequired,
        requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug,
        task_context, conversationHistory, depth, delegationOccurred, lastHelpSelection,
        pendingDelegation: { via_tool: turn.tool_name, tool_input: turn.tool_input, tool_use_id: turn.tool_use_id },
        enableWebSearch,
        trace_id, span_id, parent_span_id,
        // FEATURE: LOG-71 -- carry LOG-67's frozen config-half onto the row so the resume recovers it.
        signatureConfig,
      });
    }

    const dispatchOutcome = await dispatchDelegation({
      via_tool: turn.tool_name, tool_input: turn.tool_input, tool_use_id: turn.tool_use_id,
      agent_id, capability_slug, intent_slug, tenant_id, task_context, delegationRequired,
      conversationHistory, hopCounter, deadline, job_id, delegationOccurred, lastHelpSelection, onEvent,
      // FEATURE: LOG-49 -- hand this execution's span down so nested delegate executions point their
      // parent_span_id at it.
      trace_id, span_id,
    });
    if (dispatchOutcome.outcome === 'final') return dispatchOutcome.result;
    if (dispatchOutcome.outcome === 'nested_checkpoint') {
      return checkpointAndReturn({
        job_id, tenant_id, capability_slug, intent_slug, agent_id, enriched, canRequestHelp, delegationRequired,
        requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug,
        task_context, conversationHistory, depth, delegationOccurred, lastHelpSelection: dispatchOutcome.lastHelpSelection,
        pendingDelegation: { waiting_on_job_id: dispatchOutcome.waitingOnJobId, tool_use_id: dispatchOutcome.toolUseId },
        enableWebSearch,
        trace_id, span_id, parent_span_id,
        // FEATURE: LOG-71 -- carry LOG-67's frozen config-half onto the row so the resume recovers it.
        signatureConfig,
      });
    }
    conversationHistory = dispatchOutcome.conversationHistory;
    lastHelpSelection = dispatchOutcome.lastHelpSelection;
    // FEATURE: LOG-49 -- a 'continue' outcome means dispatchDelegation() just folded the delegate's
    // returned result into conversationHistory (execute.js's tool_result append). Every subsequent
    // turn's input now embeds that real prior output -- set the fact-2 flag for the rest of the loop.
    integratedDelegateResult = true;
  }
}

// FEATURE: AA-76 — core logic exported separately from the HTTP handler so the Node.js test
// can call it directly, same pattern as runChannelIntelligence/assemblePrompt/enrichPrompt.
// FEATURE: AA-139 — builds `enriched` exactly as before, then hands off to the shared runLoop().
// _deadline is threaded exactly like the existing _hop_counter pattern: a nested call (request_help
// broker turn, delegate_to_agent hop, critique dispatch) inherits its caller's real deadline
// instead of computing a fresh 60s window of its own, so the shared per-request ceiling stays
// real across the whole chain, not just the top-level invocation.
export async function runCapability({
  capability_slug,
  intent_slug = null,
  agent_id,
  task_context,
  runtime_context = null,
  tenant_id = 'global',
  enrichment_capability_slug = null,
  format_skill_profile_slug = null,
  display_agent_id = null,
  _hop_counter = null,
  _deadline = null,
  _onEvent = null,
  _trace_id = null,
  // FEATURE: LOG-49 -- the caller's span, threaded in by every nested runCapability() dispatch
  // (dispatchDelegation()'s 3 sites, the critique call). Null on a genuinely fresh top-level call,
  // which is exactly a root span with no parent.
  _parent_span_id = null,
}) {
  if (!capability_slug) throw new Error('capability_slug required');
  if (!agent_id) throw new Error('agent_id required');
  if (!task_context) throw new Error('task_context required');
  // FEATURE: MI-42 -- defaults to a no-op so every existing/future caller that never passes
  // _onEvent is completely unaffected (byte-identical behavior, zero overhead). Threaded to
  // runLoop() exactly like _hop_counter/_deadline already are -- explicit param, never closure
  // state, so it survives arbitrarily deep nested runCapability() recursion unchanged.
  const onEvent = _onEvent || (() => {});

  // FEATURE: AI-46a -- generated once per genuinely fresh top-level call (mirrors the existing
  // _deadline || (...) pattern one line above: _trace_id is unset only when this is NOT a nested
  // dispatch). Every nested runCapability() call (dispatchDelegation()'s 3 call sites) threads the
  // parent's own traceId through _trace_id, so one interaction keeps one identifier across every
  // hop and every nested delegate, regardless of how many separate durable_hops rows (job_ids) it
  // spans.
  const traceId = _trace_id || crypto.randomUUID();

  // FEATURE: LOG-49 -- one span per capability EXECUTION (never per agent -- span_id identifies the
  // call, not who ran it, keeping the signature agent-agnostic). Always freshly minted for this
  // execution (unlike traceId, which is inherited across a whole interaction): every turn/row this
  // execution writes shares this spanId, and a delegated child execution points its parent_span_id
  // here. parentSpanId is the caller's span (null for a fresh top-level call = a root span).
  const spanId = crypto.randomUUID();
  const parentSpanId = _parent_span_id;

  const promptRequest = await assemblePrompt({
    capability_slug,
    agent_id,
    tenant_id,
    task_context,
    runtime_context,
    intent_slug,
    enrichment_capability_slug,
  });

  const enriched = await enrichPrompt({ prompt_request: promptRequest, agent_id, capability_slug, trace_id: traceId });

  let display_agent_card = null;
  if (format_skill_profile_slug) {
    const { formatContract, formatSection, displayAgentCard } = await fetchFormatOverride({
      format_skill_profile_slug, display_agent_id, tenant_id,
    });
    if (formatContract) {
      enriched.system_prompt = (enriched.system_prompt || '') + '\n\n---\n\n' + formatSection;
      enriched.format_contract = formatContract;
    }
    display_agent_card = displayAgentCard;
  }

  // FEATURE: AA-87 -- canRequestHelp/requiresHumanConfirmation/critique* read from promptRequest
  // (db-assembly's raw output), never from `enriched` -- same reason the old `delegates` field
  // bypassed it: ai-enrichment.js rebuilds its own return object and drops unknown fields.
  const canRequestHelp = promptRequest.canRequestHelp === true;
  // FEATURE: HAR-05 -- same read-from-promptRequest reasoning as canRequestHelp directly above.
  const enableWebSearch = promptRequest.enableWebSearch === true;
  const delegationRequired = promptRequest.delegationRequired === true;
  const requiresHumanConfirmation = promptRequest.requiresHumanConfirmation === true;
  const critiqueCapabilitySlug = promptRequest.critiqueCapabilitySlug || null;
  const critiqueIntentSlug = promptRequest.critiqueIntentSlug || null;

  // FEATURE: AA-139 -- computed only when this is the top-level call (no _deadline passed in).
  // SAFETY_MARGIN_MS is reserved off the real 60s ceiling for the checkpoint write + response
  // round trip on whichever hop ultimately triggers it.
  const deadline = _deadline || (Date.now() + 60000 - SAFETY_MARGIN_MS);

  try {
    return await runLoop({
      capability_slug, intent_slug, agent_id, tenant_id, task_context, enriched, canRequestHelp,
      enableWebSearch,
      delegationRequired,
      requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug,
      display_agent_id, display_agent_card,
      conversationHistory: [], delegationOccurred: false, lastHelpSelection: null,
      hopCounter: _hop_counter || { n: 0 }, deadline, job_id: null,
      trace_id: traceId,
      // FEATURE: LOG-49 -- this execution's span + its caller's span, threaded through the loop.
      span_id: spanId, parent_span_id: parentSpanId,
      onEvent,
      // FEATURE: LOG-67 -- read the config-half off promptRequest (db-assembly's raw output), NOT
      // `enriched` -- keeps the agent-turn write path independent of the enrichment passthrough.
      signatureConfig: promptRequest.signature_config ?? null,
    });
  } catch (e) {
    await persistFailureAndRethrow(e, { job_id: null, tenant_id, capability_slug, intent_slug, agent_id, enriched, canRequestHelp, delegationRequired, task_context, trace_id: traceId, span_id: spanId, parent_span_id: parentSpanId });
  }
}

// FEATURE: AA-139 -- resumes a chain runLoop() previously checkpointed. Loads the persisted state
// from durable_hops (job_id is the only thing the caller needs to carry between invocations) and
// hands off to the same runLoop() a fresh call uses -- no second loop implementation. Gets a
// genuinely fresh deadline (this is a new invocation with its own real 60s budget), not the
// exhausted one that triggered the checkpoint.
// FEATURE: LOO-20 -- requires_human_confirmation + critique_capability_slug/critique_intent_slug
// ARE now persisted on durable_hops (this session's migration) and recovered on every resume
// below, so a resumed confirmation-gated chain re-lands on the gate at execute.js's
// requiresHumanConfirmation branch instead of silently skipping it (the empty-Draft-Forecast /
// bypassed-Data-Room bug). The display_agent_id/display_agent_card override fields remain
// un-persisted (a resumed chain runs without a display-card override) -- out of this fix's scope.
export async function resumeCapability({ job_id, _onEvent = null }) {
  if (!job_id) throw new Error('job_id required');
  const row = await loadDurableHopRow(job_id);

  if (row.status !== 'in_progress') {
    return { status: row.status, job_id, result: row.result, error: row.error };
  }

  // FEATURE: AI-46a -- recovered from the persisted row, never freshly generated on resume, so a
  // resumed hop keeps the exact same identifier every prior hop in this chain already wrote.
  const traceId = row.trace_id;
  // FEATURE: LOG-49 -- same round-trip as traceId: recover the span so a resumed continuation keeps
  // its ORIGINAL span identity (and parent), rather than minting a new one -- the parent->child tree
  // stays intact across a checkpoint. The || fallback covers only pre-migration rows (null span).
  const spanId = row.span_id || crypto.randomUUID();
  const parentSpanId = row.parent_span_id ?? null;

  const enriched = {
    system_prompt: row.system_prompt,
    format_contract: row.format_contract,
    llm: row.llm,
  };
  const deadline = Date.now() + 60000 - SAFETY_MARGIN_MS;
  // FEATURE: MI-42 -- same no-op-default pattern as runCapability() above.
  const onEvent = _onEvent || (() => {});

  try {
    // FEATURE: S-ARCH-DURABLE-RESUME-02 (AA-185/AA-187) -- if the checkpoint that produced this row
    // captured an already-decided-but-undispatched delegation, dispatch it directly with this fresh
    // full budget instead of re-entering runLoop() from persisted conversation_history, which would
    // re-ask the model for a turn it already answered (AA-185) and never resume the nested call's own
    // partial work (AA-187). This is the one and only place pending_delegation is read.
    // FEATURE: AA-195 (S-ARCH-NESTED-RESUME-01) -- a previous resume dispatched this delegation,
    // but the nested target itself checkpointed before returning a result (S-ARCH-DURABLE-RESUME-02's
    // unfinished second half). Actively resume the nested job so this outer resume drives real
    // progress down the whole chain in one call -- resumeCapability() is idempotent on an
    // already-terminal row (the early-return at the top of this function), so calling it
    // unconditionally here is safe whether the nested job is still running or already done.
    if (row.pending_delegation?.waiting_on_job_id) {
      const waitingOnId = row.pending_delegation.waiting_on_job_id;
      try {
        await resumeCapability({ job_id: waitingOnId, _onEvent: onEvent });
      } catch (nestedError) {
        await patchDurableHopRow(row.id, { status: 'failed', error: `Nested delegation (job ${waitingOnId}) failed: ${nestedError.message}` });
        throw nestedError;
      }
      // Re-read canonical state from the row rather than trusting resumeCapability()'s return
      // value directly -- its return shape differs between a fresh completion (raw result object)
      // and an already-terminal early-return ({status, result, error}); the persisted row is
      // always the same shape either way.
      const nestedRow = await loadDurableHopRow(waitingOnId);
      if (nestedRow.status === 'in_progress') {
        // Still waiting -- re-persist the exact same wait-state, unchanged. The next resume of
        // THIS job (client's existing resolveInProgress() poll loop, no new client code needed)
        // will drive the nested job forward again with a fresh full budget.
        return checkpointAndReturn({
          job_id: row.id, tenant_id: row.tenant_id, capability_slug: row.capability_slug, intent_slug: row.intent_slug,
          agent_id: row.agent_id, enriched, canRequestHelp: row.can_request_help, delegationRequired: row.delegation_required === true,
          // FEATURE: LOO-20 -- recover the confirmation-gate overrides from the row so they survive
          // multiple checkpoint->resume cycles (same pattern delegation_required already follows here).
          requiresHumanConfirmation: row.requires_human_confirmation === true, critiqueCapabilitySlug: row.critique_capability_slug || null, critiqueIntentSlug: row.critique_intent_slug || null,
          task_context: row.task_context ?? null, conversationHistory: row.conversation_history || [], depth: row.hop_counter || 0,
          delegationOccurred: !!row.delegation_occurred, lastHelpSelection: row.last_help_selection || null,
          pendingDelegation: row.pending_delegation,
          // FEATURE: HAR-17 -- re-persist the recovered flag so it survives multiple checkpoint->
          // resume cycles (same pattern delegation_required already follows here).
          enableWebSearch: row.enable_web_search === true,
          trace_id: traceId, span_id: spanId, parent_span_id: parentSpanId,
          // FEATURE: LOG-71 -- re-persist the recovered snapshot so it survives repeated
          // checkpoint->resume cycles, the identical pattern enable_web_search follows above.
          signatureConfig: row.signature_config ?? null,
        });
      }
      if (nestedRow.status === 'failed') {
        // The nested delegate never produced a result -- fail this job with a real, honest error
        // instead of feeding Anthropic a conversation history with an unresolved tool_use block
        // (the exact defect this session fixes).
        await patchDurableHopRow(row.id, { status: 'failed', error: `Nested delegation (job ${waitingOnId}) failed: ${nestedRow.error || 'unknown error'}` });
        // FEATURE: HAR-17 -- terminal stamp (audit hardening): the nested job already spent its own
        // recovery inside its own runLoop() (§19o recursion); this synthesized error is permanent by
        // construction, so no present or future catch site can ever classify it transient.
        throw Object.assign(new Error(`Nested delegation failed: ${nestedRow.error || 'unknown error'}`), { failureClass: 'permanent', faultCode: 'nested-terminal' });
      }
      // nestedRow.status === 'complete' -- build the same tool_result shape dispatchDelegation()
      // already builds on a live 'continue' outcome (execute.js:386-389), then resume the loop
      // exactly as if dispatch had just succeeded live.
      const conversationHistory = [
        ...(row.conversation_history || []),
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: row.pending_delegation.tool_use_id, content: JSON.stringify(nestedRow.result) }] },
      ];
      return await runLoop({
        capability_slug: row.capability_slug, intent_slug: row.intent_slug, agent_id: row.agent_id, tenant_id: row.tenant_id,
        task_context: row.task_context ?? null, enriched, canRequestHelp: row.can_request_help,
        delegationRequired: row.delegation_required === true,
        // FEATURE: LOO-20 -- recover the confirmation gate from the persisted row (was hardcoded
        // false, which silently dropped the human-confirmation card on any resumed gated chain).
        requiresHumanConfirmation: row.requires_human_confirmation === true,
        critiqueCapabilitySlug: row.critique_capability_slug || null, critiqueIntentSlug: row.critique_intent_slug || null,
        // FEATURE: HAR-17 -- recover the web-search flag and the per-hop recovery ledger from the
        // persisted row, so a resumed hop keeps §19o's once-per-hop bound and its real search flag.
        enableWebSearch: row.enable_web_search === true, recoveryLedger: row.recovery_ledger || [],
        display_agent_id: null, display_agent_card: null,
        conversationHistory, delegationOccurred: true,
        lastHelpSelection: row.last_help_selection || null, hopCounter: { n: row.hop_counter || 0 },
        deadline, job_id: row.id, trace_id: traceId, span_id: spanId, parent_span_id: parentSpanId, onEvent,
        // FEATURE: LOG-71 -- recover LOG-67's frozen config-half from the persisted row so a resumed hop
        // logs the SAME signature its pre-checkpoint hops did, rather than a fact-half-only row that can
        // never match a config-half criterion. Frozen, not recomputed: buildSignatureConfig() would read
        // today's skill profiles and reintroduce exactly the drift LOG-67 exists to prevent. Null only on
        // a pre-migration row (one-time, self-clearing).
        signatureConfig: row.signature_config ?? null,
      });
    }

    if (row.pending_delegation) {
      const dispatchOutcome = await dispatchDelegation({
        via_tool: row.pending_delegation.via_tool, tool_input: row.pending_delegation.tool_input, tool_use_id: row.pending_delegation.tool_use_id,
        agent_id: row.agent_id, capability_slug: row.capability_slug, intent_slug: row.intent_slug, tenant_id: row.tenant_id,
        task_context: row.task_context ?? null, delegationRequired: row.delegation_required === true,
        conversationHistory: row.conversation_history || [], hopCounter: { n: row.hop_counter || 0 }, deadline,
        job_id: row.id, delegationOccurred: !!row.delegation_occurred, lastHelpSelection: row.last_help_selection || null, onEvent,
        trace_id: traceId, span_id: spanId,
      });
      if (dispatchOutcome.outcome === 'final') return dispatchOutcome.result;
      if (dispatchOutcome.outcome === 'nested_checkpoint') {
        // FEATURE: LOG-71 -- signatureConfig re-persists the recovered snapshot so it survives
        // repeated checkpoint->resume cycles, the identical pattern enable_web_search follows here.
        return checkpointAndReturn({ job_id: row.id, tenant_id: row.tenant_id, capability_slug: row.capability_slug, intent_slug: row.intent_slug, agent_id: row.agent_id, enriched, canRequestHelp: row.can_request_help, delegationRequired: row.delegation_required === true, requiresHumanConfirmation: row.requires_human_confirmation === true, critiqueCapabilitySlug: row.critique_capability_slug || null, critiqueIntentSlug: row.critique_intent_slug || null, task_context: row.task_context ?? null, conversationHistory: row.conversation_history || [], depth: row.hop_counter || 0, delegationOccurred: !!row.delegation_occurred, lastHelpSelection: dispatchOutcome.lastHelpSelection, pendingDelegation: { waiting_on_job_id: dispatchOutcome.waitingOnJobId, tool_use_id: dispatchOutcome.toolUseId }, enableWebSearch: row.enable_web_search === true, trace_id: traceId, span_id: spanId, parent_span_id: parentSpanId, signatureConfig: row.signature_config ?? null });
      }
      // FEATURE: AI-46a -- this runLoop() continuation (the post-dispatch "continue" outcome, resumed
      // chain's own delegate hop having completed live above rather than checkpointing again) is not
      // one of the two runLoop() call sites the kickoff doc's Task 4g explicitly enumerated, but it is
      // the same category of continuation as both of those (a resumed loop picking back up after a
      // dispatch), and skipping it would silently drop trace_id partway through exactly the nested-
      // checkpoint scenario this feature exists to prove out. Threaded here for that reason.
      return await runLoop({
        capability_slug: row.capability_slug, intent_slug: row.intent_slug, agent_id: row.agent_id, tenant_id: row.tenant_id,
        task_context: row.task_context ?? null, enriched, canRequestHelp: row.can_request_help,
        delegationRequired: row.delegation_required === true,
        // FEATURE: LOO-20 -- recover the confirmation gate from the persisted row (was hardcoded
        // false, which silently dropped the human-confirmation card on any resumed gated chain).
        requiresHumanConfirmation: row.requires_human_confirmation === true,
        critiqueCapabilitySlug: row.critique_capability_slug || null, critiqueIntentSlug: row.critique_intent_slug || null,
        // FEATURE: HAR-17 -- recover the web-search flag and the per-hop recovery ledger from the
        // persisted row, so a resumed hop keeps §19o's once-per-hop bound and its real search flag.
        enableWebSearch: row.enable_web_search === true, recoveryLedger: row.recovery_ledger || [],
        display_agent_id: null, display_agent_card: null,
        conversationHistory: dispatchOutcome.conversationHistory, delegationOccurred: true,
        lastHelpSelection: dispatchOutcome.lastHelpSelection, hopCounter: { n: row.hop_counter || 0 },
        deadline, job_id: row.id, trace_id: traceId, span_id: spanId, parent_span_id: parentSpanId, onEvent,
        // FEATURE: LOG-71 -- recover LOG-67's frozen config-half from the persisted row so a resumed hop
        // logs the SAME signature its pre-checkpoint hops did, rather than a fact-half-only row that can
        // never match a config-half criterion. Frozen, not recomputed: buildSignatureConfig() would read
        // today's skill profiles and reintroduce exactly the drift LOG-67 exists to prevent. Null only on
        // a pre-migration row (one-time, self-clearing).
        signatureConfig: row.signature_config ?? null,
      });
    }
    return await runLoop({
      // FEATURE: S-ARCH-DURABLE-RESUME-01 (AA-145) -- durable_hops now persists the original
      // task_context (this session's migration adds the column, and Task 2/3 thread it into every
      // createDurableHopRow() call). A delegate_to_agent hop that fires after a resume now forwards
      // the real structured task_context instead of falling back to task-string-only forwarding --
      // fixes the live-confirmed AA-145 data-loss bug (Alex's "I don't see the raw answer data").
      capability_slug: row.capability_slug, intent_slug: row.intent_slug, agent_id: row.agent_id, tenant_id: row.tenant_id,
      task_context: row.task_context ?? null,
      enriched, canRequestHelp: row.can_request_help,
      // FEATURE: AA-148 -- durable_hops now persists delegation_required (this session's
      // migration, Task 1); a resumed chain re-reads the real value instead of silently losing
      // AA-142's guard. Closes the accepted gap AA-142 deferred ("real need to persist it can be
      // its own future session") -- proven live-exploitable by this session's own reproduction
      // (see kickoff CONTEXT, Gap 2).
      delegationRequired: row.delegation_required === true,
      // FEATURE: LOO-20 -- recover the confirmation gate from the persisted row (was hardcoded false).
      requiresHumanConfirmation: row.requires_human_confirmation === true, critiqueCapabilitySlug: row.critique_capability_slug || null, critiqueIntentSlug: row.critique_intent_slug || null,
      // FEATURE: HAR-17 -- recover the web-search flag and the per-hop recovery ledger from the
      // persisted row, so a resumed hop keeps §19o's once-per-hop bound and its real search flag.
      enableWebSearch: row.enable_web_search === true, recoveryLedger: row.recovery_ledger || [],
      display_agent_id: null, display_agent_card: null,
      conversationHistory: row.conversation_history || [], delegationOccurred: !!row.delegation_occurred,
      lastHelpSelection: row.last_help_selection || null, hopCounter: { n: row.hop_counter || 0 },
      deadline, job_id: row.id, trace_id: traceId, span_id: spanId, parent_span_id: parentSpanId,
      onEvent,
      // FEATURE: LOG-71 -- recover LOG-67's frozen config-half from the persisted row so a resumed hop
      // logs the SAME signature its pre-checkpoint hops did, rather than a fact-half-only row that can
      // never match a config-half criterion. Frozen, not recomputed: buildSignatureConfig() would read
      // today's skill profiles and reintroduce exactly the drift LOG-67 exists to prevent. Null only on
      // a pre-migration row (one-time, self-clearing).
      signatureConfig: row.signature_config ?? null,
    });
  } catch (e) {
    // FEATURE: S-ARCH-DURABLE-RESUME-01 (AA-141) -- DB bookkeeping only: a genuinely-failed resumed
    // job previously sat at status 'in_progress' forever (orphaned), even though the schema's own
    // check constraint already includes 'failed'. This does not change the existing HTTP error
    // contract/500 response -- the error is re-thrown unchanged, only the row is marked so it stops
    // looking like a live, resumable job.
    // FEATURE: AA-195 (S-ARCH-FAILURE-DETAIL-01) -- now persists the full rejected-request detail
    // (formatErrorForPersistence()), not just e.message, so Supabase alone has enough evidence to
    // diagnose a failure like AA-195's without external Vercel log access.
    await persistFailureAndRethrow(e, { job_id, tenant_id: row.tenant_id, capability_slug: row.capability_slug, intent_slug: row.intent_slug, agent_id: row.agent_id, enriched, canRequestHelp: row.can_request_help, delegationRequired: row.delegation_required === true, task_context: row.task_context ?? null, trace_id: traceId, span_id: spanId, parent_span_id: parentSpanId });
  }
}

// FEATURE: AA-103 -- accept resolution, exported separately so the Node.js test can call it
// directly (same reasoning as runCapability's own export). Checks whether the confirmed intent
// declares a follow-up intent to run now that a human has approved (on_accept_intent_slug)
// before falling back to the original terminal-dispatch behavior (resolvePendingConfirmation) --
// unchanged for any intent that doesn't declare one. This is what lets an agent who needed a
// human's OK before acting actually go act on it afterward, via the same request_help loop every
// other cross-agent hand-off uses -- never a direct call to whichever agent ends up executing it.
// ARCHITECTURE.md §19b/§19d, PLATFORM-AGENT-RULEBOOK.md AR-2.2/2.3/3.1.
export async function resolveAccept({ confirmation_id, _onEvent = null }) {
  const row = await getPendingConfirmation(confirmation_id);
  if (!row) throw Object.assign(new Error('confirmation not found'), { status: 404 });
  // FEATURE: LOO-17 -- same guard widening as resolvePendingConfirmation() (Task 2).
  if (!['pending', 'accept_failed'].includes(row.status)) {
    throw Object.assign(new Error(`confirmation already ${row.status}`), { status: 409 });
  }

  const onAcceptIntentSlug = await getOnAcceptIntentSlug(row.intent_slug);
  if (!onAcceptIntentSlug) {
    return resolvePendingConfirmation({ confirmation_id, resolution: 'accept' });
  }

  let result;
  try {
    result = await runCapability({
      capability_slug: row.capability_slug,
      intent_slug: onAcceptIntentSlug,
      agent_id: row.agent_id,
      task_context: row.proposed_action,
      tenant_id: row.tenant_id,
      _onEvent,
    });
  } catch (e) {
    // FEATURE: LOO-17 -- a fast/synchronous failure is exactly as exhausted as one that failed
    // after a checkpoint (HAR-8's 3 attempts already happened inside this call before this throw
    // surfaced) -- mark it accept_failed consistently, not silently pending.
    await markAcceptFailed(confirmation_id, e);
    throw e;
  }

  // FEATURE: LOO-17 -- a checkpoint is not a completed result. Link the job so the `continue`
  // branch (Task 4) can close this out for real once it actually finishes.
  if (result.status === 'in_progress') {
    await linkCheckpointJob(confirmation_id, result.job_id);
    return result;
  }
  await markAcceptedDelegated(confirmation_id, result);
  return result;
}

// FEATURE: MI-42 -- reuses api/plan.js's own proven SSE idiom (text/event-stream, `data: <json>\n\n`
// lines, `data: [DONE]` sentinel) verbatim -- not a new transport. Once streaming starts, the HTTP
// status is locked at 200 (headers already sent), so a mid-chain throw becomes a terminal `error`
// event inside the stream instead of an HTTP 500 -- callCapability()'s stream reader (Task 3) checks
// for this event type explicitly rather than relying on res.ok/res.status for a streamed request.
async function streamResult(res, run) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  try {
    const result = await run((evt) => res.write(`data: ${JSON.stringify(evt)}\n\n`));
    res.write(`data: ${JSON.stringify({ type: 'result', result })}\n\n`);
  } catch (e) {
    // FEATURE: HAR-15 -- forward the harness's fault classification so the screen can render an
    // honest reason instead of pattern-matching the English message. Conditional spreads keep
    // every non-classified throw byte-identical to pre-HAR-15 behavior.
    res.write(`data: ${JSON.stringify({ type: 'error', message: e.message, status: e.status || 500,
      ...(e.upstreamStatus ? { upstreamStatus: e.upstreamStatus } : {}),
      ...(e.failureClass ? { failureClass: e.failureClass } : {}),
      ...(e.faultCode ? { faultCode: e.faultCode } : {}),
      ...(e.detail ? { detail: e.detail } : {}) })}\n\n`);
  }
  res.write('data: [DONE]\n\n');
  res.end();
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // FEATURE: AA-100 -- resolve branch checked first, additive only. No existing caller sends
    // `action`, so the normal run path below is unreached by anything but a resolve request.
    const body = req.body || {};
    if (body.action === 'resolve') {
      const { confirmation_id, resolution, edited_task_context } = body;
      if (!confirmation_id) return res.status(400).json({ error: 'confirmation_id required' });
      if (!['accept', 'reject', 'edit'].includes(resolution)) {
        return res.status(400).json({ error: 'resolution must be accept, reject, or edit' });
      }

      if (resolution === 'edit') {
        const row = await getPendingConfirmation(confirmation_id);
        if (!row) return res.status(404).json({ error: 'confirmation not found' });
        // FEATURE: LOO-17 -- same guard widening as Task 2/3.
        if (!['pending', 'accept_failed'].includes(row.status)) {
          return res.status(409).json({ error: `confirmation already ${row.status}` });
        }
        if (!edited_task_context) return res.status(400).json({ error: 'edited_task_context required for edit' });
        await markEdited(confirmation_id);
        if (body.stream === true) {
          return streamResult(res, (emit) => runCapability({
            capability_slug: row.capability_slug, intent_slug: row.intent_slug,
            agent_id: row.agent_id, task_context: edited_task_context, tenant_id: row.tenant_id,
            _onEvent: emit,
          }));
        }
        const result = await runCapability({
          capability_slug: row.capability_slug, intent_slug: row.intent_slug,
          agent_id: row.agent_id, task_context: edited_task_context, tenant_id: row.tenant_id,
        });
        return res.status(200).json(result);
      }

      // FEATURE: AA-103 -- accept now routes through resolveAccept(), which itself falls back
      // to resolvePendingConfirmation() when the confirmed intent has no on_accept_intent_slug
      // (byte-identical old behavior for reject, and for any accept without one declared).
      if (resolution === 'accept') {
        if (body.stream === true) {
          return streamResult(res, (emit) => resolveAccept({ confirmation_id, _onEvent: emit }));
        }
        const result = await resolveAccept({ confirmation_id });
        return res.status(200).json(result);
      }

      const result = await resolvePendingConfirmation({ confirmation_id, resolution });
      return res.status(200).json(result);
    }

    // FEATURE: AA-139 (S-ARCH-DURABLE-LOOP-02a) -- resumes a chain runLoop() previously
    // checkpointed to durable_hops. Supersedes AA-138's POC-only durable_start/durable_continue
    // branches (removed) -- no new `action` needed for "start": every existing caller's default
    // (no `action` field) already goes through runCapability() unchanged below, and it is now
    // budget-aware automatically, for every capability on the platform, with zero caller-side
    // changes required.
    if (body.action === 'continue') {
      const { job_id } = body;
      if (!job_id) return res.status(400).json({ error: 'job_id required' });
      if (body.stream === true) {
        return streamResult(res, (emit) => resumeCapability({ job_id, _onEvent: emit }));
      }
      try {
        const result = await resumeCapability({ job_id });
        // FEATURE: LOO-17 -- a further in_progress means it checkpointed again, still not done;
        // only close out a linked confirmation on a genuine terminal result.
        if (result.status !== 'in_progress') {
          const linkedConfirmationId = await getConfirmationByCheckpointJobId(job_id);
          if (linkedConfirmationId) await markAcceptedDelegated(linkedConfirmationId, result);
        }
        return res.status(200).json(result);
      } catch (e) {
        // FEATURE: LOO-17 -- close out a linked confirmation as accept_failed before re-throwing;
        // the existing error-response shape/status for the client is completely unchanged (the
        // outer catch below still builds the same response) -- only the confirmation's own durable
        // state differs from today.
        const linkedConfirmationId = await getConfirmationByCheckpointJobId(job_id);
        if (linkedConfirmationId) await markAcceptFailed(linkedConfirmationId, e);
        throw e;
      }
    }

    // FEATURE: AA-83 -- explicit public param list, never a raw req.body spread. Excludes
    // _hop_counter so no external caller can seed or override the platform's hop ceiling.
    const {
      capability_slug, intent_slug, agent_id, task_context, runtime_context,
      tenant_id, enrichment_capability_slug, format_skill_profile_slug, display_agent_id, stream,
    } = req.body || {};
    if (stream === true) {
      return streamResult(res, (emit) => runCapability({
        capability_slug, intent_slug, agent_id, task_context, runtime_context,
        tenant_id, enrichment_capability_slug, format_skill_profile_slug, display_agent_id,
        _onEvent: emit,
      }));
    }
    const result = await runCapability({
      capability_slug, intent_slug, agent_id, task_context, runtime_context,
      tenant_id, enrichment_capability_slug, format_skill_profile_slug, display_agent_id,
    });
    return res.status(200).json(result);
  } catch (e) {
    console.error('[execute] error:', e);
    // FEATURE: AA-158 -- mirror request-receivable.js's own handler (line ~494), which already
    // does this correctly. execute.js imports callModel()/sendRequest() from request-receivable.js
    // directly (function calls, not HTTP) and every MI-screen capability call routes exclusively
    // through THIS handler, never through request-receivable.js's own -- so any error thrown with a
    // .detail field anywhere in the runCapability() call graph (AA-157's retry-rejection detail,
    // AA-147's schema-validation errors, any future .detail-carrying throw) was silently dropped on
    // the only response path that matters, since before .detail existed anywhere in this codebase.
    // FEATURE: HAR-15 -- same conditional forward as the SSE path above; the HTTP status argument
    // is deliberately unchanged (our API's own semantic), the provider's real status rides along
    // as upstreamStatus instead.
    return res.status(e.status || 500).json({
      error: e.message,
      ...(e.upstreamStatus ? { upstreamStatus: e.upstreamStatus } : {}),
      ...(e.failureClass ? { failureClass: e.failureClass } : {}),
      ...(e.faultCode ? { faultCode: e.faultCode } : {}),
      ...(e.detail ? { detail: e.detail } : {}),
    });
  }
}
