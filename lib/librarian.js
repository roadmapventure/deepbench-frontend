// DeepBench v6.1.38 | lib/librarian.js | AA-155 -- surface data_type/citeable into rendered RAG context
// DeepBench v6.1.32 | lib/librarian.js | AA-106 -- internals refactored onto lib/vector-search.js's
// shared embed/RPC-search primitive. Public API (queryLibrary/writeLibrary) unchanged -- every existing
// caller is unaffected. See ARCHITECTURE.md §19f.
// FEATURE: AG-30 -- the_Library (business data) is its own table now, not columns bolted onto
// knowledge_entries (personal agent training data). This file owns the_Library's query/embed-and-upsert
// primitives internally and does not export them -- no other file in the platform can reach the_Library
// except through queryLibrary()/writeLibrary() below. Deliberately does not import queryRAG()/
// embedAndUpsertEntry() (lib/rag.js / lib/knowledge-write.js) -- those serve knowledge_entries, a
// structurally separate table this file has no code path to, ever. See ARCHITECTURE.md Section 19c.

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

function logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier, granted, latency_ms }) {
  if (!supabaseUrl || !supabaseKey) return;
  fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: "return=minimal" },
    body: JSON.stringify({
      tenant_id: "global", agent_id: "eleanor", ai_type: "librarian", feature: "librarian",
      patterns_used: ["rag"], created_at: new Date().toISOString(), latency_ms: latency_ms ?? null,
    }),
  }).catch(() => {});
  void requestingAgentId; void tier; void granted;
}

function logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier, granted, latency_ms }) {
  if (!supabaseUrl || !supabaseKey) return;
  fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: "return=minimal" },
    body: JSON.stringify({
      tenant_id: "global", agent_id: "eleanor", ai_type: "librarian-write",
      feature: `librarian-write:${operation}`, patterns_used: [], created_at: new Date().toISOString(), latency_ms: latency_ms ?? null,
    }),
  }).catch(() => {});
  void requestingAgentId; void tier; void granted;
}

// ---- the_Library internal primitives -- NOT exported, only queryLibrary()/writeLibrary() below call these ----

// FEATURE: AA-155 -- data_type/citeable passthrough. Before this, a synthesized/non-citeable entry
// (e.g. Nippo Carrier, data_type: 'synthesized', citeable: false) rendered textually identical to
// real sourced data -- the model had no signal to hedge on it or on its own inference layered on top,
// so it would confidently cite it as sourced fact and get correctly blocked by qg-review-intent's
// synthesized_as_fact guardrail (confirmed live: reproduced on the Japan seed question, ~30% of
// attempts). data_type was already returned by match_the_library; citeable was not -- both are now
// surfaced as an explicit tag, matching the existing jurisdiction/confidence/priority tag pattern.
function formatLibraryEntry(m) {
  const jurisdictionTag = m.jurisdiction && m.jurisdiction !== "All" ? `[JURISDICTION: ${m.jurisdiction}] ` : "";
  const confidenceTag = m.confidence ? `[CONFIDENCE: ${m.confidence}] ` : "";
  const priorityTag = m.priority >= 80 ? "[CRITICAL PRIORITY] " : m.priority >= 65 ? "[HIGH PRIORITY] " : m.priority >= 40 ? "[MEDIUM PRIORITY] " : "[LOW PRIORITY] ";
  const dataTypeTag = m.data_type && m.data_type !== 'sourced' ? `[DATA TYPE: ${m.data_type.toUpperCase()} -- not directly sourced, hedge accordingly] ` : "";
  const citeableTag = m.citeable === false ? `[NOT CITEABLE AS FACT -- reference only to inform your own inferred/synthesized reasoning, never assert as a sourced number] ` : "";
  const teachingNote = m.teaching_note ? `\n[TEACHING NOTE: ${m.teaching_note}]` : "";
  return `--- LIBRARY ENTRY [id: ${m.id}]: ${m.title} ---\n${jurisdictionTag}${confidenceTag}${priorityTag}${dataTypeTag}${citeableTag}${teachingNote}\n${m.content}`;
}

async function searchTheLibrary({ queryText, dataRoomTag, tenantId, matchCount, supabaseUrl, supabaseKey, openaiKey }) {
  return embedAndSearch({
    rpcName: 'match_the_library',
    queryText, dataRoomTag, tenantId, matchCount, supabaseUrl, supabaseKey, openaiKey,
    formatEntry: formatLibraryEntry,
    contextIntro: "The following Data Room entries are relevant to this task. When the output schema requires citations, cite the [id: ...] value exactly as shown. Entries tagged [DATA TYPE: ...] or [NOT CITEABLE AS FACT] are synthesized/inferred, not directly sourced -- you may still reference them, but hedge your own confidence_tier (inferred/synthesized, never sourced) and do not present a number drawn from one as a hard fact.",
  });
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
  const embedding = await embedContent(`${title}\n\n${cleaned}`, openaiKey);

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

// ---- Shared ground-truth check: is this a real Data Room? -- exported for lib/search-harness.js's
// writeTheReasoning() too (AA-110: same fabrication class as AA-108's intent_slug fix). data_rooms is
// a shared tag registry, not a the_Library-specific primitive, so exporting this does not violate the
// the_Library-internal-primitives rule in the file header comment above.
export async function isValidDataRoomTag(tag, supabaseUrl, supabaseKey) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/data_rooms?tag=eq.${encodeURIComponent(tag)}&select=tag`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );
  if (!res.ok) return false;
  const rows = await res.json();
  return rows.length > 0;
}

// ---- the_Library catalog summary -- deterministic aggregate, NOT semantic search. Mirrors
// useDataSources()'s own filter (src/hooks/useAgents.js) so Eleanor's spoken answer can never
// disagree with what the Column 3 Data Sources drawer already shows for the same Data Room. ----

function formatCatalogSummary(rows, targetTag) {
  if (!rows.length) {
    return `--- LIBRARY CATALOG [data room: ${targetTag}] ---\nNo active entries.`;
  }
  const byKey = {};
  for (const r of rows) {
    const key = `${r.category} (${r.data_type})`;
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push(r);
  }
  const lines = Object.entries(byKey).map(([key, entries]) => {
    const items = entries.map(e => `[id: ${e.id}] ${e.title}`).join("; ");
    return `${key} -- ${entries.length} ${entries.length === 1 ? "entry" : "entries"}: ${items}`;
  });
  return `--- LIBRARY CATALOG [data room: ${targetTag}, ${rows.length} active entries total] ---\n${lines.join("\n")}\nWhen citing a specific entry, use the [id: ...] value exactly as shown.`;
}

// FEATURE: AA-162 -- deterministic aggregate read (category/data_type/count/title/id), not a
// semantic embedding search. Answers "what exists" questions; queryLibrary() above stays the tool
// for "does the library say X" questions. Same credential resolution as queryLibrary() (uber_access
// requires an explicit tag; single-room access resolves automatically; anything else is denied).
export async function describeLibraryCatalog({ requestingAgentId, tenantId, data_room_tag }) {
  const startTime = Date.now();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!requestingAgentId) return { context: "", matchCount: 0, _librarian: { granted: false, tier: "denied-no-credential" } };
  if (!supabaseUrl || !supabaseKey) return { context: "", matchCount: 0, _librarian: { granted: false, tier: "denied-no-config" } };

  const { data_room_access, uber_access } = await getCredentials(requestingAgentId, supabaseUrl, supabaseKey);

  let targetTag;
  if (uber_access) {
    if (!data_room_tag) return { context: "", matchCount: 0, _librarian: { granted: false, tier: "denied-uber-requires-explicit-tag" } };
    targetTag = data_room_tag;
  } else if (data_room_access.length === 1) {
    targetTag = data_room_access[0];
  } else {
    const tier = data_room_access.length > 1 ? "denied-multi-data-room-unsupported" : "denied-no-access";
    logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier, granted: false, latency_ms: Date.now() - startTime });
    return { context: "", matchCount: 0, _librarian: { granted: false, tier } };
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/the_library?data_room_tag=eq.${encodeURIComponent(targetTag)}&status=eq.active&select=id,title,category,data_type&order=category,data_type,title`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );
  if (!res.ok) {
    logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier: "denied-fetch-error", granted: false, latency_ms: Date.now() - startTime });
    return { context: "", matchCount: 0, _librarian: { granted: false, tier: "denied-fetch-error" } };
  }
  const rows = await res.json();
  const context = formatCatalogSummary(rows, targetTag);
  logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier: `data-room:${targetTag}`, granted: true, latency_ms: Date.now() - startTime });
  return { context, matchCount: rows.length, _librarian: { granted: true, tier: `data-room:${targetTag}` } };
}

// ---- Public broker API -- unchanged signatures except queryLibrary() gains an optional data_room_tag ----

export async function queryLibrary({ requestingAgentId, queryText, tenantId, matchCount = 5, data_room_tag }) {
  const startTime = Date.now();
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
    logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier: `data-room:${data_room_tag}`, granted: true, latency_ms: Date.now() - startTime });
    return { ...result, _librarian: { granted: true, tier: `data-room:${data_room_tag}` } };
  }

  if (data_room_access.length === 1) {
    const tag = data_room_access[0];
    const result = await searchTheLibrary({ queryText, dataRoomTag: tag, tenantId, matchCount, supabaseUrl, supabaseKey, openaiKey });
    logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier: `data-room:${tag}`, granted: true, latency_ms: Date.now() - startTime });
    return { ...result, _librarian: { granted: true, tier: `data-room:${tag}` } };
  }

  if (data_room_access.length > 1) {
    logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier: "denied-multi-data-room-unsupported", granted: false, latency_ms: Date.now() - startTime });
    return { context: "", chunks: [], matchCount: 0, _librarian: { granted: false, tier: "denied-multi-data-room-unsupported" } };
  }

  logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier: "denied-no-access", granted: false, latency_ms: Date.now() - startTime });
  return { context: "", chunks: [], matchCount: 0, _librarian: { granted: false, tier: "denied-no-access" } };
}

export async function writeLibrary({ requestingAgentId, tenantId, operation, data_room_tag, ...params }) {
  const startTime = Date.now();
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
      logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier, granted: false, latency_ms: Date.now() - startTime });
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
    logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier, granted: false, latency_ms: Date.now() - startTime });
    return { success: false, _librarian: { granted: false, tier } };
  }

  if (!(await isValidDataRoomTag(targetTag, supabaseUrl, supabaseKey))) {
    const tier = "denied-invalid-data-room-tag";
    logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier, granted: false, latency_ms: Date.now() - startTime });
    return { success: false, _librarian: { granted: false, tier } };
  }

  const headers = { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

  try {
    if (operation === "insert") {
      // FEATURE: AG-33 -- tenant-isolation check, found during S-LIBRARIAN-04-design. A superseding
      // insert's supersedes_id FK only confirms the referenced row exists, not that it belongs to the
      // same data_room_tag -- without this, a cross-Data-Room supersede would silently succeed.
      if (params.supersedes_id) {
        const supersedeRes = await fetch(
          `${supabaseUrl}/rest/v1/the_library?id=eq.${encodeURIComponent(params.supersedes_id)}&select=data_room_tag`,
          { headers }
        );
        if (!supersedeRes.ok) throw new Error("supersedes_id lookup failed: " + (await supersedeRes.text()).slice(0, 200));
        const [supersededRow] = await supersedeRes.json();
        if (!supersededRow || supersededRow.data_room_tag !== targetTag) {
          const tier = "denied-supersedes-cross-room";
          logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier, granted: false, latency_ms: Date.now() - startTime });
          return { success: false, _librarian: { granted: false, tier } };
        }
      }

      const entry = await writeTheLibraryEntry({ ...params, data_room_tag: targetTag, tenant_id: tenantId, is_baseline: false, supabaseUrl, supabaseKey, openaiKey });
      logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier: `data-room:${targetTag}`, granted: true, latency_ms: Date.now() - startTime });
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
      logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier: `data-room:${targetTag}`, granted: true, latency_ms: Date.now() - startTime });
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

      logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier: `data-room:${targetTag}`, granted: true, latency_ms: Date.now() - startTime });
      return { success: true, archivedCount: archived.length, restoredCount: restored.length, _librarian: { granted: true, tier: `data-room:${targetTag}` } };
    }

    return { success: false, _librarian: { granted: false, tier: "denied-unknown-operation" } };
  } catch (err) {
    return { success: false, error: err.message, _librarian: { granted: false, tier: `error:${targetTag}` } };
  }
}
