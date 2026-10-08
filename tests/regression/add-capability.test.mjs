// DeepBench | tests/regression/add-capability.test.mjs -- a private agent's user can add a capability, then Skills
// inside it. The capability is a listed no-model tool scoped to its own Skills.
// PURE + FAKE fetch (always run): readAddCapabilityInput() refusals, addCapabilityToAgent() write order and undo,
// assembleCapabilityRows() listing it as a scoped tool; the Teach tool's capability / skill / specialty / bio kinds. STATIC: the route action and the Personnel mount.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readAddCapabilityInput, addCapabilityToAgent } from "../../lib/skill-write.js";
import { assembleCapabilityRows } from "../../api/_lib/mcp.js";
const read = p => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const count = (s, t) => s.split(t).length - 1;

assert.deepEqual(readAddCapabilityInput({ action: "add_capability", agent_id: "zoe-k3x9ab", name: " Bid review ", description: "  " }), { agentId: "zoe-k3x9ab", fields: { name: "Bid review" } });
for (const bad of [{ name: "x" }, { agent_id: "zoe-k3x9ab" }, { agent_id: "zoe-k3x9ab", name: "x", slug: "y" }, { agent_id: "zoe-k3x9ab", name: "x", description: 5 }, { agent_id: "zoe-k3x9ab", name: "x".repeat(201) }]) {
  assert.ok(readAddCapabilityInput(bad).error, JSON.stringify(bad).slice(0, 60));
}

function fake({ failLink = false, noAgent = false } = {}) {
  const sent = [];
  const fetchImpl = async (url, init) => {
    const u = String(url), m = init.method;
    sent.push({ m, u: u.split("/rest/v1/")[1], body: init.body ? JSON.parse(init.body) : undefined });
    const ok = (b) => ({ ok: true, status: 200, json: async () => b, text: async () => "" });
    if (m === "GET") return ok(noAgent || u.includes("sharing=eq.private") ? [] : [{ id: "zoe-k3x9ab" }]); // a customer agent with sharing "public" (Brittany) must pass
    if (u.includes("capabilities") && m === "POST") return ok([{ id: "uuid-1", slug: JSON.parse(init.body).slug, name: "Bid review", description: null, execution_type: "deterministic" }]);
    if (u.includes("agent_capability_assignments")) return failLink ? { ok: false, status: 500, text: async () => "boom", json: async () => ({}) } : ok([]);
    return ok([]);
  };
  return { sent, deps: { supabaseUrl: "https://x.test", supabaseKey: "k", fetchImpl, suffix: () => "abc123" } };
}
{
  const f = fake();
  const out = await addCapabilityToAgent({ agentId: "zoe-k3x9ab", fields: { name: "Bid review" } }, f.deps);
  assert.deepEqual(out.capability.skillProfiles, []);
  assert.equal(out.capability.execution_type, "deterministic");
  assert.deepEqual(f.sent.map(s => s.m + " " + s.u.split("?")[0]), ["GET agents", "POST capabilities", "POST agent_capability_assignments"]);
  assert.equal(f.sent[1].body.slug, "zoe-k3x9ab-bid-review-abc123");
  assert.equal(f.sent[1].body.execution_type, "deterministic");
  assert.equal(f.sent[1].body.default_intent_slug, "agent-capability-intent");
  assert.deepEqual(f.sent[2].body, { agent_id: "zoe-k3x9ab", capability_slug: "zoe-k3x9ab-bid-review-abc123", tenant_id: "global" });
}
{
  const f = fake({ failLink: true });
  await assert.rejects(addCapabilityToAgent({ agentId: "zoe-k3x9ab", fields: { name: "Bid review" } }, f.deps));
  assert.equal(f.sent.at(-1).m, "DELETE", "a failed assignment removes the capability row it just made");
}
await assert.rejects(addCapabilityToAgent({ agentId: "nobody", fields: { name: "x" } }, fake({ noAgent: true }).deps), e => e.status === 404);

const rows = assembleCapabilityRows({
  capabilities: [{ slug: "a-new", name: "Bid review", execution_type: "deterministic", default_intent_slug: "agent-capability-intent" }, { slug: "a-k", name: "K", execution_type: "deterministic", default_intent_slug: "agent-bundle-intent" }],
  assignments: [{ agent_id: "a", capability_slug: "a-new" }, { agent_id: "a", capability_slug: "a-k" }],
  agents: [{ id: "a", name: "A", lane: "product", is_active: true }],
  intents: [{ slug: "agent-capability-intent", traits: { handler: "agent-bundle", scope_capability: true } }, { slug: "agent-bundle-intent", traits: { handler: "agent-bundle" } }],
});
assert.deepEqual(rows.map(r => [r.slug, r.scope_capability]).sort(), [["a-k", false], ["a-new", true]], "a user-made capability is a listed tool, scoped to its own Skills; the Knowledge tool is not");

assert.equal(count(read("api/agent-configs.js"), '"add_capability"'), 1);
const screen = read("src/screens/PersonnelScreen.jsx");
assert.ok(screen.includes("{proposed && isPrivateAgent(agent) && <AddCapabilityForm"), "private agents only, Proposed view");

// ── the Teach tool: an AI client creates a capability, then a Skill inside it; and replaces specialty / bio ──
process.env.SUPABASE_URL = "https://x.test"; process.env.SUPABASE_SERVICE_KEY = "k";
const { handle } = await import("../../api/_lib/handlers/agent-teach.js");
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url), m = init.method || "GET";
  calls.push({ m, u: u.split("/rest/v1/")[1] });
  const ok = b => ({ ok: true, status: 200, json: async () => b, text: async () => "" });
  if (u.includes("/agents?id=eq.zoe-k3x9ab&select=id,name,lane")) return ok([{ id: "zoe-k3x9ab", name: "Zoe", lane: "product", is_active: true, sharing: "private", owner_id: null }]);
  if (u.includes("/agents?id=eq.zoe-k3x9ab&agent_origin=eq.customer")) return ok([{ id: "zoe-k3x9ab" }]);
  if (u.includes("select=id,name,role,specialty,bio") && m === "GET") return ok([{ id: "zoe-k3x9ab", name: "Zoe", role: "Analyst", specialty: "old", bio: "old bio" }]);
  if (u.includes("/agents?id=eq.zoe-k3x9ab&select=id,name&limit=1")) return ok([{ id: "zoe-k3x9ab", name: "Zoe" }]);
  if (m === "PATCH" && u.includes("agents?")) return ok([{ id: "zoe-k3x9ab", name: "Zoe", role: "Analyst", specialty: JSON.parse(init.body).specialty, bio: JSON.parse(init.body).bio, identity_updated_at: "2026-10-08T00:00:00Z" }]);
  if (u.includes("agent_capability_assignments?agent_id=eq.zoe-k3x9ab&select=capability_slug")) return ok([{ capability_slug: "zoe-k3x9ab-knowledge" }, { capability_slug: "zoe-k3x9ab-bid-review-abc123" }]);
  if (u.includes("capabilities?slug=in")) return ok([{ slug: "zoe-k3x9ab-knowledge", name: "Zoe's Knowledge", default_intent_slug: "agent-bundle-intent" }, { slug: "zoe-k3x9ab-bid-review-abc123", name: "Bid review", default_intent_slug: "agent-capability-intent" }]);
  if (u.includes("capabilities?select=*") && m === "POST") return ok([{ id: "u1", slug: JSON.parse(init.body).slug, name: JSON.parse(init.body).name }]);
  if (u.includes("skill_profiles?select=*") && m === "POST") return ok([{ id: "s1", slug: JSON.parse(init.body).slug, ...JSON.parse(init.body) }]);
  if (u.includes("capabilities?slug=eq.") && m === "GET") return ok([{ slug: decodeURIComponent(u.split("slug=eq.")[1].split("&")[0]) }]);
  if (u.includes("capability_skill_profiles?capability_slug")) return ok([]);
  return ok([]);
};
const ctx = { caller_key_name: "claude-desktop" };
const base = { agent_id: "zoe-k3x9ab", tenant_id: "global", handler_context: ctx };
const cap = await handle({ ...base, content: { kind: "capability", title: "Bid risk", content: "Reviews bids" } });
assert.equal(cap.saved.kind, "capability"); assert.match(cap.saved.id, /^zoe-k3x9ab-bid-risk-/); assert.equal(cap.no_inference, true);
const sk = await handle({ ...base, content: { kind: "skill", capability: "Bid review", title: "Claim check", content: "Check each claim", skill_type: "identity" } });
assert.equal(sk.saved.capability, "zoe-k3x9ab-bid-review-abc123");
await assert.rejects(handle({ ...base, content: { kind: "skill", capability: "Zoe's Knowledge", title: "x", content: "y" } }), /must name a capability/, "the connection capabilities are not Skill groups");
await assert.rejects(handle({ ...base, content: { kind: "skill", capability: "Bid review", title: "x", content: "y", skill_type: "nope" } }), /skill_type must be one of/);
const sp = await handle({ ...base, content: { kind: "specialty", title: "-", content: "City bid review" } });
assert.equal(sp.saved.kind, "specialty");
await assert.rejects(handle({ ...base, content: { kind: "bio", title: "-", content: "x".repeat(2001) } }), /at most 2000/);
console.log("ok add-capability");
