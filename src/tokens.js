// DeepBench v5.1.0 | tokens.js | Treasury design system — colors, fonts, formatters
// FEATURE: SH-01 — Treasury design tokens
// src/tokens.js — v5.0.0
// DeepBench v5 — Treasury Design System Constants
// Single source of truth for all colors, fonts, and shared UI patterns.

// ── Color Palette ─────────────────────────────────────────────────────────────
export const T = {
  paper:      "#ebe5d5",
  paperDeep:  "#ddd5be",
  card:       "#f8f2e2",
  cardAlt:    "#f2ead4",
  navy:       "#12243c",
  navyDeep:   "#0b1929",
  navyMid:    "#1a2e4a",
  ink:        "#28221a",
  muted:      "#786d52",
  mutedDeep:  "#58503a",
  line:       "#c8bb9a",
  lineSoft:   "#d8cbac",
  brass:      "#b6873a",
  brassDeep:  "#886224",
  brassLight: "#e4c786",
  moss:       "#5a7538",
  mossLight:  "#a6bc82",
  flag:       "#a83319",
};

// ── Typography ────────────────────────────────────────────────────────────────
export const display = '"Fraunces", Georgia, serif';
export const body    = '"Inter", -apple-system, system-ui, sans-serif';
export const mono    = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace';

export const FONT_URL = "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap";

// ── Global CSS ────────────────────────────────────────────────────────────────
export const GLOBAL_CSS = `
@import url('${FONT_URL}');
@keyframes borderPulse { 0%,100%{border-color:#b6873a55;box-shadow:0 0 0 0 rgba(182,135,58,0)} 50%{border-color:#b6873a;box-shadow:0 0 18px 4px rgba(182,135,58,0.2)} }
@keyframes hModalFadeIn { from{opacity:0} to{opacity:1} }
@keyframes hModalPopIn  { from{opacity:0;transform:translate(-50%,-50%) scale(0.93)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
@keyframes pdot    { 0%,100%{opacity:1} 50%{opacity:0.2} }
@keyframes dbounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-3px);opacity:1} }
@keyframes spin    { to{transform:rotate(360deg)} }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
@keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes aiBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
.upload-blink { animation: borderPulse 2s ease-in-out infinite; }
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { margin:0; padding:0; width:100%; min-height:100vh; background:#ddd5be; }
input::placeholder, textarea::placeholder { color:#786d52; }
button:hover { opacity:.88; }
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:#ddd5be}
::-webkit-scrollbar-thumb{background:#c8bb9a;border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:#b6873a}
select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23786d52'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
input[type=range]{cursor:pointer}
`;

// ── Chart Color Palette ───────────────────────────────────────────────────────
export const PALETTE = [
  "#b6873a","#5a7538","#12243c","#a83319","#786d52",
  "#886224","#1a2e4a","#58503a","#c8bb9a","#a6bc82",
  "#e4c786","#d8cbac","#7a6040","#3a5828","#0b1929",
  "#8a3319","#5a4a2a","#6a5520","#2a3e5a","#4a3c2a",
];

// ── Flag colors ───────────────────────────────────────────────────────────────
export const FLAG_COLORS = { high: "#a83319", medium: "#b8721a", low: "#a08020", info: "#12243c" };
export const FLAG_BG     = { high: "rgba(168,51,25,0.08)", medium: "rgba(184,114,26,0.08)", low: "rgba(160,128,32,0.08)", info: "rgba(18,36,60,0.05)" };
export const FLAG_ICONS  = { high: "⚑", medium: "⚑", low: "⚑", info: "ℹ" };

// ── SSE event colors ──────────────────────────────────────────────────────────
export const ACTION_COLORS_FETCH = {
  CLICK:"rgba(45,111,181,0.12)", FILL:"rgba(0,200,150,0.1)", SELECT:"rgba(245,166,35,0.1)",
  NAVIGATE:"rgba(155,110,243,0.1)", SCROLL:"rgba(138,173,202,0.1)", WAIT:"rgba(138,173,202,0.1)",
  DOWNLOAD:"rgba(0,200,150,0.15)", DONE:"rgba(0,200,150,0.15)", STUCK:"rgba(168,51,25,0.1)", ERROR:"rgba(168,51,25,0.1)",
};
export const ACTION_TEXT_COLORS_FETCH = {
  CLICK:"#2d6fb5", FILL:"#00c896", SELECT:"#f5a623", NAVIGATE:"#9b6ef3",
  SCROLL:"#8aadca", WAIT:"#8aadca", DOWNLOAD:"#00c896", DONE:"#00c896", STUCK:"#c0392b", ERROR:"#c0392b",
};

// ── Formatters ────────────────────────────────────────────────────────────────
export const fmt      = n => n>=1e9?`$${(n/1e9).toFixed(1)}B`:n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}K`:`$${Math.round(n).toLocaleString()}`;
export const fmtFull  = n => "$"+Math.round(Number(n)).toLocaleString("en-US");
export const parseAmt = raw => { if(!raw) return NaN; return parseFloat(String(raw).replace(/[$,\s]/g,"")); };
export const toTC     = str => str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase()+w.slice(1).toLowerCase());
export const shortLabel = (s, n=38) => { const tc=toTC(s); return tc.length>n?tc.slice(0,n-1)+"…":tc; };
export const fmtPct   = (n, decimals=1) => `${n.toFixed(decimals)}%`;
export const skillLabel = s => s<30?"Trainee":s<55?"Developing":s<75?"Proficient":s<90?"Expert":"Principal";
export const fmt$     = n => "$"+Math.round(n).toLocaleString();
