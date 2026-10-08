// DeepBench v7.0.814 | src/screens/personnel/AgentFacts.jsx | AGT-415 -- SkillLevelBar: the Skill Ladder as a five-section horizontal bar in the Profile top card; a click saves the level's starting score through update_skill_level.
// DeepBench v7.0.813 | src/screens/personnel/AgentFacts.jsx | AGT-402 -- useTeamName listens for db-team-changed from the team picker.
// DeepBench v7.0.810 | src/screens/personnel/AgentFacts.jsx | AGT-402 / AGT-413 -- two real facts the Profile ID badge
// used to fake or leave out: the agent's TEAM NAME (was the constant "Bureau of Procurement Intelligence") and its
// USAGE COUNT (agents.usage_count, read-only, system-updated). A failed read leaves the line out; it never shows a
// made-up value.
import { useEffect, useState } from "react";
import { T, body, mono } from "../../tokens.js";
import { supabase } from "../../lib/supabase.js";

// The first team the agent is on (the route's `teams=1` read), or null: no team, a failed read, still loading.
export function useTeamName(agentId) {
  const [name, setName] = useState(null);
  useEffect(() => {
    let live = true;
    setName(null);
    fetch(`/api/agent-configs?agent_id=${encodeURIComponent(agentId)}&teams=1`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => { if (live && json && Array.isArray(json.teams)) setName(json.teams[0]?.name ?? null); })
      .catch(() => {});
    // The team picker (AGT-386) announces a save, so the heading follows without a reload.
    const onChanged = (e) => { if (live && e.detail && e.detail.agentId === agentId) setName(e.detail.name ?? null); };
    window.addEventListener("db-team-changed", onChanged);
    return () => { live = false; window.removeEventListener("db-team-changed", onChanged); };
  }, [agentId]);
  return name;
}

// The badge's top line: the team's name (and the badge code on the phone-width card). An agent with no team shows
// only the code, or nothing -- never a made-up bureau.
export function TeamHeading({ agentId, suffix }) {
  const team = useTeamName(agentId);
  const text = [team, suffix].filter(Boolean).join(" · ");
  if (!text) return null;
  return <div style={{ fontFamily: mono, fontSize: 8, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, marginBottom: 12 }}>{text}</div>;
}

// "Times used" -- one read-only row; renders nothing until the real number is read.
export function UsageCountRow({ agentId, align }) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    let live = true;
    setCount(null);
    Promise.resolve(supabase.from("agents").select("usage_count").eq("id", agentId).limit(1))
      .then(({ data, error }) => { if (live && !error && data && data[0] && Number.isFinite(data[0].usage_count)) setCount(data[0].usage_count); })
      .catch(() => {});
    return () => { live = false; };
  }, [agentId]);
  if (count === null) return null;
  if (align) return <div style={{ fontFamily: mono, fontSize: 9, lineHeight: 1.5, color: T.muted, textAlign: align }}>Times used {count}</div>;
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 10, fontSize: 11 }}>
      <span style={{ fontFamily: mono, fontSize: 8.5, color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>Times used</span>
      <span style={{ fontFamily: mono, fontSize: 10.5, color: T.ink }}>{count}</span>
    </div>
  );
}

// ── AGT-415 — the Skill Ladder as a five-section horizontal bar in the Profile top card. The user clicks a
// section; the chosen one is highlighted and its starting score is saved to agents.skill_score (the column the
// ladder already reads). Same bands and starting scores as lib/skill-write.js SKILL_LEVELS.
export const LEVELS = [["trainee", "Trainee", 0], ["developing", "Developing", 30], ["proficient", "Proficient", 55], ["expert", "Expert", 75], ["principal", "Principal", 90]];
export const levelOf = (score) => (score < 30 ? "trainee" : score < 55 ? "developing" : score < 75 ? "proficient" : score < 90 ? "expert" : "principal");

export function SkillLevelBar({ agent, onSaved, showToast }) {
  const [saving, setSaving] = useState(false);
  const current = levelOf(Number.isFinite(agent.skill) ? agent.skill : 0);

  const choose = async (slug, score) => {
    if (saving || slug === current) return;
    setSaving(true);
    try {
      const res = await fetch("/api/agent-configs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_skill_level", agent_id: agent.id, level: slug }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save");
      onSaved && onSaved(score);
      showToast && showToast("Level saved ✦");
    } catch (e) { showToast && showToast("Save failed: " + e.message, "⚠"); }
    setSaving(false);
  };

  return (
    <div style={{ margin: "0 0 12px" }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>Skill level</div>
      <div style={{ display: "flex", border: `1px solid ${T.line}` }}>
        {LEVELS.map(([slug, label, score], i) => {
          const active = slug === current;
          return (
            <button key={slug} onClick={() => choose(slug, score)} disabled={saving} aria-pressed={active} title={`Set level to ${label}`}
              style={{ flex: 1, padding: "6px 2px", fontFamily: body, fontSize: 10, fontWeight: active ? 700 : 500, cursor: saving ? "default" : "pointer", border: "none", borderLeft: i === 0 ? "none" : `1px solid ${T.line}`,
                background: active ? T.moss : "transparent", color: active ? "#fff" : T.mutedDeep }}>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// FEATURE: connection-status -- the two capabilities every private agent gets at creation are connection
// settings, not abilities: one hands an AI client the agent (Intent agent-bundle-intent), one lets an AI client
// teach it (agent-teach-intent). They are recognised by their Intent (data) and kept out of the Capabilities card.
export const CONNECTION_INTENTS = ["agent-bundle-intent", "agent-teach-intent"];
export const isConnectionCapability = (cap) => !!cap && CONNECTION_INTENTS.includes(cap.default_intent_slug);

const lastUsedLabel = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" });

// Under the Connect to AI button: Connected / Not connected yet, when it was last used, then Times used.
// Connected = at least one MCP call has been made for this agent (the same test as the Activity tab). A failed read
// leaves the status line out; it never claims "not connected" on an error.
export function ConnectionStatus({ agentId, align = "right" }) {
  const [last, setLast] = useState(undefined); // undefined: loading or failed, null: never, string: last call
  useEffect(() => {
    let live = true;
    setLast(undefined);
    Promise.resolve(supabase.from("ai_activity_log").select("created_at").eq("call_source", "mcp").eq("call_facts->>target_agent_id", agentId).order("created_at", { ascending: false }).limit(1))
      .then(({ data, error }) => { if (live && !error && Array.isArray(data)) setLast(data[0] ? data[0].created_at : null); })
      .catch(() => {});
    return () => { live = false; };
  }, [agentId]);
  const text = { fontFamily: mono, fontSize: 9, lineHeight: 1.5, textAlign: align };
  return (
    <div style={{ width: "100%", textAlign: align }}>
      {last !== undefined && (
        <div style={{ ...text, color: last ? T.moss : T.muted, fontWeight: 700 }}>{last ? "● Connected" : "○ Not connected yet"}</div>
      )}
      {last && <div style={{ ...text, color: T.muted }}>Last used {lastUsedLabel(last)}</div>}
      <UsageCountRow agentId={agentId} align={align} />
    </div>
  );
}
