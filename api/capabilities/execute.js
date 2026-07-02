// DeepBench v5.3.8 | api/capabilities/execute.js | S-CAPABILITY-EXEC-01 — the Generic Capability Executor (ARCHITECTURE.md §19b)
// FEATURE: AA-76 — one generic route for every AI-pattern capability. No capability-specific
// logic lives here, ever — model/max_tokens/schema come entirely from Skill Profile data via
// assemblePrompt() (AA-75). A new capability requires zero changes to this file — only new
// Supabase rows (Skill Profiles + capability_skill_profiles + agent_capability_assignments).

import { assemblePrompt } from '../prompt/db-assembly.js';
import { enrichPrompt } from '../prompt/ai-enrichment.js';
import { sendRequest } from '../prompt/request-receivable.js';

export const config = { maxDuration: 60, runtime: "nodejs" };

// FEATURE: AA-76 — core logic exported separately from the HTTP handler so the Node.js test
// can call it directly, same pattern as runChannelIntelligence/assemblePrompt/enrichPrompt.
export async function runCapability({
  capability_slug,
  intent_slug = null,
  agent_id,
  task_context,
  runtime_context = null,
  tenant_id = 'global',
  enrichment_capability_slug = null,
}) {
  if (!capability_slug) throw new Error('capability_slug required');
  if (!agent_id) throw new Error('agent_id required');
  if (!task_context) throw new Error('task_context required');

  const promptRequest = await assemblePrompt({
    capability_slug,
    agent_id,
    tenant_id,
    task_context,
    runtime_context,
    intent_slug,
    enrichment_capability_slug,
  });

  const enriched = await enrichPrompt({ prompt_request: promptRequest, agent_id, capability_slug });

  const result = await sendRequest({ prompt_request: enriched, agent_id, capability_slug, tenant_id });

  return result;
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const result = await runCapability(req.body || {});
    return res.status(200).json(result);
  } catch (e) {
    console.error('[execute] error:', e);
    return res.status(e.status || 500).json({ error: e.message });
  }
}
