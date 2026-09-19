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
  gitWorktreeList,
  checkWorktrees,
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

// ---- Clause 6 (SES-423): THE WORKTREE-LIST ARM, which this ticket shipped and left behind ----
//
// SES-248 routed freshDevText() and freshDevDirEntries() through the resolver and stopped there.
// gitWorktreeList() and check 5b's wtRoot kept the hard-coded SHARED_CHECKOUT, and that leftover
// was WORSE than the original bug rather than a remnant of it: clause 2's WARN fires only when
// freshDevRoot() resolves to NOTHING, and off Windows it resolves FINE (to the running worktree),
// so checks 5/5b/5d shelled a dead C:/ path, swallowed the throw, returned "no worktrees" and were
// covered by no announcement at all. Measured on this tree before the fix: one `fatal: cannot
// change to 'C:/Projects/deepbench-frontend'` on stderr, zero findings about it.
//
// The arms below pin the SHAPE of the answer, which is the part that erased the distinction: a
// "could not look" must not be spelled the same as "there are no worktrees".
function theWorktreeListerSaysWhenItCouldNotLook() {
  const unresolvable = gitWorktreeList(nullResolver);
  assert.strictEqual(unresolvable.ok, false, "an unresolvable root must not report a successful listing");
  assert.deepStrictEqual(unresolvable.worktrees, [], "and it must carry no worktrees");
  assert.ok(unresolvable.reason, "it must SAY why -- a bare [] is the defect, not the fix");

  // NEGATIVE CONTROL / the distinction itself: "could not look" and "looked, found none" must be
  // told apart by the caller. The retired function returned null for one and [] for the other,
  // which is exactly the pair SES-248 spent its ticket separating elsewhere in this file.
  assert.notStrictEqual(unresolvable.ok, true,
    "could-not-look must be distinguishable from a real empty listing by the ok flag alone");
}

function theRegistryIsReadFromTheCheckoutThatOwnsIt() {
  // A resolved root that is NOT the shared checkout cannot answer "which worktrees did the other
  // 5-7 sessions register?" -- it can only answer it about itself. Reporting its answer as if it
  // were the registry's produces false check-5d FLAGs naming worktrees that exist on John's
  // machine; measured here, that turned findingsTotal 118 -> 133 and tripwire-to-backlog.js
  // promoted the 16 fabricated findings to a detection class it would have FILED as a ticket.
  const elsewhere = gitWorktreeList(() => "/some/other/checkout");
  assert.strictEqual(elsewhere.ok, false,
    "a resolved root that is not the shared checkout must report could-not-look, never its own worktrees");
  assert.match(elsewhere.reason, /not the shared checkout/,
    "and it must say that is why, so the report names the limit instead of hiding it");

  // THE VACUITY GUARD, and the half that proves this is a gate rather than a blanket refusal:
  // handed the shared checkout, the function must genuinely try to list it.
  const atShared = gitWorktreeList(() => SHARED_CHECKOUT);
  assert.ok(
    atShared.ok || /git worktree list failed/.test(atShared.reason),
    "given the shared checkout the lister must actually attempt the listing -- on John's machine " +
      "that succeeds, and where the path does not exist it must fail as a LISTING failure, not be " +
      "refused by the registry gate above",
  );
}

function theBlindChecksAnnounceInsteadOfPassingClean() {
  // The whole function, driven for real against a root that cannot serve it. Before SES-423 this
  // produced NOTHING -- checks 5/5b/5d simply did not run and said nothing about it.
  const findings = [];
  checkWorktrees(findings, "## In flight now\n- `some-worktree-0101` doing a thing\n", nullResolver);
  assert.strictEqual(findings.length, 1,
    "an unusable registry must produce exactly one aggregated finding, not one per check and not none");
  const [f] = findings;
  assert.strictEqual(f.severity, "WARN",
    "a checkout this script cannot reach is an environment fact, never a defect in the tree under test");
  assert.strictEqual(f.check, "5");
  for (const named of ["5", "5b", "5d"]) {
    assert.ok(new RegExp(`\\b${named}\\b`).test(f.detail), `the WARN must name check ${named} as one that could not run`);
  }
  assert.ok(/COULD NOT LOOK/i.test(f.detail) && /never "nothing to find"/.test(f.detail),
    "it must state the distinction the defect erased, in the same words clause 2's WARN uses");

  // NEGATIVE CONTROL: the state text above names a worktree that is registered nowhere. Had the
  // checks actually run against an unusable registry, check 5d would have FLAGged it -- so the
  // absence of a 5d flag here is what proves the run announced its blindness instead of inventing
  // a finding out of it.
  assert.ok(!findings.some(x => x.check === "5d"),
    "a blind run must not emit check-5d flags -- those would be fabricated from a registry it could not read");
}

function run() {
  sharedCheckoutWinsWhenItExists();
  theFallbackIsReachedOnlyWhenTheFirstFails();
  nothingUsableResolvesToNullNotToAGuess();
  anUnreachableReaderWarnsInsteadOfPassingQuietly();
  aWorkingReaderSaysNothing();
  theReaderReturnsRealEntriesOnThisTree();
  theFindingCallsTheEntryWhatItIs();
  theWorktreeListerSaysWhenItCouldNotLook();
  theRegistryIsReadFromTheCheckoutThatOwnsIt();
  theBlindChecksAnnounceInsteadOfPassingClean();
}

selfRun(import.meta.url, run);
export default run;
