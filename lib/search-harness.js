// DeepBench v7.0.11 | lib/search-harness.js | AA-179d -- queryContent() accepts the calling
// execution's optional traceId/spanId (the exact option names AA-179c already passes from
// api/prompt/ai-enrichment.js, inert until now) and forwards them to all three read branches:
// queryLibrary()/describeLibraryCatalog() in lib/librarian.js, and queryTheReasoning() below, which
// stamps spanId alongside the traceId it already accepted but was never handed. Passthrough
// identity fields on existing logActivity calls only -- no new row, no removed row, no behavior,
// credential, or tier change. The write side (writeContent()/writeTheReasoning()) is deliberately
// untouched: assembly reads, it never writes.
// DeepBench v6.3.228 | lib/search-harness.js | DAT-12 -- queryContent() forwards an optional
// retrieval_scope, on the the_library branch only. One parameter name, one argument, no logic.
// DeepBench v6.2.44 | lib/search-harness.js | AA-189 -- writeTheReasoning() validates source_chunk_ids are UUID-shaped before the Postgres id=in.(...) filter, reusing the existing denied-source-chunk-cross-room-or-missing denial (a malformed id, e.g. a human-readable citation label, can never resolve to a real the_library row)
// DeepBench v6.1.32 | lib/search-harness.js | AA-106 -- single public entry point for the_library + the_reasoning
// FEATURE: AA-106 (ARCHITECTURE.md §19f) -- the only file any api/ route should import to reach either
// store (starting S-ARCH-REASONING-LAYER-01b -- no existing api/ route is retargeted this session).
// Dispatches on an explicit `store` parameter -- a generic data field, never an identity conditional,
// same shape as execute.js's format_contract.handler dispatch (ARCHITECTURE.md §19b). Each branch
// enforces its own distinct policy before touching its table -- the_library stays single-gatekeeper
// (Eleanor only, via lib/librarian.js's existing, unchanged queryLibrary/writeLibrary -- NOT
// reimplemented here); the_reasoning is multi-writer, self-attributed, gated by data_room_tag/uber_access
// (ARCHITECTURE.md §19f) -- the trust boundaries are not merged, only the public surface is.

import { queryLibrary, writeLibrary, isValidDataRoomTag, describeLibraryCatalog } from './librarian.js';
import { embedAndSearch, embedContent } from './vector-search.js';
import { logActivity } from './activity-log.js';

async function getCredentials(requestingAgentId, supabaseUrl, supabaseKey) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/agents?id=eq.${encodeURIComponent(requestingAgentId)}&select=data_room_access,uber_access`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );
  if (!res.ok) return { data_room_access: [], uber_access: false };
  const rows = await res.json();
  if (!rows || !rows[0]) return { data_room_access: [], uber_access: false };
  return {
    data_room_access: Array.isArray(rows[0].data_room_access) ? rows[0].data_room_access : [],
    uber_access: !!rows[0].uber_access,
  };
}

// Same resolution shape lib/librarian.js's queryLibrary()/writeLibrary() already use -- reused here
// for the_reasoning's identical credential model (§19f: same data_room_tag/uber_access check).
function resolveTag({ data_room_access, uber_access, requestedTag }) {
  if (uber_access) {
    if (!requestedTag) return { tag: null, tier: "denied-uber-requires-explicit-tag" };
    return { tag: requestedTag, tier: `data-room:${requestedTag}` };
  }
  if (data_room_access.length === 1) return { tag: data_room_access[0], tier: `data-room:${data_room_access[0]}` };
  if (data_room_access.length > 1) return { tag: null, tier: "denied-multi-data-room-unsupported" };
  return { tag: null, tier: "denied-no-access" };
}

function formatReasoningEntry(m) {
  const confidenceTag = m.confidence ? `[CONFIDENCE: ${m.confidence}] ` : "";
  return `--- REASONING ENTRY [id: ${m.id}] [AUTHOR: ${m.agent_id}] ${confidenceTag}---\n${m.content}`;
}

// ---- the_reasoning internal primitives -- new this session, native (not a wrapper) ----

// FEATURE: AA-179d -- `spanId` joins the `traceId` this function already accepted. traceId was
// declared here but no caller ever passed it (queryContent() below did not forward it), so every
// the_reasoning read row carried trace_id: null in practice. Both now arrive from the requesting
// execution (§19p: identity travels with the work it credits).
async function queryTheReasoning({ requestingAgentId, queryText, tenantId, matchCount, data_room_tag, supabaseUrl, supabaseKey, openaiKey, traceId = null, spanId = null }) {
  const { data_room_access, uber_access } = await getCredentials(requestingAgentId, supabaseUrl, supabaseKey);
  const { tag, tier } = resolveTag({ data_room_access, uber_access, requestedTag: data_room_tag });
  if (!tag) return { context: "", chunks: [], matchCount: 0, _access: { granted: false, tier } };
  const embedStart = Date.now();
  const result = await embedAndSearch({
    rpcName: 'match_the_reasoning',
    queryText, scopeValue: tag, tenantId, matchCount, supabaseUrl, supabaseKey, openaiKey,
    formatEntry: formatReasoningEntry,
    contextIntro: "The following prior reasoning/opinion is relevant to this task -- institutional context, not verified fact unless the citing schema says otherwise. Cite the [id: ...] value exactly as shown:",
  });
  // FEATURE: LOG-09c -- embedAndSearch() already computes real usage (lib/vector-search.js's
  // embedText()) but queryTheReasoning() never logged it, unlike lib/librarian.js's equivalent
  // the_library calls which already wrap every call in their own logActivity(). Same
  // "hardcoded-at-real-occurrence" bucket-1 honesty -- logged only when queryText/dataRoomTag
  // were both present and the embed actually ran (embedAndSearch()'s own early-return guard).
  if (queryText && tag) {
    logActivity({
      tenantId: tenantId || 'global', agentId: requestingAgentId || null,
      aiType: 'similarity', feature: 'knowledge-retrieval',
      model: 'text-embedding-3-small',
      inputTokens: result.usage?.total_tokens ?? null,
      outputTokens: 0,
      latencyMs: Date.now() - embedStart,
      patternsUsed: ['rag', 'embeddings'],
      traceId,
      // FEATURE: AA-179d -- the run's execution span. The `if (queryText && tag)` conditionality
      // above is AA-177 residue and is deliberately left exactly as it is; this session only adds
      // identity fields to the call it already makes.
      spanId,
    });
  }
  return { ...result, _access: { granted: true, tier } };
}

async function writeTheReasoning({ requestingAgentId, tenantId, data_room_tag, content, source_chunk_ids, source_question, confidence, supersedes_id, supabaseUrl, supabaseKey, openaiKey }) {
  const { data_room_access, uber_access } = await getCredentials(requestingAgentId, supabaseUrl, supabaseKey);
  const { tag, tier } = resolveTag({ data_room_access, uber_access, requestedTag: data_room_tag });
  if (!tag) return { success: false, _access: { granted: false, tier } };
  if (!content) return { success: false, _access: { granted: false, tier: "denied-missing-content" } };

  const headers = { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

  if (!(await isValidDataRoomTag(tag, supabaseUrl, supabaseKey))) {
    return { success: false, _access: { granted: false, tier: "denied-invalid-data-room-tag" } };
  }

  const chunkIds = Array.isArray(source_chunk_ids) ? source_chunk_ids : [];

  // FEATURE: AA-189 — source_chunk_ids is free-text from an agent's own structured output
  // (reasoning-write.js), never format-validated before this point. A non-UUID id (e.g. a
  // human-readable citation label from Priya's hypothesis-test content) used to reach the
  // Postgres `id=in.(...)` filter below and throw a raw 22P02 syntax error, an unhandled crash.
  // A malformed id can never resolve to a real the_library row anyway, so it's treated exactly
  // like the existing missing/cross-room case below -- same graceful denial, no new shape.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (chunkIds.some(id => typeof id !== "string" || !UUID_RE.test(id))) {
    return { success: false, _access: { granted: false, tier: "denied-source-chunk-cross-room-or-missing" } };
  }

  // Cross-room integrity: every cited the_library chunk must belong to this same data_room_tag --
  // same category of check as AG-33's supersedes_id fix on the_library itself.
  if (chunkIds.length) {
    const idFilter = chunkIds.map(id => encodeURIComponent(id)).join(",");
    const chunkRes = await fetch(`${supabaseUrl}/rest/v1/the_library?id=in.(${idFilter})&select=id,data_room_tag`, { headers });
    if (!chunkRes.ok) throw new Error("source_chunk_ids lookup failed: " + (await chunkRes.text()).slice(0, 200));
    const chunkRows = await chunkRes.json();
    const crossRoom = chunkRows.length !== chunkIds.length || chunkRows.some(r => r.data_room_tag !== tag);
    if (crossRoom) return { success: false, _access: { granted: false, tier: "denied-source-chunk-cross-room-or-missing" } };
  }

  // Same-room integrity for opinion-revises-opinion.
  if (supersedes_id) {
    const supersedeRes = await fetch(`${supabaseUrl}/rest/v1/the_reasoning?id=eq.${encodeURIComponent(supersedes_id)}&select=data_room_tag`, { headers });
    if (!supersedeRes.ok) throw new Error("supersedes_id lookup failed: " + (await supersedeRes.text()).slice(0, 200));
    const [supersededRow] = await supersedeRes.json();
    if (!supersededRow || supersededRow.data_room_tag !== tag) {
      return { success: false, _access: { granted: false, tier: "denied-supersedes-cross-room" } };
    }
  }

  const embedStart = Date.now();
  const embedding = await embedContent(content, openaiKey);
  // FEATURE: LOG-09c -- same gap as queryTheReasoning() (2a) on the write side: embedContent()
  // (lib/vector-search.js's embedText()) already computes real usage, discarded until now.
  logActivity({
    tenantId: tenantId || 'global', agentId: requestingAgentId || null,
    aiType: 'similarity', feature: 'knowledge-retrieval',
    model: 'text-embedding-3-small',
    inputTokens: embedding.usage?.total_tokens ?? null,
    outputTokens: 0,
    latencyMs: Date.now() - embedStart,
    patternsUsed: ['embeddings'],
  });
  const payload = {
    tenant_id: tenantId || 'global', data_room_tag: tag,
    agent_id: requestingAgentId, // self-attributed -- never taken from caller-supplied params
    content, embedding: embedding.embedding,
    source_chunk_ids: chunkIds, source_question: source_question || null, confidence: confidence || null,
    status: 'active', supersedes_id: supersedes_id || null,
  };
  const res = await fetch(`${supabaseUrl}/rest/v1/the_reasoning`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('the_reasoning insert failed: ' + (await res.text()).slice(0, 200));
  const saved = await res.json();
  return { success: true, entry: saved?.[0] || payload, _access: { granted: true, tier } };
}

// ---- Public API -- the only exports any api/ route should use to reach either store ----

// FEATURE: AA-179d -- `traceId`/`spanId` are the run's §19p identity, named exactly as
// api/prompt/ai-enrichment.js's AA-179c call site already passes them (read off that file this
// session; it is not edited here). Until now this destructure took a fixed set of named options, so
// both were silently dropped and every Data Room / the_reasoning read row landed with trace_id:
// null -- structurally absent from the run's own trace. Generic request-level values, forwarded to
// every read branch below; nothing ever branches on them.
export async function queryContent({ requestingAgentId, store, queryText, tenantId, matchCount = 5, data_room_tag, retrieval_scope, traceId = null, spanId = null }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!requestingAgentId) return { context: "", chunks: [], matchCount: 0, _access: { granted: false, tier: "denied-no-credential" } };
  if (!supabaseUrl || !supabaseKey || !openaiKey) return { context: "", chunks: [], matchCount: 0, _access: { granted: false, tier: "denied-no-config" } };

  if (store === 'the_library') {
    // FEATURE: DAT-12 -- forwarded on THIS branch only. the_library_catalog is a different query
    // (a PostgREST status=eq.active catalog read, not this RPC), and the_reasoning has no is_baseline
    // column at all -- verified live: status and data_room_tag only -- so the concept is structurally
    // meaningless there rather than merely unimplemented.
    return queryLibrary({ requestingAgentId, queryText, tenantId, matchCount, data_room_tag, retrieval_scope, traceId, spanId });
  }
  // FEATURE: AA-162 -- deterministic catalog summary, distinct store value from 'the_library'
  // (which stays semantic top-k search). Same single-gatekeeper posture: still routes through
  // lib/librarian.js, never a second the_library access path.
  if (store === 'the_library_catalog') {
    return describeLibraryCatalog({ requestingAgentId, tenantId, data_room_tag, traceId, spanId });
  }
  if (store === 'the_reasoning') {
    return queryTheReasoning({ requestingAgentId, queryText, tenantId, matchCount, data_room_tag, supabaseUrl, supabaseKey, openaiKey, traceId, spanId });
  }
  return { context: "", chunks: [], matchCount: 0, _access: { granted: false, tier: "denied-unknown-store" } };
}

export async function writeContent({ requestingAgentId, store, tenantId, data_room_tag, ...params }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!requestingAgentId) return { success: false, _access: { granted: false, tier: "denied-no-credential" } };
  if (!supabaseUrl || !supabaseKey || !openaiKey) return { success: false, _access: { granted: false, tier: "denied-no-config" } };

  if (store === 'the_library') {
    return writeLibrary({ requestingAgentId, tenantId, data_room_tag, ...params });
  }
  if (store === 'the_reasoning') {
    if (params.operation && params.operation !== 'insert') {
      return { success: false, _access: { granted: false, tier: "denied-unsupported-operation" } };
    }
    return writeTheReasoning({ requestingAgentId, tenantId, data_room_tag, ...params, supabaseUrl, supabaseKey, openaiKey });
  }
  return { success: false, _access: { granted: false, tier: "denied-unknown-store" } };
}
