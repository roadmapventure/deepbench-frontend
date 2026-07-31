// DeepBench v7.0.6 | LiveAgentViewScreen.jsx | LAV-1f -- human-in-the-loop: the mode badge gains a
// steady "Awaiting confirmation" state for as long as the harness really is holding a confirmation
// gate open, the status strip carries CHI's own "Needs Your Decision" copy and the gate frame's own
// capability, and the gate + its resolve dispatcher are wired through to the canvas so the human
// joins it. Also drops LAV-1b's hardcoded title status word for FOCUS_AREA_STATUS.liveAgentView.
// DeepBench v7.0.3 | LiveAgentViewScreen.jsx | LAV-1d -- the prompt box (the assembled system
// prompt, exposed for the first time: real streamed text, 2-line clamp, click to expand), and
// full-turn coverage -- a CHI turn is up to THREE top-level calls, each minting its own trace_id,
// so the poller now queries the whole set (`.in`) and every meter/console/waterfall figure derives
// over the union instead of the first trace alone (measured under-count: 13.1k of ~43k tokens).
// Eleanor Voss — The Librarian's broker rows carry trace_id: null (AA-179's blind edge) and are
// deliberately rendered nowhere here rather than fudged in by timestamp.
// DeepBench v7.0.2 | LiveAgentViewScreen.jsx | LAV-1c -- adds the run's bounded trace-row poller
// (one interval, one row store, keyed on the run's real trace_id), the four title-bar meters, and
// the HARNESS TRACE console/waterfall below the canvas. Every figure here is row-derived: it comes
// from ai_activity_log read by trace_id -- the same read-time posture as the pattern pill
// (LOG-79/LOG-95b) -- plus the live event ledger LAV-1b already keeps. Meters tick stepwise as rows
// land; that is the honest cadence and it is deliberately not smoothed or interpolated. The prompt
// box and every HITL affordance remain OMITTED, not faked -- they arrive with LAV-1d.
// DeepBench v7.0.1 | LiveAgentViewScreen.jsx | LAV-1b -- the Live Agent View at its permanent route
// /live-agent-view: title bar + question picker wired to useHarnessStream(), a status strip whose
// mode badge / question / elapsed all derive from the real stream, the animated agent-network canvas
// (AgentNetwork.jsx) and CHI's own AuditColumn as the right rail.
// FEATURE: LAV-1c
import { useState, useEffect, useMemo, useRef } from "react";
import { T, PALETTE, display, body, mono, FOCUS_AREA_STATUS, FOCUS_STATUS_STYLE, ACTION_TEXT_COLORS_FETCH } from "../tokens.js";
import { AppShell } from "../AppShell.jsx";
import { FeatureBadge } from "../components/SharedUI.jsx";
import { useAgents, useAgentActivitySummary } from "../hooks/useAgents.js";
import { useHarnessStream } from "../hooks/useHarnessStream.js";
import { AuditColumn } from "./MarketIntelligenceScreen.jsx";
import AgentNetwork from "../components/AgentNetwork.jsx";
import { STATIC_QUESTION, ROTATING_POOL, FIXED_DRAWER_TAIL } from "../data/chiQuestions.js";
import { supabase } from "../lib/supabase.js";
// FEATURE: LAV-1c -- the EST. COST meter's sumCost() delegates row-by-row to computeCallCost()
// (AA-181, useAIActivity.js), the platform's single pricing source. No local pricing lives here.
import HarnessTraceConsole, {
  deriveActiveSpans, peakActiveSpans, sumTokens, sumCost, formatTokens,
} from "../components/HarnessTraceConsole.jsx";

// FEATURE: LAV-1b -- the roster tab this focus area owns. Agents declare membership per-agent via
// `benchGroups` (verified in src/data/agents.js); BENCH_FILTERS' "mi" row is the Channel Sales Intel
// tab. Deriving the idle baseline from that field is what keeps this file free of a hand-listed
// agent roster -- adding an agent to the tab puts it on this canvas with no code change.
const MI_ROSTER_TAB = "mi";

// FEATURE: LAV-1b -- CHI's own loop scope, mirrored verbatim from MarketIntelligenceScreen.jsx
// (~L2537) so this rail's Agents drawer counts exactly the rows CHI's does. It is NOT imported:
// the const is module-private there and this session's scope rules forbid touching that file, and
// passing `null` instead would silently widen every figure in the shared drawer to each agent's
// platform-wide total. Contains no agent ids -- it is an ai_type/feature-prefix filter.
const MI_LOOP_SCOPE = {
  aiTypes: [
    "channel-intelligence", "hypothesis-evaluation", "quality-gate", "pipeline-triage",
    "memory-consolidation", "data-analysis",
    "project-manager", "screen-controls", "agent-directory",
    "librarian", "librarian-write", "data-room-custody",
    "reflect", "synthesis",
    "guardrails-check",
    "html-display",
  ],
  featurePrefixes: [
    "channel-intelligence:", "hypothesis-evaluation:", "quality-gate:", "pipeline-triage:",
    "data-analysis:", "memory-consolidation:", "data-room-custody:",
    "project-manager:agent-selection-intent:",
    "screen-controls:qa-answer-format:", "screen-controls:intelligence-review-format:",
    "html-display:",
  ],
};

// FEATURE: LAV-1b -- page identity. John's explicit dual-naming call (2026-07-31): the page title
// and the nav label are deliberately different strings and are not to be unified. The nav label is
// LAV-1e's job; nothing in this file touches nav.
const PAGE_TITLE = "Live Multi-Agent Routing";
const PAGE_SUBTITLE = "Harness, Loop, Pattern Behavior Display";
const IDLE_QUESTION_COPY = "Standing by — harness idle.";
const PICKER_PLACEHOLDER = "Choose a question and watch the agents work…";

const ALL_QUESTIONS = [STATIC_QUESTION, ...ROTATING_POOL, ...FIXED_DRAWER_TAIL];

// FEATURE: LAV-1c -- the real ai_activity_log columns this screen reads, verified fresh against
// lib/activity-log.js's writer (~L75-96). Explicit list, not `*`: this is a 3-second poll on a
// large table and nothing on this screen reads a column outside it.
const TRACE_ROW_COLUMNS =
  "model, input_tokens, output_tokens, latency_ms, dispatch_latency_ms, trace_id, span_id, parent_span_id, feature, call_facts, created_at, agent_id";
const TRACE_POLL_MS = 3000;
const TRACE_SETTLE_MS = 2000;

// Mirrors MarketIntelligenceScreen.jsx's formatElapsed/formatExpectation (~L619/L673) exactly --
// same "Xm Ys"/"Xs" units, same 5-second rounding on the estimate. Reimplemented rather than
// exported from that file because this session must not modify it.
function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
function formatExpectation(ms) {
  const roundedSec = Math.ceil(ms / 1000 / 5) * 5;
  const m = Math.floor(roundedSec / 60);
  const s = roundedSec % 60;
  return m > 0 ? `expect > ${m}m ${s}s` : `expect > ${s}s`;
}

// ── Task 3: mode badge, derived from the run's real events ───────────────────
// Routing is the default while a run is live; the first real `delegation_return` (control handed
// back to a dispatcher -- execute.js L762) is what proves the loop is orchestrating.
// FEATURE: LAV-1f -- `awaiting` outranks every other state: a run holding a real confirmation gate
// has a terminal frame (the gate IS the frame the harness returned) and is not running, so without
// this it would read "Complete" while the harness is in fact stopped, waiting on a human. It is
// driven only by the hook's real gate state -- there is no way to reach it without one.
export function deriveMode(runHops, { running, terminal, awaiting = false }) {
  if (awaiting) return "awaiting";
  if (terminal) return terminal === "error" ? "error" : "complete";
  if (!running) return "idle";
  return runHops.some(h => h.type === "delegation_return") ? "orch" : "route";
}

const MODE_COPY = { idle: "Idle", route: "Routing", orch: "Orchestrating", awaiting: "Awaiting confirmation", complete: "Complete", error: "Error" };

function ModeBadge({ mode, detail }) {
  const tint = {
    idle:     { fg: T.muted,     br: T.line },
    route:    { fg: T.brassDeep, br: T.brass },
    orch:     { fg: ACTION_TEXT_COLORS_FETCH.CLICK, br: ACTION_TEXT_COLORS_FETCH.CLICK },
    // FEATURE: LAV-1f -- brass family, and deliberately the brassGlow token, whose single documented
    // job (tokens.js, CHI-05) is the "needs your input" surface. Steady: only `orch` animates, and
    // a pulsing badge would read as work in progress when nothing is progressing.
    awaiting: { fg: T.brassDeep, br: T.brassGlow },
    complete: { fg: T.moss,      br: T.moss },
    error:    { fg: T.flag,      br: T.flag },
  }[mode];
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:7,flexShrink:0,fontFamily:body,fontSize:11,
      fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",padding:"5px 12px",borderRadius:20,
      border:`1.5px solid ${tint.br}`,color:tint.fg,background:T.card}}>
      <span style={{width:9,height:9,borderRadius:"50%",background:tint.br,
        animation: mode === "orch" ? "aiBlink 1.1s ease-in-out infinite" : "none"}}/>
      <span>{MODE_COPY[mode]}</span>
      {detail && <span style={{fontFamily:mono,fontWeight:600,letterSpacing:0,textTransform:"none",
        maxWidth:220,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{String(detail)}</span>}
    </div>
  );
}

// FEATURE: LAV-1c -- one title-bar meter tile (ported .meters/.m visual). `sup` is the ACTIVE
// SPANS peak superscript; `unit` the muted trailing unit. A meter with nothing real behind it is
// handed "—" by its caller and prints exactly that.
function Meter({ label, value, unit, sup }) {
  return (
    <div style={{minWidth:64}}>
      <div style={{fontFamily:mono,fontSize:8,letterSpacing:"0.14em",textTransform:"uppercase",color:T.muted}}>
        {label}
      </div>
      <div style={{fontFamily:mono,fontSize:15,fontWeight:700,color:T.navy,marginTop:2}}>
        {value}
        {unit && <span style={{fontSize:10,color:T.muted,fontWeight:500}}> {unit}</span>}
        {sup && <span style={{fontSize:10,color:T.muted,fontWeight:500}}> peak {sup}</span>}
      </div>
    </div>
  );
}

// FEATURE: LAV-1d -- rgba shades composed from imported tokens, never written as literals
// (.claude/rules/design-tokens.md). Same helper HarnessTraceConsole.jsx uses.
const rgba = (hex, a) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

const PROMPT_IDLE_BODY = "Waiting for a request…";
const PROMPT_DASH = "—";

// FEATURE: LAV-1d -- the ported .promptbox visual: a bottom overlay beside the canvas legend.
// It renders the REAL streamed system prompt and nothing else -- no placeholder prompt text ever,
// no estimated size. The count is the emit's own character length until that span's
// ai_activity_log row lands, at which point it is replaced by the row's real input_tokens.
// Clicking opens the same fixed popover pattern the trace console's record inspector uses: full,
// selectable, scrollable text.
function PromptBox({ prompt, agents, traceRows }) {
  const [open, setOpen] = useState(false);
  const agent = prompt?.agentId ? agents.find(a => a.id === prompt.agentId) : null;
  const who = agent ? (agent.name || "").split(" ")[0] : (prompt?.agentId || null);
  // Real row value only -- an absent row leaves the character count in place, never an estimate.
  const row = prompt?.span_id != null
    ? (traceRows || []).find(r => String(r.span_id) === String(prompt.span_id))
    : null;
  const tokens = row && row.input_tokens != null ? row.input_tokens : null;
  const text = prompt?.system_prompt || null;
  const hasText = typeof text === "string" && text.length > 0;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => { if (!prompt) setOpen(false); }, [prompt]);

  const countLabel = tokens != null
    ? `${tokens} tok`
    : (prompt ? `${prompt.prompt_chars} chars` : PROMPT_DASH);

  return (
    <>
      <div onClick={() => { if (hasText) setOpen(true); }}
        title={hasText ? "Click to read the full assembled prompt" : undefined}
        style={{position:"absolute",right:314,bottom:8,zIndex:7,width:"min(660px, 52%)",
          background:rgba(T.paper, 0.94),border:`1px solid ${T.line}`,borderRadius:8,padding:"6px 11px",
          boxShadow:`0 2px 8px ${rgba(T.navy, 0.16)}`,cursor: hasText ? "pointer" : "default"}}>
        <div style={{fontFamily:mono,fontWeight:600,fontSize:8,letterSpacing:"0.1em",
          textTransform:"uppercase",color:T.muted,marginBottom:3}}>
          Prompt assembled for <b style={{color:T.navy}}>{who || PROMPT_DASH}</b> · {countLabel}
        </div>
        <div style={{fontFamily:mono,fontSize:11,lineHeight:1.42,color:T.muted,
          display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
          {hasText ? text : PROMPT_IDLE_BODY}
        </div>
      </div>

      {open && hasText && (
        <div onClick={() => setOpen(false)}
          style={{position:"fixed",inset:0,zIndex:100001,background:rgba(PALETTE[14], 0.42),
            display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div onClick={e => e.stopPropagation()}
            style={{width:"min(880px, 94vw)",maxHeight:"82vh",display:"flex",flexDirection:"column",
              background:T.card,border:`1px solid ${T.brass}`,borderRadius:10,
              boxShadow:`0 14px 40px ${rgba(PALETTE[14], 0.55)}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 13px",
              borderBottom:`1px solid ${T.line}`,background:T.cardAlt,borderRadius:"10px 10px 0 0",
              fontFamily:mono,fontWeight:700,fontSize:11,color:T.navy}}>
              <b>Prompt assembled for {who || PROMPT_DASH} · {countLabel}</b>
              <span style={{marginLeft:"auto",fontFamily:mono,fontSize:8,fontWeight:600,color:T.muted,
                textTransform:"uppercase",letterSpacing:"0.09em"}}>
                {prompt?.toIntentSlug || "streamed prompt_assembled"}
              </span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close assembled prompt"
                style={{cursor:"pointer",color:T.muted,fontSize:14,background:"none",border:"none",padding:"0 2px"}}>✕</button>
            </div>
            <pre style={{margin:0,padding:"12px 14px",overflow:"auto",fontFamily:mono,fontSize:11.5,
              lineHeight:1.55,whiteSpace:"pre-wrap",wordBreak:"break-word",color:T.ink,userSelect:"text"}}>
              {text}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}

export default function LiveAgentViewScreen() {
  const agents = useAgents();
  const { events, status, running, result, error, recovery, prompt, traceIds, pending, resolving,
    runQuestion, resolveConfirmation } = useHarnessStream();

  const [picked, setPicked] = useState("");
  const [submitted, setSubmitted] = useState(null);
  const [choreographed, setChoreographed] = useState(true);
  const [terminal, setTerminal] = useState(null);       // 'result' | 'error' | null (badge only)
  const [liveStatus, setLiveStatus] = useState(null);   // last non-null status, so terminal can freeze
  const [frozenAt, setFrozenAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  // ── the observed-event ledger ──────────────────────────────────────────────
  // useHarnessStream mirrors CHI's logEvent, which REPLACES a pending "X is routing to Y" row in
  // place with the next event for Y (MI-52/LOO-009b). The events array is therefore lossy for this
  // canvas: a delegation row that has already been answered is no longer in it, so its edge would
  // vanish. This ledger records every distinct row-shape as it is observed and never forgets one --
  // append-only, deduplicated by (id, type, credited agent, secondary agent), reset only when the
  // hook itself clears. It invents nothing; it only refuses to drop what really streamed.
  // FEATURE: LAV-1c -- `at` is an index-aligned SIDECAR of arrival clocks, not a field written onto
  // the events themselves: the console's Raw JSON mode has to show the actual stored ledger event
  // object, and stamping a synthesized `_arrivedAt` onto it would make that claim false.
  const ledgerRef = useRef({ seen: new Set(), all: [], at: [] });
  const [hops, setHops] = useState([]);
  const [hopTimes, setHopTimes] = useState([]);
  useEffect(() => {
    const led = ledgerRef.current;
    if (events.length === 0) {
      if (led.all.length) { led.seen = new Set(); led.all = []; led.at = []; setHops([]); setHopTimes([]); }
      return;
    }
    let changed = false;
    const arrivedAt = Date.now();
    for (const e of events) {
      const sig = `${e.id}|${e.type}|${e.agentId ?? ""}|${e.secondaryAgentId ?? ""}`;
      if (led.seen.has(sig)) continue;
      led.seen.add(sig);
      led.all = [...led.all, e];
      led.at = [...led.at, arrivedAt];
      changed = true;
    }
    if (changed) { setHops(led.all); setHopTimes(led.at); }
  }, [events]);

  // Node state / bubbles / pulses are per-RUN; observed edges persist for the session.
  const runStart = useMemo(() => {
    let start = 0;
    hops.forEach((h, i) => { if (h.type === "question_boundary") start = i + 1; });
    return start;
  }, [hops]);
  const runHops = useMemo(() => hops.slice(runStart), [hops, runStart]);
  const runHopTimes = useMemo(() => hopTimes.slice(runStart), [hopTimes, runStart]);

  // FEATURE: LAV-1d -- `prompt_assembled` is harness plumbing, not a hand-off. It belongs in the
  // HARNESS TRACE console (which gets the full ledger below) and in the prompt box, and nowhere
  // else: the canvas derives bubbles/engagement from the ledger it is given, and the Pipeline Log
  // rail is the user-facing narrative. Filtering here -- rather than withholding the frame from the
  // ledger -- keeps the console's record honest while leaving both of those surfaces byte-identical
  // to their pre-LAV-1d behavior. Neither AgentNetwork.jsx nor AuditColumn is modified.
  const isPromptFrame = (e) => e.type === "prompt_assembled";
  const canvasHops = useMemo(() => hops.filter(h => !isPromptFrame(h)), [hops]);
  const canvasRunHops = useMemo(() => runHops.filter(h => !isPromptFrame(h)), [runHops]);
  const railEvents = useMemo(() => events.filter(e => !isPromptFrame(e)), [events]);

  // Idle baseline: this focus area's roster tab, plus anyone who actually appears in the stream.
  // Membership is keyed on a joined id STRING so the roster array keeps a stable identity while a
  // run streams -- otherwise every single event would re-key the canvas's layout memos.
  const streamAgentIds = useMemo(() => {
    const out = [];
    for (const h of canvasHops) {
      for (const id of [h.agentId, h.secondaryAgentId]) if (id && !out.includes(id)) out.push(id);
    }
    return out.join(",");
  }, [canvasHops]);
  const rosterKey = useMemo(() => {
    const base = agents.filter(a => a.benchGroups?.includes(MI_ROSTER_TAB)).map(a => a.id);
    const extra = streamAgentIds.split(",")
      .filter(id => id && !base.includes(id) && agents.some(a => a.id === id));
    return [...base, ...extra].join(",");
  }, [agents, streamAgentIds]);
  const roster = useMemo(
    () => rosterKey.split(",").map(id => agents.find(a => a.id === id)).filter(Boolean),
    [rosterKey, agents]);

  const rosterIds = useMemo(() => roster.map(a => a.id), [roster]);
  const agentActivity = useAgentActivitySummary(rosterIds, MI_LOOP_SCOPE, "global");

  // ── terminal / timer bookkeeping ───────────────────────────────────────────
  useEffect(() => { if (result) setTerminal("result"); }, [result]);
  useEffect(() => { if (error) setTerminal("error"); }, [error]);
  useEffect(() => {
    if (terminal !== "result") return undefined;
    const id = setTimeout(() => setTerminal(null), 3000);
    return () => clearTimeout(id);
  }, [terminal]);
  useEffect(() => { if (status) setLiveStatus(status); }, [status]);
  useEffect(() => {
    if (running) setFrozenAt(null);
    else setFrozenAt(Date.now());
  }, [running]);
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  // ── Task 1 (LAV-1c) / Task 3 (LAV-1d): the turn's traces, and one bounded poller over ALL of ──
  // their ai_activity_log rows. No id is invented here: the hook collects each frame's own
  // trace_id off the raw stream (§19p identity), in arrival order. The header keeps naming the
  // FIRST one, which is the call the user started; the rest of the turn is the quality-gate and
  // display calls the harness itself makes, and they are just as much this turn's cost.
  const traceKey = traceIds.join(",");
  const traceId = traceIds.length ? traceIds[0] : null;

  const [traceRows, setTraceRows] = useState([]);
  useEffect(() => {
    const ids = traceKey ? traceKey.split(",") : [];
    if (ids.length === 0) { setTraceRows([]); return undefined; }
    let cancelled = false;
    const fetchRows = async () => {
      const { data, error: rowsError } = await supabase
        .from("ai_activity_log")
        .select(TRACE_ROW_COLUMNS)
        .in("trace_id", ids)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      // LOG-38's fetch posture: warn and leave the store as it is. Every consumer below renders
      // "—" from an empty store -- a failed read never becomes a guessed value.
      if (rowsError) { console.warn("[LAV-1c] trace row read failed:", rowsError.message); return; }
      // FEATURE: LAV-1d -- grouped by trace in the order the traces arrived, `created_at` ascending
      // within each. That ordering is what makes the waterfall render one root group per trace with
      // its nesting intact (buildWaterfallRows maps in array order and computes depth from
      // parent_span_id, so grouping is purely this sort). Every other consumer is order-agnostic.
      const ordered = [...(data || [])].sort((a, b) => {
        const ta = ids.indexOf(a.trace_id), tb = ids.indexOf(b.trace_id);
        if (ta !== tb) return ta - tb;
        return (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0);
      });
      setTraceRows(ordered);
    };
    fetchRows();
    if (running) {
      // Bounded by construction: the interval exists only while the harness is live, and this
      // effect's cleanup clears it the moment the run goes terminal or the trace changes.
      const id = setInterval(fetchRows, TRACE_POLL_MS);
      return () => { cancelled = true; clearInterval(id); };
    }
    // One settle fetch after the terminal event: server-side rows are written as the last hops
    // close, so the final read has to happen slightly after the stream ends. Not a sequencer --
    // it fires once and is cleared with the effect.
    const settle = setTimeout(fetchRows, TRACE_SETTLE_MS);
    return () => { cancelled = true; clearTimeout(settle); };
    // FEATURE: LAV-1d -- keyed on the joined id list, so the query is re-issued as the set grows
    // mid-run (each new top-level call adds its trace) and not once per unrelated render.
  }, [traceKey, running]);

  // ── Task 3: the four title-bar meters, all row- or ledger-derived ───────────────────────────
  // FEATURE: LAV-1d -- tokens/cost now sum the UNION of the turn's traces (the poller's store),
  // which is what closes LAV-1c's measured under-count. The span/engagement figures stay defined
  // over the delegation ledger exactly as before.
  const activeSpans = useMemo(() => deriveActiveSpans(canvasRunHops, running), [canvasRunHops, running]);
  const peakSpans = useMemo(() => peakActiveSpans(canvasRunHops), [canvasRunHops]);
  const tokenTotal = useMemo(() => sumTokens(traceRows), [traceRows]);
  const costTotal = useMemo(() => sumCost(traceRows), [traceRows]);
  const agentsEngaged = useMemo(() => {
    const seen = new Set();
    for (const h of canvasRunHops) if (h.agentId) seen.add(h.agentId);
    return seen.size;
  }, [canvasRunHops]);

  // ── Task 4 (screen half): which node is mid-recovery right now ──────────────────────────────
  // HAR-17's notice names the agent whose hop was re-run. It stays true until that agent's next
  // REAL event arrives -- so the mark records where in the ledger it landed, and any later event
  // for that agent clears it. No timer: the stream itself ends the state.
  const runHopsRef = useRef(canvasRunHops);
  runHopsRef.current = canvasRunHops;
  const [recoveryMark, setRecoveryMark] = useState(null);
  useEffect(() => {
    if (!recovery) { setRecoveryMark(null); return; }
    setRecoveryMark({ agentId: recovery.agent_id ?? null, atIndex: runHopsRef.current.length, at: Date.now() });
  }, [recovery]);
  const recoveringAgentId = useMemo(() => {
    if (!running || !recoveryMark?.agentId) return null;
    const answered = canvasRunHops.slice(recoveryMark.atIndex).some(h => h.agentId === recoveryMark.agentId);
    return answered ? null : recoveryMark.agentId;
  }, [running, recoveryMark, canvasRunHops]);

  // FEATURE: LAV-1f -- the run is awaiting a human for exactly as long as a real gate is open or the
  // decision it was handed is still in flight. The badge's detail is the gate frame's OWN
  // capability_slug (never a label authored here), the same way errorDetail carries the real fault.
  const awaiting = !!pending || !!resolving;
  const mode = deriveMode(canvasRunHops, { running, terminal, awaiting });
  const errorDetail = terminal === "error"
    ? (error?.failureClass || error?.status || error?.message || null)
    : null;
  const badgeDetail = awaiting ? ((pending || resolving)?.capability_slug ?? null) : errorDetail;

  // Same math AgentWorkingIndicator uses (~L718): turnStartedAt survives every hop swap, so the
  // elapsed figure is the whole question's time, not the current hop's. Frozen at terminal because
  // the hook nulls `status` in its finally block.
  const base = liveStatus?.turnStartedAt ?? null;
  const clock = running ? now : (frozenAt ?? now);
  const elapsedText = base
    ? `elapsed ${formatElapsed(clock - base)} | ${liveStatus?.expectation || formatExpectation(liveStatus?.expectationMs ?? 120000)}`
    : null;

  // FEATURE: LAV-1f -- an open gate blocks a new question. Not a timer and not a default decision:
  // the run genuinely has not finished, and letting a new one start would silently abandon a gate
  // the harness is still holding open. The gate stays pending until a human resolves it.
  const onRun = () => {
    const q = ALL_QUESTIONS.find(x => x.id === picked);
    if (!q || running || awaiting) return;
    setSubmitted(q.label);
    setTerminal(null);
    runQuestion(q.label);
  };

  return (
    <AppShell>
      <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",minHeight:0,
        background:T.paperDeep,overflow:"hidden"}}>
        <FeatureBadge id="LAV-1"/>

        {/* ── Title bar ── */}
        <div style={{background:T.paper,borderBottom:`1px solid ${T.line}`,padding:"11px 24px",
          display:"flex",alignItems:"flex-start",gap:20,flexShrink:0}}>
          <div>
            <div style={{fontFamily:display,fontSize:24,fontWeight:700,color:T.navy,lineHeight:1}}>
              {/* FEATURE: LAV-1f -- was a hardcoded status word written here by LAV-1b; the focus area's
                  status now comes from its own key, so graduating it is one edit in tokens.js and
                  the guard drops the tag everywhere at once (SH-23's contract, same render every
                  other focus-area title already uses). */}
              {PAGE_TITLE}{FOCUS_AREA_STATUS.liveAgentView && <span style={FOCUS_STATUS_STYLE}> ({FOCUS_AREA_STATUS.liveAgentView})</span>}
            </div>
            <div style={{fontFamily:mono,fontSize:11.5,color:T.muted,marginTop:4,letterSpacing:"0.02em"}}>
              {PAGE_SUBTITLE}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
              <select value={picked} onChange={e => setPicked(e.target.value)} aria-label="Pick a question"
                style={{maxWidth:560,minWidth:360,fontFamily:body,fontSize:12.5,color:T.ink,background:T.card,
                  border:`1px solid ${T.line}`,borderRadius:6,padding:"8px 30px 8px 11px",outline:"none",
                  cursor:"pointer",textOverflow:"ellipsis",whiteSpace:"nowrap",overflow:"hidden"}}>
                <option value="">{PICKER_PLACEHOLDER}</option>
                {ALL_QUESTIONS.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
              </select>
              <button onClick={onRun} disabled={!picked || running || awaiting}
                style={{background:T.navy,color:T.card,border:"none",fontFamily:body,fontWeight:600,fontSize:12,
                  padding:"8px 14px",borderRadius:6,letterSpacing:"0.3px",whiteSpace:"nowrap",
                  cursor: (!picked || running || awaiting) ? "default" : "pointer",
                  opacity: (!picked || running || awaiting) ? 0.45 : 1}}>
                Run ▸
              </button>
            </div>
          </div>
          <div style={{flex:1}}/>
          {/* ── Task 3: meters. Every tile is Σ over real rows or a count over real events. ── */}
          <div style={{display:"flex",gap:18,alignItems:"flex-start",flexShrink:0}}>
            <Meter label="Active Spans" value={activeSpans} sup={peakSpans || null}/>
            <Meter label="Tokens" value={formatTokens(tokenTotal)} unit="tok"/>
            <Meter label="Est. Cost" value={costTotal == null ? "—" : `$${costTotal.toFixed(4)}`}/>
            <Meter label="Agents Engaged" value={agentsEngaged}/>
          </div>
        </div>

        {/* ── Status strip ── */}
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"8px 24px",background:T.cardAlt,
          borderBottom:`1px solid ${T.line}`,flexShrink:0}}>
          <ModeBadge mode={mode} detail={badgeDetail}/>
          <div style={{fontFamily:display,fontStyle:"italic",fontSize:15,color:T.navy,flex:1,minWidth:0,
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {submitted || IDLE_QUESTION_COPY}
          </div>
          {/* FEATURE: LAV-1f -- while the gate is open the harness is emitting nothing, so there is
              no live status message to show; the strip carries CHI's own NeedsDecisionBadge copy
              (MarketIntelligenceScreen.jsx ~L1209) verbatim instead -- the platform's existing
              words for exactly this state, in the same brass. Once the decision is dispatched the
              real streamed status takes over again. */}
          {awaiting ? (
            <div style={{fontFamily:mono,fontSize:11,color:T.brassDeep,fontWeight:700,flexShrink:0,
              textTransform:"uppercase",letterSpacing:"0.02em"}}>
              Needs Your Decision
            </div>
          ) : status?.message && (
            <div style={{fontFamily:mono,fontSize:11,color:T.muted,fontStyle:"italic",flexShrink:0,
              maxWidth:340,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
              {status.message}
            </div>
          )}
          {elapsedText && (
            <div style={{fontFamily:mono,fontSize:10,color:T.brassDeep,flexShrink:0}}>{elapsedText}</div>
          )}
        </div>

        {/* ── Canvas + right rail ── */}
        {/* FEATURE: LAV-1c -- LAV-1b QA finding: this row has to be the ONLY growing row on the
            page so the canvas genuinely takes the whole remaining viewport height (the console
            below is flex-shrink:0). minHeight:0 + alignItems:stretch is what lets it shrink when
            the console is open instead of pushing the page into a scroll. */}
        {/* FEATURE: LAV-1d -- position:relative so the prompt box can sit as a bottom overlay
            beside AgentNetwork's own legend (which is absolute at left:12/bottom:8 inside it),
            clear of the 300px rail. */}
        <div style={{position:"relative",flex:1,display:"flex",alignItems:"stretch",minHeight:0}}>
          <AgentNetwork roster={roster} hops={canvasHops} runHops={canvasRunHops} running={running}
            traceRows={traceRows} recoveringAgentId={recoveringAgentId}
            choreographed={choreographed} onToggleChoreographed={setChoreographed}
            pending={pending} resolving={resolving} onResolveConfirmation={resolveConfirmation}/>
          <PromptBox prompt={prompt} agents={agents} traceRows={traceRows}/>
          <aside style={{width:300,flexShrink:0,borderLeft:`1px solid ${T.line}`,background:T.paperDeep,
            padding:"12px 14px",overflowY:"auto",minHeight:0}}>
            <AuditColumn events={railEvents} agentActivity={agentActivity} onAgentsDrawerOpen={() => {}}/>
          </aside>
        </div>

        {/* ── Task 2: HARNESS TRACE console + span waterfall ── */}
        <HarnessTraceConsole
          events={runHops} eventTimes={runHopTimes} traceRows={traceRows} traceId={traceId}
          traceIds={traceIds}
          running={running} recovery={recovery} recoveryAt={recoveryMark?.at ?? 0} now={now}/>
      </div>
    </AppShell>
  );
}
