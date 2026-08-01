// DeepBench v7.0.46 | AIActivityPanel.jsx | LOG-129 -- By Source/By Device/By Caller each showed TWO hairlines 4px apart: PU_SUBHEAD's own borderBottom plus the PU_TABLE borderTop directly beneath it. PU_SUBHEAD's is dropped (it is used by these three sub-heads only); the table keeps its own top edge
// DeepBench v7.0.45 | AIActivityPanel.jsx | LOG-129 -- By Platform User renders as a real table: the per-row card box (PlatformUserRow) is replaced by a shared PlatformUserTableHead/PlatformUserTableRow pair driven by one column model, and a third section, By Device, sits between By Source and By Caller
// DeepBench v7.0.39 | AIActivityPanel.jsx | LOG-121 -- drawer order runs By Agent, then the new By Platform User (two sub-tables under one header, closed by default, plus a seventh stat tile), then By Service; LOG-124 -- no caller address is ever rendered unblurred
// DeepBench v6.3.199 | AIActivityPanel.jsx | LOG-107a -- scroll fade uses the depth variant (a same-colour fade was invisible on this panel)
// DeepBench v6.3.197 | AIActivityPanel.jsx | LOG-107 -- scroll-fade hint, per-drawer item counts, header hover affordance
// DeepBench v6.3.196 | AIActivityPanel.jsx | LOG-105 -- By Pattern row Calls/Cost render through RollingNumber; cost rolls until the log hydrates instead of showing a false <$0.01
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

import { useState, useEffect, useRef } from "react";
import { T, display, body, mono } from "../tokens.js";
// LOG-86: the two shared catalogs (service/pattern) are no longer imported here — the Platform
// Roadmap drawer is removed; the hidden MCP tab renders its own static MCP_SURFACES.
import { useAIActivity, usePatternClassification, AI_TYPES, MODEL_PROVIDER, hydrateFromSupabase, humanizeSlug } from "../hooks/useAIActivity.js";
// FEATURE: LOG-107 -- useScrollFadeHint/ScrollFadeHint are CONSUMED from SharedUI, never
// reimplemented here: they carry the CHI-29/S-CHI-26c MutationObserver + document.fonts.ready
// recovery logic that a local copy would silently lose.
import { Corners, AuditRowSkeleton, useScrollFadeHint, ScrollFadeHint } from "./SharedUI.jsx";
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
// FEATURE: LOG-121 -- By Platform User helpers. fmtDay stays deliberately coarse: the drawer answers
// "who," not "when," and a to-the-second timestamp beside a caller reads as surveillance.
const fmtPct = n => `${((n || 0) * 100).toFixed(1)}%`;
const fmtDay = ts => { const d = ts ? new Date(ts) : null; return d && !isNaN(d) ? d.toLocaleDateString(undefined,{month:"short",day:"numeric"}) : "—"; };
const sumBy = (rows, key) => rows.reduce((n, r) => n + (r[key] || 0), 0);

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

// FEATURE: LOG-129 -- one column model shared by a table's header and every body row, so they
// can never drift out of alignment with each other. `align` defaults left; numeric columns pass
// 'right'. `flex` sets relative column width (same units as CSS flex-grow).
// (Replaces LOG-121's PlatformUserRow -- the bordered card per row. John's original ask for this
// feature was answered with a plain-text grid mock; the card layout that shipped was never the
// thing he confirmed. All three sections use these two components -- one visual grammar, not three.)
function PlatformUserTableHead({ cols }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"5px 12px 6px"}}>
      {cols.map(c => (
        <div key={c.key} style={{flex:c.flex,minWidth:0,textAlign:c.align||"left",fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:.8,whiteSpace:"nowrap"}}>{c.label}</div>
      ))}
    </div>
  );
}

// `cells` is an array of pre-formatted strings/nodes, positionally matching `cols`. The FIRST
// column always renders as the row's primary identity (display font, navy, 600 weight) -- every
// other column is a plain mono value; a column literally named "Cost" renders in brassDeep,
// matching every other cost figure on this panel.
function PlatformUserTableRow({ cols, cells, active = true }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",borderBottom:`1px solid ${T.lineSoft}`,opacity:active?1:.5}}>
      {cols.map((c, i) => (
        <div key={c.key} style={{
          flex:c.flex,minWidth:0,textAlign:c.align||"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
          fontFamily:i===0?display:mono,
          fontSize:i===0?12:11,
          fontWeight:i===0?600:400,
          color:c.key==="cost"?T.brassDeep:i===0?T.navy:T.ink,
        }}>{cells[i]}</div>
      ))}
    </div>
  );
}

// FEATURE: LOG-121 -- each sub-table ends with its own total, which is the drawer's own honesty
// check made visible: the sections each partition one row set, so their totals must match each other
// and the header's Total Calls / Total Cost. A reader can see that hold -- and see it break.
// LOG-129: unchanged by the table rewrite -- it already renders as a totals bar, not a card. It now
// closes three sections instead of two, which only strengthens the check.
function PlatformUserTotal({ calls, cost }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:14,padding:"5px 12px 9px",borderTop:`1px solid ${T.lineSoft}`,marginTop:2}}>
      <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:.8,marginRight:"auto"}}>Total</div>
      <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:T.ink}}>{calls.toLocaleString()} calls</div>
      <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:T.brassDeep}}>{fmt$(cost)}</div>
    </div>
  );
}

// Same sub-header treatment the By Service drawer already uses for its layer groups, minus the
// hairline: that drawer's group header has nothing beneath it, but every one of these three is
// immediately followed by a PU_TABLE whose own borderTop draws the line. Carrying both rendered
// TWO rules 4px apart (lineSoft under the header, then line atop the table). The table's is the
// one that stays -- it is the table's own top edge and must survive independently of the header.
const PU_SUBHEAD = {fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,padding:"8px 0 4px",marginBottom:4};

// FEATURE: LOG-129 -- the column sets, module scope so they are not rebuilt per render and so the
// head and the body rows are literally reading one object. By Device is By Source's shape with one
// label changed -- derived from it rather than copied, so a future column added to one cannot
// silently miss the other.
const SOURCE_COLS = [
  {key:"primary",label:"Source",  flex:3},
  {key:"calls",  label:"Calls",   flex:1,align:"right"},
  {key:"cost",   label:"Cost",    flex:1,align:"right"},
  {key:"pct",    label:"% Cost",  flex:1,align:"right"},
  {key:"avg",    label:"Avg $/Call",flex:1,align:"right"},
  {key:"last",   label:"Last Seen",flex:1,align:"right"},
];
const DEVICE_COLS = SOURCE_COLS.map((c, i) => i === 0 ? {...c, label:"Device"} : c);
// By Caller deliberately drops First Seen: 7 columns overflow this drawer on mobile, and Last Seen
// is the more actionable of the two at a glance. The data is untouched -- `firstSeen` is still on
// every row object; it is simply not rendered. Restoring it is one entry here, not a redesign.
const CALLER_COLS = [
  {key:"primary",label:"Caller",  flex:2},
  {key:"device", label:"Device",  flex:1},
  {key:"org",    label:"Org / Network",flex:2},
  {key:"calls",  label:"Calls",   flex:1,align:"right"},
  {key:"cost",   label:"Cost",    flex:1,align:"right"},
  {key:"last",   label:"Last Seen",flex:1,align:"right"},
];
// The table's own top edge, replacing the weight the removed per-row boxes used to carry. It is the
// only border the new layout adds; rows carry the lineSoft hairline, the head carries none.
const PU_TABLE = {borderTop:`1px solid ${T.line}`};

// FEATURE: AI-23 patch — PatternRow with "more" text expand
// FEATURE: AI-30 — PatternRow HITL special columns + Parallelization partial badge
// FEATURE: LOG-105 -- the row's Cost depends on the hydrated log (LOG-97 sums per-row costs),
// which lands ~5s after LOG-99 made the pattern rows themselves near-instant. Until then the
// view's structurally-empty cost_sum rendered as a confident "<$0.01" -- the same false-zero
// class LOG-98 removed from the header tiles. Cost rolls until the log is in; Calls is already
// correct when the row first renders (same read as the row itself), so it only does the
// count-up reveal. Reuses LOG-98's RollingNumber, including its rAF-independent LOG-98a backstop.
function PatternRow({ d, costLoading = false }) {
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
            {[["Calls", d.total, false, v => Math.round(v).toLocaleString()],
              ["Cost",  d.cost,  costLoading, v => fmt$(v)]].map(([k,v,isLoading,format])=>(
              <div key={k} style={{textAlign:"right"}}>
                <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:.8}}>{k}</div>
                <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:k==="Cost"?T.brassDeep:T.ink}}>
                  <RollingNumber value={v} loading={isLoading} format={format}/>
                </div>
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
// FEATURE: LOG-107 -- a collapsed drawer gave no indication whether it held 31 rows or none, and
// the row itself didn't read as a control (John: "the closed drawers can be open" wasn't obvious).
// Two additions, no geometry change beyond the 2px -> 6px horizontal padding that keeps the hover
// tint from clipping to the text: an optional numeric `count` between label and chevron, and a
// hover tint on the whole row. `count` renders only when it is genuinely a number -- callers pass
// `undefined` while their own data is still loading, because a `0` there is exactly the false zero
// LOG-98/LOG-105 removed. A real, loaded `0` IS shown: "this drawer is empty" is honest information.
function SectionHeader({ label, open, onToggle, first = false, count = undefined }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onToggle}
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 6px",cursor:"pointer",borderTop: first ? "none" : `1px solid ${T.lineSoft}`,marginTop:18,userSelect:"none",background: hover ? `${T.brass}0f` : "transparent",transition:"background 120ms ease"}}
    >
      <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>{label}</div>
      <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        {typeof count === "number" && (
          <span style={{fontFamily:mono,fontSize:9,fontWeight:700,color:T.muted}}>{count.toLocaleString()}</span>
        )}
        <div style={{fontFamily:mono,fontSize:16,color:T.brassDeep,lineHeight:1,marginRight:2}}>{open ? "▲" : "▼"}</div>
      </div>
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
  // FEATURE: LOG-121 -- bySource/byCaller/platformUserCount drive the new By Platform User drawer
  // and its stat tile. All three come from the SAME hook read the header tiles use, so the drawer
  // cannot disagree with Total Calls / Total Cost -- there is no second query to drift from.
  // FEATURE: LOG-129 -- byDevice is the drawer's third cut, from the same hook read as the other two.
  const { log, byPattern, byLLM, byAgent, modelsInUse, totalCost, totalCalls, patternsSorted, agentsSorted, platformServices, platformServiceCount, logLoaded, bySource, byCaller, byDevice, platformUserCount } = useAIActivity();
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
  // FEATURE: LOG-121 -- platformUser defaults closed, like service: the drawer holds two sub-tables
  // and opening by default would push By Service off the fold on every panel open.
  const [sections, setSections] = useState({ pattern:true, service:false, llm:true, agent:false, platformUser:false });
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

  // FEATURE: LOG-107 -- bottom-edge fade + bouncing chevron so the panel visibly continues below
  // the fold (John: "not easy to tell you can scroll down"). Reuses the CHI-29 shared hook --
  // no new keyframe, no new scroll math, no new effect of our own. Expanding/collapsing a drawer
  // changes content height without firing a scroll event, which is why `sections` leads the deps
  // array; the hook's own MutationObserver covers content swaps as well.
  const scrollRef = useRef(null);
  const { canScrollMore, onScroll } = useScrollFadeHint(scrollRef, [sections, classified.length, agentsSorted.length, platformServices.length, byCaller.length]);

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
            // FEATURE: LOG-121 -- seventh tile, appended. Distinct callers behind the By Platform
            // User drawer, so tile and drawer count the same thing by construction (both are
            // byCaller.length). Same RollingNumber treatment as its siblings; no existing tile,
            // label, or order changes.
            ["Platform Users", platformUserCount,    loading,                               v => Math.round(v).toLocaleString()],
          ].map(([k,v,isLoading,format])=>(
            <div key={k}>
              <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",textTransform:"uppercase",letterSpacing:1}}>{k}</div>
              <div style={{fontFamily:display,fontSize:15,fontWeight:600,color:T.brassLight}}><RollingNumber value={v} loading={isLoading} format={format}/></div>
            </div>
          ))}
        </div>
      </div>

      {/* Content — FEATURE: AI-48 — mobile padding delta only, all content/data unchanged */}
      {/* FEATURE: LOG-107 -- this wrapper exists only to give the absolutely-positioned
          ScrollFadeHint a correctly-bounded relative ancestor matching the visible viewport; it
          takes over `flex:1` and the scroll moves inward. `minHeight:0` is required or the flex
          child will not scroll inside a column flex parent. */}
      <div style={{flex:1,position:"relative",minHeight:0,display:"flex"}}>
      <div ref={scrollRef} onScroll={onScroll} style={{flex:1,overflowY:"auto",padding: isMobile ? "12px 14px" : "14px 16px"}}>
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
            <SectionHeader label="By Pattern" open={sections.pattern} onToggle={()=>toggle('pattern')} first count={patternsLoaded ? classified.length : undefined}/>
            {sections.pattern && (
              <>
                {/* FEATURE: LOG-98 -- the loading branch runs BEFORE the empty-state check, so
                    "No classified patterns yet." can only appear once the classification read
                    has actually returned. */}
                {!patternsLoaded
                  ? <><AuditRowSkeleton/><AuditRowSkeleton/><AuditRowSkeleton/></>
                  : classified.length === 0
                    ? <div style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic",padding:"6px 0"}}>No classified patterns yet.</div>
                    : classified.map(pat => <PatternRow key={pat.slug} d={pat} costLoading={loading}/>)}
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
            <SectionHeader label="By LLM" open={sections.llm} onToggle={()=>toggle('llm')} count={logLoaded ? Object.values(byLLM).length : undefined}/>
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
            <SectionHeader label="By Agent" open={sections.agent} onToggle={()=>toggle('agent')} count={logLoaded ? agentsSorted.length : undefined}/>
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

            {/* FEATURE: LOG-121 -- the drawer's name, its position (immediately after the agents
                block), and its multi-section structure collapsing as ONE unit are John's explicit
                calls; do not rename, reorder, or split them. Section one answers "what kind of
                caller," section two (LOG-129) "on what device," section three "which caller" --
                three cuts of the same rows, which is why each
                carries its own total and why those totals must agree. The UI split is the whole
                point of the feature: before this, John's own clicking, a QA session's scripts and an
                outside visitor all landed in one undifferentiated pile.
                FEATURE: LOG-124 -- every address shown here is already blurred (xxx.xx before the
                last two octets). The real value is still logged and still readable with the service
                key; the public key cannot read it, and nothing here reconstructs it. */}
            <SectionHeader label="By Platform User" open={sections.platformUser} onToggle={()=>toggle('platformUser')} count={logLoaded ? platformUserCount : undefined}/>
            {sections.platformUser && (
              // FEATURE: LOG-98 -- loading branch first; the empty-state copy is post-load only.
              loading
                ? <><AuditRowSkeleton/><AuditRowSkeleton/><AuditRowSkeleton/></>
                : bySource.length === 0
                ? <div style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic",padding:"6px 0"}}>No attributed calls logged yet.</div>
                : (
                  <>
                    <div style={{...PU_SUBHEAD,marginTop:0}}>By Source</div>
                    <div style={PU_TABLE}>
                      <PlatformUserTableHead cols={SOURCE_COLS}/>
                      {bySource.map(s => (
                        <PlatformUserTableRow key={s.source} cols={SOURCE_COLS} active={s.calls > 0} cells={[
                          s.source, s.calls.toLocaleString(), fmt$(s.cost), fmtPct(s.pctCost),
                          s.avgCost != null ? fmt$(s.avgCost) : "—", fmtDay(s.lastSeen),
                        ]}/>
                      ))}
                      <PlatformUserTotal calls={sumBy(bySource,'calls')} cost={sumBy(bySource,'cost')}/>
                    </div>

                    {/* FEATURE: LOG-129 -- By Device sits between the other two, John's explicit call.
                        It is a third cut of the SAME rows, aggregated across every caller and source
                        ("mobile and desktop are purely aggregate of all users, not just me") -- which
                        is why it is a sibling section with its own total, never a column folded into
                        By Source's list, where it would double-count against that section's total.
                        It is not independently collapsible: the whole drawer opens and closes as one. */}
                    <div style={{...PU_SUBHEAD,marginTop:12}}>By Device</div>
                    <div style={PU_TABLE}>
                      <PlatformUserTableHead cols={DEVICE_COLS}/>
                      {byDevice.map(d => (
                        <PlatformUserTableRow key={d.device} cols={DEVICE_COLS} active={d.calls > 0} cells={[
                          d.device, d.calls.toLocaleString(), fmt$(d.cost), fmtPct(d.pctCost),
                          d.avgCost != null ? fmt$(d.avgCost) : "—", fmtDay(d.lastSeen),
                        ]}/>
                      ))}
                      <PlatformUserTotal calls={sumBy(byDevice,'calls')} cost={sumBy(byDevice,'cost')}/>
                    </div>

                    <div style={{...PU_SUBHEAD,marginTop:12}}>By Caller</div>
                    <div style={PU_TABLE}>
                      <PlatformUserTableHead cols={CALLER_COLS}/>
                      {byCaller.map((c, i) => (
                        <PlatformUserTableRow key={`${c.label}·${i}`} cols={CALLER_COLS} active={c.calls > 0} cells={[
                          c.label, c.device || "—", [c.org, c.city].filter(Boolean).join(", ") || "—",
                          c.calls.toLocaleString(), fmt$(c.cost), fmtDay(c.lastSeen),
                        ]}/>
                      ))}
                      <PlatformUserTotal calls={sumBy(byCaller,'calls')} cost={sumBy(byCaller,'cost')}/>
                    </div>
                  </>
                )
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
            {/* FEATURE: LOG-107 -- platformServices is layer GROUPS ({layer, services[]}), so the
                count sums each group's services (31 today), not the group count. */}
            <SectionHeader label="By Service" open={sections.service} onToggle={()=>toggle('service')} count={platformServices.length ? platformServices.reduce((n, g) => n + g.services.length, 0) : undefined}/>
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
      <ScrollFadeHint show={canScrollMore} bg={T.card} depth/>
      </div>
      </div>
    </>
  );
}
