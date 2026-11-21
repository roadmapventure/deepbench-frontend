// DeepBench v7.0.1101 | tests/regression/agt-598-baseline-provenance.test.mjs | AGT-598
//
// FEATURE: AGT-598 -- a BASELINE block that says `cycle-measured` IS this cycle's measurement, or it
// is refused. Before this, `--check-kickoff` graded a block's INSTRUMENT (AGT-457) and its WIDTH
// (AGT-457's coverage clause) and never its NUMBERS: the real AGT-431 kickoff, whose block says
// cycle-measured and `Red set: 0 of 18`, drew no refusal when the run was armed with a measurement
// file saying 0 of 12. 62 kickoffs on this tree make the cycle-measured claim.
//
// WHAT IS GRADED AND WHAT IS NOT (the Designer's calls D1-D3, carried here as arms rather than prose):
//   D1  "matches" = both `Red set` numbers and the tree (either prefix of the other), never a
//       byte-for-byte paste -- a 36-test block does not fit the kickoff cap. Arms b, c, e.
//   D2  armed ONLY by `--pre-build-baseline=<file>`, which runbook step 7 already passes. A bare
//       `--check-kickoff` stays exit 0 and SAYS it did not grade (`baseline_note`). Arm f.
//   D3  only a header starting `BASELINE (cycle-measured` is graded; a Designer-measured block is
//       ungraded here and both instruments stay admissible. Arm g.
//
// OFFLINE BY CONSTRUCTION (pattern:76): every child runs with SUPABASE_URL and SUPABASE_SERVICE_KEY
// DELETED from its env, every fixture lives in an `os.tmpdir()` directory removed in `finally`, and
// nothing here writes inside the repo tree.
//
// BASELINE: ABSENT pre-build -- this file is the one AGT-598 creates, and on the unchanged tree
// scripts/verifier.js exports neither `baselineStampFrom` nor `baselineProvenanceFinding`.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { baselineStampFrom, baselineProvenanceFinding } from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFIER = path.join(ROOT, "scripts/verifier.js");
const REAL = path.join(ROOT, "docs/kickoffs/v7.0.937-AGT-431-rescore-door.md");

// The two lines of a cycle-measured hand-off, as `scripts/pre-build-baseline.js` prints them.
function file(tree, r, n) {
  return [
    `BASELINE (cycle-measured, credentialed, scripts/pre-build-baseline.js, tree ${tree}, `
      + "2026-11-03T00:00:00.000Z, cycle -; related set over 3 declared files):",
    `Red set: ${r} of ${n}`,
  ].join("\n");
}
// The smallest document the --check-kickoff branch grades as a kickoff: the lane declaration
// (SES-359), one task naming one file, and the block. Same shape as agt-451's own fixture, so the
// two files cannot disagree about what "a kickoff" is.
function kickoff(block) {
  return [
    "- **Lanes:** session `orchestrator`; executor none.",
    "",
    "**T1 - `scripts/x.js`**",
    "",
    block,
    "",
  ].join("\n");
}

// Both credentials DELETED, never set to "" -- an absent key and an empty one are different states.
function offlineEnv() {
  const env = { ...process.env, DEEPBENCH_TEST_SLOT: "held" };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  return env;
}
function verifier(args) {
  const r = spawnSync(process.execPath, [VERIFIER, ...args, "--json"],
    { encoding: "utf8", env: offlineEnv(), cwd: ROOT, timeout: 120000 });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}`, stdout: r.stdout || "" };
}
function payload(r) {
  const line = String(r.stdout).trim().split("\n").filter(Boolean).pop();
  try { return JSON.parse(line); } catch { assert.fail(`--json printed no payload: ${r.out}`); }
}
function tmpDir(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `agt598-${tag}-`));
}

// THE MEASUREMENT every arm grades against: 0 of 12, on tree 5b9b953.
const M = baselineStampFrom(file("5b9b953", 0, 12));

// ---- a: the stamp, read off the REAL kickoff rather than a fixture --------------------------
async function armA() {
  assert.deepStrictEqual(baselineStampFrom(fs.readFileSync(REAL, "utf8")),
    { cycleMeasured: true, red: 0, of: 18, tree: "5b9b953" },
    "the stamp must read the shipped AGT-431 block: cycle-measured, 0 of 18, tree 5b9b953");
  // CONTROL: no block is null, never a zeroed stamp -- a zeroed stamp would be a claim nobody made.
  assert.strictEqual(baselineStampFrom("no block here"), null,
    "control: a text with no BASELINE paragraph stamps nothing");
}

// ---- b: the four shapes that are NOT a finding ----------------------------------------------
async function armB() {
  assert.strictEqual(baselineProvenanceFinding({ block: M, measurement: M }), null,
    "the measurement against itself is never a finding");
  assert.strictEqual(baselineProvenanceFinding({ block: { ...M, tree: "5b9b953aa" }, measurement: M }), null,
    "D1: a longer tree sha whose prefix is the measured one is the SAME tree");
  assert.strictEqual(baselineProvenanceFinding({ block: { ...M, of: 18, cycleMeasured: false }, measurement: M }), null,
    "D3: a block that does not claim cycle-measured is ungraded here, even with the wrong count");
  assert.strictEqual(baselineProvenanceFinding({ block: M, measurement: null }), null,
    "D2: no handed measurement, nothing to grade against");
}

// ---- c: the differs, worded exactly as the refusal will read them ----------------------------
async function armC() {
  assert.deepStrictEqual(baselineProvenanceFinding({ block: { ...M, of: 18 }, measurement: M }).differs,
    ["count: the block says Red set 0 of 18, the cycle measured 0 of 12"],
    "a count differ must carry BOTH numbers -- the whole diagnosis is 18 against 12");
  assert.deepStrictEqual(baselineProvenanceFinding({ block: { ...M, tree: "1111111" }, measurement: M }).differs,
    ["tree: the block says 1111111, the cycle measured 5b9b953"],
    "a tree differ names both shas");
  assert.deepStrictEqual(baselineProvenanceFinding({ block: { ...M, tree: null }, measurement: M }).differs,
    ["tree: the block says none, the cycle measured 5b9b953"],
    "a block naming no tree says none, never the word null");
}

// ---- d: THE DISCRIMINATOR -- the real kickoff against a measurement it is not ----------------
async function armD() {
  const fx = tmpDir("real");
  try {
    const F12 = path.join(fx, "f12.txt");
    fs.writeFileSync(F12, `${file("5b9b953", 0, 12)}\n`);
    const r = verifier([`--check-kickoff=${REAL}`, `--pre-build-baseline=${F12}`]);
    assert.strictEqual(r.code, 1,
      `the AGT-431 kickoff says cycle-measured 0 of 18 and the cycle measured 0 of 12 -- exit 1, got ${r.code}: ${r.out}`);
    const p = payload(r);
    assert.strictEqual(p.kind, "kickoff-baseline-not-the-measurement", `kind: ${JSON.stringify(p.kind)}`);
    assert.strictEqual(p.remedy_owner, "cycle",
      "the remedy is the cycle's own step 7 paste, never a Designer re-assembly");
    assert.ok(String(p.reason).includes("Red set 0 of 18") && String(p.reason).includes("measured 0 of 12"),
      `the reason must name both counts: ${p.reason}`);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

// ---- e: both directions off ONE measurement file ---------------------------------------------
async function armE() {
  const fx = tmpDir("both");
  try {
    const F12 = path.join(fx, "f12.txt");
    fs.writeFileSync(F12, `${file("5b9b953", 0, 12)}\n`);
    const ok = path.join(fx, "k-matches.md");
    fs.writeFileSync(ok, kickoff(file("5b9b953", 0, 12)));
    const good = verifier([`--check-kickoff=${ok}`, `--pre-build-baseline=${F12}`]);
    assert.strictEqual(good.code, 0,
      `the measured numbers must PASS -- a gate that refuses its own measurement grades nothing: ${good.out}`);
    const bad = path.join(fx, "k-differs.md");
    fs.writeFileSync(bad, kickoff(file("5b9b953", 0, 18)));
    const refused = verifier([`--check-kickoff=${bad}`, `--pre-build-baseline=${F12}`]);
    assert.strictEqual(refused.code, 1,
      `the same file against an 18 block must refuse, got ${refused.code}: ${refused.out}`);
    assert.strictEqual(payload(refused).kind, "kickoff-baseline-not-the-measurement");
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

// ---- f: D2 -- a bare run is exit 0 and SAYS it did not grade ----------------------------------
async function armF() {
  const fx = tmpDir("bare");
  try {
    const k = path.join(fx, "k-differs.md");
    fs.writeFileSync(k, kickoff(file("5b9b953", 0, 18)));
    const r = verifier([`--check-kickoff=${k}`]);
    assert.strictEqual(r.code, 0,
      `a bare --check-kickoff (runbook step 6) must not refuse, got ${r.code}: ${r.out}`);
    assert.ok(String(payload(r).baseline_note).includes("NOT GRADED (AGT-598)"),
      `the green must DECLARE that the provenance was not graded: ${payload(r).baseline_note}`);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

// ---- g: D3 -- a Designer-measured block is ungraded here, both instruments admissible --------
async function armG() {
  const fx = tmpDir("designer");
  try {
    const F12 = path.join(fx, "f12.txt");
    fs.writeFileSync(F12, `${file("5b9b953", 0, 12)}\n`);
    const k = path.join(fx, "k-designer.md");
    fs.writeFileSync(k, kickoff(["BASELINE (Designer-measured, tree 1111111):", "Red set: 0 of 18"].join("\n")));
    const r = verifier([`--check-kickoff=${k}`, `--pre-build-baseline=${F12}`]);
    assert.strictEqual(r.code, 0,
      `a block that never claimed cycle-measured is not graded on provenance, got ${r.code}: ${r.out}`);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

const ARMS = {
  "a-stamp": armA,
  "b-no-finding": armB,
  "c-differs": armC,
  "d-real-kickoff": armD,
  "e-both-directions": armE,
  "f-bare-not-graded": armF,
  "g-designer-measured": armG,
};

async function run() {
  for (const [name, arm] of Object.entries(ARMS)) {
    try {
      await arm();
    } catch (e) {
      throw new Error(`arm ${name}: ${e.message}`);
    }
  }
}

export default run;
selfRun(import.meta.url, run);
