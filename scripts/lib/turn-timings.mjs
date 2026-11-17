// DeepBench v7.0.1049 | scripts/lib/turn-timings.mjs | AGT-317 -- a transcript holding a turn of
// IDLE_TURN_MS or longer is a session left open, not a model at work: verdict() sets it aside and
// says how many. verdict() also returns the writing speed -- output tokens per second of model
// time -- over every kept turn, and per lane alone beside with another session live: the one
// measurement that separates a model writing from a model slowed by a peer. Never one figure
// across lanes, because lanes write at different speeds and the mix differs by arm (pattern:56).
// DeepBench v7.0.1038 | scripts/lib/turn-timings.mjs | AGT-317
//
// How long the model took between tool calls, read from the harness's own transcript.
// John asked (runner_decisions 58c0e39c) why a routine run takes so long. A run's transcript is
// the only place a single model turn is timed, and it dies with the sandbox; this module reads
// it while the run is alive and stores one row per transcript in public.routine_turn_timings.
//
// A MODEL TURN is the time from the last tool result (or prompt) to the last assistant record
// before the next tool result. A TOOL CALL is the time from that record to the tool result.
// A turn of SLOW_TURN_MS or longer is SLOW, and is classed by what the model produced in it:
//   generating -- output tokens per second at or above WAIT_TOKENS_PER_SEC: the time is output;
//   waiting    -- below it: the model was not producing for most of the turn.
// Both constants are declared, not measured per run (pattern:18). Measured 2026-11-15 on this
// platform's own turns: 69 to 106 output tokens per second on every turn of 30 s or longer.
//
// NO MODEL CALL. Reads files and makes one PostgREST upsert. sweep() never throws and never
// decides an exit code: timing is telemetry, and telemetry never blocks the path it measures
// (pattern:105).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const SLOW_TURN_MS = 60000;
export const WAIT_TOKENS_PER_SEC = 20;
export const MIN_SESSIONS = 20;
export const PEER_OVERLAP_MS = 60000;
export const TABLE = "routine_turn_timings";
// No model call spans an hour. Measured 2026-11-17 over 86 stored transcripts: the longest turn
// that wrote at writing speed is 427 s; the one turn above it is 86,795 s, in a session opened one
// day and picked up the next. Declared, not fitted (pattern:18).
export const IDLE_TURN_MS = 3600000;
export const idleRow = r => (r?.max_ms ?? 0) >= IDLE_TURN_MS;
// The lane a transcript ran in, from the two facts the transcript itself gave.
export const laneOf = row => `${row.kind ?? "kind-unknown"} ${row.model ?? "model-unknown"}`;

export function classifyTurn(ms, outputTokens) {
  if (ms < SLOW_TURN_MS) return "fast";
  return outputTokens / (ms / 1000) >= WAIT_TOKENS_PER_SEC ? "generating" : "waiting";
}

function rank(sorted, p) {
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null;
}

// One transcript's text in, one row's numbers out. Null when the text holds no model turn.
export function measureTranscript(text) {
  const recs = [];
  for (const line of String(text).split("\n")) {
    if (!line) continue;
    let r = null;
    try { r = JSON.parse(line); } catch { continue; }
    if (r && r.timestamp && (r.type === "assistant" || r.type === "user")) recs.push(r);
  }
  const turns = [];
  let toolCalls = 0, toolMs = 0, lastUser = null, lastAsst = null, cur = null, model = null, sessionId = null;
  const close = () => { cur.ms = lastAsst - cur.start; turns.push(cur); cur = null; };
  for (const r of recs) {
    const t = Date.parse(r.timestamp);
    if (!sessionId && r.sessionId) sessionId = r.sessionId;
    if (r.type === "user") {
      if (cur) { close(); toolCalls += 1; toolMs += t - lastAsst; }
      lastUser = t;
      continue;
    }
    if (!cur && lastUser !== null) cur = { start: lastUser, out: 0, ids: new Set() };
    const m = r.message ?? {};
    if (m.model) model = m.model;
    if (cur && m.usage && !cur.ids.has(m.id)) { cur.ids.add(m.id); cur.out += m.usage.output_tokens || 0; }
    lastAsst = t;
  }
  if (cur) close();
  if (!turns.length) return null;
  const ms = turns.map(x => x.ms).sort((a, b) => a - b);
  const slow = turns.map(x => classifyTurn(x.ms, x.out)).filter(c => c !== "fast");
  return {
    session_id: sessionId,
    model,
    first_at: recs[0].timestamp,
    last_at: recs[recs.length - 1].timestamp,
    turns: turns.length,
    turn_ms: ms.reduce((a, b) => a + b, 0),
    tool_calls: toolCalls,
    tool_ms: toolMs,
    p50_ms: rank(ms, 0.5),
    p90_ms: rank(ms, 0.9),
    max_ms: ms[ms.length - 1],
    slow_turns: slow.length,
    slow_generating: slow.filter(c => c === "generating").length,
    slow_waiting: slow.filter(c => c === "waiting").length,
    output_tokens: turns.reduce((a, x) => a + x.out, 0),
  };
}

// This session's transcripts on this box: the main one and every sub-agent's.
export function findTranscripts(sessionId, env = process.env, fsImpl = fs) {
  const root = path.join(env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "projects");
  const out = [];
  let dirs = [];
  try { dirs = fsImpl.readdirSync(root); } catch { return out; }
  for (const d of dirs.sort()) {
    const main = path.join(root, d, `${sessionId}.jsonl`);
    if (fsImpl.existsSync(main)) out.push({ file: main, transcript: "main", kind: "main" });
    const sub = path.join(root, d, sessionId, "subagents");
    let names = [];
    try { names = fsImpl.readdirSync(sub); } catch { names = []; }
    for (const n of names.sort()) {
      if (/^agent-[A-Za-z0-9_-]+\.jsonl$/.test(n)) {
        out.push({ file: path.join(sub, n), transcript: n.slice(0, -".jsonl".length), kind: "subagent" });
      }
    }
  }
  return out;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The rows this session would store, with no network call.
export function localRows({ env = process.env, fsImpl = fs, cycle = null, sweptBy = "manual" } = {}) {
  const sid = String(env.CLAUDE_CODE_SESSION_ID ?? "").trim();
  if (!sid) return { rows: [], reason: "CLAUDE_CODE_SESSION_ID is not set, so no transcript can be tied to a session" };
  const rows = [];
  for (const f of findTranscripts(sid, env, fsImpl)) {
    let m = null;
    try { m = measureTranscript(fsImpl.readFileSync(f.file, "utf8")); } catch { m = null; }
    if (!m) continue;
    rows.push({ ...m, session_id: sid, transcript: f.transcript, kind: f.kind,
      cycle_id: UUID.test(String(cycle ?? "")) ? cycle : null, swept_by: String(sweptBy) });
  }
  return { rows, reason: rows.length ? null : "no transcript with a model turn was found for this session" };
}

// Store them. One upsert on (session_id, transcript): a later sweep of a longer transcript
// replaces the earlier row, so the last sweep of a run is the run.
export async function sweep({ env = process.env, fsImpl = fs, fetchImpl = fetch, cycle = null, sweptBy = "manual", now = new Date() } = {}) {
  try {
    const { rows, reason } = localRows({ env, fsImpl, cycle, sweptBy });
    if (!rows.length) return { ok: false, recorded: 0, reason };
    const url = String(env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
    const key = String(env.SUPABASE_SERVICE_KEY ?? "").trim();
    if (!url || !key) return { ok: false, recorded: 0, reason: "SUPABASE_URL or SUPABASE_SERVICE_KEY is not set" };
    const stamp = now.toISOString();
    const res = await fetchImpl(`${url}/rest/v1/${TABLE}?on_conflict=session_id,transcript`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows.map(r => ({ ...r, recorded_at: stamp }))),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, recorded: 0, reason: `HTTP ${res.status} ${String(text).slice(0, 200)}` };
    }
    return { ok: true, recorded: rows.length, reason: null };
  } catch (e) {
    return { ok: false, recorded: 0, reason: String(e?.message ?? e) };
  }
}

// The answer to "which is it", over stored rows. Counts first, one word last.
export function verdict(rows) {
  const all = Array.isArray(rows) ? rows : [];
  const list = all.filter(r => !idleRow(r));
  const span = r => [Date.parse(r.first_at), Date.parse(r.last_at)];
  const arm = () => ({ transcripts: 0, turns: 0, slow_waiting: 0, per_1000: null });
  const alone = arm(), peers = arm();
  let turns = 0, slow = 0, generating = 0, waiting = 0;
  const total = [0, 0], wrote = new Map();
  const perSec = ([tokens, ms]) => (ms > 0 ? Math.round((tokens / (ms / 1000)) * 10) / 10 : null);
  for (const r of list) {
    const [a, b] = span(r);
    const others = new Set();
    for (const o of list) {
      if (o.session_id === r.session_id) continue;
      const [c, d] = span(o);
      if (Math.min(b, d) - Math.max(a, c) >= PEER_OVERLAP_MS) others.add(o.session_id);
    }
    const side = others.size ? peers : alone;
    const w = wrote.get(laneOf(r)) ?? { alone: [0, 0, 0], peers: [0, 0, 0] };
    const cell = w[others.size ? "peers" : "alone"];
    for (const c of [total, cell]) { c[0] += r.output_tokens ?? 0; c[1] += r.turn_ms ?? 0; }
    cell[2] += r.turns;
    wrote.set(laneOf(r), w);
    side.transcripts += 1; side.turns += r.turns; side.slow_waiting += r.slow_waiting;
    turns += r.turns; slow += r.slow_turns; generating += r.slow_generating; waiting += r.slow_waiting;
  }
  for (const side of [alone, peers]) {
    side.per_1000 = side.turns ? Math.round((side.slow_waiting / side.turns) * 10000) / 10 : null;
  }
  const sessions = new Set(list.map(r => r.session_id)).size;
  let word;
  if (sessions < MIN_SESSIONS) word = "not-enough-runs";
  else if (slow === 0) word = "no-slow-turns";
  else if (generating / slow >= 0.8) word = "generation";
  else if (waiting / slow >= 0.8) {
    word = alone.turns && peers.turns && peers.per_1000 >= 2 * alone.per_1000 && peers.per_1000 > 0
      ? "waiting-with-peers" : "waiting";
  } else word = "mixed";
  return { verdict: word, sessions, transcripts: list.length, turns, slow, generating, waiting, alone, peers,
    set_aside: all.length - list.length,
    speed: { all: perSec(total), lanes: [...wrote.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([lane, w]) => ({ lane,
      alone: { turns: w.alone[2], per_sec: perSec(w.alone) }, peers: { turns: w.peers[2], per_sec: perSec(w.peers) } })) } };
}
