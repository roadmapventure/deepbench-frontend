// src/AppShell.jsx — v5.0.0
// DeepBench v5 — App shell: header, Work/Bench nav tabs, shared layout
// Wraps every authenticated screen.

import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { T, display, body, mono, GLOBAL_CSS } from "./tokens.js";
import { useAIStatus } from "./hooks/useAIStatus.js";
import { Toast } from "./components/SharedUI.jsx";
import AIActivityPanel from "./components/AIActivityPanel.jsx";

// ── Global style injection ────────────────────────────────────────────────────
let _styleInjected = false;
function injectGlobalStyle() {
  if (_styleInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = GLOBAL_CSS;
  document.head.appendChild(el);
  _styleInjected = true;
}

// ── App Header ────────────────────────────────────────────────────────────────
export function AppHeader({ onHelp, showHelp = true, backLabel, onBack, rightContent, onAIPanel = ()=>{} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, cleanup } = useAIStatus();

  useEffect(() => () => cleanup(), [cleanup]);

  const isWork  = location.pathname === "/" || location.pathname.startsWith("/work");
  const isBench = location.pathname.startsWith("/bench");

  return (
    <div style={{background:T.navy,color:T.card,padding:"0 28px",display:"flex",alignItems:"center",height:60,borderBottom:`3px solid ${T.brass}`,flexShrink:0,gap:12}}>
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

      {/* Work / Bench nav tabs */}
      <div style={{display:"flex",alignItems:"stretch",height:60,marginLeft:24}}>
        <button
          onClick={()=>navigate("/")}
          style={{display:"flex",alignItems:"center",gap:7,padding:"0 20px",fontFamily:body,fontSize:13,fontWeight:isWork?600:500,color:isWork?"#f8f2e2":"rgba(184,197,216,.6)",background:"transparent",border:"none",borderBottom:isWork?`3px solid ${T.brass}`:"3px solid transparent",cursor:"pointer",letterSpacing:.2,marginBottom:-3,transition:"color .15s, border-color .15s"}}>
          <span style={{fontSize:13}}>📋</span> Work
        </button>
        <button
          onClick={()=>navigate("/bench")}
          style={{display:"flex",alignItems:"center",gap:7,padding:"0 20px",fontFamily:body,fontSize:13,fontWeight:isBench?600:500,color:isBench?"#f8f2e2":"rgba(184,197,216,.6)",background:"transparent",border:"none",borderBottom:isBench?`3px solid ${T.brass}`:"3px solid transparent",cursor:"pointer",letterSpacing:.2,marginBottom:-3,transition:"color .15s, border-color .15s"}}>
          <span style={{fontSize:13}}>👥</span> Bench
        </button>
      </div>

      <div style={{flex:1}}/>

      {/* AI status dot */}
      {status.active && (
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

      {/* ✦ AI Activity Panel trigger */}
      <button onClick={onAIPanel} style={{background:"rgba(182,135,58,.15)",border:`1px solid rgba(182,135,58,.4)`,color:T.brassLight,padding:"5px 12px",cursor:"pointer",fontSize:11,fontFamily:mono,letterSpacing:.5,display:"flex",alignItems:"center",gap:5}}>✦ AI</button>
      {/* Help button */}
      {showHelp && (
        <button onClick={onHelp} style={{background:"transparent",border:`1px solid ${T.card}40`,color:T.card,padding:"6px 14px",cursor:"pointer",fontSize:12,fontFamily:body,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:12}}>?</span> Help
        </button>
      )}
    </div>
  );
}

// ── Help Modal — YouTube embed ────────────────────────────────────────────────
export function HelpModal({ open, onClose }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(18,36,60,0.75)",backdropFilter:"blur(4px)",zIndex:2000,animation:"hModalFadeIn 0.2s ease"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(680px,92vw)",background:T.card,border:`1px solid ${T.line}`,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,0.4)",zIndex:2001,animation:"hModalPopIn 0.25s cubic-bezier(0.34,1.56,0.64,1)"}}>
        <div style={{padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${T.line}`,background:T.navy}}>
          <div>
            <div style={{fontFamily:display,fontSize:15,fontWeight:600,color:T.card}}>NIGP Spend Analyzer Demo</div>
            <div style={{fontSize:11,color:"#b8c5d8",marginTop:2,fontFamily:mono}}>1 min · Getting Started</div>
          </div>
          <button onClick={onClose} style={{background:T.navyMid,border:`1px solid ${T.card}30`,color:T.card,width:30,height:30,cursor:"pointer",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono}}>✕</button>
        </div>
        <div style={{background:"#000",aspectRatio:"16/9",width:"100%"}}>
          <iframe src="https://www.youtube.com/embed/U7FXpun6Kxk?autoplay=1&rel=0" title="NIGP Analyzer Demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{width:"100%",height:"100%",border:"none",display:"block"}}/>
        </div>
        <div style={{padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",background:T.cardAlt,borderTop:`1px solid ${T.line}`}}>
          <span style={{fontSize:12,color:T.muted,fontFamily:body}}>Click outside or ✕ to close and return to the app</span>
          <button onClick={onClose} style={{background:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,color:T.navy,border:"none",padding:"7px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:display}}>Got it ✓</button>
        </div>
      </div>
    </>
  );
}

// ── AppShell — wraps screen content with header ───────────────────────────────
export function AppShell({ children, headerProps = {}, toast }) {
  injectGlobalStyle();
  const [helpOpen,  setHelpOpen]  = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  return (
    <div style={{minHeight:"100vh",background:T.paperDeep,fontFamily:body,color:T.ink,display:"flex",flexDirection:"column"}}>
      <AppHeader {...headerProps} onHelp={()=>setHelpOpen(true)} onAIPanel={()=>setAiPanelOpen(o=>!o)}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
        {children}
      </div>
      <HelpModal open={helpOpen} onClose={()=>setHelpOpen(false)}/>
      {aiPanelOpen && <AIActivityPanel onClose={()=>setAiPanelOpen(false)}/>}
      {toast && <Toast toast={toast}/>}
    </div>
  );
}

// Initialize global styles on module load
injectGlobalStyle();
