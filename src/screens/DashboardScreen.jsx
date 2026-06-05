// DeepBench v5.1.1 | DashboardScreen.jsx | Work dashboard — task list, stats, chat panel

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { T, display, body, mono, GLOBAL_CSS } from "../tokens.js";
import { TENANT_ID, CURRENT_USER } from "../config.js";
import { AppShell } from "../AppShell.jsx";
import { Corners, Toast, AgentAvatar, AiBadge, FeatureBadge } from "../components/SharedUI.jsx";
import { useAgents } from "../hooks/useAgents.js";
import { setAIStatus, clearAIStatus } from "../hooks/useAIStatus.js";
import { logAICall } from "../hooks/useAIActivity.js";
import { FETCH_API_BASE } from "../config.js";
import { supabase } from "../lib/supabase.js";

// ── Status + Priority styles ──────────────────────────────────────────────────
const STATUS_STYLES = {
  "draft":           { bg:"rgba(120,109,82,.1)",   color:"#786d52",  border:"#c8bb9a",           label:"Draft" },
  "awaiting-input":  { bg:"rgba(182,135,58,.1)",   color:"#b6873a",  border:"rgba(182,135,58,.4)",label:"Awaiting Input" },
  "pending":         { bg:"rgba(18,36,60,.07)",    color:"#786d52",  border:"#d8cbac",           label:"Pending" },
  "in-progress":     { bg:"rgba(45,111,181,.1)",   color:"#2d6fb5",  border:"rgba(45,111,181,.3)",label:"In Progress" },
  "action-required": { bg:"rgba(168,51,25,.1)",    color:"#a83319",  border:"rgba(168,51,25,.3)",label:"Action Required" },
  "needs-review":    { bg:"rgba(90,117,56,.1)",    color:"#5a7538",  border:"rgba(90,117,56,.3)", label:"Needs Review" },
  "completed":       { bg:"rgba(90,117,56,.08)",   color:"#5a7538",  border:"rgba(90,117,56,.2)", label:"Completed" },
};

const PRIORITY_STYLES = {
  "High":   { bg:"rgba(168,51,25,.08)",  color:"#a83319", border:"rgba(168,51,25,.25)" },
  "Normal": { bg:"rgba(18,36,60,.06)",   color:"#786d52", border:"#d8cbac" },
  "Low":    { bg:"rgba(120,109,82,.08)", color:"#786d52", border:"#c8bb9a" },
};

// FEATURE: DB-15 — NIGP demo task pre-load
// MOCK FALLBACK (remove after Supabase confirmed working)
// const MOCK_TASKS = [
//   { id:1, title:"NIGP Demo — Austin FY2025 Spend Analysis", agent:"Robyn Castellanos", agentId:"robyn", type:"Data Analysis", status:"completed", priority:"High", due:"Jun 15", preview:"Full portfolio analysis: $372M, 264 NIGP classes, 2,847 vendors. All 6 risk flags computed.", hasHITL:false, created:"Jun 1" },
//   { id:2, title:"Illinois Q1 2025 Expenditure Fetch", agent:"Brent Matthews", agentId:"brent", type:"Web Fetch", status:"needs-review", priority:"Normal", due:"Jun 20", preview:"Brent navigated IL Comptroller portal and downloaded statewide expenditures. File ready for analysis.", hasHITL:true, created:"Jun 3" },
//   { id:3, title:"Vendor Concentration Briefing — City of Austin", agent:"Bob Whitfield", agentId:"bob", type:"Data Analysis", status:"in-progress", priority:"High", due:"Jun 18", preview:"Analyzing HHI scores and single-source risk across facilities spend. Compliance review in progress.", hasHITL:true, created:"Jun 4" },
//   { id:4, title:"Q2 Procurement Strategy Memo", agent:"Robyn Castellanos", agentId:"robyn", type:"Document Draft", status:"action-required", priority:"Normal", due:"Jun 22", preview:"Human review required: approve the strategic recommendations before final delivery to CPO.", hasHITL:true, created:"Jun 2" },
//   { id:5, title:"Maryland FY2025 Vendor Payment Data", agent:"Brent Matthews", agentId:"brent", type:"Web Fetch", status:"pending", priority:"Normal", due:"Jun 25", preview:"Scheduled fetch from MD-VIEW portal. Brent will navigate and download vendor payment CSV.", hasHITL:false, created:"Jun 5" },
//   { id:6, title:"Contract Coverage Gap Analysis", agent:"Mike Alvarez", agentId:"mike", type:"Data Analysis", status:"awaiting-input", priority:"Low", due:"TBD", preview:"Awaiting your input: which fiscal year should this analysis cover?", hasHITL:true, created:"Jun 5" },
// ];
// const MOCK_COMPLETED = [
//   { id:10, title:"FY2024 Annual Spend Report", agent:"Robyn Castellanos", agentId:"robyn", type:"Data Analysis", completedOn:"May 28" },
//   { id:11, title:"Oregon OregonBuys PO Export", agent:"Brent Matthews", agentId:"brent", type:"Web Fetch", completedOn:"May 22" },
//   { id:12, title:"Sole-Source Justification Review", agent:"Bob Whitfield", agentId:"bob", type:"Compliance Review", completedOn:"May 15" },
// ];

// FEATURE: DB-09 — AI routing/switchboard topic map
// ── Chat topic → agent routing ─────────────────────────────────────────────
const TOPIC_MAP = {
  analysis:   { agentId:"robyn",   label:"Data Analysis",      desc:"Spend analysis, trend identification, executive data narratives" },
  research:   { agentId:"brent",   label:"Web Research",       desc:"Government portal retrieval, open records, live data acquisition" },
  writing:    { agentId:"robyn",   label:"Writing & Drafting",  desc:"Proposals, reports, executive briefings, client-facing documents" },
  compliance: { agentId:"bob",     label:"Legal & Compliance",  desc:"Contract review, regulatory risk, policy audits" },
  strategy:   { agentId:"robyn",   label:"Strategy & Advisory", desc:"NIGP best-practice, procurement strategy, CPO-level advisory" },
  formatting: { agentId:"christy", label:"Formatting & Design", desc:"Executive presentation, board reports, branded formatting" },
};

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onClick }) {
  const s = STATUS_STYLES[task.status]  || STATUS_STYLES["pending"];
  const p = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES["Normal"];
  const agents = useAgents();
  const agent  = agents.find(a => a.id === task.agentId);

  return (
    <div onClick={onClick} style={{background:T.card,border:`1.5px solid ${T.line}`,overflow:"hidden",marginBottom:10,position:"relative",cursor:"pointer",transition:"border-color .15s"}}
      onMouseEnter={e=>e.currentTarget.style.borderColor=T.brass}
      onMouseLeave={e=>e.currentTarget.style.borderColor=T.line}>
      <div style={{position:"absolute",top:5,left:5,width:8,height:8,borderTop:`1px solid ${T.brass}`,borderLeft:`1px solid ${T.brass}`,opacity:.4,pointerEvents:"none"}}/>
      <div style={{padding:"13px 16px",display:"flex",alignItems:"flex-start",gap:12}}>
        <div style={{width:36,height:36,borderRadius:"50%",border:`1.5px solid ${agent?.color||T.brass}`,background:T.paperDeep,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:display,fontSize:14,fontWeight:700,color:agent?.color||T.brass,flexShrink:0,marginTop:1}}>
          {task.agent[0]}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:display,fontSize:14,fontWeight:600,color:T.navy,marginBottom:4,lineHeight:1.2}}>{task.title}</div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
            <span style={{fontFamily:mono,fontSize:8,color:T.muted}}>{task.agent}</span>
            <span style={{color:T.lineSoft}}>·</span>
            <span style={{fontFamily:mono,fontSize:8,color:T.muted}}>{task.type}</span>
            <span style={{color:T.lineSoft}}>·</span>
            <span style={{fontFamily:mono,fontSize:8,color:T.muted}}>Due {task.due}</span>
            {task.hasHITL && <span style={{fontFamily:mono,fontSize:7.5,padding:"1px 5px",background:"rgba(168,51,25,.1)",color:T.flag,border:`1px solid rgba(168,51,25,.3)`,fontWeight:700}}>● HITL</span>}
          </div>
          <div style={{fontSize:12,color:T.mutedDeep,fontStyle:"italic",lineHeight:1.5}}>{task.preview}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
          <span style={{fontFamily:mono,fontSize:8,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",padding:"2px 8px",background:s.bg,color:s.color,border:`1px solid ${s.border}`}}>{s.label}</span>
          <span style={{fontFamily:mono,fontSize:8,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",padding:"2px 8px",background:p.bg,color:p.color,border:`1px solid ${p.border}`}}>{task.priority}</span>
        </div>
      </div>
      {task.status === "needs-review" && (
        <div style={{borderTop:`1px solid ${T.line}`,padding:"9px 16px",background:T.cardAlt,display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontFamily:mono,fontSize:8.5,color:T.moss,fontWeight:700}}>● Ready for your review</span>
          <div style={{flex:1}}/>
          <button onClick={e=>{e.stopPropagation();onClick();}} style={{background:T.moss,color:"#fff",border:"none",padding:"6px 14px",fontFamily:body,fontSize:11,fontWeight:700,cursor:"pointer"}}>Review & Approve</button>
          <button onClick={e=>e.stopPropagation()} style={{background:"transparent",border:`1px solid ${T.line}`,color:T.mutedDeep,padding:"6px 12px",fontFamily:body,fontSize:11,cursor:"pointer"}}>Request Changes</button>
        </div>
      )}
      {task.status === "action-required" && (
        <div style={{borderTop:`1px solid ${T.line}`,padding:"9px 16px",background:`rgba(168,51,25,.04)`,display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontFamily:mono,fontSize:8.5,color:T.flag,fontWeight:700}}>⚠ Your input required</span>
          <div style={{flex:1}}/>
          <button onClick={e=>{e.stopPropagation();onClick();}} style={{background:T.flag,color:"#fff",border:"none",padding:"6px 14px",fontFamily:body,fontSize:11,fontWeight:700,cursor:"pointer"}}>Respond →</button>
        </div>
      )}
    </div>
  );
}

// FEATURE: DB-14 — Live RAG + AI call (chat panel sends to /api/brief)
// ── Chat Panel ────────────────────────────────────────────────────────────────
function ChatPanel() {
  const agents = useAgents();
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const chatAgents = agents.filter(a => !a.isIntern);

  const selectTopic = (topicKey) => {
    const topic = TOPIC_MAP[topicKey];
    if (!topic) return;
    setSelectedTopic(topicKey);
    const agent = agents.find(a => a.id === topic.agentId);
    setSelectedAgent(agent);
    setMessages([{
      role: "assistant",
      agentId: agent.id,
      content: `${agent.quip.replace(/"/g,'')} You've selected **${topic.label}** — what do you need?`,
      tier: "informed",
      isIntro: true,
      topicLabel: topic.label,
      topicDesc: topic.desc,
    }]);
  };

  const selectAgent = (agent) => {
    setSelectedAgent(agent);
    setSelectedTopic(null);
    setMessages([{
      role: "assistant",
      agentId: agent.id,
      content: `${agent.quip.replace(/"/g,'')} What can I help you with?`,
      tier: "informed",
      isIntro: true,
    }]);
  };

  // ── Routing check (switchboard) — Haiku classifies question vs agent capability
  const checkRouting = async (userMsg, agent) => {
    const t0 = Date.now();
    try {
      const others = agents.filter(a=>!a.isIntern&&a.id!==agent.id).map(a=>`${a.id}: ${a.name} — ${a.specialty}`).join("\n");
      const prompt = `Current agent: ${agent.name} (${agent.specialty})\nUser question: ${userMsg}\nOther available agents:\n${others}\n\nIs ${agent.name} the best agent for this question? If not, which agent ID would be better and why (one sentence)? Reply JSON: {"isMatch":true/false,"suggestId":"agent_id_or_null","suggestReason":"reason or null"}`;
      const res = await fetch("/api/brief",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:[{role:"user",content:prompt}],agent_id:"chloe",tenant_id:TENANT_ID,skipRag:true,max_tokens:120})});
      const data = await res.json();
      const raw = (data.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(raw);
      logAICall({type:"routing",model:"claude-haiku-4-5",latencyMs:Date.now()-t0,tokens:data.usage?.output_tokens||0,location:"Chat panel",agentId:agent.id});
      return parsed;
    } catch { return {isMatch:true}; }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedAgent || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role:"user", content:userMsg }]);
    setLoading(true);

    // Routing check (switchboard) — AiBadge
    const routing = await checkRouting(userMsg, selectedAgent);
    if (!routing.isMatch && routing.suggestId) {
      const suggestedAgent = agents.find(a=>a.id===routing.suggestId);
      if (suggestedAgent) {
        setLoading(false);
        setMessages(prev=>[...prev,{
          role:"assistant", agentId:selectedAgent.id,
          content:`${suggestedAgent.name} would be better for this — ${routing.suggestReason} Want me to route this to ${suggestedAgent.name.split(" ")[0]}?`,
          tier:"informed", isRouting:true, suggestId:routing.suggestId, suggestName:suggestedAgent.name, originalMsg:userMsg,
        }]);
        clearAIStatus();
        return;
      }
    }

    setAIStatus(`${selectedAgent.name.split(" ")[0]} is thinking…`);
    const t0 = Date.now();
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role:"user", content:userMsg }],
          agent_id: selectedAgent.id,
          tenant_id: TENANT_ID,
          ragContext: { queryText: userMsg, jurisdiction: "All", triggers: [] },
        }),
      });
      const json = await res.json();
      const text = json.content?.[0]?.text || json.error || "No response";
      const ragRetrieved = json._debug?.rag_retrieved;
      const tier = ragRetrieved ? "trained" : json._debug?.similarity > 0.3 ? "trained" : "informed";
      const sourceDocs = json._debug?.rag_entries?.map(e=>e.title).filter(Boolean) || [];
      logAICall({type:"chat",model:"claude-haiku-4-5",latencyMs:Date.now()-t0,tokens:json.usage?.output_tokens||0,tier,agentId:selectedAgent.id,location:"Dashboard chat"});

      setMessages(prev => [...prev, {
        role: "assistant",
        agentId: selectedAgent.id,
        content: text,
        tier,
        sourceDocs,
        debug: json._debug,
      }]);
    } catch(e) {
      setMessages(prev => [...prev, { role:"assistant", agentId:selectedAgent.id, content:"Something went wrong — please try again.", tier:"general" }]);
    }
    setLoading(false);
    clearAIStatus();
  };

  // Accept routing suggestion
  const acceptRouting = (msg) => {
    const agent = agents.find(a=>a.id===msg.suggestId);
    if (!agent) return;
    setSelectedAgent(agent);
    setInput(msg.originalMsg||"");
  };

  const TIER_STYLES = {
    trained:  { label:"Trained knowledge",         bg:`${T.brass}18`, color:T.brassDeep, border:`${T.brass}40` },
    informed:  { label:"Agent expertise",          bg:`${T.navy}08`,  color:T.navy,      border:`${T.navy}20` },
    general:  { label:"General knowledge — verify independently", bg:`${T.muted}10`, color:T.muted, border:`${T.line}` },
  };

  return (
    <div style={{background:T.card,border:`1.5px solid ${T.line}`,overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:600}}>
      {/* Header */}
      <div style={{background:T.navy,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`2px solid ${T.brass}`,flexShrink:0}}>
        <div style={{fontFamily:mono,fontSize:9,letterSpacing:2,color:"rgba(184,197,216,.8)",textTransform:"uppercase"}}>Chat With Agent <AiBadge style={{marginLeft:6}}/></div>
        <div style={{background:`rgba(182,135,58,.2)`,border:`1px solid rgba(182,135,58,.4)`,padding:"2px 8px",fontFamily:mono,fontSize:8,color:T.brassLight,fontWeight:700,letterSpacing:1}}>● Online</div>
      </div>

      {/* FEATURE: DB-07 — Chat panel topic pills */}
      {/* Topic pills */}
      <div style={{padding:"12px 14px",borderBottom:`1px solid ${T.line}`,flexShrink:0}}>
        <div style={{fontFamily:mono,fontSize:8,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:7}}>Select by Topic</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {Object.entries(TOPIC_MAP).map(([key, topic]) => {
            const isActive = selectedTopic === key;
            return (
              <button key={key} onClick={()=>selectTopic(key)}
                style={{fontFamily:mono,fontSize:8,padding:"3px 9px",border:`1px solid ${isActive?T.brass:T.line}`,color:isActive?T.brassDeep:T.muted,background:isActive?`rgba(182,135,58,.15)`:T.paperDeep,cursor:"pointer",fontWeight:700,letterSpacing:.5,transition:"all .15s"}}>
                {topic.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* FEATURE: DB-08 — Chat direct agent pills */}
      {/* Agent pills */}
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.line}`,background:T.cardAlt,flexShrink:0}}>
        <div style={{fontFamily:mono,fontSize:8,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>— or select agent directly —</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {chatAgents.map(a => {
            const isActive = selectedAgent?.id === a.id && !selectedTopic;
            return (
              <button key={a.id} onClick={()=>selectAgent(a)}
                style={{fontFamily:mono,fontSize:8,padding:"3px 9px",border:`1px solid ${isActive?T.brass:T.line}`,color:isActive?T.brassDeep:T.muted,background:isActive?`rgba(182,135,58,.15)`:T.paperDeep,cursor:"pointer",fontWeight:700,letterSpacing:.5}}>
                {a.name.split(" ")[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:8,minHeight:120}}>
        {messages.length === 0 && (
          <div style={{textAlign:"center",padding:"24px 12px",color:T.muted,fontFamily:body,fontSize:12,fontStyle:"italic",lineHeight:1.6}}>
            Select a topic or agent above to start chatting.
          </div>
        )}
        {messages.map((msg, i) => {
          if (msg.role === "user") return (
            <div key={i} style={{alignSelf:"flex-end",background:T.navy,color:T.card,padding:"8px 12px",fontSize:12,fontFamily:body,maxWidth:"85%",lineHeight:1.5}}>
              {msg.content}
            </div>
          );
          const agent = agents.find(a => a.id === msg.agentId);
          const tier  = TIER_STYLES[msg.tier] || TIER_STYLES.general;
          return (
            <div key={i} style={{alignSelf:"flex-start",maxWidth:"90%"}}>
              {!msg.isIntro && (
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <div style={{width:18,height:18,borderRadius:"50%",border:`1px solid ${agent?.color||T.brass}`,background:T.paperDeep,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:agent?.color||T.brass}}>{agent?.name[0]}</div>
                  <span style={{fontFamily:display,fontSize:11,fontWeight:600,color:T.navy}}>{agent?.name}</span>
                  <span style={{fontFamily:mono,fontSize:8,padding:"1px 5px",background:tier.bg,color:tier.color,border:`1px solid ${tier.border}`}}>{tier.label}</span>
                  <AiBadge/>
                </div>
              )}
              {msg.isIntro && (
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <div style={{width:18,height:18,borderRadius:"50%",border:`1px solid ${agent?.color||T.brass}`,background:T.paperDeep,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:agent?.color||T.brass}}>{agent?.name[0]}</div>
                  <span style={{fontFamily:display,fontSize:11,fontWeight:600,color:T.navy}}>{agent?.name}</span>
                  <span style={{fontFamily:mono,fontSize:8,color:T.moss}}>· Most Senior for this topic</span>
                  <span style={{fontFamily:mono,fontSize:8,color:T.moss,marginLeft:"auto"}}>● Online</span>
                </div>
              )}
              {/* FEATURE: DB-10 — Knowledge tier badge */}
              {/* Topic description badge — only on topic-selected intros */}
              {msg.isIntro && msg.topicDesc && (
                <div style={{background:`rgba(182,135,58,.08)`,border:`1px solid rgba(182,135,58,.2)`,padding:"7px 10px",fontFamily:mono,fontSize:8,color:T.brassDeep,letterSpacing:.5,marginBottom:4}}>
                  {msg.topicDesc}
                </div>
              )}
              {/* Routing suggestion card */}
              {msg.isRouting ? (
                <div style={{background:`rgba(45,111,181,.06)`,border:`1.5px solid rgba(45,111,181,.3)`,padding:"10px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:5}}><AiBadge/><span style={{fontFamily:mono,fontSize:8,color:"#2d6fb5",textTransform:"uppercase",letterSpacing:.5}}>Routing Suggestion</span></div>
                  <div style={{fontSize:12,color:T.mutedDeep,lineHeight:1.5,marginBottom:8}}>{msg.content}</div>
                  <div style={{display:"flex",gap:7}}>
                    <button onClick={()=>acceptRouting(msg)} style={{background:"#2d6fb5",color:"#fff",border:"none",padding:"5px 14px",fontFamily:display,fontSize:11,fontWeight:700,cursor:"pointer"}}>Route to {msg.suggestName?.split(" ")[0]} →</button>
                    <button onClick={()=>sendMessage()} style={{background:"transparent",border:`1px solid ${T.line}`,color:T.mutedDeep,padding:"5px 12px",fontFamily:body,fontSize:11,cursor:"pointer"}}>Stay with {agents.find(a=>a.id===msg.agentId)?.name.split(" ")[0]}</button>
                  </div>
                </div>
              ) : (
                <div style={{background:T.cardAlt,border:`1px solid ${T.line}`,padding:"9px 11px",fontSize:12,color:T.mutedDeep,lineHeight:1.6,fontFamily:body}}
                  dangerouslySetInnerHTML={{__html: msg.content.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br/>")}}/>
              )}
              {/* FEATURE: DB-11 — Provenance chips */}
              {/* Provenance chips — Tier 1 (Trained) only */}
              {msg.tier==="trained" && msg.sourceDocs?.length>0 && (
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4}}>
                  <span style={{fontFamily:mono,fontSize:8,color:T.brassDeep}}>Based on:</span>
                  {msg.sourceDocs.slice(0,3).map((doc,i)=>(
                    <span key={i} style={{fontFamily:mono,fontSize:8,padding:"1px 6px",background:`${T.brass}12`,border:`1px solid ${T.brass}30`,color:T.brassDeep}}>{doc}</span>
                  ))}
                </div>
              )}
              {/* FEATURE: DB-12 — General knowledge disclaimer */}
              {/* General knowledge disclaimer */}
              {msg.tier==="general" && (
                <div style={{fontFamily:body,fontSize:10,color:T.muted,fontStyle:"italic",marginTop:3}}>This answer draws on general knowledge, not DeepBench training. Treat as a starting point.</div>
              )}
              {/* FEATURE: DB-13 — Save as Assignment */}
              {/* Save as Assignment */}
              {!msg.isRouting && (
                <button onClick={()=>navigate(`/work/new?from=chat&agent=${msg.agentId}&q=${encodeURIComponent(msg.content.slice(0,200))}`)}
                  style={{background:"transparent",border:"none",color:`${T.brass}80`,fontFamily:mono,fontSize:8,cursor:"pointer",padding:"3px 0",letterSpacing:.5,textDecoration:"underline",display:"block",marginTop:3}}>
                  + Save as Assignment
                </button>
              )}
            </div>
          );
        })}
        {loading && (
          <div style={{display:"flex",alignItems:"center",gap:6,color:T.muted,fontFamily:mono,fontSize:10}}>
            {[0,0.15,0.3].map((d,i)=>(
              <span key={i} style={{display:"inline-block",width:4,height:4,borderRadius:"50%",background:T.brass,animation:`dbounce 1.2s ${d}s infinite`}}/>
            ))}
            <span style={{color:T.brass}}>{selectedAgent?.name.split(" ")[0]} is thinking…</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{padding:"10px 14px",borderTop:`1px solid ${T.line}`,display:"flex",gap:8,flexShrink:0}}>
        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage()}
          disabled={!selectedAgent}
          placeholder={selectedAgent ? `Ask ${selectedAgent.name.split(" ")[0]}…` : "Select an agent or topic first…"}
          style={{flex:1,background:T.cardAlt,border:`1px solid ${T.line}`,padding:"8px 11px",fontFamily:body,fontSize:12,color:T.ink,outline:"none"}}
        />
        <button onClick={sendMessage} disabled={!selectedAgent||!input.trim()||loading}
          style={{background:(!selectedAgent||!input.trim()||loading)?T.line:`linear-gradient(135deg,${T.navy},${T.navyMid})`,color:(!selectedAgent||!input.trim()||loading)?T.muted:T.brassLight,border:"none",padding:"8px 16px",fontFamily:display,fontSize:12,fontWeight:700,cursor:(!selectedAgent||!input.trim()||loading)?"not-allowed":"pointer"}}>
          Send
        </button>
      </div>
    </div>
  );
}

// FEATURE: DB-01 — Task list (main dashboard screen)
// ── Dashboard Screen ──────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // FEATURE: SH-06 — Supabase tasks integration
  useEffect(() => {
    supabase
      .from("tasks")
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .neq("status", "completed")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error("Tasks fetch error:", error); }
        else {
          setTasks((data || []).map(t => ({
            ...t,
            agentId: t.agent_id,
            hasHITL: t.has_hitl,
          })));
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    supabase
      .from("tasks")
      .select("id, title, agent, agent_id, type, completed_on")
      .eq("tenant_id", TENANT_ID)
      .eq("status", "completed")
      .order("completed_on", { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (error) { console.error("Completed tasks fetch error:", error); }
        else {
          setCompletedTasks((data || []).map(t => ({
            ...t,
            agentId: t.agent_id,
            completedOn: t.completed_on,
          })));
        }
      });
  }, []);

  const activeTasks   = tasks.filter(t => t.status !== "completed");
  const visibleActive = drawerOpen ? activeTasks : activeTasks.slice(0,3);
  const hiddenCount   = Math.max(0, activeTasks.length - 3);

  const stats = {
    active:        activeTasks.length,
    inProgress:    tasks.filter(t=>t.status==="in-progress").length,
    needsReview:   tasks.filter(t=>t.status==="needs-review"||t.status==="action-required").length,
    completed:     completedTasks.length,
    agentsWorking: 4,  // mock
  };

  return (
    <AppShell toast={toast}>
      <div style={{flex:1,overflowY:"auto",background:T.paperDeep,padding:"24px 28px 48px"}}>

        {/* Masthead */}
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",paddingBottom:14}}>
          <div>
            <div style={{fontFamily:display,fontSize:30,fontWeight:500,color:T.navy,letterSpacing:"-.5px",lineHeight:1,marginBottom:6}}>Your work dashboard.</div>
            <div style={{fontFamily:body,fontStyle:"italic",fontSize:13,color:T.mutedDeep,lineHeight:1.5}}>Assign tasks, track progress, and chat with your agents — all in one place.</div>
          </div>
          {/* FEATURE: DB-06 — Assign New Work button */}
          <button onClick={()=>navigate("/work/new")} style={{background:T.navyMid,border:`1px solid ${T.brass}`,color:T.brassLight,padding:"10px 20px",fontFamily:body,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:8,flexShrink:0,whiteSpace:"nowrap"}}>
            <span style={{fontSize:14}}>+</span> Assign New Work
          </button>
        </div>
        <div style={{height:2,background:T.brass,marginBottom:20}}/>

        {/* FEATURE: DB-02 — Stats strip */}
        {/* Stats strip */}
        <div style={{background:T.navy,padding:"10px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:28,borderBottom:`3px solid ${T.brass}`,position:"relative"}}>
          <FeatureBadge id="SH-06" />
          {[["Active Tasks",stats.active,T.card],["In Progress",stats.inProgress,T.brassLight],["Needs Review",stats.needsReview,T.brassLight],["Completed",stats.completed,T.brassLight],["Agents Working",stats.agentsWorking,T.brassLight]].map(([k,v,c])=>(
            <div key={k}>
              <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",textTransform:"uppercase",letterSpacing:1.3,marginBottom:2}}>{k}</div>
              <div style={{fontFamily:display,fontSize:18,fontWeight:600,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</div>
            </div>
          ))}
          <div style={{flex:1}}/>
          <div style={{fontFamily:body,fontSize:11,color:"#8fa3bf",fontStyle:"italic"}}>{CURRENT_USER.name} · {CURRENT_USER.workspace}</div>
        </div>

        {/* 2-col layout */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16,alignItems:"start"}}>

          {/* Left: task list */}
          <div>
            <div style={{fontFamily:mono,fontSize:9,fontWeight:700,color:T.brassDeep,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Active Work Assignments</div>

            {loading && (
              <div style={{background:T.card,border:`1px dashed ${T.lineSoft}`,padding:"24px",textAlign:"center",marginBottom:10}}>
                <div style={{fontFamily:mono,fontSize:13,color:T.brass,fontStyle:"italic"}}>Loading tasks…</div>
              </div>
            )}

            {!loading && activeTasks.length === 0 && (
              <div style={{background:T.card,border:`1px dashed ${T.lineSoft}`,padding:"24px",textAlign:"center",marginBottom:10}}>
                <div style={{fontFamily:display,fontSize:14,color:T.muted,fontStyle:"italic"}}>No active assignments — assign new work above.</div>
              </div>
            )}

            {visibleActive.map(task => (
              <TaskCard key={task.id} task={task} onClick={()=>navigate(`/work/${task.id}`)}/>
            ))}

            {/* FEATURE: DB-03 — Show more drawer */}
            {hiddenCount > 0 && (
              <div onClick={()=>setDrawerOpen(d=>!d)} style={{background:T.card,border:`1px solid ${T.line}`,padding:"10px 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:T.brassDeep,letterSpacing:1.5,textTransform:"uppercase"}}>{drawerOpen?"▴ Show fewer":"▾ Show more tasks"}</span>
                {!drawerOpen && <span style={{fontFamily:mono,fontSize:8,color:T.muted,fontWeight:600}}>{hiddenCount} more</span>}
              </div>
            )}

            {/* FEATURE: DB-04 — Recently completed */}
            {/* Recently completed */}
            <div style={{fontFamily:mono,fontSize:9,fontWeight:700,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginTop:8,marginBottom:8}}>Recently Completed</div>
            {completedTasks.map(task => (
              <div key={task.id} style={{background:T.card,border:`1px solid ${T.line}`,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,marginBottom:6,opacity:.85,cursor:"pointer",transition:"border-color .15s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.brass}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.line}
                onClick={()=>navigate(`/work/${task.id}`)}>
                <span style={{fontFamily:mono,fontSize:10,color:T.moss}}>✓</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:display,fontSize:13,fontWeight:600,color:T.navy}}>{task.title}</div>
                  <div style={{fontFamily:mono,fontSize:8,color:T.muted,marginTop:2}}>{task.type} · Completed {task.completedOn}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: chat panel */}
          <div style={{position:"sticky",top:0}}>
            <ChatPanel/>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
