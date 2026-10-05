// DeepBench v7.0.779 | ConnectAgentPopup.jsx | AGT-348 -- the Claude pill gets a pre-filled
// Add-to-Claude link (claude.ai's Add custom connector dialog) above the eight manual
// steps, which stay as the fallback; each team block gets its own. Spec:
// docs/kickoffs/v7.0.779-AGT-348-add-to-claude-link.md.
// DeepBench v7.0.773 | ConnectAgentPopup.jsx | AGT-338 slice 3 -- the popup offers the team address:
// under the agent's own copy box, one block per team the agent is on (read from /api/agent-configs),
// and one line under the ask sentence. Spec: docs/kickoffs/v7.0.773-AGT-338-connect-popup-team-address.md.
// DeepBench v7.0.757 | ConnectAgentPopup.jsx | AGT-334 — Connect <first name> to AI
// The Connect popup a private agent's Personnel file opens (the badge button, or ?connect=1).
// It names no agent: the first name and the address arrive as props (ARCHITECTURE §19e Rule #1),
// and the per-tool instructions are data (CONNECT_TOOLS) chosen by pill. No key is rendered.
// Spec: docs/kickoffs/v7.0.757-AGT-334-connect-popup.md; shell = AccessGateModal.jsx's overlay,
// card, ✕ and Escape; CopyBlock = ConnectScreen.jsx's (slice 2 deletes the original).

import { useEffect, useState } from "react";
import { T, display, body, mono } from "../tokens.js";
import { Corners } from "./SharedUI.jsx";
import { claudeAddLink } from "../lib/connectLinks.js";

// FEATURE: AGT-334 — John's copy (2026-10-03), verbatim. "<first name>" is filled at render.
// A step1 entry { text, copy: true } renders its text, then the CopyBlock holding `address`.
export const CONNECT_TOOLS = [
  {
    id: "claude", label: "Claude", subtitle: "Claude",
    step1Heading: "Once in a Claude session:",
    step1: [
      'Click the plus "+"',
      "Connectors",
      "Add Connector",
      'Choose a name you will recognize to activate your agent, i.e. "<first name> from DeepBench"',
      { text: "Paste this URL", copy: true },
      "No sign-in",
      "Keep other defaults",
      "Save",
    ],
    step2: 'In a Claude session, simply ask for your agent to answer a question. Your first time, click "Always Allow".',
    step3Heading: null,
    step3: ["You can turn off your agent by the same path: + → Connectors → switch off."],
    // FEATURE: AGT-348 -- the one-click link, above step 1. Claude only: ChatGPT has no such link.
    quickAdd: {
      label: "Add <first name> to Claude",
      name: "<first name> from DeepBench",
      note: "Opens Claude's Add connector window with the name and URL already filled in. Check them, then click Add.",
      fallback: "If the fields come up empty, or you'd rather set it up by hand:",
    },
  },
  {
    id: "chatgpt", label: "ChatGPT", subtitle: "ChatGPT",
    step1Heading: "Once in a ChatGPT session:",
    step1: [
      "On the very left hand nav of the app, click the plugins icon.",
      'On the top right "Add" button, click the drop down arrow.',
      'Click "Create MCP app"',
      'Choose a name you will recognize to activate your agent, i.e. "<first name> from DeepBench"',
      { text: "Paste URL as Connection", copy: true },
      'Change Authentication to "No Authentication"',
      'Click "Create"',
    ],
    step2: 'In a ChatGPT session, simply ask for your agent to answer a question. Your first time, click "Always Allow".',
    step3Heading: "You can turn your agent off by:",
    step3: [
      "Clicking on plugins on the left hand nav",
      'Under "Installed", click the Agent name you created',
      'Change "Connected" to "Disconnect"',
    ],
  },
];

export const CONNECT_SHARED = {
  title: "Connect <first name> to your favorite AI tool",
  teachingHeading: "Teaching your agent",
  teachingBody: "Your agent starts blank: no role prompt, no guardrails, no library access. They know only what you give them. Go back to their personnel page to update their skillsets.",
  comparisonHeading: "Comparison test",
  comparisonSteps: [
    "Ask a question that only your agent knows. Your agent answers from what you taught them.",
    "Then turn off your agent's connector, start a new session and ask the session (the AI tool's generic model) the same question. The answer is the model's own general knowledge.",
    "The difference is what your training brought.",
  ],
  teamLead: "Or connect your whole team at once.",
  teamBody: "Paste this URL instead and every agent in <team name> is available, including agents you add later.",
  teamStep: "With a team connection, name the agent you want in your question.",
};

const h2Style = { fontFamily: display, fontSize: 20, fontWeight: 700, color: T.navy, margin: "32px 0 8px" };
const pStyle = { fontFamily: body, fontSize: 14, color: T.ink, lineHeight: 1.65, margin: "0 0 8px" };
const olStyle = { fontFamily: body, fontSize: 14, color: T.ink, lineHeight: 1.65, paddingLeft: 22, margin: 0 };
const liStyle = { marginBottom: 16 };

function CopyBlock({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1500); },
      () => {},
    );
  };
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
      <code style={{
        flex: "1 1 280px", fontFamily: mono, fontSize: 13, color: T.navy, background: T.card,
        border: `1px solid ${T.line}`, padding: "10px 12px", overflowWrap: "anywhere", lineHeight: 1.5,
      }}>{text}</code>
      <button onClick={copy} style={{
        fontFamily: body, fontSize: 13, fontWeight: 600, color: T.navy, background: T.brassLight,
        border: `1px solid ${T.brass}`, padding: "8px 16px", cursor: "pointer",
      }}>{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}

// FEATURE: AGT-348 -- a link styled as CopyBlock's button; opens claude.ai in a new tab.
function QuickAddLink({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      display: "inline-block", fontFamily: body, fontSize: 14, fontWeight: 600, color: T.navy,
      background: T.brassLight, border: `1px solid ${T.brass}`, padding: "10px 18px", textDecoration: "none",
    }}>{label}</a>
  );
}

export default function ConnectAgentPopup({ agent, address, onClose }) {
  const [toolId, setToolId] = useState(CONNECT_TOOLS[0].id);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // FEATURE: AGT-338 -- the teams this agent is on. No team, a slow or a failed read: no block.
  useEffect(() => {
    let live = true;
    fetch(`/api/agent-configs?agent_id=${encodeURIComponent(agent.id)}&teams=1`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (live && d && Array.isArray(d.teams)) setTeams(d.teams); })
      .catch(() => {});
    return () => { live = false; };
  }, [agent.id]);
  const base = address.slice(0, address.lastIndexOf("/") + 1); // origin + /api/mcp/

  const fill = s => s.split("<first name>").join(agent.name.split(" ")[0]);
  const tool = CONNECT_TOOLS.find(t => t.id === toolId) || CONNECT_TOOLS[0];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        background: `${T.navyDeep}73`,
        animation: "hModalFadeIn 0.18s ease",
      }}
    >
      <div
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          animation: "hModalPopIn 0.22s ease",
          width: "calc(100% - 32px)", maxWidth: 640,
          maxHeight: "calc(100% - 32px)", overflowY: "auto",
          background: T.paperDeep, border: `1px solid ${T.line}`,
          padding: "28px 32px",
        }}
      >
        <Corners />
        {/* Dismiss — ✕ */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 10, right: 12,
            background: "transparent", border: "none", cursor: "pointer",
            fontFamily: body, fontSize: 18, lineHeight: 1, color: T.muted, padding: 4,
          }}
        >
          ✕
        </button>

        {/* Title */}
        <div style={{ fontFamily: display, fontSize: 21, fontWeight: 600, color: T.navy, lineHeight: 1.25 }}>
          {fill(CONNECT_SHARED.title)}
        </div>

        {/* Tool pills */}
        <div style={{ display: "flex", gap: 6, marginTop: 14, borderBottom: `1px solid ${T.line}` }}>
          {CONNECT_TOOLS.map(t => {
            const isActive = t.id === tool.id;
            return (
              <button key={t.id} onClick={() => setToolId(t.id)} style={{
                padding: "8px 14px",
                fontFamily: body, fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? T.navy : T.mutedDeep,
                background: isActive ? `${T.brass}24` : "transparent",
                border: "none",
                borderBottom: isActive ? `2px solid ${T.brass}` : "2px solid transparent",
                cursor: "pointer",
              }}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* The selected tool's steps — only these swap with the pill */}
        <h2 style={h2Style}>{tool.subtitle}</h2>
        {tool.quickAdd && (
          <>
            <QuickAddLink href={claudeAddLink(fill(tool.quickAdd.name), address)} label={fill(tool.quickAdd.label)} />
            <p style={{ ...pStyle, margin: "8px 0 16px" }}>{tool.quickAdd.note}</p>
            <p style={pStyle}>{tool.quickAdd.fallback}</p>
          </>
        )}
        <p style={pStyle}>{tool.step1Heading}</p>
        <ol style={olStyle}>
          {tool.step1.map((s, i) => (
            typeof s === "string"
              ? <li key={i} style={liStyle}>{fill(s)}</li>
              : (
                <li key={i} style={liStyle}>
                  {fill(s.text)}
                  {s.copy && <CopyBlock text={address} />}
                  {s.copy && teams.map(t => (
                    <div key={t.address}>
                      <p style={{ ...pStyle, margin: "16px 0 0" }}>
                        <strong>{CONNECT_SHARED.teamLead}</strong>{" "}{CONNECT_SHARED.teamBody.split("<team name>").join(t.name)}
                      </p>
                      <CopyBlock text={base + t.address} />
                      {tool.quickAdd && <div style={{ marginTop: 8 }}><QuickAddLink href={claudeAddLink(`${t.name} from DeepBench`, base + t.address)} label={`Add ${t.name} to Claude`} /></div>}
                    </div>
                  ))}
                </li>
              )
          ))}
        </ol>
        <p style={pStyle}>{fill(tool.step2)}</p>
        <p style={pStyle}>{CONNECT_SHARED.teamStep}</p>
        {tool.step3Heading === null ? (
          <p style={pStyle}>{fill(tool.step3[0])}</p>
        ) : (
          <>
            <p style={pStyle}>{tool.step3Heading}</p>
            <ol style={olStyle}>
              {tool.step3.map((s, i) => <li key={i} style={liStyle}>{fill(s)}</li>)}
            </ol>
          </>
        )}

        {/* Shared */}
        <h2 style={h2Style}>{CONNECT_SHARED.teachingHeading}</h2>
        <p style={pStyle}>{CONNECT_SHARED.teachingBody}</p>

        <h2 style={h2Style}>{CONNECT_SHARED.comparisonHeading}</h2>
        <ol style={olStyle}>
          {CONNECT_SHARED.comparisonSteps.map((s, i) => <li key={i} style={liStyle}>{s}</li>)}
        </ol>
      </div>
    </div>
  );
}
