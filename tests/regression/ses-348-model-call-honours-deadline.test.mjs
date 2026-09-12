// DeepBench v7.0.466 | tests/regression/ses-348-model-call-honours-deadline.test.mjs | SES-348
//
// FEATURE: SES-348 -- a model call runs to the caller's deadline, never to a 55 s literal.
// api/prompt/request-receivable.js postToAnthropicWithRetry() aborted every request at
// Math.min(55000, remainingMs) (line 503, and the parse-retry fetch at 751), so a longer
// _deadline never lifted the cap; and api/capabilities/execute.js computed its top-level and
// resume deadlines from a literal 60000 (lines 1861 / 1922) under a self-declared
// `maxDuration: 60`, on a Vercel project whose Fluid-compute default is 300 s. A full verify-ship
// verdict takes 54-57 s (ai_activity_log 41374: 51,749 ms success; durable_hops ff28e187:
// recovery_ledger fault TimeoutError three minutes later), so half the runs came back in_progress.
//
// THREE PARTS:
//   (a) SEAM, ~57 s -- callModel() with globalThis.fetch replaced by a synthetic model turn that
//       answers after 57 s and honours init.signal the way undici does (rejects with the signal's
//       reason on abort). Deadline = now + 90 s. Post-change the turn is returned; pre-change the
//       abort fires at 55 s and the call throws TimeoutError. This is the ticket's "60 s synthetic
//       model turn through the seam". No network, no dollars.
//   (b) SEAM, ~9 s, CONTROL -- the deadline still bounds the call: deadline = now + 9 s, turn answers
//       at 20 s, expect TimeoutError at ~9 s. Passes before and after; it is what proves (a) did not
//       trade a cap for an unbounded wait.
//   (c) SHIPPED TEXT + IMPORT -- request-receivable.js carries no `Math.min(55000`; execute.js's
//       exported config.maxDuration is 300 and its two deadline lines derive from config.maxDuration,
//       not from 60000 (source read, labelled per STANDARDS.md Section 4).
//
// DRY-RUN against the unchanged tree: recorded in docs/kickoffs/v7.0.466-SES-348-*.md.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
// The committed file sits at tests/regression/; DEEPBENCH_ROOT exists only so the kickoff's dry-run
// can execute this file from a scratchpad against the clone. Never set it in a suite run.
const ROOT = process.env.DEEPBENCH_ROOT || path.resolve(here, "../..");
const mod = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const { selfRun } = await mod("tests/regression/_lib/self-run.js");

const FORMAT_CONTRACT = {
  output_type: "json", skill_profile_slug: "vf-verdict-intent",
  schema: { type: "object", required: ["verdict"], properties: { verdict: { type: "string" } } },
  handler: "store", guardrails: { must: [], must_not: [] },
};

// A complete schema-tool turn, the shape parseModelTurn() accepts for a forced-schema intent.
function toolUseResponse() {
  return {
    ok: true, status: 200,
    json: async () => ({
      id: "msg_ok", type: "message", role: "assistant", model: "claude-fable-5-1",
      content: [{ type: "tool_use", id: "toolu_1", name: "vf-verdict-intent", input: { verdict: "approve" } }],
      stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 },
    }),
    text: async () => "",
  };
}

// The synthetic model turn: answers after `answerMs`, and aborts the way undici's fetch does when
// the AbortSignal the seam passes fires first (rejects with signal.reason -- a TimeoutError for
// AbortSignal.timeout()). `log` records what happened so the assertions can say which.
function synthesizedTurn(answerMs, log) {
  return (_url, init) => new Promise((resolve, reject) => {
    log.calls = (log.calls || 0) + 1;
    const t = setTimeout(() => { log.answeredAt = Date.now(); resolve(toolUseResponse()); }, answerMs);
    init?.signal?.addEventListener("abort", () => {
      clearTimeout(t); log.abortedAt = Date.now(); reject(init.signal.reason);
    }, { once: true });
  });
}

let failures = 0;
function part(label, fn) {
  return Promise.resolve().then(fn).then(
    () => console.log(`  ${label} -- PASS`),
    (e) => { failures++; console.log(`  ${label} -- FAIL: ${e.message}`); });
}

async function run() {
  const rr = await mod("api/prompt/request-receivable.js");
  const base = { systemPrompt: "x".repeat(4000), model: "claude-fable-5-1", max_tokens: 64, format_contract: FORMAT_CONTRACT };
  const realFetch = globalThis.fetch;
  const savedKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "seam-key";
  try {
    // (a) -------------------------------------------------------------------------------------
    await part("(a) SEAM: a 57 s synthetic model turn under a 90 s deadline is returned, not aborted at 55 s", async () => {
      const log = {};
      globalThis.fetch = synthesizedTurn(57_000, log);
      const t0 = Date.now();
      let result = null, err = null;
      try { result = await rr.callModel({ ...base, deadline: t0 + 90_000 }); } catch (e) { err = e; }
      const elapsed = Date.now() - t0;
      assert.ok(!err, `the call must not throw; got ${err?.name}: ${err?.message} after ${elapsed} ms${log.abortedAt ? ` (aborted at +${log.abortedAt - t0} ms)` : ""}`);
      assert.ok(!log.abortedAt, `the seam must not abort a call that is inside its deadline (aborted at +${log.abortedAt - t0} ms)`);
      assert.ok(elapsed >= 56_000, `the turn must have been waited for (~57 s), elapsed ${elapsed} ms`);
      assert.strictEqual(log.calls, 1, `exactly one request; got ${log.calls}`);
      assert.strictEqual(result?.tool_input?.verdict, "approve", "callModel() must return the parsed turn (tool_input.verdict) of the synthetic answer");
    });

    // (b) -------------------------------------------------------------------------------------
    await part("(b) CONTROL: the deadline still bounds the call -- 9 s deadline, 20 s turn -> TimeoutError at ~9 s", async () => {
      const log = {};
      globalThis.fetch = synthesizedTurn(20_000, log);
      const t0 = Date.now();
      let err = null;
      try { await rr.callModel({ ...base, deadline: t0 + 9_000 }); } catch (e) { err = e; }
      const elapsed = Date.now() - t0;
      assert.strictEqual(err?.name, "TimeoutError", `expected TimeoutError, got ${err?.name}: ${err?.message}`);
      assert.ok(log.abortedAt, "the abort must have fired through the seam's signal");
      assert.ok(elapsed >= 8_500 && elapsed < 15_000, `the abort must land at the deadline (~9 s), elapsed ${elapsed} ms`);
      assert.strictEqual(err.modelCall?.fault, "TimeoutError", "LOG-149's sent-call facts must still ride the abort");
    });
  } finally {
    globalThis.fetch = realFetch;
    if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = savedKey;
  }

  // (c) ---------------------------------------------------------------------------------------
  await part("(c) SHIPPED TEXT + IMPORT: no 55000 clamp; executor ceiling 300 s and both deadlines derived from it", async () => {
    const receivable = src("api/prompt/request-receivable.js");
    const clamps = (receivable.match(/Math\.min\(55000/g) || []).length;
    assert.strictEqual(clamps, 0, `request-receivable.js must carry no Math.min(55000 clamp; found ${clamps}`);
    assert.ok(/signal:\s*AbortSignal\.timeout\(remainingMs\)/.test(receivable), "the main call must abort at remainingMs (the caller's deadline)");
    assert.ok(/signal:\s*AbortSignal\.timeout\(retryRemainingMs\)/.test(receivable), "the parse-retry fetch must abort at retryRemainingMs");

    const executor = src("api/capabilities/execute.js");
    const literal = (executor.match(/Date\.now\(\)\s*\+\s*60000/g) || []).length;
    assert.strictEqual(literal, 0, `execute.js must carry no Date.now() + 60000 deadline literal; found ${literal}`);
    const derived = (executor.match(/Date\.now\(\)\s*\+\s*config\.maxDuration\s*\*\s*1000\s*-\s*SAFETY_MARGIN_MS/g) || []).length;
    assert.strictEqual(derived, 2, `both deadlines (fresh call and resume) must derive from config.maxDuration; found ${derived}`);

    const { config } = await mod("api/capabilities/execute.js");
    assert.strictEqual(config?.maxDuration, 300, `execute.js config.maxDuration must be 300 (the project's Fluid-compute ceiling), got ${config?.maxDuration}`);
    assert.strictEqual(config?.runtime, "nodejs", "runtime stays nodejs");
  });

  if (failures) throw new Error(`${failures} part(s) failed`);
}

export default run;
selfRun(import.meta.url, run);
