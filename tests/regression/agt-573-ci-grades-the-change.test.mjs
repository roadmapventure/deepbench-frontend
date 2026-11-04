// DeepBench v7.0.958 | tests/regression/agt-573-ci-grades-the-change.test.mjs | AGT-573
//
// FEATURE: AGT-573 -- the blocking CI job grades THE CHANGE, never the live world (pattern:162).
// `Tripwire + regression (blocking)` ran the whole suite, so every dev push was graded against
// ~454 tests whose reds belong to other tickets: measured 2026-11-04, all 900 dev conclusions
// since 2026-09-16T16:35:31Z read that job = failure and `runner_green_states` sat 49 days on one
// row. The step now measures its own diff -- `git diff --name-only "$BASE_SHA" HEAD` ->
// scripts/related-tests.js -> `run-all.js --only=` -- and an EMPTY related set exits 0 with a
// printed reason rather than falling back to the full suite.
//
// OFFLINE BY CONSTRUCTION (pattern:76): arms A and B read ci.yml as text and spawn nothing; arm C
// spawns two node children with SUPABASE_URL / SUPABASE_SERVICE_KEY stripped and
// DEEPBENCH_TEST_SLOT=held, writes its fixture under os.tmpdir() and removes it in `finally`.
// Nothing here writes to the repository or to Supabase.
//
// ARMS (kickoff v7.0.958 §5 T2):
//   A -- the shipped step carries all ten clauses of the new shape and no `continue-on-error`.
//   B -- THE CONTROL: the six pre-change lines, reconstructed here, must LOSE the two clauses that
//        carry the ticket (`BASE_SHA:` and `--only=`). Without this the arm-A asserts would pass on
//        any step that merely mentions the suite (the LOO-013 lesson: assert which branch fired).
//   C -- the mechanism the step depends on, offline: related-tests.js over a list naming ci.yml
//        reports this guard and SES-180 (d)'s; over a path no test names it reports an empty set at
//        exit 0 (the branch the step's `if [ -z "$RELATED" ]` takes); and `run-all.js --only=` with
//        an empty set refuses -- `Nothing was run.`, exit 2, never a silent full suite.
//
// BASELINE: RED on the unchanged tree -- the step ran `run: node tests/regression/run-all.js` with
// no BASE_SHA, no diff and no --only, so arm A fails on six clauses at once.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CI_REL = ".github/workflows/ci.yml";
const SELF = "agt-573-ci-grades-the-change.test.mjs";
const SUITE_RUN = "node tests/regression/run-all.js";

// The step block, read exactly the way SES-180 (d)'s shipped extractor reads it: never the whole
// file, because the header commentary above `name: CI` quotes the invocation while explaining the
// defect, and a whole-file search grades that prose instead of the step.
export function suiteStep(yaml) {
  const i = String(yaml).indexOf("\nname: CI");
  const body = i < 0 ? "" : String(yaml).slice(i);
  const blocks = body.split(/\n(?= {6}- )/);
  return blocks.find(b => /^ {6}- /.test(b) && b.includes(SUITE_RUN)) || "";
}

// One clause per line of the shipped shape. Each is the whole of some property: remove its line
// from ci.yml and the step stops grading the change (or stops being credentialed), which is what
// arm B proves against the retired six lines.
const CLAUSES = [
  { label: "if: always()", ok: b => b.includes("if: always()") },
  {
    label: "SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}",
    ok: b => b.includes("SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}"),
  },
  {
    label: "BASE_SHA: ${{ github.event.pull_request.base.sha || github.event.before }}",
    ok: b => b.includes("BASE_SHA: ${{ github.event.pull_request.base.sha || github.event.before }}"),
  },
  { label: "set -euo pipefail", ok: b => b.includes("set -euo pipefail") },
  {
    label: 'git fetch --no-tags --depth=1 origin "$BASE_SHA"',
    ok: b => b.includes('git fetch --no-tags --depth=1 origin "$BASE_SHA"'),
  },
  {
    label: 'git diff --name-only "$BASE_SHA" HEAD',
    ok: b => b.includes('git diff --name-only "$BASE_SHA" HEAD'),
  },
  {
    label: "scripts/related-tests.js --files-from=",
    ok: b => b.includes("scripts/related-tests.js --files-from="),
  },
  { label: 'if [ -z "$RELATED" ]', ok: b => b.includes('if [ -z "$RELATED" ]') },
  {
    // The empty-set branch EXITS 0 rather than running everything, and it must be a line of its
    // own after the guard -- `exit 0` inside the `if` condition's own line would prove nothing.
    label: "a later line exactly `exit 0`",
    ok: b => {
      const lines = String(b).split("\n").map(l => l.trim());
      const guard = lines.findIndex(l => l.includes('if [ -z "$RELATED" ]'));
      return guard !== -1 && lines.slice(guard + 1).includes("exit 0");
    },
  },
  { label: 'run-all.js --only="$RELATED"', ok: b => b.includes('run-all.js --only="$RELATED"') },
  { label: "no continue-on-error", ok: b => !b.includes("continue-on-error") },
];

// Every clause that the given block loses, all of them, so a control can name more than one.
export function missingClauses(block) {
  return CLAUSES.filter(c => !c.ok(block)).map(c => c.label);
}

// ---- A: the shipped step grades the change -----------------------------------------------------
function armA() {
  const yaml = fs.readFileSync(path.join(ROOT, CI_REL), "utf8").replace(/\r\n/g, "\n");
  const block = suiteStep(yaml);
  assert.ok(block, `the regression-suite step was not found in ${CI_REL} -- the anchors moved`);
  // One assert per clause, in the shipped order. The whole missing list rides in every message
  // because an assert stops at the FIRST miss: a mutation that removes several lines at once would
  // otherwise report one of them and leave the reader to guess at the rest.
  const missing = missingClauses(block);
  for (const c of CLAUSES) {
    assert.ok(c.ok(block),
      `${CI_REL}'s regression step does not satisfy \`${c.label}\` (missing: ${missing.map(l => `\`${l}\``).join(", ")})`);
  }
  console.log("  [arm A] ok");
}

// ---- B: the pre-change step must lose the two clauses that carry the ticket ---------------------
function armB() {
  const preChange = [
    "      - name: Regression suite (credentialed)",
    "        if: always()",
    "        env:",
    "          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}",
    "          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}",
    `        run: ${SUITE_RUN}`,
  ].join("\n");

  const missing = missingClauses(preChange);
  assert.ok(missing.some(l => l.includes("BASE_SHA:")),
    "the pre-change step must FAIL the `BASE_SHA:` clause -- if it does not, arm A would pass on a " +
      `step that never learns what changed; missing: ${JSON.stringify(missing)}`);
  assert.ok(missing.some(l => l.includes("--only=")),
    "the pre-change step must FAIL the `--only=` clause -- if it does not, arm A is green on the " +
      `full-suite invocation this ticket exists to retire; missing: ${JSON.stringify(missing)}`);
  // And it keeps the three SES-180 (d) / AGT-168 pins, so arm A's reds above are THIS change's and
  // not a side effect of reconstructing the block wrongly.
  assert.ok(!missing.includes("if: always()") && !missing.includes("no continue-on-error"),
    `the reconstructed pre-change step must still carry the pinned clauses; missing: ${JSON.stringify(missing)}`);
  console.log("  [arm B] ok");
}

// ---- C: the mechanism the step calls, offline --------------------------------------------------
function offlineEnv() {
  const env = { ...process.env, DEEPBENCH_TEST_SLOT: "held" };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  return env;
}
function node(args) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", env: offlineEnv(), timeout: 120000 });
  return { code: r.status, stdout: r.stdout || "", out: `${r.stdout || ""}${r.stderr || ""}` };
}

function armC() {
  // Assembled rather than written as one literal ON PURPOSE: related-tests.js relates a test to any
  // path it names as a whole quoted string, so spelling this absent path in one quoted piece would
  // make THIS file related to it and the empty-set assertion below could never fail.
  const UNNAMED = "docs/agt-573-no-test-names" + "-this.md";
  const RELATED_CLI = path.join(ROOT, "scripts", "related-tests.js");
  const RUN_ALL = path.join(ROOT, "tests", "regression", "run-all.js");
  const fx = fs.mkdtempSync(path.join(os.tmpdir(), "agt573-"));
  try {
    const list = path.join(fx, "changed.txt");

    fs.writeFileSync(list, `${CI_REL}\n`);
    const hit = node([RELATED_CLI, `--files-from=${list}`]);
    assert.strictEqual(hit.code, 0, `related-tests over ${CI_REL} exited ${hit.code}: ${hit.out}`);
    const names = hit.stdout.trim().split(",").filter(Boolean);
    for (const want of ["SES-180d-ci-credentialed-regression.js", SELF]) {
      assert.ok(names.includes(want),
        `a change to ${CI_REL} must grade \`${want}\`, so CI runs it; got ${JSON.stringify(names)}`);
    }

    fs.writeFileSync(list, `${UNNAMED}\n`);
    const empty = node([RELATED_CLI, `--files-from=${list}`]);
    assert.strictEqual(empty.code, 0, `an unnamed path must exit 0, got ${empty.code}: ${empty.out}`);
    assert.strictEqual(empty.stdout.trim(), "",
      `a path no test names must yield an empty set -- the step's \`if [ -z "$RELATED" ]\` branch; got ${empty.stdout.trim()}`);

    const refused = node([RUN_ALL, "--only="]);
    assert.strictEqual(refused.code, 2, `run-all.js --only= (empty) must exit 2, got ${refused.code}: ${refused.out}`);
    assert.ok(refused.out.includes("Nothing was run."),
      `run-all.js --only= must refuse out loud rather than fall back to the full suite: ${refused.out}`);
    assert.ok(!refused.out.includes("[PASS]"), `nothing may run on an empty --only set: ${refused.out}`);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
  console.log("  [arm C] ok");
}

async function run() {
  armA();
  armB();
  armC();
  return ["A", "B", "C"];
}

selfRun(import.meta.url, run);
export default run;
