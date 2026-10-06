// DeepBench v7.0.792 | tests/regression/agt-338-team-address.test.mjs | AGT-390 -- the team address lists each member's Knowledge and Teach tools (four); cleanup removes and checks both slugs
// DeepBench v7.0.766 | tests/regression/agt-338-team-address.test.mjs | AGT-338 slice 1
//
// FEATURE: AGT-338 -- a team has one MCP address. A tester connects her team's address once and sees
// one tool per agent on the team; an agent added later appears on the same connection. This slice is
// the server side only: api/_lib/mcp.js resolves the address segment to a SET of agent ids
// (resolveAddress), visibleRows() narrows to that set AFTER the lane rule, and `initialize` on a
// non-admin address names the agents available on the connection (connectionInstructions).
//
// PURE (always run):
//   (a) resolveAddress(): no `agent` value is the admin address (null); an empty or repeated value is
//       the empty list, never null; ONLY 64 lowercase hex asks the team reader -- everything else is
//       one agent id and the reader is never called; a failed team read rejects.
//   (b) THE DISCRIMINATOR: visibleRows() with `agentIds: ["fx-a", "fx-b"]` returns exactly 3 slugs.
//       The unchanged visibleRows() ignores `agentIds` and returns all 4 product rows.
//   (c) connectionInstructions(): unscoped is the base text byte for byte; scoped names each distinct
//       agent once, in row order; scoped and empty says so. `initialize` uses deps.instructions.
// LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- it CREATES and then DELETES three
// fixture agents (two on one fixture team, one on none):
//   (d) the real team address resolves to exactly the two members and lists exactly their two tools;
//       `finally` removes every fixture row and asserts none remains. No message prints the address.
//
// BASELINE: the file is new and RED on the unchanged tree -- api/_lib/mcp.js exports no
// resolveAddress, and underneath that the unchanged visibleRows() returns 4 where (b) demands 3.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import * as mcp from "../../api/_lib/mcp.js";

const H = "a".repeat(64);
const ADDRESS_SHAPE = /^[0-9a-f]{64}$/;

const row = (slug, agent_id, agent_name, lane) => ({ slug, agent_id, agent_name, lane });
const ROWS = [
  row("fx-a-knowledge", "fx-a", "Fixture A", "product"),
  row("fx-a-second", "fx-a", "Fixture A", "product"),
  row("fx-b-knowledge", "fx-b", "Fixture B", "product"),
  row("fx-c-knowledge", "fx-c", "Fixture C", "product"),
  row("fx-g-knowledge", "fx-g", "Fixture G", "governance"),
];

function teamSpy() {
  const calls = [];
  const readTeam = async address => { calls.push(address); return ["fx-a", "fx-b"]; };
  return { readTeam, calls };
}

const slugs = rows => rows.map(r => r.slug);

// ---------------------------------------------------------------------------------------------
// (a) PURE: which agents an address names
// ---------------------------------------------------------------------------------------------
async function partResolve() {
  const { resolveAddress } = mcp;
  assert.strictEqual(typeof resolveAddress, "function", "(a) api/_lib/mcp.js does not export resolveAddress()");
  const s = teamSpy();

  assert.strictEqual(await resolveAddress(undefined, s.readTeam), null, "(a) no query is not the admin address (null)");
  assert.strictEqual(await resolveAddress({ transport: "mcp" }, s.readTeam), null, "(a) a query with no `agent` value is not the admin address (null)");
  assert.deepStrictEqual(await resolveAddress({ agent: "zoe-smith-k3x9ab" }, s.readTeam), ["zoe-smith-k3x9ab"], "(a) an agent id does not resolve to that one agent");
  assert.deepStrictEqual(await resolveAddress({ agent: H.toUpperCase() }, s.readTeam), [H.toUpperCase()], "(a) 64 UPPERCASE hex is not read as one agent id");
  assert.deepStrictEqual(await resolveAddress({ agent: "a".repeat(63) }, s.readTeam), ["a".repeat(63)], "(a) 63 hex characters is not read as one agent id");
  assert.deepStrictEqual(await resolveAddress({ agent: "" }, s.readTeam), [], "(a) an empty `agent` value is not the empty list -- null here would turn a malformed address into the admin address");
  assert.deepStrictEqual(await resolveAddress({ agent: ["a", "b"] }, s.readTeam), [], "(a) a repeated `agent` value is not the empty list");
  assert.strictEqual(s.calls.length, 0, `(a) the team reader was called ${s.calls.length} time(s) for addresses that are not 64 lowercase hex`);

  assert.deepStrictEqual(await resolveAddress({ agent: H }, s.readTeam), ["fx-a", "fx-b"], "(a) 64 lowercase hex does not resolve to the team reader's agents");
  assert.deepStrictEqual(s.calls, [H], "(a) the team reader was not called exactly once with the address");

  await assert.rejects(
    resolveAddress({ agent: H }, async () => { throw new Error("team read down"); }),
    "(a) a failed team read did not reject -- it must be an error, never an empty or an admin list");
  return ["only-64-lowercase-hex-asks-the-team-reader", "empty-is-empty-never-admin", "failed-team-read-rejects"];
}

// ---------------------------------------------------------------------------------------------
// (b) PURE: the one visibility function narrows to a set -- THE DISCRIMINATOR
// ---------------------------------------------------------------------------------------------
function partVisible() {
  const { visibleRows } = mcp;

  const team = visibleRows(ROWS, { governanceUnlocked: false, agentIds: ["fx-a", "fx-b"] });
  assert.deepStrictEqual(slugs(team), ["fx-a-knowledge", "fx-a-second", "fx-b-knowledge"],
    `(b) DISCRIMINATOR: agentIds ["fx-a", "fx-b"] lists ${team.length} tools (${slugs(team).join(", ")}), not exactly the 3 those two agents hold`);

  const keyless = visibleRows(ROWS, { governanceUnlocked: false, agentIds: ["fx-a", "fx-g"] });
  assert.deepStrictEqual(slugs(keyless), ["fx-a-knowledge", "fx-a-second"],
    `(b) a governance team member is listed without the key -- ${slugs(keyless).join(", ")}`);
  const keyed = visibleRows(ROWS, { governanceUnlocked: true, agentIds: ["fx-a", "fx-g"] });
  assert.deepStrictEqual(slugs(keyed), ["fx-a-knowledge", "fx-a-second", "fx-g-knowledge"],
    `(b) with the key the governance team member's tool is not listed -- ${slugs(keyed).join(", ")}`);

  assert.strictEqual(visibleRows(ROWS, { governanceUnlocked: false, agentIds: [] }).length, 0, "(b) an empty agent list still lists tools");
  assert.strictEqual(visibleRows(ROWS, { governanceUnlocked: false, agentIds: null }).length, 4, "(b) agentIds: null (the admin address) does not list the 4 product tools");
  assert.deepStrictEqual(slugs(visibleRows(ROWS, { governanceUnlocked: false, agentId: "fx-b" })), ["fx-b-knowledge"],
    "(b) the existing `agentId` option no longer narrows to that one agent");
  return ["DISCRIMINATOR-team-lists-exactly-three", "lane-rule-applies-to-team-members", "agentId-callers-unchanged"];
}

// ---------------------------------------------------------------------------------------------
// (c) PURE: who is available on this connection
// ---------------------------------------------------------------------------------------------
async function partInstructions() {
  const { connectionInstructions, visibleRows, dispatchJsonRpc } = mcp;
  assert.strictEqual(typeof connectionInstructions, "function", "(c) api/_lib/mcp.js does not export connectionInstructions()");
  const init = { jsonrpc: "2.0", id: 1, method: "initialize", params: {} };

  const base = (await dispatchJsonRpc(init)).result.instructions;
  assert.ok(typeof base === "string" && base.length > 0, "(c) `initialize` with no deps returns no instructions");

  assert.strictEqual(connectionInstructions(ROWS, false), base, "(c) an unscoped connection's instructions are not the base text byte for byte");
  const team = visibleRows(ROWS, { governanceUnlocked: false, agentIds: ["fx-a", "fx-b"] });
  assert.strictEqual(connectionInstructions(team, true),
    base + " Agents available on this connection: Fixture A, Fixture B. When the user names one, call that agent's tool.",
    "(c) a team connection does not name each agent once, in row order");
  assert.strictEqual(connectionInstructions([], true), base + " No agent is available at this address.",
    "(c) an address with no agent does not say so");

  const out = await dispatchJsonRpc(init, { instructions: async () => "X" });
  assert.strictEqual(out.result.instructions, "X", "(c) `initialize` ignores deps.instructions");
  return ["roster-sentence-by-value", "initialize-uses-deps-instructions"];
}

// ---------------------------------------------------------------------------------------------
// (d) LIVE (service key) -- creates three fixture agents and one team, and removes them
// ---------------------------------------------------------------------------------------------
async function partLive() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun("the live team address: two fixture agents on one team, the address resolving to exactly those two, their two MCP tools, and the fixture cleanup",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set -- this arm writes, so it needs the service key");
    return [];
  }
  const results = [];
  const { resolveAddress, visibleRows, fetchCapabilityRows, connectionInstructions } = mcp;
  const { createPrivateAgent, randomSuffix } = await import("../../lib/private-agent-create.js");
  const rest = `${base.replace(/\/+$/, "")}/rest/v1/`;
  const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const get = async q => {
    const res = await fetch(rest + q, { headers: hdr });
    assert.ok(res.ok, `${q.split("?")[0]} -> HTTP ${res.status}`);
    return res.json();
  };
  const del = q => fetch(rest + q, { method: "DELETE", headers: { ...hdr, Prefer: "return=minimal" } });
  const log = async () => ({ ok: true, status: 201 });
  const deps = { supabaseUrl: base, supabaseKey: key, log };

  const ids = [];
  let teamId = null;
  try {
    const one = await createPrivateAgent({ name: "Agt338 One", team: { name: "agt338-" + randomSuffix() } }, deps);
    ids.push(one.agent.id);
    teamId = one.team && one.team.id;
    assert.ok(teamId, "(d) the first fixture agent came back with no team id");
    const two = await createPrivateAgent({ name: "Agt338 Two", team: { id: teamId } }, deps);
    ids.push(two.agent.id);
    const out = await createPrivateAgent({ name: "Agt338 Out" }, deps);
    ids.push(out.agent.id);

    // The address is read here with the service key and never printed: every message below is fixed text.
    const teams = await get(`teams?id=eq.${encodeURIComponent(teamId)}&select=address`);
    assert.strictEqual(teams.length, 1, `(d) ${teams.length} teams rows carry the fixture team's id, not 1`);
    const address = teams[0].address;
    assert.ok(typeof address === "string" && ADDRESS_SHAPE.test(address), "(d) the fixture team's address is not 64 lowercase hex");
    results.push("live-team-address-shape");

    const agentIds = await resolveAddress({ agent: address });
    const members = [ids[0], ids[1]].sort();
    assert.ok(Array.isArray(agentIds), "(d) the team address did not resolve to a list");
    assert.deepStrictEqual(agentIds.slice().sort(), members, "(d) the team address does not resolve to exactly the two fixture members");
    results.push("live-address-resolves-to-the-two-members");

    const tools = visibleRows(await fetchCapabilityRows(), { governanceUnlocked: false, agentIds });
    assert.strictEqual(tools.length, 4, `(d) the team address lists ${tools.length} tools, not exactly 4`);
    assert.deepStrictEqual(slugs(tools).sort(), members.flatMap(id => [id + "-knowledge", id + "-teach"]),
      "(d) the four tools are not the two members' knowledge and Teach capabilities");
    assert.ok(connectionInstructions(tools, true).endsWith("Agt338 One, Agt338 Two. When the user names one, call that agent's tool."),
      "(d) the connection's instructions do not end by naming the two fixture agents");
    results.push("live-team-address-lists-two-tools");
  } finally {
    for (const id of ids) {
      await del(`agent_capability_assignments?agent_id=eq.${encodeURIComponent(id)}`);
      await del(`capabilities?slug=in.(${encodeURIComponent(id + "-knowledge")},${encodeURIComponent(id + "-teach")})`);
      await del(`agents?id=eq.${encodeURIComponent(id)}`);
    }
    if (teamId) await del(`teams?id=eq.${encodeURIComponent(teamId)}`);
  }
  for (const id of ids) {
    const left = await get(`agents?id=eq.${encodeURIComponent(id)}&select=id`);
    assert.strictEqual(left.length, 0, `(d) ${left.length} fixture agents rows remain after cleanup`);
    const caps = await get(`capabilities?slug=in.(${encodeURIComponent(id + "-knowledge")},${encodeURIComponent(id + "-teach")})&select=slug`);
    assert.strictEqual(caps.length, 0, `(d) ${caps.length} fixture capabilities rows remain after cleanup`);
    const held = await get(`agent_capability_assignments?agent_id=eq.${encodeURIComponent(id)}&select=agent_id`);
    assert.strictEqual(held.length, 0, `(d) ${held.length} fixture assignment rows remain after cleanup`);
  }
  if (teamId) {
    const left = await get(`teams?id=eq.${encodeURIComponent(teamId)}&select=id`);
    assert.strictEqual(left.length, 0, `(d) ${left.length} fixture teams rows remain after cleanup`);
  }
  results.push("live-fixtures-removed");
  return results;
}

async function run() {
  const results = [];
  results.push(...(await partResolve()));
  results.push(...partVisible());
  results.push(...(await partInstructions()));
  results.push(...(await partLive()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
