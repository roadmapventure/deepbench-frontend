// DeepBench v5.1.10p | MichelleAvatar.jsx | AG-04a avatar placeholder
// FEATURE: AG-04a — Michelle avatar placeholder

import { T } from "../tokens.js";

const SIZES = { sm: 28, md: 36 };

export default function MichelleAvatar({ size = "sm" }) {
  const d = SIZES[size] || SIZES.sm;
  return (
    <div style={{
      width: d, height: d, borderRadius: "50%",
      border: `1.5px solid ${T.brass}`,
      background: T.paperDeep,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {/* TODO S-BENCH-01: replace with Supabase profile image */}
      <svg viewBox="0 0 24 24" fill={T.navy} xmlns="http://www.w3.org/2000/svg"
        style={{ width: "55%", height: "55%" }}>
        <circle cx="12" cy="8" r="4"/>
        <path d="M12 14c-5.33 0-8 2.67-8 4v1.5h16V18c0-1.33-2.67-4-8-4z"/>
      </svg>
    </div>
  );
}
