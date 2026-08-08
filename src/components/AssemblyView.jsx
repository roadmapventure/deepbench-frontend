// DeepBench v7.0.80 | AssemblyView.jsx | MOB-18+MOB-19+MOB-20 -- mobile noticeability: narration
// pill / solid-brass armed Answer tab / tappable tracker chips.
// DeepBench v7.0.74 | AssemblyView.jsx | LAV-36 -- one section per stage. The completion path gains
// the start path's filled-host rule (LAV-25 T3's mirror): a stage-deriving completion whose stage is
// already FILLED nests as a sub-entry under that section instead of opening a duplicate with the same
// label. One Verification phase, not two (§19s allocates record verification under Verification);
// collapses MOB-16's duplicate mobile tracker chips through the same shared fold. Keyed on the stage
// key only -- no agent, no intent special-case. Nothing else in the fold changes.
// PATCH-1 (post-QA, same session): first-completion-founds-the-stage was the wrong owner. The
// record check runs INSIDE the gate's round so its completion streams FIRST, and live QA came back
// inverted -- Eleanor Voss owning Verification with Owen Marsh nested under her. §19s allocates the
// stage line to the PARENT work, so the filled-host case now reads span parentage (`buildParentBySpan`,
// off the same prompt frames as buildDeclaredWorkBySpan) and lets a completion that is the parent of
// the host's founding work CLAIM the headline, demoting the incumbent to a sub-entry that keeps its
// own agent, account and took-time. One level only; an unrelated same-stage completion still nests.
// Paired one-line carry in `useHarnessStream.js` (the ledger's prompt build dropped `parent_span_id`).
// DeepBench v7.0.69 | AssemblyView.jsx | MOB-15 -- Assembly reaches mobile. Two additive exports and
// nothing else: `AssemblyTrackerBand` (one chip per stage, off this file's own unchanged fold) and an
// `export` keyword on the existing `StageSection`, so the mobile console can render one stage's text
// in its bottom region. The fold, the drawer, every style constant above and every rendering decision
// are byte-identical; nothing here mounts on desktop.
// DeepBench v7.0.64 | AssemblyView.jsx | LAV-32a -- the §19s four-surface trim. This drawer is now
// the BUILDING lane only, and a stage card renders exactly five things: ✓ (when filled) + stage
// label + agent + `took m:ss` + the doer's receipt sentence. Removed, all render-only: the "arrived
// M:SS into the run" clause (and with it the fold's now-unread arrival plumbing), every ask line
// (asks are live-only per §19s -- they belong to S-LAV-32b's bubble and status line, and nothing
// appears on two surfaces), and the platform detail lines (fetch-chunk and token-count sub-entries,
// marked `detail` in the fold and skipped at render -- still tracked, so LAV-25b's terminal-survival
// rule is byte-identical). Durations now go through the one shared `formatHopDuration`. Ghost
// behaviour, terminal caps, revision nesting and every stage-building decision in the fold are
// untouched.
// DeepBench v7.0.63 | AssemblyView.jsx | LAV-28c -- the deep-leg completion fold, plus the receipt
// pair's display side. S-LAV-28b proved live (World 3c, both captured runs) that every deep-leg
// completion streams as `delegation_return` and that ZERO `delegation_complete` frames stream at
// all, so a fold that fills a stage only on `delegation_complete` left every delegated stage
// permanently unfilled: ask shown, no account, no ✓ -- John's exact symptom. Four changes:
//   T1  a `delegation_return` fills the stage its own SPAN declared (buildDeclaredWorkBySpan +
//       completedWorkStage). Span parentage only -- no depth conditional, no agent conditional, no
//       literal slug; brokerage hand-backs still build nothing via the same ROUTING_INTENT_SLUGS
//       data the start path uses. `delegation_complete`'s existing branch is byte-identical.
//   T2  a revision sub-entry with neither an ask nor an account is no longer pushed -- it rendered
//       as a bare agent name under a finished stage (the "trailing bare-name entries").
//   T3  a stage's Asked line prefers the requester's five-word `ask_line` headline, degrading to
//       today's `deriveAsked` ladder when a frame carries none (§19s: never truncated, never
//       synthesized).
// NOT a fold bug, confirmed on both captures and reported up: the duplicate "Fetched N chunks"
// lines are TWO REAL fetches (a 74-chunk catalog fetch and a 10-chunk library fetch, distinct
// sources, distinct counts) -- honest data, left exactly as it is.
// DeepBench v7.0.60 | AssemblyView.jsx | LAV-25b (patch to LAV-25) -- a ghost carrying real work
// survives terminal. Live QA on v7.0.59 found the Evidence stage rendering correctly mid-run and
// then VANISHING at terminal: Eleanor Voss's evidence visit resolves via `delegation_return` only
// (no typed completion streams for it -- LAV-22's carrier gap, open), so the section never fills,
// stays a ghost, and the terminal filter dropped it along with her real 74+10-chunk Library fetches.
// The terminal filter now drops a ghost only when it holds no real work; a surviving one renders
// unfilled -- no ✓, no shimmer, no invented headline or completion line (§19j). One change, in
// `buildAssemblyStages`'s final filter plus the shimmer's render gate.
// DeepBench v7.0.59 | AssemblyView.jsx | LAV-25 -- the Assembly Content Contract's client slice
// (ARCHITECTURE.md §19s, measured on the run in docs/harvests/LAV-25.md). Four changes, none of
// which touches the Agent Routing rail (its copy is shared with CHI's beta surface, scoped out):
//   T1  `library-evidence-intent` / `library-record-lookup-intent` (both created by S-LAV-23) join
//       STAGE_OF_INTENT, so the run's REAL Library evidence stops living in an unlabelled ghost that
//       gets dropped at terminal; and prompt-assembly BRIEFING fetches (`roster`/`knowledge`) build
//       nothing at all -- no section, no sub-entry. Keyed on the frame's own `source` field, never on
//       the agent and never on the capability. Library sources are untouched.
//   T2  the single "Question answered · build complete" cap becomes three John-locked strings keyed
//       on the run's REAL end state. It read BUILD COMPLETE over a blocked answer on the harvest run
//       and over a hard error on the three before it.
//   T3  a delegation start whose declared work maps to a stage that is ALREADY FILLED (the gate's
//       revision round re-delegating `ci-answer-intent`) nests as a sub-entry under that stage
//       instead of opening a second Draft ghost above the filled one.
//   T4  render-if-present narration: when a frame carries the agent's own `account` of its work
//       (§19s, delivered by LAV-17/LAV-22 -- absent from every frame today), it renders as the
//       content line INSTEAD of the derived template sentence; absent, today's template line renders
//       byte-identically (the §19s degrade). A start's `task` words already feed `deriveAsked`'s top
//       rung, so carrying the field in useHarnessStream.js is the whole of that half.
// DeepBench v7.0.57 | AssemblyView.jsx | LAV-21d -- only the work's OWN completion fills a stage.
// LAV-21c let any `delegation_complete` carrying a mapped `toIntentSlug` fill that stage, and live QA
// found a double-fill: a brokerage chain emits TWO completions carrying the same picked target's
// slug -- the outer `request_help` one (Michelle Manning's hand-off resolving, crediting the
// REQUESTER) and the inner `delegate_to_agent` one (the delegate's real work). One piece of work,
// two Final form sections. The discriminator the frames already carry is `viaTool`
// (useHarnessStream.js's completion build): `delegate_to_agent` = the declared WORK (§19r), while
// `request_help` = the HAND-OFF, which is routing and builds no section by the locked derivation.
// So the mapped fill is gated on `delegate_to_agent` alone; `request_help`, `critique` and an absent
// `viaTool` are byte-identical to v7.0.55 for that path.
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
import { deriveAsked, deriveDid, deriveContent } from "./RunTasks.jsx";
// FEATURE: LAV-32a (§19s) -- the ONE shared m:ss duration formatter, replacing this file's use of
// RunTasks.jsx's formatTimeSignature (which composes "arrived M:SS into the run · took Ns" -- both
// the arrival clause and the per-surface `Ns` dialect are what §19s removes). Imported from the
// screen because that is where the shared display exports live and where the other two client
// surfaces already import from; verified this session that the edge closes no cycle.
import { formatHopDuration } from "../screens/MarketIntelligenceScreen.jsx";

// ── chrome strings ────────────────────────────────────────────────────────────
// John's canonical names, 2026-08-04. Verbatim; never re-worded without him.
export const ASSEMBLY_TITLE = "Assembly";
export const DELIVERABLE_TITLE = "Deliverable";              // the Answer drawer's new name
export const ASSEMBLY_LIVE_TEXT = "Assembly under way…";     // live run, no sections yet
export const ASSEMBLY_EMPTY_TEXT =
  "No build yet — run a question and watch the answer assemble here.";
// FEATURE: LAV-25 (T2, §19s) -- the terminal cap is CHROME (register 1: John's words verbatim), and
// it now tells the truth about how the run actually ended. One string per real end state, chosen
// from the screen's own result/error state -- never derived from an agent's words, never a default.
// The run in docs/harvests/LAV-25.md ended on a gate BLOCK and the cap still read
// "QUESTION ANSWERED · BUILD COMPLETE"; the three failed runs before it read the same over an error.
// Verbatim, never re-worded without John.
export const ASSEMBLY_TERMINAL_ANSWERED_TEXT = "Build complete — answer delivered";
export const ASSEMBLY_TERMINAL_BLOCKED_TEXT = "Build stopped — the reviewer blocked the draft";
export const ASSEMBLY_TERMINAL_ERROR_TEXT = "Build stopped — the run hit an error";
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
// FEATURE: LAV-25 (T1, §19s) -- the two Library intents S-LAV-23 created join the map on exactly the
// same footing as the other four: they are declared work the pipeline really carries
// (`library-evidence-intent` is Eleanor's agent-decided evidence retrieval, `library-record-lookup-intent`
// her record verification inside the gate's round). Verified against the harvest run's own frames.
// Without them the run's real Library evidence -- the 74-chunk catalog + 10-chunk library pair --
// opened an UNLABELLED ghost, which is a prediction, which is dropped at terminal: the one piece of
// genuine evidence in the run vanished from the finished document. Still not an agent -> stage map.
export const STAGE_OF_INTENT = {
  "ci-answer-intent": "draft", "qg-review-intent": "verification",
  "ci-answer-display-intent": "final", "qa-answer-format": "final",
  "library-evidence-intent": "evidence", "library-record-lookup-intent": "verification",
};

// FEATURE: LAV-25 (T1, §19s) -- prompt-assembly BRIEFING fetches: the roster/knowledge material every
// agent's prompt is built from before it does any work. It is internal briefing, not part of the
// deliverable, and it was FOUNDING the Evidence stage -- so at terminal "Evidence" credited plumbing
// while the run's real Library evidence had been dropped. Keyed on the frame's own `source` field
// (api/prompt/ai-enrichment.js's `fetch_instruction.source`, the same value ASSEMBLY_ATTRIBUTION
// reads), never on which agent ran the fetch and never on the capability. The Library sources
// (`the_library`, `the_library_catalog`) are deliberately absent: those ARE deliverable work.
const BRIEFING_FETCH_SOURCES = new Set(["roster", "knowledge"]);

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

// LAV-21d: the one `viaTool` value on a completion frame that means "the delegate finished the
// declared work" rather than "a hand-off resolved." Only that frame may fill a stage from its
// `toIntentSlug`; the brokerage chain's outer completion carries the same slug but is routing.
const WORK_COMPLETION_TOOL = "delegate_to_agent";

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

// FEATURE: LAV-25 (T4, §19s) -- the agent's OWN one-sentence account of the work it just did, read
// verbatim off the frame that carried it (authorship register 3). Returns null for a frame that
// carries none, which is every frame today (LAV-17/LAV-22 are the emit-seam carriers) -- and the
// caller then composes exactly the template sentence it composes now. Same trim-or-null posture as
// RunTasks.jsx's own private `text` helper; a whitespace-only account is not an account.
function accountOf(d) {
  return typeof d.account === "string" && d.account.trim() ? d.account.trim() : null;
}

// FEATURE: LAV-28c (§19s Receipt-format amendment) -- the requester's five-word headline is what a
// stage's Asked line is FOR; the full `task` instruction travels untruncated and drives the work,
// and stays the rung immediately below. Same content-first priority describeDelegationEvent applies
// to the working-status line, so the two surfaces can never headline one hop two different ways
// (§19q's one-story rule). A frame with no headline degrades to deriveAsked's own existing ladder,
// byte-identically to v7.0.61 -- the platform never truncates `task` into a headline and never
// synthesizes an absent one. Trim-or-null posture matches accountOf above.
function askedOf(evt, d) {
  const headline = typeof d.ask_line === "string" && d.ask_line.trim() ? d.ask_line.trim() : null;
  return headline || deriveAsked(evt);
}

// FEATURE: LAV-28c -- an execution's OWN declared work, indexed by the span that ran it (§19p).
// `prompt_assembled` is the one frame where an execution declares what it was assembled to do
// (`toIntentSlug`) alongside the span it runs under (`span_id`). The delegation START carries the
// same slug but the REQUESTER's span, so indexing that frame instead would file delegated work
// under the asker -- which is why this reads prompt frames only.
//
// Why a PRE-PASS and not a running lookup: the ledger is not in frame-arrival order. A completion
// REPLACES its own start row in place (useHarnessStream.js's logEvent pending-row path,
// MI-52/LOO-009b), so the completion inherits the start's earlier position and lands AHEAD of the
// delegate's own prompt frame in the array this folds. Verified on both S-LAV-28b capture runs.
// First declaration per span wins; a span that never declared work is simply absent, and its
// completion then builds nothing rather than guessing a stage.
function buildDeclaredWorkBySpan(list) {
  const bySpan = new Map();
  for (const evt of list) {
    if (!evt || evt.type !== "prompt_assembled") continue;
    const d = evt.data || {};
    const span = d.span_id ?? null;
    const slug = typeof d.toIntentSlug === "string" && d.toIntentSlug ? d.toIntentSlug : null;
    if (span == null || !slug || bySpan.has(span)) continue;
    bySpan.set(span, slug);
  }
  return bySpan;
}

// FEATURE: LAV-36 PATCH-1 (§19s) -- span -> PARENT span, off the same `prompt_assembled` frames
// and with the same posture as buildDeclaredWorkBySpan above (pre-pass because the ledger is not in
// frame-arrival order; first declaration per span wins; a span that never declared a parent is
// simply absent). This is the only thing that can tell two same-stage completions apart WITHOUT
// naming an agent or an intent: the work that ran INSIDE another piece of work points at it. §19s
// allocates the stage line to the PARENT work, so the fold has to be able to see that link.
function buildParentBySpan(list) {
  const bySpan = new Map();
  for (const evt of list) {
    if (!evt || evt.type !== "prompt_assembled") continue;
    const d = evt.data || {};
    const span = d.span_id ?? null;
    if (span == null || bySpan.has(span)) continue;
    bySpan.set(span, d.parent_span_id ?? null);
  }
  return bySpan;
}

// FEATURE: LAV-28c -- the stage a `delegation_return` completes, read off the work its own span
// declared. S-LAV-28b's live verdict (World 3c, both captured runs): every deep-leg completion
// streams as `delegation_return` and ZERO `delegation_complete` frames stream at all, so a fold
// that fills a stage only on `delegation_complete` leaves every delegated stage permanently
// unfilled -- ask shown, no account, no ✓, which is exactly John's reported symptom.
//
// A return carries no `toIntentSlug` and no `viaTool` of its own (verified on both captures), so it
// cannot name its stage directly -- it names its SPAN, and the span's own prompt frame named the
// work. That is span parentage, and it is depth-agnostic by construction: nothing here reads a
// nesting level, an agent id, or a literal slug. Routing hand-backs resolve through the same
// ROUTING_INTENT_SLUGS data the start path uses (a broker's span declares the routing intent), so
// a brokerage return still builds nothing -- Rule #1 holds, no agent is named anywhere.
function completedWorkStage(d, declaredWorkBySpan) {
  const slug = declaredWorkBySpan.get(d.span_id ?? null) ?? null;
  if (!slug || ROUTING_INTENT_SLUGS.has(slug)) return null;
  return STAGE_OF_INTENT[slug] ?? null;
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
 * `blocked` / `error` are the run's REAL end state, passed straight from the screen's existing
 * terminal bookkeeping (LiveAgentViewScreen's `result.kind === "qa_failed"` -- the gate's own
 * guardrail-block return -- and its `terminal === "error"`). They decide nothing about the sections;
 * they choose which of the three locked cap strings the terminal cap shows (T2/§19s).
 *
 * @returns { sections, running, terminal, terminalText } -- sections NEWEST FIRST by the time each
 *          one opened.
 */
export function buildAssemblyStages(events, eventTimes, {
  runStartedAt = null, agents = [], running = false, terminal = false,
  blocked = false, error = false,
} = {}) {
  const list = Array.isArray(events) ? events : [];
  const byId = new Map((Array.isArray(agents) ? agents : []).map(a => [a.id, a]));
  // FEATURE: LAV-32a (§19s) -- `eventTimes` / `runStartedAt` are still accepted (every caller passes
  // them, and the signature is shared with buildRunTaskEntries) but no longer read: they existed
  // solely to compute each hop's ARRIVAL offset, and §19s removes the "arrived M:SS into the run"
  // clause from this surface. A hop's own `durationMs` is on the event itself, so the `took` figure
  // needs neither. Nothing else in this fold consulted them.
  // FEATURE: LAV-28c -- span -> declared work, built before the main pass (see the helper's own
  // header for why the ledger's order makes a running lookup insufficient).
  const declaredWorkBySpan = buildDeclaredWorkBySpan(list);
  // FEATURE: LAV-36 PATCH-1 -- same frames, same pre-pass reason (see buildParentBySpan).
  const parentBySpan = buildParentBySpan(list);

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
    const key = `${evt.id ?? i}-${evt.type}`;
    // FEATURE: LAV-32a (§19s) -- `took m:ss` and nothing else. "took" is chrome (register 1); the
    // figure is the hop's own measured duration through the one shared formatter. A hop with no
    // measured duration yields null here and renders no time line at all, rather than "took 0:00"
    // (§19j -- the same honest-omission posture formatTimeSignature already took per-half).
    const hopDuration = formatHopDuration(evt.durationMs ?? null);
    const timeSignature = hopDuration ? `took ${hopDuration}` : null;
    // FEATURE: LAV-25 (T4) -- the agent's own account when the frame carried one, the feed's own
    // composed template sentence otherwise. One substitution point covers every place a content line
    // is written below (sections and sub-entries alike), because they all read this same `did`.
    const account = accountOf(d);
    const did = account || deriveDid(evt, byId);

    // ── a fetch: evidence, either on its own or nested under the job it was run for ──────────
    if (evt.type === "assembly_work_complete" && d.work === "fetch") {
      // FEATURE: LAV-25 (T1) -- briefing fetches leave Assembly entirely: no section, no sub-entry,
      // no Evidence founding. Placed before every branch below so there is exactly one exit.
      if (BRIEFING_FETCH_SOURCES.has(d.source)) continue;
      // FEATURE: LAV-32a (§19s) -- `detail: true` marks a PLATFORM DETAIL line ("Fetched 74 chunks
      // from the_library_catalog."): a measured count the four-surface standard moves off the
      // user-facing surfaces entirely (it persists in the stored trace/log for audit, untouched).
      // A render marker ONLY -- the fold still builds and tracks these exactly as before, which is
      // what keeps LAV-25b's terminal-survival rule (`subEntries.length > 0`, so a ghost holding
      // real work is not dropped at terminal) byte-identical. SubEntry skips them at render.
      const sub = { key, ...whoOf(evt.agentId, byId), did, timeSignature, detail: true };
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
      // FEATURE: LAV-32a (§19s) -- same platform-detail marker as the fetch branch above, same
      // render-only effect. This line is "Completed the reflect step · 1832 tok." -- a template
      // sentence carrying a measured token count, which is the same class §19s moves off the
      // user-facing surfaces. The step is still tracked; only its line stops rendering.
      const sub = { key, ...whoOf(evt.agentId, byId), did, timeSignature, detail: true };
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
    // ...and the slug alone is not enough (LAV-21d): a brokerage chain's OUTER completion carries the
    // picked target's slug too, so the same work would fill the stage twice -- once credited to the
    // requester. `viaTool` is the frame's own discriminator between the two: WORK_COMPLETION_TOOL is
    // the delegate doing the declared work; every other value (`request_help` -- the hand-off, i.e.
    // routing, which builds nothing per ROUTING_TOOLS above -- `critique`, or none at all) is not.
    // ...and a THIRD way, added by LAV-28c because it is the only way the platform actually reports
    // a completed deep leg today: a `delegation_return` declares its stage through the work its own
    // SPAN declared (completedWorkStage above). `delegation_complete`'s branch is untouched and
    // still gated on WORK_COMPLETION_TOOL -- both families are now the same completion family
    // wherever a stage fills, which is S-LAV-28b's verdict, without loosening LAV-21d's
    // double-fill guard on the family that already worked.
    const stage = COMPLETION_STAGE[evt.type]
      ?? (evt.type === "delegation_complete" && d.viaTool === WORK_COMPLETION_TOOL
        ? (STAGE_OF_INTENT[typeof d.toIntentSlug === "string" ? d.toIntentSlug : ""] ?? null)
        : null)
      ?? (evt.type === "delegation_return"
        ? completedWorkStage(d, declaredWorkBySpan)
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
      if (target) { Object.assign(target, filledProps, { spanId: d.span_id ?? target.spanId ?? null }); continue; }
      // FEATURE: LAV-36 (§19s) -- the completion-path mirror of LAV-25 T3's revision rule above:
      // work whose stage is already FILLED is work INSIDE that stage, never a second section with
      // the same label. The section keeps its own agent and ✓; the later completion nests as a
      // sub-entry carrying the doer's own account and took-time. Keyed on the stage key only --
      // no agent, no intent named (Rule #1). This is what makes the drawer show ONE Verification
      // phase when the gate's review has filled it and the record check lands after (John's
      // 2026-08-08 report), and it collapses the mobile tracker band's duplicate chips for free
      // (MOB-16 -- one chip per section, same fold).
      const filledHost = findLast(s => s.filled && s.stage === stage);
      if (filledHost) {
        // FEATURE: LAV-36 PATCH-1 (§19s) -- WHICH of the two same-stage completions owns the stage
        // line is not "whichever landed first". Live QA on the T1 build (2026-08-08) came back
        // inverted for exactly that reason: the record check runs INSIDE the gate's round, so its
        // completion always streams first, founded Verification, and the gate review -- the work
        // §19s allocates the stage line to -- nested under it. Span parentage is the discriminator,
        // and it is the only one available that names no agent and no intent (Rule #1): the parent
        // work CLAIMS the headline, demoting the incumbent to a sub-entry that keeps its own agent,
        // account and took-time. One level deliberately, never a walk up the chain -- §19s's nesting
        // is one level deep. An unrelated same-stage completion (no parent link -- the Draft
        // revision-round case) still nests exactly as T1 had it.
        const incomingSpan = d.span_id ?? null;
        const isParentOfHost = incomingSpan != null && filledHost.spanId != null
          && parentBySpan.get(filledHost.spanId) === incomingSpan;
        if (isParentOfHost) {
          filledHost.subEntries.unshift({
            key: `${filledHost.key}-demoted`,
            // All FOUR identity fields whoOf builds, not three: `agentResolved` is what gates the
            // sub-entry's avatar at render, so dropping it would silently strip the demoted agent's
            // face off the line.
            agentId: filledHost.agentId, agentName: filledHost.agentName,
            agentRole: filledHost.agentRole, agentResolved: filledHost.agentResolved,
            did: filledHost.did, timeSignature: filledHost.timeSignature,
          });
          Object.assign(filledHost, filledProps, { spanId: incomingSpan });
          continue;
        }
        filledHost.subEntries.push({ key, ...whoOf(evt.agentId, byId), did, timeSignature });
        continue;
      }
      open({ ...filledProps, spanId: d.span_id ?? null });
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
    // FEATURE: LAV-25 (T3, §19s) -- the REVISION case. The gate re-delegates `ci-answer-intent` after
    // the Draft has already filled, and a second Draft ghost above the finished Draft claims the
    // stage was never reached. That work is real, so it is not dropped either: it nests under the
    // stage it belongs to, carrying the hand-back's own task words. The stage stays filled -- a
    // revision round is work INSIDE a stage, not a new one -- and if the run ends before the round
    // resolves the sub-entry stays put with no invented completion line (its `did` is the agent's
    // own account when one streamed, and nothing at all when none did).
    const revisionHost = ghostStage ? findLast(s => s.filled && s.stage === ghostStage) : null;
    if (revisionHost) {
      // FEATURE: LAV-28c -- a sub-entry with neither an ask nor an account SAYS NOTHING, and
      // .claude/rules/agent-section-rendering.md is explicit: render nothing where the agent
      // returned nothing. It rendered as a bare agent name under a finished stage -- the "trailing
      // bare-name entries" in John's paste. Root cause: once a stage is FILLED, every later
      // `prompt_assembled` frame for that same work takes this revision path, and a prompt frame
      // carries no task words and no account, so the push was structurally empty. LAV-25's T3
      // revision case is unaffected: a real re-delegation start carries the hand-back's own words
      // (or an account, or both) and still nests exactly as it did.
      const revisionAsked = askedOf(evt, d);
      if (revisionAsked || account) {
        revisionHost.subEntries.push({
          key, ...whoOf(worker, byId), did: account, asked: revisionAsked, timeSignature,
        });
      }
      continue;
    }
    open({
      key, stage: ghostStage, ghost: true, filled: false, ...whoOf(worker, byId),
      did: null, content: null, timeSignature: null,
      // The requester's five-word headline where the frame carried one, the full delegation
      // contract below it (askedOf); null for a prompt frame, which carries neither and has no
      // deriveAsked case at all -- and then the stage label stands alone rather than being padded
      // with copy no agent wrote.
      asked: askedOf(evt, d),
      spanId: d.span_id ?? null,
    });
  }

  // A ghost is a prediction. Once the run is over, an unresolved one is a prediction that never came
  // true -- dropped, never left standing as a stage that did not happen.
  // FEATURE: LAV-25b (T1, §19s) -- ...unless it is HOLDING REAL WORK. A ghost that accumulated
  // sub-entries is no longer only a prediction: those sub-entries are hops that actually landed. Live
  // QA 2026-08-07 (v7.0.59, console question 1): Eleanor Voss's evidence visit resolves via
  // `delegation_return` only -- no typed completion streams for it (LAV-22's carrier gap, open) -- so
  // the Evidence section never fills, stays a ghost, and the old filter dropped it at terminal along
  // with her real 74-chunk catalog + 10-chunk library fetches. The run's only genuine evidence
  // vanished from the finished document at the exact moment it mattered. A ghost with ZERO
  // sub-entries still drops exactly as before -- that one really is a prediction that never came
  // true. The surviving section stays unfilled, so it renders with no ✓, no shimmer once terminal,
  // and no invented headline or completion line (§19j): its label, its `asked` line if the start
  // frame carried one, and the real work underneath it.
  const keepGhosts = !!running && !terminal;
  const visible = sections.filter(s => keepGhosts || !s.ghost || s.subEntries.length > 0);
  // FEATURE: LAV-25 (T2) -- an errored run is an errored run even if a gate blocked earlier in it:
  // the error is how the run actually ENDED, so it wins. Nothing else can reach the answered string.
  const terminalText = error
    ? ASSEMBLY_TERMINAL_ERROR_TEXT
    : (blocked ? ASSEMBLY_TERMINAL_BLOCKED_TEXT : ASSEMBLY_TERMINAL_ANSWERED_TEXT);
  return { sections: visible.reverse(), running: !!running, terminal: !!terminal, terminalText };
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

// FEATURE: LAV-32a (§19s, the four-surface standard) -- two removals, both content-only:
//   - the ASK line is gone. §19s's accepted trade is explicit: "asks are live-only (post-run, the
//     drawer holds receipts, not asks)" -- the ask now belongs to the agent bubble and the elapsed
//     status, which are S-LAV-32b's surfaces. Nothing appears on two surfaces.
//   - a `detail` sub-entry renders nothing at all: those are the platform detail lines (fetch
//     counts, token counts), which §19s bans from this drawer. The fold still tracks them.
// With the ask gone, a sub-entry whose only content WAS the ask has nothing left to say, and
// .claude/rules/agent-section-rendering.md is explicit that we render nothing where the agent
// returned nothing -- so the whole row is skipped rather than left as a bare agent name (exactly
// the "trailing bare-name entries" defect LAV-28c fixed at the fold seam).
function SubEntry({ entry }) {
  if (entry.detail || !entry.did) return null;
  return (
    <div style={SUB_ENTRY}>
      <AgentRow who={entry} small/>
      <div style={{ ...CONTENT_LINE, fontSize: 10.5 }}>{entry.did}</div>
    </div>
  );
}

// FEATURE: LAV-25b (T1) -- `terminal` reaches here for exactly one reason: a ghost that survives
// terminal because it holds real work must not keep shimmering. Shimmer means "still coming"; once
// the run is over nothing else is coming, so the box renders what actually landed and nothing more.
// FEATURE: MOB-15 -- exported (and otherwise untouched) so the mobile console can render ONE stage's
// own text in its bottom region. Mobile shows the same section object the desktop drawer shows, so
// the two surfaces can never tell two different stories about a stage (§19q's one-story rule), and
// the mobile screen authors no stage copy of its own (§19j).
export function StageSection({ section, first, terminal = false }) {
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
          {/* FEATURE: LAV-32a (§19s) -- the ghost's ASK line (and the pulsing dot that led it) is
              removed for the same reason as SubEntry's: asks are live-only and belong to the bubble
              and the elapsed status, never to the drawer's ledger. Ghost BEHAVIOUR is untouched --
              it still opens on the same declared work, still shimmers while the run is live, still
              survives terminal when it holds real work and still drops when it does not. The fold
              keeps computing `asked` (LAV-28c's revision-push rule depends on it and S-LAV-32b
              reads it); only this drawer stops rendering it. Side effect worth naming: this also
              retires the pulsing dot that persisted on a surviving unfilled stage after terminal
              (the Tier-2/3 flag raised out of LAV-25b's live QA). */}
          {!terminal && (
            <>
              <ShimmerBar/>
              <ShimmerBar width="72%"/>
            </>
          )}
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

// ── FEATURE: MOB-15 -- the mobile Assembly tracker band ───────────────────────
// Mobile had NO Assembly surface at all before this: the drawer below is desktop chrome, so on a
// phone the build story simply did not exist. The band is that story's index -- one chip per stage
// from the SAME `buildAssemblyStages` fold the desktop drawer reads, so the two surfaces can never
// tell two different stories about one run (§19q). Tapping a chip is the screen's business; this
// component owns no state and decides nothing about what the tap reveals.
//
// It renders the fold's REAL stages and nothing else: no placeholder chip, no "upcoming" stage, no
// storyboard of a pipeline that has not run (§19r/§19j). Zero sections renders the label alone.
// Every string is chrome register 1 -- ASSEMBLY_TITLE / STAGE_LABEL / IN_PROGRESS_LABEL, the
// constants at the top of this file, John's canonical words, imported rather than re-typed.
//
// Motion is the existing global `aiBlink` keyframe (tokens.js), reused verbatim on a leading dot --
// no new keyframe, so this inherits whatever reduced-motion posture the platform already has.
// FEATURE: MOB-20 -- rgba shades composed from imported tokens, never written as literals
// (.claude/rules/design-tokens.md). Same helper LiveAgentViewScreen.jsx/HarnessTraceConsole.jsx use;
// this file had none of its own until this chip needed one.
const rgba = (hex, a) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

// Exported so the regression test can assert on the real height/chip-style values (MOB-18 test plan).
export const TRACKER_BAND = {
  display: "flex", alignItems: "center", gap: 7, height: 26, flexShrink: 0,
  padding: "0 12px", background: T.paper, borderTop: `1px solid ${T.line}`,
  overflowX: "auto", overflowY: "hidden", whiteSpace: "nowrap", scrollbarWidth: "none",
};
// The Agent Routing header's own register, so the band reads as part of the bottom cluster's chrome.
const TRACKER_LABEL = {
  flex: "none", fontFamily: mono, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.11em",
  textTransform: "uppercase", color: T.muted,
};
// The .lav-mseg toggle's chip idiom (AgentNetwork.jsx's mobile chrome), same size and weight.
// FEATURE: MOB-20 -- bumped from a flat 7.5px outline to a 9px chip with a soft drop shadow (reads
// as a tappable control, not a status label); the per-state color rules below are unchanged.
export const TRACKER_CHIP = {
  position: "relative", flex: "none", display: "inline-flex", alignItems: "center", gap: 4,
  border: `1px solid ${rgba(T.mutedDeep, 0.5)}`, borderRadius: 20, background: T.card, cursor: "pointer",
  padding: "4px 10px", fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
  textTransform: "uppercase", color: T.muted, whiteSpace: "nowrap",
  boxShadow: `0 1px 3px ${rgba(T.navy, 0.22)}`,
};
// FEATURE: MOB-20 -- the caret that signals the chip is tappable, not a status label.
const TRACKER_CARET = { color: T.brassDeep, fontSize: 7, letterSpacing: 0 };
// `.lav-mseg button::after`'s idiom, expressed inline: a transparent box that takes the TOUCH target
// to ~37px without changing one pixel of layout, so the band's 26px visual height costs no
// tappability. Inside the button, so it can only ever forward a tap to its own chip.
const TRACKER_TOUCH = { position: "absolute", left: 0, right: 0, top: -10, bottom: -10 };
const TRACKER_DOT = {
  width: 5, height: 5, borderRadius: "50%", background: T.brass, flex: "none",
  animation: "aiBlink 1.3s ease-in-out infinite",
};
const TRACKER_CHECK = { color: T.moss, letterSpacing: 0 };

export function AssemblyTrackerBand({ stages, running = false, openKey = null, onToggle }) {
  const sections = stages?.sections ?? [];
  const terminal = !!stages?.terminal;
  // The fold hands sections NEWEST FIRST (its own documented return order); a tracker reads
  // chronologically left to right, so this reverses a COPY -- never the fold's own array.
  const chips = [...sections].reverse();
  return (
    <div style={TRACKER_BAND}>
      <span style={TRACKER_LABEL}>{ASSEMBLY_TITLE}</span>
      {chips.map(s => {
        const label = s.stage ? STAGE_LABEL[s.stage] : IN_PROGRESS_LABEL;
        const isError = s.stage === "error";
        // A ghost is a live prediction only while the run is actually live; once terminal, a
        // surviving ghost is finished work with no completion, and it renders static (LAV-25b).
        const live = !!s.ghost && !!running && !terminal;
        const selected = openKey != null && openKey === s.key;
        return (
          <button key={s.key} type="button" title={label} onClick={() => onToggle?.(s.key)}
            style={{ ...TRACKER_CHIP,
              ...(s.filled && !isError ? { color: T.navy } : null),
              ...(live ? { borderColor: T.brass } : null),
              ...(isError ? { color: T.flag, borderColor: T.flag } : null),
              ...(selected ? { borderColor: T.brassDeep } : null) }}>
            <span style={TRACKER_TOUCH}/>
            {live && <span style={TRACKER_DOT}/>}
            {s.filled && !isError && <span style={TRACKER_CHECK}>✓</span>}
            {label}
            <span style={TRACKER_CARET}>{selected ? "▴" : "▾"}</span>
          </button>
        );
      })}
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
  // FEATURE: LAV-25 (T2) -- the fold decides which of the three locked strings is true of this run;
  // the drawer renders whatever it was handed and authors no cap of its own. A `stages` object from
  // before this change carries no `terminalText`, and then no cap renders at all rather than a
  // guessed one (§19j).
  const terminalText = typeof stages?.terminalText === "string" ? stages.terminalText : null;
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
                  {terminal && terminalText && <div style={TERMINAL_CAP}>{terminalText}</div>}
                  {sections.map((s, i) => (
                    <StageSection key={s.key} section={s} first={i === 0} terminal={terminal}/>
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
