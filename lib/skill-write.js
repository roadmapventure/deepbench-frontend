// DeepBench v7.0.814 | lib/skill-write.js | AGT-415 -- SKILL_LEVELS, readSkillLevelInput() and updateSkillLevel(): one of five levels saves its starting score to agents.skill_score.
// DeepBench v7.0.810 | lib/skill-write.js | AGT-413 -- skill_type_slug joins the allowlist (one of the six types in
// SKILL_TYPES); readCapabilityInput() / updateCapability() save a capability's name and description for the
// `update_capability` action. The slug stays read-only: it is the AI client's tool name.
// DeepBench v7.0.808 | lib/skill-write.js | AGT-409 -- the Skill editor's server save: readSkillInput()
// validates a POST body against an allowlist of the editable skill_profiles columns, updateSkill() writes
// them. Used by the `update_skill` action on /api/agent-configs. No model call, so no logAICall().
//
// ALLOWLIST. Only the columns in TEXT_LIMITS, JSON_FIELDS, NUMBER_FIELDS and skill_type_slug are editable. A
// body that names any other field -- slug, execution_type, api_key_source, tenant_id, id, created_at -- is
// refused by name, never silently dropped, so a client that tries to write a read-only column finds out.
// A field absent from the body is left alone (a partial update); present and blank saves as null.
//
// NO LOGIN YET (HAR-39), exactly as update_identity: the route has no caller to check, so whoever can open
// the Personnel file can save. The day a viewer exists this is the one place to add the owner check.

const BODY_KEYS = new Set(["action", "tenant_id", "skill_id"]);

export const TEXT_LIMITS = {
  name: 200, description: 2000, objective: 20000, method: 20000, tone: 2000,
  confidence: 2000, output_desc: 20000, notes: 20000, llm_model: 120, llm_provider: 60,
};
export const JSON_FIELDS = ["traits", "guardrails"];
export const NUMBER_FIELDS = { temperature: { min: 0, max: 2, integer: false }, max_tokens: { min: 1, max: 200000, integer: true } };
export const SKILL_TYPES = ["identity", "behavior", "knowledge", "intent", "format", "guardrails"];
export const EDITABLE_FIELDS = [...Object.keys(TEXT_LIMITS), "skill_type_slug", ...JSON_FIELDS, ...Object.keys(NUMBER_FIELDS)];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function failure(message, status) {
  const error = new Error(message);
  if (status) error.status = status;
  return error;
}

// body -> { skillId, fields } or { error }.
export function readSkillInput(body) {
  const skillId = typeof body?.skill_id === "string" ? body.skill_id.trim() : "";
  if (!UUID.test(skillId)) return { error: "skill_id required" };

  for (const key of Object.keys(body)) {
    if (BODY_KEYS.has(key) || EDITABLE_FIELDS.includes(key)) continue;
    return { error: `${key} cannot be edited` };
  }

  const fields = {};
  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    if (!(key in body)) continue;
    const value = body[key];
    if (value !== null && typeof value !== "string") return { error: `${key} must be text` };
    const trimmed = value === null ? "" : value.trim();
    if (key === "name" && !trimmed) return { error: "Enter a skill name" };
    if (trimmed.length > max) return { error: `${key} is at most ${max} characters` };
    fields[key] = trimmed || null;
  }

  if ("skill_type_slug" in body) {
    if (!SKILL_TYPES.includes(body.skill_type_slug)) return { error: `skill_type_slug must be one of ${SKILL_TYPES.join(", ")}` };
    fields.skill_type_slug = body.skill_type_slug;
  }

  for (const key of JSON_FIELDS) {
    if (!(key in body)) continue;
    let value = body[key];
    if (typeof value === "string") {
      if (!value.trim()) { fields[key] = null; continue; }
      try { value = JSON.parse(value); } catch { return { error: `${key} must be valid JSON` }; }
    }
    if (value === null) { fields[key] = null; continue; }
    const isObject = typeof value === "object" && !Array.isArray(value);
    // traits is a key/value map; guardrails is a { must, must_not } map today and a list on two rows.
    if (key === "traits" ? !isObject : !(isObject || Array.isArray(value))) {
      return { error: key === "traits" ? "traits must be a JSON object" : "guardrails must be a JSON object or list" };
    }
    fields[key] = value;
  }

  for (const [key, { min, max, integer }] of Object.entries(NUMBER_FIELDS)) {
    if (!(key in body)) continue;
    const raw = body[key];
    if (raw === null || raw === "") { fields[key] = null; continue; }
    const value = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(value)) return { error: `${key} must be a number` };
    if (integer && !Number.isInteger(value)) return { error: `${key} must be a whole number` };
    if (value < min || value > max) return { error: `${key} must be between ${min} and ${max}` };
    fields[key] = value;
  }

  if (Object.keys(fields).length === 0) return { error: "Nothing to save" };
  return { skillId, fields };
}

const READ_COLS = ["id", "slug", "skill_type_slug", "execution_type", "api_key_source", ...EDITABLE_FIELDS].join(",");

// PATCHes the one skill_profiles row; 404 when the id names no row. Returns { skill } -- the saved row.
export async function updateSkill({ skillId, fields }, { supabaseUrl, supabaseKey, fetchImpl = fetch }) {
  const res = await fetchImpl(
    `${String(supabaseUrl).replace(/\/+$/, "")}/rest/v1/skill_profiles?id=eq.${encodeURIComponent(skillId)}&select=${READ_COLS}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: "return=representation" },
      body: JSON.stringify(fields),
    });
  if (!res.ok) {
    const text = (await res.text().catch(() => "")).slice(0, 200);
    throw failure(`Saving skill_profiles failed: HTTP ${res.status} ${text}`.trim());
  }
  const rows = await res.json();
  const skill = Array.isArray(rows) ? rows[0] : rows;
  if (!skill) throw failure("Skill not found", 404);
  return { skill };
}

// ── FEATURE: AGT-413 -- the Capability editor's save: name and description of one capability. ──────────
// Allowlist is those two fields; slug is read-only (it is the AI client's tool name). NOTE: an agent rename
// (update_identity) rewrites its `<id>-knowledge` and `<id>-teach` capability names from a template, so a
// hand edit of those two names is overwritten by the next rename.
const CAPABILITY_KEYS = new Set(["action", "tenant_id", "capability_id"]);
const CAPABILITY_TEXT = { name: 200, description: 2000 };

// body -> { capabilityId, fields } or { error }.
export function readCapabilityInput(body) {
  const capabilityId = typeof body?.capability_id === "string" ? body.capability_id.trim() : "";
  if (!UUID.test(capabilityId)) return { error: "capability_id required" };
  for (const key of Object.keys(body)) {
    if (CAPABILITY_KEYS.has(key) || key in CAPABILITY_TEXT) continue;
    return { error: `${key} cannot be edited` };
  }
  const fields = {};
  for (const [key, max] of Object.entries(CAPABILITY_TEXT)) {
    if (!(key in body)) continue;
    const value = body[key];
    if (value !== null && typeof value !== "string") return { error: `${key} must be text` };
    const trimmed = value === null ? "" : value.trim();
    if (key === "name" && !trimmed) return { error: "Enter a capability name" };
    if (trimmed.length > max) return { error: `${key} is at most ${max} characters` };
    fields[key] = trimmed || null;
  }
  if (Object.keys(fields).length === 0) return { error: "Nothing to save" };
  return { capabilityId, fields };
}

// PATCHes the one capabilities row; 404 when the id names no row. Returns { capability }.
export async function updateCapability({ capabilityId, fields }, { supabaseUrl, supabaseKey, fetchImpl = fetch }) {
  const res = await fetchImpl(
    `${String(supabaseUrl).replace(/\/+$/, "")}/rest/v1/capabilities?id=eq.${encodeURIComponent(capabilityId)}&select=id,slug,name,description`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: "return=representation" },
      body: JSON.stringify(fields),
    });
  if (!res.ok) {
    const text = (await res.text().catch(() => "")).slice(0, 200);
    throw failure(`Saving capabilities failed: HTTP ${res.status} ${text}`.trim());
  }
  const rows = await res.json();
  const capability = Array.isArray(rows) ? rows[0] : rows;
  if (!capability) throw failure("Capability not found", 404);
  return { capability };
}

// ── FEATURE: AGT-414 -- add a Skill to a capability, and remove one from it. ────────────────────────────
// add_skill_to_capability creates ONE skill_profiles row (name, type, optional description / objective /
// method; every other column keeps its table default) and links it to the capability through
// capability_skill_profiles at level 1, last in display order. The two writes are ordered, and a failed link
// removes the skill row it just made. remove_skill_from_capability deletes the LINK only; the Skill row stays
// (it may sit on other capabilities, and nothing here deletes a Skill).
const SLUG = /^[a-z0-9][a-z0-9-]{0,100}$/;
const ADD_KEYS = new Set(["action", "tenant_id", "capability_slug", "name", "skill_type_slug", "description", "objective", "method"]);
const ADD_TEXT = { description: 2000, objective: 20000, method: 20000 };
const REMOVE_KEYS = new Set(["action", "tenant_id", "capability_slug", "skill_slug"]);
const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

// "Plain Language Tone" + "k3x9ab" -> "plain-language-tone-k3x9ab". The suffix keeps two Skills with one name apart.
export function skillSlugFor(name, suffix) {
  const base = String(name).normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "") || "skill";
  return `${base}-${suffix}`;
}
export function randomSkillSuffix() {
  let out = "";
  for (let i = 0; i < 6; i++) out += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
  return out;
}

// body -> { capabilitySlug, fields: { name, skill_type_slug, description?, objective?, method? } } or { error }.
export function readAddSkillInput(body) {
  const capabilitySlug = typeof body?.capability_slug === "string" ? body.capability_slug.trim() : "";
  if (!SLUG.test(capabilitySlug)) return { error: "capability_slug required" };
  for (const key of Object.keys(body)) if (!ADD_KEYS.has(key)) return { error: `${key} cannot be set when adding a skill` };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "Enter a skill name" };
  if (name.length > TEXT_LIMITS.name) return { error: `name is at most ${TEXT_LIMITS.name} characters` };
  if (!SKILL_TYPES.includes(body.skill_type_slug)) return { error: `skill_type_slug must be one of ${SKILL_TYPES.join(", ")}` };
  const fields = { name, skill_type_slug: body.skill_type_slug };
  for (const [key, max] of Object.entries(ADD_TEXT)) {
    if (!(key in body)) continue;
    const value = body[key];
    if (value !== null && typeof value !== "string") return { error: `${key} must be text` };
    const trimmed = value === null ? "" : value.trim();
    if (trimmed.length > max) return { error: `${key} is at most ${max} characters` };
    if (trimmed) fields[key] = trimmed;
  }
  return { capabilitySlug, fields };
}

function restFor({ supabaseUrl, supabaseKey, fetchImpl = fetch }) {
  const rest = `${String(supabaseUrl).replace(/\/+$/, "")}/rest/v1/`;
  const headers = { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  const call = (method, pathAndQuery, body, prefer) =>
    fetchImpl(rest + pathAndQuery, {
      method,
      headers: method === "GET" ? headers : { ...headers, Prefer: prefer || "return=minimal" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const refused = async (res, what) => failure(`${what} failed: HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`.trim());
  const rows = async (res, what) => { if (!res.ok) throw await refused(res, what); const j = await res.json(); return Array.isArray(j) ? j : j ? [j] : []; };
  return { call, refused, rows };
}

// Returns { skill } -- the new row with its link's level, ready for the card to place under its type header.
export async function addSkillToCapability({ capabilitySlug, fields }, deps) {
  const { call, refused, rows } = restFor(deps);
  const cap = (await rows(await call("GET", `capabilities?slug=eq.${encodeURIComponent(capabilitySlug)}&select=slug&limit=1`), "Reading capabilities"))[0];
  if (!cap) throw failure("Capability not found", 404);
  const last = (await rows(await call("GET", `capability_skill_profiles?capability_slug=eq.${encodeURIComponent(capabilitySlug)}&select=display_order&order=display_order.desc.nullslast&limit=1`), "Reading capability_skill_profiles"))[0];
  const displayOrder = (last && Number.isFinite(last.display_order) ? last.display_order : 0) + 1;

  const slug = skillSlugFor(fields.name, (deps.suffix || randomSkillSuffix)());
  const made = (await rows(await call("POST", "skill_profiles?select=*", { slug, ...fields }, "return=representation"), "Saving skill_profiles"))[0];
  if (!made) throw failure("Saving skill_profiles failed: no row returned");

  const link = await call("POST", "capability_skill_profiles", { capability_slug: capabilitySlug, skill_profile_slug: slug, level: 1, display_order: displayOrder });
  if (!link.ok) {
    await call("DELETE", `skill_profiles?id=eq.${encodeURIComponent(made.id)}`).catch(() => {});
    throw await refused(link, "Saving capability_skill_profiles");
  }
  return { skill: { ...made, level: 1 } };
}

// body -> { capabilitySlug, skillSlug } or { error }.
export function readRemoveSkillInput(body) {
  const capabilitySlug = typeof body?.capability_slug === "string" ? body.capability_slug.trim() : "";
  const skillSlug = typeof body?.skill_slug === "string" ? body.skill_slug.trim() : "";
  if (!SLUG.test(capabilitySlug)) return { error: "capability_slug required" };
  if (!SLUG.test(skillSlug)) return { error: "skill_slug required" };
  for (const key of Object.keys(body)) if (!REMOVE_KEYS.has(key)) return { error: `${key} cannot be set when removing a skill` };
  return { capabilitySlug, skillSlug };
}

// Deletes the one link row; 404 when the capability does not hold that Skill. The Skill itself is never touched.
export async function removeSkillFromCapability({ capabilitySlug, skillSlug }, deps) {
  const { call, rows } = restFor(deps);
  const gone = await rows(await call("DELETE", `capability_skill_profiles?capability_slug=eq.${encodeURIComponent(capabilitySlug)}&skill_profile_slug=eq.${encodeURIComponent(skillSlug)}&select=id`, undefined, "return=representation"), "Removing capability_skill_profiles");
  if (gone.length === 0) throw failure("That capability does not hold that skill", 404);
  return { removed: skillSlug, capability: capabilitySlug };
}

// ── FEATURE: AGT-415 -- the agent's level, set by the user from the Profile top card. ───────────────────
// Five levels, each saved as its STARTING score in agents.skill_score (the column the ladder already reads):
// the ladder bands are 0-30 / 30-55 / 55-75 / 75-90 / 90-100. Existing column, existing route, no DDL.
export const SKILL_LEVELS = [["trainee", 0], ["developing", 30], ["proficient", 55], ["expert", 75], ["principal", 90]];

// body -> { agentId, level, score } or { error }.
export function readSkillLevelInput(body) {
  const agentId = typeof body?.agent_id === "string" ? body.agent_id.trim() : "";
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(agentId)) return { error: "agent_id required" };
  for (const key of Object.keys(body)) if (!["action", "tenant_id", "agent_id", "level"].includes(key)) return { error: `${key} cannot be edited` };
  const hit = SKILL_LEVELS.find(([name]) => name === body.level);
  if (!hit) return { error: `level must be one of ${SKILL_LEVELS.map(([n]) => n).join(", ")}` };
  return { agentId, level: hit[0], score: hit[1] };
}

// PATCHes agents.skill_score; 404 when the id names no agent. Returns { agent: { id, skill_score } }.
export async function updateSkillLevel({ agentId, score }, { supabaseUrl, supabaseKey, fetchImpl = fetch }) {
  const res = await fetchImpl(
    `${String(supabaseUrl).replace(/\/+$/, "")}/rest/v1/agents?id=eq.${encodeURIComponent(agentId)}&select=id,skill_score`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: "return=representation" },
      body: JSON.stringify({ skill_score: score }),
    });
  if (!res.ok) throw failure(`Saving agents failed: HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`.trim());
  const rows = await res.json();
  const agent = Array.isArray(rows) ? rows[0] : rows;
  if (!agent) throw failure("Agent not found", 404);
  return { agent };
}
