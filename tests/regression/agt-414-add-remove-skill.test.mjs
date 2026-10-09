// DeepBench v7.0.812 | tests/regression/agt-414-add-remove-skill.test.mjs | AGT-414 -- add a Skill to a capability from
// the Capabilities card (name + type, optional text) and remove one from it (the link only).
//
// PURE (always run):
//   (a) skillSlugFor() is CALLED: a name becomes a lowercase slug plus the suffix; a name with nothing usable is
//       "skill-<suffix>". readAddSkillInput() trims, refuses a blank name, an unknown type, a bad capability
//       slug and any unlisted field by name. readRemoveSkillInput() needs both slugs.
// FAKE fetch (always run) -- a recording fetchImpl:
//   (b) addSkillToCapability() reads the capability, reads the last display_order, POSTs the skill row, then POSTs
//       the link at level 1, display_order last+1. CONTROL: a failed link DELETEs the skill row it just made and
//       throws. An absent capability is a 404 and writes nothing.
//   (c) removeSkillFromCapability() DELETEs only the capability_skill_profiles row (never skill_profiles); an empty
//       result is a 404.
// STATIC (always run):
//   (d) the route holds both actions once; PersonnelScreen mounts AddSkillForm once, under `proposed`.
// LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN):
//   (e) on a THROWAWAY capability (assigned to no agent): add a Skill, read the skill row and the link back, remove
//       the Skill, and prove the link is gone while the skill row is still there; `finally` deletes everything.
//
// BASELINE: RED on the unchanged tree -- lib/skill-write.js has no addSkillToCapability.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const count = (hay, needle) => hay.split(needle).length - 1;

function fake(respond) {
  const sent = [];
  const fetchImpl = async (url, init = {}) => {
    const entry = { method: init.method || "GET", table: String(url).split("/rest/v1/")[1].split("?")[0], url: String(url), body: init.body ? JSON.parse(init.body) : null };
    sent.push(entry);
    const answer = respond(entry) || { status: 200, json: [] };
    return { ok: answer.status < 300, status: answer.status, json: async () => answer.json, text: async () => JSON.stringify(answer.json) };
  };
  return { fetchImpl, sent };
}

export default async function run() {
  const lib = await import("../../lib/skill-write.js");
  const { skillSlugFor, readAddSkillInput, readRemoveSkillInput, addSkillToCapability, removeSkillFromCapability } = lib;
  assert.equal(typeof addSkillToCapability, "function", "lib/skill-write.js must export addSkillToCapability");
  assert.equal(typeof removeSkillFromCapability, "function", "lib/skill-write.js must export removeSkillFromCapability");

  // ── (a) ────────────────────────────────────────────────────────────────────
  assert.equal(skillSlugFor("Plain Language Tone!", "k3x9ab"), "plain-language-tone-k3x9ab");
  assert.equal(skillSlugFor("***", "k3x9ab"), "skill-k3x9ab");
  assert.ok(skillSlugFor("x".repeat(90), "k3x9ab").length <= 47, "the slug stays short");
  assert.deepEqual(readAddSkillInput({ action: "add_skill_to_capability", tenant_id: "g", capability_slug: "zoe-knowledge", name: "  Tone ", skill_type_slug: "behavior", objective: " be kind ", method: "" }),
    { capabilitySlug: "zoe-knowledge", fields: { name: "Tone", skill_type_slug: "behavior", objective: "be kind" } });
  const refused = (body, fragment) => {
    const r = readAddSkillInput({ capability_slug: "zoe-knowledge", name: "x", skill_type_slug: "intent", ...body });
    assert.ok(r.error && r.error.includes(fragment), `${JSON.stringify(body)} -> expected "${fragment}", got ${JSON.stringify(r)}`);
  };
  refused({ name: "  " }, "Enter a skill name");
  refused({ skill_type_slug: "banana" }, "skill_type_slug must be one of");
  refused({ capability_slug: "Bad Slug" }, "capability_slug required");
  refused({ slug: "x" }, "slug cannot be set");
  refused({ traits: {} }, "traits cannot be set");
  refused({ objective: "x".repeat(20001) }, "objective is at most 20000");
  assert.deepEqual(readRemoveSkillInput({ capability_slug: "zoe-knowledge", skill_slug: "tone-k3x9ab" }), { capabilitySlug: "zoe-knowledge", skillSlug: "tone-k3x9ab" });
  assert.equal(readRemoveSkillInput({ capability_slug: "zoe-knowledge" }).error, "skill_slug required");
  assert.ok(readRemoveSkillInput({ capability_slug: "zoe-knowledge", skill_slug: "a", name: "x" }).error.includes("name cannot be set"));

  // ── (b) ────────────────────────────────────────────────────────────────────
  const deps = f => ({ supabaseUrl: "https://example.test", supabaseKey: "k", fetchImpl: f.fetchImpl, suffix: () => "abc123" });
  const input = { capabilitySlug: "zoe-knowledge", fields: { name: "Tone", skill_type_slug: "behavior" } };
  const good = fake(({ method, table }) => {
    if (table === "capabilities") return { status: 200, json: [{ slug: "zoe-knowledge" }] };
    if (table === "capability_skill_profiles" && method === "GET") return { status: 200, json: [{ display_order: 4 }] };
    if (table === "skill_profiles" && method === "POST") return { status: 201, json: [{ id: "uuid-1", slug: "tone-abc123", name: "Tone", skill_type_slug: "behavior" }] };
    if (table === "capability_skill_profiles" && method === "POST") return { status: 201, json: [] };
    return null;
  });
  const out = await addSkillToCapability(input, deps(good));
  assert.equal(out.skill.slug, "tone-abc123");
  assert.equal(out.skill.level, 1);
  assert.deepEqual(good.sent.map(s => `${s.method} ${s.table}`), ["GET capabilities", "GET capability_skill_profiles", "POST skill_profiles", "POST capability_skill_profiles"]);
  assert.deepEqual(good.sent[2].body, { slug: "tone-abc123", name: "Tone", skill_type_slug: "behavior" }, "the skill row carries only what was given");
  assert.deepEqual(good.sent[3].body, { capability_slug: "zoe-knowledge", skill_profile_slug: "tone-abc123", level: 1, display_order: 5 });

  const bad = fake(({ method, table }) => {
    if (table === "capabilities") return { status: 200, json: [{ slug: "zoe-knowledge" }] };
    if (table === "capability_skill_profiles" && method === "POST") return { status: 500, json: { message: "boom" } };
    if (table === "skill_profiles" && method === "POST") return { status: 201, json: [{ id: "uuid-1", slug: "tone-abc123" }] };
    return null;
  });
  await assert.rejects(addSkillToCapability(input, deps(bad)), /Saving capability_skill_profiles failed/);
  const last = bad.sent[bad.sent.length - 1];
  assert.deepEqual([last.method, last.table], ["DELETE", "skill_profiles"], "a failed link removes the skill row it just made");

  const none = fake(({ table }) => (table === "capabilities" ? { status: 200, json: [] } : null));
  await assert.rejects(addSkillToCapability(input, deps(none)), e => e.status === 404 && e.message === "Capability not found");
  assert.equal(none.sent.length, 1, "an absent capability writes nothing");

  // ── (c) ────────────────────────────────────────────────────────────────────
  const rm = fake(() => ({ status: 200, json: [{ id: "link-1" }] }));
  await removeSkillFromCapability({ capabilitySlug: "zoe-knowledge", skillSlug: "tone-abc123" }, deps(rm));
  assert.deepEqual(rm.sent.map(s => `${s.method} ${s.table}`), ["DELETE capability_skill_profiles", "GET skill_profiles"], "an untagged (platform) Skill is only ever unlinked");
  assert.deepEqual([rm.sent[0].method, rm.sent[0].table], ["DELETE", "capability_skill_profiles"]);
  assert.ok(rm.sent[0].url.includes("capability_slug=eq.zoe-knowledge") && rm.sent[0].url.includes("skill_profile_slug=eq.tone-abc123"));
  // A Skill made on DeepBench (it has an author tag) is deleted for good once no capability holds it; one still held elsewhere is not.
  const fakeDel = (othersHold) => fake(({ method, table }) => {
    if (table === "capability_skill_profiles" && method === "DELETE") return { status: 200, json: [{ id: "link-1" }] };
    if (table === "skill_profiles" && method === "GET") return { status: 200, json: [{ id: "uuid-9", created_by_type: "end_user" }] };
    if (table === "capability_skill_profiles" && method === "GET") return { status: 200, json: othersHold ? [{ id: "link-2" }] : [] };
    if (table === "skill_profiles" && method === "DELETE") return { status: 204, json: [] };
    return null;
  });
  const gone = fakeDel(false);
  assert.equal((await removeSkillFromCapability({ capabilitySlug: "zoe-knowledge", skillSlug: "tone-abc123" }, deps(gone))).deleted, true);
  assert.deepEqual(gone.sent.at(-1).method + " " + gone.sent.at(-1).table, "DELETE skill_profiles");
  const kept = fakeDel(true);
  assert.equal((await removeSkillFromCapability({ capabilitySlug: "zoe-knowledge", skillSlug: "tone-abc123" }, deps(kept))).deleted, false);
  assert.ok(!kept.sent.some(s => s.method === "DELETE" && s.table === "skill_profiles"), "a Skill another capability still holds is never deleted");
  const rm0 = fake(() => ({ status: 200, json: [] }));
  await assert.rejects(removeSkillFromCapability({ capabilitySlug: "zoe-knowledge", skillSlug: "nope" }, deps(rm0)), e => e.status === 404);

  // ── (d) ────────────────────────────────────────────────────────────────────
  const route = read("api/agent-configs.js");
  assert.equal(count(route, '"add_skill_to_capability"'), 1);
  assert.equal(count(route, '"remove_skill_from_capability"'), 1);
  const screen = read("src/screens/PersonnelScreen.jsx");
  assert.equal(count(screen, "<AddSkillForm"), 1, "PersonnelScreen mounts AddSkillForm once");
  assert.ok(screen.includes("{proposed && <AddSkillForm"), "AddSkillForm is mounted only under `proposed`");
  assert.ok(read("src/screens/personnel/SkillEditor.jsx").includes("remove_skill_from_capability"), "the Remove button posts remove_skill_from_capability");

  // ── (e) LIVE ───────────────────────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    notRun("(e) live add and remove on a throwaway capability", "SUPABASE_URL / SUPABASE_SERVICE_KEY not set (node --env-file-if-exists=.env.local)");
    return;
  }
  const rest = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/`;
  const headers = { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  const capSlug = `agt-414-throwaway-${Date.now()}`;
  const made = await fetch(`${rest}capabilities?select=*`, { method: "POST", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ slug: capSlug, name: "AGT-414 throwaway", description: "d", execution_type: "deterministic" }) });
  assert.ok(made.ok, `throwaway capability insert HTTP ${made.status}`);
  const cap = (await made.json())[0];
  let skillSlug = null;
  const live = { supabaseUrl, supabaseKey };
  const get = async q => (await (await fetch(`${rest}${q}`, { headers })).json());
  try {
    const added = await addSkillToCapability({ capabilitySlug: capSlug, fields: { name: "AGT-414 live skill", skill_type_slug: "format", objective: "live-objective" } }, live);
    skillSlug = added.skill.slug;
    const skillRows = await get(`skill_profiles?slug=eq.${skillSlug}&select=slug,name,skill_type_slug,objective`);
    const linkRows = await get(`capability_skill_profiles?capability_slug=eq.${capSlug}&select=skill_profile_slug,level,display_order`);
    assert.deepEqual(skillRows, [{ slug: skillSlug, name: "AGT-414 live skill", skill_type_slug: "format", objective: "live-objective" }]);
    assert.deepEqual(linkRows, [{ skill_profile_slug: skillSlug, level: 1, display_order: 1 }]);
    console.log(`[LIVE] added skill ${skillSlug} (format, level 1, order 1)`);
    await removeSkillFromCapability({ capabilitySlug: capSlug, skillSlug }, live);
    assert.deepEqual(await get(`capability_skill_profiles?capability_slug=eq.${capSlug}&select=id`), [], "the link is gone");
    assert.equal((await get(`skill_profiles?slug=eq.${skillSlug}&select=slug`)).length, 1, "the Skill row itself is kept");
    console.log("[LIVE] removed: link gone, skill row kept");
  } finally {
    if (skillSlug) await fetch(`${rest}skill_profiles?slug=eq.${skillSlug}`, { method: "DELETE", headers: { ...headers, Prefer: "return=minimal" } });
    await fetch(`${rest}capability_skill_profiles?capability_slug=eq.${capSlug}`, { method: "DELETE", headers: { ...headers, Prefer: "return=minimal" } });
    await fetch(`${rest}capabilities?id=eq.${cap.id}`, { method: "DELETE", headers: { ...headers, Prefer: "return=minimal" } });
  }
}

selfRun(import.meta.url, run);
