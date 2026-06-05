// DeepBench v5.1.0 | FetchScreen.jsx | Fetch agent — configure portal, SSE event log, screenshot stream
// src/screens/FetchScreen.jsx — v5.0.0
// DeepBench v5 — Fetch Agent (/work/[taskId]/fetch)
// Configure screen + running screen with SSE event log + screenshot pane

import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { T, display, body, mono, ACTION_COLORS_FETCH, ACTION_TEXT_COLORS_FETCH } from "../tokens.js";
import { AppShell } from "../AppShell.jsx";
import { Corners } from "../components/SharedUI.jsx";
import FeatureBadge from "../components/FeatureBadge.jsx";
import { useFetch } from "../contexts/FetchContext.jsx";
import { FETCH_STATES } from "../data/agents.js";
import { FETCH_API_BASE as FETCH_BASE } from "../config.js";

// FEATURE: FT-01 — Fetch config
// FEATURE: FT-06 — Pat selectable as fetch agent
// ── Configure Screen ──────────────────────────────────────────────────────────
function ConfigureScreen({ taskId }) {
  const navigate = useNavigate();
  const {
    fetchState, setFetchState, fetchYear, setFetchYear,
    fetchDateFrom, setFetchDateFrom, fetchDateTo, setFetchDateTo,
    runFetchAgent,
  } = useFetch();

  const selectedPortal = FETCH_STATES.find(s => s.key === fetchState) || FETCH_STATES[0];
  const yearOptions    = selectedPortal.years || ["2025"];

  return (
    <div style={{flex:1,overflowY:"auto",background:T.paperDeep,padding:"32px 28px 80px"}}>
      <div style={{maxWidth:860,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
          <div>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:3,textTransform:"uppercase",color:T.brass,fontWeight:500,marginBottom:10}}>Roadmap Venture · Procurement Intelligence</div>
            <div style={{fontFamily:display,fontSize:32,fontWeight:700,color:T.navy,lineHeight:1.15,letterSpacing:"-.5px"}}>Government Spend Analyzer</div>
          </div>
          <button onClick={()=>navigate(`/work/${taskId}/analyze`)} style={{fontFamily:mono,fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:T.muted,background:"none",border:`1px solid ${T.line}`,padding:"7px 14px",cursor:"pointer",marginTop:4}}>← Cancel</button>
        </div>

        <div style={{background:T.card,border:`1.5px solid ${T.brass}`,overflow:"hidden",position:"relative"}}>
          <Corners/>
          <div style={{background:`linear-gradient(135deg,${T.navy},${T.navyMid})`,padding:"14px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontFamily:display,fontSize:15,fontWeight:600,color:T.brassLight}}>Configure State Data Fetch</div>
            <button onClick={()=>navigate(`/work/${taskId}/analyze`)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.35)",fontSize:18,cursor:"pointer",lineHeight:1}}>✕</button>
          </div>
          <div style={{padding:24}}>
            <div style={{fontFamily:mono,fontSize:9.5,letterSpacing:"2.5px",textTransform:"uppercase",color:T.mutedDeep,marginBottom:10,fontWeight:500}}>Select state portal</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:22}}>
              {FETCH_STATES.map(s=>(
                <div key={s.key} onClick={()=>s.live&&setFetchState(s.key)}
                  style={{background:fetchState===s.key?"#d4e4f5":T.cardAlt,border:`1.5px solid ${fetchState===s.key?"#2d6fb5":T.line}`,padding:"11px 12px 10px",cursor:s.live?"pointer":"not-allowed",opacity:s.live?1:0.38,position:"relative",display:"flex",flexDirection:"column",gap:2,transition:"border-color 0.15s"}}>
                  <span style={{position:"absolute",top:7,right:8,fontFamily:mono,fontSize:7.5,letterSpacing:1,textTransform:"uppercase",padding:"1px 5px",fontWeight:600,color:s.live?T.moss:T.muted,background:s.live?"rgba(90,117,56,0.1)":"rgba(120,109,82,0.1)",border:`1px solid ${s.live?"rgba(90,117,56,0.3)":"rgba(120,109,82,0.25)"}`}}>{s.live?"Live":"Soon"}</span>
                  <span style={{fontFamily:display,fontSize:13,fontWeight:600,color:T.navy}}>{s.name}</span>
                  <span style={{fontFamily:mono,fontSize:8.5,color:T.muted,marginTop:2}}>{s.portal}</span>
                </div>
              ))}
            </div>
            <div style={{fontFamily:mono,fontSize:9.5,letterSpacing:"2.5px",textTransform:"uppercase",color:T.mutedDeep,marginBottom:10,fontWeight:500}}>Date range</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:22}}>
              {[
                {label:"Fiscal Year", el:<select value={fetchYear} onChange={e=>setFetchYear(e.target.value)} style={{background:T.cardAlt,border:`1px solid ${T.line}`,padding:"9px 10px",fontFamily:body,fontSize:13,color:T.navy,appearance:"none",width:"100%",cursor:"pointer"}}>{yearOptions.map(y=><option key={y} value={y}>{y}</option>)}</select>},
                {label:"From Date",   el:<input type="text" value={fetchDateFrom} onChange={e=>setFetchDateFrom(e.target.value)} style={{background:T.cardAlt,border:`1px solid ${T.line}`,padding:"9px 10px",fontFamily:body,fontSize:13,color:T.navy,width:"100%",boxSizing:"border-box"}}/>},
                {label:"To Date",     el:<input type="text" value={fetchDateTo}   onChange={e=>setFetchDateTo(e.target.value)}   style={{background:T.cardAlt,border:`1px solid ${T.line}`,padding:"9px 10px",fontFamily:body,fontSize:13,color:T.navy,width:"100%",boxSizing:"border-box"}}/>},
              ].map(({label,el})=>(
                <div key={label} style={{display:"flex",flexDirection:"column",gap:5}}>
                  <label style={{fontFamily:mono,fontSize:9,textTransform:"uppercase",letterSpacing:"1.5px",color:T.mutedDeep,fontWeight:500}}>{label}</label>
                  {el}
                </div>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,paddingTop:4}}>
              <div>
                <div style={{fontSize:11.5,color:T.muted,lineHeight:1.65}}>Agent will navigate the portal, fill date fields,<br/>and download the CSV — autonomously.</div>
                <button onClick={()=>navigate(`/work/${taskId}/analyze`)} style={{fontFamily:mono,fontSize:10,textTransform:"uppercase",letterSpacing:"1.5px",color:T.muted,background:"none",border:"none",cursor:"pointer",padding:0,marginTop:7,display:"block"}}>← Cancel, go back</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                <button onClick={()=>runFetchAgent("brent")} style={{background:"linear-gradient(135deg,#2d6fb5,#1a4e85)",color:"#fff",border:"none",padding:"13px 30px",cursor:"pointer",fontFamily:display,fontSize:14,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
                  ⇲ Run Fetch Agent
                </button>
                <button onClick={()=>runFetchAgent("pat")} style={{background:"none",border:"none",cursor:"pointer",fontFamily:mono,fontSize:9,color:T.muted,letterSpacing:1,textDecoration:"underline",padding:0}}>
                  I'd rather have an intern fetch
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// FEATURE: FT-02 — SSE connection to Railway
// FEATURE: FT-03 — Agent running screen
// FEATURE: FT-04 — Post-fetch download + analyze button
// ── Running Screen ────────────────────────────────────────────────────────────
function RunningScreen({ taskId }) {
  const navigate = useNavigate();
  const {
    fetchEvents, fetchRunning, fetchRunId, fetchThinking, fetchThinkingText,
    fetchComplete, fetchStopped, fetchTotalTime, fetchAgentId,
    fetchSelectedEvent, setFetchSelectedEvent,
    fetchListRef, fetchState,
    stopFetchAgent, handleFetchScroll, scrollToLatest,
  } = useFetch();

  useEffect(() => { scrollToLatest(); }, [fetchEvents, scrollToLatest]);

  const portal      = FETCH_STATES.find(s => s.key === fetchState);
  const isPat       = fetchAgentId === "pat";
  const agentName   = isPat ? "👩‍💼 Pat (Intern)" : "🌐 Brent";
  const actionCount = fetchEvents.filter(e => e.action || e.type === "downloaded").length;
  const fmtTime     = t => !t ? "" : t < 60 ? t.toFixed(1)+"s" : Math.floor(t/60)+"m "+Math.round(t%60)+"s";

  // Per-event style computation — full v4 fidelity
  const getStyles = (ev, isSelected) => {
    const act       = ev.action?.toUpperCase() || ev.type?.toUpperCase() || "";
    const isError   = ev.type==="error"   || ev.type==="stuck"  || ev.type==="action_error";
    const isComplete= ev.type==="downloaded" || ev.type==="complete";
    const isStopped = ev.type==="stopped";
    const isReflect = ev.action==="REFLECT";
    const isSearch  = ev.action==="SEARCH";
    const bg = isReflect?"rgba(45,111,181,0.15)":isSearch?"rgba(155,110,243,0.12)":ACTION_COLORS_FETCH[act]||"rgba(120,109,82,0.05)";
    const tc = isReflect?"#2d6fb5":isSearch?"#9b6ef3":ACTION_TEXT_COLORS_FETCH[act]||T.muted;
    const bl = isSelected?"2.5px solid #2d6fb5"
             : isError   ?`2.5px solid ${T.flag}`
             : isComplete?`2.5px solid ${T.moss}`
             : isReflect ?"2.5px solid #2d6fb5"
             : isSearch  ?"2.5px solid rgba(155,110,243,0.8)"
             :"2.5px solid transparent";
    const rowBg = isSelected?"rgba(45,111,181,0.08)"
                : isReflect ?"rgba(45,111,181,0.05)"
                : isSearch  ?"rgba(155,110,243,0.05)"
                : isError   ?"rgba(168,51,25,0.04)"
                : isComplete?"rgba(0,135,90,0.04)"
                : isStopped ?"rgba(120,109,82,0.04)"
                :"transparent";
    return { act, bg, tc, bl, rowBg, isReflect, isSearch, isError, isComplete, isStopped };
  };

  const handleAnalyze = () => navigate(`/work/${taskId}/analyze`);

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden",background:T.paperDeep}}>

      {/* Topbar */}
      <div style={{background:T.navy,borderBottom:`2px solid ${T.brass}`,padding:"8px 20px",display:"flex",alignItems:"center",gap:0,flexShrink:0,flexWrap:"nowrap"}}>
        <div style={{flexShrink:0,marginRight:20}}>
          <div style={{fontFamily:display,fontSize:13,fontWeight:600,color:T.brassLight}}>
            {agentName} — {portal?.name || fetchState}
            {fetchTotalTime&&<span style={{fontFamily:mono,fontSize:10,color:T.brassLight,marginLeft:12}}>⏱ {fmtTime(fetchTotalTime)} total</span>}
          </div>
          <div style={{fontFamily:mono,fontSize:9,color:"rgba(255,255,255,0.35)",letterSpacing:0.5,marginTop:1}}>{fetchRunId} · claude-sonnet-4-5 · Playwright</div>
        </div>
        <div style={{display:"flex",alignItems:"center",flex:1,overflow:"hidden"}}>
          {["Load Data","Map Fields","Auto-Analyze","Strategy"].map((s,i,arr)=>(
            <span key={s}>
              <span style={{fontFamily:mono,fontSize:8,textTransform:"uppercase",letterSpacing:1,padding:"3px 8px",color:i===0?T.brassLight:"rgba(255,255,255,0.25)",fontWeight:i===0?600:400,position:"relative"}}>
                {s}
                {i===0&&<span style={{position:"absolute",bottom:-1,left:8,right:8,height:1.5,background:T.brass,display:"block"}}/>}
              </span>
              {i<arr.length-1&&<span style={{color:"rgba(255,255,255,0.12)",fontSize:9}}>›</span>}
            </span>
          ))}
        </div>
        <button onClick={()=>{if(fetchRunning)stopFetchAgent();navigate(`/work/${taskId}/analyze`);}}
          style={{marginLeft:16,fontFamily:mono,fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:"rgba(255,255,255,0.45)",background:"none",border:"1px solid rgba(255,255,255,0.2)",padding:"5px 12px",cursor:"pointer",flexShrink:0}}>
          ← Cancel
        </button>
      </div>

      {/* Stop bar */}
      {fetchRunning&&(
        <div style={{background:"#7f1d1d",borderBottom:"2px solid #ef4444",padding:"6px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{fontSize:12,color:"#fff",fontWeight:600,display:"flex",alignItems:"center",gap:7}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#ef4444",display:"inline-block",flexShrink:0}}/>
            Agent is running — click Stop to halt at any time
          </div>
          <button onClick={stopFetchAgent} style={{background:"#ef4444",border:"none",color:"#fff",padding:"6px 16px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:body}}>■ Stop Agent</button>
        </div>
      )}

      {/* Main 2-col */}
      <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 380px",overflow:"hidden",minHeight:0}}>

        {/* Left: event log */}
        <div style={{display:"flex",flexDirection:"column",borderRight:`1px solid ${T.line}`,overflow:"hidden"}}>

          {/* Events list */}
          <div ref={fetchListRef} onScroll={handleFetchScroll} style={{flex:1,overflowY:"auto",padding:0,scrollBehavior:"smooth"}}>
            {fetchEvents.map((ev, idx) => {
              const isSelected = fetchSelectedEvent === idx;
              const { act, bg, tc, bl, rowBg, isReflect, isSearch, isError, isComplete, isStopped } = getStyles(ev, isSelected);
              return (
                <div key={idx} onClick={()=>setFetchSelectedEvent(isSelected?null:idx)}
                  style={{padding:"9px 12px",borderBottom:`1px solid ${T.lineSoft}`,cursor:"pointer",borderLeft:bl,paddingLeft:"9.5px",background:rowBg,transition:"background 0.1s"}}>
                  {/* Row header: index · action type · elapsed · wall clock */}
                  <div style={{fontFamily:mono,fontSize:"8px",color:T.muted,marginBottom:4}}>
                    #{String(idx+1).padStart(2,"0")} · {act}
                    {ev.timestamp&&fetchEvents[0]?.timestamp&&(()=>{
                      const elapsed = (new Date(ev.timestamp)-new Date(fetchEvents[0].timestamp))/1000;
                      const wallClock = new Date(ev.timestamp).toLocaleTimeString("en-US",{timeZone:"America/Chicago",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true});
                      return <>
                        <span style={{color:T.brass,marginLeft:4}}>+{elapsed<60?elapsed.toFixed(1)+"s":Math.floor(elapsed/60)+"m"+Math.round(elapsed%60)+"s"}</span>
                        <span style={{color:T.muted,marginLeft:6}}>{wallClock} CT</span>
                      </>;
                    })()}
                  </div>
                  {/* Action badge */}
                  {act&&<span style={{display:"inline-block",fontFamily:mono,fontSize:"8px",textTransform:"uppercase",letterSpacing:1,padding:"1px 5px",fontWeight:600,background:bg,color:tc,marginBottom:5}}>{act}</span>}
                  {/* Narration */}
                  <div style={{fontSize:"11.5px",color:T.mutedDeep,lineHeight:1.45}}>{ev.narration||ev.message||""}</div>
                  {/* Reasoning — EXECUTION PLAN for REFLECT, italic for others */}
                  {ev.reasoning&&(
                    <div style={{marginTop:5,fontSize:"10.5px",color:isReflect?T.mutedDeep:T.muted,lineHeight:1.5,fontStyle:isReflect?"normal":"italic",borderLeft:`2px solid ${isReflect?"#2d6fb5":T.lineSoft}`,paddingLeft:6,whiteSpace:"pre-wrap"}}>
                      {isReflect&&<div style={{fontFamily:mono,fontSize:8,color:"#2d6fb5",marginBottom:4,letterSpacing:1}}>EXECUTION PLAN</div>}
                      {ev.reasoning}
                    </div>
                  )}
                  {/* Target + value */}
                  {ev.target&&<div style={{marginTop:4,fontFamily:mono,fontSize:"8.5px",color:"rgba(45,111,181,0.7)"}}>target: {String(ev.target).slice(0,80)}</div>}
                  {ev.value &&<div style={{fontFamily:mono,fontSize:"8.5px",color:"rgba(0,135,90,0.8)"}}>value: "{String(ev.value).slice(0,60)}"</div>}
                  {ev.selector&&<div style={{fontFamily:mono,fontSize:"8.5px",color:T.muted,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.selector}</div>}
                  {ev.screenshot&&!isSelected&&<div style={{fontFamily:mono,fontSize:9,color:T.brass,marginTop:3}}>📷 click to view screenshot</div>}
                </div>
              );
            })}

            {/* Inline download + analyze action rows — appear after last event on success */}
            {fetchComplete?.success&&(
              <>
                <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.lineSoft}`,borderLeft:`2.5px solid ${T.brass}`,paddingLeft:"9.5px",background:"rgba(182,135,58,0.05)"}}>
                  <div style={{fontFamily:mono,fontSize:"8px",color:T.brass,marginBottom:4}}>⬇ Available Action</div>
                  <span style={{display:"inline-block",fontFamily:mono,fontSize:"8px",textTransform:"uppercase",padding:"1px 5px",fontWeight:600,background:"rgba(182,135,58,0.15)",color:T.brass,marginBottom:5}}>Download</span>
                  <div style={{fontSize:"11.5px",color:T.mutedDeep,lineHeight:1.45,marginBottom:7}}>{fetchComplete.fileName} is ready to save to your computer.</div>
                  <button onClick={()=>window.open(`${FETCH_BASE}/agent/download?file=${encodeURIComponent(fetchComplete.filePath)}`,"_blank")} style={{background:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,color:T.navy,border:"none",padding:"6px 14px",cursor:"pointer",fontFamily:display,fontSize:11,fontWeight:700}}>↓ Save CSV File</button>
                </div>
                <div style={{padding:"9px 12px",borderLeft:`2.5px solid ${T.brass}`,paddingLeft:"9.5px",background:"rgba(182,135,58,0.05)",borderTop:`2px solid ${T.brass}`}}>
                  <div style={{fontFamily:mono,fontSize:"8px",color:T.brass,marginBottom:4}}>→ Next Step</div>
                  <span style={{display:"inline-block",fontFamily:mono,fontSize:"8px",textTransform:"uppercase",padding:"1px 5px",fontWeight:600,background:"rgba(182,135,58,0.15)",color:T.brassDeep,marginBottom:5}}>Analyze</span>
                  <div style={{fontSize:"11.5px",color:T.mutedDeep,lineHeight:1.45,marginBottom:7}}>
                    Data is ready. Proceed to field mapping and analysis.
                    {fetchTotalTime&&<span style={{display:"block",fontFamily:mono,fontSize:9,color:T.brass,marginTop:4}}>⏱ Total time: {fmtTime(fetchTotalTime)} · {actionCount} steps</span>}
                  </div>
                  <button onClick={handleAnalyze} style={{background:`linear-gradient(135deg,${T.navy},${T.navyMid})`,color:T.brassLight,border:"none",padding:"6px 14px",cursor:"pointer",fontFamily:display,fontSize:11,fontWeight:700}}>Map Fields → Analyze ▶</button>
                </div>
              </>
            )}

            {fetchEvents.length===0&&(
              <div style={{padding:"40px 20px",textAlign:"center",color:T.muted,fontFamily:mono,fontSize:11}}>Waiting for agent events…</div>
            )}
          </div>

          {/* Thinking footer */}
          <div style={{flexShrink:0,padding:"10px 14px",borderTop:`1px solid ${T.line}`,background:T.cardAlt,display:"flex",alignItems:"flex-start",gap:8,minHeight:52}}>
            {fetchRunning&&[0,0.15,0.3].map((d,i)=>(
              <span key={i} style={{display:"inline-block",width:4,height:4,borderRadius:"50%",background:"#2d6fb5",animation:`dbounce 1.2s ${d}s infinite`,flexShrink:0,marginTop:5}}/>
            ))}
            {!fetchRunning&&<span style={{fontSize:14,flexShrink:0,marginTop:1}}>{fetchComplete?.success?"✓":fetchStopped?"◼":"⚠"}</span>}
            <div style={{fontSize:11,lineHeight:1.5,flex:1,color:fetchComplete?.success?T.moss:fetchStopped?T.muted:fetchRunning?T.mutedDeep:T.flag}}>{fetchThinkingText||"Waiting…"}</div>
          </div>
        </div>

        {/* Right: screenshot pane — macOS-style chrome */}
        <div style={{flex:1,display:"flex",flexDirection:"column",background:"#0b1929",overflow:"hidden",minWidth:0}}>
          {/* macOS traffic light bar + URL */}
          <div style={{background:"rgba(0,0,0,0.45)",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"0 12px",height:30,display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
            {["#e85d4a","#f5a623","#3eca7f"].map(c=><div key={c} style={{width:9,height:9,borderRadius:"50%",background:c}}/>)}
            <div style={{flex:1,background:"rgba(255,255,255,0.05)",borderRadius:2,height:16,display:"flex",alignItems:"center",padding:"0 10px",fontFamily:mono,fontSize:"8px",color:"rgba(255,255,255,0.25)",overflow:"hidden",whiteSpace:"nowrap",marginLeft:6}}>
              {portal?.url||"about:blank"}
            </div>
          </div>
          {/* Image area */}
          <div style={{flex:1,height:0,overflow:"hidden",position:"relative",background:"#0b1929"}}>
            {(()=>{
              const evIdx = fetchSelectedEvent !== null ? fetchSelectedEvent : fetchEvents.length-1;
              const shot  = fetchEvents[evIdx]?.screenshot;
              return shot
                ? <img src={`data:image/jpeg;base64,${shot}`} alt={`Step ${evIdx+1}`} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",objectPosition:"top center",display:"block"}}/>
                : <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{textAlign:"center",padding:24}}>
                      <div style={{fontSize:28,marginBottom:10,opacity:0.15}}>🖥</div>
                      <div style={{fontFamily:mono,fontSize:10,color:"rgba(255,255,255,0.15)",letterSpacing:0.5,lineHeight:1.9}}>
                        {fetchRunning?"[ LIVE SCREENSHOT STREAM ]":"[ Waiting for agent to start ]"}<br/>
                        Click any event in the left panel<br/>to view that step's screenshot
                      </div>
                    </div>
                  </div>;
            })()}
            {fetchSelectedEvent!==null&&fetchSelectedEvent!==fetchEvents.length-1&&(
              <div style={{position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,0.6)",color:"rgba(255,255,255,0.6)",fontFamily:mono,fontSize:9,padding:"3px 8px",letterSpacing:1}}>
                STEP {fetchSelectedEvent+1} OF {fetchEvents.length} EVENTS · CLICK TO REPLAY
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FetchScreen export ────────────────────────────────────────────────────────
export default function FetchScreen() {
  const { taskId }      = useParams();
  const { fetchScreen } = useFetch();

  return (
    <AppShell headerProps={{ showHelp:true }}>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0,position:"relative"}}>
        <FeatureBadge id="FT-01" />
        {fetchScreen === "running"
          ? <RunningScreen taskId={taskId}/>
          : <ConfigureScreen taskId={taskId}/>
        }
      </div>
    </AppShell>
  );
}
