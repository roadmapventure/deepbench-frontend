// DeepBench v5.1.0 | DebugOverlay.jsx | Feature ID debug overlay — triggered by ?debug=features
import { useState, createContext, useContext } from "react";

const DebugContext = createContext({ isDebugActive: false, toggleDebug: () => {} });

export function useDebugOverlay() {
  return useContext(DebugContext);
}

export function DebugOverlayProvider({ children }) {
  const isDebugUrl = typeof window !== "undefined" &&
    window.location.search.includes("debug=features");
  const [active, setActive] = useState(isDebugUrl);
  return (
    <DebugContext.Provider value={{ isDebugActive: active, toggleDebug: () => setActive(o => !o) }}>
      {children}
    </DebugContext.Provider>
  );
}

export default function DebugOverlay() {
  const isDebugUrl = typeof window !== "undefined" &&
    window.location.search.includes("debug=features");
  const { isDebugActive, toggleDebug } = useDebugOverlay();

  if (!isDebugUrl && !isDebugActive) return null;

  return (
    <button
      onClick={toggleDebug}
      style={{
        position: "fixed",
        bottom: 18,
        right: 18,
        background: "#b6873a",
        color: "#12243c",
        border: "none",
        padding: "7px 14px",
        fontFamily: '"JetBrains Mono", "IBM Plex Mono", monospace',
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        zIndex: 9999,
        borderRadius: 3,
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
        letterSpacing: 0.5,
      }}
    >
      {isDebugActive ? "✕ Feature IDs" : "⊞ Feature IDs"}
    </button>
  );
}
