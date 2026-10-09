// DeepBench v7.0.796 | tests/regression/agt-392-identity-editor.test.mjs | AGT-392 -- the Identity
// editor on the Resume tab (Proposed arrangement): a DeepBench user edits an agent's name, role,
// specialty and bio. The save is lib/private-agent-create.js's updateAgentIdentity() behind the
// `update_identity` POST action on /api/agent-configs; a rename also renames the agent's two
// capabilities (its Knowledge and its Teach tool), so the MCP tool names follow the agent's name.
//
// PURE (always run):
//   (a) readIdentityInput() is CALLED: a valid body is trimmed; a blank name or role is refused by
//       name; a blank specialty is null.
// FAKE fetch (always run) -- a recording fetchImpl:
//   (b) the agents PATCH body is the five fields + identity_origin "deepbench"; a rename PATCHes
//       <id>-knowledge and <id>-teach with the generated names. CONTROL: the same name makes no
//       capabilities call. An absent agent is a 404 `Agent not found`.
// STATIC (always run):
//   (c) the route holds `"update_identity"` once and `identity === "1"` once.
//   (d) identityTag() is CALLED (compiled from ResumeTab.jsx's own source).
// LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN):
//   (e) testjohn-w50rvr is renamed; the row and both capability names read back renamed; `finally`
//       restores the four fields through updateAgentIdentity(), PATCHes identity_* back to their
//       before-image, and asserts the row and both capabilities match the before-image.
//
// BASELINE: RED on the unchanged tree -- lib/private-agent-create.js has no readIdentityInput.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const count = (hay, needle) => hay.split(needle).length - 1;

const COLS = "id,name,role,specialty,bio,quip,code,identity_origin,identity_origin_caller,identity_updated_at";
const LIVE_ID = "testjohn-w50rvr";
const LIVE_NAME = "testjohn agt392";

// Records { method, table, url, body } per call; `respond` may answer one call with { status, json }.
function fake(respond = () => null) {
  const sent = [];
  const fetchImpl = async (url, init = {}) => {
    const method = init.method || "GET";
    const table = String(url).split("/rest/v1/")[1].split("?")[0];
    const body = init.body ? JSON.parse(init.body) : null;
    const entry = { method, table, url: String(url), body };
    sent.push(entry);
    const answer = respond(entry) || {};
    const status = answer.status ?? 200;
    const json = answer.json === undefined ? [] : answer.json;
    return { ok: status >= 200 && status < 300, status, json: async () => json, text: async () => JSON.stringify(json) };
  };
  return { fetchImpl, sent };
}

const zoe = (before) => ({ method, table, body }) => {
  if (table !== "agents") return null;
  if (method === "GET") return { json: before ? [before] : [] };
  if (method === "PATCH") return { json: [{ id: "zoe-k3x9ab", code: null, ...body }] };
  return null;
};

export default async function run() {
  const mod = await import("../../lib/private-agent-create.js");
  const { readIdentityInput, updateAgentIdentity, readAgentIdentity } = mod;
  assert.equal(typeof readIdentityInput, "function", "lib/private-agent-create.js must export readIdentityInput");
  assert.equal(typeof updateAgentIdentity, "function", "lib/private-agent-create.js must export updateAgentIdentity");
  assert.equal(typeof readAgentIdentity, "function", "lib/private-agent-create.js must export readAgentIdentity");

  // ── (a) readIdentityInput, called ──────────────────────────────────────────
  assert.deepEqual(
    readIdentityInput({ agent_id: " zoe-k3x9ab ", name: "  Zed ", role: " Analyst ", specialty: " Pricing ", bio: " Knows pricing. " }),
    { agentId: "zoe-k3x9ab", name: "Zed", role: "Analyst", specialty: "Pricing", bio: "Knows pricing." });
  assert.deepEqual(readIdentityInput({ agent_id: "zoe-k3x9ab", name: "   ", role: "Analyst" }), { error: "Enter an agent name" });
  assert.deepEqual(readIdentityInput({ agent_id: "zoe-k3x9ab", name: "Zed", role: "" }), { error: "Enter a role" });
  assert.equal(readIdentityInput({ agent_id: "zoe-k3x9ab", name: "Zed", role: "Analyst", specialty: "  ", bio: "" }).specialty, null,
    "a blank specialty is null");
  assert.equal(readIdentityInput({ agent_id: "zoe-k3x9ab", name: "Zed", role: "Analyst", specialty: "  ", bio: "" }).bio, null,
    "a blank bio is null");
  assert.ok(readIdentityInput({ agent_id: "", name: "Zed", role: "Analyst" }).error, "no agent_id is refused");
  assert.ok(readIdentityInput({ agent_id: "a", name: "Zed", role: "Analyst", specialty: "x".repeat(201) }).error, "specialty > 200 is refused");
  assert.ok(readIdentityInput({ agent_id: "a", name: "Zed", role: "Analyst", bio: "x".repeat(2001) }).error, "bio > 2000 is refused");

  // ── (b) updateAgentIdentity with a recording fetch ─────────────────────────
  const deps = f => ({ supabaseUrl: "https://x.supabase.co", supabaseKey: "k", fetchImpl: f.fetchImpl });
  const input = { agentId: "zoe-k3x9ab", name: "Zed", role: "Analyst", specialty: "Pricing", bio: null };

  const rename = fake(zoe({ id: "zoe-k3x9ab", name: "Zoe" }));
  const out = await updateAgentIdentity(input, deps(rename));
  const agentPatch = rename.sent.find(c => c.method === "PATCH" && c.table === "agents");
  assert.ok(agentPatch, "an agents PATCH is sent");
  assert.ok(agentPatch.url.includes(`select=${COLS}`), "the agents PATCH returns <COLS>");
  const { identity_updated_at, ...patchRest } = agentPatch.body;
  assert.deepEqual(patchRest, { name: "Zed", role: "Analyst", specialty: "Pricing", bio: null, identity_origin: "deepbench", identity_origin_caller: null },
    "agents PATCH body = the five fields + identity_origin deepbench");
  assert.ok(!Number.isNaN(Date.parse(identity_updated_at)), "identity_updated_at is a timestamp");
  const capPatches = rename.sent.filter(c => c.method === "PATCH" && c.table === "capabilities");
  assert.equal(capPatches.length, 2, "a rename PATCHes both capabilities");
  const know = capPatches.find(c => c.url.includes("slug=eq.zoe-k3x9ab-knowledge"));
  const teach = capPatches.find(c => c.url.includes("slug=eq.zoe-k3x9ab-teach"));
  assert.ok(know && teach, "the knowledge and teach slugs are both PATCHed");
  assert.equal(know.body.name, "Zed's Knowledge");
  assert.equal(teach.body.name, "Teach Zed");
  assert.equal(know.body.description, mod.knowledgeCapabilityRow({ id: "zoe-k3x9ab", name: "Zed" }).description);
  assert.equal(teach.body.description, mod.teachCapabilityRow({ id: "zoe-k3x9ab", name: "Zed" }).description);
  assert.equal(out.agent.name, "Zed", "returns { agent: <row> }");

  // CONTROL: same name -> no capabilities call.
  const same = fake(zoe({ id: "zoe-k3x9ab", name: "Zed" }));
  await updateAgentIdentity(input, deps(same));
  assert.equal(same.sent.filter(c => c.table === "capabilities").length, 0, "CONTROL: an unchanged name touches no capability");
  assert.equal(same.sent.filter(c => c.method === "PATCH" && c.table === "agents").length, 1, "CONTROL: the agents PATCH still lands");

  // An absent agent is a 404 and writes nothing.
  const absent = fake(zoe(null));
  await assert.rejects(updateAgentIdentity(input, deps(absent)), e => e.status === 404 && e.message === "Agent not found");
  assert.equal(absent.sent.filter(c => c.method !== "GET").length, 0, "an absent agent writes nothing");
  await assert.rejects(readAgentIdentity("zoe-k3x9ab", deps(fake(zoe(null)))), e => e.status === 404);

  // ── (c) the route ──────────────────────────────────────────────────────────
  const route = read("api/agent-configs.js");
  assert.equal(count(route, '"update_identity"'), 1, 'api/agent-configs.js holds "update_identity" once');
  assert.equal(count(route, 'identity === "1"'), 1, 'api/agent-configs.js holds identity === "1" once');

  // ── (d) identityTag, called ────────────────────────────────────────────────
  const tab = read("src/screens/personnel/ResumeTab.jsx");
  const m = tab.match(/export function identityTag\(row\) \{\n([\s\S]*?)\n\}\n/);
  assert.ok(m, "ResumeTab.jsx exports identityTag(row)");
  const identityTag = new Function("row", m[1]);
  const at = "2026-10-05T03:00:00Z";
  assert.strictEqual(identityTag({ identity_origin: "mcp", identity_origin_caller: "key-a", identity_updated_at: at }), "MCP · key-a · Oct 4, 2026");
  assert.strictEqual(identityTag({ identity_origin: "mcp", identity_origin_caller: null, identity_updated_at: at }), "MCP · Oct 4, 2026");
  assert.strictEqual(identityTag({ identity_origin: "deepbench", identity_origin_caller: null, identity_updated_at: at }), "Edited by DeepBench · Oct 4, 2026");
  assert.strictEqual(identityTag({ identity_origin: null, identity_updated_at: at }), null, "CONTROL: no origin -> null");
  assert.strictEqual(identityTag(null), null);

  // ── (e) LIVE ───────────────────────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    notRun("(e) live rename of testjohn-w50rvr", "SUPABASE_URL / SUPABASE_SERVICE_KEY not set (node --env-file-if-exists=.env.local)");
    return;
  }
  const live = { supabaseUrl, supabaseKey };
  const headers = { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  const rest = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/`;
  const caps = async () => {
    const r = await fetch(`${rest}capabilities?slug=in.(${LIVE_ID}-knowledge,${LIVE_ID}-teach)&select=slug,name,description&order=slug.asc`, { headers });
    assert.ok(r.ok, `capabilities read HTTP ${r.status}`);
    return r.json();
  };
  const before = await readAgentIdentity(LIVE_ID, live);
  const capsBefore = await caps();
  assert.equal(capsBefore.length, 2, "testjohn-w50rvr holds both capabilities");
  try {
    await updateAgentIdentity({ agentId: LIVE_ID, name: LIVE_NAME, role: before.role, specialty: before.specialty, bio: before.bio }, live);
    const after = await readAgentIdentity(LIVE_ID, live);
    assert.equal(after.name, LIVE_NAME, "the row reads back renamed");
    assert.equal(after.identity_origin, "deepbench", "the row reads back tagged deepbench");
    const capsAfter = await caps();
    assert.deepEqual(capsAfter.map(c => c.name).sort(), [`${LIVE_NAME}'s Knowledge`, `Teach ${LIVE_NAME}`].sort(),
      "both capability names read back renamed");
  } finally {
    await updateAgentIdentity({ agentId: LIVE_ID, name: before.name, role: before.role, specialty: before.specialty, bio: before.bio }, live);
    const r = await fetch(`${rest}agents?id=eq.${LIVE_ID}`, {
      method: "PATCH", headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ identity_origin: before.identity_origin, identity_origin_caller: before.identity_origin_caller, identity_updated_at: before.identity_updated_at }),
    });
    assert.ok(r.ok, `identity_* restore HTTP ${r.status}`);
    assert.deepEqual(await readAgentIdentity(LIVE_ID, live), before, "the row is restored to its before-image");
    assert.deepEqual(await caps(), capsBefore, "both capabilities are restored to their before-image");
  }
}

selfRun(import.meta.url, run);
