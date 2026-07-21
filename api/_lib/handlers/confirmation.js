// DeepBench v6.3.102 | api/_lib/handlers/confirmation.js | LOO-17 — checkpoint-linked accept lifecycle (accepting/accept_failed), widened eligibility guard
// DeepBench v6.0.8 | api/_lib/handlers/confirmation.js | S-APPLE-04b — AA-103 generic accept hand-off
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
  // FEATURE: LOO-17 -- accept_failed is a "you decide what's next" state, not a dead end -- widened
  // from `row.status !== 'pending'` so Reject/retry-Accept both still work on it.
  if (!['pending', 'accept_failed'].includes(row.status)) {
    throw Object.assign(new Error(`confirmation already ${row.status}`), { status: 409 });
  }

  if (resolution === 'reject') {
    await updateStatus(confirmation_id, { status: 'rejected' });
    return { status: 'rejected', confirmation_id };
  }

  // accept — let the paused step finish exactly as it would have without the gate
  let result;
  try {
    result = await sendRequest({
      prompt_request: row.prompt_request,
      agent_id: row.agent_id,
      capability_slug: row.capability_slug,
      tenant_id: row.tenant_id,
      precomputed_turn: { tool_input: row.proposed_action, usage: { input_tokens: 0, output_tokens: 0 }, retryCount: 0 },
      delegation_occurred: row.delegation_occurred,
    });
  } catch (e) {
    // FEATURE: LOO-17 -- same consistency fix as resolveAccept()'s try/catch (Task 3): this path
    // (no on_accept_intent_slug) can never checkpoint (sendRequest() has no loop), so any failure
    // here is already a fast, fully-exhausted one (HAR-8's 3 attempts happened inside this one call).
    await markAcceptFailed(confirmation_id, e);
    throw e;
  }
  await updateStatus(confirmation_id, { status: 'accepted', resolution: result });
  return result;
}

// FEATURE: AA-103 -- looks up whether the given intent declares a follow-up intent to run once
// a human accepts (traits.on_accept_intent_slug). Generic: reads a data field on the confirmed
// intent's own Skill Profile row, never a capability- or agent-specific conditional. Returns
// null for any intent that doesn't declare one -- the existing terminal-dispatch accept behavior
// is unchanged for those. ARCHITECTURE.md §19b/§19d.
export async function getOnAcceptIntentSlug(intent_slug) {
  if (!intent_slug) return null;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const headers = getSupabaseHeaders(supabaseKey);
  const res = await fetch(`${supabaseUrl}/rest/v1/skill_profiles?slug=eq.${encodeURIComponent(intent_slug)}&select=traits&limit=1`, { headers });
  if (!res.ok) return null;
  const [row] = await res.json();
  return row?.traits?.on_accept_intent_slug || null;
}

// FEATURE: AA-103 -- closes out a confirmation whose accept was fulfilled by delegating to a
// follow-up intent (getOnAcceptIntentSlug found one) rather than by resolvePendingConfirmation's
// own terminal dispatch. Mirrors that function's accept tail exactly, minus the sendRequest call.
export async function markAcceptedDelegated(confirmation_id, result) {
  await updateStatus(confirmation_id, { status: 'accepted', resolution: result });
}

// FEATURE: LOO-17 -- links a checkpointed accept to its job_id without marking it resolved yet
// (deliberately does NOT set resolved_at -- 'accepting' isn't a resolution, it's still in flight).
// Reuses the existing resolution jsonb column -- no schema change.
export async function linkCheckpointJob(confirmation_id, job_id) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const headers = getSupabaseHeaders(supabaseKey);
  await fetch(`${supabaseUrl}/rest/v1/pending_confirmations?id=eq.${encodeURIComponent(confirmation_id)}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ status: 'accepting', resolution: { job_id, status: 'in_progress' } }),
  });
}

// FEATURE: LOO-17 -- reverse lookup so the `continue` route handler can find which confirmation
// (if any) a durable_hops job_id belongs to, once that job reaches a genuine terminal state.
export async function getConfirmationByCheckpointJobId(job_id) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const headers = getSupabaseHeaders(supabaseKey);
  const res = await fetch(`${supabaseUrl}/rest/v1/pending_confirmations?resolution->>job_id=eq.${encodeURIComponent(job_id)}&status=eq.accepting&select=id&limit=1`, { headers });
  if (!res.ok) return null;
  const [row] = await res.json();
  return row?.id || null;
}

// FEATURE: LOO-17 -- the visible "this failed, you decide" terminal state (John's explicit call,
// not a silent revert to pending). Used by every exhausted-failure path: a checkpoint's resumed
// job failing, a fast/synchronous accept failure, and resolvePendingConfirmation()'s own plain
// accept path -- same root cause, same fix, at all three sites (Architect Review multi-site check).
export async function markAcceptFailed(confirmation_id, error) {
  await updateStatus(confirmation_id, { status: 'accept_failed', resolution: { error: String(error?.message || error) } });
}
