// DeepBench v7.0.322 | tests/regression/SES-243-prime-directive-autodone.js | SES-243 (Selfbuild M3
// - Independent Verification)
//
// Guards the ONE rule SES-243 shipped: the auto-done bar's CLASS restriction is charter decision 2's,
// and Prime Directive a0ef9525 §2f suspends it -- for its duration, on Selfbuild-epic ships only,
// and only when the directive is PROVEN LIVE.
//
// THE ASSERTION THAT CARRIES THIS TICKET, and the reason the file is not merely complete: the
// permissive path must be reachable ONLY through `primeDirectiveActive === true`. Every other value
// the flag can take -- absent, undefined, null, false, and the truthy-but-not-true strings a REST
// payload can hand you -- has to land on charter decision 2's narrow rule. That is not defensive
// style: this flag is the difference between John tapping Accept and a cycle writing `done` on its
// own authority, so "unknown" and "yes" must not be collapsible. The obvious implementation
// (`if (primeDirectiveActive)`) collapses them for the string "false", which is exactly what a
// mis-parsed lookup produces, and `retiredTruthyForm()` below applies that retired shape to the same
// fixture and asserts it LOSES.
//
// Everything is IMPORTED from scripts/verifier.js, never restated -- the SES-199 / SES-181
// convention, so a later widening or narrowing moves these assertions with it and shows up in this
// file's diff rather than silently.
//
// WHAT THIS FILE DELIBERATELY DOES NOT TEST: the live REST lookup in main(). Reaching it needs
// credentials and would read the real runner_directives table; its behaviour on every failure path
// is instead pinned where it is decidable -- the eligibility function's default -- which is the half
// that decides whether a ticket is auto-doned. Declared with notRun() rather than left implied.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  AUTO_DONE_EPIC_PREFIX,
  AUTO_DONE_CLASS_PREFIX,
  PRIME_DIRECTIVE_BODY_PREFIX,
  SELF_CERTIFYING_PATHS,
  autoDoneEligibility,
  parsePorcelainPath,
} from "../../scripts/verifier.js";

// A Selfbuild-epic delivery in a NON-tooling class -- SES-241's own live shape (P9 - Bug Fixes,
// Selfbuild M3, verdict approve, all three gates green), which is the row that found this defect.
const SELFBUILD_NON_TOOLING = Object.freeze({
  verdict: "approve",
  epicName: `${AUTO_DONE_EPIC_PREFIX} M3 - Independent Verification`,
  priorityClass: "P9 - Bug Fixes",
  changedFiles: ["docs/runbooks/runner-cycle.md", "scripts/heal-engine.js"],
});

// ---------------------------------------------------------------------------
// The defect, stated as a measurement: without the widening, SES-241's shape is ineligible
// ---------------------------------------------------------------------------
function theDefectIsReproducedBeforeItIsFixed() {
  const e = autoDoneEligibility(SELFBUILD_NON_TOOLING);
  assert.strictEqual(e.eligible, false,
    "with no live Prime Directive, charter decision 2's P10 - Tooling scope stands and a P9 " +
    "Selfbuild ship is NOT auto-done eligible. This is the pre-SES-243 behaviour and it is correct " +
    "whenever the directive is not standing.");
  assert.ok(/P10/.test(e.reason), "the reason must still name the class rule it failed");
}

// ---------------------------------------------------------------------------
// §2f: the same fixture, with the directive live, IS eligible -- one variable
// ---------------------------------------------------------------------------
function thePrimeDirectiveWidensTheClass() {
  const e = autoDoneEligibility({ ...SELFBUILD_NON_TOOLING, primeDirectiveActive: true });
  assert.strictEqual(e.eligible, true,
    "Prime Directive §2f: 'ANY Selfbuild-epic ship the verifier lane passes GREEN' auto-dones. " +
    "The ONLY difference from the fixture above is primeDirectiveActive, so the flag is doing the " +
    "work rather than some other property of the row.");
  assert.ok(/2f/.test(e.reason),
    "the granting authority must be NAMED in the stored reason: decision 2 is standing charter, " +
    "§2f is a directive John can revoke tonight, and the ledger has to keep them apart");
}

// ---------------------------------------------------------------------------
// THE NEGATIVE CONTROL IS THE RETIRED SHAPE, applied to the same fixture and asserted to lose
// ---------------------------------------------------------------------------
function retiredTruthyForm() {
  // The tempting implementation -- `const widened = primeDirectiveActive;` -- is truthy-tested.
  // A REST layer that hands back the STRING "false", or any non-empty string, then widens the bar
  // on a directive that is not standing. Assert the shipped form rejects exactly what the retired
  // one would have accepted.
  for (const notProvenLive of ["false", "0", "no", {}, [], "queued"]) {
    const e = autoDoneEligibility({ ...SELFBUILD_NON_TOOLING, primeDirectiveActive: notProvenLive });
    assert.strictEqual(e.eligible, false,
      `primeDirectiveActive=${JSON.stringify(notProvenLive)} is TRUTHY but is not proof the ` +
      `directive is live. The retired truthy form would widen here; the shipped strict-true form ` +
      `must not.`);
  }
  // NEGATIVE CONTROL for the control: real boolean true still widens, so the strictness above is
  // not simply breaking the feature.
  assert.strictEqual(
    autoDoneEligibility({ ...SELFBUILD_NON_TOOLING, primeDirectiveActive: true }).eligible, true);
}

function everyUnknownFailsClosed() {
  for (const unknown of [undefined, null, false]) {
    assert.strictEqual(
      autoDoneEligibility({ ...SELFBUILD_NON_TOOLING, primeDirectiveActive: unknown }).eligible, false,
      "a failed lookup, a caller that never passed the flag, and a revoked directive are ONE " +
      "answer -- not proven live -- and all keep the narrow rule");
  }
  // The absent-key case is the one a future caller is most likely to produce, and it is the same
  // shape tests/regression/SES-181-verifier.js's own ELIGIBLE fixture uses -- which is what keeps
  // that file passing unchanged across this ship.
  assert.strictEqual(autoDoneEligibility(SELFBUILD_NON_TOOLING).eligible, false);
}

// ---------------------------------------------------------------------------
// What §2f did NOT widen -- the two restrictions that must survive it
// ---------------------------------------------------------------------------
function theEpicRestrictionSurvivesTheWidening() {
  // §2f says "ANY SELFBUILD-EPIC ship". A live directive must not auto-done work outside the family.
  const e = autoDoneEligibility({
    ...SELFBUILD_NON_TOOLING, epicName: "Automation", primeDirectiveActive: true,
  });
  assert.strictEqual(e.eligible, false,
    "§2f widens the CLASS, never the FAMILY. Collapsing the two would hand auto-done to every epic " +
    "on the board on the strength of a directive scoped to Selfbuild.");
  assert.ok(new RegExp(AUTO_DONE_EPIC_PREFIX).test(e.reason));

  // No epic still fails closed even with the directive live.
  assert.strictEqual(
    autoDoneEligibility({ ...SELFBUILD_NON_TOOLING, epicName: null, primeDirectiveActive: true }).eligible,
    false);
}

function selfCertificationStillRefusesUnderTheWidening() {
  // Charter premise 3 is not a class rule and §2f does not reach it. This is the assertion that
  // matters most for THIS ticket specifically: SES-243's own delivery edits scripts/verifier.js, so
  // it must be ineligible by construction even though the directive is live and the epic matches.
  for (const p of SELF_CERTIFYING_PATHS) {
    const e = autoDoneEligibility({
      ...SELFBUILD_NON_TOOLING, changedFiles: ["docs/SESSIONS.md", p], primeDirectiveActive: true,
    });
    assert.strictEqual(e.eligible, false,
      `a delivery touching ${p} grades itself; §2f widens the class and leaves charter premise 3 ` +
      `exactly where it was`);
    assert.ok(/certif/i.test(e.reason));
  }
  // An unreadable diff is still not innocent, widening or no widening.
  assert.strictEqual(
    autoDoneEligibility({ ...SELFBUILD_NON_TOOLING, changedFiles: null, primeDirectiveActive: true }).eligible,
    false);
}

function theVerdictStillOutranksEverything() {
  // A block can never be auto-doned, however live the directive is.
  const e = autoDoneEligibility({
    ...SELFBUILD_NON_TOOLING, verdict: "block", primeDirectiveActive: true,
  });
  assert.strictEqual(e.eligible, false,
    "§2f's own words are 'the verifier lane passes GREEN'. A widening that outran the verdict would " +
    "auto-done a change whose build never passed.");
  assert.ok(/approve/.test(e.reason));
}

// ---------------------------------------------------------------------------
// The lookup key: anchored, so rows that DISCUSS the directive cannot switch it on
// ---------------------------------------------------------------------------
function theLookupKeyIsAnchoredAtTheBodyStart() {
  assert.strictEqual(typeof PRIME_DIRECTIVE_BODY_PREFIX, "string");
  assert.ok(PRIME_DIRECTIVE_BODY_PREFIX.length > 0);

  // The real directive row opens with this phrase; the rows that quote it do not. If this ever
  // becomes a mid-body `like.*...*` match, SES-243's own ticket description -- which quotes
  // "Prime Directive a0ef9525 §2f" at length -- would switch the widening on by itself.
  const realDirectiveBody =
    `${PRIME_DIRECTIVE_BODY_PREFIX} - John, attended architect session 2026-08-29, verbatim: "run it".`;
  const aRowThatMerelyDiscussesIt =
    `**P10 - Tooling** - FOUND LIVE: the verifier does not implement ` +
    `${PRIME_DIRECTIVE_BODY_PREFIX} §2f, so every non-P10 Selfbuild ship lands delivered.`;

  assert.ok(realDirectiveBody.startsWith(PRIME_DIRECTIVE_BODY_PREFIX),
    "the directive row must match the anchored key");
  assert.ok(!aRowThatMerelyDiscussesIt.startsWith(PRIME_DIRECTIVE_BODY_PREFIX),
    "a row that only mentions the Prime Directive must NOT match. This is the false-positive the " +
    "body-prefix key trades against the uuid key, and the anchor is what pays for it.");
  // The retired unanchored form is the negative control: it matches BOTH, i.e. it cannot tell the
  // directive from a ticket complaining about the directive.
  assert.ok(aRowThatMerelyDiscussesIt.includes(PRIME_DIRECTIVE_BODY_PREFIX),
    "an unanchored `includes` match would accept the discussing row -- that is the shape this " +
    "assertion exists to keep out");
}

// ---------------------------------------------------------------------------
// The porcelain parse -- charter premise 3's reach, and it was INERT for unstaged changes
// ---------------------------------------------------------------------------
function anUnstagedEditIsSeenByTheSelfCertificationCheck() {
  // FOUND LIVE 2026-08-29 by this ticket's own QA: the verifier, running on a tree whose only
  // change was an unstaged edit to scripts/verifier.js, reported "the diff touches none of
  // scripts/verifier.js". A cycle is in exactly that state at step 7a, because the verifier runs
  // BEFORE the commit -- so this is the normal case, not an edge one.
  assert.strictEqual(parsePorcelainPath(" M scripts/verifier.js"), "scripts/verifier.js",
    "worktree-only modification: column 1 is a SPACE and it is DATA. The retired form trimmed it " +
    "away first, leaving 'M scripts/verifier.js', which matches no path and made the " +
    "self-certification refusal inert for every unstaged change.");

  // The staged form must keep working -- it is what made the defect invisible, so a fix that broke
  // it would trade one blind spot for another.
  assert.strictEqual(parsePorcelainPath("M  scripts/verifier.js"), "scripts/verifier.js");
  assert.strictEqual(parsePorcelainPath("?? tests/regression/new.js"), "tests/regression/new.js");
  assert.strictEqual(parsePorcelainPath("R  old.js -> scripts/verifier.js"), "scripts/verifier.js",
    "a rename keeps its DESTINATION -- renaming a file INTO a self-certifying path is still a " +
    "change to the verification");

  // NEGATIVE CONTROL: the retired expression applied to the SAME line, asserted to lose.
  const retired = " M scripts/verifier.js".trim().replace(/^.{2}\s+/, "").replace(/^.*\s->\s/, "");
  assert.notStrictEqual(retired, "scripts/verifier.js",
    "if the retired form ever produced the right answer here, this clause would be vacuous");
  assert.strictEqual(retired, "M scripts/verifier.js",
    "the retired form's actual output, pinned so the defect is recorded rather than described");

  // And the end-to-end consequence: a delivery carrying that parsed path must be refused the bar.
  assert.strictEqual(
    autoDoneEligibility({
      ...SELFBUILD_NON_TOOLING,
      changedFiles: [parsePorcelainPath(" M scripts/verifier.js")],
      primeDirectiveActive: true,
    }).eligible,
    false,
    "the parse and the refusal have to work as one; asserting the string alone would pass even if " +
    "SELF_CERTIFYING_PATHS were emptied");
}

// ---------------------------------------------------------------------------
// Vacuity meta-check (SES-158's convention): the fixture must be able to pass at all
// ---------------------------------------------------------------------------
function theFixtureIsNotVacuous() {
  // If SELFBUILD_NON_TOOLING were malformed -- wrong epic, a self-certifying path, a block verdict --
  // every assertion above would pass for the wrong reason. Prove the fixture reaches eligible on the
  // one path it is supposed to.
  assert.strictEqual(
    autoDoneEligibility({ ...SELFBUILD_NON_TOOLING, primeDirectiveActive: true }).eligible, true,
    "the shared fixture must be genuinely eligible under §2f, or every ineligible assertion in this " +
    "file is vacuous");
  // And it must be a NON-tooling class, or this whole file tests nothing SES-181 did not already.
  assert.ok(!SELFBUILD_NON_TOOLING.priorityClass.startsWith(AUTO_DONE_CLASS_PREFIX),
    "the fixture's class must NOT be P10, or the widening is never exercised");
}

function run() {
  notRun(
    "the live runner_directives lookup in main()",
    "it needs SUPABASE_URL/SUPABASE_SERVICE_KEY and would read the real directive ledger; its " +
    "failure paths are pinned instead at autoDoneEligibility's default, which is the half that " +
    "decides whether a ticket is auto-doned"
  );

  theDefectIsReproducedBeforeItIsFixed();
  thePrimeDirectiveWidensTheClass();
  retiredTruthyForm();
  everyUnknownFailsClosed();
  theEpicRestrictionSurvivesTheWidening();
  selfCertificationStillRefusesUnderTheWidening();
  theVerdictStillOutranksEverything();
  theLookupKeyIsAnchoredAtTheBodyStart();
  anUnstagedEditIsSeenByTheSelfCertificationCheck();
  theFixtureIsNotVacuous();
}

selfRun(import.meta.url, run);
export default run;
