// DeepBench v7.0.395 | tests/regression/ses-286b-decision-runbooks.test.mjs | SES-286 (b)
//
// FEATURE: SES-286 (b) -- guards the four CALL SITES that turn the decision ledger from a schema
// into a mechanism: runner-cycle.md's 7b block, its step-5 partial-remainder bullet, its step-8c
// M6-03 removal, its step-9 serial-tail sweep, and session-setup.md's attended path (3d, the step-4
// sweep, the reversal section).
//
// WHAT THE DEFECT WAS, so a later editor does not "tidy" any of these sites away as duplication:
// part (a) (v7.0.394) shipped public.runner_decisions, runner_settings.reversal_window_hours,
// runner_before_images.decision_id and SIX functions -- and NOTHING CALLED THEM. Measured by grep
// on this worktree at this ship, not recalled: `record_decision`, `sweep_decision_windows` and
// `reverse_decision` each occurred ZERO times in docs/runbooks/runner-cycle.md and ZERO times in
// docs/runbooks/session-setup.md. Every M6-* rule marked `script` was therefore still prose: the
// runbook's own remainder bullet told a cycle to "record the reasoning on the ticket", which has no
// id, no expiry and no ladder effect. A rule marked `script` that no script runs.
//
// WHY THE ORDERING CLAUSE IS AN ASSERTION AND NOT A COMMENT. The sweep sits in the serial tail
// between (7) and the chain-gate step (8). Below (8) it would never run on the cycle that
// TERMINATES a chain -- precisely the cycle that may be the last one for hours -- so a window that
// expired during that cycle would wait for a cron that may be off. That is a property of ORDER, and
// order is the one thing prose cannot hold down on its own, so clause 2 asserts the index.
//
// WHY THE VOCABULARY CLAUSE EXISTS. `needs-john` is retired as a blocking state (M6-01), and 7b is
// the block a cycle reads at the moment it is deciding whether to escalate. One retired token in
// live voice there would reintroduce the state the whole ticket family removed, so the block is
// asserted free of it in any voice -- the boundary is stated as no card, no escalation, no waiting.
//
// EVERY CLAUSE CARRIES ITS OWN MUTATION, and a meta-assertion checks the mutations themselves: a
// control that changes nothing proves nothing (the SES-158 lesson), and "would this still pass if
// the change did nothing?" must answer no for each clause independently.
//
// DRY-RUN AGAINST UNCHANGED SOURCE, recorded because a guard written after the change is worthless
// unless it would have failed before it: all eight content clauses FAIL on origin/dev's copies of
// both runbooks -- none of the strings existed there.
//
// Invocation: node tests/regression/ses-286b-decision-runbooks.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CYCLE = "docs/runbooks/runner-cycle.md";
const SETUP = "docs/runbooks/session-setup.md";

// CRLF is normalised on read for one reason, stated so nobody "simplifies" it away: this repo
// checks out CRLF on Windows and LF in CI, and an index or substring test that disagrees between
// the two is a false green on one of them.
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

// ---------------------------------------------------------------------------
// Slicers. Each one is anchored on text the edit itself owns, so a clause can never pass on a
// string that happens to appear somewhere else in a 3,600-line runbook.
// ---------------------------------------------------------------------------

const BLOCK_7B_START = "**7b. Every decision is a row with a handle";
const BLOCK_7B_END = "## Phase 3 — evidence";
const TAIL_START = "**THE SERIAL TAIL (register B42)";
const CHAIN_GATE = "**(8) A DRAINING CYCLE";
const REMAINDER_BULLET = "- **(b) the remainder awaits a decision**";
const STEP_8C_START = "**8c. Background revalidation sweep";
const STEP_8D_START = "**8d. Milestone gate-review sweep";

function slice(text, start, end) {
  const a = text.indexOf(start);
  if (a < 0) return null;
  const b = end ? text.indexOf(end, a) : -1;
  return text.slice(a, b < 0 ? text.length : b);
}

const block7b = s => slice(s, BLOCK_7B_START, BLOCK_7B_END);
const serialTail = s => slice(s, TAIL_START, null);
const step8c = s => slice(s, STEP_8C_START, STEP_8D_START);
const remainderBullet = s => {
  const a = s.indexOf(REMAINDER_BULLET);
  if (a < 0) return null;
  const b = s.indexOf("\n", a);
  return s.slice(a, b < 0 ? s.length : b);
};

// The sweep call, exactly as the runbook writes it -- held here so clause 2's mutation MOVES the
// real line rather than inserting a lookalike the assertion would then grade instead.
const SWEEP_CALL = "SELECT * FROM public.sweep_decision_windows('<your cycle id>', NULL);";

// ---------------------------------------------------------------------------
// The clauses
// ---------------------------------------------------------------------------

// Exported so the ship's dry-run could grade each clause INDEPENDENTLY against origin/dev's copies
// (an assert-and-stop run only ever proves the first one failed), and so a later reader can do the
// same without editing this file.
export const CLAUSES = [
  {
    id: "7b-block-names-record_decision-and-decision_id",
    file: CYCLE,
    test: s => {
      const b = block7b(s);
      return !!b && b.includes("record_decision(") && b.includes("decision_id");
    },
    breaks: [
      s => s.split("record_decision(").join("recordTheReasoning("),
      s => s.split("decision_id").join("decision_ref"),
    ],
    detail:
      "7b is the ONE home for the decision call and for the rule that every before-image the write " +
      "produces carries decision_id. Without both names in that block the ledger has no caller and " +
      "the images name no decision, which is the state part (a) shipped into.",
  },
  {
    id: "7b-block-shows-the-single-transaction",
    file: CYCLE,
    test: s => {
      const b = block7b(s);
      return !!b && /```sql\nDO \$\$/.test(b) && b.includes("runner_before_images");
    },
    breaks: [
      s => s.split("```sql\nDO $$").join("```sql\n-- run each of these in turn"),
      s => s.split("runner_before_images").join("the images table"),
    ],
    detail:
      "the transaction is the mechanism, not the presentation: now() is frozen per transaction, so " +
      "the image's created_at and the row's updated_at come out equal. Split into two statements " +
      "and reverse_decision() refuses the row as written-since, restores nothing, and STILL returns " +
      "outcome = 'applied' -- a decision that is silently un-undoable. A 7b that shows two loose " +
      "statements teaches exactly that failure.",
  },
  {
    id: "serial-tail-sweeps-before-the-chain-gate",
    file: CYCLE,
    test: s => {
      const tail = serialTail(s);
      if (!tail) return false;
      const sweep = tail.indexOf("sweep_decision_windows(");
      const gate = tail.indexOf(CHAIN_GATE);
      return sweep >= 0 && gate >= 0 && sweep < gate;
    },
    breaks: [
      s => s.split(SWEEP_CALL).join("-- (the sweep used to be written here)")
             .replace(CHAIN_GATE, `${CHAIN_GATE}\n\n${SWEEP_CALL}`),
    ],
    detail:
      "(8) is where the session ENDS. A sweep written below it never runs on the cycle that " +
      "terminates a chain -- the cycle most likely to be the last one for hours -- so a window that " +
      "expired while that cycle ran waits for a cron that may be off. The order is the guarantee.",
  },
  {
    id: "remainder-bullet-cites-7b",
    file: CYCLE,
    test: s => {
      const b = remainderBullet(s);
      return !!b && b.includes("7b");
    },
    breaks: [
      s => s.split("as a decision row per 7b").join("as a decision row per the ticket"),
    ],
    detail:
      "this bullet is the single most-read decision site in the runbook, and it used to say " +
      "\"record the reasoning on the ticket\" -- reasoning with no id, no expiry and no ladder " +
      "effect. Citing 7b is what turns it into a handle.",
  },
  {
    id: "step-8c-removal-is-a-decision-row",
    file: CYCLE,
    test: s => {
      const b = step8c(s);
      return !!b && b.includes("M6-03") && (b.includes("record_decision") || b.includes("7b"));
    },
    breaks: [
      s => s.split("Record it per **7b** — one `public.record_decision()` call")
             .join("Write the status and move on"),
    ],
    detail:
      "M6-03 removes a ticket whose premise failed revalidation twice, unattended. The reversal " +
      "window is the only thing that makes acting on the second failure safe, and the window " +
      "exists only if the removal was recorded as a decision -- otherwise it is an unattended " +
      "removal with no handle, which is what B7's Accept card existed to prevent.",
  },
  {
    id: "session-setup-names-record_decision",
    file: SETUP,
    test: s => s.includes("record_decision("),
    breaks: [s => s.split("record_decision(").join("recordTheReasoning(")],
    detail:
      "the attended path makes judgment writes too -- the SES-184/SES-185 gate decisions and the " +
      "SES-82 de-scoping were all attended. A cycle-only mechanism leaves those with no handle.",
  },
  {
    id: "session-setup-sweeps-at-close-out",
    file: SETUP,
    test: s => s.includes("sweep_decision_windows("),
    breaks: [s => s.split("sweep_decision_windows(").join("closeTheWindows(")],
    detail:
      "every attended close-out sweeps, so a window never waits for a cron that may be off. This " +
      "is the redundancy that makes 'silence is assent' true rather than aspirational.",
  },
  {
    id: "session-setup-carries-the-reversal-handle",
    file: SETUP,
    test: s => s.includes("reverse_decision("),
    breaks: [s => s.split("reverse_decision(").join("undoDecision(")],
    detail:
      "M6-06 promises a recorded reversal handle. If the one line John types is written down " +
      "nowhere, the promise is a claim about a function nobody can find.",
  },
  {
    id: "7b-block-carries-no-retired-blocking-state",
    file: CYCLE,
    test: s => {
      const b = block7b(s);
      return !!b && !b.includes("needs-john");
    },
    breaks: [
      s => s.split("no `runner_items` card, no escalation, no waiting")
             .join("no `runner_items` card, no `needs-john`, no waiting"),
    ],
    detail:
      "`needs-john` is retired as a blocking state (M6-01), and 7b is what a cycle reads at the " +
      "exact moment it is deciding whether to escalate. One occurrence there, in any voice, " +
      "reintroduces the state this ticket family removed.",
  },
];

async function run() {
  const results = [];

  for (const c of CLAUSES) {
    const s = read(c.file);
    assert.ok(c.test(s), `${c.file} lost clause "${c.id}": ${c.detail}`);

    assert.ok(c.breaks.length > 0, `clause "${c.id}" carries no control -- an unguarded clause is a claim`);
    c.breaks.forEach((mutate, i) => {
      const mutated = mutate(s);
      // The SES-158 meta-assertion, and it is checked BEFORE the control itself: a mutation that
      // changed nothing would make the line below pass for the wrong reason forever.
      assert.notStrictEqual(mutated, s,
        `control ${i + 1} for "${c.id}" changed nothing -- it is grading the unmutated file`);
      assert.ok(!c.test(mutated),
        `control ${i + 1} for "${c.id}" still passes after its own mutation -- the clause is not testing what it says`);
    });

    results.push(c.id);
  }

  // The four sites are asserted above by content; this holds down the COUNTS the ship's own
  // checklist names, so a later editor cannot satisfy a clause by adding a second, drifting copy of
  // the call in a place nothing points at.
  const cycle = read(CYCLE);
  assert.strictEqual((cycle.match(/sweep_decision_windows\(/g) || []).length, 1,
    "runner-cycle.md must name sweep_decision_windows( EXACTLY once -- the serial tail's (7b) call. " +
    "A second copy is a second home for an executable procedure, and one of the two then drifts.");
  assert.ok((cycle.match(/record_decision\(/g) || []).length >= 2,
    "runner-cycle.md must name record_decision( at least twice -- 7b's call and the prose that " +
    "explains its attribution constraint. One occurrence means the block shows a call it never explains.");
  results.push("call-site-counts-hold");

  notRun(
    "the BEHAVIOUR of record_decision / sweep_decision_windows / reverse_decision",
    "this file guards the CALL SITES, deliberately and permanently. Those three functions insert " +
    "the decision ledger, move runner_ladder and replay rows, so a permanent regression test must " +
    "never invoke them against the live board. Their signatures, grants and purity are guarded by " +
    "tests/regression/ses-286a-reversal-window.test.mjs; their behaviour was measured at part (a)'s " +
    "ship inside rolled-back DO blocks. Read live at THIS ship instead of recalled, and the reason " +
    "clause 2 of this file exists: reverse_decision() refuses any row whose live updated_at is " +
    "later than the image it would restore from, and it restores a surviving row IN PLACE with an " +
    "UPDATE, inserting only where the row is absent.");

  return results;
}

selfRun(import.meta.url, run);
export default run;
