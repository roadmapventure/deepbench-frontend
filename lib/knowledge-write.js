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

export async function embedAndUpsertEntry({
  id, title, category, jurisdiction, priority,
  triggers, content, status, tenant_id,
  agent_id, teaching_note, source, kind,
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

  return saved?.[0] || payload;
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
  if (nextTitle === row.title && nextContent === row.content && row.embedding !== null) return null;

  return embedEntryText({ title: nextTitle, content: nextContent, tenant_id: tenant, agent_id: row.agent_id });
}
