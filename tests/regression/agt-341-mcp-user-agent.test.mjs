// DeepBench v7.0.835 | tests/regression/agt-341-mcp-user-agent.test.mjs | AGT-341 slice 1
//
// FEATURE: AGT-341 -- an MCP row records WHICH TOOL connected, by capturing the request's raw
// User-Agent into the new `ai_activity_log.user_agent` plumbing column.
//
// THE GAP, measured live 2026-10-09: 2,995 `call_source='mcp'` rows across 28 columns, and not one
// column holding a client name. The rows name the capability, the agent and (since AGT-163) the
// matched key, but nothing said whether Claude Desktop, ChatGPT or a one-off script was on the other
// end -- which is the only evidence that anyone OUTSIDE DeepBench ever used the MCP server.
//
// WHY THE HEADER AND NOT `clientInfo`. The MCP spec hands a client's self-declared name/version to
// `initialize`. api/_lib/mcp.js is stateless -- it issues no `Mcp-Session-Id` -- so there is nothing
// to join an `initialize` to a later `tools/call`, and `initialize` writes no audit row at all. The
// logged request carries only headers, so `User-Agent` is the one client-naming field reachable at
// the moment there is a row to put it on.
//
// WHAT THIS TEST DOES NOT ASSERT, deliberately: any particular client string. What Claude or ChatGPT
// actually send is NOT verifiable from this environment, so the value is stored RAW and UNPARSED and
// no assertion here is pinned to a guessed UA. `UA` below is this test's own fixture, not a claim
// about any real client. Naming raw strings into client labels is slice 2, authored from strings this
// slice has observed (§19i: new rows only, so a guess made now would be permanent history).
//
// FOUR ARMS, each of which fails on a DIFFERENT wrong build (STANDARDS.md Section 4 / the LOO-013
// lesson -- assert WHICH branch fired, not merely that something returned):
//   (A) PURE      -- mcpRequestContext()'s own contract, including every degrade-to-null input.
//   (B) CARRIER   -- the value survives runWithCallSource() -> mcpAttribution()'s spread. A build
//                    that read the UA only inside mcpAttribution() would pass (A) and fail here.
//   (C) SEAM      -- lib/activity-log.js's POST body, ses-331's technique. Both directions: the key
//                    is PRESENT with the value inside an MCP context, and ABSENT entirely outside
//                    one. A build writing `user_agent: ctx.userAgent ?? null` passes the first half
//                    and fails the `hasOwn` half -- and that build is the one that 400s the web path
//                    if it deploys ahead of the column's migration.
//   (D) STATIC    -- handler() actually wraps the dispatch. A build that exported the helper and
//                    never called it passes (A) and (C) and fails here.
//
// NO CREDENTIALS, NO NETWORK, NO MODEL CALL, NO SPEND: every arm is pure or runs against a stubbed
// globalThis.fetch. Nothing here reads or writes the live column, so this file is green both before
// and after the migration lands -- which is what lets it gate the code half on its own.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// This test's own fixture. NOT a claim about what any real client sends -- see the header.
const UA = "Claude-User/1.0 (+https://claude.ai)";

async function run() {
  const results = [];
  const { mcpRequestContext, mcpAttribution, USER_AGENT_MAX } = await import("../../api/_lib/mcp.js");
  const { runWithCallSource, getRequestContext } = await import("../../lib/request-context.js");

  // -------------------------------------------------------------------------------------------
  // (A) PURE -- the contract, and every input that must degrade to null rather than throw.
  // -------------------------------------------------------------------------------------------
  assert.strictEqual(USER_AGENT_MAX, 256, "the cap is 256 chars; a different cap changes stored history");

  const present = mcpRequestContext({ callSource: "mcp" }, { "user-agent": UA });
  assert.strictEqual(present.userAgent, UA, "a real header must be carried RAW -- no parsing, no normalisation");
  assert.strictEqual(present.callSource, "mcp",
    "the incoming ctx must survive: this helper ADDS userAgent, it never replaces the attribution");

  assert.strictEqual(mcpRequestContext({ callSource: "mcp" }, {}).userAgent, null,
    "an absent User-Agent is NOT CAPTURED (null), never an empty string and never a guess");
  assert.strictEqual(mcpRequestContext({}, { "user-agent": "   " }).userAgent, null,
    "a blank header is null -- a whitespace string would be a row that looks captured and says nothing");
  assert.strictEqual(mcpRequestContext({}, { "user-agent": 42 }).userAgent, null,
    "a non-string header is null, never String(42) -- attribution never invents a value");

  const capped = mcpRequestContext({}, { "user-agent": "x".repeat(300) });
  assert.strictEqual(capped.userAgent.length, USER_AGENT_MAX,
    `a 300-char header must be cut to ${USER_AGENT_MAX}, so a runaway header cannot bloat the row`);

  // Attribution is observability and may NEVER become a failure mode for the platform
  // (lib/request-context.js's own header rule). These must not throw.
  assert.strictEqual(mcpRequestContext({}, null).userAgent, null, "null headers must not throw");
  assert.strictEqual(mcpRequestContext({}, undefined).userAgent, null, "undefined headers must not throw");
  console.log(`  (A) PURE: mcpRequestContext() carries a raw UA, caps at ${USER_AGENT_MAX}, and degrades absent/blank/non-string/no-headers to null -- PASS`);
  results.push("A");

  // -------------------------------------------------------------------------------------------
  // (B) CARRIER -- the value reaches the attribution object both seams build. mcpAttribution() is
  //     UNTOUCHED by this ticket; its spread of ctx is the carrier, and this arm is what proves
  //     that spread is load-bearing rather than incidental.
  // -------------------------------------------------------------------------------------------
  const attribution = await runWithCallSource(
    "mcp",
    async () => mcpAttribution(getRequestContext(), "KEY"),
    mcpRequestContext({}, { "user-agent": UA }),
  );
  assert.strictEqual(attribution.userAgent, UA,
    "the UA must survive runWithCallSource -> getRequestContext -> mcpAttribution's spread; " +
    "if this is undefined the carrier is broken and no row will ever hold a User-Agent");
  assert.strictEqual(attribution.visitorId, "KEY",
    "AGT-163's key NAME must still take the visitor slot -- this ticket adds a column, it does not " +
    "disturb the existing attribution");
  assert.strictEqual(attribution.screenOrigin, "mcp", "AGT-163's screen_origin must still be 'mcp'");
  assert.strictEqual(attribution.callSource, "mcp",
    "runWithCallSource writes callSource LAST, so `extra` can never smuggle a different source in");
  console.log("  (B) CARRIER: the UA rides runWithCallSource -> mcpAttribution intact, and visitor_id/screen_origin/call_source are unchanged -- PASS");
  results.push("B");

  // -------------------------------------------------------------------------------------------
  // (C) LOGGER SEAM -- ses-331's technique: no credentials, no network, globalThis.fetch replaced
  //     for the duration and restored on BOTH arms. This reads the ACTUAL POST body the writer
  //     builds, which is the only place the conditional spread is observable.
  // -------------------------------------------------------------------------------------------
  const { logActivity } = await import("../../lib/activity-log.js");
  const realFetch = globalThis.fetch;
  const savedUrl = process.env.SUPABASE_URL;
  const savedKey = process.env.SUPABASE_SERVICE_KEY;
  let captured = null;
  try {
    process.env.SUPABASE_URL = "https://seam.example";
    process.env.SUPABASE_SERVICE_KEY = "seam-key";
    globalThis.fetch = async (url, init) => {
      captured = { url, init };
      return { ok: true, status: 201, text: async () => "" };
    };

    // C1 -- INSIDE an MCP context: the key is present and holds the raw UA.
    const inside = await runWithCallSource(
      "mcp",
      async () => logActivity({ aiType: "agt341-seam" }),
      mcpRequestContext({}, { "user-agent": UA }),
    );
    assert.strictEqual(inside.ok, true, "the stubbed POST must resolve { ok: true }");
    assert.strictEqual(captured.url, "https://seam.example/rest/v1/ai_activity_log",
      "the POST target must be unchanged -- this ticket adds a body key, not a new request path");
    const insideBody = JSON.parse(captured.init.body);
    assert.strictEqual(insideBody.user_agent, UA,
      "an MCP row's body must carry the raw user_agent read from the request-scoped store");
    assert.strictEqual(insideBody.call_source, "mcp",
      "call_source must still be 'mcp' -- the new key rides alongside it, it does not displace it");

    // C2 -- OUTSIDE any context: the key is ABSENT, not null. This is the arm that fails a build
    // written as `user_agent: ctx.userAgent ?? null`, and that build is the one that 400s every
    // web-path insert if it deploys ahead of the column's own migration.
    captured = null;
    const outside = await logActivity({ aiType: "agt341-seam" });
    assert.strictEqual(outside.ok, true, "the stubbed POST must resolve { ok: true } off-request too");
    const outsideBody = JSON.parse(captured.init.body);
    assert.strictEqual(Object.hasOwn(outsideBody, "user_agent"), false,
      "a non-MCP body must OMIT user_agent entirely -- a null here is a key on every insert, which " +
      "PostgREST 400s on any deployment whose migration has not landed yet");
    assert.strictEqual(outsideBody.call_source, null, "off-request, with no context, call_source is NULL");

    // The §19k boundary, both rows: a per-caller value is a plumbing COLUMN and never a fact key.
    // A per-caller value in the signature base makes every row's signature distinct -- the measured
    // LOG-91 failure (720 -> 24,826 distinct) that lib/activity-log.js's own comments cite.
    assert.strictEqual(insideBody.call_facts, null,
      "user_agent must NOT be written into call_facts -- §19k reserves that for the signature");
    assert.strictEqual(outsideBody.call_facts, null, "an empty fact set still writes NULL, never {}");
  } finally {
    globalThis.fetch = realFetch;
    if (savedUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = savedUrl;
    if (savedKey === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = savedKey;
  }
  console.log("  (C) LOGGER SEAM: an MCP body carries user_agent, a non-MCP body OMITS the key (hasOwn false), neither writes it into call_facts -- PASS");
  results.push("C");

  // -------------------------------------------------------------------------------------------
  // (D) STATIC -- handler() actually establishes the context. A build that exported the helper and
  //     never wired it passes (A) and (C) and is completely inert in production.
  // -------------------------------------------------------------------------------------------
  const source = fs.readFileSync(path.join(ROOT, "api", "_lib", "mcp.js"), "utf8");
  const ctxCalls = source.split("mcpRequestContext(getRequestContext(), req.headers)").length - 1;
  assert.strictEqual(ctxCalls, 1,
    `handler() must establish the request context exactly once (found ${ctxCalls}); zero means the ` +
    "capture is inert, two means two contexts disagree about the same request");
  const wrapCalls = source.split("runWithCallSource('mcp', () => dispatchJsonRpc(message, {").length - 1;
  assert.strictEqual(wrapCalls, 1,
    `the dispatch must be wrapped exactly once (found ${wrapCalls})`);
  console.log("  (D) STATIC: handler() wraps dispatchJsonRpc in runWithCallSource('mcp', ...) and passes mcpRequestContext(getRequestContext(), req.headers), each exactly once -- PASS");
  results.push("D");

  console.log(`[AGT-341] ${results.length} of 4 arms passed: ${results.join(",")}`);
  return results;
}

selfRun(import.meta.url, run);
export default run;
