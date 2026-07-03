// DeepBench v6.0.6 | api/_lib/handlers/confirmation.js | S-ARCH-HITL-RESUME-01a — AA-100 Confirmation service
// FEATURE: AA-100 — accept/reject/edit resume for execute.js's consequential-action gate (AA-87).
// Deterministic plumbing only: save the paused proposal, wait, carry out exactly what was decided.
// Zero capability-specific logic — works identically for any agent/capability that pauses.

import { sendRequest } from '../../prompt/request-receivable.js';

function getSupabaseHeaders(key) {
  return { "Content-Type": "application/json", "apikey": key, "Authorization": `Bearer ${key}` };
}

export async function insertPendingConfirmation({ tenant_id, agent_id, capability_slug, intent_slug, proposed_action, critique, prompt_request, delegation_occurred, depth }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const headers = getSupabaseHeaders(supabaseKey);
  const res = await fetch(`${supabaseUrl}/rest/v1/pending_confirmations`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      tenant_id: tenant_id || 'global', agent_id, capability_slug, intent_slug: intent_slug || null,
      proposed_action, critique: critique || null, prompt_request,
      delegation_occurred: !!delegation_occurred, depth: depth ?? null,
    }),
  });
  if (!res.ok) throw new Error(`Failed to save pending confirmation: ${res.status}`);
  const [row] = await res.json();
  return row.id;
}

export async function getPendingConfirmation(confirmation_id) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const headers = getSupabaseHeaders(supabaseKey);
  const res = await fetch(`${supabaseUrl}/rest/v1/pending_confirmations?id=eq.${encodeURIComponent(confirmation_id)}&select=*&limit=1`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch pending confirmation: ${res.status}`);
  const [row] = await res.json();
  return row || null;
}

async function updateStatus(confirmation_id, fields) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const headers = getSupabaseHeaders(supabaseKey);
  await fetch(`${supabaseUrl}/rest/v1/pending_confirmations?id=eq.${encodeURIComponent(confirmation_id)}`, {
    method: 'PATCH', headers, body: JSON.stringify({ ...fields, resolved_at: new Date().toISOString() }),
  });
}

export async function markEdited(confirmation_id) {
  await updateStatus(confirmation_id, { status: 'edited' });
}

// FEATURE: AA-100 — resolves accept/reject only. Edit is handled directly in execute.js's own
// handler (it needs runCapability() — importing that here would create a circular import back
// into execute.js, which imports this file).
export async function resolvePendingConfirmation({ confirmation_id, resolution }) {
  if (!['accept', 'reject'].includes(resolution)) {
    throw Object.assign(new Error(`resolution must be accept or reject, got "${resolution}"`), { status: 400 });
  }

  const row = await getPendingConfirmation(confirmation_id);
  if (!row) throw Object.assign(new Error('confirmation not found'), { status: 404 });
  if (row.status !== 'pending') throw Object.assign(new Error(`confirmation already ${row.status}`), { status: 409 });

  if (resolution === 'reject') {
    await updateStatus(confirmation_id, { status: 'rejected' });
    return { status: 'rejected', confirmation_id };
  }

  // accept — let the paused step finish exactly as it would have without the gate
  const result = await sendRequest({
    prompt_request: row.prompt_request,
    agent_id: row.agent_id,
    capability_slug: row.capability_slug,
    tenant_id: row.tenant_id,
    precomputed_turn: { tool_input: row.proposed_action, usage: { input_tokens: 0, output_tokens: 0 }, retryCount: 0 },
    delegation_occurred: row.delegation_occurred,
  });
  await updateStatus(confirmation_id, { status: 'accepted', resolution: result });
  return result;
}
