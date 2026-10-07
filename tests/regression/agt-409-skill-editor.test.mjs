// DeepBench v7.0.808 | tests/regression/agt-409-skill-editor.test.mjs | AGT-409 -- the Skill editor on
// the Personnel Profile tab (Proposed arrangement): a DeepBench user edits a Skill's fields in place. The
// save is lib/skill-write.js's updateSkill() behind the `update_skill` POST action on /api/agent-configs.
//
// PURE (always run):
//   (a) readSkillInput() is CALLED: a valid body is trimmed; a missing/malformed skill_id, an unknown or
//       read-only field (slug, skill_type_slug, execution_type, api_key_source), a blank name, bad JSON,
//       a traits array, temperature 3, max_tokens 0 and max_tokens 1.5 are each refused by name. CONTROL:
//       temperature 0 and max_tokens 1 are accepted. A field absent from the body is absent from `fields`.
// FAKE fetch (always run):
//   (b) the skill_profiles PATCH body is exactly the allowlisted fields and nothing else; an empty
//       result is a 404 `Skill not found`.
// STATIC (always run):
//   (c) the route holds `"update_skill"` once; PersonnelScreen mounts SkillEditorRow only under `proposed`.
//   (d) skillBody() is CALLED (compiled from SkillEditor.jsx's own source): bad JSON throws, blank numbers
//       become null.
// LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN):
//   (e) a THROWAWAY skill_profiles row (never an active agent's) is inserted, edited through updateSkill(),
//       read back, restored, and deleted.
//
// BASELINE: RED on the unchanged tree -- lib/skill-write.js does not exist.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const count = (hay, needle) => hay.split(needle).length - 1;

const ID = "11111111-2222-4333-8444-555555555555";

function fake(respond) {
  const sent = [];
  const fetchImpl = async (url, init = {}) => {
    const entry = { method: init.method || "GET", url: String(url), body: init.body ? JSON.parse(init.body) : null };
    sent.push(entry);
    const answer = respond(entry);
    return { ok: answer.status < 300, status: answer.status, json: async () => answer.json, text: async () => JSON.stringify(answer.json) };
  };
  return { fetchImpl, sent };
}

export default async function run() {
  const { readSkillInput, updateSkill, EDITABLE_FIELDS } = await import("../../lib/skill-write.js");
  assert.equal(typeof readSkillInput, "function", "lib/skill-write.js must export readSkillInput");
  assert.equal(typeof updateSkill, "function", "lib/skill-write.js must export updateSkill");

  // ── (a) readSkillInput, called ─────────────────────────────────────────────
  const ok = readSkillInput({ action: "update_skill", tenant_id: "global", skill_id: ID, name: "  Renamed ", objective: "Do it", traits: '{"a":1}', temperature: 0.5, max_tokens: 4000 });
  assert.deepEqual(ok, { skillId: ID, fields: { name: "Renamed", objective: "Do it", traits: { a: 1 }, temperature: 0.5, max_tokens: 4000 } });
  assert.deepEqual(Object.keys(readSkillInput({ skill_id: ID, tone: "" }).fields), ["tone"], "only the named field is carried");
  assert.equal(readSkillInput({ skill_id: ID, tone: "" }).fields.tone, null, "a blank text field saves as null");

  const refused = (body, fragment) => {
    const r = readSkillInput({ skill_id: ID, ...body });
    assert.ok(r.error && r.error.includes(fragment), `${JSON.stringify(body)} -> expected "${fragment}", got ${JSON.stringify(r)}`);
  };
  assert.equal(readSkillInput({ name: "x" }).error, "skill_id required");
  assert.equal(readSkillInput({ skill_id: "not-a-uuid", name: "x" }).error, "skill_id required");
  for (const key of ["slug", "skill_type_slug", "execution_type", "api_key_source", "id", "tenant_id_x", "created_at"]) refused({ [key]: "x" }, `${key} cannot be edited`);
  refused({ name: "   " }, "Enter a skill name");
  refused({ traits: "{nope" }, "traits must be valid JSON");
  refused({ traits: [1] }, "traits must be a JSON object");
  refused({ guardrails: 5 }, "guardrails must be a JSON object or list");
  refused({ temperature: 3 }, "temperature must be between 0 and 2");
  refused({ temperature: "abc" }, "temperature must be a number");
  refused({ max_tokens: 0 }, "max_tokens must be between 1 and 200000");
  refused({ max_tokens: 1.5 }, "max_tokens must be a whole number");
  refused({ name: "x".repeat(201) }, "name is at most 200");
  refused({}, "Nothing to save");
  // CONTROLS: the bounds are inclusive, and both guardrails shapes in the data are accepted.
  assert.equal(readSkillInput({ skill_id: ID, temperature: 0 }).fields.temperature, 0);
  assert.equal(readSkillInput({ skill_id: ID, max_tokens: 1 }).fields.max_tokens, 1);
  assert.deepEqual(readSkillInput({ skill_id: ID, guardrails: [] }).fields.guardrails, []);
  assert.deepEqual(readSkillInput({ skill_id: ID, guardrails: { must: [], must_not: [] } }).fields.guardrails, { must: [], must_not: [] });
  assert.ok(!EDITABLE_FIELDS.includes("slug") && !EDITABLE_FIELDS.includes("api_key_source"), "read-only columns are not on the allowlist");

  // ── (b) fake fetch ─────────────────────────────────────────────────────────
  const live = { supabaseUrl: "https://example.test", supabaseKey: "k" };
  const f1 = fake(() => ({ status: 200, json: [{ id: ID, name: "Renamed" }] }));
  const saved = await updateSkill({ skillId: ID, fields: { name: "Renamed", temperature: 0.2 } }, { ...live, fetchImpl: f1.fetchImpl });
  assert.equal(saved.skill.name, "Renamed");
  assert.equal(f1.sent.length, 1);
  assert.equal(f1.sent[0].method, "PATCH");
  assert.ok(f1.sent[0].url.includes(`skill_profiles?id=eq.${ID}`), "PATCH targets the one row by id");
  assert.deepEqual(f1.sent[0].body, { name: "Renamed", temperature: 0.2 }, "the body is exactly the fields given");
  const f2 = fake(() => ({ status: 200, json: [] }));
  await assert.rejects(updateSkill({ skillId: ID, fields: { name: "x" } }, { ...live, fetchImpl: f2.fetchImpl }), e => e.status === 404 && e.message === "Skill not found");

  // ── (c) static ─────────────────────────────────────────────────────────────
  const route = read("api/agent-configs.js");
  assert.equal(count(route, '"update_skill"'), 1, 'the route holds "update_skill" once');
  const screen = read("src/screens/PersonnelScreen.jsx");
  assert.equal(count(screen, "<SkillEditorRow"), 1, "PersonnelScreen mounts SkillEditorRow once");
  assert.ok(/proposed\s*\n?\s*\?\s*<SkillEditorRow/.test(screen), "SkillEditorRow is mounted only under `proposed`");

  // ── (d) skillBody, called ──────────────────────────────────────────────────
  const src = read("src/screens/personnel/SkillEditor.jsx");
  const fn = src.slice(src.indexOf("export function skillBody"), src.indexOf("export async function saveSkill"));
  const skillBody = new Function(`${fn.replace("export function", "function")}; return skillBody;`)();
  assert.deepEqual(skillBody({ name: "a", traits: '{"x":1}', guardrails: "", temperature: "", max_tokens: "100" }), { name: "a", traits: { x: 1 }, guardrails: null, temperature: null, max_tokens: 100 });
  assert.throws(() => skillBody({ traits: "{bad" }), /traits is not valid JSON/);

  // ── (e) LIVE ───────────────────────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    notRun("(e) live round trip on a throwaway skill row", "SUPABASE_URL / SUPABASE_SERVICE_KEY not set (node --env-file-if-exists=.env.local)");
    return;
  }
  const rest = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/`;
  const headers = { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  const slug = `agt-409-throwaway-${Date.now()}`;
  const made = await fetch(`${rest}skill_profiles?select=*`, {
    method: "POST", headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ slug, name: "AGT-409 throwaway", skill_type_slug: "intent", objective: "before-objective", temperature: 0, max_tokens: 300, traits: { k: "before" }, guardrails: { must: [], must_not: [] } }),
  });
  assert.ok(made.ok, `throwaway insert HTTP ${made.status}`);
  const before = (await made.json())[0];
  const get = async () => (await (await fetch(`${rest}skill_profiles?id=eq.${before.id}&select=*`, { headers })).json())[0];
  try {
    const input = readSkillInput({ skill_id: before.id, name: "AGT-409 throwaway EDITED", objective: "after-objective", temperature: 0.7, max_tokens: 1234, traits: { k: "after" }, guardrails: ["no"] });
    assert.ok(!input.error, input.error);
    await updateSkill(input, { supabaseUrl, supabaseKey });
    const after = await get();
    assert.equal(after.name, "AGT-409 throwaway EDITED");
    assert.equal(after.objective, "after-objective");
    assert.equal(Number(after.temperature), 0.7);
    assert.equal(after.max_tokens, 1234);
    assert.deepEqual(after.traits, { k: "after" });
    assert.deepEqual(after.guardrails, ["no"]);
    assert.equal(after.slug, before.slug, "the slug is untouched");
    console.log(`[LIVE] before objective=${before.objective} temp=${before.temperature} max=${before.max_tokens} | after objective=${after.objective} temp=${after.temperature} max=${after.max_tokens}`);
    await updateSkill(readSkillInput({ skill_id: before.id, name: before.name, objective: before.objective, temperature: Number(before.temperature), max_tokens: before.max_tokens, traits: before.traits, guardrails: before.guardrails }), { supabaseUrl, supabaseKey });
    assert.deepEqual(await get(), before, "the throwaway row is restored to its before-image");
    console.log("[LIVE] restored row equals before-image");
  } finally {
    await fetch(`${rest}skill_profiles?id=eq.${before.id}`, { method: "DELETE", headers: { ...headers, Prefer: "return=minimal" } });
  }
}

selfRun(import.meta.url, run);
