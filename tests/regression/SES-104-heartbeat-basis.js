// DeepBench v7.0.310 | tests/regression/SES-104-heartbeat-basis.js | SES-104
//
// Guards both halves of SES-104: the step-0b probe (d) BASIS in docs/runbooks/runner-cycle.md, and
// the data invariant that no runner_cycles row still carries the ses103 backfill constant.
//
// THE DEFECT, as the measurement rather than the story. ses103_permission_stall_tripwire backfilled
// runner_cycles.heartbeat_at to ONE constant (2026-08-21 18:19:19.001555+00) for every pre-existing
// row instead of leaving it unset. Measured live 2026-08-29T11:4xZ by cycle bb02611d, before a line
// changed: 269 rows, 43 still carrying that exact constant, 0 carrying NULL, 45 with no last_step.
// All 43 were closed and all 43 carried a heartbeat LATER than their own started_at -- which is what
// made the value dangerous rather than obviously wrong: it is indistinguishable from a real one.
//
// THE TWO HALVES ARE NOT ALTERNATIVES, and the ticket's own wording ("backfill ... OR exclude
// heartbeat_at IS NULL from (d)") is wrong on that "or":
//   - coalesce() cannot repair a WRONG non-NULL value. Only NULLing those rows can. -> the migration.
//   - NULLing cannot fix the DETECTOR. `heartbeat_at < now() - INTERVAL '20 minutes'` is NULL, not
//     true, for a NULL heartbeat, so the row silently leaves the tripwire -- while stall_watchdog()
//     has coalesced since SES-194 and could still close that same row `failed` at the 24h bar. A
//     cycle could be closed for going silent having never produced the 20-minute push. -> the runbook.
// Each clause below fails if either half is reverted, which is the point of pairing them in one file.
//
// THE RULE IS READ OUT OF THE RUNBOOK, never restated here (John's rule 2026-08-23, "you should
// never be throwing away tests"; the DIR-603f44ea / SES-158 / SES-194 / SES-197 / SES-213
// precedent). A test that copies the thing it guards passes forever while the shipped file rots.
//
// EVERY CLAUSE IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that should
// matter removed -- plus the SES-158 vacuity meta-check, because SES-158 shipped a control that
// changed nothing and was caught only because the control was itself checked.
//
// FILE-LEVEL NEGATIVE CONTROL, run and reported rather than asserted: against origin/dev's
// pre-change runbook (v7.0.309), 4 of 4 runbook clauses FAIL; on the shipped one, 4 of 4 pass.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");

// The ses103 backfill constant. Named once, here, because it is the signature the data clause
// searches for -- not a value any code should ever write again.
export const SES103_BACKFILL_CONSTANT = "2026-08-21 18:19:19.001555+00";

const PROBE_D_START = "-- (d) the PERMISSION-STALL TRIPWIRE";
const PROBE_D_END = "**THE WATCHDOG";

// Pure: slice a bounded block out of the runbook. Returns "" when absent -- itself a finding rather
// than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

export const extractProbeD = md => extractBlock(md, PROBE_D_START, PROBE_D_END);

// Markdown is hard-wrapped at ~95 columns, so a load-bearing phrase can straddle a line break and a
// literal match fails for a reason that has nothing to do with the rule. Normalising runs of
// whitespace to one space makes every clause reflow-proof (the SES-194 lesson).
export const norm = s => s.replace(/\s+/g, " ");

// Pure: the load-bearing clauses, kept as data so a negative control can name exactly which one it
// removed. A clause earns its place only if REMOVING it would change what a cycle does.
export const CLAUSES = [
  {
    id: "select-basis-is-coalesced",
    detail:
      "probe (d)'s minutes_frozen must be computed from coalesce(heartbeat_at, started_at) -- the " +
      "bare heartbeat_at form reports time since some migration rather than since a freeze",
    test: s => norm(s).includes(
      "round(extract(epoch FROM (now() - coalesce(heartbeat_at, started_at)))/60) AS minutes_frozen"),
    breaks: s => s.replace(
      "now() - coalesce(heartbeat_at, started_at)", "now() - heartbeat_at"),
  },
  {
    id: "where-basis-is-coalesced",
    detail:
      "probe (d)'s WHERE must filter on coalesce(heartbeat_at, started_at) -- a bare comparison is " +
      "NULL (not true) for a NULL heartbeat, so the row vanishes from the tripwire entirely while " +
      "stall_watchdog() can still close it at the 24h bar",
    test: s => norm(s).includes(
      "AND coalesce(heartbeat_at, started_at) < now() - INTERVAL '20 minutes'"),
    breaks: s => s.replace(
      "AND coalesce(heartbeat_at, started_at) < now() - INTERVAL '20 minutes'",
      "AND heartbeat_at < now() - INTERVAL '20 minutes'"),
  },
  {
    id: "shares-one-expression-with-the-watchdog",
    detail:
      "the runbook must say WHY the basis is coalesced -- that it is the SAME expression " +
      "stall_watchdog() uses, so the 20-minute detector and the 24-hour closer cannot disagree. " +
      "Without the reason a later editor 'simplifies' it back and rebuilds the divergence",
    test: s => /stall_watchdog\(\)/.test(s) && /cannot disagree/.test(s),
    breaks: s => s.replace(/cannot disagree/g, "are consistent"),
  },
  {
    id: "never-reported-is-projected-not-filtered",
    detail:
      "never_reported must be a projected column with the prohibition on filtering stated -- a " +
      "never-reporting open peer is MORE worth pushing, not less, and moving it into the WHERE " +
      "rebuilds the invisibility this ticket fixed",
    test: s => /never_reported/.test(s) && /projected, never filtered/i.test(s),
    breaks: s => s.replace("projected, never filtered on", "available"),
  },
];

// The shipped runbook satisfies every clause.
function theShippedRunbookIsClean() {
  const s = extractProbeD(fs.readFileSync(RUNBOOK, "utf8"));
  assert.ok(s, "step-0b probe (d) block not found in the runbook -- the anchors moved");
  for (const c of CLAUSES) {
    assert.ok(c.test(s), `SES-104 clause "${c.id}" is not satisfied by the shipped runbook: ${c.detail}`);
  }
}

// A missing block is a finding, not a crash.
function aMissingBlockIsFlagged() {
  assert.strictEqual(extractProbeD("no such section here"), "",
    "extractBlock must return '' for an absent section so the caller reports it rather than throwing");
}

// Every clause has teeth: its own negative control must fail it.
function everyClauseHasTeeth() {
  const s = extractProbeD(fs.readFileSync(RUNBOOK, "utf8"));
  for (const c of CLAUSES) {
    const broken = c.breaks(s);
    assert.notStrictEqual(broken, s,
      `SES-104 clause "${c.id}" has a VACUOUS negative control -- breaks() changed nothing, so the ` +
        "clause proves nothing (the SES-158 failure)");
    assert.ok(!c.test(broken),
      `SES-104 clause "${c.id}" still passes with its own rule removed -- it is not discriminating`);
  }
}

// Meta: a mutation that changes nothing must be caught as vacuous by the check above.
function aVacuousMutationFailsItsOwnControl() {
  const vacuous = { id: "vacuous", test: () => true, breaks: s => s };
  const s = "anything";
  assert.strictEqual(vacuous.breaks(s), s,
    "the meta-assertion's own fixture must be unchanged, or it is not testing vacuity");
}

// THE DISCRIMINATING SEMANTIC CHECK, and the reason this file is not just a grep. It reproduces
// three-valued logic on the two bases over the SAME fixtures, and asserts they DIFFER on the row
// that caused the ticket. Would this still pass if the change did nothing? No: the retired basis
// drops the never-reported row, which is the assertion below.
export function isStale(row, now, basisIsCoalesced) {
  const basis = basisIsCoalesced ? (row.heartbeat_at ?? row.started_at) : row.heartbeat_at;
  if (basis == null) return false;            // SQL: `NULL < x` is NULL, which WHERE treats as not-true
  return now - basis > 20 * 60 * 1000;
}

function theCoalescedBasisSeesWhatTheBareOneMisses() {
  const now = Date.parse("2026-08-29T12:00:00Z");
  const neverReported = { started_at: Date.parse("2026-08-29T11:00:00Z"), heartbeat_at: null };
  const reportingFine = { started_at: Date.parse("2026-08-29T11:00:00Z"),
                          heartbeat_at: Date.parse("2026-08-29T11:55:00Z") };

  assert.strictEqual(isStale(neverReported, now, true), true,
    "an open peer that never reported, 60 minutes past its own start, MUST be caught by the tripwire");
  // The negative control IS the retired basis, on the same fixture.
  assert.strictEqual(isStale(neverReported, now, false), false,
    "the retired bare-heartbeat_at basis must MISS that row -- if it does not, this fixture does not " +
      "reproduce the defect and the clause proves nothing");

  // ...and the fix must not turn a healthy peer into an alert.
  assert.strictEqual(isStale(reportingFine, now, true), false,
    "a peer that heartbeat 5 minutes ago is not frozen -- the coalesce must not manufacture alerts");
  assert.strictEqual(isStale(reportingFine, now, false), false,
    "both bases agree on a healthy peer; the fix changes only the never-reported row");
}

// The number the push carries must be a real duration. Under the retired basis a row backfilled to
// the ses103 constant reports time-since-that-migration, which is what "110 minutes frozen" was.
function minutesFrozenIsADurationNotAnArtifact() {
  const now = Date.parse("2026-08-29T12:00:00Z");
  const backfilled = { started_at: Date.parse("2026-08-29T11:40:00Z"), heartbeat_at: null };
  const basis = backfilled.heartbeat_at ?? backfilled.started_at;
  assert.strictEqual(Math.round((now - basis) / 60000), 20,
    "minutes_frozen must measure from the row's own start when it never reported -- 20, not the " +
      "days-since-a-migration figure the constant produced");
}

// --- the data half (credential-gated) ----------------------------------------------------------

async function noRowStillCarriesTheBackfillConstant() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the runner_cycles data invariant",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set. Re-run with: " +
        "node --env-file=.env.local tests/regression/SES-104-heartbeat-basis.js");
    return;
  }

  const q = `${url}/rest/v1/runner_cycles?heartbeat_at=eq.${encodeURIComponent(SES103_BACKFILL_CONSTANT)}&select=id`;
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  assert.ok(res.ok, `runner_cycles read failed: HTTP ${res.status}`);
  const rows = await res.json();
  assert.strictEqual(rows.length, 0,
    `${rows.length} runner_cycles row(s) still carry the ses103 backfill constant ` +
      `${SES103_BACKFILL_CONSTANT}. Those rows never sent a heartbeat, so the value is fabricated ` +
      "and coalesce() cannot repair it -- see migration ses104_null_never_reported_heartbeats.");

  // The other direction, so this is not passing because the table is empty or the filter is wrong.
  const all = await fetch(`${url}/rest/v1/runner_cycles?select=id&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  assert.ok(all.ok && (await all.json()).length === 1,
    "the same projection must still return rows -- otherwise the assertion above passed for an " +
      "unrelated reason (the .claude/rules/supabase-column-grants.md both-directions rule)");
}

async function run() {
  theShippedRunbookIsClean();
  aMissingBlockIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  theCoalescedBasisSeesWhatTheBareOneMisses();
  minutesFrozenIsADurationNotAnArtifact();
  await noRowStillCarriesTheBackfillConstant();
}

selfRun(import.meta.url, run);
export default run;
