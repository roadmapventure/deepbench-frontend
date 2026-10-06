// DeepBench v7.0.791 | ConnectAgentPopup.jsx | AGT-388 -- ToolTabs and FaqDrawers exported for Test AI; ConnectSteps renders the same bytes.
// DeepBench v7.0.789 | ConnectAgentPopup.jsx | AGT-385 -- the steps open on the tool heading and the
// three tabs with no tab picked; a picked tab shows its link first (Claude: the one-click add link and its note;
// ChatGPT / Grok: the open link, then the steps, shown open), then John's question drawers, all
// closed. The link is a text link now, not a button. Copy: docs/harvests/AGT-385.md, verbatim.
// Spec: docs/kickoffs/v7.0.789-AGT-385-connect-cards-faq.md. Round 2 (John, 2026-10-05; harvest
// "Round 2"): Claude's first line is a plain lead-in then the link; the turn-off text moves to its own
// drawer, second in order, on every tab; the talk sentence asks for the agent by name.
// DeepBench v7.0.788 | ConnectAgentPopup.jsx | AGT-384 -- the popup is retired; this file is now the
// steps component, ConnectSteps, rendered by the Connect to AI page (src/screens/ConnectAiScreen.jsx,
// /bench/connect). The overlay, the card, the dismiss button and its key handler are deleted; the
// title, the pills and the per-tool steps are unchanged. "Teaching your agent" and "Comparison test"
// are no longer rendered here: their copy stays in CONNECT_SHARED and the Test AI page
// (src/screens/TestAiScreen.jsx) renders it. The steps end with one line linking to Test AI. A team
// picked on the page arrives as { id, name, team: true }: its whole name fills the copy and no
// team block is read for it. The file keeps its name because two other tests pin this path; the
// rename to ConnectSteps.jsx is a follow-up. Spec: docs/kickoffs/v7.0.788-AGT-384-bench-home.md.
// DeepBench v7.0.787 | ConnectAgentPopup.jsx | AGT-348 slice 5 -- a third pill, Grok: an "Open Grok
// Connectors" button (grok.com/connectors) and John's step copy measured on grok.com 2026-10-05.
// Spec: docs/kickoffs/v7.0.787-AGT-348-grok-connect-tab.md.
// DeepBench v7.0.786 | ConnectAgentPopup.jsx | AGT-348 slice 4 -- the ChatGPT tab gets an "Open ChatGPT
// Plugins" button (chatgpt.com/plugins) above step 1, and John's approved (2026-10-05) step-1 copy matching
// today's Plugins screen. Spec: docs/kickoffs/v7.0.786-AGT-348-chatgpt-connect-steps.md.
// DeepBench v7.0.785 | ConnectAgentPopup.jsx | AGT-348 slice 3 -- no change here; the Add-to-Claude link
// now targets claude.ai/customize/connectors (src/lib/connectLinks.js). Spec: docs/kickoffs/v7.0.785-AGT-348-claude-link-customize.md.
// DeepBench v7.0.784 | ConnectAgentPopup.jsx | AGT-348 slice 2 -- the Add-to-Claude note now says
// "click Continue" (claude.ai's dialog button). Spec: docs/kickoffs/v7.0.784-AGT-348-claude-link-direct.md.
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
    step2: "In a Claude session, simply ask for your agent by name to answer a question.",
    step3Heading: null,
    step3: ["You can turn off your agent by the same path: + → Connectors → switch off."],
    // FEATURE: AGT-348 -- the one-click link, above step 1. Claude only: ChatGPT has no such link.
    // FEATURE: AGT-385 -- John's link and note lines; the fallback is the manual drawer's title.
    // Round 2: the lead-in is plain text; only the label after the colon is the link.
    quickAdd: {
      lead: "For Claude, simply click: ",
      label: "add <first name> to Claude",
      name: "<first name> from DeepBench",
      note: "2. Make sure the Connector window has the name and URL already filled in. Click Continue.",
      fallback: "I can't get the connection link to work",
    },
  },
  {
    id: "chatgpt", label: "ChatGPT", subtitle: "ChatGPT",
    step1Heading: "On chatgpt.com, on a computer (the ChatGPT phone app can't add these):",
    step1: [
      'Top right: click "Add" ▾ (the dropdown arrow) → "Create custom MCP server"',
      `Name: create the agent's name you will call in a session, i.e. "<first name> from DeepBench"`,
      { text: 'Connection → "Server URL": paste this URL', copy: true },
      'Authentication: change "OAuth" to "No Authentication"',
      'Tick "I understand and want to continue"',
      'Click "Create as a plugin"',
    ],
    step2: "In a ChatGPT session, simply ask for your agent by name to answer a question.",
    step3Heading: "You can turn your agent off by:",
    step3: [
      "Clicking on plugins on the left hand nav",
      'Under "Installed", click the Agent name you created',
      'Change "Connected" to "Disconnect"',
    ],
    // FEATURE: AGT-348 -- ChatGPT has no link to the create form or any pre-fill (measured by John,
    // 2026-10-05); this only opens Plugins.
    openLink: {
      href: "https://chatgpt.com/plugins",
      lead: "1. Click to open: ",
      label: "ChatGPT Plugins",
      followSteps: false,
      // The first-step line that used to open the list, now the body of the "connection link"
      // question drawer (titled by Claude's quickAdd.fallback -- one title, both tabs).
      fallbackLines: [
        'Open Plugins: the button above, or "Plugins" in the left sidebar',
        "Then follow the steps above.",
      ],
    },
  },
  {
    id: "grok", label: "Grok", subtitle: "Grok",
    step1Heading: "On grok.com:",
    step1: [
      'Top right: "New Connector", then click "Custom"',
      `Name: create the agent's name you will call in a session, i.e. "<first name> from DeepBench"`,
      { text: 'Server URL: paste this URL', copy: true },
      'Click "Add Connector"',
    ],
    step2: "In a Grok chat, simply ask for your agent by name to answer a question.",
    step3Heading: null,
    step3: ['You can turn your agent off from a Grok chat: "+" → "Connectors" → switch it off.'],
    // FEATURE: AGT-348 -- grok.com/connectors measured by John 2026-10-05; Grok's create form has no
    // address of its own, so there is nothing to pre-fill. This only opens the Connectors page.
    openLink: {
      href: "https://grok.com/connectors",
      lead: "1. Click to open: ",
      label: "Grok Connectors",
      followSteps: false,
      fallbackLines: [
        'Open Connectors: the button above, or in a Grok chat click "+" → "Connectors" → "Add connector"',
        "Then follow the steps above.",
      ],
    },
  },
];

export const CONNECT_SHARED = {
  title: "Select your AI tool",
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
  // FEATURE: AGT-385 -- the link-first layout and the question drawers (John, 2026-10-05).
  followSteps: "2. Follow these steps:",
  faqHeading: "FAQ",
  expectTitle: "What to expect after connection",
  disconnectTitle: "How to disconnect my agent",
  talkTitle: "How do I talk to my agent?",
  testTitle: "How do I test my agent?",
  expectBody: 'Once connected, your first <tool> session will ask your permission. Simply click "Always Allow".',
};

// FEATURE: AGT-384 -- exported: the Connect to AI and Test AI pages set their text in the same styles.
export const h2Style = { fontFamily: display, fontSize: 20, fontWeight: 700, color: T.navy, margin: "32px 0 8px" };
export const pStyle = { fontFamily: body, fontSize: 14, color: T.ink, lineHeight: 1.65, margin: "0 0 8px" };
export const olStyle = { fontFamily: body, fontSize: 14, color: T.ink, lineHeight: 1.65, paddingLeft: 22, margin: 0 };
export const liStyle = { marginBottom: 16 };

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

// FEATURE: AGT-348 -- the one-click / open link; opens the AI tool in a new tab.
// FEATURE: AGT-385 -- a text link (the page's link look), not a button.
function QuickAddLink({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      fontFamily: body, fontSize: 14, fontWeight: 600, color: T.brassDeep, textDecoration: "none",
    }}>{label}</a>
  );
}

// FEATURE: AGT-385 -- one question drawer: native, closed by default, no state.
function Drawer({ title, children }) {
  return (
    <details style={{ borderTop: `1px solid ${T.line}`, padding: "10px 0" }}>
      <summary style={{ ...pStyle, fontWeight: 600, cursor: "pointer", margin: 0 }}>{title}</summary>
      <div style={{ paddingTop: 8 }}>{children}</div>
    </details>
  );
}

// FEATURE: AGT-385 -- the three drawer bodies, in this order (agt-338 pins the text order).
// The step-1 list: the tool's heading and list, both copy boxes, the team blocks and the team link.
function Step1List({ tool, fill, address, base, teams }) {
  return (
    <>
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
    </>
  );
}

// How the user talks to the agent; a picked team adds the name-the-agent line.
function TalkBody({ tool, fill, agent }) {
  return (
    <>
      <p style={pStyle}>{fill(tool.step2)}</p>
      {agent.team && <p style={pStyle}>{CONNECT_SHARED.teamStep}</p>}
    </>
  );
}

// What happens once connected: the first-session sentence only (round 2).
function ExpectBody({ tool }) {
  return <p style={pStyle}>{CONNECT_SHARED.expectBody.split("<tool>").join(tool.label)}</p>;
}

// How to disconnect: the tool's own turn-off text (round 2: moved out of the expect drawer).
function DisconnectBody({ tool, fill }) {
  return (
    <>
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
    </>
  );
}

// FEATURE: AGT-388 -- the title and the tool pills, moved out of ConnectSteps so the Test AI page shows
// the same tabs. Stateless: the page that mounts it holds the picked tool.
// Round 2 (John, harvest "Round 2"): plainTitle draws the title as body text (Test AI only); without it
// the Connect page's h2 line renders unchanged.
export function ToolTabs({ toolId, onPick, plainTitle = false }) {
  return (
    <>
      {/* Title */}
      {plainTitle ? <p style={pStyle}>{CONNECT_SHARED.title}</p> : (
      <h2 style={h2Style}>{CONNECT_SHARED.title}</h2>
      )}

      {/* Tool pills */}
      <div style={{ display: "flex", gap: 6, marginTop: 14, borderBottom: `1px solid ${T.line}` }}>
        {CONNECT_TOOLS.map(t => {
          const isActive = t.id === toolId;
          return (
            <button key={t.id} onClick={() => onPick(t.id)} style={{
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
    </>
  );
}

// FEATURE: AGT-388 -- the three question drawers for one picked tool, moved out of ConnectSteps.
// The mount lines keep their Connect indentation so the move stays byte-identical.
export function FaqDrawers({ toolId, fill = s => s, agent = {} }) {
  const tool = CONNECT_TOOLS.find(t => t.id === toolId) || null;
  if (!tool) return null;
  return (
    <>
          <Drawer title={CONNECT_SHARED.expectTitle}><ExpectBody tool={tool} /></Drawer>
          <Drawer title={CONNECT_SHARED.disconnectTitle}><DisconnectBody tool={tool} fill={fill} /></Drawer>
          <Drawer title={CONNECT_SHARED.talkTitle}><TalkBody tool={tool} fill={fill} agent={agent} /></Drawer>
    </>
  );
}

// FEATURE: AGT-384 -- the steps for one picked agent (or one picked team), on the Connect to AI page.
// FEATURE: AGT-385 -- no tab is picked until the user clicks one; nothing shows below the tabs before.
export default function ConnectSteps({ agent, address }) {
  const [toolId, setToolId] = useState(null);
  const [teams, setTeams] = useState([]);

  // FEATURE: AGT-338 -- the teams this agent is on. No team, a slow or a failed read: no block.
  // FEATURE: AGT-384 -- a picked team has no teams of its own to offer.
  useEffect(() => {
    if (agent.team) return;
    let live = true;
    fetch(`/api/agent-configs?agent_id=${encodeURIComponent(agent.id)}&teams=1`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (live && d && Array.isArray(d.teams)) setTeams(d.teams); })
      .catch(() => {});
    return () => { live = false; };
  }, [agent.id]);
  const base = address.slice(0, address.lastIndexOf("/") + 1); // origin + /api/mcp/

  const first = agent.team ? agent.name : agent.name.split(" ")[0];
  const fill = s => s.split("<first name>").join(first);
  const tool = CONNECT_TOOLS.find(t => t.id === toolId) || null;

  return (
    <div>
      <ToolTabs toolId={toolId} onPick={setToolId} />

      {/* The picked tool's link first, then the drawers -- nothing until a tab is clicked */}
      {tool && (
        <div style={{ marginTop: 16 }}>
          {tool.quickAdd && (
            <>
              <p style={pStyle}>{tool.quickAdd.lead}<QuickAddLink href={claudeAddLink(fill(tool.quickAdd.name), address)} label={fill(tool.quickAdd.label)} /></p>
              <p style={{ ...pStyle, margin: "8px 0 16px" }}>{tool.quickAdd.note}</p>
            </>
          )}
          {tool.openLink && (
            <>
              {tool.openLink.lead
                ? <p style={pStyle}>{tool.openLink.lead}<QuickAddLink href={tool.openLink.href} label={tool.openLink.label} /></p>
                : <QuickAddLink href={tool.openLink.href} label={tool.openLink.label} />}
              {tool.openLink.followSteps === false
                ? <div style={{ height: 8 }} />
                : <p style={{ ...pStyle, margin: "8px 0 16px" }}>{CONNECT_SHARED.followSteps}</p>}
              <Step1List tool={tool} fill={fill} address={address} base={base} teams={teams} />
            </>
          )}

          {/* John's questions, every drawer closed; the manual steps last, Claude only */}
          <h2 style={h2Style}>{CONNECT_SHARED.faqHeading}</h2>
          <FaqDrawers toolId={toolId} fill={fill} agent={agent} />
          <Drawer title={CONNECT_SHARED.testTitle}>
            <p style={pStyle}><strong>{CONNECT_SHARED.comparisonHeading}</strong></p>
            <ol style={olStyle}>
              {CONNECT_SHARED.comparisonSteps.map((s, i) => <li key={i} style={liStyle}>{s}</li>)}
            </ol>
          </Drawer>
          {(tool.quickAdd || tool.openLink?.fallbackLines) && (
            <Drawer title={CONNECT_TOOLS[0].quickAdd.fallback}>
              {tool.quickAdd
                ? <Step1List tool={tool} fill={fill} address={address} base={base} teams={teams} />
                : tool.openLink.fallbackLines.map((l, i) => <p key={i} style={pStyle}>{l}</p>)}
            </Drawer>
          )}
        </div>
      )}
    </div>
  );
}
