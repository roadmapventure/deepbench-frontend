// DeepBench v5.2.28 | agents.js | AG-14/15/16 three editor agents added
// FEATURE: SH-03 — Agent roster data
// src/data/agents.js — v5.0.0
// DeepBench v5 — Authoritative agent roster
// Single source of truth. useAgents() hook wraps this array.
// Do NOT define agents anywhere else.

import { T } from "../tokens.js";

export const AGENTS = [
  {
    id: "chloe", name: "Chloe Okafor", role: "Junior Procurement Analyst",
    code: "JR-01", hiredOn: "Feb 2025", trainer: "RMV", arch: "LLM Prompt",
    specialty: "Quick Analysis · Anything Obvious",
    salary: 60000, value: 60000, hourly: 31, reportHrs: 2, reportCost: 63,
    docs: 0, classes: 0, chunks: 0, skill: 18, situational: 10,
    trainable: false, trainableBy: "RMV", revenueModel: "Freemium · Included",
    quip: '"I spot the obvious stuff fast."', color: T.brass,
  },
  {
    id: "mike", name: "Mike Alvarez", role: "Senior Procurement Analyst",
    code: "SR-02", hiredOn: "Jun 2023", trainer: "RMV", arch: "LLM Deep Prompt",
    specialty: "Industry Best-Practice Analysis",
    salary: 90000, value: 90000, hourly: 47, reportHrs: 3, reportCost: 141,
    docs: 0, classes: 0, chunks: 0, skill: 42, situational: 25,
    trainable: false, trainableBy: "RMV", revenueModel: "Teaser · 10% NIGP split",
    quip: '"Industry patterns are where I shine."', color: T.brass,
  },
  {
    id: "bob", name: "Bob Whitfield", role: "Professional Procurement Analyst",
    code: "PR-04", hiredOn: "May 2021", trainer: "Gov't", arch: "RAG",
    specialty: "Legal & Internal Audits",
    salary: 120000, value: 130000, hourly: 68, reportHrs: 5, reportCost: 339,
    docs: 50, classes: 10, chunks: 842, skill: 71, situational: 25,
    trainable: true, trainableBy: "Gov't", revenueModel: "Offer · 20% consultant split",
    quip: '"Legally, where are we?"', color: T.moss,
  },
  {
    id: "christy", name: "Christy Park", role: "Marketing Designer",
    code: "MK-05", hiredOn: "Aug 2023", trainer: "RMV", arch: "LLM Format",
    specialty: "Formatting · Executive Presentation",
    salary: 90000, value: 90000, hourly: 47, reportHrs: 3, reportCost: 141,
    docs: 0, classes: 0, chunks: 0, skill: 36, situational: 5,
    trainable: false, trainableBy: "RMV", revenueModel: "Split · 50% RMV",
    quip: '"Make it look like a cover story."', color: T.brass,
  },
  {
    id: "robyn", name: "Robyn Castellanos", role: "NIGP Consultant",
    code: "CN-03", hiredOn: "Jan 2016", trainer: "NIGP", arch: "RAG + Deep Prompt",
    specialty: "NIGP Best-Practice · Strategy",
    salary: 175000, value: 200000, hourly: 104, reportHrs: 5, reportCost: 521,
    docs: 100, classes: 25, chunks: 1685, skill: 88, situational: 35,
    trainable: true, trainableBy: "NIGP", revenueModel: "Split · 50% NIGP · $260/rpt",
    quip: `"Next year's strategy, not last year's report."`, color: T.brass,
  },
  {
    id: "brent", name: "Brent Matthews", role: "Data Research Specialist",
    code: "DR-06", hiredOn: "Mar 2018", trainer: "RMV", arch: "RAG + Web Agent",
    specialty: "Gov't Portal Retrieval · Open Records · Data Acquisition",
    salary: 115000, value: 140000, hourly: 60, reportHrs: 1, reportCost: 60,
    docs: 0, classes: 0, chunks: 0, skill: 79, situational: 40,
    trainable: true, trainableBy: "RMV + Self", revenueModel: "Usage · Per Fetch",
    quip: `"If it's on a government server, I'll find it."`,
    color: T.moss, isWebAgent: true,
  },
  {
    id: "pat", name: "Pat Smiley", role: "Intern Researcher",
    code: "IR-07", hiredOn: "Jan 2026", trainer: "None", arch: "No Training",
    specialty: "Basic Web Research (Untrained)",
    salary: 0, value: 0, hourly: 0, reportHrs: 1, reportCost: 0,
    docs: 0, classes: 0, chunks: 0, skill: 12, situational: 5,
    trainable: false, trainableBy: "None", revenueModel: "Demo Only",
    quip: `"I'm just here to learn... I think."`,
    color: T.muted, isWebAgent: true, isIntern: true, noMemory: true,
  },
  {
    id: "michelle", name: "Michelle Manning", role: "Project Manager",
    code: "PP-01", hiredOn: "Mar 2025", trainer: "RMV", arch: "LLM Planning",
    specialty: "Project Planning · Step Sequencing · Multi-Agent Coordination",
    salary: 100000, value: 110000, hourly: 52, reportHrs: 2, reportCost: 104,
    docs: 0, classes: 0, chunks: 0, skill: 65, situational: 30,
    // FEATURE: AG-03 — Michelle trainable via Personnel File
    trainable: true, trainableBy: "RMV", revenueModel: "Included",
    quip: '"I map the mission before anyone moves."', color: T.brass,
    isPlanner: true,
  },
  {
    id: "susan", name: "Susan Smith", role: "Trainer Agent",
    code: "TR-08", hiredOn: "Jun 2026", trainer: "RMV", arch: "LLM Training",
    specialty: "Agent Training · Knowledge Transfer · Capability Building",
    salary: 85000, value: 95000, hourly: 44, reportHrs: 2, reportCost: 88,
    docs: 0, classes: 0, chunks: 0, skill: 55, situational: 20,
    // FEATURE: AG-08 — Susan trainable via Personnel File
    trainable: true, trainableBy: "RMV", revenueModel: "Included",
    quip: '"I turn knowledge into capability."', color: T.brass,
    isTrainer: true,
  },
  // FEATURE: AG-13 — Dan Bingham (PS-01) AI Prompt Strategist
  {
    id: "dan", name: "Dan Bingham", role: "AI Prompt Strategist",
    code: "PS-01", hiredOn: "Jun 2026", trainer: "RMV", arch: "Prompt Engineering",
    specialty: "Prompt Engineering · Context Assembly · Intelligence Architecture",
    salary: 105000, value: 125000, hourly: 55, reportHrs: 0, reportCost: 0,
    docs: 0, classes: 0, chunks: 0, skill: 80, situational: 40,
    trainable: true, trainableBy: "RMV", revenueModel: "Included",
    quip: `"The right prompt doesn't ask for the answer — it makes the answer inevitable."`,
    color: T.moss,
    isPromptArchitect: true,
  },
  // FEATURE: AG-14 — Alex Reeves (ED-01) Screen Controls Editor
  {
    id: "alex", name: "Alex Reeves", role: "Screen Controls Editor",
    code: "ED-01", hiredOn: "Jun 2026", trainer: "RMV", arch: "LLM Format",
    specialty: "UI Field Mapping · Structured Component Assembly · Data-Driven Layouts",
    salary: 90000, value: 95000, hourly: 47, reportHrs: 1, reportCost: 47,
    docs: 0, classes: 0, chunks: 0, skill: 72, situational: 30,
    trainable: true, trainableBy: "RMV", revenueModel: "Included",
    quip: '"Content knows what to say. I decide where it lives on the screen."',
    color: T.brass,
  },
  // FEATURE: AG-15 — Riley Torres (ED-02) HTML Display Editor
  {
    id: "riley", name: "Riley Torres", role: "HTML Display Editor",
    code: "ED-02", hiredOn: "Jun 2026", trainer: "RMV", arch: "LLM Format",
    specialty: "Web Formatting · Visual Hierarchy · Typography · HTML Presentation",
    salary: 85000, value: 90000, hourly: 44, reportHrs: 1, reportCost: 44,
    docs: 0, classes: 0, chunks: 0, skill: 68, situational: 25,
    trainable: true, trainableBy: "RMV", revenueModel: "Included",
    quip: `"A well-structured page doesn't need instructions — it just reads itself."`,
    color: T.brass,
  },
  // FEATURE: AG-16 — Claire Sutton (ED-03) PDF Assembly Editor
  {
    id: "claire", name: "Claire Sutton", role: "PDF Assembly Editor",
    code: "ED-03", hiredOn: "Jun 2026", trainer: "RMV", arch: "LLM Format",
    specialty: "Document Layout · Professional PDF Structure · Formal Presentation Design",
    salary: 95000, value: 100000, hourly: 50, reportHrs: 1, reportCost: 50,
    docs: 0, classes: 0, chunks: 0, skill: 75, situational: 28,
    trainable: true, trainableBy: "RMV", revenueModel: "Included",
    quip: '"Every document is a first impression. I make sure it\'s the right one."',
    color: T.brass,
  },
];

// FEATURE: RO-04 — Avatar config for illustrated SVG portraits
export const AVATAR_CFG = {
  chloe:  { skin:"#e8c9a8", hair:"#6b3a1e", collar:"#f0e6d2", extra:"freckles", border:T.brass  },
  mike:   { skin:"#d4a378", hair:"#3a3a3a", collar:"#24364f", extra:"glasses",  border:T.brass  },
  bob:    { skin:"#e5c19a", hair:"#5a4a3a", collar:"#2a3a52", extra:"tie",      border:T.moss   },
  christy:{ skin:"#dba77d", hair:"#2a1a1a", collar:T.brass,   extra:"bob",      border:T.brass  },
  robyn:  { skin:"#c48b62", hair:"#8a3418", collar:"#5a2f3d", extra:"bun",      border:T.brass  },
  brent:  { skin:"#d4a870", hair:"#2c3e2d", collar:"#1a2e1a", extra:"field",    border:T.moss   },
  pat:    { skin:"#e8c9a0", hair:"#8b4513", collar:"#c0c0c0", extra:"bob",      border:T.muted  },
  // FEATURE: RO-06 — Add michelle to AVATAR_CFG
  michelle: { skin:"#d4b896", hair:"#2a2a3a", collar:"#1e3a5a", extra:"glasses", border:T.brass },
  susan:    { skin:"#e2c4a0", hair:"#5a3a1e", collar:"#3a5a3a", extra:"bun",     border:T.moss  },
  // FEATURE: AG-13 — Dan avatar
  dan: { skin:"#c8a882", hair:"#2a2a2a", collar:"#1a3a4a", extra:"glasses", border:T.moss },
  // FEATURE: AG-14/15/16 — Editor agent avatars
  alex:  { skin:"#e0c9a8", hair:"#4a3a2a", collar:"#2a3a52", extra:"glasses", border:T.brass },
  riley: { skin:"#c8916e", hair:"#1a1a1a", collar:"#3a2a4a", extra:"bob",     border:T.brass },
  claire:{ skin:"#e8d5b5", hair:"#6a4a2a", collar:"#1e2e3a", extra:"bun",     border:T.brass },
};

// ── Pronouns ──────────────────────────────────────────────────────────────────
export const AGENT_PRONOUNS = {
  chloe:   { subject:"she", object:"her", possessive:"her" },
  mike:    { subject:"he",  object:"him", possessive:"his" },
  bob:     { subject:"he",  object:"him", possessive:"his" },
  christy: { subject:"she", object:"her", possessive:"her" },
  robyn:   { subject:"she", object:"her", possessive:"her" },
  brent:   { subject:"he",  object:"him", possessive:"his" },
  pat:      { subject:"she", object:"her", possessive:"her" },
  michelle: { subject:"she", object:"her", possessive:"her" },
  susan:    { subject:"she", object:"her", possessive:"her" },
  // FEATURE: AG-13 — Dan pronouns
  dan: { subject:"they", object:"them", possessive:"their" },
  // FEATURE: AG-14/15/16 — Editor agent pronouns
  alex:  { subject:"they", object:"them", possessive:"their" },
  riley: { subject:"she",  object:"her",  possessive:"her"   },
  claire:{ subject:"she",  object:"her",  possessive:"her"   },
};

// ── Training form constants ───────────────────────────────────────────────────
export const STANDARD_CATEGORIES = [
  "Compliance","Jurisdiction","Best Practice","Internal",
  "Standards","Methodology","Playbook","Template","Statute",
];
export const BRENT_CATEGORIES = [
  "Portal Navigation","Data Schema","Export Method","Auth Pattern",
  "State Portal","Open Records","Research Method","Data Dictionary",
];
export const JURISDICTIONS = [
  "All","Federal","Texas","California","Florida","New York","Illinois",
];
export const FLAG_TRIGGERS = [
  { id:"maverick",      label:"Maverick Spend" },
  { id:"po-split",      label:"PO Splitting"   },
  { id:"spike",         label:"Spend Spike"    },
  { id:"single-source", label:"Single Source"  },
  { id:"vendor-hhi",    label:"Vendor HHI"     },
  { id:"long-tail",     label:"Long-Tail"      },
];

// ── BEE_SCENARIOS for Test My Team ───────────────────────────────────────────
export const BEE_SCENARIOS = [
  {
    id:"maverick", flag:"🔴", flagLabel:"Maverick Spend",
    title:"High Uncontracted IT Purchases",
    meta:"$2.1M outside master agreements · 847 txns · 23 vendors",
    amount:"$2,142,880 at risk",
    queryText:"High uncontracted technology spend $2.1M across 847 transactions with 23 vendors, no master agreements, maverick spend",
    jurisdiction:"Texas",
  },
  {
    id:"posplit", flag:"🟠", flagLabel:"PO Splitting",
    title:"Suspicious Sub-Threshold Orders",
    meta:"14 POs same vendor · 30 days · Under $49,500",
    amount:"$674,200 structured",
    queryText:"14 purchase orders to same vendor in 30 days all under $49500 threshold, suspected bid splitting, Public Works",
    jurisdiction:"Texas",
  },
  {
    id:"concentration", flag:"🔴", flagLabel:"Vendor Concentration",
    title:"Single Vendor: 34% of Facilities",
    meta:"HHI: 3,240 · $18.7M of $55M budget",
    amount:"$18,720,000 single source",
    queryText:"Single vendor controls 34% of facilities spend HHI 3240 highly concentrated single source risk $18.7M",
    jurisdiction:"Texas",
  },
  {
    id:"spike", flag:"🟡", flagLabel:"Spend Spike",
    title:"December Surge — Year End",
    meta:"340% above avg · $4.2M in final 3 weeks · 12 depts",
    amount:"$4,200,000 spike",
    queryText:"December spending surge 340% above monthly average $4.2M in final 3 weeks year-end spending rush 12 departments",
    jurisdiction:"Texas",
  },
  {
    id:"full", flag:"🔵", flagLabel:"Combined Risk",
    title:"Full Austin 2025 Portfolio",
    meta:"$372M total · All 6 flags · 264 NIGP classes · 2,847 vendors",
    amount:"$372,988,798 total",
    queryText:"Full procurement portfolio $372M total spend 2847 vendors 264 NIGP classes all risk flags maverick PO splitting vendor concentration",
    jurisdiction:"Texas",
  },
];

// ── Fetch portal states ───────────────────────────────────────────────────────
export const FETCH_STATES = [
  { key:"maryland",   name:"Maryland",   portal:"MD-VIEW · Comptroller",  years:["2025","2024","2023","2022"], live:true,  url:"https://interactive2.marylandtaxes.gov/MDVIEW/" },
  { key:"illinois",   name:"Illinois",   portal:"IL Comptroller",          years:["2025","2024","2023","2022"], live:true,  url:"https://illinoiscomptroller.gov/financial-reports-data/expenditures-state-spending/statewide" },
  { key:"oregon",     name:"Oregon",     portal:"OregonBuys · Socrata",    years:["2024","2023","2022"],        live:false, url:"https://data.oregon.gov" },
  { key:"texas",      name:"Texas",      portal:"CAPPS · DIR",              years:["2025","2024"],               live:false, url:"https://www.txsmartbuy.gov" },
  { key:"california", name:"California", portal:"Cal eProcure",             years:["2025","2024"],               live:false, url:"https://eprocure.dgs.ca.gov" },
  { key:"florida",    name:"Florida",    portal:"MyFloridaMarket",          years:["2025","2024"],               live:false, url:"https://www.myfloridamarketplace.com" },
];
