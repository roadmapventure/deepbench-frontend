// DeepBench v7.0.300 | tests/regression/_lib/self-run.js | SES-207 -- renderNotRun() repairs the
// bare --env-file= hint the credential-gated tests print at their reader. Rationale, the
// measurement (8 printed occurrences pre-change), the copy-propagation finding that decided the
// fix shape, and the declared remainder live at the repairInvocation() block below and in
// docs/kickoffs/v7.0.300-SES-207-skip-hint-invocation.md.
//
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

// --- SES-207 (v7.0.300): a skip hint never hands its reader a command that hard-errors ----------
//
// THE DEFECT, measured live 2026-08-29 on an unedited tree rather than reasoned about: running the
// suite with no credentials printed the bare form `node --env-file=.env.local
// tests/regression/run-all.js` EIGHT times, once inside each credential-gated test's own notRun()
// reason -- at exactly the moment its reader is trying to run the missing half. Bare --env-file
// HARD-ERRORS where the file is absent (`node: .env.local: not found`), and .env.local is
// git-ignored, so it is absent in every unattended cloud cycle. Following the hint breaks the run.
//
// WHY THE REPAIR LIVES HERE AND NOT IN THE SEVEN TESTS, which is the whole design choice. SES-207
// named FIVE sites; the live count was SEVEN, because SES-216 and SES-220 were written AFTER the
// ticket was filed and each copied the string from a neighbouring test. So the mechanism is
// copy-propagation between test files, and correcting N sites by hand does not stop it -- the next
// author copies from whichever file they open. renderNotRun() is the ONE function every
// declaration reaches a human through (run-all.js after every module; selfRun() on a direct run),
// so repairing here covers all seven and every future one. It is also the only shape that fits
// CLAUDE.md's 3-file cap, which eight hand-edits do not.
//
// A TOKEN, NEVER A COPY OF THE COMMAND, and that distinction is the ticket's own: "two copies of
// one invocation is how the bare form came back in the first place." This module stores the flag
// token and the name of the spec -- never `node ... run-all.js` -- so nothing here can rot into a
// ninth hand-maintained copy of the invocation. The corrected text is derived from what the test
// wrote.
//
// IDEMPOTENT BY CONSTRUCTION, asserted rather than assumed: "--env-file-if-exists=" does not
// CONTAIN "--env-file=" (after `--env-file` comes `-`, not `=`), so repairing an already-correct
// reason returns it byte-identical, and repairing twice is the same as repairing once.
//
// ANNOUNCED, NEVER SILENT. Rewriting a test's own message without saying so would hide the rot
// instead of fixing it. The notice fires only when a repair actually happened, so a clean suite
// stays quiet and the notice stays a signal.
export const BARE_ENV_FILE = "--env-file=";
export const SAFE_ENV_FILE = "--env-file-if-exists=";
export const INVOCATION_SPEC = "STANDARDS.md Section 2 rule 5";

// Pure -- tests/regression/SES-61-suite-invocation.js asserts this directly, both directions.
export function repairInvocation(reason) {
  return String(reason).split(BARE_ENV_FILE).join(SAFE_ENV_FILE);
}

// THERE ARE TWO ANNOUNCEMENT PATHS, AND REPAIRING ONLY ONE MISSES MOST OF THE TICKET'S OWN SITES.
// Measured on the first post-change run rather than assumed: repairing renderNotRun() alone took
// the printed occurrences 8 -> 4, and the surviving four were AGT-44, DAT-003, DAT-11 and DAT-12 --
// four of the FIVE files SES-207 actually names. They predate notRun() (SES-180's header describes
// exactly this: "announced it only through a console.log this file could not see"), so their hint
// never reaches renderNotRun(). Repairing at the console sink as well is what closes the ticket
// instead of half of it.
//
// ANNOUNCED ONCE PER RUN, not once per line: a notice on every repaired console line would bury
// the run in its own bookkeeping, and noise is how a real signal stops being read. Same rule as
// the renderNotRun() notice, applied to a path that can fire many times.
let hintRepairAnnounced = false;

export function installHintRepair(target = console) {
  const original = target.log;
  if (original && original.__ses207HintRepair) return () => {};   // idempotent: never double-wrap
  const wrapped = (...args) => {
    let repairedAny = false;
    const out = args.map(a => {
      if (typeof a !== "string" || !a.includes(BARE_ENV_FILE)) return a;
      repairedAny = true;
      return repairInvocation(a);
    });
    original.apply(target, out);
    if (repairedAny && !hintRepairAnnounced) {
      hintRepairAnnounced = true;
      original.call(target,
        `  (hint repaired: a test above printed the bare --env-file form, which hard-errors where ` +
        `.env.local is absent. Canonical invocation: ${INVOCATION_SPEC}. Said once per run.)`);
    }
  };
  wrapped.__ses207HintRepair = true;
  target.log = wrapped;
  return () => { target.log = original; };
}

// Test-only: the announce-once latch is module state, so a guard asserting the first-repair notice
// needs to be able to start from a known point. Never called by the suite itself.
export function resetHintRepairNotice() { hintRepairAnnounced = false; }

export function renderNotRun(entries, indent = "       ") {
  const lines = entries.map(e => `${indent}[NOT RUN] ${e.part} -- ${repairInvocation(e.reason)}`);
  if (entries.some(e => String(e.reason).includes(BARE_ENV_FILE))) {
    // The notice must NOT interpolate BARE_ENV_FILE -- doing so re-prints the exact string this
    // function exists to remove, and the reader is back where they started. Caught by
    // SES-61-suite-invocation.js on this change's first run, which is the guard earning its keep
    // before the ship rather than after it.
    lines.push(
      `${indent}(hint repaired: a declaration above wrote the bare --env-file form, which ` +
      `hard-errors where .env.local is absent. Canonical invocation: ${INVOCATION_SPEC}.)`
    );
  }
  return lines.join("\n");
}

export function selfRun(moduleUrl, fn) {
  if (!isEntryPoint(moduleUrl, process.argv[1])) return;
  installHintRepair();   // SES-207: the direct-run path needs the same repair run-all.js gets
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
