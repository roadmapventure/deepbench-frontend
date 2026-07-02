// DeepBench v6.0.0 | api/capabilities/execute.js | S-APPLE-03a-2 — generalized format-last support (AA-77)
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

export const config = { maxDuration: 60, runtime: "nodejs" };

// FEATURE: AA-80 — platform-level hard ceiling on delegate hops per top-level request. Not
// data-overridable by any Skill Profile — infrastructure, same category as the maxDuration/
// AbortSignal.timeout() limits already in request-receivable.js. ARCHITECTURE.md §19d.
const MAX_LOOP_DEPTH = 5;

function getSupabaseHeaders(key) {
  return { "Content-Type": "application/json", "apikey": key, "Authorization": `Bearer ${key}` };
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

  let displayAgentCard = null;
  if (display_agent_id) {
    try {
      const agRes = await fetch(
        `${supabaseUrl}/rest/v1/agents?id=eq.${encodeURIComponent(display_agent_id)}&select=name,role,specialty,bio&limit=1`,
        { headers }
      );
      if (agRes.ok) {
        const [agRow] = await agRes.json();
        displayAgentCard = agRow || null;
      }
    } catch (e) {
      console.warn('[execute] display agent fetch failed:', e.message);
    }
  }

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

  // FEATURE: AA-77 — format-last: a display agent's Format Skill overrides format_contract and
  // appends an OUTPUT FORMAT section, same single call, same ai_activity_log row (agent_id stays
  // the requesting agent — the display agent is attributed via display_agent_card in the response,
  // never a second logged call, per ARCHITECTURE.md §19's "no silent single-agent credit" rule).
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

  // FEATURE: AA-80 — delegates come from promptRequest (db-assembly's raw output), never from
  // `enriched` -- ai-enrichment.js rebuilds its return object and does not pass unknown fields
  // through. Confirmed via source read, S-ARCH-AGENT-LOOP-01-design. ARCHITECTURE.md §19d.
  const delegates = promptRequest.delegates || [];

  // Every capability without available_delegates data takes exactly this path it always has:
  // one callModel() turn, sendRequest() finalizes. Zero behavior change when delegates=[].
  let conversationHistory = [];
  let delegationOccurred = false;
  const delegateRoundCounts = {};

  // FEATURE: AA-80 — _hop_counter is a single object shared across the entire recursive
  // runCapability() chain (never recreated per call), so ARCHITECTURE.md §19d's "hard ceiling on
  // total delegate hops per top-level request" is enforced against the whole call tree, not just
  // this invocation's own turns. A local per-invocation depth range does not satisfy this: a
  // delegate that (directly or via a cycle) targets its own capability would spawn a fresh range
  // on every recursive call, producing unbounded (or combinatorial) hops instead of a hard total.
  // Internal-only param: every external caller omits it and gets a fresh { n: 0 } counter.
  const hopCounter = _hop_counter || { n: 0 };

  for (let depth = 0; ; depth++) {
    const turn = await callModel({
      systemPrompt: enriched.system_prompt,
      model: enriched.llm.model,
      max_tokens: enriched.llm.max_tokens,
      format_contract: enriched.format_contract,
      delegates,
      conversation_history: conversationHistory,
    });

    if (!turn.is_delegate_call) {
      const result = await sendRequest({
        prompt_request: enriched, agent_id, capability_slug, tenant_id,
        precomputed_turn: turn, delegation_occurred: delegationOccurred,
      });
      return { ...result, display_agent_card, display_agent_id: display_agent_id || null };
    }

    const { delegate } = turn;

    // FEATURE: AA-80 — per-relationship cap is data (delegate.max_delegate_rounds), checked
    // before the platform's hard ceiling ever matters for a well-behaved delegate relationship.
    const roundsSoFar = delegateRoundCounts[turn.tool_name] || 0;
    if (delegate.max_delegate_rounds != null && roundsSoFar >= delegate.max_delegate_rounds) {
      return { status: 'delegate_round_limit', tool_name: turn.tool_name, limit: delegate.max_delegate_rounds, depth, agent_id, capability_slug };
    }
    delegateRoundCounts[turn.tool_name] = roundsSoFar + 1;

    // FEATURE: AA-80 — honest failure, never silent truncation. Checked against the shared
    // hopCounter (total hops across the whole call tree), not a local per-invocation range, so
    // a delegate that (directly or via a cycle) targets its own capability still terminates at
    // exactly MAX_LOOP_DEPTH total dispatches. ARCHITECTURE.md §19d.
    if (hopCounter.n >= MAX_LOOP_DEPTH) {
      return { status: 'depth_exceeded', depth: MAX_LOOP_DEPTH, agent_id, capability_slug };
    }
    hopCounter.n++;

    if (delegate.requires_human_confirmation) {
      let critique = null;
      if (delegate.critique_agent) {
        critique = await runCapability({
          capability_slug: delegate.critique_capability_slug,
          intent_slug: delegate.critique_intent_slug || null,
          agent_id: delegate.critique_agent,
          task_context: turn.tool_input,
          tenant_id,
          _hop_counter: hopCounter,
        });
      }
      return { status: 'pending_confirmation', proposed_action: turn.tool_input, delegate, critique, depth, agent_id, capability_slug };
    }

    delegationOccurred = true;
    const delegateResult = await runCapability({
      capability_slug: delegate.capability_slug,
      intent_slug: delegate.intent_slug || null,
      agent_id: delegate.executing_agent_id,
      task_context: turn.tool_input,
      tenant_id,
      _hop_counter: hopCounter,
    });

    conversationHistory = [
      ...(conversationHistory.length > 0 ? conversationHistory : [{ role: 'user', content: enriched.system_prompt }]),
      { role: 'assistant', content: turn.raw_content },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: turn.tool_use_id, content: JSON.stringify(delegateResult) }] },
    ];
  }
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
