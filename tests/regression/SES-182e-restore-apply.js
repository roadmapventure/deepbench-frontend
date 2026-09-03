// DeepBench v7.0.336 | tests/regression/SES-182e-restore-apply.js | SES-182 slice 5 -- the
// safe-row apply exists, and it is reachable ONLY from a reversed SHIP card.
//
// WHAT IS BEING PINNED, and why the obvious guard would be the wrong one. It is easy to write a
// test that asserts "apply_data_restore exists and applies restorable rows". That passes just as
// well against the build John's Accept forbids -- one where ANY reversed card, incident cards
// included, triggers the apply. So the clauses below are about the GATE, and the central one proves
// a DIFFERENCE from the retired form rather than a property both forms share (the SES-213 lesson).
//
// THE DIFFERENCE THAT MATTERS. A Reverse means two OPPOSITE things on the two card kinds:
//
//   ship               -> "I reject this delivery"          -> undo what THAT cycle wrote
//   gated_before_build -> "the rollback was wrong, put the code BACK" (slice 1's incident card)
//
// and the incident card's cycle_id is the OBSERVING cycle, not the pushing one. So the widened
// "any reversed card" form does not merely over-fire: it replays the WRONG RANGE'S ROWS into
// production, on the one card kind whose Reverse asks for the opposite operation. gateAdmits()
// below is a pure reimplementation of both forms over the same cards, asserted to DISAGREE.
//
// WHY THE GATE LIVES IN SQL AND NOT IN THE RUNBOOK, which is itself a pinned property: at rollback
// time no reversed ship card exists (the incident card is filed gated_before_build and undecided),
// so "apply it automatically during a rollback" is unreachable BY CONSTRUCTION rather than by a
// rule a cycle must remember -- the record_skip precedent this platform has paid for eight times.
// A runbook that grew a "should I apply it?" branch would be that rule coming back, so the source
// clauses assert the runbook POINTS AT THE CALL and states the ship-only boundary.
//
// THE DATABASE HALF IS DECLARED NOT-RUN RATHER THAN FAKED, the SES-134 shape: the function body
// ships as a migration and lives in the database, and this suite reaches Supabase only over
// PostgREST, which cannot read pg_get_functiondef. What the credentialed arm CAN do is invoke the
// real function on cards that must be REFUSED -- which writes nothing by definition, so the guard
// exercises the live gate without ever exercising the live apply. The behavioural evidence for the
// applying path is the six-arm rolled-back fixture on the ship card, whose negative control is the
// retired any-reversed-card form losing on the same fixture.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

// THE PRE-CHANGE TREE IS PINNED BY SHA, NEVER BY THE `origin/dev` BRANCH NAME. A file-level control
// that resolves "before" as a moving branch SELF-DESTRUCTS the moment the ship lands on that branch:
// origin/dev then CONTAINS the change, every clause passes on "both" trees, and the control reports
// the ship as un-pinning. That is the live SES-215 defect (v7.0.307) and SES-134 reproduced it. A
// SHA is immutable. If it is unreachable (a shallow clone), the control declares itself not-run
// rather than passing vacuously.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRE_CHANGE_SHA = "b625d84d83eb5b3cd5bece8b820741ee86c7d7de"; // origin/dev immediately before SES-182 slice 5 (v7.0.336)
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");

// ---- the pure half -----------------------------------------------------------------------------

// The SHIPPED gate, mirroring the function's own predicate. Exported so the divergence assertion
// below drives the real expression rather than a paraphrase of it.
export function gateAdmits(card) {
  return card.kind === "ship" && card.decision === "reverse";
}

// The RETIRED form this ship forbids. Kept here ONLY as the negative control -- never call it for
// anything else.
export function gateAdmitsRetiredAnyReversed(card) {
  return card.decision === "reverse";
}

// Only 'restorable' is ever written. 'unverifiable' (cannot check -- the table has no updated_at)
// and 'refused' (checked, and it moved) are counted and reported. summarizeRestorePlan()'s header
// already forbids merging those two, and this is the same boundary one step further on.
export const APPLIED_CLASSES = ["restorable"];
export const COUNTED_ONLY_CLASSES = ["unverifiable", "refused"];

// FEATURE: SES-315 (b) -- THE SHAPE OF THE UPSERT, as a pure pair, for the same reason gateAdmits()
// is one: the clause has to prove a DIFFERENCE from the form it replaced rather than a property
// both share. The retired form deleted the row and re-inserted it, which raised 23503 the first
// time a live backlog_items.blocked_by pointed at a restored ticket (ses-286a's fixture; fixed
// there at ses286a_restore_in_place while THIS restore engine kept the broken form until SES-315).
// An in-place UPDATE is also the smaller operation -- it is the one actually asked for, and it
// cannot cascade.
export function restoreShape(rowExistsNow) {
  return rowExistsNow ? "update-in-place" : "insert";
}

// The RETIRED form this ship forbids. Kept ONLY as the negative control.
export function restoreShapeRetiredDeleteReinsert() {
  return "delete-then-insert";
}

function anExistingRowIsRestoredInPlace() {
  assert.strictEqual(restoreShape(true), "update-in-place",
    "a row that is still there is UPDATEd in place -- delete-and-reinsert drops every FK referent " +
    "in the gap and raises 23503 on backlog_items_blocked_by_fkey, measured live at SES-315");
  assert.strictEqual(restoreShape(false), "insert",
    "a row that is genuinely GONE has no other shape than an INSERT -- and that branch must not be " +
    "'simplified' away with the delete, because it is the only way a deleted row comes back");
  assert.notStrictEqual(
    restoreShape(true), restoreShapeRetiredDeleteReinsert(),
    "shipped and retired restore shapes must diverge on an existing row, or the in-place clause is " +
    "decorative -- that row is precisely the one the retired form destroys referents for"
  );
}

function theGateNeedsBothHalves() {
  const shipReversed = { kind: "ship", decision: "reverse" };
  const incidentReversed = { kind: "gated_before_build", decision: "reverse" };
  const shipAccepted = { kind: "ship", decision: "accept" };
  const shipUndecided = { kind: "ship", decision: null };

  assert.strictEqual(gateAdmits(shipReversed), true, "a reversed ship card is the one admitted case");
  assert.strictEqual(gateAdmits(incidentReversed), false, "an incident card's Reverse must NEVER apply");
  assert.strictEqual(gateAdmits(shipAccepted), false, "the gate is Reverse, not merely 'decided'");
  assert.strictEqual(gateAdmits(shipUndecided), false, "an undecided card applies nothing");

  // The clause that proves a DIFFERENCE rather than a shared property: the two forms must disagree
  // on the incident card, which is precisely the row the widened form would ruin.
  assert.strictEqual(
    gateAdmitsRetiredAnyReversed(incidentReversed),
    true,
    "control is vacuous unless the retired form ADMITS the incident card"
  );
  assert.notStrictEqual(
    gateAdmits(incidentReversed),
    gateAdmitsRetiredAnyReversed(incidentReversed),
    "shipped and retired gates must diverge on the incident card, or the kind test is decorative"
  );
}

function doubtfulRowsAreNeverApplied() {
  assert.deepStrictEqual(APPLIED_CLASSES, ["restorable"], "only restorable rows are ever written");
  for (const c of COUNTED_ONLY_CLASSES) {
    assert.ok(!APPLIED_CLASSES.includes(c), `${c} must never reach the apply -- John's constraint 2`);
  }
  // The two skip reasons stay SEPARATE: 'refused' means CHECKED AND IT MOVED, 'unverifiable' means
  // CANNOT CHECK. Collapsing them throws away the distinction John decides on.
  assert.strictEqual(new Set(COUNTED_ONLY_CLASSES).size, 2, "the two refusal grounds are not merged");
}

// ---- the source half ---------------------------------------------------------------------------

// The runbook is hard-wrapped, so a load-bearing phrase can straddle a line break; a literal match
// that fails on a reflow fails for a reason that has nothing to do with the rule (SES-194).
export const norm = s => s.replace(/\s+/g, " ");

function clausesOver(text) {
  return {
    // The runbook POINTS AT the call -- one home for the rule.
    namesTheCall: /SELECT \* FROM public\.apply_data_restore\(/.test(text),
    // ...and states the ship-only boundary rather than leaving it to the reader.
    statesShipOnly: /only a `?SHIP`? card|A REVERSE ON A `ship` CARD/i.test(text),
    // ...and forbids the widened gate by name.
    forbidsWidening: /THE EDIT THIS FORBIDS: widening the gate to "any reversed card"/.test(text),
    // ...and keeps the two skip counts distinct on John's page.
    keepsSkipsSeparate: /skipped_unverifiable/.test(text) && /skipped_refused/.test(text),
    // ...and says the apply is unreachable from the rollback path by construction.
    saysUnreachableFromRollback: /step 8a \*\*cannot\*\* reach the apply/.test(text),

    // FEATURE: SES-315 (b) -- TWO CLAUSES THIS SHIP ADDS, each pinning a fact whose absence would
    // send a cycle to do the wrong thing rather than merely leave it under-informed.
    //
    // (1) THE TRIGGER MOVED AND THE PROCEDURE DID NOT. A ship reversal now arrives as a queued
    //     REVERT-FORWARD REQUESTED directive, because reverse_decision() restores the rows itself
    //     and cannot revert the push. Without this, a cycle holding that directive has no written
    //     procedure at all -- and the tempting guess is the wrong one: calling apply_data_restore()
    //     for it would replay rows reverse_decision() has already put back, which is the
    //     double-apply restore_applied_at exists to stop one level down. So the clause requires the
    //     refusal sentence as well as the trigger.
    statesTheDirectiveTrigger:
      /A SHIP REVERSAL NOW ARRIVES AS A QUEUED DIRECTIVE RATHER THAN AS A CARD TAP/.test(text) &&
      /REVERT-FORWARD REQUESTED: <TICKET>/.test(text) &&
      /Do NOT also call `apply_data_restore\(\)` for it/.test(text),

    // (2) THE UPSERT RESTORES IN PLACE. Stated at the apply's own site because that is where a
    //     later editor "simplifying" the two branches back into a delete-and-reinsert would be
    //     reading -- and the 23503 it reintroduces is invisible until a live blocked_by points at
    //     a restored ticket, which is how the hole survived from SES-182 slice 5 to SES-315.
    statesRestoreIsInPlace:
      /AN EXISTING ROW IS RESTORED IN PLACE, NEVER DELETE-AND-REINSERT/.test(text) &&
      /jsonb_populate_record/.test(text) &&
      /23503/.test(text),
  };
}

// SES-158's vacuity meta-check, added here at SES-315 (b) in the SES-134 shape: one mutation per
// clause, asserted to turn that clause false. The file-level pre-change control below is the other
// half and neither replaces the other -- the pre-change control proves the clauses did not hold
// BEFORE, these mutations prove each one is reading the phrase it claims to read.
const MUTATIONS = {
  namesTheCall: s => s.replace("SELECT * FROM public.apply_data_restore(",
                               "UPDATE public.backlog_items SET ("),
  statesShipOnly: s => s.split("A REVERSE ON A `ship` CARD").join("A REVERSE ON ANY CARD")
                        .split("only a `SHIP` card").join("any card"),
  forbidsWidening: s => s.replace('THE EDIT THIS FORBIDS: widening the gate to "any reversed card"',
                                  "A LATER TICKET MAY WIDEN THE GATE"),
  keepsSkipsSeparate: s => s.split("skipped_unverifiable").join("skipped_total"),
  saysUnreachableFromRollback: s => s.replace("step 8a **cannot** reach the apply",
                                              "step 8a may reach the apply"),
  statesTheDirectiveTrigger:
    s => s.replace("Do NOT also call `apply_data_restore()` for it",
                   "Then call `apply_data_restore()` for it"),
  statesRestoreIsInPlace:
    s => s.replace("AN EXISTING ROW IS RESTORED IN PLACE, NEVER DELETE-AND-REINSERT",
                   "THE ROW IS DELETED AND RE-INSERTED"),
};

function theRunbookHasOneHomeForTheRule() {
  const src = fs.readFileSync(RUNBOOK, "utf8");
  const c = clausesOver(src);
  for (const [name, ok] of Object.entries(c)) {
    assert.ok(ok, `runner-cycle.md clause failed: ${name}`);
  }

  const names = Object.keys(c);
  assert.deepStrictEqual(
    names.filter(n => !MUTATIONS[n]), [],
    "every runbook clause needs a mutation in MUTATIONS -- a clause with no control is a clause " +
    "that can rot into a phrase nobody reads"
  );
  for (const name of names) {
    const broken = MUTATIONS[name](src);
    assert.notStrictEqual(
      broken, src,
      `clause "${name}"'s mutation returned its input unchanged -- the check below would pass ` +
      "vacuously, which is a control that controls nothing"
    );
    assert.ok(
      !clausesOver(broken)[name],
      `${name} is VACUOUS -- it still passes after its own mutation`
    );
  }
}

// FILE-LEVEL NEGATIVE CONTROL: every clause above must FAIL on the pre-change runbook. A guard that
// passes on both trees pins nothing.
function theClausesFailOnThePreChangeTree() {
  let before;
  try {
    before = execFileSync("git", ["show", `${PRE_CHANGE_SHA}:docs/runbooks/runner-cycle.md`], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    notRun(
      "the file-level negative control",
      `commit ${PRE_CHANGE_SHA} is unreachable here (a shallow clone). The clauses above still ran ` +
        "against the shipped tree; what is unproven is that they FAIL on the pre-change one."
    );
    return;
  }
  const c = clausesOver(before);
  const passing = Object.entries(c).filter(([, ok]) => ok).map(([n]) => n);
  assert.deepStrictEqual(
    passing,
    [],
    `these clauses pass on the PRE-CHANGE tree and therefore pin nothing: ${passing.join(", ")}`
  );
}

// ---- the live half -----------------------------------------------------------------------------
//
// It invokes the REAL function, but only on cards the gate must REFUSE -- so it proves the live gate
// while writing nothing. The applying path is deliberately not exercised here: it would mutate
// production rows, and its evidence is the rolled-back fixture on the ship card.
async function theLiveGateRefuses() {
  const BASE = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!BASE || !KEY) {
    notRun(
      "the live gate arm",
      "need SUPABASE_URL / SUPABASE_SERVICE_KEY. The offline clauses cover the gate's logic and the " +
        "runbook's single home; what is unproven here is that the deployed function agrees with them."
    );
    return;
  }

  const call = async (actor, item) => {
    const r = await fetch(`${BASE}/rest/v1/rpc/apply_data_restore`, {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_actor_cycle: actor, p_item_id: item }),
    });
    assert.ok(r.ok, `apply_data_restore rpc failed: ${r.status}`);
    return await r.json();
  };

  const NIL = "00000000-0000-0000-0000-000000000000";

  // (1) an id that names no card at all.
  const missing = (await call(NIL, NIL))[0];
  assert.strictEqual(missing.outcome, "refused", "an unknown item id must be refused");
  assert.strictEqual(missing.applied_deletes, 0, "a refusal writes nothing");
  assert.strictEqual(missing.applied_upserts, 0, "a refusal writes nothing");

  // (2) a REAL undecided ship card -- the live gate's decision half, on production data, writing
  //     nothing because 'undecided' is not 'reverse'.
  const q = await fetch(
    `${BASE}/rest/v1/runner_items?select=id,restore_applied_at&kind=eq.ship&decision=is.null&limit=1`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  const rows = q.ok ? await q.json() : [];
  if (!rows.length) {
    notRun("the undecided-ship-card arm", "no undecided ship card exists to refuse right now.");
    return;
  }
  const res = (await call(NIL, rows[0].id))[0];
  assert.strictEqual(res.outcome, "refused", "an undecided ship card must be refused");
  assert.match(res.reason, /decision is undecided/, "the refusal names which half of the gate stopped it");

  // and it really did write nothing.
  const after = await fetch(
    `${BASE}/rest/v1/runner_items?select=restore_applied_at&id=eq.${encodeURIComponent(rows[0].id)}`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  const [row] = await after.json();
  assert.strictEqual(row.restore_applied_at, null, "a refused call must not stamp the card");
}

async function run() {
  theGateNeedsBothHalves();
  doubtfulRowsAreNeverApplied();
  anExistingRowIsRestoredInPlace();
  theRunbookHasOneHomeForTheRule();
  theClausesFailOnThePreChangeTree();
  await theLiveGateRefuses();
}

selfRun(import.meta.url, run);
export default run;
