// DeepBench v7.0.773 | tests/regression/agt-338-connect-team-address.test.mjs | AGT-338 slice 3
//
// FEATURE: AGT-338 -- THE CONNECT POPUP OFFERS THE TEAM ADDRESS. The browser's key cannot read
// `teams.address` (a column grant), so the popup asks GET /api/agent-configs?agent_id=<id>&teams=1,
// and the route answers with the name and address of each team that agent is on, read with the
// service key by readAgentTeams(). Kickoff: docs/kickoffs/v7.0.773-AGT-338-connect-popup-team-address.md.
//
// PURE (always run):
//   (a) readAgentTeams(): one read, at exactly the agent_teams URL the kickoff names; a row with no
//       team and a team whose address is not 64 lowercase hex are dropped; the rest come back by
//       name. A failed read rejects with exactly `Reading agent_teams failed: HTTP <status>`.
//   (b) STATIC: the route answers `teams=1` from readAgentTeams().
//   (c) STATIC: the popup carries John's three strings (2026-10-03) once each, two CopyBlock mounts,
//       and the block and the line in the approved order. CONTROL: the popup text with the team
//       line's string removed MUST fail.
// LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- it CREATES and then DELETES two
// fixture agents and one fixture team:
//   (d) THE DISCRIMINATOR: the reader returns a created team's real address for its member, `[]`
//       for an agent on no team, and that address resolves to that member. The address is never
//       printed.
//
// BASELINE: the file is new and RED on the unchanged tree -- api/agent-configs.js exports no
// readAgentTeams.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import * as route from "../../api/agent-configs.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8");
const count = (text, needle) => text.split(needle).length - 1;

// ---------------------------------------------------------------------------------------------
// (a) PURE: the reader
// ---------------------------------------------------------------------------------------------
async function partReader() {
  const { readAgentTeams } = route;
  assert.strictEqual(typeof readAgentTeams, "function", "(a) api/agent-configs.js does not export readAgentTeams()");

  const A = "a".repeat(64);
  const B = "b".repeat(64);
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => [
        { teams: { name: "Zed", address: B } },
        { teams: { name: "Amy", address: A } },
        { teams: null },
        { teams: { name: "Bad", address: "XYZ" } },
      ],
    };
  };
  const got = await readAgentTeams("fx a", { supabaseUrl: "http://db", supabaseKey: "k", fetchImpl });
  assert.strictEqual(calls.length, 1, `(a) the reader made ${calls.length} reads, not exactly 1`);
  assert.strictEqual(calls[0].url, "http://db/rest/v1/agent_teams?agent_id=eq.fx%20a&select=teams(name,address)",
    "(a) the reader did not ask exactly the agent_teams URL the kickoff names");
  assert.deepStrictEqual(got, [{ name: "Amy", address: A }, { name: "Zed", address: B }],
    "(a) the reader did not return exactly Amy then Zed -- a row with no team or a malformed address was offered, or the order is not by name");

  await assert.rejects(
    readAgentTeams("fx a", { supabaseUrl: "http://db", supabaseKey: "k", fetchImpl: async () => ({ ok: false, status: 503 }) }),
    e => e instanceof Error && e.message === "Reading agent_teams failed: HTTP 503",
    "(a) a failed read did not reject with exactly `Reading agent_teams failed: HTTP 503`");
  return ["reader-one-read-exact-url", "reader-drops-null-and-malformed-sorts-by-name", "reader-failed-read-rejects"];
}

// ---------------------------------------------------------------------------------------------
// (b) STATIC: the route
// ---------------------------------------------------------------------------------------------
function partRoute() {
  assert.ok(
    read("api/agent-configs.js").includes('if (teams === "1") return res.status(200).json({ teams: await readAgentTeams(agent_id, {'),
    "(b) api/agent-configs.js does not answer `teams=1` from readAgentTeams()");
  return ["route-answers-teams-from-the-reader"];
}

// ---------------------------------------------------------------------------------------------
// (c) STATIC: the popup. John's copy, 2026-10-03 -- the test holds its own copy on purpose.
// ---------------------------------------------------------------------------------------------
const TEAM_LEAD = "Or connect your whole team at once.";
const TEAM_BODY = "Paste this URL instead and every agent in <team name> is available, including agents you add later.";
const TEAM_STEP = "With a team connection, name the agent you want in your question.";
const ORDER = [
  "<CopyBlock text={address} />",
  "teamLead}",
  "<CopyBlock text={base + t.address} />",
  "fill(tool.step2)",
  "teamStep}",
  "step3Heading === null",
];

// Every arm-c failure, by name; [] is green.
function popupFailures(text) {
  const out = [];
  for (const s of [TEAM_LEAD, TEAM_BODY, TEAM_STEP]) {
    if (count(text, s) !== 1) out.push(`"${s}" ${count(text, s)} times, want 1`);
  }
  if (count(text, "<CopyBlock text=") !== 2) out.push(`<CopyBlock text= ${count(text, "<CopyBlock text=")} times, want 2`);
  const at = ORDER.map(s => text.indexOf(s));
  ORDER.forEach((s, i) => { if (at[i] < 0) out.push(`missing ${s}`); });
  for (let i = 1; i < ORDER.length; i++) {
    if (at[i - 1] >= 0 && at[i] >= 0 && !(at[i - 1] < at[i])) out.push(`${ORDER[i - 1]} is not before ${ORDER[i]}`);
  }
  if (!text.includes("&teams=1")) out.push("missing &teams=1");
  if (!text.includes(".catch(() => {})")) out.push("missing .catch(() => {})");
  return out;
}

function partPopup() {
  const popup = read("src/components/ConnectAgentPopup.jsx");
  assert.deepStrictEqual(popupFailures(popup), [],
    "(c) the popup must carry the three team strings once each, two CopyBlock mounts, the approved order, the teams read and its silent failure");
  const without = popup.split(TEAM_STEP).join("");
  assert.notStrictEqual(without, popup, "(c) CONTROL: the team line's string must be found to be removed");
  assert.deepStrictEqual(popupFailures(without), [`"${TEAM_STEP}" 0 times, want 1`],
    "(c) CONTROL: the popup with the team line's string removed must fail the string count, and only that");
  return ["popup-three-strings-once", "popup-two-copy-blocks-in-order", "popup-control-missing-line-fails"];
}

// ---------------------------------------------------------------------------------------------
// (d) LIVE (service key) -- creates two fixture agents and one team, and removes them.
// THE DISCRIMINATOR.
// ---------------------------------------------------------------------------------------------
async function partLive() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun("the live team-address read: a fixture team and two fixture agents, the reader returning the team's real address for its member and nothing for the agent on no team, the address resolving to that member, and the fixture cleanup",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set -- this arm writes, so it needs the service key");
    return [];
  }
  const results = [];
  const { readAgentTeams } = route;
  const { createPrivateAgent, randomSuffix } = await import("../../lib/private-agent-create.js");
  const { resolveAddress } = await import("../../api/_lib/mcp.js");
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
  const readerDeps = { supabaseUrl: base.replace(/\/+$/, ""), supabaseKey: key };

  const ids = [];
  let teamId = null;
  try {
    const teamName = "agt338-" + randomSuffix();
    const member = await createPrivateAgent({ name: "Agt338 Popup", team: { name: teamName } }, deps);
    ids.push(member.agent.id);
    teamId = member.team && member.team.id;
    assert.ok(teamId, "(d) creating the fixture agent on a new team returned no team id");
    const solo = await createPrivateAgent({ name: "Agt338 Solo" }, deps);
    ids.push(solo.agent.id);
    const [id1, id2] = ids;

    const teamRows = await get(`teams?id=eq.${encodeURIComponent(teamId)}&select=address`);
    assert.strictEqual(teamRows.length, 1, `(d) the fixture team read back ${teamRows.length} rows, not 1`);
    const addr = teamRows[0].address;

    // assert.ok on a comparison, never deepStrictEqual: a failure message must not print `addr`.
    const mine = await readAgentTeams(id1, readerDeps);
    assert.ok(
      Array.isArray(mine) && mine.length === 1 && Object.keys(mine[0]).sort().join(",") === "address,name"
        && mine[0].name === teamName && mine[0].address === addr,
      "(d) DISCRIMINATOR: the reader did not return exactly the fixture team's name and real address for its member");
    results.push("DISCRIMINATOR-live-reader-returns-the-team-address");

    const resolved = await resolveAddress({ agent: addr });
    assert.ok(Array.isArray(resolved) && resolved.length === 1 && resolved[0] === id1,
      "(d) the address the reader returned does not resolve to exactly the fixture member");
    results.push("live-address-resolves-to-the-member");

    const none = await readAgentTeams(id2, readerDeps);
    assert.deepStrictEqual(none, [], "(d) an agent on no team was offered a team address");
    results.push("live-no-team-is-empty");
  } finally {
    for (const id of ids) {
      await del(`agent_capability_assignments?agent_id=eq.${encodeURIComponent(id)}`);
      await del(`capabilities?slug=eq.${encodeURIComponent(id + "-knowledge")}`);
      await del(`agents?id=eq.${encodeURIComponent(id)}`);
    }
    if (teamId) await del(`teams?id=eq.${encodeURIComponent(teamId)}`);
  }
  for (const id of ids) {
    const left = await get(`agents?id=eq.${encodeURIComponent(id)}&select=id`);
    assert.strictEqual(left.length, 0, `(d) ${left.length} fixture agents rows remain after cleanup`);
    const caps = await get(`capabilities?slug=eq.${encodeURIComponent(id + "-knowledge")}&select=slug`);
    assert.strictEqual(caps.length, 0, `(d) ${caps.length} fixture capabilities rows remain after cleanup`);
    const held = await get(`agent_capability_assignments?agent_id=eq.${encodeURIComponent(id)}&select=agent_id`);
    assert.strictEqual(held.length, 0, `(d) ${held.length} fixture assignment rows remain after cleanup`);
    const joined = await get(`agent_teams?agent_id=eq.${encodeURIComponent(id)}&select=agent_id`);
    assert.strictEqual(joined.length, 0, `(d) ${joined.length} fixture team membership rows remain after cleanup`);
  }
  const teamsLeft = await get(`teams?id=eq.${encodeURIComponent(teamId)}&select=id`);
  assert.strictEqual(teamsLeft.length, 0, `(d) ${teamsLeft.length} fixture teams rows remain after cleanup`);
  results.push("live-fixtures-removed");
  return results;
}

async function run() {
  const results = [];
  results.push(...(await partReader()));
  results.push(...partRoute());
  results.push(...partPopup());
  results.push(...(await partLive()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
