// DeepBench v7.0.854 | tests/regression/agt-481-countable-tickets.test.mjs | AGT-481 -- the countable-ticket sensor: one function counts the takeable tickets of every executing project, and this guard recomputes that count from the raw board rather than believing it.
//
// WHAT THIS PINS. `public.countable_tickets_per_project()` returns ONE row per `executing` project
// -- slug, name, the count, and the ids -- where a ticket counts only if all eight predicates hold:
// P1 status open/partial, P2 need_score >= 3 -- `public.effective_need_score()` since AGT-483
// (v7.0.857), so a blocker is counted at the score of the open work waiting behind it and this
// guard's hand count recomputes that lift itself rather than letting PostgREST filter on the raw
// column -- P3 an unreversed `requirement-check` row exists,
// P4 no blocker outside `backlog_unblocking_statuses()`, P5 the newest unreversed grade's reasoning
// does not begin `PARKED` (DL-09 keeps PARKED in `runner_decisions.reasoning`, not in a column),
// P6 no undecided `gated_before_build` card, P7 no `needs-` design flag, P8 no claim younger than
// `public.countable_claim_hours()` (6, John's decision 10 -- NOT the pick's `claim_stale_hours` of
// 24). `service_role` only. Before this migration both names 404'd with `PGRST202`.
//
// THE DISCRIMINATING ARM IS B, and it is discriminating because it NEVER ASKS THE FUNCTION. It
// pulls the raw rows the function reads -- epics, scored open tickets, their grades, their blockers,
// their gate cards -- and applies P1-P8 in JavaScript, then demands the same ids and the same count.
// A function that counted RAW scored-open tickets instead of countable ones would pass a test that
// only checked "it returns a number per project" and fails this one: on the board of 2026-10-17
// `tooling` holds raw 2 and countable 1, because AGT-237 carries `design_status = needs-desktop`
// while AGT-304 carries none. That gap of exactly one is the assert's whole value, so arm B PRINTS
// `raw -> countable` per project and pins neither number -- both are recomputed every run, so the
// guard keeps working as the board moves and never has to be edited when a ticket ships.
//
// READ-ONLY, always (pattern:76): every call here is a GET or a read-only rpc. Nothing is written,
// nothing is cleaned up, and no fixture is stood up on the live board.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

// The pick's own unblocking rule, which P4 shares: `public.backlog_unblocking_statuses()` returned
// exactly these three live on 2026-10-17. Kept here so arm B's hand count never calls a database
// function to grade the database function it is checking.
export const UNBLOCKING = ["done", "removed", "delivered"];

// Pure -- P5. The newest unreversed grade's reasoning parks the ticket when it BEGINS with PARKED
// (DL-09 writes `PARKED (0) until ...`). Case-insensitive, and a missing reason never parks.
export function isParked(reasoning) {
  return /^parked/i.test(String(reasoning ?? ""));
}

// Pure -- P8. A claim counts as LIVE (so the ticket is NOT countable) when it is held and younger
// than `hours`. A held claim with no `claimed_at` reads live: that is the cautious direction, and it
// mirrors the SQL, where the NULL comparison is not true and so the row is out.
export function claimIsLive(claimedBy, claimedAt, hours, now = Date.now()) {
  if (claimedBy === null || claimedBy === undefined || claimedBy === "") return false;
  if (!claimedAt) return true;
  return Date.parse(claimedAt) >= now - hours * 3600 * 1000;
}

// Pure -- P2, AGT-483 (v7.0.857). A ticket's EFFECTIVE severity: the highest of its own score and
// the scores lifted from the open/partial tickets blocked by it. A non-integer (an unscored row) is
// ignored and null comes back when nothing in the set is scored at all -- which is exactly what
// GREATEST does inside `public.effective_need_score`, and it is how an unscored blocker inherits.
export function effectiveScore(own, lifts = []) {
  const ints = [own, ...lifts].filter(s => Number.isInteger(s));
  return ints.length === 0 ? null : Math.max(...ints);
}

// Pure -- P7. The rule is the PREFIX, not a list of today's three values, so a new `needs-` flag is
// covered on arrival.
export function hasDesignFlag(designStatus) {
  return String(designStatus ?? "").startsWith("needs-");
}

async function run() {
  const results = [];

  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("every arm of this guard (the sensor's rows, the hand count, the claim window, the anon denial)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- the sensor is a database function and there is "
      + "nothing to read without them. Run: node --env-file-if-exists=.env.local "
      + "tests/regression/agt-481-countable-tickets.test.mjs");
    return results;
  }

  const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const get = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!r.ok) assert.fail(`GET ${q} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
    return r.json();
  };
  const rpc = async (fn, body = {}) => {
    const r = await fetch(`${base}/rest/v1/rpc/${fn}`, { method: "POST", headers: hdr, body: JSON.stringify(body) });
    if (!r.ok) assert.fail(`rpc/${fn} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
    return r.json();
  };

  // --- C (first, because arms B and D need its number) ------------------------------------------
  // The floor's claim window is John's decision 10. Read it, never assume 6 -- but assert it IS 6,
  // because the whole point of giving it its own function was that it is not the pick's 24.
  const hours = await rpc("countable_claim_hours");
  assert.strictEqual(typeof hours, "number",
    `rpc/countable_claim_hours must return a bare integer, got ${JSON.stringify(hours)}`);
  assert.strictEqual(hours, 6,
    `countable_claim_hours() = ${hours}, expected 6 (John's decision 10). The pick's claim_stale_hours is 24 `
    + "and is a different question -- if this now reads 24 the floor has been wired to the pick's number.");
  results.push("claim-window-is-johns-six-not-the-picks-24");

  // --- A: one row per executing project, in the board's own order -------------------------------
  const projects = await get("projects?status=eq.executing&select=id,slug,name,priority&order=priority,slug");
  const rows = await rpc("countable_tickets_per_project");

  assert.deepStrictEqual(rows.map(r => r.project_slug), projects.map(p => p.slug),
    "countable_tickets_per_project() must return exactly the executing projects, in priority,slug order -- "
    + `got ${JSON.stringify(rows.map(r => r.project_slug))}, board has ${JSON.stringify(projects.map(p => p.slug))}. `
    + "A project missing here is an empty project that vanished instead of reading 0.");
  assert.deepStrictEqual(rows.map(r => r.project_name), projects.map(p => p.name),
    `the names must be the projects' own: got ${JSON.stringify(rows.map(r => r.project_name))}`);
  results.push("one-row-per-executing-project-in-board-order");

  // --- B: THE HAND COUNT, computed without ever asking the function -----------------------------
  const bySlug = new Map(rows.map(r => [r.project_slug, r]));
  const now = Date.now();
  const printed = [];

  // AGT-483 call (ii): only an open/partial ticket whose epic's project is EXECUTING lends its
  // score to its blocker, so the hand count needs the executing epics before it starts.
  const executingEpicIds = new Set(
    (projects.length
      ? await get(`epics?project_id=in.(${projects.map(p => p.id).join(",")})&select=id`)
      : []).map(e => e.id));

  for (const pj of projects) {
    const epics = await get(`epics?project_id=eq.${pj.id}&select=id`);
    let raw = [];
    if (epics.length > 0) {
      raw = await get(
        `backlog_items?epic_id=in.(${epics.map(e => e.id).join(",")})`
        + "&status=in.(open,partial)"
        + "&select=id,backlog_id,need_score,blocked_by,design_status,claimed_by,claimed_at");
    }

    const countable = [];
    for (const b of raw) {
      // P2 -- AGT-483: the effective score, recomputed here from the raw rows. The filter is NOT
      // handed to PostgREST any more, because `need_score=gte.3` would drop exactly the row this
      // ticket is about: a blocker scored below 3 that the open work behind it lifts to 3 or more.
      const waiters = await get(
        `backlog_items?blocked_by=eq.${b.id}&status=in.(open,partial)&select=need_score,epic_id`);
      const lifts = waiters.filter(w => executingEpicIds.has(w.epic_id)).map(w => w.need_score);
      const eff = effectiveScore(b.need_score, lifts);
      if (!(Number.isInteger(eff) && eff >= 3)) continue;

      // P7 and P8 need no round trip.
      if (hasDesignFlag(b.design_status)) continue;
      if (claimIsLive(b.claimed_by, b.claimed_at, hours, now)) continue;

      // P3 + P5: the newest unreversed requirement-check row, and whether its reason parks.
      const grade = await get(
        `runner_decisions?kind=eq.requirement-check&backlog_id=eq.${b.backlog_id}`
        + "&reversed_at=is.null&order=decided_at.desc&limit=1&select=reasoning");
      if (grade.length === 0) continue;                       // P3: ungraded, or the grade was reversed
      if (isParked(grade[0].reasoning)) continue;             // P5

      // P4: a blocker counts as cleared only at one of the unblocking statuses.
      if (b.blocked_by) {
        const blocker = await get(`backlog_items?id=eq.${b.blocked_by}&select=status`);
        if (!(blocker.length > 0 && UNBLOCKING.includes(blocker[0].status))) continue;
      }

      // P6: an undecided gate card holds it out of the pick, so it is not takeable work.
      const cards = await get(
        `runner_items?backlog_id=eq.${b.backlog_id}&kind=eq.gated_before_build&decision=is.null&select=id`);
      if (cards.length > 0) continue;

      countable.push(b.backlog_id);
    }
    countable.sort();

    const row = bySlug.get(pj.slug);
    assert.ok(row, `the sensor returned no row for ${pj.slug}`);
    assert.deepStrictEqual([...(row.backlog_ids ?? [])].sort(), countable,
      `${pj.slug}: the sensor's ids and the hand count disagree -- sensor `
      + `${JSON.stringify(row.backlog_ids)}, hand count ${JSON.stringify(countable)} over ${raw.length} raw `
      + "open/partial ticket(s). One of P1-P8 is not doing what §4 of the kickoff says it does.");
    assert.strictEqual(row.countable, countable.length,
      `${pj.slug}: countable reads ${row.countable} but it returned ${countable.length} id(s) -- the count and `
      + "the ids must come from the same set.");
    printed.push(`${pj.slug}: raw ${raw.length} open -> countable ${countable.length} ${JSON.stringify(countable)}`);
  }

  console.log(`         AGT-481 hand count, recomputed this run: ${printed.join(" | ")}`);
  results.push("hand-count-matches-ids-and-count-per-project");

  // --- D: no public EXECUTE -- the anon key must not reach the sensor ---------------------------
  const anon = process.env.SUPABASE_ANON_KEY ?? "";
  if (!anon) {
    notRun("the anon denial (arm D) -- that the anon key cannot EXECUTE countable_tickets_per_project()",
      "SUPABASE_ANON_KEY is absent from this environment, so there is no public key to be refused with. "
      + "The denial IS asserted in both directions by the migration's own trailing gate "
      + "(docs/design/agt-481-countable-tickets.sql, check (b)): has_function_privilege reads false for anon "
      + "and for authenticated and true for service_role on BOTH functions, and the gate's RAISE rolls the whole "
      + "migration back otherwise -- so a committed migration is that assert passing. Run with the anon key "
      + "present to drive this arm from outside the database: node --env-file-if-exists=.env.local "
      + "tests/regression/agt-481-countable-tickets.test.mjs");
  } else {
    const r = await fetch(`${base}/rest/v1/rpc/countable_tickets_per_project`, {
      method: "POST",
      headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
      body: "{}",
    });
    assert.notStrictEqual(r.status, 200,
      "the anon key reached countable_tickets_per_project() and got HTTP 200 -- the sensor reads the whole board's "
      + "grading and claim state and must be service_role only. Postgres grants EXECUTE to anon, authenticated and "
      + "service_role BY NAME when a function is created and REVOKE ... FROM PUBLIC does not remove those "
      + `(.claude/rules/supabase-column-grants.md, SES-315). Body: ${await r.text().catch(() => "")}`);
    results.push("anon-key-cannot-execute-the-sensor");
  }

  return results;
}

selfRun(import.meta.url, run);
export default run;
