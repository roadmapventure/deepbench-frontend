// DeepBench v5.1.0 | DebugOverlay.jsx | Feature ID debug overlay — triggered by ?debug=features
import { useState, useEffect } from "react";

function attachBadges() {
  const tagged = document.querySelectorAll("[data-feature-id]");
  tagged.forEach(el => {
    if (el.querySelector(".db-feature-badge")) return;
    const id = el.getAttribute("data-feature-id");
    if (!id) return;
    const badge = document.createElement("div");
    badge.className = "db-feature-badge";
    badge.textContent = id;
    Object.assign(badge.style, {
      position: "absolute",
      top: "0",
      left: "0",
      fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
      fontSize: "10px",
      background: "#b6873a",
      color: "#12243c",
      padding: "2px 4px",
      borderRadius: "2px",
      opacity: "0.85",
      pointerEvents: "none",
      zIndex: "9990",
      whiteSpace: "nowrap",
      lineHeight: "1.2",
      fontWeight: "700",
    });
    const pos = getComputedStyle(el).position;
    if (pos === "static") el.style.position = "relative";
    el.appendChild(badge);
  });
}

function removeBadges() {
  document.querySelectorAll(".db-feature-badge").forEach(b => b.remove());
  document.querySelectorAll("[data-feature-id]").forEach(el => {
    if (el.style.position === "relative" && el.getAttribute("data-feature-id")) {
      el.style.position = "";
    }
  });
}

export default function DebugOverlay() {
  const isDebugUrl = typeof window !== "undefined" &&
    window.location.search.includes("debug=features");

  const [active, setActive] = useState(isDebugUrl);

  useEffect(() => {
    if (active) {
      attachBadges();
      const obs = new MutationObserver(() => attachBadges());
      obs.observe(document.body, { childList: true, subtree: true });
      return () => { obs.disconnect(); removeBadges(); };
    } else {
      removeBadges();
    }
  }, [active]);

  if (!isDebugUrl && !active) return null;

  return (
    <button
      onClick={() => setActive(o => !o)}
      style={{
        position: "fixed",
        bottom: 18,
        right: 18,
        background: "#b6873a",
        color: "#12243c",
        border: "none",
        padding: "7px 14px",
        fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        zIndex: 9999,
        borderRadius: 3,
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
        letterSpacing: 0.5,
      }}
    >
      {active ? "✕ Feature IDs" : "⊞ Feature IDs"}
    </button>
  );
}
