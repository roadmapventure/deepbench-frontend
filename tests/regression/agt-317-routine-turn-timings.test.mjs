// DeepBench v7.0.1038 | tests/regression/agt-317-routine-turn-timings.test.mjs | AGT-317
//
// WHAT THIS GUARDS. A routine run's model-turn time is measured from the harness transcript and
// stored one row per transcript, so "is a slow turn the model writing, or the model waiting, and
// does it happen more with another session live" is a count over rows, not a recollection.
//   A  OFFLINE  the measuring itself (scripts/lib/turn-timings.mjs) on fixtures written here.
//   B  OFFLINE  the three wirings read as source: agent-log.js sweeps after its own write and
//               never decides an exit code on it; the CLI's exits; the migration mirror's grants.
//   C  LIVE     (SUPABASE_URL + SUPABASE_SERVICE_KEY; notRun otherwise) the table takes an upsert
//               on (session_id, transcript), refuses a row whose slow counts do not add up, and
//               is closed to the browser key. Its own rows are deleted before it returns.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  classifyTurn, measureTranscript, findTranscripts, localRows, sweep, verdict,
  SLOW_TURN_MS, WAIT_TOKENS_PER_SEC, MIN_SESSIONS, TABLE,
} from "../../scripts/lib/turn-timings.mjs";
import { parseArgs, routineOf, summarize } from "../../scripts/measure-routine-turns.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

const T0 = Date.parse("2026-11-15T12:00:00.000Z");
const at = s => new Date(T0 + s * 1000).toISOString();
const user = s => JSON.stringify({ type: "user", timestamp: at(s), sessionId: "sess-1" });
const asst = (s, id, out) => JSON.stringify({ type: "assistant", timestamp: at(s), sessionId: "sess-1",
  message: { id, model: "claude-test-1", usage: { output_tokens: out } } });

// Four turns: 5 s; 90 s writing 9,000 tokens (two records of ONE message); 200 s with 400 tokens;
// 2 s left open at the end of the file. Tool calls: 1 s, 10 s, 3 s.
export const FIXTURE = [
  user(0), asst(5, "m1", 100),
  user(6), asst(50, "m2", 9000), asst(96, "m2", 9000),
  user(106), asst(306, "m3", 400),
  user(309), asst(311, "m4", 50),
  "not json", JSON.stringify({ type: "attachment", timestamp: at(400) }),
].join("\n");

function row(session, startS, over = {}) {
  return { session_id: session, first_at: at(startS), last_at: at(startS + 600), turns: 100,
    slow_turns: 0, slow_generating: 0, slow_waiting: 0, ...over };
}
const many = (n, over, startOf = i => i * 10000) => Array.from({ length: n }, (_, i) => row(`s${i}`, startOf(i), over));

function armMeasure() {
  assert.equal(SLOW_TURN_MS, 60000);
  assert.equal(WAIT_TOKENS_PER_SEC, 20);
  assert.equal(MIN_SESSIONS, 20);
  assert.equal(TABLE, "routine_turn_timings");
  assert.deepEqual([[59999, 0], [60000, 1200], [60000, 1199], [191000, 14325], [336000, 300]]
    .map(([ms, out]) => classifyTurn(ms, out)), ["fast", "generating", "waiting", "generating", "waiting"]);

  assert.deepEqual(measureTranscript(FIXTURE), {
    session_id: "sess-1", model: "claude-test-1", first_at: at(0), last_at: at(311),
    turns: 4, turn_ms: 297000, tool_calls: 3, tool_ms: 14000,
    p50_ms: 90000, p90_ms: 200000, max_ms: 200000,
    slow_turns: 2, slow_generating: 1, slow_waiting: 1, output_tokens: 9550,
  });
  assert.equal(measureTranscript(""), null);
  assert.equal(measureTranscript([asst(1, "m", 5)].join("\n")), null, "an answer with no prompt before it is not a turn");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt317-"));
  try {
    const proj = path.join(dir, "projects", "-some-project");
    fs.mkdirSync(path.join(proj, "sess-1", "subagents"), { recursive: true });
    fs.writeFileSync(path.join(proj, "sess-1.jsonl"), FIXTURE);
    fs.writeFileSync(path.join(proj, "sess-2.jsonl"), FIXTURE);
    fs.writeFileSync(path.join(proj, "sess-1", "subagents", "agent-abc.jsonl"), FIXTURE);
    fs.writeFileSync(path.join(proj, "sess-1", "subagents", "agent-abc.meta.json"), "{}");
    fs.writeFileSync(path.join(proj, "sess-1", "subagents", "agent-empty.jsonl"), "");
    const env = { CLAUDE_CONFIG_DIR: dir, CLAUDE_CODE_SESSION_ID: "sess-1", SUPABASE_URL: "https://db.invalid/", SUPABASE_SERVICE_KEY: "k" };
    assert.deepEqual(findTranscripts("sess-1", env).map(f => `${f.kind}:${f.transcript}`),
      ["main:main", "subagent:agent-abc", "subagent:agent-empty"]);
    const cycle = "033347d0-613a-4f82-8397-128043bcae24";
    const local = localRows({ env, cycle, sweptBy: "designer:design-kickoff" });
    assert.equal(local.reason, null);
    assert.deepEqual(local.rows.map(r => [r.transcript, r.kind, r.cycle_id, r.swept_by, r.turns]),
      [["main", "main", cycle, "designer:design-kickoff", 4], ["agent-abc", "subagent", cycle, "designer:design-kickoff", 4]]);
    assert.equal(localRows({ env, cycle: "not-a-uuid" }).rows[0].cycle_id, null);
    assert.match(localRows({ env: { CLAUDE_CONFIG_DIR: dir } }).reason, /CLAUDE_CODE_SESSION_ID is not set/);
    assert.match(localRows({ env: { ...env, CLAUDE_CODE_SESSION_ID: "sess-9" } }).reason, /no transcript with a model turn/);
    return { dir, env, cycle };
  } catch (e) { fs.rmSync(dir, { recursive: true, force: true }); throw e; }
}

async function armSweep({ dir, env, cycle }) {
  try {
    const calls = [];
    const okFetch = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 201, text: async () => "" }; };
    const now = new Date("2026-11-15T13:00:00.000Z");
    assert.deepEqual(await sweep({ env, cycle, sweptBy: "builder:build-ticket", fetchImpl: okFetch, now }), { ok: true, recorded: 2, reason: null });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://db.invalid/rest/v1/routine_turn_timings?on_conflict=session_id,transcript");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Prefer, "resolution=merge-duplicates,return=minimal");
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.length, 2);
    assert.ok(body.every(r => r.recorded_at === "2026-11-15T13:00:00.000Z" && r.session_id === "sess-1" && r.slow_generating + r.slow_waiting === r.slow_turns));
    assert.deepEqual(Object.keys(body[0]).sort(), Object.keys(body[1]).sort(), "PostgREST needs one key set across a bulk upsert");

    const refused = await sweep({ env, fetchImpl: async () => ({ ok: false, status: 404, text: async () => "PGRST205" }) });
    assert.deepEqual(refused, { ok: false, recorded: 0, reason: "HTTP 404 PGRST205" });
    const thrown = await sweep({ env, fetchImpl: async () => { throw new Error("socket hang up"); } });
    assert.deepEqual(thrown, { ok: false, recorded: 0, reason: "socket hang up" }, "sweep() never throws");
    let touched = false;
    const noKey = await sweep({ env: { ...env, SUPABASE_SERVICE_KEY: "" }, fetchImpl: async () => { touched = true; } });
    assert.equal(noKey.ok, false);
    assert.equal(touched, false, "no credentials, no request");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function armVerdict() {
  assert.equal(verdict([]).verdict, "not-enough-runs");
  assert.equal(verdict(many(19, { slow_turns: 5, slow_generating: 5 })).verdict, "not-enough-runs");
  assert.equal(verdict(many(20, {})).verdict, "no-slow-turns");
  const gen = verdict(many(20, { slow_turns: 5, slow_generating: 4, slow_waiting: 1 }));
  assert.deepEqual([gen.verdict, gen.sessions, gen.turns, gen.slow, gen.generating, gen.waiting], ["generation", 20, 2000, 100, 80, 20]);
  assert.deepEqual(gen.alone, { transcripts: 20, turns: 2000, slow_waiting: 20, per_1000: 10 });
  assert.deepEqual(gen.peers, { transcripts: 0, turns: 0, slow_waiting: 0, per_1000: null });
  assert.equal(verdict(many(20, { slow_turns: 5, slow_generating: 3, slow_waiting: 2 })).verdict, "mixed");
  assert.equal(verdict(many(20, { slow_turns: 5, slow_waiting: 5 })).verdict, "waiting", "every run alone: waiting, and no claim about peers");
  // Ten runs alone with no waiting turn, ten runs in five overlapping pairs with five each.
  const paired = [
    ...many(10, {}),
    ...many(10, { slow_turns: 5, slow_waiting: 5 }, i => 500000 + Math.floor(i / 2) * 10000 + (i % 2) * 300).map((r, i) => ({ ...r, session_id: `p${i}` })),
  ];
  const wp = verdict(paired);
  assert.equal(wp.verdict, "waiting-with-peers");
  assert.deepEqual(wp.alone, { transcripts: 10, turns: 1000, slow_waiting: 0, per_1000: 0 });
  assert.deepEqual(wp.peers, { transcripts: 10, turns: 1000, slow_waiting: 50, per_1000: 50 });
  // A sub-agent's transcript overlaps its own session's main one: same session is never a peer.
  const own = verdict([row("s1", 0, { slow_turns: 1, slow_waiting: 1 }), { ...row("s1", 10), transcript: "agent-x" }]);
  assert.equal(own.peers.transcripts, 0);
}

function armSource() {
  const log = read("scripts/agent-log.js");
  assert.ok(log.includes("import { sweep } from './lib/turn-timings.mjs';"), "agent-log.js imports the one sweep");
  const iCite = log.indexOf("if (cited.error) fail(cited.error);");
  const iSweep = log.indexOf("const swept = await sweep({ cycle: args.cycle, sweptBy: `${args.agent}:${args.capability}` });");
  const iOut = log.indexOf("if (args.json) {");
  assert.ok(iCite > 0 && iSweep > iCite && iOut > iSweep, "the sweep runs after the log row and its citations, before the printed line");
  const tail = log.slice(iSweep, iOut);
  assert.ok(tail.includes("process.stderr.write(`turn-timings: "), "the sweep reports on stderr, so the printed stdout line is unchanged");
  assert.ok(!/fail\(|process\.exit/.test(tail), "a sweep that could not record never decides agent-log's exit code");

  assert.deepEqual(parseArgs([]), { mode: "local", days: 30, json: false, cycle: null, sweptBy: "manual" });
  assert.deepEqual(parseArgs(["--report", "--days=7", "--json"]), { mode: "report", days: 7, json: true, cycle: null, sweptBy: "manual" });
  assert.ok(parseArgs(["--days=0"]).error);
  assert.ok(parseArgs(["--latency"]).error);
  assert.equal(routineOf({ cycle_id: "x", swept_by: "designer:design-kickoff" }), "runner");
  assert.equal(routineOf({ cycle_id: "x", swept_by: "designer:design-kickoff" },
    new Map([["x", "DEEPBENCH-RUNNER-AUTOMATED-trig_017TZ3JZcLBK6AYH6DKURqMH"]])), "runner:KURqMH");
  assert.equal(routineOf({ cycle_id: null, swept_by: "jerry:job-alerts" }), "jerry");
  assert.equal(routineOf({ cycle_id: null, swept_by: "" }), "unknown");
  assert.deepEqual(summarize([
    { swept_by: "jerry:a", cycle_id: null, turns: 4, turn_ms: 297000, tool_ms: 14000, slow_turns: 2, slow_generating: 1, slow_waiting: 1, max_ms: 200000 },
    { swept_by: "jerry:a", cycle_id: null, turns: 1, turn_ms: 1400, tool_ms: 0, slow_turns: 0, slow_generating: 0, slow_waiting: 0, max_ms: 1400 },
  ], r => routineOf(r)), [{ key: "jerry", transcripts: 2, turns: 5, turn_s: 298, tool_s: 14, slow: 2, generating: 1, waiting: 1, max_s: 200 }]);
  const cli = read("scripts/measure-routine-turns.js");
  assert.ok(cli.includes('process.exit(v.verdict === "not-enough-runs" ? 3 : 0);'), "not-enough-runs is exit 3, an answer and not a failure");

  const sql = read("docs/design/agt-317-routine-turn-timings.sql");
  assert.ok(sql.includes("revoke all on public.routine_turn_timings from public, anon, authenticated;"));
  assert.ok(sql.includes("grant select, insert, update, delete on public.routine_turn_timings to service_role;"));
  assert.ok(sql.includes("primary key (session_id, transcript)"));
  assert.ok(sql.includes("check (slow_generating + slow_waiting = slow_turns)"));
  assert.ok(sql.includes("raise exception 'AGT-317 GRANTS:"), "the migration asserts its own grants and never trusts the success flag");
}

async function armLive(base, key) {
  const sid = `agt317-test-${randomUUID()}`;
  const call = (q, init = {}, k = key) => fetch(`${base}/rest/v1/${q}`, { ...init,
    headers: { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const one = over => ({ session_id: sid, transcript: "main", kind: "main", model: "claude-test-1", cycle_id: null,
    swept_by: "agt-317-test", first_at: at(0), last_at: at(311), turns: 4, turn_ms: 297000, tool_calls: 3, tool_ms: 14000,
    p50_ms: 90000, p90_ms: 200000, max_ms: 200000, slow_turns: 2, slow_generating: 1, slow_waiting: 1, output_tokens: 9550, ...over });
  const upsert = r => call(`${TABLE}?on_conflict=session_id,transcript`, { method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([r]) });
  try {
    const first = await upsert(one({}));
    assert.ok(first.ok, `the table takes a row: HTTP ${first.status} ${await first.text()}`);
    const again = await upsert(one({ turns: 9 }));
    assert.ok(again.ok, `a second sweep of the same transcript is an update: HTTP ${again.status}`);
    const back = await (await call(`${TABLE}?session_id=eq.${sid}&select=transcript,turns,slow_turns`)).json();
    assert.deepEqual(back, [{ transcript: "main", turns: 9, slow_turns: 2 }], "one row per transcript, holding the last sweep");
    const bad = await upsert(one({ transcript: "agent-bad", slow_turns: 3 }));
    assert.equal(bad.status, 400, "slow counts that do not add up are refused by the table");
    assert.match(await bad.text(), /routine_turn_timings_slow_adds_up/);
    const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
    if (!anon) {
      notRun("AGT-317 arm C: the browser key cannot read routine_turn_timings",
        "VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY absent. The migration's own DO block asserted it at apply.");
    } else {
      const denied = await call(`${TABLE}?select=session_id&limit=1`, {}, anon);
      assert.ok(denied.status === 401 || denied.status === 403, `anon is refused, got HTTP ${denied.status}`);
    }
  } finally {
    await call(`${TABLE}?session_id=eq.${sid}`, { method: "DELETE" });
  }
  const left = await (await call(`${TABLE}?session_id=eq.${sid}&select=transcript`)).json();
  assert.deepEqual(left, [], "the test leaves no row behind");
  return "C live: upsert, constraint, residue 0";
}

async function run() {
  const fx = armMeasure();
  await armSweep(fx);
  armVerdict();
  armSource();
  const results = ["A measure+sweep+verdict", "B source"];
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("AGT-317 arm C: the live table (upsert, constraint, residue)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Canonical invocation: STANDARDS.md Section 2 rule 5.");
  } else {
    results.push(await armLive(base, key));
  }
  console.log(`[AGT-317] ${results.join("; ")}`);
  return results;
}

selfRun(import.meta.url, run);
export default run;
