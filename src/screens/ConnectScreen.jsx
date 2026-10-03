// DeepBench v7.0.732 | src/screens/ConnectScreen.jsx | AGT-165 — Connect Brittany to Claude
// The outside tester's onboarding page (/connect). Static copy plus one read of
// window.location.origin, so every deployment shows its own /api/mcp and no host string is typed.
// NO KEY IS RENDERED: Brittany is an active product-lane agent the MCP bundle admits without one,
// and the only MCP key DeepBench holds unlocks the governance lane (kickoff §2, Designer's call 1).
// Spec: docs/kickoffs/v7.0.732-AGT-165-connect-brittany-onboarding.md §4.

import { useState } from "react";
import { Link } from "react-router-dom";
import { T, display, body, mono } from "../tokens.js";
import { AppShell } from "../AppShell.jsx";

const MCP_URL = window.location.origin + "/api/mcp";

const PROMPT =
  'Use the Agent Knowledge Bundle tool with task_context.agent_id "brittany", then answer as Brittany: what do you know about my product?';

const h2Style = { fontFamily: display, fontSize: 20, fontWeight: 700, color: T.navy, margin: "32px 0 8px" };
const pStyle = { fontFamily: body, fontSize: 14, color: T.ink, lineHeight: 1.65, margin: "0 0 8px" };

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

export default function ConnectScreen() {
  return (
    <AppShell>
      <div style={{ flex: 1, overflowY: "auto", background: T.paperDeep }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
          <h1 style={{ fontFamily: display, fontSize: 30, fontWeight: 700, color: T.navy, margin: "0 0 24px" }}>
            Connect Brittany to Claude
          </h1>

          <ol style={{ fontFamily: body, fontSize: 14, color: T.ink, lineHeight: 1.65, paddingLeft: 22, margin: 0 }}>
            <li style={{ marginBottom: 16 }}>Open Claude's settings and go to Connectors.</li>
            <li style={{ marginBottom: 16 }}>
              Choose Add custom connector and paste this URL:
              <CopyBlock text={MCP_URL} />
            </li>
            <li style={{ marginBottom: 16 }}>
              Leave the key or authentication field blank — Brittany needs no key. The one key DeepBench holds unlocks its internal governance agents, so it is never shown on a page.
            </li>
            <li style={{ marginBottom: 16 }}>
              Start a new chat and paste this:
              <CopyBlock text={PROMPT} />
            </li>
          </ol>

          <h2 style={h2Style}>Teaching Brittany</h2>
          <p style={pStyle}>
            Brittany starts blank: no role prompt, no guardrails, no library access. She knows only what you give her.
          </p>
          <p style={pStyle}>
            <Link to="/bench/brittany/teach" style={{ color: T.brassDeep, fontWeight: 600 }}>Teach Brittany</Link>
          </p>

          <h2 style={h2Style}>Comparison test</h2>
          <p style={pStyle}>
            Ask the same question in a chat with the connector switched off. Brittany answers from what you taught her; the other answer is the model's own general knowledge. The difference is what your training bought.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
