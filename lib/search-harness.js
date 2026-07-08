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

async function queryTheReasoning({ requestingAgentId, queryText, tenantId, matchCount, data_room_tag, supabaseUrl, supabaseKey, openaiKey }) {
  const { data_room_access, uber_access } = await getCredentials(requestingAgentId, supabaseUrl, supabaseKey);
  const { tag, tier } = resolveTag({ data_room_access, uber_access, requestedTag: data_room_tag });
  if (!tag) return { context: "", chunks: [], matchCount: 0, _access: { granted: false, tier } };
  const result = await embedAndSearch({
    rpcName: 'match_the_reasoning',
    queryText, dataRoomTag: tag, tenantId, matchCount, supabaseUrl, supabaseKey, openaiKey,
    formatEntry: formatReasoningEntry,
    contextIntro: "The following prior reasoning/opinion is relevant to this task -- institutional context, not verified fact unless the citing schema says otherwise. Cite the [id: ...] value exactly as shown:",
  });
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

  const embedding = await embedContent(content, openaiKey);
  const payload = {
    tenant_id: tenantId || 'global', data_room_tag: tag,
    agent_id: requestingAgentId, // self-attributed -- never taken from caller-supplied params
    content, embedding,
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

export async function queryContent({ requestingAgentId, store, queryText, tenantId, matchCount = 5, data_room_tag }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!requestingAgentId) return { context: "", chunks: [], matchCount: 0, _access: { granted: false, tier: "denied-no-credential" } };
  if (!supabaseUrl || !supabaseKey || !openaiKey) return { context: "", chunks: [], matchCount: 0, _access: { granted: false, tier: "denied-no-config" } };

  if (store === 'the_library') {
    return queryLibrary({ requestingAgentId, queryText, tenantId, matchCount, data_room_tag });
  }
  // FEATURE: AA-162 -- deterministic catalog summary, distinct store value from 'the_library'
  // (which stays semantic top-k search). Same single-gatekeeper posture: still routes through
  // lib/librarian.js, never a second the_library access path.
  if (store === 'the_library_catalog') {
    return describeLibraryCatalog({ requestingAgentId, tenantId, data_room_tag });
  }
  if (store === 'the_reasoning') {
    return queryTheReasoning({ requestingAgentId, queryText, tenantId, matchCount, data_room_tag, supabaseUrl, supabaseKey, openaiKey });
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
