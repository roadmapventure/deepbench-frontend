// DeepBench v5.2.17 | api/prompt/request-receivable.js | sendRequest named export + content in response
// FEATURE: AA-44 — Request & Receivable: third step of the Prompt Service pipeline

import { handle as storeHandle } from '../_lib/handlers/store.js';

export const config = { maxDuration: 60, runtime: 'nodejs' };

const KNOWN_HANDLERS = ['store'];

// FEATURE: AA-44 — build LLM call body based on output_type
function buildCallBody(format_contract, systemPrompt, model, max_tokens) {
  const isJson = format_contract.output_type === 'json';
  if (isJson && format_contract.schema) {
    return {
      model,
      max_tokens,
      tools: [{
        name: format_contract.skill_profile_slug,
        description: 'Return structured output',
        input_schema: format_contract.schema,
      }],
      tool_choice: { type: 'tool', name: format_contract.skill_profile_slug },
      messages: [{ role: 'user', content: systemPrompt }],
    };
  }
  return {
    model,
    max_tokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: 'Please complete the task as instructed.' }],
  };
}

// FEATURE: AA-44 — parse Anthropic response by call shape
function parseResponse(responseData, isJson) {
  if (isJson) {
    const toolUseBlock = responseData.content?.find(b => b.type === 'tool_use');
    if (!toolUseBlock) throw new Error('No tool_use block in response');
    return toolUseBlock.input;
  }
  const textBlock = responseData.content?.find(b => b.type === 'text');
  if (!textBlock) throw new Error('No text block in response');
  return textBlock.text;
}

// FEATURE: AA-44 — patterns_used array built from call shape and guardrails state
function buildPatternsUsed(isJson, guardrailsRan) {
  return [
    ...(isJson ? ['structured-output', 'tool-use'] : []),
    ...(guardrailsRan ? ['prompt-chaining', 'guardrails'] : []),
  ];
}

export async function sendRequest({ prompt_request, agent_id, capability_slug, tenant_id }) {
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

  const { task_id, sections, format_contract, llm } = prompt_request || {};

  if (!sections || !Array.isArray(sections)) {
    throw new Error('sections array required');
  }
  if (!format_contract) {
    throw new Error('format_contract required');
  }

  // FEATURE: AA-44 — handler guard: 501 for any unimplemented handler slug
  const handlerSlug = format_contract.handler || 'store';
  if (!KNOWN_HANDLERS.includes(handlerSlug)) {
    throw Object.assign(new Error(`Handler "${handlerSlug}" not implemented`), { status: 501 });
  }

  const startTime = Date.now();
  const model = llm?.model || 'claude-sonnet-4-6';
  const max_tokens = llm?.max_tokens || 2048;
  const isJson = format_contract.output_type === 'json';

  const systemPrompt = sections.map(s => `=== ${s.label} ===\n${s.content}`).join('\n\n');

  // ── STEP 1: Send to LLM ─────────────────────────────────────────────────────
  let parsedResponse;
  let usage = { input_tokens: 0, output_tokens: 0 };
  let retryCount = 0;

  const callBody = buildCallBody(format_contract, systemPrompt, model, max_tokens);

  const llmRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: anthropicHeaders,
    body: JSON.stringify(callBody),
    signal: AbortSignal.timeout(55000),
  });

  if (!llmRes.ok) {
    const text = await llmRes.text();
    throw Object.assign(new Error(`Anthropic call failed: ${llmRes.status}`), { status: 502, detail: text });
  }

  const llmData = await llmRes.json();
  usage = llmData.usage || usage;

  try {
    parsedResponse = parseResponse(llmData, isJson);
  } catch (parseErr) {
    // FEATURE: AA-44 — single retry on parse failure (JSON only)
    if (isJson) {
      retryCount = 1;
      const retryBody = {
        ...callBody,
        messages: [
          ...callBody.messages,
          { role: 'assistant', content: llmData.content },
          { role: 'user', content: 'Your response did not conform to the required schema. Please try again and return the structured output exactly as specified.' },
        ],
      };
      const retryRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: anthropicHeaders,
        body: JSON.stringify(retryBody),
        signal: AbortSignal.timeout(55000),
      });
      if (!retryRes.ok) {
        throw Object.assign(new Error('Parse failed and retry also failed'), { status: 422, detail: parseErr.message });
      }
      const retryData = await retryRes.json();
      usage.input_tokens += retryData.usage?.input_tokens || 0;
      usage.output_tokens += retryData.usage?.output_tokens || 0;
      parsedResponse = parseResponse(retryData, isJson);
    } else {
      throw Object.assign(new Error('Parse failed'), { status: 422, detail: parseErr.message });
    }
  }

  // ── STEP 2: Guardrails (PAT-13) ─────────────────────────────────────────────
  let guardrailsRan = false;
  let guardrails_passed = true;
  let violations = [];

  const guardrails = format_contract.guardrails;
  const shouldRunGuardrails = guardrails ? (guardrails.must?.length > 0 || guardrails.must_not?.length > 0 || false) : false;

  if (shouldRunGuardrails) {
    // FEATURE: AA-44 — PAT-13 post-generation Haiku guardrails check
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
            latency_ms: null,
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
  const result = await storeHandle({
    task_id: task_id || null,
    agent_id,
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
  const patternsUsed = buildPatternsUsed(isJson, guardrailsRan);
  const latency_ms = Date.now() - startTime;

  await fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: JSON.stringify({
      tenant_id: tenant_id || 'global',
      ai_type: 'request-receivable',
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
  return {
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
