// DeepBench v7.0.812 | src/screens/personnel/SkillEditor.jsx | AGT-414 -- AddSkillForm: an Add Skill button inside each
// capability (name, type, optional description / objective / method) saved through `add_skill_to_capability`;
// each Skill row gains Remove, which unlinks it from this capability only (`remove_skill_from_capability`).
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
// Model settings are not shown or edited on Personnel; toForm() still carries the saved values so a Skill save sends them back unchanged.
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

export async function addCapability(agentId, fields) {
  return (await post({ action: "add_capability", agent_id: agentId, ...fields })).capability;
}

export async function addSkill(capabilitySlug, fields) {
  return (await post({ action: "add_skill_to_capability", capability_slug: capabilitySlug, ...fields })).skill;
}

export async function removeSkill(capabilitySlug, skillSlug) {
  return post({ action: "remove_skill_from_capability", capability_slug: capabilitySlug, skill_slug: skillSlug });
}

export async function deleteCapability(capabilityId) {
  await post({ action: "delete_capability", capability_id: capabilityId });
}

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

export function SkillEditorRow({ sp, chip, showToast, onSaved, capSlug, onRemoved }) {
  const [open,   setOpen]   = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [form,   setForm]   = useState(() => toForm(sp));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveSkill(sp.id, form);
      const next = { ...sp, ...saved };
      onSaved && onSaved(next);
      setForm(toForm(next));
      setOpen(false);
      showToast && showToast("Saved ✦");
    } catch (e) { showToast && showToast("Save failed: " + e.message, "⚠"); }
    setSaving(false);
  };

  const cancel = () => { setForm(toForm(sp)); setOpen(false); };

  const handleRemove = async () => {
    setSaving(true);
    try {
      const out = await removeSkill(capSlug, sp.slug);
      onRemoved && onRemoved(capSlug, sp.slug);
      showToast && showToast(out && out.deleted ? "Skill deleted" : "Removed from this capability");
    } catch (e) { showToast && showToast("Remove failed: " + e.message, "⚠"); setConfirmRemove(false); }
    setSaving(false);
  };

  return (
    <div style={{ borderBottom: `1px solid ${T.lineSoft}`, padding: "4px 0 6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
        <div style={{ fontFamily: body, fontSize: 11.5, fontWeight: 600, color: T.navy, flex: 1 }}>{sp.name}</div>
        <span style={{ fontFamily: mono, fontSize: 7.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", padding: "1px 5px", background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`, flexShrink: 0 }}>{chip.label}</span>
        <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, color: T.brassDeep, background: "rgba(182,135,58,.1)", border: "1px solid rgba(182,135,58,.25)", padding: "1px 5px", flexShrink: 0 }}>L{sp.level}</span>
        <button onClick={() => (open ? cancel() : setOpen(true))} style={{ ...GHOST, padding: "1px 8px", fontSize: 8.5, flexShrink: 0 }}>{open ? "Close" : "Edit"}</button>
        {capSlug && !open && !confirmRemove && <button onClick={() => setConfirmRemove(true)} style={{ ...GHOST, padding: "1px 8px", fontSize: 8.5, flexShrink: 0, color: T.flag }}>Remove</button>}
      </div>
      {confirmRemove && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontFamily: body, fontSize: 10.5, color: T.mutedDeep }}>
          <span style={{ flex: 1 }}>Remove “{sp.name}” from this capability? If no other capability uses it and it was made on DeepBench, it is deleted for good; otherwise it is only taken out of this capability.</span>
          <button onClick={() => setConfirmRemove(false)} style={{ ...GHOST, padding: "1px 8px", fontSize: 8.5 }}>Keep</button>
          <button onClick={handleRemove} disabled={saving} style={{ ...SAVE, padding: "1px 8px", fontSize: 8.5, color: T.flag, border: `1px solid ${T.flag}` }}>{saving ? "Removing…" : "Remove"}</button>
        </div>
      )}
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
        </div>
      )}
      {open && (
        <div style={{ padding: "6px 0 10px" }}>
          <div style={{ fontFamily: mono, fontSize: 8.5, color: T.muted, marginBottom: 8 }}>
            {sp.slug} · execution {sp.execution_type || "—"} (read-only)
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
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 4 }}>
            <button onClick={cancel} style={GHOST}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={SAVE}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// "+ Add Skill" inside a capability: name and type are required, the rest is optional and every other field is
// edited afterwards in the Skill's own form. The new Skill joins the capability at level 1.
export function AddSkillForm({ capSlug, showToast, onAdded }) {
  const blank = { name: "", skill_type_slug: "intent", description: "", objective: "", method: "" };
  const [open,   setOpen]   = useState(false);
  const [form,   setForm]   = useState(blank);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    setSaving(true);
    try {
      const skill = await addSkill(capSlug, form);
      onAdded && onAdded(capSlug, skill);
      setForm(blank);
      setOpen(false);
      showToast && showToast("Skill added ✦");
    } catch (e) { showToast && showToast("Add failed: " + e.message, "⚠"); }
    setSaving(false);
  };

  if (!open) return <button onClick={() => setOpen(true)} style={{ ...GHOST, marginTop: 8 }}>+ Add Skill</button>;
  return (
    <div style={{ marginTop: 8, padding: "8px 0 4px", borderTop: `1px dashed ${T.lineSoft}` }}>
      <div style={{ fontFamily: mono, fontSize: 8.5, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, marginBottom: 6 }}>New Skill</div>
      <div style={LABEL}>Name</div>
      <input value={form.name} onChange={e => set("name", e.target.value)} style={INPUT} />
      <div style={LABEL}>Type</div>
      <select value={form.skill_type_slug} onChange={e => set("skill_type_slug", e.target.value)} style={INPUT}>
        {SKILL_TYPES.map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}
      </select>
      <div style={LABEL}>Description (optional)</div>
      <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} style={{ ...INPUT, resize: "vertical" }} />
      <div style={LABEL}>Objective (optional)</div>
      <textarea value={form.objective} onChange={e => set("objective", e.target.value)} rows={2} style={{ ...INPUT, resize: "vertical" }} />
      <div style={LABEL}>Method (optional)</div>
      <textarea value={form.method} onChange={e => set("method", e.target.value)} rows={3} style={{ ...INPUT, resize: "vertical" }} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 7 }}>
        <button onClick={() => { setForm(blank); setOpen(false); }} style={GHOST}>Cancel</button>
        <button onClick={handleAdd} disabled={saving} style={SAVE}>{saving ? "Adding…" : "Add Skill"}</button>
      </div>
    </div>
  );
}

// A capability's name and description, editable in place. The slug is shown and never editable.
export function CapabilityHeader({ cap, showToast, onSaved, onDeleted }) {
  const isUserMade = cap.default_intent_slug === "agent-capability-intent";
  const [open,   setOpen]   = useState(false);
  const [name,   setName]   = useState(cap.name || "");
  const [desc,   setDesc]   = useState(cap.description || "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteCapability(cap.id);
      onDeleted && onDeleted(cap.slug);
      showToast && showToast("Capability deleted");
    } catch (e) { showToast && showToast("Delete failed: " + e.message, "⚠"); setConfirmDelete(false); }
    setSaving(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveCapability(cap.id, { name, description: desc });
      onSaved && onSaved({ ...cap, ...saved });
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
        {isUserMade && !open && !confirmDelete && <button onClick={() => setConfirmDelete(true)} style={{ ...GHOST, padding: "1px 8px", fontSize: 8.5, color: T.flag }}>Delete</button>}
      </div>
      {confirmDelete && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontFamily: body, fontSize: 10.5, color: T.mutedDeep }}>
          <span style={{ flex: 1 }}>Delete “{cap.name}”? The AI client loses this tool. Its Skills are kept.</span>
          <button onClick={() => setConfirmDelete(false)} style={{ ...GHOST, padding: "1px 8px", fontSize: 8.5 }}>Keep</button>
          <button onClick={handleDelete} disabled={saving} style={{ ...SAVE, padding: "1px 8px", fontSize: 8.5, color: T.flag, border: `1px solid ${T.flag}` }}>{saving ? "Deleting…" : "Delete"}</button>
        </div>
      )}
      {!open && cap.description && <div style={{ fontFamily: body, fontSize: 10, color: T.muted, fontStyle: "italic", marginTop: 2, lineHeight: 1.4 }}>{cap.description}</div>}
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

// "+ Add Capability" on a private agent's Capabilities card: a name and an optional description. The new capability
// appears empty, and its own "+ Add Skill" button follows. It is a tool the agent's AI client sees (agent-capability-intent).
export function AddCapabilityForm({ agentId, showToast, onAdded }) {
  const blank = { name: "", description: "" };
  const [open,   setOpen]   = useState(false);
  const [form,   setForm]   = useState(blank);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    setSaving(true);
    try {
      const cap = await addCapability(agentId, form);
      onAdded && onAdded(cap);
      setForm(blank);
      setOpen(false);
      showToast && showToast("Capability added ✦");
    } catch (e) { showToast && showToast("Add failed: " + e.message, "⚠"); }
    setSaving(false);
  };

  if (!open) return <button onClick={() => setOpen(true)} style={{ ...GHOST, marginTop: 4 }}>+ Add Capability</button>;
  return (
    <div style={{ marginTop: 8, padding: "8px 0 4px", borderTop: `1px dashed ${T.lineSoft}` }}>
      <div style={{ fontFamily: mono, fontSize: 8.5, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, marginBottom: 6 }}>New Capability</div>
      <div style={LABEL}>Name</div>
      <input id="new-capability-name" value={form.name} onChange={e => set("name", e.target.value)} style={INPUT} />
      <div style={LABEL}>Description (optional)</div>
      <textarea id="new-capability-description" value={form.description} onChange={e => set("description", e.target.value)} rows={2} style={{ ...INPUT, resize: "vertical" }} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 7 }}>
        <button onClick={() => { setForm(blank); setOpen(false); }} style={GHOST}>Cancel</button>
        <button onClick={handleAdd} disabled={saving} style={SAVE}>{saving ? "Adding…" : "Add Capability"}</button>
      </div>
    </div>
  );
}

// A capability's Skills live in a drawer: closed until the user opens it, so a long list of capabilities stays scannable.
export function CapabilityDrawer({ count, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 8, borderTop: `1px solid ${T.lineSoft}` }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 0", background: "transparent", border: "none", cursor: "pointer", fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, textAlign: "left" }}>
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
        <span>Skills ({count})</span>
      </button>
      {/* Skills are children of the capability: indented under it, with a guide line down the left edge */}
      {open && <div style={{ marginLeft: 6, paddingLeft: 14, borderLeft: `2px solid ${T.line}` }}>{children}</div>}
    </div>
  );
}

// FEATURE: capabilities-guide -- plain-language purpose of the card, in DeepBench's own vocabulary (ARCHITECTURE.md §2: a Skill is the
// atomic unit; a Capability is a grouped set of Skills; an agent with no Skills still works, only generically). Open while the agent
// has no Skills (the moment someone needs it), a one-line "How this works" otherwise.
export function CapabilitiesGuide({ canAdd, skillCount }) {
  const [open, setOpen] = useState(skillCount === 0);
  return (
    <div style={{ marginBottom: 12, background: T.cardAlt, border: `1px solid ${T.lineSoft}`, borderLeft: `3px solid ${T.brass}` }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: body, fontSize: 12.5, fontWeight: 600, color: T.navy }}>
        <span aria-hidden="true" style={{ fontFamily: mono, fontSize: 10, color: T.brassDeep }}>{open ? "▾" : "▸"}</span>
        How your agent gets good at things
      </button>
      {open && (
        <div style={{ padding: "0 12px 12px 30px", fontFamily: body, fontSize: 12, lineHeight: 1.55, color: T.mutedDeep }}>
          <p style={{ margin: "0 0 8px" }}>A <strong>capability</strong> is something you want your agent to be able to do, like reviewing bids or drafting vendor notes.</p>
          <p style={{ margin: "0 0 8px" }}><strong>Skills</strong> are what make it good at that. Each Skill teaches the agent one thing: who it is, how it thinks, what it knows, what to do, how to lay out an answer, or what it must never do. Put the Skills together and you have the capability.</p>
          <p style={{ margin: "0 0 8px" }}>The more Skills you give a capability, the better your agent gets at it. An agent with no Skills still works, but only in a general way. Your Skills are what make it yours.</p>
          {canAdd && (
            <ol style={{ margin: "0 0 8px", paddingLeft: 18 }}>
              <li>Add a capability and give it a name.</li>
              <li>Open it and add a Skill. Start with one or two sentences.</li>
              <li>Press Connect to AI and try it in your AI tool.</li>
            </ol>
          )}
          <p style={{ margin: 0, color: T.moss, fontWeight: 600 }}>You don't need to get it perfect. Add a little now and improve it as you go.</p>
        </div>
      )}
    </div>
  );
}
