// DeepBench v7.0.207 | tests/regression/SES-163-briefing-derive.js | SES-163
// FEATURE: SES-163 -- the briefing rebuild is derived, and a re-keyed card can no longer orphan
// John's ask thread silently.
//
// WHY THIS EXISTS. scripts/build-briefing.mjs required 21 distinct --data fields plus 12 more
// inside data.stats -- 33 hand-authored values, several of them raw HTML -- before a cycle could
// republish. TWO consecutive cycles declined the rebuild rather than author them, so the served
// page went stale with 6 of 17 undecided cards filed after it, sitting on no surface John could
// tap. Since SES-154 made his Accept the only writer of `done`, that converts every delivery into
// permanently unfinished work. Nothing errored; the page simply stopped being rebuilt, which is
// exactly the failure mode a regression test is for.
//
// ASSERTION 1 IS THE DISCRIMINATING ONE and it is a real negative control: same ask target, same
// rendered card, ONE variable -- whether public.briefing_dom_ids claims the id. The retired
// builder read the map from `data.fixed_dom_ids || {}`, so an omitted map was indistinguishable
// from having none, and SES-132's §9.1 orphan renderer still displayed the thread's text. The
// failure was therefore invisible by construction. Measured on live data: card c4f8b217 (CHI-84,
// still undecided) is keyed `item-chi84-gate` while its derived id is `item-c4f8b217`, so the
// unregistered case is not hypothetical -- it is what a rebuild did until this ship.
//
// ASSERTION 2 is the boundary that keeps the guard from wedging every future rebuild: a card that
// is simply NOT being rendered (decided, or self-retired) is not an error. Failing on it would
// turn the orphan renderer's ordinary job into a hard stop.
//
// No network, no credentials: the pure builders live in scripts/lib/briefing-derive.mjs precisely
// so this file can import them without running the builder against live Supabase.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import {
  cstDay, cstStamp, cstShortDay, cstDayStartISO, deriveStats, modelRowsHtml,
  dirRowsJs, firstLine, questionRowsJs, skipRowsJs, droRowsHtml, unregisteredAskTargets,
} from "../../scripts/lib/briefing-derive.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILDER = path.join(HERE, "..", "..", "scripts", "build-briefing.mjs");

// The live shape, measured 2026-08-23: one fixed id, one card, one ask thread keyed on it.
const ITEM = "c4f8b217-6e93-4a05-8d71-3f2069b8ce41";
const FIXED = "item-chi84-gate";
const DERIVED = "item-c4f8b217";

// ---------------------------------------------------------------------------
// 1. THE NEGATIVE CONTROL. One variable: whether the table claims the id.
// ---------------------------------------------------------------------------
function unregisteredTargetIsCaught() {
  // Retired behaviour: no map (the `|| {}` default). The card renders under its DERIVED id, so
  // the ask target names an id nothing on the page carries -> the thread orphans.
  const retired = unregisteredAskTargets([FIXED], [DERIVED], []);
  assert.deepStrictEqual(
    retired, [FIXED],
    "with no briefing_dom_ids row the ask target must be reported -- this is the silent orphan",
  );

  // Shipped behaviour: the table claims it, so the card renders under the FIXED id and the
  // thread stays on the card it belongs to.
  const shipped = unregisteredAskTargets([FIXED], [FIXED], [FIXED]);
  assert.deepStrictEqual(
    shipped, [],
    "with the row present the rebuild is clean and must not fail",
  );

  assert.notDeepStrictEqual(
    retired, shipped,
    "the two builds must disagree on identical inputs, or this is not a control",
  );
}

// ---------------------------------------------------------------------------
// 2. The boundary: a card that is not rendered at all is the orphan renderer's
//    ordinary job, NOT a build failure.
// ---------------------------------------------------------------------------
function unrenderedCardIsNotAnError() {
  assert.deepStrictEqual(
    unregisteredAskTargets([FIXED], [], [FIXED]), [],
    "a decided/retired card is not rendered; that must not wedge the rebuild",
  );
  assert.deepStrictEqual(
    unregisteredAskTargets(["q-ladder-executable", "vision-thesis-C-thesis-30"], [], []), [],
    "§9 question and §12 vision targets are not item cards and are never this guard's business",
  );
}

// ---------------------------------------------------------------------------
// 3. §10 routing. `other` falls to the DECISION list by design (SES-119): an
//    unclassified row must never invent a desktop chore for John.
// ---------------------------------------------------------------------------
function skipRoutingSendsOtherToDecision() {
  const rows = [
    { id: "a", backlog_id: "SES-1", reason_kind: "needs-john", reason: "r", status: "open",
      last_skipped_at: "2026-08-23T12:00:00Z", briefed_at: null, queue: 1, title: "t" },
    { id: "b", backlog_id: "SES-2", reason_kind: "needs-desktop", reason: "r", status: "open",
      last_skipped_at: "2026-08-23T12:00:00Z", briefed_at: "2026-08-23T00:00:00Z", queue: 2, title: "t" },
    { id: "c", backlog_id: "SES-3", reason_kind: "other", reason: "r", status: "open",
      last_skipped_at: "2026-08-23T12:00:00Z", briefed_at: null, queue: 3, title: "t" },
  ];
  const decision = skipRowsJs(rows, "decision");
  const desktop = skipRowsJs(rows, "desktop");
  assert.ok(decision.includes("'SES-1'") && decision.includes("'SES-3'"),
    "needs-john AND other belong in 10.1");
  assert.ok(!decision.includes("'SES-2'"), "needs-desktop must not appear in 10.1");
  assert.ok(desktop.includes("'SES-2'") && !desktop.includes("'SES-3'"),
    "10.2 is needs-desktop only -- `other` must never be routed to a desktop chore");

  // isNew is briefed_at IS NULL -- a row is new exactly once.
  assert.ok(decision.includes(",true,"), "an unbriefed row carries the new chip");
  assert.ok(desktop.includes(",false,"), "a briefed row does not");

  // An empty list still renders a row: the good news must be legible, not a vanished table.
  assert.ok(skipRowsJs([], "desktop").includes("None"), "an empty list renders, never disappears");
}

// ---------------------------------------------------------------------------
// 4. §4.1: one reading renders a DASH, never a zero. They are different claims.
// ---------------------------------------------------------------------------
function oneReadingIsNotZero() {
  const one = droRowsHtml([{ cst_day: "2026-08-23", first_cst: "08:51 AM", last_cst: "08:51 AM",
    delta_all_pct: null, est_tokens_in_window: null, cycles_in_window: null, guard: "one reading only" }]);
  assert.ok(one.includes("&mdash;"), "a one-reading day renders dashes");
  assert.ok(!/>0</.test(one), "it must never render 0 -- that claims zero output rather than no measurement");

  const two = droRowsHtml([{ cst_day: "2026-08-22", first_cst: "08:50 AM", last_cst: "10:36 PM",
    delta_all_pct: 14, est_tokens_in_window: 20611000, cycles_in_window: 24, guard: "ok" }]);
  assert.ok(two.includes("+14%") && two.includes("~20.6M") && two.includes("24"),
    "a real window renders its measured figures");
}

// ---------------------------------------------------------------------------
// 5. §7.1: a `done` directive with NO outcome passes null through, so the
//    template draws its red defect line. Coercing it to '' hides the defect.
// ---------------------------------------------------------------------------
function missingOutcomeStaysNull() {
  const js = dirRowsJs([{ id: "dda69acb-0000-0000-0000-000000000000", created_at: "2026-08-21T21:21:00Z",
    type: "directive", body: "a line", status: "done", outcome: null, outcome_note: null,
    acted_cycle: null, expires_at: null }], new Date("2026-08-23T22:00:00Z"));
  assert.ok(/stateOf\('directive','done',null,null,/.test(js),
    "a done row with no outcome must pass null, never an empty string");

  // A live override reports live; an expired one reports expired. Same row, two instants.
  const row = [{ id: "ed642325-0000-0000-0000-000000000000", created_at: "2026-08-22T21:23:00Z",
    type: "budget_override", body: "Up today's max to 25M tokens", status: "queued",
    outcome: null, outcome_note: null, acted_cycle: null, expires_at: "2026-08-24T05:00:00Z" }];
  assert.ok(dirRowsJs(row, new Date("2026-08-23T22:00:00Z")).includes(",true)"), "unexpired = live");
  assert.ok(dirRowsJs(row, new Date("2026-08-25T00:00:00Z")).includes(",false)"), "past expiry = not live");
}

// ---------------------------------------------------------------------------
// 6. His line is his line: the appended PROVENANCE block never reaches the
//    "Your line" column, where it would push his own sentence off the row.
// ---------------------------------------------------------------------------
function provenanceIsStrippedFromHisLine() {
  assert.strictEqual(firstLine("Override for the day\n\n[PROVENANCE — typed LIVE in chat…]"),
    "Override for the day");
  assert.strictEqual(firstLine("place cap at 35M"), "place cap at 35M");
}

// ---------------------------------------------------------------------------
// 7. The CST day boundary is 05:00Z in summer -- the step-3 budget window, and
//    NOT cosmetic: it decides which cycles count toward the day's cap.
// ---------------------------------------------------------------------------
function cstDayBoundaryIsJohnsMidnight() {
  assert.strictEqual(cstDayStartISO(new Date("2026-08-23T22:14:00Z")), "2026-08-23T05:00:00.000Z");
  // A UTC-morning instant still belongs to the PREVIOUS Chicago day.
  assert.strictEqual(cstDayStartISO(new Date("2026-08-23T04:00:00Z")), "2026-08-22T05:00:00.000Z");
  // Winter: the offset is 6, so the boundary moves to 06:00Z. A hardcoded 05:00Z would be wrong.
  assert.strictEqual(cstDayStartISO(new Date("2026-01-15T18:00:00Z")), "2026-01-15T06:00:00.000Z");
}

// ---------------------------------------------------------------------------
// 8. The stat chips are budgeted against the RESOLVED rung, never the static
//    10M default -- rendering the default misstates the runner's own budget.
// ---------------------------------------------------------------------------
function statsUseTheResolvedCap() {
  const cycles = [
    { outcome: "shipped", model: "claude-opus-5", est_tokens_dev: 900000, est_tokens_qa: 300000,
      api_cost_dev_usd: 0, api_cost_qa_usd: 0 },
    { outcome: "did_not_run", model: "claude-opus-5", est_tokens_dev: 300000, est_tokens_qa: 0,
      api_cost_dev_usd: 0, api_cost_qa_usd: 0 },
  ];
  const at35 = deriveStats(cycles, { apiMonthUsd: 0, dayCap: 35000000 });
  const at10 = deriveStats(cycles, { apiMonthUsd: 0, dayCap: 10000000 });
  assert.strictEqual(at35.tok_max_m, "35.0");
  assert.strictEqual(at35.shipped, 1);
  assert.strictEqual(at35.dnr, 1);
  assert.notStrictEqual(at35.tok_pct, at10.tok_pct,
    "the percentage must move with the cap, or the rung is not being used");

  // A model with no cycles today renders 0 rather than being dropped: a missing row reads as
  // "this model was not offered", which is a different and untrue claim.
  const html = modelRowsHtml(cycles, 37);
  assert.ok(html.includes("Fable 5") && html.includes("Sonnet 5"), "all three models render");
  assert.ok(html.includes("37%"), "John's meter reading appears against the first row");
}

// ---------------------------------------------------------------------------
// 9. ANCHOR CONTROL. The builder must still derive rather than read --data for
//    the fields SES-163 moved, and must still demand the five authored ones.
// ---------------------------------------------------------------------------
function builderNoLongerAuthorsTheDerivedFields() {
  const src = fs.readFileSync(BUILDER, "utf8");
  for (const gone of ["data.skip_rows_1", "data.skip_rows_2", "data.dir_rows", "data.question_rows",
    "data.use_rows", "data.model_rows", "data.dro_rows", "data.stats", "data.fixed_dom_ids"]) {
    assert.ok(!new RegExp(`[^\`]${gone.replace(".", "\\.")}\\b`).test(src.replace(/^\/\/.*$/gm, "")),
      `${gone} must no longer be read from --data -- it is derived now`);
  }
  // CAUGHT BY THIS TICKET'S OWN QA, on the first live build. Deriving the masthead version from
  // dev_version_counter looks obviously right and is wrong under parallel cycles: the counter is a
  // CLAIM REGISTER, not "the current version". This cycle claimed v7.0.207 and the counter already
  // read 209 when the page was built, so the masthead stamped a version the page was not.
  assert.ok(!/sel\(['"]dev_version_counter/.test(src),
    "the masthead version must NOT be read from the shared counter -- a concurrent cycle moves it");
  assert.ok(src.includes("arg('version')"), "the version is passed in, as the cycle's own claim");

  assert.ok(src.includes("briefing_dom_ids"), "the fixed id map is read from its table");
  assert.ok(src.includes("unregisteredAskTargets"), "the orphan guard must be wired into the build");
  for (const kept of ["finding_text", "finding_time", "earlier_title", "earlier_html", "calib_line"]) {
    assert.ok(src.includes(kept), `${kept} stays the cycle's to author`);
  }
}

function formattersRenderJohnsClock() {
  const d = new Date("2026-08-22T21:23:21Z");
  assert.strictEqual(cstDay(new Date("2026-08-23T22:14:00Z")), "Aug 23, 2026 CST");
  assert.strictEqual(cstShortDay(d), "Aug 22");
  assert.strictEqual(cstStamp(d), "Aug 22, 04:23 PM");
  assert.ok(questionRowsJs([]).includes("None tonight"), "an empty question list says so");
}

async function run() {
  unregisteredTargetIsCaught();
  unrenderedCardIsNotAnError();
  skipRoutingSendsOtherToDecision();
  oneReadingIsNotZero();
  missingOutcomeStaysNull();
  provenanceIsStrippedFromHisLine();
  cstDayBoundaryIsJohnsMidnight();
  statsUseTheResolvedCap();
  builderNoLongerAuthorsTheDerivedFields();
  formattersRenderJohnsClock();
}

selfRun(import.meta.url, run);
export default run;
