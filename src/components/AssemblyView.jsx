// DeepBench v7.0.56 | AssemblyView.jsx | LAV-21c -- delegated work fills its stage. On the console's
// real Q&A runs the final formatting resolves BY DELEGATION (Michelle Manning brokers Alex Reeves'
// `qa-answer-format` intent, so the work streams as a `delegation_complete`, not a `display_format`
// hop -- LOO-010 removed the client-side display_format crediting for delegated resolutions). The
// fold ignored delegation completions categorically, so the Final form stage never appeared on those
// runs even though LAV-21a put the declared work (`toIntentSlug`) on the ledger. §19r as written: a
// stage lights from the hop's DECLARED WORK, and a completion whose slug maps to a stage IS declared
// work. A completion whose slug maps to nothing still builds no section -- honest degrade, no
// storyboard. This is still not an agent -> stage map: the key is the intent slug (Rule #1).
// DeepBench v7.0.55 | AssemblyView.jsx | LAV-21b -- the Assembly drawer: the deliverable itself,
// rendered as a document whose stages fill with the agents' real streamed output as the hops land
// (ARCHITECTURE.md §19r). It takes the Run Assembly feed's slot in the Live Agent Console's left
// column; that feed is HIDDEN, NOT DELETED -- RunTasks.jsx is untouched and still exports the three
// derivations this file folds, so the drawer and the feed can never tell two different stories about
// the same hop (§19q's one-story rule) and restoring the feed is a one-line mount change.
//
// Rule #1 (§19d/§19r): there is no agent_id -> stage map in this file and there must never be one.
// A stage is decided by the hop's OWN declared work -- the event type, the assembly frame's `work`
// field, and the delegation/prompt frame's `toIntentSlug` -- plus span parentage for nesting (§19p).
// An agent id is read for exactly two things, neither of which decides a stage: looking a name/role
// up in the real roster, and correlating a still-open ghost with the completion that resolves it
// (and even there the completion's own derived stage overrides whatever the ghost predicted).
//
// Honest degrade (§19j / .claude/rules/agent-section-rendering.md): every content line in here is
// the feed's own composed sentence off the frame's own fields. A line whose field did not stream is
// omitted. Screen-authored text exists only in chrome registers -- the drawer title, the stage
// labels, the two empty/live status lines, and the terminal cap -- never inside an agent's content.
// FEATURE: LAV-21b
import { useLayoutEffect, useRef, useState } from "react";
import { T, body, mono } from "../tokens.js";
import { Drawer, ScrollFadeHint, useScrollFadeHint, AgentAvatar } from "./SharedUI.jsx";
// The feed's own derivations and time-signature idiom, reused verbatim (LAV-21a exported them for
// exactly this). Nothing here re-composes a sentence RunTasks.jsx already knows how to write.
import { deriveAsked, deriveDid, deriveContent, formatTimeSignature } from "./RunTasks.jsx";

// ── chrome strings ────────────────────────────────────────────────────────────
// John's canonical names, 2026-08-04. Verbatim; never re-worded without him.
export const ASSEMBLY_TITLE = "Assembly";
export const DELIVERABLE_TITLE = "Deliverable";              // the Answer drawer's new name
export const ASSEMBLY_LIVE_TEXT = "Assembly under way…";     // live run, no sections yet
export const ASSEMBLY_EMPTY_TEXT =
  "No build yet — run a question and watch the answer assemble here.";
export const ASSEMBLY_TERMINAL_TEXT = "Question answered · build complete";
// An in-progress section whose start frame declared no work we can map. It is labelled as what it
// honestly is -- something running -- never as a guessed stage.
export const IN_PROGRESS_LABEL = "In progress";

export const STAGE_LABEL = {
  evidence: "Evidence", draft: "Draft", verification: "Verification",
  final: "Final form", error: "Error",
};

// Declared work -> stage. Keys are the pipeline's own existing intent slugs (runQaWithQualityGate's
// callCapability calls, MarketIntelligenceScreen.jsx L1499/L1517/L1587) -- cross-referenced
// constants, not invented data. An unknown slug maps to nothing (unlabelled in-progress section).
// FEATURE: LAV-21c -- `qa-answer-format` is the slug the Q&A journey's formatting delegation really
// carries (verified this session against Supabase `durable_hops.intent_slug`: 23 rows, and there is
// no `qa-answer-format-intent`). It joins the map as declared work, on the same footing as the other
// three; it is NOT a special case and nothing keys off it by name.
export const STAGE_OF_INTENT = {
  "ci-answer-intent": "draft", "qg-review-intent": "verification",
  "ci-answer-display-intent": "final", "qa-answer-format": "final",
};

// Declared work -> stage for a COMPLETED hop. Event types only; the assembly family is keyed on its
// own `work` field below because one event type legitimately reports two different kinds of work.
const COMPLETION_STAGE = {
  qa_answer: "draft", hypothesis_generation: "draft", patch_proposed: "draft",
  proofreader: "verification", failure_triage: "verification",
  display_format: "final", error: "error",
};

// Routing work builds no stage: the canvas and the Agent Routing rail already tell the choreography
// story, and a "who should do this" hop produces no part of the deliverable. Keyed on the frame's
// declared intent/tool, never on which agent happens to broker (Michelle is an agent doing real
// work, not a stage marker).
const ROUTING_INTENT_SLUGS = new Set(["agent-selection-intent"]);
const ROUTING_TOOLS = new Set(["request_help"]);

// Assembly `work` values that are drafting effort rather than retrieval; they hang under the Draft
// stage as sub-entries. Anything else non-fetch does the same -- this set only decides which START
// frames are worth opening a ghost for.
const DRAFTING_ASSEMBLY_WORK = new Set(["reflect", "synthesis"]);

// "Assembly · 3 stages". Same header idiom the Agent Routing panel and the Run Assembly feed use.
// NOTE (LAV-21b): the kickoff asked for RunTasks.jsx's `plural` to be imported here, but that helper
// is module-private there and this session's scope forbids touching RunTasks.jsx (hidden, not
// deleted) and caps the diff at 3 files. The one-line idiom is reproduced rather than the helper
// re-exported; reported to the parent session.
export const formatAssemblyTitle = (n) =>
  `${ASSEMBLY_TITLE} · ${n} stage${n === 1 ? "" : "s"}`;

// The roster is a NAME LOOKUP and nothing else. An id the roster does not know renders as itself
// (verbatim) with no avatar, rather than being dropped or given a stand-in portrait.
function whoOf(agentId, byId) {
  const a = agentId != null ? byId.get(agentId) : null;
  return {
    agentId: agentId ?? null,
    agentName: a?.name || agentId || null,
    agentRole: a?.role || null,
    agentResolved: !!a,
  };
}

// §19p made visible: a helper's fetch belongs to the job whose span it hangs under. Span identity
// first; `forAgentId` -- the enrichment seam's own "who this fetch was run for" field -- is the
// documented fallback for the runs where the prompt frame carried no span. Both are the frame's own
// declared linkage, never an inference about which agent "usually" serves which stage.
function sectionOwnsFetch(section, d) {
  if (d.parent_span_id != null && section.spanId != null && d.parent_span_id === section.spanId) return true;
  if (d.forAgentId != null && section.agentId != null && d.forAgentId === section.agentId) return true;
  return false;
}

/**
 * Fold the run's ledger into the Assembly drawer's stages. Pure; same input contract as
 * buildRunTaskEntries (LiveAgentViewScreen's `runHops` + `runHopTimes` -- the UNFILTERED slice,
 * because a `prompt_assembled` frame is a start signal here rather than plumbing to hide).
 *
 * @returns { sections, running, terminal } -- sections NEWEST FIRST by the time each one opened.
 */
export function buildAssemblyStages(events, eventTimes, {
  runStartedAt = null, agents = [], running = false, terminal = false,
} = {}) {
  const list = Array.isArray(events) ? events : [];
  const times = Array.isArray(eventTimes) ? eventTimes : [];
  const byId = new Map((Array.isArray(agents) ? agents : []).map(a => [a.id, a]));
  const base = runStartedAt != null ? runStartedAt : (times.find(t => t != null) ?? null);

  const sections = [];                                   // open order; reversed at the end
  const open = (props) => { const s = { subEntries: [], ...props }; sections.push(s); return s; };
  const findLast = (pred) => {
    for (let i = sections.length - 1; i >= 0; i -= 1) if (pred(sections[i])) return sections[i];
    return null;
  };

  for (let i = 0; i < list.length; i += 1) {
    const evt = list[i];
    if (!evt) continue;
    const d = evt.data || {};
    const at = times[i] ?? null;
    const key = `${evt.id ?? i}-${evt.type}`;
    const arrivedAtMs = at != null && base != null ? Math.max(0, at - base) : null;
    const timeSignature = formatTimeSignature({ arrivedAtMs, durationMs: evt.durationMs ?? null });
    const did = deriveDid(evt, byId);

    // ── a fetch: evidence, either on its own or nested under the job it was run for ──────────
    if (evt.type === "assembly_work_complete" && d.work === "fetch") {
      const sub = { key, ...whoOf(evt.agentId, byId), did, timeSignature };
      const host = findLast(s => !s.filled && s.stage !== "draft" && sectionOwnsFetch(s, d));
      if (host) { host.subEntries.push(sub); continue; }
      const evidence = findLast(s => s.stage === "evidence");
      if (evidence) { evidence.subEntries.push(sub); continue; }
      open({
        key, stage: "evidence", ghost: false, filled: true, ...whoOf(evt.agentId, byId),
        did, content: deriveContent(evt), timeSignature, asked: null,
        spanId: d.span_id ?? null,
      });
      continue;
    }

    // ── other assembly work (reflect / synthesis / …): drafting effort, nested under Draft ────
    if (evt.type === "assembly_work_complete") {
      const sub = { key, ...whoOf(evt.agentId, byId), did, timeSignature };
      const host = findLast(s => s.stage === "draft")
        // No Draft section yet: open the container so the step is visible where it belongs. It is
        // NOT a ghost -- nothing is being predicted, a real hop just landed -- so it survives
        // terminal with its sub-entry and no invented headline.
        || open({ key, stage: "draft", ghost: false, filled: false, ...whoOf(null, byId),
                  did: null, content: null, timeSignature: null, asked: null, spanId: null });
      host.subEntries.push(sub);
      continue;
    }

    // ── a completion that IS a stage ──────────────────────────────────────────────────────────
    // Two ways a completion declares its stage, and neither is the agent. A TYPED completion
    // declares it by event type (the map above). A DELEGATED resolution declares it through the
    // hand-off contract it just completed -- `toIntentSlug`, the same field a delegation START is
    // ghosted from below, read through the same STAGE_OF_INTENT map. `delegation_return` (a
    // hand-back, not work) and any completion whose slug is absent or maps to nothing fall through
    // untouched and build no section, exactly as in v7.0.55. (LAV-21c)
    const stage = COMPLETION_STAGE[evt.type]
      ?? (evt.type === "delegation_complete"
        ? (STAGE_OF_INTENT[typeof d.toIntentSlug === "string" ? d.toIntentSlug : ""] ?? null)
        : null);
    if (stage) {
      // Resolve the ghost this completion answers: same stage first, else the same worker's still
      // shimmering section. Either way the COMPLETION's own derived stage wins over the ghost's
      // prediction -- a prediction never survives contact with the real hop.
      const target = findLast(s => !s.filled && s.stage === stage)
        || findLast(s => !s.filled && s.ghost && s.agentId != null && s.agentId === evt.agentId);
      const filledProps = {
        key, stage, ghost: false, filled: true, ...whoOf(evt.agentId, byId),
        did, content: deriveContent(evt), timeSignature, asked: null,
      };
      if (target) Object.assign(target, filledProps, { spanId: d.span_id ?? target.spanId ?? null });
      else open({ ...filledProps, spanId: d.span_id ?? null });
      continue;
    }

    // ── a start signal: opens a ghost for the work it DECLARES ────────────────────────────────
    const isPromptStart = evt.type === "prompt_assembled";
    const isDelegationStart = evt.type === "delegation";
    const isAssemblyStart = evt.type === "assembly_work" && DRAFTING_ASSEMBLY_WORK.has(d.work);
    if (!isPromptStart && !isDelegationStart && !isAssemblyStart) continue;

    const slug = typeof d.toIntentSlug === "string" ? d.toIntentSlug : null;
    if (ROUTING_INTENT_SLUGS.has(slug) || ROUTING_TOOLS.has(d.viaTool)) continue;
    // A delegation start names the worker in its own hand-off contract (buildHopEvent's
    // secondaryAgentId = the frame's toAgentId); every other start frame names one agent, itself.
    const worker = isDelegationStart ? (evt.secondaryAgentId ?? evt.agentId ?? null) : (evt.agentId ?? null);
    const ghostStage = isAssemblyStart ? "draft" : (STAGE_OF_INTENT[slug] ?? null);
    // Never two shimmering boxes for the same declared work (a delegation start and the delegate's
    // own prompt frame describe one piece of work, not two).
    const already = ghostStage
      ? findLast(s => !s.filled && s.stage === ghostStage)
      : findLast(s => !s.filled && s.stage == null && s.agentId != null && s.agentId === worker);
    if (already) continue;
    open({
      key, stage: ghostStage, ghost: true, filled: false, ...whoOf(worker, byId),
      did: null, content: null, timeSignature: null,
      // The delegation contract where the frame carried one; null for a prompt frame, which has no
      // deriveAsked case at all -- and then the stage label stands alone rather than being padded
      // with copy no agent wrote.
      asked: deriveAsked(evt),
      spanId: d.span_id ?? null,
    });
  }

  // A ghost is a prediction. Once the run is over, an unresolved one is a prediction that never came
  // true -- dropped, never left standing as a stage that did not happen.
  const keepGhosts = !!running && !terminal;
  const visible = sections.filter(s => keepGhosts || !s.ghost);
  return { sections: visible.reverse(), running: !!running, terminal: !!terminal };
}

// ── render ────────────────────────────────────────────────────────────────────
// Every value below is src/tokens.js (.claude/rules/design-tokens.md); the shimmer/pulse motion is
// tokens.js's own global `shimmer`/`pdot` keyframes, reused rather than redeclared.
const STAGE_LABEL_STYLE = {
  display: "flex", alignItems: "center", gap: 6, marginBottom: 5,
  fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: "0.13em",
  textTransform: "uppercase", color: T.muted,
};
const AGENT_ROW = { display: "flex", alignItems: "center", gap: 6, margin: "2px 0 4px" };
const AGENT_NAME = { fontFamily: body, fontSize: 11, fontWeight: 700, color: T.navy };
const AGENT_ROLE = { fontFamily: body, fontSize: 9.5, color: T.muted };
const TIME_SIG = { fontFamily: mono, fontSize: 8, color: T.mutedDeep, letterSpacing: "0.02em", marginBottom: 3 };
const CONTENT_LINE = { fontFamily: body, fontSize: 11, lineHeight: 1.45, color: T.ink };
const GHOST_BOX = { border: `1px dashed ${T.line}`, borderRadius: 6, padding: "7px 8px", background: T.cardAlt };
const SUB_ENTRY = { marginTop: 6, padding: "4px 0 2px 8px", borderLeft: `2px solid ${T.lineSoft}` };
const TERMINAL_CAP = {
  margin: "2px 0 8px", padding: "4px 0 5px", borderBottom: `1px dashed ${T.line}`, textAlign: "center",
  fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: "0.14em",
  textTransform: "uppercase", color: T.line,
};
const EMPTY_TEXT = { fontFamily: body, fontSize: 11.5, color: T.muted, fontStyle: "italic" };
// RunTasks.jsx's own geometry constants, same meaning: the scroll body ends exactly at the
// container's floor (the top of the harness trace console) instead of overshooting it.
const DRAWER_BODY_PAD = 14;
const MIN_BODY_H = 64;

function ShimmerBar({ width }) {
  return (
    <div style={{
      height: 7, borderRadius: 3, margin: "4px 0", width,
      background: `linear-gradient(90deg, ${T.paperDeep} 25%, ${T.card} 50%, ${T.paperDeep} 75%)`,
      backgroundSize: "200% 100%", animation: "shimmer 1.6s linear infinite",
    }}/>
  );
}

function AgentRow({ who, small = false }) {
  if (!who.agentName) return null;
  return (
    <div style={{ ...AGENT_ROW, ...(small ? { margin: "0 0 2px" } : null) }}>
      {/* Only a roster-resolved agent gets a portrait: AgentAvatar falls back to a default config
          for an unknown id, and a stand-in face for an id we cannot resolve would be invention. */}
      {who.agentResolved && <AgentAvatar who={who.agentId} size={small ? 15 : 18} ring={false}/>}
      <span style={{ ...AGENT_NAME, ...(small ? { fontSize: 10 } : null) }}>{who.agentName}</span>
      {who.agentRole && (
        <span style={{ ...AGENT_ROLE, ...(small ? { fontSize: 9 } : null) }}>{who.agentRole}</span>
      )}
    </div>
  );
}

function SubEntry({ entry }) {
  return (
    <div style={SUB_ENTRY}>
      <AgentRow who={entry} small/>
      {entry.did && <div style={{ ...CONTENT_LINE, fontSize: 10.5 }}>{entry.did}</div>}
    </div>
  );
}

function StageSection({ section, first }) {
  const label = section.stage ? STAGE_LABEL[section.stage] : IN_PROGRESS_LABEL;
  const isError = section.stage === "error";
  return (
    <div style={{
      borderTop: first ? "none" : `1px solid ${T.lineSoft}`,
      padding: first ? "2px 0 10px" : "9px 0 10px",
    }}>
      <div style={{ ...STAGE_LABEL_STYLE, ...(isError ? { color: T.flag } : null) }}>
        {section.filled && !isError && (
          <span style={{ color: T.moss, fontSize: 9, letterSpacing: 0 }}>✓</span>
        )}
        {label}
      </div>
      {section.ghost ? (
        <div style={GHOST_BOX}>
          <AgentRow who={section}/>
          {section.asked && (
            <div style={{ ...CONTENT_LINE, fontSize: 10.5, color: T.muted, marginBottom: 4 }}>
              <span style={{
                display: "inline-block", width: 5, height: 5, borderRadius: "50%",
                background: T.brass, marginRight: 5, verticalAlign: 1,
                animation: "pdot 1.2s ease-in-out infinite",
              }}/>
              {section.asked}
            </div>
          )}
          <ShimmerBar/>
          <ShimmerBar width="72%"/>
          {section.subEntries.map(s => <SubEntry key={s.key} entry={s}/>)}
        </div>
      ) : (
        <>
          <AgentRow who={section}/>
          {section.timeSignature && <div style={TIME_SIG}>{section.timeSignature}</div>}
          {section.did && <div style={CONTENT_LINE}>{section.did}</div>}
          {section.subEntries.map(s => <SubEntry key={s.key} entry={s}/>)}
        </>
      )}
    </div>
  );
}

/**
 * The drawer. Open by default, fills whatever height the left column gives it (its call site anchors
 * that column's bottom to the top of the harness trace console) and scrolls inside with the
 * platform's own bottom-fade affordance -- the exact mechanism RunTasks.jsx already implements.
 * Scroll is pinned to the top on every change: with newest-on-top, the latest event is then always
 * in view without scrolling (John's spec, 2026-08-04).
 */
export default function AssemblyView({ stages = null, running = false }) {
  const sections = stages?.sections ?? [];
  const terminal = !!stages?.terminal;
  const boxRef = useRef(null);
  const bodyWrapRef = useRef(null);
  const scrollRef = useRef(null);
  const [bodyH, setBodyH] = useState(MIN_BODY_H);
  const { canScrollMore, onScroll } = useScrollFadeHint(scrollRef, [sections.length, bodyH]);

  useLayoutEffect(() => {
    const measure = () => {
      const box = boxRef.current, wrap = bodyWrapRef.current;
      if (!box || !wrap) return;
      const next = Math.max(MIN_BODY_H,
        Math.round(box.getBoundingClientRect().bottom - wrap.getBoundingClientRect().top - DRAWER_BODY_PAD));
      setBodyH(prev => (Math.abs(prev - next) > 1 ? next : prev));
    };
    measure();
    if (typeof ResizeObserver === "undefined" || !boxRef.current) return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, [sections.length]);

  // `stages` is a fresh object every time the fold re-runs, so this fires on any ledger change --
  // including the ones that do not change the section COUNT (a ghost filling in place).
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [stages]);

  return (
    <div className="lav-assembly" ref={boxRef}>
      <Drawer title={formatAssemblyTitle(sections.length)} defaultOpen>
        <div ref={bodyWrapRef} style={{ position: "relative", minHeight: 0 }}>
          <div ref={scrollRef} onScroll={onScroll}
            style={{ height: bodyH, overflowY: "auto", scrollbarWidth: "thin" }}>
            {sections.length === 0
              ? <div style={EMPTY_TEXT}>{running ? ASSEMBLY_LIVE_TEXT : ASSEMBLY_EMPTY_TEXT}</div>
              : (
                <>
                  {terminal && <div style={TERMINAL_CAP}>{ASSEMBLY_TERMINAL_TEXT}</div>}
                  {sections.map((s, i) => (
                    <StageSection key={s.key} section={s} first={i === 0}/>
                  ))}
                </>
              )}
          </div>
          <ScrollFadeHint show={canScrollMore} bg={T.cardAlt}/>
        </div>
      </Drawer>
    </div>
  );
}
