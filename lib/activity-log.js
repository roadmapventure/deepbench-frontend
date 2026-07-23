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
  latencyMs = null,
  taskId = null,
  knowledgeTier = null,
  patternsUsed = [],
  traceId = null,
  // FEATURE: LOG-37 -- Layer A call facts, omitted by every pre-LOG-37 caller.
  callFacts = null,
}) {
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
      latency_ms: latencyMs,
      task_id: taskId,
      trace_id: traceId,
      knowledge_tier: knowledgeTier,
      patterns_used: patternsUsed.length > 0 ? patternsUsed : null,
      // FEATURE: LOG-37 -- never write `{}`; an empty fact set is indistinguishable from "not
      // captured" and would make Layer B's read-time rules evaluate against noise.
      call_facts: (callFacts && Object.keys(callFacts).length > 0) ? callFacts : null,
      created_at: new Date().toISOString(),
    }),
  }).catch(() => {});
  try {
    waitUntil(write);
  } catch {
    // Not running inside a Vercel invocation context -- write promise above already started;
    // same best-effort behavior as before this session.
  }
}
