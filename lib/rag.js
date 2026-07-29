// DeepBench v6.3.215 | lib/rag.js | LOG-37c -- queryRAG()'s embed log now records the one Layer A
// fact provable at that point, retrieval_method. The log call deliberately stays above the RPC, so
// retrieved_chunk_ids here is LOG-113's job, not this session's. See ARCHITECTURE.md §19i.
// DeepBench v5.2.13 | api/lib/rag.js | Shared RAG service — embed + vector search
// FEATURE: AA-43 — Single platform RAG service. All capability routes import queryRAG() directly.
// Rule: no capability route calls /api/rag-query via internal HTTP after this session.

import { logActivity } from './activity-log.js';

export async function queryRAG({ queryText, agentId, tenantId, matchCount = 5, scope = "agent", traceId = null }) {
  const openaiKey   = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!openaiKey || !supabaseUrl || !supabaseKey) return { context: "", chunks: [], matchCount: 0 };
  if (!queryText) return { context: "", chunks: [], matchCount: 0 };

  const embedStart = Date.now();
  // Step 1: Embed the query
  const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: queryText }),
  });
  if (!embeddingRes.ok) return { context: "", chunks: [], matchCount: 0 };
  const embeddingData = await embeddingRes.json();
  const queryEmbedding = embeddingData.data?.[0]?.embedding;
  if (!queryEmbedding) return { context: "", chunks: [], matchCount: 0 };

  // FEATURE: LOG-09c -- this embedding call ran, unconditionally, by the time we reach here (a
  // real fetch to OpenAI already completed with a real embedding returned) -- honest bucket-1
  // logging, same "hardcoded-at-real-occurrence" precedent lib/librarian.js already uses.
  // Activates the existing-but-never-fired SERVICE_CATALOG 'knowledge-retrieval' entry and the
  // existing similarity -> knowledge-retrieval AI_TYPE_TO_SERVICE mapping -- no catalog change.
  logActivity({
    tenantId: tenantId || 'global', agentId: agentId || null,
    aiType: 'similarity', feature: 'knowledge-retrieval',
    model: 'text-embedding-3-small',
    inputTokens: embeddingData.usage?.total_tokens ?? null,
    outputTokens: 0,
    latencyMs: Date.now() - embedStart,
    patternsUsed: ['rag', 'embeddings'],
    // FEATURE: LOG-37c -- ARCHITECTURE.md §19i Layer A. Provable by construction at this exact
    // point: control only reaches here after a real fetch to OpenAI's embeddings endpoint returned
    // a real embedding, and the next step is a vector RPC with a match_threshold. Never inferred.
    // retrieved_chunk_ids is deliberately absent -- this log call fires BEFORE the RPC below, so
    // no chunk id exists yet, and the call is deliberately NOT moved down to reach them: the RPC
    // has two early-return failure paths (!rpcRes.ok, zero matches) and logging past them would
    // silently stop logging those calls entirely, which .claude/rules/capability-logging.md
    // forbids outright. Capturing the ids here needs its own restructure -- LOG-113.
    // patterns_used above is deliberately unchanged: Layer A is additive; Layer B reclassifies at
    // read time. §19i's Layer B rule "must key on the retrieval method, not on chunk presence" --
    // this fact is exactly what makes these rag-labelled calls checkable.
    callFacts: { retrieval_method: 'similarity-search' },
    traceId,
  });

  // Step 2: Resolve scope → p_agent_id
  // "agent" → pass agentId, "capability" → falls back to platform-wide (no capability_slug on knowledge_entries yet), "platform" → null
  const effectiveTenant = tenantId || "global";
  const effectiveAgentId = (scope === "agent" && agentId) ? agentId : null;

  // Step 3: Vector search via Supabase match_knowledge RPC
  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/match_knowledge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: matchCount,
      p_tenant_id: effectiveTenant,
      p_agent_id: effectiveAgentId,
    }),
  });
  if (!rpcRes.ok) return { context: "", chunks: [], matchCount: 0 };
  const matches = await rpcRes.json();
  if (!matches || matches.length === 0) return { context: "", chunks: [], matchCount: 0 };

  // Step 4: Build context string
  const contextLines = matches.map(m => {
    const jurisdictionTag = m.jurisdiction !== "All" ? `[JURISDICTION: ${m.jurisdiction}] ` : "";
    const priorityTag = m.priority >= 80 ? "[CRITICAL PRIORITY] " : m.priority >= 65 ? "[HIGH PRIORITY] " : m.priority >= 40 ? "[MEDIUM PRIORITY] " : "[LOW PRIORITY] ";
    const teachingNote = m.teaching_note ? `\n[TEACHING NOTE: ${m.teaching_note}]` : "";
    return `--- KNOWLEDGE BASE ENTRY: ${m.title} ---\n${jurisdictionTag}${priorityTag}${teachingNote}\n${m.content}`;
  });
  const context = `The following knowledge base entries are relevant to this task. Apply them where appropriate:\n\n${contextLines.join("\n\n")}`;

  return {
    context,
    chunks: matches.map(m => ({ id: m.id, title: m.title, similarity: m.similarity, agent_id: m.agent_id })),
    matchCount: matches.length,
  };
}
