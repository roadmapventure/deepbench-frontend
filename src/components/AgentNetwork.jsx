// DeepBench v7.0.1 | AgentNetwork.jsx | LAV-1b -- animated agent-network canvas for the Live Agent
// View: node cards, observed-traffic edges, hop pulses and the Choreographed/Static reorg, all
// rendered as a pure function of the harness event ledger the screen hands down. Ported from
// docs/channel-intelligence-v8-promptbox.html for LOOK AND MOTION ONLY -- that file's control flow
// (MISSIONS / setTimeout / Math.random / the hand-drawn EDGES topology) is a simulator and is
// deliberately NOT ported. Nothing here invents an agent, an edge, a pulse or a value.
// FEATURE: LAV-1b
import { useEffect, useMemo, useRef, useState } from "react";
import { T, PALETTE, mono, body, ACTION_TEXT_COLORS_FETCH } from "../tokens.js";
import { AgentAvatar, FeatureBadge } from "./SharedUI.jsx";

// ── canvas space (ported viewBox) ────────────────────────────────────────────
const VW = 1200, VH = 640;
// Choreography anchors, ported verbatim from the prototype's computeTargets().
const LEAD = { x: 270, y: 305 }, MID = { x: 560, y: 305 }, STACKX = 1098;
const ARC_RX = 235, ARC_RY = 215, ARC_SPREAD = (162 * Math.PI) / 180;

// FEATURE: LAV-1b -- every colour below resolves to an imported token; rgba() shades are composed
// from those same imported values rather than written as literals (.claude/rules/design-tokens.md).
const rgba = (hex, a) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

// Pulse/edge vocabulary. Four real meanings, four tokens -- the legend renders these same values.
export const LINK_COLOR = T.line;                              // an observed path, at rest
export const DISPATCH_COLOR = ACTION_TEXT_COLORS_FETCH.CLICK;  // a delegation going out
export const REPORT_COLOR = T.moss;                            // control/result coming back
export const REDISPATCH_COLOR = T.flag;                        // the same pair crossed again this run
export const HANDOFF_COLOR = T.brass;                          // dispatched, never returned before terminal

// ── pure derivations over the stored-event ledger ────────────────────────────
// Stored events are exactly what buildHopEvent() produces (verified fresh in
// MarketIntelligenceScreen.jsx L1113): { type, agentId, data, durationMs, id, secondaryAgentId? }.
// useHarnessStream credits a `delegation` to its DISPATCHER (agentId) and carries the target in
// secondaryAgentId; it credits `delegation_complete` to the agent that finished and
// `delegation_return` to the delegate that is handing control back -- neither carries the
// dispatcher, so an open delegation is tracked by TARGET and closed when that target reports.
export function edgeKey(from, to) { return `${from}>${to}`; }

export function deriveNetwork(runHops) {
  const engaged = [];            // first-engagement order (sequential truth -- one agent at a time)
  const bubbles = {};            // agentId -> its latest activity text this run
  const openByTarget = new Map();// targetId -> dispatcherId, while that delegation is unreturned
  const finished = new Set();    // agents whose hop completed this run
  const edges = [];              // observed traffic only
  const edgeSeen = new Set();
  let activeId = null;

  for (const h of runHops) {
    const id = h.agentId;
    if (id) {
      if (!engaged.includes(id)) engaged.push(id);
      const text = h.data?.reasoning ?? h.data?.task ?? h.data?.message ?? null;
      if (text) bubbles[id] = text;
      activeId = id;
    }
    if (h.type === "delegation" && id && h.secondaryAgentId) {
      const k = edgeKey(id, h.secondaryAgentId);
      if (!edgeSeen.has(k)) { edgeSeen.add(k); edges.push({ key: k, from: id, to: h.secondaryAgentId }); }
      openByTarget.set(h.secondaryAgentId, id);
    }
    if (h.type === "delegation_complete" || h.type === "delegation_return") {
      if (id) { openByTarget.delete(id); finished.add(id); }
    }
  }

  const orchestrators = new Set([...openByTarget.values()]);
  const done = new Set([...engaged, ...finished].filter(a => a !== activeId && !orchestrators.has(a)));
  return { engaged, bubbles, openByTarget, orchestrators, done, activeId, edges };
}

// A pulse is emitted per real delegation-family hop, on the real pair that hop crossed.
// `delegation` travels dispatcher -> target; a report-back (`delegation_return`, and
// `delegation_complete`, which is the same real event family closing the same real edge) travels
// back along it. A pair crossed a second time in one run is a re-dispatch.
export function pulsesForHop(hop, index, priorHops) {
  const id = hop.agentId;
  if (hop.type === "delegation" && id && hop.secondaryAgentId) {
    const k = edgeKey(id, hop.secondaryAgentId);
    const repeat = priorHops.some(p => p.type === "delegation" && p.agentId && p.secondaryAgentId
      && edgeKey(p.agentId, p.secondaryAgentId) === k);
    return [{ from: id, to: hop.secondaryAgentId, color: repeat ? REDISPATCH_COLOR : DISPATCH_COLOR }];
  }
  if ((hop.type === "delegation_complete" || hop.type === "delegation_return") && id) {
    const { openByTarget } = deriveNetwork(priorHops);
    const dispatcher = openByTarget.get(id);
    if (dispatcher) return [{ from: id, to: dispatcher, color: REPORT_COLOR }];
  }
  return [];
}

// Every session-observed edge, with the colour that describes its last known meaning. An edge whose
// delegation was still open when the run went terminal is the run's real hand-off (brass).
export function sessionEdges(hops, runHops, running) {
  const seen = new Map();
  for (const h of hops) {
    if (h.type !== "delegation" || !h.agentId || !h.secondaryAgentId) continue;
    const k = edgeKey(h.agentId, h.secondaryAgentId);
    if (!seen.has(k)) seen.set(k, { key: k, from: h.agentId, to: h.secondaryAgentId });
  }
  const { openByTarget } = deriveNetwork(runHops);
  const openKeys = new Set([...openByTarget.entries()].map(([to, from]) => edgeKey(from, to)));
  return [...seen.values()].map(e => ({
    ...e,
    color: (!running && openKeys.has(e.key)) ? HANDOFF_COLOR : LINK_COLOR,
    handoff: !running && openKeys.has(e.key),
  }));
}

// ── layout ───────────────────────────────────────────────────────────────────
// The home grid is COMPUTED from roster order -- there is no hand-authored position table and no
// hand-listed agent id anywhere in this file (kickoff SCOPE RULES).
export function homeLayout(ids) {
  const n = ids.length, out = {};
  if (!n) return out;
  const cols = Math.min(4, n);
  const rows = Math.ceil(n / cols);
  ids.forEach((id, i) => {
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, n - r * cols);
    const c = i - r * cols;
    out[id] = {
      x: VW * ((c + 0.5) / inRow),
      y: rows === 1 ? VH / 2 : VH * (0.16 + 0.68 * (r / (rows - 1))),
    };
  });
  return out;
}

// Ported arc/bench target math. Lead = the agent actually holding an open delegation; the arc fills
// in engagement order, one at a time; everyone not yet engaged parks in the bench stack.
export function computeTargets({ ids, home, choreographed, engaged, lead, benchOrder }) {
  const t = {};
  ids.forEach(id => { t[id] = { ...home[id] }; });
  const benched = new Set();
  if (choreographed && engaged.length) {
    const leadId = lead && ids.includes(lead) ? lead : engaged[0];
    t[leadId] = { x: LEAD.x, y: LEAD.y };
    const kids = engaged.filter(id => id !== leadId);
    const n = Math.max(1, kids.length);
    const start = -ARC_SPREAD / 2;
    kids.forEach((id, i) => {
      const ang = n === 1 ? 0 : start + ARC_SPREAD * (i / (n - 1));
      t[id] = { x: MID.x + Math.cos(ang) * ARC_RX, y: MID.y + Math.sin(ang) * ARC_RY };
    });
    ids.forEach(id => { if (id !== leadId && !kids.includes(id)) benched.add(id); });
    const order = benchOrder.filter(id => benched.has(id));
    benched.forEach(id => { if (!order.includes(id)) order.push(id); });
    const m = order.length, step = m > 1 ? Math.min(52, 468 / (m - 1)) : 0, y0 = 305 - (step * (m - 1)) / 2;
    order.forEach((id, i) => { t[id] = { x: STACKX, y: y0 + i * step }; });
    return { targets: t, benched, benchOrder: order };
  }
  return { targets: t, benched, benchOrder: [] };
}

function ePath(a, b) {
  if (!a || !b) return "";
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, c = 18;
  return `M ${a.x} ${a.y} Q ${mx + nx * c} ${my + ny * c} ${b.x} ${b.y}`;
}

// ── pulse (ported dash-offset draw + glow trail, real rAF, no scripted timing) ─
function Pulse({ d, color, dur, onDone }) {
  const pathRef = useRef(null);
  const trailRef = useRef([]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return undefined;
    const total = path.getTotalLength() || 1;
    path.setAttribute("stroke-dasharray", String(total));
    path.setAttribute("stroke-dashoffset", String(total));
    let raf = 0;
    const t0 = performance.now();
    const frame = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      path.setAttribute("stroke-dashoffset", String(total * (1 - e)));
      trailRef.current.forEach((c, i) => {
        if (!c) return;
        const pt = path.getPointAtLength(Math.max(0, e - i * 0.05) * total);
        c.setAttribute("cx", String(pt.x));
        c.setAttribute("cy", String(pt.y));
      });
      if (p < 1) raf = requestAnimationFrame(frame);
      else doneRef.current?.();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [d, dur]);
  return (
    <g>
      <path ref={pathRef} d={d} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" filter="url(#lavGlow)"/>
      {[0, 1, 2, 3, 4].map(i => (
        <circle key={i} ref={el => { trailRef.current[i] = el; }} r={5 - i * 0.8}
          fill={i === 0 ? T.white : color} opacity={1 - i * 0.18} filter="url(#lavGlow)"/>
      ))}
    </g>
  );
}

// ── component-scoped CSS (GLOBAL_CSS already owns spin/fadeIn/slideUp/aiBlink) ─
const NET_CSS = `
.lav-stagewrap{flex:1;position:relative;overflow:hidden;padding:10px 6px 6px;background:${T.paper};min-width:0}
.lav-stage{position:absolute;inset:10px 6px 6px}
.lav-inner{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:100%;aspect-ratio:1200/640;max-height:100%}
.lav-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.lav-node{position:absolute;transform:translate(-50%,-50%);width:132px;text-align:center;
  transition:transform .35s cubic-bezier(.2,.8,.3,1.4),opacity .35s,filter .35s;z-index:2}
.lav-card{background:linear-gradient(180deg,${T.card},${T.cardAlt});border:1.5px solid ${T.line};
  border-radius:14px;padding:9px 7px 8px;box-shadow:0 3px 10px ${rgba(T.navy, 0.16)};position:relative;
  transition:border-color .3s,box-shadow .35s}
.lav-ava{width:50px;height:50px;margin:0 auto 4px;position:relative;z-index:2;display:flex;justify-content:center}
.lav-code{font-family:${mono};font-size:9px;font-weight:600;letter-spacing:.1em;color:${T.muted};text-transform:uppercase}
.lav-name{font-family:${body};font-weight:700;font-size:12.5px;color:${T.navy};line-height:1.15;margin-top:1px}
.lav-role{font-family:${body};font-size:9.5px;color:${T.muted};margin-top:1px;line-height:1.2}
/* Reserved for LAV-1c's pattern pill + model tag. Renders NOTHING until it has real data. */
.lav-slot{height:15px;margin-top:4px}
.lav-ring{position:absolute;left:50%;top:32px;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;
  border:2px solid ${T.brass};opacity:0;pointer-events:none;z-index:1}
@keyframes lavRipple{0%{opacity:.75;transform:scale(.55)}100%{opacity:0;transform:scale(2.1)}}
.lav-node.is-active .lav-ring{animation:lavRipple 1.1s ease-out infinite}
.lav-node.is-active{transform:translate(-50%,-50%) scale(1.07);z-index:7}
.lav-node.is-active .lav-card{border-color:${T.brass};
  box-shadow:0 10px 26px ${rgba(T.brassDeep, 0.35)},0 0 0 3px ${rgba(T.brass, 0.18)}}
.lav-node.is-done .lav-card{border-color:${T.mossLight}}
.lav-spin{position:absolute;left:50%;top:32px;width:88px;height:88px;margin:-44px 0 0 -44px;border-radius:50%;
  border:2px dashed ${rgba(ACTION_TEXT_COLORS_FETCH.CLICK, 0.5)};opacity:0;z-index:0}
.lav-node.is-orch .lav-spin{opacity:1;animation:spin 6s linear infinite}
.lav-node.is-orch .lav-card{border-color:${ACTION_TEXT_COLORS_FETCH.CLICK};
  box-shadow:0 12px 30px ${rgba(ACTION_TEXT_COLORS_FETCH.CLICK, 0.35)},0 0 0 3px ${rgba(ACTION_TEXT_COLORS_FETCH.CLICK, 0.2)}}
.lav-node.is-benched{transform:translate(-50%,-50%) scale(.56);opacity:.62;filter:saturate(.7);z-index:1}
.lav-node.is-benched .lav-card{box-shadow:0 2px 6px ${rgba(T.navy, 0.16)}}
.lav-node.is-benched .lav-bubble{display:none}
.lav-bubble{position:absolute;left:50%;bottom:calc(100% + 12px);transform:translateX(-50%) translateY(6px);
  width:198px;background:${T.navy};color:${T.navyTextHi};font-family:${body};font-size:11.5px;line-height:1.35;
  padding:8px 11px;border-radius:12px;box-shadow:0 8px 20px ${rgba(PALETTE[14], 0.3)};opacity:0;
  pointer-events:none;transition:.25s;z-index:20;text-align:left}
.lav-bubble:after{content:"";position:absolute;left:50%;top:100%;transform:translateX(-50%);
  border:8px solid transparent;border-top-color:${T.navy}}
.lav-bubble.show{opacity:1;transform:translateX(-50%) translateY(0)}
.lav-bubble.down{bottom:auto;top:calc(100% + 12px);transform:translateX(-50%) translateY(-6px)}
.lav-bubble.down:after{top:auto;bottom:100%;border-top-color:transparent;border-bottom-color:${T.navy}}
.lav-bubble.down.show{transform:translateX(-50%) translateY(0)}
.lav-legend{position:absolute;left:12px;bottom:8px;display:flex;gap:12px;flex-wrap:wrap;font-family:${body};
  font-size:9.5px;color:${T.muted};background:${rgba(T.card, 0.82)};border:1px solid ${T.line};
  border-radius:20px;padding:6px 11px;z-index:6}
.lav-legend span{display:inline-flex;align-items:center;gap:5px}
.lav-legend .sw{width:15px;height:3px;border-radius:2px}
.lav-seg{position:absolute;left:12px;top:12px;display:flex;align-items:stretch;background:${T.card};
  border:1px solid ${T.line};border-radius:8px;overflow:hidden;z-index:8;box-shadow:0 2px 6px ${rgba(T.navy, 0.16)}}
.lav-seg .lbl{font-family:${mono};font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
  color:${T.muted};display:flex;align-items:center;padding:0 10px;border-right:1px solid ${T.line}}
.lav-seg button{border:none;background:transparent;font-family:${body};font-weight:600;font-size:11px;
  color:${T.muted};padding:6px 13px;cursor:pointer}
.lav-seg button.on{background:${T.navy};color:${T.card}}
`;

/**
 * Pure presentation of the harness stream. No fetching, no timers that invent state.
 *  roster   -- agent objects that may appear on this canvas (idle baseline + anyone seen streaming)
 *  hops     -- every stored event observed this SESSION (edges persist across runs)
 *  runHops  -- the slice since the current run's question boundary (node state, pulses, bubbles)
 *  running  -- the harness is live right now
 */
export default function AgentNetwork({ roster, hops, runHops, running, choreographed, onToggleChoreographed }) {
  const ids = useMemo(() => roster.map(a => a.id), [roster]);
  const home = useMemo(() => homeLayout(ids), [ids]);
  const net = useMemo(() => deriveNetwork(runHops), [runHops]);
  const edges = useMemo(() => sessionEdges(hops, runHops, running), [hops, runHops, running]);

  // Lead = the agent actually holding an open delegation right now; else the first engaged agent.
  const lead = useMemo(() => {
    const open = [...net.orchestrators];
    return open.length ? open[open.length - 1] : (net.engaged[0] ?? null);
  }, [net]);

  const posRef = useRef({});
  const tgtRef = useRef({});
  const nodeRefs = useRef({});
  const edgeRefs = useRef({});
  const benchOrderRef = useRef([]);
  const rafRef = useRef(0);
  const choreoRef = useRef(choreographed);
  choreoRef.current = choreographed;
  const [benched, setBenched] = useState(() => new Set());

  const tick = useRef(null);
  tick.current = () => {
    const k = choreoRef.current ? 0.11 : 0.2;
    let moving = false;
    for (const id of ids) {
      const p = posRef.current[id], g = tgtRef.current[id];
      if (!p || !g) continue;
      p.x += (g.x - p.x) * k;
      p.y += (g.y - p.y) * k;
      if (Math.abs(g.x - p.x) > 0.4 || Math.abs(g.y - p.y) > 0.4) moving = true;
      else { p.x = g.x; p.y = g.y; }
      const el = nodeRefs.current[id];
      if (el) { el.style.left = `${(p.x / VW) * 100}%`; el.style.top = `${(p.y / VH) * 100}%`; }
    }
    for (const e of edges) {
      const el = edgeRefs.current[e.key];
      if (el) el.setAttribute("d", ePath(posRef.current[e.from], posRef.current[e.to]));
    }
    rafRef.current = moving ? requestAnimationFrame(() => tick.current()) : 0;
  };

  // Targets recompute only when the derived state changes -- the rAF loop runs until the canvas has
  // settled and then stops, so an idle canvas costs nothing and shows no motion.
  useEffect(() => {
    for (const id of ids) if (!posRef.current[id] && home[id]) posRef.current[id] = { ...home[id] };
    const r = computeTargets({ ids, home, choreographed, engaged: net.engaged, lead, benchOrder: benchOrderRef.current });
    benchOrderRef.current = r.benchOrder;
    tgtRef.current = r.targets;
    setBenched(r.benched);
    if (!rafRef.current) rafRef.current = requestAnimationFrame(() => tick.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, home, choreographed, net, lead]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ── pulses: one per newly-observed delegation-family hop, on the real pair it crossed ──
  const [pulses, setPulses] = useState([]);
  const seenRef = useRef(0);
  const pulseIdRef = useRef(0);
  useEffect(() => {
    if (runHops.length < seenRef.current) { seenRef.current = 0; setPulses([]); return; }
    if (runHops.length === seenRef.current) return;
    const fresh = [];
    for (let i = seenRef.current; i < runHops.length; i++) {
      for (const p of pulsesForHop(runHops[i], i, runHops.slice(0, i))) {
        const a = posRef.current[p.from], b = posRef.current[p.to];
        if (!a || !b) continue;
        fresh.push({ id: ++pulseIdRef.current, d: ePath(a, b), color: p.color });
      }
    }
    seenRef.current = runHops.length;
    if (fresh.length) setPulses(cur => [...cur, ...fresh]);
  }, [runHops]);

  const dropPulse = (id) => setPulses(cur => cur.filter(p => p.id !== id));

  return (
    <div className="lav-stagewrap">
      <FeatureBadge id="LAV-1"/>
      <style>{NET_CSS}</style>
      <div className="lav-seg">
        <span className="lbl">Layout</span>
        <button className={choreographed ? "on" : ""} onClick={() => onToggleChoreographed(true)}>Choreographed</button>
        <button className={choreographed ? "" : "on"} onClick={() => onToggleChoreographed(false)}>Static</button>
      </div>
      <div className="lav-stage"><div className="lav-inner">
        <svg className="lav-svg" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="lavGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="lavBlur"/>
              <feMerge><feMergeNode in="lavBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <g>
            {edges.map(e => (
              <path key={e.key} ref={el => { edgeRefs.current[e.key] = el; }}
                d={ePath(posRef.current[e.from] || home[e.from], posRef.current[e.to] || home[e.to])}
                fill="none" stroke={e.color} strokeWidth={e.handoff ? 2.2 : 1.6}
                strokeDasharray="2 7" strokeLinecap="round" opacity="0.9"/>
            ))}
          </g>
          <g>
            {pulses.map(p => <Pulse key={p.id} d={p.d} color={p.color} dur={900} onDone={() => dropPulse(p.id)}/>)}
          </g>
        </svg>
        <div>
          {roster.map(a => {
            const cls = ["lav-node"];
            if (benched.has(a.id)) cls.push("is-benched");
            if (net.orchestrators.has(a.id)) cls.push("is-orch");
            else if (running && net.activeId === a.id) cls.push("is-active");
            else if (net.done.has(a.id)) cls.push("is-done");
            const bubble = running ? net.bubbles[a.id] : null;
            const start = posRef.current[a.id] || home[a.id] || { x: VW / 2, y: VH / 2 };
            const down = start.y < VH * 0.34;
            return (
              <div key={a.id} className={cls.join(" ")} ref={el => { nodeRefs.current[a.id] = el; }}
                style={{ left: `${(start.x / VW) * 100}%`, top: `${(start.y / VH) * 100}%` }}>
                <div className={`lav-bubble${down ? " down" : ""}${bubble ? " show" : ""}`}>{bubble || ""}</div>
                <div className="lav-card">
                  <div className="lav-spin"/>
                  <div className="lav-ring"/>
                  <div className="lav-ava"><AgentAvatar who={a.id} size={50}/></div>
                  <div className="lav-code">{a.code}</div>
                  <div className="lav-name">{a.name}</div>
                  <div className="lav-role">{a.role}</div>
                  <div className="lav-slot"/>
                </div>
              </div>
            );
          })}
        </div>
      </div></div>
      <div className="lav-legend">
        <span><span className="sw" style={{ background: LINK_COLOR }}/>Link</span>
        <span><span className="sw" style={{ background: HANDOFF_COLOR }}/>Hand-off</span>
        <span><span className="sw" style={{ background: DISPATCH_COLOR }}/>Delegate</span>
        <span><span className="sw" style={{ background: REPORT_COLOR }}/>Report back</span>
        <span><span className="sw" style={{ background: REDISPATCH_COLOR }}/>Re-dispatch</span>
      </div>
    </div>
  );
}
