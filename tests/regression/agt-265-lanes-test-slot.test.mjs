// DeepBench v7.0.689 | tests/regression/agt-265-lanes-test-slot.test.mjs | AGT-265 -- four runner
// lanes build in parallel; test-suite runs wait in ONE line for a green database.
//
// WHAT THIS GUARDS, and why each arm discriminates (STANDARDS.md Section 4, the LOO-013 lesson):
//   A  PURE -- scripts/test-slot.js driven with a stub fetch, clock and sleep: `off` / `held` / no
//      credentials SKIP without a single request; HTTP 404 is notRun; answers false, false, true are
//      exactly THREE acquire calls with waits 5 s then 10 s, and each wait beats the cycle with
//      "built, waiting for a test slot"; a clock that jumps 61 minutes is notRun NAMING the level;
//      withTestSlot releases on a throw and never calls fn without a slot. Plus
//      check-routine-prompt's runner-only stamp canon: a sibling routine's own trigger id is not
//      drift, any other change still is, and the auditor routine is not canonicalized at all.
//   B  LIVE, READ-ONLY (SUPABASE_URL + SUPABASE_SERVICE_KEY; notRun otherwise) -- runner_settings
//      max_lanes 4 / test_slot_capacity 1; ticket_matrix?select=lane_status answers 200; the boot
//      gate's detail carries live_lanes and max_lanes, max_lanes equal to the setting. Nothing here
//      calls test_slot_acquire with the service key: that writes a row (pattern:76).
//   C  ANON IS REFUSED (VITE_SUPABASE_ANON_KEY; notRun otherwise) -- test_slots and both rpcs, while
//      B proves the objects exist for the service key (both directions).
//   D  DOCS AND WIRING -- `lanes_full` in the runbook ladder and the routine prompt block; the
//      migration mirror names both functions; agt-116's child env opts out; run-all.js takes the slot
//      BEFORE its first per-test snapshot; the verifier wraps the regression gate.
//
// DRY-RUN against the tree before this ticket: A fails at import (scripts/test-slot.js does not
// exist), B fails at its first read (runner_settings has no max_lanes column -> HTTP 400), D fails on
// every clause.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  holderId, nextPoll, takeTestSlot, withTestSlot, WAITING_STEP, FIRST_POLL_MS, MAX_POLL_MS,
} from "../../scripts/test-slot.js";
import { comparePrompt, extractBlock, ROUTINES } from "../../scripts/check-routine-prompt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const CYCLE = "94b937b2-8086-476c-b7c5-b763dd690dc9";
const CREDS = { SUPABASE_URL: "https://stub.example", SUPABASE_SERVICE_KEY: "stub" };

// A stub PostgREST: acquire answers come off a queue; every call is recorded.
function stub(answers) {
  const calls = [];
  const doFetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url, method: init.method ?? "GET", body });
    const reply = (status, json) => ({ status, ok: status >= 200 && status < 300, statusText: "", text: async () => JSON.stringify(json) });
    if (url.includes("/rpc/test_slot_acquire")) {
      const a = answers.shift();
      if (a === 404) return reply(404, { message: "not found" });
      return reply(200, [{ granted: a.granted, level: a.level ?? "green", capacity: 1, held: a.granted ? 1 : 1, position: 2, expired: [] }]);
    }
    if (url.includes("/rpc/test_slot_release")) return reply(200, 1);
    if (url.includes("/runner_cycles")) return reply(200, [{ id: CYCLE, last_step: body.last_step, heartbeat_at: body.heartbeat_at }]);
    return reply(404, {});
  };
  return { calls, doFetch };
}

async function armPure() {
  // holderId
  assert.strictEqual(holderId({ DEEPBENCH_CYCLE_ID: CYCLE }, { hostname: () => "h" }, 7), CYCLE);
  assert.strictEqual(holderId({}, { hostname: () => "h" }, 7), "h:7");
  assert.deepStrictEqual([0, 5000, 10000, 20000, 40000, 60000].map(nextPoll), [FIRST_POLL_MS, 10000, 20000, 40000, 60000, MAX_POLL_MS]);

  // Skips: no request at all.
  for (const [env, why] of [[{ ...CREDS, DEEPBENCH_TEST_SLOT: "off" }, "off"], [{ ...CREDS, DEEPBENCH_TEST_SLOT: "held" }, "held"], [{}, "no credentials"]]) {
    const s = stub([]);
    const r = await takeTestSlot(env, { doFetch: s.doFetch, out: () => {} });
    assert.ok(r.skipped && r.skipped.includes(why), `${why}: expected a skip, got ${JSON.stringify(r)}`);
    assert.strictEqual(s.calls.length, 0, `${why}: a skip must make no request`);
  }

  // 404 -> notRun.
  {
    const s = stub([404]);
    const r = await takeTestSlot(CREDS, { doFetch: s.doFetch, out: () => {} });
    assert.ok(r.notRun && /404/.test(r.notRun), `404 must be notRun, got ${JSON.stringify(r)}`);
  }

  // false, false, true -> 3 acquire calls, waits 5 s then 10 s, heartbeat each wait.
  {
    const s = stub([{ granted: false }, { granted: false }, { granted: true }]);
    const waits = [];
    const lines = [];
    const r = await takeTestSlot({ ...CREDS, DEEPBENCH_CYCLE_ID: CYCLE },
      { doFetch: s.doFetch, sleep: async ms => { waits.push(ms); }, now: () => 0, out: l => lines.push(l) });
    assert.strictEqual(r.holder, CYCLE, `granted on the third answer; got ${JSON.stringify(r)}`);
    const acq = s.calls.filter(c => c.url.includes("test_slot_acquire"));
    assert.strictEqual(acq.length, 3, `expected 3 acquire calls, got ${acq.length}`);
    assert.strictEqual(acq[0].body.p_cycle_id, CYCLE, "the cycle id must ride along to the line");
    assert.deepStrictEqual(waits, [5000, 10000], `waits must be 5 s then 10 s, got ${waits}`);
    const beats = s.calls.filter(c => c.url.includes("/runner_cycles") && c.method === "PATCH");
    assert.strictEqual(beats.length, 2, `each of the 2 waits must beat the cycle, got ${beats.length}`);
    assert.ok(beats.every(b => b.body.last_step === WAITING_STEP), `heartbeat text must be "${WAITING_STEP}"`);
    assert.ok(lines.includes(`test-slot: held ${CYCLE}`), `the grant must print "test-slot: held <holder>"; got ${JSON.stringify(lines)}`);
    const released = await r.release();
    assert.strictEqual(released, 1, "release() returns the rows deleted");
  }

  // The 60-minute cap: a clock that jumps 61 minutes after the first look is notRun naming the level.
  {
    const s = stub([{ granted: false, level: "amber" }]);
    let t = 0;
    const r = await takeTestSlot(CREDS, { doFetch: s.doFetch, sleep: async () => {}, now: () => { const v = t; t = 61 * 60_000; return v; }, out: () => {} });
    assert.ok(r.notRun && /no test slot in 60 min/.test(r.notRun) && /amber/.test(r.notRun),
      `the cap must be notRun naming the level; got ${JSON.stringify(r)}`);
    assert.ok(s.calls.some(c => c.url.includes("test_slot_release")), "a waiter that gives up must leave the line");
  }

  // withTestSlot: release on throw; no fn without a slot.
  {
    const s = stub([{ granted: true }]);
    await assert.rejects(withTestSlot(CREDS, async () => { throw new Error("boom"); }, { doFetch: s.doFetch, out: () => {} }), /boom/);
    assert.ok(s.calls.some(c => c.url.includes("test_slot_release")), "withTestSlot must release in finally, even on a throw");
    const s2 = stub([404]);
    let called = false;
    const r = await withTestSlot(CREDS, async () => { called = true; }, { doFetch: s2.doFetch, out: () => {} });
    assert.strictEqual(r.ran, false);
    assert.strictEqual(called, false, "no slot, no run");
  }

  // check-routine-prompt: the runner stamp canon.
  {
    const r = ROUTINES.runner;
    const block = extractBlock(read(`docs/runbooks/${r.file}`), r);
    const sibling = block.text.replace(`DEEPBENCH-RUNNER-AUTOMATED-${r.id}`, "DEEPBENCH-RUNNER-AUTOMATED-trig_01ABCDEFGHIJKLMNOPQRSTUV");
    assert.notStrictEqual(sibling, block.text, "control: the block must carry the canonical stamp to swap");
    assert.deepStrictEqual(comparePrompt(sibling, block, r, "runner"), [], "a sibling routine's own trigger id is not drift");
    const drifted = sibling.replace("mode: AUTOMATED", "mode: MANUAL");
    assert.notStrictEqual(drifted, sibling, "control: the drift mutation must change the text");
    assert.strictEqual(comparePrompt(drifted, block, r, "runner").length, 1, "any other difference is still drift");
    assert.ok(!ROUTINES.auditor.stamp, "only the runner routine canonicalizes its stamp");
  }
  return "pure: skip/404/poll/cap/finally/canon";
}

async function pg(base, key, q, init = {}) {
  const res = await fetch(`${base}/rest/v1/${q}`, {
    ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

async function armLive(base, key) {
  const s = await pg(base, key, "runner_settings?select=max_lanes,test_slot_capacity,test_slot_ladder&id=eq.1");
  assert.strictEqual(s.status, 200, `runner_settings read answered HTTP ${s.status}`);
  // John's ruling 58cf6423 (2026-09-29, after outage #3): the runner resumes on ONE lane.
  assert.strictEqual(Number(s.json[0].max_lanes), 1, `max_lanes is ${s.json[0].max_lanes}, expected 1 (ruling 58cf6423)`);
  // AGT-273: capacity stays 1 on John's 2026-09-30 call, so ruling 0b6d5414's 1 -> 3 was not written.
  assert.strictEqual(Number(s.json[0].test_slot_capacity), 1, `test_slot_capacity is ${s.json[0].test_slot_capacity}, expected 1`);
  assert.strictEqual(Number(s.json[0].test_slot_ladder?.red), 0, `test_slot_ladder.red is ${JSON.stringify(s.json[0].test_slot_ladder)}, expected 0 -- red never grants (AGT-273)`);
  const tm = await pg(base, key, "ticket_matrix?select=backlog_id,lane_status&limit=1");
  assert.strictEqual(tm.status, 200, `ticket_matrix?select=lane_status answered HTTP ${tm.status}`);
  const ts = await pg(base, key, "test_slots?select=holder&limit=1");
  assert.strictEqual(ts.status, 200, `service_role must read test_slots (HTTP ${ts.status})`);
  const b = await pg(base, key, "rpc/runner_should_boot", { method: "POST", body: "{}" });
  assert.strictEqual(b.status, 200, `rpc/runner_should_boot answered HTTP ${b.status}`);
  const d = b.json[0].detail;
  assert.ok(Number.isInteger(Number(d.live_lanes)), `detail.live_lanes missing: ${JSON.stringify(d.live_lanes)}`);
  assert.strictEqual(Number(d.max_lanes), Number(s.json[0].max_lanes), "detail.max_lanes must be the setting");
  if (b.json[0].reason === "lanes_full") assert.ok(Number(d.live_lanes) >= Number(d.max_lanes));
  return `live: settings 1/1, ladder red 0, lane_status 200, boot live_lanes ${d.live_lanes}/${d.max_lanes} (${b.json[0].reason})`;
}

async function armAnon(base, anon) {
  const h = { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" };
  const codes = [];
  for (const [fn, body] of [["test_slot_acquire", { p_holder: "agt265-anon" }], ["test_slot_release", { p_holder: "agt265-anon" }]]) {
    const r = await fetch(`${base}/rest/v1/rpc/${fn}`, { method: "POST", headers: h, body: JSON.stringify(body) });
    await r.text().catch(() => "");
    assert.ok(r.status === 401 || r.status === 403, `anon called ${fn}: HTTP ${r.status}, expected 401/403`);
    codes.push(`${fn} ${r.status}`);
  }
  const t = await fetch(`${base}/rest/v1/test_slots?select=holder`, { headers: h });
  await t.text().catch(() => "");
  assert.ok(t.status === 401 || t.status === 403, `anon read test_slots: HTTP ${t.status}, expected 401/403`);
  codes.push(`test_slots ${t.status}`);
  return `anon refused (${codes.join(", ")})`;
}

function armDocs() {
  const runbook = read("docs/runbooks/runner-cycle.md");
  assert.ok(/`lanes_full` — live lanes ≥ `runner_settings\.max_lanes`/.test(runbook), "runner-cycle.md must name `lanes_full` in the ladder");
  assert.ok(/nine refusal reasons/i.test(runbook), "runner-cycle.md must say nine refusal reasons");
  const prompt = extractBlock(read("docs/runbooks/routine-prompt.md"), ROUTINES.runner).text;
  assert.ok(/unaffordable, and since AGT-237\/AGT-265 also db_pressure, hard_stop and lanes_full/.test(prompt),
    "the routine prompt block must name lanes_full after unaffordable");
  const mirror = read("docs/design/agt-265-lanes-test-slot.sql");
  assert.ok(/FUNCTION public\.test_slot_acquire\(/.test(mirror) && /FUNCTION public\.test_slot_release\(/.test(mirror),
    "the mirror must carry both functions");
  assert.ok(/'hard_stop'/.test(mirror), "the mirror must preserve John's hard_stop branch");
  assert.ok(/DEEPBENCH_TEST_SLOT: "off"/.test(read("tests/regression/agt-116-suite-determinism.test.mjs")),
    "agt-116's child env must opt out of the line");
  const runAll = read("tests/regression/run-all.js");
  const held = runAll.indexOf('process.env.DEEPBENCH_TEST_SLOT = "held"');
  const snap = runAll.indexOf("const envBefore = snapshotEnv();");
  const take = runAll.indexOf("await takeTestSlot(process.env)");
  assert.ok(take > 0 && held > take && snap > 0, "run-all.js must take the slot and mark it held");
  assert.ok(runAll.indexOf("code = await runSuite(transport)") > held, "the slot is marked held BEFORE the suite (and its first snapshot) runs");
  const verifier = read("scripts/verifier.js");
  assert.ok(/withTestSlot\(slotEnv,/.test(verifier) && /DEEPBENCH_TEST_SLOT: "held"/.test(verifier),
    "the verifier must wrap the regression gate in withTestSlot and pass held to the child");
  return "docs: runbook, prompt, mirror, agt-116, run-all order, verifier";
}

async function run() {
  const results = [await armPure(), armDocs()];
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("the live arm (settings, lane_status, boot detail, anon refusal)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Canonical invocation: STANDARDS.md Section 2 rule 5.");
  } else {
    results.push(await armLive(base, key));
    const anon = process.env.VITE_SUPABASE_ANON_KEY;
    if (anon) results.push(await armAnon(base, anon));
    else notRun("the anon-denied half of the grant check",
      "VITE_SUPABASE_ANON_KEY absent; the service_role half ran. The migration's trailing DO block asserted " +
      "anon/authenticated hold no EXECUTE on either function and no grant on test_slots.");
  }
  console.log(`[AGT-265] ${results.join("; ")}`);
  return results;
}

selfRun(import.meta.url, run);
export default run;
