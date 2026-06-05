// DeepBench v5.1.0 | TaskInstructionsScreen.jsx | Task instructions — step timeline, HITL, editing
// src/screens/TaskInstructionsScreen.jsx — v5.0.0
// DeepBench v5 — Task instructions + step detail (/work/[taskId])
// Step timeline with HITL/sub-agent badges, per-step comment textarea,
// inline step edit, Re-run All, Mark Complete, View Brent → sub-agent CTA

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { T, display, body, mono } from "../tokens.js";
import { AppShell } from "../AppShell.jsx";
import { Corners, AiBadge } from "../components/SharedUI.jsx";
import { useAgents } from "../hooks/useAgents.js";

// ── Mock tasks ────────────────────────────────────────────────────────────────
const MOCK_TASKS = {
  1: {
    id:1, title:"NIGP Demo — Austin FY2025 Spend Analysis", agentId:"robyn", agent:"Robyn Castellanos",
    type:"Data Analysis", status:"completed", priority:"High", created:"Jun 1",
    preview:"Full portfolio analysis: $372M, 264 NIGP classes, 2,847 vendors.",
    hasHITL:true,
    fromChat:{ agentId:"robyn", agentName:"Robyn Castellanos", question:"Can you analyze Austin's FY2025 spend for vendor concentration risk?", answer:"Happy to — I'll run a full HHI analysis across all vendor classes. Let me set up the task." },
    steps:[
      { id:1, icon:"👤", label:"Human in the Loop",            type:"hitl",     status:"done",    text:"Load your data source — select a sample dataset, fetch live portal data via Brent, or upload your own file.",     note:"Completed — Austin FY2025 demo loaded" },
      { id:2, icon:"🌐", label:"Call Brent — Fetch Live Data", type:"subagent", status:"skipped", text:"If a live data source was selected, Robyn will delegate to Brent Matthews to navigate the portal and retrieve the file. Brent will write field notes to his training after each run.", note:"Sub-agent handoff · Skipped — demo data used", agentId:"brent", agentName:"Brent Matthews" },
      { id:3, icon:"🗂", label:"Map & Validate Columns",       type:"agent",    status:"done",    text:"Robyn mapped all 21 columns. Amount, NIGP, vendor, date auto-detected." },
      { id:4, icon:"📊", label:"Run Data Analysis",            type:"agent",    status:"done",    text:"11,711 transactions analyzed. 6 risk flags identified. HHI: 892 (competitive)." },
      { id:5, icon:"⚑", label:"Flag Anomalies",               type:"agent",    status:"done",    text:"Maverick spend: $2.1M (5.7%). PO splitting: 14 instances. Single-source: 3 categories." },
      { id:6, icon:"📝", label:"Generate Executive Briefing",  type:"agent",    status:"done",    text:"Briefing generated. 4 sections: Portfolio Overview, Risk Assessment, Strategic Opportunities, Bottom Line." },
      { id:7, icon:"👤", label:"Human in the Loop",            type:"hitl",     status:"done",    text:"Review and approve the executive briefing.", note:"Approved Jun 1" },
    ],
  },
  2: {
    id:2, title:"Illinois Q1 2025 Expenditure Fetch", agentId:"brent", agent:"Brent Matthews",
    type:"Web Fetch", status:"needs-review", priority:"Normal", created:"Jun 3",
    preview:"Brent navigated IL Comptroller portal and downloaded statewide expenditures.",
    hasHITL:true,
    steps:[
      { id:1, icon:"🌐", label:"Navigate Portal",          type:"agent",  status:"done",    text:"Brent navigated to Illinois Comptroller expenditures page in 3 steps." },
      { id:2, icon:"📋", label:"Fill Forms & Filters",     type:"agent",  status:"done",    text:"Fiscal year 2025 selected. Date range filled: 01/01/2025 - 03/31/2025." },
      { id:3, icon:"⬇", label:"Download Data File",       type:"agent",  status:"done",    text:"IL_Expenditures_2025_Q1.csv downloaded successfully. 47,832 rows." },
      { id:4, icon:"👤", label:"Human in the Loop",        type:"hitl",   status:"waiting", text:"Review the downloaded data. Confirm the file is correct before queuing for analysis.", note:"Awaiting your review" },
    ],
  },
};

const STATUS_STYLE = {
  done:    { label:"Done",    color:T.moss,      bg:`rgba(90,117,56,.12)`,  border:`rgba(90,117,56,.25)` },
  waiting: { label:"Waiting", color:T.flag,      bg:`rgba(168,51,25,.1)`,   border:`rgba(168,51,25,.3)` },
  pending: { label:"Pending", color:T.muted,     bg:`rgba(18,36,60,.07)`,   border:T.lineSoft },
  running: { label:"Running", color:T.brass,     bg:`rgba(182,135,58,.12)`, border:`rgba(182,135,58,.35)` },
  skipped: { label:"Skipped", color:T.muted,     bg:`rgba(120,109,82,.07)`, border:T.line },
};

// ── Step component ────────────────────────────────────────────────────────────
function StepRow({ step, index, navigate }) {
  const [editing, setEditing]   = useState(false);
  const [editText, setEditText] = useState(step.text);
  const [comment,  setComment]  = useState("");

  const isHITL     = step.type === "hitl";
  const isSubAgent = step.type === "subagent";
  const ss         = STATUS_STYLE[step.status] || STATUS_STYLE.pending;

  const bdC  = isHITL     ? "rgba(168,51,25,.25)"   : isSubAgent ? "rgba(45,111,181,.25)" : T.line;
  const bgC  = isHITL     ? "rgba(168,51,25,.04)"   : isSubAgent ? "rgba(45,111,181,.04)" : T.card;
  const lbC  = isHITL     ? T.flag                  : isSubAgent ? "#2d6fb5"              : T.lineSoft;
  const nmC  = isHITL     ? T.flag                  : isSubAgent ? "#2d6fb5"              : T.muted;
  const ttC  = isHITL     ? T.flag                  : isSubAgent ? "#2d6fb5"              : T.navy;

  const badge = isHITL
    ? <span style={{fontFamily:mono,fontSize:7.5,padding:"1px 6px",background:"rgba(168,51,25,.1)",color:T.flag,border:`1px solid rgba(168,51,25,.3)`,fontWeight:700}}>● HUMAN REQUIRED</span>
    : isSubAgent
    ? <span style={{fontFamily:mono,fontSize:7.5,padding:"1px 6px",background:"rgba(45,111,181,.1)",color:"#2d6fb5",border:`1px solid rgba(45,111,181,.3)`,fontWeight:700}}>⇆ SUB-AGENT · {step.agentName||"Brent"}</span>
    : <span style={{fontFamily:mono,fontSize:7.5,padding:"1px 6px",background:`rgba(182,135,58,.1)`,color:T.brassDeep,border:`1px solid rgba(182,135,58,.25)`}}>Agent <AiBadge style={{marginLeft:3}}/></span>;

  return (
    <div style={{background:bgC,border:`1px solid ${bdC}`,padding:"14px 16px",borderLeft:`3px solid ${lbC}`,position:"relative"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        {/* Step number + icon */}
        <div style={{flexShrink:0,textAlign:"center",minWidth:28,paddingTop:1}}>
          <div style={{fontFamily:mono,fontSize:8,color:nmC,fontWeight:700,marginBottom:3}}>{String(index+1).padStart(2,"0")}</div>
          <div style={{fontSize:16}}>{step.icon}</div>
        </div>

        {/* Content */}
        <div style={{flex:1,minWidth:0,paddingRight:18}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
            <div style={{fontFamily:display,fontSize:14,fontWeight:600,color:ttC}}>{step.label}</div>
            {badge}
            <span style={{fontFamily:mono,fontSize:7.5,padding:"1px 6px",background:ss.bg,color:ss.color,border:`1px solid ${ss.border}`,marginLeft:"auto"}}>{ss.label}</span>
          </div>

          {/* FEATURE: TI-04 — Inline step editing */}
          {/* Step text — editable inline */}
          {editing ? (
            <div style={{marginBottom:6}}>
              <textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={3}
                style={{width:"100%",background:T.cardAlt,border:`1px solid ${T.brass}`,padding:"6px 10px",fontFamily:body,fontSize:11,color:T.ink,resize:"vertical",outline:"none",lineHeight:1.55,boxSizing:"border-box"}}/>
              <div style={{display:"flex",gap:6,marginTop:4}}>
                <button onClick={()=>setEditing(false)}
                  style={{fontFamily:mono,fontSize:8,color:T.moss,background:"transparent",border:`1px solid ${T.moss}`,padding:"2px 8px",cursor:"pointer",textTransform:"uppercase",letterSpacing:.3}}>Save</button>
                <button onClick={()=>{setEditing(false);setEditText(step.text);}}
                  style={{fontFamily:mono,fontSize:8,color:T.muted,background:"transparent",border:`1px solid ${T.lineSoft}`,padding:"2px 8px",cursor:"pointer",textTransform:"uppercase"}}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{fontSize:12,color:T.mutedDeep,lineHeight:1.6,marginBottom:step.note?4:6}}>{editText}</div>
          )}
          {step.note&&<div style={{fontFamily:mono,fontSize:8,color:isHITL?T.flag:isSubAgent?"#2d6fb5":T.moss,letterSpacing:.3,fontStyle:"italic",marginBottom:6}}>{step.note}</div>}

          {/* Per-step comment textarea */}
          <textarea
            value={comment}
            onChange={e=>setComment(e.target.value)}
            placeholder="Add a comment or instruction for this step…"
            style={{width:"100%",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:"6px 10px",fontFamily:body,fontSize:11,color:T.ink,resize:"none",outline:"none",lineHeight:1.5,height:38,boxSizing:"border-box",transition:"height .15s"}}
            onFocus={e=>e.target.style.height="64px"}
            onBlur={e=>{if(!e.target.value)e.target.style.height="38px";}}
          />
        </div>

        {/* Right action buttons */}
        <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0,marginTop:2}}>
          {isHITL && step.status==="waiting" && step.text.toLowerCase().includes("data source") && (
            <button style={{fontFamily:mono,fontSize:8,color:T.navy,background:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,border:"none",padding:"5px 10px",cursor:"pointer",fontWeight:700,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:.3}}>Open Data Source →</button>
          )}
          {isHITL && step.status==="waiting" && !step.text.toLowerCase().includes("data source") && (
            <button style={{fontFamily:mono,fontSize:8,color:T.moss,background:"rgba(90,117,56,.1)",border:`1px solid rgba(90,117,56,.3)`,padding:"5px 10px",cursor:"pointer",fontWeight:700,textTransform:"uppercase",letterSpacing:.3}}>Approve ✓</button>
          )}
          {/* FEATURE: TI-08 — View Brent CTA (sub-agent navigation) */}
          {isSubAgent && (
            <button onClick={()=>navigate(`/bench/${step.agentId||"brent"}`)}
              style={{fontFamily:mono,fontSize:8,color:"#2d6fb5",background:"rgba(45,111,181,.1)",border:`1px solid rgba(45,111,181,.3)`,padding:"5px 10px",cursor:"pointer",fontWeight:700,textTransform:"uppercase",letterSpacing:.3,whiteSpace:"nowrap"}}>View {step.agentName?.split(" ")[0]||"Brent"} →</button>
          )}
          {!editing && (
            <button onClick={()=>setEditing(true)}
              style={{fontFamily:mono,fontSize:8,color:T.muted,background:"transparent",border:`1px solid ${T.lineSoft}`,padding:"5px 10px",cursor:"pointer",textTransform:"uppercase",letterSpacing:.3}}>Edit</button>
          )}
          <button style={{fontFamily:mono,fontSize:8,color:T.muted,background:"transparent",border:`1px solid ${T.lineSoft}`,padding:"5px 10px",cursor:"pointer",textTransform:"uppercase",letterSpacing:.3}}>Re-run</button>
        </div>
      </div>

      {/* HITL action strip for waiting steps */}
      {isHITL && step.status==="waiting" && (
        <div style={{display:"flex",gap:8,marginTop:10,paddingTop:10,borderTop:`1px solid rgba(168,51,25,.2)`}}>
          <button style={{background:T.moss,color:"#fff",border:"none",padding:"7px 18px",fontFamily:display,fontSize:12,fontWeight:700,cursor:"pointer"}}>Review & Approve →</button>
          <button style={{background:"transparent",border:`1px solid ${T.line}`,color:T.mutedDeep,padding:"7px 14px",fontFamily:body,fontSize:12,cursor:"pointer"}}>Request Changes</button>
        </div>
      )}
    </div>
  );
}

// FEATURE: TI-01 — Step timeline
// FEATURE: TI-02 — HITL step navigation
// ── Task Instructions Screen ──────────────────────────────────────────────────
export default function TaskInstructionsScreen() {
  const { taskId } = useParams();
  const navigate   = useNavigate();
  const agents     = useAgents();
  const task       = MOCK_TASKS[parseInt(taskId)] || MOCK_TASKS[1];
  const agent      = agents.find(a => a.id === task.agentId);
  const steps      = task.steps || [];
  const doneCount  = steps.filter(s=>s.status==="done"||s.status==="skipped").length;
  const progress   = steps.length ? Math.round(doneCount/steps.length*100) : 0;

  return (
    <AppShell headerProps={{ backLabel:"Dashboard", onBack:()=>navigate("/") }}>
      <div style={{flex:1,overflowY:"auto",background:T.paperDeep,padding:"24px 28px 48px"}}>

        {/* Breadcrumb */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18,fontFamily:mono,fontSize:9,color:T.muted,letterSpacing:1,textTransform:"uppercase"}}>
          <button onClick={()=>navigate("/")} style={{background:"transparent",border:"none",color:T.brass,cursor:"pointer",fontFamily:mono,fontSize:9,letterSpacing:1,textTransform:"uppercase",padding:0}}>Work Dashboard</button>
          <span>›</span><span style={{color:T.ink}}>Task Instructions</span>
        </div>

        {/* Task header */}
        <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"16px 20px",marginBottom:16,position:"relative"}}>
          <Corners/>
          <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
            <div style={{width:44,height:44,borderRadius:"50%",border:`1.5px solid ${agent?.color||T.brass}`,background:T.paperDeep,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:display,fontSize:18,fontWeight:700,color:agent?.color||T.brass,flexShrink:0}}>
              {task.agent[0]}
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:display,fontSize:18,fontWeight:600,color:T.navy,marginBottom:3,lineHeight:1.2}}>{task.title}</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{task.agent}</span>
                <span style={{color:T.lineSoft}}>·</span>
                <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{task.type}</span>
                <span style={{color:T.lineSoft}}>·</span>
                <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>Created {task.created}</span>
                {task.hasHITL&&<span style={{fontFamily:mono,fontSize:8,padding:"1px 7px",background:"rgba(168,51,25,.1)",color:T.flag,border:`1px solid rgba(168,51,25,.3)`,fontWeight:700}}>● HUMAN STEPS: {steps.filter(s=>s.type==="hitl").length}</span>}
              </div>
            </div>
            {/* FEATURE: TI-05 — Re-run All button */}
          {/* FEATURE: TI-06 — Mark Complete button */}
          {/* Re-run All + Mark Complete */}
            <div style={{display:"flex",gap:8,flexShrink:0}}>
              <button style={{fontFamily:mono,fontSize:9,color:T.muted,background:"transparent",border:`1px solid ${T.line}`,padding:"5px 12px",cursor:"pointer",textTransform:"uppercase",letterSpacing:.5}}>Re-run All</button>
              <button style={{fontFamily:mono,fontSize:9,color:T.moss,background:"rgba(90,117,56,.1)",border:`1px solid rgba(90,117,56,.3)`,padding:"5px 12px",cursor:"pointer",textTransform:"uppercase",letterSpacing:.5,fontWeight:700}}>Mark Complete ✓</button>
            </div>
          </div>
          {/* CTA */}
          <div style={{marginTop:12,display:"flex",gap:8,justifyContent:"flex-end"}}>
            {task.status==="needs-review"&&(
              <button onClick={()=>navigate(`/work/${taskId}/analyze`)} style={{background:T.moss,color:"#fff",border:"none",padding:"9px 20px",fontFamily:display,fontSize:13,fontWeight:700,cursor:"pointer"}}>Review Analysis →</button>
            )}
            {task.status==="completed"&&(
              <button onClick={()=>navigate(`/work/${taskId}/analyze`)} style={{background:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,color:T.navy,border:"none",padding:"9px 20px",fontFamily:display,fontSize:13,fontWeight:700,cursor:"pointer"}}>View Analysis →</button>
            )}
          </div>
        </div>

        {/* 2-col layout */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:16,alignItems:"start"}}>

          {/* Steps */}
          <div>
            {/* FEATURE: TI-07 — Chat transcript section */}
            {/* ── This task started from a conversation ── */}
          {task.fromChat && (
            <div style={{background:`rgba(45,111,181,.05)`,border:`1px solid rgba(45,111,181,.2)`,padding:"12px 16px",marginBottom:14,position:"relative"}}>
              <Corners color="#2d6fb5"/>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <span style={{fontFamily:mono,fontSize:8.5,color:"#2d6fb5",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>This task started from a conversation</span>
                <AiBadge/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{fontFamily:mono,fontSize:8,color:T.muted,flexShrink:0,paddingTop:1}}>YOU</div>
                  <div style={{background:T.navy,color:T.card,padding:"6px 10px",fontSize:11,fontFamily:body,lineHeight:1.5,flex:1}}>{task.fromChat.question}</div>
                </div>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{fontFamily:mono,fontSize:8,color:T.brassDeep,flexShrink:0,paddingTop:1}}>{task.fromChat.agentName.split(" ")[0].toUpperCase()}</div>
                  <div style={{background:T.cardAlt,border:`1px solid ${T.line}`,padding:"6px 10px",fontSize:11,fontFamily:body,color:T.mutedDeep,lineHeight:1.5,flex:1}}>{task.fromChat.answer}</div>
                </div>
              </div>
            </div>
          )}
          <div style={{fontFamily:mono,fontSize:9,fontWeight:700,color:T.brassDeep,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Step-by-Step Instructions</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {steps.map((step,i)=>(
                <StepRow key={step.id} step={step} index={i} navigate={navigate}/>
              ))}
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{position:"sticky",top:0,display:"flex",flexDirection:"column",gap:12}}>
            {/* Task summary */}
            <div style={{background:T.card,border:`1.5px solid ${T.line}`,overflow:"hidden"}}>
              <div style={{background:T.navy,padding:"10px 16px",borderBottom:`2px solid ${T.brass}`}}>
                <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"rgba(184,197,216,.8)",textTransform:"uppercase"}}>Task Summary</div>
              </div>
              <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:8}}>
                {[["Agent",task.agent],["Type",task.type],["Steps",`${steps.length} total`],["Human steps",`${steps.filter(s=>s.type==="hitl").length} required`],["Status",task.status],["Created",task.created]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${T.lineSoft}`,fontSize:11}}>
                    <span style={{color:T.muted}}>{k}</span>
                    <span style={{fontFamily:mono,fontSize:10.5,color:T.ink,textAlign:"right"}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div style={{background:T.card,border:`1.5px solid ${T.line}`,padding:"14px 16px"}}>
              <div style={{fontFamily:mono,fontSize:9,fontWeight:700,color:T.brassDeep,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Progress</div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontFamily:mono,fontSize:9,color:T.muted}}>
                <span>{doneCount} of {steps.length} complete</span>
                <span>{progress}%</span>
              </div>
              <div style={{height:6,background:T.paperDeep,border:`1px solid ${T.lineSoft}`,marginBottom:12}}>
                <div style={{height:"100%",width:`${progress}%`,background:T.moss,transition:"width .3s"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {steps.map((s,i)=>{
                  const dotC = s.type==="hitl"?T.flag:s.type==="subagent"?"#2d6fb5":(s.status==="done"?T.moss:T.lineSoft);
                  const lblC = s.type==="hitl"?T.flag:s.type==="subagent"?"#2d6fb5":T.muted;
                  const typeL = s.type==="hitl"?"HUMAN":s.type==="subagent"?"SUB":"AGENT";
                  return(
                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:dotC,flexShrink:0}}/>
                      <div style={{fontFamily:mono,fontSize:8,color:lblC,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{String(i+1).padStart(2,"0")} {s.label}</div>
                      <div style={{fontFamily:mono,fontSize:7,color:lblC,flexShrink:0}}>{typeL}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
