// DeepBench v7.0.307 | tests/regression/SES-215-env-isolation.js | SES-215 -- the suite restores
// process.env around every test, so one test's placeholder can never be another test's answer.
//
// WHAT IS BEING PINNED. Seven tests set `VITE_SUPABASE_ANON_KEY = "regression-placeholder"` at the
// top of their own run(); LOG-41 reads that same variable to decide whether its anon-grant arm can
// run, and run-all.js runs everything in ONE process. Measured on this tree before the fix: the
// suite reported 98/100 with `[FAIL] LOG-41 ... anon cannot SELECT ai_pattern_agent_hop_rollup
// (HTTP 401)`, while the SAME test run standalone PASSED with that arm declared NOT RUN.
//
// THE GUARD DOES NOT IMPORT run-all.js, and that is not squeamishness: run-all.js calls main() at
// the bottom with no import guard, so importing it would run the whole suite inside this test. It
// reads the file as source and spawns it as a subprocess instead -- which also happens to be the
// stronger proof, because it exercises the runner rather than a function lifted out of it.
//
// THE NEGATIVE CONTROL IS A PRE-FIX run-all.js applied to the SAME fixture and asserted to LOSE
// (the SES-213 lesson: assert a DIFFERENCE from the retired behaviour, not a property both
// implementations share). Only one byte-range of that control is rewritten -- its relative
// `./_lib/self-run.js` specifier, so it resolves from a temp directory -- and the rewrite is
// asserted to have touched exactly that and nothing else.
//
// v7.0.307 (SES-215 follow-up, directive 1715bf08): TWO DEFECTS in that control made CI red, and
// both are named here because each presents as something other than what it is.
//
//   (1) THE CONTROL RUNNER WAS WRITTEN INTO THE FIXTURE DIRECTORY IT WAS ABOUT TO SCAN.
//       run-all.js discovers tests with `.endsWith(".js") || .endsWith(".mjs")`, minus `run-all.js`
//       and `_`-prefixed files -- so `retired-run-all.mjs` sitting in the fixture matched, was
//       imported AS a test, and failed with "does not export a default async function". The suite
//       reported 2/3 and exit 1, so the `status === 1` assertion above it PASSED -- for entirely
//       the wrong reason. A control that appears to be working while measuring nothing is worse
//       than an absent one, which is why the fixture's contents are now asserted explicitly.
//       Control runners live in their OWN temp directory; the fixture holds exactly its two files.
//
//   (2) THE CONTROL'S SOURCE WAS `origin/dev`, WHICH ON CI IS THE COMMIT UNDER TEST. It was the
//       retired file exactly once -- locally, before v7.0.305 was pushed. After that push
//       origin/dev's copy IS the fixed runner, so the control restores the environment, b-reads.js
//       PASSES, and the leak the assertion looks for can never appear. On CI it is structural, not
//       stale: actions/checkout@v4 at its default depth creates refs/remotes/origin/dev pointing at
//       the very commit being tested, on every run, forever. The guard was grading its own change.
//       The git control is now resolved BY CONTENT -- the newest commit of run-all.js whose copy
//       does not carry the restore -- and declares itself not-run when unreachable, which on a
//       shallow CI clone it always is.
//
// THAT LAST POINT IS WHY THERE ARE NOW TWO CONTROLS, and the second is not a downgrade of the
// first. A guard whose only control declares not-run in the one environment that gates the push is
// measuring nothing there. The always-run control is the SHIPPED runner with the
// `added-keys-are-deleted` mutation applied -- the same breaks() part 2 already proves non-vacuous
// -- asserted to lose on the same fixture with the same leak message. The real-file control is
// KEPT, never replaced: where both can run, both run.
//
// THE EDIT THIS FORBIDS: re-pointing the git control at `origin/dev` (or any branch the fix lands
// on) to "keep it simple", and moving a control runner back inside the fixture directory. The
// first agrees with the shipped file the day after it ships; the second presents as a PASS.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNNER = path.join(__dirname, "run-all.js");
const SELF_RUN_LIB = path.join(__dirname, "_lib", "self-run.js");
const ROOT = path.resolve(__dirname, "..", "..");

// --- 1. source clauses, each with its own negative control ------------------------------------
//
// `test` must hold on the shipped file; `breaks` is a mutation of that same source that must make
// `test` fail. A clause whose `breaks` still passes is pinning nothing, which is what the vacuity
// meta-check in part 2 exists to catch.
export const CLAUSES = [
  {
    id: "snapshot-precedes-the-import",
    detail:
      "the snapshot must be taken BEFORE the dynamic import(), because several of these tests write " +
      "to process.env as an import-time side effect rather than inside run() -- a snapshot taken " +
      "after the import has already captured the polluted environment and restores nothing",
    test: src => {
      const snap = src.indexOf("const envBefore = snapshotEnv()");
      const imp = src.indexOf("await import(pathToFileURL(fullPath).href)");
      return snap !== -1 && imp !== -1 && snap < imp;
    },
    // Move the snapshot after the import -- the retired ordering, expressed as an edit.
    breaks: src =>
      src
        .replace("    const envBefore = snapshotEnv();\n", "")
        .replace(
          "      const mod = await import(pathToFileURL(fullPath).href);",
          "      const mod = await import(pathToFileURL(fullPath).href);\n      const envBefore = snapshotEnv();"
        ),
  },
  {
    id: "added-keys-are-deleted",
    detail:
      "restoreEnv must DELETE keys the test added, not merely reassign the ones it remembered. This " +
      "is the shape of the live defect: VITE_SUPABASE_ANON_KEY is ABSENT from an unattended cloud " +
      "env and is CREATED by the setter, so a reassign-only restore is a no-op against it",
    test: src => /delete process\.env\[key\]/.test(src),
    // The reassign-only restore: the plausible wrong implementation, applied to the same file.
    breaks: src =>
      src.replace(
        /for \(const key of Object\.keys\(process\.env\)\) \{\n\s*if \(!Object\.prototype\.hasOwnProperty\.call\(before, key\)\) delete process\.env\[key\];\n\s*\}\n/,
        ""
      ),
  },
  {
    id: "restore-runs-on-both-arms",
    detail:
      "the restore must sit OUTSIDE the try/catch -- a test that threw still owns whatever it wrote " +
      "to the environment before it threw. Same both-arms reasoning the notRun drain already carries",
    test: src => {
      const catchEnd = src.indexOf("console.log(`  [FAIL] ${file} -- ${e.message}`);");
      const restore = src.indexOf("restoreEnv(envBefore);");
      const drain = src.indexOf("const declared = takeNotRun();");
      return catchEnd !== -1 && restore > catchEnd && drain !== -1 && restore < drain;
    },
    // Bury the restore inside the try, i.e. skip it whenever a test fails.
    breaks: src =>
      src
        .replace("    restoreEnv(envBefore);\n", "")
        .replace(
          "      console.log(`  [PASS] ${file}`);",
          "      console.log(`  [PASS] ${file}`);\n      restoreEnv(envBefore);"
        ),
  },
];

// --- 2. the fixture: two leak shapes, one suite ------------------------------------------------
//
// `a-*` sorts before `b-*`, and run-all.js sorts its file list, so `a` runs first and `b` is the
// reader. Two shapes on purpose: SES215_ADDED is CREATED by `a` (absent from the parent env -- the
// live defect's shape, which only the delete half of the restore catches), while SES215_PRESET is
// MODIFIED by `a` from a value the parent set (which only the reassign half catches). A restore
// missing either half fails this fixture.
const FIXTURE_FILES = {
  "a-leaks.js": `
export default async function run() {
  process.env.SES215_ADDED = "leaked-by-a";
  process.env.SES215_PRESET = "clobbered-by-a";
}
`,
  "b-reads.js": `
import assert from "assert";
export default async function run() {
  assert.strictEqual(process.env.SES215_ADDED, undefined,
    "SES215_ADDED leaked from a-leaks.js -- an ADDED key was not deleted by the restore");
  assert.strictEqual(process.env.SES215_PRESET, "set-by-the-parent",
    "SES215_PRESET leaked from a-leaks.js -- a MODIFIED key was not reset by the restore");
}
`,
};

function writeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ses215-fixture-"));
  for (const [name, body] of Object.entries(FIXTURE_FILES)) {
    fs.writeFileSync(path.join(dir, name), body);
  }
  return dir;
}

function runSuite(runnerPath, fixtureDir) {
  return spawnSync(process.execPath, [runnerPath, `--dir=${fixtureDir}`], {
    encoding: "utf8",
    cwd: ROOT,
    env: { ...process.env, SES215_PRESET: "set-by-the-parent" },
  });
}

// The marker of the shipped fix. Used to IDENTIFY a pre-fix commit by content rather than trusting
// a branch name to still point at one -- see defect (2) in the header.
const RESTORE_MARK = "delete process.env[key]";

// The retired implementation, taken from history rather than reconstructed: the NEWEST commit of
// run-all.js whose copy does not carry the restore. Returns null when history is unreachable (a
// shallow clone -- which is what CI checks out) so the clause declares itself not-run instead of
// inventing a control, or worse, using the fixed file as one.
function retiredRunnerSource() {
  const log = spawnSync("git", ["log", "--format=%H", "--", "tests/regression/run-all.js"], {
    encoding: "utf8",
    cwd: ROOT,
  });
  if (log.status !== 0 || !log.stdout) return null;
  for (const sha of log.stdout.split("\n").filter(Boolean)) {
    const r = spawnSync("git", ["show", `${sha}:tests/regression/run-all.js`], {
      encoding: "utf8",
      cwd: ROOT,
    });
    if (r.status !== 0 || !r.stdout) continue;
    if (!r.stdout.includes(RESTORE_MARK)) return { sha, src: r.stdout };
  }
  return null;
}

// A control runner never lives in the directory it is about to scan -- defect (1) in the header.
function writeControlRunner(name, src) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ses215-control-"));
  const p = path.join(dir, name);
  fs.writeFileSync(p, src);
  return p;
}

// The shared shape of every negative control: same fixture, asserted to LOSE, and to lose on the
// LEAK rather than on anything else that happens to exit non-zero.
function assertControlLoses(runnerPath, fixture, label) {
  const run = runSuite(runnerPath, fixture);
  assert.strictEqual(
    run.status, 1,
    `${label} PASSED the leak fixture, so this guard is not measuring a difference -- either the ` +
    `fix already shipped upstream or the fixture stopped reproducing the leak:\n` +
    (run.stdout || "") + (run.stderr || "")
  );
  assert.ok(
    /1\/2 passed/.test(run.stdout || ""),
    `${label} must run EXACTLY the fixture's two tests and fail one of them -- a count other than ` +
    `1/2 means the control picked up a file the fixture does not declare (the v7.0.307 defect, ` +
    `which presents as a passing exit 1) -- got:\n` + (run.stdout || "")
  );
  assert.ok(
    /SES215_ADDED leaked from a-leaks\.js/.test(run.stdout || ""),
    `${label} failed the fixture for some OTHER reason than the env leak -- got:\n` +
    (run.stdout || "")
  );
}

// The ONLY rewrite the control gets: its relative self-run.js specifier, so the copy resolves from
// a temp directory. Asserted below to have changed exactly that and nothing else.
function relocate(src) {
  const abs = pathToFileURL(SELF_RUN_LIB).href;
  return src.replace('from "./_lib/self-run.js"', `from ${JSON.stringify(abs)}`);
}

export default async function run() {
  const shipped = fs.readFileSync(RUNNER, "utf8");

  // ---- part 1: the source clauses hold on the shipped runner ---------------------------------
  for (const c of CLAUSES) {
    assert.ok(c.test(shipped), `SES-215 clause "${c.id}" fails on the shipped run-all.js: ${c.detail}`);
  }

  // ---- part 2: the SES-158 vacuity meta-check -------------------------------------------------
  // A clause that still passes on its own broken variant is asserting nothing.
  for (const c of CLAUSES) {
    const broken = c.breaks(shipped);
    assert.notStrictEqual(
      broken, shipped,
      `SES-215 clause "${c.id}": its breaks() mutation changed nothing, so the control is vacuous`
    );
    assert.ok(
      !c.test(broken),
      `SES-215 clause "${c.id}" still passes on its own broken variant -- it pins nothing`
    );
  }

  // ---- part 3: the behavioural proof, on the real runner --------------------------------------
  const fixture = writeFixture();
  try {
    const shippedRun = runSuite(RUNNER, fixture);
    assert.strictEqual(
      shippedRun.status, 0,
      "the shipped run-all.js let a fixture test's env mutation reach the next test:\n" +
      (shippedRun.stdout || "") + (shippedRun.stderr || "")
    );
    assert.ok(
      /2\/2 passed/.test(shippedRun.stdout || ""),
      "the fixture suite must report 2/2 -- got:\n" + (shippedRun.stdout || "")
    );

    // The fixture holds EXACTLY what it declares. This is the structural half of defect (1): a
    // control runner dropped in here is discovered as a third test, and the resulting exit 1 reads
    // as a passing control. Asserted before any control runs, so the failure names the cause.
    assert.deepStrictEqual(
      fs.readdirSync(fixture).sort(),
      Object.keys(FIXTURE_FILES).sort(),
      "the fixture directory holds a file it does not declare -- a control runner written in here " +
      "is scanned as a test by run-all.js, and the exit 1 that produces looks like a working control"
    );

    // ---- part 4a: the ALWAYS-RUN negative control ------------------------------------------
    // The shipped runner with the `added-keys-are-deleted` mutation applied -- the same breaks()
    // part 2 has just proven non-vacuous. This one needs no git history, so it is the control that
    // actually runs on CI, where the file-level control below is unreachable by construction.
    const mutated = CLAUSES.find(c => c.id === "added-keys-are-deleted").breaks(shipped);
    assert.notStrictEqual(
      mutated, shipped,
      "the mutation control changed nothing -- it would be the shipped runner wearing a control's name"
    );
    assertControlLoses(
      writeControlRunner("mutated-run-all.mjs", relocate(mutated)),
      fixture,
      "the shipped run-all.js with its restore's delete-half removed"
    );

    // ---- part 4b: the file-level negative control ----------------------------------------------
    // A real pre-fix runner out of history, same fixture, asserted to LOSE. Without this the
    // clauses above are a description of the shipped file rather than a measured difference from
    // what it replaced -- and 4a alone would only ever compare the shipped file to itself-minus-a-line.
    const retired = retiredRunnerSource();
    if (!retired) {
      notRun(
        "SES-215 file-level negative control",
        "no commit of tests/regression/run-all.js predating the restore is reachable from this " +
        "checkout (a shallow clone -- which is what actions/checkout@v4 gives CI at its default " +
        "depth), so the real retired runner could not be run against the fixture. The three source " +
        "clauses, the behavioural fixture and the ALWAYS-RUN mutation control above DID run."
      );
      return;
    }

    const relocated = relocate(retired.src);
    assert.notStrictEqual(
      relocated, retired.src,
      "the control's self-run.js specifier was not rewritten -- the copy would not resolve from a " +
      "temp directory, and a control that cannot start is not a control"
    );
    assert.strictEqual(
      relocated.replace(JSON.stringify(pathToFileURL(SELF_RUN_LIB).href), '"./_lib/self-run.js"'),
      retired.src,
      "the control rewrite touched more than the self-run.js import specifier"
    );
    assert.ok(
      !retired.src.includes(RESTORE_MARK),
      `the file-level control resolved to ${retired.sha}, whose run-all.js already carries the ` +
      `restore -- that is the shipped fix grading itself, not a control`
    );

    assertControlLoses(
      writeControlRunner("retired-run-all.mjs", relocated),
      fixture,
      `the retired run-all.js from ${retired.sha}`
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

selfRun(import.meta.url, run);
