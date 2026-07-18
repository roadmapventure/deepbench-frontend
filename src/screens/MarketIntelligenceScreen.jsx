// DeepBench v6.3.60 | MarketIntelligenceScreen.jsx | CHI-30 — reorders the 23 example questions and
// adds a session-scoped rotation (static "library" question in slot 2; 6-of-10 pool randomizes into
// slots 1,3-7 on refresh/Clear once the splash has been dismissed this tab session; drawer always 16).
// (Prior header, kept for history: CHI-14 — Agent Routing drawer's zero-hop empty
// state de-duplicated: desktop (AuditColumn) carried a stale sentence referencing internal session
// IDs (S-MARKET-INTEL-01d/03, one already shipped), mobile had already independently drifted to a
// different, shorter string. Both now render a single shared AGENT_ROUTING_EMPTY_TEXT constant —
// "Real agent-hop events appear here as the chat runs." — fixed at the source so the two surfaces
// cannot drift again. Text-content-only change; no styling touched.
// DeepBench v6.3.44 | MarketIntelligenceScreen.jsx | CHI-13 — EvidenceColumn's card restructured to
// match InteractColumn's scroll-body+pinned-footer anatomy: a new selectEvidenceFooterKind() pure
// function centralizes the mutual exclusion (confirmation > hypothesis result > qa review) that was
// previously implicit in scattered inline gates, and gates a single footer slot pinned below the
// scrollable content (padding/borderTop matching InteractColumn's own footer row exactly). Applied
// to all 3 decision points that used to fall wherever the content stack ended: QaEvidenceCard's
// "Good, thanks"/"Have Priya…" choice (extracted to a new QaEvidenceCardFooter component, byte-
// identical markup/styling per STYLE-GUIDE.md §35), the hypothesis-result "Info Only"/"Store as
// Forecast" buttons, and ConfirmationCard's Accept/Reject/Edit (SharedUI.jsx untouched, only its
// render location moved). QaEvidenceCard's inner maxHeight:320/overflowY:"auto" cap (CHI-12's
// workaround for the lack of a real scroll-body/footer split) is now redundant and removed — the
// outer scroll body bounds and scrolls this content the same way InteractColumn's message list does.
// Pure layout relocation — none of the three CTAs change appearance.
// DeepBench v6.3.34 | MarketIntelligenceScreen.jsx | CHI-07 — central duration/elapsed-time helpers:
// buildHopEvent() resolves every logEvent/onEvent call's durationMs (real value passes through,
// omitted value resolves to null only for the 5 declared NON_MEASURABLE_EVENT_TYPES, else logs a
// console.error dev-guard) and buildMessage() guarantees totalElapsedMs travels with any
// hopStart/hopEnd on a setMessages(...) push. Migrated all 23 logEvent/onEvent call sites and all 17
// setMessages call sites to route through these two helpers instead of hand-written object literals.
// Fixes a stray bug: failure_triage previously logged a literal durationMs: 0 (now correctly null,
// like every other non-measurable sibling event). Render layer: non-qa MessageBubble ack bubbles and
// the Theory Evidence card now show "Full Agent Routing & Answer Given in Xs" wherever hop data is
// present (submission/info-only/resolution acks, hypothesis-test result) — previously only the qa
// bubble and QaEvidenceCard rendered this caption. No new tokens/colors; reuses the existing mono
// caption style. First of 5 sessions in the continuity-ux-0716 UX sweep (CHI-07 -> CHI-08 -> CHI-12
// -> CHI-09 -> CHI-10).
// DeepBench v6.3.32 | MarketIntelligenceScreen.jsx | CHI-05 — QaEvidenceCard's and MessageBubble's
// dormant-copy review-choice ("Good with this analysis, or would you prefer deeper theories?") block
// restyled from a flat T.cardAlt box to a distinct action-needed gradient card (T.brassGlow ->
// T.white, brass border + Corners bracket, brass status badge, bold navy question, navy
// primary CTA) so it reads as an action item rather than more read-only prose. Pure visual restyle —
// zero change to onGoodThanks/onReview handler logic in either location. New FeatureBadge id="CHI-05"
// on QaEvidenceCard only (one badge per feature ID per file, MessageBubble's copy is unreachable/
// dormant and shares the same feature ID). New tokens T.brassGlow/T.white added in tokens.js.
// DeepBench v6.3.29 | MarketIntelligenceScreen.jsx | CHI-04 — Clear now fully resets Agent Routing
// state: onClear() also clears pipelineEvents/pendingDelegationsRef (Column 3 used to survive Clear
// untouched). New clearGenerationRef cancellation counter, threaded as an `isStale` predicate through
// the whole callCapability/resolveInProgress/resolveConfirmation/runIntentPipeline/
// runQaWithQualityGate/generateHypotheses/runHypothesisTest call graph and every top-level entry
// point (submit/enterHypothesisFlow/onSelectHypothesis/onCommit/onResolveConfirmation) — an in-flight
// request whose Clear fired mid-way now stops making further calls and never touches state once it
// (partially) resolves, fixing a real bug where an abandoned request could silently repopulate a
// just-cleared screen. Frontend-only by design (every continuation hop is a separate client-issued
// fetch(), so a client-side guard is sufficient) — killing the one hop already executing server-side
// at the instant of Clear is a separate harness-level gap, logged as HAR-03, deliberately out of
// scope here. groupEventsIntoHops() gains a `question_boundary` marker case (a synthetic event,
// always its own hop, excluded from hop numbering) and a new QuestionDivider component renders it in
// the Agent Routing drawer, so a follow-up question asked without Clear gets a visible "New question
// · HH:MM:SS" boundary instead of reading as one unbroken sequence. See STYLE-GUIDE.md §34 (new).
// FEATURE: CHI-04
//
// DeepBench v6.3.24 | MarketIntelligenceScreen.jsx | CHI-03c — "turn"/"turns" renamed to "hop"/"hops"
// throughout the Agent Routing mechanism (groupEventsIntoTurns()->groupEventsIntoHops(),
// RoutingTurnCard->RoutingHopCard, turnNumber->hopNumber): "turn" already means a conversation
// exchange in AI/chat systems, distinct from what this counts (one internal agent-to-agent
// delegation); "hop" is the term ARCHITECTURE.md/durable_hops already use. Hop-range cross-reference
// badges (`Hop N`/`Hops N–M`, new HopBadge/hopBadgeText/currentHopCount helpers) added to
// QaEvidenceCard, the hypothesis_test result block, the chat pointer sentence, and both CHI-03b ack
// messages, via a new getHopCount param threaded through runQaWithQualityGate()/runIntentPipeline()/
// runHypothesisTest() and a pipelineEventsRef mirroring pipelineEvents synchronously so async chains
// never read a stale hop count. Mobile fix: hasActiveFlow -> hasEvidenceContent (!!qaEvidence ||
// !!hypFlow, was !!hypFlow alone) so a plain Q&A that never starts a hypothesis flow now correctly
// enables/flashes the mobile Evidence tab (the gap CHI-03a flagged and deferred). See
// STYLE-GUIDE.md §21/§31 (amended).
// FEATURE: CHI-03c
//
// DeepBench v6.3.22 | MarketIntelligenceScreen.jsx | CHI-03a — Chat/Evidence architecture move:
// any document/analysis/narrative an agent produces is evidence (Column 2/"Evidence & Interaction"),
// never chat (John's rule, design walkthrough + mock, S-CHI-03-design). New `qaEvidence` state slot
// (independent of `hypFlow`) holds the most recent Q&A answer so EvidenceColumn renders it whether
// or not a hypothesis flow is ever started — fixes a real bug: a plain Q&A the user never escalates
// used to leave EvidenceColumn permanently empty. `QaEvidenceCard` extracted from the old chat `qa`
// card (byte-identical visuals), now rendered in Evidence; chat's `qa` bubble shrinks to a fixed
// pointer sentence + flag/elapsed captions + the review-outcome note (msg.text itself is left as the
// full plain answer, unchanged, so conversationContext()/onReview's flaggedAnswer keep working — only
// the displayed copy is now a fixed string, decoupled from msg.text). `onGoodThanks`/`onReview` now
// operate on `qaEvidence` directly (were message-index-based). `hyp_submitted`/`hypothesis_test`
// MessageBubble cases deleted — the submitted-theory text moves into EvidenceColumn (uses
// `hypFlow.chosenText`, already present, no new state); onDiscard()/onResolveConfirmation() push a
// short static placeholder line to chat instead (interim only — CHI-03b replaces with a real live
// acknowledgment). Columns rename: "Interact" -> "Chat", "Evidence" -> "Evidence & Interaction".
// Mobile's Evidence-tab-disabled-until-hypFlow gate is a known, tracked gap for a qaEvidence-only
// answer (logged against CHI-03c, `docs/FEATURES.md` CHI-03 row) — deliberately not touched here,
// out of this session's scope (STANDARDS.md Category M / kickoff SCOPE RULES).
// See STYLE-GUIDE.md §33 (new).
// FEATURE: CHI-03a
//
// DeepBench v6.3.18 | MarketIntelligenceScreen.jsx | CHI-01/CHI-02 — Agent Routing log's per-event
// rows replaced with hop-grouped cards: groupEventsIntoHops() collapses consecutive same-agent
// events into one hop (a hand-off, not an activity, per John's explicit call), RoutingHopCard
// renders one bordered card per hop (header once, border-left = last activity's color),
// RoutingActivityLine renders each stacked activity line with its own color dot. RoutingEventRow
// fully removed. describePipelineEvent()'s 4 shapeForLog() call sites (proofreader/failure_triage/
// patch_proposed/agent_selection) now pass raw text through unchanged — hard truncation moves
// entirely to RoutingActivityLine's CSS line-clamp (3 lines) + click-to-expand ("Read more"/"Show
// less", threshold >160 chars), so long text (e.g. Michelle's agent_selection reasoning) is never
// discarded, just visually clamped. shapeForLog() itself and its other 2 call sites (AuditDrawersBody
// Analysis drawer) are untouched. Drawer count label switches "N events" -> "N hops". Pure
// display-layer change — no evt.data shape, callCapability(), or backend/Skill Profile touched.
// See STYLE-GUIDE.md §31 (amended)/§32 (new).
// FEATURE: CHI-03c — renamed "turn"/"turns" to "hop"/"hops" throughout this mechanism (John's
// explicit call: "turn" already means a conversation exchange in AI/chat systems, distinct from
// what this counts — one internal agent-to-agent delegation; "hop" is the term ARCHITECTURE.md/
// durable_hops already use). Comment above amended in place to describe the current, renamed code.
// FEATURE: CHI-01
// FEATURE: CHI-02
//
// DeepBench v6.2.45 | MarketIntelligenceScreen.jsx | MI-68 — Agent Routing log rewritten to plain
// activity-narration copy (describePipelineEvent()'s summary strings), dropping confidence_tier/
// self-flag jargon and per-event outcome content; real load-bearing detail (agent_selection's
// reasoning, error's message, proofreader/failure_triage/patch_proposed's substantive text) still
// trails each activity label. RoutingEventRow gains sameAgentAsPrevious: consecutive same-agent rows
// suppress their repeated avatar/name/role header (both drawer and mobile pinned-feed call sites now
// compute this per-list). Pure display-layer change — no evt.data shape, callCapability(), or
// backend/Skill Profile touched. See STYLE-GUIDE.md §31.
// FEATURE: MI-68
//
// DeepBench v6.2.44 | MarketIntelligenceScreen.jsx | AA-189 — onResolveConfirmation() had no catch
// at all, so any resolve failure (this session's source_chunk_ids UUID crash, or any future reason)
// was silently swallowed — ConfirmationCard just sat there with zero feedback. Added a catch
// symmetric to onCommit()'s existing one (chat error message + logEvent), but deliberately does
// NOT reset hypFlow (John's explicit "leave open" call) — the drafted confirmation is still valid,
// only the resolve action failed, so the user can retry Accept/Reject without regenerating it.
// FEATURE: AA-189
//
// DeepBench v6.2.43 | MarketIntelligenceScreen.jsx | MI-66 — EvidenceColumn's result section
// reordered: the Info Only/Store as Forecast decision control (the real HITL gate on this screen,
// distinct from the later ConfirmationCard) now leads, with new instructional copy ("Review the
// theory evidence below, then select an option.") and the override warning grouped with it. Real
// behavior change confirmed with John: override_warning now shares the buttons' !hypFlow.confirmation
// gate, so it hides once the ConfirmationCard replaces the buttons during Nadia's draft-review stage,
// instead of staying visible for the rest of the flow. Below the decision block: ActualDataPointsTable/
// TheorizedDataPointsTable (MI-63) → chart → Supports/Complicates/Consider thesis (MI-51). Pure JSX
// reorder plus one new copy string; onCommit()/onDiscard()/was_override logging unchanged.
// FEATURE: MI-66
//
// DeepBench v6.2.41 | MarketIntelligenceScreen.jsx | MI-65 — chat's hypothesis-test card was
// pushed at test-completion time (before any decision), so it looked finished but wasn't; the
// real outcome only reached chat later as a thin one-line hyp_discard note. Fix: chat push
// deferred from onSelectHypothesis to resolution time (onDiscard/onResolveConfirmation), enriched
// with a color-coded resolution stamp (stored/info_only/rejected) on the same hypothesis_test
// card instead of a separate disconnected line. All decisions/interactions stay in Evidence only.
// The now-dead hyp_discard message kind (render case + both push sites) is fully retired.
// FEATURE: MI-65
//
// DeepBench v6.2.40 | MarketIntelligenceScreen.jsx | MI-67b — generateHypotheses()/
// runHypothesisTest() were discarding/misattributing patterns_used one layer above
// callCapability()'s own MI-67 fix. generateHypotheses() now returns { hypotheses, patterns_used }
// instead of a bare array (caller destructures both, candidates' own shape unchanged everywhere
// else it's used). runHypothesisTest()'s return now overrides patterns_used to the ANALYSIS step's
// real value (hyp-hypothesis-test-intent) on every branch, not the DISPLAY step's
// (hyp-hypothesis-test-display-intent, already correct on its own separate display_format event).
// FEATURE: MI-67b
//
// DeepBench v6.2.39 | MarketIntelligenceScreen.jsx | MI-62 — Evidence panel's hypothesis-flow
// stage copy corrected against the real skill_profiles content: the "generating" stage
// (hyp-generation-intent) no longer claims Data Room usage (its real method is
// plausibility-grounded, not a mandated fresh query); the "testing" stage
// (hyp-hypothesis-test-intent) now names the Data Room (its real method does query it fresh).
// Copy-only reword, two literal sentences, no JSX structure/styling/stage-transition change.
// FEATURE: MI-62
//
// DeepBench v6.2.38 | MarketIntelligenceScreen.jsx | MI-64 — Desktop InteractColumn's message
// list now auto-scrolls to bottom on new message/workingStatus change (reusing FetchContext.jsx's
// existing scroll-to-bottom-with-user-override pattern, replicated locally, not imported) and
// EvidenceColumn now threads workingStatus through to render a duplicate AgentWorkingIndicator
// near the top of both its empty and populated states.
// FEATURE: MI-64
//
// DeepBench v6.2.37 | MarketIntelligenceScreen.jsx | MI-67 — Agent Routing log now shows real
// per-call patterns_used (callCapability() no longer discards it on unwrap) instead of a static
// fabricated fallback string; SERVICE_LABEL's decorative `.patterns` sub-field removed.
// FEATURE: MI-67
//
// DeepBench v6.2.35 | MarketIntelligenceScreen.jsx | MI-61 — Evidence column's empty-state
// sentence (MI-59's getEvidencePanelSentence(), !hypFlow branch) tightened per John's direct
// copy request: "Once your chat has analysis data for you to interact with, it will appear
// here" -> "Once your chat has analysis data for interaction, it will appear here...". Copy-only,
// single string; populated-state branch untouched.
// FEATURE: MI-61
//
// DeepBench v6.2.33 | MarketIntelligenceScreen.jsx | MI-60 — InteractColumn's empty state (shown
// only before the first message) gains a 4th seed box beneath the existing 3 EXAMPLE_QUESTIONS
// buttons: a collapsed Drawer (SharedUI.jsx, reused unmodified) titled "Browse 20 more example
// questions" with a (20) count badge and maxHeight:220 internal scroll, revealing the 20 realistic
// VP-of-Channel-Sales questions (MORE_EXAMPLE_QUESTIONS, drafted/pipeline-tested by the 2026-07-08/09
// overnight AA-172/AA-173 session). Clicking any of the 20 auto-sends via the same submit() as the
// existing 3 (no populate-then-review). Because messageList (and this whole empty-state block) is
// shared by both InteractColumn's bare (mobile) and non-bare (desktop) branches, this ships on both
// by construction — no useIsMobile() branch, no changes to Drawer or EXAMPLE_QUESTIONS. See kickoff
// docs/kickoffs/v6.2.33-MI-60-seed-question-drawer.md.
// FEATURE: MI-60
//
// DeepBench v6.2.30 | MarketIntelligenceScreen.jsx | MI-59 — EvidenceColumn's !hypFlow branch
// becomes purely informational ("Once your chat has analysis data for you to interact with, it
// will appear here"), the 4 dummy data-type pills (Sourced/Analysis/Source Simulation/Learned —
// no click handler, no flow tie) removed outright, not just hidden. Populated branch's header
// unified to "Evidence" (was "Theory Evidence") and gains a new intent-prefixed sentence (e.g.
// "Theory — Data for you to interact with your chat..."), placed directly under the header. Both
// strings come from one new getEvidencePanelSentence(hypFlow) helper so they can't drift apart.
// describeDataType() itself is unchanged, still used by its other 2 call sites (Data Sources
// drawer, Pipeline Log confidence_tier summary) — see STYLE-GUIDE.md §19's MI-59 amendment.
// FEATURE: MI-59
//
// DeepBench v6.2.29 | MarketIntelligenceScreen.jsx | MI-58 — estimateChainMs() rewritten to a
// depth-weighted expected-value-per-call model: depth0's p75 (always paid) plus each further
// depth's p75 weighted by how often that depth is actually reached relative to depth0's call
// count, reading the new byKind[kind].byDepth data from useAgents.js. formatExpectation() and all
// 3 call sites unchanged (same ms-in/string-out contract). See kickoff
// docs/kickoffs/v6.2.29-MI-58-expected-time-estimate-fix.md.
// FEATURE: MI-58
//
// DeepBench v6.2.27 | MarketIntelligenceScreen.jsx | MI-57 — desktop's InteractColumn (non-bare
// branch) now accepts onClear and renders a Clear control in its input row, after Send — reuses
// MobileBody's existing Clear link style verbatim (MI-51/MI-56). Mobile (bare) branch unchanged;
// onClear's own reset semantics (~line 1759) unchanged. See kickoff
// docs/kickoffs/v6.2.27-MI-57-desktop-clear-button.md.
// FEATURE: MI-57
//
// DeepBench v6.2.25 | MarketIntelligenceScreen.jsx | MI-56 — mobile MI's permanent Question box/Send/
// Clear strip merged from two stacked rows into one: input (flex:1) — Send — thin T.lineSoft divider
// — Clear. Was a mobile shell bug (Clear rendered orphaned on its own near-empty row underneath).
// Pure layout merge, no handler/behavior change. See STYLE-GUIDE.md §21's 2026-07-14 MI-56 amendment
// and kickoff docs/kickoffs/v6.2.25-MI-56-mobile-chat-input-clear-row-merge.md.
// FEATURE: MI-56
//
// DeepBench v6.2.24 | MarketIntelligenceScreen.jsx | MI-55 — AuditColumn's Agent Routing Drawer
// (desktop only) opts into SharedUI.jsx's new `resizable` prop alongside its existing maxHeight={280}
// — drag-to-resize taller, floor locked at 280, ceiling min(80vh, real content height), not persisted.
// The other 4 drawers (Agents/Data Sources/Analysis/Agent Reasoning) are unchanged.
// FEATURE: MI-55
//
// DeepBench v6.2.22 | MarketIntelligenceScreen.jsx | MI-54 — EvidenceColumn (desktop Column 2)
// bounded to the grid row height with an internal scroll region, matching InteractColumn's existing
// pattern (action buttons/ConfirmationCard now scroll into view inside the card instead of growing
// the whole page past the fold). MI-53 (real Display-Agent hop for Nadia's pending_confirmation
// proposal) REVERTED 2026-07-14, same commit -- the new data-patch-display-intent hop let Michelle's
// agent-selection route an unconfirmed correction to a write-capable agent (Eleanor Voss/
// library-write-intent), which executed a real the_library INSERT before any human confirmation.
// Reverted at John's explicit direction pending a proper fix to delegate_to_agent's target-capability
// restriction (task_773e8b06). See kickoff docs/kickoffs/v6.2.22-MI-53-MI-54-confirmation-format-column2-scroll.md.
// FEATURE: MI-54
// DeepBench v6.2.20 | MarketIntelligenceScreen.jsx | MI-52 — Agent Routing log normalization: one
// agent per row (arrow/secondary-avatar block removed from RoutingEventRow; firstName helper
// extracted to module scope, shared by describeDelegationEvent() and RoutingEventRow), agent_selection/
// display_format re-pointed so the row's one visible agent is whoever the row is actually about
// (picker vs. formatter, not the requester), duplicated/fabricated durationMs fixed (agent_selection
// shows null, never a copy of display_format's real number or a hardcoded 0), and in-flight
// delegation/delegation_return rows are now replaced in place by their real completion event instead
// of sitting duplicated forever (logEvent's new additive `{ replaces }` call shape). See kickoff
// docs/kickoffs/v6.2.20-MI-52-agent-routing-log-normalization.md.
// FEATURE: MI-52 — see STYLE-GUIDE.md §5 (2026-07-14 amendment, reverses S-MI-49's drawer-scope note)
// DeepBench v6.2.18 | MarketIntelligenceScreen.jsx | S-MI-51 — guided review->theory->decide journey:
// every qa answer ends with an explicit "Good, thanks / Have Priya generate theories" choice (not just
// internally-flagged ones); mobile Chat/Evidence become a permanent tab bar (Evidence disabled until a
// theory flow is active, symmetric flash on unseen content) replacing the old hidden-overlay pattern;
// elapsed/expect/status becomes a permanent strip (fixes 30s dead-air behind the old Evidence overlay);
// theory testing requires an explicit "Have Priya test this theory ->" click, no longer auto-fired on
// selection; end decision collapses from 3 buttons (Discard/Track as Assumption/Make Permanent) to 2
// (Info Only/Store as Forecast); confirmation card gets a plain-language intro line naming Nadia; the
// Theory/Forecast/Correct switcher UI is removed from EvidenceColumn (underlying intent routing
// unchanged). "Agent & Data Info" (renamed from "Activity") relocates to the page-title row, mobile-only.
// Also corrects MI-50's stale FEATURES.md/CLAUDE-STATE.md tracking (code was already live, see kickoff).
// FEATURE: MI-51 — see STYLE-GUIDE.md §21 (2026-07-14 amendment)
// DeepBench v6.2.15 | MarketIntelligenceScreen.jsx | S-MI-50 — mobile MobileBody: bottom-edge scroll
// affordance (fade gradient + bouncing chevron, reuses dbounce keyframe) on the pinned Agent Routing
// feed, shown only when there's real unscrolled content below (dynamic, re-checked on scroll and on
// event-list growth). See STYLE-GUIDE.md §21's 2026-07-14 amendment. FEATURE: MI-50.
// DeepBench v6.2.0 | MarketIntelligenceScreen.jsx | S-MOBILE-NAV-01 — rename (MI-46): page title +
// Agent Routing empty-state copy "Market Intelligence" → "Channel Sales Intelligence", display-text
// only, see STYLE-GUIDE.md §25.
// DeepBench v6.1.46 | MarketIntelligenceScreen.jsx | S-MI-45 — mobile-responsive composition: new
// isMobile branch (useIsMobile()) renders MobileBody (chat flex:3 + pinned Agent Routing feed
// flex:1, Evidence/Activity full-screen overlays) below MOBILE_BREAKPOINT (768px); desktop's
// existing 3-column grid is completely unchanged. RoutingEventRow (Agent Routing event row) and
// AuditDrawersBody (Agents/Data Sources/Analysis/Agent Reasoning drawers) extracted out of
// AuditColumn so both desktop and mobile render the exact same shared JSX (Category M).
// FEATURE: MI-45 — see STYLE-GUIDE.md §21-23
// DeepBench v6.1.44 | MarketIntelligenceScreen.jsx | S-MI-43 — Agents drawer latency rows: new shared
// LatencyStatRow component replaces the old justifyContent:"space-between" full-string right-justify
// with a fixed-width label column (ellipsis-truncated) + fixed-width right-aligned leading number, so
// the decimal point/units digit lines up across rows regardless of label length or 1-vs-2-digit values
// DeepBench v6.1.43 | MarketIntelligenceScreen.jsx | S-MI-42 -- live SSE delegation events + MI-41 macro-hop swap, all 3 agent flows
// DeepBench v6.1.41 | MarketIntelligenceScreen.jsx | S-MI-34 — MI-32/33 scroll-fix completion (3-column
// grid alignItems:"start" removed, restoring default stretch so InteractColumn's own overflow chain gets
// a real bounded height); Column 3 drawer height cap (MI-34, Drawer's new maxHeight prop, Agent Routing
// only) + reorder (MI-39, Agent Reasoning moved to last); 3 copy fixes (MI-37/38/40); expected-time
// indicator + timer reformat (MI-35, formatElapsed now "Xm Ys"/"Xs", new expectation field on
// workingStatus with a two-stage ceiling→chain-based estimate)
// DeepBench v6.1.35 | MarketIntelligenceScreen.jsx | AA-164 — runQaWithQualityGate() emits an agent_selection Pipeline Log event when Marcus's ci-answer-intent turn threads a real internal request_help hop (qa.last_help_selection), reusing the existing generic agent_selection case unchanged
// DeepBench v6.1.23 | MarketIntelligenceScreen.jsx | S-MI-30/MI-30+MI-31 — Agents drawer: added "riley" to PROPOSED_MI_AGENT_IDS + html-display to MI_LOOP_SCOPE (Riley Torres visibility fix); added a "Baseline" rollup row (rollupBaseline(), speed-baseline-test tenant) as the first entry in each agent's byKind breakdown
// DeepBench v6.1.21 | MarketIntelligenceScreen.jsx | S-MI-29/MI-29 — three silent-reset async catch blocks (enterHypothesisFlow/onSelectHypothesis/onCommit) now surface the real e.message as a chat error bubble and a Pipeline Log "error" row (T.flag), matching the pattern onSend's catch already used
// DeepBench v6.1.11 | MarketIntelligenceScreen.jsx | S-MI-27/MI-27+MI-28 — Submitted Hypothesis card gets a "Submitted by You" attribution row (UserAvatar); AI - Hypothesis Test header swapped to actor-first order (Priya Nair · AI - Hypothesis Test), matching the Q&A card's existing order
// DeepBench v6.1.10 | MarketIntelligenceScreen.jsx | S-MI-26/MI-26 — Data Sources drawer: section headers (Sourced/Simulation/category) bumped to 12.5px matching row title size, DataSourceRow title dropped to fontWeight:400
// DeepBench v6.1.9 | MarketIntelligenceScreen.jsx | S-MI-25/MI-25 — Data Sources drawer: section headers (Sourced/Simulation/category) swapped to T.ink, DataSourceRow title swapped to T.muted
// DeepBench v6.1.6 | MarketIntelligenceScreen.jsx | S-MI-24/MI-24 — Column 3 drawer rename (Pipeline Log -> Agent Routing, Learned Context -> Agent Reasoning)
// DeepBench v6.1.5 | MarketIntelligenceScreen.jsx | S-MI-23 — chat-embedded AgentWorkingIndicator replaces header dot + Theory Evidence duplicate lines
// v6.1.5 — S-MI-23 workingStatus wiring, all 6 turns
// DeepBench v6.1.3 | MarketIntelligenceScreen.jsx | S-MI-21/MI-21 — Pipeline Log converted to a Drawer, default open
// DeepBench v6.1.4 | MarketIntelligenceScreen.jsx | S-MI-22 — Data Sources drawer regrouped into
// Sourced/Simulation (sub-grouped by category)/Analysis sections; Analysis moved to its own Drawer
// DeepBench v6.0.47 | MarketIntelligenceScreen.jsx | S-MI-15 — Data Sources drawer + describeDataType() display-label taxonomy
// DeepBench v6.0.46 | MarketIntelligenceScreen.jsx | S-MI-20 — latency broken out by kind, blended stat removed
// DeepBench v6.0.44 | MarketIntelligenceScreen.jsx | S-MI-18c — Agents drawer sorted descending by calls
// DeepBench v6.0.43 | MarketIntelligenceScreen.jsx | S-MI-18b — full loop roster + page-scoped metrics
// DeepBench v6.0.40 | MarketIntelligenceScreen.jsx | MI-18 — Agent Activity drawer, Column 3 (closes MI-06)
// DeepBench v6.0.36 | MarketIntelligenceScreen.jsx | MI-17 — Learned Context drawer, Column 3
// DeepBench v6.0.25 | MarketIntelligenceScreen.jsx | S-MI-14 — full terminology rename sweep
// (AI - Hypothesis Test branding, generalized human-operator term); no mechanism/behavior change.
// DeepBench v6.0.24 | MarketIntelligenceScreen.jsx | S-MI-13 — EvidenceColumn consumes the
// generic ChartRenderer (ARCHITECTURE.md §19g) via st.visualization, replaces the retired
// st.projected_state plain-text block
// FEATURE: MI-01 — Market Intelligence screen, three-column layout per market-intelligence-v4.html
// FEATURE: MI-02 — deterministic human-decision layer: hypothesis pick/write + commit actions are
// explicit human controls, all live as of 01d. FEATURE: MI-51 — commit actions relabeled/collapsed
// from 3 buttons (Discard/Track as Assumption/Make Permanent) to 2 (Info Only/Store as Forecast).
// FEATURE: MI-03 — Theory Evidence swap-on-hypothesis-select (live); Data Room default charts still roadmap
// FEATURE: AI-39 — two-layer needs_review OR-gate (Marcus self-flag OR Owen/Proofreader eval.result
// ==='revise'), plus real retry-once-on-block via Owen's own delegate_to_agent call (01d correction —
// see runQaWithQualityGate below; the 01c screen-scripted retry was an architecture regression)
// FEATURE: MI-04 — Pipeline Log, real events only (Intent Routing, Q&A Answer, Proofreader incl. real
// retry hand-off, AI - Hypothesis Test, Memory Consolidation, Data Integrity Patch, Failure Triage, and now
// (S-ARCH-DISPLAY-LOOP-01) Agent Selection + Display Format for Marcus's real Display-agent hand-off)
// FEATURE: MI-13 — Theory Evidence renders via the generic visualization mechanism, not a hardcoded chart
import { useState, useRef, useEffect } from "react";
import { T, display, body, mono } from "../tokens.js";
import { TENANT_ID } from "../config.js";
import { AppShell } from "../AppShell.jsx";
import { Card, Corners, FeatureBadge, AgentAvatar, ConfirmationCard, ChartRenderer, Drawer, useScrollFadeHint, ScrollFadeHint } from "../components/SharedUI.jsx";
import { useAgents, useLearnedContext, useAgentActivitySummary, useDataSources } from "../hooks/useAgents.js";
import { useIsMobile } from "../hooks/useIsMobile.js"; // FEATURE: MI-45
import AIDiamond from "../components/AIDiamond.jsx";
import { PATTERN_CATALOG } from "../hooks/useAIActivity.js"; // FEATURE: AI-50c
// FEATURE: MI-51 — AI_PAT/AiBadge import removed: the qa card's AiBadge(AI_PAT.AGENT_ROUTING) rendering
// (previously shown only on non-flagged answers) is superseded by the universal guided review prompt
// below, which now renders on every qa message regardless of needs_review — no remaining call site.

// FEATURE: CHI-30 — static seed question, always slot 2, never rotates.
const STATIC_QUESTION = { id: "library-catalog", label: "What data is in the library and how can i use it?" };

// FEATURE: CHI-30 — 10-question rotation pool (today's confirmed positions 1, 3-11). On every
// empty-state render, 6 of these fill visible slots 1, 3-7; the other 4 lead the drawer. Order here
// is the "default" order used verbatim (via splitRotation(pool, identity)) before the splash has
// ever been dismissed this tab session.
const ROTATING_POOL = [
  { id: "japan-geo",          label: "Japan is Apple's fastest-growing GEO in 2025 — what is driving that?" },
  { id: "crest-wireless",      label: "What made Crest Wireless's recent upgrade promotion successful, and can we replicate it with other US partners?" },
  { id: "geo-revenue",         label: "How has our GEO revenue trended from 2023 to 2025, and which regions are growing fastest?" },
  { id: "reseller-reqs",       label: "What are the public requirements for a partner to become an Apple Authorized Reseller?" },
  { id: "upgrade-cycles",      label: "How do smartphone upgrade cycles vary by country, and what does that mean for our channel replenishment planning?" },
  { id: "at-risk-accounts",    label: "Across all our channel partners globally, which ones are the biggest at-risk accounts this quarter, and why?" },
  { id: "horizon-store",       label: "Why is Horizon Store in Vietnam so much more ready for our new product introduction than Signal Mobile in Thailand and Indonesia?" },
  { id: "vitrine-tech",        label: "What's the training compliance gap at Vitrine Tech in Brazil, and what's the risk to their certification?" },
  { id: "smartphone-growth",   label: "What is the smartphone growth trajectory in emerging markets, and how should that shape our channel investment?" },
  { id: "coop-mdf-benchmark",  label: "How does our co-op/MDF utilization compare to industry benchmarks?" },
];

// FEATURE: CHI-30 — fixed drawer tail (today's confirmed positions 12-23). Never rotates, never
// reorders — always the last 12 questions in the drawer beneath whichever 4 pool leftovers lead it.
const FIXED_DRAWER_TAIL = [
  { id: "vietnam-reseller",             label: "How is our authorized reseller network performing in Vietnam?" },
  { id: "meridian-electronics",         label: "What's going on with Meridian Electronics' digital shelf compliance issue in France and Italy?" },
  { id: "emea-coop-large-format",       label: "Why is co-op budget utilization so low for our EMEA large-format retail partner this quarter?" },
  { id: "jinhua-digital",               label: "How is Jinhua Digital recovering after its sales decline in Greater China?" },
  { id: "elevate-mobility",             label: "What risks should we watch as Elevate Mobility rapidly expands in India?" },
  { id: "nippo-carrier",                label: "What is Nippo Carrier in Japan doing that makes them our top performer, and how do we scale it to other partners?" },
  { id: "altiplano-movil",              label: "How is the installment plan program performing with Altiplano Móvil in Mexico?" },
  { id: "emea-emerging",                label: "What is our channel strategy outlook for EMEA Emerging markets — India, Middle East, and Africa?" },
  { id: "southeast-asia",               label: "What is our channel strategy outlook for Southeast Asia?" },
  { id: "training-turnover-benchmark",  label: "How does our partner training and turnover rate compare to industry benchmarks?" },
  { id: "latin-america",                label: "What is our channel strategy outlook for Latin America this year?" },
  { id: "south-korea-coop",             label: "What is our co-op utilization rate for our partner in South Korea?" },
];

// FEATURE: CHI-30 — pure, testable split: shuffleFn is injected so both branches (deterministic
// default vs. real rotation) share one code path. arr => arr (identity) produces the default split;
// shuffleArray produces the rotated split.
function splitRotation(pool, shuffleFn) {
  const shuffled = shuffleFn(pool);
  return { picks: shuffled.slice(0, 6), leftover: shuffled.slice(6) };
}

// FEATURE: CHI-30 — Fisher-Yates, pure aside from Math.random.
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ESCALATE_PLACEHOLDER =
  `That reads as an "escalate" request. Escalating for deeper research ships in a future build — ask a direct question, or run a Theory/Forecast/Correct for now.`;

const INTENT_LABEL = { theory: "Theory", forecast: "Forecast", correct: "Correct" };

// FEATURE: AA-130 — Sam's intake-failure-intent schema (traits.schema, confirmed live in Supabase)
// only ever outputs recommend_escalate/suggested_research_request, per the original spec
// (APPLE-AGENT-1-v5-DESIGN.md §5.9) — he was never designed to produce an explanatory string, and
// the prior hardcoded phrase (falsely attributed to Sam, wrongly implying a Data Room gap in the
// live case that surfaced this, AA-130) was fabricated at the frontend layer, not real agent output.
// Owen's guardrail object already carries a real, specific `reason` explaining the actual failure —
// this now surfaces that, correctly attributed to Owen, instead of inventing something on Sam's behalf.
function buildFailureText(guardrail, triage) {
  const base = `Marcus couldn't produce an answer that passed review (${guardrail?.rule_violated || "review failed"}).`;
  const reason = guardrail?.reason ? ` ${guardrail.reason}` : "";
  if (!triage) return `${base}${reason} Try rephrasing the question.`;
  const suggestion = triage.suggested_research_request ? ` Suggested next step: "${triage.suggested_research_request}"` : "";
  return triage.recommend_escalate
    ? `${base}${reason}${suggestion}`
    : `${base}${reason} Try rephrasing the question.`;
}

// FEATURE: LOG-15 — SERVICE_LABEL deleted (was the capability-slug -> human-label dictionary for
// the Agent Routing drawer's now-removed capability badge; confirmed dead, its one call site was
// RoutingActivityLine's `SERVICE_LABEL[capability]` lookup, itself removed this session).

// FEATURE: AI-50c — slug -> human label, built from the same PATTERN_CATALOG useAIActivity.js owns
const PATTERN_NAME = Object.fromEntries(PATTERN_CATALOG.map(p => [p.slug, p.name]));

// FEATURE: AA-125 — shared free-text shaping so every event type that embeds a raw
// model-authored string (reasoning/critique/notes) gets the same "short, readable log
// line" treatment instead of each switch case deciding independently. Prefers the
// first full sentence (reads as real reasoning, not a mid-word chop); falls back to a
// hard character cap only when no sentence boundary exists within range.
function shapeForLog(text, maxLen = 140) {
  const s = (text || "").trim();
  if (!s) return "";
  const firstSentence = s.match(/^[^.!?]*[.!?]/);
  // Guard: a genuine sentence boundary in the free-text agent output this shapes (reasoning,
  // critiques, opinions) is rarely under ~20 chars -- a shorter match is almost always a decimal
  // point or abbreviation (e.g. "14.57%", "U.S.", "e.g.") false-triggering the regex, not a real
  // sentence end. Fall through to hard truncation instead of returning a nonsense short fragment.
  if (firstSentence && firstSentence[0].trim().length >= 20 && firstSentence[0].trim().length <= maxLen) {
    return firstSentence[0].trim();
  }
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen).trim()}…`;
}

// FEATURE: MI-19 — render a per-step Pipeline Log duration the same way everywhere.
function formatDuration(ms) {
  if (ms == null) return "";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

// FEATURE: MI-42 -- mirrors CreateWorkOrderScreen.jsx's own proven reader (res.body.getReader() +
// TextDecoder, data: <json> lines, data: [DONE] sentinel) -- same idiom, not a new one. Buffers a
// trailing partial line across chunk boundaries (chunks don't align to \n\n boundaries). `type:
// 'result'` resolves the promise; `type: 'error'` throws (this is how a streamed request's failure
// surfaces now that the HTTP status is locked at 200 once streaming starts -- see execute.js
// streamResult()); every other type is forwarded to onProgress as a live delegation event.
async function readSSEResult(res, onProgress) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let final;
  let gotResult = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      let evt;
      try { evt = JSON.parse(data); } catch { continue; }
      if (evt.type === 'result') { final = evt.result; gotResult = true; }
      else if (evt.type === 'error') { throw Object.assign(new Error(evt.message), { status: evt.status, detail: evt.detail }); }
      else { onProgress(evt); }
    }
  }
  if (!gotResult) throw new Error('Stream ended without a result event');
  return final;
}

// FEATURE: MI-23 — live elapsed timer for the chat-embedded working-status indicator
// FEATURE: MI-35 — reformatted from "m:ss" (e.g. "1:04") to "Xm Ys"/"Xs" for consistency with the
// new expected-time estimate rendered next to it (formatExpectation, below) — same unit style,
// same font, read as one continuous phrase.
function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// FEATURE: MI-35 — known intent chains per user-facing action that has one. Only chains this
// session can ground in real, already-logged data get an entry — do not invent chains for
// working-status triggers not listed here (patch resolution, memory consolidation, etc.); those
// pass expectation: null and render no estimate, out of scope this session.
const INTENT_CHAINS = {
  qa: [["marcus","ci-routing-intent"], ["marcus","ci-answer-intent"], ["owen","qg-review-intent"], ["marcus","ci-answer-display-intent"]],
  escalate: [["marcus","ci-routing-intent"]],
  hypothesis_generation: [["priya","hyp-generation-intent"]],
  hypothesis_test: [["priya","hyp-hypothesis-test-intent"], ["priya","hyp-hypothesis-test-display-intent"]],
};

// FEATURE: MI-58 — was: sum one blended avgLatency per intent, treating each as a single LLM
// turn. Real data (ai_activity_log's :depthN tag) shows the heaviest intents in this chain loop
// through multiple real turns before returning to the frontend far more often than not (e.g.
// ci-answer-intent reaches depth1 on ~69% of calls) — a single blended average understates the
// true per-call cost. Now: depth0's p75 (the call always pays this) plus each further depth's p75
// weighted by how often that depth is actually reached (relative to depth0's call count) — an
// expected-value-per-call model instead of expected-value-per-turn. Returns null (unchanged
// contract) whenever depth0 has no historical data yet, same "fall back to the generic ceiling"
// behavior as before.
// FEATURE: CHI-10 — reads useAIActivity.js's p90 (was p75, same shared percentile() computation,
// see that file's CHI-10 comment). Tightens the "expect >" floor from ~25%-of-runs-exceed-this to
// ~10%-of-runs-exceed-this. Contract unchanged: returns null whenever depth0 has no historical
// data yet, same fallback-to-generic-ceiling behavior as before.
function estimateChainMs(chain, agentActivity) {
  let total = 0;
  for (const [agentId, kind] of chain) {
    const byDepth = agentActivity?.[agentId]?.byKind?.[kind]?.byDepth;
    const depth0 = byDepth?.depth0;
    if (!depth0?.p90 || !depth0.calls) return null;
    let hopTotal = depth0.p90;
    for (let i = 1; ; i++) {
      const d = byDepth[`depth${i}`];
      if (!d) break;
      hopTotal += d.p90 * (d.calls / depth0.calls);
    }
    total += hopTotal;
  }
  return total;
}

// FEATURE: MI-35 — "expect > Xs" (<60s) or "expect > Xm Ys" (>=60s). Rounds up to the nearest
// 5s so the floor framing ("greater than") stays honest against small variance in the historical
// average it's built from. FEATURE: MI-47 — label renamed from "expect" to "question".
// FEATURE: MI-49 — reverted back to "expect": now that this renders on its own line directly under
// the user's question bubble, it reads unambiguously without needing to distinguish itself from the
// per-agent timer on the same line (that need no longer exists post-MI-49's two-line layout).
function formatExpectation(ms) {
  const roundedSec = Math.ceil(ms / 1000 / 5) * 5;
  const m = Math.floor(roundedSec / 60);
  const s = roundedSec % 60;
  return m > 0 ? `expect > ${m}m ${s}s` : `expect > ${s}s`;
}

// FEATURE: CHI-04 — caption for the question-boundary divider (QuestionDivider, below).
function formatClockTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// FEATURE: MI-23 — replaces the header's global AI status dot for this screen; one line, swaps
// message + resets its timer each time control passes to a new agent (only one agent ever runs
// at a time on this platform today, confirmed no concurrent dispatch anywhere in this file or the
// execute.js harness loop — see kickoff CONTEXT). Keyed by startedAt at the call site (not here)
// so React fully remounts this component on every new turn instead of trying to reset internal
// tick state — the simplest correct way to guarantee the timer starts at 0:00 every time.
// FEATURE: MI-49 — two-line layout (John's live review of MI-47's shipped one-line layout): line 1
// is the total elapsed + estimate on its own row, no diamond; line 2 is the diamond + activity
// message + bare per-agent time (drops the old "(...this Agent)" parenthetical, no label — line 1
// already carries the explicit "elapsed"/"expect" labels).
function AgentWorkingIndicator({ message, startedAt, turnStartedAt, expectation }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:12,position:"relative"}}>
      <FeatureBadge id="MI-47"/>
      <FeatureBadge id="MI-49"/>
      <span style={{fontFamily:mono,fontSize:10,color:T.brassDeep}}>
        elapsed {formatElapsed(now - turnStartedAt)}{expectation ? ` | ${expectation}` : ""}
      </span>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <AIDiamond size="7px" color={T.brass}/>
        <span style={{fontFamily:mono,fontSize:11,color:T.muted,fontStyle:"italic",fontWeight:400}}>{message}</span>
        <span style={{fontFamily:mono,fontSize:10,color:T.brassDeep}}>{formatElapsed(now - startedAt)}</span>
      </div>
    </div>
  );
}

// FEATURE: MI-15 — shared display-label mapping for the raw data_type (the_library rows) /
// confidence_tier (Q&A answers) vocabulary. Display-layer relabel only — the stored enum strings
// (sourced/inferred/synthesized/learned/na) are unchanged everywhere else (DB, all 7 live Skill
// Profile schemas). Locked mapping: STYLE-GUIDE.md Section 19 — do not re-litigate without
// re-reading it. whoTag only ever applies to the "Analysis" label, sourced from the_library.source
// (user->"Human", agent->"AI"); a confidence_tier context has no source column, so it's implicitly
// AI but still renders no who-tag (per the locked table, only the_library rows carry a source col).
function describeDataType(dataType, { isBaseline, source } = {}) {
  const whoTag = source === 'user' ? "Human" : source === 'agent' ? "AI" : null;

  switch (dataType) {
    case 'sourced':
      return { label: "Sourced", color: T.moss, whoTag: null };
    case 'inferred':
      return { label: "Analysis", color: T.brass, whoTag };
    case 'synthesized':
      return isBaseline
        ? { label: "Source Simulation", color: T.mutedDeep, whoTag: null }
        : { label: "Analysis", color: T.brass, whoTag };
    case 'learned':
      return { label: "Learned", color: T.navyMid, whoTag: null };
    default:
      return { label: "—", color: T.muted, whoTag: null };
  }
}

// FEATURE: MI-22 — category→label lookup for the Simulation sub-grouping. Genuinely new/minimal;
// reuses the existing category-badge text style (mono, uppercase, T.muted) already used for
// row.category below rather than inventing a new visual. Not a duplicate of describeDataType()'s
// data_type→label mapping — this maps the_library.category, a different column entirely.
const SIMULATION_CATEGORY_LABELS = { geo_briefing: "GEO", partner_scenario: "Partner" };

// FEATURE: MI-22 — pure grouping helper for the Data Sources / Analysis drawers. Buckets the raw
// dataSources rows into Sourced (pinned top) / Simulation (sub-grouped by category, first-seen
// key order, no pre-seeded categories) / Analysis. Calls describeDataType() exactly once per row
// (Category M — single source of truth for the data_type→label mapping) and carries the result
// forward on each row as `_display`, so no render path below ever needs to re-derive it. Rows
// keep the hook's existing arrival order within each bucket (already title-sorted).
function groupDataSources(rows) {
  const sourced = [];
  const simulationByCategory = {};
  const analysis = [];
  for (const row of rows) {
    const display = describeDataType(row.data_type, { isBaseline: row.is_baseline, source: row.source });
    const decorated = { ...row, _display: display };
    if (display.label === "Sourced") {
      sourced.push(decorated);
    } else if (display.label === "Source Simulation") {
      const key = row.category;
      if (!simulationByCategory[key]) simulationByCategory[key] = [];
      simulationByCategory[key].push(decorated);
    } else if (display.label === "Analysis") {
      analysis.push(decorated);
    }
  }
  return { sourced, simulationByCategory, analysis };
}

// FEATURE: MI-63 -- buckets a flat key_data_points array into Actual (Sourced/Source Simulation)
// vs Theorized (Analysis) groups, reusing describeDataType() (STYLE-GUIDE.md §19) -- no new
// taxonomy. Mirrors groupDataSources()'s existing bucket-by-describeDataType() pattern exactly
// (Category M -- one mapping, one call site per row).
function groupKeyDataPoints(points) {
  const actual = [];
  const theorized = [];
  for (const p of (points || [])) {
    const display = describeDataType(p.data_type, { isBaseline: p.is_baseline });
    const decorated = { ...p, _display: display };
    (display.label === "Sourced" || display.label === "Source Simulation" ? actual : theorized).push(decorated);
  }
  return { actual, theorized };
}

// FEATURE: MI-63 -- Title/Amount adjacent columns (John's explicit layout ask) so Amount scans
// top-to-bottom at a glance; Type badge reuses describeDataType()'s existing color/label exactly.
function ActualDataPointsTable({ rows }) {
  if (!rows.length) return null;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Actual Data Points from the Library</div>
      <table style={{width:"100%",borderCollapse:"collapse",fontFamily:body,fontSize:11}}>
        <thead>
          <tr style={{borderBottom:`1px solid ${T.lineSoft}`}}>
            <th style={{textAlign:"left",padding:"3px 6px 3px 0",color:T.muted,fontWeight:500,fontSize:9.5}}>Title</th>
            <th style={{textAlign:"right",padding:"3px 6px",color:T.muted,fontWeight:500,fontSize:9.5}}>Amount</th>
            <th style={{textAlign:"left",padding:"3px 6px",color:T.muted,fontWeight:500,fontSize:9.5}}>Data source</th>
            <th style={{textAlign:"left",padding:"3px 0 3px 6px",color:T.muted,fontWeight:500,fontSize:9.5}}>Type</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d, i) => (
            <tr key={i} style={i < rows.length - 1 ? {borderBottom:`1px solid ${T.lineSoft}`} : undefined}>
              <td style={{padding:"5px 6px 5px 0",color:T.ink}}>{d.label}</td>
              <td style={{padding:"5px 6px",textAlign:"right",fontFamily:mono,color:T.ink}}>{d.value}</td>
              <td style={{padding:"5px 6px",color:T.muted}}>{d.source}</td>
              <td style={{padding:"5px 0 5px 6px"}}>
                <span style={{background:d._display.color,color:T.card,padding:"1px 7px",borderRadius:3,fontSize:9.5,fontFamily:mono}}>{d._display.label}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// FEATURE: MI-63 -- Section column presence is derived from the data itself (some rows carry
// reasoned_from_section, some don't) -- never a capability_slug/msg.kind check. qa-answer-format
// never sets this field, so a Q&A card's Theorized table renders 3 columns automatically, no
// special-case branch needed.
function TheorizedDataPointsTable({ rows }) {
  if (!rows.length) return null;
  const showSection = rows.some(r => r.reasoned_from_section);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Theorized Data Points from Analysis</div>
      <table style={{width:"100%",borderCollapse:"collapse",fontFamily:body,fontSize:11}}>
        <thead>
          <tr style={{borderBottom:`1px solid ${T.lineSoft}`}}>
            <th style={{textAlign:"left",padding:"3px 6px 3px 0",color:T.muted,fontWeight:500,fontSize:9.5}}>Title</th>
            <th style={{textAlign:"right",padding:"3px 6px",color:T.muted,fontWeight:500,fontSize:9.5}}>Amount</th>
            <th style={{textAlign:"left",padding:"3px 6px",color:T.muted,fontWeight:500,fontSize:9.5}}>Reasoned from</th>
            {showSection && <th style={{textAlign:"left",padding:"3px 0 3px 6px",color:T.muted,fontWeight:500,fontSize:9.5}}>Section</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((d, i) => (
            <tr key={i} style={i < rows.length - 1 ? {borderBottom:`1px solid ${T.lineSoft}`} : undefined}>
              <td style={{padding:"5px 6px 5px 0",color:T.ink}}>{d.label}</td>
              <td style={{padding:"5px 6px",textAlign:"right",fontFamily:mono,color:T.ink}}>{d.value}</td>
              <td style={{padding:"5px 6px",color:T.muted}}>{d.source}</td>
              {showSection && <td style={{padding:"5px 0 5px 6px",textTransform:"capitalize",color:T.muted}}>{d.reasoned_from_section}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// FEATURE: MI-04 — real event summaries, driven entirely by actual call responses (evt.data),
// never scripted text. Color: T.moss = pass/clean, T.brass = flagged/revise, T.flag = blocked.
// FEATURE: MI-68 — every case rewritten to describe the activity being performed ("what is the
// agent accomplishing"), not the outcome content (answer text, confidence tier, eval detail,
// version notes) or raw field names (confidence_tier, self-flag). Real per-event data (reasoning,
// error message, patterns_used) still flows through unchanged where it was already load-bearing
// (agent_selection, error) — only the surrounding label text and the cases that used to surface
// secondary result detail (proofreader retry/critique, failure_triage recommendation text,
// patch_proposed version_note) are simplified to match every other case's activity-only style.
// Event-type dispatch (which case fires) is unchanged — still one hardcoded string per call site,
// assigned by the frontend immediately after each callCapability() call, never agent-reported.
// FEATURE: LOG-15 — capability field removed from every case's return object (John's hard rule,
// 2026-07-17: no capability may ever display in the Agent Routing drawer). Same 12 cases, same
// summary text, same colors — only the capability attribution is dropped.
function describePipelineEvent(evt) {
  switch (evt.type) {
    case "intent_routing":
      return { summary: "Reading the question, deciding how to route it", color: T.navyMid };
    case "qa_answer":
      return { summary: "Reviewing found data, putting together an answer", color: evt.data.needs_review ? T.brass : T.moss };
    case "proofreader": {
      const g = evt.data.guardrail || {}, e = evt.data.eval || {};
      if (g.result === "block") {
        return { summary: "Blocking this answer — a policy issue was found", color: T.flag };
      }
      // FEATURE: CHI-02 — was shapeForLog(e.critique); truncation moved entirely to the render
      // layer (RoutingActivityLine) so the full text is never discarded here.
      const revised = e.result === "revise" ? ` — asked for a revision: ${e.critique}` : "";
      return { summary: `Reviewing the answer for accuracy and policy issues${revised}`, color: e.result === "revise" ? T.brass : T.moss };
    }
    case "failure_triage":
      // FEATURE: CHI-02 — was shapeForLog(evt.data.suggested_research_request); truncation moved
      // entirely to the render layer (RoutingActivityLine) so the full text is never discarded here.
      return { summary: evt.data.recommend_escalate ? `Deciding whether more research would help — recommends: ${evt.data.suggested_research_request}` : "Deciding whether more research would help — more research wouldn't help here", color: T.brass };
    case "hypothesis_test":
      return { summary: "Validating selected theory, reviewing for challenges", color: T.moss };
    case "memory_consolidation":
      return { summary: evt.data.action === "consolidate" ? "Saving a new insight for future use" : "Reviewing for a reusable insight — none found", color: evt.data.action === "consolidate" ? T.moss : T.muted };
    case "patch_proposed": {
      // FEATURE: CHI-02 — was shapeForLog(evt.data.proposed_action.version_note); truncation moved
      // entirely to the render layer (RoutingActivityLine) so the full text is never discarded here.
      const note = evt.data.proposed_action?.version_note ? ` — ${evt.data.proposed_action.version_note}` : "";
      return { summary: `Drafting a proposed correction to the data${note}`, color: T.brass };
    }
    case "patch_resolved":
      return { summary: evt.data.resolution === "accept" ? "Saving new found data" : evt.data.resolution === "reject" ? "Discarding the proposed correction" : "Saving an edited correction", color: evt.data.resolution === "accept" ? T.moss : T.muted };
    // FEATURE: S-ARCH-DISPLAY-LOOP-01 — the two connected hand-off entries proving the real
    // request_help -> Michelle -> delegate_to_agent(is_final:true) round trip: Marcus asking for
    // help (Michelle's own reasoning field, never a placeholder), then Michelle's pick handing off
    // to the chosen Display agent.
    case "agent_selection":
      // FEATURE: CHI-02 — was shapeForLog(evt.data.reasoning); truncation moved entirely to the
      // render layer (RoutingActivityLine) so the full text is never discarded here.
      return { summary: `Deciding who should handle this next — ${evt.data.reasoning}`, color: T.moss };
    case "display_format":
      return { summary: "Formatting data for display", color: T.moss };
    // FEATURE: MI-23 — Priya's hyp-generation-intent turn, previously unlogged anywhere on this screen.
    case "hypothesis_generation":
      return { summary: "Reviewing found data, putting together a theory", color: T.moss };
    // FEATURE: MI-29 -- surfaces the real caught error (e.message) in the existing Pipeline Log
    // instead of it only ever reaching a devtools-only console.error. Reuses T.flag, the same
    // alert color already used for guardrail "block" results above -- no new color introduced.
    case "error":
      return { summary: `Ran into a problem partway through — ${evt.data.message}`, color: T.flag };
    // FEATURE: MI-47 -- permanent drawer rows for every live handoff shown in the chat status line
    // (onDelegationProgress), alongside the pre-existing coarse checkpoint events above.
    // FEATURE: LOG-15 — capability: null left untouched on these 2 cases (never removed like the
    // other 12), per this session's own SCOPE RULES: "Do NOT touch delegation/delegation_return
    // event handling — LOG-23/LOG-26, separate session." Inert either way (SERVICE_LABEL[null] was
    // always undefined, RoutingActivityLine no longer destructures capability at all) — kept
    // exactly as-is so this session's diff on these 2 lines is genuinely zero, not just behaviorally
    // equivalent.
    case "delegation":
      return { capability: null, summary: evt.data.message, color: T.navyMid };
    case "delegation_return":
      return { capability: null, summary: evt.data.message, color: T.moss };
    default:
      return { summary: "", color: T.muted };
  }
}

// FEATURE: CHI-01 — groups consecutive same-agent events into "hops" (one card per real
// hand-off), replacing the flat per-event list S-MI-68-design's sameAgentAsPrevious only
// partially addressed (it suppressed the repeated header but each event was still its own
// bordered row). A hop boundary is only a genuine agentId change; consecutive same-agent
// events collapse into one hop with multiple activity lines. Hop numbers count hops, not
// raw events (John's explicit call, 2026-07-16: "a new line should mean a hand-off happened,
// not an activity"). `ordered` is newest-first (existing convention, unchanged) — hop
// numbering stays oldest=1 ascending, same direction today's per-event numbering already used.
// FEATURE: CHI-03c — renamed from groupEventsIntoTurns()/turnNumber; "turn" already means a
// user+assistant conversation exchange in AI/chat systems, distinct from what this counts (one
// internal agent-to-agent delegation). "Hop" is the term ARCHITECTURE.md/durable_hops already use.
// FEATURE: CHI-04 — a `question_boundary` marker event always starts its own entry (never merges
// into an adjacent hop regardless of agentId) and is excluded from hop numbering below — it's a
// visual divider (QuestionDivider, rendered by AuditColumn), not a real agent hop.
function groupEventsIntoHops(ordered) {
  const hops = [];
  for (const evt of ordered) {
    const last = hops[hops.length - 1];
    if (evt.type === "question_boundary") {
      hops.push({ agentId: evt.agentId, events: [evt], isBoundary: true });
      continue;
    }
    if (last && !last.isBoundary && last.agentId === evt.agentId) {
      last.events.push(evt);
    } else {
      hops.push({ agentId: evt.agentId, events: [evt] });
    }
  }
  const total = hops.filter(h => !h.isBoundary).length;
  let seen = 0;
  return hops.map(h => {
    if (h.isBoundary) return h;
    seen += 1;
    // FEATURE: CHI-27 — reverts CHI-09's chronological within-hop reversal (John's direct call,
    // 2026-07-18, live UX walkthrough): the panel's hop-to-hop order is newest-first, and having a
    // hop's own activity lines read the opposite direction (oldest-first) was confusing to read even
    // though CHI-09's order was chronologically correct. h.events keeps the same newest-first order
    // `ordered` already established (each new same-agent event is pushed onto the end during
    // accumulation above, so index 0 is the newest event in the hop, the last index is the oldest) —
    // matching the rest of the panel's reading direction.
    return { ...h, hopNumber: total - (seen - 1) };
  });
}

// FEATURE: CHI-03c — snapshot the current hop count so a caller can compute the range of hops
// its own operation produced, once that operation's onEvent/logEvent calls are done. Excludes
// CHI-04's question_boundary markers, same as groupEventsIntoHops()'s own hopNumber count above —
// a boundary marker is a visual divider, never a real hop.
function currentHopCount(ordered) {
  return groupEventsIntoHops(ordered).filter(h => !h.isBoundary).length;
}

// FEATURE: CHI-03c — badge copy: "Hop N" when the range collapses to one, else "Hops N–M".
function hopBadgeText(hopStart, hopEnd) {
  return hopStart === hopEnd ? `Hop ${hopStart}` : `Hops ${hopStart}–${hopEnd}`;
}

// FEATURE: CHI-07 — single declared list of event types with no independently-measurable
// client-side duration: each one either shares its round trip with an adjacent real-duration
// event (agent_selection, failure_triage — both fire alongside qa_answer/proofreader/display_format,
// which already log the real number), or is an in-flight/marker signal with no completed duration
// to measure (delegation, delegation_return, question_boundary). Declared once here instead of a
// justifying comment repeated at every call site.
const NON_MEASURABLE_EVENT_TYPES = new Set([
  "agent_selection", "delegation", "delegation_return", "failure_triage", "question_boundary",
]);

// FEATURE: CHI-07 — every logEvent/onEvent call routes through this instead of hand-writing the
// event object. Resolves durationMs once: a caller-supplied real value passes through unchanged;
// an omitted value resolves to null for a declared non-measurable type; an omitted value on any
// other type is a caller bug (a real Date.now()-turnStart was forgotten) — logged via
// console.error, never thrown (never block the user over a logging gap), and still resolves to
// null so the UI degrades the same way a legitimate non-measurable event already does.
function buildHopEvent(type, agentId, data, durationMs, extra = {}) {
  let resolved = durationMs;
  if (resolved == null) {
    if (!NON_MEASURABLE_EVENT_TYPES.has(type)) {
      console.error(`FEATURE: CHI-07 — event type "${type}" logged with no durationMs and is not declared non-measurable; pass a real Date.now()-turnStart value, or add "${type}" to NON_MEASURABLE_EVENT_TYPES if this is intentional.`);
    }
    resolved = null;
  }
  return { type, agentId, data, durationMs: resolved, ...extra };
}

// FEATURE: CHI-07 — every setMessages(...) push routes through this instead of a hand-written
// object literal. Whenever hopStart is present, totalElapsedMs is a required companion, not a
// field a caller can silently omit — 7 of this file's 17 setMessages call sites carried
// hopStart/hopEnd but never totalElapsedMs before this fix (submission/info-only/resolution ack
// bubbles). Sites that never carried hop data before this session still don't — this helper
// enforces the pairing, it does not invent hop data for messages that never had it.
function buildMessage({ role = "assistant", kind, text, hopStart, hopEnd, totalElapsedMs, needsReview, reviewReason }) {
  const msg = { role, text };
  if (kind != null) msg.kind = kind;
  if (hopStart != null) {
    if (totalElapsedMs == null) {
      console.error(`FEATURE: CHI-07 — message (role="${role}", kind="${kind}") has hopStart/hopEnd but no totalElapsedMs; caller must pass Date.now()-turnStart.`);
    }
    msg.hopStart = hopStart;
    msg.hopEnd = hopEnd;
    msg.totalElapsedMs = totalElapsedMs ?? null;
  }
  if (needsReview) {
    msg.needs_review = true;
    msg.review_reason = reviewReason || "flagged for review";
  }
  return msg;
}

// FEATURE: CHI-03c — small mono-font cross-reference chip citing the Agent Routing hop range that
// produced whatever card/message it's attached to. `accent` reuses the caller's own existing
// borderLeft accent color (no new color introduced). Renders nothing if hopStart/hopEnd are absent
// (older messages predating this feature, or an operation that didn't wire the capture through).
function HopBadge({ hopStart, hopEnd, accent }) {
  if (hopStart == null || hopEnd == null) return null;
  return (
    <span style={{fontFamily:mono,fontSize:9,color:accent,border:`1px solid ${accent}`,borderRadius:2,padding:"1px 5px",letterSpacing:"0.02em"}}>
      {hopBadgeText(hopStart, hopEnd)}
    </span>
  );
}

// FEATURE: CHI-21 — single source for the combined hop+elapsed wrap-up line, replacing the
// previously-stacked HopBadge (own line) + elapsed-time caption (own line) at both chat-bubble
// render sites. hopEnd is the cumulative SESSION hop total at the moment this message finished
// (hop numbering never resets within a session — CHI-03c), not this answer's own
// hopStart..hopEnd span — confirmed with John this session: "the answer may have taken 4 hops
// to create, but the full agent routing took 9 hops," so the total stated here must match
// Column 3's running count, not a per-answer span. A later message's own hopEnd will be higher;
// this line is a fixed snapshot of the total as of when THIS message finished, not a live value.
function formatHopSummary(hopEnd, totalElapsedMs) {
  if (hopEnd == null || totalElapsedMs == null) return null;
  const hopWord = hopEnd === 1 ? "hop" : "hops";
  return `Full Agent Routing & Answer in ${hopEnd} ${hopWord} total, ${formatElapsed(totalElapsedMs)}`;
}

// FEATURE: CHI-21 — replaces the two previously-stacked <div>s (HopBadge alone, elapsed-time
// caption alone) with one row: badge on the left, enriched summary sentence to its right. Used
// at both MessageBubble render sites (qa branch, default branch) — was duplicated JSX before
// this extraction (Architect Review: duplicate-functionality check).
function HopSummaryLine({ hopStart, hopEnd, totalElapsedMs, accent }) {
  if (hopStart == null || hopEnd == null) return null;
  const summary = formatHopSummary(hopEnd, totalElapsedMs);
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4,flexWrap:"wrap"}}>
      <HopBadge hopStart={hopStart} hopEnd={hopEnd} accent={accent}/>
      {summary && (
        <span style={{fontFamily:mono,fontSize:9.5,color:T.muted}}>{summary}</span>
      )}
    </div>
  );
}

// FEATURE: MI-52 — shared module-scope "first name only" resolver. Previously a local const
// duplicated inside describeDelegationEvent (MI-49); RoutingEventRow now needs the identical
// behavior (Task 1: drawer row headers switch from full name to first-name-only, matching the
// chat status line), so this is the one implementation both call, not a second copy.
function firstNameFor(id, agentById) {
  return (agentById(id)?.name || id).split(" ")[0];
}

// FEATURE: MI-42 -- generic across every agent pair, no hardcoded names or capability-specific
// branches (matches ARCHITECTURE.md §19d's own anti-hardcoding discipline) -- copy is derived
// entirely from the event's own fromAgentId/toAgentId, resolved against the real roster.
// FEATURE: MI-52 -- was MI-49's first-name-only treatment, scoped to this function only with the
// Agent Routing drawer's own row headers explicitly out of scope (still full names). MI-52 reverses
// that scope note per John's direct instruction this session: RoutingEventRow now also renders
// first name only (see below), via the same firstNameFor() helper this function calls.
function describeDelegationEvent(evt, agents) {
  const agentById = (id) => agents.find(a => a.id === id);
  const fromName = firstNameFor(evt.fromAgentId, agentById);
  const toName = firstNameFor(evt.toAgentId, agentById);
  if (evt.type === 'delegation_return') {
    return `${fromName} is back — wrapping up…`; // FEATURE: MI-48 -- was toName (named who control
    // returns TO, not who was actually away and is now done) -- confirmed against the real live SSE
    // payload: fromAgentId is the sub-agent who was helping, toAgentId is who receives control back.
  }
  switch (evt.viaTool) {
    case 'request_help':
      return `${fromName} is asking ${toName} who should help…`;
    case 'critique':
      return `${toName} is reviewing ${fromName}'s proposal…`;
    case 'delegate_to_agent':
    default:
      return `${fromName} is routing this to ${toName}…`;
  }
}

// FEATURE: MI-02 — generalized to accept any capability/agent/task_context (was hardcoded to
// channel-intelligence/marcus/{goal:message}) — same contract execute.js already exposes, now
// used by Marcus's channel-intelligence calls, Priya's hypothesis-evaluation calls, Owen's
// quality-gate calls, and (MI-01d) Elena's memory-consolidation / Nadia's data-analysis calls.
// FEATURE: MI-01d — a capability whose Skill Profile sets requires_human_confirmation: true
// (Nadia's data-patch-intent) short-circuits execute.js's normal terminal dispatch and returns
// a flat { status:'pending_confirmation', confirmation_id, proposed_action, critique, ... } object
// with no `.content` wrapper (api/capabilities/execute.js runCapability(), the pending_confirmation
// branch) — found live this session, first UI caller of that branch anywhere. Unwrapping `.content`
// unconditionally (the pre-01d behavior) would silently discard confirmation_id/proposed_action/
// critique and hand the screen an empty object. Any response carrying a top-level `status` field
// is one of execute.js's own flat early-return shapes (pending_confirmation, depth_exceeded) and
// is returned as-is; only the ordinary terminal-dispatch shape is unwrapped from `.content`.
const MAX_CONTINUE_ITERATIONS = 10; // client-side safety cap -- generous headroom over a real
// chain's expected hop count (harness's own MAX_LOOP_DEPTH is 5), guards against an unbounded
// client loop if something's genuinely wrong server-side rather than duplicating that ceiling.

// FEATURE: AA-139 (S-ARCH-DURABLE-LOOP-02b) -- a chain that risked the shared 60s Vercel ceiling
// checkpoints server-side (S-ARCH-DURABLE-LOOP-02a) instead of dying silently, returning
// {status:'in_progress', job_id} instead of a terminal result. This continues it until a terminal
// status, so every existing caller keeps its current contract unchanged -- none of them ever need
// to know a checkpoint happened. Shared by callCapability() and resolveConfirmation() -- one
// implementation, not two copies of the same loop.
// FEATURE: CHI-04 — isStale is a zero-arg cancellation predicate (default () => false for callers
// that don't care), checked before firing the next continuation fetch. When true, bails out
// immediately with whatever result is on hand rather than continuing a chain the caller has already
// abandoned (Clear fired mid-way) — see clearGenerationRef, below.
async function resolveInProgress(result, onProgress = null, isStale = () => false) {
  let iterations = 0;
  while (result.status === "in_progress") {
    if (isStale()) return result; // FEATURE: CHI-04 — Clear fired mid-chain; caller already bails on this via its own isStale() check
    if (++iterations > MAX_CONTINUE_ITERATIONS) {
      throw new Error(`Chain did not complete after ${MAX_CONTINUE_ITERATIONS} continuations (job_id: ${result.job_id})`);
    }
    const res = await fetch("/api/capabilities/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "continue", job_id: result.job_id, stream: !!onProgress }),
    });
    if (!res.ok) throw new Error(`continue (job_id: ${result.job_id}) failed: ${res.status}`);
    result = onProgress ? await readSSEResult(res, onProgress) : await res.json();
  }
  return result;
}

async function callCapability({ capability_slug, intent_slug, agent_id, task_context, runtime_context = null, format_skill_profile_slug = null, display_agent_id = null, onProgress = null, isStale = () => false }) {
  const res = await fetch("/api/capabilities/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      capability_slug, intent_slug, agent_id, task_context, runtime_context,
      format_skill_profile_slug, display_agent_id,
      tenant_id: TENANT_ID,
      stream: !!onProgress,
    }),
  });
  if (!res.ok) throw new Error(`${capability_slug} ${intent_slug} failed: ${res.status}`);
  const first = onProgress ? await readSSEResult(res, onProgress) : await res.json();
  const result = await resolveInProgress(first, onProgress, isStale); // FEATURE: CHI-04
  if (result.status) return result;
  // FEATURE: MI-67 — patterns_used was a real, already-computed sibling field on `result` that
  // this unwrap discarded; every event built from this return needs it for an accurate Agent
  // Routing log.
  return { ...(result.content || {}), patterns_used: result.patterns_used || [] };
}

// FEATURE: MI-01d — resolve a pending_confirmation (accept/reject/edit). Generic across any
// capability — the confirmation_id already encodes which capability/agent/intent it belongs to.
// FEATURE: MI-42 — gains the identical onProgress/stream treatment for consistency (Nadia's
// confirmation-resolve path); no live call site opts in this session (see Task 3g), future-proofing.
async function resolveConfirmation({ confirmation_id, resolution, edited_task_context = null, onProgress = null, isStale = () => false }) {
  const res = await fetch("/api/capabilities/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "resolve", confirmation_id, resolution, edited_task_context, stream: !!onProgress }),
  });
  if (!res.ok) throw new Error(`resolve ${resolution} failed: ${res.status}`);
  const first = onProgress ? await readSSEResult(res, onProgress) : await res.json();
  return resolveInProgress(first, onProgress, isStale); // FEATURE: CHI-04
}

// FEATURE: MI-01d — Owen's own delegate_to_agent call replaces the screen-scripted retry
// (AI-39, S-MARKET-INTEL-01c) that bypassed the mechanism AA-82/S-ARCH-AGENT-LOOP-03 specifically
// built for this exact live-caller case. Orchestrator-workers pattern (Anthropic, "Building
// Effective Agents"): Owen decides whether a block is worth one retry and calls Marcus himself;
// his own final output (final_answer) carries the delegated result forward, since nothing outside
// his own tool-call loop is visible to this caller otherwise -- same shape Nadia's
// data-patch-execute-intent already uses for her promote action's Eleanor delegation (S-APPLE-04b).
// FEATURE: CHI-23 — hop numbers are no longer computed inside this function; the outer call site
// now reads the gold currentHopCount() directly, before the turn starts and after every one of the
// turn's events (including any the caller logs after this function returns) has posted.
async function runQaWithQualityGate(message, conversationContext, onEvent, setStatus, onProgress, isStale = () => false) {
  let t0 = Date.now();
  const qa = await callCapability({
    capability_slug: "channel-intelligence", intent_slug: "ci-answer-intent", agent_id: "marcus",
    task_context: { goal: message }, runtime_context: conversationContext, onProgress, isStale,
  });
  if (isStale()) return qa; // FEATURE: CHI-04 — stop before Owen's quality-gate hop
  onEvent(buildHopEvent("qa_answer", "marcus", qa, Date.now() - t0));
  // FEATURE: AA-164 -- surfaces an internal request_help hop Marcus's own ci-answer-intent turn
  // took (e.g. delegating to Eleanor Voss for a catalog question, AA-162) using the exact same
  // generic Pipeline Log case already rendering Michelle's Display-agent hand-off below (same
  // shape, same execute.js code path -- not a new event type).
  if (qa.last_help_selection) {
    // FEATURE: MI-52 -- agentId re-pointed to the picker (Michelle) whose own reasoning is the row's
    // summary text, not the requester (Marcus) -- secondaryAgentId dropped, RoutingEventRow no longer
    // renders a second agent. durationMs: null (was a fabricated 0) -- not separately measurable from
    // the client, this hop shares its one real round trip with qa_answer above.
    onEvent(buildHopEvent("agent_selection", qa.last_help_selection.selected_by_agent_id, qa.last_help_selection));
  }

  t0 = Date.now();
  setStatus("Owen is reviewing…"); // FEATURE: MI-42 (was MI-41) -- macro-hop swap, was invisible before
  const gate = await callCapability({
    capability_slug: "quality-gate", intent_slug: "qg-review-intent", agent_id: "owen",
    task_context: {
      question: message, candidate_answer: qa.answer, confidence_tier: qa.confidence_tier, citations: qa.citations,
      agent_id: "marcus", capability_slug: "channel-intelligence", intent_slug: "ci-answer-intent",
    },
    onProgress, isStale,
  });
  if (isStale()) return gate; // FEATURE: CHI-04 — stop before the display hand-off hop
  const retried = !!gate.final_answer;
  // FEATURE: MI-52 -- secondaryAgentId dropped; the retry is already named in this row's own summary
  // text (describePipelineEvent's "proofreader" case: " (Owen retried via Marcus)"), no info loss.
  onEvent(buildHopEvent("proofreader", "owen", gate, Date.now() - t0));

  if (gate.guardrail?.result === "block") {
    // FEATURE: AA-171 fix (S-ARCH-QG-ESCALATION-01) -- Owen's own qg-review-intent turn now
    // performs the escalation hand-off itself (request_help -> Michelle's real recommendation ->
    // delegate_to_agent, non-final) when a block isn't fixable by his own retry. This screen no
    // longer inspects gate.guardrail and picks the next call on Owen's behalf -- that was the
    // AA-171 Rule #1 violation ARCHITECTURE.md §19d exists to prevent. gate.triage carries
    // whatever the real delegate returned, copied verbatim by Owen; gate.last_help_selection
    // carries Michelle's own real reasoning for the pick, surfaced the same way AA-164 already
    // surfaces Marcus's own request_help hop above (qa.last_help_selection).
    if (gate.last_help_selection) {
      // FEATURE: MI-52 -- same re-pointing as the request_help hop above: agentId is the picker
      // (Michelle), not the requester (Owen); secondaryAgentId dropped; durationMs: null (was a
      // fabricated 0) -- not separately measurable from the client.
      onEvent(buildHopEvent("agent_selection", gate.last_help_selection.selected_by_agent_id, gate.last_help_selection));
    }
    // FEATURE: LOG-15 — gate.triage never carried patterns_used; the real value lives one level up
    // on gate itself (the shared callCapability() wrapper's top-level field), not nested inside
    // gate.triage. Hoisted explicitly so failure_triage's pattern line shows real data.
    onEvent(buildHopEvent("failure_triage", gate.last_help_selection?.selected_by_agent_id || "owen", { ...gate.triage, patterns_used: gate.patterns_used || [] }));
    return { kind: "qa_failed", text: buildFailureText(gate.guardrail, gate.triage) };
  }

  const finalAnswer = retried ? gate.final_answer : qa;
  const needs_review = !!qa.needs_review || gate.eval?.result === "revise";
  const review_reason = qa.needs_review ? qa.review_reason : (gate.eval?.result === "revise" ? gate.eval.critique : null);

  // FEATURE: S-ARCH-DISPLAY-LOOP-01 — real Display-agent hand-off (AA-101/AA-114/AA-115), proven
  // here via Marcus's Q&A path: request_help -> Michelle (agent-selection-intent) ->
  // delegate_to_agent(is_final:true) -> whichever Display agent she ranked highest. Runs after the
  // Proofreader gate/retry sequence resolves, on finalAnswer (whichever of qa/gate.final_answer
  // won) — Owen's own evaluation semantics above are completely unchanged by this step.
  t0 = Date.now();
  setStatus("Marcus is preparing the response…"); // FEATURE: MI-42 (was MI-41)
  const display = await callCapability({
    capability_slug: "channel-intelligence", intent_slug: "ci-answer-display-intent", agent_id: "marcus",
    task_context: { answer: finalAnswer.answer, citations: finalAnswer.citations, confidence_tier: finalAnswer.confidence_tier, needs_review, review_reason },
    onProgress, isStale,
  });
  if (isStale()) return display; // FEATURE: CHI-04
  // FEATURE: MI-52 -- agent_selection (the picker's reasoning) and display_format (the formatter's
  // completion) describe two sub-phases of one un-separable server round trip -- one callCapability()
  // call, one client-observable elapsed time. agent_selection's agentId is now the picker (Michelle),
  // not the requester (Marcus); durationMs: null there (not a fabricated duplicate of the real
  // number below). display_format's agentId is now the actual formatter (display.display_agent_id),
  // not the picker with a requester fallback; it keeps the one real, actually-measured durationMs.
  // secondaryAgentId dropped from both -- RoutingEventRow no longer renders a second agent.
  if (display.selection) {
    onEvent(buildHopEvent("agent_selection", display.selection.selected_by_agent_id, display.selection));
  }
  onEvent(buildHopEvent("display_format", display.display_agent_id, display, Date.now() - t0));

  // FEATURE: AA-137 — callCapability() returns a raw string when the display/format hand-off
  // declines its tool call and responds with plain text instead (e.g. it recognizes a real problem
  // with the answer it was asked to format). Every field below would read undefined off a string,
  // rendering an empty card and silently discarding the model's own message. Falls back to showing
  // that text directly. Also closes AA-135 (display_format's confidence_tier: undefined in the
  // Pipeline Log was this same string-not-object case).
  // FEATURE: S-ARCH-STRING-CONTENT-01 (AA-135) — extends the AA-137 string fallback above to a
  // second cause: display is a genuine object (display_agent_card/display_agent_id ARE present)
  // but its real content is a string (e.g. Riley's html-display-format output, which has no schema
  // tool and terminates via plain-text model response) rather than the expected headline/body
  // object. Post-Task-1 fix, buildFinalDelegationResult() no longer spreads that string's
  // characters as numeric junk, so headline/body are genuinely absent here — same blank-card risk
  // as the pure-decline case, different cause, so the copy below is kept cause-neutral.
  if (typeof display === "string" || typeof display.content === "string") {
    const rawText = typeof display === "string" ? display : display.content;
    return {
      kind: "qa",
      headline: null, body: [{ text: rawText }], key_data_points: null,
      citations: finalAnswer.citations, confidence_tier: finalAnswer.confidence_tier,
      needs_review: true, review_reason: "Display agent output couldn't be rendered in the expected format — see message below.",
      displayAgentCard: typeof display === "string" ? null : display.display_agent_card,
      displayAgentId: typeof display === "string" ? null : display.display_agent_id,
    };
  }
  return {
    kind: "qa",
    headline: display.headline, body: display.body, key_data_points: display.key_data_points,
    citations: display.citations, confidence_tier: display.confidence_tier,
    needs_review: display.needs_review, review_reason: display.review_reason,
    displayAgentCard: display.display_agent_card, displayAgentId: display.display_agent_id,
  };
}

async function runIntentPipeline(message, conversationContext, onEvent, setStatus, onProgress, isStale = () => false) {
  const t0 = Date.now();
  const routing = await callCapability({
    capability_slug: "channel-intelligence", intent_slug: "ci-routing-intent", agent_id: "marcus",
    task_context: { goal: message }, runtime_context: conversationContext, onProgress, isStale,
  });
  if (isStale()) return { kind: "non_qa", text: "" }; // FEATURE: CHI-04 — discarded by submit()'s own isStale() check regardless; value here is never rendered
  onEvent(buildHopEvent("intent_routing", "marcus", routing, Date.now() - t0));
  if (routing.intent === "escalate") {
    return { kind: "non_qa", text: ESCALATE_PLACEHOLDER };
  }
  if (routing.intent !== "qa") {
    return { kind: "hyp_entry", intent: routing.intent, extractedHypothesis: routing.extracted_hypothesis, flaggedQuestion: message };
  }
  return runQaWithQualityGate(message, conversationContext, onEvent, setStatus, onProgress, isStale);
}

// FEATURE: MI-02/MI-03 — Generate Hypotheses (Priya/hypothesis-evaluation). Skips straight to
// the picker, pre-filled, when the user already wrote their own claim.
async function generateHypotheses({ flaggedQuestion, flaggedAnswer, reviewReason, isStale = () => false }) {
  const gen = await callCapability({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-generation-intent", agent_id: "priya",
    task_context: {
      flagged_question: flaggedQuestion,
      flagged_answer: flaggedAnswer || "",
      review_reason: reviewReason || "user-initiated, no explicit claim extracted",
    },
    isStale,
  });
  // FEATURE: MI-67b — patterns_used was being discarded here, one layer above callCapability()'s
  // own MI-67 fix; the caller needs both the hypotheses array (unchanged shape/contract) and the
  // real patterns for its Agent Routing log event.
  return { hypotheses: gen.hypotheses || [], patterns_used: gen.patterns_used || [] };
}

// FEATURE: S-ARCH-DISPLAY-LOOP-02 (AA-116) — real Display-agent hand-off for AI - Hypothesis
// Test, mirroring runQaWithQualityGate's real two-call chain (S-ARCH-DISPLAY-LOOP-01/AA-115):
// Priya's own hyp-hypothesis-test-intent call (her genuine analytical schema, separate from
// Alex's presentational one) followed by a real request_help -> Michelle (agent-selection-intent)
// -> delegate_to_agent(is_final:true) hand-off via hyp-hypothesis-test-display-intent. Alex is one
// candidate Michelle reasons over, not a guaranteed/hardcoded target — the old bundled
// format_skill_profile_slug/display_agent_id override (AA-77 format-last pattern) is gone entirely.
async function runHypothesisTest({ hypothesis, intent, flaggedQuestion, flaggedAnswer, priorHypothesisTest, onEvent, setStatus, onProgress, isStale = () => false }) {
  const analysis = await callCapability({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-hypothesis-test-intent", agent_id: "priya",
    task_context: {
      hypothesis, intent,
      flagged_question: flaggedQuestion || "", flagged_answer: flaggedAnswer || "",
      prior_hypothesis_test: priorHypothesisTest || null,
    },
    onProgress, isStale,
  });
  if (isStale()) return analysis; // FEATURE: CHI-04 — stop before the display hand-off hop

  const t0 = Date.now();
  const display = await callCapability({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-hypothesis-test-display-intent", agent_id: "priya",
    task_context: { supports: analysis.supports, complicates: analysis.complicates, consider: analysis.consider, confidence: analysis.confidence },
    onProgress, isStale,
  });
  if (isStale()) return display; // FEATURE: CHI-04
  // FEATURE: MI-52 -- same treatment as runQaWithQualityGate()'s Display-agent hand-off above:
  // agent_selection's agentId is the picker (Michelle), durationMs: null (not a fabricated duplicate);
  // display_format's agentId is the actual formatter (display.display_agent_id), real durationMs kept.
  // secondaryAgentId dropped from both.
  if (display.selection) {
    onEvent(buildHopEvent("agent_selection", display.selection.selected_by_agent_id, display.selection));
  }
  onEvent(buildHopEvent("display_format", display.display_agent_id, display, Date.now() - t0));

  // FEATURE: AA-137 — same string-fallback case as runQaWithQualityGate() above, Priya's path.
  // MessageBubble's hypothesis_test case only ever renders st.headline/st.supports/.complicates/
  // .consider — a plain-text decline needs somewhere to land; headline is the only field it
  // unconditionally renders when present (line 330), so that's where the raw text goes.
  // FEATURE: S-ARCH-STRING-CONTENT-01 (AA-135) — mirrors runQaWithQualityGate()'s extended
  // fallback above: display can be a genuine object whose real content is a string (Riley's
  // html-display-format shape) rather than the pure-decline string-only case AA-137 already
  // handled.
  // FEATURE: MI-67b — this function's return value (`st`) becomes the "hypothesis_test" event's
  // data — it must carry the ANALYSIS step's real patterns (this function's own hyp-hypothesis-
  // test-intent call), not the DISPLAY step's (hyp-hypothesis-test-display-intent, already
  // correctly attributed to the separate display_format event two lines above). Every branch below
  // explicitly sets patterns_used from `analysis`, overriding whatever `display` itself carries.
  return typeof display === "string"
    ? { headline: display, supports: null, complicates: null, consider: null, confidence: null, display_agent_card: null, display_agent_id: null, selection: null, patterns_used: analysis.patterns_used || [] }
    : typeof display.content === "string"
    ? { headline: display.content, supports: null, complicates: null, consider: null, confidence: null, display_agent_card: display.display_agent_card, display_agent_id: display.display_agent_id, selection: display.selection, patterns_used: analysis.patterns_used || [] }
    : { ...display, patterns_used: analysis.patterns_used || [] }; // final_delegation shape: every intelligence-review-format field + display_agent_card/id/selection, patterns_used overridden to the real analytical call's
}

// FEATURE: MI-51 — index/onGoodThanks added so a specific message's reviewChoice can be set
// (Good, thanks / exploring / undecided), threaded through from the parent's messages array.
// FEATURE: CHI-03a — `hyp_submitted`/`hypothesis_test` cases deleted entirely (moved into
// EvidenceColumn, Task 3/4); `qaEvidence` added so the shrunk `qa` case's review-outcome note
// (Good, thanks / Sent to Priya) can still render in chat, sourced from the shared qaEvidence
// state slot instead of msg.reviewChoice (onGoodThanks/onReview no longer index into messages).
function MessageBubble({ msg, index, onReview, onGoodThanks, qaEvidence }) {
  const isUser = msg.role === "user";

  // FEATURE: S-ARCH-DISPLAY-LOOP-01 / CHI-03a — Marcus's Q&A answer used to render its full
  // analysis card (headline/body/tables/byline/review-choice buttons) directly in chat; that
  // content now lives only in EvidenceColumn's QaEvidenceCard (Task 1/3) — any document, written
  // analysis, or narrative an agent produces is evidence, never chat (John's rule). Chat keeps only
  // Marcus's own conversational commentary about the work: a fixed pointer sentence (not {msg.text}
  // — msg.text is deliberately left as the full plain answer so conversationContext()/onReview's
  // flaggedAnswer keep working unchanged), the flag/review-reason caption, the elapsed-time caption,
  // and the review-outcome note once decided.
  if (msg.kind === "qa") {
    return (
      <div style={{marginBottom:12,maxWidth:"96%"}}>
        {/* FEATURE: CHI-08 */}
        <div style={{fontFamily:mono,fontSize:9,color:T.muted,marginBottom:3}}>Marcus</div>
        <div style={{
          maxWidth:"85%",padding:"10px 14px",fontFamily:body,fontSize:13,lineHeight:1.5,
          background: msg.needs_review ? "#f3e6cc" : T.card,
          color: T.ink,
          border: `1px solid ${msg.needs_review ? T.brass : T.line}`,
          borderRadius:3,
        }}>
          {/* FEATURE: CHI-08 — flagged narrative merged into the bubble, narrative first, pointer
              sentence second, both the bubble's own body font (was a separate mono/9.5px caption
              below the bubble). "Marcus flagged this —" prefix dropped (redundant inside Marcus's
              own bubble); ⚑ icon + brass color kept as the visual flag signal. */}
          {msg.needs_review && (
            <div style={{color:T.brassDeep,marginBottom:8}}>
              ⚑ {msg.review_reason || "flagged for review"}
            </div>
          )}
          I've pulled together an answer — review the full breakdown in the Evidence column to the right. Let me know if you have questions.
        </div>
        {/* FEATURE: CHI-21 — combined hop badge + elapsed-time row (was 2 stacked divs). */}
        <HopSummaryLine hopStart={msg.hopStart} hopEnd={msg.hopEnd} totalElapsedMs={msg.totalElapsedMs} accent={T.navy}/>
        {qaEvidence?.reviewChoice === "good" && (
          <div style={{marginTop:6,fontFamily:body,fontSize:11,fontStyle:"italic",color:T.muted}}>✓ Good, thanks — no further action.</div>
        )}
        {qaEvidence?.reviewChoice === "exploring" && (
          <div style={{marginTop:6,fontFamily:body,fontSize:11,fontStyle:"italic",color:T.muted}}>→ Sent to Priya for deeper theories. See the Evidence tab.</div>
        )}
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:isUser?"flex-end":"flex-start",marginBottom:12}}>
      {/* FEATURE: CHI-08 */}
      <div style={{fontFamily:mono,fontSize:9,color:T.muted,marginBottom:3}}>{isUser ? "You" : "Marcus"}</div>
      <div style={{
        maxWidth:"85%",padding:"10px 14px",fontFamily:body,fontSize:13,lineHeight:1.5,
        background: isUser ? T.navy : (msg.needs_review ? "#f3e6cc" : T.card),
        color: isUser ? T.card : T.ink,
        border: isUser ? "none" : `1px solid ${msg.needs_review ? T.brass : T.line}`,
        borderRadius:3,
      }}>
        {/* FEATURE: CHI-08 — same merge as the qa branch above; still dormant (no message today
            reaches this branch with needs_review true), kept consistent for when one does. */}
        {!isUser && msg.needs_review && (
          <div style={{color:T.brassDeep,marginBottom:8}}>
            ⚑ {msg.review_reason || "flagged for review"}
          </div>
        )}
        {msg.text}
      </div>
      {/* FEATURE: CHI-21 — combined hop badge + elapsed-time row (was 2 stacked divs), same
          component as the qa branch above. */}
      <HopSummaryLine hopStart={msg.hopStart} hopEnd={msg.hopEnd} totalElapsedMs={msg.totalElapsedMs} accent={T.navy}/>
      {/* FEATURE: MI-51 — mirrors the qa branch's universal 3-state guided prompt above, for the
          non-qa needs_review case (no message today reaches this with needs_review true, but this
          keeps the treatment consistent should a future non-qa kind carry the flag). */}
      {!isUser && msg.needs_review && (
        <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
          {msg.reviewChoice === "good" && (
            <div style={{fontFamily:body,fontSize:11,fontStyle:"italic",color:T.muted}}>✓ Good, thanks — no further action.</div>
          )}
          {msg.reviewChoice === "exploring" && (
            <div style={{fontFamily:body,fontSize:11,fontStyle:"italic",color:T.muted}}>→ Sent to Priya for deeper theories. See the Evidence tab.</div>
          )}
          {/* FEATURE: CHI-05 */}
          {!msg.reviewChoice && (
            <div style={{margin:"0 13px 11px 13px",padding:"14px 16px",background:`linear-gradient(180deg, ${T.brassGlow} 0%, ${T.white} 50%)`,border:`1px solid ${T.brass}`,borderRadius:0,position:"relative"}}>
              <Corners/>
              <span style={{display:"inline-block",fontFamily:mono,fontSize:9,fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase",background:T.brass,color:T.navy,padding:"3px 10px",borderRadius:0,marginBottom:10}}>● Needs your input</span>
              <div style={{fontFamily:body,fontSize:14,fontWeight:700,color:T.navy,margin:"8px 0 12px",lineHeight:1.4}}>Good with this analysis, or would you prefer deeper theories?</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <button onClick={() => onGoodThanks(index)}
                  style={{textAlign:"left",background:T.white,border:`1px solid ${T.line}`,color:T.mutedDeep,fontFamily:body,fontSize:12,padding:"9px 16px",cursor:"pointer",borderRadius:0}}>
                  Good, thanks
                </button>
                <button onClick={() => onReview(index)}
                  style={{textAlign:"left",background:T.navy,border:"none",color:T.card,fontWeight:700,fontFamily:body,fontSize:12,padding:"9px 16px",cursor:"pointer",borderRadius:0}}>
                  Have Priya (Forecast/Theory/Performance Expert) generate a few theories →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// FEATURE: CHI-03a — extracted verbatim from MessageBubble's old `qa` case so EvidenceColumn can
// render the identical card without duplicating the JSX (Category M). Visual output is byte-identical
// to the prior chat-rendered card; only the reviewChoice buttons' handler signatures changed (Task 2 —
// onGoodThanks/onReview no longer take a message index, they operate on qaEvidence directly).
function QaEvidenceCard({ qa, onGoodThanks, onReview }) {
  const { actual: actualPoints, theorized: theorizedPoints } = groupKeyDataPoints(qa.keyDataPoints);
  return (
    // FEATURE: CHI-18 — flex:1 makes this card's own background/border stretch to fill the scroll
    // body's available height (its parent is a flex column), instead of shrink-wrapping just its
    // text content. Leaves only the scroll body's own structural 14px gap between this box and the
    // pinned footer below, instead of a large borderless dead zone when content is short.
    <div style={{background:T.card,border:`1px solid ${T.line}`,borderLeft:`4px solid ${T.navy}`,borderRadius:0,position:"relative",flex:1}}>
      {/* FEATURE: CHI-05 */}
      <FeatureBadge id="CHI-05"/>
      <div style={{background:T.cardAlt,padding:"7px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        {/* FEATURE: CHI-21 — renamed from agent/screen identity ("Marcus Webb · Channel
            Intelligence") to a purpose-describing title. */}
        <span style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:T.navy}}>Analysis & Narrative — based on your question...</span>
        <HopBadge hopStart={qa.hopStart} hopEnd={qa.hopEnd} accent={T.navy}/>
      </div>
      <div style={{borderTop:`1px solid ${T.line}`,borderBottom:`1px solid ${T.line}`}}>
        <div style={{padding:"11px 13px",display:"flex",flexDirection:"column",gap:9}}>
          {qa.headline && <div style={{fontFamily:body,fontSize:13,fontWeight:600,color:T.ink}}>{qa.headline}</div>}
          {(qa.body || []).map((b, i) => (
            <div key={i}>
              {b.heading && <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.mutedDeep,marginBottom:3}}>{b.heading}</div>}
              <p style={{margin:0,fontFamily:body,fontSize:11.5,lineHeight:1.5,color:T.ink}}>{b.text}</p>
            </div>
          ))}
          <ActualDataPointsTable rows={actualPoints}/>
          <TheorizedDataPointsTable rows={theorizedPoints}/>
        </div>
        {qa.displayAgentCard && (
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'0 13px 11px 13px'}}>
            <AgentAvatar who={qa.displayAgentId} size={16} ring={false}/>
            <span style={{fontFamily:'Inter, sans-serif',fontSize:11,color:'#888',letterSpacing:'0.02em'}}>Formatted by</span>
            <span style={{fontFamily:'Inter, sans-serif',fontSize:11,fontWeight:600,color:'#b6873a',letterSpacing:'0.02em'}}>{qa.displayAgentCard.name}</span>
            <span style={{fontFamily:'Inter, sans-serif',fontSize:10,color:'#777'}}>{qa.displayAgentCard.role}</span>
          </div>
        )}
      </div>
      {qa.reviewChoice === "good" && (
        <div style={{padding:"0 13px 11px 13px",fontFamily:body,fontSize:11,fontStyle:"italic",color:T.muted}}>✓ Good, thanks — no further action.</div>
      )}
      {qa.reviewChoice === "exploring" && (
        <div style={{padding:"0 13px 11px 13px",fontFamily:body,fontSize:11,fontStyle:"italic",color:T.muted}}>→ Sent to Priya for deeper theories.</div>
      )}
    </div>
  );
}

// FEATURE: CHI-13 — extracted from QaEvidenceCard's old inline footer (see STYLE-GUIDE.md §35,
// unchanged) so EvidenceColumn can render it in its own pinned footer slot instead of wherever
// QaEvidenceCard's content happens to end.
function QaEvidenceCardFooter({ qa, onGoodThanks, onReview }) {
  return (
    <div style={{padding:"14px 16px",background:`linear-gradient(180deg, ${T.brassGlow} 0%, ${T.white} 50%)`,border:`1px solid ${T.brass}`,borderRadius:0,position:"relative"}}>
      <Corners/>
      <span style={{display:"inline-block",fontFamily:mono,fontSize:9,fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase",background:T.brass,color:T.navy,padding:"3px 10px",borderRadius:0,marginBottom:10}}>● Needs your input</span>
      <div style={{fontFamily:body,fontSize:14,fontWeight:700,color:T.navy,margin:"8px 0 12px",lineHeight:1.4}}>Good with this analysis, or would you prefer deeper theories?</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <button onClick={onGoodThanks} style={{textAlign:"left",background:T.white,border:`1px solid ${T.line}`,color:T.mutedDeep,fontFamily:body,fontSize:12,padding:"9px 16px",cursor:"pointer",borderRadius:0}}>Good, thanks</button>
        <button onClick={onReview} style={{textAlign:"left",background:T.navy,border:"none",color:T.card,fontWeight:700,fontFamily:body,fontSize:12,padding:"9px 16px",cursor:"pointer",borderRadius:0}}>Have Priya (Forecast/Theory/Performance Expert) generate a few theories →</button>
      </div>
    </div>
  );
}

// FEATURE: MI-51 — Theory/Forecast/Correct switcher UI removed (onIntentChange kept as a prop for
// call-site parity, no longer invoked from inside this component — hypFlow.intent is still set at
// entry via enterHypothesisFlow()/runIntentPipeline() classification and passed through unchanged to
// onSelectHypothesis/onCommit, see CONTEXT item 13); guided theory selection (soft-link reveals a
// write-your-own textarea only on click, was always-visible); explicit "test this theory" invocation
// (was auto-fired on selection); honest verdict rendering (Supports/Complicates/Consider always shown,
// chart/key-data-points only when present); 2-outcome decision (Info Only/Store as Forecast, was 3);
// reframed confirmation intro line naming Nadia.

// FEATURE: MI-59 — one shared sentence source for both EvidenceColumn states, so the
// empty-state and populated-state copy can't drift apart as separate hardcoded strings.
function getEvidencePanelSentence(hypFlow) {
  // FEATURE: CHI-03a — empty-state copy updated: Evidence now also fills from a plain Q&A
  // (qaEvidence), not just a hypothesis flow, so the copy no longer promises "interaction" alone.
  if (!hypFlow) return "Once Marcus has an answer or a theory to test, it'll appear here for you to review and act on.";
  const label = INTENT_LABEL[hypFlow.intent] || hypFlow.intent;
  return `${label} — Data for you to interact with your chat...`;
}

// FEATURE: CHI-13 — single source of truth for which decision (if any) is currently pending in
// Evidence, so exactly one footer renders at a time, pinned to the bottom of the card instead of
// wherever it happens to land in scroll flow. Priority order: confirmation > hypothesis result >
// qa review — mirrors the mutual exclusion the old inline gates (!hypFlow.confirmation,
// stage === "result") already enforced implicitly, just centralized instead of scattered.
function selectEvidenceFooterKind(qaEvidence, hypFlow) {
  if (hypFlow?.confirmation) return "hyp-confirmation";
  if (hypFlow?.hypothesisTest && hypFlow.stage === "result") return "hyp-result";
  if (qaEvidence && !qaEvidence.reviewChoice) return "qa-review";
  return null;
}

function EvidenceColumn({ hypFlow, qaEvidence, onIntentChange, onSelectHypothesis, onDiscard, onCommit, onResolveConfirmation, onGoodThanks, onReview }) {
  const [customText, setCustomText] = useState("");
  const [showOwnTheory, setShowOwnTheory] = useState(false);
  const agents = useAgents();
  const nadia = agents.find(a => a.id === "nadia");
  // FEATURE: CHI-29 — moved above the early return below (patch, S-CHI-26b): this hook must run
  // unconditionally on every render, same as every other hook in this function. The original
  // placement (after the early return) violated React's Rules of Hooks — EvidenceColumn calls a
  // different number of hooks depending on whether qaEvidence/hypFlow are set, which crashes React
  // ("Minified React error #310") the instant the component transitions from its empty state to
  // its populated state, since that's a re-render of the same mounted instance with a different
  // hook count. Found live during S-CHI-26-design's own Manual QA verification.
  const evidenceScrollRef = useRef(null);
  const { canScrollMore: evidenceCanScrollMore, onScroll: checkEvidenceScroll } = useScrollFadeHint(evidenceScrollRef, [qaEvidence, hypFlow]);

  useEffect(() => {
    if (hypFlow && hypFlow.prefillText) { setCustomText(hypFlow.prefillText); setShowOwnTheory(true); }
  }, [hypFlow && hypFlow.prefillText]);

  // FEATURE: CHI-03a — Task 3's submitted-theory block gate: hypFlow.chosenText already carries
  // this text (set by onSelectHypothesis's startTest branch) -- no new state. Renders once the test
  // has actually started (testing/result stages, or confirmation set), stacked below the qa card.
  const showSubmittedTheory = !!(hypFlow && hypFlow.chosenText && (hypFlow.stage === "testing" || hypFlow.stage === "result" || hypFlow.confirmation));

  // FEATURE: CHI-03a — true empty state only when NEITHER qaEvidence nor hypFlow exist (was gated
  // on !hypFlow alone). This is the core bug this session fixes: a plain Q&A the user never
  // escalates into a hypothesis flow used to leave Evidence stuck in this empty state permanently,
  // even though qaEvidence had real content to show.
  if (!qaEvidence && !hypFlow) {
    // FEATURE: MI-59 — informational-only empty state; the 4 dummy data-type pills that used
    // to render here (Sourced/Analysis/Source Simulation/Learned) had no click handler and no
    // tie to any flow or action (confirmed live) — removed outright, not just hidden for this
    // state. STYLE-GUIDE.md §19's shared taxonomy still has 2 other real render sites
    // (Pipeline Log confidence_tier summary, Data Sources drawer) — describeDataType() itself
    // is unchanged and still imported/used there.
    return (
      <div style={{display:"flex",flexDirection:"column",gap:14,position:"relative"}}>
        <FeatureBadge id="MI-59"/>
        <FeatureBadge id="CHI-26"/>
        {/* FEATURE: CHI-03a — header renamed "Evidence" -> "Evidence & Interaction" (Task 4 rename,
            since review/resolve actions moved here too, not just read-only content). */}
        <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.muted}}>Evidence & Interaction</div>
        <div style={{background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:16}}>
          <div style={{fontFamily:body,fontSize:12,color:T.muted}}>
            {getEvidencePanelSentence(null)}
          </div>
        </div>
      </div>
    );
  }

  const st = hypFlow?.hypothesisTest;
  const { actual: stActualPoints, theorized: stTheorizedPoints } = groupKeyDataPoints(st?.key_data_points);
  const footerKind = selectEvidenceFooterKind(qaEvidence, hypFlow);

  return (
    // FEATURE: MI-54 — bounded to the grid row height with an internal scroll region, matching
    // InteractColumn's existing pattern (flex:1/minHeight:0 outer, overflow:hidden card,
    // overflowY:"auto" inner content div) -- action buttons/ConfirmationCard now scroll into view
    // inside the card instead of growing the whole page past the fold.
    <div style={{display:"flex",flexDirection:"column",gap:14,minHeight:0,flex:1,position:"relative"}}>
      <FeatureBadge id="MI-59"/>
      <FeatureBadge id="CHI-26"/>
      <FeatureBadge id="CHI-29"/>
      {/* FEATURE: CHI-03a — header renamed "Evidence" -> "Evidence & Interaction" in both states. */}
      <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.muted}}>Evidence & Interaction</div>
      {/* FEATURE: CHI-18 — gap:14 between the scroll body and the pinned footer, matching
          AuditColumn's (Column 3) drawer-stack gap value. The footer itself stays fully unchanged
          (padding, border, position as the flex column's last child) — it remains locked to the
          card's bottom regardless of content length; only the separation from the content above it
          is new. */}
      <div style={{background:T.cardAlt,border:`1px solid ${T.lineSoft}`,display:"flex",flexDirection:"column",flex:1,minHeight:0,overflow:"hidden",gap:14,position:"relative"}}>
        {/* FEATURE: CHI-18 — padding-bottom dropped to 0: the narrative card above now stretches
            (flex:1, Task 1) to fill this box, so its own trailing padding would otherwise stack on
            top of the outer card's structural 14px gap to the footer (30px total measured, more
            than the AuditColumn-matching 14px target). Top/side padding unchanged. */}
        <div ref={evidenceScrollRef} onScroll={checkEvidenceScroll} style={{padding:"16px 16px 0",display:"flex",flexDirection:"column",gap:14,overflowY:"auto",flex:1,minHeight:0}}>

        {/* FEATURE: CHI-03a — Task 1's extracted card, independent of hypFlow: renders the instant
            Marcus has an answer, whether or not a hypothesis flow is ever started. */}
        {qaEvidence && <QaEvidenceCard qa={qaEvidence} onGoodThanks={onGoodThanks} onReview={onReview}/>}

        {/* FEATURE: CHI-03a — Task 3's submitted-theory block, moved from the old hyp_submitted
            chat card (MessageBubble, now deleted). No new state: hypFlow.chosenText already
            carries this text (onSelectHypothesis's startTest branch). */}
        {showSubmittedTheory && (
          <div style={{background:T.card,border:`1px solid ${T.lineSoft}`,padding:"9px 11px"}}>
            <div style={{fontFamily:mono,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:T.brassDeep,marginBottom:4}}>Submitted theory</div>
            <div style={{fontSize:12,lineHeight:1.5,color:T.ink}}>{hypFlow.chosenText}</div>
          </div>
        )}

        {hypFlow && (
        <>
        {/* FEATURE: MI-59 — shared sentence, intent-prefixed. The MI-59 kickoff doc specced this as
            rendering "above the intent-toggle buttons," but MI-51 already removed that button row
            entirely (onIntentChange is kept only for call-site parity, no longer invoked here — see
            the MI-51 comment just below) — there is no toggle row left to anchor to, so this renders
            directly under the header instead, in the same position the toggle row used to occupy. */}
        <div style={{fontFamily:body,fontSize:12,color:T.muted}}>
          {getEvidencePanelSentence(hypFlow)}
        </div>

        {/* FEATURE: MI-51 — Theory/Forecast/Correct switcher REMOVED. hypFlow.intent is still set at
            entry (enterHypothesisFlow, direct-typed classification via runIntentPipeline) and still
            passed through unchanged to onSelectHypothesis/onCommit; it is simply no longer a visible,
            switchable control. */}

        {hypFlow.stage === "generating" && (
          /* FEATURE: MI-62 */
          <div style={{padding:12,background:T.card,border:`1px dashed ${T.lineSoft}`,fontFamily:body,fontSize:11.5,lineHeight:1.6,color:T.mutedDeep,fontStyle:"italic"}}>
            Priya is generating candidate theories. Live progress is shown below.
          </div>
        )}

        {hypFlow.stage === "choosing" && hypFlow.candidates && (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Review or Select a theory to include in the analysis</div>
            {hypFlow.candidates.map(h => (
              <div key={h.id} onClick={() => { setShowOwnTheory(false); onSelectHypothesis(h.text); }}
                style={{padding:"9px 11px",background:T.card,border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:12,color:T.ink,cursor:"pointer",display:"flex",gap:8}}>
                <span style={{fontFamily:mono,fontSize:10,color:T.brassDeep,flexShrink:0}}>{h.id}</span>
                <span>{h.text}</span>
              </div>
            ))}
            {showOwnTheory ? (
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <textarea rows={2} value={customText} onChange={e => setCustomText(e.target.value)}
                  placeholder="Write your own explanation"
                  style={{padding:"9px 11px",border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:12,background:T.card,color:T.ink,resize:"vertical"}}/>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={() => { if (customText.trim()) { onSelectHypothesis(customText.trim()); setCustomText(""); setShowOwnTheory(false); } }}
                    disabled={!customText.trim()}
                    style={{padding:"6px 12px",background:T.navy,color:T.card,border:"none",fontFamily:body,fontSize:11.5,cursor:customText.trim()?"pointer":"default"}}>
                    Save
                  </button>
                  <button onClick={() => { setShowOwnTheory(false); setCustomText(""); }}
                    style={{padding:"6px 12px",background:"transparent",color:T.muted,border:`1px solid ${T.line}`,fontFamily:body,fontSize:11.5,cursor:"pointer"}}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowOwnTheory(true)}
                style={{alignSelf:"flex-start",background:"none",border:"none",padding:0,fontFamily:body,fontSize:11.5,fontStyle:"italic",color:T.brassDeep,textDecoration:"underline",cursor:"pointer"}}>
                ...or write your own explanation
              </button>
            )}
          </div>
        )}

        {hypFlow.stage === "ready" && hypFlow.chosenText && (
          <>
            <div style={{background:T.card,borderLeft:`3px solid ${T.brass}`,padding:"9px 12px"}}>
              <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4}}>Theory selected</div>
              <p style={{margin:0,fontFamily:body,fontSize:12,lineHeight:1.5,color:T.ink,fontStyle:"italic"}}>{hypFlow.chosenText}</p>
            </div>
            <button onClick={() => onSelectHypothesis(hypFlow.chosenText, { startTest:true })}
              style={{alignSelf:"flex-start",background:"none",border:`1px solid ${T.brass}`,color:T.brassDeep,fontWeight:600,fontFamily:body,fontSize:12,padding:"9px 12px",cursor:"pointer"}}>
              Have Priya (Forecast/Theory/Performance Expert) test this theory →
            </button>
          </>
        )}

        {hypFlow.stage === "testing" && (
          /* FEATURE: MI-62 */
          <div style={{padding:12,background:T.card,border:`1px dashed ${T.lineSoft}`,fontFamily:body,fontSize:11.5,lineHeight:1.6,color:T.mutedDeep,fontStyle:"italic"}}>
            Priya is testing this theory against a fresh Data Room query. Live progress is shown below.
          </div>
        )}

        {st && hypFlow.stage === "result" && (
          <>
            {/* FEATURE: CHI-03c — hop-range badge citing the Agent Routing hops that produced this
                theory test result. T.moss accent matches this block's own "Supports" verdict color
                (no dedicated borderLeft accent exists on this flat section to reuse instead). */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
              <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.muted}}>Theory Evidence</div>
              <HopBadge hopStart={st.hopStart} hopEnd={st.hopEnd} accent={T.moss}/>
            </div>
            {/* FEATURE: CHI-07 */}
            {hypFlow.testElapsedMs != null && (
              <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,marginTop:2}}>
                Full Agent Routing & Answer Given in {formatElapsed(hypFlow.testElapsedMs)}
              </div>
            )}
            {/* FEATURE: MI-66 — decision control (override warning + instructional copy + Info Only/Store
                as Forecast buttons) moved to the top: this is the real human decision point (HITL control)
                on this screen, distinct from the later ConfirmationCard gate below, and it previously
                rendered last, after a full read of the supporting evidence. override_warning now shares
                the buttons' !hypFlow.confirmation gate -- a deliberate behavior change confirmed with
                John: it no longer stays visible once the buttons are replaced by the ConfirmationCard
                during Nadia's draft-review stage; it belongs to the decision moment, not the whole flow. */}
            {!hypFlow.confirmation && (
              <>
                {st.override_warning && (
                  <div style={{padding:"9px 11px",background:"#f3e6cc",border:`1px solid ${T.brass}`,fontFamily:body,fontSize:11,color:T.brassDeep}}>
                    ⚑ AI flagged a complicating factor not fully resolved by this theory. Committing will log this as an override.
                  </div>
                )}
                <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Review the theory evidence below, then select an option.</div>
              </>
            )}

            <ActualDataPointsTable rows={stActualPoints}/>
            <TheorizedDataPointsTable rows={stTheorizedPoints}/>

            {st.visualization && (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Current vs. Projected <span style={{textTransform:"none",fontStyle:"italic",fontWeight:400}}>— shown when Priya judges it useful, not every time</span></div>
                <ChartRenderer type={st.visualization.chart_type} data={st.visualization.chart_data} caption={st.visualization.caption}/>
              </div>
            )}

            {/* FEATURE: MI-51 — honest verdict: Supports/Complicates/Consider always render when
                present (mirrors MessageBubble's existing hypothesis_test rendering). Reordered below the
                decision control and evidence tables/chart per MI-66. */}
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {st.supports && (<div><div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.moss,marginBottom:3}}>✓ Supports</div><p style={{margin:0,fontFamily:body,fontSize:11.5,lineHeight:1.5,color:T.ink}}>{st.supports.text || st.supports}</p></div>)}
              {st.complicates && (<div><div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.flag,marginBottom:3}}>⚠ Complicates</div><p style={{margin:0,fontFamily:body,fontSize:11.5,lineHeight:1.5,color:T.ink}}>{st.complicates.text || st.complicates}</p></div>)}
              {st.consider && (<div><div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.mutedDeep,marginBottom:3}}>→ Consider also</div><p style={{margin:0,fontFamily:body,fontSize:11.5,lineHeight:1.5,color:T.ink}}>{st.consider.text || st.consider}</p></div>)}
            </div>
          </>
        )}

        </>
        )}
        </div>
        <ScrollFadeHint show={evidenceCanScrollMore} bg={T.cardAlt}/>
        {footerKind && (
          <div style={{padding:"10px 14px",borderTop:`1px solid ${T.line}`,position:"relative"}}>
            <FeatureBadge id="CHI-13"/>
            {footerKind === "qa-review" && (
              <QaEvidenceCardFooter qa={qaEvidence} onGoodThanks={onGoodThanks} onReview={onReview}/>
            )}
            {footerKind === "hyp-result" && (
              <div style={{display:"flex",gap:6}}>
                <button onClick={onDiscard}
                  style={{flex:1,padding:"8px 6px",background:"transparent",border:`1px solid ${T.line}`,fontFamily:body,fontSize:11,color:T.ink,cursor:"pointer"}}>
                  Info Only
                </button>
                <button onClick={() => onCommit()}
                  style={{flex:1,padding:"8px 6px",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:11,color:T.ink,cursor:"pointer"}}>
                  Store as Forecast
                </button>
              </div>
            )}
            {footerKind === "hyp-confirmation" && (
              <>
                <div style={{fontFamily:body,fontSize:12,fontStyle:"italic",color:T.mutedDeep,marginBottom:8}}>
                  Nadia (Data Expert) drafted this Data Room entry — review it before it's saved:
                </div>
                <ConfirmationCard
                  agent={nadia}
                  proposedAction={hypFlow.confirmation.proposed_action}
                  critique={hypFlow.confirmation.critique}
                  onResolve={onResolveConfirmation}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// FEATURE: MI-18 — this screen's own proposed roster for the Agents drawer. Lives here, not on
// agents.js, so the roster stays platform-wide/page-agnostic — closes MI-06's AI-38 dependency,
// no isAppleChannel/section field needed. Any future screen wanting this drawer defines its own
// list the same way, passed to the same reusable useAgentActivitySummary()/Drawer pieces.
// FEATURE: S-MI-18b — expanded from the original 6 front-line agents to the full cast that
// actually touches this page's Agent Loop: Michelle Manning (PP-01, PM broker), Alex Reeves
// (ED-01, Format Skill), Dan Bingham (PS-01, Prompt Service), Eleanor Voss (LB-01, Librarian) —
// confirmed live via ai_activity_log this design session, not hypothetical (Michelle alone: 595
// all-time calls). Still page-local, not stored on agents.js — same platform-wide-roster
// principle as the original MI-18 design.
const PROPOSED_MI_AGENT_IDS = ["marcus", "priya", "nadia", "owen", "sam", "elena", "michelle", "alex", "dan", "eleanor", "riley"];

// FEATURE: S-MI-18b — this page's own loop-access scope, passed to useAgentActivitySummary() so
// the drawer's metrics reflect real Market Intelligence activity, not a shared broker/utility
// agent's platform-wide total. Every value below verified live this design session against the
// entire ai_activity_log table (not just these 10 agents) — confirmed zero leakage to any
// non-MI/legacy agent_id. Deliberately excludes the generic bare 'request-receivable' ai_type and
// any ai_type not seen in real, current production data (conservative: undercounts rather than
// risks a false match).
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
    // FEATURE: LOG-13 -- these 3 were present in aiTypes (below) but missing here, so
    // data-analysis/memory-consolidation/data-room-custody's own agent-turn rows (Nadia/Elena/
    // Eleanor's intermediate delegation-loop turns) never matched inScope() and were dropped
    // entirely from this drawer -- confirmed live 2026-07-16, Nadia's data-analysis:none:depth2
    // turn (id 11046, real call) absent. Every entry in aiTypes whose real usage on this screen can
    // produce agent-turn rows (i.e. anything beyond a single-shot dispatch) needs its "<slug>:"
    // prefix here too, or its intermediate turns silently vanish -- this was the actual root cause.
    "data-analysis:", "memory-consolidation:", "data-room-custody:",
    "project-manager:agent-selection-intent:",
    "screen-controls:qa-answer-format:", "screen-controls:intelligence-review-format:",
    "html-display:",
  ],
};

function StatCell({ val, label }) {
  return (
    <div style={{textAlign:"center"}}>
      <div style={{fontFamily:mono,fontSize:11,fontWeight:800,color:T.navy}}>{val}</div>
      <div style={{fontFamily:mono,fontSize:7,color:T.muted,textTransform:"uppercase",letterSpacing:"0.03em"}}>{label}</div>
    </div>
  );
}

// FEATURE: S-MI-20 — generic title-case formatter for a raw kind key (an intent_slug like
// "ci-answer-intent" or a standalone ai_type like "guardrails-check") into a readable label.
// Deliberately not a hardcoded per-intent label map (e.g. "ci-answer-intent" -> "Answer
// generation") — that would need manual upkeep every time a new intent/capability ships across
// any of the 10 agents. This stays generic and maintenance-free; exact wording is less polished
// but always correct and never goes stale.
function formatKindLabel(kind) {
  return kind.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// FEATURE: MI-43 — shared row renderer for the Agents drawer's per-agent latency stats
// (Baseline, byKind, AA-149 byModel sub-rows). Fixed-width label column (ellipsis-truncated)
// + fixed-width right-aligned leading number is what makes the decimal point/units digit land
// in the same horizontal position across rows, regardless of label length or 1-vs-2-digit
// seconds values — replaces the old justifyContent:"space-between" full-string right-justify,
// which right-aligned the whole string and never actually lined up the numbers (John, 2026-07-09).
function LatencyStatRow({ label, valueNumber, restText, indent, fontSize }) {
  return (
    <div style={{display:"flex",gap:6,fontFamily:mono,fontSize:fontSize ?? 9,color:indent?T.mutedDeep:T.muted,paddingLeft:indent?10:0}}>
      <span style={{width:110,flexShrink:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{label}</span>
      <span style={{display:"flex",color:T.navy,fontWeight:700}}>
        <span style={{display:"inline-block",minWidth:34,textAlign:"right",flexShrink:0}}>{valueNumber}</span>
        <span>{restText}</span>
      </span>
    </div>
  );
}

// FEATURE: MI-31 — rolls a per-agent speed-baseline-test summary (already deduped by
// useAgentActivitySummary()'s classifyRow(), same as any other byKind data) into a single blended
// number for the "Baseline" row. Reuses stats.byKind rather than averaging raw rows so the
// wrapper/agent-turn dedup fix (MI-30/Task 2) applies here too. Returns null when there is no
// baseline data at all (e.g. Dan Bingham) so the caller can omit the row entirely.
function rollupBaseline(stats) {
  if (!stats?.byKind) return null;
  const kinds = Object.values(stats.byKind).filter(k => k.latencyCount > 0);
  if (kinds.length === 0) return null;
  const totalLatency = kinds.reduce((sum, k) => sum + k.totalLatency, 0);
  const latencyCount = kinds.reduce((sum, k) => sum + k.latencyCount, 0);
  const maxLatency = Math.max(...kinds.map(k => k.maxLatency));
  const calls = kinds.reduce((sum, k) => sum + k.calls, 0);
  return { avgLatency: Math.round(totalLatency / latencyCount), maxLatency, calls };
}

// FEATURE: CHI-14 — single source of truth for the Agent Routing drawer's zero-hop empty
// state, shared by desktop (AuditColumn) and mobile (MobileBody). Previously two independent
// string literals had drifted: desktop carried a stale sentence referencing internal session
// IDs (S-MARKET-INTEL-01d/03), one of which had already shipped; mobile's copy was already
// correct. Fixed at the source instead of patching desktop's string in place, so the two
// surfaces cannot drift again.
const AGENT_ROUTING_EMPTY_TEXT = "Real agent-hop events appear here as the chat runs.";

// FEATURE: CHI-01 — one bordered card per hop (was one per raw event). Card header
// (avatar/name/role) renders once per hop, matching S-MI-68-design's original intent more
// completely than sameAgentAsPrevious's header-only suppression did. Card border-left uses the
// LAST activity's color in the hop (the most recent/most decision-relevant outcome, e.g. a
// late "blocking this answer" should read as red even if the hop opened on a neutral action).
// FEATURE: CHI-03c — renamed from RoutingTurnCard/turn.turnNumber; see groupEventsIntoHops() above.
// FEATURE: CHI-04 — visual boundary between one question's Agent Routing hops and the next, shown
// only when the user asks a follow-up without hitting Clear (Clear already wipes the whole panel,
// Task 1 — nothing to divide there). Rendered in place of a RoutingHopCard wherever
// groupEventsIntoHops() marks a hop isBoundary.
function QuestionDivider({ evt }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,margin:"2px 0"}}>
      <div style={{flex:1,height:1,background:T.line}}/>
      <span style={{fontFamily:mono,fontSize:9,color:T.muted,whiteSpace:"nowrap"}}>New question · {formatClockTime(evt.data.timestamp)}</span>
      <div style={{flex:1,height:1,background:T.line}}/>
    </div>
  );
}

function RoutingHopCard({ hop, agentById }) {
  const primary = agentById(hop.agentId);
  const lastColor = describePipelineEvent(hop.events[0]).color;
  return (
    <div style={{borderLeft:`3px solid ${lastColor}`,paddingLeft:10,display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:6}}>
        <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{hop.hopNumber}</span>
        {primary && <AgentAvatar who={primary.id} size={20}/>}
        <span style={{fontFamily:body,fontSize:11.5,fontWeight:600,color:T.ink}}>{primary ? firstNameFor(hop.agentId, agentById) : hop.agentId}</span>
        <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{primary ? primary.role : ""}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {hop.events.map(evt => <RoutingActivityLine key={evt.id} evt={evt}/>)}
      </div>
    </div>
  );
}

// FEATURE: CHI-01 — one activity line within a hop card (no header — RoutingHopCard owns
// that). Replaces the per-row 3px left border with a small 6px color dot per line, since the
// card itself now carries the border. FEATURE: CHI-02 — summary text is never hard-truncated
// upstream anymore (see Task 2); this component owns visual truncation via CSS line-clamp (3
// lines) + a click-to-expand toggle, so the ellipsis lands at the true end of the last visible
// line instead of wrapping alone, and the full text is always one click away.
// FEATURE: LOG-15 — capability never displays here, ever (John's hard rule, 2026-07-17). One
// generic line reads evt.data.patterns_used directly — no event-type branching, no capability
// lookup. A hop with no real pattern data shows no line at all (never a fabricated placeholder) —
// same "real data or nothing" principle MI-67 already established for this exact field.
function RoutingActivityLine({ evt }) {
  const { summary, color } = describePipelineEvent(evt);
  const realPatterns = Array.isArray(evt.data?.patterns_used) ? evt.data.patterns_used : null;
  const patternLabel = realPatterns && realPatterns.length > 0
    ? realPatterns.map(slug => PATTERN_NAME[slug] || slug).join(', ')
    : null;
  const [expanded, setExpanded] = useState(false);
  const fullText = `${summary}${evt.durationMs != null ? ` · ${formatDuration(evt.durationMs)}` : ""}`;
  const isLong = fullText.length > 160;
  return (
    <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
      <span style={{width:6,height:6,borderRadius:"50%",background:color,marginTop:5,flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        {patternLabel && <div style={{fontFamily:mono,fontSize:9,color:T.muted}}>AI patterns used: {patternLabel}</div>}
        <div
          onClick={() => isLong && setExpanded(e => !e)}
          style={{
            fontFamily:body,fontSize:11.5,color:T.ink,cursor:isLong?"pointer":"default",
            display: expanded ? "block" : "-webkit-box",
            WebkitLineClamp: expanded ? "unset" : 3,
            WebkitBoxOrient:"vertical",
            overflow: expanded ? "visible" : "hidden",
          }}>
          {fullText}
        </div>
        {isLong && (
          <button onClick={() => setExpanded(e => !e)}
            style={{background:"none",border:"none",padding:0,marginTop:2,fontFamily:body,fontSize:10.5,fontStyle:"italic",color:T.brassDeep,textDecoration:"underline",cursor:"pointer"}}>
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
    </div>
  );
}

// FEATURE: MI-45 — extracted from AuditColumn's former inline body: the four non-routing drawers
// (Agents, Data Sources, Analysis, Agent Reasoning) now render from one shared function, called by
// desktop's AuditColumn (right after its own Agent Routing Drawer) and mobile's Activity overlay
// (STYLE-GUIDE.md §21, "Activity" carries Audit's other four drawers) — byte-identical drawer
// content, sourced from the same function, per the kickoff's Task 2b requirement. learned/
// dataSources/baselineActivity are computed here via the same hooks AuditColumn used to call
// directly, so both call sites need only pass the two values (agents, agentActivity) that
// genuinely differ per caller, rather than threading three additional hook results through props
// for a single shared consumer.
function AuditDrawersBody({ agents, agentActivity, onAgentsDrawerOpen }) {
  const learned = useLearnedContext();
  const dataSources = useDataSources();
  // FEATURE: MI-31 — separate hook instance (own useState/useEffect), scoped to the
  // 'speed-baseline-test' tenant, unfiltered by MI_LOOP_SCOPE (scope: null) since those rows are
  // already fully isolated deliberate test data, not production MI-loop traffic.
  const baselineActivity = useAgentActivitySummary(PROPOSED_MI_AGENT_IDS, null, 'speed-baseline-test');
  const agentById = (id) => agents.find(a => a.id === id);
  const activeIds = PROPOSED_MI_AGENT_IDS
    .filter(id => agentActivity[id]?.calls > 0)
    .sort((a, b) => (agentActivity[b]?.calls || 0) - (agentActivity[a]?.calls || 0));
  const potentialIds = PROPOSED_MI_AGENT_IDS.filter(id => !agentActivity[id]?.calls);

  // FEATURE: MI-22 — Sourced/Simulation(sub-grouped)/Analysis buckets, single describeDataType()
  // pass per row via groupDataSources() (Category M) — replaces S-MI-15's flat count reduce.
  const { sourced, simulationByCategory, analysis } = groupDataSources(dataSources);
  const simulationCategories = Object.keys(simulationByCategory).sort();
  const simulationTotal = simulationCategories.reduce((n, cat) => n + simulationByCategory[cat].length, 0);

  return (
    <>
      <Drawer title="Agents" count={`${activeIds.length} active · ${potentialIds.length} potential`} onOpen={onAgentsDrawerOpen}>
        {activeIds.map(id => {
          const agent = agentById(id);
          if (!agent) return null;
          const stats = agentActivity[id];
          const baseline = rollupBaseline(baselineActivity[id]);
          return (
            <div key={id} style={{display:"flex",flexDirection:"column",gap:6,paddingBottom:10,borderBottom:`1px dashed ${T.lineSoft}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <AgentAvatar who={agent.id} size={24}/>
                <div style={{display:"flex",flexDirection:"column"}}>
                  <span style={{fontFamily:body,fontSize:12,fontWeight:600,color:T.ink}}>{agent.name}</span>
                  <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{agent.role}</span>
                </div>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {agent.specialty.split(" · ").map(chip => (
                  <span key={chip} style={{fontFamily:mono,fontSize:8,color:T.brassDeep,background:T.paperDeep,border:`1px solid ${T.lineSoft}`,borderRadius:10,padding:"2px 7px"}}>{chip}</span>
                ))}
              </div>
              <div style={{display:"flex",gap:16}}>
                <StatCell val={stats?.calls ?? 0} label="Calls"/>
                <StatCell val={stats?.avgCost != null ? `$${stats.avgCost.toFixed(2)}` : "—"} label="Avg Cost"/>
              </div>
              {(baseline || (stats?.byPattern && Object.keys(stats.byPattern).length > 0)) && (
                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                  {baseline && (
                    <LatencyStatRow
                      label="Baseline"
                      valueNumber={(baseline.avgLatency/1000).toFixed(1)}
                      restText={`s avg (${baseline.calls} call${baseline.calls === 1 ? "" : "s"}, max ${(baseline.maxLatency/1000).toFixed(1)}s)`}
                    />
                  )}
                  {/* FEATURE: MI-72b — replaces the byKind capability-type breakdown (known
                      placeholder, S-MI-20) with the real per-agent, per-pattern breakdown added by
                      MI-72a. PATTERN_NAME is the same lookup RoutingActivityLine already uses for
                      Agent Routing's pattern labels — one source of truth platform-wide, falls back
                      to the raw slug for anything not yet in PATTERN_CATALOG. No byModel sub-rows
                      here (byPattern has no byModel sub-bucket) — out of scope to add one. */}
                  {stats?.byPattern && Object.entries(stats.byPattern)
                    .sort((a, b) => (b[1].avgLatency || 0) - (a[1].avgLatency || 0))
                    .map(([patternSlug, p]) => (
                      <LatencyStatRow
                        key={patternSlug}
                        label={PATTERN_NAME[patternSlug] || patternSlug}
                        valueNumber={p.avgLatency != null ? (p.avgLatency/1000).toFixed(1) : "—"}
                        restText={`${p.avgLatency != null ? "s avg" : ""} (${p.calls} call${p.calls === 1 ? "" : "s"}${p.latencyCount > 1 ? `, max ${(p.maxLatency/1000).toFixed(1)}s` : ""})`}
                      />
                    ))}
                </div>
              )}
            </div>
          );
        })}
        {potentialIds.map(id => {
          const agent = agentById(id);
          if (!agent) return null;
          return (
            <div key={id} style={{display:"flex",alignItems:"center",gap:8,opacity:0.38}}>
              <AgentAvatar who={agent.id} size={24}/>
              <div style={{display:"flex",flexDirection:"column"}}>
                <span style={{fontFamily:body,fontSize:12,fontWeight:600,color:T.ink}}>{agent.name}</span>
                <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{agent.role} · not yet used on this screen</span>
              </div>
            </div>
          );
        })}
      </Drawer>
      {/* FEATURE: MI-15 — Data Sources drawer, read-only reference list of the Data Room's
          available data (John: "just like a real library index card booth" — explicitly not
          interactive/clickable). Reuses the same Drawer shell as Learned Context/Agents above.
          FEATURE: MI-22 — regrouped into Sourced (pinned top) + Simulation (sub-grouped by
          category, alphabetical by raw category string). Analysis moved to its own Drawer below. */}
      <Drawer title="Data Sources" count={`${sourced.length + simulationTotal} dataset${sourced.length + simulationTotal === 1 ? "" : "s"} · ${sourced.length} sourced · ${simulationTotal} simulation`}>
        {sourced.length === 0 && simulationTotal === 0 ? (
          <div style={{fontFamily:body,fontSize:12,color:T.muted,fontStyle:"italic"}}>
            No Data Room content loaded yet.
          </div>
        ) : (
          <>
            {sourced.length > 0 && (
              <>
                {/* FEATURE: MI-26 — section-header fontSize bumped to 12.5 to match row title size */}
                <div style={{fontFamily:mono,fontSize:12.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.ink}}>Sourced ({sourced.length})</div>
                {sourced.map(row => <DataSourceRow key={row.id} row={row}/>)}
              </>
            )}
            {simulationTotal > 0 && (
              <>
                <div style={{fontFamily:mono,fontSize:12.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.ink}}>Simulation ({simulationTotal})</div>
                {simulationCategories.map(cat => (
                  <div key={cat} style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{fontFamily:mono,fontSize:12.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.ink}}>
                      {SIMULATION_CATEGORY_LABELS[cat] ?? cat} ({simulationByCategory[cat].length})
                    </div>
                    {simulationByCategory[cat].map(row => <DataSourceRow key={row.id} row={row}/>)}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </Drawer>

      {/* FEATURE: MI-22 — Analysis pulled out into its own sibling Drawer, same AuditColumn
          wrapper/shell: interpretive content layered on top of Sourced/Simulation's raw Data
          Room material, conceptually distinct (John's design-session call). */}
      <Drawer title="Analysis" count={`${analysis.length} item${analysis.length === 1 ? "" : "s"}`}>
        {analysis.length === 0 ? (
          <div style={{fontFamily:body,fontSize:12,color:T.muted,fontStyle:"italic"}}>
            No analysis content yet.
          </div>
        ) : analysis.map(row => <DataSourceRow key={row.id} row={row}/>)}
      </Drawer>
      <Drawer title="Agent Reasoning" count={`${learned.length} pattern${learned.length === 1 ? "" : "s"}`}>
        {learned.length === 0 ? (
          <div style={{fontFamily:body,fontSize:12,color:T.muted,fontStyle:"italic"}}>
            No patterns synthesized yet. When a correction or opinion is confirmed, it's written here as reusable reasoning.
          </div>
        ) : learned.map(entry => {
          const author = agentById(entry.agent_id);
          return (
            <div key={entry.id} style={{borderLeft:`3px solid ${T.brass}`,paddingLeft:10,display:"flex",flexDirection:"column",gap:4}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                {author && <AgentAvatar who={author.id} size={20}/>}
                <span style={{fontFamily:body,fontSize:11.5,fontWeight:600,color:T.ink}}>{author ? author.name : entry.agent_id}</span>
                {entry.confidence && (
                  <span style={{fontFamily:mono,fontSize:9,color:T.muted,textTransform:"uppercase"}}>{entry.confidence} confidence</span>
                )}
              </div>
              {entry.source_question && (
                <div style={{fontFamily:mono,fontSize:9,color:T.muted,fontStyle:"italic"}}>&ldquo;{shapeForLog(entry.source_question, 100)}&rdquo;</div>
              )}
              <div style={{fontFamily:body,fontSize:11.5,color:T.ink}}>{shapeForLog(entry.content, 220)}</div>
            </div>
          );
        })}
      </Drawer>
    </>
  );
}

// FEATURE: MI-04/MI-01d — Pipeline Log: real event log driven by actual agent calls (Intent
// Routing, Q&A Answer, Proofreader pass/block/revise incl. real retry hand-off, AI - Hypothesis Test,
// Memory Consolidation, Data Integrity Patch proposal/resolution, Failure Triage).
// FEATURE: MI-45 — slimmed to the Agent Routing drawer only (RoutingEventRow, shared with mobile's
// pinned feed) plus AuditDrawersBody for the remaining four drawers — net-zero visual change,
// extraction only (STYLE-GUIDE.md §21).
function AuditColumn({ events, agentActivity, onAgentsDrawerOpen }) {
  const agents = useAgents();
  const agentById = (id) => agents.find(a => a.id === id);
  const ordered = [...events].reverse(); // newest event on top, confirmed with John
  const hops = groupEventsIntoHops(ordered); // FEATURE: CHI-04 — compute once, reuse for count + render. FEATURE: CHI-03c — was groupEventsIntoTurns()/turns.
  const realHopCount = hops.filter(h => !h.isBoundary).length; // FEATURE: CHI-04 — drawer count badge excludes boundary rows

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,position:"relative"}}>
      <FeatureBadge id="MI-17"/>
      <FeatureBadge id="MI-06"/>
      <FeatureBadge id="MI-18"/>
      <FeatureBadge id="MI-15"/>
      <FeatureBadge id="MI-21"/>
      <FeatureBadge id="MI-22"/>
      <FeatureBadge id="MI-30"/>
      <FeatureBadge id="MI-31"/>
      <FeatureBadge id="CHI-27"/>
      <FeatureBadge id="CHI-28"/>
      <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.muted}}>Focus Area Audit</div>
      {/* FEATURE: MI-55 — resizable opt-in, Agent Routing only */}
      {/* FEATURE: CHI-01 — Drawer count switches from "N events" to "N hops" (John's explicit
          call: a new line should mean a hand-off, not an activity). FEATURE: CHI-03c — was "turns".
          FEATURE: CHI-04 — count excludes question_boundary marker rows (realHopCount). */}
      <Drawer title="Agent Routing" count={`${realHopCount} hop${realHopCount === 1 ? "" : "s"}`} defaultOpen={true} maxHeight={280} resizable>
        {ordered.length === 0 ? (
          <div style={{fontFamily:body,fontSize:12,color:T.muted}}>{AGENT_ROUTING_EMPTY_TEXT}</div>
        ) : hops.map(hop =>
            hop.isBoundary
              ? <QuestionDivider key={hop.events[0].id} evt={hop.events[0]}/>
              : <RoutingHopCard key={hop.events[hop.events.length - 1].id} hop={hop} agentById={agentById}/>
          )}
      </Drawer>
      <AuditDrawersBody agents={agents} agentActivity={agentActivity} onAgentsDrawerOpen={onAgentsDrawerOpen}/>
    </div>
  );
}

// FEATURE: MI-22 — shared per-row card markup for the Data Sources / Analysis drawers, unchanged
// visually from S-MI-15 (title, badge, who-tag, category line, metadata line) — only extracted so
// it can be reused across the three new render paths (Sourced, each Simulation sub-group, Analysis)
// without a second describeDataType() call site; label/color/whoTag come from groupDataSources()'s
// already-computed `_display`.
function DataSourceRow({ row }) {
  const { label, color, whoTag } = row._display;
  const meta = [row.geo, row.program_area, row.period, row.partner_id].filter(Boolean).join(" · ");
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4,paddingBottom:10,borderBottom:`1px dashed ${T.lineSoft}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        {/* FEATURE: MI-25 — row title/section-header color weighting swapped (John's request) */}
        {/* FEATURE: MI-26 — row title fontWeight dropped to 400 (normal), now matches section-header fontSize */}
        <span style={{fontFamily:body,fontSize:12.5,fontWeight:400,color:T.muted}}>{row.title}</span>
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          <span style={{fontFamily:mono,fontSize:9,padding:"2px 7px",border:`1px solid ${color}`,color}}>{label}</span>
          {whoTag && <span style={{fontFamily:mono,fontSize:8,color:T.muted}}>· {whoTag}</span>}
        </div>
      </div>
      {row.category && (
        <span style={{fontFamily:mono,fontSize:9,color:T.muted,textTransform:"uppercase"}}>{row.category}</span>
      )}
      {meta && (
        <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{meta}</span>
      )}
    </div>
  );
}

// FEATURE: MI-45 — noMinHeight is an additive, default-false prop; desktop's call site never
// passes it, so minHeight stays exactly 420 there (zero desktop change). Originally passed by
// MobileBody's non-bare InteractColumn call so the chat card could shrink below 420px on a short
// mobile viewport instead of squeezing the pinned Agent Routing feed toward zero height.
// FEATURE: MI-51 — MobileBody now calls InteractColumn with `bare` instead (Task 1d), which never
// applies the 420px minHeight in the first place — noMinHeight is unused by any call site as of
// this session, kept on the signature for any future non-bare-but-height-constrained caller.
// FEATURE: MI-51 — bare prop added: when true (mobile's Chat tab), renders only the message-scroll
// region + its own input row, no outer bordered card/avatar-name-caption header/AgentWorkingIndicator
// (MobileBody renders the permanent status strip and input/Clear separately, tab-independent). When
// bare is falsy (every pre-existing call site — desktop's grid), behavior is byte-identical to before.
function InteractColumn({ messages, loading, workingStatus, onSubmit, onReview, onGoodThanks, onClear, noMinHeight, bare, qaEvidence }) {
  const agents = useAgents();
  const marcus = agents.find(a => a.id === "marcus");
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  // FEATURE: CHI-30 — reuses WelcomeSplash.jsx's existing sessionStorage flag (read-only, no new
  // key): unset means this is the user's genuine first load this tab session (splash showing) —
  // deterministic default. Already set means a later refresh in this same tab, or Clear (which can
  // only be reached after the splash was already dismissed) — always randomize.
  const [rotation, setRotation] = useState(() => {
    const seenSplash = typeof sessionStorage !== "undefined" && sessionStorage.getItem("db_splash_dismissed");
    return seenSplash ? splitRotation(ROTATING_POOL, shuffleArray) : splitRotation(ROTATING_POOL, arr => arr);
  });
  // FEATURE: CHI-30 — re-rolls only on the >0-to-0 transition (a real Clear), not on every render
  // while messages stays empty, and not redundantly on the initial mount (already handled above).
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (prevMessageCountRef.current > 0 && messages.length === 0) {
      setRotation(splitRotation(ROTATING_POOL, shuffleArray));
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  const visibleQuestions = [
    rotation.picks[0], STATIC_QUESTION, rotation.picks[1], rotation.picks[2],
    rotation.picks[3], rotation.picks[4], rotation.picks[5],
  ];
  const drawerQuestions = [...rotation.leftover, ...FIXED_DRAWER_TAIL];

  // FEATURE: MI-64 — tracks whether the user has manually scrolled away from the bottom, same
  // pattern as FetchContext.jsx's fetchUserScrolledRef/scrollToLatest (Agent Fetch feed) — auto-scroll
  // below respects this so a user reading earlier history isn't yanked back down.
  const userScrolledRef = useRef(false);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    userScrolledRef.current = !atBottom;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolledRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, workingStatus]);

  const submit = (text) => {
    const clean = (text || "").trim();
    if (!clean || loading || !marcus) return;
    setInput("");
    onSubmit(clean);
  };

  const messageList = (
    <div ref={scrollRef} onScroll={handleScroll} style={{flex:1,overflowY:"auto",padding:16,minHeight:0}}>
      {messages.length === 0 ? (
        <div>
          <div style={{fontFamily:body,fontSize:13,color:T.ink,lineHeight:1.6,marginBottom:16}}>
            Ask a question, run a theory, forecast a trend, correct the record, or escalate for deeper
            research — five ways to work with the Data Room. Start with a real question below, or try one
            of these:
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {visibleQuestions.map(q => (
              <button key={q.id} onClick={() => submit(q.label)} disabled={loading}
                style={{textAlign:"left",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:"10px 12px",fontFamily:body,fontSize:12.5,color:T.ink,cursor:loading?"default":"pointer"}}>
                {q.label}
              </button>
            ))}
          </div>
          <div style={{marginTop:8}}>
            {/* FEATURE: CHI-30 — drawer count is always 16 (4 rotation leftovers + fixed 12-tail) */}
            <Drawer title={`Browse ${drawerQuestions.length} more example questions`} count={drawerQuestions.length} maxHeight={220}>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {drawerQuestions.map(q => (
                  <button key={q.id} onClick={() => submit(q.label)} disabled={loading}
                    style={{textAlign:"left",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:"10px 12px",fontFamily:body,fontSize:12.5,color:T.ink,cursor:loading?"default":"pointer"}}>
                    {q.label}
                  </button>
                ))}
              </div>
            </Drawer>
          </div>
        </div>
      ) : (
        messages.map((m, i) => <MessageBubble key={i} msg={m} index={i} onReview={onReview} onGoodThanks={onGoodThanks} qaEvidence={qaEvidence}/>)
      )}
      {!bare && workingStatus && <AgentWorkingIndicator key={workingStatus.startedAt} message={workingStatus.message} startedAt={workingStatus.startedAt} turnStartedAt={workingStatus.turnStartedAt} expectation={workingStatus.expectation}/>}
    </div>
  );

  // FEATURE: MI-51 — bare mode renders ONLY the message list, no embedded input row: the question
  // box/Send is now a single permanent element owned by MobileBody (Task 1d), shown regardless of
  // active tab, not duplicated per-tab. (Live-verified this session: rendering an input row here too
  // produced two stacked "Ask about channel performance…" boxes on the Chat tab — fixed by dropping
  // it here entirely; `input`/`setInput`/`submit` above are unused in this branch as a result, kept
  // on the component for the non-bare branch below.)
  if (bare) {
    return (
      <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
        {messageList}
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,minHeight:0,flex:1}}>
      {/* FEATURE: CHI-03a — column rename "Interact" -> "Chat" */}
      <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.brass}}>Chat</div>
      <div style={{background:"#fffdf8",border:`1px solid ${T.line}`,borderRadius:3,position:"relative",display:"flex",flexDirection:"column",flex:1,minHeight: noMinHeight ? 0 : 420}}>
        <Corners/>
        <FeatureBadge id="MI-64"/>
        <FeatureBadge id="CHI-30"/>
        <div style={{padding:"13px 16px",borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",gap:10}}>
          {marcus && <AgentAvatar who={marcus.id} size={28}/>}
          <div>
            <div style={{fontFamily:display,fontSize:13,fontWeight:600,color:T.navy}}>{marcus ? marcus.name : "GEO CSO Expert"}</div>
            <div style={{fontFamily:mono,fontSize:9.5,color:T.muted}}>Channel Intelligence · Q&A · Theory · Forecast · Correct · Escalate</div>
          </div>
        </div>
        {messageList}
        <div style={{padding:"10px 14px",borderTop:`1px solid ${T.line}`,display:"flex",alignItems:"center",gap:8}}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(input); }}
            placeholder="Ask about channel performance…"
            disabled={loading}
            style={{flex:1,padding:"9px 12px",border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:13,background:T.card,color:T.ink}}
          />
          <button onClick={() => submit(input)} disabled={loading || !input.trim()}
            style={{padding:"9px 16px",background:T.navy,color:T.card,border:"none",fontFamily:body,fontSize:13,cursor:loading?"default":"pointer"}}>
            Send
          </button>
          {/* FEATURE: MI-57 — desktop Clear control, style reused verbatim from MobileBody's Clear
              link (~line 1705, MI-51/MI-56) — same font/size/color/casing/cursor, no new visual
              pattern. Wired to the same onClear handler MobileBody already uses; reset semantics
              (messages/hypFlow/workingStatus, no confirm dialog) unchanged. */}
          <button onClick={onClear} style={{background:"none",border:"none",color:T.muted,fontFamily:mono,fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",cursor:"pointer",flexShrink:0,padding:"0 2px"}}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

// FEATURE: MI-51 — mobile composition (STYLE-GUIDE.md §21, superseding S-MI-45's overlay pattern):
// Chat and Evidence are a permanent tab bar (Evidence disabled until a theory flow is active, then
// flashes on unseen content — symmetric with Chat flashing when a new answer lands while on Evidence).
// Elapsed/expect/agent-status is a permanent strip under either tab (fixes the 30s dead-air bug: the
// one progress indicator that existed lived inside chat's scrollback, invisible the instant the old
// Evidence overlay covered it). Question box/Send/Clear are permanent, reachable regardless of tab.
// Agent Routing feed stays pinned/bottom, unchanged content/behavior (MI-50's scroll-hint relocated,
// not reimplemented). "Agent & Data Info" (renamed from "Activity") moves to the page-title row —
// showAgentInfo/setShowAgentInfo are now owned by the parent (Task 1a) so the trigger button can live
// there instead of inside this component.
function MobileBody({ messages, loading, workingStatus, onSubmit, onReview, onGoodThanks, onClear, hypFlow, qaEvidence, onIntentChange, onSelectHypothesis, onDiscard, onCommit, onResolveConfirmation, events, agentActivity, showAgentInfo, setShowAgentInfo, onAgentsDrawerOpen }) {
  const [mobileTab, setMobileTab] = useState("chat");
  const [chatUnseen, setChatUnseen] = useState(false);
  const [evidenceUnseen, setEvidenceUnseen] = useState(false);
  const agents = useAgents();
  const agentById = (id) => agents.find(a => a.id === id);
  // FEATURE: CHI-03c — was `hasActiveFlow = !!hypFlow`, blind to CHI-03a's qaEvidence: a plain Q&A
  // the user never escalates into a hypothesis flow now has real content in Evidence (qaEvidence)
  // that this gate/flash logic was completely unaware of. Every use of the old hasActiveFlow below
  // (tab-enabled gate, auto-switch-to-evidence trigger, flash-dot gate, selectTab's own gate) is
  // renamed to this corrected name.
  const hasEvidenceContent = !!qaEvidence || !!hypFlow;
  const ordered = [...events].reverse();

  const prevMsgCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMsgCount.current && mobileTab !== "chat") setChatUnseen(true);
    prevMsgCount.current = messages.length;
  }, [messages.length, mobileTab]);

  // FEATURE: CHI-03c — was keyed on hypFlow.stage alone, so a plain Q&A that only ever sets
  // qaEvidence (never starting a hypothesis flow) never flashed/enabled the Evidence tab. Now also
  // flags unseen content the moment qaEvidence itself changes (a new answer landing), independent
  // of whether hypFlow exists at all.
  const prevStage = useRef(hypFlow?.stage);
  const prevQaEvidence = useRef(qaEvidence);
  useEffect(() => {
    if ((qaEvidence !== prevQaEvidence.current || (hypFlow && hypFlow.stage !== prevStage.current)) && mobileTab !== "evidence") {
      setEvidenceUnseen(true);
    }
    prevQaEvidence.current = qaEvidence;
    prevStage.current = hypFlow?.stage;
  }, [qaEvidence, hypFlow?.stage, mobileTab]);

  // FEATURE: MI-51 — Evidence auto-activates (switches to the active tab) the moment a theory flow
  // starts (hasEvidenceContent false -> true, i.e. right when the user clicks "Have Priya... generate a
  // few theories ->"), so the live elapsed/expect status strip is immediately visible without an
  // extra manual tap. This is a one-time switch at flow start, not on every stage change — the user
  // can freely navigate back to Chat mid-generation (status strip stays visible either way, Evidence
  // flashes via the effect above once new content is ready).
  const prevHasFlow = useRef(hasEvidenceContent);
  useEffect(() => {
    if (hasEvidenceContent && !prevHasFlow.current) {
      setMobileTab("evidence");
      setEvidenceUnseen(false);
    }
    prevHasFlow.current = hasEvidenceContent;
  }, [hasEvidenceContent]);

  const selectTab = (tab) => {
    if (tab === "evidence" && !hasEvidenceContent) return;
    setMobileTab(tab);
    if (tab === "chat") setChatUnseen(false);
    if (tab === "evidence") setEvidenceUnseen(false);
  };

  // FEATURE: MI-50 — bottom-edge scroll affordance for the pinned Agent Routing feed.
  // FEATURE: CHI-29 — now backed by the shared useScrollFadeHint hook (SharedUI.jsx), extracted so
  // this mechanism isn't reimplemented by hand at the new Column 2 call site.
  const routingFeedRef = useRef(null);
  const { canScrollMore: routingCanScrollMore, onScroll: checkRoutingScroll } = useScrollFadeHint(routingFeedRef, [ordered.length]);

  const tabStyle = (active, disabled) => ({
    flex:1, padding:"9px 6px", fontFamily:mono, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em",
    background: active ? "rgba(182,135,58,.07)" : "transparent",
    color: disabled ? T.line : (active ? T.navy : T.muted),
    border:"none", borderBottom:`2.5px solid ${active ? T.brass : "transparent"}`,
    cursor: disabled ? "not-allowed" : "pointer",
    display:"flex", alignItems:"center", justifyContent:"center", gap:6,
  });
  const flashDot = { width:5, height:5, borderRadius:"50%", background:T.brass, animation:"aiBlink 1.3s ease-in-out infinite" };
  const overlayHeadStyle = {flexShrink:0,background:T.navy,color:T.card,padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`3px solid ${T.brass}`};
  const backBtnStyle = {fontFamily:mono,fontSize:10,letterSpacing:"0.04em",textTransform:"uppercase",color:T.brassLight,border:"1px solid rgba(228,199,134,.4)",background:"transparent",padding:"5px 10px",cursor:"pointer"};

  return (
    <div style={{position:"relative",flex:1,minHeight:0,display:"flex",flexDirection:"column",gap:8}}>

      <div style={{display:"flex",flexShrink:0,background:T.card,borderBottom:`1px solid ${T.line}`}}>
        <button onClick={() => selectTab("chat")} style={tabStyle(mobileTab==="chat", false)}>
          Chat {chatUnseen && mobileTab!=="chat" && <span style={flashDot}/>}
        </button>
        {/* FEATURE: CHI-03a — column rename "Evidence" -> "Evidence & Interaction".
            FEATURE: CHI-03c — tab-disabled gate and flash-dot gate now key off hasEvidenceContent
            (qaEvidence || hypFlow), not hypFlow alone -- this was the real gap: a plain Q&A-only
            qaEvidence answer left the Evidence tab disabled and never flashing on mobile, even
            though real content was sitting there. Fixed here, see STYLE-GUIDE.md §21's amendment. */}
        <button onClick={() => selectTab("evidence")} style={tabStyle(mobileTab==="evidence", !hasEvidenceContent)}>
          Evidence & Interaction {hasEvidenceContent && evidenceUnseen && mobileTab!=="evidence" && <span style={flashDot}/>}
        </button>
      </div>

      <div style={{flex:1,minHeight:0,display:"flex",flexDirection:"column"}}>
        {mobileTab === "chat" ? (
          <InteractColumn messages={messages} loading={loading} onSubmit={onSubmit} onReview={onReview} onGoodThanks={onGoodThanks} qaEvidence={qaEvidence} bare/>
        ) : (
          <div style={{flex:1,minHeight:0,overflowY:"auto",padding:14}}>
            <EvidenceColumn hypFlow={hypFlow} qaEvidence={qaEvidence} onIntentChange={onIntentChange} onSelectHypothesis={onSelectHypothesis} onDiscard={onDiscard} onCommit={onCommit} onResolveConfirmation={onResolveConfirmation} onGoodThanks={onGoodThanks} onReview={onReview}/>
          </div>
        )}
      </div>

      {workingStatus && (
        <div style={{flexShrink:0,padding:"8px 14px",background:"#fbf6ea",borderTop:`1px solid ${T.lineSoft}`}}>
          <AgentWorkingIndicator key={workingStatus.startedAt} message={workingStatus.message} startedAt={workingStatus.startedAt} turnStartedAt={workingStatus.turnStartedAt} expectation={workingStatus.expectation}/>
        </div>
      )}

      {/* FEATURE: MI-56 — merged input+Send+Clear into one row (was two stacked rows, Clear read as a
          stray orphaned element on its own near-empty row underneath). See STYLE-GUIDE.md §21's
          2026-07-14 MI-56 amendment: divider does double duty as visual grouping + accidental-tap
          mitigation for the no-confirm-dialog Clear action (that S-MI-51 decision unchanged here). */}
      <div style={{flexShrink:0,padding:"9px 14px 8px",display:"flex",alignItems:"center",gap:8,background:T.card,borderTop:`1px solid ${T.line}`}}>
        <input id="mobile-chat-input" placeholder="Ask about channel performance…" disabled={loading}
          onKeyDown={e => { if (e.key === "Enter") { onSubmit(e.target.value); e.target.value = ""; } }}
          style={{flex:1,padding:"9px 12px",border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:13,background:T.card,color:T.ink}}/>
        <button onClick={() => { const el = document.getElementById("mobile-chat-input"); onSubmit(el.value); el.value = ""; }} disabled={loading}
          style={{padding:"9px 16px",background:T.navy,color:T.card,border:"none",fontFamily:body,fontSize:13,cursor:loading?"default":"pointer",flexShrink:0}}>
          Send
        </button>
        {/* FEATURE: MOB-001 — Clear's mobile tap target measured 36×13px live (confirmed, mobile-ui-audit-0717)
            -- reused desktop's MI-57 mouse-oriented sizing verbatim, never given real touch-target padding
            when adapted for mobile (MI-56). Vertical padding now matches Send's own 9px in this same row
            (visual consistency, not an arbitrary new number) -- real height goes from ~13px to ~30px+.
            Font size, color, weight, and the no-confirm-dialog Clear behavior are all unchanged. */}
        <div style={{width:1,alignSelf:"stretch",background:T.lineSoft,flexShrink:0}}/>
        <button onClick={onClear} style={{background:"none",border:"none",color:T.muted,fontFamily:mono,fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",cursor:"pointer",flexShrink:0,padding:"9px 10px"}}>
          Clear
        </button>
      </div>

      {/* FEATURE: CHI-25 — height 118->176: the old height only ever showed one hop card
          (often not even a full one), so the existing MI-50 fade/chevron sat below something
          that already looked complete rather than visibly cut off. 176px was measured live
          against a real 6-hop mobile Q&A chain to show one full hop plus a visibly truncated
          second hop, so the cut-off card itself signals scrollability, not just the fade. */}
      <div style={{flexShrink:0,height:176,background:T.cardAlt,border:`1px solid ${T.lineSoft}`,display:"flex",flexDirection:"column",position:"relative"}}>
        <div style={{flexShrink:0,padding:"6px 10px",display:"flex",alignItems:"center",gap:6,borderBottom:`1px solid ${T.lineSoft}`}}>
          <span style={{width:5,height:5,borderRadius:"50%",background:T.brass,animation:"aiBlink 1.3s ease-in-out infinite"}}/>
          <span style={{fontFamily:mono,fontSize:8.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:T.muted}}>Agent Routing · Live</span>
        </div>
        <div ref={routingFeedRef} onScroll={checkRoutingScroll} style={{flex:1,minHeight:0,overflowY:"auto",padding:"7px 10px",display:"flex",flexDirection:"column",gap:6}}>
          {/* FEATURE: CHI-01 — hop-grouped cards, same shared render path as desktop's AuditColumn. FEATURE: CHI-03c — was "turn-grouped". */}
          {ordered.length === 0
            ? <div style={{fontFamily:body,fontSize:11,color:T.muted}}>{AGENT_ROUTING_EMPTY_TEXT}</div>
            : groupEventsIntoHops(ordered).map(hop => <RoutingHopCard key={hop.events[hop.events.length - 1].id} hop={hop} agentById={agentById}/>)}
        </div>
        <ScrollFadeHint show={routingCanScrollMore} bg={T.cardAlt}/>
      </div>

      {showAgentInfo && (
        <div style={{position:"absolute",inset:0,background:T.paperDeep,zIndex:5,display:"flex",flexDirection:"column"}}>
          <div style={overlayHeadStyle}>
            <span style={{fontFamily:display,fontSize:15,fontWeight:600}}>Agent &amp; Data Info</span>
            <button onClick={()=>setShowAgentInfo(false)} style={backBtnStyle}>← Back to Chat</button>
          </div>
          <div style={{flex:1,minHeight:0,overflowY:"auto",padding:14}}>
            <AuditDrawersBody agentActivity={agentActivity} agents={agents} onAgentsDrawerOpen={onAgentsDrawerOpen}/>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarketIntelligenceScreen() {
  const isMobile = useIsMobile(); // FEATURE: MI-45
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hypFlow, setHypFlow] = useState(null);
  // FEATURE: CHI-03a — holds the most recent Q&A answer's Evidence-displayable content, independent
  // of hypFlow (a plain Q&A the user never escalates into a hypothesis flow still needs somewhere to
  // live in Evidence — hypFlow alone can't carry it, since it may never exist). Cleared only by
  // onClear() below, not replaced by a new hypFlow.
  const [qaEvidence, setQaEvidence] = useState(null);
  const [pipelineEvents, setPipelineEvents] = useState([]);
  // FEATURE: CHI-03c — mirrors pipelineEvents synchronously (updated inside logEvent's own
  // setPipelineEvents updater, same tick) so hopStart/hopEnd capture inside the async
  // runQaWithQualityGate/runHypothesisTest/ack-call chains always reads the true current count,
  // never a stale value from the closure captured when that async function started.
  const pipelineEventsRef = useRef([]);
  const [workingStatus, setWorkingStatus] = useState(null); // { message, startedAt, turnStartedAt, expectation, kind } | null
  // FEATURE: MI-51 — showAgentInfo lifted here (was MobileBody-local showActivity) so the trigger
  // button can live in the shared page-title block (Task 1b) instead of inside MobileBody.
  const [showAgentInfo, setShowAgentInfo] = useState(false);
  // FEATURE: MI-72b — bumping this on Agents-drawer open forces useAgentActivitySummary() to
  // re-fetch fresh data instead of showing whatever was loaded once at page mount.
  const [agentsRefreshKey, setAgentsRefreshKey] = useState(0);
  // FEATURE: MI-35 — lifted from AuditColumn so it's available at every setWorkingStatus( call
  // site below, not just inside AuditColumn.
  const agentActivity = useAgentActivitySummary(PROPOSED_MI_AGENT_IDS, MI_LOOP_SCOPE, 'global', agentsRefreshKey);
  const onAgentsDrawerOpen = () => setAgentsRefreshKey(k => k + 1); // FEATURE: MI-72b
  const agents = useAgents(); // FEATURE: MI-42 -- needed here for describeDelegationEvent()'s name resolution

  // FEATURE: MI-51 — Clear resets chat + any active flow back to the seed-question empty state,
  // same end state as a page refresh, no confirm dialog (this session's explicit design decision).
  const onClear = () => {
    clearGenerationRef.current += 1; // FEATURE: CHI-04 — invalidates every in-flight request's result
    setMessages([]);
    setHypFlow(null);
    setQaEvidence(null); // FEATURE: CHI-03a
    setWorkingStatus(null);
    setPipelineEvents([]); // FEATURE: CHI-04 — Agent Routing (Column 3) now resets with everything else
    pipelineEventsRef.current = []; // FEATURE: CHI-03c — must reset alongside setPipelineEvents([]) above, or the hop-count ref stays stale and the next question's hop badges start from the wrong number
    pendingDelegationsRef.current = new Map(); // FEATURE: CHI-04 — stale pending-delegation markers would otherwise mis-target a future event once ids restart from 0
  };

  // FEATURE: MI-42 -- one shared status-setter for both MI-41's macro-hop swaps (explicit calls
  // below) and this session's live micro-hop delegation events (via onDelegationProgress, forwarded
  // into every callCapability() call as onProgress) -- both write the same workingStatus, so they
  // can never drift into two different timers.
  const setStatus = (message, { expectation, kind = 'scripted' } = {}) =>
    setWorkingStatus(prev => ({
      message,
      startedAt: Date.now(),
      turnStartedAt: prev?.turnStartedAt ?? Date.now(),
      expectation: expectation !== undefined ? expectation : (prev?.expectation ?? null),
      kind,
    }));
  // FEATURE: MI-52 -- tracks still-pending in-flight delegation/delegation_return rows, keyed by the
  // agent expected to produce the real completion event (correlation's own awaitingAgentId). Map<
  // awaitingAgentId, { id, key } >. Not React state -- purely an internal bookkeeping side-table for
  // logEvent's own replace-in-place check below, never read for rendering.
  const pendingDelegationsRef = useRef(new Map());

  // FEATURE: CHI-04 — bumped by onClear() above; every in-flight async call captures the value at
  // its own start and checks it again after each await ("isStale()", below) to detect a Clear that
  // fired while it was running. Not React state — never read for rendering, purely a cancellation
  // token, same pattern pendingDelegationsRef already uses for non-rendering bookkeeping.
  const clearGenerationRef = useRef(0);

  // FEATURE: MI-52 -- logEvent gained a second, additive call shape: logEvent(evt, { replaces }),
  // where replaces = { key, awaitingAgentId }. When supplied (only onDelegationProgress does this,
  // below), the pushed row is registered as still-pending under that key instead of being final.
  // Every other, pre-existing call site keeps calling logEvent(evt) with no options -- unchanged --
  // but that plain path now also checks whether its own evt.agentId satisfies a still-pending row's
  // awaitingAgentId; if so, it splices/updates that row in place (same array index, same id) instead
  // of appending a new one, and clears the pending marker. A pending row that's never claimed (e.g.
  // an error path with no follow-up for that agent) simply stays in the array forever, unmodified --
  // never silently removed, per this task's design rule.
  // FEATURE: CHI-23 — `next` is now computed synchronously against `pipelineEventsRef.current`
  // (the source of truth) BEFORE setPipelineEvents is ever called, and the ref is assigned
  // immediately, in plain JS, not inside the callback React passes to setPipelineEvents. The old
  // version assumed React invokes that callback the instant setPipelineEvents is called; that's
  // not guaranteed (same defect shape as STANDARDS.md Section 8's BUG-3), and a currentHopCount()
  // read with no intervening await could see a ref that hadn't picked up the most recent push yet.
  // setPipelineEvents now receives the already-computed array directly instead of an updater function.
  const logEvent = (evt, { replaces } = {}) => {
    const prev = pipelineEventsRef.current;
    let next;
    if (replaces) {
      const id = prev.length;
      pendingDelegationsRef.current.set(replaces.awaitingAgentId, { id, key: replaces.key });
      next = [...prev, { ...evt, id }];
    } else {
      const pending = pendingDelegationsRef.current.get(evt.agentId);
      if (pending) {
        pendingDelegationsRef.current.delete(evt.agentId);
        next = prev.map(e => (e.id === pending.id ? { ...evt, id: pending.id } : e));
      } else {
        next = [...prev, { ...evt, id: prev.length }];
      }
    }
    pipelineEventsRef.current = next;
    setPipelineEvents(next);
  };

  // FEATURE: MI-47 -- also logs every live handoff as its own permanent Agent Routing drawer row
  // (describePipelineEvent's new "delegation"/"delegation_return" cases), alongside the pre-existing
  // coarse checkpoint events -- additive only, does not replace/dedupe any existing event type.
  // FEATURE: MI-52 -- that row is no longer permanent once a real outcome lands: it's logged via
  // logEvent's new { replaces } shape, keyed on evt.toAgentId (the agent who will produce the real
  // completion -- for 'delegation' that's who the hand-off is going TO; for 'delegation_return',
  // per api/capabilities/execute.js's non-terminal loop-continuation path, it's the agent whose turn
  // resumes next, e.g. Owen after Marcus's retry-via-Marcus hop). The next event logged for that
  // agentId (any ordinary logEvent(evt) call, unmodified elsewhere in this file) replaces this row
  // in place instead of sitting duplicated above it.
  const onDelegationProgress = (evt) => {
    const message = describeDelegationEvent(evt, agents);
    setStatus(message, { kind: 'orchestration' });
    const correlationKey = `${evt.fromAgentId}:${evt.toAgentId}:${evt.viaTool || ''}`;
    logEvent(buildHopEvent(evt.type, evt.fromAgentId, { message, viaTool: evt.viaTool || null }, null, { secondaryAgentId: evt.type === 'delegation' ? evt.toAgentId : null }), { replaces: { key: correlationKey, awaitingAgentId: evt.toAgentId } });
  };

  const conversationContext = () =>
    messages.filter(m => typeof m.text === "string").map(m => `${m.role}: ${m.text}`).join("\n");

  const enterHypothesisFlow = async ({ intent, extractedHypothesis, flaggedQuestion, flaggedAnswer, citations, reviewReason }) => {
    const myGeneration = clearGenerationRef.current; // FEATURE: CHI-04
    const isStale = () => clearGenerationRef.current !== myGeneration; // FEATURE: CHI-04
    const onProgress = (evt) => { if (!isStale()) onDelegationProgress(evt); }; // FEATURE: CHI-04
    if (extractedHypothesis) {
      setHypFlow({ stage:"choosing", intent, candidates:null, prefillText:extractedHypothesis, chosenText:null,
        flaggedQuestion, flaggedAnswer, citations: citations || [], reviewReason, hypothesisTest:null, priorHypothesisTest:null, confirmation:null });
      return;
    }
    setHypFlow({ stage:"generating", intent, candidates:null, prefillText:null, chosenText:null,
      flaggedQuestion, flaggedAnswer, citations: citations || [], reviewReason, hypothesisTest:null, priorHypothesisTest:null, confirmation:null });
    const t0 = Date.now();
    {
      const est = estimateChainMs(INTENT_CHAINS.hypothesis_generation, agentActivity);
      setStatus("Priya is generating hypotheses…", { expectation: est != null ? formatExpectation(est) : null });
    }
    try {
      const { hypotheses: candidates, patterns_used } = await generateHypotheses({ flaggedQuestion, flaggedAnswer, reviewReason, isStale });
      if (isStale()) return; // FEATURE: CHI-04
      logEvent(buildHopEvent("hypothesis_generation", "priya", { candidates, patterns_used }, Date.now() - t0));
      setHypFlow(prev => prev && ({ ...prev, stage:"choosing", candidates }));
    } catch (e) {
      // FEATURE: MI-29 -- surface real error to chat + Pipeline Log instead of a silent reset
      console.error("[MarketIntelligenceScreen] generateHypotheses", e.message);
      logEvent(buildHopEvent("error", "priya", { step: "hypothesis_generation", message: e.message }, Date.now() - t0));
      setMessages(prev => [...prev, buildMessage({ kind: "error", text: "Something went wrong generating hypotheses — try again." })]);
      setHypFlow(null);
    } finally {
      setWorkingStatus(null);
    }
  };

  const submit = async (text) => {
    const clean = (text || "").trim();
    if (!clean || loading) return;
    setMessages(prev => [...prev, buildMessage({ role: "user", text: clean })]);
    setLoading(true);
    const myGeneration = clearGenerationRef.current; // FEATURE: CHI-04
    const isStale = () => clearGenerationRef.current !== myGeneration; // FEATURE: CHI-04
    const onProgress = (evt) => { if (!isStale()) onDelegationProgress(evt); }; // FEATURE: CHI-04
    const turnStart = Date.now(); // FEATURE: MI-42 -- captured once, feeds Task 4's final-timeline caption
    // FEATURE: CHI-04 — only when pipelineEvents is non-empty: skipped on the very first question of a
    // fresh session, and naturally skipped right after Clear too (pipelineEvents is already []).
    if (pipelineEvents.length > 0) {
      logEvent(buildHopEvent("question_boundary", null, { timestamp: turnStart }));
    }
    // FEATURE: CHI-23 — the real, current hop total right before this turn's own events start;
    // hopStart for this turn's message is this count + 1 (John's own framing: the label just
    // grabs the final gold number, and for a following question, subtracts the delta from it).
    const hopCountBeforeTurn = currentHopCount(pipelineEventsRef.current);
    setStatus("Marcus is thinking…", { expectation: "expect < 2m" }); // FEATURE: MI-49 -- reverted from "question < 2m"
    try {
      // FEATURE: MI-35 — onEvent still does its existing logEvent(evt) behavior; additionally,
      // once intent_routing resolves to a qa question (a few seconds in, well before the rest of
      // the chain runs), upgrade the ceiling estimate to the real routing-chain-based figure.
      const result = await runIntentPipeline(clean, conversationContext(), (evt) => {
        if (isStale()) return; // FEATURE: CHI-04
        logEvent(evt);
        if (evt.type === "intent_routing" && evt.data.intent === "qa") {
          setWorkingStatus(prev => {
            if (!prev) return prev;
            const est = estimateChainMs(INTENT_CHAINS.qa, agentActivity);
            return est != null ? { ...prev, expectation: formatExpectation(est) } : prev;
          });
        }
      }, setStatus, onProgress, isStale); // FEATURE: CHI-23 — getHopCount param removed, no longer threaded through
      if (isStale()) return; // FEATURE: CHI-04 — Clear fired while this question was in flight; discard silently (finally still runs, harmlessly re-sets already-null loading/workingStatus)
      if (result.kind === "qa") {
        // FEATURE: S-ARCH-DISPLAY-LOOP-01 — plainText stays the plain-text join of the formatted
        // body (headline + paragraphs) so conversationContext()/onReview's flaggedAnswer keep
        // working unchanged (both need a plain string, not the structured card shape).
        const plainText = [result.headline, ...(result.body || []).map(b => b.text)].filter(Boolean).join("\n\n");
        const elapsed = Date.now() - turnStart; // FEATURE: MI-42 -- Task 4's caption reads this
        // FEATURE: CHI-03a — qaEvidence holds the full Q&A payload for EvidenceColumn's
        // QaEvidenceCard (Task 1), independent of hypFlow. keyDataPoints normalized from result's
        // snake_case key_data_points -- QaEvidenceCard's groupKeyDataPoints() call expects the
        // camelCase shape (same convention chat's own message object already used). text/question/
        // citations/review_reason carried through for onReview()'s flaggedAnswer/flaggedQuestion/
        // citations/reviewReason use (previously read off the chat message by index — now read off
        // qaEvidence directly, since onReview/onGoodThanks no longer take a message index).
        setQaEvidence({
          ...result,
          keyDataPoints: result.key_data_points,
          text: plainText, question: clean, citations: result.citations || [],
          totalElapsedMs: elapsed,
          reviewChoice: null,
        });
        // FEATURE: CHI-03a — chat's qa bubble shrinks to a fixed pointer sentence (rendered
        // directly in MessageBubble, not from msg.text); msg.text is deliberately kept as the full
        // plain answer so conversationContext() (which reads m.text for every message) keeps
        // seeing real content for follow-up turns, not just the pointer sentence.
        setMessages(prev => [...prev, buildMessage({
          kind: "qa", text: plainText,
          needsReview: !!result.needs_review, reviewReason: result.review_reason,
          totalElapsedMs: elapsed,
          // FEATURE: CHI-23 — hopEnd read fresh from the gold count here, after every one of this
          // turn's events has posted (not a snapshot taken inside runQaWithQualityGate before it returned).
          hopStart: hopCountBeforeTurn + 1, hopEnd: currentHopCount(pipelineEventsRef.current),
        })]);
      } else if (result.kind === "qa_failed") {
        setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: result.text })]);
      } else if (result.kind === "hyp_entry") {
        setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: `Got it — treating that as a ${INTENT_LABEL[result.intent] || result.intent}. Pick or refine a hypothesis on the right.` })]);
        await enterHypothesisFlow({ intent: result.intent, extractedHypothesis: result.extractedHypothesis, flaggedQuestion: result.flaggedQuestion, flaggedAnswer: null, citations: [], reviewReason: null });
      } else {
        setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: result.text })]);
      }
    } catch (e) {
      setMessages(prev => [...prev, buildMessage({ kind: "error", text: "Something went wrong reaching Marcus — try again." })]);
      console.error("[MarketIntelligenceScreen]", e.message);
    } finally {
      setLoading(false);
      setWorkingStatus(null);
    }
  };

  // FEATURE: CHI-03a — onGoodThanks/onReview now operate on qaEvidence directly (were
  // message-index-based, MI-51) since the review-choice buttons moved from chat into
  // EvidenceColumn's QaEvidenceCard, and there is only ever one "most recent" qaEvidence, not an
  // indexable list.
  const onGoodThanks = () => setQaEvidence(prev => prev && ({ ...prev, reviewChoice: "good" }));

  const onReview = () => {
    if (!qaEvidence) return;
    const { question, text, citations, review_reason } = qaEvidence;
    setQaEvidence(prev => prev && ({ ...prev, reviewChoice: "exploring" }));
    enterHypothesisFlow({ intent:"theory", extractedHypothesis:null, flaggedQuestion: question, flaggedAnswer: text, citations: citations || [], reviewReason: review_reason });
  };

  const onIntentChange = (intent) => setHypFlow(prev => prev && ({ ...prev, intent }));

  // FEATURE: MI-51 — theory testing is no longer auto-fired on selection. Choosing a theory (no
  // second argument, or { startTest: false }) lands on the new "ready" stage showing the chosen
  // theory + an explicit "Have Priya test this theory ->" button; only that button's click passes
  // { startTest: true }, which is when runHypothesisTest() actually runs.
  const onSelectHypothesis = async (text, { startTest } = {}) => {
    if (!hypFlow) return;
    if (!startTest) {
      setHypFlow(prev => prev && ({ ...prev, stage:"ready", chosenText: text }));
      return;
    }
    const myGeneration = clearGenerationRef.current; // FEATURE: CHI-04
    const isStale = () => clearGenerationRef.current !== myGeneration; // FEATURE: CHI-04
    const onProgress = (evt) => { if (!isStale()) onDelegationProgress(evt); }; // FEATURE: CHI-04
    const { intent, flaggedQuestion, flaggedAnswer, hypothesisTest } = hypFlow;
    setHypFlow(prev => ({ ...prev, stage:"testing", chosenText: text }));
    // FEATURE: CHI-03a — no chat push here anymore (was kind:"hyp_submitted"); the submitted
    // theory text is already carried on hypFlow.chosenText (set above) and renders in
    // EvidenceColumn's submitted-theory block (Task 3) once testing starts.
    // FEATURE: CHI-03b — live, Marcus-voiced acknowledgment, tailored to the submitted theory.
    // Fire-and-forget relative to the hypothesis test itself (runHypothesisTest already starts
    // below in the same function) — this call does not block or gate the test starting.
    // FEATURE: CHI-03c — this ack call has no onEvent/logEvent of its own (Scope Rules: do not add
    // one), so hopStart===hopEnd, both the current live hop count -- it shares whatever hop is
    // "current" at the moment it fires, same as every other single-hop, can_request_help:false ack.
    // FEATURE: CHI-23 — removed incorrect "+1"; this ack logs no event of its own, so it shares
    // whatever hop is already current, per this line's own pre-existing comment above.
    const submissionAckHop = currentHopCount(pipelineEventsRef.current);
    callCapability({
      capability_slug: "channel-intelligence", intent_slug: "ci-submission-ack-intent", agent_id: "marcus",
      task_context: { submitted_theory: text },
    }).then(ack => {
      setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: ack.ack_text, hopStart: submissionAckHop, hopEnd: submissionAckHop, totalElapsedMs: Date.now() - turnStart })]);
    }).catch(e => {
      console.error("[MarketIntelligenceScreen] ci-submission-ack-intent", e.message);
      // No user-facing error for this one — it's a nice-to-have narration, not load-bearing;
      // the existing "Priya is running a hypothesis test…" status strip already gives real feedback.
    });
    const t0 = Date.now();
    const turnStart = t0; // FEATURE: MI-42 -- Task 4's caption reads this
    const hopCountBeforeTurn = currentHopCount(pipelineEventsRef.current); // FEATURE: CHI-23
    {
      const est = estimateChainMs(INTENT_CHAINS.hypothesis_test, agentActivity);
      setStatus("Priya is running a hypothesis test…", { expectation: est != null ? formatExpectation(est) : null });
    }
    try {
      const st = await runHypothesisTest({ hypothesis: text, intent, flaggedQuestion, flaggedAnswer, priorHypothesisTest: hypothesisTest || null, onEvent: logEvent, setStatus, onProgress, isStale }); // FEATURE: CHI-23 — getHopCount param removed
      if (isStale()) return; // FEATURE: CHI-04
      logEvent(buildHopEvent("hypothesis_test", "priya", st, Date.now() - t0));
      // FEATURE: MI-65 — no chat push here anymore. The raw test result stays in Evidence only
      // until the user resolves it (Info Only / Store as Forecast); testElapsedMs carries onto
      // hypFlow so the eventual chat card (Task 3/4) can still caption real test time.
      // FEATURE: CHI-23 — hop numbers read fresh from the gold count here, after the trailing
      // hypothesis_test event just above (the old code captured hopEnd inside runHypothesisTest,
      // before this trailing event existed — structurally one hop short, every time).
      setHypFlow(prev => prev && ({ ...prev, stage:"result", chosenText: text, hypothesisTest: { ...st, hopStart: hopCountBeforeTurn + 1, hopEnd: currentHopCount(pipelineEventsRef.current) }, priorHypothesisTest: prev.hypothesisTest || null, testElapsedMs: Date.now() - turnStart }));
    } catch (e) {
      // FEATURE: MI-29 -- surface real error to chat + Pipeline Log instead of a silent reset
      console.error("[MarketIntelligenceScreen] runHypothesisTest", e.message);
      logEvent(buildHopEvent("error", "priya", { step: "hypothesis_test_display", message: e.message }, Date.now() - t0));
      setMessages(prev => [...prev, buildMessage({ kind: "error", text: "Something went wrong running that hypothesis test — try again." })]);
      setHypFlow(prev => prev && ({ ...prev, stage:"choosing" }));
    } finally {
      setWorkingStatus(null);
    }
  };

  const onDiscard = () => {
    // FEATURE: MI-51 — "Info Only" copy (was "Theory discarded — not written to the Data Room.",
    // the old "Discard" button's text) — same no-op outcome, reworded for the 2-outcome decision.
    // FEATURE: CHI-03a — the old rich hypothesis_test chat card (MessageBubble, now deleted) is
    // replaced by a short static placeholder line — interim only, CHI-03b replaces this with a
    // real Marcus-authored live acknowledgment. The full result stays visible in Evidence via
    // hypFlow.hypothesisTest/Task 3's submitted-theory block until setHypFlow(null) below actually
    // clears it.
    // FEATURE: CHI-03b — real Marcus-voiced resolution ack, fire-and-forget relative to this
    // function — narrates after the real state change (setHypFlow(null) below) has already
    // happened, never blocking or gating it. Falls back to CHI-03a's static copy on failure.
    // FEATURE: CHI-03c — single-hop ack, no logEvent of its own; see submissionAckHop's identical comment above.
    // FEATURE: CHI-23 — removed incorrect "+1"; this ack logs no event of its own, so it shares
    // whatever hop is already current, per this line's own pre-existing comment above.
    const infoOnlyAckHop = currentHopCount(pipelineEventsRef.current);
    const turnStart = Date.now(); // FEATURE: CHI-07 — onDiscard had no existing timing capture; feeds the ack bubble's totalElapsedMs
    callCapability({
      capability_slug: "channel-intelligence", intent_slug: "ci-resolution-ack-intent", agent_id: "marcus",
      task_context: { resolution: "info_only", theory: hypFlow?.chosenText || "" },
    }).then(ack => setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: ack.ack_text, hopStart: infoOnlyAckHop, hopEnd: infoOnlyAckHop, totalElapsedMs: Date.now() - turnStart })]))
      .catch(e => {
        console.error("[MarketIntelligenceScreen] ci-resolution-ack-intent", e.message);
        setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: "Got it — noted as info only, not stored.", hopStart: infoOnlyAckHop, hopEnd: infoOnlyAckHop, totalElapsedMs: Date.now() - turnStart })]); // fallback, same copy CHI-03a shipped
      });
    setHypFlow(null);
  };

  // FEATURE: MI-01d — Track as Assumption / Make Permanent. Calls Elena (memory-consolidation,
  // unconditional, self-gated, no confirmation) and Nadia (data-analysis, unconditional, always
  // pending_confirmation) directly — no Intake Assistant involvement, no delegation, no nesting
  // (see kickoff CONTEXT for why intake-commit-intent's route_to fan-out is deliberately unused).
  // FEATURE: MI-51 — intent parameter dropped (was onCommit("forecast")/onCommit("correct") for the
  // old 2-of-3 buttons that shared this call) — single "Store as Forecast" outcome now, hypFlow's own
  // intent (set at flow entry, unchanged) is used below instead of a per-button override.
  const onCommit = async () => {
    if (!hypFlow) return;
    const myGeneration = clearGenerationRef.current; // FEATURE: CHI-04
    const isStale = () => clearGenerationRef.current !== myGeneration; // FEATURE: CHI-04
    const onProgress = (evt) => { if (!isStale()) onDelegationProgress(evt); }; // FEATURE: CHI-04
    const { intent, flaggedQuestion, flaggedAnswer, citations, chosenText, hypothesisTest } = hypFlow;
    setHypFlow(prev => prev && ({ ...prev, stage: "committing" }));
    // FEATURE: MI-29 -- t0/step hoisted above try so the catch block can log which agent was running
    let t0 = Date.now();
    let step = "memory_consolidation";
    try {
      const disputedChunkId = Array.isArray(citations) && citations.length === 1 ? citations[0] : null;
      const hypothesisTestText = hypothesisTest
        ? [hypothesisTest.supports?.text, hypothesisTest.complicates?.text, hypothesisTest.consider?.text].filter(Boolean).join(" ")
        : "";

      setStatus("Elena is consolidating this into memory…");
      const elenaResult = await callCapability({
        capability_slug: "memory-consolidation", intent_slug: "reasoner-intent", agent_id: "elena",
        task_context: {
          original_question: flaggedQuestion || "", flagged_answer: flaggedAnswer || "",
          committed_hypothesis: chosenText, intent, hypothesis_test: hypothesisTestText,
          was_override: !!hypothesisTest?.override_warning,
        },
        onProgress, isStale,
      });
      if (isStale()) return; // FEATURE: CHI-04
      logEvent(buildHopEvent("memory_consolidation", "elena", elenaResult, Date.now() - t0));

      step = "patch_proposed";
      t0 = Date.now();
      setStatus("Nadia is drafting a data patch…");
      const nadiaResult = await callCapability({
        capability_slug: "data-analysis", intent_slug: "data-patch-intent", agent_id: "nadia",
        task_context: {
          disputed_chunk_id: disputedChunkId, correction: chosenText,
          user_reasoning: hypothesisTestText || chosenText,
        },
        onProgress, isStale,
      });
      if (isStale()) return; // FEATURE: CHI-04
      logEvent(buildHopEvent("patch_proposed", "nadia", nadiaResult, Date.now() - t0));

      setHypFlow(prev => prev && ({
        ...prev, stage: "result",
        confirmation: {
          confirmation_id: nadiaResult.confirmation_id,
          proposed_action: nadiaResult.proposed_action,
          critique: nadiaResult.critique,
          disputed_chunk_id: disputedChunkId,
          user_reasoning: hypothesisTestText || chosenText,
        },
      }));
    } catch (e) {
      // FEATURE: MI-29 -- surface real error to chat + Pipeline Log instead of a silent reset
      console.error("[MarketIntelligenceScreen] onCommit", e.message);
      logEvent(buildHopEvent("error", step === "memory_consolidation" ? "elena" : "nadia", { step, message: e.message }, Date.now() - t0));
      setMessages(prev => [...prev, buildMessage({ kind: "error", text: "Something went wrong committing that — try again." })]);
      setHypFlow(prev => prev && ({ ...prev, stage: "result" }));
    } finally {
      setWorkingStatus(null);
    }
  };

  const onResolveConfirmation = async (resolution, editedText = null) => {
    if (!hypFlow?.confirmation) return;
    const myGeneration = clearGenerationRef.current; // FEATURE: CHI-04
    const isStale = () => clearGenerationRef.current !== myGeneration; // FEATURE: CHI-04
    const onProgress = (evt) => { if (!isStale()) onDelegationProgress(evt); }; // FEATURE: CHI-04
    const { confirmation_id, disputed_chunk_id } = hypFlow.confirmation;
    const edited_task_context = resolution === "edit"
      ? { disputed_chunk_id, correction: editedText, user_reasoning: editedText }
      : null;
    const t0 = Date.now();
    setStatus("Nadia is processing your response…");
    try {
      const result = await resolveConfirmation({ confirmation_id, resolution, edited_task_context, isStale });
      if (isStale()) return; // FEATURE: CHI-04

      if (resolution === "edit") {
        // FEATURE: LOG-15 — result.patterns_used exists (same shared mechanism, threaded through
        // resolveConfirmation()) but wasn't hoisted to the top level the renderer reads; the
        // {resolution, result} wrapper was silently dropping it.
        logEvent(buildHopEvent("patch_resolved", "nadia", { resolution, result, patterns_used: result.patterns_used || [] }, Date.now() - t0));
        setHypFlow(prev => prev && ({
          ...prev,
          confirmation: { ...prev.confirmation, confirmation_id: result.confirmation_id, proposed_action: result.proposed_action, critique: result.critique },
        }));
        return;
      }

      // FEATURE: LOG-15 — same wrapper-nesting fix as the edit branch above.
      logEvent(buildHopEvent("patch_resolved", "nadia", { resolution, result, patterns_used: result.patterns_used || [] }, Date.now() - t0));
      // FEATURE: MI-51 — accept-branch copy now tells the user exactly where the saved item can be
      // found (was result.content?.confirmation_note || "Recorded."); Nadia's data-patch-intent write
      // already surfaces there today via groupDataSources()'s "Analysis" bucket, no backend change.
      // FEATURE: CHI-03a — same static-placeholder treatment as onDiscard (interim only, CHI-03b
      // replaces with a live acknowledgment) — replaces the old rich hypothesis_test chat card
      // (MessageBubble, now deleted). Full result stays visible in Evidence throughout, until
      // setHypFlow(null) below actually clears it.
      // FEATURE: CHI-03b — real Marcus-voiced resolution ack for both the accept and reject
      // branches, fire-and-forget — narrates after setHypFlow(null) below has already run. Falls
      // back to CHI-03a's static copy per-branch on failure.
      // FEATURE: CHI-03c — single-hop ack, no logEvent of its own; see submissionAckHop's identical comment above.
      // FEATURE: CHI-23 — removed incorrect "+1"; this ack logs no event of its own, so it shares
      // whatever hop is already current, per this line's own pre-existing comment above.
      const resolutionAckHop = currentHopCount(pipelineEventsRef.current);
      if (resolution === "accept") {
        callCapability({
          capability_slug: "channel-intelligence", intent_slug: "ci-resolution-ack-intent", agent_id: "marcus",
          task_context: { resolution: "stored", theory: hypFlow?.chosenText || "" },
        }).then(ack => setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: ack.ack_text, hopStart: resolutionAckHop, hopEnd: resolutionAckHop, totalElapsedMs: Date.now() - t0 })]))
          .catch(e => {
            console.error("[MarketIntelligenceScreen] ci-resolution-ack-intent", e.message);
            setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: "Got it — that's been stored as a forecast.", hopStart: resolutionAckHop, hopEnd: resolutionAckHop, totalElapsedMs: Date.now() - t0 })]);
          });
      } else {
        callCapability({
          capability_slug: "channel-intelligence", intent_slug: "ci-resolution-ack-intent", agent_id: "marcus",
          task_context: { resolution: "rejected", theory: hypFlow?.chosenText || "" },
        }).then(ack => setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: ack.ack_text, hopStart: resolutionAckHop, hopEnd: resolutionAckHop, totalElapsedMs: Date.now() - t0 })]))
          .catch(e => {
            console.error("[MarketIntelligenceScreen] ci-resolution-ack-intent", e.message);
            setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: "Got it — that proposal was rejected, nothing was stored.", hopStart: resolutionAckHop, hopEnd: resolutionAckHop, totalElapsedMs: Date.now() - t0 })]);
          });
      }
      setHypFlow(null);
    } catch (e) {
      // FEATURE: AA-189 — this catch was previously missing entirely; any resolve failure (this
      // bug or a future one) silently stuck ConfirmationCard open with zero feedback. Symmetric to
      // onCommit()'s existing catch, but deliberately does NOT reset hypFlow (John's explicit call,
      // S-AA-189-design) — the drafted confirmation is still valid, only the resolve action failed,
      // so the user can retry Accept/Reject on the same card instead of losing the draft.
      console.error("[MarketIntelligenceScreen] onResolveConfirmation", e.message);
      logEvent(buildHopEvent("error", "nadia", { step: "resolve_confirmation", resolution, message: e.message }, Date.now() - t0));
      setMessages(prev => [...prev, buildMessage({ kind: "error", text: "Something went wrong resolving that — try again." })]);
    } finally {
      setWorkingStatus(null);
    }
  };

  return (
    <AppShell>
      <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",minHeight:0,background:T.paperDeep,padding: isMobile ? "14px 14px 16px" : "20px 28px 28px"}}>
        <FeatureBadge id="MI-01"/>
        {/* FEATURE: MI-51 — "Agent & Data Info" (renamed from "Activity") relocates here, next to the
            page title, mobile-only — was a small button inside MobileBody's own pane-button row. */}
        <div style={{marginBottom: isMobile ? 12 : 18, display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:10}}>
          <div>
            <div style={{fontFamily:display,fontSize: isMobile ? 19 : 24,fontWeight:700,color:T.navy}}>Channel Sales Intelligence</div>
            <div style={{fontFamily:body,fontSize: isMobile ? 11 : 13,color:T.muted,marginTop:2}}>LLM Wiki - Channel performance analysis, agent-orchestrated</div>
          </div>
          {isMobile && (
            <button onClick={() => setShowAgentInfo(true)} style={{flexShrink:0,fontFamily:mono,fontSize:9,letterSpacing:"0.05em",textTransform:"uppercase",padding:"6px 10px",border:`1px solid ${T.brass}`,color:T.brassDeep,background:T.card,cursor:"pointer",whiteSpace:"nowrap"}}>
            Agent &amp; Data Info
            </button>
          )}
        </div>
        {isMobile ? (
          <MobileBody
            messages={messages} loading={loading} workingStatus={workingStatus} onSubmit={submit} onReview={onReview} onGoodThanks={onGoodThanks} onClear={onClear}
            hypFlow={hypFlow} qaEvidence={qaEvidence} onIntentChange={onIntentChange} onSelectHypothesis={onSelectHypothesis} onDiscard={onDiscard} onCommit={onCommit} onResolveConfirmation={onResolveConfirmation}
            events={pipelineEvents} agentActivity={agentActivity} showAgentInfo={showAgentInfo} setShowAgentInfo={setShowAgentInfo} onAgentsDrawerOpen={onAgentsDrawerOpen}
          />
        ) : (
          <div style={{position:"relative",display:"grid",gridTemplateColumns:"1.15fr 1fr 0.9fr",gap:18,flex:1,minHeight:0}}>
            <FeatureBadge id="MI-02"/>
            <InteractColumn messages={messages} loading={loading} workingStatus={workingStatus} onSubmit={submit} onReview={onReview} onGoodThanks={onGoodThanks} onClear={onClear} qaEvidence={qaEvidence}/>
            <EvidenceColumn hypFlow={hypFlow} qaEvidence={qaEvidence} onIntentChange={onIntentChange} onSelectHypothesis={onSelectHypothesis} onDiscard={onDiscard} onCommit={onCommit} onResolveConfirmation={onResolveConfirmation} onGoodThanks={onGoodThanks} onReview={onReview}/>
            <AuditColumn events={pipelineEvents} agentActivity={agentActivity} onAgentsDrawerOpen={onAgentsDrawerOpen}/>
          </div>
        )}
      </div>
    </AppShell>
  );
}
