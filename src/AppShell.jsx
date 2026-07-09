// DeepBench v6.1.40 | AppShell.jsx | S-MI-32 — root height fix (MI-32/33, minHeight→height so the flex/scroll chain gets a real viewport-bounded size) + Work/Bench nav restructure with Work dropdown (MI-36)
// DeepBench v6.1.3 | AppShell.jsx | S-MI-21/SH-16 — Market Intelligence nav tab moved to 1st position
// DeepBench v6.0.18 | AppShell.jsx | SH-15 — Market Intelligence nav tab, / now defaults to MI
// DeepBench v6.1.5 | AppShell.jsx | S-MI-23 — header AI status dot suppressed on MI route
// FEATURE: SH-05 — AppShell header, Work Dashboard / Bench Dashboard nav tabs, AI dot, activity panel trigger, about panel

import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { T, display, body, mono, GLOBAL_CSS } from "./tokens.js";
import { useAIStatus } from "./hooks/useAIStatus.js";
import { Toast } from "./components/SharedUI.jsx";
import AIActivityPanel from "./components/AIActivityPanel.jsx";
import DebugOverlay from "./components/DebugOverlay.jsx";
import AIDiamond from "./components/AIDiamond.jsx";
import AboutPanel from "./components/AboutPanel.jsx";

// ── Global style injection ────────────────────────────────────────────────────
let _styleInjected = false;
function injectGlobalStyle() {
  if (_styleInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = GLOBAL_CSS;
  document.head.appendChild(el);
  _styleInjected = true;
}

// ── NavTab — single Work/Bench tab with hover state ───────────────────────────
function NavTab({ isActive, onClick, icon, label, hasBorderLeft }) {
  const [hovered, setHovered] = useState(false);

  const textColor = isActive
    ? "#b6873a"
    : hovered
    ? "rgba(255,255,255,0.8)"
    : "rgba(255,255,255,0.45)";

  const bg = isActive
    ? "rgba(182,135,58,0.09)"
    : hovered
    ? "rgba(182,135,58,0.06)"
    : "transparent";

  const iconOpacity = isActive ? 1 : hovered ? 0.9 : 0.6;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "0 28px",
        fontFamily: mono,
        fontSize: 12,
        fontWeight: isActive ? 700 : 500,
        color: textColor,
        background: bg,
        border: "none",
        borderLeft: hasBorderLeft ? "1px solid rgba(182,135,58,0.3)" : "none",
        borderRight: "1px solid rgba(182,135,58,0.3)",
        borderBottom: isActive ? "3px solid #b6873a" : "3px solid transparent",
        cursor: "pointer",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        height: "100%",
        transition: "color .15s, background .15s",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 17, lineHeight: 1, opacity: iconOpacity }}>{icon}</span>
      {label}
    </button>
  );
}

// ── App Header ────────────────────────────────────────────────────────────────
// FEATURE: SH-05 — App header (logo, Work Dashboard / Bench Dashboard nav tabs, AI status dot, AI panel trigger, about button)
export function AppHeader({ onHelp, showHelp = true, backLabel, onBack, rightContent, onAIPanel = ()=>{}, showAIPanel = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, cleanup } = useAIStatus();
  const [aboutHovered, setAboutHovered] = useState(false);
  const [auditTipShow, setAuditTipShow] = useState(false);
  const [workMenuOpen, setWorkMenuOpen] = useState(false);

  useEffect(() => () => cleanup(), [cleanup]);

  const isWork  = location.pathname.startsWith("/work");
  const isBench = location.pathname.startsWith("/bench");
  const isMI    = location.pathname === "/";

  return (
    <div style={{background:T.navy,color:T.card,padding:"0 28px",display:"flex",alignItems:"center",height:60,borderBottom:`3px solid ${T.brass}`,flexShrink:0,gap:12,position:"relative"}}>
      {/* Logo */}
      <div onClick={()=>navigate("/")} style={{width:36,height:36,borderRadius:"50%",background:T.brass,color:T.navy,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:display,fontWeight:700,fontSize:15,border:`2px solid ${T.card}`,flexShrink:0,cursor:"pointer"}}>
        DB
      </div>
      <div>
        <div style={{fontFamily:display,fontSize:17,fontWeight:600,letterSpacing:.2,lineHeight:1}}>DeepBench</div>
        <div style={{fontFamily:body,fontSize:9.5,color:"#b8c5d8",letterSpacing:1.5,textTransform:"uppercase",marginTop:3}}>
          AI Workforce Platform
        </div>
      </div>

      {/* FEATURE: MI-36 — Work/Bench nav, Work opens a dropdown (Market Intelligence / Project
          Management / Spend Analysis). MI-32/33's scroll-height fix (same session) is what makes the
          header behave as pinned/static now that the root has a definite height. */}
      <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",top:0,bottom:0,display:"flex",alignItems:"stretch"}}>
        <span style={{position:"relative",display:"flex"}}>
          <NavTab
            isActive={isWork || isMI}
            onClick={()=>setWorkMenuOpen(o=>!o)}
            icon="📋"
            label="Work"
            hasBorderLeft={true}
          />
          {workMenuOpen && (
            <>
              {/* click-outside-to-close backdrop */}
              <div onClick={()=>setWorkMenuOpen(false)} style={{position:"fixed",inset:0,zIndex:998}}/>
              <div style={{position:"absolute",top:"100%",left:0,minWidth:220,background:T.card,border:`1px solid ${T.line}`,boxShadow:"0 8px 24px rgba(0,0,0,0.3)",zIndex:999}}>
                {[
                  {label:"Market Intelligence", icon:"◈", path:"/"},
                  {label:"Project Management", icon:"📋", path:"/work"},
                  {label:"Spend Analysis", icon:"💰", path:"/work/1/analyze"},
                ].map(item => (
                  <button key={item.path}
                    onClick={()=>{ setWorkMenuOpen(false); navigate(item.path); }}
                    style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 16px",background:"transparent",border:"none",borderBottom:`1px solid ${T.lineSoft}`,color:T.ink,fontFamily:body,fontSize:13,textAlign:"left",cursor:"pointer"}}>
                    <span>{item.icon}</span>{item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </span>
        <NavTab
          isActive={isBench}
          onClick={()=>navigate("/bench")}
          icon="👥"
          label="Bench"
          hasBorderLeft={false}
        />
      </div>

      <div style={{flex:1}}/>

      {/* AI status dot — FEATURE: MI-23 — suppressed on MI route, which shows its own chat-embedded version instead */}
      {status.active && !isMI && (
        <div style={{display:"flex",alignItems:"center",gap:6,marginRight:8}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:T.brass,display:"inline-block",animation:"aiBlink 1.2s ease-in-out infinite"}}/>
          <span style={{fontFamily:mono,fontSize:10,color:T.brassLight,letterSpacing:.3}}>{status.message}</span>
        </div>
      )}

      {/* Right content slot */}
      {rightContent}

      {/* Back button */}
      {onBack && (
        <button onClick={onBack} style={{background:"transparent",border:`1px solid ${T.card}40`,color:T.card,padding:"6px 14px",cursor:"pointer",fontSize:12,fontFamily:body}}>
          ← {backLabel || "Back"}
        </button>
      )}

      {/* AI Activity Panel trigger */}
      {showAIPanel && (
        <span style={{position:"relative",display:"inline-flex",alignItems:"center"}}
          onMouseEnter={() => setAuditTipShow(true)}
          onMouseLeave={() => setAuditTipShow(false)}>
          {/* FEATURE: AI-01 — AI Audit button tooltip */}
          <button onClick={onAIPanel} style={{background:"rgba(182,135,58,.15)",border:`1px solid rgba(182,135,58,.4)`,color:T.brassLight,padding:"5px 12px",cursor:"pointer",fontSize:11,fontFamily:mono,letterSpacing:.5,display:"flex",alignItems:"center",gap:6}}>
            <AIDiamond size="7px" color={T.brassLight}/> AI Audit
          </button>
          {auditTipShow && (
            <>
              <span style={{
                position:"absolute",
                bottom:"calc(100% + 6px)",
                left:"50%",
                transform:"translateX(-50%)",
                whiteSpace:"nowrap",
                fontFamily:mono,
                fontSize:9,
                letterSpacing:"0.4px",
                textTransform:"uppercase",
                color:T.brassLight,
                background:T.navy,
                border:`1px solid rgba(182,135,58,0.5)`,
                padding:"3px 7px",
                pointerEvents:"none",
                zIndex:9999,
              }}>AI Audit</span>
              <span style={{
                position:"absolute",
                bottom:"calc(100% + 2px)",
                left:"50%",
                transform:"translateX(-50%)",
                width:0,height:0,
                borderLeft:"4px solid transparent",
                borderRight:"4px solid transparent",
                borderTop:`4px solid rgba(182,135,58,0.5)`,
                pointerEvents:"none",
                zIndex:9999,
              }}/>
            </>
          )}
        </span>
      )}

      {/* About button */}
      {showHelp && (
        <button
          onClick={onHelp}
          onMouseEnter={() => setAboutHovered(true)}
          onMouseLeave={() => setAboutHovered(false)}
          style={{
            background: "transparent",
            border: `1px solid ${T.card}40`,
            color: T.card,
            padding: "6px 14px",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: body,
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 148,
            whiteSpace: "nowrap",
          }}
        >
          {aboutHovered ? "Read the how and why" : "About DeepBench"}
        </button>
      )}
    </div>
  );
}

// ── AppShell — wraps screen content with header ───────────────────────────────
// FEATURE: SH-05
export function AppShell({ children, headerProps = {}, toast }) {
  injectGlobalStyle();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  return (
    <div style={{height:"100vh",background:T.paperDeep,fontFamily:body,color:T.ink,display:"flex",flexDirection:"column"}}>
      <AppHeader {...headerProps} onHelp={()=>setAboutOpen(true)} onAIPanel={()=>setAiPanelOpen(o=>!o)}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
        {children}
      </div>
      {aboutOpen && <AboutPanel onClose={()=>setAboutOpen(false)}/>}
      {aiPanelOpen && <AIActivityPanel onClose={()=>setAiPanelOpen(false)}/>}
      {toast && <Toast toast={toast}/>}
      <DebugOverlay />
    </div>
  );
}

// Initialize global styles on module load
injectGlobalStyle();
