// DeepBench v7.0.236 | tests/regression/SES-177b-standing-brief-block.js | SES-177 (b)
//
// Guards scripts/render-standing-brief.js and the generated block inside
// docs/runbooks/standing-brief.md.
//
// The predicates are IMPORTED from the real script rather than reimplemented, per John's rule
// 2026-08-23 ("you should never be throwing away tests") and the DIR-603f44ea / SES-176 precedent: a
// test that copies the logic it guards passes forever while the shipped file rots.
//
// THE TWO ASSERTIONS THAT MATTER are both exercised END-TO-END against the real script rather than by
// reading its source, because both protect a file this platform has already destroyed once in a
// second costume (v7.0.197: a rebuild from a source that did not cover the whole file published a
// tidy skeleton over real content):
//
//   1. ONLY BYTES BETWEEN THE MARKERS MAY MOVE. The hand-maintained judgment paragraph is 53% of what
//      CLAUDE-STATE.md used to be and NO TABLE HOLDS IT. spliceBlock() therefore re-splits its own
//      output and compares head and tail with what it read; a block that would disturb either is
//      refused. Asserted with a block that CONTAINS the END marker -- the one input that actually
//      moves the tail -- and with a byte-identical control that must render.
//   2. FAIL CLOSED WITHOUT THE JUDGMENT PROSE. The "**Next session:**" sentinel removed -> exit 2,
//      file byte-identical, restored in a finally.
//
// Both run WITHOUT credentials on purpose: those branches sit above the env check in the script, so a
// machine with no Supabase keys still exercises the code that protects the file.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import {
  BEGIN, END, JUDGMENT_SENTINEL,
  splitOnMarkers, keepsJudgmentProse, spliceBlock, renderBlock, census, pct,
  asOf, factsSha, shaFromBlock,
} from "../../scripts/render-standing-brief.js";

// A FIXED clock, because renderBlock() takes the timestamp as an argument. A renderer that read
// `new Date()` internally could not be asserted at all -- which is why it does not.
const T1 = "2026-08-24T23:35:00.000Z";
const T2 = "2026-08-25T04:05:00.000Z";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BRIEF = path.join(ROOT, "docs/runbooks/standing-brief.md");
const SCRIPT = path.join(ROOT, "scripts/render-standing-brief.js");

// ---------------------------------------------------------------------------
// The shipped file
// ---------------------------------------------------------------------------
function theShippedBriefCarriesBothHalves() {
  assert.ok(fs.existsSync(BRIEF), "docs/runbooks/standing-brief.md must exist");
  const brief = fs.readFileSync(BRIEF, "utf8");

  const [, body] = splitOnMarkers(brief);
  assert.ok(body.length > 400,
    `the generated block is ${body.length} chars -- an empty or near-empty block means a render was skipped or failed silently`);

  const para = brief.split("\n").find(l => l.startsWith(JUDGMENT_SENTINEL));
  assert.ok(para, "the standing brief must still carry the hand-maintained '**Next session:**' paragraph");
  assert.ok(para.length > 5000,
    `the judgment paragraph is ${para.length} chars; it was 7,715 at the v7.0.228 move. A large drop means the generated block ate it, which is the one thing this whole design forbids.`);

  // The block must sit ABOVE the judgment prose: a reader hitting the stale sentence first is the
  // defect this ship exists to fix. Compared by LINE, not by indexOf on the raw text -- the file's
  // own header comment quotes the sentinel, and a raw indexOf finds that quote (which is how the
  // line-anchoring defect in keepsJudgmentProse was found).
  const lines = brief.split("\n");
  const beginLine = lines.findIndex(l => l.includes(BEGIN));
  const proseLine = lines.findIndex(l => l.startsWith(JUDGMENT_SENTINEL));
  assert.ok(beginLine > -1, "the BEGIN marker must be on a line of its own");
  assert.ok(proseLine > beginLine,
    `the generated block (line ${beginLine + 1}) must appear BEFORE the hand-maintained paragraph (line ${proseLine + 1})`);
}

// ---------------------------------------------------------------------------
// The marker split -- with its negative controls
// ---------------------------------------------------------------------------
function theMarkerSplitHasTeeth() {
  const good = `head\n${BEGIN}body${END}\ntail`;
  const [h, b, t] = splitOnMarkers(good);
  assert.strictEqual(h, "head\n");
  assert.strictEqual(b, "body");
  assert.strictEqual(t, "\ntail");

  assert.throws(() => splitOnMarkers(`head${END}tail`), /BEGIN marker is missing/);
  assert.throws(() => splitOnMarkers(`head${BEGIN}tail`), /END marker is missing/);
  assert.throws(() => splitOnMarkers(`${END}x${BEGIN}`), /precedes/);
  assert.throws(() => splitOnMarkers(`${BEGIN}a${BEGIN}b${END}`), /more than once/);
  assert.throws(() => splitOnMarkers(`${BEGIN}a${END}b${END}`), /more than once/);
}

function theJudgmentPredicateHasTeeth() {
  const brief = fs.readFileSync(BRIEF, "utf8");
  assert.strictEqual(keepsJudgmentProse(brief), true, "the real file must satisfy the predicate");

  const stripped = brief.split(JUDGMENT_SENTINEL).join("**Something else:**");
  assert.notStrictEqual(stripped, brief, "the mutation changed nothing -- the control is vacuous");
  assert.strictEqual(keepsJudgmentProse(stripped), false, "a file without the sentinel must fail the predicate");
  assert.strictEqual(keepsJudgmentProse(""), false, "an empty file must fail the predicate");
  assert.strictEqual(keepsJudgmentProse(null), false, "a non-string must fail the predicate, not throw");

  // THE CONTROL THAT CAUGHT A REAL DEFECT IN THIS SHIP. The predicate's first form was a bare
  // `includes`, and the script's own header comment quotes the sentinel while explaining the rule --
  // so a brief whose judgment paragraph was deleted still passed, because the explanation of the
  // check satisfied the check. Only a line that STARTS with the sentinel counts.
  assert.strictEqual(
    keepsJudgmentProse(`<!-- refuses if the "${JUDGMENT_SENTINEL}" sentinel is gone -->\nno paragraph here\n`),
    false,
    "a MENTION of the sentinel inside a comment must not satisfy the predicate -- only a real paragraph line does");
  assert.strictEqual(keepsJudgmentProse(`${JUDGMENT_SENTINEL} the real paragraph\n`), true,
    "a real paragraph line must satisfy the predicate");
}

// ---------------------------------------------------------------------------
// THE GUARANTEE: a splice may never move a byte outside the markers.
// ---------------------------------------------------------------------------
function aSpliceThatWouldMoveTheTailIsRefused() {
  const original = `head\n${BEGIN}old${END}\n${JUDGMENT_SENTINEL} the prose that must survive\n`;

  // Control: an ordinary block round-trips and leaves head and tail alone.
  const ok = spliceBlock(original, "\nfresh\n");
  const [h, b, t] = splitOnMarkers(ok);
  assert.strictEqual(h, "head\n", "the head must be untouched by an ordinary splice");
  assert.strictEqual(b, "\nfresh\n", "the block must round-trip");
  assert.ok(t.includes(JUDGMENT_SENTINEL), "the tail must still carry the judgment prose");

  // The real hazard: a block carrying a marker terminates the region early, which would silently
  // relocate everything after it. Both smuggling routes are refused.
  //
  // WHICH ARM FIRES, stated honestly rather than overclaimed: it is splitOnMarkers()'s
  // "appears more than once" check, not the head/tail byte-compare beneath it. The compare is
  // therefore defence-in-depth that no input currently reaches -- and it is kept, because it is what
  // makes "only bytes between the markers may move" true by construction rather than true only as
  // long as splitOnMarkers stays strict. An editor who loosens the duplicate check finds the
  // compare standing behind it; one who deletes the compare because "nothing hits it" removes the
  // guarantee and keeps the tests green.
  assert.throws(() => spliceBlock(original, `\nfresh${END}smuggled\n`),
    /more than once|OUTSIDE the markers|round-trip/,
    "a block containing the END marker must be refused, not written");
  assert.throws(() => spliceBlock(original, `\nfresh${BEGIN}smuggled\n`),
    /more than once|OUTSIDE the markers|round-trip/,
    "a block containing the BEGIN marker must be refused, not written");

  // The head/tail compare itself, asserted directly on the predicate it protects: a well-formed
  // splice must leave head and tail byte-identical to what was read.
  const [h0, , t0] = splitOnMarkers(original);
  const [h1, , t1] = splitOnMarkers(spliceBlock(original, "\nanything at all\n"));
  assert.strictEqual(h1, h0, "head must be byte-identical across a splice");
  assert.strictEqual(t1, t0, "tail must be byte-identical across a splice");

  // ...and a result that lost the judgment prose is refused even if the markers are well-formed.
  const noProse = `head\n${BEGIN}old${END}\n`;
  assert.throws(() => spliceBlock(noProse, "\nfresh\n"), /judgment prose/,
    "a splice whose result carries no judgment prose must be refused");
}

// ---------------------------------------------------------------------------
// END-TO-END: the real script refuses, and writes nothing.
// ---------------------------------------------------------------------------
function theRendererRefusesWithoutTheJudgmentProse() {
  const before = fs.readFileSync(BRIEF);
  const mutated = before.toString("utf8").split(JUDGMENT_SENTINEL).join("**Something else:**");
  assert.notStrictEqual(mutated, before.toString("utf8"), "the mutation changed nothing -- the control is vacuous");

  let exitCode = 0;
  try {
    fs.writeFileSync(BRIEF, mutated);
    try {
      execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: "pipe" });
    } catch (e) {
      exitCode = e.status;
    }
    assert.strictEqual(exitCode, 2,
      "a brief with no judgment prose must exit 2 (could not run), never 0 and never a silent render");
    assert.strictEqual(fs.readFileSync(BRIEF, "utf8"), mutated,
      "the file must be byte-identical after the refusal -- refusing means writing nothing");
  } finally {
    fs.writeFileSync(BRIEF, before);
  }
  assert.ok(fs.readFileSync(BRIEF).equals(before), "the test must restore the file it mutated");
}

function theRendererRefusesWithoutMarkers() {
  const before = fs.readFileSync(BRIEF);
  const mutated = before.toString("utf8").split(BEGIN).join("<!-- marker removed by test -->");

  let exitCode = 0;
  try {
    fs.writeFileSync(BRIEF, mutated);
    try {
      execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: "pipe" });
    } catch (e) {
      exitCode = e.status;
    }
    assert.strictEqual(exitCode, 2, "a missing BEGIN marker must exit 2, never a silent render");
    assert.strictEqual(fs.readFileSync(BRIEF, "utf8"), mutated, "the file must be byte-identical after the refusal");
  } finally {
    fs.writeFileSync(BRIEF, before);
  }
}

// ---------------------------------------------------------------------------
// The render itself, on fixtures -- no network, no credentials.
// ---------------------------------------------------------------------------
const ITEMS = [
  { id: "i1", backlog_id: "SES-1", status: "open", design_status: null, queue: 1 },
  { id: "i2", backlog_id: "SES-2", status: "open", design_status: "needs-john", queue: 2 },
  { id: "i3", backlog_id: "SES-3", status: "done", design_status: "designed", queue: null },
];
const FACTS = (over = {}) => ({
  items: ITEMS,
  settings: { id: 1, scheduler_on: true, interval_hours: 1, cron_minute: 40, grid_tolerance_min: 10, daily_max_tokens_millions: 40 },
  drain: { directive_id: "d1", epic_name: "Selfbuild M2 - Truth Infrastructure", named: 10, open: 3, openIds: ["SES-136", "SES-176"] },
  ...over,
});

// THE POINT OF THE WHOLE TICKET: the block tracks the table. One variable, two outputs. A build that
// froze the sentence as text -- which is exactly what the hand-maintained paragraph did, and why it
// said "3 hours" while runner_settings said 1 -- passes a completeness check and fails this.
function theSchedulerLineTracksTheTable() {
  const one = renderBlock(FACTS(), T1);
  const three = renderBlock(FACTS({ settings: { ...FACTS().settings, interval_hours: 3 } }), T1);

  assert.ok(one.includes("every **1 hour**"), "interval_hours=1 must render '1 hour'");
  assert.ok(three.includes("every **3 hours**"), "interval_hours=3 must render '3 hours'");
  assert.notStrictEqual(one, three, "the two renders must differ -- otherwise the line is frozen text");

  const off = renderBlock(FACTS({ settings: { ...FACTS().settings, scheduler_on: false } }), T1);
  assert.ok(off.includes("**OFF**"), "scheduler_on=false must render OFF rather than a quiet 'on'");
}

// NULL is not zero, and it is not "no cap of zero tokens" -- SES-147's rule, asserted here because
// the coercion is the tempting one-character bug.
function aBlankDailyMaxIsNotZero() {
  const blank = renderBlock(FACTS({ settings: { ...FACTS().settings, daily_max_tokens_millions: null } }), T1);
  assert.ok(blank.includes("**not set**"), "a NULL daily max must render 'not set'");
  assert.ok(!/\b0M tokens\b/.test(blank), "a NULL daily max must never render as 0M -- a number John never typed");
}

function aMissingDrainAndMissingSettingsAreSaidPlainly() {
  const none = renderBlock(FACTS({ drain: null, settings: null }), T1);
  assert.ok(none.includes("No drain standing"), "no drain must be stated, not omitted");
  assert.ok(none.includes("fails **open**"), "a missing settings row must name the fail-open behaviour rather than look broken");
}

function theBlockIsDeterministicForAGivenClock() {
  assert.strictEqual(renderBlock(FACTS(), T1), renderBlock(FACTS(), T1),
    "the block must be byte-identical for identical facts AND an identical clock -- otherwise nothing about it is assertable");
}

// JOHN'S SPEC, ASSERTED. Gated card 8c0f2bf9, Accept 2026-08-24T23:08:29Z: "every generated line
// carries an 'as of <timestamp>'". The first build of this script omitted it on a determinism
// argument; his word outranks that, so the omission is now a test failure rather than a preference.
function everyGeneratedGroupCarriesAnAsOfStamp() {
  const block = renderBlock(FACTS(), T1);
  const stamp = asOf(T1);
  assert.ok(block.includes(stamp), `the block must carry the rendered stamp (${stamp})`);

  // Not just once, and not just in the provenance footer: each fact group John named carries it.
  for (const group of ["Board census", "`design_status` among OPEN tickets",
                       "Scheduler and automation settings", "Standing epic drain", "Provenance"]) {
    const line = block.split("\n").find(l => l.includes(group));
    assert.ok(line, `the block must carry a "${group}" group`);
    assert.ok(line.includes("as of "), `the "${group}" group must carry an "as of" stamp -- John's spec`);
  }

  // The stamp is LIVE, not frozen text: a different clock renders a different stamp.
  assert.notStrictEqual(renderBlock(FACTS(), T1), renderBlock(FACTS(), T2),
    "a different clock must render a different stamp -- a frozen stamp is the stale-number defect again");

  // Both clocks, per the display rule: UTC for the ledger, CST labelled for John.
  assert.ok(/as of 2026-08-24 23:35Z \(/.test(stamp), `the stamp must carry UTC: ${stamp}`);
  assert.ok(/CST\)/.test(stamp), `the stamp must label the CST half: ${stamp}`);
  assert.throws(() => asOf("not-a-date"), /not a date/, "an unparseable clock must throw, never render 'Invalid Date'");
}

// --check must answer "do the FACTS still match", never "are the bytes identical" -- a stamp in the
// body makes a byte-diff fire on every run, and a check that always fires is ignored within a day.
function driftIsAFactsQuestionNotAByteQuestion() {
  const b1 = renderBlock(FACTS(), T1);
  const b2 = renderBlock(FACTS(), T2);
  assert.notStrictEqual(b1, b2, "the control is vacuous unless the two blocks really differ");
  assert.strictEqual(shaFromBlock(b1), shaFromBlock(b2),
    "the same facts under different clocks must carry the SAME sha -- otherwise --check reports drift on a stamp refresh");

  const moved = renderBlock(FACTS({ items: [...ITEMS, { id: "i4", backlog_id: "SES-4", status: "open", design_status: null, queue: 3 }] }), T1);
  assert.notStrictEqual(shaFromBlock(moved), shaFromBlock(b1),
    "a board that actually moved must change the sha -- otherwise --check never fires");

  assert.strictEqual(shaFromBlock("no sha here"), null, "a block with no sha must return null, not throw");
  assert.strictEqual(factsSha(FACTS()).slice(0, 16), shaFromBlock(b1),
    "the sha embedded in the block must be the one factsSha() computes -- the two must not drift apart");
}

function theCensusHelpersAreOrderedAndCountNulls() {
  const c = census(ITEMS, "design_status");
  const asObj = Object.fromEntries(c);
  assert.strictEqual(asObj.NULL, 1, "a null must be counted under the NULL label, never dropped");
  assert.strictEqual(asObj["needs-john"], 1);
  // stable order: count desc, then key asc -- so the block does not churn between runs
  const counts = c.map(([, n]) => n);
  assert.deepStrictEqual(counts, [...counts].sort((a, b) => b - a), "census must be ordered by count descending");
  assert.strictEqual(pct(1, 4), "25%");
  assert.strictEqual(pct(1, 0), "—", "a zero denominator must not render NaN");
}

async function run() {
  theShippedBriefCarriesBothHalves();
  theMarkerSplitHasTeeth();
  theJudgmentPredicateHasTeeth();
  aSpliceThatWouldMoveTheTailIsRefused();
  theRendererRefusesWithoutTheJudgmentProse();
  theRendererRefusesWithoutMarkers();
  theSchedulerLineTracksTheTable();
  aBlankDailyMaxIsNotZero();
  aMissingDrainAndMissingSettingsAreSaidPlainly();
  theBlockIsDeterministicForAGivenClock();
  everyGeneratedGroupCarriesAnAsOfStamp();
  driftIsAFactsQuestionNotAByteQuestion();
  theCensusHelpersAreOrderedAndCountNulls();
}

export default run;
selfRun(import.meta.url, run);
