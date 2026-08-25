// DeepBench v7.0.258 | tests/regression/LOG-77-2-output-schema-forced.js | LOG-77 item 2
//
// Guards `call_facts.output_schema_forced` -- the constrained-decoding capture, item 2 of LOG-77's
// signature roadmap and the one fact §19l names as genuinely missing (ARCHITECTURE.md:1813-1814).
//
// IT IMPORTS THE SHIPPED FUNCTIONS, never a recreation of them (SES-45). buildCallBody() and
// buildCallFacts() are both exported from api/prompt/request-receivable.js and are called here
// directly, so a change to either that breaks the capture fails this test rather than passing a
// second implementation that agrees with itself.
//
// THE ASSERTION THAT CARRIES THE TICKET, and the reason `traits.schema` cannot replace this fact:
// a schema is present on BOTH the forced and the auto call shapes. What distinguishes constrained
// decoding is that the model was given no choice -- `tool_choice: { type: 'tool' }`. The moment a
// harness tool (can_request_help / delegate_to_agent) or web search joins the call, buildCallBody()
// switches to `{ type: 'auto' }` with the identical schema tool still in `tools`. So the negative
// arm below is not decoration: it is the whole discrimination. A build that stamped the flag from
// schema-presence would pass the positive arm and fail that one.
//
// DISCRIMINATION -- would this pass if the change did nothing? No. With `output_schema_forced`
// never written, `forced-call-carries-the-fact` fails on the first assertion. And a build that
// wrote the key unconditionally fails `auto-choice-omits-the-fact` and `text-output-omits-the-fact`.
//
// OMITTED, NEVER FALSE: absent means "not forced / unknowable", the LOG-49 fact-2 posture. The
// tests assert the key is ABSENT (`in`), not that it is `false` -- writing `false` would be a
// different contract and would change what an unmatched criteria means.

import assert from "assert";
import { buildCallBody, buildCallFacts } from "../../api/prompt/request-receivable.js";
import { selfRun } from "./_lib/self-run.js";

const SCHEMA_CONTRACT = {
  output_type: "json",
  skill_profile_slug: "test-intent-format",
  schema: { type: "object", properties: { answer: { type: "string" } }, required: ["answer"] },
};

const TEXT_CONTRACT = { output_type: "text", skill_profile_slug: "test-text-format", schema: null };

const BASE = { systemPrompt: "sp", model: "claude-x", max_tokens: 100 };

// The shipped ground-truth expression, applied to the shipped body. Mirrors callModel()'s own line;
// what is under test is that buildCallBody() really does produce these three tool_choice shapes and
// that buildCallFacts() honours the resulting boolean.
const forcedFrom = (body) => body.tool_choice?.type === "tool";

export default async function run() {
  // --- arm 1: schema-only intent -> forced -------------------------------------------------------
  const forcedBody = buildCallBody({ ...BASE, format_contract: SCHEMA_CONTRACT });
  assert.strictEqual(forcedBody.tool_choice?.type, "tool",
    "LOG-77-2: a schema-only intent no longer forces the tool -- buildCallBody's forced branch moved, " +
    "so the fact this test guards is being read off the wrong expression");
  const forcedFacts = buildCallFacts({ outputSchemaForced: forcedFrom(forcedBody) });
  assert.strictEqual(forcedFacts.output_schema_forced, true,
    "LOG-77-2 'forced-call-carries-the-fact' FAILED: a forced-tool_choice call did not write " +
    "call_facts.output_schema_forced -- the capture is not reaching the log");

  // --- arm 2: same schema + a harness tool -> auto, key absent -----------------------------------
  // This is the negative control. Identical schema, identical contract; only canRequestHelp moves.
  const helpBody = buildCallBody({ ...BASE, format_contract: SCHEMA_CONTRACT, canRequestHelp: true });
  assert.strictEqual(helpBody.tool_choice?.type, "auto",
    "LOG-77-2: canRequestHelp no longer yields auto choice -- the negative control has lost its teeth");
  const helpFacts = buildCallFacts({ outputSchemaForced: forcedFrom(helpBody) });
  assert.ok(!("output_schema_forced" in helpFacts),
    "LOG-77-2 'auto-choice-omits-the-fact' FAILED: a can_request_help call carrying the SAME schema " +
    "was recorded as schema-forced -- the flag is being derived from schema-presence, not from the " +
    "body actually sent, which is exactly the wrong-by-construction build this fact exists to avoid");

  // --- arm 3: same schema + web search -> auto, key absent ---------------------------------------
  const wsBody = buildCallBody({ ...BASE, format_contract: SCHEMA_CONTRACT, enableWebSearch: true });
  assert.strictEqual(wsBody.tool_choice?.type, "auto",
    "LOG-77-2: enableWebSearch no longer yields auto choice");
  assert.ok(!("output_schema_forced" in buildCallFacts({ outputSchemaForced: forcedFrom(wsBody) })),
    "LOG-77-2 'web-search-omits-the-fact' FAILED: a web-search call with a schema was recorded as forced");

  // --- arm 4: text output -> no tools at all, no tool_choice, key absent -------------------------
  const textBody = buildCallBody({ ...BASE, format_contract: TEXT_CONTRACT });
  assert.strictEqual(textBody.tool_choice, undefined,
    "LOG-77-2: a text-output contract now emits a tool_choice -- arm 4 is no longer testing the " +
    "no-tools shape");
  assert.ok(!("output_schema_forced" in buildCallFacts({ outputSchemaForced: forcedFrom(textBody) })),
    "LOG-77-2 'text-output-omits-the-fact' FAILED: a text call was recorded as schema-forced");

  // --- arm 5: the omitted-never-false contract ---------------------------------------------------
  const defaulted = buildCallFacts({});
  assert.ok(!("output_schema_forced" in defaulted),
    "LOG-77-2 'default-omits-the-fact' FAILED: buildCallFacts() writes the key with no argument -- " +
    "absent must stay distinguishable from false (the LOG-49 fact-2 contract)");
  assert.strictEqual(buildCallFacts({ outputSchemaForced: false }).output_schema_forced, undefined,
    "LOG-77-2: an explicit false wrote the key -- omitted-never-false is broken, and an unmatched " +
    "criteria would then mean something different than it does for every other boolean fact here");

  // --- arm 6: the forced branch survives the HAR-02c split shape ---------------------------------
  // buildCallBody has TWO forced returns (split-present and fallback). A fix applied to only one of
  // them would leave every cached-prompt call unstamped, which is most live traffic.
  const splitBody = buildCallBody({
    ...BASE, format_contract: SCHEMA_CONTRACT,
    systemPromptStable: "stable half", systemPromptVolatile: "volatile half",
  });
  assert.strictEqual(splitBody.tool_choice?.type, "tool",
    "LOG-77-2 'split-branch-also-forces' FAILED: the HAR-02c split-present branch no longer forces " +
    "the tool, so prompt-cached schema calls would go unstamped");
  assert.strictEqual(
    buildCallFacts({ outputSchemaForced: forcedFrom(splitBody) }).output_schema_forced, true,
    "LOG-77-2: the split-present forced call did not carry the fact");

  // --- arm 7: the fact does not disturb its neighbours -------------------------------------------
  const mixed = buildCallFacts({ outputSchemaForced: true, guardrailsRan: true, emptySections: [] });
  assert.strictEqual(mixed.output_schema_forced, true, "LOG-77-2: the fact was lost alongside others");
  assert.deepStrictEqual(mixed.gated_subroutine_fired, ["guardrails"],
    "LOG-77-2: adding this fact disturbed gated_subroutine_fired");
  assert.deepStrictEqual(mixed.empty_sections, [],
    "LOG-77-2: adding this fact disturbed empty_sections -- [] is a finding, not an absent fact");

  return true;
}

selfRun(import.meta.url, run);
