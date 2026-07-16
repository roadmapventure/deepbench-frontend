// DeepBench v6.2.31 | api/capabilities/execute.js | S-ARCH-DURABLE-RESUME-02 (AA-185/AA-187) -- pre-dispatch budget check + pending_delegation checkpoint; dispatchDelegation() extracted so a resume dispatches an already-decided delegation directly instead of re-asking the model
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

import { assemblePrompt } from '../prompt/db-assembly.js';
import { enrichPrompt } from '../prompt/ai-enrichment.js';
import { sendRequest, callModel } from '../prompt/request-receivable.js';
import { insertPendingConfirmation, getPendingConfirmation, markEdited, resolvePendingConfirmation, getOnAcceptIntentSlug, markAcceptedDelegated } from '../_lib/handlers/confirmation.js';
import { createDurableHopRow, loadDurableHopRow, patchDurableHopRow } from '../_lib/handlers/durable-loop.js';
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
export async function logAgentTurn({ capability_slug, intent_slug, agent_id, tenant_id, model, depth, latency_ms, is_delegate_call, api_retry_count, input_tokens, output_tokens, intent_technical_services = [], trace_id }) {
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
      ...intent_technical_services,
    ])),
    traceId: trace_id,
  });
}

// FEATURE: AA-87 -- live resolver, replaces the removed executing_agent_id/critique_agent
// fields. A Skill Profile may only name a capability_slug; the harness resolves who currently
// holds it at the moment of dispatch, never a static agent reference. Single-holder assumption
// (AA-93 covers the future multi-holder case -- not built here). ARCHITECTURE.md §19d/§19e.
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
  return rows[0].agent_id;
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
async function checkpointAndReturn({ job_id, tenant_id, capability_slug, intent_slug, agent_id, enriched, canRequestHelp, delegationRequired, task_context, conversationHistory, depth, delegationOccurred, lastHelpSelection, pendingDelegation, trace_id }) {
  let row_id = job_id;
  if (!row_id) {
    const row = await createDurableHopRow({
      tenant_id, capability_slug, intent_slug, agent_id, task_context,
      system_prompt: enriched.system_prompt, format_contract: enriched.format_contract,
      llm: { model: enriched.llm.model, max_tokens: enriched.llm.max_tokens, temperature: enriched.llm.temperature }, can_request_help: canRequestHelp,
      delegation_required: delegationRequired === true,
      trace_id,
    });
    row_id = row.id;
  }
  await patchDurableHopRow(row_id, {
    conversation_history: conversationHistory, hop_counter: depth,
    delegation_occurred: delegationOccurred, last_help_selection: lastHelpSelection,
    pending_delegation: pendingDelegation ?? null,
  });
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
async function persistFailureAndRethrow(e, { job_id, tenant_id, capability_slug, intent_slug, agent_id, enriched, canRequestHelp, delegationRequired, task_context, trace_id }) {
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
  await patchDurableHopRow(row_id, { status: 'failed', error: formatErrorForPersistence(e) });
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
}) {
  let delegateResult;
  let returningFromAgentId = null;
  let returningFromCapabilitySlug = null;

  if (via_tool === 'request_help') {
    const pmAgentId = await resolveCapabilityHolder('project-manager');
    onEvent({ type: 'delegation', fromAgentId: agent_id, fromCapabilitySlug: capability_slug, toAgentId: pmAgentId, toCapabilitySlug: 'project-manager', toIntentSlug: 'agent-selection-intent', viaTool: 'request_help' });
    delegateResult = await runCapability({
      capability_slug: 'project-manager', intent_slug: 'agent-selection-intent', agent_id: pmAgentId,
      task_context: JSON.stringify(tool_input), tenant_id, _hop_counter: hopCounter, _deadline: deadline, _onEvent: onEvent,
      _trace_id: trace_id,
    });
    lastHelpSelection = {
      selected_by_agent_id: pmAgentId,
      reasoning: delegateResult?.content?.reasoning ?? null,
      candidates_considered: delegateResult?.content?.candidates ?? null,
    };

    if (delegationRequired) {
      const rec = delegateResult?.content;
      const matchedCandidate = rec?.candidates?.find(c => c.agent_id === rec.recommended_agent_id && c.capability_slug === rec.recommended_capability_slug);
      if (!rec?.recommended_agent_id || !matchedCandidate) {
        throw new Error(`request_help: delegationRequired capability's agent-selection-intent response had no valid recommended_agent_id matching a real candidate (capability_slug: ${capability_slug}/${intent_slug})`);
      }
      const delegateTaskContext = (task_context && typeof task_context === 'object')
        ? { ...task_context, delegation_task: tool_input.task_description || tool_input.skill_needed }
        : { delegation_task: tool_input.task_description || tool_input.skill_needed };
      onEvent({ type: 'delegation', fromAgentId: pmAgentId, fromCapabilitySlug: 'project-manager', toAgentId: rec.recommended_agent_id, toCapabilitySlug: rec.recommended_capability_slug, toIntentSlug: matchedCandidate.intent_slug || null, viaTool: 'delegate_to_agent', reasoning: rec.reasoning ?? null });
      const autoResolvedResult = await runCapability({
        capability_slug: rec.recommended_capability_slug, intent_slug: matchedCandidate.intent_slug || null,
        agent_id: rec.recommended_agent_id, task_context: delegateTaskContext, tenant_id, _hop_counter: hopCounter, _deadline: deadline, _onEvent: onEvent,
        _trace_id: trace_id,
      });
      if (autoResolvedResult.status === 'in_progress') {
        return { outcome: 'nested_checkpoint', lastHelpSelection, waitingOnJobId: autoResolvedResult.job_id, toolUseId: tool_use_id };
      }
      return { outcome: 'final', result: await finalizeDelegation({ delegateResult: autoResolvedResult, targetAgentId: rec.recommended_agent_id, targetCapabilitySlug: rec.recommended_capability_slug, targetIntentSlug: matchedCandidate.intent_slug || null, lastHelpSelection, job_id }) };
    }
    returningFromAgentId = pmAgentId;
    returningFromCapabilitySlug = 'project-manager';
  } else if (via_tool === 'delegate_to_agent') {
    const { agent_id: targetAgentId, capability_slug: targetCapabilitySlug, intent_slug: targetIntentSlug, task } = tool_input;
    const delegateTaskContext = (task_context && typeof task_context === 'object') ? { ...task_context, delegation_task: task } : { delegation_task: task };
    onEvent({ type: 'delegation', fromAgentId: agent_id, fromCapabilitySlug: capability_slug, toAgentId: targetAgentId, toCapabilitySlug: targetCapabilitySlug, toIntentSlug: targetIntentSlug || null, viaTool: 'delegate_to_agent' });
    delegateResult = await runCapability({
      capability_slug: targetCapabilitySlug, intent_slug: targetIntentSlug || null, agent_id: targetAgentId,
      task_context: delegateTaskContext, tenant_id, _hop_counter: hopCounter, _deadline: deadline, _onEvent: onEvent,
      _trace_id: trace_id,
    });
    if (delegateResult.status === 'in_progress') {
      return { outcome: 'nested_checkpoint', lastHelpSelection, waitingOnJobId: delegateResult.job_id, toolUseId: tool_use_id };
    }
    if (delegationRequired || tool_input.is_final === true) {
      return { outcome: 'final', result: await finalizeDelegation({ delegateResult, targetAgentId, targetCapabilitySlug, targetIntentSlug, lastHelpSelection, job_id }) };
    }
    returningFromAgentId = targetAgentId;
    returningFromCapabilitySlug = targetCapabilitySlug;
  }

  if (returningFromAgentId) {
    onEvent({ type: 'delegation_return', toAgentId: agent_id, toCapabilitySlug: capability_slug, fromAgentId: returningFromAgentId, fromCapabilitySlug: returningFromCapabilitySlug });
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
  delegationRequired,
  requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug,
  display_agent_id, display_agent_card,
  conversationHistory, delegationOccurred, lastHelpSelection, hopCounter, deadline,
  job_id = null, // set only when resuming -- lets a checkpoint on the very next hop update its own row instead of creating a duplicate
  trace_id, // FEATURE: AI-46a -- always supplied by both real callers (runCapability()/resumeCapability()); pure passthrough, same category as job_id/hopCounter/deadline
  onEvent, // FEATURE: MI-42 -- always a real function by the time this fires; runCapability()/resumeCapability() already default it to a no-op
}) {
  let delegationRetried = false;
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
        task_context, conversationHistory, depth, delegationOccurred, lastHelpSelection,
        pendingDelegation: null,
        trace_id,
      });
    }

    const turnStart = Date.now();
    const turn = await callModel({
      systemPrompt: enriched.system_prompt,
      model: enriched.llm.model,
      max_tokens: enriched.llm.max_tokens,
      temperature: enriched.llm.temperature,
      format_contract: enriched.format_contract,
      canRequestHelp,
      conversation_history: conversationHistory,
    });
    logAgentTurn({
      capability_slug, intent_slug, agent_id, tenant_id,
      model: enriched.llm.model, depth, latency_ms: Date.now() - turnStart,
      is_delegate_call: turn.is_delegate_call, api_retry_count: turn.apiRetryCount || 0,
      input_tokens: turn.usage?.input_tokens ?? null,
      output_tokens: turn.usage?.output_tokens ?? null,
      intent_technical_services: enriched.intent_technical_services || [],
      trace_id,
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
          onEvent({ type: 'delegation', fromAgentId: agent_id, fromCapabilitySlug: capability_slug, toAgentId: critiqueAgentId, toCapabilitySlug: critiqueCapabilitySlug, toIntentSlug: critiqueIntentSlug, viaTool: 'critique' });
          critique = await runCapability({
            capability_slug: critiqueCapabilitySlug,
            intent_slug: critiqueIntentSlug,
            agent_id: critiqueAgentId,
            task_context: turn.tool_input,
            tenant_id,
            _hop_counter: hopCounter,
            _deadline: deadline,
            _onEvent: onEvent,
          });
        }
        const confirmation_id = await insertPendingConfirmation({
          tenant_id, agent_id, capability_slug, intent_slug,
          proposed_action: turn.tool_input, critique,
          prompt_request: { system_prompt: enriched.system_prompt, format_contract: enriched.format_contract, llm: enriched.llm },
          delegation_occurred: delegationOccurred, depth,
        });
        return { status: 'pending_confirmation', confirmation_id, proposed_action: turn.tool_input, critique, depth, agent_id, capability_slug };
      }

      const result = await sendRequest({
        prompt_request: enriched, agent_id, capability_slug, tenant_id,
        precomputed_turn: turn, delegation_occurred: delegationOccurred,
        turn_started_at: turnStart,
        trace_id,
      });
      const finalResult = { ...result, display_agent_card, display_agent_id: display_agent_id || null, last_help_selection: lastHelpSelection };
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
        task_context, conversationHistory, depth, delegationOccurred, lastHelpSelection,
        pendingDelegation: { via_tool: turn.tool_name, tool_input: turn.tool_input, tool_use_id: turn.tool_use_id },
        trace_id,
      });
    }

    const dispatchOutcome = await dispatchDelegation({
      via_tool: turn.tool_name, tool_input: turn.tool_input, tool_use_id: turn.tool_use_id,
      agent_id, capability_slug, intent_slug, tenant_id, task_context, delegationRequired,
      conversationHistory, hopCounter, deadline, job_id, delegationOccurred, lastHelpSelection, onEvent,
      trace_id,
    });
    if (dispatchOutcome.outcome === 'final') return dispatchOutcome.result;
    if (dispatchOutcome.outcome === 'nested_checkpoint') {
      return checkpointAndReturn({
        job_id, tenant_id, capability_slug, intent_slug, agent_id, enriched, canRequestHelp, delegationRequired,
        task_context, conversationHistory, depth, delegationOccurred, lastHelpSelection: dispatchOutcome.lastHelpSelection,
        pendingDelegation: { waiting_on_job_id: dispatchOutcome.waitingOnJobId, tool_use_id: dispatchOutcome.toolUseId },
        trace_id,
      });
    }
    conversationHistory = dispatchOutcome.conversationHistory;
    lastHelpSelection = dispatchOutcome.lastHelpSelection;
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
      delegationRequired,
      requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug,
      display_agent_id, display_agent_card,
      conversationHistory: [], delegationOccurred: false, lastHelpSelection: null,
      hopCounter: _hop_counter || { n: 0 }, deadline, job_id: null,
      trace_id: traceId,
      onEvent,
    });
  } catch (e) {
    await persistFailureAndRethrow(e, { job_id: null, tenant_id, capability_slug, intent_slug, agent_id, enriched, canRequestHelp, delegationRequired, task_context, trace_id: traceId });
  }
}

// FEATURE: AA-139 -- resumes a chain runLoop() previously checkpointed. Loads the persisted state
// from durable_hops (job_id is the only thing the caller needs to carry between invocations) and
// hands off to the same runLoop() a fresh call uses -- no second loop implementation. Gets a
// genuinely fresh deadline (this is a new invocation with its own real 60s budget), not the
// exhausted one that triggered the checkpoint. `requires_human_confirmation`/critique/display
// override fields are not persisted on durable_hops (schema from AA-138, unchanged) -- a resumed
// chain runs without the consequential-action gate and without a display-card override, matching
// AA-138's proven scope; no live path today reaches the gate via a chain that also risks the
// budget ceiling (kickoff SCOPE RULES).
export async function resumeCapability({ job_id, _onEvent = null }) {
  if (!job_id) throw new Error('job_id required');
  const row = await loadDurableHopRow(job_id);

  if (row.status !== 'in_progress') {
    return { status: row.status, job_id, result: row.result, error: row.error };
  }

  // FEATURE: AI-46a -- recovered from the persisted row, never freshly generated on resume, so a
  // resumed hop keeps the exact same identifier every prior hop in this chain already wrote.
  const traceId = row.trace_id;

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
          task_context: row.task_context ?? null, conversationHistory: row.conversation_history || [], depth: row.hop_counter || 0,
          delegationOccurred: !!row.delegation_occurred, lastHelpSelection: row.last_help_selection || null,
          pendingDelegation: row.pending_delegation,
          trace_id: traceId,
        });
      }
      if (nestedRow.status === 'failed') {
        // The nested delegate never produced a result -- fail this job with a real, honest error
        // instead of feeding Anthropic a conversation history with an unresolved tool_use block
        // (the exact defect this session fixes).
        await patchDurableHopRow(row.id, { status: 'failed', error: `Nested delegation (job ${waitingOnId}) failed: ${nestedRow.error || 'unknown error'}` });
        throw new Error(`Nested delegation failed: ${nestedRow.error || 'unknown error'}`);
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
        delegationRequired: row.delegation_required === true, requiresHumanConfirmation: false,
        critiqueCapabilitySlug: null, critiqueIntentSlug: null, display_agent_id: null, display_agent_card: null,
        conversationHistory, delegationOccurred: true,
        lastHelpSelection: row.last_help_selection || null, hopCounter: { n: row.hop_counter || 0 },
        deadline, job_id: row.id, trace_id: traceId, onEvent,
      });
    }

    if (row.pending_delegation) {
      const dispatchOutcome = await dispatchDelegation({
        via_tool: row.pending_delegation.via_tool, tool_input: row.pending_delegation.tool_input, tool_use_id: row.pending_delegation.tool_use_id,
        agent_id: row.agent_id, capability_slug: row.capability_slug, intent_slug: row.intent_slug, tenant_id: row.tenant_id,
        task_context: row.task_context ?? null, delegationRequired: row.delegation_required === true,
        conversationHistory: row.conversation_history || [], hopCounter: { n: row.hop_counter || 0 }, deadline,
        job_id: row.id, delegationOccurred: !!row.delegation_occurred, lastHelpSelection: row.last_help_selection || null, onEvent,
        trace_id: traceId,
      });
      if (dispatchOutcome.outcome === 'final') return dispatchOutcome.result;
      if (dispatchOutcome.outcome === 'nested_checkpoint') {
        return checkpointAndReturn({ job_id: row.id, tenant_id: row.tenant_id, capability_slug: row.capability_slug, intent_slug: row.intent_slug, agent_id: row.agent_id, enriched, canRequestHelp: row.can_request_help, delegationRequired: row.delegation_required === true, task_context: row.task_context ?? null, conversationHistory: row.conversation_history || [], depth: row.hop_counter || 0, delegationOccurred: !!row.delegation_occurred, lastHelpSelection: dispatchOutcome.lastHelpSelection, pendingDelegation: { waiting_on_job_id: dispatchOutcome.waitingOnJobId, tool_use_id: dispatchOutcome.toolUseId }, trace_id: traceId });
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
        delegationRequired: row.delegation_required === true, requiresHumanConfirmation: false,
        critiqueCapabilitySlug: null, critiqueIntentSlug: null, display_agent_id: null, display_agent_card: null,
        conversationHistory: dispatchOutcome.conversationHistory, delegationOccurred: true,
        lastHelpSelection: dispatchOutcome.lastHelpSelection, hopCounter: { n: row.hop_counter || 0 },
        deadline, job_id: row.id, trace_id: traceId, onEvent,
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
      requiresHumanConfirmation: false, critiqueCapabilitySlug: null, critiqueIntentSlug: null,
      display_agent_id: null, display_agent_card: null,
      conversationHistory: row.conversation_history || [], delegationOccurred: !!row.delegation_occurred,
      lastHelpSelection: row.last_help_selection || null, hopCounter: { n: row.hop_counter || 0 },
      deadline, job_id: row.id, trace_id: traceId,
      onEvent,
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
    await persistFailureAndRethrow(e, { job_id, tenant_id: row.tenant_id, capability_slug: row.capability_slug, intent_slug: row.intent_slug, agent_id: row.agent_id, enriched, canRequestHelp: row.can_request_help, delegationRequired: row.delegation_required === true, task_context: row.task_context ?? null, trace_id: traceId });
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
  if (row.status !== 'pending') throw Object.assign(new Error(`confirmation already ${row.status}`), { status: 409 });

  const onAcceptIntentSlug = await getOnAcceptIntentSlug(row.intent_slug);
  if (!onAcceptIntentSlug) {
    return resolvePendingConfirmation({ confirmation_id, resolution: 'accept' });
  }

  const result = await runCapability({
    capability_slug: row.capability_slug,
    intent_slug: onAcceptIntentSlug,
    agent_id: row.agent_id,
    task_context: row.proposed_action,
    tenant_id: row.tenant_id,
    _onEvent,
  });
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
    res.write(`data: ${JSON.stringify({ type: 'error', message: e.message, status: e.status || 500, ...(e.detail ? { detail: e.detail } : {}) })}\n\n`);
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
        if (row.status !== 'pending') return res.status(409).json({ error: `confirmation already ${row.status}` });
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
      const result = await resumeCapability({ job_id });
      return res.status(200).json(result);
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
    return res.status(e.status || 500).json({ error: e.message, ...(e.detail ? { detail: e.detail } : {}) });
  }
}
