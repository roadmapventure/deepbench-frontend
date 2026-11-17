#!/usr/bin/env node
// DeepBench v7.0.1049 | scripts/measure-routine-turns.js | AGT-317 -- the report answers the question
// it was built for. Every line carries the output tokens written and the writing speed; one block
// puts each lane's speed alone beside its speed with another session live; one block says where a
// session's wall time went; a transcript holding a turn of an hour or longer is set aside and
// named; and a runner cycle with no row under its id is counted by whether it ran inside a stored
// session of its own trigger (a chained cycle, AGT-697) or outside any.
// DeepBench v7.0.1043 | scripts/measure-routine-turns.js | AGT-317 -- the report says only what
// the stored rows support. A lane is main or subagent plus the model that SERVED the transcript,
// read from the transcript; swept_by names a session's last agent-log call and is never used to say
// who ran a transcript. Every read is paged (PostgREST answers 1,000 rows at most), and the old
// line that named agents as logged-but-unstored is replaced by counts joined on the cycle id.
// DeepBench v7.0.1038 | scripts/measure-routine-turns.js | AGT-317
//
// Where a routine run's wall time goes, and which kind of slow it is. Read-only unless --sweep.
// The measuring and the one write live in scripts/lib/turn-timings.mjs; this file prints.
//
//   node scripts/measure-routine-turns.js            this session's transcripts, no database
//   node scripts/measure-routine-turns.js --sweep [--cycle=<runner_cycles.id>] [--swept-by=<text>]
//                                                    store them (scripts/agent-log.js does this itself)
//   node scripts/measure-routine-turns.js --report [--days=30]
//                                                    every stored run: per routine, per lane, per hour,
//                                                    where a session's time went, the writing speed,
//                                                    what was and was not measured, one verdict
//   --json prints one object instead of lines.
//
// EXIT 0 a verdict was reached (or --sweep / the local read ran). EXIT 3 `not-enough-runs`: fewer
// than MIN_SESSIONS sessions are stored, so no cause is named -- that is an answer, not a failure.
// EXIT 2 the report could not be read (no credentials, or the database refused).

import path from "node:path";
import { fileURLToPath } from "node:url";
import { localRows, sweep, verdict, idleRow, laneOf, TABLE, MIN_SESSIONS, SLOW_TURN_MS, WAIT_TOKENS_PER_SEC, IDLE_TURN_MS } from "./lib/turn-timings.mjs";

export function parseArgs(argv) {
  const out = { mode: "local", days: 30, json: false, cycle: null, sweptBy: "manual" };
  for (const raw of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(raw);
    if (!m) return { error: `unrecognized argument "${raw}"` };
    const [, key, value] = m;
    if (key === "sweep" || key === "report") out.mode = key;
    else if (key === "json") out.json = true;
    else if (key === "cycle") out.cycle = value;
    else if (key === "swept-by") out.sweptBy = value;
    else if (key === "days" && /^[1-9]\d*$/.test(value ?? "")) out.days = Number(value);
    else return { error: `unrecognized flag "--${key}${value === undefined ? "" : `=${value}`}"` };
  }
  return out;
}

// A stored row's routine. A row carrying a cycle id is the runner's, named by the last six
// characters of the trigger in that cycle's stamp so the runner's lanes read apart; any other row
// is named by the agent whose agent-log call swept its session LAST -- a session fact, not the
// routine's owner and not the agent that ran the transcript.
export function routineOf(row, stamps = new Map()) {
  if (!row.cycle_id) return String(row.swept_by ?? "").split(":")[0] || "unknown";
  const trig = /trig_[A-Za-z0-9]+/.exec(String(stamps.get(row.cycle_id) ?? ""));
  return trig ? `runner:${trig[0].slice(-6)}` : "runner";
}

// The lane a transcript ran in: one definition, in the library, because verdict() groups by it too.
export { laneOf };

// What was measured and what was not, counted from the first sweep the window holds. A runner lane
// is a trigger; a logged turn is tied to stored timing only through its cycle id (the log's
// visitor_id), because no stored column says which agent a transcript served.
export function coverage(stored, cycles, logged) {
  const firsts = stored.map(r => Date.parse(r.recorded_at)).filter(Number.isFinite);
  if (!firsts.length) return { since: null, lanes: [], agents: [], turns: 0, in_stored_cycle: 0, in_unstored_cycle: 0, no_cycle: 0 };
  const since = Math.min(...firsts);
  const has = new Set(stored.map(r => r.cycle_id).filter(Boolean));
  const stamps = new Map(cycles.map(c => [c.id, c.stamp]));
  // A session that chains cycles keeps ONE cycle id on its rows. A cycle with no row under its id
  // is counted by a stored fact, never guessed at: its start and end fall inside the span of a
  // stored main transcript of the same trigger, or they do not.
  const spans = stored.filter(r => r.kind === "main" && r.cycle_id)
    .map(r => ({ key: routineOf(r, stamps), from: Date.parse(r.first_at), to: Date.parse(r.last_at) }));
  const inSpan = (key, c) => Number.isFinite(Date.parse(c.ended_at)) && spans.some(s => s.key === key && s.from <= Date.parse(c.started_at) && Date.parse(c.ended_at) <= s.to);
  const inside = new Set();
  const lanes = new Map();
  for (const c of cycles) {
    if (!/trig_[A-Za-z0-9]+/.test(String(c.stamp ?? ""))) continue;
    if (Date.parse(c.started_at) < since && !has.has(c.id)) continue;
    const key = routineOf({ cycle_id: c.id }, stamps);
    const g = lanes.get(key) ?? { key, cycles: 0, stored: 0, did_not_run: 0, ran_in_span: 0, ran_outside: 0 };
    g.cycles += 1;
    if (has.has(c.id)) g.stored += 1; else if (c.outcome === "did_not_run") g.did_not_run += 1;
    else if (inSpan(key, c)) { g.ran_in_span += 1; inside.add(c.id); } else g.ran_outside += 1;
    lanes.set(key, g);
  }
  const agents = new Map();
  for (const l of logged) {
    if (!l.agent_id || Date.parse(l.created_at) < since) continue;
    const a = agents.get(l.agent_id) ?? { agent: l.agent_id, turns: 0, in_stored_cycle: 0, in_unstored_cycle: 0, no_cycle: 0 };
    a.turns += 1;
    if (!l.visitor_id) a.no_cycle += 1; else if (has.has(l.visitor_id) || inside.has(l.visitor_id)) a.in_stored_cycle += 1; else a.in_unstored_cycle += 1;
    agents.set(l.agent_id, a);
  }
  const list = [...agents.values()].sort((a, b) => a.agent.localeCompare(b.agent));
  const sum = k => list.reduce((n, a) => n + a[k], 0);
  return { since: new Date(since).toISOString(), lanes: [...lanes.values()].sort((a, b) => a.key.localeCompare(b.key)), agents: list,
    turns: sum("turns"), in_stored_cycle: sum("in_stored_cycle"), in_unstored_cycle: sum("in_unstored_cycle"), no_cycle: sum("no_cycle") };
}

const named = (agents, k) => agents.filter(a => a[k]).map(a => `${a.agent} ${a[k]}`).join(", ") || "none";

export function coverageLines(c) {
  if (!c.since) return ["MEASURED AND NOT: nothing is stored in this window, so nothing is said about any lane or agent"];
  const at = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(c.since));
  return [
    `RUNNER LANES SINCE THE FIRST STORED SWEEP (${at} Central) -- a cycle that did not run logs no agent turn, so nothing sweeps it; a session that chains cycles keeps one cycle id on its rows (AGT-697), so a cycle with no row under its id is counted by where its start and end fall`,
    ...(c.lanes.length ? c.lanes.map(g => `${g.key.padEnd(14)} cycles ${g.cycles}  stored ${g.stored}  did not run ${g.did_not_run}  ran inside a stored session of its trigger ${g.ran_in_span}  ran outside any ${g.ran_outside}`) : ["no runner cycle started in that time"]),
    `AGENT TURNS LOGGED SINCE THEN: ${c.turns} -- ${c.in_stored_cycle} in a cycle with stored timing (under its id, or inside a stored session of its trigger), ${c.in_unstored_cycle} in a cycle with none, ${c.no_cycle} outside any cycle`,
    `LOGGED IN A CYCLE WITH NO STORED TIMING: ${named(c.agents, "in_unstored_cycle")}`,
    `LOGGED OUTSIDE ANY CYCLE (nothing stored ties these to a session; not a claim they went unmeasured): ${named(c.agents, "no_cycle")}`,
  ];
}

const hourCT = iso => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "2-digit", hour12: false }).format(new Date(iso));

export function summarize(rows, key) {
  const groups = new Map();
  for (const r of rows) {
    const k = key(r);
    const g = groups.get(k) ?? { key: k, transcripts: 0, turns: 0, turn_s: 0, tool_s: 0, slow: 0, generating: 0, waiting: 0, max_s: 0, out: 0 };
    g.out += r.output_tokens ?? 0;
    g.transcripts += 1; g.turns += r.turns; g.turn_s += Math.round(r.turn_ms / 1000); g.tool_s += Math.round(r.tool_ms / 1000);
    g.slow += r.slow_turns; g.generating += r.slow_generating; g.waiting += r.slow_waiting;
    g.max_s = Math.max(g.max_s, Math.round((r.max_ms ?? 0) / 1000));
    groups.set(k, g);
  }
  return [...groups.values()].sort((a, b) => String(a.key).localeCompare(String(b.key)));
}

const line = (g, width = 14) => `${String(g.key).padEnd(width)} transcripts ${g.transcripts}  turns ${g.turns}  model ${g.turn_s}s  tools ${g.tool_s}s  slow ${g.slow} (generating ${g.generating}, waiting ${g.waiting})  longest ${g.max_s}s  output ${g.out} tok (${g.turn_s ? Math.round((g.out / g.turn_s) * 10) / 10 : "—"}/s)`;

// Where a session's wall time went, per routine, over sessions that stored a main transcript. A main
// transcript's first-to-last span is its own model turns plus its tool calls, and a sub-agent runs
// inside one of those calls -- so "tools" on a main line is mostly sub-agents writing.
export function timeSplit(rows, routine) {
  const bySession = new Map();
  for (const r of rows) bySession.set(r.session_id, [...(bySession.get(r.session_id) ?? []), r]);
  const groups = new Map();
  for (const list of bySession.values()) {
    const main = list.find(r => r.kind === "main");
    if (!main) continue;
    const key = routine(main);
    const g = groups.get(key) ?? { key, sessions: 0, wall_s: 0, own_s: 0, tool_s: 0, sub_transcripts: 0, sub_span_s: 0 };
    g.sessions += 1;
    g.wall_s += Math.round((Date.parse(main.last_at) - Date.parse(main.first_at)) / 1000);
    g.own_s += Math.round(main.turn_ms / 1000); g.tool_s += Math.round(main.tool_ms / 1000);
    for (const r of list) if (r.kind !== "main") { g.sub_transcripts += 1; g.sub_span_s += Math.round((Date.parse(r.last_at) - Date.parse(r.first_at)) / 1000); }
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

const pct = (part, whole) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");
export const splitLine = g => `${g.key.padEnd(14)} sessions ${g.sessions}  wall ${g.wall_s}s  own model turns ${g.own_s}s (${pct(g.own_s, g.wall_s)})  tool calls ${g.tool_s}s (${pct(g.tool_s, g.wall_s)}); its ${g.sub_transcripts} sub-agent transcript(s) span ${g.sub_span_s}s`;

export const speedLine = g => `${g.lane.padEnd(26)} alone ${g.alone.per_sec ?? "—"} over ${g.alone.turns} turn(s) | with another session live ${g.peers.per_sec ?? "—"} over ${g.peers.turns} turn(s)`;

// The transcripts verdict() set aside, named, so a set-aside is never a silent drop.
export function idleLine(rows) {
  const idle = rows.filter(idleRow);
  const hours = IDLE_TURN_MS / 3600000;
  if (!idle.length) return `SET ASIDE: none -- no stored transcript holds a turn of ${hours} h or longer`;
  return `SET ASIDE: ${idle.length} transcript(s) holding a turn of ${hours} h or longer -- a session left open, not a model at work; in no line of this report: ${idle.map(r => `${String(r.session_id).slice(0, 8)} ${r.transcript} (longest ${Math.round(r.max_ms / 1000)}s)`).join(", ")}`;
}

export const PAGE = 1000;

// Every row the query matches. PostgREST answers PAGE rows at most whatever limit is asked for, so
// one request is a sample; this asks again from the next offset until a page comes back short.
// The query must carry its own order= so the pages do not overlap.
export async function readAll(pathAndQuery, { env = process.env, fetchImpl = fetch } = {}) {
  const url = String(env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = String(env.SUPABASE_SERVICE_KEY ?? "").trim();
  if (!url || !key) return { error: "SUPABASE_URL or SUPABASE_SERVICE_KEY is not set" };
  const rows = [];
  for (;;) {
    const res = await fetchImpl(`${url}/rest/v1/${pathAndQuery}&limit=${PAGE}&offset=${rows.length}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!res.ok) return { error: `HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}` };
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return { rows };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) { console.error(`measure-routine-turns: ${args.error}`); process.exit(2); }
  const say = (obj, lines) => process.stdout.write(args.json ? `${JSON.stringify(obj)}\n` : `${lines.join("\n")}\n`);
  const rule = `slow = a model turn of ${SLOW_TURN_MS / 1000}s or longer; generating = ${WAIT_TOKENS_PER_SEC}+ output tokens per second in it, else waiting`;

  if (args.mode === "sweep") {
    const r = await sweep({ cycle: args.cycle, sweptBy: args.sweptBy });
    say(r, [`turn-timings: ${r.ok ? `recorded ${r.recorded}` : "not recorded"}${r.reason ? ` -- ${r.reason}` : ""}`]);
    return;
  }
  if (args.mode === "local") {
    const { rows, reason } = localRows({ cycle: args.cycle, sweptBy: args.sweptBy });
    say({ rows, reason }, [rule, ...summarize(rows, r => r.transcript).map(g => line(g)), ...(reason ? [`nothing measured -- ${reason}`] : [])]);
    return;
  }
  const since = new Date(Date.now() - args.days * 86400000).toISOString();
  const got = await readAll(`${TABLE}?select=*&first_at=gte.${since}&order=first_at.asc,session_id.asc,transcript.asc`);
  if (got.error) { console.error(`measure-routine-turns: ${got.error}`); process.exit(2); }
  const stored = got.rows;
  const kept = stored.filter(r => !idleRow(r));
  // Cycles and logged turns are read from the oldest stored row on, so every stored cycle's stamp is
  // in hand and the coverage counts start where measuring did (pattern:36). Neither read decides the
  // verdict: one that fails is said on its own line and the lanes it would have named read `runner`.
  const from = stored.length ? encodeURIComponent(stored[0].first_at) : null;
  const cycles = from ? await readAll(`runner_cycles?select=id,stamp,started_at,ended_at,outcome&started_at=gte.${from}&order=started_at.asc,id.asc`) : { rows: [] };
  const logged = from ? await readAll(`ai_activity_log?select=agent_id,visitor_id,created_at&call_source=eq.session&created_at=gte.${from}&order=created_at.asc,id.asc`) : { rows: [] };
  const stamps = new Map(cycles.error ? [] : cycles.rows.map(c => [c.id, c.stamp]));
  const v = verdict(stored);
  const routines = summarize(kept, r => routineOf(r, stamps));
  const lanes = summarize(kept, r => `${routineOf(r, stamps)} | ${laneOf(r)}`);
  const hours = summarize(kept, r => hourCT(r.first_at));
  const split = timeSplit(kept, r => routineOf(r, stamps));
  const idle = stored.filter(idleRow).map(r => ({ session_id: r.session_id, transcript: r.transcript, max_s: Math.round(r.max_ms / 1000) }));
  const unread = [cycles.error && `runner_cycles (${cycles.error})`, logged.error && `ai_activity_log (${logged.error})`].filter(Boolean);
  const cover = unread.length ? null : coverage(stored, cycles.rows, logged.rows);
  say({ ...v, days: args.days, routines, lanes, hours, split, idle, coverage: cover }, [
    rule,
    `window: last ${args.days} days; ${v.sessions} session(s), ${v.transcripts} transcript(s), ${v.turns} model turn(s)`,
    "BY ROUTINE -- a runner session by its cycle's trigger; any other session by the agent that logged LAST in it, which is not always the routine's owner",
    ...routines.map(g => line(g)),
    "BY LANE -- routine | main or subagent, and the model that served the transcript. Which agent a sub-agent transcript served is not stored; a main line's tools time includes the time its sub-agents ran",
    ...lanes.map(g => line(g, Math.max(...lanes.map(x => x.key.length)))),
    "BY HOUR STARTED (Central)", ...hours.map(g => line(g)),
    "WHERE A SESSION'S TIME GOES -- sessions that stored a main transcript; its wall time is its own model turns plus its tool calls, and a sub-agent runs inside one of those calls",
    ...split.map(splitLine),
    `WRITING SPEED -- output tokens per second of model time: ${v.speed.all ?? "—"} over every turn; below, per lane, alone | with another session live (never one figure across lanes: they write at different speeds)`,
    ...v.speed.lanes.map(speedLine),
    `WAITING TURNS PER 1,000: alone ${v.alone.per_1000 ?? "—"} over ${v.alone.turns} turn(s); with another session live ${v.peers.per_1000 ?? "—"} over ${v.peers.turns} turn(s)`,
    idleLine(stored),
    ...(cover ? coverageLines(cover) : [`MEASURED AND NOT: unreadable -- ${unread.join("; ")}`]),
    `VERDICT: ${v.verdict}${v.verdict === "not-enough-runs" ? ` -- ${v.sessions} of ${MIN_SESSIONS} sessions stored; no cause is named` : ` -- slow ${v.slow}: generating ${v.generating}, waiting ${v.waiting}`}`,
  ]);
  process.exit(v.verdict === "not-enough-runs" ? 3 : 0);
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  main().catch(e => { console.error(`measure-routine-turns: ${e.message}`); process.exit(2); });
}
