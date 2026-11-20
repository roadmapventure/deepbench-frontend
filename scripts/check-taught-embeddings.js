// DeepBench v7.0.1077 | scripts/check-taught-embeddings.js | AGT-354 -- the sweep also names an active user-taught item over 12,000 characters that has no pieces.
// DeepBench v7.0.775 | scripts/check-taught-embeddings.js | AGT-345
// FEATURE: AGT-345 -- names every active user-taught item that has no embedding. Such an item is
// never found by in-app search and nothing said so. Read-only: two GETs, no write, no model call.
//
// Codes: 0 pass, 1 fail (a row is named), 2 NOT RUN (could not read -- never a pass).
// Covers active `source = 'user'` rows only (kickoff §7, Designer's call iii).
// The repair is an edit carrying the item's own title: lib/knowledge-write.js reembedOnEdit().
//
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/check-taught-embeddings.js

import { pathToFileURL } from "url";
import { MAX_EMBED_CHARS } from "../lib/knowledge-write.js";

const NAME = "check-taught-embeddings";
const Q = "knowledge_entries?source=eq.user&status=eq.active";

const notRun = why => ({ code: 2, lines: [`[NOT RUN] ${NAME} -- ${why}; this is NOT a pass`], rows: [] });

export async function sweep({ url, key, fetchImpl = fetch } = {}) {
  if (!url || !key) return notRun("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const read = async query => {
    const res = await fetchImpl(`${url}/rest/v1/${query}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (!Array.isArray(body)) throw new Error("the answer was not a list of rows");
    return body;
  };

  let rows, all, pieced;
  try {
    rows = await read(`${Q}&embedding=is.null&select=id,title,agent_id,tenant_id&order=created_at.asc`);
    all = await read(`${Q}&select=id,title,agent_id,tenant_id,content`);
    pieced = await read("knowledge_entry_pieces?piece_no=eq.1&select=entry_id");
  } catch (e) {
    return notRun(`knowledge_entries unreadable (${e.message})`);
  }

  const have = new Set(pieced.map(p => p.entry_id));
  const long = all.filter(r => String(r.content ?? "").length > MAX_EMBED_CHARS);
  const bare = long.filter(r => !have.has(r.id)).map(({ content, ...r }) => ({ ...r, chars: content.length }));

  if (rows.length || bare.length) {
    const lines = rows.map(r =>
      `[FAIL] user-taught item with no embedding: ${r.id} ${JSON.stringify(r.title)} (agent ${r.agent_id}, tenant ${r.tenant_id})`);
    for (const r of bare) {
      lines.push(`[FAIL] long user-taught item with no pieces: ${r.id} ${JSON.stringify(r.title)} (agent ${r.agent_id}, tenant ${r.tenant_id}, ${r.chars} characters)`);
    }
    lines.push("Repair: PATCH /api/load-entries with the item's id and its own unchanged title.");
    return { code: 1, lines, rows, bare };
  }

  const n = all.length;
  const m = long.length;
  return { code: 0, lines: [`[PASS] ${NAME} -- ${n} of ${n} active user-taught items have an embedding; ${m} of ${m} over ${MAX_EMBED_CHARS} characters have pieces`], rows, bare };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { code, lines } = await sweep({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY });
  for (const line of lines) console.log(line);
  process.exit(code);
}
