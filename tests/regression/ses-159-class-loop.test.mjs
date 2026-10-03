// DeepBench v7.0.413 | tests/regression/ses-159-class-loop.test.mjs | SES-159 — the class
// understanding loop files proposed learning claims and re-issues one synthesis claim per
// judgment class, without a drip and without ever writing `ratified`/`rejected` itself.
//
// THE M7 GATE RE-SCOPED THIS TICKET AWAY FROM STANDING QUESTIONS PUT TO JOHN (ruling ii, decision
// 05cc2722) and John's own words rule out a finish line entirely -- "I don't think you can ever be
// done learning about them" (2026-08-23). What this ship builds instead: `class_understanding_due()`
// names the thinnest P1-P4 class once a day; `issue_class_synthesis()` supersedes the class's one
// live root synthesis claim; `file_learning_claims()` files non-root proposed claims a later
// classing decision can read. None of the three ever writes `ratified`/`rejected` or touches
// `VC-ROOT-*` -- that stays John's, exactly as SES-84's corpus classing already is.
//
// TWO ARMS, same split as every prior migration-plus-runbook ticket in this file (SES-320,
// SES-84): DOC (always runs) pins the runbook tail's `(7c)` step, its two function calls and its
// never-does list; LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else declared NOT RUN) calls the
// one READ-ONLY function over PostgREST and declares the three WRITERS not-run, because a
// permanent regression test must never write vision_claims / runner_decisions on the live board
// (the SES-196 / SES-218 / SES-275 refusal, restated for this table by SES-84's own header). The
// writers' evidence is the rolled-back `DO` block run at this ship, recorded in run() below.
//
// Invocation: node tests/regression/ses-159-class-loop.test.mjs
// (Section 2 rule 5 for the credentialed form.)

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// origin/dev immediately before this coding session -- the SES-159 kickoff commit, doc-only.
const PRE_CHANGE_SHA = "c02c36a9e8a5ccbd1df075c3188d8ba494f945f5";

const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";

// The runbook is hard-wrapped, so a load-bearing phrase can straddle a line break (SES-194).
export const norm = s => s.replace(/\s+/g, " ");

function readRel(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// ---------------------------------------------------------------------------------------------
// THE DOC HALF. A clause earns its place only if REMOVING it would change what a later editor does.
// ---------------------------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "7c-exists-between-7b-and-8",
    file: RUNBOOK_REL,
    detail:
      "the tail's own numbered list at step 9 is what a cycle skims to know what runs and in what " +
      "order. Without a `(7c)` entry there, a cycle following the list literally never reaches the " +
      "class-loop paragraph below it -- the same class of gap `(7b)`'s own list entry exists to " +
      "close",
    test: s => /\*\*\(7c\)\*\* the class-understanding loop/.test(norm(s)),
    breaks: s => s.replace("**(7c)** the class-understanding loop", "the class-understanding loop"),
  },
  {
    id: "7c-calls-due-then-gates-on-it",
    file: RUNBOOK_REL,
    detail:
      "the step's whole safety is that it is a no-op on every cycle but the first one that finds " +
      "`due = true` each day. A reader who cannot see the actual call has to take the gating on " +
      "faith instead of reading it off the one function that decides it",
    test: s => /SELECT \* FROM public\.class_understanding_due\(\);/.test(s) &&
               /If `due` is false, write nothing and move on/.test(norm(s)),
    breaks: s => s.replace("SELECT * FROM public.class_understanding_due();",
                            "SELECT * FROM public.class_understanding_due(true);"),
  },
  {
    id: "7c-names-both-writer-functions-and-their-gate",
    file: RUNBOOK_REL,
    detail:
      "the synthesis call is the one a cycle must NOT make on every due day -- only when there is " +
      "new ratified material or no synthesis yet exists. Naming the call without its gate would " +
      "read as 'always issue a synthesis', which re-opens exactly the churn `SES-159`'s design " +
      "rule ('one synthesis per class, ever visible -- supersede, never accumulate') forbids",
    test: s => /public\.file_learning_claims\(cycle_id, session_name,\s*class, claims\)/.test(norm(s)) &&
               /only if `new_ratified_since > 0` OR `last_synthesis_at IS NULL`/.test(norm(s)) &&
               /public\.issue_class_synthesis\(cycle_id, session_name, class, text, provenance\)/.test(norm(s)),
    breaks: s => s.replace(
      "only if `new_ratified_since > 0` OR `last_synthesis_at IS NULL`",
      "if new_ratified_since > 0",
    ),
  },
  {
    id: "7c-never-does-list-is-complete",
    file: RUNBOOK_REL,
    detail:
      "this is the sentence that stops a later editor reading the class loop as a second " +
      "escalation surface next to `(7b)`'s decisions or the retired card path. Each of the four " +
      "clauses closes a specific door: no card to John (the M7 gate's whole ruling), no " +
      "`ratified`/`rejected` (that stays John's word, SES-84's boundary), no `VC-ROOT-*` writes " +
      "(his seeds), and at most once a day (the `due` flag's only reason to exist)",
    test: s => {
      const n = norm(s);
      return /WHAT THIS STEP NEVER DOES:\*\* ask John anything, write `ratified` or `rejected`, touch/.test(n) &&
             /`VC-ROOT-\*`, or run more than once a day/.test(n);
    },
    // A REGEX, never a literal carrying a `\n`: this worktree's line endings are not guaranteed
    // (CRLF after a checkout, LF after a raw edit), and the sentence this clause pins wraps across
    // a line break -- a literal `\n` is a no-op on whichever ending is not currently on disk, and
    // the teeth check below would then pass vacuously on that tree (the SES-315 lesson).
    breaks: s => s.replace(
      /\*\*WHAT THIS STEP NEVER DOES:\*\* ask John anything, write `ratified` or `rejected`, touch\r?\n`VC-ROOT-\*`, or run more than once a day\./,
      "**WHAT THIS STEP NEVER DOES:** touch `VC-ROOT-*`.",
    ),
  },
  {
    id: "7c-writes-notes-appending-not-replacing",
    file: RUNBOOK_REL,
    detail:
      "`(7b)`'s own paragraph already establishes that appending to the cycle row closed at (6) is " +
      "an ordinary UPDATE, not a frozen one -- the class loop's own notes line has to say the same " +
      "thing or a reader assumes the two steps fight over one field",
    test: s => /write `CLASS LOOP: <class>, <k> learning claims, synthesis <ref\|kept>` into the cycle/.test(norm(s)) &&
               /appending, the same statement as `\(7b\)`'s numbers/.test(norm(s)),
    breaks: s => s.replace("appending, the same statement as `(7b)`'s numbers", "replacing the row's notes"),
  },
];

function theDocsCarryTheRuling() {
  for (const c of CLAUSES) {
    assert.ok(c.test(readRel(c.file)), `${c.id} (${c.file}) -- ${c.detail}`);
  }
}

function everyClauseHasTeeth() {
  for (const c of CLAUSES) {
    const src = readRel(c.file);
    const broken = c.breaks(src);
    assert.notStrictEqual(
      broken, src,
      `clause "${c.id}"'s breaks() returned its input unchanged -- the teeth check below would ` +
        "pass vacuously, which is a control that controls nothing",
    );
    assert.ok(!c.test(broken), `${c.id} is VACUOUS -- it still passes after its own breaks() mutation`);
  }
}

// FILE-LEVEL NEGATIVE CONTROL against the commit this ship was written on (the SES-159 kickoff,
// doc-only). Every clause must FAIL there -- that tree is the one where step (7c) did not exist.
function theClausesFailOnThePreChangeTree() {
  let before;
  try {
    before = execFileSync("git", ["show", `${PRE_CHANGE_SHA}:${RUNBOOK_REL}`], {
      cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    notRun(
      "the file-level negative control",
      `commit ${PRE_CHANGE_SHA} is unreachable in this checkout (a shallow clone), so the ` +
        "pre-change runbook could not be read. The clauses above still ran against the shipped " +
        "tree; what is unproven is that they FAIL on the tree where step (7c) did not exist.",
    );
    return;
  }
  const passing = CLAUSES.filter(c => c.test(before)).map(c => c.id);
  assert.deepStrictEqual(
    passing, [],
    `these clauses pass on the PRE-CHANGE tree and therefore pin nothing: ${passing.join(", ")}`,
  );
}

// ---------------------------------------------------------------------------------------------
// THE LIVE HALF -- Supabase over PostgREST. class_understanding_due() is read-only by
// construction (it only SELECTs), so it is the one function this permanent suite may call live.
// ---------------------------------------------------------------------------------------------

const base = url => url.replace(/\/+$/, "");

async function post(url, key, name, body) {
  return fetch(`${base(url)}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const P1_TO_P4 = [
  "P1 - Improves John's Skills", "P2 - Inventive", "P3 - Investor Value", "P4 - New Customers",
];

async function theDueCheckIsReadOnlyAndNamesAP1ToP4Class(url, key) {
  const res = await post(url, key, "class_understanding_due", {});
  const body = await res.text();
  assert.ok(
    !/PGRST202|Could not find the function/i.test(body),
    `public.class_understanding_due() is not resolvable: ${body.slice(0, 300)}. This is the arm ` +
      "that fails against a database still missing migration ses159_class_understanding, or one " +
      "where service_role lost EXECUTE",
  );
  assert.strictEqual(res.status, 200, `rpc/class_understanding_due returned HTTP ${res.status}: ${body.slice(0, 300)}`);
  const rows = JSON.parse(body);
  assert.ok(Array.isArray(rows) && rows.length === 1, `expected exactly one row, got ${body.slice(0, 200)}`);
  const row = rows[0];
  assert.ok(typeof row.due === "boolean", `due must be a boolean: ${JSON.stringify(row)}`);
  assert.ok(P1_TO_P4.includes(row.class), `class must be one of P1..P4, got ${row.class}`);
  assert.ok(Number.isInteger(row.ratified) && Number.isInteger(row.proposed),
    `ratified/proposed must be integers off judgment_class_census: ${JSON.stringify(row)}`);
  assert.ok(typeof row.reason === "string" && row.reason.length > 0, "reason must be a non-empty sentence");
  // Read-only by construction: calling it twice in a row must return the identical class and
  // counts (nothing it read moved between the two calls it made itself).
  const res2 = await post(url, key, "class_understanding_due", {});
  const row2 = (JSON.parse(await res2.text()))[0];
  assert.deepStrictEqual(row2, row, "class_understanding_due() must be idempotent across two immediate calls -- it only SELECTs");
}

async function run() {
  theDocsCarryTheRuling();
  everyClauseHasTeeth();
  theClausesFailOnThePreChangeTree();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live read-only arm (class_understanding_due() resolvable and returning a sane P1-P4 " +
        "row) and the three writer arms below",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The doc arm above still graded all " +
        "five clauses against the committed tree and its pre-change control. Canonical " +
        "invocation: STANDARDS.md Section 2 rule 5.",
    );
  } else {
    await theDueCheckIsReadOnlyAndNamesAP1ToP4Class(url, key);
  }

  notRun(
    "the three WRITER paths -- issue_class_synthesis()'s supersede chain and its " +
      "provenance-must-name-a-ratified-ref raise, and file_learning_claims()'s missing-source " +
      "raise and its multi-claim file -- and every pg_proc fact (overload counts, EXECUTE grants)",
    "all three write vision_claims and/or runner_decisions/runner_before_images. A permanent " +
      "regression test must never do that on the live board (the SES-196 / SES-218 / SES-275 " +
      "refusal, and SES-84's own header names the same boundary for this table). MEASURED AT " +
      "THIS SHIP INSTEAD, live over the MCP, inside one deliberately failing DO block with the " +
      "whole fixture rolled back, asserted on the OUTCOME AND THE MESSAGE rather than on 'it " +
      "returned': a fixture P2 - Inventive claim inserted status='ratified' (P2 carried 0 live " +
      "ratified claims at this ship, so this is the only way to make the provenance rule engage " +
      "deterministically) -- issue_class_synthesis(null, session, 'P2 - Inventive', text, " +
      "'provenance names nothing relevant') RAISED 'P2 - Inventive has ratified claim(s) and " +
      "p_provenance names none of them'; the same call with the fixture's own ref named in the " +
      "provenance returned VC-SYN-NNN; calling it again for the same class returned a SECOND " +
      "VC-SYN-NNN and left the FIRST row status='rewritten' with superseded_by pointing at the " +
      "second, with exactly ONE non-superseded root synthesis for P2 afterward; " +
      "file_learning_claims(null, session, 'P3 - Investor Value', [{text, confidence, " +
      "provenance} with no source]) RAISED 'a learning claim requires source -- a docs/research/ " +
      "path or the vision essay it derives from'; the same call with two valid elements (sources " +
      "docs/vision/exit-thesis.md and docs/research/SES-131-market-faang-research.md) returned " +
      "exactly two VC-LRN-NNN refs. TWO BUGS THE FIXTURE CAUGHT BEFORE SHIP, both proven by the " +
      "same run rather than inspected out of the source: FOUND was being clobbered by the " +
      "VC-SYN-NNN numbering SELECT (an aggregate, which always returns a row) running between " +
      "the prior-synthesis lookup and its `if found` check, fixed by capturing v_prior_found " +
      "immediately after the lookup (migration ses159_class_understanding_fix_found_clobber); " +
      "and vision_claims_superseded_by_fkey rejected superseding the prior row before the new " +
      "row existed, fixed by inserting the new row first and superseding the prior row second " +
      "(migration ses159_class_understanding_fix_fk_order). ZERO RESIDUE on re-read after " +
      "rollback: 0 VC-ZZZFIX-* / VC-SYN-* / VC-LRN-* rows, 0 fixture runner_decisions rows, 0 " +
      "fixture runner_before_images rows, P2 - Inventive's live ratified count back at 0. Grants " +
      "asserted by the migration's own trailing DO block rather than its success flag: exactly " +
      "one overload each of class_understanding_due/issue_class_synthesis/file_learning_claims, " +
      "EXECUTE false for anon and authenticated and true for service_role on all three " +
      "(has_function_privilege, both directions -- functions default OPEN in this project, " +
      ".claude/rules/supabase-column-grants.md SES-315 addendum).",
  );
}

selfRun(import.meta.url, run);
export default run;
