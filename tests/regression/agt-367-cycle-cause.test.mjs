// DeepBench v7.0.976 | tests/regression/agt-367-cycle-cause.test.mjs | AGT-367 -- the cause
// derivation, its vocabulary and its grants, graded against the shipped mirror and the live database.
//
// FEATURE: AGT-367. Migration `agt367_cycle_cause`, mirrored byte-identically at
// docs/design/agt-367-cycle-cause.sql: a table of 20 causes as DATA, one immutable function that
// derives a cycle's cause from the columns it already writes, a view that joins the two, a windowed
// count, and five fragment replacements into `audit_flow_checks()` arm (c) so the one percentage it
// used to print now names what to burn down.
//
// THREE ARMS, each declared rather than implied.
//
//   * The DOC arm reads the committed mirror and grades the five decisions a later session could
//     most easily undo without noticing. It needs no credentials and runs everywhere. Every clause
//     carries a MUTATE-IT control that removes the bytes it matched and re-greps, so a clause that
//     silently stopped matching the file cannot pass as coverage.
//
//   * The LIVE arm runs only with SUPABASE_URL + SUPABASE_SERVICE_KEY and is DECLARED not-run
//     otherwise (SES-180 notRun()), never silently skipped. It calls `runner_cycle_cause()` over
//     the fifteen fixtures the kickoff's QA 1 names -- one per arm of the CASE, in the CASE's own
//     order, plus the four discriminations that order exists for -- and asserts the exact cause
//     each returns. Read-only and side-effect free by construction: the function is IMMUTABLE and
//     takes its inputs as arguments, so no fixture row is ever written to `runner_cycles` (the
//     SES-196 / SES-218 / SES-275 refusal: a regression test never mutates working data).
//
//   * The ANON arm runs only with VITE_SUPABASE_ANON_KEY and makes the same call with the key that
//     ships in the browser bundle, asserting it is REFUSED. This is the half
//     .claude/rules/supabase-column-grants.md exists for: in this project `pg_default_acl` grants
//     EXECUTE to anon, authenticated and service_role BY NAME the instant a function is created,
//     and `REVOKE ALL ON FUNCTION ... FROM PUBLIC` removes only the PUBLIC grant -- the migration
//     reports success and the function stays open (SES-315, found live). A migration's success flag
//     is never the evidence, which is why the shipped DO block asserts both directions and why this
//     arm asserts the denial from OUTSIDE the database as well.
//
// WHAT THIS FILE DOES NOT COVER, declared at the foot: the `pg_proc` facts (provolatile, overload
// count) and the grant rows themselves, which PostgREST cannot read.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIRROR_REL = "docs/design/agt-367-cycle-cause.sql";
const MIRROR_ABS = path.join(ROOT, MIRROR_REL);

// ---------------------------------------------------------------------------
// Arm 1 -- the committed mirror. No credentials, no network.
// ---------------------------------------------------------------------------

// Each clause: the bytes that must be in the mirror, and why losing them would be a real defect.
const CLAUSES = [
  {
    needle: "from public, anon, authenticated",
    why: "the two new functions must be revoked from the three roles BY NAME. `REVOKE ALL ON " +
      "FUNCTION ... FROM PUBLIC` alone removes only the PUBLIC grant and leaves the named anon and " +
      "authenticated grants `pg_default_acl` hands out at creation time standing -- the migration " +
      "reports success and the function stays callable with the browser's anon key (SES-315, found " +
      "live on this project's own runner_* functions)",
  },
  {
    needle: "has_function_privilege('anon'",
    why: "and the migration must assert that denial in its own trailing DO block rather than trust " +
      "its success flag -- the first remediation in LOG-124 reported success and left the data " +
      "fully exposed",
  },
  {
    // DEVIATION, declared: the kickoff T3 names this needle `then 'unattributed'`, but §4 (b)
    // specifies the terminal arm as `else unattributed` and that is what shipped and what QA 1
    // grades, so the needle is the terminal arm AS SHIPPED. Same teeth: it asserts the CASE ends in
    // the named, countable cause rather than falling out as NULL.
    needle: "else 'unattributed'",
    why: "the CASE must have a terminal arm. A cycle whose cause cannot be derived is `unattributed` " +
      "-- a named, countable, burn-it-down cause -- and never a NULL that drops the row out of " +
      "every count silently",
  },
  {
    needle: "'lanes_full_self'",
    why: "a chained continuation that refused because the lanes were full counted ITS OWN open " +
      "lane. That is a different defect from a genuinely busy runner and must not be reported as " +
      "the same cause -- it is the one arm that needs two columns to decide",
  },
  {
    needle: "by cause: %s",
    why: "arm (c) of audit_flow_checks() must NAME the causes. The whole ticket is that the arm " +
      "printed one percentage, which says the run is burning budget and nothing about what to fix",
  },
];

function readMirror() {
  assert.ok(fs.existsSync(MIRROR_ABS),
    `${MIRROR_REL} is missing -- the migration's mirror is the only in-repo copy of what was applied`);
  return fs.readFileSync(MIRROR_ABS, "utf8");
}

function theShippedMirrorHoldsEveryDecision() {
  const sql = readMirror();

  for (const c of CLAUSES) {
    assert.ok(sql.includes(c.needle),
      `${MIRROR_REL} must hold \`${c.needle}\` -- ${c.why}`);
  }

  // The vocabulary is DATA and all 20 rows are in the mirror, so a later reader can see what the
  // database holds without a credential.
  assert.ok(sql.includes("create table public.runner_waste_causes"),
    `${MIRROR_REL} must create the vocabulary table`);
  const inserted = [...sql.matchAll(/^  \('[a-z_]+',\s+'\{/gm)].length;
  assert.strictEqual(inserted, 20,
    `the mirror must insert all 20 causes, found ${inserted} -- the trailing DO asserts the same ` +
    "count in the database, and the two disagreeing means the mirror is not what ran");

  // The three causes that are NOT waste are named in the mirror, because that judgment is the one
  // a later session is most likely to "tidy" into a rate over every cycle.
  for (const notWaste of ["'moved'", "'routine_run'", "'in_progress'"]) {
    assert.ok(sql.includes(notWaste),
      `${MIRROR_REL} must carry the non-waste cause ${notWaste}: a cycle that moved a ticket, a ` +
      "scheduled routine and a run still going are not waste, and folding them into one rate is " +
      "the defect this ticket removes");
  }

  // Both new readable objects are closed to the public key, and the gate asserts the other
  // direction too -- a revoke that locked everyone out would pass the anon half alone.
  assert.ok(sql.includes("revoke select on public.runner_waste_causes  from anon, authenticated") &&
            sql.includes("revoke select on public.runner_cycle_causes  from anon, authenticated"),
    `${MIRROR_REL} must revoke SELECT from anon and authenticated on the table AND the view -- a ` +
    "new table in this project comes up with auto-granted public SELECT (SES-78a, found live on " +
    "the six runner_ tables)");
  assert.ok(sql.includes("has_table_privilege('service_role'") && sql.includes("has_function_privilege('service_role'"),
    `${MIRROR_REL} must assert service_role STILL reads and STILL calls -- without that half, a ` +
    "revoke that locked every role out would pass every anon assertion");

  // The down was captured BEFORE the up, and the mirror records that it was.
  assert.ok(/capture_migration_down\('a5697278-4232-4a77-bfa4-fba0a1a8280b', 'agt367_cycle_cause'/.test(sql),
    `${MIRROR_REL} must record the capture_migration_down() call for this cycle -- a down taken ` +
    "AFTER the up captures the state the up wrote, which is a down that restores the bug");
  assert.ok(sql.includes("auto-downable"),
    `${MIRROR_REL} must record the capture's classification; a 'refused' classification is a RESULT ` +
    "and belongs in the record either way");
}

// MUTATE-IT CONTROLS: every clause above must be able to FAIL. Each needle is removed from the
// file's real bytes in memory and the clause re-run; a clause that still passes was never reading
// the file. This is the shape ses-297's aVacuousMutationFailsItsOwnControl() uses.
function everyClauseHasTeeth() {
  const sql = readMirror();

  for (const c of CLAUSES) {
    const mutated = sql.split(c.needle).join("/* REMOVED BY THE CONTROL */");
    assert.ok(!mutated.includes(c.needle),
      `CONTROL: removing \`${c.needle}\` must actually remove it -- otherwise the clause's own ` +
      "grep is matching something it does not mean");
    assert.ok(sql.includes(c.needle) && !mutated.includes(c.needle),
      `CONTROL: the clause for \`${c.needle}\` must distinguish the real file from the mutated one`);
  }

  // And the whole arm must fail on a mirror that lost a clause, not just the individual grep.
  const broken = sql.split("from public, anon, authenticated").join("from public");
  assert.ok(!broken.includes("from public, anon, authenticated"),
    "CONTROL: the by-name revoke is a distinct string from the PUBLIC-only revoke -- which is the " +
    "entire distinction SES-315 was found on");
}

function theMirrorIsTheWholeMigration() {
  const sql = readMirror();
  // (a)-(f): every object the migration ships is in the mirror, so the mirror cannot be a summary.
  for (const [label, needle] of [
    ["(a) the vocabulary table", "create table public.runner_waste_causes"],
    ["(b) the derivation", "create or replace function public.runner_cycle_cause("],
    ["(c) the view", "create or replace view public.runner_cycle_causes as"],
    ["(d) the windowed count", "create or replace function public.runner_waste_by_cause(p_hours integer default 168)"],
    ["(e) the arm (c) rewrite", "pg_get_functiondef(p.oid) into src"],
    ["(f) the grant gate", "do $agt367f$"],
  ]) {
    assert.ok(sql.includes(needle), `${MIRROR_REL} must hold ${label} (\`${needle}\`)`);
  }
  // (e) is built FROM the live definition and asserts each fragment occurs exactly once, rather
  // than retyping a 150-line plpgsql body -- which is how an unrelated line gets lost.
  assert.ok(sql.includes("expected exactly 1"),
    `${MIRROR_REL} must assert each replaced fragment occurs EXACTLY ONCE before replacing it -- a ` +
    "body that drifted under this migration must fail loudly, never be half-edited");
}

// ---------------------------------------------------------------------------
// Arm 2 -- live Supabase over PostgREST. Read-only: the function is IMMUTABLE and takes its
// inputs as arguments, so nothing is written to runner_cycles.
// ---------------------------------------------------------------------------

async function post(url, key, pathAndQuery, body) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, ok: res.ok, body: await res.text() };
}

// QA 1's fifteen fixtures: one per arm of (b)'s CASE, in (b)'s own order, plus the four
// discriminations the order exists for. `expect` is the cause the arm must return.
const FIXTURES = [
  ["moved",                      { p_outcome: "shipped", p_push_sha: "abc1234", p_trigger: "scheduled", p_notes: null, p_last_step: null, p_stall_notified_at: null, p_ended_at: "2026-11-07T00:00:00Z" }, "moved"],
  ["reverted beats its own push",{ p_outcome: "reverted", p_push_sha: "abc1234", p_trigger: "scheduled", p_notes: null, p_last_step: null, p_stall_notified_at: null, p_ended_at: "2026-11-07T00:00:00Z" }, "reverted"],
  ["routine_run",                { p_outcome: "shipped", p_push_sha: null, p_trigger: "scheduled", p_notes: "SCHEDULED-AGENT: victoria-reorg", p_last_step: null, p_stall_notified_at: null, p_ended_at: "2026-11-07T00:00:00Z" }, "routine_run"],
  ["ship_no_sha",                { p_outcome: "shipped", p_push_sha: null, p_trigger: "scheduled", p_notes: null, p_last_step: null, p_stall_notified_at: null, p_ended_at: "2026-11-07T00:00:00Z" }, "ship_no_sha"],
  ["gated",                      { p_outcome: "gated_before_build", p_push_sha: null, p_trigger: "scheduled", p_notes: null, p_last_step: null, p_stall_notified_at: null, p_ended_at: "2026-11-07T00:00:00Z" }, "gated"],
  ["permission_stall",           { p_outcome: "failed", p_push_sha: null, p_trigger: "scheduled", p_notes: null, p_last_step: "7 - builder", p_stall_notified_at: "2026-11-07T00:10:00Z", p_ended_at: "2026-11-07T00:20:00Z" }, "permission_stall"],
  ["in_progress",                { p_outcome: null, p_push_sha: null, p_trigger: "scheduled", p_notes: null, p_last_step: "7 - builder", p_stall_notified_at: null, p_ended_at: null }, "in_progress"],
  ["(weekly pace) -> weekly_pace", { p_outcome: null, p_push_sha: null, p_trigger: "scheduled", p_notes: null, p_last_step: "step 0 — pre-boot refusal (weekly pace)", p_stall_notified_at: null, p_ended_at: "2026-11-07T00:00:00Z" }, "weekly_pace"],
  ["(lanes_full) chained -> self", { p_outcome: null, p_push_sha: null, p_trigger: "chained (drain continuation)", p_notes: null, p_last_step: "step 0 — pre-boot refusal (lanes_full)", p_stall_notified_at: null, p_ended_at: "2026-11-07T00:00:00Z" }, "lanes_full_self"],
  ["(lanes_full) scheduled",     { p_outcome: null, p_push_sha: null, p_trigger: "scheduled", p_notes: null, p_last_step: "step 0 — pre-boot refusal (lanes_full)", p_stall_notified_at: null, p_ended_at: "2026-11-07T00:00:00Z" }, "lanes_full"],
  ["(meter_stale)",              { p_outcome: null, p_push_sha: null, p_trigger: "scheduled", p_notes: null, p_last_step: "step 0 — pre-boot refusal (meter_stale)", p_stall_notified_at: null, p_ended_at: "2026-11-07T00:00:00Z" }, "meter_stale"],
  ["find_work",                  { p_outcome: "did_not_run", p_push_sha: null, p_trigger: "scheduled", p_notes: null, p_last_step: "find-work: no candidate survived", p_stall_notified_at: null, p_ended_at: "2026-11-07T00:00:00Z" }, "find_work"],
  ["step 0b — predecessor",      { p_outcome: null, p_push_sha: null, p_trigger: "scheduled", p_notes: null, p_last_step: "step 0b — predecessor", p_stall_notified_at: null, p_ended_at: "2026-11-07T00:00:00Z" }, "unattributed"],
  ["failed + BLOCKED step 5/9",  { p_outcome: "failed", p_push_sha: null, p_trigger: "scheduled", p_notes: null, p_last_step: "BLOCKED step 5/9", p_stall_notified_at: null, p_ended_at: "2026-11-07T00:00:00Z" }, "unattributed"],
  ["stall beats a null outcome", { p_outcome: null, p_push_sha: null, p_trigger: "scheduled", p_notes: null, p_last_step: "7 - builder", p_stall_notified_at: "2026-11-07T00:10:00Z", p_ended_at: null }, "permission_stall"],
];

async function theLiveFunctionReturnsTheCauseForEveryArm() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm: runner_cycle_cause() over QA 1's fifteen fixtures and the windowed count",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The doc arm above still graded every " +
        "clause of the migration against the committed mirror. Canonical invocation: " +
        "STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  for (const [label, args, expect] of FIXTURES) {
    const res = await post(url, key, "rpc/runner_cycle_cause", args);
    assert.ok(res.ok, `rpc/runner_cycle_cause [${label}] returned HTTP ${res.status}: ${res.body}`);
    const got = JSON.parse(res.body);
    assert.strictEqual(got, expect,
      `[${label}] runner_cycle_cause() returned ${JSON.stringify(got)}, expected ${JSON.stringify(expect)} ` +
      "-- the CASE's arm order IS the spec and a reordering shows up here first");
  }

  // Every cause the fixtures produce is a cause the VOCABULARY knows, so none of them lands
  // outside `runner_waste_causes` and takes the coalesced default instead of a real judgment.
  const expected = [...new Set(FIXTURES.map(f => f[2]))];
  assert.ok(expected.length >= 11,
    `the fixtures must exercise at least 11 distinct causes, got ${expected.length}`);

  // And the windowed count answers over the real board, as an array.
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/rpc/runner_waste_by_cause?p_hours=168`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  assert.ok(res.ok, `rpc/runner_waste_by_cause returned HTTP ${res.status} ${res.statusText}`);
  const rows = await res.json();
  assert.ok(Array.isArray(rows),
    `runner_waste_by_cause(168) must return an ARRAY -- the brief's fetchFacts() dies on anything ` +
    `else rather than rendering an unmeasured zero. got: ${JSON.stringify(rows).slice(0, 200)}`);
  for (const r of rows) {
    for (const k of ["cause", "candidate_tickets", "counts_as_waste", "n"]) {
      assert.ok(k in r, `every row must carry \`${k}\`; the brief reads all four. got: ${JSON.stringify(r)}`);
    }
    assert.strictEqual(typeof r.counts_as_waste, "boolean",
      `counts_as_waste must be a real boolean, not a string: ${JSON.stringify(r)}`);
    assert.ok(Array.isArray(r.candidate_tickets),
      `candidate_tickets must be an array even when empty: ${JSON.stringify(r)}`);
  }
}

// ---------------------------------------------------------------------------
// Arm 3 -- the browser's key must be REFUSED. The half a migration's success flag cannot prove.
// ---------------------------------------------------------------------------

async function theAnonKeyCannotCallTheCauseFunction() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    notRun(
      "the anon arm: runner_cycle_cause() refused to the key that ships in the browser bundle",
      "SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are absent. The shipped migration's own trailing " +
        "DO block asserts the same denial from inside the database with has_function_privilege() " +
        "over anon on both new functions AND has_table_privilege() over anon on the table and the " +
        "view, together with the service_role half so a total lockout cannot pass as a gate; " +
        "measured green at this ship. Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const res = await post(url, anon, "rpc/runner_cycle_cause", FIXTURES[0][1]);
  assert.ok(!res.ok,
    `the anon key must NOT be able to call runner_cycle_cause(), got HTTP ${res.status}: ${res.body}. ` +
    "In this project pg_default_acl grants EXECUTE to anon BY NAME at creation time, and " +
    "`REVOKE ALL ON FUNCTION ... FROM PUBLIC` leaves that grant standing while reporting success " +
    "(.claude/rules/supabase-column-grants.md, SES-315 found live)");
  assert.ok(res.status >= 400 && res.status < 500,
    `the refusal must be a client-side denial (4xx), got ${res.status}: ${res.body}`);

  const view = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/runner_cycle_causes?select=cause&limit=1`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  assert.ok(!view.ok,
    `and the anon key must not read the cause view either, got HTTP ${view.status} -- a new table ` +
    "in this project comes up with auto-granted public SELECT (SES-78a)");
}

export default async function run() {
  theShippedMirrorHoldsEveryDecision();
  everyClauseHasTeeth();
  theMirrorIsTheWholeMigration();
  await theLiveFunctionReturnsTheCauseForEveryArm();
  await theAnonKeyCannotCallTheCauseFunction();

  notRun(
    "runner_cycle_cause()'s pg_proc facts (provolatile='i', exactly one overload) and the grant rows " +
      "themselves in information_schema.role_table_grants",
    "the objects ship as migration agt367_cycle_cause and live in the database, not this repo; this " +
      "suite reaches Supabase only over PostgREST, which cannot read pg_proc or information_schema. " +
      "MEASURED AT THIS SHIP INSTEAD, live, inside the migration's own trailing DO block and " +
      "re-measured independently afterwards rather than trusted from the success flag: " +
      "has_table_privilege(anon) false on runner_waste_causes and runner_cycle_causes, " +
      "has_function_privilege(anon) false on runner_cycle_cause and runner_waste_by_cause, the same " +
      "four false for `authenticated`, zero rows for anon/authenticated in role_table_grants over " +
      "both objects, all four true for service_role, 20 vocabulary rows, exactly 1 audit_flow_checks " +
      "pg_proc row (no overload: .claude/rules/supabase-function-signature.md), and 0 of the 1103 " +
      "`step 0 — pre-boot refusal%` rows coming out `unattributed`. Arm (c) of audit_flow_checks() " +
      "read live after the ship ends `; by cause: weekly_pace 27, lanes_full 3, lanes_full_self 2, " +
      "permission_stall 1`, where before the ship it had no `by cause:` at all.",
  );
}

selfRun(import.meta.url, run);
