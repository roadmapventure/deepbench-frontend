// DeepBench v7.0.874 | tests/regression/agt-457-one-instrument-one-baseline.test.mjs | AGT-457
//
// FEATURE: AGT-457 -- one instrument, one baseline, one refusal. The per-test lines `renderBlock()`
// has written since `v7.0.504` (`scripts/baseline-red-set.js`) and `renderOut()` embeds verbatim
// (`scripts/pre-build-baseline.js`) are now READ: `measuredTestsFrom()` harvests them, the two
// baseline readers carry `measured` / `instrument` / `present` beside `names`, `regressionDelta()`
// sorts a post name the baseline never measured into its own `neverMeasured` bucket instead of
// charging it as newly red, and `baselineCoverageFinding()` refuses a baseline narrower than the set
// being graded or measured by an instrument this gate cannot align.
//
// THE GUARD SENTENCE. A test the baseline MEASURED GREEN and a test the baseline NEVER RAN were the
// same absence to the delta, so both were charged to the delivery -- which is how cycle `a50537cc`
// blocked AGT-494 for a test its baseline never covered (pattern:162: a check grades the change,
// never the live world). After this ship the first is still charged (`newlyRed`) and only the second
// moves, into a list whose status is the suite's own exit code. NOTHING IS CLEARED: a never-measured
// red blocks exactly as before.
//
// OFFLINE BY CONSTRUCTION (pattern:76): every child runs with SUPABASE_URL / SUPABASE_SERVICE_KEY
// DELETED, every fixture lives in os.tmpdir() and is removed in `finally`, and the one verifier run
// that reaches 7a is `--dry-run` -- it records nothing and it must refuse BEFORE the gate loop, which
// the 60 s spawn timeout is what proves.
//
// ARMS (kickoff v7.0.874 section 6), each with a CONTROL that must fail:
//   A  the discriminator: regressionDelta() with `measured` splits newlyRed from neverMeasured, and
//      the status of a never-measured red is the suite's own. CONTROL: the same call with `measured`
//      omitted charges both names and its reason is byte-identical to the pre-AGT-457 one.
//   B  the refusal: a PRESENT-but-unparseable block is exit 1 `kickoff-baseline-unparseable`.
//      CONTROLS: the RED line restored -> 0; no `BASELINE (` paragraph at all -> 0 (the 1,014).
//   C  narrower: the block must cover the cycle's own measurement (exit 1) and the baseline must
//      cover the graded set at 7a (exit 2, no row). CONTROL: a block covering all four -> 0.
//   D  the instrument: `BASELINE_INSTRUMENTS` is the whole list, renderBlock() names itself, and an
//      uncredentialed measurement says so in words AGT-451 already refuses.
//
// BASELINE: RED on the unchanged tree -- verifier.js exports no measuredTestsFrom,
// baselineCoverageFinding or BASELINE_INSTRUMENTS, regressionDelta() returns no neverMeasured, and
// renderBlock() prints no Instrument: line.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFIER = path.join(ROOT, "scripts/verifier.js");
const BASELINE_SCRIPT = path.join(ROOT, "scripts/baseline-red-set.js");
const lf = t => String(t).replace(/\r\n/g, "\n");

// Both credentials DELETED, never set to "" -- an empty string and an absent key are different
// states and scripts/baseline-red-set.js's own check reads both, so the stricter one is what the
// arms run under.
function offlineEnv() {
  const env = { ...process.env, DEEPBENCH_TEST_SLOT: "held" };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  return env;
}
function node(args, env = offlineEnv(), opts = {}) {
  const r = spawnSync(process.execPath, args, { encoding: "utf8", env, timeout: 60000, ...opts });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}`, stdout: r.stdout || "", stderr: r.stderr || "" };
}
function payloadOf(r) {
  const line = r.stdout.trim().split("\n").filter(Boolean).pop();
  try { return JSON.parse(line); } catch { return assert.fail(`--json printed no payload: ${r.out}`); }
}
function tmpDir(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `agt457-${tag}-`));
}

// The four tests the ticket's own BASELINE block names, which is also arm A's renderOut() fixture.
const FOUR = [
  "agt-170-regression-delta-gate.test.mjs",
  "agt-391-selective-regression.test.mjs",
  "agt-451-pre-build-baseline.test.mjs",
  "ses-376-kickoff-size-cap.test.mjs",
];

// A kickoff that passes the cap and the lane line, so the BASELINE clause is what the exit code is
// about. `block` is pasted in as its own paragraph -- absent entirely when null, which is the shape
// 1,014 of the 1,119 kickoffs in docs/kickoffs/ have.
function kickoffFixture(block) {
  const head = [
    "<!-- DeepBench v7.0.874 | kickoff | AGT-457-fixture -->",
    "",
    "- **Lanes:** session `orchestrator`; executor none.",
    "",
    "**T1 - `scripts/x.js`**",
    "",
  ];
  // The block is its OWN paragraph -- one newline short of that and `readKickoffBaseline()` does not
  // see a block at all, which is the same false green this arm exists to catch.
  return `${head.join("\n")}${block === null ? "" : `\n${block}\n`}`;
}

// ---- A: THE DISCRIMINATOR -- measured green is charged, never measured is not -----------------
async function armA() {
  const m = await import(path.join(ROOT, "scripts/verifier.js"));
  const pre = await import(path.join(ROOT, "scripts/pre-build-baseline.js"));
  const red = await import(path.join(ROOT, "scripts/baseline-red-set.js"));

  const d = m.regressionDelta({ absolute: "red", baseline: ["a"], measured: ["a", "b"], post: ["a", "b", "c"] });
  assert.deepStrictEqual(d.standing, ["a"], `a is in the baseline, so it is STANDING: ${JSON.stringify(d)}`);
  assert.deepStrictEqual(d.newlyRed, ["b"],
    "b was MEASURED and was green on the unchanged tree, so its red IS this delivery's and stays charged -- " +
    "this is the half the ticket must not clear");
  assert.deepStrictEqual(d.neverMeasured, ["c"],
    "c is absent from the baseline AND from what it measured, so it is never-measured, not newly red");
  assert.strictEqual(d.status, "red", `the suite exited red and the delta must not move it: ${d.reason}`);
  assert.ok(d.reason.includes("b, c") === false && d.reason.includes("b (absent"),
    `the reason must charge b ALONE, never b and c: ${d.reason}`);

  // CONTROL: `measured` omitted must grade exactly as the pre-AGT-457 rule did, BYTE FOR BYTE. Every
  // existing caller (scripts/regrade-delivered.js, AGT-391's and AGT-451's arms) passes four keys.
  const control = m.regressionDelta({ absolute: "red", baseline: ["a"], post: ["a", "b", "c"] });
  assert.deepStrictEqual(control.newlyRed, ["b", "c"],
    "control: with no measured set no claim was made about what ran, so both names stay charged");
  assert.deepStrictEqual(control.neverMeasured, [],
    "control: [] here, never a name -- nothing may move off a claim nobody made");
  assert.strictEqual(control.reason,
    "regression RED on 2 newly red tests this delivery must answer for: b, c (absent from the 1-name " +
    "baseline). 1 other red test is standing (AGT-170)",
    "control: the reason must be byte-identical to the one origin/dev produced for this call");

  // NOTHING IS CLEARED: newlyRed empty and neverMeasured non-empty still returns the suite's own red.
  const only = m.regressionDelta({ absolute: "red", baseline: ["a"], measured: ["a"], post: ["a", "z"] });
  assert.strictEqual(only.status, "red",
    `a never-measured red BLOCKS exactly as before -- status is the absolute exit code: ${JSON.stringify(only)}`);
  assert.deepStrictEqual(only.neverMeasured, ["z"]);
  assert.deepStrictEqual(only.newlyRed, []);
  assert.ok(only.reason.includes("Nothing is cleared"),
    `the reason must SAY that nothing is cleared: ${only.reason}`);
  // And a fail-closed exit publishes no list at all.
  const nothing = m.regressionDelta({ absolute: "red", baseline: null, post: ["z"], measured: ["a"] });
  assert.strictEqual(nothing.neverMeasured, null,
    "a baseline nobody parsed reports neverMeasured: null -- [] would claim a measurement was read");

  // measuredTestsFrom() over a REAL renderOut() block: the four names of the ticket's own baseline.
  const block = red.renderBlock(FOUR.map(n => ({ path: `tests/regression/${n}`, code: 0 })));
  const rendered = pre.renderOut({ block, sha7: "e66fee81", iso: "2026-10-20T00:00:00.000Z", cycleId: "-", declaredCount: 12 });
  assert.deepStrictEqual(m.measuredTestsFrom(rendered), FOUR,
    `measuredTestsFrom() must harvest every per-test line of the file the cycle hands the gate: ${rendered}`);
  assert.deepStrictEqual(m.measuredTestsFrom(""), [],
    "an empty text measured nothing, and that is [] rather than a throw");
  // CONTROL: the parse is LINE-ANCHORED, so a block line quoted INSIDE an assertion message must not
  // become a measurement (the mutant failingTestsFrom and notRunTestsFrom are both anchored against).
  assert.deepStrictEqual(
    m.measuredTestsFrom("  [FAIL] x.test.mjs -- expected `- tests/regression/ghost.test.mjs — green`"), [],
    "control: a per-test line quoted in a failure message must NOT be read as a measurement");
}

// ---- B: THE REFUSAL -- a present-but-unreadable block, and the 1,014 it leaves alone -----------
async function armB() {
  const fx = tmpDir("refuse");
  try {
    const unparseable = path.join(fx, "unparseable.md");
    const parseable = path.join(fx, "parseable.md");
    const blockless = path.join(fx, "blockless.md");
    const HEAD = "BASELINE (credentialed, scripts/baseline-red-set.js, tree e66fee81, 2026-10-20):";
    // Says 1 red of 7 and names none: a list that disagrees with its own count is not a baseline.
    fs.writeFileSync(unparseable, kickoffFixture([HEAD, "- tests/regression/a.test.mjs — green", "Red set: 1 of 7"].join("\n")));
    fs.writeFileSync(parseable, kickoffFixture([HEAD,
      "- tests/regression/a.test.mjs — RED (exit 1): [FAIL] a.test.mjs -- boom", "Red set: 1 of 7"].join("\n")));
    fs.writeFileSync(blockless, kickoffFixture(null));

    const refused = node([VERIFIER, `--check-kickoff=${unparseable}`, "--json"]);
    assert.strictEqual(refused.code, 1,
      `a kickoff whose BASELINE block cannot be read must exit 1, got ${refused.code}: ${refused.out}`);
    const p = payloadOf(refused);
    assert.strictEqual(p.kind, "kickoff-baseline-unparseable", `wrong kind: ${JSON.stringify(p)}`);
    assert.strictEqual(p.remedy_owner, "designer",
      "an unreadable block is a re-assembly -- the Designer's own document, unlike AGT-451's uncredentialed one");
    assert.ok(p.reason.includes("Red set: 1 of 7 but names 0"),
      `the reason must carry kb.source verbatim -- the numbers ARE the diagnosis: ${p.reason}`);
    assert.strictEqual(p.baseline_present, true, "the payload must say the block was PRESENT");

    // CONTROL 1: restore the RED line and the count agrees with its names -- the same file is green.
    const ok1 = node([VERIFIER, `--check-kickoff=${parseable}`, "--json"]);
    assert.strictEqual(ok1.code, 0,
      `control: a block whose names match its count must stay exit 0, got ${ok1.code}: ${ok1.out}`);
    // CONTROL 2: NO `BASELINE (` paragraph is AGT-391's escape and 1,014 of 1,119 kickoffs take it.
    const ok2 = node([VERIFIER, `--check-kickoff=${blockless}`, "--json"]);
    assert.strictEqual(ok2.code, 0,
      `control: a kickoff with no BASELINE block must be UNTOUCHED, got ${ok2.code}: ${ok2.out}`);
    assert.strictEqual(payloadOf(ok2).kind, "kickoff-within-cap",
      "control: and it must reach the ordinary cap verdict, not a baseline finding");

    // The reader's own answer, so the refusal is keyed on `present` rather than on a missing name.
    const m = await import(path.join(ROOT, "scripts/verifier.js"));
    assert.strictEqual(m.readKickoffBaseline(lf(fs.readFileSync(blockless, "utf8"))).present, false,
      "a kickoff with no block reports present: false -- the fact the refusal is keyed on");
    assert.strictEqual(m.readKickoffBaseline(lf(fs.readFileSync(unparseable, "utf8"))).present, true,
      "a kickoff WITH a block reports present: true even when nothing in it could be parsed");
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

// ---- C: NARROWER -- at step 6/7 against the cycle's file, and at 7a against the graded set ------
async function armC() {
  const fx = tmpDir("narrower");
  try {
    const pre = await import(path.join(ROOT, "scripts/pre-build-baseline.js"));
    const red = await import(path.join(ROOT, "scripts/baseline-red-set.js"));
    const HEAD = "BASELINE (credentialed, scripts/baseline-red-set.js, tree e66fee81, 2026-10-20):";

    // The cycle's own credentialed measurement, over all four, in renderOut()'s real shape.
    const measuredFile = path.join(fx, "pre-build-baseline.txt");
    fs.writeFileSync(measuredFile, pre.renderOut({
      block: red.renderBlock(FOUR.map(n => ({ path: `tests/regression/${n}`, code: 0 }))),
      sha7: "e66fee81", iso: "2026-10-20T00:00:00.000Z", cycleId: "084b72e9", declaredCount: 12,
    }));

    // A block naming ONE of the four: it cannot answer for the other three.
    const narrow = path.join(fx, "narrow.md");
    fs.writeFileSync(narrow, kickoffFixture([HEAD, `- tests/regression/${FOUR[0]} — green`, "Red set: 0 of 1"].join("\n")));
    const r = node([VERIFIER, `--check-kickoff=${narrow}`, `--pre-build-baseline=${measuredFile}`, "--json"]);
    assert.strictEqual(r.code, 1, `a narrower block must exit 1, got ${r.code}: ${r.out}`);
    const p = payloadOf(r);
    assert.strictEqual(p.kind, "kickoff-baseline-narrower", `wrong kind: ${JSON.stringify(p)}`);
    assert.strictEqual(p.remedy_owner, "cycle",
      "the remedy is the cycle's own step 7 command -- re-measure and paste, never hand-edit the block");
    assert.deepStrictEqual(p.uncovered, FOUR.slice(1),
      `the refusal must NAME the three the block cannot answer for: ${JSON.stringify(p)}`);
    assert.strictEqual(p.measured_count, 1);
    assert.strictEqual(p.graded_count, 4);

    // CONTROL: the same two files with a block over all four -- the refusal is about COVERAGE, never
    // about the flag being present.
    const wide = path.join(fx, "wide.md");
    fs.writeFileSync(wide, kickoffFixture([HEAD, ...FOUR.map(n => `- tests/regression/${n} — green`), "Red set: 0 of 4"].join("\n")));
    const okWide = node([VERIFIER, `--check-kickoff=${wide}`, `--pre-build-baseline=${measuredFile}`, "--json"]);
    assert.strictEqual(okWide.code, 0, `control: a block covering all four must be green: ${okWide.out}`);

    // 7a: the baseline must cover the set this run is about to GRADE. Five related names against a
    // baseline measuring four -> exit 2, no gate, no row. `--dry-run` records nothing, and the 60 s
    // spawn timeout is the proof the refusal lands BEFORE the 20-minute gate loop.
    const relatedFile = path.join(fx, "related.csv");
    fs.writeFileSync(relatedFile, `${[...FOUR, "agt-457-one-instrument-one-baseline.test.mjs"].join(",")}\n`);
    const at7a = node([VERIFIER, "--dry-run", "--json",
      `--related=${relatedFile}`, `--pre-build-baseline=${measuredFile}`]);
    assert.strictEqual(at7a.code, 2,
      `a baseline narrower than the graded set is a CANNOT-RUN, never a verdict; got ${at7a.code}: ${at7a.out}`);
    const q = payloadOf(at7a);
    assert.strictEqual(q.kind, "cannot-run", `exit 2 must carry kind cannot-run: ${JSON.stringify(q)}`);
    assert.strictEqual(q.error, "baseline-narrower-than-graded-set");
    assert.deepStrictEqual(q.uncovered, ["agt-457-one-instrument-one-baseline.test.mjs"],
      `the one graded name the baseline never measured must be NAMED: ${JSON.stringify(q)}`);
    assert.ok(!("verdict" in q), `exit 2 is the absence of a verdict, so no verdict may be reported: ${JSON.stringify(q)}`);
    // The same refusal without --json, because the PROSE is what a cycle operator reads and the
    // payload is what the runner reads -- the sentence that says no row was written has to exist.
    const prose = node([VERIFIER, "--dry-run", `--related=${relatedFile}`, `--pre-build-baseline=${measuredFile}`]);
    assert.strictEqual(prose.code, 2, `the prose run must refuse identically: ${prose.out}`);
    assert.ok(/recording NOTHING/.test(prose.out), `the prose must say no row was written: ${prose.out}`);
    assert.ok(/AGT-457/.test(prose.out), `and it must name the rule that refused: ${prose.out}`);

    // CONTROL: the same run, the same baseline, a related set the baseline DOES cover -- it must get
    // PAST this clause and reach a verdict. `--repo=<the fixture dir>` is what makes the control cheap
    // and read-only (pattern:76): the gates then run against an empty directory and all three fail in
    // about a second, so nothing is built, nothing is written into this repo, and `--dry-run` records
    // no row. Asserting "a verdict was reached" rather than "exit 0" is the discriminating form -- a
    // run that died for some other reason would prove nothing about this clause.
    const covered = path.join(fx, "covered.csv");
    fs.writeFileSync(covered, `${FOUR.join(",")}\n`);
    const past = node([VERIFIER, "--dry-run", "--json", `--repo=${fx}`,
      `--related=${covered}`, `--pre-build-baseline=${measuredFile}`]);
    assert.ok(!/baseline-narrower-than-graded-set/.test(past.out),
      `control: a covered related set must NOT hit this refusal: ${past.out}`);
    const pastPayload = payloadOf(past);
    assert.ok(typeof pastPayload.verdict === "string" && pastPayload.verdict.length > 0,
      `control: it must reach a verdict rather than a cannot-run: ${JSON.stringify(pastPayload)}`);
    assert.strictEqual(pastPayload.recorded, false, "control: --dry-run must record nothing");
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

// ---- D: THE INSTRUMENT -- which script measured it, and whether it had credentials -------------
async function armD() {
  const m = await import(path.join(ROOT, "scripts/verifier.js"));
  const red = await import(path.join(ROOT, "scripts/baseline-red-set.js"));

  assert.deepStrictEqual([...m.BASELINE_INSTRUMENTS],
    ["scripts/baseline-red-set.js", "scripts/pre-build-baseline.js"],
    "the list is the rule: only a per-file measurement can be aligned with a one-process run's [FAIL] names");
  assert.ok(Object.isFrozen(m.BASELINE_INSTRUMENTS), "the list is frozen -- a caller may not widen the gate");

  // The one-process suite log is the instrument this gate CANNOT align, and it refuses even when the
  // coverage half has nothing to grade.
  const refused = m.baselineCoverageFinding({ measured: null, graded: null, instrument: "tests/regression/run-all.js" });
  assert.ok(refused, "a block measured by run-all.js is not a baseline this gate can align");
  assert.ok(refused.reason.includes("tests/regression/run-all.js"),
    `the refusal must name the instrument it read: ${refused.reason}`);
  // ACCEPTED: the cycle's own script, over a set it covers.
  assert.strictEqual(
    m.baselineCoverageFinding({ measured: FOUR, graded: FOUR.slice(0, 2), instrument: "scripts/pre-build-baseline.js" }),
    null, "the cycle's own instrument over a covered set is no finding at all");
  // NOT GRADED: a block that names no instrument and measured nothing we can read.
  assert.strictEqual(m.baselineCoverageFinding({ measured: null, graded: null, instrument: null }), null,
    "no instrument and no measurement is NOT GRADED -- the escape every blockless kickoff takes");
  // CONTROL: a near-miss name must NOT be accepted (the vacuous-control failure of SES-158).
  assert.ok(m.baselineCoverageFinding({ measured: FOUR, graded: FOUR, instrument: "scripts/pre-build-baselines.js" }),
    "control: a one-character mutation of an allowed instrument must still refuse");

  // The first path in the paragraph is the instrument, and renderOut() names it on line 1.
  assert.strictEqual(m.baselineInstrumentFrom("BASELINE (cycle-measured, credentialed, scripts/pre-build-baseline.js, tree x):\n- tests/regression/a.test.mjs — green"),
    "scripts/pre-build-baseline.js", "the header's own path is the instrument");
  assert.strictEqual(m.baselineInstrumentFrom("## 2. CONTEXT\n\nscripts/verifier.js is discussed here.\n"), null,
    "a path outside the BASELINE ( paragraph is not a statement about the measurement");
  // FOUND LIVE while building this ticket, and the reason the scan skips the block's own per-test
  // lines: a block whose header names no instrument reported the first test it MEASURED as the script
  // that measured it, and agt-451 arm E's credentialed control went red for that manufactured refusal.
  assert.strictEqual(m.baselineInstrumentFrom(
    "BASELINE (credentialed):\n- tests/regression/red.test.mjs \u2014 green\n- tests/regression/green.test.mjs \u2014 green\nRed set: 0 of 2"),
    null, "a per-test MEASUREMENT line is never the instrument -- a block that names none is NOT GRADED");
  assert.strictEqual(m.baselineInstrumentFrom(
    `BASELINE (credentialed):\n- tests/regression/red.test.mjs \u2014 green\nRed set: 0 of 1\n${red.INSTRUMENT_LINE}`),
    "scripts/baseline-red-set.js",
    "and the Instrument: line renderBlock() appends IS read, wherever it sits in the block");

  // renderBlock() names itself, as the block's LAST line, without disturbing the counts above it.
  const empty = red.renderBlock([]);
  assert.ok(empty.endsWith("Instrument: scripts/baseline-red-set.js (one child process per test file)"),
    `renderBlock([]) must end with its own Instrument line: ${JSON.stringify(empty)}`);
  assert.match(red.renderBlock([{ path: "tests/regression/a.test.mjs", code: 0 }, { path: "tests/regression/b.test.mjs", code: 1, output: "[FAIL] b.test.mjs -- boom" }]),
    /^Red set: 1 of 2$/m,
    "the `Red set:` line keeps its own line -- ses-396b pins exactly that anchor");

  // UNCREDENTIALED, in the words AGT-451 already refuses, as the FIRST line and on stderr, exit 0.
  const fx = tmpDir("uncred");
  try {
    const t = path.join(fx, "green.test.mjs");
    fs.writeFileSync(t, "process.exit(0);\n");
    const r = node([BASELINE_SCRIPT, `--tests=${t}`]);
    assert.strictEqual(r.code, 0, `it reports, it does not gate: ${r.out}`);
    const first = lf(r.stdout).split("\n")[0];
    assert.match(first, m.UNCREDENTIALED_BASELINE_RE,
      `the FIRST line of an uncredentialed measurement must arm AGT-451's refusal: ${JSON.stringify(first)}`);
    assert.match(lf(r.stderr), m.UNCREDENTIALED_BASELINE_RE,
      `and the cycle watching stderr must see it too: ${JSON.stringify(r.stderr)}`);
    assert.ok(lf(r.stdout).includes("Red set: 0 of 1"),
      `the measurement still happens and still reports: ${r.stdout}`);
    // The whole point: that block, pasted into a kickoff, is now REFUSED rather than graded.
    const kb = m.readKickoffBaseline(`BASELINE (pasted by hand, 2026-10-20):\n${lf(r.stdout).trim()}`);
    assert.strictEqual(kb.uncredentialed, true,
      `a pasted uncredentialed block must read as uncredentialed: ${JSON.stringify(kb)}`);
    assert.strictEqual(kb.names, null, "and names must be null -- [] would claim the tree was green");
    // CONTROL: the same measurement WITH credentials carries no such line.
    const cred = node([BASELINE_SCRIPT, `--tests=${t}`],
      { ...offlineEnv(), SUPABASE_URL: "http://127.0.0.1:9", SUPABASE_SERVICE_KEY: "x" });
    assert.strictEqual(cred.code, 0, cred.out);
    assert.doesNotMatch(lf(cred.stdout), m.UNCREDENTIALED_BASELINE_RE,
      `control: a credentialed measurement must NOT declare itself uncredentialed: ${cred.stdout}`);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

const ARMS = {
  "a-the-discriminator": armA,
  "b-the-refusal": armB,
  "c-narrower": armC,
  "d-the-instrument": armD,
};

export async function run() {
  const passed = [], failed = [];
  for (const [name, fn] of Object.entries(ARMS)) {
    try { await fn(); passed.push(name); }
    catch (e) { failed.push(`${name}: ${e.message.split("\n")[0]}`); }
  }
  console.log(`  [AGT-457] ${passed.length} of ${Object.keys(ARMS).length} arms passed: ${passed.map(n => n.split("-")[0]).join(",") || "none"}`);
  if (failed.length) assert.fail(`${failed.length} arm(s) failed -- ` + failed.join(" | "));
  return passed;
}

selfRun(import.meta.url, run);
export default run;
