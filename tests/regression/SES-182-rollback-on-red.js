// DeepBench v7.0.332 | tests/regression/SES-182-rollback-on-red.js | SES-182 slice 1
//
// Guards the four halves of SES-182 slice 1: THE TRIGGER SET (a verifier block never auto-reverts
// -- John's Q1), THE GREEN TEST (`skipped` is not `green`, and the empty run is not green), THE
// CODE-ONLY TEST (an unknown or moved migration watermark fails closed to card-only), and THE
// AUTHORITY BOUNDARY (an unattributable or attended push produces no action, and the engine never
// pushes).
//
// EVERY CLAUSE CARRIES ITS OWN NEGATIVE CONTROL -- "would this still pass if the change did
// nothing?" must answer NO. Four of the controls are RETIRED DESIGNS applied to the SAME fixture
// and asserted to LOSE, so the guard proves a DIFFERENCE from what was rejected rather than a
// property both share:
//
//   * skippedIsNotGreen() runs the tempting "no job actually failed" form beside the shipped
//     every-job-succeeded form on one fixture: the retired form calls a skipped run GREEN, which
//     would anchor the pointer to a commit CI never graded.
//   * anUnknownWatermarkFailsClosed() runs the tempting "(a ?? '') === (b ?? '')" form beside the
//     shipped one: the retired form calls two UNKNOWN watermarks equal, i.e. declares a range
//     code-only having measured nothing -- the one direction that auto-reverts a schema change.
//   * theVerifierIsNotATrigger() runs the SAME facts under trigger 'ci-red' and 'verifier': the
//     first reverts, the second does nothing. Q1 is a difference, not a property both share.
//   * aMovedWatermarkIsNeverReverted() runs the same fixture with the watermark moved and
//     unchanged: card-only vs revert.
//
// THE POLICY IS READ OUT OF THE SHIPPED MODULE, never restated here (the SES-45 rule: a test that
// recreates the logic under test passes against the bug it guards). The card's kind is additionally
// asserted against build-briefing.mjs's REAL filter, so "it renders on a surface John reads" is a
// measurement rather than a claim.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { selfRun } from "./_lib/self-run.js";

import {
  TRIGGER_SOURCES,
  GREEN_CONCLUSION,
  GREEN_STATE_RETENTION,
  ACTIONS,
  isRunGreen,
  rangeIsCodeOnly,
  attributionOf,
  decide,
  revertPlanFor,
  buildIncidentCard,
} from "../../scripts/rollback-on-red.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENGINE_SRC = fs.readFileSync(path.join(REPO, "scripts", "rollback-on-red.js"), "utf8");

const GREEN_JOBS = [
  { name: "Build (blocking)", conclusion: "success" },
  { name: "Tripwire + regression (blocking)", conclusion: "success" },
];
const RED_JOBS = [
  { name: "Build (blocking)", conclusion: "success" },
  { name: "Tripwire + regression (blocking)", conclusion: "failure" },
];

const HEAD = "abc1234def5678";
const CYCLES = [{ id: "cyc-1", push_sha: HEAD, version: "v7.0.331" }];
const ANCHOR = { commit_sha: "0000green0000", migration_watermark: "20260830000001" };

// The fixture that SHOULD revert: red, attributable, anchored, watermark unchanged.
function revertableFacts(over = {}) {
  return {
    trigger: "ci-red",
    jobs: RED_JOBS,
    headSha: HEAD,
    greenAnchor: ANCHOR,
    currentWatermark: ANCHOR.migration_watermark,
    cycles: CYCLES,
    ...over,
  };
}

// -- 1. The trigger set: a verifier block never auto-reverts (John, 2026-08-30, Q1) ----------

function theVerifierIsNotATrigger() {
  assert.ok(!TRIGGER_SOURCES.includes("verifier"),
    "TRIGGER_SOURCES must not admit 'verifier' -- John's Q1: a block freezes and cards, never reverts");
  assert.ok(TRIGGER_SOURCES.includes("ci-red") && TRIGGER_SOURCES.includes("deploy-red"),
    "TRIGGER_SOURCES must admit both facts John named as triggers");

  // NEGATIVE CONTROL: identical facts, only the trigger differs. The shipped engine reverts one
  // and refuses the other -- so this asserts a DIFFERENCE, not a property both share.
  const asCi = decide(revertableFacts({ trigger: "ci-red" }));
  const asVerifier = decide(revertableFacts({ trigger: "verifier" }));
  assert.strictEqual(asCi.action, ACTIONS.REVERT_AND_CARD,
    "the control arm must revert, or this clause proves nothing");
  assert.strictEqual(asVerifier.action, ACTIONS.NONE,
    "a verifier block must never reach a rollback action");
  assert.match(asVerifier.reason, /verifier block freezes/i,
    "the refusal must name John's Q1 reason rather than failing silently");
}

// -- 2. The green test: `skipped` is not `green`, and an empty run is not green --------------

function skippedIsNotGreen() {
  const skipped = [
    { name: "Build (blocking)", conclusion: "success" },
    { name: "Tripwire + regression (blocking)", conclusion: "skipped" },
  ];
  assert.strictEqual(isRunGreen(GREEN_JOBS), true, "an all-success run is green");
  assert.strictEqual(isRunGreen(skipped), false, "a skipped blocking job is NOT green");

  // NEGATIVE CONTROL -- the retired "nothing actually failed" form, on the SAME fixture.
  const retiredNoFailureForm = (jobs) => jobs.every((j) => j.conclusion !== "failure");
  assert.strictEqual(retiredNoFailureForm(skipped), true,
    "the retired form must call the skipped run green -- otherwise this control proves nothing");
  assert.notStrictEqual(isRunGreen(skipped), retiredNoFailureForm(skipped),
    "the shipped green test must DIFFER from the retired no-failure test on a skipped run");
}

function theEmptyRunIsNotGreen() {
  assert.strictEqual(isRunGreen([]), false,
    "a run reporting no jobs is cancelled or queued, never green -- anchoring on it points at an ungraded commit");
  assert.strictEqual(isRunGreen(null), false, "a missing job list is not green");
  assert.strictEqual(GREEN_CONCLUSION, "success", "green is the literal GitHub conclusion, not a synonym");
}

// -- 3. The code-only test: unknown and moved both fail closed ------------------------------

function anUnknownWatermarkFailsClosed() {
  assert.strictEqual(rangeIsCodeOnly(null, "20260830000001"), false, "an unknown green watermark is not code-only");
  assert.strictEqual(rangeIsCodeOnly("20260830000001", null), false, "an unknown current watermark is not code-only");
  assert.strictEqual(rangeIsCodeOnly(null, null), false, "two unknowns are not code-only");
  assert.strictEqual(rangeIsCodeOnly("", ""), false, "two empty strings are not code-only");

  // NEGATIVE CONTROL -- the tempting nullish-coalescing equality, on the SAME fixture. It calls two
  // unknowns EQUAL, i.e. declares a range code-only having measured nothing at all.
  const retiredLooseForm = (a, b) => (a ?? "") === (b ?? "");
  assert.strictEqual(retiredLooseForm(null, null), true,
    "the retired loose form must call two unknowns equal -- otherwise this control proves nothing");
  assert.notStrictEqual(rangeIsCodeOnly(null, null), retiredLooseForm(null, null),
    "the shipped code-only test must DIFFER from the loose form when the watermark is unknown");

  // And it must reach the DECISION, not just the predicate.
  const d = decide(revertableFacts({ currentWatermark: null }));
  assert.strictEqual(d.action, ACTIONS.CARD_ONLY,
    "an unknown watermark must card, never revert");
  assert.match(d.reason, /not code-only/i, "the card must name why no revert was planned");
}

function aMovedWatermarkIsNeverReverted() {
  const moved = decide(revertableFacts({ currentWatermark: "20260830999999" }));
  const unchanged = decide(revertableFacts());
  assert.strictEqual(unchanged.action, ACTIONS.REVERT_AND_CARD,
    "the control arm (watermark unchanged) must revert, or this clause proves nothing");
  assert.strictEqual(moved.action, ACTIONS.CARD_ONLY,
    "a migration landed in the range -- no automatic schema action, card only");
  assert.match(moved.reason, /NO automatic schema action/,
    "the reason must state plainly that no schema action was taken");
}

function aRedWithNoGreenAnchorCardsRatherThanGuessing() {
  const d = decide(revertableFacts({ greenAnchor: null }));
  assert.strictEqual(d.action, ACTIONS.CARD_ONLY, "with no anchor there is nothing to roll back to");
  assert.match(d.reason, /nothing to roll back to/i, "the reason must say so rather than implying a failure");
}

// -- 4. The authority boundary --------------------------------------------------------------

function anUnattributableRedProducesNoAction() {
  // The kickoff's own named negative control: "a green run and an unattributable red both produce
  // NO action."
  const unattributable = decide(revertableFacts({ cycles: [] }));
  assert.strictEqual(unattributable.action, ACTIONS.NONE,
    "a sha no runner cycle claims is an attended or unknown push -- never this machine's to undo");
  assert.match(unattributable.reason, /not claimed by any runner cycle/i,
    "the reason must name the attribution miss");

  const green = decide(revertableFacts({ jobs: GREEN_JOBS }));
  assert.strictEqual(green.action, ACTIONS.RECORD_GREEN, "a green run records the pointer");
  assert.notStrictEqual(green.action, ACTIONS.REVERT_AND_CARD, "a green run must never revert");
}

function attributionIsPositiveOnly() {
  assert.strictEqual(attributionOf(HEAD, []), null, "an empty cycle list attributes nothing");
  assert.strictEqual(attributionOf(null, CYCLES), null, "a missing sha attributes nothing");
  assert.strictEqual(attributionOf("deadbeef", CYCLES), null, "an unrelated sha attributes nothing");
  assert.ok(attributionOf(HEAD, CYCLES), "an exact sha match attributes");
  // Abbreviated shas are the live shape -- runner_cycles.push_sha is written short by some cycles.
  assert.ok(attributionOf(HEAD, [{ id: "c", push_sha: HEAD.slice(0, 7) }]),
    "an abbreviated stored sha must still attribute");
  // A cycle row with a NULL push_sha must never match anything.
  assert.strictEqual(attributionOf(HEAD, [{ id: "c", push_sha: null }]), null,
    "a cycle that never pushed must not attribute a sha to itself");
}

function theEngineNeverPushesAndNeverRunsGit() {
  assert.ok(!/child_process|execSync|spawnSync|simple-git/.test(ENGINE_SRC),
    "the engine must not shell out -- the push gates (claim re-assertion, version proof, rebase ladder) live in the cycle");
  assert.ok(!/\bgit\s+push\b/.test(ENGINE_SRC.replace(/^\s*\/\/.*$/gm, "")),
    "the engine must never push; it emits a revert plan the cycle executes behind its own gates");
}

function theRevertIsForwardNeverHistoryRewrite() {
  const plan = revertPlanFor("0000green0000", HEAD);
  assert.strictEqual(plan.strategy, "revert-forward", "the strategy is revert-forward");
  assert.match(plan.command, /git revert/, "the plan reverts");
  assert.ok(!/--force|force-with-lease|reset --hard|rebase|push/.test(plan.command),
    "the plan must never rewrite history or push -- a force-push invalidates every existing checkout");
}

// -- 5. The card renders on a surface John actually reads -----------------------------------

function theIncidentCardRendersOnJohnsPage() {
  const d = decide(revertableFacts());
  const card = buildIncidentCard(d, { cycleId: "cyc-me", headSha: HEAD, beforeImages: [], trigger: "ci-red" });

  // Read the REAL renderer rather than restating its policy (SES-45).
  const briefing = fs.readFileSync(path.join(REPO, "scripts", "build-briefing.mjs"), "utf8");
  const gatesLine = briefing.split("\n").find((l) => /rendered\.filter\(/.test(l) && /gated_before_build/.test(l));
  assert.ok(gatesLine, "build-briefing.mjs must still filter a card section on a kind literal");
  assert.ok(gatesLine.includes(card.kind),
    `the incident card's kind (${card.kind}) must be one the briefing renderer actually renders -- ` +
    "a card on no surface is the one outcome an incident card must never have");
}

function theCardsBacklogIdStaysBare() {
  const d = decide(revertableFacts());
  const card = buildIncidentCard(d, { cycleId: "cyc-me", headSha: HEAD, beforeImages: [], trigger: "ci-red" });
  // SES-116: backlog_id is a JOIN KEY. Composing a human reference into it broke 63 of 80 joins.
  assert.strictEqual(card.backlog_id, null, "an incident is not a board ticket -- backlog_id stays NULL");
  assert.ok(/SES-182/.test(card.display_ref), "the human reference belongs in display_ref");
  assert.ok(!/ — |\(P\d/.test(String(card.backlog_id ?? "")), "backlog_id must never carry a composed reference");
}

function theDataRestoreIsReportedNotReplayed() {
  const d = decide(revertableFacts());
  const withImages = buildIncidentCard(d, {
    cycleId: "cyc-me",
    headSha: HEAD,
    beforeImages: [{ table_name: "backlog_items", pk_value: "1" }, { table_name: "runner_items", pk_value: "2" }],
    trigger: "ci-red",
  });
  assert.match(withImages.qa_evidence, /2 before-image\(s\)/,
    "the card must COUNT the before-images in the range");
  // SLICE 4 (v7.0.335) SUPERSEDED THE WORDING, NOT THE PROPERTY. Slice 1 wrote the literal
  // "REPORTED, not replayed"; the card now renders summarizeRestorePlan(), which states the same
  // thing on every branch ("NOTHING IS REPLAYED" with a plan, "nothing is replayed either way"
  // without one). The clause is therefore pinned to the PROPERTY -- the card must always say the
  // data was not put back -- because pinning the retired literal made this clause fail on a change
  // that strengthened exactly what it protects. SES-182d-restore-plan.js asserts it branch by branch.
  assert.match(withImages.qa_evidence, /not replayed|nothing is replayed/i,
    "the card must always state that the data was NOT put back, not leave it to be discovered");

  const noImages = buildIncidentCard(d, { cycleId: "c", headSha: HEAD, beforeImages: [], trigger: "ci-red" });
  assert.match(noImages.qa_evidence, /No before-images/,
    "an empty range must say so rather than printing a bare zero");
}

function theCardAlwaysCarriesTheReasonAndReverse() {
  for (const facts of [revertableFacts(), revertableFacts({ currentWatermark: "moved" })]) {
    const d = decide(facts);
    const card = buildIncidentCard(d, { cycleId: "c", headSha: HEAD, beforeImages: [], trigger: "ci-red" });
    assert.strictEqual(card.value_case, d.reason, "the card's value case IS the decision's reason -- one home");
    assert.match(card.plain_worth, /Reverse/, "every incident card must offer Reverse in John's own words");
    assert.ok(card.title.length > 0 && card.plain_cant.length > 0, "the card must be renderable");
  }
  // The held card must not describe a revert that did not happen.
  const held = buildIncidentCard(decide(revertableFacts({ currentWatermark: "moved" })),
    { cycleId: "c", headSha: HEAD, beforeImages: [], trigger: "ci-red" });
  assert.match(held.before_after, /Nothing was reverted/,
    "a card-only outcome must say plainly that nothing was reverted");
}

// -- 6. Ledger discipline --------------------------------------------------------------------

function theBeforeImageComesFirst() {
  // §19v: no before-image logged -> the write does not happen. Assert ORDER in the real source.
  for (const writer of ["recordGreenState", "fileIncidentCard"]) {
    const body = ENGINE_SRC.slice(ENGINE_SRC.indexOf(`export async function ${writer}`));
    const imgAt = body.indexOf("insertBeforeImage");
    const writeAt = body.indexOf("method: \"POST\"", imgAt + 1);
    assert.ok(imgAt >= 0, `${writer} must write a before-image`);
    assert.ok(writeAt > imgAt, `${writer} must write its before-image BEFORE its own insert`);
  }
}

function retentionIsNamedNotMagic() {
  assert.strictEqual(GREEN_STATE_RETENTION, 50,
    "the kickoff's retention decision is 50 rows, and it is a named constant rather than a literal in a query");
}

function run() {
  theVerifierIsNotATrigger();
  skippedIsNotGreen();
  theEmptyRunIsNotGreen();
  anUnknownWatermarkFailsClosed();
  aMovedWatermarkIsNeverReverted();
  aRedWithNoGreenAnchorCardsRatherThanGuessing();
  anUnattributableRedProducesNoAction();
  attributionIsPositiveOnly();
  theEngineNeverPushesAndNeverRunsGit();
  theRevertIsForwardNeverHistoryRewrite();
  theIncidentCardRendersOnJohnsPage();
  theCardsBacklogIdStaysBare();
  theDataRestoreIsReportedNotReplayed();
  theCardAlwaysCarriesTheReasonAndReverse();
  theBeforeImageComesFirst();
  retentionIsNamedNotMagic();
}

selfRun(import.meta.url, run);
export default run;
