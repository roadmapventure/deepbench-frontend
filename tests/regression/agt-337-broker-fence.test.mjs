// DeepBench v7.0.763 | tests/regression/agt-337-broker-fence.test.mjs | AGT-337 slice 2 - the broker fence
//
// FEATURE: AGT-337 -- a user creates a private agent; the delegation roster never offers it, or its
// knowledge capability, for anyone else's work. lib/project-manager.js reads the roster as a viewer
// with no identity: visibleAgents(rows, { id: null }) (shared/agent-visibility.js, the one rule)
// keeps sharing = 'public' only.
//
// No live arm: every arm runs getRosterCandidates() against a stubbed fetch, so nothing here reads
// or writes the database. Arms, in this order:
//   (b) NOTHING CHANGES FOR PUBLIC AGENTS (green before and after the fence): over two public
//       fixture rows the roster grants, counts 2, and a public agent's roster line is the exact
//       text it always was -- and never mentions sharing or owner_id.
//   (a) THE DISCRIMINATOR: with a private and a users-shared agent among the rows, the roster text
//       is byte-identical to the roster without them. Unchanged tree: matchCount 4.
//   (c) the roster read keeps the pinned filter string and its select list asks for `sharing`.
//       Control: a read that returns no sharing level offers nobody.
//   (d) static: the file applies the shared check (no second filter of its own), still has one
//       export, and the path rule carries the private carve-out.
//
// BASELINE: the file is new. On the unchanged tree (b) passes and (a) fails with matchCount 4.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const PM_REL = "lib/project-manager.js";
const RULE_REL = ".claude/rules/agent-roster-inert.md";
const ROSTER_PIN = "agents?is_active=eq.true&lane=eq.product&select=";

const PUB1 = { id: "zz-pub-1", name: "Fixture One", role: "Fixture Role", skill_score: 1, situational_awareness: 2, rating: 3, is_active: true, owner_id: null, sharing: "public", shared_with: [] };
const PUB2 = { ...PUB1, id: "zz-pub-2", name: "Fixture Two" };
const PRIV = { ...PUB1, id: "zz-priv", sharing: "private" };
const USERS = { ...PUB1, id: "zz-users", sharing: "users", shared_with: ["u1"] };
const A = [PUB1, PUB2];
const B = [PUB1, PRIV, PUB2, USERS];

const PUB1_LINE = "--- zz-pub-1 — Fixture One, Fixture Role ---\ncapabilities: zz-pub-1-cap (Fixture capability)\nskill_score: 1, situational_awareness: 2, rating: 3, activity_count: n/a\nactive: true";

// ---------------------------------------------------------------------------------------------
// Harness: a stubbed fetch and stub credentials, all three restored in `finally`
// ---------------------------------------------------------------------------------------------
async function withFetch(stub, fn) {
  const saved = { fetch: globalThis.fetch, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY };
  globalThis.fetch = stub;
  process.env.SUPABASE_URL = "http://stub.invalid";
  process.env.SUPABASE_SERVICE_KEY = "stub";
  try {
    return await fn();
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = saved.url;
    if (saved.key === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = saved.key;
  }
}

function stubFor(rows, { drop = [] } = {}) {
  const seen = { rosterUrl: null };
  const answer = body => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
  const stub = async input => {
    const url = String(input);
    if (url.includes("/rest/v1/agents?id=eq.")) return answer([{ is_active: true }]);
    if (url.includes("/rest/v1/agents?is_active")) {
      seen.rosterUrl = url;
      const cols = (url.split("select=")[1] || "").split("&")[0].split(",").filter(c => c && !drop.includes(c));
      return answer(rows.map(r => Object.fromEntries(cols.filter(c => c in r).map(c => [c, r[c]]))));
    }
    if (url.includes("agent_capability_assignments")) return answer(rows.map(r => ({ agent_id: r.id, capability_slug: `${r.id}-cap` })));
    if (url.includes("/rest/v1/capabilities")) return answer(rows.map(r => ({ slug: `${r.id}-cap`, name: "Cap", description: "Fixture capability" })));
    return answer([]);
  };
  return { stub, seen };
}

async function rosterOver(rows, opts) {
  const { getRosterCandidates } = await import("../../lib/project-manager.js");
  const { stub, seen } = stubFor(rows, opts);
  const out = await withFetch(stub, () => getRosterCandidates({ requestingAgentId: "zz-pub-1" }));
  return { out, seen };
}

// ---------------------------------------------------------------------------------------------
// (b), (a), (c): the roster through the stubbed read
// ---------------------------------------------------------------------------------------------
async function partRoster() {
  const results = [];

  // (b) nothing changes for public agents.
  const { out: overA, seen: seenA } = await rosterOver(A);
  assert.strictEqual(overA._project_manager.granted, true, "(b) the roster read was not granted");
  assert.strictEqual(overA.matchCount, 2, `(b) matchCount over two public agents is ${overA.matchCount}, not 2`);
  assert.deepStrictEqual(overA.chunks.map(c => c.id), ["zz-pub-1", "zz-pub-2"], "(b) the chunk ids are not the two public agents in order");
  assert.ok(overA.context.startsWith("PLATFORM AGENT ROSTER (2 agents)."), "(b) the roster header does not count 2 agents");
  assert.ok(overA.context.includes(PUB1_LINE), "(b) a public agent's roster line moved -- it must not change by a byte");
  assert.ok(!/sharing|owner_id/.test(overA.context), "(b) the roster text names sharing or owner_id -- access columns must never reach the selection prompt");
  results.push("public-agents-unchanged");

  // (a) THE DISCRIMINATOR.
  const { out: overB } = await rosterOver(B);
  assert.strictEqual(overB.matchCount, 2,
    `(a) matchCount is ${overB.matchCount}, not 2 -- a private or users-shared agent entered the delegation roster`);
  assert.deepStrictEqual(overB.chunks.map(c => c.id), ["zz-pub-1", "zz-pub-2"], "(a) the chunk ids are not exactly the two public agents");
  assert.strictEqual(overB.context, overA.context, "(a) the roster text with a private and a users-shared agent present is not byte-identical to the roster without them");
  assert.ok(!overB.context.includes("zz-priv"), "(a) the roster text names the private agent");
  assert.ok(!overB.context.includes("zz-users"), "(a) the roster text names the users-shared agent");
  results.push("private-and-users-shared-never-offered");

  // (c) the read itself, and the control.
  assert.ok(seenA.rosterUrl && seenA.rosterUrl.includes(ROSTER_PIN), `(c) the roster read is not the pinned '${ROSTER_PIN}' fetch: ${seenA.rosterUrl}`);
  const selectList = seenA.rosterUrl.split("select=")[1].split("&")[0].split(",");
  assert.ok(selectList.includes("sharing"), `(c) the roster select list does not hold sharing: ${selectList.join(",")}`);
  const { out: noSharing } = await rosterOver(A, { drop: ["sharing"] });
  assert.strictEqual(noSharing.matchCount, 0,
    `(c) control: with no sharing level on any row matchCount is ${noSharing.matchCount}, not 0 -- a row with no sharing level must never be offered`);
  results.push("roster-read-asks-for-sharing (control: no sharing level -> 0 offered)");
  return results;
}

// ---------------------------------------------------------------------------------------------
// (d) STATIC
// ---------------------------------------------------------------------------------------------
function partStatic() {
  const results = [];
  const pm = read(PM_REL);
  assert.ok(pm.includes("from '../shared/agent-visibility.js'"), `${PM_REL}: does not import the shared visibility check`);
  assert.ok(pm.includes("visibleAgents("), `${PM_REL}: does not call visibleAgents()`);
  assert.ok(pm.includes("${AGENT_ACCESS_COLUMNS}"), `${PM_REL}: the agents read does not name \${AGENT_ACCESS_COLUMNS}`);
  const code = pm.replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!code.includes("private"), `${PM_REL}: its code names 'private' -- the fence is the shared check, never a second filter here`);
  assert.strictEqual(code.split("export ").length - 1, 1, `${PM_REL}: does not hold exactly one export -- getRosterCandidates() stays the only one`);
  results.push("project-manager-applies-the-shared-check");

  assert.ok(read(RULE_REL).includes("**Private carve-out ("), `${RULE_REL}: does not carry the private carve-out`);
  results.push("rule-carries-private-carve-out");
  return results;
}

async function run() {
  const results = [];
  results.push(...(await partRoster()));
  results.push(...partStatic());
  return results;
}

selfRun(import.meta.url, run);
export default run;
