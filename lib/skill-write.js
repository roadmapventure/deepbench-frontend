// DeepBench v7.0.808 | lib/skill-write.js | AGT-409 -- the Skill editor's server save: readSkillInput()
// validates a POST body against an allowlist of the editable skill_profiles columns, updateSkill() writes
// them. Used by the `update_skill` action on /api/agent-configs. No model call, so no logAICall().
//
// ALLOWLIST. Only the columns in TEXT_LIMITS, JSON_FIELDS and NUMBER_FIELDS are editable. A body that names
// any other field -- slug, skill_type_slug, execution_type, api_key_source, tenant_id, id, created_at -- is
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
export const EDITABLE_FIELDS = [...Object.keys(TEXT_LIMITS), ...JSON_FIELDS, ...Object.keys(NUMBER_FIELDS)];

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
