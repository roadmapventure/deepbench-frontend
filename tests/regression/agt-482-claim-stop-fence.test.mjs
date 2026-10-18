// DeepBench v7.0.856 | tests/regression/agt-482-claim-stop-fence.test.mjs | AGT-482 -- the claim fence: one function holds the claim's 6-hour window, its STOPPED-BY-JOHN sentinel and the sentence it prints, and this guard proves both halves in both directions.
//
// WHAT THIS PINS. `public.claim_exclusion_reason(text, timestamptz)` answers ONE question -- "does
// this claim keep the ticket out of the pick?" -- as the reason, or NULL for no. Four callers read
// it: `pick_exclusions()` (the sentence), `drain_epic_next(uuid)` (the pick predicate and the peer
// counter) and `countable_tickets_per_project()` (AGT-481's sensor). Two things changed at once and
// BOTH have to hold:
//   * the window narrowed from `runner_settings.claim_stale_hours` (24) to
//     `public.countable_claim_hours()` (6) -- John's decision 10; and
//   * a `claimed_by` beginning `STOPPED-BY-JOHN` is NEVER freed by age -- John's decision 23.
// Shipping either one alone is a different, wrong platform, so every arm below names the deletion
// that would make it go red.
//
// THE REVERSE RISK THIS EXISTS FOR, measured live 2026-10-18 before the migration: AGT-020,
// AGT-159 and PRO-3 all carried `claimed_by = 'STOPPED-BY-JOHN-2026-09-29'`, 18 days old, and
// `pick_exclusions()` gave them NO claim reason at all -- already past the 24-hour window, held out
// of the pick by nothing but their project's `planned` status and a standing exclusive drain. Both
// of those can change without anybody touching the stop. Arm C re-reads that population every run.
//
// TWO NUMBERS, DELIBERATELY (arm D). `claim_stale_hours` stays 24 and still paints
// `backlog_mode()`'s "in development" badge; the pick and the sensor read 6. Arm D asserts all
// three in ONE run so that nobody later "tidies" them into one number without this going red.
//
// READ-ONLY, always (pattern:76): every call here is a GET or a read-only rpc, including the
// PostgREST probe in arm E, which issues the claim's own query string as a GET and never a PATCH.
// Nothing is written and no fixture is stood up on the live board.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import { CLAIM_TTL_HOURS, STOP_CLAIM_PREFIX, claimQueryFor } from "../../scripts/run-project.js";

// The sentence F1 prints for a stop. A PREFIX test, never an equality test: the live rows carry a
// date suffix, and the sentinel has to match every one of them.
export const STOP_SENTENCE = /^stopped by John/;

// Pure -- the driver's half of the fence, so arm E can state it without a database.
export function driverFreesClaim(claimedBy, claimedAt, hours, now = Date.now()) {
  if (claimedBy === null || claimedBy === undefined) return true;
  if (String(claimedBy).startsWith(STOP_CLAIM_PREFIX)) return false;
  if (!claimedAt) return false;
  return Date.parse(claimedAt) < now - hours * 3600 * 1000;
}

async function run() {
  const results = [];

  // --- E (pure half, first: it needs no credentials) -------------------------------------------
  // The driver's two declared constants and the query they build. `STOP_CLAIM_PREFIX` is a DECLARED
  // second copy of the SQL sentinel -- PostgREST cannot call a function inside a filter -- so the
  // credentialed half below round-trips it through the rpc rather than trusting it.
  assert.strictEqual(CLAIM_TTL_HOURS, 6,
    `scripts/run-project.js CLAIM_TTL_HOURS = ${CLAIM_TTL_HOURS}, expected 6 (John's decision 10). `
    + "A 24 here is the pre-AGT-482 window and means the driver would re-claim a ticket the database's "
    + "pick path still considers held.");
  assert.strictEqual(STOP_CLAIM_PREFIX, "STOPPED-BY-JOHN",
    `STOP_CLAIM_PREFIX = ${JSON.stringify(STOP_CLAIM_PREFIX)} -- the sentinel the live rows carry is `
    + "`STOPPED-BY-JOHN-<date>`, so the driver's copy must be exactly the prefix.");

  const iso = new Date(Date.now() - CLAIM_TTL_HOURS * 3600 * 1000).toISOString();
  const q = claimQueryFor("T-1", iso);
  assert.ok(q.includes("claimed_by.not.like.STOPPED-BY-JOHN*"),
    "claimQueryFor() must carry the stop INSIDE the atomic claim -- a claim that only checks age "
    + `re-claims an 18-day-old STOPPED-BY-JOHN row the moment the pick offers it. got: ${q}`);
  assert.ok(q.includes(`and(claimed_at.lt.${encodeURIComponent(iso)},claimed_by.not.like.STOPPED-BY-JOHN*)`),
    "the age test and the stop must be AND-ed together inside the `or=(...)` group -- OR-ing them "
    + `would make either one alone free the claim, which frees every stop. got: ${q}`);
  assert.ok(q.startsWith("backlog_items?backlog_id=eq.T-1") && q.includes("status=neq.done"),
    `the rest of rule B40's claim must be unchanged: ${q}`);

  // The deletion control for the pure half, stated as behaviour rather than as a string: an unheld
  // row and a 7h-old ordinary claim are free; a 5h-old one and a STOPPED one at any age are not.
  assert.strictEqual(driverFreesClaim(null, null, CLAIM_TTL_HOURS), true, "an unheld row is claimable");
  assert.strictEqual(driverFreesClaim("cycle-x", new Date(Date.now() - 7 * 3600e3).toISOString(), CLAIM_TTL_HOURS), true,
    "a 7h-old ordinary claim is past the 6h window and is claimable");
  assert.strictEqual(driverFreesClaim("cycle-x", new Date(Date.now() - 5 * 3600e3).toISOString(), CLAIM_TTL_HOURS), false,
    "a 5h-old ordinary claim is inside the 6h window -- widening the window alone fails here");
  assert.strictEqual(driverFreesClaim("STOPPED-BY-JOHN-2026-09-29", new Date(Date.now() - 19 * 86400e3).toISOString(), CLAIM_TTL_HOURS), false,
    "a STOPPED-BY-JOHN claim is never freed by age -- deleting the sentinel arm makes this true");
  results.push("driver-declares-six-hours-and-the-stop-inside-the-atomic-claim");

  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("arms A-D and the live half of arm E (the rpc's two directions, the stop at two ages, the "
      + "live STOPPED rows in pick_exclusions(), the two claim homes, and the claim query as PostgREST reads it)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- the fence is a database function and there is "
      + "nothing to read without them. Run: node --env-file-if-exists=.env.local "
      + "tests/regression/agt-482-claim-stop-fence.test.mjs");
    return results;
  }

  const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const get = async qs => {
    const r = await fetch(`${base}/rest/v1/${qs}`, { headers: hdr });
    if (!r.ok) assert.fail(`GET ${qs} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
    return r.json();
  };
  const rpc = async (fn, body = {}) => {
    const r = await fetch(`${base}/rest/v1/rpc/${fn}`, { method: "POST", headers: hdr, body: JSON.stringify(body) });
    if (!r.ok) assert.fail(`rpc/${fn} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
    return r.json();
  };
  const at = hoursAgo => new Date(Date.now() - hoursAgo * 3600e3).toISOString();
  const reason = (by, atIso) => rpc("claim_exclusion_reason", { p_claimed_by: by, p_claimed_at: atIso });

  // --- A: the 6-hour window, both ways ---------------------------------------------------------
  // Doing nothing at all fails the 7h read (24 would still call it held); widening the window alone
  // fails the 5h read. Both have to be true in the same run, which is what makes this a window and
  // not a direction.
  const seven = await reason("cycle-a", at(7));
  assert.strictEqual(seven, null,
    `claim_exclusion_reason('cycle-a', -7h) = ${JSON.stringify(seven)}, expected null. A 7-hour-old `
    + "ordinary claim is past John's 6-hour window and the ticket is pickable. A non-null here means "
    + "the function is still reading runner_settings.claim_stale_hours (24).");
  const five = await reason("cycle-a", at(5));
  assert.strictEqual(five, "claimed by cycle-a",
    `claim_exclusion_reason('cycle-a', -5h) = ${JSON.stringify(five)}, expected "claimed by cycle-a". `
    + "A null here means the window was widened past 6 and a live peer's claim no longer holds -- the "
    + "race rule B40 exists to prevent.");
  const noStamp = await reason("cycle-a", null);
  assert.strictEqual(noStamp, "claimed by cycle-a",
    `a held claim with no claimed_at must read LIVE (got ${JSON.stringify(noStamp)}) -- that is the `
    + "cautious direction the live bodies already took, where the NULL comparison is not true.");
  const unheld = await reason(null, new Date().toISOString());
  assert.strictEqual(unheld, null,
    `an unclaimed row must read free (got ${JSON.stringify(unheld)}) -- claimed_by NULL is the first arm.`);
  results.push("six-hour-window-both-ways-7h-free-5h-held");

  // --- B: the stop, at 19 days and at 1 minute, one identical sentence -------------------------
  const old = await reason("STOPPED-BY-JOHN-2026-09-29", at(19 * 24));
  const fresh = await reason("STOPPED-BY-JOHN-2026-09-29", at(1 / 60));
  assert.strictEqual(old, fresh,
    `the stop reads ${JSON.stringify(old)} at 19 days and ${JSON.stringify(fresh)} at 1 minute. Age must `
    + "not touch it: the sentinel arm is tested BEFORE the age arm precisely so that elapsed time can "
    + "never free John's stop. Deleting that arm makes the 19-day read null and these two differ.");
  assert.ok(STOP_SENTENCE.test(String(old)),
    `a STOPPED-BY-JOHN claim reads ${JSON.stringify(old)} -- expected a sentence opening "stopped by John". `
    + "The generic 'claimed by <holder>' sentence would be indistinguishable from an ordinary live claim.");
  assert.ok(String(old).includes("STOPPED-BY-JOHN-2026-09-29"),
    `the sentence must name the holder it found (got ${JSON.stringify(old)}) -- the date suffix is how a `
    + "reader knows which stop this is.");
  results.push("the-stop-is-identical-at-19-days-and-at-one-minute");

  // --- C: the live population, through pick_exclusions() ---------------------------------------
  // Recomputed every run, never pinned to today's three ids: the guard keeps working as John stops
  // and releases tickets.
  const stopped = await get("backlog_items?claimed_by=like.STOPPED-BY-JOHN*&select=id,backlog_id,claimed_by,claimed_at&order=backlog_id");
  if (stopped.length === 0) {
    notRun("arm C -- that every live STOPPED-BY-JOHN row carries the stop reason in pick_exclusions()",
      "no board row carries the sentinel right now, so there is nothing live to read. Asserting over an "
      + "empty set would be a vacuous green (pattern:77). Arm B still drives the same code path through "
      + "rpc/claim_exclusion_reason at two ages.");
  } else {
    const excl = await rpc("pick_exclusions");
    const byId = new Map(excl.map(r => [r.id, r.reasons ?? []]));
    const missing = [];
    for (const row of stopped) {
      const reasons = byId.get(row.id);
      assert.ok(reasons, `pick_exclusions() returned no row at all for ${row.backlog_id}`);
      if (!reasons.some(r => STOP_SENTENCE.test(String(r)))) missing.push(`${row.backlog_id} {${reasons.join(", ")}}`);
    }
    assert.deepStrictEqual(missing, [],
      `${missing.length} of ${stopped.length} STOPPED-BY-JOHN row(s) carry NO stop reason in `
      + `pick_exclusions(): ${missing.join(" | ")}. Before AGT-482 that was ALL of them -- they were held `
      + "out of the pick only by their project's status and a standing exclusive drain, neither of which "
      + "is the stop. A reader left on the old claim clause fails exactly here.");
    console.log(`         AGT-482 arm C, recomputed this run: ${stopped.length} stopped row(s) fenced -- `
      + stopped.map(r => r.backlog_id).join(", "));
    results.push("every-live-stopped-row-carries-the-stop-in-pick-exclusions");
  }

  // --- D: two numbers, two homes, one run ------------------------------------------------------
  const hours = await rpc("countable_claim_hours");
  assert.strictEqual(hours, 6,
    `countable_claim_hours() = ${hours}, expected 6 -- this is the ONE home of the pick's and the `
    + "sensor's window, and claim_exclusion_reason() reads it rather than declaring a second 6.");
  const settings = await get("runner_settings?id=eq.1&select=claim_stale_hours");
  assert.strictEqual(settings[0]?.claim_stale_hours, 24,
    `runner_settings.claim_stale_hours = ${settings[0]?.claim_stale_hours}, expected 24. AGT-482 did NOT `
    + "touch it: 24 now serves backlog_mode()'s display badge alone (OD-08). Changing it here would move "
    + "a visible badge John has not seen (pattern:84).");
  const badge = await rpc("backlog_mode", {
    p_status: "partial", p_claimed_by: "cycle-a", p_claimed_at: at(7), p_backlog_id: "AGT-482-NO-SUCH-ROW" });
  assert.strictEqual(badge, "in development",
    `backlog_mode() reads ${JSON.stringify(badge)} for a 7-hour-old claim, expected "in development". `
    + "The badge is still on the 24-hour window, which is the whole reason the platform now holds two "
    + "claim numbers. If this ever reads otherwise, somebody tidied the two homes into one.");
  assert.notStrictEqual(hours, settings[0]?.claim_stale_hours,
    "the two claim windows must stay DIFFERENT numbers with different jobs -- 6 for the pick and the "
    + "sensor, 24 for the badge. Equal here means one of the two homes was collapsed into the other.");
  results.push("two-claim-homes-six-for-the-pick-twentyfour-for-the-badge");

  // --- E (live half): the driver's copy, and the claim query as PostgREST actually reads it -----
  // The round trip that makes STOP_CLAIM_PREFIX a CHECKED copy: hand the SQL home the driver's own
  // constant and require it to answer the stop.
  const roundTrip = await reason(`${STOP_CLAIM_PREFIX}-2026-09-29`, at(19 * 24));
  assert.ok(STOP_SENTENCE.test(String(roundTrip)),
    `the database does not recognise the driver's own sentinel: claim_exclusion_reason('${STOP_CLAIM_PREFIX}`
    + `-2026-09-29', -19d) = ${JSON.stringify(roundTrip)}. The two copies have drifted, which is the one `
    + "failure a declared second copy can have.");

  if (stopped.length === 0) {
    notRun("the live half of arm E -- the claim query refusing a real STOPPED row through PostgREST",
      "no board row carries the sentinel right now, so there is no live row for the filter to refuse. "
      + "The query STRING is asserted above without credentials.");
  } else {
    // The claim's own query string, issued as a GET so nothing is written. The row must NOT come
    // back; the same query WITHOUT the stop clause must bring it back. That second call is the
    // deletion control, run live rather than described.
    const victim = stopped[0];
    const cutoff = at(CLAIM_TTL_HOURS);
    const fenced = await get(claimQueryFor(victim.backlog_id, cutoff));
    assert.deepStrictEqual(fenced, [],
      `the claim query still matches ${victim.backlog_id}, a ${victim.claimed_by} row -- PostgREST returned `
      + `${JSON.stringify(fenced)}. The PATCH built from this string would have RE-CLAIMED John's stop.`);
    const control = await get(`backlog_items?backlog_id=eq.${encodeURIComponent(victim.backlog_id)}&status=neq.done`
      + `&or=(claimed_by.is.null,claimed_at.lt.${encodeURIComponent(cutoff)})`
      + "&select=backlog_id");
    assert.strictEqual(control.length, 1,
      `the deletion control did not fire: the PRE-AGT-482 query (age only, no stop) returned `
      + `${JSON.stringify(control)} for ${victim.backlog_id}. It must return the row -- that is what proves `
      + "the empty result above comes from the stop clause and not from some unrelated filter.");
    console.log(`         AGT-482 arm E, live: the claim query refuses ${victim.backlog_id} (${victim.claimed_by}); `
      + "the age-only form still matches it.");
    results.push("the-claim-query-refuses-a-real-stopped-row-and-the-age-only-form-does-not");
  }

  return results;
}

selfRun(import.meta.url, run);
export default run;
