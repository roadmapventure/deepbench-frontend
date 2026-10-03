// DeepBench v7.0.204 | tests/regression/SES-162-briefing-automation.js | SES-162
// FEATURE: SES-162 -- §2b's cycle-written half is derived, not sample text.
//
// WHY THIS EXISTS. scripts/build-briefing.mjs derived thirteen sections and had NO anchor for the
// AUTOMATION object, so every page it built published briefing-template.html's SAMPLE values.
// Found live 2026-08-23T18:1xZ on the SERVED artifact: John's panel told him his last run was
// "sample value -- 12:41 AM CST · SES-143 · shipped" and his standing drain had 17 tickets left
// against a live 11. Nothing failed; the page simply lied quietly, which is the failure mode a
// regression test is for.
//
// ASSERTION 2 IS THE DISCRIMINATING ONE, and it is the reason nextFireChicago walks a wall clock
// instead of doing offset arithmetic. Since SES-151 the scheduler grid is an America/Chicago HOUR
// divisible by interval_hours -- 12/3/6/9 on John's clock. The obvious implementation picks the
// next UTC hour divisible by the interval, and that is RIGHT FOR HALF THE YEAR: at the CST offset
// of 6 it happens to agree, and at the CDT offset of 5 it silently lands an hour off the grid.
// The assertion pins both halves of that, so a future "simplification" back to UTC fails here in
// summer rather than on John's page.
//
// ASSERTION 6 IS THE ANCHOR CONTROL. The builder splices between two literals in the template; if
// either moves, the builder must die at exit 2 rather than publish sample text again. This test
// fails if the splice call or either anchor disappears -- which is what makes the fix durable
// rather than a thing the next template edit can quietly undo.
//
// No network, no credentials: the pure helpers live in scripts/lib/briefing-automation.mjs
// precisely so this file can import them without running the builder.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import {
  nextFireChicago, chicagoHourMinute, chicagoClock,
  PLAIN_OUTCOME, automationLiteral,
} from "../../scripts/lib/briefing-automation.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILDER = path.join(HERE, "..", "..", "scripts", "build-briefing.mjs");
const TEMPLATE = path.join(HERE, "..", "..", "docs", "runbooks", "briefing-template.html");

// The retired implementation, written out so the control is a real comparison rather than a claim:
// the next instant whose UTC hour is divisible by the interval.
function nextFireNaiveUtc(now, intervalHours, cronMinute) {
  const base = now.getTime();
  for (let i = 1; i <= 60 * 48; i++) {
    const t = new Date(base + i * 60000);
    if (t.getUTCMinutes() === cronMinute && t.getUTCHours() % intervalHours === 0) return t;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1. The grid: the answer is always a Chicago hour divisible by the interval,
//    at the cron minute, and strictly in the future.
// ---------------------------------------------------------------------------
function landsOnJohnsGrid() {
  const from = new Date("2026-08-23T18:08:00Z");   // 1:08 PM CDT
  const t = nextFireChicago(from, 3, 40);
  assert.ok(t instanceof Date, "a fire time must be returned");
  assert.ok(t.getTime() > from.getTime(), "the next fire must be in the future");
  const { hour, minute } = chicagoHourMinute(t);
  assert.strictEqual(minute, 40, "must land on the cron minute");
  assert.strictEqual(hour % 3, 0, `Chicago hour ${hour} is not on the 12/3/6/9 grid`);
  assert.strictEqual(chicagoClock(t), "3:40 PM", "the next fire after 1:08 PM CST is 3:40 PM CST");
}

// ---------------------------------------------------------------------------
// 2. THE DISCRIMINATING ONE. The UTC implementation is right in winter and an
//    hour off the grid in summer. Both halves asserted.
// ---------------------------------------------------------------------------
function utcImplementationDriftsInSummer() {
  // Summer (CDT, UTC-5) -- the two implementations DISAGREE and the naive one is off-grid.
  const summer = new Date("2026-08-23T18:08:00Z");
  const mine = nextFireChicago(summer, 3, 40);
  const naive = nextFireNaiveUtc(summer, 3, 40);
  assert.notStrictEqual(
    mine.getTime(), naive.getTime(),
    "in summer the UTC implementation must differ -- if these agree the control is not testing " +
    "anything and the offsets have changed",
  );
  assert.strictEqual(
    chicagoHourMinute(naive).hour % 3 === 0, false,
    "the UTC implementation must land OFF John's clock grid in summer -- that is the drift " +
    "SES-151 killed at the gate and this assertion keeps out of the render",
  );
  assert.strictEqual(chicagoHourMinute(mine).hour % 3, 0, "mine must stay on the grid");

  // Winter (CST, UTC-6) -- they agree, which is exactly why the bug survives review.
  const winter = new Date("2026-12-15T18:08:00Z");
  assert.strictEqual(
    nextFireChicago(winter, 3, 40).getTime(), nextFireNaiveUtc(winter, 3, 40).getTime(),
    "in winter the two agree -- stated so nobody reads assertion 2 as 'UTC is always wrong'",
  );
}

// ---------------------------------------------------------------------------
// 3. DST transitions: the grid still holds across spring-forward and fall-back.
// ---------------------------------------------------------------------------
function survivesDstTransitions() {
  for (const [label, iso] of [
    ["fall back", "2026-11-01T04:00:00Z"],
    ["spring forward", "2027-03-14T05:00:00Z"],
  ]) {
    const t = nextFireChicago(new Date(iso), 3, 40);
    assert.ok(t, `${label}: a fire time must still be found`);
    const { hour, minute } = chicagoHourMinute(t);
    assert.strictEqual(minute, 40, `${label}: cron minute`);
    assert.strictEqual(hour % 3, 0, `${label}: Chicago hour ${hour} left the grid`);
  }
}

// ---------------------------------------------------------------------------
// 4. Guards return null rather than a wrong time.
// ---------------------------------------------------------------------------
function guardsReturnNull() {
  const now = new Date("2026-08-23T18:08:00Z");
  for (const bad of [0, 25, 1.5, "x", null]) {
    assert.strictEqual(nextFireChicago(now, bad, 40), null, `interval ${bad} must return null`);
  }
  for (const bad of [-1, 60, 1.5, "x"]) {
    assert.strictEqual(nextFireChicago(now, 3, bad), null, `minute ${bad} must return null`);
  }
}

// ---------------------------------------------------------------------------
// 5. John's language rule: outcomes render as plain words, never the column's
//    underscores, and a blank box is `null` -- never 0.
// ---------------------------------------------------------------------------
function plainWordsAndNullNotZero() {
  assert.strictEqual(PLAIN_OUTCOME.did_not_run, "did not run");
  assert.strictEqual(PLAIN_OUTCOME.gated_before_build, "gated before build");
  for (const v of Object.values(PLAIN_OUTCOME)) {
    assert.ok(!v.includes("_"), `"${v}" leaks an underscore into what John reads`);
  }
  const blank = automationLiteral({
    scheduler_on: true, interval_hours: 3, drain_on: false, drain_epic: "Automation",
    drain_left: 0, drain_named: 0, drain_history: [], daily_max_millions: null,
    daily_max_effective: "x", last_cycle: "y", next_fire: "z",
  });
  assert.ok(
    /daily_max_millions: null/.test(blank),
    "a blank box must render as null -- 0 would read as 'no tokens allowed today', a number " +
    "John never typed",
  );
  assert.ok(!/daily_max_millions: 0\b/.test(blank), "and must never render as 0");
  // The literal is spliced into the page; it has to actually parse.
  assert.doesNotThrow(() => new Function(blank), "automationLiteral must emit valid JS");
}

// ---------------------------------------------------------------------------
// 6. ANCHOR CONTROL. The builder must still perform the §2b splice, and both
//    template anchors must still be there for it to splice between.
// ---------------------------------------------------------------------------
function builderStillSplicesSection2b() {
  const b = fs.readFileSync(BUILDER, "utf8");
  assert.ok(
    b.includes("'§2b AUTOMATION'"),
    "build-briefing.mjs must splice §2b -- without it every rebuild republishes the template's " +
    "sample values, which is the defect SES-162 fixed",
  );
  assert.ok(b.includes("deriveAutomation"), "and must call the derivation");
  const t = fs.readFileSync(TEMPLATE, "utf8");
  assert.ok(t.includes("var AUTOMATION = {"), "the template's opening anchor must survive");
  assert.ok(
    t.includes("// v7.0.172, directive 603f44ea"),
    "the closing anchor must survive -- if it moves, the builder dies at exit 2, which is the " +
    "designed behaviour, but this test is what tells you before a rebuild does",
  );
}

async function run() {
  landsOnJohnsGrid();
  utcImplementationDriftsInSummer();
  survivesDstTransitions();
  guardsReturnNull();
  plainWordsAndNullNotZero();
  builderStillSplicesSection2b();
}

selfRun(import.meta.url, run);
export default run;
