// DeepBench v7.0.627 | tests/regression/agt-184-ledger-orphan.test.mjs | AGT-184
//
// FEATURE: AGT-184 -- an unmoved migration watermark is NOT proof of a code-only range.
//
// WHAT WAS BROKEN, and it was the one direction `scripts/rollback-on-red.js`'s own header says must
// never be wrong ("it would auto-revert a schema change believing it was text"). `rangeIsCodeOnly()`
// compares the green watermark with the current one AND NOTHING ELSE, so a cycle that changed a
// schema object WITHOUT landing a migration row moves no watermark at all: decide() falls through to
// its last `return` and answers `revert-and-card`, "the range is code-only and reversible by
// revert-forward". Reverting that range leaves the schema change standing.
//
// IT WAS NOT HYPOTHETICAL. Measured live 2026-09-27 before this ship: `runner_migration_downs` held
// 74 rows, 73 matched a migration by name and ONE did not -- `agt138_researcher_route`, captured
// `refused` on 2026-09-26, because AGT-138 wrote `public.finding_routes` over PostgREST and never
// applied a migration. Task 1 of this ticket re-landed that migration (version 20260927041137,
// `on conflict do nothing`, a true no-op against the live row) so the ledger reads 0 orphans again --
// but the ENGINE still answered code-only, which is what arm (A) below fixes in place.
//
// WHAT SHIPPED: `ledgerOrphansIn(cycleDowns, migrations)` -- pure -- returns
// `{orphans:[up_name], known}`; `readDownsCapturedBy(base, key, cycleId)` reads the downs the
// ATTRIBUTED cycle captured (the other direction from `readMigrationDowns()`, which starts from the
// migrations the cycle NAMED and so can never see a down whose migration never landed); and decide()
// gains one CARD_ONLY branch immediately before the code-only `return`.
//
// THREE ARMS:
//   * (A) PURE -- the kickoff's own QA triple over decide(), one field changed between fixtures.
//     Always runs. It is the whole discriminator and it is stated as a triple ON PURPOSE: a pair
//     would pass for a guard that cards whenever ANY down exists, which is the wrong rule.
//   * (B) SOURCE -- the new branch sits BEFORE the code-only return, read out of the shipped file
//     rather than restated (SES-45). Always runs, with a negative control that moves the block after
//     the return and is shown to LOSE the same check (SES-158: a control that changes nothing proves
//     nothing).
//   * (C) LIVE -- the whole-ledger orphan count, Task 1's three assertions, and
//     readDownsCapturedBy() against the real cycle. Credential-gated and DECLARED not-run otherwise
//     (SES-180), never silently skipped. READ-ONLY throughout (pattern:76): every statement here is
//     a GET, nothing is inserted, patched or cleaned up.
//
// DRY-RUN RESULT (STANDARDS.md Section 4, the SES-76 rule), measured rather than reasoned. The same
// triple run against the engine at `origin/dev` answered `revert-and-card` for ALL THREE fixtures --
// including the middle one, which is the defect. THIS FILE against that engine cannot even load:
// `SyntaxError: The requested module '../../scripts/rollback-on-red.js' does not provide an export
// named 'ledgerOrphansIn'`. A brand-new export can only fail structurally, and that is said here
// rather than left to look like assertion coverage.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied:
//   * A cycle that captures NO down at all leaves no signal in this ledger, so no reader can catch
//     it. That is the WRITER side -- a cycle with no SQL path must stop rather than write DML over
//     PostgREST -- and it is John's to approve (`bd-guardrails`, `agent-row-gate.js` returns
//     `gated`/`no-authority` for AGT-184). Filed by AGT-184's Task 4, not guarded here.
//   * Nothing here applies or re-applies a migration. Task 1's write is the orchestrator's; this arm
//     reads its result back.
//   * `rangeIsCodeOnly()` itself is untouched by this ship and stays guarded where it already was
//     (SES-182). Arm (B) asserts only that it did not learn about the ledger.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { selfRun, notRun } from "./_lib/self-run.js";

import {
  ACTIONS,
  DOWN_CLASSIFICATIONS,
  decide,
  ledgerOrphansIn,
  readDownsCapturedBy,
} from "../../scripts/rollback-on-red.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENGINE_REL = path.join("scripts", "rollback-on-red.js");
const ENGINE_SRC = fs.readFileSync(path.join(REPO, ENGINE_REL), "utf8");

// The live orphan, named once. It is the join key on both sides: `runner_migration_downs.up_name`
// and `supabase_migrations.schema_migrations.name`.
export const ORPHAN_NAME = "agt138_researcher_route";
export const ORPHAN_CYCLE = "d7790ea0-c34d-4de9-898c-2cac31d8f8f9";
export const WHOLE_LEDGER = { p_from: "0", p_to: "99999999999999" };

const HEAD = "abc1234def5678";
const CYCLE_ID = "cyc-agt-184";
const ANCHOR = { commit_sha: "0000green0000", migration_watermark: "20260927041137" };

// ---------------------------------------------------------------------------
// (A) PURE -- the kickoff's QA triple. ONE code-only fixture; only `cycleDowns`
// (and the range list it is graded against) changes between the three.
// ---------------------------------------------------------------------------

// Red, attributable, anchored, a one-cycle range, watermarks EQUAL -- so the fixture reaches the
// code-only fall-through and nothing above it. Asserted below rather than assumed.
function codeOnlyFacts(over = {}) {
  return {
    trigger: "ci-red",
    jobs: [
      { name: "Build (blocking)", conclusion: "success" },
      { name: "Tripwire + regression (blocking)", conclusion: "failure" },
    ],
    headSha: HEAD,
    greenAnchor: ANCHOR,
    currentWatermark: ANCHOR.migration_watermark,
    cycles: [{ id: CYCLE_ID, push_sha: HEAD, version: "v7.0.627" }],
    rangeShas: [HEAD],
    migrations: [],
    ...over,
  };
}

// ASSERTION 0 -- the fixture reaches the branch it claims. Without this every clause below could be
// grading the SES-287 span gate or the schema-plan branch and reading it as a pass.
function theFixtureIsTheCodeOnlyFallThrough() {
  const d = decide(codeOnlyFacts({ cycleDowns: [] }));
  assert.strictEqual(d.action, ACTIONS.REVERT_AND_CARD,
    "the baseline fixture must reach REVERT_AND_CARD, or the triple grades the wrong branch");
  assert.match(d.reason, /the range is code-only and reversible by revert-forward/,
    "and it must reach it through the CODE-ONLY return specifically -- the watermark branch above " +
    "also returns REVERT_AND_CARD, and the guard under test sits below it, not above");
  assert.ok(d.rangeSpan && d.rangeSpan.known === true,
    "the range must be supplied and one-cycle, or the SES-287 gate cards first and the guard is never reached");
}

// ASSERTION 1 -- THE TRIPLE, and the third fixture is what makes it a discriminator rather than a
// coincidence: the guard must key on the ABSENCE OF A LEDGER ROW, never on a down existing.
function theTripleDiscriminatesOnTheAbsentMigration() {
  const noDowns = decide(codeOnlyFacts({ cycleDowns: [] }));
  const orphaned = decide(codeOnlyFacts({
    cycleDowns: [{ up_name: ORPHAN_NAME }],
    migrations: [],
  }));
  const matched = decide(codeOnlyFacts({
    cycleDowns: [{ up_name: "m1" }],
    migrations: [{ version: "1", name: "m1" }],
  }));

  assert.strictEqual(noDowns.action, ACTIONS.REVERT_AND_CARD,
    "(1) no downs captured -> unchanged: every pre-AGT-184 caller must answer exactly as it did");
  assert.strictEqual(orphaned.action, ACTIONS.CARD_ONLY,
    `(2) a down for '${ORPHAN_NAME}' with NO migration carrying that name must turn card-only -- ` +
    "origin/dev answers revert-and-card here, and that is the defect");
  assert.strictEqual(matched.action, ACTIONS.REVERT_AND_CARD,
    "(3) a down whose migration DID land is the ordinary schema case and must stay revert-and-card -- " +
    "if this one cards too, the guard keys on a down EXISTING rather than on the ledger row missing, " +
    "and it would refuse every reversible schema range on the platform");

  // The card must NAME the orphan. A card that says a range "could not be rolled back" and leaves
  // John to find out why is the shape SES-182 slice 2 already refused.
  assert.ok(orphaned.reason.includes(ORPHAN_NAME),
    `the card-only reason must name '${ORPHAN_NAME}', not merely report a count`);
  assert.ok(orphaned.ledger && orphaned.ledger.known === true,
    "the decision must carry the ledger fact it decided on, so the card's author reads it rather than recomputing it");
  assert.deepStrictEqual(orphaned.ledger.orphans, [ORPHAN_NAME],
    "and that fact must be the orphan list itself");
  assert.ok(!orphaned.revertPlan,
    "a carded range plans NO revert -- a revertPlan on a card-only answer is an invitation to apply it");

  // The two revert answers must differ from the card in reason text as well as action, or the pair
  // would pass for a guard that rewrote the action and left the prose lying.
  assert.notStrictEqual(orphaned.reason, noDowns.reason,
    "the carded and uncarded fixtures must differ in what they SAY, not only in their action");
}

// ASSERTION 2 -- unknown is not innocent. A non-array `cycleDowns` is "not supplied", which cards,
// exactly as schemaPlanFor() reads an absent --migrations and rangeIsCodeOnly() an unknown watermark.
// The EMPTY array stays a real answer, and the pair proves the two are distinguished rather than
// collapsed -- collapsing them would make every legacy caller's silence read as a schema write.
function unsuppliedIsUnknownAndEmptyIsNot() {
  assert.deepStrictEqual(ledgerOrphansIn(null, []), { orphans: [], known: false },
    "a non-array cycleDowns is UNKNOWN");
  assert.deepStrictEqual(ledgerOrphansIn(undefined, []), { orphans: [], known: false },
    "and so is an undefined one, when it is passed explicitly rather than defaulted");
  assert.deepStrictEqual(ledgerOrphansIn([], []), { orphans: [], known: true },
    "an EMPTY array is a real answer: this cycle captured nothing");

  assert.strictEqual(decide(codeOnlyFacts({ cycleDowns: null })).action, ACTIONS.CARD_ONLY,
    "an unknown ledger cards -- unknown is not innocent");
  assert.match(decide(codeOnlyFacts({ cycleDowns: null })).reason, /UNKNOWN/,
    "and it says WHICH half is unknown rather than reporting a phantom orphan");
  assert.strictEqual(decide(codeOnlyFacts()).action, ACTIONS.REVERT_AND_CARD,
    "an OMITTED cycleDowns defaults to [] -- every caller written before this ship is byte-identical");

  // Duplicates collapse and blank names are dropped, so the count in the card is a count of NAMES.
  assert.deepStrictEqual(
    ledgerOrphansIn([{ up_name: "a" }, { up_name: "a" }, { up_name: "" }, {}], []),
    { orphans: ["a"], known: true },
    "the orphan list is de-duplicated and carries no blanks -- it is rendered into a card as a count");
  assert.deepStrictEqual(
    ledgerOrphansIn([{ up_name: "a" }], [{ version: "1", name: "a" }, { version: "2", name: "b" }]),
    { orphans: [], known: true },
    "a down matched by ANY member of the range is not an orphan");
}

// ---------------------------------------------------------------------------
// (B) SOURCE -- the branch sits before the code-only return, and rangeIsCodeOnly() did not change.
// ---------------------------------------------------------------------------

export const GUARD_CALL = "const ledger = ledgerOrphansIn(cycleDowns, migrations);";
export const CODE_ONLY_SENTENCE = "so the range is code-only and reversible by revert-forward.";

function decideSpanOf(src) {
  const start = src.indexOf("export function decide(facts = {}) {");
  if (start < 0) return null;
  const end = src.indexOf("function describeWatermark(", start);
  return end > start ? src.slice(start, end) : null;
}

// Where the code-only `return {` opens -- found from its own sentence backwards, so a later edit to
// the prose above it cannot move what this grades.
function codeOnlyReturnStart(span) {
  const sentence = span.lastIndexOf(CODE_ONLY_SENTENCE);
  return sentence < 0 ? -1 : span.lastIndexOf("  return {", sentence);
}

// The property, factored out so the negative control can be run through the SAME function rather
// than through a second hand-written copy of the check.
function guardPrecedesTheCodeOnlyReturn(span) {
  const guard = span.indexOf(GUARD_CALL);
  const ret = codeOnlyReturnStart(span);
  if (guard < 0 || ret < 0) return false;
  if (guard > ret) return false;
  return span.slice(guard, ret).includes(`action: ACTIONS.${"CARD_ONLY"}`);
}

function theGuardSitsBeforeTheCodeOnlyReturn() {
  const span = decideSpanOf(ENGINE_SRC);
  assert.ok(span, `${ENGINE_REL} must still carry a decide() body ending before describeWatermark()`);
  assert.ok(span.includes("cycleDowns = []"),
    "decide() must destructure cycleDowns with an [] default, or pre-AGT-184 callers change answer");

  assert.ok(guardPrecedesTheCodeOnlyReturn(span),
    `the ${GUARD_CALL} branch must sit BEFORE the code-only return and reach ACTIONS.CARD_ONLY. ` +
    "Below that return it is dead code: the function has already answered.");

  // CONTROL WITH TEETH: the same block moved AFTER that return must LOSE the same check, so this
  // asserts a DIFFERENCE rather than a property any decide() body would share.
  const guard = span.indexOf(GUARD_CALL);
  const ret = codeOnlyReturnStart(span);
  const moved = span.slice(0, guard) + span.slice(ret) + "\n" + span.slice(guard, ret);
  assert.notStrictEqual(moved, span, "the control must actually move the block (SES-158)");
  assert.ok(!guardPrecedesTheCodeOnlyReturn(moved),
    "the control must FAIL the same check, or the check cannot detect a guard placed after the return");

  // And the branch must be reached on the fall-through only: everything above it is this ship's
  // declared untouched surface. rangeIsCodeOnly() in particular must still be two watermarks and
  // nothing else -- if it learned about the ledger there would be two homes for one rule.
  const rc = ENGINE_SRC.slice(ENGINE_SRC.indexOf("export function rangeIsCodeOnly("));
  const rcBody = rc.slice(0, rc.indexOf("\n}\n") + 3);
  for (const leak of ["ledger", "cycleDowns", "orphan"]) {
    assert.ok(!rcBody.includes(leak),
      `rangeIsCodeOnly() must not mention \`${leak}\` -- it compares two watermarks, and the second ` +
      "witness is decide()'s to consult");
  }

  // main() must actually WIRE the fact in, or the guard is unreachable from the CLI and only the
  // tests ever see it -- a false green of the worst kind (pattern:75).
  const mainSrc = ENGINE_SRC.slice(ENGINE_SRC.indexOf("async function main() {"));
  assert.ok(mainSrc.includes("readDownsCapturedBy("),
    "main() must read the cycle's captured downs");
  assert.ok(mainSrc.includes("attributionOf(headSha, cyclesRes.cycles)"),
    "main() must CALL the exported attributionOf() rather than restate the prefix match decide() uses");
  assert.ok(mainSrc.includes("cycleDowns: cycleDownsRes.downs"),
    "main() must hand the fact to decide(), or the CLI answers as it did on dev");
  assert.ok(mainSrc.includes("if (cycleDownsRes.error) fail(2,"),
    "a REST failure must fail(2) = could not run -- reading 'no orphans' out of a failed read is the false green");
}

// ---------------------------------------------------------------------------
// (C) LIVE -- read-only, credential-gated, declared not-run without the env vars.
// ---------------------------------------------------------------------------

async function restRows(base, key, pathAndQuery, init) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...(init ?? {}),
    // The auth headers go LAST on purpose: spreading `init` over them drops the apikey and every
    // call 401s. That is how the first draft of this arm failed, and it failed loudly (401), not quietly.
    headers: { ...(init?.headers ?? {}), apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error(`${pathAndQuery} returned a non-array payload`);
  return body;
}

async function theLedgerCarriesNoOrphan() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun(
      "arm (C), the live read: the whole-ledger orphan count over public.migrations_in_range " +
        "left-joined to runner_migration_downs by up_name (0 after AGT-184 Task 1, 1 before it), " +
        `that '${ORPHAN_NAME}' now carries exactly one schema_migrations row, that ` +
        "public.finding_routes still holds exactly one source='researcher' row, and " +
        "readDownsCapturedBy() returning that cycle's own captured downs",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. runner_migration_downs and runner_cycles " +
        "are service_role-only (anon and authenticated hold zero privileges, DAT-18), so the anon key " +
        "cannot substitute. Arms (A) and (B) above still ran, and arm (A) IS the discriminator -- the " +
        "engine change is fully graded without credentials. Canonical invocation: STANDARDS.md " +
        "Section 2 rule 5.",
    );
    return;
  }

  // Every migration this platform has ever applied, by the same RPC the kickoff measured with.
  const migrations = await restRows(base, key, "rpc/migrations_in_range", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(WHOLE_LEDGER),
  });
  assert.ok(migrations.length > 200,
    `migrations_in_range must return the whole ledger, got ${migrations.length} -- a short read would ` +
    "manufacture orphans out of migrations that are simply outside the range");

  // Task 1 (a): the re-landed migration is there, exactly once.
  const landed = migrations.filter((m) => String(m?.name) === ORPHAN_NAME);
  assert.strictEqual(landed.length, 1,
    `exactly ONE schema_migrations row must be named '${ORPHAN_NAME}', got ${landed.length}`);

  // Task 1 (b): the whole-ledger orphan count, computed exactly as ledgerOrphansIn() does.
  const downs = await restRows(base, key,
    "runner_migration_downs?select=up_name,classification,captured_at,captured_by_cycle&limit=10000");
  assert.ok(downs.length > 0, "runner_migration_downs must hold rows, or this arm grades nothing");
  const whole = ledgerOrphansIn(downs, migrations);
  assert.strictEqual(whole.known, true, "the live ledger read is a supplied answer");
  assert.deepStrictEqual(whole.orphans, [],
    `the ledger must carry NO orphan (it carried exactly one, '${ORPHAN_NAME}', before Task 1). ` +
    `Orphans now: ${JSON.stringify(whole.orphans)}`);

  // CONTROL WITH TEETH on the live read: the SAME function over the SAME migration list must still
  // find an orphan for a name no migration carries, or the assertion above would pass for a
  // ledgerOrphansIn() that can no longer detect one at all.
  const control = ledgerOrphansIn([...downs, { up_name: "zzz_no_such_migration_agt184" }], migrations);
  assert.deepStrictEqual(control.orphans, ["zzz_no_such_migration_agt184"],
    "the live control must still detect an orphan, or the clean result above proves nothing");

  // The refusal row itself: `refused` is the rollback class, so a red range holding this ship is
  // card-only by schemaPlanFor() too -- the two gates agree rather than one covering for the other.
  const ledgerRows = downs.filter((d) => String(d?.up_name) === ORPHAN_NAME);
  assert.strictEqual(ledgerRows.length, 1,
    `exactly one runner_migration_downs row must be named '${ORPHAN_NAME}', got ${ledgerRows.length}`);
  assert.strictEqual(ledgerRows[0].classification, DOWN_CLASSIFICATIONS.REFUSED,
    `its capture class must be '${DOWN_CLASSIFICATIONS.REFUSED}' -- an in-place ALTER has no derivable down`);

  // Task 1 (c): the `on conflict do nothing` insert was a true no-op. One row, not two.
  const routes = await restRows(base, key,
    "finding_routes?select=source,finding_type,precedence,project_slug&source=eq.researcher");
  assert.strictEqual(routes.length, 1,
    `public.finding_routes must still hold exactly ONE source='researcher' row, got ${routes.length} -- ` +
    "the migration's point was the watermark, never the data");
  assert.strictEqual(routes[0].finding_type, "*", "and it is the AGT-138 row it always was");
  assert.strictEqual(routes[0].project_slug, null,
    "project_slug stays NULL so the Development Manager picks the project (AGT-138)");

  // The reader this ship added, against the real cycle that captured the refusal.
  const read = await readDownsCapturedBy(base, key, ORPHAN_CYCLE);
  assert.ok(!read.error, `readDownsCapturedBy must succeed live: ${read.error}`);
  assert.ok(read.downs.some((d) => String(d?.up_name) === ORPHAN_NAME),
    `the downs captured by cycle ${ORPHAN_CYCLE} must include '${ORPHAN_NAME}'`);

  // AND THE DISCRIMINATOR STILL HAS TEETH LIVE: those same real downs, graded against an EMPTY range
  // list, are orphans -- which is the exact shape decide() cards on.
  const scoped = ledgerOrphansIn(read.downs, []);
  assert.ok(scoped.orphans.includes(ORPHAN_NAME),
    "a real captured down graded against a range that landed nothing IS an orphan -- that is the " +
    "live shape of the middle fixture in arm (A)");

  // No cycle id is not an error and not unknown: an unattributable red reaches ACTIONS.NONE long
  // before this fact is consulted.
  assert.deepStrictEqual(await readDownsCapturedBy(base, key, null), { downs: [] },
    "no cycle id returns an empty answer, never an error");

  console.log(
    `[AGT-184] live: ${migrations.length} migration(s), ${downs.length} ledger down(s), ` +
      `${whole.orphans.length} orphan(s) (was 1: ${ORPHAN_NAME}); '${ORPHAN_NAME}' at version ` +
      `${landed[0].version} class ${ledgerRows[0].classification}; finding_routes holds ` +
      `${routes.length} source='researcher' row(s); cycle ${ORPHAN_CYCLE} captured ` +
      `${read.downs.length} down(s)`
  );
}

async function run() {
  theFixtureIsTheCodeOnlyFallThrough();
  theTripleDiscriminatesOnTheAbsentMigration();
  unsuppliedIsUnknownAndEmptyIsNot();
  theGuardSitsBeforeTheCodeOnlyReturn();
  await theLedgerCarriesNoOrphan();
}

selfRun(import.meta.url, run);
export default run;
