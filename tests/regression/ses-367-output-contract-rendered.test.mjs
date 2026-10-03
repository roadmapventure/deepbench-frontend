// DeepBench v7.0.457 | tests/regression/ses-367-output-contract-rendered.test.mjs | SES-367 -- the
// session prompt path renders the ASSEMBLED output contract, so a sub-agent's answer carries
// `account`.
//
// THE DEFECT. `api/prompt/db-assembly.js`'s injectAccountField() (LAV-28b, §19s) adds the `account`
// receipt to every JSON contract's schema, and `api/prompt/request-receivable.js` buildCallBody()
// hands that schema to the model as the tool `input_schema` -- which is the ONLY place the contract
// was ever stated. A session sub-agent driven through `scripts/agent-prompt.js` has no tool, so the
// contract has to be TEXT or it is not present at all. Measured 2026-09-12 on `370b313`:
// `node scripts/agent-prompt.js --agent=prioritizer --capability=rank-backlog --intent=pz-rank-intent`
// rendered 15,876 characters naming `account` ZERO times and `ranked` ZERO times, while `--json`
// reported `format_contract.schema.required = ["ranked","account"]`. renderAssembly() iterated
// `assembly.sections` and nothing else, so the assembled contract never reached the prompt. All
// three drivers (rank-backlog.js, verifier.js, run-project.js) render through renderAssembly() and
// validate through validateAgentVerdict(), so the one seam covers all three.
//
// WHAT IS BEING PINNED, and the shape a lazier guard would pass vacuously. Asserting that the render
// merely CONTAINS the word "account" would pass against a hardcoded sentence naming the field --
// which is the drift this project exists to end (`.claude/rules/capabilities-are-data.md`: keyed on
// contract shape, never on a slug or a field name). So the discriminator here is a ROUND TRIP: the
// JSON block is parsed back out of the rendered prompt, deep-equalled against the assembled
// `format_contract.schema`, and then an answer is built FROM THE PARSED KEYS and run through the
// real validateAgentVerdict(). A prompt that names the wrong keys, omits one, or states a stale
// schema fails that round trip; a hardcoded sentence cannot pass it at all.
//
// EVERY IMPORT IS THE REAL SHIPPED FUNCTION (docs/STANDARDS.md Section 4, the SES-45 rule):
// renderAssembly + renderFormatContract from the script, injectAccountField + ACCOUNT_FIELD_SPEC
// from db-assembly.js, renderSection + assemblePhaseSplit from ai-enrichment.js, and
// validateAgentVerdict from verifier.js. Nothing about the contract is restated in this file.
//
// FIVE PARTS:
//   (a) The assembled contract reaches the prompt, inside the INTENT entry, and round-trips.
//   (b) CONTROLS -- the same answer minus `account` is REFUSED, and an html / `schema: null`
//       contract renders byte-for-byte what assemblePhaseSplit() over renderSection() renders, so
//       the new block cannot leak into a free-text capability.
//   (c) The LAV-26 shape -- a stored schema that already declares its own `account` renders exactly
//       one `"account": {` and carries the PLATFORM's wording, never the row's.
//   (d) Host selection -- intent, else format, else a stable block of its own.
//   (e) LIVE (Supabase credentials, else NOT RUN) -- the real script over the real rows.
//
// DRY-RUN against the unchanged tree (measured 2026-09-12 on `370b313`, before Task 1): part (a)
// failed -- the fixture render named 0 of the 2 required keys and validateAgentVerdict() refused the
// prompt-built answer with `missing required key "account"`; part (c) failed -- `"account": {`
// occurred 0 times, not 1; part (d) failed -- no contract block in either host; part (e) failed --
// 0 of 2 live required keys quoted. Part (b) passed, which is what a control is for. 4 of 5 parts
// red pre-change.

import assert from "assert";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import { renderAssembly, renderFormatContract } from "../../scripts/agent-prompt.js";
import { injectAccountField, ACCOUNT_FIELD_SPEC } from "../../api/prompt/db-assembly.js";
import { renderSection, assemblePhaseSplit } from "../../api/prompt/ai-enrichment.js";
import { validateAgentVerdict } from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROMPT_SCRIPT = path.join(ROOT, "scripts/agent-prompt.js");

// The live arm's subject -- the exact invocation the 2026-09-12 measurement was taken on.
const LIVE_AGENT = "prioritizer";
const LIVE_CAPABILITY = "rank-backlog";
const LIVE_INTENT = "pz-rank-intent";

const MARKER = "OUTPUT CONTRACT";
const SEPARATOR = "\n\n---\n\n";

const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

// ------------------------------------------------------------------------------------------------
// Fixtures. Deliberately NOT a copy of a stored row: the point is that the seam is keyed on the
// contract's SHAPE, so a synthetic shape must work exactly as a stored one does. No section's own
// content contains the strings "account" or "OUTPUT CONTRACT" -- part (b)'s absence assertions would
// otherwise be satisfied by the fixture itself and prove nothing.
// ------------------------------------------------------------------------------------------------
function sections({ intent = true, format = false } = {}) {
  const out = [
    { slug: "identity", label: "ROLE & IDENTITY", order: 1, prompt_phase: "stable", content: "You are the fixture agent." },
  ];
  if (intent) out.push({ slug: "intent", label: "INTENT", order: 2, prompt_phase: "stable", content: "Rank the open tickets." });
  if (format) out.push({ slug: "format", label: "FORMAT", order: 3, prompt_phase: "stable", content: "Return one object." });
  out.push({ slug: "voice", label: "VOICE", order: 4, prompt_phase: "volatile", content: "Speak plainly to the reader." });
  return out;
}

const BASE_SCHEMA = { type: "object", required: ["ranked"], properties: { ranked: { type: "array" } } };

function jsonContract(schema) {
  return injectAccountField({ output_type: "json", skill_profile_slug: "fx-intent", handler: "store", schema });
}

/** The entry a marker landed in: from its `=== LABEL ===` header to the next separator, or the end. */
function entryContaining(prompt, header) {
  const start = prompt.indexOf(header);
  if (start === -1) return null;
  const next = prompt.indexOf(SEPARATOR, start);
  return prompt.slice(start, next === -1 ? prompt.length : next);
}

/** The JSON block: first `{` after the marker, to the end of the entry it sits in. */
function contractJson(entry) {
  const marker = entry.indexOf(MARKER);
  assert.notStrictEqual(marker, -1, `no "${MARKER}" marker in the entry: ${JSON.stringify(entry.slice(0, 200))}`);
  const brace = entry.indexOf("{", marker);
  assert.notStrictEqual(brace, -1, "the contract block names no JSON object at all");
  return JSON.parse(entry.slice(brace));
}

/** An answer built from the PARSED required keys -- never from a hand-copied list. */
function answerFromParsed(schema) {
  const answer = {};
  for (const key of schema.required || []) {
    const type = (schema.properties && schema.properties[key] && schema.properties[key].type) || "string";
    answer[key] = type === "array" ? []
      : type === "object" ? {}
      : type === "integer" || type === "number" ? 1
      : type === "boolean" ? true
      : "Ranked two fixture tickets";
  }
  return answer;
}

// ------------------------------------------------------------------------------------------------
// (a) The assembled contract reaches the prompt, in the INTENT entry, and round-trips to a verdict
//     the real validator accepts.
// ------------------------------------------------------------------------------------------------
export function partA_rendered() {
  const results = [];
  const assembly = { sections: sections(), format_contract: jsonContract(BASE_SCHEMA) };
  const required = assembly.format_contract.schema.required;
  assert.deepStrictEqual(required, ["ranked", "account"],
    "the fixture did not assemble the two-key contract this part is about -- every assertion below would be vacuous");

  const { system_prompt, system_prompt_stable, system_prompt_volatile } = renderAssembly(assembly);

  // 1. Every required key the ASSEMBLY declares is quoted in the prompt. Driven off `required`, so a
  //    key added to the platform contract tomorrow is covered without editing this file.
  const missing = required.filter(k => !system_prompt.includes(`"${k}"`));
  assert.deepStrictEqual(missing, [],
    `the rendered prompt never quotes ${JSON.stringify(missing)}. The executor states the contract in the tool `
    + "definition; a session sub-agent has no tool, so an unstated key is a key the answer will not carry.");
  results.push("every-required-key-is-quoted");

  // 2. The platform's own wording, verbatim -- not a paraphrase written into the renderer.
  assert.ok(system_prompt.includes(ACCOUNT_FIELD_SPEC.description),
    "ACCOUNT_FIELD_SPEC.description is not in the prompt verbatim -- the rule and the field must travel together (LAV-28b)");
  results.push("account-spec-description-is-verbatim");

  // 3. Placement: the STABLE half (it is cacheable contract text, not per-turn text), inside the
  //    INTENT entry, before the separator that ends it. HAR-02b-patch3's intent->task adjacency.
  assert.ok(system_prompt_stable.includes(MARKER), "the contract landed in the volatile half -- it belongs in the cacheable prefix");
  assert.ok(!system_prompt_volatile.includes(MARKER), "the contract was rendered into the volatile half as well");
  const intentAt = system_prompt.indexOf("=== INTENT ===");
  const markerAt = system_prompt.indexOf(MARKER);
  const endOfIntent = system_prompt.indexOf(SEPARATOR, intentAt);
  assert.ok(intentAt !== -1 && endOfIntent !== -1, "the fixture INTENT entry is not followed by a separator -- the bound below would be vacuous");
  assert.ok(markerAt > intentAt && markerAt < endOfIntent,
    `the contract is not inside the INTENT entry (intent@${intentAt}, marker@${markerAt}, entry ends@${endOfIntent})`);
  results.push("contract-sits-inside-the-intent-entry");

  // 4. THE ROUND TRIP -- the discriminator. Parse the block back out and deep-equal the ASSEMBLED
  //    schema. A hardcoded sentence, a stale copy, or a partial restatement all fail here.
  const parsed = contractJson(entryContaining(system_prompt, "=== INTENT ==="));
  assert.deepStrictEqual(parsed, assembly.format_contract.schema,
    "the JSON in the prompt is not the schema the assembly carries -- the prompt states a contract the driver does not enforce");
  results.push("rendered-json-round-trips-to-the-assembled-schema");

  // 5. An answer built from the PARSED keys satisfies the REAL driver-side validator.
  const verdict = validateAgentVerdict(assembly.format_contract.schema, answerFromParsed(parsed));
  assert.strictEqual(verdict.ok, true,
    `an answer built from the prompt's own contract was refused: ${JSON.stringify(verdict.errors)}`);
  results.push("prompt-built-answer-passes-validateAgentVerdict");

  return results;
}

// ------------------------------------------------------------------------------------------------
// (b) CONTROLS. The refusal this ticket exists to prevent, and the over-reach it must not cause.
// ------------------------------------------------------------------------------------------------
export function partB_controls() {
  const results = [];
  const contract = jsonContract(BASE_SCHEMA);

  // The negative control on the validator: without `account` the driver refuses, by that exact
  // message. If this passed, part (a)'s green would say nothing about `account` at all.
  const short = answerFromParsed(contract.schema);
  delete short.account;
  const refused = validateAgentVerdict(contract.schema, short);
  assert.strictEqual(refused.ok, false, "an answer with no `account` was ACCEPTED -- the driver is not enforcing the contract this prompt states");
  assert.ok(refused.errors.includes('missing required key "account"'),
    `expected the driver's own refusal message, got ${JSON.stringify(refused.errors)}`);
  results.push("control-answer-without-account-is-refused");

  // The over-reach control: a free-text contract has no field to require (§19s's template degrade),
  // so its render must be BYTE-IDENTICAL to the pre-change path -- assemblePhaseSplit() over
  // renderSection(), the executor's own two functions, with nothing added.
  const htmlAssembly = { sections: sections(), format_contract: { output_type: "html", skill_profile_slug: null, schema: null, handler: "store" } };
  const rendered = renderAssembly(htmlAssembly);
  assert.ok(!rendered.system_prompt.includes(MARKER), "an html contract must render no OUTPUT CONTRACT block");
  assert.ok(!rendered.system_prompt.includes("account"), "an html contract must not name `account` -- there is no field to require");

  const expected = assemblePhaseSplit(htmlAssembly.sections.map(s => ({
    slug: s.slug, order: s.order, prompt_phase: s.prompt_phase, text: renderSection(s),
  })).filter(e => e.text));
  assert.strictEqual(rendered.system_prompt, expected.system_prompt, "the html render is no longer byte-identical to the executor's own render");
  assert.strictEqual(rendered.system_prompt_stable, expected.system_prompt_stable);
  assert.strictEqual(rendered.system_prompt_volatile, expected.system_prompt_volatile);
  results.push("control-html-render-is-byte-identical");

  // The same structural gate at the unit: renderFormatContract() returns null for every shape that
  // has no output fields, which is what keeps the branch above from ever being reached.
  for (const [label, c] of [
    ["html", { output_type: "html", schema: null }],
    ["json with null schema", { output_type: "json", schema: null }],
    ["json with an empty schema", { output_type: "json", schema: {} }],
    ["json with an array schema", { output_type: "json", schema: [] }],
    ["undefined", undefined],
  ]) {
    assert.strictEqual(renderFormatContract(c), null, `renderFormatContract() rendered a block for ${label}`);
  }
  results.push("control-renderFormatContract-is-null-where-there-is-no-shape");

  return results;
}

// ------------------------------------------------------------------------------------------------
// (c) The LAV-26 shape -- 4 stored Intents already declare their own `account`. The platform's
//     wording wins and the field is stated ONCE.
// ------------------------------------------------------------------------------------------------
export function partC_lav26() {
  const results = [];
  const ROW_WORDING = "ROW-AUTHORED-ACCOUNT-WORDING";
  const stored = {
    type: "object",
    required: ["ranked", "account"],
    properties: { ranked: { type: "array" }, account: { type: "string", description: ROW_WORDING } },
  };
  const assembly = { sections: sections(), format_contract: jsonContract(stored) };
  const { system_prompt } = renderAssembly(assembly);

  const occurrences = system_prompt.split('"account": {').length - 1;
  assert.strictEqual(occurrences, 1,
    `\`"account": {\` occurs ${occurrences} times in the rendered prompt; a contract stated twice is a contract the agent has to choose between`);
  results.push("account-is-declared-exactly-once");

  assert.ok(system_prompt.includes(ACCOUNT_FIELD_SPEC.description), "the row's wording survived -- the platform spec must win (injectAccountField's idempotence clause)");
  assert.ok(!system_prompt.includes(ROW_WORDING), "the row's own `account` description is still being rendered");
  assert.strictEqual(assembly.format_contract.schema.required.filter(k => k === "account").length, 1,
    "`account` was double-appended to required");
  results.push("platform-wording-wins-over-the-row");

  return results;
}

// ------------------------------------------------------------------------------------------------
// (d) Host selection. Intent, else format, else its own stable block -- a capability with no Intent
//     section still has to be told its contract.
// ------------------------------------------------------------------------------------------------
export function partD_hosts() {
  const results = [];

  const noIntent = renderAssembly({ sections: sections({ intent: false, format: true }), format_contract: jsonContract(BASE_SCHEMA) });
  const formatEntry = entryContaining(noIntent.system_prompt, "=== FORMAT ===");
  assert.ok(formatEntry && formatEntry.includes(MARKER), "with no INTENT section the contract must land in the FORMAT entry");
  assert.deepStrictEqual(contractJson(formatEntry), jsonContract(BASE_SCHEMA).schema,
    "the FORMAT-hosted block is not the assembled schema");
  results.push("host-falls-back-to-the-format-entry");

  const neither = renderAssembly({ sections: sections({ intent: false, format: false }), format_contract: jsonContract(BASE_SCHEMA) });
  assert.ok(neither.system_prompt_stable.includes(`=== ${MARKER} ===`),
    "with neither an INTENT nor a FORMAT section the contract must get its own stable block -- otherwise it is simply dropped");
  assert.ok(!neither.system_prompt_volatile.includes(MARKER), "the standalone block must be stable, not volatile");
  assert.deepStrictEqual(contractJson(entryContaining(neither.system_prompt, `=== ${MARKER} ===`)), jsonContract(BASE_SCHEMA).schema,
    "the standalone block is not the assembled schema");
  results.push("host-falls-back-to-its-own-stable-block");

  return results;
}

// ------------------------------------------------------------------------------------------------
// (e) LIVE -- the real script, the real rows, the invocation the defect was measured on.
// ------------------------------------------------------------------------------------------------
export function partE_live() {
  const results = [];
  if (!hasCreds()) {
    notRun(
      "SES-367 (e) the live script render quotes every required key of the stored contract",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and export them inline, per "
      + "docs/STANDARDS.md Section 2 rule 5. Measured when this shipped (2026-09-12, "
      + `--agent=${LIVE_AGENT} --capability=${LIVE_CAPABILITY} --intent=${LIVE_INTENT}): before the change the 15,876-character render `
      + 'quoted 0 of the 2 keys `--json` reported as required ("ranked","account"); after it, both.',
    );
    return results;
  }

  const args = [`--agent=${LIVE_AGENT}`, `--capability=${LIVE_CAPABILITY}`, `--intent=${LIVE_INTENT}`];
  const rendered = execFileSync(process.execPath, [PROMPT_SCRIPT, ...args], { encoding: "utf8", env: process.env });
  const assembly = JSON.parse(execFileSync(process.execPath, [PROMPT_SCRIPT, ...args, "--json"], { encoding: "utf8", env: process.env }));

  const required = (assembly.format_contract && assembly.format_contract.schema && assembly.format_contract.schema.required) || [];
  assert.ok(required.length > 0, `${LIVE_INTENT} assembled no required keys -- this arm would be vacuous`);
  assert.ok(required.includes("account"), "the live contract carries no `account` -- injectAccountField() is not running on the assembly path");

  const missing = required.filter(k => !rendered.includes(`"${k}"`));
  console.log(`  [SES-367] live required keys ${JSON.stringify(required)}; render is ${rendered.length} chars; unquoted: ${JSON.stringify(missing)}`);
  assert.deepStrictEqual(missing, [],
    `the live render never quotes ${JSON.stringify(missing)} -- the sub-agent is being asked for an answer whose shape it was never told`);
  results.push("live-render-quotes-every-required-key");

  // `--json` is the assembly object, not a prompt: the block must not appear there or a caller
  // reading the assembly gets the contract twice.
  assert.ok(!JSON.stringify(assembly).includes(MARKER), "--json must stay the raw assembly -- no rendered OUTPUT CONTRACT block in it");
  results.push("live-json-output-is-unchanged");

  return results;
}

async function run() {
  const results = [];
  results.push(...partA_rendered());
  results.push(...partB_controls());
  results.push(...partC_lav26());
  results.push(...partD_hosts());
  results.push(...partE_live());
  return results;
}

selfRun(import.meta.url, run);
export default run;
