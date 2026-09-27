#!/usr/bin/env node
// DeepBench v7.0.547 | scripts/audit-board.js | AGT-86 slice 4 -- BOARD-HEALTH AND WORK-QUALITY
// CHECKS AS PLAIN CODE. The Auditor's CODE layer (AGT-86 §7/§10): five deterministic questions about
// the backlog that no model needs to answer, asked over eight REST reads and written to ONE file.
//
//   board-no-home         an open/partial row no project can ever pick: epic_id NULL, or its epic
//                         has no project (prime_directive_queue() admits a row only through
//                         epic_project_executing(epic_id)).
//   board-repeat-worked   a ticket whose NON-SHIPPING cycles number >= runner_settings.
//                         chain_max_noship_streak and that is still not done/removed. A cycle whose
//                         outcome is 'shipped' is NOT counted (AGT-167): the rule has always read
//                         "without shipping", but the count was of TOTAL cycles and the read did not
//                         select `outcome` at all, so a ticket that took several cycles and shipped
//                         from each one was a finding. Cycles join on
//                         COALESCE(backlog_item_id -> backlog_id, item_id): 459 of 738 cycles carry
//                         no backlog_item_id (measured 2026-09-27), so the text id is half the join,
//                         not a fallback.
//   board-deferral-undone a before-image recorded defer_status 'yes', the live row no longer says
//                         'yes', and no runner_decisions row for that ticket is dated at or after
//                         the image -- a deferral reset nobody decided.
//   board-stale           an 'open' row older than UNREVALIDATED_DAYS (ticket-owner.js, the SAME
//                         number classifyBoard counts with) and never revalidated.
//   quality-closed-red    a 'done' row whose LATEST verdict is 'block' that was never RATIFIED
//                         (AGT-166): no non-reversed ship/ticket-status decision and no accepted
//                         ship card dated at or after that verdict. A ratified close is a recorded
//                         judgment, not a contradiction -- the trigger
//                         backlog_done_requires_verdict refuses the unratified ones outright.
//
// PAGING (AGT-166). PostgREST caps EVERY response at its max-rows (1,000 here) and says so only in
// Content-Range, so a single `&limit=5000` read of the 1,077-row board came back with 1,000 rows and
// no error: the board printed 497 homeless rows where SQL counted 546, and 394 stale where SQL
// counted 441. readAll() now pages with `Range: <from>-<to>` until a short page arrives, and its
// `limit` argument is the CEILING on the whole total instead of a per-request limit. Every paged
// query must carry an `order=` -- an unordered page boundary is free to repeat or skip a row.
//
// VOLUME RULE. A check that yields more than AGGREGATE_OVER rows becomes ONE finding at ONE stable
// location `audit-board/<slug>`, with the rule alone as governing_fact. audit-ledger.js's
// fingerprint() hashes kind | location keys | normalize(governing_fact) and NOT location text, so the
// aggregate keeps one fingerprint week over week while the roster in its text moves -- which is what
// lets the ledger's escalate rule see "the same finding again" instead of a new one every Monday.
//
// READ-ONLY BY CONSTRUCTION: every REST call below is a GET; there is no --apply. Ingest is slice 3
// (scripts/audit-ledger.js reads the --out file unchanged); the routine is slice 8.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isoWeek } from "./audit-ledger.js";
import { UNREVALIDATED_DAYS } from "./ticket-owner.js";

export const CHECK_SLUGS = Object.freeze([
  "board-no-home",
  "board-repeat-worked",
  "board-deferral-undone",
  "board-stale",
  "quality-closed-red",
]);
export const AGGREGATE_OVER = 25;
export const OPEN = Object.freeze(["open", "partial"]);
export const TERMINAL = Object.freeze(["done", "removed"]);
export const FOUND_BY = "auditor:board-checks";

const DAY = 24 * 3600 * 1000;
const ts = v => (v == null ? NaN : Date.parse(v));
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1) + "…");

// The rule text per check. It IS the aggregate's governing_fact (no count, no ids), so editing a
// sentence here changes that aggregate's fingerprint -- treat these as keys, not prose.
const RULES = Object.freeze({
  "board-no-home": "An open or partial backlog row with no epic, or whose epic has no project, can never be picked: prime_directive_queue() admits a row only through epic_project_executing(epic_id).",
  "board-repeat-worked": "A ticket the runner has cycled at least chain_max_noship_streak times without reaching done or removed is being re-worked without shipping.",
  "board-deferral-undone": "A before-image recorded defer_status 'yes', the live row no longer says 'yes', and no runner_decisions row for that ticket is dated at or after the image: the deferral was reset without a decision.",
  "board-stale": "An open backlog row older than the unrevalidated-days fence that has never been revalidated is a suspect, not a plan.",
  "quality-closed-red": "A backlog row marked done whose latest runner verdict is block, and whose close no non-reversed ship or ticket-status decision and no accepted ship card ratified at or after that verdict, was closed over an unratified red verdict.",
});
const KINDS = Object.freeze({
  "board-no-home": "other",
  "board-repeat-worked": "other",
  "board-deferral-undone": "contradiction",
  "board-stale": "stale-or-irrelevant",
  "quality-closed-red": "contradiction",
});
const RESOLUTIONS = Object.freeze({
  "board-no-home": "Give the row an epic under an executing project, or remove it.",
  "board-repeat-worked": "Read the ticket's cycles and decide: re-scope it, split it, or remove it -- do not queue it again unchanged.",
  "board-deferral-undone": "Restore defer_status 'yes', or record the decision that undid the deferral.",
  "board-stale": "Revalidate the row (set revalidated_at) or remove it.",
  "quality-closed-red": "Ratify the close with a ship or ticket-status decision dated at or after the block (or harvest John's Accept on its ship card), or re-open the row -- an unratified close over a block is now refused at write time.",
});

function finding(slug, id, evidence, fact) {
  return {
    check_slug: slug,
    kind: KINDS[slug],
    locations: [{ location: `backlog_items:${id}`, text: evidence }],
    governing_fact: clip(fact ?? RULES[slug], 300),
    confidence: "high",
    proposed_resolution: clip(RESOLUTIONS[slug], 400),
  };
}

function nowMsOf(ctx) {
  const ms = Date.parse(ctx?.now);
  if (!Number.isFinite(ms)) throw new Error(`audit-board: ctx.now is not a parseable ISO instant (got ${ctx?.now})`);
  return ms;
}

// --- the five pure checks: (board, ctx) -> finding[] -------------------------------------------
// board = {items, epics, cycles, images, decisions, accepts, verdicts}; ctx = {now, N, unrevalidatedDays}.

export function checkNoHome(board) {
  const epics = new Map((board.epics ?? []).map(e => [e.id, e]));
  const out = [];
  for (const r of board.items ?? []) {
    if (!OPEN.includes(r.status)) continue;
    const epic = r.epic_id == null ? null : epics.get(r.epic_id);
    if (r.epic_id != null && epic && epic.project_id != null) continue;
    const why = r.epic_id == null ? "epic_id is null" : !epic ? `epic ${r.epic_id} not found` : `epic ${r.epic_id} has no project`;
    out.push(finding("board-no-home", r.backlog_id, `status ${r.status}; ${why}`));
  }
  return out;
}

export function cycleCounts(board) {
  const byUuid = new Map((board.items ?? []).map(r => [r.id, r.backlog_id]));
  const counts = new Map();
  for (const c of board.cycles ?? []) {
    // AGT-167: the ceiling is a NON-SHIPPING count. A shipped cycle is progress, not re-work.
    if (c.outcome === "shipped") continue;
    const key = (c.backlog_item_id != null ? byUuid.get(c.backlog_item_id) : null) ?? c.item_id ?? null;
    if (key == null) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function checkRepeatWorked(board, ctx) {
  const N = ctx?.N;
  if (!Number.isInteger(N) || N < 1) throw new Error(`audit-board: ctx.N must be a positive integer (got ${N})`);
  const status = new Map((board.items ?? []).map(r => [r.backlog_id, r.status]));
  const out = [];
  for (const [id, n] of [...cycleCounts(board)].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (n < N) continue;
    const s = status.get(id);
    if (s === undefined || TERMINAL.includes(s)) continue;
    out.push(finding("board-repeat-worked", id, `${n} cycles (streak cap ${N}); status ${s}`));
  }
  return out;
}

export function checkDeferralUndone(board) {
  const byUuid = new Map((board.items ?? []).map(r => [r.id, r]));
  const byId = new Map((board.items ?? []).map(r => [r.backlog_id, r]));
  const decided = new Map();
  for (const d of board.decisions ?? []) {
    if (d.backlog_id == null) continue;
    const t = ts(d.decided_at);
    if (Number.isFinite(t) && t > (decided.get(d.backlog_id) ?? -Infinity)) decided.set(d.backlog_id, t);
  }
  // One finding per ticket: the latest 'yes' image is the one a later decision must answer.
  const latest = new Map();
  for (const img of board.images ?? []) {
    if (img?.row_data?.defer_status !== "yes") continue;
    const live = byUuid.get(img.pk_value) ?? byId.get(img.row_data?.backlog_id);
    if (!live) continue;
    const t = ts(img.created_at);
    const prev = latest.get(live.backlog_id);
    if (!prev || t > prev.t) latest.set(live.backlog_id, { live, t, at: img.created_at });
  }
  const out = [];
  for (const [id, { live, t, at }] of [...latest].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (live.defer_status === "yes") continue;
    if ((decided.get(id) ?? -Infinity) >= t) continue;
    out.push(finding("board-deferral-undone", id, `image ${at} defer_status 'yes'; live ${JSON.stringify(live.defer_status ?? null)}; no decision since`));
  }
  return out;
}

export function checkStale(board, ctx) {
  const days = ctx?.unrevalidatedDays ?? UNREVALIDATED_DAYS;
  const fence = nowMsOf(ctx) - days * DAY;
  const out = [];
  for (const r of board.items ?? []) {
    if (r.status !== "open" || r.revalidated_at != null) continue;
    const born = r.filed_at ?? r.created_at;
    if (!(ts(born) < fence)) continue;
    out.push(finding("board-stale", r.backlog_id, `filed ${String(born).slice(0, 10)}; older than ${days} days; never revalidated`));
  }
  return out;
}

// RATIFIED (AGT-166): the latest of a ticket's ratifying acts, dated at or after the block it
// answers -- a non-reversed runner_decisions row of kind ship/ticket-status, or an accepted ship
// card. It is the SAME predicate the trigger backlog_done_requires_verdict enforces at write time,
// so the audit and the gate cannot disagree about which closes are legal.
export function ratifiedAt(board, backlogId) {
  let t = -Infinity;
  for (const d of board.decisions ?? []) {
    if (d.backlog_id !== backlogId) continue;
    if (d.kind !== "ship" && d.kind !== "ticket-status") continue;
    if (d.status === "reversed") continue;
    const at = ts(d.decided_at);
    if (Number.isFinite(at) && at > t) t = at;
  }
  for (const a of board.accepts ?? []) {
    if (a.backlog_id !== backlogId) continue;
    const at = ts(a.decided_at);
    if (Number.isFinite(at) && at > t) t = at;
  }
  return t;
}

export function checkClosedRed(board) {
  const latest = new Map();
  for (const v of board.verdicts ?? []) {
    if (v.backlog_id == null) continue;
    const t = ts(v.created_at);
    const prev = latest.get(v.backlog_id);
    if (!prev || t > prev.t) latest.set(v.backlog_id, { t, verdict: v.verdict, at: v.created_at });
  }
  const out = [];
  for (const r of board.items ?? []) {
    if (r.status !== "done") continue;
    const v = latest.get(r.backlog_id);
    if (!v || v.verdict !== "block") continue;
    if (ratifiedAt(board, r.backlog_id) >= v.t) continue; // ratified: a recorded judgment, not a contradiction
    out.push(finding("quality-closed-red", r.backlog_id, `status done; latest verdict block at ${v.at}; never ratified`));
  }
  return out;
}

const CHECKS = Object.freeze({
  "board-no-home": checkNoHome,
  "board-repeat-worked": checkRepeatWorked,
  "board-deferral-undone": checkDeferralUndone,
  "board-stale": checkStale,
  "quality-closed-red": checkClosedRed,
});

// Over AGGREGATE_OVER rows -> ONE finding, ONE stable location; at or under -> unchanged.
export function aggregate(slug, findings) {
  if (findings.length <= AGGREGATE_OVER) return findings;
  const ids = findings.map(f => f.locations[0].location.replace(/^backlog_items:/, ""));
  return [{
    check_slug: slug,
    kind: KINDS[slug],
    locations: [{ location: `audit-board/${slug}`, text: `${ids.length} rows: ${ids.join(", ")}` }],
    governing_fact: clip(RULES[slug], 300),
    confidence: "high",
    proposed_resolution: clip(`${ids.length} rows. ${RESOLUTIONS[slug]}`, 400),
  }];
}

export function runChecks(board, ctx) {
  const out = [];
  for (const slug of CHECK_SLUGS) out.push(...aggregate(slug, CHECKS[slug](board, ctx)));
  return out;
}

// --- the CLI half (credentials, reads, one file) ----------------------------------------------

function fail(message) {
  process.stderr.write(`audit-board: ${message}\n`);
  process.exit(2);
}

async function get(base, key, q, extraHeaders) {
  let res;
  try {
    res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${q}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, ...(extraHeaders ?? {}) },
    });
  } catch (e) {
    fail(`could not reach the Supabase REST endpoint: ${e.message}`);
  }
  const body = await res.text().catch(() => "");
  if (!res.ok) fail(`Supabase REST returned HTTP ${res.status} ${res.statusText}: ${body}`);
  try { return JSON.parse(body); } catch (e) { fail(`Supabase REST returned a body that is not JSON: ${e.message}`); }
}

// A truncated read is not a board -- and `&limit=N` cannot detect the truncation, because PostgREST's
// own max-rows cap (1,000) applies first and silently (AGT-166: 1,000 of 1,077 board rows, no error).
// Page with Range instead, stop on the first SHORT page, and treat `limit` as the ceiling on the total.
export const PAGE_ROWS = 1000;
async function readAll(base, key, name, q, limit) {
  if (!/[?&]order=/.test(q)) fail(`the ${name} read has no order= clause -- an unordered page boundary may repeat or skip a row`);
  const rows = [];
  for (let from = 0; ; from += PAGE_ROWS) {
    const page = await get(base, key, q, { "Range-Unit": "items", Range: `${from}-${from + PAGE_ROWS - 1}` });
    if (!Array.isArray(page)) fail(`the ${name} read came back non-array`);
    rows.push(...page);
    if (page.length < PAGE_ROWS) return rows;
    if (rows.length >= limit) fail(`the ${name} read reached its ceiling of ${limit} rows and the last page was still full -- refusing a partial board`);
  }
}

export async function readBoard(base, key) {
  const items = await readAll(base, key, "backlog_items",
    "backlog_items?select=id,backlog_id,status,epic_id,defer_status,filed_at,created_at,revalidated_at&order=backlog_id", 5000);
  const epics = await readAll(base, key, "epics", "epics?select=id,project_id&order=id", 1000);
  const cycles = await readAll(base, key, "runner_cycles", "runner_cycles?select=backlog_item_id,item_id,outcome&order=id", 20000);
  const images = await readAll(base, key, "runner_before_images",
    "runner_before_images?select=pk_value,row_data,created_at&table_name=eq.backlog_items&row_data->>defer_status=eq.yes&order=id", 10000);
  const decisions = await readAll(base, key, "runner_decisions",
    "runner_decisions?select=backlog_id,decided_at,kind,status&backlog_id=not.is.null&order=id", 20000);
  const accepts = await readAll(base, key, "runner_items",
    "runner_items?select=backlog_id,decided_at&kind=eq.ship&decision=eq.accept&order=id", 20000);
  const verdicts = await readAll(base, key, "runner_verdicts", "runner_verdicts?select=backlog_id,verdict,created_at&order=id", 20000);
  const settings = await get(base, key, "runner_settings?select=chain_max_noship_streak&id=eq.1");
  const N = Array.isArray(settings) ? settings[0]?.chain_max_noship_streak : undefined;
  if (!Number.isInteger(N) || N < 1) fail(`runner_settings id=1 chain_max_noship_streak is not a positive integer (got ${JSON.stringify(N)})`);
  return { board: { items, epics, cycles, images, decisions, accepts, verdicts }, N };
}

async function main() {
  const argv = process.argv.slice(2);
  for (const a of argv) if (!/^--out=.+/.test(a)) fail(`unknown argument ${a} (only --out=<json>; this script is read-only)`);
  const outArg = argv.find(a => a.startsWith("--out="))?.slice(6);
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) fail("SUPABASE_URL and SUPABASE_SERVICE_KEY are required");

  const now = new Date().toISOString();
  const { board, N } = await readBoard(base, key);
  const ctx = { now, N, unrevalidatedDays: UNREVALIDATED_DAYS };
  const findings = runChecks(board, ctx);
  const doc = { week: isoWeek(now), found_by: FOUND_BY, findings };

  const lines = [`audit-board: ${doc.week} · ${findings.length} findings · streak cap ${N} · fence ${UNREVALIDATED_DAYS}d · items read ${board.items.length}`];
  for (const slug of CHECK_SLUGS) {
    const raw = CHECKS[slug](board, ctx).length;
    const shape = raw > AGGREGATE_OVER ? "aggregate" : "per-row";
    lines.push(`  ${slug}: ${raw} rows -> ${findings.filter(f => f.check_slug === slug).length} finding(s) (${shape})`);
  }
  if (outArg) {
    fs.writeFileSync(path.resolve(outArg), JSON.stringify(doc, null, 2) + "\n", "utf8");
    lines.push(`  wrote ${outArg}`);
  } else {
    lines.push(JSON.stringify(doc));
  }
  process.stdout.write(lines.join("\n") + "\n");
  process.exit(0);
}

// Importing this module for its exports must never run the CLI (ticket-owner.js's SES-176 contract).
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
