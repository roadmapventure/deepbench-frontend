// DeepBench v7.0.1095 | tests/regression/agt-523-measured-model-params.test.mjs | AGT-523 -- the two model-parameter lists in shared/models.js follow the live /v1/messages measurement of 2026-11-20.
//
// WHAT THIS PINS. (a) Both predicates, per measured id, against the measured answer -- forced
// tool_choice and temperature are two independent API facts, so each is asserted on its own.
// (b) The one call path every executor turn takes, buildCallBody(), reads those predicates: a model
// that rejects forced tool_choice goes `auto`, a model that rejects temperature has NO temperature key
// (not a null one), and a control that accepts both keeps `tool` and the 0 it was given -- the
// control is what stops a "drop temperature everywhere" change from passing. (c) The Skill-row
// tripwire shares the same list: a row on a newly-restricted family is a violation, the same row on
// the control is not, and the checker's default prefixes ARE the shared constant (one home).
//
// Offline: no credentials, no network.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";
import { supportsForcedToolChoice, supportsTemperature, NO_TEMPERATURE_PREFIXES } from "../../shared/models.js";
import { buildCallBody } from "../../api/prompt/request-receivable.js";
import { findTemperatureViolations } from "../../scripts/check-skill-model-params.js";

// [id, forced tool_choice accepted, temperature accepted] -- the measurement, verbatim.
const MEASURED = [
  ["claude-haiku-4-5-20251001", true, true],
  ["claude-sonnet-4-6", true, true],
  ["claude-sonnet-5", true, false],
  ["claude-opus-5", true, false],
  ["claude-haiku-5-5", true, false],
  ["claude-sonnet-5-5", false, false],
  ["claude-opus-5-5", false, false],
  ["claude-fable-5-1", false, false],
];

function body(model) {
  return buildCallBody({
    format_contract: {
      output_type: "json",
      skill_profile_slug: "agt-523-intent",
      schema: { type: "object", required: ["ok"], properties: { ok: { type: "boolean" } } },
    },
    systemPrompt: "s",
    model,
    max_tokens: 100,
    temperature: 0,
  });
}

export default async function run() {
  // ---- (a) both predicates, per measured id --------------------------------------------------
  for (const [id, forced, temp] of MEASURED) {
    assert.strictEqual(supportsForcedToolChoice(id), forced,
      `${id} forced tool_choice: measured ${forced ? "ACCEPTED" : "REJECTED"}, got ${supportsForcedToolChoice(id)}`);
    assert.strictEqual(supportsTemperature(id), temp,
      `${id} temperature: measured ${temp ? "ACCEPTED" : "REJECTED"}, got ${supportsTemperature(id)}`);
  }
  console.log(`  (a) ${MEASURED.length} measured ids, both predicates match the live measurement -- PASS`);

  // ---- (b) the call body every executor turn sends ---------------------------------------------
  const s55 = body("claude-sonnet-5-5");
  assert.strictEqual(s55.tool_choice?.type, "auto", "claude-sonnet-5-5 rejects forced tool_choice -> auto");
  assert.ok(!("temperature" in s55), "claude-sonnet-5-5 rejects temperature -> no temperature key");

  for (const id of ["claude-sonnet-5", "claude-opus-5"]) {
    const b = body(id);
    assert.strictEqual(b.tool_choice?.type, "tool", `${id} accepts forced tool_choice -> tool`);
    assert.ok(!("temperature" in b), `${id} rejects temperature -> no temperature key`);
  }

  const control = body("claude-sonnet-4-6");
  assert.strictEqual(control.tool_choice?.type, "tool", "control claude-sonnet-4-6 keeps forced tool");
  assert.strictEqual(control.temperature, 0, "control claude-sonnet-4-6 keeps the temperature 0 it was given");
  console.log("  (b) buildCallBody: sonnet-5-5 auto/no temp, sonnet-5 + opus-5 tool/no temp, sonnet-4-6 tool/0 -- PASS");

  // ---- (c) the Skill-row tripwire reads the same list ------------------------------------------
  const opusRow = { id: "1", slug: "a", llm_model: "claude-opus-5", temperature: 0 };
  const controlRow = { id: "1", slug: "a", llm_model: "claude-sonnet-4-6", temperature: 0 };
  assert.strictEqual(findTemperatureViolations({ rows: [opusRow] }).length, 1,
    "a claude-opus-5 row storing temperature 0 is one violation");
  assert.deepStrictEqual(findTemperatureViolations({ rows: [controlRow] }), [],
    "the same row on claude-sonnet-4-6 is clean");
  const R = [opusRow, controlRow];
  assert.deepStrictEqual(
    findTemperatureViolations({ rows: R }),
    findTemperatureViolations({ rows: R, prefixes: NO_TEMPERATURE_PREFIXES }),
    "the checker's default prefixes are shared/models.js NO_TEMPERATURE_PREFIXES -- one home");
  console.log("  (c) findTemperatureViolations: opus-5@0 fires, sonnet-4-6@0 quiet, default == shared list -- PASS");
}

selfRun(import.meta.url, run);
