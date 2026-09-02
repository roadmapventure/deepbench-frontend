#!/usr/bin/env node
// DeepBench v7.0.376 | scripts/check-token-wall-binding.js | SES-161
// FEATURE: SES-161 -- "the token wall governs the runner on a number nobody has ever checked
// against the platform's own usage figures." runner_cycles.est_tokens_dev / est_tokens_qa are the
// ONLY input to the subscription-token wall (runner-cycle.md step 3), every value in them is a
// cycle's own hand-estimate, and until this ship nothing had ever compared them to a figure the
// platform produced. This is that comparison, and it needs no platform usage block -- see below.
//
// -- THE TICKET'S OWN CANDIDATE FIRST STEP IS DEAD, MEASURED RATHER THAN ASSUMED ------------
// SES-161 proposes "have one cycle read get_session at open and at close". Measured live at this
// ship, 2026-09-02T15:10Z, by the cycle that shipped this file: mcp__Claude_Code_Remote__get_session
// returns NO usage block at all any more -- external_metadata carries container_cc_version,
// current_branches, last_served_model and rate_limit_info {status, rateLimitType, resetsAt}, and not
// one token count. The 2026-08-23 reading the ticket quotes (cache_read_tokens 11,614,849 etc.)
// cannot be reproduced, so the ticket's (b) -- "can get_session's usage block be made to report
// live?" -- is answered NO on today's platform, and the calibration had to come from somewhere else.
//
// -- THE PLATFORM FIGURE THAT DOES EXIST IS JOHN'S METER -----------------------------------
// runner_usage_readings.all_models_pct is a number the PLATFORM produced and John typed in. While he
// is asleep the runner is the only thing spending, so a night -> morning bracket is a clean window
// in which the meter's movement and the runner's own est_tokens describe THE SAME WORK. Their ratio
// (tokens_per_pct) is therefore a property of John's PLAN, not of the work done that night: if
// est_tokens tracked the meter, the rate would be near-constant across brackets. Measured on all
// four clean brackets stored at this ship it is NOT:
//
//     2026-08-23  32% -> 37%   13,255,000 est / 5 pct   = 2,651,000 tokens/pct
//     2026-08-24  60% -> 65%   12,927,000 est / 5 pct   = 2,585,400
//     2026-08-25  84% -> 92%    7,363,000 est / 8 pct   =   920,375
//     2026-08-29  17% -> 29%   27,710,000 est / 12 pct  = 2,309,167
//
// A 2.88x spread across four windows that should all report one constant. That IS the check the
// ticket says has never been made, and it says est_tokens and the meter are not the same quantity.
//
// -- THE SPREAD IS REPORTED, NEVER GRADED, AND THAT IS DELIBERATE --------------------------
// There is no principled number at which a spread becomes "too wide", and this codebase has paid
// repeatedly for constants a cycle chose (SES-146's "a column, not a literal", twice). So the spread
// is OUTPUT. The VERDICT is a separate question whose every input is a stored row:
//
//     can the day token cap brake anything before the weekly rest wall does?
//
// Convert the day cap into percent-of-weekly-meter through a bracket's rate (capPct = cap / rate)
// and compare it against the remaining weekly headroom (100 - all_models_pct) from the freshest
// reading. If capPct >= headroom the cap cannot be reached before the rest wall fires, so the day
// cap is not a brake -- it is decoration. At this ship, with John's standing 196M box: 73.9% of a
// weekly meter on the most generous bracket and 213% on the least, against 37% headroom. The day
// cap has never been capable of stopping a cycle.
//
// THE ALERT USES THE MOST GENEROUS BRACKET (the HIGHEST tokens_per_pct, i.e. the SMALLEST capPct),
// so a non-binding verdict means non-binding even on the reading most favourable to the wall. The
// fail direction is away from alerting -- same asymmetry check-deploy-serving.js draws for a deploy
// probe and check-cycle-cadence.js for an unmeasurable board.
//
// -- THE DAY CAP IS PASSED IN, NEVER RESOLVED HERE -----------------------------------------
// public.resolve_day_token_cap() is the ONE home of the five-rung cap ladder (runner-cycle.md step
// 3) and this script must not become a second one -- that is the two-homes defect the runbook
// records eight times over. The cycle reads the resolver and hands the number to --day-cap, exactly
// as rollback-on-red.js takes its CI conclusion by --jobs rather than fetching it.
//
// -- UNKNOWN IS NOT AN ALERT ---------------------------------------------------------------
// Fewer than TWO usable brackets is exit 2, never 1: one rate is a number, not an agreement, and a
// spread needs two windows to exist at all. An absent reading, a non-positive meter delta, a bracket
// wider than 24h and an empty window are all SES-128's own guards, reused rather than re-derived.
//
// IT REPORTS AND NEVER ACTS. No push, no write, no routine edit -- the push is the CYCLE's, for the
// same reason rollback-on-red.js never reaches past the notification gate (the SES-019 shape).
//
// Exit 0 the cap can bind -- 1 the cap cannot bind before the rest wall -- 2 could not run.
// Exit 2 is NEVER a pass.

import { pathToFileURL } from "url";

// Named rather than written as literals at the call site. See the header for why each is this value.
export const MAX_BRACKET_HOURS = 24;   // SES-128's own guard: a wider window is not runner-only.
export const MIN_BRACKETS = 2;         // one rate is a number; agreement needs two.
export const WINDOW_DAYS = 30;         // how far back readings and cycles are scanned.

const MS_PER_HOUR = 3600 * 1000;

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const JSON_OUT = process.argv.includes("--json");

// ---------------------------------------------------------------------------
// Pure logic -- exported so the guard exercises every branch with no network.
// ---------------------------------------------------------------------------

// Every clean night -> morning bracket, with the rate each one implies. A reading with no slot never
// brackets a window (SES-128): it is still a real reading for the rest wall and the staleness check,
// it simply cannot calibrate, and slotting one on the resemblance of its clock time would
// manufacture a pair John never declared.
export function bracketsFrom(readings, cycles) {
  const rows = (readings || [])
    .map(r => ({ ...r, ms: Date.parse(r.taken_at), pct: Number(r.all_models_pct) }))
    .filter(r => Number.isFinite(r.ms) && Number.isFinite(r.pct))
    .sort((a, b) => a.ms - b.ms);

  const spend = (fromMs, toMs) => (cycles || []).reduce((sum, c) => {
    const t = Date.parse(c.started_at);
    if (!Number.isFinite(t) || t <= fromMs || t > toMs) return sum;
    // Number(null) is 0 and would read an UNKNOWN as the safest possible number -- the SES-47
    // defect. A cycle with no estimate contributes nothing AND is counted as unpriced.
    const dev = typeof c.est_tokens_dev === "number" ? c.est_tokens_dev : Number(c.est_tokens_dev);
    const qa = typeof c.est_tokens_qa === "number" ? c.est_tokens_qa : Number(c.est_tokens_qa);
    return sum + (Number.isFinite(dev) ? dev : 0) + (Number.isFinite(qa) ? qa : 0);
  }, 0);

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const night = rows[i - 1];
    const morning = rows[i];
    if (night.slot !== "night" || morning.slot !== "morning") continue;
    const hours = (morning.ms - night.ms) / MS_PER_HOUR;
    if (!(hours > 0) || hours > MAX_BRACKET_HOURS) continue;
    const deltaPct = morning.pct - night.pct;
    if (!(deltaPct > 0)) continue;                    // a reset or a rolled-over week
    const estTokens = spend(night.ms, morning.ms);
    if (!(estTokens > 0)) continue;                   // an empty window calibrates nothing
    out.push({
      nightIso: new Date(night.ms).toISOString(),
      morningIso: new Date(morning.ms).toISOString(),
      fromPct: night.pct, toPct: morning.pct, deltaPct,
      hours: Math.round(hours * 100) / 100,
      estTokens,
      tokensPerPct: Math.round((estTokens / deltaPct) * 100) / 100,
    });
  }
  return out;
}

// The number SES-161 says nobody has ever looked at. Reported, never graded -- there is no
// principled line at which a spread becomes "too wide", and inventing one is how a measurement
// turns back into an opinion.
export function spreadOf(brackets) {
  if (!brackets || brackets.length < MIN_BRACKETS) return null;
  const rates = brackets.map(b => b.tokensPerPct);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  return {
    minTokensPerPct: min,
    maxTokensPerPct: max,
    ratio: Math.round((max / min) * 100) / 100,
    n: brackets.length,
    // If est_tokens tracked the meter this would be 1: the rate is a property of John's plan, not
    // of what the runner happened to build that night.
    note: "a rate that varies across clean runner-only windows is est_tokens failing to track the "
        + "meter -- the windows differ in work done, not in what a percent of the plan is worth",
  };
}

export function verdictFor(brackets, dayCap, latestReading, capSource) {
  const spread = spreadOf(brackets);
  // Number(null) is 0 -- a FINITE, NON-NEGATIVE number, so a missing meter reading would present as
  // "0% spent, a whole week of headroom", which is the safest-possible-number defect (SES-47). The
  // presence test therefore comes BEFORE any coercion, here as in every probe of this family.
  const rawPct = latestReading == null ? undefined : latestReading.all_models_pct;
  const pct = rawPct === null || rawPct === undefined || rawPct === "" ? NaN : Number(rawPct);
  const cap = typeof dayCap === "number" ? dayCap : Number(dayCap);

  if (!brackets || brackets.length < MIN_BRACKETS) {
    return {
      verdict: "cannot-run", exitCode: 2, brackets: brackets || [], spread: null, conversions: [],
      reason: `only ${(brackets || []).length} clean night->morning bracket(s) in the trailing `
            + `${WINDOW_DAYS}d -- ${MIN_BRACKETS} are needed before est_tokens can be compared to `
            + `the meter at all, and one rate is a number rather than an agreement`,
    };
  }
  if (!Number.isFinite(cap) || cap <= 0) {
    return {
      verdict: "cannot-run", exitCode: 2, brackets, spread, conversions: [],
      reason: "no usable --day-cap was passed in; the cap ladder lives in "
            + "public.resolve_day_token_cap() and is never resolved here (one home)",
    };
  }
  if (!Number.isFinite(pct)) {
    return {
      verdict: "cannot-run", exitCode: 2, brackets, spread, conversions: [],
      reason: "no usable meter reading, so the remaining weekly headroom is unknown -- and an "
            + "unknown headroom is not a wide one",
    };
  }

  const headroomPct = Math.round((100 - pct) * 100) / 100;
  const conversions = brackets
    .map(b => ({
      bracket: `${b.nightIso} -> ${b.morningIso}`,
      tokensPerPct: b.tokensPerPct,
      capPctOfWeek: Math.round((cap / b.tokensPerPct) * 100) / 100,
    }))
    .sort((a, b) => a.capPctOfWeek - b.capPctOfWeek);

  // The MOST GENEROUS conversion: the highest rate, so the smallest slice of the meter the cap
  // represents. Alerting only when even this one is non-binding is the fail-away-from-acting
  // direction every probe in this family takes.
  const best = conversions[0];
  const binding = best.capPctOfWeek < headroomPct;

  return {
    verdict: binding ? "wall-binding" : "wall-non-binding",
    exitCode: binding ? 0 : 1,
    brackets, spread, conversions,
    headroomPct, dayCap: cap, capSource: capSource || null,
    mostGenerous: best,
    reason: binding
      ? `the ${cap.toLocaleString("en-US")}-token day cap (${capSource || "source not stated"}) is `
        + `${best.capPctOfWeek}% of a weekly meter on the most generous of ${brackets.length} `
        + `brackets, against ${headroomPct}% headroom left -- it can be reached, so it can brake`
      : `the ${cap.toLocaleString("en-US")}-token day cap (${capSource || "source not stated"}) is `
        + `${best.capPctOfWeek}% of a weekly meter even on the most generous of ${brackets.length} `
        + `brackets, against ${headroomPct}% headroom left -- the weekly rest wall always fires `
        + `first, so the day cap is not a brake`,
  };
}

// One report per (cap, reading) pair. A cap John has not changed against a reading he has not
// retaken is the SAME finding, so re-reporting it every cycle is record_skip()'s skip_count boundary
// arriving here: an alarm received eight times a day stops being read.
export function suppressionKey(v) {
  if (!v || v.exitCode !== 1) return null;
  return `TOKEN WALL NON-BINDING (cap ${v.dayCap} vs meter ${100 - v.headroomPct}%)`;
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

export async function fetchInputs(base, key, sinceIso, fetchImpl = fetch) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const root = String(base).replace(/\/+$/, "");
  const out = {};
  for (const [name, q] of [
    ["readings", `runner_usage_readings?select=taken_at,slot,all_models_pct&taken_at=gte.${sinceIso}`
               + `&order=taken_at.asc&limit=2000`],
    ["cycles", `runner_cycles?select=started_at,est_tokens_dev,est_tokens_qa&started_at=gte.${sinceIso}`
             + `&order=started_at.asc&limit=5000`],
  ]) {
    let res;
    try {
      res = await fetchImpl(`${root}/rest/v1/${q}`, { headers });
    } catch (e) {
      return { error: `could not reach the Supabase REST endpoint: ${e.message}` };
    }
    if (!res.ok) {
      return { error: `Supabase REST returned HTTP ${res.status} ${res.statusText} reading ${name}` };
    }
    try {
      out[name] = await res.json();
    } catch (e) {
      return { error: `Supabase REST returned unparseable JSON reading ${name}: ${e.message}` };
    }
  }
  const readings = out.readings || [];
  return { readings, cycles: out.cycles || [], latestReading: readings[readings.length - 1] || null };
}

function finish(payload) {
  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(payload) + "\n");
  } else {
    process.stdout.write(`check-token-wall-binding: ${payload.verdict} -- ${payload.reason}\n`);
    for (const b of payload.brackets || []) {
      process.stdout.write(`  ${b.nightIso} -> ${b.morningIso}  ${b.fromPct}% -> ${b.toPct}%  `
                         + `${b.estTokens.toLocaleString("en-US")} est  = ${b.tokensPerPct} tokens/pct\n`);
    }
    if (payload.spread) {
      process.stdout.write(`  spread: ${payload.spread.ratio}x  `
                         + `(${payload.spread.minTokensPerPct} .. ${payload.spread.maxTokensPerPct} `
                         + `tokens/pct over ${payload.spread.n} brackets)\n`);
    }
    if (payload.suppressionKey) process.stdout.write(`  marker: ${payload.suppressionKey}\n`);
  }
  process.exitCode = payload.exitCode;
  return payload;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    const missing = [!url && "SUPABASE_URL", !key && "SUPABASE_SERVICE_KEY"].filter(Boolean).join(", ");
    return finish({ exitCode: 2, verdict: "cannot-run", brackets: [], spread: null, conversions: [],
      reason: `${missing} is not set in this process's environment (read by name from runner_secrets)` });
  }
  const windowDays = Number(arg("window-days", String(WINDOW_DAYS)));
  const sinceIso = new Date(Date.now() - windowDays * 24 * MS_PER_HOUR).toISOString();

  const got = await fetchInputs(url, key, sinceIso);
  if (got.error) {
    return finish({ exitCode: 2, verdict: "cannot-run", brackets: [], spread: null, conversions: [],
      reason: got.error });
  }

  const brackets = bracketsFrom(got.readings, got.cycles);
  const v = verdictFor(brackets, Number(arg("day-cap", "")), got.latestReading, arg("cap-source", null));
  return finish({
    ...v,
    windowDays,
    windowSinceIso: sinceIso,
    latestReadingAt: got.latestReading ? got.latestReading.taken_at : null,
    suppressionKey: suppressionKey(v),
    capNote: "the day cap is passed in with --day-cap; public.resolve_day_token_cap() is its one "
           + "home and this script must never become a second one",
    limits: [
      "A bracket assumes the runner was the only spender overnight. A manual session John ran at "
      + "3 AM inflates that bracket's meter delta and DEFLATES its tokens/pct -- so a low outlier "
      + "is a candidate for that, not proof est_tokens is wrong in that window.",
      "est_tokens itself is the hand-estimate under test, so every rate here inherits its error. "
      + "What the SPREAD shows is that the error is not constant, which no single rate can reveal.",
      "mcp get_session exposes no usage block on today's platform (measured 2026-09-02), so a "
      + "direct per-session token count -- SES-161's own candidate first step -- is unavailable.",
    ],
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
