// DeepBench v5.2.13 | api/lib/rag.js | Shared RAG service — embed + vector search
// FEATURE: AA-43 — Single platform RAG service. All capability routes import queryRAG() directly.
// Rule: no capability route calls /api/rag-query via internal HTTP after this session.

export async function queryRAG({ queryText, agentId, tenantId, matchCount = 5, scope = "agent" }) {
  const openaiKey   = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!openaiKey || !supabaseUrl || !supabaseKey) return { context: "", chunks: [], matchCount: 0 };
  if (!queryText) return { context: "", chunks: [], matchCount: 0 };

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
