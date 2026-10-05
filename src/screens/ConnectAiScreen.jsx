// DeepBench v7.0.788 | ConnectAiScreen.jsx | AGT-384 — the Connect to AI page (/bench/connect)
// The Connect popup's content as its own page (John, 2026-10-05). A "Which agent?" picker lists the
// viewer's Private Agents, then any teams they are on; once one is picked the Claude / ChatGPT / Grok
// steps (ConnectSteps) fill in with that name and address. The pick lives in the address
// (?agent=<id>), so the Bench home card opens the page with nothing picked and a Personnel File's
// Connect button opens it with that agent already picked. With no Private Agents the page says so
// and points to Add a player. It names no agent: the list is the roster's own private rows, and
// the address is built from the picked row (ARCHITECTURE §19e Rule #1). No key is rendered.
// Spec: docs/kickoffs/v7.0.788-AGT-384-bench-home.md.

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { T, display, body } from "../tokens.js";
import { AppShell } from "../AppShell.jsx";
import { useAgents } from "../hooks/useAgents.js";
import { isPrivateAgent } from "../data/agents.js";
import { BenchNav, BenchNavChips } from "../components/BenchNav.jsx";
import ConnectSteps, { CONNECT_SHARED, h2Style, pStyle } from "../components/ConnectAgentPopup.jsx";

// The page title: the Bench masthead's type.
const TITLE = { fontFamily:display, fontSize:30, fontWeight:500, color:T.navy, letterSpacing:"-.5px", lineHeight:1, marginBottom:6 };
// The picker rows: the create screen's radio row.
const ROW = { fontFamily:body, fontSize:12, color:T.mutedDeep, display:"flex", alignItems:"center", gap:6, cursor:"pointer", marginBottom:8 };
const LINK = { fontFamily:body, fontSize:14, color:T.brassDeep, fontWeight:600, cursor:"pointer", textDecoration:"none" };

export default function ConnectAiScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const privateAgents = useAgents().filter(isPrivateAgent);
  const [teams, setTeams] = useState([]);

  // FEATURE: AGT-338 — the teams the viewer's private agents are on: one read per agent, merged,
  // one row per team address, by name. A slow or a failed read leaves the list without that team.
  const idsKey = privateAgents.map(a => a.id).join(",");
  useEffect(() => {
    let live = true;
    const ids = idsKey ? idsKey.split(",") : [];
    Promise.all(ids.map(id =>
      fetch(`/api/agent-configs?agent_id=${encodeURIComponent(id)}&teams=1`)
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null)
    )).then(all => {
      if (!live) return;
      const byAddress = new Map();
      for (const d of all) {
        for (const t of (d && Array.isArray(d.teams) ? d.teams : [])) {
          if (!byAddress.has(t.address)) byAddress.set(t.address, t);
        }
      }
      setTeams([...byAddress.values()].sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => { live = false; };
  }, [idsKey]);

  const pickedId    = searchParams.get("agent");
  const pickedAgent = privateAgents.find(a => a.id === pickedId) || null;
  const pickedTeam  = teams.find(t => t.address === pickedId) || null;
  const origin      = window.location.origin;

  // The title names the pick the way the steps do: an agent's first name, a team's whole name.
  const pickedName = pickedAgent ? pickedAgent.name.split(" ")[0] : pickedTeam ? pickedTeam.name : null;
  const fill = s => s.split("<first name>").join(pickedName);
  const pick = value => setSearchParams({ agent: value });

  return (
    <AppShell>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <BenchNav current="Connect to AI"/>
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px 48px",background:T.paperDeep}}>
          <BenchNavChips current="Connect to AI"/>
          <div style={{maxWidth:720}}>
            {privateAgents.length === 0 ? (
              <>
                <div style={TITLE}>Connect to AI</div>
                <p style={pStyle}>You have no private agents yet.</p>
                <a onClick={() => navigate("/bench/new")} style={LINK}>Add a player →</a>
              </>
            ) : (
              <>
                <div style={TITLE}>{pickedAgent || pickedTeam ? fill(CONNECT_SHARED.title) : "Connect to AI"}</div>

                <h2 style={h2Style}>Which agent?</h2>
                {privateAgents.map(a => (
                  <label key={a.id} style={ROW}>
                    <input type="radio" name="agent" checked={pickedId === a.id} onChange={() => pick(a.id)} style={{accentColor:T.brass}}/>
                    {a.name}
                  </label>
                ))}
                {teams.map(t => (
                  <label key={t.address} style={ROW}>
                    <input type="radio" name="agent" checked={pickedId === t.address} onChange={() => pick(t.address)} style={{accentColor:T.brass}}/>
                    {`${t.name} (team)`}
                  </label>
                ))}

                {/* key: a new pick starts the steps fresh, so one agent's team blocks never show under another */}
                {pickedAgent
                  ? <ConnectSteps key={pickedAgent.id} agent={pickedAgent} address={`${origin}/api/mcp/${pickedAgent.id}`}/>
                  : pickedTeam
                    ? <ConnectSteps key={pickedTeam.address} agent={{ id: pickedTeam.address, name: pickedTeam.name, team: true }} address={`${origin}/api/mcp/` + pickedTeam.address}/>
                    : <p style={pStyle}>Pick an agent to see the steps.</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
