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
}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey || !aiType) return;
  for (const slug of patternsUsed) {
    if (!VALID_PATTERN_SLUGS.has(slug)) {
      console.warn(`[activity-log] unrecognized pattern slug "${slug}" on aiType="${aiType}" feature="${feature}" -- check for a stale/renamed PATTERN_CATALOG slug`);
    }
  }
  fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
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
      knowledge_tier: knowledgeTier,
      patterns_used: patternsUsed.length > 0 ? patternsUsed : null,
      created_at: new Date().toISOString(),
    }),
  }).catch(() => {});
}
