// DeepBench v7.0.450 | tests/regression/log-149-api-dollars-ledger.test.mjs | LOG-149
//
// FEATURE: LOG-149 -- API dollars are counted where they are spent. Three meters were blind on
// 2026-09-09 (measured 2026-09-11, not recalled): every executor call that the API refused, aborted
// or rejected left NO ai_activity_log row (callModel() throws from api/prompt/request-receivable.js
// and both catch sites exit before logActivity()); cost_usd was NULL on 628 of 628 September rows
// that carry a model (43 legacy rows all-time carry one); and neither shared/models.js nor
// src/hooks/useAIActivity.js nor public.model_pricing priced claude-fable-5-1 or claude-opus-5, the
// two models every governance call runs on.
//
// ONE BILLING FACT SHAPES THE ASSERTIONS, and it corrects the ticket's own QA line: a classifier
// refusal that fires BEFORE any output (empty content -- the SES-347 shape, 5/5) is NOT billed by
// Anthropic (no input or output tokens). So a refusal row must land with cost_usd = 0, never a
// priced figure -- pricing it would be the phantom-dollar defect ARCHITECTURE.md §19v records from
// 2026-08-20. An ABORTED call (TimeoutError/AbortError after the request was sent) IS billed and
// its usage is unknowable to us, so its row carries a labelled input-side estimate
// (call_facts.tokens_estimated = true, fault = the error name) and cost_usd as a floor.
//
// FIVE PARTS:
//   (a) UNIT -- shared/models.js exports MODEL_PRICING covering every model the platform runs on,
//       at the published rates, and computeCallCost() prices from it (unknown model -> null).
//   (b) UNIT, SEAM -- lib/activity-log.js writes cost_usd at write time: computed from the row's
//       own tokens, an explicit costUsd wins, unknown model -> null. globalThis.fetch replaced;
//       no network.
//   (c) UNIT, SEAM -- callModel() classifies the three "reached the API" failures and carries the
//       facts on the thrown error (e.modelCall): a refusal is ONE request (no parse retry) and a
//       permanent `anthropic-refusal`; a timeout carries a labelled input estimate; a 400 carries
//       its faultCode. NEGATIVE CONTROL: a deadline-starved call makes NO request and carries no
//       sent-call facts, so nothing downstream can write a row for a call that never happened.
//   (d) UNIT, SEAM -- logAgentTurn() writes stop_reason / fault / tokens_estimated into call_facts
//       and passes costUsd through, so the executor's catch seam has a single writer to call.
//   (e) LIVE (Supabase credentials, else NOT RUN) -- every model id seen in ai_activity_log this
//       month, every runner_model_lanes.model_id and every public.model_pricing row is priced in
//       MODEL_PRICING at the same rates. This is the "a logged model has no price" failure.
//
// No paid arm: nothing here calls the Anthropic API. The live proof that the executor's catch
// seam writes the row is the verifier's own `--judge=executor` run at ship time, whose verdict
// note must now read `api cost $N` instead of `UNKNOWN (... carry no cost_usd)`.
//
// DRY-RUN against the unchanged tree: recorded in the kickoff (docs/kickoffs/v7.0.450-LOG-149-*.md).

import assert from "assert";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
// The committed file sits at tests/regression/; DEEPBENCH_ROOT exists only so the kickoff's dry-run
// can execute this file from a scratchpad against the clone. Never set it in a suite run.
const ROOT = process.env.DEEPBENCH_ROOT || path.resolve(here, "../..");
const mod = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

const { selfRun, notRun } = await mod("tests/regression/_lib/self-run.js");

// The published first-party rates, per 1K tokens (Anthropic pricing page, read 2026-09-11 via the
// claude-api skill's model table; cache read 0.10x input unless the model publishes its own rate --
// claude-fable-5-1 publishes $0.25/MTok). The Builder verifies these against the live page on build.
export const EXPECTED_RATES = Object.freeze({
  "claude-fable-5-1":           { input_per_1k: 0.010,   output_per_1k: 0.050 },
  "claude-opus-5":              { input_per_1k: 0.005,   output_per_1k: 0.025 },
  "claude-sonnet-5":            { input_per_1k: 0.002,   output_per_1k: 0.010 },
  "claude-sonnet-4-6":          { input_per_1k: 0.003,   output_per_1k: 0.015 },
  "claude-sonnet-4-5":          { input_per_1k: 0.003,   output_per_1k: 0.015 },
  "claude-haiku-4-5-20251001":  { input_per_1k: 0.001,   output_per_1k: 0.005 },
  "claude-haiku-4-5":           { input_per_1k: 0.001,   output_per_1k: 0.005 },
  "text-embedding-3-small":     { input_per_1k: 0.00002, output_per_1k: 0.00002 },
});

const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

function hasCreds() { return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY); }
const CRED_HINT = "export SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets by name) to run the live arm";

async function supabaseRows(query) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!r.ok) throw new Error(`Supabase read failed: HTTP ${r.status} ${await r.text().catch(() => "")}`);
  return r.json();
}

// A refusal response in the exact shape SES-347 measured: HTTP 200, empty content, no tool_use.
function refusalResponse() {
  return {
    ok: true, status: 200,
    json: async () => ({
      id: "msg_refused", type: "message", role: "assistant", model: "claude-fable-5-1",
      content: [], stop_reason: "refusal", stop_details: { type: "refusal", category: "reasoning_extraction" },
      usage: { input_tokens: 0, output_tokens: 0 },
    }),
    text: async () => "",
  };
}

const FORMAT_CONTRACT = {
  output_type: "json", skill_profile_slug: "vf-verdict-intent",
  schema: { type: "object", required: ["verdict"], properties: { verdict: { type: "string" } } },
  handler: "store", guardrails: { must: [], must_not: [] },
};

let failures = 0;
function part(label, fn) {
  return Promise.resolve().then(fn).then(
    () => console.log(`  ${label} -- PASS`),
    (e) => { failures++; console.log(`  ${label} -- FAIL: ${e.message}`); });
}

async function run() {
  // (a) ---------------------------------------------------------------------------------------
  await part("(a) MODEL_PRICING covers every platform model at the published rates", async () => {
    const m = await mod("shared/models.js");
    assert.ok(m.MODEL_PRICING && typeof m.MODEL_PRICING === "object", "shared/models.js must export MODEL_PRICING");
    assert.strictEqual(typeof m.computeCallCost, "function", "shared/models.js must export computeCallCost()");
    for (const [id, want] of Object.entries(EXPECTED_RATES)) {
      const got = m.MODEL_PRICING[id];
      assert.ok(got, `MODEL_PRICING is missing "${id}"`);
      assert.ok(near(got.input_per_1k, want.input_per_1k), `${id} input rate ${got.input_per_1k} != ${want.input_per_1k}`);
      assert.ok(near(got.output_per_1k, want.output_per_1k), `${id} output rate ${got.output_per_1k} != ${want.output_per_1k}`);
    }
    for (const id of Object.values(m.MODELS)) assert.ok(m.MODEL_PRICING[id], `MODELS.* id "${id}" must be priced`);
    assert.ok(near(m.computeCallCost("claude-fable-5-1", 1000, 100), 0.015), "fable 1000 in / 100 out must price to $0.015");
    assert.ok(near(m.computeCallCost("claude-fable-5-1", 0, 0, 0, 1000), 0.00025), "fable cache read must use its published $0.25/MTok");
    assert.ok(near(m.computeCallCost("claude-sonnet-4-6", 0, 0, 1000, 0), 0.00375), "cache creation is 1.25x input");
    assert.strictEqual(m.computeCallCost("claude-nobody-9", 10, 10), null, "an unpriced model must price to null, never 0");
    assert.strictEqual(m.computeCallCost("claude-fable-5-1", null, null), null, "no tokens at all must price to null, never 0");
  });

  // (b) ---------------------------------------------------------------------------------------
  await part("(b) logActivity() writes cost_usd at write time", async () => {
    const { logActivity } = await mod("lib/activity-log.js");
    const realFetch = globalThis.fetch;
    const savedUrl = process.env.SUPABASE_URL, savedKey = process.env.SUPABASE_SERVICE_KEY;
    let body = null;
    try {
      process.env.SUPABASE_URL = "https://seam.example";
      process.env.SUPABASE_SERVICE_KEY = "seam-key";
      globalThis.fetch = async (url, init) => { body = JSON.parse(init.body); return { ok: true, status: 201, text: async () => "" }; };

      await logActivity({ aiType: "agent-turn", feature: "seam", model: "claude-fable-5-1", inputTokens: 1000, outputTokens: 100 });
      assert.ok("cost_usd" in body, "the POST body must carry cost_usd");
      assert.ok(near(Number(body.cost_usd), 0.015), `computed cost_usd must be 0.015, got ${body.cost_usd}`);

      await logActivity({ aiType: "agent-turn", feature: "seam", model: "claude-fable-5-1", inputTokens: 500, outputTokens: 0, costUsd: 0 });
      assert.strictEqual(body.cost_usd, 0, "an explicit costUsd: 0 (an unbilled refusal) must be written as 0, not recomputed");

      await logActivity({ aiType: "agent-turn", feature: "seam", model: "claude-nobody-9", inputTokens: 10, outputTokens: 10 });
      assert.strictEqual(body.cost_usd, null, "an unpriced model must write NULL cost_usd (part (e) is what catches it), never 0");

      await logActivity({ aiType: "deterministic", feature: "seam", model: null });
      assert.strictEqual(body.cost_usd, null, "a model-less row writes NULL");
    } finally {
      globalThis.fetch = realFetch;
      if (savedUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = savedUrl;
      if (savedKey === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = savedKey;
    }
  });

  // (c) ---------------------------------------------------------------------------------------
  await part("(c) callModel() carries sent-call facts on refusal / timeout / rejection; none when unsent", async () => {
    const rr = await mod("api/prompt/request-receivable.js");
    const realFetch = globalThis.fetch;
    const savedKey = process.env.ANTHROPIC_API_KEY;
    try {
      process.env.ANTHROPIC_API_KEY = "seam-key";
      const base = { systemPrompt: "x".repeat(4000), model: "claude-fable-5-1", max_tokens: 64, format_contract: FORMAT_CONTRACT };

      // refusal: exactly one request, classified permanent, unbilled facts carried
      let calls = 0;
      globalThis.fetch = async () => { calls++; return refusalResponse(); };
      let err = null;
      try { await rr.callModel(base); } catch (e) { err = e; }
      assert.ok(err, "a refused call must throw");
      assert.strictEqual(calls, 1, `a refusal must not be parse-retried (a second refused request): ${calls} requests made`);
      assert.strictEqual(err.faultCode, "anthropic-refusal", `faultCode must be anthropic-refusal, got ${err.faultCode}`);
      assert.strictEqual(err.failureClass, "permanent", "a refusal is permanent: §19o forbids auto-retrying it");
      assert.ok(err.modelCall && err.modelCall.sent === true, "e.modelCall.sent must be true: the request reached the API");
      assert.strictEqual(err.modelCall.stop_reason, "refusal");
      assert.strictEqual(err.modelCall.refusal_category, "reasoning_extraction");
      assert.strictEqual(err.modelCall.billed, false, "a pre-output refusal is unbilled -- the row must cost 0");
      assert.deepStrictEqual(err.modelCall.usage, { input_tokens: 0, output_tokens: 0 }, "usage is carried as the API reported it");

      // timeout: the request was sent; usage unknowable; a labelled estimate rides the error
      globalThis.fetch = async () => { throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }); };
      err = null;
      try { await rr.callModel(base); } catch (e) { err = e; }
      assert.strictEqual(err?.name, "TimeoutError", "the timeout must still propagate as a TimeoutError (HAR-17 classifies on the name)");
      assert.ok(err.modelCall?.sent === true, "a timed-out call reached the API and must say so");
      assert.strictEqual(err.modelCall.fault, "TimeoutError");
      assert.strictEqual(err.modelCall.tokens_estimated, true, "an abort's input tokens are an estimate and must be labelled");
      assert.ok(Number.isInteger(err.modelCall.estimated_input_tokens) && err.modelCall.estimated_input_tokens >= 1000,
        `a 4000-char prompt must estimate to >= 1000 input tokens, got ${err.modelCall?.estimated_input_tokens}`);
      assert.strictEqual(err.modelCall.billed, true, "an aborted call is billed by the API");

      // rejection (400): sent, rejected, unbilled, faultCode carried
      globalThis.fetch = async () => ({ ok: false, status: 400, text: async () => '{"type":"error","error":{"type":"invalid_request_error","message":"bad"}}' });
      err = null;
      try { await rr.callModel(base); } catch (e) { err = e; }
      assert.strictEqual(err?.faultCode, "anthropic-request-rejected");
      assert.ok(err.modelCall?.sent === true, "a rejected request still reached the API");
      assert.strictEqual(err.modelCall.fault, "anthropic-request-rejected");
      assert.strictEqual(err.modelCall.billed, false, "a rejected request is not billed");

      // NEGATIVE CONTROL: starved of time, no request is made and no sent-call facts exist
      calls = 0;
      globalThis.fetch = async () => { calls++; return refusalResponse(); };
      err = null;
      try { await rr.callModel({ ...base, deadline: Date.now() - 1 }); } catch (e) { err = e; }
      assert.strictEqual(calls, 0, "a deadline-starved call must issue no request");
      assert.strictEqual(err?.faultCode, "time-budget-exhausted");
      assert.ok(!err.modelCall || err.modelCall.sent !== true, "an unsent call must carry no sent-call facts -- no row may be written for it");

      assert.strictEqual(typeof rr.estimateInputTokens, "function", "estimateInputTokens() must be exported for this guard");
    } finally {
      globalThis.fetch = realFetch;
      if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = savedKey;
    }
  });

  // (d) ---------------------------------------------------------------------------------------
  await part("(d) logAgentTurn() writes the failure facts and passes costUsd through", async () => {
    const { logAgentTurn } = await mod("api/capabilities/execute.js");
    const realFetch = globalThis.fetch;
    const savedUrl = process.env.SUPABASE_URL, savedKey = process.env.SUPABASE_SERVICE_KEY;
    let body = null;
    try {
      process.env.SUPABASE_URL = "https://seam.example";
      process.env.SUPABASE_SERVICE_KEY = "seam-key";
      globalThis.fetch = async (url, init) => {
        if (String(url).includes("/rest/v1/ai_activity_log")) body = JSON.parse(init.body);
        return { ok: true, status: 201, text: async () => "", json: async () => [] };
      };
      const common = { capability_slug: "verify-ship", intent_slug: "vf-verdict-intent", agent_id: "verifier", tenant_id: "global",
        model: "claude-fable-5-1", depth: 0, latency_ms: 1200, is_delegate_call: false, api_retry_count: 0, trace_id: "t", tool_calls: [] };

      await logAgentTurn({ ...common, input_tokens: 0, output_tokens: 0, stopReason: "refusal", refusalCategory: "reasoning_extraction", costUsd: 0 });
      await new Promise(r => setTimeout(r, 20));
      assert.ok(body, "logAgentTurn must POST a row");
      assert.strictEqual(body.call_facts?.stop_reason, "refusal", "call_facts.stop_reason must be written");
      assert.strictEqual(body.call_facts?.refusal_category, "reasoning_extraction");
      assert.strictEqual(body.cost_usd, 0, "a refusal row costs 0, never NULL and never a priced figure");

      body = null;
      await logAgentTurn({ ...common, input_tokens: 1234, output_tokens: null, fault: "TimeoutError", tokensEstimated: true });
      await new Promise(r => setTimeout(r, 20));
      assert.strictEqual(body.call_facts?.fault, "TimeoutError", "call_facts.fault must be written");
      assert.strictEqual(body.call_facts?.tokens_estimated, true, "an estimate must be labelled in the row");
      assert.strictEqual(body.input_tokens, 1234);
      assert.strictEqual(body.output_tokens, null, "unknowable output stays NULL, never 0");
      assert.ok(near(Number(body.cost_usd), 0.01234), `an abort prices the input-side floor: 1234 x $10/M = 0.01234, got ${body.cost_usd}`);

      body = null;
      await logAgentTurn({ ...common, input_tokens: 1000, output_tokens: 100 });
      await new Promise(r => setTimeout(r, 20));
      assert.ok(!("stop_reason" in (body.call_facts || {})) && !("fault" in (body.call_facts || {})),
        "a normal turn writes neither key -- absent means 'not a failure', never false");
      assert.ok(near(Number(body.cost_usd), 0.015), "a normal fable turn is priced at write");
    } finally {
      globalThis.fetch = realFetch;
      if (savedUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = savedUrl;
      if (savedKey === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = savedKey;
    }
  });

  // (e) ---------------------------------------------------------------------------------------
  if (!hasCreds()) {
    notRun("LOG-149 (e) every logged / laned / SQL-priced model is priced in MODEL_PRICING", CRED_HINT);
    console.log("  (e) NOT RUN -- no Supabase credentials in this environment");
  } else {
    await part("(e) LIVE: every model the platform ran this month, every lane model and every model_pricing row is priced", async () => {
      const { MODEL_PRICING } = await mod("shared/models.js");
      assert.ok(MODEL_PRICING, "shared/models.js must export MODEL_PRICING (part (a) says the same; repeated so this arm's failure names it)");
      const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
      const logged = await supabaseRows(`ai_activity_log?select=model&model=not.is.null&created_at=gte.${monthStart.toISOString()}&limit=1000&order=created_at.desc`);
      const seen = [...new Set(logged.map(r => r.model))];
      assert.ok(seen.length > 0, "the log must hold at least one model row this month for this arm to mean anything");
      const unpriced = seen.filter(id => !MODEL_PRICING[id]);
      assert.deepStrictEqual(unpriced, [], `logged this month but unpriced: ${unpriced.join(", ")}`);
      const lanes = await supabaseRows("runner_model_lanes?select=lane,model_id");
      const unpricedLanes = lanes.filter(l => !MODEL_PRICING[l.model_id]).map(l => `${l.lane}=${l.model_id}`);
      assert.deepStrictEqual(unpricedLanes, [], `lane models unpriced: ${unpricedLanes.join(", ")}`);
      const sql = await supabaseRows("model_pricing?select=model,input_per_1k,output_per_1k");
      for (const row of sql) {
        const js = MODEL_PRICING[row.model];
        assert.ok(js, `public.model_pricing prices "${row.model}" but shared/models.js does not`);
        assert.ok(near(Number(row.input_per_1k), js.input_per_1k) && near(Number(row.output_per_1k), js.output_per_1k),
          `public.model_pricing and shared/models.js disagree on ${row.model}`);
      }
      for (const l of lanes) assert.ok(sql.some(r => r.model === l.model_id), `public.model_pricing must price lane model ${l.model_id} (the IP gate's price source, §19t)`);
      console.log(`      ${seen.length} logged model id(s), ${lanes.length} lane(s), ${sql.length} SQL price row(s) reconciled`);
    });
  }

  if (failures > 0) throw new Error(`LOG-149: ${failures} part(s) failed`);
  console.log("ALL TESTS PASS");
}

export default run;
selfRun(import.meta.url, run);
