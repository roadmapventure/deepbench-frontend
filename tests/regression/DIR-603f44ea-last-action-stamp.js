// DeepBench v7.0.172 | tests/regression/DIR-603f44ea-last-action-stamp.js | directive 603f44ea
// FEATURE: the briefing masthead's last-action stamp. John's line, verbatim: "Need a timestamp
// of the last action on this page at the very top next to the count of decisions. I can't tell
// what time my last action was compared to if the page has refreshed yet."
//
// This suite guards the four properties that decide whether that stamp tells him the truth:
//
//   1. IT IS DERIVED FROM briefing-state, not typed by a cycle. The functions under test are
//      READ OUT OF docs/runbooks/briefing-template.html itself, so a rebuild that quietly
//      replaced them with a literal string fails here rather than shipping a masthead that can
//      disagree with the cards under it (the SES-124 countWaiting() rule).
//   2. A RUNNER REPLY IS NOT JOHN'S ACTION. An ask thread holds both his questions and the
//      runner's answers, and both carry an `at`. Fixture 3 is the red control: its newest `at`
//      by far belongs to a `[runner, …]` entry, so a build without the filter reports the
//      runner's timestamp as "your last action" — and, worse, draws the "not picked up yet"
//      line about the runner's own reply.
//   3. THE COMPARISON IS REAL. "Not picked up by a run yet" appears when, and only when, his
//      newest action is strictly after PAGE_BUILT. That line is the half of his sentence a bare
//      timestamp misses; a build that always shows it, or never does, passes a presence check
//      and fails him.
//   4. A BAD STAMP IS SKIPPED, NEVER RENDERED. Fixture 5 carries an unparseable `at`. The
//      masthead must fall back to the next real action rather than print "Invalid Date" — the
//      same rule as a NULL plain_* drawing a defect line instead of an invented sentence.
//
// No network, no credentials. It reads one repo file and evaluates the block it extracts.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(__dirname, "..", "..", "docs", "runbooks", "briefing-template.html");

// Pull the shipped source out of the template. The slice runs from the first function of the
// stamp block to `function wire(){`, which is what makes this a test of the real page rather
// than of a copy that can drift away from it.
export function extractStampBlock(html) {
  const start = html.indexOf("function isRunnerEntry(");
  const end = html.indexOf("function wire(){", start);
  if (start < 0 || end < 0) {
    throw new Error("stamp block not found in briefing-template.html — the masthead's " +
      "last-action stamp (directive 603f44ea) was removed or renamed");
  }
  return html.slice(start, end);
}

export function extractPageBuilt(html) {
  const m = html.match(/var PAGE_BUILT = '([^']*)';/);
  if (!m) throw new Error("PAGE_BUILT not found in briefing-template.html");
  return m[1];
}

// Build a callable stamp API over a fixture state and a fixture build time.
function load(src, state, pageBuilt) {
  const el = { innerHTML: "" };
  const doc = { getElementById: id => (id === "lastact" ? el : null) };
  const esc = x => String(x == null ? "" : x)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const api = new Function("state", "PAGE_BUILT", "document", "esc",
    src + "\nreturn { lastAction: lastAction, stampLastAction: stampLastAction, cst: cst };"
  )(state, pageBuilt, doc, esc);
  return { api, el };
}

function stamp(src, state, pageBuilt) {
  const { api, el } = load(src, state, pageBuilt);
  api.stampLastAction();
  return el.innerHTML;
}

async function run() {
  const html = fs.readFileSync(TEMPLATE, "utf8");
  const src = extractStampBlock(html);

  // ---- The shipped constant is a real, parseable UTC minute -------------------------------
  const built = extractPageBuilt(html);
  assert.match(built, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/,
    `PAGE_BUILT must be a 'YYYY-MM-DDTHH:MMZ' UTC minute, got ${built}`);
  assert.ok(!isNaN(Date.parse(built)), `PAGE_BUILT does not parse: ${built}`);

  // ---- The masthead slot exists and is rendered EMPTY --------------------------------------
  assert.ok(html.includes('<span class="la" id="lastact"></span>'),
    "#lastact must be rendered empty in the masthead and filled by stampLastAction()");
  assert.ok(/function wire\(\)\{\s*\n\s*countWaiting\(\);\s*\n\s*stampLastAction\(\);/.test(html),
    "stampLastAction() must be called from wire(), beside countWaiting()");

  // CST is UTC-5 in August (America/Chicago, CDT), so 01:13Z on the 23rd is 8:13 PM on the 22nd.
  // Expectation written out by hand rather than by calling the code under test.
  const CST_0113Z = "Aug 22, 8:13 PM";

  // ---- 1. Empty state ----------------------------------------------------------------------
  let out = stamp(src, { items: {}, answers: {}, asks: {}, unblocks: {}, reading: {} },
    "2026-08-23T02:00Z");
  assert.ok(out.includes("No actions recorded yet"), `empty state: got ${out}`);
  assert.ok(out.includes("Page rebuilt"), "empty state must still show the rebuild time");
  assert.ok(!out.includes("Invalid Date"), "empty state must never render Invalid Date");
  assert.ok(!out.includes("stale"), "empty state has no action, so nothing can be unpicked-up");

  // ---- 2. John's taps, page rebuilt after them ---------------------------------------------
  const johnState = {
    items: { "item-a": { decision: "accept", at: "2026-08-23T00:10Z" } },
    answers: { "q-x": { a: "yes", at: "2026-08-23T01:13Z" } },
    asks: { "item-a": [{ q: "why this one?", at: "2026-08-23T00:55Z" }] },
    unblocks: {}, reading: { morning: { fable: "20", all: "18", at: "2026-08-22T13:50Z" } },
  };
  out = stamp(src, johnState, "2026-08-23T02:00Z");
  assert.ok(out.includes("Your last action " + CST_0113Z + " CST"),
    `newest John tap should render as ${CST_0113Z} CST, got ${out}`);
  assert.ok(!out.includes("stale"),
    "a page rebuilt after his newest tap has picked it up — no 'not picked up' line");

  // ---- 3. RED CONTROL: a runner reply is newer than every one of John's taps ----------------
  const withRunnerReply = JSON.parse(JSON.stringify(johnState));
  withRunnerReply.asks["item-a"].push({
    q: "[runner, 2026-08-23T01:50Z] Here is what I did about your question.",
    at: "2026-08-23T01:50Z", a: "…",
  });
  out = stamp(src, withRunnerReply, "2026-08-23T02:00Z");
  assert.ok(out.includes("Your last action " + CST_0113Z + " CST"),
    "a '[runner, …]' ask entry is the RUNNER's action and must not be reported as John's — " +
    `expected ${CST_0113Z}, got ${out}`);
  assert.ok(!out.includes("stale"),
    "the runner's own reply must not raise 'not picked up by a run yet'");

  // ---- 4. His action is newer than the page --------------------------------------------------
  out = stamp(src, johnState, "2026-08-23T00:30Z");
  assert.ok(out.includes("Not picked up by a run yet"),
    `an action after PAGE_BUILT must say so, got ${out}`);
  // Same minute is NOT newer — `at` is minute-precision on both sides.
  out = stamp(src, johnState, "2026-08-23T01:13Z");
  assert.ok(!out.includes("Not picked up by a run yet"),
    "an action inside the rebuild's own minute is not evidence it was missed");

  // ---- 5. The directive box counts, and a malformed stamp is skipped -------------------------
  const withDirective = JSON.parse(JSON.stringify(johnState));
  withDirective.directive = "do the thing";
  withDirective.directive_at = "2026-08-23T01:40Z";
  const { api } = load(src, withDirective, "2026-08-23T02:00Z");
  assert.strictEqual(api.lastAction(), "2026-08-23T01:40Z",
    "typing a directive is an action on this page and must count");

  const withGarbage = JSON.parse(JSON.stringify(johnState));
  withGarbage.items["item-b"] = { decision: "accept", at: "whenever" };
  out = stamp(src, withGarbage, "2026-08-23T02:00Z");
  assert.ok(!out.includes("Invalid Date") && out.includes("Your last action " + CST_0113Z),
    `an unparseable 'at' must be skipped, not rendered — got ${out}`);
}

export default run;
selfRun(import.meta.url, run);
