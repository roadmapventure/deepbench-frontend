// DeepBench v7.0.888 | tests/regression/agt-428-suite-leaves-history.test.mjs | AGT-428
//
// FEATURE: AGT-428 -- a regression run leaves its checkout's history alone, and a history that
// changes mid-run is REPORTED on one line.
//
// THE DEFECT, measured on tree fd22cfd (shallow=true, 241 commits): package.json's `prebuild` runs
// `node scripts/platform-stats.js --soft` on every `npm run build`, and that script fired
// `git fetch --unshallow --quiet` whenever `git rev-parse --is-shallow-repository` said `true`.
// verifier.js GATES runs the build BEFORE `run-all.js`, so the gate silently rewrote the history
// the suite was about to be graded over -- reproduced in a depth-1 `file://` clone, 1 -> 3 commits.
// ARCHITECTURE.md §19v (:2564) needs one tree under both runs for a delta grade.
//
// THE FIX (kickoff calls (1)-(3)): the fetch STAYS but is opt-in under `PLATFORM_STATS_DEEPEN=1`
// (nothing sets it; commits_dev keeps its monotonic guard, pattern:65), and run-all.js REPORTS a
// mid-run change on one line with its exit code unchanged (the SES-180 shape).
//
// OFFLINE BY CONSTRUCTION (pattern:76): every fixture repository lives in `os.tmpdir()` and is
// removed in `finally`; the real tree is only READ (platform-stats.js is copied out of it, run-all.js
// is spawned against a fixture `--dir=`). The children carry a deliberately unusable SUPABASE_URL
// (`http://127.0.0.1:9`) -- platform-stats logs its shallow-clone decision before it ever opens a
// socket, and `--soft` turns the unreachable PATCH into exit 0 -- and `DEEPBENCH_TEST_SLOT=off`, so
// no child queues for the real `public.test_slots` line.
//
// ARMS (kickoff v7.0.888 §4/§6), each graded on its own:
//   A1 THE DISCRIMINATOR -- platform-stats on a depth-1 clone, no flag: stdout says
//      `shallow clone left as-is`, NOT `deepened shallow clone`, and the clone is still 1 commit.
//   A2 the same clone shape WITH PLATFORM_STATS_DEEPEN=1: `deepened shallow clone (1 → 3 commits)`,
//      and the clone is 3 commits -- the opt-in path still works, so A1 is a gate and not a break.
//   B1 run-all.js over a fixture dir whose one test touches nothing: exit 0, `[PASS] a-quiet.js`,
//      NO `HISTORY CHANGED MID-RUN` line, clone still 1 commit.
//   B2 the same run with a second fixture test that DOES unshallow the clone: exit 0 (the exit code
//      is unchanged by design) and `HISTORY CHANGED MID-RUN: 1 -> 3 commits` on stdout.
//   C  static: package.json's prebuild still calls the script; the opt-in gate precedes the fetch in
//      platform-stats.js; and in run-all.js the before-read precedes the first dynamic import which
//      precedes the after-read.
//
// BASELINE: A1 is RED on the unchanged tree -- platform-stats.js deepens unconditionally there
// (`deepened shallow clone (1 → 3 commits)`, count 1 -> 3). B2 is RED too: run-all.js prints no
// such line. A2, B1's [PASS] and C's package.json needle hold either way; that is what makes A1/B2
// the discriminators.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lf = t => String(t).replace(/\r\n/g, "\n");
const read = rel => lf(fs.readFileSync(path.join(ROOT, rel), "utf8"));

// Present and deliberately unusable -- see the header. PLATFORM_STATS_DEEPEN is DELETED, never set
// to "", so the no-flag arms run under the same absence an unattended cycle has.
function envE() {
  const env = {
    ...process.env,
    SUPABASE_URL: "http://127.0.0.1:9",
    SUPABASE_SERVICE_KEY: "agt428-fake",
    DEEPBENCH_TEST_SLOT: "off",
  };
  delete env.PLATFORM_STATS_DEEPEN;
  return env;
}

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", timeout: 120000 });
  if (r.error) throw new Error(`git ${args.join(" ")}: ${r.error.message}`);
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}`, stdout: lf(r.stdout || "").trim() };
}
function gitOk(args, cwd) {
  const r = git(args, cwd);
  if (r.code !== 0) throw new Error(`git ${args.join(" ")} exited ${r.code}: ${r.out.trim().split("\n")[0]}`);
  return r;
}
function node(args, env, opts = {}) {
  const r = spawnSync(process.execPath, args, { encoding: "utf8", env, timeout: 180000, ...opts });
  return { code: r.status, stdout: lf(r.stdout || ""), stderr: lf(r.stderr || ""), out: lf(`${r.stdout || ""}${r.stderr || ""}`) };
}
const count = repo => parseInt(gitOk(["rev-list", "--count", "HEAD"], repo).stdout, 10);
const isShallow = repo => gitOk(["rev-parse", "--is-shallow-repository"], repo).stdout;

// A depth-1 clone of a 3-commit source: shallow by construction, and the two numbers (1 and 3) are
// what both the deepen message and the HISTORY CHANGED line are asserted against.
function makeSource(tmp) {
  const src = path.join(tmp, "src");
  fs.mkdirSync(path.join(src, "scripts"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "scripts/platform-stats.js"), path.join(src, "scripts/platform-stats.js"));
  gitOk(["init", "-q"], src);
  const author = ["-c", "user.name=agt428", "-c", "user.email=agt428@deepbench.test"];
  for (const n of [1, 2, 3]) {
    fs.writeFileSync(path.join(src, `c${n}.txt`), `commit ${n}\n`);
    gitOk(["add", "-A"], src);
    gitOk([...author, "commit", "-q", "-m", `agt-428 fixture commit ${n}`], src);
  }
  assert.strictEqual(count(src), 3, "fixture source must hold exactly 3 commits");
  return src;
}
function makeClone(tmp, src, name) {
  const dest = path.join(tmp, name);
  gitOk(["clone", "-q", "--depth=1", `file://${src}`, dest], tmp);
  assert.strictEqual(isShallow(dest), "true", `${name} must be a shallow clone for this arm to mean anything`);
  assert.strictEqual(count(dest), 1, `${name} must start at 1 commit`);
  return dest;
}

const STATS = "scripts/platform-stats.js";

function armA1(tmp, src) {
  const clone = makeClone(tmp, src, "clone1");
  const r = node([path.join(clone, STATS), "--soft"], envE());
  assert.ok(
    r.stdout.includes("shallow clone left as-is"),
    `A1: no 'shallow clone left as-is' line -- stdout was: ${r.stdout.trim().split("\n").join(" / ") || "(empty)"}`
  );
  assert.ok(
    !r.stdout.includes("deepened shallow clone"),
    `A1: the script still deepened the clone -- stdout said: ${r.stdout.trim().split("\n").join(" / ")}`
  );
  assert.strictEqual(count(clone), 1, "A1: the clone's commit count must be untouched (1)");
}

function armA2(tmp, src) {
  const clone = makeClone(tmp, src, "clone2");
  const r = node([path.join(clone, STATS), "--soft"], { ...envE(), PLATFORM_STATS_DEEPEN: "1" });
  assert.ok(
    r.stdout.includes("deepened shallow clone (1 → 3 commits)"),
    `A2: the opt-in path did not deepen -- stdout was: ${r.stdout.trim().split("\n").join(" / ") || "(empty)"}`
  );
  assert.strictEqual(count(clone), 3, "A2: under the flag the clone must reach 3 commits");
}

const QUIET = "export default async function run() {}\n";
const DEEPENS = 'import { spawnSync } from "child_process";\n'
  + 'export default async function run() {\n'
  + '  if (spawnSync("git", ["-C", process.env.AGT428_CLONE, "fetch", "--unshallow", "--quiet"]).status !== 0)\n'
  + '    throw new Error("no deepen");\n'
  + '}\n';

function armsB(tmp, src) {
  const clone = makeClone(tmp, src, "clone3");
  const dir = path.join(clone, "t");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "a-quiet.js"), QUIET);
  const env = { ...envE(), AGT428_CLONE: clone };
  const runAll = ["tests/regression/run-all.js", `--dir=${dir}`];

  // B1 -- nothing touches the history, so nothing is reported.
  const b1 = node(runAll, env, { cwd: ROOT });
  assert.strictEqual(b1.code, 0, `B1: run-all exited ${b1.code} -- ${b1.out.trim().split("\n").slice(-3).join(" / ")}`);
  assert.ok(b1.stdout.includes("[PASS] a-quiet.js"), `B1: no [PASS] a-quiet.js -- stdout: ${b1.stdout.trim()}`);
  assert.ok(
    !b1.stdout.includes("HISTORY CHANGED MID-RUN"),
    `B1: a quiet run must report no history change -- stdout: ${b1.stdout.trim()}`
  );
  assert.strictEqual(count(clone), 1, "B1: the clone must still be 1 commit after a quiet run");

  // B2 -- a test deepens the clone mid-run. The line appears; the exit code does NOT change.
  fs.writeFileSync(path.join(dir, "b-deepens.js"), DEEPENS);
  const b2 = node(runAll, env, { cwd: ROOT });
  assert.strictEqual(b2.code, 0, `B2: exit code must stay 0 (SES-180 shape), got ${b2.code} -- ${b2.out.trim().split("\n").slice(-3).join(" / ")}`);
  assert.ok(
    b2.stdout.includes("HISTORY CHANGED MID-RUN: 1 -> 3 commits"),
    `B2: no 'HISTORY CHANGED MID-RUN: 1 -> 3 commits' line -- stdout: ${b2.stdout.trim()}`
  );
  assert.strictEqual(count(clone), 3, "B2: the fixture test must actually have deepened the clone");
}

function armC() {
  const pkg = read("package.json");
  assert.ok(
    pkg.includes('"prebuild": "node scripts/platform-stats.js --soft"'),
    "C: package.json's prebuild must still run platform-stats.js --soft -- that is the path this ticket gates"
  );
  const stats = read(STATS);
  const gate = stats.indexOf("PLATFORM_STATS_DEEPEN");
  const fetchAt = stats.indexOf("git fetch --unshallow");
  assert.ok(gate !== -1, "C: platform-stats.js names no PLATFORM_STATS_DEEPEN");
  assert.ok(fetchAt !== -1, "C: platform-stats.js no longer holds the unshallow fetch -- call (1) keeps it");
  assert.ok(gate < fetchAt, `C: the opt-in gate must precede the fetch (gate ${gate}, fetch ${fetchAt})`);

  const runAll = read("tests/regression/run-all.js");
  const before = runAll.indexOf("const historyBefore = commitCount();");
  const imp = runAll.indexOf("await import(pathToFileURL(fullPath).href)");
  const after = runAll.indexOf("const historyAfter = commitCount();");
  assert.ok(before !== -1 && imp !== -1 && after !== -1, `C: run-all.js is missing a needle (before ${before}, import ${imp}, after ${after})`);
  assert.ok(before < imp, `C: the before-read must precede the first import (${before} < ${imp})`);
  assert.ok(imp < after, `C: the after-read must follow the last test (${imp} < ${after})`);
}

async function run() {
  // One git spawn failure (no git on PATH, a sandbox that refuses file:// clones) is a run that did
  // not happen, never a verdict on the fix.
  let tmp, src;
  try {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt428-"));
    src = makeSource(tmp);
  } catch (e) {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
    notRun("agt-428 fixture", `could not build the depth-1 clone fixture: ${e.message.split("\n")[0]}`);
    return;
  }
  try {
    const ARMS = {
      "A1-no-flag-leaves-it": () => armA1(tmp, src),
      "A2-flag-still-deepens": () => armA2(tmp, src),
      "B1B2-run-all-reports": () => armsB(tmp, src),
      "C-static-wiring": () => armC(),
    };
    const passed = [], failed = [];
    for (const [name, fn] of Object.entries(ARMS)) {
      try { await fn(); passed.push(name); }
      catch (e) { failed.push(`${name}: ${e.message.split("\n")[0]}`); }
    }
    console.log(`  [AGT-428] ${passed.length} of ${Object.keys(ARMS).length} arms passed: ${passed.map(n => n.split("-")[0]).join(",") || "none"}`);
    if (failed.length) assert.fail(`${failed.length} arm(s) failed -- ` + failed.join(" | "));
    return passed;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

selfRun(import.meta.url, run);
export default run;
