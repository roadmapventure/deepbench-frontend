#!/usr/bin/env node
// DeepBench v7.0.357 | scripts/check-cycle-cadence.js | SES-269
// FEATURE: SES-269 -- the runner's own SILENCE becomes a measured number with an alarm. Nothing in
// this platform has ever noticed that the hourly fires stopped: stall_watchdog() watches cycles that
// are OPEN (a silence has none), and deepbench-staleness-watchdog watches runner_usage_readings and
// PARKED directives, not absent fires. Measured live at this ship over the trailing 14 days of
// public.runner_cycles: exactly one silence beyond the cadence of its era, and it was
// 38.97 HOURS -- 2026-08-26T12:43:36Z -> 2026-08-28T03:42:00Z. Nobody was told, then or since.
//
// -- WHAT THIS CAN AND CANNOT DO, STATED FIRST BECAUSE IT BOUNDS THE WHOLE DESIGN ----------
// A detector hosted INSIDE the runner cannot fire DURING a silence: nothing is running to fire it.
// So this reports a hole at the FIRST FIRE AFTER IT, which is the only moment a runner-hosted
// detector can speak at all -- and is precisely the moment nothing spoke on 2026-08-28. The
// live-during-the-hole half needs an independent channel (John's own 6-hourly watchdog routine), and
// an unattended cycle may not edit his routines; that half is declared on SES-269's ship card, not
// silently attempted here.
//
// -- THE HALF A REBUILD DROPS: "no fire in N hours" IS NOT THE AGE OF THE NEWEST ROW -------
// The obvious reading of the ticket's own Fix line is `now() - max(started_at)`. That form CAN NEVER
// REPORT A SILENCE THAT HAS ALREADY ENDED, and the only cycle able to report one is by construction
// alive: the recovering fire at 2026-08-28T03:42:00Z sees a newest row zero minutes old and says
// CLEAR. The alarm would be silent on exactly the event it exists to catch, for ever. This script
// therefore measures the LARGEST GAP BETWEEN CONSECUTIVE FIRES in a trailing window as well as the
// current age, and alerts on either. The guard runs that retired newest-row-age form on the SAME
// 08-26 -> 08-28 fixture and asserts it LOSES -- a difference, not a property both forms share.
//
// -- THE TICKET'S OWN PREMISE CARRIES THE OTHER TRAP, AND IT WAS MEASURED, NOT ARGUED ------
// SES-269 reads "2026-08-27 produced ZERO runner_cycles rows". That is true of the UTC day. On
// JOHN'S clock -- America/Chicago, the boundary this runbook mandates for every "today" (directive
// 1d01ea85, register B35) -- 2026-08-27 held TWO rows, at 03:42Z and 04:42Z UTC, i.e. 22:42 and
// 23:42 CST. So a calendar-day "was there a day with no rows?" test, which is the obvious build and
// the one the ticket's title suggests, DOES NOT FIRE ON THE INCIDENT THE TICKET IS WRITTEN FROM.
// Only a gap measurement fires. The guard runs that retired day-bucket form on the same fixture and
// asserts it reports clear.
//
// -- THE THRESHOLD IS A COLUMN TIMES A NAMED MULTIPLE, NEVER A LITERAL ---------------------
// John owns the cadence: runner_settings.interval_hours (live 1 at this ship, 3 before 2026-08-28).
// A hardcoded hour count turns his changing his own cadence into a false alarm -- the "a column, not
// a literal" correction SES-146 already had to make twice, for cron_minute and grid_tolerance_min.
// GAP_MULTIPLE = 4 because one missed fire is routine (an overrunning cycle, a platform hiccup) and
// four consecutive missed fires is a silence. MIN_ALERT_HOURS = 6 is NOT a chosen number either: it
// is the cron period of deepbench-staleness-watchdog (`31 */6 * * *`), the only independent watcher
// on this platform -- so the floor is "one full period of the thing that would otherwise notice",
// and below it there is nothing for this alarm to add.
//
// -- UNKNOWN IS NOT AN ALERT ---------------------------------------------------------------
// Fewer than two rows in the window means no gap is measurable, not that the runner is silent -- and
// a caller of this script is itself a live cycle, so an empty read can only be a broken read. It
// exits 2 (could not run), never 1. Same asymmetry check-deploy-serving.js draws for the deploy
// probe and check-deploy-quota.js for an undeterminable count: the fail direction is away from
// acting on a number nobody observed.
//
// IT REPORTS AND NEVER NOTIFIES. The push is the CYCLE's, gated to one per hole in the runbook, for
// the same reason rollback-on-red.js never pushes to git: a script that reached past the
// notification gate would be the SES-019 shape.
//
// Exit 0 clear -- 1 a silence at or past the threshold -- 2 could not run. Exit 2 is NEVER a pass.

import { pathToFileURL } from "url";

// Named rather than written as literals at the call site. See the header for why each is this value.
export const GAP_MULTIPLE = 4;            // four consecutive missed fires, not one.
export const MIN_ALERT_HOURS = 6;         // one full period of the independent 6-hourly watchdog.
export const DEFAULT_INTERVAL_HOURS = 1;  // used only when the settings row is unreadable (fail open).
export const WINDOW_DAYS = 7;             // how far back gaps are scanned.

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

// John's cadence decides the threshold. An unreadable / absent / nonsense interval FAILS OPEN to the
// default rather than raising: a detector that can stop the fleet's reporting must never do so by
// accident, the same posture scheduler_gate() takes on every unknown.
export function alertThresholdHours(settings) {
  const raw = settings && settings.interval_hours;
  const n = typeof raw === "number" ? raw : Number(raw);
  const interval = Number.isFinite(n) && n > 0 ? n : DEFAULT_INTERVAL_HOURS;
  return {
    thresholdHours: Math.max(MIN_ALERT_HOURS, interval * GAP_MULTIPLE),
    intervalHours: interval,
    intervalFromSettings: Number.isFinite(n) && n > 0,
  };
}

// Every gap between consecutive fires in the window, plus the TRAILING gap (the newest row to now).
// Both are needed and neither substitutes for the other: the trailing gap is the only one a silence
// still in progress produces, and the between-fires gaps are the only ones a silence that has ENDED
// produces -- which is every silence a live cycle can ever be looking at. Returns them newest-first.
export function findGaps(startedAtIso, nowMs, thresholdHours) {
  const times = (startedAtIso || [])
    .map(t => (t instanceof Date ? t.getTime() : Date.parse(t)))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (times.length < 2) return { gaps: [], measurable: false, samples: times.length };

  const thresholdMs = thresholdHours * MS_PER_HOUR;
  const gaps = [];
  for (let i = 1; i < times.length; i++) {
    const ms = times[i] - times[i - 1];
    if (ms >= thresholdMs) {
      gaps.push({ startIso: new Date(times[i - 1]).toISOString(), endIso: new Date(times[i]).toISOString(),
                  hours: Math.round((ms / MS_PER_HOUR) * 100) / 100, ongoing: false });
    }
  }
  // The trailing gap. `endIso` is null because it has not ended -- a value here would be a moment
  // nobody observed, which is the SES-104 defect (a backfilled constant read back as a real reading).
  const trailingMs = nowMs - times[times.length - 1];
  if (trailingMs >= thresholdMs) {
    gaps.push({ startIso: new Date(times[times.length - 1]).toISOString(), endIso: null,
                hours: Math.round((trailingMs / MS_PER_HOUR) * 100) / 100, ongoing: true });
  }
  gaps.sort((a, b) => Date.parse(b.startIso) - Date.parse(a.startIso));
  return { gaps, measurable: true, samples: times.length,
           currentGapHours: Math.round((trailingMs / MS_PER_HOUR) * 100) / 100,
           newestIso: new Date(times[times.length - 1]).toISOString() };
}

export function verdictFor(found, thresholdHours, intervalHours) {
  if (!found || found.measurable !== true) {
    return {
      verdict: "cannot-run", exitCode: 2, gaps: [], worst: null,
      reason: `fewer than two runner_cycles rows in the trailing ${WINDOW_DAYS}d window `
            + `(${(found && found.samples) || 0}) -- no gap is measurable, which is an unreadable `
            + `board rather than a silent one: the caller of this check is itself a live cycle`,
    };
  }
  const gaps = found.gaps || [];
  if (gaps.length === 0) {
    return {
      verdict: "cadence-clear", exitCode: 0, gaps: [], worst: null,
      currentGapHours: found.currentGapHours, newestIso: found.newestIso,
      reason: `no gap of ${thresholdHours}h or more in the trailing ${WINDOW_DAYS}d `
            + `(${found.samples} fires, newest ${found.currentGapHours}h ago, `
            + `cadence ${intervalHours}h)`,
    };
  }
  const worst = gaps.reduce((a, b) => (b.hours > a.hours ? b : a), gaps[0]);
  return {
    verdict: "cadence-alert", exitCode: 1, gaps, worst,
    currentGapHours: found.currentGapHours, newestIso: found.newestIso,
    reason: worst.ongoing
      ? `the runner has not fired for ${worst.hours}h (since ${worst.startIso}) -- `
        + `${thresholdHours}h is the alert line at your ${intervalHours}h cadence`
      : `the runner was silent for ${worst.hours}h, ${worst.startIso} to ${worst.endIso} -- `
        + `${thresholdHours}h is the alert line at your ${intervalHours}h cadence`,
  };
}

// The suppression key is the GAP'S OWN END, not the day. One hole gets one push, ever, however many
// cycles run afterwards and however many calendar days it spans -- where a per-day marker would
// re-push a 39-hour hole on each day it touched, and a per-cycle one would push every hour for a
// week. An ongoing gap keys on its start for the same reason. This is record_skip()'s skip_count
// boundary arriving here: an alarm John receives eight times stops being read.
export function suppressionKey(gap) {
  if (!gap) return null;
  return `CADENCE ALERT (gap ${gap.ongoing ? "opened" : "ended"} ${gap.ongoing ? gap.startIso : gap.endIso})`;
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

export async function fetchStartedAt(base, key, sinceIso, fetchImpl = fetch) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const root = String(base).replace(/\/+$/, "");
  const out = {};
  for (const [name, q] of [
    ["cycles", `runner_cycles?select=started_at&started_at=gte.${sinceIso}&order=started_at.asc&limit=5000`],
    ["settings", `runner_settings?select=interval_hours&id=eq.1`],
  ]) {
    let res;
    try {
      res = await fetchImpl(`${root}/rest/v1/${q}`, { headers });
    } catch (e) {
      return { error: `could not reach the Supabase REST endpoint: ${e.message}` };
    }
    if (!res.ok) {
      // The settings read failing is NOT fatal -- the threshold fails open to the default. The
      // cycles read failing is, because there is then no measurement at all.
      if (name === "settings") { out.settings = null; continue; }
      return { error: `Supabase REST returned HTTP ${res.status} ${res.statusText} reading ${name}` };
    }
    try {
      out[name] = await res.json();
    } catch (e) {
      if (name === "settings") { out.settings = null; continue; }
      return { error: `Supabase REST returned unparseable JSON reading ${name}: ${e.message}` };
    }
  }
  return {
    startedAt: (out.cycles || []).map(r => r.started_at),
    settings: Array.isArray(out.settings) && out.settings[0] ? out.settings[0] : null,
  };
}

function finish(payload) {
  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(payload) + "\n");
  } else {
    process.stdout.write(`check-cycle-cadence: ${payload.verdict} -- ${payload.reason}\n`);
    for (const g of payload.gaps || []) {
      process.stdout.write(`  ${g.hours}h  ${g.startIso} -> ${g.endIso ?? "(still silent)"}\n`);
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
    return finish({ exitCode: 2, verdict: "cannot-run", gaps: [], worst: null,
      reason: `${missing} is not set in this process's environment (read by name from runner_secrets)` });
  }
  const windowDays = Number(arg("window-days", String(WINDOW_DAYS)));
  const nowMs = Date.now();
  const sinceIso = new Date(nowMs - windowDays * 24 * MS_PER_HOUR).toISOString();

  const got = await fetchStartedAt(url, key, sinceIso);
  if (got.error) {
    return finish({ exitCode: 2, verdict: "cannot-run", gaps: [], worst: null, reason: got.error });
  }

  const { thresholdHours, intervalHours, intervalFromSettings } = alertThresholdHours(got.settings);
  const found = findGaps(got.startedAt, nowMs, thresholdHours);
  const v = verdictFor(found, thresholdHours, intervalHours);
  return finish({
    ...v,
    thresholdHours,
    intervalHours,
    intervalSource: intervalFromSettings ? "runner_settings.interval_hours" : "default (settings unreadable)",
    windowDays,
    windowSinceIso: sinceIso,
    suppressionKey: v.exitCode === 1 ? suppressionKey(v.worst) : null,
    windowNote: `gaps BETWEEN fires as well as the trailing gap: a silence that has already ended is `
              + `the only kind a live cycle can ever be looking at, and the newest-row-age form cannot `
              + `see one. Threshold = max(${MIN_ALERT_HOURS}, ${intervalHours} x ${GAP_MULTIPLE}).`,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
