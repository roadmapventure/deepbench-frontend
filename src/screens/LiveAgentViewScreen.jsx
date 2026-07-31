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
import { T, display, body, mono, FOCUS_STATUS_STYLE, ACTION_TEXT_COLORS_FETCH } from "../tokens.js";
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
export function deriveMode(runHops, { running, terminal }) {
  if (terminal) return terminal === "error" ? "error" : "complete";
  if (!running) return "idle";
  return runHops.some(h => h.type === "delegation_return") ? "orch" : "route";
}

const MODE_COPY = { idle: "Idle", route: "Routing", orch: "Orchestrating", complete: "Complete", error: "Error" };

function ModeBadge({ mode, detail }) {
  const tint = {
    idle:     { fg: T.muted,     br: T.line },
    route:    { fg: T.brassDeep, br: T.brass },
    orch:     { fg: ACTION_TEXT_COLORS_FETCH.CLICK, br: ACTION_TEXT_COLORS_FETCH.CLICK },
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

export default function LiveAgentViewScreen() {
  const agents = useAgents();
  const { events, status, running, result, error, recovery, runQuestion } = useHarnessStream();

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

  // Idle baseline: this focus area's roster tab, plus anyone who actually appears in the stream.
  // Membership is keyed on a joined id STRING so the roster array keeps a stable identity while a
  // run streams -- otherwise every single event would re-key the canvas's layout memos.
  const streamAgentIds = useMemo(() => {
    const out = [];
    for (const h of hops) {
      for (const id of [h.agentId, h.secondaryAgentId]) if (id && !out.includes(id)) out.push(id);
    }
    return out.join(",");
  }, [hops]);
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

  // ── Task 1: the run's trace_id, and one bounded poller over its ai_activity_log rows ────────
  // The trace id is not invented here: it rides the stored events themselves, spread in by
  // pickCreditedSpan() (verified fresh -- useHarnessStream.js L82/L86 spreads it into `data`).
  const traceId = useMemo(() => {
    for (const h of runHops) { const t = h.data?.trace_id; if (t) return t; }
    return null;
  }, [runHops]);

  const [traceRows, setTraceRows] = useState([]);
  useEffect(() => {
    if (!traceId) { setTraceRows([]); return undefined; }
    let cancelled = false;
    const fetchRows = async () => {
      const { data, error: rowsError } = await supabase
        .from("ai_activity_log")
        .select(TRACE_ROW_COLUMNS)
        .eq("trace_id", traceId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      // LOG-38's fetch posture: warn and leave the store as it is. Every consumer below renders
      // "—" from an empty store -- a failed read never becomes a guessed value.
      if (rowsError) { console.warn("[LAV-1c] trace row read failed:", rowsError.message); return; }
      setTraceRows(data || []);
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
  }, [traceId, running]);

  // ── Task 3: the four title-bar meters, all row- or ledger-derived ───────────────────────────
  const activeSpans = useMemo(() => deriveActiveSpans(runHops, running), [runHops, running]);
  const peakSpans = useMemo(() => peakActiveSpans(runHops), [runHops]);
  const tokenTotal = useMemo(() => sumTokens(traceRows), [traceRows]);
  const costTotal = useMemo(() => sumCost(traceRows), [traceRows]);
  const agentsEngaged = useMemo(() => {
    const seen = new Set();
    for (const h of runHops) if (h.agentId) seen.add(h.agentId);
    return seen.size;
  }, [runHops]);

  // ── Task 4 (screen half): which node is mid-recovery right now ──────────────────────────────
  // HAR-17's notice names the agent whose hop was re-run. It stays true until that agent's next
  // REAL event arrives -- so the mark records where in the ledger it landed, and any later event
  // for that agent clears it. No timer: the stream itself ends the state.
  const runHopsRef = useRef(runHops);
  runHopsRef.current = runHops;
  const [recoveryMark, setRecoveryMark] = useState(null);
  useEffect(() => {
    if (!recovery) { setRecoveryMark(null); return; }
    setRecoveryMark({ agentId: recovery.agent_id ?? null, atIndex: runHopsRef.current.length, at: Date.now() });
  }, [recovery]);
  const recoveringAgentId = useMemo(() => {
    if (!running || !recoveryMark?.agentId) return null;
    const answered = runHops.slice(recoveryMark.atIndex).some(h => h.agentId === recoveryMark.agentId);
    return answered ? null : recoveryMark.agentId;
  }, [running, recoveryMark, runHops]);

  const mode = deriveMode(runHops, { running, terminal });
  const errorDetail = terminal === "error"
    ? (error?.failureClass || error?.status || error?.message || null)
    : null;

  // Same math AgentWorkingIndicator uses (~L718): turnStartedAt survives every hop swap, so the
  // elapsed figure is the whole question's time, not the current hop's. Frozen at terminal because
  // the hook nulls `status` in its finally block.
  const base = liveStatus?.turnStartedAt ?? null;
  const clock = running ? now : (frozenAt ?? now);
  const elapsedText = base
    ? `elapsed ${formatElapsed(clock - base)} | ${liveStatus?.expectation || formatExpectation(liveStatus?.expectationMs ?? 120000)}`
    : null;

  const onRun = () => {
    const q = ALL_QUESTIONS.find(x => x.id === picked);
    if (!q || running) return;
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
              {PAGE_TITLE}<span style={FOCUS_STATUS_STYLE}> (Beta)</span>
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
              <button onClick={onRun} disabled={!picked || running}
                style={{background:T.navy,color:T.card,border:"none",fontFamily:body,fontWeight:600,fontSize:12,
                  padding:"8px 14px",borderRadius:6,letterSpacing:"0.3px",whiteSpace:"nowrap",
                  cursor: (!picked || running) ? "default" : "pointer", opacity: (!picked || running) ? 0.45 : 1}}>
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
          <ModeBadge mode={mode} detail={errorDetail}/>
          <div style={{fontFamily:display,fontStyle:"italic",fontSize:15,color:T.navy,flex:1,minWidth:0,
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {submitted || IDLE_QUESTION_COPY}
          </div>
          {status?.message && (
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
        <div style={{flex:1,display:"flex",alignItems:"stretch",minHeight:0}}>
          <AgentNetwork roster={roster} hops={hops} runHops={runHops} running={running}
            traceRows={traceRows} recoveringAgentId={recoveringAgentId}
            choreographed={choreographed} onToggleChoreographed={setChoreographed}/>
          <aside style={{width:300,flexShrink:0,borderLeft:`1px solid ${T.line}`,background:T.paperDeep,
            padding:"12px 14px",overflowY:"auto",minHeight:0}}>
            <AuditColumn events={events} agentActivity={agentActivity} onAgentsDrawerOpen={() => {}}/>
          </aside>
        </div>

        {/* ── Task 2: HARNESS TRACE console + span waterfall ── */}
        <HarnessTraceConsole
          events={runHops} eventTimes={runHopTimes} traceRows={traceRows} traceId={traceId}
          running={running} recovery={recovery} recoveryAt={recoveryMark?.at ?? 0} now={now}/>
      </div>
    </AppShell>
  );
}
