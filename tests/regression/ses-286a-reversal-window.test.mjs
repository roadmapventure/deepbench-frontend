// DeepBench v7.0.403 | tests/regression/ses-286a-reversal-window.test.mjs | SES-316 -- EXTENDED,
// never duplicated: two new arms hold down the half of the reversal mechanism this file could not
// see, namely that the thing a reversal has to survive is the BOARD MOVING UNDER IT.
//
// FEATURE: SES-316 -- (a) the two runbooks' claim and release SQL must not write updated_at, and
// (b) reverse_decision() must expose refused_written_since. Both arms below, with their controls.
//
// WHAT THE DEFECT WAS, measured by the M6 milestone gate review (decision c3e86310, 2026-09-02):
// reverse_decision() refused any row whose live updated_at postdated the BEFORE-IMAGE it would
// restore from -- and still returned outcome = 'applied' with the row counted `refused`. The claim
// (runner-cycle.md step 5, session-setup.md 2c) and the release both wrote `updated_at = now()`, so
// every decision that touched a ticket became un-restorable the moment the continuous drain picked
// it up. Minutes, not days, and silently. Two halves fixed it and NEITHER WORKS ALONE, which is why
// there are two arms: migration ses316_reversal_survives_claims re-points the guard at the
// decision's own decided_at and adds refused_written_since (+ outcome 'partial'), and the runbooks
// stop writing updated_at in a claim or a release.
//
// A NAMED DEVIATION FROM THE KICKOFF, because its premise did not survive a check. The kickoff
// specifies arm (b) as reading the RPC's signature out of PostgREST's OpenAPI root (GET /rest/v1/).
// MEASURED before a line was written: that document describes an RPC's INPUT parameters only --
// /rpc/reverse_decision carries p_decision/p_actor/p_reason/p_actor_cycle and a bare
// `responses: {200: {description: "OK"}}`, and `definitions` has no reverse_decision entry at all.
// There is no return-column list there to read. So the arm reads the columns the only way PostgREST
// exposes them -- off a real response -- and it does that WITHOUT WRITING ANYTHING by calling the
// function's FIRST guard: a blank p_actor returns at the second statement of the body, before the
// decision row is even SELECTed. The assertion is on the `reason` text, so it proves WHICH path ran
// rather than merely that a row came back (a test that could pass on any path would pass if the fix
// did nothing), and the write-free-ness is asserted by side effect the same way arm 2 asserts
// ladder_work_class()'s purity, because pg_proc is unreachable from here.
//
// DeepBench v7.0.394 | tests/regression/ses-286a-reversal-window.test.mjs | SES-286 (a)
//
// FEATURE: SES-286 (a) -- guards the reversal window's MECHANISM: public.runner_decisions, the
// runner_settings.reversal_window_hours column, runner_before_images.decision_id, and
// public.ladder_work_class(). M6-02 / M6-05 / M6-06 / M6-07.
//
// WHAT THE DEFECT WAS, so a later editor does not "tidy" the table away as unused: all four of
// those rules were `status = live` and marked `script`, and NO SCRIPT RAN. Measured 2026-09-02, on
// the live database rather than reasoned about: no table recorded A DECISION -- what was decided,
// why, when it becomes final, how to undo it. So the SES-184 and SES-185 gate decisions, the
// SES-82 de-scoping, the 33 needs-john -> needs-decision conversions and the 7 john-paced
// conversions were each "reversible under M6-02" BY THE AVAILABILITY OF BEFORE-IMAGES ALONE --
// there was no id John could hand back, no expiry, and no ladder effect. `to_regclass
// ('public.runner_decisions')` returned NULL at that measurement, which is also this file's
// pre-change dry-run result for arms 1 and 2 (see the dry-run note at the foot of the LIVE arm).
//
// THE WINDOW IS A COLUMN, NOT A LITERAL, and that is the single fact arm 1 exists to hold down.
// SES-146: every cadence number in this system is a runner_settings column. A later session that
// hardcodes 72 into a function or a runbook re-creates exactly the class of drift M5-12's own span
// was corrected for -- and every word about a 72-hour window stays true while the number lives in
// two places that can disagree.
//
// THREE CONTENT ARMS, AND THE SPLIT IS DELIBERATE (the SES-281 / SES-297 precedent).
//   * The DOC arm always runs. docs/RUNNER-GOV-M6-REQUIREMENTS.md is the canonical home of the
//     window's CONTRACT, so the number and the gate record are READ OUT OF THE REGISTER, never
//     restated here. Each clause is paired with a negative control -- "would this still pass if
//     the change did nothing?" must answer "no" -- and a meta-assertion checks the controls
//     themselves (the SES-158 lesson: a control that changes nothing proves nothing).
//   * The LIVE arms run only with SUPABASE_URL + SUPABASE_SERVICE_KEY and are DECLARED not-run
//     otherwise (SES-180 notRun()), never silently skipped. Every read is paired with a MADE-UP
//     COLUMN control that must 400: without it, a read returning [] proves nothing -- PostgREST
//     answers an empty table and a mis-spelled filter the same way to a careless reader.
//   * Arm 2 calls rpc/ladder_work_class, which is IMMUTABLE and writes nothing. Its purity is
//     ASSERTED by side effect (runner_ladder and runner_before_images counts), because PostgREST
//     cannot read pg_proc.provolatile.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied -- see the notRun() at the foot.
// record_decision() / sweep_decision_windows() / reverse_decision() are WRITERS: they insert the
// decision ledger, move runner_ladder and replay rows. A permanent regression test must never do
// any of that on the live board, and PostgREST cannot open a transaction to roll it back. Those
// arms were measured at this ship inside one deliberately failing DO block, every fixture rolled
// back, and the numbers are recorded verbatim below.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const M6_REL = "docs/RUNNER-GOV-M6-REQUIREMENTS.md";
const M6 = path.join(ROOT, M6_REL);

// The M6-02 section, sliced out by its own heading so a clause cannot pass on a 72 that happens to
// appear somewhere else in a 300-line register.
const M6_02_START = '<a id="M6-02"></a>';
const M6_02_END = '<a id="M6-03"></a>';
// The gate record this mechanism implements. Held as a PRESERVED INVARIANT: it already existed
// before this ticket, and the point of asserting it is that a later doc trim cannot drop the
// record without failing here first.
const GATE_ANCHOR = '<a id="the-m6-gate-decision"></a>';

// The digit -> class mapping, held here ONLY as the closed set arm 2 ranges over. Six classes, and
// the SEVENTH case is the one that matters: a class the ladder does not track returns null rather
// than guessing. 'P9 - Bug Fixes · FLAGGED' is deliberately the flagged string form -- the class is
// the DIGIT, never the label (recompute_backlog_queue()'s own lesson).
export const CLASS_CASES = [
  ["P2 - Invention", "invention"],
  ["P5 - Enhancement", "enhancement"],
  ["P7 - Agent Creation", "agent_creation"],
  ["P8 - Determinism Removal", "determinism_removal"],
  ["P9 - Bug Fixes · FLAGGED", "bug_fix"],
  ["P10 - Tooling", "tooling"],
  ["P6 - Agent Enhancement", null],
];

// ---------------------------------------------------------------------------
// Pure readers
// ---------------------------------------------------------------------------

// Slice a bounded block out of a markdown file. Returns "" when absent -- itself a finding rather
// than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

// The register is hard-wrapped, so a load-bearing phrase can straddle a line break and a literal
// match fails for a reason that has nothing to do with the rule (the SES-194 lesson).
export const norm = s => s.replace(/\s+/g, " ");

export const m6_02Block = md => norm(extractBlock(md, M6_02_START, M6_02_END));

// ---------------------------------------------------------------------------
// The doc clauses. A clause earns its place only if REMOVING it would change what a cycle does.
// ---------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "the-window-is-72-hours",
    detail:
      "M6-02 must still name 72 hours as the window. This is the number record_decision() seeds " +
      "runner_settings.reversal_window_hours with and computes every expires_at from -- change " +
      "the register without changing the column and the shipped window silently disagrees with " +
      "the rule it implements, in the direction where a decision is final before anyone reading " +
      "the register expects it to be",
    test: s => /\b72[\s-]*hours?\b/i.test(s),
    // GLOBAL, and that is not a style choice: M6-02 states the number twice ("reversible for 72
    // hours" in the rule line, "72 hours is the window" in the rationale). A single-occurrence
    // break leaves the second one standing, the clause passes, and the teeth check reports a
    // control failure that is really a bug in the control. Caught by that check on the first run.
    breaks: s => s.replace(/72([\s-]*hours?)/gi, "48$1"),
  },
  {
    id: "silence-is-assent-not-a-park",
    detail:
      "M6-02 must still say silence is assent and NEVER a park, and name B23 / B14 as the " +
      "superseded pair. sweep_decision_windows() finalises on silence and PROMOTES the named " +
      "class for it; if the register reverts to parking, the sweep is a mechanism that awards " +
      "trust for exactly the non-response the rule used to treat as the strongest possible veto",
    test: s => /silence is assent/i.test(s) && /never a park/i.test(s) && /B23/.test(s) && /B14/.test(s),
    breaks: s => s.replace(/never a park/i, "or a park"),
  },
  {
    id: "the-window-spans-a-scheduler-cadence",
    detail:
      "M6-02 must keep the REASON the number is 72 -- that it spans a full scheduler cadence " +
      "rather than a single quiet afternoon, the same span M5-12 uses -- and the 42-of-45 " +
      "measurement behind it. A window with no reason behind it is the first thing a later " +
      "session shortens for convenience, and expires_at is computed at record time, so every " +
      "already-open window keeps the old value and the two cohorts become indistinguishable",
    test: s => /scheduler cadence/i.test(s) && /M5-12/.test(s) && /\b42\b/.test(s) && /\b45\b/.test(s),
    breaks: s => s.replace(/scheduler cadence/i, "reasonable period"),
  },
  {
    id: "the-gate-record-survives-a-doc-trim",
    detail:
      "the M6 gate-decision section must still exist, by its own anchor. It IS the recorded " +
      "reasoning for the decisions this mechanism was built to make reversible -- M6-01 requires " +
      "the reasoning be recorded, and that section is the record. A trim that drops it leaves " +
      "runner_decisions holding handles to a decision nobody can read the argument for",
    test: (_s, md) => md.includes(GATE_ANCHOR),
    breaks: (_s, md) => md.split(GATE_ANCHOR).join('<a id="some-other-heading"></a>'),
    wholeFile: true,
  },
];

function readM6() {
  return fs.readFileSync(M6, "utf8");
}

// ---------------------------------------------------------------------------
// SES-316 arm (a): A CLAIM IS NOT A JUDGMENT WRITE, asserted in the SQL a session copies.
// ---------------------------------------------------------------------------
//
// THE ANCHOR IS THE CLAIM'S OWN COLUMN, never a line number or a step heading. Both runbooks carry
// several `UPDATE public.backlog_items` blocks (the design_status flag write and 7b's decision
// template among them) and those blocks SHOULD keep writing updated_at -- a judgment write is
// exactly what updated_at is for. So each site is found by the `claimed_by` term that makes it a
// claim or a release, and the slice is bounded by the fence around it: a check that grepped the
// whole file for `updated_at` would fail on correct content, which is a checker that has to be
// disabled the first time it fires.
const RUNBOOKS = {
  "runner-cycle": "docs/runbooks/runner-cycle.md",
  "session-setup": "docs/runbooks/session-setup.md",
};

export const CLAIM_SITES = [
  {
    id: "runner-cycle-step-5-claim",
    file: "runner-cycle",
    anchor: "claimed_by = '<your cycle id or session name>'",
    detail:
      "runner-cycle.md step 5's claim UPDATE must not write updated_at. A claim is coordination, " +
      "and 7b's own list of what is NOT a decision names it -- bumping updated_at contradicted " +
      "that in SQL and made every decision on a picked ticket un-restorable minutes after the " +
      "drain picked it up, because reverse_decision() cannot tell a claim from somebody else's " +
      "later write",
  },
  {
    id: "runner-cycle-release",
    file: "runner-cycle",
    anchor: "claimed_by = NULL, claimed_at = NULL",
    detail:
      "runner-cycle.md's post-push release UPDATE must not write updated_at either -- a release " +
      "is the claim's mirror image, and one that stamped updated_at would make the decision the " +
      "cycle recorded at 7b un-restorable one statement after its own push",
  },
  {
    id: "session-setup-2c-claim",
    file: "session-setup",
    anchor: "claimed_by = '<short-session-name>'",
    detail:
      "session-setup.md 2c's claim UPDATE must not write updated_at. Manual sessions and " +
      "scheduled cycles share one board and one claim contract (register B40); a fix that " +
      "landed on only one of the two runbooks leaves the defect live on whichever half John " +
      "happens to be running",
  },
  {
    id: "session-setup-2c-release",
    file: "session-setup",
    anchor: "claimed_by = NULL, claimed_at = NULL",
    detail:
      "session-setup.md 2c's release UPDATE must not write updated_at, same reason as the " +
      "cycle's",
  },
];

// Slice the fenced ```sql block that CONTAINS `anchor`. Returns "" when the anchor or its fence is
// absent -- a finding for the caller to report, never a throw, same contract as extractBlock().
//
// IT SCANS EVERY OCCURRENCE, and that is not defensive coding -- it is the fix for a real first-run
// failure. `claimed_by = NULL, claimed_at = NULL` appears in runner-cycle.md's PROSE (the paragraph
// recording that the old wording said the opposite) ~200 lines before the statement itself, so a
// first-match slicer resolved to an unfenced mention and reported "site missing" on correct
// content. Same shape as the ID-decoy trap in .claude/rules: a string that merely LOOKS like the
// thing gets picked up ahead of the thing. So the loop takes the first occurrence that actually
// resolves inside a ```sql fence, and an anchor with no fenced occurrence at all still returns "".
export function sqlBlockAround(md, anchor) {
  for (let at = md.indexOf(anchor); at >= 0; at = md.indexOf(anchor, at + 1)) {
    const open = md.lastIndexOf("```sql", at);
    if (open < 0) continue;
    const bodyStart = md.indexOf("\n", open);
    if (bodyStart < 0 || bodyStart > at) continue;
    const close = md.indexOf("```", bodyStart);
    if (close < 0 || close < at) continue;   // the anchor sits after this fence closed: prose
    return md.slice(bodyStart + 1, close);
  }
  return "";
}

// The claim's shape, as one predicate so the teeth check below can break it. TWO HALVES, and the
// positive half is not decoration: without it a mis-sliced empty block would "pass" the
// no-updated_at half trivially, which is the vacuous-green shape SES-158 named.
export const isCoordinationOnly = sql =>
  /UPDATE\s+public\.backlog_items/.test(sql) &&
  /claimed_by/.test(sql) &&
  !/updated_at/.test(sql);

// The break every site shares: put the bump back exactly where SES-316 took it out.
export const restoreTheBump = sql =>
  sql.replace(/(claimed_at = (?:now\(\)|NULL))/, "$1, updated_at = now()");

function readRunbook(key) {
  return fs.readFileSync(path.join(ROOT, RUNBOOKS[key]), "utf8");
}

function aClaimNeverWritesUpdatedAt() {
  for (const s of CLAIM_SITES) {
    const sql = sqlBlockAround(readRunbook(s.file), s.anchor);
    assert.ok(
      sql.length > 0,
      `${RUNBOOKS[s.file]}: no fenced sql block found around ${JSON.stringify(s.anchor)} -- the ` +
        "site this clause grades has moved or been renamed, so the clause is grading nothing. " +
        `Re-anchor it rather than deleting it: ${s.detail}`,
    );
    assert.ok(
      /UPDATE\s+public\.backlog_items/.test(sql) && /claimed_by/.test(sql),
      `${RUNBOOKS[s.file]}: the block sliced for "${s.id}" is not a backlog_items claim/release ` +
        `statement -- the anchor matched somewhere else in the file. Block was:\n${sql}`,
    );
    assert.ok(
      !/updated_at/.test(sql),
      `${RUNBOOKS[s.file]} site "${s.id}" writes updated_at again: ${s.detail} (SES-316). The ` +
        `statement is:\n${sql}`,
    );
  }
}

// EVERY SITE HAS TEETH: put the bump back and the predicate must fail.
function everyClaimSiteHasTeeth() {
  for (const s of CLAIM_SITES) {
    const sql = sqlBlockAround(readRunbook(s.file), s.anchor);
    const broken = restoreTheBump(sql);
    assert.notStrictEqual(
      broken, sql,
      `site "${s.id}"'s break returned its input unchanged -- restoreTheBump() no longer matches ` +
        "this statement's shape, so the teeth check below would pass vacuously (the SES-158 " +
        `meta-control). Block was:\n${sql}`,
    );
    assert.ok(
      !isCoordinationOnly(broken),
      `site "${s.id}" still reads as coordination-only with updated_at = now() put back -- the ` +
        "clause is not testing what its detail claims and would go green through the exact edit " +
        "it exists to catch",
    );
    assert.ok(
      isCoordinationOnly(sql),
      `site "${s.id}" fails isCoordinationOnly() on the SHIPPED text while the broken form is ` +
        "graded -- the two halves of the predicate disagree, so one of them is wrong",
    );
  }
}

// FILE-LEVEL NEGATIVE CONTROL for the slicer: an absent anchor and an unfenced one are both
// reported as "" rather than crashing or returning the rest of the file.
function aMissingClaimBlockIsFlagged() {
  assert.strictEqual(sqlBlockAround("nothing here", "claimed_by = NULL"), "",
    "sqlBlockAround() must return \"\" for an absent anchor");
  assert.strictEqual(sqlBlockAround("claimed_by = NULL with no fence at all", "claimed_by = NULL"), "",
    "sqlBlockAround() must return \"\" when the anchor sits outside any ```sql fence -- otherwise " +
    "prose that merely MENTIONS the claim would be graded as the statement");
  assert.strictEqual(
    sqlBlockAround("```sql\nUPDATE public.backlog_items SET claimed_by = NULL;\n```", "claimed_by = NULL"),
    "UPDATE public.backlog_items SET claimed_by = NULL;\n",
    "sqlBlockAround() must return the fenced body, and only the body",
  );
}

function theShippedRegisterIsClean() {
  const md = readM6();
  const s = m6_02Block(md);
  assert.ok(
    s.length > 0,
    `the M6-02 section is missing from ${M6_REL} -- runner_decisions, its 72-hour column and ` +
      "sweep_decision_windows() are in the database with no rule in the repo they implement, " +
      "which is the same failure this ticket was filed to fix, pointed the other way",
  );
  for (const c of CLAUSES) {
    assert.ok(c.test(s, md), `${M6_REL} lost clause "${c.id}": ${c.detail}`);
  }
}

// FILE-LEVEL NEGATIVE CONTROL: an absent block must be reported as a finding, not crash.
function aMissingBlockIsFlagged() {
  assert.strictEqual(extractBlock("nothing here", M6_02_START, M6_02_END), "",
    "extractBlock() must return \"\" for an absent block so the caller can report it");
  assert.strictEqual(m6_02Block("nothing here"), "",
    "m6_02Block() on a register with no M6-02 must be empty, not throw");
}

// EVERY CLAUSE HAS TEETH: apply its own break and the clause must fail. Without this the suite can
// go green on clauses that match anything.
function everyClauseHasTeeth() {
  const md = readM6();
  for (const c of CLAUSES) {
    if (c.wholeFile) {
      const broken = c.breaks(m6_02Block(md), md);
      assert.ok(
        !c.test(m6_02Block(broken), broken),
        `clause "${c.id}" still passes against its own broken register -- it is not testing what ` +
          "its detail claims, and would go green through the exact edit it exists to catch",
      );
    } else {
      const broken = c.breaks(m6_02Block(md), md);
      assert.ok(
        !c.test(broken, md),
        `clause "${c.id}" still passes against its own broken block -- it is not testing what its ` +
          "detail claims",
      );
    }
  }
}

// META-CONTROL (the SES-158 lesson): a break that changes nothing proves nothing, so the breaks
// themselves are checked for having actually mutated their input.
function aVacuousMutationFailsItsOwnControl() {
  const md = readM6();
  const s = m6_02Block(md);
  for (const c of CLAUSES) {
    const input = c.wholeFile ? md : s;
    const broken = c.breaks(s, md);
    assert.notStrictEqual(
      broken, input,
      `clause "${c.id}"'s break() returned its input unchanged -- the teeth check above would ` +
        "pass vacuously, which is a control that controls nothing",
    );
  }
}

// ---------------------------------------------------------------------------
// Arms 1 and 2 -- live Supabase over PostgREST. Read-only by construction; the read-only-ness of
// the RPC is ASSERTED below rather than assumed.
// ---------------------------------------------------------------------------

const base = url => url.replace(/\/+$/, "");

async function raw(url, key, pathAndQuery, init) {
  return fetch(`${base(url)}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function pg(url, key, pathAndQuery, init) {
  const res = await raw(url, key, pathAndQuery, init);
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

async function countOf(url, key, q) {
  const res = await fetch(`${base(url)}/rest/v1/${q}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
  });
  if (!res.ok) throw new Error(`${q} returned HTTP ${res.status}`);
  return Number((res.headers.get("content-range") || "/0").split("/")[1]);
}

// THE PAIRED CONTROL. A read that succeeds proves the column exists only if the SAME read against
// a column that cannot exist FAILS -- otherwise a permissive gateway, a cached response or a
// mis-read [] all look like a pass.
async function reachableWithControl(url, key, table, column, what) {
  const good = await raw(url, key, `${table}?select=${column}&limit=1`);
  assert.ok(
    good.ok,
    `${table}?select=${column} returned HTTP ${good.status} -- ${what}. This is the arm that ` +
      "fails against the un-migrated database, where to_regclass('public.runner_decisions') was " +
      "NULL and the column did not exist (measured 2026-09-02, before migration " +
      "ses286a_reversal_window)",
  );
  const rows = await good.json();
  assert.ok(Array.isArray(rows), `${table}?select=${column} returned a non-array payload`);

  const bad = await raw(url, key, `${table}?select=ses286_no_such_column&limit=1`);
  assert.strictEqual(
    bad.status, 400,
    `the control read of ${table} for a made-up column returned HTTP ${bad.status}, not 400 -- ` +
      "so the assertion above proves nothing about whether " +
      `${column} exists, only that the request was answered`,
  );
  return rows;
}

async function theShippedSchemaCarriesTheWindow() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live schema arm: runner_settings.reversal_window_hours = 72, public.runner_decisions " +
        "reachable, runner_before_images.decision_id present -- each with its made-up-column control",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The doc arm above still graded all " +
        "four clauses of M6-02's contract and the gate record against the committed register. " +
        "Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  // 1a. THE WINDOW IS A COLUMN. Read from runner_settings, never from a constant in this file.
  const settings = await reachableWithControl(
    url, key, "runner_settings", "reversal_window_hours",
    "the reversal window has no column to live in, so record_decision() cannot compute an " +
      "expires_at and M6-02's 72 hours is prose again",
  );
  assert.strictEqual(settings.length, 1,
    `runner_settings returned ${settings.length} rows -- it is a singleton (id = 1, ` +
    "ck_runner_settings_singleton), and a second row means two disagreeing windows");
  assert.strictEqual(
    settings[0].reversal_window_hours, 72,
    `reversal_window_hours is ${settings[0].reversal_window_hours}, not 72. The number lives HERE ` +
      "and nowhere else (SES-146). If M6-02 was deliberately changed, this row moves with it -- " +
      "and note expires_at is computed at record time, so every window already open keeps the old " +
      "span rather than jumping to the new one",
  );

  // 1b. THE DECISION LEDGER EXISTS. Possibly empty -- reachability is the assertion.
  await reachableWithControl(
    url, key, "runner_decisions", "id",
    "there is no table recording a decision, which is precisely the state SES-286 measured: " +
      "M6-02/05/06/07 all live, all marked `script`, and no script to run",
  );

  // 1c. THE HANDLE REACHES THE IMAGES. Without decision_id, "undo this decision" has no undo set
  // and reverse_decision() replays nothing however correct its body is.
  await reachableWithControl(
    url, key, "runner_before_images", "decision_id",
    "before-images cannot name the decision they were written under, so a decision's reversal " +
      "handle points at nothing replayable",
  );
}

async function theClassMappingHasOneHome() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live RPC arm: ladder_work_class() over all seven digit cases, and its purity asserted " +
        "by side effect",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. Canonical invocation: STANDARDS.md " +
        "Section 2 rule 5.",
    );
    return;
  }

  const before = {
    ladder: await pg(url, key, "runner_ladder?select=work_class,rung,streak&order=work_class"),
    images: await countOf(url, key, "runner_before_images?select=id"),
  };

  for (const [input, expected] of CLASS_CASES) {
    const got = await pg(url, key, "rpc/ladder_work_class", {
      method: "POST",
      body: JSON.stringify({ p_priority_class: input }),
    });
    assert.strictEqual(
      got, expected,
      `ladder_work_class(${JSON.stringify(input)}) returned ${JSON.stringify(got)}, expected ` +
        `${JSON.stringify(expected)}. This function is the ONE home of the digit -> work-class ` +
        "mapping; apply_ladder_decision() still carries a duplicate CASE that SES-122 removes, and " +
        "two copies that can disagree is the whole reason this was extracted",
    );
  }

  // The null case, stated separately because it is the one a later editor is tempted to make a
  // default: a class the ladder does not track must return null, never a guess. A wrong guess here
  // promotes the wrong class on every unreversed decision in that class, forever.
  const nullCase = await pg(url, key, "rpc/ladder_work_class", {
    method: "POST", body: JSON.stringify({ p_priority_class: "not a class at all" }),
  });
  assert.strictEqual(nullCase, null,
    `ladder_work_class('not a class at all') returned ${JSON.stringify(nullCase)}; an untracked ` +
    "class must be null so record_decision() records no ladder effect rather than the wrong one");

  // PURITY, asserted by SIDE EFFECT because pg_proc.provolatile is unreachable from here. The way
  // this breaks is someone "improving" the helper into something that reads or stamps the ladder.
  const after = {
    ladder: await pg(url, key, "runner_ladder?select=work_class,rung,streak&order=work_class"),
    images: await countOf(url, key, "runner_before_images?select=id"),
  };
  assert.deepStrictEqual(
    after, before,
    "calling ladder_work_class() moved the board. It is declared IMMUTABLE and must touch nothing " +
      "-- a permanent test may call it only because it writes nothing, so this assertion is what " +
      `keeps that true. before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
  );

  // Every class the mapping can return must be a real runner_ladder row, or a decision naming it
  // fails runner_decisions' foreign key at record time rather than at review time.
  const classes = new Set(before.ladder.map(l => l.work_class));
  for (const [, expected] of CLASS_CASES) {
    if (expected === null) continue;
    assert.ok(classes.has(expected),
      `ladder_work_class() can return ${JSON.stringify(expected)}, which is not a runner_ladder ` +
      "row -- runner_decisions.ladder_work_class references that table, so such a decision cannot " +
      `be recorded at all. Live classes: ${[...classes].join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// SES-316 arm (b): the shipped RPC reports written-since refusals in their own column.
// ---------------------------------------------------------------------------
//
// READ-ONLY BY THE PATH IT TAKES, and that is the whole argument for a permanent test being
// allowed to call a writer at all. p_actor = '' returns at the SECOND statement of the function
// body -- before `select ... from runner_decisions ... for update`, before the reversal row is
// inserted, before the image loop. Nothing is read and nothing is written. Two things make that
// claim checkable rather than asserted: the `reason` text pins WHICH guard answered (so this
// cannot silently start grading some other path), and the ledger counts are compared either side.
const SES316_OUT_COLUMNS = [
  "outcome", "restored", "restored_unverified", "refused",
  "refused_written_since",   // SES-316. The reason this arm exists.
  "demoted", "reversal_id", "reason",
];

const BLANK_ACTOR_GUARD = "p_actor is required";

async function theRpcReportsWrittenSinceRefusals() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live reverse_decision() signature arm: refused_written_since present in the RPC's own " +
        "response columns, its made-up-column control, and the write-free-ness of the guard path " +
        "asserted by side effect",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The doc arm above still graded both " +
        "runbooks' claim and release statements against the committed text. Canonical " +
        "invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const before = {
    decisions: await countOf(url, key, "runner_decisions?select=id"),
    images: await countOf(url, key, "runner_before_images?select=id"),
  };

  const args = JSON.stringify({
    p_decision: "00000000-0000-0000-0000-000000000000",
    p_actor: "",                                   // the guard this arm rides on
    p_reason: "ses-316 read-only signature probe",
  });

  // 3a. THE COLUMN SET, off a real response -- the only place PostgREST exposes it (see the
  // deviation note in this file's header: the OpenAPI root describes inputs only).
  const res = await raw(url, key, "rpc/reverse_decision", { method: "POST", body: args });
  assert.ok(
    res.ok,
    `rpc/reverse_decision returned HTTP ${res.status} -- this is the arm that fails against a ` +
      "database still carrying the pre-SES-316 function, and it also fails if service_role lost " +
      "EXECUTE (the grants a DROP + CREATE silently discards)",
  );
  const rows = await res.json();
  assert.ok(Array.isArray(rows) && rows.length === 1,
    `rpc/reverse_decision returned ${JSON.stringify(rows).slice(0, 200)}; a TABLE-returning ` +
    "function's guard path yields exactly one row");

  // THE PATH, PINNED. Without this the column check could go green off any other return -- and
  // one of those other returns writes a reversal row.
  assert.ok(
    String(rows[0].reason || "").includes(BLANK_ACTOR_GUARD),
    `the probe did not take the blank-actor guard path (reason was ` +
      `${JSON.stringify(rows[0].reason)}). This arm is only read-only BECAUSE that is the path it ` +
      "takes -- if the guard order changed, stop and re-derive the write-free path before " +
      "re-pointing this assertion",
  );
  assert.deepStrictEqual(
    Object.keys(rows[0]).sort(), [...SES316_OUT_COLUMNS].sort(),
    "reverse_decision()'s response columns are not the SES-316 set. refused_written_since is the " +
      "new one: it counts ONLY rows left alone because they were written after the decision, " +
      "which is a different fact from `refused` (a row that was never this decision's to undo). " +
      "A missing column here means the migration did not land; an extra one means a later " +
      "session changed the contract and every reader of these counts needs re-reading",
  );
  assert.strictEqual(rows[0].refused_written_since, 0,
    "the guard path must report refused_written_since = 0, not null -- every early return " +
    "initialises the counter, so a caller never has to distinguish 'none' from 'unset'");

  // 3b. THE PAIRED CONTROL, in this file's own idiom: the projection of the new column must 200
  // AND a made-up name on the same endpoint must 400. Without the second half, a permissive
  // gateway or a stripped-nulls response would look identical to the column existing.
  const good = await raw(url, key, "rpc/reverse_decision?select=refused_written_since",
                         { method: "POST", body: args });
  assert.strictEqual(good.status, 200,
    `?select=refused_written_since returned HTTP ${good.status} -- the column is not projectable, ` +
    "so it is not in the function's return type whatever the row above appeared to show");
  const bad = await raw(url, key, "rpc/reverse_decision?select=ses316_no_such_column",
                        { method: "POST", body: args });
  assert.strictEqual(bad.status, 400,
    `the control projection of a made-up column returned HTTP ${bad.status}, not 400 -- so the ` +
    "assertion above proves nothing about whether refused_written_since exists, only that the " +
    "request was answered");

  // 3c. WRITE-FREE, asserted by side effect (pg_proc is unreachable from here). Three calls above;
  // the ledger must not have moved by one row.
  const after = {
    decisions: await countOf(url, key, "runner_decisions?select=id"),
    images: await countOf(url, key, "runner_before_images?select=id"),
  };
  assert.deepStrictEqual(
    after, before,
    "the guard-path probe MOVED THE LEDGER. reverse_decision() is a writer, and this arm is only " +
      "permitted because p_actor = '' returns before the first write -- if that is no longer " +
      "true, delete this arm rather than accepting the drift. " +
      `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
  );
}

async function run() {
  theShippedRegisterIsClean();
  aMissingBlockIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  aClaimNeverWritesUpdatedAt();          // SES-316 arm (a)
  everyClaimSiteHasTeeth();              // SES-316 arm (a), controls
  aMissingClaimBlockIsFlagged();         // SES-316 arm (a), slicer control
  await theShippedSchemaCarriesTheWindow();
  await theClassMappingHasOneHome();
  await theRpcReportsWrittenSinceRefusals();   // SES-316 arm (b)

  notRun(
    "the write paths -- record_decision(), attach_before_images(), sweep_decision_windows() and " +
      "reverse_decision()'s RESTORE path (arm 3 above calls only its blank-actor guard, which " +
      "returns before the first read or write) -- and every pg_proc fact (provolatile, overload " +
      "count, EXECUTE grants)",
    "all four are WRITERS: they insert the decision ledger, move runner_ladder, and delete and " +
      "rewrite rows. A permanent regression test must never do that on the live board (the " +
      "SES-196 / SES-218 / SES-275 refusal), and this suite reaches Supabase only over PostgREST, " +
      "which cannot read pg_proc and cannot open a transaction to roll a fixture back. MEASURED AT " +
      "THIS SHIP INSTEAD, live, inside one deliberately failing DO block with every fixture rolled " +
      "back: record_decision(NULL,'smoke-286a','ticket-status','SES-999',..,'tooling') returned an " +
      "id with expires_at - decided_at = 3 days exactly; attach_before_images() attached 1 image " +
      "and returned 0 on a second call against the same image (never re-points); " +
      "sweep_decision_windows() returned finalized 0, promoted 0 while the window was still OPEN " +
      "(the control), then 1 and 1 once expires_at was forced into the past, then 0 and 0 on an " +
      "immediate second call (idempotent), stamping status='final' and ladder_applied_at; " +
      "runner_ladder.tooling went 13/42 -> 13/43 on the promote (streak +1, rung unchanged because " +
      "43 % 5 <> 0, streak NOT reset -- SES-107) and 13/43 -> 12/0 on the reversal's demote; " +
      "reverse_decision() returned outcome='applied', restored 1 (a backlog_items tier written " +
      "back from 'later' to 'now'), restored_unverified 1 (runner_directives, no updated_at " +
      "column), refused 1 (a runner_items image -- a ledger table outside the allowlist, never " +
      "written), demoted true, wrote a kind='reversal' row with reverses = the original and 2 " +
      "before-images under its own reversal_id, and marked the original status='reversed'; and it " +
      "returned 'refused' for a second reversal of the same decision, for the reversal row itself, " +
      "for an absent id, and for a blank actor. Zero fixture residue on re-read: 0 " +
      "runner_decisions rows, 0 images attributed to the fixture session, 0 images carrying a " +
      "decision_id, SES-286 tier back at 'now', tooling back at 13/42, reversal_window_hours 72. " +
      "SES-316 ADDED FOUR MORE FIXTURES AT ITS OWN SHIP (v7.0.403), same rolled-back DO-block " +
      "shape, and they are the claimed-after-decision case this file cannot hold permanently -- " +
      "asserted on the OUTCOME AND THE COUNTS, never on \"it returned\": (1) a before-image dated " +
      "5 minutes BEFORE decided_at (the attach_before_images() shape) plus a claim in the new " +
      "coordination-only form -> outcome='applied', restored 1, refused_written_since 0, the " +
      "ticket's tier restored, and the claim itself intact -- the OLD guard would have refused " +
      "this row, because updated_at postdated that image; (2) THE CONTROL, the same fixture with " +
      "the OLD claim shape (updated_at bumped to decided_at + 5 min) -> outcome='refused', " +
      "refused_written_since 1, restored 0, the tier LEFT ALONE, runner_decisions.status still " +
      "'open', runner_ladder unmoved, and ZERO rows with reverses = that decision (the reversal " +
      "row is withdrawn, so the ledger never carries a kind='reversal' row pointing at a " +
      "decision that still stands) -- assert this pair together or neither proves anything, " +
      "since (1) alone would also pass if the guard had simply been deleted; (3) two backlog rows " +
      "under one decision with one of them legitimately written later -> outcome='partial', " +
      "restored 1 / refused_written_since 1, decision marked 'reversed', bug_fix demoted once, " +
      "and the reversal row's own summary carrying the counts verbatim; (4) a runner_items " +
      "(ledger, outside the allowlist) image beside a restorable backlog row -> outcome='applied' " +
      "with refused 1 and the reason sentence appending 'READ THE COUNTS, NOT THE OUTCOME' -- " +
      "that hint fires ONLY where the outcome and the counts disagree, so 'partial' and 'refused' " +
      "deliberately do not get it. Zero residue on re-read: 0 fixture decisions, 0 fixture " +
      "images, both live open decisions untouched, SES-316/SES-315 unchanged, bug_fix back at " +
      "1/1. Also measured at that ship, before a line changed: backlog_items carries NO " +
      "updated_at trigger (pg_trigger: only backlog_done_requires_verdict, BEFORE UPDATE OF " +
      "status), which is what makes the arm-(a) omission real rather than cosmetic, and " +
      "recompute_backlog_queue() writes queue and pinned_position ONLY. " +
      "pg_proc at the same ship: exactly 1 overload of each of the six functions, " +
      "ladder_work_class provolatile='i', and EXECUTE true for service_role and false for anon and " +
      "authenticated on all six (has_function_privilege, both directions). runner_decisions itself: " +
      "0 grant rows for anon/authenticated, relacl service_role only. ONE DEFECT FOUND AND FIXED " +
      "BY THAT FIXTURE, recorded because the same hole is still latent in the shipped restore " +
      "engine: the kickoff's delete-and-reinsert restore raised 23503 on " +
      "backlog_items_blocked_by_fkey (SES-312 is blocked_by SES-286), so reverse_decision() now " +
      "restores an existing row's columns IN PLACE with an UPDATE, and each row's write sits in " +
      "its own sub-block so one schema refusal is counted rather than aborting the whole reversal " +
      "(migration ses286a_restore_in_place).",
  );
}

selfRun(import.meta.url, run);
export default run;
