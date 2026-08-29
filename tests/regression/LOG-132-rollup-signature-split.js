// DeepBench v7.0.311 | tests/regression/LOG-132-rollup-signature-split.js | LOG-132
//
// Guards the two rollup views' escape from `anon`'s 3 s `statement_timeout` -- and, with equal
// weight, the reason a later editor must not undo it.
//
// THE DEFECT. `log_row_signature(l ai_activity_log)` is a STABLE SQL function whose
// `sub_calls_chained` and `integration_followed` branches each carry an
// `EXISTS (SELECT 1 FROM public.ai_activity_log ...)` sublink. Postgres's `inline_function()`
// refuses a body containing subplans, so the function stays OPAQUE and
// `ai_pattern_classification_rollup`'s `sig` CTE paid one invocation per log row. Measured live
// 2026-08-29T14:5xZ before a line changed: 2,871.986 ms warm, 1,879.275 ms of it in that Seq Scan
// over 34,840 rows, against `anon`'s 3 s cap (read from `pg_roles.rolconfig`; `authenticated` is
// 8 s). The AI Audit mount issues a CONCURRENT PAIR, so By Pattern renders honest-empty -- the
// LOG-102 behaviour -- on anon loads. Migration `log132_rollup_signature_split` precomputes the two
// span-derived facts once per query (a DISTINCT-parent LEFT JOIN and one WindowAgg) and writes the
// inlinable config half directly in the views: 1,312.851 ms, 96% of the cap down to 43%.
//
// WHAT THIS FILE CANNOT REACH, DECLARED RATHER THAN IMPLIED (SES-180 (b), the SES-219 precedent).
// The views' bodies live in the DATABASE, not this repo, and this suite reaches Supabase only over
// PostgREST -- which cannot run `EXPLAIN`, cannot read `pg_get_viewdef`, and cannot run the old and
// new signature expressions side by side. So the two strongest assertions a human can make about
// this change are NOT available here and are declared not-run rather than faked:
//   * the plan-shape proof (the shipped view's plan carries no `log_row_signature` node; the
//     retired form's does), and
//   * the row-level equivalence gate.
// Both RAN LIVE at the ship and their results are on the ship card and in
// `docs/LOG-131-migration-log.md`: 34,840 rows compared, 0 mismatches, 2,372 distinct signatures
// both ways; the rollup's own output identical on all 13 patterns across `call_count`, `cost_sum`
// and a sorted `log_ids` fingerprint; `reclassification_count` 19,838 both ways.
//
// WHAT IT DOES REACH, and why each arm is worth its runtime:
//   Part A  the RECORD, credential-free. A later editor reads `docs/LOG-131-migration-log.md`
//           before touching these views; if the forbidden edit and the measured numbers rot out of
//           it, the next cycle re-introduces the defect and calls it a tidy-up. Every predicate is
//           paired with a negative control -- the same text with the one thing that should matter
//           removed -- so "would this still pass if the change did nothing?" answers no.
//   Part B  the BEHAVIOUR, over PostgREST. Both views must return their real shape, and the
//           classification rollup must come back inside a margin that sits STRICTLY BETWEEN the
//           retired form's own measured time and the shipped one. That is the negative control:
//           2,872 ms warm (retired) > 2,000 ms (the bar) > 1,313 ms (shipped). A regression that
//           put the per-row function call back loses on the same live data.
//   Part C  the ANON arm -- the browser's actual surface, where the 3 s cap is enforced server
//           side. Declares itself not-run without an anon key, and RESTORES whatever it sets
//           (SES-215: a placeholder anon key leaking between in-process tests turned a NOT RUN
//           into a false FAIL and cost the suite four days of red).
//
// THE TIMING ARM IS HONEST ABOUT BEING A TIMING ARM. A loaded runner can miss the bar on a change
// that is perfectly sound, so its failure message says so and names the deterministic evidence to
// check instead. It is kept because the ticket's bar IS a wall-clock one -- "at/over the line"
// against a `statement_timeout` -- and a guard that refused to measure time could not fail on the
// only thing that actually breaks for John.
//
// THE EDIT THIS FILE EXISTS TO CATCH, beyond a straight revert: folding the two precomputed facts
// back INSIDE `log_row_signature()` for "one home". The function is called PER ROW from
// `ai_call_patterns` with a single row in hand; a set-level precompute there scans the whole log to
// answer a point lookup -- this defect inverted. `keepsTheFunctionForPointLookups` pins the
// boundary: a FUNCTION answers about one row, these VIEWS answer about all of them.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const LOGFILE = path.join("docs", "LOG-131-migration-log.md");
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), "utf8");

const MIGRATION = "log132_rollup_signature_split";

// The bar, and the two measurements it sits between. Named constants rather than literals buried in
// an assertion, because the whole discriminating power of Part B is that BAR falls strictly inside
// this interval -- and `barDiscriminates()` below asserts exactly that, so a later edit cannot
// quietly widen the bar past the retired form's own number and leave a guard that cannot fail.
export const RETIRED_MS = 2871.986;   // measured 2026-08-29, warm, pre-migration
export const SHIPPED_MS = 1312.851;   // measured 2026-08-29, warm, post-migration
export const BAR_MS = 2000;
export const ANON_CAP_MS = 3000;      // pg_roles.rolconfig: anon statement_timeout=3s

// --- Part A: the record ------------------------------------------------------------------------
//
// Exported so a later session touching these views can reuse the predicates rather than re-deriving
// them from prose.

// The migration is named. Without it nobody reading the evidence file can find the change.
export function namesTheMigration(md) {
  return md.includes(MIGRATION);
}

// THE ROOT CAUSE, not merely the symptom. "It got slow" invites an index; the reason an index does
// nothing here is that the function is opaque to the inliner, and that sentence is what stops the
// next cycle solving the wrong problem.
export function statesTheInliningRootCause(md) {
  return md.includes("inline_function()")
    && md.includes("EXISTS")
    && md.includes("subplan");
}

// THE CLAUSE THIS FILE EXISTS FOR. The forbidden edit stays named, in the file an editor opens.
export function keepsTheForbiddenEdit(md) {
  return md.includes("a FUNCTION answers about one row")
    && md.includes("scan the whole log to answer a point lookup");
}

// The point-lookup view deliberately still calls the whole function -- both because that is the
// right shape for one row and because it keeps a LIVE caller, so the two forms cannot diverge
// unobserved. An edit that "finishes the job" by rewriting `ai_call_patterns` too loses that.
export function keepsTheFunctionForPointLookups(md) {
  return md.includes("ai_call_patterns")
    && md.includes("keeps calling the whole function");
}

// Both measurements survive, as numbers. A record that says "faster" and drops the figures cannot
// tell a later reader whether a regression has happened.
export function carriesBothMeasurements(md) {
  return md.includes("2,871.986") && md.includes("1,312.851");
}

// The equivalence gate's own result is in the record, because it is the only evidence that the
// rewrite is EXACT -- and Part B below cannot re-run it.
export function carriesTheEquivalenceGate(md) {
  return md.includes("34,840") && md.includes("0 mismatches") && md.includes("2,372");
}

// The bar must be able to fail. If a later edit raises BAR_MS past the retired form's own measured
// time, Part B becomes a test that the old code would also have passed -- a vacuous green.
// (SES-158's vacuity meta-check, applied to a numeric threshold rather than a text clause.)
export function barDiscriminates(bar = BAR_MS, retired = RETIRED_MS, shipped = SHIPPED_MS) {
  return shipped < bar && bar < retired;
}

async function run() {
  const md = read(LOGFILE);

  // A1..A6 -- each with its negative control: the same predicate against text with the one
  // load-bearing token removed must FAIL, so no clause can pass on a file that merely mentions
  // LOG-132.
  const strip = (s, needle) => s.split(needle).join("<<removed>>");

  assert.ok(namesTheMigration(md),
    `${LOGFILE} never names the migration ${MIGRATION}. The evidence file is how a later cycle ` +
    `finds this change; unnamed, the views look like they were always this way.`);
  assert.ok(!namesTheMigration(strip(md, MIGRATION)), "negative control: namesTheMigration passed without the migration name");

  assert.ok(statesTheInliningRootCause(md),
    `${LOGFILE} does not state the inlining root cause. Without "inline_function() refuses a body ` +
    `containing subplans" the next reader treats this as a missing index and adds one, which ` +
    `changes nothing -- the cost is the opaque per-row call, not the scan.`);
  assert.ok(!statesTheInliningRootCause(strip(md, "inline_function()")),
    "negative control: statesTheInliningRootCause passed without inline_function()");

  assert.ok(keepsTheForbiddenEdit(md),
    `${LOGFILE} no longer names the forbidden edit. Moving the precomputed span facts back inside ` +
    `log_row_signature() is this defect inverted -- a set-level scan answering a point lookup -- ` +
    `and it is the tidy-up a later cycle will reach for.`);
  assert.ok(!keepsTheForbiddenEdit(strip(md, "a FUNCTION answers about one row")),
    "negative control: keepsTheForbiddenEdit passed without the boundary sentence");

  assert.ok(keepsTheFunctionForPointLookups(md),
    `${LOGFILE} no longer records that ai_call_patterns keeps calling log_row_signature(). That is ` +
    `not an oversight to clean up: it is the deliberate live caller that keeps the function and the ` +
    `views from diverging unobserved.`);
  assert.ok(!keepsTheFunctionForPointLookups(strip(md, "keeps calling the whole function")),
    "negative control: keepsTheFunctionForPointLookups passed without the clause");

  assert.ok(carriesBothMeasurements(md),
    `${LOGFILE} has lost one of the two measurements (2,871.986 ms before / 1,312.851 ms after). ` +
    `A record that says "faster" without figures cannot tell a later reader whether it regressed.`);
  assert.ok(!carriesBothMeasurements(strip(md, "2,871.986")),
    "negative control: carriesBothMeasurements passed without the before figure");

  assert.ok(carriesTheEquivalenceGate(md),
    `${LOGFILE} has lost the equivalence gate's result (34,840 rows, 0 mismatches, 2,372 distinct ` +
    `signatures). It is the ONLY evidence the rewrite is exact -- this suite cannot re-run it over ` +
    `PostgREST -- so losing it from the record loses it entirely.`);
  assert.ok(!carriesTheEquivalenceGate(strip(md, "0 mismatches")),
    "negative control: carriesTheEquivalenceGate passed without the mismatch count");

  assert.ok(barDiscriminates(),
    `Part B's bar (${BAR_MS} ms) does not sit strictly between the shipped (${SHIPPED_MS} ms) and ` +
    `retired (${RETIRED_MS} ms) measurements, so it can no longer fail on the old behaviour. ` +
    `A threshold the pre-change code would also have passed is a vacuous green.`);
  assert.ok(!barDiscriminates(RETIRED_MS + 1),
    "negative control: barDiscriminates accepted a bar above the retired form's own time");

  notRun("the plan-shape proof and the row-level equivalence gate",
    "this suite reaches Supabase only over PostgREST, which can run neither EXPLAIN nor " +
    "pg_get_viewdef and cannot evaluate the old and new signature expressions side by side. Both " +
    "ran live at the ship: 34,840 rows compared / 0 mismatches / 2,372 distinct signatures both " +
    "ways, the rollup's 13 rows identical on call_count, cost_sum and a sorted log_ids " +
    "fingerprint, reclassification_count 19,838 both ways, and the shipped plan carrying no " +
    "log_row_signature node. Evidence: docs/LOG-131-migration-log.md and the LOG-132 ship card.");

  // --- Part B: the behaviour, over PostgREST ----------------------------------------------------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live rollup read and its timing bar",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env. Part A above DID run -- the record is " +
      "guarded -- but nothing here has touched the shipped views. Run with " +
      "`node --env-file-if-exists=.env.local tests/regression/LOG-132-rollup-signature-split.js`.");
    return;
  }

  const rest = async (p) => {
    const r = await fetch(`${url}/rest/v1/${p}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!r.ok) throw new Error(`PostgREST ${r.status} on ${p}: ${(await r.text()).slice(0, 300)}`);
    return r.json();
  };

  // B1 -- shape. A rewrite that dropped a column or a grouping key would still be "fast".
  await rest("ai_pattern_classification_rollup?select=*&limit=1");   // warm-up, deliberately untimed
  const t0 = Date.now();
  const rollup = await rest("ai_pattern_classification_rollup?select=*");
  const elapsed = Date.now() - t0;

  assert.ok(rollup.length > 0,
    "ai_pattern_classification_rollup returned no rows. That is the By Pattern panel dark, which " +
    "is the symptom LOG-132 exists to remove -- not a pass.");
  for (const k of ["pattern_slug", "pattern_name", "pattern_description", "call_count", "cost_sum", "log_ids"]) {
    assert.ok(k in rollup[0],
      `ai_pattern_classification_rollup lost the ${k} column. CREATE OR REPLACE VIEW cannot drop a ` +
      `column, so this means the view was DROPped and rebuilt -- which also silently drops its grants.`);
  }
  assert.ok(Array.isArray(rollup[0].log_ids) && rollup[0].log_ids.length > 0,
    "log_ids came back empty or non-array. The AI Audit drills into a pattern through those ids.");

  // B2 -- the timing bar, with the retired form as the control.
  assert.ok(elapsed < BAR_MS,
    `the classification rollup took ${elapsed} ms, over the ${BAR_MS} ms bar. That bar sits ` +
    `between the shipped measurement (${SHIPPED_MS} ms) and the retired one (${RETIRED_MS} ms), so ` +
    `the most likely cause is the per-row log_row_signature() call being back in the view's sig ` +
    `CTE -- check EXPLAIN for a log_row_signature node, which the shipped plan does not have. ` +
    `A heavily loaded runner can also miss this bar on a sound change; the plan shape is the ` +
    `deterministic check, this one is the wall clock John actually feels.`);

  // B3 -- the sibling view. It shares the same sig CTE, so a fix applied to one and not the other
  //       leaves half the mount slow -- exactly how this defect shipped in the first place.
  const rc = await rest("ai_pattern_reclassification_count?select=*");
  assert.ok(rc.length === 1 && Number.isInteger(rc[0].reclassification_count),
    "ai_pattern_reclassification_count did not return one integer row. It shares the sig CTE with " +
    "the rollup; a migration that repaired only one view leaves half the AI Audit mount over the cap.");

  // --- Part C: the anon arm, where the 3 s cap is real ------------------------------------------
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    notRun("the anon read against the live 3 s statement_timeout",
      `no SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY in env. Part B above measured the same view ` +
      `through the service key, which carries NO statement_timeout -- so the ${ANON_CAP_MS} ms cap ` +
      `that actually darkens John's By Pattern panel was never exercised here.`);
    return;
  }

  const anonStart = Date.now();
  const ar = await fetch(`${url}/rest/v1/ai_pattern_classification_rollup?select=pattern_slug,call_count`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  const anonElapsed = Date.now() - anonStart;
  const anonBody = await ar.text();
  assert.ok(ar.ok,
    `anon read of ai_pattern_classification_rollup returned ${ar.status} after ${anonElapsed} ms: ` +
    `${anonBody.slice(0, 300)}. A 57014 here is the ${ANON_CAP_MS} ms statement_timeout firing -- ` +
    `the exact failure LOG-132 fixed, back again.`);
  assert.ok(JSON.parse(anonBody).length > 0,
    "the anon read succeeded but returned no rows -- By Pattern renders honest-empty, which is the " +
    "LOG-102 behaviour this ticket exists to stop.");
}

export default run;
selfRun(import.meta.url, run);
