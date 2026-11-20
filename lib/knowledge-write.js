// DeepBench v7.0.1077 | lib/knowledge-write.js | AGT-354 -- a long item is also stored as overlapping pieces, each with its own embedding (writePieces), on a save and on an edit.
// DeepBench v7.0.792 | lib/knowledge-write.js | AGT-390
// FEATURE: AGT-390 -- every write says where it came from. embedAndUpsertEntry() takes `origin` and
// `origin_caller` (set on the row only when given), and insertAgentConfig() -- api/agent-configs.js's
// POST, moved here whole so the MCP Teach handler and the route share one insert -- does the same for
// agent_configs. DeepBench's own screens write origin `deepbench`; the MCP Teach tool writes `mcp`
// and the caller's key name. The date a thing was learned is the row's own created_at.
// DeepBench v7.0.775 | lib/knowledge-write.js | AGT-345
// FEATURE: AGT-345 -- an edit carrying a title or content embeds an item that has no embedding, even when its text is unchanged.
// DeepBench v7.0.768 | lib/knowledge-write.js | AGT-343
// FEATURE: AGT-343 — a typed note is its own item (the stored fact is category = NOTE_CATEGORY, set
// here from kind: "note"; no schema change), and editing an item's title or content refreshes its
// embedding. embedEntryText() is the one place a knowledge_entries text is embedded and logged —
// the save (embedAndUpsertEntry) and the edit (reembedOnEdit) both call it.
// FEATURE: AG-27 — extracted from api/load-entries.js so the Training tab (direct POST) has a single
// implementation for personal-training writes.
// FEATURE: AG-30 — writeLibrary() no longer calls this (lib/librarian.js now owns the_Library's own
// writeTheLibraryEntry() internally); this file is knowledge_entries-only again. The 10 Data-Room-only
// fields (data_type/citeable/is_baseline/supersedes_id/confidence/override_flag/geo/program_area/
// partner_id/period) were dropped from knowledge_entries this session — removed from this payload too,
// since knowledge_entries no longer has those columns.
// FEATURE: AA-190h — reuses lib/vector-search.js's embedContent() instead of a duplicated OpenAI
// fetch() (gets real usage/token data for free), and adds a real server-side logActivity() call —
// this primitive previously had no ai_activity_log write of any kind.

import { embedContent } from './vector-search.js';
import { logActivity } from './activity-log.js';

export const MAX_EMBED_CHARS = 12000;
export const NOTE_CATEGORY = 'Note';

// A typed note and a file are told apart by one stored fact; every older row reads as a file.
export function entryKind(row) {
  return row?.category === NOTE_CATEGORY ? 'note' : 'file';
}

// Embeds title + content and logs the call when it happens. Returns the embedding array.
export async function embedEntryText({ title, content, tenant_id, agent_id }) {
  const startTime = Date.now();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!supabaseUrl) throw new Error('SUPABASE_URL not configured');
  if (!supabaseKey) throw new Error('SUPABASE_SERVICE_KEY not configured');
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');
  if (!title || !content) throw new Error('title and content are required');

  const truncatedContent = content.length > MAX_EMBED_CHARS
    ? content.slice(0, MAX_EMBED_CHARS) + ' [truncated for embedding]'
    : content;
  const cleanedContent = truncatedContent
    .replace(/[^\x20-\x7E\n\r]/g, ' ')
    .replace(/\s{3,}/g, '  ')
    .trim();
  const textToEmbed = `${title}\n\n${cleanedContent}`;

  const { embedding, usage } = await embedContent(textToEmbed, openaiKey);
  if (!embedding) throw new Error('No embedding returned from OpenAI');

  logActivity({
    tenantId: tenant_id || 'global', agentId: agent_id || null,
    aiType: 'reinforcement', feature: 'knowledge-write',
    model: 'text-embedding-3-small',
    inputTokens: usage?.total_tokens ?? null,
    latencyMs: Date.now() - startTime,
    patternsUsed: ['embeddings'],
  });

  return embedding;
}

// A long item is also stored as overlapping pieces, each with its own embedding (AGT-354).
export const PIECE_CHARS = 4000;
export const PIECE_OVERLAP = 400;
const PIECE_EMBED_BATCH = 16;

// Pure. [] for an item at or under MAX_EMBED_CHARS: it is whole in its own embedding.
export function splitIntoPieces(content) {
  const text = String(content ?? '');
  if (text.length <= MAX_EMBED_CHARS) return [];
  const step = PIECE_CHARS - PIECE_OVERLAP;
  const pieces = [];
  for (let start = 0; ; start += step) {
    pieces.push(text.slice(start, start + PIECE_CHARS));
    if (start + PIECE_CHARS >= text.length) break;
  }
  return pieces;
}

function piecesAccess() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl) throw new Error('SUPABASE_URL not configured');
  if (!supabaseKey) throw new Error('SUPABASE_SERVICE_KEY not configured');
  return {
    base: `${supabaseUrl}/rest/v1/knowledge_entry_pieces`,
    headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  };
}

// True when the item already holds at least one piece.
export async function hasPieces(id) {
  const { base, headers } = piecesAccess();
  const res = await fetch(`${base}?entry_id=eq.${encodeURIComponent(id)}&select=piece_no&limit=1`, { headers });
  if (!res.ok) throw new Error('Supabase pieces read failed: ' + (await res.text()).slice(0, 200));
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

// Replaces the item's pieces with the pieces of `content` (none when it is short). Every piece is
// embedded BEFORE anything is removed, so a failed embed changes nothing. Returns the piece count.
export async function writePieces({ id, title, content, tenant_id, agent_id }) {
  const { base, headers } = piecesAccess();
  const pieces = splitIntoPieces(content);
  const rows = [];
  for (let i = 0; i < pieces.length; i += PIECE_EMBED_BATCH) {
    const batch = pieces.slice(i, i + PIECE_EMBED_BATCH);
    const embeddings = await Promise.all(
      batch.map(piece => embedEntryText({ title, content: piece, tenant_id, agent_id })),
    );
    embeddings.forEach((embedding, j) => rows.push({ entry_id: id, piece_no: i + j + 1, content: batch[j], embedding }));
  }
  const del = await fetch(`${base}?entry_id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: { ...headers, Prefer: 'return=minimal' },
  });
  if (!del.ok) throw new Error('Supabase pieces delete failed: ' + (await del.text()).slice(0, 200));
  if (!rows.length) return 0;
  const ins = await fetch(base, {
    method: 'POST', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(rows),
  });
  if (!ins.ok) throw new Error('Supabase pieces insert failed: ' + (await ins.text()).slice(0, 200));
  return rows.length;
}

export async function embedAndUpsertEntry({
  id, title, category, jurisdiction, priority,
  triggers, content, status, tenant_id,
  agent_id, teaching_note, source, kind,
  origin, origin_caller,
}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!supabaseUrl) throw new Error('SUPABASE_URL not configured');
  if (!supabaseKey) throw new Error('SUPABASE_SERVICE_KEY not configured');
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');
  if (!title || !content) throw new Error('title and content are required');

  const headers = {
    'Content-Type': 'application/json',
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  const embedding = await embedEntryText({ title, content, tenant_id, agent_id });

  const payload = {
    title,
    category: kind === 'note' ? NOTE_CATEGORY : (category || 'Compliance'),
    jurisdiction: jurisdiction || 'All',
    priority: priority || 50,
    triggers: triggers || [],
    content,
    embedding,
    status: status || 'active',
    tenant_id: tenant_id || 'global',
    agent_id: agent_id || 'legacy',
    teaching_note: teaching_note || null,
    source: source || 'user',
  };
  if (id) payload.id = id;
  if (origin) payload.origin = origin;
  if (origin_caller) payload.origin_caller = origin_caller;

  const upsertRes = await fetch(`${supabaseUrl}/rest/v1/knowledge_entries?on_conflict=id`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload),
  });
  if (!upsertRes.ok) {
    const err = await upsertRes.text();
    throw new Error('Supabase upsert failed: ' + err.slice(0, 200));
  }
  const saved = await upsertRes.json();
  const row = saved?.[0] || payload;

  // AGT-354: a long item gets its pieces; a save over an existing id replaces whatever it held.
  if (row.id && (content.length > MAX_EMBED_CHARS || id)) {
    await writePieces({ id: row.id, title, content, tenant_id, agent_id });
  }
  return row;
}

// FEATURE: AGT-390 -- one agent_configs row (a role prompt, an output format or a guardrail). The
// POST of api/agent-configs.js, moved whole: the same validation messages, and the same clearing of
// the agent's other defaults of that type when this row is the default. Errors carry `.status`.
export async function insertAgentConfig({
  agent_id, tenant_id = 'global', type, name, text,
  is_default = false, is_user_selectable = false,
  origin = null, origin_caller = null,
}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl) throw editError(500, 'SUPABASE_URL not configured');
  if (!supabaseKey) throw editError(500, 'SUPABASE_SERVICE_KEY not configured');
  if (!agent_id || !type || !name || !text) throw editError(400, 'agent_id, type, name, text required');
  const validTypes = ['role_prompt', 'output_format', 'guardrail'];
  if (!validTypes.includes(type)) throw editError(400, `type must be one of: ${validTypes.join(', ')}`);

  const headers = {
    'Content-Type': 'application/json',
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  // Clear existing defaults for this agent+type if this row is being set as default
  if (is_default) {
    await fetch(
      `${supabaseUrl}/rest/v1/agent_configs?tenant_id=eq.${encodeURIComponent(tenant_id)}&agent_id=eq.${encodeURIComponent(agent_id)}&type=eq.${encodeURIComponent(type)}`,
      { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ is_default: false }) },
    );
  }

  const row = { agent_id, tenant_id, type, name, text, is_default, is_user_selectable, updated_at: new Date().toISOString() };
  if (origin) row.origin = origin;
  if (origin_caller) row.origin_caller = origin_caller;
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/agent_configs`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!insertRes.ok) {
    const err = await insertRes.text();
    throw editError(500, 'Supabase insert failed: ' + err.slice(0, 200));
  }
  const saved = await insertRes.json();
  return Array.isArray(saved) ? saved[0] : saved;
}

function editError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// An edit that supplies a title or content: returns the fresh embedding when the item's text
// changed, or null when it did not (unchanged text is not re-embedded). AGT-345: an item whose
// stored embedding is null is embedded on any such edit, changed text or not -- that is its repair.
export async function reembedOnEdit({ id, tenant_id, title, content }) {
  const isText = v => typeof v === 'string' && v.trim() !== '';
  if (title !== undefined && !isText(title)) throw editError(400, 'title cannot be empty');
  if (content !== undefined && !isText(content)) throw editError(400, 'content cannot be empty');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl) throw new Error('SUPABASE_URL not configured');
  if (!supabaseKey) throw new Error('SUPABASE_SERVICE_KEY not configured');

  const tenant = tenant_id || 'global';
  const readRes = await fetch(
    `${supabaseUrl}/rest/v1/knowledge_entries?id=eq.${encodeURIComponent(id)}&tenant_id=eq.${encodeURIComponent(tenant)}&select=title,content,agent_id,embedding`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
  );
  if (!readRes.ok) {
    const err = await readRes.text();
    throw new Error('Supabase fetch failed: ' + err.slice(0, 200));
  }
  const rows = await readRes.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw editError(404, 'entry not found');

  const nextTitle = title !== undefined ? title : row.title;
  const nextContent = content !== undefined ? content : row.content;
  const piecesOf = () => writePieces({ id, title: nextTitle, content: nextContent, tenant_id: tenant, agent_id: row.agent_id });
  const isLong = nextContent.length > MAX_EMBED_CHARS;
  if (nextTitle === row.title && nextContent === row.content && row.embedding !== null) {
    // AGT-354: a long item with no pieces gets them on any such edit -- that is its repair.
    if (isLong && !(await hasPieces(id))) await piecesOf();
    return null;
  }

  const embedding = await embedEntryText({ title: nextTitle, content: nextContent, tenant_id: tenant, agent_id: row.agent_id });
  if (isLong || String(row.content ?? '').length > MAX_EMBED_CHARS) await piecesOf();
  return embedding;
}
