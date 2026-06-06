// DeepBench v5.1.2 | AnalyzerContext.jsx | Analyzer state + CSV Storage sync

import { createContext, useContext, useState, useRef, useCallback, useMemo } from "react";
import Papa from "papaparse";
import { TENANT_ID } from "../config.js";
import { supabase } from "../lib/supabase.js";
import { parseAmt, shortLabel } from "../tokens.js";
import { resolveNIGP, NIGP_CLASS as NIGP_CLASS_LOOKUP } from "../nigp-lookup.js";

const AnalyzerContext = createContext(null);

// ── Field definitions for column auto-detection ───────────────────────────────
export const FIELD_DEFS = {
  amount:      { label:"💰 Spend Amount",      required:true,  hint:"Dollar value per transaction",         synonyms:["itm_tot_am","amount","total","spend","cost","price","value","sum","extended","amt","dollar","extended_amount","total_amount","line_total","po_amount"] },
  nigp:        { label:"🏷 NIGP Code",          required:false, hint:"Commodity / class code",               synonyms:["commodity","nigp","class","code","item_class","commodity_code","nigp_code","item_no","class_code","nigp_class","nigp_commodity"] },
  description: { label:"📋 Item Description",  required:false, hint:"What was purchased",                   synonyms:["commodity_description","description","desc","item_desc","service","product","title","line_desc","item_description","extended_description"] },
  vendor:      { label:"🏢 Vendor Name",        required:false, hint:"Supplier / contractor legal name",     synonyms:["lgl_nm","vendor","supplier","payee","contractor","company","vendor_name","legal_name","legalname","vendor_legal_name","firm"] },
  contract:    { label:"📄 Contract / MA #",    required:false, hint:"Master agreement or contract number",  synonyms:["master_agreement","contract","contract_no","contract_number","ma_number","agreement","po_contract","contract_id","master_agreement_no"] },
  po:          { label:"🔢 PO Number",          required:false, hint:"Purchase order number",               synonyms:["purchase_order","po","po_number","po_no","order_number","doc_no","po_num"] },
  department:  { label:"🏛 Department",         required:false, hint:"Agency or division that purchased",    synonyms:["department","dept","agency","division","bureau","org_unit","department_name","dept_name","department_id","dept_id","agency_name","agency_code","division_name","org_name","cost_center","fund","program","department_code"] },
  vendor_city: { label:"🏙 Vendor City",        required:false, hint:"City where vendor is located",        synonyms:["city","vendor_city","supplier_city","address_city","vendor_city_name","city_name"] },
  vendor_state:{ label:"📍 Vendor State",       required:false, hint:"State where vendor is located",       synonyms:["st","state","vendor_state","supplier_state","address_state","vendor_st"] },
  date:        { label:"📅 Date",               required:false, hint:"Award or transaction date",           synonyms:["award_date","date","po_date","order_date","transaction_date","purchase_date","doc_date","invoice_date"] },
};

function autoDetect(columns) {
  const result = {};
  const norm = columns.map(c => c.toLowerCase().replace(/[^a-z0-9_]/g, ""));
  for (const [field, def] of Object.entries(FIELD_DEFS)) {
    const idx = def.synonyms.findIndex(s => norm.includes(s));
    if (idx !== -1) { result[field] = columns[norm.indexOf(def.synonyms[idx])]; continue; }
    if (field === "department") { result[field] = ""; continue; }
    const partial = columns.find(c => def.synonyms.some(s => c.toLowerCase().replace(/[^a-z0-9_]/g,"").includes(s)));
    result[field] = partial || "";
  }
  return result;
}

// ── computeFlags ─────────────────────────────────────────────────────────────
function computeFlags(rows, mapping) {
  const { amount:aC, nigp:nC, vendor:vC, contract:cC, po:pC, vendor_state:sC, date:dC } = mapping;
  const flags = [];
  const total = rows.reduce((s, r) => s + r._amt, 0);
  const fmtFull = n => "$"+Math.round(Number(n)).toLocaleString("en-US");
  const fmt = n => n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}K`:`$${Math.round(n).toLocaleString()}`;
  const fmtPct = (n,d=1) => `${n.toFixed(d)}%`;

  // 1. Maverick spend
  if (cC) {
    const mav = rows.filter(r => !r[cC] || String(r[cC]).trim() === "");
    const mAmt = mav.reduce((s,r)=>s+r._amt,0);
    const mPct = mAmt/total*100;
    if (mPct > 2) flags.push({ severity:mPct>15?"high":mPct>7?"medium":"low", title:"Maverick Spend — Purchases Outside Contract Coverage", summary:`${fmtPct(mPct)} of total spend (${fmtFull(mAmt)}) on ${mav.length.toLocaleString()} transactions has no master agreement or contract on record.`, detail:`Off-contract purchases typically cost 15–25% more than contracted prices and bypass competitive procurement requirements.`, recommendation:`Identify the top 20 off-contract vendors by spend. For recurring categories, initiate competitive solicitations.`, amount:mAmt, count:mav.length });
  }

  // 2. PO splitting
  if (pC && vC && dC) {
    const grouped = {};
    for (const r of rows) {
      const v=String(r[vC]||"").trim(), d=String(r[dC]||"").trim();
      if(!v||!d) continue;
      const k=`${v}||${d}`;
      if(!grouped[k]) grouped[k]={vendor:v,date:d,pos:new Set(),amt:0,count:0};
      grouped[k].pos.add(r[pC]); grouped[k].amt+=r._amt; grouped[k].count++;
    }
    const splits=Object.values(grouped).filter(g=>g.pos.size>=3).sort((a,b)=>b.amt-a.amt);
    const splitAmt=splits.reduce((s,g)=>s+g.amt,0);
    if(splits.length>0){const ex=splits.slice(0,3).map(g=>`${g.vendor} (${g.pos.size} POs on ${g.date}, ${fmtFull(g.amt)})`).join("; ");flags.push({severity:"high",title:"Potential PO Splitting — Multiple POs to Same Vendor on Same Day",summary:`${splits.length} instances found where a single vendor received 3+ purchase orders on the same date, totaling ${fmtFull(splitAmt)}.`,detail:`PO splitting is used to circumvent approval thresholds. Top instances: ${ex}.`,recommendation:`Pull full purchase histories for flagged vendors. Compare PO values to your jurisdiction's small purchase and competitive bid thresholds.`,amount:splitAmt,count:splits.length});}
  }

  // 3. Single-source concentration
  if (vC && nC) {
    const catVendor={},catTotal={};
    for(const r of rows){const {classCode}=resolveNIGP(r[nC]);const v=String(r[vC]||"Unknown").trim();const k=`${classCode}||${v}`;if(!catVendor[k])catVendor[k]={classCode,vendor:v,amt:0};catVendor[k].amt+=r._amt;if(!catTotal[classCode])catTotal[classCode]=0;catTotal[classCode]+=r._amt;}
    const singles=Object.values(catVendor).filter(x=>catTotal[x.classCode]>=250000&&x.amt/catTotal[x.classCode]>=0.80).map(x=>({...x,pct:x.amt/catTotal[x.classCode]*100,catAmt:catTotal[x.classCode],label:shortLabel(NIGP_CLASS_LOOKUP[x.classCode]||`Class ${x.classCode}`)})).sort((a,b)=>b.catAmt-a.catAmt);
    if(singles.length>0){const totalSingle=singles.reduce((s,x)=>s+x.catAmt,0);const ex=singles.slice(0,3).map(x=>`${x.label} (${x.vendor}, ${x.pct.toFixed(0)}% share)`).join("; ");flags.push({severity:singles.length>=5?"high":"medium",title:"Single-Source Vendor Concentration — Categories With One Dominant Supplier",summary:`${singles.length} spend categories (totaling ${fmtFull(totalSingle)}) have one vendor controlling 80%+ of category spend.`,detail:`Single-source dependency limits price competition. Examples: ${ex}.`,recommendation:`For categories with >$500K single-source spend, initiate market surveys to identify alternative qualified vendors.`,amount:totalSingle,count:singles.length});}
  }

  // 4. Spend spikes
  if(dC){const monthly={};for(const r of rows){const raw=String(r[dC]||"");const m=raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);if(m){const mo=m[1].padStart(2,"0"),yr=m[3].length===2?"20"+m[3]:m[3],k=`${yr}-${mo}`;if(!monthly[k])monthly[k]=0;monthly[k]+=r._amt;}}const months=Object.entries(monthly).sort((a,b)=>a[0].localeCompare(b[0]));if(months.length>=4){const amts=months.map(([,a])=>a);const avg=amts.reduce((s,a)=>s+a,0)/amts.length;const spikes=months.filter(([,a])=>a>avg*1.8).map(([mo,a])=>({month:mo,amt:a,ratio:a/avg}));if(spikes.length>0){const spikeAmt=spikes.reduce((s,sp)=>s+sp.amt,0);const spikeDesc=spikes.map(sp=>`${sp.month} (${fmt(sp.amt)}, ${sp.ratio.toFixed(1)}× avg)`).join(", ");flags.push({severity:"medium",title:"Abnormal Monthly Spend Spikes — Potential Use-It-or-Lose-It Budgeting",summary:`${spikes.length} month${spikes.length>1?"s":""} show spending more than 1.8× the monthly average: ${spikeDesc}.`,detail:`End-of-fiscal-year spending surges often indicate "use it or lose it" budget behavior.`,recommendation:`Cross-reference spike months against your fiscal year end. Audit the 20 largest purchases during spike months.`,amount:spikeAmt,count:spikes.length});}}}

  // 5. Long-tail vendor sprawl
  if(vC){const vendorSpend={};for(const r of rows){const v=String(r[vC]||"Unknown").trim();if(!vendorSpend[v])vendorSpend[v]=0;vendorSpend[v]+=r._amt;}const sorted=Object.values(vendorSpend).sort((a,b)=>b-a);const n=sorted.length;const tail=sorted.slice(Math.floor(n*0.8));const tailAmt=tail.reduce((s,a)=>s+a,0);const tailPct=tailAmt/total*100;const tailCount=tail.length;if(tailCount>20&&tailPct>1){flags.push({severity:"low",title:"Long-Tail Vendor Sprawl — Administrative Overhead Risk",summary:`The bottom 20% of vendors (${tailCount.toLocaleString()} suppliers) account for only ${fmtPct(tailPct)} of spend but generate disproportionate overhead.`,detail:`Managing hundreds of small vendors creates significant administrative burden.`,recommendation:`Set a minimum vendor spend threshold below which purchases must be consolidated or P-carded.`,amount:tailAmt,count:tailCount});}}

  // 6. Out-of-state spend
  if(sC){const stateSpend={};for(const r of rows){const s=String(r[sC]||"Unknown").trim().toUpperCase();if(!stateSpend[s])stateSpend[s]=0;stateSpend[s]+=r._amt;}const localState=Object.entries(stateSpend).sort((a,b)=>b[1]-a[1])[0];if(localState){const outOfState=total-localState[1];const outPct=outOfState/total*100;if(outPct>40){flags.push({severity:"info",title:"Out-of-State Vendor Spend — Review Local Preference Compliance",summary:`${fmtPct(outPct)} of spend (${fmtFull(outOfState)}) flows to out-of-state vendors.`,detail:`Many government jurisdictions have local vendor preference policies.`,recommendation:`Review your jurisdiction's local preference ordinance.`,amount:outOfState,count:null});}}}

  return flags;
}

// ── computeVendorConc ─────────────────────────────────────────────────────────
function computeVendorConc(rows, mapping, totalSpend) {
  const { vendor:vC, nigp:nC } = mapping;
  if (!vC) return null;
  const byVendor={};
  for(const r of rows){const v=String(r[vC]||"Unknown").trim();if(!byVendor[v])byVendor[v]={name:v,total:0,count:0,categories:new Set()};byVendor[v].total+=r._amt;byVendor[v].count++;if(nC){const {classCode}=resolveNIGP(r[nC]);byVendor[v].categories.add(classCode);}}
  const vendorArr=Object.values(byVendor).map(v=>({...v,categories:v.categories.size,pct:v.total/totalSpend*100})).sort((a,b)=>b.total-a.total);
  const hhi=vendorArr.reduce((s,v)=>s+(v.pct)*(v.pct),0);
  let cum=0;const cumulativeCurve=vendorArr.map((v,i)=>{cum+=v.pct;return{rank:i+1,vendor:v.name,pct:v.pct,cumPct:cum};});
  const v50=cumulativeCurve.find(p=>p.cumPct>=50)?.rank||0;const v75=cumulativeCurve.find(p=>p.cumPct>=75)?.rank||0;const v90=cumulativeCurve.find(p=>p.cumPct>=90)?.rank||0;
  const catVendor={},catTotal={};
  if(nC){for(const r of rows){const {classCode}=resolveNIGP(r[nC]);const v=String(r[vC]||"Unknown").trim();const k=`${classCode}||${v}`;if(!catVendor[k])catVendor[k]={classCode,label:shortLabel(NIGP_CLASS_LOOKUP[classCode]||`Class ${classCode}`),vendor:v,amt:0};catVendor[k].amt+=r._amt;if(!catTotal[classCode])catTotal[classCode]=0;catTotal[classCode]+=r._amt;}}
  const catDominance=Object.values(catVendor).filter(x=>catTotal[x.classCode]>=100000).map(x=>({...x,pct:x.amt/catTotal[x.classCode]*100,catAmt:catTotal[x.classCode]})).sort((a,b)=>b.catAmt-a.catAmt).filter(x=>x.pct>=70).slice(0,20);
  return{vendorArr,cumulativeCurve,hhi,v50,v75,v90,catDominance};
}

// ── computeAnalysisData ───────────────────────────────────────────────────────
// Pure helper — processes full Papa results with an explicit mapping object.
// Used by runAnalysis and processFile (autoAnalyze path) to avoid duplication.
function computeAnalysisData(results, mapping) {
  const { amount:aC, nigp:nC, vendor:vC, contract:cC, po:pC, department:dC, vendor_state:sC, vendor_city:cityC, date:dtC } = mapping;
  const rows=[], byClass={}, byVendor={}, byDept={}, byMonth={};
  let total=0, txCount=0, skipped=0, unrecognized=0;
  const dirtyRows=[];

  for (const row of results.data || []) {
    const amt = parseAmt(row[aC]);
    if (isNaN(amt) || amt <= 0) { skipped++; continue; }
    row._amt = amt; rows.push(row);

    const rawCode = row[nC];
    const { classCode, label } = resolveNIGP(rawCode);
    const isMissing     = !rawCode || String(rawCode).trim()==='' || String(rawCode).trim()==='0';
    const isPlaceholder = !isMissing && String(rawCode).replace(/\D/g,'').length < 3;
    const isUnrecognized = !isMissing && !isPlaceholder && label.startsWith("Unrecognized");

    if (isMissing || isPlaceholder || isUnrecognized) {
      unrecognized++;
      dirtyRows.push({ rawCode:isMissing?'(blank)':String(rawCode).trim(), classCode, issue:isMissing?'Missing Code':isPlaceholder?'Code Too Short':'Unrecognized Class', description:row[mapping.description]||row['COMMODITY_DESCRIPTION']||'', vendor:vC?(String(row[vC]||'').trim()||'Unknown'):'', amount:amt, po:mapping.po?String(row[mapping.po]||'').trim():'', date:dtC?String(row[dtC]||'').trim():'', rawRow:row });
    }

    const key = `${classCode}|${label}`;
    if (!byClass[key]) byClass[key] = { label, displayLabel:shortLabel(label), classCode, total:0, count:0 };
    byClass[key].total += amt; byClass[key].count++;

    if (vC && row[vC]) { const v=String(row[vC]).trim()||"Unknown"; if(!byVendor[v])byVendor[v]={name:v,total:0,count:0}; byVendor[v].total+=amt; byVendor[v].count++; }
    if (dC && row[dC]) { const d=String(row[dC]).trim()||"Unknown"; if(!byDept[d])byDept[d]={name:d,total:0,count:0}; byDept[d].total+=amt; byDept[d].count++; }
    if (dtC && row[dtC]) { const m=String(row[dtC]).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/); if(m){const mo=m[1].padStart(2,"0"),yr=m[3].length===2?"20"+m[3]:m[3],k=`${yr}-${mo}`;if(!byMonth[k])byMonth[k]={month:k,total:0,count:0};byMonth[k].total+=amt;byMonth[k].count++;} }
    total += amt; txCount++;
  }

  const classArr  = Object.values(byClass).sort((a,b)=>b.total-a.total);
  const vendorArr = Object.values(byVendor).sort((a,b)=>b.total-a.total);
  const deptArr   = Object.values(byDept).sort((a,b)=>b.total-a.total);
  const monthArr  = Object.values(byMonth).sort((a,b)=>a.month.localeCompare(b.month));
  const flags     = computeFlags(rows, mapping);
  const vendorConc = computeVendorConc(rows, mapping, total);
  const cityValues  = cityC ? [...new Set(rows.map(r=>String(r[cityC]||"").trim()).filter(Boolean))].sort() : [];
  const stateValues = sC    ? [...new Set(rows.map(r=>String(r[sC]||"").trim().toUpperCase()).filter(Boolean))].sort() : [];

  return {
    classArr, vendorArr, deptArr, monthArr,
    totalSpend: total, txCount, skipped, unrecognized,
    hasVendor: !!mapping.vendor && vendorArr.length > 0,
    hasDept:   !!mapping.department && deptArr.length > 0,
    hasDate:   monthArr.length > 0,
    hasContract: !!mapping.contract,
    rowCount: (results.data || []).length,
    flags, vendorConc, dirtyRows, rows,
    cityValues, stateValues,
    hasCityField:  !!cityC,
    hasStateField: !!sC,
  };
}

// ── Module-level file store ───────────────────────────────────────────────────
export const fileStore = { current: null };

// ── Provider ──────────────────────────────────────────────────────────────────
export function AnalyzerProvider({ children }) {
  const [stage,    setStage]    = useState("overview"); // "overview"|"map"|"analyze"
  const [columns,  setColumns]  = useState([]);
  const [fileName, setFileName] = useState("");
  const [mapping,  setMapping]  = useState({});
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoLoaded, setAutoLoaded] = useState(false);

  const [localViewBy,  setLocalViewBy]  = useState("city");
  const [localSelected, setLocalSelected] = useState("");
  const [localApplied, setLocalApplied] = useState(null);

  // Legacy single-agent briefing
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult,  setAiResult]  = useState(null);
  const [aiError,   setAiError]   = useState("");
  const [hhiTooltipVisible, setHhiTooltipVisible] = useState(false);

  // AI Review
  const [aiReviewStage,    setAiReviewStage]    = useState(1);
  const [aiPickedAgents,   setAiPickedAgents]   = useState([]);
  const [aiResults,        setAiResults]        = useState({});
  const [aiReviewError,    setAiReviewError]    = useState("");
  const [aiChristySelected, setAiChristySelected] = useState(false);
  const [sessionConfigs,   setSessionConfigs]   = useState({});
  const [agentConfigOptions, setAgentConfigOptions] = useState({});

  const inputRef      = useRef();
  const hiddenInputRef = useRef();

  // ── processFile ──────────────────────────────────────────────────────────
  // FEATURE: SH-07 — CSV Storage upload after processFile
  // autoAnalyze=true: skip mapping screen, run full analysis immediately (demo task)
  // savedMapping: restore a previously saved column mapping on return visit
  const processFile = useCallback((file, taskId, autoAnalyze = false, savedMapping = null) => {
    if (!file) return;
    setLoading(true); setError(""); setFileName(file.name);
    fileStore.current = file;

    if (autoAnalyze) {
      // Full parse — no preview, no map stage, go directly to analyze
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: results => {
          try {
            const cols = Object.keys(results.data[0] || {});
            if (!cols.length) { setError("No columns found."); setLoading(false); return; }
            const detectedMapping = autoDetect(cols);
            setColumns(cols);
            setMapping(detectedMapping);
            if (!detectedMapping.amount) {
              // Amount column not detected — fall back to mapping screen
              setStage("map");
              setLoading(false);
              return;
            }
            setData(computeAnalysisData(results, detectedMapping));
            setActiveTab("overview");
            setStage("analyze");
          } catch(e) { setError(e.message); }
          setLoading(false);
        },
        error: e => { setError("Parse error: " + e.message); setLoading(false); },
      });
      return;
    }

    Papa.parse(file, {
      header: true, skipEmptyLines: true, preview: 5,
      complete: results => {
        const cols = Object.keys(results.data[0] || {});
        if (!cols.length) { setError("No columns found."); setLoading(false); return; }
        setColumns(cols);
        const resolvedMapping = savedMapping
          ? Object.fromEntries(Object.entries(savedMapping).map(([k, v]) => [k, typeof v === "string" ? v : ""]))
          : autoDetect(cols);
        setMapping(resolvedMapping);
        setStage("map");
        setLoading(false);
        if (taskId && taskId !== "1") {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const base64 = e.target.result.split(",")[1];
              const res = await fetch("/api/upload-csv", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ fileBase64: base64, taskId, tenantId: TENANT_ID }),
              });
              const json = await res.json();
              if (json.path) console.log("CSV saved to Storage:", json.path);
              else if (json.error) console.error("CSV Storage upload error:", json.error);
            } catch (err) {
              console.error("CSV Storage upload failed:", err);
            }
          };
          reader.onerror = (err) => console.error("CSV read for upload failed:", err);
          reader.readAsDataURL(file);
        }
      },
      error: e => { setError("Parse error: " + e.message); setLoading(false); },
    });
  }, []);

  // ── runAnalysis ──────────────────────────────────────────────────────────
  // FEATURE: AZ-03 — column mapping saved to Supabase
  const runAnalysis = useCallback((taskId) => {
    if (!mapping.amount) { setError("Please assign the Spend Amount column."); return; }
    setLoading(true); setError("");
    Papa.parse(fileStore.current, {
      header: true, skipEmptyLines: true,
      complete: results => {
        try {
          setData(computeAnalysisData(results, mapping));
          setActiveTab("overview");
          setStage("analyze");
          if (taskId && taskId !== "1") {
            supabase.from("tasks")
              .update({ mapping })
              .eq("id", taskId)
              .eq("tenant_id", TENANT_ID)
              .then(({ error }) => {
                if (error) console.error("Mapping save failed:", error.message);
              });
          }
        } catch(e) { setError(e.message); }
        setLoading(false);
      },
      error: e => { setError("Parse error: " + e.message); setLoading(false); },
    });
  }, [mapping]);

  // ── loadAgentConfigOptions ────────────────────────────────────────────────
  const loadAgentConfigOptions = useCallback(async (agentId) => {
    if (agentConfigOptions[agentId]) return;
    try {
      const [rRes, fRes] = await Promise.all([
        fetch(`/api/agent-configs?tenant_id=${TENANT_ID}&agent_id=${agentId}&type=role_prompt`),
        fetch(`/api/agent-configs?tenant_id=${TENANT_ID}&agent_id=${agentId}&type=output_format`),
      ]);
      const [rData, fData] = await Promise.all([rRes.json(), fRes.json()]);
      const rolePrompts   = (rData.configs || []).filter(c => c.is_user_selectable || c.is_default);
      const outputFormats = (fData.configs || []).filter(c => c.is_user_selectable || c.is_default);
      setSessionConfigs(prev => {
        const current  = prev[agentId] || {};
        const defRole  = rolePrompts.find(c => c.is_default);
        const defFormat = outputFormats.find(c => c.is_default);
        return { ...prev, [agentId]: {
          role_prompt_id:   current.role_prompt_id   || (defRole?.id   || ""),
          output_format_id: current.output_format_id || (defFormat?.id || ""),
        }};
      });
      setAgentConfigOptions(prev => ({ ...prev, [agentId]: { rolePrompts, outputFormats } }));
    } catch(e) { console.warn("Could not load agent config options for", agentId, e.message); }
  }, [agentConfigOptions]);

  const setSessionConfig = useCallback((agentId, field, value) => {
    setSessionConfigs(prev => ({ ...prev, [agentId]: { ...(prev[agentId] || {}), [field]: value } }));
  }, []);

  // ── Derived memos ─────────────────────────────────────────────────────────
  const dirtyCount  = data?.dirtyRows?.length || 0;
  const highFlags   = (data?.flags || []).filter(f => f.severity === "high").length;
  const availableTabs = useMemo(() => {
    if (!data) return new Set(["overview"]);
    const s = new Set(["overview","categories","treemap","flags","concentration","localspend","aibriefing","table","updatefile"]);
    if (data.hasVendor)  s.add("vendors");
    if (data.hasDept)    s.add("departments");
    if (data.hasDate)    s.add("timeline");
    if (dirtyCount > 0)  s.add("cleanup");
    return s;
  }, [data, dirtyCount]);

  const value = {
    stage, setStage,
    columns, setColumns,
    fileName, setFileName,
    mapping, setMapping,
    data, setData,
    loading, setLoading,
    error, setError,
    activeTab, setActiveTab,
    searchTerm, setSearchTerm,
    localViewBy, setLocalViewBy,
    localSelected, setLocalSelected,
    localApplied, setLocalApplied,
    aiLoading, setAiLoading,
    aiResult, setAiResult,
    aiError, setAiError,
    hhiTooltipVisible, setHhiTooltipVisible,
    aiReviewStage, setAiReviewStage,
    aiPickedAgents, setAiPickedAgents,
    aiResults, setAiResults,
    aiReviewError, setAiReviewError,
    aiChristySelected, setAiChristySelected,
    sessionConfigs, setSessionConfigs,
    agentConfigOptions,
    inputRef, hiddenInputRef,
    // Derived
    dirtyCount, highFlags, availableTabs,
    // Actions
    autoLoaded, setAutoLoaded,
    processFile, runAnalysis,
    loadAgentConfigOptions, setSessionConfig,
    // Helpers
    autoDetect, computeFlags, computeVendorConc,
  };

  return <AnalyzerContext.Provider value={value}>{children}</AnalyzerContext.Provider>;
}

export function useAnalyzer() {
  const ctx = useContext(AnalyzerContext);
  if (!ctx) throw new Error("useAnalyzer must be used within AnalyzerProvider");
  return ctx;
}
