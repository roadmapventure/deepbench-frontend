// DeepBench v5.2.4 | AIReviewTab.jsx | AI-28 AI_REVIEW pattern badge label
// FEATURE: AZ-15 — Tab: AI Review
// src/screens/analyzer/AIReviewTab.jsx — v5.0.0
// AI Review tab — 3-stage agent picker, briefing generation, results + Christy upsell

import { useState } from "react";
import { T, display, body, mono, fmtFull, fmtPct } from "../../tokens.js";
import { TENANT_ID } from "../../config.js";
import { Corners, AiBadge, AgentAvatar } from "../../components/SharedUI.jsx";
import { sanitizeBriefingHtml, analyzeAiText, computeDelta } from "../../utils.js";
import { setAIStatus, clearAIStatus } from "../../hooks/useAIStatus.js";
import { logAICall } from "../../hooks/useAIActivity.js";
import { AI_PAT } from "../../aiPatterns.js";

export default function AIReviewTab({ data, fileName, agents, mapping,
  aiReviewStage, setAiReviewStage,
  aiPickedAgents, setAiPickedAgents,
  aiResults, setAiResults,
  aiReviewError, setAiReviewError,
  aiChristySelected, setAiChristySelected,
  sessionConfigs, setSessionConfig,
  agentConfigOptions, loadAgentConfigOptions,
}) {
  const a1id = aiPickedAgents[0];
  const a2id = aiPickedAgents[1];
  const a1 = agents.find(a => a.id === a1id);
  const a2 = agents.find(a => a.id === a2id);
  const totalCost = aiPickedAgents.reduce((s,id)=>{const a=agents.find(x=>x.id===id);return s+(a?.reportCost||0);},0);
  const showDelta = aiReviewStage===3 && a1id && a2id && aiResults[a1id] && aiResults[a2id];
  const m1 = showDelta ? analyzeAiText(aiResults[a1id]) : null;
  const m2 = showDelta ? analyzeAiText(aiResults[a2id]) : null;
  const SBAR = [["Words",m1?.words,m2?.words],["Statutes",m1?.statutes,m2?.statutes],["$ Refs",m1?.dollars,m2?.dollars],["Org Refs",m1?.orgs,m2?.orgs],["Data Claims",m1?.claims,m2?.claims],["Hedges",m1?.hedges,m2?.hedges]];

  const toggleAiAgent = (id) => {
    setAiPickedAgents(prev => {
      if (prev.includes(id)) return prev.filter(x=>x!==id);
      if (prev.length >= 2) return prev;
      loadAgentConfigOptions(id);
      return [...prev, id];
    });
  };

  const runAiReview = async () => {
    if (aiPickedAgents.length === 0) return;
    setAiReviewStage(2); setAiResults({}); setAiReviewError("");
    const top5cats = data.classArr.slice(0,5).map(c=>`${c.displayLabel}: ${fmtFull(c.total)} (${(c.total/data.totalSpend*100).toFixed(1)}%)`);
    const top5vend = data.vendorArr.slice(0,5).map(v=>`${v.name}: ${fmtFull(v.total)} (${(v.total/data.totalSpend*100).toFixed(1)}%)`);
    const flagSummary = data.flags.map(f=>`[${f.severity.toUpperCase()}] ${f.title}: ${f.summary}`);
    const userMsg = `Analyze this procurement portfolio for an executive briefing.\n\nFile: ${fileName}\nTotal Spend: ${fmtFull(data.totalSpend)}\nTransactions: ${data.txCount.toLocaleString()}\nCategories: ${data.classArr.length}\nVendors: ${data.vendorArr.length}\n\nTOP CATEGORIES:\n${top5cats.join("\n")}\n\nTOP VENDORS:\n${top5vend.join("\n")}\n\nFLAGS:\n${flagSummary.join("\n")}\n\nWrite four sections: Portfolio Overview, Risk Assessment, Strategic Opportunities, Bottom Line. Use flowing paragraphs, no bullet points.`;
    try {
      const newResults = {};
      for (const agentId of aiPickedAgents) {
        const agent = agents.find(a=>a.id===agentId);
        setAIStatus(`${agent?.name.split(" ")[0]} is writing your briefing…`);
        const agentSession = sessionConfigs[agentId] || {};
        const t0 = Date.now();
        const res = await fetch("/api/brief", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            messages:[{role:"user",content:userMsg}],
            agent_id:agentId, tenant_id:TENANT_ID,
            role_prompt_id:agentSession.role_prompt_id||undefined,
            output_format_id:agentSession.output_format_id||undefined,
            ragContext:{queryText:`${data.flags.map(f=>f.title).join(" ")} procurement analysis ${fileName}`,jurisdiction:"Texas",triggers:[]},
          }),
        });
        const json = await res.json();
        newResults[agentId] = json.content?.[0]?.text || json.error || "No response";
      }
      setAiResults(newResults);
      setAiReviewStage(3);
    } catch(err) {
      setAiReviewError("Generation failed: " + err.message);
      setAiReviewStage(2);
    }
    clearAIStatus();
  };

  return (
    <div style={{maxWidth:"100%"}}>
      {/* Header */}
      <div style={{marginBottom:4}}>
        <div style={{fontFamily:mono,fontSize:9.5,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.8,fontWeight:600,marginBottom:5}}>Strategy · AI Review</div>
        <div style={{fontFamily:display,fontSize:26,fontWeight:500,color:T.navy,letterSpacing:"-.5px",marginBottom:5}}>Your AI Team's Strategic Report</div>
        <div style={{fontFamily:body,fontStyle:"italic",fontSize:13,color:T.mutedDeep,marginBottom:16,maxWidth:580}}>Choose up to 2 analysts from your team. Each will review your data through the lens of their specialty and knowledge base.</div>
      </div>
      <div style={{height:2,background:T.brass,marginBottom:18}}/>

      {/* Stage tabs */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:`2px solid ${T.brass}`}}>
        {[["① Pick Your Team",1],["② Generating",2],["③ Review & Choose",3]].map(([label,n])=>(
          <div key={n} style={{padding:"8px 20px",fontFamily:mono,fontSize:10,letterSpacing:1,textTransform:"uppercase",color:aiReviewStage===n?T.navy:aiReviewStage>n?T.moss:T.muted,fontWeight:aiReviewStage===n?700:400,borderBottom:`2px solid ${aiReviewStage===n?T.navy:"transparent"}`,marginBottom:-2,cursor:aiReviewStage>n?"pointer":"default"}} onClick={()=>aiReviewStage>n&&setAiReviewStage(n)}>{label}</div>
        ))}
      </div>

      {/* STAGE 1: PICK */}
      {aiReviewStage===1&&(
        <div>
          <div style={{fontFamily:body,fontSize:12,color:T.muted,fontStyle:"italic",marginBottom:16,padding:"9px 14px",background:`${T.brass}06`,border:`1px solid ${T.brass}20`}}>
            Select 1 or 2 analysts to generate your strategic report. All agents available — AI routing suggests the best fit.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:12,marginBottom:16}}>
            {agents.map(a=>{
              const isSel = aiPickedAgents.includes(a.id);
              const bc = isSel ? (a.color===T.moss?T.moss:T.brass) : T.line;
              return(
                <div key={a.id} onClick={()=>toggleAiAgent(a.id)} style={{background:isSel?`${bc}08`:T.card,border:`2px solid ${bc}`,position:"relative",cursor:"pointer",padding:"12px 10px",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",boxShadow:isSel?`0 0 0 1px ${bc}30`:"none",transition:"all .15s"}}>
                  {isSel&&<div style={{position:"absolute",top:7,right:7,width:16,height:16,borderRadius:"50%",background:bc,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:8,fontWeight:700}}>✓</span></div>}
                  <div style={{width:48,height:48,borderRadius:"50%",background:T.paperDeep,border:`2px solid ${bc}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:7,fontFamily:display,fontSize:18,fontWeight:700,color:bc}}>{a.name[0]}</div>
                  <div style={{fontFamily:display,fontSize:12,fontWeight:600,color:T.navy,marginBottom:1}}>{a.name.split(" ")[0]}</div>
                  <div style={{fontFamily:body,fontSize:9.5,color:T.mutedDeep,fontStyle:"italic",marginBottom:6,lineHeight:1.3}}>{a.role}</div>
                  <div style={{fontFamily:mono,fontSize:8,padding:"1px 5px",border:`1px solid ${bc}40`,color:a.color===T.moss?T.moss:T.brassDeep,background:`${bc}08`,marginBottom:6}}>{a.arch}</div>
                  <div style={{width:"100%",height:4,background:T.paperDeep,border:`1px solid ${T.lineSoft}`,position:"relative",marginBottom:5}}>
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${a.skill}%`,background:a.color===T.moss?T.moss:T.brass}}/>
                  </div>
                  <div style={{fontFamily:mono,fontSize:10,fontWeight:700,color:a.situational>=30?T.brass:T.muted}}>{a.situational}%</div>
                  <div style={{fontFamily:body,fontSize:9,color:T.muted,fontStyle:"italic",marginBottom:5}}>situational awareness</div>
                  {a.reportCost===0
                    ?<div style={{fontFamily:mono,fontSize:10.5,color:T.moss,fontWeight:700,paddingTop:5,borderTop:`1px solid ${T.lineSoft}`,width:"100%",textAlign:"center"}}>Free</div>
                    :<div style={{fontFamily:mono,fontSize:10.5,color:T.brassDeep,fontWeight:700,paddingTop:5,borderTop:`1px solid ${T.lineSoft}`,width:"100%",textAlign:"center"}}>${a.reportCost}</div>
                  }
                </div>
              );
            })}
          </div>

          {/* Session config selectors */}
          {aiPickedAgents.map(agentId=>{
            const opts = agentConfigOptions[agentId];
            if(!opts) return null;
            const hasRoleChoice   = opts.rolePrompts.filter(c=>c.is_user_selectable).length>0;
            const hasFormatChoice = opts.outputFormats.filter(c=>c.is_user_selectable).length>0;
            if(!hasRoleChoice&&!hasFormatChoice) return null;
            const agentDef    = agents.find(a=>a.id===agentId);
            const agentSession = sessionConfigs[agentId]||{};
            return(
              <div key={agentId} style={{background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:"10px 14px",marginBottom:8,display:"flex",gap:14,alignItems:"flex-end",flexWrap:"wrap"}}>
                <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,alignSelf:"center",flexShrink:0}}>{agentDef?.name.split(" ")[0]} →</div>
                {hasRoleChoice&&(
                  <div>
                    <div style={{fontFamily:mono,fontSize:8.5,color:T.muted,textTransform:"uppercase",letterSpacing:.8,marginBottom:3}}>Role Prompt</div>
                    <select value={agentSession.role_prompt_id||""} onChange={e=>setSessionConfig(agentId,"role_prompt_id",e.target.value)} style={{background:T.paper,border:`1px solid ${T.line}`,padding:"5px 9px",fontFamily:body,fontSize:11.5,color:T.ink,cursor:"pointer",minWidth:160}}>
                      {opts.rolePrompts.map(c=><option key={c.id} value={c.id}>{c.name}{c.is_default?" (default)":""}</option>)}
                    </select>
                  </div>
                )}
                {hasFormatChoice&&(
                  <div>
                    <div style={{fontFamily:mono,fontSize:8.5,color:T.muted,textTransform:"uppercase",letterSpacing:.8,marginBottom:3}}>Output Format</div>
                    <select value={agentSession.output_format_id||""} onChange={e=>setSessionConfig(agentId,"output_format_id",e.target.value)} style={{background:T.paper,border:`1px solid ${T.line}`,padding:"5px 9px",fontFamily:body,fontSize:11.5,color:T.ink,cursor:"pointer",minWidth:160}}>
                      {opts.outputFormats.map(c=><option key={c.id} value={c.id}>{c.name}{c.is_default?" (default)":""}</option>)}
                    </select>
                  </div>
                )}
              </div>
            );
          })}

          {/* Selected strip + generate */}
          <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative"}}>
            <Corners/>
            <div>
              <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.3,fontWeight:600,marginBottom:5}}>Selected Analysts</div>
              {aiPickedAgents.length===0
                ?<div style={{fontFamily:body,fontSize:12,color:T.muted,fontStyle:"italic"}}>No analysts selected yet</div>
                :<div style={{display:"flex",gap:16,alignItems:"center"}}>
                  {aiPickedAgents.map((id,i)=>{const a=agents.find(x=>x.id===id);return(
                    <span key={id} style={{display:"flex",alignItems:"center",gap:6,fontFamily:body,fontSize:12,fontWeight:600,color:T.navy}}>
                      {i>0&&<span style={{color:T.muted,fontFamily:mono,fontSize:10}}>+</span>}
                      <span style={{width:22,height:22,borderRadius:"50%",border:`1.5px solid ${a?.color||T.brass}`,background:T.paperDeep,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:a?.color||T.brass}}>{a?.name[0]}</span>
                      {a?.name.split(" ")[0]}
                      <span style={{fontFamily:mono,fontSize:10,color:a?.reportCost===0?T.moss:T.brassDeep}}>{a?.reportCost===0?"Free":"$"+a?.reportCost}</span>
                    </span>
                  );})}
                </div>
              }
            </div>
            <div style={{textAlign:"right"}}>
              {aiPickedAgents.length>0&&<div style={{fontFamily:mono,fontSize:10,color:T.muted,marginBottom:8}}>Total cost: <strong style={{color:T.brassDeep}}>{totalCost===0?"Free":"$"+totalCost}</strong> · ~60 seconds</div>}
              <button onClick={runAiReview} disabled={aiPickedAgents.length===0} style={{background:aiPickedAgents.length===0?T.line:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,border:"none",color:aiPickedAgents.length===0?T.muted:T.navy,padding:"11px 24px",fontFamily:display,fontSize:14,fontWeight:700,cursor:aiPickedAgents.length===0?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:8}}>
                <span>⚡</span> Generate Strategic Report {/* FEATURE: AI-28 — AI_REVIEW pattern label */}<AiBadge style={{marginLeft:4}} label={AI_PAT.AI_REVIEW}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: GENERATING */}
      {aiReviewStage===2&&(
        <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"18px 20px"}}>
          <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:14}}>Generating Your Reports…</div>
          <div style={{display:"grid",gridTemplateColumns:aiPickedAgents.length===2?"1fr 1fr":"1fr",gap:16}}>
            {aiPickedAgents.map(id=>{
              const a=agents.find(x=>x.id===id);
              return(
                <div key={id} style={{background:T.cardAlt,border:`1px solid ${T.line}`,padding:"20px",textAlign:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${T.lineSoft}`}}>
                    <div style={{width:36,height:36,borderRadius:"50%",border:`1.5px solid ${a?.color||T.brass}`,background:T.paperDeep,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:display,fontSize:15,fontWeight:700,color:a?.color||T.brass}}>{a?.name[0]}</div>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontFamily:display,fontSize:14,fontWeight:600,color:T.navy}}>{a?.name}</div>
                      <div style={{fontFamily:body,fontSize:11,color:T.mutedDeep,fontStyle:"italic"}}>{a?.role}</div>
                    </div>
                  </div>
                  <div style={{width:40,height:40,border:`3px solid ${T.brass}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 12px"}}/>
                  <div style={{fontFamily:body,fontSize:12,color:T.muted,fontStyle:"italic"}}>Analyzing {data.txCount.toLocaleString()} transactions…</div>
                </div>
              );
            })}
          </div>
          {aiReviewError&&<div style={{marginTop:14,background:`${T.flag}10`,border:`1px solid ${T.flag}40`,padding:"12px 16px",color:T.flag,fontSize:13}}>⚠ {aiReviewError} <button onClick={()=>setAiReviewStage(1)} style={{marginLeft:12,background:"transparent",border:`1px solid ${T.flag}`,color:T.flag,padding:"3px 10px",cursor:"pointer",fontFamily:body,fontSize:12}}>← Back</button></div>}
        </div>
      )}

      {/* STAGE 3: RESULTS */}
      {aiReviewStage===3&&(
        <div>
          {/* Context strip */}
          <div style={{background:`linear-gradient(135deg,${T.navy},${T.navyMid})`,color:T.card,padding:"11px 20px",marginBottom:16,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
            <div style={{fontFamily:mono,fontSize:9,color:"#8fa3bf",textTransform:"uppercase",letterSpacing:1.2}}>Analyzing</div>
            {[["File",fileName.replace(/\.csv$/i,"")],["Total Spend",fmtFull(data.totalSpend)],["Transactions",data.txCount.toLocaleString()],["Health Flags",data.flags.length]].map(([k,v])=>(
              <div key={k} style={{borderLeft:`1px solid rgba(255,255,255,.12)`,paddingLeft:16}}>
                <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",textTransform:"uppercase",letterSpacing:1.2,marginBottom:2}}>{k}</div>
                <div style={{fontFamily:display,fontSize:14,fontWeight:600,color:T.card}}>{v}</div>
              </div>
            ))}
            <div style={{flex:1}}/>
            <button onClick={()=>{setAiReviewStage(1);setAiPickedAgents([]);setAiResults({});setAiChristySelected(false);}} style={{background:"transparent",border:`1px solid rgba(248,242,226,.3)`,color:"#b8c5d8",padding:"5px 12px",fontFamily:body,fontSize:11,cursor:"pointer"}}>← New Report</button>
          </div>

          {/* Reports side by side */}
          <div style={{display:"grid",gridTemplateColumns:aiPickedAgents.length===2?"1fr 1fr":"1fr",gap:16,marginBottom:16}}>
            {aiPickedAgents.map(id=>{
              const a=agents.find(x=>x.id===id);
              const text=aiResults[id]||"";
              return(
                <div key={id} style={{display:"flex",flexDirection:"column"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:T.cardAlt,border:`1px solid ${a?.color===T.moss?T.moss:T.line}`,borderBottom:"none"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",border:`1.5px solid ${a?.color||T.brass}`,background:T.paperDeep,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:display,fontSize:12,fontWeight:700,color:a?.color||T.brass}}>{a?.name[0]}</div>
                    <div>
                      <div style={{fontFamily:display,fontSize:13,fontWeight:600,color:T.navy}}>{a?.name}</div>
                      <div style={{fontFamily:mono,fontSize:9,color:T.muted}}>{a?.arch} · {a?.situational}% awareness</div>
                    </div>
                    <div style={{marginLeft:"auto",fontFamily:mono,fontSize:10,color:a?.reportCost===0?T.moss:T.brassDeep,fontWeight:700}}>{a?.reportCost===0?"Free":"$"+a?.reportCost}</div>
                  </div>
                  <div style={{background:T.card,border:`1px solid ${T.line}`,borderTop:"none",padding:"18px 20px",flex:1,fontSize:13,lineHeight:1.8,color:T.mutedDeep,fontFamily:body}}
                    dangerouslySetInnerHTML={{__html:sanitizeBriefingHtml(text)}}/>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:T.cardAlt,border:`1px solid ${T.line}`,borderTop:`2px solid ${T.brass}`}}>
                    <div style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic"}}>{a?.arch.includes("RAG")?"RAG-grounded · jurisdiction-specific":"Generic LLM analysis"}</div>
                    <button onClick={()=>{
                      const pw=window.open("","_blank","width=900,height=700");
                      pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${a?.name} — ${fileName}</title><style>body{font-family:Georgia,serif;color:#28221a;max-width:780px;margin:40px auto;padding:0 24px;line-height:1.8}@media print{body{font-size:12px}}</style></head><body><h1>${a?.name} — Procurement Report</h1><p><em>${fileName} · ${new Date().toLocaleDateString()}</em></p><hr/><div>${text}</div></body></html>`);
                      pw.document.close();setTimeout(()=>{pw.print();pw.close();},400);
                    }} style={{background:T.card,border:`1px solid ${T.line}`,color:T.mutedDeep,padding:"6px 14px",cursor:"pointer",fontFamily:body,fontSize:11,fontWeight:600}}>⬇ Print / Download</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delta panel */}
          {showDelta&&(()=>{
            const d = computeDelta(aiResults[a1id],aiResults[a2id]);
            const SBAR2 = [["Words",m1?.words,m2?.words],["Statutes",m1?.statutes,m2?.statutes],["$ Refs",m1?.dollars,m2?.dollars],["Org Refs",m1?.orgs,m2?.orgs],["Data Claims",m1?.claims,m2?.claims],["Hedges",m1?.hedges,m2?.hedges]];
            return(
              <div style={{background:T.card,border:`1px solid ${T.line}`,marginBottom:16,position:"relative"}}>
                <Corners/>
                <div style={{padding:"12px 18px",borderBottom:`1px solid ${T.lineSoft}`,display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.8,fontWeight:600,marginBottom:3}}>Report Comparison</div>
                    <div style={{fontFamily:display,fontSize:14,fontWeight:600,color:T.navy}}>How the two reports differ</div>
                  </div>
                  <div style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic"}}>Quality metrics only — prompt details in Test My Team</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",padding:"14px 18px",gap:0,borderBottom:`1px solid ${T.lineSoft}`}}>
                  {SBAR2.map(([label,v1,v2],i)=>{
                    const diff=(v2||0)-(v1||0);
                    const isHedge=label==="Hedges";
                    const diffColor=isHedge?(diff<0?T.moss:diff>0?T.flag:T.muted):(diff>0?T.moss:diff<0?T.flag:T.muted);
                    const diffLabel=isHedge?(diff<0?`−${Math.abs(diff)} better`:diff>0?`+${diff} more`:"Same"):(diff>0?`+${diff} ${a2?.name.split(" ")[0]}`:diff<0?`+${Math.abs(diff)} ${a1?.name.split(" ")[0]}`:"Same");
                    return(
                      <div key={label} style={{padding:`0 ${i>0?"14px":"0"} 0 ${i>0?"14px":"0"}`,borderRight:i<5?`1px solid ${T.lineSoft}`:"none"}}>
                        <div style={{fontFamily:mono,fontSize:8.5,color:T.muted,textTransform:"uppercase",letterSpacing:1,fontWeight:600,marginBottom:8}}>{label}</div>
                        <div style={{fontFamily:mono,fontSize:13,fontWeight:700,color:T.ink,marginBottom:4}}>{v1||0} <span style={{fontSize:10,color:T.muted}}>({a1?.name.split(" ")[0]})</span></div>
                        <div style={{fontFamily:mono,fontSize:13,fontWeight:700,color:T.ink,marginBottom:4}}>{v2||0} <span style={{fontSize:10,color:T.muted}}>({a2?.name.split(" ")[0]})</span></div>
                        <div style={{fontFamily:mono,fontSize:10,fontWeight:700,color:diffColor}}>{diffLabel}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{padding:"12px 18px",background:T.cardAlt,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:T.moss,flexShrink:0}}/>
                  <div style={{fontFamily:body,fontSize:12,color:T.mutedDeep,flex:1}}>Full quality rubric and prompt visibility available in <strong style={{color:T.navy}}>Test My Team</strong>.</div>
                </div>
              </div>
            );
          })()}

          {/* Christy upsell */}
          <div style={{background:T.navy,border:`2px solid ${T.brass}`,padding:"18px 22px",display:"flex",alignItems:"center",gap:18,flexWrap:"wrap"}}>
            <div style={{width:48,height:48,borderRadius:"50%",border:`2px solid ${T.brass}`,background:T.paperDeep,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:display,fontSize:20,fontWeight:700,color:T.brass,flexShrink:0}}>C</div>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontFamily:mono,fontSize:8.5,color:"#8fa3bf",letterSpacing:1.2,marginBottom:2}}>MK-05 · MARKETING DESIGNER</div>
              <div style={{fontFamily:display,fontSize:15,fontWeight:600,color:T.card,marginBottom:3}}>Christy Park</div>
              <div style={{fontFamily:body,fontSize:12,color:"#b8c5d8",fontStyle:"italic",marginBottom:8}}>"Package an Executive &amp; Legislative Presentation."</div>
              <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                {[["Situational Awareness","5%"],["Skill","Developing · 36"],["Architecture","LLM Format"],["Add-on Cost","+$141"]].map(([k,v])=>(
                  <div key={k}>
                    <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>{k}</div>
                    <div style={{fontFamily:display,fontSize:13,fontWeight:600,color:v==="+$141"?T.brassLight:T.card}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
              <button style={{background:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,border:"none",color:T.navy,padding:"10px 20px",fontFamily:display,fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Add Christy + Generate Presentation</button>
              <button onClick={()=>{
                const id=aiPickedAgents[0];
                const text=aiResults[id]||"";
                const a=agents.find(x=>x.id===id);
                const pw=window.open("","_blank","width=900,height=700");
                pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report — ${fileName}</title><style>body{font-family:Georgia,serif;color:#28221a;max-width:780px;margin:40px auto;padding:0 24px;line-height:1.8}@media print{body{font-size:12px}}</style></head><body><h1>Procurement Strategic Report</h1><p><em>${fileName} · ${new Date().toLocaleDateString()}</em></p><hr/><div>${text}</div></body></html>`);
                pw.document.close();setTimeout(()=>{pw.print();pw.close();},400);
              }} style={{background:"transparent",border:`1px solid rgba(248,242,226,.35)`,color:T.card,padding:"10px 20px",fontFamily:body,fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>⬇ Print / Download as-is</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
