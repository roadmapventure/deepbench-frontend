// DeepBench v7.0.615 | tests/regression/agt-170-regression-delta-gate.test.mjs | AGT-170
//
// FEATURE: AGT-170 -- THE REGRESSION GATE GRADES THE DELTA, NEVER THE SUITE'S ABSOLUTE EXIT CODE.
// Measured on the unchanged tree at `e6676adc`: `regression suite: 279/298 passed`, exit 1, and a
// re-run one cycle later `280/298`, exit 1 -- 18-19 standing red files, none of them anybody's
// current diff. `gateStatus`'s whole rule is `exitCode === 0 ? "green" : "red"`, and
// `grep -ci baseline scripts/verifier.js` was `0`, so every delivery was graded on somebody else's
// red and no ship could reach `approve`.
//
// THIS GUARD EXISTS BECAUSE THE RULE IT COVERS RUNS THE WRONG WAY. Every other rule in
// `scripts/verifier.js` moves one direction only, approve -> block (the kickoff cap check, the lane
// check, the SES-403 re-grade all say so in their own headers). This one is the file's single
// RED -> GREEN move, so a vacuous green here is not a missing test -- it is a laundered ship. Each
// clause below therefore carries its own negative control, and where the control is the point it is
// said out loud.
//
// (a) THE NAMES, AND THE `[FAIL]`-INSIDE-A-MESSAGE MUTANT. `failingTestsFrom` must return exactly the
//     failing file names from a real `run-all.js` output shape -- and must add NOTHING for a `[FAIL]`
//     that appears inside a failure MESSAGE. A scan for the marker anywhere in the line would harvest
//     a name out of a message body and put a file in the failing set that never ran; the fixture's
//     shape is pinned against `run-all.js`'s own printer so the fixture cannot drift from the
//     producer it imitates.
//
// (b) THE DIFFERENCE FROM THE OLD BEHAVIOUR, ON ONE FIXTURE. The same exit-1 output whose every name
//     is in the baseline must read `green` through `regressionDelta` AND `red` through the retired
//     rule -- which is not re-implemented here but driven through the SHIPPED `gateStatus`, still the
//     absolute grader. A guard that only asserted the green would pass just as well against a helper
//     that returns "green" unconditionally; asserting both on ONE input proves a DIFFERENCE rather
//     than a shared property.
//
// (c) ONE NEWLY RED NAME IS RED, AND IS NAMED. The reason must carry the offending file, because the
//     reason is what reaches `runner_verdicts` and is the only place a later reader can learn which
//     test this delivery broke.
//
// (d) THE FAIL-CLOSED DEFAULTS. `baseline: null` leaves the absolute answer alone, and `"skipped"` --
//     SES-181's THIRD value, a suite that never produced an exit status -- never becomes green. A
//     rule written `red ? ... : "green"` passes (c) and fails here, which is why this clause is
//     separate from it.
//
// (e) THE AGT-116 CONTROL, OVER A MATRIX RATHER THAN AN EXAMPLE. `AGT-116` (open, tier `now`, queue
//     21) is the suite's nondeterminism ticket and this ship does not wait on it, for a reason this
//     clause is the proof of: across every baseline/post pair, a `post` name absent from `baseline`
//     is NEVER `green`. So a flaky test green in the baseline and red here is newly red by name and
//     the gate stays red -- the block the platform already takes. Nondeterminism can cost a ship a
//     false BLOCK; it can never buy one a false approve.
//
// (f) THE VERDICT RULE IS UNTOUCHED, ALL 27 COMBINATIONS. Only what "regression green" MEANS changed.
//     `verdictFor` must still approve iff all three gates are green, so the delta cannot have widened
//     the bar by reaching a second rule while it changed the first.
//
// (g) THE CODE IS WIRED, AND THE ARMING CHECK IS CONDITIONAL RATHER THAN ABSENT. A pure function
//     nothing calls grades nothing, so the wiring half is asserted against the shipped source and
//     re-run against a copy with the assignment removed, which must throw -- a control that changes
//     nothing pins nothing.
//
//     THE FLAG SHIPS INERT, AND THE GUARD IS WRITTEN FOR THAT RATHER THAN AGAINST IT. No runbook step
//     passes `--regression-baseline=` yet, because arming it is an edit to THREE files at once: the
//     runbook, `docs/runbooks/cycle-card.md` (whose header carries a sha256 of the runbook, `SES-377`)
//     and `BYTES_AT_SHIP` in `ses-413d-questions-scoreboard.test.mjs` -- measured on this tree, doing
//     it inside AGT-170's 3-file cap left 8 tests newly red. So this clause asserts the INERTNESS IS
//     DECLARED in the shipped code today, and asserts CONDITIONALLY that a runbook which does pass the
//     flag also carries the capture line and the AGT-116 caveat. A guard that simply demanded the
//     runbook carry the flag would be red until the arming ships; one that asserted it does NOT would
//     go red the moment somebody correctly arms it. Conditional is the only shape that fights neither.

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { RUNBOOK_REL } from "../../scripts/render-cycle-card.js";
import {
  GATES, gateStatus, verdictFor, failingTestsFrom, regressionDelta, readRegressionBaseline,
  REGRESSION_NO_BASELINE_REASON,
} from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFIER_REL = "scripts/verifier.js";
const STATUSES = ["green", "red", "skipped"];

export default async function run() {
  // ---- (a) the names, and the [FAIL]-inside-a-message mutant --------------------------------------
  //
  // THE FIXTURE'S SHAPE IS PINNED TO THE PRODUCER, not to this author's memory of it. run-all.js:150
  // is the only site that prints a failure name, and if its template ever changes this assertion is
  // where that shows up rather than in a silently empty failing set six months later.
  const runAllSrc = fs.readFileSync(path.join(ROOT, "tests/regression/run-all.js"), "utf8");
  assert.ok(runAllSrc.includes("console.log(`  [FAIL] ${file} -- ${e.message}`)"),
    "tests/regression/run-all.js no longer prints `  [FAIL] ${file} -- ${e.message}`, so the fixture " +
    "below imitates a shape that is not produced any more and AGT-170's whole failing-set parse is " +
    "reading for a marker nothing writes. Re-measure the real output and re-pin this.");

  // A real run's shape: two-space indent, PASS lines between, the NOT A FULL RUN notice, the summary
  // line, and a console.warn on stderr -- the SES-213 fact that stderr is always non-empty.
  const fixtureStdout = [
    "  [PASS] aaa-first.test.mjs",
    "  [FAIL] ses-332-first-run.test.mjs -- expected 1 row, got 0",
    "  [PASS] bbb-second.test.mjs",
    "  [FAIL] agt-70-auditor.test.mjs -- AssertionError [ERR_ASSERTION]: auditor row absent",
    // The mutant: a failing test whose MESSAGE quotes the marker and another file's name. Exactly
    // what a guard about this suite's own output prints, and the reason the parse is anchored.
    "  [FAIL] ses-424g-blocker-cleared.test.mjs -- expected the line `[FAIL] zzz-never-ran.test.mjs`",
    "       [NOT RUN] the write path -- credentials absent",
    "",
    "regression suite: 295/298 passed",
    "NOT A FULL RUN: 1 part declared not-run across 1 test (ses-424g-blocker-cleared.test.mjs).",
  ].join("\n");
  const fixtureStderr = "WARN: GATE_BYPASS_SECRET not found\n";
  const fixture = `${fixtureStdout}\n${fixtureStderr}`;

  const names = failingTestsFrom(fixture);
  assert.deepEqual(names,
    ["agt-70-auditor.test.mjs", "ses-332-first-run.test.mjs", "ses-424g-blocker-cleared.test.mjs"],
    `failingTestsFrom returned ${JSON.stringify(names)}. It must be the three names that actually ` +
    `failed, sorted and unique, and must NOT contain zzz-never-ran.test.mjs -- that string lives ` +
    `inside a failure MESSAGE, and a file harvested out of a message body is a file that never ran.`);
  assert.ok(!names.includes("zzz-never-ran.test.mjs"),
    "failingTestsFrom harvested a name out of a failure message body -- the parse is not anchored to " +
    "the start of the line, so any test that quotes `[FAIL]` poisons the failing set.");
  // Unique and sorted, asserted rather than assumed: the subset comparison is a name comparison, and
  // a duplicate would double-count a standing red in the recorded `standing` list.
  assert.deepEqual(failingTestsFrom(`${fixture}\n  [FAIL] agt-70-auditor.test.mjs -- again`), names,
    "a repeated [FAIL] line changed the failing set -- failingTestsFrom must be unique by name.");
  assert.deepEqual(failingTestsFrom(""), [], "empty output must name no failing test.");
  assert.deepEqual(failingTestsFrom("  [PASS] all.test.mjs\nregression suite: 1/1 passed"), [],
    "a clean run must name no failing test.");

  // ---- (b) green through the delta, RED through the rule it retired, on ONE fixture ---------------
  const baseline = [...names, "agt-82-jerry-maguire.test.mjs"];   // a standing red that passed here
  const subset = regressionDelta({ absolute: "red", baseline, post: names });
  assert.equal(subset.status, "green",
    `an exit-1 run whose every [FAIL] name is in the baseline must grade green; got ` +
    `${subset.status} -- ${subset.reason}`);
  assert.deepEqual(subset.newlyRed, [], "a proven subset has no newly red names.");
  assert.deepEqual(subset.standing, names,
    "the standing list must be the run's own red names, recorded so the subset claim is quoted from " +
    "the grader rather than re-derived by its reader.");
  assert.ok(/BY NAME/.test(subset.reason) && subset.reason.includes(String(baseline.length)),
    `the green reason must say the reds are in the baseline BY NAME and carry the baseline's size; ` +
    `got "${subset.reason}"`);

  // THE CONTROL, AND IT IS THE CLAUSE'S WHOLE POINT. The retired behaviour is not re-implemented
  // here (STANDARDS.md Section 4, SES-45: logic recreated in a test file is a second implementation
  // agreeing with itself) -- it is the SHIPPED `gateStatus`, which is still the absolute grader and
  // still what `regression_absolute` reports.
  assert.equal(gateStatus({ ran: true, exitCode: 1 }), "red",
    "gateStatus no longer reads exit 1 as red, so clause (b) has no retired behaviour to differ from " +
    "and this whole file would pass vacuously.");
  assert.notEqual(subset.status, gateStatus({ ran: true, exitCode: 1 }),
    "the delta returned the same answer as the rule it retired on the same fixture -- the change did " +
    "nothing, and a test that passes either way is not QA.");

  // ---- (c) one newly red name is red, and is named ------------------------------------------------
  const broke = regressionDelta({
    absolute: "red",
    baseline,
    post: [...names, "agt-170-newly-broken.test.mjs"].sort(),
  });
  assert.equal(broke.status, "red",
    `one [FAIL] name absent from the baseline must be red; got ${broke.status} -- ${broke.reason}`);
  assert.deepEqual(broke.newlyRed, ["agt-170-newly-broken.test.mjs"],
    "the newly red list must hold exactly the names the baseline does not carry.");
  assert.ok(broke.reason.includes("agt-170-newly-broken.test.mjs"),
    `the red reason must NAME the newly red file -- the reason is what reaches runner_verdicts, and ` +
    `a block that does not say which test broke sends its reader back to re-run the suite. Got ` +
    `"${broke.reason}"`);
  assert.deepEqual(broke.standing, names,
    "a newly red run still records its standing reds -- both lists, always, or the subset claim is " +
    "unauditable.");

  // ---- (d) the fail-closed defaults ---------------------------------------------------------------
  for (const absent of [null, undefined]) {
    const none = regressionDelta({ absolute: "red", baseline: absent, post: names });
    assert.equal(none.status, "red",
      `baseline ${String(absent)} must leave the absolute answer alone. A delta that grades without a ` +
      `handed baseline is the tree vouching for itself.`);
    assert.equal(none.reason, REGRESSION_NO_BASELINE_REASON,
      `the no-baseline reason must be the one exported constant, so the runbook, the payload and this ` +
      `guard cannot describe the default three ways. Got "${none.reason}"`);
    assert.equal(none.standing, null, "nothing was graded, so no list may be reported as if it was.");
    assert.equal(none.newlyRed, null, "nothing was graded, so no list may be reported as if it was.");
  }
  // SES-181's THIRD value. `skipped` is "the suite never produced an exit status", and it must survive
  // the delta untouched -- with an EMPTY baseline and an EMPTY post, which is the input a
  // `red ? ... : "green"` rule turns into a green.
  for (const bl of [[], baseline]) {
    const skipped = regressionDelta({ absolute: "skipped", baseline: bl, post: [] });
    assert.equal(skipped.status, "skipped",
      `a skipped gate became "${skipped.status}" -- SES-181's third value is the one distinction the ` +
      `charter's bar is written in ("any red OR SKIPPED check still cards John"), and the delta may ` +
      `not collapse it.`);
  }
  const alreadyGreen = regressionDelta({ absolute: "green", baseline, post: [] });
  assert.equal(alreadyGreen.status, "green", "a green gate stays green and is never re-decided here.");
  // A red that named NO failing test: the empty set is trivially a subset of any baseline, so the
  // naive rule reads the most total failure the suite can have (a crash before its first [FAIL] line)
  // as the cleanest possible green.
  const noNames = regressionDelta({ absolute: "red", baseline, post: [] });
  assert.equal(noNames.status, "red",
    `an exit-1 run that named no failing test graded ${noNames.status}. There is nothing to prove a ` +
    `subset OVER, so it must stay red -- an empty failing set is a subset of every baseline.`);
  const unparsed = regressionDelta({ absolute: "red", baseline, post: null });
  assert.equal(unparsed.status, "red",
    "an unparsed failing set must stay red -- \"nobody looked\" is never \"no failures\".");

  // The file half, same fail-closed list, driven through the shipped reader rather than described.
  const readerCases = [
    ["", "no --regression-baseline passed"],
    ["/definitely/not/here/baseline.txt", "could not be read"],
  ];
  for (const [arg, expect] of readerCases) {
    const r = readRegressionBaseline(arg);
    assert.equal(r.names, null, `readRegressionBaseline(${JSON.stringify(arg)}) must yield no names.`);
    assert.ok(r.source.includes(expect),
      `the source must say WHICH failure it was ("${expect}"); got "${r.source}". "No flag was ` +
      `passed" and "the file was unreadable" are different facts about a ship that stayed blocked.`);
  }
  const blank = readRegressionBaseline("whitespace.txt", () => "   \n\t\n");
  assert.equal(blank.names, null,
    "a whitespace-only baseline is the shape a redirect that never ran leaves behind, and reading it " +
    "as an empty baseline would turn every standing red into a newly red one.");
  const real = readRegressionBaseline("fixture.txt", () => fixture);
  assert.deepEqual(real.names, names, "a real baseline's names must come through the same parse.");
  assert.ok(real.source.includes("3 red"),
    `the source must carry the baseline's size so the payload can be read without the file; got ` +
    `"${real.source}"`);
  const trulyGreen = readRegressionBaseline("green.txt", () => "regression suite: 298/298 passed\n");
  assert.deepEqual(trulyGreen.names, [],
    "a baseline with real content and no [FAIL] line IS an empty baseline -- the unchanged tree was " +
    "green, so anything red in this run is this delivery's.");

  // ---- (e) the AGT-116 control, over a matrix ------------------------------------------------------
  const pool = ["a.test.mjs", "b.test.mjs", "c.test.mjs"];
  const subsets = [[], ["a.test.mjs"], ["b.test.mjs"], ["a.test.mjs", "b.test.mjs"], pool];
  let pairs = 0;
  let greens = 0;
  for (const bl of subsets) {
    for (const post of subsets) {
      pairs++;
      const d = regressionDelta({ absolute: "red", baseline: bl, post });
      const escaped = post.filter(n => !bl.includes(n));
      if (escaped.length || !post.length) {
        assert.notEqual(d.status, "green",
          `baseline ${JSON.stringify(bl)} + post ${JSON.stringify(post)} graded GREEN. A post name the ` +
          `baseline does not carry is newly red BY NAME -- that is how AGT-116's nondeterminism is ` +
          `handled rather than waited on: a flake green in the baseline and red here must cost the ` +
          `ship a BLOCK, never buy it an approve. An empty post is the same refusal for the same ` +
          `reason -- no failing set, nothing proven.`);
        assert.deepEqual(d.newlyRed, escaped,
          `the newly red list must be exactly the escapees for ${JSON.stringify(bl)}/${JSON.stringify(post)}.`);
      } else {
        assert.equal(d.status, "green",
          `baseline ${JSON.stringify(bl)} + post ${JSON.stringify(post)} is a proven non-empty subset ` +
          `and must grade green; got ${d.status} -- ${d.reason}`);
        greens++;
      }
    }
  }
  assert.equal(pairs, subsets.length ** 2, "the matrix must cover every pair.");
  assert.ok(greens > 0 && greens < pairs,
    `the matrix produced ${greens} greens of ${pairs} pairs. All-green or all-red means the matrix ` +
    `pins nothing -- it must contain both the move this ticket adds and the refusals that fence it.`);

  // ---- (f) the verdict rule is untouched, all 27 combinations -------------------------------------
  const keys = GATES.map(g => g.key);
  assert.deepEqual(keys, ["build", "regression", "hygiene"],
    "GATES changed shape, so the 3^3 space below is no longer the whole space -- re-derive it.");
  let combos = 0;
  let approves = 0;
  for (const build of STATUSES) {
    for (const regression of STATUSES) {
      for (const hygiene of STATUSES) {
        combos++;
        const allGreen = build === "green" && regression === "green" && hygiene === "green";
        const { verdict } = verdictFor({ build, regression, hygiene });
        assert.equal(verdict, allGreen ? "approve" : "block",
          `verdictFor({build:${build},regression:${regression},hygiene:${hygiene}}) returned ` +
          `${verdict}. AGT-170 changes what "regression green" MEANS and nothing about the rule that ` +
          `reads it: approve iff all three green, still, or the delta widened the bar by reaching a ` +
          `second rule.`);
        if (verdict === "approve") approves++;
      }
    }
  }
  assert.equal(combos, STATUSES.length ** 3, "all 27 combinations must be driven.");
  assert.equal(approves, 1, "exactly one of the 27 may approve, and it is the all-green one.");

  // ---- (g) the code is wired, the procedure arms it, both with mutants ----------------------------
  const verifierSrc = fs.readFileSync(path.join(ROOT, VERIFIER_REL), "utf8");
  const WIRING = [
    ['arg("regression-baseline"', "the flag is never read, so no baseline can reach the gate"],
    ["gateResults.regression = delta.status", "the delta is computed and thrown away -- gate_regression is still the absolute exit code"],
    ["regression_absolute:", "--json drops the absolute answer, so the delta overwrites history instead of standing beside it"],
    ["regression_newly_red:", "--json drops the newly red list, so a block cannot say which test this delivery broke"],
    ["regression_baseline_source:", "--json drops which baseline was used, so a green cannot be audited"],
  ];
  const wiringCheck = (src) => {
    for (const [needle, consequence] of WIRING) {
      if (!src.includes(needle)) {
        throw new Error(`${VERIFIER_REL} no longer contains \`${needle}\` -- ${consequence} (AGT-170).`);
      }
    }
  };
  wiringCheck(verifierSrc);
  assert.throws(() => wiringCheck(verifierSrc.split("gateResults.regression = delta.status").join("// unwired")),
    /no longer contains/,
    "the wiring control did not fire -- a copy of the verifier with the delta unwired passed, so this " +
    "clause pins nothing.");

  // The inertness is DECLARED, not silent: a flag no procedure passes, with nothing in the file saying
  // so, is indistinguishable from a flag somebody forgot to wire.
  for (const needle of ["DELIBERATELY INERT AS SHIPPED", "--regression-baseline=", "ses-413d-questions-scoreboard.test.mjs"]) {
    assert.ok(verifierSrc.includes(needle),
      `${VERIFIER_REL} must state that AGT-170's flag ships inert and name what arming it costs ` +
      `(missing \`${needle}\`). Otherwise the next reader cannot tell an unwired flag from a ` +
      `deliberately unarmed one -- the SES-376 / SES-359 disposition, in their own words.`);
  }

  // THE ARMING CHECK, CONDITIONAL ON THE ARMING. Inert today; a real check the moment a runbook step
  // passes the flag, and it never goes red because somebody armed it correctly.
  const runbookSrc = fs.readFileSync(path.join(ROOT, RUNBOOK_REL), "utf8");
  const ARMED = [
    ["regression-baseline-", "nothing captures the baseline, so there is no file for 7a to pass and the flag is armed at a path that never exists"],
    ["AGT-116", "the caveat is unstated, so a reader cannot tell what a flaky green in the baseline costs"],
  ];
  const armedCheck = (src) => {
    if (!src.includes("--regression-baseline=")) return "inert";
    for (const [needle, consequence] of ARMED) {
      if (!src.includes(needle)) {
        throw new Error(`${RUNBOOK_REL} passes --regression-baseline= but no longer carries \`${needle}\` -- ${consequence} (AGT-170).`);
      }
    }
    return "armed";
  };
  const arming = armedCheck(runbookSrc);
  // The control is a SYNTHETIC armed runbook missing the caveat -- the mutant this clause exists for,
  // available whether or not the real runbook is armed yet.
  assert.throws(() => armedCheck("... --regression-baseline=$S/whatever.txt ... regression-baseline-<cycle> ..."),
    /no longer carries `AGT-116`/,
    "the arming control did not fire -- an armed runbook with no AGT-116 caveat passed, so the " +
    "conditional half of this clause pins nothing.");
  assert.equal(armedCheck("a runbook that passes no baseline flag"), "inert",
    "an unarmed runbook must read inert rather than throw -- this guard may not be red until the " +
    "arming ships.");

  console.log(`  [AGT-170] failingTestsFrom anchors at the line start (${names.length} names, the ` +
    `in-message [FAIL] harvested none); one exit-1 fixture reads green through the delta and ` +
    `${gateStatus({ ran: true, exitCode: 1 })} through the rule it retired; 1 newly red name is red ` +
    `and named; no baseline / skipped / no-names / unparsed all fail closed; ${greens} of ${pairs} ` +
    `AGT-116 matrix pairs may go green and never one with an escapee; ${approves} of ${combos} ` +
    `verdict combinations approve; ${VERIFIER_REL} is wired and declares the flag inert, ` +
    `${RUNBOOK_REL} reads ${arming}, both controls red`);
}

selfRun(import.meta.url, run);
