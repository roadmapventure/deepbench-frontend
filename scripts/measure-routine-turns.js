#!/usr/bin/env node
// DeepBench v7.0.1038 | scripts/measure-routine-turns.js | AGT-317
//
// Where a routine run's wall time goes, and which kind of slow it is. Read-only unless --sweep.
// The measuring and the one write live in scripts/lib/turn-timings.mjs; this file prints.
//
//   node scripts/measure-routine-turns.js            this session's transcripts, no database
//   node scripts/measure-routine-turns.js --sweep [--cycle=<runner_cycles.id>] [--swept-by=<text>]
//                                                    store them (scripts/agent-log.js does this itself)
//   node scripts/measure-routine-turns.js --report [--days=30]
//                                                    every stored run: per routine, per hour, one verdict
//   --json prints one object instead of lines.
//
// EXIT 0 a verdict was reached (or --sweep / the local read ran). EXIT 3 `not-enough-runs`: fewer
// than MIN_SESSIONS sessions are stored, so no cause is named -- that is an answer, not a failure.
// EXIT 2 the report could not be read (no credentials, or the database refused).

import path from "node:path";
import { fileURLToPath } from "node:url";
import { localRows, sweep, verdict, TABLE, MIN_SESSIONS, SLOW_TURN_MS, WAIT_TOKENS_PER_SEC } from "./lib/turn-timings.mjs";

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
// is named by the agent whose agent-log call swept it in.
export function routineOf(row, stamps = new Map()) {
  if (!row.cycle_id) return String(row.swept_by ?? "").split(":")[0] || "unknown";
  const trig = /trig_[A-Za-z0-9]+/.exec(String(stamps.get(row.cycle_id) ?? ""));
  return trig ? `runner:${trig[0].slice(-6)}` : "runner";
}

const hourCT = iso => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "2-digit", hour12: false }).format(new Date(iso));

export function summarize(rows, key) {
  const groups = new Map();
  for (const r of rows) {
    const k = key(r);
    const g = groups.get(k) ?? { key: k, transcripts: 0, turns: 0, turn_s: 0, tool_s: 0, slow: 0, generating: 0, waiting: 0, max_s: 0 };
    g.transcripts += 1; g.turns += r.turns; g.turn_s += Math.round(r.turn_ms / 1000); g.tool_s += Math.round(r.tool_ms / 1000);
    g.slow += r.slow_turns; g.generating += r.slow_generating; g.waiting += r.slow_waiting;
    g.max_s = Math.max(g.max_s, Math.round((r.max_ms ?? 0) / 1000));
    groups.set(k, g);
  }
  return [...groups.values()].sort((a, b) => String(a.key).localeCompare(String(b.key)));
}

const line = g => `${String(g.key).padEnd(14)} transcripts ${g.transcripts}  turns ${g.turns}  model ${g.turn_s}s  tools ${g.tool_s}s  slow ${g.slow} (generating ${g.generating}, waiting ${g.waiting})  longest ${g.max_s}s`;

async function read(pathAndQuery) {
  const url = String(process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = String(process.env.SUPABASE_SERVICE_KEY ?? "").trim();
  if (!url || !key) return { error: "SUPABASE_URL or SUPABASE_SERVICE_KEY is not set" };
  const res = await fetch(`${url}/rest/v1/${pathAndQuery}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) return { error: `HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}` };
  return { rows: await res.json() };
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
    say({ rows, reason }, [rule, ...summarize(rows, r => r.transcript).map(line), ...(reason ? [`nothing measured -- ${reason}`] : [])]);
    return;
  }
  const since = new Date(Date.now() - args.days * 86400000).toISOString();
  const stored = await read(`${TABLE}?select=*&first_at=gte.${since}&order=first_at.asc&limit=10000`);
  if (stored.error) { console.error(`measure-routine-turns: ${stored.error}`); process.exit(2); }
  // Who ran at all in the window, from the log itself (pattern:36) -- a routine that logged turns
  // and stored no timing is named, never silently absent.
  const logged = await read(`ai_activity_log?select=agent_id&call_source=eq.session&created_at=gte.${since}&limit=10000`);
  const cycles = await read(`runner_cycles?select=id,stamp&started_at=gte.${since}&limit=10000`);
  const stamps = new Map(cycles.error ? [] : cycles.rows.map(c => [c.id, c.stamp]));
  const v = verdict(stored.rows);
  const routines = summarize(stored.rows, r => routineOf(r, stamps));
  const measured = new Set(stored.rows.map(r => String(r.swept_by ?? "").split(":")[0]));
  const unmeasured = logged.error ? null : [...new Set(logged.rows.map(r => r.agent_id))].filter(a => a && !measured.has(a)).sort();
  say({ ...v, days: args.days, routines, hours: summarize(stored.rows, r => hourCT(r.first_at)), unmeasured }, [
    rule,
    `window: last ${args.days} days; ${v.sessions} session(s), ${v.transcripts} transcript(s), ${v.turns} model turn(s)`,
    "BY ROUTINE", ...routines.map(line),
    "BY HOUR STARTED (Central)", ...summarize(stored.rows, r => hourCT(r.first_at)).map(line),
    `WAITING TURNS PER 1,000: alone ${v.alone.per_1000 ?? "—"} over ${v.alone.turns} turn(s); with another session live ${v.peers.per_1000 ?? "—"} over ${v.peers.turns} turn(s)`,
    `LOGGED A TURN BUT STORED NO TIMING: ${unmeasured === null ? `unreadable (${logged.error})` : unmeasured.length ? unmeasured.join(", ") : "none"}`,
    `VERDICT: ${v.verdict}${v.verdict === "not-enough-runs" ? ` -- ${v.sessions} of ${MIN_SESSIONS} sessions stored; no cause is named` : ` -- slow ${v.slow}: generating ${v.generating}, waiting ${v.waiting}`}`,
  ]);
  process.exit(v.verdict === "not-enough-runs" ? 3 : 0);
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  main().catch(e => { console.error(`measure-routine-turns: ${e.message}`); process.exit(2); });
}
