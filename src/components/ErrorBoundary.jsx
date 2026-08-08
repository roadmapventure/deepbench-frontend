// DeepBench v6.3.137 | ErrorBoundary.jsx | CHI-66 — the platform's only React error boundary
// FEATURE: CHI-66 — before this, src/ had zero boundaries, so any render error unmounted the whole
// tree and destroyed MarketIntelligenceScreen's unpersisted `messages` state (the entire
// conversation). Two variants: "page" at the app root, where there is nothing left to preserve and
// a reload is the only recovery; "inline" inside Drawer, where the surrounding screen stays mounted
// and the conversation survives.
//
// The fallback copy is platform-about-platform — it reports that the platform broke and never
// describes, labels, or stands in for agent content. ARCHITECTURE.md §19j ("The screen holds no
// content policy") governs the drawer case specifically: do not add wording about what the agent
// found, did not find, or should have returned.
import { Component } from "react";
import { T, body } from "../tokens.js";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // console only, deliberately. ai_activity_log holds AI call facts (ARCHITECTURE.md §19i); a
    // React render crash is not an AI call and must not be written there.
    console.error("[ErrorBoundary]", this.props.variant, error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.variant === "page") {
      return (
        <div style={{fontFamily:body,fontSize:13,color:T.ink,padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"flex-start",gap:12}}>
          <div>Something went wrong — reload the page.</div>
          <button onClick={() => window.location.reload()}
            style={{fontFamily:body,fontSize:12,color:T.ink,background:T.card,border:`1px solid ${T.line}`,padding:"7px 14px",cursor:"pointer"}}>
            Reload
          </button>
        </div>
      );
    }

    return (
      <div style={{fontFamily:body,fontSize:11.5,lineHeight:1.5,color:T.muted}}>
        Something went wrong displaying this — ask your latest question in chat again.
      </div>
    );
  }
}
