// DeepBench v7.0.399 | tests/regression/ses-122c-class-caps.test.mjs | SES-122 (c)
//
// FEATURE: SES-122 (c) -- guards the moment the numeric scope caps stopped being literals. The three
// cap rules in public.governance_rules -- CAP-SCOPE-FILES, CAP-SCOPE-TASKS and HR-SCOPE -- now state
// a BASELINE PLUS WHAT THE RUNG EARNED, read from public.class_autonomy(priority_class), and
// HR-SCOPE's canonical home moved from CLAUDE.md#hard-rules (John's file: cited, never edited) to
// docs/STANDARDS.md#section-2-session-scope-rules.
//
// THE ASSERTION THAT MATTERS MOST IS THE ONE ABOUT WHAT DID **NOT** CHANGE. Clause
// `feature-cap-untouched` pins CAP-SCOPE-FEATURE's statement byte-for-byte. A ticket that widens
// three of the four scope caps is exactly the change most likely to over-reach into the fourth, and
// the one-feature cap is the one charter decision 5 did not put on the ladder: a rung buys breadth
// of edit, never a second feature. That clause was ALREADY GREEN before this ticket existed, and
// that is the point -- it is a guard, not a goal.
//
// WHY THE EQUALITY CLAUSE DOES NOT HARDCODE THE THREE STATEMENTS. The registry is authoritative and
// docs/STANDARDS.md Section 2 is its canonical home, so the clause reads BOTH and compares them --
// the same registry-vs-canonical-doc shape SES-280 established for the M5 register, and the reason a
// re-worded row cannot silently leave the doc behind. A hardcoded copy here would be a THIRD home
// for the same sentence, which is the drift the registry was built to end. What is pinned literally
// is only what a wording change must never lose: the amendment's substance (`class_autonomy`), and
// the feature cap's exact text.
//
// THE DOC-SIDE FORMAT CONTRACT, stated because the equality clause depends on it: a cap statement
// lives in Section 2 on ONE line, either as a numbered-list item (`N. <statement>`) or as a
// blockquote line (`> <statement>`), with nothing else on that line. Section 2's rule NUMBERS are
// load-bearing elsewhere -- SES-61 slices "rule 5" by its literal opening, and Section 5 and eight
// test files cite "Section 2 rule 5"/"rule 7" -- so HR-SCOPE is homed as a blockquote UNDER the
// list rather than as a new item 4, which would renumber every one of those citations.
//
// LINE ENDINGS ARE NORMALISED BEFORE EVERY MATCH, and that is not tidying. This worktree is CRLF and
// git blobs are LF (SES-300's false green, recorded in runner-cycle.md step 8b-bis): a pattern
// written as `\n` matches on one and nothing on the other, on byte-identical content. Normalise,
// then match.
//
// DRY-RUN RESULT, executed against the unchanged worktree at origin/dev@d1d4589a BEFORE any of the
// implementation landed (STANDARDS.md Section 4), measured rather than predicted:
//   * caps-equal-their-canonical-home        FAILED (Section 2 said "Max 3 files modified per
//                                            session"; the row says "Modify at most 3 files ...")
//   * caps-name-the-ladder-function          FAILED (no `class_autonomy` in any of the three rows)
//   * standards-names-the-mechanism          FAILED (Section 2 named neither symbol)
//   * runbook-step-5-reads-the-caps          FAILED (step 5 never read a cap)
//   * runbook-step-7-cites-the-class-caps    FAILED (the QA bar cited the bare 3/4)
//   * ledger-records-the-three-amendments    FAILED (no entry for any of the three rows)
//   * feature-cap-untouched                  PASSED (preserved, and must stay so)
//   * the LIVE RPC arm                       PASSED (class_autonomy shipped in part (a), v7.0.397)
//
// EVERY CLAUSE IS PAIRED WITH A NEGATIVE CONTROL -- the same bundle with the one thing that should
// matter removed. "Would this still pass if the change did nothing?" must answer "no" for each.
// There is also a meta-assertion (aVacuousMutationFailsItsOwnControl), the SES-158 lesson: a control
// that changes nothing proves nothing, and only checking the control itself catches it.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied:
//   * NO CYCLE IS ASSERTED TO OBEY THE WIDER CAP. The rules are `enforcement = 'prose'`; nothing in
//     the pick path reads extra_files/extra_tasks and refuses a ship that exceeds them. This file
//     guards that the rules are recorded, homed, reconciled and reachable -- never that they bind.
//   * The ladder WRITES (verdict_ladder_signal, apply_ladder_decision, sweep_decision_windows) are
//     part (a)/SES-286's subject and are guarded there. The live arm here is READ-ONLY on purpose:
//     class_autonomy is provolatile='s', and a permanent regression test must never move the board
//     (the SES-196 / SES-218 / SES-275 refusal).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseSnapshot } from "./ses-280-m5-governance-rules.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";
const STANDARDS_REL = "docs/STANDARDS.md";
const LEDGER_REL = "docs/SELFBUILD-RETIREMENT-LEDGER.md";
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";

// The three amended rows, and the one that must not move.
export const AMENDED_IDS = ["CAP-SCOPE-FILES", "CAP-SCOPE-TASKS", "HR-SCOPE"];
export const FEATURE_CAP_ID = "CAP-SCOPE-FEATURE";
// Pinned literally BECAUSE it is the invariant. Charter decision 5 put the file and task caps on the
// ladder and left this one alone; a rung buys breadth of edit, never a second feature.
export const FEATURE_CAP_STATEMENT = "Scope every session to exactly one feature.";
// HR-SCOPE's home after the re-homing. CLAUDE.md is John's file and this ticket may not edit it, so
// the row points at the doc it is allowed to reconcile instead.
export const HR_SCOPE_HOME = "docs/STANDARDS.md#section-2-session-scope-rules";

const lf = s => String(s).replace(/\r\n/g, "\n");
const read = rel => lf(fs.readFileSync(path.join(ROOT, rel), "utf8"));

// ---------------------------------------------------------------------------
// Pure readers
// ---------------------------------------------------------------------------

// Slice one `## Section N: ...` block out of STANDARDS.md. Returns "" when absent -- itself a
// finding rather than a crash, since a reader that throws on a missing section reports nothing.
export function section(text, heading) {
  const t = lf(text);
  const a = t.indexOf(heading);
  if (a < 0) return "";
  const b = t.indexOf("\n## ", a + heading.length);
  return b < 0 ? t.slice(a) : t.slice(a, b);
}

// The doc-side format contract, implemented once: a statement is the whole of a numbered-list item's
// line or the whole of a blockquote line. Anything else in Section 2 is prose ABOUT the caps and is
// deliberately not a candidate -- otherwise a paraphrase in a paragraph could satisfy the equality.
export function statementLines(sectionText) {
  const out = new Set();
  for (const line of lf(sectionText).split("\n")) {
    const numbered = line.match(/^\d+\.\s(.+)$/);
    if (numbered) { out.add(numbered[1]); continue; }
    const quoted = line.match(/^>\s(.+)$/);
    if (quoted) out.add(quoted[1]);
  }
  return out;
}

// Slice one runbook step out by its bold opening, up to the next step's. Bounded rather than
// paragraph-based: a step here runs for hundreds of lines and a fixed window would read the wrong
// passage (check 12's measured lesson, one file over).
export function stepBlock(text, startsWith, endsWith) {
  const t = lf(text);
  const a = t.indexOf(startsWith);
  if (a < 0) return "";
  const b = t.indexOf(endsWith, a + startsWith.length);
  return b < 0 ? t.slice(a) : t.slice(a, b);
}

// Ledger entries are `### <n>. <subject> (<disposition>)` followed by their body.
export function ledgerEntries(text) {
  const t = lf(text);
    const parts = t.split(/^### (?=\d+[a-z]?\. )/m);
  return parts.slice(1).map(p => p.trim());
}

export function ruleById(rules, id) {
  return rules.find(r => r.id === id);
}

// ---------------------------------------------------------------------------
// The clauses, written once over one bundle so a control mutates exactly the thing its clause reads
// ---------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "caps-equal-their-canonical-home",
    detail:
      `each of ${AMENDED_IDS.join(", ")} carries a statement in ${SNAPSHOT_REL} that appears ` +
      `BYTE-FOR-BYTE as a statement line in ${STANDARDS_REL} Section 2 -- the registry is ` +
      "authoritative and Section 2 is its canonical home, so a paraphrase in either direction is " +
      "exactly the drift the registry was built to end",
    // Quantified over the THREE EXPECTED IDS, never over "whatever cap rows happen to be here":
    // every() on a filtered set is vacuously true when the set is empty (SES-280's measured trap).
    test: b => {
      const lines = statementLines(section(b.standards, "## Section 2: Session Scope Rules"));
      return AMENDED_IDS.every(id => {
        const r = ruleById(b.rules, id);
        return !!r && typeof r.statement === "string" && r.statement.length > 0 && lines.has(r.statement);
      });
    },
    breaks: b => ({
      ...b,
      standards: b.standards.replace("at most 3 files per session", "at most three files per session"),
    }),
  },
  {
    id: "caps-name-the-ladder-function",
    detail:
      "each of the three amended statements names `class_autonomy` -- the equality clause above " +
      "would be satisfied by any two agreeing copies, including the two pre-amendment literals, so " +
      "this is the clause that pins WHICH wording is in force",
    test: b => AMENDED_IDS.every(id => (ruleById(b.rules, id)?.statement || "").includes("class_autonomy")),
    breaks: b => ({
      ...b,
      rules: b.rules.map(r =>
        r.id === "CAP-SCOPE-TASKS"
          ? { ...r, statement: "Include at most 4 tasks per kickoff doc." }
          : r),
    }),
  },
  {
    id: "hr-scope-is-re-homed-off-claude-md",
    detail:
      `HR-SCOPE's canonical_doc is ${HR_SCOPE_HOME}. CLAUDE.md is John's file and this ticket may ` +
      "not edit it, so the row is re-homed to the doc it is allowed to reconcile; the CLAUDE.md " +
      "hard-rule line stays as his baseline statement and is CITED by the amended row, not contradicted",
    test: b => ruleById(b.rules, "HR-SCOPE")?.canonical_doc === HR_SCOPE_HOME,
    breaks: b => ({
      ...b,
      rules: b.rules.map(r => (r.id === "HR-SCOPE" ? { ...r, canonical_doc: "CLAUDE.md#hard-rules" } : r)),
    }),
  },
  {
    id: "standards-names-the-mechanism",
    detail:
      `${STANDARDS_REL} Section 2 names both \`class_autonomy\` and \`cap_relax_rung\` -- a reader ` +
      "at the cap must be able to find the function that says what their class earned, and the " +
      "setting the rung is measured against, without leaving the section",
    test: b => {
      const s = section(b.standards, "## Section 2: Session Scope Rules");
      return s.includes("class_autonomy") && s.includes("cap_relax_rung");
    },
    breaks: b => ({ ...b, standards: b.standards.replace(/cap_relax_rung/g, "the relax threshold") }),
  },
  {
    id: "runbook-step-5-reads-the-caps",
    detail:
      `${RUNBOOK_REL} step 5 (pick) reads the ticket's class caps -- naming class_autonomy and both ` +
      "extras. The caps are read AT PICK, once, and written into the cycle's notes; a cycle that " +
      "never reads them is back to the bare 3/4 whatever the registry says",
    test: b => {
      const s = stepBlock(b.runbook, "**5. Pick ONE item.**", "**6. Full ceremony");
      return s.includes("class_autonomy") && s.includes("extra_files") && s.includes("extra_tasks");
    },
    breaks: b => ({ ...b, runbook: b.runbook.replace(/extra_tasks/g, "the task extra") }),
  },
  {
    id: "runbook-step-7-cites-the-class-caps",
    detail:
      `${RUNBOOK_REL} step 7's QA bar checks the ship against the cycle's OWN cap numbers, citing ` +
      "CAP-SCOPE-FILES / CAP-SCOPE-TASKS -- a reviewer grading against a remembered 3/4 would " +
      "block a ship the ladder had already widened",
    test: b => {
      const s = stepBlock(b.runbook, "**7. QA bar, then ship at ONE ship point.**", "**7a.");
      return s.includes("CAP-SCOPE-FILES") && s.includes("CAP-SCOPE-TASKS");
    },
    breaks: b => ({ ...b, runbook: b.runbook.replace(/CAP-SCOPE-TASKS/g, "the task cap") }),
  },
  {
    id: "ledger-records-the-three-amendments",
    detail:
      `${LEDGER_REL} carries one entry per amended row -- each naming its rule id, the word ` +
      "\"amended\", and SES-122. The rows stay `live`, so the ledger is the only place the wording " +
      "that LEFT is findable with a reason (its contract: removals and rewrites are findable, not lost)",
    test: b => {
      const entries = ledgerEntries(b.ledger);
      return AMENDED_IDS.every(id =>
        entries.some(e => e.includes(id) && /amended/i.test(e) && e.includes("SES-122")));
    },
    breaks: b => ({ ...b, ledger: b.ledger.replace(/HR-SCOPE/g, "the hard-rule row") }),
  },
  {
    id: "feature-cap-untouched",
    detail:
      `${FEATURE_CAP_ID} still reads "${FEATURE_CAP_STATEMENT}" and is still \`live\`. A rung buys ` +
      "breadth of edit, never a second feature -- charter decision 5 put the file and task caps on " +
      "the ladder and left this one alone",
    test: b => {
      const r = ruleById(b.rules, FEATURE_CAP_ID);
      return !!r && r.statement === FEATURE_CAP_STATEMENT && r.status === "live";
    },
    breaks: b => ({
      ...b,
      rules: b.rules.map(r =>
        r.id === FEATURE_CAP_ID
          ? { ...r, statement: `${FEATURE_CAP_STATEMENT.slice(0, -1)}, plus what the rung earned.` }
          : r),
    }),
  },
];

function grade(bundle) {
  for (const c of CLAUSES) {
    assert.ok(c.test(bundle), `SES-122c clause "${c.id}" failed: ${c.detail}`);
  }
}

function everyClauseHasTeeth(bundle) {
  for (const c of CLAUSES) {
    const mutated = c.breaks(bundle);
    assert.notStrictEqual(
      JSON.stringify(mutated),
      JSON.stringify(bundle),
      `control for "${c.id}" changed NOTHING -- it cannot prove the clause has teeth (the SES-158 failure)`,
    );
    assert.ok(
      !c.test(mutated),
      `clause "${c.id}" still passes after its own control broke the thing it checks -- the check is vacuous`,
    );
  }
}

// META-ASSERTION: prove the control-checking above can itself fail, so a future no-op `breaks`
// cannot sail through everyClauseHasTeeth's first assert unexercised.
function aVacuousMutationFailsItsOwnControl(bundle) {
  assert.throws(
    () => {
      const mutated = bundle;
      assert.notStrictEqual(JSON.stringify(mutated), JSON.stringify(bundle), "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

// A missing/garbled input must be a loud finding, not a crash with an unhelpful message.
function readersReportRatherThanCrash() {
  assert.strictEqual(section("# a doc with no sections", "## Section 2: Session Scope Rules"), "",
    "an absent section must slice to the empty string so the caller can report it");
  assert.strictEqual(statementLines("").size, 0, "an empty section must yield zero statement lines");
  assert.deepStrictEqual(ledgerEntries("# a ledger with no entries"), [],
    "a ledger with no `### N.` headings must parse to zero entries");
  assert.strictEqual(stepBlock("nothing here", "**5. Pick ONE item.**", "**6."), "",
    "an absent step must slice to the empty string");
  // The format contract itself, both directions: a statement must be the WHOLE line.
  const lines = statementLines("2. Modify at most 3 files per session.\n> a quoted one\nprose 2. not a list item");
  assert.ok(lines.has("Modify at most 3 files per session.") && lines.has("a quoted one"),
    "both statement forms must be recognised");
  assert.ok(!lines.has("not a list item"), "prose containing a digit-dot must not read as a statement line");
}

// ---------------------------------------------------------------------------
// Arm 2 -- live Supabase, READ-ONLY (credential-gated, DECLARED when it cannot run)
// ---------------------------------------------------------------------------

async function rest(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}${pathAndQuery}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

// class_autonomy() is the ONE home for what a rung buys, so the arithmetic is asserted against its
// OWN inputs read in the same test -- never against a remembered 8. A hardcoded expectation here
// would go stale the first time a verdict moves the ladder, which is the mechanism working.
async function theRungActuallyBuysTheExtras() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live class_autonomy() arm (extra_files/extra_tasks equal greatest(0, rung - cap_relax_rung) " +
        "computed from runner_ladder and runner_settings read in the same test)",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. runner_ladder, runner_settings and " +
        "class_autonomy are service_role-only, so the publishable key cannot substitute. The offline " +
        "clauses above still graded the registry, both docs and the ledger. Canonical invocation: " +
        "STANDARDS.md Section 2 rule 5.",
    );
    return;
  }
  const settings = await rest(url, key, "/rest/v1/runner_settings?select=cap_relax_rung,auto_done_rung&id=eq.1");
  assert.strictEqual(settings.length, 1, "runner_settings must be a singleton row id=1");
  const capRelaxRung = settings[0].cap_relax_rung;
  assert.strictEqual(typeof capRelaxRung, "number",
    "runner_settings.cap_relax_rung must be a stored NUMBER -- a literal in the rule text is the thing this ticket removed");

  const ladder = await rest(url, key, "/rest/v1/runner_ladder?select=work_class,rung,streak&work_class=eq.tooling");
  assert.strictEqual(ladder.length, 1, "runner_ladder must carry exactly one `tooling` row");
  const rung = ladder[0].rung;

  const rows = await rest(url, key, "/rest/v1/rpc/class_autonomy", {
    method: "POST",
    body: JSON.stringify({ p_priority_class: "P10 - Tooling" }),
  });
  assert.ok(Array.isArray(rows) && rows.length === 1,
    "class_autonomy() must return EXACTLY ONE ROW always -- a caller cannot tell an empty result from a permissive one");
  const a = rows[0];
  assert.strictEqual(a.work_class, "tooling", "`P10 - Tooling` must map to the `tooling` work class");
  assert.strictEqual(a.rung, rung, "the function must report the rung stored on runner_ladder, not a derived one");

  const expected = Math.max(0, rung - capRelaxRung);
  assert.strictEqual(a.extra_files, expected,
    `extra_files must be greatest(0, rung - cap_relax_rung) = max(0, ${rung} - ${capRelaxRung}) = ${expected}, got ${a.extra_files}`);
  assert.strictEqual(a.extra_tasks, expected,
    `extra_tasks must be greatest(0, rung - cap_relax_rung) = ${expected}, got ${a.extra_tasks}`);

  // FAIL CLOSED, asserted rather than reasoned: a class the ladder does not track earns NOTHING.
  // This is the direction that matters -- a permissive default would widen every unclassed ticket.
  const unknown = await rest(url, key, "/rest/v1/rpc/class_autonomy", {
    method: "POST",
    body: JSON.stringify({ p_priority_class: "P42 - Not A Class" }),
  });
  assert.ok(Array.isArray(unknown) && unknown.length === 1,
    "an untracked class must still answer with one row rather than nothing");
  assert.strictEqual(unknown[0].extra_files, 0, "an untracked class must earn ZERO extra files");
  assert.strictEqual(unknown[0].extra_tasks, 0, "an untracked class must earn ZERO extra tasks");
  assert.strictEqual(unknown[0].rung, null,
    "an untracked class's rung must be NULL, not 0 -- rung 0 is a REAL rung (`invention` sits at it)");
}

async function run() {
  readersReportRatherThanCrash();

  const snapshot = read(SNAPSHOT_REL);
  const rules = parseSnapshot(snapshot);
  assert.ok(rules.length > 50,
    `${SNAPSHOT_REL} parsed to ${rules.length} rows -- the reader is broken or the snapshot is ` +
      "truncated; regenerate with node scripts/export-governance-snapshot.js");
  // Proves the RE-EXPORT ran: an editor who amends the rows and forgets the exporter fails here.
  for (const id of [...AMENDED_IDS, FEATURE_CAP_ID]) {
    assert.ok(rules.some(r => r.id === id),
      `${id} is missing from ${SNAPSHOT_REL} -- the row was amended but the snapshot was never ` +
        "re-exported (node scripts/export-governance-snapshot.js)");
  }

  const bundle = {
    rules,
    standards: read(STANDARDS_REL),
    ledger: read(LEDGER_REL),
    runbook: read(RUNBOOK_REL),
  };

  grade(bundle);
  everyClauseHasTeeth(bundle);
  aVacuousMutationFailsItsOwnControl(bundle);

  await theRungActuallyBuysTheExtras();
}

selfRun(import.meta.url, run);
export default run;
