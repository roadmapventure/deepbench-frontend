// DeepBench v7.0.497 | tests/regression/SES-401-drained-board-declaration.js | SES-401
//
// FEATURE: SES-401 -- an empty or all-claimed pick lane is DECLARED, not failed, and `starved`
// still fails. This file guards the discrimination itself.
//
// THE DEFECT IT GUARDS AGAINST COMING BACK, measured live 2026-09-15 rather than recalled. Five
// regression guards each carried their own `lane.length > 0` clause. Emulating a DRAINED board --
// the `board` row kept, every lane row dropped, nothing else changed -- put all five red at once:
// ses-281 at 365, ses-321 at 249, ses-340 at 126, ses-353 at 174, and SES-135 through the builder's
// own (correct) refusal at scripts/build-briefing.mjs:541. So finishing the executing project would
// have blocked every verdict the cycle needs to ship.
//
// WHY THE GUARD IS PURE AND CREDENTIAL-FREE, which is the whole point of it. The bug was that five
// guards graded LIVE BOARD STATE. A sixth guard that also read the board could go red on a day
// nobody changed a line -- the exact failure ses-386-board-not-gate.test.mjs was written to stop.
// Everything below drives the real `classifyBoard()` over FIXTURES, in process, over no network.
//
// FOUR STATES, AND EACH ONE CARRIES A NEGATIVE CONTROL. A fixture that classifies correctly proves
// nothing on its own: a `classifyBoard()` that returned a constant would satisfy one clause per
// state just as happily. So every fixture is paired with a mutation of the ONE input that should
// decide it, and the classification must MOVE. The pairwise-distinctness clause is the other half:
// four states that collapsed to two would still satisfy every individual assertion.
//
// THE WRONG-KEY CONTROL IS THE TICKET'S CENTRAL MEASUREMENT. SES-386 already shipped an empty-lane
// handler, and it was dead from the first run: it tested a set of `runner_cycles.id` (uuid) for
// membership of `backlog_items.claimed_by`, which is `text` holding a session label such as
// `run-project:moat-support:1`. Live that day: 3 claimed tickets, 2 live cycles, ZERO matches. The
// fixture below is the shape of that real board, and the clause asserts BOTH directions -- the
// `item_id` join finds the held ticket, the `claimed_by` join finds nothing, and classifying on the
// second answer yields `starved` where the truth is `held`. That is a measurement of why the old
// handler never fired, not a description of it.
//
// A NAMED BOUNDARY, declared rather than left to be discovered: a lane emptied solely because an
// unresolved `M_ design gate%` ticket withholds its milestone's members classifies `starved` and
// still fails. Telling that apart would mean re-deriving a shipped SQL predicate in JS -- a second
// implementation agreeing with itself (SES-45). Recorded as residue in docs/harvests/SES-401.md.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { selfRun } from "./_lib/self-run.js";
import {
  BOARD_STATES,
  classifyBoard,
  boardReason,
  heldOnItemId,
  heldOnClaimedBy,
  isDeclarable,
} from "./_lib/board-state.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// The five guards SES-401 retargeted. Named, never globbed -- a glob silently stops covering a file
// that was renamed, and "the lint found nothing" looks identical to "the lint found no problem"
// (the ses-386 rule, applied to this ship's own five sites).
export const RETARGETED_GUARDS = [
  "tests/regression/ses-281-m5-pick-enforcement.test.mjs",
  "tests/regression/ses-321-enhancement-fence.test.mjs",
  "tests/regression/ses-340-projects-govern.test.mjs",
  "tests/regression/ses-353-standing-decisions.test.mjs",
  "tests/regression/SES-135-briefing-render.js",
];

// ---------------------------------------------------------------------------
// (i) the four states, each with its own negative control
// ---------------------------------------------------------------------------

// Each case: the fixture, the state it must produce, and a MUTATION of the single input that should
// decide it together with the state that mutation must produce instead. `expect !== control.expect`
// is asserted below, so a control that does not move the answer is itself a failure.
const CASES = [
  {
    state: "servable",
    why: "the lane returned rows; nothing else can change that answer",
    fixture: { laneRows: [{ ref: "SES-400" }, { ref: "SES-364" }], executingOpen: 8, heldByLive: 1 },
    control: {
      what: "drop the lane rows and nothing else",
      fixture: { laneRows: [], executingOpen: 8, heldByLive: 1 },
      expect: "held",
    },
  },
  {
    state: "held",
    why: "the lane is empty and a LIVE cycle holds an in-scope ticket -- B42's atomic claims working",
    fixture: { laneRows: [], executingOpen: 3, heldByLive: 1 },
    control: {
      what: "the holding cycle ends, so nothing is held any more",
      fixture: { laneRows: [], executingOpen: 3, heldByLive: 0 },
      expect: "starved",
    },
  },
  {
    state: "drained",
    why: "the lane is empty and the executing project has no open queued work left -- it finished",
    fixture: { laneRows: [], executingOpen: 0, heldByLive: 0 },
    control: {
      what: "one open queued ticket remains in the executing project",
      fixture: { laneRows: [], executingOpen: 1, heldByLive: 0 },
      expect: "starved",
    },
  },
  {
    state: "starved",
    why:
      "the lane is empty, work REMAINS and nothing holds it -- no project is executing or the " +
      "fence broke, which is the finding it always was and the one state that must still fail",
    fixture: { laneRows: [], executingOpen: 5, heldByLive: 0 },
    control: {
      what: "the remaining work is picked up by a live cycle",
      fixture: { laneRows: [], executingOpen: 5, heldByLive: 2 },
      expect: "held",
    },
  },
];

function everyStateIsReachedAndEveryControlMovesIt() {
  for (const c of CASES) {
    assert.strictEqual(
      classifyBoard(c.fixture),
      c.state,
      `the ${c.state} fixture did not classify ${c.state}: ${c.why}`,
    );

    // THE CONTROL (SES-158): it must actually change an input, and it must change the answer.
    assert.notDeepStrictEqual(
      c.control.fixture,
      c.fixture,
      `the control for '${c.state}' changed NOTHING -- it cannot prove the clause has teeth`,
    );
    assert.notStrictEqual(
      c.control.expect,
      c.state,
      `the control for '${c.state}' expects the same state back, so it is not a control at all`,
    );
    assert.strictEqual(
      classifyBoard(c.control.fixture),
      c.control.expect,
      `control for '${c.state}' (${c.control.what}) must classify '${c.control.expect}'`,
    );
  }

  // PAIRWISE DISTINCT. Four clauses that each pass individually are still satisfied by an
  // implementation that collapsed two states into one, and the collapse that matters is
  // starved -> drained: it would turn a real finding green and nothing above would notice.
  const produced = CASES.map(c => classifyBoard(c.fixture));
  assert.strictEqual(
    new Set(produced).size,
    CASES.length,
    `the four fixtures produced only ${new Set(produced).size} distinct state(s): ${produced.join(", ")}`,
  );
  assert.deepStrictEqual(
    [...produced].sort(),
    [...BOARD_STATES].sort(),
    "the fixtures must cover every state BOARD_STATES declares -- a state with no fixture is a " +
      "branch no control can reach",
  );

  console.log(`  (i) four states reached (${produced.join(", ")}), each control moves the answer -- PASS`);
}

// ONLY `starved` FAILS. This is the anti-gutting clause: a change that declared every empty lane
// not-run would satisfy every assertion above and still destroy the guard.
function onlyStarvedStillFails() {
  assert.strictEqual(isDeclarable("held"), true, "a held board must be declarable");
  assert.strictEqual(isDeclarable("drained"), true, "a drained board must be declarable");
  assert.strictEqual(
    isDeclarable("starved"),
    false,
    "a STARVED board must NOT be declarable -- unheld in-scope work that serves nothing means no " +
      "project is executing or the fence broke, and declaring that not-run is the gutting this " +
      "whole ticket exists to avoid",
  );
  assert.strictEqual(
    isDeclarable("servable"),
    false,
    "a servable board must not be declarable -- its assertions run exactly as they did before",
  );
  console.log("  (ii) held/drained declarable, starved and servable not -- PASS");
}

// ---------------------------------------------------------------------------
// (iii) THE WRONG-KEY CONTROL -- why SES-386's handler never fired
// ---------------------------------------------------------------------------

// The shape of the real board on 2026-09-15: `claimed_by` carries a SESSION LABEL, `runner_cycles`
// carries a uuid `id` and the ticket it is building in `item_id`.
const TICKETS = [
  { backlog_id: "SES-401", claimed_by: "run-project:moat-support:1", status: "open", queue: 1 },
  { backlog_id: "SES-400", claimed_by: null, status: "open", queue: 2 },
  { backlog_id: "SES-399", claimed_by: null, status: "open", queue: 4 },
];
const LIVE_CYCLES = [
  { id: "0535feab-37fc-41ee-afb4-3d8ef479db93", item_id: "SES-401" },
  { id: "3a456cd8-2939-4f6b-993a-92f9d6429150", item_id: "MOB-22" },
];

function theItemIdJoinFindsWhatTheClaimedByJoinCannot() {
  const right = heldOnItemId(TICKETS, LIVE_CYCLES);
  const wrong = heldOnClaimedBy(TICKETS, LIVE_CYCLES);

  assert.deepStrictEqual(
    right.map(t => t.backlog_id),
    ["SES-401"],
    "runner_cycles.item_id = backlog_items.backlog_id must find the ticket the live cycle holds",
  );
  assert.deepStrictEqual(
    wrong.map(t => t.backlog_id),
    [],
    "the SES-386 join must be shown to find NOTHING -- if this ever returns a row the fixture has " +
      "stopped representing the live board (claimed_by is text holding a session label; " +
      "runner_cycles.id is a uuid) and the measurement below proves nothing",
  );

  // AND THE CONSEQUENCE, which is the part that matters: the same board classifies differently
  // depending on which key was joined, and the wrong key turns a HELD board into a FAILING one.
  const lane = [];
  const truth = classifyBoard({ laneRows: lane, executingOpen: TICKETS.length, heldByLive: right.length });
  const asShipped386 = classifyBoard({ laneRows: lane, executingOpen: TICKETS.length, heldByLive: wrong.length });
  assert.strictEqual(truth, "held", "joined on item_id, this board is HELD");
  assert.strictEqual(
    asShipped386,
    "starved",
    "joined on claimed_by, the same board reads STARVED -- which is why SES-386's empty-lane " +
      "handler never once fired and every empty lane reached the assert",
  );
  assert.notStrictEqual(truth, asShipped386, "the two joins must disagree, or this control is vacuous");

  console.log(
    `  (iii) wrong-key control: item_id join -> ${right.length} held (${truth}); ` +
      `claimed_by join -> ${wrong.length} held (${asShipped386}) -- PASS`,
  );
}

// ---------------------------------------------------------------------------
// (iv) a read that failed must never be classified as `drained`
// ---------------------------------------------------------------------------

// `drained` is the state that turns assertions off, so the input that produces it is the one an
// error must never be coerced into. A REST read that came back null/undefined would count as 0 in
// any implementation that reached for `?.length ?? 0`, and the board would report itself finished.
function abadReadThrowsInsteadOfReportingDrained() {
  for (const bad of [null, undefined, "0", {}, -1, NaN]) {
    assert.throws(
      () => classifyBoard({ laneRows: [], executingOpen: bad, heldByLive: 0 }),
      /must be an array or a non-negative number/,
      `classifyBoard accepted executingOpen=${String(bad)} instead of throwing -- a failed read ` +
        "must never be silently classified 'drained'",
    );
  }
  // ...and the well-formed call it is being compared against must still work, or the clause above
  // would pass just as happily against a classifyBoard() that threw on everything.
  assert.strictEqual(classifyBoard({ laneRows: [], executingOpen: 0, heldByLive: 0 }), "drained");

  // heldByLive is a SUBSET of executingOpen; a pair that says otherwise is two populations joined
  // by mistake, and it must be reported rather than classified.
  assert.throws(
    () => classifyBoard({ laneRows: [], executingOpen: 1, heldByLive: 2 }),
    /exceeds executingOpen/,
    "heldByLive > executingOpen must be reported, not classified",
  );

  console.log("  (iv) malformed counts throw; 'drained' cannot be manufactured from a failed read -- PASS");
}

// ---------------------------------------------------------------------------
// (v) the reason string names the counts, and names them differently per state
// ---------------------------------------------------------------------------

function everyReasonNamesItsCounts() {
  const facts = { lane: 0, executingOpen: 7, heldByLive: 2, liveCycles: 3, heldRefs: ["SES-401", "MOB-22"] };
  const rendered = BOARD_STATES.map(s => boardReason(s, { ...facts, lane: s === "servable" ? 4 : 0 }));
  for (const [i, text] of rendered.entries()) {
    assert.ok(
      text.includes(String(BOARD_STATES[i]).toUpperCase()),
      `boardReason('${BOARD_STATES[i]}') does not name the state it is reporting`,
    );
    assert.ok(
      /\d+ open\/partial queued ticket\(s\)/.test(text) && /\d+ of them are held/.test(text),
      `boardReason('${BOARD_STATES[i]}') must NAME the counts -- a reader who cannot tell drained ` +
        "from held without re-running the read has been told nothing",
    );
  }
  assert.strictEqual(
    new Set(rendered).size,
    BOARD_STATES.length,
    "two states rendered the same reason -- 'the board finished' and 'a cycle holds it' are " +
      "different facts and a message that blurs them is the original defect wearing a hat",
  );
  assert.ok(
    rendered[BOARD_STATES.indexOf("held")].includes("SES-401"),
    "the held reason must print the refs being held -- a count with no handle is not actionable",
  );
  assert.throws(() => boardReason("nonsense", facts), /unknown state/,
    "an unknown state must be reported rather than rendered as prose");

  console.log("  (v) all four reasons name their counts and are pairwise distinct -- PASS");
}

// ---------------------------------------------------------------------------
// (vi) the lint -- the five retargeted guards actually reach the shared home
// ---------------------------------------------------------------------------

function everyRetargetedGuardImportsTheOneHome() {
  for (const rel of RETARGETED_GUARDS) {
    const abs = path.join(ROOT, rel);
    assert.ok(
      fs.existsSync(abs),
      `${rel} is missing -- a retarget that deleted the guard is the one thing STANDARDS.md ` +
        "Section 4 clause 1 forbids",
    );
    const src = fs.readFileSync(abs, "utf8");
    assert.ok(
      /_lib\/board-state\.js/.test(src),
      `${rel} no longer imports tests/regression/_lib/board-state.js. Its empty-lane clause has ` +
        "gone back to grading the board by hand, which is the copy-propagation _lib/self-run.js " +
        "already recorded (SES-207: five named sites, seven live) and the reason this module has " +
        "exactly one home.",
    );
    assert.ok(
      /isDeclarable\(/.test(src),
      `${rel} imports board-state.js but never calls isDeclarable() -- the pair of states that may ` +
        "be declared must not be re-spelled per file",
    );
  }

  // NEGATIVE CONTROL: the needles must be able to match, or a typo reports a clean sweep.
  const canary = "import { readBoardState, isDeclarable } from \"./_lib/board-state.js\";";
  assert.ok(/_lib\/board-state\.js/.test(canary) && /isDeclarable\(/.test(canary + " isDeclarable("),
    "the lint's own needles must be able to MATCH something");

  console.log(`  (vi) lint: ${RETARGETED_GUARDS.length} retargeted guards all reach _lib/board-state.js -- PASS`);
}

async function run() {
  everyStateIsReachedAndEveryControlMovesIt();
  onlyStarvedStillFails();
  theItemIdJoinFindsWhatTheClaimedByJoinCannot();
  abadReadThrowsInsteadOfReportingDrained();
  everyReasonNamesItsCounts();
  everyRetargetedGuardImportsTheOneHome();
}

selfRun(import.meta.url, run);
export default run;
