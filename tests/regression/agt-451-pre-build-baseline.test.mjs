// DeepBench v7.0.843 | tests/regression/agt-451-pre-build-baseline.test.mjs | AGT-451
//
// FEATURE: AGT-451 -- the baseline is measured credentialed, over the kickoff's own declared files,
// BEFORE the Builder is spawned (scripts/pre-build-baseline.js; runner-cycle.md step 7; §3f(b)).
//
// THE GUARD SENTENCE, which is arm D's pair and the reason this file exists. A red test in the
// fixture's related set grades STANDING when the measured block names it, and NEWLY RED when the
// block does not. Measured on v7.0.827: the kickoff's BASELINE was written by a Designer turn with
// no credentials and said `Red set: 0 of 2` over a tree holding six standing reds -- five of those
// six declare their arms `notRun` and report GREEN without a database, so the block was
// self-consistently wrong and every one of the six would have landed on the Builder. So an
// uncredentialed block is now REFUSED rather than graded against (`UNCREDENTIALED_BASELINE_RE` ->
// `uncredentialed: true`, `names: null`), the refusal survives AGT-391's related-set escape, and the
// cycle's own credentialed measurement replaces it via `--pre-build-baseline=<file>`.
//
// OFFLINE BY CONSTRUCTION (pattern:76): every child runs with SUPABASE_URL / SUPABASE_SERVICE_KEY
// DELETED unless the arm is specifically about the credentialed path (arm C, where they are present
// and never used -- the fixture tests are two console.logs), every fixture lives in os.tmpdir() and
// is removed in `finally`, and nothing here reads or writes the real tree except to read files.
//
// ARMS (kickoff v7.0.843 §5 T4), each graded on its own and each with a CONTROL that must fail:
//   A  declaredFiles() -- anchors path + backticked path + bare tests/regression mention, and NOT an
//      unbackticked prose path. CONTROL: "" -> [].
//   B  no credentials -> exit 2, NOTHING written, stderr names SUPABASE_SERVICE_KEY.
//   C  credentialed -> the block, the [FAIL] lines, the FLAG on stderr. CONTROL: no --out= -> exit 2.
//   D  the delta: the stripped block refuses baselineGate() even WITH a related set; the measured
//      file reads back as the one red name; standing vs newly red off that name.
//   E  --check-kickoff both ways: no flag -> 0 + a NOT GRADED note; a missing file -> 1
//      `kickoff-baseline-uncredentialed`; the measured file -> 0 + the note that names its count.
//   F  the homes: the runbook, the generated card, session-setup and render-cycle-card.js.
//
// BASELINE: RED on the unchanged tree -- scripts/pre-build-baseline.js does not exist,
// verifier.js exports no UNCREDENTIALED_BASELINE_RE, and none of arm F's needles are in the docs.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts/pre-build-baseline.js");
const VERIFIER = path.join(ROOT, "scripts/verifier.js");
const lf = t => String(t).replace(/\r\n/g, "\n");
const read = rel => lf(fs.readFileSync(path.join(ROOT, rel), "utf8"));

// Both credentials DELETED, never set to "" -- an empty string and an absent key are different
// states and the script's own check reads both, so the stricter one is what the arms run under.
function offlineEnv() {
  const env = { ...process.env, DEEPBENCH_TEST_SLOT: "held" };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  return env;
}
// Arm C only. The values are present and deliberately unusable: the fixture tests never open a
// socket, so a reachable endpoint would prove nothing and an unreachable one costs nothing.
function credentialedEnv() {
  return { ...offlineEnv(), SUPABASE_URL: "http://127.0.0.1:9", SUPABASE_SERVICE_KEY: "x" };
}
function node(args, env = offlineEnv(), opts = {}) {
  const r = spawnSync(process.execPath, args, { encoding: "utf8", env, timeout: 120000, ...opts });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}`, stdout: r.stdout || "", stderr: r.stderr || "" };
}
function tmpDir(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `agt451-${tag}-`));
}
function put(root, rel, text) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}

// The paragraph that says it was measured without credentials, and the same paragraph that does not.
// ONE fixture pair, used by C, D and E, so the three arms cannot disagree about what they grade.
const STRIPPED_CLAUSE = "credentials stripped, the Designer writes nothing";
function kickoffFixture(clause) {
  return [
    "- **Lanes:** session `orchestrator`; executor none.",
    "",
    "**T1 - `scripts/x.js`**",
    "",
    `BASELINE (${clause}):`,
    "- tests/regression/red.test.mjs — green",
    "- tests/regression/green.test.mjs — green",
    "Red set: 0 of 2",
    "",
  ].join("\n");
}
// A fixture tree whose related set is exactly the two tests: each names "x.js" as a whole quoted
// string, which is scripts/related-tests.js's own second rule.
function fixtureTree(tag) {
  const fx = tmpDir(tag);
  put(fx, "scripts/x.js", "export const x = 1;\n");
  put(fx, "tests/regression/red.test.mjs",
    'import "node:assert";\nconst P = "x.js";\nconsole.log("[FAIL] red.test.mjs -- boom");\nprocess.exit(1);\n');
  put(fx, "tests/regression/green.test.mjs", 'const P = "x.js";\nprocess.exit(0);\n');
  put(fx, "tests/regression/run-all.js", "");
  put(fx, "k.md", kickoffFixture(STRIPPED_CLAUSE));
  put(fx, "k-credentialed.md", kickoffFixture("credentialed"));
  return fx;
}

// ---- A: declaredFiles -- the one judgment in the script, graded pure -------------------------
async function armA() {
  const { declaredFiles } = await import(path.join(ROOT, "scripts/pre-build-baseline.js"));
  const text = [
    "## 2. CONTEXT",
    "",
    "```anchors",
    "scripts/x.js | 1 | foo",
    "```",
    "",
    "**T1 - `tests/regression/red.test.mjs`, new.**",
    "",
    "The sweep also reads tests/regression/green.test.mjs for the arm count.",
    "",
    "Reasoning about src/never.jsx, which this build does not touch.",
  ].join("\n");
  assert.deepStrictEqual(declaredFiles(text),
    ["scripts/x.js", "tests/regression/green.test.mjs", "tests/regression/red.test.mjs"],
    "declaredFiles must read the anchors path, the backticked path and the bare tests/regression " +
    "mention -- and must NOT read an unbackticked prose path (src/never.jsx)");
  // CONTROL: nothing declared is an empty list, never a throw and never a default.
  assert.deepStrictEqual(declaredFiles(""), [], "control: an empty kickoff declares no file");
  // CONTROL: the unbackticked path would be read by a rule that dropped the backtick requirement.
  assert.ok(!declaredFiles(text).includes("src/never.jsx"),
    "control: src/never.jsx is in the text and must not be declared");
}

// ---- B: no credentials, no measurement, no file ----------------------------------------------
async function armB() {
  const fx = fixtureTree("refuse");
  const out = path.join(fx, "out.txt");
  try {
    const r = node([SCRIPT, `--kickoff=${path.join(fx, "k.md")}`, `--out=${out}`, `--root=${fx}`]);
    assert.strictEqual(r.code, 2,
      `an uncredentialed run must exit 2 -- it is the defect this script exists to remove; got ${r.code}: ${r.out}`);
    assert.ok(!fs.existsSync(out),
      "a refused run must write NOTHING: a half-measured block is the one most likely to be pasted into a kickoff");
    assert.ok(r.stderr.includes("SUPABASE_SERVICE_KEY"),
      `the refusal must NAME the missing credential, never just fail: ${r.stderr}`);
    // CONTROL: the same assertion must reject a passing exit code.
    assert.throws(() => assert.strictEqual(0, 2), "control: exit 0 must not satisfy the refusal arm");
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

// ---- C: credentialed, over the related set, in the block's own format ------------------------
async function armC() {
  const fx = fixtureTree("measure");
  const out = path.join(fx, "out.txt");
  try {
    const r = node([SCRIPT, `--kickoff=${path.join(fx, "k.md")}`, `--out=${out}`, `--root=${fx}`],
      credentialedEnv());
    assert.strictEqual(r.code, 0, `a credentialed run reports, it does not gate; got ${r.code}: ${r.out}`);
    const block = lf(fs.readFileSync(out, "utf8"));
    assert.ok(block.startsWith("BASELINE ("),
      `the file must BE a BASELINE block readKickoffBaseline() can parse: ${block.slice(0, 80)}`);
    assert.ok(block.includes("Red set: 1 of 2"),
      `the red test must COUNT as red and the green one must not: ${block}`);
    assert.ok(block.includes(`- ${path.join(fx, "tests/regression/red.test.mjs")} — RED (exit 1): [FAIL] red.test.mjs -- boom`),
      `the RED line must carry the path, the exit code and the assertion that fired: ${block}`);
    const fail = block.split("\n").find(l => l.trim().startsWith("[FAIL]"));
    assert.ok(fail, `the block must carry a [FAIL] line -- it is what readRegressionBaseline() reads: ${block}`);
    assert.strictEqual(fail.trim().slice("[FAIL]".length).trim().split(/\s+/)[0], "red.test.mjs",
      `the first token after [FAIL] is the name the delta gate keys on: ${fail}`);
    assert.ok(!block.includes("green.test.mjs — RED"),
      "a green test must never appear as RED");
    assert.ok(r.stderr.trim().endsWith(`  --pre-build-baseline=${out}`.trim()),
      `stderr must END with the flag the cycle pastes into 7a: ${r.stderr}`);
    // CONTROL: stdout alone is not a hand-off -- without --out= nothing is measured.
    const noOut = node([SCRIPT, `--kickoff=${path.join(fx, "k.md")}`, `--root=${fx}`], credentialedEnv());
    assert.strictEqual(noOut.code, 2, `control: --out= omitted must exit 2, got ${noOut.code}: ${noOut.out}`);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

// ---- D: THE DELTA -- the ticket's guard sentence ----------------------------------------------
async function armD() {
  const fx = fixtureTree("delta");
  const out = path.join(fx, "out.txt");
  try {
    const m = await import(path.join(ROOT, "scripts/verifier.js"));
    const stripped = lf(fs.readFileSync(path.join(fx, "k.md"), "utf8"));
    const clean = lf(fs.readFileSync(path.join(fx, "k-credentialed.md"), "utf8"));

    const bad = m.readKickoffBaseline(stripped);
    assert.strictEqual(bad.uncredentialed, true, "a block that says credentials were stripped is not a baseline");
    assert.strictEqual(bad.names, null,
      "names must be null, never [] -- [] claims the unchanged tree was green, which this block cannot support");
    assert.ok(String(bad.source).includes("AGT-451"), `the source must say WHICH refusal this is: ${bad.source}`);
    assert.strictEqual(
      m.baselineGate({ read: bad, declared: "", related: ["red.test.mjs"] }).refuse, true,
      "the refusal must survive AGT-391's related-set escape -- every unattended cycle hands --related=");

    // CONTROL: the same block, credentialed, is a legitimate EMPTY baseline and runs.
    const good = m.readKickoffBaseline(clean);
    assert.deepStrictEqual(good.names, [], `control: a credentialed 0-of-2 block is an empty baseline: ${good.source}`);
    assert.strictEqual(m.baselineGate({ read: good, declared: "", related: ["red.test.mjs"] }).refuse, false,
      "control: a credentialed block must NOT refuse -- the refusal is about the measurement, not the count");

    // The measured file reads back under the SAME reader the gate uses.
    const r = node([SCRIPT, `--kickoff=${path.join(fx, "k.md")}`, `--out=${out}`, `--root=${fx}`], credentialedEnv());
    assert.strictEqual(r.code, 0, r.out);
    assert.deepStrictEqual(m.readRegressionBaseline(out).names, ["red.test.mjs"],
      "the file the cycle hands to 7a must read back as the one red name");

    // THE GUARD SENTENCE: named by the measurement -> standing; not named -> newly red.
    const standing = m.regressionDelta({ absolute: "red", baseline: ["red.test.mjs"], post: ["red.test.mjs"], unverified: [] });
    assert.strictEqual(standing.status, "green", `a red the baseline names is STANDING: ${JSON.stringify(standing)}`);
    assert.deepStrictEqual(standing.standing, ["red.test.mjs"]);
    assert.deepStrictEqual(standing.newlyRed, []);
    const newly = m.regressionDelta({ absolute: "red", baseline: [], post: ["red.test.mjs"], unverified: [] });
    assert.strictEqual(newly.status, "red", `the SAME red, unnamed, is the delivery's: ${JSON.stringify(newly)}`);
    assert.deepStrictEqual(newly.newlyRed, ["red.test.mjs"]);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

// ---- E: --check-kickoff, all three ways -------------------------------------------------------
async function armE() {
  const fx = fixtureTree("check");
  const out = path.join(fx, "out.txt");
  try {
    const K = path.join(fx, "k.md");
    const payload = r => {
      const line = r.stdout.trim().split("\n").filter(Boolean).pop();
      try { return JSON.parse(line); } catch { assert.fail(`--json printed no payload: ${r.out}`); }
    };

    // No flag: step 6 runs this with no credentials and no file, and it must stay exit 0 and SAY so.
    const bare = node([VERIFIER, `--check-kickoff=${K}`, "--json"]);
    assert.strictEqual(bare.code, 0, `a bare --check-kickoff must not refuse an uncredentialed block: ${bare.out}`);
    assert.ok(String(payload(bare).baseline_note).includes("AGT-451"),
      `the green must declare that it did not grade the baseline: ${payload(bare).baseline_note}`);

    // The flag, pointing at nothing: the cycle claimed a measurement it never made.
    const missing = node([VERIFIER, `--check-kickoff=${K}`, `--pre-build-baseline=${path.join(fx, "missing.txt")}`, "--json"]);
    assert.strictEqual(missing.code, 1, `an armed run over no file must exit 1, got ${missing.code}: ${missing.out}`);
    assert.strictEqual(payload(missing).kind, "kickoff-baseline-uncredentialed");
    assert.strictEqual(payload(missing).remedy_owner, "cycle",
      "the remedy is the CYCLE's step 7 command -- the Designer's environment is where it could not be measured");
    assert.ok(String(payload(missing).remedy).includes("pre-build-baseline"),
      `the refusal must carry the command that fixes it: ${payload(missing).remedy}`);

    // The flag, pointing at the real measurement: green, and the note names what replaced the block.
    const measured = node([SCRIPT, `--kickoff=${K}`, `--out=${out}`, `--root=${fx}`], credentialedEnv());
    assert.strictEqual(measured.code, 0, measured.out);
    const armed = node([VERIFIER, `--check-kickoff=${K}`, `--pre-build-baseline=${out}`, "--json"]);
    assert.strictEqual(armed.code, 0, `a real measurement must clear the refusal: ${armed.out}`);
    const note = String(payload(armed).baseline_note);
    assert.ok(note.includes("(1 red)"),
      `the note must carry the count the measurement found, which is the one red: ${note}`);
    assert.ok(note.includes(out) && note.includes("AGT-451"),
      `the note must name the file that replaced the block: ${note}`);

    // CONTROL: a CREDENTIALED kickoff has no uncredentialed block, so the same missing file is
    // nothing to refuse -- the refusal is keyed on the block, never on the flag.
    const control = node([VERIFIER, `--check-kickoff=${path.join(fx, "k-credentialed.md")}`,
      `--pre-build-baseline=${path.join(fx, "missing.txt")}`, "--json"]);
    assert.strictEqual(control.code, 0,
      `control: a credentialed block with a missing file must stay exit 0, got ${control.code}: ${control.out}`);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

// ---- F: the homes -- one change, every home (pattern:163) -------------------------------------
async function armF() {
  const cycle = read("docs/runbooks/runner-cycle.md");
  const PRE_FIRST = "node scripts/pre-build-baseline.js --kickoff=<the kickoff_path>";
  const SPAWN = "Run the rendered prompt as a sub-agent on the **`orchestrator`** lane";
  const FLAG = "  --pre-build-baseline=$S/pre-build-baseline-<your cycle id>.txt";

  const iPre = cycle.indexOf(PRE_FIRST);
  const iSpawn = cycle.indexOf(SPAWN);
  assert.ok(iPre !== -1, `runner-cycle.md must carry the measurement command: ${PRE_FIRST}`);
  assert.ok(iSpawn !== -1, "runner-cycle.md must still carry the Builder spawn line");
  assert.ok(iPre < iSpawn,
    "the measurement comes BEFORE the spawn -- after it, the tree is no longer unchanged and the " +
    "block would grade the Builder's own edits as standing reds");
  assert.ok(cycle.includes(FLAG), `7a must hand the same file to the verifier: ${FLAG}`);
  assert.ok(!cycle.includes("regression-baseline-"),
    "the runbook must NOT reintroduce the full-suite capture (AGT-170 + AGT-391 retired it there)");

  const bytes = Buffer.byteLength(cycle, "utf8");
  assert.ok(bytes <= 381000,
    `runner-cycle.md is ${bytes} B against SES-336's 381,000 B ceiling -- this edit had to free bytes before adding any`);
  const stamps = cycle.split("\n").filter(l => l.startsWith("<!-- DeepBench v"));
  assert.strictEqual(stamps.length, 5,
    `session-hygiene check 7 caps the header at 5 stamps; got ${stamps.length} -- a rotation drops one as it adds one`);
  assert.ok(stamps[0].startsWith("<!-- DeepBench v7.0.658 |"),
    "line 1 stays the v7.0.658 stamp (agt-133, ses-424c pin it); this ship's stamp took line 2 from v7.0.650");

  const card = read("docs/runbooks/cycle-card.md");
  assert.ok(card.includes("node scripts/pre-build-baseline.js --kickoff="),
    "the GENERATED card is the door a cycle actually reads -- without the command there it does not happen");

  const setup = read("docs/runbooks/session-setup.md");
  assert.ok(setup.includes("node scripts/pre-build-baseline.js --kickoff=<the kickoff path>"),
    "an attended session measures it too (§3f(b)) -- the Builder is spawned there as well");
  assert.ok(setup.includes("  --pre-build-baseline=$S/pre-build-baseline-<the supervised cycle id>.txt"),
    "and §3e's verifier reads the SAME file");

  const renderer = read("scripts/render-cycle-card.js");
  assert.ok(renderer.includes("block: [1, 2, 5] },"),
    "step 7's NOTES block list must select the measurement's fence -- [1, 4] carried its old neighbour");

  // CONTROL: every needle above, with one character changed, must be ABSENT. A needle that matches
  // its own mutation is matching something else (the SES-158 vacuous-control failure).
  const mutations = [
    [cycle, PRE_FIRST.replace("pre-build", "pre_build")],
    [cycle, FLAG.replace(".txt", ".txtx")],
    [card, "node scripts/pre-build-baselines.js --kickoff="],
    [setup, "node scripts/pre-build-baseline.js --kickoff=<the kickoff_paths>"],
    [renderer, "block: [1, 2, 6] },"],
  ];
  for (const [hay, needle] of mutations) {
    assert.ok(!hay.includes(needle), `control: the mutated needle must be absent -- ${needle}`);
  }
}

const ARMS = {
  "a-declared-files": armA,
  "b-refuses-uncredentialed": armB,
  "c-measures-credentialed": armC,
  "d-the-delta": armD,
  "e-check-kickoff": armE,
  "f-the-homes": armF,
};

export async function run() {
  const passed = [], failed = [];
  for (const [name, fn] of Object.entries(ARMS)) {
    try { await fn(); passed.push(name); }
    catch (e) { failed.push(`${name}: ${e.message.split("\n")[0]}`); }
  }
  console.log(`  [AGT-451] ${passed.length} of ${Object.keys(ARMS).length} arms passed: ${passed.map(n => n.split("-")[0]).join(",") || "none"}`);
  if (failed.length) assert.fail(`${failed.length} arm(s) failed -- ` + failed.join(" | "));
  return passed;
}

selfRun(import.meta.url, run);
export default run;
