// DeepBench v6.1.14 | api/capabilities/execute.js | AA-144 -- normalize final_delegation shape to always carry .content
// FEATURE: AA-76 — one generic route for every AI-pattern capability. No capability-specific
// logic lives here, ever — model/max_tokens/schema come entirely from Skill Profile data via
// assemblePrompt() (AA-75). A new capability requires zero changes to this file — only new
// Supabase rows (Skill Profiles + capability_skill_profiles + agent_capability_assignments).
// FEATURE: AA-77 — format_skill_profile_slug/display_agent_id generalize the "format-last"
// pattern api/plan.js already uses for Work Orders (AA-69), so any capability can have its
// output shaped by a display agent's Format Skill in the same single call — not capability-
// specific logic, this applies to every caller that opts in via these two new params.
// FEATURE: AA-139 — promotes AA-138's proven checkpoint/resume POC into the real loop. The
// existing loop body is extracted into runLoop(), shared by both a fresh runCapability() call
// and a new resumeCapability() call. Hybrid, not unconditional: runCapability() stays fully
// in-process/synchronous by default (zero added latency for the common case) — only when a
// chain has run long enough that another hop risks the shared maxDuration ceiling does runLoop()
// checkpoint state to durable_hops and return control to the caller instead of recursing
// further. lib/durable-loop-poc.js (AA-138's isolated proof copy) is retired by this session —
// ARCHITECTURE.md §19b bans two live copies of shared pipeline loop logic.
// FEATURE: AA-144 -- fixes AA-126's empty-content guard misfiring on a NESTED final_delegation.
// delegateResult may itself be a flat final_delegation-shaped object (no `.content` key) when an
// is_final hand-off recurses into a second is_final hand-off -- the guard read `undefined` and
// threw "returned no content" even though the nested call produced perfectly good content, just
// spread flat instead of nested. buildFinalDelegationResult() now always mirrors the real content
// under a `.content` key on every final_delegation result, in addition to the existing flat
// spread, so the shape is self-describing/consistent at any recursion depth -- the same invariant
// the ordinary sendRequest() shape already provides.

import { assemblePrompt } from '../prompt/db-assembly.js';
import { enrichPrompt } from '../prompt/ai-enrichment.js';
import { sendRequest, callModel } from '../prompt/request-receivable.js';
import { insertPendingConfirmation, getPendingConfirmation, markEdited, resolvePendingConfirmation, getOnAcceptIntentSlug, markAcceptedDelegated } from '../_lib/handlers/confirmation.js';
import { createDurableHopRow, loadDurableHopRow, patchDurableHopRow } from '../_lib/handlers/durable-loop.js';

export const config = { maxDuration: 60, runtime: "nodejs" };

// FEATURE: AA-80 — platform-level hard ceiling on delegate hops per top-level request. Not
// data-overridable by any Skill Profile — infrastructure, same category as the maxDuration/
// AbortSignal.timeout() limits already in request-receivable.js. ARCHITECTURE.md §19d.
const MAX_LOOP_DEPTH = 5;

// FEATURE: AA-139 — the hybrid trigger's budget constants, grounded in real measured data, not
// guessed. AA-138's live run and the original incident measured real hop latencies ranging
// 0.15s (agent-directory lookup) to 26.1s (Marcus's own Sonnet-based answer generation) to 26.9s
// peak observed elsewhere in AA-120's prior incident report.
const MAX_ESTIMATED_HOP_MS = 30000; // worst real hop observed (AA-120/AA-138): Marcus's Sonnet answer turn, 26.1s, + buffer
const SAFETY_MARGIN_MS = 5000;      // checkpoint write + response round trip
const HOP_BUDGET_RESERVE_MS = MAX_ESTIMATED_HOP_MS + SAFETY_MARGIN_MS;

// FEATURE: AA-139 — test-only override for HOP_BUDGET_RESERVE_MS's comparison. Defaults to null,
// which is a no-op (runLoop() computes the real `deadline - Date.now()` remaining-time value on
// every hop, exactly as production does). When a test sets this, runLoop() uses this value in
// place of the computed remaining time instead, so a test can force the checkpoint branch
// deterministically without waiting out a real ~55s chain. Does not gate on NODE_ENV — this repo
// has no existing test/production env split convention to hook into; the override is inert
// whenever a test doesn't explicitly call it, which is the real safety property that matters.
let __testBudgetMs = null;
export function __setTestBudgetMs(ms) {
  __testBudgetMs = ms;
}

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

// FEATURE: AA-144 -- extracted from runLoop()'s inline is_final block so the shape-normalization
// fix below is unit-testable without hitting Supabase/Anthropic. Fixes AA-126's empty-content
// guard misfiring on a NESTED final_delegation: delegateResult may itself be a flat
// final_delegation-shaped object (no `.content` key) when an is_final hand-off recurses into a
// second is_final hand-off. The single-line fix: always mirror the real content under a `.content`
// key on every final_delegation result, in addition to the existing flat spread -- this makes the
// shape self-describing/consistent at any recursion depth, so a nested guard check (or any future
// reader) can rely on `.content` being populated whenever real content exists, same invariant the
// ordinary sendRequest() shape already provides. The flat spread is unchanged -- byte-identical to
// today for the frontend (MarketIntelligenceScreen.jsx's callCapability() returns `result` verbatim
// whenever `result.status` is set, so an added `content` key is additive, never breaking).
export function buildFinalDelegationResult({ delegateResult, targetAgentId, targetCapabilitySlug, targetIntentSlug, finalPatterns, displayAgentCard, lastHelpSelection }) {
  const content = delegateResult.content;
  if (!content || Object.keys(content).length === 0) {
    throw new Error(`delegate_to_agent: ${targetAgentId}/${targetCapabilitySlug}${targetIntentSlug ? '/' + targetIntentSlug : ''} returned no content for a final delegation (violations: ${JSON.stringify(delegateResult.violations || [])})`);
  }
  return {
    status: 'final_delegation',
    content,
    ...content,
    patterns_used: finalPatterns,
    display_agent_card: displayAgentCard,
    display_agent_id: targetAgentId,
    selection: lastHelpSelection,
  };
}

// FEATURE: AA-139 -- the shared loop body, extracted unchanged in behavior from runCapability()'s
// former in-place `for` loop, plus the new hybrid budget check. Takes fully explicit state, never
// reads closure variables, so both a fresh call (runCapability(), conversationHistory: [],
// job_id: null) and a resumed call (resumeCapability(), state loaded from durable_hops,
// job_id: row.id) share this one implementation. No second copy of the loop logic anywhere.
async function runLoop({
  capability_slug, intent_slug, agent_id, tenant_id, task_context, enriched, canRequestHelp,
  delegationRequired,
  requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug,
  display_agent_id, display_agent_card,
  conversationHistory, delegationOccurred, lastHelpSelection, hopCounter, deadline,
  job_id = null, // set only when resuming -- lets a checkpoint on the very next hop update its own row instead of creating a duplicate
}) {
  let delegationRetried = false;
  for (let depth = hopCounter.n; ; depth++) {
    // FEATURE: AA-139 -- the hybrid trigger. Checked before every hop, not just once: a chain
    // that's already spent most of its budget on earlier hops checkpoints here instead of risking
    // the next one blowing the shared maxDuration ceiling. Cheap chains (the common case) never
    // hit this -- remainingMs stays well above HOP_BUDGET_RESERVE_MS for a short chain's whole
    // life. __testBudgetMs, when set by a test, stands in for the computed remaining time so the
    // branch can be forced deterministically; it is null (inert) in every real request.
    const remainingMs = __testBudgetMs !== null ? __testBudgetMs : (deadline - Date.now());
    if (remainingMs < HOP_BUDGET_RESERVE_MS) {
      let row_id = job_id;
      if (!row_id) {
        const row = await createDurableHopRow({
          tenant_id, capability_slug, intent_slug, agent_id,
          system_prompt: enriched.system_prompt, format_contract: enriched.format_contract,
          llm: { model: enriched.llm.model, max_tokens: enriched.llm.max_tokens }, can_request_help: canRequestHelp,
        });
        row_id = row.id;
      }
      await patchDurableHopRow(row_id, {
        conversation_history: conversationHistory, hop_counter: depth,
        delegation_occurred: delegationOccurred, last_help_selection: lastHelpSelection,
      });
      return { status: 'in_progress', job_id: row_id };
    }

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
      // FEATURE: AA-142 -- delegationRequired intents (ci-answer-display-intent,
      // hyp-hypothesis-test-display-intent) must always complete via request_help/delegate_to_agent
      // -- their entire job is handing off, never answering directly. tool_choice:'auto' (harness
      // tools present) + AA-97's legitimate text-completion path (for intents that CAN validly
      // answer in text, e.g. hyp-stress-test-intent) together let the model narrate its intended
      // hand-off in prose instead of completing it -- previously accepted as an ordinary final
      // answer with no distinction. Retry once with a direct correction (same one-retry shape as
      // AA-113's transient-API-error retry, different failure class); fail loudly on a second
      // occurrence rather than silently presenting narration as a real answer, same "fail safe,
      // never fake" principle as AA-108/AA-126. Deliberately inert for any capability that never
      // declares delegation_required -- a capability that can legitimately answer in text (no
      // schema, can_request_help, delegation_required NOT set) is completely unaffected.
      if (delegationRequired && !delegationRetried) {
        delegationRetried = true;
        conversationHistory = [
          ...(conversationHistory.length > 0 ? conversationHistory : [{ role: 'user', content: enriched.system_prompt }]),
          { role: 'assistant', content: turn.raw_content },
          { role: 'user', content: 'You responded with plain text describing your intended hand-off instead of actually completing it. This task must always be completed by calling request_help, then delegate_to_agent -- call the appropriate tool now, do not describe your plan in words.' },
        ];
        continue;
      }
      if (delegationRequired && delegationRetried) {
        throw new Error(`${capability_slug}/${intent_slug}: agent ended its turn with a text response instead of completing a required delegation, twice in a row (depth ${depth})`);
      }

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
            _deadline: deadline,
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
      const finalResult = { ...result, display_agent_card, display_agent_id: display_agent_id || null };
      if (job_id) {
        await patchDurableHopRow(job_id, { status: 'complete', result: finalResult });
      }
      return finalResult;
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
        _deadline: deadline,
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
      // FEATURE: AA-126 -- forward the delegator's own real task_context (whatever structured data
      // THIS agent's own call was given -- e.g. Priya's supports/complicates/consider with real
      // citations) to the delegate, not just the delegator's own free-text `task` paraphrase. Root
      // cause: `task` is a plain string by design (generic across every delegate_to_agent use), so a
      // delegating agent has to paraphrase structured content into it -- a format skill that requires
      // every claim to trace back to real given text (e.g. Alex's intelligence-review-format) can't
      // produce a valid response from a paraphrase with no real citation IDs, and silently returns
      // little or nothing. Merging keeps the delegator's own framing (as `delegation_task`) while
      // guaranteeing the real underlying data travels intact. Generic to every delegate_to_agent call
      // -- no capability/agent name involved, no branch on which capability is being called.
      const delegateTaskContext = (task_context && typeof task_context === 'object')
        ? { ...task_context, delegation_task: task }
        : { delegation_task: task };
      delegateResult = await runCapability({
        capability_slug: targetCapabilitySlug,
        intent_slug: targetIntentSlug || null,
        agent_id: targetAgentId,
        task_context: delegateTaskContext,
        tenant_id,
        _hop_counter: hopCounter,
        _deadline: deadline,
      });

      // FEATURE: AA-114/AA-115 (S-ARCH-DISPLAY-LOOP-01) -- is_final terminates the loop here,
      // returning the delegate's own output as the final result, attributed to them, instead of
      // feeding back for the delegator's own next turn. selection is null (never fabricated) when
      // no request_help hop preceded this delegate_to_agent call in this same loop -- a legitimate
      // shape per the tool's own description (task_context-supplied candidates), same as Owen's
      // existing retry. Every existing caller that never sets is_final (Owen's retry, Priya's
      // Escalate) is unaffected -- this branch only fires when the model explicitly sets it true.
      if (turn.tool_input.is_final === true) {
        // FEATURE: AA-126 -- fail loudly instead of silently returning a hollow card. Before this
        // guard, a delegate that couldn't produce its schema-required output (insufficient
        // task_context, a guardrail block, a decline -- exact sub-mode not distinguished here,
        // deliberately: any of them means something real went wrong) resulted in
        // `...delegateResult.content` spreading nothing into finalResult, no error surfaced, no way
        // for the frontend to tell an empty card from a legitimate response. Same "fail safe, never
        // fake" principle as AA-108's assemblePrompt() guard -- a genuine platform fault, not
        // something the calling agent is expected to gracefully recover from.
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
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        const headers = getSupabaseHeaders(supabaseKey);
        const finalResult = buildFinalDelegationResult({
          delegateResult, targetAgentId, targetCapabilitySlug, targetIntentSlug,
          finalPatterns, displayAgentCard: await fetchAgentCard(targetAgentId, headers, supabaseUrl),
          lastHelpSelection,
        });
        if (job_id) {
          await patchDurableHopRow(job_id, { status: 'complete', result: finalResult });
        }
        return finalResult;
      }
    }

    conversationHistory = [
      ...(conversationHistory.length > 0 ? conversationHistory : [{ role: 'user', content: enriched.system_prompt }]),
      { role: 'assistant', content: turn.raw_content },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: turn.tool_use_id, content: JSON.stringify(delegateResult) }] },
    ];
  }
}

// FEATURE: AA-76 — core logic exported separately from the HTTP handler so the Node.js test
// can call it directly, same pattern as runChannelIntelligence/assemblePrompt/enrichPrompt.
// FEATURE: AA-139 — builds `enriched` exactly as before, then hands off to the shared runLoop().
// _deadline is threaded exactly like the existing _hop_counter pattern: a nested call (request_help
// broker turn, delegate_to_agent hop, critique dispatch) inherits its caller's real deadline
// instead of computing a fresh 60s window of its own, so the shared per-request ceiling stays
// real across the whole chain, not just the top-level invocation.
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
  _deadline = null,
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
  const delegationRequired = promptRequest.delegationRequired === true;
  const requiresHumanConfirmation = promptRequest.requiresHumanConfirmation === true;
  const critiqueCapabilitySlug = promptRequest.critiqueCapabilitySlug || null;
  const critiqueIntentSlug = promptRequest.critiqueIntentSlug || null;

  // FEATURE: AA-139 -- computed only when this is the top-level call (no _deadline passed in).
  // SAFETY_MARGIN_MS is reserved off the real 60s ceiling for the checkpoint write + response
  // round trip on whichever hop ultimately triggers it.
  const deadline = _deadline || (Date.now() + 60000 - SAFETY_MARGIN_MS);

  return runLoop({
    capability_slug, intent_slug, agent_id, tenant_id, task_context, enriched, canRequestHelp,
    delegationRequired,
    requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug,
    display_agent_id, display_agent_card,
    conversationHistory: [], delegationOccurred: false, lastHelpSelection: null,
    hopCounter: _hop_counter || { n: 0 }, deadline, job_id: null,
  });
}

// FEATURE: AA-139 -- resumes a chain runLoop() previously checkpointed. Loads the persisted state
// from durable_hops (job_id is the only thing the caller needs to carry between invocations) and
// hands off to the same runLoop() a fresh call uses -- no second loop implementation. Gets a
// genuinely fresh deadline (this is a new invocation with its own real 60s budget), not the
// exhausted one that triggered the checkpoint. `requires_human_confirmation`/critique/display
// override fields are not persisted on durable_hops (schema from AA-138, unchanged) -- a resumed
// chain runs without the consequential-action gate and without a display-card override, matching
// AA-138's proven scope; no live path today reaches the gate via a chain that also risks the
// budget ceiling (kickoff SCOPE RULES).
export async function resumeCapability({ job_id }) {
  if (!job_id) throw new Error('job_id required');
  const row = await loadDurableHopRow(job_id);

  if (row.status !== 'in_progress') {
    return { status: row.status, job_id, result: row.result, error: row.error };
  }

  const enriched = {
    system_prompt: row.system_prompt,
    format_contract: row.format_contract,
    llm: row.llm,
  };
  const deadline = Date.now() + 60000 - SAFETY_MARGIN_MS;

  return runLoop({
    capability_slug: row.capability_slug, intent_slug: row.intent_slug, agent_id: row.agent_id, tenant_id: row.tenant_id,
    // FEATURE: AA-126 -- durable_hops does not persist the original task_context (AA-138's schema,
    // unchanged). A delegate_to_agent hop that fires *after* a resume falls back to task-string-only
    // forwarding -- the pre-existing behavior, not a regression -- same accepted-gap class as the
    // requiresHumanConfirmation/critique/display fields already left unpersisted by AA-139.
    task_context: null,
    enriched, canRequestHelp: row.can_request_help,
    // FEATURE: AA-142 -- durable_hops does not persist delegationRequired (same accepted-gap
    // class as task_context/requiresHumanConfirmation/critique/display fields left unpersisted by
    // AA-126/AA-139). A resumed chain's post-checkpoint hop runs without this guard -- pre-existing
    // behavior, not a regression; real need to persist it can be its own future session.
    delegationRequired: false,
    requiresHumanConfirmation: false, critiqueCapabilitySlug: null, critiqueIntentSlug: null,
    display_agent_id: null, display_agent_card: null,
    conversationHistory: row.conversation_history || [], delegationOccurred: !!row.delegation_occurred,
    lastHelpSelection: row.last_help_selection || null, hopCounter: { n: row.hop_counter || 0 },
    deadline, job_id: row.id,
  });
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

    // FEATURE: AA-139 (S-ARCH-DURABLE-LOOP-02a) -- resumes a chain runLoop() previously
    // checkpointed to durable_hops. Supersedes AA-138's POC-only durable_start/durable_continue
    // branches (removed) -- no new `action` needed for "start": every existing caller's default
    // (no `action` field) already goes through runCapability() unchanged below, and it is now
    // budget-aware automatically, for every capability on the platform, with zero caller-side
    // changes required.
    if (body.action === 'continue') {
      const { job_id } = body;
      if (!job_id) return res.status(400).json({ error: 'job_id required' });
      const result = await resumeCapability({ job_id });
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
