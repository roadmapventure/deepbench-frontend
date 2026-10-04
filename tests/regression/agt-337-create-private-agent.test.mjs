// DeepBench v7.0.762 | tests/regression/agt-337-create-private-agent.test.mjs | AGT-337 slice 1
//
// FEATURE: AGT-337 -- a user names a new agent and it is saved blank, private and live
// (ARCHITECTURE.md §19u decision 6). This slice is the server save only: lib/private-agent-create.js
// and the `create_private_agent` action on POST /api/agent-configs. An agent's own MCP address lists
// only the capabilities that agent holds, so the save also writes one knowledge capability and its
// assignment -- a save that wrote the agent row alone would publish an address with no tool on it.
//
// PURE (always run):
//   (a) the id: slug + "-" + six random characters; a name with nothing sluggable is "agent".
//   (b) readCreateInput(): the name is trimmed and 1-60 characters; a team is absent, an id, or a
//       name -- anything else is refused by name.
// FAKE fetch (always run) -- fake() records "<METHOD> <table>" per call, so each assertion names the
// exact write order:
//   (c) no team: exactly three POSTs, one activity row. A new team name: looked up, created, the
//       three POSTs, then the membership. An existing team name: joined, never re-created. A FAILED
//       CAPABILITY WRITE ENDS IN THREE DELETES and no activity row -- without the compensating
//       delete the call list would end at `POST capabilities` and leave a live agent with no tool.
//       An id collision (409) retries once with a different id.
// STATIC (always run):
//   (d) api/agent-configs.js holds the action branch and imports the module.
// LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- it CREATES and then DELETES one
// fixture agent, capability, assignment and team:
//   (e) THE DISCRIMINATOR: after a real create, the new agent's own MCP address lists exactly one
//       tool -- its knowledge capability, run by the agent-bundle handler. `finally` removes every
//       fixture row and asserts none remains.
//
// BASELINE: the file is new and RED on the unchanged tree -- lib/private-agent-create.js does not
// exist, so the first import throws.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const ROUTE_REL = "api/agent-configs.js";
const THREE_WRITES = ["POST agents", "POST capabilities", "POST agent_capability_assignments"];
const THREE_DELETES = ["DELETE agent_capability_assignments", "DELETE capabilities", "DELETE agents"];
const AGENT_COLUMNS = "id,name,role,lane,is_active,agent_origin,sharing,owner_id";

// A fetchImpl that records "<METHOD> <table>" per call. `respond` may override one answer with
// { status, json }; everything else answers the way PostgREST would on success. A created team's
// row carries `address`, exactly as the real table does, so (c) can assert it never comes back.
function fake(respond = () => null) {
  const calls = [];
  const sent = [];
  const fetchImpl = async (url, init = {}) => {
    const method = init.method || "GET";
    const table = String(url).split("/rest/v1/")[1].split("?")[0];
    const call = `${method} ${table}`;
    calls.push(call);
    const body = init.body ? JSON.parse(init.body) : null;
    sent.push({ call, url: String(url), body, headers: init.headers || {} });
    const nth = calls.filter(c => c === call).length;
    const answer = respond({ method, table, call, nth, body, url: String(url) }) || {};
    const status = answer.status ?? (method === "POST" ? 201 : 200);
    let json = answer.json;
    if (json === undefined) {
      json = method === "POST" && table === "teams"
        ? [{ id: "team-new", name: body.name, address: "secret-address" }]
        : [];
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => json,
      text: async () => JSON.stringify(json),
    };
  };
  return { fetchImpl, calls, sent };
}

function spy() {
  const seen = [];
  const log = async entry => { seen.push(entry); return { ok: true, status: 201 }; };
  return { log, seen };
}

const DEPS = { supabaseUrl: "https://fake.supabase.test", supabaseKey: "fake-key" };

// ---------------------------------------------------------------------------------------------
// PURE: the id and the input reader
// ---------------------------------------------------------------------------------------------
async function partPure(mod) {
  const results = [];
  const { agentSlug, randomSuffix, agentIdFor, readCreateInput, agentRow, knowledgeCapabilityRow } = mod;

  // (a) the id.
  assert.strictEqual(agentIdFor("Zoe Smith", "k3x9ab"), "zoe-smith-k3x9ab", "(a) agentIdFor('Zoe Smith', 'k3x9ab') is not 'zoe-smith-k3x9ab'");
  assert.strictEqual(agentSlug("  "), "agent", "(a) a blank name does not slug to 'agent'");
  assert.strictEqual(agentSlug("李"), "agent", "(a) a name with no [a-z0-9] does not slug to 'agent'");
  assert.strictEqual(agentSlug("The Quick Brown Fox Jumps Over"), "the-quick-brown-fox-jump", "(a) the slug is not cut at 24 characters");
  assert.strictEqual(agentSlug("abcdefghijklmnopqrstuvw xyz"), "abcdefghijklmnopqrstuvw", "(a) a slug cut on a separator keeps its trailing '-'");
  for (let i = 0; i < 50; i++) {
    const s = randomSuffix();
    assert.ok(/^[a-z0-9]{6}$/.test(s), `(a) randomSuffix() returned '${s}', not six of [a-z0-9]`);
  }
  results.push("id-is-slug-plus-six");

  // (b) the input reader.
  assert.deepStrictEqual(readCreateInput({ name: " Zoe " }), { name: "Zoe", team: null }, "(b) { name: ' Zoe ' } is not { name: 'Zoe', team: null }");
  assert.deepStrictEqual(readCreateInput({ name: "" }), { error: "Enter an agent name" }, "(b) an empty name is not refused");
  assert.deepStrictEqual(readCreateInput({ name: "x".repeat(61) }), { error: "Enter an agent name" }, "(b) a 61-character name is not refused");
  assert.deepStrictEqual(readCreateInput({ name: "x".repeat(60) }), { name: "x".repeat(60), team: null }, "(b) a 60-character name is refused");
  assert.deepStrictEqual(readCreateInput({ name: "Zoe", team: { name: " " } }), { error: "Enter a team name" }, "(b) a blank team name is not refused");
  assert.deepStrictEqual(readCreateInput({ name: "Zoe", team: {} }), { error: "Enter a team name" }, "(b) an empty team object is not refused");
  assert.deepStrictEqual(readCreateInput({ name: "Zoe", team: null }), { name: "Zoe", team: null }, "(b) team: null is not 'no team'");
  assert.deepStrictEqual(readCreateInput({ name: "Zoe", team: { id: "t1" } }), { name: "Zoe", team: { id: "t1" } }, "(b) a team id is not kept");
  assert.deepStrictEqual(readCreateInput({ name: "Zoe", team: { name: " Ops " } }), { name: "Zoe", team: { name: "Ops" } }, "(b) a team name is not trimmed");
  results.push("input-reader-each-branch");

  // The two rows, by value -- the save writes exactly these.
  assert.deepStrictEqual(agentRow({ id: "zoe-k3x9ab", name: "Zoe" }),
    { id: "zoe-k3x9ab", name: "Zoe", role: "New Agent", lane: "product", is_active: true, agent_origin: "customer", sharing: "private", owner_id: null },
    "agentRow() is not the blank, private, live row");
  assert.deepStrictEqual(knowledgeCapabilityRow({ id: "zoe-k3x9ab", name: "Zoe" }), {
    slug: "zoe-k3x9ab-knowledge",
    name: "Zoe's Knowledge",
    description: 'Returns everything Zoe has been taught. Pass agent_id "zoe-k3x9ab", then answer as Zoe using only what was taught.',
    execution_type: "deterministic",
    tenant_id: "global",
    default_intent_slug: "agent-bundle-intent",
  }, "knowledgeCapabilityRow() is not the agent's knowledge capability");
  results.push("rows-by-value");
  return results;
}

// ---------------------------------------------------------------------------------------------
// FAKE fetch: the write order, the compensating delete, the id retry
// ---------------------------------------------------------------------------------------------
async function partCreate(mod) {
  const results = [];
  const { createPrivateAgent, agentRow } = mod;
  const suffix = () => "k3x9ab";

  // No team: three writes, one activity row.
  {
    const f = fake();
    const s = spy();
    const out = await createPrivateAgent({ name: "Zoe" }, { ...DEPS, fetchImpl: f.fetchImpl, suffix, log: s.log });
    assert.deepStrictEqual(f.calls, THREE_WRITES, `(c) no team: the calls are ${JSON.stringify(f.calls)}`);
    assert.deepStrictEqual(out, { agent: { id: "zoe-k3x9ab", name: "Zoe" }, team: null }, "(c) no team: the result is not { agent: { id, name }, team: null }");
    assert.deepStrictEqual(f.sent[0].body, agentRow({ id: "zoe-k3x9ab", name: "Zoe" }), "(c) the agents write is not agentRow()");
    assert.deepStrictEqual(f.sent[2].body, { agent_id: "zoe-k3x9ab", capability_slug: "zoe-k3x9ab-knowledge", tenant_id: "global" },
      "(c) the assignment does not join the new agent to its own knowledge capability");
    assert.strictEqual(f.sent[0].headers.apikey, "fake-key", "(c) the write does not carry the service key it was handed");
    assert.strictEqual(s.seen.length, 1, `(c) no team: the activity log was called ${s.seen.length} times, not once`);
    assert.strictEqual(s.seen[0].aiType, "deterministic", "(c) the activity row is not `deterministic`");
    assert.strictEqual(s.seen[0].feature, "agent-create", "(c) the activity row's feature is not 'agent-create'");
    assert.ok(Number.isFinite(s.seen[0].latencyMs) && s.seen[0].latencyMs >= 0, "(c) the activity row carries no latency");
    results.push("no-team-three-writes");
  }

  // A new team name: looked up, created, then the membership last.
  {
    const f = fake();
    const s = spy();
    const out = await createPrivateAgent({ name: "Zoe", team: { name: "Ops" } }, { ...DEPS, fetchImpl: f.fetchImpl, suffix, log: s.log });
    assert.deepStrictEqual(f.calls, ["GET teams", "POST teams", ...THREE_WRITES, "POST agent_teams"], `(c) new team: the calls are ${JSON.stringify(f.calls)}`);
    assert.deepStrictEqual(out.team, { id: "team-new", name: "Ops", created: true }, "(c) new team: the result's team is not { id, name, created: true } -- `address` must never come back");
    assert.deepStrictEqual(f.sent[1].body, { name: "Ops", owner_id: null }, "(c) new team: the teams write is not { name, owner_id }");
    assert.deepStrictEqual(f.sent[5].body, { agent_id: "zoe-k3x9ab", team_id: "team-new" }, "(c) new team: the membership does not join the agent to the team");
    assert.ok(!f.sent.some(c => c.url.includes("address")), "(c) a request asked the database for teams.address");
    results.push("new-team-created-then-joined");
  }

  // An existing team name is joined, never re-created.
  {
    const f = fake(({ call }) => (call === "GET teams" ? { json: [{ id: "team-old", name: "Ops" }] } : null));
    const s = spy();
    const out = await createPrivateAgent({ name: "Zoe", team: { name: "Ops" } }, { ...DEPS, fetchImpl: f.fetchImpl, suffix, log: s.log });
    assert.ok(!f.calls.includes("POST teams"), "(c) an existing team name was created again");
    assert.deepStrictEqual(f.calls, ["GET teams", ...THREE_WRITES, "POST agent_teams"], `(c) existing team: the calls are ${JSON.stringify(f.calls)}`);
    assert.deepStrictEqual(out.team, { id: "team-old", name: "Ops", created: false }, "(c) existing team: `created` is not false");
    results.push("existing-team-joined");
  }

  // A team id nobody holds: refused 404 before any write.
  {
    const f = fake();
    const s = spy();
    await assert.rejects(
      createPrivateAgent({ name: "Zoe", team: { id: "nope" } }, { ...DEPS, fetchImpl: f.fetchImpl, suffix, log: s.log }),
      e => e.message === "Team not found" && e.status === 404,
      "(c) an unknown team id does not reject with 'Team not found' / status 404");
    assert.deepStrictEqual(f.calls, ["GET teams"], "(c) an unknown team id still wrote something");
    results.push("unknown-team-refused");
  }

  // THE COMPENSATING DELETE: a failed capability write removes what was written.
  {
    const f = fake(({ call }) => (call === "POST capabilities" ? { status: 500, json: { message: "boom" } } : null));
    const s = spy();
    await assert.rejects(
      createPrivateAgent({ name: "Zoe" }, { ...DEPS, fetchImpl: f.fetchImpl, suffix, log: s.log }),
      "(c) a failed capability write did not reject");
    assert.deepStrictEqual(f.calls.slice(-3), THREE_DELETES,
      `(c) a failed capability write does not end in the three deletes -- the calls are ${JSON.stringify(f.calls)}`);
    assert.deepStrictEqual(f.calls, ["POST agents", "POST capabilities", ...THREE_DELETES], "(c) the failed save made a call outside the write and its undo");
    assert.ok(f.sent[4].url.includes("agents?id=eq.zoe-k3x9ab"), "(c) the agents delete is not scoped to the id this call wrote");
    assert.strictEqual(s.seen.length, 0, "(c) a failed save still wrote an activity row");
    results.push("failed-write-compensated");
  }

  // A team this call created is removed with the rest.
  {
    const f = fake(({ call }) => (call === "POST agent_teams" ? { status: 500, json: { message: "boom" } } : null));
    const s = spy();
    await assert.rejects(createPrivateAgent({ name: "Zoe", team: { name: "Ops" } }, { ...DEPS, fetchImpl: f.fetchImpl, suffix, log: s.log }));
    assert.deepStrictEqual(f.calls.slice(-4), [...THREE_DELETES, "DELETE teams"], `(c) a team this call created was not removed -- the calls are ${JSON.stringify(f.calls)}`);
    results.push("created-team-compensated");
  }

  // An id collision retries once, with a different id.
  {
    const suffixes = ["aaaaaa", "bbbbbb"];
    const f = fake(({ call, nth }) => (call === "POST agents" && nth === 1 ? { status: 409, json: { message: "duplicate key" } } : null));
    const s = spy();
    const out = await createPrivateAgent({ name: "Zoe" }, { ...DEPS, fetchImpl: f.fetchImpl, suffix: () => suffixes.shift(), log: s.log });
    const agentPosts = f.sent.filter(c => c.call === "POST agents");
    assert.strictEqual(agentPosts.length, 2, `(c) a 409 led to ${agentPosts.length} agents writes, not two`);
    assert.notStrictEqual(agentPosts[0].body.id, agentPosts[1].body.id, "(c) the retry reused the colliding id");
    assert.strictEqual(out.agent.id, "zoe-bbbbbb", "(c) the result does not carry the id that was actually saved");
    assert.strictEqual(f.sent[2].body.slug, "zoe-bbbbbb-knowledge", "(c) the capability was not written under the retried id");
    results.push("id-collision-retried-once");
  }

  // A log that throws never fails the save.
  {
    const f = fake();
    const out = await createPrivateAgent({ name: "Zoe" }, { ...DEPS, fetchImpl: f.fetchImpl, suffix, log: async () => { throw new Error("log down"); } });
    assert.strictEqual(out.agent.id, "zoe-k3x9ab", "(c) a throwing activity log failed the save");
    results.push("log-failure-never-fails-the-save");
  }
  return results;
}

// ---------------------------------------------------------------------------------------------
// STATIC
// ---------------------------------------------------------------------------------------------
function partStatic() {
  const route = read(ROUTE_REL);
  assert.ok(route.includes('action === "create_private_agent"'), `${ROUTE_REL}: no \`action === "create_private_agent"\` branch`);
  assert.ok(route.includes('from "../lib/private-agent-create.js"'), `${ROUTE_REL}: does not import ../lib/private-agent-create.js`);
  return ["route-holds-the-action"];
}

// ---------------------------------------------------------------------------------------------
// LIVE (service key) -- creates one fixture and removes it
// ---------------------------------------------------------------------------------------------
async function partLive(mod) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun("the live create: the saved agent row, its one MCP tool, its team membership, and the fixture cleanup",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set -- this arm writes, so it needs the service key");
    return [];
  }
  const results = [];
  const { createPrivateAgent, agentRow, randomSuffix } = mod;
  const rest = `${base.replace(/\/+$/, "")}/rest/v1/`;
  const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const get = async q => {
    const res = await fetch(rest + q, { headers: hdr });
    assert.ok(res.ok, `${q.split("?")[0]} -> HTTP ${res.status}`);
    return res.json();
  };
  const del = q => fetch(rest + q, { method: "DELETE", headers: { ...hdr, Prefer: "return=minimal" } });

  const s = spy();
  let id = null;
  let teamId = null;
  try {
    const out = await createPrivateAgent(
      { name: "Agt337 Fixture", team: { name: "agt337-" + randomSuffix() } },
      { supabaseUrl: base, supabaseKey: key, log: s.log });
    id = out.agent.id;
    teamId = out.team && out.team.id;
    assert.strictEqual(out.team.created, true, "(e) the fixture team was not created by this call");

    const agents = await get(`agents?id=eq.${encodeURIComponent(id)}&select=${AGENT_COLUMNS}`);
    assert.strictEqual(agents.length, 1, `(e) ${agents.length} agents rows carry the new id, not 1`);
    assert.deepStrictEqual(agents[0], agentRow({ id, name: "Agt337 Fixture" }), "(e) the saved agents row is not agentRow()");
    results.push("live-agent-row-saved");

    // THE DISCRIMINATOR: the agent's own MCP address lists exactly one tool.
    const { visibleRows, fetchCapabilityRows } = await import("../../api/_lib/mcp.js");
    const tools = visibleRows(await fetchCapabilityRows(), { governanceUnlocked: false, agentId: id });
    assert.strictEqual(tools.length, 1, `(e) the new agent's MCP address lists ${tools.length} tools, not exactly 1`);
    assert.strictEqual(tools[0].slug, id + "-knowledge", `(e) the one tool is '${tools[0].slug}', not the agent's knowledge capability`);
    assert.strictEqual(tools[0].handler, "agent-bundle", `(e) the one tool's handler is '${tools[0].handler}', not 'agent-bundle'`);
    results.push("live-mcp-address-lists-one-tool");

    const memberships = await get(`agent_teams?agent_id=eq.${encodeURIComponent(id)}&select=agent_id,team_id`);
    assert.strictEqual(memberships.length, 1, `(e) ${memberships.length} agent_teams rows, not 1`);
    results.push("live-team-membership");
  } finally {
    if (id) {
      await del(`agent_capability_assignments?agent_id=eq.${encodeURIComponent(id)}`);
      await del(`capabilities?slug=eq.${encodeURIComponent(id + "-knowledge")}`);
      await del(`agents?id=eq.${encodeURIComponent(id)}`);
    }
    if (teamId) await del(`teams?id=eq.${encodeURIComponent(teamId)}`);
  }
  if (id) {
    const left = await get(`agents?id=eq.${encodeURIComponent(id)}&select=id`);
    assert.strictEqual(left.length, 0, `(e) ${left.length} fixture agents rows remain after cleanup`);
    results.push("live-fixture-removed");
  }
  return results;
}

async function run() {
  const results = [];
  const mod = await import("../../lib/private-agent-create.js");
  results.push(...(await partPure(mod)));
  results.push(...(await partCreate(mod)));
  results.push(...partStatic());
  results.push(...(await partLive(mod)));
  return results;
}

selfRun(import.meta.url, run);
export default run;
