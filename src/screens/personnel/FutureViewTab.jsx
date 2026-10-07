// DeepBench v7.0.816 | src/screens/personnel/FutureViewTab.jsx | AGT-416 -- AccessLevelsCard: the sample Access levels card (where it can be used, which model, what an AI client receives, who can teach, always protected).
// DeepBench v7.0.806 | FutureViewTab.jsx | AGT-410 -- a Training group between Configurations and Work Performed; before that AGT-405 --one column, SampleTag and sample rows on placeholder cards; before that AGT-403 --Future Controls: renamed and reordered groups, larger section titles, a faint line between sections; before that AGT-397 slice 1 --the Personnel File's Future View and its
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
  { id: "training", label: "Training", line: "Arrives with training controls" },
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

// AGT-405 — SAMPLE tag: sample figures on a card that has no data yet are always labeled as such
export function SampleTag() {
  return <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: .5, padding: "1px 6px", background: "rgba(18,36,60,.07)", color: T.mutedDeep, border: `1px solid ${T.lineSoft}`, marginLeft: 8, verticalAlign: "middle" }}>SAMPLE</span>;
}

function Placeholder({ label, line, rows }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "14px 16px", position: "relative" }}>
      <Corners />
      <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 10 }}>{label}{rows && <SampleTag />}</div>
      {rows ? (
        <>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "flex-start", gap: 12, padding: "4px 0", borderBottom: `1px solid ${T.lineSoft}`, fontSize: 11 }}>
              <span style={{ color: T.mutedDeep, minWidth: 110, flexShrink: 0 }}>{k}</span>
              <span style={{ fontFamily: mono, fontSize: 10.5, color: T.ink }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 7, fontFamily: body, fontSize: 10, color: T.muted, fontStyle: "italic" }}>{line}</div>
        </>
      ) : (
        <div style={{ border: `1px dashed ${T.lineSoft}`, padding: "16px 12px", textAlign: "center" }}>
          <div style={{ fontFamily: body, fontSize: 11, color: T.muted, fontStyle: "italic" }}>{line}</div>
        </div>
      )}
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18, alignItems: "start" }}>
              {items.map((node, i) => <div key={`i${i}`}>{node}</div>)}
              {placeholders.map(p => <Placeholder key={p.label} label={p.label} line={p.line} rows={p.rows} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── AGT-416 — the access levels an owner will be able to assign once subscriptions are on. A SAMPLE card: every
// option is listed with what it means, one choice per group is marked as the sample selection, and nothing here is
// saved or enforced yet. The wording comes from John's register rulings (AI Client's Instruction answer mode and lead
// text, Who may teach from an AI client, hide the Library from AI clients, admin gate) and his list on 2026-10-07.
export const ACCESS_LEVEL_GROUPS = [
  { title: "Where it can be used", chosen: "selected", options: [
    ["deepbench", "Only in DeepBench", "Works inside DeepBench. No AI client can connect to it."],
    ["selected", "Selected AI clients", "Only the AI clients you name can connect to it."],
    ["all", "Available to all AI clients", "Any AI client holding the connection can use it."],
  ] },
  { title: "Which model does the work", chosen: "deepbench-model", options: [
    ["deepbench-model", "DeepBench's model", "DeepBench runs the model and meters the use."],
    ["own", "Your own LLM", "The work runs on your own model account, so your data and your prompts stay on your side."],
  ] },
  { title: "What an AI client receives", chosen: "sections", options: [
    ["full", "Full scaffold", "The whole prompt DeepBench built. The AI client reasons with it."],
    ["sections", "Selected scaffold sections", "You choose which sections ship (for example Role and Guardrails) and hold back the rest."],
    ["answer", "Answer only", "DeepBench's own model does the reasoning and the AI client gets just the answer. The scaffold never leaves DeepBench."],
  ] },
  { title: "Who can teach it from an AI client", chosen: "owner", options: [
    ["nobody", "Nobody", "Teaching happens only inside DeepBench."],
    ["owner", "Owner only", "Only the owner's AI clients can teach it."],
    ["named", "Selected AI clients", "The owner picks which AI clients may teach it."],
    ["anyone", "Anyone holding the connection", "How it works today, because nobody signs in over the connection yet."],
  ] },
];
export const ACCESS_ALWAYS_PROTECTED = [
  ["The Library stays inside DeepBench", "Catalog, records, tier and data rooms are never handed to an AI client."],
  ["Skill text can be held back", "Choosing selected sections or answer only keeps your Skill wording from leaving DeepBench."],
  ["An admin grant comes first", "A DeepBench admin decides whether an owner may choose each option above."],
  ["Private means private", "A private agent is hidden from other users. Today it is still visible on the admin address."],
];

export function AccessLevelsCard() {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "14px 16px", position: "relative" }}>
      <Corners />
      <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 4 }}>Access levels<SampleTag /></div>
      <div style={{ fontFamily: body, fontSize: 10.5, color: T.muted, fontStyle: "italic", marginBottom: 12 }}>What an owner will be able to assign once subscriptions are on. The marked choice in each group is a sample; nothing here is saved or enforced yet.</div>
      {ACCESS_LEVEL_GROUPS.map(g => (
        <div key={g.title} style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: mono, fontSize: 8.5, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, borderBottom: `1px solid ${T.line}`, paddingBottom: 3, marginBottom: 4 }}>{g.title}</div>
          {g.options.map(([slug, label, line]) => {
            const on = slug === g.chosen;
            return (
              <div key={slug} style={{ display: "flex", gap: 10, padding: "5px 6px", background: on ? `${T.moss}14` : "transparent", borderLeft: `3px solid ${on ? T.moss : "transparent"}` }}>
                <span style={{ fontFamily: mono, fontSize: 10, color: on ? T.moss : T.muted, width: 10, flexShrink: 0 }}>{on ? "●" : "○"}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontFamily: body, fontSize: 11.5, fontWeight: on ? 700 : 600, color: on ? T.moss : T.ink }}>{label}</span>
                  <span style={{ display: "block", fontFamily: body, fontSize: 10.5, color: T.mutedDeep, lineHeight: 1.4 }}>{line}</span>
                </span>
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ fontFamily: mono, fontSize: 8.5, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, borderBottom: `1px solid ${T.line}`, paddingBottom: 3, marginBottom: 4 }}>Always protected</div>
      {ACCESS_ALWAYS_PROTECTED.map(([label, line]) => (
        <div key={label} style={{ padding: "4px 6px" }}>
          <span style={{ fontFamily: body, fontSize: 11.5, fontWeight: 600, color: T.ink }}>{label}</span>
          <span style={{ display: "block", fontFamily: body, fontSize: 10.5, color: T.mutedDeep, lineHeight: 1.4 }}>{line}</span>
        </div>
      ))}
    </div>
  );
}
