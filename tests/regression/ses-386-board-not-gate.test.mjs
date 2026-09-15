// DeepBench v7.0.487 | tests/regression/ses-386-board-not-gate.test.mjs | SES-386
//
// FEATURE: SES-386 -- A GUARD GRADES THE CHANGE, NOT THE BOARD. Three guards (`ses-334` part (d),
// `ses-285` assertion 6, `ses-373` assertion 1) had each grown a clause that read LIVE BOARD STATE
// no code in this repo writes, and each could therefore go red on a day nobody had changed a line:
//
//   * ses-334 (d) demanded a POSITIVE `est_tokens_dev` among the newest FIVE scheduled re-rank
//     rows. The last measured run is 2026-09-09T21:17Z at 8088; six unmeasured runs shipped after
//     it, so the measurement scrolled out of the window and the suite went red on the calendar.
//   * ses-285 (6) and ses-373 (1) demanded zero open `needs-john` tickets and zero undecided
//     `gated_before_build` cards. Nothing under `api/`, `src/`, `shared/`, `lib/` or `scripts/`
//     writes either column (grep, 2026-09-15) -- they are moved by a human -- so a red told a
//     builder to go and edit board rows until the suite turned green.
//
// THIS FILE GUARDS THE FIX ITSELF, which is the half a retarget usually leaves unguarded: the
// counts must still be VISIBLE (a gate that blocks silently is the thing the clauses existed to
// prevent), and the three guards must not quietly grow the live reads back.
//
// THREE PARTS, all in-process except (iii)'s file read; nothing here touches the network, so this
// guard cannot itself become a test of today's board.
//   (i)   renderHumanGates() over the three branches, asserted PAIRWISE DIFFERENT. "Not read",
//         "measured zero" and "two cards are waiting" are three different facts and a renderer that
//         blurs any two of them is the original defect wearing a different hat -- the same reason
//         SES-334's own block asserts `notRead !== noneServing`.
//   (ii)  THE LINT, which is the part that keeps this fix from rotting. It is the grep, not a
//         reading of intent: neither PostgREST filter may reappear in any of the three files.
//   (iii) The brief actually carries the block -- because (i) proves the renderer can produce it
//         and proves nothing at all about whether anybody ran it.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied: nothing here asserts that the
// rendered counts are CORRECT against live rows. That is deliberate and it is the whole ticket --
// fetchFacts() runs the same two filters the guards used to run, and asserting their result here
// would re-create the exact dependency on board state this ship removed. The counts are reported
// for a human to read; they are not a gate, and this guard does not make them one.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { selfRun } from "./_lib/self-run.js";
import { renderHumanGates, HUMAN_GATE_IDS_SHOWN } from "../../scripts/render-standing-brief.js";
import { HUMAN_GATES_HEADING, humanGatesBlock } from "./ses-285-m6-autonomy.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BRIEF = path.join(ROOT, "docs/runbooks/standing-brief.md");
const STAMP = "as of 2026-09-15 10:19Z (Sep 15, 5:19 AM CST)";

// The two PostgREST filters that must not come back into a regression guard. Written as the exact
// query text the three files used to send, because that is what a copy-paste would reintroduce.
export const BOARD_READS = [
  "design_status=eq.needs-john",
  "kind=eq.gated_before_build&decision=is.null",
];

// The three files whose clauses SES-386 retargeted. Named, never globbed: a glob would silently
// stop covering a file that was renamed, and "the lint found nothing" would look identical.
export const RETARGETED_GUARDS = [
  "tests/regression/ses-334-served-class-block.test.mjs",
  "tests/regression/ses-285-m6-autonomy.test.mjs",
  "tests/regression/ses-373-card-only-self-decides.test.mjs",
];

// ---------------------------------------------------------------------------
// (i) the renderer, all three branches
// ---------------------------------------------------------------------------

function theThreeBranchesAreDistinct() {
  const notRead = renderHumanGates(undefined, STAMP);
  const zero = renderHumanGates({ needsJohn: [], undecidedCards: [] }, STAMP);
  const busy = renderHumanGates(
    { needsJohn: ["SES-401", "SES-402"], undecidedCards: ["7d3b1fb3-0000-4000-8000-000000000001"] },
    STAMP,
  );

  assert.ok(/was not read for this render/.test(notRead),
    "an unread gate state must SAY so -- 'not read' and 'nothing is waiting on a human' are opposite " +
    "facts and the second one is the one this project keeps needing to trust");
  assert.ok(!/Nothing blocks on a human/.test(notRead),
    "an unread gate state must not render the measured-zero sentence");

  assert.ok(/Nothing blocks on a human/.test(zero),
    "a genuine zero is a real state and must be said as a MEASURED one");
  assert.ok(/\*\*0 open `needs-john` ticket\(s\)\*\*/.test(zero)
    && /\*\*0 undecided `gated_before_build` card\(s\)\*\*/.test(zero),
    "the zero branch must still name BOTH counts -- ses-285 assertion 6 grades exactly that pair");

  assert.ok(busy.includes("`SES-401`") && busy.includes("`SES-402`"),
    "a non-zero count must print the IDS -- a number with no handle is something a reader cannot act on");
  assert.ok(busy.includes("`7d3b1fb3-0000-4000-8000-000000000001`"),
    "the undecided cards must be named too, not just counted");
  assert.ok(/\*\*2 open `needs-john` ticket\(s\)\*\*/.test(busy)
    && /\*\*1 undecided `gated_before_build` card\(s\)\*\*/.test(busy),
    "the non-zero branch must name both counts in the same shape assertion 6 reads");
  assert.ok(/Open is not wrong/.test(busy),
    "an open gate must be said to be a legitimate board state -- without that sentence the block " +
    "reads as a failure report and the red comes back through the reader instead of the suite");

  // PAIRWISE DIFFERENT. Two of these being byte-identical is the exact failure the group exists to
  // prevent, and only comparing all three pairs catches the one that collapsed.
  assert.notStrictEqual(notRead, zero, "the unread and measured-zero branches must not render identically");
  assert.notStrictEqual(zero, busy, "the measured-zero and populated branches must not render identically");
  assert.notStrictEqual(notRead, busy, "the unread and populated branches must not render identically");

  // The cap is part of the contract: a board with 400 undecided cards must not print 400 uuids into
  // a file a human reads, and the reader must be told how many were left out.
  const many = renderHumanGates(
    { needsJohn: Array.from({ length: HUMAN_GATE_IDS_SHOWN + 3 }, (_, i) => `SES-${500 + i}`), undecidedCards: [] },
    STAMP,
  );
  assert.ok(many.includes(`SES-${500 + HUMAN_GATE_IDS_SHOWN - 1}`), "the first N ids must be listed");
  assert.ok(!many.includes(`SES-${500 + HUMAN_GATE_IDS_SHOWN}`), `only ${HUMAN_GATE_IDS_SHOWN} ids may be listed`);
  assert.ok(/…and 3 more/.test(many), "the ids that were NOT listed must be counted, never silently dropped");

  console.log(`  (i) renderHumanGates: unread / measured-zero / populated all distinct, ids printed, ` +
    `cap ${HUMAN_GATE_IDS_SHOWN} holds -- PASS`);
}

// ---------------------------------------------------------------------------
// (ii) the lint -- the reads must not come back
// ---------------------------------------------------------------------------

function noGuardReadsTheBoardForAHumanGate() {
  for (const rel of RETARGETED_GUARDS) {
    const abs = path.join(ROOT, rel);
    assert.ok(fs.existsSync(abs), `${rel} is missing -- a retarget that deleted the guard is the one ` +
      "thing STANDARDS.md Section 4 clause 1 forbids");
    const src = fs.readFileSync(abs, "utf8");
    for (const filter of BOARD_READS) {
      assert.ok(!src.includes(filter),
        `${rel} contains the PostgREST filter \`${filter}\`. That read grades LIVE BOARD STATE no ` +
        "code in this repo writes, so the guard goes red on a day nothing changed and the only way " +
        "to green it is to edit board rows. It has exactly one home now: fetchFacts() in " +
        "scripts/render-standing-brief.js, rendered as the Human gates block.");
    }
  }

  // THE NEGATIVE CONTROL. Without it this lint passes just as happily against a typo in either
  // filter string, which would make it grep for something no file could ever contain.
  const canary = `x ${BOARD_READS[0]} y`;
  assert.ok(BOARD_READS.some(f => canary.includes(f)),
    "the lint's own filter strings must be able to MATCH something -- a typo'd needle finds nothing " +
    "and reports a clean sweep");

  console.log(`  (ii) lint: ${RETARGETED_GUARDS.length} retargeted guards, 0 of ${BOARD_READS.length} ` +
    "board-state filters present -- PASS");
}

// ---------------------------------------------------------------------------
// (iii) the block is actually in the brief
// ---------------------------------------------------------------------------

function theBriefCarriesTheBlock() {
  const brief = fs.readFileSync(BRIEF, "utf8");
  const block = humanGatesBlock(brief);
  assert.ok(block,
    `docs/runbooks/standing-brief.md carries no "${HUMAN_GATES_HEADING}" block -- re-run ` +
    "scripts/render-standing-brief.js with a service key. Part (i) proves the renderer CAN produce " +
    "it and proves nothing whatever about anybody having run it");
  assert.ok(/\*\*\d+ open `needs-john` ticket\(s\)\*\*/.test(block)
    && /\*\*\d+ undecided `gated_before_build` card\(s\)\*\*/.test(block),
    "the rendered block must name BOTH counts -- one of the two missing is a gate that blocks silently");
  assert.ok(!/was not read for this render/.test(block),
    "the committed brief must carry MEASURED counts, not the unread branch -- a brief rendered " +
    "without a service key reports nothing and must not be shipped as though it reported zero");
  console.log("  (iii) the standing brief carries a measured Human gates block naming both counts -- PASS");
}

async function run() {
  theThreeBranchesAreDistinct();
  noGuardReadsTheBoardForAHumanGate();
  theBriefCarriesTheBlock();
}

selfRun(import.meta.url, run);
export default run;
