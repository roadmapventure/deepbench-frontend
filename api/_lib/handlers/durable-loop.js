// DeepBench v6.1.1 | api/_lib/handlers/durable-loop.js | S-ARCH-DURABLE-LOOP-02a — checkpoint/resume persistence
// FEATURE: AA-139 — pure Supabase I/O for durable_hops (schema from AA-138, unchanged). No loop
// logic here — that lives solely in execute.js's runCapability()/runLoop(), never duplicated.

function headers(key) {
  return { "Content-Type": "application/json", "apikey": key, "Authorization": `Bearer ${key}` };
}

export async function createDurableHopRow({ tenant_id, capability_slug, intent_slug, agent_id, system_prompt, format_contract, llm, can_request_help }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const res = await fetch(`${supabaseUrl}/rest/v1/durable_hops`, {
    method: 'POST', headers: { ...headers(supabaseKey), Prefer: 'return=representation' },
    body: JSON.stringify({
      tenant_id, capability_slug, intent_slug, agent_id,
      system_prompt, format_contract, llm, can_request_help, status: 'in_progress',
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
