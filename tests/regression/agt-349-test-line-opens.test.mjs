// DeepBench v7.0.765 | tests/regression/agt-349-test-line-opens.test.mjs | AGT-349 -- the test
// line opens up on its own: public.test_slot_tune() moves runner_settings.test_slot_capacity
// between floor 1 and test_slot_ceiling from the graded health readings and the line's own queue.
//
// Red on the unchanged tree: the mirror docs/design/agt-349-test-line-opens.sql is absent (arm A
// cannot read it), and live runner_settings has no test_slot_ceiling column (arm B, HTTP 400).
//
// ARMS.
//   A  PURE + STATIC. `decide()` below is the tuner's rule, steps 2-7, written once in JS and
//      asserted over the kickoff's §6 cases -- each case asserts WHICH step fired, not only the
//      action (STANDARDS.md Section 4, the LOO-013 lesson). The mirror SQL is then read as text and
//      must carry the function, its advisory lock and its cron schedule.
//   B  LIVE, READ-ONLY (else declared not-run). Capacity is an integer from 1 to
//      test_slot_ceiling; the six tuning keys exist; test_slot_moves answers 200. Nothing here calls
//      rpc/test_slot_tune: that can write the setting (pattern:76).
//   C  DECLARED NOT-RUN: the kickoff's §6 walk (base -> up to 2 with a decision; again at once ->
//      hold; cap 4 amber -> down to 3, a second amber -> 1; cap 3 red -> lock to 1, later 2 is
//      reachable and 3 is barred) needs one transaction that empties and seeds test_slot_moves,
//      test_slots and db_health_readings and is rolled back. Measured at the ship over the MCP.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIRROR = path.join(ROOT, "docs", "design", "agt-349-test-line-opens.sql");

export const TUNING = { enabled: true, wait_minutes: 20, cooloff_hours: 24, up_swap_used_mb: 650, up_swapin_per_s: 675, up_iowait_pct: 16 };

// public.db_health_level(), as far as the tuner needs it: the worst graded reading inside the
// window, `unsafe` when the newest graded reading is missing or older than the window.
export function healthLevel(readings, windowMinutes = 15) {
  const graded = readings.filter(r => r.level != null).sort((a, b) => a.age - b.age);
  if (!graded.length || graded[0].age > windowMinutes) return "unsafe";
  const win = graded.filter(r => r.age <= windowMinutes).map(r => r.level);
  return win.includes("red") ? "red" : win.includes("amber") ? "amber" : "green";
}

// The tuner's rule, steps 2-7, once. Mirrors public.test_slot_tune().
//   state: { cap, ceiling, tuning, readings: [{ id, age (minutes), level, swap_mb, pswpin_per_s,
//            iowait_pct }], held, waiting, moves: [{ action, from, age (minutes), reading_id }],
//            level? (overrides healthLevel) }
export function decide(state) {
  const { cap, ceiling, held, waiting } = state;
  const k = state.tuning ?? TUNING;
  const moves = state.moves ?? [];
  const hold = (step, why) => ({ action: "hold", from: cap, to: cap, step, why });
  const write = (action, to, step, why) => ({ action, from: cap, to, step, why });

  if (cap > ceiling) return write("ceiling", ceiling, "2", "above the ceiling");

  const graded = state.readings.filter(r => r.level != null).sort((a, b) => a.age - b.age);
  const [n, p] = graded;
  const level = state.level !== undefined ? state.level : healthLevel(state.readings);
  if (!n || level == null || level === "unsafe") return hold("3", "no trustworthy health reading");

  const last = Math.max(-1, ...moves.filter(m => m.reading_id != null).map(m => m.reading_id));
  if ((n.level === "red" || n.level === "amber") && n.id <= last) return hold("4", "reading already acted on");

  if (n.level === "red") {
    if (cap > 1 || p?.level !== "red") return write("lock", 1, "5", "red");
    return hold("5", "still red, already locked at 1");
  }
  if (n.level === "amber") {
    const to = p?.level === "amber" ? 1 : Math.max(1, cap - 1);
    if (to !== cap) return write("down", to, "6", "amber");
    return hold("6", "amber, already at 1");
  }
  if (n.level !== "green") return hold("7", "unknown level");

  const keys = ["wait_minutes", "cooloff_hours", "up_swap_used_mb", "up_swapin_per_s", "up_iowait_pct"];
  if (keys.some(key => k[key] == null)) return hold("7", "a tuning key is missing");
  if (cap >= ceiling) return hold("7a", "at the ceiling");
  if (level !== "green") return hold("7a", "the health window is not green");
  if (held < cap || waiting < 1) return hold("7b", "no queue to open for");
  if (moves.some(m => m.age <= k.wait_minutes)) return hold("7c", "a move inside the wait");
  if (moves.some(m => (m.action === "down" || m.action === "lock") && m.from <= cap + 1 && m.age <= k.cooloff_hours * 60))
    return hold("7d", "cooling off");
  const W = state.readings.filter(r => r.age <= k.wait_minutes && r.age >= n.age);
  if (W.length < k.wait_minutes / 5 - 1) return hold("7e", "too few readings");
  const ok = r => r.level === "green" && r.swap_mb != null && r.swap_mb < k.up_swap_used_mb
    && r.pswpin_per_s != null && r.pswpin_per_s < k.up_swapin_per_s
    && r.iowait_pct != null && r.iowait_pct < k.up_iowait_pct;
  if (!W.every(ok)) return hold("7e", "a reading lacks headroom");
  return write("up", cap + 1, "7", "green with headroom and a queue");
}

const green = (id, age, over = {}) => ({ id, age, level: "green", swap_mb: 500, pswpin_per_s: 300, iowait_pct: 8, ...over });
const base = (over = {}) => ({
  cap: 1, ceiling: 5, tuning: TUNING, held: 1, waiting: 1, moves: [],
  readings: [green(1, 16), green(2, 11), green(3, 6), green(4, 1)],
  ...over,
});
const is = (got, action, to, step, label) =>
  assert.deepEqual({ action: got.action, to: got.to, step: got.step }, { action, to, step }, `${label}; got ${JSON.stringify(got)}`);

async function run() {
  // ---- A. the §6 cases ---------------------------------------------------------------------
  // 1. base: up to 2.
  is(decide(base()), "up", 2, "7", "case 1: the base state raises 1 -> 2");
  // 2. called again at once: the move just made holds it (at cap 2 the queue test fires first).
  is(decide(base({ cap: 2, moves: [{ action: "up", from: 1, age: 0, reading_id: 4 }] })), "hold", 2, "7b", "case 2: again at once holds");
  is(decide(base({ cap: 2, held: 2, moves: [{ action: "up", from: 1, age: 0, reading_id: 4 }] })), "hold", 2, "7c", "case 2: a move inside the wait holds even with a full line");
  // 3. each missing condition holds, by its own step.
  is(decide(base({ waiting: 0 })), "hold", 1, "7b", "case 3: nothing waiting");
  is(decide(base({ held: 0 })), "hold", 1, "7b", "case 3: the line is not full");
  is(decide(base({ readings: [green(1, 16), green(2, 11), green(3, 6, { pswpin_per_s: 700 }), green(4, 1)] })), "hold", 1, "7e", "case 3: one reading at 700 pages/s");
  is(decide(base({ readings: [green(3, 6), green(4, 1)] })), "hold", 1, "7e", "case 3: two readings");
  is(decide(base({ readings: [green(1, 31), green(2, 26), green(3, 21), green(4, 16)] })), "hold", 1, "3", "case 3: newest 16 minutes old is unsafe");
  is(decide(base({ readings: [green(1, 16), green(2, 11), green(3, 6, { swap_mb: 650 }), green(4, 1)] })), "hold", 1, "7e", "headroom is strict: 650 MB is not under 650");
  is(decide(base({ readings: [green(1, 16), green(2, 11), green(3, 6, { iowait_pct: null }), green(4, 1)] })), "hold", 1, "7e", "a NULL measure fails (§19o)");
  is(decide(base({ readings: [green(1, 16), green(2, 11), { id: 3, age: 6, level: null }, green(4, 1)] })), "hold", 1, "7e", "an ungraded reading in the run fails");
  is(decide(base({ tuning: { ...TUNING, wait_minutes: undefined } })), "hold", 1, "7", "a missing tuning key holds");
  // 4. the cool-off: a down from 2 bars 2 for 24 hours.
  is(decide(base({ moves: [{ action: "down", from: 2, age: 23 * 60, reading_id: null }] })), "hold", 1, "7d", "case 4: a down from 2, 23 hours old");
  is(decide(base({ moves: [{ action: "down", from: 2, age: 25 * 60, reading_id: null }] })), "up", 2, "7", "case 4: a down from 2, 25 hours old");
  // 5. amber steps down one; a second amber goes to 1.
  const amber1 = [green(3, 6), { ...green(4, 1), level: "amber" }];
  is(decide(base({ cap: 4, readings: amber1 })), "down", 3, "6", "case 5: cap 4, n amber, p green");
  const amber2 = [green(3, 11), { ...green(4, 6), level: "amber" }, { ...green(5, 1), level: "amber" }];
  is(decide(base({ cap: 3, readings: amber2, moves: [{ action: "down", from: 4, age: 5, reading_id: 4 }] })), "down", 1, "6", "case 5: the next reading amber goes to 1");
  is(decide(base({ cap: 3, readings: amber1, moves: [{ action: "down", from: 4, age: 0, reading_id: 4 }] })), "hold", 3, "4", "an amber reading is acted on once");
  is(decide(base({ cap: 1, readings: amber1 })), "hold", 1, "6", "amber at the floor holds");
  // 6. red locks at 1; later 2 is reachable and 3 is barred.
  const red1 = [green(3, 6), { ...green(4, 1), level: "red" }];
  is(decide(base({ cap: 3, readings: red1 })), "lock", 1, "5", "case 6: cap 3, n red");
  is(decide(base({ cap: 1, readings: red1 })), "lock", 1, "5", "red after green is recorded even at 1");
  is(decide(base({ cap: 1, readings: [{ ...green(3, 6), level: "red" }, { ...green(4, 1), level: "red" }] })), "hold", 1, "5", "still red at 1 holds");
  const afterLock = [{ action: "lock", from: 3, age: 60, reading_id: 0 }];
  is(decide(base({ cap: 1, moves: afterLock })), "up", 2, "7", "case 6: 2 is reachable after a lock from 3");
  is(decide(base({ cap: 2, held: 2, moves: afterLock })), "hold", 2, "7d", "case 6: 3 is barred after a lock from 3");
  // 7. the ceiling.
  is(decide(base({ cap: 5, held: 5 })), "hold", 5, "7a", "case 7: cap 5 holds at the ceiling");
  is(decide(base({ cap: 7, held: 7 })), "ceiling", 5, "2", "case 7: cap 7 comes down to the ceiling");
  is(decide(base({ cap: 7, readings: [] })), "ceiling", 5, "2", "the ceiling applies whatever the health");
  // fail closed.
  is(decide(base({ readings: [] })), "hold", 1, "3", "no reading holds");
  is(decide(base({ level: null })), "hold", 1, "3", "an unreadable level holds");
  // A green newest reading inside a window that still holds an amber one never raises.
  is(decide(base({ readings: [green(1, 16), { ...green(2, 11), level: "amber" }, green(3, 6), green(4, 1)] })), "hold", 1, "7a", "a green reading in an amber window holds");

  // ---- A. the mirror, as text --------------------------------------------------------------
  assert.ok(fs.existsSync(MIRROR), "the migration mirror docs/design/agt-349-test-line-opens.sql must exist");
  const sql = fs.readFileSync(MIRROR, "utf8");
  const must = [
    "CREATE OR REPLACE FUNCTION public.test_slot_tune()",
    "pg_try_advisory_xact_lock(349)",
    "'1-56/5 * * * *'",
    "ADD COLUMN test_slot_ceiling smallint NOT NULL DEFAULT 5",
    "REVOKE EXECUTE ON FUNCTION public.test_slot_tune() FROM PUBLIC, anon, authenticated;",
  ];
  const missing = must.filter(m => !sql.includes(m));
  assert.deepEqual(missing, [], `the mirror must carry every piece of the tuner; missing ${JSON.stringify(missing)}`);
  const overloads = sql.match(/CREATE OR REPLACE FUNCTION public\.test_slot_tune\(/g) ?? [];
  assert.equal(overloads.length, 1, "one test_slot_tune, never a second signature");

  // ---- B. live, read-only ------------------------------------------------------------------
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-349 arm B (live capacity, ceiling, tuning keys, test_slot_moves)",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- the tuner is a database function. Arm A ran.");
  } else {
    const get = async q => {
      const res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      assert.equal(res.status, 200, `GET ${q} -> HTTP ${res.status} (400/404 = the migration is not live)`);
      return res.json();
    };
    const [s] = await get("runner_settings?select=test_slot_capacity,test_slot_ceiling,test_slot_tuning&id=eq.1");
    const cap = Number(s.test_slot_capacity);
    const ceiling = Number(s.test_slot_ceiling);
    assert.ok(Number.isInteger(cap) && Number.isInteger(ceiling) && cap >= 1 && cap <= ceiling,
      `test_slot_capacity must be an integer from 1 to test_slot_ceiling; got ${s.test_slot_capacity} of ${s.test_slot_ceiling}`);
    const absent = Object.keys(TUNING).filter(name => s.test_slot_tuning?.[name] === undefined || s.test_slot_tuning?.[name] === null);
    assert.deepEqual(absent, [], `test_slot_tuning must carry all six keys; missing ${JSON.stringify(absent)}`);
    const moves = await get("test_slot_moves?select=id&limit=1");
    assert.ok(Array.isArray(moves), "test_slot_moves must answer with rows");
    console.log(`    [AGT-349 live] capacity ${cap} of ceiling ${ceiling}; tuning ${JSON.stringify(s.test_slot_tuning)}`);
  }

  // ---- C. declared, never skipped ----------------------------------------------------------
  notRun("AGT-349 arm C (the §6 walk in a rolled-back transaction)",
    "emptying and seeding test_slot_moves, test_slots and db_health_readings inside one transaction " +
    "that is then rolled back is not possible over PostgREST, and rpc/test_slot_tune is never called " +
    "from a test because it can write the setting. Measured at the ship over the MCP instead: the " +
    "base state raised 1 -> 2 with one test_slot_moves row carrying a decision_id; called again at " +
    "once it held; cap 4 on amber stepped down to 3 and a second amber went to 1; cap 3 on red " +
    "locked at 1, after which 2 was reachable and 3 was barred.");
}

selfRun(import.meta.url, run);
export default run;
