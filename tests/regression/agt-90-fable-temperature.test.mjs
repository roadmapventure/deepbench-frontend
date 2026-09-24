// DeepBench v7.0.568 | tests/regression/agt-90-fable-temperature.test.mjs | AGT-90 -- the guard on
// scripts/check-skill-model-params.js: a Skill row must never store a call parameter the model
// family it names REJECTS.
//
// WHAT THIS PINS, AND THE SHAPE A LAZIER GUARD WOULD PASS VACUOUSLY. The obvious test runs the
// checker and asserts exit 0. That is worthless twice over: it needs live credentials the suite
// does not always carry, and it passes identically on a checker that matches NOTHING -- which is
// the failure mode of a data tripwire and SES-199's rubber stamp exactly (a check that exit(0)'d on
// every path). A tripwire has to be shown to FIRE before its silence means anything, so the
// assertions come in pairs: the matcher catches each planted shape AND stays quiet on the clean
// one, with only ONE field differing between the two.
//
// IT IMPORTS THE REAL FUNCTION AND NEVER RE-IMPLEMENTS IT (SES-45). findTemperatureViolations()
// comes from the shipped script; the forbidden-prefix list comes from shared/models.js. Nothing
// below writes the restricted family's id as a literal string -- the fixtures are BUILT from
// NO_TEMPERATURE_PREFIXES, so the day a second family is added to that constant these cases follow
// it instead of quietly continuing to test a family nobody is worried about any more. Clause (0)
// is what stops that derivation from going vacuous: it pins that the constant is non-empty and
// that its entries really are prefixes of a model id, so a constant emptied by accident fails
// LOUDLY here rather than making every fixture "clean".
//
// temperature = 0 IS THE CASE, NOT AN EDGE OF IT. All 39 live rows carried exactly 0, so a matcher
// written with a falsy test (`if (!row.temperature)`) would have reported a clean board over the
// entire defect. Case (c1) is that value and no other.
//
// THE NEGATIVE CONTROL IS AN UNRESTRICTED FAMILY CARRYING THE SAME VALUE (c3). Without it this
// file still passes if the check had been written to flag EVERY stored temperature -- which would
// condemn the 29 rows (haiku 12, sonnet-4-6 3, opus-5 14) whose temperatures are correct and whose
// survival is AGT-90's own second QA assertion.
//
// DECLARED NOT RUN without credentials: part (d), the live read. It is declared through notRun()
// rather than skipped silently, because an invisible gap is indistinguishable from coverage
// (SES-180).

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import { findTemperatureViolations, TABLE, SELECT } from "../../scripts/check-skill-model-params.js";
import { NO_TEMPERATURE_PREFIXES, supportsTemperature } from "../../shared/models.js";

const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

async function rows(query) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${query}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

export default async function run() {
  // ---- (0) THE DERIVATION IS NON-VACUOUS -------------------------------------------------------
  // Every fixture below is built from this constant. If it were empty, or its entries were not
  // prefixes, the fixtures would stop representing the restricted family and all three cases would
  // "pass" on a check that does nothing.

  assert.ok(
    Array.isArray(NO_TEMPERATURE_PREFIXES) && NO_TEMPERATURE_PREFIXES.length > 0,
    "shared/models.js NO_TEMPERATURE_PREFIXES must be a non-empty array -- it is the one home for " +
      "the families that reject `temperature`, and an empty list makes every row look clean"
  );

  const RESTRICTED = `${NO_TEMPERATURE_PREFIXES[0]}5-1`;
  const UNRESTRICTED = "claude-opus-5";

  assert.strictEqual(
    supportsTemperature(RESTRICTED), false,
    `the fixture model id ${RESTRICTED} must be one the shipped predicate calls restricted -- if it ` +
      "is not, these fixtures are testing a family nobody forbade"
  );
  assert.strictEqual(
    supportsTemperature(UNRESTRICTED), true,
    `${UNRESTRICTED} must be UNrestricted -- it is the negative control, and a control the predicate ` +
      "also forbids controls nothing"
  );

  assert.throws(
    () => findTemperatureViolations({ rows: [], prefixes: [] }),
    /forbidden-prefix list is empty/i,
    "an empty prefix list must THROW, never return a clean board -- a silent pass wearing a green tick"
  );
  assert.throws(
    () => findTemperatureViolations({ rows: null }),
    /must be an array/i,
    "a read that did not happen must THROW, never be reported as zero violations"
  );

  // ---- (c) THE THREE CASES, pure and offline ---------------------------------------------------
  // Same row, three states. Only the field named in each case differs from the one above it, which
  // is what makes the pass/fail difference attributable.

  const c1 = findTemperatureViolations({
    rows: [{ id: "11111111-1111-4111-8111-111111111111", slug: "gv-builder-behavior", llm_model: RESTRICTED, temperature: 0 }],
  });
  assert.strictEqual(c1.length, 1,
    `a ${RESTRICTED} row storing temperature = 0 must be ONE violation -- 0 is a stored value, not an ` +
    "absence, and it is the exact value all 39 live rows carried");
  assert.strictEqual(c1[0].slug, "gv-builder-behavior",
    "the violation must NAME the offending row's slug -- a count with no slug is not actionable");
  assert.deepStrictEqual(
    { llm_model: c1[0].llm_model, temperature: c1[0].temperature },
    { llm_model: RESTRICTED, temperature: 0 },
    "the violation must carry the model and the stored value it is complaining about"
  );

  const c2 = findTemperatureViolations({
    rows: [{ id: "11111111-1111-4111-8111-111111111111", slug: "gv-builder-behavior", llm_model: RESTRICTED, temperature: null }],
  });
  assert.deepStrictEqual(c2, [],
    "the SAME row with temperature NULL must be clean -- this is the state AGT-90 wrote, and a check " +
    "that still flagged it would be red on a fixed board forever");

  const c3 = findTemperatureViolations({
    rows: [{ id: "22222222-2222-4222-8222-222222222222", slug: "bob-data-analysis", llm_model: UNRESTRICTED, temperature: 0 }],
  });
  assert.deepStrictEqual(c3, [],
    `a ${UNRESTRICTED} row at temperature 0 must NOT be a violation -- the 29 non-restricted ` +
    "temperatures (haiku 12, sonnet-4-6 3, opus-5 14) are correct, and flagging them is the " +
    "over-reach AGT-90's own QA guards against");

  // A mixed board, so the matcher is shown to SEPARATE them rather than to have got two single-row
  // fixtures right by luck.
  const mixed = findTemperatureViolations({
    rows: [
      { id: "a", slug: "zz-late", llm_model: RESTRICTED, temperature: 0 },
      { id: "b", slug: "aa-early", llm_model: RESTRICTED, temperature: 0.7 },
      { id: "c", slug: "mm-clean", llm_model: RESTRICTED, temperature: null },
      { id: "d", slug: "nn-other", llm_model: UNRESTRICTED, temperature: 0 },
      { id: "e", slug: "oo-nomodel", llm_model: null, temperature: 0 },
    ],
  });
  assert.deepStrictEqual(
    mixed.map(v => v.slug),
    ["aa-early", "zz-late"],
    "on a mixed board exactly the two restricted-family rows carrying a temperature are reported, " +
      "sorted by slug -- the NULL one, the unrestricted one and the row naming no model are not"
  );

  console.log(`  (c) findTemperatureViolations: fires on ${RESTRICTED}@0, quiet on the same row NULL ` +
    `and on ${UNRESTRICTED}@0 -- PASS`);

  if (!hasCreds()) {
    notRun("(d) the live skill_profiles read -- zero stored violations on the board", CRED_HINT);
    return;
  }

  // ---- (d) LIVE: the board the tripwire actually guards -----------------------------------------
  // The read is the checker's OWN projection, so this grades the same rows the CLI grades.

  const live = await rows(`${TABLE}?select=${SELECT}&limit=5000`);
  assert.ok(live.length > 0,
    `the live ${TABLE} read returned no rows -- a check over an empty read is a vacuous pass`);

  const violations = findTemperatureViolations({ rows: live });
  assert.deepStrictEqual(violations, [],
    `${violations.length} live ${TABLE} row(s) store a temperature their model family rejects: ` +
    `${violations.map(v => `${v.slug}=${v.temperature}`).join(", ")}`);

  // The over-reach control, live: the rows whose temperatures are CORRECT must still be there. A
  // WHERE-less fix reads identically to the real one on the assertion above and fails this one.
  const kept = live.filter(r => r.temperature != null);
  assert.ok(kept.length > 0,
    "no row anywhere stores a temperature any more -- AGT-90 removed the restricted family's values, " +
    "not everybody's; a board with zero stored temperatures means the fix over-reached");
  assert.ok(
    kept.every(r => supportsTemperature(r.llm_model)),
    "every surviving stored temperature must belong to a family that accepts one"
  );

  console.log(`  (d) LIVE: ${live.length} ${TABLE} row(s), 0 violations, ${kept.length} correct ` +
    `temperature(s) on accepting families survive -- PASS`);
}

selfRun(import.meta.url, run);
