// DeepBench v7.0.788 | RosterScreen.jsx | AGT-384 — one screen, two pages. `home` (/bench): the masthead,
// the brass rule, the stats bar totalling the whole bench, and four next-step cards; no roster
// grid, no vacancy tile, no filter highlighted. Otherwise (/bench/roster?filter=<id>, Private when
// none is given): the roster as before. The nav moved to src/components/BenchNav.jsx (breadcrumb,
// All above Private Agents); the stats bar lost its add button and its workspace tag on both pages
// (John, 2026-10-05). Card copy and icons are his, verbatim: docs/harvests/AGT-384.md.
// Spec: docs/kickoffs/v7.0.788-AGT-384-bench-home.md.
// DeepBench v7.0.755 | RosterScreen.jsx | AGT-332 slice 2 — "Private" filter first and selected; All excludes private
// DeepBench v7.0.460 | RosterScreen.jsx | AGT-80 — the governance agents are the last left-hand filter,
// "Product Team" (John, 2026-09-12): the nav gains one flag-gated entry with the live count after the
// BENCH_FILTERS groups; under it the grid area shows the read-only Governance cards in place of the
// stats strip, the agent grid and the vacancy card; under every other filter the six are not mounted.
// DeepBench v6.2.17 | RosterScreen.jsx | RO-15 — mobile filter chip row gets a scroll-hint fade + chevron (SH-21 pattern reuse)
// DeepBench v6.2.12 | RosterScreen.jsx | RO-14 — filter-name comment updated: "Market Intel" → "Channel Sales Intel"
// DeepBench v6.2.5 | RosterScreen.jsx | S-MOBILE-ROSTER-01 — mobile-responsive layout (RO-13):
// filter chips replace sidebar, 3-col stat grid + full-width button, single-column card grid.
// DeepBench v6.2.0 | RosterScreen.jsx | S-MOBILE-NAV-01 — rename (RO-12): headline "Your bench." →
// "Your agent roster.", display-text only (screen name, not the top-level nav tab), see STYLE-GUIDE.md §25.
// DeepBench v5.2.37 | RosterScreen.jsx | RO-09 — sort agents by usage count
// src/screens/RosterScreen.jsx — v5.0.0
// DeepBench v5 — The Bench (/bench)
// 7-agent grid + situational awareness bar + Show/Hide Details drawer + bench stats

import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { T, display, body, mono, fmt$, skillLabel } from "../tokens.js";
import { AppShell } from "../AppShell.jsx";
import { Corners, SkillBar, AgentAvatar, AiBadge, FeatureBadge } from "../components/SharedUI.jsx";
import { useAgents } from "../hooks/useAgents.js";
import { useAgentUsageCounts } from "../hooks/useAgents.js";
import { AI_PAT } from "../aiPatterns.js";
import { BENCH_PRIVATE, isPrivateAgent } from "../data/agents.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import GovernanceSection, { PRODUCT_TEAM_FILTER } from "../components/GovernanceSection.jsx"; // FEATURE: AGT-69 / AGT-80 — flag read inside the component
import { BenchNav, BenchNavChips, useBenchNavItems } from "../components/BenchNav.jsx"; // FEATURE: AGT-384 — the shared Bench nav

// FEATURE: RO-04 — AgentAvatar illustrated SVG portrait in agent cards
// FEATURE: RO-02 — Agent cards + workload, AiBadge on Add Training
function AgentCard({ agent, onViewProfile, onAddTraining }) {
  const [open, setOpen] = useState(false);
  const borderColor = agent.trainable ? agent.color : T.line;
  const boxShadow   = agent.trainable ? `0 0 0 2.5px ${borderColor}` : "none";

  return (
    <div style={{background:T.card,border:`1px solid ${T.line}`,position:"relative",display:"flex",flexDirection:"column",boxShadow,overflow:"hidden",transition:"border-color .15s"}}
      onMouseEnter={e=>e.currentTarget.style.borderColor=T.brass}
      onMouseLeave={e=>e.currentTarget.style.borderColor=agent.trainable?borderColor:T.line}>
      <FeatureBadge id="RO-02" />
      <Corners color={agent.trainable ? agent.color : T.brass}/>

      {/* Badge header — click navigates to personnel */}
      <div onClick={()=>onViewProfile(agent)} style={{padding:"15px 16px 12px",display:"flex",gap:12,alignItems:"flex-start",borderBottom:`1px dashed ${T.line}`,cursor:"pointer"}}>
        <AgentAvatar who={agent.id} size={68} ring={true}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,letterSpacing:1.2,fontWeight:600,marginBottom:2}}>{agent.code} · EST. {agent.hiredOn.toUpperCase()}</div>
          <div style={{fontFamily:display,fontSize:18,fontWeight:600,color:T.navy,letterSpacing:"-.2px",lineHeight:1.1,marginBottom:3}}>{agent.name}</div>
          <div style={{fontFamily:body,fontSize:11,color:T.mutedDeep,fontStyle:"italic",marginBottom:7}}>{agent.role}</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <span style={{fontFamily:mono,fontSize:9,padding:"1px 7px",letterSpacing:.4,
              ...(agent.trainable ? {background:`${borderColor}18`,color:borderColor,border:`1px solid ${borderColor}`} : {background:"rgba(120,109,82,.12)",color:T.mutedDeep,border:`1px solid ${T.line}`})}}>
              {agent.trainable ? "● YOUR TRAINEE" : `◐ ${agent.trainableBy.toUpperCase()} MANAGED`}
            </span>
            <span style={{fontFamily:mono,fontSize:9,padding:"1px 7px",background:"rgba(182,135,58,.1)",color:T.brassDeep,border:`1px solid rgba(182,135,58,.35)`,letterSpacing:.4}}>{agent.arch}</span>
            {agent.isWebAgent&&!agent.isIntern&&<span style={{fontFamily:mono,fontSize:9,padding:"1px 7px",background:"rgba(90,117,56,.18)",color:T.moss,border:`1px solid rgba(90,117,56,.6)`,letterSpacing:.4}}>🌐 WEB AGENT</span>}
            {agent.isIntern&&<span style={{fontFamily:mono,fontSize:9,padding:"1px 7px",background:"rgba(120,109,82,.1)",color:T.muted,border:`1px solid rgba(120,109,82,.4)`,letterSpacing:.4}}>👩‍💼 INTERN</span>}
          </div>
        </div>
      </div>

      {/* Specialty */}
      <div style={{padding:"10px 16px 11px",borderBottom:`1px solid ${T.lineSoft}`,cursor:"pointer"}} onClick={()=>onViewProfile(agent)}>
        <div style={{fontFamily:body,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.4,fontWeight:600,marginBottom:2}}>Specialty</div>
        <div style={{fontFamily:body,fontSize:12,color:T.ink,marginBottom:4}}>{agent.specialty}</div>
        <div style={{fontFamily:display,fontStyle:"italic",fontSize:12,color:T.mutedDeep}}>{agent.quip}</div>
      </div>

      {/* Skill bar */}
      <div style={{padding:"11px 16px",borderBottom:`1px solid ${T.lineSoft}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
          <div style={{fontFamily:body,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.4,fontWeight:600}}>Skill Level</div>
          <div style={{fontFamily:mono,fontSize:10,color:agent.color===T.moss?T.moss:T.brassDeep,fontWeight:600}}>{skillLabel(agent.skill)} · {agent.skill}/100</div>
        </div>
        <SkillBar skill={agent.skill} color={agent.color}/>
      </div>

      {/* Situational Awareness bar */}
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.lineSoft}`,background:T.cardAlt}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5}}>
          <div style={{fontFamily:body,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.4,fontWeight:600}}>Situational Awareness</div>
          <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:agent.situational>=30?T.brass:T.muted}}>{agent.situational}%</div>
        </div>
        <div style={{height:7,background:T.paperDeep,border:`1px solid ${T.lineSoft}`,borderRadius:1,position:"relative"}}>
          <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${agent.situational}%`,background:agent.situational>=30?T.brass:T.muted,borderRadius:1}}/>
        </div>
      </div>

      {/* Show / Hide Details toggle */}
      <button onClick={e=>{e.stopPropagation();setOpen(o=>!o);}}
        style={{width:"100%",padding:"8px 16px",background:T.cardAlt,border:"none",borderBottom:`1px solid ${T.lineSoft}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:body,fontSize:10.5,color:T.brassDeep,letterSpacing:1.2,textTransform:"uppercase",fontWeight:700}}>
        <span>{open ? "Hide Details" : "Show Details"}</span>
        <span style={{width:22,height:22,borderRadius:"50%",border:`1.5px solid ${T.brass}`,background:T.card,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:T.brassDeep,transition:"transform .2s",transform:open?"rotate(180deg)":"none"}}>▾</span>
      </button>

      {/* Details drawer */}
      {open && (
        <div onClick={e=>e.stopPropagation()}>
          {/* Cost + revenue */}
          <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.lineSoft}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontFamily:body,fontSize:9.5,color:T.muted}}>Cost per AI Strategy Report</span>
              <span style={{fontFamily:mono,fontSize:12,color:agent.reportCost===0?T.moss:T.brassDeep,fontWeight:700}}>{agent.reportCost===0?"Free":fmt$(agent.reportCost)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontFamily:body,fontSize:9.5,color:T.muted}}>Revenue model</span>
              <span style={{fontFamily:body,fontSize:10.5,color:T.mutedDeep}}>{agent.trainable?"Trainable":"System Managed"}</span>
            </div>
          </div>
          {/* Documents / Class Hrs / Chunks */}
          <div style={{padding:"10px 16px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,borderBottom:`1px solid ${T.lineSoft}`}}>
            {[["Documents",agent.docs],["Class Hrs",agent.classes],["Chunks",agent.chunks]].map(([k,v])=>(
              <div key={k}>
                <div style={{fontFamily:body,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600}}>{k}</div>
                <div style={{fontFamily:display,fontSize:17,fontWeight:600,color:v===0?T.muted:T.navy,marginTop:1}}>{v===0?"—":v.toLocaleString()}</div>
              </div>
            ))}
          </div>
          {/* Navy financial strip */}
          <div style={{padding:"10px 16px 12px",background:`linear-gradient(180deg,${T.navy},${T.navyDeep})`,color:T.card}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <div>
                <div style={{fontFamily:body,fontSize:8.5,color:T.brassLight,textTransform:"uppercase",letterSpacing:1.3,fontWeight:600}}>Salary Equiv.</div>
                <div style={{fontFamily:display,fontSize:17,fontWeight:600}}>{fmt$(agent.salary)}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:body,fontSize:8.5,color:T.brassLight,textTransform:"uppercase",letterSpacing:1.3,fontWeight:600}}>Yearly Value</div>
                <div style={{fontFamily:display,fontSize:17,fontWeight:600,color:T.mossLight}}>{fmt$(agent.value)}</div>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6,paddingTop:6,borderTop:"1px solid rgba(248,242,226,.2)",fontFamily:mono,fontSize:9.5,color:"#b8c5d8"}}>
              <span>${agent.hourly}/hr</span>
              <span>{agent.reportHrs}h / report</span>
              <span>{agent.reportCost===0?"Free":fmt$(agent.reportCost)} per report</span>
            </div>
          </div>
        </div>
      )}

      {/* Action row */}
      <div style={{display:"flex",borderTop:`1px solid ${T.line}`,marginTop:"auto"}}>
        <button onClick={()=>onViewProfile(agent)}
          style={{flex:1,padding:10,fontFamily:body,fontSize:11.5,fontWeight:500,background:"transparent",border:"none",borderRight:`1px solid ${T.line}`,color:T.mutedDeep,cursor:"pointer"}}>
          View Profile →
        </button>
        {agent.trainable
          ? <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:agent.color===T.moss?T.moss:T.brass}}>
              {/* FEATURE: RO-08 */}
              {/* FEATURE: AI-28 — KNOWLEDGE_TRAINING pattern label */}
              <AiBadge style={agent.color===T.moss
                ? {color:"#fff", background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.3)"}
                : {color:T.navy, background:"rgba(18,36,60,0.12)", border:"1px solid rgba(18,36,60,0.2)"}
              } label={AI_PAT.KNOWLEDGE_TRAINING}/>
              <button onClick={()=>onAddTraining(agent)}
                style={{padding:10,fontFamily:body,fontSize:11.5,fontWeight:700,background:"transparent",color:agent.color===T.moss?"#fff":T.navy,border:"none",cursor:"pointer"}}>
                + Add Training
              </button>
            </div>
          : <button disabled style={{flex:1,padding:10,fontFamily:body,fontSize:11.5,background:"transparent",border:"none",color:T.muted,cursor:"not-allowed"}}>
              🔒 {agent.trainableBy} Only
            </button>
        }
      </div>
    </div>
  );
}

// FEATURE: AGT-384 — Bench home's four next-step cards. John's titles, icons, lines and targets
// (2026-10-05), verbatim and in his order; the third icon is the fullwidth plus, U+FF0B.
const HOME_CARDS = [
  { title: "View or train my roster", icon: "👥", line: "See your private agents, open their files and add to their training.", to: "/bench/roster?filter=private" },
  { title: "Connect to AI", icon: "🔌", line: "Use your agents inside Claude, ChatGPT or Grok.", to: "/bench/connect" },
  { title: "Add a player", icon: "＋", line: "Create a new agent and start building their expertise.", to: "/bench/new" },
  { title: "Test AI", icon: "🧪", line: "Teach your agent, then see what your training adds.", to: "/bench/test-ai" },
];

// FEATURE: AGT-384 — two-by-two on desktop, one column on mobile; the cream card with brass corners;
// the whole card is clickable; the icon sits in a brass-ringed circle (the vacancy tile's circle,
// ring solid); no numbers.
function HomeCards({ isMobile, navigate }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
      {HOME_CARDS.map(({ title, icon, line, to }) => (
        <div key={to} onClick={() => navigate(to)}
          style={{background:T.card,border:`1px solid ${T.line}`,position:"relative",padding:"28px 24px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",transition:"border-color .15s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor=T.brass}
          onMouseLeave={e=>e.currentTarget.style.borderColor=T.line}>
          <Corners color={T.brass}/>
          <div style={{width:64,height:64,borderRadius:"50%",background:T.paperDeep,border:`1.5px solid ${T.brass}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
            <span style={{fontFamily:display,fontSize:26,color:T.navy}}>{icon}</span>
          </div>
          <div style={{fontFamily:display,fontSize:17,fontWeight:600,color:T.navy,marginBottom:5}}>{title}</div>
          <div style={{fontFamily:body,fontSize:11.5,color:T.mutedDeep,fontStyle:"italic",lineHeight:1.5,maxWidth:260}}>{line}</div>
        </div>
      ))}
    </div>
  );
}

// FEATURE: RO-01 — All 7 agents
// FEATURE: RO-10 — Bench screen category filter (All/Channel Sales Intel/Platform Wide/Spend Analysis/Special Interests)
// FEATURE: AGT-384 — `home` is Bench home (/bench); without it this is the roster (/bench/roster).
export default function RosterScreen({ home = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const agents   = useAgents();
  const usageCounts = useAgentUsageCounts();
  // FEATURE: RO-13 — platform's single responsive breakpoint source, see STYLE-GUIDE.md §22
  const isMobile = useIsMobile();

  // FEATURE: AGT-384 — the active filter lives in the address (the shared nav navigates to it);
  // Private Agents when the roster is opened with none; no filter at all on home.
  const activeFilter = home ? null : (searchParams.get("filter") || BENCH_PRIVATE.id);
  // FEATURE: AGT-80 — the Product Team filter: flag + rows from the component's own hook, read once
  // by the nav's hook. The breadcrumb's second half is the active nav entry's own label.
  const { items: navItems, productTeam } = useBenchNavItems();
  const isProductTeam = activeFilter === PRODUCT_TEAM_FILTER;
  const currentLabel = home ? null : (navItems.find(item => item.id === activeFilter)?.label ?? null);

  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      const ca = usageCounts[a.id] || 0;
      const cb = usageCounts[b.id] || 0;
      if (cb !== ca) return cb - ca;
      return a.name.split(' ')[0].localeCompare(b.name.split(' ')[0]);
    });
  }, [agents, usageCounts]);

  // FEATURE: RO-10 — filtering happens on the already-sorted array, so
  // RO-09's sort order is preserved within the filtered subset.
  const filteredAgents = useMemo(() => {
    if (activeFilter === "all") return sortedAgents.filter(a => !isPrivateAgent(a));
    return sortedAgents.filter(a => a.benchGroups.includes(activeFilter));
  }, [sortedAgents, activeFilter]);

  // FEATURE: AGT-384 — on home the bar totals the whole bench (every agent under All plus the
  // viewer's Private Agents); on the roster it totals the selected filter, as before.
  const statAgents = home ? agents : filteredAgents;
  const stats = {
    size:        statAgents.length,
    salary:      statAgents.reduce((s,a)=>s+a.salary,0),
    value:       statAgents.reduce((s,a)=>s+a.value,0),
    reportsPerMonth: statAgents.reduce((s,a)=>s+(a.reportCost>0?8:a.isIntern?2:3),0),
    trainable:   statAgents.filter(a=>a.trainable).length,
  };

  // Bench stats strip — the same bar on home and on the roster.
  // FEATURE: RO-02
  // FEATURE: RO-13 — mobile: 3-col stat grid
  // FEATURE: AGT-384 — the add button and the workspace tag are off the bar, desktop and mobile
  const statsBar = (
    <div style={{background:T.navy,padding:"10px 20px",marginBottom:20,display:isMobile?"block":"flex",alignItems:"center",gap:28,border:`1px solid rgba(182,135,58,.3)`,position:"relative"}}>
      <Corners color={T.brass}/>
      {isMobile ? (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[
            ["Bench Size",        stats.size,                  T.card],
            ["Annual Salary",     fmt$(stats.salary),          T.brassLight],
            ["Annual Value",      fmt$(stats.value),           T.mossLight],
            ["Reports / Mo",      stats.reportsPerMonth,       T.card],
            ["Trainable Agents",  stats.trainable,             T.brassLight],
          ].map(([k,v,c])=>(
            <div key={k}>
              <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",textTransform:"uppercase",letterSpacing:1.3,marginBottom:2}}>{k}</div>
              <div style={{fontFamily:display,fontSize:18,fontWeight:600,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {[
            ["Bench Size",        stats.size,                  T.card],
            ["Annual Salary",     fmt$(stats.salary),          T.brassLight],
            ["Annual Value",      fmt$(stats.value),           T.mossLight],
            ["Reports / Mo",      stats.reportsPerMonth,       T.card],
            ["Trainable Agents",  stats.trainable,             T.brassLight],
          ].map(([k,v,c])=>(
            <div key={k}>
              <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",textTransform:"uppercase",letterSpacing:1.3,marginBottom:2}}>{k}</div>
              <div style={{fontFamily:display,fontSize:18,fontWeight:600,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  return (
    <AppShell>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* ── Left nav — FEATURE: AGT-384, shared by the five Bench pages (desktop sidebar) ── */}
        <BenchNav current={currentLabel} activeFilter={activeFilter}/>

        {/* ── Right content area ── */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px 48px",background:T.paperDeep}}>

          {/* Masthead */}
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",paddingBottom:14}}>
            <div>
              <div style={{fontFamily:display,fontSize:30,fontWeight:500,color:T.navy,letterSpacing:"-.5px",lineHeight:1,marginBottom:6}}>Your agent roster.</div>
              <div style={{fontFamily:body,fontStyle:"italic",fontSize:13,color:T.mutedDeep,maxWidth:560,lineHeight:1.5}}>
                These are your agents. Click any team member to view their profile, assign them work, or add to their training. Ready to grow your bench? Add a new player and start building their expertise.
              </div>
            </div>
          </div>
          <div style={{height:2,background:T.brass,marginBottom:20}}/>

          {/* FEATURE: AGT-384 — mobile: the breadcrumb line, then the filter chip row (RO-13 / RO-15) */}
          <BenchNavChips current={currentLabel} activeFilter={activeFilter}/>

          {/* FEATURE: AGT-384 — Bench home: the stats bar, then the four cards. No grid, no vacancy tile. */}
          {home && (<>
          {statsBar}
          <HomeCards isMobile={isMobile} navigate={navigate}/>
          </>)}

          {!home && (<>
          {/* FEATURE: AGT-80 — under the Product Team filter the grid area is the read-only
              Governance cards; the stats strip, agent grid and vacancy card belong to the hire-able
              bench and are not mounted here. */}
          {isProductTeam && <GovernanceSection rows={productTeam.rows} embedded />}

          {!isProductTeam && (<>
          {statsBar}

          {/* Agent grid — FEATURE: RO-10 empty state if the active filter has no agents */}
          {filteredAgents.length === 0 ? (
            <div style={{border:`1.5px dashed ${T.line}`,background:T.card,padding:"48px 20px",textAlign:"center",marginBottom:16}}>
              <div style={{fontFamily:body,fontStyle:"italic",color:T.muted}}>No agents in this group yet.</div>
            </div>
          ) : null}
          {/* FEATURE: RO-13 — mobile: single-column card grid, same AgentCard/vacancy tile */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:16}}>
            {filteredAgents.map(a=>(
              <AgentCard key={a.id} agent={a}
                onViewProfile={a=>navigate(`/bench/${a.id}`)}
                onAddTraining={a=>navigate(`/bench/${a.id}?tab=training`)}
              />
            ))}

            {/* Vacancy card — always renders regardless of activeFilter */}
            <div onClick={()=>navigate("/bench/new")}
              style={{background:"repeating-linear-gradient(45deg,#ddd5be,#ddd5be 6px,#ebe5d5 6px,#ebe5d5 12px)",border:"1.5px dashed #786d52",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:30,minHeight:460,cursor:"pointer",transition:"border-color .15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.brass}
              onMouseLeave={e=>e.currentTarget.style.borderColor="#786d52"}>
              <div style={{width:64,height:64,borderRadius:"50%",background:T.paperDeep,border:"1.5px dashed #786d52",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
                <span style={{fontFamily:display,fontSize:26,color:T.muted}}>+</span>
              </div>
              <div style={{fontFamily:mono,fontSize:10,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.3,fontWeight:600,marginBottom:6}}>Vacancy · Position 08</div>
              <div style={{fontFamily:display,fontSize:17,fontWeight:600,color:T.navy,textAlign:"center",marginBottom:5}}>Your New Agent</div>
              <div style={{fontFamily:body,fontSize:11.5,color:T.mutedDeep,textAlign:"center",fontStyle:"italic",lineHeight:1.5,maxWidth:200,marginBottom:14}}>Build a custom agent trained on your expertise.</div>
              <div style={{padding:"3px 10px",background:"rgba(182,135,58,.2)",border:`1px solid rgba(182,135,58,.6)`,fontFamily:mono,fontSize:9.5,color:T.brassDeep,letterSpacing:1.2,textTransform:"uppercase",fontWeight:700}}>+ Build Agent</div>
            </div>
          </div>
          </>)}
          </>)}
        </div>
      </div>
    </AppShell>
  );
}
