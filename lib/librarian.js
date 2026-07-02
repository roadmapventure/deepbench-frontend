// DeepBench v5.3.14 | lib/librarian.js | AG-30 -- the_Library migration
// FEATURE: AG-30 -- the_Library (business data) is its own table now, not columns bolted onto
// knowledge_entries (personal agent training data). This file owns the_Library's query/embed-and-upsert
// primitives internally and does not export them -- no other file in the platform can reach the_Library
// except through queryLibrary()/writeLibrary() below. Deliberately does not import queryRAG()/
// embedAndUpsertEntry() (lib/rag.js / lib/knowledge-write.js) -- those serve knowledge_entries, a
// structurally separate table this file has no code path to, ever. See ARCHITECTURE.md Section 19c.

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

function logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier, granted }) {
  if (!supabaseUrl || !supabaseKey) return;
  fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: "return=minimal" },
    body: JSON.stringify({
      tenant_id: "global", agent_id: "eleanor", ai_type: "librarian", feature: "librarian",
      patterns_used: ["rag"], created_at: new Date().toISOString(),
    }),
  }).catch(() => {});
  void requestingAgentId; void tier; void granted;
}

function logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier, granted }) {
  if (!supabaseUrl || !supabaseKey) return;
  fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: "return=minimal" },
    body: JSON.stringify({
      tenant_id: "global", agent_id: "eleanor", ai_type: "librarian-write",
      feature: `librarian-write:${operation}`, patterns_used: [], created_at: new Date().toISOString(),
    }),
  }).catch(() => {});
  void requestingAgentId; void tier; void granted;
}

// ---- the_Library internal primitives -- NOT exported, only queryLibrary()/writeLibrary() below call these ----

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
  return embedding;
}

async function searchTheLibrary({ queryText, dataRoomTag, tenantId, matchCount, supabaseUrl, supabaseKey, openaiKey }) {
  if (!queryText || !dataRoomTag) return { context: "", chunks: [], matchCount: 0 };
  const queryEmbedding = await embedText(queryText, openaiKey);
  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/match_the_library`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    body: JSON.stringify({
      query_embedding: queryEmbedding, match_threshold: 0.3, match_count: matchCount,
      p_tenant_id: tenantId || 'global', p_data_room_tag: dataRoomTag,
    }),
  });
  if (!rpcRes.ok) return { context: "", chunks: [], matchCount: 0 };
  const matches = await rpcRes.json();
  if (!matches || matches.length === 0) return { context: "", chunks: [], matchCount: 0 };

  // FEATURE: AG-30 -- real id embedded in the context string (queryRAG() never did this, title-only).
  // This is what makes a "citations" output field meaningful -- the LLM can only cite an id it was shown.
  const contextLines = matches.map(m => {
    const jurisdictionTag = m.jurisdiction && m.jurisdiction !== "All" ? `[JURISDICTION: ${m.jurisdiction}] ` : "";
    const confidenceTag = m.confidence ? `[CONFIDENCE: ${m.confidence}] ` : "";
    const priorityTag = m.priority >= 80 ? "[CRITICAL PRIORITY] " : m.priority >= 65 ? "[HIGH PRIORITY] " : m.priority >= 40 ? "[MEDIUM PRIORITY] " : "[LOW PRIORITY] ";
    const teachingNote = m.teaching_note ? `\n[TEACHING NOTE: ${m.teaching_note}]` : "";
    return `--- LIBRARY ENTRY [id: ${m.id}]: ${m.title} ---\n${jurisdictionTag}${confidenceTag}${priorityTag}${teachingNote}\n${m.content}`;
  });
  const context = `The following Data Room entries are relevant to this task. When the output schema requires citations, cite the [id: ...] value exactly as shown:\n\n${contextLines.join("\n\n")}`;

  return {
    context,
    chunks: matches.map(m => ({ id: m.id, title: m.title, similarity: m.similarity, data_room_tag: m.data_room_tag })),
    matchCount: matches.length,
  };
}

async function writeTheLibraryEntry({
  id, title, category, jurisdiction, priority, triggers, content, status, tenant_id,
  data_room_tag, teaching_note, source, data_type, citeable, is_baseline, supersedes_id,
  confidence, override_flag, geo, program_area, partner_id, period,
  supabaseUrl, supabaseKey, openaiKey,
}) {
  if (!title || !content) throw new Error('title and content are required');
  const MAX_EMBED_CHARS = 12000;
  const truncated = content.length > MAX_EMBED_CHARS ? content.slice(0, MAX_EMBED_CHARS) + ' [truncated for embedding]' : content;
  const cleaned = truncated.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s{3,}/g, '  ').trim();
  const embedding = await embedText(`${title}\n\n${cleaned}`, openaiKey);

  const payload = {
    title, category: category || 'Compliance', jurisdiction: jurisdiction || 'All', priority: priority || 50,
    triggers: triggers || [], content, embedding, status: status || 'active',
    tenant_id: tenant_id || 'global', data_room_tag, teaching_note: teaching_note || null,
    source: source || 'agent', data_type: data_type || 'sourced',
    citeable: citeable === undefined ? true : citeable, is_baseline: is_baseline || false,
    supersedes_id: supersedes_id || null, confidence: confidence || null,
    override_flag: override_flag === undefined ? null : override_flag,
    geo: geo || null, program_area: program_area || null, partner_id: partner_id || null, period: period || null,
  };
  if (id) payload.id = id;

  // NOTE: physical table name is lowercase "the_library" -- Postgres folds unquoted mixed-case
  // identifiers, so "the_Library" in the Task 1 migration SQL created a lowercase table. PostgREST
  // matches table names case-sensitively against the actual catalog name, so the REST path must too.
  const res = await fetch(`${supabaseUrl}/rest/v1/the_library?on_conflict=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('the_Library upsert failed: ' + (await res.text()).slice(0, 200));
  const saved = await res.json();
  return saved?.[0] || payload;
}

// ---- Public broker API -- unchanged signatures except queryLibrary() gains an optional data_room_tag ----

export async function queryLibrary({ requestingAgentId, queryText, tenantId, matchCount = 5, data_room_tag }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!requestingAgentId) return { context: "", chunks: [], matchCount: 0, _librarian: { granted: false, tier: "denied-no-credential" } };
  if (!supabaseUrl || !supabaseKey || !openaiKey) return { context: "", chunks: [], matchCount: 0, _librarian: { granted: false, tier: "denied-no-config" } };

  const { data_room_access, uber_access } = await getCredentials(requestingAgentId, supabaseUrl, supabaseKey);

  // FEATURE: AG-30 -- uber_access now requires an explicit tag for reads too, same as writes already
  // required (writeLibrary's bulk_reset). There is no "all Data Rooms" query. This tightens a previously
  // dead code path (only Eleanor has uber_access, and nothing calls queryLibrary as Eleanor herself today)
  // for consistency with the write side -- confirmed via grep, no live caller affected.
  if (uber_access) {
    if (!data_room_tag) return { context: "", chunks: [], matchCount: 0, _librarian: { granted: false, tier: "denied-uber-requires-explicit-tag" } };
    const result = await searchTheLibrary({ queryText, dataRoomTag: data_room_tag, tenantId, matchCount, supabaseUrl, supabaseKey, openaiKey });
    logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier: `data-room:${data_room_tag}`, granted: true });
    return { ...result, _librarian: { granted: true, tier: `data-room:${data_room_tag}` } };
  }

  if (data_room_access.length === 1) {
    const tag = data_room_access[0];
    const result = await searchTheLibrary({ queryText, dataRoomTag: tag, tenantId, matchCount, supabaseUrl, supabaseKey, openaiKey });
    logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier: `data-room:${tag}`, granted: true });
    return { ...result, _librarian: { granted: true, tier: `data-room:${tag}` } };
  }

  if (data_room_access.length > 1) {
    logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier: "denied-multi-data-room-unsupported", granted: false });
    return { context: "", chunks: [], matchCount: 0, _librarian: { granted: false, tier: "denied-multi-data-room-unsupported" } };
  }

  logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier: "denied-no-access", granted: false });
  return { context: "", chunks: [], matchCount: 0, _librarian: { granted: false, tier: "denied-no-access" } };
}

export async function writeLibrary({ requestingAgentId, tenantId, operation, data_room_tag, ...params }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!requestingAgentId) return { success: false, _librarian: { granted: false, tier: "denied-no-credential" } };
  if (!supabaseUrl || !supabaseKey || !openaiKey) return { success: false, _librarian: { granted: false, tier: "denied-no-config" } };

  const { data_room_access, uber_access } = await getCredentials(requestingAgentId, supabaseUrl, supabaseKey);

  let targetTag;
  if (operation === "bulk_reset") {
    if (!uber_access || !data_room_tag) {
      const tier = "denied-uber-requires-explicit-tag";
      logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier, granted: false });
      return { success: false, _librarian: { granted: false, tier } };
    }
    targetTag = data_room_tag;
  } else if (uber_access) {
    if (!data_room_tag) return { success: false, _librarian: { granted: false, tier: "denied-uber-requires-explicit-tag" } };
    targetTag = data_room_tag;
  } else if (data_room_access.length === 1) {
    targetTag = data_room_access[0];
  } else {
    const tier = data_room_access.length > 1 ? "denied-multi-data-room-unsupported" : "denied-no-access";
    logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier, granted: false });
    return { success: false, _librarian: { granted: false, tier } };
  }

  const headers = { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

  try {
    if (operation === "insert") {
      const entry = await writeTheLibraryEntry({ ...params, data_room_tag: targetTag, tenant_id: tenantId, is_baseline: false, supabaseUrl, supabaseKey, openaiKey });
      logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier: `data-room:${targetTag}`, granted: true });
      return { success: true, entry, _librarian: { granted: true, tier: `data-room:${targetTag}` } };
    }

    if (operation === "update_status") {
      const { id, status } = params;
      if (!id || !status) return { success: false, _librarian: { granted: false, tier: "denied-missing-params" } };
      const r = await fetch(
        `${supabaseUrl}/rest/v1/the_library?id=eq.${id}&data_room_tag=eq.${encodeURIComponent(targetTag)}`,
        { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ status }) }
      );
      if (!r.ok) throw new Error("status update failed: " + (await r.text()).slice(0, 200));
      const updated = await r.json();
      if (!updated.length) return { success: false, _librarian: { granted: false, tier: "denied-row-not-in-data-room" } };
      logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier: `data-room:${targetTag}`, granted: true });
      return { success: true, entry: updated[0], _librarian: { granted: true, tier: `data-room:${targetTag}` } };
    }

    if (operation === "bulk_reset") {
      const archiveRes = await fetch(
        `${supabaseUrl}/rest/v1/the_library?data_room_tag=eq.${encodeURIComponent(targetTag)}&is_baseline=eq.false`,
        { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ status: "archived" }) }
      );
      if (!archiveRes.ok) throw new Error("bulk archive failed: " + (await archiveRes.text()).slice(0, 200));
      const archived = await archiveRes.json();

      const restoreRes = await fetch(
        `${supabaseUrl}/rest/v1/the_library?data_room_tag=eq.${encodeURIComponent(targetTag)}&is_baseline=eq.true`,
        { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ status: "active" }) }
      );
      if (!restoreRes.ok) throw new Error("bulk restore failed: " + (await restoreRes.text()).slice(0, 200));
      const restored = await restoreRes.json();

      logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier: `data-room:${targetTag}`, granted: true });
      return { success: true, archivedCount: archived.length, restoredCount: restored.length, _librarian: { granted: true, tier: `data-room:${targetTag}` } };
    }

    return { success: false, _librarian: { granted: false, tier: "denied-unknown-operation" } };
  } catch (err) {
    return { success: false, error: err.message, _librarian: { granted: false, tier: `error:${targetTag}` } };
  }
}
