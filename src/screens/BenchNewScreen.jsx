// DeepBench v5.2.10 | BenchNewScreen.jsx | S-RENAME-01 UI label rename
// src/screens/BenchNewScreen.jsx — v5.0.0
// DeepBench v5 — Add a Player (/bench/new)
// 2-step wizard UI stubbed with Coming Soon

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { T, display, body, mono } from "../tokens.js";
import { AppShell } from "../AppShell.jsx";
import { Corners } from "../components/SharedUI.jsx";

const DOMAINS = [
  { id:"procurement",  icon:"📋", label:"Procurement & Sourcing",   desc:"RFPs, vendor analysis, spend data" },
  { id:"legal",        icon:"⚖",  label:"Legal & Compliance",        desc:"Contracts, regulations, risk" },
  { id:"finance",      icon:"💰",  label:"Finance & Accounting",      desc:"Budgets, audits, reporting" },
  { id:"research",     icon:"🔎",  label:"Research & Intelligence",   desc:"Market research, data gathering" },
  { id:"marketing",    icon:"📣",  label:"Marketing & Communications",desc:"Content, campaigns, branding" },
  { id:"operations",   icon:"⚙",   label:"Operations & Logistics",    desc:"Process, supply chain, planning" },
];

export default function BenchNewScreen() {
  const navigate   = useNavigate();
  const [step, setStep]     = useState(1);
  const [domain, setDomain] = useState(null);

  return (
    <AppShell headerProps={{ backLabel:"The Bench", onBack:()=>navigate("/bench") }}>
      <div style={{flex:1,overflowY:"auto",background:T.paperDeep}}>
        <div style={{maxWidth:860,margin:"0 auto",padding:"40px 28px"}}>

          {/* Header */}
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:3,textTransform:"uppercase",color:T.brass,fontWeight:500,marginBottom:10}}>New Agent Setup</div>
            <div style={{fontFamily:display,fontSize:28,fontWeight:700,color:T.navy,marginBottom:8}}>Let's build your first agent</div>
            <p style={{fontSize:13.5,color:T.muted,maxWidth:440,margin:"0 auto",lineHeight:1.65}}>Two quick steps and your Personnel File is ready. You can update everything later.</p>
          </div>

          {/* Step indicators */}
          <div style={{display:"flex",gap:0,marginBottom:32,position:"relative"}}>
            <div style={{position:"absolute",top:20,left:20,right:20,height:1,background:"rgba(182,135,58,.3)"}}/>
            {[{n:"01",label:"Your Domain"},{n:"02",label:"Agent Profile"}].map((s,i)=>{
              const isActive = step===i+1; const isDone = step>i+1;
              return(
                <div key={s.n} style={{flex:1,textAlign:"center",position:"relative",zIndex:1}}>
                  <div style={{width:40,height:40,borderRadius:"50%",border:`2px solid ${isActive||isDone?T.brass:"rgba(182,135,58,.35)"}`,background:isActive||isDone?T.brass:T.paperDeep,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px",fontFamily:mono,fontSize:12,fontWeight:700,color:isActive||isDone?T.navy:T.muted}}>{s.n}</div>
                  <div style={{fontFamily:mono,fontSize:8,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:isActive?T.brass:T.muted}}>{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Coming Soon overlay */}
          <div style={{background:T.card,border:`1.5px solid ${T.line}`,padding:"40px",textAlign:"center",position:"relative"}}>
            <Corners/>
            <div style={{fontSize:40,marginBottom:16}}>🚧</div>
            <div style={{fontFamily:display,fontSize:24,fontWeight:700,color:T.navy,marginBottom:8}}>Agent Builder — Coming Soon</div>
            <p style={{fontFamily:body,fontSize:13,color:T.muted,maxWidth:440,margin:"0 auto 20px",lineHeight:1.65}}>
              The full agent creation wizard is being built now. In the meantime, the existing 7-agent team is fully operational and ready to work.
            </p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>navigate("/bench")} style={{background:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,border:"none",color:T.navy,padding:"10px 24px",cursor:"pointer",fontFamily:display,fontSize:14,fontWeight:700}}>← Back to the Bench</button>
              {/* FEATURE: WO-01 — S-RENAME-01 UI label rename */}
              <button onClick={()=>navigate("/")} style={{background:"transparent",border:`1px solid ${T.line}`,color:T.mutedDeep,padding:"10px 20px",cursor:"pointer",fontFamily:body,fontSize:13}}>New Work Order Instead</button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
