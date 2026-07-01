// DeepBench v5.3.6 | api/capabilities/channel-intelligence.js | S-APPLE-02b — GEO CSO Expert (Marcus/CI-01): Intent Routing (MI-10) + Q&A Answer (MI-11)
// FEATURE: MI-10/MI-11 — routes through the Prompt Service (DB Assembly -> AI Enrichment) same as every other capability (ARCHITECTURE.md §19 founding principle). Model + tool schema selected per action in code (assemblePrompt() only carries llm from a Format Skill, which this capability family deliberately has none of) — never an agent-specific conditional in the shared pipeline files.

import { assemblePrompt } from '../prompt/db-assembly.js';
import { enrichPrompt } from '../prompt/ai-enrichment.js';

export const config = { maxDuration: 30, runtime: "nodejs" };

const ROUTING_TOOL = {
  name: 'classify_intent',
  description: "Classify the director's message into one of 5 channel intelligence intents",
  input_schema: {
    type: 'object',
    properties: {
      intent: { type: 'string', enum: ['qa', 'theory', 'forecast', 'correct', 'escalate'] },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      extracted_hypothesis: {
        type: ['string', 'null'],
        description: 'A claim the director wrote unprompted, pre-filled but never auto-submitted. Null if no unprompted claim was made.',
      },
    },
    required: ['intent', 'confidence', 'extracted_hypothesis'],
  },
};

const ANSWER_TOOL = {
  name: 'answer_question',
  description: "Answer the director's question using only what the Librarian retrieved, sourced and confidence-tiered",
  input_schema: {
    type: 'object',
    properties: {
      answer: { type: 'string' },
      confidence_tier: { type: 'string', enum: ['sourced', 'inferred', 'synthesized', 'na'] },
      needs_review: {
        type: 'boolean',
        description: 'True if this answer draws on synthesized/inferred data presented as an actionable recommendation, not just informational.',
      },
      review_reason: { type: ['string', 'null'] },
      citations: { type: 'array', items: { type: 'string' }, description: 'chunk_id values the answer draws on' },
    },
    required: ['answer', 'confidence_tier', 'needs_review', 'review_reason', 'citations'],
  },
};

function getSupabaseHeaders(key) {
  return { "Content-Type": "application/json", "apikey": key, "Authorization": `Bearer ${key}` };
}

async function callAnthropic({ apiKey, model, max_tokens, systemPrompt, tool }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens,
      system: systemPrompt,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
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

function logActivity({ supabaseUrl, supabaseKey, tenantId, aiType, model, inputTokens, outputTokens, latencyMs, patternsUsed }) {
  if (!supabaseUrl || !supabaseKey) return;
  fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: 'POST',
    headers: { ...getSupabaseHeaders(supabaseKey), Prefer: 'return=minimal' },
    body: JSON.stringify({
      tenant_id: tenantId || 'global',
      ai_type: aiType,
      feature: 'channel-intelligence',
      model,
      agent_id: 'marcus',
      input_tokens: (inputTokens + outputTokens) || null,
      latency_ms: latencyMs,
      patterns_used: patternsUsed,
      created_at: new Date().toISOString(),
    }),
  }).catch(e => console.warn('[channel-intelligence] activity log failed:', e.message));
}

// FEATURE: MI-10/MI-11 — core logic exported separately from the HTTP handler so the
// Node.js test (Section 8) can call it directly, same pattern as assemblePrompt/enrichPrompt.
export async function runChannelIntelligence({ action, message, conversation_context = null, tenant_id = 'global' }) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');
  if (action !== 'route' && action !== 'answer') throw new Error("action must be 'route' or 'answer'");
  if (!message) throw new Error('message required');

  const startTime = Date.now();

  const promptRequest = await assemblePrompt({
    capability_slug: 'channel-intelligence',
    agent_id: 'marcus',
    tenant_id,
    task_context: { goal: message },
    runtime_context: conversation_context,
    intent_slug: action === 'route' ? 'ci-routing-intent' : 'ci-answer-intent',
  });
  const enriched = await enrichPrompt({ prompt_request: promptRequest, agent_id: 'marcus', capability_slug: 'channel-intelligence' });

  const model = action === 'route' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6';
  const tool = action === 'route' ? ROUTING_TOOL : ANSWER_TOOL;
  const max_tokens = action === 'route' ? 300 : 1500;

  const { result, usage } = await callAnthropic({ apiKey: anthropicKey, model, max_tokens, systemPrompt: enriched.system_prompt, tool });

  logActivity({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_KEY,
    tenantId: tenant_id,
    aiType: action === 'route' ? 'ci_routing' : 'ci_answer',
    model,
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
    latencyMs: Date.now() - startTime,
    patternsUsed: action === 'route' ? ['structured-output'] : ['rag', 'structured-output'],
  });

  return { result, debug: { rag_retrieved: enriched.debug?.rag_retrieved || false, librarian_tier: enriched.debug?.librarian_tier || null } };
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { result } = await runChannelIntelligence(req.body || {});
    return res.status(200).json(result);
  } catch (e) {
    console.error('[channel-intelligence] error:', e);
    return res.status(e.status || 500).json({ error: e.message });
  }
}
