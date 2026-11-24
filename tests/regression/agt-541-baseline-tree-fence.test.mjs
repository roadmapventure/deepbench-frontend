// DeepBench v7.0.1113 | tests/regression/agt-541-baseline-tree-fence.test.mjs | AGT-541
//
// FEATURE: AGT-541 -- 7a REFUSES A BASELINE MEASURED ON THE TREE IT GRADES.
//
// THE DEFECT, measured 2026-11-24 on tree `9f7ccec`: step 7a never compared the baseline's own tree
// with the commit it was about to grade, so a file re-measured on the BUILT tree graded the build
// against itself -- every red the build introduced is already red in that "baseline", so the delta
// is empty and the ship goes green on a measurement nobody took before the first edit. AGT-598
// parses the header's `tree <sha>` only for `--check-kickoff`; nothing read it at 7a.
//
// TWO FENCES, ONE SHIP. Fence 1 (`baselineTreeFinding`) refuses the self-measured file at exit 2 --
// a cannot-run, no gate, no row, so it cannot cost the ladder a streak (AGT-245's distinction).
// Fence 2 (`addedSinceBaseline`) is what the refusal is SENT TO instead: a graded test with no file
// at the baseline's tree is one this build ADDED, so git proves it never-measured exactly as an
// `— ABSENT pre-build` line states it (AGT-629), and the re-measure the cycle reaches for today is
// no longer needed. NOTHING IS CLEARED: a name git finds AT that tree and the baseline missed still
// refuses `baseline-narrower-than-graded-set`, and a red new test still blocks (pattern:166).
//
// OFFLINE BY CONSTRUCTION (pattern:76): arm a is a pure call over literal shas. Arms b and c spawn
// `scripts/verifier.js --dry-run` against a throwaway git repo in `os.tmpdir()`, with both
// credentials DELETED from the child env, so no row can be written and nothing reads live data; the
// whole fixture is removed in `finally`. Nothing here reads or writes this repo.
//
// ARMS (kickoff v7.0.1113 section 6):
//   a  the judgment, pure: a header tree that prefixes the graded sha is the finding, and the three
//      non-cases (a different tree, a non-hex tree, a sha that could not be read) are null.
//   b  THE DISCRIMINATOR, end to end: the baseline whose header tree IS the graded commit exits 2
//      `baseline-measured-on-graded-tree` with no verdict key, while the SAME set measured at the
//      PARENT commit reaches a verdict -- the fence is about the tree, never about the file.
//   c  fence 2 and the refusal it does not weaken: the test the build ADDED is exempt by git, a tree
//      no clone holds exempts nothing, and a name that WAS at the baseline's tree still refuses.
//
// BASELINE: ABSENT pre-build -- this file does not exist on `9f7ccec`, and `scripts/verifier.js`
// there exports neither `baselineTreeFinding` nor `addedSinceBaseline`, so it exits 1 at import.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { baselineTreeFinding } from "../../scripts/verifier.js";
import { renderOut } from "../../scripts/pre-build-baseline.js";
import { renderBlock } from "../../scripts/baseline-red-set.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFIER = path.join(ROOT, "scripts/verifier.js");

// A 40-char sha that is not in any clone: arm a must never depend on this repo's history.
const G = "a9e5242f46e39b70200fe646b72330d734e68323";
const one = "one.test.mjs";
const two = "two.test.mjs";
const three = "three.test.mjs";

// The cycle's own file shape, from the two scripts that really write it -- never a hand-typed
// header, or the arms would prove something about a string this gate never sees.
const file = (tree, names) => renderOut({
  block: renderBlock(names.map(n => ({ path: `tests/regression/${n}`, code: 0 }))),
  sha7: tree, iso: "x", cycleId: "-", declaredCount: 1,
});

// Both credentials DELETED, never set to "": an absent key and an empty one are different states,
// and the stricter one is what proves no arm could have reached Supabase.
function offlineEnv() {
  const env = { ...process.env, DEEPBENCH_TEST_SLOT: "held" };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  return env;
}

// ---- a: the judgment, pure --------------------------------------------------------------------
function armA() {
  const hit = baselineTreeFinding({ tree: "a9e5242f", gradedSha: G });
  assert.ok(hit, "a header tree that prefixes the graded sha must be the finding");
  assert.strictEqual(hit.error, "baseline-measured-on-graded-tree",
    `the error names the defect: ${JSON.stringify(hit)}`);
  assert.strictEqual(hit.graded_sha, G,
    `and the finding carries the graded sha it was compared with: ${JSON.stringify(hit)}`);
  // CONTROLS: the fence is a PREFIX comparison of two hex shas and nothing else. A different tree is
  // the ordinary case (a baseline measured before the build), a non-hex tree is not a tree, and a
  // sha that could not be read is the absence of the fact -- none of the three may refuse.
  assert.strictEqual(baselineTreeFinding({ tree: "9a01422", gradedSha: G }), null,
    "control: a baseline measured on a DIFFERENT tree is the ordinary case, never a refusal");
  assert.strictEqual(baselineTreeFinding({ tree: "-", gradedSha: G }), null,
    "control: a non-hex tree is not a tree -- no refusal can be built on it");
  assert.strictEqual(baselineTreeFinding({ tree: null, gradedSha: G }), null,
    "control: no header tree at all is NOT GRADED, never refused");
  assert.strictEqual(baselineTreeFinding({ tree: "a9e5242f", gradedSha: null }), null,
    "control: a graded sha that could not be read (gradedShaFor() null) cannot convict a baseline");
}

// ---- the fixture: one repo, two commits -- `base` is the unchanged tree, `ship` adds a test -----
function makeRepo(fx) {
  const R = path.join(fx, "repo");
  fs.mkdirSync(path.join(R, "tests/regression"), { recursive: true });
  const git = (...argv) => {
    const r = spawnSync("git",
      ["-c", "user.name=t", "-c", "user.email=t@t.invalid", "-c", "commit.gpgsign=false", ...argv],
      { cwd: R, encoding: "utf8" });
    assert.strictEqual(r.status, 0, `git ${argv.join(" ")} failed: ${r.stdout || ""}${r.stderr || ""}`);
    return String(r.stdout || "").trim();
  };
  const put = n => fs.writeFileSync(path.join(R, "tests/regression", n), "process.exit(0);\n");
  git("init", "-q", "-b", "main");
  put(one); put(three);
  git("add", "-A"); git("commit", "-q", "-m", "base");
  const base7 = git("rev-parse", "--short=7", "HEAD");
  put(two);
  git("add", "-A"); git("commit", "-q", "-m", "ship");
  const ship7 = git("rev-parse", "--short=7", "HEAD");
  assert.notStrictEqual(base7, ship7, "the fixture needs two distinct commits to tell the trees apart");
  return { R, base7, ship7 };
}

// 7a as the runbook spawns it, minus the credentials: `--dry-run` records nothing, and the 60 s
// timeout is the proof a refusal lands BEFORE the gate loop rather than after a full suite run.
function cli(fx, R, csv, baselineText) {
  const csvFile = path.join(fx, "related.csv");
  const baseFile = path.join(fx, "pre-build-baseline.txt");
  fs.writeFileSync(csvFile, `${csv.join(",")}\n`);
  fs.writeFileSync(baseFile, baselineText);
  const r = spawnSync(process.execPath,
    [VERIFIER, `--repo=${R}`, `--related=${csvFile}`, `--pre-build-baseline=${baseFile}`, "--dry-run", "--json"],
    { encoding: "utf8", env: offlineEnv(), timeout: 60000 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const line = String(r.stdout || "").trim().split("\n").filter(Boolean).pop();
  let payload;
  try { payload = JSON.parse(line); } catch { assert.fail(`--json printed no payload: ${out}`); }
  return { code: r.status, out, payload };
}

// ---- b: THE DISCRIMINATOR -- the same set, two trees ------------------------------------------
function armB(fx, { R, base7, ship7 }) {
  const csv = [one, three];

  const self = cli(fx, R, csv, file(ship7, [one, three]));
  assert.strictEqual(self.code, 2,
    `a baseline measured on the GRADED tree is a cannot-run, never a verdict; got ${self.code}: ${self.out}`);
  assert.strictEqual(self.payload.kind, "cannot-run",
    `exit 2 must carry kind cannot-run: ${JSON.stringify(self.payload)}`);
  assert.strictEqual(self.payload.error, "baseline-measured-on-graded-tree",
    `and it must name THIS refusal, not a neighbouring one: ${JSON.stringify(self.payload)}`);
  assert.ok(!("verdict" in self.payload),
    `exit 2 is the absence of a verdict, so none may be reported: ${JSON.stringify(self.payload)}`);

  // CONTROL: the SAME related set and the SAME measured names, measured one commit earlier. If this
  // refused too, the arm above would prove nothing about the tree -- only that the file was present.
  const prior = cli(fx, R, csv, file(base7, [one, three]));
  assert.ok(!/baseline-measured-on-graded-tree/.test(prior.out),
    `control: a baseline measured on the UNCHANGED tree must pass the fence: ${prior.out}`);
  assert.ok(typeof prior.payload.verdict === "string" && prior.payload.verdict.length > 0,
    `control: it must reach a verdict rather than a cannot-run: ${JSON.stringify(prior.payload)}`);
  assert.strictEqual(prior.payload.recorded, false, "control: --dry-run must record nothing");
}

// ---- c: fence 2 -- git proves ADDED, and nothing else is exempted -----------------------------
function armC(fx, { R, base7 }) {
  const csv = [one, two, three];

  // `two` exists at `ship` and not at `base`: the build ADDED it, so the baseline could not have
  // measured it, and git says so without the baseline having to carry an ABSENT line.
  const added = cli(fx, R, csv, file(base7, [one, three]));
  assert.ok(!/baseline-narrower-than-graded-set/.test(added.out),
    `a graded test with no file at the baseline's tree is one this build ADDED -- exempt, not a refusal: ${added.out}`);
  assert.ok(typeof added.payload.verdict === "string" && added.payload.verdict.length > 0,
    `and the delivery is GRADED rather than refused: ${JSON.stringify(added.payload)}`);

  // CONTROL: git silent exempts NOTHING. A header tree no clone holds makes `git ls-tree` fail, and
  // the AGT-457 refusal stands exactly as it did -- an unanswerable question is never a yes.
  const silent = cli(fx, R, csv, file("0000000", [one, three]));
  assert.strictEqual(silent.code, 2,
    `control: a tree no clone holds must not exempt anything; got ${silent.code}: ${silent.out}`);
  assert.strictEqual(silent.payload.error, "baseline-narrower-than-graded-set",
    `control: the AGT-457 refusal stands: ${JSON.stringify(silent.payload)}`);
  assert.deepStrictEqual(silent.payload.uncovered, [two],
    `control: and it names the test the baseline never measured: ${JSON.stringify(silent.payload)}`);

  // CONTROL: AGT-457 KEPT. `three` WAS at the baseline's tree and the baseline missed it -- a
  // genuinely narrower baseline -- so it still refuses, while `two` stays exempt in the same call.
  const narrower = cli(fx, R, csv, file(base7, [one]));
  assert.strictEqual(narrower.code, 2,
    `AGT-457 KEPT: a baseline that MISSED a test the tree had must still refuse; got ${narrower.code}: ${narrower.out}`);
  assert.deepStrictEqual(narrower.payload.uncovered, [three],
    `AGT-457 KEPT: exactly the missed name refuses and the ADDED one is exempt: ${JSON.stringify(narrower.payload)}`);
}

async function run() {
  armA();
  const fx = fs.mkdtempSync(path.join(os.tmpdir(), "agt541-"));
  try {
    const repo = makeRepo(fx);
    armB(fx, repo);
    armC(fx, repo);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

selfRun(import.meta.url, run);
export default run;
