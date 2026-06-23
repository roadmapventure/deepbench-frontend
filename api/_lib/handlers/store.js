// DeepBench v5.2.16 | api/lib/handlers/store.js | Content deliverable handler
// FEATURE: AA-44 — store handler writes deliverable to deliverables table

/**
 * @param {Object} params
 * @param {string|null} params.task_id
 * @param {string} params.agent_id
 * @param {string} params.skill_profile_slug
 * @param {string} params.title
 * @param {any} params.content
 * @param {string} params.format
 * @param {string} params.handler
 * @param {string} params.supabaseUrl
 * @param {Object} params.supabaseHeaders
 */
export async function handle({ task_id, agent_id, skill_profile_slug, title, content, format, handler, supabaseUrl, supabaseHeaders }) {
  // FEATURE: AA-44 — insert deliverable row with full lineage
  if (!task_id && task_id !== null) throw new Error('task_id required for store handler');

  const body = {
    tenant_id: 'global',
    task_id: task_id || null,
    agent_id,
    skill_profile_slug,
    title,
    content,
    format,
    handler,
    status: 'draft',
    is_final: false,
  };

  const r = await fetch(`${supabaseUrl}/rest/v1/deliverables`, {
    method: 'POST',
    headers: { ...supabaseHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`store handler insert failed: ${r.status} ${text}`);
  }

  const rows = await r.json();
  const deliverable_id = Array.isArray(rows) ? rows[0]?.id : rows?.id;
  if (!deliverable_id) throw new Error('store handler: no id returned from deliverables insert');

  return { deliverable_id };
}
