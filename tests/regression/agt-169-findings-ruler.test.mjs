// DeepBench v7.0.664 | tests/regression/agt-169-findings-ruler.test.mjs | AGT-169
//
// THE FINDINGS LEDGER GETS A RULER. `ticket_owner_findings` held 259 uncleared rows over 10 slugs,
// the oldest first seen 2026-09-13, and nothing on the board could either retire a check or say
// that one had grown. Two mechanisms ship against that, and every arm below is RED on `47e4d052`
// because `retiredChecks`, `bandFor` and `RETIRED_CHECKS` do not exist there at all.
//
//   A  THE RULER, PURE. `retiredChecks()` unions the tree's recorded call with the Development
//      Manager's live `not-a-defect` rulings on `owner:<slug>`. The three negative controls are the
//      arm: a `ticketed` ruling retires nothing (that is the status all eleven live rows carry, so
//      an implementation that keyed on the row's existence would pass the positive case and silence
//      every check on the board), an `owner:` slug outside CHECKS is ignored, and `null` rulings
//      contribute nothing — a bad read runs MORE checks, never fewer.
//   B  THE GUARD, over hand-built rows through the real classifyBoard(). A retired check files 0
//      findings and COUNTS what it would have filed, and planWrites() then routes every prior
//      ledger row of that slug into `ledger.clear`. The control runs the same board with an empty
//      retirement set: the same rows file three findings and those prior rows are RE-SEEN instead.
//      That pair is what distinguishes a retirement from a board that simply got better.
//   C  THE FENCE. `bandFor` at six counts, and `censusFindingFor` byte-identical to the shipped
//      string under the first band while a crossing appends the BAND and not the count. Pinned as a
//      LITERAL, not as a re-derivation of the function's own output: today's eleven ticketed
//      findings keep their fingerprints only if that string is unchanged to the byte.
//   D  THE CENSUS SAYS SO. `censusLine` carries the retirement counts and `renderCensus` still
//      prints the retired check's line, with its reason. A retired check that stopped printing
//      would be indistinguishable from one that fell out of the loop.
//   E  THE SOFT READ, over a stubbed fetch. `readRulings()` is the one read in this script that may
//      fail without stopping the census, because it only ever REMOVES work. HTTP error, a
//      non-array body, a thrown transport and a full first page all answer `[]`.
//   F  THE CLI, spawned over a `--board` fixture with no credentials at all: the ruler reaches a
//      real process, and a `not-a-defect` ruling in the fixture retires a SECOND check on top of
//      the standing one.
//
// NOTHING HERE TOUCHES THE NETWORK OR THE LEDGER. Every arm is hand-built rows and stubs; arm F
// spawns the CLI over a temp fixture with SUPABASE_URL / SUPABASE_SERVICE_KEY deleted from its env,
// which is the same fixture-mode contract agt-79 uses.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  CHECKS, RETIRED_CHECKS, FENCE_BANDS, retiredChecks, bandFor,
  classifyBoard, planWrites, censusLine, renderCensus, censusFindingFor, openJudgmentBySlug,
  readRulings,
} from "../../scripts/ticket-owner.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "ticket-owner.js");
const NOW = "2026-09-27T12:00:00Z";
const RATE = 0.5;
const RETIRED = "actual-unknown";

// A closed row with no cost snapshot and no ticket_matrix cycle row -- the `actual-unknown`
// predicate exactly. `updated_at` is past every fence, and a runner_verdicts row is supplied per
// row below so `verdict-missing` does not fire and muddy the counts.
const row = (n, over = {}) => ({
  id: `00000000-0000-4000-8000-00000000016${n}`,
  backlog_id: `ZQ169-0${n}`,
  status: "done",
  type: "Tooling",
  tier: null,
  claimed_by: null,
  claimed_at: null,
  predicted_cycles: null,
  size_stamp: "M",
  design_status: null,
  kickoff_link: null,
  cost_pct_snapshot: null,
  cost_cycles_snapshot: null,
  revalidated_at: "2026-09-26T00:00:00Z",
  filed_at: "2026-09-20T00:00:00Z",
  created_at: "2026-09-20T00:00:00Z",
  updated_at: "2026-09-20T00:00:00Z",
  actual_tokens_attended: 1,
  ...over,
});

const ITEMS = [row(1), row(2), row(3)];
const BOARD = {
  items: ITEMS,
  matrix: [],
  verdicts: ITEMS.map(i => ({ backlog_id: i.backlog_id })),
  accepts: [],
  decisions: [],
  openCycles: [],
  ownerFindings: [],
  premises: [],
};

const ruling = (slug, over = {}) => ({
  check_slug: `owner:${slug}`,
  status: "not-a-defect",
  ruling: "estimate hygiene, not a defect",
  ruled_by: "devmanager",
  ruled_at: "2026-09-27T09:00:00Z",
  ...over,
});

const bySlug = (res, slug) => res.findings.filter(f => f.check === slug);

async function run() {
  // --- A: the ruler, pure ----------------------------------------------------------------------

  assert.deepStrictEqual(Object.keys(RETIRED_CHECKS), [RETIRED],
    "the standing list is the Designer's call (ii) and nothing else -- size-missing is deliberately NOT on it (call iii)");
  assert.ok(Object.isFrozen(RETIRED_CHECKS), "a recorded call must not be mutable at runtime");
  assert.match(RETIRED_CHECKS[RETIRED], /AGT-169, 2026-09-27/,
    "a retirement carries the ticket and the date it was ruled, or the reason cannot be audited");
  assert.match(RETIRED_CHECKS[RETIRED], /cost_pct_snapshot/,
    "the reason must name the column that has no reader, not merely assert the retirement");

  const base = retiredChecks([]);
  assert.deepStrictEqual([...base.keys()], [RETIRED], "an empty rulings list leaves the standing list alone");

  // POSITIVE: a not-a-defect ruling retires its slug, and the reason carries the ruler's own words.
  const live = retiredChecks([ruling("size-missing")]);
  assert.deepStrictEqual([...live.keys()].sort(), [RETIRED, "size-missing"],
    "a not-a-defect ruling on owner:<slug> retires that check -- the weekly review IS the ruler");
  assert.match(live.get("size-missing"), /estimate hygiene, not a defect/, "the ruling's own text is the reason");
  assert.match(live.get("size-missing"), /devmanager/, "who ruled it rides with the reason");
  assert.match(live.get("size-missing"), /2026-09-27T09:00:00Z/, "and when");

  // CONTROL 1 -- `ticketed` is the status all eleven live owner rows carry today. If the union
  // keyed on the ROW rather than on the RULING, this arm would silence every check on the board.
  assert.deepStrictEqual([...retiredChecks([ruling("size-missing", { status: "ticketed" })]).keys()], [RETIRED],
    "a ticketed ruling is an open question, never a retirement");
  assert.deepStrictEqual([...retiredChecks([ruling("size-missing", { status: "open" })]).keys()], [RETIRED],
    "only not-a-defect retires; no other status may");

  // CONTROL 2 -- an `owner:` slug this script does not run belongs to somebody else (or is a typo)
  // and must never silence a check by accident.
  assert.deepStrictEqual([...retiredChecks([ruling("not-a-check-here")]).keys()], [RETIRED],
    "an owner: slug outside CHECKS is ignored");
  assert.deepStrictEqual([...retiredChecks([{ ...ruling("size-missing"), check_slug: "board-stale" }]).keys()], [RETIRED],
    "a finding that is not an owner: row at all is not a ruling on a Ticket Owner check");

  // CONTROL 3 -- FAIL CLOSED, and closed means MORE checking. A bad read contributes nothing; it
  // never subtracts the standing list either, or a transport blip would resurrect 103 rows.
  for (const bad of [null, undefined, "", 0, {}, [null], [undefined], ["size-missing"], [{ check_slug: "owner:size-missing" }]]) {
    assert.deepStrictEqual([...retiredChecks(bad).keys()], [RETIRED],
      `unreadable rulings (${JSON.stringify(bad)}) must retire nothing beyond the standing list`);
  }

  // --- B: the guard, over the real classifyBoard --------------------------------------------

  const retiredRun = classifyBoard(BOARD, { now: NOW, rate: RATE });
  assert.deepStrictEqual(bySlug(retiredRun, RETIRED), [],
    "a retired check files NOTHING -- not a judgment row, not a derivable one");
  assert.strictEqual(retiredRun.backlog.retired[RETIRED], 3,
    "and it COUNTS what it would have filed: three rows, reported rather than vanished");
  assert.strictEqual(retiredRun.counts.findings, 0,
    "no other check may fire on these rows -- a count here that is not 0 is another check leaking into the arm");
  assert.deepStrictEqual(retiredRun.retired, { [RETIRED]: RETIRED_CHECKS[RETIRED] },
    "the census carries the reason, not just the fact");

  // THE CONTROL that makes the arm above mean anything: the SAME board with an empty retirement set
  // files the three findings. A classifyBoard that had simply stopped computing check 4 would pass
  // every assertion above and fail here.
  const liveRun = classifyBoard(BOARD, { now: NOW, rate: RATE, retired: new Map() });
  assert.deepStrictEqual(bySlug(liveRun, RETIRED).map(f => f.backlog_id), ["ZQ169-01", "ZQ169-02", "ZQ169-03"],
    "with nothing retired the same three rows are three actual-unknown findings");
  assert.deepStrictEqual(liveRun.backlog.retired, {}, "an empty retirement set counts nothing");

  // AND THE LEDGER DRAINS ITSELF. `clear = prior − tonight` already, so no delete path is needed:
  // the three prior rows the retired check stops filing are planned as clears, and the unrelated
  // prior row of a check that still runs is untouched.
  const prior = [
    { id: "p1", backlog_id: "ZQ169-01", check_slug: RETIRED, first_seen_at: "2026-09-13T03:31:46Z" },
    { id: "p2", backlog_id: "ZQ169-02", check_slug: RETIRED, first_seen_at: "2026-09-14T00:00:00Z" },
    { id: "p3", backlog_id: "ZQ169-03", check_slug: RETIRED, first_seen_at: "2026-09-15T00:00:00Z" },
  ];
  const planRetired = planWrites(retiredRun, prior, ITEMS, { rate: RATE });
  assert.deepStrictEqual(planRetired.ledger.clear, ["p1", "p2", "p3"],
    "every prior row of a retired check is CLEARED -- kept with its history, and no longer open");
  assert.deepStrictEqual(planRetired.ledger.insert, [], "a retired check inserts nothing");
  assert.deepStrictEqual(planRetired.ledger.reseen, [], "and re-sees nothing");
  assert.deepStrictEqual(planRetired.fixes, [], "a retired check writes no cell either");

  // The same plan against the UNRETIRED census re-sees all three instead of clearing them. Without
  // this control a planner that cleared everything unconditionally would read green above.
  const planLive = planWrites(liveRun, prior, ITEMS, { rate: RATE });
  assert.deepStrictEqual(planLive.ledger.reseen, ["p1", "p2", "p3"],
    "the check still running touches its prior rows rather than clearing them");
  assert.deepStrictEqual(planLive.ledger.clear, []);

  // AND ONCE THEY CLEAR, THE SLUG RAISES NOTHING. openJudgmentBySlug is `prior ∪ insert − clear`,
  // so the weekly finding for a retired check disappears on the first night it ships -- which is
  // the whole point: a retired check must not keep appearing on the Development Manager's list.
  assert.deepStrictEqual(openJudgmentBySlug(prior, planRetired.ledger, NOW), [],
    "a retired slug raises no census finding once its rows clear");
  assert.deepStrictEqual(openJudgmentBySlug(prior, planLive.ledger, NOW),
    [{ slug: RETIRED, count: 3, oldest: "2026-09-13T03:31:46Z" }],
    "the control: while the check runs, its open rows still raise one finding");

  // --- C: the fence ------------------------------------------------------------------------

  assert.deepStrictEqual([...FENCE_BANDS], [25, 50, 100, 200, 400], "the declared ladder, never a computed one");
  assert.ok(Object.isFrozen(FENCE_BANDS), "a ladder that could be pushed onto at runtime is not a fence");
  assert.strictEqual(bandFor(24), null, "under the first rung there is no band at all");
  assert.strictEqual(bandFor(25), 25, "the rung fires AT its own number, not past it");
  assert.strictEqual(bandFor(45), 25, "45 open rows sit on the 25 rung");
  assert.strictEqual(bandFor(99), 50);
  assert.strictEqual(bandFor(100), 100);
  assert.strictEqual(bandFor(500), 400, "past the top rung the band is the top rung, never null");
  assert.strictEqual(bandFor(0), null);
  for (const bad of [null, undefined, "45", NaN, {}]) {
    assert.strictEqual(bandFor(bad), null, `a non-number count has no band (${JSON.stringify(bad)})`);
  }

  // THE SHIPPED STRING, AS A LITERAL. Re-deriving it from the function would assert that the
  // function equals itself. Today's eleven ticketed owner findings keep their fingerprints only
  // while this exact sentence is what an under-the-first-band census emits.
  const under = censusFindingFor({ slug: "delivered-unaccepted", count: 24, oldest: "2026-09-13T03:31:46Z" });
  assert.deepStrictEqual(under, {
    kind: "other",
    check_slug: "owner:delivered-unaccepted",
    locations: [{ location: "ticket_owner_findings:delivered-unaccepted", text: "24 open rows, oldest first_seen 2026-09-13T03:31:46Z" }],
    governing_fact: "Ticket Owner check delivered-unaccepted holds open judgment rows a capability must decide",
    confidence: "high",
    proposed_resolution: "rule the rows or retire the check",
  }, "under the first band the finding is byte-identical to the shipped shape -- today's ticketed rows must carry, not re-raise");

  const over = censusFindingFor({ slug: "verdict-missing", count: 45, oldest: "2026-09-13T03:31:46Z" });
  assert.strictEqual(over.governing_fact,
    "Ticket Owner check verdict-missing holds open judgment rows a capability must decide (past 25 open rows)",
    "a crossing appends the BAND -- and the count stays out of the governing fact, or the row would re-raise nightly");
  assert.ok(!/45/.test(over.governing_fact), "the count still lives in the location text and nowhere else");
  assert.strictEqual(
    censusFindingFor({ slug: "verdict-missing", count: 49, oldest: "x" }).governing_fact,
    censusFindingFor({ slug: "verdict-missing", count: 25, oldest: "y" }).governing_fact,
    "every count inside one band produces one governing fact: one new finding per rung, never per row");
  assert.notStrictEqual(
    censusFindingFor({ slug: "verdict-missing", count: 50, oldest: "x" }).governing_fact,
    censusFindingFor({ slug: "verdict-missing", count: 49, oldest: "x" }).governing_fact,
    "and the next rung is a different one");
  // The live shape of the three slugs the kickoff names, so the ship's own claim is pinned.
  assert.strictEqual(bandFor(33), 25, "size-missing at 33 has crossed the first rung");
  assert.strictEqual(bandFor(24), null, "delivered-unaccepted at 24 has not, and must stay byte-identical");

  // --- D: the census says so ---------------------------------------------------------------

  assert.ok(censusLine(retiredRun).endsWith(" · retired 1 check / 3 rows"),
    `the night's retirements ride in the one string the cycle row carries verbatim; got: ${censusLine(retiredRun).slice(-60)}`);
  assert.ok(censusLine(liveRun).endsWith(" · retired 0 checks / 0 rows"),
    `and read zero when nothing is retired; got: ${censusLine(liveRun).slice(-60)}`);
  assert.ok(censusLine(classifyBoard({ ...BOARD, items: [] }, { now: NOW, rate: RATE })).endsWith(" · retired 1 check / 0 rows"),
    "a retired check with no rows tonight is still a retired CHECK -- the count of checks is not the count of rows");

  const text = renderCensus(retiredRun, NOW);
  assert.strictEqual(text, renderCensus(retiredRun, NOW), "renderCensus stays byte-stable: the report is diffed night over night");
  assert.strictEqual(text.replace(/\n$/, "").split("\n").length, CHECKS.length + 1,
    "a retired check still gets its line -- an absent line reads as a check that stopped running");
  const retiredLine = text.split("\n").find(l => l.startsWith(`  ${RETIRED}`));
  assert.ok(retiredLine.includes("retired  counted 3"),
    `the retired line reports its count in place of the derivable/judgment pair; got: ${retiredLine}`);
  assert.ok(!/derivable|judgment/.test(retiredLine),
    `a retired check must not print a derivable/judgment pair at all; got: ${retiredLine}`);
  assert.ok(retiredLine.includes("AGT-169, 2026-09-27"),
    `and it prints WHY it stopped, on the line itself; got: ${retiredLine}`);
  const liveLine = renderCensus(liveRun, NOW).split("\n").find(l => l.startsWith(`  ${RETIRED}`));
  assert.ok(/derivable 0  judgment 3/.test(liveLine),
    `the control: unretired, the same slug prints the ordinary pair; got: ${liveLine}`);

  // --- E: the soft read ---------------------------------------------------------------------

  const ok = await readRulings("https://example.invalid", "k",
    async () => ({ ok: true, status: 200, text: async () => JSON.stringify([ruling("size-missing")]) }));
  assert.deepStrictEqual(ok.map(r => r.check_slug), ["owner:size-missing"], "a good read returns the rulings");

  for (const [why, impl] of [
    ["HTTP 500", async () => ({ ok: false, status: 500, text: async () => "boom" })],
    ["a non-array body", async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ message: "nope" }) })],
    ["unparseable JSON", async () => ({ ok: true, status: 200, text: async () => "<html>" })],
    ["a thrown transport", async () => { throw new Error("ECONNRESET"); }],
    ["a full first page", async () => ({ ok: true, status: 200, text: async () => JSON.stringify(Array.from({ length: 1000 }, () => ruling("size-missing"))) })],
  ]) {
    const soft = await readRulings("https://example.invalid", "k", impl);
    assert.deepStrictEqual(soft, [], `${why} must degrade to [] -- this read only ever REMOVES work`);
    assert.deepStrictEqual([...retiredChecks(soft).keys()], [RETIRED],
      `${why}: every check still runs; a bad read never retires`);
  }

  // --- F: the CLI over a fixture, no credentials ---------------------------------------------

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt-169-"));
  try {
    const fixture = path.join(tmp, "board.json");
    fs.writeFileSync(fixture, JSON.stringify({
      now: NOW,
      rate: RATE,
      board: { ...BOARD, ownerRulings: [ruling("designed-closed")] },
    }), "utf8");
    const env = { ...process.env };
    delete env.SUPABASE_URL;
    delete env.SUPABASE_SERVICE_KEY;
    const cli = spawnSync(process.execPath, [SCRIPT, `--board=${fixture}`, "--json"], { cwd: ROOT, env, encoding: "utf8" });
    assert.strictEqual(cli.status, 0, `the fixture census must run without credentials; stderr: ${cli.stderr}`);
    const out = JSON.parse(cli.stdout);
    assert.strictEqual(out.counts.findings, 0, "the fixture board's only findings are the retired check's");
    assert.deepStrictEqual(out.backlog.retired, { [RETIRED]: 3, "designed-closed": 0 },
      "a --board fixture's ownerRulings retire a SECOND check, through a real process and with no code edit");

    // CONTROL: the same fixture with the ruling removed retires only the standing check.
    const plain = path.join(tmp, "board-no-ruling.json");
    fs.writeFileSync(plain, JSON.stringify({ now: NOW, rate: RATE, board: BOARD }), "utf8");
    const cli2 = spawnSync(process.execPath, [SCRIPT, `--board=${plain}`, "--json"], { cwd: ROOT, env, encoding: "utf8" });
    assert.strictEqual(cli2.status, 0, `stderr: ${cli2.stderr}`);
    assert.deepStrictEqual(JSON.parse(cli2.stdout).backlog.retired, { [RETIRED]: 3 },
      "no ruling, no second retirement -- the fixture key is what did it, not the code path running at all");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  process.stdout.write(
    `[AGT-169] ruler: ${Object.keys(RETIRED_CHECKS).length} standing retirement, a not-a-defect ruling retires a check live,` +
    ` fence bands ${FENCE_BANDS.join("/")}, 3 prior rows cleared by retirement\n`);
}

selfRun(import.meta.url, run);
export default run;
