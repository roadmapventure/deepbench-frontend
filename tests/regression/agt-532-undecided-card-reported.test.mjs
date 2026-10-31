// DeepBench v7.0.928 | tests/regression/agt-532-undecided-card-reported.test.mjs | AGT-532
//
// FEATURE: AGT-532 -- AN UNDECIDED GATE CARD IS REPORTED, AND A REFUSAL CARRIES THE REASON.
// Measured live 2026-10-30/31: card `16bd6514-fe49-42d5-88cf-ef1e5a962a6d` holds `AGT-304` with a
// null `decision`, `pick_exclusions()` on `AGT-304` returns `["undecided gated_before_build card"]`,
// and `prime_directive_queue()` omits it. `readInstruments()` never read `runner_items` at all, so
// nothing on the board said the ticket was held -- it was simply absent -- and an answer that named
// an off-queue id was refused as one "which prime_directive_queue() did not return", with no reason.
//
// WHAT THIS FILE GUARDS, and where a lazier guard would pass vacuously.
//
// (A) THE FILTER IS THE WHOLE RULE, AND IT IS ASSERTED IN BOTH DIRECTIONS. "Older than one cycle"
//     is `cycle_id` is not this cycle's (JOHN-0925-DESIGNER-DECIDES), so a two-card fixture must
//     yield EXACTLY ONE line -- the other cycle's -- and must yield BOTH when the driver cannot name
//     its own cycle. A guard that only counted lines on a blank cycle id would pass just as well
//     against a helper that reported every card always, which would put this cycle's own card back
//     in front of the manager it belongs to at 7b.
//
// (B) THE REASON IS READ OFF THE REFUSAL, NOT RE-DERIVED. `offQueueIds` is driven through the
//     SHIPPED `leverageErrors` rather than a hand-written string, because a hand-written line proves
//     the regex matches itself and nothing else: if that refusal's wording moves, this arm must go
//     red. `exclusionReasonLine` is asserted on a row AND on no row, because a helper that returned
//     the no-row sentence for everything would satisfy either half alone.
//
// (D) THE WIRING IS PINNED, because (A) and (B) are pure helpers and a build that exported them and
//     wired them nowhere would pass every assertion above. The read, the state key, the payload key,
//     the refusal call site and the prose line are each named here, which is what makes them a
//     permanent asset instead of a grep in a close-out nobody re-runs (pattern:150, pattern:75).
//
// (C) LIVE AND WRITE-FREE: the cards read exactly as pass one reads them, `pick_exclusions()`
//     resolvable at one overload and agreeing with the card on every undecided card, and the queue
//     actually omitting that card's ticket -- the hold this ticket exists to explain. Two read-only
//     calls per card; nothing here writes.

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  undecidedGateCardLines,
  offQueueIds,
  exclusionReasonLine,
  leverageErrors,
} from "../../scripts/run-project.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DRIVER_REL = "scripts/run-project.js";

// The live card and ticket this ticket was filed over. Named so the credential-gated declaration
// below says WHICH case went unmeasured rather than "the live arm".
const LIVE_CARD = "16bd6514-fe49-42d5-88cf-ef1e5a962a6d";
const LIVE_TICKET = "AGT-304";
const GATE_REASON = "undecided gated_before_build card";

// == (A) ========================================================================================
function onlyAnotherCyclesCardIsReported() {
  const cards = [
    { id: "c1", backlog_id: "ZZ-1", cycle_id: "own", created_at: "t1" },
    { id: "c2", backlog_id: "ZZ-2", cycle_id: "other", created_at: "t2" },
  ];

  const mine = undecidedGateCardLines(cards, "own");
  assert.strictEqual(mine.length, 1,
    `undecidedGateCardLines(cards, "own") reported ${mine.length} line(s), not 1 -- this cycle's own ` +
      `card is the one it rules at 7b and must not be reported back at pass one: ${JSON.stringify(mine)}`);
  assert.ok(mine[0].includes("UNDECIDED GATE CARD: c2 holds ZZ-2"),
    `the reported line does not name the OTHER cycle's card and its ticket: ${mine[0]}`);
  assert.ok(mine[0].includes("decide-gated-card.js --prepare"),
    `the reported line does not say how to rule the card -- a report with no next step is a status ` +
      `line, not a report (pattern:155): ${mine[0]}`);
  assert.ok(mine[0].includes("other") && mine[0].includes("t2"),
    `the reported line drops the filing cycle or the filing time: ${mine[0]}`);
  assert.ok(!mine[0].includes("ZZ-1"),
    `the reported line names this cycle's own card as well: ${mine[0]}`);

  // The other direction: a driver that cannot name its own cycle cannot claim any card as its own.
  assert.strictEqual(undecidedGateCardLines(cards, null).length, 2,
    "a blank cycle id must report EVERY card -- an unattributable driver owns none of them");
  assert.strictEqual(undecidedGateCardLines(cards, "").length, 2,
    "an empty-string cycle id must report EVERY card, the same as a null one");

  assert.deepStrictEqual(undecidedGateCardLines([], "own"), [],
    "no cards must report no lines");
  assert.deepStrictEqual(undecidedGateCardLines(undefined, "own"), [],
    "a non-array (a failed read that got this far) must report no lines, never throw");
  assert.deepStrictEqual(undecidedGateCardLines(null, "own"), [], "null must report no lines");
}

// == (B) ========================================================================================
function theRefusalCarriesTheReason() {
  // Driven through the SHIPPED refusal, not a hand-written copy of its wording.
  const errors = leverageErrors(
    { leverage: [{ backlog_id: "ZZ-9", improves: "a", why: "b" }] },
    { queue: [{ ref: "AGT-1" }] },
  );
  assert.ok(errors.length >= 1,
    "leverageErrors() refused nothing for an off-queue leverage id -- the fixture this arm reads " +
      "from is gone, so offQueueIds would be asserted against a string it wrote itself");
  assert.deepStrictEqual(offQueueIds(errors), ["ZZ-9"],
    `offQueueIds() did not read the off-queue id back out of the shipped refusal line(s): ` +
      `${JSON.stringify(errors)}`);
  assert.deepStrictEqual(offQueueIds([]), [], "no refusals must yield no ids");
  assert.deepStrictEqual(offQueueIds(undefined), [], "a non-array must yield no ids, never throw");
  assert.deepStrictEqual(offQueueIds([...errors, ...errors]), ["ZZ-9"],
    "one id named twice must buy ONE reason, not two");
  assert.deepStrictEqual(offQueueIds(["leverage[0] carries a blank \"why\""]), [],
    "a refusal that is not about the queue must not be asked for an exclusion reason");

  const withRow = exclusionReasonLine("ZZ-9", [{ backlog_id: "ZZ-9", reasons: [GATE_REASON] }]);
  assert.ok(withRow.includes(`holds "ZZ-9" out of the queue: ${GATE_REASON}`),
    `exclusionReasonLine() did not render the board's own reason: ${withRow}`);

  const noRow = exclusionReasonLine("ZZ-9", []);
  assert.ok(noRow.includes(`returns no row for "ZZ-9"`),
    `exclusionReasonLine() with no row did not say so: ${noRow}`);
  // A row with no reasons is a THIRD case, not the no-row case: the predicate holds nothing against
  // the id any more, which is itself the answer.
  const emptyReasons = exclusionReasonLine("ZZ-9", [{ backlog_id: "ZZ-9", reasons: [] }]);
  assert.ok(emptyReasons.includes("no reason -- the board admits it now"),
    `a row with no reasons must not render as the no-row sentence: ${emptyReasons}`);
  assert.ok(!emptyReasons.includes("returns no row"),
    `a row with no reasons rendered as "no row": ${emptyReasons}`);
  assert.ok(exclusionReasonLine("ZZ-9", [{ backlog_id: "ZZ-8", reasons: [GATE_REASON] }])
    .includes(`returns no row for "ZZ-9"`),
    "a row for a DIFFERENT id must not be rendered as this id's reason");
}

// == (D) ========================================================================================
function theDriverIsActuallyWired() {
  const src = fs.readFileSync(path.join(ROOT, DRIVER_REL), "utf8");
  const pins = [
    // The instrument: pass one reads the table it never read before, and a failed read is fatal.
    'runner_items?kind=eq.gated_before_build&decision=is.null&select=id,backlog_id,cycle_id,created_at&order=created_at',
    'if (gateCards.error) return { error: gateCards.error };',
    'undecidedGateCards: gateCards.rows,',
    // The state the manager is handed, and the payload a caller reads.
    'undecided_gate_cards: inst.undecidedGateCards,',
    'undecided_gate_cards: gateLines,',
    'const gateLines = undecidedGateCardLines(inst.undecidedGateCards, args.cycleId);',
    // The prose a human reads at exit 3.
    'no undecided gate card older than this cycle',
    // The refusal: the reason is asked for INSIDE the errors branch, before the decline is recorded.
    'for (const id of offQueueIds(errors)) {',
    'pick_exclusions?backlog_id=eq.${encodeURIComponent(id)}',
  ];
  for (const pin of pins) {
    assert.ok(src.includes(pin),
      `${DRIVER_REL} does not carry \`${pin}\` -- the helpers are exported and wired nowhere, which ` +
        `is a green suite over a driver that reports nothing`);
  }
  // Order, not just presence: a reason pushed AFTER the refusal returned would never be printed.
  const loopAt = src.indexOf("for (const id of offQueueIds(errors)) {");
  const declineAt = src.indexOf("const dec = await recordDeclineSkip({ base, key, args, answer, state });", loopAt);
  const returnAt = src.indexOf("answer_errors: errors", loopAt);
  assert.ok(loopAt > 0 && declineAt > loopAt && returnAt > loopAt,
    "the exclusion-reason loop does not precede the decline record and the refusal return");
}

// == (C) ========================================================================================
async function theBoardAgreesWithTheCard() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      `AGT-532 (C) the live arm: the undecided gate cards read as pass one reads them, ` +
        `pick_exclusions() agreeing with each card (${LIVE_CARD} / ${LIVE_TICKET} at the ship), and ` +
        `prime_directive_queue() actually omitting the held ticket`,
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name " +
        "(docs/runbooks/session-setup.md step 1b) and re-run: " +
        "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js",
    );
    return;
  }

  const H = { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
  const get = async q => {
    const r = await fetch(`${url}/rest/v1/${q}`, { headers: H });
    const text = await r.text();
    assert.strictEqual(r.status, 200, `GET ${q} returned HTTP ${r.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text);
  };
  const post = async (fn, query = "") => {
    const r = await fetch(`${url}/rest/v1/rpc/${fn}${query}`, { method: "POST", headers: H, body: "{}" });
    const text = await r.text();
    assert.ok(!/PGRST20[23]|Could not find the function/i.test(text),
      `public.${fn}() is not resolvable at exactly one overload (an overload break is invisible from ` +
        `the new call and total from the old one -- .claude/rules/supabase-function-signature.md): ` +
        `${text.slice(0, 300)}`);
    assert.strictEqual(r.status, 200, `rpc/${fn}${query} returned HTTP ${r.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text);
  };

  // Read exactly what pass one reads, so a card shape that moved makes this red rather than the run.
  const cards = await get(
    "runner_items?kind=eq.gated_before_build&decision=is.null&select=id,backlog_id,cycle_id,created_at&order=created_at");
  assert.ok(Array.isArray(cards), "the undecided-card read did not return an array of rows");

  const queue = await post("prime_directive_queue");
  const refs = queue.map(r => String(r.ref ?? ""));

  const withTicket = cards.filter(c => String(c.backlog_id ?? "").trim());
  if (!withTicket.length) {
    notRun(
      `AGT-532 (C) the per-card arm: pick_exclusions() holding a card's ticket out of the queue`,
      `there is no undecided gated_before_build card on the board right now, so there is nothing to ` +
        `agree with. At this ship the case was card ${LIVE_CARD} holding ${LIVE_TICKET} (created ` +
        `2026-10-30T15:13:36Z), pick_exclusions(${LIVE_TICKET}) -> ["${GATE_REASON}"], and the queue ` +
        `omitting ${LIVE_TICKET}. Arms (A), (B) and (D) ran and cover the rendering and the wiring.`,
    );
  }

  for (const c of withTicket) {
    const id = String(c.backlog_id).trim();
    const rows = await post("pick_exclusions", `?backlog_id=eq.${encodeURIComponent(id)}`);
    assert.strictEqual(rows.length, 1,
      `pick_exclusions() returned ${rows.length} row(s) for ${id}, not 1 -- the predicate is the one ` +
        `home for why an id is off the queue and the driver renders its row verbatim`);
    const reasons = Array.isArray(rows[0].reasons) ? rows[0].reasons : [];
    assert.ok(reasons.includes(GATE_REASON),
      `pick_exclusions(${id}) does not name the undecided card as the reason: ${JSON.stringify(reasons)}`);
    // The hold itself, which is the thing the report exists to explain.
    assert.ok(!refs.includes(id),
      `prime_directive_queue() returned ${id} even though card ${c.id} holds it out -- the card and ` +
        `the queue disagree, and the driver would report a hold that is not happening`);
    // And the line the driver would print for it, rendered from the live row.
    const line = exclusionReasonLine(id, rows);
    assert.ok(line.includes(GATE_REASON), `the rendered reason for ${id} lost the board's words: ${line}`);
  }

  console.log(`  [AGT-532] (C) live: ${cards.length} undecided gate card(s); ${withTicket.length} ` +
    `checked against pick_exclusions() (one row each, reasons naming the card) and against a ` +
    `${refs.length}-row prime_directive_queue() that omits every one of them. Nothing was written.`);
}

export default async function run() {
  onlyAnotherCyclesCardIsReported();   // (A) -- the discriminator: origin/dev exports no renderer
  theRefusalCarriesTheReason();        // (B)
  theDriverIsActuallyWired();          // (D)
  await theBoardAgreesWithTheCard();   // (C)
}

selfRun(import.meta.url, run);
