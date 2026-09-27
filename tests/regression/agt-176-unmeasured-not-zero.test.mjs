// DeepBench v7.0.623 | tests/regression/agt-176-unmeasured-not-zero.test.mjs | AGT-176
//
// FEATURE: AGT-176 -- A BILLED REFUSAL IS NOT FREE, AND AN UNPRICEABLE ROW IS NOT A ZERO.
// Both refusal gates in api/prompt/request-receivable.js asserted `billed: false`, which the two
// cost mappers (the failure-seam mapper in that file, `api/capabilities/execute.js:1297`) turn into a hard `costUsd: 0`,
// which lands in ai_activity_log as a measured zero. Anthropic began billing pre-output refusals in
// the `bio`, `frontier_llm` and `reasoning_extraction` categories on 2026-09-24, so on those rows
// the asserted 0 is not a measurement of a free call -- it is real money missing from the ledger.
// Measured at design time: 26 of the last 40 ship cards carry cost_usd = 0, and for cycle
// 40d8dfe3-764d-467e-bf2b-7600e522d966 all 86 contributing ai_activity_log rows carry cost_usd NULL.
//
// WHAT THIS FILE GRADES IS THE CHANGE, NEVER THE LIVE WORLD (pattern:162). Every assertion below is
// red on origin/dev at 700d048a and green here, and none of them reads a runner_cycles row or a ship
// card: the stored historical zeros are deliberately NOT rewritten by this ticket (its STOP LINE), so
// a test that asserted on them would be grading data this change does not touch and would flip red
// the moment an unrelated cycle ran. The live NULL-vs-0 pair the kickoff's QA (e) describes was
// measured once by the Builder as evidence for the report; it is not pinned here for that reason.
//
// SCOPE NOTE, DELIBERATE: the kickoff's tasks 2 and 3 (the `cost_basis:` vocabulary and the D2
// resolver expression in docs/runbooks/runner-cycle.md) were CUT for the file cap -- any byte change
// to that runbook also forces docs/runbooks/cycle-card.md to be re-rendered and BYTES_AT_SHIP to be
// re-pinned in ses-413d, which is 5 files against a cap of 3. So this file carries no runbook
// assertion at all. Adding one before those edits land would be a red test asserting work nobody did.
//
// FOUR PARTS, Category B (unit + seam; no network, no paid call):
//   (a) UNIT -- refusalBilled() is true for exactly the three billed categories and false for every
//       other value, including null, undefined, a non-string and a case variant. BOTH branches are
//       asserted, not just the true one (the LOO-013 lesson: prove WHICH branch fired), and the
//       exported category list is checked as the single home of the rule.
//   (b) SOURCE -- both refusal gates actually call refusalBilled(); the file's literal
//       `billed: false` count is exactly 1 (the rejection at :560, left unbilled on purpose); and
//       the superseded comment block that asserted "the row must say so with a 0" is gone.
//   (c) SEAM -- the money path end to end with globalThis.fetch replaced, three arms. A refusal in a
//       billed category carries billed: true, which leaves costUsd undefined, which makes
//       lib/activity-log.js price the row from its own tokens. THE LINE IS ABSENT vs ZERO, NOT
//       BILLED vs UNBILLED -- measured this session: computeCallCost(model, null, null) is null but
//       computeCallCost(model, 0, 0) is 0. So a billed refusal with NO usage block writes NULL, a
//       billed refusal whose block reports 0/0 writes a measured 0, and an unbilled refusal keeps its
//       asserted 0. Flipping `billed` does not blanket-NULL the refusal rows, and arm 2 proves it.
//   (d) SEAM, NEGATIVE CONTROL -- the pricer is not simply blind: the same billed refusal carrying a
//       real usage block writes a real priced figure, so part (c)'s NULL is the absence of tokens and
//       not a pricer that returns NULL for everything.

import assert from "assert";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";

const here = path.dirname(fileURLToPath(import.meta.url));
// DEEPBENCH_ROOT exists only so a kickoff dry-run can execute this file from a scratchpad against
// the clone. Never set it in a suite run.
const ROOT = process.env.DEEPBENCH_ROOT || path.resolve(here, "../..");
const mod = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const { selfRun } = await mod("tests/regression/_lib/self-run.js");

const RECEIVABLE_REL = "api/prompt/request-receivable.js";

// The three categories Anthropic bills a pre-output refusal in, as of 2026-09-24. Held here as a
// literal so the test does not simply re-read the constant it is grading and agree with itself.
const BILLED = ["bio", "frontier_llm", "reasoning_extraction"];
// Everything else must stay unbilled and keep its measured 0. `cyber` and `uncategorized` are real
// categories; the rest are the shapes a missing or malformed category actually arrives as.
const UNBILLED = ["cyber", "uncategorized", "", "BIO", "Bio", "frontier-llm", "bio ", "refusal", "0"];

const FORMAT_CONTRACT = {
  name: "agt176_contract",
  schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
};

// A refusal in the exact shape SES-347 measured: HTTP 200, empty content, no tool_use block. `usage`
// is what the API reported, and the `usage` argument is what makes part (d) discriminating.
// `usage: undefined` means the API sent NO usage block at all -- the unmeasured case, and the one
// that must land NULL. A block reporting 0/0 is a different fact: a measured zero.
function refusalResponse(category, usage = undefined) {
  return {
    ok: true, status: 200,
    json: async () => ({
      id: "msg_refused", type: "message", role: "assistant", model: "claude-fable-5-1",
      content: [], stop_reason: "refusal", stop_details: { type: "refusal", category },
      ...(usage === undefined ? {} : { usage }),
    }),
    text: async () => "",
  };
}

let failures = 0;
function part(label, fn) {
  return Promise.resolve().then(fn).then(
    () => console.log(`  ${label} -- PASS`),
    (e) => { failures++; console.log(`  ${label} -- FAIL: ${e.message}`); });
}

// Replays what the two cost mappers do with a modelCall, so the seam parts assert the real
// expression rather than a paraphrase of it. Asserted against the shipped source in part (b).
const costUsdForMapper = (mc) => (mc.billed === false ? 0 : undefined);

async function run() {
  // (a) ---------------------------------------------------------------------------------------
  await part("(a) refusalBilled() is true for exactly the three billed categories", async () => {
    const rr = await mod(RECEIVABLE_REL);
    assert.strictEqual(typeof rr.refusalBilled, "function",
      `${RECEIVABLE_REL} must export refusalBilled() -- on origin/dev this export does not exist and this import is undefined`);

    for (const c of BILLED) {
      assert.strictEqual(rr.refusalBilled(c), true,
        `refusalBilled("${c}") must be true -- Anthropic bills a pre-output refusal in this category since 2026-09-24, and a false here is money missing from the ledger`);
    }
    for (const c of UNBILLED) {
      assert.strictEqual(rr.refusalBilled(c), false,
        `refusalBilled(${JSON.stringify(c)}) must be false -- a category Anthropic does not bill keeps its measured 0, and a spurious true publishes NULL where a real 0 belongs`);
    }
    // The absent-category shapes, called out separately because these are what the call sites
    // actually pass when stop_details is missing: `llmData.stop_details?.category ?? null`.
    assert.strictEqual(rr.refusalBilled(null), false, "refusalBilled(null) must be false -- an absent category fails closed to unbilled");
    assert.strictEqual(rr.refusalBilled(undefined), false, "refusalBilled(undefined) must be false -- same fail-closed direction");
    for (const junk of [0, 1, true, false, {}, [], ["bio"], { category: "bio" }]) {
      assert.strictEqual(rr.refusalBilled(junk), false,
        `refusalBilled(${JSON.stringify(junk)}) must be false -- only a string category can be billed, never a truthy non-string`);
    }

    // The rule has exactly one home, and it is the list -- not a switch, not a regex, not a repeat
    // of the literal at either call site (pattern:14).
    assert.ok(Array.isArray(rr.BILLED_REFUSAL_CATEGORIES),
      `${RECEIVABLE_REL} must export BILLED_REFUSAL_CATEGORIES as the single home of the rule`);
    assert.deepStrictEqual([...rr.BILLED_REFUSAL_CATEGORIES].sort(), [...BILLED].sort(),
      "BILLED_REFUSAL_CATEGORIES must be exactly the three categories Anthropic bills -- widening it silently is how an unpriceable row starts reading NULL instead of 0");
    console.log(`      ${BILLED.length} billed / ${UNBILLED.length + 10} unbilled inputs asserted, both branches`);
  });

  // (b) ---------------------------------------------------------------------------------------
  await part("(b) both refusal gates call refusalBilled(); one literal billed: false remains", async () => {
    const src = read(RECEIVABLE_REL);

    // Comment prose quotes both forms while explaining the rule, so count CODE lines only -- a regex
    // over the whole file counts the explanation as if it were an assignment.
    const code = src.split("\n").filter(l => !l.trim().startsWith("//")).join("\n");

    const wired = (code.match(/billed: refusalBilled\(llmData\.stop_details\?\.category \?\? null\)/g) || []).length;
    assert.strictEqual(wired, 2,
      `BOTH refusal gates must read billed: refusalBilled(...) -- found ${wired}. There are two sites, not one (the first response and the parse-retry's response); fixing one leaves half the refusals still asserting 0`);

    const stillFalse = (code.match(/billed: false/g) || []).length;
    assert.strictEqual(stillFalse, 1,
      `exactly 1 literal \`billed: false\` must remain -- the REJECTION (a 4xx Anthropic never charged), which this ticket deliberately leaves unbilled. Found ${stillFalse}; on origin/dev there are 3`);

    // The rejection is the one that keeps it, and it must still be the rejection.
    const rejectionLine = code.split("\n").find(l => l.includes("billed: false"));
    assert.ok(/upstream_status/.test(rejectionLine),
      `the surviving \`billed: false\` must be the rejection site (it carries upstream_status), not a refusal gate. Got: ${rejectionLine.trim()}`);

    // The comment block that asserted the opposite rule is gone -- a stale comment stating the
    // superseded rule beside the corrected code is how the next session re-introduces the defect.
    assert.ok(!src.includes("NOT BILLED, AND THE ROW MUST SAY SO WITH A 0"),
      `${RECEIVABLE_REL} must no longer assert "NOT BILLED, AND THE ROW MUST SAY SO WITH A 0" -- that rule stopped being true on 2026-09-24`);
    assert.ok(src.includes("2026-09-24"),
      "the rewritten comment block must name the 2026-09-24 billing change that moved the rule");

    // The mapper part (c) and (d) rely on, asserted against the real source rather than assumed.
    const mappers = (code.match(/costUsd: mc\.billed === false \? 0 : undefined/g) || []).length;
    assert.strictEqual(mappers, 1,
      `${RECEIVABLE_REL} must still carry the one cost mapper that turns billed into costUsd -- found ${mappers}. If this expression moved, parts (c) and (d) are asserting a seam that no longer exists`);
    console.log(`      2 gates wired · 1 literal billed: false (the rejection) · mapper intact`);
  });

  // (c) ---------------------------------------------------------------------------------------
  await part("(c) SEAM: absent tokens write NULL; a reported 0/0 writes 0; an unbilled refusal writes 0", async () => {
    const rr = await mod(RECEIVABLE_REL);
    const { logActivity } = await mod("lib/activity-log.js");

    const realFetch = globalThis.fetch;
    const savedUrl = process.env.SUPABASE_URL, savedKey = process.env.SUPABASE_SERVICE_KEY;
    // A placeholder, never a credential: globalThis.fetch is replaced below, so no request leaves this
    // process and nothing here reaches Anthropic. callModel() only refuses to build a call without one.
    const savedApiKey = process.env.ANTHROPIC_API_KEY;
    try {
      process.env.SUPABASE_URL = "https://seam.example";
      process.env.SUPABASE_SERVICE_KEY = "seam-key";
      process.env.ANTHROPIC_API_KEY = "seam-placeholder-not-a-key";

      const base = { systemPrompt: "x".repeat(4000), model: "claude-fable-5-1", max_tokens: 64, format_contract: FORMAT_CONTRACT };

      // --- the billed branch, UNMEASURED: reasoning_extraction refused with NO usage block ---
      globalThis.fetch = async () => refusalResponse("reasoning_extraction");
      let billedErr = null;
      try { await rr.callModel(base); } catch (e) { billedErr = e; }
      assert.ok(billedErr && billedErr.modelCall, "a refused call must throw carrying e.modelCall");
      assert.strictEqual(billedErr.modelCall.billed, true,
        "a reasoning_extraction refusal must carry billed: true -- this is the row that was under-reporting");
      assert.strictEqual(costUsdForMapper(billedErr.modelCall), undefined,
        "billed: true must leave costUsd UNDEFINED at the mapper -- that is what hands pricing to lib/activity-log.js instead of asserting a figure here");

      let body = null;
      globalThis.fetch = async (url, init) => { body = JSON.parse(init.body); return { ok: true, status: 201, text: async () => "" }; };
      await logActivity({
        aiType: "agent-turn", feature: "agt176-seam", model: "claude-fable-5-1",
        inputTokens: billedErr.modelCall.usage?.input_tokens ?? null,
        outputTokens: billedErr.modelCall.usage?.output_tokens ?? null,
        costUsd: costUsdForMapper(billedErr.modelCall),
      });
      assert.ok("cost_usd" in body, "the POST body must carry cost_usd");
      assert.strictEqual(body.cost_usd, null,
        `a BILLED refusal with NO usage block must write cost_usd NULL -- unmeasured, not free. Got ${JSON.stringify(body.cost_usd)}. A 0 here is the exact defect AGT-176 exists to remove`);
      assert.notStrictEqual(body.cost_usd, 0, "NULL and 0 are different assertions and this row must make the NULL one");

      // --- the billed branch, MEASURED ZERO: a usage block that really reports 0/0 is a 0, not NULL.
      // MEASURED THIS SESSION, and it corrects the assumption this part was first written on:
      // computeCallCost(model, 0, 0) is 0 while computeCallCost(model, null, null) is null. The
      // distinction the ticket turns on is ABSENT tokens vs ZERO tokens, not billed vs unbilled -- so
      // flipping `billed` does NOT blanket-NULL the refusal rows, and this arm is what proves it.
      globalThis.fetch = async () => refusalResponse("frontier_llm", { input_tokens: 0, output_tokens: 0 });
      let zeroErr = null;
      try { await rr.callModel(base); } catch (e) { zeroErr = e; }
      assert.ok(zeroErr && zeroErr.modelCall, "a refusal reporting 0/0 must still throw carrying e.modelCall");
      assert.strictEqual(zeroErr.modelCall.billed, true, "frontier_llm is a billed category");
      assert.deepStrictEqual(zeroErr.modelCall.usage, { input_tokens: 0, output_tokens: 0 },
        "the 0/0 usage block must be carried as the API reported it");
      body = null;
      globalThis.fetch = async (url, init) => { body = JSON.parse(init.body); return { ok: true, status: 201, text: async () => "" }; };
      await logActivity({
        aiType: "agent-turn", feature: "agt176-seam", model: "claude-fable-5-1",
        inputTokens: zeroErr.modelCall.usage?.input_tokens ?? null,
        outputTokens: zeroErr.modelCall.usage?.output_tokens ?? null,
        costUsd: costUsdForMapper(zeroErr.modelCall),
      });
      assert.strictEqual(body.cost_usd, 0,
        `a BILLED refusal whose usage block REPORTS 0/0 must write a measured 0, not NULL. Got ${JSON.stringify(body.cost_usd)} -- the ledger must keep saying "measured, and it was free" where that is the truth`);

      // --- the unbilled branch: cyber keeps its measured 0 ---
      globalThis.fetch = async () => refusalResponse("cyber");
      let unbilledErr = null;
      try { await rr.callModel(base); } catch (e) { unbilledErr = e; }
      assert.ok(unbilledErr && unbilledErr.modelCall, "an unbilled refusal must still throw carrying e.modelCall");
      assert.strictEqual(unbilledErr.modelCall.billed, false, "a cyber refusal stays unbilled");
      assert.strictEqual(costUsdForMapper(unbilledErr.modelCall), 0,
        "billed: false must still assert costUsd 0 at the mapper -- a category Anthropic does not charge IS a measured zero");

      body = null;
      globalThis.fetch = async (url, init) => { body = JSON.parse(init.body); return { ok: true, status: 201, text: async () => "" }; };
      await logActivity({
        aiType: "agent-turn", feature: "agt176-seam", model: "claude-fable-5-1",
        inputTokens: 0, outputTokens: 0, costUsd: costUsdForMapper(unbilledErr.modelCall),
      });
      assert.strictEqual(body.cost_usd, 0,
        `an UNBILLED refusal must still write a measured 0, not NULL. Got ${JSON.stringify(body.cost_usd)} -- flipping every refusal to NULL would trade one wrong answer for another`);
      console.log(`      billed+no-usage -> NULL · billed+0/0 -> 0 · unbilled -> 0 · all three through the real mapper expression`);
    } finally {
      globalThis.fetch = realFetch;
      if (savedUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = savedUrl;
      if (savedKey === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = savedKey;
      if (savedApiKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = savedApiKey;
    }
  });

  // (d) ---------------------------------------------------------------------------------------
  await part("(d) NEGATIVE CONTROL: the same billed refusal WITH tokens prices to a real figure", async () => {
    const rr = await mod(RECEIVABLE_REL);
    const { logActivity } = await mod("lib/activity-log.js");
    const models = await mod("shared/models.js");

    const realFetch = globalThis.fetch;
    const savedUrl = process.env.SUPABASE_URL, savedKey = process.env.SUPABASE_SERVICE_KEY;
    // A placeholder, never a credential: globalThis.fetch is replaced below, so no request leaves this
    // process and nothing here reaches Anthropic. callModel() only refuses to build a call without one.
    const savedApiKey = process.env.ANTHROPIC_API_KEY;
    try {
      process.env.SUPABASE_URL = "https://seam.example";
      process.env.SUPABASE_SERVICE_KEY = "seam-key";
      process.env.ANTHROPIC_API_KEY = "seam-placeholder-not-a-key";

      // Same category, same path, same mapper -- the ONLY difference is that the API reported tokens.
      // Without this arm, part (c)'s NULL could equally be a pricer that returns NULL for everything.
      globalThis.fetch = async () => refusalResponse("bio", { input_tokens: 1000, output_tokens: 0 });
      let err = null;
      try { await rr.callModel({ systemPrompt: "x".repeat(4000), model: "claude-fable-5-1", max_tokens: 64, format_contract: FORMAT_CONTRACT }); } catch (e) { err = e; }
      assert.ok(err && err.modelCall, "the refused call must throw carrying e.modelCall");
      assert.strictEqual(err.modelCall.billed, true, "bio is a billed category");
      assert.strictEqual(err.modelCall.usage.input_tokens, 1000, "usage must be carried as the API reported it");

      let body = null;
      globalThis.fetch = async (url, init) => { body = JSON.parse(init.body); return { ok: true, status: 201, text: async () => "" }; };
      await logActivity({
        aiType: "agent-turn", feature: "agt176-seam", model: "claude-fable-5-1",
        inputTokens: err.modelCall.usage.input_tokens, outputTokens: err.modelCall.usage.output_tokens,
        costUsd: costUsdForMapper(err.modelCall),
      });
      const expected = models.computeCallCost("claude-fable-5-1", 1000, 0);
      assert.ok(expected > 0, "the control needs a model whose 1000 input tokens price above zero");
      assert.ok(body.cost_usd !== null && Math.abs(Number(body.cost_usd) - expected) <= 1e-9,
        `a billed refusal that DID report tokens must write the priced figure ${expected}, got ${JSON.stringify(body.cost_usd)} -- if this were NULL too, part (c) would be proving nothing about the tokens`);
      console.log(`      billed + 1000 input tokens -> cost_usd ${body.cost_usd} (priced, not NULL) -- part (c)'s NULL is the missing tokens`);
    } finally {
      globalThis.fetch = realFetch;
      if (savedUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = savedUrl;
      if (savedKey === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = savedKey;
      if (savedApiKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = savedApiKey;
    }
  });

  if (failures > 0) throw new Error(`AGT-176: ${failures} part(s) failed`);
  console.log("ALL TESTS PASS");
}

export default run;
selfRun(import.meta.url, run);
