#!/usr/bin/env node
// DeepBench v7.0.655 | scripts/cycle-heartbeat.js | AGT-188 -- STEP 9's RECORD STOPS BEING FREE TEXT.
// MEASURED, NOT ARGUED: `pg_constraint` on `runner_cycles` returns two CHECKs, `outcome` and
// `trigger` -- `last_step` has NONE -- and the 41 step-9 rows of the last 20 hours carry SEVEN
// distinct strings ("9 -- record written, tail closing", "9 -- tail complete", "step 9 -- record
// written, tail complete", "9 -- serial tail", "9 -- tail: row closed, lease next", "9 -- tail
// complete (gated before build)", "9 -- record written, row closed"). `runner-cycle.md` prescribes
// no step-9 string at all, and line 34 below -- the ONE sanctioned writer of the column -- validated
// only that it was non-blank. So nothing downstream could grade the tail: "closed" and "deferred"
// were spelled a dozen ways by the same runner.
// THE FIX IS DERIVATION, NOT A LONGER INSTRUCTION (pattern:10 -- when a correct value already exists
// deterministically, no model may be put in charge of it). `--tail` counts the rows the tail is
// actually about -- `runner_skips` still unresolved AND still unbriefed -- and `tailStep(n)` turns
// that one number into exactly one of two strings. A cycle no longer writes step 9's record; it
// asks for it. `--step` and `--tail` are mutually exclusive, and `--step` now REFUSES anything
// matching /^(step\s*)?9\b/ -- all seven live strings above -- naming `--tail` in the refusal, so
// the old habit fails loudly instead of adding an eighth spelling.
// WHY 0 ROWS IS A SUCCESS HERE AND A FAILURE BELOW, which looks inconsistent and is not: the PATCH's
// 0 rows means the write did not land (the row does not exist), while the COUNT's 0 rows is the
// answer -- zero unbriefed skips IS a complete tail. The two zeros are different questions.
// Guarded by tests/regression/agt-188-tail-record.test.mjs.
//
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
//   2 -- cannot run: `--cycle` missing/not a uuid, `--step` missing/blank, `--step` naming step 9
//        (use `--tail`), or `--step` and `--tail` both given. Nothing attempted.
//   1 -- ran and did not land: env unset, non-2xx, or 200 over ZERO rows (a `--cycle` naming no row
//        answers `[]` with HTTP 200 -- the silent no-op `return=representation` exists to expose,
//        the `scripts/settle-ship.js:274` read-back shape).
//   0 -- landed; prints the row the server echoed back, never the values we sent.

import path from "path";
import { fileURLToPath } from "url";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// AGT-188 -- step 9's own record is DERIVED, so a hand-written one is refused here rather than
// stored. Both live shapes are covered: "9 -- ..." and "step 9 -- ...".
export const STEP_NINE = /^(step\s*)?9\b/;

// AGT-188 -- Pure, and the ONLY home of step 9's two strings. `n` is the count of `runner_skips`
// rows still unresolved AND still unbriefed at the tail. Zero is the complete tail; anything else
// is a tail that deferred the (5b) stamp because nothing was published, which is the ordinary
// unattended case and must read as a state, not as an absence.
export function tailStep(n) {
  const k = Number(n);
  return k === 0
    ? "9 \u2014 tail complete: 0 skip rows unbriefed"
    : `9 \u2014 tail deferred: ${k} skip rows unbriefed (no publish stamped)`;
}

// Pure -- the guard the test drives directly, both directions.
export function parseArgs(argv) {
  const get = name => {
    const hit = argv.find(a => a.startsWith(`--${name}=`));
    return hit === undefined ? undefined : hit.slice(name.length + 3);
  };
  const cycle = get("cycle");
  const step = get("step");
  const tail = argv.includes("--tail");
  if (!cycle) return { error: "--cycle=<uuid> is required -- a heartbeat with no cycle names nothing" };
  if (!UUID.test(cycle)) return { error: `--cycle=${cycle} is not a uuid` };
  if (tail && step !== undefined) {
    return { error: "--tail and --step are mutually exclusive -- --tail DERIVES step 9's record, so a --step beside it is the hand-written string this refuses" };
  }
  if (tail) return { cycle, tail: true };
  if (!step || !step.trim()) return { error: "--step=<text> is required and must not be blank -- the sweep prints last_step at John" };
  if (STEP_NINE.test(step.trim())) {
    return { error: `--step=${step.trim()} is step 9's own record, and step 9 does not hand-write it: use --tail, which derives the one canonical string from the unbriefed skip count` };
  }
  return { cycle, step: step.trim(), tail: false };
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

  const root = base.replace(/\/+$/, "");
  const auth = { apikey: key, Authorization: `Bearer ${key}` };

  // AGT-188 -- `--tail` derives the step instead of trusting one. The count is the fact step 9 is
  // about; a count that could not be read writes NOTHING, because a guessed tail string is exactly
  // the free text this replaced.
  let step = args.step;
  if (args.tail) {
    let cres;
    try {
      cres = await doFetch(`${root}/rest/v1/runner_skips?resolved_at=is.null&briefed_at=is.null&select=id`, { headers: auth });
    } catch (e) {
      return { code: 1, message: `cycle-heartbeat: could not count the unbriefed skip rows -- ${e.message}` };
    }
    const ctext = await cres.text().catch(() => "");
    if (!cres.ok) return { code: 1, message: `cycle-heartbeat: HTTP ${cres.status} ${cres.statusText} counting runner_skips -- ${ctext}` };
    let crows = null;
    try { crows = JSON.parse(ctext); } catch { /* reported on the next line */ }
    if (!Array.isArray(crows)) {
      return { code: 1, message: "cycle-heartbeat: the unbriefed skip count did not parse -- step 9's record was NOT derived and nothing was written" };
    }
    step = tailStep(crows.length);
  }

  const at = new Date().toISOString();
  let res;
  try {
    res = await doFetch(`${root}/rest/v1/runner_cycles?id=eq.${args.cycle}`, {
      method: "PATCH",
      headers: { ...auth, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ heartbeat_at: at, last_step: step }),
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
