// DeepBench v7.0.345 | tests/regression/SES-47-deploy-quota-headroom.js | SES-47
//
// Guards the four decisions in scripts/check-deploy-quota.js that a rebuild gets wrong:
// THE INCLUSIVE THRESHOLD (John's "cross 80" starts AT 80, not at 81), PAGINATION (a single-page
// read can never observe an overrun of a 100 cap read 100 at a time), THE TRAILING WINDOW (never a
// calendar day -- Vercel's reset boundary is not observable here), and THE ACCOUNT-WIDE COUNT (the
// cap is an account limit, so the per-project filter check-deploy-current.js uses would under-count).
//
// TWO CLAUSES CARRY A RETIRED DESIGN APPLIED TO THE SAME FIXTURE AND ASSERTED TO LOSE, so they
// prove a DIFFERENCE from what was rejected rather than a property both forms share:
//
//   * theSinglePageFormCannotSeeAnOverrun() runs the tempting "one request, read pagination never"
//     form on the SAME 137-deployment fixture and asserts it reports 100 where the shipped walk
//     reports 137. Without this clause a build that dropped pagination would pass every other
//     assertion here, because on a quiet day the two agree exactly.
//   * theExclusiveThresholdLetsTheEightiethThrough() runs `used > ALERT_AT` beside the shipped
//     `>=` on used=80 and asserts the retired form stays CLEAR.
//
// THE POLICY IS READ OUT OF THE SHIPPED MODULE, never restated here -- CAP, ALERT_AT and
// WINDOW_HOURS are imported, so a test that "agrees" with a changed constant cannot exist
// (docs/STANDARDS.md Section 4, the SES-45 rule: logic recreated inside a test is a second
// implementation agreeing with itself).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { selfRun } from "./_lib/self-run.js";

import {
  CAP,
  ALERT_AT,
  WINDOW_HOURS,
  verdictFor,
  countInWindow,
  splitByProject,
  fetchAllDeployments,
} from "../../scripts/check-deploy-quota.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "..", "..", "scripts", "check-deploy-quota.js");

const NOW = 1_788_000_000_000; // fixed epoch so the fixtures never depend on wall-clock.
const SINCE = NOW - WINDOW_HOURS * 3600 * 1000;

function deploysAt(n, { project = "deepbench-frontend", offsetMs = 0 } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    uid: `dpl_${project}_${i}`,
    name: project,
    created: SINCE + offsetMs + 1000 + i, // inside the window
  }));
}

// --- 1. John's numbers are the shipped module's, and they are HIS -------------------------
function theNumbersAreJohnsAndAreNamed() {
  assert.strictEqual(CAP, 100, "the free-tier cap is 100/day -- SES-33's measured ceiling");
  assert.strictEqual(ALERT_AT, 80, "John's directive e2c05416 says the alert fires when deploys cross 80");
  assert.strictEqual(WINDOW_HOURS, 24, "the window is a trailing 24h, never a calendar day");
  assert.ok(ALERT_AT < CAP, "an alert line at or above the cap would fire only once it was too late");
}

// --- 2. THE INCLUSIVE THRESHOLD ----------------------------------------------------------
function theThresholdIsInclusiveAt80() {
  assert.strictEqual(verdictFor(0).exitCode, 0, "0 deployments is clear");
  assert.strictEqual(verdictFor(79).exitCode, 0, "79 is below the line and must stay clear");
  assert.strictEqual(verdictFor(80).exitCode, 1, "80 IS the crossing -- John's twenty deploys of headroom start here");
  assert.strictEqual(verdictFor(81).exitCode, 1, "81 alerts");
  assert.strictEqual(verdictFor(79).verdict, "deploy-quota-clear");
  assert.strictEqual(verdictFor(80).verdict, "deploy-quota-alert");
}

// NEGATIVE CONTROL -- the retired exclusive form on the SAME value.
function theExclusiveThresholdLetsTheEightiethThrough() {
  const retired = used => (used > ALERT_AT ? 1 : 0); // the tempting `>` build
  assert.strictEqual(retired(80), 0, "control must reach the WRONG answer at 80, or it proves nothing");
  assert.strictEqual(verdictFor(80).exitCode, 1, "the shipped form alerts where the retired one is silent");
}

// --- 3. Headroom arithmetic, and the overrun stays visible --------------------------------
function remainingIsFlooredButTheOverrunIsNotHidden() {
  const at137 = verdictFor(137);
  assert.strictEqual(at137.remaining, 0, "a day that burned 137 has no headroom -- not -37 of it");
  assert.strictEqual(at137.used, 137, "the real count survives the floor");
  assert.strictEqual(at137.over, 37, "and the overrun is reported rather than swallowed by the floor");
  assert.strictEqual(at137.exitCode, 1);
  assert.strictEqual(verdictFor(40).remaining, 60, "60 left at 40 used");
}

// --- 4. Exit 2 is not a pass and not an alert ---------------------------------------------
function anUnknownCountIsNeitherClearNorAlerting() {
  for (const bad of [null, undefined, NaN, -1, "many"]) {
    const v = verdictFor(bad);
    assert.strictEqual(v.exitCode, 2, `an undeterminable count (${String(bad)}) must be exit 2, never 0`);
    assert.strictEqual(v.verdict, "unknown");
    assert.strictEqual(v.used, null, "and it must not invent a number");
  }
}

// --- 5. THE TRAILING WINDOW ---------------------------------------------------------------
function theWindowIsTrailingNotACalendarDay() {
  // Deployments straddling local midnight: half "yesterday", half "today", all inside 24h.
  const straddling = [
    ...deploysAt(5, { offsetMs: 0 }),                       // just after the window opens
    ...deploysAt(5, { offsetMs: 20 * 3600 * 1000 }),        // 20h later
  ];
  assert.strictEqual(countInWindow(straddling, SINCE), 10,
    "a trailing window counts across a calendar boundary -- a day-scoped count would drop half");
  // Anything older than the window is excluded, so the window is real rather than 'everything'.
  const withOld = [...straddling, { uid: "old", name: "deepbench-frontend", created: SINCE - 60_000 }];
  assert.strictEqual(countInWindow(withOld, SINCE), 10, "a deployment older than the window is not counted");
}

// --- 6. THE ACCOUNT-WIDE COUNT ------------------------------------------------------------
function theCountIsAccountWideAndTheSplitSaysWhereItWent() {
  // STRIP COMMENTS FIRST. The header deliberately QUOTES check-deploy-current.js's `?app=` filter
  // while explaining why this file must not use it, so a raw-source grep matches the explanation
  // and fails a correct build -- SES-182c's own rule, that a guard greps the CODE and never the
  // prose, arriving here as a caught false positive rather than as advice.
  const code = fs.readFileSync(SCRIPT, "utf8")
    .split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");
  // The cap is an account limit. check-deploy-current.js filters ?app=; this must not.
  assert.ok(!/[?&]app=/.test(code),
    "check-deploy-quota must NOT filter by app -- the 100/day cap is account-wide, so a per-project "
    + "filter under-counts the moment a second project exists");
  const mixed = [
    ...deploysAt(7, { project: "deepbench-frontend" }),
    ...deploysAt(3, { project: "some-other-project", offsetMs: 100 }),
  ];
  assert.strictEqual(countInWindow(mixed, SINCE), 10, "both projects count toward the account cap");
  assert.deepStrictEqual(splitByProject(mixed, SINCE),
    { "deepbench-frontend": 7, "some-other-project": 3 },
    "and the split reports where the deployments went");
}

// --- 7. PAGINATION, with its negative control ---------------------------------------------
function stubFetch(pages) {
  let call = 0;
  return async () => {
    const page = pages[Math.min(call, pages.length - 1)];
    call++;
    return { ok: true, status: 200, statusText: "OK", json: async () => page };
  };
}

// 137 deployments across two pages: 100 then 37.
function twoPageFixture() {
  const all = deploysAt(137);
  return {
    all,
    pages: [
      { deployments: all.slice(0, 100), pagination: { count: 100, next: 4242 } },
      { deployments: all.slice(100), pagination: { count: 37, next: null } },
    ],
  };
}

async function thePaginatedWalkSeesTheWholeDay() {
  const { pages } = twoPageFixture();
  const got = await fetchAllDeployments("tok", SINCE, stubFetch(pages));
  assert.ok(!got.error, "the walk must succeed on a well-formed two-page response");
  assert.strictEqual(countInWindow(got.deployments, SINCE), 137,
    "the shipped walk observes all 137 -- an overrun of the 100 cap");
  assert.strictEqual(verdictFor(137).exitCode, 1);
}

// NEGATIVE CONTROL -- the retired single-request form on the SAME fixture.
async function theSinglePageFormCannotSeeAnOverrun() {
  const { pages } = twoPageFixture();
  const retired = async () => (pages[0].deployments || []); // read page 1, ignore pagination.next
  const seen = await retired();
  assert.strictEqual(countInWindow(seen, SINCE), 100,
    "control must reach the WRONG answer -- capped at the page size, i.e. exactly the cap it is measuring");
  const shipped = await fetchAllDeployments("tok", SINCE, stubFetch(pages));
  assert.strictEqual(countInWindow(shipped.deployments, SINCE), 137,
    "the shipped form reports 137 where the retired one reports 100 -- a DIFFERENCE, not a shared property");
}

// A repeated cursor must not spin forever.
async function aRepeatedCursorTerminates() {
  const page = { deployments: deploysAt(3), pagination: { count: 3, next: 7 } };
  const got = await fetchAllDeployments("tok", SINCE, stubFetch([page]));
  assert.ok(!got.error, "a repeating cursor is not an error");
  assert.ok(got.deployments.length <= 3 * 25, "and it must terminate rather than walk forever");
}

// --- 8. Transport failure is exit 2, never a clear ----------------------------------------
async function anApiFailureIsCannotRunNotClear() {
  const failing = async () => { throw new Error("ENOTFOUND api.vercel.com"); };
  const got = await fetchAllDeployments("tok", SINCE, failing);
  assert.ok(got.error, "an unreachable API must surface as an error");
  assert.ok(/could not reach/i.test(got.error));

  const http500 = async () => ({ ok: false, status: 500, statusText: "Internal Server Error" });
  const bad = await fetchAllDeployments("tok", SINCE, http500);
  assert.ok(/HTTP 500/.test(bad.error), "a non-OK response must not be read as an empty day");
}

// --- 9. IT REPORTS AND NEVER REMEDIATES ---------------------------------------------------
function theScriptNeverActs() {
  const src = fs.readFileSync(SCRIPT, "utf8");
  assert.ok(!/child_process|execFileSync|execSync|spawn/.test(src),
    "check-deploy-quota must not shell out -- it reports, the cycle acts");
  assert.ok(!/PushNotification|sendNotification/.test(src),
    "the push is the CYCLE's, gated to one per crossing in the runbook -- a script that notified "
    + "directly would route around that gate (the SES-019 shape)");
  // John's standing prohibition must survive as a written warning next to the code it binds.
  assert.ok(/no cycle may upgrade on its own/i.test(src),
    "the header must carry John's prohibition verbatim -- a later cycle reading a red number is "
    + "exactly who needs it");
  assert.ok(/trailing 24 hours|trailing \$\{?window/i.test(src) || /TRAILING 24 HOURS/.test(src),
    "the window choice must be stated in the file that makes it");
}

function run() {
  theNumbersAreJohnsAndAreNamed();
  theThresholdIsInclusiveAt80();
  theExclusiveThresholdLetsTheEightiethThrough();
  remainingIsFlooredButTheOverrunIsNotHidden();
  anUnknownCountIsNeitherClearNorAlerting();
  theWindowIsTrailingNotACalendarDay();
  theCountIsAccountWideAndTheSplitSaysWhereItWent();
  theScriptNeverActs();
  return Promise.all([
    thePaginatedWalkSeesTheWholeDay(),
    theSinglePageFormCannotSeeAnOverrun(),
    aRepeatedCursorTerminates(),
    anApiFailureIsCannotRunNotClear(),
  ]);
}

selfRun(import.meta.url, run);
export default run;
