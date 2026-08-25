// DeepBench v7.0.252 | tests/regression/SES-196-drain-pick-flags.js | SES-196
//
// Guards the SES-196 ruling inside tail (8) of docs/runbooks/runner-cycle.md -- John overruling
// the prohibition that same step used to state, and moving the `design_status` flag clause into
// `drain_epic_next()`'s own PICK predicate (migration `ses196_drain_pick_skips_flagged`).
//
// THE RULE IS READ OUT OF THE RUNBOOK, never restated here (John's rule 2026-08-23, "you should
// never be throwing away tests"; the DIR-603f44ea / SES-176 / SES-158 / SES-194 precedent). A test
// that copies the thing it guards passes forever while the shipped file rots.
//
// EVERY ASSERTION IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that
// should matter removed. "Would this still pass if the check did nothing?" must answer "no" for
// every clause. There is also a meta-assertion (aVacuousMutationFailsItsOwnControl), same as
// SES-197's file, because SES-158 shipped a control that changed nothing and only checking the
// control itself caught it.
//
// FILE-LEVEL NEGATIVE CONTROL, reported honestly rather than rounded up: run against the
// PRE-CHANGE runbook (git show origin/dev:docs/runbooks/runner-cycle.md), **all 6 of these
// clauses fail, and all 6 pass on the shipped one** -- every sentence pinned here is new to this
// ship, measured 2026-08-25.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied: the function BODY ships as
// migration ses196_drain_pick_skips_flagged and lives in the database, not this repo, and this
// suite reaches Supabase only over PostgREST -- which cannot read pg_get_functiondef and could
// reach the function only by INVOKING it, which calls drain_epic_next and can RETIRE a live drain
// directive. Behavioural evidence is the live QA recorded on the ship card.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");

const TAIL8_START = "**(8) A DRAINING CYCLE CONTINUES THE DRAIN IN-SESSION";
const TAIL8_END = "**THE SESSION-SPAWNING ACTUATORS ARE RETIRED";

// Pure: slice a bounded block out of the runbook. Returns "" when absent -- itself a finding
// rather than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

export const extractTail8 = md => extractBlock(md, TAIL8_START, TAIL8_END);

// Markdown is hard-wrapped at ~95 columns, so a load-bearing phrase can straddle a line break and
// a literal match fails for a reason that has nothing to do with the rule. Normalising runs of
// whitespace to one space makes every clause reflow-proof (the SES-194 lesson).
export const norm = s => s.replace(/\s+/g, " ");

// Pure: the load-bearing clauses, kept as data so a negative control can name exactly which one it
// removed. A clause earns its place only if REMOVING it would change what a cycle does.
export const CLAUSES = [
  {
    id: "picker-skips-the-three-flags",
    detail:
      "the block must state the design_status clause now lives in drain_epic_next's PICK " +
      "predicate AND name all three flags needs-john, needs-desktop, john-paced -- without this " +
      "the reader does not know the picker itself changed, only that Gate C exists",
    test: s =>
      /clause now lives in `?drain_epic_next\(\)`?'?s? PICK predicate/i.test(s) &&
      ["needs-john", "needs-desktop", "john-paced"].every(f => s.includes(f)),
    breaks: s =>
      s.replace(
        /clause now lives in `drain_epic_next\(\)`'s PICK predicate/,
        "clause stays outside drain_epic_next entirely",
      ),
  },
  {
    id: "retirement-predicate-untouched",
    detail:
      "the block must state the flags are in the pick predicate ONLY, that adding them to the " +
      "RETIREMENT predicate would close John's standing directive on the runner's own say-so, " +
      "and must cite SES-142 -- the trap: without this the next editor collapses the two predicates",
    test: s =>
      /predicate ONLY/.test(s) &&
      /\*\*retirement\*\* predicate/i.test(s) &&
      /closes John's standing directive on the runner's own say-so/i.test(s) &&
      /SES-142/.test(s),
    breaks: s => s.replace(/predicate ONLY/, "predicate too"),
  },
  {
    id: "designed-is-not-a-flag",
    detail:
      "the block must state 'designed' is NOT one of the flags and give the reason (step 5's " +
      "table calls it not a skip / step 6's fast path) -- a literal 'design_status is non-null' " +
      "reading would skip the best picks",
    test: s =>
      /'designed'.{0,6}is NOT a flag/i.test(s) &&
      /explicitly not a skip/i.test(s) &&
      /step 6/i.test(s) &&
      /fast path/i.test(s),
    breaks: s => s.replace(/is NOT a flag/, "is also a flag"),
  },
  {
    id: "section-10-signal-was-measured",
    detail:
      "the block must state that the flagged members already carry UNRESOLVED runner_skips rows " +
      "and name at least one measured ticket id (SES-191) with its flag -- an unmeasured version " +
      "of this claim is an argument, not evidence",
    test: s =>
      /unresolved.{0,3}`?runner_skips`?.{0,3}row/i.test(s) &&
      /SES-191.{0,20}needs-desktop/.test(s),
    breaks: s => s.replace(/\*\*unresolved\*\*/, "**already-cleared**"),
  },
  {
    id: "johns-word-is-the-authority",
    detail:
      "the block must attribute the reversal to John by directive id 5dc62981 and carry his " +
      "verbatim line 'i don't want the system to stop' -- a rule that reversed a written " +
      "prohibition must name whose word did it",
    test: s => /directive `?5dc62981`?/i.test(s) && /i don't want the system to stop/i.test(s),
    breaks: s => s.replace(/i don't want the system to stop/, "the system should keep going"),
  },
  {
    id: "blocked-detail-never-silent",
    detail:
      "the block must state that a blocked outcome carries blocked_detail naming why, and that " +
      "the five outcome words are UNCHANGED -- a widened vocabulary would break every reader of " +
      "the outcome column",
    test: s =>
      /blocked_detail/.test(s) &&
      /outcome = 'blocked'/.test(s) &&
      /five outcome words are unchanged/i.test(s),
    breaks: s => s.replace(/five outcome words are unchanged/, "five outcome words were expanded"),
  },
];

function tail8() {
  return norm(extractTail8(fs.readFileSync(RUNBOOK, "utf8")));
}

// The shipped runbook must satisfy every clause.
function theShippedRunbookIsClean() {
  const s = tail8();
  assert.ok(s.length > 0, "tail step (8) is missing from runner-cycle.md");
  for (const c of CLAUSES) {
    assert.ok(c.test(s), `runner-cycle.md lost clause "${c.id}": ${c.detail}`);
  }
}

// FILE-LEVEL NEGATIVE CONTROL: a block that is absent must be reported as a finding, not crash.
function aMissingBlockIsFlagged() {
  assert.strictEqual(
    extractTail8("# a runbook with no serial tail"),
    "",
    "a missing tail (8) block must return '' so the caller reports it",
  );
}

// Per-clause negative control: break exactly one thing, assert exactly that clause fails.
function everyClauseHasTeeth() {
  const s = tail8();
  for (const c of CLAUSES) {
    const mutated = c.breaks(s);
    assert.notStrictEqual(
      mutated,
      s,
      `control for "${c.id}" changed NOTHING -- it cannot prove the clause has teeth (the SES-158 failure)`,
    );
    assert.ok(
      !c.test(mutated),
      `clause "${c.id}" still passes after its own control removed the thing it checks -- the check is vacuous`,
    );
  }
}

// META-ASSERTION: prove the control-checking above can actually fail. Without this, a future
// clause whose `breaks` is a no-op would sail through everyClauseHasTeeth's first assert only
// because nobody ever exercised the failure path.
function aVacuousMutationFailsItsOwnControl() {
  const s = tail8();
  const vacuous = { breaks: x => x };
  assert.throws(
    () => {
      const mutated = vacuous.breaks(s);
      assert.notStrictEqual(mutated, s, "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

function run() {
  theShippedRunbookIsClean();
  aMissingBlockIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();

  notRun(
    "ses196_drain_pick_skips_flagged() function body",
    "the body ships as migration ses196_drain_pick_skips_flagged and lives in the database, not " +
      "this repo; this suite reaches Supabase only over PostgREST, which cannot read " +
      "pg_get_functiondef and could reach the function only by INVOKING it -- which calls " +
      "drain_epic_next and can RETIRE a live drain directive. Behavioural evidence is the live QA " +
      "recorded on the ship card.",
  );
}

selfRun(import.meta.url, run);
export default run;
