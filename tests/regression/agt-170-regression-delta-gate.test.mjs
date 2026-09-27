// DeepBench v7.0.618 | tests/regression/agt-170-regression-delta-gate.test.mjs | AGT-170 (slices 1+2)
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

//
// ---- AGT-170 SLICE 2 (v7.0.618): THE BASELINE'S SILENCE IS NOT A PASS -------------------------------
//
// THE DEFECT SLICE 1 SHIPPED, measured on this cycle's own captures rather than reasoned about. Slice 1
// partitioned this run's `[FAIL]` names in two: in the handed baseline -> standing, otherwise -> newly
// red. That `otherwise` asserted the unchanged tree RAN the test and it passed. `run-all.js` prints one
// `NOT A FULL RUN:` line naming every test that declared a not-run part and still counts those tests
// `[PASS]` (`:147`), so a baseline can say in its own output "I never verified this" and slice 1 could
// not hear it. Replaying slice 1's two captures through its own exports, EVERY newly red name either arm
// produced was a test the baseline never ran: `newlyRed` minus the 71-name not-run list was `[]` twice.
// A manufactured red is not a harmless over-block -- the verdict is the ladder's input
// (`docs/ARCHITECTURE.md` §19v), so it costs a streak.
//
// (s2a) THE FIX AND THE SHIPPED RULE ON ONE FIXTURE, which is clause (b)'s discipline applied to slice 2:
//     a baseline whose test is `[PASS]` AND named in the notice, `[FAIL]` in the post run, must read
//     `newlyRed []` / `unverifiedInBaseline [it]` / `red` through the reader-plus-delta pair, and
//     `newlyRed [it]` through slice 1's call shape -- the same function, one variable, the `unverified`
//     argument. A guard that only asserted the new lists would pass against a helper that never accuses
//     anybody of anything.
//
// (s2b) THE THREE NEGATIVE CONTROLS. The notice INSIDE a `[FAIL]` message harvests nothing (the same
//     anchoring mutant as (a), and not hypothetical -- one message can carry 71 names). A name in BOTH
//     the `[FAIL]` list and the notice reads `standing`, never unverified: `run-all.js:157-162` drains
//     the not-run buffer on the FAIL arm too, 2 of this cycle's 18 baseline reds sit in both, and a
//     proven red demoted to "never verified" is the one direction here that could launder a ship. And a
//     baseline with no notice yields `unverified []`, leaving slice 1's green path byte-identical.
//
// (s2c) THE REAL PAIR, not a fixture, conditional on the captures being present. `AGT170_CAPTURE_DIR`
//     names the cycle scratchpad holding `baseline2.txt` and `post-run2.txt`; absent -> `notRun()`, the
//     declared gap rather than a silent skip, because those files are not in the repo and never will be.
//     Where they are there, the pair must read `standing 18`, `newlyRed []`,
//     `unverifiedInBaseline ["ses-413d-questions-scoreboard.test.mjs"]`, `red`.
//
// (s2d) THE ARMING NEEDLE GAINS `SUPABASE_SERVICE_KEY`, inside clause (g)'s conditional check. An
//     uncredentialed baseline declares far more not-run than a credentialed graded run does, so a
//     runbook that arms the flag off a capture taken without credentials would hand the gate an
//     `unverified` list wide enough to absorb a real newly red test. The needle makes the runbook say so.

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { RUNBOOK_REL } from "../../scripts/render-cycle-card.js";
import {
  GATES, gateStatus, verdictFor, failingTestsFrom, regressionDelta, readRegressionBaseline,
  REGRESSION_NO_BASELINE_REASON, notRunTestsFrom,
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

  // ================================================================================================
  // ---- AGT-170 SLICE 2: THE BASELINE'S SILENCE IS NOT A PASS --------------------------------------
  // ================================================================================================
  //
  // ---- (s2a) one fixture, two rules: the fix names nobody, slice 1 names the unverified test ------
  //
  // THE NOTICE FIXTURE IS PINNED TO ITS PRODUCER, same discipline as clause (a) and for the same
  // reason: if run-all.js's notice template changes, that must surface here rather than as a silently
  // empty not-run set. Both halves of the template are pinned -- the marker AND the parenthesised name
  // list the parse reads.
  assert.ok(runAllSrc.includes("`NOT A FULL RUN: ${notRunParts} ${p} declared not-run across ${partialTests.length} ${t} `"),
    "tests/regression/run-all.js no longer prints the `NOT A FULL RUN: ...` notice in the shape " +
    "notRunTestsFrom parses, so AGT-170 slice 2's whole not-run parse is reading for a marker nothing " +
    "writes and every baseline will read as a full run. Re-measure the real output and re-pin this.");
  assert.ok(runAllSrc.includes("`(${partialTests.join(\", \")}). Those parts are UNVERIFIED"),
    "run-all.js's notice no longer carries the comma-joined file list in parentheses -- that span IS " +
    "what notRunTestsFrom harvests, so the not-run set will be empty for every real capture.");
  // The precedence rule below is only a real case because of THIS line: the drain happens on the FAIL
  // arm too, so one test can be both a [FAIL] name and a not-run name.
  assert.ok(runAllSrc.includes("const declared = takeNotRun();"),
    "run-all.js no longer drains the not-run buffer per test, so a declaration can be attributed to " +
    "the wrong file and the `names`-outranks-`unverified` precedence below is guarding a case that no " +
    "longer arises the way it was measured. Re-derive it.");

  // A baseline capture in run-all.js's real shape. `never-verified.test.mjs` is counted [PASS] and is
  // ALSO named in the notice -- exactly the shape that fooled slice 1.
  const notRunBaseline = [
    "  [PASS] aaa-first.test.mjs",
    "  [FAIL] standing-red.test.mjs -- expected 1 row, got 0",
    "  [PASS] never-verified.test.mjs",
    "       [NOT RUN] the write path -- credentials absent",
    "",
    "regression suite: 2/3 passed",
    "NOT A FULL RUN: 1 part declared not-run across 1 test (never-verified.test.mjs). Those parts are " +
      "UNVERIFIED -- a green suite does not cover them.",
  ].join("\n");

  const read2 = readRegressionBaseline("baseline2.txt", () => notRunBaseline);
  assert.deepEqual(read2.names, ["standing-red.test.mjs"],
    `the baseline's [FAIL] names must be unchanged by slice 2; got ${JSON.stringify(read2.names)}.`);
  assert.deepEqual(read2.unverified, ["never-verified.test.mjs"],
    `readRegressionBaseline must report the notice's names as \`unverified\`; got ` +
    `${JSON.stringify(read2.unverified)}. A test the baseline never ran is the whole input slice 2 adds.`);
  assert.ok(read2.source.includes("1 never run"),
    `the source must carry the not-run count so the payload can be read without the file; got ` +
    `"${read2.source}". "18 red" alone is the sentence slice 1 published while 71 tests went unrun.`);

  // The post run: the standing red, plus the test the baseline never ran, now failing.
  const post2 = ["never-verified.test.mjs", "standing-red.test.mjs"];

  // THE FIXED RULE.
  const fixed = regressionDelta({
    absolute: "red", baseline: read2.names, post: post2, unverified: read2.unverified,
  });
  assert.deepEqual(fixed.newlyRed, [],
    `a test the baseline DECLARED it never ran may not be newly red; got ` +
    `${JSON.stringify(fixed.newlyRed)}. Absence from [FAIL] is evidence of a pass only for a run that ` +
    `ran everything.`);
  assert.deepEqual(fixed.unverifiedInBaseline, ["never-verified.test.mjs"],
    `the third list must hold exactly the post names the baseline never ran; got ` +
    `${JSON.stringify(fixed.unverifiedInBaseline)}.`);
  assert.deepEqual(fixed.standing, ["standing-red.test.mjs"],
    "the proven standing red must still be standing -- the third bucket may only take names the " +
    "baseline's [FAIL] list does not carry.");
  assert.equal(fixed.status, "red",
    `an unverified red must STILL BLOCK: the status is the absolute exit code, untouched. Got ` +
    `${fixed.status} -- ${fixed.reason}. Slice 2 removes a false accusation, never a stop ` +
    `(pattern:166 -- a degrade does not remove a stop).`);
  assert.ok(fixed.reason.includes("never-verified.test.mjs") && /UNVERIFIED/.test(fixed.reason),
    `the reason must NAME each unverified test and say it is unverified -- the reason is what reaches ` +
    `runner_verdicts, and a block that does not say why sends its reader back to re-run the suite. ` +
    `Got "${fixed.reason}"`);
  assert.ok(!/newly red (test|tests) this delivery must answer for/.test(fixed.reason),
    `the third state's reason still accuses this delivery of a newly red test. Got "${fixed.reason}"`);

  // THE CONTROL, AND IT IS THIS CLAUSE'S WHOLE POINT: slice 1's call shape, on the SAME fixture, with
  // the SAME shipped function. One variable -- the `unverified` argument. If slice 2 changed nothing,
  // both arms name never-verified.test.mjs and this assertion is the one that fires.
  const sliceOne = regressionDelta({ absolute: "red", baseline: read2.names, post: post2 });
  assert.deepEqual(sliceOne.newlyRed, ["never-verified.test.mjs"],
    `slice 1's call shape (no \`unverified\` handed over) must still name the test newly red; got ` +
    `${JSON.stringify(sliceOne.newlyRed)}. A reader that hands over no not-run set must grade exactly ` +
    `as slice 1 did, or slice 2 changed the default instead of adding an input.`);
  assert.notDeepEqual(fixed.newlyRed, sliceOne.newlyRed,
    "both arms produced the same newly red list on one fixture -- the change did nothing, and a test " +
    "that passes either way is not QA.");
  assert.deepEqual(sliceOne.unverifiedInBaseline, [],
    "with no not-run set handed over, the third list must be empty rather than null -- the partition " +
    "ran, it just had nothing to put there.");

  // ---- (s2b) the three negative controls ----------------------------------------------------------
  //
  // (1) THE NOTICE INSIDE A [FAIL] MESSAGE HARVESTS NOTHING. Not hypothetical: one such message can
  // carry 71 names, and an unanchored scan would mark the entire suite unverified -- which would let a
  // genuinely newly red test land in `unverifiedInBaseline` and be excused.
  const poisoned = [
    "  [FAIL] ses-424c-gate-card-census.test.mjs -- expected the line `NOT A FULL RUN: 3 parts " +
      "declared not-run across 3 tests (aaa.test.mjs, bbb.test.mjs, ccc.test.mjs).`",
    "regression suite: 297/298 passed",
  ].join("\n");
  assert.deepEqual(notRunTestsFrom(poisoned), [],
    `notRunTestsFrom harvested names out of a failure MESSAGE body -- the parse is not anchored to the ` +
    `start of the line. Got ${JSON.stringify(notRunTestsFrom(poisoned))}. Every name it harvests is a ` +
    `name the delta will refuse to call newly red, so this mutant excuses real breakage.`);
  const poisonedRead = readRegressionBaseline("poisoned.txt", () => poisoned);
  assert.deepEqual(poisonedRead.unverified, [],
    "a baseline whose only notice is quoted inside a failure message must report no unverified test.");
  assert.deepEqual(
    regressionDelta({ absolute: "red", baseline: poisonedRead.names, post: ["aaa.test.mjs"],
      unverified: poisonedRead.unverified }).newlyRed,
    ["aaa.test.mjs"],
    "a name quoted inside a [FAIL] message was treated as unverified, so a real newly red test escaped " +
    "the block. This is the anchoring mutant's consequence, asserted end to end rather than on the parse.");

  // (2) A NAME IN BOTH LISTS IS STANDING, NEVER UNVERIFIED. The measured case: 2 of this cycle's 18
  // baseline reds are also in its notice, because run-all.js drains the buffer on the FAIL arm too.
  const bothBaseline = [
    "  [FAIL] agt-132-finding-routes.test.mjs -- AssertionError: route absent",
    "       [NOT RUN] the live probe -- credentials absent",
    "",
    "regression suite: 297/298 passed",
    "NOT A FULL RUN: 1 part declared not-run across 1 test (agt-132-finding-routes.test.mjs). Those " +
      "parts are UNVERIFIED -- a green suite does not cover them.",
  ].join("\n");
  const bothRead = readRegressionBaseline("both.txt", () => bothBaseline);
  assert.deepEqual(bothRead.names, ["agt-132-finding-routes.test.mjs"], "the proven red must be a name.");
  assert.deepEqual(bothRead.unverified, [],
    `a test that FAILED is a proven red on the unchanged tree whatever else it skipped, so it must be ` +
    `subtracted from \`unverified\`; got ${JSON.stringify(bothRead.unverified)}.`);
  const bothDelta = regressionDelta({ absolute: "red", baseline: bothRead.names,
    post: ["agt-132-finding-routes.test.mjs"], unverified: bothRead.unverified });
  assert.deepEqual(bothDelta.standing, ["agt-132-finding-routes.test.mjs"],
    "a name in both lists must read STANDING.");
  assert.equal(bothDelta.status, "green",
    `a run whose only red is a PROVEN baseline red must still grade green; got ${bothDelta.status} -- ` +
    `${bothDelta.reason}. If the not-run notice can demote a proven red to "never verified", the ` +
    `delta loses the only bucket it can ever show green and slice 2 broke slice 1.`);
  // The precedence asserted on the PURE function too, against a caller that partitions wrongly: the
  // reader already subtracts, so this pins the exported rule rather than the reader's arithmetic.
  const wrongCaller = regressionDelta({ absolute: "red", baseline: ["x.test.mjs"], post: ["x.test.mjs"],
    unverified: ["x.test.mjs"] });
  assert.deepEqual(wrongCaller.standing, ["x.test.mjs"],
    "`baseline` must be tested FIRST: a caller that puts one name in both lists may not be able to " +
    "turn a proven standing red into an unverified one. That is the only direction here that could " +
    "launder a ship.");
  assert.deepEqual(wrongCaller.unverifiedInBaseline, [], "`names` outranks `unverified`, always.");

  // (3) NO NOTICE -> `unverified []`, AND SLICE 1'S GREEN PATH IS BYTE-IDENTICAL.
  const fullRun = [
    "  [FAIL] standing-red.test.mjs -- boom",
    "regression suite: 297/298 passed",
  ].join("\n");
  const fullRead = readRegressionBaseline("full.txt", () => fullRun);
  assert.deepEqual(fullRead.unverified, [],
    "a capture with no NOT A FULL RUN line declared nothing not-run, so absence from [FAIL] genuinely " +
    "IS green and the unverified set must be empty rather than a guess.");
  const fullDelta = regressionDelta({ absolute: "red", baseline: fullRead.names,
    post: ["standing-red.test.mjs"], unverified: fullRead.unverified });
  assert.equal(fullDelta.status, "green", "a full-run baseline's proven subset still grades green.");
  assert.equal(
    fullDelta.reason,
    regressionDelta({ absolute: "red", baseline: fullRead.names, post: ["standing-red.test.mjs"] }).reason,
    "the green reason changed wording when an empty not-run set was handed over. Slice 2 must be " +
    "invisible on a full-run baseline -- same wording, same bytes, or every earlier recorded green " +
    "reads as a different rule than the one that produced it.");

  // ---- (s2c) the real pair, not a fixture ---------------------------------------------------------
  //
  // The captures are cycle scratchpad files and are not in the repo, so this clause is conditional and
  // DECLARES its gap rather than skipping quietly (pattern:77) -- an invisible gap is indistinguishable
  // from coverage.
  const CAPTURES = process.env.AGT170_CAPTURE_DIR || "";
  const capBaseline = CAPTURES ? path.join(CAPTURES, "baseline2.txt") : "";
  const capPost = CAPTURES ? path.join(CAPTURES, "post-run2.txt") : "";
  let realPair = "not run";
  if (CAPTURES && fs.existsSync(capBaseline) && fs.existsSync(capPost)) {
    const realRead = readRegressionBaseline(capBaseline);
    const realPost = failingTestsFrom(fs.readFileSync(capPost, "utf8"));
    const realDelta = regressionDelta({
      absolute: "red", baseline: realRead.names, post: realPost, unverified: realRead.unverified,
    });
    assert.equal(realDelta.standing.length, 18,
      `the real pair must read 18 standing; got ${realDelta.standing.length}. If the captures were ` +
      `replaced, re-measure this clause against them rather than relaxing the number.`);
    assert.deepEqual(realDelta.newlyRed, [],
      `on the real pair the fixed rule must accuse nobody; got ${JSON.stringify(realDelta.newlyRed)}.`);
    assert.deepEqual(realDelta.unverifiedInBaseline, ["ses-413d-questions-scoreboard.test.mjs"],
      `the real pair's one escapee must land in the third list; got ` +
      `${JSON.stringify(realDelta.unverifiedInBaseline)}.`);
    assert.equal(realDelta.status, "red",
      `the real pair must STILL BLOCK -- ${realDelta.status} means slice 2 cleared a ship it must not.`);
    // The control on real data: slice 1's call shape manufactures the accusation.
    const realSliceOne = regressionDelta({ absolute: "red", baseline: realRead.names, post: realPost });
    assert.deepEqual(realSliceOne.newlyRed, ["ses-413d-questions-scoreboard.test.mjs"],
      `slice 1's shape must still name the test on the real pair; got ` +
      `${JSON.stringify(realSliceOne.newlyRed)}. Without this the real-data arm proves no difference.`);
    realPair = `18 standing, 0 newly red, 1 unverified (${realDelta.status})`;
  } else {
    notRun("the real baseline2.txt / post-run2.txt pair",
      `AGT170_CAPTURE_DIR is unset or the captures are absent, so clause (s2c) ran on fixtures only. ` +
      `Those files are cycle scratchpad captures and are never committed. Re-run with ` +
      `AGT170_CAPTURE_DIR=<cycle scratchpad> to cover the real pair.`);
  }

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
    // AGT-170 slice 2. An UNCREDENTIALED capture declares far more not-run than a credentialed graded
    // run does -- every credential-gated test in the suite adds itself to the notice -- so arming the
    // flag off such a capture hands the gate an `unverified` list wide enough to absorb a genuinely
    // newly red test. The baseline must be captured the same way the graded run is, and the runbook is
    // where that is said.
    ["SUPABASE_SERVICE_KEY", "the runbook does not say the baseline must be captured WITH credentials, so an uncredentialed capture's much wider not-run set can absorb a real newly red test"],
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
  console.log(`  [AGT-170 slice 2] a baseline's NOT A FULL RUN name reads unverified, not newly red ` +
    `(fixed: newlyRed [] + unverifiedInBaseline [never-verified.test.mjs], status red; slice 1's shape ` +
    `on the same fixture: newlyRed [never-verified.test.mjs]); the notice quoted inside a [FAIL] ` +
    `message harvests 0 names and a real newly red test still escapes nothing; a name in both lists ` +
    `reads standing and still grades green; a full-run baseline's green reason is byte-identical to ` +
    `slice 1's; the real capture pair reads ${realPair}; the arming needles now require ` +
    `SUPABASE_SERVICE_KEY, control red`);
}

selfRun(import.meta.url, run);
