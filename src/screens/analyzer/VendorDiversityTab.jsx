// src/screens/analyzer/VendorDiversityTab.jsx — v5.0.0
// Vendor Diversity / HHI tab — Lorenz curve, traffic lights, category dominance

import { T, display, body, mono, fmtFull, fmtPct, fmt, shortLabel, PALETTE } from "../../tokens.js";
import { Card, Corners, PctBar } from "../../components/SharedUI.jsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Cell,
} from "recharts";

export default function VendorDiversityTab({ vc, data, hhiTooltipVisible, setHhiTooltipVisible }) {
  if (!vc) return null;

  const trafficLight = (field, value) => {
    if (field==="hhi") return value>2500?"red":value>1500?"yellow":"green";
    if (field==="v50") return value<3?"red":value<=6?"yellow":"green";
    if (field==="v75") return value<6?"red":value<=12?"yellow":"green";
    if (field==="v90") return value<10?"red":value<=25?"yellow":"green";
    return "green";
  };
  const tlColors = { red:T.flag, yellow:T.brass, green:T.moss };
  const tlLabels = { red:"High Risk", yellow:"Moderate", green:"Healthy" };

  const TrafficLight = ({ status }) => (
    <div style={{display:"flex",alignItems:"center",gap:5,marginTop:10,paddingTop:10,borderTop:`1px solid ${T.lineSoft}`}}>
      {["red","yellow","green"].map(c=>(
        <div key={c} style={{width:10,height:10,borderRadius:"50%",flexShrink:0,background:status===c?tlColors[c]:T.paperDeep,border:`1px solid ${status===c?tlColors[c]:T.line}`}}/>
      ))}
      <span style={{fontSize:10,color:tlColors[status],fontWeight:700,marginLeft:4,fontFamily:mono}}>{tlLabels[status]}</span>
    </div>
  );

  const totalVendors = vc.vendorArr.length;
  const lorenzData = vc.cumulativeCurve.map(p=>({
    vendorPct:    parseFloat(((p.rank/totalVendors)*100).toFixed(2)),
    cumSpendPct:  parseFloat(p.cumPct.toFixed(2)),
    healthyPct:   parseFloat((100*Math.pow(p.rank/totalVendors,0.139)).toFixed(2)),
  }));
  const marker1 = lorenzData.find(p=>p.vendorPct>=20) || lorenzData[lorenzData.length-1];
  const marker1Pct = marker1 ? marker1.cumSpendPct.toFixed(1) : "—";
  const marker2 = lorenzData.find(p=>p.cumSpendPct>=80);
  const marker2VendorPct = marker2 ? marker2.vendorPct.toFixed(1) : "—";

  const top10pct = vc.vendorArr.slice(0,10).map(v=>({
    name:  v.name.length>28?v.name.slice(0,27)+"…":v.name,
    pct:   parseFloat(v.pct.toFixed(2)),
    color: v.pct>15?T.flag:v.pct>10?T.brass:T.moss,
  }));

  const VendorPctBar  = (props) => { const {x,y,width,height,index}=props; const item=top10pct[index]; if(!item) return null; return <rect x={x} y={y} width={width} height={height} rx={2} fill={item.color} fillOpacity={0.85}/>; };
  const VendorPctLabel = (props) => { const {x,y,width,value,index}=props; const item=top10pct[index]; if(!item||width<20) return null; return <text x={x+width+6} y={y+10} fill={item.color} fontSize={11} fontWeight={700} fontFamily={mono} dominantBaseline="middle">{value.toFixed(1)}%</text>; };

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

      {/* KPI strip */}
      <div style={{gridColumn:"1/-1",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {[
          {field:"hhi", label:"HHI Score",              value:vc.hhi.toFixed(0), sub:vc.hhi>2500?"Highly Concentrated":vc.hhi>1500?"Moderately Concentrated":"Competitive", numVal:vc.hhi},
          {field:"v50", label:"Vendors for 50% of Spend", value:vc.v50, sub:"higher = more diverse", numVal:vc.v50},
          {field:"v75", label:"Vendors for 75% of Spend", value:vc.v75, sub:"higher = more diverse", numVal:vc.v75},
          {field:"v90", label:"Vendors for 90% of Spend", value:vc.v90, sub:`of ${data.vendorArr.length} total`, numVal:vc.v90},
        ].map(s=>{
          const status = trafficLight(s.field, s.numVal);
          return(
            <div key={s.label} style={{background:T.card,border:`1px solid ${T.line}`,padding:"14px 16px",position:"relative"}}>
              <Corners/>
              <div style={{fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:5,fontFamily:mono,display:"flex",alignItems:"center",gap:6}}>
                {s.label}
                {s.field==="hhi"&&(
                  <span style={{position:"relative",display:"inline-flex",alignItems:"center"}}
                    onMouseEnter={()=>setHhiTooltipVisible(true)}
                    onMouseLeave={()=>setHhiTooltipVisible(false)}>
                    <span style={{width:13,height:13,borderRadius:"50%",background:T.cardAlt,border:`1px solid ${T.line}`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:T.muted,cursor:"help",fontWeight:700}}>i</span>
                    {hhiTooltipVisible&&(
                      <div style={{position:"absolute",left:"calc(100% + 10px)",top:"50%",transform:"translateY(-50%)",background:T.card,border:`1px solid ${T.line}`,padding:"12px 14px",width:290,zIndex:200,pointerEvents:"none",boxShadow:"0 8px 32px rgba(0,0,0,0.15)"}}>
                        <div style={{fontSize:12,fontWeight:700,color:T.navy,marginBottom:6,fontFamily:display}}>Herfindahl-Hirschman Index (HHI)</div>
                        <div style={{fontSize:11,color:T.mutedDeep,lineHeight:1.6,fontFamily:body}}>The HHI measures market concentration by summing the squares of each vendor's percentage share of total spend. Below 1,500 = competitive; 1,500–2,500 = moderate; above 2,500 = highly concentrated.</div>
                        <div style={{position:"absolute",left:-6,top:"50%",transform:"translateY(-50%)",width:10,height:10,background:T.card,borderLeft:`1px solid ${T.line}`,borderBottom:`1px solid ${T.line}`,rotate:"45deg"}}/>
                      </div>
                    )}
                  </span>
                )}
              </div>
              <div style={{fontFamily:display,fontSize:24,fontWeight:500,color:tlColors[status],marginBottom:2,fontVariantNumeric:"tabular-nums"}}>{s.value}</div>
              <div style={{fontSize:11,color:T.muted,fontStyle:"italic"}}>{s.sub}</div>
              <TrafficLight status={status}/>
            </div>
          );
        })}
      </div>

      {/* Vendor spend concentration bar */}
      <Card title="Vendor Spend Concentration" subtitle="Each vendor's individual share of total spend">
        <div style={{marginBottom:10,display:"flex",alignItems:"center",gap:14,fontSize:11,flexWrap:"wrap"}}>
          {[{c:T.flag,l:"Over 15% — risk"},{c:T.brass,l:"10–15% — caution"},{c:T.moss,l:"Under 10% — healthy"}].map(i=>(
            <div key={i.l} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:i.c,flexShrink:0}}/>
              <span style={{color:T.mutedDeep,fontFamily:body}}>{i.l}</span>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={top10pct} layout="vertical" margin={{left:10,right:60,top:5,bottom:20}}>
            <XAxis type="number" domain={[0,Math.max(40,Math.ceil((top10pct[0]?.pct||20)/5)*5+5)]} tickFormatter={v=>`${v}%`} tick={{fill:T.muted,fontSize:11,fontFamily:mono}} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" width={180} tick={{fill:T.mutedDeep,fontSize:10,fontFamily:body}} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v)=>[`${v.toFixed(2)}% of total spend`,"Share"]} cursor={{fill:`${T.brass}08`}}/>
            <ReferenceLine x={15} stroke={T.brass} strokeWidth={1.5} strokeDasharray="5 3" label={{value:"15% threshold",position:"top",fill:T.brassDeep,fontSize:10,fontWeight:700,fontFamily:mono}}/>
            <ReferenceLine x={10} stroke={`${T.brass}55`} strokeWidth={1} strokeDasharray="3 3"/>
            <Bar dataKey="pct" radius={[0,2,2,0]} shape={<VendorPctBar/>} label={<VendorPctLabel/>}/>
          </BarChart>
        </ResponsiveContainer>
        <div style={{fontSize:11,color:T.muted,marginTop:6,lineHeight:1.6,fontFamily:body}}>Any vendor exceeding <span style={{color:T.brassDeep,fontWeight:700}}>15%</span> of total spend represents a single-source dependency risk.</div>
      </Card>

      {/* Lorenz curve */}
      <Card title="Spend Concentration — Lorenz Curve" subtitle="How evenly is spend distributed across your vendor base?">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={lorenzData} margin={{left:10,right:20,top:10,bottom:30}}>
            <XAxis dataKey="vendorPct" type="number" domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fill:T.muted,fontSize:10,fontFamily:mono}} axisLine={false} tickLine={false} label={{value:"% of vendor base",position:"insideBottom",offset:-20,fill:T.muted,fontSize:10,fontFamily:mono}}/>
            <YAxis type="number" domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fill:T.muted,fontSize:10,fontFamily:mono}} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v,n)=>[`${v.toFixed(1)}%`,n==="cumSpendPct"?"Actual spend":n==="healthyPct"?"Healthy benchmark":n]} cursor={{stroke:T.line}}/>
            <ReferenceLine x={20} stroke={`${T.brass}60`} strokeDasharray="3 3"/>
            <ReferenceLine y={80} stroke={`${T.brass}60`} strokeDasharray="3 3"/>
            <Line type="monotone" dataKey="healthyPct" stroke={T.moss} strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="Healthy benchmark"/>
            <Line type="monotone" dataKey="cumSpendPct" stroke={T.flag} strokeWidth={2} dot={false} name="Your data"/>
          </LineChart>
        </ResponsiveContainer>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
          <div style={{background:`${T.brass}08`,border:`1px solid ${T.brass}40`,padding:"11px 14px"}}>
            <div style={{fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:T.brassDeep,marginBottom:4,fontFamily:mono}}>① 20% Vendor Mark</div>
            <div style={{fontFamily:display,fontSize:20,fontWeight:600,color:T.brassDeep,marginBottom:4}}>{marker1Pct}%</div>
            <div style={{fontSize:11,color:T.mutedDeep,lineHeight:1.5,fontFamily:body}}>of spend controlled by your top 20% of vendors. {parseFloat(marker1Pct)>80?<span style={{color:T.flag}}>Less diversified than benchmark.</span>:<span style={{color:T.moss}}>Well diversified.</span>}</div>
          </div>
          <div style={{background:`${T.moss}08`,border:`1px solid ${T.moss}40`,padding:"11px 14px"}}>
            <div style={{fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:T.moss,marginBottom:4,fontFamily:mono}}>② 80% Spend Crossover</div>
            <div style={{fontFamily:display,fontSize:20,fontWeight:600,color:T.moss,marginBottom:4}}>{marker2VendorPct}%</div>
            <div style={{fontSize:11,color:T.mutedDeep,lineHeight:1.5,fontFamily:body}}>of vendors account for 80% of spend. {parseFloat(marker2VendorPct)<20?<span style={{color:T.flag}}>Reaches 80% faster than benchmark.</span>:<span style={{color:T.moss}}>Meets the benchmark.</span>}</div>
          </div>
        </div>
      </Card>

      {/* Category dominance table */}
      {vc.catDominance.length>0&&(
        <Card title="Category Dominance — Single-Vendor Risk" subtitle="Categories where one vendor controls 70%+ of spend" span2>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,fontFamily:body}}>
              <thead><tr>{["Category","Dominant Vendor","Category Spend","Vendor Share","Vendor Spend"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",color:T.brassDeep,fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:1.2,borderBottom:`2px solid ${T.brass}`,whiteSpace:"nowrap",fontFamily:mono}}>{h}</th>)}</tr></thead>
              <tbody>
                {vc.catDominance.map((row,i)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${T.lineSoft}`,background:i%2===1?T.cardAlt:"transparent"}}
                    onMouseOver={e=>e.currentTarget.style.background=T.card}
                    onMouseOut={e=>e.currentTarget.style.background=i%2===1?T.cardAlt:"transparent"}>
                    <td style={{padding:"9px 12px",color:T.navy,fontWeight:500}}>{row.label}</td>
                    <td style={{padding:"9px 12px",color:T.ink}}>{row.vendor}</td>
                    <td style={{padding:"9px 12px",color:T.brassDeep,fontWeight:700,whiteSpace:"nowrap",fontFamily:mono}}>{fmtFull(row.catAmt)}</td>
                    <td style={{padding:"9px 12px"}}><PctBar pct={row.pct} color={row.pct>=90?T.flag:row.pct>=80?T.brass:T.moss} width={60}/></td>
                    <td style={{padding:"9px 12px",color:T.mutedDeep,fontFamily:mono}}>{fmtFull(row.amt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
