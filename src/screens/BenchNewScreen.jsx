// DeepBench v7.0.790 | BenchNewScreen.jsx | AGT-386 -- a created agent lands on its own Personnel file; the team block moved to that file's badge
// DeepBench v7.0.788 | BenchNewScreen.jsx | AGT-384 -- the shared Bench nav sits beside the form (breadcrumb "Bench Home › Add a player"); a created agent lands on the roster under Private Agents
// DeepBench v7.0.764 | BenchNewScreen.jsx | AGT-337 slice 3 -- the create screen
// src/screens/BenchNewScreen.jsx
// /bench/new: type a name, press the create button, land on the new agent's Personnel file.
// Every visible string and element is John's approved mock (kickoff v7.0.764 section 4), verbatim.
// No model call here; the save goes to the agent-configs route, which logs it (slice 1).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { T, display, body, mono } from "../tokens.js";
import { AppShell } from "../AppShell.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { BenchNav, BenchNavChips } from "../components/BenchNav.jsx"; // FEATURE: AGT-384 — the shared Bench nav

const FIELD_LABEL = { fontFamily:mono, fontSize:9, color:T.brassDeep, textTransform:"uppercase", letterSpacing:1.3, fontWeight:600, marginBottom:4 };

export default function BenchNewScreen() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [name, setName]             = useState("");
  const [saving, setSaving]         = useState(false);
  const [failed, setFailed]         = useState(false);

  const trimmedName = name.trim();
  const nameEmpty   = trimmedName === "";

  const inputStyle = { width:"100%", boxSizing:"border-box", background:T.cardAlt, border:`1px solid ${T.line}`, padding:"9px 14px", color:T.ink, fontFamily:body, outline:"none", fontSize: isMobile ? 16 : 13 };

  const brassButton    = { background:`linear-gradient(135deg,${T.brass},${T.brassDeep})`, border:"none", color:T.navy, padding:"10px 24px", cursor:"pointer", fontFamily:display, fontSize:14, fontWeight:700 };
  const disabledButton = { ...brassButton, background:T.line, color:T.muted, cursor:"not-allowed", opacity:0.5 };
  const cancelButton   = { background:"transparent", border:`1px solid ${T.line}`, color:T.mutedDeep, padding:"10px 20px", cursor:"pointer", fontFamily:body, fontSize:13 };

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving || nameEmpty) return;
    setSaving(true);
    setFailed(false);
    try {
      const res = await fetch("/api/agent-configs", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ action: "create_private_agent", name: trimmedName }) });
      // FEATURE: AGT-386 — land on the new agent's Personnel file
      if (res.status === 201) { const out = await res.json(); navigate(`/bench/${out.agent.id}`); return; }
    } catch {
      // a rejected fetch is the same failure as a non-201
    }
    setSaving(false);
    setFailed(true);
  }

  return (
    <AppShell headerProps={{ backLabel:"The Bench", onBack:()=>navigate("/bench") }}>
      {/* FEATURE: AGT-384 — the Bench nav beside the form (desktop sidebar; breadcrumb + chips on mobile) */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
      <BenchNav current="Add a player"/>
      <div style={{flex:1,overflowY:"auto",background:T.paperDeep}}>
        <BenchNavChips current="Add a player"/>
        <div style={{maxWidth:860,margin:"0 auto",padding:"40px 28px"}}>

          {/* Header */}
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:3,textTransform:"uppercase",color:T.brass,fontWeight:500,marginBottom:10}}>New Agent Setup</div>
            <div style={{fontFamily:display,fontSize:28,fontWeight:700,color:T.navy,marginBottom:8}}>Name your new agent</div>
            <p style={{fontSize:13.5,color:T.muted,maxWidth:440,margin:"0 auto",lineHeight:1.65}}>Your agent starts blank. You teach it everything it knows.</p>
          </div>

          {/* FEATURE: AGT-337 — the create form */}
          <form onSubmit={handleSubmit} style={{background:T.card,border:`1px solid ${T.line}`,padding:24,maxWidth:440,margin:"0 auto",textAlign:"left"}}>

            <div style={FIELD_LABEL}>Agent name</div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={saving}
              autoFocus
              maxLength={60}
              style={inputStyle}
            />

            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button type="submit" disabled={nameEmpty || saving} style={nameEmpty ? disabledButton : brassButton}>{saving ? "Creating…" : "Create agent"}</button>
              <button type="button" disabled={saving} onClick={()=>navigate("/bench")} style={cancelButton}>Cancel</button>
            </div>

            {failed && !saving && (
              <div style={{fontFamily:body,fontSize:12,color:T.flag,marginTop:10}}>Couldn’t create your agent. Try again.</div>
            )}
          </form>
        </div>
      </div>
      </div>
    </AppShell>
  );
}
