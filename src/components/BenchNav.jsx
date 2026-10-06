// DeepBench v7.0.790 | BenchNav.jsx | AGT-386 — Breadcrumb is exported, so the Personnel file's own left nav opens with it
// DeepBench v7.0.788 | BenchNav.jsx | AGT-384 — the left nav the five Bench pages share
// (Bench home, the roster, Connect to AI, Test AI, Add a player). Top to bottom: the breadcrumb in
// faint text with a faint rule under it, then All, Private Agents, the BENCH_FILTERS groups and the
// flag-gated Product Team entry (John, 2026-10-05: All above Private; "Private" reads "Private
// Agents"). The breadcrumb reads "Bench Home" on home and "Bench Home › <where you are>" elsewhere;
// "Bench Home" goes where clicking Bench in the main nav goes. A filter click from any page opens
// the roster on that filter, so no page holds the active filter in state: it lives in the address.
// The items, the button styles and the mobile chip row are RosterScreen.jsx's, moved here unchanged
// apart from the order. It names no agent: counts read each row's own bench group (Rule #1).
// Spec: docs/kickoffs/v7.0.788-AGT-384-bench-home.md.

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { T, body, mono } from "../tokens.js";
import { useAgents } from "../hooks/useAgents.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { BENCH_FILTERS, BENCH_PRIVATE, isPrivateAgent } from "../data/agents.js";
import { PRODUCT_TEAM_FILTER, PRODUCT_TEAM_LABEL, useProductTeam } from "./GovernanceSection.jsx"; // FEATURE: AGT-69 / AGT-80 — flag read inside the component

// FEATURE: RO-10 — nav item count badges always reflect group membership in the full roster,
// not the currently filtered subset. `productTeam` is returned beside the items so the roster can
// hand the same rows to the Governance cards without a second read.
export function useBenchNavItems() {
  const agents = useAgents();
  // FEATURE: AGT-80 — the Product Team filter: flag + rows from the component's own hook
  const productTeam = useProductTeam();

  const items = useMemo(() => {
    // FEATURE: AGT-384 — All FIRST, then Private Agents (John's order), from BENCH_PRIVATE; "All" =
    // every non-private agent, so the count and the grid read one predicate (Rule #1: a row value,
    // never an id).
    const all = { id: "all", label: "All", count: agents.filter(a => !isPrivateAgent(a)).length };
    const priv = { id: BENCH_PRIVATE.id, label: BENCH_PRIVATE.label, count: agents.filter(isPrivateAgent).length };
    const groups = BENCH_FILTERS.map(f => ({
      id: f.id,
      label: f.label,
      count: agents.filter(a => a.benchGroups.includes(f.id)).length,
    }));
    // FEATURE: AGT-80 — "Product Team" is the LAST entry (John's word), present only while the
    // AGT-69 flag row is on; its count is the live governance roster, never a constant.
    const productTeamEntry = productTeam.on
      ? [{ id: PRODUCT_TEAM_FILTER, label: PRODUCT_TEAM_LABEL, count: productTeam.rows ? productTeam.rows.length : 0 }]
      : [];
    return [all, priv, ...groups, ...productTeamEntry];
  }, [agents, productTeam.on, productTeam.rows]);

  return { items, productTeam };
}

// FEATURE: AGT-384 — the breadcrumb: where the user is, and the way back to Bench home.
export function Breadcrumb({ current }) {
  const navigate = useNavigate();
  return (
    <div style={{fontFamily:mono,fontSize:9,color:T.muted,letterSpacing:1,padding:"10px 14px",borderBottom:`1px solid ${T.lineSoft}`}}>
      <span onClick={() => navigate("/bench")} style={{cursor:"pointer"}}>Bench Home</span>
      {current && <>{" › "}{current}</>}
    </div>
  );
}

// ── Left sidebar filter nav — FEATURE: RO-10, pattern locked in STYLE-GUIDE.md §10 ──
function Sidebar({ current, activeFilter }) {
  const navigate = useNavigate();
  const { items } = useBenchNavItems();
  return (
    <div style={{width:180,flexShrink:0,background:T.card,borderRight:`1px solid ${T.line}`,display:"flex",flexDirection:"column",overflowY:"auto"}}>
      <Breadcrumb current={current}/>
      {items.map(item => {
        const isActive = activeFilter === item.id;
        return (
          <button key={item.id} onClick={() => navigate(`/bench/roster?filter=${item.id}`)} style={{
            width:"100%", textAlign:"left", padding:"8px 14px",
            fontFamily:body, fontSize:12,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? T.navy : T.mutedDeep,
            background: isActive ? `${T.brass}14` : "transparent",
            border:"none",
            borderLeft: isActive ? `2px solid ${T.brass}` : "2px solid transparent",
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <span>{item.label}</span>
            <span style={{
              fontFamily:mono, fontSize:9, padding:"1px 6px",
              ...(isActive
                ? { background:T.card, border:"1px solid rgba(182,135,58,.5)", color:T.brassDeep }
                : { background:T.paperDeep, border:`1px solid ${T.lineSoft}`, color:T.mutedDeep }),
            }}>{item.count}</span>
          </button>
        );
      })}
    </div>
  );
}

// FEATURE: RO-13 — mobile filter chip row, horizontal adaptation of the Left Sidebar Nav Pattern
// (STYLE-GUIDE.md §10): same brass-highlight logic, border axis left→bottom.
// FEATURE: RO-15 — mobile scroll hint: fade gradient + chevron on the trailing edge, static (not
// scroll-position-aware), same treatment as SH-21's About panel tab bar.
// FEATURE: AGT-384 — the breadcrumb sits as a line above the chips.
function Chips({ current, activeFilter }) {
  const navigate = useNavigate();
  const { items } = useBenchNavItems();
  return (
    <div>
      <Breadcrumb current={current}/>
      <div style={{position:"relative"}}>
        <div style={{display:"flex",overflowX:"auto",gap:6,paddingBottom:10,marginBottom:12,borderBottom:`1px dashed ${T.lineSoft}`}}>
          {items.map(item => {
            const isActive = activeFilter === item.id;
            return (
              <button key={item.id} onClick={() => navigate(`/bench/roster?filter=${item.id}`)} style={{
                flexShrink:0, textAlign:"left", padding:"8px 14px",
                fontFamily:body, fontSize:12,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? T.navy : T.mutedDeep,
                background: isActive ? `${T.brass}24` : "transparent",
                border:"none",
                borderBottom: isActive ? `2px solid ${T.brass}` : "2px solid transparent",
                cursor:"pointer", display:"flex", alignItems:"center", gap:6,
              }}>
                <span>{item.label}</span>
                <span style={{
                  fontFamily:mono, fontSize:9, padding:"1px 6px",
                  ...(isActive
                    ? { background:T.card, border:"1px solid rgba(182,135,58,.5)", color:T.brassDeep }
                    : { background:T.paperDeep, border:`1px solid ${T.lineSoft}`, color:T.mutedDeep }),
                }}>{item.count}</span>
              </button>
            );
          })}
        </div>
        <div style={{position:"absolute",top:0,bottom:11,right:0,width:28,background:`linear-gradient(to right, transparent, ${T.paperDeep} 70%)`,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:3,pointerEvents:"none"}}>
          <span style={{fontFamily:mono,fontSize:10,color:T.brass}}>›</span>
        </div>
      </div>
    </div>
  );
}

// Desktop: the 180px sidebar. Mobile: nothing (BenchNavChips renders inline in the content column).
// `current` is the breadcrumb's second half (null on home); `activeFilter` highlights one entry
// (none on home, Connect to AI, Test AI and Add a player).
export function BenchNav({ current, activeFilter }) {
  const isMobile = useIsMobile();
  if (isMobile) return null;
  return <Sidebar current={current} activeFilter={activeFilter}/>;
}

// Mobile: the breadcrumb line, then the chip row. Desktop: nothing.
export function BenchNavChips({ current, activeFilter }) {
  const isMobile = useIsMobile();
  if (!isMobile) return null;
  return <Chips current={current} activeFilter={activeFilter}/>;
}
