// DeepBench v7.0.789 | ConnectAiScreen.jsx | AGT-385 — the picker is "Choose an agent": one card per
// private agent (portrait, full name, role, and the team names only when the agent is on a team),
// then one card per team (neutral portrait, team name, the word Team; a member count only if the
// team data carries one). The picked card gets a brass ring. Nothing shows below the cards until
// one is picked. Spec: docs/kickoffs/v7.0.789-AGT-385-connect-cards-faq.md.
// DeepBench v7.0.788 | ConnectAiScreen.jsx | AGT-384 — the Connect to AI page (/bench/connect)
// The Connect popup's content as its own page (John, 2026-10-05). A picker lists the
// viewer's Private Agents, then any teams they are on; once one is picked the Claude / ChatGPT / Grok
// steps (ConnectSteps) fill in with that name and address; the page title stays "Connect to AI",
// so the picked name shows once, in the steps' own title. The pick lives in the address
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
import { AgentAvatar } from "../components/SharedUI.jsx";
import ConnectSteps, { h2Style, pStyle } from "../components/ConnectAgentPopup.jsx";

// The page title: the Bench masthead's type.
const TITLE = { fontFamily:display, fontSize:30, fontWeight:500, color:T.navy, letterSpacing:"-.5px", lineHeight:1, marginBottom:6 };
const LINK = { fontFamily:body, fontSize:14, color:T.brassDeep, fontWeight:600, cursor:"pointer", textDecoration:"none" };
// FEATURE: AGT-385 — the agent / team card (RosterScreen's ring trick: the picked ring is a shadow,
// so the layout does not shift), its name, its role line and its team line.
const CARD = { display:"flex", gap:12, alignItems:"center", background:T.card, padding:"12px 14px", marginBottom:8, cursor:"pointer", maxWidth:420 };
const ringOf = picked => picked
  ? { border:`1px solid ${T.brass}`, boxShadow:`0 0 0 1.5px ${T.brass}` }
  : { border:`1px solid ${T.line}`, boxShadow:"none" };
const NAME = { fontFamily:display, fontSize:16, fontWeight:600, color:T.navy, lineHeight:1.1 };
const ROLE = { fontFamily:body, fontSize:11, color:T.mutedDeep, fontStyle:"italic", marginTop:2 };
const TEAMS = { fontFamily:body, fontSize:11, color:T.mutedDeep, marginTop:2 };

export default function ConnectAiScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const privateAgents = useAgents().filter(isPrivateAgent);
  const [teams, setTeams] = useState([]);
  const [teamsOf, setTeamsOf] = useState(new Map());

  // FEATURE: AGT-338 — the teams the viewer's private agents are on: one read per agent, merged,
  // one row per team address, by name. A slow or a failed read leaves the list without that team.
  // FEATURE: AGT-385 — the same reads also give each agent's card its team names, joined ", ".
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
      const names = new Map();
      all.forEach((d, i) => {
        const list = d && Array.isArray(d.teams) ? d.teams : [];
        for (const t of list) {
          if (!byAddress.has(t.address)) byAddress.set(t.address, t);
        }
        if (list.length) names.set(ids[i], list.map(t => t.name).join(", "));
      });
      setTeams([...byAddress.values()].sort((a, b) => a.name.localeCompare(b.name)));
      setTeamsOf(names);
    });
    return () => { live = false; };
  }, [idsKey]);

  const pickedId    = searchParams.get("agent");
  const pickedAgent = privateAgents.find(a => a.id === pickedId) || null;
  const pickedTeam  = teams.find(t => t.address === pickedId) || null;
  const origin      = window.location.origin;

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
                {/* Always the page's own title. */}
                <div style={TITLE}>Connect to AI</div>

                <h2 style={h2Style}>Choose an agent</h2>
                {privateAgents.map(a => (
                  <div key={a.id} onClick={() => pick(a.id)} style={{...CARD, ...ringOf(pickedId === a.id)}}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.brass; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = pickedId === a.id ? T.brass : T.line; }}>
                    <AgentAvatar who={a.id} size={48}/>
                    <div>
                      <div style={NAME}>{a.name}</div>
                      <div style={ROLE}>{a.role}</div>
                      {teamsOf.get(a.id) && <div style={TEAMS}>{teamsOf.get(a.id)}</div>}
                    </div>
                  </div>
                ))}
                {teams.map(t => (
                  <div key={t.address} onClick={() => pick(t.address)} style={{...CARD, ...ringOf(pickedId === t.address)}}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.brass; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = pickedId === t.address ? T.brass : T.line; }}>
                    <AgentAvatar who={t.address} size={48}/>
                    <div>
                      <div style={NAME}>{t.name}</div>
                      <div style={ROLE}>Team</div>
                      {Number.isFinite(t.count) && <div style={TEAMS}>{`${t.count} agents`}</div>}
                    </div>
                  </div>
                ))}

                {/* key: a new pick starts the steps fresh, so one agent's team blocks never show under another */}
                {pickedAgent
                  ? <ConnectSteps key={pickedAgent.id} agent={pickedAgent} address={`${origin}/api/mcp/${pickedAgent.id}`}/>
                  : pickedTeam
                    ? <ConnectSteps key={pickedTeam.address} agent={{ id: pickedTeam.address, name: pickedTeam.name, team: true }} address={`${origin}/api/mcp/` + pickedTeam.address}/>
                    : null}
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
