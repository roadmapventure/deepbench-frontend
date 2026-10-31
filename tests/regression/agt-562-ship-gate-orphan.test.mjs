// DeepBench v7.0.931 | tests/regression/agt-562-ship-gate-orphan.test.mjs | AGT-562 — A CYCLE THAT
// CAPTURED A DOWN FOR A MIGRATION THAT NEVER LANDED CANNOT SHIP.
//
// THE DEFECT THIS GUARDS, measured live on `public.runner_migration_downs` and
// `rpc/migrations_in_range` at this ship rather than reasoned about: 399 applied migrations, 154
// captured downs, and TWO down rows whose `up_name` is in no applied migration at all —
// `agt423_sweep_fault_isolation` and `agt291_finish_sensor`. `capture_migration_down()` runs BEFORE
// `apply_migration` (runner-cycle.md step 6), so each of those is the signature of an apply that was
// captured for and never happened: the ledger promises a reversal for a schema change that is not
// there, and the next rollback would run a down against a schema that never moved. Nothing in the
// ship gate looked. `scripts/verifier.js` approved every one of those cycles.
//
// CYCLE-SCOPED, AND THAT IS THE DESIGN RATHER THAN A SOFT START. A whole-ledger stop would block
// every ship on the platform the moment it landed — two orphans stand today and
// `agt423_sweep_fault_isolation`'s down row is `classification = 'refused'` with `down_sql` NULL, so
// clearing it needs an attended apply this build is not allowed to make. An orphan THIS cycle
// captured IS a fact about THIS change, so it gates; the whole-ledger count is a fact about the live
// world, so it is printed at every ship and gates nothing (pattern:162, the same argument
// `ciConclusionFinding`'s own header makes for CI).
//
// FOUR ARMS, and what each proves is stated rather than implied.
//
//   (A) FOUR CLAUSES, DISCRIMINATED BY CLAUSE AND NEVER BY "returns something" (the LOO-013
//       lesson: assert WHICH branch fired). `clear` is `null`, `no-cycle-id` is a finding that does
//       NOT block, and `unreadable` / `orphan` are the two that do. Pre-fix this arm cannot pass
//       at all: `origin/dev` exports no `shipOrphanFinding`.
//   (B) UNKNOWN IS NOT INNOCENT, asserted in both of its shapes — a failed read (`error`) and a
//       `known:false` from `ledgerOrphansIn()` over a non-array — because they arrive by different
//       routes and collapsing either into `clear` is the false green this gate exists to make
//       structurally impossible (pattern:75).
//   (C) THE SOURCE ARM: the flip really is wired, one-directional, and prepends. Asserted against
//       `scripts/verifier.js`'s own source with the `ciConclusion` block as the NEGATIVE control (a
//       block that deliberately does not gate) — without that control a pattern loose enough to
//       match anything would pass this claim on any source at all.
//   (D) THE NEGATIVE CONTROL THE KICKOFF NAMES, over the REAL composed pipeline
//       (`ledgerOrphansIn` → `shipOrphanFinding`, exactly as `main()` composes them): one captured
//       down whose name is absent from the applied list must BLOCK, and the same inputs with that
//       name PRESENT must not. Either direction alone passes a wrong fix — a gate that blocks
//       always, and a gate that blocks never.
//
// WHAT THIS DOES NOT ASSERT, and must not: that the live ledger carries no orphan. It carries two,
// one of them unclearable without an attended apply, and `tests/regression/agt-184-ledger-orphan.
// test.mjs` is the test that grades the live world and is STANDING RED on exactly those two. This
// file grades the CHANGE (pattern:162) — it reads no ledger, needs no credentials, and makes no
// network call.
//
// Invocation: node tests/regression/agt-562-ship-gate-orphan.test.mjs
// (STANDARDS.md Section 2 rule 5 for the credentialed form; this test needs no credentials.)

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { shipOrphanFinding } from "../../scripts/verifier.js";
import { ledgerOrphansIn } from "../../scripts/rollback-on-red.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERIFIER_REL = "scripts/verifier.js";
const CYCLE = "f5265bfc-c696-412b-97e4-390012ccb9c5";

// The two live orphan names, used as fixture content so the arms read against the real shape of the
// defect rather than against `foo`/`bar`.
const ORPHAN_A = "agt423_sweep_fault_isolation";
const ORPHAN_B = "agt291_finish_sensor";

// --- arm A: four clauses, each named -----------------------------------------------------------

function theFourClausesAreEachTheirOwnFact() {
  // clear — and it is `null`, not a finding with a "clean" clause: the caller's prose keeps "clear"
  // and "not graded" apart in words, which it cannot do if both arrive as objects.
  assert.strictEqual(
    shipOrphanFinding({ cycleId: CYCLE, orphans: [], known: true }), null,
    "a cycle whose captured downs were READ and all name an applied migration must return null"
  );

  // no-cycle-id — a finding (nobody looked), and the caller's own flip excludes this clause, which
  // arm C asserts against the source.
  const none = shipOrphanFinding({ cycleId: "", orphans: [], known: true });
  assert.ok(none, "no --cycle-id must still produce a finding: \"nobody looked\" is not \"it is clean\"");
  assert.strictEqual(none.kind, "ship-orphan");
  assert.strictEqual(none.clause, "no-cycle-id");
  assert.match(none.reason, /does not block/i,
    "the no-cycle-id reason must say in words that it does not block — a reader cannot tell a " +
    "non-gating clause from a gating one by its name alone");

  // orphan — BLOCKS, and names EVERY up_name rather than counting them: which it is (an apply still
  // owed, or a down row owed a deletion) depends on the name.
  const orph = shipOrphanFinding({ cycleId: CYCLE, orphans: [ORPHAN_A, ORPHAN_B], known: true });
  assert.ok(orph, "a captured orphan must produce a finding");
  assert.strictEqual(orph.clause, "orphan");
  assert.match(orph.reason, new RegExp(ORPHAN_A), "the orphan reason must name each up_name");
  assert.match(orph.reason, new RegExp(ORPHAN_B), "the orphan reason must name each up_name");
  assert.match(orph.reason, /BLOCK/i, "the orphan reason must say it blocks");
  assert.strictEqual(orph.kind, "ship-orphan");

  // The empty-name guard `ledgerOrphansIn()` already applies on its side: a list of blanks is not an
  // orphan, so it must not manufacture a block out of nothing.
  assert.strictEqual(
    shipOrphanFinding({ cycleId: CYCLE, orphans: ["", null, undefined], known: true }), null,
    "a list carrying only empty names is not an orphan and must not block"
  );
}

// --- arm B: unknown is not innocent, in both of its shapes -------------------------------------

function unknownIsNotInnocentByEitherRoute() {
  const failed = shipOrphanFinding({ cycleId: CYCLE, error: "HTTP 503: upstream connect error" });
  assert.ok(failed, "a failed ledger read must produce a finding, never a silent clear");
  assert.strictEqual(failed.clause, "unreadable");
  assert.match(failed.reason, /HTTP 503/,
    "the unreadable reason must carry the read's own error — \"could not be read\" with no cause is " +
    "unactionable at the ship point");
  assert.match(failed.reason, /BLOCK/i, "the unreadable clause must block: unknown is not innocent");

  // The OTHER route to the same clause: ledgerOrphansIn() returns known:false for a non-array, which
  // is a different fact (nothing was supplied) arriving without any error string at all.
  const notSupplied = ledgerOrphansIn(undefined, [{ name: ORPHAN_A }]);
  assert.strictEqual(notSupplied.known, false,
    "positive control: ledgerOrphansIn() must still report known:false for a non-array cycleDowns — " +
    "if it did not, the assertion below would be testing a path nothing can reach");
  const unknown = shipOrphanFinding({ cycleId: CYCLE, orphans: notSupplied.orphans, known: notSupplied.known });
  assert.ok(unknown, "known:false must produce a finding");
  assert.strictEqual(unknown.clause, "unreadable");
  assert.match(unknown.reason, /known:false|not supplied/i,
    "the known:false reason must say which of the two unreadable routes fired");

  // And `known` must be checked rather than merely truthy-tested: an orphan list that arrived with no
  // `known` at all is UNKNOWN, not clean.
  assert.strictEqual(shipOrphanFinding({ cycleId: CYCLE, orphans: [] }).clause, "unreadable",
    "a call with no `known` at all is UNKNOWN and must block — defaulting it to true is the false green");
}

// --- arm C: the flip is wired, one-directional, and prepends ------------------------------------

const blockAfter = (src, decl, lines = 6) => {
  const i = src.indexOf(decl);
  assert.notStrictEqual(i, -1, `${VERIFIER_REL} must still contain \`${decl}\``);
  return src.slice(i).split("\n").slice(0, lines).join("\n");
};

// TWO PATTERNS, ASSERTED SEPARATELY, NOT ONE ALTERNATION — agt-174's measured lesson: with a single
// regex, mistyping one half still matches through the other and the control cannot catch it.
const GATING = [
  { name: "verdict assignment", re: /verdict\s*=\s*"block"/ },
  { name: "reasoning prepend", re: /reasoning\s*=\s*shipOrphan\.reason\s*\+/ },
];

function theShipGateHoldsTheFlipAfterVerdictFor() {
  const src = fs.readFileSync(path.join(REPO, VERIFIER_REL), "utf8").replace(/\r\n/g, "\n");

  // The flip must live AFTER the mechanical verdict exists — before it, there is no `approve` to turn
  // into a `block` and the assignment would be overwritten by `verdictFor()`'s own destructuring.
  const verdictAt = src.indexOf("let { verdict, reasoning } = verdictFor(gateResults);");
  assert.notStrictEqual(verdictAt, -1, `${VERIFIER_REL} must still destructure verdictFor(gateResults)`);
  const flipDecl = 'if (shipOrphan && shipOrphan.clause !== "no-cycle-id") {';
  const flipAt = src.indexOf(flipDecl);
  assert.notStrictEqual(flipAt, -1,
    `${VERIFIER_REL} must hold the AGT-562 flip, guarded so the no-cycle-id clause does NOT block`);
  assert.ok(flipAt > verdictAt,
    "the AGT-562 flip must come AFTER verdictFor(gateResults) — a flip before it is erased by the " +
    "destructuring assignment and the gate would be silently inert");

  const gatingBlock = blockAfter(src, flipDecl);
  const reporting = blockAfter(src, "const ciConclusion = ciConclusionFinding({", 8);

  for (const { name, re } of GATING) {
    // THE CLAIM: this block really does turn approve into block, and prepends rather than replaces.
    assert.match(gatingBlock, re,
      `the AGT-562 block must carry the ${name} — without it the finding is computed, printed and ` +
      "then ignored, which is a gate that reports a defect and ships it anyway");
    // NEGATIVE CONTROL: AGT-194's block is deliberately non-gating, so a pattern loose enough to
    // match it would pass the claim above on any source at all.
    assert.doesNotMatch(reporting, re,
      `negative control failed for the ${name} pattern: the ciConclusion block is deliberately ` +
      "non-gating (see its header), so a pattern that matches there is too loose to prove anything");
  }

  // ONE DIRECTION ONLY: nothing in the block may turn a block back into an approve.
  assert.doesNotMatch(gatingBlock, /verdict\s*=\s*"approve"/,
    "the AGT-562 block must never assign approve — one direction only, like every other rule in " +
    "this file: a red gate that was already the reason stays the reason");
  // PREPEND, not replace: the existing reasoning must survive.
  assert.match(gatingBlock, /\+\s*reasoning\s*;?/,
    "the reasoning must be PREPENDED to the existing reasoning, never replace it — an orphaned down " +
    "must not erase the red gate that was already the reason");

  // Wired at all, and reusing the two existing halves rather than restating either predicate.
  assert.match(src, /import \{ ledgerOrphansIn, readDownsCapturedBy \} from "\.\/rollback-on-red\.js";/,
    `${VERIFIER_REL} must import both halves from rollback-on-red.js rather than re-deriving them`);
  assert.match(src, /readDownsCapturedBy\(supabaseUrl, supabaseKey, cycleId\)/,
    `${VERIFIER_REL} must actually read the downs this cycle captured`);
  assert.match(src, /rpc\/migrations_in_range/,
    `${VERIFIER_REL} must read the applied migrations the orphan check joins against`);
  assert.match(src, /shipOrphan = shipOrphanFinding\(/,
    `${VERIFIER_REL} must actually call shipOrphanFinding()`);

  // The ALWAYS-PRINTED line, and the ledger-wide half beside it — a line that appeared only on a
  // finding would leave its reader unable to tell "clear" from "this build does not look".
  assert.match(src, /SHIP ORPHANS: \$\{shipOrphan/,
    `${VERIFIER_REL}'s prose must print the SHIP ORPHANS line on every run, gating or not`);
  assert.match(src, /ledger-wide \$\{ledgerWideOrphans/,
    `${VERIFIER_REL}'s prose must print the whole-ledger count beside it — printed, never gating`);
  assert.match(src, /clear \(this cycle captured no down\)/,
    `${VERIFIER_REL} must state the clear case in words rather than printing a bare clause token`);
  assert.match(src, /ship_orphan: shipOrphan,/,
    "the --json payload must report the finding (reported, never its own runner_verdicts column — " +
    "AGT-170's convention, no migration)");
  assert.match(src, /ship_orphan_ledger_wide: ledgerWideOrphans,/,
    "the --json payload must report the whole-ledger names beside the finding");

  // The ledger-wide half must never reach the flip: it is a fact about the live world.
  assert.doesNotMatch(gatingBlock, /ledgerWideOrphans/,
    "the whole-ledger count must NEVER gate — two orphans stand today and one cannot be cleared " +
    "without an attended apply, so a whole-ledger stop wedges every ship on the platform (pattern:162)");
}

// --- arm D: the negative control, over the composed pipeline -----------------------------------

// Exactly how main() composes the two: ledgerOrphansIn() over the cycle's captured downs and the
// applied list, then shipOrphanFinding() over its result. Asserting the pair rather than the halves
// is what makes this a control on the GATE and not on either function.
const gateOver = (cycleDowns, migrations) => {
  const scoped = ledgerOrphansIn(cycleDowns, migrations);
  const finding = shipOrphanFinding({ cycleId: CYCLE, orphans: scoped.orphans, known: scoped.known });
  return { finding, blocks: Boolean(finding && finding.clause !== "no-cycle-id") };
};

function theCapturedDownWithoutItsAppliedUpBlocksAndWithItDoesNot() {
  const captured = [{ up_name: ORPHAN_A, captured_at: "2026-10-31T11:00:00Z" }];

  // ABSENT from the applied list — the real defect shape, and what today's verifier approves.
  const absent = gateOver(captured, [
    { version: "20260624001657", name: "aa_58_create_agents_table" },
    { version: "20261030120000", name: "agt560_something_else" },
  ]);
  assert.strictEqual(absent.blocks, true,
    "NEGATIVE CONTROL (half 1): a cycle that captured a down whose up_name is in NO applied " +
    "migration must BLOCK — this is the exact state origin/dev's verifier approves");
  assert.strictEqual(absent.finding.clause, "orphan",
    "it must block on the `orphan` clause specifically, not on `unreadable` for some unrelated reason");

  // PRESENT in the applied list — the same inputs, one row added. Without this half, a gate that
  // blocks every ship would pass half 1.
  const present = gateOver(captured, [
    { version: "20260624001657", name: "aa_58_create_agents_table" },
    { version: "20261031110000", name: ORPHAN_A },
  ]);
  assert.strictEqual(present.blocks, false,
    "NEGATIVE CONTROL (half 2): the SAME captured down, with its migration present in the applied " +
    "list, must NOT block — a gate that blocks always is not a gate");
  assert.strictEqual(present.finding, null,
    "and the clean case must be `null`, so the caller's prose can say \"clear\" in words");

  // A cycle that captured nothing is clean, not unknown: an EMPTY array is a real answer and only a
  // NON-array is unknown. Collapsing the two would make every cycle that touched no schema block.
  assert.strictEqual(gateOver([], [{ name: ORPHAN_A }]).blocks, false,
    "a cycle that captured no down at all must not block — an empty list is a real answer");
  assert.strictEqual(gateOver(null, [{ name: ORPHAN_A }]).blocks, true,
    "but a non-array (nothing supplied) is UNKNOWN and must block");
}

async function run(/* ctx */) {
  const results = [];

  theFourClausesAreEachTheirOwnFact();
  results.push("A-four-clauses-clear-no-cycle-id-unreadable-orphan-each-discriminated");

  unknownIsNotInnocentByEitherRoute();
  results.push("B-unreadable-blocks-by-both-routes-failed-read-and-known-false");

  theShipGateHoldsTheFlipAfterVerdictFor();
  results.push("C-flip-after-verdictFor-one-direction-prepends-ciConclusion-negative-control");

  theCapturedDownWithoutItsAppliedUpBlocksAndWithItDoesNot();
  results.push("D-negative-control-absent-up-blocks-present-up-does-not");

  return results;
}

selfRun(import.meta.url, run);
export default run;
