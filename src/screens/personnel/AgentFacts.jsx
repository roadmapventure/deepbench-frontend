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
export function UsageCountRow({ agentId }) {
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
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 10, fontSize: 11 }}>
      <span style={{ fontFamily: mono, fontSize: 8.5, color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>Times used</span>
      <span style={{ fontFamily: mono, fontSize: 10.5, color: T.ink }}>{count}</span>
    </div>
  );
}
