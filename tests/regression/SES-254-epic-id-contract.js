// DeepBench v7.0.338 | tests/regression/SES-254-epic-id-contract.js | SES-254
//
// Guards the contract that `runner_items.epic_id` is carried by MILESTONE GATE-REVIEW CARDS AND
// NOTHING ELSE -- now `ck_runner_items_epic_id_review_only`, and until v7.0.338 a sentence in a
// migration comment and in runbook prose with nothing enforcing it in either place.
//
// THE DEFECT, as the measurement rather than the story (live, 2026-08-31T02:4xZ): runner-cycle.md
// step 8d finds an owed milestone gate review with
//     NOT EXISTS (SELECT 1 FROM runner_items ri WHERE ri.epic_id = e.id)
// so ONE non-review card carrying epic_id makes that epic read as ALREADY REVIEWED, permanently,
// with no recovery path. Eight rows carried epic_id; FOUR violated the contract -- SES-45 and
// SES-210 (gated cards) and SES-211 and SES-182 (ship cards), all four on M3 -- which is what hid
// M3's own gate review until a human found it by hand.
//
// THE DISCRIMINATOR WAS TESTED AGAINST LIVE DATA, NOT CHOSEN: `kind = 'gated_before_build' AND
// backlog_id IS NULL` separated the 4 review cards from the 4 violators with zero exceptions.
//
// THE CLAUSE THAT DOES THE REAL WORK IS THE SECOND ONE, and it is the half a rebuild drops. A
// kind-only constraint (`kind = 'gated_before_build'`) looks like it says the same thing and
// ACCEPTS the SES-45 / SES-210 shape -- a gated card for an ordinary ticket -- which is half the
// live violator population. aKindOnlyConstraintWouldHaveMissedHalfTheViolators() runs that retired
// form on the SAME fixtures and asserts it LOSES, so this file proves a DIFFERENCE from what was
// rejected rather than a property both forms share.
//
// THE EDIT THIS FILE FORBIDS, and it is tempting because SES-254's own text offers it as the
// alternative: ALSO narrowing step 8d's sweep predicate to the same discriminator. With the CHECK
// in force `ri.epic_id = e.id` can only match a review card BY CONSTRUCTION, so a second copy of
// the discriminator in runbook prose is one fact with two homes that can drift -- the SES-116 /
// SES-113 / SES-86-phase-3 defect one level up, and the prose copy is the one no test can see.
// theSweepPredicateKeepsNoSecondCopy() pins that.
//
// THE INVERSE FAILURE IS DELIBERATELY NOT GUARDED HERE. gate-review.md's own prohibition -- a
// review card filed WITHOUT epic_id repeats that review forever -- is about a MISSING value, and
// the shipped CHECK admits `epic_id IS NULL` on every row precisely so that filing rule stays
// gate-review.md's to enforce. This constraint answers "who MAY carry one", never "who MUST".
//
// FILE-LEVEL NEGATIVE CONTROL: theRunbookCitesTheConstraint() cannot pass against origin/dev --
// the constraint it names does not exist there and the runbook does not mention it.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNBOOK = path.join(REPO, "docs", "runbooks", "runner-cycle.md");

export const CONSTRAINT_NAME = "ck_runner_items_epic_id_review_only";

// The shipped predicate, in JS, for the pure controls below. It is a RESTATEMENT for control
// purposes only -- the live half asserts the real constraint's behaviour against real Postgres,
// which is what makes a drift between this line and the database visible rather than agreed.
export function shippedAllows(row) {
  return row.epic_id == null || (row.kind === "gated_before_build" && row.backlog_id == null);
}

// The retired form, kept ONLY as the negative control it exists to be.
export function kindOnlyAllows(row) {
  return row.epic_id == null || row.kind === "gated_before_build";
}

// The four violators as they stood live at the ship, plus the four legitimate review cards.
const LIVE_VIOLATORS = [
  { id: "85aa462a", kind: "gated_before_build", backlog_id: "SES-45",  epic_id: "m3" },
  { id: "67edeab3", kind: "gated_before_build", backlog_id: "SES-210", epic_id: "m3" },
  { id: "0f506259", kind: "ship",               backlog_id: "SES-211", epic_id: "m3" },
  { id: "5e5c99b6", kind: "ship",               backlog_id: "SES-182", epic_id: "m3" },
];

const LIVE_REVIEW_CARDS = [
  { id: "a458c50a", kind: "gated_before_build", backlog_id: null, epic_id: "m0" },
  { id: "456676b3", kind: "gated_before_build", backlog_id: null, epic_id: "m1" },
  { id: "73f71531", kind: "gated_before_build", backlog_id: null, epic_id: "m2" },
  { id: "6c4d3453", kind: "gated_before_build", backlog_id: null, epic_id: "m3" },
];

// -- 1. The discriminator separates the two live populations, both directions ------------------

function theDiscriminatorSeparatesTheLivePopulations() {
  const refused = LIVE_VIOLATORS.filter(r => !shippedAllows(r));
  assert.strictEqual(refused.length, 4,
    "all four measured violators must be refused -- one surviving row blinds its epic's sweep forever");

  const accepted = LIVE_REVIEW_CARDS.filter(r => shippedAllows(r));
  assert.strictEqual(accepted.length, 4,
    "all four real gate-review cards must still be accepted -- a one-directional check passes on a " +
    "constraint that rejects everything (the SES-101 rule)");
}

// -- 2. THE NEGATIVE CONTROL: the retired kind-only form, same fixtures, asserted to LOSE -------

function aKindOnlyConstraintWouldHaveMissedHalfTheViolators() {
  const missed = LIVE_VIOLATORS.filter(r => kindOnlyAllows(r) && !shippedAllows(r));
  assert.deepStrictEqual(missed.map(r => r.backlog_id), ["SES-45", "SES-210"],
    "the control is vacuous unless the retired kind-only form genuinely ACCEPTS rows the shipped " +
    "one refuses -- these two are gated cards for ordinary tickets, which is why the backlog_id " +
    "clause is the half that does the work");

  // ...and it must agree with the shipped form on the review cards, or the control proves nothing
  // about the clause under test.
  for (const r of LIVE_REVIEW_CARDS) {
    assert.strictEqual(kindOnlyAllows(r), shippedAllows(r),
      "the two forms must differ ONLY on the violator shape -- otherwise the difference measured " +
      "above is not attributable to the backlog_id clause");
  }
}

// -- 3. A row with no epic_id is untouched in either kind (the inverse failure stays free) ------

function aCardWithoutAnEpicIdIsUnaffected() {
  for (const kind of ["ship", "gated_before_build"]) {
    assert.ok(shippedAllows({ kind, backlog_id: "SES-1", epic_id: null }),
      "the CHECK admits epic_id IS NULL on every row -- 'a review card filed WITHOUT epic_id' is " +
      "gate-review.md's prohibition to enforce, deliberately not this one's");
  }
}

// -- 4. The runbook cites the constraint, and keeps NO second copy of the discriminator ---------

function theRunbookCitesTheConstraint() {
  const src = fs.readFileSync(RUNBOOK, "utf8");
  assert.ok(src.includes(CONSTRAINT_NAME),
    `step 8d must name ${CONSTRAINT_NAME} -- the prose asserted this contract as though it were ` +
    "enforced for nine versions while nothing enforced it, and a citation is what makes the next " +
    "reader able to check");
}

// THE CHECK IS SCOPED TO THE SQL BLOCK, NOT TO THE WHOLE FILE, and that is deliberate rather than
// convenient. The prose around step 8d legitimately NAMES the discriminator (it has to -- it is
// telling the reader what the constraint enforces), so a file-wide "does 'gated_before_build'
// appear near 'ri.epic_id = e.id'" test would fire on the citation and force the documentation to
// be written obscurely to keep its own guard quiet. What must stay clean is the QUERY a cycle
// actually runs, so that is what this reads.
export function sweepQueryOf(runbookSrc) {
  const m = runbookSrc.match(/```sql\n([\s\S]*?FROM public\.runner_directives d[\s\S]*?)```/);
  return m ? m[1] : null;
}

function theSweepPredicateKeepsNoSecondCopy() {
  const src = fs.readFileSync(RUNBOOK, "utf8");
  const q = sweepQueryOf(src);
  assert.ok(q, "step 8d's sweep query block must be findable -- this guard is vacuous without it");

  assert.match(q, /NOT EXISTS \(SELECT 1 FROM public\.runner_items ri WHERE ri\.epic_id = e\.id\)/,
    "step 8d's sweep predicate must stay the bare join -- narrowing it duplicates the constraint");

  assert.ok(!/ri\.kind|ri\.backlog_id/.test(q),
    "step 8d's QUERY must NOT also filter on kind/backlog_id: with the CHECK in force " +
    "ri.epic_id = e.id can only match a review card by construction, so a second copy of the " +
    "discriminator can only ever drift from the one the database enforces");
}

// -- 5. LIVE half: the real constraint, against real Postgres, both directions ------------------

async function theConstraintIsRealAndRefusesBothViolatorShapes() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    notRun("SES-254 live constraint half",
      "no Supabase credentials in env (run with `node --env-file=.env.local " +
      "tests/regression/run-all.js` to include it). The source-parsed half above did run.");
    return;
  }

  const base = `${url.replace(/\/$/, "")}/rest/v1`;
  const headers = {
    "Content-Type": "application/json", apikey: key,
    Authorization: `Bearer ${key}`, Prefer: "return=representation",
  };

  // (a) The still-accepted direction, read-only and non-vacuous: rows carrying epic_id EXIST, and
  //     every one of them is a review card. If the constraint refused review cards these could not
  //     be here at all, so this is the positive half without writing anything.
  const res = await fetch(`${base}/runner_items?epic_id=not.is.null&select=id,kind,backlog_id`, { headers });
  assert.strictEqual(res.status, 200, `census read failed: HTTP ${res.status}`);
  const rows = await res.json();
  assert.ok(rows.length > 0,
    "the census is vacuous with zero rows -- there must be at least one live gate-review card");
  const bad = rows.filter(r => !shippedAllows({ ...r, epic_id: "x" }));
  assert.deepStrictEqual(bad, [],
    "a live row carries epic_id while not being a gate-review card -- its epic's gate-review sweep " +
    "is blinded right now");

  // (b) + (c) The refused directions. Both POSTs are expected to be rejected, so neither writes a
  //     row; if one is ACCEPTED the constraint is gone -- delete the row we just made before
  //     failing, so a broken guard does not also leave litter.
  const refuse = async (label, body) => {
    const r = await fetch(`${base}/runner_items`, {
      method: "POST", headers, body: JSON.stringify(body),
    });
    const text = await r.text();
    if (r.status === 201) {
      let created = [];
      try { created = JSON.parse(text); } catch { /* fall through to the assert */ }
      for (const row of created) {
        await fetch(`${base}/runner_items?id=eq.${row.id}`, { method: "DELETE", headers });
      }
      assert.fail(`${label}: the insert was ACCEPTED -- ${CONSTRAINT_NAME} is missing or weakened ` +
        `(the fixture row was deleted again)`);
    }
    assert.ok(text.includes(CONSTRAINT_NAME) || text.includes("23514"),
      `${label}: expected a check-constraint refusal, got HTTP ${r.status} ${text.slice(0, 300)}`);
  };

  const anyEpic = rows[0].id ? undefined : undefined;   // epic id comes from the census below
  const epicRes = await fetch(`${base}/epics?select=id&limit=1`, { headers });
  const epics = await epicRes.json();
  assert.ok(epics.length > 0, "no epics row to build the fixture from");
  const epicId = epics[0].id;
  void anyEpic;

  await refuse("a SHIP card carrying epic_id (the SES-211 / SES-182 shape)", {
    cycle_id: "00000000-0000-0000-0000-000000000000",
    kind: "ship", backlog_id: "SES-999", title: "SES-254 guard fixture", epic_id: epicId,
  });

  await refuse("a GATED card that also names a ticket (the SES-45 / SES-210 shape)", {
    cycle_id: "00000000-0000-0000-0000-000000000000",
    kind: "gated_before_build", backlog_id: "SES-998", title: "SES-254 guard fixture", epic_id: epicId,
  });
}

async function run() {
  theDiscriminatorSeparatesTheLivePopulations();
  aKindOnlyConstraintWouldHaveMissedHalfTheViolators();
  aCardWithoutAnEpicIdIsUnaffected();
  theRunbookCitesTheConstraint();
  theSweepPredicateKeepsNoSecondCopy();
  await theConstraintIsRealAndRefusesBothViolatorShapes();
}

selfRun(import.meta.url, run);
export default run;
