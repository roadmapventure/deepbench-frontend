// DeepBench v7.0.521 | tests/regression/ses-413c-daily-decisions.test.mjs | SES-413 slice 3 --
// the daily decisions list reaches the brief, keyed on the CST day and not the UTC one.
//
// FEATURE. `governance_rules.MANAGER-DECIDES-BY-DEFAULT` line 3 promises John "a daily list of what
// was decided, not questions; a question that still reaches him is counted weekly, target zero".
// Measured live on the unchanged tree, 2026-09-18: `grep -c "Decided for you"
// scripts/render-standing-brief.js docs/runbooks/standing-brief.md` returned 0 and 0, and `grep -n
// runner_questions scripts/render-standing-brief.js` returned ZERO hits -- so NEITHER half of the
// rule had an instrument. The brief's only decision group was `Open decisions` (SES-286c):
// `status=eq.open`, ordered by expiry, every bullet ending in `reverse_decision(...)`. That group is
// an UNDO list. It drops a decision at the instant it finalises -- the instant it becomes a thing
// that was decided for John -- and it carries no day boundary at all, so it cannot be the daily list
// however it is read. 848 decisions live, 758 of them final and therefore invisible to it.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (1) THE DAY IS A CST DAY, AND THIS IS THE ARM A COPY OF `Open decisions` FAILS. A decision
//     recorded at `2026-09-18T04:30:00Z` happened at 11:30 PM on Sep 17 in Chicago. A renderer that
//     buckets on the UTC date files it under Sep 18 -- a day John had not started -- and hides it
//     from the day he worked. This is wrong for five hours out of every twenty-four, which means a
//     fixture built from daytime timestamps alone would pass against the broken renderer. The
//     fixture therefore uses the boundary instant deliberately, and asserts BOTH directions: the
//     row counts on `2026-09-17` AND the `2026-09-18` row reads zero.
//
// (2) THE CAP IS A CAP, NOT A TRUNCATION. 32 rows on one day must print exactly
//     DAILY_DECISION_LINES bullets and ONE overflow line carrying the count and the query that
//     lists the rest. Asserting "at most 25 bullets" would pass against a renderer that silently
//     dropped the other 7 -- which is the SES-334 defect (567 classification decisions, one line
//     each, 18 KB -> 149 KB) solved in the wrong direction. The overflow line must carry the day,
//     so the count and the way to see what it counts arrive together.
//
// (3) ABSENT IS NOT ZERO, asserted as two sentences NEITHER of which appears in the other's branch.
//     "The ledger was not read" and "nothing was decided" are opposite facts and only one of them
//     is a measurement. A group that prints the second when it means the first publishes a quiet
//     week nobody measured, on the page John reads to find out what happened.
//
// (4) THE COUNTED HALF OF THE RULE IS COUNTED, AND ZERO IS PRINTED. The weekly question count and
//     the standing open count are two different numbers -- live at this ship 0 in 7 days and 17
//     still open -- so a group printing only one of them says "no questions" and is wrong. The
//     zero-in-window arm exists because that is the LIVE state: a guard that only exercised the
//     non-zero path would be green here while the group John actually reads printed nothing.
//
// (5) SEVEN ROWS, ALWAYS, ZEROS INCLUDED, NEWEST FIRST. A day on which the runner decided nothing
//     is a fact about the runner, and a table that renders only the days that happen to have rows
//     cannot express it -- six rows read as "seven busy days" to anyone not counting. Live at this
//     ship `2026-09-17` is exactly such a day.
//
// (6) NO UNDO SURFACE. `reverse_decision(` must not appear in this group: undo has a home one group
//     up, and a second copy here makes the record of the day read as a list of mistakes to correct.
//     The backtick half is the SES-286c lesson re-asserted on a new surface -- summaries are written
//     by cycles under no format constraint, and one backtick opens a code span that eats the line.
//
// (7) IT IS IN THE BRIEF, AND IN ITS PLACE. `renderBlock()` must carry the lead AFTER the
//     `Open decisions` lead and BEFORE the `Judgment classes` lead, which puts the two decision
//     groups side by side and keeps `Human gates` last (SES-386). Asserting the helper alone would
//     pass against a helper nothing calls -- precisely the state slice 3 found `runner_questions` in.
//
// NO WRITES ANYWHERE IN THIS FILE, so no before-images are owed: every arm but the live one is a
// pure call on a fixture, and the live arm is three GETs.

import assert from "node:assert/strict";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  renderBlock, renderDailyDecisions, cstDay, asOf, DAILY_DECISION_LINES,
} from "../../scripts/render-standing-brief.js";

// The clock every pure arm renders against. 18:20Z is 1:20 PM in Chicago, so the render's own CST
// day is 2026-09-18 and the table's seven days run 2026-09-12 .. 2026-09-18.
const T1 = "2026-09-18T18:20:00.000Z";
const STAMP = asOf(T1);
const TABLE_DAYS = [
  "2026-09-18", "2026-09-17", "2026-09-16", "2026-09-15", "2026-09-14", "2026-09-13", "2026-09-12",
];

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const uuid = n => `${String(n).padStart(8, "0")}-dead-beef-0000-000000000000`;
const decision = (n, decidedAt, over = {}) => ({
  id: uuid(n), kind: "classification", backlog_id: `SES-${n}`,
  summary: `decided thing number ${n}`, status: "final", decided_at: decidedAt, ...over,
});

const daily = (rows, over = {}) => ({ rows, questions: [], openQuestions: 0, ...over });

// Every bullet the group prints, as the group prints them: `- \`<id8>\` · `. The overflow line
// begins `- …` and deliberately does NOT match, so counting these counts bullets and nothing else.
const BULLET = /^- `[0-9a-f]{8}` · /gm;
const bullets = out => [...out.matchAll(BULLET)].length;

// The table's own rows, parsed back OUT of the render rather than recomputed from the fixture: a
// group that dropped a day would still produce a plausible-looking table from its own numbers.
const TABLE_ROW = /^\| `(\d{4}-\d{2}-\d{2})` \| (\d+) \| (\d+) \| (\d+) \|$/gm;
const tableRows = out => [...out.matchAll(TABLE_ROW)]
  .map(m => ({ day: m[1], decided: Number(m[2]), reversed: Number(m[3]), questions: Number(m[4]) }));

const ITEMS = [{ id: "i1", backlog_id: "SES-1", status: "open", design_status: null, queue: 1 }];
const FACTS = (over = {}) => ({
  items: ITEMS, settings: null, drain: null,
  decisions: { open: [], finalWeek: 0, reversedWeek: 0 },
  daily: daily([decision(1, "2026-09-18T15:00:00Z")]),
  census: [{ judgment_class: "P1 - Improves John's Skills", ord: 1, ratified: 0, proposed: 0, rejected: 0, total: 0, newest_root_claim_ref: null, newest_root_claim: null }],
  johnModel: [{ ord: 0, scope: "overall", pattern_no: null, imperative: null, citing_decisions: 0, finalised_unreversed: 0, reversed: 0, open: 0, agreement_rate: null }],
  inventionUse: [{ window: "all", ord: 3, judge_runs: 1, judge_runs_real_visitors: 0, distinct_real_visitors: 0, first_real_visitor_at: null, last_real_visitor_at: null }],
  ...over,
});

// == (1) a CST day, not a UTC one ================================================================
function theDayIsACstDay() {
  // 04:30Z on the 18th is 11:30 PM on the 17th in Chicago. cstDay() is asserted directly first, so
  // a failure here says which of the two -- the formatter or the bucketing -- is wrong.
  assert.strictEqual(cstDay("2026-09-18T04:30:00Z"), "2026-09-17",
    "cstDay() must return the CHICAGO day: 04:30Z on the 18th is 11:30 PM on the 17th there. A UTC "
    + "date is wrong for five hours out of every twenty-four.");

  const out = renderDailyDecisions(daily([decision(1, "2026-09-18T04:30:00Z")]), STAMP, T1);
  const rows = tableRows(out);
  const byDay = Object.fromEntries(rows.map(r => [r.day, r.decided]));

  assert.strictEqual(byDay["2026-09-17"], 1,
    "a decision recorded at 2026-09-18T04:30:00Z must count on 2026-09-17 -- it is 11:30 PM CST on "
    + `the 17th. A renderer bucketing on the UTC date files it under a day John had not started. got:\n${out}`);
  assert.strictEqual(byDay["2026-09-18"], 0,
    "...and the 2026-09-18 row must read ZERO. Asserting only that the 17th has the row would pass "
    + `against a renderer that counted it on BOTH days. got:\n${out}`);

  assert.ok(out.includes("**1 decided on 2026-09-17**"),
    `the headline must name the newest day that HAS rows -- 2026-09-17, not the render's own day:\n${out}`);
  return out;
}

// == (2) the cap =================================================================================
function theCapCapsAndSaysWhatItCapped() {
  const N = 32;
  // All 32 inside one CST day: 13:00Z on the 16th is 8:00 AM in Chicago, and stepping back by
  // minutes cannot cross either boundary of that day.
  const rows = Array.from({ length: N }, (_, i) =>
    decision(i + 1, new Date(Date.parse("2026-09-16T13:00:00Z") - i * 60000).toISOString()));
  const out = renderDailyDecisions(daily(rows), STAMP, T1);

  assert.strictEqual(DAILY_DECISION_LINES, 25,
    `DAILY_DECISION_LINES is the display cap this arm is written against; it reads ${DAILY_DECISION_LINES}`);
  assert.strictEqual(bullets(out), DAILY_DECISION_LINES,
    `exactly ${DAILY_DECISION_LINES} bullets must print for a ${N}-row day -- not fewer, not more. `
    + `got ${bullets(out)}:\n${out}`);

  const over = N - DAILY_DECISION_LINES;
  assert.ok(out.includes(`…and ${over} more decided that day`),
    `the ${over} rows the cap left off must be COUNTED in one overflow line, never silently dropped. got:\n${out}`);
  assert.ok(/…and 7 more decided that day · `select .*runner_decisions.*2026-09-16.*`/.test(out),
    "the overflow line must carry the query that lists that day's rows, with the DAY in it -- a "
    + `count with no way to see what it counts is the SES-334 defect wearing a smaller table. got:\n${out}`);

  // The table still reports the full 32: the cap is a DISPLAY cap on bullets, and a cap that also
  // shrank the count would be a truncation reported as a measurement.
  const byDay = Object.fromEntries(tableRows(out).map(r => [r.day, r.decided]));
  assert.strictEqual(byDay["2026-09-16"], N,
    `the table must still count all ${N} on 2026-09-16 -- the cap limits bullets, never the count. got:\n${out}`);
  return out;
}

// == (3) absent is not zero ======================================================================
function absentIsNotZero() {
  const ABSENT = "The decision ledger was not read for this render";
  const ZERO = "Nothing was decided in the last 7 days — a measured zero.";

  for (const notRead of [null, undefined, {}, { rows: null }, { rows: "nope" }]) {
    const out = renderDailyDecisions(notRead, STAMP, T1);
    assert.ok(out.includes(ABSENT),
      `an unread ledger (${JSON.stringify(notRead)}) must SAY it was not read:\n${out}`);
    assert.ok(!out.includes(ZERO),
      "an unread ledger must never print the measured-zero sentence -- \"the read failed\" and "
      + `"nothing was decided" are opposite facts. got:\n${out}`);
  }

  const zero = renderDailyDecisions(daily([]), STAMP, T1);
  assert.ok(zero.includes(ZERO), `an empty in-window ledger must print the measured zero:\n${zero}`);
  assert.ok(!zero.includes(ABSENT),
    `a measured zero must never print the not-read sentence:\n${zero}`);
  // Neither sentence may be a substring of the other's branch in EITHER direction, which is what
  // makes the two readable apart rather than merely different strings in the source.
  assert.ok(!zero.includes("was not read") && !renderDailyDecisions(null, STAMP, T1).includes("measured zero"),
    "the two branches must share no phrase that could let one be mistaken for the other");
  return zero;
}

// == (4) the questions are counted ===============================================================
function theQuestionsAreCounted() {
  const rows = [decision(1, "2026-09-17T15:00:00Z")];
  const asked = [
    { qid: "Q1", question: "one", status: "open", asked_at: "2026-09-17T15:00:00Z" },
    { qid: "Q2", question: "two", status: "answered", asked_at: "2026-09-16T15:00:00Z" },
  ];

  const some = renderDailyDecisions(daily(rows, { questions: asked, openQuestions: 17 }), STAMP, T1);
  assert.ok(some.includes("**2 question(s) reached you in the last 7 days — target zero**"),
    `the weekly question count and its target must both print:\n${some}`);
  assert.ok(some.includes("17 still open"),
    "the STANDING open count is a second, different number and must print beside the weekly one -- "
    + `live at this ship they are 0 and 17, and either alone is a wrong answer. got:\n${some}`);
  const byDay = Object.fromEntries(tableRows(some).map(r => [r.day, r.questions]));
  assert.strictEqual(byDay["2026-09-17"], 1, `the 2026-09-17 question column must read 1:\n${some}`);
  assert.strictEqual(byDay["2026-09-16"], 1, `the 2026-09-16 question column must read 1:\n${some}`);

  // The LIVE state at this ship: zero asked in the window, 17 still open. The target is printed
  // anyway -- a scoreboard that goes silent when it is being met cannot be read as met.
  const none = renderDailyDecisions(daily(rows, { questions: [], openQuestions: 17 }), STAMP, T1);
  assert.ok(none.includes("**0 question(s) reached you in the last 7 days — target zero**"),
    `a met target must still print, as a zero and with the target beside it:\n${none}`);
  assert.ok(none.includes("17 still open"),
    `...and the 17 standing questions must still print when none were asked this week:\n${none}`);
  return none;
}

// == (5) seven day rows, always ==================================================================
function sevenDayRowsAlwaysNewestFirst() {
  // Rows on two of the seven days only. The other five must still appear, as zeros.
  const out = renderDailyDecisions(daily([
    decision(1, "2026-09-18T15:00:00Z"),
    decision(2, "2026-09-15T15:00:00Z"),
    decision(3, "2026-09-15T16:00:00Z"),
  ]), STAMP, T1);

  const rows = tableRows(out);
  assert.strictEqual(rows.length, 7,
    `the table must always carry exactly 7 day rows, got ${rows.length}. A table that renders only `
    + `the days with rows cannot say that a day passed in which nothing was decided.\n${out}`);
  assert.deepStrictEqual(rows.map(r => r.day), TABLE_DAYS,
    `the seven days must be the seven CST days ending on the render's own CST day, newest first:\n${out}`);
  assert.strictEqual(rows.filter(r => r.decided === 0).length, 5,
    `five of the seven days must read zero decided:\n${out}`);
  assert.strictEqual(rows.reduce((a, r) => a + r.decided, 0), 3,
    `the decided column must sum to the fixture's 3 rows -- a row counted on no day, or on two, `
    + `makes every number above it unreadable:\n${out}`);
  return out;
}

// == (6) no undo surface, and no code span a summary can open ====================================
function noUndoSurfaceAndNoOpenCodeSpan() {
  const nasty = "a `backtick` summary that would\nopen a span";
  const out = renderDailyDecisions(daily([
    decision(1, "2026-09-18T15:00:00Z", { summary: nasty, status: "reversed" }),
  ]), STAMP, T1);

  assert.ok(!out.includes("reverse_decision("),
    "the daily list must carry NO reverse_decision( handle: undo is `Open decisions`' job one group "
    + `up, and a second copy here turns the record of the day into a list of mistakes. got:\n${out}`);

  const bullet = out.split("\n").find(l => BULLET.test(l) || /^- `[0-9a-f]{8}` · /.test(l));
  assert.ok(bullet, `the one decision must render as a bullet:\n${out}`);
  assert.ok(!bullet.includes("`backtick`"),
    `a backtick in a summary must not survive into the bullet -- it opens a code span that swallows `
    + `the rest of the line (the SES-286c lesson). got: ${bullet}`);
  assert.strictEqual(bullet.split("`").length - 1, 4,
    "the bullet must carry exactly 4 backticks (the id span and the backlog-id span), so every span "
    + `it opens it also closes. An odd count is a span left open. got: ${bullet}`);
  assert.ok(!bullet.includes("\n") && bullet.includes("open a span"),
    `the summary's newline must collapse: one decision is one line. got: ${bullet}`);

  // A reversed row is counted in its own column rather than being given a handle to undo again.
  const byDay = Object.fromEntries(tableRows(out).map(r => [r.day, r.reversed]));
  assert.strictEqual(byDay["2026-09-18"], 1, `the reversed column must count the reversed row:\n${out}`);
  return out;
}

// == (7) it is in the brief, and in its place ====================================================
function theGroupSitsBetweenOpenDecisionsAndJudgmentClasses() {
  const block = renderBlock(FACTS(), T1);
  const at = s => block.indexOf(s);
  const open = at("**Open decisions**");
  const mine = at("**Decided for you**");
  const classes = at("**Judgment classes**");

  for (const [name, i] of [["Open decisions", open], ["Decided for you", mine], ["Judgment classes", classes]]) {
    assert.ok(i >= 0, `renderBlock() must carry the \`${name}\` lead; it does not:\n${block}`);
  }
  assert.ok(open < mine,
    "`Decided for you` must fall AFTER `Open decisions` -- the undo list first, then the record of "
    + `the day, so the two decision groups read as a pair. got ${open} / ${mine}`);
  assert.ok(mine < classes,
    `\`Decided for you\` must fall BEFORE \`Judgment classes\`. got ${mine} / ${classes}`);

  // Human gates stays last (SES-386): a new group inserted anywhere must not displace it.
  const gates = at("**Human gates**");
  if (gates >= 0) {
    assert.ok(gates > mine, `Human gates must stay after the new group. got ${gates} / ${mine}`);
  }
  return block;
}

export default async function run() {
  theDayIsACstDay();                                     // (1)
  theCapCapsAndSaysWhatItCapped();                       // (2)
  absentIsNotZero();                                     // (3)
  theQuestionsAreCounted();                              // (4)
  sevenDayRowsAlwaysNewestFirst();                       // (5)
  noUndoSurfaceAndNoOpenCodeSpan();                      // (6)
  theGroupSitsBetweenOpenDecisionsAndJudgmentClasses();  // (7)

  const pure = "the 04:30Z row counts on 2026-09-17 and the 18th reads zero; 32 rows give 25 bullets "
    + "and one counted overflow carrying the day's query; unread and empty say different things; the "
    + "weekly and standing question counts both print with their target; seven day rows always, "
    + "newest first; no reverse_decision( and no open code span; renderBlock() places the group "
    + "after Open decisions and before Judgment classes";

  // == LIVE ======================================================================================
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "SES-413c live: public.runner_decisions returns the shape the daily group buckets by, and the "
      + "table's `decided` column accounts for every row that falls inside its seven CST days",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name "
      + "(docs/runbooks/session-setup.md step 1b) and re-run: "
      + "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js. "
      + "Measured at this ship instead: 204 decisions in the rolling 7 days over 7 CST days "
      + "(2026-09-11 .. 2026-09-18, with 2026-09-17 a real zero), 0 questions asked in the window "
      + "and 17 still open.",
    );
    console.log(`  [SES-413c] ${pure}; live declared NOT RUN`);
    return;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!r.ok) assert.fail(`PostgREST ${r.status} on GET ${q}: ${await r.text()}`);
    return r.json();
  };

  // The renderer's own three reads, character for character, so a divergence between what the brief
  // reads and what this guard checks cannot hide here.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const live = await get(
    `runner_decisions?select=id,kind,backlog_id,summary,status,decided_at&decided_at=gte.${since}&order=decided_at.desc&limit=2000`);
  const asked = await get(
    `runner_questions?select=qid,question,status,asked_at&asked_at=gte.${since}&order=asked_at.desc&limit=1000`);
  const openQ = await get("runner_questions?select=qid&status=eq.open&limit=1000");

  for (const [name, v] of [["decisions", live], ["questions", asked], ["open questions", openQ]]) {
    assert.ok(Array.isArray(v), `the live ${name} read must be an array, got ${typeof v}`);
  }
  assert.ok(live.length >= 1,
    "the ledger must hold at least one decision in the rolling 7 days -- an empty window means the "
    + "group this slice exists to fill has nothing to show and the guard measures nothing");

  for (const r of live) {
    for (const col of ["id", "kind", "status", "decided_at"]) {
      assert.ok(r[col] != null && String(r[col]).length > 0,
        `every live row must carry a non-empty \`${col}\` -- the group buckets on \`decided_at\`, `
        + `counts \`status\`, and prints \`id\` and \`kind\`, so a null in any of them silently `
        + `merges or drops a day's work. got ${JSON.stringify(r)}`);
    }
    assert.doesNotThrow(() => cstDay(r.decided_at),
      `every live \`decided_at\` must be a date cstDay() can bucket: ${r.decided_at}`);
  }

  // The real rows through the real helper.
  const nowIso = new Date().toISOString();
  const out = renderDailyDecisions(
    { rows: live, questions: asked, openQuestions: openQ.length }, asOf(nowIso), nowIso);
  assert.ok(!/was not read/i.test(out), `the live ledger must render as a measured group:\n${out}`);

  const rows = tableRows(out);
  assert.strictEqual(rows.length, 7, `the live render must still carry exactly 7 day rows:\n${out}`);

  // THE SUM, over the table's OWN seven days. DEVIATION D1 (reported): the kickoff's live arm asks
  // the `decided` column to sum to the live ROW count. It cannot, and the reason is arithmetic
  // rather than a defect: the read window is a rolling 7x24h off the clock while the table's window
  // is seven CST CALENDAR days, so on any render after CST midnight some rows were read before the
  // first table row begins. The renderer states that count rather than dropping it silently. What is
  // assertable -- and is what the arm was reaching for -- is that the column accounts for EVERY row
  // inside its own seven days, and that the two windows reconcile exactly: in-table + outside = all.
  const inTable = new Set(rows.map(r => r.day));
  const inWindow = live.filter(r => inTable.has(cstDay(r.decided_at)));
  const outside = live.length - inWindow.length;
  assert.strictEqual(rows.reduce((a, r) => a + r.decided, 0), inWindow.length,
    `the table's decided column must sum to the ${inWindow.length} live row(s) falling on its own `
    + `seven CST days -- a row counted on no day, or on two, makes the table unreadable:\n${out}`);
  if (outside > 0) {
    assert.ok(out.includes(`${outside} decision(s) were read but fall outside the table`),
      `the ${outside} row(s) read before the table's first day must be STATED, never dropped `
      + `silently -- that is the difference between a stated projection and a lost day:\n${out}`);
  }

  const byDay = Object.fromEntries(rows.map(r => [r.day, r.decided]));
  console.log(`  [SES-413c] ${pure}; live: ${live.length} decision(s) in the rolling 7 days, `
    + `${inWindow.length} inside the table's seven CST days and ${outside} before them, `
    + `${asked.length} question(s) asked in the window and ${openQ.length} still open; `
    + `by CST day ${JSON.stringify(byDay)}`);
}

selfRun(import.meta.url, run);
