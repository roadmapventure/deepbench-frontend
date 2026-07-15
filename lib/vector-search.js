// DeepBench v6.0.11 | lib/vector-search.js | AA-106 -- generic embed+RPC-search primitive
// FEATURE: AA-106 (ARCHITECTURE.md §19f) -- extracted from lib/librarian.js's previously-duplicated
// embedText()/searchTheLibrary(). lib/rag.js's queryRAG() has the same duplication independently --
// NOT touched this session (AA-105, deferred, docs/FEATURES.md). Pure mechanism: embed query text via
// OpenAI, call a named Supabase RPC, format results. No credential logic, no policy -- callers
// (lib/librarian.js, lib/search-harness.js) enforce their own access rules before calling this.

async function embedText(text, openaiKey) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error('OpenAI embedding failed: ' + (await res.text()).slice(0, 200));
  const data = await res.json();
  const embedding = data.data?.[0]?.embedding;
  if (!embedding) throw new Error('No embedding returned from OpenAI');
  // FEATURE: AA-190 -- OpenAI's embeddings response already includes usage.total_tokens; this
  // was being discarded, the root cause of Librarian's calls carrying zero token/cost data.
  return { embedding, usage: data.usage || null };
}

export async function embedContent(text, openaiKey) {
  return embedText(text, openaiKey);
}

// contextIntro: full custom intro line, provided by the caller -- keeps this primitive from having to
// know or guess what each table's citation instructions should say (the_library's existing wording is
// preserved byte-for-byte by lib/librarian.js's caller; the_reasoning gets its own, see lib/search-harness.js).
// formatEntry: per-match formatter, provided by the caller -- the_library and the_reasoning have
// different fields worth surfacing (jurisdiction/priority vs. author/confidence), so formatting stays
// caller-specific rather than this primitive guessing at a one-size-fits-all shape.
export async function embedAndSearch({ rpcName, queryText, dataRoomTag, tenantId, matchCount, supabaseUrl, supabaseKey, openaiKey, formatEntry, contextIntro }) {
  if (!queryText || !dataRoomTag) return { context: "", chunks: [], matchCount: 0, usage: null };
  const { embedding: queryEmbedding, usage } = await embedText(queryText, openaiKey);
  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    body: JSON.stringify({
      query_embedding: queryEmbedding, match_threshold: 0.3, match_count: matchCount,
      p_tenant_id: tenantId || 'global', p_data_room_tag: dataRoomTag,
    }),
  });
  if (!rpcRes.ok) return { context: "", chunks: [], matchCount: 0, usage };
  const matches = await rpcRes.json();
  if (!matches || matches.length === 0) return { context: "", chunks: [], matchCount: 0, usage };

  const contextLines = matches.map(formatEntry);
  const context = `${contextIntro}\n\n${contextLines.join("\n\n")}`;

  return {
    context,
    chunks: matches.map(m => ({ id: m.id, title: m.title || null, similarity: m.similarity, data_room_tag: m.data_room_tag })),
    matchCount: matches.length,
    usage,
  };
}
