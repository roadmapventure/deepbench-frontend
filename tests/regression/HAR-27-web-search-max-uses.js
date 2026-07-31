// DeepBench v7.0.14 | tests/regression/HAR-27-web-search-max-uses.js | HAR-27
// FEATURE: HAR-27 — Category N (pure), persisted per SES-009a. Imports the real
// implementation, never a reimplementation.
//
// Locks in the HAR-27 mechanism (docs/kickoffs/v7.0.14-HAR-27-web-search-max-uses.md):
//   (a) buildCallBody()'s optional webSearchMaxUses param emits `max_uses` on the web_search
//       tool definition — Anthropic's server-side per-turn search cap — and ONLY there.
//   (b) Every caller that doesn't pass the param produces a byte-identical request body
//       (no max_uses key anywhere) — the no-regression guarantee for the other
//       enable_web_search Skill Profile (pattern-vocabulary-review) and everything else.
//   (c) The param is inert when enableWebSearch is false (the tool entry it decorates
//       doesn't exist).
//   (d) db-assembly.js's trait gate accepts web_search_max_uses only as a positive integer
//       (0, negatives, floats, strings, booleans dropped — an invalid value can never reach
//       the Anthropic request body) and carries it on the returned llm object.
//   (e) The llm merge happens AFTER the profile loop, so a later-iterated Format Skill
//       Profile's wholesale llm rebuild (llm_provider/llm_model set) can't drop the cap.

import assert from "assert";
import { buildCallBody } from "../../api/prompt/request-receivable.js";
import { buildSections } from "../../api/prompt/db-assembly.js";
import { selfRun } from "./_lib/self-run.js";

const TEXT_CONTRACT = { output_type: "text" };

function intentProfile(traits) {
  return {
    skill_type_slug: "intent",
    slug: "ws-test-intent",
    name: "Test Intent",
    objective: "Find exactly 3 stories.",
    traits,
  };
}

function runBuildSections(profiles) {
  return buildSections(profiles, null, [], null, "ws-test-intent");
}

const CHECKS = [
  {
    name: "webSearchMaxUses:3 with enableWebSearch:true -> web_search tool carries max_uses:3",
    run() {
      const body = buildCallBody({
        format_contract: TEXT_CONTRACT,
        systemPrompt: "sys",
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        enableWebSearch: true,
        webSearchMaxUses: 3,
      });
      const wsTool = (body.tools || []).find(t => t.type === "web_search_20250305");
      assert.deepStrictEqual(
        wsTool,
        { type: "web_search_20250305", name: "web_search", max_uses: 3 },
        "web_search tool entry must carry max_uses:3 and nothing else new"
      );
    },
  },
  {
    name: "no webSearchMaxUses -> body byte-identical to the pre-change shape (no max_uses key anywhere)",
    run() {
      const body = buildCallBody({
        format_contract: TEXT_CONTRACT,
        systemPrompt: "sys",
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        enableWebSearch: true,
      });
      const expectedPreChange = {
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        tool_choice: { type: "auto", disable_parallel_tool_use: true },
        messages: [{ role: "user", content: "sys" }],
      };
      assert.strictEqual(
        JSON.stringify(body),
        JSON.stringify(expectedPreChange),
        "omitting webSearchMaxUses must serialize byte-identical to the pre-HAR-27 body"
      );
      assert.strictEqual(JSON.stringify(body).includes("max_uses"), false, "no max_uses key may appear anywhere");
    },
  },
  {
    name: "webSearchMaxUses with enableWebSearch:false -> param inert, no web-search tool at all",
    run() {
      const body = buildCallBody({
        format_contract: { output_type: "json", skill_profile_slug: "ws-test-intent", schema: { type: "object", properties: {}, required: [] } },
        systemPrompt: "sys",
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        enableWebSearch: false,
        webSearchMaxUses: 5,
      });
      assert.strictEqual(
        (body.tools || []).some(t => t.type === "web_search_20250305"),
        false,
        "no web-search tool may exist when enableWebSearch is false"
      );
      assert.strictEqual(JSON.stringify(body).includes("max_uses"), false, "no max_uses key may appear anywhere");
    },
  },
  {
    name: "trait gate: web_search_max_uses:3 -> llm.web_search_max_uses === 3, enableWebSearch still true",
    run() {
      const { llm, enableWebSearch } = runBuildSections([
        intentProfile({ enable_web_search: true, web_search_max_uses: 3 }),
      ]);
      assert.strictEqual(enableWebSearch, true, "enable_web_search read must be unaffected");
      assert.strictEqual(llm.web_search_max_uses, 3, "valid positive integer must land on llm");
    },
  },
  {
    name: "trait gate: invalid values (0, -1, 1.5, '3', true) all dropped -- key absent from llm",
    run() {
      for (const bad of [0, -1, 1.5, "3", true]) {
        const { llm } = runBuildSections([
          intentProfile({ enable_web_search: true, web_search_max_uses: bad }),
        ]);
        assert.strictEqual(
          Object.prototype.hasOwnProperty.call(llm, "web_search_max_uses"),
          false,
          `invalid trait value ${JSON.stringify(bad)} must be dropped entirely, never emitted`
        );
      }
    },
  },
  {
    name: "trait absent -> llm object carries no web_search_max_uses key (byte-identical for non-opted-in Skills)",
    run() {
      const { llm } = runBuildSections([intentProfile({ enable_web_search: true })]);
      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(llm, "web_search_max_uses"),
        false,
        "absent trait must leave the llm object without the key"
      );
    },
  },
  {
    name: "cap survives a later Format Skill Profile's wholesale llm rebuild (llm_model set)",
    run() {
      const { llm } = runBuildSections([
        intentProfile({ enable_web_search: true, web_search_max_uses: 3 }),
        {
          skill_type_slug: "format",
          slug: "fmt-test",
          name: "Test Format",
          llm_model: "claude-haiku-4-5-20251001",
          traits: { output_type: "json" },
        },
      ]);
      assert.strictEqual(llm.model, "claude-haiku-4-5-20251001", "Format Skill Profile's llm_model override must still win");
      assert.strictEqual(llm.web_search_max_uses, 3, "the cap must survive the Format branch's wholesale llm rebuild");
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

// Direct-run contract: SES-28's shared guard (selfRun) makes a direct `node <file>` run real.
selfRun(import.meta.url, async () => {
  const failures = await runChecks({ verbose: true });
  console.log(`\nHAR-27-web-search-max-uses: ${CHECKS.length - failures.length}/${CHECKS.length} passed`);
  if (failures.length > 0) {
    throw new Error(`${failures.length}/${CHECKS.length} checks failed: ${failures.join(" | ")}`);
  }
});
