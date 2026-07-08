// DeepBench v6.0.22 | api/prompt/request-receivable.js | S-ARCH-DISPLAY-LOOP-01 — is_final flag on delegate_to_agent (terminal Display-agent hand-off)
// FEATURE: AA-44 — Request & Receivable: third step of the Prompt Service pipeline

import { handle as storeHandle } from '../_lib/handlers/store.js';
import { handle as libraryWriteHandle } from '../_lib/handlers/library-write.js';
import { handle as reasoningWriteHandle } from '../_lib/handlers/reasoning-write.js';

export const config = { maxDuration: 60, runtime: 'nodejs' };

const HANDLERS = { store: storeHandle, 'library-write': libraryWriteHandle, 'reasoning-write': reasoningWriteHandle };
const KNOWN_HANDLERS = Object.keys(HANDLERS);

// FEATURE: AA-87 -- the two harness-generic delegation tools. Never per-capability data --
// injected automatically whenever canRequestHelp is true. request_help has no capability_slug
// field: every unresolved skill need routes to whoever holds project-manager, no exceptions,
// no fast path. delegate_to_agent's agent_id is only ever the model's own tool-call argument,
// filled in from a candidate it was actually given -- never a static field anywhere in the
// platform. ARCHITECTURE.md §19d/§19e.
const REQUEST_HELP_TOOL = {
  name: 'request_help',
  description: 'Ask the platform to find an agent who can help with a skill need you cannot resolve yourself. This always routes to whoever currently holds the project-manager capability -- you cannot and should not name a specific colleague.',
  input_schema: {
    type: 'object',
    required: ['skill_needed', 'task_description', 'reasoning'],
    properties: {
      skill_needed: { type: 'string', description: 'Plain-language description of the capability or expertise needed' },
      task_description: { type: 'string', description: 'The specific task that needs to be done' },
      context: { type: 'string', description: 'Any relevant context for whoever picks this up' },
      reasoning: { type: 'string', maxLength: 300, description: 'Why you are asking for help rather than completing this yourself -- 1-2 concise sentences, not an analysis' },
    },
  },
};

// FEATURE: AA-114/AA-115 (S-ARCH-DISPLAY-LOOP-01) -- optional is_final flag. Set true only when
// this delegation fully completes the delegator's task -- the delegate's own output becomes the
// final result, credited to them, instead of feeding back for the delegator to keep working.
const DELEGATE_TO_AGENT_TOOL = {
  name: 'delegate_to_agent',
  description: 'Dispatch a task to a specific agent and capability chosen from candidates you were actually given (e.g. by request_help). Never use an agent_id you were not given as a candidate. Set is_final true for a hand-off where nothing more is expected of you once the delegate responds.',
  input_schema: {
    type: 'object',
    required: ['agent_id', 'capability_slug', 'task', 'reasoning'],
    properties: {
      agent_id: { type: 'string' },
      capability_slug: { type: 'string' },
      intent_slug: { type: ['string', 'null'] },
      task: { type: 'string', description: 'The task for the chosen agent to perform' },
      reasoning: { type: 'string', maxLength: 300, description: 'Why you chose this candidate -- 1-2 concise sentences, not an analysis' },
      is_final: { type: 'boolean', description: 'Set true only when this delegation fully completes your task and no further judgment from you is needed -- the delegate\'s own output becomes the final result, credited to them. Omit or set false when you need to see the delegate\'s result before finishing your own turn (e.g. reviewing a regenerated answer before deciding whether it now passes).' },
    },
  },
};

// FEATURE: AA-87 -- buildCallBody() takes canRequestHelp (boolean) instead of a delegates
// array. Byte-identical output to pre-v6.0.0 when canRequestHelp=false and
// conversation_history=[]: no `system` field, systemPrompt as the first user message,
// tool_choice forced to the schema tool. ARCHITECTURE.md §19d.
// FEATURE: AA-154 -- optional temperature param, included in both returned shapes only when
// defined. Omitting the key for every unset caller preserves Anthropic's own default (1.0) --
// no behavior change for any capability that doesn't set it.
function buildCallBody({ format_contract, systemPrompt, model, max_tokens, temperature, canRequestHelp = false, conversation_history = [] }) {
  const isJson = format_contract.output_type === 'json';
  const schemaTool = (isJson && format_contract.schema)
    ? { name: format_contract.skill_profile_slug, description: 'Return structured output', input_schema: format_contract.schema }
    : null;
  const harnessTools = canRequestHelp ? [REQUEST_HELP_TOOL, DELEGATE_TO_AGENT_TOOL] : [];
  const tools = [...(schemaTool ? [schemaTool] : []), ...harnessTools];

  if (tools.length === 0) {
    return {
      model, max_tokens, system: systemPrompt,
      ...(temperature !== undefined && temperature !== null ? { temperature } : {}),
      messages: conversation_history.length > 0 ? conversation_history : [{ role: 'user', content: 'Please complete the task as instructed.' }],
    };
  }

  return {
    model, max_tokens, tools,
    ...(temperature !== undefined && temperature !== null ? { temperature } : {}),
    tool_choice: harnessTools.length > 0 ? { type: 'auto', disable_parallel_tool_use: true } : { type: 'tool', name: schemaTool.name },
    messages: conversation_history.length > 0 ? conversation_history : [{ role: 'user', content: systemPrompt }],
  };
}

// FEATURE: AA-97 -- accepts a plain-text final turn whenever no schema tool was offered
// (hasSchemaTool=false). tool_choice is 'auto' in that regime (harnessTools present, no
// schemaTool) -- the model is always allowed to finish with text instead of a tool call, but
// the old branch (keyed on tools.length > 0) required a tool_use block whenever ANY tools were
// offered, making it structurally impossible for a can_request_help capability with no schema
// (e.g. hyp-stress-test-intent) to ever end its own loop turn -- it could only call
// request_help/delegate_to_agent, looping to depth_exceeded. Root-caused live in
// S-ARCH-AGENT-LOOP-02 (Priya's hyp-stress-test-intent, first real profile to combine
// can_request_help with no schema). No ARCHITECTURE.md change -- §19d never required a schema
// alongside can_request_help, this is a parser gap, not a design change. ARCHITECTURE.md §19d.
// FEATURE: AA-147 -- validates a schema-tool call's required fields before accepting it. Needed
// because tool_choice is 'auto' (not forced) whenever harness tools are also offered (buildCallBody(),
// ~line 75) -- the model can technically satisfy "call a tool" by calling its own schema tool with an
// empty or partial input object, which previously passed straight through to sendRequest() and got
// written to a deliverable with missing/undefined content, no error surfaced anywhere (confirmed live
// in S-MARKET-INTEL-01a). Reuses callModel()'s existing retry-once-then-throw path below by throwing
// the same class of error as "No tool_use block in response" -- no new retry logic. Presence-only
// check (does the key exist on the input object) -- does not reject a legitimately empty string/array
// on a required field, only a field missing entirely. request_help/delegate_to_agent calls are exempt
// -- their own required-field completeness is a separate, pre-existing concern, out of this session's
// scope.
export function parseModelTurn(responseData, hasSchemaTool, schemaTool) {
  const toolUseBlock = responseData.content?.find(b => b.type === 'tool_use');
  if (toolUseBlock) {
    const isHarnessTool = toolUseBlock.name === 'request_help' || toolUseBlock.name === 'delegate_to_agent';
    if (!isHarnessTool && schemaTool && toolUseBlock.name === schemaTool.name) {
      const required = schemaTool.input_schema?.required || [];
      const missing = required.filter(key => !(key in (toolUseBlock.input || {})));
      if (missing.length > 0) {
        throw new Error(`Schema tool "${schemaTool.name}" called with missing required field(s): ${missing.join(', ')}`);
      }
    }
    return {
      is_delegate_call: isHarnessTool,
      tool_name: toolUseBlock.name,
      tool_use_id: toolUseBlock.id,
      tool_input: toolUseBlock.input,
    };
  }
  if (hasSchemaTool) throw new Error('No tool_use block in response');
  const textBlock = responseData.content?.find(b => b.type === 'text');
  if (!textBlock) throw new Error('No text block in response');
  return { is_delegate_call: false, tool_name: null, tool_use_id: null, tool_input: textBlock.text };
}

// FEATURE: AA-113 -- retry once on a transient non-2xx Anthropic HTTP error (429/500/502/503/529),
// with a short backoff, before giving up. Every callModel() caller across the whole platform
// (execute.js's delegation loop, sendRequest()'s own non-precomputed path) shares this helper --
// generic infrastructure, not capability-specific. Previously any transient API hiccup at any hop
// threw immediately with zero retry, killing the whole call with no trace (confirmed live 2026-07-04:
// a pending_confirmation accept 500'd once then succeeded cleanly on an immediate manual retry with
// no duplicate write). Non-transient errors (4xx other than 429) still fail fast, unchanged --
// retrying a malformed request or an auth failure would never help. Deliberately scoped to the
// initial call only -- the existing parse-failure retry's own second fetch() is untouched.
const TRANSIENT_ANTHROPIC_STATUS = new Set([429, 500, 502, 503, 529]);
const API_RETRY_BACKOFF_MS = 1000;

async function postToAnthropicWithRetry(body, headers) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(55000),
    });
    if (res.ok) return { res, apiRetryCount: attempt };
    if (attempt > 0 || !TRANSIENT_ANTHROPIC_STATUS.has(res.status)) {
      const text = await res.text();
      throw Object.assign(new Error(`Anthropic call failed: ${res.status}`), { status: 502, detail: text });
    }
    await new Promise(resolve => setTimeout(resolve, API_RETRY_BACKOFF_MS));
  }
}

// FEATURE: AA-80 — callModel(): pure extraction of sendRequest()'s prior Step 1 (call + retry-
// once-on-parse-failure), now shared by sendRequest() itself and execute.js's loop. Never runs
// guardrails/handler/logging -- that stays exclusively in sendRequest(). ARCHITECTURE.md §19d.
export async function callModel({ systemPrompt, model, max_tokens, temperature, format_contract, canRequestHelp = false, conversation_history = [] }) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');
  const anthropicHeaders = { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' };

  const isJson = format_contract.output_type === 'json';
  const schemaTool = (isJson && format_contract.schema)
    ? { name: format_contract.skill_profile_slug, description: 'Return structured output', input_schema: format_contract.schema }
    : null;
  const harnessTools = canRequestHelp ? [REQUEST_HELP_TOOL, DELEGATE_TO_AGENT_TOOL] : [];
  const tools = [...(schemaTool ? [schemaTool] : []), ...harnessTools];
  const hasSchemaTool = !!schemaTool;

  const callBody = buildCallBody({ format_contract, systemPrompt, model, max_tokens, temperature, canRequestHelp, conversation_history });

  const { res: llmRes, apiRetryCount } = await postToAnthropicWithRetry(callBody, anthropicHeaders);
  let llmData = await llmRes.json();
  let usage = llmData.usage || { input_tokens: 0, output_tokens: 0 };
  let retryCount = 0;
  let turn;

  try {
    turn = parseModelTurn(llmData, hasSchemaTool, schemaTool);
  } catch (parseErr) {
    if (tools.length > 0) {
      retryCount = 1;
      // FEATURE: AA-150/AA-151 -- Anthropic's API requires a tool_result block immediately after any
      // assistant turn containing a tool_use block. The prior corrective message was always plain text,
      // which Anthropic rejects with a 400 whenever the failed turn included a tool_use -- true for
      // effectively every JSON/schema intent and any canRequestHelp intent, making this "retry once"
      // safety net a silent no-op in the majority of real cases (confirmed live: 10% of Owen's
      // qg-review-intent calls, 80% of Priya's hyp-hypothesis-test-display-intent calls). Reuses the
      // exact tool_result shape execute.js:543 already uses for delegate-hop resume, not a new pattern.
      const correctionText = 'Your response did not conform to the required schema. Please try again and return the structured output exactly as specified.';
      const failedToolUse = llmData.content?.find(b => b.type === 'tool_use');
      const correctionMessage = failedToolUse
        ? { role: 'user', content: [{ type: 'tool_result', tool_use_id: failedToolUse.id, content: correctionText, is_error: true }] }
        : { role: 'user', content: correctionText };
      const retryBody = {
        ...callBody,
        messages: [...callBody.messages, { role: 'assistant', content: llmData.content }, correctionMessage],
      };
      const retryRes = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: anthropicHeaders, body: JSON.stringify(retryBody), signal: AbortSignal.timeout(55000) });
      if (!retryRes.ok) throw Object.assign(new Error('Parse failed and retry also failed'), { status: 422, detail: parseErr.message });
      llmData = await retryRes.json();
      usage = { input_tokens: usage.input_tokens + (llmData.usage?.input_tokens || 0), output_tokens: usage.output_tokens + (llmData.usage?.output_tokens || 0) };
      // FEATURE: AA-151 -- the retry HTTP call can now succeed (AA-150's tool_result fix) while the
      // model's retried response still fails validation itself (e.g. omits a required schema field
      // again). This second parseModelTurn() call was previously unguarded, so that failure propagated
      // uncaught as a raw error (an unhandled 500) instead of the graceful "retry also failed" 422 this
      // whole block exists to produce. Confirmed live: agent-selection-intent missing
      // recommended_agent_id, intelligence-review-format missing key_data_points/override_warning, both
      // on the retried attempt, ~40-60% of Priya's hyp-hypothesis-test-display-intent calls.
      try {
        turn = parseModelTurn(llmData, hasSchemaTool, schemaTool);
      } catch (retryParseErr) {
        throw Object.assign(new Error('Parse failed and retry also failed'), { status: 422, detail: retryParseErr.message });
      }
    } else {
      throw Object.assign(new Error('Parse failed'), { status: 422, detail: parseErr.message });
    }
  }

  return { ...turn, raw_content: llmData.content, usage, retryCount, apiRetryCount };
}

// FEATURE: AA-44 — patterns_used array built from call shape and guardrails state
function buildPatternsUsed(isJson, guardrailsRan, delegationOccurred = false) {
  return [
    ...(isJson ? ['structured-output', 'tool-use'] : []),
    ...(guardrailsRan ? ['prompt-chaining', 'guardrails'] : []),
    ...(delegationOccurred ? ['agent-delegation'] : []),
  ];
}

export async function sendRequest({ prompt_request, agent_id, capability_slug, tenant_id, precomputed_turn = null, delegation_occurred = false, turn_started_at = null }) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl) throw new Error('SUPABASE_URL not configured');
  if (!supabaseKey) throw new Error('SUPABASE_SERVICE_KEY not configured');

  const supabaseHeaders = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  };

  const anthropicHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': anthropicKey,
    'anthropic-version': '2023-06-01',
  };

  // Accept both raw db-assembly output (sections array) and enriched ai-enrichment output (system_prompt string)
  const { task_id, sections, system_prompt, format_contract, llm } = prompt_request || {};

  if (!format_contract) {
    throw new Error('format_contract required');
  }

  // FEATURE: AA-44 — handler guard: 501 for any unimplemented handler slug
  const handlerSlug = format_contract.handler || 'store';
  if (!KNOWN_HANDLERS.includes(handlerSlug)) {
    throw Object.assign(new Error(`Handler "${handlerSlug}" not implemented`), { status: 501 });
  }

  // FEATURE: AI-43 -- when execute.js's loop already ran the real callModel() call
  // (precomputed_turn path), turn_started_at carries that call's actual start time so
  // latency_ms below reflects the real model-call-through-dispatch cost for this row,
  // instead of restarting the clock here and silently excluding the model call itself --
  // the exact gap AI-43 found (a quality-gate smoke test logged latency_ms: 49, physically
  // too fast for any real Anthropic round trip; reconfirmed live 2026-07-07 on Priya's real
  // 27.5s hypothesis-test call, wrapper row logged latency_ms: 116 for the same call).
  // Callers that never pass this param (api/plan.js, confirmation.js's resolve path,
  // sendRequest()'s own non-precomputed callers) are unaffected -- Date.now() fallback,
  // byte-identical to today.
  const startTime = turn_started_at || Date.now();
  const model = llm?.model || 'claude-sonnet-4-6';
  const max_tokens = llm?.max_tokens || 2048;
  const temperature = llm?.temperature;
  const isJson = format_contract.output_type === 'json';

  // Use pre-assembled system_prompt from ai-enrichment if present; otherwise build from sections array
  let systemPrompt;
  if (system_prompt) {
    systemPrompt = system_prompt;
  } else if (Array.isArray(sections) && sections.length > 0) {
    systemPrompt = sections.map(s => `=== ${s.label} ===\n${s.content}`).join('\n\n');
  } else {
    throw new Error('either system_prompt or sections array required');
  }

  // ── STEP 1: Send to LLM ─────────────────────────────────────────────────────
  // FEATURE: AA-80 — precomputed_turn lets execute.js's loop skip a duplicate model call when
  // it already has the final turn's parsed output. Every existing caller omits this param and
  // gets the exact original single-call, single-attempt-then-retry-once behavior, unchanged.
  let parsedResponse, usage, retryCount;
  if (precomputed_turn) {
    parsedResponse = precomputed_turn.tool_input;
    usage = precomputed_turn.usage;
    retryCount = precomputed_turn.retryCount || 0;
  } else {
    const turn = await callModel({ systemPrompt, model, max_tokens, temperature, format_contract, conversation_history: [] });
    parsedResponse = turn.tool_input;
    usage = turn.usage;
    retryCount = turn.retryCount;
  }

  // ── STEP 2: Guardrails (PAT-13) ─────────────────────────────────────────────
  let guardrailsRan = false;
  let guardrails_passed = true;
  let violations = [];

  const guardrails = format_contract.guardrails;
  const shouldRunGuardrails = guardrails ? (guardrails.must?.length > 0 || guardrails.must_not?.length > 0 || false) : false;

  if (shouldRunGuardrails) {
    // FEATURE: AA-44 — PAT-13 post-generation Haiku guardrails check
    const guardrailsStart = Date.now();
    const guardrailsModel = 'claude-haiku-4-5-20251001';
    const guardrailsPrompt = `You are a content validator. Review the following AI output and check it against the rules below.

OUTPUT:
${JSON.stringify(parsedResponse)}

MUST contain:
${guardrails.must.map(r => `- ${r}`).join('\n') || '(none)'}

MUST NOT contain:
${guardrails.must_not.map(r => `- ${r}`).join('\n') || '(none)'}

Return JSON: { "passed": true|false, "violations": ["list of rule violations, or empty"] }`;

    try {
      const gRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: anthropicHeaders,
        body: JSON.stringify({
          model: guardrailsModel,
          max_tokens: 256,
          tools: [{
            name: 'guardrails_check',
            description: 'Validate output against rules',
            input_schema: {
              type: 'object',
              properties: {
                passed: { type: 'boolean' },
                violations: { type: 'array', items: { type: 'string' } },
              },
              required: ['passed', 'violations'],
            },
          }],
          tool_choice: { type: 'tool', name: 'guardrails_check' },
          messages: [{ role: 'user', content: guardrailsPrompt }],
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        const gBlock = gData.content?.find(b => b.type === 'tool_use');
        if (gBlock?.input) {
          guardrails_passed = gBlock.input.passed;
          violations = gBlock.input.violations || [];
        }
        guardrailsRan = true;

        // FEATURE: AA-44 — guardrails logged as separate ai_activity_log row
        const gTokens = (gData.usage?.input_tokens || 0) + (gData.usage?.output_tokens || 0);
        const guardrailsLatency = Date.now() - guardrailsStart;
        await fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify({
            tenant_id: tenant_id || 'global',
            ai_type: 'guardrails-check',
            feature: 'request-receivable',
            model: guardrailsModel,
            agent_id: agent_id || null,
            task_id: task_id || null,
            input_tokens: gTokens || null,
            latency_ms: guardrailsLatency,
            patterns_used: ['guardrails', 'prompt-chaining'],
          }),
        }).catch(e => console.warn('[request-receivable] guardrails log failed:', e.message));
      }
    } catch (err) {
      console.warn('[request-receivable] guardrails check failed:', err.message);
    }
  }

  // ── STEP 3: Handler dispatch ─────────────────────────────────────────────────
  let deliverable_id;
  const title = typeof parsedResponse === 'object' ? parsedResponse.title : null;
  const handlerFn = HANDLERS[handlerSlug];
  const result = await handlerFn({
    task_id: task_id || null,
    agent_id,
    tenant_id,
    skill_profile_slug: format_contract.skill_profile_slug,
    title,
    content: parsedResponse,
    format: format_contract.output_type,
    handler: handlerSlug,
    supabaseUrl,
    supabaseHeaders,
  });
  deliverable_id = result.deliverable_id;

  // ── STEP 4: Server-side ai_activity_log write ────────────────────────────────
  const patternsUsed = buildPatternsUsed(isJson, guardrailsRan, delegation_occurred);
  const latency_ms = Date.now() - startTime;

  // FEATURE: AI-41 — ai_type derived from capability_slug (bounded, matches SERVICE_CATALOG slugs
  // directly for channel-intelligence/quality-gate today, needs zero new AI_TYPE_TO_SERVICE entries
  // for either) instead of the hardcoded 'request-receivable' literal, which previously collapsed
  // every capability's calls into one undifferentiated AI Audit bucket. Fallback preserved for the
  // unreachable case where capability_slug is somehow absent.
  await fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: JSON.stringify({
      tenant_id: tenant_id || 'global',
      ai_type: capability_slug || 'request-receivable',
      feature: 'request-receivable',
      model,
      agent_id: agent_id || null,
      task_id: task_id || null,
      input_tokens: (usage.input_tokens + usage.output_tokens) || null,
      latency_ms,
      patterns_used: patternsUsed.length > 0 ? patternsUsed : null,
    }),
  }).catch(e => console.warn('[request-receivable] activity log failed:', e.message));

  // ── STEP 5: Return response ──────────────────────────────────────────────────
  // FEATURE: SK-20 — content returned in response for frontend plan rendering
  // FEATURE: AG-33 — spread handler result generically so any handler's own return fields
  // (e.g. library-write's entry_id/handler_result) surface on the top-level response, not just
  // store's deliverable_id. Additive only: store.js returns exactly { deliverable_id }, so this
  // is byte-identical for every existing caller (api/plan.js, execute.js) — deliverable_id below
  // still wins if a future handler ever returned a conflicting key, same value either way today.
  return {
    ...result,
    deliverable_id,
    title,
    handler: handlerSlug,
    guardrails_passed,
    violations,
    patterns_used: patternsUsed,
    debug: {
      model,
      tokens: usage,
      latency_ms,
      guardrails_ran: guardrailsRan,
      retry_count: retryCount,
    },
    content: parsedResponse,
  };
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt_request, agent_id, capability_slug, tenant_id } = req.body || {};
    const result = await sendRequest({ prompt_request, agent_id, capability_slug, tenant_id });
    return res.status(200).json(result);
  } catch (e) {
    console.error('[request-receivable] error:', e);
    const status = e.status || 500;
    return res.status(status).json({ error: e.message, ...(e.detail ? { detail: e.detail } : {}) });
  }
}
