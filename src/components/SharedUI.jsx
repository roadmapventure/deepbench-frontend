// DeepBench v6.2.24 | SharedUI.jsx | MI-55 — Drawer gains an opt-in `resizable` prop (Agent Routing
// only): drag-to-resize grip handle, floor locked at the passed maxHeight, ceiling clamped to
// min(80vh, real content scrollHeight) via the new exported clampDrawerHeight() pure helper. Not
// persisted — plain component state, resets to the default on every reload. Every other Drawer call
// site (Agents/Data Sources/Analysis/Agent Reasoning) doesn't pass `resizable` — byte-unaffected.
// DeepBench v6.2.22 | SharedUI.jsx | MI-53 REVERTED 2026-07-14 — the data-patch-display-intent hop
// this file's ConfirmationCard change depended on let Michelle's agent-selection route an unconfirmed
// correction to a write-capable agent (Eleanor Voss/library-write-intent), which executed a real
// the_library INSERT before any human confirmation -- reverted at John's explicit direction pending
// a proper fix to delegate_to_agent's target-capability restriction (task_773e8b06). ConfirmationCard
// is back to its pre-MI-53 generic Object.entries(proposedAction) rendering, unchanged from
// S-MARKET-INTEL-01d. STYLE-GUIDE.md §16's MI-53 amendment reverted alongside this.
// DeepBench v6.1.41 | SharedUI.jsx | S-MI-34/MI-34 — Drawer gets an optional maxHeight prop (opt-in,
// no behavior change for any drawer that doesn't pass it) so a single drawer can cap its height with
// an internal scroll instead of growing to full natural height
// DeepBench v6.1.11 | SharedUI.jsx | MI-27 — UserAvatar, generic non-agent "You" attribution avatar
// DeepBench v6.0.23 | SharedUI.jsx | S-ARCH-VIZ-01 — generic ChartRenderer + CHART_RENDERERS
// registry (ARCHITECTURE.md §19g), first type bar_pair, capability-agnostic
// DeepBench v6.0.36 | SharedUI.jsx | MI-17 — generic Drawer component
// FEATURE: AI-01 — AiBadge component
// src/components/SharedUI.jsx — v5.0.0
// DeepBench v5 — Shared Treasury UI components
// Used across all screens. Import from here, never re-define in screen files.

import { useState, useRef } from "react";
import { T, display, body, mono, fmtFull, fmtPct, fmt } from "../tokens.js";
import AIDiamond from "./AIDiamond.jsx";
import { AVATAR_CFG } from "../data/agents.js";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from "recharts";

// ── Corners — brass SVG corner ornaments ─────────────────────────────────────
export const Corners = ({ color = T.brass }) => (
  <>
    <svg width="10" height="10" style={{position:"absolute",top:4,left:4,color}} viewBox="0 0 10 10" fill="currentColor"><path d="M0 0h4v1H1v3H0V0z"/></svg>
    <svg width="10" height="10" style={{position:"absolute",top:4,right:4,color}} viewBox="0 0 10 10" fill="currentColor"><path d="M10 0H6v1h3v3h1V0z"/></svg>
    <svg width="10" height="10" style={{position:"absolute",bottom:4,left:4,color}} viewBox="0 0 10 10" fill="currentColor"><path d="M0 10h4v-1H1V6H0v4z"/></svg>
    <svg width="10" height="10" style={{position:"absolute",bottom:4,right:4,color}} viewBox="0 0 10 10" fill="currentColor"><path d="M10 10H6v-1h3V6h1v4z"/></svg>
  </>
);

// ── Card — standard Treasury card wrapper ─────────────────────────────────────
export const Card = ({ title, subtitle, children, span2, style }) => (
  <div style={{ background:T.card, border:`1px solid ${T.line}`, padding:"18px 20px", gridColumn:span2?"1/-1":undefined, position:"relative", ...style }}>
    <Corners/>
    <div style={{marginBottom:14}}>
      <div style={{fontFamily:display,fontSize:15,fontWeight:600,color:T.navy}}>{title}</div>
      {subtitle && <div style={{fontSize:12,color:T.muted,marginTop:2,fontFamily:body}}>{subtitle}</div>}
    </div>
    {children}
  </div>
);

// ── PctBar — percentage bar ───────────────────────────────────────────────────
export const PctBar = ({ pct, color = T.brass, width = 80 }) => (
  <div style={{display:"flex",alignItems:"center",gap:7,minWidth:width+44}}>
    <div style={{height:5,background:T.paperDeep,border:`1px solid ${T.lineSoft}`,width,overflow:"hidden",flexShrink:0}}>
      <div style={{height:"100%",background:color,width:`${Math.min(100,pct)}%`,transition:"width 0.3s"}}/>
    </div>
    <span style={{color:T.brassDeep,fontSize:11,minWidth:38,fontWeight:600,fontFamily:mono}}>{fmtPct(pct)}</span>
  </div>
);

// FEATURE: S-ARCH-VIZ-01 — ChartRenderer + CHART_RENDERERS registry (ARCHITECTURE.md §19g)
// ── ChartRenderer — generic visualization dispatch, ARCHITECTURE.md §19g ────
// Dispatch by chart_type string only, same shape as the backend HANDLERS
// registry (request-receivable.js). Never branches on capability identity —
// any Format Skill's visualization output renders through this, unmodified.
function BarPairChart({ data }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {(data || []).map((m, i) => {
        const curNum = Number(m.current);
        const projNum = Number(m.projected);
        const cur = Number.isFinite(curNum) ? curNum : 0;
        const proj = Number.isFinite(projNum) ? projNum : 0;
        const maxVal = Math.max(cur, proj, 1);
        const barData = [{ name: "now", value: cur }, { name: "proj", value: proj }];
        return (
          <div key={i} style={{display:"flex",flexDirection:"column",gap:4,padding:"6px 0",borderBottom:`1px solid ${T.lineSoft}`}}>
            <div style={{display:"flex",justifyContent:"space-between",fontFamily:body,fontSize:11.5,color:T.ink}}>
              <span>{m.metric}</span>
              <span style={{color:T.muted}}>{m.current} <span style={{color:T.brassDeep}}>→</span> {m.projected} {m.unit || ""}</span>
            </div>
            <ResponsiveContainer width="100%" height={46}>
              <BarChart data={barData} layout="vertical" margin={{left:0,right:0,top:0,bottom:0}}>
                <XAxis type="number" domain={[0, maxVal]} hide/>
                <YAxis type="category" dataKey="name" width={30} tick={{fill:T.muted,fontSize:9,fontFamily:mono}} axisLine={false} tickLine={false}/>
                <Bar dataKey="value" radius={[0,2,2,0]} barSize={9}>
                  <Cell fill={T.mutedDeep}/>
                  <Cell fill={T.brass}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}

// Registered chart_type -> renderer. Adding a type: register a renderer here +
// extend the enum in whichever skill's schema opts in. Never edit ChartRenderer
// itself, never add a capability/screen conditional here or at any call site.
export const CHART_RENDERERS = { bar_pair: BarPairChart };

export const ChartRenderer = ({ type, data, caption }) => {
  const Renderer = CHART_RENDERERS[type];
  if (!Renderer) return null;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {caption && <div style={{fontFamily:body,fontSize:11,color:T.mutedDeep,fontStyle:"italic"}}>{caption}</div>}
      <Renderer data={data}/>
    </div>
  );
};

// ── SkillBar — agent skill level bar ─────────────────────────────────────────
export const SkillBar = ({ skill, color = T.brass, size = 6 }) => (
  <div>
    <div style={{height:size,background:T.paperDeep,border:`1px solid ${T.lineSoft}`,position:"relative"}}>
      <div style={{position:"absolute",inset:0,right:`${100-skill}%`,background:`linear-gradient(90deg,${color},${color===T.moss?T.moss:T.brassDeep})`}}/>
      {[30,55,75,90].map(t => <div key={t} style={{position:"absolute",top:-2,bottom:-2,left:`${t}%`,width:1,background:T.line}}/>)}
    </div>
    <div style={{display:"flex",justifyContent:"space-between",fontFamily:mono,fontSize:8,color:T.muted,marginTop:3}}>
      <span>Trainee</span><span>Developing</span><span>Proficient</span><span>Expert</span><span>Principal</span>
    </div>
  </div>
);

// ── Toast — bottom-right notification ────────────────────────────────────────
export const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div style={{position:"fixed",bottom:22,right:22,background:T.navy,border:`1px solid ${T.brass}`,padding:"10px 16px",fontSize:12,color:T.card,fontFamily:mono,boxShadow:"0 8px 28px rgba(0,0,0,0.3)",zIndex:9999,display:"flex",alignItems:"center",gap:8,animation:"slideUp 0.2s ease"}}>
      <span>{toast.icon}</span><span>{toast.msg}</span>
    </div>
  );
};

// ── FeatureBadge — invisible anchor for DebugOverlay feature-ID tagging ─────
// Renders a zero-size absolutely positioned element; DebugOverlay attaches the
// visible label when ?debug=features is active. Parent must be position:relative.
export const FeatureBadge = ({ id }) => (
  <span data-feature-id={id} aria-hidden="true" style={{position:"absolute",top:0,left:0,width:0,height:0,overflow:"visible",pointerEvents:"none"}}/>
);

// ── AiBadge — AI heartbeat diamond badge for AI-touched elements ─────────────
export const AiBadge = ({ style, label, built = true }) => {
  const [show, setShow] = useState(false);
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setTipPos({ top: r.top - 7, left: r.left + r.width / 2 });
    }
    setShow(true);
  };

  return (
    <span ref={ref}
      style={{position:"relative",display:"inline-flex",alignItems:"center"}}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}>
      {/* FEATURE: AI-01 — AiBadge tooltip label */}
      <span style={{fontFamily:mono,fontSize:8,
        background: built ? `rgba(182,135,58,0.15)` : `rgba(120,109,82,0.12)`,
        border: built ? `1px solid rgba(182,135,58,0.4)` : `1px dashed rgba(120,109,82,0.35)`,
        padding:"1px 5px",color: built ? T.brass : T.muted,
        letterSpacing:0.3,flexShrink:0,display:"inline-flex",alignItems:"center",gap:3,...style}}>
        <AIDiamond size="6px" color={built ? T.brass : T.muted}/> AI
      </span>
      {show && (
        <>
          <span style={{
            position:"fixed",
            top: tipPos.top,
            left: tipPos.left,
            transform:"translate(-50%, -100%)",
            whiteSpace:"nowrap",
            fontFamily:mono,
            fontSize:9,
            letterSpacing:"0.4px",
            textTransform:"uppercase",
            color:T.brassLight,
            background:T.navy,
            border:`1px solid rgba(182,135,58,0.5)`,
            padding:"3px 7px",
            pointerEvents:"none",
            zIndex:9999,
          }}>{label || "AI"}</span>
          <span style={{
            position:"fixed",
            top: tipPos.top,
            left: tipPos.left,
            transform:"translate(-50%, 0)",
            width:0,
            height:0,
            borderLeft:"4px solid transparent",
            borderRight:"4px solid transparent",
            borderTop:`4px solid rgba(182,135,58,0.5)`,
            pointerEvents:"none",
            zIndex:9999,
          }}/>
        </>
      )}
    </span>
  );
};

// ── AISugg — "AI SUGGESTED" badge for form fields ────────────────────────────
export const AISugg = () => (
  <span style={{fontFamily:mono,fontSize:8,background:"rgba(155,110,243,0.12)",border:"1px solid rgba(155,110,243,0.3)",padding:"1px 5px",color:"#9b6ef3",letterSpacing:0.3}}>AI SUGGESTED</span>
);

// ── AiStatusDot — pulsing brass dot for active AI calls ──────────────────────
export const AiStatusDot = ({ message, style }) => {
  if (!message) return null;
  return (
    <div style={{display:"flex",alignItems:"center",gap:7,...style}}>
      <span style={{width:7,height:7,borderRadius:"50%",background:T.brass,display:"inline-block",animation:"aiBlink 1.2s ease-in-out infinite",flexShrink:0}}/>
      <span style={{fontFamily:mono,fontSize:10,color:T.brass,letterSpacing:0.3}}>{message}</span>
    </div>
  );
};

// FEATURE: RO-04 — Illustrated SVG portrait per agent; used on Roster and Work screens
export function AgentAvatar({ who, size = 68, ring = true }) {
  const c = AVATAR_CFG[who] || AVATAR_CFG.chloe;
  const uid = `av-${who}-${Math.random().toString(36).slice(2,7)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" style={{display:"block",flexShrink:0}}>
      <defs><clipPath id={`clip-${uid}`}><circle cx="36" cy="36" r="34"/></clipPath></defs>
      <circle cx="36" cy="36" r="35" fill={T.card} stroke={ring?c.border:"none"} strokeWidth={ring?1.5:0}/>
      <g clipPath={`url(#clip-${uid})`}>
        <rect x="0" y="0" width="72" height="72" fill="#ede6d5"/>
        <rect x="0" y="40" width="72" height="32" fill={T.card}/>
        <path d="M 6 72 Q 12 54 36 54 Q 60 54 66 72 Z" fill={c.collar}/>
        <rect x="31" y="48" width="10" height="8" rx="2" fill={c.skin}/>
        {c.extra==="bun"&&<circle cx="48" cy="22" r="6" fill={c.hair}/>}
        <path d="M 16 34 Q 14 18 36 15 Q 58 18 56 34 Q 56 22 36 22 Q 16 22 16 34 Z" fill={c.hair}/>
        <ellipse cx="36" cy="36" rx="14" ry="16" fill={c.skin}/>
        {c.extra==="bob"&&<path d="M 20 30 Q 20 18 36 16 Q 54 18 52 34 L 52 28 Q 46 22 36 22 Q 26 22 22 30 Z" fill={c.hair}/>}
        {c.extra==="freckles"&&<path d="M 22 26 Q 24 18 36 16 Q 48 18 50 30 Q 44 22 36 22 Q 28 22 22 28 Z" fill={c.hair}/>}
        {c.extra==="tie"&&<path d="M 22 30 Q 22 20 36 18 Q 48 20 50 28 Q 44 22 36 22 Q 28 22 24 28 Q 22 29 22 30 Z" fill={c.hair}/>}
        {c.extra==="glasses"&&<path d="M 22 30 Q 24 20 36 18 Q 50 20 50 30 Q 44 24 36 24 Q 28 24 22 30 Z" fill={c.hair}/>}
        <circle cx="30" cy="35" r="1.2" fill={T.navy}/>
        <circle cx="42" cy="35" r="1.2" fill={T.navy}/>
        {c.extra==="glasses"&&<g fill="none" stroke={T.navy} strokeWidth="1.2"><circle cx="30" cy="35" r="4"/><circle cx="42" cy="35" r="4"/><line x1="34" y1="35" x2="38" y2="35"/></g>}
        {c.extra==="freckles"&&<g fill={c.hair} opacity="0.45"><circle cx="28" cy="38" r="0.5"/><circle cx="31" cy="39" r="0.5"/><circle cx="41" cy="39" r="0.5"/><circle cx="44" cy="38" r="0.5"/></g>}
        <ellipse cx="28" cy="40" rx="2" ry="1" fill="#c47a5a" opacity="0.22"/>
        <ellipse cx="44" cy="40" rx="2" ry="1" fill="#c47a5a" opacity="0.22"/>
        <path d="M 32 43 Q 36 46 40 43" fill="none" stroke={T.navy} strokeWidth="1.1" strokeLinecap="round"/>
        {c.extra==="tie"&&<><path d="M 34 54 L 38 54 L 40 72 L 32 72 Z" fill={T.brass}/><path d="M 34 54 L 36 58 L 38 54 Z" fill={T.navy}/></>}
        {c.extra==="field"&&<><rect x="28" y="52" width="16" height="20" rx="1" fill={T.moss} opacity="0.8"/><rect x="30" y="54" width="12" height="2.5" rx="0.5" fill="#fff" opacity="0.35"/><rect x="30" y="58" width="8" height="2" rx="0.5" fill="#fff" opacity="0.2"/></>}
        {(c.extra==="bob"||c.extra==="bun"||c.extra==="glasses"||c.extra==="field")&&<path d="M 26 58 L 36 64 L 46 58" fill="none" stroke={c.border} strokeWidth="1.5" opacity="0.7"/>}
      </g>
      {ring&&<circle cx="36" cy="36" r="34.5" fill="none" stroke={c.border} strokeWidth="0.5" strokeDasharray="0.5 2" opacity="0.5"/>}
    </svg>
  );
}

// FEATURE: MI-27 -- generic "You" attribution avatar for human-authored chat content (the
// Submitted Hypothesis card). Deliberately separate from AgentAvatar: STYLE-GUIDE.md Section 17's
// avatar-mandatory rule is scoped to *agent* attribution specifically -- the human submitter has
// no agent identity to represent, so this is a plain silhouette, never an illustrated agent
// portrait or an AVATAR_CFG/roster entry. Approved by John via live HTML mock, Option A (a plain
// navy circle + simple figure, distinguishable at a glance from every illustrated agent avatar).
export function UserAvatar({ size = 16 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: T.navy,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      border: `1.5px solid ${T.brassLight}`,
    }}>
      <svg viewBox="0 0 24 24" fill="none" width={size * 0.55} height={size * 0.55}>
        <circle cx="12" cy="8" r="4" fill={T.brassLight} />
        <path d="M4 20c0-4.5 3.6-7 8-7s8 2.5 8 7" stroke={T.brassLight} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// FEATURE: AI-28
// ── FlagCard — collapsible procurement flag card ──────────────────────────────
export const FlagCard = ({ severity, title, summary, detail, amount, count, recommendation, totalSpend }) => {
  const [open, setOpen] = useState(false);
  const flagColors = { high:T.flag, medium:"#b8721a", low:"#a08020", info:T.navy };
  const flagBg     = { high:`${T.flag}10`, medium:"rgba(184,114,26,0.08)", low:"rgba(160,128,32,0.08)", info:`${T.navy}08` };
  const flagIcons  = { high:"⚑", medium:"⚑", low:"⚑", info:"ℹ" };
  const c = flagColors[severity]; const bg = flagBg[severity];
  const pct = totalSpend && amount ? (amount/totalSpend*100) : null;
  return (
    <div style={{background:bg,border:`1px solid ${c}44`,padding:"14px 18px",marginBottom:10,position:"relative"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,cursor:"pointer"}} onClick={()=>setOpen(o=>!o)}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
            <span style={{fontSize:13,color:c,fontFamily:mono}}>{flagIcons[severity]}</span>
            <span style={{fontSize:13,fontWeight:700,color:T.navy,fontFamily:display}}>{title}</span>
            <span style={{fontSize:9.5,background:`${c}18`,color:c,padding:"1px 7px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",border:`1px solid ${c}40`,fontFamily:mono}}>{severity} priority</span>
          </div>
          <div style={{fontSize:12.5,color:T.mutedDeep,lineHeight:1.5,fontFamily:body}}>{summary}</div>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"flex-start",flexShrink:0}}>
          {amount!=null&&(<div style={{textAlign:"right"}}><div style={{fontSize:10,color:T.muted,marginBottom:2,fontFamily:mono,letterSpacing:1,textTransform:"uppercase"}}>Spend at Risk</div><div style={{fontSize:15,fontWeight:700,color:c,fontFamily:display}}>{fmt(amount)}</div>{pct!=null&&<div style={{fontSize:10,color:`${c}cc`,marginTop:2,fontWeight:700,fontFamily:mono}}>{fmtPct(pct)} of total</div>}</div>)}
          {count!=null&&<div style={{textAlign:"right"}}><div style={{fontSize:10,color:T.muted,marginBottom:2,fontFamily:mono,letterSpacing:1,textTransform:"uppercase"}}>Instances</div><div style={{fontSize:15,fontWeight:700,color:T.mutedDeep,fontFamily:display}}>{count}</div></div>}
          <div style={{color:T.brassDeep,fontSize:14,marginTop:2,fontFamily:mono}}>{open?"▲":"▼"}</div>
        </div>
      </div>
      {open&&(
        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${c}22`}}>
          {detail&&<div style={{fontSize:12.5,color:T.mutedDeep,lineHeight:1.6,marginBottom:10,fontFamily:body}}>{detail}</div>}
          {recommendation&&<div style={{background:`${T.moss}10`,border:`1px solid ${T.moss}40`,padding:"10px 14px"}}>
            <div style={{fontSize:10,color:T.moss,fontWeight:700,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:mono}}>💡 Recommended Action</div>
            <div style={{fontSize:12.5,color:T.mutedDeep,lineHeight:1.5,fontFamily:body}}>{recommendation}</div>
          </div>}
        </div>
      )}
    </div>
  );
};

// FEATURE: MI-55 — pure, testable clamp helper for Drawer's drag-resize. Extracted out of render/
// drag-handler logic specifically so it can be unit-tested without a real DOM (matches the existing
// groupDataSources()/buildActivitySummary() pattern). Floor is always the drawer's own default
// maxHeight (never shrinkable below it); ceiling is min(real content height, 80% of viewport) — never
// empty padding space, never past 80vh.
export function clampDrawerHeight(candidateHeight, floorHeight, contentHeight, viewportHeight) {
  const ceiling = Math.min(contentHeight, viewportHeight * 0.8);
  return Math.max(floorHeight, Math.min(candidateHeight, ceiling));
}

// FEATURE: MI-17 — generic collapsible drawer, same toggle interaction FlagCard already uses.
// First Column 3 (Audit) drawer with real open/close state — Pipeline Log stays a static
// always-expanded box, unchanged, out of scope this session. Reusable by any future Column 3
// item (MI-06/07/09/15/16/18) — never rebuild this per-drawer.
// FEATURE: MI-55 — new opt-in `resizable` prop (default false, backward-compatible — every existing
// call site that doesn't pass it is byte-unaffected). When true and open, renders a drag handle at
// the bottom of the content wrapper that lets the user grow the drawer past its default maxHeight,
// clamped via clampDrawerHeight() above. Not persisted — dragHeight is plain component state, resets
// to null (→ default maxHeight) on every remount/reload.
export const Drawer = ({ title, count, children, defaultOpen = false, maxHeight, resizable = false, onOpen = undefined }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [dragHeight, setDragHeight] = useState(null);
  const contentRef = useRef(null);

  // FEATURE: MI-72b — fires onOpen exactly on the closed->open transition (not on every toggle,
  // not on open->closed). Used by the Agents drawer to bump a refreshKey and re-fetch fresh data
  // each time it's opened, rather than only once at page load.
  const toggle = () => {
    const willOpen = !open;
    if (willOpen && onOpen) onOpen();
    setOpen(willOpen);
  };

  const effectiveHeight = dragHeight == null
    ? maxHeight
    : clampDrawerHeight(dragHeight, maxHeight, contentRef.current?.scrollHeight ?? maxHeight, window.innerHeight);

  const handleDragStart = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = effectiveHeight;
    const onMouseMove = (moveEvent) => {
      setDragHeight(startHeight + (moveEvent.clientY - startY));
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div style={{background:T.cardAlt,border:`1px solid ${T.lineSoft}`}}>
      <div onClick={toggle}
        style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",cursor:"pointer"}}>
        <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.muted}}>{title}</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {count!=null && (
            <span style={{fontFamily:mono,fontSize:9,color:T.muted,background:T.paperDeep,padding:"2px 7px",borderRadius:10,border:`1px solid ${T.lineSoft}`}}>{count}</span>
          )}
          <span style={{fontFamily:mono,fontSize:10,color:T.brassDeep}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open && (
        <>
          <div ref={contentRef}
            style={{padding:"0 14px 14px",display:"flex",flexDirection:"column",gap:10, ...(maxHeight ? {maxHeight:effectiveHeight, overflowY:"auto"} : {})}}>
            {children}
          </div>
          {resizable && (
            <div
              onMouseDown={handleDragStart}
              style={{height:6,width:"100%",cursor:"ns-resize",background:"transparent"}}
              onMouseEnter={(e)=>{e.currentTarget.style.background = T.brass;}}
              onMouseLeave={(e)=>{e.currentTarget.style.background = "transparent";}}
            />
          )}
        </>
      )}
    </div>
  );
};

// FEATURE: MI-01d — generic pending_confirmation UI. Any capability whose Skill Profile sets
// requires_human_confirmation: true surfaces here, unmodified per-capability — proposedAction/
// critique are rendered generically from whatever fields that capability's own schema returned,
// never a bespoke layout per agent. First frontend implementation of this gate anywhere on the
// platform (confirmed by grep this design session: zero prior pending_confirmation/confirmation_id
// UI exists) — lives here, not in a screen file, so it is reusable platform-wide going forward.
export function ConfirmationCard({ agent, proposedAction, critique, onResolve }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);

  const resolve = async (resolution, editedText = null) => {
    setBusy(true);
    try {
      await onResolve(resolution, editedText);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{background:T.card,border:`1px solid ${T.brassLight}`,borderLeft:`4px solid ${T.brass}`,borderRadius:3}}>
      <div style={{background:"#f6ecd8",padding:"7px 12px",display:"flex",alignItems:"center",gap:8}}>
        {agent && <AgentAvatar who={agent.id} size={20}/>}
        <span style={{fontFamily:body,fontSize:11.5,fontWeight:600,color:T.ink}}>{agent ? agent.name : "Agent"}</span>
        <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{agent ? agent.role : ""}</span>
        <span style={{marginLeft:"auto",fontFamily:mono,fontSize:9,padding:"2px 7px",background:T.brass,color:T.card,borderRadius:2,textTransform:"uppercase"}}>Needs Your Decision</span>
      </div>
      <div style={{padding:"11px 13px",display:"flex",flexDirection:"column",gap:8}}>
        {Object.entries(proposedAction || {}).filter(([, v]) => v !== null && v !== "").map(([k, v]) => (
          <div key={k} style={{fontFamily:body,fontSize:12,lineHeight:1.5,color:T.ink}}>
            <span style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em",marginRight:6}}>{k.replace(/_/g," ")}:</span>
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </div>
        ))}
        {critique && (
          <div style={{padding:"8px 10px",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:11.5,color:T.mutedDeep}}>
            {typeof critique === "object" ? JSON.stringify(critique) : critique}
          </div>
        )}
        {editing ? (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <textarea rows={2} value={editText} onChange={e=>setEditText(e.target.value)}
              placeholder="Rewrite the correction…"
              style={{padding:"9px 11px",border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:12,background:T.card,color:T.ink,resize:"vertical"}}/>
            <div style={{display:"flex",gap:6}}>
              <button disabled={busy||!editText.trim()} onClick={()=>resolve("edit", editText.trim())}
                style={{flex:1,padding:"7px 6px",background:T.navy,color:T.card,border:"none",fontFamily:body,fontSize:11,cursor:busy?"default":"pointer"}}>
                Resubmit
              </button>
              <button disabled={busy} onClick={()=>setEditing(false)}
                style={{flex:1,padding:"7px 6px",background:"transparent",border:`1px solid ${T.line}`,fontFamily:body,fontSize:11,color:T.ink,cursor:busy?"default":"pointer"}}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{display:"flex",gap:6,marginTop:2}}>
            <button disabled={busy} onClick={()=>resolve("reject")}
              style={{flex:1,padding:"8px 6px",background:"transparent",border:`1px solid ${T.line}`,fontFamily:body,fontSize:11,color:T.ink,cursor:busy?"default":"pointer"}}>
              Reject
            </button>
            <button disabled={busy} onClick={()=>setEditing(true)}
              style={{flex:1,padding:"8px 6px",background:"transparent",border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:11,color:T.muted,cursor:busy?"default":"pointer"}}>
              Edit
            </button>
            <button disabled={busy} onClick={()=>resolve("accept")}
              style={{flex:1,padding:"8px 6px",background:T.brass,color:T.card,border:"none",fontFamily:body,fontSize:11,fontWeight:600,cursor:busy?"default":"pointer"}}>
              Accept
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Recharts shared components ────────────────────────────────────────────────
export const PctBarLabel = ({ x, y, width, height, value, total }) => {
  if (!total || width < 30) return null;
  return <text x={x+width+7} y={y+height/2+1} fill={T.brassDeep} fontSize={10} fontWeight={600} fontFamily={mono} dominantBaseline="middle">{(value/total*100).toFixed(1)}%</text>;
};

export const Tip = ({ active, payload, label, total }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const pct = total && total > 0 ? (val/total*100) : (payload[0].payload?._pct ?? null);
  return (
    <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"10px 14px",color:T.ink,fontSize:13,maxWidth:300,fontFamily:body}}>
      <div style={{fontWeight:700,marginBottom:4,color:T.navy,lineHeight:1.3,fontFamily:display}}>{label||payload[0].name}</div>
      <div style={{color:T.mutedDeep}}>{fmtFull(val)}</div>
      {pct!=null&&<div style={{color:T.brassDeep,fontSize:11,marginTop:3,fontFamily:mono}}>📊 {fmtPct(pct)} of total spend</div>}
    </div>
  );
};

// ── Treemap cell ──────────────────────────────────────────────────────────────
import { PALETTE } from "../tokens.js";
let _treemapTotal = 0;
export const setTreemapTotal = t => { _treemapTotal = t; };
export const TreeCell = ({ x, y, width, height, name, value, index }) => {
  if (width < 30 || height < 20) return null;
  const color = PALETTE[index % PALETTE.length];
  const pct = _treemapTotal > 0 ? (value/_treemapTotal*100).toFixed(1) : null;
  const showName = width>70&&height>32; const showAmt = width>70&&height>55; const showPct = width>70&&height>72&&pct!=null;
  const midY = y+height/2; const nameY = showPct ? midY-14 : showAmt ? midY-9 : midY+4;
  return (
    <g>
      <rect x={x+1} y={y+1} width={width-2} height={height-2} rx={2} fill={color} fillOpacity={0.9} stroke={T.paperDeep} strokeWidth={1}/>
      {showName&&<text x={x+width/2} y={nameY} textAnchor="middle" fill="#fff" fontSize={Math.min(11,width/9)} fontWeight="600" style={{pointerEvents:"none"}}>{name?.length>18?name.slice(0,17)+"…":name}</text>}
      {showAmt&&<text x={x+width/2} y={nameY+(showPct?14:showName?13:0)} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={Math.min(10,width/10)} style={{pointerEvents:"none"}}>{fmt(value)}</text>}
      {showPct&&<text x={x+width/2} y={nameY+27} textAnchor="middle" fill="rgba(255,255,255,0.95)" fontSize={Math.min(11,width/9)} fontWeight="700" style={{pointerEvents:"none"}}>{pct}%</text>}
    </g>
  );
};

// ── TimelinePctLabel ─────────────────────────────────────────────────────────
export const TimelinePctLabel = ({ x, y, width, value, total }) => {
  if (!total || !value || width < 20) return null;
  return <text x={x+width/2} y={y-4} textAnchor="middle" fill={T.brassDeep} fontSize={9} fontWeight={600} fontFamily={mono}>{(value/total*100).toFixed(1)}%</text>;
};

// ── PromptComparisonPanel ─────────────────────────────────────────────────────
export const PromptComparisonPanel = ({ pd }) => {
  const [layerOpen, setLayerOpen] = useState({});
  const toggle = k => setLayerOpen(m => ({ ...m, [k]: !m[k] }));
  const overlapColor = pct => pct >= 90 ? T.moss : pct >= 60 ? T.brass : T.flag;
  const layerColors  = ["#9b6ef3", T.moss, T.brassDeep, T.brass, T.flag];

  return (
    <div style={{background:T.card,border:`1px solid ${T.line}`,marginBottom:16,position:"relative"}}>
      <Corners color={T.navy}/>
      <div style={{background:T.navyMid,padding:"12px 18px",display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
        <div>
          <div style={{fontFamily:mono,fontSize:9,color:T.brassLight,textTransform:"uppercase",letterSpacing:1.8,fontWeight:600,marginBottom:3}}>Prompt Intelligence</div>
          <div style={{fontFamily:display,fontSize:14,fontWeight:600,color:T.card}}>System Prompt Comparison — Why they think differently</div>
        </div>
        <div style={{display:"flex",gap:20}}>
          {[{name:pd.agent1,tok:pd.total.t1},{name:pd.agent2,tok:pd.total.t2}].map(({name,tok})=>(
            <div key={name} style={{textAlign:"right"}}>
              <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>{name} · total tokens</div>
              <div style={{fontFamily:display,fontSize:16,fontWeight:700,color:T.brassLight,fontVariantNumeric:"tabular-nums"}}>{tok.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        {pd.layers.map((layer, i) => {
          const isOpen = layerOpen[layer.key];
          const oc = overlapColor(layer.overlap);
          const lc = layerColors[i];
          return (
            <div key={layer.key} style={{borderBottom:`1px solid ${T.lineSoft}`}}>
              <div onClick={() => !layer.same && toggle(layer.key)}
                style={{display:"grid",gridTemplateColumns:"200px 1fr 1fr 90px 28px",alignItems:"center",padding:"10px 18px",cursor:layer.same?"default":"pointer",background:isOpen?T.cardAlt:"transparent",transition:"background .15s"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:3,height:32,background:lc,flexShrink:0}}/>
                  <div>
                    <div style={{fontFamily:mono,fontSize:9,fontWeight:700,color:lc,letterSpacing:.5}}>{layer.label}</div>
                    {layer.same
                      ? <div style={{fontFamily:mono,fontSize:8.5,color:T.moss,fontWeight:600}}>● Identical</div>
                      : <div style={{fontFamily:mono,fontSize:8.5,color:T.flag}}>◉ Different</div>}
                  </div>
                </div>
                {[{name:pd.agent1,nameProp:layer.name1,tok:layer.tok1,words:layer.words1},{name:pd.agent2,nameProp:layer.name2,tok:layer.tok2,words:layer.words2}].map(({name,nameProp,tok,words})=>(
                  <div key={name} style={{padding:"0 14px",borderLeft:`1px solid ${T.lineSoft}`}}>
                    <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",marginBottom:2}}>{name}</div>
                    <div style={{fontFamily:body,fontSize:11.5,color:T.navy,fontWeight:500}}>{nameProp}</div>
                    {!layer.same&&tok>0&&<div style={{fontFamily:mono,fontSize:9,color:T.muted,marginTop:1}}>{tok} tokens · {words} words</div>}
                  </div>
                ))}
                <div style={{textAlign:"center",borderLeft:`1px solid ${T.lineSoft}`,padding:"0 10px"}}>
                  <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",marginBottom:3}}>Overlap</div>
                  <div style={{fontFamily:display,fontSize:18,fontWeight:700,color:oc,lineHeight:1}}>{layer.overlap}%</div>
                  <div style={{height:3,background:T.paperDeep,marginTop:4}}><div style={{height:"100%",width:`${layer.overlap}%`,background:oc}}/></div>
                </div>
                {!layer.same&&<div style={{textAlign:"center",fontFamily:mono,fontSize:10,color:T.muted}}>{isOpen?"▲":"▼"}</div>}
              </div>
              {isOpen&&!layer.same&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderTop:`1px solid ${T.lineSoft}`}}>
                  {[{name:pd.agent1,text:layer.text1},{name:pd.agent2,text:layer.text2}].map(({name,text},si)=>(
                    <div key={name} style={{padding:"12px 16px",borderRight:si===0?`1px solid ${T.lineSoft}`:"none",background:T.navyDeep}}>
                      <div style={{fontFamily:mono,fontSize:8.5,color:lc,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:7}}>{name}</div>
                      <div style={{fontFamily:mono,fontSize:10.5,color:"#8fa3bf",lineHeight:1.7,whiteSpace:"pre-wrap",maxHeight:160,overflowY:"auto"}}>{text||"(empty)"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{padding:"11px 18px",background:T.cardAlt,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:T.navy,flexShrink:0}}/>
        <div style={{fontFamily:body,fontSize:12,color:T.mutedDeep,lineHeight:1.5,flex:1}}>
          {pd.layers.filter(l=>!l.same).length===0
            ? `${pd.agent1} and ${pd.agent2} have identical prompt configurations. Output differences are driven entirely by their RAG knowledge base.`
            : `${pd.layers.filter(l=>!l.same).length} of 5 prompt layers differ. ${pd.layers.filter(l=>!l.same&&l.overlap<60).map(l=>l.label.split("·")[1]?.trim()).filter(Boolean).join(" and ")||"These layers"} drive the most divergence. Click any row to compare the actual prompt text side by side.`}
        </div>
        <div style={{fontFamily:mono,fontSize:9,color:T.muted,flexShrink:0}}>Configure in Resume & Playbook tabs</div>
      </div>
    </div>
  );
};
