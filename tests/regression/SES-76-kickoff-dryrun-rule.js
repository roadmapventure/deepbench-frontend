// DeepBench v7.0.266 | tests/regression/SES-76-kickoff-dryrun-rule.js | SES-76
//
// Guards STANDARDS.md Section 4's dry-run rule: a kickoff's Section 8 test must be RUN against the
// current, unchanged source before the kickoff doc commits, and every content assertion must FAIL
// there.
//
// FOUND LIVE in S-MOB-15: the kickoff's T1 slice anchored on `.lav-medges`, whose first occurrence
// is a prose mention in a CSS comment ABOVE the target rule, so slice(start, end) with start > end
// returned "" and both assertions could never pass. The coding session caught it and re-anchored.
//
// WHAT THIS TICKET ACTUALLY CLOSED, because it is not what the title suggests: the practice was
// ALREADY WORKING and already measured three times over (LAV-36's 8-of-10, LAV-38/MOB-21's `}`
// inside `${T.brass}`, LAV-39/LOG-133's comment-line filter) -- and it lived ONLY in docs/SESSIONS.md
// prose. A rule with three measured saves and no canonical home is the rule-text-with-no-home shape
// SES-200's check 12 detects, one level up: the two files a design session actually reads said
// nothing. Verified silent on origin/dev before the change: `grep -niE "dry.?run"` over
// docs/STANDARDS.md and CLAUDE-DESIGN.md returned zero hits.
//
// THIS FILE OBEYS SECTION 4'S OWN OPENING RULE (SES-45): it does not restate the dry-run rule and
// then check its own restatement. It READS the shipped docs/STANDARDS.md and CLAUDE-DESIGN.md and
// asserts the text that actually shipped. If either changed tomorrow, this notices.
//
// THE HALF AN EDITOR WILL DELETE AS REDUNDANT: `claude-design-points-not-restates` asserts BOTH that
// CLAUDE-DESIGN.md Step 4 carries the step AND that it does NOT carry a second full copy of the bar.
// Dropping the negative half is exactly how a pointer becomes a duplicate procedure home -- the
// defect SES-200's check 13 exists to catch -- and a presence-only assertion passes just as happily
// against the copy as against the pointer.
//
// PLUS A STRUCTURAL GUARD WITH ITS OWN HISTORY: `step-4-item-11-unmoved`. Step 4's SES-46 clause
// refers to "Step 4.11" by number, so the new item had to be inserted AFTER 11, never at it. A
// renumber that silently breaks a cross-reference is the same class of defect as the empty slice
// this whole rule is about -- a reference that no longer points where it says it does.
//
// FILE-LEVEL NEGATIVE CONTROL, measured by the cycle that shipped it: against origin/dev's
// pre-change docs, all six clauses fail.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STANDARDS = path.join(ROOT, "docs/STANDARDS.md");
const DESIGN = path.join(ROOT, "CLAUDE-DESIGN.md");

const RULE_START = "### The kickoff's own test is dry-run before the kickoff commits";
const RULE_END = "### Test Categories";

const CHECKLIST_START = "**Kickoff doc compliance check before issuing:**";
const CHECKLIST_END = "## Section 4:";

export const norm = s => s.replace(/\s+/g, " ");

export function extractRule(md) {
  const a = md.indexOf(RULE_START);
  if (a < 0) return "";
  const b = md.indexOf(RULE_END, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

export function extractChecklist(md) {
  const a = md.indexOf(CHECKLIST_START);
  if (a < 0) return "";
  const b = md.indexOf(CHECKLIST_END, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

// Step 4's numbered list, from item 10 through the save item.
export function extractStep4Tail(md) {
  const a = md.indexOf("\n11. Write kickoff doc");
  if (a < 0) return "";
  const b = md.indexOf("\n\n", a + 1);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

// Each clause: `test` over the shipped text, `breaks` = its own negative control.
export const CLAUSES = [
  {
    id: "states-the-bar",
    where: "rule",
    detail: "the block must require the kickoff's test to be RUN against unchanged source before " +
            "the kickoff doc commits -- writing the test is not verifying it",
    test: s => /must be RUN against the current, unchanged source/i.test(s) &&
               /before the kickoff\s*(doc)?\s*commits/i.test(s),
    breaks: s => s.replace(/must be RUN against the current, unchanged source/i,
                           "should ideally be reviewed"),
  },
  {
    id: "requires-failure-on-unchanged-source",
    where: "rule",
    detail: "it must demand every content assertion FAIL pre-change, not merely that the test " +
            "executes -- a test that runs and passes has measured nothing about the change",
    test: s => /every content assertion must FAIL/i.test(s),
    breaks: s => s.replace(/every content assertion must FAIL there/i,
                           "the test must complete without error"),
  },
  {
    id: "names-the-empty-slice",
    where: "rule",
    detail: "it must name the empty-slice mechanism (start > end yields \"\") rather than only the " +
            "ceremony -- the reader has to be able to recognise the defect, not just perform a step",
    test: s => /start\s*>\s*end/.test(s) && /vacuous/i.test(s),
    breaks: s => s.replace(/where the anchor's first occurrence sits \*after\* the\s*intended one gives `start > end` and returns `""`/i,
                           "may not match what you expected"),
  },
  {
    id: "carries-the-evidence",
    where: "rule",
    detail: "it must cite S-MOB-15 as found-live rather than asserting the rule bare -- a rule " +
            "with no measurement behind it is the first thing a later session argues away",
    test: s => /S-MOB-15/.test(s) && /lav-medges/i.test(s),
    breaks: s => s.replace(/S-MOB-15/g, "an earlier session"),
  },
  {
    id: "checklist-has-the-box",
    where: "checklist",
    detail: "Section 3's issuing checklist must carry a dry-run line -- a rule absent from the " +
            "list a design session ticks before issuing is a rule that gets skipped",
    test: s => /dry-run against unchanged source/i.test(s),
    // NB: clause text is normalized (whitespace collapsed), so this control must not anchor on a
    // newline -- the first draft did, matched nothing, and the vacuous-control assertion caught it.
    breaks: s => s.replace(/dry-run against unchanged source/i, "is full code"),
  },
  {
    id: "claude-design-points-not-restates",
    where: "step4",
    detail: "CLAUDE-DESIGN.md Step 4 must carry the dry-run step AND cite STANDARDS.md Section 4 " +
            "for the bar, AND must not carry a second full copy of it -- a pointer that grows into " +
            "a copy is the duplicate-procedure-home defect",
    test: s => /Dry-run the kickoff's own Section 8 test/i.test(s) &&
               /STANDARDS\.md.{0,20}Section 4/i.test(s) &&
               // the negative half: the bar's own operative sentence must NOT be restated here
               !/every content assertion must FAIL/i.test(s),
    breaks: s => s.replace(/read it there rather than re-deriving it here/i,
                           "every content assertion must FAIL there"),
  },
];

function textFor(where, docs) {
  if (where === "rule") return norm(extractRule(docs.standards));
  if (where === "checklist") return norm(extractChecklist(docs.standards));
  if (where === "step4") return norm(extractStep4Tail(docs.design));
  throw new Error(`unknown clause site: ${where}`);
}

export function evaluate(docs) {
  return CLAUSES.map(c => ({ id: c.id, ok: c.test(textFor(c.where, docs)) }));
}

export default async function run() {
  const docs = {
    standards: fs.readFileSync(STANDARDS, "utf8"),
    design: fs.readFileSync(DESIGN, "utf8"),
  };

  // If an anchor moved, this guard is checking nothing -- say so loudly rather than passing.
  assert.ok(extractRule(docs.standards).length > 0,
    "SES-76: STANDARDS.md Section 4's dry-run rule block is missing -- the anchor moved, so this " +
    "guard is checking nothing");
  assert.ok(extractChecklist(docs.standards).length > 0,
    "SES-76: STANDARDS.md Section 3's compliance checklist is missing -- anchor moved");
  assert.ok(extractStep4Tail(docs.design).length > 0,
    "SES-76: CLAUDE-DESIGN.md Step 4's item-11 tail is missing -- anchor moved");

  for (const c of CLAUSES) {
    const text = textFor(c.where, docs);
    assert.ok(c.test(text), `SES-76 clause '${c.id}' FAILED: ${c.detail}`);

    const mutated = c.breaks(text);
    assert.notStrictEqual(mutated, text,
      `SES-76 control for '${c.id}' is VACUOUS -- it changed nothing, so it proves nothing`);
    assert.ok(!c.test(mutated),
      `SES-76 control for '${c.id}' has no teeth -- the clause still passes with its subject removed`);
  }

  // Structural: Step 4's SES-46 clause cites "Step 4.11" by number, so item 11 must still be the
  // write-the-kickoff step and the dry-run must sit AFTER it.
  const tail = extractStep4Tail(docs.design);
  assert.match(tail, /^\s*11\. Write kickoff doc with all 11 required sections/,
    "SES-76: CLAUDE-DESIGN.md Step 4 item 11 is no longer 'Write kickoff doc' -- Step 4's own " +
    "SES-46 clause cites 'Step 4.11' by number, so a renumber there silently breaks that reference");
  assert.match(tail, /12\. \*\*Dry-run the kickoff's own Section 8 test/,
    "SES-76: the dry-run step is not item 12 -- it must follow item 11, never replace it");
  assert.match(tail, /13\. Save to `docs\/kickoffs\//,
    "SES-76: the save step must follow the dry-run -- dry-running after the doc is saved loses the " +
    "whole point, which is re-anchoring while the kickoff is still being written");

  return true;
}

selfRun(import.meta.url, run);
