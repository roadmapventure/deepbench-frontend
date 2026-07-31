// DeepBench v7.0.2 | HarnessTraceConsole.jsx | LAV-1c -- the dark HARNESS TRACE console for the
// Live Agent View: real event lines merged with row-derived `model_call` lines, a Raw JSON toggle
// that flips every line to its ACTUAL underlying record, a click-an-id inspector that resolves the
// real ai_activity_log row, and the span waterfall nested by parent_span_id.
//
// Pure presentation. Every value arrives as a prop -- this file fetches nothing, schedules nothing,
// and synthesizes no record: a `model_call` line's raw form IS the Supabase row object the screen's
// poller returned, and a stream line's raw form IS the stored ledger event object. Ported from
// docs/channel-intelligence-v8-promptbox.html for LOOK ONLY (.console/.waterfall/.recpop); that
// file's <script> is a simulator and none of its control flow is ported.
//
// Vocabulary rule (John/design, hard): the console prints the platform's REAL event type strings
// verbatim -- whatever the harness actually streamed -- plus the row-derived `model_call` and the
// HAR-17 `recovery` notice. There is no taxonomy table here to rename or invent one.
// FEATURE: LAV-1c
import { useEffect, useMemo, useRef, useState } from "react";
import { T, PALETTE, mono, body, ACTION_TEXT_COLORS_FETCH } from "../tokens.js";
import { computeCallCost } from "../hooks/useAIActivity.js";

// Every colour resolves to an imported token; rgba() shades are composed from those same imported
// values rather than written as literals (.claude/rules/design-tokens.md).
const rgba = (hex, a) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

const CON_BG   = PALETTE[14];              // console surface (deep navy)
const CON_HEAD = PALETTE[6];               // header/hairline surface
const CON_LINE = rgba(PALETTE[6], 0.85);
const CON_TXT  = T.navyTextHi;
const CON_DIM  = T.navyTextLo;

// ── pure derivations (exported: the screen's meters read the same implementations) ───────────
// loops/retries come from the real `feature` encoding execute.js writes (`<capability>:<intent>:
// depth<N>[:apiRetry<N>]`) -- never an invented loop total, never a hand dictionary.
export function deriveLoopsRetries(rows) {
  let maxDepth = 0, retries = 0;
  for (const r of rows || []) {
    const f = typeof r?.feature === "string" ? r.feature : "";
    const d = f.match(/:depth(\d+)/);
    if (d) maxDepth = Math.max(maxDepth, Number(d[1]));
    if (/:apiRetry(\d+)/.test(f)) retries += 1;
  }
  return { maxDepth, retries };
}

export function p50Latency(rows) {
  const s = (rows || []).map(r => r?.latency_ms).filter(v => v != null).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

// Concurrency truth (settled with John): within one trace execution is sequential; the only real
// overlap is NESTING -- a parent span open over its child. So the live figure is open-nesting
// depth: a `delegation` opens one, its `delegation_complete`/`delegation_return` closes it, and the
// root counts as one while the run is live.
export function deriveActiveSpans(evts, running) {
  let open = running ? 1 : 0;
  for (const e of evts || []) {
    if (e.type === "delegation") open += 1;
    if (e.type === "delegation_complete" || e.type === "delegation_return") open = Math.max(running ? 1 : 0, open - 1);
  }
  return open;
}

// Peak is recomputed from the ledger rather than latched in state, so it resets with the run for
// free and can never drift from the events that produced it.
export function peakActiveSpans(evts) {
  const list = evts || [];
  if (list.length === 0) return 0;
  let open = 1, peak = 1;
  for (const e of list) {
    if (e.type === "delegation") open += 1;
    if (e.type === "delegation_complete" || e.type === "delegation_return") open = Math.max(1, open - 1);
    if (open > peak) peak = open;
  }
  return peak;
}

export function sumTokens(rows) {
  let n = 0;
  for (const r of rows || []) n += (r?.input_tokens || 0) + (r?.output_tokens || 0);
  return n;
}

// Cost is delegated to the platform's single pricing source (AA-181's computeCallCost). A model
// this platform has no rate for returns null there and contributes nothing here -- never a guess.
export function sumCost(rows) {
  let total = null;
  for (const r of rows || []) {
    const c = computeCallCost(r?.model, r?.input_tokens, r?.output_tokens);
    if (c == null) continue;
    total = (total || 0) + c;
  }
  return total;
}

export function formatTokens(n) {
  if (!n) return "0";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// The waterfall's tree: nest by parent_span_id. A row whose parent is not in this trace's row set
// is a root at depth 0 (never flattened above a parent that IS present).
export function buildWaterfallRows(rows) {
  const byId = new Map();
  for (const r of rows || []) if (r?.span_id != null) byId.set(r.span_id, r);
  const depthOf = (row, guard) => {
    if (!row || row.parent_span_id == null || guard > 32) return 0;
    const parent = byId.get(row.parent_span_id);
    if (!parent) return 0;
    return 1 + depthOf(parent, guard + 1);
  };
  return (rows || []).map(r => ({ row: r, depth: depthOf(r, 0) }));
}

// `feature` is `<capability>:<intent>[:depthN...]`; the waterfall label wants the intent half.
export function featureIntent(feature) {
  if (typeof feature !== "string") return null;
  const parts = feature.split(":");
  return parts.length > 1 && parts[1] ? parts[1] : null;
}

// ── line assembly ────────────────────────────────────────────────────────────────────────────
// The console never writes copy an event failed to supply (.claude/rules/agent-section-rendering).
function lineText(data) {
  for (const k of ["message", "reasoning", "task"]) {
    const v = data?.[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function safeText(v) {
  if (typeof v === "string") return v;
  if (v == null) return "";
  try { return JSON.stringify(v); } catch { return ""; }
}

function rowRetryMark(feature) {
  const m = typeof feature === "string" ? feature.match(/:apiRetry(\d+)/) : null;
  return m ? ` · retry ${m[1]}` : "";
}

/**
 * One merged, time-ordered line list. Events carry their real arrival clock (the screen's ledger
 * records it alongside each stored event, leaving the event object itself untouched); rows carry
 * their real created_at. Both are absolute epoch ms, so the merge is by real time, not by guess.
 */
export function buildConsoleLines({ events, eventTimes, traceRows, recovery, recoveryAt }) {
  const lines = [];
  (events || []).forEach((e, i) => {
    const at = (eventTimes || [])[i];
    lines.push({
      key: `e${i}`,
      kind: "event",
      type: e.type,
      at: at == null ? 0 : at,
      spanId: e.data?.span_id ?? null,
      text: lineText(e.data),
      record: e,
    });
  });
  for (const r of traceRows || []) {
    const tokensIn = r.input_tokens || 0, tokensOut = r.output_tokens || 0;
    lines.push({
      key: `r${r.span_id ?? ""}${r.created_at ?? ""}`,
      kind: "model_call",
      type: "model_call",
      at: Date.parse(r.created_at) || 0,
      spanId: r.span_id ?? null,
      text: `${r.agent_id || "—"} · ${r.model || "—"} · ${tokensIn}/${tokensOut} tok · ${r.latency_ms == null ? "—" : `${r.latency_ms}ms`}${rowRetryMark(r.feature)}`,
      record: r,
    });
  }
  if (recovery) {
    lines.push({
      key: "recovery",
      kind: "recovery",
      type: "recovery",
      at: recoveryAt || 0,
      spanId: null,
      text: `${recovery.agent_id || "—"} recovered automatically — ${safeText(recovery.fault) || "transient failure"}`,
      record: recovery,
    });
  }
  return lines.sort((a, b) => a.at - b.at);
}

// Real types keep real colours; anything the harness streams that is not listed here still prints
// its own type string, in the neutral console colour -- no renaming, no bucket, no fallback label.
const TYPE_COLOR = {
  intent_routing:      ACTION_TEXT_COLORS_FETCH.CLICK,
  agent_selection:     ACTION_TEXT_COLORS_FETCH.CLICK,
  delegation:          T.brassLight,
  delegation_complete: T.mossLight,
  delegation_return:   T.mossLight,
  qa_answer:           T.mossLight,
  result:              T.mossLight,
  model_call:          T.brassGlow,
  recovery:            T.brass,
  error:               T.flag,
};

// ── JSON colouring (tokenised, never innerHTML) ──────────────────────────────────────────────
export function jsonTokens(text) {
  const out = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ t: text.slice(last, m.index), c: null });
    if (m[1]) { out.push({ t: m[1], c: "k" }); out.push({ t: m[2], c: null }); }
    else if (m[3]) out.push({ t: m[3], c: "s" });
    else out.push({ t: m[4] || m[5], c: "n" });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: text.slice(last), c: null });
  return out;
}

const JSON_COLOR = { k: CON_TXT, s: T.mossLight, n: T.brassGlow };

function JsonText({ value, indent }) {
  let text;
  try { text = JSON.stringify(value, null, indent ? 2 : 0); } catch { text = ""; }
  return (
    <>
      {jsonTokens(text || "").map((tok, i) => (
        <span key={i} style={tok.c ? { color: JSON_COLOR[tok.c] } : undefined}>{tok.t}</span>
      ))}
    </>
  );
}

// ── component CSS (GLOBAL_CSS already owns aiBlink/fadeIn/spin) ──────────────────────────────
const CON_CSS = `
.lavc{background:${CON_BG};color:${CON_TXT};border-top:2px solid ${CON_LINE};display:flex;
  flex-direction:column;flex-shrink:0;height:230px;transition:height .3s;min-height:0}
.lavc.is-collapsed{height:34px}
.lavc-head{height:34px;display:flex;align-items:center;gap:14px;padding:0 14px;background:${CON_HEAD};
  border-bottom:1px solid ${CON_LINE};flex:0 0 auto}
.lavc-title{font-family:${mono};font-weight:700;font-size:11px;letter-spacing:0.1em;color:${CON_TXT};
  display:flex;align-items:center;gap:8px;text-transform:uppercase;white-space:nowrap}
.lavc-rec{width:8px;height:8px;border-radius:50%;background:${T.flag}}
.lavc-rec.is-live{animation:aiBlink 1.6s ease-in-out infinite}
.lavc-stat{font-family:${mono};font-weight:600;font-size:10.5px;color:${CON_DIM};display:flex;gap:5px;
  align-items:center;white-space:nowrap}
.lavc-stat b{color:${T.white};font-weight:700}
.lavc-stat.sep{border-left:1px solid ${CON_LINE};padding-left:14px}
.lavc-right{margin-left:auto;display:flex;align-items:center;gap:10px}
.lavc-hint{font-family:${mono};font-weight:600;font-size:9px;color:${CON_DIM};letter-spacing:0.02em}
.lavc-btn{background:${rgba(PALETTE[6], 0.9)};border:1px solid ${CON_LINE};color:${CON_TXT};
  font-family:${mono};font-weight:600;font-size:10px;padding:4px 10px;border-radius:6px;cursor:pointer}
.lavc-btn.on{background:${rgba(ACTION_TEXT_COLORS_FETCH.CLICK, 0.55)};border-color:${ACTION_TEXT_COLORS_FETCH.CLICK}}
.lavc-body{flex:1;display:flex;min-height:0}
.lavc-events{flex:1.3;overflow:auto;padding:6px 10px;border-right:1px solid ${CON_LINE};
  font-family:${mono};font-size:11px;line-height:1.5}
.lavc-wf{flex:1;overflow:auto;padding:6px 10px;min-width:0}
.lavc-wfhead{font-family:${mono};font-weight:700;font-size:9.5px;color:${CON_DIM};letter-spacing:0.1em;
  text-transform:uppercase;margin-bottom:6px}
.lavc-ev{display:flex;gap:8px;align-items:baseline;animation:fadeIn .2s ease}
.lavc-t{color:${CON_DIM};flex:0 0 auto}
.lavc-ty{font-weight:700;min-width:152px;flex:0 0 auto}
.lavc-sid{color:${CON_DIM};flex:0 0 auto}
.lavc-de{color:${CON_TXT};min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lavc-raw{color:${CON_DIM};white-space:pre-wrap;word-break:break-word;min-width:0}
.lavc-id{color:${ACTION_TEXT_COLORS_FETCH.SCROLL};text-decoration:underline dotted;text-underline-offset:2px;
  cursor:pointer;background:none;border:none;padding:0;font:inherit}
.lavc-id.trace{color:${T.brassGlow}}
.lavc-empty{color:${CON_DIM};font-family:${mono};font-size:10.5px;padding:4px 0}
.lavc-wfrow{display:flex;align-items:center;gap:6px;height:17px;font-family:${mono};font-weight:600;font-size:9px}
.lavc-wflab{width:118px;color:${CON_TXT};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 0 auto}
.lavc-wftrack{position:relative;flex:1;height:9px;background:${rgba(T.white, 0.07)};border-radius:3px;overflow:hidden}
.lavc-wfbar{position:absolute;top:0;height:9px;border-radius:3px}
.lavc-wfms{width:52px;text-align:right;color:${CON_DIM};flex:0 0 auto}
.lavc-pop{position:fixed;z-index:100000;width:400px;max-width:92vw;background:${CON_BG};
  border:1px solid ${T.brass};border-radius:10px;box-shadow:0 14px 40px ${rgba(PALETTE[14], 0.55)};color:${CON_TXT}}
.lavc-pop .rh{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid ${CON_LINE};
  background:${CON_HEAD};border-radius:10px 10px 0 0;font-family:${mono};font-weight:700;font-size:11px}
.lavc-pop .rh b{color:${T.brassLight};letter-spacing:0.03em}
.lavc-pop .src{margin-left:auto;font-size:8px;color:${CON_DIM};text-transform:uppercase;letter-spacing:0.09em;font-weight:600}
.lavc-pop .rx{cursor:pointer;color:${CON_DIM};font-size:14px;padding:0 2px;background:none;border:none}
.lavc-pop pre{margin:0;padding:11px 13px;font-family:${mono};font-size:11px;line-height:1.55;
  white-space:pre-wrap;word-break:break-word;max-height:230px;overflow:auto}
.lavc-pop .note{padding:7px 13px 10px;font-family:${mono};font-size:9.5px;line-height:1.4;color:${CON_DIM};
  border-top:1px dashed ${CON_LINE};background:${rgba(PALETTE[6], 0.35)};border-radius:0 0 10px 10px}
`;

const POP_W = 400;

/**
 * Props (all real, all supplied by the screen):
 *  events      -- the run's stored ledger events, in arrival order
 *  eventTimes  -- arrival clock per event, index-aligned with `events`
 *  traceRows   -- the ai_activity_log rows this run's trace_id returned (the poller's state)
 *  traceId     -- the run's real trace id, or null before one is observed
 *  running     -- the harness is live right now
 *  recovery    -- the live HAR-17 recovery notice, or null
 *  recoveryAt  -- when that notice arrived (epoch ms)
 *  now         -- the screen's existing 1s clock, for live-extending waterfall bars
 */
export default function HarnessTraceConsole({
  events = [], eventTimes = [], traceRows = [], traceId = null, running = false,
  recovery = null, recoveryAt = 0, now = 0,
}) {
  const [raw, setRaw] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // The inspector stores WHICH record was asked for, never a copy of it: the row is re-resolved on
  // every render, so a span clicked before its row landed fills itself in when the poller lands it.
  const [inspect, setInspect] = useState(null); // { kind:'span'|'trace', spanId?, x, y }
  const evRef = useRef(null);

  const lines = useMemo(
    () => buildConsoleLines({ events, eventTimes, traceRows, recovery, recoveryAt }),
    [events, eventTimes, traceRows, recovery, recoveryAt]);

  const t0 = useMemo(() => (lines.length ? lines[0].at : 0), [lines]);
  const { maxDepth, retries } = useMemo(() => deriveLoopsRetries(traceRows), [traceRows]);
  const p50 = useMemo(() => p50Latency(traceRows), [traceRows]);
  const retryTotal = retries + (recovery ? 1 : 0);

  // Follow the tail only while the reader is already at the tail.
  const atBottomRef = useRef(true);
  useEffect(() => {
    const el = evRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [lines.length, raw]);
  const onScroll = () => {
    const el = evRef.current;
    if (el) atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  // Close the inspector on any click outside it.
  useEffect(() => {
    if (!inspect) return undefined;
    const onDoc = (e) => { if (!e.target.closest?.(".lavc-pop")) setInspect(null); };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [inspect]);

  const rowBySpan = useMemo(() => {
    const m = new Map();
    for (const r of traceRows || []) if (r?.span_id != null) m.set(String(r.span_id), r);
    return m;
  }, [traceRows]);

  const inspected = useMemo(() => {
    if (!inspect) return null;
    if (inspect.kind === "trace") {
      const cost = sumCost(traceRows);
      return {
        title: `trace ${traceId || "—"}`,
        kind: "trace",
        record: {
          trace_id: traceId,
          rows: traceRows.length,
          input_tokens: (traceRows || []).reduce((n, r) => n + (r.input_tokens || 0), 0),
          output_tokens: (traceRows || []).reduce((n, r) => n + (r.output_tokens || 0), 0),
          est_cost_usd: cost == null ? null : Number(cost.toFixed(6)),
          loops: maxDepth,
          retries: retryTotal,
        },
        pending: false,
      };
    }
    const row = rowBySpan.get(String(inspect.spanId));
    return { title: `span ${inspect.spanId}`, kind: "span", record: row || null, pending: !row };
  }, [inspect, rowBySpan, traceRows, traceId, maxDepth, retryTotal]);

  const openInspector = (e, payload) => {
    e.stopPropagation();
    setInspect({ ...payload, x: e.clientX + 8, y: e.clientY + 8 });
  };

  // ── waterfall ──────────────────────────────────────────────────────────────
  const wf = useMemo(() => buildWaterfallRows(traceRows), [traceRows]);
  const landedSpans = useMemo(() => new Set(wf.map(w => String(w.row.span_id))), [wf]);

  // A delegation that is open in the ledger but whose row has not landed yet still gets a bar --
  // extended from its own event-arrival clock, never from an animation guess.
  const liveBars = useMemo(() => {
    if (!running) return [];
    const closed = new Set();
    for (const e of events) {
      if ((e.type === "delegation_complete" || e.type === "delegation_return") && e.data?.span_id != null) {
        closed.add(String(e.data.span_id));
      }
    }
    const out = [];
    events.forEach((e, i) => {
      const sid = e.data?.span_id;
      if (sid == null || e.type !== "delegation") return;
      const key = String(sid);
      if (closed.has(key) || landedSpans.has(key) || out.some(o => o.key === key)) return;
      out.push({ key, at: (eventTimes || [])[i] || 0, label: e.agentId || "—" });
    });
    return out;
  }, [events, eventTimes, running, landedSpans]);

  const scale = useMemo(() => {
    const starts = [], ends = [];
    for (const w of wf) {
      const s = Date.parse(w.row.created_at);
      if (!Number.isFinite(s)) continue;
      starts.push(s);
      ends.push(s + (w.row.latency_ms || 0));
    }
    for (const b of liveBars) { starts.push(b.at); ends.push(now || b.at); }
    if (!starts.length) return null;
    const start = Math.min(...starts);
    const total = Math.max(1, Math.max(...ends) - start);
    return { start, total };
  }, [wf, liveBars, now]);

  const pct = (v) => `${Math.max(0, Math.min(100, v))}%`;
  const barColor = (depth) => [T.brass, ACTION_TEXT_COLORS_FETCH.CLICK, T.mossLight, T.brassLight][depth % 4];

  return (
    <div className={`lavc${collapsed ? " is-collapsed" : ""}`}>
      <style>{CON_CSS}</style>
      <div className="lavc-head">
        <div className="lavc-title"><span className={`lavc-rec${running ? " is-live" : ""}`}/>Harness Trace</div>
        <div className="lavc-stat sep">trace{" "}
          {traceId
            ? <button type="button" className="lavc-id trace" onClick={e => openInspector(e, { kind: "trace" })}>{traceId}</button>
            : <b>—</b>}
        </div>
        <div className="lavc-stat sep">events <b>{events.length}</b></div>
        <div className="lavc-stat">loops <b>{traceRows.length ? maxDepth : "–"}</b></div>
        <div className="lavc-stat">retries <b>{retryTotal}</b></div>
        <div className="lavc-stat">p50 <b>{traceRows.length ? p50 : "—"}</b>{traceRows.length ? "ms" : ""}</div>
        <div className="lavc-right">
          <span className="lavc-hint">click any id → raw record</span>
          <button type="button" className={`lavc-btn${raw ? " on" : ""}`} onClick={() => setRaw(r => !r)}>▤ Raw JSON</button>
          <button type="button" className="lavc-btn" onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? "Expand trace console" : "Collapse trace console"}>{collapsed ? "▴" : "▾"}</button>
        </div>
      </div>

      {!collapsed && (
        <div className="lavc-body">
          <div className="lavc-events" ref={evRef} onScroll={onScroll}>
            {lines.length === 0 && <div className="lavc-empty">No trace activity yet.</div>}
            {lines.map(l => (
              <div className="lavc-ev" key={l.key}>
                <span className="lavc-t">{`+${(Math.max(0, l.at - t0) / 1000).toFixed(1)}s`}</span>
                {raw ? (
                  <span className="lavc-raw"><JsonText value={l.record} indent={false}/></span>
                ) : (
                  <>
                    <span className="lavc-ty" style={{ color: TYPE_COLOR[l.type] || CON_TXT }}>{l.type}</span>
                    <span className="lavc-sid">
                      {l.spanId != null && (
                        <button type="button" className="lavc-id"
                          onClick={e => openInspector(e, { kind: "span", spanId: l.spanId })}>
                          {String(l.spanId).slice(0, 8)}
                        </button>
                      )}
                    </span>
                    <span className="lavc-de">{l.text}</span>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="lavc-wf">
            <div className="lavc-wfhead">Span Waterfall</div>
            {!scale && <div className="lavc-empty">No spans yet.</div>}
            {scale && wf.map(({ row, depth }) => {
              const s = Date.parse(row.created_at);
              const left = Number.isFinite(s) ? ((s - scale.start) / scale.total) * 100 : 0;
              const width = ((row.latency_ms || 0) / scale.total) * 100;
              const intent = featureIntent(row.feature);
              return (
                <div className="lavc-wfrow" key={`${row.span_id}-${row.created_at}`}>
                  <span className="lavc-wflab" style={{ paddingLeft: depth * 9 }}
                    title={`${row.agent_id || "—"}${intent ? ` · ${intent}` : ""}`}>
                    {row.agent_id || "—"}{intent ? ` · ${intent}` : ""}
                  </span>
                  <div className="lavc-wftrack">
                    <div className="lavc-wfbar" style={{ left: pct(left), width: pct(Math.max(width, 0.6)), background: barColor(depth) }}/>
                  </div>
                  <span className="lavc-wfms">{row.latency_ms == null ? "—" : `${row.latency_ms}ms`}</span>
                </div>
              );
            })}
            {scale && liveBars.map(b => {
              const left = ((b.at - scale.start) / scale.total) * 100;
              const width = (((now || b.at) - b.at) / scale.total) * 100;
              return (
                <div className="lavc-wfrow" key={`live-${b.key}`}>
                  <span className="lavc-wflab">{b.label}</span>
                  <div className="lavc-wftrack">
                    <div className="lavc-wfbar" style={{ left: pct(left), width: pct(Math.max(width, 0.6)),
                      background: rgba(T.brassLight, 0.45) }}/>
                  </div>
                  <span className="lavc-wfms">·</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {inspected && (
        <div className="lavc-pop" style={{ left: Math.min(inspect.x, (typeof window !== "undefined" ? window.innerWidth : POP_W * 2) - POP_W - 12), top: Math.max(12, inspect.y) }}>
          <div className="rh">
            <b>{inspected.title}</b>
            <span className="src">ai_activity_log</span>
            <button type="button" className="rx" onClick={() => setInspect(null)} aria-label="Close record inspector">✕</button>
          </div>
          <pre>{inspected.record
            ? <JsonText value={inspected.record} indent/>
            : "row not yet landed — refetch pending"}</pre>
          <div className="note">
            {inspected.pending
              ? "This span has no ai_activity_log row yet. The trace poller is still running; this panel fills in when the row lands."
              : inspected.kind === "trace"
                ? "Summed from this trace's own ai_activity_log rows — no stored trace record exists; every figure above is derived from the rows themselves."
                : "Resolved from the actual ai_activity_log row for this trace_id."}
          </div>
        </div>
      )}
    </div>
  );
}
