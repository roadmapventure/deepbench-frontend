// DeepBench v7.0.460 | GovernanceSection.jsx | AGT-80 — the section becomes the Bench's "Product Team"
// filter (John, 2026-09-12, verbatim: "place the governance agents as a filter in the Bench on the left
// hand side as 'Product Team', last on the list"). Exports PRODUCT_TEAM_FILTER / PRODUCT_TEAM_LABEL and
// useProductTeam() (flag + rows in one hook) so RosterScreen.jsx adds ONE nav entry and ONE mount; the
// default export now takes the rows in and renders embedded (no top margin) in the grid area. Read-only,
// rows-from-the-view and no-ids-in-code are unchanged.
// DeepBench v7.0.456 | GovernanceSection.jsx | AGT-69 — the Bench's read-only Governance section:
// the live is_active lane=governance agents with portrait, role, specialty and their 7-day calls,
// tokens and cycles, read from public.governance_agent_activity_7d (one row per agent, aggregated
// server-side so the browser reads six rows rather than thirteen hundred log lines). John ruled
// shape (a) on 2026-09-11, decision 146256c1-f29a-4fb5-8854-9489eecd6d7e.
//
// FLAGGED (ON BY DEFAULT ON DEV SINCE 2026-09-12, John's rule), AND THE FLAG READ LIVES HERE. ARCHITECTURE.md §19v's exposure rule applies
// even to a shape John has already ruled on: an appearance change on an approved surface ships
// behind a data row (HAR-41), so his Accept is one UPDATE and his Reverse is the same UPDATE with
// `false`. Preview without the flip: /bench?ff=agt-69-governance-section. Keeping the flag read
// inside this component is what lets RosterScreen.jsx gain ONE import and ONE mount and nothing
// else (.claude/rules/autonomous-surface-changes.md).
//
// ROWS, NEVER NAMES (ARCHITECTURE.md §19e, Rule #1). No agent id appears as a literal in this
// file. The section is whatever the view returns; an agent added to or removed from the governance
// lane changes this surface with no deploy. tests/regression/agt-69-governance-section.test.mjs
// scans this file for the six ids and carries a negative control that proves the scan can fail.
//
// READ-ONLY IS STRUCTURAL, NOT A CONVENTION. There is no onClick, no navigate, no profile route,
// no rating, no salary, no skill bar and no hire control anywhere below — these agents build and
// grade DeepBench itself and are not on the market. The same test asserts each of those absences
// against the rendered markup, so "read-only" is a measured property rather than a claim.
//
// A ZERO IS A MEASUREMENT, NOT AN ABSENCE. A governance agent with no calls in seven days renders
// its card with 0; only an empty ROW SET renders nothing at all
// (.claude/rules/agent-section-rendering.md governs agent-authored copy, not counters).

import { useEffect, useState } from "react";
import { T, display, body, mono } from "../tokens.js";
import { supabase } from "../lib/supabase.js";
import { useFeatureFlag } from "../lib/featureFlags.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { AgentAvatar, Corners, FeatureBadge } from "./SharedUI.jsx";

/** The data row that gates this section. On by default on dev since 2026-09-12; John flips it off (src/lib/featureFlags.js). */
export const GOVERNANCE_FLAG = "agt-69-governance-section";

/** AGT-80 — the Bench filter id and label. The label is the one John gave, verbatim. */
export const PRODUCT_TEAM_FILTER = "product-team";
export const PRODUCT_TEAM_LABEL = "Product Team";

/** The anon-readable aggregate view. Definer-style: anon holds no grant on runner_cycles. */
export const GOVERNANCE_VIEW = "governance_agent_activity_7d";

/** Named columns, never select=* — the grants rule (.claude/rules/supabase-column-grants.md). */
export const GOVERNANCE_COLUMNS =
  "agent_id,code,name,role,specialty,calls,input_tokens,output_tokens,cycles";

/**
 * Read the governance roster once on mount.
 *
 * Returns `null` while the read is in flight (the caller renders nothing rather than an empty
 * section that fills in a beat later) and `[]` on any error — the same fail-quiet direction
 * featureFlags.js takes, for the same reason: a failed read must degrade to "no new section",
 * never to a broken Bench.
 *
 * @returns {Array<object>|null}
 */
export function useGovernanceRoster() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from(GOVERNANCE_VIEW)
      .select(GOVERNANCE_COLUMNS)
      .order("code")
      .then(({ data, error }) => {
        if (cancelled) return;
        setRows(error || !Array.isArray(data) ? [] : data);
      });
    return () => { cancelled = true; };
  }, []);

  return rows;
}

// STYLE-GUIDE.md §10a — fixed-width label column, then a fixed-minWidth right-aligned number, so
// the three counters line up on their units digit regardless of label length.
function ActivityRow({ label, value }) {
  return (
    <div style={{display:"flex",alignItems:"baseline",fontFamily:mono,fontSize:10,color:T.mutedDeep,letterSpacing:0.6,marginTop:5}}>
      <span style={{width:82,flexShrink:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{label}</span>
      <span style={{display:"flex",color:T.navy,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>
        <span style={{display:"inline-block",minWidth:72,textAlign:"right",flexShrink:0}}>{value}</span>
      </span>
    </div>
  );
}

function GovernanceCard({ row }) {
  const tokens = Number(row.input_tokens) + Number(row.output_tokens);

  return (
    <div style={{background:T.card,border:`1px solid ${T.line}`,position:"relative",display:"flex",flexDirection:"column",padding:"16px 16px 14px",overflow:"hidden"}}>
      <FeatureBadge id="AGT-69" />
      <Corners color={T.brass} />

      <div style={{display:"flex",gap:12,alignItems:"flex-start",paddingBottom:12,borderBottom:`1px dashed ${T.line}`}}>
        <AgentAvatar who={row.agent_id} size={56} ring />
        <div style={{minWidth:0}}>
          <div style={{fontFamily:mono,fontSize:9.5,color:T.brassDeep,letterSpacing:1.3,fontWeight:600,marginBottom:4}}>
            {`${row.code} · GOVERNANCE`}
          </div>
          <div style={{fontFamily:display,fontSize:17,fontWeight:600,color:T.navy,lineHeight:1.15,marginBottom:3}}>
            {row.name}
          </div>
          <div style={{fontFamily:body,fontSize:11.5,fontStyle:"italic",color:T.mutedDeep,lineHeight:1.4}}>
            {row.role}
          </div>
        </div>
      </div>

      <div style={{fontFamily:body,fontSize:11.5,color:T.ink,lineHeight:1.55,marginTop:11,flexGrow:1}}>
        {row.specialty}
      </div>

      <div style={{marginTop:13,padding:"9px 11px",background:`${T.brass}14`,border:`1px solid ${T.lineSoft}`}}>
        <ActivityRow label="Calls · 7d"  value={Number(row.calls).toLocaleString()} />
        <ActivityRow label="Tokens · 7d" value={tokens.toLocaleString()} />
        <ActivityRow label="Cycles · 7d" value={Number(row.cycles).toLocaleString()} />
      </div>
    </div>
  );
}

/**
 * The section itself, pure and rows-in. Exported separately from the default export so the
 * regression test can render it without a flag, a network read or a browser.
 *
 * @param {{rows: Array<object>, isMobile: boolean}} props
 */
export function GovernanceSectionView({ rows, isMobile, embedded = false }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  return (
    <div style={{marginTop: embedded ? 0 : 32}}>
      <div style={{fontFamily:mono,fontSize:10,color:T.brass,letterSpacing:3,fontWeight:600,marginBottom:6}}>
        GOVERNANCE
      </div>
      <div style={{fontFamily:display,fontSize:26,fontWeight:500,color:T.navy,letterSpacing:"-.5px",lineHeight:1.1,marginBottom:6}}>
        The platform&rsquo;s own staff.
      </div>
      <div style={{fontFamily:body,fontSize:12,fontStyle:"italic",color:T.mutedDeep,lineHeight:1.5,marginBottom:12}}>
        Read-only. These agents build and grade DeepBench itself; they are not for hire and never
        appear in a work order.
      </div>
      <div style={{height:2,background:T.brass}} />

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:16,marginTop:32}}>
        {rows.map(row => <GovernanceCard key={row.agent_id} row={row} />)}
      </div>
    </div>
  );
}

/**
 * AGT-80 — one hook for the Bench: the flag and the roster together, so the screen can add the
 * "Product Team" nav entry (with its count) without reading the flag slug or the view itself.
 *
 * @returns {{on: boolean, rows: Array<object>|null}}
 */
export function useProductTeam() {
  const on = useFeatureFlag(GOVERNANCE_FLAG);
  const rows = useGovernanceRoster();
  return { on, rows };
}

/**
 * The mounted section. With `rows` passed in (the Bench's Product Team filter, AGT-80) it renders
 * those rows embedded in the grid area; without them it reads the flag and the view itself, the
 * AGT-69 shape, kept for any other caller.
 */
export default function GovernanceSection({ rows: rowsIn = null, embedded = false }) {
  const on = useFeatureFlag(GOVERNANCE_FLAG);
  const rowsOwn = useGovernanceRoster();
  const isMobile = useIsMobile();
  const rows = rowsIn ?? rowsOwn;

  if (!on || !rows) return null;
  return <GovernanceSectionView rows={rows} isMobile={isMobile} embedded={embedded} />;
}
