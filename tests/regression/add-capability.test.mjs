// DeepBench | tests/regression/add-capability.test.mjs -- a private agent's user can add a capability, then Skills
// inside it. The capability is a "group" of Skills and never an MCP tool.
// PURE + FAKE fetch (always run): readAddCapabilityInput() refusals, addCapabilityToAgent() write order and undo,
// assembleCapabilityRows() skipping a group. STATIC: the route action and the Personnel mount.
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
    if (m === "GET") return ok(noAgent ? [] : [{ id: "zoe-k3x9ab" }]);
    if (u.includes("capabilities") && m === "POST") return ok([{ id: "uuid-1", slug: JSON.parse(init.body).slug, name: "Bid review", description: null, execution_type: "group" }]);
    if (u.includes("agent_capability_assignments")) return failLink ? { ok: false, status: 500, text: async () => "boom", json: async () => ({}) } : ok([]);
    return ok([]);
  };
  return { sent, deps: { supabaseUrl: "https://x.test", supabaseKey: "k", fetchImpl, suffix: () => "abc123" } };
}
{
  const f = fake();
  const out = await addCapabilityToAgent({ agentId: "zoe-k3x9ab", fields: { name: "Bid review" } }, f.deps);
  assert.deepEqual(out.capability.skillProfiles, []);
  assert.equal(out.capability.execution_type, "group");
  assert.deepEqual(f.sent.map(s => s.m + " " + s.u.split("?")[0]), ["GET agents", "POST capabilities", "POST agent_capability_assignments"]);
  assert.equal(f.sent[1].body.slug, "zoe-k3x9ab-bid-review-abc123");
  assert.equal(f.sent[1].body.execution_type, "group");
  assert.deepEqual(f.sent[2].body, { agent_id: "zoe-k3x9ab", capability_slug: "zoe-k3x9ab-bid-review-abc123", tenant_id: "global" });
}
{
  const f = fake({ failLink: true });
  await assert.rejects(addCapabilityToAgent({ agentId: "zoe-k3x9ab", fields: { name: "Bid review" } }, f.deps));
  assert.equal(f.sent.at(-1).m, "DELETE", "a failed assignment removes the capability row it just made");
}
await assert.rejects(addCapabilityToAgent({ agentId: "nobody", fields: { name: "x" } }, fake({ noAgent: true }).deps), e => e.status === 404);

const rows = assembleCapabilityRows({
  capabilities: [{ slug: "a-g", name: "G", execution_type: "group" }, { slug: "a-k", name: "K", execution_type: "deterministic", default_intent_slug: "agent-bundle-intent" }],
  assignments: [{ agent_id: "a", capability_slug: "a-g" }, { agent_id: "a", capability_slug: "a-k" }],
  agents: [{ id: "a", name: "A", lane: "product", is_active: true }], intents: [{ slug: "agent-bundle-intent", traits: { handler: "agent-bundle" } }],
});
assert.deepEqual(rows.map(r => r.slug), ["a-k"], "a group is never listed as an MCP tool");

assert.equal(count(read("api/agent-configs.js"), '"add_capability"'), 1);
const screen = read("src/screens/PersonnelScreen.jsx");
assert.ok(screen.includes("{proposed && isPrivateAgent(agent) && <AddCapabilityForm"), "private agents only, Proposed view");
console.log("ok add-capability");
