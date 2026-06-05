// DeepBench v5.1.0 | LocalSpendTab.jsx | Analyzer Local Spend tab — city/state filter, breakdown
// FEATURE: AZ-13 — Tab: Local Spend
// src/screens/analyzer/LocalSpendTab.jsx — v5.0.1
// Local Spend tab — city/state filter, local vs out-of-area breakdown

import { T, display, body, mono, fmtFull, fmtPct, fmt, PALETTE } from "../../tokens.js";
import { Card, Corners, PctBar } from "../../components/SharedUI.jsx";
import { resolveNIGP, NIGP_CLASS as NIGP_CLASS_LOOKUP } from "../../nigp-lookup.js";
import { shortLabel } from "../../tokens.js";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export default function LocalSpendTab({
  data, mapping,
  localViewBy, setLocalViewBy,
  localSelected, setLocalSelected,
  localApplied, setLocalApplied,
}) {
  const cityC  = mapping.vendor_city;
  const stateC = mapping.vendor_state;
  const hasCity  = !!cityC  && data.cityValues.length  > 0;
  const hasState = !!stateC && data.stateValues.length > 0;
  const dropdownOptions = localViewBy==="city" ? data.cityValues : data.stateValues;

  const ls = localApplied ? (() => {
    const { viewBy, value } = localApplied;
    const fieldCol = viewBy==="city" ? cityC : stateC;
    if (!fieldCol) return null;
    const localRows=[], nonLocalRows=[];
    for (const r of data.rows) {
      const v = String(r[fieldCol]||"").trim();
      const match = viewBy==="state" ? v.toUpperCase()===value.toUpperCase() : v.toLowerCase()===value.toLowerCase();
      if (match) localRows.push(r); else nonLocalRows.push(r);
    }
    const localTotal    = localRows.reduce((s,r)=>s+r._amt,0);
    const localPct      = data.totalSpend>0 ? localTotal/data.totalSpend*100 : 0;
    const localVendors  = new Set(localRows.map(r=>mapping.vendor?String(r[mapping.vendor]||"").trim():"").filter(Boolean));
    const localCats = {};
    for (const r of localRows) {
      const { classCode, label } = resolveNIGP(r[mapping.nigp]);
      const dl = shortLabel(label);
      if (!localCats[dl]) localCats[dl] = { name:dl, value:0 };
      localCats[dl].value += r._amt;
    }
    const topLocalCats = Object.values(localCats).sort((a,b)=>b.value-a.value).slice(0,8);
    return { localTotal, nonLocalTotal:data.totalSpend-localTotal, localPct, nonLocalPct:100-localPct, localVendors:localVendors.size, localTxns:localRows.length, nonLocalTxns:nonLocalRows.length, value, topLocalCats };
  })() : null;

  const areaName = ls ? ls.value : "—";

  return (
    <div>
      {/* Filter controls */}
      <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"16px 20px",marginBottom:16,position:"relative"}}>
        <Corners/>
        <div style={{fontFamily:display,fontSize:15,fontWeight:600,color:T.navy,marginBottom:12}}>Local Spend Analysis</div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start"}}>
          <div>
            <div style={{fontFamily:mono,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.3,fontWeight:600,marginBottom:8}}>Choose either — City or State</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[{val:"city",label:"🏙 Search by City",avail:hasCity},{val:"state",label:"🗺 Search by State",avail:hasState}].map(opt=>(
                <button key={opt.val} onClick={()=>{if(opt.avail){setLocalViewBy(opt.val);setLocalSelected("");}}} disabled={!opt.avail}
                  style={{padding:"8px 16px",fontSize:12,fontWeight:700,cursor:opt.avail?"pointer":"not-allowed",border:`1px solid ${localViewBy===opt.val&&opt.avail?T.moss:T.line}`,fontFamily:body,opacity:opt.avail?1:0.35,background:localViewBy===opt.val&&opt.avail?`${T.moss}15`:T.cardAlt,color:localViewBy===opt.val&&opt.avail?T.moss:T.muted,textAlign:"left",minWidth:180}}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,alignSelf:"flex-end"}}>
            <select value={localSelected} onChange={e=>setLocalSelected(e.target.value)} disabled={dropdownOptions.length===0}
              style={{background:T.cardAlt,border:`1px solid ${T.line}`,padding:"8px 12px",color:localSelected?T.ink:T.muted,fontSize:13,fontFamily:body,cursor:"pointer",outline:"none",minWidth:200}}>
              <option value="">— Choose a {localViewBy==="city"?"city":"state"} —</option>
              {dropdownOptions.map(v=><option key={v} value={v}>{v}</option>)}
            </select>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{if(localSelected) setLocalApplied({viewBy:localViewBy,value:localSelected});}} disabled={!localSelected}
                style={{background:localSelected?`linear-gradient(135deg,${T.moss},${T.brassDeep})`:T.line,border:"none",color:localSelected?T.card:T.muted,padding:"8px 20px",fontSize:13,fontWeight:700,cursor:localSelected?"pointer":"not-allowed",fontFamily:display}}>
                Apply →
              </button>
              {localApplied&&<button onClick={()=>{setLocalApplied(null);setLocalSelected("");}} style={{background:"transparent",border:`1px solid ${T.line}`,color:T.mutedDeep,padding:"8px 14px",fontSize:13,cursor:"pointer",fontFamily:body}}>Reset</button>}
            </div>
          </div>
        </div>
      </div>

      {!localApplied&&(
        <div style={{background:`${T.moss}06`,border:`1px solid ${T.moss}22`,padding:"60px 40px",textAlign:"center"}}>
          <div style={{fontFamily:display,fontSize:18,fontWeight:600,color:T.navy,marginBottom:8}}>Select a local area to begin</div>
          <div style={{fontSize:13,color:T.muted,fontFamily:body}}>Choose a city or state above to see local vs. out-of-area spend breakdown.</div>
        </div>
      )}

      {ls&&(
        <>
          {/* KPI strip */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
            {[
              {label:`In ${areaName}`,        val:fmtFull(ls.localTotal),         pill:`${ls.localPct.toFixed(1)}%`,        accent:T.moss},
              {label:`Out of ${areaName}`,    val:fmtFull(ls.nonLocalTotal),      pill:`${ls.nonLocalPct.toFixed(1)}%`,     accent:T.flag},
              {label:`Vendors in ${areaName}`,val:ls.localVendors,                pill:`${ls.localTxns.toLocaleString()} txns`, accent:T.brass},
              {label:`TXNs out of ${areaName}`,val:ls.nonLocalTxns.toLocaleString(),pill:`${ls.nonLocalPct.toFixed(1)}% of txns`, accent:T.brassDeep},
            ].map(k=>(
              <div key={k.label} style={{background:T.card,border:`1px solid ${T.line}`,padding:"14px 16px",position:"relative"}}>
                <Corners/>
                <div style={{fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:5,fontWeight:600,lineHeight:1.3,fontFamily:mono}}>{k.label}</div>
                <div style={{fontFamily:display,fontSize:20,fontWeight:500,color:k.accent,marginBottom:3}}>{k.val}</div>
                <div style={{fontSize:11.5,color:T.mutedDeep,fontStyle:"italic"}}>{k.pill}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <Card title="% In & Out" subtitle="Share of total spend">
              <div style={{height:300}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{name:`In ${areaName}`,value:ls.localTotal},{name:`Out of ${areaName}`,value:ls.nonLocalTotal}]}
                      cx="50%" cy="44%" outerRadius={100} dataKey="value"
                      label={({percent})=>`${(percent*100).toFixed(1)}%`} labelLine={{stroke:T.line}}>
                      <Cell fill={T.moss} stroke={T.paperDeep} strokeWidth={2}/>
                      <Cell fill={T.flag} stroke={T.paperDeep} strokeWidth={2}/>
                    </Pie>
                    <Tooltip formatter={(v)=>[fmtFull(v),"Spend"]}/>
                    <Legend formatter={v=><span style={{color:T.mutedDeep,fontSize:11,fontFamily:body}}>{v}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title={`Top Categories in ${areaName}`} subtitle="Spend by class within local area">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ls.topLocalCats} layout="vertical" margin={{left:10,right:60,top:5,bottom:5}}>
                  <XAxis type="number" tickFormatter={fmt} tick={{fill:T.muted,fontSize:10,fontFamily:mono}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" width={150} tick={{fill:T.mutedDeep,fontSize:10,fontFamily:body}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={(v)=>[fmtFull(v),"Spend"]}/>
                  <Bar dataKey="value" radius={[0,3,3,0]}>
                    {ls.topLocalCats.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]} fillOpacity={0.85}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
