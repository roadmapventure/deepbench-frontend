// DeepBench v7.0.990 | tests/regression/agt-629-new-test-absent-pre-build.test.mjs | AGT-629
//
// FEATURE: AGT-629 -- a test the pre-build tree GENUINELY LACKED is not an unmeasured red.
//
// THE DEFECT, measured 2026-11-10 and hit by three cycles in one day (e5ac6f3b, 1d955358,
// 041a06c3). Step 7 measures the baseline BEFORE the Builder is spawned, so a test file the build is
// about to ADD can never be in it -- `relatedTests()` drops a name no file backs -- and
// `baselineCoverageFinding()` then saw a graded name with no measurement behind it and refused
// (exit 2 `baseline-narrower-than-graded-set`). That refusal is right in every other case: grading a
// red against a measurement nobody took is the mis-attribution AGT-457 exists to stop. What it could
// not tell apart is WHY the name was missing -- a narrower baseline MISSED a test that existed; this
// one measured a tree where the test DID NOT EXIST.
//
// THE EXEMPTION IS A STATED FACT, NEVER AN INFERENCE, and that is the whole safety argument.
// `renderOut()` writes one `- <path> — ABSENT pre-build` line per declared test file the measured
// tree lacked; `absentPreBuildFrom()` reads them; ONLY a name on such a line is exempt. No keyword,
// no changed-files list, no kickoff byte spent.
//
// NOTHING IS CLEARED, which is what arms 3 and 4 spend their controls proving. Every other uncovered
// name still refuses with `baseline NARROWER` (AGT-457 kept), and `regressionDelta()` is NOT touched
// by this ticket -- a new test that goes RED is still never-measured, the suite's own exit code still
// stands, and the ship still blocks (pattern:166 -- a degrade does not remove a stop).
//
// OFFLINE BY CONSTRUCTION (pattern:76): arms 1-4 are pure calls over literal fixtures with the gate
// runner and the test-slot wrapper injected as stubs, so no gate spawns and no socket opens. Arm 5's
// one child runs in an `os.tmpdir()` tree removed in `finally`, with SUPABASE_URL pointed at a
// deliberately unusable `http://127.0.0.1:9` -- present, so the script's credential check passes;
// unusable, so a test that tried to reach Supabase would fail rather than read live data. Nothing
// here reads or writes the real tree.
//
// ARMS (kickoff v7.0.990 section 6):
//   1  `absentDeclaredTests()` -- the one judgment: a declared test the tree lacks, and only that.
//      CONTROL: `exists: () => true` declares nothing absent.
//   2  the line, round-tripped: nothing absent renders byte-identical to before, the ABSENT line is
//      NOT a per-test measurement line, and both readers agree about which names are which.
//   3  the exemption, with its two controls: without `absent` the name is uncovered (the live
//      defect), and an uncovered name that is NOT absent still refuses.
//   4  the same pair through `gradeDelivery()` -- 7a's and the re-grade lane's one grading path.
//   5  the CLI end to end: the script writes the ABSENT line and the gate's own reader reads it.
//
// BASELINE: RED on the unchanged tree -- `scripts/pre-build-baseline.js` exports no
// `absentDeclaredTests` and `scripts/verifier.js` no `absentPreBuildFrom`, so this file exits 1 at
// import (kickoff section 6 item 1, measured on tree 693ffb4).

import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { absentDeclaredTests, renderOut } from "../../scripts/pre-build-baseline.js";
import {
  absentPreBuildFrom,
  measuredTestsFrom,
  readRegressionBaseline,
  baselineCoverageFinding,
  gradeDelivery,
} from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts/pre-build-baseline.js");
const lf = t => String(t).replace(/\r\n/g, "\n");

// ---- the fixtures, ONE SET for all five arms so no two can disagree about what they grade -----
const TR = "tests/regression";
const NEW = `${TR}/new.test.mjs`;
const N = ["new.test.mjs"];
const M = ["a.test.mjs", "b.test.mjs"];
const G = [...M, ...N];
const block = [
  `- ${TR}/a.test.mjs — green`,
  `- ${TR}/b.test.mjs — green`,
  "Red set: 0 of 2",
].join("\n");
const base = { block, sha7: "abc1234", iso: "x", cycleId: "c", declaredCount: 3 };
const text = renderOut({ ...base, absent: [NEW] });
// The reader takes an injected `readFile`, so the round trip costs no file and no tree.
const read = readRegressionBaseline("f", () => text);
const args = { measured: M, graded: G, instrument: read.instrument };

function tmpDir(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `agt629-${tag}-`));
}
function put(root, rel, body) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body);
}

// ---- 1: the one judgment -- a DECLARED test file the measured tree does not have ---------------
function arm1() {
  const declared = ["scripts/x.js", NEW, `${TR}/a.test.mjs`, `${TR}/_h.js`];
  assert.deepStrictEqual(
    absentDeclaredTests({ declared, exists: p => p.endsWith("a.test.mjs") }),
    [NEW],
    "only a tests/regression test file the tree LACKS is absent: a script is not a test (scripts/x.js), " +
    "an underscore helper is not a test (_h.js), and a test that EXISTS was measured (a.test.mjs)");
  // CONTROL: the whole judgment is `exists`. A tree that has everything declares nothing absent, so
  // the exemption cannot fire on a tree where every declared test was there to be measured.
  assert.deepStrictEqual(
    absentDeclaredTests({ declared, exists: () => true }),
    [],
    "control: when the tree has every declared test, nothing is absent pre-build");
  assert.deepStrictEqual(absentDeclaredTests({ declared: undefined, exists: () => false }), [],
    "control: no declared files is an empty list, never a throw");
}

// ---- 2: the line -- additive, and NOT a measurement -------------------------------------------
function arm2() {
  // The whole back-compatibility claim in one assertion: with nothing absent the block is
  // byte-identical to what `renderOut()` wrote before this ticket, blank line included.
  assert.strictEqual(renderOut({ ...base, absent: [] }), renderOut(base),
    "a baseline with nothing absent must render byte-for-byte as before -- no line, no blank line");
  assert.ok(lf(text).split("\n").includes(`- ${NEW} — ABSENT pre-build`),
    `the absent declared test must be stated as its own line: ${text}`);
  // THE LINE IS NOT A PER-TEST MEASUREMENT LINE, and this is the pair that proves the two parses
  // cannot confuse them: `measuredTestsFrom` keys on RED|green|NOT RUN and must not harvest the
  // ABSENT name, or an absent test would be read as one the baseline ran.
  assert.deepStrictEqual(measuredTestsFrom(text), M,
    `measuredTestsFrom must read the two MEASURED names and NOT the ABSENT one: ${text}`);
  assert.deepStrictEqual(read.measured, M, "the reader carries the same measured names off the same read");
  assert.deepStrictEqual(absentPreBuildFrom(text), N,
    `absentPreBuildFrom must read exactly the ABSENT name, as a basename: ${text}`);
  assert.deepStrictEqual(read.absent, N,
    "the reader carries `absent` off the SAME read of the SAME file as `measured` and `instrument`");
  // The instrument half is untouched: the ABSENT line names a tests/ path and must not be mistaken
  // for the script that measured the block.
  assert.strictEqual(read.instrument, "scripts/pre-build-baseline.js",
    `the ABSENT line must not displace the instrument the header names: ${read.instrument}`);
}

// ---- 3: the exemption, and the refusal it does NOT weaken -------------------------------------
function arm3() {
  assert.strictEqual(baselineCoverageFinding({ ...args, absent: N }), null,
    "a graded name the baseline DECLARED absent pre-build is covered: the tree did not have it to measure");
  // CONTROL: the live defect. The same call without `absent` must still report the new test as
  // uncovered -- if this passed, the arm above would prove nothing about the new input.
  const control = baselineCoverageFinding(args);
  assert.ok(control, "control: without the ABSENT declaration the baseline must still refuse");
  assert.deepStrictEqual(control.uncovered, N,
    `control: the new test is the uncovered name -- the defect AGT-629 fixes: ${JSON.stringify(control)}`);
  // AGT-457 KEPT. An uncovered name that is NOT on an ABSENT line still refuses, and the absent name
  // is subtracted from the list rather than the list being discarded.
  const kept = baselineCoverageFinding({ ...args, graded: [...G, "other.test.mjs"], absent: N });
  assert.ok(kept, "AGT-457 KEPT: an uncovered name that was never declared absent must still refuse");
  assert.deepStrictEqual(kept.uncovered, ["other.test.mjs"],
    `AGT-457 KEPT: exactly the not-absent name refuses, and the absent one is exempt: ${JSON.stringify(kept)}`);
  assert.ok(kept.reason.includes("baseline NARROWER"),
    `AGT-457 KEPT: the refusal keeps its own words: ${kept.reason}`);
}

// ---- 4: the same pair through the ONE grading path 7a and the re-grade lane share --------------
async function arm4() {
  // Injected, so no gate spawns and no slot is taken: the arm grades the coverage decision alone.
  const run = async gate => ({ status: "green", fails: null, detail: "exit 0" });
  const slot = async (env, fn) => ({ ran: true, value: await fn() });
  const call = baselineRead => gradeDelivery({
    repoRoot: ROOT, cycleId: null, baselineRead, graded: G,
    only: { path: null, names: G }, run, slot,
  });

  const covered = await call(read);
  assert.strictEqual(covered.coverage, null,
    `gradeDelivery must GRADE a delivery whose only uncovered name was absent pre-build: ${JSON.stringify(covered.coverage)}`);
  // CONTROL: the same read with the declaration removed is the pre-AGT-629 cannot-run, returning
  // `{ coverage }` alone -- which is how three cycles were refused in one day.
  const refused = await call({ ...read, absent: [] });
  assert.ok(refused.coverage, "control: with no ABSENT declaration gradeDelivery must still refuse");
  assert.deepStrictEqual(refused.coverage.uncovered, N,
    `control: the refusal names the new test: ${JSON.stringify(refused.coverage)}`);
  assert.strictEqual(refused.gateResults, undefined,
    "control: a cannot-run returns `{ coverage }` ALONE -- no gate is graded");
}

// ---- 5: the CLI, end to end: the script writes the line and the gate's reader reads it ---------
function arm5() {
  const fx = tmpDir("cli");
  const out = path.join(fx, "out.txt");
  try {
    // The related set is exactly a.test.mjs: it names "x.js" as a whole quoted string, which is
    // scripts/related-tests.js's own second rule. new.test.mjs is DECLARED and does not exist --
    // the live shape of a build that is about to add its own test.
    put(fx, `${TR}/a.test.mjs`, 'const P = "x.js";\nprocess.exit(0);\n');
    put(fx, `${TR}/run-all.js`, "");
    put(fx, "k.md", [
      "- **Lanes:** session `orchestrator`; executor none.",
      "",
      "**T1 -- `scripts/x.js`**",
      "",
      `**T2 -- NEW \`${NEW}\`**`,
      "",
    ].join("\n"));
    const env = {
      ...process.env,
      DEEPBENCH_TEST_SLOT: "held",
      // Present, so the credential check passes; unusable, so nothing here can reach live data.
      SUPABASE_URL: "http://127.0.0.1:9",
      SUPABASE_SERVICE_KEY: "x",
    };
    const r = spawnSync(process.execPath,
      [SCRIPT, `--kickoff=${path.join(fx, "k.md")}`, `--out=${out}`, `--root=${fx}`],
      { encoding: "utf8", env, timeout: 120000 });
    assert.strictEqual(r.status, 0,
      `a credentialed run reports, it does not gate; got ${r.status}: ${r.stdout || ""}${r.stderr || ""}`);
    const handed = readRegressionBaseline(out);
    assert.deepStrictEqual(handed.absent, N,
      `the file the cycle hands 7a must carry the ABSENT name: ${lf(fs.readFileSync(out, "utf8"))}`);
    assert.deepStrictEqual(handed.measured, ["a.test.mjs"],
      `and exactly the one test the tree HAD as measured: ${lf(fs.readFileSync(out, "utf8"))}`);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

export default async function run() {
  arm1();
  arm2();
  arm3();
  await arm4();
  arm5();
}

selfRun(import.meta.url, run);
