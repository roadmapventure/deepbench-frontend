#!/usr/bin/env node
// DeepBench v7.0.477 | scripts/ticket-owner.js | AGT-79 slices 1-3 -- THE TICKET OWNER'S CENSUS:
// one mechanical pass over the whole board that CLASSIFIES, (slice 2, only under --apply) the
// WRITE PASS that lands every derivable fix under a single reversible decision, and (slice 3,
// --nightly) the ONCE-PER-CHICAGO-NIGHT run that is its own precondition: it reads the newest
// cycle row it wrote, answers `already run today` on exit 0 without reading the board, and
// otherwise records itself as one scheduled cycle row whose notes ARE the night's report.
//
// WHAT THIS FILE IS. The Ticket Owner owns a ticket's ROW after it is filed -- its quote, its
// actual, its status and its close-out. Eleven date-fenced checks read the board once and sort
// every gap into two kinds: DERIVABLE (another column already holds the value, so the fix is
// computed here and carried on the finding) and JUDGMENT (a capability has to decide it, so the
// finding carries a sentence and no fix). The census half computes both and writes NOTHING.
//
// THE WRITE PASS (slice 2, --apply only). planWrites() turns a census into a PLAN -- the derivable
// fixes as row patches, and the judgment findings as ledger inserts / re-seens / clears against
// what ticket_owner_findings already holds. applyPlan() lands that plan in five REST steps under
// ONE record_decision row, having first imaged the FULL prior row of every cell it touches. Full
// rows, because reverse_decision() rewrites every column of a backlog_items row from the image --
// a partial image would restore a partial row. And no PATCH ever names updated_at, because
// reverse_decision() refuses a row whose updated_at is later than the decision (SES-316): a write
// pass that bumped the stamp would make itself unreversible on the spot.
//
// ONE DECISION FOR THE WHOLE NIGHT is the design, not an optimisation. John reverses a night of
// hygiene with a single reverse_decision() call, or he reverses none of it; forty decisions would
// mean forty calls to undo one wrong rate.
//
// THE FENCES ARE THE POINT, not decoration. Every column this censuses was added to backlog_items
// on a known date; a row filed before its column existed is not a fault, it is a row that predates
// the question. Flagging those nightly would bury four real gaps under 467 ancient ones, so a row
// behind a check's fence lands in a COUNT (backlog.*_prefence) and never in findings. A filing-time
// gap is fenced on the ticket's filed_at; a close-out gap on its updated_at.
//
// PURE BY CONSTRUCTION. classifyBoard(), renderCensus() and planWrites() take data and return data -- no fetch,
// no disk, no process.exit, no clock (the caller passes `now`). That is what lets the regression
// test drive fourteen one-variable rows through the real code instead of a copy of it, and what
// lets the write pass plan from the same classification it writes from. applyPlan() and the CLI
// below are the only parts that read credentials, and importing this module never runs the CLI.
//
// THE NIGHT IS KEYED BY A CALENDAR DAY, NEVER BY AN OFFSET (slice 3). CDT midnight is 05:00Z and
// CST midnight 06:00Z, so "has it already run tonight" cannot be answered by subtracting hours.
// sameChicagoDay() asks the only question that survives the DST boundary: do these two instants
// fall on the same America/Chicago calendar date. The precondition is the command itself -- a
// cycle never compares dates by hand.
//
// EXIT CODES: 0 the census (and, under --apply, the write pass) ran; 2 it could not run or could
// not finish -- missing credentials, a REST read that failed or came back truncated, unreadable
// input, an unknown flag, --apply without a cycle id, or any write step that did not land. A
// failed step exits 2 naming the step and the decision id, so a half-applied night is traceable
// to the one call that stopped it.

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
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

// The nightly run's signature in runner_cycles.notes. It is a PREFIX and not a column because the
// precondition read is `notes=like.<prefix>%` -- one indexable question ("has this agent run?")
// that needs no schema change, and the same string the standing brief strips before printing.
export const NIGHTLY_PREFIX = "SCHEDULED-AGENT: audit-board";

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

// censusLine(result) -> the one-line summary of a census, WITHOUT the timestamp prefix. One
// function, two readers: renderCensus prints it after `ticket-owner census <iso>: `, and the
// nightly cycle row carries it verbatim in `notes` so the standing brief prints the night's own
// words rather than recomputing a fence from a second reading of the board.
export function censusLine(result) {
  const b = result.backlog;
  const c = result.counts;
  return `${c.rows} rows · ${c.findings} findings (${c.derivable} derivable · ${c.judgment} judgment)` +
    ` · behind the fences: quote ${b.quote_prefence} · size ${b.size_prefence} · cost ${b.cost_prefence}` +
    ` · verdict ${b.verdict_prefence} · unrevalidated>30d ${b.unrevalidated_30d} · attended-actual null ${b.attended_actual_null}`;
}

// renderCensus(result, nowIso) -> the census text. Pure, and byte-stable for a given result: the
// nightly report is diffed night over night, so a rendering that reordered anything would read as
// a change on the board that never happened.
export function renderCensus(result, nowIso) {
  const lines = [
    `ticket-owner census ${nowIso}: ${censusLine(result)}`,
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

// planWrites(result, prior, items, {rate}) -> {fixes, ledger: {insert, reseen, clear}, meta}
//
// The census says what is wrong; this says what will be WRITTEN, and nothing here touches the
// network. `prior` is the open ledger (uncleared ticket_owner_findings rows) as
// [{id, backlog_id, check_slug}]; `items` is the board read, the only place a backlog_id can be
// resolved to the primary key a PATCH addresses.
//
// A finding is identified by (row, check) and by nothing else -- that pair is what makes tonight's
// census comparable with last night's ledger, and it is why a judgment finding already on the
// ledger is a RE-SEEN (touch last_seen_at) rather than a second row. The three ledger lists are
// exhaustive over `prior` by construction: every open row is either seen again tonight or cleared.
// Clearing is not deletion -- a cleared row keeps its history and simply stops being open.
export function planWrites(result, prior, items, { rate } = {}) {
  const byId = new Map((items ?? []).map(i => [i.backlog_id, i.id]));
  const key = f => `${f.backlog_id} ${f.check ?? f.check_slug}`;

  // A fix without a primary key is not a write, so this throws rather than silently planning a
  // PATCH it cannot address -- a dropped fix would read as a clean board on the next census.
  const fixes = result.findings.filter(f => f.verdict === "derivable").map(f => {
    const id = byId.get(f.backlog_id);
    if (id === undefined) {
      throw new Error(`planWrites: no backlog_items id for ${f.backlog_id} (${f.check}) — a fix without a primary key is not a write`);
    }
    return { backlog_id: f.backlog_id, id, check: f.check, patch: f.fix };
  });

  const judgment = result.findings.filter(f => f.verdict === "judgment");
  const tonight = new Set(judgment.map(key));
  const priorKeys = new Set((prior ?? []).map(key));

  const insert = judgment.filter(f => !priorKeys.has(key(f))).map(f => ({
    id: randomUUID(),
    backlog_id: f.backlog_id,
    check_slug: f.check,
    verdict: "judgment",
    detail: f.detail,
  }));
  const reseen = (prior ?? []).filter(p => tonight.has(key(p))).map(p => p.id);
  const clear = (prior ?? []).filter(p => !tonight.has(key(p))).map(p => p.id);

  return { fixes, ledger: { insert, reseen, clear }, meta: { counts: result.counts, rate } };
}

// sameChicagoDay(aIso, bIso) -> do these two instants fall on the same America/Chicago calendar
// date. The ONLY correct form of "already run tonight": CDT midnight is 05:00Z and CST midnight
// 06:00Z, so any fixed-offset arithmetic is wrong twice a year and silently. Throws on an
// unparseable date rather than answering false -- a precondition that cannot be evaluated must
// stop the run, never wave it through into a second write pass on the same night.
export function sameChicagoDay(aIso, bIso) {
  const opts = { timeZone: "America/Chicago" };
  const day = v => {
    const d = new Date(v);
    if (!Number.isFinite(d.getTime())) throw new Error(`sameChicagoDay: not a parseable instant (got ${v})`);
    return d.toLocaleDateString("en-CA", opts);
  };
  return day(aIso) === day(bIso);
}

// nightlyNotes(line, applied) -> the cycle row's notes: the prefix the precondition reads, the
// census line verbatim, the four write counts, and the decision handle with its reversal window.
// This string is the night's whole report -- the standing brief prints it rather than recomputing
// it, so what John reads is what the run actually said about itself.
export function nightlyNotes(line, applied) {
  const a = applied ?? {};
  const head = `${NIGHTLY_PREFIX} — ${line} · fixed ${a.fixed} · findings +${a.inserted} ~${a.reseen} −${a.cleared}`;
  return head + (a.decision
    ? ` · decision ${a.decision} — reversible until ${a.expires_at}`
    : " · no decision (nothing to fix)");
}

// --- the CLI half (credentials, disk, exit codes) ----------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWED_FLAGS = new Set(["census", "board", "out", "json", "apply", "cycle-id", "nightly"]);

function fail(message) {
  process.stderr.write(`ticket-owner: ${message}\n`);
  process.exit(2);
}

// Same shape as render-standing-brief.js:1076 -- one fetch path every read AND every write goes
// through, so no caller gets its own error handling and its own chance to swallow a 403. `label`
// names the write step for the exit-2 message; a read passes none.
async function rest(base, key, pathAndQuery, init = {}, label = null) {
  const at = label ? `${label}: ` : "";
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(init.headers ?? {}),
  };
  let res;
  try {
    res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, { ...init, headers });
  } catch (e) {
    fail(`${at}could not reach the Supabase REST endpoint: ${e.message}`);
  }
  const body = await res.text().catch(() => "");
  if (!res.ok) fail(`${at}Supabase REST returned HTTP ${res.status} ${res.statusText}: ${body}`);
  // A write with Prefer: return=minimal answers 201/204 with no body at all; that is a success,
  // not a parse error.
  if (body.trim() === "") return null;
  try {
    return JSON.parse(body);
  } catch (e) {
    fail(`${at}Supabase REST returned a body that is not JSON: ${e.message}`);
  }
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

// applyPlan(base, key, plan, {cycleId, sessionName, now}) -> {decision, expires_at, fixed,
// inserted, reseen, cleared}
//
// The five steps, in this order and no other. The ORDER is the safety property: the decision row
// exists before any image, every image exists before the cell it images is touched, and the ledger
// is written last. If step 3 dies halfway, the rows already patched are all imaged under a
// decision that exists, so one reverse_decision() still puts them back -- which is exactly what
// "a half-applied plan must still be reversible" means.
//
// ck_decision_attribution takes exactly one of cycle_id / session_name: the nightly run is a
// cycle, the regression fixture is a session. Passing both (or neither) is a programming error and
// throws before a single request leaves the process.
export async function applyPlan(base, key, plan, { cycleId, sessionName, now } = {}) {
  if ((cycleId == null) === (sessionName == null)) {
    throw new Error("applyPlan: pass exactly one of cycleId / sessionName — every write is attributed to one or the other");
  }
  const A = { cycle_id: cycleId ?? null, session_name: sessionName ?? null };
  const { insert, reseen, clear } = plan.ledger;
  const ids = [...new Set(plan.fixes.map(f => f.id))];

  let decision = null;
  let expires_at = null;
  // Once a decision exists, every later failure message carries it -- so an operator reading the
  // exit-2 line has the one id they need to reverse whatever did land.
  const where = step => `${step}${decision ? ` (decision ${decision})` : ""}`;

  // 1 -- the decision, and only if there is something to decide. A night with no derivable fix
  // records no decision at all rather than an empty one.
  if (plan.fixes.length > 0) {
    const nCost = plan.fixes.filter(f => f.check === "cost-snapshot-missing").length;
    const nClaim = plan.fixes.filter(f => f.check === "claim-on-closed" || f.check === "claim-expired").length;
    const nType = plan.fixes.filter(f => f.check === "type-off-taxonomy").length;
    const counts = plan.meta.counts;
    const rate = plan.meta.rate;
    const p_summary = `Ticket Owner: ${plan.fixes.length} derivable cell fix(es) on ${ids.length} row(s) — cost ${nCost} · claim ${nClaim} · type ${nType}`;
    const p_reasoning = `Nightly census ${now}: ${counts.rows} rows read, ${counts.findings} findings (${counts.derivable} derivable, ${counts.judgment} judgment). Each fix is arithmetic (cost_pct_snapshot = round(actual_cycles × runner_pct_per_cycle(), 2) at rate ${rate}), the claim column's own rule (a closed row, or 24 h past with no live cycle), or a one-to-one type spelling (feature → Feature, Bug Fixes → Bug). Whole rows imaged under this decision; no status, quote or design_status written; judgment findings filed in ticket_owner_findings, not here. pattern:0`;

    decision = await rest(base, key, "rpc/record_decision", {
      method: "POST",
      body: JSON.stringify({
        p_cycle_id: cycleId ?? null,
        p_session_name: sessionName ?? null,
        p_kind: "hygiene",
        p_backlog_id: "AGT-79",
        p_summary,
        p_reasoning,
        p_ladder_work_class: null,
      }),
    }, "record_decision");
    if (typeof decision !== "string" || decision.length !== 36) {
      fail(`record_decision: returned ${JSON.stringify(decision)}, which is not a decision id`);
    }
    const dec = await rest(base, key, `runner_decisions?id=eq.${decision}&select=expires_at`, {}, where("record_decision"));
    expires_at = Array.isArray(dec) && dec[0] ? dec[0].expires_at : null;

    // 2 -- image the FULL rows, before a single cell moves. select=* because reverse_decision()
    // restores every column from row_data.
    const rows = await rest(base, key, `backlog_items?id=in.(${ids.join(",")})&select=*`, {}, where("image rows"));
    if (!Array.isArray(rows) || rows.length !== ids.length) {
      fail(`${where("image rows")}: read ${Array.isArray(rows) ? rows.length : 0} of ${ids.length}`);
    }
    await rest(base, key, "runner_before_images", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(rows.map(r => ({ ...A, table_name: "backlog_items", pk_value: r.id, row_data: r, decision_id: decision }))),
    }, where("image rows"));

    // 3 -- the patches, one row at a time, each one READ BACK. A PATCH that PostgREST accepted and
    // silently did not apply (a column the role cannot write) answers 200 with the old value, so
    // the returned representation is compared key by key rather than trusted.
    for (const fix of plan.fixes) {
      const step = where(`patch ${fix.backlog_id}`);
      const back = await rest(base, key, `backlog_items?id=eq.${fix.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(fix.patch),
      }, step);
      const row = Array.isArray(back) ? back[0] : null;
      if (!row) fail(`${step}: the PATCH returned no row`);
      for (const k of Object.keys(fix.patch)) {
        const got = row[k];
        const want = fix.patch[k];
        const numeric = got != null && want != null && Number.isFinite(Number(got)) && Number.isFinite(Number(want));
        const ok = String(got ?? null) === String(want ?? null)
          || (numeric && Number(got) === Number(want))
          || (k === "cost_snapshot_at" && Number.isFinite(Date.parse(got)) && Date.parse(got) === Date.parse(want));
        if (!ok) fail(`${step}: ${k} read ${JSON.stringify(got)}`);
      }
    }
  }

  // 4 -- the ledger inserts, each preceded by a NULL-row image. A null row_data is how the
  // reversal chain says "this row did not exist before"; without it a reversal would have nothing
  // to say about a finding the night invented.
  if (insert.length > 0) {
    await rest(base, key, "runner_before_images", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(insert.map(f => ({ ...A, table_name: "ticket_owner_findings", pk_value: f.id, row_data: null }))),
    }, where("image findings"));
    await rest(base, key, "ticket_owner_findings", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(insert.map(f => ({
        id: f.id,
        backlog_id: f.backlog_id,
        check_slug: f.check_slug,
        verdict: "judgment",
        detail: f.detail,
        first_seen_at: now,
        last_seen_at: now,
        cycle_id: cycleId ?? null,
      }))),
    }, where("insert findings"));
  }

  // 5 -- the touches. Re-seen rows keep their first_seen_at (the age of a gap is the point);
  // cleared rows keep everything and simply stop being open.
  if (reseen.length > 0) {
    await rest(base, key, `ticket_owner_findings?id=in.(${reseen.join(",")})`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ last_seen_at: now }),
    }, where("reseen"));
  }
  if (clear.length > 0) {
    await rest(base, key, `ticket_owner_findings?id=in.(${clear.join(",")})`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ cleared_at: now }),
    }, where("clear"));
  }

  return {
    decision,
    expires_at,
    fixed: plan.fixes.length,
    inserted: insert.length,
    reseen: reseen.length,
    cleared: clear.length,
  };
}

// recordNightly(...) -> the runner_cycles row the night wrote about itself. The parent cycle is
// read for its `model` and for nothing else: the nightly pass calls no model, so copying the
// parent's is the only honest answer to a NOT NULL column (`model` is non-null on all 446 rows).
// Reading it also proves the cycle id addresses a real row before a second row is written against
// it -- a nightly row attributed to a cycle that does not exist is worse than no row.
async function recordNightly(base, key, { cycleId, startedAt, line, applied }) {
  const parent = await rest(base, key, `runner_cycles?id=eq.${cycleId}&select=model`, {}, "record cycle");
  if (!Array.isArray(parent) || parent.length !== 1) {
    fail(`record cycle: parent cycle ${cycleId} not found`);
  }
  const rows = await rest(base, key, "runner_cycles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      stamp: `session ticket-owner (in cycle ${cycleId})`,
      trigger: "scheduled",
      model: parent[0].model,
      outcome: "shipped",
      item_id: null,
      notes: nightlyNotes(line, applied),
    }),
  }, "record cycle");
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) fail("record cycle: the POST returned no row");
  return row;
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
      fail(`unknown flag ${a} — this script takes --census, --board=<json>, --apply, --nightly, --cycle-id=<uuid>, --out=<json> and --json.`);
    }
  }

  const boardArg = arg(argv, "board");
  const census = arg(argv, "census");
  // --nightly IS --census --apply, plus the once-a-night precondition and the cycle row. It is
  // folded in here rather than at the source checks so that --nightly --board still lands on the
  // apply gate's `never written` refusal instead of a confusing "two different sources".
  const nightly = arg(argv, "nightly");
  if (boardArg === undefined && census === undefined && nightly === undefined) {
    fail("nothing to do: pass --census (live) or --board=<json> (fixture).");
  }
  if (boardArg !== undefined && census !== undefined) {
    fail("--census and --board are two different sources; pass one.");
  }

  // --apply is gated twice, and both gates are about attribution rather than convenience. A
  // fixture board holds ids that do not address live rows, so writing from one is never right;
  // and a write with no cycle is a change nobody can trace back to the run that made it.
  const applyArg = nightly !== undefined ? true : arg(argv, "apply");
  const cycleId = arg(argv, "cycle-id");
  if (applyArg !== undefined) {
    if (boardArg !== undefined) fail("--apply writes the live board; a --board fixture is never written.");
    if (typeof cycleId !== "string" || cycleId.length !== 36) {
      fail("--apply/--nightly needs --cycle-id=<uuid> — every write is attributed to a cycle.");
    }
  }

  let board, now, rate, base, key, startedAt = null;
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
    base = process.env.SUPABASE_URL;
    key = process.env.SUPABASE_SERVICE_KEY;
    if (!base) fail("SUPABASE_URL is not set — the live census reads the board over REST.");
    if (!key) fail("SUPABASE_SERVICE_KEY is not set — the live census reads the board over REST.");

    // THE PRECONDITION IS THE COMMAND. Step 4e fires this on every cycle of the day and lets the
    // script answer; the newest row this pass wrote is the only record of whether tonight is done.
    // It runs before readRate and before readBoard, so a second cycle on the same Chicago night
    // costs one indexed read and touches nothing at all.
    if (nightly !== undefined) {
      startedAt = new Date().toISOString();
      const prev = await rest(base, key,
        "runner_cycles?select=id,ended_at&notes=like." + encodeURIComponent(NIGHTLY_PREFIX + "%") +
        "&ended_at=not.is.null&order=ended_at.desc&limit=1");
      if (!Array.isArray(prev)) fail("the nightly precondition read came back non-array — refusing to run a second pass on an unknown night");
      if (prev[0] && sameChicagoDay(prev[0].ended_at, startedAt)) {
        process.stdout.write(`ticket-owner nightly: already run today (America/Chicago) — cycle ${prev[0].id} ended ${prev[0].ended_at}; board not read, nothing written\n`);
        process.exit(0);
      }
    }

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

  // The write pass. Everything above this line is byte-identical to a read-only night; without
  // --apply nothing below runs, so the census output never depends on whether writing was armed.
  let applied = null;
  if (applyArg !== undefined) {
    const prior = await readAll(base, key, "ticket_owner_findings",
      "ticket_owner_findings?select=id,backlog_id,check_slug&cleared_at=is.null&limit=10000", 10000);
    let plan;
    try {
      plan = planWrites(result, prior, board.items, { rate });
    } catch (e) {
      fail(e.message);
    }
    applied = await applyPlan(base, key, plan, { cycleId, now });
    out.apply = applied;

    // Last, and only after the plan landed: the run records ITSELF. Writing the cycle row before
    // the write pass would let a failed pass look like a finished night and lock the next cycle
    // out until tomorrow -- exit 2 anywhere above this line writes no cycle row at all.
    if (nightly !== undefined) {
      const row = await recordNightly(base, key, { cycleId, startedAt, line: censusLine(result), applied });
      out.nightly = { cycle: row.id, notes: row.notes };
    }
  }

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

  if (arg(argv, "json") !== undefined) {
    process.stdout.write(JSON.stringify(out) + "\n");
  } else {
    let text = renderCensus(result, now);
    if (applied) {
      // The reversal SQL is printed ready to paste, with only the reason left to fill in: a write
      // pass whose undo has to be reconstructed from documentation is not reversible in practice.
      const head = `ticket-owner apply: fixed ${applied.fixed} · findings +${applied.inserted} ~${applied.reseen} −${applied.cleared}`;
      text += applied.decision
        ? `${head} · decision ${applied.decision} — reversible until ${applied.expires_at}: select public.reverse_decision('${applied.decision}','John','<why>');\n`
        : `${head} · no decision (nothing to fix)\n`;
    }
    if (out.nightly) text += `ticket-owner nightly: cycle ${out.nightly.cycle} recorded\n`;
    process.stdout.write(text);
  }
  process.exit(0);
}

// SES-176's contract: importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
