// DeepBench v7.0.808 | src/screens/personnel/SkillEditor.jsx | AGT-409 -- the Skill editor (Proposed
// arrangement): each Skill on the Capabilities card expands in place to every skill_profiles field the
// DeepBench user may edit, saved through POST /api/agent-configs `update_skill`. Slug, type, execution type
// and key source are shown read-only. skill_profiles has no "edited by" column, so the stamp below is for
// this page view only (see the ticket's open design question).
import { useState } from "react";
import { T, body, mono } from "../../tokens.js";
import { TENANT_ID } from "../../config.js";

const INPUT = { width: "100%", background: T.cardAlt, border: `1px solid ${T.lineSoft}`, padding: "6px 10px", fontFamily: body, fontSize: 12, color: T.ink, outline: "none", marginBottom: 8, boxSizing: "border-box" };
const LABEL = { fontFamily: mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 };
const GHOST = { fontFamily: mono, fontSize: 9, color: T.muted, background: "transparent", border: `1px solid ${T.lineSoft}`, padding: "4px 11px", cursor: "pointer", textTransform: "uppercase" };
const SAVE = { fontFamily: mono, fontSize: 9, color: T.moss, background: "transparent", border: `1px solid ${T.moss}`, padding: "4px 11px", cursor: "pointer", fontWeight: 700, textTransform: "uppercase" };

// [column, label, kind, rows]
const TEXT_FIELDS = [
  ["name", "Name", "line"], ["description", "Description", "area", 2],
  ["objective", "Objective", "area", 3], ["method", "Method", "area", 4],
  ["tone", "Tone", "area", 2], ["confidence", "Confidence", "area", 2],
  ["output_desc", "Output description", "area", 3], ["notes", "Notes", "area", 2],
];
const JSON_FIELDS = [["traits", "Traits (JSON)"], ["guardrails", "Guardrails (JSON)"]];
const MODEL_FIELDS = [["llm_model", "Model"], ["llm_provider", "Provider"]];

const show = (v) => (v === null || v === undefined ? "" : String(v));
const showJson = (v) => (v === null || v === undefined ? "" : JSON.stringify(v, null, 2));

function toForm(sp) {
  const f = {};
  for (const [k] of TEXT_FIELDS) f[k] = show(sp[k]);
  for (const [k] of MODEL_FIELDS) f[k] = show(sp[k]);
  for (const [k] of JSON_FIELDS) f[k] = showJson(sp[k]);
  f.temperature = show(sp.temperature);
  f.max_tokens = show(sp.max_tokens);
  return f;
}

// Form -> POST body fields. A JSON box is parsed here so a typo is caught before the round trip.
export function skillBody(form) {
  const out = {};
  for (const k of Object.keys(form)) {
    if (k === "traits" || k === "guardrails") {
      const text = form[k].trim();
      if (!text) { out[k] = null; continue; }
      try { out[k] = JSON.parse(text); } catch { throw new Error(`${k} is not valid JSON`); }
    } else if (k === "temperature" || k === "max_tokens") {
      out[k] = form[k].trim() === "" ? null : Number(form[k]);
    } else {
      out[k] = form[k];
    }
  }
  return out;
}

export async function saveSkill(skillId, form) {
  const res = await fetch("/api/agent-configs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_skill", tenant_id: TENANT_ID, skill_id: skillId, ...skillBody(form) }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to save");
  return data.skill;
}

export default function SkillEditorRow({ sp, chip, showToast }) {
  const [skill,  setSkill]  = useState(sp);
  const [open,   setOpen]   = useState(false);
  const [form,   setForm]   = useState(() => toForm(sp));
  const [saving, setSaving] = useState(false);
  const [stamp,  setStamp]  = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveSkill(skill.id, form);
      const next = { ...skill, ...saved };
      setSkill(next);
      setForm(toForm(next));
      setStamp(`Edited by DeepBench · ${new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })}`);
      setOpen(false);
      showToast && showToast("Saved ✦");
    } catch (e) { showToast && showToast("Save failed: " + e.message, "⚠"); }
    setSaving(false);
  };

  const cancel = () => { setForm(toForm(skill)); setOpen(false); };

  return (
    <div style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
        <div style={{ fontFamily: body, fontSize: 11, color: T.mutedDeep, flex: 1 }}>{skill.name}</div>
        <span style={{ fontFamily: mono, fontSize: 7.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", padding: "1px 5px", background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`, flexShrink: 0 }}>{chip.label}</span>
        <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, color: T.brassDeep, background: "rgba(182,135,58,.1)", border: "1px solid rgba(182,135,58,.25)", padding: "1px 5px", flexShrink: 0 }}>L{skill.level}</span>
        <button onClick={() => (open ? cancel() : setOpen(true))} style={{ ...GHOST, padding: "1px 8px", fontSize: 8.5, flexShrink: 0 }}>{open ? "Close" : "Edit"}</button>
      </div>
      {stamp && !open && <div style={{ paddingBottom: 5, fontFamily: mono, fontSize: 8.5, color: T.muted }}>{stamp}</div>}
      {open && (
        <div style={{ padding: "6px 0 10px" }}>
          <div style={{ fontFamily: mono, fontSize: 8.5, color: T.muted, marginBottom: 8 }}>
            {skill.slug} · {skill.skill_type_slug} · execution {skill.execution_type || "—"} · key source {skill.api_key_source || "—"} (read-only)
          </div>
          {TEXT_FIELDS.map(([k, label, kind, rows]) => (
            <div key={k}>
              <div style={LABEL}>{label}</div>
              {kind === "line"
                ? <input value={form[k]} onChange={e => set(k, e.target.value)} style={INPUT} />
                : <textarea value={form[k]} onChange={e => set(k, e.target.value)} rows={rows} style={{ ...INPUT, resize: "vertical" }} />}
            </div>
          ))}
          {JSON_FIELDS.map(([k, label]) => (
            <div key={k}>
              <div style={LABEL}>{label}</div>
              <textarea value={form[k]} onChange={e => set(k, e.target.value)} rows={5} style={{ ...INPUT, resize: "vertical", fontFamily: mono, fontSize: 11 }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            {MODEL_FIELDS.map(([k, label]) => (
              <div key={k} style={{ flex: 2 }}>
                <div style={LABEL}>{label}</div>
                <input value={form[k]} onChange={e => set(k, e.target.value)} style={INPUT} />
              </div>
            ))}
            <div style={{ flex: 1 }}>
              <div style={LABEL}>Temperature</div>
              <input type="number" min="0" max="2" step="0.1" value={form.temperature} onChange={e => set("temperature", e.target.value)} style={INPUT} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={LABEL}>Max tokens</div>
              <input type="number" min="1" max="200000" step="1" value={form.max_tokens} onChange={e => set("max_tokens", e.target.value)} style={INPUT} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 4 }}>
            <button onClick={cancel} style={GHOST}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={SAVE}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
