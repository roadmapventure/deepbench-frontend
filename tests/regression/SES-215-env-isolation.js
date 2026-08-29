// DeepBench v7.0.305 | tests/regression/SES-215-env-isolation.js | SES-215 -- the suite restores
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
// THE NEGATIVE CONTROL IS origin/dev's OWN run-all.js applied to the SAME fixture and asserted to
// LOSE (the SES-213 lesson: assert a DIFFERENCE from the retired behaviour, not a property both
// implementations share). Only one byte-range of that control is rewritten -- its relative
// `./_lib/self-run.js` specifier, so it resolves from a temp directory -- and the rewrite is
// asserted to have touched exactly that and nothing else.

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

// The retired implementation, taken from origin/dev rather than reconstructed. Returns null when
// the ref is unreachable (a shallow clone, a detached checkout) so the clause declares itself
// not-run instead of inventing a control.
function retiredRunnerSource() {
  const r = spawnSync("git", ["show", "origin/dev:tests/regression/run-all.js"], {
    encoding: "utf8",
    cwd: ROOT,
  });
  return r.status === 0 && r.stdout ? r.stdout : null;
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

    // ---- part 4: the file-level negative control ----------------------------------------------
    // origin/dev's OWN runner, same fixture, asserted to LOSE. Without this the clauses above are a
    // description of the shipped file rather than a measured difference from what it replaced.
    const retired = retiredRunnerSource();
    if (!retired) {
      notRun(
        "SES-215 file-level negative control",
        "origin/dev:tests/regression/run-all.js is unreachable from this checkout (shallow clone or " +
        "missing remote ref), so the retired runner could not be run against the fixture. The three " +
        "source clauses and the behavioural fixture above DID run."
      );
      return;
    }

    const relocated = relocate(retired);
    assert.notStrictEqual(
      relocated, retired,
      "the control's self-run.js specifier was not rewritten -- the copy would not resolve from a " +
      "temp directory, and a control that cannot start is not a control"
    );
    assert.strictEqual(
      relocated.replace(JSON.stringify(pathToFileURL(SELF_RUN_LIB).href), '"./_lib/self-run.js"'),
      retired,
      "the control rewrite touched more than the self-run.js import specifier"
    );

    const controlPath = path.join(fixture, "retired-run-all.mjs");
    fs.writeFileSync(controlPath, relocated);
    const retiredRun = runSuite(controlPath, fixture);
    assert.strictEqual(
      retiredRun.status, 1,
      "origin/dev's run-all.js PASSED the leak fixture, so this guard is not measuring a difference " +
      "-- either the fix already shipped upstream or the fixture stopped reproducing the leak:\n" +
      (retiredRun.stdout || "") + (retiredRun.stderr || "")
    );
    assert.ok(
      /SES215_ADDED leaked from a-leaks\.js/.test(retiredRun.stdout || ""),
      "the retired runner failed the fixture for some OTHER reason than the env leak -- got:\n" +
      (retiredRun.stdout || "")
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

selfRun(import.meta.url, run);
