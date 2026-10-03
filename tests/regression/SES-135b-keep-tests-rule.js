// DeepBench v7.0.280 | tests/regression/SES-135b-keep-tests-rule.js | SES-135 (part 2 of 2)
//
// Guards docs/STANDARDS.md Section 4's keep-tests rule -- John's decision on card 1abe473a
// (2026-08-25T14:08Z): regression guards get a permanent home and are never discarded, the full
// suite runs every cycle, and credential-gated halves skip loudly.
//
// THIS FILE IS ITSELF CLAUSE 1 BEING OBEYED, which is the only reason it exists rather than a
// scratchpad check. SES-135's own measurement is that the last several render harnesses were each
// written to a scratchpad and thrown away -- six tickets deep, noted in the ships as "harness
// scratchpad-only" -- because keep-or-discard was a per-cycle judgement call. A rule whose first
// application is discarded is a rule nobody applied.
//
// THE RULE IS READ OUT OF THE DOC, never restated here (the SES-136 / SES-176 / SES-158 precedent).
// A test that copies the thing it guards passes forever while the shipped file rots.
//
// EVERY ASSERTION IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that should
// matter removed -- plus the meta-assertion SES-158 paid for, because that ticket shipped a control
// that changed nothing and only a checked control caught it.
//
// THE TWO CLAUSES TO READ TWICE, because they are the ways this rule gets edited into uselessness:
//
//   `throwaway-home-survives` -- Section 4 opens by requiring the session's own test-[id].mjs to be
//   DELETED before committing. The keep rule sits directly above that and an editor reconciling the
//   two by softening the delete would turn every session's scratch test into committed noise. Both
//   are correct; they describe different artifacts. This clause is the twin of SES-136's
//   `the-prohibition-survives` and is load-bearing in the same direction: the fix must not weaken
//   the rule it sits inside.
//
//   `forbids-removing-a-guard` -- the operative prohibition. Without it clause 1 is a preference,
//   and the cheapest way to a green suite is deleting the guard that went red. That is the one
//   escape the rule must not leave open, and it is the same boundary SES-197's retargeted guard
//   keeps: when a rule moves the guard is retargeted, never deleted, because deleting a guard loses
//   the reason with it.
//
// THE CITATIONS ARE CHECKED FOR DANGLE, not just for presence. Clauses 2 and 3 deliberately CITE
// their mechanics (Section 2 rule 5; notRun() and the "NOT A FULL RUN:" line) instead of restating
// them, so the two homes cannot drift -- but a citation whose target has been tidied away is
// SES-176's dangling-pointer class wearing a compliance badge. So the mechanics are asserted to
// still exist, in the files the rule names.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DOC = path.join(ROOT, "docs/STANDARDS.md");
const SELF_RUN = path.join(ROOT, "tests/regression/_lib/self-run.js");
const RUN_ALL = path.join(ROOT, "tests/regression/run-all.js");
const PART1 = path.join(ROOT, "tests/regression/SES-135-briefing-render.js");

const SECTION_START = "### Which tests are KEPT, and which run every cycle";
const SECTION_END = "### The rule that outranks every category below";

// Pure: slice the bounded subsection out of the doc. Returns "" when absent -- itself a finding
// rather than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

// Pure: markdown hard-wraps prose, so a clause phrase can be split across a newline. Every clause
// below is a claim about WORDS, never about layout -- so the block is whitespace-normalized once,
// here, rather than each clause carrying its own \s+ dance and one of them forgetting.
export const normalize = s => s.replace(/\s+/g, " ").trim();

export const extractRule = md => normalize(extractBlock(md, SECTION_START, SECTION_END));

// Pure: the load-bearing clauses, kept as data so a negative control can name exactly which one it
// removed. A clause earns its place only if REMOVING it would change what a session does.
export const CLAUSES = [
  {
    id: "guards-are-permanent",
    detail: "clause 1 of John's decision: a regression guard is never discarded and its home is tests/regression/. Without it the keep-or-discard call goes back to per-cycle judgement, which is measurably how six harnesses in a row were thrown away",
    test: s => /never discarded/.test(s) && /tests\/regression\//.test(s),
    breaks: s => s.replace(/never discarded/g, "kept when convenient"),
  },
  {
    id: "full-suite-every-cycle",
    detail: "clause 2: the full suite runs every cycle, not 'when the change looks risky'. This is the clause that costs budget, so it is the one a later session is most likely to quietly narrow",
    test: s => /full suite runs every cycle/.test(s),
    breaks: s => s.replace(/full suite runs every cycle/g, "suite runs when warranted"),
  },
  {
    id: "credential-halves-skip-loudly",
    detail: "clause 3: a credential-gated half skips LOUDLY, never silently -- the property that stops a suite reporting 68/68 while a real failure sits behind absent credentials (measured live 2026-08-25, cycle 860efe52)",
    test: s => /skips? LOUDLY/.test(s) && /never silently/.test(s),
    breaks: s => s.replace(/never silently/g, "when practical"),
  },
  {
    id: "decision-is-attributed-to-john",
    detail: "the rule must trace to John's card and date, not to the runner's judgement. A budget-spending policy with no attribution reads as something the runner decided for itself, and the next session would be right to reopen it",
    test: s => /1abe473a/.test(s) && /2026-08-25/.test(s),
    breaks: s => s.replace(/1abe473a/g, "a card"),
  },
  {
    id: "throwaway-home-survives",
    detail: "READ TWICE: Section 4's 'Deleted before committing' rule for the session's own test-[id].mjs must survive alongside the keep rule. An editor who reconciles the two by softening the delete turns every session's scratch test into committed noise",
    test: s => /Deleted before committing|deleted before the commit/.test(s),
    breaks: s => s.replace(/[Dd]eleted before committing/g, "kept").replace(/deleted before the commit/g, "kept"),
  },
  {
    id: "forbids-removing-a-guard",
    detail: "READ TWICE: the operative prohibition -- no deleting, skipping or quarantining a guard to get a suite green. Without it clause 1 is a preference and the cheapest path to green is removing the test that went red",
    test: s => /quarantin/.test(s) && /never remove the guard/.test(s),
    breaks: s => s.replace(/never remove the guard/g, "use your judgement"),
  },
  {
    id: "cites-rather-than-restates",
    detail: "clauses 2 and 3 must point at their mechanics (Section 2 rule 5, self-run.js, run-all.js) instead of copying them. A restated mechanic is a second home for one fact, which is how the two copies start disagreeing",
    test: s => /Section 2\s*rule 5/.test(s) && /self-run\.js/.test(s) && /run-all\.js/.test(s),
    breaks: s => s.replace(/Section 2/g, "another section"),
  },
];

function ruleBlock() {
  const md = fs.readFileSync(DOC, "utf8");
  const block = extractRule(md);
  assert.ok(
    block,
    `docs/STANDARDS.md no longer carries the keep-tests rule (looked for "${SECTION_START}"). `
    + `SES-135 part 2 is John's decision of record on card 1abe473a -- if the section moved, retarget `
    + `this guard rather than deleting it.`,
  );
  return block;
}

function theShippedRuleIsClean() {
  const b = ruleBlock();
  for (const c of CLAUSES) {
    assert.ok(c.test(b), `docs/STANDARDS.md keep-tests rule fails clause "${c.id}": ${c.detail}`);
  }
}

function everyClauseHasTeeth() {
  const b = ruleBlock();
  for (const c of CLAUSES) {
    const mutated = c.breaks(b);
    assert.notStrictEqual(mutated, b,
      `control for "${c.id}" changed NOTHING -- it cannot prove the clause has teeth (the SES-158 failure)`);
    assert.ok(!c.test(mutated),
      `clause "${c.id}" still passes after its own control removed the thing it checks -- the check is vacuous`);
  }
}

// META-ASSERTION: prove the control-checking above can actually fail. Without this, a future clause
// whose `breaks` is a no-op would sail through everyClauseHasTeeth's first assert only because
// nobody ever exercised the failure path.
function aVacuousMutationFailsItsOwnControl() {
  const b = ruleBlock();
  assert.throws(
    () => {
      const mutated = b;
      assert.notStrictEqual(mutated, b, "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

// The rule CITES these mechanics rather than restating them, which is correct -- and which makes a
// tidied-away target silently fatal to the citation. SES-176's dangling-pointer class.
function theCitedMechanicsStillExist() {
  const selfRunSrc = fs.readFileSync(SELF_RUN, "utf8");
  assert.ok(/export function notRun\(/.test(selfRunSrc),
    "tests/regression/_lib/self-run.js no longer exports notRun(), so the keep-tests rule's clause 3 "
    + "cites a loud-skip mechanism that does not exist. Retarget the citation rather than dropping clause 3.");

  const runAllSrc = fs.readFileSync(RUN_ALL, "utf8");
  assert.ok(/NOT A FULL RUN:/.test(runAllSrc),
    "tests/regression/run-all.js no longer prints the \"NOT A FULL RUN:\" line, so clause 3's "
    + "loud skip has no output. A silent skip is exactly the false green the clause exists to stop.");

  const md = fs.readFileSync(DOC, "utf8");
  assert.ok(/`SES-61`, `v7\.0\.253`/.test(md) && /run-all\.js/.test(md),
    "docs/STANDARDS.md Section 2 rule 5 no longer carries the specced suite invocation, which is what "
    + "clause 2 points at for HOW the suite runs. Restore or retarget -- do not restate it inside Section 4.");
}

// Part 1 shipped first and carried a paragraph saying part 2 was still John's call. It is not any
// more, and a stale "waiting on John" note is how a settled question gets re-asked -- the same waste
// SES-114 measured when a blocker had to be re-derived three times in one day.
function partOneNoLongerSaysJohnHasNotRuled() {
  const src = fs.readFileSync(PART1, "utf8");
  assert.ok(/the ticket stays open until he rules/.test(src) === false,
    "tests/regression/SES-135-briefing-render.js still says SES-135 'stays open until he rules'. "
    + "He ruled on card 1abe473a 2026-08-25T14:08Z -- update the pointer rather than leaving a "
    + "settled question looking open.");
  assert.ok(/1abe473a/.test(src) && /STANDARDS\.md/.test(src),
    "tests/regression/SES-135-briefing-render.js no longer points at John's card and the rule's home "
    + "in docs/STANDARDS.md. The pointer is the half that stops the next reader re-asking.");
}

function run() {
  theShippedRuleIsClean();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  theCitedMechanicsStillExist();
  partOneNoLongerSaysJohnHasNotRuled();
}

selfRun(import.meta.url, run);
export default run;
