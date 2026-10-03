#!/usr/bin/env node
// DeepBench v7.0.658 | scripts/db-pressure.js | AGT-237 (c) -- the runner asks the database how it
// is before it starts heavy work, and waits out an outage instead of working into it.
//
// WHY: on 2026-09-27 the 0.5 GB NANO instance ran ~500 MB into swap, iowait went from a healthy
// 5-25% to 80-95%, a 1-row UPDATE took 17-19 s and the project had to be restarted. Nothing in a
// cycle looked before it leapt. public.db_health_level() (migration agt237_db_health) grades the
// last 15 minutes of readings; this script is the one-call way a cycle reads that verdict.
//
// THE CONTRACT IS THE EXIT CODE:
//   --check                     one rpc/db_health_level call.
//                               0 green, 1 amber, 3 red / unsafe / any non-200 / no answer in 10 s.
//   --hold [--max-minutes=60]   waits while red or unsafe (a failed read counts as red), polling at
//                               5 s doubling to 120 s, one printed line per wait.
//                               0 released (green or amber), 4 still held at the cap.
//   2                           no credentials (SUPABASE_URL / SUPABASE_SERVICE_KEY), or bad args.
//
// runner-cycle.md step 7: `red`/`unsafe`, or the heartbeat failed or took > 10 s -> finish the step,
// run `--hold`; exit 4 -> close `failed`, last_step 'held: db_pressure'. run-all.js runs only after
// `--check` exits 0 or 1.

import path from "path";
import { fileURLToPath } from "url";

export const CHECK_TIMEOUT_MS = 10_000;
export const FIRST_WAIT_MS = 5_000;
export const MAX_WAIT_MS = 120_000;
export const DEFAULT_MAX_MINUTES = 60;

// Pure -- argv to a mode. Anything unrecognised is a usage error (exit 2), never a silent default.
export function parseArgs(argv) {
  const check = argv.includes("--check");
  const hold = argv.includes("--hold");
  if (check === hold) return { error: "exactly one of --check or --hold is required" };
  let maxMinutes = DEFAULT_MAX_MINUTES;
  const cap = argv.find(a => a.startsWith("--max-minutes="));
  if (cap !== undefined) {
    if (!hold) return { error: "--max-minutes only applies to --hold" };
    maxMinutes = Number(cap.slice("--max-minutes=".length));
    if (!Number.isFinite(maxMinutes) || maxMinutes <= 0) return { error: `--max-minutes must be a positive number, got ${cap}` };
  }
  const unknown = argv.filter(a => a !== "--check" && a !== "--hold" && !a.startsWith("--max-minutes="));
  if (unknown.length) return { error: `unknown argument(s): ${unknown.join(" ")}` };
  return { mode: check ? "check" : "hold", maxMinutes };
}

// Pure -- a level (or a failed read, level null) to --check's exit code.
export function checkCode(level) {
  if (level === "green") return 0;
  if (level === "amber") return 1;
  return 3; // red, unsafe, unknown, or no answer: fail closed (ARCHITECTURE.md §19o)
}

// Pure -- --hold waits only while the database is red or unsafe (or unreadable); amber releases.
export const holds = level => checkCode(level) === 3;

// Pure -- 5 s, 10 s, 20 s ... capped at 120 s.
export const nextWait = prev => (prev ? Math.min(prev * 2, MAX_WAIT_MS) : FIRST_WAIT_MS);

// One rpc. Never throws: a failure is { level: null, why } so every caller fails closed the same way.
export async function readLevel(env = process.env, doFetch = fetch, timeoutMs = CHECK_TIMEOUT_MS) {
  const base = String(env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_KEY;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await doFetch(`${base}/rest/v1/rpc/db_health_level`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
      signal: ctl.signal,
    });
    const text = await res.text();
    const ms = Date.now() - started;
    if (res.status !== 200) return { level: null, why: `HTTP ${res.status} in ${ms} ms`, ms };
    if (ms > timeoutMs) return { level: null, why: `answered after ${ms} ms (> ${timeoutMs} ms)`, ms };
    let rows;
    try { rows = JSON.parse(text); } catch { return { level: null, why: "unparseable answer", ms }; }
    const row = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
    if (!row || typeof row.level !== "string") return { level: null, why: "no db_health_level row", ms };
    return { level: row.level, reasons: row.reasons ?? [], age: row.age_minutes, readingAt: row.reading_at, ms };
  } catch (e) {
    const ms = Date.now() - started;
    return { level: null, why: e.name === "AbortError" ? `no answer in ${timeoutMs} ms` : e.message, ms };
  } finally {
    clearTimeout(timer);
  }
}

const describe = r =>
  r.level === null
    ? `unreadable (${r.why})`
    : `${r.level}${r.reasons?.length ? ` -- ${r.reasons.join("; ")}` : ""}` +
      `${r.age !== undefined && r.age !== null ? ` (newest reading ${r.age} min old)` : ""}`;

export async function main(argv, {
  env = process.env, doFetch = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)),
  now = () => Date.now(), out = s => process.stdout.write(`${s}\n`),
} = {}) {
  const args = parseArgs(argv);
  if (args.error) { out(`db-pressure: ${args.error}`); return 2; }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    out("db-pressure: SUPABASE_URL and SUPABASE_SERVICE_KEY are required -- nothing was read");
    return 2;
  }

  if (args.mode === "check") {
    const r = await readLevel(env, doFetch);
    const code = checkCode(r.level);
    out(`db-pressure: ${describe(r)} -> exit ${code}`);
    return code;
  }

  const deadline = now() + args.maxMinutes * 60_000;
  let wait = 0;
  for (;;) {
    const r = await readLevel(env, doFetch);
    if (!holds(r.level)) { out(`db-pressure: released -- ${describe(r)}`); return 0; }
    const left = deadline - now();
    if (left <= 0) { out(`db-pressure: still held after ${args.maxMinutes} min -- ${describe(r)} -> exit 4`); return 4; }
    wait = Math.min(nextWait(wait), left);
    out(`db-pressure: holding -- ${describe(r)}; next look in ${Math.round(wait / 1000)} s`);
    await sleep(wait);
  }
}

// Importing this module for its exports must never run the CLI (SES-176). exitCode, not exit():
// process.exit() while fetch's socket is still closing trips a libuv assertion on Windows
// (src\win\async.c line 94) and the process dies 127 instead of with the code above.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = await main(process.argv.slice(2));
}
