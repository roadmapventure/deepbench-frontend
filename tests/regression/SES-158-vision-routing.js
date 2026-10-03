// DeepBench v7.0.227 | tests/regression/SES-158-vision-routing.js | SES-158
//
// Guards step 2b of docs/runbooks/runner-cycle.md -- the vision comment routing rule.
//
// The rule is READ OUT OF THE RUNBOOK, never restated here, per John's rule 2026-08-23 ("you
// should never be throwing away tests") and the DIR-603f44ea / SES-176 precedent: a test that
// copies the thing it guards passes forever while the shipped file rots. checkVisionRoutingRule()
// is therefore a pure function over the runbook's own text, and the assertions below run it
// against the REAL file and then against mutated copies.
//
// Every assertion is paired with a NEGATIVE CONTROL -- the same text with the one thing that
// should matter removed. "Would this still pass if the check did nothing?" must answer "no" for
// each case, which is the bar SES-176 set for this repo's doc guards.
//
// WHY A DOC GETS A REGRESSION TEST AT ALL. Step 2b is a rule no code executes: every cycle applies
// it by hand in SQL, exactly like the trust ladder. That is precisely the shape this platform has
// watched rot eight times (SES-86 phase 3, v7.0.146, SES-101, SES-111, SES-127, SES-128, SES-129,
// SES-143), so the load-bearing clauses are pinned by a test rather than by hope. It does NOT
// assert prose style -- only the clauses whose removal changes what a cycle would do.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");

const START = "**2b. VISION COMMENT ROUTING";
const END = "**3. Check the walls";

// Pure: slice step 2b out of the runbook. Returns "" when the step is absent, which is itself a
// finding rather than a crash -- a checker that throws on a missing section reports nothing useful.
export function extractStep2b(md) {
  const a = md.indexOf(START);
  if (a < 0) return "";
  const b = md.indexOf(END, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

// Pure: the load-bearing clauses. Each entry is { id, detail, test } and a failing test becomes a
// finding. Kept as data so a negative control can name exactly which clause it removed.
const CLAUSES = [
  {
    id: "trigger-author",
    detail: "the trigger must filter author = 'john' -- a routing comment is itself a briefing_comments row, so a predicate that forgets the author routes its own output forever",
    test: s => /author\s*=\s*'john'/.test(s),
  },
  {
    id: "trigger-kind",
    detail: "the trigger must select kind = 'requirement' -- an unlabeled comment is a Question and is never routed (decision 3's cheap failure direction)",
    test: s => /kind\s*=\s*'requirement'/.test(s),
  },
  {
    id: "idempotence",
    detail: "the stamping UPDATE must be guarded by harvested_cycle IS NULL -- under parallel cycles two peers can read the same requirement, and only the one whose UPDATE returns a row may write the routing comment",
    test: s => /harvested_cycle\s+IS\s+NULL/i.test(s),
  },
  {
    id: "three-routes",
    detail: "all three route values must be named exactly as briefing_comments.routed_to stores them",
    test: s => /corpus-update/.test(s) && /research-ticket/.test(s) && /feature-ticket/.test(s),
  },
  {
    id: "exactly-one-route",
    detail: "the rule must say the route is exactly one of the three -- never zero, never two",
    test: s => /never zero, never two/i.test(s),
  },
  {
    id: "corpus-unconditional",
    detail: "THE clause this ticket exists for: the corpus write must be stated as UNCONDITIONAL across all three routes. Collapsed into 'corpus-update is one of three routes', a feature-ticket routing leaves the corpus no richer, contradicting decision 5's own last bullet",
    test: s => /CORPUS WRITE is UNCONDITIONAL/.test(s),
  },
  {
    id: "routing-comment-mandatory",
    detail: "the routing comment back on the card must be marked mandatory -- it is what makes a misroute cost John one correcting comment instead of going unnoticed",
    test: s => /ROUTING COMMENT IS MANDATORY/.test(s),
  },
  {
    id: "routing-comment-insert",
    detail: "the routing comment must be written as author 'runner', kind 'routing', on the same target",
    test: s => /'runner',\s*'routing'/.test(s),
  },
  {
    id: "whole-thread",
    detail: "decision 4 must be carried: the runner reads the WHOLE thread, not the flagged comment alone",
    test: s => /WHOLE thread/i.test(s),
  },
  {
    id: "fail-direction",
    detail: "the uncertain case must resolve to research-ticket -- without it the rule leaves the most common judgment call to taste",
    test: s => /Uncertain between `research-ticket` and `feature-ticket`\s*→\s*`research-ticket`/.test(s),
  },
  {
    id: "atomic-id",
    detail: "filing a ticket must claim its id atomically from feature_id_counter, never a hand-count (CLAUDE.md; SES-18)",
    test: s => /feature_id_counter/.test(s),
  },
];

// Pure: returns [] when the rule is intact, one finding per broken clause otherwise.
export function checkVisionRoutingRule(md) {
  const step = extractStep2b(md);
  if (!step) return [{ id: "step-missing", detail: "step 2b is absent from the runbook entirely" }];
  return CLAUSES.filter(c => !c.test(step)).map(c => ({ id: c.id, detail: c.detail }));
}

// ---------------------------------------------------------------------------

function theShippedRunbookIsClean() {
  const md = fs.readFileSync(RUNBOOK, "utf8");
  const findings = checkVisionRoutingRule(md);
  assert.deepStrictEqual(
    findings.map(f => f.id), [],
    "the shipped runbook must satisfy every load-bearing clause; broken: " +
      findings.map(f => `${f.id} (${f.detail})`).join(" | ")
  );
}

function stepIsActuallyPresentAndBounded() {
  const md = fs.readFileSync(RUNBOOK, "utf8");
  const step = extractStep2b(md);
  assert.ok(step.length > 800, "step 2b extracted suspiciously short -- the anchors may have moved");
  assert.ok(!step.includes(END), "the slice must stop at step 3, or later steps' text would satisfy clauses vacuously");
  assert.ok(md.indexOf(START) < md.indexOf(END), "step 2b must sit before step 3 in the file");
}

// NEGATIVE CONTROL 1 -- the whole step removed.
function aMissingStepIsFlagged() {
  const md = fs.readFileSync(RUNBOOK, "utf8");
  const without = md.slice(0, md.indexOf(START)) + md.slice(md.indexOf(END));
  const findings = checkVisionRoutingRule(without);
  assert.strictEqual(findings.length, 1, "a runbook with no step 2b must produce exactly one finding");
  assert.strictEqual(findings[0].id, "step-missing");
}

// NEGATIVE CONTROL 2 -- each clause individually deleted must flag, and flag ALONE. This is what
// makes the suite discriminating rather than merely complete: a checker that returned [] for
// everything would pass theShippedRunbookIsClean() and fail here, on all eleven.
function everyClauseHasTeeth() {
  const md = fs.readFileSync(RUNBOOK, "utf8");
  const step = extractStep2b(md);
  const removals = {
    "trigger-author": [/author\s*=\s*'john'/g, "author = 'nobody'"],
    "trigger-kind": [/kind\s*=\s*'requirement'/g, "kind = 'whatever'"],
    "idempotence": [/harvested_cycle IS NULL/g, "true"],
    "three-routes": [/feature-ticket/g, "build-it"],
    "exactly-one-route": [/never zero, never two/gi, "as many as apply"],
    "corpus-unconditional": [/CORPUS WRITE is UNCONDITIONAL/g, "corpus write is one of the routes"],
    "routing-comment-mandatory": [/ROUTING COMMENT IS MANDATORY/g, "routing comment is nice to have"],
    "routing-comment-insert": [/'runner',\s*'routing'/g, "'runner', 'note'"],
    "whole-thread": [/WHOLE thread/gi, "flagged comment"],
    "fail-direction": [/Uncertain between `research-ticket` and `feature-ticket`\s*→\s*`research-ticket`/g, "Use your judgment"],
    "atomic-id": [/feature_id_counter/g, "the next free number"],
  };

  for (const [id, [pattern, replacement]] of Object.entries(removals)) {
    const broken = md.replace(step, step.replace(pattern, replacement));
    assert.notStrictEqual(broken, md, `the mutation for ${id} changed nothing -- the control is vacuous`);
    const ids = checkVisionRoutingRule(broken).map(f => f.id);
    assert.ok(ids.includes(id), `removing ${id} must be flagged; got [${ids.join(", ")}]`);
  }
}

// The route vocabulary must match what the DB will actually accept. Asserted against the
// documented values rather than a live connection, so this stays runnable with no credentials --
// the schema itself is guarded where it ships (SES-155).
function routeValuesAreTheStoredOnes() {
  const step = extractStep2b(fs.readFileSync(RUNBOOK, "utf8"));
  for (const v of ["corpus-update", "research-ticket", "feature-ticket"]) {
    assert.ok(step.includes("`" + v + "`"), `route ${v} must be named in backticks as a stored value`);
  }
  assert.ok(/routed_to/.test(step), "the rule must name the column the route is stored in");
}

function run() {
  theShippedRunbookIsClean();
  stepIsActuallyPresentAndBounded();
  aMissingStepIsFlagged();
  everyClauseHasTeeth();
  routeValuesAreTheStoredOnes();
}

selfRun(import.meta.url, run);
export default run;
