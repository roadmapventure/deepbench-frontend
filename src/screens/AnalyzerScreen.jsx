// src/screens/AnalyzerScreen.jsx — v5.0.0
// DeepBench v5 — NIGP Analyzer (/work/[taskId]/analyze)
// Orchestrates all 10+ tabs. Imports sub-components for complex tabs.

import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Treemap, Legend, LineChart, Line, ReferenceLine, LabelList,
} from "recharts";
import { T, display, body, mono, PALETTE, fmtFull, fmtPct, fmt, shortLabel, parseAmt, toTC } from "../tokens.js";
import { TENANT_ID, FETCH_API_BASE } from "../config.js";
import { AppShell } from "../AppShell.jsx";
import {
  Corners, Card, PctBar, PctBarLabel, Tip, TreeCell, setTreemapTotal,
  TimelinePctLabel, FlagCard, AiBadge,
} from "../components/SharedUI.jsx";
import { useAnalyzer, FIELD_DEFS } from "../contexts/AnalyzerContext.jsx";
import { useFetch } from "../contexts/FetchContext.jsx";
import { useAgents } from "../hooks/useAgents.js";
import AIReviewTab      from "./analyzer/AIReviewTab.jsx";
import VendorDiversityTab from "./analyzer/VendorDiversityTab.jsx";
import LocalSpendTab    from "./analyzer/LocalSpendTab.jsx";

// ── Nav groups ─────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  { id:"overview-group",  label:"Overview",  tabs:[{id:"overview",    label:"Dashboard",       icon:"▦"}] },
  { id:"analysis-group",  label:"Analysis",  tabs:[
    {id:"categories",  label:"Categories",      icon:"◈"},
    {id:"treemap",     label:"Treemap",          icon:"⊞"},
    {id:"vendors",     label:"Vendors",          icon:"🏢"},
    {id:"timeline",    label:"Timeline",         icon:"📅"},
    {id:"departments", label:"Departments",      icon:"🏛"},
  ]},
  { id:"strategy-group",  label:"Strategy",  tabs:[
    {id:"flags",         label:"Concerns",       icon:"⚑"},
    {id:"localspend",    label:"Local Spend",    icon:"📍"},
    {id:"concentration", label:"Vendor Diversity",icon:"⚡"},
    {id:"aibriefing",   label:"AI Review",       icon:"✨"},
  ]},
  { id:"data-group",      label:"Data",      tabs:[
    {id:"updatefile",  label:"Update File",     icon:"↺"},
    {id:"cleanup",     label:"Cleanup",          icon:"🧹"},
    {id:"table",       label:"Full Table",       icon:"📋"},
  ]},
];

// ── Data source landing screen ──────────────────────────────────────────────
function DataSourceScreen({ taskId }) {
  const { processFile, setError } = useAnalyzer();
  const navigate = useNavigate();
  const hiddenRef = useRef();
  const scC = (
    <>
      {[["top:4px;left:4px","border-top:1.5px solid #b6873a;border-left:1.5px solid #b6873a"],["top:4px;right:4px","border-top:1.5px solid #b6873a;border-right:1.5px solid #b6873a"],["bottom:4px;left:4px","border-bottom:1.5px solid #b6873a;border-left:1.5px solid #b6873a"],["bottom:4px;right:4px","border-bottom:1.5px solid #b6873a;border-right:1.5px solid #b6873a"]].map(([pos],i)=>(
        <div key={i} style={{position:"absolute",...Object.fromEntries(pos.split(";").map(s=>[s.split(":")[0],s.split(":")[1]])),width:9,height:9,...Object.fromEntries([["top:4px;left:4px","borderTop:1.5px solid #b6873a,borderLeft:1.5px solid #b6873a"],["top:4px;right:4px","borderTop:1.5px solid #b6873a,borderRight:1.5px solid #b6873a"],["bottom:4px;left:4px","borderBottom:1.5px solid #b6873a,borderLeft:1.5px solid #b6873a"],["bottom:4px;right:4px","borderBottom:1.5px solid #b6873a,borderRight:1.5px solid #b6873a"]][i][1].split(",").map(s=>[s.split(":")[0],s.split(":")[1]]))}}/>
      ))}
    </>
  );
  const loadDemo = async () => {
    try {
      const res = await fetch("/Austin_2025Data_.csv");
      if (!res.ok) throw new Error("Could not load demo file");
      const blob = await res.blob();
      processFile(new File([blob], "Austin_2025Data_.csv", { type:"text/csv" }));
    } catch(e) { setError("Demo failed: " + e.message); }
  };
  return (
    <div style={{flex:1,overflowY:"auto",background:T.paperDeep,padding:"32px 28px 80px"}}>
      <div style={{fontFamily:mono,fontSize:10,letterSpacing:3,textTransform:"uppercase",color:T.brass,marginBottom:10}}>Roadmap Venture · Procurement Intelligence</div>
      <div style={{fontFamily:display,fontSize:32,fontWeight:700,color:T.navy,marginBottom:8,letterSpacing:"-.5px"}}>Government Spend Analyzer</div>
      <p style={{fontSize:13.5,color:T.muted,lineHeight:1.65,maxWidth:580,marginBottom:28}}>Load procurement data from a demo dataset, a live state portal, or your own file.</p>

      {/* Workflow strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",marginBottom:20,border:`1px solid ${T.line}`}}>
        {[
          {n:"01",label:"Load Data",              active:true,  bg:T.navy,    color:T.brass},
          {n:"02",label:"Map Columns & Fields",   active:false, bg:T.card,    color:T.navy},
          {n:"03",label:"Auto-Analyze",           active:false, bg:T.card,    color:T.navy},
          {n:"04",label:"Strategic Action Items", active:false, bg:T.card,    color:T.navy},
          {n:"⚙", label:"Admin Options",     active:false, bg:T.navyMid, color:T.brassLight, sub:"Build AI Analyst Team"},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,padding:"14px 16px",textAlign:"center",borderLeft:i>0?`1px solid ${T.line}`:"none"}}>
            <div style={{fontFamily:mono,fontSize:9,color:s.active?"rgba(184,197,216,.6)":s.n==="⚙"?T.brass:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>{s.n}</div>
            <div style={{fontFamily:display,fontSize:13,fontWeight:600,color:s.color}}>{s.label}</div>
            {s.sub&&<div style={{fontSize:10,color:"rgba(184,197,216,.6)",marginTop:3}}>{s.sub}</div>}
          </div>
        ))}
      </div>
      <div style={{fontFamily:mono,fontSize:9.5,letterSpacing:"2.5px",textTransform:"uppercase",color:T.mutedDeep,marginBottom:12}}>Choose your data source</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        {/* Austin demo */}
        <div style={{background:T.card,border:`1.5px solid ${T.line}`,padding:"22px 20px 20px",cursor:"pointer",position:"relative",display:"flex",flexDirection:"column",transition:"border-color .18s"}} onClick={loadDemo} onMouseEnter={e=>e.currentTarget.style.borderColor=T.brass} onMouseLeave={e=>e.currentTarget.style.borderColor=T.line}>
          <Corners/>
          <span style={{display:"inline-block",fontFamily:mono,fontSize:8.5,textTransform:"uppercase",letterSpacing:"1.5px",padding:"2px 7px",border:`1px solid ${T.moss}`,color:T.moss,background:"rgba(90,117,56,0.07)",marginBottom:9,alignSelf:"flex-start",fontWeight:600}}>Demo dataset</span>
          <span style={{fontSize:24,marginBottom:10,display:"block"}}>🏙</span>
          <div style={{fontFamily:display,fontSize:15,fontWeight:600,color:T.navy,marginBottom:5}}>City of Austin</div>
          <div style={{fontSize:12,color:T.muted,lineHeight:1.6,flex:1}}>Load Austin FY2025 public procurement data instantly.</div>
          <button style={{marginTop:14,padding:"9px 18px",fontWeight:700,fontSize:12,fontFamily:display,border:"none",cursor:"pointer",alignSelf:"flex-start",background:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,color:T.navy}}>▶ Load Demo</button>
        </div>
        {/* Fetch */}
        <div style={{background:T.card,border:`1.5px solid ${T.line}`,padding:"22px 20px 20px",cursor:"pointer",position:"relative",display:"flex",flexDirection:"column",transition:"border-color .18s"}} onClick={()=>navigate(`/work/${taskId}/fetch`)} onMouseEnter={e=>e.currentTarget.style.borderColor=T.brass} onMouseLeave={e=>e.currentTarget.style.borderColor=T.line}>
          <Corners/>
          <span style={{display:"inline-block",fontFamily:mono,fontSize:8.5,textTransform:"uppercase",letterSpacing:"1.5px",padding:"2px 7px",border:"1px solid #2d6fb5",color:"#2d6fb5",background:"#d4e4f5",marginBottom:9,alignSelf:"flex-start",fontWeight:600}}>Live fetch · AI Agent</span>
          <span style={{fontSize:24,marginBottom:10,display:"block"}}>🌐</span>
          <div style={{fontFamily:display,fontSize:15,fontWeight:600,color:T.navy,marginBottom:5}}>Fetch State Data</div>
          <div style={{fontSize:12,color:T.muted,lineHeight:1.6,flex:1}}>AI agent navigates a government portal and downloads spend data automatically.</div>
          <button style={{marginTop:14,padding:"9px 18px",fontWeight:700,fontSize:12,fontFamily:display,border:"none",cursor:"pointer",alignSelf:"flex-start",background:"linear-gradient(135deg,#2d6fb5,#1a4e85)",color:"#fff"}}>⇲ Fetch Live Data</button>
        </div>
        {/* Upload */}
        <div className="upload-blink" style={{background:T.card,border:`1.5px solid ${T.line}`,padding:"22px 20px 20px",position:"relative",display:"flex",flexDirection:"column"}}>
          <Corners/>
          <span style={{display:"inline-block",fontFamily:mono,fontSize:8.5,textTransform:"uppercase",letterSpacing:"1.5px",padding:"2px 7px",border:`1px solid ${T.brass}`,color:T.brassDeep,background:`rgba(182,135,58,0.06)`,marginBottom:9,alignSelf:"flex-start",fontWeight:600}}>Your data</span>
          <span style={{fontSize:24,marginBottom:10,display:"block"}}>📂</span>
          <div style={{fontFamily:display,fontSize:15,fontWeight:600,color:T.navy,marginBottom:5}}>Upload Your Own File</div>
          <div style={{fontSize:12,color:T.muted,lineHeight:1.6,flex:1}}>Drop or select a procurement CSV from your system.</div>
          <div onClick={()=>hiddenRef.current.click()} onDrop={e=>{e.preventDefault();processFile(e.dataTransfer.files[0]);}} onDragOver={e=>e.preventDefault()}>
            <div style={{marginTop:14,display:"inline-block",padding:"9px 18px",fontWeight:700,fontSize:12,fontFamily:display,cursor:"pointer",background:"transparent",border:`1.5px solid ${T.brass}`,color:T.brassDeep}}>↑ Upload CSV</div>
            <input ref={hiddenRef} type="file" accept=".csv" style={{display:"none"}} onChange={e=>processFile(e.target.files[0])}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Column mapping screen ───────────────────────────────────────────────────
function MappingScreen() {
  const { columns, fileName, mapping, setMapping, error, runAnalysis, activeTab, setStage, setActiveTab } = useAnalyzer();
  return (
    <div style={{flex:1,overflowY:"auto",background:T.paperDeep,padding:"32px 28px 40px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div>
          <div style={{fontFamily:display,fontSize:22,fontWeight:600,color:T.navy,marginBottom:5}}>Confirm Column Mapping</div>
          <div style={{fontSize:13,color:T.muted}}>Found <strong style={{color:T.ink}}>{columns.length} columns</strong> in <strong style={{color:T.ink}}>{fileName}</strong>.</div>
        </div>
        <div style={{display:"flex",gap:10}}>
          {activeTab==="updatefile"&&<button onClick={()=>{setStage("analyze");setActiveTab("overview");}} style={{background:"transparent",border:`1px solid ${T.line}`,color:T.mutedDeep,padding:"10px 20px",cursor:"pointer",fontSize:13,fontFamily:body}}>Cancel</button>}
          <button onClick={runAnalysis} style={{background:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,border:"none",color:T.navy,padding:"10px 24px",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:display}}>Run Analysis →</button>
        </div>
      </div>
      <div style={{display:"grid",gap:10}}>
        {Object.entries(FIELD_DEFS).map(([field,def])=>{
          const val = mapping[field]||"";
          return(
            <div key={field} style={{background:T.card,border:`1px solid ${val?T.brass+"66":T.line}`,padding:"13px 18px",display:"grid",gridTemplateColumns:"1fr 1.3fr",gap:16,alignItems:"center",position:"relative"}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                  <span style={{fontSize:13,fontWeight:700,color:T.navy,fontFamily:display}}>{def.label}</span>
                  {def.required&&<span style={{fontSize:9.5,background:`${T.moss}18`,color:T.moss,padding:"1px 7px",fontWeight:700,fontFamily:mono,border:`1px solid ${T.moss}40`}}>REQUIRED</span>}
                </div>
                <div style={{fontSize:12,color:T.muted}}>{def.hint}</div>
              </div>
              <div>
                <select value={val} onChange={e=>setMapping(m=>({...m,[field]:e.target.value}))} style={{width:"100%",background:T.cardAlt,border:`1px solid ${val?T.brass+"66":T.line}`,padding:"9px 12px",color:val?T.ink:T.muted,fontSize:13,cursor:"pointer",outline:"none",fontFamily:body}}>
                  <option value="">— Skip this field —</option>
                  {columns.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                {val&&<div style={{fontSize:11,color:T.moss,marginTop:4,fontFamily:mono}}>✓ {val}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {error&&<div style={{marginTop:14,background:`${T.flag}10`,border:`1px solid ${T.flag}44`,padding:"12px 16px",color:T.flag,fontSize:14}}>⚠ {error}</div>}
      <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
        <button onClick={runAnalysis} style={{background:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,border:"none",color:T.navy,padding:"12px 24px",cursor:"pointer",fontSize:15,fontWeight:700,fontFamily:display}}>Run Analysis →</button>
      </div>
    </div>
  );
}

// ── Main analyzer view ──────────────────────────────────────────────────────
function AnalyzerView({ taskId }) {
  const {
    data, activeTab, setActiveTab, stage, setStage, fileName,
    searchTerm, setSearchTerm, availableTabs, highFlags, dirtyCount,
    localViewBy, setLocalViewBy, localSelected, setLocalSelected, localApplied, setLocalApplied,
    mapping, hhiTooltipVisible, setHhiTooltipVisible,
    aiReviewStage, setAiReviewStage, aiPickedAgents, setAiPickedAgents,
    aiResults, setAiResults, aiReviewError, setAiReviewError,
    aiChristySelected, setAiChristySelected,
    sessionConfigs, setSessionConfig, agentConfigOptions, loadAgentConfigOptions,
  } = useAnalyzer();
  const agents = useAgents();
  const navigate = useNavigate();
  const hiddenRef = useRef();
  const { processFile } = useAnalyzer();

  const vc = data?.vendorConc;
  const top15C = useMemo(()=>data?.classArr.slice(0,15)||[],[data]);
  const top15V = useMemo(()=>data?.vendorArr.slice(0,15)||[],[data]);
  const pieData = useMemo(()=>{
    if(!data) return [];
    const top=data.classArr.slice(0,9);
    const other=data.classArr.slice(9).reduce((s,x)=>s+x.total,0);
    const r=top.map(x=>({name:x.displayLabel,value:x.total}));
    if(other>0) r.push({name:"All Other",value:other});
    return r;
  },[data]);
  const treemapData = useMemo(()=>data?.classArr.slice(0,30).map(x=>({name:x.displayLabel,size:x.total,value:x.total}))||[],[data]);
  const filtered = useMemo(()=>{
    if(!data) return [];
    const q=searchTerm.toLowerCase();
    return data.classArr.filter(x=>x.label.toLowerCase().includes(q)||x.classCode.includes(q));
  },[data,searchTerm]);

  const renderTab = () => {
    if (!data) return null;

    if (activeTab==="overview") return (
      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:16}}>
        {data.flags.length>0&&(
          <div style={{background:`${T.flag}08`,border:`1px solid ${T.flag}40`,padding:"11px 16px",display:"flex",alignItems:"center",gap:12}}>
            <span style={{color:T.flag,fontFamily:mono,fontSize:12,fontWeight:700,flexShrink:0}}>!</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:T.navy,marginBottom:2,fontFamily:display}}>{data.flags.length} concern{data.flags.length!==1?"s":""} detected · {data.flags.filter(f=>f.severity==="high").length} high · {data.flags.filter(f=>f.severity==="medium").length} medium</div>
              <div style={{fontSize:12,color:T.mutedDeep}}>
                {data.flags.map(f=>`⚑ ${f.title.split("—")[0].trim()}`).join(" · ")}
                {" "}<button onClick={()=>setActiveTab("flags")} style={{background:"none",border:"none",color:T.flag,cursor:"pointer",fontSize:12,fontWeight:700,padding:0,fontFamily:body}}>View all →</button>
              </div>
            </div>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Card title="Categories by Spend">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={top15C.map(x=>({...x,label:x.displayLabel,_pct:x.total/data.totalSpend*100}))} layout="vertical" margin={{left:10,right:70,top:5,bottom:5}}>
                <XAxis type="number" tickFormatter={fmt} tick={{fill:T.muted,fontSize:11,fontFamily:mono}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="label" width={150} tick={{fill:T.mutedDeep,fontSize:10,fontFamily:body}} axisLine={false} tickLine={false}/>
                <Tooltip content={<Tip total={data.totalSpend}/>}/>
                <Bar dataKey="total" radius={[0,3,3,0]} label={<PctBarLabel total={data.totalSpend}/>}>
                  {top15C.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]} fillOpacity={0.9}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Spend Distribution" subtitle="Share of total by category">
            <div style={{width:"100%",height:440,position:"relative"}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{top:20,right:30,bottom:0,left:30}}>
                  <Pie data={pieData} cx="50%" cy="42%" outerRadius={120} dataKey="value" nameKey="name" label={({percent})=>percent>0.05?`${(percent*100).toFixed(0)}%`:""} labelLine={{stroke:T.line,strokeWidth:1,length:12}}>
                    {pieData.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]} stroke={T.paperDeep} strokeWidth={2}/>)}
                  </Pie>
                  <Tooltip content={<Tip/>}/>
                  <Legend formatter={v=><span style={{color:T.mutedDeep,fontSize:9,fontFamily:body}}>{v.length>22?v.slice(0,21)+"…":v}</span>} wrapperStyle={{paddingTop:8,fontSize:9}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    );

    if (activeTab==="categories") return (
      <Card title="All Categories — Full Spend Breakdown" subtitle={`${data.classArr.length} categories`} span2>
        <ResponsiveContainer width="100%" height={Math.max(500,data.classArr.length*26)}>
          <BarChart data={data.classArr.map(x=>({...x,label:x.displayLabel}))} layout="vertical" margin={{left:10,right:80,top:8,bottom:8}}>
            <XAxis type="number" tickFormatter={fmt} tick={{fill:T.muted,fontSize:11,fontFamily:mono}} axisLine={false} tickLine={false} xAxisId="top" orientation="top"/>
            <XAxis type="number" tickFormatter={fmt} tick={{fill:T.muted,fontSize:11,fontFamily:mono}} axisLine={false} tickLine={false} xAxisId="bottom" orientation="bottom"/>
            <YAxis type="category" dataKey="label" width={160} tick={{fill:T.mutedDeep,fontSize:10,fontFamily:body}} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip total={data.totalSpend}/>}/>
            <Bar dataKey="total" radius={[0,3,3,0]} label={<PctBarLabel total={data.totalSpend}/>} xAxisId="top">
              {data.classArr.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]} fillOpacity={0.85}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    );

    if (activeTab==="treemap") {
      setTreemapTotal(data.totalSpend);
      return (
        <Card title="Spend Treemap" subtitle="Area proportional to dollar volume · top 30 categories" span2>
          <ResponsiveContainer width="100%" height={540}>
            <Treemap data={treemapData} dataKey="size" aspectRatio={16/9} content={<TreeCell/>}>
              <Tooltip formatter={(v,n,p)=>[`${fmtFull(v)} · ${(v/data.totalSpend*100).toFixed(1)}%`,p.payload?.name||n]}/>
            </Treemap>
          </ResponsiveContainer>
        </Card>
      );
    }

    if (activeTab==="vendors"&&data.hasVendor) return (
      <Card title="Top 15 Vendors by Spend" span2>
        <ResponsiveContainer width="100%" height={440}>
          <BarChart data={top15V.map(v=>({...v,_pct:v.total/data.totalSpend*100}))} layout="vertical" margin={{left:10,right:80,top:20,bottom:5}}>
            <XAxis type="number" tickFormatter={fmt} tick={{fill:T.muted,fontSize:11,fontFamily:mono}} axisLine={false} tickLine={false} xAxisId="bottom" orientation="bottom"/>
            <XAxis type="number" tickFormatter={fmt} tick={{fill:T.muted,fontSize:11,fontFamily:mono}} axisLine={false} tickLine={false} xAxisId="top" orientation="top"/>
            <YAxis type="category" dataKey="name" width={200} tick={{fill:T.mutedDeep,fontSize:10,fontFamily:body}} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip total={data.totalSpend}/>}/>
            <Bar dataKey="total" radius={[0,3,3,0]} label={<PctBarLabel total={data.totalSpend}/>} xAxisId="bottom">
              {top15V.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]} fillOpacity={0.85}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    );

    if (activeTab==="departments"&&data.hasDept) return (
      <Card title="Spend by Department" span2>
        <ResponsiveContainer width="100%" height={Math.max(430,data.deptArr.length*28)}>
          <BarChart data={data.deptArr.map(d=>({...d,_pct:d.total/data.totalSpend*100}))} layout="vertical" margin={{left:10,right:80,top:5,bottom:5}}>
            <XAxis type="number" tickFormatter={fmt} tick={{fill:T.muted,fontSize:11,fontFamily:mono}} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" width={180} tick={{fill:T.mutedDeep,fontSize:10,fontFamily:body}} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip total={data.totalSpend}/>}/>
            <Bar dataKey="total" radius={[0,3,3,0]} label={<PctBarLabel total={data.totalSpend}/>}>
              {data.deptArr.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]} fillOpacity={0.85}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    );

    if (activeTab==="timeline"&&data.hasDate) return (
      <Card title="Monthly Spend" subtitle="Total procurement spend by month" span2>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={data.monthArr} margin={{left:10,right:20,top:24,bottom:20}}>
            <XAxis dataKey="month" tick={{fill:T.mutedDeep,fontSize:11,fontFamily:mono}} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={fmt} tick={{fill:T.muted,fontSize:11,fontFamily:mono}} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip total={data.totalSpend}/>}/>
            <ReferenceLine y={data.totalSpend/data.monthArr.length} stroke={`${T.flag}99`} strokeDasharray="4 4" label={{value:`Avg ${fmt(data.totalSpend/data.monthArr.length)}`,position:"insideTopRight",fill:T.flag,fontSize:11,fontWeight:700,fontFamily:mono}}/>
            <Bar dataKey="total" radius={[3,3,0,0]}>
              {data.monthArr.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]} fillOpacity={0.85}/>)}
              <LabelList content={<TimelinePctLabel total={data.totalSpend}/>}/>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    );

    if (activeTab==="flags") return (
      <div>
        <div style={{marginBottom:18}}>
          <div style={{fontFamily:display,fontSize:20,fontWeight:600,color:T.navy,marginBottom:5}}>Procurement Health Review</div>
          <div style={{fontSize:13,color:T.muted}}>{data.flags.length} concern{data.flags.length!==1?"s":""} detected · {data.flags.filter(f=>f.severity==="high").length} high · {data.flags.filter(f=>f.severity==="medium").length} medium · {data.flags.filter(f=>f.severity==="low").length} low</div>
        </div>
        {data.flags.length===0&&<div style={{background:`${T.moss}08`,border:`1px solid ${T.moss}40`,padding:"40px",textAlign:"center"}}><div style={{fontFamily:display,fontSize:18,fontWeight:600,color:T.moss}}>✓ No significant procurement concerns detected</div></div>}
        {["high","medium","low","info"].map(sev=>{
          const grp=data.flags.filter(f=>f.severity===sev);
          if(!grp.length) return null;
          const labels={high:"⚑ High Priority",medium:"⚑ Medium Priority",low:"⚑ Low Priority",info:"ℹ Informational"};
          const flagColors={high:T.flag,medium:"#b8721a",low:"#a08020",info:T.navy};
          return(
            <div key={sev} style={{marginBottom:22}}>
              <div style={{fontSize:11,fontWeight:700,color:flagColors[sev],marginBottom:8,textTransform:"uppercase",letterSpacing:1.2,fontFamily:mono}}>{labels[sev]}</div>
              {grp.map((f,i)=><FlagCard key={i} {...f} totalSpend={data.totalSpend}/>)}
            </div>
          );
        })}
      </div>
    );

    if (activeTab==="localspend") return (
      <LocalSpendTab data={data} mapping={mapping} localViewBy={localViewBy} setLocalViewBy={setLocalViewBy} localSelected={localSelected} setLocalSelected={setLocalSelected} localApplied={localApplied} setLocalApplied={setLocalApplied}/>
    );

    if (activeTab==="concentration") return (
      <VendorDiversityTab vc={vc} data={data} hhiTooltipVisible={hhiTooltipVisible} setHhiTooltipVisible={setHhiTooltipVisible}/>
    );

    if (activeTab==="aibriefing") return (
      <AIReviewTab data={data} fileName={fileName} agents={agents} mapping={mapping}
        aiReviewStage={aiReviewStage} setAiReviewStage={setAiReviewStage}
        aiPickedAgents={aiPickedAgents} setAiPickedAgents={setAiPickedAgents}
        aiResults={aiResults} setAiResults={setAiResults}
        aiReviewError={aiReviewError} setAiReviewError={setAiReviewError}
        aiChristySelected={aiChristySelected} setAiChristySelected={setAiChristySelected}
        sessionConfigs={sessionConfigs} setSessionConfig={setSessionConfig}
        agentConfigOptions={agentConfigOptions} loadAgentConfigOptions={loadAgentConfigOptions}
      />
    );

    if (activeTab==="cleanup") return (
      <div>
        <div style={{marginBottom:16}}>
          <div style={{fontFamily:display,fontSize:20,fontWeight:600,color:T.navy,marginBottom:5}}>Data Quality — Code Cleanup</div>
          <div style={{fontSize:13,color:T.muted}}>{data.dirtyRows.length.toLocaleString()} transactions could not be fully classified.</div>
        </div>
        <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"18px 20px",position:"relative"}}>
          <Corners/>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,fontFamily:body}}>
              <thead><tr>{["Issue","Raw Code","Description","Vendor","Spend"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 12px",color:T.brassDeep,fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:1.2,borderBottom:`2px solid ${T.brass}`,fontFamily:mono}}>{h}</th>)}</tr></thead>
              <tbody>
                {data.dirtyRows.slice(0,100).map((row,i)=>{
                  const ic={"Missing Code":T.flag,"Code Too Short":T.brass,"Unrecognized Class":T.brassDeep}[row.issue]||T.muted;
                  return(
                    <tr key={i} style={{borderBottom:`1px solid ${T.lineSoft}`,background:i%2===1?T.cardAlt:"transparent"}} onMouseOver={e=>e.currentTarget.style.background=T.card} onMouseOut={e=>e.currentTarget.style.background=i%2===1?T.cardAlt:"transparent"}>
                      <td style={{padding:"9px 12px"}}><span style={{background:`${ic}12`,padding:"2px 8px",fontSize:10.5,color:ic,border:`1px solid ${ic}44`,fontFamily:mono}}>{row.issue}</span></td>
                      <td style={{padding:"9px 12px"}}><span style={{background:T.cardAlt,padding:"2px 7px",fontSize:10.5,color:T.brassDeep,border:`1px solid ${T.brass}40`,fontWeight:700,fontFamily:mono}}>{row.rawCode}</span></td>
                      <td style={{padding:"9px 12px",color:T.ink,maxWidth:220,fontSize:12}}>{String(row.description||"—").slice(0,55)}</td>
                      <td style={{padding:"9px 12px",color:T.mutedDeep,maxWidth:160,fontSize:12}}>{String(row.vendor||"—").slice(0,35)}</td>
                      <td style={{padding:"9px 12px",color:T.moss,fontWeight:700,whiteSpace:"nowrap",fontFamily:mono}}>{fmtFull(row.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.dirtyRows.length>100&&<div style={{textAlign:"center",padding:"14px",fontSize:12,color:T.muted,fontFamily:mono}}>Showing first 100 of {data.dirtyRows.length.toLocaleString()} rows</div>}
          </div>
        </div>
      </div>
    );

    if (activeTab==="table") return (
      <Card title="Full Category Table" subtitle="All categories with spend breakdown" span2>
        <input placeholder="Search category name or code…" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} style={{width:"100%",boxSizing:"border-box",marginBottom:14,background:T.cardAlt,border:`1px solid ${T.line}`,padding:"9px 14px",color:T.ink,fontSize:13,outline:"none",fontFamily:body}}/>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,fontFamily:body}}>
            <thead><tr>{["#","Class","Description","Total Spend","% Spend","Txns","Avg/Txn"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",color:T.brassDeep,fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:1.2,borderBottom:`2px solid ${T.brass}`,whiteSpace:"nowrap",fontFamily:mono}}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(row=>{
                const rank=data.classArr.indexOf(row)+1;
                const spendPct=row.total/data.totalSpend*100;
                return(
                  <tr key={row.classCode+row.label} style={{borderBottom:`1px solid ${T.lineSoft}`,background:rank%2===0?T.cardAlt:"transparent"}} onMouseOver={e=>e.currentTarget.style.background=T.card} onMouseOut={e=>e.currentTarget.style.background=rank%2===0?T.cardAlt:"transparent"}>
                    <td style={{textAlign:"center",padding:"9px 12px",color:T.muted,fontFamily:mono}}>{rank}</td>
                    <td style={{textAlign:"center",padding:"9px 12px"}}><span style={{background:T.cardAlt,padding:"2px 8px",fontSize:11.5,color:T.brassDeep,border:`1px solid ${T.brass}40`,fontWeight:700,fontFamily:mono}}>{row.classCode}</span></td>
                    <td style={{padding:"9px 12px",color:T.navy,fontWeight:500,maxWidth:300}}>{toTC(row.label)}</td>
                    <td style={{padding:"9px 12px",color:T.moss,fontWeight:700,whiteSpace:"nowrap",fontFamily:mono}}>{fmtFull(row.total)}</td>
                    <td style={{padding:"9px 12px",minWidth:130}}><PctBar pct={spendPct} width={70}/></td>
                    <td style={{padding:"9px 12px",color:T.mutedDeep,fontFamily:mono}}>{row.count.toLocaleString()}</td>
                    <td style={{padding:"9px 12px",color:T.mutedDeep,whiteSpace:"nowrap",fontFamily:mono}}>{fmtFull(row.total/row.count)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );

    return null;
  };

  // KPI strip
  const kpis = data ? [
    {label:"Total Spend",   value:fmtFull(data.totalSpend), sub:"FY Total"},
    {label:"Transactions",  value:data.txCount.toLocaleString()},
    {label:"Categories",    value:data.classArr.length},
    ...(data.hasVendor?[{label:"Unique Vendors",value:data.vendorArr.length.toLocaleString()}]:[]),
    {label:"Health Flags",  value:data.flags.length, flagged:highFlags>0, sub:"requires review"},
    ...(vc?[{label:"Vendor HHI",value:vc.hhi.toFixed(0),flagged:vc.hhi>2500}]:[]),
    ...(data.classArr.length>0?[{label:"Top Category %",value:fmtPct(data.classArr[0].total/data.totalSpend*100),sub:data.classArr[0].displayLabel}]:[]),
    ...(data.hasVendor&&data.vendorArr.length>0?[{label:"Top Vendor %",value:fmtPct(data.vendorArr[0].total/data.totalSpend*100),sub:data.vendorArr[0].name.length>22?data.vendorArr[0].name.slice(0,21)+"…":data.vendorArr[0].name}]:[]),
  ] : [];

  return (
    <div style={{display:"flex",flex:1,overflow:"hidden"}}>
      {/* Sidebar */}
      <div style={{width:200,flexShrink:0,background:T.paper,borderRight:`1px solid ${T.line}`,padding:"16px 0",display:"flex",flexDirection:"column",overflowY:"auto"}}>
        {data&&(
          <div style={{padding:"0 16px 12px",borderBottom:`1px solid ${T.line}`,marginBottom:10}}>
            <div style={{fontSize:8.5,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.6,fontWeight:600,marginBottom:3,fontFamily:mono}}>Now Analyzing</div>
            <div style={{fontFamily:display,fontSize:13,fontWeight:600,color:T.navy,lineHeight:1.2}}>{fileName.replace(/\.csv$/i,"")}</div>
            <div style={{fontSize:10,color:T.muted,marginTop:2,fontFamily:mono}}>{data.txCount.toLocaleString()} rows</div>
          </div>
        )}
        {NAV_GROUPS.map(group=>{
          const groupTabs=group.tabs.filter(t=>availableTabs.has(t.id));
          if(groupTabs.length===0) return null;
          return(
            <div key={group.id} style={{marginBottom:6}}>
              <div style={{padding:"5px 16px 3px",fontSize:8.5,fontWeight:700,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontFamily:mono}}>{group.label}</div>
              {groupTabs.map(t=>{
                const isActive=activeTab===t.id&&stage==="analyze";
                const isAI=t.id==="aibriefing"; const isAlert=t.id==="flags"&&highFlags>0; const isCleanup=t.id==="cleanup"&&dirtyCount>0;
                const accentColor=isAI?"#7a5fc0":isAlert?T.flag:T.brass;
                const disabled=!data&&t.id!=="overview";
                return(
                  <button key={t.id} onClick={()=>{ if(disabled)return; if(t.id==="updatefile"){setStage("map");setActiveTab("updatefile");}else{setActiveTab(t.id);if(stage!=="analyze"&&data)setStage("analyze");} }}
                    style={{width:"100%",textAlign:"left",padding:"7px 16px 7px 20px",fontSize:12.5,fontWeight:isActive?600:400,cursor:disabled?"not-allowed":"pointer",border:"none",fontFamily:body,background:isActive?T.card:"transparent",color:isActive?T.navy:disabled?T.lineSoft:T.mutedDeep,borderLeft:isActive?`3px solid ${accentColor}`:"3px solid transparent",transition:"all 0.15s",display:"flex",alignItems:"center",gap:6,opacity:disabled?0.4:1}}>
                    <span style={{fontSize:10,opacity:.7}}>{t.icon}</span>
                    <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.label}</span>
                    {isAlert&&<span style={{fontSize:9,background:`${T.flag}18`,color:T.flag,padding:"1px 5px",fontWeight:700,fontFamily:mono,border:`1px solid ${T.flag}30`}}>{highFlags}</span>}
                    {isCleanup&&<span style={{fontSize:9,background:`${T.brass}18`,color:T.brassDeep,padding:"1px 5px",fontWeight:700,fontFamily:mono,border:`1px solid ${T.brass}30`}}>{dirtyCount}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
        <div style={{marginTop:"auto",padding:"12px 16px",borderTop:`1px solid ${T.line}`}}>
          <div style={{fontSize:9,color:T.lineSoft,fontFamily:mono,textAlign:"center"}}>v5.0</div>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"22px 26px",background:T.paperDeep}}>
        {/* KPI strip */}
        {data&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:18}}>
            {kpis.map(s=>(
              <div key={s.label} style={{background:T.card,border:`1px solid ${T.line}`,padding:"12px 14px",position:"relative",overflow:"hidden"}}>
                <Corners/>
                <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:5,fontFamily:mono,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.label}</div>
                <div style={{fontFamily:display,fontSize:s.label==="Total Spend"?18:22,fontWeight:500,color:s.flagged?T.flag:T.navy,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontVariantNumeric:"tabular-nums"}}>{s.value}</div>
                {s.sub&&<div style={{fontSize:9.5,color:T.mutedDeep,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontStyle:"italic"}}>{s.sub}</div>}
              </div>
            ))}
          </div>
        )}
        {renderTab()}
        {/* Footer */}
        {data&&(
          <div style={{marginTop:14,fontSize:10.5,color:T.muted,textAlign:"center",fontFamily:mono,paddingTop:12,borderTop:`1px solid ${T.lineSoft}`}}>
            {fileName} · {data.rowCount.toLocaleString()} rows · {data.txCount.toLocaleString()} valid transactions · {data.skipped} skipped
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function AnalyzerScreen() {
  const { taskId } = useParams();
  const navigate   = useNavigate();
  const { stage, setStage, setActiveTab, data, fileName, loading, error } = useAnalyzer();

  const headerRight = stage==="analyze"&&data ? (
    <button onClick={()=>{setStage("map");setActiveTab("updatefile");}} style={{background:"transparent",border:`1px solid rgba(248,242,226,.4)`,color:"#f8f2e2",padding:"6px 14px",cursor:"pointer",fontSize:12,fontFamily:body}}>← Column Mapping</button>
  ) : null;

  if (loading) return (
    <AppShell>
      <div style={{textAlign:"center",padding:"120px 0",color:T.muted}}>
        <div style={{fontFamily:display,fontSize:28,fontWeight:500,color:T.navy,marginBottom:12}}>Analyzing spend data…</div>
        <div style={{fontFamily:mono,fontSize:12,color:T.brass}}>Processing transactions · Classifying codes · Computing vendor concentration</div>
      </div>
    </AppShell>
  );

  return (
    <AppShell headerProps={{ rightContent:headerRight }}>
      {stage==="overview" && <DataSourceScreen taskId={taskId}/>}
      {stage==="map"      && <MappingScreen/>}
      {stage==="analyze"  && <AnalyzerView taskId={taskId}/>}
      {error&&stage!=="analyze"&&(
        <div style={{margin:"0 28px",background:`${T.flag}10`,border:`1px solid ${T.flag}44`,padding:"12px 16px",color:T.flag,fontSize:14}}>⚠ {error}</div>
      )}
    </AppShell>
  );
}
