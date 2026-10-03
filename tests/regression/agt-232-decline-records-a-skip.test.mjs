// DeepBench v7.0.669 | tests/regression/agt-232-decline-records-a-skip.test.mjs | AGT-232 -- A
// DECLINED HEAD IS RECORDED, SO THE TURN BUYS A ROW.
//
// WHAT SHIPPED (no migration, no DDL). `scripts/run-project.js` gained `declineSkipFor()`, and the
// (c) refusal return and the (d) `stop`/`report` returns now reach ONE `public.record_skip()` call
// through it. All three shapes a correct read of an unbuildable head can take used to write nothing
// at all: `stop` and `report` each carried the literal `recorded: false` and the prose `Nothing was
// written.`, and an `assign` naming any other row was refused at (c) with `nothing was written.` --
// so a cycle paid for a model call, learned the head is unbuildable, and left no trace for the next
// cycle to read.
//
// THE ID IS THE DRIVER'S. Every assertion below on `p_backlog_id` is the same assertion twice over:
// it is `state.pick.backlog_id`, and it is NOT the id the answer named. That is what holds this
// ledger's re-ordering power at zero -- a manager cannot move the board by declining toward a row it
// prefers, because the row it names never reaches the write.
//
// FIVE ARMS, each able to fail on its own, and NONE of them writes to `runner_skips`. The pure
// function is imported directly (SES-196/SES-218/SES-275: a regression run never mutates the ledger
// it grades), so this file needs no credentials at all and declares no not-run part.
//   (A) the three declines -- `report`, `stop`, and an off-pick `assign` whose `answerErrors` is
//       non-empty -- each yield a skip whose `p_backlog_id` is the pick's and whose `p_reason_kind`
//       is `'other'`.
//   (B) fail closed -- no pick, `--dry-run`, no `--cycle-id` -> `skip: null`, a STATED note, and
//       `declined: true` (the decline is not swallowed by its own ledger).
//   (C) not a decline -- an ON-pick `assign`, a malformed on-pick `assign`, and an unknown action ->
//       `declined: false`, so the (c) return that also carries malformed answers records nothing.
//   (D) the pinned line survives -- an off-pick answer still produces `may not re-order the board`
//       byte-identical inside `answerErrors`, and the id the answer wanted appears only in the
//       reason's prose, never as the recorded id.
//   (E) the reason is the report, trimmed, and a blank report still yields a non-empty reason.
//
// IT WOULD FAIL ON THE UNCHANGED TREE: `declineSkipFor` does not exist there, so the import itself
// yields `undefined` and arm A throws on the first call.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";
import { answerErrors, declineSkipFor } from "../../scripts/run-project.js";

const PICK = "AGT-232";
const OTHER = "ZZQ-999";
const CYCLE = "86eec755-8ab8-4263-894d-e021b9d1d755";
const REORDER_PIN = "may not re-order the board";

// The state the driver built at (b): the pick it read for itself, the queue the lister returned, and
// a roster the off-pick assignment's capability is on -- so the ONLY thing wrong with that answer is
// the row it names, which is what arm A(3) and arm D are about.
function stateWithPick() {
  return {
    project: "dev-manager-capabilities",
    step: 5,
    pick: { backlog_id: PICK },
    queue: [{ ref: PICK }, { ref: OTHER }],
    roster: [{ capability_slug: "build-ticket", engines: ["session", "executor"] }],
    blockers: [],
    regradable: [],
  };
}

const onPick = () => ({
  action: "assign",
  report: "building the head",
  needs_john: [],
  assignment: { backlog_id: PICK, capability_slug: "build-ticket", engine: "session" },
});

const offPick = () => ({
  action: "assign",
  report: "the head cannot be built: its premise names a surface that does not exist yet",
  needs_john: [],
  assignment: { backlog_id: OTHER, capability_slug: "build-ticket", engine: "session" },
});

// ---------------------------------------------------------------------------------------------
// (A) all three declines record a skip, on the DRIVER's id, kind `other`
// ---------------------------------------------------------------------------------------------
function armA() {
  const cases = [
    ["report", { action: "report", report: "the head is unbuildable today", needs_john: [] }],
    ["stop", { action: "stop", report: "nothing on this project is buildable", needs_john: [] }],
    ["off-pick assign", offPick()],
  ];
  for (const [label, answer] of cases) {
    const state = stateWithPick();
    const out = declineSkipFor({ answer, state, cycleId: CYCLE, dryRun: false });
    assert.strictEqual(out.declined, true, `${label}: declineSkipFor did not call it a decline`);
    assert.ok(out.skip, `${label}: no skip was returned -- this decline still buys nothing`);
    assert.strictEqual(out.note, null, `${label}: a recorded skip must carry no note, got ${out.note}`);
    assert.strictEqual(
      out.skip.p_backlog_id,
      state.pick.backlog_id,
      `${label}: the skip names "${out.skip.p_backlog_id}", not the driver's own pick "${state.pick.backlog_id}"`,
    );
    assert.strictEqual(out.skip.p_reason_kind, "other",
      `${label}: reason_kind is "${out.skip.p_reason_kind}"; ck_skip_reason_kind's five named kinds are the board's own structural reasons and this is not one of them`);
    assert.strictEqual(out.skip.p_cycle_id, CYCLE, `${label}: the skip is authored by "${out.skip.p_cycle_id}", not this cycle`);
    assert.ok(String(out.skip.p_reason || "").trim(), `${label}: the skip carries a blank reason -- an unreadable ledger row`);
    // record_skip()'s own identity argument list: exactly these four, and no positional surprises.
    assert.deepStrictEqual(
      Object.keys(out.skip).sort(),
      ["p_backlog_id", "p_cycle_id", "p_reason", "p_reason_kind"],
      `${label}: the payload's keys are not record_skip()'s four named parameters`,
    );
  }
  // THE OFF-PICK CASE, SAID THE OTHER WAY: the id the answer wanted never becomes the recorded id.
  const off = declineSkipFor({ answer: offPick(), state: stateWithPick(), cycleId: CYCLE });
  assert.notStrictEqual(off.skip.p_backlog_id, OTHER,
    `the skip recorded ${OTHER} -- the id the ANSWER named. A manager that can choose the recorded row can re-order the board through the ledger.`);
  console.log(`  [AGT-232] arm A: report, stop and an off-pick assign each record a skip on ${PICK} with reason_kind other; ${OTHER} is never the recorded id.`);
}

// ---------------------------------------------------------------------------------------------
// (B) fail closed -- no pick, --dry-run, no --cycle-id
// ---------------------------------------------------------------------------------------------
function armB() {
  const noPick = declineSkipFor({ answer: { action: "report", report: "r" }, state: { project: "p" }, cycleId: CYCLE });
  const dry = declineSkipFor({ answer: { action: "stop", report: "r" }, state: stateWithPick(), cycleId: CYCLE, dryRun: true });
  const noCycle = declineSkipFor({ answer: { action: "report", report: "r" }, state: stateWithPick() });

  for (const [label, out, needle] of [
    ["no pick", noPick, "no pick"],
    ["--dry-run", dry, "--dry-run"],
    ["no --cycle-id", noCycle, "--cycle-id"],
  ]) {
    assert.strictEqual(out.skip, null, `${label}: a skip was built anyway -- the RPC would fire on a pass that must write nothing`);
    assert.strictEqual(out.declined, true,
      `${label}: declined is ${out.declined}. An unrecordable decline is still the decline the manager made; a false here makes the caller print no line at all and the gap goes invisible.`);
    assert.ok(typeof out.note === "string" && out.note.trim(),
      `${label}: no note was stated, so the caller has nothing to print -- a silent skip-not-recorded`);
    assert.ok(out.note.includes(needle), `${label}: the note does not name why (${needle}): ${out.note}`);
  }
  console.log("  [AGT-232] arm B: no pick / --dry-run / no --cycle-id each return skip null, declined true, and a note naming why.");
}

// ---------------------------------------------------------------------------------------------
// (C) what is NOT a decline -- the (c) return is reached by malformed answers too
// ---------------------------------------------------------------------------------------------
function armC() {
  const state = stateWithPick();

  const good = declineSkipFor({ answer: onPick(), state, cycleId: CYCLE });
  assert.strictEqual(good.declined, false, "an on-pick assign was treated as a decline -- building the head is the opposite of declining it");
  assert.strictEqual(good.skip, null, "an on-pick assign built a skip");

  // Malformed but still ON the pick: an engine off the capability's list. `answerErrors` is non-empty,
  // so this DOES reach the (c) return -- and it must record nothing, because the manager tried to
  // build the head. A skip here would mean the ledger counted a typo as a read of the board.
  const badEngine = onPick();
  badEngine.assignment.engine = "telepathy";
  assert.ok(answerErrors(badEngine, state).length, "control: the malformed on-pick assign was not refused at all, so it never reaches (c)");
  const bad = declineSkipFor({ answer: badEngine, state, cycleId: CYCLE });
  assert.strictEqual(bad.declined, false,
    "a malformed ON-pick assign was recorded as a decline of the head; it named the head, so the head was not declined");
  assert.strictEqual(bad.skip, null, "a malformed on-pick assign built a skip");

  for (const action of ["dance", "", undefined, null]) {
    const out = declineSkipFor({ answer: { action, report: "r" }, state, cycleId: CYCLE });
    assert.strictEqual(out.declined, false, `action ${JSON.stringify(action)} was treated as a decline; only stop, report and an off-pick assign are`);
    assert.strictEqual(out.skip, null, `action ${JSON.stringify(action)} built a skip`);
  }
  // No answer at all, and no arguments at all: neither throws, because the (c) return must be able to
  // call this on anything that got that far.
  assert.strictEqual(declineSkipFor({ answer: null, state, cycleId: CYCLE }).declined, false, "a null answer was called a decline");
  assert.strictEqual(declineSkipFor().declined, false, "a bare call was called a decline");
  console.log("  [AGT-232] arm C: an on-pick assign, a malformed on-pick assign, an unknown action and a null answer all record nothing.");
}

// ---------------------------------------------------------------------------------------------
// (D) the pinned refusal line is byte-identical, and the wanted id stays prose
// ---------------------------------------------------------------------------------------------
function armD() {
  const state = stateWithPick();
  const errors = answerErrors(offPick(), state);
  const expected = `the assignment names "${OTHER}" but the pick path names "${PICK}" -- the manager may not re-order the board`;
  assert.ok(
    errors.includes(expected),
    `the off-pick refusal line changed. ses-378-manager-takes-the-pick.test.mjs:150 and agt-68-devmanager.test.mjs:315,365 pin "${REORDER_PIN}" inside answer_errors.\nExpected: ${expected}\nGot: ${JSON.stringify(errors)}`,
  );
  assert.strictEqual(errors.filter(e => e.includes(REORDER_PIN)).length, 1,
    `"${REORDER_PIN}" appears ${errors.filter(e => e.includes(REORDER_PIN)).length} times; the pins expect exactly one`);

  const out = declineSkipFor({ answer: offPick(), state, cycleId: CYCLE });
  assert.ok(out.skip.p_reason.includes(OTHER),
    `the reason does not carry the id the answer wanted (${OTHER}); the evidence of what the manager asked for is lost`);
  assert.ok(out.skip.p_reason.includes(PICK), `the reason does not name the pick (${PICK}) it was recorded against`);
  console.log(`  [AGT-232] arm D: the "${REORDER_PIN}" line is byte-identical and ${OTHER} appears only in the reason's prose.`);
}

// ---------------------------------------------------------------------------------------------
// (E) the reason is the report, trimmed
// ---------------------------------------------------------------------------------------------
function armE() {
  const state = stateWithPick();
  const spaced = declineSkipFor({ answer: { action: "stop", report: "   the head needs a schema that does not exist  " }, state, cycleId: CYCLE });
  assert.strictEqual(spaced.skip.p_reason, "the head needs a schema that does not exist",
    `the reason is not the report trimmed: ${JSON.stringify(spaced.skip.p_reason)}`);

  for (const report of ["", "   ", undefined]) {
    const out = declineSkipFor({ answer: { action: "report", report }, state, cycleId: CYCLE });
    assert.ok(out.skip, `report ${JSON.stringify(report)}: no skip -- a blank report must not cost the row`);
    assert.ok(String(out.skip.p_reason).trim(), `report ${JSON.stringify(report)}: the reason came out blank, and a blank ledger row tells the next cycle nothing`);
  }
  // A cycle id with surrounding space is still one author, not a second one.
  const padded = declineSkipFor({ answer: { action: "stop", report: "r" }, state, cycleId: `  ${CYCLE}  ` });
  assert.strictEqual(padded.skip.p_cycle_id, CYCLE, "a padded --cycle-id reached record_skip() unpadded");
  console.log("  [AGT-232] arm E: the reason is the report trimmed, a blank report still buys the row, and the author is one trimmed cycle id.");
}

async function run() {
  armA();
  armB();
  armC();
  armD();
  armE();
}

export default run;
selfRun(import.meta.url, run);
