// DeepBench v7.0.506 | tests/regression/ses-385-remainder-stranded.test.mjs | SES-385 slice 1 --
// A SHIPPED SLICE MUST STOP ADVERTISING A DESIGN THAT IS ALREADY BUILT.
//
// THE DEFECT, measured on the live board 2026-09-16 rather than argued: `SES-396` reads
// `status = 'delivered'`, `design_status = 'designed'` and a `kickoff_link` pointing at a kickoff
// that has already been executed -- a spent design still advertised as the one to build from. 47
// closed rows carried `designed`, up from 35 the day before, because the close-out bullet in
// docs/runbooks/runner-cycle.md had no clause that touched the flag at all. Nothing wrote it down
// at ship; that is the whole defect. This slice is the two halves that do not need `SES-402`: the
// runbook rule, and the census check that finds the rows where the rule was not followed.
//
// WHAT IS PINNED HERE, and why each arm can actually go red:
//
// (A) THE CHECK, over a four-row board built one variable at a time, asserted by ID and never by
// count. A count is exactly what a check that stopped firing still satisfies once another arm
// moves. The two positives are the two structural halves of the discriminator -- a closed row that
// came in UNDER its own quote, and a closed row with an UNDECIDED `gated_before_build` card -- and
// the two negatives are the pair the check is most likely to swallow: a closed row that spent its
// whole quote with no open card, and an OPEN row under its quote (the check is closed-only, or
// every in-flight ticket on the board reads as stranded every night).
//
// (B) THE CONTROLS, one per half, each a single mutation of the same fixture that must flip its
// own row and no other: raise the actual to the quote and the first positive must LEAVE the list;
// decide the card and the second must. Without those, a check hard-coded to flag every closed row
// passes (A) completely.
//
// (C) THE WIDENED READ, which is the one change here that could silently invert a check that was
// already green. `readBoard`'s `runner_items` read dropped `decided_at=not.is.null` so one read
// serves both the Accepts and the open gated cards, so an UNDECIDED card must not be mistaken for
// an Accept: the fixture's gated row is `delivered` and 48 h old, and `delivered-unaccepted` must
// still name it. The source arm asserts the query itself -- `kind` selected, no `decided_at`
// filter -- because the live REST call is not exercised in a clean checkout.
//
// (D) THE RUNBOOK RULE, read from the shipped file: the close-out block must carry `partial`,
// "clear `design_status`" and "keep `kickoff_link`", with its own mutation control so a passing
// grep means the clause is there rather than the pattern being broken; plus `SES-336`'s byte
// ceiling re-asserted on the edited file.
//
// Invocation: node tests/regression/ses-385-remainder-stranded.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { classifyBoard, CHECKS } from "../../scripts/ticket-owner.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const SCRIPT_REL = "scripts/ticket-owner.js";
const CEILING = 381_000;

const NOW = "2026-09-16T12:00:00Z";
const RATE = 0.5;

// Four rows, one variable each. Everything not under test is identical across them -- same type,
// same size stamp, same cost snapshot, same filing date well past every fence -- so a difference in
// the result is a difference in the one column the row exists to vary.
const row = (backlog_id, over) => ({
  id: `00000000-0000-4000-8000-0000000003${backlog_id.slice(-2)}`,
  backlog_id, status: "done", type: "Tooling", tier: "next",
  claimed_by: null, claimed_at: null, predicted_cycles: 2, size_stamp: "S",
  design_status: "designed", kickoff_link: "docs/kickoffs/v0.0.0-fixture.md",
  cost_pct_snapshot: 0.5, cost_cycles_snapshot: 1, revalidated_at: NOW,
  filed_at: "2026-09-10T00:00:00+00:00", created_at: "2026-09-10T00:00:00+00:00",
  updated_at: "2026-09-12T00:00:00+00:00", actual_tokens_attended: 0,
  ...over,
});

// (A) done, actual 1 of a quote of 2 -- closed under its own quote.
// (B) delivered, quote spent, but an UNDECIDED gated_before_build card still names it.
// (C) done, actual 2 of 2, no open card -- the row the check must NOT flag.
// (D) open, actual 1 of a quote of 3 -- in flight, and the check is closed-only.
function fixture() {
  return {
    now: NOW,
    rate: RATE,
    board: {
      items: [
        row("SES-385-A"),
        row("SES-385-B", { status: "delivered" }),
        row("SES-385-C"),
        row("SES-385-D", { status: "open", predicted_cycles: 3, design_status: null, kickoff_link: null }),
      ],
      matrix: [
        { backlog_id: "SES-385-A", actual_cycles: 1, predicted_cycles: 2 },
        { backlog_id: "SES-385-B", actual_cycles: 2, predicted_cycles: 2 },
        { backlog_id: "SES-385-C", actual_cycles: 2, predicted_cycles: 2 },
        { backlog_id: "SES-385-D", actual_cycles: 1, predicted_cycles: 3 },
      ],
      verdicts: [
        { backlog_id: "SES-385-A" }, { backlog_id: "SES-385-B" },
        { backlog_id: "SES-385-C" }, { backlog_id: "SES-385-D" },
      ],
      // The widened read's own shape: runner_items rows now arrive undecided as well as decided,
      // carrying `kind`. C's card is DECIDED, so it is an Accept and never an open gate.
      accepts: [
        { backlog_id: "SES-385-B", kind: "gated_before_build", decided_at: null },
        { backlog_id: "SES-385-C", kind: "gated_before_build", decided_at: "2026-09-13T00:00:00+00:00" },
        { backlog_id: "SES-385-D", kind: "gated_before_build", decided_at: null },
      ],
      decisions: [],
      openCycles: [],
    },
  };
}

const ids = (result, check) => result.findings.filter(f => f.check === check).map(f => f.backlog_id).sort();

function classify(board, over = {}) {
  return classifyBoard(board, { now: over.now ?? NOW, rate: over.rate ?? RATE });
}

async function run() {
  // --- the slug itself --------------------------------------------------------------------------
  assert.ok(CHECKS.includes("remainder-stranded"),
    "scripts/ticket-owner.js must carry `remainder-stranded` as a check — without it every id arm below reads as an empty list, which is what a check that never ran looks like");
  assert.strictEqual(CHECKS[CHECKS.length - 1], "remainder-stranded",
    "the new check is the twelfth and LAST entry: findings sort by this index and renderCensus prints one line per slug in this order");
  assert.strictEqual(new Set(CHECKS).size, CHECKS.length, "a duplicated slug would double-print a line and double-sort its findings");

  // --- (A) the four fixture rows, by id ----------------------------------------------------------
  const F = fixture();
  const r = classify(F.board);

  assert.deepStrictEqual(ids(r, "remainder-stranded"), ["SES-385-A", "SES-385-B"],
    "exactly the closed row under its quote and the closed row with an undecided gated_before_build card are stranded");

  for (const id of ["SES-385-A", "SES-385-B"]) {
    const f = r.findings.find(x => x.backlog_id === id && x.check === "remainder-stranded");
    assert.strictEqual(f.verdict, "judgment",
      `${id} must be a JUDGMENT finding — the census writes neither status nor design_status, so there is nothing derivable to write`);
    assert.ok(!("fix" in f),
      `${id} must carry no \`fix\` key at all: a fix object is a write statement, and this check issues none`);
    assert.ok(typeof f.detail === "string" && f.detail.length > 0, `${id} was filed with no detail sentence`);
  }

  // The detail is what a human reads in the ledger, so each half must say which half fired.
  const dA = r.findings.find(f => f.backlog_id === "SES-385-A" && f.check === "remainder-stranded").detail;
  const dB = r.findings.find(f => f.backlog_id === "SES-385-B" && f.check === "remainder-stranded").detail;
  assert.ok(dA.includes("actual_cycles reads 1") && dA.includes("predicted_cycles 2"),
    `the under-quote half must quote both numbers; got: ${dA}`);
  assert.ok(dB.includes("gated_before_build"), `the open-card half must name the card kind; got: ${dB}`);
  assert.ok(dA.includes("design_status designed"), `the detail must carry the flag the rule clears; got: ${dA}`);

  // --- (B) one control per half ------------------------------------------------------------------
  // (i) A spends its whole quote: it must LEAVE the list, and B must stay. A check hard-coded to
  // flag every closed row passes (A) above and fails here.
  const bumped = fixture().board;
  bumped.matrix.find(m => m.backlog_id === "SES-385-A").actual_cycles = 2;
  assert.deepStrictEqual(ids(classify(bumped), "remainder-stranded"), ["SES-385-B"],
    "a closed row that spent its whole quote is not stranded — the arithmetic half must actually read actual_cycles");

  // (ii) B's card is decided: it must LEAVE the list, and A must stay.
  const decided = fixture().board;
  decided.accepts.find(a => a.backlog_id === "SES-385-B").decided_at = "2026-09-15T00:00:00+00:00";
  assert.deepStrictEqual(ids(classify(decided), "remainder-stranded"), ["SES-385-A"],
    "a DECIDED card is not an open gate — the card half must read decided_at, not merely the kind");

  // (iii) B's card is some other kind of card: same direction, different column.
  const otherKind = fixture().board;
  otherKind.accepts.find(a => a.backlog_id === "SES-385-B").kind = "invention";
  assert.deepStrictEqual(ids(classify(otherKind), "remainder-stranded"), ["SES-385-A"],
    "only a gated_before_build card names unbuilt work; every other undecided card would flag half the board");

  // (iv) Close D: the closed-only fence is the reason this check does not flag every in-flight
  // ticket every night, so it is proven by closing the row rather than by reading the code.
  const closedD = fixture().board;
  closedD.items.find(i => i.backlog_id === "SES-385-D").status = "done";
  assert.deepStrictEqual(ids(classify(closedD), "remainder-stranded"), ["SES-385-A", "SES-385-B", "SES-385-D"],
    "D is excluded because it is OPEN, not because of anything else about it — closing it must flag it");

  // (v) A quote-less closed row cannot be under its quote: a null predicted_cycles is an absent
  // comparison, never a zero. (`quote-missing` is check 1's business, and only on a live row.)
  const noQuote = fixture().board;
  noQuote.items.find(i => i.backlog_id === "SES-385-A").predicted_cycles = null;
  assert.deepStrictEqual(ids(classify(noQuote), "remainder-stranded"), ["SES-385-B"],
    "a closed row with no quote at all must not be compared against one");

  // --- (C) the widened read must not invert the Accept check --------------------------------------
  // B is `delivered`, 48 h+ old, and its only runner_items row is UNDECIDED. Before SES-385 the
  // read filtered those rows out; now they arrive, and a classifier that took every runner_items
  // row as an Accept would quietly empty check 10 for every open card on the board.
  assert.deepStrictEqual(ids(r, "delivered-unaccepted"), ["SES-385-B"],
    "an UNDECIDED card is not an Accept — the widened read must not answer check 10 on an open gate");
  const accepted = fixture().board;
  accepted.accepts.find(a => a.backlog_id === "SES-385-B").decided_at = "2026-09-15T00:00:00+00:00";
  assert.deepStrictEqual(ids(classify(accepted), "delivered-unaccepted"), [],
    "control: the SAME row with a decided_at IS accepted, so the arm above is about decided_at and not about the row");

  // The query itself, from source: the live REST read is not exercised in a clean checkout, and
  // this is the line that has to change for the open cards to reach classifyBoard at all.
  const src = fs.readFileSync(path.join(ROOT, SCRIPT_REL), "utf8");
  const readLine = src.split("\n").find(l => l.includes("runner_items?select="));
  assert.ok(readLine, `${SCRIPT_REL} must still read runner_items`);
  assert.ok(readLine.includes("kind"), `the runner_items read must select \`kind\`; got: ${readLine.trim()}`);
  assert.ok(!readLine.includes("decided_at=not.is.null"),
    `the runner_items read must not filter out undecided cards any more; got: ${readLine.trim()}`);
  assert.ok(readLine.includes("decided_at"),
    "`decided_at` must still be SELECTED — it is what splits the one read into Accepts and open gates");

  // --- (D) the runbook's close-out rule -----------------------------------------------------------
  const md = fs.readFileSync(path.join(ROOT, RUNBOOK_REL), "utf8");
  const start = md.indexOf("THE STATUS YOU WRITE IS");
  assert.ok(start > 0, `${RUNBOOK_REL} must still carry the close-out status bullet`);
  const end = md.indexOf("\n- Close-out edits in the same commit set", start);
  assert.ok(end > start, "the close-out bullet must end at the next bullet — an unbounded slice would pass on text from anywhere below");
  const block = md.slice(start, end).replace(/\s+/g, " ");

  const CLAUSES = [
    ["`partial`", s => /THE STATUS IS `partial`/.test(s),
      "the rule must name the status it writes"],
    ["clear `design_status`", s => s.includes("clear `design_status`"),
      "the flag must be CLEARED at ship — nothing wrote it down before, which is the whole defect"],
    ["keep `kickoff_link`", s => s.includes("keep `kickoff_link`"),
      "the link must be KEPT: ship_handoff_census reads it, and ck_design_status_kickoff allows the cleared flag beside it"],
    ["the three triggers", s => s.includes("gated_before_build") && /slice N of M/.test(s) && s.includes("declared remainder"),
      "the rule must name all three ways a record declares unbuilt work"],
  ];
  for (const [name, test, why] of CLAUSES) {
    assert.ok(test(block), `${RUNBOOK_REL}: the close-out bullet does not carry "${name}" — ${why}`);
  }
  // The control: each clause is proven to FAIL on a block it was removed from, so a passing grep
  // above means the runbook carries the rule rather than the pattern matching anything at all.
  for (const [name, test] of CLAUSES) {
    const broken = block
      .replace("THE STATUS IS `partial`", "THE STATUS IS `delivered`")
      .replace("clear `design_status`", "leave `design_status`")
      .replace("keep `kickoff_link`", "drop `kickoff_link`")
      .replace("gated_before_build", "some-other-card");
    assert.notStrictEqual(broken, block, `control: the mutation for "${name}" changed nothing`);
    assert.ok(!test(broken), `control: "${name}" still matches after its own clause was mutated away`);
  }

  const bytes = Buffer.byteLength(md, "utf8");
  assert.ok(bytes <= CEILING,
    `${RUNBOOK_REL} is ${bytes} bytes against SES-336's ceiling of ${CEILING} — this edit had to free bytes before adding any`);

  console.log(`[SES-385] stranded: ${ids(r, "remainder-stranded").join(", ")} · not stranded: SES-385-C (quote spent), SES-385-D (open) · runbook ${bytes}B <= ${CEILING}`);
  return ["check-12", "controls", "widened-read", "runbook-rule"];
}

selfRun(import.meta.url, run);
export default run;
