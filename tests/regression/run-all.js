#!/usr/bin/env node
// DeepBench v7.0.305 | tests/regression/run-all.js | SES-215 -- process.env is snapshotted before
// each test and restored after it settles, so one test's mutation can never be another test's
// answer. John's directive 52c41c2d, verbatim: "stop the cross-test env pollution (isolate or
// restore the env var around the offending tests...)".
//
// THE DEFECT, measured on this tree before the edit rather than recalled from the ticket: seven
// tests set `process.env.VITE_SUPABASE_ANON_KEY = "regression-placeholder"` at the top of their own
// run() so a client constructor will not throw. LOG-41 then reads that same variable to decide
// whether its anon-grant arm can run, sees a value, takes the branch, and POSTs the literal string
// `regression-placeholder` to PostgREST as an API key -- HTTP 401. The suite reported 98/100 with
// `[FAIL] LOG-41 ... anon cannot SELECT ai_pattern_agent_hop_rollup`, accusing a grant that is
// demonstrably present; the SAME test run standalone PASSED, with that arm correctly declared
// NOT RUN. Red in the suite, green alone, same commit.
//
// WHY THE RESTORE LIVES HERE AND NOT IN THE SEVEN WRITERS. It fixes the CLASS -- any variable, any
// pair of tests -- in one place, and it does not have to be remembered seven more times the next
// time a test needs a placeholder. It is also the contract the suite already claims: SES-28's
// self-run guard requires every test to pass under a direct `node <file>` run, and a per-test
// restore is exactly what makes the in-suite environment equal that standalone one.
//
// THREE PROPERTIES ARE LOAD-BEARING; tests/regression/SES-215-env-isolation.js pins each with its
// own negative control, so do not "simplify" any of them away:
//   1. The snapshot is taken BEFORE the import. A snapshot taken after the test ran captures the
//      polluted env and restores nothing.
//   2. Keys the test ADDED are deleted, not merely reassigned. This is the shape of the live
//      defect: VITE_SUPABASE_ANON_KEY is absent from an unattended cloud env and is CREATED by the
//      setter, so a restore that only re-assigns remembered keys is a no-op against it.
//   3. The restore runs on BOTH arms. Same reasoning the notRun drain below already carries: a
//      test that THREW still owns whatever it wrote to the environment first.
//
// WHAT THIS IS NOT. It is not process isolation (the ticket's option (c)). That would put
// takeNotRun()'s module-level buffer across a process boundary and force the runner to re-read its
// own declarations by parsing stdout -- a second reader of an unversioned format, SES-45's
// "a second implementation agreeing with itself". The buffer stays in-process and untouched.
//
// DeepBench v7.0.300 | tests/regression/run-all.js | SES-207 -- installHintRepair() at the top of
// main(), so a skip hint announced through a plain console.log gets the same repair renderNotRun()
// gives a notRun() declaration. Rationale and the 8 -> 4 -> 0 measurement: _lib/self-run.js and
// docs/kickoffs/v7.0.300-SES-207-skip-hint-invocation.md.
//
// DeepBench v7.0.224 | tests/regression/run-all.js | SES-180 (b) -- the suite reports parts it
// could not run, instead of counting them as passes. SES-180's own ship notes name this as the
// first of three things still owed and the only one that is the runner's to do.
//
// WHAT CHANGED AND WHAT DID NOT. The pass/fail semantics are untouched: exit 1 iff something
// FAILED. A declared not-run part is information, never a failure -- gating on it would paint CI
// permanently red wherever credentials are absent, which is the exact outcome SES-180 shipped the
// regression job `continue-on-error` to avoid. What changes is that the run now SAYS it was
// partial. Measured in this clone before the edit: with no credentials the suite printed
// "50/50 passed" and nothing else, while five tests (AGT-44, CHI-31, DAT-003, DAT-11, DAT-12) had
// each skipped a credentialed half and announced it only through a console.log this file could not
// see. That 50/50 is the number SES-180 says it cannot yet gate on.
//
// THE DRAIN RUNS ON BOTH ARMS, and that is not defensive tidying: takeNotRun() empties a
// module-level buffer, so a declaration left behind by a test that THREW would be attributed to
// the next test in the sorted order. Pass and fail both drain, immediately, before the next import.
//
// DeepBench v6.3.208 | tests/regression/run-all.js | SES-009a
//
// Persistent regression suite runner. Unlike scripts/check-session-docs.js
// (a report-only tripwire, always exit 0), this is a real gate: exit 1 if
// any regression test fails. STANDARDS.md Section 2 rule 5 requires this to
// pass before any commit for Category K/M sessions, same as the session's
// own Node.js test.
//
// Each file in this directory (except this one and any `_`-prefixed helper)
// is a regression test module. It must export a default async function that
// returns/resolves on pass, or throws an Error (with a descriptive message)
// on fail, *and* call `selfRun(import.meta.url, fn)` from `_lib/self-run.js`
// (SES-28) so a direct `node <file>` run is real rather than vacuous.
//
// Usage: node tests/regression/run-all.js [--dir=<path>]
// --dir overrides the directory scanned (used by this session's own
// meta-test to point at a fixture directory instead of the real suite).

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { takeNotRun, renderNotRun, installHintRepair } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const DIR = arg("dir", __dirname);

// SES-215. A shallow copy is the whole snapshot: process.env is a flat string map whose values are
// strings, so there is nothing deeper to clone.
//
// DELIBERATELY NOT EXPORTED, and this is the edit to refuse: this module calls main() at the bottom
// with no import guard, so any test that imported these helpers to unit-test them would re-run the
// entire suite inside itself. SES-215-env-isolation.js therefore reads this file as source and
// spawns it as a subprocess -- which is the stronger proof anyway, because it exercises the runner
// rather than a function lifted out of it.
function snapshotEnv() {
  return { ...process.env };
}

// The inverse. Deleting keys the test ADDED is the half that matters against the live defect and is
// the half a "restore" written from memory omits -- see property 2 in the header.
function restoreEnv(before) {
  for (const key of Object.keys(process.env)) {
    if (!Object.prototype.hasOwnProperty.call(before, key)) delete process.env[key];
  }
  for (const key of Object.keys(before)) {
    if (process.env[key] !== before[key]) process.env[key] = before[key];
  }
}

async function main() {
  // SES-207 (v7.0.300): tests that predate notRun() announce a skipped half with a plain
  // console.log carrying `--env-file=` -- the form that hard-errors wherever .env.local is absent,
  // which is every unattended cloud cycle. Those lines never reach renderNotRun(), so the repair
  // is installed at the sink too. Installed once, for the whole run, and never restored: the
  // process exits at the end of main(), and a restore point would only be a thing to forget.
  installHintRepair();

  const files = fs.readdirSync(DIR)
    .filter(f => (f.endsWith(".js") || f.endsWith(".mjs")) && f !== "run-all.js" && !f.startsWith("_"))
    .sort();

  if (files.length === 0) {
    console.log("regression suite: no test files found in " + DIR);
    process.exit(0);
  }

  let failCount = 0;
  let notRunParts = 0;
  const partialTests = [];

  for (const file of files) {
    const fullPath = path.join(DIR, file);
    // SES-215: taken BEFORE the import, because a module's env writes are import-time side effects
    // in several of these tests, not run() bodies. A snapshot taken any later has already lost.
    const envBefore = snapshotEnv();
    try {
      const mod = await import(pathToFileURL(fullPath).href);
      if (typeof mod.default !== "function") {
        throw new Error(`${file} does not export a default async function`);
      }
      await mod.default();
      console.log(`  [PASS] ${file}`);
    } catch (e) {
      failCount++;
      console.log(`  [FAIL] ${file} -- ${e.message}`);
    }
    // SES-215, and OUTSIDE the try/catch on purpose: a test that threw still owns whatever it wrote
    // to process.env before it threw. Same both-arms reasoning as the notRun drain below.
    restoreEnv(envBefore);
    // Drained on BOTH arms -- see the header. A throw must not hand its declaration to the
    // next file, and a test that declared a part and then failed still owns that declaration.
    const declared = takeNotRun();
    if (declared.length) {
      notRunParts += declared.length;
      partialTests.push(file);
      console.log(renderNotRun(declared));
    }
  }

  console.log(`\nregression suite: ${files.length - failCount}/${files.length} passed`);
  if (notRunParts > 0) {
    // Deliberately loud, and deliberately not an error. The pass count above is true; it is just
    // not the whole story, and "50/50" read alone is what SES-180 could not gate on.
    const p = notRunParts === 1 ? "part" : "parts";
    const t = partialTests.length === 1 ? "test" : "tests";
    console.log(
      `NOT A FULL RUN: ${notRunParts} ${p} declared not-run across ${partialTests.length} ${t} ` +
      `(${partialTests.join(", ")}). Those parts are UNVERIFIED -- a green suite does not cover them.`
    );
  }
  process.exit(failCount > 0 ? 1 : 0);
}

main();
