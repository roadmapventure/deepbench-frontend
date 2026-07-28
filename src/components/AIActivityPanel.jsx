// DeepBench v6.3.191 | AIActivityPanel.jsx | LOG-97 -- By Pattern cost summed from the hydrated log via rollup log_ids (no new query; dedup-consistent with Total Cost)
// DeepBench v6.3.189 | AIActivityPanel.jsx | LOG-98a -- RollingNumber reveal no longer depends on requestAnimationFrame (hidden tabs froze tiles on fabricated values)
// DeepBench v6.3.173 | AIActivityPanel.jsx | LOG-93 -- Active Agents tile (roster count; active = available for routing)
// DeepBench v6.3.170 | AIActivityPanel.jsx | LOG-92 -- header all-tenants + Capabilities tile removed + Patterns Logged reads classification view + thousands-comma sweep
// DeepBench v6.3.188 | AIActivityPanel.jsx | LOG-98 -- honest loading state: rolling tile counters + shimmer skeletons, no false zeros/empty states
// DeepBench v6.3.167 | AIActivityPanel.jsx | LOG-90 -- §19m unregistered-services line removed from the By Service drawer (detection stays in useAIActivity; residue tracked as LOG-89)
// DeepBench v6.3.163 | AIActivityPanel.jsx | LOG-86 -- tab bar removed (MCP Roadmap + Architect Checklist hidden, content kept in-file), Platform Roadmap drawer deleted; drawers are the opening view
// DeepBench v6.3.159 | AIActivityPanel.jsx | S-AI-AUDIT-SVCDIR -- By Service rebuilt on the platform_services directory (8 layer groups, muted function lists, no pattern names, closed by default); By Agent capability sub-rows; Services/Capabilities header stats; stray By Pattern top line removed (ARCHITECTURE.md §19m)
// DeepBench v6.3.160 | AIActivityPanel.jsx | LOG-83 -- By Agent defaults collapsed + moved under By LLM + line 2 shows role title (not code); resolveAgent extracted to ./resolveAgent.js
// DeepBench v6.3.158 | AIActivityPanel.jsx | LOG-80 -- By LLM drawer moved directly under By Pattern (pure JSX reorder)
// DeepBench v6.3.155 | AIActivityPanel.jsx | LOG-38 -- By Pattern body rewired: classified rows + single reclassification count
// DeepBench v6.3.134 | AIActivityPanel.jsx | LOG-36 -- By Pattern is one flat log-driven list; "Patterns Logged" stat
// DeepBench v6.2.9 | AIActivityPanel.jsx | AI-48 mobile-responsive AI Audit panel
// FEATURE: AI-13 — AIActivityPanel — rename to AI Audit, add By LLM + By Agent sections
// FEATURE: AI-10 — AIActivityPanel hydrate on mount
// FEATURE: AI-48 — mobile-responsive layout (82% drawer width, backdrop-dismiss, STYLE-GUIDE.md §26)

import { useState, useEffect } from "react";
import { T, display, body, mono } from "../tokens.js";
// LOG-86: the two shared catalogs (service/pattern) are no longer imported here — the Platform
// Roadmap drawer is removed; the hidden MCP tab renders its own static MCP_SURFACES.
import { useAIActivity, usePatternClassification, AI_TYPES, MODEL_PROVIDER, hydrateFromSupabase, humanizeSlug } from "../hooks/useAIActivity.js";
import { Corners, AuditRowSkeleton } from "./SharedUI.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
// FEATURE: LOG-83 -- resolveAgent + its lookup maps extracted to a sibling module so the
// Node regression test can import them without parsing this file's JSX. Re-exported below.
import { resolveAgent } from "./resolveAgent.js";
export { resolveAgent };
// FEATURE: LOG-93 -- roster count for the Active Agents tile; "active" = available for a
// routing call (John, 2026-07-28). No availability flag exists in the data, so roster
// membership IS availability -- if such a flag ever ships, this tile reads it instead.
import { AGENTS } from "../data/agents.js";

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

// FEATURE: LOG-92 -- thousands separator for >= $1,000 (John's 0,000 spec); two decimals kept.
const fmt$ = n => n < 0.01 ? `<$0.01` : `$${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtMs = ms => ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s`;

// FEATURE: S-AI-AUDIT-SVCDIR -- one platform_services directory row (replaces the old
// static-catalog-driven ServiceRow, deleted that session; LOG-86 later removed the roadmap tier
// list too). Branded name + muted functions list (where pattern badges
// used to render -- no pattern names anywhere in this section, per §19m), right side driven by
// tracking_status. `✦ Utilizes a Model` is an attribute chip, not an identity split.
function PlatformServiceRow({ d }) {
  const showStats = d.trackingStatus === 'tracked' || d.trackingStatus === 'partial';
  return (
    <div style={{border:`1px solid ${T.line}`,marginBottom:5,padding:"8px 12px",display:"flex",alignItems:"center",gap:10}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:1}}>
          <div style={{fontFamily:display,fontSize:12,fontWeight:600,color:T.navy}}>{d.name}</div>
          {d.utilizesModel && (
            <span style={{fontFamily:mono,fontSize:8,color:T.brassDeep,border:`1px solid ${T.brass}40`,padding:"1px 5px",flexShrink:0,whiteSpace:"nowrap"}}>✦ Utilizes a Model</span>
          )}
        </div>
        {d.functions.length > 0 && (
          <div style={{fontFamily:mono,fontSize:9,color:T.muted}}>{d.functions.join(' · ')}</div>
        )}
      </div>
      {showStats ? (
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
          <div style={{display:"flex",gap:12}}>
            {[["Calls",d.calls.toLocaleString()],["Cost",fmt$(d.cost)],["Avg",d.avgLatency?fmtMs(d.avgLatency):"—"]].map(([k,v])=>(
              <div key={k} style={{textAlign:"right"}}>
                <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:.8}}>{k}</div>
                <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:k==="Cost"?T.brassDeep:T.ink}}>{v}</div>
              </div>
            ))}
          </div>
          {d.trackingStatus === 'partial' && (
            <div style={{fontFamily:mono,fontSize:8,color:T.brass,border:`1px solid ${T.brass}40`,padding:"1px 5px"}}>⚠ some calls untracked</div>
          )}
        </div>
      ) : d.trackingStatus === 'machinery' ? (
        <div style={{fontFamily:mono,fontSize:9,color:T.muted,flexShrink:0,textAlign:"right"}}>{d.displayNote || 'Counted elsewhere'}</div>
      ) : d.trackingStatus === 'self' ? (
        <div style={{fontFamily:mono,fontSize:9,color:T.muted,flexShrink:0,textAlign:"right"}}>{d.displayNote || 'The tracker itself'}</div>
      ) : (
        <div style={{fontFamily:body,fontSize:10,fontStyle:"italic",color:T.muted,flexShrink:0}}>Not tracked at this time</div>
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
            {[["Calls",d.total.toLocaleString()],["Cost",fmt$(d.cost)]].map(([k,v])=>(
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
// FEATURE: S-AI-AUDIT-SVCDIR -- `first` drops the borderTop on the topmost header only (the
// stray horizontal line above "By Pattern"); every subsequent header keeps its divider.
function SectionHeader({ label, open, onToggle, first = false }) {
  return (
    <div
      onClick={onToggle}
      style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 2px",cursor:"pointer",borderTop: first ? "none" : `1px solid ${T.lineSoft}`,marginTop:18,userSelect:"none"}}
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

// FEATURE: LOG-98 -- John's design: while data is loading the tile value rolls upward instead of
// showing a 0 it doesn't mean; when the real value arrives it counts up to it and locks. Never
// counts backwards (the reveal always runs 0 -> value). prefers-reduced-motion gets a static "—"
// while loading and the plain value after -- no animation, and still no false zero.
function RollingNumber({ value, loading, format }) {
  const reduced = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [display, setDisplay] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // Rolling phase — a fast upward count that wraps, so it reads as "working", not as data.
  useEffect(() => {
    if (!loading || reduced) return;
    let n = 0;
    const id = setInterval(() => {
      n = (n + Math.max(1, Math.round(Math.random() * 400))) % 10000;
      setDisplay(n);
    }, 70);
    return () => clearInterval(id);
  }, [loading, reduced]);

  // Reveal phase — one ease-out count-up from 0 to the real value, then lock.
  // FEATURE: LOG-98a -- requestAnimationFrame is suspended for hidden/backgrounded/occluded tabs,
  // and rAF was previously the ONLY path that set the final value, so a panel that finished loading
  // while the tab was hidden froze forever on a fabricated rolling number displayed as real data
  // (confirmed live: document.hidden === true, no rAF callback within 1200ms). The animation is
  // decorative; landing on the true value is not. This timer fires regardless of frames and is the
  // authoritative finish; the rAF loop only smooths the way there.
  useEffect(() => {
    if (loading || reduced || revealed) return;
    const target = Number(value) || 0;
    const DURATION = 600;
    const start = performance.now();
    let raf;
    const step = now => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(target * eased);
      if (t < 1) raf = requestAnimationFrame(step);
      else { setDisplay(target); setRevealed(true); }
    };
    raf = requestAnimationFrame(step);
    const backstop = setTimeout(() => { setDisplay(target); setRevealed(true); }, DURATION + 150);
    return () => { cancelAnimationFrame(raf); clearTimeout(backstop); };
  }, [loading, reduced, revealed, value]);

  if (reduced) return <>{loading ? "—" : format(Number(value) || 0)}</>;
  if (loading) return <span style={{opacity:0.75}}>{format(display)}</span>;
  // FEATURE: LOG-98a -- second guard for the same failure class: once loading is over, a
  // not-yet-revealed tile shows the mid-animation `display` only while it is still plausibly
  // animating. `display` is never allowed to outlive the reveal window as the visible value.
  return <>{format(revealed ? Number(value) || 0 : display)}</>;
}

export default function AIActivityPanel({ onClose }) {
  // FEATURE: LOG-36 -- patternsActiveCount/patternsCatalogTotal removed from the hook; the stat
  // strip now reads the live logged count.
  // FEATURE: S-AI-AUDIT-SVCDIR -- servicesActive/servicesCatalogTotal/servicesSorted dropped from
  // this destructure (the hook still exports them for other consumers); the By Service body and
  // the header stats now read the §19m directory join instead.
  // FEATURE: LOG-92 -- patternsLoggedCount/assignedCapabilityCount dropped from this destructure
  // (the hook still exports both for other consumers): the Capabilities tile is removed and the
  // Patterns Logged tile now reads the LOG-38 classification view below, so tile and list agree.
  // FEATURE: LOG-98 -- logLoaded distinguishes "still hydrating" from "genuinely empty"; every
  // tile and drawer below gates its zero/empty-state copy on it.
  // FEATURE: LOG-97 -- `log` is destructured purely to hand the already-hydrated entries to
  // usePatternClassification(), which sums each pattern's cost from them. No new fetch.
  const { log, byPattern, byLLM, byAgent, modelsInUse, totalCost, totalCalls, patternsSorted, agentsSorted, platformServices, platformServiceCount, logLoaded } = useAIActivity();
  // FEATURE: LOG-38 -- Log Displayer read path for the By Pattern section body (classified rows +
  // single reclassification count). LOG-92: also feeds the "Patterns Logged" stat tile.
  // FEATURE: LOG-97 -- passing `log` overrides each row's cost with the in-memory sum (the view's
  // cost_sum is empty for every classified row); falls back to cost_sum when log/ids are absent.
  const { classified, reclassificationCount, loaded: patternsLoaded } = usePatternClassification(log);
  const loading = !logLoaded;
  const tab = "activity"; // LOG-86: tab bar hidden — MCP Roadmap + Architect Checklist blocks below are intentionally kept (unreachable). To re-enable: restore useState + the tab-bar JSX (see git history, v6.3.160).
  // FEATURE: AI-23 patch — per-section collapse state (LOG-86: roadmap key removed with the Platform Roadmap drawer)
  // FEATURE: S-AI-AUDIT-SVCDIR -- service now defaults closed too (§19m kickoff: By Service
  // drawer closed on open). The zeroClosed state is gone with the "Not yet called" collapse card.
  const [sections, setSections] = useState({ pattern:true, service:false, llm:true, agent:false });
  // FEATURE: LOG-36 -- inactivePtnClosed/uncatalogedPtnClosed removed with the collapse cards they
  // drove: with the catalog seed loop gone there is no "not yet active" bucket to collapse, and
  // every row is by definition uncatalogued-or-governed real activity, one flat list.
  const toggle = (key) => setSections(s => ({ ...s, [key]: !s[key] }));
  // FEATURE: AI-48 — mobile-responsive layout, gated by useIsMobile(); desktop path unchanged
  const isMobile = useIsMobile();

  // FEATURE: AI-10 — Hydrate lifetime totals from Supabase once on mount
  useEffect(() => {
    hydrateFromSupabase();
  }, []);

  return (
    <>
      {/* FEATURE: AI-48 — mobile-only backdrop, tap to dismiss; desktop has no backdrop (unchanged) */}
      {isMobile && (
        <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(18,36,60,.5)",zIndex:999}}/>
      )}
      <div style={{position:"fixed",top:0,right:0,bottom:0,
        width: isMobile ? "82%" : 650,
        maxWidth: isMobile ? 340 : undefined,
        background:T.card,borderLeft:`2px solid ${T.brass}`,zIndex:1000,display:"flex",flexDirection:"column",boxShadow:"-8px 0 32px rgba(0,0,0,.18)"}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${T.navy},${T.navyMid})`,padding: isMobile ? "11px 15px" : "14px 20px",borderBottom:`2px solid ${T.brass}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:mono,fontSize:9,color:T.brassLight,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>AI Transparency · DeepBench</div>
            <div style={{fontFamily:display,fontSize: isMobile ? 15 : 18,fontWeight:600,color:T.card}}>AI Audit</div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid rgba(255,255,255,.2)`,color:"rgba(255,255,255,.6)",width:28,height:28,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {/* Total strip — FEATURE: AI-48 — wraps on mobile instead of overflowing, no stat dropped */}
        <div style={{display:"flex",gap:16,marginTop:10,flexWrap: isMobile ? "wrap" : "nowrap",rowGap: isMobile ? 6 : 0}}>
          {/* FEATURE: S-AI-AUDIT-SVCDIR -- "Services Active X/39" replaced by the directory count
              (a service EXISTS whether or not it logged today, §19m), plus the assigned-capability
              count from the same read Task 2's By Agent nesting uses. */}
          {/* FEATURE: LOG-92 -- 5 tiles: Capabilities removed (the capability story lives in the
              By Agent drawer, §19m); Patterns Logged reads the classification view so it always
              equals the By Pattern row count; Total Calls gains the thousands comma. */}
          {/* FEATURE: LOG-98 -- labels, order, and styles are unchanged; only the value's render
              path changes (RollingNumber). Services is loading only while the directory read has
              returned nothing AND the log is still hydrating; Active Agents never loads (a static
              import that is always correct); Patterns Logged uses the classification hook's own
              `loaded` flag. */}
          {[
            ["Total Calls",    totalCalls,           loading,                               v => Math.round(v).toLocaleString()],
            ["Total Cost",     totalCost,            loading,                               v => fmt$(v)],
            ["Services",       platformServiceCount, platformServiceCount === 0 && loading, v => Math.round(v).toLocaleString()],
            ["Active Agents",  AGENTS.length,        false,                                 v => Math.round(v).toLocaleString()],
            ["Patterns Logged",classified.length,    !patternsLoaded,                       v => Math.round(v).toLocaleString()],
            ["Models in Use",  modelsInUse,          loading,                               v => Math.round(v).toLocaleString()],
          ].map(([k,v,isLoading,format])=>(
            <div key={k}>
              <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",textTransform:"uppercase",letterSpacing:1}}>{k}</div>
              <div style={{fontFamily:display,fontSize:15,fontWeight:600,color:T.brassLight}}><RollingNumber value={v} loading={isLoading} format={format}/></div>
            </div>
          ))}
        </div>
      </div>

      {/* Content — FEATURE: AI-48 — mobile padding delta only, all content/data unchanged */}
      <div style={{flex:1,overflowY:"auto",padding: isMobile ? "12px 14px" : "14px 16px"}}>
        {tab === "activity" && (
          <>
            {/* FEATURE: AI-23 patch — Pattern section first, collapsible */}
            {/* FEATURE: LOG-36 -- one flat list, ordered by call count. The AI-36 Structural/Reasoning
                split is GONE: patternType exists only in the static catalog, pattern_vocabulary has no
                equivalent column, and the taxonomy itself is unsourced (Cognitive Function and
                Execution Topology are two perpendicular axes in the published literature, not two
                halves of one binary) — choosing a real taxonomy is LOG-58. The AI-32 "Not yet active"
                and LOG-31/LOG-32 "Uncatalogued" collapse cards go with it: with the catalog seed loop
                deleted, every row here is a pattern that genuinely ran. */}
            <SectionHeader label="By Pattern" open={sections.pattern} onToggle={()=>toggle('pattern')} first/>
            {sections.pattern && (
              <>
                {/* FEATURE: LOG-98 -- the loading branch runs BEFORE the empty-state check, so
                    "No classified patterns yet." can only appear once the classification read
                    has actually returned. */}
                {!patternsLoaded
                  ? <><AuditRowSkeleton/><AuditRowSkeleton/><AuditRowSkeleton/></>
                  : classified.length === 0
                    ? <div style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic",padding:"6px 0"}}>No classified patterns yet.</div>
                    : classified.map(pat => <PatternRow key={pat.slug} d={pat}/>)}
                {/* FEATURE: LOG-38 -- single unclassified count, no breakdown (John's call). Everything whose
                    signature matched no gold pattern -- new or old, empty or rich -- rolled into one line.
                    FEATURE: LOG-98 -- hidden entirely while loading; it otherwise renders a false
                    "0 calls needing reclassification". */}
                {patternsLoaded && (
                  <div style={{fontFamily:body,fontSize:11,color:T.muted,padding:"8px 0 2px",borderTop:`1px solid ${T.lineSoft}`,marginTop:6}}>
                    {reclassificationCount.toLocaleString()} calls needing reclassification
                  </div>
                )}
              </>
            )}

            {/* By LLM — collapsible, unchanged data. FEATURE: LOG-80 -- moved up to sit directly
                after By Pattern (pure JSX move, no logic/state change; sections.llm key unchanged). */}
            <SectionHeader label="By LLM" open={sections.llm} onToggle={()=>toggle('llm')}/>
            {sections.llm && (
              // FEATURE: LOG-98 -- loading branch first; the empty-state copy is post-load only.
              loading
                ? <><AuditRowSkeleton/><AuditRowSkeleton/><AuditRowSkeleton/></>
                : Object.values(byLLM).length === 0
                ? <div style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic",padding:"6px 0"}}>No LLM calls logged yet.</div>
                : Object.values(byLLM).map(d => (
                  <div key={d.model} style={{border:`1px solid ${T.line}`,marginBottom:6,padding:"9px 12px",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:d.calls>0?T.moss:T.lineSoft,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:display,fontSize:12,fontWeight:600,color:T.navy}}>{d.model}</div>
                      <div style={{fontFamily:body,fontSize:10,color:T.muted}}>{MODEL_PROVIDER[d.model]||"Unknown provider"}</div>
                    </div>
                    <div style={{display:"flex",gap:14,flexShrink:0}}>
                      {[["Total",d.calls.toLocaleString()],["Cost",fmt$(d.cost)],["Avg",d.avgLatency?fmtMs(d.avgLatency):"—"]].map(([k,v])=>(
                        <div key={k} style={{textAlign:"right"}}>
                          <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:.8}}>{k}</div>
                          <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:k==="Cost"?T.brassDeep:T.ink}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}

            {/* By Agent — collapsible, sorted by calls desc. FEATURE: LOG-83 -- moved up to sit
                directly under By LLM (pure JSX move, no logic/state change; sections.agent key
                unchanged) and defaults collapsed. */}
            <SectionHeader label="By Agent" open={sections.agent} onToggle={()=>toggle('agent')}/>
            {sections.agent && (
              // FEATURE: LOG-98 -- loading branch first; the empty-state copy is post-load only.
              loading
                ? <><AuditRowSkeleton/><AuditRowSkeleton/><AuditRowSkeleton/></>
                : agentsSorted.length === 0
                ? <div style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic",padding:"6px 0"}}>No agent calls logged yet.</div>
                : agentsSorted.map(d => {
                  const info = resolveAgent(d.agentId);
                  // FEATURE: S-AI-AUDIT-SVCDIR -- capability sub-rows (Task 4). The agent-level
                  // totals row is untouched (same content, now the first row inside the border);
                  // beneath it, the agent's capabilities from agent_capability_assignments +
                  // real log numbers -- an assigned-but-never-logged capability renders
                  // "no activity yet". Capabilities display under their Agent, never in the
                  // services list (§19m). No pattern text anywhere in this section.
                  const caps = d.capabilities || [];
                  return (
                    <div key={d.agentId} style={{border:`1px solid ${T.line}`,marginBottom:6,padding:"9px 12px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:T.moss,flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:display,fontSize:12,fontWeight:600,color:T.navy}}>{info.name}</div>
                          {/* FEATURE: LOG-83 -- line 2 shows the agent's human role title, not an internal code. Styling unchanged (value swap only). */}
                          <div style={{fontFamily:mono,fontSize:9,color:T.muted}}>{info.role}</div>
                        </div>
                        <div style={{display:"flex",gap:14,flexShrink:0}}>
                          {[["Total",d.calls.toLocaleString()],["Cost",fmt$(d.cost)],["Avg",d.avgLatency?fmtMs(d.avgLatency):"—"]].map(([k,v])=>(
                            <div key={k} style={{textAlign:"right"}}>
                              <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:.8}}>{k}</div>
                              <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:k==="Cost"?T.brassDeep:T.ink}}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {caps.length > 0 && (
                        <div style={{marginTop:6,paddingLeft:18}}>
                          {caps.map(c => (
                            <div key={c.slug} style={{display:"flex",alignItems:"center",gap:10,padding:"3px 0",borderTop:`1px solid ${T.lineSoft}`}}>
                              <div style={{flex:1,minWidth:0,fontFamily:body,fontSize:11,color:T.mutedDeep}}>{c.name}</div>
                              {c.calls > 0 ? (
                                <div style={{fontFamily:mono,fontSize:9,color:T.muted,flexShrink:0}}>{c.calls.toLocaleString()} calls · {fmt$(c.cost)} · {c.avgLatency ? fmtMs(c.avgLatency) : "—"}</div>
                              ) : (
                                <div style={{fontFamily:body,fontSize:10,fontStyle:"italic",color:T.muted,flexShrink:0}}>no activity yet</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
            )}

            {/* FEATURE: S-AI-AUDIT-SVCDIR -- By Service rebuilt on the platform_services directory
                (ARCHITECTURE.md §19m): 8 layer group headers (same visual style as the old
                "AI Services" sub-header), each service a PlatformServiceRow (branded name + muted
                functions list, stats only for tracked/partial). The old serviceType grouping,
                TYPE_BADGE, pattern strips, and the "Not yet called" collapse card are deleted --
                every directory row renders, truthfully labeled by its tracking_status. Activity
                claiming no directory row and no assigned capability is still detected by the hook
                (computeUnregisteredServices) but no longer rendered here -- LOG-90 (John,
                2026-07-28); the residue and the tripwire's ongoing home is
                docs/FEATURES-LATER.md LOG-89. */}
            <SectionHeader label="By Service" open={sections.service} onToggle={()=>toggle('service')}/>
            {sections.service && (
              // FEATURE: LOG-98 -- "Service directory not loaded yet." may only appear post-load.
              (!platformServices.length && loading)
                ? <><AuditRowSkeleton/><AuditRowSkeleton/><AuditRowSkeleton/></>
                : platformServices.length === 0
                ? <div style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic",padding:"6px 0"}}>Service directory not loaded yet.</div>
                : platformServices.map((group, gi) => (
                    <div key={group.layer}>
                      <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,padding:"8px 0 4px",borderBottom:`1px solid ${T.lineSoft}`,marginBottom:4,marginTop: gi===0 ? 0 : 8}}>{humanizeSlug(group.layer)}</div>
                      {group.services.map(svc => <PlatformServiceRow key={svc.slug} d={svc}/>)}
                    </div>
                  ))
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
    </>
  );
}
