// DeepBench v7.0.418 | tests/regression/log-143c-invention-use.test.mjs | LOG-143 (c) — CRITERION
// 7 GETS ITS INSTRUMENT. Parts (a) (v7.0.415, push fed9391e) and (b) (v7.0.417, push 7b545d44)
// shipped the judge and its surfaces; this part gives "at least one platform-originated feature
// is measurably used by real visitors" (SELFBUILD-CHARTER.md criterion 7) a number instead of an
// assertion: a migration view, `public.report_card_usage`, and a new standing-brief block,
// `Invention in use`, that only prints what the view returns.
//
// THREE ARMS:
//
//   1. SOURCE (always runs): renderInventionUse() is PURE — (usage rows, stamp) in, markdown out
//      — driven from fixtures exactly like renderJudgmentClasses()/renderJohnModel() beside it.
//      The mutation control the kickoff names, both ways: a fixture with zero real-visitor runs
//      must print "no real-visitor use yet" and no fabricated first-use date; the SAME shape with
//      three real visitors must print their counts and a real first-use date. NO RATE, EVER (the
//      kickoff's design rule) is asserted directly — no `%` character survives any render, at any
//      population size. renderBlock() integration: the group sits AFTER John-model and BEFORE the
//      provenance line, carries the as-of stamp, and moves the payload sha exactly when the usage
//      figures move (never on a bare stamp refresh) — the same three properties SES-004's own
//      guard asserts for the group beside it. fetchFacts() is asserted to read
//      `report_card_usage` by its named columns and pinned order, and NOT to read
//      `ai_activity_log` or `visitor_labels` directly — the real-visitor predicate has exactly one
//      home, the view, and re-deriving it here would be the second-home defect judgment_class_census
//      and john_model_signal already forbid for their own numbers.
//   2. DOC (always runs): the shipped docs/runbooks/standing-brief.md carries the block, after
//      the regenerate this ship's Task 3 runs.
//   3. LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY; DECLARED not-run otherwise): report_card_usage
//      answers with exactly its three window rows (7d/30d/all), and at this ship's population —
//      the two bench-report-card rows logged by part (a)'s own live QA run, both attended, from
//      John's machine — judge_runs >= 1 and judge_runs_real_visitors = 0 in every window, which is
//      also Manual QA step 1 of the kickoff.
//
// Invocation: node tests/regression/log-143c-invention-use.test.mjs
// (STANDARDS.md Section 2 rule 5 for the credentialed form.)

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  renderBlock, renderInventionUse, factsSha, shaFromBlock, asOf, cst,
} from "../../scripts/render-standing-brief.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RENDERER_REL = "scripts/render-standing-brief.js";
const BRIEF_REL = "docs/runbooks/standing-brief.md";
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

// A FIXED clock, same pair SES-177b and SES-004's own guards use — renderBlock() takes the
// timestamp as an argument precisely so this is possible.
const T1 = "2026-09-03T18:20:00.000Z";
const T2 = "2026-09-03T23:05:00.000Z";

// ---------------------------------------------------------------------------
// Fixtures — the real live shape at this ship (ZERO) and its mutation control (THREE).
// ---------------------------------------------------------------------------
const ZERO = [
  { window: "7d", ord: 1, judge_runs: 1, judge_runs_real_visitors: 0, distinct_real_visitors: 0, first_real_visitor_at: null, last_real_visitor_at: null },
  { window: "30d", ord: 2, judge_runs: 1, judge_runs_real_visitors: 0, distinct_real_visitors: 0, first_real_visitor_at: null, last_real_visitor_at: null },
  { window: "all", ord: 3, judge_runs: 1, judge_runs_real_visitors: 0, distinct_real_visitors: 0, first_real_visitor_at: null, last_real_visitor_at: null },
];

const THREE = [
  { window: "7d", ord: 1, judge_runs: 5, judge_runs_real_visitors: 3, distinct_real_visitors: 3, first_real_visitor_at: "2026-08-30T12:00:00Z", last_real_visitor_at: "2026-09-02T08:00:00Z" },
  { window: "30d", ord: 2, judge_runs: 9, judge_runs_real_visitors: 3, distinct_real_visitors: 3, first_real_visitor_at: "2026-08-30T12:00:00Z", last_real_visitor_at: "2026-09-02T08:00:00Z" },
  { window: "all", ord: 3, judge_runs: 12, judge_runs_real_visitors: 3, distinct_real_visitors: 3, first_real_visitor_at: "2026-08-15T00:00:00Z", last_real_visitor_at: "2026-09-02T08:00:00Z" },
];

const ITEMS = [
  { id: "i1", backlog_id: "SES-1", status: "open", design_status: null, queue: 1 },
];
const FACTS = (over = {}) => ({
  items: ITEMS, settings: null, drain: null,
  decisions: { open: [], finalWeek: 0, reversedWeek: 0 },
  census: [{ judgment_class: "P1 - Improves John's Skills", ord: 1, ratified: 0, proposed: 0, rejected: 0, total: 0, newest_root_claim_ref: null, newest_root_claim: null }],
  johnModel: [{ ord: 0, scope: "overall", pattern_no: null, imperative: null, citing_decisions: 0, finalised_unreversed: 0, reversed: 0, open: 0, agreement_rate: null }],
  inventionUse: ZERO,
  ...over,
});

// ---------------------------------------------------------------------------
// Arm 1 — SOURCE: renderInventionUse() itself.
// ---------------------------------------------------------------------------

// THE MUTATION CONTROL THE KICKOFF NAMES, BOTH WAYS.
function zeroRealVisitorsPrintsPlainlyAndThreeReportsThem() {
  const stamp = asOf(T1);
  const zero = renderInventionUse(ZERO, stamp);
  const three = renderInventionUse(THREE, stamp);
  assert.notStrictEqual(zero, three, "the control is vacuous unless the two renders really differ");

  assert.ok(/no real-visitor use yet/.test(zero), `zero real visitors must print "no real-visitor use yet": ${zero}`);
  assert.ok(!/First real-visitor use:/.test(zero),
    "zero real visitors must not print a fabricated first-use date — no count of theirs");
  assert.ok(zero.includes("**7d:** 1 judge run, 0 by real visitors (0 distinct)."),
    `each window line must still report its own counts even at zero: ${zero}`);

  assert.ok(!/no real-visitor use yet/.test(three), "three real visitors must NOT print the zero-use sentence");
  assert.ok(three.includes(`First real-visitor use: ${cst("2026-08-15T00:00:00Z")}.`),
    `the first-use line must read the \`all\` window's first_real_visitor_at, formatted CST: ${three}`);
  assert.ok(three.includes("**7d:** 5 judge runs, 3 by real visitors (3 distinct)."),
    `the 7d window must report its own figures, plural judge runs: ${three}`);
  assert.ok(three.includes("**30d:** 9 judge runs, 3 by real visitors (3 distinct)."), `30d window: ${three}`);
  assert.ok(three.includes("**all:** 12 judge runs, 3 by real visitors (3 distinct)."), `all window: ${three}`);
}

// NO RATE, EVER — the kickoff's own design rule, asserted directly rather than inferred from
// prose: no '%' character may survive the render at any population, including one where a rate
// would be a tidy round number (3 of 12 = 25%).
function noRateEverSurvivesAnyPopulation() {
  const stamp = asOf(T1);
  for (const rows of [ZERO, THREE, [{ window: "7d", ord: 1, judge_runs: 12, judge_runs_real_visitors: 3, distinct_real_visitors: 1, first_real_visitor_at: "2026-09-01T00:00:00Z", last_real_visitor_at: "2026-09-01T00:00:00Z" }]]) {
    const out = renderInventionUse(rows, stamp);
    assert.ok(!out.includes("%"), `no '%' may appear anywhere in the render: ${out}`);
  }
}

// Singular forms — a number John reads is a sentence, not a template, same rule SES-004's own
// guard asserts for its "1 pattern-citing decision" line.
function singularCountsReadAsSentencesNotTemplates() {
  const one = renderInventionUse(
    [{ window: "all", ord: 3, judge_runs: 1, judge_runs_real_visitors: 1, distinct_real_visitors: 1, first_real_visitor_at: "2026-09-01T00:00:00Z", last_real_visitor_at: "2026-09-01T00:00:00Z" }],
    asOf(T1),
  );
  assert.ok(one.includes("1 judge run, 1 by real visitor (1 distinct)."), `singular forms at 1: ${one}`);
}

function anAbsentOrEmptyUsageIsSaidNeverRenderedAsZeros() {
  const stamp = asOf(T1);
  for (const bad of [undefined, null, []]) {
    const out = renderInventionUse(bad, stamp);
    assert.ok(/was not read for this render/.test(out), `an unread usage view must SAY so, got: ${out}`);
    assert.ok(!/judge run/.test(out) && !/no real-visitor use yet/.test(out),
      "an unread view must render neither a count nor the zero-use sentence — a gap it never measured is not the same fact as zero");
  }

  const block = renderBlock(FACTS({ inventionUse: undefined }), T1);
  assert.ok(/\*\*Invention in use\*\*/.test(block) && /was not read for this render/.test(block),
    "renderBlock() must still carry the group and say the view was not read");
  assert.strictEqual(shaFromBlock(block), factsSha(FACTS({ inventionUse: undefined })).slice(0, 16),
    "the sha must still be computable with no usage rows — the group is additive");
}

function everyGeneratedLineCarriesTheStamp() {
  const block = renderBlock(FACTS(), T1);
  const line = block.split("\n").find(l => l.includes("**Invention in use**"));
  assert.ok(line, "the block must carry an Invention in use group");
  assert.ok(line.includes(asOf(T1)), `the group's heading must carry the as-of stamp: ${line}`);
}

// ---------------------------------------------------------------------------
// Arm 1 — SOURCE: renderBlock() placement, sha, and the fetch contract.
// ---------------------------------------------------------------------------
function theGroupSitsBetweenJohnModelAndProvenance() {
  const block = renderBlock(FACTS(), T1);
  const at = s => block.indexOf(s);
  assert.ok(at("**John-model**") > -1 && at("**Invention in use**") > -1 && at("*Provenance:") > -1,
    "renderBlock() must carry all three anchors");
  assert.ok(at("**John-model**") < at("**Invention in use**"),
    "Invention in use must come AFTER John-model (kickoff Task 2)");
  assert.ok(at("**Invention in use**") < at("*Provenance:"), "and BEFORE the provenance line");
}

function usageMovesTheShaButAStampRefreshDoesNot() {
  const b1 = renderBlock(FACTS(), T1);
  const b2 = renderBlock(FACTS(), T2);
  assert.notStrictEqual(b1, b2, "the control is vacuous unless the two renders really differ");
  assert.strictEqual(shaFromBlock(b1), shaFromBlock(b2),
    "identical facts under different clocks must carry the SAME sha — otherwise --check fires on every stamp refresh");

  assert.notStrictEqual(shaFromBlock(renderBlock(FACTS({ inventionUse: THREE }), T1)), shaFromBlock(b1),
    "a real-visitor run appearing must move the sha");

  const oneMoreJudgeRun = ZERO.map((r, i) => (i === 2 ? { ...r, judge_runs: 2 } : r));
  assert.notStrictEqual(shaFromBlock(renderBlock(FACTS({ inventionUse: oneMoreJudgeRun }), T1)), shaFromBlock(b1),
    "a new judge run (even with no real visitor) must move the sha");
}

function theRendererReadsTheViewAndNothingElse() {
  const src = read(RENDERER_REL);
  const clause = s => /report_card_usage\?select=window,ord,judge_runs,judge_runs_real_visitors,distinct_real_visitors,first_real_visitor_at,last_real_visitor_at&order=ord/.test(s);
  assert.ok(clause(src), "fetchFacts() must read report_card_usage with its columns NAMED and order=ord pinned");

  const mutated = src.split("report_card_usage").join("some_other_view");
  assert.notStrictEqual(mutated, src, "control: the mutation changed nothing");
  assert.ok(!clause(mutated), "control: the clause still passes after its own mutation — it cannot fail");

  // THE REAL-VISITOR PREDICATE HAS ONE HOME, THE VIEW. This file must never re-derive it from the
  // raw tables — that is the second-home defect judgment_class_census and john_model_signal are
  // already built to avoid for their own numbers.
  assert.ok(!/ai_activity_log\?select=/.test(src) || !/report-card/.test(src.slice(src.indexOf("ai_activity_log?select="))),
    "the renderer must not read ai_activity_log for the report-card feature directly");
  assert.ok(!/visitor_labels\?select=/.test(src),
    "the renderer must not read visitor_labels directly — the real-visitor predicate lives only in report_card_usage");
}

// ---------------------------------------------------------------------------
// Arm 2 — DOC.
// ---------------------------------------------------------------------------
function theShippedBriefCarriesTheInventionInUseBlock() {
  const brief = read(BRIEF_REL);
  assert.ok(/\*\*Invention in use\*\*/.test(brief),
    `${BRIEF_REL} must carry the Invention in use block after this ship's re-render`);
  const lines = brief.split("\n");
  const johnModelLine = lines.findIndex(l => l.includes("**John-model**"));
  const inventionLine = lines.findIndex(l => l.includes("**Invention in use**"));
  const provenanceLine = lines.findIndex(l => l.startsWith("*Provenance:"));
  assert.ok(johnModelLine > -1 && inventionLine > -1 && provenanceLine > -1,
    "the shipped brief must carry all three anchors");
  assert.ok(johnModelLine < inventionLine && inventionLine < provenanceLine,
    "Invention in use must sit strictly between John-model and the provenance footer in the shipped file");
}

// ---------------------------------------------------------------------------
// Arm 3 — LIVE.
// ---------------------------------------------------------------------------
async function rest(url, key, q) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`REST ${q} → HTTP ${res.status} ${res.statusText}: ${await res.text().catch(() => "")}`);
  return res.json();
}

async function theViewAnswersWithThreeWindowRows(url, key) {
  const rows = await rest(url, key,
    "report_card_usage?select=window,ord,judge_runs,judge_runs_real_visitors,distinct_real_visitors,first_real_visitor_at,last_real_visitor_at&order=ord");
  assert.strictEqual(rows.length, 3, `report_card_usage must always return exactly its three window rows, got ${rows.length}`);
  assert.deepStrictEqual(rows.map(r => r.window), ["7d", "30d", "all"], "window order must be 7d, 30d, all");

  // Manual QA step 1 of the kickoff, asserted live: after part (a)'s own attended QA run,
  // judge_runs >= 1 and judge_runs_real_visitors = 0 — John's own machine is not a real visitor.
  for (const r of rows) {
    assert.ok(Number(r.judge_runs) >= 1, `${r.window}: judge_runs must be >= 1 at this ship's population, got ${r.judge_runs}`);
    assert.strictEqual(Number(r.judge_runs_real_visitors), 0,
      `${r.window}: judge_runs_real_visitors must be 0 — every logged run so far is John's own attended QA call`);
    assert.strictEqual(Number(r.distinct_real_visitors), 0, `${r.window}: distinct_real_visitors must be 0`);
    assert.strictEqual(r.first_real_visitor_at, null, `${r.window}: no real-visitor use yet, so first_real_visitor_at must be NULL`);
  }
}

async function run(ctx = {}) {
  const results = [];

  zeroRealVisitorsPrintsPlainlyAndThreeReportsThem();
  noRateEverSurvivesAnyPopulation();
  singularCountsReadAsSentencesNotTemplates();
  anAbsentOrEmptyUsageIsSaidNeverRenderedAsZeros();
  everyGeneratedLineCarriesTheStamp();
  results.push("source-render-invention-use-zero-three-rate-singular-absent-stamp");

  theGroupSitsBetweenJohnModelAndProvenance();
  usageMovesTheShaButAStampRefreshDoesNot();
  theRendererReadsTheViewAndNothingElse();
  results.push("source-renderblock-placement-sha-and-fetch-contract");

  theShippedBriefCarriesTheInventionInUseBlock();
  results.push("doc-shipped-brief-carries-the-block-in-order");

  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (report_card_usage answers with exactly its three window rows, and " +
      "judge_runs_real_visitors = 0 in every window at this ship's population)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent; run with --env-file-if-exists=.env.local or export " +
      "the two names read from public.runner_secrets. Measured over the MCP when this shipped " +
      "(2026-09-03): 3 rows (7d/30d/all), judge_runs=1 and judge_runs_real_visitors=0 in every window " +
      "— the two bench-report-card rows logged so far are both John's own attended QA call " +
      "(visitor_id NULL, call_source 'script', the Vercel preview host).",
    );
  } else {
    await theViewAnswersWithThreeWindowRows(url, key);
    results.push("live-view-answers-three-window-rows-zero-real-visitors");

    // MEASURED, NOT GUESSED (this ship): a single `fetch()` immediately followed by selfRun()'s
    // process.exit(0) crashes Node 24's undici/libuv teardown on Windows with "Assertion failed:
    // !(handle->flags & UV_HANDLE_CLOSING)" and exit code 127 -- reproduced with a two-line probe
    // script with no test framework involved, so this is a platform race in the fetch keep-alive
    // socket's close handshake, not a defect in this file's assertions (which had already printed
    // [PASS]). A short pause here lets that handle finish closing before the harness exits; the
    // probe confirmed 0/3 crashes with the pause against 3/3 without it. Scoped to the LIVE branch
    // only -- the credential-free arms make no network call and never hit this race.
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  return results;
}

selfRun(import.meta.url, run);
export default run;
