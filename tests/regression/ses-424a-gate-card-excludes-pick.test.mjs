// DeepBench v7.0.533 | tests/regression/ses-424a-gate-card-excludes-pick.test.mjs | SES-424 slice 1
// (reopens SES-391) -- an UNDECIDED `gated_before_build` card takes its own ticket out of the pick
// path, and a DECIDED one gives it back.
//
// THE BUG THIS PINS, measured rather than recalled. `prime_directive_queue()` and
// `drain_epic_next(uuid)` are the platform's two pick homes, and before v7.0.533 neither read
// `public.runner_items` at all. So gating a ticket -- filing a `gated_before_build` card against it
// and leaving the card undecided -- changed nothing about whether the next unattended cycle would
// pick that same ticket up again. Live on 2026-09-18: cycle 10cbf8d2 gated SES-415 at 11:56Z, and
// cycles 0b5b33b4 (12:42Z) and 321aa875 (13:43Z) were each handed SES-415 as their pick. 0b5b33b4's
// own note asserted the queue "excludes an unresolved gate"; `pg_get_functiondef` said otherwise.
// That gap between a confident note and the shipped SQL is why this file drives the FUNCTION.
//
// (1) WHY A FIXTURE AND NOT A LIVE ASSERTION, which is the whole reason this file is shaped the way
// it is. At design time the board carried 10 undecided gate cards and NOT ONE of them sat on an
// open/partial ticket. So "no queued ref carries an undecided gate card" -- clause (iv) below -- is
// true on today's board whether or not the fix shipped. It is kept, because it is the property that
// must hold forever and it is the one that would catch a regression once the population is
// non-empty; but on its own it is VACUOUS, and a file that shipped only clause (iv) would have gone
// green against the unfixed function. Clauses (i)-(iii) insert the population the board lacks.
//
// (2) THE TRIPLE, NOT THE EXCLUSION ALONE. listed -> absent -> listed again. Asserting only the
// absence would pass just as well against a clause that excluded the ticket PERMANENTLY, or against
// one that had quietly emptied the queue of everything; either would strand real work, and an empty
// queue is a worse failure than the bug being fixed here -- it is the runner unable to pick ANY
// work. So (i) is a positive control that runs BEFORE the card exists, and (iii) proves a decided
// card restores the ticket.
//
// (3) THE OVER-FILTER GUARD IS A SET DIFFERENCE, NOT A COUNT. Clause (ii) does not merely check that
// the fixture is gone: it snapshots every ref the queue returns before and after the card is filed
// and asserts the symmetric difference is EXACTLY the fixture. A clause that excluded the fixture
// and three real tickets with it would satisfy "the fixture is absent" and fail this.
//
// (4) `drain_epic_next(uuid)` IS DELIBERATELY NEVER CALLED HERE, and that is a refusal this suite
// has made before (ses-281). Invoking it is not read-only -- it retires John's standing directive
// when the drain's required members are done, and a regression run must never do that. Its half of
// the change is asserted in the migration's own DO block (`pg_get_functiondef` contains THE CLAUSE
// exactly once, `pg_proc` count = 1), which is the seam available without firing the function.
// DECLARED, not silently omitted.
//
// (5) NOTHING IS HARDCODED THAT THE BOARD OWNS. The executing epic and the newest cycle id are read
// live; a literal epic id would rot the day the executing project changes and would do it silently,
// by making the fixture unbuildable and clause (i) fail for the wrong reason.
//
// NO MODEL CALL, NO SPEND. Two REST reads, one insert pair, one PATCH, one delete pair.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

const GATE_KIND = "gated_before_build";
const EXPECTED_LANE = "selfbuild";

// `ck_runner_items_backlog_id_bare` is `^[A-Z]+-[0-9]+[a-z]?$`, so the disambiguator has to be
// DIGITS. Five random ones, generated per run rather than fixed, because two concurrent suite runs
// on one database sharing a fixture id would delete each other's row in the `finally` below.
// THE SAME DIGITS BECOME `row_ordinal`, and that is not decoration: backlog_items carries a UNIQUE
// (source_file, row_ordinal), and every run of this file writes the same source_file -- a fixed
// ordinal of 0 makes two concurrent runs collide on a constraint that has nothing to do with the
// behaviour under test.
function fixtureNonce() {
  const n = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return { id: `ZFIX-424${n}`, ordinal: Number(n) };
}

async function pg(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  // `Prefer: return=minimal` answers 200/201 with an EMPTY body, not 204, so parsing
  // unconditionally throws "Unexpected end of JSON input" on every write. An empty body is a
  // successful write with nothing to report.
  const text = await res.text();
  if (text.trim() === "") return [];
  const body = JSON.parse(text);
  if (!Array.isArray(body)) throw new Error(`${pathAndQuery} returned a non-array payload`);
  return body;
}

const queue = (url, key) => pg(url, key, "rpc/prime_directive_queue", { method: "POST", body: "{}" });

// Every ref the queue names, in any lane. The board row carries a NULL ref and is not a pick.
const refsOf = rows => new Set(rows.filter(r => r.ref).map(r => r.ref));

async function run() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the whole file: the gate-card exclusion triple against the live prime_directive_queue()",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. This ticket's change is a pair of " +
        "Postgres functions, so there is no source-parsed half to grade without them. Canonical " +
        "invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  // -- What the board owns, read live (note 5) --------------------------------------------------
  const epics = await pg(url, key, "epics?select=id,name,projects!inner(id,status)&projects.status=eq.executing&limit=50");
  assert.ok(epics.length > 0,
    "no epic belongs to an executing project -- the fixture would be unbuildable for a reason that " +
    "has nothing to do with gate cards, so this file refuses to grade rather than fail misleadingly");
  const epicId = epics[0].id;

  const cycles = await pg(url, key, "runner_cycles?select=id&order=started_at.desc&limit=1");
  assert.equal(cycles.length, 1, "runner_cycles is empty -- runner_items.cycle_id is NOT NULL and FK");
  const cycleId = cycles[0].id;

  const { id: fixId, ordinal: fixOrdinal } = fixtureNonce();

  // -- BEFORE-IMAGE. Nothing may already hold this id, or the `finally` below would delete a real
  // row, and a regression arm that can destroy board data is worse than no arm (agt-68's rule).
  const heldTicket = await pg(url, key, `backlog_items?backlog_id=eq.${fixId}&select=backlog_id`);
  const heldCard = await pg(url, key, `runner_items?backlog_id=eq.${fixId}&select=id`);
  assert.deepEqual(heldTicket, [], `fixture ticket id ${fixId} must not already exist on the board`);
  assert.deepEqual(heldCard, [], `fixture card for ${fixId} must not already exist`);

  // The cleanup below is UNCONDITIONAL, never gated on an "inserted = true" flag, and that is a
  // lesson from this file's own first run: the POST landed the row and the helper then threw while
  // reading the (deliberately empty) response body, so the flag was never set and a real fixture
  // ticket was left on the board. A write that lands and then throws is exactly when cleanup
  // matters most.
  let cardId = null;
  try {
    await pg(url, key, "backlog_items", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        backlog_id: fixId,
        tier: "later",                       // keeps `type` NULL legal under ck_backlog_type_when_promoted
        title: "SES-424 regression fixture — gate card excludes pick",
        status: "open",
        source_file: "tests/regression/ses-424a-gate-card-excludes-pick.test.mjs",
        row_ordinal: fixOrdinal,
        epic_id: epicId,
        queue: 999990,                       // last in the order; `queue IS NULL` is the not-pickable condition
        filed_at: "2026-08-01T00:00:00Z",    // before the 2026-08-21 M5-02 cut, so no scope_rationale is owed
        claimed_by: null,
        blocked_by: null,
        defer_status: null,
        design_status: null,
      }]),
    });

    // (i) POSITIVE CONTROL, before any card exists. If this fails, the queue is over-filtering and
    // nothing below can be trusted -- so it fails loudly and says which direction broke.
    const beforeRows = await queue(url, key);
    const mine = beforeRows.filter(r => r.ref === fixId);
    assert.equal(mine.length, 1,
      `(i) positive control: an UNCARDED buildable fixture must be returned by ` +
      `prime_directive_queue() exactly once, got ${mine.length}. If this is 0 the pick path is ` +
      `returning nothing it should -- a queue that excludes real work is a worse failure than the ` +
      `gate bug SES-424 fixes.`);
    assert.equal(mine[0].lane, EXPECTED_LANE,
      `(i) the uncarded fixture must land on lane "${EXPECTED_LANE}", got "${mine[0].lane}"`);

    // (ii) THE FIX. An undecided gate card removes it from EVERY lane -- and removes nothing else.
    const created = await pg(url, key, "runner_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        cycle_id: cycleId,
        kind: GATE_KIND,
        title: "SES-424 regression fixture card",
        backlog_id: fixId,
        decision: null,
      }]),
    });
    assert.equal(created.length, 1, "the fixture gate card was not created");
    cardId = created[0].id;
    assert.equal(created[0].decision, null, "the fixture card must be UNDECIDED -- a decided one proves nothing");

    const gatedRows = await queue(url, key);
    assert.equal(gatedRows.filter(r => r.ref === fixId).length, 0,
      `(ii) with an UNDECIDED ${GATE_KIND} card on it, ${fixId} must not be returned by any lane of ` +
      `prime_directive_queue(). It still is -- this is SES-391's mechanism, and the pick path is ` +
      `handing back a ticket a cycle already gated.`);

    // (note 3) The exclusion must be SURGICAL. Symmetric difference, not a count.
    const before = refsOf(beforeRows);
    const after = refsOf(gatedRows);
    const lost = [...before].filter(r => !after.has(r));
    const gained = [...after].filter(r => !before.has(r));
    assert.deepEqual(lost, [fixId],
      `(ii) filing one gate card must remove EXACTLY the carded ticket. Removed: ` +
      `${JSON.stringify(lost)}. Anything else here is THE CLAUSE over-filtering the queue.`);
    assert.deepEqual(gained, [],
      `(ii) filing a gate card must not ADD anything to the queue. Added: ${JSON.stringify(gained)}`);

    // (iii) A DECIDED card gives the ticket back. Without this the exclusion could be permanent.
    await pg(url, key, `runner_items?id=eq.${cardId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ decision: "retired", decision_reason: "SES-424 fixture" }),
    });
    const restoredRows = await queue(url, key);
    const restored = restoredRows.filter(r => r.ref === fixId);
    assert.equal(restored.length, 1,
      `(iii) once the gate card is DECIDED (retired), ${fixId} must be pickable again, got ` +
      `${restored.length} row(s). A gate that never releases its ticket strands the work forever.`);
    assert.equal(restored[0].lane, EXPECTED_LANE,
      `(iii) the restored fixture must be back on lane "${EXPECTED_LANE}", got "${restored[0].lane}"`);

    // (iv) THE STANDING PROPERTY, over the real board. Vacuous while no open ticket carries an
    // undecided card (note 1) -- kept because it is the invariant that must hold as that population
    // grows, and it costs one read.
    const undecided = await pg(url, key, `runner_items?kind=eq.${GATE_KIND}&decision=is.null&select=backlog_id`);
    const gatedIds = new Set(undecided.map(c => c.backlog_id).filter(Boolean));
    const offenders = [...refsOf(restoredRows)].filter(r => gatedIds.has(r));
    assert.deepEqual(offenders, [],
      `(iv) no ref the pick path returns may carry an undecided ${GATE_KIND} card. Offenders: ` +
      `${JSON.stringify(offenders)} (of ${gatedIds.size} gated ticket ids live).`);
  } finally {
    // Card first, then ticket -- the card names the ticket by backlog_id. Both are deleted BY
    // backlog_id rather than by primary key, so a card whose insert landed but whose response never
    // parsed is still swept.
    await pg(url, key, `runner_items?backlog_id=eq.${fixId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } })
      .catch(e => console.log(`  [SES-424] WARNING: card cleanup failed (${e.message}); delete runner_items where backlog_id = ${fixId} by hand`));
    await pg(url, key, `backlog_items?backlog_id=eq.${fixId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } })
      .catch(e => console.log(`  [SES-424] WARNING: ticket cleanup failed (${e.message}); delete ${fixId} by hand`));

    const leftTicket = await pg(url, key, `backlog_items?backlog_id=eq.${fixId}&select=backlog_id`).catch(() => []);
    const leftCard = await pg(url, key, `runner_items?backlog_id=eq.${fixId}&select=id`).catch(() => []);
    assert.deepEqual(leftTicket, [], `the fixture ticket ${fixId} must be gone -- a run must leave the board as it found it`);
    assert.deepEqual(leftCard, [], `the fixture card for ${fixId} must be gone`);
  }
}

export default run;
selfRun(import.meta.url, run);
