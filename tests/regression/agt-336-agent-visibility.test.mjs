// DeepBench v7.0.754 | tests/regression/agt-336-agent-visibility.test.mjs | AGT-336 slice 1
//
// FEATURE: AGT-336 -- every agent and team carries an owner and a sharing level, and ONE function
// answers "may this viewer see this agent". Nobody signs in today, so the answer is "everyone"
// until a caller passes a viewer; the check must exist before AGT-337 / AGT-338 save anything.
//
// PURE (always run):
//   (a) no viewer -> everything is visible: canSeeAgent(PRIV) and canSeeAgent(PRIV, null) are
//       true and visibleAgents([PUB, PRIV]) keeps both. This is today's behavior, pinned.
//   (b) a viewer -> the rule itself, each branch by name: public; owner; `users` + shared_with;
//       and the negative controls -- a `private` row whose shared_with names the viewer stays
//       hidden, a row with no sharing at all stays hidden, a viewer with no id sees only public,
//       and no agent is never visible.
//   (c) THE DISCRIMINATOR: assembleCapabilityRows() over [PUB, PRIV] lists both capabilities with
//       no viewer, only `cap-pub` for viewer u1, and both again for the owner u2. A build that
//       added the parameter and ignored it fails the middle assertion.
// STATIC (always run):
//   (d) api/_lib/mcp.js reads the access columns through ${AGENT_ACCESS_COLUMNS}; the migration
//       mirror sets the column default to 'private', replaces the anon table grant on teams, and
//       removes nothing.
// LIVE (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY, else NOT RUN), anon key, read-only:
//   (e) agents carries owner_id / sharing / shared_with; teams and agent_teams answer; and
//       teams.address is REFUSED to the anon key (401 or 403).
//
// BASELINE: the file is new and RED on the unchanged tree -- shared/agent-visibility.js does not
// exist (the pure arm throws on import), and assembleCapabilityRows() ignores `viewer`, so (c)
// would return both slugs for u1.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const MCP_REL = "api/_lib/mcp.js";
const SQL_REL = "docs/design/agt-336-agent-sharing.sql";
const SHARING_LEVELS = ["private", "users", "public"];

const PUB = { id: "pub", name: "Pub", role: "R", lane: "product", is_active: true, sharing: "public", owner_id: null, shared_with: [] };
const PRIV = { ...PUB, id: "priv", sharing: "private", owner_id: "u2" };

// ---------------------------------------------------------------------------------------------
// PURE: the rule, then the one caller that applies it
// ---------------------------------------------------------------------------------------------
async function partPure() {
  const results = [];
  const { SHARING, AGENT_ACCESS_COLUMNS, canSeeAgent, visibleAgents } = await import("../../shared/agent-visibility.js");
  assert.deepStrictEqual({ ...SHARING }, { PRIVATE: "private", USERS: "users", PUBLIC: "public" }, "SHARING is not the three declared levels");
  assert.ok(Object.isFrozen(SHARING), "SHARING is not frozen");
  assert.strictEqual(AGENT_ACCESS_COLUMNS, "owner_id,sharing,shared_with", "AGENT_ACCESS_COLUMNS is not the three access columns");

  // (a) no viewer: everyone sees everything.
  assert.strictEqual(canSeeAgent(PRIV), true, "(a) a private agent is hidden with no viewer argument");
  assert.strictEqual(canSeeAgent(PRIV, null), true, "(a) a private agent is hidden with a null viewer");
  assert.strictEqual(visibleAgents([PUB, PRIV]).length, 2, "(a) visibleAgents() dropped a row with no viewer");
  results.push("no-viewer-sees-everything");

  // (b) a viewer: each branch.
  const u1 = { id: "u1" };
  assert.strictEqual(canSeeAgent(PUB, u1), true, "(b) a public agent is hidden from u1");
  assert.strictEqual(canSeeAgent(PRIV, u1), false, "(b) u2's private agent is visible to u1");
  assert.strictEqual(canSeeAgent({ ...PRIV, sharing: "users", shared_with: ["u1"] }, u1), true,
    "(b) an agent shared with u1 is hidden from u1");
  assert.strictEqual(canSeeAgent({ ...PRIV, shared_with: ["u1"] }, u1), false,
    "(b) a PRIVATE agent whose shared_with names u1 is visible -- shared_with must count only at sharing 'users'");
  assert.strictEqual(canSeeAgent({ id: "x" }, u1), false, "(b) an agent with no sharing level is visible to u1");
  assert.strictEqual(canSeeAgent(PRIV, { id: "u2" }), true, "(b) the owner u2 cannot see their own private agent");
  assert.strictEqual(canSeeAgent(PUB, {}), true, "(b) a public agent is hidden from a viewer with no id");
  assert.strictEqual(canSeeAgent(PRIV, {}), false, "(b) a private agent is visible to a viewer with no id");
  assert.strictEqual(canSeeAgent(null, null), false, "(b) no agent is visible");
  results.push("viewer-rule-each-branch");

  // (c) THE DISCRIMINATOR -- the MCP tool list applies the rule.
  const { assembleCapabilityRows } = await import("../../api/_lib/mcp.js");
  const capabilities = [
    { slug: "cap-pub", name: "Cap Pub", execution_type: "ai", tenant_id: "global" },
    { slug: "cap-priv", name: "Cap Priv", execution_type: "ai", tenant_id: "global" },
  ];
  const assignments = [
    { agent_id: "pub", capability_slug: "cap-pub" },
    { agent_id: "priv", capability_slug: "cap-priv" },
  ];
  const slugs = viewerArg => assembleCapabilityRows({ capabilities, assignments, agents: [PUB, PRIV], ...viewerArg }).map(r => r.slug);
  assert.deepStrictEqual(slugs({}), ["cap-priv", "cap-pub"], "(c) with no viewer the list is not both capabilities");
  assert.deepStrictEqual(slugs({ viewer: u1 }), ["cap-pub"],
    "(c) for viewer u1 the list is not exactly ['cap-pub'] -- assembleCapabilityRows() does not apply the visibility check");
  assert.deepStrictEqual(slugs({ viewer: { id: "u2" } }), ["cap-priv", "cap-pub"], "(c) the owner u2 does not get both capabilities");
  results.push("tool-list-applies-the-rule");
  return results;
}

// ---------------------------------------------------------------------------------------------
// STATIC
// ---------------------------------------------------------------------------------------------
function partStatic() {
  const results = [];
  const mcp = read(MCP_REL);
  assert.ok(mcp.includes("${AGENT_ACCESS_COLUMNS}"), `${MCP_REL}: the agents read does not name \${AGENT_ACCESS_COLUMNS}`);
  results.push("mcp-reads-access-columns");

  const sql = read(SQL_REL);
  assert.ok(sql.includes("alter column sharing set default 'private'"), `${SQL_REL}: the sharing default is not set to 'private'`);
  assert.ok(sql.includes("revoke select on public.teams from anon, authenticated"),
    `${SQL_REL}: the anon table grant on teams is not replaced`);
  assert.ok(!sql.toLowerCase().includes("drop "), `${SQL_REL}: holds a drop -- the migration is additive only`);
  results.push("migration-mirror-additive");
  return results;
}

// ---------------------------------------------------------------------------------------------
// LIVE (anon key, read-only)
// ---------------------------------------------------------------------------------------------
async function partLive() {
  const base = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !key) {
    notRun("the live sharing-column and teams-grant assertions",
      "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set -- run `node --env-file-if-exists=.env.local tests/regression/run-all.js`");
    return [];
  }
  const results = [];
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async q => {
    const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${q}`, { headers: hdr });
    return { status: res.status, body: await res.text() };
  };

  const agents = await get("agents?select=id,owner_id,sharing,shared_with&limit=1");
  assert.strictEqual(agents.status, 200,
    `migration agt336_agent_sharing is not applied: agents access columns -> HTTP ${agents.status}: ${agents.body.slice(0, 200)}`);
  const rows = JSON.parse(agents.body);
  assert.ok(rows.length === 1 && SHARING_LEVELS.includes(rows[0].sharing),
    `agents.sharing is '${rows[0] && rows[0].sharing}', not one of ${SHARING_LEVELS.join(" / ")}`);
  results.push(`live-agents-access-columns (200, sharing '${rows[0].sharing}')`);

  const teams = await get("teams?select=id,name&limit=1");
  assert.strictEqual(teams.status, 200, `teams?select=id,name -> HTTP ${teams.status}: ${teams.body.slice(0, 200)}`);
  results.push("live-teams-readable (200)");

  const agentTeams = await get("agent_teams?select=agent_id,team_id&limit=1");
  assert.strictEqual(agentTeams.status, 200, `agent_teams?select=agent_id,team_id -> HTTP ${agentTeams.status}: ${agentTeams.body.slice(0, 200)}`);
  results.push("live-agent-teams-readable (200)");

  const address = await get("teams?select=address&limit=1");
  assert.ok(address.status === 401 || address.status === 403,
    `teams.address answered the anon key with HTTP ${address.status} -- the column grant does not hide it`);
  results.push(`live-teams-address-refused (${address.status})`);
  return results;
}

async function run() {
  const results = [];
  results.push(...(await partPure()));
  results.push(...partStatic());
  results.push(...(await partLive()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
