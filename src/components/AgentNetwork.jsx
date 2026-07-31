// DeepBench v7.0.9 | AgentNetwork.jsx | AA-179b -- assembly work on the canvas. The workers that
// build a prompt (the enrichment seam's fetches, Dan Bingham's REFLECT/Synthesis steps) walk on
// stage and light up like any engaged agent, in their own quiet-infrastructure tint (T.mutedDeep
// ring / T.muted bubble accent) -- and NEVER with an edge or a pulse. An arrow on this canvas means
// agent-reasoned routing (§19d) and nothing less; a worker rippling with no arrow touching it IS
// the visual statement "contributing to the prompt, nobody routed to it". Every visual added here
// is INERT until AA-179c ships the emit -- with no assembly frames in the ledger the derivation is
// byte-identical to LAV-1f's.
// DeepBench v7.0.6 | AgentNetwork.jsx | LAV-1f -- human-in-the-loop: while the harness holds a real
// confirmation gate open, a "You" node joins the canvas as the requesting agent's focus counterpart,
// a pulse hands control from that agent to the human, and the decision controls render on the node
// itself. The node exists ONLY while a real gate is open (or its decision is in flight) -- it is
// never decorative, never scripted, and nothing here resolves a gate on the human's behalf.
// DeepBench v7.0.2 | AgentNetwork.jsx | LAV-1c -- fills the node card's reserved slot with real
// data: the governed pattern name(s) for this node's latest credited span (the ai_call_patterns
// read-time view, via src/lib/tracePatterns.js -- the ONLY legitimate source of a pattern name),
// the model id from that agent's latest ai_activity_log row, and HAR-17's amber "recovering" chip
// while a hop of that agent's is being re-run. Unclassified renders NOTHING (§19l) -- there is no
// fallback label anywhere in this file. Also closes LAV-1b's canvas-fill QA finding: the stage is
// now contained inside the available height instead of overflowing it when the trace console is
// open (which would have letterboxed the SVG away from the node positions it has to line up with).
// DeepBench v7.0.1 | AgentNetwork.jsx | LAV-1b -- animated agent-network canvas for the Live Agent
// View: node cards, observed-traffic edges, hop pulses and the Choreographed/Static reorg, all
// rendered as a pure function of the harness event ledger the screen hands down. Ported from
// docs/channel-intelligence-v8-promptbox.html for LOOK AND MOTION ONLY -- that file's control flow
// (MISSIONS / setTimeout / Math.random / the hand-drawn EDGES topology) is a simulator and is
// deliberately NOT ported. Nothing here invents an agent, an edge, a pulse or a value.
// FEATURE: LAV-1b
import { useEffect, useMemo, useRef, useState } from "react";
import { T, PALETTE, mono, body, ACTION_TEXT_COLORS_FETCH } from "../tokens.js";
// FEATURE: LAV-1f -- UserAvatar is the platform's deliberate NON-agent "You" mark (MI-27,
// STYLE-GUIDE §17: the avatar-mandatory rule is scoped to agent attribution, and the human has no
// agent identity to represent). ConfirmationCardContent is CHI's own generic pending_confirmation
// renderer (MI-01d/CHI-50) -- reused verbatim so the proposal the human is deciding on is rendered
// by exactly one implementation platform-wide, with no copy authored here.
import { AgentAvatar, FeatureBadge, UserAvatar, ConfirmationCardContent } from "./SharedUI.jsx";
// FEATURE: LAV-1c -- the same module the Agent Routing drawer's pattern line joins through
// (LOG-79/LOG-95b). Reused verbatim: this file holds no pattern name, slug, or per-pattern branch.
import { fetchTracePatterns, needsSpanRefetch } from "../lib/tracePatterns.js";

// ── canvas space (ported viewBox) ────────────────────────────────────────────
const VW = 1200, VH = 640;
// Choreography anchors, ported verbatim from the prototype's computeTargets().
const LEAD = { x: 270, y: 305 }, MID = { x: 560, y: 305 }, STACKX = 1098;
const ARC_RX = 235, ARC_RY = 215, ARC_SPREAD = (162 * Math.PI) / 180;
// FEATURE: LAV-1f -- the human's anchor: LEAD mirrored across the canvas. While a gate is open the
// requesting agent IS the lead (see `lead` below), so the human materializes directly opposite the
// agent asking, and the hand-off pulse runs straight between the two. Derived from the ported
// choreography constants -- not a new hand-authored coordinate, and clear of the bench stack.
const YOU = { x: VW - LEAD.x, y: LEAD.y };
// The human's label. No code, no role -- deliberately not an agent card (STYLE-GUIDE §17).
const YOU_LABEL = "You";

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

// ── FEATURE: AA-179b -- the assembly seam's two frame types ──────────────────
// Spelled exactly as useHarnessStream.js's AA-179a branch appends them (~L181) and as AA-179c will
// emit them. Referenced through these constants everywhere below so the canvas can never drift from
// the hook's spelling without this one line changing with it.
export const ASSEMBLY_START = "assembly_work";
export const ASSEMBLY_COMPLETE = "assembly_work_complete";
export function isAssemblyHop(hop) {
  return hop?.type === ASSEMBLY_START || hop?.type === ASSEMBLY_COMPLETE;
}

// Assembly work is quiet infrastructure, not a routing decision: its own tint, distinct from brass
// (routing), CLICK blue (orchestrating), moss (complete) and flag (error/recovery).
export const ASSEMBLY_COLOR = T.mutedDeep;
export const ASSEMBLY_LEGEND_LABEL = "Assembly work";

// A missing count renders this, never 0-as-a-guess and never invented copy
// (.claude/rules/agent-section-rendering.md).
const ASSEMBLY_DASH = "—";
// Bubble copy for a fetch, keyed on the frame's OWN `source` field. An unlisted or absent source
// falls to the generic knowledge read -- it is still a real fetch that really happened, and the
// count is still the frame's own.
const ASSEMBLY_FETCH_COPY = {
  the_library:         (n) => `Data Room read · ${n} chunks`,
  the_library_catalog: (n) => `Data Room catalog · ${n}`,
  roster:              (n) => `Roster fetch · ${n} candidates`,
  the_reasoning:       (n) => `Reasoning Layer read · ${n}`,
};
// Dan Bingham's two model steps ripple WHILE running, so each has a start line and a complete line.
// The token clause exists only when the frame really carried tokens.
const ASSEMBLY_STEP_COPY = {
  reflect:   { start: "REFLECT · drafting execution plan", done: (tok) => `REFLECT · plan drafted${tok}` },
  synthesis: { start: "Synthesis · rewriting prompt",      done: (tok) => `Synthesis · prompt rewritten${tok}` },
};

// The bubble text for one assembly hop, composed from the frame's own fields ONLY. Returns null for
// a work kind this canvas has no approved copy for -- no bubble is the honest render, never a
// guessed label (§19l / .claude/rules/agent-section-rendering.md).
export function assemblyBubbleText(hop) {
  if (!isAssemblyHop(hop)) return null;
  const d = hop.data || {};
  if (d.work === "fetch") {
    const count = d.matchCount != null ? d.matchCount : ASSEMBLY_DASH;
    const copy = ASSEMBLY_FETCH_COPY[d.source];
    return copy ? copy(count) : `Knowledge read · ${count} chunks`;
  }
  const step = ASSEMBLY_STEP_COPY[d.work];
  if (!step) return null;
  if (hop.type === ASSEMBLY_START) return step.start;
  return step.done(d.tokens != null ? ` · ${d.tokens} tok` : "");
}

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
  // FEATURE: AA-179b -- `${agentId}|${work}` -> agentId, while that assembly step is unfinished.
  // Closed by its matching complete, or by ANY later real event for that agent (that agent has
  // visibly moved on) -- the same event-driven window semantics the rest of this file uses. Never
  // a timer: nothing here invents a duration.
  const assemblyOpen = new Map();
  let activeId = null;
  let activeIsAssembly = false;

  for (const h of runHops) {
    const id = h.agentId;
    const assembly = isAssemblyHop(h);
    if (id) {
      if (!engaged.includes(id)) engaged.push(id);
      // An assembly frame carries the hook's own composed `message` in data, which is plumbing
      // wording -- the canvas speaks the approved copy instead, built from the same real fields.
      const text = assembly
        ? assemblyBubbleText(h)
        : (h.data?.reasoning ?? h.data?.task ?? h.data?.message ?? null);
      if (text) bubbles[id] = text;
      activeId = id;
      activeIsAssembly = assembly;
    }
    if (h.type === ASSEMBLY_START && id) {
      assemblyOpen.set(`${id}|${h.data?.work ?? ""}`, id);
    } else if (id) {
      assemblyOpen.delete(`${id}|${h.data?.work ?? ""}`);
      for (const k of [...assemblyOpen.keys()]) if (k.startsWith(`${id}|`)) assemblyOpen.delete(k);
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
  // FEATURE: AA-179b -- who renders in the assembly tint: anyone holding an open step, plus the
  // agent whose OWN latest hop was an assembly frame. The second half is what gives a
  // completion-only frame (every fetch -- they emit no start) the standard short active window the
  // existing hop treatment already produces, in the assembly tint rather than routing brass.
  const assemblyActive = new Set(assemblyOpen.values());
  if (activeIsAssembly && activeId) assemblyActive.add(activeId);
  return { engaged, bubbles, openByTarget, orchestrators, done, activeId, edges, assemblyActive };
}

// A pulse is emitted per real delegation-family hop, on the real pair that hop crossed.
// `delegation` travels dispatcher -> target; a report-back (`delegation_return`, and
// `delegation_complete`, which is the same real event family closing the same real edge) travels
// back along it. A pair crossed a second time in one run is a re-dispatch.
export function pulsesForHop(hop, index, priorHops) {
  // FEATURE: AA-179b -- an assembly frame NEVER emits a pulse. Stated as an explicit type check
  // rather than left to fall through the delegation branches below on a missing secondaryAgentId:
  // the rule is "assembly work is not routing (§19d)", and a rule that holds only because a field
  // happens to be absent would break silently the day the emit carries one.
  if (isAssemblyHop(hop)) return [];
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
.lav-stagewrap{flex:1;position:relative;overflow:hidden;padding:10px 6px 6px;background:${T.paper};
  min-width:0;min-height:0}
.lav-stage{position:absolute;inset:10px 6px 6px;container-type:size}
/* FEATURE: LAV-1c -- LAV-1b QA finding (canvas fill). The stage box must CONTAIN the 1200x640
   canvas, not just cap its height: node cards are positioned as a % of this box while the SVG uses
   preserveAspectRatio="xMidYMid meet", so the two only line up while the box holds that exact
   ratio. A plain width:100% plus max-height:100% clamps the height and leaves the width alone --
   survivable at LAV-1b's full-height canvas, a visible edge/node mismatch now that the trace
   console takes 230px off the bottom. min() against the stage's own height (100cqh) picks
   whichever axis binds, so the stage always fits AND stays centered. The plain width:100% above
   it is a deliberate fallback for engines without container query units -- exactly LAV-1b's
   behaviour, never a collapsed shrink-to-fit box. */
.lav-inner{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:100%;
  width:min(100%, calc(100cqh * 1200 / 640));aspect-ratio:1200/640;max-height:100%}
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
/* FEATURE: LAV-1c -- the slot LAV-1b reserved, now filled. Still renders NOTHING without real
   data: no pattern match means no pill, no row means no model tag (§19l honest-unclassified). */
.lav-slot{height:15px;margin-top:4px;display:flex;align-items:center;justify-content:center;gap:4px}
.lav-pill{font-family:${mono};font-size:8.5px;font-weight:600;letter-spacing:.05em;color:${T.brassDeep};
  background:${rgba(T.brass, 0.14)};border:1px solid ${rgba(T.brass, 0.42)};border-radius:9px;
  padding:1px 6px;max-width:118px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lav-model{position:absolute;top:5px;right:6px;font-family:${mono};font-size:8px;color:${T.muted};
  max-width:62px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;z-index:3}
.lav-recov{font-family:${mono};font-size:8.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:${T.flag};background:${rgba(T.flag, 0.12)};border:1px solid ${rgba(T.flag, 0.45)};border-radius:9px;
  padding:1px 6px;white-space:nowrap}
.lav-node.is-recovering .lav-card{border-color:${T.flag};
  box-shadow:0 10px 26px ${rgba(T.flag, 0.28)},0 0 0 3px ${rgba(T.flag, 0.18)}}
.lav-ring{position:absolute;left:50%;top:32px;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;
  border:2px solid ${T.brass};opacity:0;pointer-events:none;z-index:1}
@keyframes lavRipple{0%{opacity:.75;transform:scale(.55)}100%{opacity:0;transform:scale(2.1)}}
.lav-node.is-active .lav-ring{animation:lavRipple 1.1s ease-out infinite}
.lav-node.is-active{transform:translate(-50%,-50%) scale(1.07);z-index:7}
.lav-node.is-active .lav-card{border-color:${T.brass};
  box-shadow:0 10px 26px ${rgba(T.brassDeep, 0.35)},0 0 0 3px ${rgba(T.brass, 0.18)}}
.lav-node.is-done .lav-card{border-color:${T.mossLight}}
/* FEATURE: AA-179b -- the assembly state. Same ripple keyframe as an active node (this really is
   the same "working right now" motion, and a second animation would imply a second meaning), in
   the palette's quiet-infrastructure register instead of routing brass. Slightly under is-active's
   scale/z so a real routing decision still reads as the loudest thing on the canvas. */
.lav-node.is-assembly .lav-ring{border-color:${ASSEMBLY_COLOR};animation:lavRipple 1.1s ease-out infinite}
.lav-node.is-assembly{transform:translate(-50%,-50%) scale(1.04);z-index:6}
.lav-node.is-assembly .lav-card{border-color:${ASSEMBLY_COLOR};
  box-shadow:0 8px 22px ${rgba(T.mutedDeep, 0.26)},0 0 0 3px ${rgba(T.muted, 0.16)}}
/* Mono micro-label on a paper bubble, per this file's caption idiom -- deliberately not the navy
   speech bubble a routed agent gets: this is instrumentation the prompt was built from, not an
   agent talking. */
.lav-node.is-assembly .lav-bubble{background:${T.card};color:${T.mutedDeep};
  border:1px solid ${rgba(T.muted, 0.55)};font-family:${mono};font-size:10.5px}
.lav-node.is-assembly .lav-bubble:after{border-top-color:${T.card}}
.lav-node.is-assembly .lav-bubble.down:after{border-top-color:transparent;border-bottom-color:${T.card}}
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
/* FEATURE: AA-179b -- a RING swatch, not a bar. The five bars above are edge/pulse colours; this
   one is a node state, and drawing it as a bar would imply an assembly edge exists. It never does. */
.lav-legend .sw-ring{width:11px;height:11px;border-radius:50%;border:2px solid ${ASSEMBLY_COLOR};
  background:transparent}
.lav-seg{position:absolute;left:12px;top:12px;display:flex;align-items:stretch;background:${T.card};
  border:1px solid ${T.line};border-radius:8px;overflow:hidden;z-index:8;box-shadow:0 2px 6px ${rgba(T.navy, 0.16)}}
.lav-seg .lbl{font-family:${mono};font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
  color:${T.muted};display:flex;align-items:center;padding:0 10px;border-right:1px solid ${T.line}}
.lav-seg button{border:none;background:transparent;font-family:${body};font-weight:600;font-size:11px;
  color:${T.muted};padding:6px 13px;cursor:pointer}
.lav-seg button.on{background:${T.navy};color:${T.card}}
/* FEATURE: LAV-1f -- the You node. Same node geometry as an agent card so it sits in the same
   choreography, deliberately different skin (dashed brass, no code/role row, silhouette avatar) so
   it can never be mistaken for an agent card. */
.lav-you{position:absolute;transform:translate(-50%,-50%);width:132px;text-align:center;z-index:9;
  animation:fadeIn .3s ease-out}
.lav-you-card{background:linear-gradient(180deg,${T.card},${T.cardAlt});border:1.5px dashed ${T.brass};
  border-radius:14px;padding:9px 7px 8px;box-shadow:0 10px 26px ${rgba(T.brassDeep, 0.35)}}
.lav-you-ava{width:50px;height:50px;margin:0 auto 4px;display:flex;align-items:center;justify-content:center}
.lav-you-name{font-family:${body};font-weight:700;font-size:12.5px;color:${T.navy};line-height:1.15}
.lav-you-panel{position:absolute;left:50%;top:calc(100% + 10px);transform:translateX(-50%);width:250px;
  background:${T.card};border:1px solid ${T.brass};border-radius:10px;padding:8px;text-align:left;
  box-shadow:0 12px 30px ${rgba(T.navy, 0.28)};z-index:30}
/* Copy and swatch are CHI's own NeedsDecisionBadge (MarketIntelligenceScreen.jsx ~L1209), verbatim. */
.lav-you-badge{display:inline-block;font-family:${mono};font-size:9px;padding:2px 7px;background:${T.brass};
  color:${T.card};border-radius:2px;text-transform:uppercase;letter-spacing:.02em;margin-bottom:6px}
.lav-you-scroll{max-height:170px;overflow:auto;margin-bottom:7px}
/* Buttons mirror CHI's ConfirmationCardActions (SharedUI.jsx ~L620) exactly -- same labels, same
   padding, same type, same navy-primary/outline-secondary split. */
.lav-you-actions{display:flex;gap:6px}
.lav-you-actions button{flex:1;padding:8px 6px;font-family:${body};font-size:11px;cursor:pointer}
.lav-you-actions button:disabled{cursor:default;opacity:.5}
.lav-you-reject{background:transparent;border:1px solid ${T.line};color:${T.ink}}
.lav-you-accept{background:${T.navy};color:${T.card};border:none;font-weight:600}
`;

/**
 * Pure presentation of the harness stream. No fetching, no timers that invent state.
 *  roster   -- agent objects that may appear on this canvas (idle baseline + anyone seen streaming)
 *  hops     -- every stored event observed this SESSION (edges persist across runs)
 *  runHops  -- the slice since the current run's question boundary (node state, pulses, bubbles)
 *  running  -- the harness is live right now
 *  traceRows -- this run's real ai_activity_log rows (the screen's poller); model tag only
 *  recoveringAgentId -- the agent HAR-17 is mid-recovery on, or null
 *  pending   -- LAV-1f: the harness's OPEN confirmation gate, verbatim off its frame, or null
 *  resolving -- LAV-1f: that same gate while the human's decision request is in flight, or null
 *  onResolveConfirmation -- LAV-1f: dispatches the human's decision ('accept' | 'reject')
 */
export default function AgentNetwork({ roster, hops, runHops, running, traceRows = [], recoveringAgentId = null, choreographed, onToggleChoreographed, pending = null, resolving = null, onResolveConfirmation = null }) {
  const ids = useMemo(() => roster.map(a => a.id), [roster]);
  const home = useMemo(() => homeLayout(ids), [ids]);
  const net = useMemo(() => deriveNetwork(runHops), [runHops]);
  const edges = useMemo(() => sessionEdges(hops, runHops, running), [hops, runHops, running]);

  // FEATURE: LAV-1f -- the human is on stage from the moment a real gate opens until the decision
  // it dispatched has come back. `gate` is the open gate (controls render only for it); `human` is
  // either that or the in-flight decision, which is what keeps the node present through the
  // hand-back instead of blinking out mid-pulse. Both are the hook's real request state.
  const gate = pending;
  const human = pending || resolving;
  const humanAgentId = human?.agentId ?? null;
  const requester = useMemo(
    () => (humanAgentId ? roster.find(a => a.id === humanAgentId) || null : null),
    [roster, humanAgentId]);

  // Lead = the agent actually holding an open delegation right now; else the first engaged agent.
  // While a gate is open that agent holds the focus by definition -- it is the one waiting on the
  // human -- so it takes the lead anchor and the human materializes opposite it.
  const lead = useMemo(() => {
    if (humanAgentId && ids.includes(humanAgentId)) return humanAgentId;
    const open = [...net.orchestrators];
    return open.length ? open[open.length - 1] : (net.engaged[0] ?? null);
  }, [net, humanAgentId, ids]);

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

  // ── LAV-1f: the two real hand-offs a gate produces, one pulse each, never repeated ──────────
  // Both use the report-back colour: control genuinely changes hands here (agent -> human, then
  // human -> agent), which is the same meaning REPORT_COLOR already carries on the legend -- not a
  // delegation. Keyed on the gate's own confirmation_id, so a pulse fires exactly once per real
  // gate and a re-render can never replay one.
  const gateArrivedRef = useRef(null);
  useEffect(() => {
    const cid = pending?.confirmation_id ?? null;
    if (!cid || gateArrivedRef.current === cid) return;
    gateArrivedRef.current = cid;
    const from = posRef.current[pending.agentId] || home[pending.agentId];
    if (!from) return;
    setPulses(cur => [...cur, { id: ++pulseIdRef.current, d: ePath(from, YOU), color: REPORT_COLOR }]);
  }, [pending, home]);

  const gateDispatchedRef = useRef(null);
  useEffect(() => {
    const cid = resolving?.confirmation_id ?? null;
    if (!cid || gateDispatchedRef.current === cid) return;
    gateDispatchedRef.current = cid;
    const to = posRef.current[resolving.agentId] || home[resolving.agentId];
    if (!to) return;
    setPulses(cur => [...cur, { id: ++pulseIdRef.current, d: ePath(YOU, to), color: REPORT_COLOR }]);
  }, [resolving, home]);

  // ── LAV-1c: node card data ────────────────────────────────────────────────
  // Each node's LATEST credited span this run. pickCreditedSpan() already decided which endpoint's
  // span a delegation-family event credits (§19p) and useHarnessStream spreads it into data --
  // this only picks the most recent one per agent, it never re-derives credit.
  const traceId = useMemo(() => {
    for (const h of runHops) { const t = h.data?.trace_id; if (t) return t; }
    return null;
  }, [runHops]);
  const spanByAgent = useMemo(() => {
    const m = new Map();
    for (const h of runHops) if (h.agentId && h.data?.span_id != null) m.set(h.agentId, h.data.span_id);
    return m;
  }, [runHops]);
  const spanKey = useMemo(() => [...spanByAgent.values()].join(","), [spanByAgent]);

  // The Agent Routing drawer's own join, reused: fetch the trace's span -> governed-name map, and
  // apply LOG-95b's BOUNDED refetch while any span on this canvas is still missing. After the
  // budget the span is honestly unclassified and simply shows no pill -- never a fallback label.
  const [spanPatterns, setSpanPatterns] = useState({});
  const spansRef = useRef([]);
  spansRef.current = spanKey ? spanKey.split(",") : [];
  useEffect(() => {
    if (!traceId) { setSpanPatterns({}); return undefined; }
    let cancelled = false, tries = 0, timer = null;
    const attempt = () => {
      fetchTracePatterns(traceId).then(map => {
        if (cancelled) return;
        setSpanPatterns(map);
        if (spansRef.current.some(s => needsSpanRefetch(map, s, tries))) {
          tries += 1;
          timer = setTimeout(attempt, 2500);
        }
      });
    };
    attempt();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [traceId, spanKey]);

  // Model tag: the model on that agent's most recent row in THIS trace. No row, no tag.
  const modelByAgent = useMemo(() => {
    const m = new Map();
    for (const r of traceRows || []) {
      if (!r?.agent_id || !r.model) continue;
      const at = Date.parse(r.created_at) || 0;
      const cur = m.get(r.agent_id);
      if (!cur || at >= cur.at) m.set(r.agent_id, { model: r.model, at });
    }
    return m;
  }, [traceRows]);

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
            const recovering = recoveringAgentId === a.id;
            if (recovering) cls.push("is-recovering");
            // FEATURE: AA-179b -- assembly outranks the plain active state so a fetch or a REFLECT
            // step can never light a node in routing brass, and outranks is-done so a worker
            // holding an open step keeps rippling after a later agent takes the active slot.
            if (net.orchestrators.has(a.id)) cls.push("is-orch");
            else if (running && net.assemblyActive.has(a.id)) cls.push("is-assembly");
            else if (running && net.activeId === a.id) cls.push("is-active");
            else if (net.done.has(a.id)) cls.push("is-done");
            const bubble = running ? net.bubbles[a.id] : null;
            const start = posRef.current[a.id] || home[a.id] || { x: VW / 2, y: VH / 2 };
            const down = start.y < VH * 0.34;
            const span = spanByAgent.get(a.id);
            const names = span != null ? spanPatterns[span] : null;
            const patternLabel = names && names.length > 0 ? names.join(", ") : null;
            const modelTag = modelByAgent.get(a.id)?.model || null;
            return (
              <div key={a.id} className={cls.join(" ")} ref={el => { nodeRefs.current[a.id] = el; }}
                style={{ left: `${(start.x / VW) * 100}%`, top: `${(start.y / VH) * 100}%` }}>
                <div className={`lav-bubble${down ? " down" : ""}${bubble ? " show" : ""}`}>{bubble || ""}</div>
                <div className="lav-card">
                  <div className="lav-spin"/>
                  <div className="lav-ring"/>
                  {modelTag && <div className="lav-model" title={modelTag}>{modelTag}</div>}
                  <div className="lav-ava"><AgentAvatar who={a.id} size={50}/></div>
                  <div className="lav-code">{a.code}</div>
                  <div className="lav-name">{a.name}</div>
                  <div className="lav-role">{a.role}</div>
                  <div className="lav-slot">
                    {recovering && <span className="lav-recov">recovering</span>}
                    {!recovering && patternLabel && <span className="lav-pill" title={patternLabel}>{patternLabel}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {/* FEATURE: LAV-1f -- the human on the canvas. Rendered ONLY while the harness really is
              holding a gate open (or the decision it was handed is still in flight); there is no
              decorative or demo state. The controls sit on the node because that is where control
              actually is right now. */}
          {human && (
            <div className="lav-you" style={{ left: `${(YOU.x / VW) * 100}%`, top: `${(YOU.y / VH) * 100}%` }}>
              <div className="lav-you-card">
                <div className="lav-you-ava"><UserAvatar size={50}/></div>
                <div className="lav-you-name">{YOU_LABEL}</div>
              </div>
              {gate && (
                <div className="lav-you-panel">
                  <div className="lav-you-badge">Needs Your Decision</div>
                  <div className="lav-you-scroll">
                    <ConfirmationCardContent agent={requester}
                      proposedAction={gate.proposed_action} critique={gate.critique}/>
                  </div>
                  <div className="lav-you-actions">
                    <button type="button" className="lav-you-reject" disabled={!onResolveConfirmation}
                      onClick={() => onResolveConfirmation?.("reject")}>
                      Reject
                    </button>
                    <button type="button" className="lav-you-accept" disabled={!onResolveConfirmation}
                      onClick={() => onResolveConfirmation?.("accept")}>
                      Accept
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div></div>
      <div className="lav-legend">
        <span><span className="sw" style={{ background: LINK_COLOR }}/>Link</span>
        <span><span className="sw" style={{ background: HANDOFF_COLOR }}/>Hand-off</span>
        <span><span className="sw" style={{ background: DISPATCH_COLOR }}/>Delegate</span>
        <span><span className="sw" style={{ background: REPORT_COLOR }}/>Report back</span>
        <span><span className="sw" style={{ background: REDISPATCH_COLOR }}/>Re-dispatch</span>
        {/* FEATURE: AA-179b -- the one node-state entry on this legend, and the reason the canvas
            can be read honestly: a ring with no arrow touching it is assembly work. */}
        <span><span className="sw-ring"/>{ASSEMBLY_LEGEND_LABEL}</span>
      </div>
    </div>
  );
}
