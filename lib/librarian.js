// DeepBench v7.0.151 | lib/librarian.js | DAT-003 -- a promoted (data_type: consolidated) fact can
// now carry WHO CONFIRMED IT, verifiably. New export recordLibraryConfirmation() writes the two new
// the_library columns (confirmed_by, confirmation_id -> pending_confirmations.id) after a human
// accept resolves. The gate was already real -- §19d's requires_human_confirmation means a human
// does review every promote today -- but the fact was recorded nowhere on the resulting row, so it
// could only be trusted, never checked, and nothing structurally stopped a future capability from
// writing `consolidated` outside the gate. The design decision the ticket left open (new column vs.
// extending `source`) was settled by measurement, not preference: `source` is free prose in live
// data ('agent', 'user', "inferred from Crest Wireless scenario (id: ...)", "Analyst hypothesis
// submitted for escalation review -- not yet empirically confirmed", "test"), so giving it
// confirmation semantics would retype live rows. The load-bearing choice is that the new fields are
// NOT accepted by buildLibraryEntryPayload() -- see recordLibraryConfirmation()'s own header for
// why a model-settable confirmation field would defeat the entire ticket. 111 pre-existing
// consolidated rows stay NULL and are NOT backfilled: their true confirmer is not recoverable from
// the row, and an invented one is worse than an honest blank. See ARCHITECTURE.md §19c/§19d.
// DeepBench v7.0.11 | lib/librarian.js | AA-179d -- the two READ paths (queryLibrary(),
// describeLibraryCatalog()) accept the calling execution's optional traceId/spanId and stamp both on
// every logActivity site they already make. Eleanor Voss's `librarian` rows carried trace_id: null
// for their whole history -- structurally absent from the run that caused them, which is what made
// the Live Agent View's trace console/waterfall incomplete for assembly work. Passthrough identity
// fields only: no new log row, none removed, no credential/tier/behavior change, no schema change
// (trace_id/span_id already exist on ai_activity_log). The WRITE paths (writeLibrary and every
// librarian-write site) are deliberately untouched -- assembly is read-only, and so is
// lookupRecordsByIds(), which is not reachable from queryContent() and has no caller passing an
// execution identity. See ARCHITECTURE.md §19p.
// DeepBench v6.3.228 | lib/librarian.js | DAT-12 -- queryLibrary() gains an optional retrieval_scope.
// A CHI regression run must read the SAME corpus every time, but every run leaves agent-authored rows
// behind that outrank the seed scenarios (measured live: five near-duplicate copies of one answer
// competing for match_count's five slots), and four seed scenarios were legitimately superseded, which
// status='active' hides outright. retrieval_scope: 'baseline' reads by the is_baseline tag instead --
// a READ scope, so a run mutates nothing, cannot disturb the live screen, and cannot be disturbed by a
// concurrent session's writes (every write lands untagged). Absent/null is today's behavior, forever;
// writeLibrary() is untouched. See ARCHITECTURE.md §19c.
// DeepBench v6.3.223 | lib/librarian.js | DAT-11 -- retiring a Library fact is now ONE operation.
// Before this, it took two independent model-issued writes (an insert carrying supersedes_id, then
// an update_status flipping the old row) with nothing binding them, and both half-landings happened
// in production data: a lone flip is an instant retrieval hole (match_the_library filters
// status='active'), a lone insert leaves both versions live and retrievable. writeLibrary() gains a
// `supersede` operation that runs both halves inside supersede_library_entry() -- one transaction,
// with a postcondition that refuses a second competing superseder -- and update_status may no longer
// retire an is_baseline row (§19f's Demo Reset marker), only supersede can. insert/update_status/
// bulk_reset are otherwise untouched; insert with supersedes_id stays legal. See ARCHITECTURE.md §19c.
// DeepBench v6.3.215 | lib/librarian.js | LOG-37c -- queryLibrary()'s two retrieval log sites now
// pass the Layer A call facts embedAndSearch() already computed (retrieval_method + real
// retrieved_chunk_ids), so a ['rag','embeddings'] label finally has checkable evidence beneath it.
// patterns_used is deliberately untouched everywhere. See ARCHITECTURE.md §19i.
// DeepBench v6.3.157 | lib/librarian.js | LOO-23 -- promote-accept reliability: writeLibrary() now
// (1) validate-or-drops a bad promoted_from_reasoning_id (unknowable at insert time -> was a raw
// 23503 FK crash) and (2) UUID-guards update_status's id so a stray/absent supersede on a brand-new
// insight denies gracefully instead of raw-throwing "status update failed" and sinking a promote
// whose insert already succeeded. Same graceful-denial class as DAT-6/AA-189. See ARCHITECTURE.md §19f.
// DeepBench v6.3.145 | lib/librarian.js | LOO-22 -- add lookupRecordsByIds(): a read-only,
// record-level "does this the_library id exist and what is its data_type" verification. Unblocks
// Owen's qg-review-intent LOO-006 pre-block step (confirm a synthesized_as_fact claim traces to a
// real Data Room record before blocking). Same credential resolution as queryLibrary(); no embed,
// no write; fails closed. See ARCHITECTURE.md §19c.
// DeepBench v6.3.94 | lib/librarian.js | DAT-6 -- validate supersedes_id is UUID-shaped before the
// Postgres id=eq.<...> lookup in writeLibrary()'s insert operation; a malformed id (e.g. a
// human-readable chunk_id slug) now denies gracefully via the existing denied-supersedes-cross-room
// tier instead of throwing a raw Postgres 22P02 syntax error. Mirrors AA-189's identical guard on
// source_chunk_ids in lib/search-harness.js.
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

async function searchTheLibrary({ queryText, dataRoomTag, tenantId, matchCount, supabaseUrl, supabaseKey, openaiKey, retrievalScope }) {
  return embedAndSearch({
    rpcName: 'match_the_library',
    queryText, scopeValue: dataRoomTag, tenantId, matchCount, supabaseUrl, supabaseKey, openaiKey,
    formatEntry: formatLibraryEntry,
    // FEATURE: DAT-12 -- the key is omitted ENTIRELY when no scope was requested, never sent as an
    // explicit null. That keeps the RPC body byte-identical for every existing caller, which is the
    // property Task 4b's gate measures.
    ...(retrievalScope ? { extraRpcParams: { p_retrieval_scope: retrievalScope } } : {}),
    contextIntro: "The following Data Room entries are relevant to this task. When the output schema requires citations, cite the [id: ...] value exactly as shown. Entries tagged [DATA TYPE: ...] or [NOT CITEABLE AS FACT] are synthesized/inferred, not directly sourced -- you may still reference them, but hedge your own confidence_tier (inferred/synthesized, never sourced) and do not present a number drawn from one as a hard fact.",
  });
}

// FEATURE: DAT-11 -- payload assembly (and the embed that feeds it) split out of
// writeTheLibraryEntry() so the new `supersede` operation hands supersede_library_entry() the exact
// same COMPLETE record an insert would upsert. This split is load-bearing, not tidiness: that
// Postgres function builds its row with jsonb_populate_record(), which sets every absent column to
// NULL and therefore overrides the table's own column defaults -- a hand-assembled partial would
// silently blank title/tenant_id/data_type/citeable rather than defaulting them. One builder, two
// callers, one payload shape.
async function buildLibraryEntryPayload({
  id, title, category, jurisdiction, priority, triggers, content, status, tenant_id,
  data_room_tag, teaching_note, source, data_type, citeable, is_baseline, supersedes_id,
  promoted_from_reasoning_id,
  confidence, override_flag, geo, program_area, partner_id, period,
  openaiKey,
}) {
  if (!title || !content) throw new Error('title and content are required');
  const MAX_EMBED_CHARS = 12000;
  const truncated = content.length > MAX_EMBED_CHARS ? content.slice(0, MAX_EMBED_CHARS) + ' [truncated for embedding]' : content;
  const cleaned = truncated.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s{3,}/g, '  ').trim();
  const { embedding, usage } = await embedContent(`${title}\n\n${cleaned}`, openaiKey);

  const payload = {
    title, category: category || 'Compliance', jurisdiction: jurisdiction || 'All', priority: priority || 50,
    triggers: triggers || [], content, embedding, status: status || 'active',
    tenant_id: tenant_id || 'global', data_room_tag, teaching_note: teaching_note || null,
    source: source || 'agent', data_type: data_type || 'sourced',
    citeable: citeable === undefined ? true : citeable, is_baseline: is_baseline || false,
    supersedes_id: supersedes_id || null, promoted_from_reasoning_id: promoted_from_reasoning_id || null,
    confidence: confidence || null,
    override_flag: override_flag === undefined ? null : override_flag,
    geo: geo || null, program_area: program_area || null, partner_id: partner_id || null, period: period || null,
  };
  if (id) payload.id = id;
  return { payload, usage };
}

async function writeTheLibraryEntry(args) {
  const { supabaseUrl, supabaseKey } = args;
  const { payload, usage } = await buildLibraryEntryPayload(args);

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
  return { ...(saved?.[0] || payload), usage };
}

// FEATURE: AG-33 + DAT-6, moved here by DAT-11 -- the supersedes_id target guard, lifted verbatim
// out of writeLibrary()'s `insert` branch so `insert` and `supersede` share exactly ONE copy rather
// than drifting apart. Both halves of it are load-bearing and both were found live:
//   AG-33 -- a supersedes_id FK only proves the referenced row exists, not that it belongs to the
//            same data_room_tag; without this a cross-Data-Room supersede silently succeeded.
//   DAT-6 -- supersedes_id is constructed downstream of a model's own structured output and was
//            never format-validated, so a non-UUID id (a human-readable chunk_id slug) reached the
//            Postgres `id=eq.<...>` filter and threw a raw 22P02. A malformed id can never resolve
//            to a real the_library row anyway, so it gets the identical graceful denial, no new
//            tier. Same shape as AA-189's source_chunk_ids guard (lib/search-harness.js).
// Returns null when the target is usable, or the denial tier string when it is not.
async function checkSupersedeTarget(supersedesId, targetTag, supabaseUrl, headers) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof supersedesId !== "string" || !UUID_RE.test(supersedesId)) return "denied-supersedes-cross-room";

  const res = await fetch(
    `${supabaseUrl}/rest/v1/the_library?id=eq.${encodeURIComponent(supersedesId)}&select=data_room_tag`,
    { headers }
  );
  if (!res.ok) throw new Error("supersedes_id lookup failed: " + (await res.text()).slice(0, 200));
  const [row] = await res.json();
  if (!row || row.data_room_tag !== targetTag) return "denied-supersedes-cross-room";
  return null;
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
// FEATURE: AA-179d -- traceId/spanId are the requesting execution's own §19p identity, forwarded
// verbatim by lib/search-harness.js's queryContent(). Both default to null so every non-assembly
// caller keeps writing exactly the row it wrote before.
export async function describeLibraryCatalog({ requestingAgentId, tenantId, data_room_tag, traceId = null, spanId = null }) {
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
    logActivity({ agentId: 'eleanor', aiType: 'librarian', feature: 'librarian', latencyMs: Date.now() - startTime, traceId, spanId });
    return { context: "", matchCount: 0, _librarian: { granted: false, tier } };
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/the_library?data_room_tag=eq.${encodeURIComponent(targetTag)}&status=eq.active&select=id,title,category,data_type&order=category,data_type,title`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );
  if (!res.ok) {
    logActivity({ agentId: 'eleanor', aiType: 'librarian', feature: 'librarian', latencyMs: Date.now() - startTime, traceId, spanId });
    return { context: "", matchCount: 0, _librarian: { granted: false, tier: "denied-fetch-error" } };
  }
  const rows = await res.json();
  const context = formatCatalogSummary(rows, targetTag);
  logActivity({ agentId: 'eleanor', aiType: 'librarian', feature: 'librarian', latencyMs: Date.now() - startTime, traceId, spanId });
  return { context, matchCount: rows.length, _librarian: { granted: true, tier: `data-room:${targetTag}` } };
}

// ---- Public broker API -- unchanged signatures except queryLibrary() gains an optional data_room_tag ----

// FEATURE: DAT-12 -- the complete set of legal retrieval_scope values. Absent/null means today's
// behavior (match_the_library filters status='active') and is the permanent default -- nothing on the
// platform ever defaults this to 'baseline'. Validation lives here rather than in SQL because
// match_the_library's own `case` treats any unrecognized value exactly like an absent one: a typo
// would silently return the unscoped corpus and a scoped run would look like it worked. That silent
// fall-through is the failure mode this guard exists to make impossible.
const LEGAL_RETRIEVAL_SCOPES = new Set(['baseline']);

// FEATURE: AA-179d -- same passthrough as describeLibraryCatalog() above: the requesting
// execution's §19p identity, forwarded by queryContent() and stamped on all five logActivity sites
// below (the two retrieval logs and the three denial logs alike -- a denied read is still work this
// run caused, and leaving denials un-traced would put a hole in the waterfall exactly where a
// credential problem needs to be visible). Defaults to null for every caller that has no run.
export async function queryLibrary({ requestingAgentId, queryText, tenantId, matchCount = 5, data_room_tag, retrieval_scope, traceId = null, spanId = null }) {
  const startTime = Date.now();

  // FEATURE: DAT-12 -- checked BEFORE credentials and config, deliberately: an illegal argument is
  // wrong regardless of environment, and checking it first is what makes this path provably free of
  // any network call (tests/regression/DAT-12-retrieval-scope.js asserts no embedding ran, not merely
  // that the shape came back right). Denial tier matches this file's existing denied-* vocabulary.
  if (retrieval_scope != null && !LEGAL_RETRIEVAL_SCOPES.has(retrieval_scope)) {
    logActivity({ agentId: 'eleanor', aiType: 'librarian', feature: 'librarian', latencyMs: Date.now() - startTime, traceId, spanId });
    return { context: "", chunks: [], matchCount: 0, _librarian: { granted: false, tier: "denied-unknown-retrieval-scope" } };
  }

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
    const result = await searchTheLibrary({ queryText, dataRoomTag: data_room_tag, tenantId, matchCount, supabaseUrl, supabaseKey, openaiKey, retrievalScope: retrieval_scope });
    logActivity({
      agentId: 'eleanor', aiType: 'librarian', feature: 'librarian',
      model: 'text-embedding-3-small',
      inputTokens: result.usage?.total_tokens ?? null,
      latencyMs: Date.now() - startTime,
      patternsUsed: ['rag', 'embeddings'],
      // FEATURE: LOG-37c -- ARCHITECTURE.md §19i Layer A. The evidence under the label: the facts
      // are built once inside embedAndSearch() (gated there on whether an embed actually ran) and
      // passed through verbatim -- this file never shapes or infers one. patterns_used above is
      // deliberately unchanged: Layer A is purely additive, and Layer B reclassifies at read time
      // from these facts, so nothing regresses while the frozen label keeps working as today.
      callFacts: result.callFacts,
      // FEATURE: AA-179d -- plumbing columns, never criteria keys (.claude/rules/ai-pattern-signature.md).
      traceId,
      spanId,
    });
    return { ...result, _librarian: { granted: true, tier: `data-room:${data_room_tag}` } };
  }

  if (data_room_access.length === 1) {
    const tag = data_room_access[0];
    const result = await searchTheLibrary({ queryText, dataRoomTag: tag, tenantId, matchCount, supabaseUrl, supabaseKey, openaiKey, retrievalScope: retrieval_scope });
    logActivity({
      agentId: 'eleanor', aiType: 'librarian', feature: 'librarian',
      model: 'text-embedding-3-small',
      inputTokens: result.usage?.total_tokens ?? null,
      latencyMs: Date.now() - startTime,
      patternsUsed: ['rag', 'embeddings'],
      // FEATURE: LOG-37c -- same passthrough as the uber_access branch above; see the comment
      // there. patterns_used deliberately unchanged (Layer A additive, Layer B reclassifies at
      // read time). The denied/no-access log calls below stay factless -- no embed ran on them.
      callFacts: result.callFacts,
      // FEATURE: AA-179d -- same plumbing pair as the uber_access branch above.
      traceId,
      spanId,
    });
    return { ...result, _librarian: { granted: true, tier: `data-room:${tag}` } };
  }

  if (data_room_access.length > 1) {
    logActivity({ agentId: 'eleanor', aiType: 'librarian', feature: 'librarian', latencyMs: Date.now() - startTime, traceId, spanId });
    return { context: "", chunks: [], matchCount: 0, _librarian: { granted: false, tier: "denied-multi-data-room-unsupported" } };
  }

  logActivity({ agentId: 'eleanor', aiType: 'librarian', feature: 'librarian', latencyMs: Date.now() - startTime, traceId, spanId });
  return { context: "", chunks: [], matchCount: 0, _librarian: { granted: false, tier: "denied-no-access" } };
}

// FEATURE: LOO-22 -- record-level existence + data_type verification. Owen's qg-review-intent
// (LOO-006) must confirm a synthesized_as_fact claim traces to a real the_library record before
// blocking it; nothing on the roster could look a record up by id before this. Reuses the exact
// same access resolution as queryLibrary()/describeLibraryCatalog() (getCredentials against
// agents.data_room_access/uber_access) -- never a second parallel check. Read-only: no embed, no
// write. Fails closed -- any denial reports every requested id as exists:false so a genuine
// hallucination is still blocked when verification can't run. A single-room caller is scoped to
// its one room; an uber_access caller (Eleanor) looks up by globally-unique id -- a by-id read
// needs no search-space tag the way queryLibrary()'s similarity search does, and uber_access
// already grants full read of the table (ARCHITECTURE.md §19c). An optional data_room_tag narrows
// the read when supplied. Returns [{ id, exists, data_type }] -- one entry per requested id.
const LIBRARY_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function lookupRecordsByIds({ requestingAgentId, tenantId, ids, data_room_tag }) {
  const startTime = Date.now();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  const requested = Array.isArray(ids) ? ids.filter(x => typeof x === 'string') : [];
  const denyAll = () => requested.map(id => ({ id, exists: false, data_type: null }));

  if (!requestingAgentId) return denyAll();
  if (!supabaseUrl || !supabaseKey) return denyAll();
  if (requested.length === 0) return [];

  const { data_room_access, uber_access } = await getCredentials(requestingAgentId, supabaseUrl, supabaseKey);

  let scopeTag; // undefined => no room filter (uber_access, all rooms)
  if (uber_access) {
    scopeTag = data_room_tag || undefined;
  } else if (data_room_access.length === 1) {
    scopeTag = data_room_access[0];
  } else {
    logActivity({ agentId: 'eleanor', aiType: 'librarian', feature: 'librarian', latencyMs: Date.now() - startTime });
    return denyAll();
  }

  // Only well-formed UUIDs can match a real row; a malformed/fabricated id is reported exists:false
  // without ever reaching Postgres (mirrors DAT-6's UUID guard) -- and still lets the guardrail bite
  // on a hallucinated citation.
  const validIds = requested.filter(id => LIBRARY_UUID_RE.test(id));

  const rowsById = {};
  if (validIds.length > 0) {
    const inList = validIds.map(id => encodeURIComponent(id)).join(',');
    let url = `${supabaseUrl}/rest/v1/the_library?id=in.(${inList})&select=id,data_type`;
    if (scopeTag) url += `&data_room_tag=eq.${encodeURIComponent(scopeTag)}`;
    const res = await fetch(url, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } });
    if (!res.ok) {
      logActivity({ agentId: 'eleanor', aiType: 'librarian', feature: 'librarian', latencyMs: Date.now() - startTime });
      return denyAll();
    }
    const rows = await res.json();
    for (const r of rows) rowsById[r.id] = r.data_type ?? null;
  }

  const verification = requested.map(id => (
    Object.prototype.hasOwnProperty.call(rowsById, id)
      ? { id, exists: true, data_type: rowsById[id] }
      : { id, exists: false, data_type: null }
  ));
  logActivity({ agentId: 'eleanor', aiType: 'librarian', feature: 'librarian', latencyMs: Date.now() - startTime });
  return verification;
}

// FEATURE: DAT-003 -- confirmation provenance stamp. Deterministic plumbing, called ONLY by the
// confirmation-resolution layer (api/_lib/handlers/confirmation.js) after a human accept has fully
// resolved. Three properties are load-bearing and none of them is decoration:
//
// (1) NOT MODEL-REACHABLE. confirmed_by/confirmation_id are deliberately absent from
//     buildLibraryEntryPayload()'s parameter list, and writeLibrary() spreads model-supplied
//     ...params straight into that builder -- so if the fields were accepted there, Eleanor's own
//     structured output could assert confirmed_by: 'human' on a fact no human ever saw. The whole
//     point of the ticket is a claim that can be checked rather than trusted, so the value is
//     written here, from the confirmation row, and nowhere else.
// (2) WRITE-ONCE, by the confirmed_by=is.null filter rather than by discipline -- a stamp can never
//     be overwritten by a later confirmation.
// (3) FAILS TO NULL, NEVER TO A GUESS. No match, no config, no ids => { stamped: false } and the
//     row honestly stays unconfirmed. This never throws into the accept path: a promote that
//     succeeded must not be failed by its own bookkeeping.
//
// This is not a second write path into the_library (ARCHITECTURE.md §19c): it lives inside
// Eleanor's module, exactly like every other write here, and its caller reaches it the same way
// api/_lib/handlers/library-write.js already reaches writeLibrary().
export async function recordLibraryConfirmation({ entry_id = null, superseded_chunk_id = null, confirmed_by, confirmation_id, not_before = null }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey || !confirmed_by || !confirmation_id) return { stamped: false };

  const headers = {
    'Content-Type': 'application/json', apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`, Prefer: 'return=representation',
  };
  const body = JSON.stringify({ confirmed_by, confirmation_id });
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Path 1 -- the exact entry id, when the confirmed intent's own handler was library-write
  // (api/_lib/handlers/library-write.js returns entry_id, which rides the resolution result).
  // An id belonging to any other table simply matches 0 rows.
  if (typeof entry_id === 'string' && UUID_RE.test(entry_id)) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/the_library?id=eq.${encodeURIComponent(entry_id)}&data_type=eq.consolidated&confirmed_by=is.null`,
      { method: 'PATCH', headers, body }
    );
    if (res.ok) {
      const rows = await res.json();
      if (rows.length === 1) return { stamped: true, entry_id: rows[0].id, via: 'entry_id' };
    }
  }

  // Path 2 -- the promote's supersession link, which is what a checkpointed accept leaves behind.
  // The confirmed proposed_action's chunk_id is the the_library row being corrected; the promoted
  // row records supersedes_id = that chunk. DAT-11's postcondition guarantees at most ONE active
  // superseder per target, so this is deterministic rather than a best guess. not_before (the
  // confirmation's own created_at) excludes an older superseder that predates this confirmation.
  if (typeof superseded_chunk_id === 'string' && UUID_RE.test(superseded_chunk_id)) {
    let url = `${supabaseUrl}/rest/v1/the_library?supersedes_id=eq.${encodeURIComponent(superseded_chunk_id)}`
      + `&data_type=eq.consolidated&status=eq.active&confirmed_by=is.null`;
    if (not_before) url += `&created_at=gte.${encodeURIComponent(not_before)}`;
    const res = await fetch(url, { method: 'PATCH', headers, body });
    if (res.ok) {
      const rows = await res.json();
      if (rows.length >= 1) return { stamped: true, entry_id: rows[0].id, via: 'supersedes_id' };
    }
  }

  return { stamped: false };
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
      logActivity({ agentId: 'eleanor', aiType: 'librarian-write', feature: `librarian-write:${operation}`, latencyMs: Date.now() - startTime });
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
    logActivity({ agentId: 'eleanor', aiType: 'librarian-write', feature: `librarian-write:${operation}`, latencyMs: Date.now() - startTime });
    return { success: false, _librarian: { granted: false, tier } };
  }

  if (!(await isValidDataRoomTag(targetTag, supabaseUrl, supabaseKey))) {
    const tier = "denied-invalid-data-room-tag";
    logActivity({ agentId: 'eleanor', aiType: 'librarian-write', feature: `librarian-write:${operation}`, latencyMs: Date.now() - startTime });
    return { success: false, _librarian: { granted: false, tier } };
  }

  const headers = { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

  try {
    if (operation === "insert") {
      // FEATURE: DAT-11 -- the AG-33 tenant-isolation check and the DAT-6 UUID format guard that used
      // to be inlined here now live in checkSupersedeTarget() above, shared verbatim with the new
      // `supersede` operation. Behaviour is unchanged: same single tier, same graceful denial, same
      // log. `insert` with a supersedes_id stays legal -- it records a replacement without retiring
      // anything, which is a different (and still valid) act from `supersede`.
      if (params.supersedes_id) {
        const tier = await checkSupersedeTarget(params.supersedes_id, targetTag, supabaseUrl, headers);
        if (tier) {
          logActivity({ agentId: 'eleanor', aiType: 'librarian-write', feature: `librarian-write:${operation}`, latencyMs: Date.now() - startTime });
          return { success: false, _librarian: { granted: false, tier } };
        }
      }

      // FEATURE: LOO-23 -- promoted_from_reasoning_id is a lineage FK -> the_reasoning, but in a
      // data-patch-execute-intent promote the reasoning row is written AFTER this insert (Nadia's
      // final self-write), so Eleanor cannot know a real id here -- her model either omits it or
      // misfills the superseded chunk_id (a the_library id), which hit the FK as a raw 23503 crash
      // ("Key (promoted_from_reasoning_id)=... is not present in the_reasoning"). This field is
      // never read anywhere in the codebase (write-only lineage). Validate-or-drop, never deny: a
      // bad/absent lineage id must not block an otherwise-legitimate promote. Same id-hygiene class
      // as the supersedes_id guard above (DAT-6/AA-189), but nulls instead of denying because the
      // value is non-load-bearing.
      if (params.promoted_from_reasoning_id) {
        const REASONING_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let validLineage = REASONING_UUID_RE.test(params.promoted_from_reasoning_id);
        if (validLineage) {
          const lineageRes = await fetch(
            `${supabaseUrl}/rest/v1/the_reasoning?id=eq.${encodeURIComponent(params.promoted_from_reasoning_id)}&data_room_tag=eq.${encodeURIComponent(targetTag)}&select=id`,
            { headers }
          );
          validLineage = lineageRes.ok && (await lineageRes.json()).length === 1;
        }
        if (!validLineage) params.promoted_from_reasoning_id = null;
      }

      const entry = await writeTheLibraryEntry({ ...params, data_room_tag: targetTag, tenant_id: tenantId, is_baseline: false, supabaseUrl, supabaseKey, openaiKey });
      logActivity({
        agentId: 'eleanor', aiType: 'librarian-write', feature: `librarian-write:${operation}`,
        model: 'text-embedding-3-small',
        inputTokens: entry.usage?.total_tokens ?? null,
        latencyMs: Date.now() - startTime,
        patternsUsed: ['embeddings'],
      });
      return { success: true, entry, _librarian: { granted: true, tier: `data-room:${targetTag}` } };
    }

    // FEATURE: DAT-11 -- the atomic replacement. `insert`+`update_status` could always land one half
    // without the other, and both directions were found in live data (a lone flip orphan-superseded
    // 59eede59 into a retrieval hole; a lone insert left five rows with two live versions each).
    // Everything below the guards happens inside ONE Postgres transaction: the replacement lands,
    // the target flips to 'superseded', and a postcondition refuses to commit if any second active
    // row also claims to supersede that target. No new write path into the_library (§19c) -- this is
    // the same broker, one more operation, and the RPC is reached only from here.
    if (operation === "supersede") {
      const { supersedes_id, title, content } = params;
      if (!supersedes_id || !title || !content) {
        logActivity({ agentId: 'eleanor', aiType: 'librarian-write', feature: 'librarian-write:supersede', latencyMs: Date.now() - startTime });
        return { success: false, _librarian: { granted: false, tier: "denied-missing-params" } };
      }

      const guardTier = await checkSupersedeTarget(supersedes_id, targetTag, supabaseUrl, headers);
      if (guardTier) {
        logActivity({ agentId: 'eleanor', aiType: 'librarian-write', feature: 'librarian-write:supersede', latencyMs: Date.now() - startTime });
        return { success: false, _librarian: { granted: false, tier: guardTier } };
      }

      // Complete record from the one shared builder -- see buildLibraryEntryPayload()'s note on why
      // a partial would blank columns rather than default them. The embedding travels separately as
      // pgvector TEXT: PostgREST sends a JS array as a JSON array, which does not coerce to vector,
      // and JSON.stringify() of a float array is exactly pgvector's own text input format.
      const { payload, usage } = await buildLibraryEntryPayload({
        ...params, data_room_tag: targetTag, tenant_id: tenantId, is_baseline: false, openaiKey,
      });
      const { embedding, ...entryPayload } = payload;

      const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/supersede_library_entry`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          p_entry: entryPayload,
          p_embedding: embedding ? JSON.stringify(embedding) : null,
          p_target_id: supersedes_id,
          p_data_room_tag: targetTag,
        }),
      });

      if (!rpcRes.ok) {
        // The function's own RAISE EXCEPTIONs are mapped onto denial tiers rather than surfaced raw
        // -- library-write.js re-throws a raw message unconditionally (DAT-7), so an unmapped throw
        // here would reach the model as noise instead of a decision it can act on.
        const raw = (await rpcRes.text()).slice(0, 300);
        const tier =
          raw.includes("supersede-target-not-in-data-room") ? "denied-row-not-in-data-room" :
          raw.includes("supersede-target-not-active") ? "denied-supersede-target-not-active" :
          raw.includes("supersede-postcondition-failed") ? "denied-supersede-conflict" : null;
        logActivity({ agentId: 'eleanor', aiType: 'librarian-write', feature: 'librarian-write:supersede', latencyMs: Date.now() - startTime });
        if (!tier) throw new Error("supersede failed: " + raw);
        return { success: false, _librarian: { granted: false, tier } };
      }

      const [entry] = await rpcRes.json();
      logActivity({
        agentId: 'eleanor', aiType: 'librarian-write', feature: 'librarian-write:supersede',
        model: 'text-embedding-3-small',
        inputTokens: usage?.total_tokens ?? null,
        latencyMs: Date.now() - startTime,
        patternsUsed: ['embeddings'],
      });
      return { success: true, entry, _librarian: { granted: true, tier: `data-room:${targetTag}` } };
    }

    if (operation === "update_status") {
      const { id, status } = params;
      if (!id || !status) return { success: false, _librarian: { granted: false, tier: "denied-missing-params" } };
      // FEATURE: LOO-23 -- `id` is model-supplied (Eleanor's update_status request), never format-
      // validated before this point, unlike insert's supersedes_id (DAT-6). A non-UUID id -- e.g. a
      // hand slug, or a stray supersede the model fires on a brand-new insight that has no chunk to
      // supersede -- reached the Postgres `id=eq.<...>` uuid filter below and threw a raw 22P02
      // ("status update failed"), which hard-failed the whole accept even though the insert step had
      // already saved the correction. Same graceful-denial class as insert's own id guards -- deny,
      // never crash; a bad/absent supersede target must not sink an otherwise-successful promote.
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (typeof id !== "string" || !UUID_RE.test(id)) {
        logActivity({ agentId: 'eleanor', aiType: 'librarian-write', feature: `librarian-write:${operation}`, latencyMs: Date.now() - startTime });
        return { success: false, _librarian: { granted: false, tier: "denied-row-not-in-data-room" } };
      }
      // FEATURE: DAT-11 -- baseline retirement gate. A bare status change may no longer retire an
      // is_baseline row; only `supersede` may, because only it guarantees a replacement lands in the
      // same transaction. Deliberately a gate and not a hard block: is_baseline is §19f's Demo Reset
      // marker (archive where false / restore where true), not a permission flag, and §19c holds
      // that a correction ALWAYS supersedes via a new row -- blocking baseline supersession outright
      // would turn every legitimate correction into a permanent duplicate. Retirement here means
      // 'superseded' or 'archived' only; reactivating a baseline row to 'active' still succeeds, and
      // bulk_reset (which restores baseline rows to 'active') is a different branch this never sees.
      const gateRes = await fetch(
        `${supabaseUrl}/rest/v1/the_library?id=eq.${encodeURIComponent(id)}&data_room_tag=eq.${encodeURIComponent(targetTag)}&select=is_baseline`,
        { headers }
      );
      if (!gateRes.ok) throw new Error("baseline gate lookup failed: " + (await gateRes.text()).slice(0, 200));
      const [gateRow] = await gateRes.json();
      if (!gateRow) {
        logActivity({ agentId: 'eleanor', aiType: 'librarian-write', feature: `librarian-write:${operation}`, latencyMs: Date.now() - startTime });
        return { success: false, _librarian: { granted: false, tier: "denied-row-not-in-data-room" } };
      }
      if (gateRow.is_baseline === true && (status === "superseded" || status === "archived")) {
        logActivity({ agentId: 'eleanor', aiType: 'librarian-write', feature: `librarian-write:${operation}`, latencyMs: Date.now() - startTime });
        return { success: false, _librarian: { granted: false, tier: "denied-baseline-retire-requires-supersede" } };
      }

      const r = await fetch(
        `${supabaseUrl}/rest/v1/the_library?id=eq.${encodeURIComponent(id)}&data_room_tag=eq.${encodeURIComponent(targetTag)}`,
        { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ status }) }
      );
      if (!r.ok) throw new Error("status update failed: " + (await r.text()).slice(0, 200));
      const updated = await r.json();
      if (!updated.length) return { success: false, _librarian: { granted: false, tier: "denied-row-not-in-data-room" } };
      logActivity({ agentId: 'eleanor', aiType: 'librarian-write', feature: `librarian-write:${operation}`, latencyMs: Date.now() - startTime });
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

      logActivity({ agentId: 'eleanor', aiType: 'librarian-write', feature: `librarian-write:${operation}`, latencyMs: Date.now() - startTime });
      return { success: true, archivedCount: archived.length, restoredCount: restored.length, _librarian: { granted: true, tier: `data-room:${targetTag}` } };
    }

    return { success: false, _librarian: { granted: false, tier: "denied-unknown-operation" } };
  } catch (err) {
    return { success: false, error: err.message, _librarian: { granted: false, tier: `error:${targetTag}` } };
  }
}
