// DeepBench v7.0.444 | tests/regression/mcp-3-server.test.mjs | MCP-3
//
// FEATURE: MCP-3 -- the DeepBench MCP server at api/mcp.js. Two things have to stay true forever:
// the JSON-RPC subset answers correctly, and the governance lane does not leak to a caller without
// the key. Both are asserted here, each with a control that fails when the guard is removed.
//
// FIVE PARTS:
//   (a) UNIT -- the dispatcher answers `initialize` (version negotiation both directions), `ping`,
//       `tools/list` from a fixture capability set, returns null for a notification (the 202
//       contract), and rejects an unknown method with -32601.
//   (b) UNIT -- lane visibility. Without the key the governance fixtures are absent from tools/list
//       AND a tools/call naming one is refused -32602 with the same message an unknown tool gets
//       (no inventory oracle). NEGATIVE CONTROL: with the key both appear and the call reaches the
//       injected executor. SECOND CONTROL: a visibility function written the other way round
//       (`lane !== 'governance'`) leaks the null-lane fixture, proving the real one discriminates.
//   (c) UNIT -- toToolResult(): a string answer becomes text; a schema-carrying object answer
//       becomes text AND structuredContent; the same object with no published outputSchema gets NO
//       structuredContent (a client validates one against the other, so publishing an unvalidated
//       one is the bug).
//   (d) STATIC -- lib/request-context.js's ALLOWED_CALL_SOURCES contains 'mcp', with a stripped
//       control; and api/mcp.js carries no capability-slug conditional
//       (.claude/rules/capabilities-are-data.md).
//   (e) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- tools/list built from the REAL
//       rows lists `bench-report-card` without the key and never a governance holder; with the key
//       `classify-ticket` appears. Plus the discriminating half the unit arm cannot give: an
//       ai_activity_log row with call_source = 'mcp' exists, which can only have been written by a
//       tools/call that actually reached runCapability().
//
// DRY-RUN against the unchanged tree (measured 2026-09-09, before api/mcp.js existed): parts (a),
// (b), (c) and (e) fail at import -- `Cannot find module ../../api/mcp.js`; part (d)'s positive
// check on ALLOWED_CALL_SOURCES fails ('mcp' absent) while its stripped control passes trivially.
// 5 of 5 content assertions red pre-change.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import {
  dispatchJsonRpc,
  assembleCapabilityRows,
  visibleRows,
  toTool,
  toToolResult,
  keysMatch,
  negotiateProtocolVersion,
  fetchCapabilityRows,
  SUPPORTED_PROTOCOL_VERSIONS,
  LATEST_PROTOCOL_VERSION,
  SERVER_INFO,
} from "../../api/mcp.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

// ---------------------------------------------------------------------------------------------
// Fixtures -- shaped exactly like the four REST reads api/mcp.js makes, never like its output.
// ---------------------------------------------------------------------------------------------
const FIXTURE = {
  capabilities: [
    { slug: "fx-product-open", name: "Fixture Product Capability", description: "A product-lane fixture.", execution_type: "ai", default_intent_slug: "fx-intent", tenant_id: "global" },
    { slug: "fx-product-plain", name: "Fixture Plain Capability", description: "A product-lane fixture with no intent.", execution_type: "ai", default_intent_slug: null, tenant_id: "global" },
    { slug: "fx-governance-secret", name: "Fixture Governance Capability", description: "A governance-lane fixture.", execution_type: "ai", default_intent_slug: "fx-intent", tenant_id: "global" },
    { slug: "fx-unknown-lane", name: "Fixture Unknown Lane", description: "Holder carries a lane this code has never heard of.", execution_type: "ai", default_intent_slug: null, tenant_id: "global" },
    { slug: "fx-no-holder", name: "Fixture Without A Holder", description: "Assigned only to an inactive agent.", execution_type: "ai", default_intent_slug: null, tenant_id: "global" },
  ],
  assignments: [
    { agent_id: "fx-prod-agent", capability_slug: "fx-product-open" },
    { agent_id: "fx-prod-agent", capability_slug: "fx-product-plain" },
    { agent_id: "fx-gov-agent", capability_slug: "fx-governance-secret" },
    { agent_id: "fx-odd-agent", capability_slug: "fx-unknown-lane" },
    { agent_id: "fx-retired-agent", capability_slug: "fx-no-holder" },
  ],
  agents: [
    { id: "fx-prod-agent", name: "Fixture Product Agent", role: "Fixture Role", lane: "product", is_active: true },
    { id: "fx-gov-agent", name: "Fixture Governance Agent", role: "Governance Fixture", lane: "governance", is_active: true },
    { id: "fx-odd-agent", name: "Fixture Odd Agent", role: "Odd", lane: null, is_active: true },
    { id: "fx-retired-agent", name: "Fixture Retired Agent", role: "Retired", lane: "product", is_active: false },
  ],
  intents: [
    { slug: "fx-intent", traits: { schema: { type: "object", required: ["verdict"], properties: { verdict: { type: "string" } } } } },
  ],
};

const FIXTURE_ROWS = assembleCapabilityRows(FIXTURE);

/** Builds the deps object dispatchJsonRpc() takes, with the executor replaced by a spy. */
function depsFor({ governanceUnlocked }) {
  const rows = visibleRows(FIXTURE_ROWS, { governanceUnlocked });
  const calls = [];
  return {
    calls,
    deps: {
      listTools: async () => rows.map(toTool),
      callTool: async ({ name, args }) => {
        const row = rows.find(r => r.slug === name);
        if (!row) {
          // Mirrors api/mcp.js's own refusal shape, which the dispatcher turns into -32602.
          const err = new Error(`Unknown tool: ${name}`);
          err.code = -32602;
          const rpc = Object.assign(err, { code: -32602 });
          throw rpc;
        }
        calls.push({ name, args, agent_id: row.agent_id, intent_slug: args.intent_slug || row.default_intent_slug });
        return toToolResult({ content: { verdict: "fixture" } }, row);
      },
    },
  };
}

const rpc = (method, params, id = 1) => ({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) });

// ---------------------------------------------------------------------------------------------
// Part (a) -- the JSON-RPC subset
// ---------------------------------------------------------------------------------------------
async function partA_dispatcher() {
  const results = [];
  const { deps } = depsFor({ governanceUnlocked: false });

  // initialize, version supported -> echoed verbatim (the spec's negotiation rule).
  const initEcho = await dispatchJsonRpc(rpc("initialize", { protocolVersion: LATEST_PROTOCOL_VERSION }), deps);
  assert.strictEqual(initEcho.result.protocolVersion, LATEST_PROTOCOL_VERSION,
    `initialize did not echo a supported protocolVersion: ${JSON.stringify(initEcho)}`);
  assert.strictEqual(initEcho.result.serverInfo.name, "deepbench",
    `serverInfo.name must be "deepbench", got ${JSON.stringify(initEcho.result.serverInfo)}`);
  assert.strictEqual(initEcho.result.serverInfo.version, SERVER_INFO.version,
    "serverInfo.version must be the package version the module read");
  assert.deepStrictEqual(initEcho.result.capabilities, { tools: {} },
    `capabilities must be exactly { tools: {} }, got ${JSON.stringify(initEcho.result.capabilities)}`);
  results.push("initialize-echoes-supported-version");

  // initialize, version NOT supported -> the latest we do support, never the client's string.
  const initFallback = await dispatchJsonRpc(rpc("initialize", { protocolVersion: "1.0.0" }), deps);
  assert.strictEqual(initFallback.result.protocolVersion, LATEST_PROTOCOL_VERSION,
    "initialize with an unsupported version must answer with the latest version this server supports");
  assert.ok(!SUPPORTED_PROTOCOL_VERSIONS.includes("1.0.0"), "fixture premise: 1.0.0 must not be supported");
  assert.strictEqual(negotiateProtocolVersion(undefined), LATEST_PROTOCOL_VERSION,
    "a missing protocolVersion must negotiate to the latest, not to undefined");
  results.push("initialize-falls-back-to-latest-supported");

  // notifications/initialized (and any notification) -> null, which the handler owes a bodyless 202.
  const note = await dispatchJsonRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, deps);
  assert.strictEqual(note, null,
    `a notification must dispatch to null (transport answers 202 with no body), got ${JSON.stringify(note)}`);
  results.push("notification-dispatches-to-null");

  // ping -> empty result.
  const ping = await dispatchJsonRpc(rpc("ping", null, 7), deps);
  assert.deepStrictEqual(ping, { jsonrpc: "2.0", id: 7, result: {} },
    `ping must answer an empty result object, got ${JSON.stringify(ping)}`);
  results.push("ping-answers-empty-result");

  // tools/list from the fixture set.
  const list = await dispatchJsonRpc(rpc("tools/list"), deps);
  const names = list.result.tools.map(t => t.name);
  assert.ok(names.includes("fx-product-open") && names.includes("fx-product-plain"),
    `tools/list did not carry the product fixtures: ${JSON.stringify(names)}`);
  assert.ok(!names.includes("fx-no-holder"),
    "a capability whose only holder is inactive must not be listed -- the executor would refuse it");
  const openTool = list.result.tools.find(t => t.name === "fx-product-open");
  assert.strictEqual(openTool.inputSchema.type, "object", "inputSchema.type must be 'object' (MCP requires it)");
  assert.deepStrictEqual(openTool.inputSchema.required, ["task_context"], "task_context must be the required argument");
  assert.strictEqual(openTool.outputSchema.type, "object",
    "a capability whose default Intent declares a schema must publish it as outputSchema");
  const plainTool = list.result.tools.find(t => t.name === "fx-product-plain");
  assert.strictEqual(plainTool.outputSchema, undefined,
    "a capability with no Intent schema must publish NO outputSchema");
  assert.ok(/Fixture Product Agent/.test(openTool.description) && /Fixture Role/.test(openTool.description),
    `the tool description must name the holder and its role: ${openTool.description}`);
  results.push("tools-list-shapes-tools-from-rows");

  // Unknown method -> -32601.
  const unknown = await dispatchJsonRpc(rpc("resources/list"), deps);
  assert.strictEqual(unknown.error.code, -32601,
    `an unknown method must be -32601 Method not found, got ${JSON.stringify(unknown)}`);
  results.push("unknown-method-is-32601");

  // Malformed envelopes -> -32600, never a throw.
  const badEnvelope = await dispatchJsonRpc({ id: 1, method: "ping" }, deps);
  assert.strictEqual(badEnvelope.error.code, -32600, "a message without jsonrpc:'2.0' must be -32600");
  const batch = await dispatchJsonRpc([rpc("ping")], deps);
  assert.strictEqual(batch.error.code, -32600, "a JSON-RPC batch array must be refused -32600 (batching was removed in 2025-06-18)");
  results.push("malformed-envelopes-are-32600");

  // tools/call without a name -> -32602.
  const nameless = await dispatchJsonRpc(rpc("tools/call", { arguments: {} }), deps);
  assert.strictEqual(nameless.error.code, -32602, "tools/call without a name must be -32602");
  results.push("tools-call-without-name-is-32602");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (b) -- lane visibility, with the key as the negative control
// ---------------------------------------------------------------------------------------------
async function partB_laneVisibility() {
  const results = [];

  const locked = depsFor({ governanceUnlocked: false });
  const lockedNames = (await dispatchJsonRpc(rpc("tools/list"), locked.deps)).result.tools.map(t => t.name);
  assert.ok(!lockedNames.includes("fx-governance-secret"),
    `a caller without the key saw a governance tool: ${JSON.stringify(lockedNames)}`);
  assert.ok(!lockedNames.includes("fx-unknown-lane"),
    "a holder whose lane is neither 'product' nor 'governance' must ALSO be hidden without the key -- the filter must fail closed on an unrecognised lane");
  // The kickoff's QA question, asserted rather than asserted-about: no listed tool has a
  // non-product holder.
  const lockedRows = visibleRows(FIXTURE_ROWS, { governanceUnlocked: false });
  assert.ok(lockedRows.every(r => r.lane === "product"),
    `tools/list without the key exposed a non-product holder: ${JSON.stringify(lockedRows.map(r => [r.slug, r.lane]))}`);
  results.push("governance-and-unknown-lanes-hidden-without-key");

  // Calling a hidden tool by name is refused with the SAME message an entirely unknown tool gets.
  let hiddenErr = null;
  try { await locked.deps.callTool({ name: "fx-governance-secret", args: { task_context: {} } }); }
  catch (e) { hiddenErr = e; }
  let absentErr = null;
  try { await locked.deps.callTool({ name: "fx-does-not-exist", args: { task_context: {} } }); }
  catch (e) { absentErr = e; }
  assert.ok(hiddenErr && absentErr, "both a hidden and an absent tool name must be refused, not executed");
  assert.strictEqual(hiddenErr.message.replace("fx-governance-secret", "X"), absentErr.message.replace("fx-does-not-exist", "X"),
    `a hidden tool and an absent tool must be refused identically (no inventory oracle): "${hiddenErr.message}" vs "${absentErr.message}"`);
  assert.strictEqual(locked.calls.length, 0, "a refused tools/call must never reach the executor");
  results.push("hidden-tool-call-refused-like-an-absent-one");

  // NEGATIVE CONTROL: with the key, both appear and the call reaches the executor.
  const unlocked = depsFor({ governanceUnlocked: true });
  const unlockedNames = (await dispatchJsonRpc(rpc("tools/list"), unlocked.deps)).result.tools.map(t => t.name);
  assert.ok(unlockedNames.includes("fx-governance-secret") && unlockedNames.includes("fx-unknown-lane"),
    `control: with the key the governance and unknown-lane tools must appear, got ${JSON.stringify(unlockedNames)}`);
  const called = await dispatchJsonRpc(rpc("tools/call", { name: "fx-governance-secret", arguments: { task_context: { title: "fixture" } } }), unlocked.deps);
  assert.ok(!called.error, `control: the unlocked governance call errored: ${JSON.stringify(called)}`);
  assert.strictEqual(unlocked.calls.length, 1, "control: the unlocked governance call did not reach the executor");
  assert.strictEqual(unlocked.calls[0].agent_id, "fx-gov-agent",
    "the executor must be handed the capability's own stored holder, never a name from the client");
  assert.strictEqual(unlocked.calls[0].intent_slug, "fx-intent",
    "with no intent_slug argument the capability's default_intent_slug must be resolved (AA-188: the executor does not do it)");
  results.push("control-key-unlocks-list-and-call");

  // SECOND CONTROL: a filter written as a governance denylist leaks the unknown lane. Proves the
  // shipped allowlist form is what is doing the work.
  const denylistVisible = FIXTURE_ROWS.filter(r => r.lane !== "governance");
  assert.ok(denylistVisible.some(r => r.slug === "fx-unknown-lane"),
    "control setup failed: the unknown-lane fixture must be present for this control to mean anything");
  assert.ok(!visibleRows(FIXTURE_ROWS, { governanceUnlocked: false }).some(r => r.slug === "fx-unknown-lane"),
    "control: the shipped visibleRows() must NOT behave like a governance denylist");
  results.push("control-denylist-form-leaks-unknown-lane");

  // The key comparison itself: exact match only, and never a throw on a length mismatch.
  assert.strictEqual(keysMatch("abc", "abc"), true, "keysMatch must accept an exact match");
  assert.strictEqual(keysMatch("abc", "abcd"), false, "keysMatch must reject a length mismatch without throwing");
  assert.strictEqual(keysMatch("", ""), false, "an empty presented key must never match an empty secret");
  assert.strictEqual(keysMatch(undefined, "abc"), false, "a missing header must never match");
  assert.strictEqual(keysMatch("abc", null), false, "a missing secret row must never match (fails closed)");
  results.push("key-comparison-fails-closed");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (c) -- result shaping
// ---------------------------------------------------------------------------------------------
function partC_resultShaping() {
  const results = [];
  const schemaRow = FIXTURE_ROWS.find(r => r.slug === "fx-product-open");
  const plainRow = FIXTURE_ROWS.find(r => r.slug === "fx-product-plain");
  assert.ok(schemaRow.output_schema && !plainRow.output_schema, "fixture premise: one row with a schema, one without");

  const textResult = toToolResult({ content: "a plain prose answer" }, plainRow);
  assert.deepStrictEqual(textResult.content, [{ type: "text", text: "a plain prose answer" }],
    "a string answer must become one text block, verbatim");
  assert.strictEqual(textResult.structuredContent, undefined, "a string answer carries no structuredContent");
  assert.strictEqual(textResult.isError, false, "a successful call is not an error");
  results.push("string-answer-becomes-text");

  const structured = toToolResult({ content: { verdict: "P1 - Improves John's Skills" } }, schemaRow);
  assert.deepStrictEqual(structured.structuredContent, { verdict: "P1 - Improves John's Skills" },
    "an object answer from a schema-carrying capability must be published as structuredContent");
  assert.ok(/verdict/.test(structured.content[0].text),
    "structured answers must ALSO be rendered as text -- a client that ignores structuredContent must still see the answer");
  results.push("object-answer-becomes-structured-and-text");

  const unpublished = toToolResult({ content: { verdict: "x" } }, plainRow);
  assert.strictEqual(unpublished.structuredContent, undefined,
    "structuredContent must never be sent for a tool that published no outputSchema -- the client validates one against the other");
  results.push("no-outputschema-means-no-structuredcontent");

  const nonTerminal = toToolResult({ status: "in_progress", job_id: "abc" }, schemaRow);
  assert.ok(/in_progress/.test(nonTerminal.content[0].text),
    "a non-terminal executor return must be rendered honestly, not flattened into an empty answer");
  assert.strictEqual(nonTerminal.structuredContent, undefined,
    "a non-terminal return has no schema-conforming content, so it must publish none");
  results.push("non-terminal-return-rendered-honestly");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (d) -- static invariants
// ---------------------------------------------------------------------------------------------
function partD_static() {
  const results = [];

  const ctxSrc = read("lib/request-context.js");
  const allowlist = /const ALLOWED_CALL_SOURCES = new Set\(\[([^\]]*)\]\)/.exec(ctxSrc);
  assert.ok(allowlist, "could not locate ALLOWED_CALL_SOURCES in lib/request-context.js -- re-anchor before trusting this");
  assert.ok(/'mcp'/.test(allowlist[1]),
    `ALLOWED_CALL_SOURCES does not contain 'mcp': ${allowlist[1]}`);
  results.push("call-source-allowlist-contains-mcp");

  const stripped = allowlist[1].replace(", 'mcp'", "");
  assert.notStrictEqual(stripped, allowlist[1],
    "control setup failed: the exact \", 'mcp'\" substring was not found -- fix the mutation string, not the assertion");
  assert.ok(!/'mcp'/.test(stripped), "control: stripping 'mcp' still passes the check -- it does not discriminate");
  results.push("control-stripped-allowlist-fails");

  // .claude/rules/capabilities-are-data.md: no conditional keyed to a capability slug or agent id.
  const mcpSrc = read("api/mcp.js");
  const codeOnly = mcpSrc
    .split("\n")
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");
  // `typeof x.intent_slug === 'string'` is a TYPE check, not an identity conditional, so type
  // checks are neutralised before the identity test runs. The control below proves the test still
  // catches a real one.
  const hasIdentityConditional = src => {
    const withoutTypeChecks = src.replace(/typeof\s+[\w.$[\]'"]+\s*(===|!==)\s*['"][a-z]+['"]/g, "TYPECHECK");
    return /(capability_slug|intent_slug|\bslug|agent_id)\s*(===|!==)\s*['"]/.test(withoutTypeChecks);
  };
  assert.ok(!hasIdentityConditional(codeOnly),
    "api/mcp.js contains a conditional keyed to a literal slug or agent id -- capabilities are data, never code");
  const mutated = codeOnly.replace("const row = rows.find(", "if (row.slug === 'classify-ticket') return null;\n  const row = rows.find(");
  assert.notStrictEqual(mutated, codeOnly,
    "control setup failed: the `const row = rows.find(` anchor was not found -- fix the mutation string, not the assertion");
  assert.ok(hasIdentityConditional(mutated),
    "control: a spliced-in `row.slug === 'classify-ticket'` conditional is not caught -- the check does not discriminate");
  assert.ok(/runCapability\(/.test(codeOnly),
    "api/mcp.js must call runCapability() -- it must never grow a second execution path");
  assert.ok(/runWithCallSource\(\s*['"]mcp['"]/.test(codeOnly),
    "api/mcp.js must establish call_source = 'mcp' through runWithCallSource()");
  assert.ok(/screenOrigin:\s*['"]mcp['"]/.test(codeOnly),
    "api/mcp.js must establish screen_origin = 'mcp'");
  results.push("mcp-route-is-data-driven-and-attributed");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (e) -- LIVE
// ---------------------------------------------------------------------------------------------
async function partE_live(ctx = {}) {
  const results = [];
  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (tools/list over the real capability rows; the ai_activity_log row proving a tools/call reached the executor)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured when this shipped (2026-09-09): 25 " +
        "capabilities have an active holder, 18 product-lane and 7 governance-lane; tools/list " +
        "without the key returned the 18 including bench-report-card and no governance holder, " +
        "and with the key returned all 25 including classify-ticket.",
    );
    return results;
  }
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_SERVICE_KEY = key;

  const rows = await fetchCapabilityRows();
  assert.ok(rows.length > 0, "fetchCapabilityRows() returned nothing -- the four REST reads or the join are broken");

  const product = visibleRows(rows, { governanceUnlocked: false });
  const productNames = product.map(r => r.slug);
  assert.ok(productNames.includes("bench-report-card"),
    `tools/list without the key must include bench-report-card (product lane), got ${JSON.stringify(productNames)}`);
  assert.ok(product.every(r => r.lane === "product"),
    `tools/list without the key exposed a non-product holder: ${JSON.stringify(product.filter(r => r.lane !== "product").map(r => [r.slug, r.lane]))}`);
  assert.ok(!productNames.includes("classify-ticket"),
    "classify-ticket is governance-lane and must NOT be listed without the key");
  results.push("live-product-list-excludes-governance");

  const all = visibleRows(rows, { governanceUnlocked: true }).map(r => r.slug);
  assert.ok(all.includes("classify-ticket"),
    `with the key classify-ticket must be listed, got ${JSON.stringify(all)}`);
  results.push("live-key-lists-classify-ticket");

  // Every published tool must be a legal MCP tool shape -- name charset, object schemas.
  for (const row of rows) {
    const tool = toTool(row);
    assert.ok(/^[A-Za-z0-9_.-]{1,128}$/.test(tool.name), `tool name "${tool.name}" is not a legal MCP tool name`);
    assert.strictEqual(tool.inputSchema.type, "object", `tool ${tool.name} has a non-object inputSchema`);
    if (tool.outputSchema) assert.strictEqual(tool.outputSchema.type, "object", `tool ${tool.name} published a non-object outputSchema`);
  }
  results.push("live-every-tool-is-a-legal-mcp-shape");

  // THE DISCRIMINATING HALF. The unit arm injects the executor, so it would pass even if
  // tools/call never reached runCapability(). This cannot: a call_source='mcp' row exists only if a
  // real tools/call went all the way through the executor's logging path.
  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const res = await fetch(`${base}/rest/v1/ai_activity_log?call_source=eq.mcp&select=id,ai_type,agent_id,screen_origin,created_at&order=created_at.desc&limit=1`, { headers: hdr });
  if (!res.ok) assert.fail(`ai_activity_log read failed: HTTP ${res.status} ${await res.text()}`);
  const logRows = await res.json();
  console.log(`  [MCP-3] newest call_source='mcp' row: ${JSON.stringify(logRows)}`);
  assert.strictEqual(logRows.length, 1,
    "no ai_activity_log row carries call_source = 'mcp' -- no tools/call has ever reached runCapability() through api/mcp.js");
  assert.strictEqual(logRows[0].screen_origin, "mcp",
    `the mcp row's screen_origin must be 'mcp', got ${JSON.stringify(logRows[0])}`);
  results.push("live-executor-logged-an-mcp-call");

  return results;
}

async function run() {
  const results = [];
  results.push(...(await partA_dispatcher()));
  results.push(...(await partB_laneVisibility()));
  results.push(...partC_resultShaping());
  results.push(...partD_static());
  results.push(...(await partE_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
