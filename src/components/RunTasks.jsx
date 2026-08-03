// DeepBench v7.0.53 | RunTasks.jsx | LAV-19 -- three display changes, all John-approved live
// 2026-08-02: (1) the drawer header becomes "Run Assembly · <N> events", the Agent Routing panel's
// own idiom, replacing the "Run Tasks" title plus its separate count chip; (2) Owen Marsh -- The
// Proofreader's verbatim eval.critique now renders on a PASS verdict too, not only on revise -- the
// field already streams, this renders more of what the agent actually wrote; (3) a routing hop
// carrying candidates_considered gains "Weighed <first names> --" ahead of its reasoning clause,
// first names only (John's explicit spec), resolved through the roster map this file already holds.
// Every one of the three degrades to the pre-change line when its field is absent (§19j).
// DeepBench v7.0.49 | RunTasks.jsx | LAV-15 -- the "Run Tasks" drawer on the Live Multi-Agent
// Console: one entry per completed hop, each saying what the hop was Asked to do, what it Did, and
// what happened to the Content. Newest on top, numbered ascending (newest = highest), never
// auto-dismissing, reset by the next run because the feed is fed the RUN-scoped ledger slice.
// Every field below is derived client-side from events the console already receives -- no api/
// change, no new model call, no Supabase read. Nothing is enriched from outside the stream: where a
// rich field is absent the line degrades to the slug/intent level or is omitted entirely rather
// than invented (.claude/rules/agent-section-rendering.md -- the screen holds no content policy).
// FEATURE: LAV-15
import { useLayoutEffect, useRef, useState } from "react";
import { T, body, mono } from "../tokens.js";
import { Drawer, ScrollFadeHint, useScrollFadeHint } from "./SharedUI.jsx";
// STYLE-GUIDE.md §41: every duration the Live Agent Console renders goes through formatLavDuration.
// Raw `ms` never renders and this file does not re-derive the format.
import { formatLavDuration } from "./HarnessTraceConsole.jsx";

// John's canonical drawer name (2026-08-02, LAV-19 -- supersedes "Run Tasks", his own rewording).
// Verbatim, never re-worded again without him.
export const RUN_ASSEMBLY_TITLE = "Run Assembly";
export const RUN_ASSEMBLY_EMPTY_TEXT = "No events yet — run a question and each completed hop lands here.";

// ── derivation ────────────────────────────────────────────────────────────────
// Boundary markers and harness plumbing, deliberately excluded -- not hops.
// `question_boundary` / `transaction_complete` are the client's own dividers (CHI-04/CHI-56);
// `prompt_assembled` is the plumbing frame announcing an assembly result, already withheld from the
// canvas and the Pipeline Log rail on the same reasoning (LAV-1d). Everything else the run streams
// gets an entry -- a hop this file has no narration case for still appears, with its raw type and
// its real time signature, rather than vanishing from the feed.
export const RUN_TASK_EXCLUDED_TYPES = new Set([
  "prompt_assembled", "question_boundary", "transaction_complete",
]);

// The hop kinds the kickoff locks. `error` is the one addition: an error hop is a real, observed
// hop, and dropping it (or filing it under `gate`) would hide a failure the user needs to see.
export const RUN_TASK_KIND = {
  intent_routing: "routing",
  agent_selection: "routing",
  qa_answer: "drafting",
  display_format: "drafting",
  hypothesis_generation: "drafting",
  patch_proposed: "drafting",
  delegation: "delegation",
  delegation_complete: "delegation",
  delegation_return: "delegation",
  proofreader: "gate",
  failure_triage: "gate",
  error: "error",
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const countOf = (v) => (Array.isArray(v) ? v.length : null);
const text = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

// "Run Assembly · 3 events" -- the live count lives IN the header, matching the Agent Routing
// panel's own "Agent Routing · {n} hop{s}" treatment (LiveAgentViewScreen.jsx ~L444), which is why
// the drawer no longer passes a separate `count` chip. Exported so the count and the wording are
// asserted together rather than eyeballed.
export const formatRunAssemblyTitle = (n) => `${RUN_ASSEMBLY_TITLE} · ${plural(n, "event")}`;

// "Weighed Marcus, Alex, Riley" -- who the picker actually considered, FIRST NAMES ONLY (John's
// explicit spec, 2026-08-02). Reads only the candidate list the frame carries; the roster map is a
// name lookup, never a filter, so this can never widen or narrow what the broker really weighed
// (Rule #1 / §19d -- no roster-derived candidate set). An agent_id the roster does not know renders
// as itself rather than being dropped. Repeated ids collapse (one agent can appear as two
// capability candidates -- "Alex, Alex" would read as a bug, not as data). Returns null when the
// frame carries no usable list, and the caller then renders today's exact line.
function weighedClause(candidates, byId) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const names = [];
  for (const c of candidates) {
    const id = typeof c === "string" ? text(c) : text(c?.agent_id);
    if (!id) continue;
    const full = text(byId?.get?.(id)?.name);
    const first = full ? full.split(/\s+/)[0] : id;
    if (!names.includes(first)) names.push(first);
  }
  return names.length ? `Weighed ${names.join(", ")}` : null;
}

// An assembly frame's kind depends on the work it reports -- a fetch is retrieval, every other
// assembly step is drafting work. Keyed on the frame's own `work` field, never on the agent.
function assemblyKind(data) {
  return data?.work === "fetch" ? "retrieval" : "drafting";
}

// "What was this hop asked to do." Derived from the delegation contract where the stream carries
// one (`data.task`, execute.js's own `tool_input.task_description || skill_needed`), otherwise from
// the tool/intent level. Returns null when the stream carries nothing to say -- never a placeholder.
function deriveAsked(evt) {
  const d = evt.data || {};
  switch (evt.type) {
    case "intent_routing":
      return "Read the question and decide how to route it.";
    case "agent_selection": {
      const n = countOf(d.candidates_considered);
      return n != null
        ? `Recommend who should handle this next, from ${plural(n, "candidate agent profile")}.`
        : "Recommend who should handle this next.";
    }
    case "qa_answer":
      return "Draft the answer to the question.";
    case "proofreader":
      return "Review the draft for accuracy and policy before it is shown.";
    case "failure_triage":
      return "Decide whether more research would clear the block.";
    case "display_format":
      return "Format the approved answer for display.";
    case "delegation":
    case "delegation_complete": {
      // The real hand-off contract when the frame carried one; the tool/capability level otherwise.
      // Degrades one step at a time -- task text, then capability slug, then the bare tool -- and
      // returns null only when the frame names no tool at all, rather than filling the line in.
      const task = text(d.task);
      if (task) return task;
      if (d.viaTool === "request_help") return "Recommend who should handle this next.";
      if (d.viaTool === "critique") return "Critique the proposed action before it is applied.";
      if (d.viaTool !== "delegate_to_agent") return null;
      const slug = text(d.toCapabilitySlug);
      return slug ? `Take the ${slug} work.` : "Take the delegated work.";
    }
    case "delegation_return":
      return "Hand control back once the delegated work is done.";
    case "assembly_work":
    case "assembly_work_complete": {
      if (d.work === "fetch") {
        const src = text(d.source);
        return src ? `Fetch supporting material from ${src}.` : "Fetch supporting material.";
      }
      const work = text(d.work);
      return work ? `Run the ${work} assembly step.` : null;
    }
    default:
      return null;
  }
}

// "What this hop actually produced." Composed from the frame's own fields only. A delegation frame
// already carries the platform's composed sentence (describeDelegationEvent, via the hook) -- that
// verbatim line is the Did line, so the feed and the Agent Routing rail can never tell two
// different stories about the same hop.
// `byId` is the roster map buildRunTaskEntries already builds, threaded in for one job only:
// turning a candidate's agent_id into a first name (LAV-19). Nothing else here reads it.
function deriveDid(evt, byId) {
  const d = evt.data || {};
  // Present on the picker's frames only -- agent_selection has always carried it, and LAV-19 put it
  // on the request_help delegation_complete emit. Null everywhere else, which is what keeps every
  // other event type's line byte-identical.
  const weighed = weighedClause(d.candidates_considered, byId);
  switch (evt.type) {
    case "intent_routing": {
      const intent = text(d.intent);
      return intent ? `Classified the request as “${intent}”.` : "Classified the request.";
    }
    case "agent_selection": {
      const why = text(d.reasoning);
      // The Weighed clause sits immediately before the reasoning clause. With no candidates the
      // filter leaves exactly the pre-LAV-19 two cases, byte for byte.
      const parts = [weighed, why].filter(Boolean);
      return parts.length ? `Selected the next agent — ${parts.join(" — ")}` : "Selected the next agent.";
    }
    case "qa_answer": {
      const cites = countOf(d.citations);
      const tier = text(d.confidence_tier);
      const parts = [];
      if (cites != null) parts.push(`with ${plural(cites, "citation")}`);
      if (tier) parts.push(`confidence ${tier}`);
      return parts.length ? `Drafted the answer ${parts.join(" · ")}.` : "Drafted the answer.";
    }
    case "proofreader": {
      const guardrail = d.guardrail || {};
      const ev = d.eval || {};
      if (guardrail.result === "block") {
        const why = text(guardrail.reason);
        return why ? `Blocked the draft on a policy check — ${why}` : "Blocked the draft on a policy check.";
      }
      const verdict = text(ev.result);
      if (!verdict) return "Reviewed the draft.";
      // FEATURE: LAV-19 -- the gate writes a critique on a PASS verdict too and it was being thrown
      // away; the verdict no longer gates it. `revise` is unchanged (it already showed it), the
      // guardrail-block branch above is untouched, and a verdict with no critique still reads
      // exactly as before -- the screen still authors nothing (§19j).
      const critique = text(ev.critique);
      return critique
        ? `Scored the draft — verdict ${verdict}: ${critique}`
        : `Scored the draft — verdict ${verdict}.`;
    }
    case "failure_triage": {
      const ask = text(d.suggested_research_request);
      if (!d.recommend_escalate) return "Found that more research would not help here.";
      return ask ? `Recommended escalating — ${ask}` : "Recommended escalating.";
    }
    case "display_format": {
      const headline = text(d.headline);
      const points = countOf(d.key_data_points);
      const tail = points != null ? ` · ${plural(points, "key data point")}` : "";
      return headline
        ? `Formatted the answer for display — “${headline}”${tail}`
        : `Formatted the answer for display${tail}.`;
    }
    case "delegation":
    case "delegation_return":
      return text(d.message);
    case "delegation_complete": {
      const msg = text(d.message);
      const why = text(d.reasoning);
      // Same ordering rule as agent_selection: composed sentence, then who was weighed, then why.
      // A completion with no candidates (every delegate_to_agent completion, today and after
      // LAV-19) joins exactly the two fields it always did.
      const parts = [msg, weighed, why].filter(Boolean);
      return parts.length ? parts.join(" — ") : null;
    }
    case "assembly_work":
    case "assembly_work_complete": {
      if (d.work === "fetch") {
        const src = text(d.source);
        const from = src ? ` from ${src}` : "";
        return d.matchCount != null
          ? `Fetched ${plural(d.matchCount, "chunk")}${from}.`
          : `Fetched supporting material${from}.`;
      }
      const work = text(d.work) || "assembly";
      if (evt.type === "assembly_work") return `Started the ${work} step.`;
      return d.tokens != null ? `Completed the ${work} step · ${d.tokens} tok.` : `Completed the ${work} step.`;
    }
    case "error":
      return text(d.message) ? `Ran into a problem partway through — ${d.message}` : "Ran into a problem partway through.";
    default:
      // A type with no narration case still shows whatever composed line the frame itself carries.
      return text(d.message);
  }
}

// "What happened to the content." One of created / changed / unchanged; `unchanged` always carries
// the reason word, per John's spec. Null when this hop's effect on content is genuinely not
// derivable from the frame -- the line is then omitted rather than guessed.
function deriveContent(evt) {
  const d = evt.data || {};
  switch (evt.type) {
    case "intent_routing":
    case "agent_selection":
      return { state: "unchanged", reason: "routing only" };
    case "qa_answer":
      return { state: "created", reason: null };
    case "proofreader": {
      if ((d.guardrail || {}).result === "block") return { state: "unchanged", reason: "blocked before display" };
      if (d.final_answer) return { state: "changed", reason: null };
      if ((d.eval || {}).result === "pass") return { state: "unchanged", reason: "approved as drafted" };
      return { state: "unchanged", reason: "reviewed only" };
    }
    case "failure_triage":
      return { state: "unchanged", reason: "triage only" };
    case "display_format":
      return { state: "changed", reason: null };
    case "delegation":
      return { state: "unchanged", reason: "routing only" };
    case "delegation_complete":
      return { state: "unchanged", reason: "hand-off only" };
    case "delegation_return":
      return { state: "unchanged", reason: "hand-back only" };
    case "assembly_work":
      return { state: "unchanged", reason: "step still open" };
    case "assembly_work_complete": {
      if (d.work !== "fetch") return { state: "created", reason: null };
      if (d.matchCount == null) return { state: "unchanged", reason: "no match count reported" };
      return d.matchCount > 0
        ? { state: "created", reason: null }
        : { state: "unchanged", reason: "nothing matched" };
    }
    case "error":
      return { state: "unchanged", reason: "stopped on an error" };
    default:
      return null;
  }
}

/**
 * Fold the run's ledger into the Run Tasks feed.
 *
 * @param events      run-scoped ledger events, oldest first (LiveAgentViewScreen's `runHops`)
 * @param eventTimes  index-aligned arrival clocks (its `runHopTimes`) -- the same pair the
 *                    HARNESS TRACE console already consumes, so the two can never disagree
 * @param runStartedAt the run's real turnStartedAt, so "arrived M:SS into the run" is measured
 *                    from the question starting, not from the first frame landing. Falls back to
 *                    the first included event's own arrival when the status never carried one.
 * @param agents      the real roster (src/data/agents.js via useAgents) -- names/roles are looked
 *                    up, never authored here; an unresolved id renders as itself.
 * @returns entries NEWEST FIRST, numbered 1..N in chronological order (newest = highest number).
 */
export function buildRunTaskEntries(events, eventTimes, { runStartedAt = null, agents = [] } = {}) {
  const list = Array.isArray(events) ? events : [];
  const times = Array.isArray(eventTimes) ? eventTimes : [];
  const byId = new Map((Array.isArray(agents) ? agents : []).map(a => [a.id, a]));

  const kept = [];
  for (let i = 0; i < list.length; i += 1) {
    const evt = list[i];
    if (!evt || RUN_TASK_EXCLUDED_TYPES.has(evt.type)) continue;
    kept.push({ evt, at: times[i] ?? null });
  }
  if (kept.length === 0) return [];

  const firstAt = kept.find(k => k.at != null)?.at ?? null;
  const base = runStartedAt != null ? runStartedAt : firstAt;

  const entries = kept.map(({ evt, at }, idx) => {
    const agent = evt.agentId != null ? byId.get(evt.agentId) : null;
    const isAssembly = evt.type === "assembly_work" || evt.type === "assembly_work_complete";
    return {
      number: idx + 1,
      // Ledger ids are unique per run and stable across re-renders; the index is only a tiebreak
      // for the (impossible today) case of an event arriving without one.
      key: `${evt.id ?? idx}-${evt.type}`,
      kind: isAssembly ? assemblyKind(evt.data) : (RUN_TASK_KIND[evt.type] ?? null),
      type: evt.type,                                   // verbatim -- a kind never renames a type
      agentId: evt.agentId ?? null,
      agentName: agent?.name || evt.agentId || null,
      agentRole: agent?.role || null,
      asked: deriveAsked(evt),
      did: deriveDid(evt, byId),
      content: deriveContent(evt),
      arrivedAtMs: at != null && base != null ? Math.max(0, at - base) : null,
      durationMs: evt.durationMs ?? null,
    };
  });
  return entries.reverse();                             // newest on top (John's spec)
}

// m:ss, matching LiveAgentViewScreen's own formatElapsedShort. Defined here rather than imported
// because the import would close a cycle (screen -> AgentNetwork -> RunTasks -> screen); it is a
// two-line display format, not a duplicated rule. Durations still go through formatLavDuration.
export function formatArrival(ms) {
  if (ms == null || !Number.isFinite(ms)) return null;
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// "arrived M:SS into the run · took Ns" -- each half omitted when its own figure is missing, so a
// hop with no measured duration reads honestly instead of showing a guessed one.
export function formatTimeSignature(entry) {
  const arrived = formatArrival(entry?.arrivedAtMs);
  const parts = [];
  if (arrived) parts.push(`arrived ${arrived} into the run`);
  if (entry?.durationMs != null) parts.push(`took ${formatLavDuration(entry.durationMs)}`);
  return parts.length ? parts.join(" · ") : null;
}

// ── render ────────────────────────────────────────────────────────────────────
// describePipelineEvent's own colour semantics, reused: moss = clean/produced, brass = revised,
// muted = neutral. No new palette (.claude/rules/design-tokens.md).
const CONTENT_COLOR = { created: T.moss, changed: T.brass, unchanged: T.muted };
const LABEL = { fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: "0.11em",
  textTransform: "uppercase", color: T.muted };
const LINE_TEXT = { fontFamily: body, fontSize: 11, lineHeight: 1.45, color: T.ink };
// Drawer's own `count` chip, reused for the hop-kind tag so the two read as one family.
const KIND_CHIP = { fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: "0.09em",
  textTransform: "uppercase", color: T.muted, background: T.paperDeep, padding: "1px 6px",
  borderRadius: 10, border: `1px solid ${T.lineSoft}` };
// Drawer's content box bottom padding -- subtracted so the scroll body ends exactly at the
// container's bottom edge (the top of the harness trace console) instead of overshooting it.
const DRAWER_BODY_PAD = 14;
const MIN_BODY_H = 64;

function TaskLine({ label, children, color }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
      <span style={{ ...LABEL, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ ...LINE_TEXT, ...(color ? { color } : null), minWidth: 0 }}>{children}</span>
    </div>
  );
}

function RunTaskEntry({ entry, first }) {
  const signature = formatTimeSignature(entry);
  const content = entry.content;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4,
      padding: first ? "0 0 10px" : "10px 0",
      // One hairline between entries, never two (the LOG-129 double-border lesson).
      borderTop: first ? "none" : `1px solid ${T.lineSoft}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: T.brassDeep }}>
          {entry.number}
        </span>
        <span style={{ fontFamily: body, fontSize: 11.5, fontWeight: 700, color: T.navy }}>
          {entry.agentName || "—"}
        </span>
        {entry.agentRole && (
          <span style={{ fontFamily: body, fontSize: 10, color: T.muted }}>{entry.agentRole}</span>
        )}
        {entry.kind && <span style={KIND_CHIP}>{entry.kind}</span>}
      </div>
      {signature && (
        <div style={{ fontFamily: mono, fontSize: 8.5, color: T.mutedDeep, letterSpacing: "0.02em" }}>
          {signature}
        </div>
      )}
      {/* Asked / Did / Content, each on its own line -- John's spec, never run together. A line
          whose field the stream did not carry is omitted, never filled with placeholder copy. */}
      {entry.asked && <TaskLine label="Asked">{entry.asked}</TaskLine>}
      {entry.did && <TaskLine label="Did">{entry.did}</TaskLine>}
      {content && (
        <TaskLine label="Content" color={CONTENT_COLOR[content.state]}>
          {content.reason ? `${content.state} — ${content.reason}` : content.state}
        </TaskLine>
      )}
    </div>
  );
}

/**
 * The drawer itself. Open by default; it fills whatever height the column gives it (its call site
 * anchors that column's bottom to the top of the harness trace console) and scrolls inside, with
 * the platform's own bottom-fade affordance (§38/§41's ScrollFadeHint -- reused, never
 * reimplemented). Deliberately NOT `resizable`: it already reaches its own container's floor.
 */
export default function RunTasks({ entries = [] }) {
  const boxRef = useRef(null);
  const bodyWrapRef = useRef(null);
  const scrollRef = useRef(null);
  const [bodyH, setBodyH] = useState(MIN_BODY_H);
  const { canScrollMore, onScroll } = useScrollFadeHint(scrollRef, [entries.length, bodyH]);

  // The scroll body's height is the distance from where it starts to the container's own floor.
  // Measured rather than assumed: the drawer header's height is Drawer's business, not this file's,
  // and the container's height is the canvas row's leftover space. Converges in one pass -- the
  // wrapper's top does not depend on the height set below it.
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
  }, [entries.length]);

  return (
    <div className="lav-runtasks" ref={boxRef}>
      {/* The count now lives in the title itself (LAV-19), so no `count` chip is passed -- passing
          both would print the number twice. */}
      <Drawer title={formatRunAssemblyTitle(entries.length)} defaultOpen>
        <div ref={bodyWrapRef} style={{ position: "relative", minHeight: 0 }}>
          <div ref={scrollRef} onScroll={onScroll}
            style={{ height: bodyH, overflowY: "auto", scrollbarWidth: "thin" }}>
            {entries.length === 0
              ? <div style={{ fontFamily: body, fontSize: 11.5, color: T.muted, fontStyle: "italic" }}>
                  {RUN_ASSEMBLY_EMPTY_TEXT}
                </div>
              : entries.map((e, i) => <RunTaskEntry key={e.key} entry={e} first={i === 0}/>)}
          </div>
          <ScrollFadeHint show={canScrollMore} bg={T.cardAlt}/>
        </div>
      </Drawer>
    </div>
  );
}
