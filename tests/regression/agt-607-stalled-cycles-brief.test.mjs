// DeepBench v7.0.975 | tests/regression/agt-607-stalled-cycles-brief.test.mjs | AGT-607 -- the
// reported permission-stalls reach the brief, in their place, without moving the facts sha.
//
// FEATURE: AGT-607 call (4). Step 0b's tripwire (`SES-103`) claims a stall atomically into
// `runner_cycles.stall_notified_at` so it is reported EXACTLY ONCE however many peers are sweeping,
// and under `JOHN-0925-NOTIFICATIONS-OFF` that report is a ROW and never a push. Measured before
// this ship: `grep -rln stall_notified_at scripts lib api src` named `scripts/cycle-heartbeat.js`
// (which writes it) and no renderer at all -- so the column was written, claimed, and displayed
// nowhere. A report no surface renders is a stall nobody is told about.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (1) THE ROWS, WITH THE OPEN ONE DISTINGUISHED. Three stalls in, three table rows out, and exactly
//     one of them `**open**`. State is the only thing on this table a reader can act on: a stall
//     that was reported and then shipped is history, one still carrying `ended_at IS NULL` is a run
//     frozen right now. A render that printed all three the same way would read as three live
//     emergencies or as none.
//
// (2) FROZEN SINCE FALLS BACK TO started_at, never to a dash. The open fixture row carries
//     `heartbeat_at` null on purpose -- a cycle that never reported a heartbeat at all is the WORST
//     case, not a missing value, and `coalesce(heartbeat_at, started_at)` is the same basis step
//     0b's detector and `stall_watchdog()` use (`SES-104`). A group that blanked that cell would
//     disagree with the detector about the one cycle that matters most.
//
// (3) ABSENT IS NOT ZERO, asserted as two sentences that must not overlap -- the same rule every
//     group in `render-standing-brief.js` keeps, and the same assertion shape
//     `ses-378e-staff-watch-brief.test.mjs` uses for Staff watch.
//
// (4) IT IS IN THE BRIEF, AND IN ITS PLACE: after `**Staff watch**`, before `**Human gates**`
//     (which stays last deliberately, SES-386), and the group survives an unread ledger inside the
//     assembled block rather than the block losing it. Asserting the helper alone would pass
//     against a helper nothing calls, which is precisely the state the COLUMN was in.
//
// (5) OUTSIDE factsSha(), asserted both directions. `AGT-281`'s rule for a group that moves on its
//     own: a stall arriving is not drift in what John has to look at twice, and hashing it would
//     report drift on every sweep until the window rolled over. So the sha over facts WITH three
//     stalls must equal the sha over the same facts without the key -- and, so that clause cannot
//     pass by hashing nothing at all, the sha must still move when a fact that IS in the payload
//     moves.
//
// (6) THE READ IS THE FILTER, read out of the source rather than restated: the group is about rows
//     somebody REPORTED, so `stall_notified_at=not.is.null` is what makes the set the right one. An
//     open cycle nobody has reported yet belongs to the tripwire, not to the brief.
//
// NO CREDENTIALS, no network, no Supabase, no model call, no writes: every assertion below is a
// pure helper driven from fixtures, plus one read-only source grep.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  renderBlock, renderStalledCycles, factsSha, asOf, cst, STALLS_READ,
} from "../../scripts/render-standing-brief.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE_REL = "scripts/render-standing-brief.js";
const FILTER = "stall_notified_at=not.is.null";

const T1 = "2026-11-07T18:20:00.000Z";
const STAMP = asOf(T1);

// Three reported stalls, deliberately uneven. The OPEN one carries `heartbeat_at` null -- the cycle
// that never reported a heartbeat at all -- so (1) and (2) are graded on the same row.
const OPEN_ID = "aaaaaaaa-1111-4111-8111-111111111111";
const STALLS = [
  {
    id: OPEN_ID, item_id: "AGT-600", started_at: "2026-11-07T15:00:00Z",
    last_step: "7 — builder: waiting on a permission prompt nobody can see",
    heartbeat_at: null, stall_notified_at: "2026-11-07T15:22:00Z", ended_at: null, outcome: null,
  },
  {
    id: "bbbbbbbb-2222-4222-8222-222222222222", item_id: "AGT-599", started_at: "2026-11-06T10:00:00Z",
    last_step: "7 — builder: regression", heartbeat_at: "2026-11-06T10:40:00Z",
    stall_notified_at: "2026-11-06T11:05:00Z", ended_at: "2026-11-06T11:30:00Z", outcome: "shipped",
  },
  {
    id: "cccccccc-3333-4333-8333-333333333333", item_id: "AGT-598", started_at: "2026-11-05T09:00:00Z",
    last_step: "4a — serving check", heartbeat_at: "2026-11-05T09:30:00Z",
    stall_notified_at: "2026-11-05T09:55:00Z", ended_at: "2026-11-05T10:10:00Z", outcome: "failed",
  },
];

// ses-378e's FACTS() shape, plus the key this ticket adds.
const ITEMS = [{ id: "i1", backlog_id: "SES-1", status: "open", design_status: null, queue: 1 }];
const FACTS = (over = {}) => ({
  items: ITEMS, settings: null, drain: null,
  decisions: { open: [], finalWeek: 0, reversedWeek: 0 },
  census: [{ judgment_class: "P1 - Improves John's Skills", ord: 1, ratified: 0, proposed: 0, rejected: 0, total: 0, newest_root_claim_ref: null, newest_root_claim: null }],
  johnModel: [{ ord: 0, scope: "overall", pattern_no: null, imperative: null, citing_decisions: 0, finalised_unreversed: 0, reversed: 0, open: 0, agreement_rate: null }],
  inventionUse: [{ window: "all", ord: 3, judge_runs: 1, judge_runs_real_visitors: 0, distinct_real_visitors: 0, first_real_visitor_at: null, last_real_visitor_at: null }],
  staff: [],
  stalls: STALLS,
  ...over,
});

const tableRows = out => [...out.matchAll(/^\| `[0-9a-f]{8}` \|/gm)];

// == (1) + (2) the rows, the open one, and the heartbeat-null fallback ===========================
function theGroupRendersEveryStallAndMarksTheOpenOne() {
  const out = renderStalledCycles(STALLS, STAMP);

  assert.strictEqual(tableRows(out).length, 3,
    `three reported stalls must render three table rows, got ${tableRows(out).length}:\n${out}`);
  assert.ok(out.includes("**3 reported stall(s)**, 1 still open."),
    `the lead must count the rows and the open ones separately -- a reader acts on the open count:\n${out}`);

  const open = [...out.matchAll(/\*\*open\*\*/g)];
  assert.strictEqual(open.length, 1,
    `exactly ONE row is open (the fixture's only row with ended_at null), got ${open.length}. A group ` +
    `that marked all three open reads as three live emergencies; one that marked none hides the real ` +
    `one.\n${out}`);
  for (const outcome of ["shipped", "failed"]) {
    assert.ok(out.includes(`| ${outcome} |`),
      `a CLOSED stall must print what it ended as (${outcome}) rather than a state of its own:\n${out}`);
  }

  // (2) the open row's `frozen since` is started_at, because its heartbeat_at is null.
  const openRow = out.split("\n").find(l => l.startsWith("| `aaaaaaaa`"));
  assert.ok(openRow, `the open stall's row must be rendered:\n${out}`);
  assert.ok(openRow.includes(cst(STALLS[0].started_at)),
    `the open row never reported a heartbeat, so \`frozen since\` must fall back to started_at ` +
    `(${cst(STALLS[0].started_at)}) -- coalesce(heartbeat_at, started_at) is the basis step 0b's ` +
    `detector and stall_watchdog() share (SES-104), and a blank here would disagree with both. got: ${openRow}`);
  assert.ok(openRow.includes("AGT-600") && openRow.includes(cst(STALLS[0].stall_notified_at)),
    `and the row must name its ticket and when the stall was reported. got: ${openRow}`);
  // CONTROL: the fallback is a real branch -- the same row WITH a heartbeat prints that instead.
  const withBeat = renderStalledCycles(
    [{ ...STALLS[0], heartbeat_at: "2026-11-07T15:10:00Z" }], STAMP);
  assert.ok(withBeat.includes(cst("2026-11-07T15:10:00Z")) && !withBeat.includes(cst(STALLS[0].started_at)),
    `CONTROL: with a heartbeat present the cell must print the HEARTBEAT, not started_at -- otherwise ` +
    `the fallback assertion above would pass on a group that only ever prints started_at:\n${withBeat}`);

  assert.ok(!out.includes("%"), `no '%' may appear anywhere in the render -- counts only, never a rate:\n${out}`);
  assert.strictEqual(STALLS_READ, 10, "the read window is the last ten reported stalls");
}

// == (3) absent is not zero ======================================================================
function absentIsNotZero() {
  const notRead = renderStalledCycles(undefined, STAMP);
  const zero = renderStalledCycles([], STAMP);

  assert.notStrictEqual(notRead, zero,
    "the control is vacuous unless the unread and measured-zero renders really differ");
  assert.ok(/was not read/i.test(notRead), `an unread ledger must SAY it was not read, got:\n${notRead}`);
  assert.ok(!/measured zero/i.test(notRead),
    `an unread ledger must NOT print the measured-zero sentence -- "the read did not happen" and ` +
    `"nobody reported a stall" are opposite facts and the brief must not blur them. got:\n${notRead}`);
  assert.strictEqual(tableRows(notRead).length, 0, `an unread ledger renders no table rows:\n${notRead}`);

  assert.ok(/no stall reported/i.test(zero) && /measured zero/i.test(zero),
    `an empty ledger must say so in the words of a measurement, got:\n${zero}`);
  assert.ok(!/was not read/i.test(zero),
    `a measured zero must not also claim the ledger went unread, got:\n${zero}`);

  for (const bad of [null, {}, "", 0]) {
    const out = renderStalledCycles(bad, STAMP);
    assert.ok(/was not read/i.test(out) && !/measured zero/i.test(out),
      `renderStalledCycles(${JSON.stringify(bad)}) must take the unread branch, got:\n${out}`);
  }
}

// == (4) it is in the brief, between the two groups it was placed between =========================
function theGroupSitsBetweenStaffWatchAndHumanGates() {
  const block = renderBlock(FACTS(), T1);
  const at = s => block.indexOf(s);

  assert.ok(at("**Staff watch**") > -1, "renderBlock() must carry the Staff watch lead");
  assert.ok(at("**Stalled cycles**") > -1,
    "renderBlock() must carry the Stalled cycles lead. A helper nothing calls is exactly the state " +
    "`runner_cycles.stall_notified_at` was in -- claimed every sweep, rendered nowhere.");
  assert.ok(at("**Human gates**") > -1, "renderBlock() must carry the Human gates lead");

  assert.ok(at("**Staff watch**") < at("**Stalled cycles**"),
    "Stalled cycles must come AFTER Staff watch (kickoff T4)");
  assert.ok(at("**Stalled cycles**") < at("**Human gates**"),
    "and BEFORE Human gates -- Human gates is the LAST group deliberately (SES-386): it is the one " +
    "that says whether anything above it is waiting on a person.");
  assert.ok(at("**Human gates**") < at("*Provenance:"), "and all of it before the provenance line");
  assert.strictEqual(tableRows(block).length, 3, "the three rows reach the assembled block, not just the helper");

  // The group survives an unread ledger inside the assembled block, rather than the block losing it.
  const unread = renderBlock(FACTS({ stalls: undefined }), T1);
  assert.ok(/\*\*Stalled cycles\*\*/.test(unread) && /was not read/i.test(unread),
    "renderBlock() must still carry the group and say the ledger was not read when stalls is absent");
  assert.ok(unread.includes(STAMP), "every generated group carries the as-of stamp");
}

// == (5) outside factsSha(), both directions =====================================================
function theStallsAreOutsideTheFactsSha() {
  const withStalls = FACTS();
  const without = FACTS();
  delete without.stalls;

  assert.strictEqual(factsSha(withStalls), factsSha(without),
    "the stalls must be OUTSIDE factsSha() (AGT-281): a stall arriving is not drift in what John has " +
    "to look at twice, and hashing it would report drift on every sweep until the window rolled over");
  assert.strictEqual(factsSha(FACTS({ stalls: [] })), factsSha(without),
    "and an empty stall ledger hashes the same as an absent one, for the same reason");

  // CONTROL: the sha is not simply blind. A fact that IS in the payload still moves it, so the
  // equality above is a statement about `stalls` rather than about factsSha() hashing nothing.
  assert.notStrictEqual(
    factsSha(FACTS({ staff: [{ agent_id: "builder", fingerprint: "f1", cycle_id: "c1" }] })),
    factsSha(withStalls),
    "CONTROL: a staff finding IS in the payload and must move the sha -- otherwise clause (5) would " +
    "pass against a factsSha() that hashes nothing at all");
}

// == (6) the read's filter, out of the source ====================================================
function theReadAsksForReportedStallsOnly() {
  const src = fs.readFileSync(path.join(ROOT, SOURCE_REL), "utf8");
  assert.ok(src.includes(FILTER),
    `${SOURCE_REL} must read the stalls with \`${FILTER}\` -- the group is about rows somebody ` +
    "REPORTED; an open cycle nobody has reported yet belongs to step 0b's tripwire, not to the brief");
  assert.ok(src.includes("stall_notified_at.desc"), "newest reported first");
  assert.ok(!src.includes("runner_cycles?select=*"),
    "columns are NAMED, never select=* (.claude/rules/supabase-column-grants.md)");
  // CONTROL: the grep can see the filter when it is absent.
  assert.ok(!src.split(FILTER).join("REMOVED").includes(FILTER),
    "CONTROL: the filter clause fired on the file's real bytes");
}

export default async function run() {
  theGroupRendersEveryStallAndMarksTheOpenOne();     // (1) + (2)
  absentIsNotZero();                                 // (3)
  theGroupSitsBetweenStaffWatchAndHumanGates();      // (4)
  theStallsAreOutsideTheFactsSha();                  // (5)
  theReadAsksForReportedStallsOnly();                // (6)

  console.log("  [AGT-607] three reported stalls render three rows with exactly one `**open**` and the " +
    "heartbeat-null row's `frozen since` falling back to started_at (SES-104's basis), an unread ledger " +
    "says so without saying \"measured zero\", renderBlock() places the group after Staff watch and " +
    "before Human gates, factsSha() is equal with and without the rows while a staff finding still " +
    `moves it, and the read asks for \`${FILTER}\` with named columns -- each clause with a control ` +
    "that flips it.");
}

selfRun(import.meta.url, run);
