// DeepBench v7.0.638 | tests/regression/agt-207-recapture-keeps-provenance.test.mjs | AGT-207
//
// FEATURE: AGT-207 -- a SECOND capture of the same migration name keeps the FIRST cycle's provenance.
//
// WHAT WAS BROKEN. `public.runner_migration_downs` carries `uq_runner_migration_downs_up UNIQUE
// (up_name)`, and `public.capture_migration_down(uuid, text, jsonb)` upserts onto it. Its
// `on conflict (up_name) do update set` ended with these two clauses:
//
//     captured_by_cycle = excluded.captured_by_cycle,
//     captured_at       = now()
//
// so the SECOND cycle to capture a down under a name already in the ledger silently took ownership of
// the row. The ledger then answers "cycle B captured this" for a down cycle A captured, and the
// original attribution survives nowhere in the table -- only in whatever `runner_before_images` row
// the capture happened to write on its way past. Nothing in the ledger is versioned: 77 rows, 77
// distinct names, and every reader keys `up_name=eq.` and takes `const [down] = …`, so the overwrite
// is lossy by construction rather than merely confusing.
//
// IT WAS NOT HYPOTHETICAL, and the loss is on the record. Row `f21ece8e-d63d-468d-a054-eaf1d441ada1`
// (`agt138_researcher_route`, class `refused`) was captured 2026-09-26 11:58:57.643738+00 by cycle
// `bd03a2e4-c22a-42c7-956b-2669f2c67600`. On 2026-09-27 04:11:29 cycle
// `d7790ea0-c34d-4de9-898c-2cac31d8f8f9` re-captured the same name while re-landing AGT-138's
// migration, and the row came back reading `captured_by_cycle d7790ea0…`, `captured_at 04:11:29` --
// `bd03a2e4…` erased from the table entirely. It survived only in before-image
// `2f12bb39-c6a3-427f-becf-d20c4bd9b250`.
//
// WHAT SHIPPED -- keep and preserve, the reversible designer decision (JOHN-0925-DESIGNER-DECIDES).
// Not REFUSE the second capture (that would have blocked the AGT-184 re-land that cured the ledger
// orphan) and not VERSION the row (that breaks every `const [down] =` reader, and before-images
// already hold every prior state). Migration `agt207_capture_keeps_first_provenance` (version
// 20260927072226) made exactly two edits to the live body, identity byte-identical at
// `(p_cycle_id uuid, p_up_name text, p_objects jsonb)`:
//   (a) the `v_prior` snapshot gained `'captured_by_cycle', p_cycle_id` -- so `prior_ddl` names the
//       cycle whose down is CURRENTLY stored, which is the fact the overwrite used to carry;
//   (b) the upsert's `do update set` DROPPED both clauses above and now ends
//       `classification = excluded.classification;`.
// PRESERVED on a recapture: `captured_by_cycle`, `captured_at` -- first capture, never overwritten.
// MOVES on a recapture: `down_sql`, `prior_ddl`, `classification` -- the CURRENT down, whose own
// cycle and timestamp `prior_ddl` now carries. Task 2 then repaired `f21ece8e` from its own
// before-image, before-image first (ARCHITECTURE.md §19v).
//
// FOUR ARMS, all of them READ-ONLY (pattern:76): every statement in this file is a GET. Nothing is
// inserted, patched, upserted or cleaned up -- `runner_migration_downs` is the rollback engine's
// ledger and a permanent regression test must not write to it (the SES-196 / SES-218 / SES-275
// refusal). All four are credential-gated together and DECLARED not-run without credentials
// (SES-180), never silently skipped: there is no pure half to run, because the subject of this ship
// is a Postgres function body and the live row it stopped overwriting.
//   * (A) WITNESS  -- the repaired row reads the FIRST cycle's provenance, with the recorded
//     pre-repair row as a control that must FAIL the same predicate.
//   * (B) REPAIR IMAGED (§19v) -- the overwrite's image and this cycle's repair image both present,
//     with the pre-repair image set as a control that must FAIL the same predicate.
//   * (C) CONTROL  -- one row per name still, so the fix did not turn the upsert into an insert.
//   * (D) NOT RUN  -- the function body and its overload count, declared with where they WERE
//     measured.
//
// DRY-RUN RESULT (STANDARDS.md Section 4, the SES-76 rule) -- and the deviation is named rather than
// dressed up. Arms (A) and (B) could NOT be executed against the pre-change database, because the
// change they grade is a schema+data change that landed (MCP `apply_migration` / `execute_sql`,
// orchestrator-only) before this file existed; there is no unchanged tree to point them at, and
// re-breaking the ledger to produce one is exactly the write this file refuses to make. So neither
// arm rests on a claim about a run nobody can repeat: each carries its own LIVE control over the
// RECORDED pre-change state -- before-image `0e4b7e58-7965-43da-a0a2-c5a018fb5725`, which this
// cycle's repair wrote precisely because §19v required it -- and asserts that the very predicate the
// arm passes with today FAILS against that recorded row, and fails for the documented reason
// (`captured_by_cycle d7790ea0…`, no `captured_by_cycle` key in `prior_ddl` at all). A control that
// changes nothing proves nothing (SES-158); these two change the one field each arm is about.
// Structurally: 0 empty slices and 0 vacuous assertions -- this file slices no source text.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied:
//   * The FUNCTION BODY and the overload count -- arm (D). PostgREST reaches neither `pg_proc` nor
//     `pg_get_functiondef` (SES-310), and a `DO` block is not openable from this suite.
//   * `readDownsCapturedBy(d7790ea0…)` NO LONGER lists `agt138_researcher_route`, because the row is
//     attributed to `bd03a2e4…` again. That is the designed consequence of the repair (orphans are
//     matched by NAME, never by cycle) and it turns arm (C) of
//     `tests/regression/agt-184-ledger-orphan.test.mjs` red -- that file pins the recapturing cycle
//     as the row's owner. AGT-207's caps name one repo file and it is not that one, so this ship
//     does not touch it; it is reported to the Verifier as a live finding, not patched here.
//   * Nothing here applies, re-applies or reverses a migration, and nothing re-runs the trailing `DO`
//     probe. Tasks 1 and 2 are the orchestrator's writes; this file reads their result back.

import assert from "assert";

import { selfRun, notRun } from "./_lib/self-run.js";

// The witness, named once. Every value below is the LIVE row's or the LIVE image's -- these are the
// expectations, and the row is read rather than reconstructed.
export const UP_NAME = "agt138_researcher_route";
export const WITNESS_ID = "f21ece8e-d63d-468d-a054-eaf1d441ada1";

// The cycle that captured the down FIRST. This is the value the overwrite destroyed and the value
// `captured_by_cycle` must now read.
export const FIRST_CYCLE = "bd03a2e4-c22a-42c7-956b-2669f2c67600";
// The cycle that RE-captured the same name. It owned the row before the repair; it now appears only
// inside `prior_ddl`, which is where edit (a) put it.
export const RECAPTURE_CYCLE = "d7790ea0-c34d-4de9-898c-2cac31d8f8f9";
// This ship's own cycle -- the author of the repair, and so of the repair's before-image.
export const THIS_CYCLE = "956c44a0-0350-43c8-9ce4-75ca833d2fe9";

// The image that preserved the original provenance through the overwrite. Arm (B) requires it to
// still be there: it is the only reason Task 2 could join the true values rather than type them.
export const OVERWRITE_IMAGE = "2f12bb39-c6a3-427f-becf-d20c4bd9b250";

// The first capture's instant. Asserted TWICE on purpose: as an instant (so a timezone rendering
// change cannot fail it) and as the raw microsecond text (because `Date` truncates to milliseconds,
// and an instant-only check would accept a value whose microseconds drifted).
export const FIRST_CAPTURED_AT_ISO = "2026-09-26T11:58:57.643738Z";
export const FIRST_CAPTURED_AT_MICROS = "11:58:57.643738";
export const CLASSIFICATION = "refused";

async function restRows(base, key, pathAndQuery) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error(`${pathAndQuery} returned a non-array payload`);
  return body;
}

function sameInstant(a, b) {
  const x = Date.parse(a);
  const y = Date.parse(b);
  return Number.isFinite(x) && Number.isFinite(y) && x === y;
}

// ---------------------------------------------------------------------------
// (A) WITNESS -- the predicate, factored out so the control runs through the SAME function rather
// than through a second hand-written copy of the check (SES-45: one implementation of the rule).
// ---------------------------------------------------------------------------

// Returns a list of the clauses that FAILED, so a control can be asserted to fail for its own
// documented reason rather than merely to fail.
export function firstProvenanceBreaches(row) {
  const bad = [];
  if (String(row?.captured_by_cycle) !== FIRST_CYCLE) bad.push("captured_by_cycle");
  if (!sameInstant(row?.captured_at, FIRST_CAPTURED_AT_ISO)) bad.push("captured_at");
  if (!String(row?.captured_at ?? "").includes(FIRST_CAPTURED_AT_MICROS)) bad.push("captured_at_micros");
  if (String(row?.classification) !== CLASSIFICATION) bad.push("classification");
  if (String(row?.prior_ddl?.captured_by_cycle) !== RECAPTURE_CYCLE) bad.push("prior_ddl.captured_by_cycle");
  return bad;
}

async function theWitnessCarriesTheFirstCyclesProvenance(base, key, priorImageRow) {
  const rows = await restRows(base, key,
    `runner_migration_downs?up_name=eq.${UP_NAME}` +
    "&select=id,captured_by_cycle,captured_at,classification,prior_ddl");

  assert.strictEqual(rows.length, 1,
    `exactly ONE runner_migration_downs row must be named '${UP_NAME}', got ${rows.length} -- more ` +
    "than one means the unique constraint or the upsert stopped collapsing recaptures onto one row");
  const [row] = rows;
  assert.strictEqual(row.id, WITNESS_ID,
    `and it must be the same row, ${WITNESS_ID} -- a NEW id means the repair deleted and re-inserted ` +
    "rather than updating in place, which every `const [down] =` reader would survive and every " +
    "before-image chain would not");

  assert.deepStrictEqual(firstProvenanceBreaches(row), [],
    "the repaired row must read the FIRST capture's provenance with the RECAPTURING cycle in " +
    `prior_ddl. Got captured_by_cycle=${row.captured_by_cycle}, captured_at=${row.captured_at}, ` +
    `classification=${row.classification}, ` +
    `prior_ddl.captured_by_cycle=${row.prior_ddl?.captured_by_cycle}`);

  // `prior_ddl` must still be the DOWN's own snapshot, not a provenance stub: edit (a) ADDED a key,
  // it did not replace the object. Without this, a repair that overwrote prior_ddl with
  // `{"captured_by_cycle": …}` would pass every clause above and destroy the captured DDL.
  assert.ok(row.prior_ddl && typeof row.prior_ddl === "object" && !Array.isArray(row.prior_ddl),
    "prior_ddl must still be a JSON object");
  for (const k of ["captured", "refusals", "captured_at", "rule"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(row.prior_ddl, k),
      `prior_ddl must still carry its own '${k}' key -- edit (a) adds a key to the snapshot, it does ` +
      "not replace the snapshot");
  }
  // And the two timestamps must DISAGREE, which is the whole point of the design: the row dates the
  // FIRST capture and prior_ddl dates the CURRENT down. If they matched, the row would be carrying
  // the recapture's clock again and the fix would have moved nothing.
  assert.ok(!sameInstant(row.captured_at, row.prior_ddl.captured_at),
    "row.captured_at (first capture) and prior_ddl.captured_at (the stored down) must be different " +
    `instants -- both read ${row.captured_at}, so the row is dated by the recapture after all`);
  assert.ok(Date.parse(row.captured_at) < Date.parse(row.prior_ddl.captured_at),
    "and the first capture must be the EARLIER of the two -- the preserved value is the first one, " +
    "never whichever happened to be smaller");

  // CONTROL WITH TEETH (SES-158), over the RECORDED pre-change row rather than a fabricated one: the
  // same predicate must FAIL on what this row held before the repair, and fail on exactly the two
  // clauses the repair addressed.
  const breaches = firstProvenanceBreaches(priorImageRow);
  assert.notDeepStrictEqual(breaches, [],
    "the pre-repair row recorded in this cycle's own before-image must FAIL the predicate above, or " +
    "the predicate cannot detect the overwrite it exists to detect");
  assert.deepStrictEqual(breaches.sort(),
    ["captured_at", "captured_at_micros", "captured_by_cycle", "prior_ddl.captured_by_cycle"],
    "and it must fail on precisely the clauses the overwrite moved -- `classification` was never " +
    `overwritten and must not appear. Got ${JSON.stringify(breaches)}`);
  assert.strictEqual(String(priorImageRow.captured_by_cycle), RECAPTURE_CYCLE,
    "the recorded pre-repair row must be the OVERWRITTEN state specifically: the recapturing cycle " +
    "owning the row");
  assert.ok(!Object.prototype.hasOwnProperty.call(priorImageRow.prior_ddl ?? {}, "captured_by_cycle"),
    "and its prior_ddl must carry NO captured_by_cycle key at all -- that key only exists in downs " +
    "captured after edit (a), so its absence dates this image to the pre-fix body");

  console.log(
    `[AGT-207] (A) ${UP_NAME} ${row.id}: captured_by_cycle ${row.captured_by_cycle} @ ` +
      `${row.captured_at} (${row.classification}); prior_ddl names ` +
      `${row.prior_ddl.captured_by_cycle} @ ${row.prior_ddl.captured_at}; pre-repair control failed ` +
      `${breaches.length} clause(s)`
  );
}

// ---------------------------------------------------------------------------
// (B) REPAIR IMAGED -- §19v: no image, no write. Both images must be present, and the pre-repair
// image set must fail the same check.
// ---------------------------------------------------------------------------

// Returns the repair image, or null. The predicate, so the control can run through it too.
export function repairImageIn(images) {
  return images.find((b) =>
    String(b?.cycle_id) === THIS_CYCLE &&
    b?.row_data &&
    String(b.row_data.captured_by_cycle) === RECAPTURE_CYCLE) ?? null;
}

async function theRepairIsImaged(base, key) {
  const images = await restRows(base, key,
    "runner_before_images?table_name=eq.runner_migration_downs" +
    `&pk_value=eq.${UP_NAME}&select=id,cycle_id,row_data`);

  assert.ok(images.length >= 3,
    `at least three before-images must exist for '${UP_NAME}' -- the first capture's, the ` +
    `overwrite's and this cycle's repair -- got ${images.length}`);

  // The image the repair READ FROM must still exist: it is the only surviving record of the original
  // provenance, and Task 2 joined its values rather than typing them.
  const overwrite = images.find((b) => String(b?.id) === OVERWRITE_IMAGE);
  assert.ok(overwrite, `before-image ${OVERWRITE_IMAGE} must still exist -- it is the only record ` +
    "the repair could read the original provenance out of");
  assert.strictEqual(String(overwrite.cycle_id), RECAPTURE_CYCLE,
    "and it must be attributed to the RECAPTURING cycle -- it is the image that cycle wrote on its " +
    "way past, which is why it holds the value that cycle was about to destroy");
  assert.strictEqual(String(overwrite.row_data?.captured_by_cycle), FIRST_CYCLE,
    `its row_data must hold the FIRST cycle, ${FIRST_CYCLE}`);
  assert.ok(sameInstant(overwrite.row_data?.captured_at, FIRST_CAPTURED_AT_ISO),
    `and the first capture's instant, ${FIRST_CAPTURED_AT_ISO} -- got ${overwrite.row_data?.captured_at}`);

  // The repair's OWN image (§19v): the write this ship made is reversible from the ledger.
  const repair = repairImageIn(images);
  assert.ok(repair, "this cycle's repair must have written its own before-image holding the " +
    `pre-repair row (cycle_id ${THIS_CYCLE}, row_data.captured_by_cycle ${RECAPTURE_CYCLE}) -- ` +
    "§19v: before-image first, no image no write");
  assert.notStrictEqual(String(repair.id), OVERWRITE_IMAGE,
    "and it must be its OWN row, not the image it read from");

  // CONTROL WITH TEETH: the image set as it stood BEFORE the repair -- every image except this
  // cycle's -- must LOSE the same check, or the assertion above would pass for any non-empty ledger.
  const preRepair = images.filter((b) => String(b?.cycle_id) !== THIS_CYCLE);
  assert.notStrictEqual(preRepair.length, images.length,
    "the control must actually remove something (SES-158) -- if no image is this cycle's, the arm " +
    "above cannot have passed honestly");
  assert.strictEqual(repairImageIn(preRepair), null,
    "the pre-repair image set must FAIL the same check -- otherwise this arm is not detecting the " +
    "repair's image, only the presence of images");

  console.log(
    `[AGT-207] (B) ${images.length} before-image(s) for ${UP_NAME}: overwrite ${OVERWRITE_IMAGE} ` +
      `(cycle ${overwrite.cycle_id}) holds ${overwrite.row_data.captured_by_cycle}; repair ` +
      `${repair.id} (cycle ${repair.cycle_id}) holds ${repair.row_data.captured_by_cycle}`
  );
  return repair.row_data;
}

// ---------------------------------------------------------------------------
// (C) CONTROL -- still one row per name. Edit (b) shortened the `do update set`; it must not have
// touched the `on conflict` target.
// ---------------------------------------------------------------------------

export function duplicateNamesIn(rows) {
  const seen = new Set();
  const dupes = new Set();
  for (const r of rows) {
    const n = String(r?.up_name ?? "");
    if (!n) continue;
    if (seen.has(n)) dupes.add(n);
    seen.add(n);
  }
  return { names: seen.size, dupes: [...dupes].sort() };
}

async function theLedgerStillHoldsOneRowPerName(base, key) {
  const rows = await restRows(base, key, "runner_migration_downs?select=up_name&limit=10000");
  assert.ok(rows.length > 0, "runner_migration_downs must hold rows, or this arm grades nothing");
  assert.ok(rows.length < 10000,
    `the read must not be truncated at its own limit (${rows.length}) -- a short read would hide a ` +
    "duplicate past the cut");

  const { names, dupes } = duplicateNamesIn(rows);
  assert.deepStrictEqual(dupes, [],
    `every up_name must still be unique: ${rows.length} row(s), ${names} distinct name(s), ` +
    `duplicates ${JSON.stringify(dupes)}. A duplicate means the upsert became an insert and every ` +
    "`const [down] =` reader is now picking one of two rows arbitrarily");
  assert.strictEqual(rows.length, names,
    `rows (${rows.length}) must equal distinct names (${names})`);

  // CONTROL WITH TEETH: the same helper over the same rows plus one duplicate must DETECT it.
  const control = duplicateNamesIn([...rows, { up_name: UP_NAME }]);
  assert.deepStrictEqual(control.dupes, [UP_NAME],
    "the control must still detect a duplicate, or the clean result above proves nothing");

  console.log(`[AGT-207] (C) ${rows.length} ledger row(s), ${names} distinct name(s), 0 duplicate(s)`);
}

// ---------------------------------------------------------------------------
// (D) NOT RUN -- declared, never silently skipped.
// ---------------------------------------------------------------------------

function declareTheCatalogArm() {
  notRun(
    "arm (D), the FUNCTION itself -- that public.capture_migration_down still resolves at exactly " +
      "ONE overload with identity (p_cycle_id uuid, p_up_name text, p_objects jsonb), that its " +
      "v_prior snapshot carries 'captured_by_cycle', p_cycle_id (edit a), that its " +
      "`on conflict (up_name) do update set` ends `classification = excluded.classification;` with " +
      "neither `captured_by_cycle = excluded.captured_by_cycle` nor `captured_at = now()` (edit b), " +
      "and the round-trip itself: a second capture under a different cycle leaving captured_by_cycle " +
      "at the FIRST cycle while down_sql and prior_ddl move",
    "pg_proc, pg_get_functiondef and a BEGIN/ROLLBACK fixture are all unreachable over PostgREST, " +
      "which is the only transport this suite has (SES-310's refusal, unchanged) -- and the " +
      "round-trip is a WRITE to the rollback engine's own ledger, which a permanent test must not " +
      "make (SES-196 / SES-218 / SES-275). MEASURED AT THIS SHIP INSTEAD, live over the MCP, by " +
      "migration agt207_capture_keeps_first_provenance's OWN trailing DO block, in the SAME " +
      "transaction that wrote the function, so any failure aborted the migration rather than " +
      "reporting success: the two edits were applied PROGRAMMATICALLY to pg_get_functiondef's " +
      "output (not transcribed), each replacement asserted to match EXACTLY ONCE and raising with " +
      "the actual count otherwise; then a throwaway name 'agt207_probe_recapture' was captured " +
      "under 956c44a0-0350-43c8-9ce4-75ca833d2fe9 with one non-existent function object and " +
      "re-captured under d7790ea0-c34d-4de9-898c-2cac31d8f8f9 with two, and the row read " +
      "captured_by_cycle = 956c44a0… (the FIRST cycle, preserved), " +
      "prior_ddl->>'captured_by_cycle' = d7790ea0… (the recapture, from edit a) and a down_sql " +
      "changed to two `drop function` lines -- so a body that refused the second call, and a " +
      "one-sided fix, both fail; plus pg_proc count of capture_migration_down in public = 1. The " +
      "whole probe was rolled back by RAISE 'AGT207_UNDO'. RE-READ INDEPENDENTLY AFTER THE " +
      "MIGRATION (2026-09-27, v7.0.638): overloads 1, identity unchanged, edit (a) present, both " +
      "edit (b) clauses absent, schema_migrations version 20260927072226, and ZERO residue -- 0 " +
      "runner_migration_downs rows named agt207_probe_recapture and 0 pg_proc entries matching " +
      "agt207%. Arms (A)-(C) above grade the live result of the fix and the repair it required.",
  );
}

async function run() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun(
      "EVERY arm of AGT-207 -- the repaired witness row's four provenance values (A), both " +
        "before-images including this cycle's repair image (B), and one-row-per-name across the " +
        "whole ledger (C)",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. runner_migration_downs and " +
        "runner_before_images are service_role-only (anon and authenticated hold zero privileges on " +
        "either, DAT-18), so the anon key cannot substitute, and there is no pure half to fall back " +
        "on: the subject of this ship is a Postgres function body and the live ledger row it stopped " +
        "overwriting, neither of which exists in this repo. Canonical invocation: STANDARDS.md " +
        "Section 2 rule 5.",
    );
    declareTheCatalogArm();
    return;
  }

  // (B) runs FIRST because arm (A)'s control is the pre-repair row it returns -- the recorded
  // pre-change state, which is the only honest control available for a change that has already
  // landed (see the DRY-RUN note in this file's header).
  const priorImageRow = await theRepairIsImaged(base, key);
  await theWitnessCarriesTheFirstCyclesProvenance(base, key, priorImageRow);
  await theLedgerStillHoldsOneRowPerName(base, key);
  declareTheCatalogArm();
}

selfRun(import.meta.url, run);
export default run;
