// DeepBench v7.0.295 | tests/regression/SES-218-drain-pick-blocked-by.js | SES-218
//
// Guards the SES-218 rule inside step 5's layer-1b block of docs/runbooks/runner-cycle.md --
// `backlog_items.blocked_by` entering `drain_epic_next()`'s PICK predicate, so a cycle that
// deliberately leaves work `partial` behind a blocker is not handed that same ticket forever
// (migration `ses218_blocked_by`; John's directive 07dea95e, attended architect session
// 2026-08-28).
//
// THE RULE IS READ OUT OF THE RUNBOOK, never restated here (John's rule 2026-08-23, "you should
// never be throwing away tests"; the SES-196 / SES-197 / SES-194 / SES-158 precedent). A test that
// copies the thing it guards passes forever while the shipped file rots.
//
// EVERY ASSERTION IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that
// should matter removed. "Would this still pass if the check did nothing?" must answer "no" for
// every clause. There is also a meta-assertion (aVacuousMutationFailsItsOwnControl), same as
// SES-196's and SES-197's files, because SES-158 shipped a control that changed nothing and only
// checking the control itself caught it.
//
// FILE-LEVEL NEGATIVE CONTROL, measured against the PRE-CHANGE runbook
// (git show origin/dev:docs/runbooks/runner-cycle.md) on 2026-08-28, and reported with the
// distinction that matters rather than rounded up to one number:
//
//   blocked_by block : ABSENT pre-change -> 7/7 clauses fail; 7/7 pass on the shipped file.
//   filing block     : PRESENT on BOTH sides -> 1/1 clause fails pre-change, 1/1 passes post.
//
// The second line is the stronger of the two and is why it is stated separately. A clause that
// fails only because its whole block is missing proves the extractor works, not that the clause
// discriminates; the filing block exists in both files and differs only by the rider, so its
// control isolates the rule itself.
//
// WHY THE 8th CLAUSE IS IN A DIFFERENT BLOCK, and it is not padding: the size_stamp / gate_count
// filing rule (John's directive db84b784) rides on this ship by his explicit instruction and lands
// at step 2b's ticket-filing bullet, nowhere near the drain block. A guard that only checked the
// drain block would let that rider be reverted silently, which is exactly what "folded in rather
// than given its own cycle" makes easy to lose.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied: the function BODY ships as migration
// ses218_blocked_by and lives in the database, not this repo, and this suite reaches Supabase only
// over PostgREST -- which cannot read pg_get_functiondef and could reach the function only by
// INVOKING it, which calls drain_epic_next and can RETIRE a live drain directive. Behavioural
// evidence is the five-arm rolled-back fixture recorded on the ship card.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");

const BB_START = "**A REMAINDER BLOCKED ON ANOTHER TICKET IS NOT WORK EITHER";
const BB_END = "**Corrected, because it was measured rather than recalled";

const FILING_START = "- **Filing the ticket claims its id atomically**";
const FILING_END = "- **A rejection is a KEPT ROW";

// Pure: slice a bounded block out of the runbook. Returns "" when absent -- itself a finding
// rather than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

export const extractBlockedBy = md => extractBlock(md, BB_START, BB_END);
export const extractFiling = md => extractBlock(md, FILING_START, FILING_END);

// Markdown is hard-wrapped at ~95 columns, so a load-bearing phrase can straddle a line break and
// a literal match fails for a reason that has nothing to do with the rule. Normalising runs of
// whitespace to one space makes every clause reflow-proof (the SES-194 lesson).
export const norm = s => s.replace(/\s+/g, " ");

// Pure: the load-bearing clauses, kept as data so a negative control can name exactly which one it
// removed. A clause earns its place only if REMOVING it would change what a cycle does.
export const CLAUSES = [
  {
    id: "clause-is-in-the-pick-predicate",
    detail:
      "the block must state that blocked_by is read by the PICK predicate and name the column -- " +
      "without this the reader does not know the picker itself changed",
    test: s => /`?blocked_by`?/.test(s) && /PICK predicate/i.test(s),
    // Global, not first-occurrence: the block names the pick predicate more than once, so a
    // single-hit mutation leaves the clause passing and the control toothless. The meta-assertion
    // aVacuousMutationFailsItsOwnControl caught exactly that on this clause's first draft.
    breaks: s => s.replace(/PICK predicate/gi, "retirement predicate"),
  },
  {
    id: "retirement-predicate-untouched",
    detail:
      "the block must state the clause is in the pick predicate ONLY, that adding it to the " +
      "RETIREMENT predicate closes John's standing directive on the runner's own say-so, and must " +
      "cite SES-142 -- the trap: without this the next editor collapses the two predicates, for " +
      "the third time after SES-154 and SES-196",
    test: s =>
      /PICK predicate ONLY/i.test(s) &&
      /retirement/i.test(s) &&
      /on the runner's own say-so/i.test(s) &&
      /SES-142/.test(s) &&
      /never `?retired`?/i.test(s),
    breaks: s => s.replace(/PICK predicate ONLY/gi, "PICK and RETIREMENT predicates"), // SES-247 added a second occurrence; a first-occurrence mutation left the clause standing and turned CI red (v7.0.380-385)
  },
  {
    id: "partial-is-not-uniformly-do-not-repick",
    detail:
      "the block must forbid the `status <> 'partial'` one-liner AND give the measured reason " +
      "(SES-51 / SES-180 each shipped a further half FROM partial) -- without the evidence this " +
      "is an opinion, and the one-liner is the tempting patch this whole ticket exists to refuse",
    test: s =>
      /status <> 'partial'/.test(s) &&
      /NOT uniformly do-not-re-pick/i.test(s) &&
      /SES-51/.test(s) &&
      /SES-180/.test(s),
    breaks: s => s.replace(/NOT uniformly do-not-re-pick/gi, "always do-not-re-pick"),
  },
  {
    id: "delivered-unblocks-a-dependent",
    detail:
      "the block must state that `delivered` UNBLOCKS a dependent though a delivered ticket is " +
      "not itself pickable, carry John's verbatim 'ships, not is accepted' authority, and say " +
      "collapsing the two sets breaks one of them -- an editor's instinct is to make them one set",
    test: s =>
      /`?delivered`? UNBLOCKS a dependent/i.test(s) &&
      /remainder becomes buildable/i.test(s) &&
      /not \*?\*?is accepted/i.test(s) &&
      /collapsing them to one breaks one of the two/i.test(s),
    breaks: s => s.replace(/UNBLOCKS a dependent/gi, "still blocks a dependent"),
  },
  {
    id: "nothing-clears-it",
    detail:
      "the block must state that nothing clears blocked_by -- the predicate tests the BLOCKER's " +
      "live status -- and tie it to the record_skip precedent; a cycle told to clear it by hand " +
      "is a rule that gets silently forgotten",
    test: s =>
      /NOTHING CLEARS IT/i.test(s) &&
      /`?NOT EXISTS`?/.test(s) &&
      /blocker's\*?\*? live status/i.test(s) &&
      /record_skip/.test(s),
    breaks: s => s.replace(/NOTHING CLEARS IT, and nothing should have to/gi, "Clear it by hand once the blocker lands"),
  },
  {
    id: "keyed-on-id-never-backlog-id",
    detail:
      "the block must state the column keys on backlog_items.id and NOT backlog_id, and name the " +
      "reason (backlog_id is not unique; CHI-48 occupies two rows) -- a text key silently means " +
      "both rows, the SES-142 / SES-86 lesson",
    test: s => /never `?backlog_id`?/i.test(s) && /CHI-48/.test(s) && /two rows/i.test(s),
    breaks: s => s.replace(/never `backlog_id`/gi, "or `backlog_id`, either is fine"),
  },
  {
    id: "never-use-design-status-instead",
    detail:
      "the block must forbid using design_status needs-john / john-paced to get a blocked ticket " +
      "out of the picker and cite SES-166 -- that is the shortcut the ticket itself names, and it " +
      "puts an ask on John's section 10 that he cannot act on",
    test: s =>
      /NEVER write `?design_status`?/i.test(s) &&
      /needs-john/.test(s) &&
      /john-paced/.test(s) &&
      /SES-166/.test(s) &&
      /cannot act on/i.test(s),
    breaks: s => s.replace(/NEVER write/gi, "You may write"),
  },
];

// The rider clause lives in a DIFFERENT block (step 2b's ticket-filing bullet), so it gets its own
// extractor rather than being smuggled into the drain block's list.
export const FILING_CLAUSES = [
  {
    id: "filing-rule-size-stamp-and-gate-count",
    detail:
      "step 2b's ticket-filing bullet must carry John's directive db84b784 filing rule -- both " +
      "columns named, all three size letters defined, and gate_count described as the count of " +
      "known external gate-crossings; without the definitions the stamp is a letter nobody applies " +
      "consistently, which is the whole point of the burn-down",
    test: s =>
      /`?size_stamp`?/.test(s) &&
      /`?gate_count`?/.test(s) &&
      /db84b784/.test(s) &&
      /`?S`? = one cycle/i.test(s) &&
      /`?M`? = 1[–-]2 cycles/i.test(s) &&
      /`?L`? = multi-cycle/i.test(s) &&
      /gate-crossings/i.test(s),
    breaks: s => s.replace(/`gate_count`/g, "`unrelated_column`"),
  },
];

function readRunbook() {
  return fs.readFileSync(RUNBOOK, "utf8");
}

const blockedByBlock = () => norm(extractBlockedBy(readRunbook()));
const filingBlock = () => norm(extractFiling(readRunbook()));

// The shipped runbook must satisfy every clause.
function theShippedRunbookIsClean() {
  const s = blockedByBlock();
  assert.ok(s.length > 0, "the SES-218 blocked_by block is missing from runner-cycle.md step 5");
  for (const c of CLAUSES) {
    assert.ok(c.test(s), `runner-cycle.md lost clause "${c.id}": ${c.detail}`);
  }

  const f = filingBlock();
  assert.ok(f.length > 0, "step 2b's ticket-filing bullet block is missing from runner-cycle.md");
  for (const c of FILING_CLAUSES) {
    assert.ok(c.test(f), `runner-cycle.md lost clause "${c.id}": ${c.detail}`);
  }
}

// FILE-LEVEL NEGATIVE CONTROL: a block that is absent must be reported as a finding, not crash.
// This is the arm that fails on the pre-change runbook, where the block does not exist at all.
function aMissingBlockIsFlagged() {
  assert.strictEqual(
    extractBlockedBy("# a runbook with no drain layer"),
    "",
    "a missing blocked_by block must return '' so the caller reports it",
  );
  assert.strictEqual(
    extractFiling("# a runbook with no filing bullet"),
    "",
    "a missing filing block must return '' so the caller reports it",
  );
}

// Per-clause negative control: break exactly one thing, assert exactly that clause fails.
function everyClauseHasTeeth() {
  for (const [block, list, label] of [
    [blockedByBlock(), CLAUSES, "blocked_by"],
    [filingBlock(), FILING_CLAUSES, "filing"],
  ]) {
    for (const c of list) {
      const mutated = c.breaks(block);
      assert.notStrictEqual(
        mutated,
        block,
        `control for "${c.id}" (${label}) changed NOTHING -- it cannot prove the clause has teeth (the SES-158 failure)`,
      );
      assert.ok(
        !c.test(mutated),
        `clause "${c.id}" (${label}) still passes after its own control removed the thing it checks -- the check is vacuous`,
      );
    }
  }
}

// META-ASSERTION: prove the control-checking above can actually fail. Without this, a future
// clause whose `breaks` is a no-op would sail through everyClauseHasTeeth's first assert only
// because nobody ever exercised the failure path.
function aVacuousMutationFailsItsOwnControl() {
  const s = blockedByBlock();
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
// SES-218 added a REASON a pick can be rejected, never a new outcome word, and a later editor
// reaching for a sixth word ('blocked-by') would break every reader of that column at once.
function theOutcomeVocabularyDidNotGrow() {
  const md = readRunbook();
  const bullets = extractBlock(md, "- **`none`** — no drain declared.", "Five properties that are");
  assert.ok(bullets.length > 0, "the five-outcome bullet list is missing from step 5");
  for (const word of ["`none`", "`pick`", "`blocked`", "`unscoped`", "`retired`"]) {
    assert.ok(bullets.includes(word), `the outcome ${word} left step 5's five-outcome list`);
  }
  assert.ok(
    !/- \*\*`blocked-by`\*\*/.test(bullets),
    "a sixth outcome word appeared -- SES-218 adds a REASON inside `blocked`, never a new outcome",
  );
  assert.ok(
    /blocked on another open ticket/i.test(bullets),
    "the `blocked` bullet must say a member can be blocked on another open ticket, or blocked_detail's " +
      "new population is undocumented where every reader of the outcome column looks",
  );
}

function run() {
  theShippedRunbookIsClean();
  aMissingBlockIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  theOutcomeVocabularyDidNotGrow();

  notRun(
    "ses218_blocked_by function body and the blocked_by predicate itself",
    "the body ships as migration ses218_blocked_by and lives in the database, not this repo; this " +
      "suite reaches Supabase only over PostgREST, which cannot read pg_get_functiondef and could " +
      "reach the function only by INVOKING it -- which calls drain_epic_next and can RETIRE a live " +
      "drain directive. Behavioural evidence is the five-arm rolled-back fixture on the ship card: " +
      "blocked_by NULL -> pick (the negative control), blocker open -> blocked with blocked_detail " +
      "naming it, blocker delivered -> pick, blocker done -> pick, self-block rejected by CHECK.",
  );
}

selfRun(import.meta.url, run);
export default run;
