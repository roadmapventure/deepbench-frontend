// DeepBench v7.0.224 | tests/regression/_lib/self-run.js | SES-180 (b) -- notRun(): a test can
// now DECLARE a part it could not run here, and the harness can see the declaration. Before this,
// the only two outcomes a test could produce were PASS and FAIL, so the five tests that already
// detected a missing-credential gap (AGT-44, CHI-31, DAT-003, DAT-11, DAT-12) announced it with a
// console.log run-all.js cannot read and were counted PASS -- a suite printing "50/50 passed" over
// five partial runs. THE UNIT IS THE PART, NOT THE TEST, and that is not a stylistic choice: all
// five skip a HALF (CHI-31's own comment insists on it -- "below every source-parsed assertion and
// above the first credentialed one"), so marking the whole file skipped would throw away real
// passing assertions. DECLARED, NEVER INFERRED: this is a call the test makes. Nothing here reads
// process.env or parses output on a test's behalf -- a harness that guesses at skips swallows real
// failures, which is the failure SES-180's own header names.
//
// DeepBench v6.3.208 | tests/regression/_lib/self-run.js | SES-28
//
// Self-run guard for regression test modules. run-all.js imports each test module
// and calls its default export; before SES-28 a bare `node tests/regression/<file>.js`
// imported the module, called nothing, and exited 0 -- a vacuous green on the suite
// that gates the beta ship bar (docs/BETA.md bucket 1). Found by S-LOG-86's coding
// session, verified live 2026-07-28.
//
// Each test file calls selfRun(import.meta.url, run) at the bottom. It fires ONLY when
// that file is the process entry point, so run-all.js's imports are unaffected.

import path from "path";
import { fileURLToPath } from "url";

// Pure -- tests/regression/SES-28-self-run-guard.js asserts this directly.
// Windows: argv[1] and import.meta.url can disagree on drive-letter case, so compare
// case-insensitively there and exactly everywhere else.
export function isEntryPoint(moduleUrl, argv1, platform = process.platform) {
  if (!argv1) return false;
  const self = path.resolve(fileURLToPath(moduleUrl));
  const entry = path.resolve(argv1);
  return platform === "win32"
    ? self.toLowerCase() === entry.toLowerCase()
    : self === entry;
}

// --- SES-180 (b): declared not-run parts -------------------------------------------------------
//
// A test calls notRun(part, reason) at the point it decides it cannot verify something here, then
// returns or carries on as it likes. The declaration does NOT change the test's own outcome: a
// test that declares a part and then passes its remaining assertions still PASSES. It only makes
// the gap visible to whoever reads the result, which is the whole point -- an invisible gap is
// indistinguishable from coverage.
const notRunParts = [];

export function notRun(part, reason) {
  if (!part) throw new Error("notRun(part, reason): `part` must name the part that did not run");
  if (!reason) throw new Error("notRun(part, reason): `reason` must say why -- an unexplained gap is worse than none");
  notRunParts.push({ part: String(part), reason: String(reason) });
}

// Drained by the caller (run-all.js after every module, pass or fail; selfRun below). Draining
// rather than reading is deliberate: the buffer is module-level, so a declaration left behind by a
// test that THREW would otherwise be attributed to the next test in the suite.
export function takeNotRun() {
  return notRunParts.splice(0, notRunParts.length);
}

export function renderNotRun(entries, indent = "       ") {
  return entries.map(e => `${indent}[NOT RUN] ${e.part} -- ${e.reason}`).join("\n");
}

export function selfRun(moduleUrl, fn) {
  if (!isEntryPoint(moduleUrl, process.argv[1])) return;
  const name = path.basename(fileURLToPath(moduleUrl));
  const report = () => {
    const parts = takeNotRun();
    if (parts.length) console.log(renderNotRun(parts, "         "));
  };
  Promise.resolve()
    .then(fn)
    .then(() => { console.log(`  [PASS] ${name}`); report(); process.exit(0); })
    .catch(e => { console.log(`  [FAIL] ${name} -- ${e.message}`); report(); process.exit(1); });
}
