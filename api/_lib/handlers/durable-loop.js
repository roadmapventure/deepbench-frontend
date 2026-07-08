// DeepBench v6.1.15 | api/_lib/handlers/durable-loop.js | S-ARCH-DURABLE-RESUME-01 — persist task_context
// FEATURE: AA-139 — pure Supabase I/O for durable_hops (schema from AA-138, unchanged). No loop
// logic here — that lives solely in execute.js's runCapability()/runLoop(), never duplicated.
// FEATURE: AA-145 — createDurableHopRow() now accepts and persists task_context (new jsonb column,
// this session's migration) so a resumed chain can forward the real structured task_context to a
// delegate instead of losing it to a free-text task paraphrase. loadDurableHopRow() needs no change
// (select=* already returns the new column).

function headers(key) {
  return { "Content-Type": "application/json", "apikey": key, "Authorization": `Bearer ${key}` };
}

export async function createDurableHopRow({ tenant_id, capability_slug, intent_slug, agent_id, task_context, system_prompt, format_contract, llm, can_request_help, delegation_required }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const res = await fetch(`${supabaseUrl}/rest/v1/durable_hops`, {
    method: 'POST', headers: { ...headers(supabaseKey), Prefer: 'return=representation' },
    body: JSON.stringify({
      tenant_id, capability_slug, intent_slug, agent_id, task_context,
      system_prompt, format_contract, llm, can_request_help, delegation_required, status: 'in_progress',
    }),
  });
  if (!res.ok) throw new Error(`Failed to create durable_hops row: ${res.status}`);
  const [row] = await res.json();
  return row;
}

export async function loadDurableHopRow(job_id) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const res = await fetch(`${supabaseUrl}/rest/v1/durable_hops?id=eq.${encodeURIComponent(job_id)}&select=*&limit=1`, { headers: headers(supabaseKey) });
  if (!res.ok) throw new Error(`Failed to load durable_hops row: ${res.status}`);
  const [row] = await res.json();
  if (!row) throw Object.assign(new Error(`durable_hops row ${job_id} not found`), { status: 404 });
  return row;
}

export async function patchDurableHopRow(job_id, fields) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  await fetch(`${supabaseUrl}/rest/v1/durable_hops?id=eq.${encodeURIComponent(job_id)}`, {
    method: 'PATCH', headers: headers(supabaseKey),
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  });
}
