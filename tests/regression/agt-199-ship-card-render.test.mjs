// DeepBench v7.0.635 | tests/regression/agt-199-ship-card-render.test.mjs | AGT-199 — THE STATE RENDER
// SAYS WHETHER THE SHIP CARD IT PRINTED EXISTS, AND SAYING SO NEVER BECOMES A REFUSAL.
//
// THE DEFECT THIS GUARDS, measured on the tree AGT-199 shipped from rather than reasoned about: step 7a
// renders CLAUDE-STATE.md (`docs/runbooks/runner-cycle.md:3024-3029`), step 9 files the ship card
// (`:4007-4010`), and nothing re-renders after. `renderBullet` prints the card's `plain_after` and
// `plain_worth`, so a render that runs before the card exists commits the bare ticket line for good. Live,
// 2 of the 5 close-outs the night this shipped: `git show ed368c9d:CLAUDE-STATE.md` line 12 is the bare
// `` **`AGT-194`**. `` committed 06:17:12Z while that cycle's ship card `ab5bcbb4` was created 06:17:49Z;
// `f8fc2c91` line 12 is the same for `AGT-195`.
//
// WHY THIS IS NOT AGT-174 AGAIN, and the CONTROL below is what makes the distinction load-bearing rather
// than asserted in a comment: `renderingCycleFinding` reads only the ledger pin, and on a card-less render
// the pin is CORRECT — the cycle is its own newest pushed row — so it returns null on exactly the renders
// this ticket is about. Arm 1 therefore runs `renderingCycleFinding` over BOTH halves of the fixture and
// requires null from both. Without that, a reader could not tell this function from a restatement of the
// one above it, and a future refactor folding the two together would go green.
//
// TWO ARMS, and what each proves is stated rather than implied:
//
//   1. THE FINDING, over a fixture rendered by `renderBody` itself — the function that writes the real
//      file — from one real cycle row and its real ship card, WITHOUT and WITH the card. `before !== after`
//      is asserted first, because every claim below is vacuous on a fixture where the card changes
//      nothing. Then all of `shipCardFinding`'s outcomes, including the two that must return null, with
//      the three kinds discriminated by name (the LOO-013 lesson: assert WHICH branch fired) and both
//      `card_exists` polarities of the stale kind. No network, no tree write.
//   2. NON-GATING, on scripts/verifier.js's own source, WITH ITS OWN POSITIVE CONTROL: the same two
//      patterns MUST match inside the `kickoffNoLanes` block, which really does turn approve into block,
//      and must NOT match after `let stateRenderCard = null;`. Asserted SEPARATELY rather than as one
//      alternation, for the reason agt-174-state-render-self.test.mjs measured on its own first run — an
//      alternation hides a typo in either half behind the other. Plus the wiring itself: a SEPARATE import
//      line (the existing one is pinned by that test), the prose line, the `--json` key, and the same
//      evidence key in BOTH judgeCtx literals (SES-337 — one judge grading on a fact the other never sees
//      is a lane-shaped difference in the ledger).
//
// WHAT THIS DOES NOT ASSERT, and must not: nothing about whether CLAUDE-STATE.md on disk is card-less
// right now. That is a fact about the live world at one instant, not about this change (pattern:162 — a
// check grades the change, never the live world), and SES-177 / SES-261 already own the committed file.
// This suite must stay runnable with no credentials and with no ledger read at all.
//
// Invocation: node tests/regression/agt-199-ship-card-render.test.mjs
// (STANDARDS.md Section 2 rule 5 for the credentialed form; this test needs no credentials.)

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import {
  shipCardFinding,
  renderingCycleFinding,
  renderBody,
} from "../../scripts/render-claude-state.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERIFIER_REL = "scripts/verifier.js";

// A REAL ROW AND A REAL CARD from this ticket's own measurement, so the fixture is a real shape rather
// than a convenient one: the `AGT-194` cycle whose committed bullet was card-less, and the card that was
// filed 37 seconds after that commit.
const ROW = Object.freeze({
  id: "1a5b0124-6189-46df-9e61-372471712704",
  started_at: "2026-09-27T05:19:41.119906+00:00",
  trigger: "chained (drain continuation)",
  model: "claude-opus-5",
  version: "v7.0.631",
  item_id: "AGT-194",
  push_sha: "e760c795204a5b3ffef748b77bb86521d7266cab",
});

const CARD = Object.freeze({
  cycle_id: ROW.id,
  title: "Every pushed commit now keeps its own CI verdict instead of losing it to the next push",
  plain_after: "A close-out now reads the CI conclusion for the sha it actually pushed.",
  plain_worth: "The ledger John judges from stops attributing one cycle's green to another's commit.",
});

// THE FIXTURE IS RENDERED BY `renderBody`, not hand-written. A hand-written bullet would be this test's
// idea of the renderer's output, and the whole predicate under test is "is the committed line byte-exact
// what the renderer emits" — so a fixture that drifted from `renderBullet` would make every assertion
// below a statement about the fixture instead of about the file the platform commits.
const before = renderBody([ROW], new Map());
const after = renderBody([ROW], new Map([[ROW.id, CARD]]));

// --- arm 1: the finding ------------------------------------------------------------------------

function theCardActuallyChangesTheRenderedBullet() {
  // FIRST, because it is the premise of everything below: if the card made no difference to the render,
  // "the bullet matches the no-card render" and "the bullet matches the card render" would be the same
  // sentence and every claim in this arm would pass on a function that always returned null.
  assert.notStrictEqual(before, after,
    "the fixture card must change the rendered bullet — otherwise this arm is vacuous");
  assert.ok(after.includes(CARD.plain_after),
    "the WITH-card render must carry the card's plain_after; that sentence is what the defect loses");
  assert.ok(!before.includes(CARD.plain_after),
    "the NO-card render must NOT carry it — that is the bare ticket line the defect commits");
}

function noCycleIsNotMeasuredRatherThanClean() {
  // A caller with no cycle row cannot know, and inventing "clean" here is the vacuous pass this ticket is
  // about. The distinction is carried in the CALLER's words (the verifier's prose note), so what this
  // function owes is null — not a finding claiming the file is fine.
  assert.strictEqual(shipCardFinding(before, null, null), null);
  assert.strictEqual(shipCardFinding(before, null, CARD), null);
  assert.strictEqual(shipCardFinding(before, {}, CARD), null, "a row with no id cannot be located");
  assert.strictEqual(shipCardFinding(before, { id: "" }, CARD), null);
}

function aBulletRenderedBeforeTheCardExistedIsCardMissing() {
  const f = shipCardFinding(before, ROW, null);
  assert.ok(f, "a bullet rendered with no card, and no card read, IS the AGT-199 ordering — it must report");
  assert.strictEqual(f.kind, "state-render-card-missing",
    "the bullet is byte-exact the no-card render and no card was read: that is card-missing, not stale");
  assert.strictEqual(f.card_exists, false);
  assert.strictEqual(f.cycle_id, ROW.id);
  assert.strictEqual(f.bullet, f.expected,
    "card-missing is precisely the case where the committed line IS what the renderer emits");
}

function theSameBulletWithTheCardInHandIsStaleAndSaysTheCardExists() {
  const f = shipCardFinding(before, ROW, CARD);
  assert.ok(f, "a committed line that disagrees with the card now in hand must report");
  assert.strictEqual(f.kind, "state-render-card-stale");
  assert.strictEqual(f.card_exists, true,
    "the card exists here — a reader sent to file a card that is already filed is sent to the wrong fix");
  assert.notStrictEqual(f.bullet, f.expected);
  assert.ok(f.expected.includes(CARD.plain_after),
    "`expected` must be the render from the card, so the reason's reader can see what the file should say");
  // THE DISCRIMINATION, as its own assertion: the same committed bullet reads as two different facts
  // depending on whether a card was read, and the two must not read alike.
  const missing = shipCardFinding(before, ROW, null);
  assert.notStrictEqual(f.kind, missing.kind);
  assert.notStrictEqual(f.reason, missing.reason);
}

function aBulletThatIsAByteExactRenderOfAnExistingCardIsTheCleanCase() {
  assert.strictEqual(shipCardFinding(after, ROW, CARD), null,
    "a committed bullet that IS the render of the card that exists is nothing to report");
}

function aCardLessRenderOfALineThatHadOneIsStaleAndSaysTheCardIsGone() {
  const f = shipCardFinding(after, ROW, null);
  assert.ok(f, "a bullet carrying card prose with no card in hand must report");
  assert.strictEqual(f.kind, "state-render-card-stale");
  assert.strictEqual(f.card_exists, false,
    "card_exists must be the polarity of the CARD, not of the finding — both stale directions occur");
}

function aFileWithNoBulletForThisCycleIsItsOwnKind() {
  const other = { ...ROW, id: "ffffffff-0000-4000-8000-00000000000f" };
  const f = shipCardFinding(before, other, CARD);
  assert.ok(f, "a file with no bullet for this cycle cannot be shown to publish its card — it must report");
  assert.strictEqual(f.kind, "state-render-no-bullet",
    "no bullet at all is a different fact from a bullet that disagrees; collapsing them sends its " +
    "reader to re-render a file the cycle is not even in");
  assert.strictEqual(f.bullet, null);
  assert.strictEqual(f.cycle_id, other.id);
  for (const text of ["", "no bullets here at all\n"]) {
    assert.strictEqual(shipCardFinding(text, ROW, CARD).kind, "state-render-no-bullet");
  }
}

function everyReasonCarriesTheRemedyAndNamesWhereItIsRun() {
  // pattern:155 — a report that says something is wrong and not what to do next is not a report. The
  // remedy names the script and the tail step, so a reader who has never seen this ticket can act on the
  // line alone, and it says never hand-edit the generated file.
  const findings = [
    shipCardFinding(before, ROW, null),
    shipCardFinding(before, ROW, CARD),
    shipCardFinding(after, ROW, null),
    shipCardFinding(before, { ...ROW, id: "ffffffff-0000-4000-8000-00000000000f" }, CARD),
  ];
  for (const f of findings) {
    assert.match(f.reason, /render-claude-state\.js/,
      `every reason must name the script that re-renders the file: ${f.kind}`);
    assert.match(f.reason, /tail \(4\)/,
      `every reason must name WHERE the re-render is committed — the serial tail's (4): ${f.kind}`);
    assert.match(f.reason, /hand-edit/, `every reason must forbid hand-editing the generated file: ${f.kind}`);
  }
}

function theLedgerPinFindingIsBlindToThisOnBothHalves() {
  // THE CONTROL that makes this whole function worth having rather than a second reading of AGT-174. The
  // fixture's pin names this cycle first in BOTH halves, so the pin-based finding is null on the card-less
  // render and on the card-bearing one alike — it cannot see the difference this ticket is about.
  assert.strictEqual(renderingCycleFinding(before, ROW.id), null,
    "control: the pin finding must be null on the card-LESS render — it reads the pin, not the card");
  assert.strictEqual(renderingCycleFinding(after, ROW.id), null,
    "control: and null on the card-bearing one. If either reported, this fixture would be proving the " +
    "AGT-174 lag instead of the AGT-199 ordering, and every claim above would be about the wrong defect");
  // And the new function is NOT null on the first of those two — the difference, stated.
  assert.ok(shipCardFinding(before, ROW, CARD),
    "shipCardFinding must report exactly where renderingCycleFinding is silent");
}

// --- arm 2: non-gating, with its own positive control -------------------------------------------

// The two blocks are read the same way from the same source, so the comparison is between them rather
// than against a hand-copied expectation.
const blockAfter = (src, decl, lines = 15) => {
  const i = src.indexOf(decl);
  assert.notStrictEqual(i, -1, `${VERIFIER_REL} must still declare \`${decl}\``);
  return src.slice(i).split("\n").slice(0, lines).join("\n");
};

// TWO PATTERNS, ASSERTED SEPARATELY, NOT ONE ALTERNATION — and the difference is not cosmetic. With
// `/verdict\s*=|reasoning\s*=/` as a single regex, mistyping ONE half still matches the positive control
// through the other, so the control cannot catch it (measured on agt-174-state-render-self.test.mjs's
// first run, where `verdcit` passed). Each half therefore carries its own control.
const GATING = [
  { name: "verdict assignment", re: /verdict\s*=/ },
  { name: "reasoning assignment", re: /reasoning\s*=/ },
];

function theFindingNeverTouchesTheVerdict() {
  const src = fs.readFileSync(path.join(REPO, VERIFIER_REL), "utf8").replace(/\r\n/g, "\n");
  const gating = blockAfter(src, "let kickoffNoLanes = null;");
  const reporting = blockAfter(src, "let stateRenderCard = null;");

  for (const { name, re } of GATING) {
    // POSITIVE CONTROL FIRST. `kickoffNoLanes` is a block that really does turn approve into block, so
    // this pattern MUST match there. If it does not, the pattern is wrong and the claim below would be
    // vacuous — this assertion is what makes the negative one mean something.
    assert.match(gating, re,
      `positive control failed for the ${name} pattern: the kickoffNoLanes block DOES assign the ` +
      "mechanical lane's verdict and reasoning, so this pattern must match it. A pattern that misses it " +
      "would pass the claim below on any source at all.");

    // THE CLAIM. AGT-199 is reported, never enforced: at step 7a the card is not yet filed, so a block
    // here would refuse every honest close-out on an ordering the cycle cannot fix from inside its own
    // render — and the renderer keeps exactly ONE deliberate exit 2 (the standing-brief link, gated card
    // 37b22393).
    assert.doesNotMatch(reporting, re,
      `the AGT-199 block must NOT assign the mechanical lane's ${name} — the check reports and the ` +
      "render is still written. See the block's own header in " + VERIFIER_REL);
  }

  // A SEPARATE IMPORT LINE, not an added name on the existing one: agt-174-state-render-self.test.mjs
  // pins `import { renderingCycleFinding } from "./render-claude-state.js";` verbatim.
  assert.match(src, /import \{ renderingCycleFinding \} from "\.\/render-claude-state\.js";/,
    `${VERIFIER_REL} must keep AGT-174's import line exactly as that ticket's guard pins it`);
  assert.match(src, /import \{ shipCardFinding \} from "\.\/render-claude-state\.js";/,
    `${VERIFIER_REL} must import the renderer's pure helper rather than restate the predicate`);
  assert.match(src, /stateRenderCard = shipCardFinding\(/,
    `${VERIFIER_REL} must actually call shipCardFinding()`);
  assert.match(src, /CLAUDE-STATE CARD: \$\{stateRenderCard/,
    `${VERIFIER_REL}'s prose must print the finding on every run, gating or not`);
  assert.match(src, /not measured \(no --cycle-id\)/,
    `${VERIFIER_REL} must say "not measured" when nothing could be read — never report it as clean`);
  assert.match(src, /not measured \(no credentials\)/,
    `${VERIFIER_REL} must keep the credential-less case apart from the clean one, in words`);
}

// --- arm 2b: both judge lanes -------------------------------------------------------------------

function bothJudgeLanesSeeTheSameEvidence() {
  const src = fs.readFileSync(path.join(REPO, VERIFIER_REL), "utf8").replace(/\r\n/g, "\n");
  const literals = src.split(/const judgeCtx = \{/).slice(1);
  assert.strictEqual(literals.length, 2,
    `${VERIFIER_REL} must still have exactly two judgeCtx literals (session and executor). ` +
    `got: ${literals.length}`);
  for (const [i, block] of literals.entries()) {
    assert.match(block.slice(0, 4000), /state_render_card:/,
      `judgeCtx literal ${i + 1} must carry state_render_card: — the same evidence key in BOTH lanes, or ` +
      "one judge grades with a fact the other never sees (SES-337's lesson)");
  }
  assert.match(src, /state_render_card: stateRenderCard,/,
    "the --json payload must report the finding (reported, never its own runner_verdicts column — " +
    "AGT-170's convention, no migration)");
}

async function run(/* ctx */) {
  const results = [];

  theCardActuallyChangesTheRenderedBullet();
  results.push("fixture-card-changes-the-rendered-bullet");

  noCycleIsNotMeasuredRatherThanClean();
  aBulletRenderedBeforeTheCardExistedIsCardMissing();
  theSameBulletWithTheCardInHandIsStaleAndSaysTheCardExists();
  aBulletThatIsAByteExactRenderOfAnExistingCardIsTheCleanCase();
  aCardLessRenderOfALineThatHadOneIsStaleAndSaysTheCardIsGone();
  aFileWithNoBulletForThisCycleIsItsOwnKind();
  everyReasonCarriesTheRemedyAndNamesWhereItIsRun();
  results.push("finding-all-branches-missing-vs-stale-vs-no-bullet-discriminated");

  theLedgerPinFindingIsBlindToThisOnBothHalves();
  results.push("control-renderingCycleFinding-null-on-both-halves");

  theFindingNeverTouchesTheVerdict();
  results.push("non-gating-with-kickoffNoLanes-positive-control");

  bothJudgeLanesSeeTheSameEvidence();
  results.push("both-judge-lanes-and-json-carry-state_render_card");

  return results;
}

selfRun(import.meta.url, run);
export default run;
