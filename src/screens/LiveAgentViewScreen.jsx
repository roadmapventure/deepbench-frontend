// DeepBench v7.0.41 | LiveAgentViewScreen.jsx | LAV-13 -- the Routing badge dot now pulses. A run's
// first delegation can be 10+ seconds out; until then the canvas is empty and the badge is the only
// thing on screen that could signal life, so a steady badge read as a frozen screen (John, live).
// The two-mode inline test is replaced by a named PULSING_MODES set so the rule has one home and
// stops going stale -- it already had, twice. `awaiting` stays STEADY on LAV-1f's unchanged
// reasoning. ModeBadge is shared, so this pulses on desktop too: intended, confirmed with John --
// the dead-window problem is not mobile-specific. Nothing else about the badge changes.
// DeepBench v7.0.36 | LiveAgentViewScreen.jsx | MOB-4a -- mobile Live Agent View, part 1 of 2: the
// shell. Below MOBILE_BREAKPOINT (useIsMobile(), STYLE-GUIDE.md §22) this screen returns a DIFFERENT
// composition of the same shared components, never a CSS reflow of the desktop grid -- the same
// construction §21 already locked for CHI, now locked for this screen as §42. Top to bottom: title
// row + a right-justified `Harness Trace ›` CTA, the picker + Run row (Canvas tab ONLY -- §21's rule
// that the input row belongs to the main tab, not to shared chrome), a permanent tab-independent
// status strip, the Canvas|Answer tab bar, the tab body, and the pinned Agent Routing feed. The
// desktop rail, the bottom trace console and the canvas-overlay prompt box are not rendered on
// mobile; the latter two move into the full-screen Harness Trace overlay.
// The desktop return path is untouched apart from ONE property: the question <select>'s `background`
// shorthand becomes `backgroundColor`. React's inline `background` is the SHORTHAND and resets
// `background-image:none`, wiping tokens.js L78's global chevron -- so that one word applies at BOTH
// widths and is SES-70's proven root cause. The other 7 <select> call sites stay open on that row
// and are deliberately not touched here.
// The canvas INSIDE the Canvas tab is sub-session b's job (AgentNetwork.jsx): until b lands, the tab
// renders today's desktop canvas with today's props unchanged and will look wrong on a phone. That
// is expected and is not a bug to fix in this file.
// Landed AFTER v7.0.38 below despite the lower number -- both versions were claimed atomically and
// LAV-11 pushed first. Out-of-numeric-order landings are expected here; do not renumber. What that
// ordering DID require is real: everything LAV-11 added to the desktop picker and the desktop
// AgentNetwork call (the guardrail-demo option decoration, the answerQuestionId prop) is mirrored
// into the mobile branch below at rebase time, so the two compositions cannot drift.
// FEATURE: MOB-4
// DeepBench v7.0.38 | LiveAgentViewScreen.jsx | LAV-11 -- swaps the LAV-8 question set: measured
// per-trace final gate verdicts (2026-08-01, durable_hops) showed vietnam-reseller only clears the
// pre-display gate 56% of the time, so John replaced it with training-turnover-benchmark (75%
// answer rate). south-korea-coop stays -- John's explicit call -- as a deliberate guardrail-catch
// showcase (0/5, never clears the gate; CHI-98 tracks that gap). Its picker option is decorated
// "Guardrail catch demo: <label>" at this file's option-build point only (chiQuestions.js's
// exported label is never touched, and the undecorated label is still what gets sent to
// runQuestion -- decorating the string actually sent would change the real question asked). The
// run's question id is captured into ranQuestionId at Run-click time (not read live off `picked`,
// which the select allows changing again once a run is in flight) and threaded down to
// AgentNetwork so its Answer drawer can title itself for this one question (LAV-11's other file).
// DeepBench v7.0.29 | LiveAgentViewScreen.jsx | LAV-8 -- the LAV screen now offers exactly the 3
// highest-movement questions (by id, from the shared chiQuestions.js exports, in this fixed order):
// upgrade-cycles (ROTATING_POOL), south-korea-coop, vietnam-reseller (both FIXED_DRAWER_TAIL). Picked
// by John (2026-08-01) from measured durable_hops/ai_activity_log movement across all 23 CHI questions
// -- deepest chains, most agents on screen, most consistent mover. The CHI screen and chiQuestions.js
// itself are untouched; this file's picker/onRun already consumed a flat {id,label} list, so no
// rotation/drawer degrade logic was needed here.
// DeepBench v7.0.28 | LiveAgentViewScreen.jsx | LAV-7a-patch -- the meters block becomes a literal 2-row
// table: ALL four labels on row 1, ALL four values on row 2, each value under its own label. This is the
// layout John's original wording specified ("header in one line, numbers below them on the 2nd line");
// LAV-7a's finding that a 2x2 grid of label-above-value tiles can't wrap further was correct, but the fix
// was this shape, not a width constraint. The standalone Meter tile had no other caller and is removed.
// DeepBench v7.0.25 | LiveAgentViewScreen.jsx | LAV-7a -- John's round-2 UX pass, part 1 of 3: elapsed
// time moves off the strip's right end to sit immediately after the mode badge (the live-activity
// cluster reads left-to-right in one place); the question picker + Run button leave the title block and
// become a single centered row under it, with the bar's own padding/gap tightened so the freed height
// falls through to the canvas; promptPreviewText skips EVERY leading OUTPUT FORMAT block instead of one;
// and the screen now computes the run's real terminal answer (answerQa/answerText) and hands it to
// AgentNetwork for LAV-7b's Answer drawer to render. The meters' 2x2 block is deliberately UNCHANGED --
// see the note at its call site for why the wrap this session was asked to look for cannot occur.
// DeepBench v7.0.19 | LiveAgentViewScreen.jsx | LAV-5a -- John's round-1 UX pass, items 1/3/5/6/7/23/24:
// the question picker reads as the primary CTA (white), the status strip carries the live status message
// + elapsed instead of the question that was run, the four meters move out of the title bar into the strip's
// right end as a 2x2 block (cost at cent precision), the prompt preview grows to 4 lines and starts after
// the leading OUTPUT FORMAT block (the record itself is never altered -- the popover still shows it), and
// the right rail becomes the Agent Routing feed only, rendered with CHI's own exported hop components at
// full rail height. Dropping the rail's other drawers is what removes this file's duplicated copy of
// CHI's loop-scope filter, the last hand-mirrored const it carried (closes LAV-3).
// DeepBench v7.0.9 | LiveAgentViewScreen.jsx | AA-179b -- the screen half of assembly work on the
// canvas. Deliberately close to a no-op: every path the assembly frames need was already generic,
// and this session's job here was to VERIFY that rather than reimplement it (see the three
// AA-179b notes below -- ledger flow-through, agents-engaged, mode). The one item the design asked
// for that could NOT land in this session's two files is recorded at the AuditColumn call site.
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
import { useAgents } from "../hooks/useAgents.js";
import { useHarnessStream } from "../hooks/useHarnessStream.js";
// FEATURE: MOB-4 -- the platform's single breakpoint source (STYLE-GUIDE.md §22). Never re-derived
// inline: the media query and the pixel figure both live in that hook and nowhere else.
import { useIsMobile } from "../hooks/useIsMobile.js";
// FEATURE: LAV-5a -- CHI's own hop-feed components, imported unmodified. The rail below is the same
// render path CHI's AuditColumn uses; only the container (a plain full-height section instead of a
// capped Drawer inside the Focus Area Audit stack) differs.
// FEATURE: MOB-4 -- QaEvidenceCard joins that same import: the Answer tab renders CHI's own card,
// the one implementation platform-wide (AgentNetwork.jsx's LAV-7b drawer already calls it the same
// way, with `qa` as its only prop -- read at its call site, not assumed).
import {
  groupEventsIntoHops, QuestionDivider, RoutingHopCard, AGENT_ROUTING_EMPTY_TEXT, QaEvidenceCard,
} from "./MarketIntelligenceScreen.jsx";
import AgentNetwork from "../components/AgentNetwork.jsx";
import { ROTATING_POOL, FIXED_DRAWER_TAIL } from "../data/chiQuestions.js";
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

// FEATURE: LAV-5a -- LAV-1b's hand-mirrored copy of CHI's loop-scope filter is gone (closes LAV-3). It
// existed only to scope the Agents/Data Sources drawers this rail no longer renders; the single remaining
// copy lives where it was always canonical, in MarketIntelligenceScreen.jsx.

// FEATURE: LAV-1b -- page identity. John's explicit dual-naming call (2026-07-31): the page title
// and the nav label are deliberately different strings and are not to be unified. The nav label is
// LAV-1e's job; nothing in this file touches nav.
const PAGE_TITLE = "Live Multi-Agent Routing";
const PAGE_SUBTITLE = "Harness, Loop, Pattern Behavior Display";
const PICKER_PLACEHOLDER = "Choose a question and watch the agents work…";

// FEATURE: LAV-11 -- vietnam-reseller replaced by training-turnover-benchmark (measured 75% answer
// rate vs. vietnam-reseller's 56% pre-display gate clear rate); south-korea-coop kept deliberately
// as the guardrail-catch demo (0/5, tracked by CHI-98). Still exactly 3, still looked up by id
// against the shared exports (never copied label strings, so a future label edit in chiQuestions.js
// still propagates here with no change needed). upgrade-cycles and training-turnover-benchmark live
// in ROTATING_POOL/FIXED_DRAWER_TAIL respectively (both source arrays are searched below); order is
// driven by LAV_QUESTION_IDS alone. The CHI screen's own ALL_QUESTIONS-equivalent
// (MarketIntelligenceScreen.jsx) is untouched and keeps all 23.
const LAV_QUESTION_IDS = ["upgrade-cycles", "training-turnover-benchmark", "south-korea-coop"];
// FEATURE: LAV-11 -- the id whose picker option gets the guardrail-catch prefix. Kept as a named
// constant rather than a string literal at each use site (the option-label decoration below and
// AgentNetwork's drawer-title decision, threaded via ranQuestionId) so both stay in lockstep.
const GUARDRAIL_DEMO_QUESTION_ID = "south-korea-coop";
const LAV_QUESTION_SOURCE = [...ROTATING_POOL, ...FIXED_DRAWER_TAIL];
const ALL_QUESTIONS = LAV_QUESTION_IDS
  .map(id => LAV_QUESTION_SOURCE.find(q => q.id === id))
  .filter(Boolean);

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

// MOB-4a -- mobile-width elapsed/expectation. m:ss instead of "Xm Ys", and the expectation
// abbreviated to its minute figure. ARCHITECTURE.md §19o requires the expectation to remain
// visible on mobile, so it is shortened, never dropped. Mobile always derives from the numeric
// expectationMs (falling back to desktop's own 120000 default) rather than liveStatus.expectation's
// pre-formatted desktop string, which is too long for this row by construction.
export function formatElapsedShort(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function formatExpectationShort(ms) {
  const sec = Math.ceil(ms / 1000 / 5) * 5;
  const m = Math.floor(sec / 60);
  return m > 0 ? `>${m}m` : `>${sec}s`;
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

// FEATURE: LAV-9c -- "Question Answered" (John's own wording, design session 2026-08-01): the
// specific thing that finished is the question, and this is what tells the user to look at the
// metrics/canvas/answer around the screen -- not a generic process-complete word.
const MODE_COPY = { idle: "Idle", route: "Routing", orch: "Orchestrating", awaiting: "Awaiting confirmation", complete: "Question Answered", error: "Error" };

// FEATURE: LAV-13 -- which badge states animate. `route` joins because a run genuinely IS in
// progress from the moment it starts, and the first delegation can be 10+ seconds out; a steady
// badge across that window reads as a frozen screen, which is exactly what John hit live.
// `awaiting` deliberately stays STEADY -- LAV-1f's reasoning is unchanged and still correct: the
// harness is stopped waiting on a human, and a pulse there would claim work is happening when
// none is. `idle` and `error` are at-rest states.
const PULSING_MODES = new Set(["route", "orch", "complete"]);

function ModeBadge({ mode, detail }) {
  const tint = {
    idle:     { fg: T.muted,     br: T.line },
    route:    { fg: T.brassDeep, br: T.brass },
    orch:     { fg: ACTION_TEXT_COLORS_FETCH.CLICK, br: ACTION_TEXT_COLORS_FETCH.CLICK },
    // FEATURE: LAV-1f -- brass family, and deliberately the brassGlow token, whose single documented
    // job (tokens.js, CHI-05) is the "needs your input" surface. Steady -- it is deliberately NOT in
    // PULSING_MODES above, because a pulsing badge would read as work in progress when nothing is
    // progressing. (This clause used to read "only `orch` animates"; that enumeration went stale at
    // LAV-9c and again at LAV-13, which is why the set is now named once and read from one place.)
    awaiting: { fg: T.brassDeep, br: T.brassGlow },
    complete: { fg: T.moss,      br: T.moss },
    error:    { fg: T.flag,      br: T.flag },
  }[mode];
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:7,flexShrink:0,fontFamily:body,fontSize:11,
      fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",padding:"5px 12px",borderRadius:20,
      border:`1.5px solid ${tint.br}`,color:tint.fg,background:T.card}}>
      <span style={{width:9,height:9,borderRadius:"50%",background:tint.br,
        // FEATURE: LAV-9c -- "Question Answered" pulses continuously for as long as the badge sits
        // in that state (same as `orch` already does), per John: the pulse is what tells the user
        // the ending metrics around the screen are ready to look at, for however long they take to
        // notice -- not a brief flourish that stops before anyone sees it. It reads as a distinct
        // signal from `orch`'s pulse (different color -- T.moss green vs the CLICK blue `orch` uses
        // -- and different label), so the two "this is animating" states don't get confused for the
        // same meaning.
        animation: PULSING_MODES.has(mode) ? "aiBlink 1.1s ease-in-out infinite" : "none"}}/>
      <span>{MODE_COPY[mode]}</span>
      {detail && <span style={{fontFamily:mono,fontWeight:600,letterSpacing:0,textTransform:"none",
        maxWidth:220,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{String(detail)}</span>}
    </div>
  );
}

// FEATURE: LAV-7a-patch -- the LAV-1c `Meter` tile (label above value) is deleted here: the meters
// block is now a literal 2-row table rendered inline, and this file was its only call site.

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
// FEATURE: LAV-5a -- The assembled prompt is `=== LABEL ===` blocks joined by "\n\n---\n\n"
// (api/prompt/ai-enrichment.js renderSection/assembleSystemPrompt; HAR-02b orders the format section
// first, deliberately, for prompt caching). The PREVIEW starts after a leading OUTPUT FORMAT block; the
// popover keeps the full untouched text -- the record is never altered, only where the preview window
// starts. Exported for the session's test and future reuse.
// FEATURE: LAV-7a -- loops instead of stripping one block. Found live 2026-08-01: Alex Reeves's
// screen-controls capability had TWO Format Skill Profiles attached in Supabase (a duplicate-
// attachment data bug, fixed this session -- capability_skill_profiles row d1bff23b-... deleted),
// so a single-strip skip left the second copy showing. The loop is defense in depth: it makes the
// preview correct regardless of how many leading OUTPUT FORMAT blocks the real prompt happens to
// carry, without asserting there will only ever be one or two.
// The loop stops at `blocks.length - 1`, never `blocks.length`: LAV-5a's `blocks.length > 1` guard
// carried a real invariant -- the preview is NEVER blank -- and an unbounded loop silently drops it
// (a prompt that is nothing but format blocks would strip to ""). The bound is that same guard,
// restated per-iteration: the last block is never consumable, so there is always something to show.
export function promptPreviewText(text) {
  if (typeof text !== "string" || !text) return text;
  const blocks = text.split("\n\n---\n\n");
  let start = 0;
  while (start < blocks.length - 1 && /^===\s*OUTPUT FORMAT\s*===/.test(blocks[start])) start += 1;
  return start > 0 ? blocks.slice(start).join("\n\n---\n\n") : text;
}

// FEATURE: MOB-4 -- `inline` is the ONLY thing this component gained. When true the outer div stops
// being a canvas overlay (it has no canvas to sit over inside the Harness Trace overlay) and becomes
// a normal full-width block. The 4-line clamp, promptPreviewText, countLabel and the click-to-open
// popover are all untouched, and the desktop call site keeps today's absolute positioning by simply
// omitting the prop.
function PromptBox({ prompt, agents, traceRows, inline = false }) {
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
        style={{...(inline
            ? {position:"static",width:"100%"}
            : {position:"absolute",right:314,bottom:8,zIndex:7,width:"min(660px, 52%)"}),
          background:rgba(T.paper, 0.94),border:`1px solid ${T.line}`,borderRadius:8,padding:"6px 11px",
          boxShadow:`0 2px 8px ${rgba(T.navy, 0.16)}`,cursor: hasText ? "pointer" : "default"}}>
        <div style={{fontFamily:mono,fontWeight:600,fontSize:8,letterSpacing:"0.1em",
          textTransform:"uppercase",color:T.muted,marginBottom:3}}>
          Prompt assembled for <b style={{color:T.navy}}>{who || PROMPT_DASH}</b> · {countLabel}
        </div>
        {/* FEATURE: LAV-5a -- 4 lines, and the preview window starts after the leading OUTPUT FORMAT
            block. `countLabel` above and the popover below both still render from the FULL text. */}
        <div style={{fontFamily:mono,fontSize:11,lineHeight:1.42,color:T.muted,
          display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
          {hasText ? promptPreviewText(text) : PROMPT_IDLE_BODY}
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

// FEATURE: LAV-5a -- the right rail is the Agent Routing feed and nothing else. CHI's Focus Area Audit
// container (its heading, its Agents/Data Sources/Analysis drawers) belongs to CHI's job of auditing a
// focus area; this screen's job is the routing story, and the rail now gives that story the full column
// height instead of a 280px Drawer window. Everything below the header is CHI's own implementation --
// groupEventsIntoHops / QuestionDivider / RoutingHopCard, imported unmodified -- so there is exactly one
// hop-rendering path platform-wide. `assembly_work`/`assembly_work_complete` frames reach this feed by
// design (AA-179b) and describePipelineEvent already renders their copy (AA-179e), so reusing the cards
// inherits that for free.
function AgentRoutingRail({ events, agents }) {
  const agentById = (id) => agents.find(a => a.id === id);
  const ordered = [...events].reverse();          // newest on top, same as AuditColumn
  const hops = groupEventsIntoHops(ordered);
  const realHopCount = hops.filter(h => !h.isBoundary).length;  // boundary markers are dividers, not hops

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {/* The drawer-title look without the Drawer: not collapsible, nothing to collapse into. */}
      <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",
        textTransform:"uppercase",color:T.muted}}>
        Agent Routing · {realHopCount} hop{realHopCount === 1 ? "" : "s"}
      </div>
      {ordered.length === 0 ? (
        <div style={{fontFamily:body,fontSize:12,color:T.muted}}>{AGENT_ROUTING_EMPTY_TEXT}</div>
      ) : hops.map(hop =>
          hop.isBoundary
            ? <QuestionDivider key={hop.events[0].id} evt={hop.events[0]}/>
            : <RoutingHopCard key={hop.events[hop.events.length - 1].id} hop={hop} agentById={agentById}/>
        )}
    </div>
  );
}

// FEATURE: MOB-4 -- the mobile status strip's meter pair. Two tiles only: Active Spans and Agents
// Engaged are suppressed at this width (four 8px labels across 402px are unreadable), which is a
// display decision -- both figures are still derived above, unchanged, for the desktop strip.
const MOB_METER_LABEL = {fontFamily:mono,fontSize:7.5,letterSpacing:"0.13em",
  textTransform:"uppercase",color:T.muted};
const MOB_METER_VALUE = {fontFamily:mono,fontSize:13,fontWeight:700,color:T.navy};
// The two mobile tabs, in render order. `canvas` is the default (STYLE-GUIDE.md §42).
const MOB_TABS = [["canvas", "Canvas"], ["answer", "Answer"]];

export default function LiveAgentViewScreen() {
  const agents = useAgents();
  const { events, status, running, result, error, recovery, prompt, traceIds, pending, resolving,
    runQuestion, resolveConfirmation } = useHarnessStream();

  // FEATURE: MOB-4 -- one breakpoint source, read once. Both pieces of mobile-only state live up
  // here with every other hook so the two return paths below call an identical hook sequence.
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState("canvas");   // "canvas" | "answer"
  const [showTrace, setShowTrace] = useState(false);      // the Harness Trace overlay

  const [picked, setPicked] = useState("");
  // FEATURE: LAV-11 -- captured at Run-click time, not read live off `picked` (the select is not
  // disabled while a run is in flight, so `picked` can change again before the run goes terminal).
  // This is the id AgentNetwork's Answer drawer keys its title on.
  const [ranQuestionId, setRanQuestionId] = useState(null);
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

  // Node state / bubbles / pulses are per-RUN -- and, since LAV-12, so are the canvas's observed
  // edges: both <AgentNetwork> call sites now pass the run-scoped list for `hops` too. The whole
  // ledger below still feeds the HARNESS TRACE console, which really is session-wide.
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
  // to their pre-LAV-1d behavior. Neither AgentNetwork.jsx nor CHI's hop components are modified.
  // FEATURE: AA-179b -- verified this session, not assumed: this predicate matches EXACTLY ONE type
  // and is deliberately NOT widened. `assembly_work` / `assembly_work_complete` therefore reach the
  // canvas (walk-on-stage + the muted ring, AgentNetwork.jsx) AND the Pipeline Log rail, which is
  // John's locked treatment -- assembly work is real work by a real agent, unlike `prompt_assembled`,
  // which is the plumbing frame announcing the result of that work.
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

  // ── terminal / timer bookkeeping ───────────────────────────────────────────
  useEffect(() => { if (result) setTerminal("result"); }, [result]);
  useEffect(() => { if (error) setTerminal("error"); }, [error]);
  // FEATURE: LAV-9c -- the 3-second auto-revert removed. `terminal` now stays "result"/"error" until
  // the ONLY other place that ever clears it: onRun()'s setTerminal(null) (below, unchanged), which
  // fires when the NEXT question actually starts. Previously this timer meant the "Question
  // Answered" badge was only ever visible for 3 seconds before silently degrading to the exact same
  // "Idle" look as a screen that has never run anything -- the confusion John flagged.
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
  // FEATURE: AA-179b -- assembly workers join this count with no code change: the formula is a
  // distinct-agentId count over the run's canvas hops, and an assembly frame is credited to its
  // worker like any other. Confirmed, not reimplemented. The two span meters above are equally
  // unaffected in the other direction -- deriveActiveSpans/peakActiveSpans branch on the three
  // delegation types by name (HarnessTraceConsole.jsx ~L57-78, read fresh this session), so an
  // assembly frame cannot inflate a span figure.
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
  // FEATURE: AA-179b -- deriveMode is untouched and stays untouched: its only event test is
  // `delegation_return`, so an assembly frame can never flip the badge to Routing or Orchestrating.
  // Assembly work is not a routing decision (§19d) and the badge must not imply it is.
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
  // FEATURE: MOB-4 -- the same figures at mobile width, same `base` guard, same clock. Desktop's
  // elapsedText above is unchanged and stays the only thing the desktop strip reads.
  const elapsedTextShort = base
    ? `${formatElapsedShort(clock - base)} · ${formatExpectationShort(liveStatus?.expectationMs ?? 120000)}`
    : null;

  // ── Task 4: the run's real terminal answer, for LAV-7b's Answer drawer ──────────────────────
  // FEATURE: LAV-7a -- the real terminal answer, mapped to QaEvidenceCard's exact shape (the same
  // snake_case -> camelCase field the CHI screen itself performs at its own qaEvidence build site,
  // MarketIntelligenceScreen.jsx ~L3989-3998). Nothing is authored here: every field is the harness's
  // own terminal frame, spread verbatim. kind !== "qa" (a guardrail failure or a non-qa/escalate turn)
  // still carries a real message -- passed as plain text for the drawer to render as prose, never
  // forced into the qa card shape it does not have the fields for. This session computes and passes
  // them only; the drawer that renders them is LAV-7b's, inside AgentNetwork.jsx.
  const answerQa = result && result.kind === "qa"
    ? { ...result, keyDataPoints: result.key_data_points }
    : null;
  const answerText = result && result.kind !== "qa" ? (result.text || null) : null;

  // FEATURE: LAV-1f -- an open gate blocks a new question. Not a timer and not a default decision:
  // the run genuinely has not finished, and letting a new one start would silently abandon a gate
  // the harness is still holding open. The gate stays pending until a human resolves it.
  const onRun = () => {
    const q = ALL_QUESTIONS.find(x => x.id === picked);
    if (!q || running || awaiting) return;
    setTerminal(null);
    setRanQuestionId(q.id);
    runQuestion(q.label);
  };

  // ── MOB-4a: the mobile composition ──────────────────────────────────────────────────────────
  // A separate return, not a reflow of the one below: the desktop canvas is a locked
  // aspect-ratio:1200/640 viewBox with 132px fixed-pixel node cards, and eleven mi-roster cards
  // cannot coexist on a 402px screen (STYLE-GUIDE.md §42). Every hook above runs identically on
  // both paths -- this branch is placed after the last one deliberately.
  if (isMobile) {
    const runDisabled = !picked || running || awaiting;
    return (
      <AppShell>
        <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",minHeight:0,
          background:T.paperDeep,overflow:"hidden"}}>
          <FeatureBadge id="LAV-1"/>
          <FeatureBadge id="LAV-5"/>
          <FeatureBadge id="MOB-4"/>

          {/* ── Title row ── */}
          {/* CHI-88's locked mobile title chrome, mirrored: one 17px line with the focus area's own
              status tag inline, then a right-justified boxless text CTA on its own line. PAGE_SUBTITLE
              is deliberately NOT here -- it renders at the top of the Harness Trace overlay instead,
              from the same single module-scope constant the desktop title block uses. */}
          <div style={{background:T.paper,padding:"9px 14px 8px",borderBottom:`1px solid ${T.line}`,
            flexShrink:0}}>
            <div style={{fontFamily:display,fontSize:17,fontWeight:700,color:T.navy,lineHeight:1.15}}>
              {PAGE_TITLE}{FOCUS_AREA_STATUS.liveAgentView && <span style={FOCUS_STATUS_STYLE}> ({FOCUS_AREA_STATUS.liveAgentView})</span>}
            </div>
            <button type="button" onClick={() => setShowTrace(true)}
              style={{display:"block",width:"100%",textAlign:"right",background:"none",border:"none",
                fontFamily:body,fontSize:12,fontWeight:600,color:T.brassDeep,marginTop:5,
                padding:"2px 0",cursor:"pointer",whiteSpace:"nowrap"}}>
              Harness Trace ›
            </button>
          </div>

          {/* ── Picker + Run, Canvas tab only ── */}
          {/* §21's locked rule: the input row belongs to the main tab, not to shared chrome. The
              Answer tab has nothing to run. Same value/onChange/aria-label/options and the same
              disabled logic as desktop -- only the metrics change. fontSize:16 is the locked mobile
              text-input floor (below 16px iPhone browsers auto-zoom on focus and never zoom back).
              backgroundColor, never the `background` shorthand -- see the file header. */}
          {mobileTab === "canvas" && (
            <div style={{background:T.paper,padding:"0 14px 9px",display:"flex",gap:7,flexShrink:0}}>
              <select value={picked} onChange={e => setPicked(e.target.value)} aria-label="Pick a question"
                style={{flex:1,minWidth:0,fontFamily:body,fontSize:16,color:T.ink,backgroundColor:T.white,
                  border:`1px solid ${T.line}`,borderRadius:6,padding:"9px 28px 9px 10px",outline:"none",
                  cursor:"pointer",textOverflow:"ellipsis",whiteSpace:"nowrap",overflow:"hidden"}}>
                <option value="">{PICKER_PLACEHOLDER}</option>
                {/* FEATURE: LAV-11 -- the SAME option list the desktop picker builds, guardrail-demo
                    prefix included. Mirrored deliberately at rebase time: a mobile picker that
                    silently dropped the decoration would offer a different-reading question set at
                    one width, and onRun still sends the undecorated q.label from either branch. */}
                {ALL_QUESTIONS.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.id === GUARDRAIL_DEMO_QUESTION_ID ? `Guardrail catch demo: ${q.label}` : q.label}
                  </option>
                ))}
              </select>
              <button onClick={onRun} disabled={runDisabled}
                style={{background:T.navy,color:T.card,border:"none",fontFamily:body,fontWeight:600,
                  fontSize:14,padding:"9px 15px",borderRadius:6,letterSpacing:"0.3px",whiteSpace:"nowrap",
                  cursor: runDisabled ? "default" : "pointer", opacity: runDisabled ? 0.45 : 1}}>
                Run ▸
              </button>
            </div>
          )}

          {/* ── Status strip: permanent, tab-independent ── */}
          {/* §21's locked fix, inherited: the one progress indicator on the page must never be
              inside a tab body, or switching tabs hides it. Both status branches keep desktop's
              priority -- `awaiting` outranks the streamed message. */}
          <div style={{background:T.cardAlt,borderBottom:`1px solid ${T.line}`,padding:"7px 14px",
            flexShrink:0,display:"flex",flexDirection:"column",gap:4}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <ModeBadge mode={mode} detail={badgeDetail}/>
              {elapsedTextShort && (
                <div style={{fontFamily:mono,fontSize:10,color:T.brassDeep,flexShrink:0}}>
                  {elapsedTextShort}
                </div>
              )}
              <div style={{marginLeft:"auto",display:"flex",gap:12,flexShrink:0,textAlign:"right"}}>
                <div>
                  <div style={MOB_METER_LABEL}>Tokens</div>
                  <div style={MOB_METER_VALUE}>{formatTokens(tokenTotal)}</div>
                </div>
                <div>
                  <div style={MOB_METER_LABEL}>Est. Cost</div>
                  <div style={MOB_METER_VALUE}>{costTotal == null ? "—" : `$${costTotal.toFixed(2)}`}</div>
                </div>
              </div>
            </div>
            {awaiting ? (
              <div style={{fontFamily:mono,fontSize:11,fontWeight:700,color:T.brassDeep,
                textTransform:"uppercase",letterSpacing:"0.02em"}}>
                Needs Your Decision
              </div>
            ) : (
              <div style={{fontFamily:mono,fontSize:10.5,color:T.muted,fontStyle:"italic",
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {status?.message || ""}
              </div>
            )}
          </div>

          {/* ── Tab bar ── */}
          <div style={{display:"flex",background:T.paper,borderBottom:`1px solid ${T.line}`,flexShrink:0}}>
            {MOB_TABS.map(([key, label]) => {
              const on = mobileTab === key;
              return (
                <button key={key} type="button" onClick={() => setMobileTab(key)}
                  style={{flex:1,fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.11em",
                    textTransform:"uppercase",padding:"10px 4px",border:"none",cursor:"pointer",
                    background: on ? T.cardAlt : "none", color: on ? T.navy : T.muted,
                    borderBottom: `2px solid ${on ? T.brass : "transparent"}`}}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* ── Tab body ── */}
          {/* Canvas: today's AgentNetwork with today's props, byte-for-byte -- including LAV-11's
              answerQuestionId, mirrored here at rebase time. This call is the sibling of the desktop
              one below and has to carry the identical prop set: a prop added to one and not the
              other is exactly how a screen's two payloads drift apart unnoticed (SES-57). Sub-session
              b gives the canvas its own mobile composition; nothing about it is this session's to
              change. */}
          {mobileTab === "canvas" ? (
            <div style={{position:"relative",flex:3,display:"flex",alignItems:"stretch",minHeight:0}}>
              {/* FEATURE: LAV-12 -- `hops` now gets the SAME per-run slice `runHops` already is
                  (`canvasRunHops`), not the whole-session ledger (`canvasHops`). sessionEdges() only
                  ever reads whatever list it's handed to find delegation-family hops, so passing the
                  run-scoped list is sufficient on its own -- no change to sessionEdges()/AgentNetwork.
                  A deliberate reversal of the LAV-1b/1c-era "edges persist across runs" choice: a
                  line from question A survived into question B, whose node/queue state is run-scoped,
                  so it read as a line pointing at a card sitting in the queue. */}
              <AgentNetwork roster={roster} hops={canvasRunHops} runHops={canvasRunHops} running={running}
                traceRows={traceRows} recoveringAgentId={recoveringAgentId}
                choreographed={choreographed} onToggleChoreographed={setChoreographed}
                pending={pending} resolving={resolving} onResolveConfirmation={resolveConfirmation}
                answerQa={answerQa} answerText={answerText} answerQuestionId={ranQuestionId}/>
            </div>
          ) : (
            /* Answer: CHI's own QaEvidenceCard for a real qa result, the terminal frame's own text
               otherwise. The empty line is screen chrome for an empty state -- the same register as
               the routing rail's own empty text -- never a stand-in for an agent's words. */
            <div style={{flex:3,minHeight:0,overflowY:"auto",background:T.paperDeep,padding:"12px 14px"}}>
              {answerQa
                ? <QaEvidenceCard qa={answerQa}/>
                : answerText
                  ? <div style={{fontFamily:body,fontSize:13,color:T.ink,lineHeight:1.55,
                      whiteSpace:"pre-wrap"}}>{answerText}</div>
                  : <div style={{fontFamily:body,fontSize:13,color:T.muted,fontStyle:"italic"}}>
                      No answer yet — run a question.
                    </div>}
            </div>
          )}

          {/* ── Pinned Agent Routing feed ── */}
          {/* Visible under both tabs and scrolling independently of the tab body, exactly as §21
              pins CHI's. Same AgentRoutingRail, same events, unchanged. */}
          <div style={{flex:1,minHeight:0,overflowY:"auto",background:T.paperDeep,
            borderTop:`1px solid ${T.line}`,padding:"8px 12px"}}>
            <AgentRoutingRail events={railEvents} agents={agents}/>
          </div>

          {/* ── Harness Trace overlay ── */}
          {/* Everything mobile drops from the main composition lands here: the assembled-prompt box
              (inline, full width) and the trace console + span waterfall with the same props the
              desktop path passes. `← Back to Canvas` is the only dismissal -- §21's unchanged
              convention, deliberately no backdrop tap. */}
          {showTrace && (
            <div style={{position:"fixed",inset:0,zIndex:2000,background:T.paperDeep,
              display:"flex",flexDirection:"column"}}>
              <div style={{flexShrink:0,background:T.paper,borderBottom:`1px solid ${T.line}`,
                padding:"6px 14px 9px"}}>
                <button type="button" onClick={() => setShowTrace(false)}
                  style={{background:"none",border:"none",fontFamily:body,fontSize:12,fontWeight:600,
                    color:T.brassDeep,padding:"8px 12px 8px 0",cursor:"pointer",whiteSpace:"nowrap"}}>
                  ← Back to Canvas
                </button>
                <div style={{fontFamily:mono,fontSize:11.5,color:T.muted,letterSpacing:"0.02em"}}>
                  {PAGE_SUBTITLE}
                </div>
              </div>
              <div style={{flex:1,minHeight:0,overflowY:"auto",padding:"10px 12px 14px",
                display:"flex",flexDirection:"column",gap:10}}>
                <PromptBox prompt={prompt} agents={agents} traceRows={traceRows} inline/>
                <HarnessTraceConsole
                  events={runHops} eventTimes={runHopTimes} traceRows={traceRows} traceId={traceId}
                  traceIds={traceIds}
                  running={running} recovery={recovery} recoveryAt={recoveryMark?.at ?? 0} now={now}/>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",minHeight:0,
        background:T.paperDeep,overflow:"hidden"}}>
        <FeatureBadge id="LAV-1"/>
        <FeatureBadge id="LAV-5"/>

        {/* ── Title bar ── */}
        {/* FEATURE: LAV-7a -- two stacked rows instead of one flex row with a trailing spacer. Row 1 is
            the page identity, still left-aligned and unchanged in copy; row 2 is the question picker +
            Run, centered across the full bar as the visually primary action rather than tucked under
            the subtitle. The vertical padding (11px -> 8px) and the picker's old marginTop:10 (now a
            6px column gap) are tightened together, so the bar is measurably shorter than round-1's --
            and since the canvas row below is `flex:1`, every pixel freed here lands on the canvas with
            no canvas-side change. FEATURE: LAV-5a -- the meters left this bar for the status strip
            below; nothing sits to the right of the title any more, so the old spacer div is gone. */}
        <div style={{background:T.paper,borderBottom:`1px solid ${T.line}`,padding:"8px 24px",
          display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
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
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {/* FEATURE: LAV-5a -- white, not cream: the picker is this screen's primary call to action
                and has to read as the one thing to touch against the T.paper title bar. */}
            <select value={picked} onChange={e => setPicked(e.target.value)} aria-label="Pick a question"
              style={{maxWidth:560,minWidth:360,fontFamily:body,fontSize:12.5,color:T.ink,backgroundColor:T.white,
                border:`1px solid ${T.line}`,borderRadius:6,padding:"8px 30px 8px 11px",outline:"none",
                cursor:"pointer",textOverflow:"ellipsis",whiteSpace:"nowrap",overflow:"hidden"}}>
              <option value="">{PICKER_PLACEHOLDER}</option>
              {/* FEATURE: LAV-11 -- south-korea-coop's option reads with a "Guardrail catch demo: "
                  prefix, decorated here only. chiQuestions.js's exported label stays undecorated
                  (CHI's own picker must keep reading it plain), and onRun still sends q.label --
                  the undecorated string -- to runQuestion, so this prefix never reaches the harness
                  as part of the actual question asked. */}
              {ALL_QUESTIONS.map(q => (
                <option key={q.id} value={q.id}>
                  {q.id === GUARDRAIL_DEMO_QUESTION_ID ? `Guardrail catch demo: ${q.label}` : q.label}
                </option>
              ))}
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

        {/* ── Status strip ── */}
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"8px 24px",background:T.cardAlt,
          borderBottom:`1px solid ${T.line}`,flexShrink:0}}>
          <ModeBadge mode={mode} detail={badgeDetail}/>
          {/* FEATURE: LAV-7a -- elapsed sits here, immediately after the mode badge, instead of at the
              strip's right end. Same styling, same value, same `elapsedText &&` guard -- only the slot
              moved: badge + clock + status message are one left-to-right reading of "what is happening
              and how long has it been", and splitting the clock off to the far right made the eye cross
              the whole strip to assemble it. */}
          {elapsedText && (
            <div style={{fontFamily:mono,fontSize:10,color:T.brassDeep,flexShrink:0}}>{elapsedText}</div>
          )}
          {/* FEATURE: LAV-5a -- the strip carries live activity, not the question. The question is
              already on screen in the picker directly above, so repeating it here spent the widest
              line on the page on a string the user just chose; the live status message takes that
              space instead and grows into it (no 340px cap).
              FEATURE: LAV-1f -- while the gate is open the harness is emitting nothing, so there is
              no live status message to show; the strip carries CHI's own NeedsDecisionBadge copy
              (MarketIntelligenceScreen.jsx ~L1209) verbatim instead -- the platform's existing
              words for exactly this state, in the same brass. Once the decision is dispatched the
              real streamed status takes over again. That branch keeps its priority unchanged. */}
          {awaiting ? (
            <div style={{fontFamily:mono,fontSize:11,color:T.brassDeep,fontWeight:700,flex:1,minWidth:0,
              textTransform:"uppercase",letterSpacing:"0.02em"}}>
              Needs Your Decision
            </div>
          ) : (
            <div style={{fontFamily:mono,fontSize:11,color:T.muted,fontStyle:"italic",flex:1,minWidth:0,
              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
              {status?.message || ""}
            </div>
          )}
          {/* FEATURE: LAV-5a -- the four meters, unchanged in what they measure (every tile is still Σ
              over real ai_activity_log rows or a count over real ledger events), moved out of the title
              bar to the strip's right end. (Its 2x2 layout is superseded by LAV-7a-patch below.) Est.
              Cost rounds to cents -- John's call; the 4-decimal figure read as noise at this size. */}
          {/* FEATURE: LAV-7a-patch -- literal 2-row spec: ALL labels on row 1, ALL values on row 2,
              each value under its own label. Replaces the 2x2 tile grid (S-LAV-7a correctly found that
              grid couldn't wrap further -- the fix is this shape, not a width constraint). */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4, auto)",columnGap:16,rowGap:2,flexShrink:0}}>
            <div style={{fontFamily:mono,fontSize:8,letterSpacing:"0.14em",textTransform:"uppercase",color:T.muted}}>Active Spans</div>
            <div style={{fontFamily:mono,fontSize:8,letterSpacing:"0.14em",textTransform:"uppercase",color:T.muted}}>Tokens</div>
            <div style={{fontFamily:mono,fontSize:8,letterSpacing:"0.14em",textTransform:"uppercase",color:T.muted}}>Est. Cost</div>
            <div style={{fontFamily:mono,fontSize:8,letterSpacing:"0.14em",textTransform:"uppercase",color:T.muted}}>Agents Engaged</div>
            <div style={{fontFamily:mono,fontSize:15,fontWeight:700,color:T.navy}}>
              {activeSpans}{peakSpans ? <span style={{fontSize:10,color:T.muted,fontWeight:500}}> peak {peakSpans}</span> : null}
            </div>
            <div style={{fontFamily:mono,fontSize:15,fontWeight:700,color:T.navy}}>
              {formatTokens(tokenTotal)}<span style={{fontSize:10,color:T.muted,fontWeight:500}}> tok</span>
            </div>
            <div style={{fontFamily:mono,fontSize:15,fontWeight:700,color:T.navy}}>
              {costTotal == null ? "—" : `$${costTotal.toFixed(2)}`}
            </div>
            <div style={{fontFamily:mono,fontSize:15,fontWeight:700,color:T.navy}}>{agentsEngaged}</div>
          </div>
        </div>

        {/* ── Canvas + right rail ── */}
        {/* FEATURE: LAV-1c -- LAV-1b QA finding: this row has to be the ONLY growing row on the
            page so the canvas genuinely takes the whole remaining viewport height (the console
            below is flex-shrink:0). minHeight:0 + alignItems:stretch is what lets it shrink when
            the console is open instead of pushing the page into a scroll. */}
        {/* FEATURE: LAV-1d -- position:relative so the prompt box can sit as a bottom overlay
            beside AgentNetwork's own legend (which is absolute at left:12/bottom:8 inside it),
            clear of the 300px rail. */}
        {/* FEATURE: LAV-7a -- `answerQa`/`answerText` below are new optional props, both null until this
            run goes terminal. LAV-7b adds the receiving `answerQa = null, answerText = null` defaults
            and the Answer drawer that renders them; passing them ahead of that render is a no-op on
            today's AgentNetwork, which simply ignores props it does not destructure. */}
        <div style={{position:"relative",flex:1,display:"flex",alignItems:"stretch",minHeight:0}}>
          {/* FEATURE: LAV-12 -- run-scoped `hops`, same reversal as the mobile call site above. */}
          <AgentNetwork roster={roster} hops={canvasRunHops} runHops={canvasRunHops} running={running}
            traceRows={traceRows} recoveringAgentId={recoveringAgentId}
            choreographed={choreographed} onToggleChoreographed={setChoreographed}
            pending={pending} resolving={resolving} onResolveConfirmation={resolveConfirmation}
            answerQa={answerQa} answerText={answerText} answerQuestionId={ranQuestionId}/>
          <PromptBox prompt={prompt} agents={agents} traceRows={traceRows}/>
          <aside style={{width:300,flexShrink:0,borderLeft:`1px solid ${T.line}`,background:T.paperDeep,
            padding:"12px 14px",overflowY:"auto",minHeight:0}}>
            {/* FEATURE: AA-179b -- assembly frames DO reach this rail (railEvents filters only
                prompt_assembled, above), so each assembly worker gets its own numbered entry here in
                arrival order. The blank-text gap AA-179b recorded at this call site is closed: AA-179e
                gave describePipelineEvent a real case for both assembly types, so the shared
                RoutingHopCard renders their composed message with no work needed here. */}
            <AgentRoutingRail events={railEvents} agents={agents}/>
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
