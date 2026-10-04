// DeepBench v7.0.759 | lib/read-taught.js | AGT-342
//
// ONE SHARED READER for what an agent was taught. The Teach screen writes `knowledge_entries`
// (api/load-entries.js -> lib/knowledge-write.js); this is the one place that reads an agent's own
// active rows back and says what each one IS:
//
//   taught   -- a row a trainer wrote (`source === 'user'`). Handed over with the trainer's note
//               appended, and flagged `always` when it is short enough to hand over every time.
//   records  -- every other row (`source` 'agent', null, anything else): what the agent wrote for
//               itself from past work. Its `teaching_note` is url|status plumbing and is NOT handed
//               over.
//
// The two framing sentences live here and nowhere else, so every caller frames the same rows the
// same way. A deterministic read (pattern:9): no embedding, no model call, no activity log, no
// other table. §19c: the read is the agent's OWN rows -- the caller passes the agent it is running.

export const TAUGHT_FRAMING =
  "The agent's trainer taught it the items below. They are part of what the agent knows and how it behaves: follow any instruction in them and use any fact in them whenever it applies.";

export const RECORDS_FRAMING =
  'The agent wrote the records below for itself from past work. Use one when it is relevant to the task. They are not instructions.';

// The limit lib/knowledge-write.js embeds to: a taught item at or under it is whole in its own
// embedding, so it is safe to hand over always.
export const ALWAYS_MAX_CHARS = 12000;

/**
 * Pure. Splits active knowledge_entries rows into taught items and records, keeping row order.
 * @param rows  [{ id, title, content, teaching_note, source }]
 */
export function shapeTaught(rows) {
  const taught = [];
  const records = [];
  for (const row of rows || []) {
    const content = String(row.content ?? '');
    const chars = content.length;
    if (row.source === 'user') {
      const note = String(row.teaching_note ?? '').trim();
      const text = note ? content + "\n\nTrainer's note: " + note : content;
      taught.push({ id: row.id, title: row.title, text, chars, always: chars <= ALWAYS_MAX_CHARS });
    } else {
      records.push({ id: row.id, title: row.title, text: content, chars });
    }
  }
  return { taught, records, framing: { taught: TAUGHT_FRAMING, records: RECORDS_FRAMING } };
}

/**
 * Reads one agent's own active knowledge_entries rows, oldest first, and shapes them.
 * @param agentId   the agent whose rows are read (required, non-empty string).
 * @param tenantId  defaults to 'global'.
 */
export async function readTaught({ agentId, tenantId } = {}) {
  if (typeof agentId !== 'string' || !agentId.trim()) {
    throw new Error('readTaught requires agentId -- the id of the agent whose taught items you want');
  }
  const tenant = tenantId || 'global';
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not configured');
  const query =
    `knowledge_entries?agent_id=eq.${encodeURIComponent(agentId)}&tenant_id=eq.${encodeURIComponent(tenant)}` +
    '&status=eq.active&select=id,title,content,teaching_note,source,created_at&order=created_at.asc';
  const res = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase read failed (knowledge_entries): HTTP ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error('Supabase read returned a non-array for knowledge_entries');
  return shapeTaught(rows);
}
