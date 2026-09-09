// DeepBench v7.0.425 | tests/regression/SES-243-prime-directive-autodone.js | SES-340 -- THE
// WIDENING IS KEYED ON A PROJECT, NOT ON A DIRECTIVE ROW, and the RULE this file guards is unchanged:
// the CLASS restriction of charter decision 2 is suspended only while something is PROVEN LIVE, and
// every other value of that flag keeps the narrow rule. Only the thing being proven moved -- from a
// queued `runner_directives` row opening `THE SELFBUILD PRIME DIRECTIVE` (closed `superseded`
// 2026-09-09, gate decision `96bbed72`) to `EXISTS (projects WHERE status='executing')`. So
// the flag `primeDirectiveActive` became `projectExecuting`, and every strictness and fail-closed clause below
// moved with it verbatim, which is the point: the assertions did not need weakening to survive the
// re-homing.
//
// ONE CLAUSE WAS REPLACED RATHER THAN MOVED. `theLookupKeyIsAnchoredAtTheBodyStart()` guarded a
// body-prefix match that no longer exists -- a `status=eq.executing` filter cannot false-positive on
// a row that merely DISCUSSES a project, so the risk it paid for is gone. In its place,
// `theTwoProjectFlagsAreNotOneFlag()` pins the boundary SES-340 actually created: `epicProjectExecuting`
// (this TICKET's epic) and `projectExecuting` (the BOARD) are two lookups, they can disagree, and
// collapsing them would let a failed projects read be answered by the ticket read.
//
// DeepBench v7.0.322 | tests/regression/SES-243-prime-directive-autodone.js | SES-243 (Selfbuild M3
// - Independent Verification)
//
// Guards the ONE rule SES-243 shipped: the auto-done bar's CLASS restriction is charter decision 2's,
// and Prime Directive a0ef9525 §2f suspends it -- for its duration, on in-scope ships only,
// and only when the widening is PROVEN LIVE. (SES-340 re-homed "in scope" and "proven live" onto
// `projects.status`; the rule's shape is what this file has always guarded.)
//
// THE ASSERTION THAT CARRIES THIS TICKET, and the reason the file is not merely complete: the
// permissive path must be reachable ONLY through `projectExecuting === true`. Every other value
// the flag can take -- absent, undefined, null, false, and the truthy-but-not-true strings a REST
// payload can hand you -- has to land on charter decision 2's narrow rule. That is not defensive
// style: this flag is the difference between John tapping Accept and a cycle writing `done` on its
// own authority, so "unknown" and "yes" must not be collapsible. The obvious implementation
// (`if (projectExecuting)`) collapses them for the string "false", which is exactly what a
// mis-parsed lookup produces, and `retiredTruthyForm()` below applies that retired shape to the same
// fixture and asserts it LOSES.
//
// Everything is IMPORTED from scripts/verifier.js, never restated -- the SES-199 / SES-181
// convention, so a later widening or narrowing moves these assertions with it and shows up in this
// file's diff rather than silently.
//
// WHAT THIS FILE DELIBERATELY DOES NOT TEST: the live REST lookup in main(). Reaching it needs
// credentials and would read the real `projects` table; its behaviour on every failure path
// is instead pinned where it is decidable -- the eligibility function's default -- which is the half
// that decides whether a ticket is auto-doned. Declared with notRun() rather than left implied.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  AUTO_DONE_SCOPE,
  AUTO_DONE_CLASS_PREFIX,
  SELF_CERTIFYING_PATHS,
  autoDoneEligibility,
  parsePorcelainPath,
} from "../../scripts/verifier.js";

// A delivery in an EXECUTING PROJECT in a NON-tooling class -- SES-241's own live shape (P9 - Bug
// Fixes, verdict approve, all three gates green), which is the row that found this defect, re-homed
// by SES-340 onto the project flag the epic name used to stand in for.
const EXECUTING_NON_TOOLING = Object.freeze({
  verdict: "approve",
  epicName: "Governance Agents M3 - Designer & Builder",
  epicProjectExecuting: true,
  priorityClass: "P9 - Bug Fixes",
  changedFiles: ["docs/runbooks/runner-cycle.md", "scripts/heal-engine.js"],
});

// ---------------------------------------------------------------------------
// The defect, stated as a measurement: without the widening, SES-241's shape is ineligible
// ---------------------------------------------------------------------------
function theDefectIsReproducedBeforeItIsFixed() {
  const e = autoDoneEligibility(EXECUTING_NON_TOOLING);
  assert.strictEqual(e.eligible, false,
    "with the widening not proven live, charter decision 2's P10 - Tooling scope stands and a P9 " +
    "in-scope ship is NOT auto-done eligible. This is the pre-SES-243 behaviour and it is correct " +
    "whenever nothing is proven executing.");
  assert.ok(/P10/.test(e.reason), "the reason must still name the class rule it failed");
}

// ---------------------------------------------------------------------------
// The widening: the same fixture, with a project executing, IS eligible -- one variable
// ---------------------------------------------------------------------------
function thePrimeDirectiveWidensTheClass() {
  const e = autoDoneEligibility({ ...EXECUTING_NON_TOOLING, projectExecuting: true });
  assert.strictEqual(e.eligible, true,
    "§2f's successor: any in-scope ship the verifier lane passes GREEN auto-dones while a project " +
    "is executing. The ONLY difference from the fixture above is projectExecuting, so the flag is " +
    "doing the work rather than some other property of the row.");
  assert.ok(/suspended for its duration/.test(e.reason),
    "the granting authority must be NAMED in the stored reason: decision 2 is standing charter, " +
    "the widening lasts only while a project executes, and the ledger has to keep them apart");
}

// ---------------------------------------------------------------------------
// THE NEGATIVE CONTROL IS THE RETIRED SHAPE, applied to the same fixture and asserted to lose
// ---------------------------------------------------------------------------
function retiredTruthyForm() {
  // The tempting implementation -- `const widened = projectExecuting;` -- is truthy-tested.
  // A REST layer that hands back the STRING "false", or any non-empty string, then widens the bar
  // while nothing is executing. Assert the shipped form rejects exactly what the retired one would
  // have accepted. `"paused"` is in the list because it is a REAL projects.status value and the one
  // a careless read of the row (rather than of the filtered result) would hand back (SES-340).
  for (const notProvenLive of ["false", "0", "no", {}, [], "paused"]) {
    const e = autoDoneEligibility({ ...EXECUTING_NON_TOOLING, projectExecuting: notProvenLive });
    assert.strictEqual(e.eligible, false,
      `projectExecuting=${JSON.stringify(notProvenLive)} is TRUTHY but is not proof a project is ` +
      `executing. The retired truthy form would widen here; the shipped strict-true form ` +
      `must not.`);
  }
  // NEGATIVE CONTROL for the control: real boolean true still widens, so the strictness above is
  // not simply breaking the feature.
  assert.strictEqual(
    autoDoneEligibility({ ...EXECUTING_NON_TOOLING, projectExecuting: true }).eligible, true);
}

function everyUnknownFailsClosed() {
  for (const unknown of [undefined, null, false]) {
    assert.strictEqual(
      autoDoneEligibility({ ...EXECUTING_NON_TOOLING, projectExecuting: unknown }).eligible, false,
      "a failed lookup, a caller that never passed the flag, and a genuinely paused board are ONE " +
      "answer -- not proven live -- and all keep the narrow rule");
  }
  // The absent-key case is the one a future caller is most likely to produce, and it is the same
  // shape tests/regression/SES-181-verifier.js's own ELIGIBLE fixture uses -- which is what keeps
  // that file passing unchanged across this ship.
  assert.strictEqual(autoDoneEligibility(EXECUTING_NON_TOOLING).eligible, false);
}

// ---------------------------------------------------------------------------
// What §2f did NOT widen -- the two restrictions that must survive it
// ---------------------------------------------------------------------------
function theEpicRestrictionSurvivesTheWidening() {
  // The widening says "any IN-SCOPE ship". A board with something executing must not auto-done work
  // whose OWN project is paused (SES-340: the scope is `epicProjectExecuting`, not the epic's name).
  const e = autoDoneEligibility({
    ...EXECUTING_NON_TOOLING, epicName: "Automation", epicProjectExecuting: false, projectExecuting: true,
  });
  assert.strictEqual(e.eligible, false,
    "the widening widens the CLASS, never the SCOPE. Collapsing the two would hand auto-done to " +
    "every epic on the board on the strength of one project being executing.");
  assert.ok(/executing project/.test(e.reason));

  // An unknown project still fails closed even with the board executing.
  assert.strictEqual(
    autoDoneEligibility({
      ...EXECUTING_NON_TOOLING, epicName: null, epicProjectExecuting: null, projectExecuting: true,
    }).eligible,
    false);
}

function selfCertificationStillRefusesUnderTheWidening() {
  // Charter premise 3 is not a class rule and §2f does not reach it. This is the assertion that
  // matters most for THIS ticket specifically: SES-243's own delivery edits scripts/verifier.js, so
  // it must be ineligible by construction even though the directive is live and the epic matches.
  for (const p of SELF_CERTIFYING_PATHS) {
    const e = autoDoneEligibility({
      ...EXECUTING_NON_TOOLING, changedFiles: ["docs/SESSIONS.md", p], projectExecuting: true,
    });
    assert.strictEqual(e.eligible, false,
      `a delivery touching ${p} grades itself; §2f widens the class and leaves charter premise 3 ` +
      `exactly where it was`);
    assert.ok(/certif/i.test(e.reason));
  }
  // An unreadable diff is still not innocent, widening or no widening.
  assert.strictEqual(
    autoDoneEligibility({ ...EXECUTING_NON_TOOLING, changedFiles: null, projectExecuting: true }).eligible,
    false);
}

function theVerdictStillOutranksEverything() {
  // A block can never be auto-doned, however live the directive is.
  const e = autoDoneEligibility({
    ...EXECUTING_NON_TOOLING, verdict: "block", projectExecuting: true,
  });
  assert.strictEqual(e.eligible, false,
    "§2f's own words are 'the verifier lane passes GREEN'. A widening that outran the verdict would " +
    "auto-done a change whose build never passed.");
  assert.ok(/approve/.test(e.reason));
}

// ---------------------------------------------------------------------------
// SES-340, replacing theLookupKeyIsAnchoredAtTheBodyStart(): the SCOPE flag and the WIDENING flag
// are two lookups, and the case that matters is the one where they disagree
// ---------------------------------------------------------------------------
function theTwoProjectFlagsAreNotOneFlag() {
  // WHY THIS CLAUSE EXISTS AT ALL. main() makes TWO reads: the ticket's own epic (embedded through
  // `epics.project_id -> projects`) and a board-wide `projects?status=eq.executing`. The obvious
  // "simplification" -- derive one from the other, since a ticket whose project executes proves a
  // project executes -- is wrong in exactly the direction that matters: the projects read can FAIL
  // while the ticket read succeeds, and the failure must narrow the bar, not be answered by the
  // other lookup. All four combinations are pinned so no future editor can collapse them.
  const at = (epicProjectExecuting, projectExecuting) =>
    autoDoneEligibility({ ...EXECUTING_NON_TOOLING, epicProjectExecuting, projectExecuting });

  // (true, true): in scope AND widened -> the only eligible corner for a non-tooling class.
  assert.strictEqual(at(true, true).eligible, true);
  // (true, false): in scope, widening NOT proven -- e.g. the projects read errored. The class
  // restriction comes back and the P9 ship stays `delivered`. THIS is the corner a collapse would
  // silently turn into an auto-done.
  const scopedButNotWidened = at(true, false);
  assert.strictEqual(scopedButNotWidened.eligible, false,
    "a failed projects read must NOT be answered by the ticket's own project row -- unknown " +
    "narrows the bar, it never widens it");
  assert.ok(/P10/.test(scopedButNotWidened.reason),
    "and the refusal must be the CLASS rule's, not the scope rule's: the ticket is in scope");
  // (false, true): the board is executing but THIS ticket's project is not -- refused on scope.
  const widenedButNotScoped = at(false, true);
  assert.strictEqual(widenedButNotScoped.eligible, false);
  assert.ok(/executing project/.test(widenedButNotScoped.reason),
    "and the refusal must be the SCOPE rule's, not the class rule's -- the two are told apart in " +
    "the ledger or a reader cannot tell which one to go fix");
  // (false, false): neither.
  assert.strictEqual(at(false, false).eligible, false);

  // NON-VACUITY: the two refusals above must carry DIFFERENT reasons, or this clause would pass
  // even if both flags fed one collapsed test.
  assert.notStrictEqual(scopedButNotWidened.reason, widenedButNotScoped.reason);
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
      ...EXECUTING_NON_TOOLING,
      changedFiles: [parsePorcelainPath(" M scripts/verifier.js")],
      projectExecuting: true,
    }).eligible,
    false,
    "the parse and the refusal have to work as one; asserting the string alone would pass even if " +
    "SELF_CERTIFYING_PATHS were emptied");
}

// ---------------------------------------------------------------------------
// Vacuity meta-check (SES-158's convention): the fixture must be able to pass at all
// ---------------------------------------------------------------------------
function theFixtureIsNotVacuous() {
  // If EXECUTING_NON_TOOLING were malformed -- wrong epic, a self-certifying path, a block verdict --
  // every assertion above would pass for the wrong reason. Prove the fixture reaches eligible on the
  // one path it is supposed to.
  assert.strictEqual(
    autoDoneEligibility({ ...EXECUTING_NON_TOOLING, projectExecuting: true }).eligible, true,
    "the shared fixture must be genuinely eligible under the widening, or every ineligible " +
    "assertion in this file is vacuous");
  // And it must be a NON-tooling class, or this whole file tests nothing SES-181 did not already.
  assert.ok(!EXECUTING_NON_TOOLING.priorityClass.startsWith(AUTO_DONE_CLASS_PREFIX),
    "the fixture's class must NOT be P10, or the widening is never exercised");
  // SES-340: and it must be IN SCOPE, or every widening assertion above would be losing on the
  // scope test and this file would be measuring the wrong refusal.
  assert.strictEqual(EXECUTING_NON_TOOLING.epicProjectExecuting, true,
    "the fixture's project must be executing, or the class clauses never get reached");
  // AUTO_DONE_SCOPE is imported so this file moves with a rename of the scope's WORDING, the
  // SES-199 convention; it is a label and nothing here branches on it.
  assert.ok(String(AUTO_DONE_SCOPE).length > 0);
}

function run() {
  notRun(
    "the live projects lookup in main()",
    "it needs SUPABASE_URL/SUPABASE_SERVICE_KEY and would read the real projects table; its " +
    "failure paths are pinned instead at autoDoneEligibility's default, which is the half that " +
    "decides whether a ticket is auto-doned. tests/regression/ses-340-projects-govern.test.mjs " +
    "grades the live board itself (SES-340)"
  );

  theDefectIsReproducedBeforeItIsFixed();
  thePrimeDirectiveWidensTheClass();
  retiredTruthyForm();
  everyUnknownFailsClosed();
  theEpicRestrictionSurvivesTheWidening();
  selfCertificationStillRefusesUnderTheWidening();
  theVerdictStillOutranksEverything();
  theTwoProjectFlagsAreNotOneFlag();
  anUnstagedEditIsSeenByTheSelfCertificationCheck();
  theFixtureIsNotVacuous();
}

selfRun(import.meta.url, run);
export default run;
