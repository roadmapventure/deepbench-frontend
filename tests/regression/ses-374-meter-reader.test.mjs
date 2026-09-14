// DeepBench v7.0.484 | tests/regression/ses-374-meter-reader.test.mjs | SES-388 -- a second arm:
// the SAME three numbers taken from rate-limit headers, which is how the always-on GitHub reader
// takes them. Both arms always run; both are pure, and neither needs a login or the service key.
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
import { parseUsage, CLI_ARGS, parseRateLimitHeaders, readViaHeaders, HEADER_MODELS, MESSAGES_URL } from "../../scripts/read-usage-meter.js";
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

// --- SES-388: the same three numbers, read from rate-limit headers -----------------------------
//
// VERBATIM from the two GitHub runs the design measured (34864955276 and 34865128090) -- the general
// call carries 5h + 7d utilization and both reset epochs, and ONLY the Fable call carries -7d_oi-,
// which is the Fable week. 0.57 is the machine's 57% and 0.91 is the Fable week John was at that day,
// so these fixtures are the live numbers rather than invented ones.
export const HEADERS_GENERAL = {
  "anthropic-ratelimit-unified-5h-utilization": "0.07",
  "anthropic-ratelimit-unified-5h-reset": "1789407600",
  "anthropic-ratelimit-unified-7d-utilization": "0.57",
  "anthropic-ratelimit-unified-7d-reset": "1789711200",
};
export const HEADERS_FABLE = {
  ...HEADERS_GENERAL,
  "anthropic-ratelimit-unified-7d_oi-utilization": "0.91",
};

function withoutHeader(bag, name) {
  const copy = { ...bag };
  delete copy[name];
  return copy;
}

function theMeasuredHeadersParse() {
  const p = parseRateLimitHeaders(HEADERS_GENERAL, HEADERS_FABLE);
  assert.ok(!p.error, `the measured headers must parse; got ${JSON.stringify(p)}`);
  assert.strictEqual(p.session5hPct, 7);
  assert.strictEqual(p.allModelsPct, 57);
  assert.strictEqual(p.fablePct, 91);
  // The reset instants are the epoch seconds rendered the way the CLI renders the same two moments:
  // minutes only when they are not :00. 1789711200 IS "Sep 18, 1am" in America/Chicago.
  assert.strictEqual(p.resets.week, "Sep 18, 1am (America/Chicago)");
  assert.strictEqual(p.resets.session, "Sep 14, 12:40pm (America/Chicago)");
}

function aFullWeekIsAHundred() {
  // Utilization is a FRACTION, not a percentage. A parser that forgot the x100 would report 1 here
  // and 0 for every real reading, and the pace gate would never fire again.
  const p = parseRateLimitHeaders(
    { ...HEADERS_GENERAL, "anthropic-ratelimit-unified-7d-utilization": "1" },
    HEADERS_FABLE);
  assert.ok(!p.error, `utilization 1 must parse; got ${JSON.stringify(p)}`);
  assert.strictEqual(p.allModelsPct, 100, "utilization 1 is 100%, not 1%");
  // Control on the control: a zero utilization is a real reading, not a missing one (NULL-is-not-zero).
  const zero = parseRateLimitHeaders(
    { ...HEADERS_GENERAL, "anthropic-ratelimit-unified-5h-utilization": "0" },
    HEADERS_FABLE);
  assert.ok(!zero.error && zero.session5hPct === 0, `0 must parse as 0, got ${JSON.stringify(zero)}`);
}

function everyMissingHeaderIsNamed() {
  // The failure this guards is a parser that returns ZEROS when a header is absent -- a silent 0%
  // reading is the one answer the pace gate cannot tell from a real one. Each control must be an
  // error, and the detail must name the header that went missing.
  const cases = [
    ["Fable week gone", HEADERS_GENERAL, withoutHeader(HEADERS_FABLE, "anthropic-ratelimit-unified-7d_oi-utilization"), /7d_oi-utilization/],
    ["5h utilization gone", withoutHeader(HEADERS_GENERAL, "anthropic-ratelimit-unified-5h-utilization"), HEADERS_FABLE, /5h-utilization/],
    ["7d utilization gone", withoutHeader(HEADERS_GENERAL, "anthropic-ratelimit-unified-7d-utilization"), HEADERS_FABLE, /7d-utilization/],
    ["week reset gone", withoutHeader(HEADERS_GENERAL, "anthropic-ratelimit-unified-7d-reset"), HEADERS_FABLE, /7d-reset/],
    ["session reset gone", withoutHeader(HEADERS_GENERAL, "anthropic-ratelimit-unified-5h-reset"), HEADERS_FABLE, /5h-reset/],
    ["no headers at all", {}, {}, /5h-utilization/],
    ["utilization is not a number", { ...HEADERS_GENERAL, "anthropic-ratelimit-unified-7d-utilization": "n/a" }, HEADERS_FABLE, /not a number/],
    ["utilization out of range", { ...HEADERS_GENERAL, "anthropic-ratelimit-unified-7d-utilization": "1.4" }, HEADERS_FABLE, /outside 0\.\.1/],
  ];
  for (const [label, general, fable, want] of cases) {
    const p = parseRateLimitHeaders(general, fable);
    assert.strictEqual(p.error, "parse", `control "${label}": accepted a broken header bag -- it pins nothing`);
    assert.ok(want.test(p.detail), `control "${label}": refused for the wrong reason: ${p.detail}`);
  }
  // The Fable week must be read from the FABLE call. Swapping the two bags leaves -7d_oi- present in
  // the pair but absent where the parser must look, so a parser that took it from either response
  // would go green here.
  const wrongSide = parseRateLimitHeaders(HEADERS_FABLE, HEADERS_GENERAL);
  assert.strictEqual(wrongSide.error, "parse", "the Fable week must be read from the Fable response");
}

function headerNamesAreMatchedCaseInsensitively() {
  // Node's fetch lower-cases header names; a hand-built bag (and curl's -D dump) does not.
  const shouty = Object.fromEntries(Object.entries(HEADERS_GENERAL).map(([k, v]) => [k.toUpperCase(), v]));
  const p = parseRateLimitHeaders(shouty, HEADERS_FABLE);
  assert.ok(!p.error && p.allModelsPct === 57, `upper-cased header names must still parse; got ${JSON.stringify(p)}`);
}

async function theTwoProbesAreTheMeasuredCall() {
  // SEAM PROOF (labelled as one): readViaHeaders is driven with a stub fetch, so what is asserted is
  // the request the SHIPPED function builds, not a description of it. The call is made for its
  // headers -- max_tokens 1 -- and the OAuth beta header is what makes a setup-token accepted at all.
  const seen = [];
  const stub = async (url, init) => {
    seen.push({ url, init, body: JSON.parse(init.body) });
    const bag = seen.length === 1 ? HEADERS_GENERAL : HEADERS_FABLE;
    return { status: 200, headers: bag, text: async () => "" };
  };
  const p = await readViaHeaders("tok-not-a-real-token", stub);
  assert.ok(!p.error, `the stubbed probes must parse; got ${JSON.stringify(p)}`);
  assert.strictEqual(p.fablePct, 91);
  assert.strictEqual(seen.length, 2, "the Fable week needs its own call -- one call cannot carry it");
  assert.deepStrictEqual(seen.map(s => s.body.model), [HEADER_MODELS.general, HEADER_MODELS.fable]);
  for (const s of seen) {
    assert.strictEqual(s.url, MESSAGES_URL);
    assert.strictEqual(s.init.method, "POST");
    assert.strictEqual(s.body.max_tokens, 1, "the reading is the headers, never the answer");
    assert.strictEqual(s.init.headers["anthropic-beta"], "oauth-2025-04-20");
    assert.strictEqual(s.init.headers["anthropic-version"], "2023-06-01");
    assert.strictEqual(s.init.headers.Authorization, "Bearer tok-not-a-real-token");
  }
}

async function aRefusedProbeIsNamedNotSwallowed() {
  // The measured refusal: 403 oauth_scope_insufficient is what this token gets from the endpoint the
  // CLI path would use, and a reader that turned any non-2xx into zeros would write a fake 0% row.
  const refusing = async () => ({ status: 403, headers: {}, text: async () => JSON.stringify({ error: { type: "oauth_scope_insufficient" } }) });
  const p = await readViaHeaders("tok", refusing);
  assert.strictEqual(p.error, "headers-refused", `a 403 must be named, got ${JSON.stringify(p)}`);
  assert.ok(p.detail.includes("HTTP 403"), `the detail must carry the status: ${p.detail}`);
  assert.ok(p.detail.includes(HEADER_MODELS.general), `the detail must name the model: ${p.detail}`);
  assert.ok(p.detail.includes("oauth_scope_insufficient"), `the detail must carry the body: ${p.detail}`);
  // A refusal on the SECOND call is a refusal too -- never a reading with the Fable week missing.
  let n = 0;
  const secondRefuses = async () => (++n === 1
    ? { status: 200, headers: HEADERS_GENERAL, text: async () => "" }
    : { status: 429, headers: {}, text: async () => "rate limited" });
  const p2 = await readViaHeaders("tok", secondRefuses);
  assert.strictEqual(p2.error, "headers-refused", `a refused Fable probe must be named, got ${JSON.stringify(p2)}`);
  assert.ok(p2.detail.includes(HEADER_MODELS.fable), `the detail must name the Fable model: ${p2.detail}`);
}

export async function run() {
  theCapturedOutputParses();
  aZeroReadingIsAReading();
  theLoggedOutAnswerIsNamed();
  everyClauseHasTeeth();
  theCliInvocationIsTheProvenOne();
  theMeasuredHeadersParse();
  aFullWeekIsAHundred();
  everyMissingHeaderIsNamed();
  headerNamesAreMatchedCaseInsensitively();
  await theTwoProbesAreTheMeasuredCall();
  await aRefusedProbeIsNamedNotSwallowed();
  console.log("  [PASS] ses-374-meter-reader.test.mjs");
  console.log("         CLI parser: captured 2026-09-11 output -> 22/10/18 with both reset instants; logged-out named; 6 controls red; CLI args pinned");
  console.log("         header parser: measured 2026-09-14 GitHub headers -> 7/57/91, resets Sep 18 1am / Sep 14 12:40pm CT; 9 controls red; two probes seam-proved");
}

selfRun(import.meta.url, run);
export default run;
