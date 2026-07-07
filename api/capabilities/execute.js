// DeepBench v6.0.22 | api/capabilities/execute.js | S-ARCH-DISPLAY-LOOP-01 — is_final terminal delegation + fetchAgentCard() extraction
// FEATURE: AA-76 — one generic route for every AI-pattern capability. No capability-specific
// logic lives here, ever — model/max_tokens/schema come entirely from Skill Profile data via
// assemblePrompt() (AA-75). A new capability requires zero changes to this file — only new
// Supabase rows (Skill Profiles + capability_skill_profiles + agent_capability_assignments).
// FEATURE: AA-77 — format_skill_profile_slug/display_agent_id generalize the "format-last"
// pattern api/plan.js already uses for Work Orders (AA-69), so any capability can have its
// output shaped by a display agent's Format Skill in the same single call — not capability-
// specific logic, this applies to every caller that opts in via these two new params.

import { assemblePrompt } from '../prompt/db-assembly.js';
import { enrichPrompt } from '../prompt/ai-enrichment.js';
import { sendRequest, callModel } from '../prompt/request-receivable.js';
import { insertPendingConfirmation, getPendingConfirmation, markEdited, resolvePendingConfirmation, getOnAcceptIntentSlug, markAcceptedDelegated } from '../_lib/handlers/confirmation.js';

export const config = { maxDuration: 60, runtime: "nodejs" };

// FEATURE: AA-80 — platform-level hard ceiling on delegate hops per top-level request. Not
// data-overridable by any Skill Profile — infrastructure, same category as the maxDuration/
// AbortSignal.timeout() limits already in request-receivable.js. ARCHITECTURE.md §19d.
const MAX_LOOP_DEPTH = 5;

function getSupabaseHeaders(key) {
  return { "Content-Type": "application/json", "apikey": key, "Authorization": `Bearer ${key}` };
}

// FEATURE: AA-120 -- fire-and-forget latency logging for every callModel() turn inside this
// loop. AA-118 (S-ARCH-LOOP-LATENCY-01) fixed null latency_ms on the three explicit hop-wrapper
// functions (librarian/agent-directory/guardrails-check) but never touched the delegating
// agent's own reasoning turns -- the callModel() calls right here in this loop -- which produced
// zero row at all, not even null. Confirmed live 2026-07-07: a full ci-answer-display-intent call
// completing in 33.4s had two entirely unlogged gaps (Marcus's own two turns) accounting for
// ~16.5s of that total -- the same blind spot AA-120's incident report described as "a hop AA-118
// never touched." Generic to every capability's own turns, not capability-specific.
async function logAgentTurn({ capability_slug, intent_slug, agent_id, tenant_id, model, depth, latency_ms, is_delegate_call, api_retry_count }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) return;
  fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: 'POST',
    headers: getSupabaseHeaders(supabaseKey),
    body: JSON.stringify({
      tenant_id: tenant_id || 'global',
      agent_id: agent_id || null,
      ai_type: 'agent-turn',
      feature: `${capability_slug || 'unknown'}:${intent_slug || 'none'}:depth${depth}${api_retry_count ? `:apiRetry${api_retry_count}` : ''}`,
      model: model || null,
      latency_ms,
      patterns_used: is_delegate_call ? ['agent-delegation'] : [],
      created_at: new Date().toISOString(),
    }),
  }).catch(() => {});
}

// FEATURE: AA-87 -- live resolver, replaces the removed executing_agent_id/critique_agent
// fields. A Skill Profile may only name a capability_slug; the harness resolves who currently
// holds it at the moment of dispatch, never a static agent reference. Single-holder assumption
// (AA-93 covers the future multi-holder case -- not built here). ARCHITECTURE.md §19d/§19e.
async function resolveCapabilityHolder(capability_slug) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase not configured');
  const headers = getSupabaseHeaders(supabaseKey);
  const res = await fetch(
    `${supabaseUrl}/rest/v1/agent_capability_assignments?capability_slug=eq.${encodeURIComponent(capability_slug)}&select=agent_id&limit=1`,
    { headers }
  );
  if (!res.ok) throw new Error(`Failed to resolve holder of capability "${capability_slug}"`);
  const rows = await res.json();
  if (!rows.length) throw new Error(`No agent currently holds capability "${capability_slug}"`);
  return rows[0].agent_id;
}

// FEATURE: S-ARCH-DISPLAY-LOOP-01 -- shared helper, extracted from fetchFormatOverride()'s inline
// agent-card lookup so the new terminal-delegation path (is_final branch below) and the existing
// bundled format-override path share one fetch, never two copies of the same lookup.
async function fetchAgentCard(agentId, headers, supabaseUrl) {
  if (!agentId) return null;
  try {
    const agRes = await fetch(
      `${supabaseUrl}/rest/v1/agents?id=eq.${encodeURIComponent(agentId)}&select=name,role,specialty,bio&limit=1`,
      { headers }
    );
    if (agRes.ok) {
      const [agRow] = await agRes.json();
      return agRow || null;
    }
  } catch (e) {
    console.warn('[execute] agent card fetch failed:', e.message);
  }
  return null;
}

// FEATURE: AA-77 — fetch a display agent's Format Skill by slug and build the override pieces.
// Mirrors api/plan.js lines 198-234 exactly (same fetch, same formatContract shape) — generalized
// here so any capability can opt in, not duplicated a third time.
async function fetchFormatOverride({ format_skill_profile_slug, display_agent_id, tenant_id }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) return { formatContract: null, formatSection: null, displayAgentCard: null };
  const headers = getSupabaseHeaders(supabaseKey);

  let formatContract = null;
  let formatSection = null;
  try {
    const fspRes = await fetch(
      `${supabaseUrl}/rest/v1/skill_profiles?slug=eq.${encodeURIComponent(format_skill_profile_slug)}&select=*&limit=1`,
      { headers }
    );
    if (fspRes.ok) {
      const [fsp] = await fspRes.json();
      if (fsp) {
        const traits = fsp.traits || {};
        const outputType = traits.output_type || 'json';
        const formatParts = [`Output type: ${outputType}`];
        if (traits.section_structure) formatParts.push(`Structure: ${traits.section_structure}`);
        formatSection = `=== OUTPUT FORMAT ===\n${formatParts.join('\n')}`;
        formatContract = {
          output_type: outputType,
          skill_profile_slug: fsp.slug,
          schema: traits.schema || null,
          handler: traits.handler || 'store',
          guardrails: fsp.guardrails || { must: [], must_not: [] },
        };
      }
    }
  } catch (e) {
    console.warn('[execute] format override fetch failed:', e.message);
  }

  const displayAgentCard = display_agent_id ? await fetchAgentCard(display_agent_id, headers, supabaseUrl) : null;

  return { formatContract, formatSection, displayAgentCard };
}

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
  format_skill_profile_slug = null,
  display_agent_id = null,
  _hop_counter = null,
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

  let display_agent_card = null;
  if (format_skill_profile_slug) {
    const { formatContract, formatSection, displayAgentCard } = await fetchFormatOverride({
      format_skill_profile_slug, display_agent_id, tenant_id,
    });
    if (formatContract) {
      enriched.system_prompt = (enriched.system_prompt || '') + '\n\n---\n\n' + formatSection;
      enriched.format_contract = formatContract;
    }
    display_agent_card = displayAgentCard;
  }

  // FEATURE: AA-87 -- canRequestHelp/requiresHumanConfirmation/critique* read from promptRequest
  // (db-assembly's raw output), never from `enriched` -- same reason the old `delegates` field
  // bypassed it: ai-enrichment.js rebuilds its own return object and drops unknown fields.
  const canRequestHelp = promptRequest.canRequestHelp === true;
  const requiresHumanConfirmation = promptRequest.requiresHumanConfirmation === true;
  const critiqueCapabilitySlug = promptRequest.critiqueCapabilitySlug || null;
  const critiqueIntentSlug = promptRequest.critiqueIntentSlug || null;

  let conversationHistory = [];
  let delegationOccurred = false;
  // FEATURE: S-ARCH-DISPLAY-LOOP-01 -- threads the most recent request_help hop's real selection
  // forward instead of discarding it once delegate_to_agent fires. Generic: captures whatever a
  // request_help call in this loop resolved to, for any future capability using this same pattern,
  // not something Display-agent-specific. Reset to null on every request_help hop below so it never
  // survives stale from an earlier turn.
  let lastHelpSelection = null;
  const hopCounter = _hop_counter || { n: 0 };

  for (let depth = 0; ; depth++) {
    const turnStart = Date.now();
    const turn = await callModel({
      systemPrompt: enriched.system_prompt,
      model: enriched.llm.model,
      max_tokens: enriched.llm.max_tokens,
      format_contract: enriched.format_contract,
      canRequestHelp,
      conversation_history: conversationHistory,
    });
    logAgentTurn({
      capability_slug, intent_slug, agent_id, tenant_id,
      model: enriched.llm.model, depth, latency_ms: Date.now() - turnStart,
      is_delegate_call: turn.is_delegate_call, api_retry_count: turn.apiRetryCount || 0,
    });

    if (!turn.is_delegate_call) {
      // FEATURE: AA-87 -- consequential-action gate now lives on the capability's own final
      // output (its own Intent Skill Profile traits), not the deleted delegate-object shape.
      // Critique dispatch resolves live via resolveCapabilityHolder(), same as request_help
      // below -- never a named agent anywhere in this mechanism. ARCHITECTURE.md §19d.
      if (requiresHumanConfirmation) {
        let critique = null;
        if (critiqueCapabilitySlug) {
          if (hopCounter.n >= MAX_LOOP_DEPTH) {
            return { status: 'depth_exceeded', depth: MAX_LOOP_DEPTH, agent_id, capability_slug };
          }
          hopCounter.n++;
          const critiqueAgentId = await resolveCapabilityHolder(critiqueCapabilitySlug);
          critique = await runCapability({
            capability_slug: critiqueCapabilitySlug,
            intent_slug: critiqueIntentSlug,
            agent_id: critiqueAgentId,
            task_context: turn.tool_input,
            tenant_id,
            _hop_counter: hopCounter,
          });
        }
        const confirmation_id = await insertPendingConfirmation({
          tenant_id, agent_id, capability_slug, intent_slug,
          proposed_action: turn.tool_input, critique,
          prompt_request: { system_prompt: enriched.system_prompt, format_contract: enriched.format_contract, llm: enriched.llm },
          delegation_occurred: delegationOccurred, depth,
        });
        return { status: 'pending_confirmation', confirmation_id, proposed_action: turn.tool_input, critique, depth, agent_id, capability_slug };
      }

      const result = await sendRequest({
        prompt_request: enriched, agent_id, capability_slug, tenant_id,
        precomputed_turn: turn, delegation_occurred: delegationOccurred,
        turn_started_at: turnStart,
      });
      return { ...result, display_agent_card, display_agent_id: display_agent_id || null };
    }

    // FEATURE: AA-87 -- turn.is_delegate_call is now true only for the two harness-generic
    // tools (request_help, delegate_to_agent) -- there is no more data-driven delegate array
    // to match against. The same shared hopCounter ceiling applies to both. ARCHITECTURE.md §19d.
    if (hopCounter.n >= MAX_LOOP_DEPTH) {
      return { status: 'depth_exceeded', depth: MAX_LOOP_DEPTH, agent_id, capability_slug };
    }
    hopCounter.n++;
    delegationOccurred = true;

    let delegateResult;
    if (turn.tool_name === 'request_help') {
      // FEATURE: AA-87 -- every unresolved skill need routes to whoever currently holds
      // project-manager. This capability_slug/intent_slug pair is a platform-level constant
      // (same category as MAX_LOOP_DEPTH) -- structurally there is exactly one such broker
      // today (ARCHITECTURE.md §19e); the agent_id who holds it is still resolved live, never
      // the literal string "michelle". No fast path exists -- every request_help call reasons
      // through here, even when the roster's current state makes the outcome predictable.
      const pmAgentId = await resolveCapabilityHolder('project-manager');
      delegateResult = await runCapability({
        capability_slug: 'project-manager',
        intent_slug: 'agent-selection-intent',
        agent_id: pmAgentId,
        task_context: JSON.stringify(turn.tool_input),
        tenant_id,
        _hop_counter: hopCounter,
      });
      // FEATURE: S-ARCH-DISPLAY-LOOP-01 -- thread Michelle's real selection forward instead of
      // discarding it. Generic to any request_help hop, not Display-agent-specific: captures
      // whatever agent-selection-intent's own schema returned (reasoning/candidates), reading it
      // from delegateResult.content since sendRequest()'s handler (store) does not spread the
      // model's structured fields onto the top-level result.
      lastHelpSelection = {
        selected_by_agent_id: pmAgentId,
        reasoning: delegateResult?.content?.reasoning ?? null,
        candidates_considered: delegateResult?.content?.candidates ?? null,
      };
    } else if (turn.tool_name === 'delegate_to_agent') {
      // FEATURE: AA-87 -- dispatches straight off the model's own tool-call input. No resolver
      // call here: the model is choosing an agent_id it was just handed as a candidate (via
      // request_help above), not asserting one unprompted. This is the only place in the whole
      // mechanism an agent_id may appear, and it is always the requester's own tool-call
      // argument, never a static field.
      const { agent_id: targetAgentId, capability_slug: targetCapabilitySlug, intent_slug: targetIntentSlug, task } = turn.tool_input;
      delegateResult = await runCapability({
        capability_slug: targetCapabilitySlug,
        intent_slug: targetIntentSlug || null,
        agent_id: targetAgentId,
        task_context: task,
        tenant_id,
        _hop_counter: hopCounter,
      });

      // FEATURE: AA-114/AA-115 (S-ARCH-DISPLAY-LOOP-01) -- is_final terminates the loop here,
      // returning the delegate's own output as the final result, attributed to them, instead of
      // feeding back for the delegator's own next turn. selection is null (never fabricated) when
      // no request_help hop preceded this delegate_to_agent call in this same loop -- a legitimate
      // shape per the tool's own description (task_context-supplied candidates), same as Owen's
      // existing retry. Every existing caller that never sets is_final (Owen's retry, Priya's
      // Escalate) is unaffected -- this branch only fires when the model explicitly sets it true.
      if (turn.tool_input.is_final === true) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        const headers = getSupabaseHeaders(supabaseKey);
        const card = await fetchAgentCard(targetAgentId, headers, supabaseUrl);
        // FEATURE: S-ARCH-DISPLAY-LOOP-01 -- delegateResult.content holds the delegate's own
        // structured output (e.g. qa-answer-format's headline/body/citations/...); spread at the
        // top level here, same place callers already read it after callCapability()'s existing
        // `.content` unwrap for the ordinary terminal-dispatch shape. `status: 'final_delegation'`
        // reuses callCapability()'s existing generic `if (result.status) return result;` passthrough
        // (already built for pending_confirmation/depth_exceeded) so this flat shape survives the
        // frontend unwrap unchanged -- no capability-specific branch added to callCapability() itself.
        // patterns_used: start from the delegate's own patterns (e.g. Alex's structured-output),
        // then guarantee 'agent-delegation' is present -- this hop, by definition, just delegated
        // (delegationOccurred is already true in this loop's own scope), regardless of whether the
        // delegate itself further delegated.
        const finalPatterns = Array.from(new Set([...(delegateResult.patterns_used || []), 'agent-delegation']));
        return {
          status: 'final_delegation',
          ...delegateResult.content,
          patterns_used: finalPatterns,
          display_agent_card: card,
          display_agent_id: targetAgentId,
          selection: lastHelpSelection,
        };
      }
    }

    conversationHistory = [
      ...(conversationHistory.length > 0 ? conversationHistory : [{ role: 'user', content: enriched.system_prompt }]),
      { role: 'assistant', content: turn.raw_content },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: turn.tool_use_id, content: JSON.stringify(delegateResult) }] },
    ];
  }
}

// FEATURE: AA-103 -- accept resolution, exported separately so the Node.js test can call it
// directly (same reasoning as runCapability's own export). Checks whether the confirmed intent
// declares a follow-up intent to run now that a human has approved (on_accept_intent_slug)
// before falling back to the original terminal-dispatch behavior (resolvePendingConfirmation) --
// unchanged for any intent that doesn't declare one. This is what lets an agent who needed a
// human's OK before acting actually go act on it afterward, via the same request_help loop every
// other cross-agent hand-off uses -- never a direct call to whichever agent ends up executing it.
// ARCHITECTURE.md §19b/§19d, PLATFORM-AGENT-RULEBOOK.md AR-2.2/2.3/3.1.
export async function resolveAccept({ confirmation_id }) {
  const row = await getPendingConfirmation(confirmation_id);
  if (!row) throw Object.assign(new Error('confirmation not found'), { status: 404 });
  if (row.status !== 'pending') throw Object.assign(new Error(`confirmation already ${row.status}`), { status: 409 });

  const onAcceptIntentSlug = await getOnAcceptIntentSlug(row.intent_slug);
  if (!onAcceptIntentSlug) {
    return resolvePendingConfirmation({ confirmation_id, resolution: 'accept' });
  }

  const result = await runCapability({
    capability_slug: row.capability_slug,
    intent_slug: onAcceptIntentSlug,
    agent_id: row.agent_id,
    task_context: row.proposed_action,
    tenant_id: row.tenant_id,
  });
  await markAcceptedDelegated(confirmation_id, result);
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
    // FEATURE: AA-100 -- resolve branch checked first, additive only. No existing caller sends
    // `action`, so the normal run path below is unreached by anything but a resolve request.
    const body = req.body || {};
    if (body.action === 'resolve') {
      const { confirmation_id, resolution, edited_task_context } = body;
      if (!confirmation_id) return res.status(400).json({ error: 'confirmation_id required' });
      if (!['accept', 'reject', 'edit'].includes(resolution)) {
        return res.status(400).json({ error: 'resolution must be accept, reject, or edit' });
      }

      if (resolution === 'edit') {
        const row = await getPendingConfirmation(confirmation_id);
        if (!row) return res.status(404).json({ error: 'confirmation not found' });
        if (row.status !== 'pending') return res.status(409).json({ error: `confirmation already ${row.status}` });
        if (!edited_task_context) return res.status(400).json({ error: 'edited_task_context required for edit' });
        await markEdited(confirmation_id);
        const result = await runCapability({
          capability_slug: row.capability_slug, intent_slug: row.intent_slug,
          agent_id: row.agent_id, task_context: edited_task_context, tenant_id: row.tenant_id,
        });
        return res.status(200).json(result);
      }

      // FEATURE: AA-103 -- accept now routes through resolveAccept(), which itself falls back
      // to resolvePendingConfirmation() when the confirmed intent has no on_accept_intent_slug
      // (byte-identical old behavior for reject, and for any accept without one declared).
      if (resolution === 'accept') {
        const result = await resolveAccept({ confirmation_id });
        return res.status(200).json(result);
      }

      const result = await resolvePendingConfirmation({ confirmation_id, resolution });
      return res.status(200).json(result);
    }

    // FEATURE: AA-138 (S-ARCH-DURABLE-LOOP-01) -- checkpoint/resume POC dispatch, additive only.
    // runCapability() itself is untouched; these two branches delegate to lib/durable-loop-poc.js,
    // a separate opt-in mechanism that persists loop state to Supabase instead of a JS call stack.
    if (body.action === 'durable_start') {
      const { startDurableChain } = await import('../../lib/durable-loop-poc.js');
      const { capability_slug, intent_slug, agent_id, task_context, runtime_context, tenant_id } = body;
      const result = await startDurableChain({ capability_slug, intent_slug, agent_id, task_context, runtime_context, tenant_id });
      return res.status(200).json(result);
    }
    if (body.action === 'durable_continue') {
      const { continueDurableChain } = await import('../../lib/durable-loop-poc.js');
      const { job_id } = body;
      if (!job_id) return res.status(400).json({ error: 'job_id required' });
      const result = await continueDurableChain({ job_id });
      return res.status(200).json(result);
    }

    // FEATURE: AA-83 -- explicit public param list, never a raw req.body spread. Excludes
    // _hop_counter so no external caller can seed or override the platform's hop ceiling.
    const {
      capability_slug, intent_slug, agent_id, task_context, runtime_context,
      tenant_id, enrichment_capability_slug, format_skill_profile_slug, display_agent_id,
    } = req.body || {};
    const result = await runCapability({
      capability_slug, intent_slug, agent_id, task_context, runtime_context,
      tenant_id, enrichment_capability_slug, format_skill_profile_slug, display_agent_id,
    });
    return res.status(200).json(result);
  } catch (e) {
    console.error('[execute] error:', e);
    return res.status(e.status || 500).json({ error: e.message });
  }
}
