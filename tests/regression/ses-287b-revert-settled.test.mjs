// DeepBench v7.0.525 | tests/regression/ses-287b-revert-settled.test.mjs | SES-287 slice 2
//
// FEATURE: SES-287 -- a DECLINED revert must not leave its card undecided. Slice 1 (v7.0.507) closed
// the range gate and stopped the REVERT_AND_CARD card claiming the plan as the act; it left the
// affirmative half open on purpose, and said so in its own "what this file does not cover". This is
// that half: the cycle comes back from its push gates having run the plan or having declined it, and
// the engine records which, on the card and in the decision ledger.
//
// THE INCIDENT THIS GUARDS IS REAL AND IT IS THE SHAPE OF THE FIXTURE. Card 000cb93c (2026-09-15) is
// a revert-and-card incident whose plan was declined; it stood `decision NULL` until a human retired
// it by hand on 2026-09-15T22:16:39Z. The incident's own shas are not recorded in this repo, so the
// fixture below uses named stand-ins and VARIES ONLY THE RANGE between its two fixtures -- every
// result difference is therefore the clause under test and nothing else.
//
// THE DISCRIMINATOR IS A DIFFERENCE AGAINST THE SHIPPED PREDECESSOR, NOT A PROPERTY OF TODAY:
// the engine at the pinned pre-ship commit CANNOT PRODUCE A DECIDED REVERT CARD AT ALL. It exports
// no stampRevertOutcome, its buildIncidentCard() returns that card with no `decision` key, and
// main() stamps only inside `if (decision.action === ACTIONS.CARD_ONLY)`. Arm (D) imports that file
// and asserts exactly that, then asserts the one thing this ship must NOT have moved: stampCardOnly()
// on the multi-cycle fixture is byte-identical between the two engines.
//
// PINNED TO AN IMMUTABLE SHA, NEVER A BRANCH TIP. The kickoff's §6 words the control as "deep-equals
// origin/dev's"; `origin/dev` is 0b79bf01 as this is written, and the sha is what is pinned, because
// a control keyed to a branch tip is correct only in the window before its own ship -- SES-242's
// defect (v7.0.324), repeated by SES-255 (v7.0.340) and re-stated in slice 1's own header. The moment
// this ships, `origin/dev` would BE this file's subject and the control would grade nothing.
//
// IMPORTED AS A NAMESPACE, DELIBERATELY. `import { stampRevertOutcome }` would make this file fail at
// IMPORT on the unchanged tree -- a structural error that reports a module-resolution message rather
// than naming the missing behaviour. The namespace form lets assertion (A1) below be the thing that
// loses, by name, which is what a dry run is supposed to tell its reader (STANDARDS.md Section 4).
//
// DRY-RUN RESULT (STANDARDS.md Section 4, the SES-76 rule). Measured on the unchanged tree -- the
// shipped engine restored to its 0b79bf01 copy -- before this file was committed: it FAILS on (A1),
// "the shipped engine must export stampRevertOutcome()/revertOutcomeDecisionArgs() -- at 0b79bf01
// there is no way to settle a revert card at all". After the ship: pass, with arm (D) running on a
// full clone and arm (E) declared not-run without credentials.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied:
//   * THE RUNBOOK. Kickoff §6's last clause ("step 4a's block contains --range-shas, AND the file is
//     under the SES-336 byte ceiling") grades TASK 2, which this run did not build -- the step-4a
//     edit and the cycle-card re-render are held back. Asserting half of a two-direction clause would
//     read as coverage of an edit that has not happened, so neither half is asserted here. Until that
//     task lands, every live invocation still omits --range-shas and therefore CARDS, which is the
//     fail-closed direction and is why nothing here can go red for its absence.
//   * NO SETTLE HAS EVER RUN AGAINST LIVE DATA. This ship builds the mode; arm (E) is READ-ONLY by
//     construction and declares itself not-run without credentials. `runner_items.decision` on the
//     live board is therefore unchanged by this ship, and arm (E) asserts that directly: today's red
//     is claimed by no cycle, so the engine still answers `none` and no card is filed at all.
//   * THE 72-HOUR REVERSAL WINDOW is named in the reason text and never exercised, exactly as in
//     ses-373: runner_items carries no updated_at, so the before-image is the restore path.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

import { selfRun, notRun } from "./_lib/self-run.js";

// Namespace, not named bindings -- see the header. Everything below reads its policy out of the
// shipped module (SES-45: a test that recreates the logic under test passes against the bug it
// guards); nothing here restates a constant.
import * as engine from "../../scripts/rollback-on-red.js";

const { ACTIONS, ROLLBACK_DECISION_KIND, decide, buildIncidentCard, stampCardOnly } = engine;

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENGINE_REL = "scripts/rollback-on-red.js";
const MAIN_SRC = (() => {
  const src = fs.readFileSync(path.join(REPO, ENGINE_REL), "utf8");
  return src.slice(src.indexOf("async function main()"));
})();

// dev's head immediately before v7.0.525. Immutable by construction.
const PINNED_PRE_SHIP = "0b79bf01";

// -- The 2026-09-15 incident, rebuilt -----------------------------------------------------------
const HEAD_SHA = "cb93c0001111";
const CYC_MINE = "cyc-000cb93c";
const CYCLES = [{ id: CYC_MINE, push_sha: HEAD_SHA, version: "v7.0.499" }];
const ANCHOR = { commit_sha: "0000green0000", migration_watermark: "20260915000001" };
const RED_JOBS = [
  { name: "Build (blocking)", conclusion: "success" },
  { name: "Tripwire + regression (blocking)", conclusion: "failure" },
];

// Red, attributable, anchored, watermark UNCHANGED, range = the attributed cycle's own single
// commit: the one shape that plans a revert.
function revertableFacts(over = {}) {
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

// The SAME facts with a two-cycle range: register B37's gate fires and the engine cards. This is the
// fixture arm (D) holds byte-identical, because the card-only path is the one this ship must not
// have touched at all.
const PREDECESSOR = { id: "cyc-earlier", push_sha: "aaaa111122", version: "v7.0.498" };
function multiCycleFacts(over = {}) {
  return revertableFacts({
    cycles: [...CYCLES, PREDECESSOR],
    rangeShas: [PREDECESSOR.push_sha, HEAD_SHA],
    ...over,
  });
}

const CTX = { cycleId: "cyc-me", headSha: HEAD_SHA, beforeImages: [], trigger: "ci-red" };
const UUID = "4d1f2a90-71c3-4f52-9f8b-2b0a6f7c1e33";
// A FIXED clock: stampCardOnly() defaults to new Date(), and arm (D) compares two engines' output
// byte for byte. A wall clock there would compare two timestamps and call the difference a
// regression.
const FIXED_NOW = new Date("2026-09-15T22:16:39.000Z");

// -- (A) THE DISCRIMINATOR: the engine can settle a revert card at all --------------------------

function theEngineCanSettleARevertAtAll() {
  assert.strictEqual(typeof engine.stampRevertOutcome, "function",
    "(A1) the shipped engine must export stampRevertOutcome() -- at " + PINNED_PRE_SHIP + " there is " +
    "no way to settle a revert card at all, which is the whole of this ticket's remaining defect: a " +
    "declined plan files a card that stays `decision NULL` for ever (live card 000cb93c)");
  assert.strictEqual(typeof engine.revertOutcomeDecisionArgs, "function",
    "(A1) and it must export revertOutcomeDecisionArgs() -- a stamp with no decision row behind it is " +
    "the SES-373 defect wearing a value, so the pair ships together or not at all");
  assert.strictEqual(engine.REVERT_OUTCOME_DECISION, "retired",
    "(A1) both outcomes file 'retired' -- SES-300's withdrawn-as-an-ask. NOT 'accept': that is the one " +
    "value trg_runner_items_accept_clears_flag keys on and it reads as an approval no unattended cycle has");
  assert.deepStrictEqual(engine.REVERT_OUTCOME_VALUES, ["declined", "executed"],
    "(A1) the two outcomes a cycle can report are data, asserted here rather than restated");
}

// -- (B) PURE: the card the engine files today, and the card it settles -------------------------

function theFixtureReachesTheRevertBranchUndecided() {
  const d = decide(revertableFacts());
  assert.strictEqual(d.action, ACTIONS.REVERT_AND_CARD,
    "the fixture must reach the revert branch, or every clause below grades the wrong card");
  assert.ok(d.revertPlan?.from && d.revertPlan?.to, "and it must carry the plan the cycle executes");

  // TODAY'S BEHAVIOUR, PINNED AS THE INPUT: the card comes out of the builder with no `decision`
  // KEY AT ALL -- not null, absent. That is the defect's exact shape, and the stamp is what closes it.
  const card = buildIncidentCard(d, CTX);
  assert.ok(!("decision" in card),
    "buildIncidentCard() must still return the revert card UNDECIDED -- the engine does not know the " +
    "outcome at filing time, and inventing one there is the defect wearing a different value");
  assert.match(card.title, /PLANNED/,
    "and slice 1's wording must survive: at filing time the revert is PLANNED, never performed");
}

function aDeclinedRevertIsFiledRetiredInThePastTense() {
  const card = buildIncidentCard(decide(revertableFacts()), CTX);
  const settled = engine.stampRevertOutcome(card, UUID, "declined", { trigger: "ci-red", headSha: HEAD_SHA, now: FIXED_NOW });

  assert.strictEqual(settled.decision, engine.REVERT_OUTCOME_DECISION,
    "a declined revert is a decision, not an open ask -- it is filed 'retired' (SES-300)");
  assert.ok(!Number.isNaN(Date.parse(settled.decided_at)),
    "decided_at must be a parseable timestamp, not a placeholder");
  assert.ok(settled.decision_reason.startsWith(engine.REVERT_OUTCOME_REASON_PREFIX),
    "the reason must begin with the shipped prefix, read from the module");
  assert.ok(settled.decision_reason.includes(UUID),
    "the reason must NAME the decision row -- that text plus runner_before_images.decision_id IS the link");

  const prose = `${settled.title}\n${settled.before_after}`;
  assert.ok(!/PLANNED/i.test(prose),
    `a settled card must stop saying the revert is planned -- got title "${settled.title}"`);
  assert.match(prose, /was NOT reverted|never run|declined/,
    "it must say plainly that the plan was NOT run, rather than merely dropping the claim");
  assert.match(settled.before_after, /dev still serves/,
    "and it must state what dev actually serves right now -- the red sha, unchanged");
  assert.ok(!/I put dev back/.test(settled.plain_after),
    "the plain-language half must not claim a rollback that was declined");

  // PURE: the caller keeps the undecided card it built.
  assert.ok(!("decision" in card), "stampRevertOutcome must not mutate the card it was given");
  assert.strictEqual(card.title.includes("PLANNED"), true, "and it must return a COPY, leaving the original's prose alone");
}

function anExecutedRevertIsAlsoRetiredAndSaysSoInWords() {
  const card = buildIncidentCard(decide(revertableFacts()), CTX);
  const declined = engine.stampRevertOutcome(card, UUID, "declined", { headSha: HEAD_SHA, now: FIXED_NOW });
  const executed = engine.stampRevertOutcome(card, UUID, "executed", { headSha: HEAD_SHA, now: FIXED_NOW });

  assert.strictEqual(executed.decision, engine.REVERT_OUTCOME_DECISION,
    "an EXECUTED revert files 'retired' too -- 'accept' would read as John's approval, which no " +
    "unattended cycle has, and it is the value trg_runner_items_accept_clears_flag keys on");
  assert.strictEqual(executed.decision, declined.decision,
    "the enum must NOT carry the verdict: both outcomes are the same value, by design");

  // ...which is exactly why the PROSE has to differ. If it did not, the two outcomes would be
  // indistinguishable on the board and the enum's sameness would be a data loss rather than a choice.
  assert.notStrictEqual(executed.title, declined.title,
    "the two outcomes must read DIFFERENTLY on the card -- the prose carries which one happened");
  assert.match(`${executed.title}\n${executed.before_after}`, /was reverted|revert-forward/,
    "an executed revert may finally speak in the past tense -- the cycle ran it and reported back");
  assert.ok(!/dev still serves/.test(executed.before_after),
    "and it must not keep saying dev serves the red sha, which is the declined card's sentence");
  assert.ok(!/PLANNED/i.test(`${executed.title}\n${executed.before_after}`),
    "neither settled card may still call the revert planned");
}

function theOutcomeDecisionCarriesItsAttribution() {
  const d = decide(revertableFacts());
  const args = engine.revertOutcomeDecisionArgs(d, {
    cycleId: CYC_MINE, version: "v7.0.525", trigger: "ci-red", headSha: HEAD_SHA, outcome: "declined",
  });

  assert.strictEqual(args.p_cycle_id, CYC_MINE, "the decision is attributed to the cycle passed in");
  assert.strictEqual(args.p_session_name, null,
    "ck_decision_attribution admits EXACTLY ONE of cycle_id / session_name -- an unattended cycle sets the cycle");
  assert.strictEqual(args.p_kind, ROLLBACK_DECISION_KIND, "the kind is read from the module, not retyped");
  assert.strictEqual(args.p_backlog_id, null,
    "an incident is not a board ticket -- backlog_id stays NULL (SES-116: it is a JOIN KEY)");
  assert.strictEqual(args.p_ladder_work_class, null,
    "recording what a cycle already did moves no rung, so the ladder work class is NULL");
  assert.ok(args.p_summary.includes("declined"),
    "the summary must name the OUTCOME, so the ledger reads without opening the card");
  assert.ok(args.p_summary.includes(`${d.revertPlan.from}..${d.revertPlan.to}`),
    "and it must name the plan's sha range -- which commits this decision is about");
  assert.ok(args.p_reasoning.includes(d.reason),
    "the reasoning must CARRY the engine's own reason -- one home for the why");
  assert.match(args.p_reasoning, /pattern:/,
    "every recorded decision names the criterion it leaned on (pattern:0 = no standing pattern applied)");

  const ran = engine.revertOutcomeDecisionArgs(d, { cycleId: CYC_MINE, outcome: "executed", headSha: HEAD_SHA });
  assert.notStrictEqual(ran.p_summary, args.p_summary,
    "the two outcomes must record DIFFERENT summaries, or the ledger cannot tell them apart either");
  assert.strictEqual(ran.p_kind, args.p_kind, "while staying the same kind of decision");

  // A cycle's own words, when it has them, must reach the record rather than being dropped.
  const withReason = engine.revertOutcomeDecisionArgs(d, {
    cycleId: CYC_MINE, outcome: "declined", headSha: HEAD_SHA, reason: "the tripwire red was a flake, not this push",
  });
  assert.ok(withReason.p_reasoning.includes("the tripwire red was a flake"),
    "--reason must reach the decision's reasoning, or the flag is decoration");
}

// -- (C) NEGATIVE CONTROLS: a refusal that is about its argument, not a switch ------------------

function theRefusalsAreArgumentSpecificNotABlanketSwitch() {
  const card = buildIncidentCard(decide(revertableFacts()), CTX);

  assert.throws(() => engine.stampRevertOutcome(card, null, "declined"), /decision/i,
    "a falsy decision id must be refused -- 'retired' with no decision row behind it is the SES-373 " +
    "defect wearing a value rather than closing it");
  assert.throws(() => engine.stampRevertOutcome(card, "", "declined"), /decision/i,
    "and an empty string is falsy for the same reason -- it is not an id, it is the absence of one");

  assert.throws(() => engine.stampRevertOutcome(card, UUID, "maybe"), /outcome/i,
    "an outcome outside { declined, executed } must be refused: a revert ran behind the push gates or " +
    "it did not, and 'maybe' is a guess about dev being written down as a fact about dev");
  assert.throws(() => engine.stampRevertOutcome(card, UUID, undefined), /outcome/i,
    "an omitted outcome is not a default -- there is no safe one to pick");
  assert.throws(() => engine.revertOutcomeDecisionArgs(decide(revertableFacts()), { cycleId: CYC_MINE, outcome: "maybe" }),
    /outcome/i, "the decision body must refuse it too, or the vocabulary has two homes and one gate");
  assert.throws(() => engine.revertOutcomeDecisionArgs(decide(revertableFacts()), { outcome: "declined" }), /cycle/i,
    "attribution is not optional -- record_decision() RAISES with neither side set");

  // THE CONTROL ON THE CONTROLS (SES-158): a function that threw at everything would pass all six
  // clauses above while closing nothing. The same card, id and outcome must go through.
  assert.doesNotThrow(() => engine.stampRevertOutcome(card, UUID, "declined", { now: FIXED_NOW }),
    "the valid call must still succeed -- otherwise the refusals above are a blanket switch and prove nothing");
  assert.doesNotThrow(() => engine.revertOutcomeDecisionArgs(decide(revertableFacts()), { cycleId: CYC_MINE, outcome: "executed" }),
    "and so must the valid decision body");
}

function theSettlePathRecordsBeforeItImagesBeforeItPatches() {
  // Read out of the REAL main() rather than restated (SES-45), exactly as ses-373 reads its own
  // order. §19v: no before-image logged -> the write does not happen.
  const recordAt = MAIN_SRC.indexOf("revertOutcomeDecisionArgs(");
  const imageAt = MAIN_SRC.indexOf("insertBeforeImage(", recordAt);
  const patchAt = MAIN_SRC.indexOf('method: "PATCH"', recordAt);

  assert.ok(recordAt >= 0, "main() must record a decision on the settle path");
  assert.ok(imageAt > recordAt, "main() must record the decision BEFORE it images the row");
  assert.ok(patchAt > imageAt, "and image the row BEFORE it patches it (§19v)");

  const failAt = MAIN_SRC.indexOf("fail(2", recordAt);
  assert.ok(failAt > recordAt && failAt < patchAt,
    "main() must fail(2 between recording and patching -- a stamped card with no decision row behind " +
    "it is the SES-373 defect wearing a value, so no decision means no stamp, and exit 2 is *could " +
    "not run*, never a pass");

  assert.match(MAIN_SRC, /argValue\("card-id"/,
    "the settle call must name the card it settles");
  assert.match(MAIN_SRC, /row\.decision/,
    "and it must refuse a card that is already decided -- settling twice orphans the first " +
    "decision's before-image");
}

// -- (D) FILE-LEVEL NEGATIVE CONTROL: the pinned predecessor, on the same fixtures --------------

async function thePinnedPredecessorCannotSettleAndItsHeldCardIsUnchanged() {
  let src;
  try {
    src = execFileSync("git", ["-C", REPO, "show", `${PINNED_PRE_SHIP}:${ENGINE_REL}`], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (e) {
    notRun(
      `arm (D), the file-level negative control -- importing ${ENGINE_REL} as it stood at ` +
        `${PINNED_PRE_SHIP} and asserting it CANNOT produce a decided revert card (no ` +
        `stampRevertOutcome export, no \`decision\` key on the revert card), while its card-only ` +
        `output on the multi-cycle fixture is byte-identical to the shipped engine's. Without it ` +
        `every clause above states today's behaviour without proving it DIFFERS from what shipped`,
      `the pinned blob is not in this checkout: ${e.message.split("\n")[0]}. actions/checkout@v4 ` +
        `gives a shallow checkout at its default depth, so this is expected in CI and is DECLARED ` +
        `rather than passed (SES-256's own found defect was a broken declaration in this position). ` +
        `Re-run on a full clone: git fetch --unshallow, then node tests/regression/run-all.js`,
    );
    return;
  }

  // Imported, not grepped: a string search would pass on a file that merely mentions the words.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ses287b-"));
  const tmp = path.join(dir, "rollback-on-red.pinned.mjs");
  fs.writeFileSync(tmp, src);
  try {
    const old = await import(pathToFileURL(tmp).href);

    assert.strictEqual(old.stampRevertOutcome, undefined,
      `at ${PINNED_PRE_SHIP} there is NO way to settle a revert card -- if there already were, this ` +
      "ship changed nothing and every clause above describes behaviour that predates it");
    assert.strictEqual(old.revertOutcomeDecisionArgs, undefined,
      `and no decision body for the outcome either, at ${PINNED_PRE_SHIP}`);

    const oldCard = old.buildIncidentCard(old.decide(revertableFacts()), CTX);
    assert.strictEqual(oldCard.action, undefined, "sanity: the builder returns a card, not a decision");
    assert.ok(!("decision" in oldCard),
      "the predecessor's revert card carries no decision and nothing in that engine can give it one -- " +
      "which is exactly how live card 000cb93c came to be retired by a human, by hand");

    // THE DIFFERENCE, asserted directly rather than left to be read across two clauses.
    const nowCard = buildIncidentCard(decide(revertableFacts()), CTX);
    const settled = engine.stampRevertOutcome(nowCard, UUID, "declined", { headSha: HEAD_SHA, now: FIXED_NOW });
    assert.notStrictEqual(settled.decision, oldCard.decision,
      "the shipped engine must reach a decided card on the fixture its predecessor cannot decide at all");

    // AND THE THING THIS SHIP MUST NOT HAVE MOVED: the card-only path, byte for byte. Same fixture,
    // same decision id, same clock -- so any difference is this ship's and not the wall's.
    const oldHeld = old.stampCardOnly(old.buildIncidentCard(old.decide(multiCycleFacts()), CTX), UUID, FIXED_NOW);
    const newHeld = stampCardOnly(buildIncidentCard(decide(multiCycleFacts()), CTX), UUID, FIXED_NOW);
    assert.strictEqual(old.decide(multiCycleFacts()).action, ACTIONS.CARD_ONLY,
      "the multi-cycle fixture must card on BOTH engines, or this comparison grades the wrong branch");
    assert.deepStrictEqual(newHeld, oldHeld,
      "the card-only path must be byte-identical to the predecessor's -- SES-373's branch was already " +
      "honest and already decided, and rewording it would be a second edit wearing this one's justification");
    assert.strictEqual(JSON.stringify(newHeld), JSON.stringify(oldHeld),
      "asserted on the serialised form too: deepStrictEqual would not see a reordered key set");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// -- (E) LIVE, READ-ONLY -- this ship changes no live outcome today ----------------------------
//
// Today's red on dev: 0b79bf01, CI run 35344061440, Build success + Tripwire failure. The engine
// answers `none` on it, because no runner_cycles row claims that sha -- an attended or
// unattributable push is not this machine's to undo. So no card is filed, nothing is settled, and
// this ship's new mode touches nothing live until a cycle calls it explicitly. WRITES NOTHING: the
// two reads below are the engine's own GETs.
const LIVE_RED_SHA = "0b79bf01";
const LIVE_RED_RUN = "35344061440";

async function theLiveRedStillAnswersNone() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      `arm (E), the live read: that today's red (${LIVE_RED_SHA}, CI run ${LIVE_RED_RUN}) still ` +
        "decides to `none` against the live green anchor and the live runner_cycles rows -- the " +
        "proof that building the settle mode changes no live outcome today. It is READ-ONLY and " +
        "writes nothing either way",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. runner_green_states and runner_cycles " +
        "are service_role-only (anon/authenticated hold zero privileges, DAT-18), so the anon key " +
        "cannot substitute, and no repo-side render of either table exists to grade offline. Arms " +
        "(A)-(D) above still ran. Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const anchorRes = await engine.readGreenAnchor(url.replace(/\/+$/, ""), key);
  assert.ok(!anchorRes.error, `the live green anchor must be readable: ${anchorRes.error}`);
  const cyclesRes = await engine.readPushingCycles(url.replace(/\/+$/, ""), key);
  assert.ok(!cyclesRes.error, `the live pushing cycles must be readable: ${cyclesRes.error}`);

  const d = decide({
    trigger: "ci-red",
    jobs: RED_JOBS,
    headSha: LIVE_RED_SHA,
    greenAnchor: anchorRes.anchor,
    currentWatermark: anchorRes.anchor?.migration_watermark ?? null,
    cycles: cyclesRes.cycles,
    rangeShas: [LIVE_RED_SHA],
  });

  assert.strictEqual(d.action, ACTIONS.NONE,
    `${LIVE_RED_SHA} is claimed by no runner cycle, so the engine must take NO action on it -- an ` +
    "attended push and an unattributable one are the same answer here, and that is the fail-closed " +
    "reading this ship does not change");
  assert.match(d.reason, /not claimed by any/i, "and it must say so, rather than reporting a bare refusal");
  assert.strictEqual(d.revertPlan, undefined, "a `none` carries no plan a caller could run");

  // The control: the SAME live facts with that sha claimed by a cycle DO move off `none`, so the
  // clause above is about attribution and not about the engine refusing everything today.
  const claimed = decide({
    trigger: "ci-red",
    jobs: RED_JOBS,
    headSha: LIVE_RED_SHA,
    greenAnchor: anchorRes.anchor,
    currentWatermark: anchorRes.anchor?.migration_watermark ?? null,
    cycles: [...cyclesRes.cycles, { id: "cyc-hypothetical", push_sha: LIVE_RED_SHA, version: "v7.0.525" }],
    rangeShas: [LIVE_RED_SHA],
  });
  assert.notStrictEqual(claimed.action, ACTIONS.NONE,
    "claiming that sha for a cycle must flip the outcome, or arm (E) grades nothing about attribution");
}

async function run() {
  theEngineCanSettleARevertAtAll();
  theFixtureReachesTheRevertBranchUndecided();
  aDeclinedRevertIsFiledRetiredInThePastTense();
  anExecutedRevertIsAlsoRetiredAndSaysSoInWords();
  theOutcomeDecisionCarriesItsAttribution();
  theRefusalsAreArgumentSpecificNotABlanketSwitch();
  theSettlePathRecordsBeforeItImagesBeforeItPatches();
  await thePinnedPredecessorCannotSettleAndItsHeldCardIsUnchanged();
  await theLiveRedStillAnswersNone();
}

selfRun(import.meta.url, run);
export default run;
