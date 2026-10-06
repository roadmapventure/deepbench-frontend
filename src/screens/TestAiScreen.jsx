// DeepBench v7.0.791 | TestAiScreen.jsx | AGT-388 -- FAQ under Comparison test: pick a tool, three closed drawers from the Connect page.
// DeepBench v7.0.788 | TestAiScreen.jsx | AGT-384 — the Test AI page (/bench/test-ai)
// Informational only (John, 2026-10-05): how to teach an agent and how to see what the training
// adds. It carries "Teaching your agent" and "Comparison test", wording unchanged, moved here from
// the Connect popup; the copy stays where it always was (CONNECT_SHARED) and this page renders it.
// No agent picker, no per-tool steps, no model call.
// Spec: docs/kickoffs/v7.0.788-AGT-384-bench-home.md.

import { useState } from "react";
import { T, display } from "../tokens.js";
import { AppShell } from "../AppShell.jsx";
import { BenchNav, BenchNavChips } from "../components/BenchNav.jsx";
import { CONNECT_SHARED, h2Style, pStyle, olStyle, liStyle } from "../components/ConnectAgentPopup.jsx";
import { ToolTabs, FaqDrawers } from "../components/ConnectAgentPopup.jsx";

export default function TestAiScreen() {
  const [toolId, setToolId] = useState(null);
  return (
    <AppShell>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <BenchNav current="Test AI"/>
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px 48px",background:T.paperDeep}}>
          <BenchNavChips current="Test AI"/>
          <div style={{maxWidth:720}}>
            {/* Masthead */}
            <div style={{fontFamily:display,fontSize:30,fontWeight:500,color:T.navy,letterSpacing:"-.5px",lineHeight:1,paddingBottom:14}}>Test AI</div>
            <div style={{height:2,background:T.brass,marginBottom:20}}/>

            <h2 style={h2Style}>Talking to your agent</h2>
            <p style={pStyle}>In your AI session, simply call your agent by name, or ask the session to send a message or ask your agent a question.</p>

            <h2 style={h2Style}>{CONNECT_SHARED.teachingHeading}</h2>
            <p style={pStyle}>{CONNECT_SHARED.teachingBody}</p>

            <h2 style={h2Style}>{CONNECT_SHARED.comparisonHeading}</h2>
            <ol style={olStyle}>
              {CONNECT_SHARED.comparisonSteps.map((s, i) => <li key={i} style={liStyle}>{s}</li>)}
            </ol>

            <h2 style={h2Style}>{CONNECT_SHARED.faqHeading}</h2>
            <ToolTabs toolId={toolId} onPick={setToolId} />
            {toolId && <div style={{ marginTop: 16 }}><FaqDrawers toolId={toolId} /></div>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
