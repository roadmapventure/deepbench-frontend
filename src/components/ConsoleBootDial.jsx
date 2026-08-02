// DeepBench v7.0.50 | ConsoleBootDial.jsx | LAV-16 -- the countdown dial that covers the Agent
// Console's dead-canvas window. A run's first hop carrying an agentId can be 10+ seconds out; until
// then every roster agent is already painted as a resting `.lav-node` card (AgentNetwork.jsx renders
// them unconditionally from first paint), so the canvas reads as frozen rather than merely quiet.
// This overlay is mounted by AgentNetwork for exactly as long as that window is open and unmounted
// the instant the first agentId lands -- the mount boolean is derived in LiveAgentViewScreen.jsx
// (deriveBooting), never here: this file holds no stream knowledge and no state machine.
// Three things it owns on its own, and only these three:
//   1. the elapsed-seconds numeral, off a mount-pinned useRef start clock + one rAF loop;
//   2. the 45s ceiling, ridden off that SAME clock -- at the ceiling it renders null itself, so a
//      hung request can never leave the dial orphaned over a live canvas;
//   3. its own reduced-motion behaviour.
// The caption line is the run's REAL status text, handed down as a prop. No invented "stage" copy
// lives here (.claude/rules/agent-section-rendering.md -- the screen holds no content policy); the
// one authored string is a neutral fallback for the sliver before the first status is written.
// Every colour resolves to a tokens.js export and every rgba() shade is composed from those same
// imported values (.claude/rules/design-tokens.md). Motion reuses the GLOBAL_CSS keyframes that
// already exist -- `fadeIn` to enter, `spin` for the radar sweep, `borderPulse` for the frame accent;
// the single component-scoped keyframe below is the breathing scale, which none of those three
// covers, and it stays in this file's own <style> tag rather than growing tokens.js.
// FEATURE: LAV-16
import { useEffect, useRef, useState } from "react";
import { T, display, mono } from "../tokens.js";

// AgentNetwork.jsx's own helper, same three lines, same reason: an rgba shade is composed from an
// imported token rather than written as a literal. Deliberately not imported across -- AgentNetwork
// imports THIS file, so reaching back for its private helper would close a cycle.
const rgba = (hex, a) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

// The hung-request ceiling. Named and exported so the value has one home and a test can assert it
// rather than re-typing it.
export const BOOT_DIAL_CEILING_S = 45;
// The one authored line in this component, and it is chrome for an empty state, never a stand-in for
// something the run actually said: it shows only while `statusMessage` is genuinely null.
export const BOOT_DIAL_FALLBACK_CAPTION = "Starting run…";
// "Console" is the screen's own locked term (LAV-14). Short and revisable by design.
export const BOOT_DIAL_TITLE = "Console starting";

/**
 * Whole elapsed seconds between the run's pinned start clock and now. Pure, and pure on purpose:
 * the rAF loop below calls this every frame and setState only fires when the integer moves, so the
 * numeral costs one render per real second rather than one per frame.
 */
export function bootDialElapsedSeconds(startedAtMs, nowMs) {
  return Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
}

/** The ceiling test, riding that same clock -- reaching it is what makes the dial self-hide. */
export function bootDialExpired(elapsedSeconds) {
  return elapsedSeconds >= BOOT_DIAL_CEILING_S;
}

// ── geometry ──────────────────────────────────────────────────────────────────
// 200x200 user space, centre (100,100). Built once at module scope: the tick ring is a constant,
// and rebuilding 60 objects on every one-second render would be work for nothing.
const CX = 100, CY = 100;
const TICK_COUNT = 60;              // 360 / 6 -- the reference's 6-degree spacing
const TICKS = Array.from({ length: TICK_COUNT }, (_, i) => {
  const major = i % 5 === 0;
  const rad = ((i * 6) - 90) * Math.PI / 180;
  const inner = major ? 72 : 78, outer = 86;
  return {
    key: i,
    major,
    x1: +(CX + inner * Math.cos(rad)).toFixed(2),
    y1: +(CY + inner * Math.sin(rad)).toFixed(2),
    x2: +(CX + outer * Math.cos(rad)).toFixed(2),
    y2: +(CY + outer * Math.sin(rad)).toFixed(2),
  };
});

// The sweep wedge: a 34-degree slice of the outer disc, drawn once and rotated by CSS (global
// `spin`). Functionally the reference HTML's rotation, so no new keyframe is added for it.
const SWEEP_DEG = 34, SWEEP_R = 90;
const SWEEP_PATH = (() => {
  const a = (-SWEEP_DEG) * Math.PI / 180;
  const x = +(CX + SWEEP_R * Math.cos(a)).toFixed(2);
  const y = +(CY + SWEEP_R * Math.sin(a)).toFixed(2);
  return `M${CX},${CY} L${x},${y} A${SWEEP_R},${SWEEP_R} 0 0 1 ${CX + SWEEP_R},${CY} Z`;
})();

const CORNERS = [
  { key: "tl", top: 0, left: 0, borderTop: true, borderLeft: true },
  { key: "tr", top: 0, right: 0, borderTop: true, borderRight: true },
  { key: "bl", bottom: 0, left: 0, borderBottom: true, borderLeft: true },
  { key: "br", bottom: 0, right: 0, borderBottom: true, borderRight: true },
];

// ── component-scoped CSS ──────────────────────────────────────────────────────
// GLOBAL_CSS already owns fadeIn/spin/borderPulse and all three are used verbatim below; tokens.js
// is not touched. `bootDialBreathe` is the one thing none of them covers, and it lives here.
const DIAL_CSS = `
.lav-bootdial{position:absolute;inset:0;z-index:40;display:flex;align-items:center;
  justify-content:center;pointer-events:none;background:${rgba(T.navyDeep, 0.94)};
  animation:fadeIn .25s ease-out}
.lav-bootdial-panel{position:relative;padding:20px 24px 16px;border-radius:16px;
  border:1px solid ${rgba(T.brass, 0.33)};animation:borderPulse 2.8s ease-in-out infinite}
.lav-bootdial-corner{position:absolute;width:12px;height:12px}
.lav-bootdial-core{position:relative;width:200px;height:200px;margin:0 auto}
/* The rings and the sweep breathe together; the readout deliberately does NOT -- a numeral that
   changes every second should not also be scaling while it changes. */
@keyframes bootDialBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
.lav-bootdial-dial{position:absolute;inset:0;animation:bootDialBreathe 3.6s ease-in-out infinite}
.lav-bootdial-rings{position:absolute;inset:0;width:100%;height:100%}
.lav-bootdial-sweep{position:absolute;inset:0;animation:spin 3.2s linear infinite}
.lav-bootdial-sweep svg{width:100%;height:100%;display:block}
.lav-bootdial-readout{position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:2px}
.lav-bootdial-caption{margin-top:12px;max-width:212px;text-align:center;
  animation:fadeIn .3s ease-out}
/* Slower sweep, no breathing scale. The seconds counter and both fades are deliberately untouched:
   reduced motion is a request to calm movement, not to withhold the information. */
@media (prefers-reduced-motion: reduce){
  .lav-bootdial-sweep{animation-duration:14s}
  .lav-bootdial-dial{animation:none}
}
`;

const TITLE_STYLE = { fontFamily: mono, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.19em",
  textTransform: "uppercase", color: T.brass };
const NUMERAL_STYLE = { fontFamily: display, fontSize: 58, fontWeight: 600, lineHeight: 1,
  color: T.brassLight, fontVariantNumeric: "tabular-nums" };
const UNIT_STYLE = { fontFamily: mono, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.19em",
  textTransform: "uppercase", color: rgba(T.brassLight, 0.62) };
const CAPTION_STYLE = { fontFamily: mono, fontSize: 10, lineHeight: 1.45, color: T.navyTextHi };

/**
 * @param statusMessage the run's own live status line (LiveAgentViewScreen passes
 *                      `status?.message ?? null`). Null falls back to one neutral authored line.
 */
export default function ConsoleBootDial({ statusMessage = null }) {
  // The run's start, pinned once. The `if (!current)` guard is what makes React 18 StrictMode's
  // dev-only double-invoke a no-op here instead of a restart -- a second render body sees a truthy
  // ref and leaves it alone, so the numeral never jumps back to 1 in development.
  const startRef = useRef(null);
  if (!startRef.current) startRef.current = Date.now();

  const [elapsed, setElapsed] = useState(() => bootDialElapsedSeconds(startRef.current, Date.now()));

  // One rAF loop, started on mount and cancelled in this effect's cleanup -- so it cannot outlive
  // the component and nothing runs while the dial is not on screen. setState fires only when the
  // whole-second value actually moves.
  useEffect(() => {
    let raf = 0;
    const frame = () => {
      const next = bootDialElapsedSeconds(startRef.current, Date.now());
      setElapsed(prev => (prev === next ? prev : next));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // The ceiling, off the same clock the numeral reads. The parent's event-driven unmount is still
  // the normal way this dial leaves; this only backstops the case where that event never arrives.
  if (bootDialExpired(elapsed)) return null;

  // Reads 1 through the first real second, 2 through the second, and so on -- each numeral holds
  // exactly one second and the dial never shows a 0.
  const seconds = elapsed + 1;
  const caption = statusMessage || BOOT_DIAL_FALLBACK_CAPTION;

  return (
    <div className="lav-bootdial" aria-hidden="true">
      <style>{DIAL_CSS}</style>
      <div className="lav-bootdial-panel">
        {CORNERS.map(c => (
          <div key={c.key} className="lav-bootdial-corner" style={{
            top: c.top, right: c.right, bottom: c.bottom, left: c.left,
            borderTop: c.borderTop ? `1px solid ${T.brass}` : undefined,
            borderRight: c.borderRight ? `1px solid ${T.brass}` : undefined,
            borderBottom: c.borderBottom ? `1px solid ${T.brass}` : undefined,
            borderLeft: c.borderLeft ? `1px solid ${T.brass}` : undefined,
          }}/>
        ))}

        <div className="lav-bootdial-core">
          <div className="lav-bootdial-dial">
            <svg className="lav-bootdial-rings" viewBox="0 0 200 200">
              <circle cx={CX} cy={CY} r="94" fill="none" stroke={rgba(T.brass, 0.26)} strokeWidth="1"/>
              <circle cx={CX} cy={CY} r="80" fill="none" stroke={rgba(T.brass, 0.5)} strokeWidth="1.25"
                strokeDasharray="3 7"/>
              <circle cx={CX} cy={CY} r="58" fill="none" stroke={rgba(T.brassLight, 0.3)} strokeWidth="1"/>
              <g>
                {TICKS.map(t => (
                  <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                    stroke={rgba(T.brass, t.major ? 0.8 : 0.34)}
                    strokeWidth={t.major ? 1.6 : 1} strokeLinecap="round"/>
                ))}
              </g>
            </svg>
            <div className="lav-bootdial-sweep">
              <svg viewBox="0 0 200 200">
                <defs>
                  <radialGradient id="lavBootSweep" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={rgba(T.brass, 0)}/>
                    <stop offset="62%" stopColor={rgba(T.brass, 0.1)}/>
                    <stop offset="100%" stopColor={rgba(T.brassLight, 0.36)}/>
                  </radialGradient>
                </defs>
                <path d={SWEEP_PATH} fill="url(#lavBootSweep)"/>
              </svg>
            </div>
          </div>

          <div className="lav-bootdial-readout">
            <div style={TITLE_STYLE}>{BOOT_DIAL_TITLE}</div>
            <div style={NUMERAL_STYLE}>{seconds}</div>
            <div style={UNIT_STYLE}>sec</div>
          </div>
        </div>

        {/* The run's real status line, keyed on the text so a new message re-runs the fade rather
            than swapping in place. Never a canned stage label. */}
        <div className="lav-bootdial-caption" key={caption} style={CAPTION_STYLE}>{caption}</div>
      </div>
    </div>
  );
}
