// DeepBench v5.2.41 | WelcomeSplash.jsx | S-SPLASH-01 welcome splash modal
// FEATURE: SH-14 — Welcome splash modal

import { useState, useEffect, useRef } from "react";
import { T, display, mono } from "../tokens.js";

const STORAGE_KEY = "db_splash_dismissed";

export default function WelcomeSplash() {
  const [visible, setVisible] = useState(false);
  const countersRan = useRef(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible || countersRan.current) return;
    countersRan.current = true;
    const timer = setTimeout(() => {
      animateCounter("splash-tasks-active", 6, 800);
      animateCounter("splash-agents-active", 4, 600);
      animateCounter("splash-tasks-done", 41, 1400);
    }, 600);
    return () => clearTimeout(timer);
  }, [visible]);

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div style={panel}>
        {/* FEATURE: SH-14 — close button */}
        <button style={closeBtn} onClick={dismiss} aria-label="Close">×</button>

        {/* Header */}
        <div style={splashHeader}>
          <div style={logoWrap}>
            <div style={logoMark}>DB</div>
            <span style={logoName}>DeepBench</span>
          </div>
        </div>

        {/* Hero body */}
        <div style={heroBody}>
          <div style={eyebrow}>
            <span style={eyebrowLine} />
            AI Consulting Management Platform
          </div>

          <h1 style={headline}>
            Your consulting practice,<br />
            running at{" "}
            <em style={{ fontStyle: "italic", color: T.brass }}>full capacity</em>
            <br />
            around the clock.
          </h1>

          <p style={subhead}>
            DeepBench gives your practice an AI workforce — agents that carry your methodology,
            work your pipeline, and deliver client-ready analysis while you focus on the work
            only you can do.
          </p>

          <button style={ctaBtn} onClick={dismiss}>
            Start or see your Consulting Management practice in action
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 8, flexShrink: 0 }}>
              <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Pulse strip */}
          <div style={pulseStrip}>
            <div style={pulseLabel}>
              <div style={pulseDot} />
              Practice live
            </div>
            <StatBlock id="splash-tasks-active" desc="tasks in progress" />
            <div style={divider} />
            <StatBlock id="splash-agents-active" desc="agents working" />
            <div style={divider} />
            <StatBlock id="splash-tasks-done" desc="deliverables completed" />
            <div style={divider} />
            <div style={statBlock}>
              <span style={statNumber}>$372M</span>
              <span style={statDesc}>in spend analyzed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ id, desc }) {
  return (
    <div style={statBlock}>
      <span id={id} style={statNumber}>0</span>
      <span style={statDesc}>{desc}</span>
    </div>
  );
}

function animateCounter(id, target, duration) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      el.textContent = target;
      clearInterval(timer);
    } else {
      el.textContent = Math.round(start);
    }
  }, 16);
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

const pulseDot = {
  width: 6,
  height: 6,
  background: T.moss,
  borderRadius: "50%",
};

const statBlock = {
  display: "flex",
  alignItems: "baseline",
  gap: 6,
};

const statNumber = {
  fontFamily: display,
  fontSize: 26,
  fontWeight: 500,
  color: T.navy,
  letterSpacing: "-0.5px",
  minWidth: 44,
  display: "inline-block",
};

const statDesc = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  fontWeight: 400,
  color: T.muted,
};

const divider = {
  width: 1,
  height: 24,
  background: T.line,
};
