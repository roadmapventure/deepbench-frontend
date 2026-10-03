#!/usr/bin/env node
// DeepBench v7.0.531 | scripts/cycle-heartbeat.js | SES-423 slice 2 -- THE BUILD REPORTS THAT IT
// IS STILL ALIVE, so step 0b's 20-minute tripwire stops reading a long build as a frozen one.
//
// MEASURED, NOT ARGUED: `runner_cycles.heartbeat_at` carried 13 `stall_notified_at` rows all-time
// and NINE ended `shipped` -- e.g. `0e57cedd`, started 03:16:50Z, "stalled" 03:53:12Z, shipped
// `v7.0.502` 03:58:17Z. Only the orchestrator wrote the column and `grep -rl heartbeat scripts lib`
// returned 0, so step 7 -- the longest step, and the one a sub-agent owns -- had no way to say
// "still working". Each of those nine pushes sent John to a window where nothing was wrong.
//
// EXIT CODES ARE THE CONTRACT and 0 is the one that must never be cheap: a heartbeat that did not
// land is worse than none, because the next sweep reads the old timestamp and believes it.
//   2 -- cannot run: `--cycle` missing/not a uuid, `--step` missing/blank. Nothing attempted.
//   1 -- ran and did not land: env unset, non-2xx, or 200 over ZERO rows (a `--cycle` naming no row
//        answers `[]` with HTTP 200 -- the silent no-op `return=representation` exists to expose,
//        the `scripts/settle-ship.js:274` read-back shape).
//   0 -- landed; prints the row the server echoed back, never the values we sent.

import path from "path";
import { fileURLToPath } from "url";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Pure -- the guard the test drives directly, both directions.
export function parseArgs(argv) {
  const get = name => {
    const hit = argv.find(a => a.startsWith(`--${name}=`));
    return hit === undefined ? undefined : hit.slice(name.length + 3);
  };
  const cycle = get("cycle");
  const step = get("step");
  if (!cycle) return { error: "--cycle=<uuid> is required -- a heartbeat with no cycle names nothing" };
  if (!UUID.test(cycle)) return { error: `--cycle=${cycle} is not a uuid` };
  if (!step || !step.trim()) return { error: "--step=<text> is required and must not be blank -- the sweep prints last_step at John" };
  return { cycle, step: step.trim() };
}

// Pure -- 0 rows back is a FAILURE, not an empty success. Asserted on its own in the guard.
export function landed(rows) {
  return Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
}

export async function heartbeat(argv, env = process.env, doFetch = fetch) {
  const args = parseArgs(argv);
  if (args.error) return { code: 2, message: `cycle-heartbeat: ${args.error}` };

  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_KEY;
  const missing = [!base && "SUPABASE_URL", !key && "SUPABASE_SERVICE_KEY"].filter(Boolean).join(", ");
  if (missing) return { code: 1, message: `cycle-heartbeat: ${missing} unset -- the heartbeat did NOT land` };

  const at = new Date().toISOString();
  let res;
  try {
    res = await doFetch(`${base.replace(/\/+$/, "")}/rest/v1/runner_cycles?id=eq.${args.cycle}`, {
      method: "PATCH",
      headers: { apikey: key, Authorization: `Bearer ${key}`,
        "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ heartbeat_at: at, last_step: args.step }),
    });
  } catch (e) {
    return { code: 1, message: `cycle-heartbeat: could not reach Supabase -- ${e.message}` };
  }
  const text = await res.text().catch(() => "");
  if (!res.ok) return { code: 1, message: `cycle-heartbeat: HTTP ${res.status} ${res.statusText} -- ${text}` };

  let rows = null;
  try { rows = JSON.parse(text); } catch { /* landed() reports it */ }
  const row = landed(rows);
  if (!row) return { code: 1, message: `cycle-heartbeat: PATCH matched no row for ${args.cycle} -- nothing was written` };
  return { code: 0, message: `heartbeat ${row.id} ${row.last_step} ${row.heartbeat_at}` };
}

// SES-176: importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const { code, message } = await heartbeat(process.argv.slice(2));
  (code === 0 ? process.stdout : process.stderr).write(`${message}\n`);
  process.exit(code);
}
