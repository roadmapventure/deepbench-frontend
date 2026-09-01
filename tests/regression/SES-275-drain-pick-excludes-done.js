// DeepBench v7.0.354 | tests/regression/SES-275-drain-pick-excludes-done.js | SES-275
//
// Guards the SES-275 rule inside step 5's layer-1b block of docs/runbooks/runner-cycle.md --
// `status NOT IN ('done','removed')` entering `drain_epic_next()`'s PICK predicate EXPLICITLY,
// rather than being inherited from `b.queue IS NOT NULL` on the strength of an invariant that
// other writers maintain (migration `ses275_drain_pick_status_clause`).
//
// FOUND LIVE 2026-09-01T00:2xZ by runner cycle d3d7c6f6 at step 5, on the real board: an attended
// session set SES-244 to `done` at 2026-08-31T23:11:30Z without running recompute_backlog_queue(),
// the row kept queue 265, and drain_epic_next() returned it as the `pick`.
//
// THE RULE IS READ OUT OF THE RUNBOOK, never restated here (John's rule 2026-08-23, "you should
// never be throwing away tests"; the SES-218 / SES-196 / SES-197 / SES-194 / SES-158 precedent). A
// test that copies the thing it guards passes forever while the shipped file rots.
//
// EVERY ASSERTION IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that should
// matter removed. "Would this still pass if the check did nothing?" must answer "no" for every
// clause. There is also a meta-assertion (aVacuousMutationFailsItsOwnControl), same as SES-218's
// and SES-196's files, because SES-158 shipped a control that changed nothing and only checking the
// control itself caught it.
//
// FILE-LEVEL NEGATIVE CONTROL, measured against the PRE-CHANGE runbook
// (git show origin/dev:docs/runbooks/runner-cycle.md) at this ship: the SES-275 block is ABSENT
// there, so 7/7 clauses fail on that file and 7/7 pass on the shipped one.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied: the function BODY ships as migration
// ses275_drain_pick_status_clause and lives in the database, not this repo, and this suite reaches
// Supabase only over PostgREST -- which cannot read pg_get_functiondef and could reach the function
// only by INVOKING it, which calls drain_epic_next and can RETIRE a live drain directive.
// Behavioural evidence is the four-arm rolled-back fixture recorded on the ship card.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");

const START = "**A FINISHED MEMBER IS NOT WORK EITHER";
const END = "**Corrected, because it was measured rather than recalled";

// Pure: slice a bounded block out of the runbook. Returns "" when absent -- itself a finding rather
// than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

export const extractFinished = md => extractBlock(md, START, END);

// Markdown is hard-wrapped at ~95 columns, so a load-bearing phrase can straddle a line break and a
// literal match fails for a reason that has nothing to do with the rule. Normalising runs of
// whitespace to one space makes every clause reflow-proof (the SES-194 lesson).
export const norm = s => s.replace(/\s+/g, " ");

// Pure: the load-bearing clauses, kept as data so a negative control can name exactly which one it
// removed. A clause earns its place only if REMOVING it would change what a cycle does.
export const CLAUSES = [
  {
    id: "clause-is-explicit-and-in-the-pick-predicate",
    detail:
      "the block must state the status clause verbatim and say it lives in the PICK predicate -- " +
      "without both, a reader cannot tell that the picker itself changed rather than the board",
    test: s => /status NOT IN \('done','removed'\)/.test(s) && /pick\s*predicate/i.test(s),
    breaks: s => s.replace(/status NOT IN \('done','removed'\)/g, "status IS NOT NULL"),
  },
  {
    id: "invariant-was-inherited-from-other-writers",
    detail:
      "the block must name the retired assumption (\"the recompute strips their queue\") AND say " +
      "the invariant is maintained by OTHER writers, never by the function -- that is the whole " +
      "reason a comment was not enough and a clause was needed",
    test: s =>
      /the recompute strips their queue/i.test(s) &&
      /OTHER writers/.test(s) &&
      /recompute_backlog_queue\(\)/.test(s),
    breaks: s => s.replace(/OTHER writers/g, "this function itself"),
  },
  {
    id: "measured-live-not-reasoned",
    detail:
      "the block must carry the live measurement -- SES-244, the 23:11:30Z write with no recompute, " +
      "the queue number it kept, and that the call returned it as the pick; without the evidence " +
      "this is an opinion about a predicate rather than a defect anyone can re-verify",
    test: s =>
      /Measured live/i.test(s) &&
      /SES-244/.test(s) &&
      /2026-08-31T23:11:30Z/.test(s) &&
      /queue 265/.test(s) &&
      /done\s*\*?\*?\s*ticket handed back/i.test(s),
    breaks: s => s.replace(/queue 265/g, "no queue number"),
  },
  {
    id: "damage-is-the-outcome-word-not-a-wrong-build",
    detail:
      "the block must say the claim's `status <> 'done'` stops the duplicate build, and that the " +
      "real damage is the OUTCOME WORD passing Gate B and Gate C so the chain continues -- an " +
      "editor who reads this as 'harmless, the claim catches it' under-fixes it and drops the clause",
    test: s =>
      /OUTCOME WORD/.test(s) &&
      /Gate B/.test(s) &&
      /Gate C/.test(s) &&
      /both gates pass/i.test(s) &&
      /SES-197/.test(s),
    breaks: s => s.replace(/both gates\s*\*?\*?\s*pass/i, "both gates fail"),
  },
  {
    id: "retirement-predicate-untouched",
    detail:
      "the block must forbid adding the clause to the RETIREMENT predicate, say it is already " +
      "there, count this as the FOURTH statement of that boundary and cite all three predecessors " +
      "(SES-154, SES-196, SES-218) -- the trap is an editor collapsing the two predicates again",
    test: s =>
      /THE EDIT THIS FORBIDS/.test(s) &&
      /RETIREMENT predicate/i.test(s) &&
      /fourth/i.test(s) &&
      /SES-154/.test(s) &&
      /SES-196/.test(s) &&
      /SES-218/.test(s) &&
      /own say-so/i.test(s),
    breaks: s => s.replace(/THE EDIT THIS FORBIDS/, "THE EDIT THIS RECOMMENDS"),
  },
  {
    id: "recompute-is-not-a-substitute",
    detail:
      "the block must say running the recompute is NOT a substitute for the clause, carry the " +
      "measured 336 rows the finding cycle moved, and tie it to the silently-forgotten precedent " +
      "-- otherwise the next reader 'simplifies' the migration away into a bookkeeping habit",
    test: s =>
      /NOT A SUBSTITUTE/i.test(s) &&
      /336 rows moved/.test(s) &&
      /silently forgotten/i.test(s),
    breaks: s => s.replace(/NOT A SUBSTITUTE/i, "the substitute"),
  },
  {
    id: "census-base-shares-one-list",
    detail:
      "the block must state that blocked_detail's census base carries the identical clause from ONE " +
      "list (c_finished) rather than two hand-copied literals, and cite SES-196's 'over exactly the " +
      "base the pick predicate reads' -- two copies of one predicate is precisely how they drift",
    test: s =>
      /c_finished/.test(s) &&
      /over exactly the base the pick predicate reads/i.test(s) &&
      /hand-copied literals/i.test(s),
    breaks: s => s.replace(/hand-copied literals/i, "two independent literals, which is fine"),
  },
];

function readRunbook() {
  return fs.readFileSync(RUNBOOK, "utf8");
}

const finishedBlock = () => norm(extractFinished(readRunbook()));

// The shipped runbook must satisfy every clause.
function theShippedRunbookIsClean() {
  const s = finishedBlock();
  assert.ok(s.length > 0, "the SES-275 finished-member block is missing from runner-cycle.md step 5");
  for (const c of CLAUSES) {
    assert.ok(c.test(s), `runner-cycle.md lost clause "${c.id}": ${c.detail}`);
  }
}

// FILE-LEVEL NEGATIVE CONTROL: a block that is absent must be reported as a finding, not crash.
// This is the arm that fails on the pre-change runbook, where the block does not exist at all.
function aMissingBlockIsFlagged() {
  assert.strictEqual(
    extractFinished("# a runbook with no drain layer"),
    "",
    "a missing SES-275 block must return '' so the caller reports it",
  );
}

// Per-clause negative control: break exactly one thing, assert exactly that clause fails.
function everyClauseHasTeeth() {
  const block = finishedBlock();
  for (const c of CLAUSES) {
    const mutated = c.breaks(block);
    assert.notStrictEqual(
      mutated,
      block,
      `control for "${c.id}" changed NOTHING -- it cannot prove the clause has teeth (the SES-158 failure)`,
    );
    assert.ok(
      !c.test(mutated),
      `clause "${c.id}" still passes after its own control removed the thing it checks -- the check is vacuous`,
    );
  }
}

// META-ASSERTION: prove the control-checking above can actually fail. Without this, a future clause
// whose `breaks` is a no-op would sail through everyClauseHasTeeth's first assert only because
// nobody ever exercised the failure path.
function aVacuousMutationFailsItsOwnControl() {
  const s = finishedBlock();
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

// The five-outcome vocabulary of drain_epic_next is read by Gate B, step 5's table and tail (8).
// SES-275 removes a WRONG pick, never adds an outcome word -- a later editor reaching for a sixth
// ('finished', 'stale') would break every reader of that column at once. Same guard SES-218 keeps,
// because this ticket touches the same return value.
function theOutcomeVocabularyDidNotGrow() {
  const md = readRunbook();
  const bullets = extractBlock(md, "- **`none`** — no drain declared.", "Five properties that are");
  assert.ok(bullets.length > 0, "the five-outcome bullet list is missing from step 5");
  for (const word of ["`none`", "`pick`", "`blocked`", "`unscoped`", "`retired`"]) {
    assert.ok(bullets.includes(word), `the outcome ${word} left step 5's five-outcome list`);
  }
  for (const word of ["finished", "stale", "done"]) {
    assert.ok(
      !new RegExp(`- \\*\\*\`${word}\`\\*\\*`).test(bullets),
      `a sixth outcome word \`${word}\` appeared -- SES-275 removes a wrong pick, never adds an outcome`,
    );
  }
}

// The SES-218 block must survive intact beside this one. Both clauses live in the same predicate and
// a future edit that rewrites the pick predicate wholesale is exactly the change that would drop one
// of them silently -- so this file asserts the neighbour it was modelled on is still there.
function theBlockedByNeighbourSurvives() {
  const md = readRunbook();
  const bb = norm(
    extractBlock(md, "**A REMAINDER BLOCKED ON ANOTHER TICKET IS NOT WORK EITHER", START),
  );
  assert.ok(
    bb.length > 0 && /blocked_by/.test(bb) && /PICK predicate/i.test(bb),
    "the SES-218 blocked_by block vanished from step 5 -- SES-275 sits directly after it and the " +
      "two clauses share one predicate; losing one silently is the failure this arm exists to catch",
  );
}

function run() {
  theShippedRunbookIsClean();
  aMissingBlockIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  theOutcomeVocabularyDidNotGrow();
  theBlockedByNeighbourSurvives();

  notRun(
    "ses275_drain_pick_status_clause function body and the status clause itself",
    "the body ships as migration ses275_drain_pick_status_clause and lives in the database, not " +
      "this repo; this suite reaches Supabase only over PostgREST, which cannot read " +
      "pg_get_functiondef and could reach the function only by INVOKING it -- which calls " +
      "drain_epic_next and can RETIRE a live drain directive. Behavioural evidence is the four-arm " +
      "rolled-back fixture on the ship card: SES-244 done WITH queue 265 -> the shipped form " +
      "returns `blocked` naming SES-47, the RETIRED form (same fixture, status clause removed) " +
      "returns `pick` = SES-244, an unblocked live member is still picked (both directions, " +
      "SES-101), and exactly 1 overload remains.",
  );
}

selfRun(import.meta.url, run);
export default run;
