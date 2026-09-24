#!/usr/bin/env node
// DeepBench v7.0.568 | scripts/check-skill-model-params.js | AGT-90 -- a Skill row must never store
// a call parameter the model family it names REJECTS.
//
// WHAT WENT WRONG, measured live 2026-09-24 rather than recalled: 39 of the 54 `skill_profiles`
// rows on the restricted family stored `temperature = 0`. Every one of them was a value the
// Anthropic API returns a hard 400 for on that family (`temperature` is deprecated for this
// model`, request_id req_011CetZC6P5V2rF1Jri25YJN, measured 2026-09-09 -- the second of the two
// facts SES-334 wrote into shared/models.js). The rows were INERT at call time only because
// buildCallBody() in api/prompt/request-receivable.js drops the field through
// supportsTemperature() on all four of its return branches. That is one predicate standing between
// stored data and a 400 on every governance call, which is a data-correctness defect wearing a
// working system as a disguise -- and exactly the class a tripwire exists for.
//
// THE PREFIX LIST IS READ, NEVER RESTATED, and that is the whole design of this file. `shared/models.js`
// owns NO_TEMPERATURE_PREFIXES; writing the family's prefix into this script as a literal would give
// one fact two homes, and the failure is silent in the direction that matters: the day a SECOND
// family is added to the constant because it rejects the same parameter, a literal-matching check
// keeps printing PASS over rows it can no longer see. SES-45 is the standing lesson ("a check that
// recreates the logic under test instead of importing it passes against the bug it guards"), and
// the kickoff names it: the constant has ONE entry today, so "what the constant forbids" and any
// hand-written pattern select the same rows -- coincidence, not construction. There is deliberately
// no model-id string anywhere below.
//
// WHY A REPO TRIPWIRE AND NOT A `CHECK` CONSTRAINT. A column constraint a non-running checker
// cannot bypass is the stronger form and it stays open: this cycle is unattended and ships no DDL
// (the container's permission classifier refused an unattended migration build the same night), so
// the guard lands where an unattended cycle can actually land it. AGT-90's harvest carries the
// trade-off; the CHECK form is an attended session's call, not this one's.
//
// WHAT IS AND IS NOT A VIOLATION, stated because the discriminating half is the half that gets
// dropped. A violation is: a `skill_profiles` row whose `llm_model` starts with one of the
// forbidden prefixes AND whose `temperature` is not NULL. `temperature = 0` IS a violation -- 0 is
// a stored value, not an absence, and it is the exact value all 39 live rows carried, so a check
// written with a falsy test (`if (!row.temperature)`) would pass on every single one of them. A row
// on ANY other family carrying a temperature is NOT a violation and must never be reported as one:
// haiku (12 rows), sonnet-4-6 (3) and opus-5 (14) all hold correct temperatures, and a check that
// cannot tell those apart flags 68 rows, gets ignored, and then gets deleted.
//
// THE HONEST BOUND: this reads `skill_profiles` and nothing else. A temperature reaching the API
// from somewhere other than a Skill row -- a hardcoded call site, a capability default -- is
// invisible here. That is not a hole to close with a cleverer query: buildCallBody()'s
// supportsTemperature() guard is what covers the call path, and ses-334-served-class-block.test.mjs
// part (c) grades it. This file grades the STORED data, which is the half nothing was grading.
//
// Usage:
//   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/check-skill-model-params.js [--json]
//
// Exit codes (the convention scripts/agent-row-gate.js sets, and for its reason):
//   0  no stored parameter contradicts the family that would receive it
//   1  a real violation -- at least one row stores a parameter its family rejects; ALSO the code
//      for "cannot run" (missing env var, REST failure, unparseable response). The two are never
//      confused in the PRINTED line, which always says which happened, but a check that could not
//      read the table must land on the side that is not a pass.
//
// Env (read from process.env only -- never hardcoded, never printed):
//   SUPABASE_URL           Project REST base.
//   SUPABASE_SERVICE_KEY   Service-role key. `skill_profiles` is not readable column-complete by
//                          the anon key (DAT-18).
//
// findTemperatureViolations() is pure and exported so
// tests/regression/agt-90-fable-temperature.test.mjs exercises every branch with no network --
// importing this module must never hit Supabase or touch disk. The CLI path runs only under the
// pathToFileURL entry-point guard at the bottom.

import { pathToFileURL } from "url";
import { NO_TEMPERATURE_PREFIXES } from "../shared/models.js";

export const TABLE = "skill_profiles";
export const SELECT = "id,slug,llm_model,temperature";

// ---------------------------------------------------------------------------
// The check -- pure
// ---------------------------------------------------------------------------
//
// `prefixes` DEFAULTS to the live constant rather than being required, so the CLI cannot be wired
// to a second, drifting copy of the list; the parameter exists for the test's synthetic matrices
// and for nothing else.
//
// The NOT-NULL test is written `!= null` on purpose: `temperature = 0` must be caught, and it is
// the only value the live defect ever carried.
export function findTemperatureViolations({ rows, prefixes = NO_TEMPERATURE_PREFIXES } = {}) {
  if (!Array.isArray(rows)) {
    throw new Error(
      "findTemperatureViolations({ rows }): `rows` must be an array of skill_profiles rows -- " +
        "refusing to report a clean board over a read that did not happen"
    );
  }
  if (!Array.isArray(prefixes) || !prefixes.length) {
    throw new Error(
      "findTemperatureViolations({ prefixes }): the forbidden-prefix list is empty. That would " +
        "make every row look clean, which is a silent pass wearing a green tick -- shared/models.js " +
        "NO_TEMPERATURE_PREFIXES is the one home for it."
    );
  }

  return rows
    .filter(r => {
      const model = typeof r?.llm_model === "string" ? r.llm_model : "";
      if (!model) return false; // no model named: this check has nothing to say about the row
      if (!prefixes.some(p => model.startsWith(p))) return false;
      return r.temperature != null;
    })
    .map(r => ({
      id: r.id,
      slug: r.slug,
      llm_model: r.llm_model,
      temperature: r.temperature,
    }))
    .sort((a, b) => String(a.slug).localeCompare(String(b.slug)) || String(a.id).localeCompare(String(b.id)));
}

// ---------------------------------------------------------------------------
// Supabase read (CLI path only)
// ---------------------------------------------------------------------------

async function restSelect(base, key, pathAndQuery) {
  const url = `${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`;
  let res;
  try {
    res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  } catch (e) {
    return { error: `could not reach the Supabase REST endpoint: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      /* best effort */
    }
    return { error: `Supabase REST returned HTTP ${res.status} ${res.statusText}: ${body}` };
  }
  let rows;
  try {
    rows = await res.json();
  } catch (e) {
    return { error: `Supabase REST returned unparseable JSON: ${e.message}` };
  }
  if (!Array.isArray(rows)) {
    return { error: `Supabase REST returned a non-array response for the ${TABLE} select` };
  }
  return { rows };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function main() {
  const asJson = process.argv.includes("--json");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    const missing = [!supabaseUrl && "SUPABASE_URL", !supabaseKey && "SUPABASE_SERVICE_KEY"]
      .filter(Boolean)
      .join(", ");
    return fail(
      `check-skill-model-params: missing required env var(s): ${missing}. Exiting 1 (cannot run) -- ` +
        `this is NOT a pass, no ${TABLE} row was ever read.`
    );
  }

  const read = await restSelect(supabaseUrl, supabaseKey, `${TABLE}?select=${SELECT}&limit=5000`);
  if (read.error) {
    return fail(`check-skill-model-params: ${read.error}\nExiting 1 (cannot run) -- this is NOT a pass.`);
  }

  const violations = findTemperatureViolations({ rows: read.rows });

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          table: TABLE,
          prefixes: NO_TEMPERATURE_PREFIXES,
          examined: read.rows.length,
          violations,
        },
        null,
        2
      )
    );
    process.exit(violations.length ? 1 : 0);
  }

  console.log(
    `check-skill-model-params: ${read.rows.length} ${TABLE} row(s) examined against ` +
      `shared/models.js NO_TEMPERATURE_PREFIXES (${NO_TEMPERATURE_PREFIXES.length} prefix(es), read ` +
      `from the constant -- never restated here)`
  );

  if (!violations.length) {
    console.log(
      "check-skill-model-params: PASS -- no Skill row stores a temperature its model family rejects."
    );
    process.exit(0);
  }

  console.log(`\ncheck-skill-model-params: FAIL -- ${violations.length} row(s) store a rejected parameter:`);
  for (const v of violations) {
    console.log(`  ${v.slug} (${v.id}) -- llm_model ${v.llm_model} carries temperature ${v.temperature}`);
  }
  console.log(
    "\nThe families in shared/models.js NO_TEMPERATURE_PREFIXES return a hard 400 for `temperature`\n" +
      "(SES-334, measured against the live API). Set temperature = NULL on these rows -- with a\n" +
      "runner_before_images row per row under one decision handle (§19v) -- and do NOT widen this\n" +
      "check or the constant to make it green."
  );
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
