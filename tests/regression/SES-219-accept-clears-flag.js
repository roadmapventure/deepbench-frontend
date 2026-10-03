// DeepBench v7.0.296 | tests/regression/SES-219-accept-clears-flag.js | SES-219
//
// Guards the SES-219 rule inside step 2's harvest block of docs/runbooks/runner-cycle.md -- an
// Accept clearing the `design_status` flag its card's ask carried, implemented as a TRIGGER on
// `runner_items` (migration `ses219_accept_clears_design_flag`; John's directive 7384b9e3,
// attended architect session 2026-08-28, verbatim: "accept the flag-clearing fix now so I stop
// doing this manually").
//
// THE RULE IS READ OUT OF THE RUNBOOK, never restated here (John's rule 2026-08-23, "you should
// never be throwing away tests"; the SES-196 / SES-197 / SES-218 precedent). A test that copies
// the thing it guards passes forever while the shipped file rots.
//
// EVERY ASSERTION IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that
// should matter removed. "Would this still pass if the check did nothing?" must answer "no" for
// every clause. There is also a meta-assertion (aVacuousMutationFailsItsOwnControl), same as
// SES-196 / SES-197 / SES-218, because SES-158 shipped a control that changed nothing and only
// checking the control itself caught it.
//
// WHY THE SECOND HALF (theClearingStepWasNotAlsoWrittenAsAStep) IS NOT PADDING, and it is the
// clause most likely to be deleted as redundant. The whole design choice of this ticket is that
// the rule lives in the DATABASE and NOT as a step a cycle performs. A later editor "helpfully"
// adding "then clear design_status" to the harvest instructions would produce a second writer of
// the same fact -- the one-fact-two-homes defect this runbook names repeatedly -- and every
// existing clause here would still pass, because the descriptive block would be untouched. So the
// guard asserts the ABSENCE of an imperative form as well as the PRESENCE of the description. An
// absence assertion alone passes vacuously if the string was never what shipped, which is why it
// is paired with the presence half, exactly as SES-201 pairs its four sites.
//
// FILE-LEVEL NEGATIVE CONTROL, measured against the PRE-CHANGE runbook
// (`git show origin/dev:docs/runbooks/runner-cycle.md`) on 2026-08-28: the block is ABSENT
// pre-change, so all 7 clauses fail there and all 7 pass on the shipped file.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied: the trigger BODY ships as migration
// ses219_accept_clears_design_flag and lives in the database, not this repo.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");

const BLOCK_START = "**AN ACCEPT NOW CLEARS THE `design_status` FLAG ITS CARD'S ASK CARRIED";
const BLOCK_END = "**THE STREAK IS NEVER RESET ON PROMOTION";

// Pure: slice a bounded block out of the runbook. Returns "" when absent -- itself a finding
// rather than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const i = md.indexOf(start);
  if (i < 0) return "";
  const j = md.indexOf(end, i + start.length);
  return j < 0 ? md.slice(i) : md.slice(i, j);
}

function readRunbook() {
  return fs.readFileSync(RUNBOOK, "utf8");
}

function clearBlock(md = readRunbook()) {
  return extractBlock(md, BLOCK_START, BLOCK_END);
}

// Each clause: what it pins, how to detect it, and the control that removes exactly that thing.
// `breaks` must change the text -- a control that returns its input proves nothing.
const CLAUSES = [
  {
    id: "names-the-trigger-not-a-step",
    why: "the placement IS the ticket's design choice; without the function name the rule reads as prose a cycle might re-implement",
    test: s => /public\.runner_items_accept_clears_flag\(\)/.test(s) && /trigger/i.test(s),
    breaks: s => s.replace(/public\.runner_items_accept_clears_flag\(\)/g, "the harvest step"),
  },
  {
    id: "john-paced-is-not-cleared",
    why: "the ticket's own scope guard: john-paced is John's word about his own pace (SES-166) and a cycle may not retract it",
    test: s => /`john-paced`/.test(s) && /NOT cleared|not cleared/.test(s),
    breaks: s => s.replace(/`john-paced`/g, "`needs-john`"),
  },
  {
    id: "designed-is-not-cleared",
    why: "`designed` is explicitly not a skip and is step 6's fast path; clearing it discards a kickoff link SES-112's CHECK guarantees",
    test: s => /`designed`/.test(s) && /fast path/.test(s),
    breaks: s => s.replace(/fast path/g, "ordinary case"),
  },
  {
    id: "only-the-two-filing-flags",
    why: "widening the predicate to any non-null design_status is the edit this ship forbids; the enumeration is what stops it",
    test: s => /`needs-john`, `needs-desktop`|`needs-john` \/ `needs-desktop`|`needs-john`,\s*\n?\s*`needs-desktop`/.test(s),
    breaks: s => s.replace(/`needs-desktop`/g, "any flag"),
  },
  {
    id: "nothing-was-backfilled",
    why: "forward-only is a SAFETY property here -- SES-182 is under John's explicit standing hold and a backfill would re-admit it to the picker",
    test: s => /backfill/i.test(s) && /`SES-182`/.test(s) && /hold/i.test(s),
    breaks: s => s.replace(/`SES-182`/g, "`SES-999`").replace(/hold/gi, "note"),
  },
  {
    id: "loops-because-backlog-id-is-not-unique",
    why: "CHI-48 occupies two rows (SES-97); one UPDATE by backlog_id writes two rows behind one before-image",
    test: s => /`CHI-48`/.test(s) && /before-image/.test(s),
    breaks: s => s.replace(/`CHI-48`/g, "a ticket"),
  },
  {
    id: "the-named-deviation-is-disclosed",
    why: "the predicate keys on backlog_id alone, not on the filing cycle; the deviation is disclosed with the live case that disproves the narrower reading",
    test: s => /[Nn]amed deviation/.test(s) && /`528ab5ba`/.test(s),
    breaks: s => s.replace(/`528ab5ba`/g, "an earlier card"),
  },
];

function theShippedRunbookIsClean() {
  const block = clearBlock();
  assert.ok(
    block.length > 0,
    `the SES-219 harvest block is missing from ${path.relative(ROOT, RUNBOOK)} -- ` +
      `expected a section beginning ${JSON.stringify(BLOCK_START)}`,
  );
  for (const c of CLAUSES) {
    assert.ok(c.test(block), `clause "${c.id}" failed on the shipped runbook -- ${c.why}`);
  }
}

function aMissingBlockIsFlagged() {
  // The extractor must report absence as "" rather than throwing, or a deleted block reads as a
  // crash instead of the finding it is.
  assert.strictEqual(extractBlock("nothing here", BLOCK_START, BLOCK_END), "");
  assert.ok(
    extractBlock(`${BLOCK_START} tail with no terminator`, BLOCK_START, BLOCK_END).length > 0,
    "a block with no terminator must still be returned, not swallowed",
  );
}

function everyClauseHasTeeth() {
  const block = clearBlock();
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

// META-ASSERTION: prove the control-checking above can actually fail.
function aVacuousMutationFailsItsOwnControl() {
  const s = clearBlock();
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

// The half that survives a well-meaning edit. The rule must stay DESCRIPTIVE here: an imperative
// "clear the flag" instruction in the harvest would create a second writer of one fact, and every
// clause above would still pass because the descriptive block would be untouched.
function theClearingStepWasNotAlsoWrittenAsAStep() {
  const block = clearBlock();
  assert.ok(
    /Do not add a clearing step here|never a step you\s*\n?RUN|is a description, never an instruction/i.test(block),
    "the block must say out loud that it is a description and not a step, or the next editor adds " +
      "the clearing to the harvest instructions and one fact gets two writers",
  );
  // Presence half, so the absence assertion below cannot pass vacuously.
  assert.ok(
    /writes its own before-image/.test(block),
    "the block must state that the trigger writes its own before-image (§19v: no before-image, no write)",
  );
  // Absence half: no imperative clearing instruction anywhere in the harvest's own instruction list.
  const harvest = extractBlock(
    readRunbook(),
    "**2. Harvest John's judgment",
    "**2b. VISION COMMENT ROUTING",
  );
  assert.ok(harvest.length > 0, "step 2's harvest section is missing -- the absence check cannot run");
  assert.ok(
    !/(then|and) (also )?clear (the )?`?(backlog_items\.)?design_status`?/i.test(harvest),
    "an imperative 'clear design_status' instruction appeared in the harvest -- SES-219 put that in " +
      "a trigger precisely so no cycle has to remember it; two writers of one fact is the defect " +
      "this runbook names eight times over",
  );
}

function run() {
  theShippedRunbookIsClean();
  aMissingBlockIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  theClearingStepWasNotAlsoWrittenAsAStep();

  notRun(
    "the ses219_accept_clears_design_flag trigger body itself",
    "the trigger and its function ship as a migration and live in the database, not this repo; " +
      "this suite reaches Supabase only over PostgREST, which cannot read pg_get_functiondef, and " +
      "the function returns `trigger` so it cannot be invoked directly. Behavioural evidence is " +
      "the nine-arm rolled-back DO-block fixture on the ship card: needs-john + Accept -> NULL, " +
      "john-paced -> unchanged, an unrelated ticket -> unchanged, designed -> unchanged, " +
      "needs-desktop + a ship card -> NULL, a card with backlog_id NULL -> no error, 2 " +
      "before-images written, a re-Accept -> 0 further images, and the NEGATIVE CONTROL (same " +
      "fixture with the trigger dropped) leaving the flag at needs-john.",
  );
}

selfRun(import.meta.url, run);
export default run;
