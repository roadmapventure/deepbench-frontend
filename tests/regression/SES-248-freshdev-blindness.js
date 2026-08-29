// DeepBench v7.0.331 | tests/regression/SES-248-freshdev-blindness.js | SES-248
//
// Guards the ship that stopped scripts/check-session-docs.js's origin/dev reader from spelling
// "I could not look" the same way it spells "there was nothing to find".
//
// THE DEFECT, in one sentence: freshDevDirEntries() shelled `git -C SHARED_CHECKOUT`, and
// SHARED_CHECKOUT is a hard-coded Windows path, so on every non-Windows run the catch returned []
// -- and [] is exactly what "no inflight markers exist" looks like. Check 1b's inflight arm and
// checks 5/5b/5d therefore reported a clean pass on every cloud run, loudly on stderr and silently
// in the findings.
//
// TWO HALVES SHIPPED, AND THIS FILE PINS BOTH, because each alone leaves half the hole open:
//   (A) RESOLUTION -- SHARED_CHECKOUT first (John's machine unchanged), then the running worktree.
//   (B) ANNOUNCEMENT -- when neither resolves, one aggregated WARN instead of a silent [].
// A test of (A) alone would pass on a build that resolves nothing and says nothing in some third
// environment; a test of (B) alone would pass on a build that never actually reads anything.
//
// EVERY CLAUSE CARRIES ITS NEGATIVE CONTROL, and for (B) the control IS the retired behaviour: the
// same unreachable-root condition, run through a resolver that reports nothing, must produce ZERO
// findings where the shipped function produces one. That proves a DIFFERENCE from the old build
// rather than a property both share.
//
// IT DRIVES THE REAL IMPLEMENTATION (docs/STANDARDS.md Section 4, the SES-45 rule): the ordering is
// asserted through the exported resolveFreshDevRoot() itself, never against a re-typed candidate
// list, because a copy of that list here would be the same one-fact-two-homes defect the sibling
// ticket SES-245 had just finished removing from this very file.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import {
  resolveFreshDevRoot,
  freshDevRoot,
  freshDevDirEntries,
  checkFreshDevReader,
  SHARED_CHECKOUT,
} from "../../scripts/check-session-docs.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const nullResolver = () => null;
const someResolver = () => "/some/real/checkout";

// ---- Clause 1: SHARED_CHECKOUT is tried FIRST, and the fallback only then ----
// The order is not cosmetic: SHARED_CHECKOUT is the shared checkout 5-7 concurrent sessions
// coordinate through, so preferring the local worktree on John's machine would answer "what is on
// origin/dev?" from whichever session happened to be running the check.
function sharedCheckoutWinsWhenItExists() {
  const seen = [];
  const probe = d => { seen.push(d); return true; };   // everything is a checkout
  assert.strictEqual(
    resolveFreshDevRoot([SHARED_CHECKOUT, "/fallback"], probe),
    SHARED_CHECKOUT,
    "with both candidates usable, the shared checkout must win",
  );
  assert.deepStrictEqual(seen, [SHARED_CHECKOUT], "the fallback must not even be probed when the first candidate serves");
}

function theFallbackIsReachedOnlyWhenTheFirstFails() {
  const probe = d => d !== SHARED_CHECKOUT;
  assert.strictEqual(
    resolveFreshDevRoot([SHARED_CHECKOUT, "/fallback"], probe),
    "/fallback",
    "an unusable shared checkout must fall through to the running worktree",
  );

  // NEGATIVE CONTROL: the pre-change build had NO fallback -- one candidate, and nothing behind it.
  assert.strictEqual(
    resolveFreshDevRoot([SHARED_CHECKOUT], probe),
    null,
    "the single-candidate form is the retired behaviour and must resolve nothing -- that is the defect",
  );
}

function nothingUsableResolvesToNullNotToAGuess() {
  assert.strictEqual(
    resolveFreshDevRoot([SHARED_CHECKOUT, "/fallback"], () => false),
    null,
    "with no usable candidate the resolver must return null, never fall back to a path it never verified",
  );
}

// ---- Clause 2: an unreachable reader ANNOUNCES itself ----
function anUnreachableReaderWarnsInsteadOfPassingQuietly() {
  const findings = [];
  checkFreshDevReader(findings, nullResolver);

  assert.strictEqual(findings.length, 1, "an unresolvable root must produce exactly one aggregated finding, not one per call site");
  const [f] = findings;
  assert.strictEqual(f.severity, "WARN", "this is an environment fact, never a defect in the tree under test");
  assert.strictEqual(f.check, "1b");

  // It must name WHICH checks went blind -- a warning that does not say what it invalidates is
  // still an invitation to read the run as clean.
  for (const named of ["1b", "5", "5b", "5d"]) {
    assert.ok(
      new RegExp(`\\b${named}\\b`).test(f.detail),
      `the WARN must name check ${named} as one of the blind ones`,
    );
  }
  assert.ok(
    /could not look/.test(f.detail) && /never "nothing to find"/.test(f.detail),
    "the WARN must state the distinction the defect erased: an empty result here is not a clean pass",
  );
}

// ---- Clause 3: THE VACUITY GUARD -- it must not fire when the reader works ----
// A fix that traded a false all-clear for a permanent false alarm would be no better, and this run
// would not notice: every cloud run resolves a root, so a WARN that always fired would look normal.
function aWorkingReaderSaysNothing() {
  const findings = [];
  checkFreshDevReader(findings, someResolver);
  assert.deepStrictEqual(findings, [], "a resolvable root is the quiet case and must produce no finding at all");

  // And on THIS tree the real resolver must genuinely resolve -- otherwise every other clause here
  // is being asserted in an environment where the feature is inert.
  const live = freshDevRoot();
  assert.ok(live !== null, "the real resolver must find a usable checkout on the tree this suite runs against");
  assert.ok(fs.existsSync(path.join(live, ".git")) || live === SHARED_CHECKOUT,
    "the resolved root must be a real checkout, not a path that merely answered a probe");

  const liveFindings = [];
  checkFreshDevReader(liveFindings);   // default resolver -- the real one
  assert.deepStrictEqual(liveFindings, [], "the real reader resolves here, so the real check must stay silent");
}

// ---- Clause 4: the reader actually READS on this tree ----
// This is the half that proves resolution, not just announcement. Pre-change, this returned [] here.
// A FLAT directory on purpose: freshDevDirEntries() basenames each ls-tree path and refetches it as
// `<dir>/<name>`, so it is contracted to flat directories (inflight/ is one). Pointed at a nested
// tree it reconstructs the wrong path for nested files and prints a stray `fatal:` -- exercising it
// there would be testing it outside its own contract. docs/runbooks/ is flat and never empty.
function theReaderReturnsRealEntriesOnThisTree() {
  const entries = freshDevDirEntries("docs/runbooks");
  assert.ok(Array.isArray(entries), "the reader must return an array");
  assert.ok(
    entries.length > 0,
    "the origin/dev reader must return real entries on this tree -- [] here is the pre-change behaviour, "
      + "which is exactly what this ticket fixed",
  );
  assert.ok(
    entries.every(e => typeof e.name === "string" && typeof e.text === "string"),
    "each entry must carry a name and its content",
  );
  assert.ok(
    entries.some(e => e.name === "runner-cycle"),
    "the listing must contain a file known to be on origin/dev, or it is not really reading the tree",
  );
}

// ---- Clause 5: the stale label is gone ----
// Arm A's finding said "In flight now" -- a CLAUDE-STATE.md section that has not existed since
// SES-177. Asserted against the source because the finding only renders when a marker is over cap.
function theFindingCallsTheEntryWhatItIs() {
  const src = fs.readFileSync(path.join(REPO, "scripts", "check-session-docs.js"), "utf8");
  const arm = src.slice(src.indexOf("function checkEntryLengths"));
  const body = arm.slice(0, arm.indexOf("\n}\n"));
  assert.ok(
    /inflight marker "inflight\/\$\{entry\.name\}\.md"/.test(body),
    "the inflight arm's finding must name the marker file it actually measured",
  );
  assert.ok(
    !/"In flight now" entry/.test(body),
    'the retired "In flight now" label must be gone -- that section has not existed since SES-177',
  );
}

function run() {
  sharedCheckoutWinsWhenItExists();
  theFallbackIsReachedOnlyWhenTheFirstFails();
  nothingUsableResolvesToNullNotToAGuess();
  anUnreachableReaderWarnsInsteadOfPassingQuietly();
  aWorkingReaderSaysNothing();
  theReaderReturnsRealEntriesOnThisTree();
  theFindingCallsTheEntryWhatItIs();
}

selfRun(import.meta.url, run);
export default run;
