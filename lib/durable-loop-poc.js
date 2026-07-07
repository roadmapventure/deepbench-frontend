// DeepBench v6.1.0 | lib/durable-loop-poc.js | S-ARCH-DURABLE-LOOP-01 — checkpoint/resume POC
// FEATURE: AA-138 — proves a delegate hop can survive across separate function invocations by
// persisting loop state to Supabase instead of a JS call stack. Additive only: does not modify
// runCapability()/execute.js's existing in-process loop. Reuses callModel()/sendRequest() and
// resolveCapabilityHolder()-equivalent resolution unchanged — only the state-carrying mechanism
// between hops is new. ARCHITECTURE.md §19d (MAX_LOOP_DEPTH/legitimacy rules unchanged, still
// enforced here via the same hop_counter ceiling).

import { assemblePrompt } from '../api/prompt/db-assembly.js';
import { enrichPrompt } from '../api/prompt/ai-enrichment.js';
import { callModel, sendRequest } from '../api/prompt/request-receivable.js';

const MAX_LOOP_DEPTH = 5; // same ceiling as execute.js's runCapability(), same category, not overridable by data

function headers(key) {
  return { "Content-Type": "application/json", "apikey": key, "Authorization": `Bearer ${key}` };
}

async function resolveCapabilityHolder(capability_slug) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const res = await fetch(
    `${supabaseUrl}/rest/v1/agent_capability_assignments?capability_slug=eq.${encodeURIComponent(capability_slug)}&select=agent_id&limit=1`,
    { headers: headers(supabaseKey) }
  );
  if (!res.ok) throw new Error(`Failed to resolve holder of capability "${capability_slug}"`);
  const rows = await res.json();
  if (!rows.length) throw new Error(`No agent currently holds capability "${capability_slug}"`);
  return rows[0].agent_id;
}

async function logAgentTurn({ capability_slug, intent_slug, agent_id, tenant_id, model, depth, latency_ms, is_delegate_call }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: 'POST', headers: headers(supabaseKey),
    body: JSON.stringify({
      tenant_id: tenant_id || 'global', agent_id: agent_id || null, ai_type: 'agent-turn',
      feature: `${capability_slug}:${intent_slug || 'none'}:depth${depth}:durable-poc`,
      model: model || null, latency_ms, patterns_used: is_delegate_call ? ['agent-delegation'] : [],
      created_at: new Date().toISOString(),
    }),
  }).catch(() => {});
}

async function getRow(job_id) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const res = await fetch(`${supabaseUrl}/rest/v1/durable_hops?id=eq.${encodeURIComponent(job_id)}&select=*&limit=1`, { headers: headers(supabaseKey) });
  if (!res.ok) throw new Error(`Failed to load durable_hops row: ${res.status}`);
  const [row] = await res.json();
  if (!row) throw new Error(`durable_hops row ${job_id} not found`);
  return row;
}

async function patchRow(job_id, fields) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  await fetch(`${supabaseUrl}/rest/v1/durable_hops?id=eq.${encodeURIComponent(job_id)}`, {
    method: 'PATCH', headers: headers(supabaseKey),
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  });
}

// FEATURE: AA-138 — persists the expensive one-time prep (assemblePrompt/enrichPrompt, same as
// runCapability()'s opening two steps) into a fresh row, then runs hop 0. Returns immediately
// after hop 0 — does NOT loop to completion in-process. Mirrors runCapability()'s signature.
export async function startDurableChain({ capability_slug, intent_slug = null, agent_id, task_context, runtime_context = null, tenant_id = 'global' }) {
  const promptRequest = await assemblePrompt({ capability_slug, agent_id, tenant_id, task_context, runtime_context, intent_slug });
  const enriched = await enrichPrompt({ prompt_request: promptRequest, agent_id, capability_slug });
  const canRequestHelp = promptRequest.canRequestHelp === true;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/durable_hops`, {
    method: 'POST', headers: { ...headers(supabaseKey), Prefer: 'return=representation' },
    body: JSON.stringify({
      tenant_id, capability_slug, intent_slug, agent_id,
      system_prompt: enriched.system_prompt, format_contract: enriched.format_contract,
      llm: { model: enriched.llm.model, max_tokens: enriched.llm.max_tokens },
      can_request_help: canRequestHelp, status: 'in_progress',
    }),
  });
  if (!insertRes.ok) throw new Error(`Failed to create durable_hops row: ${insertRes.status}`);
  const [row] = await insertRes.json();

  return continueDurableChain({ job_id: row.id });
}

// FEATURE: AA-138 — runs exactly ONE hop, reading all state fresh from Supabase (job_id is the
// only thing the caller needs to carry between calls) and returning after that single hop. Proof
// requirement: a caller may invoke this as a genuinely separate process/invocation from the one
// that called startDurableChain() or a prior continueDurableChain() — no in-memory dependency.
export async function continueDurableChain({ job_id }) {
  const row = await getRow(job_id);
  if (row.status !== 'in_progress') return { job_id, status: row.status, result: row.result, error: row.error };

  if (row.hop_counter >= MAX_LOOP_DEPTH) {
    await patchRow(job_id, { status: 'failed', error: 'depth_exceeded' });
    return { job_id, status: 'failed', error: 'depth_exceeded' };
  }

  const turnStart = Date.now();
  const turn = await callModel({
    systemPrompt: row.system_prompt, model: row.llm.model, max_tokens: row.llm.max_tokens,
    format_contract: row.format_contract, canRequestHelp: row.can_request_help,
    conversation_history: row.conversation_history,
  });
  logAgentTurn({
    capability_slug: row.capability_slug, intent_slug: row.intent_slug, agent_id: row.agent_id,
    tenant_id: row.tenant_id, model: row.llm.model, depth: row.hop_counter,
    latency_ms: Date.now() - turnStart, is_delegate_call: turn.is_delegate_call,
  });

  if (!turn.is_delegate_call) {
    const result = await sendRequest({
      prompt_request: { system_prompt: row.system_prompt, format_contract: row.format_contract, llm: row.llm },
      agent_id: row.agent_id, capability_slug: row.capability_slug, tenant_id: row.tenant_id,
      precomputed_turn: turn, delegation_occurred: row.delegation_occurred, turn_started_at: turnStart,
    });
    await patchRow(job_id, { status: 'complete', result });
    return { job_id, status: 'complete', result };
  }

  // Same two harness-generic tools as execute.js, same legitimacy rule (AR-2.1/2.2): agent_id in
  // delegate_to_agent is only ever the model's own tool-call argument, never resolved/asserted here.
  let lastHelpSelection = row.last_help_selection;
  let delegateResult;
  if (turn.tool_name === 'request_help') {
    const pmAgentId = await resolveCapabilityHolder('project-manager');
    // Michelle's own broker turn stays in-process (unchanged, ~7s measured live — comfortably
    // inside one invocation's budget). Only the OUTER chain (the delegator's own turns and the
    // final delegate_to_agent dispatch — where the real failure happened) is checkpointed.
    const { runCapability } = await import('../api/capabilities/execute.js');
    delegateResult = await runCapability({
      capability_slug: 'project-manager', intent_slug: 'agent-selection-intent',
      agent_id: pmAgentId, task_context: JSON.stringify(turn.tool_input), tenant_id: row.tenant_id,
    });
    lastHelpSelection = {
      selected_by_agent_id: pmAgentId,
      reasoning: delegateResult?.content?.reasoning ?? null,
      candidates_considered: delegateResult?.content?.candidates ?? null,
    };
  } else if (turn.tool_name === 'delegate_to_agent') {
    const { agent_id: targetAgentId, capability_slug: targetCapabilitySlug, intent_slug: targetIntentSlug, task } = turn.tool_input;
    const { runCapability } = await import('../api/capabilities/execute.js');
    delegateResult = await runCapability({
      capability_slug: targetCapabilitySlug, intent_slug: targetIntentSlug || null,
      agent_id: targetAgentId, task_context: task, tenant_id: row.tenant_id,
    });
    if (turn.tool_input.is_final === true) {
      const finalPatterns = Array.from(new Set([...(delegateResult.patterns_used || []), 'agent-delegation']));
      const result = { status: 'final_delegation', ...delegateResult.content, patterns_used: finalPatterns, selection: lastHelpSelection };
      await patchRow(job_id, { status: 'complete', result, hop_counter: row.hop_counter + 1, delegation_occurred: true });
      return { job_id, status: 'complete', result };
    }
  }

  const conversationHistory = [
    ...(row.conversation_history.length > 0 ? row.conversation_history : [{ role: 'user', content: row.system_prompt }]),
    { role: 'assistant', content: turn.raw_content },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: turn.tool_use_id, content: JSON.stringify(delegateResult) }] },
  ];
  await patchRow(job_id, {
    conversation_history: conversationHistory, hop_counter: row.hop_counter + 1,
    delegation_occurred: true, last_help_selection: lastHelpSelection,
  });
  return { job_id, status: 'in_progress' };
}
