// DeepBench v7.0.937 | tests/regression/agt-431-rescore-door.test.mjs | AGT-431 -- THE GUARD ON THE
// RE-SCORE DOOR: a reopened grade is answerable as a `pass`, and only as a `pass`.
//
// WHAT IT GUARDS. John's ruling `e9b5bfc5` reopened every grade on the executing projects, and the
// list door had no way to carry that: `validateListVerdict()`'s V2 refused a `pass` on a graded
// ticket (correctly -- requirement d.13), so every one of the 21 open/partial tickets of `tooling`
// and `dev-manager-capabilities` was unscorable. The mode this ticket ships turns exactly two things
// off and nothing else, which is what each arm measures.
//
//   A (OFFLINE, zero network). THE MODE AND ITS CONTROL, over one fixture context built by
//     `buildListContext()` itself. The SAME proposal is graded both ways, so the arm reads the
//     DIFFERENCE rather than one half: with `rescore: true` the context carries `rescore` and
//     `rescore_note` and the proposal reads `graded: false`; without it there is no `rescore` key at
//     all and the proposal reads `graded: true`. Then the two verdicts, each paired with the answer
//     the OTHER mode takes -- a rule that refuses everything and a rule that refuses the right thing
//     look identical from one refusal (the LOO-013 lesson): a `pass` is ACCEPTED under rescore and
//     refused `already graded` without it, and a `move` -- the answer a graded ticket would have
//     taken -- is refused `is ungraded` UNDER rescore. That pair is the whole tooth: dropping the
//     `rescore === true ? false :` clause reds the first, and reading `rescore` as "anything goes"
//     reds the second.
//
//   B (NO NETWORK, one child process). THE REPORT'S ARGUMENT GATE. `--rescore-report` with no
//     `--cycle-id` exits 2 -- could not run, never a pass -- and it does so BEFORE `creds()`, which
//     is why this arm needs no credentials and runs everywhere the suite does.
//
// WHY NO LIVE ARM. The report's one write is a `runner_questions` row addressed to John; a guard
// that ran it would ask him a question every suite run and would write a before-image under a cycle
// that did not take the decision (pattern:76). The report's live proof is the kickoff's own QA, run
// once, in the cycle that owns the pass.

import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  buildListContext, validateListVerdict, RESCORE_NOTE, RESCORE_QID,
} from "../../scripts/requirement-check.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(REPO, "scripts", "requirement-check.js");

// The fixture's own names. `ZAGT-` is the reserved regression prefix (SES-382); nothing here reaches
// the database, but a fixture id that could collide with a real ticket is a fixture that reads as one.
const TICKET = "ZAGT-1";
const LIST = "tooling";
const SOURCE = "john:runner_decisions:1";

// ONE ticket, scored and graded, and the only candidate source it could cite is the one it holds.
// Built through `buildListContext()` rather than hand-written: the context's shape is the thing under
// test, and a hand-written object would pass by agreeing with this file instead of with the door.
function context(rescore) {
  return buildListContext({
    project: LIST, epics: ["e1"],
    tickets: [{
      backlog_id: TICKET, title: "the re-score fixture", description: "d", status: "open",
      need_source: SOURCE, need_score: 4, graded: true,
    }],
    candidates: [{ key: SOURCE, head: "John's ruling, as the pool hands it over" }],
    kinds: ["john:runner_decisions"],
    charters: [{ slug: LIST, charter: "A charter, so a fit is answerable at all." }],
    fingerprint: "0".repeat(32),
    parked_homes: [],
    ...(rescore === undefined ? {} : { rescore }),
  });
}

const answer = row => ({
  list: LIST, account: "Scored the one fixture ticket afresh under the severity tree",
  rows: [{ backlog_id: TICKET, ...row }],
});

const PASS = {
  verdict: "pass", need_source: SOURCE, need_score: 3, home: null,
  reason: "the ruling behind it still asks for exactly this, and the severity tree reads it a 3",
};
const MOVE = {
  verdict: "move", home: LIST,
  reason: "the grade stands and this is where it goes",
};

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  // ---- A. THE MODE, AND THE SAME TICKET WITHOUT IT ---------------------------------------------
  await arm("A buildListContext + validateListVerdict: the reopened grade, both ways", async () => {
    const on = context(true);
    const off = context(undefined);

    // (1) THE CONTEXT. Two keys appear, one proposal fact flips, and nothing else moves.
    assert.equal(on.rescore, true, "the rescore context says so in its own key");
    assert.equal(on.rescore_note, RESCORE_NOTE,
      "and it carries the ONE note constant, never a wording of its own (pattern:93)");
    assert.equal(on.proposals[0].graded, false,
      "the proposal reads graded false -- John's ruling reopened the grade, which is what makes a " +
      "pass answerable at all");
    assert.equal(Object.keys(on.proposals[0]).at(-1), "need_source_head",
      "and need_source_head is still the proposal's LAST key -- agt-487 pins it there, so this " +
      "mode added nothing to the proposal");

    // (2) THE CONTROL. Absent, not false: an ordinary run of this door is byte-unchanged.
    assert.equal(Object.prototype.hasOwnProperty.call(off, "rescore"), false,
      `an ordinary context carries NO rescore key at all; got ${JSON.stringify(off.rescore)}`);
    assert.equal(Object.prototype.hasOwnProperty.call(off, "rescore_note"), false,
      "and no rescore_note either");
    assert.equal(off.proposals[0].graded, true,
      "and the SAME ticket reads graded true there -- the fact itself did not change, only this " +
      "one context's reading of it (her rows are untouched)");

    // (3) THE PASS: accepted under rescore, refused as `already graded` without it. The same answer
    //     against the same ticket in both modes -- the difference is the mode, nothing else.
    const passOn = validateListVerdict(answer(PASS), on);
    assert.deepEqual(passOn.refusals, [],
      `a pass under rescore must raise NO refusal; got ${JSON.stringify(passOn.refusals)}`);
    assert.equal(passOn.ok, true, "and the answer as a whole is accepted");

    const passOff = validateListVerdict(answer(PASS), off);
    assert.equal(passOff.ok, false, "the SAME pass is refused without the mode");
    assert.ok(passOff.refusals.some(r => r.startsWith(`${TICKET}:`) && /is already graded/.test(r)),
      `refused by V2's own sentence, naming the ticket; got ${JSON.stringify(passOff.refusals)}`);

    // (4) AND THE MOVE, THE OTHER WAY ROUND. A reopened grade is not a grade to place: V3 refuses
    //     the answer a graded ticket WOULD have taken. This is the half a mode that merely waved
    //     the rules through would fail.
    const moveOn = validateListVerdict(answer(MOVE), on);
    assert.equal(moveOn.ok, false, "a move under rescore is refused -- there is no standing grade to place");
    assert.ok(moveOn.refusals.some(r => r.startsWith(`${TICKET}:`) && /is ungraded/.test(r)),
      `refused by V3's own sentence, naming the ticket; got ${JSON.stringify(moveOn.refusals)}`);

    const moveOff = validateListVerdict(answer(MOVE), off);
    assert.deepEqual(moveOff.refusals, [],
      `and that same move is ACCEPTED without the mode -- the refusal above is the mode's, not the ` +
      `move's; got ${JSON.stringify(moveOff.refusals)}`);
    console.log(`    [AGT-431 arm A] rescore on: pass ok, move refused (is ungraded); off: pass ` +
      `refused (is already graded), move ok; note ${RESCORE_NOTE.length} chars, qid ${RESCORE_QID}`);
  });

  // ---- B. THE REPORT'S ARGUMENT GATE, before any credential read -------------------------------
  await arm("B --rescore-report with no --cycle-id exits 2", async () => {
    const r = spawnSync(process.execPath, [CLI, "--rescore-report"], {
      encoding: "utf8", env: process.env, timeout: 180000, maxBuffer: 16 * 1024 * 1024,
    });
    assert.equal(r.status, 2,
      "--rescore-report with no --cycle-id exits 2 (could not run, never a pass); got " +
      `${r.status} stdout=${String(r.stdout).slice(0, 400)} stderr=${String(r.stderr).slice(0, 400)}`);
    assert.ok(/--cycle-id=<uuid> is required/.test(String(r.stderr)),
      `and it says which argument is missing; got ${JSON.stringify(String(r.stderr).slice(0, 300))}`);
    assert.equal(String(r.stdout), "",
      `and prints NOTHING on stdout -- stdout is the question; got ${JSON.stringify(String(r.stdout).slice(0, 200))}`);
    console.log(`    [AGT-431 arm B] exit 2, stderr names --cycle-id, stdout empty`);
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
