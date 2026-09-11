// DeepBench v7.0.455 | tests/regression/ses-374-meter-reader.test.mjs | SES-374
//
// FEATURE: SES-374 -- the scheduled meter reader (scripts/read-usage-meter.js). Guards the PARSER,
// which is the only pure part: the three meter lines the Claude Code CLI prints for /usage become one
// runner_usage_readings row. Captured output from 2026-09-11 is the fixture, so a CLI wording change
// shows up here as a red rather than as a silent stream of exit-2s in a scheduled task nobody reads.
//
// ONE ARM, ALWAYS RUNS. Running the CLI needs John's subscription login and writing a row needs the
// service key; neither belongs in a regression test (the SES-196 / SES-218 / SES-275 refusal). The
// live half is proven at install: the first scheduled row with source 'meter-reader'.
//
// Every clause has a negative control -- "would this still pass if the parser did nothing?"

import assert from "node:assert/strict";
import { parseUsage, CLI_ARGS } from "../../scripts/read-usage-meter.js";
import { selfRun } from "./_lib/self-run.js";

// Verbatim from `claude -p "/usage" --output-format text` on John's machine, 2026-09-11 12:50 CT.
export const CAPTURED = `You are currently using your subscription to power your Claude Code usage

Current session: 22% used · resets Sep 11, 3:10pm (America/Chicago)
Current week (all models): 10% used · resets Sep 18, 1am (America/Chicago)
Current week (Fable): 18% used · resets Sep 18, 1am (America/Chicago)

What's contributing to your limits usage?
Approximate, based on local sessions on this machine — does not include other devices or claude.ai. Behaviors are independent characteristics, not a breakdown.

Last 24h · 457 requests · 7 sessions
  90% of your usage was at >150k context
  87% of your usage came from subagent-heavy sessions
`;

// The CLI's answer before John ran `claude auth login` that morning.
export const LOGGED_OUT = `OAuth session expired and could not be refreshed. Please run /login or claude auth login.\n`;

function theCapturedOutputParses() {
  const p = parseUsage(CAPTURED);
  assert.ok(!p.error, `captured output must parse; got ${JSON.stringify(p)}`);
  assert.strictEqual(p.session5hPct, 22);
  assert.strictEqual(p.allModelsPct, 10);
  assert.strictEqual(p.fablePct, 18);
  assert.strictEqual(p.resets.week, "Sep 18, 1am (America/Chicago)");
  assert.strictEqual(p.resets.session, "Sep 11, 3:10pm (America/Chicago)");
}

function aZeroReadingIsAReading() {
  // The session meter resets every 5h; 0% is a real value, not a missing one (the NULL-is-not-zero rule).
  const p = parseUsage(CAPTURED.replace("Current session: 22%", "Current session: 0%"));
  assert.ok(!p.error && p.session5hPct === 0, `0% must parse as 0, got ${JSON.stringify(p)}`);
}

function theLoggedOutAnswerIsNamed() {
  const p = parseUsage(LOGGED_OUT);
  assert.strictEqual(p.error, "cli-logged-out", `a logged-out CLI must be named, got ${JSON.stringify(p)}`);
  assert.ok(/claude auth login/.test(p.detail), "the detail must tell John the command that fixes it");
}

function everyClauseHasTeeth() {
  // Controls: each mangled variant must be refused, and refused for the line that was mangled.
  const cases = [
    ["all models line missing", CAPTURED.replace(/^Current week \(all models\).*$/m, ""), /all models/],
    ["Fable line missing", CAPTURED.replace(/^Current week \(Fable\).*$/m, ""), /Fable/],
    ["session line missing", CAPTURED.replace(/^Current session.*$/m, ""), /Current session/],
    ["percentage out of range", CAPTURED.replace("10% used", "140% used"), /outside 0\.\.100/],
    ["percent sign gone", CAPTURED.replace("10% used", "10 used"), /all models/],
    ["empty output", "", /all models/],
  ];
  for (const [label, text, want] of cases) {
    const p = parseUsage(text);
    assert.ok(p.error, `control "${label}": the parser accepted broken output -- it pins nothing`);
    assert.ok(want.test(p.detail), `control "${label}": refused for the wrong reason: ${p.detail}`);
  }
  // A logged-out banner followed by a real meter is a meter (the banner alone is what means logged out).
  const both = parseUsage(LOGGED_OUT + CAPTURED);
  assert.ok(!both.error && both.allModelsPct === 10, "a banner plus a real meter must parse as the meter");
}

function theCliInvocationIsTheProvenOne() {
  // The exact invocation John confirmed accurate on 2026-09-11 ("yes accurate"). Changing the model
  // or the turn cap changes what the CLI spends to answer; changing --output-format breaks the parser.
  assert.deepStrictEqual(CLI_ARGS, ["-p", "/usage", "--model", "claude-haiku-4-5", "--max-turns", "1", "--output-format", "text"]);
}

export function run() {
  theCapturedOutputParses();
  aZeroReadingIsAReading();
  theLoggedOutAnswerIsNamed();
  everyClauseHasTeeth();
  theCliInvocationIsTheProvenOne();
  console.log("  [PASS] ses-374-meter-reader.test.mjs");
  console.log("         parser: captured 2026-09-11 output -> 22/10/18 with both reset instants; logged-out named; 6 controls red; CLI args pinned");
}

selfRun(import.meta.url, run);
export default run;
