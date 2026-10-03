// DeepBench v7.0.739 | tests/regression/agt-273-test-slot-ladder.test.mjs | AGT-273 -- the
// database's health sets the test-slot COUNT instead of switching the suite off.
//
// Red on the unchanged tree: the mirror docs/design/agt-273-test-slot-health-ladder.sql is absent
// (arm A cannot read it), and live `rpc/test_slot_allowance` answers 404 (arm B).
//
// ARMS.
//   A  PURE + STATIC. `rung()` below is the allowance's rule written once in JS -- green gives
//      test_slot_capacity, a keyed non-green level gives the lesser of the two, an unmapped or NULL
//      level gives 0 -- asserted over every rung. The mirror SQL is then read as text and must carry
//      the same four branches, the ladder column's default, the gate's green-only test REMOVED and
//      its `coalesce(v_cap, 0)` fail-closed stop KEPT, and the grants by name.
//   B  LIVE (else declared not-run). `rpc/test_slot_allowance` must answer, and its capacity must be
//      exactly what `rung()` gives for the live level, capacity and ladder -- so the database and
//      the rule above cannot drift apart unnoticed. `runner_settings.test_slot_ladder.red` is 0.
//   C  DECLARED NOT-RUN: the kickoff's §6 grant walk (amber grants at 1, red refuses at 0, a red
//      waiter is admitted on recovery, green at capacity 3 admits a third holder) needs one
//      transaction that seeds health readings and is rolled back. PostgREST cannot open one, so it
//      was measured at the ship over the MCP instead (numbers in the ship commit).

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIRROR = path.join(ROOT, "docs", "design", "agt-273-test-slot-health-ladder.sql");

// The allowance's rule, once. Mirrors public.test_slot_allowance().
export function rung(level, capacity, ladder) {
  if (level === null || level === undefined) return { capacity: 0, source: "fail-closed" };
  if (level === "green") return { capacity, source: "runner_settings" };
  const entry = ladder?.[level];
  if (entry === undefined || entry === null) return { capacity: 0, source: "fail-closed" };
  return { capacity: Math.min(capacity, Number(entry)), source: "test_slot_ladder" };
}

async function run() {
  // ---- A. pure over the rungs --------------------------------------------------------------
  const L = { amber: 1, red: 0, unsafe: 0 };
  assert.deepEqual(rung("green", 3, L), { capacity: 3, source: "runner_settings" }, "green gives test_slot_capacity");
  assert.deepEqual(rung("amber", 3, L), { capacity: 1, source: "test_slot_ladder" }, "amber narrows to its rung");
  assert.deepEqual(rung("amber", 1, { amber: 2 }), { capacity: 1, source: "test_slot_ladder" }, "a rung never exceeds test_slot_capacity");
  assert.deepEqual(rung("red", 3, L), { capacity: 0, source: "test_slot_ladder" }, "red grants nothing");
  assert.deepEqual(rung("unsafe", 3, L), { capacity: 0, source: "test_slot_ladder" }, "unsafe grants nothing");
  assert.deepEqual(rung("purple", 3, L), { capacity: 0, source: "fail-closed" }, "an unmapped level fails closed");
  assert.deepEqual(rung(null, 3, L), { capacity: 0, source: "fail-closed" }, "an unreadable level fails closed");

  // ---- A. the mirror, as text --------------------------------------------------------------
  assert.ok(fs.existsSync(MIRROR), "the migration mirror docs/design/agt-273-test-slot-health-ladder.sql must exist");
  const sql = fs.readFileSync(MIRROR, "utf8");
  const must = [
    `DEFAULT '{"amber":1,"red":0,"unsafe":0}'::jsonb`,
    "CREATE OR REPLACE FUNCTION public.test_slot_allowance()",
    "WHEN d.level IS NULL        THEN 0",
    "WHEN d.level = 'green'      THEN s.test_slot_capacity",
    "WHEN rung.entry IS NULL     THEN 0",
    "ELSE LEAST(s.test_slot_capacity, (rung.entry #>> '{}')::int) END",
    "SELECT a.level, a.capacity INTO v_level, v_cap FROM public.test_slot_allowance() a;",
    "IF v_held < coalesce(v_cap, 0) AND v_pos = 1 THEN",
    "REVOKE EXECUTE ON FUNCTION public.test_slot_allowance() FROM anon, authenticated;",
    "GRANT EXECUTE ON FUNCTION public.test_slot_allowance() TO service_role;",
  ];
  const missing = must.filter(m => !sql.includes(m));
  assert.deepEqual(missing, [], `the mirror must carry every piece of the ladder; missing ${JSON.stringify(missing)}`);
  assert.ok(!/IF v_level IS NOT DISTINCT FROM 'green' AND/.test(sql),
    "the gate's green-only test must be GONE -- otherwise amber still grants nothing");
  const overloads = sql.match(/CREATE OR REPLACE FUNCTION public\.test_slot_acquire\(/g) ?? [];
  assert.equal(overloads.length, 1, "one replace of test_slot_acquire, never a second signature");
  assert.match(sql, /test_slot_acquire\(p_holder text, p_cycle_id uuid DEFAULT NULL::uuid\)/,
    "identity args unchanged, so it REPLACES rather than adds an overload");

  // ---- B. live -----------------------------------------------------------------------------
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-273 arm B (live allowance vs the rule)",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- the allowance is a database function. Arm A ran.");
  } else {
    const get = async q => {
      const res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      assert.equal(res.status, 200, `GET ${q} -> HTTP ${res.status} (404 = the migration is not live)`);
      return res.json();
    };
    const [a] = await get("rpc/test_slot_allowance");
    const [s] = await get("runner_settings?select=test_slot_capacity,test_slot_ladder&id=eq.1");
    assert.ok(a && typeof a.level === "string", `test_slot_allowance must return a level; got ${JSON.stringify(a)}`);
    assert.equal(Number(s.test_slot_ladder?.red), 0, "the live ladder's red rung must be 0");
    const want = rung(a.level, Number(s.test_slot_capacity), s.test_slot_ladder);
    assert.deepEqual({ capacity: Number(a.capacity), source: a.source }, want,
      `the live allowance must equal the rule for level ${a.level}`);
    console.log(`    [AGT-273 live] level ${a.level} -> capacity ${a.capacity} (${a.source}); capacity setting ${s.test_slot_capacity}, ladder ${JSON.stringify(s.test_slot_ladder)}`);
  }

  // ---- C. declared, never skipped ----------------------------------------------------------
  notRun("AGT-273 arm C (the §6 grant walk in a rolled-back transaction)",
    "seeding db_health_readings and test_slots inside one transaction that is then rolled back is " +
    "not possible over PostgREST (`Prefer: tx=rollback` is not honoured on this project -- the same " +
    "wall agt-280-requirement-check records). Measured at the ship over the MCP instead: amber " +
    "granted at capacity 1, red refused at 0, a red waiter admitted on recovery, green at capacity 3 " +
    "admitted a third holder.");
}

selfRun(import.meta.url, run);
export default run;
