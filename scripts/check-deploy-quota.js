#!/usr/bin/env node
// DeepBench v7.0.345 | scripts/check-deploy-quota.js | SES-47
// FEATURE: SES-47 -- the Vercel 100-deploys/day ceiling becomes a measured number with an alarm.
// John ruled the fork the ticket left open on 2026-08-31 (directive e2c05416, attended architect
// session, verbatim "option 1"): STAY ON THE FREE TIER -- the cap is deliberately accepted, NOT
// raised -- and build the free tracking instead, being briefing headroom plus a push alert when
// the day's deploys cross 80.
//
// THIS SCRIPT BUYS NOTHING AND MAY NEVER BE MADE TO. His ruling carries a standing prohibition,
// quoted because a later cycle reading a red headroom number is exactly who needs it: "If tracking
// later shows sustained pressure, the $20/mo question returns to John with measured numbers --
// no cycle may upgrade on its own." So this reports; it does not remediate. It also sends nothing --
// the CYCLE pushes, for the same reason rollback-on-red.js never pushes to git: the notification
// gates (one push per crossing, claimed atomically) live in the runbook, and a script that reached
// past them would be the SES-019 shape.
//
// -- THE WINDOW IS A TRAILING 24 HOURS, AND THAT IS THE FAIL-CLOSED CHOICE ------------------
// Two calendar days are in play and NEITHER is knowable here. John's spending day is
// America/Chicago (directive 1d01ea85, register B35) -- but that governs HIS budget and Vercel does
// not read it. Vercel's own quota reset boundary is not in the API response, not in runner_secrets,
// and not verifiable from this session; asserting one would be the "report a number that doesn't
// trace to a row or log" the standing prohibitions forbid.
//
// A trailing 24h count is >= any fixed-window count over the same traffic, BY CONSTRUCTION. So it
// can only alert EARLIER than the true boundary, never later -- the same direction
// check-deploy-serving.js takes with "unknown is not red". The window is named in the output, so
// the number traces to a stated window rather than to an assumed reset.
//
// THE EDIT THIS FORBIDS: "correcting" the window to a America/Chicago or UTC calendar day. That is
// not a tightening, it is a guess about somebody else's billing clock, and it makes the alarm fire
// LATE on exactly the burst days it exists to catch.
//
// -- THE COUNT IS ACCOUNT-WIDE, AND THAT WAS MEASURED RATHER THAN ASSUMED -------------------
// The cap SES-33 hit is an ACCOUNT limit. check-deploy-current.js queries `?app=deepbench-frontend`
// and reusing that filter would under-count the moment a second project exists. Probed live at the
// ship: the unfiltered account query and the app-filtered one BOTH returned 18 over the trailing
// 24h, {"deepbench-frontend":18} -- they agree today only because this account deploys one project,
// which is precisely why the agreement must not be baked in. The filter is dropped and the
// per-project split is reported, so the day a second project appears the number is still right and
// the split says where it went.
//
// -- WHY IT PAGINATES, and this is the half a rebuild drops --------------------------------
// /v6/deployments caps a page at 100 and THE CEILING UNDER TEST IS 100. A single-page read
// therefore reports at most 100 and can NEVER observe an overrun -- it would print "100/100, 0
// remaining" on a day that actually burned 137 and read as merely "at the cap". The regression
// guard runs that retired single-page form on the SAME fixture and asserts it LOSES, a difference
// rather than a property both forms share.
//
// Exit 0 clear -- 1 at or over the alert threshold -- 2 could not run (no VERCEL_TOKEN, API
// unreachable). Exit 2 is NEVER a pass: note it exactly as a failed export is noted, and never
// record a headroom figure that was not observed.

import { pathToFileURL } from "url";

// John's numbers, named rather than written as literals at the call site.
export const CAP = 100;          // Vercel hobby: 100 deployments/day, account-wide.
export const ALERT_AT = 80;      // his "cross 80" -- see thresholdIsInclusive below.
export const WINDOW_HOURS = 24;  // trailing, never a calendar day. See the header.

const PAGE_LIMIT = 100;          // the API's own maximum page size.
const MAX_PAGES = 25;            // 2,500 deployments is far past any real day; bounds a bad cursor.

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const JSON_OUT = process.argv.includes("--json");

// ---------------------------------------------------------------------------
// Pure logic -- exported so the guard exercises it with no network.
// ---------------------------------------------------------------------------

// THE THRESHOLD IS INCLUSIVE. John's word is "when the day's deploys cross 80". Written as
// `used > ALERT_AT` the 80th deployment passes silently and the alarm starts at 81 -- one deploy
// of the twenty he left himself. `>=` is the reading that gives him the headroom he asked for.
export function verdictFor(used, { cap = CAP, alertAt = ALERT_AT } = {}) {
  // `typeof used !== "number"` FIRST, and it is not belt-and-braces: Number(null) is 0, which is
  // finite and non-negative, so a coerce-then-test form reads "I could not determine the count" as
  // "zero deployments today, all clear" -- an unknown rendered as the safest possible number. That
  // is the one direction the three-verdict convention forbids (exit 2 is never a pass). Found by
  // this ship's own guard before it shipped, not reasoned about.
  const n = typeof used === "number" ? used : NaN;
  if (!Number.isFinite(n) || n < 0) {
    return { verdict: "unknown", exitCode: 2, used: null, remaining: null, pct: null,
             reason: "the deployment count could not be determined" };
  }
  // Floored at 0: a day that burned 137 has no headroom, it does not have -37 of it. The OVERRUN
  // stays visible in `used` and in `over`, so flooring hides nothing.
  const remaining = Math.max(0, cap - n);
  const pct = Math.round((n / cap) * 1000) / 10;
  const alerting = n >= alertAt;
  return {
    verdict: alerting ? "deploy-quota-alert" : "deploy-quota-clear",
    exitCode: alerting ? 1 : 0,
    used: n,
    remaining,
    pct,
    over: Math.max(0, n - cap),
    cap,
    alertAt,
    reason: alerting
      ? `${n} of ${cap} deployments used in the last ${WINDOW_HOURS}h (${pct}%) -- at or past the ${alertAt} alert line, ${remaining} left`
      : `${n} of ${cap} deployments used in the last ${WINDOW_HOURS}h (${pct}%) -- clear, ${remaining} left before the cap`,
  };
}

// Counts deployments created inside the trailing window. `since` is passed to the API too, but the
// filter is re-applied here rather than trusted: the API's own boundary handling is not this
// project's to assume, and a page that over-returns must not inflate John's number.
export function countInWindow(deployments, sinceMs) {
  return (deployments || []).filter(d => Number(d?.created) >= sinceMs).length;
}

export function splitByProject(deployments, sinceMs) {
  const out = {};
  for (const d of deployments || []) {
    if (Number(d?.created) < sinceMs) continue;
    const name = d?.name || "(unnamed)";
    out[name] = (out[name] || 0) + 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

// Returns { deployments } or { error }. NO app filter -- the cap is account-wide (header).
export async function fetchAllDeployments(token, sinceMs, fetchImpl = fetch) {
  const all = [];
  let until = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    let url = `https://api.vercel.com/v6/deployments?limit=${PAGE_LIMIT}&since=${sinceMs}`;
    if (until != null) url += `&until=${until}`;
    let res;
    try {
      res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      return { error: `could not reach the Vercel API: ${e.message}` };
    }
    if (!res.ok) {
      return { error: `Vercel API returned HTTP ${res.status} ${res.statusText}` };
    }
    let body;
    try {
      body = await res.json();
    } catch (e) {
      return { error: `Vercel API returned unparseable JSON: ${e.message}` };
    }
    const batch = body.deployments || [];
    all.push(...batch);
    const next = body?.pagination?.next;
    // A null `next` is the end. A repeated cursor would loop forever, so it also ends the walk.
    if (next == null || next === until || batch.length === 0) break;
    until = next;
  }
  return { deployments: all };
}

function finish(payload) {
  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(payload) + "\n");
  } else {
    process.stdout.write(`check-deploy-quota: ${payload.verdict} -- ${payload.reason}\n`);
    if (payload.byProject) {
      process.stdout.write(`  by project: ${JSON.stringify(payload.byProject)}\n`);
    }
  }
  process.exitCode = payload.exitCode;
  return payload;
}

async function main() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return finish({
      exitCode: 2, verdict: "cannot-run", used: null, remaining: null,
      reason: "VERCEL_TOKEN is not set in this process's environment (read it by name from runner_secrets)",
      windowHours: WINDOW_HOURS, cap: CAP, alertAt: ALERT_AT,
    });
  }
  const windowHours = Number(arg("window-hours", String(WINDOW_HOURS)));
  const sinceMs = Date.now() - windowHours * 3600 * 1000;

  const got = await fetchAllDeployments(token, sinceMs);
  if (got.error) {
    return finish({
      exitCode: 2, verdict: "cannot-run", used: null, remaining: null,
      reason: got.error, windowHours, cap: CAP, alertAt: ALERT_AT,
    });
  }

  const used = countInWindow(got.deployments, sinceMs);
  const v = verdictFor(used);
  return finish({
    ...v,
    windowHours,
    windowSinceIso: new Date(sinceMs).toISOString(),
    byProject: splitByProject(got.deployments, sinceMs),
    // Stated so the number always traces to a window rather than to an assumed reset boundary.
    windowNote: `trailing ${windowHours}h, account-wide. Vercel's own daily reset boundary is not observable from the API, so this window is deliberately a superset of any fixed day -- it can alert early, never late.`,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
