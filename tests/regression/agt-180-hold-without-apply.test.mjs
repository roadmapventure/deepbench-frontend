// DeepBench v7.0.624 | tests/regression/agt-180-hold-without-apply.test.mjs | AGT-180
//
// FEATURE: AGT-180 -- the rollback hold is written by the CYCLE, not by a denied shell flag.
//
// WHAT WAS BROKEN, and it was not the assessment. `scripts/rollback-on-red.js` already ran on dev
// and the harness already permitted it: the §2 command returned `action: card-only` with full
// attribution. What it did not do was WRITE. The `runner_decisions` kind='rollback' insert sits past
// `if (!APPLY)`, and `--apply` has been denied twice in this chain under TWO DIFFERENT reasons
// ([Blind Apply], then [Modify Shared Resources]) -- so the fix could not narrow one classifier rule.
// Live cost at the ship: 34 CI reds on dev since 2026-09-26, 0 kind='rollback' rows, 0 incident cards.
//
// WHAT SHIPPED: `holdWriteFor(decision, ctx)` -- pure -- returns the hold as DATA: `args` is
// `rollbackDecisionArgs()` VERBATIM plus one dollar-quoted `select public.record_decision(...)`
// statement, and the dry run now carries them as `hold` / `holdSql` / `holdReason`. The cycle
// performs the write with the Supabase tool every other record_decision() on this platform already
// goes through. No new flag; `applied:false`, `exitCode:0` and the `decision` object unchanged.
//
// THE ONE THING THIS IS NOT, ASSERTED AND NOT MERELY WRITTEN DOWN (assertion 5). It is NOT a
// re-spelled `--apply` and NOT the same writes from another interpreter -- that is SES-019's
// forbidden route around a hook deny, and it stays forbidden however safe an instance looks. So the
// no-apply path is read as SOURCE and asserted to compose the statement and NOTHING ELSE: no fetch,
// no rest(), no record* call, no spawn, between `if (!APPLY)` and its `finish`. That clause exists
// for the later editor who finds it "obvious" to just run it, which is the failure mode the ticket's
// own kickoff text names.
//
// FOUR ARMS:
//   * (A) PURE -- holdWriteFor() over real decide() output. Always runs. Assertions 1-3.
//   * (B) SOURCE -- the no-apply path executes nothing, read out of the shipped file. Always runs.
//     Assertion 5. Its negative control is a hand-built copy of the path WITH a write in it, shown
//     to LOSE the same check (SES-158: a control that changes nothing proves nothing).
//   * (C) LIVE SUBPROCESS -- the real CLI, twice, as the cycle calls it. Credential-gated and
//     DECLARED not-run otherwise (SES-180), never silently skipped. Assertion 4 and the control pair.
//   * (D) READ-ONLY PROOF -- kind='rollback' count is identical either side of arm (C), so the
//     no-apply run is proven to write nothing rather than assumed to (pattern:76).
//
// THE FIXTURE IS READ LIVE, NOT HARDCODED. Arm (C) picks the newest `runner_cycles` row that carries
// a push_sha -- deterministic (the table's own ordering, pattern:127) -- and asserts that sha IS
// claimed while the control sha is NOT, so the pair is a PROVEN discriminator rather than a hopeful
// one. A hardcoded sha would rot the day that cycle row is pruned.
//
// DRY-RUN RESULT (STANDARDS.md Section 4, the SES-76 rule), measured twice and reported as measured
// rather than as reasoned:
//   * The §2 command run against the unedited engine at origin/dev@1b422b27 printed the keys
//     `ok,exitCode,decision,applied` and nothing else -- `hold`, `holdSql` and `holdReason` ABSENT,
//     on the same `action: card-only` decision. That is the half that fails if this ship did nothing.
//   * THIS FILE run against that same unedited engine (swapped in, then restored) died before a
//     single arm: `SyntaxError: The requested module '../../scripts/rollback-on-red.js' does not
//     provide an export named 'HOLD_SQL_TAG'`. A brand-new export can only fail structurally, and
//     that is said here rather than left to look like assertion coverage.
// After the ship: 4/4 arms pass, the same command prints `hold.p_kind = 'rollback'` and a holdSql
// starting `select public.record_decision(`, and the kind='rollback' count stayed 41.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied:
//   * Nothing here runs the emitted statement. That write is the CYCLE's, through its Supabase tool,
//     and a test that performed it would both mutate the ledger and become the very shortcut
//     assertion 5 forbids. The 41 -> 42 half of the QA belongs to the orchestrator.
//   * `--apply`'s own write path is untouched by this ship and is guarded where it already was
//     (ses-373 arm (B)). This file asserts only that the no-apply path stopped dropping the hold.
//   * `revert-and-card` records nothing on either path, deliberately. Assertion 2 fixes that as the
//     pure negative control; ses-373's arm (A) owns the card half of the same carve-out.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

import { selfRun, notRun } from "./_lib/self-run.js";

import {
  ACTIONS,
  ROLLBACK_DECISION_KIND,
  HOLD_SQL_TAG,
  decide,
  rollbackDecisionArgs,
  holdWriteFor,
} from "../../scripts/rollback-on-red.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENGINE_REL = path.join("scripts", "rollback-on-red.js");
const ENGINE_SRC = fs.readFileSync(path.join(REPO, ENGINE_REL), "utf8");

// The shape the cycle reads back, named once so every arm below grades the same regex.
export const HOLD_SQL_SHAPE = /^select public\.record_decision\(/;

// `$hold$` with its dollars escaped for a regex, and the span between a matched pair. Derived from
// the shipped constant rather than retyped, so a later tag change cannot leave this file grading the
// old one.
const TAG_ESC = HOLD_SQL_TAG.replace(/\$/g, "\\$");
export const QUOTED_SPAN = new RegExp(`${TAG_ESC}[\\s\\S]*?${TAG_ESC}`, "g");

// The three members the statement renders as a literal NULL. If a later edit gives one of them a
// value, the args and the sql stop describing the same decision -- so both halves are asserted.
export const HOLD_NULL_ARGS = ["p_session_name", "p_backlog_id", "p_ladder_work_class"];

const HEAD = "abc1234def5678";
const CYCLE = "cyc-agt-180";
const CYCLES = [{ id: "cyc-1", push_sha: HEAD, version: "v7.0.624" }];
const ANCHOR = { commit_sha: "0000green0000", migration_watermark: "20260916161521" };
const CTX = { cycleId: CYCLE, version: "v7.0.624", trigger: "ci-red", headSha: HEAD };

// Red, attributable, anchored, range NOT supplied -> rangeCycleSpan() fails closed and decide()
// reaches CARD_ONLY. Asserted below rather than assumed.
function cardOnlyFacts(over = {}) {
  return {
    trigger: "ci-red",
    jobs: [
      { name: "Build (blocking)", conclusion: "success" },
      { name: "Tripwire + regression (blocking)", conclusion: "failure" },
    ],
    headSha: HEAD,
    greenAnchor: ANCHOR,
    currentWatermark: ANCHOR.migration_watermark,
    cycles: CYCLES,
    rangeShas: null,
    ...over,
  };
}

// The same facts with the range supplied and holding only the attributed cycle's commit: the one
// shape that reverts. Used as the negative control -- a branch that must NOT produce a hold.
function revertableFacts() {
  return cardOnlyFacts({ rangeShas: [HEAD] });
}

// ---------------------------------------------------------------------------
// (A) PURE
// ---------------------------------------------------------------------------

function theFixturesReachTheBranchesTheyClaim() {
  assert.strictEqual(decide(cardOnlyFacts()).action, ACTIONS.CARD_ONLY,
    "the fixture must reach CARD_ONLY, or every clause below grades the wrong branch");
  assert.strictEqual(decide(revertableFacts()).action, ACTIONS.REVERT_AND_CARD,
    "the control fixture must reach REVERT_AND_CARD, or the negative control proves nothing");
}

// ASSERTION 1 -- one home for the payload. The whole premise of this ship is that the statement is a
// RENDERING of rollbackDecisionArgs() and never a second composer, so the two are asserted EQUAL on
// the same fixture rather than merely asserted to look similar.
function theArgsAreTheShippedComposerVerbatim() {
  const d = decide(cardOnlyFacts());
  const { args, sql } = holdWriteFor(d, CTX);

  assert.deepStrictEqual(args, rollbackDecisionArgs(d, CTX),
    "holdWriteFor().args must deep-equal rollbackDecisionArgs() on the same fixture -- a second " +
    "composer is a second home for the payload, and the --apply path would then write something else");
  assert.strictEqual(args.p_kind, ROLLBACK_DECISION_KIND, "the kind is read from the module, not retyped");

  assert.match(sql, HOLD_SQL_SHAPE, `the statement must begin ${HOLD_SQL_SHAPE} -- that is what the cycle matches on`);
  assert.ok(sql.trimEnd().endsWith(");"), "the statement must be complete and terminated");
  // ONE statement, counted OUTSIDE the quoted literals -- decide()'s own prose carries semicolons,
  // and a naive count would grade the reason text rather than the statement.
  const skeleton = sql.replace(QUOTED_SPAN, "<value>");
  assert.strictEqual(skeleton.split(";").length - 1, 1,
    `exactly ONE statement outside the quoted values -- a second one is a second write nobody audited (skeleton: ${skeleton})`);

  // Every value that IS carried must reach the statement, dollar-quoted rather than escaped.
  for (const name of ["p_cycle_id", "p_kind", "p_summary", "p_reasoning"]) {
    assert.ok(sql.includes(`${name} => ${HOLD_SQL_TAG}${args[name]}${HOLD_SQL_TAG}`),
      `${name} must reach the statement dollar-quoted with ${HOLD_SQL_TAG}, carrying its value verbatim`);
  }
  assert.ok(sql.includes(`${HOLD_SQL_TAG}${args.p_cycle_id}${HOLD_SQL_TAG}::uuid`),
    "p_cycle_id must be cast ::uuid -- record_decision()'s first parameter is a uuid, not text");
  assert.ok(args.p_reasoning.includes(d.reason),
    "the reasoning must carry decide()'s own reason -- recording the hold records the assessment inside it");
  assert.match(args.p_reasoning, /pattern:/,
    "every recorded decision names the criterion it leaned on (pattern:0 = no standing pattern applied)");

  // And the two halves must AGREE about what is absent, not merely both be quiet about it.
  for (const name of HOLD_NULL_ARGS) {
    assert.strictEqual(args[name], null, `${name} must be null in the args`);
    assert.ok(sql.includes(`${name} => null`), `${name} must render as a literal null in the statement`);
  }
}

// ASSERTION 2 -- the pure negative control. Attribution is not optional, and a hold is composable
// only for the branch that is due one. Both are asserted to LOSE, so this proves a DIFFERENCE rather
// than a property every input shares.
function aHoldIsNotComposableWithoutItsAttribution() {
  const d = decide(cardOnlyFacts());

  assert.throws(() => holdWriteFor(d, {}), /cycle/i,
    "holdWriteFor must refuse a missing cycle id -- record_decision() raises unless exactly one of " +
    "cycle_id / session_name is set (ck_decision_attribution), and an unattributed hold is a value " +
    "with nobody behind it");

  // The revert branch composes an args object too (rollbackDecisionArgs is branch-agnostic by
  // design), so the DIFFERENCE this ship depends on lives in the CLI, not in this function -- and
  // saying so here is what stops a later reader looking for a gate that was never here.
  const revert = holdWriteFor(decide(revertableFacts()), CTX);
  assert.match(revert.sql, HOLD_SQL_SHAPE,
    "holdWriteFor is branch-agnostic; the card-only gate lives at the CLI's no-apply finish");
  assert.notStrictEqual(revert.args.p_reasoning, holdWriteFor(d, CTX).args.p_reasoning,
    "the two branches must differ in what they would record, or the fixtures are not discriminating");
}

// ASSERTION 3 -- it REFUSES rather than escapes. decide()'s prose carries apostrophes on every
// branch; a statement whose quoting ends early runs and means something else, which is worse than
// one that was never composed.
function theTagIsRefusedNeverEscaped() {
  const d = decide(cardOnlyFacts());

  // (i) through the reasoning, which is where decide()'s own prose lands.
  const poisonedReason = { ...d, reason: `${d.reason} and then ${HOLD_SQL_TAG} happened` };
  assert.throws(() => holdWriteFor(poisonedReason, CTX), new RegExp(HOLD_SQL_TAG.replace(/\$/g, "\\$")),
    `a reason containing the literal ${HOLD_SQL_TAG} must THROW -- emitting it would end the dollar ` +
    "quoting early and change what the statement says");

  // (ii) through the summary, which interpolates the trigger the caller passed in.
  assert.throws(() => holdWriteFor(d, { ...CTX, trigger: `ci-red${HOLD_SQL_TAG}` }), /\$hold\$/,
    "the tag must be refused wherever it enters, not only in the reasoning");

  // CONTROL WITH TEETH (SES-158): the SAME fixtures without the tag must compose, or the two clauses
  // above would pass for any reason at all.
  assert.match(holdWriteFor(d, CTX).sql, HOLD_SQL_SHAPE,
    "the untagged fixture must still compose, or the refusals above prove nothing");
  assert.ok(!holdWriteFor(d, CTX).args.p_reasoning.includes(HOLD_SQL_TAG),
    `the engine's own prose must not contain ${HOLD_SQL_TAG} -- if it ever does, this guard is why`);
}

// ---------------------------------------------------------------------------
// (B) SOURCE -- the no-apply path composes and reports. It executes nothing.
// ---------------------------------------------------------------------------

// ASSERTION 5, AND IT IS THE POINT OF THE TICKET. SES-019: never retry a denied action through a
// different tool. `--apply` is denied, so the no-apply path must not become a second way to perform
// the same writes. Read out of the shipped source rather than restated (SES-45).
export const FORBIDDEN_IN_NO_APPLY = [
  "fetch(",
  "rest(",
  "recordRollbackDecision",
  "recordGreenState",
  "insertBeforeImage",
  "fileIncidentCard",
  "execFileSync",
  "execSync",
  "spawn",
];

function noApplyBlockOf(src) {
  const start = src.indexOf("if (!APPLY) {");
  if (start < 0) return null;
  const end = src.indexOf("if (!cycleId) fail(2,", start);
  return end > start ? src.slice(start, end) : null;
}

function theNoApplyPathPerformsNoWrite() {
  const block = noApplyBlockOf(ENGINE_SRC);
  assert.ok(block, `${ENGINE_REL} must still carry an \`if (!APPLY) {\` block ending before the --apply cycle-id gate`);

  assert.ok(block.includes("holdWriteFor("), "the no-apply path must COMPOSE the hold");
  assert.ok(block.includes("holdSql"), "the no-apply path must hand the statement back as data");
  assert.ok(block.includes("finish("), "the no-apply path must end by reporting, not by writing");

  for (const forbidden of FORBIDDEN_IN_NO_APPLY) {
    assert.ok(!block.includes(forbidden),
      `the no-apply path must not contain \`${forbidden}\` -- the write is the CYCLE's, through its ` +
      "Supabase tool, from the emitted statement. Performing it here would be the denied --apply " +
      "issued through a different route (SES-019), which is forbidden however safe this instance looks");
  }

  // CONTROL WITH TEETH: the retired "just run it here" form is shown to LOSE the same check, so this
  // asserts a DIFFERENCE rather than a property any block of text would share.
  const retired = block.replace("finish(", "await recordRollbackDecision(base, key, hold);\n    finish(");
  assert.notStrictEqual(retired, block, "the control must actually change the block (SES-158)");
  assert.ok(FORBIDDEN_IN_NO_APPLY.some((f) => retired.includes(f)),
    "the control must trip at least one forbidden form, or this check cannot detect the thing it forbids");

  // The --apply write path is UNTOUCHED by this ship: it still records the hold itself, so both
  // paths record it after this ship. Asserted here so a later edit cannot quietly move the write out.
  const applySide = ENGINE_SRC.slice(ENGINE_SRC.indexOf("if (!cycleId) fail(2,"));
  assert.ok(applySide.includes("recordRollbackDecision("),
    "the --apply path must still perform its own write -- this ship adds a second recorder, it does " +
    "not replace the first");
}

// ---------------------------------------------------------------------------
// (C) + (D) LIVE SUBPROCESS -- the real CLI, twice, plus the read-only proof.
// ---------------------------------------------------------------------------

const RED_JOBS = JSON.stringify([
  { name: "Build (blocking)", conclusion: "success" },
  { name: "Tripwire + regression (blocking)", conclusion: "failure" },
]);
// A sha no runner cycle claims, so decide() returns `none`. Asserted unclaimed below.
export const UNCLAIMED_SHA = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
export const QA_CYCLE_ID = "52c50962-6543-4793-81be-3c96f37993fa";

async function restRows(base, key, pathAndQuery) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error(`${pathAndQuery} returned a non-array payload`);
  return body;
}

async function rollbackDecisionCount(base, key) {
  const rows = await restRows(base, key, `runner_decisions?select=id&kind=eq.${ROLLBACK_DECISION_KIND}&limit=10000`);
  return rows.length;
}

// The CLI as the cycle calls it: --json, no --apply. Never --apply from a test.
function runEngine(args) {
  const out = execFileSync(process.execPath, [path.join(REPO, ENGINE_REL), "--json", ...args], {
    cwd: REPO,
    encoding: "utf8",
    env: process.env,
  });
  return JSON.parse(out.trim().split("\n").pop());
}

async function theLiveDryRunHandsBackTheHold() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun(
      "arms (C) and (D), the live subprocess: the real CLI run with no --apply emitting " +
        `hold.p_kind='${ROLLBACK_DECISION_KIND}' and a holdSql matching ${HOLD_SQL_SHAPE}, the ` +
        "action:none control emitting hold:null, and the kind='rollback' count proven identical " +
        "either side of both runs. Arms (A) and (B) above still ran, and they carry assertion 5 -- " +
        "the clause that forbids this path ever performing the write itself",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. main() exits 2 without them by design " +
        "(exit 2 = could not run, never a pass) because it reads the green anchor and the pushing " +
        "cycles before it decides anything, and runner_cycles is service_role-only (anon and " +
        "authenticated hold zero privileges, DAT-18), so the anon key cannot substitute. Canonical " +
        "invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  // (D) before. Read first, so the proof brackets BOTH subprocess runs.
  const countBefore = await rollbackDecisionCount(base, key);

  // The fixture, read live and deterministically: the newest cycle row that pushed. Hardcoding a sha
  // would rot the day that row is pruned.
  const cycles = await restRows(base, key,
    "runner_cycles?select=id,push_sha,version&push_sha=not.is.null&order=started_at.desc&limit=1");
  assert.strictEqual(cycles.length, 1,
    "at least one runner_cycles row must carry a push_sha, or there is no attributable sha to grade");
  const claimedSha = cycles[0].push_sha;

  // THE PAIR IS A PROVEN DISCRIMINATOR, not a hopeful one: one sha is claimed, the other is not.
  const unclaimed = await restRows(base, key,
    `runner_cycles?select=id&push_sha=eq.${UNCLAIMED_SHA}&limit=1`);
  assert.strictEqual(unclaimed.length, 0,
    `the control sha ${UNCLAIMED_SHA} must be claimed by NO cycle, or the action:none arm grades the wrong branch`);

  // (C) arm 1 -- card-only: the hold comes back as data.
  const held = runEngine([
    `--trigger=ci-red`, `--sha=${claimedSha}`, `--cycle-id=${QA_CYCLE_ID}`,
    `--watermark=${ANCHOR.migration_watermark}`, `--jobs=${RED_JOBS}`, `--migrations=[]`,
  ]);
  assert.strictEqual(held.decision.action, ACTIONS.CARD_ONLY,
    `a claimed sha with no --range-shas must reach CARD_ONLY, got '${held.decision.action}'`);
  assert.strictEqual(held.applied, false, "no --apply means applied:false -- unchanged by this ship");
  assert.strictEqual(held.exitCode, 0, "the dry run still exits 0 -- unchanged by this ship");
  assert.ok(held.hold, "THE TICKET: a card-only dry run must hand the hold back, not drop it in stdout");
  assert.strictEqual(held.hold.p_kind, ROLLBACK_DECISION_KIND,
    `the hold must carry kind '${ROLLBACK_DECISION_KIND}'`);
  assert.strictEqual(held.hold.p_cycle_id, QA_CYCLE_ID,
    "the hold must be attributed to the --cycle-id passed in");
  assert.match(held.holdSql, HOLD_SQL_SHAPE,
    `the emitted statement must begin ${HOLD_SQL_SHAPE}, which is what the cycle hands its Supabase tool`);
  assert.strictEqual(held.holdReason, null, "a composed hold reports no absent half");

  // (C) arm 2 -- THE CONTROL: an unattributable sha decides nothing, so there is no hold to hand
  // back. Same command, same tree, opposite answer.
  const none = runEngine([
    `--trigger=ci-red`, `--sha=${UNCLAIMED_SHA}`, `--cycle-id=${QA_CYCLE_ID}`,
    `--watermark=${ANCHOR.migration_watermark}`, `--jobs=${RED_JOBS}`, `--migrations=[]`,
  ]);
  assert.strictEqual(none.decision.action, ACTIONS.NONE,
    `an unclaimed sha must reach '${ACTIONS.NONE}', got '${none.decision.action}'`);
  assert.strictEqual(none.hold, null, "action:none records nothing, so it hands back no hold");
  assert.strictEqual(none.holdSql, null, "action:none emits no statement");
  assert.ok(typeof none.holdReason === "string" && none.holdReason.includes(ACTIONS.NONE),
    "the control must NAME which half is absent rather than going quiet about it");

  // The two runs must DIFFER on the key under test, or the pair proves nothing.
  assert.notStrictEqual(held.holdSql, none.holdSql,
    "the card-only and action:none runs must differ on holdSql, or this arm is vacuous");

  // (D) after -- the read-only proof. A no-apply run that wrote a row would be the denied --apply
  // wearing a different flag, and this is the clause that would catch it.
  const countAfter = await rollbackDecisionCount(base, key);
  assert.strictEqual(countAfter, countBefore,
    `the kind='${ROLLBACK_DECISION_KIND}' count must be UNCHANGED across both no-apply runs ` +
    `(${countBefore} -> ${countAfter}). A row appearing here means the engine performed the write ` +
    "itself, which is exactly what this ship must not do -- the statement is emitted for the cycle to run");
}

async function run() {
  theFixturesReachTheBranchesTheyClaim();
  theArgsAreTheShippedComposerVerbatim();
  aHoldIsNotComposableWithoutItsAttribution();
  theTagIsRefusedNeverEscaped();
  theNoApplyPathPerformsNoWrite();
  await theLiveDryRunHandsBackTheHold();
}

selfRun(import.meta.url, run);
export default run;
