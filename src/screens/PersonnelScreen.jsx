// DeepBench v5.1.34 | PersonnelScreen.jsx | AiBadge label corrections + Playbook badge

import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { T, display, body, mono, fmt$, skillLabel } from "../tokens.js";
import { TENANT_ID } from "../config.js";
import { AppShell } from "../AppShell.jsx";
import { Corners, SkillBar, Toast, AiBadge, FeatureBadge, AgentAvatar } from "../components/SharedUI.jsx";
import { useAgents } from "../hooks/useAgents.js";
import { AGENT_PRONOUNS, STANDARD_CATEGORIES, BRENT_CATEGORIES, FLAG_TRIGGERS, JURISDICTIONS } from "../data/agents.js";
import { readinessColor, readinessLabel, priorityInfo } from "../utils.js";
import ResumeTab, { ConfigCard, AddConfigForm } from "./personnel/ResumeTab.jsx";
import { logAICall } from "../hooks/useAIActivity.js";

// FEATURE: PE-03 — Training tab live wiring
async function apiGetEntries(agent_id) {
  const res = await fetch(`/api/load-entries?tenant_id=${TENANT_ID}&agent_id=${encodeURIComponent(agent_id)}`);
  if (!res.ok) throw new Error("Failed to load entries");
  return (await res.json()).entries || [];
}
async function apiPatchEntry(id, status) {
  const res = await fetch("/api/load-entries", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, tenant_id: TENANT_ID, status }),
  });
  if (!res.ok) throw new Error("Failed to update");
}
async function apiDeleteEntry(id) {
  const res = await fetch("/api/load-entries", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, tenant_id: TENANT_ID }),
  });
  if (!res.ok) throw new Error("Failed to delete");
}

// FEATURE: PE-11 — Edit Course inline sub-view
async function apiUpdateEntry(id, fields) {
  const res = await fetch("/api/load-entries", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, tenant_id: TENANT_ID, ...fields }),
  });
  if (!res.ok) throw new Error("Failed to update entry");
  return (await res.json()).entry;
}

// FEATURE: PE-04 — agent-configs API helpers
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

// FEATURE: PE-10 — Add Courses inline sub-view
function str(v) { return typeof v === "string" ? v : ""; }

// FEATURE: PE-10 patch 2 — readAsArrayBuffer → Uint8Array → btoa (binary-safe, no readAsDataURL)
async function extractTextFromFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const bytes = new Uint8Array(e.target.result);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileData: base64, fileType: file.type, fileName: file.name }),
        });
        const data = await res.json();
        if (!res.ok) { resolve({ text: "", wordCount: 0, error: data.error || "Extraction failed" }); return; }
        resolve({ text: data.text, wordCount: data.wordCount, error: null });
      } catch (err) {
        resolve({ text: "", wordCount: 0, error: err.message });
      }
    };
    reader.onerror = () => resolve({ text: "", wordCount: 0, error: "File read failed" });
    reader.readAsArrayBuffer(file);
  });
}

async function generateMetadata(filename, extractedText, agentId) {
  try {
    const snippet = extractedText.slice(0, 3000);
    const prompt = `You are a procurement knowledge management system. Analyze this document and return ONLY a JSON object with these fields:
{"title":"short descriptive title","category":"one of: Compliance,Jurisdiction,Best Practice,Internal,Standards,Methodology,Playbook,Template,Statute,Portal Navigation,Data Schema,Export Method,Auth Pattern,State Portal,Open Records,Research Method,Data Dictionary","jurisdiction":"one of: All,Federal,Texas,California,Florida,New York,Illinois","priority":50,"triggers":["array","of","flag","ids","from","maverick,po-split,spike,single-source,vendor-hhi,long-tail"]}

Document filename: ${filename}
Document text: ${snippet}

Return ONLY the JSON. No explanation.`;
    const res = await fetch("/api/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        agent_id: agentId,
        tenant_id: TENANT_ID,
        skipRag: true,
      }),
    });
    const data = await res.json();
    const raw = data.content?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    // FEATURE: AI-18 — susan owns document extraction capability
    logAICall({ type: "extraction", model: "claude-haiku-4-5", location: "Training tab — Add Courses", agentId: "susan" });
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
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
          <div style={{margin:"0 auto 12px",display:"flex",justifyContent:"center"}}>
            <AgentAvatar who={agent.id} size={92} ring={true} />
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
              <AgentAvatar who={agent.id} size={36} ring={true} />
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

// FEATURE: PE-10 — Add Courses inline sub-view
function AddCourseView({ agent, existingEntry = null, addState, setAddState, addProgress, setAddProgress,
  addFile, setAddFile, addExtracted, setAddExtracted, addWordCount, setAddWordCount,
  addExtractOpen, setAddExtractOpen, addForm, setAddForm, addFileRef,
  onCancel, onSaved, showToast }) {

  const agentId  = agent.id;
  const locked   = existingEntry ? false : addState !== "ready";
  const isSaving = addState === "saving";
  const categories = agentId === "brent"
    ? [...STANDARD_CATEGORIES, ...BRENT_CATEGORIES]
    : STANDARD_CATEGORIES;

  const handleFile = async (file) => {
    if (!file) return;
    setAddState("uploading"); setAddProgress(0); setAddFile(file);
    let prog = 0;
    const ticker = setInterval(() => {
      prog += Math.random() * 18 + 8;
      if (prog >= 90) { clearInterval(ticker); prog = 90; }
      setAddProgress(Math.min(90, prog));
    }, 180);
    const result = await extractTextFromFile(file);
    clearInterval(ticker); setAddProgress(100);
    if (result.error || !result.text) {
      setAddState("idle");
      showToast(result.error || "Could not extract text", "⚠");
      return;
    }
    setAddExtracted(result.text); setAddWordCount(result.wordCount);
    await new Promise(r => setTimeout(r, 400));
    setAddState("ready");
    showToast("✨ Claude is analyzing your document…", "✨");
    const meta = await generateMetadata(file.name, result.text, agentId);
    if (meta) {
      setAddForm(f => ({
        ...f,
        title:        str(meta.title)        || f.title,
        category:     str(meta.category)     || f.category,
        jurisdiction: str(meta.jurisdiction) || f.jurisdiction,
        priority:     typeof meta.priority === "number" ? Math.min(100, Math.max(0, meta.priority)) : f.priority,
        triggers:     Array.isArray(meta.triggers) ? meta.triggers : f.triggers,
      }));
      showToast("Metadata generated — review before saving");
    } else {
      showToast("Could not auto-generate metadata — fill in manually", "⚠");
    }
  };

  const toggleTrigger = (id) => {
    if (id === "all") {
      setAddForm(f => ({ ...f, triggers: f.triggers.includes("all") ? [] : ["all"] }));
      return;
    }
    setAddForm(f => {
      const base = f.triggers.filter(t => t !== "all");
      return { ...f, triggers: base.includes(id) ? base.filter(t => t !== id) : [...base, id] };
    });
  };

  const handleSave = async () => {
    if (!addForm.title) { showToast("Title is required", "⚠"); return; }
    if (!existingEntry && !addExtracted) { showToast("Title and document are required", "⚠"); return; }
    setAddState("saving");
    try {
      if (existingEntry) {
        // FEATURE: PE-11 — Edit mode: PATCH metadata only, no re-vectorization
        await apiUpdateEntry(existingEntry.id, {
          title:          addForm.title,
          category:       addForm.category,
          jurisdiction:   addForm.jurisdiction,
          teaching_note:  addForm.teaching_note || null,
          triggers:       addForm.triggers,
          priority:       addForm.priority,
        });
        const mergedEntry = {
          ...existingEntry,
          title:         addForm.title,
          category:      addForm.category,
          jurisdiction:  addForm.jurisdiction,
          fieldNotes:    addForm.teaching_note || "",
          triggers:      addForm.triggers,
          priority:      addForm.priority,
        };
        onSaved(mergedEntry);
      } else {
        // Existing add flow — unchanged
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...addForm,
            content: addExtracted,
            tenant_id: TENANT_ID,
            agent_id: agentId,
            teaching_note: addForm.teaching_note || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.error || "Save failed", "⚠"); setAddState("ready"); return; }
        // FEATURE: AI-18 — fix type key (was "knowledge-reinforcement", must be "reinforcement"); susan owns this capability
        logAICall({ type: "reinforcement", model: "text-embedding-3-small", location: "Training tab — Add Courses ingest", agentId: "susan" });
        const newEntry = {
          id:            Date.now(),
          title:         addForm.title,
          category:      addForm.category,
          jurisdiction:  addForm.jurisdiction,
          priority:      addForm.priority,
          triggers:      addForm.triggers,
          status:        addForm.status,
          fieldNotes:    addForm.teaching_note || "",
          learnedSummary: "",
          createdAt:     new Date().toISOString(),
          isDemo:        false,
          chunks:        0,
        };
        onSaved(newEntry);
      }
    } catch (err) {
      showToast("Network error: " + err.message, "⚠");
      setAddState("ready");
    }
  };

  const pInfo = priorityInfo(addForm.priority);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 18, alignItems: "start", marginBottom: 20 }}>
      {/* FEATURE: PE-10 — Add Courses inline sub-view */}
      <FeatureBadge id="PE-10" />
      {/* FEATURE: PE-11 — Edit Course inline sub-view */}
      <FeatureBadge id="PE-11" />

      {/* ── Left: Exhibit A + Exhibit B ── */}
      <div>

        {/* Exhibit A */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "16px 18px", marginBottom: 14, position: "relative" }}>
          <Corners />
          <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 12 }}>
            Exhibit A · Course Material
          </div>

          {existingEntry && (
            <div style={{ border: `1px solid ${T.moss}50`, padding: "12px 14px", background: `${T.moss}05`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 52, background: T.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: T.card, fontWeight: 700 }}>DOC</div>
                <div style={{ fontFamily: mono, fontSize: 8, color: `${T.card}80`, marginTop: 2 }}>on file</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: display, fontSize: 14, fontWeight: 600, color: T.navy }}>Previously indexed document</div>
                <div style={{ fontFamily: body, fontSize: 11.5, color: T.moss, marginTop: 2 }}>✓ Vectorized and indexed in RAG</div>
              </div>
            </div>
          )}
          {!existingEntry && addState === "idle" && (
            <div
              onClick={() => addFileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              style={{ border: `2px dashed ${T.brass}55`, padding: "32px", textAlign: "center", cursor: "pointer", background: T.cardAlt, transition: "all .2s" }}
              onMouseEnter={e => e.currentTarget.style.background = `rgba(182,135,58,0.08)`}
              onMouseLeave={e => e.currentTarget.style.background = T.cardAlt}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <div style={{ fontFamily: display, fontSize: 15, fontWeight: 600, color: T.navy, marginBottom: 4 }}>Drop a document here</div>
              <div style={{ fontFamily: body, fontSize: 12, color: T.muted, marginBottom: 14 }}>PDF, DOCX, TXT · Max 20MB</div>
              {/* FEATURE: PE-10 */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: T.brass, color: T.navy, padding: "8px 20px", fontFamily: body, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                ↑ Browse File
              </div>
              <input ref={addFileRef} type="file" accept=".pdf,.txt,.docx" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            </div>
          )}

          {!existingEntry && addState === "uploading" && (
            <div style={{ border: `1px solid ${T.brass}40`, padding: "24px", textAlign: "center", background: T.cardAlt }}>
              <div style={{ fontFamily: display, fontSize: 15, fontWeight: 600, color: T.navy, marginBottom: 12 }}>Extracting document text…</div>
              <div style={{ fontFamily: mono, fontSize: 11, color: T.muted, marginBottom: 10 }}>{addFile?.name}</div>
              <div style={{ background: T.paperDeep, height: 4, width: "100%", maxWidth: 320, margin: "0 auto 8px", overflow: "hidden" }}>
                <div style={{ height: "100%", background: T.brass, width: `${addProgress}%`, transition: "width .2s" }} />
              </div>
              <div style={{ fontFamily: mono, fontSize: 11, color: T.brassDeep }}>{Math.round(addProgress)}% complete</div>
            </div>
          )}

          {!existingEntry && (addState === "ready" || addState === "saving") && (
            <div style={{ border: `1px solid ${T.moss}50`, padding: "12px 14px", background: `${T.moss}05`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 52, background: T.flag, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: T.card, fontWeight: 700 }}>DOC</div>
                <div style={{ fontFamily: mono, fontSize: 8, color: `${T.card}80`, marginTop: 2 }}>{addFile ? `${(addFile.size / 1e6).toFixed(1)}MB` : ""}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: display, fontSize: 14, fontWeight: 600, color: T.navy }}>{addFile?.name}</div>
                <div style={{ fontFamily: body, fontSize: 11.5, color: T.moss, marginTop: 2 }}>✓ {addWordCount.toLocaleString()} words extracted</div>
              </div>
              <button
                onClick={() => { setAddState("idle"); setAddFile(null); setAddExtracted(""); setAddWordCount(0); }}
                style={{ fontFamily: body, fontSize: 11.5, color: T.mutedDeep, background: "transparent", border: `1px solid ${T.line}`, padding: "5px 12px", cursor: "pointer" }}
              >✎ Replace</button>
            </div>
          )}
        </div>

        {/* Exhibit B */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "16px 18px", position: "relative", opacity: locked ? .38 : 1, pointerEvents: locked ? "none" : "auto", transition: "opacity .3s" }}>
          <Corners />
          <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 16 }}>
            Exhibit B · How {agent.name.split(" ")[0]} Should Weight This
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              Document Title
              {!locked && <span style={{ fontFamily: mono, fontSize: 8, background: "rgba(155,110,243,0.12)", border: "1px solid rgba(155,110,243,0.3)", padding: "1px 5px", color: "#9b6ef3" }}>AI SUGGESTED</span>}
            </label>
            <input
              value={addForm.title}
              onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Document title…"
              style={{ width: "100%", padding: "9px 12px", fontFamily: body, fontSize: 13, color: T.ink, background: T.cardAlt, border: `1px solid ${addForm.title ? T.brass : T.line}`, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {[{ key: "category", label: "Category", options: categories }, { key: "jurisdiction", label: "Jurisdiction", options: JURISDICTIONS }].map(({ key, label, options }) => (
              <div key={key}>
                <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  {label}
                  {!locked && <span style={{ fontFamily: mono, fontSize: 8, background: "rgba(155,110,243,0.12)", border: "1px solid rgba(155,110,243,0.3)", padding: "1px 5px", color: "#9b6ef3" }}>AI</span>}
                </label>
                <select
                  value={addForm[key]}
                  onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", fontFamily: body, fontSize: 13, color: T.ink, background: T.cardAlt, border: `1px solid ${T.line}`, outline: "none", cursor: "pointer" }}
                >
                  {options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600 }}>Priority Weight</label>
              <span style={{ fontFamily: mono, fontSize: 12, color: pInfo.color, fontWeight: 700 }}>{pInfo.label} · {addForm.priority}/100</span>
            </div>
            <input type="range" min={0} max={100} value={addForm.priority} onChange={e => setAddForm(f => ({ ...f, priority: +e.target.value }))} style={{ width: "100%", accentColor: T.brass, marginBottom: 4 }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 9, color: T.muted }}>
              <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              Flag Triggers
              {!locked && <span style={{ fontFamily: mono, fontSize: 8, background: "rgba(155,110,243,0.12)", border: "1px solid rgba(155,110,243,0.3)", padding: "1px 5px", color: "#9b6ef3" }}>AI</span>}
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
              {FLAG_TRIGGERS.map(f => {
                const on = addForm.triggers.includes("all") || addForm.triggers.includes(f.id);
                return (
                  <button key={f.id} onClick={() => toggleTrigger(f.id)}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: on ? `${T.flag}10` : "transparent", border: `1px solid ${on ? T.flag : T.line}`, cursor: "pointer", fontFamily: mono, fontSize: 10.5, color: on ? T.flag : T.muted, textAlign: "left", transition: "all .15s" }}>
                    <span style={{ width: 12, height: 12, border: `1.5px solid ${on ? T.flag : T.line}`, background: on ? T.flag : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: T.card, flexShrink: 0 }}>{on ? "✓" : ""}</span>
                    ⚑ {f.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => toggleTrigger("all")}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: addForm.triggers.includes("all") ? `${T.flag}08` : "transparent", border: `1px dashed ${addForm.triggers.includes("all") ? T.flag : T.line}`, cursor: "pointer", fontFamily: mono, fontSize: 10.5, color: addForm.triggers.includes("all") ? T.flag : T.muted, transition: "all .15s" }}>
              <span style={{ width: 12, height: 12, border: `1.5px solid ${addForm.triggers.includes("all") ? T.flag : T.line}`, background: addForm.triggers.includes("all") ? T.flag : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: T.card, flexShrink: 0 }}>{addForm.triggers.includes("all") ? "✓" : ""}</span>
              ⚑ All Flags — always retrieve for every briefing
            </button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600, marginBottom: 6, display: "block" }}>
              Teaching Note for {agent.name.split(" ")[0]}
            </label>
            <textarea
              value={addForm.teaching_note}
              onChange={e => setAddForm(f => ({ ...f, teaching_note: e.target.value }))}
              placeholder={`Optional. Shapes how ${agent.name.split(" ")[0]} phrases findings that cite this document…`}
              style={{ width: "100%", padding: "9px 12px", fontFamily: body, fontSize: 12.5, color: T.ink, background: T.cardAlt, border: `1px solid ${T.line}`, outline: "none", resize: "vertical", minHeight: 70, lineHeight: 1.5, fontStyle: "italic", boxSizing: "border-box" }}
            />
          </div>

          {(addState === "ready" || addState === "saving") && (
            <div style={{ marginBottom: 14 }}>
              <button onClick={() => setAddExtractOpen(o => !o)}
                style={{ width: "100%", padding: "9px 12px", background: T.cardAlt, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: mono, fontSize: 10, color: T.muted, letterSpacing: .5 }}>
                <span>▾ View extracted document text</span>
                <span style={{ fontFamily: mono, fontSize: 9, color: T.flag }}>READ ONLY · {addWordCount.toLocaleString()} words</span>
              </button>
              {addExtractOpen && (
                <div style={{ background: T.navyDeep, border: `1px solid rgba(255,255,255,.1)`, borderTop: "none", padding: "12px 14px", fontFamily: mono, fontSize: 11, color: "#8fa3bf", lineHeight: 1.7, maxHeight: 180, overflowY: "auto", whiteSpace: "pre-wrap", userSelect: "none" }}>
                  {addExtracted.split(/\s+/).slice(0, 300).join(" ")}{"\n\n[Read-only · Stored in Supabase]"}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.lineSoft}` }}>
            <button onClick={onCancel} style={{ background: "transparent", border: `1px solid ${T.line}`, color: T.mutedDeep, padding: "9px 20px", fontFamily: body, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            <button
              onClick={handleSave}
              disabled={!addForm.title || isSaving || locked}
              style={{ background: !addForm.title || locked ? T.line : `linear-gradient(135deg,${T.brass},${T.brassDeep})`, border: "none", color: !addForm.title || locked ? T.muted : T.navy, padding: "10px 24px", fontFamily: display, fontSize: 14, fontWeight: 700, cursor: !addForm.title || locked ? "not-allowed" : "pointer", opacity: isSaving ? .7 : 1, display: "flex", alignItems: "center", gap: 8 }}
            >
              {/* FEATURE: PE-10 */}
              {isSaving
                ? "⏳ Saving…"
                : existingEntry
                  ? "▸ Save Course Detail"
                  : <><AiBadge style={{ color: T.navy, background: "rgba(18,36,60,0.12)", border: "1px solid rgba(18,36,60,0.2)" }} label="RAG & Routing Training"/> ▸ Teach {agent.name.split(" ")[0]} this document</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: Projected Impact + What Changes + Onboarding Checklist ── */}
      <div>
        <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "16px 18px", marginBottom: 14, position: "relative" }}>
          <Corners />
          <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 14 }}>Projected Impact</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", marginBottom: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Before</div>
              <div style={{ fontFamily: display, fontSize: 40, fontWeight: 700, color: T.mutedDeep, lineHeight: 1 }}>{agent.skill}</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>{skillLabel(agent.skill)}</div>
            </div>
            <div style={{ fontFamily: display, fontSize: 22, color: T.brassDeep }}>→</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>After</div>
              <div style={{ fontFamily: display, fontSize: 40, fontWeight: 700, color: T.moss, lineHeight: 1 }}>{Math.min(100, agent.skill + 3)}</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: T.moss, fontWeight: 600 }}>▸ {skillLabel(Math.min(100, agent.skill + 3))}</div>
            </div>
          </div>
          <div style={{ fontFamily: body, fontSize: 11.5, color: T.mutedDeep, lineHeight: 1.5, fontStyle: "italic", padding: "8px 10px", background: `${T.moss}08`, border: `1px solid ${T.moss}30` }}>Mock projected impact. Live skill computation in v5.</div>
        </div>

        {/* FEATURE: PE-10 */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "14px 16px", marginBottom: 14, position: "relative" }}>
          <Corners />
          <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 10 }}>What Changes</div>
          {[
            ["Documents",         agent.docs,            agent.docs + 1,              true],
            ["Class hours",       agent.classes,         agent.classes + 1,           false],
            ["Chunks in RAG",     agent.chunks,          `${agent.chunks}+ new`,      true],
            ["Tokens indexed",    "—",                   "+ new chunks",              true],
            ["Flag coverage",     "—",                   "—",                         false],
            ["Training invested", `$${agent.classes * 1000}`, `$${(agent.classes + 1) * 1000}`, false],
          ].map(([k, before, after, live]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.lineSoft}`, fontSize: 12, alignItems: "baseline" }}>
              <span style={{ color: T.mutedDeep, display: "flex", alignItems: "center", gap: 5 }}>
                {k}
                {live && <span style={{ fontFamily: mono, fontSize: 8, color: T.moss, border: `1px solid ${T.moss}40`, padding: "0 4px", letterSpacing: .5 }}>LIVE</span>}
              </span>
              <div style={{ fontFamily: mono, fontSize: 11, display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ color: T.muted }}>{before} →</span>
                <span style={{ color: T.navy, fontWeight: 700 }}>{after}</span>
              </div>
            </div>
          ))}
        </div>

        {/* FEATURE: PE-10 */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "14px 16px", position: "relative" }}>
          <Corners />
          <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 10 }}>Onboarding Checklist</div>
          {[
            ["File uploaded & extracted",  addState === "ready" || addState === "saving", "just now"],
            ["Priority & flags assigned",  addState === "ready" || addState === "saving", "just now"],
            ["Chunked into passages",      false, "starting…"],
            ["Indexed into RAG",           false, "queued"],
            ["Quality check",              false, "scheduled"],
            ["Available in next briefing", false, "after index"],
          ].map(([label, done, status]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${T.lineSoft}` }}>
              <div style={{ width: 14, height: 14, border: `1.5px solid ${done ? T.moss : T.line}`, background: done ? T.moss : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {done && <span style={{ color: T.card, fontSize: 9, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ flex: 1, fontFamily: body, fontSize: 12, color: done ? T.ink : T.muted }}>{label}</span>
              <span style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// FEATURE: PE-03 — Training tab live wiring
// ── Tab: Training ─────────────────────────────────────────────────────────────
function TrainingTab({ agent, entries, setEntries, loadingEntries, showToast, navigate }) {
  const [expandedIds, setExpandedIds] = useState({});
  const toggleEntry = (id) => setExpandedIds(p=>({...p,[id]:!p[id]}));
  const pronouns = AGENT_PRONOUNS[agent.id] || { subject:"they" };

  // FEATURE: PE-10 — Add Courses inline sub-view state
  const [showAddView,    setShowAddView]    = useState(false);
  const [addState,       setAddState]       = useState("idle");
  const [addProgress,    setAddProgress]    = useState(0);
  const [addFile,        setAddFile]        = useState(null);
  const [addExtracted,   setAddExtracted]   = useState("");
  const [addWordCount,   setAddWordCount]   = useState(0);
  const [addExtractOpen, setAddExtractOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    title: "", category: "Standards", jurisdiction: "All",
    priority: 50, triggers: [], status: "active", teaching_note: "",
  });
  const addFileRef = useRef(null);

  // FEATURE: PE-11 — Edit Course inline sub-view state
  const [editingEntry, setEditingEntry] = useState(null);

  const handleEditClick = (entry) => {
    setEditingEntry(entry);
    setAddState("ready");
    setAddForm({
      title:        str(entry.title),
      category:     str(entry.category) || "Standards",
      jurisdiction: str(entry.jurisdiction) || "All",
      priority:     typeof entry.priority === "number" ? entry.priority : 50,
      triggers:     Array.isArray(entry.triggers) ? entry.triggers : [],
      status:       entry.status || "active",
      teaching_note: str(entry.fieldNotes),
    });
    setAddFile(null);
    setAddExtracted("");
    setAddWordCount(0);
    setAddExtractOpen(false);
  };

  const resetAddView = () => {
    setShowAddView(false);
    setEditingEntry(null);
    setAddState("idle");
    setAddProgress(0);
    setAddFile(null);
    setAddExtracted("");
    setAddWordCount(0);
    setAddExtractOpen(false);
    setAddForm({ title: "", category: "Standards", jurisdiction: "All", priority: 50, triggers: [], status: "active", teaching_note: "" });
  };

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
        {/* Stats strip button — context-aware: Add / Cancel Add / Cancel Edit */}
        {/* FEATURE: PE-03 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => {
              if (showAddView || editingEntry) resetAddView();
              else setShowAddView(true);
            }}
            style={{
              background: (showAddView || editingEntry) ? "transparent" : T.brass,
              border: `1px solid ${T.brass}`,
              color: (showAddView || editingEntry) ? T.brassLight : T.navy,
              padding: "6px 14px",
              fontFamily: body,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: .3,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {!(showAddView || editingEntry) && (
              <AiBadge style={{ color: T.navy, background: "rgba(18,36,60,0.12)", border: "1px solid rgba(18,36,60,0.2)" }} label="RAG & Routing Training"/>
            )}
            {(showAddView || editingEntry) ? "✕ Cancel" : "+ Add Courses"}
          </button>
        </div>
      </div>

      {/* FEATURE: PE-10/PE-11 — Inline add-course / edit-course sub-view */}
      {(showAddView || editingEntry) && (
        <AddCourseView
          agent={agent}
          existingEntry={editingEntry}
          addState={addState}
          setAddState={setAddState}
          addProgress={addProgress}
          setAddProgress={setAddProgress}
          addFile={addFile}
          setAddFile={setAddFile}
          addExtracted={addExtracted}
          setAddExtracted={setAddExtracted}
          addWordCount={addWordCount}
          setAddWordCount={setAddWordCount}
          addExtractOpen={addExtractOpen}
          setAddExtractOpen={setAddExtractOpen}
          addForm={addForm}
          setAddForm={setAddForm}
          addFileRef={addFileRef}
          onCancel={resetAddView}
          onSaved={(savedEntry) => {
            if (editingEntry) {
              // FEATURE: PE-11 — update entry in list
              setEntries(prev => prev.map(e => e.id === savedEntry.id ? savedEntry : e));
              showToast("Updated ✦");
            } else {
              setEntries(prev => [savedEntry, ...prev]);
              showToast("Document indexed ✦");
            }
            resetAddView();
          }}
          showToast={showToast}
        />
      )}

      {!showAddView && !editingEntry && (<>

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
                {/* FEATURE: PE-11 — EDIT + DELETE: trainable agents, active entries only (NIGP parity) */}
                {agent.trainable && e.status === "active" && (
                  <>
                    <button
                      onClick={() => handleEditClick(e)}
                      style={{
                        fontFamily: mono, fontSize: 9, color: T.muted,
                        background: "transparent", border: `1px solid ${T.lineSoft}`,
                        padding: "2px 7px", cursor: "pointer", letterSpacing: .5, textTransform: "uppercase",
                      }}
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => deleteEntry(e.id)}
                      style={{
                        fontFamily: mono, fontSize: 9, color: T.flag,
                        background: "transparent", border: `1px solid ${T.flag}40`,
                        padding: "2px 7px", cursor: "pointer", letterSpacing: .5, textTransform: "uppercase",
                      }}
                    >
                      DELETE
                    </button>
                  </>
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
                  <AiBadge style={{marginBottom:5,display:"inline-block"}} label="Learned Knowledge"/> {e.learnedSummary}
                </div>
              )}
            </div>
          </div>
        );
      })}
      </>)}
    </div>
  );
}

// FEATURE: PE-04 — Playbook tab live wiring
// ── Tab: Playbook ─────────────────────────────────────────────────────────────
function PlaybookTab({ agent, showToast }) {
  const firstName = agent.name.split(" ")[0];
  const pronouns  = AGENT_PRONOUNS[agent.id] || { possessive: "their" };
  const canEdit   = agent.trainable;

  const [formatConfigs, setFormatConfigs] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [editingId,     setEditingId]     = useState(null);
  const [showAdd,       setShowAdd]       = useState(false);
  const [alwaysText,    setAlwaysText]    = useState("");
  const [alwaysId,      setAlwaysId]      = useState(null);
  const [neverText,     setNeverText]     = useState("");
  const [neverId,       setNeverId]       = useState(null);

  useEffect(() => {
    Promise.all([
      apiGetConfigs(agent.id, "output_format"),
      apiGetConfigs(agent.id, "guardrail"),
    ]).then(([formats, guardrails]) => {
      setFormatConfigs(formats);
      const always = guardrails.find(r => r.name === "always");
      const never  = guardrails.find(r => r.name === "never");
      if (always) { setAlwaysText(always.text); setAlwaysId(always.id); }
      if (never)  { setNeverText(never.text);   setNeverId(never.id); }
    }).catch(() => showToast("Could not load playbook configs", "⚠"))
      .finally(() => setLoading(false));
  }, [agent.id]);

  const handleSetDefault = async (id) => {
    try {
      await apiPatchConfig(id, { is_default: true });
      const fresh = await apiGetConfigs(agent.id, "output_format");
      setFormatConfigs(fresh);
      showToast("Default updated ✦");
    } catch { showToast("Failed", "⚠"); }
  };

  const handleToggleSelectable = async (id, val) => {
    try {
      await apiPatchConfig(id, { is_user_selectable: val });
      setFormatConfigs(prev => prev.map(c => c.id === id ? { ...c, is_user_selectable: val } : c));
      showToast(val ? "Now user-selectable ✦" : "Set to admin-only ✦");
    } catch { showToast("Update failed", "⚠"); }
  };

  const handleEdit = (updated) => setFormatConfigs(prev => prev.map(c => c.id === updated.id ? updated : c));

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this output format permanently?")) return;
    try {
      await apiDeleteConfig(id);
      setFormatConfigs(prev => prev.filter(c => c.id !== id));
      showToast("Deleted ✦");
    } catch { showToast("Delete failed", "⚠"); }
  };

  const handleFormatAdded = (config) => {
    setFormatConfigs(prev => {
      const updated = config.is_default ? prev.map(c => ({ ...c, is_default: false })) : prev;
      return [config, ...updated];
    });
    setShowAdd(false);
  };

  const saveGuardrail = async (name, text, id, setId) => {
    try {
      if (id) {
        await apiPatchConfig(id, { text });
      } else {
        const created = await apiSaveConfig({ agent_id: agent.id, type: "guardrail", name, text, is_default: false, is_user_selectable: false });
        setId(created.id);
      }
      showToast("Saved ✦");
    } catch { showToast("Save failed", "⚠"); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FeatureBadge id="PE-04" />

      {/* Output formats */}
      <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "15px 18px", position: "relative" }}>
        <Corners />
        <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 4 }}>Layer 04 · Output Structure</div>
        <div style={{ fontFamily: display, fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 6 }}>How does {firstName} format {pronouns.possessive} responses?</div>
        <div style={{ fontFamily: body, fontSize: 12, color: T.mutedDeep, lineHeight: 1.5, marginBottom: 13, padding: "9px 13px", background: T.cardAlt, borderLeft: `3px solid ${T.brassDeep}` }}>
          Final block sent to the LLM. Set one as <strong>Default</strong> for automatic use. Toggle <strong>User Selectable</strong> to let users choose in the analysis UI.
        </div>
        {loading && <div style={{ fontFamily: body, fontSize: 12, color: T.muted, fontStyle: "italic", padding: "20px 0", textAlign: "center" }}>Loading…</div>}
        {!loading && formatConfigs.map(config => (
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
        {/* FEATURE: AI-01-patch — AiBadge on Playbook Add New Format */}
        {!loading && canEdit && !showAdd && (          <button onClick={() => setShowAdd(true)} style={{ width: "100%", padding: "9px", background: "transparent", border: `1px dashed ${T.lineSoft}`, color: T.brassDeep, fontFamily: body, fontSize: 12, cursor: "pointer", marginTop: 2, fontWeight: 500 , display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>+ Add New Format <AiBadge label="Prompt Build"/></button>
        )}
        {showAdd && (
          <AddConfigForm type="output_format" agentId={agent.id} onSaved={handleFormatAdded} onCancel={() => setShowAdd(false)} showToast={showToast} />
        )}
      </div>

      {/* FEATURE: PE-04 */}
      {/* Guardrails */}
      <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "15px 18px", position: "relative" }}>
        <Corners color={T.flag} />
        <div style={{ fontFamily: mono, fontSize: 9, color: T.flag, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 4 }}>Layer 05 · Guardrails</div>
        <div style={{ fontFamily: body, fontSize: 12, color: T.mutedDeep, lineHeight: 1.5, marginBottom: 18, padding: "9px 13px", background: `${T.flag}07`, borderLeft: `3px solid ${T.flag}` }}>
          Applied to every prompt regardless of which Role or Format is active. Protects against legal overreach and unsupported claims.
        </div>
        {loading
          ? <div style={{ fontFamily: body, fontSize: 12, color: T.muted, fontStyle: "italic", padding: "16px 0", textAlign: "center" }}>Loading…</div>
          : <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: display, fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 6 }}>
                  What must {firstName} always do?
                </div>
                <textarea
                  value={alwaysText}
                  onChange={e => setAlwaysText(e.target.value)}
                  onBlur={() => saveGuardrail("always", alwaysText, alwaysId, setAlwaysId)}
                  rows={5}
                  placeholder={`Always cite the specific class code when referencing commodity risk…`}
                  style={{ width: "100%", background: T.cardAlt, border: `1px solid ${T.lineSoft}`, borderLeft: `3px solid ${T.moss}`, padding: "10px 12px", fontFamily: mono, fontSize: 11, color: T.ink, lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <div style={{ fontFamily: display, fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 6 }}>
                  What must {firstName} never do?
                </div>
                <textarea
                  value={neverText}
                  onChange={e => setNeverText(e.target.value)}
                  onBlur={() => saveGuardrail("never", neverText, neverId, setNeverId)}
                  rows={5}
                  placeholder={`Never name a vendor as fraudulent without documented evidence…`}
                  style={{ width: "100%", background: T.cardAlt, border: `1px solid ${T.lineSoft}`, borderLeft: `3px solid ${T.flag}`, padding: "10px 12px", fontFamily: mono, fontSize: 11, color: T.ink, lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: T.muted, fontStyle: "italic", marginTop: 8 }}>
                Autosaved on blur · applied to all prompts
              </div>
            </>
        }
      </div>
    </div>
  );
}

// FEATURE: PE-07 — Left-sidebar nav replaces horizontal tab bar
// ── Personnel Screen ──────────────────────────────────────────────────────────
export default function PersonnelScreen() {
  const { agentId } = useParams();
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();
  const agents      = useAgents();
  const agent       = agents.find(a => a.id === agentId) || agents[0];
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "profile");
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
    <AppShell toast={toast}>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* ── Left sidebar nav ── */}
        <div style={{ width:180, flexShrink:0, background:T.card, borderRight:`1px solid ${T.line}`, display:"flex", flexDirection:"column", overflowY:"auto" }}>

          {/* Agent identity strip */}
          {/* FEATURE: PE-07 */}
          <div style={{ padding:"16px 14px 14px", borderBottom:`1px solid ${T.lineSoft}` }}>
            <div style={{ marginBottom:8 }}>
              <AgentAvatar who={agent.id} size={44} ring={true} />
            </div>
            <div style={{ fontFamily:display, fontSize:13, fontWeight:600, color:T.navy, lineHeight:1.2 }}>{agent.name}</div>
            <div style={{ fontFamily:mono, fontSize:8, color:T.muted, marginTop:2 }}>{agent.code}</div>
            <div style={{ marginTop:6, display:"flex", gap:4, flexWrap:"wrap" }}>
              <span style={{ fontFamily:mono, fontSize:8, padding:"1px 6px", background:"rgba(90,117,56,.1)", color:T.moss, border:`1px solid rgba(90,117,56,.3)`, fontWeight:700 }}>● ACTIVE</span>
              {agent.trainable && (
                <span style={{ fontFamily:mono, fontSize:8, padding:"1px 6px", background:`${agent.color}18`, color:agent.color, border:`1px solid ${agent.color}40`, fontWeight:700 }}>YOUR TRAINEE</span>
              )}
            </div>
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
            {activeTab === "playbook" && <PlaybookTab agent={agent} showToast={showToast}/>}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
