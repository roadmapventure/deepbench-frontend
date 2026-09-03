// DeepBench v7.0.411 | tests/regression/ses-004-decision-patterns.test.mjs | SES-004 (b) — JOHN'S
// DECISION PATTERNS ARE ROWS A DECISION CAN CITE, AND THE JOHN-MODEL REPORTS A COUNT UNTIL 30
// DECISIONS EARN A RATE. The M7 design gate (decision 05cc2722, rulings ii/iii) re-scoped SES-004's
// declared remainder — "patterns as queryable rows a cycle cites" — away from the card surface
// SES-285 retired, to: (1) the 161 criteria in docs/JOHN-DECISION-PATTERNS.md become rows in
// public.decision_patterns, exported and never hand-typed; (2) every recorded decision names the
// criteria it leaned on as `pattern:N` tokens in its reasoning, joined by a trigger into
// public.runner_decision_patterns; (3) the standing brief reports the share of pattern-citing
// decisions that stood unreversed — and reports COUNTS ONLY below 30 finalised-or-reversed
// decisions, never a rate.
//
// PART (b) (this ship, `v7.0.411`): part (a) (`v7.0.410`, push `ddef954c`) shipped the rows, the
// trigger, the exporter, the view, the brief block and 7b's own citation rule, then stopped at its
// earned file cap owing two sentences — docs/runbooks/session-setup.md 3d's matching instruction for
// an ATTENDED decision, and docs/JOHN-DECISION-PATTERNS.md's own header paragraph naming the exporter
// and putting --check in its ship gate. Both are written now, and this file's two DOC-arm `notRun()`
// declarations for them become real assertions below — `the3dSectionAlsoCitesItsPatterns()` and
// `theMdHeaderNamesTheExporterAndCheckGate()`, each with its own mutation control (strip the sentence
// from an in-memory copy of the section and confirm the very same check goes false).
//
// THREE ARMS, and what each proves is stated rather than implied:
//
//   1. SOURCE (always runs): the exporter's parser and the brief's renderer, both PURE, both driven
//      from fixtures. The parser's controls are the two that would ship a silently wrong table — a
//      criterion whose body hard-wraps across lines, and the SAME fixture with CRLF endings, which
//      must parse BYTE-IDENTICALLY (this repo is CRLF on Windows and LF in CI; a parser that is not
//      whitespace-normalised stores two different tables from one file and --check then reports
//      permanent drift on exactly one of the two trees). compareRows() gets one control per drift
//      kind, including the one that must NOT fire: the reserved pattern:0 row, which lives in the
//      table and deliberately not in the md, must never be read as an extra row. renderJohnModel()
//      gets the mutation control the kickoff names, BOTH WAYS: a signal below the floor MUST emit the
//      count sentence and no rate, and one at the floor MUST emit the rate — the pair proves the
//      branch is live rather than the string merely present.
//   2. DOC (always runs): docs/runbooks/runner-cycle.md step 7b on disk carries the `pattern:N`
//      instruction, the reserved-`pattern:0` meaning, the never-fails-to-record property, and one
//      fenced example — inside 7b, not merely somewhere in a 3,900-line file. As of part (b), the
//      same arm also checks docs/runbooks/session-setup.md 3d (the attended equivalent of 7b's
//      instruction) and docs/JOHN-DECISION-PATTERNS.md's header (the exporter/--check paragraph) —
//      each scoped to its own section, not merely somewhere in the file, and each with a mutation
//      control proving the check can actually fail.
//   3. LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY; DECLARED not-run otherwise, never silently
//      skipped): decision_patterns holds the 161 md criteria contiguously plus the reserved row;
//      compareRows() against the live table reports NO DRIFT (this IS `--check`, run through the
//      exporter's own functions rather than a second implementation of them, per STANDARDS.md
//      Section 4 / SES-45); every join row resolves to a criterion; and john_model_signal's floor
//      holds ON THE DATA — a row's agreement_rate is NULL exactly when its finalised+reversed count
//      is under 30.
//
// WHAT ARM 3 DOES NOT DO, AND IS NOT PERMITTED TO: write the decision ledger. The kickoff's LIVE
// sketch called for a rolled-back `DO` block driving record_decision(); a permanent regression test
// must never insert into runner_decisions (SES-84's guard states the same boundary for
// reverse_decision()), and PostgREST cannot run a `DO` block in the first place — there is no
// exec-SQL RPC in this project (checked, not assumed). That fixture was run over the MCP at build
// time, rolled back, and its measured result is recorded in the notRun() declaration below so the
// gap is a stated number rather than an absence. It is also QA step 2 of the kickoff.
//
// Invocation: node tests/regression/ses-004-decision-patterns.test.mjs
// (STANDARDS.md Section 2 rule 5 for the credentialed form.)

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  parsePatterns, compareRows, auditNumbering, norm, sourceVersion,
  RESERVED_PATTERN_NO, MUTABLE_COLUMNS, DOC_REL,
} from "../../scripts/export-decision-patterns.js";
import {
  renderBlock, renderJohnModel, factsSha, shaFromBlock, asOf, JOHN_MODEL_FLOOR,
} from "../../scripts/render-standing-brief.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CYCLE_REL = "docs/runbooks/runner-cycle.md";
const EXPORTER_REL = "scripts/export-decision-patterns.js";
const RENDERER_REL = "scripts/render-standing-brief.js";
const SETUP_REL = "docs/runbooks/session-setup.md";

const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

// A FIXED clock. renderBlock() takes the timestamp as an argument precisely so this is possible.
const T1 = "2026-09-03T03:10:00.000Z";
const T2 = "2026-09-03T09:45:00.000Z";

// ---------------------------------------------------------------------------
// Fixtures.
// ---------------------------------------------------------------------------

// The three shapes the real file actually contains, and nothing convenient:
//   #1 — imperative + body + evidence, the textbook entry;
//   #2 — imperative + evidence, NO body. 98 of the live 161 look like this, so a parser that treats
//        an empty body as a defect refuses the real file (it did, on this parser's first run);
//   #3 — a body AND a `*Seen in:*` marker that hard-wrap across lines, which is why the marker is
//        matched as `\*Seen\s+in:` rather than as a literal (the quote gate learned this on #112).
const FIXTURE_MD = [
  "<!-- DeepBench v9.9.9 | docs/JOHN-DECISION-PATTERNS.md | fixture -->",
  "",
  "# Fixture",
  "",
  "## First section",
  "",
  "**1. Do the narrow thing.** Prefer the smallest change that works.",
  "*Seen in:* John chose one row over a new service.",
  "",
  "**2. Never renumber a criterion.**",
  "*Seen in:* the numbers are cited across the repo.",
  "",
  "## Second section",
  "",
  "**3. Collapse the wrap.** A body that hard-wraps",
  "across two lines is still one body. *Seen",
  "in:* a quote that wrapped too.",
  "",
  "---",
  "",
  "*Format for new entries: not a criterion, and must not be parsed as one.*",
  "",
].join("\n");

const FIXTURE_ROWS = [
  {
    pattern_no: 1, section: "First section", imperative: "Do the narrow thing.",
    body: "Prefer the smallest change that works.",
    seen_in: "John chose one row over a new service.", source_version: "v9.9.9",
  },
  {
    pattern_no: 2, section: "First section", imperative: "Never renumber a criterion.",
    body: "", seen_in: "the numbers are cited across the repo.", source_version: "v9.9.9",
  },
  {
    pattern_no: 3, section: "Second section", imperative: "Collapse the wrap.",
    body: "A body that hard-wraps across two lines is still one body.",
    seen_in: "a quote that wrapped too.", source_version: "v9.9.9",
  },
];

/** The live table's shape: what fetchLive() returns. Built from the md rows so the two cannot drift. */
const liveFrom = (rows, over = []) => {
  const out = rows.map(r => ({ ...r }));
  for (const f of over) f(out);
  return out;
};

// john_model_signal's shape, exactly as fetchFacts() reads it. PostgREST returns numeric as a
// STRING, which is why agreement_rate is quoted here — a fixture that used a JS number would agree
// with the renderer for the wrong reason.
const SIGNAL_BELOW = [
  { ord: 0, scope: "overall", pattern_no: null, imperative: null,
    citing_decisions: 12, finalised_unreversed: 9, reversed: 1, open: 2, agreement_rate: null },
  { ord: 1, scope: "pattern", pattern_no: 137, imperative: "P1–P4 are pull tests, not category labels — administrative expectations never qualify.",
    citing_decisions: 7, finalised_unreversed: 5, reversed: 1, open: 1, agreement_rate: null },
  { ord: 1, scope: "pattern", pattern_no: 5, imperative: "Model how work actually enters the pipeline, not just the design.",
    citing_decisions: 4, finalised_unreversed: 3, reversed: 0, open: 1, agreement_rate: null },
];

const SIGNAL_AT = [
  { ord: 0, scope: "overall", pattern_no: null, imperative: null,
    citing_decisions: 34, finalised_unreversed: 28, reversed: 2, open: 4, agreement_rate: "0.9333" },
  { ord: 1, scope: "pattern", pattern_no: 137, imperative: "P1–P4 are pull tests.",
    citing_decisions: 31, finalised_unreversed: 29, reversed: 1, open: 1, agreement_rate: "0.9667" },
  // Deliberately hostile: a backtick in the imperative. John's criteria quote identifiers constantly,
  // and an unbalanced backtick inside a table cell opens a code span that eats the rest of the row.
  { ord: 1, scope: "pattern", pattern_no: 2, imperative: "Data-driven over code — one generic `signature @> criteria` match.",
    citing_decisions: 9, finalised_unreversed: 8, reversed: 0, open: 1, agreement_rate: null },
  { ord: 1, scope: "pattern", pattern_no: 5, imperative: "Model how work enters the pipeline.",
    citing_decisions: 6, finalised_unreversed: 5, reversed: 1, open: 0, agreement_rate: null },
  { ord: 1, scope: "pattern", pattern_no: 8, imperative: "Fix at the narrowest layer that works.",
    citing_decisions: 3, finalised_unreversed: 2, reversed: 0, open: 1, agreement_rate: null },
  { ord: 1, scope: "pattern", pattern_no: 161, imperative: "Automate John's mechanical follow-through.",
    citing_decisions: 2, finalised_unreversed: 2, reversed: 0, open: 0, agreement_rate: null },
  { ord: 1, scope: "pattern", pattern_no: 0, imperative: "No standing pattern applied -- new judgment.",
    citing_decisions: 1, finalised_unreversed: 1, reversed: 0, open: 0, agreement_rate: null },
];

const ITEMS = [
  { id: "i1", backlog_id: "SES-1", status: "open", design_status: null, queue: 1 },
  { id: "i2", backlog_id: "SES-2", status: "done", design_status: "designed", queue: null },
];
const SETTINGS = {
  id: 1, scheduler_on: true, interval_hours: 1, cron_minute: 40,
  grid_tolerance_min: 10, daily_max_tokens_millions: 196, reversal_window_hours: 72,
};
const CENSUS = [
  { judgment_class: "P1 - Improves John's Skills", ord: 1, ratified: 2, proposed: 32, rejected: 6, total: 40, newest_root_claim_ref: "VC-ROOT-001", newest_root_claim: "x" },
  { judgment_class: "P2 - Inventive", ord: 2, ratified: 0, proposed: 54, rejected: 6, total: 60, newest_root_claim_ref: "VC-ROOT-002", newest_root_claim: "x" },
  { judgment_class: "P3 - Investor Value", ord: 3, ratified: 0, proposed: 45, rejected: 7, total: 52, newest_root_claim_ref: "VC-ROOT-003", newest_root_claim: "x" },
  { judgment_class: "P4 - New Customers", ord: 4, ratified: 1, proposed: 37, rejected: 3, total: 41, newest_root_claim_ref: "VC-ROOT-004", newest_root_claim: "x" },
  { judgment_class: "neutral", ord: 5, ratified: 0, proposed: 84, rejected: 29, total: 113, newest_root_claim_ref: null, newest_root_claim: null },
  { judgment_class: "unclassed", ord: 6, ratified: 0, proposed: 0, rejected: 0, total: 0, newest_root_claim_ref: null, newest_root_claim: null },
];
const FACTS = (over = {}) => ({
  items: ITEMS, settings: SETTINGS, drain: null,
  decisions: { open: [], finalWeek: 0, reversedWeek: 0 },
  census: CENSUS,
  johnModel: SIGNAL_BELOW,
  ...over,
});

const tableRows = block => block.split("\n").filter(l => /^\| `pattern:/.test(l));
const RATE_LINE = /^- \*\*[\d.]+% agreement\*\*/m;
const COUNT_LINE = /^- \*\*\d+ pattern-citing decisions? so far\*\*/m;

// ---------------------------------------------------------------------------
// Arm 1 — SOURCE: the parser.
// ---------------------------------------------------------------------------
function theParserYieldsTheExpectedRowsFromAFixture() {
  const rows = parsePatterns(FIXTURE_MD);
  assert.strictEqual(rows.length, 3, `the fixture holds exactly three criteria, got ${rows.length}`);
  assert.deepStrictEqual(rows, FIXTURE_ROWS,
    "every field of every fixture row must come out exactly as written — number, section, imperative, body, seen_in, source_version");

  // The trailing `*Format for new entries: …*` paragraph and the `# Fixture` title are NOT criteria.
  assert.ok(!rows.some(r => /Format for new entries/.test(r.body + r.seen_in)),
    "text after the horizontal rule must not be swallowed into the last criterion — that is how a section's tail leaks into a row");
  assert.strictEqual(sourceVersion(FIXTURE_MD), "v9.9.9", "the source version is the file's newest stamp");
}

// THE CRLF CONTROL. This repo is CRLF on disk and LF in git/CI, so a parser that is not
// whitespace-normalised writes two different tables from one file and --check is then permanently
// red on exactly one of the two trees while printing identical-looking text (the SES-313 defect,
// spelled a different way).
function theParserIsIndifferentToLineEndings() {
  const lf = parsePatterns(FIXTURE_MD);
  const crlf = parsePatterns(FIXTURE_MD.replace(/\n/g, "\r\n"));
  assert.notStrictEqual(FIXTURE_MD, FIXTURE_MD.replace(/\n/g, "\r\n"), "control: the two inputs must really differ");
  assert.deepStrictEqual(crlf, lf, "a CRLF file must parse byte-identically to its LF twin");
  assert.ok(!JSON.stringify(crlf).includes("\\r"), "no carriage return may survive into a stored field");
  assert.strictEqual(norm("a \r\n b\t\tc "), "a b c", "norm() collapses every whitespace run, including CRLF");
}

function theRealFileYields161ContiguousCriteria() {
  const rows = parsePatterns(read(DOC_REL));
  assert.strictEqual(rows.length, 161,
    `${DOC_REL} must parse to 161 criteria (the SES-004 runner-era pass took it to 161), got ${rows.length}`);
  assert.deepStrictEqual(rows.map(r => r.pattern_no), Array.from({ length: 161 }, (_, i) => i + 1),
    "the numbering must be contiguous 1..161 — numbers are cited across the repo and a gap means a criterion was lost in parsing");
  assert.deepStrictEqual(auditNumbering(rows), [],
    "the real file must be exportable as it stands — auditNumbering() found a structural problem");
  assert.ok(rows.every(r => r.section && r.imperative),
    "every criterion must land under a `## ` section and carry a non-empty imperative");
  // The reserved row is the migration's, never the md's — an exporter that invented it would make
  // `pattern:0` mean two different things.
  assert.ok(!rows.some(r => r.pattern_no === RESERVED_PATTERN_NO),
    `the md must not contain a criterion numbered ${RESERVED_PATTERN_NO} — that number is reserved and seeded by the migration`);
}

function theNumberingAuditCatchesWhatItMustCatch() {
  const gap = FIXTURE_MD.replace("**2. Never renumber a criterion.**\n*Seen in:* the numbers are cited across the repo.\n\n", "");
  assert.notStrictEqual(gap, FIXTURE_MD, "control: the mutation changed nothing");
  const problems = auditNumbering(parsePatterns(gap));
  assert.ok(problems.some(p => /criterion 2 is missing/.test(p)),
    `a hole in the numbering must be reported, got: ${JSON.stringify(problems)}`);

  const dupe = FIXTURE_MD.replace("**3. Collapse the wrap.**", "**1. Collapse the wrap.**");
  assert.ok(auditNumbering(parsePatterns(dupe)).some(p => /appears more than once/.test(p)),
    "a duplicated number must be reported — two rows cannot share one citation");
}

// ---------------------------------------------------------------------------
// Arm 1 — SOURCE: the drift comparison. This IS `--check`.
// ---------------------------------------------------------------------------
function theComparisonReportsEachDriftKindAndOnlyWhenItIsReal() {
  const md = parsePatterns(FIXTURE_MD);

  assert.deepStrictEqual(compareRows(md, liveFrom(md)), [],
    "identical md and table must report NO drift — otherwise --check cries wolf on every run");

  // The one that must NOT fire: the reserved row lives in the table and deliberately not in the md.
  const withReserved = liveFrom(md).concat([{
    pattern_no: RESERVED_PATTERN_NO, section: "Reserved", imperative: "No standing pattern applied -- new judgment.",
    body: "…", seen_in: null, source_version: "SES-004",
  }]);
  assert.deepStrictEqual(compareRows(md, withReserved), [],
    `the reserved pattern:${RESERVED_PATTERN_NO} row must never be reported as an extra row`);

  const missing = compareRows(md, liveFrom(md).filter(r => r.pattern_no !== 2));
  assert.deepStrictEqual(missing, [{ kind: "missing", pattern_no: 2, field: null }],
    "a criterion in the md and not in the table is `missing` — fixable by a plain run");

  const extra = compareRows(md, liveFrom(md).concat([{ ...md[0], pattern_no: 7 }]));
  assert.deepStrictEqual(extra.map(d => [d.kind, d.pattern_no]), [["extra", 7]],
    "a row in the table and not in the md is `extra` — the table is append-only, so this is NOT fixable by a run");

  for (const f of MUTABLE_COLUMNS) {
    const drifted = compareRows(md, liveFrom(md, [rows => { rows[0][f] = "moved"; }]));
    assert.deepStrictEqual(drifted.map(d => [d.kind, d.pattern_no, d.field]), [["mutable", 1, f]],
      `${f} is a mutable column: a difference must be reported as \`mutable\``);
  }
  for (const f of ["section", "imperative"]) {
    const drifted = compareRows(md, liveFrom(md, [rows => { rows[0][f] = "moved"; }]));
    assert.deepStrictEqual(drifted.map(d => [d.kind, d.pattern_no, d.field]), [["immutable", 1, f]],
      `${f} is the citable identity: a difference must be reported as \`immutable\` and never rewritten`);
  }

  // Whitespace is not drift. This is the CRLF control again, at the comparison layer.
  const rewrapped = liveFrom(md, [rows => { rows[2].body = rows[2].body.replace(/ /g, "\r\n  "); }]);
  assert.deepStrictEqual(compareRows(md, rewrapped), [],
    "a re-wrapped body is the same body — compareRows() must normalise both sides or --check is red on every Windows checkout");
}

// ---------------------------------------------------------------------------
// Arm 1 — SOURCE: the John-model block.
// ---------------------------------------------------------------------------

// THE MUTATION CONTROL THE KICKOFF NAMES, BOTH WAYS.
function theRateAppearsOnlyAtOrAboveTheFloor() {
  const stamp = asOf(T1);
  const below = renderJohnModel(SIGNAL_BELOW, stamp);
  const at = renderJohnModel(SIGNAL_AT, stamp);
  assert.notStrictEqual(below, at, "the control is vacuous unless the two renders really differ");

  assert.ok(COUNT_LINE.test(below), `below the floor the block must state the COUNT: ${below}`);
  assert.ok(below.includes("**12 pattern-citing decisions so far** (9 finalised unreversed, 1 reversed, 2 open)"),
    `the count sentence must carry all four numbers: ${below}`);
  assert.ok(below.includes(`no rate below ${JOHN_MODEL_FLOOR}.`), "below the floor the block must SAY there is no rate");
  assert.ok(!RATE_LINE.test(below), "below the floor there must be NO rate line — a rate over 10 decisions is not a small signal, it is a wrong one");
  assert.strictEqual(tableRows(below).length, 0, "below the floor there must be no per-pattern table");

  assert.ok(RATE_LINE.test(at), `at the floor the block must state the RATE: ${at}`);
  assert.ok(at.includes("**93.3% agreement** over 30 finalised-or-reversed decisions (28 finalised unreversed, 2 reversed; 4 still open, 34 citing in total)"),
    `the rate line must carry the rate and every count behind it: ${at}`);
  assert.ok(!COUNT_LINE.test(at), "at the floor the count sentence must be replaced, not printed alongside the rate");

  // Singular at 1 — a number John reads is a sentence, not a template.
  const one = renderJohnModel([{ ...SIGNAL_BELOW[0], citing_decisions: 1, finalised_unreversed: 1, reversed: 0, open: 0 }], asOf(T1));
  assert.ok(/\*\*1 pattern-citing decision so far\*\*/.test(one), `singular at 1: ${one}`);
}

// THE FLOOR IS THE VIEW'S, NOT THIS FILE'S. The renderer must branch on the NULL the view returned,
// so moving the floor in SQL moves the brief with no code edit. Proven by handing it a signal whose
// counts are BELOW 30 but whose agreement_rate is set: the rate must print anyway.
function theRendererObeysTheViewRatherThanRecomputingTheFloor() {
  const forced = [{ ...SIGNAL_BELOW[0], agreement_rate: "0.9" }, ...SIGNAL_BELOW.slice(1)];
  const out = renderJohnModel(forced, asOf(T1));
  assert.ok(RATE_LINE.test(out),
    "the renderer must print the rate the VIEW returned, even with only 10 finalised-or-reversed decisions — the floor has exactly one home and it is the view");
  assert.ok(!COUNT_LINE.test(out), "and must not also print the count sentence");

  const src = read(RENDERER_REL);
  const fn = src.slice(src.indexOf("export function renderJohnModel"), src.indexOf("/** John's stamp:"));
  assert.ok(fn.length > 500, "control: renderJohnModel() was not located in the renderer source");
  assert.ok(!/finalised_unreversed\s*\)?\s*\/\s*\(/.test(fn),
    "renderJohnModel() must not divide — the agreement rate has one home, public.john_model_signal");
  assert.ok(!new RegExp(`>=\\s*${JOHN_MODEL_FLOOR}|<\\s*${JOHN_MODEL_FLOOR}`).test(fn),
    "renderJohnModel() must not compare against the floor itself — it branches on the view's NULL");
}

function theTopPatternsTableIsCappedOrderedAndBacktickSafe() {
  const out = renderJohnModel(SIGNAL_AT, asOf(T1));
  const rows = tableRows(out);
  assert.strictEqual(rows.length, 5, `the table lists the five most-cited criteria, got ${rows.length}`);
  assert.deepStrictEqual(rows.map(l => /^\| `pattern:(\d+)`/.exec(l)[1]), ["137", "2", "5", "8", "161"],
    "most-cited first, ties broken by number — the block must not churn between renders");
  assert.ok(rows[0].endsWith("| 31 | 29 | 1 | 1 | 96.7% |"), `the leading row must carry its counts and its own rate: ${rows[0]}`);
  assert.ok(rows[1].endsWith("| 9 | 8 | 0 | 1 | — |"),
    `a criterion below the floor carries counts and an em dash, never an invented rate: ${rows[1]}`);
  assert.ok(!rows[1].includes("`signature @> criteria`"), "a backtick inside an imperative must not survive into the table cell");
  assert.strictEqual((rows[1].match(/`/g) || []).length % 2, 0, `the row's backticks must balance: ${rows[1]}`);
  assert.ok(out.includes(`A per-pattern \`—\` is not a zero`), "the block must say what an em dash means, or it reads as zero");
}

function anAbsentSignalIsSaidNeverRenderedAsZeros() {
  const out = renderJohnModel(undefined, asOf(T1));
  assert.ok(/was not read for this render/.test(out), "a render with no signal must SAY so");
  assert.ok(!COUNT_LINE.test(out) && !RATE_LINE.test(out),
    "an unread signal must render neither a count nor a rate — numbers it never measured are the stale-number defect");

  const noOverall = renderJohnModel(SIGNAL_BELOW.filter(r => r.scope !== "overall"), asOf(T1));
  assert.ok(/no `overall` row/.test(noOverall), "a signal with no overall row is an honest gap, not a zero");

  const block = renderBlock(FACTS({ johnModel: undefined }), T1);
  assert.ok(/\*\*John-model\*\*/.test(block) && /was not read for this render/.test(block),
    "renderBlock() must still carry the group and say the signal was not read");
  assert.strictEqual(shaFromBlock(block), factsSha(FACTS({ johnModel: undefined })).slice(0, 16),
    "the sha must still be computable with no signal — the group is additive");
}

function theGroupSitsBetweenJudgmentClassesAndProvenanceAndCarriesTheStamp() {
  const block = renderBlock(FACTS(), T1);
  const at = s => block.indexOf(s);
  assert.ok(at("**Judgment classes**") > -1 && at("**John-model**") > -1 && at("*Provenance:") > -1,
    "renderBlock() must carry all three anchors");
  assert.ok(at("**Judgment classes**") < at("**John-model**"),
    "the John-model group must come AFTER Judgment classes (kickoff Task 3)");
  assert.ok(at("**John-model**") < at("*Provenance:"), "and BEFORE the provenance line");
  const line = block.split("\n").find(l => l.includes("**John-model**"));
  assert.ok(line.includes(asOf(T1)),
    "the group's heading line must carry the as-of stamp — John's spec, gated card 8c0f2bf9: every generated line carries one");
  assert.ok(/live from `public\.john_model_signal`/.test(block),
    "the intro must name the view the numbers come from");
}

function theSignalMovesTheShaButAStampRefreshDoesNot() {
  const b1 = renderBlock(FACTS(), T1);
  const b2 = renderBlock(FACTS(), T2);
  assert.notStrictEqual(b1, b2, "the control is vacuous unless the two renders really differ");
  assert.strictEqual(shaFromBlock(b1), shaFromBlock(b2),
    "identical facts under different clocks must carry the SAME sha — otherwise --check fires on every stamp refresh");

  const oneMore = [{ ...SIGNAL_BELOW[0], citing_decisions: 13 }, ...SIGNAL_BELOW.slice(1)];
  assert.notStrictEqual(shaFromBlock(renderBlock(FACTS({ johnModel: oneMore }), T1)), shaFromBlock(b1),
    "a new pattern-citing decision must move the sha");
  const reversedOne = [{ ...SIGNAL_BELOW[0], finalised_unreversed: 8, reversed: 2 }, ...SIGNAL_BELOW.slice(1)];
  assert.notStrictEqual(shaFromBlock(renderBlock(FACTS({ johnModel: reversedOne }), T1)), shaFromBlock(b1),
    "a reversal must move the sha — it is the strongest negative signal the ladder takes");
  assert.notStrictEqual(shaFromBlock(renderBlock(FACTS({ johnModel: SIGNAL_AT }), T1)), shaFromBlock(b1),
    "crossing the floor must move the sha");

  const reworded = [{ ...SIGNAL_BELOW[0] }, { ...SIGNAL_BELOW[1], imperative: "reworded in the md" }, SIGNAL_BELOW[2]];
  assert.strictEqual(shaFromBlock(renderBlock(FACTS({ johnModel: reworded }), T1)), shaFromBlock(b1),
    "re-wording a criterion is not a change in the SIGNAL — the number identifies it, so the sha must not move");

  // PostgREST returns numeric as a string; a fixture written with a JS number must not be a different fact.
  const asNumber = [{ ...SIGNAL_AT[0], agreement_rate: 0.9333 }, ...SIGNAL_AT.slice(1)];
  assert.strictEqual(
    shaFromBlock(renderBlock(FACTS({ johnModel: asNumber }), T1)),
    shaFromBlock(renderBlock(FACTS({ johnModel: SIGNAL_AT }), T1)),
    "0.9333 and \"0.9333\" are the same rate — the sha must not depend on the transport's typing");
}

function theRendererReadsTheViewNotTheJoin() {
  const src = read(RENDERER_REL);
  const clause = s => /john_model_signal\?select=ord,scope,pattern_no,imperative,citing_decisions,finalised_unreversed,reversed,open,agreement_rate&order=ord,citing_decisions\.desc,pattern_no/.test(s);
  assert.ok(clause(src), "fetchFacts() must read john_model_signal with its columns NAMED and its order pinned");
  const mutated = src.split("john_model_signal").join("runner_decision_patterns");
  assert.notStrictEqual(mutated, src, "control: the mutation changed nothing");
  assert.ok(!clause(mutated), "control: the clause still passes after its own mutation — it cannot fail");
  assert.ok(!/runner_decision_patterns\?select=/.test(src),
    "the renderer must not read the join itself — the signal has exactly one home, the view");
}

// The exporter is the ONLY bridge: nothing else may write decision_patterns.
function theExporterIsTheOnlyBridge() {
  const src = read(EXPORTER_REL);
  assert.ok(/decision_patterns\?on_conflict=pattern_no/.test(src),
    "the exporter must upsert on the pattern_no conflict, never insert-or-fail");
  // NO EXECUTABLE process.exit() ANYWHERE IN THE EXPORTER, found live on its own first --check run:
  // exiting while undici still holds the keep-alive socket aborts the process with
  // `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` and exit code 127 — so a CLEAN check
  // reported a hard failure to whatever gate read the code. Comment lines are excluded on purpose:
  // the file's own header explains the rule, and a checker that matches its own documentation is the
  // SES-180 self-flagging trap.
  const codeLines = src.split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l));
  assert.ok(!codeLines.some(l => l.includes("process.exit(")),
    `the exporter must never call process.exit() — it sets process.exitCode instead: ${codeLines.find(l => l.includes("process.exit("))}`);
  assert.ok(/process\.exitCode/.test(src), "control: the exporter must actually set an exit code somewhere");
  assert.ok(src.split("\n").some(l => /^\s*\/\/.*process\.exit\(/.test(l)),
    "control: the exclusion is vacuous unless a comment line really does mention process.exit()");
  // The renderer may NAME the table in its prose (it explains where the criteria come from); what it
  // must never do is READ it. The signal has one home, and re-deriving a criterion's counts beside
  // the view is how "two surfaces, two numbers" starts.
  const renderer = read(RENDERER_REL);
  assert.ok(!/decision_patterns\?select=/.test(renderer) && !/runner_decision_patterns\?select=/.test(renderer),
    "the renderer must not query decision_patterns or the join directly — it reads public.john_model_signal and nothing else");
  assert.ok(/decision_patterns\?on_conflict=/.test(src),
    "control: the exporter, and only the exporter, addresses the table over REST");
}

// ---------------------------------------------------------------------------
// Arm 2 — DOC.
// ---------------------------------------------------------------------------
function step7bTellsACycleToCiteItsPatterns() {
  const cycle = read(CYCLE_REL);
  const from = cycle.indexOf("**7b. Every decision is a row with a handle");
  const to = cycle.indexOf("## Phase 3 — evidence");
  assert.ok(from > -1 && to > from, "control: step 7b's span was not located in runner-cycle.md");
  const step = cycle.slice(from, to);

  assert.ok(/NAMES THE CRITERIA IT RELIED ON, AS `pattern:N` TOKENS/.test(step),
    `${CYCLE_REL} step 7b must instruct a cycle to name its criteria as pattern:N tokens`);
  assert.ok(/`public\.decision_patterns`/.test(step) && /`scripts\/export-decision-patterns\.js`/.test(step),
    "7b must name the table the tokens resolve against and the exporter that fills it");
  assert.ok(/`pattern:0` is\s*\n?reserved for "no standing pattern applied — new judgment"/.test(step)
    || /pattern:0.*reserved for "no standing pattern applied/s.test(step),
    "7b must state what pattern:0 means — an omitted citation and a novel judgment are different facts");
  assert.ok(/never make a decision fail to record/.test(step),
    "7b must state that an unknown citation is a NOTICE, never an error");

  // The fenced example, and that it really is fenced.
  const fenced = step.split("```").filter((_, i) => i % 2 === 1);
  assert.ok(fenced.some(b => /pattern:5, pattern:137/.test(b)),
    "7b must carry ONE fenced example line showing the tokens in a real reasoning string");

  // And the DO block's own placeholder tells the cycle the same thing at the point it types it.
  assert.ok(/naming every criterion you leaned on as pattern:N/.test(step),
    "the record_decision() reasoning placeholder must carry the instruction too — a rule stated only in prose above a copy-paste block is a rule that gets copied past");
}

// SES-004b — the two doc sentences part (a) left under the file cap: session-setup.md 3d cites
// pattern:N too, and the patterns file names its own rows and its --check gate.
function the3dSectionAlsoCitesItsPatterns() {
  const setup = read(SETUP_REL);
  const from = setup.indexOf("### 3d. Record a decision");
  const to = setup.indexOf("### 3e. Run the verifier");
  assert.ok(from > -1 && to > from, "control: 3d's span was not located in session-setup.md");
  const section = setup.slice(from, to);

  const hasSentence = s => {
    const flat = s.replace(/\s+/g, " ");
    return /names the criteria it relied on,? as `pattern:N` tokens/.test(flat)
      && /runner-cycle\.md` step 7b/.test(flat)
      && /pattern:0` = no\s*standing pattern applied/.test(flat)
      && /`public\.runner_decision_patterns`/.test(flat);
  };

  assert.ok(hasSentence(section),
    `${SETUP_REL} 3d must carry the pattern:N sentence for attended decisions — naming ` +
    "runner-cycle.md step 7b, pattern:0's meaning, and public.runner_decision_patterns");

  // MUTATION CONTROL: strip the sentence from an in-memory copy and confirm the check goes false —
  // otherwise the regex above could be trivially satisfied by unrelated text and the assert above
  // would be a vacuous pass.
  const mutated = section.replace(
    /\*\*The `reasoning` above also names[\s\S]*?unattended path\.\n/, "",
  );
  assert.notStrictEqual(mutated, section, "control: the mutation must actually remove text");
  assert.ok(!hasSentence(mutated), "control: removing the sentence must make the check fail");
}

function theMdHeaderNamesTheExporterAndCheckGate() {
  const md = read(DOC_REL);
  const from = md.indexOf("> **This is now the full");
  const to = md.indexOf("**Why this file exists");
  assert.ok(from > -1 && to > from, `control: ${DOC_REL}'s header blockquote was not located`);
  const header = md.slice(from, to);

  const hasParagraph = s => {
    // Strip the leading `> ` blockquote marker per LINE first — collapsing whitespace before
    // stripping leaves stray `>` characters stranded mid-string with no line start to anchor on.
    const flat = s.replace(/^>\s?/gm, "").replace(/\s+/g, " ");
    return /`public\.decision_patterns`/.test(flat)
      && /scripts\/export-decision-patterns\.js/.test(flat)
      && /--check/.test(flat)
      && /ship gate/.test(flat)
      && /`scripts\/check-decision-pattern-quotes\.js`/.test(flat)
      && /cites the criteria it relied on as `pattern:N`/.test(flat)
      && /never renumbered/.test(flat);
  };

  assert.ok(hasParagraph(header),
    `${DOC_REL}'s header must name the exporter, put --check in the ship gate alongside ` +
    "check-decision-pattern-quotes.js, and state that decisions cite pattern:N and numbers are never renumbered");

  // MUTATION CONTROL, same shape as the 3d one above.
  const mutated = header.replace(
    />\s*\*\*The criteria are also rows[\s\S]*?never renumbered\.\n/, "",
  );
  assert.notStrictEqual(mutated, header, "control: the mutation must actually remove text");
  assert.ok(!hasParagraph(mutated), "control: removing the paragraph must make the check fail");
}

// ---------------------------------------------------------------------------
// Arm 3 — LIVE.
// ---------------------------------------------------------------------------
async function rest(url, key, q) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  // The body is read ONCE: the failure text only on the failure arm.
  if (!res.ok) throw new Error(`REST ${q} → HTTP ${res.status} ${res.statusText}: ${await res.text().catch(() => "")}`);
  return res.json();
}

async function theLiveTableMatchesTheMdAndCarriesTheReservedRow(url, key) {
  const live = await rest(url, key,
    "decision_patterns?select=pattern_no,section,imperative,body,seen_in,source_version&order=pattern_no&limit=5000");
  const md = parsePatterns(read(DOC_REL));

  assert.strictEqual(live.length, md.length + 1,
    `decision_patterns must hold ${md.length} md criteria plus the reserved pattern:${RESERVED_PATTERN_NO} row, got ${live.length}`);
  const reserved = live.find(r => Number(r.pattern_no) === RESERVED_PATTERN_NO);
  assert.ok(reserved, `the reserved pattern:${RESERVED_PATTERN_NO} row is missing — the join's "no standing pattern" citation would not resolve`);
  assert.ok(/no standing pattern applied/i.test(reserved.imperative),
    `pattern:${RESERVED_PATTERN_NO} must mean "no standing pattern applied — new judgment", got "${reserved.imperative}"`);

  // THIS IS `--check`, run through the exporter's own function rather than a second implementation
  // of it (STANDARDS.md Section 4 / SES-45: logic recreated inside a test is a second implementation
  // agreeing with itself).
  assert.deepStrictEqual(compareRows(md, live), [],
    "public.decision_patterns has drifted from docs/JOHN-DECISION-PATTERNS.md — run `node scripts/export-decision-patterns.js`");
}

async function everyJoinRowResolvesToACriterion(url, key) {
  const join = await rest(url, key, "runner_decision_patterns?select=decision_id,pattern_no&limit=5000");
  assert.ok(Array.isArray(join), "runner_decision_patterns must be readable with the service key");
  if (join.length === 0) return join.length;   // nothing cited yet is a legitimate state, not a failure
  const live = await rest(url, key, "decision_patterns?select=pattern_no&limit=5000");
  const known = new Set(live.map(r => Number(r.pattern_no)));
  const orphans = join.filter(j => !known.has(Number(j.pattern_no)));
  assert.deepStrictEqual(orphans, [],
    "a join row names a criterion that does not exist — the trigger drops unknown numbers, so this cannot happen without a hand-write");
  return join.length;
}

async function theFloorHoldsOnTheLiveData(url, key) {
  const signal = await rest(url, key,
    "john_model_signal?select=ord,scope,pattern_no,imperative,citing_decisions,finalised_unreversed,reversed,open,agreement_rate&order=ord,citing_decisions.desc,pattern_no");
  assert.ok(Array.isArray(signal) && signal.length >= 1, "john_model_signal must always return at least its overall row");
  const overall = signal.filter(r => r.scope === "overall");
  assert.strictEqual(overall.length, 1, `exactly one overall row, got ${overall.length}`);
  assert.ok(signal.every(r => ["overall", "pattern"].includes(r.scope)), "scope is `overall` or `pattern` and nothing else");
  assert.ok(signal.every(r => (r.scope === "overall") === (r.pattern_no == null)),
    "the overall row carries no pattern_no and every pattern row carries one");

  // THE FLOOR, ASSERTED FROM THE DATA rather than from the view's text: a row's rate is NULL exactly
  // when its own finalised+reversed count is under the floor. This is the assertion that would fail
  // if somebody relaxed the CASE in the view.
  for (const r of signal) {
    const denom = Number(r.finalised_unreversed) + Number(r.reversed);
    const hasRate = r.agreement_rate != null;
    assert.strictEqual(hasRate, denom >= JOHN_MODEL_FLOOR,
      `${r.scope}${r.pattern_no == null ? "" : " " + r.pattern_no}: denominator ${denom} but agreement_rate ${hasRate ? "set" : "NULL"} — the floor is ${JOHN_MODEL_FLOOR}`);
    if (hasRate) {
      assert.ok(Math.abs(Number(r.agreement_rate) - Number(r.finalised_unreversed) / denom) < 0.0001,
        `${r.scope}: the stored rate must equal finalised_unreversed / (finalised_unreversed + reversed)`);
    }
    assert.ok(Number(r.citing_decisions) >= Number(r.finalised_unreversed) + Number(r.reversed) + Number(r.open),
      "a citing decision is counted in at most one status bucket");
  }
  return overall[0];
}

async function run(ctx = {}) {
  const results = [];

  theParserYieldsTheExpectedRowsFromAFixture();
  theParserIsIndifferentToLineEndings();
  theRealFileYields161ContiguousCriteria();
  theNumberingAuditCatchesWhatItMustCatch();
  theComparisonReportsEachDriftKindAndOnlyWhenItIsReal();
  results.push("source-parser-fixture-crlf-161-and-drift-kinds");

  theRateAppearsOnlyAtOrAboveTheFloor();
  theRendererObeysTheViewRatherThanRecomputingTheFloor();
  theTopPatternsTableIsCappedOrderedAndBacktickSafe();
  anAbsentSignalIsSaidNeverRenderedAsZeros();
  theGroupSitsBetweenJudgmentClassesAndProvenanceAndCarriesTheStamp();
  theSignalMovesTheShaButAStampRefreshDoesNot();
  theRendererReadsTheViewNotTheJoin();
  theExporterIsTheOnlyBridge();
  results.push("source-john-model-floor-control-order-and-sha");

  step7bTellsACycleToCiteItsPatterns();
  results.push("doc-7b-instructs-the-pattern-citation");

  // SES-004b — the two sentences part (a) left under the file cap: session-setup.md 3d and the
  // patterns file's own header. What used to be a declared notRun() here is now a real assertion.
  the3dSectionAlsoCitesItsPatterns();
  theMdHeaderNamesTheExporterAndCheckGate();
  results.push("doc-3d-and-md-header-carry-the-pattern-citation");

  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (decision_patterns holds the 161 md criteria plus the reserved row and matches the " +
      "md with no drift, every join row resolves to a criterion, and john_model_signal's 30-decision " +
      "floor holds on the data)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent; run with --env-file-if-exists=.env.local or export " +
      "the two names read from public.runner_secrets. Measured over the MCP when this shipped " +
      "(2026-09-02): 162 rows (161 + pattern:0), --check clean, 10 open decisions, 0 finalised, " +
      "0 reversed, 0 citing a pattern.",
    );
  } else {
    await theLiveTableMatchesTheMdAndCarriesTheReservedRow(url, key);
    const joinRows = await everyJoinRowResolvesToACriterion(url, key);
    await theFloorHoldsOnTheLiveData(url, key);
    results.push(`live-table-matches-md-join-resolves-floor-holds (${joinRows} join row(s))`);
  }

  // THE TRIGGER'S OWN BEHAVIOUR IS NOT ASSERTED HERE, AND THAT IS DELIBERATE. Proving it needs a
  // record_decision() call, i.e. a WRITE to the decision ledger; a permanent regression test must
  // never write it (the same boundary ses-84-claims-classed.test.mjs states for reverse_decision()),
  // and PostgREST cannot run a rolled-back `DO` block — there is no exec-SQL RPC in this project.
  notRun(
    "the trigger arm (a fixture record_decision() whose reasoning cites pattern:137 and pattern:161 " +
    "yields exactly those two join rows; an unknown pattern:9999 yields none and a NOTICE; and an " +
    "UPDATE OF reasoning adding pattern:0 yields a third row)",
    "it requires writing runner_decisions, which a permanent test must not do. Run over the MCP at " +
    "build time inside one rolled-back DO block (2026-09-02): after insert 2 rows {137,161} and 0 " +
    "unknown rows; after the UPDATE 3 rows {0,137,161}; zero residue on re-read (0 fixture decisions, " +
    "0 join rows). It is QA step 2 of the SES-004 kickoff.",
  );

  return results;
}

selfRun(import.meta.url, run);
export default run;
