// DeepBench v7.0.357 | tests/regression/SES-269-cycle-cadence.js | SES-269
//
// Guards the four decisions in scripts/check-cycle-cadence.js that a rebuild gets wrong:
// GAPS BETWEEN FIRES (not the age of the newest row), THE THRESHOLD AS A COLUMN TIMES A NAMED
// MULTIPLE (never a literal), UNKNOWN IS NOT AN ALERT (fewer than two rows is exit 2, never 1), and
// ONE PUSH PER HOLE (the suppression key is the gap's own end, never the calendar day).
//
// THREE CLAUSES RUN A RETIRED DESIGN ON THE SAME FIXTURE AND ASSERT IT LOSES, so they prove a
// DIFFERENCE from what was rejected rather than a property both forms share:
//
//   * theNewestRowAgeFormCannotSeeAClosedHole() runs the tempting `now - max(started_at)` form --
//     which is the literal reading of the ticket's own "no fire in N hours" -- at the timestamp of
//     the cycle that ACTUALLY RECOVERED from the real 2026-08-26 -> 2026-08-28 silence, and asserts
//     it reports 0.0h CLEAR where the shipped form reports the 38.97h hole. Without this clause a
//     build that measured only the newest row would pass every other assertion here, because on a
//     healthy board the two agree exactly -- and would be silent for ever on the one event this
//     ticket exists for.
//   * theChicagoDayFormMissesTheRealIncident() runs the "was there a calendar day with zero rows?"
//     form -- the obvious build, and what SES-269's own title suggests -- on the same fixture, on
//     JOHN'S clock (America/Chicago, the boundary the runbook mandates for every "today", directive
//     1d01ea85), and asserts it reports CLEAR. Measured live rather than constructed: the silence
//     straddled two CST days, so 2026-08-27 CST held two rows (03:42Z and 04:42Z UTC = 22:42 and
//     23:42 CST) and no CST day in the window is empty.
//   * theDayFormIsBlindToAnyHoleShorterThanADay() is the same control with the escape hatch closed:
//     a 20-hour silence sitting entirely inside one CST day is invisible to ANY day-bucket form, on
//     either clock, so the first control cannot be dismissed as an artefact of which day is used.
//
// THE POLICY IS READ OUT OF THE SHIPPED MODULE, never restated here -- GAP_MULTIPLE, MIN_ALERT_HOURS
// and WINDOW_DAYS are imported, so a test that "agrees" with a changed constant cannot exist
// (docs/STANDARDS.md Section 4, the SES-45 rule: logic recreated inside a test is a second
// implementation agreeing with itself).
//
// Runs WITHOUT credentials on purpose: every clause exercises the exported pure functions or a
// stubbed fetch, so it grades the logic rather than the live board -- which moves under every cycle.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { selfRun } from "./_lib/self-run.js";

import {
  GAP_MULTIPLE,
  MIN_ALERT_HOURS,
  DEFAULT_INTERVAL_HOURS,
  WINDOW_DAYS,
  alertThresholdHours,
  findGaps,
  verdictFor,
  suppressionKey,
  fetchStartedAt,
} from "../../scripts/check-cycle-cadence.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "..", "..", "scripts", "check-cycle-cadence.js");

const H = 3600 * 1000;

// --- THE REAL INCIDENT, as measured from public.runner_cycles at this ship -----------------
// The silence SES-269 is written from: 2026-08-26T12:43:36Z -> 2026-08-28T03:42:00Z, 38.97h.
const HOLE_START = Date.parse("2026-08-26T12:43:36.977Z");
const HOLE_END = Date.parse("2026-08-28T03:42:00.597Z");
const RECOVERED_AT = HOLE_END + 500; // the recovering cycle, mid-run: this is when it would check.

function hourly(fromMs, toMs) {
  const out = [];
  for (let t = fromMs; t <= toMs; t += H) out.push(new Date(t).toISOString());
  return out;
}

// Mirrors the real shape: healthy fires up to the hole, the hole, then the two recovering fires and
// a healthy morning after them. Deliberately NOT trimmed to the hole's endpoints -- a fixture with
// only two rows would make the day-bucket control pass for the wrong reason.
function incidentFixture() {
  return [
    ...hourly(HOLE_START - 30 * H, HOLE_START),   // 08-25/08-26, up to the last fire before the hole
    new Date(HOLE_END).toISOString(),             // 03:42Z 08-28 = 22:42 CST 08-27
    new Date(HOLE_END + H).toISOString(),         // 04:42Z 08-28 = 23:42 CST 08-27
  ];
}

// --- 1. The threshold is John's column times a named multiple ------------------------------
function theThresholdComesFromHisSettingsNotALiteral() {
  assert.strictEqual(GAP_MULTIPLE, 4, "four consecutive missed fires is a silence; one is routine");
  assert.strictEqual(MIN_ALERT_HOURS, 6,
    "the floor is one full period of deepbench-staleness-watchdog (31 */6 * * *), the only "
    + "independent watcher -- below it there is nothing for this alarm to add");

  // At John's live 1h cadence, 1 x 4 = 4 is below the floor, so the floor governs.
  assert.strictEqual(alertThresholdHours({ interval_hours: 1 }).thresholdHours, MIN_ALERT_HOURS);
  // At the pre-2026-08-28 3h cadence, 3 x 4 = 12 is above the floor, so the cadence governs.
  assert.strictEqual(alertThresholdHours({ interval_hours: 3 }).thresholdHours, 12,
    "his cadence must move the alert line -- a literal would turn his own change into a false alarm");
  assert.strictEqual(alertThresholdHours({ interval_hours: 6 }).thresholdHours, 24);
}

// A settings row that cannot be read FAILS OPEN to the default, never raises and never alerts on it.
function anUnreadableSettingsRowFailsOpen() {
  for (const bad of [null, undefined, {}, { interval_hours: null }, { interval_hours: 0 },
                     { interval_hours: -3 }, { interval_hours: "soon" }]) {
    const t = alertThresholdHours(bad);
    assert.strictEqual(t.intervalHours, DEFAULT_INTERVAL_HOURS,
      `an unusable interval (${JSON.stringify(bad)}) must fall back, not raise`);
    assert.strictEqual(t.intervalFromSettings, false, "and must say the number is not John's");
    assert.ok(Number.isFinite(t.thresholdHours) && t.thresholdHours > 0);
  }
  assert.strictEqual(alertThresholdHours({ interval_hours: 3 }).intervalFromSettings, true,
    "a real reading must be reported as his, or the output cannot be trusted either way");
}

// --- 2. THE REAL INCIDENT IS SEEN ----------------------------------------------------------
function theShippedFormReportsTheRealHole() {
  const { thresholdHours } = alertThresholdHours({ interval_hours: 1 });
  const found = findGaps(incidentFixture(), RECOVERED_AT, thresholdHours);
  const v = verdictFor(found, thresholdHours, 1);

  assert.strictEqual(v.exitCode, 1, "the 38.97h silence must alert");
  assert.strictEqual(v.verdict, "cadence-alert");
  assert.strictEqual(v.gaps.length, 1, "exactly one gap in the fixture crosses the line");
  assert.strictEqual(v.worst.hours, 38.97, "and it is reported to the hundredth of an hour");
  assert.strictEqual(v.worst.ongoing, false, "the hole has ENDED -- that is the whole difficulty");
  assert.strictEqual(v.worst.startIso, new Date(HOLE_START).toISOString());
  assert.strictEqual(v.worst.endIso, new Date(HOLE_END).toISOString());
  assert.ok(/was silent for 38\.97h/.test(v.reason), "and John is told in plain words");
}

// NEGATIVE CONTROL -- the newest-row-age form, on the SAME fixture, at the SAME moment.
function theNewestRowAgeFormCannotSeeAClosedHole() {
  const rows = incidentFixture();
  const retired = (times, nowMs) => {
    const newest = Math.max(...times.map(t => Date.parse(t)));
    return Math.round(((nowMs - newest) / H) * 100) / 100;
  };
  const retiredHours = retired(rows, RECOVERED_AT);
  assert.ok(retiredHours < MIN_ALERT_HOURS,
    `control must reach the WRONG answer: the recovering cycle's newest row is ${retiredHours}h old, `
    + "so a newest-row-age alarm reports CLEAR on the very incident this ticket is written from");

  const { thresholdHours } = alertThresholdHours({ interval_hours: 1 });
  const shipped = verdictFor(findGaps(rows, RECOVERED_AT, thresholdHours), thresholdHours, 1);
  assert.strictEqual(shipped.exitCode, 1,
    "the shipped form alerts where the retired one is silent -- a DIFFERENCE, not a shared property");
}

// NEGATIVE CONTROL -- the calendar-day form, on JOHN'S clock, on the SAME fixture.
function chicagoDay(iso) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date(iso));
}
function daysWithNoRows(rows, fromMs, toMs) {
  const present = new Set(rows.map(chicagoDay));
  const missing = [];
  for (let t = fromMs; t <= toMs; t += 24 * H) {
    const d = chicagoDay(new Date(t).toISOString());
    if (!present.has(d) && !missing.includes(d)) missing.push(d);
  }
  return missing;
}
function theChicagoDayFormMissesTheRealIncident() {
  const rows = incidentFixture();
  // The window the day form would scan: the first fire in the fixture through the recovery.
  const missing = daysWithNoRows(rows, Date.parse(rows[0]), RECOVERED_AT);
  assert.deepStrictEqual(missing, [],
    "control must reach the WRONG answer: on America/Chicago -- the boundary the runbook mandates "
    + "for every 'today' -- NO day in the window is empty, because the silence straddled two of "
    + "them and 2026-08-27 CST holds the two recovering fires. A zero-rows-today test is silent here.");
  assert.ok(rows.map(chicagoDay).includes("2026-08-27"),
    "and that is measured, not assumed: 2026-08-27 CST really does hold rows in this fixture");

  const { thresholdHours } = alertThresholdHours({ interval_hours: 1 });
  assert.strictEqual(verdictFor(findGaps(rows, RECOVERED_AT, thresholdHours), thresholdHours, 1).exitCode, 1,
    "the shipped form alerts where the day-bucket form is silent");
}

// NEGATIVE CONTROL -- and the day form's blindness does not depend on WHICH day boundary is used.
function theDayFormIsBlindToAnyHoleShorterThanADay() {
  const noonCst = Date.parse("2026-08-20T17:00:00.000Z"); // 12:00 CST
  const rows = [
    ...hourly(noonCst - 4 * H, noonCst),          // morning fires
    new Date(noonCst + 20 * H).toISOString(),     // 20 hours later -- still inside a 24h span
  ];
  const at = noonCst + 20 * H + 500;
  assert.deepStrictEqual(daysWithNoRows(rows, Date.parse(rows[0]), at), [],
    "control: a 20h silence leaves no calendar day empty, on any clock -- so no day-bucket form of "
    + "this alarm can ever see it");

  const { thresholdHours } = alertThresholdHours({ interval_hours: 1 });
  const v = verdictFor(findGaps(rows, at, thresholdHours), thresholdHours, 1);
  assert.strictEqual(v.exitCode, 1, "the shipped form sees the 20h hole");
  assert.strictEqual(v.worst.hours, 20);
}

// --- 3. A silence still in progress is also seen, and is labelled as ongoing ---------------
function anOngoingSilenceIsReportedAndIsNotGivenAnEndTime() {
  const t0 = Date.parse("2026-08-20T00:00:00.000Z");
  const rows = hourly(t0, t0 + 5 * H);
  const { thresholdHours } = alertThresholdHours({ interval_hours: 1 });
  const v = verdictFor(findGaps(rows, t0 + 5 * H + 9 * H, thresholdHours), thresholdHours, 1);

  assert.strictEqual(v.exitCode, 1, "nine hours with no fire is past the six-hour line");
  assert.strictEqual(v.worst.ongoing, true);
  assert.strictEqual(v.worst.endIso, null,
    "an ongoing gap must carry NO end timestamp -- a value here is a moment nobody observed, which "
    + "is the SES-104 defect (a backfilled constant read back later as a real reading)");
  assert.ok(/has not fired for 9h/.test(v.reason));
}

function ahealthyBoardIsQuiet() {
  const t0 = Date.parse("2026-08-20T00:00:00.000Z");
  const rows = hourly(t0, t0 + 40 * H);
  const { thresholdHours } = alertThresholdHours({ interval_hours: 1 });
  const v = verdictFor(findGaps(rows, t0 + 40 * H + 12 * 60 * 1000, thresholdHours), thresholdHours, 1);
  assert.strictEqual(v.exitCode, 0, "hourly fires with no hole are clear");
  assert.strictEqual(v.verdict, "cadence-clear");
  assert.deepStrictEqual(v.gaps, []);
  // A gap exactly AT the line alerts: "no fire in N hours" starts at N, the same inclusive reading
  // SES-47 had to make for John's "cross 80".
  const atTheLine = [new Date(t0).toISOString(), new Date(t0 + MIN_ALERT_HOURS * H).toISOString()];
  assert.strictEqual(findGaps(atTheLine, t0 + MIN_ALERT_HOURS * H + 1000, MIN_ALERT_HOURS).gaps.length, 1,
    "a gap of exactly the threshold IS the crossing");
}

// --- 4. UNKNOWN IS NOT AN ALERT ------------------------------------------------------------
function tooFewRowsIsCannotRunNeverAnAlert() {
  const { thresholdHours } = alertThresholdHours({ interval_hours: 1 });
  for (const rows of [[], ["2026-08-20T00:00:00.000Z"], null, ["not-a-date"]]) {
    const found = findGaps(rows, Date.parse("2026-08-30T00:00:00.000Z"), thresholdHours);
    assert.strictEqual(found.measurable, false, `${JSON.stringify(rows)} yields no measurable gap`);
    const v = verdictFor(found, thresholdHours, 1);
    assert.strictEqual(v.exitCode, 2,
      "an unmeasurable board is 'could not run', NEVER an alert -- the caller is itself a live "
      + "cycle, so an empty read can only be a broken read");
    assert.strictEqual(v.verdict, "cannot-run");
    assert.deepStrictEqual(v.gaps, []);
  }
}

async function aRestFailureIsCannotRunNotClear() {
  const boom = async () => { throw new Error("ENOTFOUND supabase"); };
  const got = await fetchStartedAt("https://x.supabase.co", "k", "2026-08-01T00:00:00Z", boom);
  assert.ok(got.error && /could not reach/i.test(got.error),
    "an unreachable endpoint must surface as an error, never as an empty (i.e. silent) board");

  const http500 = async () => ({ ok: false, status: 500, statusText: "Internal Server Error" });
  const bad = await fetchStartedAt("https://x.supabase.co", "k", "2026-08-01T00:00:00Z", http500);
  assert.ok(/HTTP 500/.test(bad.error), "a non-OK cycles read must not be read as zero fires");
}

// The SETTINGS read failing is deliberately NOT fatal -- the threshold fails open to the default.
// Fatal there would mean one unreadable settings row silences the alarm entirely.
async function anUnreadableSettingsRowDoesNotKillTheCheck() {
  const rows = [{ started_at: "2026-08-20T00:00:00.000Z" }, { started_at: "2026-08-20T01:00:00.000Z" }];
  let call = 0;
  const stub = async () => {
    call++;
    if (call === 1) return { ok: true, status: 200, statusText: "OK", json: async () => rows };
    return { ok: false, status: 403, statusText: "Forbidden" };
  };
  const got = await fetchStartedAt("https://x.supabase.co", "k", "2026-08-01T00:00:00Z", stub);
  assert.ok(!got.error, "a 403 on the settings row must not fail the whole check");
  assert.strictEqual(got.settings, null, "it reports the settings as unknown");
  assert.strictEqual(got.startedAt.length, 2, "and the measurement still happened");
}

// --- 5. ONE PUSH PER HOLE ------------------------------------------------------------------
function theSuppressionKeyIsTheGapNotTheDay() {
  const closed = { startIso: new Date(HOLE_START).toISOString(),
                   endIso: new Date(HOLE_END).toISOString(), hours: 38.97, ongoing: false };
  const key = suppressionKey(closed);
  assert.ok(key.includes(closed.endIso),
    "a closed hole keys on its END, so one hole is pushed once ever -- a per-day marker would "
    + "re-push a 39h hole on each calendar day it touched");
  assert.ok(!/\b2026-08-27\b(?!T)/.test(key.replace(closed.endIso, "")),
    "and the key must not be a bare date");

  const ongoing = { startIso: new Date(HOLE_START).toISOString(), endIso: null, hours: 9, ongoing: true };
  assert.ok(suppressionKey(ongoing).includes(ongoing.startIso),
    "an ongoing gap has no end, so it keys on its start -- and stays one alarm as it lengthens");
  assert.notStrictEqual(suppressionKey(ongoing), key, "the two forms must not collide");
  assert.strictEqual(suppressionKey(null), null);
}

// --- 6. IT REPORTS AND NEVER ACTS ----------------------------------------------------------
function theScriptNeverNotifiesOrRepairs() {
  const src = fs.readFileSync(SCRIPT, "utf8");
  const code = src.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");

  assert.ok(!/child_process|execFileSync|execSync|spawn/.test(code),
    "check-cycle-cadence must not shell out -- it reports, the cycle acts");
  assert.ok(!/PushNotification|sendNotification/.test(code),
    "the push is the CYCLE's, gated to one per hole in the runbook -- a script that notified "
    + "directly would route around that gate (the SES-019 shape)");
  assert.ok(!/\b(update_trigger|create_trigger|fire_trigger)\b/.test(code),
    "and it must never reach for John's routines: editing his own automation is his switch, the "
    + "same class as the step-1b settings gate");
  assert.ok(!/\bmethod:\s*['\"](POST|PATCH|PUT|DELETE)/i.test(code),
    "it is a read: no write may reach Supabase from this script");

  // The two measured facts that make this file's design defensible must survive beside the code.
  assert.ok(/38\.97/.test(src), "the measured hole must be quoted in the file that exists because of it");
  assert.ok(/cannot fire DURING a silence/i.test(src),
    "the honest limitation must be stated where a later cycle reading a clear verdict will see it");
  assert.ok(new RegExp(String(WINDOW_DAYS)).test(code), "the window must be a named constant");
}

function run() {
  theThresholdComesFromHisSettingsNotALiteral();
  anUnreadableSettingsRowFailsOpen();
  theShippedFormReportsTheRealHole();
  theNewestRowAgeFormCannotSeeAClosedHole();
  theChicagoDayFormMissesTheRealIncident();
  theDayFormIsBlindToAnyHoleShorterThanADay();
  anOngoingSilenceIsReportedAndIsNotGivenAnEndTime();
  ahealthyBoardIsQuiet();
  tooFewRowsIsCannotRunNeverAnAlert();
  theSuppressionKeyIsTheGapNotTheDay();
  theScriptNeverNotifiesOrRepairs();
  return Promise.all([
    aRestFailureIsCannotRunNotClear(),
    anUnreadableSettingsRowDoesNotKillTheCheck(),
  ]);
}

selfRun(import.meta.url, run);
export default run;
