// DeepBench v5.1.0 | ResumeTab.jsx | Personnel Resume tab — role prompt CRUD, inline edit
// FEATURE: PE-02 — Resume tab
// src/screens/personnel/ResumeTab.jsx — v5.0.0
// DeepBench v5 — Resume tab: role_prompt CRUD
// ConfigCard with inline edit, Set Default, User Selectable toggle, Delete

import { useState, useEffect } from "react";
import { T, display, body, mono } from "../../tokens.js";
import { TENANT_ID } from "../../config.js";
import { Corners } from "../../components/SharedUI.jsx";

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiGetConfigs(agent_id, type) {
  const res = await fetch(`/api/agent-configs?tenant_id=${TENANT_ID}&agent_id=${agent_id}&type=${type}`);
  if (!res.ok) throw new Error("Failed to load configs");
  return (await res.json()).configs || [];
}
async function apiSaveConfig(payload) {
  const res = await fetch("/api/agent-configs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, tenant_id: TENANT_ID }) });
  if (!res.ok) throw new Error("Failed to save");
  return (await res.json()).config;
}
async function apiPatchConfig(id, fields) {
  const res = await fetch("/api/agent-configs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, tenant_id: TENANT_ID, ...fields }) });
  if (!res.ok) throw new Error("Failed to update");
  return (await res.json()).config;
}
async function apiDeleteConfig(id) {
  const res = await fetch("/api/agent-configs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, tenant_id: TENANT_ID }) });
  if (!res.ok) throw new Error("Failed to delete");
}

// ── ConfigCard ────────────────────────────────────────────────────────────────
export function ConfigCard({ config, onSetDefault, onToggleSelectable, onEdit, onDelete, editingId, setEditingId, showToast }) {
  const [editText, setEditText] = useState(config.text);
  const [editName, setEditName] = useState(config.name);
  const [saving,   setSaving]   = useState(false);
  const isEditing = editingId === config.id;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await apiPatchConfig(config.id, { name: editName, text: editText });
      onEdit(updated);
      setEditingId(null);
      showToast("Saved ✦");
    } catch (e) { showToast("Save failed", "⚠"); }
    setSaving(false);
  };

  return (
    <div style={{ border: `1px solid ${config.is_default ? T.moss : T.lineSoft}`, marginBottom: 9, background: config.is_default ? `${T.moss}06` : "transparent" }}>
      <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${config.is_default ? T.moss + "30" : T.lineSoft}`, flexWrap: "wrap" }}>
        <div style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: config.is_default ? T.moss : T.ink, flex: 1, minWidth: 120 }}>{config.name}</div>
        {config.is_default
          ? <span style={{ fontFamily: mono, fontSize: 8.5, padding: "1px 7px", background: `${T.moss}15`, color: T.moss, border: `1px solid ${T.moss}`, fontWeight: 700 }}>● DEFAULT</span>
          : <button onClick={() => onSetDefault(config.id)} style={{ fontFamily: mono, fontSize: 8.5, color: T.brass, background: "transparent", border: `1px solid ${T.brass}`, padding: "1px 8px", cursor: "pointer", fontWeight: 700 }}>Set Default</button>
        }
        <button onClick={() => onToggleSelectable(config.id, !config.is_user_selectable)}
          title="When on, users can choose this in the analysis UI"
          style={{ fontFamily: mono, fontSize: 8.5, padding: "1px 8px", cursor: "pointer", border: `1px solid ${config.is_user_selectable ? T.brass : T.lineSoft}`, background: config.is_user_selectable ? `${T.brass}15` : "transparent", color: config.is_user_selectable ? T.brassDeep : T.muted, letterSpacing: .3 }}>
          {config.is_user_selectable ? "◎ User Selectable" : "○ Admin Only"}
        </button>
        <button onClick={() => setEditingId(isEditing ? null : config.id)} style={{ fontFamily: mono, fontSize: 8.5, color: T.muted, background: "transparent", border: `1px solid ${T.lineSoft}`, padding: "1px 8px", cursor: "pointer", textTransform: "uppercase", letterSpacing: .5 }}>{isEditing ? "Close" : "Edit"}</button>
        {!config.is_default && <button onClick={() => onDelete(config.id)} style={{ fontFamily: mono, fontSize: 8.5, color: T.flag, background: "transparent", border: `1px solid ${T.flag}30`, padding: "1px 8px", cursor: "pointer", textTransform: "uppercase", letterSpacing: .5 }}>Delete</button>}
      </div>
      {isEditing ? (
        <div style={{ padding: "10px 12px" }}>
          <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: "100%", background: T.paper, border: `1px solid ${T.lineSoft}`, padding: "6px 10px", fontFamily: body, fontSize: 12, color: T.ink, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
          <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={6}
            style={{ width: "100%", background: T.paper, border: `1px solid ${T.lineSoft}`, padding: "9px 11px", fontFamily: mono, fontSize: 11, color: T.ink, lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 7 }}>
            <button onClick={() => setEditingId(null)} style={{ fontFamily: mono, fontSize: 9, color: T.muted, background: "transparent", border: `1px solid ${T.lineSoft}`, padding: "4px 11px", cursor: "pointer", textTransform: "uppercase" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ fontFamily: mono, fontSize: 9, color: T.moss, background: "transparent", border: `1px solid ${T.moss}`, padding: "4px 11px", cursor: "pointer", fontWeight: 700, textTransform: "uppercase" }}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      ) : (
        <div style={{ padding: "9px 12px", fontFamily: mono, fontSize: 10.5, color: T.mutedDeep, lineHeight: 1.6, maxHeight: 50, overflow: "hidden", maskImage: "linear-gradient(to bottom,black 50%,transparent 100%)" }}>{config.text}</div>
      )}
    </div>
  );
}

// ── Add Config Form ───────────────────────────────────────────────────────────
export function AddConfigForm({ agentId, type = "role_prompt", onSaved, onCancel, showToast }) {
  const [name,        setName]        = useState("");
  const [text,        setText]        = useState("");
  const [isDefault,   setIsDefault]   = useState(false);
  const [isSelectable,setIsSelectable]= useState(false);
  const [saving,      setSaving]      = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !text.trim()) { showToast("Name and content required", "⚠"); return; }
    setSaving(true);
    try {
      const config = await apiSaveConfig({ agent_id: agentId, type, name: name.trim(), text: text.trim(), is_default: isDefault, is_user_selectable: isSelectable });
      onSaved(config);
      showToast("Added ✦");
    } catch (e) { showToast("Save failed: " + e.message, "⚠"); }
    setSaving(false);
  };

  return (
    <div style={{ border: `1px solid ${T.brass}`, background: `${T.brass}05`, padding: "12px 14px", marginTop: 8 }}>
      <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600, marginBottom: 10 }}>New Role Prompt</div>
      <div style={{ marginBottom: 9 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Name</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Board Presentation Mode"
          style={{ width: "100%", background: T.paper, border: `1px solid ${T.lineSoft}`, padding: "7px 10px", fontFamily: body, fontSize: 12, color: T.ink, outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 9 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Prompt Text</div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
          placeholder="You are [Name], a [role] with [X] years of experience in [specialty]..."
          style={{ width: "100%", background: T.paper, border: `1px solid ${T.lineSoft}`, padding: "8px 10px", fontFamily: mono, fontSize: 11, color: T.ink, lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: body, fontSize: 12, color: T.mutedDeep, cursor: "pointer" }}>
          <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} style={{ accentColor: T.moss }} />Set as default
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: body, fontSize: 12, color: T.mutedDeep, cursor: "pointer" }}>
          <input type="checkbox" checked={isSelectable} onChange={e => setIsSelectable(e.target.checked)} style={{ accentColor: T.brass }} />Expose to users in analysis UI
        </label>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onCancel} style={{ fontFamily: body, fontSize: 12, color: T.muted, background: "transparent", border: `1px solid ${T.line}`, padding: "6px 14px", cursor: "pointer" }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{ fontFamily: body, fontSize: 12, color: T.navy, background: `linear-gradient(135deg,${T.brass},${T.brassDeep})`, border: "none", padding: "6px 16px", cursor: "pointer", fontWeight: 700 }}>{saving ? "Saving…" : "Add Role Prompt"}</button>
      </div>
    </div>
  );
}

// ── ResumeTab ─────────────────────────────────────────────────────────────────
export default function ResumeTab({ agent, showToast }) {
  const [configs,   setConfigs]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const canEdit = agent.trainable;

  useEffect(() => {
    apiGetConfigs(agent.id, "role_prompt")
      .then(setConfigs)
      .catch(() => showToast("Could not load role prompts", "⚠"))
      .finally(() => setLoading(false));
  }, [agent.id]);

  const handleSetDefault = async (id) => {
    try {
      await apiPatchConfig(id, { is_default: true });
      setConfigs(prev => prev.map(c => ({ ...c, is_default: c.id === id })));
      showToast("Default updated ✦");
    } catch (e) { showToast("Failed to set default", "⚠"); }
  };

  const handleToggleSelectable = async (id, value) => {
    try {
      await apiPatchConfig(id, { is_user_selectable: value });
      setConfigs(prev => prev.map(c => c.id === id ? { ...c, is_user_selectable: value } : c));
      showToast(value ? "Now user-selectable ✦" : "Set to admin-only ✦");
    } catch (e) { showToast("Failed to update", "⚠"); }
  };

  const handleEdit = (updated) => {
    setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this role prompt permanently?")) return;
    try {
      await apiDeleteConfig(id);
      setConfigs(prev => prev.filter(c => c.id !== id));
      showToast("Deleted ✦");
    } catch (e) { showToast("Delete failed", "⚠"); }
  };

  const handleSaved = (config) => {
    setConfigs(prev => [...prev, config]);
    setShowAdd(false);
  };

  const SKILL_LEVELS = [["Trainee","0–30"],["Developing","30–55"],["Proficient","55–75"],["Expert","75–90"],["Principal","90–100"]];
  const activeLevel = agent.skill<30?"Trainee":agent.skill<55?"Developing":agent.skill<75?"Proficient":agent.skill<90?"Expert":"Principal";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 18, alignItems: "start" }}>

      {/* Left: Vitals + Skill Ladder */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "13px 15px", position: "relative" }}>
          <Corners />
          <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 9 }}>Resume · Vitals</div>
          {[["Architecture",agent.arch],["Specialty",agent.specialty],["Trainer",agent.trainableBy],["Update Cadence","Quarterly"],["Update Rights",agent.trainableBy+" admin"],["Visibility","Configurable"]].map(([k,v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.lineSoft}`, fontSize: 11 }}>
              <span style={{ color: T.muted, fontWeight: 500 }}>{k}</span>
              <span style={{ fontFamily: mono, fontSize: 10.5, color: T.ink, textAlign: "right", maxWidth: 130 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "13px 15px" }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 9 }}>Skill Ladder</div>
          {SKILL_LEVELS.map(([label, range]) => {
            const isActive = label === activeLevel;
            return (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", marginBottom: 2, background: isActive ? "rgba(90,117,56,.15)" : "transparent", border: isActive ? "1px solid rgba(90,117,56,.4)" : "1px solid transparent" }}>
                <span style={{ fontFamily: body, fontSize: 11.5, fontWeight: isActive ? 700 : 400, color: isActive ? T.moss : T.mutedDeep }}>{isActive ? "▸ " : " "}{label}</span>
                <span style={{ fontFamily: mono, fontSize: 10.5, color: isActive ? T.moss : T.muted }}>{range}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Role prompts (Layer 01) */}
      <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "15px 18px", position: "relative" }}>
        <Corners />
        <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 4 }}>Layer 01 · Role & Behavior</div>
        <div style={{ fontFamily: display, fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 6 }}>How does {agent.name.split(" ")[0]} introduce themselves to Claude?</div>
        <div style={{ fontFamily: body, fontSize: 12, color: T.mutedDeep, lineHeight: 1.5, marginBottom: 13, padding: "9px 13px", background: T.cardAlt, borderLeft: `3px solid ${T.brassDeep}` }}>
          The role prompt is the first layer of the system prompt. It defines the agent's identity, expertise, and communication style. Set one as <strong>Default</strong> for automatic use; toggle <strong>User Selectable</strong> to expose it in the analysis dropdown.
        </div>

        {loading && <div style={{ padding: "20px", textAlign: "center", color: T.muted, fontFamily: mono, fontSize: 11 }}>Loading…</div>}

        {!loading && configs.length === 0 && (
          <div style={{ padding: "24px", textAlign: "center", background: `${T.brass}06`, border: `1px dashed ${T.line}` }}>
            <div style={{ fontFamily: display, fontSize: 14, color: T.muted, marginBottom: 8 }}>No role prompts configured yet.</div>
            {canEdit && <div style={{ fontFamily: body, fontSize: 12, color: T.muted }}>Add one below to define how {agent.name.split(" ")[0]} introduces themselves.</div>}
            {!canEdit && <div style={{ fontFamily: body, fontSize: 12, color: T.muted }}>Contact {agent.trainableBy} to configure.</div>}
          </div>
        )}

        {configs.map(config => (
          <ConfigCard key={config.id} config={config}
            onSetDefault={handleSetDefault}
            onToggleSelectable={handleToggleSelectable}
            onEdit={handleEdit}
            onDelete={handleDelete}
            editingId={editingId}
            setEditingId={setEditingId}
            showToast={showToast}
          />
        ))}

        {canEdit && !showAdd && (
          <button onClick={() => setShowAdd(true)} style={{ width: "100%", padding: "9px", background: "transparent", border: `1px dashed ${T.lineSoft}`, color: T.brassDeep, fontFamily: body, fontSize: 12, cursor: "pointer", marginTop: 2, fontWeight: 500 }}>+ Add New Role Prompt</button>
        )}
        {canEdit && showAdd && (
          <AddConfigForm agentId={agent.id} onSaved={handleSaved} onCancel={() => setShowAdd(false)} showToast={showToast} />
        )}
        {!canEdit && configs.length > 0 && (
          <div style={{ padding: "10px 14px", background: `${T.muted}08`, border: `1px solid ${T.lineSoft}`, fontFamily: body, fontSize: 11.5, color: T.muted, lineHeight: 1.5 }}>
            Role prompts for {agent.name} are managed by <strong>{agent.trainableBy}</strong>.
          </div>
        )}
      </div>
    </div>
  );
}
