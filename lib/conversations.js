// DeepBench v6.3.128 | lib/conversations.js | SCA-1 -- Conversations write/retrieve module
// FEATURE: SCA-1 -- backend infra for bounded conversation memory (root-caused in
// investigate-marcus-timeout-0722: MarketIntelligenceScreen.jsx's conversationContext() sends the
// entire, unbounded chat transcript on every turn, causing intermittent ci-answer-intent timeouts
// on long sessions). This module proves the store and retrieval work in isolation -- SCA-2 (not
// this session) is responsible for actually calling these from the real chat flow and combining
// queryConversations()'s output with a last-N-turns-verbatim window.
//
// Not brokered through lib/search-harness.js -- Conversations has no trust boundary (system-managed
// session plumbing, auto-written/auto-read, no agent ever chooses to access it), closer in kind to
// durable_hops than to the_library/the_reasoning. Same shape as lib/rag.js's unbrokered queryRAG().
import { embedContent, embedAndSearch } from './vector-search.js';
import { logActivity } from './activity-log.js';

export async function writeConversationTurn({ tenantId, sessionId, capabilitySlug, role, content, traceId = null }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const embedStart = Date.now();
  const { embedding, usage } = await embedContent(content, openaiKey);
  logActivity({
    tenantId: tenantId || 'global', agentId: null,
    aiType: 'similarity', feature: 'conversation-memory-write',
    model: 'text-embedding-3-small',
    inputTokens: usage?.total_tokens ?? null, outputTokens: 0,
    latencyMs: Date.now() - embedStart,
    patternsUsed: ['rag', 'embeddings'], traceId,
  });
  const res = await fetch(`${supabaseUrl}/rest/v1/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: 'return=minimal' },
    body: JSON.stringify({ tenant_id: tenantId || 'global', session_id: sessionId, capability_slug: capabilitySlug, role, content, embedding }),
  });
  if (!res.ok) throw new Error(`writeConversationTurn failed: ${res.status} ${await res.text()}`);
}

export async function queryConversations({ sessionId, queryText, tenantId, matchCount = 5, traceId = null }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!sessionId) return { context: "", chunks: [], matchCount: 0 };
  const embedStart = Date.now();
  const result = await embedAndSearch({
    rpcName: 'match_conversations', queryText, tenantId, matchCount,
    supabaseUrl, supabaseKey, openaiKey,
    scopeParam: 'p_session_id', scopeValue: sessionId,
    formatEntry: m => `--- ${m.role.toUpperCase()} (${new Date(m.created_at).toISOString()}) ---\n${m.content}`,
    contextIntro: "The following are relevant prior turns from this same conversation:",
  });
  logActivity({
    tenantId: tenantId || 'global', agentId: null,
    aiType: 'similarity', feature: 'conversation-memory-retrieval',
    model: 'text-embedding-3-small',
    inputTokens: result.usage?.total_tokens ?? null, outputTokens: 0,
    latencyMs: Date.now() - embedStart,
    patternsUsed: ['rag', 'embeddings'], traceId,
  });
  return result;
}
