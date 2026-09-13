#!/usr/bin/env node
// DeepBench v7.0.474 | scripts/ticket-owner.js | AGT-79 slice 1 -- THE TICKET OWNER'S CENSUS: one
// mechanical pass over the whole board that CLASSIFIES and never writes.
//
// WHAT THIS FILE IS. The Ticket Owner owns a ticket's ROW after it is filed -- its quote, its
// actual, its status and its close-out. Eleven date-fenced checks read the board once and sort
// every gap into two kinds: DERIVABLE (another column already holds the value, so the fix is
// computed here and carried on the finding) and JUDGMENT (a capability has to decide it, so the
// finding carries a sentence and no fix). This slice computes both and writes NOTHING -- not to
// backlog_items, not to ticket_owner_findings. The write pass is slice 2, under one
// record_decision row with before-images.
//
// THE FENCES ARE THE POINT, not decoration. Every column this censuses was added to backlog_items
// on a known date; a row filed before its column existed is not a fault, it is a row that predates
// the question. Flagging those nightly would bury four real gaps under 467 ancient ones, so a row
// behind a check's fence lands in a COUNT (backlog.*_prefence) and never in findings. A filing-time
// gap is fenced on the ticket's filed_at; a close-out gap on its updated_at.
//
// PURE BY CONSTRUCTION. classifyBoard() and renderCensus() take data and return data -- no fetch,
// no disk, no process.exit, no clock (the caller passes `now`). That is what lets the regression
// test drive fourteen one-variable rows through the real code instead of a copy of it, and what
// lets slice 2 reuse the same classification it will write from. The CLI half below is the only
// part that reads credentials, and importing this module never runs it.
//
// EXIT CODES: 0 the census ran; 2 it could not run -- missing credentials, a REST read that failed
// or came back truncated, unreadable input, or an unknown flag. There is deliberately no --apply.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- constants (exported; the regression test asserts each one) --------------------------------

// The birth date of each column the census reads. Measured from the migration that added it; a row
// whose own date is older than its check's fence is counted, never flagged.
export const FENCES = Object.freeze({
  size_stamp: "2026-08-28T21:34:27Z",
  predicted_cycles: "2026-09-01T15:56:03Z",
  cost_pct_snapshot: "2026-09-01T16:41:41Z",
  runner_verdicts: "2026-08-25T03:50:04Z",
});

// docs/FEATURES.md section Type Taxonomy (eight rows) plus the two live majorities the legend has
// never been updated to carry -- Tooling (235 rows) and Bug (43). Filed as a gap for the capability
// that owns the legend; until then the census must not call 235 correctly-typed rows off-taxonomy.
export const TYPE_TAXONOMY = Object.freeze([
  "Task Success Rate", "Speed", "Architecture", "Feature",
  "Tech Debt", "Data", "Observability", "UI",
  "Tooling", "Bug",
]);

// The ONLY normalisations, and they are one-to-one: a casing slip and a plural. Anything else that
// is off-taxonomy is a judgment call about what the ticket actually is, which is not a cell the
// census may fill. Keeping this map to exactly two entries is why type-off-taxonomy can be
// derivable at all without the census inventing a classification.
export const TYPE_MAP = Object.freeze({ feature: "Feature", "Bug Fixes": "Bug" });

// Order matters twice: findings sort by this index, and renderCensus prints one line per slug in
// this order even at zero -- a check that found nothing must still say so, or an absent line is
// indistinguishable from a check that stopped running.
export const CHECKS = Object.freeze([
  "quote-missing",
  "size-missing",
  "cost-snapshot-missing",
  "actual-unknown",
  "claim-on-closed",
  "claim-expired",
  "verdict-missing",
  "designed-closed",
  "type-off-taxonomy",
  "delivered-unaccepted",
  "cycles-over-quote",
]);

const CLOSED = new Set(["done", "delivered"]);
const LIVE = new Set(["open", "partial"]);
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

const round2 = x => Math.round(x * 100) / 100;
const ts = v => (v == null ? NaN : Date.parse(v));

// --- the pure half -----------------------------------------------------------------------------

// classifyBoard(board, {now, rate}) -> {findings, backlog, counts}
//
// `board` holds exactly what the six reads return: {items, matrix, verdicts, accepts, decisions,
// openCycles}. `now` is an ISO string; `rate` is public.runner_pct_per_cycle() for the night.
// One finding per (row, check). `fix` is present ONLY on a derivable finding and holds exactly the
// columns slice 2 will write -- so a fix object is a write statement, not a suggestion.
export function classifyBoard(board, { now, rate }) {
  const items = board.items ?? [];
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error(`classifyBoard: \`now\` is not a parseable ISO instant (got ${now})`);
  if (typeof rate !== "number" || !Number.isFinite(rate)) throw new Error(`classifyBoard: \`rate\` must be a finite number (got ${rate})`);

  const H24 = nowMs - 24 * HOUR;
  const H48 = nowMs - 48 * HOUR;
  const D30 = nowMs - 30 * DAY;
  const nowStamp = new Date(nowMs).toISOString();

  const cycles = new Map();
  for (const r of board.matrix ?? []) cycles.set(r.backlog_id, r.actual_cycles ?? 0);
  const verdicts = new Set((board.verdicts ?? []).map(r => r.backlog_id));
  const accepts = new Set((board.accepts ?? []).map(r => r.backlog_id));
  const liveCycles = new Set((board.openCycles ?? []).map(r => r.id));
  // A later decision stands in for an Accept: John ruling on the ticket after it was delivered is
  // the acceptance, whatever row carried it.
  const decisions = board.decisions ?? [];

  const findings = [];
  const backlog = {
    quote_prefence: 0, size_prefence: 0, cost_prefence: 0,
    verdict_prefence: 0, unrevalidated_30d: 0, attended_actual_null: 0,
  };

  const file = (row, check, verdict, detail, fix) => {
    const f = { backlog_id: row.backlog_id, check, verdict, detail };
    if (fix !== undefined) f.fix = fix;
    findings.push(f);
  };

  for (const row of items) {
    const status = row.status;
    const closed = CLOSED.has(status);
    const live = LIVE.has(status);
    const T = row.filed_at ?? row.created_at;
    const U = row.updated_at;
    const c = cycles.get(row.backlog_id) ?? 0;

    // 1 quote-missing -- fenced on filing.
    if (live && row.predicted_cycles == null) {
      if (ts(T) >= ts(FENCES.predicted_cycles)) {
        file(row, "quote-missing", "judgment",
          `predicted_cycles is null on a ${status} ticket filed ${T}, after the column existed.`);
      } else backlog.quote_prefence++;
    }

    // 2 size-missing -- fenced on filing.
    if (live && row.size_stamp == null) {
      if (ts(T) >= ts(FENCES.size_stamp)) {
        file(row, "size-missing", "judgment",
          `size_stamp is null on a ${status} ticket filed ${T}, after the column existed.`);
      } else backlog.size_prefence++;
    }

    // 3 cost-snapshot-missing / 4 actual-unknown -- one gap, two verdicts. The split IS the
    // derivable/judgment line: actual_cycles > 0 makes the cost arithmetic; 0 makes it unknowable
    // (an attended or desktop session writes no cycle row), and no amount of reading fixes that.
    if (closed && row.cost_pct_snapshot == null) {
      if (ts(U) >= ts(FENCES.cost_pct_snapshot)) {
        if (c > 0) {
          file(row, "cost-snapshot-missing", "derivable",
            `cost_pct_snapshot is null on a ${status} ticket updated ${U}; ticket_matrix.actual_cycles reads ${c}.`,
            {
              cost_cycles_snapshot: c,
              cost_pct_snapshot: round2(c * rate),
              cost_snapshot_rate: rate,
              cost_snapshot_at: nowStamp,
            });
        } else {
          file(row, "actual-unknown", "judgment",
            `cost_pct_snapshot is null on a ${status} ticket updated ${U} and ticket_matrix.actual_cycles reads 0, so no cycle row recorded the cost.`);
        }
      } else backlog.cost_prefence++;   // whatever `c`: the columns did not exist when it closed.
    }

    // 5 claim-on-closed -- no fence: claimed_by and claimed_at are older than every column here.
    if (closed && row.claimed_by != null) {
      file(row, "claim-on-closed", "derivable",
        `claimed_by still reads ${row.claimed_by} on a ${status} ticket (claimed_at ${row.claimed_at}).`,
        { claimed_by: null, claimed_at: null });
    }

    // 6 claim-expired -- a claim older than 24 h whose holder is not a running cycle. Checking the
    // holder against openCycles is what keeps a long but LIVE cycle's claim off this list.
    if (live && row.claimed_by != null && ts(row.claimed_at) < H24 && !liveCycles.has(row.claimed_by)) {
      file(row, "claim-expired", "derivable",
        `claimed_by reads ${row.claimed_by} with claimed_at ${row.claimed_at}, past 24 hours, and no open cycle holds that id.`,
        { claimed_by: null, claimed_at: null });
    }

    // 7 verdict-missing -- fenced on close-out.
    if (closed && !verdicts.has(row.backlog_id)) {
      if (ts(U) >= ts(FENCES.runner_verdicts)) {
        file(row, "verdict-missing", "judgment",
          `no runner_verdicts row for a ${status} ticket updated ${U}, after the table existed.`);
      } else backlog.verdict_prefence++;
    }

    // 8 designed-closed -- design_status is a pre-build word; on a closed row it is stale.
    if (closed && row.design_status === "designed") {
      file(row, "designed-closed", "judgment",
        `design_status reads designed on a ${status} ticket (kickoff_link ${row.kickoff_link ?? "null"}).`);
    }

    // 9 type-off-taxonomy -- derivable only through the one-to-one map; anything else is a
    // classification, which the census never makes.
    if (row.type == null || !TYPE_TAXONOMY.includes(row.type)) {
      const mapped = Object.prototype.hasOwnProperty.call(TYPE_MAP, row.type) ? TYPE_MAP[row.type] : undefined;
      if (mapped !== undefined) {
        file(row, "type-off-taxonomy", "derivable",
          `type reads ${row.type}, a one-to-one spelling of the taxonomy entry ${mapped}.`,
          { type: mapped });
      } else {
        file(row, "type-off-taxonomy", "judgment",
          `type reads ${row.type == null ? "null" : row.type}, which the taxonomy does not carry.`);
      }
    }

    // 10 delivered-unaccepted -- delivered more than 48 h ago with neither an Accept nor a later
    // decision. `laterDecision` is read against THIS row's updated_at, not against now.
    if (status === "delivered" && ts(U) < H48 && !accepts.has(row.backlog_id)) {
      const laterDecision = decisions.some(d => d.backlog_id === row.backlog_id && ts(d.decided_at) > ts(U));
      if (!laterDecision) {
        file(row, "delivered-unaccepted", "judgment",
          `status reads delivered with updated_at ${U}, past 48 hours, and no Accept or later decision answers it.`);
      }
    }

    // 11 cycles-over-quote -- the quote it closed against, read from the row's own predicted_cycles.
    if (closed && row.predicted_cycles != null && c > row.predicted_cycles) {
      file(row, "cycles-over-quote", "judgment",
        `ticket_matrix.actual_cycles reads ${c} against predicted_cycles ${row.predicted_cycles}.`);
    }

    // Counts only, never findings: both are reported once as a number, not flagged per row.
    if (status === "open" && ts(T) < D30 && row.revalidated_at == null) backlog.unrevalidated_30d++;
    if (closed && row.actual_tokens_attended == null) backlog.attended_actual_null++;
  }

  findings.sort((a, b) =>
    CHECKS.indexOf(a.check) - CHECKS.indexOf(b.check) ||
    (a.backlog_id < b.backlog_id ? -1 : a.backlog_id > b.backlog_id ? 1 : 0));

  const derivable = findings.filter(f => f.verdict === "derivable").length;
  return {
    findings,
    backlog,
    counts: { rows: items.length, findings: findings.length, derivable, judgment: findings.length - derivable },
  };
}

// renderCensus(result, nowIso) -> the census text. Pure, and byte-stable for a given result: the
// nightly report is diffed night over night, so a rendering that reordered anything would read as
// a change on the board that never happened.
export function renderCensus(result, nowIso) {
  const b = result.backlog;
  const c = result.counts;
  const lines = [
    `ticket-owner census ${nowIso}: ${c.rows} rows · ${c.findings} findings (${c.derivable} derivable · ${c.judgment} judgment)` +
    ` · behind the fences: quote ${b.quote_prefence} · size ${b.size_prefence} · cost ${b.cost_prefence}` +
    ` · verdict ${b.verdict_prefence} · unrevalidated>30d ${b.unrevalidated_30d} · attended-actual null ${b.attended_actual_null}`,
  ];
  for (const check of CHECKS) {
    const mine = result.findings.filter(f => f.check === check);
    const ids = mine.map(f => f.backlog_id).sort();
    const shown = ids.length === 0
      ? "—"
      : ids.slice(0, 8).join(", ") + (ids.length > 8 ? ` +${ids.length - 8}` : "");
    const d = mine.filter(f => f.verdict === "derivable").length;
    lines.push(`  ${check.padEnd(22)}  derivable ${d}  judgment ${mine.length - d}  ${shown}`);
  }
  return lines.join("\n") + "\n";
}

// --- the CLI half (credentials, disk, exit codes) ----------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWED_FLAGS = new Set(["census", "board", "out", "json"]);

function fail(message) {
  process.stderr.write(`ticket-owner: ${message}\n`);
  process.exit(2);
}

// Same shape as render-standing-brief.js:1076 -- one fetch path every read goes through, so no
// caller gets its own error handling and its own chance to swallow a 403.
async function rest(base, key, pathAndQuery, init = {}) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, ...(init.body ? { "Content-Type": "application/json" } : {}) };
  let res;
  try {
    res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, { ...init, headers });
  } catch (e) {
    fail(`could not reach the Supabase REST endpoint: ${e.message}`);
  }
  if (!res.ok) fail(`Supabase REST returned HTTP ${res.status} ${res.statusText}: ${await res.text().catch(() => "")}`);
  return res.json();
}

// A TRUNCATED BOARD IS NOT A CENSUS. Every read names its columns and carries a limit; a response
// that came back AT the limit may have left rows behind, and a census over an unknown subset would
// report a clean board it never measured. That refuses here rather than printing.
async function readAll(base, key, name, query, limit) {
  const rows = await rest(base, key, query);
  if (!Array.isArray(rows)) fail(`the ${name} read came back non-array — refusing to census a board that was not read`);
  if (rows.length >= limit) fail(`the ${name} read returned ${rows.length} rows at its limit of ${limit} — the board is truncated, so this is not a census`);
  return rows;
}

async function readBoard(base, key) {
  const items = await readAll(base, key, "backlog_items",
    "backlog_items?select=id,backlog_id,status,type,tier,claimed_by,claimed_at,predicted_cycles,size_stamp," +
    "design_status,kickoff_link,cost_pct_snapshot,cost_cycles_snapshot,revalidated_at,filed_at,created_at," +
    "updated_at,actual_tokens_attended&status=in.(open,partial,done,delivered)&order=backlog_id&limit=5000", 5000);
  const matrix = await readAll(base, key, "ticket_matrix",
    "ticket_matrix?select=backlog_id,actual_cycles,predicted_cycles&limit=5000", 5000);
  const verdicts = await readAll(base, key, "runner_verdicts",
    "runner_verdicts?select=backlog_id&limit=10000", 10000);
  const accepts = await readAll(base, key, "runner_items",
    "runner_items?select=backlog_id,decided_at&decided_at=not.is.null&backlog_id=not.is.null&limit=10000", 10000);
  const decisions = await readAll(base, key, "runner_decisions",
    "runner_decisions?select=backlog_id,decided_at&backlog_id=not.is.null&limit=10000", 10000);
  const openCycles = await readAll(base, key, "runner_cycles",
    "runner_cycles?select=id&ended_at=is.null&limit=1000", 1000);
  return { items, matrix, verdicts, accepts, decisions, openCycles };
}

async function readRate(base, key) {
  const raw = await rest(base, key, "rpc/runner_pct_per_cycle", { method: "POST", body: "{}" });
  const rate = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(rate)) fail(`rpc/runner_pct_per_cycle returned ${JSON.stringify(raw)}, which is not a number — the cost arithmetic has no rate`);
  return rate;
}

function arg(argv, name) {
  const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (hit === undefined) return undefined;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
}

async function main() {
  const argv = process.argv.slice(2);
  for (const a of argv) {
    const name = a.replace(/^--/, "").split("=")[0];
    if (!a.startsWith("--") || !ALLOWED_FLAGS.has(name)) {
      fail(`unknown flag ${a} — this script reads and reports; it has no --apply (the write pass is slice 2).`);
    }
  }

  const boardArg = arg(argv, "board");
  const census = arg(argv, "census");
  if (boardArg === undefined && census === undefined) {
    fail("nothing to do: pass --census (live) or --board=<json> (fixture).");
  }
  if (boardArg !== undefined && census !== undefined) {
    fail("--census and --board are two different sources; pass one.");
  }

  let board, now, rate;
  if (boardArg !== undefined) {
    // Fixture mode: no credentials are read at all, so a machine without them can still run the
    // census over a board. The fixture's own `now` and `rate` win -- a fixture whose clock came
    // from the wall would classify differently on different nights, which is not a fixture.
    if (boardArg === true) fail("--board needs a path: --board=<json>.");
    const file = path.resolve(ROOT, String(boardArg));
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      fail(`could not read --board=${boardArg}: ${e.message}`);
    }
    if (!parsed || typeof parsed !== "object" || !parsed.board) fail(`--board=${boardArg} is not a board fixture: expected {now, rate, board}.`);
    board = parsed.board;
    now = parsed.now;
    rate = parsed.rate;
  } else {
    const base = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!base) fail("SUPABASE_URL is not set — the live census reads the board over REST.");
    if (!key) fail("SUPABASE_SERVICE_KEY is not set — the live census reads the board over REST.");
    now = new Date().toISOString();
    rate = await readRate(base, key);
    board = await readBoard(base, key);
  }

  let result;
  try {
    result = classifyBoard(board, { now, rate });
  } catch (e) {
    fail(e.message);
  }

  const out = {
    measured_at: now,
    rate,
    fences: FENCES,
    counts: result.counts,
    backlog: result.backlog,
    findings: result.findings,
  };

  const outPath = arg(argv, "out");
  if (outPath !== undefined) {
    if (outPath === true) fail("--out needs a path: --out=<json>.");
    const dest = path.resolve(process.cwd(), String(outPath));
    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n", "utf8");
    } catch (e) {
      fail(`could not write --out=${outPath}: ${e.message}`);
    }
  }

  process.stdout.write(arg(argv, "json") !== undefined ? JSON.stringify(out) + "\n" : renderCensus(result, now));
  process.exit(0);
}

// SES-176's contract: importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
