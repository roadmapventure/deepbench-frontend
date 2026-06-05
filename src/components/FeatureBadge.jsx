// DeepBench v5.1.0 | FeatureBadge.jsx | Debug overlay feature ID badge
import { useDebugOverlay } from "./DebugOverlay.jsx";

export default function FeatureBadge({ id }) {
  const { isDebugActive } = useDebugOverlay();
  if (!isDebugActive) return null;
  return (
    <div style={{
      position: "absolute", top: 4, left: 4, zIndex: 9999,
      background: "#b6873a", color: "#12243c", fontSize: 10,
      fontFamily: "JetBrains Mono, monospace", padding: "2px 6px",
      borderRadius: 3, opacity: 0.9, pointerEvents: "none",
      whiteSpace: "nowrap",
    }}>{id}</div>
  );
}
