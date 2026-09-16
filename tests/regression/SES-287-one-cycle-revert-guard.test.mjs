// DeepBench v7.0.507 | tests/regression/SES-287-one-cycle-revert-guard.test.mjs | SES-287 slice 1
//
// FEATURE: SES-287 -- the auto-rollback engine may plan a revert of ONE cycle's commits and no
// others, and its card may never claim that revert as an act already performed.
//
// THE INCIDENT THIS GUARDS IS REAL AND IT IS THE FIXTURE (docs/SESSIONS.md:1296, cycle a906b726,
// 2026-08-31). `rollback-on-red.js --apply` read dev's head `95cf5fee` red and returned
// `revert-and-card` with a plan to revert `de6e08e8..95cf5fee` -- SIX COMMITS FROM FOUR DIFFERENT
// CYCLES -- attributing the whole range to `b0d37c31`, the last pusher. Register B37 forbids that
// outright: a successor never adjudicates a predecessor. The revert was declined by hand and the
// incident card had to be REWRITTEN, because it asserted in the past tense that a revert the engine
// cannot perform had already happened. Both halves are closed here and both are graded below with
// the incident's own shas.
//
// THE DISCRIMINATOR IS A DIFFERENCE AGAINST THE SHIPPED PREDECESSOR, NOT A PROPERTY. The file-level
// control at the bottom does not assert that a string is absent from the old source -- it fetches
// `scripts/rollback-on-red.js` AT THE PINNED COMMIT f85505d3, imports it, and runs the SAME incident
// fixture through it. The retired engine must return `revert-and-card` and must title its card "was
// reverted to the last green state"; the shipped one must card and must not. A guard that only
// asserted today's behaviour would pass equally on a tree where nothing shipped.
//
// PINNED TO AN IMMUTABLE SHA, NEVER A BRANCH TIP -- SES-242's defect (v7.0.324), repeated by SES-255
// (v7.0.340): a control keyed to `origin/dev` is correct only in the window before its own ship,
// which is the one window nobody re-runs it in, and it then turns a BLOCKING CI job red. f85505d3 is
// dev's head immediately before v7.0.507 and means the same thing forever.
//
// AND IT IS DECLARED not-run RATHER THAN PASSED WHEN THE OBJECT IS ABSENT -- SES-256's own found
// defect, in this exact position. actions/checkout@v4 gives a shallow checkout at its default depth,
// so `git show f85505d3:...` is genuinely unavailable in CI and unreachable on a full local clone,
// which is how a broken declaration ships green and fails on the first push. notRun() takes TWO
// arguments and raises on a missing reason; both calls below pass both.
//
// THE POLICY IS READ OUT OF THE SHIPPED MODULE, never restated here (SES-45: a test that recreates
// the logic under test passes against the bug it guards). ACTIONS and rangeCycleSpan() are imported.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied:
//   * Nothing here makes the cycle PASS --range-shas. Slice 1 ships the input and the gate; the
//     runbook step-4a edit that fills it from `git rev-list <anchor>..<head>` is slice 2's, held
//     back because docs/runbooks/runner-cycle.md sits at the SES-336 byte ceiling. Until then every
//     live invocation omits the list and therefore CARDS -- the fail-closed direction, and identical
//     to what the engine did on dev before this ship, which is why the omitted-list clause below is
//     graded as a requirement rather than a regression.
//   * The AFFIRMATIVE half of defect 3 -- a card recording a revert the cycle DID execute -- does
//     not exist yet, so no branch of buildIncidentCard() may speak in the past tense and the clause
//     below holds every REVERT_AND_CARD card to that.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

import { selfRun, notRun } from "./_lib/self-run.js";

import {
  ACTIONS,
  decide,
  buildIncidentCard,
  rangeCycleSpan,
} from "../../scripts/rollback-on-red.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// dev's head immediately before v7.0.507. Immutable by construction.
const PINNED_PRE_SHIP = "f85505d3";

// -- The live incident, with its own shas (docs/SESSIONS.md:1296) -----------------------------
//
// Four cycles pushed into the range; the engine attributed all of it to the LAST pusher. The two
// shas that are nobody's push tip are the ordinary intermediate commits a six-commit range carries,
// and they are what `unclaimed` exists to see.
const ANCHOR_SHA = "de6e08e8";
const HEAD_SHA = "95cf5fee";

const CYC_LAST = "cyc-95cf5fee";     // the attributed cycle: the one that pushed the red head
const PREDECESSOR_ROWS = [
  { id: "cyc-ab2948c6", push_sha: "ab2948c6", version: "v7.0.343" },   // SES-183
  { id: "cyc-6be8379a", push_sha: "6be8379a", version: "v7.0.344" },   // DAT-21
  { id: "cyc-b0d37c31", push_sha: "b0d37c31", version: "v7.0.345" },   // SES-258
];

// The cycle list decide() is given when the HEAD is the attributed push, and nothing else in the
// range is known to it -- which is precisely how the engine saw the incident.
const CYCLES = [{ id: CYC_LAST, push_sha: HEAD_SHA, version: "v7.0.346" }];

// All six commits, four of them a cycle's push tip, two claimed by nobody.
const SIX_SHAS = ["ab2948c6", "aaaa1111", "6be8379a", "b0d37c31", "bbbb2222", HEAD_SHA];

const RED_JOBS = [
  { name: "Build (blocking)", conclusion: "success" },
  { name: "Tripwire + regression (blocking)", conclusion: "failure" },
];
const ANCHOR = { commit_sha: ANCHOR_SHA, migration_watermark: "20260831000001" };

// Red, attributable, anchored, watermark UNCHANGED -- the one shape that may revert. Everything
// below varies ONLY the range, so every result difference is the range gate and nothing else.
function facts(over = {}) {
  return {
    trigger: "ci-red",
    jobs: RED_JOBS,
    headSha: HEAD_SHA,
    greenAnchor: ANCHOR,
    currentWatermark: ANCHOR.migration_watermark,
    cycles: CYCLES,
    rangeShas: [HEAD_SHA],
    ...over,
  };
}

// The four-cycle range as the engine would have been handed it: the head's own cycle row plus the
// three predecessors', so every push tip in the range resolves to a real, DIFFERENT cycle. Without
// the predecessors in `cycles` the range would card for being UNCLAIMED, which is a different
// reason, and the discriminator would prove the wrong clause.
function fourCycleFacts(over = {}) {
  return facts({ cycles: [...CYCLES, ...PREDECESSOR_ROWS], rangeShas: SIX_SHAS, ...over });
}

const CTX = { cycleId: "cyc-me", headSha: HEAD_SHA, beforeImages: [], trigger: "ci-red" };

// -- 1. THE DISCRIMINATOR: the live incident's own shape cards ---------------------------------

function theFourCycleRangeCards() {
  const d = decide(fourCycleFacts());

  assert.strictEqual(d.action, ACTIONS.CARD_ONLY,
    "the live incident's range -- six commits from four cycles -- must never reach a revert plan");
  assert.strictEqual(d.revertPlan, undefined,
    "a carded range must carry NO revert plan at all; a plan on the object is a plan a caller can run");
  assert.match(d.reason, /B37|predecessor/,
    "the refusal must name WHY -- a successor never adjudicates a predecessor (register B37) -- " +
    "rather than reporting a bare count and leaving the rule on the reader");

  // The measurement the gate leaned on, asserted on the decision rather than inferred from prose.
  assert.strictEqual(d.rangeSpan.known, true, "the range WAS supplied, so it is known");
  assert.strictEqual(d.rangeSpan.cycleIds.length, 4,
    "four distinct cycles pushed into this range, exactly as the incident recorded");
  assert.deepStrictEqual(d.rangeSpan.unclaimed, ["aaaa1111", "bbbb2222"],
    "the two commits no cycle claims must be COLLECTED, not silently dropped into the nearest cycle");

  // NEGATIVE CONTROL -- the SAME facts with the range narrowed to the attributed cycle's own single
  // commit. Revert vs card is a DIFFERENCE; without this arm the clause above would also pass on an
  // engine that simply refused everything.
  const narrowed = decide(fourCycleFacts({ rangeShas: [HEAD_SHA] }));
  assert.strictEqual(narrowed.action, ACTIONS.REVERT_AND_CARD,
    "narrowing the SAME facts to one cycle's commit must flip the outcome, or the guard proves nothing");
  assert.notStrictEqual(d.action, narrowed.action,
    "the engine must DIFFER on those two fixtures -- one range measurement is the only variable");
}

// -- 2. The control arm: a one-cycle range still reverts ---------------------------------------

function theOneCycleRangeStillReverts() {
  const d = decide(facts());
  assert.strictEqual(d.action, ACTIONS.REVERT_AND_CARD,
    "one commit, one cycle, that cycle being the attributed one, watermark unchanged -- this is the " +
    "one automatic path and the guard must not have closed it");
  assert.ok(d.revertPlan?.command, "and the plan the cycle executes must still be emitted");
  assert.deepStrictEqual(d.rangeSpan.cycleIds, [CYC_LAST],
    "the single cycle named must be the ATTRIBUTED one, never merely 'some single cycle'");

  // A one-cycle range belonging to a DIFFERENT cycle than the attributed one is still a successor
  // adjudicating a predecessor. Counting to one is not the rule; the rule is whose commits they are.
  const someoneElse = decide(facts({
    cycles: [...CYCLES, { id: "cyc-other", push_sha: "0f0f0f0f" }],
    rangeShas: ["0f0f0f0f"],
  }));
  assert.strictEqual(someoneElse.action, ACTIONS.CARD_ONLY,
    "a single-cycle range that is NOT the attributed cycle's must card -- otherwise the gate counts " +
    "cycles instead of checking whose work is about to be undone");
}

// -- 3. An omitted list is not an empty range ---------------------------------------------------

function anOmittedRangeIsNotAnEmptyRange() {
  // `undefined` is the one that matters most: it is what a caller that never passed --range-shas at
  // all hands decide(), and it must reach decide()'s own default rather than a fixture's.
  for (const absent of [undefined, null, [], "de6e08e8..95cf5fee"]) {
    const d = decide(facts({ rangeShas: absent }));
    assert.strictEqual(d.action, ACTIONS.CARD_ONLY,
      `an unsupplied range (${String(absent)}) must card, never revert -- unknown is not innocent`);
    assert.strictEqual(d.revertPlan, undefined, "and it must carry no revert plan");
    assert.match(d.reason, /not supplied/i, "the reason must name the omission rather than implying a measurement");
  }

  const span = rangeCycleSpan(undefined, CYCLES);
  assert.strictEqual(span.known, false, "an absent list resolves to UNKNOWN, mirroring schemaPlanFor()");
  assert.deepStrictEqual(span.cycleIds, [], "an unknown range names no cycles");

  // NEGATIVE CONTROL -- the tempting "no shas listed means nothing else is in the range, so it is
  // one cycle's" form, on the SAME fixture. It is the exact reading that would have let the live
  // incident through, because the live invocation passed no list at all.
  const retiredEmptyIsOneCycle = (shas) => !Array.isArray(shas) || shas.length === 0;
  assert.strictEqual(retiredEmptyIsOneCycle([]), true,
    "the retired form must call the unsupplied range safe -- otherwise this control proves nothing");
  assert.notStrictEqual(rangeCycleSpan([], CYCLES).known, retiredEmptyIsOneCycle([]),
    "the shipped reading must DIFFER from treating an unsupplied list as an innocent range");
}

// -- 4. One unclaimed commit in the range is enough to card -------------------------------------

function anUnclaimedCommitCards() {
  const d = decide(facts({ rangeShas: [HEAD_SHA, "cafebabe"] }));

  assert.strictEqual(d.action, ACTIONS.CARD_ONLY,
    "a range carrying a commit no cycle claims may hold an attended push -- never this machine's to undo");
  assert.deepStrictEqual(d.rangeSpan.cycleIds, [CYC_LAST],
    "and this fixture must isolate the UNCLAIMED property: exactly one cycle matched");
  assert.deepStrictEqual(d.rangeSpan.unclaimed, ["cafebabe"], "the unclaimed commit must be named");
  assert.match(d.reason, /claimed by no cycle/i, "the card must say which half of the test failed");

  // NEGATIVE CONTROL -- the same range with that commit claimed by the SAME cycle. One cycle, zero
  // unclaimed: it reverts. So the clause above is about the unclaimed commit, not about the count.
  const claimed = decide(facts({
    cycles: [...CYCLES, { id: CYC_LAST, push_sha: "cafebabe" }],
    rangeShas: [HEAD_SHA, "cafebabe"],
  }));
  assert.strictEqual(claimed.action, ACTIONS.REVERT_AND_CARD,
    "claiming that same commit for the attributed cycle must flip it back to a revert");
}

// -- 5. No card may claim an execution that has not happened ------------------------------------

const PAST_TENSE_CLAIM = /was reverted|is back at green/;

function noCardClaimsThePlanAsTheAct() {
  // EVERY branch that produces a revert plan, not just the code-only one.
  const branches = [
    decide(facts()),
    decide(facts({
      currentWatermark: "20260831999999",
      migrations: [{ version: "20260831999999", name: "ses_alpha" }],
      downs: [{ up_name: "ses_alpha", classification: "auto-downable", down_sql: "drop table x;" }],
    })),
  ];

  for (const d of branches) {
    assert.strictEqual(d.action, ACTIONS.REVERT_AND_CARD,
      "each fixture here must reach the revert branch, or this clause grades the wrong card");
    const card = buildIncidentCard(d, CTX);

    assert.ok(!PAST_TENSE_CLAIM.test(`${card.title}\n${card.before_after}`),
      `a planned revert's card must not say it happened -- got title "${card.title}"`);
    assert.match(`${card.title} ${card.before_after}`, /PLANNED|not been reverted|may be declined/,
      "and it must name the revert as PENDING rather than merely omitting the claim");
    assert.match(card.before_after, /dev still serves/,
      "the before/after must state what dev actually serves right now");

    // The plain-language fields are the ones John reads first, so they are held to the same bar.
    assert.ok(!/I put dev back|this card is me telling you I did/.test(`${card.plain_after} ${card.plain_cant}`),
      "the plain-language half must not claim the rollback was performed either");
    assert.match(card.plain_worth, /Reverse/,
      "every incident card still offers Reverse in John's own words");

    // The plan itself is still on the card -- carding is not the same as hiding the remedy.
    assert.match(card.qa_evidence, /Revert plan \(PROPOSED, NOT RUN/,
      "the plan must be recorded, labelled as proposed rather than performed");
  }

  // NEGATIVE CONTROL -- the CARD-ONLY branch, built by the same builder, is untouched by this ship
  // and still says its own sentence. If the two branches had been collapsed into one wording this
  // clause fails, and the distinction John reads the card for would be gone.
  const held = buildIncidentCard(decide(facts({ rangeShas: null })), CTX);
  assert.match(held.before_after, /Nothing was reverted/,
    "a card-only hold must keep saying plainly that nothing was reverted");
  assert.notStrictEqual(held.title, buildIncidentCard(decide(facts()), CTX).title,
    "held and planned must remain DIFFERENT cards, or one of the two outcomes is unreadable");
}

// -- 6. FILE-LEVEL NEGATIVE CONTROL: the shipped predecessor, run on the same fixture -----------

async function thePinnedPredecessorRevertsTheSameRange() {
  let src;
  try {
    src = execFileSync("git", ["-C", REPO, "show", `${PINNED_PRE_SHIP}:scripts/rollback-on-red.js`], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (e) {
    notRun(
      `the file-level negative control -- running the live incident's own range through ` +
        `scripts/rollback-on-red.js as it stood at ${PINNED_PRE_SHIP}, which must return ` +
        `revert-and-card and must title its card "was reverted to the last green state". Without it ` +
        `every clause above states today's behaviour without proving it DIFFERS from what shipped`,
      `the pinned blob is not in this checkout: ${e.message.split("\n")[0]}. actions/checkout@v4 ` +
        `gives a shallow checkout at its default depth, so this is expected in CI and is DECLARED ` +
        `rather than passed (SES-256's own found defect was a broken declaration in this position). ` +
        `Re-run on a full clone: git fetch --unshallow, then node tests/regression/run-all.js`,
    );
    return;
  }

  // Imported, not grepped. A string search would pass on a file that merely mentions the words.
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ses287-")), "rollback-on-red.pinned.mjs");
  fs.writeFileSync(tmp, src);
  try {
    const old = await import(pathToFileURL(tmp).href);

    const before = old.decide(fourCycleFacts());
    assert.strictEqual(before.action, old.ACTIONS.REVERT_AND_CARD,
      `at ${PINNED_PRE_SHIP} the four-cycle range REVERTED -- if it already carded, this ship changed ` +
      "nothing and every clause above is describing behaviour that predates it");
    assert.ok(before.revertPlan?.command.includes(ANCHOR_SHA),
      "and the retired plan spanned the whole anchor..head range, four cycles' work included");

    const beforeCard = old.buildIncidentCard(before, CTX);
    assert.match(`${beforeCard.title}\n${beforeCard.before_after}`, PAST_TENSE_CLAIM,
      "at the pinned commit the card asserted the revert in the PAST TENSE -- the second defect, and " +
      "the reason the live incident's card had to be rewritten by hand");

    // THE DIFFERENCE, asserted directly rather than left to be read across two clauses.
    const now = decide(fourCycleFacts());
    assert.notStrictEqual(before.action, now.action,
      "the shipped engine must DECIDE DIFFERENTLY from its predecessor on the incident's own facts");
    const nowCard = buildIncidentCard(decide(facts()), CTX);
    assert.ok(PAST_TENSE_CLAIM.test(`${beforeCard.title}\n${beforeCard.before_after}`) &&
      !PAST_TENSE_CLAIM.test(`${nowCard.title}\n${nowCard.before_after}`),
      "and the shipped card must have stopped claiming an execution the predecessor's card claimed");
  } finally {
    fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  }
}

// -- 7. The engine still never runs git ---------------------------------------------------------

function theRangeIsPassedInAndTheEngineStillNeverRunsGit() {
  const engine = fs.readFileSync(path.join(REPO, "scripts", "rollback-on-red.js"), "utf8");
  const code = engine.replace(/^\s*\/\/.*$/gm, "");

  assert.ok(!/child_process|execSync|spawnSync|simple-git/.test(code),
    "the range is HANDED IN, exactly as the CI conclusion and the migration list are -- an engine " +
    "that shelled out to `git rev-list` for itself would route around the push gates that live in " +
    "the cycle (the SES-019 shape), which is the boundary this file's subject depends on");
  assert.match(code, /argValue\("range-shas"/,
    "main() must accept --range-shas, parsed like --migrations, so the cycle can supply it");
  assert.match(code, /rangeShas,?\s*\n?\s*\}\);/,
    "and must thread it into decide() rather than parsing it and dropping it");
}

async function run() {
  theFourCycleRangeCards();
  theOneCycleRangeStillReverts();
  anOmittedRangeIsNotAnEmptyRange();
  anUnclaimedCommitCards();
  noCardClaimsThePlanAsTheAct();
  await thePinnedPredecessorRevertsTheSameRange();
  theRangeIsPassedInAndTheEngineStillNeverRunsGit();
}

selfRun(import.meta.url, run);
export default run;
