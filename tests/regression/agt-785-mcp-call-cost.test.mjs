// DeepBench v7.0.1108 | tests/regression/agt-785-mcp-call-cost.test.mjs | AGT-785
//
// FEATURE: AGT-785 -- a keyed MCP `tools/call` result carries what the call cost, in MCP's own
// `_meta` slot, so an outside site (the Maricopa dashboards' AI page) can show a real per-search
// cost. Until this ticket the cost existed only in `ai_activity_log.cost_usd`.
//
// WHAT HAS TO STAY TRUE: (1) the figure reported is the figure lib/activity-log.js writes to the
// row -- one pricing site, never a second calculation; (2) `content`, `structuredContent` and
// `isError` are exactly what they were; (3) a call that made no model call reports NOTHING, never
// a zero; (4) a keyless caller's result is unchanged.
//
// FOUR ARMS, no network, no credentials:
//   (a) summarizeUsage() by value -- sum, per-row six-place rounding (the column is numeric(10,6)),
//       mixed models, an unpriced row -> cost null, no model row -> null.
//   (b) toToolResult() with and without a usage block -- the three existing fields deep-equal.
//   (c) callToolThroughExecutor() with spies on both seams -- keyed gets `_meta`, keyless is handed
//       no ledger and gets none, a deterministic no-model call gets none, a failure after a billed
//       model call keeps `isError` and reports the cost.
//   (d) THE SAME-FIGURE ARM -- the real logActivity() under runWithCallSource() with a stubbed
//       fetch (restored in `finally`): the ledger's cost_usd strictly equals the cost_usd in the
//       POST body for a priced call, an explicit 0 and an unpriced model; and a call with no ledger
//       posts a byte-identical body.
//
// WOULD THIS PASS IF NOTHING CHANGED? No: `summarizeUsage` and `USAGE_META_KEY` do not exist on the
// tree before this ticket, so the import fails.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";
import { callToolThroughExecutor, summarizeUsage, toToolResult, USAGE_META_KEY } from "../../api/_lib/mcp.js";
import { logActivity } from "../../lib/activity-log.js";
import { runWithCallSource } from "../../lib/request-context.js";
import { computeCallCost } from "../../shared/models.js";

const PRICED = "claude-sonnet-5-5";
const UNPRICED = "zz-agt785-no-such-model";
const entry = (over = {}) => ({
  cost_usd: 0.0123456, model: PRICED, input_tokens: 1000, output_tokens: 200,
  cache_creation_input_tokens: null, cache_read_input_tokens: null, trace_id: "trace-a", ...over,
});

function partA_summarize() {
  const results = [];
  assert.strictEqual(USAGE_META_KEY, "com.roadmapventure.deepbench/usage", "the published key name is a wire contract");

  assert.strictEqual(summarizeUsage(null), null, "no ledger -> nothing");
  assert.strictEqual(summarizeUsage([]), null, "an empty ledger -> nothing, never a zero");
  assert.strictEqual(
    summarizeUsage([entry({ model: null, cost_usd: null, input_tokens: null, output_tokens: null })]), null,
    "a model-less (deterministic) row is not a model call and reports nothing");
  results.push("no-model-row-reports-nothing");

  const one = summarizeUsage([entry()]);
  assert.deepStrictEqual(one, {
    cost_usd: 0.012346, model: PRICED, model_calls: 1, input_tokens: 1000, output_tokens: 200,
    cache_creation_input_tokens: null, cache_read_input_tokens: null, trace_id: "trace-a",
  }, "one row: its own figure at six places, its tokens, its trace");

  // Each row is rounded as the column stores it, THEN summed: 0.0000014 + 0.0000014 is 0.000002 in
  // the table (0.000001 + 0.000001), not 0.000003 (the raw sum 0.0000028 rounded).
  const two = summarizeUsage([entry({ cost_usd: 0.0000014 }), entry({ cost_usd: 0.0000014, input_tokens: 50, output_tokens: 5 })]);
  assert.strictEqual(two.cost_usd, 0.000002, "per-row rounding, so the total equals sum(cost_usd) of the stored rows");
  assert.strictEqual(two.model_calls, 2);
  assert.strictEqual(two.input_tokens, 1050);
  assert.strictEqual(two.output_tokens, 205);
  assert.strictEqual(summarizeUsage([entry({ cost_usd: 5e-7 })]).cost_usd, 0.000001, "an exponent-form float still rounds");
  results.push("sum-is-per-row-six-place");

  const mixed = summarizeUsage([entry(), entry({ model: "claude-haiku-5-5", cost_usd: 0.001 })], "trace-top");
  assert.strictEqual(mixed.model, null, "two models: no single model is claimed");
  assert.deepStrictEqual(mixed.models, [PRICED, "claude-haiku-5-5"]);
  assert.strictEqual(mixed.trace_id, "trace-top", "the executor's own trace id wins over a row's");
  assert.strictEqual(mixed.cost_usd, 0.013346);
  results.push("mixed-models-listed");

  const unpriced = summarizeUsage([entry(), entry({ model: UNPRICED, cost_usd: null })]);
  assert.strictEqual(unpriced.cost_usd, null, "one unpriced model row makes the total unknown -- null, never a partial sum or 0");
  assert.strictEqual(unpriced.input_tokens, 2000, "tokens are still reported when the price is unknown");
  const zero = summarizeUsage([entry({ cost_usd: 0 })]);
  assert.strictEqual(zero.cost_usd, 0, "an asserted 0 (an unbilled refusal) is a measured 0 and is reported as one");
  results.push("unpriced-is-null-asserted-zero-is-zero");
  return results;
}

function partB_toToolResult() {
  const results = [];
  const row = { slug: "t", output_schema: { type: "object" } };
  const result = { content: { matches: [{ n: 1, why: "w", rating: "strong" }], item: "x" }, trace_id: "trace-a" };
  const before = toToolResult(result, row);
  const usage = summarizeUsage([entry()]);
  const after = toToolResult(result, row, usage);
  assert.deepStrictEqual(Object.keys(before), ["content", "isError", "structuredContent"], "without usage the result has exactly the fields it always had");
  const { _meta, ...rest } = after;
  assert.deepStrictEqual(rest, before, "content, structuredContent and isError are untouched by the usage block");
  assert.deepStrictEqual(_meta, { [USAGE_META_KEY]: usage });
  assert.ok(!("_meta" in toToolResult(result, row, null)), "null usage adds no _meta key");
  assert.ok(!JSON.stringify(after.structuredContent).includes("cost_usd"), "nothing is added inside structuredContent (the published output schema)");
  results.push("meta-is-additive-existing-fields-identical");
  return results;
}

async function partC_seams() {
  const results = [];
  const rows = [
    { slug: "ai-tool", agent_id: "a1", execution_type: "ai", default_intent_slug: "ai-intent", output_schema: { type: "object" } },
    { slug: "det-tool", agent_id: "a1", execution_type: "deterministic", handler: "x" },
  ];
  const args = { task_context: { q: "made up" } };
  const handed = [];
  const execute = async ({ usageLedger }) => {
    handed.push(usageLedger);
    if (usageLedger) usageLedger.push(entry({ cost_usd: 0.05 }), entry({ cost_usd: 0.003, input_tokens: 10, output_tokens: 1 }));
    return { content: { ok: true }, trace_id: "trace-exec" };
  };

  const keyed = await callToolThroughExecutor({ name: "ai-tool", args, rows, execute, callerKeyName: "MCP_KEY_FX" });
  assert.ok(Array.isArray(handed[0]), "a keyed call hands the executor seam a ledger");
  assert.deepStrictEqual(keyed.structuredContent, { ok: true });
  assert.strictEqual(keyed.isError, false);
  assert.deepStrictEqual(keyed._meta[USAGE_META_KEY], {
    cost_usd: 0.053, model: PRICED, model_calls: 2, input_tokens: 1010, output_tokens: 201,
    cache_creation_input_tokens: null, cache_read_input_tokens: null, trace_id: "trace-exec",
  });
  results.push("keyed-call-carries-usage");

  const keyless = await callToolThroughExecutor({ name: "ai-tool", args, rows, execute });
  assert.strictEqual(handed[1], null, "a keyless call hands the seam NO ledger");
  assert.deepStrictEqual(keyless, { content: [{ type: "text", text: JSON.stringify({ ok: true }, null, 2) }], isError: false, structuredContent: { ok: true } },
    "a keyless result is exactly what it was before this ticket");
  results.push("keyless-call-unchanged");

  // Deterministic: the handler logs a model-less row. The spy mirrors runDeterministic()'s own fold.
  const executeDeterministic = async ({ row, usageLedger }) => {
    usageLedger.push(entry({ model: null, cost_usd: null, input_tokens: null, output_tokens: null }));
    return toToolResult({ content: "scaffold" }, row, summarizeUsage(usageLedger));
  };
  const det = await callToolThroughExecutor({ name: "det-tool", args, rows, executeDeterministic, callerKeyName: "MCP_KEY_FX" });
  assert.deepStrictEqual(det, { content: [{ type: "text", text: "scaffold" }], isError: false }, "no model call -> no _meta, never a made-up zero");
  results.push("deterministic-reports-no-cost");

  const failing = async ({ usageLedger }) => { usageLedger.push(entry({ cost_usd: 0.01 })); throw new Error("boom"); };
  const failed = await callToolThroughExecutor({ name: "ai-tool", args, rows, execute: failing, callerKeyName: "MCP_KEY_FX" });
  assert.strictEqual(failed.isError, true);
  assert.strictEqual(failed.content[0].text, "boom");
  assert.strictEqual(failed._meta[USAGE_META_KEY].cost_usd, 0.01, "a failure after a billed model call still reports the cost");
  const failedFree = await callToolThroughExecutor({ name: "ai-tool", args, rows, execute: async () => { throw new Error("early"); }, callerKeyName: "MCP_KEY_FX" });
  assert.deepStrictEqual(failedFree, { content: [{ type: "text", text: "early" }], isError: true }, "a failure before any model call reports nothing");
  results.push("failure-reports-what-was-billed");
  return results;
}

async function partD_sameFigure() {
  const results = [];
  const saved = { fetch: globalThis.fetch, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY };
  const posts = [];
  try {
    process.env.SUPABASE_URL = "https://agt785.invalid";
    process.env.SUPABASE_SERVICE_KEY = "fixture-not-a-key";
    globalThis.fetch = async (url, init) => {
      if (String(url).includes("/rest/v1/ai_activity_log") && init && init.method === "POST") posts.push(JSON.parse(init.body));
      return { ok: true, status: 201, json: async () => [], text: async () => "" };
    };
    const call = (over, ledger) => {
      const fn = () => logActivity({ aiType: "capability", feature: "agt-785-fixture", traceId: "trace-d", ...over });
      return ledger ? runWithCallSource("mcp", fn, { usageLedger: ledger }) : runWithCallSource("mcp", fn);
    };

    const ledger = [];
    await call({ model: PRICED, inputTokens: 12345, outputTokens: 678 }, ledger);
    await call({ model: PRICED, inputTokens: 500, outputTokens: 0, costUsd: 0 }, ledger);
    await call({ model: UNPRICED, inputTokens: 10, outputTokens: 10 }, ledger);
    assert.strictEqual(ledger.length, 3, "one ledger entry per row written");
    assert.strictEqual(posts.length, 3, "one POST per call");
    for (let i = 0; i < 3; i++) {
      assert.strictEqual(ledger[i].cost_usd, posts[i].cost_usd, `row ${i}: the ledger figure IS the figure sent to ai_activity_log.cost_usd`);
      assert.strictEqual(ledger[i].model, posts[i].model);
      assert.strictEqual(ledger[i].input_tokens, posts[i].input_tokens);
      assert.strictEqual(ledger[i].output_tokens, posts[i].output_tokens);
      assert.strictEqual(ledger[i].trace_id, posts[i].trace_id);
    }
    assert.strictEqual(posts[0].cost_usd, computeCallCost(PRICED, 12345, 678, null, null), "the priced row is still priced by shared/models.js");
    assert.ok(posts[0].cost_usd > 0);
    assert.strictEqual(posts[1].cost_usd, 0, "an explicit 0 still wins");
    assert.strictEqual(posts[2].cost_usd, null, "an unpriced model is still null");
    results.push("ledger-figure-equals-row-figure");

    // CONTROL: the same call with no ledger posts the same body (created_at aside) and touches nothing.
    await call({ model: PRICED, inputTokens: 12345, outputTokens: 678 }, null);
    const strip = ({ created_at, ...b }) => b;
    assert.deepStrictEqual(strip(posts[3]), strip(posts[0]), "the row body does not depend on whether a ledger is present");
    assert.strictEqual(ledger.length, 3, "a call outside the ledger's context adds nothing to it");
    results.push("row-body-identical-without-ledger");
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = saved.url;
    if (saved.key === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = saved.key;
  }
  return results;
}

async function run() {
  const results = [];
  results.push(...partA_summarize());
  results.push(...partB_toToolResult());
  results.push(...(await partC_seams()));
  results.push(...(await partD_sameFigure()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
