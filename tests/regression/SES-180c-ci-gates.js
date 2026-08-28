// DeepBench v7.0.286 | tests/regression/SES-180c-ci-gates.js | SES-180 (c) (M3 Independent Verification)
//
// Guards the ship that turned .github/workflows/ci.yml's two reporting jobs into real gates. Two
// halves, and NEITHER is sufficient alone -- which is the whole shape of this file:
//
//   (A) THE WORKFLOW SAYS IT GATES. Parse the real ci.yml and assert the `checks` job carries no
//       `continue-on-error`, that the tripwire step passes `--gate`, and that the regression step
//       carries `if: always()`. Alone this is a string test over YAML and proves nothing about
//       behaviour -- a workflow can demand a gate from a runner that cannot fail.
//   (B) THE RUNNER CAN ACTUALLY FAIL, AND CAN ACTUALLY PASS. Drive the REAL tests/regression/
//       run-all.js over fixture directories through its own `--dir` flag, and the REAL
//       gateModeRequested() imported from scripts/check-session-docs.js. Alone this proves the
//       mechanisms work while CI still runs the invocation that can never fail.
//
// WHY (B) IS A SUBPROCESS AND NOT A RECREATION. docs/STANDARDS.md Section 4's SES-45 rule: "A test
// must assert against the REAL implementation. Logic recreated inside the test file is not a test
// -- it is a second implementation agreeing with itself." run-all.js's pass/fail decision is
// `process.exit(failCount > 0 ? 1 : 0)` and lives in that file's main(); the only honest way to
// assert it from here is to run that file. `--dir` exists for exactly this (its own header calls it
// "used by this session's own meta-test to point at a fixture directory").
//
// THE ONE PROPERTY THE WHOLE SHIP RESTS ON, and the reason arm (B) has a negative control on both
// sides: a DECLARED not-run part must exit 0 and a real throw must exit 1. If those two ever
// collapse into each other, making this job blocking is either a rubber stamp (everything passes)
// or a permanent red (every credential-free run fails) -- the two failures SES-180 has spent three
// ships avoiding. Neither would be visible from the YAML.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { gateModeRequested } from "../../scripts/check-session-docs.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CI_YML = path.join(REPO, ".github", "workflows", "ci.yml");
const RUN_ALL = path.join(REPO, "tests", "regression", "run-all.js");

// The `checks:` job's body -- from its own key to the next top-level job key or end of file.
// Deliberately scoped: `continue-on-error` anywhere in the file would also match the header's
// prose about it, and a guard that fires on its own documentation is the check-11 defect
// (v7.0.219, this same ticket's cycle) rebuilt.
function checksJobBody(yml) {
  const start = yml.indexOf("\n  checks:");
  assert.notStrictEqual(start, -1, "ci.yml must still define a `checks:` job");
  const rest = yml.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}\w[\w-]*:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

// ---------------------------------------------------------------------------
// (A) The workflow says it gates
// ---------------------------------------------------------------------------
function checksJobIsNotContinueOnError() {
  const body = checksJobBody(fs.readFileSync(CI_YML, "utf8"));
  assert.ok(
    !/^\s*continue-on-error:\s*true/m.test(body),
    "the `checks` job must not carry `continue-on-error: true`. Putting it back to quiet a red run " +
    "is edit (1) the workflow header forbids: a red run there means a test FAILED or a rule " +
    "statement drifted from its registry row. Fix the finding, never the job."
  );
}

function tripwireRunsTheGatingInvocation() {
  const body = checksJobBody(fs.readFileSync(CI_YML, "utf8"));
  const step = body.split("\n").find(l => l.includes("check-session-docs.js"));
  assert.ok(step, "the `checks` job must still run scripts/check-session-docs.js");
  assert.ok(
    /check-session-docs\.js\s+--gate\b/.test(step),
    "the tripwire step must pass --gate. The bare form always exits 0 BY CONTRACT (SES-199), so a " +
    "gating step running it is a step that can never fail -- edit (2) the workflow header forbids."
  );

  // The seam, driven through the REAL parser: the flag the YAML passes is the flag the script
  // recognises. A rename on either side would otherwise leave a green step that gates on nothing.
  const flag = step.match(/check-session-docs\.js\s+(--\S+)/)[1];
  assert.strictEqual(
    gateModeRequested(["node", "check-session-docs.js", flag]), true,
    `ci.yml passes ${flag}, which the shipped gateModeRequested() does not recognise as gate mode`
  );

  // NEGATIVE CONTROL: the invocation this ship replaced. If it still switched the mode on, the
  // assertion above would be passing for a reason that has nothing to do with the flag.
  assert.strictEqual(gateModeRequested(["node", "check-session-docs.js"]), false);
}

function regressionStepSurvivesARedTripwire() {
  const body = checksJobBody(fs.readFileSync(CI_YML, "utf8"));
  const idx = body.indexOf("run-all.js");
  assert.notStrictEqual(idx, -1, "the `checks` job must still run tests/regression/run-all.js");
  // `if: always()` belongs to that step, so look between the step's own name and its run line.
  const stepBlock = body.slice(body.lastIndexOf("- name:", idx), idx);
  assert.ok(
    /^\s*if:\s*always\(\)\s*$/m.test(stepBlock),
    "the regression step must carry `if: always()`. Without it a red tripwire stops the job before " +
    "the suite runs, so every push after one drift finding reports a single problem while " +
    "concealing however many others -- the reason the header calls this load-bearing."
  );
}

// ---------------------------------------------------------------------------
// (B) The runner can actually fail, and can actually pass
// ---------------------------------------------------------------------------
function withFixtureDir(files, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ses180c-"));
  try {
    for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), body);
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runSuiteOver(dir) {
  const r = spawnSync(process.execPath, [RUN_ALL, `--dir=${dir}`], { encoding: "utf8" });
  assert.strictEqual(r.error, undefined, `could not run run-all.js: ${r.error && r.error.message}`);
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

// The fixtures import _lib/self-run.js by absolute path: run-all.js imports each file from the
// --dir it was given, so a relative specifier would resolve against the temp directory.
const SELF_RUN = JSON.stringify(
  new URL("./_lib/self-run.js", import.meta.url).href
);

function declaredNotRunPartIsNotAFailure() {
  const { code, out } = withFixtureDir({
    "a-declares.js":
      `import { notRun } from ${SELF_RUN};\n` +
      `export default async function () { notRun("the credentialed half", "no SUPABASE_URL here"); }\n`,
  }, runSuiteOver);

  assert.strictEqual(code, 0,
    "a test that DECLARES a part it could not run must not fail the suite. If this goes red, making " +
    "the CI job blocking paints every credential-free run permanently red -- the exact outcome " +
    "v7.0.219 shipped `continue-on-error` to avoid.");
  assert.ok(/NOT A FULL RUN: 1 part/.test(out),
    "the declaration must still be reported loudly; an invisible gap is indistinguishable from coverage");
}

function arealFailureStillFailsTheSuite() {
  // NEGATIVE CONTROL for the case above: same harness, same fixture shape, one variable -- the test
  // throws instead of declaring. Without this, the assertion above is satisfied by a runner that
  // has stopped failing on anything at all.
  const { code, out } = withFixtureDir({
    "b-throws.js":
      `export default async function () { throw new Error("a real regression"); }\n`,
  }, runSuiteOver);

  assert.strictEqual(code, 1, "a thrown assertion must still exit 1 -- that is what CI now gates on");
  assert.ok(/\[FAIL\] b-throws\.js -- a real regression/.test(out));
}

function aDeclarationDoesNotRescueAFailingTest() {
  // The two arms above are each other's control at the file level; this one closes the seam
  // BETWEEN them, which is where run-all.js's "drain on both arms" rule lives. A test that
  // declares a part and THEN throws must still fail -- otherwise a single notRun() call anywhere
  // becomes a way to launder a real failure past the gate.
  const { code } = withFixtureDir({
    "c-declares-then-throws.js":
      `import { notRun } from ${SELF_RUN};\n` +
      `export default async function () { notRun("a half", "unavailable here"); throw new Error("boom"); }\n`,
  }, runSuiteOver);

  assert.strictEqual(code, 1, "a declaration must not convert a failing test into a passing suite");
}

function run() {
  checksJobIsNotContinueOnError();
  tripwireRunsTheGatingInvocation();
  regressionStepSurvivesARedTripwire();
  declaredNotRunPartIsNotAFailure();
  arealFailureStillFailsTheSuite();
  aDeclarationDoesNotRescueAFailingTest();
}

selfRun(import.meta.url, run);
export default run;
