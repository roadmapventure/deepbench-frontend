// DeepBench v7.0.37 | AgentNetwork.jsx | MOB-4b -- below MOBILE_BREAKPOINT this canvas renders a
// DIFFERENT composition of the same derivations (STYLE-GUIDE 42), never a reflow of the desktop one:
// the desktop stage is a locked 1200x640 viewBox with 132px fixed-pixel cards and eleven of them do
// not fit 402px. Mobile gets two USER-PICKED views of the same real data -- Bench (the default) puts
// every agent in a permanent slot derived from its roster index, renders ONLY the agents this run
// actually called, and leaves an uncalled agent's slot empty because that gap is the information;
// Active blows the current hand-off up to two full-size cards. Nothing auto-switches: the toggle is
// the only thing that moves the view. The desktop LEAD-anchored choreography is deliberately absent
// -- mobile holds still so the user learns where to look, and that divergence is the feature. The
// "You" gate node has no mobile equivalent (a 38px avatar cannot hold a proposal, and the human has
// no roster index) so a real open gate raises a decision panel from the bottom of the CANVAS box
// instead, leaving the status strip and the routing feed readable while you decide. Every node,
// edge, colour and word here comes from the derivations and maps this file already had.
// DeepBench v7.0.38 | AgentNetwork.jsx | LAV-11 -- the Answer drawer's title is now conditional: it
// reads "Answer: Agent guardrail catch" when the run just completed was south-korea-coop (John's
// deliberate guardrail-catch demo question, LAV-11's other file), else the existing plain "Answer".
// Keyed on the QUESTION id (a new answerQuestionId prop, threaded from LiveAgentViewScreen.jsx),
// never on the gate outcome -- if this question ever starts clearing the pre-display gate, the
// resulting mislabel is CHI-98's concern to resolve, not this ticket's; flagged at the conditional.
// DeepBench v7.0.35 | AgentNetwork.jsx | LAV-10 -- the moment orchestration STARTS now declares itself.
// Until now an agent holding open delegations only got a different border/ring (is-orch) -- the same
// visual weight as every other card, with no announcement. On the rising edge of deriveNetwork's own
// `orchestrators` set (an agent that is NEWLY holding an open delegation, not one still holding one)
// a one-shot burst fires: a canvas-wide radial flash immediately, then ~150ms later -- while that
// flash is still fading, so the two read as one event -- the orchestrator's own card ripples, then
// each of its currently-engaged delegates in the order they joined, staggered ~100ms apart. That
// stagger IS the statement "one agent's loop requires all N of these agents at once", the same thing
// LAV-9a said with edges, said here with nodes. No new event type, no invented state, no new colour
// (BURST_COLOR is the exact token is-orch's own spin ring already means), and no spatial change:
// cards stay exactly where they already sit -- light and motion only, one shot, never persistent.
// DeepBench v7.0.31 | AgentNetwork.jsx | LAV-9b -- node/queue behaviour round 3b: an agent named as a
// delegation target joins the canvas at the moment it is ADDRESSED, not only once it has produced a
// credited hop of its own -- which is the single root cause behind a live line pointing at a card
// still shrunk in the queue (solid during the run, dashed after it: same node, same missing
// promotion). This deliberately makes the canvas's "engaged" a WIDER set than the AGENTS ENGAGED
// meter's (LiveAgentViewScreen.jsx's own independent count, untouched here): the canvas shows who
// was addressed, the counter shows who actually spoke, and the two are allowed to disagree. The
// black activity bubble is now gated on THAT agent currently pulsing rather than on the run merely
// being live, so a finished agent's last line stops hanging over its card while someone else works.
// Arc radii and the bench-stack step are retuned for breathing room between the 132px cards; no new
// token, no new control, and nothing here invents an agent, an edge or a state.
// DeepBench v7.0.30 | AgentNetwork.jsx | LAV-9a -- canvas round 3a: the resting-edge look stops being
// a spotlight. EVERY edge that has really carried traffic this run stays solid and arrow-animated at
// the same time, each in its OWN meaning colour (Delegate / Report back / Hand-off / Re-dispatch), so
// a busy run visibly shows N agents talking at once instead of one line moving while the rest sit
// static. Words are scarcer than lines: only the 2 most-recently-active edges carry a full-opacity
// label, the 3rd carries a fading one, older ones carry none. The moment the run ends the motion
// stops everywhere (motion means "happening right now") and a delegation left genuinely unresolved
// settles immediately into sessionEdges' own brass Hand-off look instead of being stuck in the
// in-flight blue forever. Replaces LAV-5b's single `litEdge`, which is deleted here. Nothing invents
// an edge or a colour: every line's colour is the last real pulse pulsesForHop() emitted on it.
// DeepBench v7.0.26 | AgentNetwork.jsx | LAV-7b -- canvas round 2b: the legend and the
// Choreographed/Static toggle move into ONE right-aligned row at the top of the canvas, the freed
// top-left corner takes a new "Answer" drawer (closed by default -- this screen is about the agent
// communication, and the answer is one click away for anyone who wants it), and a delegation that is
// GENUINELY still open (dispatched, no return yet) carries a small arrowhead travelling its line over
// and over until the real return event closes it. Nothing here invents an open state: the loop is
// mounted straight off deriveNetwork's existing openByTarget, with a minimum-lap floor so a
// near-instant hop still shows one readable pass -- and no ceiling, so a long call keeps looping for
// exactly as long as it is really open. LAV-5b's lit-edge/label mechanism is untouched and still
// governs every edge that is not currently open.
// DeepBench v7.0.20 | AgentNetwork.jsx | LAV-5b -- canvas round 1b: the segmented control drops its
// "Layout" label, the model tag reads the family name parsed off the real id (never a lookup table),
// a finished agent keeps the LAST pattern it was really classified on, and every routing pulse
// leaves its line lit in its meaning colour with the legend's own word riding the line until the
// next pulse fires. Nothing here invents a pattern, a label or an edge: an unclassified span still
// shows no pill (§19l) and a colour outside EDGE_MEANING_LABEL still renders no word.
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
// FEATURE: LAV-7b -- Drawer is the platform's one collapsible-section component; the Answer drawer is
// the same object every other drawer on the platform is, not a canvas-local panel.
import { AgentAvatar, FeatureBadge, UserAvatar, ConfirmationCardContent, Drawer } from "./SharedUI.jsx";
// FEATURE: LAV-1c -- the same module the Agent Routing drawer's pattern line joins through
// (LOG-79/LOG-95b). Reused verbatim: this file holds no pattern name, slug, or per-pattern branch.
import { fetchTracePatterns, needsSpanRefetch } from "../lib/tracePatterns.js";
// FEATURE: LAV-7b -- CHI's own terminal-answer card, reused verbatim (LAV-7a added the export and
// nothing else). The answer this screen shows and the answer CHI shows are rendered by exactly one
// implementation, so they can never drift; this file authors no answer markup of its own. Note
// QaEvidenceCard performs its own groupKeyDataPoints() call internally -- that grouping is therefore
// reused too, and is deliberately NOT re-imported here (an import this file never calls would be
// dead code, and re-deriving the groups would be the duplication the reuse exists to prevent).
import { QaEvidenceCard } from "../screens/MarketIntelligenceScreen.jsx";
// FEATURE: MOB-4b -- the platform's ONE breakpoint source (STYLE-GUIDE 22). This file asks no width
// question of its own; the hook is the only thing that decides which composition renders.
import { useIsMobile } from "../hooks/useIsMobile.js";

// ── canvas space (ported viewBox) ────────────────────────────────────────────
const VW = 1200, VH = 640;
// LAV-1c's bounded pattern-refetch gap, and LAV-5b's single post-terminal settle read. Both are
// waits, not schedules: nothing here polls and nothing here invents a duration.
const PATTERN_REFETCH_MS = 2500;
const PATTERN_SETTLE_MS = 2500;
// FEATURE: LAV-7b -- one lap of the open-delegation arrow, and the minimum-lap floor below. Same
// duration as the Pulse `dur` this canvas already uses, so the canvas has one motion language rather
// than two. Module scope because both LoopingArrow and the component's floor effect read it, and it
// must be exactly one value.
const LOOP_LAP_MS = 900;
// FEATURE: LAV-10 -- one-shot orchestration-start burst. BURST_COLOR reuses the exact token
// is-orch's own spin ring already means (~L607) -- this is more of that same signal, not a new one.
// CASCADE_GAP is deliberately shorter than CANVAS_MS so the canvas flash is still fading when the
// contributor cascade starts -- the two read as one connected event, not two.
export const BURST_COLOR = ACTION_TEXT_COLORS_FETCH.CLICK;
const BURST_CANVAS_MS = 450;
const BURST_CASCADE_GAP_MS = 150;
const BURST_STAGGER_MS = 100;
const BURST_RIPPLE_MS = 500;
// Choreography anchors, ported verbatim from the prototype's computeTargets().
const LEAD = { x: 270, y: 305 }, MID = { x: 560, y: 305 }, STACKX = 1098;
// FEATURE: LAV-9b -- widened ~17% so adjacent kids on the arc keep more chord distance between
// their 132px-wide cards when several agents are engaged at once (the crowding John flagged).
// Checked against the canvas's other fixed points at this new size: arc rightmost point
// (MID.x + ARC_RX = 835) still clears STACKX (1098) by 263px, and the arc's angular range never
// swings left of MID.x, so LEAD (270) is untouched -- this widening cannot newly overlap either.
const ARC_RX = 275, ARC_RY = 245, ARC_SPREAD = (162 * Math.PI) / 180;
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

// FEATURE: LAV-5b -- the legend's own words, keyed by the meaning colours defined immediately above.
// The lit-line label and the legend below both render from this one map, so they can never disagree,
// and a colour that is not a routing meaning (LINK_COLOR at rest, ASSEMBLY_COLOR) is deliberately
// absent: `get` returns undefined and the line carries NO word. Never a default label.
export const EDGE_MEANING_LABEL = new Map([
  [DISPATCH_COLOR,   "Delegate"],
  [REPORT_COLOR,     "Report back"],
  [REDISPATCH_COLOR, "Re-dispatch"],
  [HANDOFF_COLOR,    "Hand-off"],
]);

// FEATURE: LAV-5b -- "claude-haiku-4-5-20251001" -> "Haiku". Parsed from the real id, never a lookup
// table of models; an id that doesn't match the claude-<family> shape renders verbatim (honest
// fallback, never invented). The full id stays on the element's title either way.
export function modelFamily(modelId) {
  if (typeof modelId !== "string") return null;
  const m = modelId.match(/^claude-([a-z]+)/);
  if (!m) return modelId;
  return m[1].charAt(0).toUpperCase() + m[1].slice(1);
}

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
  // FEATURE: LAV-9b-patch -- `engaged` (widened by LAV-9b) now means "on stage" -- true the instant an
  // agent is named as a delegation target, before it has said anything. `selfEngaged` is the narrower,
  // pre-LAV-9b meaning -- "has a hop really credited to its own id" -- kept separately so `done` below
  // can still test the ORIGINAL condition instead of inheriting the widened one. Without this, a
  // freshly-addressed-but-silent agent (in `engaged`, not `activeId`, not an orchestrator) fell into
  // `done` and wore the finished-look moss border before it had done anything.
  const selfEngaged = new Set();
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
      selfEngaged.add(id);
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
      // FEATURE: LAV-9b -- a delegation target is "on stage" the moment it's named, not only once it
      // produces its own credited hop. Deliberately a DIFFERENT definition of "engaged" than
      // LiveAgentViewScreen.jsx's AGENTS ENGAGED meter, which stays scoped to "actually produced a
      // credited event" -- confirmed with John: the canvas shows "addressed," the counter shows
      // "actually spoke," and the two are allowed to disagree. This is the single root cause behind
      // all three of John's "not coming forward" symptoms (solid line to a still-queued node during
      // the run, dashed line to a still-queued node after it -- same node, same missing promotion).
      if (!engaged.includes(h.secondaryAgentId)) engaged.push(h.secondaryAgentId);
    }
    if (h.type === "delegation_complete" || h.type === "delegation_return") {
      if (id) { openByTarget.delete(id); finished.add(id); }
    }
  }

  const orchestrators = new Set([...openByTarget.values()]);
  const done = new Set([...selfEngaged, ...finished].filter(a => a !== activeId && !orchestrators.has(a)));
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

// FEATURE: LAV-9a -- an edge is ONE physical line, drawn in the direction its delegation first ran; a
// report-back travels that SAME line backwards. So activity has to be folded on the pair, not on the
// direction: `pulsesForHop` emits a report-back as target->dispatcher, which is the reverse of the
// only key `sessionEdges` ever creates, and keying activity directionally would mean REPORT_COLOR
// could never reach a rendered line at all. This is the exact direction-agnostic rule LAV-5b's
// deleted `isLitEdge()` carried inline; it is preserved here as a named key so the fold, the render
// lookup and the ranking all agree by construction rather than by three matching call sites.
export function canonicalEdgeKey(from, to) {
  return from <= to ? edgeKey(from, to) : edgeKey(to, from);
}

// FEATURE: LAV-9a -- every edge's own last-known meaning colour and how recently it last carried a
// pulse, folded once over this run's hops. No new imperative pulse-tracking state: the existing
// pulsesForHop() already knows exactly which hops are real pulses and what colour each one is; this
// just keeps the LAST one per edge instead of only the single most-recent one across all edges.
// `order` is the fold index of that edge's last pulse -- ranking by it (descending) is the entire
// "most recent N" rule below, with no separate timer-based bookkeeping duplicating the ledger.
export function edgeActivity(runHops) {
  const colors = new Map();   // canonical key -> meaning colour
  const order = new Map();    // canonical key -> fold index of its last pulse
  runHops.forEach((h, i) => {
    for (const p of pulsesForHop(h, i, runHops.slice(0, i))) {
      const k = canonicalEdgeKey(p.from, p.to);
      colors.set(k, p.color);
      order.set(k, i);
    }
  });
  return { colors, order };
}

// FEATURE: LAV-9a -- the last-N-labels-visible rule, as a pure rank lookup: the 2 most-recently-
// active edges get a full-opacity label, the 3rd gets a fading one, anything older gets none. A
// single named export so the render loop and the Node test both read the exact same tiers.
export const LABEL_FULL_COUNT = 2;
export const LABEL_FADE_COUNT = 3;
export function labelOpacityForRank(rank) {
  if (rank < 0) return 0;
  if (rank < LABEL_FULL_COUNT) return 1;
  if (rank < LABEL_FADE_COUNT) return 0.45;
  return 0;
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

// FEATURE: MOB-4b -- mobile Bench slots. Returns PERCENTAGES of the mobile stage box, the same
// units the desktop node cards already position in. index is the agent's index in the roster
// array, never its position in the engaged list -- that is the whole point: an agent occupies the
// same slot on every run, so the user learns where to look. roster[0] takes the hub; the rest ring
// around it. Nothing here names an agent, so a 12th agent joining the mi bench group claims the
// next slot with no code change, exactly as homeLayout() behaves today.
export function mobileSlot(index, total) {
  if (index === 0) return { x: 50, y: 52 };
  const n = Math.max(1, total - 1);
  const ang = (-90 + (index - 1) * (360 / n)) * Math.PI / 180;
  return { x: 50 + 38 * Math.cos(ang), y: 52 + 35 * Math.sin(ang) };
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
    // FEATURE: LAV-9b -- bench-stack cards render at 0.56 scale (~67px tall); the old 52px step cap
    // meant adjacent queued cards could overlap. Raised the cap and the total span so the stack has
    // room to breathe within the canvas's 640px height (VH) without changing the queue's meaning.
    const m = order.length, step = m > 1 ? Math.min(58, 520 / (m - 1)) : 0, y0 = 305 - (step * (m - 1)) / 2;
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

// FEATURE: LAV-5b -- where one edge's word sits and how it is turned, so it rides the line rather
// than floating beside it. ePath() draws a quadratic with control point `c`; its t=0.5 point is
// (a + 2c + b)/4 and its tangent there is parallel to the chord, so the chord's own angle is the
// reading angle. A label that would come out upside-down is turned 180 degrees -- it always reads
// left-to-right, whichever way the edge runs.
export function edgeLabelTransform(a, b) {
  if (!a || !b) return null;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, c = 18;
  const cx = mx + nx * c, cy = my + ny * c;
  const x = (a.x + 2 * cx + b.x) / 4, y = (a.y + 2 * cy + b.y) / 4;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;   // (-180, 180]
  if (angle > 90) angle -= 180;
  else if (angle <= -90) angle += 180;                // folded into (-90, 90]: always readable
  return `translate(${x} ${y}) rotate(${angle})`;
}

// FEATURE: LAV-5b (Task 3) -- the pill an agent keeps. Walks that agent's own spans newest-first and
// returns the first one the Log Displayer really classified, so a finished agent keeps the LAST
// pattern it was credited with instead of blanking the moment its final span happens to be an
// unclassified one. Returns null when NO span of that agent's is classified -- there is no fallback
// label anywhere in this file (§19l / .claude/rules/ai-pattern-signature.md).
export function latestClassifiedPattern(spans, spanPatterns) {
  if (!Array.isArray(spans) || !spanPatterns) return null;
  for (let i = spans.length - 1; i >= 0; i--) {
    const names = spanPatterns[spans[i]];
    if (names && names.length > 0) return names.join(", ");
  }
  return null;
}

// FEATURE: MOB-4b -- the one glow filter Pulse and LoopingArrow both reference, lifted out of the
// desktop svg's inline <defs> so BOTH canvases define it. An svg element whose filter url does not
// resolve is not painted at all, so a mobile arrow inside an svg that never declared lavGlow would
// silently vanish. Same markup, same id, and only one of the two canvases is ever mounted.
function LavGlowDefs() {
  return (
    <defs>
      <filter id="lavGlow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="4" result="lavBlur"/>
        <feMerge><feMergeNode in="lavBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  );
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

// ── FEATURE: LAV-7b -- the open-delegation arrow ─────────────────────────────
// A small arrowhead travelling repeatedly from `d`'s start to its end for as long as this component
// is mounted. It has NO opinion about when it should stop: the caller mounts it exactly while the
// edge is visually open, which is what keeps "is this delegation still open?" a single question
// answered in one place. Position comes from getPointAtLength (the same technique Pulse already
// uses); the rotation is taken from a 1px look-ahead sample so the head visibly points along the
// direction of travel rather than sitting at a fixed angle.
function LoopingArrow({ d, color }) {
  const pathRef = useRef(null);
  const arrowRef = useRef(null);
  useEffect(() => {
    const path = pathRef.current, arrow = arrowRef.current;
    if (!path || !arrow) return undefined;
    const total = path.getTotalLength() || 1;
    let raf = 0;
    const t0 = performance.now();
    const frame = (now) => {
      const len = ((now - t0) % LOOP_LAP_MS) / LOOP_LAP_MS * total;
      const p = path.getPointAtLength(len);
      const ahead = path.getPointAtLength(Math.min(total, len + 1));
      const angle = (Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180) / Math.PI;
      arrow.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${angle})`);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [d]);
  return (
    <g>
      <path ref={pathRef} d={d} fill="none" stroke="none"/>
      <polygon ref={arrowRef} points="-6,-4 6,0 -6,4" fill={color} filter="url(#lavGlow)"/>
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
/* FEATURE: LAV-10 -- the canvas-wide flash, a radial wash that fades in and out once. Lives inside
   .lav-inner (clipped to the 1200x640 canvas itself), so it never covers the Answer drawer/legend/
   toggle, which sit outside .lav-stage entirely. */
@keyframes lavOrchFlash{0%{opacity:0}18%{opacity:.55}100%{opacity:0}}
.lav-orch-flash{position:absolute;inset:0;pointer-events:none;z-index:10;
  background:radial-gradient(circle at 50% 50%, ${rgba(BURST_COLOR, 0.55)}, transparent 70%);
  animation:lavOrchFlash ${BURST_CANVAS_MS}ms ease-out}
/* FEATURE: LAV-10 -- one contributor's own one-shot ripple, brighter/faster than is-active's
   continuous lavRipple. MUST come after .is-active/.is-assembly's own .lav-ring rules above in
   source order: CSS does not merge two matching rules' animation shorthand, the later one in the
   stylesheet wins outright, and a contributor mid-burst can carry is-active/is-assembly/is-orch at
   the same time as is-orch-burst. NOTE this whole block lives inside a JS template literal, so a
   backtick in a CSS comment here would end the string -- keep this comment backtick-free. The
   "both" fill-mode holds the 0% state during each node's own
   animation-delay, so a later contributor in the cascade stays invisible until its turn instead of
   flashing early. */
@keyframes lavOrchBurstRipple{0%{opacity:0;transform:scale(.5)}15%{opacity:.9}100%{opacity:0;transform:scale(2.6)}}
.lav-node.is-orch-burst .lav-ring{border-color:${BURST_COLOR};border-width:3px;
  animation:lavOrchBurstRipple ${BURST_RIPPLE_MS}ms ease-out both}
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
/* FEATURE: LAV-7b -- legend and toggle now share ONE right-aligned row at the top of the canvas
   (legend first, then the buttons), which is what frees the top-left corner for the Answer drawer.
   The row is the only thing positioned: both children keep their own internal layout exactly as
   before and simply sit in normal flow inside it. Clear of the 300px Agent Routing rail, which is
   the screen's sibling element and outside this box entirely. */
.lav-topright{position:absolute;right:12px;top:12px;display:flex;align-items:center;gap:10px;z-index:8}
.lav-legend{display:flex;gap:12px;flex-wrap:wrap;font-family:${body};
  font-size:9.5px;color:${T.muted};background:${rgba(T.card, 0.82)};border:1px solid ${T.line};
  border-radius:20px;padding:6px 11px}
.lav-legend span{display:inline-flex;align-items:center;gap:5px}
.lav-legend .sw{width:15px;height:3px;border-radius:2px}
/* FEATURE: AA-179b -- a RING swatch, not a bar. The five bars above are edge/pulse colours; this
   one is a node state, and drawing it as a bar would imply an assembly edge exists. It never does. */
.lav-legend .sw-ring{width:11px;height:11px;border-radius:50%;border:2px solid ${ASSEMBLY_COLOR};
  background:transparent}
.lav-seg{display:flex;align-items:stretch;background:${T.card};flex-shrink:0;
  border:1px solid ${T.line};border-radius:8px;overflow:hidden;box-shadow:0 2px 6px ${rgba(T.navy, 0.16)}}
.lav-seg button{border:none;background:transparent;font-family:${body};font-weight:600;font-size:11px;
  color:${T.muted};padding:6px 13px;cursor:pointer}
.lav-seg button.on{background:${T.navy};color:${T.card}}
/* FEATURE: LAV-7b -- the Answer drawer takes the slot .lav-seg just vacated, at the same z-index, so
   nothing else on this canvas needs its stacking order changed. */
.lav-answer{position:absolute;left:12px;top:12px;width:280px;z-index:8}
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

/* ── FEATURE: MOB-4b -- the mobile composition ───────────────────────────────
   Everything below is reached ONLY through the isMobile branch; not one rule above is touched, so
   the desktop canvas is byte-identical to what it renders today. The mobile canvas reuses
   .lav-stagewrap/.lav-stage as its box, but never .lav-inner: that box is locked to
   aspect-ratio:1200/640 for the desktop viewBox and would letterbox this layout away. */
/* One chrome row: legend hard left, view toggle hard right, nothing in the middle -- which is what
   lets the legend grow rightward as more edge meanings light up (MOB-5 accepts the wrap past 3). */
.lav-mchrome{position:absolute;left:8px;right:8px;top:7px;z-index:6;display:flex;align-items:center;
  justify-content:space-between;gap:8px}
.lav-mlegend{min-height:19px;display:flex;align-items:center;flex-wrap:wrap;gap:7px;padding:0 7px;
  border-radius:8px;border:1px solid ${T.line};background:${rgba(T.paper, 0.94)};
  font-family:${mono};font-size:7px;color:${T.muted};line-height:1}
.lav-mlegend span{display:inline-flex;align-items:center;gap:3px}
.lav-mlegend .sw{width:11px;height:2px;border-radius:1px;flex:none}
/* A RING, not a bar -- assembly work is a node state and never an edge, exactly as the desktop
   legend's own sw-ring says. */
.lav-mlegend .sw-ring{width:9px;height:9px;border-radius:50%;border:2px solid ${ASSEMBLY_COLOR};
  background:transparent;flex:none}
.lav-mseg{display:flex;align-items:stretch;height:19px;flex:none;margin-left:auto;padding:1px;
  background:${T.card};border:1px solid ${T.brass};border-radius:20px;
  box-shadow:0 2px 7px ${rgba(T.navy, 0.14)}}
.lav-mseg button{position:relative;border:none;background:none;border-radius:20px;cursor:pointer;
  font-family:${mono};font-size:7.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:${T.muted};padding:3px 8px}
/* The visual height matches the legend's 19px; this transparent box takes the TOUCH target to ~36px
   without changing one pixel of layout, so matching the legend costs nothing in tappability. */
.lav-mseg button::after{content:"";position:absolute;left:0;right:0;top:-9px;bottom:-9px}
.lav-mseg button.on{background:${T.brass};color:${T.card}}
/* An explicit class, never a bare descendant selector: a .lav-stage-descendant svg rule also
   matches the AgentAvatar svg inside every node and stretches each one to the container width
   (found live in the mock -- 44px avatars blew up to 126px and collapsed the cards). NOTE this
   block lives inside a JS template literal: a backtick in a CSS comment here ends the string. */
.lav-medges{position:absolute;inset:0;width:100%;height:100%;overflow:visible;z-index:1}
/* Bench node: an avatar, its code and its first name. No card, so the state distinctions live on
   the avatar's own glow instead of a card border -- same five meanings, same tokens. */
.lav-mnode{position:absolute;transform:translate(-50%,-50%);width:56px;text-align:center;z-index:2}
.lav-mava{width:38px;height:38px;margin:0 auto;display:flex;align-items:center;justify-content:center;
  transition:filter .3s}
.lav-mcode{font-family:${mono};font-size:7px;font-weight:700;letter-spacing:.06em;color:${T.muted};
  text-transform:uppercase;margin-top:2px;line-height:1.1}
.lav-mname{font-family:${body};font-size:8px;font-weight:600;color:${T.navy};line-height:1.1}
.lav-mnode.is-recovering .lav-mava{filter:drop-shadow(0 0 7px ${rgba(T.flag, 0.9)})}
.lav-mnode.is-active .lav-mava{filter:drop-shadow(0 0 8px ${rgba(T.brass, 0.9)})}
.lav-mnode.is-done .lav-mava{filter:drop-shadow(0 0 5px ${rgba(T.mossLight, 0.85)})}
.lav-mnode.is-assembly .lav-mava{filter:drop-shadow(0 0 7px ${rgba(ASSEMBLY_COLOR, 0.85)})}
.lav-mnode.is-orch .lav-mava{filter:drop-shadow(0 0 9px ${rgba(ACTION_TEXT_COLORS_FETCH.CLICK, 0.9)})}
/* Active view's connector: positioned HTML in the same percentage space the two cards are laid out
   in, deliberately NOT an svg in a preserveAspectRatio box -- that drifts off the cards at stage
   heights nobody tested (found live in the mock). Colour and word are the edge's own. */
.lav-mconn{position:absolute;left:50%;top:37%;bottom:39%;width:0;z-index:1}
.lav-mconn .ln{position:absolute;left:-1.2px;top:0;bottom:9px;width:2.4px}
.lav-mconn.up .ln{top:9px;bottom:0}
.lav-mconn .hd{position:absolute;left:-6px;bottom:0;width:0;height:0;
  border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid transparent}
.lav-mconn.up .hd{bottom:auto;top:0;border-top:none;border-bottom:9px solid transparent}
.lav-mconn .wd{position:absolute;left:9px;top:50%;transform:translateY(-50%);font-family:${mono};
  font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
/* The decision panel. Anchored to the bottom of the CANVAS box, not the screen, so the status strip
   and the pinned routing feed stay readable while the human decides -- and capped at 74% so the
   hops that led to the decision are still on screen behind it. */
.lav-mgate{position:absolute;left:0;right:0;bottom:0;z-index:20;max-height:74%;display:flex;
  flex-direction:column;background:${T.card};border-top:2px solid ${T.brass};
  border-radius:14px 14px 0 0;box-shadow:0 -10px 30px ${rgba(T.navy, 0.3)}}
.lav-mgate-grab{width:34px;height:4px;border-radius:3px;background:${T.line};margin:7px auto 4px}
.lav-mgate-badge{font-family:${mono};font-size:8.5px;font-weight:700;letter-spacing:.11em;
  text-transform:uppercase;color:${T.brassDeep};padding:0 13px 7px}
.lav-mgate-body{flex:1;min-height:0;overflow-y:auto;padding:0 13px}
.lav-mgate-actions{display:flex;gap:9px;padding:11px 13px 14px;flex:none}
.lav-mgate-actions button{flex:1;min-height:44px;border-radius:7px;border:none;cursor:pointer;
  font-family:${body};font-size:14px;font-weight:700}
.lav-mgate-actions button:disabled{cursor:default;opacity:.5}
.lav-mgate-reject{background:${T.card};border:1.5px solid ${T.flag};color:${T.flag}}
.lav-mgate-accept{background:${T.navy};color:${T.card}}
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
 *  answerQa   -- LAV-7b: the run's real terminal answer in QaEvidenceCard's shape, or null (LAV-7a)
 *  answerText -- LAV-7b: that same terminal turn's plain message when it is not a qa result, or null
 *  answerQuestionId -- LAV-11: the id of the question that produced the current answer (captured at
 *    Run-click time by LiveAgentViewScreen.jsx), or null. Drives the Answer drawer's title only.
 */
export default function AgentNetwork({ roster, hops, runHops, running, traceRows = [], recoveringAgentId = null, choreographed, onToggleChoreographed, pending = null, resolving = null, onResolveConfirmation = null, answerQa = null, answerText = null, answerQuestionId = null }) {
  const ids = useMemo(() => roster.map(a => a.id), [roster]);
  const home = useMemo(() => homeLayout(ids), [ids]);
  const net = useMemo(() => deriveNetwork(runHops), [runHops]);
  const edges = useMemo(() => sessionEdges(hops, runHops, running), [hops, runHops, running]);
  // FEATURE: LAV-9a -- what each line has really carried this run, and how recently. Both are pure
  // folds over runHops, so a re-render can never disagree with the ledger the way the old imperative
  // single-lit-edge state could. `recentOrder` is most-recent-first; an edge's index in it IS its
  // rank, which is the whole input to the label tiers.
  const activity = useMemo(() => edgeActivity(runHops), [runHops]);
  const recentOrder = useMemo(
    () => [...activity.order.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k),
    [activity]);

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
  // FEATURE: LAV-5b -- the on-line words move with their lines. The tick below repositions edge
  // paths imperatively while the choreography settles; a label left at its last render position
  // would visibly drift off its line, so it is re-placed in the same loop from the same positions.
  const labelRefs = useRef({});
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
      const a = posRef.current[e.from], b = posRef.current[e.to];
      const el = edgeRefs.current[e.key];
      if (el) el.setAttribute("d", ePath(a, b));
      const lab = labelRefs.current[e.key];
      const tr = lab && edgeLabelTransform(a, b);
      if (tr) lab.setAttribute("transform", tr);
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

  // ── FEATURE: LAV-7b -- which delegations are genuinely still open, and the visual floor ─────
  // The real open/closed state comes straight off deriveNetwork's existing openByTarget
  // (targetId -> dispatcherId while unreturned) -- no new event tracking, and nothing here can
  // report an edge open that the ledger does not really show open.
  const openEdgeKeys = useMemo(
    () => new Set([...net.openByTarget.entries()].map(([to, from]) => edgeKey(from, to))),
    [net]);

  // The VISUAL open state, deliberately decoupled from the real one by a floor: once an edge opens it
  // stays visually open for at least LOOP_LAP_MS even if the real delegation has already closed, so a
  // near-instant hop still shows one full readable pass instead of a flash. Never a ceiling -- a
  // genuinely long-open delegation keeps looping for its real duration, untouched.
  const openSinceRef = useRef(new Map());          // edgeKey -> ms timestamp first observed open
  const [visuallyOpenKeys, setVisuallyOpenKeys] = useState(() => new Set());
  useEffect(() => {
    const now = Date.now();
    // FEATURE: LAV-9a -- only a LIVE run can put an edge into the visually-open state. Guarding this
    // on `running` is what makes the settle below final: this updater also writes openSinceRef, and
    // React runs it during the following render (after the loop below has already run), so without
    // the guard a key cleared on the terminal pass would be re-added a moment later and stay stuck.
    if (running) {
      setVisuallyOpenKeys(prev => {
        const next = new Set(prev);
        for (const k of openEdgeKeys) {
          if (!openSinceRef.current.has(k)) openSinceRef.current.set(k, now);
          next.add(k);
        }
        return next;
      });
    }
    const timers = [];
    for (const [k, since] of openSinceRef.current) {
      // FEATURE: LAV-9a -- while the run is still going, a key the ledger still calls open has
      // nothing to schedule (it may yet close for real). Once the run is over, nothing can close it
      // any further -- every tracked key settles immediately, floor included, so a delegation left
      // genuinely unresolved at terminal can never get stuck looping past the run that opened it.
      // Root cause of the stuck arrow: this effect only re-ran when `openEdgeKeys` changed
      // reference, and once the last hop lands `runHops` stops changing -- so nothing ever fired
      // again to release it. `running` in the dep array below is what wakes it at terminal.
      if (openEdgeKeys.has(k) && running) continue;
      const remaining = running ? LOOP_LAP_MS - (now - since) : 0;
      const clear = () => {
        openSinceRef.current.delete(k);
        setVisuallyOpenKeys(prev => { const n = new Set(prev); n.delete(k); return n; });
      };
      if (remaining <= 0) clear(); else timers.push(setTimeout(clear, remaining));
    }
    return () => timers.forEach(clearTimeout);
  }, [openEdgeKeys, running]);

  // ── pulses: one per newly-observed delegation-family hop, on the real pair it crossed ──
  const [pulses, setPulses] = useState([]);
  const seenRef = useRef(0);
  const pulseIdRef = useRef(0);
  useEffect(() => {
    // FEATURE: LAV-7b -- the open-loop ledger resets on exactly the same question boundary the
    // pulse/lit-edge ledger already does. A new question is a new run: an edge left open by the
    // previous one is not open now, and must not keep looping into the next question.
    if (runHops.length < seenRef.current) {
      seenRef.current = 0; setPulses([]);
      openSinceRef.current.clear(); setVisuallyOpenKeys(new Set());
      return;
    }
    if (runHops.length === seenRef.current) return;
    // FEATURE: LAV-9a -- this effect now drives ONLY the travelling `Pulse` dots (the in-flight
    // dispatch/return animation). The resting look of every line comes from edgeActivity(), a pure
    // fold over the same runHops -- so there is no longer any imperative "which line is lit" state
    // to keep in sync with the ledger, and no batch-ordering rule deciding which single edge wins.
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

  // ── FEATURE: LAV-10 -- the orchestration-start burst ────────────────────────
  // Rising-edge detection on deriveNetwork's own `orchestrators` set: no new event type, no
  // invented state. `knownOrchestratorsRef` is everyone already seen orchestrating THIS run;
  // anyone in `net.orchestrators` not yet in it just started, which is the one moment this burst is
  // for -- not every render while it continues. Resets on the same runHops-length-shrink signal
  // every other run-scoped ledger in this file already uses for "a new question started" (see the
  // pulses effect above).
  const knownOrchestratorsRef = useRef(new Set());
  const burstLenRef = useRef(0);
  const burstKeyRef = useRef(0);
  const burstTimerRef = useRef(null);
  const [burst, setBurst] = useState(null); // { contributors: string[], key: number } | null
  useEffect(() => {
    if (runHops.length < burstLenRef.current) knownOrchestratorsRef.current = new Set();
    burstLenRef.current = runHops.length;

    const fresh = [...net.orchestrators].filter(id => !knownOrchestratorsRef.current.has(id));
    net.orchestrators.forEach(id => knownOrchestratorsRef.current.add(id));
    if (!fresh.length) return;

    // Contributors: the newest orchestrator, then whichever currently-engaged agents are its arc
    // "kids" right now -- computeTargets already treats every engaged id except the lead as one arc
    // (~L403), so this reuses that exact set instead of inventing a parallel notion of "who's
    // involved." If two agents somehow both start orchestrating in the same tick (the ledger
    // doesn't rule it out), the last of the batch is the one this fires for -- the same last-wins
    // convention this file already uses for a batch of pulses.
    const orchestratorId = fresh[fresh.length - 1];
    const kids = net.engaged.filter(id => id !== orchestratorId);
    const contributors = [orchestratorId, ...kids];

    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    burstKeyRef.current += 1;
    setBurst({ contributors, key: burstKeyRef.current });
    const totalMs = BURST_CASCADE_GAP_MS + contributors.length * BURST_STAGGER_MS + BURST_RIPPLE_MS;
    burstTimerRef.current = setTimeout(() => setBurst(null), totalMs);
  }, [net, runHops.length]);
  useEffect(() => () => { if (burstTimerRef.current) clearTimeout(burstTimerRef.current); }, []);

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
  // The spans each node was credited with this run. pickCreditedSpan() already decided which
  // endpoint's span a delegation-family event credits (§19p) and useHarnessStream spreads it into
  // data -- everything below only groups and orders those, it never re-derives credit.
  // FEATURE: LAV-5b (Task 3 root cause, diagnosed live on the dev preview 2026-07-31) -- EVERY trace
  // this run touched, in arrival order, not just the first frame's. A run is not one trace: each
  // top-level capability execution opens its own `trace_id` (measured live: one Live Agent View run
  // spanned `846b5223…`, `15ebefd7…` and `573b2569…`, with the run's agents split across all three).
  // LAV-1c joined patterns for the FIRST trace only, so an agent whose latest credited span belonged
  // to a later trace could never be in the map -- which is why a pill that was showing mid-run went
  // blank the moment that agent moved into the next trace, and why every finished agent ended empty.
  // This is the same set the screen's own row poller already reads over (LiveAgentViewScreen's
  // `traceKey`), derived here from the ledger this component is given -- no new source.
  const traceKey = useMemo(() => {
    const out = [];
    for (const h of runHops) { const t = h.data?.trace_id; if (t && !out.includes(t)) out.push(t); }
    return out.join(",");
  }, [runHops]);
  // Every span each agent was credited with this run, oldest first, deduped. LAV-1c kept only the
  // latest; the list is what lets a finished agent fall back to the last span it was really
  // classified on when its final span happens to carry no gold-pattern match.
  const spansByAgent = useMemo(() => {
    const m = new Map();
    for (const h of runHops) {
      if (!h.agentId || h.data?.span_id == null) continue;
      const list = m.get(h.agentId) || [];
      const s = String(h.data.span_id);
      const at = list.indexOf(s);
      if (at !== -1) list.splice(at, 1);
      list.push(s);
      m.set(h.agentId, list);
    }
    return m;
  }, [runHops]);
  const spanKey = useMemo(
    () => [...spansByAgent.values()].map(l => l.join("+")).join(","), [spansByAgent]);

  // The Agent Routing drawer's own join, reused per trace and merged: span ids are UUIDs, so the
  // union is unambiguous. LOG-95b's BOUNDED refetch still applies while any span on this canvas is
  // missing. After the budget the span is honestly unclassified and simply shows no pill -- never a
  // fallback label. The per-trace fan-out stays bounded because a new span cancels the in-flight
  // chain (the cleanup below) rather than stacking a second one on top of it.
  const [spanPatterns, setSpanPatterns] = useState({});
  const spansRef = useRef([]);
  spansRef.current = spanKey ? spanKey.split(/[,+]/).filter(Boolean) : [];
  useEffect(() => {
    const traces = traceKey ? traceKey.split(",") : [];
    if (!traces.length) { setSpanPatterns({}); return undefined; }
    let cancelled = false, tries = 0, timer = null;
    const attempt = () => {
      Promise.all(traces.map(t => fetchTracePatterns(t))).then(maps => {
        if (cancelled) return;
        const merged = Object.assign({}, ...maps);
        setSpanPatterns(merged);
        if (spansRef.current.some(s => needsSpanRefetch(merged, s, tries))) {
          tries += 1;
          timer = setTimeout(attempt, PATTERN_REFETCH_MS);
        }
      });
    };
    attempt();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [traceKey, spanKey]);

  // FEATURE: LAV-5b (Task 3) -- ONE last read after the run goes terminal, and only on the
  // running->false edge. The rows a run's final calls write land slightly after the stream ends, and
  // by then the bounded budget above may already be spent; without this a span classified in those
  // last moments would stay pill-less until the next question. Merged, never replaced: it covers the
  // same traces, so it can only add -- and a transient fetch error (which returns {}) can therefore
  // never blank a pill that is already on screen. Fires once and is cleared with the effect: not a
  // poller, and it never re-arms while the canvas sits idle.
  const wasRunningRef = useRef(running);
  useEffect(() => {
    const was = wasRunningRef.current;
    wasRunningRef.current = running;
    const traces = traceKey ? traceKey.split(",") : [];
    if (!was || running || !traces.length) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      Promise.all(traces.map(t => fetchTracePatterns(t))).then(maps => {
        if (cancelled) return;
        setSpanPatterns(cur => Object.assign({}, cur, ...maps));
      });
    }, PATTERN_SETTLE_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [running, traceKey]);

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

  // ── FEATURE: MOB-4b -- the mobile canvas ───────────────────────────────────
  // Every hook below runs on both paths (they are declared unconditionally, above the branch), so
  // crossing the breakpoint swaps the composition and nothing else. Not one derivation is repeated
  // here: the engaged set, the edges, each edge's meaning colour and recency, the open-delegation
  // set, the gate and the per-agent model/pattern reads are all the same values the desktop render
  // consumes twenty lines below.
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState("bench");

  // The mobile edge layer draws in CSS-PIXEL space (viewBox == the stage's own measured box), which
  // is what lets ePath's ported control offset and LoopingArrow's arrowhead keep the size they were
  // drawn for. A viewBox in percentage units would either bow the curve across a fifth of the canvas
  // or, with preserveAspectRatio="none", stretch both non-uniformly at every stage height.
  const mStageRef = useRef(null);
  const [mBox, setMBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = mStageRef.current;
    if (!el) return undefined;
    const measure = () => setMBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile]);

  // Bench membership: the roster, with each agent's PERMANENT slot from its own roster index, minus
  // everyone this run did not call. net.engaged is deriveNetwork's own set (widened by LAV-9b to
  // "addressed", the same set the desktop cards read) -- there is no second engaged set anywhere.
  const benchNodes = useMemo(() => {
    const total = roster.length;
    return roster
      .map((a, i) => ({ a, slot: mobileSlot(i, total) }))
      .filter(({ a }) => net.engaged.includes(a.id));
  }, [roster, net]);
  // Slot -> pixel, for the edge layer. An agent with no entry here was not called, and every edge
  // touching it is skipped rather than drawn to a point where nothing is rendered.
  const benchPoints = useMemo(() => {
    const m = new Map();
    for (const n of benchNodes) m.set(n.a.id, { x: (n.slot.x / 100) * mBox.w, y: (n.slot.y / 100) * mBox.h });
    return m;
  }, [benchNodes, mBox]);

  // Each real observed edge with the look the desktop loop already gives it -- open beats pulsed
  // beats resting, motion only while the run is live. Folded once here so the render below stays a
  // map, and so the legend can read the same colours the lines are actually drawn in.
  const mobileEdges = useMemo(() => edges.map(e => {
    const open = visuallyOpenKeys.has(e.key);
    const ck = canonicalEdgeKey(e.from, e.to);
    const pulsed = activity.colors.get(ck) || null;
    const active = recentOrder.indexOf(ck) !== -1;
    return {
      key: e.key, from: e.from, to: e.to, handoff: e.handoff, active,
      stroke: open ? DISPATCH_COLOR : (pulsed || e.color),
      animated: open || (running && !!pulsed),
      arrowColor: open ? DISPATCH_COLOR : pulsed,
    };
  }), [edges, visuallyOpenKeys, activity, recentOrder, running]);

  // The legend's words are EDGE_MEANING_LABEL's, in the map's own order -- nothing is authored here
  // and nothing re-orders as meanings arrive. Only the meanings this run has REALLY produced are
  // listed, which is what keeps the row near the three items 402px fits; a colour the map has no
  // word for (LINK_COLOR at rest) contributes none, exactly as the on-line label rule already works.
  // Past three the row wraps and eats canvas height -- known, accepted, tracked as MOB-5.
  const mobileLegend = useMemo(() => {
    const lit = new Set(mobileEdges.map(e => e.stroke));
    return [...EDGE_MEANING_LABEL.keys()].filter(c => lit.has(c));
  }, [mobileEdges]);
  // Gated on `running` for the same reason the node class is: assemblyActive can still hold an
  // agent after the stream ends, and a legend entry for a tint no node is wearing would be a word
  // with nothing on the canvas behind it.
  const mobileAssemblyLit = running && net.assemblyActive.size > 0;

  // Active view's subject: the most recently active edge (recentOrder is already ranked by the fold
  // index of each edge's last real pulse). recentOrder holds CANONICAL keys, which are direction-
  // agnostic by design, so the dispatcher/recipient split comes from sessionEdges' own entry -- that
  // key is only ever minted from a real `delegation` event and therefore always runs dispatcher->target.
  const activeHandoff = useMemo(() => {
    const ck = recentOrder[0];
    if (!ck) return null;
    const e = edges.find(x => canonicalEdgeKey(x.from, x.to) === ck);
    if (!e) return null;
    return { from: e.from, to: e.to, color: activity.colors.get(ck) || e.color };
  }, [recentOrder, edges, activity]);
  const agentById = useMemo(() => new Map(roster.map(a => [a.id, a])), [roster]);

  // The desktop node card, rendered at a mobile position. Same classes, same state chain, same slot
  // contents -- the Active view is the desktop card at a different coordinate, not a second card.
  const mobileFullCard = (a, topPct) => {
    if (!a) return null;
    const cls = ["lav-node"];
    const recovering = recoveringAgentId === a.id;
    if (recovering) cls.push("is-recovering");
    if (net.orchestrators.has(a.id)) cls.push("is-orch");
    else if (running && net.assemblyActive.has(a.id)) cls.push("is-assembly");
    else if (running && net.activeId === a.id) cls.push("is-active");
    else if (net.done.has(a.id)) cls.push("is-done");
    const pulsing = net.orchestrators.has(a.id)
      || (running && (net.assemblyActive.has(a.id) || net.activeId === a.id));
    const bubble = pulsing ? net.bubbles[a.id] : null;
    const patternLabel = latestClassifiedPattern(spansByAgent.get(a.id), spanPatterns);
    const modelTag = modelByAgent.get(a.id)?.model || null;
    return (
      <div key={a.id} className={cls.join(" ")} style={{ left: "50%", top: `${topPct}%` }}>
        <div className={`lav-bubble${topPct < 34 ? " down" : ""}${bubble ? " show" : ""}`}>{bubble || ""}</div>
        <div className="lav-card">
          <div className="lav-spin"/>
          <div className="lav-ring"/>
          {modelTag && <div className="lav-model" title={modelTag}>{modelFamily(modelTag)}</div>}
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
  };

  if (isMobile) {
    // The Active connector points the way the edge's own meaning runs: a report-back really did
    // travel this same physical line backwards (the rule canonicalEdgeKey already encodes), so its
    // arrowhead sits at the top rather than contradicting the word beside it.
    const connReversed = activeHandoff?.color === REPORT_COLOR;
    const connWord = activeHandoff ? (EDGE_MEANING_LABEL.get(activeHandoff.color) ?? null) : null;
    const soloAgent = net.activeId ? agentById.get(net.activeId) : null;
    return (
      <div className="lav-stagewrap">
        <FeatureBadge id="MOB-4"/>
        <style>{NET_CSS}</style>
        <div className="lav-stage" ref={mStageRef}>
          {/* Chrome: legend hard left, view toggle hard right, one row. The Choreographed/Static
              control is deliberately absent -- it tunes a choreography this layout does not use. */}
          <div className="lav-mchrome">
            {(mobileLegend.length > 0 || mobileAssemblyLit) && (
              <div className="lav-mlegend">
                {mobileLegend.map(c => (
                  <span key={c}><span className="sw" style={{ background: c }}/>{EDGE_MEANING_LABEL.get(c)}</span>
                ))}
                {mobileAssemblyLit && <span><span className="sw-ring"/>{ASSEMBLY_LEGEND_LABEL}</span>}
              </div>
            )}
            <div className="lav-mseg">
              <button type="button" className={mobileView === "active" ? "on" : ""}
                onClick={() => setMobileView("active")}>Active</button>
              <button type="button" className={mobileView === "bench" ? "on" : ""}
                onClick={() => setMobileView("bench")}>Bench</button>
            </div>
          </div>

          {mobileView === "bench" ? (
            <>
              {/* The real observed edges, between the two agents' own permanent slots -- never a hub
                  star. The desktop travelling Pulse dots are absent by construction: their `d` was
                  baked in the 1200x640 space at emit time and means nothing here; the looping arrow
                  on every live edge is the same motion carried by geometry this canvas owns. */}
              {mBox.w > 0 && (
                <svg className="lav-medges" viewBox={`0 0 ${mBox.w} ${mBox.h}`}>
                  <LavGlowDefs/>
                  {mobileEdges.map(e => {
                    const a = benchPoints.get(e.from), b = benchPoints.get(e.to);
                    if (!a || !b) return null;
                    const d = ePath(a, b);
                    return (
                      <g key={e.key}>
                        <path d={d} fill="none" stroke={e.stroke} strokeLinecap="round"
                          strokeWidth={(e.animated || e.active || e.handoff) ? 2.2 : 1.6}
                          strokeDasharray={(e.animated || e.active) ? undefined : "2 7"}
                          opacity={(e.animated || e.active) ? 1 : 0.9}/>
                        {e.animated && <LoopingArrow d={d} color={e.arrowColor}/>}
                      </g>
                    );
                  })}
                </svg>
              )}
              {benchNodes.map(({ a, slot }) => {
                const cls = ["lav-mnode"];
                if (recoveringAgentId === a.id) cls.push("is-recovering");
                if (net.orchestrators.has(a.id)) cls.push("is-orch");
                else if (running && net.assemblyActive.has(a.id)) cls.push("is-assembly");
                else if (running && net.activeId === a.id) cls.push("is-active");
                else if (net.done.has(a.id)) cls.push("is-done");
                return (
                  <div key={a.id} className={cls.join(" ")}
                    style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
                    <div className="lav-mava"><AgentAvatar who={a.id} size={38}/></div>
                    <div className="lav-mcode">{a.code}</div>
                    <div className="lav-mname">{String(a.name || "").split(" ")[0]}</div>
                  </div>
                );
              })}
            </>
          ) : activeHandoff ? (
            <>
              {mobileFullCard(agentById.get(activeHandoff.from), 24)}
              <div className={`lav-mconn${connReversed ? " up" : ""}`}>
                <div className="ln" style={{ background: activeHandoff.color }}/>
                <div className="hd" style={connReversed
                  ? { borderBottomColor: activeHandoff.color }
                  : { borderTopColor: activeHandoff.color }}/>
                {connWord && <div className="wd" style={{ color: activeHandoff.color }}>{connWord}</div>}
              </div>
              {mobileFullCard(agentById.get(activeHandoff.to), 76)}
            </>
          ) : (
            /* No hand-off yet: the agent actually working, alone and centred. No active agent means
               an empty canvas -- there is no placeholder card here, ever. */
            mobileFullCard(soloAgent, 50)
          )}

          {/* The decision panel replaces desktop's "You" node treatment wholesale. Gated on the SAME
              open gate desktop gates its own panel on: `resolving` keeps desktop's node on stage
              through the hand-back, but it carries only { confirmation_id, agentId, capability_slug,
              resolution } -- no proposed_action, no critique -- and it stays set for the whole
              re-entered run, so a panel held open on it would cover 74% of a live canvas with an
              empty card. Tapping Accept closes it, which is the behaviour the QA checklist asks for.
              Every word inside is the gate's own or CHI's own; nothing is authored here. */}
          {gate && (
            <div className="lav-mgate">
              <div className="lav-mgate-grab"/>
              <div className="lav-mgate-badge">Needs Your Decision</div>
              <div className="lav-mgate-body">
                <ConfirmationCardContent agent={requester}
                  proposedAction={gate.proposed_action} critique={gate.critique}/>
              </div>
              <div className="lav-mgate-actions">
                <button type="button" className="lav-mgate-reject" disabled={!onResolveConfirmation}
                  onClick={() => onResolveConfirmation?.("reject")}>
                  Reject
                </button>
                <button type="button" className="lav-mgate-accept" disabled={!onResolveConfirmation}
                  onClick={() => onResolveConfirmation?.("accept")}>
                  Accept
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="lav-stagewrap">
      <FeatureBadge id="LAV-1"/>
      <style>{NET_CSS}</style>
      {/* FEATURE: LAV-7b -- the answer, one click away and closed by default. This screen exists to
          show the agent communication, not the answer; the answer is available to anyone who wants
          it and never competes with the canvas for attention. The card is CHI's own QaEvidenceCard,
          rendered by the one implementation platform-wide. The empty state is screen chrome (the
          same register as the rail's own empty text), never a stand-in for an agent's words. */}
      <div className="lav-answer">
        {/* FEATURE: LAV-9a -- a long answer used to grow straight past the canvas: this drawer had no
            height cap at all. Same props the Agent Routing drawer already uses (MI-34/MI-55) --
            Drawer applies overflowY:auto itself the moment maxHeight is passed, so this is the
            existing mechanism, not a new one. */}
        {/* FEATURE: LAV-11 -- title keyed on the QUESTION id, not the gate outcome (John's literal
            spec). If south-korea-coop ever starts passing the pre-display gate, this label would
            then read as a guardrail catch that didn't happen -- that mislabel edge is CHI-98's to
            resolve, not this ticket's. */}
        <Drawer title={answerQuestionId === "south-korea-coop" ? "Answer: Agent guardrail catch" : "Answer"}
          defaultOpen={false} maxHeight={280} resizable>
          {answerQa
            ? <QaEvidenceCard qa={answerQa}/>
            : answerText
              ? <div style={{ fontFamily: body, fontSize: 11.5, lineHeight: 1.5, color: T.ink }}>{answerText}</div>
              : <div style={{ fontFamily: body, fontSize: 11.5, color: T.muted, fontStyle: "italic" }}>
                  No answer yet — appears here once a run completes.
                </div>}
        </Drawer>
      </div>
      {/* FEATURE: LAV-7b -- legend then toggle, one row, top-right. */}
      <div className="lav-topright">
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
        <div className="lav-seg">
          <button className={choreographed ? "on" : ""} onClick={() => onToggleChoreographed(true)}>Choreographed</button>
          <button className={choreographed ? "" : "on"} onClick={() => onToggleChoreographed(false)}>Static</button>
        </div>
      </div>
      <div className="lav-stage"><div className="lav-inner">
        <svg className="lav-svg" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet">
          <LavGlowDefs/>
          <g>
            {/* FEATURE: LAV-9a -- no spotlight. EVERY edge this run has really carried traffic on is
                drawn solid in its OWN last meaning colour, and every one of them is arrow-animated
                simultaneously while the run is live -- that simultaneity IS the statement "N agents
                are talking at once", which a single lit line could never make. Motion means
                "happening right now", so it stops everywhere the moment `running` goes false; the
                colours stay, because what those lines carried is still true after the run.
                Words are scarcer than lines: rank 0-1 full, rank 2 fading, older silent, so a busy
                canvas stays readable instead of stacking a word onto every line. The word itself
                still comes from EDGE_MEANING_LABEL keyed on the colour actually drawn, so a line
                with no real pulse this run (LINK_COLOR at rest, not in the map) carries none.
                An edge that is genuinely still open keeps taking precedence, in the delegation
                colour with NO word: a static "Delegate" beside a moving arrow would contradict
                itself -- the motion already says it is in flight, and the word's job is to describe
                a line that has stopped. */}
            {edges.map(e => {
              const open = visuallyOpenKeys.has(e.key);
              // Direction-agnostic on the pair: a report-back really did cross THIS line, backwards.
              const ck = canonicalEdgeKey(e.from, e.to);
              const pulsed = activity.colors.get(ck) || null;
              const rank = recentOrder.indexOf(ck);
              const active = rank !== -1;                 // carried a real pulse this run
              const stroke = open ? DISPATCH_COLOR : (pulsed || e.color);
              const animated = open || (running && !!pulsed);
              const arrowColor = open ? DISPATCH_COLOR : pulsed;
              const labelOpacity = labelOpacityForRank(rank);
              const label = open || !active ? null : (EDGE_MEANING_LABEL.get(pulsed) ?? null);
              const a = posRef.current[e.from] || home[e.from];
              const b = posRef.current[e.to] || home[e.to];
              return (
                <g key={e.key}>
                  <path ref={el => { edgeRefs.current[e.key] = el; }} d={ePath(a, b)}
                    fill="none" stroke={stroke} strokeWidth={(animated || active || e.handoff) ? 2.2 : 1.6}
                    strokeDasharray={(animated || active) ? undefined : "2 7"} strokeLinecap="round"
                    opacity={(animated || active) ? 1 : 0.9}/>
                  {animated && <LoopingArrow d={ePath(a, b)} color={arrowColor}/>}
                  {label && (
                    <text ref={el => { labelRefs.current[e.key] = el; }}
                      transform={edgeLabelTransform(a, b) || undefined} textAnchor="middle" dy="-5"
                      style={{ fontFamily: body, fontSize: 9.5, fill: T.muted, opacity: labelOpacity,
                        transition: "opacity .8s" }}>{label}</text>
                  )}
                </g>
              );
            })}
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
            // FEATURE: LAV-10 -- additive, not exclusive with the state classes above: a card can be
            // is-active/is-orch AND is-orch-burst at once while its cascade turn plays.
            const burstIdx = burst ? burst.contributors.indexOf(a.id) : -1;
            if (burstIdx !== -1) cls.push("is-orch-burst");
            // FEATURE: LAV-9b -- the bubble is gated on THIS agent currently carrying one of the
            // three pulsing states above (is-orch / is-assembly / is-active), not on the whole run
            // merely being live. Previously any agent that had ever produced text kept showing it
            // for the rest of the run, even long after moving to is-done and someone else becoming
            // active. Mirrors the class-assignment conditions immediately above exactly, so the
            // black bubble and the node's own pulsing skin can never disagree.
            const pulsing = net.orchestrators.has(a.id)
              || (running && (net.assemblyActive.has(a.id) || net.activeId === a.id));
            const bubble = pulsing ? net.bubbles[a.id] : null;
            const start = posRef.current[a.id] || home[a.id] || { x: VW / 2, y: VH / 2 };
            const down = start.y < VH * 0.34;
            // FEATURE: LAV-5b -- the LAST pattern this agent was really classified on, kept after
            // the run ends. Null when none of its spans matched a gold pattern: still no pill, still
            // no fallback label (§19l).
            const patternLabel = latestClassifiedPattern(spansByAgent.get(a.id), spanPatterns);
            const modelTag = modelByAgent.get(a.id)?.model || null;
            return (
              <div key={a.id} className={cls.join(" ")} ref={el => { nodeRefs.current[a.id] = el; }}
                style={{ left: `${(start.x / VW) * 100}%`, top: `${(start.y / VH) * 100}%` }}>
                <div className={`lav-bubble${down ? " down" : ""}${bubble ? " show" : ""}`}>{bubble || ""}</div>
                <div className="lav-card">
                  <div className="lav-spin"/>
                  {/* FEATURE: LAV-10 -- this contributor's own place in the cascade, expressed as
                      the one-shot ripple's start delay. Nothing else about the ring changes. */}
                  <div className="lav-ring"
                    style={burstIdx !== -1
                      ? { animationDelay: `${BURST_CASCADE_GAP_MS + burstIdx * BURST_STAGGER_MS}ms` }
                      : undefined}/>
                  {/* FEATURE: LAV-5b -- the family name, so the tag stays clear of the avatar; the
                      full id is one hover away. The overflow/ellipsis rule above stays as the safety
                      net for an id that doesn't parse and therefore renders verbatim. */}
                  {modelTag && <div className="lav-model" title={modelTag}>{modelFamily(modelTag)}</div>}
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
        {/* FEATURE: LAV-10 -- keyed so React remounts it (restarting the CSS animation) every time a
            new orchestration starts, even if one is still finishing. */}
        {burst && <div key={`lav-orch-flash-${burst.key}`} className="lav-orch-flash"/>}
      </div></div>
    </div>
  );
}
