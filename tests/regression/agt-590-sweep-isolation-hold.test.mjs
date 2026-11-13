// DeepBench v7.0.1016 | tests/regression/agt-590-sweep-isolation-hold.test.mjs | AGT-590 --
// per-row sweep isolation, and the ladder arrears HELD.
//
// WHAT IS BEING PINNED. public.sweep_decision_windows() did every expired decision in ONE
// transaction, so one ticket its own guard refused aborted the whole call. Coordinator-measured
// live 2026-11-13 07:50Z: 9,777 decisions `open` past expires_at, oldest window 2026-10-05
// 09:24:41+00, 0 finalised in 30 days, last successful finalise 2026-10-05 09:17:00+00 -- 39 days
// -- and 225 tickets standing at `delivered` behind it. ses-320b read that stall as
// `newest run carries an error: AGT-166: AGT-281 cannot be written done over its latest verdict
// block (38959e02-fdd5-4858-bf19-11fc48fdc5d2)` and went red. AGT-590 isolates each decision in
// its own subtransaction and RECORDS the refusal on the row, so a refused window is a named,
// counted outcome of a SUCCESSFUL run rather than an error that wedges every sibling.
//
// WHY THIS FILE EXISTS BESIDE ses-320b RATHER THAN INSIDE IT. ses-320b grades liveness: a newest
// run, fresh, with no error. That clause goes green the moment the sweep stops raising -- it
// cannot tell a run that reported its refusals from a run that swallowed them, and it says nothing
// about the hold. This file grades the two things AGT-590 added: the refusal RECORD (a count, a
// list of that exact length, each reason carrying its sqlstate) and the HOLD (no window that
// expired before the cut-off had its ladder signal paid). pattern:162 -- the clauses grade THE
// CHANGE, and the live arm reads only what the change writes.
//
// THE HOLD, AND WHAT IT IS NOT. 4,868 of the expired-open decisions carried a ladder_work_class
// with ladder_applied_at null (measured 07:55Z, 6 work classes). Paying those during the catch-up
// would promote a rung every fifth signal with no ceiling on class_autonomy.extra_files and John's
// CAP-SCOPE-FILES 3-file cap would stop binding platform-wide, so the migration holds them behind
// a cut-off: finalised, ladder_applied_at untouched, each with its finalise's before-image, fully
// readable and fully reversible. NOTHING HERE DECIDES WHETHER THEY ARE EVER PAID -- that is a
// later ruling (Development Manager, decision b3ea67a3-2d48-430c-a129-2037126ab4a7). The clause
// below asserts only that this build did not pay them.
//
// READ-ONLY, LIKE ses-320b. sweep_decision_windows() and run_window_finaliser() are WRITERS -- they
// finalise the decision ledger and close tickets -- and a permanent regression test never writes
// the live board (the SES-196 / SES-218 / SES-275 refusal). Everything below is a GET.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

// ---------------------------------------------------------------------------------------------
// THE PURE HALF: the grader for one hourly record.
// ---------------------------------------------------------------------------------------------

export const MAX_AGE_HOURS = 3; // hourly job; two missed fires is a stall, not a hiccup.

// The migration's own name in public.runner_migration_downs. The live arm is gated on this row
// rather than on a date: a clone pointed at a database where AGT-590 has not been applied must
// declare itself not-run, never fail.
export const DOWN_UP_NAME = "agt590_sweep_isolation_hold";

// The hold cut-off this build shipped -- `c_hold` in docs/design/agt-590-sweep-isolation-hold.sql,
// the next whole UTC hour after the apply. A window that expired before it finalises with NO
// ladder payout.
export const HOLD_CUTOFF = "2026-11-13T10:00:00+00:00";

// `<sqlstate> <message>`: five characters of sqlstate, a space, then the guard's own words. The
// sqlstate is the point -- it is what makes a refusal attributable to a named guard (23514 is the
// check-constraint AGT-166 raises) instead of an opaque string.
export const REASON_RE = /^[0-9A-Z]{5} /;

export function gradeRun(row, nowMs = Date.now()) {
  if (!row) return { ok: false, reason: "no run recorded yet" };
  if (row.error) return { ok: false, reason: `newest run carries an error: ${row.error}` };
  const ageHours = (nowMs - Date.parse(row.ran_at)) / 36e5;
  if (!Number.isFinite(ageHours)) return { ok: false, reason: `unreadable ran_at ${row.ran_at}` };
  if (ageHours > MAX_AGE_HOURS) return { ok: false, reason: `newest run is ${ageHours.toFixed(1)}h old` };

  // AGT-590's own clauses. A run that refused nothing is healthy (refused 0, refusals []); a run
  // whose count and list disagree is NOT -- that is a record a reader of a stall cannot trust.
  if (!Number.isInteger(row.refused) || row.refused < 0) {
    return { ok: false, reason: `refused must be a non-negative integer, got ${JSON.stringify(row.refused)}` };
  }
  if (!Array.isArray(row.refusals)) {
    return { ok: false, reason: `refusals must be an array, got ${JSON.stringify(row.refusals)}` };
  }
  if (row.refusals.length !== row.refused) {
    return { ok: false, reason: `refused=${row.refused} but refusals carries ${row.refusals.length} entr${row.refusals.length === 1 ? "y" : "ies"}` };
  }
  for (const [i, entry] of row.refusals.entries()) {
    const reason = entry && entry.reason;
    if (typeof reason !== "string" || !REASON_RE.test(reason)) {
      return { ok: false, reason: `refusals[${i}].reason must start with a 5-character sqlstate and a space, got ${JSON.stringify(reason)}` };
    }
  }
  return {
    ok: true,
    reason: `newest run ${ageHours.toFixed(2)}h ago, no error, ${row.refused} named refusal(s)`,
  };
}

// A NEGATIVE CONTROL PER CLAUSE. Each case mutates the healthy row in exactly one way and must
// fail -- a grader is only worth its green if every clause has teeth (STANDARDS.md Section 4, the
// LOO-013 lesson: assert WHICH branch fired, not merely that something failed).
export function healthyRow(nowMs = Date.now()) {
  return {
    ran_at: new Date(nowMs - 20 * 60e3).toISOString(),
    error: null,
    refused: 1,
    refusals: [{ decision_id: "d1", backlog_id: "AGT-281", reason: "23514 AGT-166: AGT-281 cannot be written done over its latest verdict block" }],
  };
}

export const NEGATIVE_CONTROLS = [
  { id: "no-row", mutate: () => null, expect: /no run recorded yet/ },
  { id: "error", mutate: r => ({ ...r, error: "boom" }), expect: /carries an error/ },
  { id: "unreadable-ran_at", mutate: r => ({ ...r, ran_at: "not a date" }), expect: /unreadable ran_at/ },
  { id: "stale", mutate: (r, now) => ({ ...r, ran_at: new Date(now - 5 * 36e5).toISOString() }), expect: /newest run is 5\.0h old/ },
  { id: "refused-null", mutate: r => ({ ...r, refused: null }), expect: /refused must be a non-negative integer/ },
  { id: "refused-negative", mutate: r => ({ ...r, refused: -1 }), expect: /refused must be a non-negative integer/ },
  { id: "refused-not-integer", mutate: r => ({ ...r, refused: 1.5 }), expect: /refused must be a non-negative integer/ },
  { id: "refusals-null", mutate: r => ({ ...r, refusals: null }), expect: /refusals must be an array/ },
  { id: "refusals-object", mutate: r => ({ ...r, refusals: { reason: "23514 x" } }), expect: /refusals must be an array/ },
  { id: "length-disagrees", mutate: r => ({ ...r, refused: 2 }), expect: /refused=2 but refusals carries 1 entry/ },
  { id: "reason-missing", mutate: r => ({ ...r, refusals: [{ decision_id: "d1" }] }), expect: /refusals\[0\]\.reason must start with a 5-character sqlstate/ },
  { id: "reason-has-no-sqlstate", mutate: r => ({ ...r, refusals: [{ reason: "AGT-166: cannot be written done" }] }), expect: /refusals\[0\]\.reason must start with a 5-character sqlstate/ },
  { id: "reason-sqlstate-unseparated", mutate: r => ({ ...r, refusals: [{ reason: "23514AGT-166" }] }), expect: /refusals\[0\]\.reason must start with a 5-character sqlstate/ },
];

function theGraderIsDiscriminating() {
  const now = Date.now();
  const healthy = gradeRun(healthyRow(now), now);
  assert.ok(healthy.ok, `the healthy row must pass, got: ${healthy.reason}`);
  // A run that refused nothing is equally healthy -- the clause must not demand a refusal.
  const quiet = gradeRun({ ...healthyRow(now), refused: 0, refusals: [] }, now);
  assert.ok(quiet.ok, `a run with zero refusals must pass, got: ${quiet.reason}`);

  for (const c of NEGATIVE_CONTROLS) {
    const grade = gradeRun(c.mutate(healthyRow(now), now), now);
    assert.ok(!grade.ok, `negative control ${c.id} is VACUOUS -- gradeRun still passed it`);
    assert.match(grade.reason, c.expect,
      `negative control ${c.id} failed for the WRONG reason: ${grade.reason}`);
  }

  assert.ok(Number.isFinite(Date.parse(HOLD_CUTOFF)),
    `HOLD_CUTOFF must be a parseable timestamp; got ${JSON.stringify(HOLD_CUTOFF)}`);
}

// ---------------------------------------------------------------------------------------------
// THE LIVE HALF -- read-only, over PostgREST.
// ---------------------------------------------------------------------------------------------

const base = url => url.replace(/\/+$/, "");

async function get(url, key, pathAndQuery) {
  const res = await fetch(`${base(url)}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  assert.ok(res.ok, `GET ${pathAndQuery} returned HTTP ${res.status} -- the table or its service_role grant is missing`);
  return res.json();
}

async function theRefusalRecordAndTheHoldHold() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm: the newest public.runner_finaliser_runs row reports its refusals, and no " +
        "window that expired before the hold cut-off was paid",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The pure arm above still ran. " +
        "Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  // GATE 1: has this migration landed on the database this clone is pointed at? The ledger row is
  // the answer, and its captured_at is also the only honest `since` for the hold clause -- a
  // ladder_applied_at written BEFORE the apply is history, not something this build paid.
  const downs = await get(url, key,
    `runner_migration_downs?select=captured_at&up_name=eq.${DOWN_UP_NAME}&order=captured_at.desc&limit=1`);
  if (!downs.length) {
    notRun(
      "the live arm: the AGT-590 refusal record and the ladder hold",
      `no public.runner_migration_downs row with up_name=${DOWN_UP_NAME} -- the function migration ` +
        "has not been applied to the database this clone is pointed at, so there is nothing of this " +
        "build's to grade. A clone pointed at a pre-AGT-590 database is not a defect.",
    );
    return;
  }
  const capturedAt = downs[0].captured_at;

  // GATE 2: the hourly job fires at :17. A record older than the apply is the PREVIOUS body's
  // record -- grading it would grade the bug this ship removed.
  const runs = await get(url, key,
    "runner_finaliser_runs?select=ran_at,refused,refusals,error&order=ran_at.desc&limit=1");
  if (!runs.length || Date.parse(runs[0].ran_at) < Date.parse(capturedAt)) {
    notRun(
      "the live arm: the AGT-590 refusal record and the ladder hold",
      `the newest runner_finaliser_runs row (${runs.length ? runs[0].ran_at : "none"}) predates the ` +
        `migration's captured_at (${capturedAt}) -- the job fires at :17; re-run after the first ` +
        "clean hour. The state between an apply and the first fire is not a defect.",
    );
    return;
  }

  const grade = gradeRun(runs[0]);
  assert.ok(grade.ok,
    `the AGT-590 refusal record is NOT sound: ${grade.reason}. Read the newest ` +
      "public.runner_finaliser_runs row and public.runner_decisions where status='open' and " +
      "refused_at is not null; a red here is the per-row outcome record working.");

  // THE HOLD. Zero rows: a window that expired before the cut-off must not have had its ladder
  // signal paid by this build. `limit 1` is enough -- one row returned is one row too many.
  const paid = await get(url, key,
    "runner_decisions?select=id,backlog_id,ladder_work_class,expires_at,ladder_applied_at" +
      `&expires_at=lt.${encodeURIComponent(HOLD_CUTOFF)}` +
      `&ladder_applied_at=gte.${encodeURIComponent(capturedAt)}&limit=1`);
  assert.strictEqual(paid.length, 0,
    "THE LADDER ARREARS WERE NOT HELD: a decision whose window expired before the cut-off " +
      `${HOLD_CUTOFF} carries a ladder_applied_at at or after this migration's captured_at ` +
      `(${capturedAt}), so this build paid a promote signal the Development Manager held out of it ` +
      `(decision b3ea67a3-2d48-430c-a129-2037126ab4a7). First offender: ${JSON.stringify(paid[0])}`);
}

// ---------------------------------------------------------------------------------------------

export default async function run() {
  theGraderIsDiscriminating();
  await theRefusalRecordAndTheHoldHold();

  notRun(
    "the WRITE path -- sweep_decision_windows() and run_window_finaliser() themselves, the per-row " +
      "subtransaction rollback, the refusal's before-image, and every pg_proc / grant fact",
    "both functions are WRITERS (they finalise the decision ledger, close tickets and move the " +
      "autonomy ladder), and a permanent regression test never writes the live board. MEASURED AT " +
      "THIS SHIP instead, over the connector: the migration's own trailing DO block asserted " +
      "exactly one overload of each function, the sweep's result type still " +
      "TABLE(finalized integer, promoted integer, closed integer), the per-row handler and the " +
      "c_hold cut-off present in the DEPLOYED body, EXECUTE false for anon/authenticated and true " +
      "for service_role on BOTH functions, and the cut-off 0-3 hours ahead of the apply; and the " +
      "new body was timed on a 500-decision sample inside a DO block whose closing raise rolled " +
      "back the function replace, every finalise, every ticket close and every before-image -- the " +
      "same rolled-back shape ses-320b used for the finaliser's exception branch.",
  );
}

selfRun(import.meta.url, run);
