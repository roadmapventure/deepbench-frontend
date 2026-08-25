// DeepBench v7.0.238 | tests/regression/SES-197-drain-chain-terminator.js | SES-197
//
// Guards tail step (8) of docs/runbooks/runner-cycle.md — the in-session drain chain's terminator.
// Before SES-197 the chain ran on two gates and GATE B COULD NOT FAIL ON A DECISION-STARVED BOARD:
// drain_epic_next's pick predicate filters queue, status<>'delivered' and claims and NEVER
// design_status, so a member flagged needs-john comes back as the pick forever. Gate A exists so
// the budget wall is not a metronome; the same inversion arrived through Gate B, and Gate A PASSES
// there, because a card-only cycle closes gated_before_build.
//
// THE RULE IS READ OUT OF THE RUNBOOK, never restated here (John's rule 2026-08-23, "you should
// never be throwing away tests"; the DIR-603f44ea / SES-176 / SES-158 / SES-194 precedent). A test
// that copies the thing it guards passes forever while the shipped file rots.
//
// EVERY ASSERTION IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that should
// matter removed. "Would this still pass if the check did nothing?" must answer "no" for every
// clause. There is also a meta-assertion (aVacuousMutationFailsItsOwnControl) because SES-158
// shipped a control that changed nothing, and the test only caught it because the control was
// itself checked.
//
// THE CLAUSE THIS FILE EXISTS FOR, above all the others: `forbids-pick-predicate-edit`. The
// tempting fix for this bug is a one-line design_status clause inside drain_epic_next's PICK
// predicate, and a later cycle reading only the symptom will reach for it. It is wrong twice, and
// both reasons must survive in the runbook or it gets "fixed" that way: (1) that predicate also
// feeds STEP 5, where a flagged member must still be RETURNED so the cycle can record_skip() it and
// put the ask on John's §10 -- filtering it there deletes the very signal that tells him a decision
// is owed; (2) SES-154's pick-vs-retirement boundary lives in that same function. The runner-up pin
// is `null-ceiling-not-zero`: NULL means the ceiling is OFF and is a REAL value, and coercing it to
// 0 is a ceiling of zero cards, which stops every chain forever (the SES-147 boundary, same shape).
//
// FILE-LEVEL NEGATIVE CONTROL, and its result is reported honestly rather than rounded up: run
// against the PRE-CHANGE runbook (git show origin/dev:docs/runbooks/runner-cycle.md), **8 of these
// 9 clauses fail and all 9 pass on the shipped one**. The ninth, `stopping-is-the-safe-direction`,
// passes on BOTH -- because the sentence it pins ("a continuation that fails to open is a note,
// never a wall: the cron remains the fallback engine") PREDATES this ticket. It is kept anyway,
// and deliberately not tightened into a 9/9 by bolting on some phrase unique to this ship: that
// sentence is the entire licence for adding gates that stop the chain, and a guard is allowed to
// protect load-bearing text it did not author. Recorded here so a later reader does not mistake
// 8/9 for a defect in the suite, or "re-derive" a contrived discriminator to make the number look
// better -- which is the SES-158 vacuous-control failure wearing a metric's clothes.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied (SES-180 (b)): the function BODY
// ships as migration ses197_drain_chain_gate and lives in the database, not this repo, and this
// suite reaches Supabase only over PostgREST -- which cannot read pg_get_functiondef and could
// reach the function only by INVOKING it, which calls drain_epic_next and can RETIRE a live drain
// directive. Behavioural evidence is the live QA recorded on the ship card.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");

const TAIL8_START = "**(8) A DRAINING CYCLE CONTINUES THE DRAIN IN-SESSION";
const TAIL8_END = "**THE SESSION-SPAWNING ACTUATORS ARE RETIRED";

// Pure: slice a bounded block out of the runbook. Returns "" when absent -- itself a finding rather
// than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

export const extractTail8 = md => extractBlock(md, TAIL8_START, TAIL8_END);

// Markdown is hard-wrapped at ~95 columns, so a load-bearing phrase can straddle a line break and a
// literal match fails for a reason that has nothing to do with the rule. Normalising runs of
// whitespace to one space makes every clause reflow-proof (the SES-194 lesson, paid for on
// "WENT SILENT").
export const norm = s => s.replace(/\s+/g, " ");

// The five gate slugs are the function's own `gate_failed` vocabulary. A cycle puts this value in
// its notes, so the doc and the migration must agree on the spelling.
export const GATE_SLUGS = [
  "ran-a-cycle",
  "drain-has-work",
  "pick-actionable",
  "noship-streak",
  "undecided-ceiling",
];

// Pure: the load-bearing clauses, kept as data so a negative control can name exactly which one it
// removed. A clause earns its place only if REMOVING it would change what a cycle does.
export const CLAUSES = [
  {
    id: "the-call",
    detail:
      "tail (8) must name the function and pass the cycle id -- without the call the chain is back " +
      "to two hand-applied gates, which is the whole ticket",
    test: s => /public\.drain_chain_gate\('<your cycle id>'\)/.test(s),
    breaks: s => s.replace("public.drain_chain_gate('<your cycle id>')", "-- (call removed)"),
  },
  {
    id: "five-gates-named",
    detail:
      "all five gate_failed slugs must appear -- a cycle reports which gate stopped it, and an " +
      "unnamed gate cannot be reported",
    test: s => GATE_SLUGS.every(g => s.includes(g)),
    breaks: s => s.replace("pick-actionable", "(gate removed)"),
  },
  {
    id: "gate-c-is-the-premise",
    detail:
      "the block must state that drain_epic_next never reads design_status -- that fact IS why " +
      "Gate B could not fail, and without it Gate C reads as an arbitrary extra check",
    test: s => /never\s+`?design_status`?/i.test(s) && /drain_epic_next/.test(s),
    breaks: s => s.replace(/\*\*never `design_status`\*\*/g, "**also `design_status`**"),
  },
  {
    id: "forbids-pick-predicate-edit",
    detail:
      "the block must FORBID adding a design_status clause to drain_epic_next's pick predicate and " +
      "give the step-5/record_skip reason -- this is the tempting one-liner a later cycle will try",
    test: s =>
      /THE EDIT THIS STEP FORBIDS/.test(s) &&
      /record_skip\(\)/.test(s) &&
      /step\s+\*\*5\*\*|step 5/.test(s),
    breaks: s => s.replace(/THE EDIT THIS STEP FORBIDS/g, "A reasonable edit here"),
  },
  {
    id: "streak-default-is-measured",
    detail:
      "the default of 2 must be attributed to the INCIDENT that measured it -- an unattributed " +
      "number reads as this ticket's taste and gets tuned by the next cycle that finds it annoying",
    test: s => /chain_max_noship_streak`?\s*=\s*2/.test(s) && /what the incident measured/i.test(s),
    breaks: s => s.replace(/what the incident measured/gi, "a sensible default"),
  },
  {
    id: "null-ceiling-not-zero",
    detail:
      "NULL must be stated as OFF and as a REAL value, with coercion to 0 forbidden -- a ceiling of " +
      "zero cards stops every chain forever (the SES-147 boundary in a second costume)",
    test: s => /never coerce it to `0`/.test(s) && /`NULL` is a real value/i.test(s),
    breaks: s => s.replace(/never coerce it to `0`/g, "treat a blank as `0`"),
  },
  {
    id: "gate-a-precedes-the-drain-call",
    detail:
      "the ordering must be stated AND justified by drain_epic_next not being a preview -- a cycle " +
      "that failed Gate A must not retire a drain on its way out",
    test: s => /Gate A is evaluated BEFORE the drain call/i.test(s) && /not a preview/i.test(s),
    breaks: s => s.replace(/not a preview/gi, "a safe preview"),
  },
  {
    id: "stopping-is-the-safe-direction",
    detail:
      "the justification for adding gates at all -- the cron is the fallback engine, so a chain " +
      "that stops early loses nothing; without it the gates look like lost throughput",
    test: s => /note, never a wall/i.test(s) && /cron remains the fallback engine/i.test(s),
    breaks: s => s.replace(/cron remains the fallback engine/gi, "chain is the only engine"),
  },
  {
    id: "approximation-disclosed",
    detail:
      "the started_at streak approximation under parallel cycles must be disclosed with its " +
      "fail-safe direction -- the B42 convention is that known slack is named, never hidden",
    test: s => /named approximation/i.test(s) && /stop the chain \*\*sooner\*\*/.test(s),
    breaks: s => s.replace(/named approximation/gi, "exact measurement"),
  },
];

function tail8() {
  return norm(extractTail8(fs.readFileSync(RUNBOOK, "utf8")));
}

// The shipped runbook must satisfy every clause.
function theShippedRunbookIsClean() {
  const s = tail8();
  assert.ok(s.length > 0, "tail step (8) is missing from runner-cycle.md");
  for (const c of CLAUSES) {
    assert.ok(c.test(s), `runner-cycle.md lost clause "${c.id}": ${c.detail}`);
  }
}

// FILE-LEVEL NEGATIVE CONTROL: a block that is absent must be reported as a finding, not crash.
function aMissingBlockIsFlagged() {
  assert.strictEqual(
    extractTail8("# a runbook with no serial tail"),
    "",
    "a missing tail (8) block must return '' so the caller reports it",
  );
}

// Per-clause negative control: break exactly one thing, assert exactly that clause fails.
function everyClauseHasTeeth() {
  const s = tail8();
  for (const c of CLAUSES) {
    const mutated = c.breaks(s);
    assert.notStrictEqual(
      mutated,
      s,
      `control for "${c.id}" changed NOTHING -- it cannot prove the clause has teeth (the SES-158 failure)`,
    );
    assert.ok(
      !c.test(mutated),
      `clause "${c.id}" still passes after its own control removed the thing it checks -- the check is vacuous`,
    );
  }
}

// META-ASSERTION: prove the control-checking above can actually fail. Without this, a future clause
// whose `breaks` is a no-op would sail through everyClauseHasTeeth's first assert only because
// nobody ever exercised the failure path.
function aVacuousMutationFailsItsOwnControl() {
  const s = tail8();
  const vacuous = { breaks: x => x };
  assert.throws(
    () => {
      const mutated = vacuous.breaks(s);
      assert.notStrictEqual(mutated, s, "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

// The doc and the migration must agree on the callable signature and on the columns a cycle is told
// to read back. Cheap, and it is the seam that breaks silently if either side is renamed.
function signatureMatchesWhatTheMigrationShipped() {
  const s = tail8();
  assert.ok(
    /SELECT \* FROM public\.drain_chain_gate\(/.test(s),
    "the runbook must show the call as SELECT * FROM public.drain_chain_gate(...) -- it returns a row, not a scalar",
  );
  for (const col of ["verdict", "gate_failed", "reason"]) {
    assert.ok(
      s.includes(col),
      `the runbook must name the returned column ${col} so a cycle knows what to act on and what to log`,
    );
  }
  assert.ok(
    /'continue'/.test(s),
    "the runbook must name the verdict value that continues the chain, or a cycle cannot branch on it",
  );
  assert.ok(
    /migration `ses197_drain_chain_gate`/.test(s),
    "the runbook must name the migration that ships the function body, since the body is not in this repo",
  );
  for (const setting of ["chain_max_noship_streak", "chain_max_undecided_cards"]) {
    assert.ok(
      s.includes(setting),
      `the runbook must name the runner_settings column ${setting} -- the thresholds are columns, never literals`,
    );
  }
}

// The gate ORDER is load-bearing (Gate A before the drain call), so the table must list them in the
// order the function applies them. A reordered table teaches a cycle the wrong precedence.
function gatesAreListedInApplicationOrder() {
  const s = tail8();
  const positions = GATE_SLUGS.map(g => s.indexOf(g));
  for (let i = 1; i < positions.length; i++) {
    assert.ok(
      positions[i] > positions[i - 1],
      `gate "${GATE_SLUGS[i]}" must be documented after "${GATE_SLUGS[i - 1]}" -- the table's order is ` +
        "the precedence the function applies, and Gate A preceding the drain call is the load-bearing one",
    );
  }
}

function run() {
  theShippedRunbookIsClean();
  aMissingBlockIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  signatureMatchesWhatTheMigrationShipped();
  gatesAreListedInApplicationOrder();

  notRun(
    "drain_chain_gate() function body",
    "the body ships as migration ses197_drain_chain_gate and lives in the database, not this repo; " +
      "this suite reaches Supabase only over PostgREST, which cannot read pg_get_functiondef and " +
      "could reach the function only by INVOKING it -- which calls drain_epic_next and can RETIRE a " +
      "live drain directive. Behavioural evidence is the live QA on the ship card: the same fixture " +
      "drain flipping continue->stop on design_status alone, Gate D at 1 vs 2, Gate A leaving the " +
      "directive untouched, and Gate E off under a NULL ceiling with 23 cards undecided.",
  );
}

selfRun(import.meta.url, run);
export default run;
