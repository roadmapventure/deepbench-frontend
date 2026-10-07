// DeepBench v7.0.800 | FutureViewTab.jsx | AGT-403 -- Future Controls: renamed and reordered groups, larger section titles, a faint line between sections; before that AGT-397 slice 1 --the Personnel File's Future View and its
// Current / Proposed layout switch. This file authors no card: it lays out, group by group, the cards
// PersonnelScreen.jsx hands it, plus an empty box for each field that has no home yet. No data read.
import { T, display, body, mono } from "../../tokens.js";
import { Corners } from "../../components/SharedUI.jsx";

export const LAYOUT_FLAG = "agt-397-layout-switch";
export const LAYOUT_KEY = "agt397-layout";

// AGT-403 — Future Controls order and names (the Training section is held back until John defines it)
export const FUTURE_GROUPS = [
  { id: "readiness", label: "Readiness and Levels", line: "Arrives when levels are graded from real runs" },
  { id: "billing", label: "Billing", line: "Arrives with live billing" },
  { id: "subscription", label: "Configurations", line: "Arrives with subscription management" },
  { id: "work", label: "Work Performed", line: "Arrives with Work Orders on private agents" },
  { id: "library", label: "Access", line: "Arrives with data-room access" },
];

// The switch shows only on a dev host with the flag on; Proposed only when it also was the stored choice.
export function resolveLayout({ hostOk, flagOn, stored }) {
  return {
    switchShown: !!(hostOk && flagOn),
    arrangement: hostOk && flagOn && stored === "proposed" ? "proposed" : "current",
  };
}

export function LayoutSwitch({ arrangement, onChange }) {
  return (
    <div style={{ paddingTop: 12, paddingBottom: 6 }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: T.muted, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, padding: "0 14px 6px" }}>
        LAYOUT
      </div>
      {[["current", "Current"], ["proposed", "Proposed"]].map(([id, label]) => {
        const active = arrangement === id;
        return (
          <button key={id} onClick={() => onChange(id)} style={{
            width: "100%", textAlign: "left", padding: "8px 14px",
            fontFamily: body, fontSize: 12,
            fontWeight: active ? 600 : 400,
            color: active ? T.navy : T.mutedDeep,
            background: active ? `${T.brass}14` : "transparent",
            border: "none",
            borderLeft: active ? `2px solid ${T.brass}` : "2px solid transparent",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Placeholder({ label, line }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "14px 16px", position: "relative" }}>
      <Corners />
      <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 10 }}>{label}</div>
      <div style={{ border: `1px dashed ${T.lineSoft}`, padding: "16px 12px", textAlign: "center" }}>
        <div style={{ fontFamily: body, fontSize: 11, color: T.muted, fontStyle: "italic" }}>{line}</div>
      </div>
    </div>
  );
}

export default function FutureViewTab({ groups, isMobile }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {FUTURE_GROUPS.map((g, gi) => {
        const given = (groups || []).find(x => x.id === g.id) || {};
        const items = given.items || [];
        const placeholders = given.placeholders || [];
        return (
          <div key={g.id} style={gi === 0 ? undefined : { borderTop: `1px solid ${T.lineSoft}`, marginTop: 24, paddingTop: 24 }}>
            <div style={{ fontFamily: display, fontSize: 19, fontWeight: 600, color: T.navy, marginBottom: 4 }}>{g.label}</div>
            <div style={{ fontFamily: body, fontSize: 11, fontStyle: "italic", color: T.mutedDeep, marginBottom: 10 }}>{g.line}</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18, alignItems: "start" }}>
              {items.map((node, i) => <div key={`i${i}`}>{node}</div>)}
              {placeholders.map(p => <Placeholder key={p.label} label={p.label} line={p.line} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
