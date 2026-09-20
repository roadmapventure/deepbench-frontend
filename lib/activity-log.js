// DeepBench v7.0.538 | lib/activity-log.js | SES-424 slice 6 -- THE EXECUTOR CITES TOO. Slice 5 gave
// scripts/agent-log.js (the SESSION's half of the one path) a --patterns-applied flag and the
// public.decision_pattern_citations rows to go with it. This function is the OTHER half -- §19b's
// generic executor route, api/capabilities/execute.js's only writer -- and it had no citation path at
// all, so every governance turn that runs through the executor dropped its `patterns_applied` answer
// on the floor. Measured 2026-09-20, 30 days by call_source: design-kickoff 67 session / 0 executor,
// build-ticket 53/0, run-project 32/0, and decision_pattern_citations holding 0 rows.
//
// THE EMPTY CASE IS BYTE-IDENTICAL AND THAT IS THE CONSTRAINT. `patternsApplied` defaults to [], and
// when it is empty NOTHING about this function changes: one request, `Prefer: 'return=minimal'`, the
// same body, the same { ok, status } result, all 45 call sites untouched. That is what keeps
// SES-331's fetch-seam proof green -- it compares URL, headers and body before and after.
//
// WHEN A TURN DOES CITE, the POST asks for `return=representation` so the inserted row's id comes
// back on the write itself (no read-back round trip), and writeCitations() is chained INSIDE the same
// promise waitUntil() already holds -- exactly LOG-121's org-resolve posture: issued after the POST,
// never awaited by the request path, no second waitUntil(), no new parameter on any caller. The
// result gains { id, citations }, or { citationError } when the database refuses the citations.
//
// IT NEVER THROWS AND IT NEVER UNWRITES THE TURN. A refused, malformed or unreachable citation
// leaves { ok: true } and the audit row standing. The ai_activity_log row is the MANDATORY one; a
// mandatory row dropped to punish a bad citation is the SES-423 defect wearing new clothes, and
// attribution is best-effort telemetry (pattern:105), never a gate on the product path.
//
// DeepBench v7.0.450 | lib/activity-log.js | LOG-149 -- COST AT WRITE. Every row this function
// writes now carries cost_usd, priced from shared/models.js's MODEL_PRICING at the moment of the
// call, instead of leaving the column NULL for a read-time deriver to guess at later. Measured
// before the change, not recalled: cost_usd was NULL on 628 of 628 September ai_activity_log rows
// that carry a model (43 legacy rows all-time carry one), so every dollar meter on the platform read
// zero for the whole month the Anthropic Console billed real money.
//
// THREE OUTCOMES, AND THE MIDDLE ONE IS THE POINT. An explicit `costUsd` wins outright -- including
// an explicit 0, which is how an UNBILLED call (a pre-output refusal, a rejected request: HTTP 200
// or 4xx, no tokens charged) records "this cost nothing" as a fact rather than as an absence.
// `undefined` computes from the row's own four token counts. An unpriced model, or a row with no
// token counts at all, writes NULL -- unknown, never 0; writing 0 there would be the phantom-dollar
// defect ARCHITECTURE.md §19v records from 2026-08-20, where dollars never spent blocked work.
//
// NOTHING ELSE IN THE BODY OR THE PROMISE CHAIN MOVES. One key is added to the POST body; the URL,
// headers, waitUntil() registration, org-resolve chaining and the SES-331 return contract are
// byte-identical, which is what keeps SES-331's fetch-seam proof green.
// DeepBench v7.0.426 | lib/activity-log.js | SES-331 -- logActivity() now RETURNS its write promise,
// resolving to { ok, status, error?, skipped? }, so an off-request caller (scripts/agent-log.js: a
// session that ran a governance agent itself and must record the call the executor would have
// recorded) can await the write and report a real failure instead of exiting on a fire-and-forget.
// THE REQUEST PATH IS UNCHANGED AND THAT IS THE WHOLE CONSTRAINT: no caller anywhere reads this
// return value (verified by grep across api/, lib/, scripts/, tests/ before the edit -- 26 files
// import it, zero assign from it), the POST body is byte-identical, waitUntil() still receives the
// same promise, and the org-resolve is still chained AFTER the POST with nothing on the request path
// awaiting it. Two deliberate differences, both strictly safer: the outcome of the POST is now
// CAPTURED rather than swallowed by `.catch(() => {})` (an error body is read only on the non-ok
// branch, off the response path), and the returned promise can no longer REJECT -- previously a
// throw from resolveOrgIfUnseen() would have handed waitUntil() a rejected promise. Pinned by
// tests/regression/ses-331-agent-prompt-path.test.mjs (fetch-seam proof: same URL, headers and body
// before and after; ok/non-ok/network-error/missing-key all resolve, none reject).
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
// half and is a separate runtime (cannot be imported here). AS OF LOG-149 THIS FUNCTION DOES
// compute cost_usd (see the header above): computeCallCost() moved out of the browser hook into
// shared/models.js precisely so this server-side writer could reach it. Read-time pricing survives
// in the client for the rows written before this ship, which carry NULL. This
// function's only job is making sure every site captures the same fields, consistently.
import { waitUntil } from '@vercel/functions';
import { getRequestContext } from './request-context.js';
import { resolveOrgIfUnseen } from './ip-org-resolver.js';
import { PATTERN_CATALOG } from '../shared/ai-patterns.js';
// FEATURE: LOG-149 -- shared/ is already this module's neighbour (PATTERN_CATALOG above), so this
// adds no layer crossing; api/prompt/request-receivable.js imports from shared/models.js too.
import { computeCallCost } from '../shared/models.js';
// FEATURE: SES-424 slice 6 -- the ONE citation writer, shared with scripts/agent-log.js rather than
// copied beside it (pattern:14/:15). lib/ importing lib/ crosses no layer.
import { writeCitations } from './pattern-citations.js';
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
  // FEATURE: LOG-149 -- the row's dollar cost. THE DEFAULT IS `undefined`, NOT null, and the two are
  // deliberately different answers: `undefined` means "you price it from my tokens", while an
  // explicit value -- including 0 -- is the caller asserting a cost it knows better than this
  // function can compute. Only the failure seams pass it (an unbilled refusal or rejection: 0); every
  // one of the 45 existing call sites omits it and gets the computed figure.
  costUsd = undefined,
  // FEATURE: SES-424 slice 6 -- the decision criteria this turn applied, by number, already coerced
  // to positive integers by the caller (lib/pattern-citations.js's coercePatternNumbers). EMPTY IS
  // THE DEFAULT AND EMPTY CHANGES NOTHING -- see the header. The numbers are NOT validated here: the
  // FK to public.decision_patterns(pattern_no) is the only authority on which exist, and a list kept
  // in this file is the hardcoded copy the platform removes rather than maintains (pattern:2).
  // NEVER a call_facts key and never a patterns_used slug: patterns_used is §19k's technique
  // vocabulary, this is the decision library, and merging them would both fragment the §19k
  // signature and put two different questions in one column.
  patternsApplied = [],
}) {
  // FEATURE: LOG-121 -- MUST be the first statement in the body, before the fetch() below is
  // constructed. Reading the store later -- inside a .then(), or after an await -- risks losing the
  // async context. There is no await before the write today; keep it that way.
  const ctx = getRequestContext();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  // FEATURE: SES-331 -- the skip is now REPORTED rather than silent. Behaviour is unchanged for the
  // request path (nothing is written, exactly as before, and no caller reads the return); what
  // changes is that a CLI caller can tell "no row was written" from "a row was written", which is
  // the difference between a script that silently succeeds on a missing key and one that exits 2.
  if (!supabaseUrl || !supabaseKey || !aiType) {
    return Promise.resolve({
      ok: false,
      skipped: true,
      error: !aiType
        ? 'aiType is required -- no row written'
        : 'SUPABASE_URL / SUPABASE_SERVICE_KEY not configured -- no row written',
    });
  }
  for (const slug of patternsUsed) {
    if (!VALID_PATTERN_SLUGS.has(slug)) {
      console.warn(`[activity-log] unrecognized pattern slug "${slug}" on aiType="${aiType}" feature="${feature}" -- check for a stale/renamed PATTERN_CATALOG slug`);
    }
  }
  const write = fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: 'POST',
    // FEATURE: SES-424 slice 6 -- 'return=minimal' remains the answer for every uncited turn, which
    // is every one of the 45 existing call sites: same header, same one request, same body. A CITING
    // turn asks for the row back instead, because activity_log_id is a foreign key and there is
    // nothing to cite until the id exists -- and asking the insert for it beats a second read-back
    // round trip on a path that already runs inside waitUntil().
    headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: patternsApplied.length > 0 ? 'return=representation' : 'return=minimal' },
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
      // FEATURE: LOG-149 -- priced from all FOUR token columns, not just input/output: a cached call
      // whose cost was computed from input_tokens alone would under-report by the cache-read
      // remainder (HAR-02a's whole reason for splitting them out). computeCallCost() returns null for
      // an unpriced model or a token-less row, and null is what lands -- unknown, never 0.
      cost_usd: costUsd !== undefined
        ? costUsd
        : computeCallCost(model, inputTokens, outputTokens, cacheCreationInputTokens, cacheReadInputTokens),
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
  })
    // FEATURE: SES-331 -- was `.catch(() => {})`. Same swallow (nothing downstream is skipped on a
    // failure, the org-resolve below still runs in every case, and no caller is exposed to a
    // rejection), except the outcome is now carried instead of discarded. A non-ok response never
    // rejected fetch() in the first place, so this branch is new information, not new behaviour.
    .then(
      async res => {
        if (!res.ok) return { ok: false, status: res.status, error: (await res.text().catch(() => '')) || `HTTP ${res.status}` };
        // FEATURE: SES-424 slice 6 -- the uncited path returns the SAME object it always returned,
        // built from the same two fields, and never touches the body. Only a citing turn reads the
        // representation, and a body that cannot be parsed degrades to "no id" rather than throwing:
        // the row is written either way, and the citations are the best-effort half.
        if (patternsApplied.length === 0) return { ok: true, status: res.status };
        const rows = await res.json().catch(() => null);
        const id = Array.isArray(rows) ? (rows[0]?.id ?? null) : (rows?.id ?? null);
        return { ok: true, status: res.status, id };
      },
      err => ({ ok: false, status: 0, error: err?.message || String(err) }))
    // FEATURE: SES-424 slice 6 -- the citations, chained HERE: after the POST has resolved (the id is
    // its output), before the org-resolve, on the one promise waitUntil() already holds. Nothing on
    // the request path awaits it, exactly as LOG-121 established for the org lookup.
    //
    // EVERY FAILURE MODE LANDS ON { ok: true } WITH A citationError, NEVER A THROW AND NEVER A
    // REJECTED PROMISE: the audit row is mandatory and stands. writeCitations() returns { error } on
    // a refusal (a pattern number the FK does not recognise); the try/catch covers the rest (an
    // unreachable database, a malformed representation). An uncited turn skips the whole block and
    // its result object is untouched.
    .then(async result => {
      if (patternsApplied.length === 0 || !result.ok) return result;
      if (result.id === null || result.id === undefined) {
        return { ...result, citationError: `ai_activity_log row written (HTTP ${result.status}) but its id was not returned -- ${patternsApplied.length} citation(s) not written` };
      }
      try {
        const cited = await writeCitations(result.id, patternsApplied, agentId, String(feature || '').split(':')[0] || null);
        return cited.error ? { ...result, citationError: cited.error } : { ...result, citations: cited.citations };
      } catch (e) {
        return { ...result, citationError: `citation write threw: ${e?.message || String(e)}. ai_activity_log id=${result.id} IS WRITTEN AND STANDS.` };
      }
    })
    // FEATURE: LOG-121 (part b, Task 3) -- the org lookup rides the SAME promise waitUntil() already
    // holds, deliberately chained AFTER the POST above rather than given a waitUntil() of its own.
    // Three consequences, all intended: the row write is issued first and is complete and correct
    // whether the resolve succeeds, fails, or hangs; the invocation stays alive long enough for the
    // resolve without a second lifetime-extension call; and nothing on the request path awaits it.
    // Steady state is zero outbound traffic -- lib/ip-org-resolver.js returns on a cache hit before
    // it constructs any request, and it never throws. No parameter, no signature change, no edit to
    // any of the 45 call sites.
    // FEATURE: SES-331 -- the resolve still runs here, still after the POST, still unawaited by the
    // request path. Only two things changed: the POST's outcome is passed THROUGH it rather than
    // replaced by its return value, and a throw from it can no longer reject the promise handed to
    // waitUntil(). resolveOrgIfUnseen() is documented never to throw, so the second is inert today.
    .then(result => {
      if (!ctx.callerIp) return result;
      return Promise.resolve()
        .then(() => resolveOrgIfUnseen(ctx.callerIp))
        .then(() => result, () => result);
    });
  try {
    waitUntil(write);
  } catch {
    // Not running inside a Vercel invocation context -- write promise above already started;
    // same best-effort behavior as before this session.
  }
  // FEATURE: SES-331 -- returned LAST, after waitUntil(), so the lifetime extension is registered
  // exactly when it was before. An awaiting caller and waitUntil() hold the same promise; neither
  // changes what the other sees.
  return write;
}
