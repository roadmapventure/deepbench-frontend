// DeepBench v5.3.14 | lib/knowledge-write.js | Shared embed-and-upsert helper for knowledge_entries
// FEATURE: AG-27 — extracted from api/load-entries.js so the Training tab (direct POST) has a single
// implementation for personal-training writes.
// FEATURE: AG-30 — writeLibrary() no longer calls this (lib/librarian.js now owns the_Library's own
// writeTheLibraryEntry() internally); this file is knowledge_entries-only again. The 10 Data-Room-only
// fields (data_type/citeable/is_baseline/supersedes_id/confidence/override_flag/geo/program_area/
// partner_id/period) were dropped from knowledge_entries this session — removed from this payload too,
// since knowledge_entries no longer has those columns.

export async function embedAndUpsertEntry({
  id, title, category, jurisdiction, priority,
  triggers, content, status, tenant_id,
  agent_id, teaching_note, source,
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

  const MAX_EMBED_CHARS = 12000;
  const truncatedContent = content.length > MAX_EMBED_CHARS
    ? content.slice(0, MAX_EMBED_CHARS) + ' [truncated for embedding]'
    : content;
  const cleanedContent = truncatedContent
    .replace(/[^\x20-\x7E\n\r]/g, ' ')
    .replace(/\s{3,}/g, '  ')
    .trim();
  const textToEmbed = `${title}\n\n${cleanedContent}`;

  const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: textToEmbed }),
  });
  if (!embeddingRes.ok) {
    const err = await embeddingRes.text();
    throw new Error('OpenAI embedding failed: ' + err.slice(0, 200));
  }
  const embeddingData = await embeddingRes.json();
  const embedding = embeddingData.data?.[0]?.embedding;
  if (!embedding) throw new Error('No embedding returned from OpenAI');

  const payload = {
    title,
    category: category || 'Compliance',
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
