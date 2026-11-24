// DeepBench v7.0.1114 | scripts/lib/board-match.mjs | AGT-371 -- which live board rows read most like a text.
// Pure and lexical: tf-idf cosine over a row's title (counted twice) and the first 1,500 characters of
// its description. It RANKS, it never decides -- measured 2026-11-24 on the 53 duplicate sets the
// Auditor had filed to AGT-371, no title or identifier threshold separated a duplicate from a
// neighbour (best: 4 of 53 sets at 54 false pairs), while an older member of the set sat in the top
// three for the filing finding of 24 of the 26 the review door filed. So the door shows three.
export const BOARD_CANDIDATES = 3;
export const BOARD_STATUSES = Object.freeze(["open", "partial", "delivered"]);
const STOP = new Set(("a an the and or of to in on for is are was be by with it its that this as at from not no so than then " +
  "into over under up out can cannot never every each one two three all any has have had been does do did but " +
  "while when which who what how why if still also only own new").split(" "));

export function tokens(text) {
  return String(text ?? "").toLowerCase().split(/[^a-z0-9_./-]+/)
    .map(t => t.replace(/^[./_-]+|[./_-]+$/g, ""))
    .filter(t => t.length > 2 && !STOP.has(t));
}

export function rowText(row) {
  const title = String(row?.title ?? "");
  return `${title} ${title} ${String(row?.description ?? "").slice(0, 1500)}`;
}

export function findingText(f) {
  const locs = Array.isArray(f?.locations) ? f.locations.map(l => String(l?.text ?? "")).join(" ") : "";
  return `${f?.governing_fact ?? ""} ${locs} ${f?.proposed_resolution ?? ""}`;
}

function counts(text) {
  const m = new Map();
  for (const t of tokens(text)) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

function weigh(tf, idf) {
  const w = new Map();
  let sq = 0;
  for (const [t, c] of tf) {
    const v = (1 + Math.log(c)) * (idf.get(t) ?? 0);
    if (v > 0) { w.set(t, v); sq += v * v; }
  }
  const n = Math.sqrt(sq) || 1;
  for (const [t, v] of w) w.set(t, v / n);
  return w;
}

// rows: [{ backlog_id, title, status, description }] -- the caller has already kept BOARD_STATUSES.
export function buildIndex(rows) {
  const docs = (Array.isArray(rows) ? rows : []).filter(r => r && r.backlog_id).map(r => ({ row: r, tf: counts(rowText(r)) }));
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = new Map();
  for (const [t, n] of df) idf.set(t, Math.log(docs.length / (1 + n)));
  return { idf, docs: docs.map(d => ({ row: d.row, w: weigh(d.tf, idf) })) };
}

// The k rows that read most like `text`, best first; a row sharing no weighted word is never listed.
export function candidatesFor(text, index, k = BOARD_CANDIDATES) {
  const q = weigh(counts(text), index?.idf ?? new Map());
  const scored = [];
  for (const d of index?.docs ?? []) {
    let s = 0;
    for (const [t, v] of q) s += v * (d.w.get(t) ?? 0);
    if (s > 0) scored.push({ backlog_id: d.row.backlog_id, title: d.row.title, status: d.row.status, score: Math.round(s * 1000) / 1000 });
  }
  return scored.sort((a, b) => b.score - a.score || String(a.backlog_id).localeCompare(String(b.backlog_id))).slice(0, k);
}
