// DeepBench v7.0.433 | tests/regression/SES-181-verifier.js | AGT-67 -- THE AGENT'S OPINION IS NOT A
// PERMISSION, and both invariants are asserted against a MUTANT that has the guard removed, because
// that is the only way to answer "would this test still pass if the code guard did nothing?".
//
//   theAgentCannotTurnARedGateIntoAnApprove()   invariant (a). The mutant `withoutTheVerdictGuard()`
//                                               below is reconcileJudgment() with the mechanical
//                                               short-circuit deleted -- it returns APPROVE on the
//                                               identical fixture, which is the measurement that
//                                               makes the real assertion non-vacuous.
//   theAgentCannotBuyPastSelfCertification()    invariant (b). `withoutTheEligibilityGuard()` is the
//                                               same file with codeEligibility dropped as the
//                                               ceiling; it says ELIGIBLE on a diff touching
//                                               scripts/verifier.js -- this ship's own diff.
//   theDegradePathIsTodaysBehaviourExactly()    no agent => the mechanical verdict and the code's
//                                               own eligibility, unchanged. The `--judge=none`
//                                               default every existing caller reaches.
//   judgeModeIsValidatedNotDefaulted()          a typo'd `--judge` is an error, never a silent
//                                               downgrade to the mechanical-only lane.
//   theIntentSchemaIsTheContract()              validateAgentVerdict() against the Intent's own
//                                               stored shape, with the mutants a model really emits
//                                               (a "true" string, a missing lens, an over-long field).
//   theVerifiersOwnSkillRowsCannotTakeTheBar()  FEATURE: SES-337. Charter premise 3 over the ROWS.
//                                               Since AGT-67 the judgment is `vf-*` skill_profiles
//                                               rows, and a cycle can rewrite what the Verifier
//                                               believes without touching one byte of any file
//                                               SELF_CERTIFYING_PATHS lists. Three negative controls
//                                               keep it from going vacuous: a `pz-*` row IS
//                                               eligible (it is the PREFIX doing the work, not the
//                                               table), an empty image list IS eligible (read-and-
//                                               clean is not the same answer as unread), and an
//                                               omitted `skillRowEdit` IS eligible (an unapplied
//                                               check must not look like a refusal).
//   aVerdictMustBeAboutThisDelivery()           THE VERIFIER PUT THIS ONE HERE. Its first real run
//                                               (verdict 5f414763, finding 1) noticed pass two never
//                                               compared the agent's own backlog_id/version against
//                                               the delivery being graded, so a stale or foreign
//                                               verdict file passed the schema and landed on the
//                                               wrong ledger row.
//
// NO MODEL CALL AND NO WRITE: every AGT-67 clause here is the pure reconciliation, driven with
// fixtures. Whether the Verifier's Skill text produces a verdict that cites file:line is the
// kickoff's attended QA, run once against this ship's own commit and recorded on the v7.0.433 row.
//
// DeepBench v7.0.425 | tests/regression/SES-181-verifier.js | SES-340 -- THE SCOPE TEST IS A PROJECT
// STATUS, so the fixtures carry `epicProjectExecuting` where they used to carry a Selfbuild-shaped
// `epicName`, and the assertions follow. Two things are deliberately NOT the same edit:
//
//   * `scopeIsAnExecutingProjectOnly()` replaces `scopeIsTheSelfbuildFamilyOnly()`. The retired
//     clause looped over `Selfbuild M0..M7` names and asserted each one qualified -- a test that
//     the FENCE WAS A NAME. Its replacement asserts the opposite property, and it is the one that
//     discriminates: two fixtures identical but for `epicProjectExecuting`, one eligible and one
//     refused, plus a paused-project fixture whose epic is named `Selfbuild ...` and is REFUSED --
//     which the retired implementation would have passed and is why this clause is not vacuous.
//   * `AUTO_DONE_SCOPE` is imported and asserted to be a LABEL, never a predicate: nothing branches
//     on its value, so a regex over it is only ever checking the wording the ledger stores.
//
// DeepBench v7.0.398 | tests/regression/SES-181-verifier.js | SES-122 (b) -- the ladder branches and
// the spawn quoting. Two additions, both of which FAIL on unchanged source (autoDoneEligibility
// ignored `classAutonomy`; spawnCommandFor did not exist):
//
//   theLadderGrantsTheBarByRung()        a class the ladder has promoted takes the bar on ANY epic,
//                                        because a rung is a fact about the work CLASS -- with the
//                                        same fixture at auto_done false asserted to lose, so it is
//                                        the boolean doing the work and not the object's presence.
//   aRungNeverBuysPastSelfCertification() charter premise 3 outranks any rung. THE assertion of this
//                                        part: the grant skips the scope tests, it must not skip the
//                                        refusal, and this ship's own diff is the live instance.
//   theLadderIsReadStrictlyAndNullIsNotInnocent()  auto_done === true and nothing else.
//   spawnCommandIsQuotedOnlyForTheShell()  `C:\Program Files\nodejs\node.exe` quoted when the shell
//                                        will split it, UNTOUCHED when it is argv[0].
//
// DeepBench v7.0.247 | tests/regression/SES-181-verifier.js | SES-181 (Selfbuild M3 - Independent
// Verification)
//
// Guards the reviewer lane's two rules: the verdict rule (approve iff all three mechanical gates are
// GREEN) and the interim auto-done scope (charter decision 2 -- Selfbuild epic family, P10 - Tooling
// only). Both are IMPORTED from scripts/verifier.js, never restated here, so a later widening moves
// these assertions with it and is visible in this file's diff rather than silent. That convention is
// SES-199's (GATING_CHECKS) and John's standing line behind it: "you should never be throwing away
// tests."
//
// THE ONE ASSERTION THAT CARRIES THIS TICKET, and the reason the suite is not merely complete here:
// a gate that COULD NOT RUN must produce `block`, not `approve`. An implementation that collapsed
// 'skipped' into 'green' -- the natural shape if you write `exitCode !== 1` or default a missing
// gate to pass -- returns approve on a build that never happened, which is SES-199's rubber stamp
// with a bigger blast radius. Every skipped-arm assertion below is paired with the same fixture in
// its green form, so "would this still pass if the fail-closed rule did nothing?" answers no.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  GATES,
  AUTO_DONE_SCOPE,
  AUTO_DONE_CLASS_PREFIX,
  SELF_CERTIFYING_PATHS,
  gateStatus,
  verdictFor,
  autoDoneEligibility,
  selfCertificationBlock,
  // FEATURE: SES-337 -- charter premise 3 over the Verifier's own Skill rows.
  SELF_CERTIFYING_SKILL_PREFIX,
  SELF_CERTIFYING_SKILL_FILES,
  selfCertifyingSkillEdit,
  spawnCommandFor,
  // FEATURE: AGT-67 -- the judgment half.
  JUDGE_MODES,
  EXIT_AWAITING_JUDGMENT,
  parseJudgeMode,
  judgeContextPathFor,
  validateAgentVerdict,
  verdictIdentityMismatch,
  reconcileJudgment,
} from "../../scripts/verifier.js";

const ALL_GREEN = { build: "green", regression: "green", hygiene: "green" };

// ---------------------------------------------------------------------------
// The gating set is the charter's interim bar, and the hygiene gate is the SES-199 form
// ---------------------------------------------------------------------------
function gatingSetIsTheCharterBar() {
  assert.deepStrictEqual(
    GATES.map(g => g.key),
    ["build", "regression", "hygiene"],
    "charter decision 2 names build + regression + hygiene tripwire. Changing this set is a decision: " +
    "move the header's reasoning and this assertion together, never the set alone."
  );

  const hygiene = GATES.find(g => g.key === "hygiene");
  assert.ok(
    hygiene.argv.includes("--gate"),
    "the hygiene gate MUST use check-session-docs.js --gate. The bare form exits 0 on every path " +
    "(that is the whole of SES-199), so without the flag this gate can never be red and the verifier " +
    "rubber-stamps by construction."
  );
}

// ---------------------------------------------------------------------------
// gateStatus: three values, and 'skipped' is not 'green'
// ---------------------------------------------------------------------------
function gateStatusHasThreeValues() {
  assert.strictEqual(gateStatus({ ran: true, exitCode: 0 }), "green");
  assert.strictEqual(gateStatus({ ran: true, exitCode: 1 }), "red");
  assert.strictEqual(gateStatus({ ran: true, exitCode: 2 }), "red");

  // A process killed by a signal reports status null. NEGATIVE CONTROL for the same input shape:
  // exit 0 above is green, so it is the null -- not the call -- doing the work here.
  assert.strictEqual(gateStatus({ ran: true, exitCode: null }), "skipped");
  assert.strictEqual(gateStatus({ ran: false, exitCode: 0 }), "skipped",
    "a gate that never ran is skipped even if a stale exit code says 0 -- the exit code of a command " +
    "that did not run is not evidence about the change");
}

// ---------------------------------------------------------------------------
// The verdict rule
// ---------------------------------------------------------------------------
function allGreenApproves() {
  const v = verdictFor(ALL_GREEN);
  assert.strictEqual(v.verdict, "approve");
  assert.ok(v.reasoning.trim().length > 0,
    "reasoning is required by ck_runner_verdicts_reasoning -- a verdict with no reason is rejected by " +
    "the database, so an empty one here is a runtime failure, not a cosmetic gap");
}

function anyRedBlocks() {
  for (const key of GATES.map(g => g.key)) {
    const gates = { ...ALL_GREEN, [key]: "red" };
    assert.strictEqual(verdictFor(gates).verdict, "block", `a red ${key} gate must block`);
    // NEGATIVE CONTROL: the same fixture with that one gate green approves, so it is the red value
    // deciding the verdict rather than the shape of the object.
    assert.strictEqual(verdictFor({ ...gates, [key]: "green" }).verdict, "approve");
  }
}

function anySkippedBlocks() {
  for (const key of GATES.map(g => g.key)) {
    const gates = { ...ALL_GREEN, [key]: "skipped" };
    const v = verdictFor(gates);
    assert.strictEqual(v.verdict, "block",
      `a SKIPPED ${key} gate must block. This is the fail-closed rule: an implementation that treats ` +
      `"not red" as green approves a change whose ${key} gate never ran.`);
    assert.ok(/COULD NOT RUN/.test(v.reasoning),
      "the reasoning must say the gate could not run, not merely that it was not green -- John reads " +
      "this line on the card and 'red' and 'never ran' are different facts about the change");
    // NEGATIVE CONTROL: same fixture, that gate green -> approve.
    assert.strictEqual(verdictFor({ ...gates, [key]: "green" }).verdict, "approve");
  }
}

function aMissingGateIsSkippedNotAbsent() {
  // An object that simply omits a gate must not read as "nothing to check here".
  assert.strictEqual(verdictFor({ build: "green", regression: "green" }).verdict, "block",
    "an omitted gate defaults to skipped, never to green -- a caller that forgets to run one must not " +
    "get an approve for the omission");
  assert.strictEqual(verdictFor({}).verdict, "block");
}

// The property ck_runner_verdicts_fail_closed enforces in the database, asserted here over the whole
// input space so the two homes cannot drift: approve <=> all three green. 3^3 = 27 combinations.
function approveIffAllGreenAcrossEveryCombination() {
  const values = ["green", "red", "skipped"];
  let approves = 0;
  for (const build of values) {
    for (const regression of values) {
      for (const hygiene of values) {
        const gates = { build, regression, hygiene };
        const isAllGreen = build === "green" && regression === "green" && hygiene === "green";
        const v = verdictFor(gates);
        assert.strictEqual(v.verdict, isAllGreen ? "approve" : "block",
          `verdictFor(${JSON.stringify(gates)}) disagrees with ck_runner_verdicts_fail_closed`);
        if (v.verdict === "approve") approves++;
      }
    }
  }
  assert.strictEqual(approves, 1,
    "exactly one of the 27 gate combinations may approve. More than one means a non-green value is " +
    "being read as green somewhere.");
}

// ---------------------------------------------------------------------------
// Auto-done scope -- charter decision 2, and nothing wider
// ---------------------------------------------------------------------------
// SES-340: the live shape this session ships under -- `Governance Agents M0 - Standard & Foundation`
// on the `Governance Agents` project, status `executing`. The epic name is deliberately NOT
// Selfbuild-shaped: under the retired implementation this fixture would have been INELIGIBLE, which
// is what makes every clause below a real measurement of the new fence rather than a rename.
const ELIGIBLE = Object.freeze({
  verdict: "approve",
  epicName: "Governance Agents M0 - Standard & Foundation",
  epicProjectExecuting: true,
  priorityClass: `${AUTO_DONE_CLASS_PREFIX} - Tooling`,
  changedFiles: ["docs/runbooks/session-hygiene.md", "scripts/heal-engine.js"],
});

function theInterimBarIsMet() {
  const e = autoDoneEligibility(ELIGIBLE);
  assert.strictEqual(e.eligible, true);
  assert.ok(e.reason.trim().length > 0);
}

function eligibilityNeverOutrunsTheVerdict() {
  for (const verdict of ["block"]) {
    const e = autoDoneEligibility({ ...ELIGIBLE, verdict });
    assert.strictEqual(e.eligible, false,
      "a blocked change can never be auto-done -- ck_runner_verdicts_eligible_implies_approve says the " +
      "same thing in the database");
    assert.ok(/approve/.test(e.reason));
  }
  // NEGATIVE CONTROL: the identical fixture with verdict approve IS eligible, so the verdict is the
  // one variable doing the work.
  assert.strictEqual(autoDoneEligibility(ELIGIBLE).eligible, true);
}

// SES-340 (replaces scopeIsTheSelfbuildFamilyOnly). The scope is a ROW, not a name.
function scopeIsAnExecutingProjectOnly() {
  // The paused `Automation` project is the nearest neighbour and the one most likely to be swept in.
  const other = autoDoneEligibility({
    ...ELIGIBLE, epicName: "Automation", epicProjectExecuting: false,
  });
  assert.strictEqual(other.eligible, false,
    "charter decision 2 supersedes SES-154's John-only-writer rule for an EXECUTING project's " +
    "deliveries and NOTHING else. A ticket whose project is paused still needs John's tap.");
  assert.ok(/executing project/.test(other.reason),
    "the reason must name the rule it failed -- 'projects.status' is what a reader has to go look at");

  // THE ASSERTION THAT CARRIES SES-340, and the reason this clause is not a rename: an epic named
  // `Selfbuild M3 - ...` whose project is PAUSED is refused. The retired implementation --
  // `epicName.startsWith("Selfbuild")` -- would have passed exactly this fixture, so the two
  // implementations disagree here and only the shipped one is correct today.
  const pausedButNamedSelfbuild = autoDoneEligibility({
    ...ELIGIBLE, epicName: "Selfbuild M3 - Independent Verification", epicProjectExecuting: false,
  });
  assert.strictEqual(pausedButNamedSelfbuild.eligible, false,
    "the Selfbuild project is `paused` live; a NAME cannot buy the bar back. If this ever passes, " +
    "the fence has gone back to being a string test.");

  // Unknown fails closed rather than passing on a blank -- no epic on the ticket, a failed lookup
  // and absent credentials all arrive here as null/undefined.
  for (const unknown of [null, undefined]) {
    assert.strictEqual(autoDoneEligibility({ ...ELIGIBLE, epicProjectExecuting: unknown }).eligible, false,
      "an unread project is not an executing one");
  }
  // ...and STRICT true, SES-243's lesson applied to this lookup: the truthy shapes a REST payload
  // can hand back must not reach the permissive branch.
  for (const notTrue of ["true", "executing", 1, {}, []]) {
    assert.strictEqual(autoDoneEligibility({ ...ELIGIBLE, epicProjectExecuting: notTrue }).eligible, false,
      `epicProjectExecuting=${JSON.stringify(notTrue)} is truthy but is not the boolean true`);
  }

  // NEGATIVE CONTROL, one variable: the identical fixture with the flag true IS eligible, so it is
  // the flag doing the work rather than some other property of the row.
  assert.strictEqual(autoDoneEligibility(ELIGIBLE).eligible, true);
  // The epic NAME must now be irrelevant on the eligible side -- any name qualifies once the
  // project executes. This is the inverse of the retired milestone-name loop.
  for (const name of ["Governance Agents M5 - Doors", "Automation", "Selfbuild M7 - The Inventor", "anything at all"]) {
    assert.strictEqual(autoDoneEligibility({ ...ELIGIBLE, epicName: name }).eligible, true,
      `'${name}' must qualify while its project executes -- the fence is projects.status, not the name`);
  }
}

// SES-340: AUTO_DONE_SCOPE replaced AUTO_DONE_EPIC_PREFIX, and the replacement changed KIND. The old
// constant was the predicate (`epicName.startsWith(it)`); this one is only wording. Pinned so a
// later editor does not quietly re-introduce a branch on it.
function theScopeConstantIsALabelNotAPredicate() {
  assert.strictEqual(typeof AUTO_DONE_SCOPE, "string");
  assert.ok(AUTO_DONE_SCOPE.length > 0);
  assert.ok(autoDoneEligibility(ELIGIBLE).reason.includes(AUTO_DONE_SCOPE),
    "the granting reason must carry the scope's name, because the ledger is where a reader finds " +
    "out WHICH rule granted the bar");
  // The label is not a test: a fixture whose epic name IS the label still loses when its project is
  // not executing, and one whose name is nothing like it still wins when the project executes.
  assert.strictEqual(
    autoDoneEligibility({ ...ELIGIBLE, epicName: AUTO_DONE_SCOPE, epicProjectExecuting: false }).eligible,
    false);
  assert.strictEqual(autoDoneEligibility({ ...ELIGIBLE, epicName: "zzz" }).eligible, true);
}

function scopeIsToolingOnly() {
  // P9 - Bug Fixes is the live neighbouring class (heal tickets file into it), and a lexical
  // "starts with P1" test would also match P1 - Improves John's Skills -- both are checked.
  for (const cls of ["P9 - Bug Fixes", "P1 - Improves John's Skills", "P5 - Enhancements", null, ""]) {
    assert.strictEqual(autoDoneEligibility({ ...ELIGIBLE, priorityClass: cls }).eligible, false,
      `auto-accept is approved for ${AUTO_DONE_CLASS_PREFIX} - Tooling deliveries only; '${cls}' is not one`);
  }
  // A live suffix form must still qualify -- priority_class carries suffixes on this board
  // (recompute_backlog_queue()'s own header: 'P9 - Bug Fixes . FLAGGED', 19 tickets).
  assert.strictEqual(
    autoDoneEligibility({ ...ELIGIBLE, priorityClass: `${AUTO_DONE_CLASS_PREFIX} - Tooling · FLAGGED` }).eligible,
    true);
}

// ---------------------------------------------------------------------------
// No change certifies itself -- charter premise 3
// ---------------------------------------------------------------------------
function aChangeToTheVerificationCannotTakeTheBar() {
  for (const p of SELF_CERTIFYING_PATHS) {
    const e = autoDoneEligibility({ ...ELIGIBLE, changedFiles: ["docs/SESSIONS.md", p] });
    assert.strictEqual(e.eligible, false,
      `a delivery that changes ${p} is graded by the code it changed; charter premise 3 forbids the bar`);
    assert.ok(e.reason.includes(p), "the reason must name the file, or the next reader looks in the wrong place");
  }
  // NEGATIVE CONTROL: the identical fixture with an ordinary file in place of the gate script IS
  // eligible, so it is the path -- not the presence of a diff -- doing the work.
  assert.strictEqual(
    autoDoneEligibility({ ...ELIGIBLE, changedFiles: ["docs/SESSIONS.md", "scripts/heal-engine.js"] }).eligible,
    true);
}

function anUnreadableDiffFailsClosed() {
  assert.strictEqual(selfCertificationBlock(null).blocked, true,
    "a verifier that cannot see what changed cannot know whether it is grading itself -- unknown is " +
    "not innocent, the same rule as a skipped gate");
  assert.strictEqual(selfCertificationBlock(undefined).blocked, true);
  assert.strictEqual(autoDoneEligibility({ ...ELIGIBLE, changedFiles: null }).eligible, false);

  // NEGATIVE CONTROL: an EMPTY list is a real answer ("nothing relevant changed") and must NOT be
  // confused with null. Coercing the two together would block every clean delivery forever -- the
  // SES-147 NULL-is-not-zero boundary in a second costume.
  assert.strictEqual(selfCertificationBlock([]).blocked, false);
  assert.strictEqual(autoDoneEligibility({ ...ELIGIBLE, changedFiles: [] }).eligible, true);
}

function pathMatchingIsExactAndSeparatorAgnostic() {
  // Windows-style separators are normalised; a path that merely CONTAINS a gate script's name is not
  // a match, or a future scripts/verifier.js.bak silently disarms every clean delivery.
  assert.strictEqual(selfCertificationBlock(["scripts\\verifier.js"]).blocked, true);
  assert.strictEqual(selfCertificationBlock(["./scripts/verifier.js"]).blocked, true);
  assert.strictEqual(selfCertificationBlock(["scripts/verifier.js.bak"]).blocked, false);
  assert.strictEqual(selfCertificationBlock(["docs/scripts/verifier.js"]).blocked, false);
}

// FEATURE: SES-337 -- the same premise over the rows, with the controls that make it discriminate.
//
// THE MUTANT IS THE ONE-LINE OMISSION, and it is what answers "would this pass if the guard did
// nothing?": the same fixture WITHOUT `skillRowEdit` is eligible: true. So every `false` below is
// the new guard firing, not the fixture failing some other test.
function theVerifiersOwnSkillRowsCannotTakeTheBar() {
  const img = (slug, pk = "11111111-1111-4111-8111-111111111111") =>
    ({ table_name: "skill_profiles", pk_value: pk, row_data: slug === null ? null : { slug } });
  const elig = beforeImages =>
    autoDoneEligibility({ ...ELIGIBLE, skillRowEdit: selfCertifyingSkillEdit({ beforeImages, changedFiles: ELIGIBLE.changedFiles }) });

  // THE MUTANT FIRST. Without the argument the identical delivery takes the bar -- which is the
  // measurement that makes the assertions below non-vacuous.
  assert.strictEqual(autoDoneEligibility(ELIGIBLE).eligible, true,
    "the fixture must be eligible with the check unapplied, or nothing below is measuring the check");

  // A `vf-*` row edit is refused, and the reason NAMES the slug.
  const rewrote = elig([img("vf-guardrails")]);
  assert.strictEqual(rewrote.eligible, false,
    "a cycle that rewrote the Verifier's own guardrails and then had the Verifier grade its own new " +
    "instructions is the purest form of what charter premise 3 forbids");
  assert.ok(rewrote.reason.includes("vf-guardrails"),
    "the reason must name the Skill row, or the next reader cannot tell which rule fired");
  for (const slug of ["vf-identity", "vf-behavior", "vf-knowledge-bar", "vf-verdict-intent", "vf-guardrails"]) {
    assert.strictEqual(elig([img(slug)]).eligible, false, `${slug} is one of the Verifier's own rows`);
  }

  // NEGATIVE CONTROL 1 -- IT IS THE PREFIX, NOT THE TABLE. Another agent's Skill rows are ordinary
  // work; a guard that blocked on any `skill_profiles` image would refuse the bar to every agent
  // build this project ships and would look identical from the ledger.
  for (const slug of ["pz-guardrails", "ds-behavior", "bd-identity", "rs-knowledge", "dm-intent"]) {
    assert.strictEqual(elig([img(slug)]).eligible, true, `${slug} is not the Verifier's own row`);
  }

  // NEGATIVE CONTROL 2 -- READ-AND-CLEAN IS NOT UNREAD. `[]` is a real answer; `null` is the absence
  // of one. Collapsing them either blocks every clean delivery forever or blesses every unreadable
  // one -- the same NULL-is-not-zero boundary anUnreadableDiffFailsClosed() keeps for the diff.
  assert.strictEqual(elig([]).eligible, true, "no Skill row changed is a clean answer, not a refusal");
  assert.strictEqual(selfCertifyingSkillEdit({ beforeImages: null, changedFiles: [] }).blocked, true,
    "images that could not be read are unknown, and unknown is not innocent");
  assert.strictEqual(selfCertifyingSkillEdit({ beforeImages: undefined, changedFiles: [] }).blocked, true);
  assert.strictEqual(elig(null).eligible, false);

  // NEGATIVE CONTROL 3 -- A ROW WHOSE SLUG NOBODY COULD RESOLVE BLOCKS. Step 8b writes
  // `row_data = NULL` for an INSERT, so the image alone cannot say which Skill it is; unresolved
  // must fail the same direction as `vf-`, and a resolver that CAN name it decides on the name.
  assert.strictEqual(elig([img(null, "u1")]).eligible, false,
    "a skill_profiles image whose slug is unknown could be the Verifier's own -- fails closed");
  assert.strictEqual(
    selfCertifyingSkillEdit({ beforeImages: [img(null, "u1")], changedFiles: [], slugById: { u1: "pz-guardrails" } }).blocked,
    false, "a resolved non-vf slug is clean, or the fallback would block every INSERT forever");
  assert.strictEqual(
    selfCertifyingSkillEdit({ beforeImages: [img(null, "u1")], changedFiles: [], slugById: { u1: "vf-behavior" } }).blocked,
    true);

  // THE SEED FILE IS THE REPO-SIDE HOME OF THOSE ROWS, and it is deliberately NOT in
  // SELF_CERTIFYING_PATHS: agt-67-verifier.test.mjs clause (5) binds every entry of that constant to
  // a name in `vf-guardrails.must`, which says "the Verifier's own Skill rows" rather than a path.
  for (const f of SELF_CERTIFYING_SKILL_FILES) {
    assert.strictEqual(selfCertifyingSkillEdit({ beforeImages: [], changedFiles: ["docs/SESSIONS.md", f] }).blocked, true,
      `${f} seeds the vf-* rows; changing it changes the judgment`);
    assert.strictEqual(SELF_CERTIFYING_PATHS.includes(f), false,
      `${f} must stay OUT of SELF_CERTIFYING_PATHS -- see agt-67-verifier.test.mjs clause (5)`);
  }
  assert.strictEqual(selfCertifyingSkillEdit({ beforeImages: [], changedFiles: ["docs/design/ga-agents-seed.sql.bak"] }).blocked, false,
    "path matching stays exact here too, or a future .bak silently disarms every clean delivery");

  // A RUNG BUYS NOTHING PAST THIS, same as the path check. `class_autonomy` granting auto_done is
  // the permissive input; the refusal must survive it.
  assert.strictEqual(
    autoDoneEligibility({
      ...ELIGIBLE,
      classAutonomy: { work_class: "tooling", rung: 20, auto_done: true, auto_done_rung: 3 },
      skillRowEdit: selfCertifyingSkillEdit({ beforeImages: [img("vf-behavior")], changedFiles: [] }),
    }).eligible,
    false, "a rung is a fact about a work class and never buys past charter premise 3");

  // The prefix is the constant, not a literal sprinkled through the reasons.
  assert.strictEqual(SELF_CERTIFYING_SKILL_PREFIX, "vf-");
}

// ---------------------------------------------------------------------------
// SES-122 (b): the bar is ladder-driven -- a rung, not a hardcoded class
// ---------------------------------------------------------------------------

// The live shape the M6 gate ruled on, read off public.class_autonomy('P10 - Tooling') this session:
// work class `tooling`, rung 13, auto_done TRUE against runner_settings.auto_done_rung 3. The
// TICKET carrying it is deliberately the awkward one -- a P9 class on a NON-Selfbuild epic -- so
// nothing here can pass through charter decision 2's old path by accident.
// SES-340: `epicProjectExecuting: false` is the live shape of the `Automation` epic today -- its
// project is `paused` -- and it is what makes the ladder branch the ONLY way this fixture can reach
// eligible. Under the retired code the same awkwardness was carried by a non-Selfbuild epic NAME.
const LADDER_PROMOTED = Object.freeze({
  verdict: "approve",
  epicName: "Automation",
  epicProjectExecuting: false,
  priorityClass: "P9 - Bug Fixes",
  changedFiles: ["docs/runbooks/runner-cycle.md", "scripts/heal-engine.js"],
  classAutonomy: Object.freeze({ auto_done: true, rung: 13, streak: 42, work_class: "tooling", auto_done_rung: 3 }),
});

function theLadderGrantsTheBarByRung() {
  const e = autoDoneEligibility(LADDER_PROMOTED);
  assert.strictEqual(e.eligible, true,
    "M6 gate, promise 2, decided on SES-122's row: 'a rung buys auto-done eligibility for its " +
    "class'. A rung is a fact about the work CLASS, so a promoted class takes the bar on any epic — " +
    "charter decision 2's Selfbuild/P10 rule is the FLOOR beneath the ladder, not a second gate " +
    "above it.");
  assert.ok(/rung 13/.test(e.reason) && /auto_done_rung 3/.test(e.reason),
    "the stored reason must name the rung AND the threshold it cleared — 'the ladder granted it' " +
    "with no numbers is a claim John cannot check against runner_ladder");
  assert.ok(/ladder/i.test(e.reason) && /SES-122/.test(e.reason),
    "the GRANTING AUTHORITY has to survive in the ledger: the ladder, charter decision 2 and §2f " +
    "are three different authorities and only one of them is a measurement");

  // THE NEGATIVE CONTROL, one variable: the same ticket with the ladder saying no. This is the
  // `bug_fix` class's real state (rung 1 < auto_done_rung 3), and it must fall through to charter
  // decision 2 and lose there on the epic.
  const denied = autoDoneEligibility({
    ...LADDER_PROMOTED,
    classAutonomy: { auto_done: false, rung: 1, streak: 1, work_class: "bug_fix", auto_done_rung: 3 },
  });
  assert.strictEqual(denied.eligible, false,
    "auto_done false is the ladder declining to grant the bar; the delivery stays `delivered` until " +
    "that class earns the rung");
  assert.ok(/executing project/.test(denied.reason),
    "and the reason must be CHARTER DECISION 2's floor talking, not the ladder's — the ticket's " +
    "project is paused, which is why it failed");
  assert.ok(/rung 1/.test(denied.reason),
    "a refusal should still say what the ladder said, or 'the ladder declined' and 'nobody asked " +
    "the ladder' are indistinguishable in the ledger");

  // And the ladder does not rescue a BLOCK. The verdict outranks every widening in this function.
  assert.strictEqual(autoDoneEligibility({ ...LADDER_PROMOTED, verdict: "block" }).eligible, false);
}

function aRungNeverBuysPastSelfCertification() {
  // THE assertion of SES-122 (b). The grant SKIPS the scope tests; it must not skip charter premise
  // 3. If the ladder branch were written as an early `return { eligible: true }`, it would jump over
  // selfCertificationBlock() and hand the bar to a change that edits the verification itself — and
  // THIS ship is that change, on a class sitting at rung 13.
  for (const p of SELF_CERTIFYING_PATHS) {
    const e = autoDoneEligibility({ ...LADDER_PROMOTED, changedFiles: ["docs/SESSIONS.md", p] });
    assert.strictEqual(e.eligible, false,
      `rung 13 does not buy past charter premise 3 — a delivery touching ${p} is graded by the code ` +
      `it changed, whatever autonomy its class has earned`);
    assert.ok(e.reason.includes(p), "the reason must name the file");
    assert.ok(/certif/i.test(e.reason),
      "and it must be the SELF-CERTIFICATION reason, not a ladder or scope message — a rung that " +
      "produced 'the ladder granted this' here would be the defect this clause exists to catch");
  }
  // An unreadable diff fails the same direction, ladder or no ladder.
  assert.strictEqual(autoDoneEligibility({ ...LADDER_PROMOTED, changedFiles: null }).eligible, false);
  // NEGATIVE CONTROL: the identical fixture with ordinary files IS eligible, so it is the PATH doing
  // the work and not the ladder branch being broken outright.
  assert.strictEqual(autoDoneEligibility(LADDER_PROMOTED).eligible, true);
}

function theLadderIsReadStrictlyAndNullIsNotInnocent() {
  // SES-243's lesson applied to the second lookup: `classAutonomy.auto_done` is compared with
  // === true. A REST layer that hands back the STRING "false" is truthy, and the difference between
  // truthy and true here is the difference between John tapping Accept and a cycle writing `done`.
  for (const notGranted of ["false", "0", "no", "true", 1, {}, [], null, undefined]) {
    const e = autoDoneEligibility({ ...LADDER_PROMOTED, classAutonomy: { auto_done: notGranted, rung: 13, work_class: "tooling", auto_done_rung: 3 } });
    assert.strictEqual(e.eligible, false,
      `auto_done=${JSON.stringify(notGranted)} is not the boolean true; the ladder grant must not ` +
      `be reachable through a mis-parsed value`);
  }

  // A MISSING classAutonomy must leave today's behaviour byte-identical — every other assertion in
  // this file and in SES-243's omits the key, and that is what keeps them meaningful.
  const withoutLadder = autoDoneEligibility({ ...ELIGIBLE });
  for (const absent of [undefined, null]) {
    const e = autoDoneEligibility({ ...ELIGIBLE, classAutonomy: absent });
    assert.strictEqual(e.eligible, withoutLadder.eligible,
      "an unread ladder changes no decision the old code made — unknown is not innocent, and it is " +
      "not guilty either: it simply is not evidence");
  }
  // An untracked class answers with NULL rung (not 0 — `invention` really sits at rung 0), and that
  // must read as "no rung to spend" rather than as the bottom rung.
  const untracked = autoDoneEligibility({
    ...LADDER_PROMOTED,
    classAutonomy: { auto_done: false, rung: null, streak: null, work_class: null, auto_done_rung: 3 },
  });
  assert.strictEqual(untracked.eligible, false);
  assert.ok(/not rung 0/.test(untracked.reason),
    "the NULL-is-not-zero boundary is the one SES-147 cost; the reason says so rather than printing " +
    "a bare 0 the next reader would take for a real rung");
}

// ---------------------------------------------------------------------------
// SES-122 (b): the spawn quoting -- four months of false blocks, in one expression
// ---------------------------------------------------------------------------
function spawnCommandIsQuotedOnlyForTheShell() {
  // John's machine, verbatim. With shell:true, spawnSync hands `cmd /d /s /c "<cmd> <args>"` to the
  // shell, which splits on whitespace: unquoted, this launched `C:\Program` and both node-spawned
  // gates exited 1 with `'C:\Program' is not recognized`. Verdict 253aca14 (SES-301) is the
  // measurement — build green, regression and hygiene red on that string.
  const winNode = "C:\\Program Files\\nodejs\\node.exe";
  assert.strictEqual(spawnCommandFor(winNode, true), `"${winNode}"`,
    "a command containing whitespace MUST be quoted when the shell will parse it, or every " +
    "attended verifier run on Windows is a `block` about the environment rather than the change");

  // The other direction is the same defect pointed backwards: with shell:false the command IS
  // argv[0], so a quote becomes part of the filename and the gate goes SKIPPED instead of red.
  assert.strictEqual(spawnCommandFor(winNode, false), winNode,
    "with no shell the command is argv[0] — quoting it would name a file that does not exist");

  // A command with no whitespace is untouched either way, so this cannot regress the Linux cloud
  // runner (`npm`, and a node path with no spaces).
  for (const shell of [true, false]) {
    assert.strictEqual(spawnCommandFor("npm", shell), "npm");
    assert.strictEqual(spawnCommandFor("/usr/bin/node", shell), "/usr/bin/node");
  }

  // Idempotent: an already-quoted command is not double-wrapped, or `""C:\…""` reaches cmd.
  assert.strictEqual(spawnCommandFor(`"${winNode}"`, true), `"${winNode}"`);

  // NEGATIVE CONTROL: the retired expression was `gate.cmd` itself. Pinned so the assertion above
  // cannot be vacuous — if the unquoted form ever equalled the quoted one, there was no defect.
  assert.notStrictEqual(winNode, `"${winNode}"`);

  // And the real gating set must survive the transform: every GATES entry still resolves to a
  // command, quoted or not, on both platforms.
  for (const g of GATES) {
    for (const shell of [true, false]) {
      const c = spawnCommandFor(g.cmd, shell);
      assert.ok(typeof c === "string" && c.length > 0, `${g.key}'s command must survive quoting`);
    }
  }
}

// ---------------------------------------------------------------------------
// AGT-67: the judgment half. The agent contributes reasons and contributes no permission.
// ---------------------------------------------------------------------------

// A well-formed verdict from a model that likes the change. Everything about it is valid; the only
// question every clause below asks is whether the CODE still holds its own line.
const AGENT_APPROVES = Object.freeze({
  backlog_id: "AGT-67",
  version: "v7.0.433",
  verdict: "approve",
  reasoning: "The kickoff's four tasks are all present; scripts/verifier.js:400 keeps autoDoneEligibility() unchanged.",
  pm_lens: "Delivered what the kickoff promised; no slippage.",
  architect_lens: "Fits the SES-331 one-assembly rule; nothing re-derived at the call site.",
  auto_done_eligible: true,
  auto_done_reason: "All three gates green and the class holds the rung.",
  missing_evidence: [],
});

// The mechanical half of a delivery whose regression gate went RED, and the same delivery's code
// eligibility. Two facts the model cannot see past.
const RED_MECHANICAL = Object.freeze(verdictFor({ ...ALL_GREEN, regression: "red" }));
const GREEN_MECHANICAL = Object.freeze(verdictFor(ALL_GREEN));

// THE MUTANTS -- and an honest statement of what they do and do not prove, because the first
// draft's comment overclaimed and the Verifier caught it (verdict 5f414763, finding 4: "the
// negative controls are tautologies").
//
// These are NOT reconcileJudgment() with a line commented out. They are the whole of what that
// function would COMPUTE for these two fields if its guard were absent: with the mechanical
// short-circuit gone, the verdict IS the agent's verdict; with codeEligibility gone as the ceiling,
// eligibility IS the agent's boolean. Asserting a mutant returns its own input proves nothing on its
// own -- so it is not asserted on its own. What is asserted is that the SHIPPED function and the
// guard-less computation DISAGREE on the same fixture, which is the only statement that
// distinguishes "the guard is doing work" from "the fixture happened to agree with both".
function withoutTheVerdictGuard({ agent }) {
  // DELETED: `if (mechanical.verdict === "block") -> block` -- the agent's word becomes the answer.
  return { verdict: agent.verdict };
}
function withoutTheEligibilityGuard({ agent }) {
  // DELETED: `codeEligibility.eligible === true &&` -- the agent's opinion becomes the bar.
  return { eligible: agent.auto_done_eligible === true };
}

// INVARIANT (a), kickoff Task 2: agent says approve, a gate is red -> block.
function theAgentCannotTurnARedGateIntoAnApprove() {
  const codeEligibility = autoDoneEligibility({ ...ELIGIBLE, verdict: "block" });
  const r = reconcileJudgment({ mechanical: RED_MECHANICAL, agent: AGENT_APPROVES, codeEligibility });
  assert.strictEqual(r.verdict, "block",
    "a red mechanical gate can never become approve, however the agent graded it -- charter " +
    "decision 2's bar is not a matter of opinion, and ck_runner_verdicts_fail_closed says the same " +
    "thing in the database");
  assert.strictEqual(r.eligible, false, "and a block can never be auto-done");
  assert.ok(r.overrides.some(o => /approve/.test(o) && /gate/.test(o)),
    "the ledger must record that the code OVERRODE the agent -- 'the agent agreed' and 'the agent " +
    "was overruled' are different facts about an identical row, and the reason column is where " +
    `either one survives. got: ${JSON.stringify(r.overrides)}`);

  // THE DISCRIMINATION, stated as a disagreement rather than as a tautology: the shipped function
  // and the guard-less computation return DIFFERENT answers for this one fixture, and only the
  // shipped one is correct. If they ever agreed here, the assertion above would be measuring the
  // fixture and not the guard.
  assert.notStrictEqual(r.verdict, withoutTheVerdictGuard({ agent: AGENT_APPROVES }).verdict,
    "reconcileJudgment() must DISAGREE with a guard-less implementation on a red-gate/agent-approve " +
    "fixture -- that disagreement is the whole of what invariant (a) buys");

  // Judgment TIGHTENS, in the other direction: green gates and an agent that blocks IS a block.
  // Without this the lane would be decorative -- the agent could only ever agree.
  const tightened = reconcileJudgment({
    mechanical: GREEN_MECHANICAL,
    agent: { ...AGENT_APPROVES, verdict: "block", auto_done_eligible: false },
    codeEligibility: autoDoneEligibility(ELIGIBLE),
  });
  assert.strictEqual(tightened.verdict, "block",
    "the whole point of the judgment lane is that it can block a delivery all three mechanical " +
    "gates passed; an implementation that only ever echoes the gates has added nothing");
  assert.strictEqual(tightened.eligible, false);

  // And an unreadable verdict value fails closed to block rather than to the mechanical answer.
  for (const bad of ["APPROVE", "approved", "", null, undefined, true]) {
    const e = reconcileJudgment({ mechanical: GREEN_MECHANICAL, agent: { ...AGENT_APPROVES, verdict: bad }, codeEligibility: autoDoneEligibility(ELIGIBLE) });
    assert.strictEqual(e.verdict, "block", `verdict ${JSON.stringify(bad)} is not the literal "approve"`);
  }
  // NEGATIVE CONTROL for that loop: the literal approve on green gates DOES approve, so it is the
  // value doing the work rather than the branch being broken outright.
  assert.strictEqual(
    reconcileJudgment({ mechanical: GREEN_MECHANICAL, agent: AGENT_APPROVES, codeEligibility: autoDoneEligibility(ELIGIBLE) }).verdict,
    "approve");
}

// INVARIANT (b), kickoff Task 2: agent says auto-done eligible, the diff touches
// scripts/verifier.js -> not eligible. THIS SHIP'S OWN DIFF is the live instance.
function theAgentCannotBuyPastSelfCertification() {
  for (const p of SELF_CERTIFYING_PATHS) {
    const codeEligibility = autoDoneEligibility({ ...ELIGIBLE, changedFiles: ["docs/SESSIONS.md", p] });
    assert.strictEqual(codeEligibility.eligible, false, "precondition: the code refuses the bar");
    const r = reconcileJudgment({ mechanical: GREEN_MECHANICAL, agent: AGENT_APPROVES, codeEligibility });
    assert.strictEqual(r.eligible, false,
      `a delivery touching ${p} is graded by the code it changed; charter premise 3 outranks the ` +
      "agent exactly as it outranks the ladder");
    assert.strictEqual(r.verdict, "approve",
      "and the VERDICT still stands -- premise 3 refuses the auto-done bar, it does not invent a " +
      "block. Collapsing the two would make every edit to the verification look like a bad change.");
    assert.ok(r.reason.includes(p), "the reason must name the file, or the next reader looks in the wrong place");
    assert.ok(r.overrides.some(o => /auto-done/.test(o)),
      "the override has to be recorded: the agent said eligible and the code said no");

    // THE DISCRIMINATION: the shipped function and the guard-less computation DISAGREE on this
    // fixture -- the code refuses the bar, the guard-less version hands it to the agent.
    assert.notStrictEqual(r.eligible, withoutTheEligibilityGuard({ agent: AGENT_APPROVES }).eligible,
      `reconcileJudgment() must DISAGREE with a guard-less implementation on a diff touching ${p} -- ` +
      "that disagreement is the whole of what invariant (b) buys");
  }

  // The conjunction runs the other way too: the code may allow the bar and the agent still withhold
  // it. An eligibility that ignored the agent would be a second rubber stamp.
  const withheld = reconcileJudgment({
    mechanical: GREEN_MECHANICAL,
    agent: { ...AGENT_APPROVES, auto_done_eligible: false, auto_done_reason: "the QA would pass if the change did nothing" },
    codeEligibility: autoDoneEligibility(ELIGIBLE),
  });
  assert.strictEqual(withheld.eligible, false);
  assert.ok(/did nothing/.test(withheld.reason), "and the agent's reason has to reach the ledger");

  // STRICT === true on the agent's side, SES-243's lesson applied to a model's JSON.
  for (const notTrue of ["true", 1, {}, [], "yes", null, undefined]) {
    const e = reconcileJudgment({
      mechanical: GREEN_MECHANICAL,
      agent: { ...AGENT_APPROVES, auto_done_eligible: notTrue },
      codeEligibility: autoDoneEligibility(ELIGIBLE),
    });
    assert.strictEqual(e.eligible, false, `auto_done_eligible=${JSON.stringify(notTrue)} is not the boolean true`);
  }
  // NEGATIVE CONTROL, one variable: both sides true IS eligible.
  assert.strictEqual(
    reconcileJudgment({ mechanical: GREEN_MECHANICAL, agent: AGENT_APPROVES, codeEligibility: autoDoneEligibility(ELIGIBLE) }).eligible,
    true);
}

// The degrade path: no agent, today's behaviour, unchanged. This is what `--judge=none` -- the
// default every existing caller passes -- reaches, and it is the clause that would catch a
// "judgment half" that quietly changed the mechanical lane on its way in.
function theDegradePathIsTodaysBehaviourExactly() {
  const codeEligibility = autoDoneEligibility(ELIGIBLE);
  for (const noAgent of [null, undefined]) {
    const r = reconcileJudgment({ mechanical: GREEN_MECHANICAL, agent: noAgent, codeEligibility });
    assert.strictEqual(r.verdict, GREEN_MECHANICAL.verdict);
    assert.strictEqual(r.eligible, codeEligibility.eligible);
    assert.strictEqual(r.reason, codeEligibility.reason);
    assert.deepStrictEqual(r.overrides, [], "nothing was overridden -- nobody spoke");
  }
  // ...and a red-gated delivery with no agent is still a block with no eligibility.
  const red = reconcileJudgment({
    mechanical: RED_MECHANICAL, agent: null,
    codeEligibility: autoDoneEligibility({ ...ELIGIBLE, verdict: "block" }),
  });
  assert.strictEqual(red.verdict, "block");
  assert.strictEqual(red.eligible, false);
}

function judgeModeIsValidatedNotDefaulted() {
  assert.deepStrictEqual(JUDGE_MODES, ["none", "session", "executor"]);
  assert.strictEqual(EXIT_AWAITING_JUDGMENT, 3,
    "3 is a third kind of non-answer: not 1 (nothing was judged) and not 2 (the verifier ran its " +
    "half fine). A caller that collapses it into either has lost the distinction.");
  for (const absent of [undefined, null, ""]) assert.strictEqual(parseJudgeMode(absent).mode, "none");
  for (const m of JUDGE_MODES) assert.strictEqual(parseJudgeMode(m).mode, m);
  // THE CLAUSE THAT MATTERS: a typo must be an ERROR, never a silent downgrade to the
  // mechanical-only lane. Running unjudged when judgment was asked for is a skipped gate wearing a
  // flag's costume -- invisible in the ledger, because the row looks exactly like a --judge=none row.
  for (const typo of ["sesion", "Session", "agent", "yes", "executor "]) {
    const r = parseJudgeMode(typo);
    assert.ok(r.error, `--judge=${typo} must be refused, not defaulted`);
    assert.strictEqual(r.mode, undefined);
  }

  // The context path is derived from the ticket, so two invocations find one file and two
  // concurrent cycles never share one.
  assert.ok(judgeContextPathFor("/tmp", "AGT-67").endsWith("verify-AGT-67.json"));
  assert.notStrictEqual(judgeContextPathFor("/tmp", "AGT-67"), judgeContextPathFor("/tmp", "AGT-68"));
  assert.strictEqual(judgeContextPathFor("/tmp", ""), null,
    "a ticket-less run gets no shared default path -- two cycles would both write it");
  // A ticket id can reach this from the board; a path separator in one must not escape the scratch
  // directory. `..` and `/` are stripped rather than trusted.
  assert.ok(!judgeContextPathFor("/tmp", "../../etc/passwd").includes(".."),
    "path separators and dot segments are stripped from the ticket before it becomes a filename");
}

// The Intent's stored schema IS the contract; validateAgentVerdict() reads whatever the row carries
// rather than restating it, so the two cannot drift. Driven here with the schema's real shape.
function theIntentSchemaIsTheContract() {
  const schema = {
    type: "object",
    required: ["backlog_id", "version", "verdict", "reasoning", "pm_lens", "architect_lens", "auto_done_eligible", "auto_done_reason", "missing_evidence"],
    properties: {
      backlog_id: { type: "string" }, version: { type: "string" },
      verdict: { type: "string", enum: ["approve", "block"] },
      reasoning: { type: "string" },
      pm_lens: { type: "string", maxLength: 1200 },
      architect_lens: { type: "string", maxLength: 1200 },
      auto_done_eligible: { type: "boolean" },
      auto_done_reason: { type: "string", maxLength: 400 },
      missing_evidence: { type: "array", items: { type: "string" } },
    },
  };
  assert.strictEqual(validateAgentVerdict(schema, AGENT_APPROVES).ok, true,
    "the fixture every other AGT-67 clause is driven with must satisfy the real contract, or those " +
    "clauses are testing a shape the platform would reject");

  // The mutants a model really emits, each rejected BY NAME so the exit-2 message tells a reader
  // what to fix.
  const cases = [
    [{ ...AGENT_APPROVES, verdict: "approved" }, /verdict/, "an enum near-miss"],
    [{ ...AGENT_APPROVES, auto_done_eligible: "true" }, /auto_done_eligible/, "the JSON string true -- SES-243's lesson"],
    [{ ...AGENT_APPROVES, missing_evidence: "none" }, /missing_evidence/, "a string where the array goes"],
    [{ ...AGENT_APPROVES, missing_evidence: [1] }, /missing_evidence/, "a non-string item"],
    [{ ...AGENT_APPROVES, auto_done_reason: "x".repeat(401) }, /auto_done_reason/, "over maxLength"],
    [(() => { const v = { ...AGENT_APPROVES }; delete v.architect_lens; return v; })(), /architect_lens/, "a dropped lens"],
  ];
  for (const [value, pattern, why] of cases) {
    const r = validateAgentVerdict(schema, value);
    assert.strictEqual(r.ok, false, `${why} must be rejected`);
    assert.ok(r.errors.some(e => pattern.test(e)), `the error must name the offending key (${why}): ${JSON.stringify(r.errors)}`);
  }

  // Non-objects, and the schema itself missing. Unknown is not innocent: with no schema there is
  // nothing to validate against, so nothing may be accepted.
  for (const notAnObject of [null, "approve", 3, [], undefined]) {
    assert.strictEqual(validateAgentVerdict(schema, notAnObject).ok, false);
  }
  for (const noSchema of [null, undefined, "", 0]) {
    assert.strictEqual(validateAgentVerdict(noSchema, AGENT_APPROVES).ok, false,
      "a verdict cannot be validated against a schema that could not be read, and an unvalidated " +
      "verdict must not be recorded");
  }
}

// The guard the Verifier's own first run put here (verdict 5f414763, finding 1): a verdict file that
// satisfies the schema perfectly can still be about a DIFFERENT delivery. The schema requires
// backlog_id and version; this is what makes requiring them mean something.
function aVerdictMustBeAboutThisDelivery() {
  assert.deepStrictEqual(verdictIdentityMismatch(AGENT_APPROVES, { ticket: "AGT-67", version: "v7.0.433" }), [],
    "the matching case must report nothing, or every run would refuse itself");

  // A stale file from an earlier version of the SAME ticket is the likeliest real instance: the
  // context path is derived from the ticket, so a re-run finds last time's verdict sitting there.
  const stale = verdictIdentityMismatch(AGENT_APPROVES, { ticket: "AGT-67", version: "v7.0.434" });
  assert.ok(stale.length && /version/.test(stale[0]), `a stale version must be caught: ${JSON.stringify(stale)}`);
  const foreign = verdictIdentityMismatch(AGENT_APPROVES, { ticket: "AGT-68", version: "v7.0.433" });
  assert.ok(foreign.length && /backlog_id/.test(foreign[0]), `a foreign ticket must be caught: ${JSON.stringify(foreign)}`);
  // Both wrong reports both, rather than stopping at the first.
  assert.strictEqual(verdictIdentityMismatch(AGENT_APPROVES, { ticket: "AGT-68", version: "v7.0.434" }).length, 2);

  // An UNSTATED caller-side value is unmatchable, not agreement. Unknown is not innocent here
  // either -- a `--ticket`-less run that accepted any verdict would be the hole wearing a blank.
  for (const missing of [{ ticket: "", version: "v7.0.433" }, { ticket: "AGT-67", version: "" }, {}]) {
    assert.ok(verdictIdentityMismatch(AGENT_APPROVES, missing).length,
      `a run with ${JSON.stringify(missing)} cannot match the agent's own identity fields and must say so`);
  }
  // The agent OMITTING a field is the schema's job, not this function's -- it must not double-report.
  assert.deepStrictEqual(verdictIdentityMismatch({}, { ticket: "AGT-67", version: "v7.0.433" }), []);
}

function run() {
  // The table's own constraints — ck_runner_verdicts_fail_closed and
  // ck_runner_verdicts_eligible_implies_approve — ship as migration ses181_runner_verdicts and live
  // in the database, not this repo. Reaching them from here means INSERTing rows into the live
  // verdict ledger, which would poison the very catch-rate telemetry this ticket exists to start.
  // approveIffAllGreenAcrossEveryCombination() below asserts the JS half of that rule over its whole
  // input space; the SQL half's evidence is the live QA on the ship card.
  notRun(
    "the runner_verdicts CHECK constraints",
    "they live in the database; asserting them from here would write fixture rows into the live " +
    "verdict ledger and corrupt the rolling-30 baseline recorded from verdict one"
  );

  gatingSetIsTheCharterBar();
  gateStatusHasThreeValues();
  allGreenApproves();
  anyRedBlocks();
  anySkippedBlocks();
  aMissingGateIsSkippedNotAbsent();
  approveIffAllGreenAcrossEveryCombination();
  theInterimBarIsMet();
  eligibilityNeverOutrunsTheVerdict();
  scopeIsAnExecutingProjectOnly();
  theScopeConstantIsALabelNotAPredicate();
  scopeIsToolingOnly();
  aChangeToTheVerificationCannotTakeTheBar();
  anUnreadableDiffFailsClosed();
  pathMatchingIsExactAndSeparatorAgnostic();
  theVerifiersOwnSkillRowsCannotTakeTheBar();   // FEATURE: SES-337
  theLadderGrantsTheBarByRung();
  aRungNeverBuysPastSelfCertification();
  theLadderIsReadStrictlyAndNullIsNotInnocent();
  spawnCommandIsQuotedOnlyForTheShell();
  // FEATURE: AGT-67 -- the judgment half.
  theAgentCannotTurnARedGateIntoAnApprove();
  theAgentCannotBuyPastSelfCertification();
  theDegradePathIsTodaysBehaviourExactly();
  judgeModeIsValidatedNotDefaulted();
  theIntentSchemaIsTheContract();
  aVerdictMustBeAboutThisDelivery();
}

selfRun(import.meta.url, run);
export default run;
