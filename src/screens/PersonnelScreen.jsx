// DeepBench v5.1.22 | PersonnelScreen.jsx | Training tab live wiring — PE-03

import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { T, display, body, mono, fmt$, skillLabel } from "../tokens.js";
import { TENANT_ID } from "../config.js";
import { AppShell } from "../AppShell.jsx";
import { Corners, SkillBar, Toast, AiBadge, FeatureBadge } from "../components/SharedUI.jsx";
import { useAgents } from "../hooks/useAgents.js";
import { AGENT_PRONOUNS, STANDARD_CATEGORIES, BRENT_CATEGORIES, FLAG_TRIGGERS } from "../data/agents.js";
import { readinessColor, readinessLabel, priorityInfo } from "../utils.js";
import ResumeTab from "./personnel/ResumeTab.jsx";

// FEATURE: PE-03 — Training tab live wiring
async function apiGetEntries(agent_id) {
  const res = await fetch(`/api/load-entries?tenant_id=${TENANT_ID}&agent_id=${encodeURIComponent(agent_id)}`);
  if (!res.ok) throw new Error("Failed to load entries");
  return (await res.json()).entries || [];
}
async function apiPatchEntry(id, status) {
  const res = await fetch("/api/knowledge-entry", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, tenant_id: TENANT_ID, status }),
  });
  if (!res.ok) throw new Error("Failed to update");
}
async function apiDeleteEntry(id) {
  const res = await fetch("/api/knowledge-entry", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, tenant_id: TENANT_ID }),
  });
  if (!res.ok) throw new Error("Failed to delete");
}

// ── 5-layer readiness calc ────────────────────────────────────────────────────
function computeLayers(agent, entries) {
  const n = entries.length;
  return [
    { num:"L1", label:"Role & Behavior",    tab:"Resume",   s: agent.skill > 0 ? Math.min(100, agent.skill) : 0 },
    { num:"L2", label:"Background (RAG)",   tab:"Training", s: agent.trainable ? Math.min(100, Math.round(20 + n*6)) : 0 },
    { num:"L3", label:"Analysis Payload",   tab:"—",        s: 100 },
    { num:"L4", label:"Output Format",      tab:"Playbook", s: agent.trainable ? 72 : 50 },
    { num:"L5", label:"Guardrails",         tab:"Playbook", s: agent.trainable ? 68 : 45 },
  ];
}

// ── Mock tasks per agent (replace with Supabase in Phase 0) ─────────────────
const AGENT_TASKS = {
  robyn:[{id:1,title:"NIGP Demo — Austin FY2025 Spend Analysis",type:"Data Analysis",status:"completed",priority:"High",due:"Jun 15",preview:"Full portfolio analysis: $372M, 264 NIGP classes, 2,847 vendors."},{id:3,title:"Vendor Concentration Briefing — City of Austin",type:"Data Analysis",status:"in-progress",priority:"High",due:"Jun 18",preview:"Analyzing HHI scores and single-source risk across facilities spend."}],
  brent:[{id:2,title:"Illinois Q1 2025 Expenditure Fetch",type:"Web Fetch",status:"needs-review",priority:"Normal",due:"Jun 20",preview:"Brent navigated IL Comptroller portal and downloaded statewide expenditures. File ready for analysis."},{id:5,title:"Maryland FY2025 Vendor Payment Data",type:"Web Fetch",status:"pending",priority:"Normal",due:"Jun 25",preview:"Scheduled fetch from MD-VIEW portal."}],
  mike:[{id:6,title:"Contract Coverage Gap Analysis",type:"Data Analysis",status:"awaiting-input",priority:"Low",due:"TBD",preview:"Awaiting your input: which fiscal year should this analysis cover?"}],
  bob:[{id:3,title:"Vendor Concentration Briefing — City of Austin",type:"Compliance Review",status:"in-progress",priority:"High",due:"Jun 18",preview:"Reviewing contracts and single-source justifications for compliance."}],
};
const AGENT_COMPLETED = {
  robyn:[{id:10,title:"FY2024 Annual Spend Report",type:"Data Analysis",completedOn:"May 28"},{id:12,title:"Sole-Source Justification Review",type:"Compliance Review",completedOn:"May 15"}],
  brent:[{id:11,title:"Oregon OregonBuys PO Export",type:"Web Fetch",completedOn:"May 22"}],
};

// FEATURE: PE-01 — Profile tab
// FEATURE: PE-08 — NIGP 2-col layout: ID Badge + Compensation left; Readiness + Intel Config + Quick Stats right
// ── Tab: Profile ──────────────────────────────────────────────────────────────
function ProfileTab({ agent, entries, layers }) {
  const readiness     = Math.round(layers.reduce((s,l)=>s+l.s,0)/layers.length);
  const rc            = readinessColor;
  const fmt           = fmt$;
  const agentTasks    = AGENT_TASKS[agent.id]     || [];
  const agentCompleted= AGENT_COMPLETED[agent.id] || [];

  const STATUS_S = {
    "needs-review":   {bg:"rgba(90,117,56,.12)",  color:T.moss,       border:"rgba(90,117,56,.3)",   label:"Needs Review"},
    "in-progress":    {bg:"rgba(182,135,58,.12)", color:T.brassDeep,  border:"rgba(182,135,58,.35)", label:"In Progress"},
    "pending":        {bg:"rgba(18,36,60,.07)",   color:T.mutedDeep,  border:T.lineSoft,             label:"Pending"},
    "awaiting-input": {bg:"rgba(182,135,58,.08)", color:T.brassDeep,  border:T.lineSoft,             label:"Awaiting Input"},
    "action-required":{bg:"rgba(168,51,25,.1)",   color:T.flag,       border:"rgba(168,51,25,.3)",   label:"Action Required"},
    "completed":      {bg:"rgba(90,117,56,.08)",  color:T.moss,       border:"rgba(90,117,56,.2)",   label:"Completed"},
  };
  const PRIORITY_S = {
    "High":  {color:T.flag,       bg:"rgba(168,51,25,.08)",  border:"rgba(168,51,25,.25)"},
    "Normal":{color:T.muted,      bg:"rgba(18,36,60,.06)",   border:T.lineSoft},
    "Low":   {color:T.muted,      bg:"rgba(120,109,82,.08)", border:T.line},
  };

  return (
    <>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,alignItems:"start"}}>

      {/* ── Left column: ID Badge + Compensation ── */}
      <div style={{display:"flex",flexDirection:"column",gap:14}}>

        {/* ID Badge card */}
        <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"16px 14px 12px",textAlign:"center",position:"relative"}}>
          <Corners color={agent.color}/>
          <div style={{fontFamily:mono,fontSize:8,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.6,fontWeight:700,marginBottom:12}}>Bureau of Procurement Intelligence</div>
          <div style={{width:92,height:92,borderRadius:"50%",border:`2px solid ${agent.color}`,background:T.paperDeep,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:display,fontSize:36,fontWeight:700,color:agent.color,margin:"0 auto 12px"}}>
            {agent.name[0]}
          </div>
          <div style={{fontFamily:display,fontSize:20,fontWeight:600,color:T.navy,marginBottom:3}}>{agent.name}</div>
          <div style={{fontFamily:body,fontSize:12,color:T.mutedDeep,fontStyle:"italic",marginBottom:10}}>{agent.role}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginBottom:10}}>
            <span style={{fontFamily:mono,fontSize:8.5,padding:"2px 8px",background:"rgba(182,135,58,.1)",color:T.brassDeep,border:`1px solid rgba(182,135,58,.3)`}}>{agent.code}</span>
            <span style={{fontFamily:mono,fontSize:8.5,padding:"2px 8px",background:"rgba(90,117,56,.1)",color:T.moss,border:`1px solid rgba(90,117,56,.3)`,fontWeight:700}}>● ACTIVE</span>
            {agent.trainable&&<span style={{fontFamily:mono,fontSize:8.5,padding:"2px 8px",background:`${agent.color}18`,color:agent.color,border:`1px solid ${agent.color}40`,fontWeight:700}}>YOUR TRAINEE</span>}
          </div>
          <div style={{fontFamily:display,fontStyle:"italic",fontSize:12,color:T.mutedDeep,background:`${T.moss}08`,border:`1px solid ${T.moss}25`,padding:"8px 12px",lineHeight:1.5}}>
            "{agent.quip}"
          </div>
        </div>

        {/* Compensation card */}
        <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"14px 18px",position:"relative"}}>
          <Corners/>
          <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:8}}>Compensation · FY2026 · The Ledger</div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <div>
              <div style={{fontFamily:body,fontSize:8.5,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:1}}>Salary Equiv.</div>
              <div style={{fontFamily:display,fontSize:19,fontWeight:600,color:T.navy}}>{agent.salary===0?"Free":fmt(agent.salary)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:body,fontSize:8.5,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:1}}>Yearly Value</div>
              <div style={{fontFamily:display,fontSize:19,fontWeight:600,color:T.moss}}>{agent.value===0?"Demo":fmt(agent.value)}</div>
            </div>
          </div>
          {[["Hourly rate","$"+agent.hourly],["Hours / report",agent.reportHrs+"h"],["Cost / report",agent.reportCost===0?"Free":"$"+agent.reportCost],["Revenue model",agent.revenueModel||"—"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${T.lineSoft}`,fontSize:11}}>
              <span style={{color:T.mutedDeep}}>{k}</span>
              <span style={{fontFamily:mono,fontSize:10.5,color:T.ink}}>{v}</span>
            </div>
          ))}
          <div style={{marginTop:7,fontFamily:body,fontSize:10,color:T.muted,fontStyle:"italic"}}><strong style={{fontStyle:"normal"}}>Mock data.</strong> Live billing in v5.</div>
        </div>
      </div>

      {/* ── Right column: Readiness + Intel Config + Quick Stats ── */}
      <div style={{display:"flex",flexDirection:"column",gap:14}}>

        {/* Readiness score */}
        <div style={{background:T.navy,padding:"14px 18px",position:"relative",border:`1px solid rgba(182,135,58,.3)`}}>
          <Corners color={T.brass}/>
          <div style={{fontFamily:mono,fontSize:8.5,color:T.brassLight,textTransform:"uppercase",letterSpacing:1.8,fontWeight:600,marginBottom:7}}>Agent Readiness Score</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:12,marginBottom:9}}>
            <div style={{fontFamily:display,fontSize:44,fontWeight:700,color:rc(readiness),lineHeight:1}}>{readiness}</div>
            <div style={{paddingBottom:4}}>
              <div style={{fontFamily:mono,fontSize:10,color:rc(readiness),fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>{readinessLabel(readiness)}</div>
              <div style={{fontFamily:body,fontSize:10,color:"#8fa3bf",marginTop:1}}>weighted composite · 5 layers</div>
            </div>
          </div>
          <div style={{height:6,background:"rgba(255,255,255,.1)",marginBottom:12}}>
            <div style={{height:"100%",width:`${readiness}%`,background:rc(readiness)}}/>
          </div>
          {layers.map(l=>(
            <div key={l.num} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
              <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",width:14,flexShrink:0}}>{l.num}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontFamily:body,fontSize:10,color:"#f8f2e2"}}>{l.label}</span>
                  <span style={{fontFamily:mono,fontSize:9,color:rc(l.s),fontWeight:700}}>{l.s}</span>
                </div>
                <div style={{height:3,background:"rgba(255,255,255,.08)"}}>
                  <div style={{height:"100%",width:`${l.s}%`,background:rc(l.s)}}/>
                </div>
              </div>
              <div style={{fontFamily:mono,fontSize:7.5,color:"#8fa3bf",width:50,flexShrink:0,textAlign:"right",fontStyle:"italic"}}>{l.tab}</div>
            </div>
          ))}
        </div>

        {/* Intelligence config */}
        <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"13px 15px",position:"relative"}}>
          <Corners/>
          <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:4}}>Intelligence Configuration</div>
          <div style={{fontFamily:display,fontSize:14,fontWeight:600,color:T.navy,marginBottom:10}}>How {agent.name.split(" ")[0]}'s prompt is assembled</div>
          <div style={{display:"flex",alignItems:"stretch",marginBottom:10}}>
            {layers.map((l,i)=>(
              <div key={l.num} style={{flex:1,textAlign:"center",padding:"8px 4px",background:`${rc(l.s)}12`,border:`1px solid ${rc(l.s)}35`,borderRight:i<layers.length-1?"none":undefined}}>
                <div style={{fontFamily:mono,fontSize:9,fontWeight:700,color:rc(l.s),marginBottom:2}}>{l.num}</div>
                <div style={{fontFamily:body,fontSize:8.5,color:T.navy,lineHeight:1.2,marginBottom:3}}>{l.label}</div>
                <div style={{fontFamily:mono,fontSize:8,color:rc(l.s),fontWeight:700}}>{l.s}/100</div>
              </div>
            ))}
          </div>
          <div style={{fontFamily:body,fontSize:11,color:T.mutedDeep,lineHeight:1.5,fontStyle:"italic"}}>Configure each layer in Resume, Training, and Playbook tabs.</div>
        </div>

        {/* Quick stats */}
        <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"13px 15px",position:"relative"}}>
          <Corners/>
          <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:10}}>Quick Stats</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            {[["Skill",`${agent.skill}/100`,skillLabel(agent.skill),"#886224"],["Documents",agent.docs||"—","training docs",T.navy],["Reports Run","—","mock data",T.moss]].map(([l,v,s,c])=>(
              <div key={l}>
                <div style={{fontFamily:body,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:1}}>{l}</div>
                <div style={{fontFamily:display,fontSize:18,fontWeight:600,color:c,lineHeight:1}}>{v}</div>
                <div style={{fontFamily:mono,fontSize:8.5,color:T.muted,marginTop:1}}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{borderTop:`1px solid ${T.lineSoft}`,paddingTop:10,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
              <div style={{fontFamily:body,fontSize:8.5,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600}}>Situational Awareness</div>
              <div style={{fontFamily:display,fontSize:15,fontWeight:600,color:agent.situational>=30?T.brass:T.muted}}>{agent.situational}%</div>
            </div>
            <div style={{height:4,background:`${T.lineSoft}`,borderRadius:2}}>
              <div style={{height:"100%",width:`${agent.situational}%`,background:agent.situational>=30?T.brass:T.muted,borderRadius:2}}/>
            </div>
          </div>
          <div>
            <div style={{fontFamily:body,fontSize:8.5,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:6}}>Skill Level</div>
            <SkillBar skill={agent.skill} color={agent.color}/>
          </div>
        </div>
      </div>
    </div>

    {/* ── Active Work Assignments ── */}
    <div style={{marginTop:18}}>
      <div style={{fontFamily:mono,fontSize:9,fontWeight:700,color:T.brassDeep,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Active Work Assignments</div>
      {agentTasks.length===0 ? (
        <div style={{background:T.card,border:`1px dashed ${T.lineSoft}`,padding:"24px",textAlign:"center",marginBottom:10}}>
          <div style={{fontFamily:display,fontSize:14,color:T.muted,fontStyle:"italic"}}>No active assignments for {agent.name.split(" ")[0]} right now.</div>
        </div>
      ) : agentTasks.map(t=>{
        const s=STATUS_S[t.status]||STATUS_S["pending"];
        const p=PRIORITY_S[t.priority]||PRIORITY_S["Normal"];
        return(
          <div key={t.id} style={{background:T.card,border:`1.5px solid ${T.line}`,overflow:"hidden",marginBottom:10,position:"relative",transition:"border-color .15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=T.brass}
            onMouseLeave={e=>e.currentTarget.style.borderColor=T.line}>
            <div style={{padding:"13px 16px",display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{width:36,height:36,borderRadius:"50%",border:`1.5px solid ${agent.color}`,background:T.paperDeep,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:display,fontSize:14,fontWeight:700,color:agent.color,flexShrink:0,marginTop:1}}>{agent.name[0]}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:display,fontSize:14,fontWeight:600,color:T.navy,marginBottom:4,lineHeight:1.2}}>{t.title}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                  <span style={{fontFamily:mono,fontSize:8,color:T.muted}}>{t.type}</span>
                  <span style={{color:T.lineSoft}}>·</span>
                  <span style={{fontFamily:mono,fontSize:8,color:T.muted}}>Due {t.due}</span>
                </div>
                <div style={{fontSize:12,color:T.mutedDeep,fontStyle:"italic",lineHeight:1.5}}>{t.preview}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
                <span style={{fontFamily:mono,fontSize:8,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",padding:"2px 8px",background:s.bg,color:s.color,border:`1px solid ${s.border}`}}>{s.label}</span>
                <span style={{fontFamily:mono,fontSize:8,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",padding:"2px 8px",background:p.bg,color:p.color,border:`1px solid ${p.border}`}}>{t.priority}</span>
              </div>
            </div>
            {t.status==="needs-review"&&(
              <div style={{borderTop:`1px solid ${T.line}`,padding:"9px 16px",background:T.cardAlt,display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontFamily:mono,fontSize:8.5,color:T.moss,fontWeight:700}}>● Ready for your review</span>
                <div style={{flex:1}}/>
                <button style={{background:T.moss,color:"#fff",border:"none",padding:"6px 14px",fontFamily:body,fontSize:11,fontWeight:700,cursor:"pointer"}}>Review & Approve</button>
                <button style={{background:"transparent",border:`1px solid ${T.line}`,color:T.mutedDeep,padding:"6px 12px",fontFamily:body,fontSize:11,cursor:"pointer"}}>Request Changes</button>
              </div>
            )}
          </div>
        );
      })}

      <div style={{fontFamily:mono,fontSize:9,fontWeight:700,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginTop:16,marginBottom:8}}>Recently Completed</div>
      {agentCompleted.length===0 ? (
        <div style={{background:T.card,border:`1px dashed ${T.lineSoft}`,padding:"18px",textAlign:"center"}}>
          <div style={{fontFamily:display,fontSize:13,color:T.muted,fontStyle:"italic"}}>No completed projects yet</div>
        </div>
      ) : agentCompleted.map(t=>(
        <div key={t.id} style={{background:T.card,border:`1px solid ${T.line}`,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,marginBottom:6,opacity:.85}}>
          <span style={{fontFamily:mono,fontSize:10,color:T.moss}}>✓</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:display,fontSize:13,fontWeight:600,color:T.navy}}>{t.title}</div>
            <div style={{fontFamily:mono,fontSize:8,color:T.muted,marginTop:2}}>{t.type} · Completed {t.completedOn}</div>
          </div>
          <button style={{background:"transparent",border:`1px solid ${T.line}`,color:T.muted,padding:"3px 10px",fontFamily:mono,fontSize:8,letterSpacing:.5,textTransform:"uppercase",cursor:"pointer"}}>View</button>
        </div>
      ))}
    </div>
    </>
  );
}

// FEATURE: PE-03 — Training tab live wiring
// ── Tab: Training ─────────────────────────────────────────────────────────────
function TrainingTab({ agent, entries, setEntries, loadingEntries, showToast, navigate }) {
  const [expandedIds, setExpandedIds] = useState({});
  const toggleEntry = (id) => setExpandedIds(p=>({...p,[id]:!p[id]}));
  const pronouns = AGENT_PRONOUNS[agent.id] || { subject:"they" };

  const exportJSON = () => {
    const real = entries.filter(e=>!e.isDemo);
    const blob = new Blob([JSON.stringify(real,null,2)],{type:"application/json"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href=url; a.download=`${agent.id}_training.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // FEATURE: PE-03 — live toggle via API
  const toggleStatus = async (id, currentStatus) => {
    const next = currentStatus === "active" ? "disabled" : "active";
    try {
      await apiPatchEntry(id, next);
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: next } : e));
      showToast(next === "active" ? "Enabled ✦" : "Disabled ✦");
    } catch { showToast("Failed to update", "⚠"); }
  };

  // FEATURE: PE-03 — live delete via API
  const deleteEntry = async (id) => {
    if (!window.confirm("Delete this training entry permanently?")) return;
    try {
      await apiDeleteEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      showToast("Deleted ✦");
    } catch { showToast("Delete failed", "⚠"); }
  };

  // FEATURE: PE-03 — Run ID formatter
  function formatRunId(createdAt) {
    if (!createdAt) return "";
    return createdAt.replace("T", " ").split(".")[0].replace(/-/g,"").replace(/:/g,"").replace(" ","-");
  }

  // FEATURE: PE-03 — Date column formatter
  function formatDateCol(createdAt) {
    if (!createdAt) return { month: "—", day: "" };
    const d = new Date(createdAt);
    return {
      month: d.toLocaleDateString("en-US", { month: "short" }),
      day:   d.getDate().toString(),
    };
  }

  const active   = entries.filter(e=>e.status==="active");
  const disabled = entries.filter(e=>e.status==="disabled");

  // FEATURE: PE-03 — loading state while entries fetch
  if (loadingEntries) return (
    <div style={{ padding: "40px", textAlign: "center", color: T.muted, fontFamily: mono, fontSize: 11 }}>
      Loading training entries…
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,position:"relative"}}>
      {/* FEATURE: PE-03 — FeatureBadge */}
      <FeatureBadge id="PE-03" />

      {/* Navy stats strip — FEATURE: PE-03 */}
      <div style={{background:T.navy,padding:"11px 18px",display:"flex",gap:22,alignItems:"center",border:`1px solid rgba(182,135,58,.3)`}}>
        {[["Documents",agent.docs,T.card],["Class Hrs",agent.classes,T.brassLight],["Chunks",agent.chunks,"#8fa3bf"],["~Tokens",agent.chunks>0?Math.round(agent.chunks*0.74/1000)+"K":"0","#8fa3bf"]].map(([k,v,c])=>(
          <div key={k}>
            <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",textTransform:"uppercase",letterSpacing:1.2,marginBottom:2}}>{k}</div>
            <div style={{fontFamily:display,fontSize:17,fontWeight:600,color:c}}>{v||"0"}</div>
          </div>
        ))}
        <div style={{flex:1}}/>
        {/* S-MIGRATE-03 — Add Courses inline sub-view */}
        <button disabled style={{
          background:"transparent",
          border:`1px solid ${T.brass}`,
          color:T.brassLight,
          padding:"6px 14px",
          fontFamily:body,
          fontSize:12,
          fontWeight:600,
          opacity:0.45,
          cursor:"not-allowed",
          letterSpacing:.3,
        }}>
          + Add Courses
        </button>
      </div>

      {/* How it works */}
      <div style={{background:T.cardAlt,border:`1px dashed ${T.lineSoft}`,padding:"9px 13px"}}>
        <div style={{fontFamily:mono,fontSize:8.5,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.3,fontWeight:600,marginBottom:3}}>How Background Knowledge Works · Layer 02</div>
        <div style={{fontFamily:body,fontSize:11.5,color:T.mutedDeep,lineHeight:1.5}}>Documents are stored in vector format. Before each analysis, the system queries this library and injects the most relevant rules, statutes, and standards as Layer 02 of the prompt.</div>
      </div>

      {/* Export + count header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>Exhibit I · Training Courses</div>
          <div style={{fontSize:12,color:T.muted,marginTop:3}}>{active.length} active · {disabled.length} disabled · {entries.reduce((s,e)=>s+(e.chunks||0),0)} chunks</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportJSON} style={{background:"transparent",border:`1px solid ${T.line}`,color:T.mutedDeep,padding:"7px 14px",cursor:"pointer",fontFamily:body,fontSize:12}}>⬇ Export JSON</button>
        </div>
      </div>

      {entries.length===0&&(
        <div style={{background:`${T.brass}06`,border:`1px solid ${T.brass}20`,padding:"40px",textAlign:"center"}}>
          <div style={{fontFamily:display,fontSize:16,fontWeight:600,color:T.navy,marginBottom:8}}>No training entries yet</div>
          {agent.trainable&&<div style={{fontFamily:body,fontSize:12,color:T.muted,fontStyle:"italic"}}>Use the Training tab to add courses.</div>}
        </div>
      )}

      {/* FEATURE: PE-03 — NIGP card layout: left date/timeline col + right content */}
      {entries.map((e) => {
        const pi = priorityInfo(e.priority);
        const isExpanded = expandedIds[e.id];
        const runId = formatRunId(e.createdAt);
        const dateCol = formatDateCol(e.createdAt);
        return (
          <div key={e.id} style={{background:T.card,border:`1px solid ${T.line}`,marginBottom:10,overflow:"hidden",display:"flex"}}>

            {/* Left date/timeline column */}
            <div style={{width:56,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0 10px",borderRight:`1px solid ${T.lineSoft}`,background:T.cardAlt,gap:2}}>
              <div style={{fontFamily:mono,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:.8,fontWeight:600,lineHeight:1}}>{dateCol.month}</div>
              {dateCol.day && <div style={{fontFamily:mono,fontSize:9,color:T.muted,lineHeight:1}}>{dateCol.day},</div>}
              <div style={{marginTop:6,fontSize:14,color:T.moss,lineHeight:1}}>●</div>
            </div>

            {/* Right content */}
            <div style={{flex:1,minWidth:0,padding:"12px 16px"}}>

              {/* Header row: chips left, action buttons right */}
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,flexWrap:"wrap"}}>
                <span style={{fontFamily:mono,fontSize:8.5,padding:"1px 6px",background:`${T.brass}10`,color:T.brassDeep,border:`1px solid ${T.brass}30`}}>{e.category||"INTERNAL"}</span>
                {e.jurisdiction&&<span style={{fontFamily:mono,fontSize:8.5,padding:"1px 6px",background:"rgba(45,111,181,.1)",color:"#2d6fb5",border:"1px solid rgba(45,111,181,.3)"}}>{e.jurisdiction}</span>}
                <div style={{flex:1}}/>
                {/* Toggle button */}
                <button
                  onClick={() => toggleStatus(e.id, e.status)}
                  style={{
                    fontFamily:mono, fontSize:9, fontWeight:700,
                    color: e.status==="active" ? T.moss : T.muted,
                    background: e.status==="active" ? `${T.moss}12` : "transparent",
                    border: `1px solid ${e.status==="active" ? T.moss : T.lineSoft}`,
                    padding:"2px 8px", cursor:"pointer", letterSpacing:.3,
                  }}
                >
                  {e.status==="active" ? "● Active" : "○ Disabled"}
                </button>
                {/* S-MIGRATE-04 — Edit inline sub-view placeholder */}
                <button disabled style={{fontFamily:mono,fontSize:9,color:T.muted,background:"transparent",border:`1px solid ${T.lineSoft}`,padding:"2px 7px",cursor:"not-allowed",letterSpacing:.5,textTransform:"uppercase",opacity:0.45}}>
                  EDIT
                </button>
                {/* Delete — only if agent.trainable */}
                {agent.trainable && (
                  <button onClick={()=>deleteEntry(e.id)} style={{fontFamily:mono,fontSize:9,color:T.flag,background:"transparent",border:`1px solid ${T.flag}40`,padding:"2px 7px",cursor:"pointer",letterSpacing:.5,textTransform:"uppercase"}}>
                    DELETE
                  </button>
                )}
              </div>

              {/* Run ID row */}
              {runId && (
                <div style={{fontFamily:mono,fontSize:8,color:T.muted,marginBottom:6}}>
                  Run {runId}
                </div>
              )}

              {/* Title */}
              <div style={{fontFamily:display,fontSize:14,fontWeight:600,color:T.navy,marginBottom:5,lineHeight:1.25}}>{e.title}</div>

              {/* Trigger chips */}
              {e.triggers?.length > 0 && (
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
                  {e.triggers.includes("all")
                    ? <span style={{fontFamily:mono,fontSize:8.5,padding:"1px 6px",background:"rgba(168,51,25,.1)",color:T.flag,border:`1px solid rgba(168,51,25,.35)`}}>⚑ ALL FLAGS</span>
                    : e.triggers.map(t=><span key={t} style={{fontFamily:mono,fontSize:8.5,padding:"1px 6px",background:"rgba(168,51,25,.1)",color:T.flag,border:`1px solid rgba(168,51,25,.35)`}}>⚑ {t.toUpperCase().replace(/-/g," ")}</span>)
                  }
                </div>
              )}

              {/* Priority */}
              <div style={{fontFamily:mono,fontSize:9,color:T.muted,marginBottom:5}}>Priority {e.priority}/100</div>

              {/* Field notes */}
              {e.fieldNotes && (
                <div style={{fontFamily:body,fontSize:11.5,color:T.mutedDeep,marginBottom:5,lineHeight:1.5,fontStyle:"italic",background:T.cardAlt,padding:"6px 10px",borderLeft:`3px solid ${T.brass}`}}>
                  {e.fieldNotes}
                </div>
              )}

              {/* What X Learned expandable */}
              <button onClick={()=>toggleEntry(e.id)} style={{marginTop:4,fontFamily:mono,fontSize:9,color:T.brassDeep,background:"transparent",border:`1px solid ${T.lineSoft}`,padding:"2px 8px",cursor:"pointer",letterSpacing:.5,textTransform:"uppercase",display:"flex",alignItems:"center",gap:4}}>
                {isExpanded?"▲":"▸"} + What {agent.name.split(" ")[0]} Learned
              </button>
              {isExpanded && e.learnedSummary && (
                <div style={{marginTop:8,background:`${T.moss}08`,border:`1px solid ${T.moss}30`,padding:"10px 14px",fontSize:12,color:T.mutedDeep,lineHeight:1.6,fontFamily:body}}>
                  <AiBadge style={{marginBottom:5,display:"inline-block"}}/> {e.learnedSummary}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// FEATURE: PE-04 — Playbook tab
// ── Tab: Playbook ─────────────────────────────────────────────────────────────
function PlaybookTab({ agent }) {
  const firstName  = agent.name.split(" ")[0];
  const pronouns   = AGENT_PRONOUNS[agent.id] || { possessive:"their" };
  const canEdit    = agent.trainable;

  const formats = [
    { id:"f1", name:"Executive Briefing", isDefault:true, isSelectable:false, text:"Return a structured executive briefing with: 1. Executive Summary (3-4 sentences, board-ready tone) 2. Top Risk Findings (bulleted, dollar amounts cited) 3. Compliance Flags (cite statute where known) 4. Three Recommended Actions." },
    { id:"f2", name:"Audit Report Format", isDefault:false, isSelectable:true,  text:"Return a formal audit-style report with: 1. Objective 2. Scope 3. Findings (Condition, Criteria, Cause, Effect, Recommendation) 4. Risk Rating Summary 5. Management Response." },
  ];

  const guardrailText = canEdit
    ? `NEVER:\n- Name a vendor as fraudulent without documented evidence\n- Provide legal conclusions — flag concerns and recommend legal review\n- Extrapolate beyond the data payload\n- Reference competitive bid thresholds from other jurisdictions\n\nALWAYS:\n- Cite the specific class code when referencing commodity risk\n- Use dollar amounts from the data payload directly\n- Qualify recommendations with "subject to legal review"\n- Flag items as concerns, not violations`
    : `Contact ${agent.trainableBy} to configure guardrails.`;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Output formats */}
      <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"15px 18px",position:"relative"}}>
        <Corners/>
        <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:4}}>Layer 04 · Output Structure</div>
        <div style={{fontFamily:display,fontSize:16,fontWeight:600,color:T.navy,marginBottom:6}}>How does {firstName} format {pronouns.possessive} responses?</div>
        <div style={{fontFamily:body,fontSize:12,color:T.mutedDeep,lineHeight:1.5,marginBottom:13,padding:"9px 13px",background:T.cardAlt,borderLeft:`3px solid ${T.brassDeep}`}}>
          Final block sent to the LLM. Set one as <strong>Default</strong> for automatic use. Toggle <strong>User Selectable</strong> to let users choose in the analysis UI.
        </div>
        {formats.map(f=>(
          <div key={f.id} style={{border:`1px solid ${f.isDefault?T.moss:T.lineSoft}`,marginBottom:9,background:f.isDefault?"rgba(90,117,56,.04)":"transparent"}}>
            <div style={{padding:"8px 12px",display:"flex",alignItems:"center",gap:8,borderBottom:`1px solid ${f.isDefault?"rgba(90,117,56,.3)":T.lineSoft}`,flexWrap:"wrap"}}>
              <div style={{fontFamily:body,fontSize:12,fontWeight:600,color:f.isDefault?T.moss:T.ink,flex:1}}>{f.name}</div>
              {f.isDefault
                ?<span style={{fontFamily:mono,fontSize:8.5,padding:"1px 7px",background:"rgba(90,117,56,.15)",color:T.moss,border:`1px solid ${T.moss}`,fontWeight:700}}>● DEFAULT</span>
                :<button style={{fontFamily:mono,fontSize:8.5,color:T.brass,background:"transparent",border:`1px solid ${T.brass}`,padding:"1px 8px",cursor:canEdit?"pointer":"not-allowed",fontWeight:700,opacity:canEdit?1:0.5}}>Set Default</button>}
              <button style={{fontFamily:mono,fontSize:8.5,padding:"1px 8px",cursor:canEdit?"pointer":"not-allowed",border:`1px solid ${f.isSelectable?T.brass:T.lineSoft}`,background:f.isSelectable?"rgba(182,135,58,.15)":"transparent",color:f.isSelectable?T.brassDeep:T.muted,opacity:canEdit?1:0.5}}>
                {f.isSelectable?"◎ User Selectable":"○ Admin Only"}
              </button>
              <button style={{fontFamily:mono,fontSize:8.5,color:T.muted,background:"transparent",border:`1px solid ${T.lineSoft}`,padding:"1px 8px",cursor:canEdit?"pointer":"not-allowed",textTransform:"uppercase",letterSpacing:.5,opacity:canEdit?1:0.5}}>Edit</button>
              {!f.isDefault&&<button style={{fontFamily:mono,fontSize:8.5,color:T.flag,background:"transparent",border:`1px solid rgba(168,51,25,.3)`,padding:"1px 8px",cursor:canEdit?"pointer":"not-allowed",textTransform:"uppercase",letterSpacing:.5,opacity:canEdit?1:0.5}}>Delete</button>}
            </div>
            <div style={{padding:"9px 12px",fontFamily:mono,fontSize:10.5,color:T.mutedDeep,lineHeight:1.6,maxHeight:50,overflow:"hidden",maskImage:"linear-gradient(to bottom,black 50%,transparent 100%)"}}>{f.text}</div>
          </div>
        ))}
        {canEdit&&<button style={{width:"100%",padding:"9px",background:"transparent",border:`1px dashed ${T.lineSoft}`,color:T.brassDeep,fontFamily:body,fontSize:12,cursor:"pointer",marginTop:2,fontWeight:500}}>+ Add New Format</button>}
      </div>

      {/* Guardrails */}
      <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"15px 18px",position:"relative"}}>
        <div style={{position:"absolute",top:4,left:4,width:9,height:9,borderTop:`1.5px solid ${T.flag}`,borderLeft:`1.5px solid ${T.flag}`}}/>
        <div style={{position:"absolute",bottom:4,right:4,width:9,height:9,borderBottom:`1.5px solid ${T.flag}`,borderRight:`1.5px solid ${T.flag}`}}/>
        <div style={{fontFamily:mono,fontSize:9,color:T.flag,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:4}}>Layer 05 · Guardrails</div>
        <div style={{fontFamily:body,fontSize:12,color:T.mutedDeep,lineHeight:1.5,marginBottom:18,padding:"9px 13px",background:"rgba(168,51,25,.07)",borderLeft:`3px solid ${T.flag}`}}>
          Applied to every prompt regardless of which Role or Format is active. Protects against legal overreach and unsupported claims.
        </div>
        <div style={{fontFamily:mono,fontSize:10.5,color:T.mutedDeep,lineHeight:1.7,background:T.cardAlt,padding:"12px 16px",borderLeft:`3px solid ${T.flag}44`,whiteSpace:"pre-wrap"}}>{guardrailText}</div>
        {canEdit&&<button style={{marginTop:12,width:"100%",padding:"9px",background:"transparent",border:`1px dashed rgba(168,51,25,.3)`,color:T.flag,fontFamily:body,fontSize:12,cursor:"pointer",fontWeight:500}}>Edit Guardrails</button>}
      </div>
    </div>
  );
}

// FEATURE: PE-07 — Left-sidebar nav replaces horizontal tab bar
// ── Personnel Screen ──────────────────────────────────────────────────────────
export default function PersonnelScreen() {
  const { agentId } = useParams();
  const navigate    = useNavigate();
  const agents      = useAgents();
  const agent       = agents.find(a => a.id === agentId) || agents[0];
  const [activeTab, setActiveTab] = useState("profile");
  const [entries, setEntries]     = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, icon="✓") => {
    setToast({msg,icon});
    setTimeout(()=>setToast(null),3000);
  };

  // FEATURE: PE-03 — load live training entries from Supabase on mount
  useEffect(() => {
    setLoadingEntries(true);
    setEntries([]);
    apiGetEntries(agentId)
      .then(raw => setEntries(raw.map(e => ({
        id:            e.id,
        title:         e.title,
        category:      e.category,
        jurisdiction:  e.jurisdiction,
        priority:      e.priority,
        triggers:      e.triggers || [],
        status:        e.status,
        fieldNotes:    e.teaching_note || "",
        learnedSummary: e.content || "",
        createdAt:     e.created_at || "",
        isDemo:        false,
      }))))
      .catch(() => showToast("Could not load training entries", "⚠"))
      .finally(() => setLoadingEntries(false));
  }, [agentId]);

  const layers    = computeLayers(agent, entries);
  const readiness = Math.round(layers.reduce((s,l)=>s+l.s,0)/layers.length);

  // FEATURE: PE-07 — Left-sidebar nav replaces horizontal tab bar
  const NAV_GROUPS = [
    { id:"overview",  label:"OVERVIEW",  tabs:[{ id:"profile",  label:"Profile",  icon:"◈" }] },
    { id:"configure", label:"CONFIGURE", tabs:[
      { id:"resume",   label:"Resume",   icon:"▣" },
      { id:"training", label:"Training", icon:"◎" },
      { id:"playbook", label:"Playbook", icon:"⬟" },
    ]},
  ];

  // FEATURE: PE-09 — Breadcrumb uses NAV_GROUPS lookup
  const activeLabel = NAV_GROUPS.flatMap(g => g.tabs).find(t => t.id === activeTab)?.label || activeTab;

  return (
    <AppShell toast={toast} headerProps={{ backLabel:"The Bench", onBack:()=>navigate("/bench") }}>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* ── Left sidebar nav ── */}
        <div style={{ width:180, flexShrink:0, background:T.card, borderRight:`1px solid ${T.line}`, display:"flex", flexDirection:"column", overflowY:"auto" }}>

          {/* Agent identity strip */}
          <div style={{ padding:"16px 14px 14px", borderBottom:`1px solid ${T.lineSoft}` }}>
            <div style={{ width:44, height:44, borderRadius:"50%", border:`2px solid ${agent.color}`, background:T.paperDeep, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:display, fontSize:18, fontWeight:700, color:agent.color, marginBottom:8 }}>
              {agent.name[0]}
            </div>
            <div style={{ fontFamily:display, fontSize:13, fontWeight:600, color:T.navy, lineHeight:1.2 }}>{agent.name}</div>
            <div style={{ fontFamily:mono, fontSize:8, color:T.muted, marginTop:2 }}>{agent.code}</div>
          </div>

          {/* Nav groups */}
          {NAV_GROUPS.map(g => (
            <div key={g.id} style={{ paddingTop:16 }}>
              <div style={{ fontFamily:mono, fontSize:8, color:T.muted, textTransform:"uppercase", letterSpacing:1.6, fontWeight:700, padding:"0 14px 6px" }}>
                {g.label}
              </div>
              {g.tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  width:"100%", textAlign:"left", padding:"8px 14px",
                  fontFamily:body, fontSize:12,
                  fontWeight: activeTab === t.id ? 600 : 400,
                  color: activeTab === t.id ? T.navy : T.mutedDeep,
                  background: activeTab === t.id ? `${T.brass}14` : "transparent",
                  border:"none",
                  borderLeft: activeTab === t.id ? `2px solid ${T.brass}` : "2px solid transparent",
                  cursor:"pointer", display:"flex", alignItems:"center", gap:8,
                }}>
                  <span style={{ fontFamily:mono, fontSize:10, color: activeTab === t.id ? T.brassDeep : T.muted }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* ── Right content area ── */}
        <div style={{ display:"flex", flex:1, overflow:"hidden", flexDirection:"column" }}>

          {/* Page header */}
          <div style={{background:T.cardAlt,padding:"16px 24px 14px",borderBottom:`2px solid ${T.brass}`,flexShrink:0}}>
            {/* Breadcrumb — FEATURE: PE-09 */}
            <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.8,fontWeight:600,marginBottom:4}}>
              Personnel File · {agent.code} · {agent.trainableBy} Bench · {activeLabel}
            </div>
            {/* Title row */}
            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
              <div>
                <div style={{fontFamily:display,fontSize:26,fontWeight:500,color:T.navy,letterSpacing:"-.5px",lineHeight:1,marginBottom:4}}>
                  The personnel file of {agent.name}.
                </div>
                <div style={{fontFamily:body,fontStyle:"italic",fontSize:13,color:T.mutedDeep}}>
                  Tenure · {agent.hiredOn} · {skillLabel(agent.skill)}-level agent
                </div>
              </div>
              {/* Stat badges */}
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:1}}>Situational Awareness</div>
                  <div style={{fontFamily:display,fontSize:18,fontWeight:700,color:agent.situational>=30?T.brass:T.muted,lineHeight:1}}>{agent.situational}%</div>
                </div>
                <div style={{width:1,height:30,background:T.lineSoft}}/>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:1}}>Readiness</div>
                  <div style={{fontFamily:display,fontSize:18,fontWeight:700,color:readinessColor(readiness),lineHeight:1}}>
                    {readiness}<span style={{fontFamily:mono,fontSize:9,color:T.muted,fontWeight:400}}>/100</span>
                  </div>
                </div>
                <div style={{width:1,height:30,background:T.lineSoft}}/>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:1}}>Skill</div>
                  <div style={{fontFamily:display,fontSize:18,fontWeight:700,color:T.brassDeep,lineHeight:1}}>
                    {agent.skill}<span style={{fontFamily:mono,fontSize:9,color:T.muted,fontWeight:400}}>/100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab content */}
          <div style={{ flex:1, overflowY:"auto", padding:"20px 24px 64px", background:T.paperDeep }}>
            {/* FEATURE: PE-08 */}
            {activeTab === "profile"  && <ProfileTab agent={agent} entries={entries} layers={layers}/>}
            {activeTab === "resume"   && <ResumeTab agent={agent} showToast={showToast}/>}
            {/* FEATURE: PE-03 */}
            {activeTab === "training" && (
              <TrainingTab
                agent={agent}
                entries={entries}
                setEntries={setEntries}
                loadingEntries={loadingEntries}
                showToast={showToast}
                navigate={navigate}
              />
            )}
            {activeTab === "playbook" && <PlaybookTab agent={agent}/>}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
