// DeepBench v7.0.986 | tests/regression/agt-522-current-model-ids.test.mjs | AGT-522 -- the two
// ids MODELS names are read through the real call paths, and a reply that OPENS with a thinking
// block still yields its text.
//
// WHY THIS GUARD EXISTS. AGT-522 moved MODELS.HAIKU to `claude-haiku-5-5` and MODELS.SONNET to
// `claude-sonnet-5-5`. Both are thinking-capable, and a thinking-capable model may BEGIN its reply
// with a `thinking` block -- so `content[0]` is no longer the text. lib/agent-run.js's REFLECT read
// `reflectData.content?.[0]?.text || ""` and would have returned `""` on a perfectly good 200,
// silently dropping every execution plan; and the six src/ readers of `/api/brief` take
// `content?.[0]?.text`, so callClaude() drops thinking blocks server-side rather than changing six
// screens. Those two behaviours are what this file pins.
//
// THE DISCRIMINATOR, MEASURED BOTH WAYS rather than asserted (STANDARDS.md Section 4, the LOO-013
// lesson). Against a tree carrying only the `export` on callReflect() -- the change that makes arm
// A reachable, with the old `content[0].text` read still in place -- arm A FAILS with
// `got ""`. Against the shipped tree both arms pass. A guard that only ever saw the post-change
// tree would pass against the defect it is named for.
//
// OFFLINE AND READ-ONLY. `globalThis.fetch` is stubbed in each arm, so no network call, no dollars
// and no credentials: the stub parses the body the seam actually sent, which is how the asserted
// `model` is the id that WOULD have gone to Anthropic rather than a value re-read from MODELS.
// Both the stub and ANTHROPIC_API_KEY are restored in a finally, so neither leaks to the next test.
//
// SES-45: every assertion runs the real implementation -- callReflect() and callClaude() as
// exported by lib/agent-run.js, and MODELS as exported by shared/models.js. Nothing is recreated.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";
import { MODELS } from "../../shared/models.js";
import { callReflect, callClaude } from "../../lib/agent-run.js";

const THINK = { type: "thinking", thinking: "", signature: "s" };
const TEXT  = { type: "text", text: "1. plan" };

// Answers every call with `reply` and records what the seam sent. Restores fetch and the key.
async function withStub(reply, fn) {
  const sent = [];
  const realFetch = globalThis.fetch;
  const hadKey = Object.prototype.hasOwnProperty.call(process.env, "ANTHROPIC_API_KEY");
  const realKey = process.env.ANTHROPIC_API_KEY;
  globalThis.fetch = async (_url, init) => {
    sent.push(JSON.parse(init.body));
    return { ok: true, status: 200, json: async () => reply };
  };
  process.env.ANTHROPIC_API_KEY = "k";
  try {
    return await fn(sent);
  } finally {
    globalThis.fetch = realFetch;
    if (hadKey) process.env.ANTHROPIC_API_KEY = realKey;
    else delete process.env.ANTHROPIC_API_KEY;
  }
}

let failures = 0;
function part(label, fn) {
  return Promise.resolve().then(fn).then(
    () => console.log(`  ${label} -- PASS`),
    (e) => { failures++; console.log(`  ${label} -- FAIL: ${e.message}`); });
}

async function run() {
  // (A) REFLECT reads the first TEXT block, not content[0], and calls the Haiku id.
  await part("A reflect-reads-first-text", () => withStub({ content: [THINK, TEXT] }, async (sent) => {
    const plan = await callReflect("role", "", "task", "Agent");
    assert.strictEqual(plan, "1. plan",
      `callReflect must return the first text block even when the reply opens with a thinking block; got ${JSON.stringify(plan)}`);
    assert.strictEqual(sent.length, 1, `one REFLECT call expected, got ${sent.length}`);
    assert.strictEqual(sent[0].model, MODELS.HAIKU,
      `REFLECT must call MODELS.HAIKU (${MODELS.HAIKU}); sent ${sent[0].model}`);
  }));

  // (B) callClaude drops thinking blocks (plain and redacted), keeps everything else, Sonnet id.
  await part("B act-drops-thinking-blocks", () => withStub(
    { content: [THINK, TEXT, { type: "redacted_thinking", data: "x" }], usage: { input_tokens: 3 } },
    async (sent) => {
      const res = await callClaude("sys", [{ role: "user", content: "hi" }]);
      assert.deepStrictEqual(res.content, [TEXT],
        `callClaude must strip thinking and redacted_thinking blocks so content[0] is the text; got ${JSON.stringify(res.content)}`);
      assert.deepStrictEqual(res.usage, { input_tokens: 3 },
        `the rest of the reply must survive untouched; usage was ${JSON.stringify(res.usage)}`);
      assert.strictEqual(sent.length, 1, `one ACT call expected, got ${sent.length}`);
      assert.strictEqual(sent[0].model, MODELS.SONNET,
        `ACT must call MODELS.SONNET (${MODELS.SONNET}); sent ${sent[0].model}`);
    }));

  if (failures) throw new Error(`${failures} part(s) failed`);
}

export default run;
selfRun(import.meta.url, run);
