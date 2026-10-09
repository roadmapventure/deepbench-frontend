// DeepBench | tests/regression/add-capability.test.mjs -- a private agent's user can add a capability, then Skills
// inside it. The capability is a listed no-model tool scoped to its own Skills.
// PURE + FAKE fetch (always run): readAddCapabilityInput() refusals, addCapabilityToAgent() write order and undo,
// assembleCapabilityRows() listing it as a scoped tool; the Teach tool's capability / skill / specialty / bio kinds. STATIC: the route action and the Personnel mount.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readAddCapabilityInput, addCapabilityToAgent, actorFromRequest, authorCols, updateSkill, deleteCapability, readDeleteCapabilityInput } from "../../lib/skill-write.js";
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
  if (u.includes("skill_profiles?slug=in")) return ok([{ slug: "agent-capability-intent", traits: { scope_capability: true } }, { slug: "agent-bundle-intent", traits: {} }]);
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

// ── author tags: who made / last edited it, stored with a type and an id ──────────────────────────────────────────
assert.equal(actorFromRequest({ headers: { host: "localhost:5173" } }).type, "owner");
assert.equal(actorFromRequest({ headers: { host: "deepbench-frontend-git-dev-roadmapventures-projects.vercel.app" } }).type, "owner");
assert.equal(actorFromRequest({ headers: { host: "app.deepbench.example" } }).type, "end_user");
assert.deepEqual(authorCols(null), {}, "no actor, no tag (callers that predate tags are unchanged)");
assert.deepEqual(Object.keys(authorCols({ type: "ai_client", id: "claude-desktop" }, { created: true })).sort(), ["created_by_id", "created_by_type", "updated_at", "updated_by_id", "updated_by_type"]);
assert.deepEqual(Object.keys(authorCols({ type: "end_user", id: null })).sort(), ["updated_at", "updated_by_id", "updated_by_type"], "an edit writes only the last-edited columns");
assert.deepEqual(authorCols({ type: "robot" }), {}, "an unknown author type is never written");
{
  const f = fake();
  await addCapabilityToAgent({ agentId: "zoe-k3x9ab", fields: { name: "Bid review" } }, { ...f.deps, actor: { type: "end_user", id: null } });
  assert.equal(f.sent[1].body.created_by_type, "end_user");
  assert.equal(f.sent[1].body.updated_by_type, "end_user");
  const sent = []; const fetchImpl = async (url, init) => { sent.push({ u: String(url), body: init.body ? JSON.parse(init.body) : null }); return { ok: true, status: 200, json: async () => [{ id: "s1" }], text: async () => "" }; };
  await updateSkill({ skillId: "s1", fields: { tone: "plain" } }, { supabaseUrl: "https://x.test", supabaseKey: "k", fetchImpl, actor: { type: "owner", id: null } });
  assert.deepEqual(Object.keys(sent[0].body).sort(), ["tone", "updated_at", "updated_by_id", "updated_by_type"]);
  await updateSkill({ skillId: "s1", fields: { tone: "plain" } }, { supabaseUrl: "https://x.test", supabaseKey: "k", fetchImpl });
  assert.deepEqual(sent[1].body, { tone: "plain" }, "with no actor the body is exactly what was given");
}
// the AI client's tag carries its key NAME
assert.ok(cap.saved.origin_caller === "claude-desktop");
assert.ok(calls.some(c => c.m === "POST" && c.u.startsWith("capabilities?select=*")), "the capability write ran");

// ── delete a capability: only one whose Intent is scoped to its own Skills; its Skills stay ──────────────────────
assert.deepEqual(readDeleteCapabilityInput({ action: "delete_capability", capability_id: "11111111-1111-1111-1111-111111111111" }), { capabilityId: "11111111-1111-1111-1111-111111111111" });
assert.ok(readDeleteCapabilityInput({ capability_id: "nope" }).error);
function delFake(intentTraits) {
  const sent = [];
  const fetchImpl = async (url, init) => {
    const u = String(url).split("/rest/v1/")[1], m = init.method;
    sent.push(m + " " + u.split("?")[0]);
    const ok = b => ({ ok: true, status: 200, json: async () => b, text: async () => "" });
    if (u.startsWith("capabilities?id=eq") && m === "GET") return ok([{ id: "11111111-1111-1111-1111-111111111111", slug: "zoe-x-abc123", default_intent_slug: "some-intent" }]);
    if (u.startsWith("skill_profiles?slug=eq.some-intent")) return ok([{ traits: intentTraits }]);
    return ok([]);
  };
  return { sent, deps: { supabaseUrl: "https://x.test", supabaseKey: "k", fetchImpl } };
}
{
  const d = delFake({ scope_capability: true });
  assert.deepEqual(await deleteCapability({ capabilityId: "11111111-1111-1111-1111-111111111111" }, d.deps), { deleted: "zoe-x-abc123" });
  assert.deepEqual(d.sent.filter(x => x.startsWith("DELETE")), ["DELETE capability_skill_profiles", "DELETE agent_capability_assignments", "DELETE capabilities"], "links, assignment, then the capability; skill_profiles is never touched");
  const refused = delFake({ handler: "agent-bundle" });
  await assert.rejects(deleteCapability({ capabilityId: "11111111-1111-1111-1111-111111111111" }, refused.deps), e => e.status === 403);
  assert.ok(!refused.sent.some(x => x.startsWith("DELETE")), "a Knowledge / Teach / platform capability deletes nothing");
}

// ── what an AI client receives: every Skill field except the model settings ──────────────────────────────────────
{
  const { readCapabilitySkills } = await import("../../api/_lib/handlers/agent-bundle.js");
  const seen = [];
  globalThis.fetch = async (url) => {
    const u = String(url); seen.push(u.split("/rest/v1/")[1]);
    const ok = b => ({ ok: true, status: 200, json: async () => b });
    if (u.includes("agent_capability_assignments")) return ok([{ capability_slug: "zoe-knowledge" }, { capability_slug: "zoe-x-abc123" }]);
    if (u.includes("/capabilities?")) return ok([{ slug: "zoe-knowledge", name: "Zoe's Knowledge", description: "d" }, { slug: "zoe-x-abc123", name: "Bid review", description: "r" }].filter(c => decodeURIComponent(u).includes(`"${c.slug}"`)));
    if (u.includes("capability_skill_profiles")) return ok([{ capability_slug: "zoe-x-abc123", level: 1, display_order: 1, skill_profiles: { slug: "s1", name: "Claim check", skill_type_slug: "intent", description: "d", objective: "o", method: "m", tone: "t", confidence: "c", output_desc: "od", notes: "n", traits: { a: 1 }, guardrails: ["g"], llm_model: "SECRET-MODEL", temperature: 0.2 } }]);
    return ok([]);
  };
  const out = await readCapabilitySkills("zoe-k3x9ab", "global");
  assert.deepEqual(out.map(c => c.slug), ["zoe-knowledge", "zoe-x-abc123"]);
  assert.deepEqual(out[0].skills, [], "the Knowledge capability carries no Skills");
  const sk = out[1].skills[0];
  for (const f of ["name", "skill_type_slug", "description", "objective", "method", "tone", "confidence", "output_desc", "notes", "traits", "guardrails"]) assert.ok(sk[f] !== undefined && sk[f] !== null, `${f} reaches the AI client`);
  assert.ok(!("llm_model" in sk) && !("temperature" in sk) && !JSON.stringify(out).includes("SECRET-MODEL"), "model settings never do");
  assert.equal(sk.skill_type_slug, "intent", "an Intent Skill is included too (the prompt builder skips it; this list does not)");
  assert.ok(seen.some(x => x.includes("skill_profiles(slug,name,skill_type_slug,description,objective,method,tone,confidence,output_desc,notes,traits,guardrails)")), "the read names its columns");
  const scoped = await readCapabilitySkills("zoe-k3x9ab", "global", "zoe-x-abc123");
  assert.deepEqual(scoped.map(c => c.slug), ["zoe-x-abc123"], "a scoped call lists that one capability");
}

// ── the page ────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const sk = read("src/screens/personnel/SkillEditor.jsx");
  // author tags are recorded in the database only: the page never prints them
  assert.ok(!sk.includes("Created: ") && !sk.includes("Last edited: ") && !sk.includes("AuthorTag"), "no created / last edited line on the page");
  // model and key source are not shown on a Skill (read view or form); the saved values still ride along in toForm()
  assert.ok(!sk.includes('label="Model"') && !sk.includes('label="Key source"') && !sk.includes("key source") && !sk.includes("Temperature") && !sk.includes("Max tokens"), "no model or key source on a Skill");
  assert.ok(sk.includes("for (const [k] of MODEL_FIELDS) f[k] = show(sp[k]);"), "a Skill save sends the stored model settings back unchanged");
  assert.ok(sk.includes('"delete_capability"') && sk.includes("Its Skills are kept"));
  assert.ok(sk.includes("export function CapabilityDrawer") && sk.includes("useState(false)") && sk.includes("borderLeft: `2px solid ${T.line}`") && sk.includes("paddingLeft: 14"), "the drawer indents its Skills under the capability");
  assert.equal(count(read("src/screens/PersonnelScreen.jsx"), "<CapabilityDrawer count="), 1);
  // the card explains itself: capability, Skills, and why to fill them in
  assert.ok(sk.includes("export function CapabilitiesGuide") && sk.includes("How your agent gets good at things") && sk.includes("Skills</strong> are what make it good at that"));
  assert.ok(sk.includes("useState(skillCount === 0)"), "open while the agent has no Skills, closed once it has some");
  assert.equal(count(read("src/screens/PersonnelScreen.jsx"), "<CapabilitiesGuide canAdd={isPrivateAgent(agent)}"), 1);
}

console.log("ok add-capability");
