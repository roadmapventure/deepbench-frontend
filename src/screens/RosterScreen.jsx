// DeepBench v5.1.33 | RosterScreen.jsx | AiBadge tooltip labels
// src/screens/RosterScreen.jsx — v5.0.0
// DeepBench v5 — The Bench (/bench)
// 7-agent grid + situational awareness bar + Show/Hide Details drawer + bench stats

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { T, display, body, mono, fmt$, skillLabel } from "../tokens.js";
import { AppShell } from "../AppShell.jsx";
import { Corners, SkillBar, AgentAvatar, AiBadge, FeatureBadge } from "../components/SharedUI.jsx";
import { useAgents } from "../hooks/useAgents.js";
import { CURRENT_USER } from "../config.js";

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
              <AiBadge style={agent.color===T.moss
                ? {color:"#fff", background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.3)"}
                : {color:T.navy, background:"rgba(18,36,60,0.12)", border:"1px solid rgba(18,36,60,0.2)"}
              } label="Agent Identity"/>
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

// FEATURE: RO-01 — All 7 agents
export default function RosterScreen() {
  const navigate = useNavigate();
  const agents   = useAgents();

  const stats = {
    size:        agents.length,
    salary:      agents.reduce((s,a)=>s+a.salary,0),
    value:       agents.reduce((s,a)=>s+a.value,0),
    reportsPerMonth: agents.reduce((s,a)=>s+(a.reportCost>0?8:a.isIntern?2:3),0),
    trainable:   agents.filter(a=>a.trainable).length,
  };

  return (
    <AppShell>
      <div style={{flex:1,overflowY:"auto",padding:"24px 28px 48px",background:T.paperDeep}}>

        {/* Masthead */}
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",paddingBottom:14}}>
          <div>
            <div style={{fontFamily:display,fontSize:30,fontWeight:500,color:T.navy,letterSpacing:"-.5px",lineHeight:1,marginBottom:6}}>Your bench.</div>
            <div style={{fontFamily:body,fontStyle:"italic",fontSize:13,color:T.mutedDeep,maxWidth:560,lineHeight:1.5}}>
              These are your agents. Click any team member to view their profile, assign them work, or add to their training. Ready to grow your bench? Add a new player and start building their expertise.
            </div>
          </div>
        </div>
        <div style={{height:2,background:T.brass,marginBottom:20}}/>

        {/* Bench stats strip */}
        {/* FEATURE: RO-02 */}
        <div style={{background:T.navy,padding:"10px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:28,border:`1px solid rgba(182,135,58,.3)`,position:"relative"}}>
          <Corners color={T.brass}/>
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
          <div style={{flex:1}}/>
          <button
            onClick={() => navigate("/bench/new")}
            style={{ marginLeft:"auto", fontFamily:body, fontSize:12, color:T.brassLight, background:"transparent", border:`1px solid rgba(182,135,58,.4)`, padding:"5px 14px", cursor:"pointer", letterSpacing:.5 }}>
            + Add a Player
          </button>
          <div style={{fontFamily:body,fontSize:11,color:"#8fa3bf",fontStyle:"italic"}}>{CURRENT_USER.workspace}</div>
        </div>

        {/* Agent grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {agents.map(a=>(
            <AgentCard key={a.id} agent={a}
              onViewProfile={a=>navigate(`/bench/${a.id}`)}
              onAddTraining={a=>navigate(`/bench/${a.id}?tab=training`)}
            />
          ))}

          {/* Vacancy card */}
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
      </div>
    </AppShell>
  );
}
