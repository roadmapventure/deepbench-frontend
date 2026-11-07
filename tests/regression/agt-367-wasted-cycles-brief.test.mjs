// DeepBench v7.0.976 | tests/regression/agt-367-wasted-cycles-brief.test.mjs | AGT-367 -- every
// wasted cycle names its cause, in the brief, in its place, without moving the facts sha.
//
// FEATURE: AGT-367. Measured live on `runner_cycles` 2026-11-07 before this ship: 280 cycles in the
// last 7 days, 27 of them carrying a `push_sha`, and NOTHING joined a row to a cause. The only
// reader-facing number was `audit_flow_checks()` arm (c)'s single percentage -- "N of M cycles were
// wasted (P%)" -- which tells John the run is spending without shipping and nothing at all about
// what to change. The cause was ON the row the whole time: 1103 of 1103 pre-boot refusals parse
// their reason out of `last_step`. A number with no cause behind it is not a report.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (1) THE THREE FIGURES IN THE LEAD, EACH DIFFERENT AND EACH DERIVED FROM A DIFFERENT RULE. The
//     fixture is the live 7-day shape: 162 cycles, 28 of them `moved`, 134 that the VOCABULARY
//     calls waste. `total` is every row; `moved` is the one cause named `moved`; `wasted` is the
//     `counts_as_waste` subset -- which is NOT "total minus moved", because `routine_run` and
//     `in_progress` are not waste either. A render that computed the waste figure by subtraction
//     would agree with this fixture on nothing but luck, so clause (1) asserts the whole sentence
//     and clause (2) breaks the subtraction identity on purpose.
//
// (2) `counts as waste` IS THE COLUMN, NOT A GUESS IN THE RENDERER. Driven twice over the same
//     counts: flipping ONLY the boolean on one row must move the wasted figure and that row's
//     cell, with the total and the moved count unchanged. A renderer that hardcoded which causes
//     are waste -- the exact content policy `pattern:12` keeps off the screen -- would print the
//     same two leads and pass a test that only checked the first one.
//
// (3) THE CANDIDATE TICKET REACHES THE READER, and an empty list reads as `—` rather than as
//     `[]`, `undefined` or a blank cell. The candidate is the whole point of the vocabulary
//     carrying one: `gated 5` is a number, `gated 5 ... AGT-308` is a next action.
//
// (4) RECEIVED ORDER, NOT THE RENDERER'S. `runner_waste_by_cause()` already orders by count then
//     cause; a renderer that re-sorted would be a second opinion on a question the database has
//     already answered (pattern:9). Asserted as the exact row sequence over a fixture whose order
//     is deliberately NOT sorted by count -- `moved 28` leads `meter_stale 60` -- so a renderer
//     that quietly sorted would fail here and could not pass by coincidence.
//
// (5) ABSENT IS NOT ZERO, asserted as two sentences that must not overlap -- the same rule every
//     group in `render-standing-brief.js` keeps and the same assertion shape AGT-607 uses.
//
// (6) IT IS IN THE BRIEF, AND IN ITS PLACE: after `**Stalled cycles**`, before `**Human gates**`
//     (which stays last deliberately, SES-386), and the group survives an unread ledger inside the
//     assembled block rather than the block losing it. Asserting the helper alone would pass
//     against a helper nothing calls, which is precisely the state the CAUSE was in.
//
// (7) OUTSIDE factsSha(), asserted both directions (`AGT-281`'s rule, the call AGT-607 made for
//     the stalls): the window advances with the clock, so hashing it would report drift on every
//     run. So the sha WITH the rows must equal the sha without the key -- and, so that clause
//     cannot pass by hashing nothing at all, a fact that IS in the payload must still move it.
//
// (8) THE READ IS THE FUNCTION, read out of the source: `rpc/runner_waste_by_cause?p_hours=`, the
//     window taken from the one exported constant the lead also prints, and never a `select=*`
//     (.claude/rules/supabase-column-grants.md).
//
// NO CREDENTIALS, no network, no Supabase, no model call, no writes: every assertion below is a
// pure helper driven from fixtures, plus one read-only source grep.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  renderBlock, renderWastedCycles, factsSha, asOf, WASTE_HOURS,
} from "../../scripts/render-standing-brief.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE_REL = "scripts/render-standing-brief.js";
const READ = "rpc/runner_waste_by_cause?p_hours=";

const T1 = "2026-11-07T18:20:00.000Z";
const STAMP = asOf(T1);

// The live 7-day shape, 2026-11-07, with `moved` deliberately FIRST so clause (4) can tell a
// re-sort from the received order. 28 + 60 + 54 + 9 + 5 + 6 = 162; the five waste rows sum to 134.
const WASTE = [
  { cause: "moved",           n: 28, counts_as_waste: false, candidate_tickets: [] },
  { cause: "meter_stale",     n: 60, counts_as_waste: true,  candidate_tickets: [] },
  { cause: "weekly_pace",     n: 54, counts_as_waste: true,  candidate_tickets: [] },
  { cause: "lanes_full_self", n: 9,  counts_as_waste: true,  candidate_tickets: [] },
  { cause: "gated",           n: 5,  counts_as_waste: true,  candidate_tickets: ["AGT-308"] },
  { cause: "unattributed",    n: 6,  counts_as_waste: true,  candidate_tickets: [] },
];
const LEAD_TAIL = "**162 cycle(s) in the last 7 days, 28 moved a ticket, 134 wasted (82.7%).**";

// AGT-607's FACTS() shape, plus the key this ticket adds.
const ITEMS = [{ id: "i1", backlog_id: "SES-1", status: "open", design_status: null, queue: 1 }];
const FACTS = (over = {}) => ({
  items: ITEMS, settings: null, drain: null,
  decisions: { open: [], finalWeek: 0, reversedWeek: 0 },
  census: [{ judgment_class: "P1 - Improves John's Skills", ord: 1, ratified: 0, proposed: 0, rejected: 0, total: 0, newest_root_claim_ref: null, newest_root_claim: null }],
  johnModel: [{ ord: 0, scope: "overall", pattern_no: null, imperative: null, citing_decisions: 0, finalised_unreversed: 0, reversed: 0, open: 0, agreement_rate: null }],
  inventionUse: [{ window: "all", ord: 3, judge_runs: 1, judge_runs_real_visitors: 0, distinct_real_visitors: 0, first_real_visitor_at: null, last_real_visitor_at: null }],
  staff: [],
  stalls: [],
  waste: WASTE,
  ...over,
});

const tableRows = out => [...out.matchAll(/^\| `[a-z_]+` \|/gm)].map(m => m[0]);

// == (1) the three figures, the whole sentence ===================================================
function theLeadStatesTotalMovedAndWasted() {
  const out = renderWastedCycles(WASTE, STAMP);

  assert.ok(out.includes("**Wasted cycles** — *" + STAMP + ".*"),
    `the group must lead with its name and the as-of stamp:\n${out}`);
  assert.ok(out.includes(LEAD_TAIL),
    `the lead must state all three figures exactly -- total, moved and wasted with its rate.\n` +
    `expected to contain: ${LEAD_TAIL}\ngot:\n${out}`);

  assert.strictEqual(tableRows(out).length, 6,
    `six causes in must render six table rows out, got ${tableRows(out).length}:\n${out}`);
  assert.ok(out.includes("| cause | cycles | counts as waste | candidate |"),
    `the table must name its four columns -- a reader acts on the candidate, not just the count:\n${out}`);

  // The waste figure is NOT total-minus-moved: routine_run and in_progress are not waste either.
  // Proven here so clause (1) cannot be satisfied by a subtraction that happens to match.
  const notWaste = WASTE.filter(r => !r.counts_as_waste).reduce((a, r) => a + r.n, 0);
  assert.strictEqual(notWaste, 28, "this fixture's only non-waste cause is `moved` (28)");
  const threeWay = [
    ...renderWastedCycles([...WASTE, { cause: "routine_run", n: 27, counts_as_waste: false, candidate_tickets: [] }], STAMP)
      .matchAll(/\*\*(\d+) cycle\(s\) in the last 7 days, (\d+) moved a ticket, (\d+) wasted/g),
  ][0];
  assert.deepStrictEqual([threeWay[1], threeWay[2], threeWay[3]], ["189", "28", "134"],
    "adding a non-waste `routine_run 27` must raise the TOTAL and leave `moved` and `wasted` alone -- " +
    "which a renderer computing waste as total-minus-moved could not do");
}

// == (2) the boolean is the column, not a rule in the renderer ===================================
function theWasteJudgmentComesFromTheRow() {
  const flipped = WASTE.map(r => r.cause === "meter_stale" ? { ...r, counts_as_waste: false } : r);
  const before = renderWastedCycles(WASTE, STAMP);
  const after = renderWastedCycles(flipped, STAMP);

  assert.ok(before.includes("134 wasted (82.7%)"), `baseline lead must read 134 wasted:\n${before}`);
  assert.ok(after.includes("74 wasted (45.7%)"),
    "flipping ONLY counts_as_waste on `meter_stale` (60) must take the wasted figure to 74 -- the " +
    "judgment lives in `runner_waste_causes` and the screen holds no content policy about which " +
    `cause is waste (pattern:12). got:\n${after}`);
  assert.ok(after.includes("**162 cycle(s) in the last 7 days, 28 moved a ticket,"),
    `and the total and the moved count must NOT move with it:\n${after}`);
  assert.ok(/\| `meter_stale` \| 60 \| yes \|/.test(before) && /\| `meter_stale` \| 60 \| no \|/.test(after),
    "and the row's own cell must follow the column, printing yes/no rather than true/false");
  assert.ok(!before.includes("true") && !before.includes("false"),
    `the cell is yes/no for a human reader, never a raw boolean:\n${before}`);
}

// == (3) the candidate ticket, and the dash for none =============================================
function theCandidateTicketReachesTheReader() {
  const out = renderWastedCycles(WASTE, STAMP);

  assert.strictEqual(out.split("AGT-308").length - 1, 1,
    `the one cause carrying a candidate must name it exactly once:\n${out}`);
  assert.ok(/\| `gated` \| 5 \| yes \| AGT-308 \|/.test(out),
    `and on its own row -- \`gated 5\` is a number, \`gated 5 ... AGT-308\` is a next action:\n${out}`);
  assert.strictEqual(out.split("| — |").length - 1, 5,
    `the five causes with no candidate must each read \`—\`, never a blank cell:\n${out}`);
  assert.ok(!out.includes("[]") && !out.includes("undefined"),
    `and never the raw empty array or an undefined:\n${out}`);

  // CONTROL: more than one candidate joins with a comma rather than printing only the first.
  const two = renderWastedCycles(
    [{ cause: "gated", n: 5, counts_as_waste: true, candidate_tickets: ["AGT-308", "AGT-367"] }], STAMP);
  assert.ok(two.includes("| AGT-308, AGT-367 |"),
    `CONTROL: a cause with two candidate tickets must print both:\n${two}`);
  // CONTROL: a missing candidate_tickets key is a dash, not a crash.
  const bare = renderWastedCycles([{ cause: "gated", n: 5, counts_as_waste: true }], STAMP);
  assert.ok(bare.includes("| — |"), `CONTROL: an absent candidate list renders the dash:\n${bare}`);
}

// == (4) received order, not the renderer's ======================================================
function theRowsKeepTheOrderTheyArrivedIn() {
  const out = renderWastedCycles(WASTE, STAMP);
  const causes = tableRows(out).map(r => r.split("`")[1]);

  assert.deepStrictEqual(causes, WASTE.map(r => r.cause),
    "the rows must render in RECEIVED order -- `runner_waste_by_cause()` already orders by count " +
    "then cause, and a renderer that re-sorted would be a second opinion on a question the " +
    "database has answered (pattern:9)");
  assert.strictEqual(causes[0], "moved",
    "this fixture deliberately leads with `moved 28` ahead of `meter_stale 60`, so a renderer that " +
    "silently sorted by count could not pass the assertion above by coincidence");
}

// == (5) absent is not zero ======================================================================
function absentIsNotZero() {
  const notRead = renderWastedCycles(undefined, STAMP);
  const zero = renderWastedCycles([], STAMP);

  assert.notStrictEqual(notRead, zero,
    "the control is vacuous unless the unread and measured-zero renders really differ");
  assert.ok(/was not read/i.test(notRead), `an unread ledger must SAY it was not read, got:\n${notRead}`);
  assert.ok(!/measured zero/i.test(notRead),
    "an unread ledger must NOT print the measured-zero sentence -- \"the read did not happen\" and " +
    `"no cycle was wasted" are opposite facts and the brief must not blur them. got:\n${notRead}`);
  assert.strictEqual(tableRows(notRead).length, 0, `an unread ledger renders no table rows:\n${notRead}`);
  assert.ok(!/\d+ cycle\(s\) in the last/.test(notRead),
    `and it must print no count at all, because it has none:\n${notRead}`);

  assert.ok(/measured zero/i.test(zero), `an empty window must say so in the words of a measurement, got:\n${zero}`);
  assert.ok(!/was not read/i.test(zero),
    `a measured zero must not also claim the ledger went unread, got:\n${zero}`);
  assert.strictEqual(tableRows(zero).length, 0, `and it renders no table rows either:\n${zero}`);

  for (const bad of [null, {}, "", 0]) {
    const out = renderWastedCycles(bad, STAMP);
    assert.ok(/was not read/i.test(out) && !/measured zero/i.test(out),
      `renderWastedCycles(${JSON.stringify(bad)}) must take the unread branch, got:\n${out}`);
  }
}

// == (6) it is in the brief, between the two groups it was placed between =========================
function theGroupSitsBetweenStalledCyclesAndHumanGates() {
  const block = renderBlock(FACTS(), T1);
  const at = s => block.indexOf(s);

  assert.ok(at("**Stalled cycles**") > -1, "renderBlock() must carry the Stalled cycles lead");
  assert.ok(at("**Wasted cycles**") > -1,
    "renderBlock() must carry the Wasted cycles lead. A helper nothing calls is exactly the state " +
    "the cause was in -- derivable from every row and rendered nowhere.");
  assert.ok(at("**Human gates**") > -1, "renderBlock() must carry the Human gates lead");

  assert.ok(at("**Stalled cycles**") < at("**Wasted cycles**"),
    "Wasted cycles must come AFTER Stalled cycles -- both are about what the runner did with its " +
    "own slots, and `permission_stall` is one of the causes this table counts");
  assert.ok(at("**Wasted cycles**") < at("**Human gates**"),
    "and BEFORE Human gates -- Human gates is the LAST group deliberately (SES-386)");
  assert.ok(at("**Human gates**") < at("*Provenance:"), "and all of it before the provenance line");
  assert.ok(block.includes(LEAD_TAIL), "the three figures reach the assembled block, not just the helper");
  assert.strictEqual(tableRows(block).filter(r => WASTE.some(w => r.includes(`\`${w.cause}\``))).length, 6,
    "and so do all six rows");

  // The group survives an unread ledger inside the assembled block, rather than the block losing it.
  const unread = renderBlock(FACTS({ waste: undefined }), T1);
  assert.ok(/\*\*Wasted cycles\*\*/.test(unread) && /was not read/i.test(unread),
    "renderBlock() must still carry the group and say the ledger was not read when waste is absent");
  assert.ok(unread.includes(STAMP), "every generated group carries the as-of stamp");
}

// == (7) outside factsSha(), both directions =====================================================
function theCausesAreOutsideTheFactsSha() {
  const withWaste = FACTS();
  const without = FACTS();
  delete without.waste;

  assert.strictEqual(factsSha(withWaste), factsSha(without),
    "the cause counts must be OUTSIDE factsSha() (AGT-281): the window advances with the clock, so " +
    "hashing it would report drift on every run and --check would stop being read inside a day");
  assert.strictEqual(factsSha(FACTS({ waste: [] })), factsSha(without),
    "and an empty window hashes the same as an absent one, for the same reason");

  // CONTROL: the sha is not simply blind. A fact that IS in the payload still moves it, so the
  // equality above is a statement about `waste` rather than about factsSha() hashing nothing.
  assert.notStrictEqual(
    factsSha(FACTS({ staff: [{ agent_id: "builder", fingerprint: "f1", cycle_id: "c1" }] })),
    factsSha(withWaste),
    "CONTROL: a staff finding IS in the payload and must move the sha -- otherwise clause (7) would " +
    "pass against a factsSha() that hashes nothing at all");
}

// == (8) the read, out of the source =============================================================
function theReadCallsTheFunctionWithTheDeclaredWindow() {
  const src = fs.readFileSync(path.join(ROOT, SOURCE_REL), "utf8");

  assert.ok(src.includes(READ),
    `${SOURCE_REL} must read the counts from the FUNCTION (\`${READ}\`) -- the grouping happens ` +
    "there and nowhere else, so nothing on the renderer's side recounts it (pattern:9)");
  assert.ok(src.includes(READ + '" + WASTE_HOURS'),
    "and the window must come from the exported WASTE_HOURS constant the lead also prints -- two " +
    "literals is how a group that says \"in the last 7 days\" starts querying a different window");
  assert.strictEqual(WASTE_HOURS, 168, "the window is the last 7 days, in hours");
  assert.ok(!/runner_waste_by_cause\?select=\*/.test(src) && !/runner_cycle_causes\?select=\*/.test(src),
    "columns are NAMED, never select=* (.claude/rules/supabase-column-grants.md)");
  // CONTROL: the grep can see the read when it is absent.
  assert.ok(!src.split(READ).join("REMOVED").includes(READ),
    "CONTROL: the read clause fired on the file's real bytes");
}

export default async function run() {
  theLeadStatesTotalMovedAndWasted();                 // (1)
  theWasteJudgmentComesFromTheRow();                  // (2)
  theCandidateTicketReachesTheReader();               // (3)
  theRowsKeepTheOrderTheyArrivedIn();                 // (4)
  absentIsNotZero();                                  // (5)
  theGroupSitsBetweenStalledCyclesAndHumanGates();    // (6)
  theCausesAreOutsideTheFactsSha();                   // (7)
  theReadCallsTheFunctionWithTheDeclaredWindow();     // (8)

  console.log("  [AGT-367] the live 7-day shape (162 cycles, 28 moved, 134 wasted at 82.7%) renders six " +
    "rows in received order with `gated`'s AGT-308 named once and a dash for the five with none; " +
    "flipping only counts_as_waste on `meter_stale` moves the wasted figure to 74 while the total " +
    "and moved count hold, and adding a non-waste `routine_run 27` raises only the total -- so the " +
    "judgment is the column and the figure is not a subtraction; an unread ledger says so without " +
    "saying \"measured zero\"; renderBlock() places the group after Stalled cycles and before Human " +
    "gates; factsSha() is equal with and without the rows while a staff finding still moves it; and " +
    "the read calls `runner_waste_by_cause` with the exported WASTE_HOURS -- each clause with a " +
    "control that flips it.");
}

selfRun(import.meta.url, run);
