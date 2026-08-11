// DeepBench v7.0.90 | lib/activity-log.js | LOG-138 -- write the sixth plumbing column, screen_origin
// (which screen launched the run), read from the same AsyncLocalStorage store: no new parameter and
// no call-site edit, exactly as LOG-121 established
// DeepBench v7.0.39 | lib/activity-log.js | LOG-121 -- chain the once-ever IP->org resolve onto the
// write promise waitUntil() already holds (no second waitUntil, no new param, no call-site change)
// DeepBench v7.0.34 | lib/activity-log.js | LOG-121 -- read the request-scoped caller attribution
// and write its five plumbing columns (call_source/caller_ip/device_type/visitor_id/request_host)
// FEATURE: LOG-121 -- No new parameter and no call-site edit: this function is the single choke
// point every server-side row goes through (27,948 of 27,948 rows in the 30 days before this
// session), so the context is read here from AsyncLocalStorage instead of threaded through all 45
// callers. Off-request callers -- an in-process lib/ import, a test -- get an empty store and write
// five NULLs, byte-identical to this function's pre-LOG-121 behavior. See lib/request-context.js.
// DeepBench v7.0.15 | lib/activity-log.js | HAR-02a -- accept and write cache_creation_input_tokens/cache_read_input_tokens (plumbing columns like dispatch_latency_ms, NEVER call_facts keys); every existing caller omits them and writes NULL
// DeepBench v6.3.204 | lib/activity-log.js | LOG-91 -- accept and write dispatch_latency_ms (AI-43's model-through-dispatch measurement, its own column; deliberately NOT a call_facts key -- see the param comment)
// DeepBench v6.3.153 | lib/activity-log.js | LOG-49 -- accept and write span_id/parent_span_id (the OpenTelemetry-style chain links backing sub_calls_chained's read-time derivation)
// DeepBench v6.3.132 | lib/activity-log.js | LOG-37 -- accept and write Layer A call_facts
// FEATURE: LOG-37 -- ARCHITECTURE.md §19i Layer A. Callers may now pass `callFacts`, an object of
// real, structural, checkable facts about what happened on the call (tool names actually invoked,
// chunk ids actually retrieved, internal gates that actually fired). Purely additive: every
// existing caller omits the param and writes exactly what it wrote before, plus `call_facts: null`.
// Deliberately no validation/normalization here -- this function runs fire-and-forget inside
// waitUntil(), so a throw would silently lose the entire row; shaping is the caller's job.
// DeepBench v6.3.31 | lib/activity-log.js | LOG-18 -- wrap fire-and-forget write in waitUntil()
// FEATURE: LOG-18 -- fire-and-forget without waitUntil() lets Vercel tear down the function's
// execution context as soon as the response is sent, silently abandoning any write still in
// flight (confirmed live: reflect/synthesis rows -- the last async work before a handler
// responds -- never landed, 3/3 real observations). waitUntil() extends the invocation's
// lifetime just long enough for this specific promise to settle, without adding latency to the
// actual response (unlike awaiting it inline, which was considered and rejected -- see kickoff
// CONTEXT). Wrapped in try/catch: waitUntil() throws if called outside a real Vercel request
// context (e.g. a future local/non-Vercel test runner) -- degrade to the original fire-and-forget
// behavior in that case rather than crashing every caller everywhere logActivity() is used.
// DeepBench v6.2.46 | lib/activity-log.js | AA-190 -- shared server-side ai_activity_log writer
// FEATURE: AA-190 -- closes the gap between ARCHITECTURE.md §12/§13 (LOCKED: "Every Layer 3
// capability route logs to ai_activity_log via logAICall(). No exceptions.") and reality: 9
// independent hand-rolled fetch() call sites existed server-side with no shared function at all,
// each with its own bespoke payload shape and patterns_used logic. This is the missing
// server-side half of that rule -- src/hooks/useAIActivity.js's logAICall() is the client-side
// half and is a separate runtime (cannot be imported here). Does NOT compute cost_usd -- cost
// stays computed at read time by the single existing computeCallCost() (useAIActivity.js,
// AA-181's design) from whatever input_tokens/output_tokens this function captures. This
// function's only job is making sure every site captures the same fields, consistently.
import { waitUntil } from '@vercel/functions';
import { getRequestContext } from './request-context.js';
import { resolveOrgIfUnseen } from './ip-org-resolver.js';
import { PATTERN_CATALOG } from '../shared/ai-patterns.js';
const VALID_PATTERN_SLUGS = new Set(PATTERN_CATALOG.map(p => p.slug));

export function logActivity({
  tenantId = 'global',
  agentId = null,
  aiType,
  feature = null,
  model = null,
  inputTokens = null,
  outputTokens = null,
  // FEATURE: HAR-02a -- Anthropic prompt-caching token split (usage.cache_creation_input_tokens /
  // usage.cache_read_input_tokens). Once caching ships (S-HAR-02b/c), input_tokens means UNCACHED
  // input only and these two carry the remainder -- captured ahead of that so no ai_activity_log
  // metric ever silently undercounts. Plumbing columns exactly like trace_id/dispatch_latency_ms,
  // NEVER call_facts keys: a per-call token count would make every row's §19k signature distinct
  // (see the LOG-91 comment below for the measured blast radius of that mistake).
  cacheCreationInputTokens = null,
  cacheReadInputTokens = null,
  latencyMs = null,
  taskId = null,
  knowledgeTier = null,
  patternsUsed = [],
  traceId = null,
  // FEATURE: LOG-49 -- ARCHITECTURE.md §19k. The OpenTelemetry-style chain links: one span per
  // capability execution (every row of that execution shares spanId); a delegated child execution
  // carries parentSpanId = the caller's spanId. Null for historical rows and any non-capability
  // writer -- expected. sub_calls_chained is NOT stored -- it is derived from these two links at
  // read time (the Displayer, LOG-38), same read-time-derivation posture as model_modality.
  spanId = null,
  parentSpanId = null,
  // FEATURE: LOG-37 -- Layer A call facts, omitted by every pre-LOG-37 caller.
  callFacts = null,
  // FEATURE: LOG-91 -- AI-43's model-through-dispatch latency, preserved when a wrapper row is
  // absorbed into the agent-turn row (latencyMs above stays the model-call latency). A plumbing
  // column like trace_id/span_id, NEVER a call_facts key: call_facts is the base of the §19k
  // signature and a per-call millisecond value would make every row's signature distinct
  // (measured live 2026-07-28: 720 -> 24,826 distinct signatures), re-crossing the 3 s anon
  // statement timeout LOG-99 only just brought back to ~289 ms. Null for every other caller.
  dispatchLatencyMs = null,
}) {
  // FEATURE: LOG-121 -- MUST be the first statement in the body, before the fetch() below is
  // constructed. Reading the store later -- inside a .then(), or after an await -- risks losing the
  // async context. There is no await before the write today; keep it that way.
  const ctx = getRequestContext();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey || !aiType) return;
  for (const slug of patternsUsed) {
    if (!VALID_PATTERN_SLUGS.has(slug)) {
      console.warn(`[activity-log] unrecognized pattern slug "${slug}" on aiType="${aiType}" feature="${feature}" -- check for a stale/renamed PATTERN_CATALOG slug`);
    }
  }
  const write = fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: 'return=minimal' },
    body: JSON.stringify({
      tenant_id: tenantId,
      agent_id: agentId,
      ai_type: aiType,
      feature,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      // FEATURE: HAR-02a -- plumbing columns (like dispatch_latency_ms), never signature keys.
      cache_creation_input_tokens: cacheCreationInputTokens,
      cache_read_input_tokens: cacheReadInputTokens,
      latency_ms: latencyMs,
      task_id: taskId,
      trace_id: traceId,
      // FEATURE: LOG-49 -- plumbing columns (like trace_id), never criteria keys themselves.
      span_id: spanId,
      parent_span_id: parentSpanId,
      // FEATURE: LOG-91 -- same posture: a plumbing column, never a signature key.
      dispatch_latency_ms: dispatchLatencyMs,
      knowledge_tier: knowledgeTier,
      patterns_used: patternsUsed.length > 0 ? patternsUsed : null,
      // FEATURE: LOG-121 -- who set this call off, derived from headers already in hand (zero extra
      // network calls) by lib/request-context.js. Plumbing columns exactly like
      // trace_id/span_id/dispatch_latency_ms, and NEVER §19k signature keys: a per-caller value in
      // the signature base would make every row's signature distinct -- see the LOG-91 param
      // comment above for the measured blast radius (720 -> 24,826) of that exact mistake.
      call_source: ctx.callSource ?? null,
      caller_ip: ctx.callerIp ?? null,
      device_type: ctx.deviceType ?? null,
      visitor_id: ctx.visitorId ?? null,
      request_host: ctx.requestHost ?? null,
      // FEATURE: LOG-138 -- which screen launched the run, a screen NAME never a path (the raw
      // address is read and discarded in lib/request-context.js). Same plumbing posture as the five
      // above and NEVER a §19k signature key: a per-screen value in the signature base would
      // fragment every row's signature, the measured LOG-91 failure (720 -> 24,826 distinct). Nested
      // and delegated depth-1+ rows inherit it for free -- they read the same request-scoped store.
      screen_origin: ctx.screenOrigin ?? null,
      // FEATURE: LOG-37 -- never write `{}`; an empty fact set is indistinguishable from "not
      // captured" and would make Layer B's read-time rules evaluate against noise.
      call_facts: (callFacts && Object.keys(callFacts).length > 0) ? callFacts : null,
      created_at: new Date().toISOString(),
    }),
  }).catch(() => {})
    // FEATURE: LOG-121 (part b, Task 3) -- the org lookup rides the SAME promise waitUntil() already
    // holds, deliberately chained AFTER the POST above rather than given a waitUntil() of its own.
    // Three consequences, all intended: the row write is issued first and is complete and correct
    // whether the resolve succeeds, fails, or hangs; the invocation stays alive long enough for the
    // resolve without a second lifetime-extension call; and nothing on the request path awaits it.
    // Steady state is zero outbound traffic -- lib/ip-org-resolver.js returns on a cache hit before
    // it constructs any request, and it never throws. No parameter, no signature change, no edit to
    // any of the 45 call sites.
    .then(() => (ctx.callerIp ? resolveOrgIfUnseen(ctx.callerIp) : undefined));
  try {
    waitUntil(write);
  } catch {
    // Not running inside a Vercel invocation context -- write promise above already started;
    // same best-effort behavior as before this session.
  }
}
