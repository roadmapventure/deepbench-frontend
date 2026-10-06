// DeepBench v7.0.790 | tests/regression/agt-386-add-player.test.mjs | AGT-386 -- Add a player lands on
// the new agent's file; a private agent joins a team from its badge; the Personnel file carries the
// Bench breadcrumb; the Connect button reads "Connect to AI"; Delete Agent archives (is_active false,
// nothing deleted) and the roster fences an archived private agent out.
//
// OFFLINE throughout. fake() is agt-337-create-private-agent's: it records "<METHOD> <table>" per
// call, so every assertion names the exact call order. Every arm carries a CONTROL that must fail
// (or flip) -- a check that passes on both sides proves nothing.
//   (a) the three readers: readAgentIdInput, readAddToTeamInput (and readCreateInput unchanged).
//   (b) addAgentToTeam by id: GET agents, GET teams, POST agent_teams, DELETE agent_teams (team_id=neq.);
//       no `address` in the result.
//   (c) by a new name: GET agents, GET teams ([]), POST teams, POST agent_teams, DELETE agent_teams.
//   (d) no agent: 404 `Agent not found` after GET agents alone.
//   (e) unknown team id: 404 `Team not found`.
//   (f) POST agent_teams fails on a new team: the team is removed (DELETE teams), the call rejects.
//   (g) archivePrivateAgent: ONE PATCH agents, fenced on sharing + agent_origin, body is_active false;
//       an empty answer is 404.
//   (h) buildRoster() drops an archived private row (and a code-array private agent's entry), keeps
//       an active one and an inactive non-private one.
//   (i)-(m) STATIC on the RAW files: the route, PersonnelScreen, BenchNav, BenchNewScreen, §19u.
//
// BASELINE: RED on the unchanged tree -- lib/private-agent-create.js has no readAgentIdInput, so (a)
// throws first; every later arm is red on its own too (old label, `|| agents[0]`, roster landing,
// buildRoster keeps an archived private row).

process.env.VITE_SUPABASE_URL ||= "http://localhost";
process.env.VITE_SUPABASE_ANON_KEY ||= "regression-placeholder";

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const count = (hay, needle) => hay.split(needle).length - 1;

const ROUTE_REL = "api/agent-configs.js";
const PERSONNEL_REL = "src/screens/PersonnelScreen.jsx";
const NAV_REL = "src/components/BenchNav.jsx";
const NEW_REL = "src/screens/BenchNewScreen.jsx";
const ARCH_REL = "docs/ARCHITECTURE.md";

const DEPS = { supabaseUrl: "https://fake.supabase.test", supabaseKey: "fake-key" };
const AGENT_ROW = [{ id: "zoe-k3x9ab" }];

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
    return { ok: status >= 200 && status < 300, status, json: async () => json, text: async () => JSON.stringify(json) };
  };
  return { fetchImpl, calls, sent };
}

// ── (a) the readers ─────────────────────────────────────────────────────────────────────────
function armA(mod) {
  const { readAgentIdInput, readAddToTeamInput, readCreateInput } = mod;
  assert.strictEqual(typeof readAgentIdInput, "function", "(a) lib/private-agent-create.js does not export readAgentIdInput");
  assert.strictEqual(typeof readAddToTeamInput, "function", "(a) lib/private-agent-create.js does not export readAddToTeamInput");
  assert.deepStrictEqual(readAgentIdInput({ agent_id: " zoe-k3x9ab " }), { agentId: "zoe-k3x9ab" }, "(a) agent_id is not trimmed");
  // CONTROLS: each refusal.
  for (const body of [{}, { agent_id: "  " }, { agent_id: 5 }, null]) {
    assert.deepStrictEqual(readAgentIdInput(body), { error: "agent_id required" }, `(a) ${JSON.stringify(body)} is not refused`);
  }
  assert.deepStrictEqual(readAddToTeamInput({ agent_id: "zoe", team: { id: "t1" } }), { agentId: "zoe", team: { id: "t1" } }, "(a) a team id is not kept");
  assert.deepStrictEqual(readAddToTeamInput({ agent_id: "zoe", team: { name: " Ops " } }), { agentId: "zoe", team: { name: "Ops" } }, "(a) a team name is not trimmed");
  for (const team of [undefined, null, {}, { name: " " }]) {
    assert.deepStrictEqual(readAddToTeamInput({ agent_id: "zoe", team }), { error: "Enter a team name" }, `(a) team ${JSON.stringify(team)} is not refused`);
  }
  assert.deepStrictEqual(readAddToTeamInput({ team: { id: "t1" } }), { error: "agent_id required" }, "(a) a missing agent_id is not refused");
  // readCreateInput is unchanged by the hoist.
  assert.deepStrictEqual(readCreateInput({ name: "Zoe", team: { name: " Ops " } }), { name: "Zoe", team: { name: "Ops" } }, "(a) readCreateInput changed");
  assert.deepStrictEqual(readCreateInput({ name: "Zoe", team: {} }), { error: "Enter a team name" }, "(a) readCreateInput changed");
  return ["a-readers"];
}

// ── (b)-(f) addAgentToTeam ──────────────────────────────────────────────────────────────────
async function armAddToTeam(mod) {
  const { addAgentToTeam } = mod;
  assert.strictEqual(typeof addAgentToTeam, "function", "(b) lib/private-agent-create.js does not export addAgentToTeam");
  const results = [];

  // (b) by id.
  {
    const f = fake(({ call }) => (call === "GET agents" ? { json: AGENT_ROW } : call === "GET teams" ? { json: [{ id: "t1", name: "Ops" }] } : null));
    const out = await addAgentToTeam({ agentId: "zoe-k3x9ab", team: { id: "t1" } }, { ...DEPS, fetchImpl: f.fetchImpl });
    assert.deepStrictEqual(f.calls, ["GET agents", "GET teams", "POST agent_teams", "DELETE agent_teams"], `(b) by id: the calls are ${JSON.stringify(f.calls)}`);
    const agentsGet = f.sent[0].url;
    for (const q of ["id=eq.zoe-k3x9ab", "sharing=eq.private", "agent_origin=eq.customer", "is_active=eq.true"]) {
      assert.ok(agentsGet.includes(q), `(b) the agents read lacks ${q}`);
    }
    assert.deepStrictEqual(f.sent[2].body, { agent_id: "zoe-k3x9ab", team_id: "t1" }, "(b) the membership body is not { agent_id, team_id }");
    assert.ok(f.sent[2].url.includes("on_conflict=agent_id,team_id"), "(b) the membership insert is not on_conflict=agent_id,team_id");
    assert.ok(String(f.sent[2].headers.Prefer).includes("resolution=ignore-duplicates"), "(b) the membership insert does not ignore duplicates");
    assert.ok(f.sent[3].url.includes("agent_id=eq.zoe-k3x9ab") && f.sent[3].url.includes("team_id=neq.t1"),
      `(b) the DELETE is not the agent's OTHER memberships: ${f.sent[3].url}`);
    assert.deepStrictEqual(out, { agent: { id: "zoe-k3x9ab" }, team: { id: "t1", name: "Ops" } }, `(b) the result is ${JSON.stringify(out)}`);
    assert.ok(!JSON.stringify(out).includes("address"), "(b) the result carries address");
    assert.ok(!f.sent.some(c => c.url.includes("address")), "(b) a request asked for address");
    // CONTROL: the same call with no agent row must not produce the success list.
    const c = fake(({ call }) => (call === "GET teams" ? { json: [{ id: "t1", name: "Ops" }] } : null));
    await addAgentToTeam({ agentId: "zoe-k3x9ab", team: { id: "t1" } }, { ...DEPS, fetchImpl: c.fetchImpl }).catch(() => {});
    assert.notDeepStrictEqual(c.calls, f.calls, "(b) CONTROL: a missing agent still wrote the membership");
    results.push("b-by-id");
  }

  // (c) by a new name.
  {
    const f = fake(({ call }) => (call === "GET agents" ? { json: AGENT_ROW } : null));
    const out = await addAgentToTeam({ agentId: "zoe-k3x9ab", team: { name: "Ops" } }, { ...DEPS, fetchImpl: f.fetchImpl });
    assert.deepStrictEqual(f.calls, ["GET agents", "GET teams", "POST teams", "POST agent_teams", "DELETE agent_teams"], `(c) new name: the calls are ${JSON.stringify(f.calls)}`);
    assert.deepStrictEqual(out, { agent: { id: "zoe-k3x9ab" }, team: { id: "team-new", name: "Ops" } }, `(c) the result is ${JSON.stringify(out)}`);
    assert.ok(!JSON.stringify(out).includes("address"), "(c) the created team's address came back");
    assert.ok(f.sent[4].url.includes("team_id=neq.team-new"), "(c) the DELETE does not keep the new team");
    // CONTROL: an existing team of that name is joined, never created.
    const c = fake(({ call }) => (call === "GET agents" ? { json: AGENT_ROW } : call === "GET teams" ? { json: [{ id: "t9", name: "Ops" }] } : null));
    await addAgentToTeam({ agentId: "zoe-k3x9ab", team: { name: "Ops" } }, { ...DEPS, fetchImpl: c.fetchImpl });
    assert.ok(!c.calls.includes("POST teams"), "(c) CONTROL: an existing team name was created again");
    results.push("c-by-new-name");
  }

  // (d) no agent.
  {
    const f = fake();
    await assert.rejects(addAgentToTeam({ agentId: "nobody", team: { id: "t1" } }, { ...DEPS, fetchImpl: f.fetchImpl }),
      e => e.message === "Agent not found" && e.status === 404, "(d) a missing agent is not 404 'Agent not found'");
    assert.deepStrictEqual(f.calls, ["GET agents"], `(d) a missing agent made more calls: ${JSON.stringify(f.calls)}`);
    results.push("d-no-agent-404");
  }

  // (e) unknown team id.
  {
    const f = fake(({ call }) => (call === "GET agents" ? { json: AGENT_ROW } : null));
    await assert.rejects(addAgentToTeam({ agentId: "zoe-k3x9ab", team: { id: "nope" } }, { ...DEPS, fetchImpl: f.fetchImpl }),
      e => e.message === "Team not found" && e.status === 404, "(e) an unknown team id is not 404 'Team not found'");
    assert.deepStrictEqual(f.calls, ["GET agents", "GET teams"], `(e) an unknown team still wrote: ${JSON.stringify(f.calls)}`);
    results.push("e-unknown-team-404");
  }

  // (f) the membership fails on a team this call created: the team is removed.
  {
    const f = fake(({ call }) => (call === "GET agents" ? { json: AGENT_ROW } : call === "POST agent_teams" ? { status: 500, json: { message: "boom" } } : null));
    await assert.rejects(addAgentToTeam({ agentId: "zoe-k3x9ab", team: { name: "Ops" } }, { ...DEPS, fetchImpl: f.fetchImpl }), "(f) a failed membership did not reject");
    assert.deepStrictEqual(f.calls, ["GET agents", "GET teams", "POST teams", "POST agent_teams", "DELETE teams"], `(f) the calls are ${JSON.stringify(f.calls)}`);
    assert.ok(f.sent[4].url.includes("teams?id=eq.team-new"), "(f) the DELETE is not scoped to the created team");
    // CONTROL: an existing team is never deleted on the same failure.
    const c = fake(({ call }) => (call === "GET agents" ? { json: AGENT_ROW } : call === "GET teams" ? { json: [{ id: "t1", name: "Ops" }] } : call === "POST agent_teams" ? { status: 500, json: {} } : null));
    await assert.rejects(addAgentToTeam({ agentId: "zoe-k3x9ab", team: { id: "t1" } }, { ...DEPS, fetchImpl: c.fetchImpl }));
    assert.ok(!c.calls.includes("DELETE teams"), "(f) CONTROL: an existing team was deleted on a failed membership");
    results.push("f-created-team-compensated");
  }
  return results;
}

// ── (g) archivePrivateAgent ─────────────────────────────────────────────────────────────────
async function armG(mod) {
  const { archivePrivateAgent } = mod;
  assert.strictEqual(typeof archivePrivateAgent, "function", "(g) lib/private-agent-create.js does not export archivePrivateAgent");
  const f = fake(({ call }) => (call === "PATCH agents" ? { json: AGENT_ROW } : null));
  const out = await archivePrivateAgent({ agentId: "zoe-k3x9ab" }, { ...DEPS, fetchImpl: f.fetchImpl });
  assert.deepStrictEqual(f.calls, ["PATCH agents"], `(g) archive made ${JSON.stringify(f.calls)}, not one PATCH`);
  for (const q of ["id=eq.zoe-k3x9ab", "sharing=eq.private", "agent_origin=eq.customer", "select=id"]) {
    assert.ok(f.sent[0].url.includes(q), `(g) the PATCH url lacks ${q}`);
  }
  assert.strictEqual(JSON.stringify(f.sent[0].body), '{"is_active":false}', `(g) the PATCH body is ${JSON.stringify(f.sent[0].body)}`);
  assert.ok(String(f.sent[0].headers.Prefer).includes("return=representation"), "(g) the PATCH does not ask for the row back");
  assert.deepStrictEqual(out, { agent: { id: "zoe-k3x9ab", is_active: false } }, `(g) the result is ${JSON.stringify(out)}`);
  // CONTROL: nothing matched (not private, not customer, no such id) -> 404, still one call.
  const c = fake();
  await assert.rejects(archivePrivateAgent({ agentId: "brittany" }, { ...DEPS, fetchImpl: c.fetchImpl }),
    e => e.message === "Agent not found" && e.status === 404, "(g) CONTROL: an empty PATCH answer is not 404 'Agent not found'");
  assert.deepStrictEqual(c.calls, ["PATCH agents"], "(g) CONTROL: a 404 archive made another call");
  return ["g-archive-one-patch"];
}

// ── (h) the roster fence ────────────────────────────────────────────────────────────────────
async function armH() {
  const { buildRoster, isArchivedPrivate } = await import("../../src/hooks/useAgents.js");
  const { AGENTS } = await import("../../src/data/agents.js");
  assert.strictEqual(typeof isArchivedPrivate, "function", "(h) useAgents.js does not export isArchivedPrivate");
  const ids = rows => rows.map(a => a.id);
  const archived = buildRoster(AGENTS, [{ id: "zed", name: "Zed", sharing: "private", is_active: false }]);
  assert.ok(!ids(archived).includes("zed"), "(h) an archived private row reached the roster");
  // CONTROL: the same row active is kept.
  const active = buildRoster(AGENTS, [{ id: "zed", name: "Zed", sharing: "private", is_active: true }]);
  assert.ok(ids(active).includes("zed"), "(h) CONTROL: an active private row was dropped");
  // A code-array private agent's entry goes with its archived row.
  assert.ok(ids(AGENTS).includes("brittany"), "(h) fixture: brittany is not in AGENTS");
  assert.ok(!ids(buildRoster(AGENTS, [{ id: "brittany", sharing: "private", is_active: false }])).includes("brittany"),
    "(h) an archived private row did not drop its AGENTS entry (brittany)");
  // An inactive NON-private row is unchanged: kept, is_active carried.
  const dan = buildRoster(AGENTS, [{ id: "dan", is_active: false }]).find(a => a.id === "dan");
  assert.ok(dan, "(h) an inactive non-private row (dan) was dropped");
  assert.strictEqual(dan.is_active, false, "(h) dan's is_active was not carried");
  return ["h-roster-fence"];
}

// ── (i)-(m) STATIC ──────────────────────────────────────────────────────────────────────────
function failures(text, wants) {
  return wants.filter(([needle, n]) => count(text, needle) !== n).map(([needle, n]) => `\`${needle}\` ${count(text, needle)} times, want ${n}`);
}

function armI() {
  const src = read(ROUTE_REL);
  const W = [['req.body?.action === "add_agent_to_team"', 1], ['req.body?.action === "archive_private_agent"', 1]];
  assert.deepStrictEqual(failures(src, W), [], `(i) ${ROUTE_REL} must hold both action branches`);
  assert.strictEqual(failures(src.replace('"archive_private_agent"', '"x"'), W).length, 1, "(i) CONTROL: a missing branch must fail");
  return ["i-route-actions"];
}

const J_WANTS = [
  ['"Add to a team"', 1],
  ["<TeamPicker agent={agent}/>", 1],
  [">Connect to AI<", 1],
  ["Connect ${firstName}", 0],
  ["<Breadcrumb current={agent.name}/>", 1],
  ["|| agents[0]", 0],
  [">Delete Agent<", 1],
  ["Are you sure you want to remove {agent.name}?", 1],
  ['action: "archive_private_agent"', 1],
  ["forgetAgent(agent.id)", 1],
  // Round 2 (John, 2026-10-05): the Add to a team button stays but is disabled and grayed out.
  ['<button disabled title="Coming soon" onClick={() => setOpen(o => !o)} style={{...TEAM_GHOST, color:T.muted, opacity:0.5, cursor:"not-allowed"}}>', 1],
];
function armJ() {
  const src = read(PERSONNEL_REL); // RAW
  assert.deepStrictEqual(failures(src, J_WANTS), [], `(j) ${PERSONNEL_REL} needles`);
  const add = src.indexOf(">+ Add Training<");
  const picker = src.indexOf("<TeamPicker agent={agent}/>");
  const connect = src.indexOf(">Connect to AI<");
  assert.ok(add >= 0 && add < picker && picker < connect, "(j) the TeamPicker mount is not between + Add Training and Connect to AI");
  // CONTROL: the old fallback and the old label must fail.
  const old = src.replace("agents.find(a => a.id === agentId);", "agents.find(a => a.id === agentId) || agents[0];").replace(">Connect to AI<", ">{`Connect ${firstName} to AI`}<");
  assert.ok(failures(old, J_WANTS).length >= 3, "(j) CONTROL: the old fallback and label must fail");
  assert.strictEqual(failures(src.replace('<button disabled title="Coming soon"', "<button"), J_WANTS).length, 1, "(j) CONTROL: an enabled Add to a team button must fail");
  return ["j-personnel-needles"];
}

function armK() {
  const src = read(NAV_REL);
  const N = "export function Breadcrumb({ current })";
  assert.strictEqual(count(src, N), 1, `(k) ${NAV_REL} does not export Breadcrumb`);
  assert.strictEqual(count(src.replace(N, "function Breadcrumb({ current })"), N), 0, "(k) CONTROL");
  return ["k-breadcrumb-exported"];
}

function armL() {
  const src = read(NEW_REL);
  const W = [["navigate(`/bench/${out.agent.id}`)", 1], ['.from("teams")', 0]];
  assert.deepStrictEqual(failures(src, W), [], `(l) ${NEW_REL} must land on the new file and read no teams`);
  assert.strictEqual(failures(src + '\nsupabase.from("teams")', W).length, 1, "(l) CONTROL: a teams read must fail");
  return ["l-new-screen-lands-on-file"];
}

function armM() {
  const arch = read(ARCH_REL);
  const start = arch.indexOf("\n## 19u.");
  const end = arch.indexOf("\n## 19v.");
  assert.ok(start >= 0 && end > start, "(m) §19u not found");
  const S = arch.slice(start, end);
  for (const n of ["add_agent_to_team", "archive_private_agent"]) assert.ok(S.includes(n), `(m) §19u does not name ${n}`);
  const stamps = arch.split("\n").filter(l => l.startsWith("# Amended v7.0.790 |"));
  assert.strictEqual(stamps.length, 1, `(m) ${stamps.length} '# Amended v7.0.790 |' lines, want 1`);
  assert.ok(stamps[0].includes("AGT-386"), "(m) the v7.0.790 stamp does not name AGT-386");
  // CONTROL: the pre-AGT-386 sentence ("one action") must be gone, and §19u stripped of the new
  // action names must fail the name check.
  assert.ok(!S.includes("It is reached through one action on"), "(m) §19u still says the precursor is reached through one action");
  const stripped = S.replace(/add_agent_to_team|archive_private_agent/g, "");
  assert.ok(!["add_agent_to_team", "archive_private_agent"].every(n => stripped.includes(n)), "(m) CONTROL: a §19u without the names must fail");
  return ["m-architecture-19u"];
}

async function run() {
  const results = [];
  const mod = await import("../../lib/private-agent-create.js");
  results.push(...armA(mod));
  results.push(...(await armAddToTeam(mod)));
  results.push(...(await armG(mod)));
  results.push(...(await armH()));
  results.push(...armI(), ...armJ(), ...armK(), ...armL(), ...armM());
  return results;
}

selfRun(import.meta.url, run);
export default run;
