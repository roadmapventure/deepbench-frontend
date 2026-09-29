// DeepBench v7.0.642 | tests/regression/agt-167-noship-pick-fence.test.mjs | AGT-167 -- THE NO-SHIP
// CAP BINDS AT PICK TIME, ON A MEASURE THAT MATCHES ITS OWN WORDS.
//
// WHAT SHIPPED. `runner_settings.chain_max_noship_streak` used to have exactly one reader,
// `drain_chain_gate()`'s Gate D, where it means a per-CHAIN streak of cycles that finished without
// shipping. Nothing fenced the PICK: `prime_directive_queue()` and `drain_epic_next()` did not
// mention `runner_cycles` at all, so a ticket could be handed to cycle after cycle, never ship, and
// be offered again indefinitely -- the cap named the condition and did not act on it. AGT-167 adds
// `public.ticket_noship_cycles(text)` (the ONE home for the per-ticket count) and fences lane (c)
// `selfbuild` with `ticket_noship_cycles(bu.backlog_id) < (SELECT chain_max_noship_streak ...)`.
// Lane (a) directive, lane (b) drain and `drain_epic_next()` are deliberately NOT fenced (AGT-221),
// so a drain pick can still offer what lane (c) refuses; this file therefore grades lane (c) only.
//
// WHY THIS FILE DISCRIMINATES, which is the whole reason it is shaped this way. The live invariant
// on its own IS VACUOUS and would have gone green against the unfenced function: the board's maximum
// non-shipping count for any one ticket is 1 against a live cap of 4 (measured this cycle, not
// recalled), so "no pickable ticket is over the cap" is true whether or not the WHERE clause exists.
// A file that shipped only that assertion would not have been worth writing. Discrimination comes
// from ARM B, which INSERTS the population the board lacks and walks the fence's boundary in both
// directions. Delete the WHERE clause and B2 fails (the over-cap fixture is still offered); keep a
// clause that counts TOTAL cycles instead of non-shipping ones -- the exact defect AGT-167 corrects
// in `audit-board.js`'s twin of this measure -- and B3/B4 fail, because those states have 4 and 8
// cycles while having only 3 that did not ship. Neither half can be satisfied by a stopped clock.
//
// THE REAL FUNCTIONS, NEVER A RECREATION (SES-45). Both `prime_directive_queue()` and
// `ticket_noship_cycles()` are CALLED over PostgREST. Nothing here re-implements the admission
// predicate or the count in JS -- a second copy of an admission rule IS the defect it would be
// hiding, because two agreeing implementations of a wrong rule read exactly like a correct one. The
// one recomputation in this file is ARM A's oracle, which is a COUNT over raw `runner_cycles` rows
// and deliberately not a copy of the fence: it grades the counter's arithmetic, and it is the only
// way to say "0 findings is correct" rather than "0 findings, so nothing was checked".
//
// `drain_epic_next(uuid)` IS DELIBERATELY NEVER CALLED -- a refusal ses-281, ses-424a and agt-140
// have all made before this file. It is not read-only: it retires John's standing directive when a
// drain's required members are done, and a regression run must never do that. It is also, by design,
// not fenced here (AGT-221), so there is nothing of this ticket in it to grade.
//
// THE FIXTURE CANNOT POISON A PEER'S BOARD, which matters because 5-7 cycles run this suite at once.
// The ticket id is minted per run (five random digits, doubling as `row_ordinal` -- backlog_items
// carries a UNIQUE (source_file, row_ordinal) and a fixed ordinal would collide between two
// concurrent runs on a constraint unrelated to the behaviour under test). Cleanup is unconditional
// in a `finally`, deletes by `item_id`/`backlog_id` rather than by primary key so a write that
// landed and then threw is still swept, and then ASSERTS the sweep worked -- a leaked fixture is a
// failure of this file, not a footnote. The fixture cycles carry `trigger = 'scheduled'` and a
// `started_at` in 2020 ON PURPOSE: Gate D counts only `trigger LIKE 'chained%'` rows inside a
// six-hour window that are newer than the last ship, so these rows are invisible to the chain gate
// and cannot stop a peer's chain while they briefly exist.
//
// NO MODEL CALL, NO SPEND. Paged reads, a handful of RPC calls, one insert pair and one PATCH, all
// swept.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

const EXPECTED_LANE = "selfbuild";
const PAGE = 1000;
const SOURCE_FILE = "tests/regression/agt-167-noship-pick-fence.test.mjs";
// Old enough to sit before every shipped cycle on the board, so Gate D's window can never see it.
const FIXTURE_STARTED_AT = "2020-01-01T00:00:00Z";

function fixtureNonce() {
  const n = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return { id: `ZFIX-167${n}`, ordinal: Number(n), stamp: `REGRESSION-FIXTURE-agt-167-${n}` };
}

async function rest(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
  // `Prefer: return=minimal` answers with an EMPTY body, which is a successful write and not JSON.
  const text = await res.text();
  return text.trim() === "" ? [] : JSON.parse(text);
}

async function pageAll(url, key, pathAndQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const page = await rest(url, key, pathAndQuery, {
      headers: { "Range-Unit": "items", Range: `${from}-${from + PAGE - 1}` },
    });
    assert.ok(Array.isArray(page), `${pathAndQuery} came back non-array`);
    rows.push(...page);
    if (page.length < PAGE) return rows;
    assert.ok(rows.length < 200000, `${pathAndQuery} ran away`);
  }
}

// THE REAL COUNTER. A scalar-returning RPC answers with a bare number, not an array.
const noshipOf = async (url, key, id) => {
  const v = await rest(url, key, "rpc/ticket_noship_cycles", {
    method: "POST", body: JSON.stringify({ p_backlog_id: id }),
  });
  assert.ok(Number.isInteger(v), `rpc/ticket_noship_cycles(${id}) must return an integer, got ${JSON.stringify(v)}`);
  return v;
};

// THE REAL PICK PATH.
const queue = (url, key) => rest(url, key, "rpc/prime_directive_queue", { method: "POST", body: "{}" });
const refsOf = rows => new Set(rows.filter(r => r.ref).map(r => r.ref));
const laneRefs = (rows, lane) => rows.filter(r => r.lane === lane && r.ref).map(r => r.ref);

async function run() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the whole file: the lane (c) no-ship fence against the live prime_directive_queue() and ticket_noship_cycles()",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. This ticket's change is a Postgres " +
        "function plus a WHERE clause inside another one, and this file refuses to grade either by " +
        "re-implementing it (SES-45), so there is no credential-free half to run. Canonical " +
        "invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const [settings] = await rest(url, key, "runner_settings?select=chain_max_noship_streak&id=eq.1");
  const cap = settings?.chain_max_noship_streak;
  assert.ok(Number.isInteger(cap) && cap >= 1,
    `runner_settings id=1 chain_max_noship_streak must be a positive integer, got ${JSON.stringify(cap)}`);

  // ==============================================================================================
  // ARM A -- the counter's ARITHMETIC, against an oracle that is not the counter.
  // ==============================================================================================
  const items = await pageAll(url, key, "backlog_items?select=id,backlog_id,status&order=backlog_id");
  const cycles = await pageAll(url, key, "runner_cycles?select=backlog_item_id,item_id,outcome&order=id");
  assert.ok(items.length > 0 && cycles.length > 0,
    `A: the oracle read ${items.length} items and ${cycles.length} cycles -- an empty read would make ` +
    `every comparison below vacuously true, so it is refused rather than banked`);

  const uuidToId = new Map(items.map(r => [r.id, r.backlog_id]));
  const noship = new Map();
  const total = new Map();
  let viaUuid = 0;
  for (const c of cycles) {
    const key2 = (c.backlog_item_id != null ? uuidToId.get(c.backlog_item_id) : null) ?? c.item_id ?? null;
    if (key2 == null) continue;
    if (c.backlog_item_id != null && uuidToId.has(c.backlog_item_id)) viaUuid += 1;
    total.set(key2, (total.get(key2) ?? 0) + 1);
    if (c.outcome !== "shipped") noship.set(key2, (noship.get(key2) ?? 0) + 1);
  }

  // A sample wide enough to exercise both join halves, shipped exclusion, and the empty case.
  const busiest = [...total].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12).map(([id]) => id);
  const shippedOnly = [...total].filter(([id]) => (noship.get(id) ?? 0) === 0).slice(0, 3).map(([id]) => id);
  const noCycles = items.map(r => r.backlog_id).filter(id => !total.has(id)).slice(0, 2);
  const sample = [...new Set([...busiest, ...shippedOnly, ...noCycles])];

  // NON-VACUITY. If the sample cannot tell a non-shipping count from a total one, ARM A proves
  // nothing about the measure and says so instead of banking a green.
  const discriminating = sample.filter(id => (total.get(id) ?? 0) > (noship.get(id) ?? 0));
  assert.ok(discriminating.length > 0,
    "A: no sampled ticket has a shipped cycle, so a counter that counted TOTAL cycles would agree " +
    "with this oracle everywhere -- the arm cannot grade the measure and refuses to pass");
  assert.ok(viaUuid > 0,
    "A: no cycle on the board joins through backlog_item_id, so the COALESCE join's uuid half is untested here");
  assert.ok(noCycles.length > 0, "A: no ticket with zero cycles was found to check the empty case");

  for (const id of sample) {
    const live = await noshipOf(url, key, id);
    assert.equal(live, noship.get(id) ?? 0,
      `A: ticket_noship_cycles('${id}') returned ${live}, the oracle counts ${noship.get(id) ?? 0} ` +
      `non-shipping of ${total.get(id) ?? 0} total. A counter that agreed with the TOTAL would read ` +
      `${total.get(id) ?? 0} here.`);
  }
  console.log(`    [A] ticket_noship_cycles agrees with an independent count on ${sample.length} tickets ` +
    `(${discriminating.length} of them have shipped cycles the measure must ignore; ${viaUuid} cycles join via uuid)`);

  // The standing property over the real board: nothing lane (c) offers may be at or over the cap.
  // Vacuous today by population -- kept because it is what must hold forever, and it costs one call.
  const liveQueue = await queue(url, key);
  const overCap = [];
  for (const ref of laneRefs(liveQueue, EXPECTED_LANE)) {
    if ((noship.get(ref) ?? 0) >= cap) overCap.push(ref);
  }
  assert.deepEqual(overCap, [],
    `A: lane (c) offered ${JSON.stringify(overCap)}, whose non-shipping cycle count is at or over the ` +
    `cap of ${cap} -- the fence is not holding on the real board`);

  // ==============================================================================================
  // ARM B -- the fence's boundary, walked in both directions on a minted fixture.
  // ==============================================================================================
  const epics = await rest(url, key, "epics?select=id,name,projects!inner(id,status)&projects.status=eq.executing&limit=50");
  assert.ok(epics.length > 0,
    "B: no epic belongs to an executing project -- the fixture would be unpickable for a reason that " +
    "has nothing to do with the no-ship fence, so this file refuses to grade rather than fail misleadingly");
  const epicId = epics[0].id;

  // AGT-280 (v7.0.729): a ticket reaches an executing project's list only when it cites a need
  // source that names a row that EXISTS -- `requirement_gate` refuses it otherwise, and this
  // fixture goes into exactly such an epic. It cites a real market record like any other filing;
  // exempting the fixture instead would have made this file the one hole in the gate.
  const needRows = await rest(url, key, "market_records?select=id&order=id.asc&limit=1");
  assert.equal(needRows.length, 1,
    "B: market_records is empty, so the fixture cannot cite a traceable need source (AGT-280) -- " +
    "this file refuses to grade rather than fail for a reason that has nothing to do with the fence");
  const needSource = `nathan:market_records:${needRows[0].id}`;

  const { id: fixId, ordinal: fixOrdinal, stamp: fixStamp } = fixtureNonce();

  // Nothing may already hold this id, or the `finally` below would delete a real row.
  assert.deepEqual(await rest(url, key, `backlog_items?backlog_id=eq.${fixId}&select=backlog_id`), [],
    `B: fixture ticket id ${fixId} must not already exist on the board`);
  assert.deepEqual(await rest(url, key, `runner_cycles?item_id=eq.${fixId}&select=id`), [],
    `B: fixture cycles for ${fixId} must not already exist`);

  try {
    await rest(url, key, "backlog_items", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        backlog_id: fixId,
        tier: "later",                    // keeps `type` NULL legal under ck_backlog_type_when_promoted
        title: "AGT-167 regression fixture — no-ship pick fence",
        status: "open",
        source_file: SOURCE_FILE,
        row_ordinal: fixOrdinal,
        epic_id: epicId,
        need_source: needSource,          // AGT-280: the executing project's list takes no ticket without one
        queue: 999991,                    // last in the order; `queue IS NULL` is the not-pickable condition
        filed_at: "2026-08-01T00:00:00Z",
        // Non-empty so the SES-295/M5-03 filing-lane cut cannot exclude the fixture whatever the
        // live `filing_lane_cutoff` says -- an exclusion for the wrong reason would fake B2's pass.
        scope_rationale: "AGT-167 regression fixture; deleted in the same run.",
        claimed_by: null,
        blocked_by: null,
        defer_status: null,
        design_status: null,
      }]),
    });

    // -- B1. POSITIVE CONTROL, zero cycles. If this fails nothing below can be trusted: an empty or
    // over-filtered queue is a worse failure than the bug AGT-167 fixes.
    const q1 = await queue(url, key);
    assert.equal(laneRefs(q1, EXPECTED_LANE).filter(r => r === fixId).length, 1,
      `B1: an uncycled buildable fixture must be offered by lane ${EXPECTED_LANE} exactly once. If this ` +
      `is 0 the pick path is refusing work it should offer -- a queue that strands real work is worse ` +
      `than the unfenced pick.`);
    assert.equal(await noshipOf(url, key, fixId), 0, "B1: a fixture with no cycles must count 0 non-shipping");

    // -- B2. THE FENCE. Exactly `cap` cycles, none of them shipped -> at the cap -> refused.
    const gated = await rest(url, key, "runner_cycles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(Array.from({ length: cap }, () => ({
        stamp: fixStamp, trigger: "scheduled", item_id: fixId,
        outcome: "gated_before_build", started_at: FIXTURE_STARTED_AT,
      }))),
    });
    assert.equal(gated.length, cap, `B2: expected ${cap} fixture cycles, created ${gated.length}`);
    assert.equal(await noshipOf(url, key, fixId), cap,
      `B2: the real counter must read ${cap} for the fixture before the fence is graded`);

    const q2 = await queue(url, key);
    assert.equal(refsOf(q2).has(fixId), false,
      `B2: with ${cap} non-shipping cycles and a cap of ${cap}, ${fixId} must not be offered by ANY lane ` +
      `of prime_directive_queue(). It still is -- the no-ship cap is not binding at pick time, which is ` +
      `AGT-167's entire premise.`);

    // The exclusion must be SURGICAL: a set difference, not a count (ses-424a note 3). A fence that
    // dropped the fixture and three real tickets with it would satisfy the assertion above.
    const lost = [...refsOf(q1)].filter(r => !refsOf(q2).has(r));
    const gainedB2 = [...refsOf(q2)].filter(r => !refsOf(q1).has(r));
    assert.deepEqual(lost, [fixId],
      `B2: crossing the cap must remove EXACTLY the over-cap ticket. Removed: ${JSON.stringify(lost)}. ` +
      `Anything else is the fence over-filtering the queue.`);
    assert.deepEqual(gainedB2, [], `B2: crossing the cap must not ADD anything. Added: ${JSON.stringify(gainedB2)}`);

    // -- B3. ONE cycle flips to shipped -> cap-1 non-shipping, `cap` TOTAL -> offered again. This is
    // the arm a TOTAL-cycle fence fails, and it also proves the refusal is not permanent.
    await rest(url, key, `runner_cycles?id=eq.${gated[0].id}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ outcome: "shipped" }),
    });
    assert.equal(await noshipOf(url, key, fixId), cap - 1,
      `B3: after one of ${cap} cycles shipped the counter must read ${cap - 1}`);

    const q3 = await queue(url, key);
    assert.equal(laneRefs(q3, EXPECTED_LANE).filter(r => r === fixId).length, 1,
      `B3: with ${cap - 1} non-shipping cycles out of ${cap} TOTAL, ${fixId} is under the cap and must be ` +
      `offered again. It is not -- either the fence never releases a ticket (which would strand work ` +
      `permanently) or it is counting TOTAL cycles instead of non-shipping ones, which is exactly the ` +
      `defect AGT-167 corrects in the audit check that reads the same cap.`);

    // -- B4. FOUR MORE SHIPPED cycles -> cap+4 total, still cap-1 non-shipping -> still offered.
    // Shipping repeatedly must never push a ticket over a cap counted in non-shipping cycles.
    await rest(url, key, "runner_cycles", {
      method: "POST", headers: { Prefer: "return=minimal" },
      body: JSON.stringify(Array.from({ length: 4 }, () => ({
        stamp: fixStamp, trigger: "scheduled", item_id: fixId,
        outcome: "shipped", started_at: FIXTURE_STARTED_AT,
      }))),
    });
    assert.equal(await noshipOf(url, key, fixId), cap - 1,
      `B4: four more shipped cycles must not move a NON-SHIPPING count off ${cap - 1}`);

    const q4 = await queue(url, key);
    assert.equal(laneRefs(q4, EXPECTED_LANE).filter(r => r === fixId).length, 1,
      `B4: at ${cap + 4} total cycles of which only ${cap - 1} did not ship, ${fixId} must still be ` +
      `offered. A fence that counted cycles rather than non-shipping cycles refuses it here.`);
    console.log(`    [B] lane (c) fence walked at cap ${cap}: offered at 0, refused at ${cap}, ` +
      `offered again at ${cap - 1} of ${cap}, still offered at ${cap - 1} of ${cap + 4}`);
  } finally {
    // Cycles first, then the ticket. Both by their text key, so a write that landed and then threw
    // while parsing its response is still swept.
    await rest(url, key, `runner_cycles?item_id=eq.${fixId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } })
      .catch(e => console.log(`  [AGT-167] WARNING: cycle cleanup failed (${e.message}); delete runner_cycles where item_id = ${fixId} by hand`));
    await rest(url, key, `backlog_items?backlog_id=eq.${fixId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } })
      .catch(e => console.log(`  [AGT-167] WARNING: ticket cleanup failed (${e.message}); delete ${fixId} by hand`));

    // A LEAK IS A FAILURE OF THIS FILE. Parallel cycles run this suite, and a committed fixture left
    // behind would be a ticket on a peer's board with cycles attributed to it.
    const leftCycles = await rest(url, key, `runner_cycles?item_id=eq.${fixId}&select=id`).catch(() => []);
    const leftTicket = await rest(url, key, `backlog_items?backlog_id=eq.${fixId}&select=backlog_id`).catch(() => []);
    assert.deepEqual(leftCycles, [], `the fixture cycles for ${fixId} must be gone -- a run must leave the board as it found it`);
    assert.deepEqual(leftTicket, [], `the fixture ticket ${fixId} must be gone -- a run must leave the board as it found it`);
  }
}

export default run;
selfRun(import.meta.url, run);
