// DeepBench v6.3.215 | lib/vector-search.js | LOG-37c -- embedAndSearch() now returns the Layer A
// call facts (retrieval_method + real retrieved_chunk_ids) alongside its existing return keys, built
// in one place so no caller hand-rolls a fact shape. See ARCHITECTURE.md §19i.
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
// FEATURE: SCA-1 -- generalized from a hardcoded dataRoomTag/p_data_room_tag pair to a generic
// scopeParam/scopeValue pair, so this one shared primitive can also back Conversations (scoped by
// session_id) instead of a fourth parallel embed+search implementation. scopeParam defaults to
// 'p_data_room_tag' so the_library/the_reasoning's existing calls (lib/librarian.js,
// lib/search-harness.js) need only rename their dataRoomTag arg to scopeValue -- same RPC body,
// byte-identical.
// FEATURE: LOG-37c -- ARCHITECTURE.md §19i Layer A. Facts, never names: retrieval_method and
// retrieved_chunk_ids are structural properties of what actually executed, recorded verbatim --
// Layer B decides at read time what to call any of it, so nothing here names a pattern.
//
// Gated on `usage`, never on the caller's intent. embedAndSearch() early-returns below WITHOUT
// embedding anything when queryText or scopeValue is missing, yet its callers (lib/librarian.js,
// lib/search-harness.js, lib/conversations.js) log model: 'text-embedding-3-small' regardless --
// so rows already exist claiming an embedding call that never ran. `usage` is non-null only once
// embedText() really reached OpenAI and got a response back, which is what makes
// 'similarity-search' provable here rather than inferred. Same lesson LOG-37a-patch learned when
// getRosterCandidates() returned plain table rows in a field named `chunks`: a fact must follow
// from code that demonstrably executed. A conservative gate by design -- it under-records rather
// than asserting an embed that cannot be proven.
//
// Zero matches WITH `usage` present is "searched, found nothing": retrieval_method is still
// written and retrieved_chunk_ids is omitted entirely, which keeps that honestly distinguishable
// from "did not search" (callFacts null). That distinction is the whole point of retrieval_method
// per §19i, and logActivity() already turns an empty fact set into NULL rather than {}.
//
// Cap value matches api/prompt/request-receivable.js's RETRIEVED_CHUNK_ID_CAP (LOG-37a) -- the same
// 50. Declared locally rather than imported because lib/ must not depend on api/ (and it is not
// exported there); if one ever moves, move both.
const RETRIEVED_CHUNK_ID_CAP = 50;

function buildSearchCallFacts(usage, matches) {
  if (!usage) return null;
  const facts = { retrieval_method: 'similarity-search' };
  const ids = (matches || []).map(m => m && m.id).filter(Boolean);
  if (ids.length > 0) facts.retrieved_chunk_ids = ids.slice(0, RETRIEVED_CHUNK_ID_CAP);
  return facts;
}

export async function embedAndSearch({ rpcName, queryText, tenantId, matchCount, supabaseUrl, supabaseKey, openaiKey, formatEntry, contextIntro, scopeParam = 'p_data_room_tag', scopeValue }) {
  // FEATURE: LOG-37c -- nothing embedded on this path, so no fact is provable: omit them all.
  if (!queryText || !scopeValue) return { context: "", chunks: [], matchCount: 0, usage: null, callFacts: null };
  const { embedding: queryEmbedding, usage } = await embedText(queryText, openaiKey);
  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    body: JSON.stringify({
      query_embedding: queryEmbedding, match_threshold: 0.3, match_count: matchCount,
      p_tenant_id: tenantId || 'global', [scopeParam]: scopeValue,
    }),
  });
  // FEATURE: LOG-37c -- the embed ran (usage present) even though the search returned nothing
  // usable, so the method fact holds and only the ids are omitted. Same on both branches below.
  if (!rpcRes.ok) return { context: "", chunks: [], matchCount: 0, usage, callFacts: buildSearchCallFacts(usage, null) };
  const matches = await rpcRes.json();
  if (!matches || matches.length === 0) return { context: "", chunks: [], matchCount: 0, usage, callFacts: buildSearchCallFacts(usage, null) };

  const contextLines = matches.map(formatEntry);
  const context = `${contextIntro}\n\n${contextLines.join("\n\n")}`;

  return {
    context,
    chunks: matches.map(m => ({ id: m.id, title: m.title || null, similarity: m.similarity, data_room_tag: m.data_room_tag })),
    matchCount: matches.length,
    usage,
    // FEATURE: LOG-37c -- real ids straight off the RPC's own rows, in the order returned. Never
    // synthesized: an id exists here only because a vector match produced it.
    callFacts: buildSearchCallFacts(usage, matches),
  };
}
