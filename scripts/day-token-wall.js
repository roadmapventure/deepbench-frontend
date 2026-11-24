#!/usr/bin/env node
// DeepBench v7.0.1115 | scripts/day-token-wall.js | AGT-321 -- the day token wall, graded by one
// script instead of by each cycle's own arithmetic (docs/runbooks/runner-cycle.md step 3).
//
// WHY. Step 3 told every cycle to "sum today's est_tokens_dev + est_tokens_qa" by hand. A NULL in
// either column means UNMEASURED (step 9, SES-409 / SES-386) and a SUM reads it as 0, so a day on
// which no cycle took a reading graded itself free. Measured 2026-11-24: 6 of 6 cycles that ran
// that day closed with both columns NULL and the wall read 0 of 196,000,000; over the 14 days
// before it, 176 of 183 cycles that ran carried at least one NULL.
//
// THE RULE. A cycle that RAN -- ended, outcome not did_not_run -- with a NULL in either column is
// NOT KNOWN, and the wall stands on not-known (ARCHITECTURE.md 19v: absence fails closed).
// A reading that is there still counts: every number on today's rows is summed first, so a day
// already at its cap says "spent", the stronger fact.
//
// JOHN'S ONE-DAY NUMBER STILL OPENS IT. cap_source `override` is an unexpired budget_override with
// max_tokens (register B32, "keep sessions going"): under it the unmeasured cycles are named in the
// output and the wall is clear until the measured sum reaches that number.
//
// THE CAP IS PASSED IN. public.resolve_day_token_cap() is its one home; this script never reads it.
//
// WHAT THIS DOES NOT DO. It does not grade a cycle still running (ended_at NULL -- register B42's
// named slack), it does not measure a did_not_run row's own small spend, and it takes no reading:
// the readings are step 9's.
//
// Exit 0 clear -- 1 the wall stands (spent, or not known) -- 2 could not read. Exit 2 is NEVER a pass.

import { pathToFileURL } from "url";

export const DAY_ZONE = "America/Chicago";   // John's clock (directive 1d01ea85, step 3).
export const LOOKBACK_HOURS = 30;            // one Chicago day is at most 25 hours long.

const DAY_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: DAY_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

// Pure. The America/Chicago calendar day an instant falls on, as YYYY-MM-DD.
export function chicagoDay(ms) {
  return DAY_FMT.format(new Date(ms));
}

const known = v => typeof v === "number" && Number.isFinite(v);
const short = id => String(id).slice(0, 8);

// Pure. `cycles` are runner_cycles rows {id, started_at, ended_at, outcome, est_tokens_dev, est_tokens_qa}.
export function gradeDayTokenWall({ cycles, dayCap, capSource, nowMs }) {
  const cap = Number(dayCap);
  if (dayCap === null || dayCap === undefined || dayCap === "" || !Number.isFinite(cap) || cap <= 0) {
    return { exitCode: 2, verdict: "cannot-run", reason: "--day-cap must be resolve_day_token_cap()'s day_cap, a positive number" };
  }
  if (!Array.isArray(cycles)) {
    return { exitCode: 2, verdict: "cannot-run", reason: "today's runner_cycles rows were not read" };
  }
  const day = chicagoDay(nowMs);
  const today = cycles.filter(c => Number.isFinite(Date.parse(c.started_at)) && chicagoDay(Date.parse(c.started_at)) === day);
  const measuredTokens = today.reduce((sum, c) =>
    sum + (known(c.est_tokens_dev) ? c.est_tokens_dev : 0) + (known(c.est_tokens_qa) ? c.est_tokens_qa : 0), 0);
  const ran = today.filter(c => c.ended_at && c.outcome !== "did_not_run");
  const unmeasured = ran.filter(c => !known(c.est_tokens_dev) || !known(c.est_tokens_qa)).map(c => c.id);
  const facts = { day, dayCap: cap, capSource: capSource || null, measuredTokens, ranCount: ran.length, unmeasured };
  const n = cap.toLocaleString("en-US");
  const m = measuredTokens.toLocaleString("en-US");
  const who = unmeasured.map(short).join(", ");

  if (measuredTokens >= cap) {
    return { ...facts, exitCode: 1, verdict: "spent",
      reason: `runner token share for the day spent (${m} measured of ${n})` };
  }
  if (unmeasured.length === 0) {
    return { ...facts, exitCode: 0, verdict: "clear",
      reason: `${m} measured of ${n}; all ${ran.length} cycle(s) that ran today carry a reading` };
  }
  if (capSource === "override") {
    return { ...facts, exitCode: 0, verdict: "clear-on-override",
      reason: `${m} measured of your one-day ${n}; ${unmeasured.length} of ${ran.length} cycle(s) that ran today `
        + `carry no token reading (${who}) and your one-day number covers them` };
  }
  return { ...facts, exitCode: 1, verdict: "not-known",
    reason: `day token spend not known: ${unmeasured.length} of ${ran.length} cycle(s) that ran today closed with no `
      + `token reading (${who}), so ${m} of ${n} is a floor, never the spend` };
}

export async function fetchCycles(base, key, nowMs, fetchImpl = fetch) {
  const since = new Date(nowMs - LOOKBACK_HOURS * 3600 * 1000).toISOString();
  const url = `${String(base).replace(/\/+$/, "")}/rest/v1/runner_cycles`
    + `?select=id,started_at,ended_at,outcome,est_tokens_dev,est_tokens_qa&started_at=gte.${since}`
    + `&order=started_at.asc&limit=2000`;
  let res;
  try {
    res = await fetchImpl(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  } catch (e) {
    return { error: `could not reach the Supabase REST endpoint: ${e.message}` };
  }
  if (!res.ok) return { error: `Supabase REST returned HTTP ${res.status} reading runner_cycles` };
  try {
    const rows = await res.json();
    return Array.isArray(rows) ? { cycles: rows } : { error: "runner_cycles did not answer with a list" };
  } catch (e) {
    return { error: `unparseable JSON reading runner_cycles: ${e.message}` };
  }
}

function arg(name) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit === undefined ? undefined : hit.slice(name.length + 3);
}

async function main() {
  const finish = v => {
    process.stdout.write(process.argv.includes("--json") ? JSON.stringify(v) + "\n" : `day-token-wall: ${v.verdict} -- ${v.reason}\n`);
    process.exitCode = v.exitCode;
  };
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return finish({ exitCode: 2, verdict: "cannot-run", reason: "SUPABASE_URL / SUPABASE_SERVICE_KEY is not set in this process's environment" });
  }
  const nowMs = Date.now();
  const got = await fetchCycles(url, key, nowMs);
  if (got.error) return finish({ exitCode: 2, verdict: "cannot-run", reason: got.error });
  return finish(gradeDayTokenWall({ cycles: got.cycles, dayCap: arg("day-cap"), capSource: arg("cap-source"), nowMs }));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
