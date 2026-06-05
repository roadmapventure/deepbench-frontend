// DeepBench v5.1.0 | ui.jsx | Supplementary shared UI components
// src/components/ui.jsx — v5.0.0
// DeepBench v5 — Shared Treasury UI components

import { T, display, body, mono } from "../tokens.js";
import { fmtPct, skillLabel } from "../utils.js";

// ── Corner ornaments ──────────────────────────────────────────────────────────
export const Corners = ({ color = T.brass }) => (
  <>
    <svg width="10" height="10" style={{ position: "absolute", top: 4, left: 4, color }} viewBox="0 0 10 10" fill="currentColor"><path d="M0 0h4v1H1v3H0V0z" /></svg>
    <svg width="10" height="10" style={{ position: "absolute", top: 4, right: 4, color }} viewBox="0 0 10 10" fill="currentColor"><path d="M10 0H6v1h3v3h1V0z" /></svg>
    <svg width="10" height="10" style={{ position: "absolute", bottom: 4, left: 4, color }} viewBox="0 0 10 10" fill="currentColor"><path d="M0 10h4v-1H1V6H0v4z" /></svg>
    <svg width="10" height="10" style={{ position: "absolute", bottom: 4, right: 4, color }} viewBox="0 0 10 10" fill="currentColor"><path d="M10 10H6v-1h3V6h1v4z" /></svg>
  </>
);

// ── Card wrapper ──────────────────────────────────────────────────────────────
export const Card = ({ title, subtitle, children, span2, style }) => (
  <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "18px 20px", gridColumn: span2 ? "1/-1" : undefined, position: "relative", ...style }}>
    <Corners />
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: display, fontSize: 15, fontWeight: 600, color: T.navy }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontFamily: body }}>{subtitle}</div>}
    </div>
    {children}
  </div>
);

// ── Percentage bar ────────────────────────────────────────────────────────────
export const PctBar = ({ pct, color = T.brass, width = 80 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: width + 44 }}>
    <div style={{ height: 5, background: T.paperDeep, border: `1px solid ${T.lineSoft}`, width, overflow: "hidden", flexShrink: 0 }}>
      <div style={{ height: "100%", background: color, width: `${Math.min(100, pct)}%`, transition: "width 0.3s" }} />
    </div>
    <span style={{ color: T.brassDeep, fontSize: 11, minWidth: 38, fontWeight: 600, fontFamily: mono }}>{fmtPct(pct)}</span>
  </div>
);

// ── Skill bar ─────────────────────────────────────────────────────────────────
export const SkillBar = ({ skill, color = T.brass, size = 6 }) => (
  <div>
    <div style={{ height: size, background: T.paperDeep, border: `1px solid ${T.lineSoft}`, position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, right: `${100 - skill}%`, background: `linear-gradient(90deg,${color},${color === T.moss ? T.moss : T.brassDeep})` }} />
      {[30, 55, 75, 90].map(t => (
        <div key={t} style={{ position: "absolute", top: -2, bottom: -2, left: `${t}%`, width: 1, background: T.line }} />
      ))}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 8, color: T.muted, marginTop: 3 }}>
      <span>Trainee</span><span>Developing</span><span>Proficient</span><span>Expert</span><span>Principal</span>
    </div>
  </div>
);

// ── Toast notification ────────────────────────────────────────────────────────
export const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div style={{ position: "fixed", bottom: 22, right: 22, background: T.navy, border: `1px solid ${T.brass}`, padding: "10px 16px", fontSize: 12, color: T.card, fontFamily: mono, boxShadow: "0 8px 28px rgba(0,0,0,0.3)", zIndex: 9999, display: "flex", alignItems: "center", gap: 8, animation: "slideUp 0.2s ease" }}>
      <span>{toast.icon}</span><span>{toast.msg}</span>
    </div>
  );
};

// ── ✦ AI badge ────────────────────────────────────────────────────────────────
export const AIBadge = ({ style }) => (
  <span style={{ fontFamily: mono, fontSize: 8, background: `rgba(182,135,58,0.15)`, border: `1px solid ${T.brass}40`, padding: "1px 5px", color: T.brassDeep, letterSpacing: 0.5, fontWeight: 700, ...style }}>
    ✦ AI
  </span>
);

// ── Pulsing AI status dot ─────────────────────────────────────────────────────
export const AIStatusDot = ({ message }) => {
  if (!message) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: T.brass, animation: "pdot 1.2s ease-in-out infinite", flexShrink: 0 }} />
      <span style={{ fontFamily: mono, fontSize: 10, color: T.brass, fontStyle: "italic" }}>{message}</span>
    </div>
  );
};

// ── Thinking bounce dots ──────────────────────────────────────────────────────
export const ThinkingDots = () => (
  <div style={{ display: "flex", gap: 4 }}>
    {[0, 0.15, 0.3].map((d, i) => (
      <span key={i} style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: "#2d6fb5", animation: `dbounce 1.2s ${d}s infinite`, flexShrink: 0 }} />
    ))}
  </div>
);

// ── Spinning loader ───────────────────────────────────────────────────────────
export const Spinner = ({ size = 40, color = T.brass }) => (
  <>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{ width: size, height: size, border: `3px solid ${color}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
  </>
);

// ── Agent avatar (SVG, per-agent face) ───────────────────────────────────────
export const AgentAvatar = ({ who, size = 68, ring = true }) => {
  const cfg = {
    chloe:   { skin: "#e8c9a8", hair: "#6b3a1e", collar: "#f0e6d2", extra: "freckles", border: T.brass },
    mike:    { skin: "#d4a378", hair: "#3a3a3a", collar: "#24364f", extra: "glasses",  border: T.brass },
    bob:     { skin: "#e5c19a", hair: "#5a4a3a", collar: "#2a3a52", extra: "tie",      border: T.moss  },
    christy: { skin: "#dba77d", hair: "#2a1a1a", collar: T.brass,   extra: "bob",     border: T.brass },
    robyn:   { skin: "#c48b62", hair: "#8a3418", collar: "#5a2f3d", extra: "bun",     border: T.brass },
    brent:   { skin: "#d4a870", hair: "#2c3e2d", collar: "#1a2e1a", extra: "field",   border: T.moss  },
    pat:     { skin: "#e8c9a0", hair: "#8b4513", collar: "#c0c0c0", extra: "bob",     border: T.muted },
  };
  const c = cfg[who] || cfg.chloe;
  const uid = `av-${who}-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" style={{ display: "block", flexShrink: 0 }}>
      <defs><clipPath id={`clip-${uid}`}><circle cx="36" cy="36" r="34" /></clipPath></defs>
      <circle cx="36" cy="36" r="35" fill={T.card} stroke={ring ? c.border : "none"} strokeWidth={ring ? 1.5 : 0} />
      <g clipPath={`url(#clip-${uid})`}>
        <rect x="0" y="0" width="72" height="72" fill="#ede6d5" />
        <rect x="0" y="40" width="72" height="32" fill={T.card} />
        <path d="M 6 72 Q 12 54 36 54 Q 60 54 66 72 Z" fill={c.collar} />
        <rect x="31" y="48" width="10" height="8" rx="2" fill={c.skin} />
        {c.extra === "bun" && <circle cx="48" cy="22" r="6" fill={c.hair} />}
        <path d="M 16 34 Q 14 18 36 15 Q 58 18 56 34 Q 56 22 36 22 Q 16 22 16 34 Z" fill={c.hair} />
        <ellipse cx="36" cy="36" rx="14" ry="16" fill={c.skin} />
        {c.extra === "bob"     && <path d="M 20 30 Q 20 18 36 16 Q 54 18 52 34 L 52 28 Q 46 22 36 22 Q 26 22 22 30 Z" fill={c.hair} />}
        {c.extra === "freckles"&& <path d="M 22 26 Q 24 18 36 16 Q 48 18 50 30 Q 44 22 36 22 Q 28 22 22 28 Z" fill={c.hair} />}
        {c.extra === "tie"     && <path d="M 22 30 Q 22 20 36 18 Q 48 20 50 28 Q 44 22 36 22 Q 28 22 24 28 Q 22 29 22 30 Z" fill={c.hair} />}
        {c.extra === "glasses" && <path d="M 22 30 Q 24 20 36 18 Q 50 20 50 30 Q 44 24 36 24 Q 28 24 22 30 Z" fill={c.hair} />}
        <circle cx="30" cy="35" r="1.2" fill={T.navy} />
        <circle cx="42" cy="35" r="1.2" fill={T.navy} />
        {c.extra === "glasses" && <g fill="none" stroke={T.navy} strokeWidth="1.2"><circle cx="30" cy="35" r="4" /><circle cx="42" cy="35" r="4" /><line x1="34" y1="35" x2="38" y2="35" /></g>}
        {c.extra === "freckles"&& <g fill={c.hair} opacity="0.45"><circle cx="28" cy="38" r="0.5" /><circle cx="31" cy="39" r="0.5" /><circle cx="41" cy="39" r="0.5" /><circle cx="44" cy="38" r="0.5" /></g>}
        <ellipse cx="28" cy="40" rx="2" ry="1" fill="#c47a5a" opacity="0.22" />
        <ellipse cx="44" cy="40" rx="2" ry="1" fill="#c47a5a" opacity="0.22" />
        <path d="M 32 43 Q 36 46 40 43" fill="none" stroke={T.navy} strokeWidth="1.1" strokeLinecap="round" />
        {c.extra === "tie"   && <><path d="M 34 54 L 38 54 L 40 72 L 32 72 Z" fill={T.brass} /><path d="M 34 54 L 36 58 L 38 54 Z" fill={T.navy} /></>}
        {c.extra === "field" && <><rect x="28" y="52" width="16" height="20" rx="1" fill={T.moss} opacity="0.8" /><rect x="30" y="54" width="12" height="2.5" rx="0.5" fill="#fff" opacity="0.35" /><rect x="30" y="58" width="8" height="2" rx="0.5" fill="#fff" opacity="0.2" /></>}
        {["bob","bun","glasses","field"].includes(c.extra) && <path d="M 26 58 L 36 64 L 46 58" fill="none" stroke={c.border} strokeWidth="1.5" opacity="0.7" />}
      </g>
      {ring && <circle cx="36" cy="36" r="34.5" fill="none" stroke={c.border} strokeWidth="0.5" strokeDasharray="0.5 2" opacity="0.5" />}
    </svg>
  );
};

// ── Recharts shared components ────────────────────────────────────────────────
export const PctBarLabel = ({ x, y, width, height, value, total }) => {
  if (!total || width < 30) return null;
  return <text x={x + width + 7} y={y + height / 2 + 1} fill={T.brassDeep} fontSize={10} fontWeight={600} fontFamily={mono} dominantBaseline="middle">{(value / total * 100).toFixed(1)}%</text>;
};

export const Tip = ({ active, payload, label, total }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const pct = total && total > 0 ? (val / total * 100) : (payload[0].payload?._pct ?? null);
  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "10px 14px", color: T.ink, fontSize: 13, maxWidth: 300, fontFamily: body }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: T.navy, lineHeight: 1.3, fontFamily: display }}>{label || payload[0].name}</div>
      <div style={{ color: T.mutedDeep }}>${Math.round(Number(val)).toLocaleString("en-US")}</div>
      {pct != null && <div style={{ color: T.brassDeep, fontSize: 11, marginTop: 3, fontFamily: mono }}>📊 {fmtPct(pct)} of total spend</div>}
    </div>
  );
};

// ── AI suggestion badge ───────────────────────────────────────────────────────
export const AISugg = () => (
  <span style={{ fontFamily: mono, fontSize: 8, background: "rgba(155,110,243,0.12)", border: "1px solid rgba(155,110,243,0.3)", padding: "1px 5px", color: "#9b6ef3", letterSpacing: 0.3 }}>
    AI SUGGESTED
  </span>
);
