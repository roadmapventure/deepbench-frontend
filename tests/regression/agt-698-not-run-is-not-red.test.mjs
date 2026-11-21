// DeepBench v7.0.1103 | tests/regression/agt-698-not-run-is-not-red.test.mjs | AGT-698
//
// FEATURE: AGT-698 -- A SUITE THAT DID NOT RUN IS `not-run`, NEVER RED.
//
// THE DEFECT, measured live 2026-11-21. `tests/regression/run-all.js` already draws the
// distinction its own header states: exit 1 iff a NAMED test failed, exit 2 when nothing failed
// but a test could not run on a transport incident. Both readers then collapsed it. CI ran the
// suite under `set -euo pipefail` and published `Tripwire + regression (blocking)` = failure on
// exit 2, and `gateStatus()` mapped every non-zero to `red`, so 7a blocked fail-closed on a run
// that named no failing test at all. In the 14 days before this ship 5 of 19 verifier blocks were
// a suite exit 2 naming no test; run 43735638510 (sha 24236e03) read "18/19 passed", every named
// test [PASS], then `##[error]Process completed with exit code 2`.
//
// THE DISTINCTION IS A STATED FACT, NEVER AN INFERENCE, and that is the whole safety argument:
// `not-run` needs exit 2 AND a failing set that was parsed AND found EMPTY. An exit 2 that named a
// [FAIL] is red, an exit 1 is red, and a null failing set (never parsed) is red -- arm D spends its
// controls on exactly those three, because each one is a direction in which this ticket could have
// laundered a real red into a non-verdict.
//
// NOTHING IS CLEARED (pattern:166 -- a degrade does not remove a stop). A not-run suite is never
// `green` and never approves: beside a green build and a green hygiene gate 7a exits 2 and records
// NO ROW (a cannot-run, the same vocabulary AGT-457 and AGT-245 use), and beside a red or skipped
// gate it is recorded `skipped` and still blocks -- the `runner_verdicts` CHECK admits no fourth
// value. Only the REGRESSION gate is armed: a build or hygiene exit 2 stays red (arm E case 3).
//
// OFFLINE BY CONSTRUCTION (pattern:76): arms A and D are source reads and pure calls; arms B and C
// run the SHIPPED ci.yml lines in `bash -c` over tmp files; arm E injects the gate runner and the
// test-slot wrapper, so `npm run build` and the real suite never spawn. Nothing here writes to the
// repo tree or opens a socket, and arm B's one child is `run-all.js` refusing a name it does not
// have.
//
// ARMS (kickoff v7.0.1103 section 5, T3):
//   A  the two sources carry the change: ci.yml's four added lines, and the verifier's refusal id.
//   B  ci.yml's own not-run block, RUN: exit 2 with no [FAIL] publishes `regression=not-run` and
//      exits 0; a [FAIL] at exit 2, and an exit 1, fall through untouched. Plus the real thing --
//      `run-all.js`'s "Nothing was run." exit 2, through the same lines.
//   C  ci.yml's own publish block, RUN: `success` + `not-run` -> `skipped`, and the two controls.
//   D  `gateStatus()` and `regressionDelta()` -- the one judgment and its three controls.
//   E  the same pair through `gradeDelivery()`, the ONE grading path 7a and the re-grade share.
//
// BASELINE: ABSENT pre-build -- this file does not exist on the unchanged tree (cycle
// 5d5a1b45-9c02-47a2-8f7b-fc3b60d0e41e's baseline block, tree 9a23432, AGT-629's declaration).

import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  gateStatus,
  SUITE_NOT_RUN_EXIT,
  regressionDelta,
  gradeDelivery,
  runGate,
} from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CI = path.join(ROOT, ".github/workflows/ci.yml");
const VERIFIER = path.join(ROOT, "scripts/verifier.js");
const lf = t => String(t).replace(/\r\n/g, "\n");

// run-all.js's own two vocabularies, verbatim, as the suite prints them (leading indent included).
const N = "  [NOT RUN] x.test.mjs -- transport";
const F = "  [FAIL] a.test.mjs -- boom";

// ---- the shipped lines, lifted out of ci.yml rather than restated -----------------------------
//
// THE POINT OF READING THEM: a copy of the block pasted into this file would pass forever after
// somebody edited the workflow. Arms B and C run what the repo actually ships, keyed on the marker
// pair the block carries, with the step's own 10-space indent stripped.
function ciBlock(tag) {
  const lines = lf(fs.readFileSync(CI, "utf8")).split("\n");
  const open = lines.indexOf(`          # AGT-698 ${tag} >>>`);
  const close = lines.indexOf(`          # AGT-698 ${tag} <<<`);
  assert.ok(open >= 0 && close > open,
    `ci.yml must carry the AGT-698 ${tag} marker pair, so this arm runs the SHIPPED lines: ${open}/${close}`);
  return lines.slice(open + 1, close).map(l => {
    assert.ok(l.startsWith("          ") || l === "",
      `every line in the ${tag} block sits at the step's 10-space indent: ${JSON.stringify(l)}`);
    return l.slice(10);
  }).join("\n");
}

function hasBash() {
  const r = spawnSync("bash", ["-c", "exit 0"], { encoding: "utf8" });
  return !r.error && r.status === 0;
}

function sh(script, env) {
  return spawnSync("bash", ["-c", `set -euo pipefail\n${script}`],
    { encoding: "utf8", env: { ...process.env, ...env }, timeout: 120000 });
}

function tmpDir(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `agt698-${tag}-`));
}

// ---- A: both sources carry the change ---------------------------------------------------------
function armA() {
  const ci = lf(fs.readFileSync(CI, "utf8"));
  const lines = ci.split("\n");
  // The four lines T2 adds, at their own indents -- the output wiring, end to end: the step
  // declares the id, the job publishes the output, and the reporting job reads it.
  for (const line of [
    "    outputs:",
    "      regression: ${{ steps.regression.outputs.regression }}",
    "        id: regression",
    "          CHECKS_REGRESSION: ${{ needs.checks.outputs.regression }}",
  ]) {
    assert.ok(lines.includes(line), `ci.yml must carry this line verbatim: ${JSON.stringify(line)}`);
  }
  // THE OLD READ MUST BE GONE, not merely joined: while jq still took the raw job result, the
  // not-run conclusion could never reach the ledger however the step exited.
  assert.ok(!ci.includes('--arg checks "${CHECKS_RESULT}"'),
    "the publish step must no longer hand jq the raw job result -- $CHECKS is what the block computes");
  assert.ok(lf(fs.readFileSync(VERIFIER, "utf8")).includes('error: "regression-not-run"'),
    "scripts/verifier.js must carry the cannot-run refusal id the 7a lane exits 2 with");
}

// ---- B: ci.yml's not-run block, RUN over tmp files --------------------------------------------
function armB() {
  if (!hasBash()) {
    notRun("arm B", "no bash on this platform, so the shipped ci.yml shell block cannot be executed here");
    return;
  }
  const fx = tmpDir("ciblock");
  try {
    const log = path.join(fx, "head-run.txt");
    const out = path.join(fx, "github-output.txt");
    // `exit 7` is the FALL-THROUGH SENTINEL: the real step carries on to ci-new-reds.js, so 7 here
    // means "the block declined to handle it" and 0 means "the block published not-run and stopped".
    const script = `${ciBlock("not-run").replaceAll("/tmp/head-run.txt", log)}\nexit 7`;
    const run = (headCode, body) => {
      fs.writeFileSync(log, body);
      fs.writeFileSync(out, "");
      return sh(script, { HEAD_CODE: String(headCode), GITHUB_OUTPUT: out });
    };

    // 1. THE CASE THE TICKET IS ABOUT: exit 2, a NOT RUN line, no [FAIL].
    const notRunCase = run(2, `${N}\nregression suite: 18/19 passed\n`);
    assert.strictEqual(notRunCase.status, 0,
      `exit 2 naming no failing test must leave the step GREEN: got ${notRunCase.status}: ${notRunCase.stdout}${notRunCase.stderr}`);
    assert.strictEqual(fs.readFileSync(out, "utf8"), "regression=not-run\n",
      `and must publish the job output the reporting job reads: ${JSON.stringify(fs.readFileSync(out, "utf8"))}`);
    assert.ok(notRunCase.stdout.includes("[NOT RUN] x.test.mjs"),
      `and must print WHAT did not run, or the green is unreadable: ${notRunCase.stdout}`);

    // 2. CONTROL, and the one that matters: the SAME exit 2 with a real [FAIL] falls through.
    const bothCase = run(2, `${N}\n${F}\n`);
    assert.strictEqual(bothCase.status, 7,
      `exit 2 that ALSO named a failing test must fall through to the red path: got ${bothCase.status}`);
    assert.strictEqual(fs.readFileSync(out, "utf8"), "",
      "a run that named a failing test must publish NO not-run output");

    // 3. CONTROL: an ordinary exit 1 is untouched by this block.
    const failCase = run(1, `${F}\n`);
    assert.strictEqual(failCase.status, 7, `exit 1 must fall through unchanged: got ${failCase.status}`);
    assert.strictEqual(fs.readFileSync(out, "utf8"), "",
      "a failing run must publish NO not-run output");

    // 4. THE REAL ARTICLE, not a fixture: the suite's own could-not-run exit, through the same
    // lines. This is the shape the live incident took -- a name the tree does not have stands in
    // for the transport incident, because both end at "nothing was graded, exit 2".
    const real = spawnSync(process.execPath,
      ["tests/regression/run-all.js", "--only=agt-698-no-such.test.mjs"],
      { cwd: ROOT, encoding: "utf8", env: { ...process.env, DEEPBENCH_TEST_SLOT: "held" }, timeout: 120000 });
    assert.strictEqual(real.status, SUITE_NOT_RUN_EXIT,
      `run-all.js must still exit ${SUITE_NOT_RUN_EXIT} when nothing was run: got ${real.status}: ${real.stdout}${real.stderr}`);
    assert.ok(!`${real.stdout}${real.stderr}`.includes("[FAIL] "),
      `and must name no failing test: ${real.stdout}${real.stderr}`);
    const through = run(SUITE_NOT_RUN_EXIT, `${real.stdout}${real.stderr}`);
    assert.strictEqual(through.status, 0,
      `the suite's own could-not-run output must leave the step green: got ${through.status}: ${through.stdout}`);
    assert.strictEqual(fs.readFileSync(out, "utf8"), "regression=not-run\n",
      "and must publish not-run off the real output, not just the fixture");
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

// ---- C: ci.yml's publish block, RUN ------------------------------------------------------------
function armC() {
  if (!hasBash()) {
    notRun("arm C", "no bash on this platform, so the shipped ci.yml shell block cannot be executed here");
    return;
  }
  const script = `${ciBlock("publish")}\nprintf %s "$CHECKS"`;
  const checks = (result, regression) =>
    sh(script, { CHECKS_RESULT: result, CHECKS_REGRESSION: regression });

  const skipped = checks("success", "not-run");
  assert.strictEqual(skipped.status, 0, `the publish block must not fail: ${skipped.stderr}`);
  assert.strictEqual(skipped.stdout, "skipped",
    `a green job whose suite did not run is published skipped, which step 4a's third row already ` +
    `handles -- never success and never failure: got ${JSON.stringify(skipped.stdout)}`);
  // CONTROL: a job that actually FAILED is still a failure, whatever the output says. Without this
  // the rewrite could launder a red CI run into a could-not-tell.
  assert.strictEqual(checks("failure", "not-run").stdout, "failure",
    "a FAILED job stays failure even with the not-run output set -- the conclusion is not overwritten");
  // CONTROL: the ordinary run, where the step published no output at all.
  assert.strictEqual(checks("success", "").stdout, "success",
    "an ordinary green run with no not-run output is published success, byte-identical to before");
}

// ---- D: the one judgment, and its three controls ----------------------------------------------
function armD() {
  const g = (exitCode, fails) => gateStatus({ ran: true, exitCode, notRunExit: SUITE_NOT_RUN_EXIT, fails });
  assert.strictEqual(g(2, []), "not-run",
    "exit 2 with a PARSED and EMPTY failing set is the suite declaring it did not run");
  assert.strictEqual(g(2, ["a.test.mjs"]), "red",
    "control: exit 2 that NAMED a failing test is red -- the name is the evidence, not the code");
  assert.strictEqual(g(2, null), "red",
    "control: a failing set that was never parsed is red -- fail closed, never not-run on no evidence");
  assert.strictEqual(g(1, []), "red",
    "control: exit 1 is a named failure by run-all.js's own contract, so it is red whatever was parsed");
  assert.strictEqual(gateStatus({ ran: true, exitCode: 2 }), "red",
    "control: a caller that arms nothing keeps the old collapse -- only the regression gate is armed (D3)");

  // regressionDelta is DELIBERATELY UNTOUCHED: its fail-closed words are for an exit-1 run that
  // named nothing, and that case must still be red after this ticket.
  const d = regressionDelta({ absolute: "red", baseline: [], post: [] });
  assert.strictEqual(d.status, "red",
    "a red that named no failing test is still red in the delta -- AGT-170's fail-closed exit is kept");
  assert.ok(d.reason.includes("named NO failing test"),
    `and keeps its own words: ${d.reason}`);
}

// ---- E: the same pair through the ONE grading path 7a and the re-grade lane share --------------
async function armE() {
  const script = (line, code) =>
    `console.log(${JSON.stringify(line)});process.exit(${code});`;
  const call = (build, regression) => gradeDelivery({
    repoRoot: ROOT,
    graded: null,
    baselineRead: {},
    slot: async (_e, fn) => ({ ran: true, value: await fn() }),
    // Injected, so neither `npm run build` nor the real suite spawns: each gate is one `node -e`
    // that logs a line and exits with the code this case is about.
    run: (gate, root, env) => runGate(
      { ...gate, cmd: process.execPath, argv: ["-e", gate.key === "build" ? build : gate.key === "regression" ? regression : script("hygiene ok", 0)] },
      root, env),
  });

  // 1. THE DISCRIMINATOR. A not-run suite beside a green build and a green hygiene gate: the grade
  // is `not-run` and the lane is handed a cannot-run, NOT a red and NOT a verdict.
  const notRunCase = await call(script("build ok", 0), script(N, 2));
  assert.strictEqual(notRunCase.gateResults.regression, "not-run",
    `a suite that exited 2 naming no test grades not-run: ${JSON.stringify(notRunCase.gateResults)}`);
  assert.ok(notRunCase.notRun && notRunCase.notRun.includes("exit 2"),
    `and the grading path hands the lane the detail it exits 2 with: ${JSON.stringify(notRunCase.notRun)}`);

  // 2. CONTROL, same shape, one digit different: a REAL failing test is still red and still blocks.
  // On the unchanged tree case 1 grades `red` exactly like this one, which is what makes the pair
  // discriminating rather than two assertions about one behaviour.
  const redCase = await call(script("build ok", 0), script(F, 1));
  assert.strictEqual(redCase.gateResults.regression, "red",
    `control: a named [FAIL] at exit 1 is still RED: ${JSON.stringify(redCase.gateResults)}`);
  assert.strictEqual(redCase.notRun, null,
    "control: a red suite is a verdict, so nothing is handed to the cannot-run exit");
  assert.strictEqual(redCase.verdict, "block",
    "control: and it still BLOCKS -- nothing is cleared by this ticket");

  // 3. ONLY THE REGRESSION GATE IS ARMED (D3), and a not-run beside a non-green gate is recorded
  // `skipped`: the row must carry one of the CHECK's three values, and the block must still happen.
  const buildRedCase = await call(script("build broke", 2), script(N, 2));
  assert.strictEqual(buildRedCase.gateResults.build, "red",
    `a build exit 2 is still red -- the not-run reading is the regression gate's alone: ${JSON.stringify(buildRedCase.gateResults)}`);
  assert.strictEqual(buildRedCase.gateResults.regression, "skipped",
    `and a not-run suite beside it is recorded skipped, never a fourth value: ${JSON.stringify(buildRedCase.gateResults)}`);
  assert.strictEqual(buildRedCase.notRun, null,
    "and NO cannot-run exit is offered: there is a real red to report, so this is a verdict");
  assert.strictEqual(buildRedCase.verdict, "block", "and it blocks");

  // 4. CONTROL: the ordinary all-green delivery is untouched.
  const greenCase = await call(script("build ok", 0), script("regression suite: 19/19 passed", 0));
  assert.strictEqual(greenCase.notRun, null, "control: an all-green grade offers no cannot-run exit");
  assert.strictEqual(greenCase.verdict, "approve",
    `control: and still approves: ${greenCase.reasoning}`);
}

async function run() {
  armA();
  armB();
  armC();
  armD();
  await armE();
}

export default run;

selfRun(import.meta.url, run);
