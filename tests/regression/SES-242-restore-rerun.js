// DeepBench v7.0.323 | tests/regression/SES-242-restore-rerun.js | SES-242 (Selfbuild M3 -
// Independent Verification)
//
// Guards §5b's re-run rule in docs/runbooks/restore-from-backup.md. This is the document somebody
// reads WHILE THE PLATFORM IS DOWN, so the failure mode being guarded is not "the text drifted" —
// it is an operator concluding that five named rows are lost when a second invocation would load
// them.
//
// THE CLAUSE THAT CARRIES THIS TICKET, and the one a later editor will "simplify": the termination
// test is THE NAMED-MISS LIST STOPPING SHRINKING, never a pass count. A literal "run it twice"
// teaches the operator to expect movement that a TABLE-WIDE failure can never produce (the jsonb
// scalar null, SES-230; the generated-column 428C9, SES-220), and it also stops early on a chain
// three deep. `terminationIsTheShrinkTest()` pins both directions.
//
// FILE-LEVEL NEGATIVE CONTROL, the SES-208/SES-213 convention: every clause is asserted to FAIL
// against origin/dev's own pre-change copy of the runbook, so this file cannot pass vacuously on a
// document that never gained the rule. Run with no network and no credentials.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNBOOK = path.join(REPO, "docs", "runbooks", "restore-from-backup.md");

// The clauses, each a named predicate over the runbook text. Kept as a table rather than inline
// asserts so the SAME set can be replayed against origin/dev's copy for the file-level control --
// a control that re-implements the checks would be SES-45's "a second implementation agreeing with
// itself".
const CLAUSES = Object.freeze([
  {
    name: "tellsTheOperatorToRunItAgain",
    test: t => /run the identical command again/i.test(t),
    why: "§5b must actually instruct the second invocation; describing the defect without the " +
         "instruction leaves the operator exactly where they were",
  },
  {
    name: "terminationIsTheShrinkTest",
    test: t => /stop when the named-miss list stops shrinking/i.test(t) &&
               /not after a fixed number of runs/i.test(t),
    why: "the termination test is the shrink, NOT a pass count -- and the text must say so " +
         "explicitly, because 'run it twice' is the natural paraphrase and it is wrong",
  },
  {
    name: "namesTheMechanism",
    test: t => /retries whole \*\*tables\*\*, never row \*\*order\*\*/i.test(t) &&
               /same file order/i.test(t),
    why: "an operator who does not know WHY needs to re-run cannot tell this apart from flakiness; " +
         "the mechanism is table-level retry plus a fallback that preserves file order",
  },
  {
    name: "carriesTheMeasuredNumbers",
    test: t => /714 of 719/.test(t) && /103 of 104/.test(t) && /99\.985% . 99\.996%/.test(t),
    why: "the recovered-row counts are what make this a measurement rather than advice; " +
         "SES-191's re-drill is the evidence and the runbook must carry it",
  },
  {
    name: "warnsThatTableWideNeverShrinks",
    test: t => /`TABLE-WIDE` report never shrinks by re-running/i.test(t),
    why: "without this, step 3 sends an operator into an unbounded loop on ai_activity_log's " +
         "generated-column failure, which no number of passes can move",
  },
  {
    name: "namesTheDurableFixAsRemainder",
    test: t => /deepbench-backups-offsite/i.test(t) &&
               /declared remainder/i.test(t),
    why: "the loader-side fix is the real one and is deliberately NOT taken here (the offsite repo " +
         "needs John's word per c98048a5/1c9609de). Naming it stops the next cycle re-deriving " +
         "that this doc rule was the whole of the answer",
  },
]);

function readRunbook() {
  return fs.readFileSync(RUNBOOK, "utf8");
}

// ---------------------------------------------------------------------------
// The shipped runbook satisfies every clause
// ---------------------------------------------------------------------------
function theShippedRunbookCarriesTheRule() {
  const text = readRunbook();
  for (const c of CLAUSES) {
    assert.ok(c.test(text), `${c.name}: ${c.why}`);
  }
}

// ---------------------------------------------------------------------------
// FILE-LEVEL NEGATIVE CONTROL -- origin/dev's own copy must FAIL every clause
// ---------------------------------------------------------------------------
function everyClauseFailsOnThePreChangeRunbook() {
  const r = spawnSync("git", ["show", "origin/dev:docs/runbooks/restore-from-backup.md"],
    { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

  // A control that cannot run is NOT a pass -- say so and stop, rather than letting the suite
  // report green on a guard that proved nothing. (origin/dev is absent in a shallow CI clone.)
  if (r.error || r.status !== 0) {
    assert.fail(
      "could not read origin/dev's copy of the runbook, so the file-level negative control did " +
      "not run. That is an absent control, not a passing one -- fetch origin/dev and re-run."
    );
  }

  const before = r.stdout;
  const stillPassing = CLAUSES.filter(c => c.test(before)).map(c => c.name);
  assert.deepStrictEqual(stillPassing, [],
    `these clauses pass on origin/dev's PRE-CHANGE runbook, so they are not testing anything this ` +
    `ship added: ${stillPassing.join(", ")}`);

  // And the meta-check: the control is only meaningful if the clauses pass on the NEW file. Asserted
  // here as well as above so a reordering of the run() list cannot leave this vacuous.
  const after = readRunbook();
  assert.strictEqual(CLAUSES.filter(c => c.test(after)).length, CLAUSES.length,
    "every clause must pass on the shipped runbook -- otherwise the control proves nothing");
}

// ---------------------------------------------------------------------------
// The rule sits in §5b, next to the command it qualifies
// ---------------------------------------------------------------------------
function theRuleSitsWithTheCommandItQualifies() {
  const text = readRunbook();
  const cmd = text.indexOf("node restore-supabase.mjs <backup-set-dir> --all --confirm");
  const rule = text.search(/run the identical command again/i);
  const next = text.indexOf("### 5c.");

  assert.ok(cmd > 0, "§5b's command must still be present");
  assert.ok(rule > cmd,
    "the re-run rule must come AFTER the command it qualifies");
  assert.ok(next > rule,
    "the re-run rule must sit INSIDE §5b, before §5c -- a rule about this command that lives in a " +
    "later section is one an operator reads after they have already concluded rows were lost");
}

function run() {
  theShippedRunbookCarriesTheRule();
  everyClauseFailsOnThePreChangeRunbook();
  theRuleSitsWithTheCommandItQualifies();
}

selfRun(import.meta.url, run);
export default run;
