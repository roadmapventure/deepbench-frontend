// DeepBench v7.0.810 | src/screens/personnel/SkillEditor.jsx | AGT-413 -- the Skills view and the two editors: every
// Skill row always shows its fields read-only (AGT-399), its Edit button opens the form and the form gains a
// Type dropdown over the six types (the six section headers themselves are fixed); CapabilityHeader edits a
// capability's name and description through `update_capability`. Both save through POST /api/agent-configs.
// DeepBench v7.0.808 | src/screens/personnel/SkillEditor.jsx | AGT-409 -- the Skill editor (Proposed
// arrangement): each Skill on the Capabilities card expands in place to every skill_profiles field the
// DeepBench user may edit, saved through POST /api/agent-configs `update_skill`. skill_profiles has no
// "edited by" column, so the stamp below is for this page view only (see the ticket's open design question).
import { useState } from "react";
import { T, body, mono } from "../../tokens.js";
import { TENANT_ID } from "../../config.js";

const INPUT = { width: "100%", background: T.cardAlt, border: `1px solid ${T.lineSoft}`, padding: "6px 10px", fontFamily: body, fontSize: 12, color: T.ink, outline: "none", marginBottom: 8, boxSizing: "border-box" };
const LABEL = { fontFamily: mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 };
const GHOST = { fontFamily: mono, fontSize: 9, color: T.muted, background: "transparent", border: `1px solid ${T.lineSoft}`, padding: "4px 11px", cursor: "pointer", textTransform: "uppercase" };
const SAVE = { fontFamily: mono, fontSize: 9, color: T.moss, background: "transparent", border: `1px solid ${T.moss}`, padding: "4px 11px", cursor: "pointer", fontWeight: 700, textTransform: "uppercase" };

// The six types, in the order their section headers appear. Headers are fixed; only a Skill's type is editable.
export const SKILL_TYPES = [
  ["identity", "Identity"], ["behavior", "Behavior"], ["knowledge", "Knowledge"],
  ["intent", "Intent"], ["format", "Format"], ["guardrails", "Guardrails"],
];

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
  const f = { skill_type_slug: sp.skill_type_slug || "intent" };
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

async function post(payload) {
  const res = await fetch("/api/agent-configs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenant_id: TENANT_ID, ...payload }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to save");
  return data;
}

export async function saveSkill(skillId, form) {
  return (await post({ action: "update_skill", skill_id: skillId, ...skillBody(form) })).skill;
}

export async function saveCapability(capabilityId, fields) {
  return (await post({ action: "update_capability", capability_id: capabilityId, name: fields.name, description: fields.description })).capability;
}

const stampNow = () => `Edited by DeepBench · ${new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })}`;

// One read-only line of a Skill; an empty field says so, so a missing field is visible, not hidden.
function Line({ label, children }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "2px 0", fontSize: 10.5, lineHeight: 1.45 }}>
      <span style={{ fontFamily: mono, fontSize: 8.5, color: T.muted, textTransform: "uppercase", letterSpacing: .8, minWidth: 82, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontFamily: body, color: T.mutedDeep, flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{children}</span>
    </div>
  );
}
// A component, not a module-level element: the regression harness compiles this file with classic JSX and no React in scope, so top-level JSX would throw at import.
function Empty() { return <span style={{ color: T.muted, fontStyle: "italic" }}>—</span>; }
const jsonLine = (v) => (v === null || v === undefined || (typeof v === "object" && Object.keys(v).length === 0) ? <Empty /> : <span style={{ fontFamily: mono, fontSize: 10 }}>{JSON.stringify(v)}</span>);

export function SkillEditorRow({ sp, chip, showToast, onSaved }) {
  const [open,   setOpen]   = useState(false);
  const [form,   setForm]   = useState(() => toForm(sp));
  const [saving, setSaving] = useState(false);
  const [stamp,  setStamp]  = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveSkill(sp.id, form);
      const next = { ...sp, ...saved };
      onSaved && onSaved(next);
      setForm(toForm(next));
      setStamp(stampNow());
      setOpen(false);
      showToast && showToast("Saved ✦");
    } catch (e) { showToast && showToast("Save failed: " + e.message, "⚠"); }
    setSaving(false);
  };

  const cancel = () => { setForm(toForm(sp)); setOpen(false); };

  return (
    <div style={{ borderBottom: `1px solid ${T.lineSoft}`, padding: "4px 0 6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
        <div style={{ fontFamily: body, fontSize: 11.5, fontWeight: 600, color: T.navy, flex: 1 }}>{sp.name}</div>
        <span style={{ fontFamily: mono, fontSize: 7.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", padding: "1px 5px", background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`, flexShrink: 0 }}>{chip.label}</span>
        <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, color: T.brassDeep, background: "rgba(182,135,58,.1)", border: "1px solid rgba(182,135,58,.25)", padding: "1px 5px", flexShrink: 0 }}>L{sp.level}</span>
        <button onClick={() => (open ? cancel() : setOpen(true))} style={{ ...GHOST, padding: "1px 8px", fontSize: 8.5, flexShrink: 0 }}>{open ? "Close" : "Edit"}</button>
      </div>
      {!open && (
        <div style={{ paddingBottom: 2 }}>
          <Line label="Description">{sp.description || <Empty />}</Line>
          <Line label="Objective">{sp.objective || <Empty />}</Line>
          <Line label="Method">{sp.method || <Empty />}</Line>
          <Line label="Tone">{sp.tone || <Empty />}</Line>
          <Line label="Confidence">{sp.confidence || <Empty />}</Line>
          <Line label="Output">{sp.output_desc || <Empty />}</Line>
          <Line label="Notes">{sp.notes || <Empty />}</Line>
          <Line label="Guardrails">{jsonLine(sp.guardrails)}</Line>
          <Line label="Traits">{jsonLine(sp.traits)}</Line>
          <Line label="Model">{[sp.llm_model, sp.llm_provider, sp.temperature !== null && sp.temperature !== undefined ? `temp ${sp.temperature}` : null, sp.max_tokens ? `${sp.max_tokens} tokens` : null].filter(Boolean).join(" · ") || <Empty />}</Line>
          <Line label="Key source">{sp.api_key_source || <Empty />}</Line>
        </div>
      )}
      {stamp && !open && <div style={{ fontFamily: mono, fontSize: 8.5, color: T.muted }}>{stamp}</div>}
      {open && (
        <div style={{ padding: "6px 0 10px" }}>
          <div style={{ fontFamily: mono, fontSize: 8.5, color: T.muted, marginBottom: 8 }}>
            {sp.slug} · execution {sp.execution_type || "—"} · key source {sp.api_key_source || "—"} (read-only)
          </div>
          <div style={LABEL}>Type</div>
          <select value={form.skill_type_slug} onChange={e => set("skill_type_slug", e.target.value)} style={INPUT}>
            {SKILL_TYPES.map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}
          </select>
          {form.skill_type_slug !== sp.skill_type_slug && (
            <div style={{ fontFamily: body, fontSize: 10, color: T.brassDeep, fontStyle: "italic", margin: "-4px 0 8px" }}>Changing the type moves this Skill everywhere it is used.</div>
          )}
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

// A capability's name and description, editable in place. The slug is shown and never editable.
export function CapabilityHeader({ cap, showToast, onSaved }) {
  const [open,   setOpen]   = useState(false);
  const [name,   setName]   = useState(cap.name || "");
  const [desc,   setDesc]   = useState(cap.description || "");
  const [saving, setSaving] = useState(false);
  const [stamp,  setStamp]  = useState(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveCapability(cap.id, { name, description: desc });
      onSaved && onSaved({ ...cap, ...saved });
      setStamp(stampNow());
      setOpen(false);
      showToast && showToast("Saved ✦");
    } catch (e) { showToast && showToast("Save failed: " + e.message, "⚠"); }
    setSaving(false);
  };
  const cancel = () => { setName(cap.name || ""); setDesc(cap.description || ""); setOpen(false); };

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: T.navy, flex: 1 }}>{cap.name}</div>
        <button onClick={() => (open ? cancel() : setOpen(true))} style={{ ...GHOST, padding: "1px 8px", fontSize: 8.5 }}>{open ? "Close" : "Edit"}</button>
      </div>
      {!open && cap.description && <div style={{ fontFamily: body, fontSize: 10, color: T.muted, fontStyle: "italic", marginTop: 2, lineHeight: 1.4 }}>{cap.description}</div>}
      {!open && stamp && <div style={{ fontFamily: mono, fontSize: 8.5, color: T.muted, marginTop: 2 }}>{stamp}</div>}
      {open && (
        <div style={{ paddingTop: 6 }}>
          <div style={{ fontFamily: mono, fontSize: 8.5, color: T.muted, marginBottom: 8 }}>{cap.slug} (read-only — this is the AI client's tool name)</div>
          <div style={LABEL}>Name</div>
          <input value={name} onChange={e => setName(e.target.value)} style={INPUT} />
          <div style={LABEL}>Description</div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ ...INPUT, resize: "vertical" }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 7 }}>
            <button onClick={cancel} style={GHOST}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={SAVE}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SkillEditorRow;
