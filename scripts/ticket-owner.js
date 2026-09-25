#!/usr/bin/env node
// DeepBench v7.0.512 | scripts/ticket-owner.js | AGT-79 slice 6 -- AN UNJUDGED NIGHT NOW SAYS SO.
// One branch: nightlyNotes() ends ` · unjudged` where it used to end with nothing. Five
// `audit-board` nights ran arithmetic-only and the board could not tell, because a night that
// skipped pass two wrote a string byte-identical to slice 3's. The prefix the precondition and the
// standing brief match on is untouched; only the tail grew.
//
// DeepBench v7.0.506 | scripts/ticket-owner.js | SES-385 slice 1 -- CHECK 12, `remainder-stranded`:
// a CLOSED row whose own record still names work that was never built. Two structural halves, both
// chosen by measurement over a notes regex (39 of 159 closed rows, mostly the word "remainder" in
// sweep prose about OTHER tickets): `ticket_matrix.actual_cycles` below the row's own
// `predicted_cycles`, or an UNDECIDED `runner_items` card of kind `gated_before_build`. The second
// half is why readBoard's runner_items read dropped its `decided_at` filter and gained `kind` --
// ONE read now answers check 10's Accepts (rows WITH a decided_at) and check 12's open cards.
// Verdict `judgment` with no `fix`: the census writes neither `status` nor `design_status`, ever.
//
// DeepBench v7.0.480 | scripts/ticket-owner.js | AGT-79 slice 4 -- THE JUDGMENT PASS (--judge), the
// two-pass `exit 3` shape scripts/rank-backlog.js already carries. The census is mechanical; the
// JUDGMENT is not. A derivable fix is arithmetic the census can compute, but whether that
// arithmetic should be WRITTEN to a particular row is a reading of the row's own story, and no
// amount of column-reading answers it. So the night is two invocations with a sub-agent between:
//
//   pass one   --judge --cycle-id=<uuid>
//                -> gate on the capability row, census the live board, assemble the Ticket Owner's
//                   prompt through the EXECUTOR'S OWN assembly, write the state JSON, print the
//                   prompt, exit 3 = AWAITING THE JUDGMENT. No row is touched.
//   ...run that prompt as a `ticketowner` sub-agent on the judgment lane, save its JSON...
//   pass two   --judge --cycle-id=<uuid> --answer=<path>
//                -> ingestJudgment() merges the verdicts into the census, REFUSES the whole answer
//                   on any problem, writes the mandatory audit row FIRST, then applies the plan.
//
// FAIL CLOSED IS THE WHOLE DESIGN OF THE MERGE. A derivable finding the judge did not confirm does
// NOT get written: silence is not consent, so it degrades to a judgment finding and is filed for a
// human to read. The only way a cell moves is an explicit `apply: true`.
//
// THE GATE IS ONE ROW IN ONE TABLE, NEVER A CODE EDIT. This half shipped AHEAD of its seed
// (docs/design/agt-79-ticket-owner-seed.sql is John's to apply, .claude/rules/agent-roster-inert.md),
// exactly as audit-cluster.js did at v7.0.465. Until `capabilities` carries an `audit-board` row,
// pass one exits 2 at its gate having read no board and written nothing. When the row lands, the
// same command exits 3. No line below changes on that day.
//
// DeepBench v7.0.477 | scripts/ticket-owner.js | AGT-79 slices 1-3 -- THE TICKET OWNER'S CENSUS:
// one mechanical pass over the whole board that CLASSIFIES, (slice 2, only under --apply) the
// WRITE PASS that lands every derivable fix under a single reversible decision, and (slice 3,
// --nightly) the ONCE-PER-CHICAGO-NIGHT run that is its own precondition: it reads the newest
// cycle row it wrote, answers `already run today` on exit 0 without reading the board, and
// otherwise records itself as one scheduled cycle row whose notes ARE the night's report.
//
// WHAT THIS FILE IS. The Ticket Owner owns a ticket's ROW after it is filed -- its quote, its
// actual, its status and its close-out. Twelve date-fenced checks read the board once and sort
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
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
// IMPORTED, NEVER RESTATED -- rank-backlog.js's item (1). `assemblePrompt` is the function
// api/capabilities/execute.js calls and `renderAssembly` is how scripts/agent-prompt.js prints it;
// a prompt built by hand here would be a second copy of the executor's assembly, drifting from the
// day it was written. `validateAgentVerdict` reads whatever schema it is handed, and `tokensFrom`
// keeps NULL-is-not-zero (SES-147) in one place. All four load credential-free.
import { assemblePrompt } from "../api/prompt/db-assembly.js";
import { renderAssembly } from "./agent-prompt.js";
import { validateAgentVerdict } from "./verifier.js";
import { tokensFrom } from "./rank-backlog.js";
// SES-385 slice 3: check 12 reads the close-out's OWN decision function rather than a second copy
// of its rules. settle-ship.js guards its CLI at :293, so importing it runs nothing and needs no
// credentials -- the same import-safety contract as the four above.
import { decideStatus } from "./settle-ship.js";

// --- constants (exported; the regression test asserts each one) --------------------------------

// The birth date of each column the census reads. Measured from the migration that added it; a row
// whose own date is older than its check's fence is counted, never flagged.
export const FENCES = Object.freeze({
  size_stamp: "2026-08-28T21:34:27Z",
  predicted_cycles: "2026-09-01T15:56:03Z",
  cost_pct_snapshot: "2026-09-01T16:41:41Z",
  runner_verdicts: "2026-08-25T03:50:04Z",
});

// AGT-86 slice 4: the unrevalidated-row fence, exported so scripts/audit-board.js's stale check reads
// the SAME 30 days classifyBoard counts with -- one number, two readers.
export const UNREVALIDATED_DAYS = 30;

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
  // SES-385: the twelfth and last. A shipped slice that stops advertising a design it already built
  // is the fix; this is the check that finds the rows where it did not happen.
  "remainder-stranded",
]);

// The nightly run's signature in runner_cycles.notes. It is a PREFIX and not a column because the
// precondition read is `notes=like.<prefix>%` -- one indexable question ("has this agent run?")
// that needs no schema change, and the same string the standing brief strips before printing.
export const NIGHTLY_PREFIX = "SCHEDULED-AGENT: audit-board";

// The judgment pass's own vocabulary (slice 4). Named rather than literal so the gate, the
// assembly, the audit row and the decision text all quote ONE string -- a slug that drifted between
// the gate and agent-log.js would pass the gate and then be refused the mandatory row.
export const JUDGE_CAPABILITY = "audit-board";
export const JUDGE_AGENT = "ticketowner";
export const JUDGE_INTENT = "to-audit-intent";
export const JUDGE_TENANT = "global";

// Three states, and collapsing any two throws away a distinction -- rank-backlog.js's own table.
// 3 is NOT 2: pass one ran its half correctly, wrote the state and printed the prompt; there is
// simply no judgment yet. A caller that read 3 as a failure would retry a pass that succeeded.
export const EXIT_AWAITING_ANSWER = 3;

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
  const D30 = nowMs - UNREVALIDATED_DAYS * DAY;
  const nowStamp = new Date(nowMs).toISOString();

  const cycles = new Map();
  for (const r of board.matrix ?? []) cycles.set(r.backlog_id, r.actual_cycles ?? 0);
  const verdicts = new Set((board.verdicts ?? []).map(r => r.backlog_id));
  // ONE READ, TWO SETS (SES-385). runner_items is now read WITHOUT the `decided_at` filter, so the
  // same rows answer both questions: a card carrying a decided_at IS the Accept check 10 reads, and
  // an UNDECIDED card of kind `gated_before_build` is work still waiting to be built, which check 12
  // reads. The decided_at test is what keeps the widened read from turning an open card into an
  // Accept -- dropping the filter without it would silently answer check 10 "accepted" on every
  // undecided card on the board.
  const accepts = new Set((board.accepts ?? []).filter(r => r.decided_at != null).map(r => r.backlog_id));
  const gatedOpen = new Set((board.accepts ?? [])
    .filter(r => r.decided_at == null && r.kind === "gated_before_build")
    .map(r => r.backlog_id));
  const liveCycles = new Set((board.openCycles ?? []).map(r => r.id));
  // SES-385 slice 3: each closed row's own kickoff text, read for us by readBoard() (classifyBoard
  // is pure and never opens a file). A row with no entry, or whose link would not open, is simply
  // absent from the map and reads as "" -- which decideStatus() answers `delivered`, so a dead link
  // costs a finding rather than the census.
  const kickoffText = new Map((board.kickoffs ?? [])
    .filter(k => typeof k.text === "string")
    .map(k => [k.backlog_id, k.text]));
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

    // 12 remainder-stranded (SES-385 slice 3) -- a CLOSED row whose OWN record still names work
    // that was never built, decided by the SAME function the close-out settles with:
    // decideStatus() over the row's own kickoff text plus its undecided `gated_before_build` card.
    //
    // THE CYCLES PROXY IS GONE, deleted on a measurement rather than an argument. Slice 1's
    // `actual_cycles < predicted_cycles` trigger filed 88 findings on the live board; running
    // slice 2's decideStatus() over each flagged row's own kickoff answered only 5 of them real
    // (`AGT-79`, `LOG-149`, `SES-364`, `SES-383`, `SES-396`). Of the other 83: 55 carry no
    // `kickoff_link` at all, 27 link a kickoff that declares itself finished, and 1 (`SES-184`)
    // links a file that is not in the tree. 86 of the 88 fired on the cycles proxy ALONE, 2 on both
    // halves, and NONE on the card alone -- so the proxy was 94% of the noise and none of the
    // signal. Coming in under a quote is estimate variance, not unbuilt work, and check 11
    // (`cycles-over-quote`) already owns the other direction of that same comparison.
    //
    // JUDGMENT and never derivable, with NO `fix`: re-opening a stranded row is a write under one
    // reversible decision (slice 4's), and the census writes neither `status` nor `design_status`.
    if (closed) {
      const d = decideStatus({
        kickoffText: kickoffText.get(row.backlog_id) ?? "",
        ticketId: row.backlog_id,
        gatedOpen: gatedOpen.has(row.backlog_id),
      });
      if (d.status === "partial") {
        file(row, "remainder-stranded", "judgment",
          `a ${status} ticket whose own record still names unbuilt work: ${d.reasons.join("; ")}` +
          ` (design_status ${row.design_status ?? "null"}).`);
      }
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
export function chicagoDay(iso) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) throw new Error(`chicagoDay: not a parseable instant (got ${iso})`);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

export function sameChicagoDay(aIso, bIso) {
  return chicagoDay(aIso) === chicagoDay(bIso);
}

// nightlyNotes(line, applied) -> the cycle row's notes: the prefix the precondition reads, the
// census line verbatim, the four write counts, and the decision handle with its reversal window.
// This string is the night's whole report -- the standing brief prints it rather than recomputing
// it, so what John reads is what the run actually said about itself.
// `judged` is optional and the LAST thing the string says, but its absence is now SPOKEN rather
// than silent (slice 6): an unjudged night ends ` · unjudged` where slice 3-5 ended with nothing.
// A night that ran arithmetic-only used to be byte-identical to a night from before the judgment
// pass existed, so five unjudged nights passed unnoticed on the board. The precondition and the
// standing brief both read this string by its PREFIX (`NIGHTLY_PREFIX`), never by its ending, so
// lengthening the tail changes what John reads and nothing that matches it.
export function nightlyNotes(line, applied, judged) {
  const a = applied ?? {};
  const head = `${NIGHTLY_PREFIX} — ${line} · fixed ${a.fixed} · findings +${a.inserted} ~${a.reseen} −${a.cleared}`;
  const tail = a.decision
    ? ` · decision ${a.decision} — reversible until ${a.expires_at}`
    : " · no decision (nothing to fix)";
  return head + tail + (judged
    ? ` · judged ${judged.confirmed}/${judged.refused}/${judged.unconfirmed} on ${judged.model}`
    : " · unjudged");
}

// --- the judgment pass, pure (slice 4) ---------------------------------------------------------

// Where pass one leaves the state for pass two, DERIVED from the cycle id so the two invocations
// find the same file without a path being carried between them. The sanitiser is not decoration: a
// cycle id is interpolated into a filesystem path, and the only safe assumption about a string that
// reached here from argv is that it is a string.
export function statePathFor(dir, cycleId) {
  const keyPart = String(cycleId).replace(/[^A-Za-z0-9_-]/g, "");
  return path.join(dir, `ticket-owner-judge-${keyPart}.json`);
}

// judgeTask(out, prior, now) -> the task_context the Ticket Owner's prompt carries. Three members
// and no more: the census exactly as the CLI would print it, the Chicago night it is about, and the
// open ledger REPROJECTED -- `check`, never `check_slug`, and no `id`. The primary keys are the
// script's business; handing a model a row id invites an answer that names one.
export function judgeTask(out, prior, now) {
  return {
    census: out,
    window: chicagoDay(now),
    prior: (prior ?? []).map(p => ({
      backlog_id: p.backlog_id,
      check: p.check ?? p.check_slug,
      first_seen_at: p.first_seen_at,
    })),
  };
}

// ingestJudgment(answer, state) -> {errors, result, judged}
//
// THE ANSWER IS VALIDATED BY CODE AND NEVER TRUSTED. Pure: no fetch, no disk, no clock, and `state`
// is never mutated -- the caller keeps what the sub-agent really said.
//
// ALL-OR-NOTHING. `errors` is a list of plain-English refusals; when it is non-empty, `result` and
// `judged` are null and the caller writes NOTHING. Every failing check appends its own line rather
// than short-circuiting, because an operator reading a refusal wants the whole list, not the first
// item of an unknown number. The one exception is the schema check: a shape that did not validate
// is not trustworthy enough to inspect further, so that family stops.
//
// AN ANSWER MUST BE ABOUT THIS BOARD -- rank-backlog.js's item (3), the same defect in a new place.
// A judgment file left in a scratch directory from last night satisfies the schema perfectly and
// would confirm fixes against rows tonight's census never looked at, so every (backlog_id, check)
// pair is checked against THIS state's census and refused if it is not there.
//
// FAIL CLOSED ON SILENCE. A derivable finding with no fix entry is NOT written. It degrades to a
// judgment finding whose detail says so, and the count lands in `judged.unconfirmed`. A judge that
// answered about half the board must not have the other half applied on its behalf.
export function ingestJudgment(answer, state) {
  const errors = [];
  const refused = () => ({ errors, result: null, judged: null });
  const pairKey = (id, check) => `${id} ${check}`;

  // (1) The Intent's OWN stored schema, with no truncation: this answer drives writes, so a lens
  // that overflowed is a refusal rather than something to quietly cut.
  const shape = validateAgentVerdict(state?.schema, answer);
  if (!shape.ok) {
    errors.push(...shape.errors);
    return refused();
  }

  // (2) The window. Same night, or nothing.
  if (answer.window !== state.window) {
    errors.push(`the answer is about window "${answer.window}", this state is "${state.window}" -- run pass one again`);
  }

  const censusFindings = state?.census?.findings ?? [];
  const derivablePairs = new Set(censusFindings.filter(f => f.verdict === "derivable").map(f => pairKey(f.backlog_id, f.check)));
  const judgmentPairs = new Set(censusFindings.filter(f => f.verdict === "judgment").map(f => pairKey(f.backlog_id, f.check)));

  // (3) The fix verdicts. `validateAgentVerdict` does not descend into array ITEM properties, so
  // every item shape is checked here -- the same re-check rank-backlog and audit-cluster both carry.
  const fixByPair = new Map();
  const refusedPairs = new Set();
  const seenFix = new Set();
  const answerFixes = Array.isArray(answer.fixes) ? answer.fixes : [];
  answerFixes.forEach((f, i) => {
    if (!f || typeof f !== "object" || Array.isArray(f)) { errors.push(`fixes[${i}] is not an object`); return; }
    if (typeof f.backlog_id !== "string" || typeof f.check !== "string") { errors.push(`fixes[${i}] must carry backlog_id and check`); return; }
    if (typeof f.apply !== "boolean") errors.push(`fixes[${i}] apply must be a boolean`);
    if (typeof f.reason !== "string" || f.reason.length > 200) errors.push(`fixes[${i}] reason must be a string of at most 200 chars`);
    const k = pairKey(f.backlog_id, f.check);
    if (!derivablePairs.has(k)) errors.push(`fixes names ${f.backlog_id} ${f.check}, which is not a derivable finding of this census`);
    if (seenFix.has(k)) errors.push(`fixes names ${f.backlog_id} ${f.check} twice`);
    seenFix.add(k);
    if (!fixByPair.has(k)) fixByPair.set(k, f);
    if (f.apply === false) refusedPairs.add(k);
  });

  // (4) The sentences. A sentence may answer a judgment finding of this census, or a fix THIS
  // answer refused (which is about to become one) -- and nothing else.
  const detailByPair = new Map();
  const seenFinding = new Set();
  const answerFindings = Array.isArray(answer.findings) ? answer.findings : [];
  answerFindings.forEach((f, i) => {
    if (!f || typeof f !== "object" || Array.isArray(f)) { errors.push(`findings[${i}] is not an object`); return; }
    if (typeof f.backlog_id !== "string" || typeof f.check !== "string") { errors.push(`findings[${i}] must carry backlog_id and check`); return; }
    if (typeof f.detail !== "string" || f.detail.length === 0 || f.detail.length > 300) {
      errors.push(`findings[${i}] detail must be a non-empty string of at most 300 chars`);
    }
    const k = pairKey(f.backlog_id, f.check);
    if (!judgmentPairs.has(k) && !refusedPairs.has(k)) {
      errors.push(`findings names ${f.backlog_id} ${f.check}, which is neither a judgment finding of this census nor a fix this answer refused`);
    }
    if (seenFinding.has(k)) errors.push(`findings names ${f.backlog_id} ${f.check} twice`);
    seenFinding.add(k);
    if (!detailByPair.has(k)) detailByPair.set(k, f.detail);
  });

  if (errors.length) return refused();

  // THE MERGE, over the census in its existing order and never re-sorted: renderCensus, planWrites
  // and the ledger all read this list, and a reordering would read as movement on the board.
  let confirmed = 0;
  let refusedCount = 0;
  let unconfirmed = 0;
  const findings = censusFindings.map(f => {
    const k = pairKey(f.backlog_id, f.check);
    const merged = { ...f };
    if (f.verdict === "derivable") {
      const fix = fixByPair.get(k);
      if (fix && fix.apply === true) { confirmed++; return merged; }
      merged.verdict = "judgment";
      delete merged.fix;
      if (fix) {
        refusedCount++;
        merged.detail = `judge refused: ${fix.reason}`;
      } else {
        unconfirmed++;
        merged.detail = `judge: not confirmed -- ${f.detail}`;
      }
      return merged;
    }
    const detail = detailByPair.get(k);
    if (detail !== undefined) merged.detail = detail;
    return merged;
  });

  const derivable = findings.filter(f => f.verdict === "derivable").length;
  return {
    errors,
    // The shape classifyBoard() returns, recounted -- so planWrites() runs over it unchanged.
    result: {
      findings,
      backlog: state.census.backlog,
      counts: { rows: state.census.counts.rows, findings: findings.length, derivable, judgment: findings.length - derivable },
    },
    judged: {
      confirmed,
      refused: refusedCount,
      unconfirmed,
      sentences: answerFindings.length,
      model: state.model,
      report: answer.report,
    },
  };
}

// --- the CLI half (credentials, disk, exit codes) ----------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWED_FLAGS = new Set([
  "census", "board", "out", "json", "apply", "cycle-id", "nightly",
  "judge", "answer", "state-file", "dry-run",
]);

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
  // SES-385: the `decided_at=not.is.null` filter came OFF and `kind` went on, so this ONE read
  // serves check 10's Accepts (the rows with a decided_at) and check 12's undecided
  // `gated_before_build` cards. classifyBoard splits them; a second read would be a second board.
  const accepts = await readAll(base, key, "runner_items",
    "runner_items?select=backlog_id,kind,decided_at&backlog_id=not.is.null&limit=10000", 10000);
  const decisions = await readAll(base, key, "runner_decisions",
    "runner_decisions?select=backlog_id,decided_at&backlog_id=not.is.null&limit=10000", 10000);
  const openCycles = await readAll(base, key, "runner_cycles",
    "runner_cycles?select=id&ended_at=is.null&limit=1000", 1000);
  // SES-385 slice 3: check 12 asks the closed ticket's OWN kickoff whether it names a remainder,
  // and classifyBoard() is pure by construction -- it may not open a file. So the text is read
  // HERE, beside the six REST reads, and arrives on the board like every other input. Only closed
  // rows with a link are read (73 files today); an unreadable or absent path lands `text: null`
  // rather than throwing, because SES-184 and SES-185 link kickoffs that are not in the tree and a
  // census that crashes on one dead link censuses nothing.
  const kickoffs = [];
  for (const row of items) {
    if (!CLOSED.has(row.status) || row.kickoff_link == null) continue;
    let text = null;
    try { text = fs.readFileSync(path.resolve(ROOT, row.kickoff_link), "utf8"); } catch { text = null; }
    kickoffs.push({ backlog_id: row.backlog_id, kickoff_link: row.kickoff_link, text });
  }
  return { items, matrix, verdicts, accepts, decisions, openCycles, kickoffs };
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
export async function applyPlan(base, key, plan, { cycleId, sessionName, now, judged } = {}) {
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
    let p_reasoning = `Nightly census ${now}: ${counts.rows} rows read, ${counts.findings} findings (${counts.derivable} derivable, ${counts.judgment} judgment). Each fix is arithmetic (cost_pct_snapshot = round(actual_cycles × runner_pct_per_cycle(), 2) at rate ${rate}), the claim column's own rule (a closed row, or 24 h past with no live cycle), or a one-to-one type spelling (feature → Feature, Bug Fixes → Bug). Whole rows imaged under this decision; no status, quote or design_status written; judgment findings filed in ticket_owner_findings, not here. pattern:0`;
    // A JUDGED NIGHT SAYS SO ON ITS OWN DECISION ROW (slice 4). John reads reverse_decision()
    // candidates from `reasoning`; "a capability confirmed these three and refused that one" is the
    // difference between a mechanical write and a ruled one, and it belongs where he is looking.
    // Inserted before the ` pattern:0` suffix, which the AI-audit scan reads as the line's end.
    if (judged) {
      p_reasoning = p_reasoning.replace(" pattern:0",
        ` Judged by capability ${JUDGE_CAPABILITY} on ${judged.model}: ${judged.confirmed} fix(es) confirmed,` +
        ` ${judged.refused} refused, ${judged.unconfirmed} unconfirmed. pattern:0`);
    }

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
async function recordNightly(base, key, { cycleId, startedAt, line, applied, judged }) {
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
      notes: nightlyNotes(line, applied, judged),
    }),
  }, "record cycle");
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) fail("record cycle: the POST returned no row");
  return row;
}

// --- the judgment pass, CLI (slice 4) ----------------------------------------------------------

function creds() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base) fail("SUPABASE_URL is not set — the live census reads the board over REST.");
  if (!key) fail("SUPABASE_SERVICE_KEY is not set — the live census reads the board over REST.");
  return { base, key };
}

// PASS ONE. Its whole product is a state file, a prompt on stdout and exit 3. Every step below runs
// in this order and no other, and the ORDER is the point: the cheapest refusal comes first, so a
// run that cannot be judged costs one indexed read instead of a whole board.
async function judgePassOne({ nightly, cycleId, stateFile }) {
  const { base, key } = creds();
  const startedAt = new Date().toISOString();

  // The nightly precondition, unchanged: step 4e fires this on every cycle of the day and lets the
  // script answer. A night already judged must not be re-read, let alone re-prompted.
  if (nightly !== undefined) {
    const prev = await rest(base, key,
      "runner_cycles?select=id,ended_at&notes=like." + encodeURIComponent(NIGHTLY_PREFIX + "%") +
      "&ended_at=not.is.null&order=ended_at.desc&limit=1");
    if (!Array.isArray(prev)) fail("the nightly precondition read came back non-array — refusing to run a second pass on an unknown night");
    if (prev[0] && sameChicagoDay(prev[0].ended_at, startedAt)) {
      process.stdout.write(`ticket-owner nightly: already run today (America/Chicago) — cycle ${prev[0].id} ended ${prev[0].ended_at}; board not read, nothing written\n`);
      process.exit(0);
    }
  }

  // THE GATE, and it is deliberately BEFORE the board read. This half of AGT-79 shipped ahead of
  // its seed, so the honest behaviour without the seed is not a crash mid-assembly -- it is a
  // refusal that names the one file John has to apply, having touched nothing. One row in one table
  // is the switch; no line of this file changes on the day it lands.
  const cap = await rest(base, key, `capabilities?slug=eq.${JUDGE_CAPABILITY}&tenant_id=eq.${JUDGE_TENANT}&select=slug&limit=1`);
  if (!Array.isArray(cap)) fail("the capability gate read came back non-array");
  if (cap.length === 0) {
    fail(`--judge: capabilities has no ${JUDGE_CAPABILITY} row — apply docs/design/agt-79-ticket-owner-seed.sql (John's word, .claude/rules/agent-roster-inert.md); board not read, nothing written`);
  }

  // Byte-identical to the census path: the judged night must be judging the same numbers an
  // unjudged one would have reported.
  const now = new Date().toISOString();
  const rate = await readRate(base, key);
  const board = await readBoard(base, key);
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
  const prior = await readAll(base, key, "ticket_owner_findings",
    "ticket_owner_findings?select=id,backlog_id,check_slug,first_seen_at&cleared_at=is.null&limit=10000", 10000);

  // THE EXECUTOR'S OWN ASSEMBLY. `intent_slug` is passed explicitly and never omitted: db-assembly
  // filters out EVERY Intent-type Skill when it is null (AA-188), so the prompt would assemble,
  // render, and carry no schema at all -- and an answer that cannot be validated must not be asked
  // for. An intent that did not load is a stop, never a warning (AA-108).
  let assembly;
  try {
    assembly = await assemblePrompt({
      capability_slug: JUDGE_CAPABILITY,
      agent_id: JUDGE_AGENT,
      tenant_id: JUDGE_TENANT,
      intent_slug: JUDGE_INTENT,
      task_context: judgeTask(out, prior, now),
    });
  } catch (e) {
    fail(`the ${JUDGE_CAPABILITY} assembly failed: ${e.message}`);
  }
  if (!assembly.agent_card) fail(`no agents row for ${JUDGE_AGENT} — the seed is half applied`);

  const { system_prompt, omitted } = renderAssembly(assembly);
  if (omitted && omitted.length) {
    process.stderr.write(`ticket-owner judge: sections omitted (empty at assembly time): ${omitted.join(", ")}\n`);
  }
  if (!system_prompt) fail(`${JUDGE_CAPABILITY} assembled zero renderable sections`);
  const schema = assembly.format_contract?.schema;
  if (!schema) fail(`the assembly carried no format contract for ${JUDGE_INTENT} — refusing to print a prompt whose answer could not be validated`);
  const model = assembly.llm?.model;
  if (!model) fail("the assembly names no model");

  // The state IS the contract between the two invocations: pass two validates against this schema,
  // merges into this census, and plans against this prior and these ids. Nothing is re-read.
  const state = {
    version: 1,
    started_at: startedAt,
    cycle_id: cycleId,
    nightly: nightly !== undefined,
    capability: JUDGE_CAPABILITY,
    intent: JUDGE_INTENT,
    agent: JUDGE_AGENT,
    model,
    schema,
    now,
    rate,
    window: chicagoDay(now),
    census: out,
    prior,
    items: (board.items ?? []).map(i => ({ id: i.id, backlog_id: i.backlog_id })),
  };
  try {
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    fail(`could not write the judge state to ${stateFile}: ${e.message}`);
  }

  // stdout is the prompt and NOTHING else, so the caller can pipe it straight to a sub-agent.
  process.stdout.write(system_prompt.endsWith("\n") ? system_prompt : `${system_prompt}\n`);
  process.stderr.write(`ticket-owner judge: pass one complete — ${result.counts.rows} rows · ${result.counts.derivable} derivable · ${result.counts.judgment} judgment · model ${model}\n`);
  process.stderr.write(`ticket-owner judge: state written to ${stateFile}\n`);
  process.stderr.write(`ticket-owner judge: run the prompt above as a ${JUDGE_AGENT} sub-agent on the judgment lane, save its JSON, then re-run with --answer=<that file>\n`);
  process.exit(EXIT_AWAITING_ANSWER);
}

// PASS TWO. Refuse, or write -- there is no third outcome and nothing partial.
async function judgePassTwo({ argv, nightly, cycleId, answerArg, stateFile, dryRun }) {
  if (!fs.existsSync(stateFile)) fail(`no state file at ${stateFile} — run pass one first (without --answer)`);
  let state;
  try {
    state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch (e) {
    fail(`state file ${stateFile} is not readable JSON: ${e.message}`);
  }
  const answerPath = path.resolve(process.cwd(), answerArg);
  let answer;
  try {
    answer = JSON.parse(fs.readFileSync(answerPath, "utf8"));
  } catch (e) {
    fail(`--answer file ${answerArg} is not readable JSON: ${e.message}`);
  }

  const { errors, result, judged } = ingestJudgment(answer, state);
  if (errors.length) {
    // REFUSED, not written -- and every problem is listed, because an operator fixing one of five
    // and re-running to find the next is how a night gets spent on a file.
    process.stderr.write(`ticket-owner: the judgment was REFUSED and nothing was written:\n${errors.map(e => `  - ${e}`).join("\n")}\n`);
    process.exit(2);
  }

  let plan;
  try {
    plan = planWrites(result, state.prior, state.items, { rate: state.rate });
  } catch (e) {
    fail(e.message);
  }

  // --dry-run is the whole two-pass merge with the writer removed: no credentials are read and no
  // request leaves the process, which is what lets the regression suite drive it in a clean checkout.
  if (dryRun !== undefined) {
    process.stdout.write(JSON.stringify({
      ok: true,
      dry_run: true,
      confirmed: judged.confirmed,
      refused: judged.refused,
      unconfirmed: judged.unconfirmed,
      fixes: plan.fixes.length,
      insert: plan.ledger.insert.length,
      reseen: plan.ledger.reseen.length,
      clear: plan.ledger.clear.length,
    }) + "\n");
    process.exit(0);
  }

  const { base, key } = creds();
  if (cycleId !== state.cycle_id) {
    fail(`--cycle-id ${cycleId} is not the state's ${state.cycle_id} — a judgment is about one night`);
  }

  // THE LOG ROW FIRST, and a non-zero exit stops the run before a single cell moves (§19k: log
  // before any write). The row is mandatory, not a courtesy -- no executor call happens on this
  // path, so without it the sub-agent's turn is invisible to the AI Audit. Ordering it first is
  // what makes "the audit row failed" a refusal rather than an apology after the board changed.
  const t = tokensFrom(answer);
  const logged = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "agent-log.js"),
    `--agent=${JUDGE_AGENT}`, `--capability=${JUDGE_CAPABILITY}`, `--model=${state.model}`,
    `--ai-type=${JUDGE_CAPABILITY}`, `--feature=${JUDGE_CAPABILITY}:${JUDGE_INTENT}:depth0`,
    `--input-tokens=${t.input ?? 0}`, `--output-tokens=${t.output ?? 0}`,
    `--cycle=${cycleId}`, "--json",
  ], { encoding: "utf8" });
  if (logged.status !== 0) {
    fail(`agent-log.js refused the row (exit ${logged.status}): ${String(logged.stderr ?? "").slice(0, 400)} — nothing written`);
  }
  let loggedId = null;
  try {
    loggedId = JSON.parse(logged.stdout).id;
  } catch {
    loggedId = null;
  }

  const applied = await applyPlan(base, key, plan, { cycleId, now: state.now, judged });

  const out = {
    measured_at: state.now,
    rate: state.rate,
    fences: FENCES,
    counts: result.counts,
    backlog: result.backlog,
    findings: result.findings,
    apply: applied,
  };
  if (nightly !== undefined) {
    const row = await recordNightly(base, key, {
      cycleId, startedAt: state.started_at, line: censusLine(result), applied, judged,
    });
    out.nightly = { cycle: row.id, notes: row.notes };
  }
  out.judge = {
    confirmed: judged.confirmed,
    refused: judged.refused,
    unconfirmed: judged.unconfirmed,
    sentences: judged.sentences,
    model: judged.model,
    logged_id: loggedId,
    report: judged.report,
  };

  writeOutFile(argv, out);
  if (arg(argv, "json") !== undefined) {
    process.stdout.write(JSON.stringify(out) + "\n");
  } else {
    let text = renderCensus(result, state.now);
    text += applyLine(applied);
    text += `ticket-owner judge: confirmed ${judged.confirmed} · refused ${judged.refused} · unconfirmed ${judged.unconfirmed}` +
      ` · sentences ${judged.sentences} · model ${judged.model} · log ${loggedId}` +
      (t.total === null ? " · tokens unreported" : "") + "\n";
    // The report VERBATIM. It is the night's own words about the board, and paraphrasing it here
    // would make what John reads different from what the capability actually said.
    text += judged.report.endsWith("\n") ? judged.report : `${judged.report}\n`;
    if (out.nightly) text += `ticket-owner nightly: cycle ${out.nightly.cycle} recorded\n`;
    process.stdout.write(text);
  }
  process.exit(0);
}

// One apply line, two callers (the census path and the judgment path) -- the reversal SQL is
// printed ready to paste, because a write pass whose undo has to be reconstructed from
// documentation is not reversible in practice.
function applyLine(applied) {
  if (!applied) return "";
  const head = `ticket-owner apply: fixed ${applied.fixed} · findings +${applied.inserted} ~${applied.reseen} −${applied.cleared}`;
  return applied.decision
    ? `${head} · decision ${applied.decision} — reversible until ${applied.expires_at}: select public.reverse_decision('${applied.decision}','John','<why>');\n`
    : `${head} · no decision (nothing to fix)\n`;
}

function writeOutFile(argv, out) {
  const outPath = arg(argv, "out");
  if (outPath === undefined) return;
  if (outPath === true) fail("--out needs a path: --out=<json>.");
  const dest = path.resolve(process.cwd(), String(outPath));
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n", "utf8");
  } catch (e) {
    fail(`could not write --out=${outPath}: ${e.message}`);
  }
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
      fail(`unknown flag ${a} — this script takes --census, --board=<json>, --apply, --nightly, --cycle-id=<uuid>, --judge, --answer=<json>, --state-file=<path>, --dry-run, --out=<json> and --json.`);
    }
  }

  const boardArg = arg(argv, "board");
  const census = arg(argv, "census");
  // The judgment pass's four flags. Three of them are meaningless on their own, and a flag that is
  // silently ignored is how a run does something other than what its command line says.
  const judge = arg(argv, "judge");
  const answerArg = arg(argv, "answer");
  const stateFileArg = arg(argv, "state-file");
  const dryRun = arg(argv, "dry-run");
  if (judge === undefined && (answerArg !== undefined || stateFileArg !== undefined || dryRun !== undefined)) {
    fail("--answer/--state-file/--dry-run belong to --judge.");
  }
  if (dryRun !== undefined && answerArg === undefined) {
    fail("--dry-run belongs to --judge --answer=<json> — pass one always writes its state and prints its prompt.");
  }
  // --nightly IS --census --apply, plus the once-a-night precondition and the cycle row. It is
  // folded in here rather than at the source checks so that --nightly --board still lands on the
  // apply gate's `never written` refusal instead of a confusing "two different sources".
  const nightly = arg(argv, "nightly");
  if (boardArg === undefined && census === undefined && nightly === undefined && judge === undefined) {
    fail("nothing to do: pass --census (live) or --board=<json> (fixture).");
  }
  if (boardArg !== undefined && census !== undefined) {
    fail("--census and --board are two different sources; pass one.");
  }

  // --apply is gated twice, and both gates are about attribution rather than convenience. A
  // fixture board holds ids that do not address live rows, so writing from one is never right;
  // and a write with no cycle is a change nobody can trace back to the run that made it.
  // --judge writes exactly as --apply does, so it reads the SAME two gates rather than a second
  // copy of them. The one carve-out is `--answer --dry-run`: it reads two files, talks to nothing,
  // and writes nothing at all, so requiring a cycle id there would gate a pure computation.
  const judgeIsDry = judge !== undefined && answerArg !== undefined && dryRun !== undefined;
  const applyArg = (nightly !== undefined || judge !== undefined) ? true : arg(argv, "apply");
  const cycleId = arg(argv, "cycle-id");
  if (applyArg !== undefined && !judgeIsDry) {
    if (boardArg !== undefined) fail("--apply writes the live board; a --board fixture is never written.");
    if (typeof cycleId !== "string" || cycleId.length !== 36) {
      fail("--apply/--nightly needs --cycle-id=<uuid> — every write is attributed to a cycle.");
    }
  }

  if (judge !== undefined) {
    const stateFile = (stateFileArg !== undefined && stateFileArg !== true)
      ? path.resolve(process.cwd(), String(stateFileArg))
      : statePathFor(os.tmpdir(), cycleId);
    if (answerArg !== undefined) {
      if (answerArg === true) fail("--answer needs a path: --answer=<json>.");
      return judgePassTwo({ argv, nightly, cycleId, answerArg: String(answerArg), stateFile, dryRun });
    }
    return judgePassOne({ nightly, cycleId, stateFile });
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

  writeOutFile(argv, out);

  if (arg(argv, "json") !== undefined) {
    process.stdout.write(JSON.stringify(out) + "\n");
  } else {
    let text = renderCensus(result, now);
    text += applyLine(applied);
    if (out.nightly) text += `ticket-owner nightly: cycle ${out.nightly.cycle} recorded\n`;
    process.stdout.write(text);
  }
  process.exit(0);
}

// SES-176's contract: importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
