// DeepBench v5.1.15 | AIDiamond.jsx | AI heartbeat diamond — shared animated brass indicator
// FEATURE: AI-01 — AIDiamond shared heartbeat component
export default function AIDiamond({ size = "7px", color = "currentColor", animationDuration = "2.4s" }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        background: color,
        flexShrink: 0,
        animation: `aiDiamondBeat ${animationDuration} ease-in-out infinite`,
      }}
    />
  );
}
