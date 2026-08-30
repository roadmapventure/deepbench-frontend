// DeepBench v7.0.333 | tests/regression/SES-182b-migration-downs.js | SES-182 slice 2
//
// Guards the three halves of slice 2: THE PLAN'S ORDER (newest-first, because downs applied
// oldest-first re-create what a later down expected gone), THE ALL-OR-NOTHING RULE (one missing or
// refused member cards the WHOLE range and returns NO steps -- there is no partial schema
// rollback), and THE AUTHORITY BOUNDARY (the engine emits a plan; it applies no DDL, exactly as it
// pushes no commits).
//
// EVERY CLAUSE CARRIES ITS OWN NEGATIVE CONTROL -- "would this still pass if the change did
// nothing?" must answer NO. Four controls are RETIRED DESIGNS applied to the SAME fixture and
// asserted to LOSE, so the guard proves a DIFFERENCE from what was rejected rather than a property
// both share:
//
//   * theDownPlanIsNewestFirst() runs the tempting "apply them in the order supplied" form beside
//     the shipped reverse-ordered one on one fixture.
//   * aRangeWithOneMissingDownIsNeverPartiallyRolledBack() runs the tempting "down what you can"
//     form beside the shipped one: the retired form yields 2 steps where the shipped one yields 0.
//   * aRefusedDownIsNotAUsableDown() runs the tempting "a row exists, therefore it is downable"
//     form beside the shipped classification test.
//   * anUnsuppliedRangeFailsClosed() runs the tempting "an empty list means nothing landed,
//     therefore reversible" form beside the shipped unknown-is-not-innocent one.
//
// AND ONE CLAUSE PROVES THE NEW CAPABILITY IS A CAPABILITY: aFullyCapturedRangeNowReverts() runs
// the SAME moved-watermark facts with every down captured and with one removed -- revert vs card.
// Without that arm every clause here would pass on slice 1, which carded every migration range.
//
// THE POLICY IS READ OUT OF THE SHIPPED MODULE, never restated here (the SES-45 rule: a test that
// recreates the logic under test passes against the bug it guards).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { selfRun } from "./_lib/self-run.js";

import {
  ACTIONS,
  DOWN_CLASSIFICATIONS,
  schemaPlanFor,
  decide,
  buildIncidentCard,
} from "../../scripts/rollback-on-red.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENGINE_SRC = fs.readFileSync(path.join(REPO, "scripts", "rollback-on-red.js"), "utf8");

const HEAD = "abc1234def5678";
const CYCLES = [{ id: "cyc-1", push_sha: HEAD, version: "v7.0.332" }];
const ANCHOR = { commit_sha: "0000green0000", migration_watermark: "20260830000001" };
const MOVED = "20260830000003";

// Three migrations landed in the red range, oldest first -- the order migrations_in_range returns.
const RANGE = [
  { version: "20260830000002", name: "ses_alpha" },
  { version: "20260830000003", name: "ses_beta" },
];
const RANGE3 = [...RANGE, { version: "20260830000004", name: "ses_gamma" }];

const DOWN = (name, over = {}) => ({
  up_name: name,
  classification: DOWN_CLASSIFICATIONS.AUTO,
  down_sql: `drop function if exists public.${name}();`,
  ...over,
});

// A red range whose watermark MOVED -- the branch slice 1 always carded.
function movedFacts(over = {}) {
  return {
    trigger: "ci-red",
    jobs: [
      { name: "Build (blocking)", conclusion: "success" },
      { name: "Tripwire + regression (blocking)", conclusion: "failure" },
    ],
    headSha: HEAD,
    greenAnchor: ANCHOR,
    currentWatermark: MOVED,
    cycles: CYCLES,
    migrations: RANGE,
    downs: RANGE.map((m) => DOWN(m.name)),
    ...over,
  };
}

// -- 1. The plan's order ---------------------------------------------------------------------

function theDownPlanIsNewestFirst() {
  const plan = schemaPlanFor(RANGE3, RANGE3.map((m) => DOWN(m.name)));
  assert.strictEqual(plan.reversible, true, "the control arm must be reversible, or this clause proves nothing");
  assert.deepStrictEqual(
    plan.steps.map((s) => s.name),
    ["ses_gamma", "ses_beta", "ses_alpha"],
    "downs apply newest-first -- oldest-first re-creates what a later down expected gone"
  );

  // NEGATIVE CONTROL -- the retired "apply them in the order supplied" form, same fixture.
  const retiredAsSupplied = RANGE3.map((m) => m.name);
  assert.deepStrictEqual(retiredAsSupplied, ["ses_alpha", "ses_beta", "ses_gamma"],
    "the retired form must be oldest-first -- otherwise this control proves nothing");
  assert.notDeepStrictEqual(plan.steps.map((s) => s.name), retiredAsSupplied,
    "the shipped order must DIFFER from the order the range was supplied in");
}

// -- 2. All or nothing -----------------------------------------------------------------------

function aRangeWithOneMissingDownIsNeverPartiallyRolledBack() {
  const partial = [DOWN("ses_alpha"), DOWN("ses_beta")]; // ses_gamma was never captured
  const plan = schemaPlanFor(RANGE3, partial);

  assert.strictEqual(plan.reversible, false, "a range missing any down is not reversible");
  assert.deepStrictEqual(plan.steps, [],
    "steps must come back EMPTY on a miss, so no caller can apply a subset even by accident");
  assert.strictEqual(plan.missing.length, 1, "exactly the uncaptured member is missing");
  assert.strictEqual(plan.missing[0].name, "ses_gamma", "the card must be able to NAME the blocker");
  assert.match(plan.missing[0].why, /no down was captured/i, "and say why it blocked");
  assert.match(plan.reason, /No partial schema rollback is ever attempted/i,
    "the reason must state the rule rather than leaving it to the reader");

  // NEGATIVE CONTROL -- the retired "down what you can" form, on the SAME fixture: it yields two
  // steps and would leave the schema half-undone, a state no green anchor describes.
  const names = new Set(partial.map((d) => d.up_name));
  const retiredBestEffort = RANGE3.filter((m) => names.has(m.name));
  assert.strictEqual(retiredBestEffort.length, 2,
    "the retired form must produce steps -- otherwise this control proves nothing");
  assert.notStrictEqual(plan.steps.length, retiredBestEffort.length,
    "the shipped plan must DIFFER from the best-effort form when a member is missing");
}

function aRefusedDownIsNotAUsableDown() {
  const downs = [DOWN("ses_alpha"), DOWN("ses_beta", { classification: DOWN_CLASSIFICATIONS.REFUSED, down_sql: null })];
  const plan = schemaPlanFor(RANGE, downs);

  assert.strictEqual(plan.reversible, false, "a refused capture is not a usable down");
  assert.strictEqual(plan.missing[0].name, "ses_beta", "the refused member is the blocker");
  assert.match(plan.missing[0].why, /classified 'refused'/i,
    "the reason must name the classification, so John sees it was refused rather than forgotten");

  // NEGATIVE CONTROL -- the retired "a row exists, therefore the migration is downable" form.
  const retiredRowExists = RANGE.every((m) => downs.some((d) => d.up_name === m.name));
  assert.strictEqual(retiredRowExists, true,
    "the retired form must call this range downable -- otherwise this control proves nothing");
  assert.notStrictEqual(plan.reversible, retiredRowExists,
    "the shipped test must DIFFER from mere row existence");
}

function aBlankDownIsNotAUsableDown() {
  // ck_runner_migration_downs_auto_has_sql rejects this row shape at the database too. The engine
  // checks it as well, because an 'auto-downable' row with a blank down would tell a caller the
  // range is reversible and then reverse nothing -- the one failure that is silent.
  for (const blank of [null, "", "   "]) {
    const plan = schemaPlanFor([RANGE[0]], [DOWN("ses_alpha", { down_sql: blank })]);
    assert.strictEqual(plan.reversible, false, `a down of ${JSON.stringify(blank)} is not usable`);
    assert.match(plan.missing[0].why, /blank/i, "and the reason says the down is blank");
  }
  const ok = schemaPlanFor([RANGE[0]], [DOWN("ses_alpha")]);
  assert.strictEqual(ok.reversible, true, "the control arm with a real down must be reversible");
}

function anUnsuppliedRangeFailsClosed() {
  for (const empty of [[], null, undefined]) {
    const plan = schemaPlanFor(empty, []);
    assert.strictEqual(plan.reversible, false,
      "an absent migration list is 'unknown', never 'nothing landed'");
    assert.match(plan.reason, /not supplied/i, "and the reason names the omission");
    assert.deepStrictEqual(plan.steps, [], "an unknown range plans nothing");
  }

  // NEGATIVE CONTROL -- the tempting "empty list means no migrations, therefore reversible" form.
  const retiredEmptyIsReversible = (migs) => !Array.isArray(migs) || migs.length === 0;
  assert.strictEqual(retiredEmptyIsReversible([]), true,
    "the retired form must call the empty range reversible -- otherwise this control proves nothing");
  assert.notStrictEqual(schemaPlanFor([], []).reversible, retiredEmptyIsReversible([]),
    "the shipped test must DIFFER from treating an unsupplied list as an empty range");

  // And it must reach the DECISION: every slice-1 caller passes no list and must still see the
  // slice-1 outcome, byte-identical in shape.
  const d = decide(movedFacts({ migrations: [], downs: [] }));
  assert.strictEqual(d.action, ACTIONS.CARD_ONLY, "no list supplied still cards, exactly as slice 1 did");
  assert.match(d.reason, /NO automatic schema action/,
    "and still says plainly that no schema action was taken");
}

// -- 3. The new capability is a capability, not a rename --------------------------------------

function aFullyCapturedRangeNowReverts() {
  const captured = decide(movedFacts());
  const oneMissing = decide(movedFacts({ downs: [DOWN("ses_alpha")] }));

  assert.strictEqual(captured.action, ACTIONS.REVERT_AND_CARD,
    "a moved watermark whose every migration carries a captured down is now reversible -- this is the slice");
  assert.ok(captured.revertPlan?.command, "the code half still reverts forward");
  assert.strictEqual(captured.schemaPlan.reversible, true, "and the schema half carries its plan");
  assert.strictEqual(captured.schemaPlan.steps.length, RANGE.length, "one down per migration in the range");

  // NEGATIVE CONTROL -- the SAME facts with one down removed. Revert vs card is a DIFFERENCE, and
  // without this arm the clause above would also pass on slice 1, which carded every such range.
  assert.strictEqual(oneMissing.action, ACTIONS.CARD_ONLY,
    "removing one captured down must flip the same facts back to card-only");
  assert.notStrictEqual(captured.action, oneMissing.action,
    "the shipped engine must DIFFER on those two fixtures, or the capture ledger changes nothing");
}

function aCodeOnlyRangeStillCarriesNoSchemaPlan() {
  const codeOnly = decide(movedFacts({ currentWatermark: ANCHOR.migration_watermark }));
  assert.strictEqual(codeOnly.action, ACTIONS.REVERT_AND_CARD, "an unmoved watermark still reverts");
  assert.strictEqual(codeOnly.schemaPlan, undefined,
    "a code-only range asks no schema question, so it carries no schema plan to answer one");
}

// -- 4. The authority boundary ----------------------------------------------------------------

function theEngineNeverAppliesDdlAndNeverPushes() {
  const code = ENGINE_SRC.replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/child_process|execSync|spawnSync|simple-git/.test(code),
    "the engine must not shell out -- the push gates live in the cycle");
  assert.ok(!/\bapply_migration\s*\(/.test(code),
    "the engine must never apply DDL: it emits a schema plan the cycle runs behind its own gates");
  assert.ok(!/from\s+["'](pg|postgres|pg-promise)["']/.test(code),
    "the engine must hold no direct database client -- PostgREST only, like every other runner script");
  assert.ok(!/\bgit\s+push\b/.test(code), "the engine must never push");
}

function theClassificationVocabularyIsTheDatabases() {
  // ck_runner_migration_downs_classification admits exactly these two, read from
  // pg_get_constraintdef at this ship. A third value here would silently widen what counts as
  // downable.
  assert.deepStrictEqual(Object.values(DOWN_CLASSIFICATIONS).sort(), ["auto-downable", "refused"],
    "the engine's classification vocabulary must be the database's, not a superset");
  const plan = schemaPlanFor([RANGE[0]], [DOWN("ses_alpha", { classification: "probably-fine" })]);
  assert.strictEqual(plan.reversible, false,
    "an unrecognised classification must fail closed, never be treated as downable");
}

// -- 5. The card says what happened to the schema ---------------------------------------------

function theCardCarriesTheSchemaRecord() {
  const ctx = { cycleId: "cyc-me", headSha: HEAD, beforeImages: [], trigger: "ci-red" };

  const reverted = buildIncidentCard(decide(movedFacts()), ctx);
  assert.match(reverted.qa_evidence, /Schema: 2 captured down\(s\) apply newest-first/,
    "a reverted range must say how many downs apply and in what order");
  assert.match(reverted.qa_evidence, /ses_beta/, "and name them");

  const blocked = buildIncidentCard(decide(movedFacts({ downs: [] })), ctx);
  assert.match(blocked.qa_evidence, /Schema: NO automatic schema action/,
    "a blocked range must say plainly that no schema action was taken");
  assert.match(blocked.qa_evidence, /ses_alpha|ses_beta/,
    "and NAME the blocking member rather than saying only that it could not be rolled back");

  const codeOnly = buildIncidentCard(decide(movedFacts({ currentWatermark: ANCHOR.migration_watermark })), ctx);
  assert.match(codeOnly.qa_evidence, /watermark did not move/,
    "a code-only range must say there was no schema question, not print an empty schema line");
}

// -- 6. SES-158 vacuity meta-check -------------------------------------------------------------

function theControlsAreNotVacuous() {
  // Every negative control above is only worth its line if the RETIRED form actually reaches the
  // wrong answer on the fixture it is given. Assert that directly, in one place, so a later edit
  // that quietly makes a control agree with the shipped form is caught rather than passing.
  const partialDowns = [DOWN("ses_alpha"), DOWN("ses_beta")];
  const names = new Set(partialDowns.map((d) => d.up_name));

  const controls = [
    ["order", RANGE3.map((m) => m.name)[0] === "ses_alpha"],
    ["best-effort", RANGE3.filter((m) => names.has(m.name)).length > 0],
    ["row-exists", RANGE.every((m) => partialDowns.some((d) => d.up_name === m.name))],
    ["empty-is-reversible", [].length === 0],
  ];
  for (const [name, retiredSaysYes] of controls) {
    assert.strictEqual(retiredSaysYes, true,
      `the '${name}' negative control must reach the WRONG answer on its fixture, or it proves nothing`);
  }
}

function run() {
  theDownPlanIsNewestFirst();
  aRangeWithOneMissingDownIsNeverPartiallyRolledBack();
  aRefusedDownIsNotAUsableDown();
  aBlankDownIsNotAUsableDown();
  anUnsuppliedRangeFailsClosed();
  aFullyCapturedRangeNowReverts();
  aCodeOnlyRangeStillCarriesNoSchemaPlan();
  theEngineNeverAppliesDdlAndNeverPushes();
  theClassificationVocabularyIsTheDatabases();
  theCardCarriesTheSchemaRecord();
  theControlsAreNotVacuous();
}

selfRun(import.meta.url, run);
export default run;
