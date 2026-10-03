// DeepBench v7.0.233 | tests/regression/SES-153-version-claim.js | SES-153
//
// Guards the two halves of "a shipped version number was actually issued to the session shipping
// it": the pure verdict logic in scripts/check-version-claim.js, and step 7's pre-push gate in
// docs/runbooks/runner-cycle.md that makes a cycle run it. Neither is correct alone -- a checker
// nothing invokes is a checker that never fires, and a runbook clause with no script behind it is
// a rule that cannot be obeyed -- so one test guards both.
//
// THE RULE IS READ OUT OF THE RUNBOOK, never restated here (John's rule 2026-08-23, "you should
// never be throwing away tests"; the SES-194 / SES-176 / SES-158 precedent). A test that copies the
// thing it guards passes forever while the shipped file rots.
//
// EVERY DOC ASSERTION IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that
// should matter removed -- and every control is itself checked for having changed anything
// (`aVacuousControlIsCaught`), because SES-158 shipped a control that mutated nothing and the test
// passed anyway.
//
// THE CLAUSE THIS FILE EXISTS FOR, above all the others: the rejection of the cheaper check. A
// later editor will be tempted to replace the ledger lookup with "is my version <= the counter?",
// because it needs no table and reads like the same question. It is not the same question, and it
// does not catch the case this ticket was filed from: on 2026-08-23 the attended session
// `successional-review` shipped v7.0.195 AND v7.0.196 and BOTH were <= the counter's 196 -- 196 had
// been issued, to a different session. `runbookRejectsTheCounterComparison` and its control are the
// pin.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied (SES-180 (b)): public.issued_versions,
// its trigger on dev_version_counter and uq_issued_versions_numeric live in the DATABASE (migration
// ses153_issued_versions), not in this repo, and this suite has no credentialed path to
// pg_get_functiondef. The behavioural half is declared not-run here and its evidence is the live QA
// recorded on the ship card.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseVersion, compareVersions, verdict, auditVerdict } from "../../scripts/check-version-claim.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");

const GATE_START = "- **PROVE THE VERSION YOU ARE SHIPPING WAS ISSUED TO YOU";
const GATE_END = "- **Re-assert the lease, then one batched push.**";

// Pure: slice the bounded gate block out of the runbook. Returns "" when absent -- itself a finding
// rather than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractGate(md) {
  const a = md.indexOf(GATE_START);
  if (a < 0) return "";
  const b = md.indexOf(GATE_END, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

// --- the doc clauses, each a predicate over the gate block ------------------------------------
// Each entry: [name, predicate, control] where `control` removes the one thing the predicate is
// about. A clause passes only if predicate(block) is true AND predicate(control(block)) is false.
const CLAUSES = [
  ["namesTheScript",
    b => b.includes("scripts/check-version-claim.js"),
    b => b.split("scripts/check-version-claim.js").join("scripts/some-other-check.js")],

  ["requiresTheSessionArgument",
    b => /--session=/.test(b),
    b => b.split("--session=").join("--nothing=")],

  ["exitOneRefusesThePush",
    b => /Exit 1 → do NOT push/.test(b),
    b => b.split("Exit 1 → do NOT push").join("Exit 1 is worth a look")],

  ["exitTwoIsNotAPass",
    b => /Exit 2[\s\S]{0,120}not a pass/.test(b),
    b => b.split("is **not a pass**").join("is fine")],

  // THE PIN. Both halves matter: that the comparison is named as the wrong check, and that the
  // evidence (both colliding versions were <= the counter) is carried with it.
  ["runbookRejectsTheCounterComparison",
    b => /obvious cheaper check is the wrong one/.test(b) && /both were ≤ the counter's 196/.test(b),
    b => b.split("both were ≤ the counter's 196").join("that was unfortunate")],

  ["saysTheLedgerWasNotBackfilled",
    b => /NOT backfilled/.test(b) && /not assertable/.test(b),
    b => b.split("NOT backfilled").join("fully backfilled")],

  ["saysTheLedgerIsTriggerFed",
    b => /fed by a trigger on the counter/.test(b),
    b => b.split("fed by a trigger on the counter").join("written by each session at close-out")],
];

function checkClauses(block) {
  for (const [name, predicate, control] of CLAUSES) {
    assert.ok(predicate(block), `runner-cycle.md step 7 lost its version-claim gate clause: ${name}`);
    const mutated = control(block);
    assert.notStrictEqual(mutated, block,
      `negative control for ${name} changed NOTHING -- it is vacuous and proves nothing (the SES-158 failure)`);
    assert.ok(!predicate(mutated),
      `negative control for ${name} still PASSES -- the assertion is not testing what it claims to test`);
  }
}

// --- the pure verdict branches -----------------------------------------------------------------

const FLOOR = "v7.0.233";
const ROW_TO_CYCLE = { version: "v7.0.240", issued_to: "cycle-20260823-1640", issued_at: "2026-08-23T16:54:14Z" };

function checkVerdicts() {
  // THE INCIDENT, REPLAYED. Identical inputs; the ONE variable is the session string. A build that
  // ignored `issued_to` -- i.e. that only asked "is this version in the ledger?" -- passes the first
  // and fails the second, which is exactly the difference between recording and detecting.
  const mine = verdict({ version: "v7.0.240", session: "cycle-20260823-1640", row: ROW_TO_CYCLE, floor: FLOOR });
  assert.strictEqual(mine.kind, "issued-to-you");
  assert.strictEqual(mine.code, 0);

  const theirs = verdict({ version: "v7.0.240", session: "successional-review", row: ROW_TO_CYCLE, floor: FLOOR });
  assert.strictEqual(theirs.kind, "issued-to-another",
    "a version issued to ANOTHER session must not pass -- this is the SES-153 collision itself");
  assert.strictEqual(theirs.code, 1);
  assert.ok(/NOT to 'successional-review'/.test(theirs.message),
    "the failure message must name who the version was actually issued to; a bare 'failed' is unactionable");

  // The hand-count: at or above the floor, absent from the ledger. Must fail CLOSED.
  const handCounted = verdict({ version: "v7.0.241", session: "anyone", row: null, floor: FLOOR });
  assert.strictEqual(handCounted.kind, "never-issued");
  assert.strictEqual(handCounted.code, 1);

  // The fail-OPEN, and its control. Below the floor the ledger cannot answer, so this must pass --
  // but only because of the floor. Re-run the identical inputs with the floor removed and the same
  // version must become a finding; if it does not, the floor is decorative.
  const old = verdict({ version: "v7.0.100", session: "anyone", row: null, floor: FLOOR });
  assert.strictEqual(old.kind, "predates-ledger");
  assert.strictEqual(old.code, 0);
  const oldWithoutFloor = verdict({ version: "v7.0.100", session: "anyone", row: null, floor: "v7.0.1" });
  assert.strictEqual(oldWithoutFloor.kind, "never-issued",
    "with the floor lowered beneath it, the same version must be judged -- otherwise the floor is not what is doing the work");

  // An empty ledger is a limit, never a verdict.
  assert.strictEqual(verdict({ version: "v7.0.240", session: "x", row: null, floor: null }).kind, "ledger-empty");

  // Cannot-run is distinct from failure, in both directions.
  assert.strictEqual(verdict({ version: "7.0.240", session: "x", row: null, floor: FLOOR }).code, 2,
    "a malformed version is cannot-run (2), never a failed assertion (1)");
  assert.strictEqual(verdict({ version: "v7.0.240", session: "", row: null, floor: FLOOR }).code, 2,
    "a missing --session is cannot-run (2): without it the check cannot ask the only question that matters");
}

function checkVersionArithmetic() {
  assert.deepStrictEqual(parseVersion("v7.0.233"), { major: 7, minor: 0, patch: 233 });
  assert.strictEqual(parseVersion("7.0.233"), null, "the bare spelling is not the canonical form");
  assert.strictEqual(parseVersion(null), null);

  // Numeric, never lexical. A string sort puts v7.0.9 AFTER v7.0.10, which would push the floor to
  // the wrong row and silently un-judge everything above it.
  assert.ok(compareVersions("v7.0.9", "v7.0.10") < 0,
    "versions must compare numerically -- lexically 'v7.0.9' > 'v7.0.10' and the floor lands on the wrong row");
  assert.ok(compareVersions("v7.1.0", "v7.0.99") > 0);
  assert.strictEqual(compareVersions("v7.0.1", "nonsense"), null);
}

function checkAudit() {
  const issued = ["v7.0.233", "v7.0.234"];
  const clean = auditVerdict({ shipped: [{ version: "v7.0.234", cycle_id: "c1" }], issued, floor: FLOOR });
  assert.strictEqual(clean.kind, "audit-clean");

  const drifted = auditVerdict({ shipped: [{ version: "v7.0.235", cycle_id: "c2" }], issued, floor: FLOOR });
  assert.strictEqual(drifted.kind, "audit-drift");
  assert.deepStrictEqual(drifted.missing.map(m => m.version), ["v7.0.235"]);

  // The two shapes that must be SKIPPED rather than reported: below the floor, and the unparseable
  // spelling that already occurs live ('7.0.232' with no v prefix, runner_cycles at 2026-08-24).
  const skips = auditVerdict({
    shipped: [{ version: "v7.0.100", cycle_id: "old" }, { version: "7.0.232", cycle_id: "bare" }],
    issued, floor: FLOOR,
  });
  assert.strictEqual(skips.kind, "audit-clean");
  assert.strictEqual(skips.skipped, 2, "below-floor and unparseable rows are not judged, and the count must say so");
  assert.strictEqual(skips.judged, 0);
}

// Meta-assertion: prove the control mechanism can fail. If a mutation that changes nothing were
// accepted, every negative control above would be worthless.
function aVacuousControlIsCaught() {
  const block = "PROVE THE VERSION";
  let threw = false;
  try {
    const mutated = block.split("string-that-is-not-present").join("x");
    assert.notStrictEqual(mutated, block, "vacuous");
  } catch { threw = true; }
  assert.ok(threw, "the vacuous-control guard does not actually catch a no-op mutation");
}

async function run() {
  const md = fs.readFileSync(RUNBOOK, "utf8");
  const block = extractGate(md);
  assert.ok(block.length > 0,
    "docs/runbooks/runner-cycle.md step 7 has no version-claim gate block -- the checker exists but nothing invokes it");

  checkClauses(block);
  aVacuousControlIsCaught();
  checkVerdicts();
  checkVersionArithmetic();
  checkAudit();

  notRun(
    "public.issued_versions, trg_dev_version_counter_issue and uq_issued_versions_numeric",
    "the table, trigger and unique constraint ship as migration ses153_issued_versions and live in the database, not this repo; this suite has no credentialed path to pg_get_functiondef and could only reach them by mutating the live counter. Live QA evidence is on the SES-153 ship card."
  );
}

export default run;
selfRun(import.meta.url, run);
