// src/components/AIActivityPanel.jsx — v5.0.0
// AI Activity Panel: grouped by type, cost+count+latency, checklist (PRD 9.4, 9.8, 9.9)

import { useState } from "react";
import { T, display, body, mono } from "../tokens.js";
import { useAIActivity, AI_TYPES } from "../hooks/useAIActivity.js";
import { Corners } from "./SharedUI.jsx";

const CHECKLIST = [
  ["Model selection",    "Haiku for routing/classification. Sonnet only for ReAct loops and long-form briefings."],
  ["Prompt caching",     "System prompts use Anthropic prompt caching. Up to 90% cost reduction on repeated calls."],
  ["Batching",           "Multiple similar calls close together evaluated for combining into one."],
  ["RAG budget",         "match_count capped at 5. v4 was uncapped at 20 — fixed."],
  ["Streaming",          "Only where UX justifies overhead: task planning, AI Review. Not routing or classification."],
  ["Token budgeting",    "Every Claude call has explicit max_tokens. No uncapped calls."],
  ["Dead call elimination", "If user never sees the result, the call does not happen."],
  ["Structured output",  "Tool use / response_format for all structured data. Never parse free-text JSON."],
];

const fmt$ = n => n < 0.01 ? `<$0.01` : `$${n.toFixed(3)}`;
const fmtMs = ms => ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s`;

function TypeRow({ d, expanded, onToggle }) {
  const isPhase2 = d.phase === 2;
  const ringColor = d.total > 0 ? T.moss : isPhase2 ? T.muted : T.lineSoft;

  return (
    <div style={{border:`1px solid ${d.total>0?T.line:T.lineSoft}`,marginBottom:6,opacity:isPhase2?.55:1}}>
      <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",cursor:"pointer",background:expanded?T.cardAlt:"transparent"}}>
        {/* Status dot */}
        <div style={{width:8,height:8,borderRadius:"50%",background:ringColor,flexShrink:0}}/>
        {/* Type name */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:display,fontSize:12,fontWeight:600,color:d.total>0?T.navy:T.muted,display:"flex",alignItems:"center",gap:6}}>
            {d.label}
            {isPhase2 && <span style={{fontFamily:mono,fontSize:7.5,color:T.muted,border:`1px solid ${T.lineSoft}`,padding:"0 4px"}}>v5.x</span>}
            {d.total > 0 && <span style={{fontFamily:mono,fontSize:8,color:"#fff",background:T.moss,padding:"1px 5px",marginLeft:4}}>{d.total}</span>}
          </div>
          <div style={{fontFamily:body,fontSize:10,color:T.muted,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.desc}</div>
        </div>
        {/* Stats */}
        {d.total > 0 ? (
          <div style={{display:"flex",gap:14,flexShrink:0}}>
            {[["Calls",d.total],["30d",d.last30],[`Cost`,fmt$(d.cost)],[`Avg`,d.avgLatency?fmtMs(d.avgLatency):"—"]].map(([k,v])=>(
              <div key={k} style={{textAlign:"right"}}>
                <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:.8}}>{k}</div>
                <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:k==="Cost"?T.brassDeep:T.ink}}>{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{fontFamily:mono,fontSize:9,color:T.muted,flexShrink:0}}>{isPhase2?"Planned":"No calls yet"}</div>
        )}
        <div style={{fontFamily:mono,fontSize:10,color:T.muted,marginLeft:6}}>{expanded?"▴":"▾"}</div>
      </div>

      {expanded && (
        <div style={{borderTop:`1px solid ${T.lineSoft}`,padding:"10px 12px",background:T.paper}}>
          <div style={{display:"flex",gap:20,marginBottom:8,flexWrap:"wrap"}}>
            <div><span style={{fontFamily:mono,fontSize:9,color:T.muted}}>Model: </span><span style={{fontFamily:mono,fontSize:9,color:T.navy,fontWeight:600}}>{d.model}</span></div>
            <div><span style={{fontFamily:mono,fontSize:9,color:T.muted}}>Location: </span><span style={{fontFamily:mono,fontSize:9,color:T.navy}}>{d.location}</span></div>
            <div><span style={{fontFamily:mono,fontSize:9,color:T.muted}}>Phase: </span><span style={{fontFamily:mono,fontSize:9,color:T.navy}}>{d.phase}</span></div>
          </div>
          {d.entries.length > 0 ? (
            <div style={{maxHeight:120,overflowY:"auto"}}>
              {d.entries.slice(0,10).map(e=>(
                <div key={e.id} style={{display:"flex",gap:10,padding:"3px 0",borderBottom:`1px solid ${T.lineSoft}`,fontSize:10}}>
                  <span style={{fontFamily:mono,fontSize:9,color:T.muted,flexShrink:0}}>{new Date(e.ts).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</span>
                  {e.agentId && <span style={{fontFamily:mono,fontSize:9,color:T.brassDeep,flexShrink:0}}>{e.agentId}</span>}
                  {e.tier && <span style={{fontFamily:mono,fontSize:8,padding:"0 4px",background:e.tier==="trained"?`${T.brass}15`:e.tier==="informed"?`${T.navy}10`:`${T.muted}10`,color:e.tier==="trained"?T.brassDeep:T.mutedDeep}}>{e.tier}</span>}
                  {e.tokens>0 && <span style={{color:T.muted}}>{e.tokens.toLocaleString()} tokens</span>}
                  {e.latencyMs>0 && <span style={{color:T.muted}}>{fmtMs(e.latencyMs)}</span>}
                  {e.cost && <span style={{color:T.brassDeep,marginLeft:"auto",flexShrink:0}}>{fmt$(e.cost)}</span>}
                </div>
              ))}
              {d.entries.length > 10 && <div style={{fontFamily:mono,fontSize:9,color:T.muted,marginTop:4}}>+{d.entries.length-10} more</div>}
            </div>
          ) : (
            <div style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic"}}>{isPhase2?"Planned for v5.x — not yet implemented.":"No calls logged in this session."}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AIActivityPanel({ onClose }) {
  const { byType, totalCost, totalCalls, clearAILog } = useAIActivity();
  const [expanded, setExpanded] = useState({});
  const [tab, setTab]           = useState("activity"); // activity | checklist

  const toggle = (type) => setExpanded(e => ({ ...e, [type]: !e[type] }));

  const phase1Types = Object.values(byType).filter(d => d.phase === 1);
  const phase2Types = Object.values(byType).filter(d => d.phase === 2);
  const activeTypes = phase1Types.filter(d => d.total > 0);

  return (
    <div style={{position:"fixed",top:0,right:0,bottom:0,width:520,background:T.card,borderLeft:`2px solid ${T.brass}`,zIndex:1000,display:"flex",flexDirection:"column",boxShadow:"-8px 0 32px rgba(0,0,0,.18)"}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${T.navy},${T.navyMid})`,padding:"14px 20px",borderBottom:`2px solid ${T.brass}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:mono,fontSize:9,color:T.brassLight,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>AI Transparency · DeepBench</div>
            <div style={{fontFamily:display,fontSize:18,fontWeight:600,color:T.card}}>AI Activity Panel</div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid rgba(255,255,255,.2)`,color:"rgba(255,255,255,.6)",width:28,height:28,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {/* Total strip */}
        <div style={{display:"flex",gap:16,marginTop:10}}>
          {[["Total Calls",totalCalls],["Session Cost",fmt$(totalCost)],["Active Types",activeTypes.length+"/"+phase1Types.length]].map(([k,v])=>(
            <div key={k}>
              <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",textTransform:"uppercase",letterSpacing:1}}>{k}</div>
              <div style={{fontFamily:display,fontSize:16,fontWeight:600,color:T.brassLight}}>{v}</div>
            </div>
          ))}
          <div style={{flex:1}}/>
          <button onClick={clearAILog} style={{fontFamily:mono,fontSize:8,color:"rgba(255,255,255,.35)",background:"transparent",border:"1px solid rgba(255,255,255,.15)",padding:"3px 8px",cursor:"pointer",textTransform:"uppercase",letterSpacing:.5,alignSelf:"flex-end"}}>Clear Log</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${T.line}`,flexShrink:0}}>
        {[["activity","Activity Log"],["checklist","Architect Checklist"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{flex:1,padding:"9px",fontFamily:mono,fontSize:9,textTransform:"uppercase",letterSpacing:1,border:"none",background:"transparent",cursor:"pointer",color:tab===id?T.navy:T.muted,fontWeight:tab===id?700:400,borderBottom:`2px solid ${tab===id?T.brass:"transparent"}`,marginBottom:-1}}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
        {tab === "activity" && (
          <>
            <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:8}}>Phase 1 · Production AI Types</div>
            {phase1Types.map(d => (
              <TypeRow key={d.type} d={d} expanded={!!expanded[d.type]} onToggle={()=>toggle(d.type)}/>
            ))}
            <div style={{fontFamily:mono,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:8,marginTop:16}}>v5.x · Planned AI Types</div>
            {phase2Types.map(d => (
              <TypeRow key={d.type} d={d} expanded={!!expanded[d.type]} onToggle={()=>toggle(d.type)}/>
            ))}
          </>
        )}

        {tab === "checklist" && (
          <div>
            <div style={{fontFamily:body,fontSize:12,color:T.mutedDeep,lineHeight:1.5,marginBottom:14,padding:"9px 12px",background:`${T.brass}06`,border:`1px solid ${T.brass}20`}}>
              Every AI call reviewed against these criteria before shipping. This is a product commitment, not documentation.
            </div>
            {CHECKLIST.map(([title, rule], i) => (
              <div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${T.lineSoft}`}}>
                <div style={{width:16,height:16,border:`1.5px solid ${T.moss}`,background:T.moss,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                  <span style={{color:"#fff",fontSize:8,fontWeight:700}}>✓</span>
                </div>
                <div>
                  <div style={{fontFamily:display,fontSize:12,fontWeight:600,color:T.navy,marginBottom:2}}>{title}</div>
                  <div style={{fontFamily:body,fontSize:11,color:T.mutedDeep,lineHeight:1.5}}>{rule}</div>
                </div>
              </div>
            ))}
            <div style={{marginTop:16,padding:"10px 12px",background:`${T.navy}08`,border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:11,color:T.mutedDeep,lineHeight:1.5}}>
              <strong style={{color:T.navy}}>Why this matters:</strong> Knowing where NOT to use AI is as important as where to use it. The checklist ensures AI is never used where deterministic logic is cheaper, faster, and more reliable.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
