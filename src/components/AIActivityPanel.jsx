// DeepBench v5.2.8 | AIActivityPanel.jsx | AI-36 — By Pattern split into Structural / Reasoning subsections
// FEATURE: AI-13 — AIActivityPanel — rename to AI Audit, add By LLM + By Agent sections
// FEATURE: AI-10 — AIActivityPanel hydrate on mount

import { useState, useEffect } from "react";
import { T, display, body, mono } from "../tokens.js";
import { useAIActivity, AI_TYPES, MODEL_PROVIDER, SERVICE_CATALOG, PATTERN_CATALOG, hydrateFromSupabase } from "../hooks/useAIActivity.js";

// FEATURE: AI-18 patch — add michelle + susan so By Agent renders full name + code
const AGENT_NAMES = {
  chloe:    { name: "Chloe Okafor",      code: "JR-01" },
  mike:     { name: "Mike Alvarez",       code: "SR-02" },
  bob:      { name: "Bob Whitfield",      code: "PR-04" },
  christy:  { name: "Christy Park",       code: "MK-05" },
  robyn:    { name: "Robyn Castellanos",  code: "CN-03" },
  brent:    { name: "Brent Matthews",     code: "DR-06" },
  pat:      { name: "Pat Smiley",         code: "IR-07" },
  michelle: { name: "Michelle Manning",   code: "PP-01" },
  susan:    { name: "Susan Smith",        code: "TR-08" },
};
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

// FEATURE: AI-23 — Service row: type badge + name + patterns + stats (no expand)
function ServiceRow({ d }) {
  const hasData = d.total > 0;
  const TYPE_BADGE = {
    ai:     { label:'AI',     bg:`rgba(90,117,56,.12)`,  color:T.moss,     border:`rgba(90,117,56,.3)`  },
    hybrid: { label:'Hybrid', bg:`rgba(182,135,58,.12)`, color:T.brassDeep,border:`rgba(182,135,58,.3)` },
    logic:  { label:'Logic',  bg:`rgba(120,109,82,.12)`, color:T.muted,    border:`rgba(120,109,82,.3)` },
  };
  const badge = TYPE_BADGE[d.serviceType] || TYPE_BADGE.ai;

  return (
    <div style={{border:`1px solid ${hasData?T.line:T.lineSoft}`,marginBottom:5,padding:"8px 12px",display:"flex",alignItems:"center",gap:10,opacity:hasData?1:.55}}>
      <span style={{fontFamily:mono,fontSize:8,fontWeight:700,letterSpacing:.5,padding:"2px 6px",background:badge.bg,color:badge.color,border:`1px solid ${badge.border}`,flexShrink:0}}>{badge.label}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:display,fontSize:12,fontWeight:600,color:hasData?T.navy:T.muted,marginBottom:1}}>{d.name}</div>
        {d.patterns.length > 0 && (
          <div style={{fontFamily:mono,fontSize:9,color:T.muted}}>{d.patterns.join(' · ')}</div>
        )}
      </div>
      {hasData ? (
        <div style={{display:"flex",gap:12,flexShrink:0}}>
          {[["Calls",d.total],[d.serviceType==='logic'?null:"Cost",d.serviceType!=='logic'?fmt$(d.cost):null],["Avg",d.avgLatency?fmtMs(d.avgLatency):"—"]].filter(x=>x[0]).map(([k,v])=>(
            <div key={k} style={{textAlign:"right"}}>
              <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:.8}}>{k}</div>
              <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:k==="Cost"?T.brassDeep:T.ink}}>{v}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{fontFamily:mono,fontSize:9,color:T.muted,flexShrink:0}}>No calls yet</div>
      )}
    </div>
  );
}

// FEATURE: AI-23 patch — PatternRow with "more" text expand
// FEATURE: AI-30 — PatternRow HITL special columns + Parallelization partial badge
function PatternRow({ d }) {
  const [showFull, setShowFull] = useState(false);
  const hasData = d.total > 0;
  const isLong  = d.desc && d.desc.length > 72;

  return (
    <div style={{border:`1px solid ${d.active?T.line:T.lineSoft}`,marginBottom:5,padding:"8px 12px",display:"flex",alignItems:"flex-start",gap:10,opacity:d.active?1:.45}}>
      <div style={{width:8,height:8,borderRadius:"50%",background:hasData?T.moss:d.active?T.line:T.lineSoft,flexShrink:0,marginTop:3}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:display,fontSize:12,fontWeight:600,color:d.active?T.navy:T.muted,marginBottom:2}}>{d.name}</div>
        <div style={{fontFamily:body,fontSize:10,color:T.muted,lineHeight:1.45}}>
          {showFull || !isLong ? d.desc : d.desc.slice(0, 72) + "…"}
          {isLong && (
            <span
              onClick={()=>setShowFull(v=>!v)}
              style={{fontFamily:mono,fontSize:9,color:T.brass,cursor:"pointer",marginLeft:4,flexShrink:0}}
            >
              {showFull ? "less" : "more"}
            </span>
          )}
        </div>
      </div>
      {d.hitlSpecial ? (
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
          <div style={{display:"flex",gap:12}}>
            {[["Gates Triggered","—"],["Avg Response Time","—"]].map(([k,v])=>(
              <div key={k} style={{textAlign:"right"}}>
                <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:.8,whiteSpace:"nowrap"}}>{k}</div>
                <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:T.ink}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{fontFamily:mono,fontSize:8,color:T.brass,border:`1px solid ${T.brass}40`,padding:"1px 5px",marginTop:1}}>🔶 Partial · TI-18 required</div>
        </div>
      ) : d.active ? (
        hasData ? (
          <div style={{display:"flex",gap:12,flexShrink:0}}>
            {[["Calls",d.total],["Cost",fmt$(d.cost)]].map(([k,v])=>(
              <div key={k} style={{textAlign:"right"}}>
                <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:.8}}>{k}</div>
                <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:k==="Cost"?T.brassDeep:T.ink}}>{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{fontFamily:mono,fontSize:9,color:T.muted,flexShrink:0}}>No calls yet</div>
        )
      ) : d.partial ? (
        <div style={{fontFamily:mono,fontSize:8,color:T.brass,flexShrink:0,border:`1px solid ${T.brass}40`,padding:"1px 5px"}}>🔶 Partial · TT-01/02</div>
      ) : (
        <div style={{fontFamily:mono,fontSize:8,color:T.muted,flexShrink:0,border:`1px solid ${T.lineSoft}`,padding:"1px 5px"}}>Not yet active</div>
      )}
    </div>
  );
}

// FEATURE: AI-23 patch — MCP card with expandable description
function McpCard({ item }) {
  const [showFull, setShowFull] = useState(false);
  const isLong = item.desc && item.desc.length > 80;
  return (
    <div style={{border:`1px solid ${T.line}`,marginBottom:8,padding:"10px 12px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
        <span style={{fontFamily:mono,fontSize:8,fontWeight:700,padding:"2px 6px",background:item.tierBg,color:item.tierColor,border:`1px solid ${item.tierBorder}`,flexShrink:0}}>
          {item.tier}
        </span>
        <div style={{fontFamily:display,fontSize:13,fontWeight:600,color:T.navy}}>{item.name}</div>
        <div style={{fontFamily:mono,fontSize:8,color:T.muted,marginLeft:"auto",flexShrink:0}}>Phase 4+</div>
      </div>
      <div style={{fontFamily:body,fontSize:11,color:T.mutedDeep,lineHeight:1.5,marginBottom:4}}>
        {showFull || !isLong ? item.desc : item.desc.slice(0, 80) + "…"}
        {isLong && (
          <span onClick={()=>setShowFull(v=>!v)} style={{fontFamily:mono,fontSize:9,color:T.brass,cursor:"pointer",marginLeft:4}}>
            {showFull ? "less" : "more"}
          </span>
        )}
      </div>
      <div style={{fontFamily:mono,fontSize:9,color:T.muted}}>Caller: {item.caller}</div>
    </div>
  );
}

// FEATURE: AI-23 patch — reusable collapsible section header
function SectionHeader({ label, open, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 2px",cursor:"pointer",borderTop:`1px solid ${T.lineSoft}`,marginTop:18,userSelect:"none"}}
    >
      <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>{label}</div>
      <div style={{fontFamily:mono,fontSize:16,color:T.brassDeep,lineHeight:1,marginRight:2}}>{open ? "▲" : "▼"}</div>
    </div>
  );
}

const MCP_SURFACES = [
  { tier:"Free / Basic",  tierColor:T.muted,    tierBg:`rgba(120,109,82,.1)`,  tierBorder:`rgba(120,109,82,.3)`,  name:"MCP Agent",       desc:"Expose a named agent as an MCP server — any MCP-compatible client can ask Chloe, Mike, or Robyn a question directly.",                                                                    caller:"Claude Desktop · External AI clients" },
  { tier:"Paid",          tierColor:T.brassDeep, tierBg:`rgba(182,135,58,.1)`, tierBorder:`rgba(182,135,58,.3)`,  name:"MCP Capability",  desc:"Expose a specific capability without the full agent persona — call NIGP Risk Assessment directly without routing through an agent.",                                                       caller:"Specialized integrations" },
  { tier:"Paid",          tierColor:T.brassDeep, tierBg:`rgba(182,135,58,.1)`, tierBorder:`rgba(182,135,58,.3)`,  name:"MCP Deliverable", desc:"Expose the deliverable production pipeline — caller submits a goal and receives a structured typed deliverable output.",                                                             caller:"External systems · Other AI agents" },
  { tier:"Enterprise",    tierColor:"#fff",      tierBg:T.navy,                tierBorder:T.navy,                 name:"MCP Service",     desc:"Expose a single AI Service directly at the finest granularity — enables infrastructure-level licensing of individual services.",                                                     caller:"Infrastructure consumers" },
  { tier:"Enterprise",    tierColor:"#fff",      tierBg:T.navy,                tierBorder:T.navy,                 name:"MCP Workflow",    desc:"Expose a full multi-step task pipeline — caller submits a goal and receives a completed task with all step deliverables.",                                                           caller:"Enterprise clients" },
  { tier:"Enterprise",    tierColor:"#fff",      tierBg:T.navy,                tierBorder:T.navy,                 name:"MCP Training",    desc:"Allow external systems to push training material to a named agent via MCP — enterprise DMS and CMS integrations feed agents automatically. ⇐ Bidirectional.",                     caller:"Enterprise DMS · CMS systems" },
  { tier:"Enterprise",    tierColor:"#fff",      tierBg:T.navy,                tierBorder:T.navy,                 name:"MCP Feedback",    desc:"Allow external systems to send approval or change-request signals via MCP — closes the feedback loop without requiring a DeepBench login. ⇐ Bidirectional.",                       caller:"External workflow systems" },
];

export default function AIActivityPanel({ onClose }) {
  const { byService, byPattern, byLLM, byAgent, modelsInUse, totalCost, totalCalls, servicesActive, patternsActiveCount, patternsCatalogTotal, servicesSorted, patternsSorted, agentsSorted } = useAIActivity();
  const [tab, setTab] = useState("activity");
  // FEATURE: AI-23 patch — per-section collapse state; roadmap collapsed by default
  const [sections, setSections] = useState({ pattern:true, service:true, llm:true, agent:true, roadmap:false });
  const [zeroClosed, setZeroClosed] = useState(true);
  const [inactivePtnClosed, setInactivePtnClosed] = useState(true);
  const toggle = (key) => setSections(s => ({ ...s, [key]: !s[key] }));

  // FEATURE: AI-10 — Hydrate lifetime totals from Supabase once on mount
  useEffect(() => {
    hydrateFromSupabase();
  }, []);

  return (
    <div style={{position:"fixed",top:0,right:0,bottom:0,width:650,background:T.card,borderLeft:`2px solid ${T.brass}`,zIndex:1000,display:"flex",flexDirection:"column",boxShadow:"-8px 0 32px rgba(0,0,0,.18)"}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${T.navy},${T.navyMid})`,padding:"14px 20px",borderBottom:`2px solid ${T.brass}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:mono,fontSize:9,color:T.brassLight,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>AI Transparency · DeepBench</div>
            <div style={{fontFamily:display,fontSize:18,fontWeight:600,color:T.card}}>AI Audit</div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid rgba(255,255,255,.2)`,color:"rgba(255,255,255,.6)",width:28,height:28,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {/* Total strip */}
        <div style={{display:"flex",gap:16,marginTop:10}}>
          {[
            ["Total Calls",    totalCalls],
            ["Total Cost",     fmt$(totalCost)],
            ["Services Active",`${servicesActive}/14`],
            ["Patterns Active",`${patternsActiveCount}/${patternsCatalogTotal}`],
            ["Models in Use",  modelsInUse],
          ].map(([k,v])=>(
            <div key={k}>
              <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",textTransform:"uppercase",letterSpacing:1}}>{k}</div>
              <div style={{fontFamily:display,fontSize:15,fontWeight:600,color:T.brassLight}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${T.line}`,flexShrink:0}}>
        {[["activity","Activity Log"],["mcp","MCP Roadmap"],["checklist","Architect Checklist"]].map(([id,label])=>(
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
            {/* FEATURE: AI-23 patch — Pattern section first, collapsible */}
            {/* FEATURE: AI-32 — By Pattern inactive collapse card */}
            {/* FEATURE: AI-36 — By Pattern section split into Structural and Reasoning subsections */}
            <SectionHeader label="By Pattern · Industry Catalog" open={sections.pattern} onToggle={()=>toggle('pattern')}/>
            {sections.pattern && (
              patternsSorted.length === 0
                ? <div style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic",padding:"6px 0"}}>No pattern data yet.</div>
                : (() => {
                    const structural = patternsSorted.filter(p => (p.active || p.partial) && p.patternType === 'structural');
                    const reasoning  = patternsSorted.filter(p => (p.active || p.hitlSpecial || p.partial) && p.patternType === 'reasoning');
                    const inactive   = patternsSorted.filter(p => !p.active && !p.hitlSpecial && !p.partial);
                    return (
                      <>
                        {/* FEATURE: AI-36 — Structural subsection */}
                        {structural.length > 0 && (
                          <>
                            <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,padding:"8px 0 4px",borderBottom:`1px solid ${T.lineSoft}`,marginBottom:4}}>Structural</div>
                            {structural.map(pat => <PatternRow key={pat.slug} d={pat}/>)}
                          </>
                        )}

                        {/* FEATURE: AI-36 — Reasoning subsection */}
                        {reasoning.length > 0 && (
                          <>
                            <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,padding:"8px 0 4px",borderBottom:`1px solid ${T.lineSoft}`,marginBottom:4,marginTop:8}}>Reasoning</div>
                            {reasoning.map(pat => <PatternRow key={pat.slug} d={pat}/>)}
                          </>
                        )}

                        {/* Inactive collapse card — unchanged */}
                        {inactive.length > 0 && (
                          <div style={{border:`1px solid ${T.lineSoft}`,marginTop:8,marginBottom:4}}>
                            <div
                              onClick={()=>setInactivePtnClosed(o=>!o)}
                              style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",cursor:"pointer"}}
                            >
                              <div style={{fontFamily:body,fontSize:12,color:T.muted,fontStyle:"italic"}}>Not yet active · {inactive.length} patterns</div>
                              <div style={{fontFamily:mono,fontSize:14,color:T.muted}}>{inactivePtnClosed?"▼":"▲"}</div>
                            </div>
                            {!inactivePtnClosed && inactive.map(pat => <PatternRow key={pat.slug} d={pat}/>)}
                          </div>
                        )}
                      </>
                    );
                  })()
            )}

            {/* FEATURE: AI-23 patch — Service section, grouped by type, collapsible */}
            <SectionHeader label="By Service" open={sections.service} onToggle={()=>toggle('service')}/>
            {sections.service && (() => {
              const withCalls = servicesSorted.filter(s => s.total > 0);
              const zeroCalls = servicesSorted.filter(s => s.total === 0);
              const aiSvcs     = withCalls.filter(s => s.serviceType === 'ai');
              const hybridSvcs = withCalls.filter(s => s.serviceType === 'hybrid');
              const logicSvcs  = withCalls.filter(s => s.serviceType === 'logic');

              return (
                <>
                  {aiSvcs.length > 0 && (
                    <>
                      <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,padding:"8px 0 4px",borderBottom:`1px solid ${T.lineSoft}`,marginBottom:4}}>AI Services</div>
                      {aiSvcs.map(svc => <ServiceRow key={svc.slug} d={svc}/>)}
                    </>
                  )}
                  {hybridSvcs.length > 0 && (
                    <>
                      <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,padding:"8px 0 4px",borderBottom:`1px solid ${T.lineSoft}`,marginBottom:4,marginTop:8}}>Hybrid Services</div>
                      {hybridSvcs.map(svc => <ServiceRow key={svc.slug} d={svc}/>)}
                    </>
                  )}
                  {logicSvcs.length > 0 && (
                    <>
                      <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,padding:"8px 0 4px",borderBottom:`1px solid ${T.lineSoft}`,marginBottom:4,marginTop:8}}>Logic Services</div>
                      {logicSvcs.map(svc => <ServiceRow key={svc.slug} d={svc}/>)}
                    </>
                  )}
                  {zeroCalls.length > 0 && (
                    <div style={{border:`1px solid ${T.lineSoft}`,marginTop:8,marginBottom:4}}>
                      <div
                        onClick={()=>setZeroClosed(o=>!o)}
                        style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",cursor:"pointer"}}
                      >
                        <div style={{fontFamily:body,fontSize:12,color:T.muted,fontStyle:"italic"}}>Not yet called · {zeroCalls.length} services</div>
                        <div style={{fontFamily:mono,fontSize:14,color:T.muted}}>{zeroClosed?"▼":"▲"}</div>
                      </div>
                      {!zeroClosed && zeroCalls.map(svc => <ServiceRow key={svc.slug} d={svc}/>)}
                    </div>
                  )}
                </>
              );
            })()}

            {/* By LLM — collapsible, unchanged data */}
            <SectionHeader label="By LLM" open={sections.llm} onToggle={()=>toggle('llm')}/>
            {sections.llm && (
              Object.values(byLLM).length === 0
                ? <div style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic",padding:"6px 0"}}>No LLM calls logged yet.</div>
                : Object.values(byLLM).map(d => (
                  <div key={d.model} style={{border:`1px solid ${T.line}`,marginBottom:6,padding:"9px 12px",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:d.calls>0?T.moss:T.lineSoft,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:display,fontSize:12,fontWeight:600,color:T.navy}}>{d.model}</div>
                      <div style={{fontFamily:body,fontSize:10,color:T.muted}}>{MODEL_PROVIDER[d.model]||"Unknown provider"}</div>
                    </div>
                    <div style={{display:"flex",gap:14,flexShrink:0}}>
                      {[["Total",d.calls],["Cost",fmt$(d.cost)],["Avg",d.avgLatency?fmtMs(d.avgLatency):"—"]].map(([k,v])=>(
                        <div key={k} style={{textAlign:"right"}}>
                          <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:.8}}>{k}</div>
                          <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:k==="Cost"?T.brassDeep:T.ink}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}

            {/* By Agent — collapsible, sorted by calls desc */}
            <SectionHeader label="By Agent" open={sections.agent} onToggle={()=>toggle('agent')}/>
            {sections.agent && (
              agentsSorted.length === 0
                ? <div style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic",padding:"6px 0"}}>No agent calls logged yet.</div>
                : agentsSorted.map(d => {
                  const info = AGENT_NAMES[d.agentId] || { name: d.agentId, code: "—" };
                  return (
                    <div key={d.agentId} style={{border:`1px solid ${T.line}`,marginBottom:6,padding:"9px 12px",display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:T.moss,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:display,fontSize:12,fontWeight:600,color:T.navy}}>{info.name}</div>
                        <div style={{fontFamily:mono,fontSize:9,color:T.muted}}>{info.code}</div>
                      </div>
                      <div style={{display:"flex",gap:14,flexShrink:0}}>
                        {[["Total",d.calls],["Cost",fmt$(d.cost)],["Avg",d.avgLatency?fmtMs(d.avgLatency):"—"]].map(([k,v])=>(
                          <div key={k} style={{textAlign:"right"}}>
                            <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:.8}}>{k}</div>
                            <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:k==="Cost"?T.brassDeep:T.ink}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
            )}

            {/* FEATURE: AI-23 patch — Roadmap collapsible; Patterns Now tier removed */}
            <SectionHeader label="Platform Roadmap" open={sections.roadmap} onToggle={()=>toggle('roadmap')}/>
            {/* FEATURE: AI-33 — Platform Roadmap: Next + Later only, 2-column AI Patterns × DeepBench Services */}
            {sections.roadmap && (
              <div style={{paddingBottom:12}}>
                {[
                  { key:'next',  label:'Next',  color:T.brass },
                  { key:'later', label:'Later',  color:T.muted },
                ].map(({ key, label, color }) => {
                  const tierPats = PATTERN_CATALOG.filter(p => !p.active && p.roadmap === key);
                  const tierSvcs = SERVICE_CATALOG.filter(s => s.roadmap === key);
                  return (
                    <div key={key} style={{marginBottom:16}}>
                      <div style={{fontFamily:mono,fontSize:9,fontWeight:700,color,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8,paddingBottom:4,borderBottom:`1px solid ${T.lineSoft}`}}>{label}</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                        <div>
                          <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:5}}>AI Patterns</div>
                          {tierPats.map(p => (
                            <div key={p.slug} style={{fontFamily:body,fontSize:11,color:T.mutedDeep,paddingLeft:8,borderLeft:`2px solid ${color}30`,marginLeft:2,marginBottom:4}}>{p.name}</div>
                          ))}
                        </div>
                        <div>
                          <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:5}}>DeepBench Services</div>
                          {tierSvcs.map(s => (
                            <div key={s.slug} style={{fontFamily:body,fontSize:11,color:T.mutedDeep,paddingLeft:8,borderLeft:`2px solid ${color}30`,marginLeft:2,marginBottom:4}}>{s.name}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "mcp" && (
          // FEATURE: AI-23 — MCP Roadmap tab (static, Phase 4+; design session S-MCP-01 required before coding)
          <div>
            <div style={{fontFamily:body,fontSize:12,color:T.mutedDeep,lineHeight:1.6,marginBottom:14,padding:"9px 12px",background:`${T.brass}06`,border:`1px solid ${T.brass}20`}}>
              DeepBench can be called by any MCP-compatible client — Claude Desktop, external AI agents, enterprise systems — at any level of the platform stack.
            </div>

            {/* Bidirectional callout */}
            <div style={{fontFamily:body,fontSize:11,color:T.mutedDeep,lineHeight:1.6,marginBottom:16,padding:"8px 12px",background:`${T.navy}06`,border:`1px solid ${T.lineSoft}`}}>
              <strong style={{color:T.navy}}>Bidirectional integration:</strong> MCP Training and MCP Feedback are the only surfaces where the data flow reverses — external systems push material IN and push approvals OUT. Every other surface is DeepBench responding to a caller. These two make DeepBench an active participant in an external system's workflow, not just a responder.
            </div>

            {/* MCP surface table */}
            {MCP_SURFACES.map(item => <McpCard key={item.name} item={item}/>)}

            <div style={{marginTop:12,padding:"9px 12px",background:`${T.flag}06`,border:`1px solid ${T.flag}20`,fontFamily:body,fontSize:11,color:T.mutedDeep,lineHeight:1.5}}>
              <strong style={{color:T.navy}}>S-MCP-01 design session required before any MCP surface is built.</strong> Auth model, rate limiting, pricing integration, and which surface ships first are all unresolved — they're design decisions, not implementation details.
            </div>
          </div>
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
