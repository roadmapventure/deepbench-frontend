// DeepBench v6.2.11 | WelcomeSplash.jsx | S-SPLASH-03 — mobile no-scroll: panelMobile.overflowY
// locked to "hidden", full mobile-specific typography/spacing scale added for hero body content.
// Zero copy changed, panel size/interactions unchanged. FEATURE: SH-22 — see STYLE-GUIDE.md §23
// DeepBench v6.2.0 | WelcomeSplash.jsx | S-MOBILE-NAV-01 — rename (MI-46): capability strip
// "Market Intelligence" → "Channel Sales Intelligence", display-text only, see STYLE-GUIDE.md §25.
// DeepBench v6.1.46 | WelcomeSplash.jsx | S-MI-45 — mobile sizing: panel branches on useIsMobile()
// to a 75vw × 75vh panelMobile (vs. desktop's 80vw/max960/88vh), same overlay/dismiss mechanic and
// copy, zero behavior change. FEATURE: MI-45 — see STYLE-GUIDE.md §23
// DeepBench v5.2.41 | WelcomeSplash.jsx | S-SPLASH-01 welcome splash modal
// FEATURE: SH-14 — Welcome splash modal
// DeepBench v6.1.12 | WelcomeSplash.jsx | S-SPLASH-02/SH-18 — stat counters replaced with static capability strip

import { useState, useEffect } from "react";
import { T, display, mono } from "../tokens.js";
import { useIsMobile } from "../hooks/useIsMobile.js"; // FEATURE: MI-45

const STORAGE_KEY = "db_splash_dismissed";

export default function WelcomeSplash() {
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile(); // FEATURE: MI-45

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
  }, []);

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  // FEATURE: SH-22 — mobile uses a fully separate, smaller style scale so the whole
  // panel fits within the fixed 75vh with zero scroll; panel size/behavior unchanged.
  const s = isMobile ? {
    panel: panelMobile, header: splashHeaderMobile, logoMark: logoMarkMobile, logoName: logoNameMobile,
    body: heroBodyMobile, eyebrow: eyebrowMobile, eyebrowLine: eyebrowLineMobile, headline: headlineMobile,
    subhead: subheadMobile, cta: ctaBtnMobile, pulse: pulseStripMobile, pulseLabel: pulseLabelMobile,
    capItem: capabilityItemMobile, divider: dividerMobile, close: closeBtnMobile,
  } : {
    panel, header: splashHeader, logoMark, logoName, body: heroBody, eyebrow, eyebrowLine, headline,
    subhead, cta: ctaBtn, pulse: pulseStrip, pulseLabel, capItem: capabilityItem, divider, close: closeBtn,
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div style={s.panel}>
        {/* FEATURE: SH-14 — close button */}
        <button style={s.close} onClick={dismiss} aria-label="Close">×</button>

        {/* Header */}
        <div style={s.header}>
          <div style={logoWrap}>
            <div style={s.logoMark}>DB</div>
            <span style={s.logoName}>DeepBench</span>
          </div>
        </div>

        {/* Hero body */}
        <div style={s.body}>
          <div style={s.eyebrow}>
            <span style={s.eyebrowLine} />
            AI Consulting Management Platform
          </div>

          <h1 style={s.headline}>
            Your consulting practice,<br />
            running at{" "}
            <em style={{ fontStyle: "italic", color: T.brass }}>full capacity</em>
            <br />
            around the clock.
          </h1>

          <p style={s.subhead}>
            DeepBench gives your practice an AI workforce — agents that carry your methodology,
            work your pipeline, and deliver client-ready analysis while you focus on the work
            only you can do.
          </p>

          <button style={s.cta} onClick={dismiss}>
            Start or see your Consulting Management practice in action
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 8, flexShrink: 0 }}>
              <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Pulse strip */}
          <div style={s.pulse}>
            <div style={s.pulseLabel}>Automate</div>
            <div style={capabilityRow}>
              <span style={s.capItem}>Channel Sales Intelligence</span>
              <div style={s.divider} />
              <span style={s.capItem}>Data Analysis</span>
              <div style={s.divider} />
              <span style={s.capItem}>Project Management</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const overlay = {
  position: "fixed",
  inset: 0,
  zIndex: 9000,
  background: "rgba(18,36,60,0.58)",
  backdropFilter: "blur(3px)",
  WebkitBackdropFilter: "blur(3px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const panel = {
  position: "relative",
  width: "80vw",
  maxWidth: 960,
  maxHeight: "88vh",
  overflowY: "auto",
  background: "#f8f2e2",
  border: `1.5px solid ${T.brass}`,
  borderRadius: 6,
  boxShadow: "0 24px 64px rgba(18,36,60,0.38)",
};

// FEATURE: MI-45 — mobile panel sizing (STYLE-GUIDE.md §23): 75vw × 75vh, no maxWidth cap
// (unnecessary at mobile widths — 75vw of a phone viewport is always well under 960px).
// FEATURE: SH-22 — overflowY locked to "hidden" (overrides the inherited "auto" from ...panel);
// structural no-scroll guarantee, not just a sizing target. See STYLE-GUIDE.md §23 amendment.
const panelMobile = {
  ...panel,
  width: "75vw",
  maxWidth: "none",
  height: "75vh",
  maxHeight: "75vh",
  overflowY: "hidden",
};

const closeBtn = {
  position: "absolute",
  top: 16,
  right: 20,
  background: "none",
  border: "none",
  fontSize: 22,
  lineHeight: 1,
  color: T.muted,
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: 3,
  zIndex: 1,
};

const splashHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "18px 32px",
  borderBottom: `1px solid ${T.line}`,
  background: "rgba(221,213,190,0.6)",
};

const logoWrap = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const logoMark = {
  width: 30,
  height: 30,
  background: T.navy,
  borderRadius: 5,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: T.brassLight,
  fontFamily: display,
  fontSize: 13,
  fontWeight: 700,
};

const logoName = {
  fontFamily: display,
  fontSize: 17,
  fontWeight: 500,
  color: T.navy,
  letterSpacing: "-0.3px",
};

const heroBody = {
  padding: "48px 56px 52px",
};

const eyebrow = {
  fontFamily: mono,
  fontSize: 11,
  fontWeight: 500,
  color: T.brass,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  marginBottom: 24,
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const eyebrowLine = {
  display: "inline-block",
  width: 22,
  height: 1,
  background: T.brass,
};

const headline = {
  fontFamily: display,
  fontSize: "clamp(36px, 4vw, 58px)",
  fontWeight: 300,
  lineHeight: 1.1,
  letterSpacing: "-1px",
  color: T.navy,
  marginBottom: 24,
};

const subhead = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 16,
  fontWeight: 300,
  lineHeight: 1.7,
  color: T.muted,
  maxWidth: 500,
  marginBottom: 36,
};

const ctaBtn = {
  display: "inline-flex",
  alignItems: "center",
  background: T.navy,
  color: T.brassLight,
  fontFamily: "'Inter', sans-serif",
  fontSize: 15,
  fontWeight: 600,
  padding: "15px 28px",
  borderRadius: 4,
  border: "none",
  cursor: "pointer",
  letterSpacing: "-0.1px",
  marginBottom: 36,
};

const pulseStrip = {
  borderTop: `1px solid ${T.line}`,
  paddingTop: 20,
  display: "flex",
  alignItems: "center",
  gap: 28,
  flexWrap: "wrap",
};

const pulseLabel = {
  fontFamily: mono,
  fontSize: 10,
  color: T.muted,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const capabilityRow = {
  display: "flex",
  alignItems: "center",
  gap: 20,
  flexWrap: "wrap",
};

const capabilityItem = {
  fontFamily: display,
  fontSize: 16,
  fontWeight: 500,
  color: T.navy,
  letterSpacing: "-0.2px",
};

const divider = {
  width: 1,
  height: 24,
  background: T.line,
};

// FEATURE: SH-22 — mobile-only typography/spacing scale (STYLE-GUIDE.md §23 amendment).
// Roughly 40-60% of each desktop style's padding/font-size/margin values so the full hero
// body fits within panelMobile's fixed 75vh with zero internal scroll. Zero copy changed —
// style values only. Desktop objects above are untouched.
const splashHeaderMobile   = { ...splashHeader, padding: "10px 14px" };
const logoMarkMobile       = { ...logoMark, width: 22, height: 22, fontSize: 10 };
const logoNameMobile       = { ...logoName, fontSize: 13 };
const heroBodyMobile       = { padding: "18px 20px 20px" };
const eyebrowMobile        = { ...eyebrow, fontSize: 8.5, marginBottom: 10, gap: 6 };
const eyebrowLineMobile    = { ...eyebrowLine, width: 14 };
const headlineMobile       = { ...headline, fontSize: "clamp(20px, 6vw, 26px)", lineHeight: 1.15, letterSpacing: "-0.3px", marginBottom: 10 };
const subheadMobile        = { ...subhead, fontSize: 11.5, lineHeight: 1.5, maxWidth: "100%", marginBottom: 14 };
const ctaBtnMobile         = { ...ctaBtn, fontSize: 12, padding: "10px 16px", marginBottom: 14 };
const pulseStripMobile     = { ...pulseStrip, paddingTop: 10, gap: 14 };
const pulseLabelMobile     = { ...pulseLabel, fontSize: 8 };
const capabilityItemMobile = { ...capabilityItem, fontSize: 10.5 };
const dividerMobile        = { ...divider, height: 16 };
const closeBtnMobile       = { ...closeBtn, top: 8, right: 10, fontSize: 18, padding: "2px 6px" };
