// DeepBench v7.0.539 | tests/regression/ses-424g-blocker-cleared.test.mjs | SES-424 slice 7 --
// there is ONE definition of "the blocker no longer blocks", both pick homes read it, and no
// ticket is left waiting on a blocker that definition can never admit.
//
// THE DRIFT THIS PINS, measured 2026-09-20 rather than recalled. The unblocking status list was
// hand-copied into two places: `drain_epic_next(uuid)` line 77 (`ARRAY['done','removed',
// 'delivered']`) and `prime_directive_queue()`'s `buildable` CTE. The two copies had already come
// apart -- the CTE's read `bb.status IN ('done','removed')`, with no `delivered` -- so a ticket
// waiting on one of the board's 20 `delivered` rows was buildable to the drain and unbuildable to
// the queue, against docs/runbooks/runner-cycle.md:2477/:2486, which is John's own wording. Both
// homes now call `public.backlog_unblocking_statuses()` and neither keeps a copy.
//
// (1) WHY A FIXTURE AND NOT A LIVE ASSERTION, the same reason ses-424a gives. At design time the
// board carried 20 `delivered` rows and NOT ONE of them blocked anything, so "a delivered blocker
// does not block" is unfalsifiable against today's data: it reads green on the drifted function
// and on the fixed one alike. Clause A inserts the population the board lacks. Clause B keeps the
// standing property over the real board, which is the one that catches a regression once that
// population is non-empty.
//
// (2) THE TRIPLE, NOT THE EXCLUSION ALONE. listed -> still listed -> absent -> listed again.
// Asserting only "a delivered blocker does not block" would pass just as well against a clause
// that had stopped blocking ANYTHING, which strands nothing but silently admits every real
// blocker. A(iii) is that control: ONE edit to ONE column on ONE row (the blocker's status, out of
// the set) must make the dependent disappear, and A(iv) puts the edit back and gets it returned.
//
// (3) CLAUSE B IS A CENSUS WITH ITS OWN CONTROL. "No ticket waits on a blocker outside the set" is
// true of an empty board for the wrong reason, so B first proves the census can COUNT: with the
// fixture edge pointed at a `removal proposed` blocker it must return exactly the fixture and
// nothing else. Only then is the count over the real board -- which slice 7's second migration
// took from five to zero -- worth reading as a zero.
//
// (4) CLAUSE C DRIVES THE FIXTURE FROM THE FUNCTION'S OWN OUTPUT, never from a literal list in
// this file. A second hand-copy of the three words -- here, in the test -- is the very defect the
// ticket removes, and it would go green while the queue honoured something else entirely. So C
// asserts the exact ordered triple ONCE (a one-word edit to the definition fails it), then walks
// the fixture's blocker through EVERY status the RPC named and requires the dependent to stay
// listed for each, plus one status it did NOT name and requires it gone. That is the two homes
// agreeing, proven, rather than asserted.
//
// (5) `drain_epic_next(uuid)` IS DELIBERATELY NEVER CALLED, the refusal ses-281 made and ses-424a
// repeats: invoking it is not read-only -- it retires John's standing directive when a drain's
// required members are done. Its half of this change is asserted in the migration's own DO block
// (`pg_get_functiondef` names `backlog_unblocking_statuses`, the old literal is gone, `pg_proc` =
// 1). DECLARED here, not silently omitted.
//
// (6) THE BLOCKER FIXTURE CARRIES NO EPIC, and that is load-bearing for clause C, not tidiness.
// `backlog_done_requires_verdict` refuses `status = 'done'` on any ticket whose epic belongs to a
// project, so a blocker on the executing epic could never be walked to 'done' -- C would have had
// to skip a third of the set it is checking. A blocker is only ever read through
// `bb.status`, so it needs no epic. The DEPENDENT carries the epic, because it is the row that has
// to be buildable.
//
// NO MODEL CALL, NO SPEND. REST reads, one insert pair, a handful of PATCHes, one delete pair.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

const EXPECTED_LANE = "selfbuild";
// The executing Selfbuild epic the kickoff names. Asserted live below rather than trusted: if the
// executing project ever changes, the fixture becomes unbuildable and clause A would fail for a
// reason that has nothing to do with blockers -- so it fails HERE, saying that.
const EPIC_ID = "1af331b4-682e-4f8a-ac75-c68e0f1887fe";
// One status the definition must NOT hold. It is also the status of all five blockers slice 7's
// second migration cleared, so it is the real shape of the bug, not an invented one.
const OUTSIDE_THE_SET = "removal proposed";

// `backlog_items` carries UNIQUE (source_file, row_ordinal) and every run of this file writes the
// same source_file, so the ordinals are drawn per run -- two concurrent suite runs must not collide
// on a constraint that has nothing to do with the behaviour under test. The two rows of one run get
// ordinals 100000 apart for the same reason, within the run.
function fixtureNonce() {
  const n = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return { blockerId: `ZBLK-${n}`, dependentId: `ZFIX-${n}`, ordinal: Number(n) };
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
  const text = await res.text();
  if (text.trim() === "") return [];
  const body = JSON.parse(text);
  if (!Array.isArray(body)) throw new Error(`${pathAndQuery} returned a non-array payload`);
  return body;
}

const queue = (url, key) => pg(url, key, "rpc/prime_directive_queue", { method: "POST", body: "{}" });
const refsOf = rows => new Set(rows.filter(r => r.ref).map(r => r.ref));

// Every ticket that waits on somebody, with the blocker's status resolved. Two flat reads rather
// than an embedded PostgREST join: the embed needs the FK's name, and a renamed constraint would
// turn this census into a silent empty set -- which is exactly the answer it is looking for.
async function blockedEdges(url, key) {
  const waiting = await pg(url, key, "backlog_items?blocked_by=not.is.null&select=backlog_id,blocked_by");
  if (waiting.length === 0) return [];
  const ids = [...new Set(waiting.map(w => w.blocked_by))];
  const blockers = await pg(url, key, `backlog_items?id=in.(${ids.join(",")})&select=id,backlog_id,status`);
  const byId = new Map(blockers.map(b => [b.id, b]));
  return waiting.map(w => ({
    ticket: w.backlog_id,
    blocker: byId.get(w.blocked_by)?.backlog_id ?? "(unreadable)",
    blockerStatus: byId.get(w.blocked_by)?.status ?? "(unreadable)",
  }));
}

async function run() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the whole file: the unblocking-set triple, the blocked_by census and the shared definition",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. This ticket's change is three Postgres " +
        "functions and a data pass, so there is no source-parsed half to grade without them. " +
        "Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  // -- C, first half: THE ONE DEFINITION, exactly and in order. Everything below reads the set from
  // here rather than from a literal, so a second hand-copy cannot take root in this file (note 4).
  const theSet = await pg(url, key, "rpc/backlog_unblocking_statuses", { method: "POST", body: "{}" });
  assert.deepStrictEqual(theSet, ["done", "removed", "delivered"],
    `(C) public.backlog_unblocking_statuses() must return exactly ["done","removed","delivered"], in ` +
    `that order -- it is THE definition both pick homes read, and runner-cycle.md:2477/:2486 is ` +
    `John's own wording of it. Got ${JSON.stringify(theSet)}.`);
  assert.ok(!theSet.includes(OUTSIDE_THE_SET),
    `(C) "${OUTSIDE_THE_SET}" must NOT end a blocked_by wait. Admitting it would weaken John's ` +
    `SES-218 directive, which is his to change -- slice 7 cleared the five stale EDGES instead.`);

  const executing = await pg(url, key,
    `epics?id=eq.${EPIC_ID}&select=id,name,projects!inner(id,status)&projects.status=eq.executing`);
  assert.equal(executing.length, 1,
    `epic ${EPIC_ID} must belong to an executing project or the fixture dependent is unbuildable for ` +
    `a reason that has nothing to do with blockers -- re-point EPIC_ID at the executing Selfbuild epic`);

  const { blockerId, dependentId, ordinal } = fixtureNonce();
  const held = await pg(url, key,
    `backlog_items?backlog_id=in.(${blockerId},${dependentId})&select=backlog_id`);
  assert.deepEqual(held, [],
    `fixture ids ${blockerId} / ${dependentId} must not already be on the board -- the cleanup below ` +
    `deletes by backlog_id and must never reach a real row`);

  const listed = async () => (await queue(url, key)).filter(r => r.ref === dependentId);
  const setBlocker = body => pg(url, key, `backlog_items?backlog_id=eq.${blockerId}`,
    { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(body) });

  // Cleanup is UNCONDITIONAL and never gated on an "inserted" flag: a POST that lands and THEN
  // throws while its response is read is exactly when it matters (ses-424a's own first-run lesson).
  try {
    await pg(url, key, "backlog_items", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([
        {
          backlog_id: blockerId,
          tier: "later",
          title: "ses-424g blocker",
          status: "delivered",
          source_file: "ses-424g",
          row_ordinal: ordinal,
          epic_id: null,              // note 6: no epic, so clause C can walk it to 'done'
          queue: null,                // never itself a pick
          filed_at: "2026-08-01T00:00:00Z",
          blocked_by: null,
        },
        {
          backlog_id: dependentId,
          tier: "later",
          title: "ses-424g dependent",
          status: "open",
          source_file: "ses-424g",
          row_ordinal: ordinal + 100000,
          epic_id: EPIC_ID,
          queue: 999990,              // last in the order; queue IS NULL is the not-pickable condition
          filed_at: "2026-08-01T00:00:00Z",   // before the 2026-08-21 M5-02 cut, so no scope_rationale is owed
          blocked_by: null,
        },
      ]),
    });

    // -- A (i) POSITIVE CONTROL. Nothing blocks it yet, so it must be a pick. If this is 0 the pick
    // path is withholding real work, which is a worse failure than the drift slice 7 fixes.
    const free = await listed();
    assert.equal(free.length, 1,
      `(A i) positive control: an UNBLOCKED fixture must be returned by prime_directive_queue() ` +
      `exactly once, got ${free.length}. A queue returning nothing it should is a worse failure ` +
      `than the drift this ticket fixes.`);
    assert.equal(free[0].lane, EXPECTED_LANE,
      `(A i) the unblocked fixture must land on lane "${EXPECTED_LANE}", got "${free[0].lane}"`);

    const blockerRow = await pg(url, key, `backlog_items?backlog_id=eq.${blockerId}&select=id,status`);
    assert.equal(blockerRow.length, 1, "the fixture blocker was not created");
    assert.equal(blockerRow[0].status, "delivered", "the fixture blocker must start at 'delivered'");
    await pg(url, key, `backlog_items?backlog_id=eq.${dependentId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ blocked_by: blockerRow[0].id }),
    });

    // -- A (ii) THE DRIFT ITSELF. This is the assertion that fails on an unedited tree.
    const behindDelivered = await listed();
    assert.equal(behindDelivered.length, 1,
      `(A ii) ${dependentId} waits on a DELIVERED blocker, and 'delivered' ends a wait -- ` +
      `drain_epic_next(uuid) has said so since SES-275 and runner-cycle.md:2477/:2486 is John's ` +
      `wording. prime_directive_queue() returned ${behindDelivered.length} row(s) for it: the ` +
      `CTE is reading a hand-copy of the set that has drifted, not public.backlog_unblocking_statuses().`);
    assert.equal(behindDelivered[0].lane, EXPECTED_LANE,
      `(A ii) the unblocked-by-delivered fixture must still be on lane "${EXPECTED_LANE}"`);

    // -- A (iii) THE ONE-EDIT CONTROL. One column, one row, out of the set -> gone.
    await setBlocker({ status: OUTSIDE_THE_SET });
    const behindOutsider = await listed();
    assert.equal(behindOutsider.length, 0,
      `(A iii) control: with its blocker moved to "${OUTSIDE_THE_SET}" -- a status the definition ` +
      `does not hold -- ${dependentId} must be gone from every lane, got ${behindOutsider.length} ` +
      `row(s). A clause that still lists it has stopped blocking anything at all, which is a ` +
      `larger failure than the one this file is here for.`);

    // -- B, with its own population. The census must be able to COUNT before a zero from it means
    // anything (note 3): right now exactly one edge in the world points at a `removal proposed`
    // blocker, and it is the fixture.
    const seeded = (await blockedEdges(url, key)).filter(e => e.blockerStatus === OUTSIDE_THE_SET);
    assert.deepEqual(seeded.map(e => e.ticket), [dependentId],
      `(B control) with the fixture edge live, the census must return exactly [${dependentId}] -- ` +
      `got ${JSON.stringify(seeded.map(e => `${e.ticket} -> ${e.blocker}`))}. A census that cannot ` +
      `see a live offender cannot be believed when it reports none.`);

    // -- A (iv) the edit goes back, and so does the ticket.
    await setBlocker({ status: "delivered" });
    const restored = await listed();
    assert.equal(restored.length, 1,
      `(A iv) putting the blocker back to 'delivered' must return ${dependentId} to the queue, got ` +
      `${restored.length} row(s) -- the exclusion in (A iii) must be the blocker's status and ` +
      `nothing else`);

    // -- C, second half: EVERY status the definition names really does end a wait, and the two
    // homes agree about which. Driven by the RPC's own output (note 4).
    for (const status of theSet) {
      await setBlocker({ status });
      const rows = await listed();
      assert.equal(rows.length, 1,
        `(C) public.backlog_unblocking_statuses() names "${status}", so a blocker at "${status}" must ` +
        `not block: ${dependentId} must be returned by prime_directive_queue(), got ${rows.length} ` +
        `row(s). The definition and the queue disagree -- which is the whole defect slice 7 removes.`);
    }

    // -- B (i) THE REAL BOARD. The fixture's blocker is back inside the set, so every edge counted
    // here is a real one. Slice 7's second migration took this count from five to zero.
    //
    // THE COUNT IS OF ONE STATUS, NOT OF "outside the set", and the difference is the whole point.
    // A ticket waiting on an `open` blocker is a wait working exactly as intended: the blocker is
    // live work, and finishing it ends the wait. `removal proposed` is the shape that CANNOT end --
    // the blocker is one of the nine rows SES-424 consolidated, so no later event moves it into the
    // definition and no later event moves it back to open either. (Asserting "outside the set" here
    // instead reported all ten of the board's healthy open-blocker waits as defects, which is how
    // this distinction got measured rather than assumed.)
    const stuck = (await blockedEdges(url, key)).filter(e => e.blockerStatus === OUTSIDE_THE_SET);
    assert.deepEqual(stuck, [],
      `(B i) no ticket may wait on a "${OUTSIDE_THE_SET}" blocker -- that wait can never end, and ` +
      `widening the definition to admit it would weaken John's SES-218 directive. Slice 7 cleared ` +
      `five such edges (SES-397, SES-402, SES-408 behind SES-378; SES-416 behind SES-415; SES-417 ` +
      `behind SES-416). Offenders: ${JSON.stringify(stuck)}`);

    // -- B (ii) AND NOTHING THE PICK PATH HANDS BACK IS SECRETLY STILL BLOCKED. The other direction
    // of the same property, read off the queue rather than off the table.
    const queued = refsOf(await queue(url, key));
    const stillBlocked = (await blockedEdges(url, key))
      .filter(e => queued.has(e.ticket) && !theSet.includes(e.blockerStatus));
    assert.deepEqual(stillBlocked, [],
      `(B ii) prime_directive_queue() returned ${stillBlocked.length} ref(s) whose blocker sits ` +
      `outside the unblocking set: ${JSON.stringify(stillBlocked)}`);
  } finally {
    // Dependent first: it names the blocker through backlog_items_blocked_by_fkey, and deleting the
    // blocker underneath it fails. Both go by backlog_id so an insert that landed and then threw is
    // still swept.
    await pg(url, key, `backlog_items?backlog_id=eq.${dependentId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } })
      .catch(e => console.log(`  [SES-424] WARNING: dependent cleanup failed (${e.message}); delete ${dependentId} by hand`));
    await pg(url, key, `backlog_items?backlog_id=eq.${blockerId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } })
      .catch(e => console.log(`  [SES-424] WARNING: blocker cleanup failed (${e.message}); delete ${blockerId} by hand`));

    const left = await pg(url, key,
      `backlog_items?backlog_id=in.(${blockerId},${dependentId})&select=backlog_id`).catch(() => []);
    assert.deepEqual(left, [],
      `the fixture rows ${blockerId} / ${dependentId} must be gone -- a run leaves the board as it found it`);
  }
}

export default run;
selfRun(import.meta.url, run);
