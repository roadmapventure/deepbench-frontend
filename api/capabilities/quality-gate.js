// DeepBench v5.3.7 | api/capabilities/quality-gate.js | S-APPLE-02c — The Proofreader (Owen/CI-04): combined Guardrail + Eval (MI-12)
// FEATURE: MI-12 — routes through the Prompt Service (DB Assembly -> AI Enrichment) same as every other capability (ARCHITECTURE.md §19). On guardrail block, silently retries the source capability's answer once (imports runChannelIntelligence directly, no internal HTTP hop) before hard-failing.

import { assemblePrompt } from '../prompt/db-assembly.js';
import { enrichPrompt } from '../prompt/ai-enrichment.js';
import { runChannelIntelligence } from './channel-intelligence.js';

export const config = { maxDuration: 30, runtime: "nodejs" };

const RULE_ENUM = ['citation_missing', 'synthesized_as_fact', 'empty_retrieval', 'hallucinated_internal_data', 'missing_confidence', null];

const QUALITY_GATE_TOOL = {
  name: 'quality_gate_review',
  description: "Review a candidate answer for guardrail rule violations and quality before it reaches the director",
  input_schema: {
    type: 'object',
    properties: {
      guardrail: {
        type: 'object',
        properties: {
          result: { type: 'string', enum: ['pass', 'block'] },
          rule_violated: { type: ['string', 'null'], enum: RULE_ENUM },
          reason: { type: ['string', 'null'] },
        },
        required: ['result', 'rule_violated', 'reason'],
      },
      eval: {
        type: 'object',
        properties: {
          scores: {
            type: 'object',
            properties: {
              accuracy: { type: 'integer', minimum: 1, maximum: 5 },
              specificity: { type: 'integer', minimum: 1, maximum: 5 },
              actionability: { type: 'integer', minimum: 1, maximum: 5 },
              sourcing: { type: 'integer', minimum: 1, maximum: 5 },
              responsiveness: { type: 'integer', minimum: 1, maximum: 5 },
            },
            required: ['accuracy', 'specificity', 'actionability', 'sourcing', 'responsiveness'],
          },
          result: { type: 'string', enum: ['pass', 'revise'] },
          critique: { type: ['string', 'null'] },
        },
        required: ['scores', 'result', 'critique'],
      },
    },
    required: ['guardrail', 'eval'],
  },
};

function getSupabaseHeaders(key) {
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

async function callAnthropic({ apiKey, systemPrompt }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      tools: [QUALITY_GATE_TOOL],
      tool_choice: { type: 'tool', name: QUALITY_GATE_TOOL.name },
      messages: [{ role: 'user', content: 'Respond using the tool.' }],
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`Anthropic call failed: ${res.status}`), { status: 502, detail: text });
  }
  const data = await res.json();
  const block = data.content?.find(b => b.type === 'tool_use');
  if (!block) throw new Error('No tool_use block in response');
  return { result: block.input, usage: data.usage || { input_tokens: 0, output_tokens: 0 } };
}

function logActivity({ supabaseUrl, supabaseKey, tenantId, model, inputTokens, outputTokens, latencyMs, patternsUsed }) {
  if (!supabaseUrl || !supabaseKey) return;
  fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: 'POST',
    headers: { ...getSupabaseHeaders(supabaseKey), Prefer: 'return=minimal' },
    body: JSON.stringify({
      tenant_id: tenantId || 'global',
      ai_type: 'quality_gate_review',
      feature: 'quality-gate',
      model,
      agent_id: 'owen',
      input_tokens: (inputTokens + outputTokens) || null,
      latency_ms: latencyMs,
      patterns_used: patternsUsed,
      created_at: new Date().toISOString(),
    }),
  }).catch(e => console.warn('[quality-gate] activity log failed:', e.message));
}

async function reviewOnce({ answer, confidence_tier, citations, tenant_id }) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const startTime = Date.now();

  const promptRequest = await assemblePrompt({
    capability_slug: 'quality-gate',
    agent_id: 'owen',
    tenant_id,
    task_context: { goal: 'Review this answer for guardrail violations and quality before it reaches the director.' },
    runtime_context: JSON.stringify({ answer, confidence_tier, citations }, null, 2),
    intent_slug: 'qg-review-intent',
  });
  const enriched = await enrichPrompt({ prompt_request: promptRequest, agent_id: 'owen', capability_slug: 'quality-gate' });

  const { result, usage } = await callAnthropic({ apiKey: anthropicKey, systemPrompt: enriched.system_prompt });

  logActivity({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_KEY,
    tenantId: tenant_id,
    model: 'claude-haiku-4-5-20251001',
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
    latencyMs: Date.now() - startTime,
    patternsUsed: ['structured-output', 'guardrails', 'llm-as-judge'],
  });

  return result;
}

// FEATURE: MI-12 — core logic exported separately from the HTTP handler, same pattern as runChannelIntelligence
export async function runQualityGate({ answer, confidence_tier, citations, message, conversation_context = null, tenant_id = 'global', attempt = 1 }) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');
  if (!answer) throw new Error('answer required');

  const { guardrail, eval: evalResult } = await reviewOnce({ answer, confidence_tier, citations, tenant_id });

  if (guardrail.result === 'block') {
    if (attempt >= 2) {
      return { status: 'failed', rule_violated: guardrail.rule_violated, reason: guardrail.reason, attempts: attempt };
    }
    if (!message) throw new Error('message required to retry a blocked answer');
    const { result: retryAnswer } = await runChannelIntelligence({ action: 'answer', message, conversation_context, tenant_id });
    return runQualityGate({
      answer: retryAnswer.answer,
      confidence_tier: retryAnswer.confidence_tier,
      citations: retryAnswer.citations,
      message,
      conversation_context,
      tenant_id,
      attempt: attempt + 1,
    });
  }

  const needs_review = evalResult.result === 'revise';
  return {
    status: 'ok',
    guardrail,
    eval: evalResult,
    needs_review,
    review_reason: needs_review ? evalResult.critique : null,
    attempts: attempt,
  };
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const result = await runQualityGate(req.body || {});
    return res.status(200).json(result);
  } catch (e) {
    console.error('[quality-gate] error:', e);
    return res.status(e.status || 500).json({ error: e.message });
  }
}
