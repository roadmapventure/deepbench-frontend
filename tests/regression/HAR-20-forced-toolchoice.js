// DeepBench v6.3.208 | tests/regression/HAR-20-forced-toolchoice.js | HAR-20
// FEATURE: HAR-20 — Category N (pure), persisted per SES-009a. Imports the real
// implementation, never a reimplementation.
//
// Locks in the S-SES-29 root-cause fix (docs/kickoffs/v6.3.201-HAR-20-forced-toolchoice-parallel-fix.md):
//   (a) buildCallBody()'s FORCED tool_choice branch (`{ type: 'tool', name: schemaTool.name }`,
//       used by every schema-only intent -- no harness tools, no web search) now also carries
//       disable_parallel_tool_use:true, same as the pre-existing AUTO branch. Without it,
//       claude-haiku-4-5 at temperature 0 could emit 2+ parallel schema-tool calls, and
//       parseModelTurn()'s `content?.find` reads only the first block -- a spurious
//       missing-required-fields throw on a genuinely complete response.
//   (b) buildParseRetryCorrection() attaches a tool_result to EVERY tool_use id in the failed
//       turn, not just the first -- Anthropic 400s the whole retry (invalid_request_error:
//       "tool_use ids were found without tool_result blocks immediately after") whenever any id
//       is left orphaned, which is exactly what (a)'s failure class always produced under the old
//       first-only construction.
//
// Both call sites carry the same forced tool_choice shape -- this file exercises buildCallBody()
// directly (the guardrails inline call at line ~733 is not separately exported; asserting the one
// shared branch construction covers both, per the kickoff's Task 1 scope).

import assert from "assert";
import { buildCallBody, buildParseRetryCorrection } from "../../api/prompt/request-receivable.js";
import { selfRun } from "./_lib/self-run.js";

const CHECKS = [
  {
    name: "forced branch (schema tool, no harness tools, no web search) sets disable_parallel_tool_use + type:'tool'",
    run() {
      const body = buildCallBody({
        format_contract: { output_type: "json", skill_profile_slug: "qg-content-context-intent", schema: { type: "object", properties: {}, required: [] } },
        systemPrompt: "sys",
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        temperature: 0,
        canRequestHelp: false,
        enableWebSearch: false,
      });
      assert.strictEqual(body.tool_choice.type, "tool", "forced branch must keep type:'tool'");
      assert.strictEqual(body.tool_choice.name, "qg-content-context-intent", "forced branch must still name the schema tool");
      assert.strictEqual(body.tool_choice.disable_parallel_tool_use, true, "forced branch must now carry disable_parallel_tool_use:true");
    },
  },
  {
    name: "auto branch (canRequestHelp:true) stays byte-identical -- type:'auto', flag true",
    run() {
      const body = buildCallBody({
        format_contract: { output_type: "json", skill_profile_slug: "hyp-hypothesis-test-display-intent", schema: { type: "object", properties: {}, required: [] } },
        systemPrompt: "sys",
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        temperature: 0,
        canRequestHelp: true,
        enableWebSearch: false,
      });
      assert.strictEqual(body.tool_choice.type, "auto", "auto branch must stay type:'auto'");
      assert.strictEqual(body.tool_choice.disable_parallel_tool_use, true, "auto branch's pre-existing flag (AI-35) must be unchanged");
      assert.strictEqual(body.tool_choice.name, undefined, "auto branch carries no forced tool name");
    },
  },
  {
    name: "no-tools branch has no tool_choice at all",
    run() {
      const body = buildCallBody({
        format_contract: { output_type: "text" },
        systemPrompt: "sys",
        model: "claude-haiku-4-5-20251001",
        max_tokens: 128,
        temperature: 0,
      });
      assert.strictEqual(Object.prototype.hasOwnProperty.call(body, "tool_choice"), false, "no-tools branch must carry no tool_choice key");
      assert.strictEqual(Object.prototype.hasOwnProperty.call(body, "tools"), false, "no-tools branch must carry no tools key");
    },
  },
  {
    name: "buildParseRetryCorrection with 3 tool_use blocks -> 3 matching tool_result blocks, is_error:true, first carries correction text",
    run() {
      const llmContent = [
        { type: "tool_use", id: "toolu_1", name: "qg-content-context-intent", input: { a: 1 } },
        { type: "tool_use", id: "toolu_2", name: "qg-content-context-intent", input: { a: 2 } },
        { type: "tool_use", id: "toolu_3", name: "qg-content-context-intent", input: { a: 3 } },
      ];
      const correctionText = "Your response did not conform to the required schema: missing final_answer.";
      const msg = buildParseRetryCorrection(llmContent, correctionText);
      assert.strictEqual(msg.role, "user");
      assert.strictEqual(Array.isArray(msg.content), true, "3 tool_use blocks must produce an array content (tool_result blocks)");
      assert.strictEqual(msg.content.length, 3, "must produce exactly one tool_result per tool_use id");
      assert.deepStrictEqual(msg.content.map(b => b.tool_use_id), ["toolu_1", "toolu_2", "toolu_3"], "tool_result ids must match tool_use ids in order");
      for (const block of msg.content) {
        assert.strictEqual(block.type, "tool_result");
        assert.strictEqual(block.is_error, true, "every tool_result must be is_error:true");
      }
      assert.strictEqual(msg.content[0].content, correctionText, "the first tool_result carries the real correction text");
      assert.notStrictEqual(msg.content[1].content, correctionText, "subsequent tool_results must not repeat the full correction text");
      assert.notStrictEqual(msg.content[2].content, correctionText, "subsequent tool_results must not repeat the full correction text");
    },
  },
  {
    name: "buildParseRetryCorrection with 0 tool_use blocks -> unchanged plain-text fallback",
    run() {
      const correctionText = "No text block in response";
      assert.deepStrictEqual(
        buildParseRetryCorrection([{ type: "text", text: "hello" }], correctionText),
        { role: "user", content: correctionText },
        "no tool_use blocks must fall back to the pre-existing plain-text message"
      );
      assert.deepStrictEqual(
        buildParseRetryCorrection(undefined, correctionText),
        { role: "user", content: correctionText },
        "undefined llmContent must also fall back to the plain-text message, never throw"
      );
    },
  },
];

async function runChecks({ verbose } = {}) {
  const failures = [];
  for (const check of CHECKS) {
    try {
      check.run();
      if (verbose) console.log(`  [PASS] ${check.name}`);
    } catch (e) {
      failures.push(`${check.name} -- ${e.message}`);
      if (verbose) console.log(`  [FAIL] ${check.name} -- ${e.message}`);
    }
  }
  return failures;
}

// run-all.js contract: export a default async function that resolves on pass, throws on fail.
export default async function run() {
  const failures = await runChecks({ verbose: false });
  if (failures.length > 0) {
    throw new Error(`${failures.length}/${CHECKS.length} checks failed: ${failures.join(" | ")}`);
  }
}

// Direct-run contract: SES-28's shared guard replaces this file's hand-rolled entry-point
// check. The verbose per-check output is kept -- the wrapper prints one PASS/FAIL line per
// assertion group, then selfRun adds the standard `  [PASS|FAIL] <file>` line and exit code.
selfRun(import.meta.url, async () => {
  const failures = await runChecks({ verbose: true });
  console.log(`\nHAR-20-forced-toolchoice: ${CHECKS.length - failures.length}/${CHECKS.length} passed`);
  if (failures.length > 0) {
    throw new Error(`${failures.length}/${CHECKS.length} checks failed: ${failures.join(" | ")}`);
  }
});
