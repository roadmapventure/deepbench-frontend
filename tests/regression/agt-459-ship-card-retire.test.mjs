// DeepBench v7.0.1022 | tests/regression/agt-459-ship-card-retire.test.mjs | AGT-459 -- stale ship
// cards close as receipts.
//
// WHAT SHIPPED, and therefore what this file has to be able to go red on. 373 `kind = 'ship'`
// cards on `runner_items` carried `decision IS NULL` and 192 of them hung off a ticket already
// `done` (139) or `removed` (53) -- reports asking John to decide a build whose ticket the
// platform had finished with. `runner_items_decision_check` already admitted `retired` for every
// kind and NOTHING wrote it (0 ship cards read `retired`, measured live 2026-11-13).
// `scripts/retire-ship-cards.js` is the writer; `scripts/settle-ship.js` step 6 calls it,
// non-fatally, at the end of every delivering close-out.
//
// THE DELTA CONTROL IS THE IMPORT ITSELF. On `7d2f0b8` `scripts/retire-ship-cards.js` does not
// exist, so this module cannot load there at all. There is no version of this test that passes on
// the unchanged tree.
//
// THE DISCRIMINATORS, each named so a weaker implementation cannot pass:
//
// (A) THE STALENESS RULE IS IN THE PURE FUNCTION, not only in the PostgREST query. A caller that
//     widens its read must still not retire a card on a `removal proposed` ticket, a card with no
//     `backlog_id`, a card whose ticket row is ABSENT (an unknown is not a `done`), a card already
//     decided, or a card of another kind. Each is handed in DIRECTLY -- an implementation that
//     filtered only in the URL would pass a URL-shaped test and sweep all five the first time the
//     read changed.
// (B) THE WRITE ORDER AND THE TWO COLUMNS, driven over a recording fake `rest()` (the injected
//     seam, so the real plan and the real bodies run with no database). Three things a plausible
//     wrong implementation gets wrong are each their own case: a dry run that writes anyway; a
//     PATCH that drops `kind=eq.ship&decision=is.null` and so sweeps a card decided between the
//     image and the write; and a third column -- writing `decision_reason` fires the trigger that
//     APPENDS to `plain_worth`, which would rewrite 192 rows of published copy as a side effect of
//     a receipt, so the body's keys are asserted to be exactly two. The decision carrying a ticket
//     id is its own case: one decision covers card(s) across many tickets, so naming one would be
//     a lie about what was decided. A short PATCH read-back must REJECT, never report a quiet
//     partial sweep. And no cycle id must cost zero calls, not "a read that finds nothing".
// (C) SOURCE: the two one-line edits this ship depends on. The sweep is called from `settle-ship.js`
//     AFTER the directive close, and the §16 scoreboard tap counts `accept,rework,reverse` rather
//     than `not.is.null` -- without that, every card this sweep retires would land in John's
//     "Your Rework or Reverse" figure as a decision he made.
//
// NO MODEL CALL, NO SPEND, NO DATABASE. Pure calls, an injected fake transport, and two file reads.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import {
  STALE, CHUNK, planRetire, decisionText, retireStaleShipCards,
} from "../../scripts/retire-ship-cards.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ---------------------------------------------------------------------------------------------
// Arm (A) -- the pure half, by value
// ---------------------------------------------------------------------------------------------
const CARDS = [
  { id: "c1", backlog_id: "AGT-1", kind: "ship", decision: null },               // done     -> stale
  { id: "c2", backlog_id: "AGT-2", kind: "ship", decision: null },               // removed  -> stale
  { id: "c3", backlog_id: "AGT-3", kind: "ship", decision: null },               // removal proposed
  { id: "c4", backlog_id: null, kind: "ship", decision: null },                  // no ticket named
  { id: "c5", backlog_id: "AGT-5", kind: "ship", decision: null },               // delivered
  { id: "c6", backlog_id: "AGT-6", kind: "ship", decision: null },               // no ticket ROW
  { id: "c7", backlog_id: "AGT-1", kind: "ship", decision: "accept" },           // already decided
  { id: "c8", backlog_id: "AGT-1", kind: "gated_before_build", decision: null }, // another kind
];
const TICKETS = [
  { backlog_id: "AGT-1", status: "done" },
  { backlog_id: "AGT-2", status: "removed" },
  { backlog_id: "AGT-3", status: "removal proposed" },
  { backlog_id: "AGT-5", status: "delivered" },
];

function armA_pure() {
  const results = [];

  assert.deepStrictEqual(STALE, ["done", "removed"],
    `only a \`done\` or \`removed\` ticket makes its report a receipt — a \`removal proposed\` ticket has not been ruled; got ${JSON.stringify(STALE)}`);
  assert.strictEqual(CHUNK, 50, `the write chunk is 50, got ${JSON.stringify(CHUNK)}`);
  results.push("stale-statuses-are-done-and-removed-only");

  assert.deepStrictEqual(planRetire({ cards: CARDS, tickets: TICKETS }),
    { ids: ["c1", "c2"], by: { done: 1, removed: 1 } },
    "exactly the two cards whose ticket already reads `done` or `removed` are stale, in input order, counted per status");
  results.push("plan-picks-two-of-eight-in-input-order");

  // Each rejection on its own, so a failure names the rule that broke rather than "the plan moved".
  for (const [label, card] of [
    ["a `removal proposed` ticket", CARDS[2]],
    ["no backlog_id at all", CARDS[3]],
    ["a `delivered` ticket", CARDS[4]],
    ["a ticket with NO row in the read", CARDS[5]],
    ["a card already decided `accept`", CARDS[6]],
    ["a card of another kind", CARDS[7]],
  ]) {
    assert.deepStrictEqual(planRetire({ cards: [card], tickets: TICKETS }), { ids: [], by: { done: 0, removed: 0 } },
      `${label} must plan nothing — the rule lives in the pure function, not only in the URL`);
  }
  results.push("each-ineligible-card-rejected-on-its-own");

  assert.deepStrictEqual(planRetire({}), { ids: [], by: { done: 0, removed: 0 } }, "no cards must plan nothing");
  assert.deepStrictEqual(planRetire({ cards: CARDS, tickets: [] }), { ids: [], by: { done: 0, removed: 0 } },
    "cards with no ticket read at all must plan nothing — an absent ticket row is an unknown, never a `done` one");
  results.push("empty-inputs-plan-nothing");

  // The decision's own words: counts and John's sentence, and NEVER a ticket id.
  const { summary, reasoning } = decisionText({ done: 139, removed: 53 });
  assert.ok(summary.includes("139 on done") && summary.includes("53 on removed") && summary.includes("192"),
    `the summary must carry the counts, got ${JSON.stringify(summary)}`);
  assert.ok(reasoning.includes("its ticket is already done or removed -- retire the report as a receipt"),
    `the reasoning must quote John's 2026-09-29 sentence verbatim, got ${JSON.stringify(reasoning)}`);
  const idLike = /\b[A-Z]{2,4}-\d+\b/;
  assert.ok(!idLike.test(summary) && !idLike.test(reasoning),
    `one decision covers cards across many tickets, so NO ticket id may appear in it — got ${JSON.stringify((summary + " " + reasoning).match(idLike))}`);
  results.push("decision-carries-counts-and-johns-sentence-never-a-ticket-id");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (B) -- SEAM PROOF: the whole write path over a recording fake `rest()` (the injected seam;
// the real plan, the real paths and the real bodies)
// ---------------------------------------------------------------------------------------------
const CYCLE = "2410f011-84ff-4d72-8385-09d81f6f6afd";
const DECISION = "11111111-2222-3333-4444-555555555555"; // 36 chars, the shape record_decision returns
const FULL = [
  { id: "c1", backlog_id: "AGT-1", kind: "ship", decision: null, plain_worth: "published copy" },
  { id: "c2", backlog_id: "AGT-2", kind: "ship", decision: null, plain_worth: "published copy" },
];

function recorder({ patchRows = FULL, decision = DECISION } = {}) {
  const calls = [];
  const rest = async (base, key, pathAndQuery, init = {}, label = null) => {
    const method = (init && init.method) || "GET";
    calls.push({ method, path: pathAndQuery, body: init && init.body ? JSON.parse(init.body) : null, label });
    if (pathAndQuery.startsWith("rpc/record_decision")) return decision;
    if (pathAndQuery.startsWith("runner_before_images")) return null;
    if (pathAndQuery.startsWith("backlog_items?")) return TICKETS;
    if (method === "PATCH") return patchRows;
    if (pathAndQuery.includes("select=*")) return FULL;
    if (pathAndQuery.startsWith("runner_items?")) return CARDS;
    throw new Error(`arm (B): nothing in this seam should reach ${pathAndQuery}`);
  };
  return { calls, rest, writes: () => calls.filter(c => c.method !== "GET") };
}

async function armB_seam() {
  const results = [];

  // B1 -- no cycle id: ZERO calls. Not "a read that finds nothing" -- the before-images are written
  // against the cycle, so a missing attribution is refused before the first fetch.
  {
    const r = recorder();
    const out = await retireStaleShipCards({ base: "https://x.invalid", key: "k", cycleId: "", apply: true, rest: r.rest });
    assert.strictEqual(out.skipped, "no cycle id", `no cycle id must say so, got ${JSON.stringify(out)}`);
    assert.strictEqual(r.calls.length, 0, `no cycle id must cost zero calls, made ${r.calls.length}: ${JSON.stringify(r.calls.map(c => c.method + " " + c.path))}`);
    results.push("seam-no-cycle-id-zero-calls");
  }

  // B2 -- a dry run reads and plans but writes NOTHING.
  {
    const r = recorder();
    const out = await retireStaleShipCards({ base: "https://x.invalid", key: "k", cycleId: CYCLE, rest: r.rest });
    assert.strictEqual(out.stale, 2, `the dry run must still report the 2 stale cards, got ${JSON.stringify(out)}`);
    assert.strictEqual(out.retired, 0, "a dry run retires nothing");
    assert.strictEqual(out.decision, null, "a dry run mints no decision");
    assert.deepStrictEqual(r.writes(), [],
      `\`apply\` false must make no non-GET call at all, made ${JSON.stringify(r.writes().map(c => c.method + " " + c.path))}`);
    results.push("seam-dry-run-zero-writes");
  }

  // B3 -- apply: decision, then images, then the PATCH, in that order and no other write.
  {
    const r = recorder();
    const out = await retireStaleShipCards({ base: "https://x.invalid", key: "k", cycleId: CYCLE, apply: true, rest: r.rest });
    const writes = r.writes();
    assert.deepStrictEqual(writes.map(c => c.path.split("?")[0]), ["rpc/record_decision", "runner_before_images", "runner_items"],
      `the writes must be the decision, then the before-images, then the card PATCH, in that order; got ${JSON.stringify(writes.map(c => c.method + " " + c.path))}`);
    assert.deepStrictEqual(writes.map(c => c.method), ["POST", "POST", "PATCH"],
      `got ${JSON.stringify(writes.map(c => c.method))}`);
    assert.deepStrictEqual(out, { stale: 2, retired: 2, decision: DECISION, skipped: null },
      `the sweep must report what it did, got ${JSON.stringify(out)}`);

    // The decision is attributed to the cycle and to NO ticket.
    const dec = writes[0].body;
    assert.strictEqual(dec.p_cycle_id, CYCLE, "the decision is attributed to this cycle");
    assert.strictEqual(dec.p_backlog_id, null, "one decision covers many tickets — `p_backlog_id` must be NULL");
    assert.strictEqual(dec.p_kind, "card-retire", `the decision kind must be \`card-retire\`, got ${JSON.stringify(dec.p_kind)}`);

    // One before-image per card, each under THIS decision, each carrying the whole row.
    const images = writes[1].body;
    assert.strictEqual(images.length, 2, `one image per card, got ${images.length}`);
    assert.deepStrictEqual(images.map(i => i.pk_value), ["c1", "c2"], "the images name the cards by primary key");
    for (const i of images) {
      assert.strictEqual(i.table_name, "runner_items", "the image names the table it undoes");
      assert.strictEqual(i.decision_id, DECISION, "every image hangs off the one decision — that handle is the undo");
      assert.strictEqual(i.cycle_id, CYCLE, "the image is attributed to this cycle");
      assert.ok(i.row_data && i.row_data.plain_worth === "published copy",
        `the image must carry the FULL row read back, got ${JSON.stringify(i.row_data)}`);
    }

    // The PATCH: the filter is re-asserted, and exactly two columns are written.
    const patch = writes[2];
    assert.ok(patch.path.includes("kind=eq.ship"),
      `the PATCH must re-assert \`kind=eq.ship\` — a card of another kind must never be swept; got ${patch.path}`);
    assert.ok(patch.path.includes("decision=is.null"),
      `the PATCH must re-assert \`decision=is.null\` — a card decided between the image and the write is left alone; got ${patch.path}`);
    assert.ok(patch.path.includes("c1") && patch.path.includes("c2"), `the PATCH must name the imaged cards, got ${patch.path}`);
    assert.deepStrictEqual(Object.keys(patch.body).sort(), ["decided_at", "decision"],
      `exactly two columns are written — \`decision_reason\` fires the trigger that APPENDS to \`plain_worth\`; got ${JSON.stringify(Object.keys(patch.body))}`);
    assert.strictEqual(patch.body.decision, "retired", `the verdict written is \`retired\`, got ${JSON.stringify(patch.body.decision)}`);
    assert.ok(typeof patch.body.decided_at === "string" && !Number.isNaN(Date.parse(patch.body.decided_at)),
      `\`decided_at\` must be an ISO timestamp, got ${JSON.stringify(patch.body.decided_at)}`);
    results.push("seam-apply-decision-then-images-then-two-column-patch");
  }

  // B4 -- a PATCH one row short REJECTS. A sweep that imaged two cards and moved one has written a
  // receipt it cannot account for, and reporting 1 would make that look like a smaller sweep.
  {
    const r = recorder({ patchRows: [FULL[0]] });
    await assert.rejects(
      retireStaleShipCards({ base: "https://x.invalid", key: "k", cycleId: CYCLE, apply: true, rest: r.rest }),
      /imaged 2 card\(s\) and the PATCH returned 1/,
      "a PATCH that moved fewer cards than were imaged must throw, never report a quiet partial sweep",
    );
    results.push("seam-short-patch-rejects");
  }

  // B5 -- a decision id that is not a decision id rejects before any row moves.
  {
    const r = recorder({ decision: null });
    await assert.rejects(
      retireStaleShipCards({ base: "https://x.invalid", key: "k", cycleId: CYCLE, apply: true, rest: r.rest }),
      /not a decision id/,
      "a refused `record_decision` must stop the sweep before the first image",
    );
    assert.deepStrictEqual(r.writes().map(c => c.path.split("?")[0]), ["rpc/record_decision"],
      `nothing may be written after a failed decision, got ${JSON.stringify(r.writes().map(c => c.path))}`);
    results.push("seam-no-decision-no-writes");
  }

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (C) -- SOURCE: the two one-line edits the ship depends on
// ---------------------------------------------------------------------------------------------
function armC_source() {
  const results = [];

  const settle = fs.readFileSync(path.join(ROOT, "scripts", "settle-ship.js"), "utf8");
  assert.ok(settle.includes('import { retireStaleShipCards } from "./retire-ship-cards.js";'),
    "settle-ship.js must import the sweep");
  const at = settle.indexOf("await closeDirectives({ base");
  const call = settle.indexOf("retireStaleShipCards(");
  assert.ok(at > -1, "the directive close must still be there");
  assert.ok(call > at,
    "the sweep runs AFTER the directive close — settling the ticket is the close-out's primary job and housekeeping never precedes it");
  assert.ok(/try\s*\{[\s\S]{0,400}retireStaleShipCards\(/.test(settle.slice(at)),
    "the sweep must be wrapped in try/catch — a housekeeping failure must never take the settle's exit code with it");
  assert.ok(settle.includes("ship cards: sweep NOT RUN —"),
    "the catch must SAY the sweep did not run rather than swallow it");
  results.push("settle-ship-calls-the-sweep-after-the-directive-close-non-fatally");

  const briefing = fs.readFileSync(path.join(ROOT, "scripts", "build-briefing.mjs"), "utf8");
  assert.ok(briefing.includes("decision=in.(accept,rework,reverse)"),
    "§16's tap must count the three decisions John makes");
  assert.ok(!briefing.includes("kind=eq.ship&decision=not.is.null"),
    "`not.is.null` would count every card this sweep retires as a decision John made");
  results.push("briefing-tap-counts-accept-rework-reverse-only");

  return results;
}

async function run() {
  const a = armA_pure();
  console.log(`  (A) pure: ${a.join(", ")}`);
  const b = await armB_seam();
  console.log(`  (B) SEAM PROOF (injected fake transport, real plan and real bodies): ${b.join(", ")}`);
  const c = armC_source();
  console.log(`  (C) source: ${c.join(", ")}`);
}

selfRun(import.meta.url, run);
export default run;
