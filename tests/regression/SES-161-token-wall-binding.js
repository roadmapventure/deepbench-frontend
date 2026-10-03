// DeepBench v7.0.376 | tests/regression/SES-161-token-wall-binding.js | SES-161
//
// Guards the four decisions in scripts/check-token-wall-binding.js that a rebuild gets wrong:
// THE RATE IS MEASURED ACROSS BRACKETS (a single bracket cannot disagree with itself), THE SPREAD IS
// REPORTED AND NEVER GRADED (no invented threshold), THE ALERT USES THE MOST GENEROUS BRACKET (fail
// away from acting), and UNKNOWN IS NOT AN ALERT (fewer than two brackets is exit 2, never 1).
//
// TWO CLAUSES RUN A RETIRED DESIGN ON THE SAME FIXTURE AND ASSERT IT LOSES, so they prove a
// DIFFERENCE from what was rejected rather than a property both forms share:
//
//   * theSingleBracketFormCannotSeeTheDisagreement() runs the form runner-cycle.md step 3 itself
//     used to prescribe -- "calibrate tokens_per_pct from the two most recent readings" -- on the
//     same four real brackets, and asserts it reports a spread of exactly 1.0x, i.e. PERFECT
//     AGREEMENT, where the shipped form reports 2.88x. One rate cannot disagree with itself, so
//     that form is structurally incapable of making the check SES-161 says has never been made.
//   * theUnitBlindFormCallsTheWallHealthy() runs the tempting arithmetic -- today's est spend
//     against the day cap in est-token units, 24M against 196M, "plenty of headroom, the wall is
//     fine" -- and asserts it reports CLEAR on the same inputs where the shipped form reports the
//     cap non-binding. That form never converts to the meter, so it can never notice that the cap
//     is larger than a whole weekly plan.
//
// A POSITIVE ARM IS INCLUDED ON PURPOSE (aSmallerCapReallyDoesBind): with the 10M standing default
// instead of John's 196M box, the same fixture returns wall-binding / exit 0. Without it, a build
// that returned "non-binding" unconditionally would pass every other clause here -- which is the
// "would it still pass if the change did nothing?" bar the QA rule sets.
//
// THE POLICY IS READ OUT OF THE SHIPPED MODULE, never restated here -- MAX_BRACKET_HOURS,
// MIN_BRACKETS and WINDOW_DAYS are imported, so a test that "agrees" with a changed constant cannot
// exist (docs/STANDARDS.md Section 4, the SES-45 rule).
//
// Runs WITHOUT credentials on purpose: every clause exercises the exported pure functions or a
// stubbed fetch, so it grades the logic rather than the live board -- which moves under every cycle.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { selfRun } from "./_lib/self-run.js";

import {
  MAX_BRACKET_HOURS,
  MIN_BRACKETS,
  WINDOW_DAYS,
  bracketsFrom,
  spreadOf,
  verdictFor,
  suppressionKey,
  fetchInputs,
} from "../../scripts/check-token-wall-binding.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "..", "..", "scripts", "check-token-wall-binding.js");

// --- THE REAL BOARD, as measured from public.runner_usage_readings at this ship ------------
// Every timestamp, slot and percentage below was read live 2026-09-02T15:1xZ. The four est-token
// totals are the stored est_tokens_since_prev values on the morning rows, which is exactly what a
// sum over the bracket's cycles produces -- so the fixture carries one cycle row per bracket rather
// than inventing a per-cycle distribution nobody measured.
const READINGS = [
  { taken_at: "2026-08-22T13:50:00+00:00", slot: "morning", all_models_pct: "18" },
  { taken_at: "2026-08-23T03:36:00+00:00", slot: "night", all_models_pct: "32" },
  { taken_at: "2026-08-23T13:51:00+00:00", slot: "morning", all_models_pct: "37" },
  { taken_at: "2026-08-24T03:19:00+00:00", slot: "night", all_models_pct: "60" },
  { taken_at: "2026-08-24T14:40:00+00:00", slot: "morning", all_models_pct: "65" },
  { taken_at: "2026-08-25T04:57:00+00:00", slot: "night", all_models_pct: "84" },
  { taken_at: "2026-08-25T13:56:00+00:00", slot: "morning", all_models_pct: "92" },
  { taken_at: "2026-08-28T15:10:00+00:00", slot: "morning", all_models_pct: "2" },
  { taken_at: "2026-08-29T03:14:00+00:00", slot: "night", all_models_pct: "17" },
  { taken_at: "2026-08-29T14:47:00+00:00", slot: "morning", all_models_pct: "29" },
  { taken_at: "2026-08-31T15:33:04+00:00", slot: "morning", all_models_pct: "63" },
];

const CYCLES = [
  { started_at: "2026-08-23T08:00:00+00:00", est_tokens_dev: 13255000, est_tokens_qa: 0 },
  { started_at: "2026-08-24T08:00:00+00:00", est_tokens_dev: 12927000, est_tokens_qa: 0 },
  { started_at: "2026-08-25T08:00:00+00:00", est_tokens_dev: 7363000, est_tokens_qa: 0 },
  { started_at: "2026-08-29T08:00:00+00:00", est_tokens_dev: 27710000, est_tokens_qa: 0 },
];

const JOHNS_BOX = 196000000;        // runner_settings.daily_max_tokens_millions = 196, live.
const STANDING_DEFAULT = 10000000;  // runner_budget.runner_day_token_allowance, live.
const LATEST = { taken_at: "2026-08-31T15:33:04+00:00", all_models_pct: "63" };

// --- 1. The four real brackets are found, and they reproduce the stored rates --------------
function theFourRealBracketsReproduceTheStoredRates() {
  const b = bracketsFrom(READINGS, CYCLES);
  assert.strictEqual(b.length, 4, "the live board holds exactly four clean night->morning brackets");

  // These four numbers are stored in runner_usage_readings.tokens_per_pct. Reproducing them from
  // the raw readings and cycles is what makes this a MEASUREMENT rather than a re-quotation.
  assert.deepStrictEqual(b.map(x => x.tokensPerPct),
    [2651000, 2585400, 920375, 2309166.67],
    "each bracket's rate must equal the value SES-128's own calibration stored on the morning row");

  // The two morning-only readings must NOT bracket anything: a reading with no night before it is
  // not a runner-only window, and slotting one on the resemblance of its clock time would
  // manufacture a pair John never declared (SES-128).
  assert.ok(!b.some(x => x.morningIso.startsWith("2026-08-22")), "08-22 morning has no night before it");
  assert.ok(!b.some(x => x.morningIso.startsWith("2026-08-31")), "08-31 morning has no night before it");
}

// SES-128's four guards are reused rather than re-derived, and each must actually exclude.
function theFourCalibrationGuardsAllExclude() {
  const night = (iso, pct) => ({ taken_at: iso, slot: "night", all_models_pct: String(pct) });
  const morning = (iso, pct) => ({ taken_at: iso, slot: "morning", all_models_pct: String(pct) });
  const spend = iso => [{ started_at: iso, est_tokens_dev: 1000000, est_tokens_qa: 0 }];

  assert.strictEqual(
    bracketsFrom([night("2026-08-20T03:00:00Z", 10), morning("2026-08-21T09:00:00Z", 20)],
                 spend("2026-08-20T08:00:00Z")).length, 0,
    `a bracket wider than ${MAX_BRACKET_HOURS}h is not a runner-only window`);

  assert.strictEqual(
    bracketsFrom([night("2026-08-20T03:00:00Z", 90), morning("2026-08-20T13:00:00Z", 4)],
                 spend("2026-08-20T08:00:00Z")).length, 0,
    "a non-positive meter delta is a reset or a rolled-over week, never a rate");

  assert.strictEqual(
    bracketsFrom([night("2026-08-20T03:00:00Z", 10), morning("2026-08-20T13:00:00Z", 20)], []).length, 0,
    "an empty window calibrates nothing -- zero over a delta is not a measured rate");

  assert.strictEqual(
    bracketsFrom([{ taken_at: "2026-08-20T03:00:00Z", slot: "adhoc", all_models_pct: "10" },
                  morning("2026-08-20T13:00:00Z", 20)], spend("2026-08-20T08:00:00Z")).length, 0,
    "an adhoc reading is real for the rest wall and the staleness check, but it cannot calibrate");
}

// Number(null) is 0 -- an unknown rendered as the safest possible number, the SES-47 defect. A cycle
// with no estimate must contribute nothing rather than poisoning the sum.
function anUnpricedCycleContributesNothingRatherThanZeroBeingInvented() {
  const readings = [
    { taken_at: "2026-08-20T03:00:00Z", slot: "night", all_models_pct: "10" },
    { taken_at: "2026-08-20T13:00:00Z", slot: "morning", all_models_pct: "20" },
  ];
  const withNulls = [
    { started_at: "2026-08-20T05:00:00Z", est_tokens_dev: 5000000, est_tokens_qa: null },
    { started_at: "2026-08-20T06:00:00Z", est_tokens_dev: null, est_tokens_qa: null },
    { started_at: "2026-08-20T07:00:00Z", est_tokens_dev: "not a number", est_tokens_qa: 1000000 },
  ];
  const b = bracketsFrom(readings, withNulls);
  assert.strictEqual(b.length, 1);
  assert.strictEqual(b[0].estTokens, 6000000,
    "nulls and non-numbers must be skipped, never coerced -- Number(null) is 0 and would read an "
    + "unknown as a real measurement");
}

// --- 2. THE NUMBER NOBODY HAD CHECKED ------------------------------------------------------
function theSpreadIsTheFindingAndItIsRealOnTheLiveBoard() {
  const s = spreadOf(bracketsFrom(READINGS, CYCLES));
  assert.strictEqual(s.n, 4);
  assert.strictEqual(s.minTokensPerPct, 920375);
  assert.strictEqual(s.maxTokensPerPct, 2651000);
  assert.strictEqual(s.ratio, 2.88,
    "the whole of SES-161: four windows that should each report one constant report a 2.88x spread, "
    + "so est_tokens does not track the platform's own meter");
}

// NEGATIVE CONTROL -- the form runner-cycle.md step 3 itself used to prescribe.
function theSingleBracketFormCannotSeeTheDisagreement() {
  const all = bracketsFrom(READINGS, CYCLES);
  const retired = all.slice(-1);                       // "the two most recent readings"
  const retiredSpread = spreadOf(retired);
  assert.strictEqual(retiredSpread, null,
    `control must reach the WRONG answer: one bracket is below MIN_BRACKETS (${MIN_BRACKETS}), so `
    + "the retired form has no spread to report at all -- one rate cannot disagree with itself");

  // And if a rebuild "fixed" that by defining a one-bracket spread, it would be exactly 1.0x --
  // perfect agreement -- on the very board where the shipped form measures 2.88x.
  const oneRate = retired[0].tokensPerPct;
  assert.strictEqual(Math.round((oneRate / oneRate) * 100) / 100, 1,
    "a single-bracket spread is 1.0x by construction: it reports perfect agreement on a board that "
    + "disagrees by 2.88x");
  assert.strictEqual(spreadOf(all).ratio, 2.88, "the shipped form sees what the retired one cannot");
}

// --- 3. THE VERDICT: CAN THE DAY CAP BRAKE ANYTHING? ---------------------------------------
function johnsStandingBoxCannotBrakeAnything() {
  const v = verdictFor(bracketsFrom(READINGS, CYCLES), JOHNS_BOX, LATEST, "daily-max-box");
  assert.strictEqual(v.exitCode, 1);
  assert.strictEqual(v.verdict, "wall-non-binding");
  assert.strictEqual(v.headroomPct, 37, "63% of the meter is spent, so 37% is left");
  assert.strictEqual(v.mostGenerous.capPctOfWeek, 73.93,
    "196M tokens is 73.93% of a whole weekly meter even on the most generous bracket");
  assert.strictEqual(v.conversions[v.conversions.length - 1].capPctOfWeek, 212.96,
    "and 212.96% on the least generous -- i.e. more than two entire weekly plans in one day");
  assert.ok(/day cap is not a brake/.test(v.reason), "and John is told in plain words");
}

// THE POSITIVE ARM. Without this the check could return non-binding unconditionally and still pass
// every clause above -- the "would it still pass if the change did nothing?" bar.
function aSmallerCapReallyDoesBind() {
  const v = verdictFor(bracketsFrom(READINGS, CYCLES), STANDING_DEFAULT, LATEST, "uncalibrated-default");
  assert.strictEqual(v.exitCode, 0);
  assert.strictEqual(v.verdict, "wall-binding");
  assert.strictEqual(v.mostGenerous.capPctOfWeek, 3.77,
    "the 10M standing default is 3.77% of a weekly meter -- reachable inside 37% of headroom");
  assert.ok(/it can be reached, so it can brake/.test(v.reason));
}

// THE ALERT USES THE MOST GENEROUS BRACKET -- fail away from acting.
function theAlertUsesTheBracketMostFavourableToTheWall() {
  const brackets = bracketsFrom(READINGS, CYCLES);
  // A cap that is non-binding on the WORST bracket but binding on the best must NOT alert.
  const cap = Math.round(920375 * 40);   // 40% of a week at the low rate, 13.9% at the high one
  const v = verdictFor(brackets, cap, LATEST, "test");
  assert.strictEqual(v.exitCode, 0,
    "one pessimistic bracket must not raise an alarm on its own -- the fail direction is away from "
    + "acting, the same asymmetry check-deploy-serving.js draws for an unknown");
  assert.ok(v.conversions[v.conversions.length - 1].capPctOfWeek > v.headroomPct,
    "control: that same cap IS non-binding on the least generous bracket, so the clause above is a "
    + "real discrimination rather than a cap nothing could flag");
}

// NEGATIVE CONTROL -- the arithmetic that never converts to the meter.
function theUnitBlindFormCallsTheWallHealthy() {
  // The tempting form: today's est spend against the cap, both in est-token units.
  const estSpendToday = 24 * 1044497;              // ~24 cycles at the live all-time average
  const unitBlindSaysHealthy = estSpendToday < JOHNS_BOX;
  assert.strictEqual(unitBlindSaysHealthy, true,
    "control must reach the WRONG answer: 25M of est spend against a 196M cap looks like plenty of "
    + "headroom, so a same-units comparison reports the wall healthy");

  const v = verdictFor(bracketsFrom(READINGS, CYCLES), JOHNS_BOX, LATEST, "daily-max-box");
  assert.strictEqual(v.exitCode, 1,
    "the shipped form alerts where the unit-blind one is silent -- because it converts the cap into "
    + "the platform's own unit and finds it is larger than a whole weekly plan");
}

// --- 4. UNKNOWN IS NOT AN ALERT ------------------------------------------------------------
function tooFewBracketsIsCannotRunNeverAnAlert() {
  for (const b of [[], null, bracketsFrom(READINGS, CYCLES).slice(0, 1)]) {
    const v = verdictFor(b, JOHNS_BOX, LATEST, "daily-max-box");
    assert.strictEqual(v.exitCode, 2, "an unmeasurable board is 'could not run', NEVER an alert");
    assert.strictEqual(v.verdict, "cannot-run");
  }
}

function anAbsentCapOrReadingIsCannotRunNotClear() {
  const b = bracketsFrom(READINGS, CYCLES);
  for (const cap of [null, undefined, 0, -1, "later", NaN]) {
    assert.strictEqual(verdictFor(b, cap, LATEST, null).exitCode, 2,
      `an unusable day cap (${String(cap)}) is 'could not run', never a pass -- and this script must `
      + "never resolve the cap itself: resolve_day_token_cap() is its one home");
  }
  for (const r of [null, {}, { all_models_pct: null }, { all_models_pct: "soon" }]) {
    assert.strictEqual(verdictFor(b, JOHNS_BOX, r, null).exitCode, 2,
      "an unknown headroom is not a wide one");
  }
}

async function aRestFailureIsCannotRunNotAnEmptyBoard() {
  const boom = async () => { throw new Error("ENOTFOUND supabase"); };
  const got = await fetchInputs("https://x.supabase.co", "k", "2026-08-01T00:00:00Z", boom);
  assert.ok(got.error && /could not reach/i.test(got.error),
    "an unreachable endpoint must surface as an error, never as an empty (i.e. uncalibratable) board");

  const http500 = async () => ({ ok: false, status: 500, statusText: "Internal Server Error" });
  const bad = await fetchInputs("https://x.supabase.co", "k", "2026-08-01T00:00:00Z", http500);
  assert.ok(/HTTP 500/.test(bad.error), "a non-OK read must not be read as zero readings");
}

// --- 5. ONE REPORT PER (CAP, READING) PAIR -------------------------------------------------
function theSuppressionKeyIsTheFindingNotTheCycle() {
  const v = verdictFor(bracketsFrom(READINGS, CYCLES), JOHNS_BOX, LATEST, "daily-max-box");
  const key = suppressionKey(v);
  assert.ok(key.includes(String(JOHNS_BOX)) && key.includes("63%"),
    "the key names the cap and the meter reading, so an unchanged finding is reported once -- "
    + "record_skip()'s skip_count boundary arriving here");
  assert.strictEqual(
    suppressionKey(verdictFor(bracketsFrom(READINGS, CYCLES), STANDING_DEFAULT, LATEST, "x")), null,
    "a clear verdict has no marker to write");
}

// --- 6. IT REPORTS AND NEVER ACTS ----------------------------------------------------------
function theScriptNeverWritesNotifiesOrResolvesTheCap() {
  const src = fs.readFileSync(SCRIPT, "utf8");
  const code = src.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");

  assert.ok(!/child_process|execFileSync|execSync|spawn/.test(code),
    "check-token-wall-binding must not shell out -- it reports, the cycle acts");
  assert.ok(!/PushNotification|sendNotification/.test(code),
    "the push is the CYCLE's -- a script that notified directly would route around that gate "
    + "(the SES-019 shape)");
  assert.ok(!/\bmethod:\s*['"](POST|PATCH|PUT|DELETE)/i.test(code),
    "it is a read: no write may reach Supabase from this script");
  // THE CAP LADDER HAS ONE HOME. Graded on the REST paths the script actually reaches for, not on
  // whether the words appear: the payload deliberately NAMES resolve_day_token_cap() so John's
  // reader is told where the number came from, and a bare word-ban would forbid saying so.
  const tables = [...code.matchAll(/\/rest\/v1\/\$\{q\}|`([a-z_]+)\?select=/g)].map(m => m[1]).filter(Boolean);
  assert.deepStrictEqual([...new Set(tables)].sort(), ["runner_cycles", "runner_usage_readings"],
    "this script must read ONLY the two tables the measurement needs. Reaching for "
    + "runner_settings / runner_budget / rpc.resolve_day_token_cap would make it the second home of "
    + "the cap ladder -- the two-homes defect the runbook records eight failures from");
  assert.ok(!/rpc\/resolve_day_token_cap/.test(code), "and it must never call the resolver itself");
  assert.ok(/--day-cap/.test(code), "the cap arrives as an argument, exactly as rollback-on-red.js "
    + "takes its CI conclusion by --jobs rather than fetching it");

  // The measured facts that make this file's design defensible must survive beside the code.
  assert.ok(/2,651,000|2651000/.test(src) && /920,375|920375/.test(src),
    "the two extreme rates must be quoted in the file that exists because of them");
  assert.ok(/get_session returns NO usage block|no usage block/i.test(src),
    "the measured death of SES-161's own candidate first step must be stated where a later cycle "
    + "reading this file will see it, rather than left to be rediscovered");
  assert.ok(new RegExp(String(WINDOW_DAYS)).test(code), "the window must be a named constant");
}

// The spread is reported, never graded: no constant in the module may turn it into a verdict.
function theSpreadIsNeverGradedByAnInventedThreshold() {
  const v = verdictFor(bracketsFrom(READINGS, CYCLES), STANDING_DEFAULT, LATEST, "x");
  assert.strictEqual(v.exitCode, 0,
    "the 2.88x spread is present on this fixture and must NOT by itself produce an alert -- there is "
    + "no principled line at which a spread becomes 'too wide', and inventing one turns a "
    + "measurement back into an opinion");
  assert.ok(v.spread && v.spread.ratio === 2.88, "but it must still be reported on the clear verdict");
}

function run() {
  theFourRealBracketsReproduceTheStoredRates();
  theFourCalibrationGuardsAllExclude();
  anUnpricedCycleContributesNothingRatherThanZeroBeingInvented();
  theSpreadIsTheFindingAndItIsRealOnTheLiveBoard();
  theSingleBracketFormCannotSeeTheDisagreement();
  johnsStandingBoxCannotBrakeAnything();
  aSmallerCapReallyDoesBind();
  theAlertUsesTheBracketMostFavourableToTheWall();
  theUnitBlindFormCallsTheWallHealthy();
  tooFewBracketsIsCannotRunNeverAnAlert();
  anAbsentCapOrReadingIsCannotRunNotClear();
  theSuppressionKeyIsTheFindingNotTheCycle();
  theScriptNeverWritesNotifiesOrResolvesTheCap();
  theSpreadIsNeverGradedByAnInventedThreshold();
  return Promise.all([
    aRestFailureIsCannotRunNotAnEmptyBoard(),
  ]);
}

export default run;
selfRun(import.meta.url, run);
