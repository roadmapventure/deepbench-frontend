// DeepBench v7.0.0 | MarketIntelligenceScreen.jsx | LAV-1a -- zero visible change: the three example-question
// consts moved verbatim to src/data/chiQuestions.js (imported back under the same names), and the stream
// primitives readSSEResult/callCapability/buildHopEvent/describeDelegationEvent/runQaWithQualityGate/AuditColumn
// gained the `export` keyword in place -- no body moved, no CHI wiring refactored. src/hooks/useHarnessStream.js
// consumes them so the Live Agent View screen (LAV-1b) runs the same implementation, not a second copy.
// FEATURE: LAV-1a
// DeepBench v6.3.235 | MarketIntelligenceScreen.jsx | AGT-47 -- onResolveConfirmation()'s edit branch
// stops discarding the theory-test's figures. It built edited_task_context.user_reasoning from the
// reviewer's edited text ALONE, so Nadia never received the original theory text on the edit-resolve
// call and S-AGT-47's shipped carry-forward instruction had nothing to carry. The original is already
// on hypFlow.confirmation (written at the first patch call, preserved across repeated edits by the
// ...prev.confirmation spread) -- this reads it and joins it with the edit. Read-only: no new state
// field, no other resolution branch, no api/ change
// DeepBench v6.3.230 | MarketIntelligenceScreen.jsx | SES-57 -- analyzeNewsCard() no longer owns the article fetch: the new Article Context Resolver (src/lib/newsCardContext.js, §19m) does the fetch, the failure classification and the payload, and scripts/chi-true-regression.mjs calls the same function, so the two news-card payloads cannot diverge again. No behavior change on the screen -- the fault line, the visible question, the journey reset and submit()'s signature are all untouched
// DeepBench v6.3.227 | MarketIntelligenceScreen.jsx | CHI-92 -- fetchNewsCards() splits into Jordan's search call + his display request, so the stories he finds ride task_context to the display agent instead of dying in his own turn
// DeepBench v6.3.216 | MarketIntelligenceScreen.jsx | LOG-109/CHI-91 -- analyzeNewsCard()'s fetch
// now reads the error body instead of discarding it, classifies WHY the primary path failed
// (articleFaultText, src/lib/articleFaultText.js), and pushes an HAR-15-style platform fault
// bubble before the analysis runs; fail-open (CHI-58) unchanged -- a null article still submits.
// The reason also rides submit()'s backgroundContext as article_unavailable_reason so ci-answer-
// intent can acknowledge the gap in Marcus's own words (Supabase-only change, no code here).
// DeepBench v6.3.224 | MarketIntelligenceScreen.jsx | AGT-37 -- Store as Forecast supplies the full-UUID citations it already holds (the flagged answer's plus the three theory-test sections' previously-discarded citations halves) on a new handler_context sibling field, never inside task_context; callCapability() relays it. No UI change, no id rendered
// DeepBench v6.3.218 | MarketIntelligenceScreen.jsx | LOG-112 -- the Agents drawer's per-agent sub-rows show VERIFIED pattern names only: they no longer read buildActivitySummary()'s patterns_used-derived byPattern bucket, but join the agent's own rows to the Log Displayer's read-time classification (usePatternClassification's log_ids + buildAgentPatternRows) -- so a sub-row can no longer exceed its agent's own CALLS headline, and an agent with nothing verified renders no sub-rows at all. patternLabelFor()/usePatternVocabulary/humanizeSlug deleted here (no slug reaches this file any more)
// DeepBench v6.3.200 | MarketIntelligenceScreen.jsx | S-CHI-88a -- CHI-88 QA follow-ups: AgentWorkingIndicator gains an opt-in one-line `compact` variant (mobile status stops wrapping to 2 lines), the input row moves into the Chat branch only (Steps & Evidence reclaims ~66px), and the mobile pinned decision footer renders compact via the existing `bare` flag
// DeepBench v6.3.198 | MarketIntelligenceScreen.jsx | S-CHI-88 -- mobile cleanup: terse feed, one-line title chrome, soft status line, 16px input, pinned decision footer
// DeepBench v6.3.186 | MarketIntelligenceScreen.jsx | LOG-95b -- useTracePatterns refetches on span miss: streamed rows mount mid-flight (LOG-95), so the LOG-79 per-trace cache could freeze before late executions logged; now invalidates+refetches up to 3x2.5s per mounted span, then accepts honest-unclassified (§19l)
// DeepBench v6.3.184 | MarketIntelligenceScreen.jsx | LOG-95 -- hop-event span identity (§19p): streamed delegation-family rows spread pickCreditedSpan(evt) into their stored data; failure_triage credits the picker with her own span when she's credited, the gate's when Owen is
// DeepBench v6.3.183 | MarketIntelligenceScreen.jsx | HAR-17 -- recovery visibility: chat status "hit a snag" + expectation extension off the in_progress body's recovery payload; recovery continues exempt from the client cap; failed-status bodies throw
// DeepBench v6.3.180 | MarketIntelligenceScreen.jsx | HAR-15 -- credit-exhaustion renders an honest, distinct fault report (no raw provider JSON, no "try again") at all 5 error surfaces
// DeepBench v6.3.166 | MarketIntelligenceScreen.jsx | LOG-79 -- Agent Routing drawer's per-hop "AI patterns used:" line now reads the ai_call_patterns view (read-time classification, §19k) via trace_id/span_id threaded off each callCapability result, replacing the frozen legacy patterns_used field on this surface; a hop whose rows match no gold pattern shows no line at all (honest unclassified state, no boundary/date copy -- John's §19l call)
// DeepBench v6.3.169 | MarketIntelligenceScreen.jsx | S-CHI-82b -- journey membership for the two residual sites CHI-82a's arrival-effect guard didn't cover (same presence-vs-membership root cause): (1) the breadcrumb stage highlight now feeds currentStage() membership-filtered inputs (qa iff it holds a step in the current journey, hypFlow iff journeySeq matches -- the pure function itself unchanged), so a lingering resolved flow no longer paints "Update" over a new journey's "Analysis"; (2) the three hyp "Needs Your Decision" badges (Candidates/Result/Draft Forecast) gate on a new hypIsCurrent prop, so an abandoned previous journey's ambient drawers stop soliciting decisions. Shared hypCurrent const hoisted; qa/Analysis badge untouched (slot overwritten each journey).
// DeepBench v6.3.168 | MarketIntelligenceScreen.jsx | S-CHI-82a -- journey-membership guard (QA FAIL patch on v6.3.162): journey state gains a monotonic `seq` (nextJourney), every fresh hypFlow is stamped `journeySeq` at creation, and the step-arrival effect numbers only current-journey hyp content -- a previous journey's persisted (CHI-51) drawers can no longer renumber into a new journey when an effect dep changes. qaEvidence stays unstamped by design (single overwritten slot, same key -- self-corrects). Mobile heads-up pointer retargeted to "Tap Steps & Evidence above..." (was pointing at the pre-CHI-82 tab name).
// DeepBench v6.3.162 | MarketIntelligenceScreen.jsx | S-CHI-82 -- CHI journey steps + single vocabulary (ARCHITECTURE.md §19n, .claude/rules/chi-vocabulary.md): fixed drawer titles (CHI-49's intent-dynamic titles overturned -- "Theories"/"Theory Result"), journey-relative step numbering by arrival order (assignStep/ensureStep, no path map), StepChip worn by drawer titles + echoed in handoff chat bubbles (stepRef), ambient flex-order sort, "News & Evidence" -> "Steps & Evidence", breadcrumb current-stage highlight (currentStage), hypothesis/candidate retired from all screen copy
// DeepBench v6.3.152 | MarketIntelligenceScreen.jsx | S-CHI-77 -- onSend's catch now emits the MI-29 "error" Pipeline Log event (surfaces the real reason via describeCaughtError into Column 3) + honest bubble copy ("completing your answer", not "reaching Marcus"); the one async catch that dropped the reason. (Renamed from CHI-76 at close-out -- collided with the concurrently-shipped CHI-76 hyp-test caption, SES-18 counter desync)
// DeepBench v6.3.151 | MarketIntelligenceScreen.jsx | S-CHI-76 -- hyp-test completion status renders via the centralized HopSummaryLine caption (was a bare hand-formatted "…Given in Xs" bubble); isAnswer now message-driven
// DeepBench v6.3.150 | MarketIntelligenceScreen.jsx | S-CHI-75 -- news-fetch status-clear is ownership-aware (chatTurnActiveRef) so a news fetch completing mid-question no longer blanks the question's in-flight live status
// DeepBench v6.3.147 | MarketIntelligenceScreen.jsx | S-CHI-73 -- CHI live-status expected-time fallback (centralized) + intent-branched hyp_entry ack tail + Column-2 waiting-state motion (Candidates/Result skeletons)
// DeepBench v6.3.148 | MarketIntelligenceScreen.jsx | S-CHI-74 -- grounded-work chat bubbles (forecast/theory/correct routing ack, theory candidates) now carry their close status (elapsed vs expected + hops) via HopSummaryLine, same as the Q&A bubble; formatHopSummary/HopSummaryLine gain isAnswer flag so non-answer bubbles read "Full Agent Routing" (drop "& Answer")
// DeepBench v6.3.146 | MarketIntelligenceScreen.jsx | S-CHI-71 (pass 4) -- AgentWorkingIndicator live status back to ONE line (elapsed + estimate, then diamond + activity + this-agent time), reverting MI-49's two-line split per John
// DeepBench v6.3.143 | MarketIntelligenceScreen.jsx | S-CHI-71 (pass 3) -- both Column-2 interaction footers (qa-review, hyp-result) now render through the shared DecisionFooter standard; hyp-result gains a prompt, Priya CTA shortened
// DeepBench v6.3.141 | MarketIntelligenceScreen.jsx | S-CHI-71 (pass 2) -- Evidence-column drawer scroll-to-top + flat interaction footer + navy primary CTAs
// DeepBench v6.3.140 | MarketIntelligenceScreen.jsx | S-CHI-71 (pass 1) -- chat-header rename ("Chat with Marcus" + "Q&A · Corrections · Escalations" branding + "Question › Analysis › Theory › Forecast › Update" Process/Steps line), page subtitle -> "Apple channel performance analysis", hops summary on one line, "(expect" -> "(expected"
// DeepBench v6.3.138 | MarketIntelligenceScreen.jsx | S-SH-23 -- focus-area release-status labels
// DeepBench v6.3.135 | MarketIntelligenceScreen.jsx | CHI-65 -- the Result drawer's three hypothesis-test sections (supports/complicates/consider) are unwrapped through a new sectionText() type guard instead of `st.x.text || st.x`, which fell through to the {text, citations} OBJECT whenever text was present-but-falsy and killed the whole page with React error #31; a section with no usable text now renders nothing (no placeholder -- ARCHITECTURE.md §19j)
// DeepBench v6.3.134 | MarketIntelligenceScreen.jsx | LOG-36 -- pattern names resolve through the governed pattern_vocabulary (usePatternVocabulary) then humanizeSlug, never the static PATTERN_CATALOG
// DeepBench v6.3.126 | MarketIntelligenceScreen.jsx | CHI-61 -- terminal transaction_complete markers added at the 3 real theory/forecast conclusion points (onDiscard, onResolveConfirmation accept/reject), Marcus's next-step bubble once candidates land (enterHypothesisFlow), 3 redundant "Sent to Priya for deeper theories" captions removed (superseded by CHI-42's "You asked for deeper theories." user_action bubble)
// DeepBench v6.3.120 | MarketIntelligenceScreen.jsx | CHI-56 -- turn-tracking service adopted: real hop durations for delegation/agent_selection/failure_triage events (were permanently null), AgentWorkingIndicator right-justified to match the user bubble it reports on, HopSummaryLine gains an estimate line, new transaction_complete marker (onGoodThanks) alongside the existing question_boundary start marker
// DeepBench v6.3.112 | MarketIntelligenceScreen.jsx | DAT-7 -- resolveConfirmation() forwards status/detail on failure; onResolveConfirmation() shows a specific recovery message for denied writes instead of the generic retry copy
// DeepBench v6.3.106 | MarketIntelligenceScreen.jsx | S-CHI-49 -- single Theory drawer splits into "{intent} Candidates" (generating/choosing) and "{intent} Result" (testing onward), per STYLE-GUIDE.md §40's taxonomy decision record
// DeepBench v6.3.97 | MarketIntelligenceScreen.jsx | S-CHI-44 -- theory selection auto-advances into the test (no more "ready" stage/second click); submitted-theory block stays visible during the "committing" stage instead of going blank
// DeepBench v6.3.86 | MarketIntelligenceScreen.jsx | S-LOO-012 -- delegation_complete drawer rows (describePipelineEvent) now render real reasoning/task/service-label content instead of a bare "has finished." template
// DeepBench v6.3.77 | MarketIntelligenceScreen.jsx | S-LOO-010 -- automatic agent-crediting via display_agent_id, hopEvents mechanism fully removed
// (Prior header, kept for history: CHI-32 — patches CHI-30: rotation split changed
// from 6/4 to 2/8 (3 visible slots instead of 7 — slot 1 + static slot 2 + slot 3), matching the
// original pre-CHI-30 UI shape. Drawer count now 20 (was 16), computed automatically.)
// (Prior header, kept for history: CHI-30 — reorders the 23 example questions and
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
import { useState, useRef, useEffect, useMemo } from "react";
import { T, display, body, mono, FOCUS_AREA_STATUS, FOCUS_STATUS_STYLE } from "../tokens.js";
import { TENANT_ID } from "../config.js";
import { AppShell } from "../AppShell.jsx";
import { Card, Corners, FeatureBadge, AgentAvatar, ConfirmationCardContent, ConfirmationCardActions, ChartRenderer, Drawer, useScrollFadeHint, ScrollFadeHint, DecisionFooter } from "../components/SharedUI.jsx";
import { useAgents, useLearnedContext, useAgentActivitySummary, useDataSources } from "../hooks/useAgents.js";
import { useIsMobile } from "../hooks/useIsMobile.js"; // FEATURE: MI-45
import AIDiamond from "../components/AIDiamond.jsx";
// FEATURE: LOG-112 -- usePatternVocabulary/humanizeSlug dropped: no slug ever reaches this file
// now, so there is nothing left to resolve a name for. The Agents drawer's pattern rows come
// pre-named from the Log Displayer rollup (usePatternClassification + buildAgentPatternRows).
// SERVICE_CATALOG is untouched (LOO-012, unrelated -- SERVICE_NAME below still needs it).
import { SERVICE_CATALOG, usePatternClassification, buildAgentPatternRows } from "../hooks/useAIActivity.js"; // FEATURE: LOG-112/LOO-012
// FEATURE: CHI-56 — shared turn-tracking service (hop-duration resolution, transaction-boundary
// event builder); see src/lib/turnTracking.js for full rationale.
import { NON_MEASURABLE_EVENT_TYPES, resolveEventDuration, resolveEmbeddedDuration, buildTransactionBoundaryEvent, buildEndStatusEstimate } from "../lib/turnTracking.js";
import { articleFaultText } from "../lib/articleFaultText.js"; // FEATURE: LOG-109/CHI-91
import { resolveNewsCardContext } from "../lib/newsCardContext.js"; // FEATURE: SES-57
// FEATURE: LOG-79 -- per-hop governed pattern names now come from the ai_call_patterns view (the
// Log Displayer, §19k), joined via the response's trace_id/span_id -- never the frozen legacy
// patterns_used field. See src/lib/tracePatterns.js + useTracePatterns below.
import { fetchTracePatterns, needsSpanRefetch, pickCreditedSpan } from "../lib/tracePatterns.js";
// FEATURE: LAV-1a -- the 23 CHI example questions now live in one shared module (src/data/chiQuestions.js)
// so the Live Agent View screen can render the same list without a second copy.
import { STATIC_QUESTION, ROTATING_POOL, FIXED_DRAWER_TAIL } from "../data/chiQuestions.js";
// FEATURE: MI-51 — AI_PAT/AiBadge import removed: the qa card's AiBadge(AI_PAT.AGENT_ROUTING) rendering
// (previously shown only on non-flagged answers) is superseded by the universal guided review prompt
// below, which now renders on every qa message regardless of needs_review — no remaining call site.

// FEATURE: CHI-88 — the page subtitle, hoisted to module scope so the desktop title block and
// mobile's "Agent & Data Info" overlay render the same string from one source. Mobile drops it from
// the title block entirely (single-line title chrome) and shows it at the top of the overlay instead.
const CHI_SUBTITLE = "LLM Wiki - Apple channel performance analysis - agent-orchestrated";

// FEATURE: LAV-1a — the 23 example questions (STATIC_QUESTION / ROTATING_POOL / FIXED_DRAWER_TAIL)
// moved verbatim to src/data/chiQuestions.js so the Live Agent View screen renders the same list
// from one source instead of a second copy. Names, shapes, ids, labels and order are unchanged —
// every use site below (splitRotation, visibleQuestions, drawerQuestions) is untouched.

// FEATURE: CHI-32 — patches CHI-30: split point changed from 6/4 to 2/8 (3 visible slots instead of
// 7, per John's call to keep the original UI shape). shuffleFn injection unchanged.
function splitRotation(pool, shuffleFn) {
  const shuffled = shuffleFn(pool);
  return { picks: shuffled.slice(0, 2), leftover: shuffled.slice(2) };
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

// FEATURE: CHI-73 — HYP_ENTRY_TAIL deleted (CHI-82): its only caller was the routing ack, whose
// copy is now branched inline there per the single-vocabulary rewrite (chi-vocabulary.md).

// FEATURE: CHI-82 — journey-relative step numbering (ARCHITECTURE.md §19n, Decision 1): a journey
// starts when the user acts (typed question, news click); whatever drawers arrive in service of it
// number themselves by arrival order — no path map anywhere. The pure logic between the sentinels
// is extracted and executed directly by this session's Node test (chi-82-test.mjs), so it must stay
// dependency-free (no imports, no JSX).
// CHI-82-PURE-BEGIN
const EMPTY_JOURNEY = () => ({ order: {}, next: 1, seq: 0 });
// FEATURE: CHI-82a — advances to a fresh journey: numbering restarts and the monotonic `seq`
// increments, so content stamped with an earlier journey's seq is recognizably NOT a member of
// the new one. Root cause of the v6.3.162 QA FAIL this fixes: presence ≠ journey membership —
// qaEvidence/hypFlow persist across journeys (CHI-51), so the arrival effect needs a membership
// signal, not just presence.
function nextJourney(prev) {
  return { order: {}, next: 1, seq: (prev?.seq ?? 0) + 1 };
}
// Assigns the next arrival-order number to `key` if unassigned. Mutates nothing; returns
// [journey, n] — same journey object back when already assigned (idempotent).
// FEATURE: CHI-82a — spreads the whole journey (not just order/next) so `seq` carries through
// every assignment.
function assignStep(journey, key) {
  if (journey.order[key] != null) return [journey, journey.order[key]];
  const n = journey.next;
  return [{ ...journey, order: { ...journey.order, [key]: n }, next: n + 1 }, n];
}
// FEATURE: CHI-82 (T3) — which fixed-map breadcrumb stage the user is on right now. Deliberately
// simple v1 mapping — do not invent finer-grained states. The map names stages/acts, not objects,
// so "Forecast" here is exempt from the object-noun timing rule (chi-vocabulary.md).
function currentStage({ qaEvidence, hypFlow }) {
  if (hypFlow) {
    if (hypFlow.resolution) return "Update";
    if (hypFlow.confirmation) return "Forecast";
    return "Theory";
  }
  return qaEvidence ? "Analysis" : "Question";
}
// CHI-82-PURE-END

// FEATURE: CHI-82 — the shared step chip: brass journey number + optional uppercase label. Worn by
// every numbered drawer title and echoed inline in any chat bubble that hands control back to the
// user (§19n Decision 3: exactly one step named per handoff, number + name together, same visual
// chip the drawer wears). Renders nothing while the step is unassigned (n == null), which is also
// the defensive title fallback — a rendered drawer with no number shows its plain fixed name.
const StepChip = ({ n, label }) => n == null ? null : (
  <span style={{display:"inline-flex",alignItems:"center",gap:5,verticalAlign:"middle"}}>
    <span style={{background:T.brass,color:T.card,fontFamily:mono,fontSize:10,fontWeight:700,padding:"1px 6px",lineHeight:1.4}}>{n}</span>
    {label && <span style={{fontFamily:mono,fontSize:10,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:T.brassDeep}}>{label}</span>}
  </span>
);

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

// FEATURE: LOG-36 -- the module-level PATTERN_NAME map (AI-50c, built from PATTERN_CATALOG) is
// deleted. A pattern name is now resolved at render time through usePatternVocabulary() ->
// humanizeSlug() -> raw slug, the same order every other pattern display uses. It cannot be a
// module constant any more because the vocabulary is read from Supabase, not from a static file.

// FEATURE: LOG-112 -- patternLabelFor() (LOG-36's shared slug -> name resolver) is deleted. Both
// of its call sites are gone: RoutingActivityLine moved to the ai_call_patterns view (LOG-79) and
// the per-agent rollup moved to the classification rollup this session. Every pattern name on this
// screen now arrives already governed, so there is no slug left to resolve.

// FEATURE: LOO-012 — slug -> human label, same data-driven shape the deleted PATTERN_NAME map had,
// reusing SERVICE_CATALOG (already platform-wide) instead of a new dictionary. Restores a
// real per-service label on delegation_complete hops with no agent-authored text to show (a final
// target's own completion) — was a static per-type label before LOO-010 removed the declarations
// that carried it; this is the generic replacement, not new content.
const SERVICE_NAME = Object.fromEntries(SERVICE_CATALOG.map(s => [s.slug, s.name]));

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

// FEATURE: CHI-65 — the Result drawer's three sections arrive as {text, citations} (both
// hyp-hypothesis-test-intent's and intelligence-review-format's schemas), except on the
// AA-135/AA-137 string-content paths where the whole value is a plain string. The previous
// `v.text || v` unwrap handled both, but fell through to the OBJECT whenever text was present-
// but-falsy — a state complicates.text's own ["string","null"] type explicitly permits — handing
// React an object and taking the entire page down (error #31). Returns usable text or "", never
// an object. Deliberately does NOT substitute placeholder copy for an empty section: the screen
// holds no content policy, that guarantee lives at the agent level (ARCHITECTURE.md §19j).
function sectionText(v) {
  if (typeof v === "string") return v.trim();
  if (v && typeof v.text === "string") return v.text.trim();
  return "";
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
export async function readSSEResult(res, onProgress) { // FEATURE: LAV-1a -- exported in place (no body change) for src/hooks/useHarnessStream.js
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
      // FEATURE: HAR-15 -- carry the harness's classification onto the thrown error; without this
      // the fields never reach any catch block.
      else if (evt.type === 'error') { throw Object.assign(new Error(evt.message), { status: evt.status, upstreamStatus: evt.upstreamStatus, failureClass: evt.failureClass, faultCode: evt.faultCode, detail: evt.detail }); }
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

// FEATURE: CHI-73 — the live working-indicator's expected-time fallback, centralized here so EVERY
// status shows an estimate, not just the ones whose call site happened to pass one. Grounded
// estimates (formatExpectation → "expect > Xs") still win; this is the floor when a chain has no
// historical p90 data yet (e.g. Priya's hyp-generation) or a scripted sub-step passed nothing.
// "< 2m" is the platform's stated ceiling — honest as an upper bound. Present tense: it's in-flight,
// not the retrospective HopSummaryLine estimate (that one stays past-tense "expected < 2m", L3391).
const LIVE_EXPECT_FALLBACK = "expect < 2m";

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
// FEATURE: CHI-88a — opt-in `compact` one-line variant, default false (every existing caller,
// desktop included, renders byte-identically). CHI-88 moved this indicator into a full-width mobile
// slot under the input row, where CHI-56's chat-pane geometry (alignItems:"flex-end", maxWidth:"85%")
// plus the row's flexWrap:"wrap" made it wrap to ~53px/2 lines — measured live on the deployed build.
// Compact drops that geometry, forbids wrapping, ellipsizes the activity message, and omits the
// per-agent time only (the feed's hop rows already carry per-agent durations). The elapsed/expect
// span keeps its exact text: §19o requires the expectation and its recovery extensions to stay visible.
function AgentWorkingIndicator({ message, startedAt, turnStartedAt, expectation, compact = false }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  // FEATURE: CHI-73 — always show an estimate: grounded expectation when present, else the
  // centralized LIVE_EXPECT_FALLBACK ceiling. No status can silently render without one now.
  const elapsedExpect = (
    <span style={compact
      ? {fontFamily:mono,fontSize:10,color:T.brassDeep,flexShrink:0}
      : {fontFamily:mono,fontSize:10,color:T.brassDeep}}>elapsed {formatElapsed(now - turnStartedAt)} | {expectation || LIVE_EXPECT_FALLBACK}</span>
  );
  const activity = (
    <span style={compact
      ? {fontFamily:mono,fontSize:11,color:T.muted,fontStyle:"italic",fontWeight:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0,flexShrink:1}
      : {fontFamily:mono,fontSize:11,color:T.muted,fontStyle:"italic",fontWeight:400}}>{message}</span>
  );
  return (
    // FEATURE: CHI-56 — alignItems:"flex-end" + maxWidth:"85%" added: Live status always reports
    // on the User prompt's own action, which is always right-aligned (John's confirmed terminology,
    // kickoff CONTEXT) — matches MessageBubble's own bubble width (~L1447/1482) exactly, no second
    // width constant introduced. Compact (CHI-88a) opts out: its slot is full-width, not the chat pane.
    <div style={compact
      ? {display:"flex",flexDirection:"column",gap:4,position:"relative",alignItems:"stretch",maxWidth:"100%",marginBottom:0}
      : {display:"flex",flexDirection:"column",gap:4,marginBottom:12,position:"relative",alignItems:"flex-end",maxWidth:"85%"}}>
      <FeatureBadge id="MI-47"/>
      <FeatureBadge id="MI-49"/>
      <FeatureBadge id="CHI-56"/>
      <FeatureBadge id="CHI-73"/>
      {/* FEATURE: CHI-71 -- re-merged onto ONE line (John's live call, reverting MI-49's two-line split):
          total elapsed + estimate, then the diamond + activity message + this-agent time, all in one
          right-aligned row that wraps only if it ever runs out of width.
          FEATURE: CHI-88a -- compact reverses the order (diamond first, per John's approved mock) and
          sets flexWrap:"nowrap" so the fixed mobile chrome height can never grow. */}
      <div style={compact
        ? {display:"flex",alignItems:"center",gap:8,flexWrap:"nowrap",overflow:"hidden",justifyContent:"flex-start"}
        : {display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
        {compact ? (
          <>
            <AIDiamond size="7px" color={T.brass}/>
            {activity}
            {elapsedExpect}
          </>
        ) : (
          <>
            {elapsedExpect}
            <AIDiamond size="7px" color={T.brass}/>
            {activity}
            <span style={{fontFamily:mono,fontSize:10,color:T.brassDeep}}>{formatElapsed(now - startedAt)}</span>
          </>
        )}
      </div>
    </div>
  );
}

// FEATURE: CHI-33-patch -- live elapsed line for Column 2's true in-flight state (newsCards ===
// null), reusing AgentWorkingIndicator's tick-every-second + formatElapsed() idiom without pulling
// in its full chat-pane-specific layout (badges, AIDiamond icon) -- this renders inline inside the
// existing empty-state box instead.
function NewsCardsLoadingLine({ startedAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!startedAt) return "Grabbing the latest headlines...";
  return `Grabbing the latest headlines... ${formatElapsed(now - startedAt)}`;
}

// FEATURE: MI-15 — shared display-label mapping for the raw data_type (the_library rows) /
// confidence_tier (Q&A answers) vocabulary. Display-layer relabel only — the stored enum strings
// (sourced/inferred/synthesized/learned/na) are unchanged everywhere else (DB, all 7 live Skill
// Profile schemas). Locked mapping: STYLE-GUIDE.md Section 19 — do not re-litigate without
// re-reading it. whoTag only ever applies to the "Analysis" label, sourced from the_library.source
// (user->"Human", agent->"AI"); a confidence_tier context has no source column, so it's implicitly
// AI but still renders no who-tag (per the locked table, only the_library rows carry a source col).
// FEATURE: CHI-31 — added source_simulation as a new the_library.data_type value only (never a
// confidence_tier value — Marcus's schema enum is untouched). 'synthesized' no longer special-cases
// isBaseline; it always renders "Analysis" now that source_simulation is the explicit value for
// designed-baseline demo scenarios, so a genuinely-synthesized row (e.g. the deliberate Signal
// Mobile guardrail holdout) no longer masquerades under the safer "Source Simulation" label.
function describeDataType(dataType, { isBaseline, source } = {}) {
  const whoTag = source === 'user' ? "Human" : source === 'agent' ? "AI" : null;

  switch (dataType) {
    case 'sourced':
      return { label: "Sourced", color: T.moss, whoTag: null };
    case 'inferred':
      return { label: "Analysis", color: T.brass, whoTag };
    case 'synthesized':
      return { label: "Analysis", color: T.brass, whoTag };
    case 'source_simulation':
      return { label: "Source Simulation", color: T.mutedDeep, whoTag: null };
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
// FEATURE: CHI-88 — optional second param `opts`. Today it carries one flag, `terse`, threaded from
// the mobile Agent Routing feed only (MobileBody -> RoutingHopCard -> RoutingActivityLine). Every
// existing call site passes nothing and is behaviorally byte-identical; see the delegation_complete
// case for what terse actually elides.
function describePipelineEvent(evt, opts = {}) {
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
    // FEATURE: LOO-009c — same shape as delegation_return immediately above (both are terminal,
    // "agent completed its work cleanly" events, T.moss per that existing convention) — the gap
    // this session closes: this case never existed, so delegation_complete rendered blank.
    // FEATURE: LOO-012 — restores real content, checked in order of specificity, all generic
    // (field-presence only, never capability-specific):
    case "delegation_complete": {
      if (evt.data.reasoning) {
        // PM-broker's own pick — agent-selection-intent's fixed schema, generic across whichever
        // agent currently holds the project-manager capability. Exact restoration of the old
        // "agent_selection" text.
        return { capability: null, summary: `Deciding who should handle this next — ${evt.data.reasoning}`, color: T.moss };
      }
      // FEATURE: CHI-88 — opts.terse (mobile Agent Routing feed only) falls through to the service
      // completion label below instead of rendering the originating agent's raw task prompt. Measured
      // at 375×667: those prompts ran 1,607 chars behind a 3-line clamp in a 176px feed, burying the
      // routing story the feed exists to tell. A render-layer field choice only (§19j) — the event
      // still carries evt.data.task, desktop's AuditColumn still renders it (John's explicit call),
      // and no placeholder copy is ever written in its place.
      if (evt.data.task && !opts.terse) {
        // Originating agent's own hand-off summary (LOO-011's self-credit case).
        return { capability: null, summary: evt.data.task, color: T.moss };
      }
      // Final target's own completion, no agent-authored text available — a real, distinct label
      // per service instead of a bare "has finished.", reusing SERVICE_NAME (Task 2 above).
      const serviceName = SERVICE_NAME[evt.data.toCapabilitySlug] || evt.data.toCapabilitySlug || "its work";
      return { capability: null, summary: `Completed ${serviceName}`, color: T.moss };
    }
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
// FEATURE: CHI-56 — `transaction_complete` is the same shape of marker (the new symmetric
// "closing half," fired from onGoodThanks): both are boundary markers, neither should merge into
// an adjacent hop or count toward hop numbering.
function groupEventsIntoHops(ordered) {
  const hops = [];
  for (const evt of ordered) {
    const last = hops[hops.length - 1];
    if (evt.type === "question_boundary" || evt.type === "transaction_complete") {
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

// FEATURE: CHI-56 — NON_MEASURABLE_EVENT_TYPES now lives in src/lib/turnTracking.js (imported
// above), narrowed to a single true exception ("question_boundary" -- a client-inserted marker
// with no agent work behind it). The other 5 types this constant used to declare non-measurable
// (agent_selection, delegation, delegation_return, delegation_complete, failure_triage) now all
// resolve a real durationMs via resolveEventDuration()/resolveDelegationDuration()/
// resolveEmbeddedDuration() at their own call sites (onDelegationProgress, the failure_triage and
// agent_selection buildHopEvent calls, below) — "a hop is an instance that has work and time, no
// matter how brief" (John, confirmed this session).

// FEATURE: CHI-07 — every logEvent/onEvent call routes through this instead of hand-writing the
// event object. Resolves durationMs once: a caller-supplied real value passes through unchanged;
// an omitted value resolves to null for a declared non-measurable type; an omitted value on any
// other type is a caller bug (a real Date.now()-turnStart was forgotten) — logged via
// console.error, never thrown (never block the user over a logging gap), and still resolves to
// null so the UI degrades the same way a legitimate non-measurable event already does.
export function buildHopEvent(type, agentId, data, durationMs, extra = {}) { // FEATURE: LAV-1a -- exported in place (no body change) for src/hooks/useHarnessStream.js
  let resolved = durationMs;
  if (resolved == null) {
    if (!NON_MEASURABLE_EVENT_TYPES.has(type)) {
      console.error(`FEATURE: CHI-07 — event type "${type}" logged with no durationMs and is not declared non-measurable; pass a real Date.now()-turnStart value, or add "${type}" to NON_MEASURABLE_EVENT_TYPES if this is intentional.`);
    }
    resolved = null;
  }
  return { type, agentId, data, durationMs: resolved, ...extra };
}

// FEATURE: CHI-77 — extracts a human-readable reason from a caught error for the Pipeline Log's
// "error" row. String-safe by construction (STANDARDS.md String Safety): the thrown value can be a
// real Error, a bare string, or an arbitrary object, and .message can be undefined. Surfaces the
// .status and .detail that callCapability's throws (L546 stream-error, L1265 resolve) already carry
// and that onSend's catch currently drops on the floor. Pure string in, pure string out.
// FEATURE: HAR-15 -- a credit-exhausted account fails identically forever, so "try again" is
// actively wrong advice. Same shape as DAT-7's denied-write branch below, keyed on the harness's
// own classification instead of a string match. Platform fault report, not agent content (§19j).
const CREDIT_EXHAUSTED_TEXT = "The platform's AI account is out of credits — not a bug, and no retry will help.";
function faultAdvice(e, fallback) {
  return (e && e.faultCode === "anthropic-credit-exhausted") ? CREDIT_EXHAUSTED_TEXT : fallback;
}

// FEATURE: LOG-109/CHI-91 -- articleFaultText (the analogous platform-fault-report helper for a
// news-card article that could not be read) lives in ../lib/articleFaultText.js, not here: plain
// Node cannot import a .jsx file at all, so a JSX-free module is what lets the regression test
// import the real implementation (LOG-83/resolveAgent.js precedent). Imported above with this
// file's other src/lib/ pure-function helpers.

function describeCaughtError(e) {
  // FEATURE: HAR-15 -- a classified credit exhaustion returns the honest sentence and nothing
  // else; this is what keeps the raw Anthropic JSON blob (and its request_id) out of the
  // Pipeline Log. Every other error keeps CHI-77's exact format below, byte-identical.
  if (e && e.faultCode === "anthropic-credit-exhausted") return CREDIT_EXHAUSTED_TEXT;
  const base = (e && typeof e.message === "string" && e.message) ? e.message : String(e);
  const status = (e && e.status != null) ? ` (status ${e.status})` : "";
  const detail = (e && typeof e.detail === "string" && e.detail) ? ` — ${e.detail}` : "";
  return `${base}${status}${detail}`;
}

// FEATURE: CHI-07 — every setMessages(...) push routes through this instead of a hand-written
// object literal. Whenever hopStart is present, totalElapsedMs is a required companion, not a
// field a caller can silently omit — 7 of this file's 17 setMessages call sites carried
// hopStart/hopEnd but never totalElapsedMs before this fix (submission/info-only/resolution ack
// bubbles). Sites that never carried hop data before this session still don't — this helper
// enforces the pairing, it does not invent hop data for messages that never had it.
function buildMessage({ role = "assistant", kind, text, hopStart, hopEnd, totalElapsedMs, needsReview, reviewReason, estimate, isAnswer, stepRef }) {
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
  // FEATURE: CHI-56 -- the estimate live at turn-start, shown by HopSummaryLine alongside the real
  // elapsed time above. Same != null guard pattern as hopStart/totalElapsedMs.
  if (estimate != null) msg.estimate = estimate;
  // FEATURE: CHI-76 — lets a message opt into the "& Answer" close-status wording (HopSummaryLine's
  // isAnswer). Absent on every existing message → the default branch keeps rendering isAnswer=false.
  if (isAnswer != null) msg.isAnswer = isAnswer;
  // FEATURE: CHI-82 — pass-through step reference ({ n, label }) so a bubble that hands control
  // back to the user wears the same step chip its drawer carries (§19n Decision 3). Absent on
  // every message that doesn't hand control back.
  if (stepRef != null) msg.stepRef = stepRef;
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

// FEATURE: CHI-59 — single shared badge for "this drawer has a decision waiting on you," so every
// pending-HITL-decision drawer in EvidenceColumn carries the exact same visual signal. Replaces
// Draft Forecast's own inline copy of this markup (CHI-50) and the separate inline footer pill
// this session removes from QaEvidenceCardFooter (CHI-05) — one visual language for "your turn."
function NeedsDecisionBadge() {
  return (
    <span style={{fontFamily:mono,fontSize:9,padding:"2px 7px",background:T.brass,color:T.card,borderRadius:2,textTransform:"uppercase",letterSpacing:"0.02em"}}>Needs Your Decision</span>
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
function formatHopSummary(hopEnd, totalElapsedMs, isAnswer = true) {
  if (hopEnd == null || totalElapsedMs == null) return null;
  const hopWord = hopEnd === 1 ? "hop" : "hops";
  // FEATURE: CHI-74 -- non-answer grounded-work bubbles (forecast ack, theory candidates) drop "& Answer"
  const lead = isAnswer ? "Full Agent Routing & Answer" : "Full Agent Routing";
  return `${lead} in ${hopEnd} ${hopWord} total, ${formatElapsed(totalElapsedMs)}`;
}

// FEATURE: CHI-21 — replaces the two previously-stacked <div>s (HopBadge alone, elapsed-time
// caption alone) with one row: badge on the left, enriched summary sentence to its right. Used
// at both MessageBubble render sites (qa branch, default branch) — was duplicated JSX before
// this extraction (Architect Review: duplicate-functionality check).
// FEATURE: CHI-56 — new optional `estimate` prop: the snapshotted workingStatus.expectation string
// (via buildEndStatusEstimate(), Task 4) that was live when the turn started, shown as a second,
// muted line beneath the existing hop-badge/summary row so John can see whether the system's own
// estimate was accurate. Absent (older messages, or a flow that doesn't snapshot one) renders
// nothing extra, same as today.
function HopSummaryLine({ hopStart, hopEnd, totalElapsedMs, accent, estimate, isAnswer = true }) {
  if (hopStart == null || hopEnd == null) return null;
  const summary = formatHopSummary(hopEnd, totalElapsedMs, isAnswer);
  // FEATURE: CHI-71 -- badge + summary + estimate all on one line (was estimate on its own second line)
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4,flexWrap:"wrap"}}>
      <HopBadge hopStart={hopStart} hopEnd={hopEnd} accent={accent}/>
      {summary && (
        <span style={{fontFamily:mono,fontSize:9.5,color:T.muted}}>{summary}</span>
      )}
      {estimate && <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>({estimate})</span>}
    </div>
  );
}

// FEATURE: MI-52 — shared module-scope "first name only" resolver. Previously a local const
// duplicated inside describeDelegationEvent (MI-49); RoutingEventRow now needs the identical
// behavior (Task 1: drawer row headers switch from full name to first-name-only, matching the
// chat status line), so this is the one implementation both call, not a second copy.
// FEATURE: LOO-011 — found live during this session's own Manual QA (not pre-scoped, no pairing/
// grouping logic touched): describeDelegationEvent (below) unconditionally resolves BOTH fromName
// and toName for every event before branching on evt.type, so any event with a null id crashed here
// (`null.split(" ")`) before the delegation_complete branch that doesn't even use fromName was ever
// reached. LOO-011's new originator-credit event is the first-ever caller to pass a null
// fromAgentId (by design — it has no real "from" agent) — this null-guard is the minimal, generic
// root-cause fix, not scoped to any one event type or agent.
function firstNameFor(id, agentById) {
  if (!id) return "";
  return (agentById(id)?.name || id).split(" ")[0];
}

// FEATURE: MI-42 -- generic across every agent pair, no hardcoded names or capability-specific
// branches (matches ARCHITECTURE.md §19d's own anti-hardcoding discipline) -- copy is derived
// entirely from the event's own fromAgentId/toAgentId, resolved against the real roster.
// FEATURE: MI-52 -- was MI-49's first-name-only treatment, scoped to this function only with the
// Agent Routing drawer's own row headers explicitly out of scope (still full names). MI-52 reverses
// that scope note per John's direct instruction this session: RoutingEventRow now also renders
// first name only (see below), via the same firstNameFor() helper this function calls.
export function describeDelegationEvent(evt, agents) { // FEATURE: LAV-1a -- exported in place (no body change) for src/hooks/useHarnessStream.js
  const agentById = (id) => agents.find(a => a.id === id);
  const fromName = firstNameFor(evt.fromAgentId, agentById);
  const toName = firstNameFor(evt.toAgentId, agentById);
  if (evt.type === 'delegation_return') {
    return `${fromName} is back — wrapping up…`; // FEATURE: MI-48 -- was toName (named who control
    // returns TO, not who was actually away and is now done) -- confirmed against the real live SSE
    // payload: fromAgentId is the sub-agent who was helping, toAgentId is who receives control back.
  }
  if (evt.type === 'delegation_complete') { // FEATURE: LOO-009b
    return `${toName} has finished.`;
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
// FEATURE: HAR-17 -- onRecovery is called with the in_progress body's `recovery` payload
// ({fault, agent_id, capability_slug, intent_slug}, S-HAR-17b's server contract) whenever a hop
// checkpoint-recovered from a transient failure — the response-body route is why recovery is
// visible on EVERY call site, streamed and plain-JSON alike (an SSE-event route couldn't reach
// workingStatus on non-streamed sites).
async function resolveInProgress(result, onProgress = null, isStale = () => false, onRecovery = null) {
  let iterations = 0;
  while (result.status === "in_progress") {
    if (isStale()) return result; // FEATURE: CHI-04 — Clear fired mid-chain; caller already bails on this via its own isStale() check
    // FEATURE: HAR-17 -- a recovery continue is not a budget checkpoint: it must not eat the cap
    // sized for MAX_LOOP_DEPTH budget rounds (a successful recovery sequence could otherwise be
    // killed client-side at 10 -- the exact outcome §19o forbids).
    if (result.recovery) {
      if (onRecovery && !isStale()) onRecovery(result.recovery);
    } else if (++iterations > MAX_CONTINUE_ITERATIONS) {
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
  // FEATURE: HAR-17 -- an already-terminal failed row (duplicate/late continue) must never flow
  // into result rendering as if it were content.
  if (result.status === 'failed') {
    throw Object.assign(new Error(result.error || 'chain failed'), { status: 500 });
  }
  return result;
}

// FEATURE: LOO-010 — resolveHopEvents()/the hopEvents array shape are gone. Agent-crediting is now
// fully automatic: finalResult.display_agent_id is set, always, by buildFinalDelegationResult()
// whenever this call resolved via a final delegation (confirmed live in code, no exceptions across
// any current call site) — that single existing field is a complete signal, no caller-supplied
// resolver function was ever needed to answer "did an internal delegation happen." What still
// varies per call site is only the DESCRIPTIVE label (hop_type), unrelated to crediting — a plain
// string, not a function, passed only by a caller whose own agent might legitimately answer
// directly (qa_answer/proofreader — Jordan's news-search and the display call always delegate, so
// neither needs one).
// FEATURE: AGT-37 -- handler_context is a sibling of task_context, never a key inside it. task_context
// is prompt material (db-assembly.js serializes every non-empty key into the agent's prompt);
// handler_context reaches the capability's write handler and stops there, so the caller can hand over
// facts the model must not see. Null for every existing call site -- byte-identical.
export async function callCapability({ capability_slug, intent_slug, agent_id, task_context, handler_context = null, runtime_context = null, format_skill_profile_slug = null, display_agent_id = null, onProgress = null, isStale = () => false, onEvent = null, hop_type = null, onRecovery = null }) { // FEATURE: HAR-17 -- onRecovery threaded straight through to resolveInProgress()
  const t0 = Date.now();
  const res = await fetch("/api/capabilities/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      capability_slug, intent_slug, agent_id, task_context, handler_context, runtime_context,
      format_skill_profile_slug, display_agent_id,
      tenant_id: TENANT_ID,
      stream: !!onProgress,
    }),
  });
  if (!res.ok) throw new Error(`${capability_slug} ${intent_slug} failed: ${res.status}`);
  const first = onProgress ? await readSSEResult(res, onProgress) : await res.json();
  const result = await resolveInProgress(first, onProgress, isStale, onRecovery); // FEATURE: CHI-04; HAR-17 -- recovery visibility
  // FEATURE: MI-67 — patterns_used was a real, already-computed sibling field on `result` that
  // this unwrap discarded; every event built from this return needs it for an accurate Agent
  // Routing log.
  // FEATURE: LOO-009/CHI-37 — bug found via this session's own live UI verification (not the 23-
  // question diff, which couldn't have caught this — see below): `result.status` truthy (e.g. a
  // real "final_delegation" status, confirmed live on the Jordan→Alex response) used to `return
  // result` immediately, before any hop-event logic ran. Computing the return value first and
  // firing hop events off *that* value afterward (whichever branch it took) fires correctly either
  // way, instead of only ever firing for the plain-content branch. Task 2b's 23-question live diff
  // derived its own "old"/"new" comparison from a standalone test-script reimplementation of this
  // same early-return, so both sides of that comparison shared the identical gap and produced no
  // visible diff — it took loading the real MI screen and watching hop 2 (Alex) never appear to
  // surface this. Return-value semantics for every existing caller are byte-identical to before
  // (same `result.status ? result : {...}` branch, just computed once instead of returned inline).
  // FEATURE: LOG-79 -- the unwrap now threads the response's trace identity (trace_id/span_id,
  // execute.js's generic passthrough) instead of the legacy patterns_used field: the Agent
  // Routing drawer's pattern line joins to the ai_call_patterns view via these ids, so events
  // whose data is this finalResult inherit them with no per-site change. The status branch
  // (`result` as-is) already carries both ids top-level.
  const finalResult = result.status ? result : { ...(result.content || {}), trace_id: result.trace_id, span_id: result.span_id };
  // FEATURE: LOO-010 — fires only when this call's own agent genuinely answered directly
  // (finalResult.display_agent_id is null/undefined — loose equality intentional, both mean "no
  // delegation resolved this call"). When a delegation DID resolve it, display_agent_id is always
  // set and the harness's own live delegation_complete event (LOO-009) already credited the real
  // completing agent — nothing to do here in that case.
  if (onEvent && hop_type && !isStale() && finalResult.display_agent_id == null) {
    onEvent(buildHopEvent(hop_type, agent_id, finalResult, Date.now() - t0));
  }
  return finalResult;
}

// FEATURE: MI-01d — resolve a pending_confirmation (accept/reject/edit). Generic across any
// capability — the confirmation_id already encodes which capability/agent/intent it belongs to.
// FEATURE: MI-42 — gains the identical onProgress/stream treatment for consistency (Nadia's
// confirmation-resolve path); no live call site opts in this session (see Task 3g), future-proofing.
async function resolveConfirmation({ confirmation_id, resolution, edited_task_context = null, onProgress = null, isStale = () => false, onRecovery = null }) { // FEATURE: HAR-17 -- onRecovery threaded straight through to resolveInProgress()
  const res = await fetch("/api/capabilities/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "resolve", confirmation_id, resolution, edited_task_context, stream: !!onProgress }),
  });
  // FEATURE: DAT-7 -- read the response body on failure and forward status/detail so
  // onResolveConfirmation()'s catch can branch on a real denial tier instead of a generic message.
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // FEATURE: HAR-15 -- forward the same classification fields the SSE path carries, so a
    // credit-exhausted failure reads identically on the non-streamed resolve path.
    throw Object.assign(new Error(body.error || `resolve ${resolution} failed: ${res.status}`), { status: res.status, upstreamStatus: body.upstreamStatus, failureClass: body.failureClass, faultCode: body.faultCode, detail: body.detail || null });
  }
  const first = onProgress ? await readSSEResult(res, onProgress) : await res.json();
  return resolveInProgress(first, onProgress, isStale, onRecovery); // FEATURE: CHI-04; HAR-17 -- recovery visibility
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
// FEATURE: CHI-33 — backgroundContext is an optional extra object (article_content/article_source
// from a news-card click, api/fetch-article.js) spread into this call's task_context only, never
// into the visible chat bubble (that's built separately by the caller, submit() below, from the
// plain confirmed question text). Unset (every existing caller) is byte-identical.
// FEATURE: HAR-17 -- onRecovery threaded into every user-visible-wait call in this pipeline so a
// checkpoint-recovered hop annotates the live chat status line (Task 3's wire-up list).
export async function runQaWithQualityGate(message, conversationContext, onEvent, setStatus, onProgress, isStale = () => false, backgroundContext = null, onRecovery = null) { // FEATURE: LAV-1a -- exported in place (no body change) for src/hooks/useHarnessStream.js
  // FEATURE: AA-164 -- surfaces an internal request_help hop Marcus's own ci-answer-intent turn
  // took (e.g. delegating to Eleanor Voss for a catalog question, AA-162) using the exact same
  // generic Pipeline Log case already rendering Michelle's Display-agent hand-off below (same
  // shape, same execute.js code path -- not a new event type).
  // FEATURE: MI-52 -- agentId re-pointed to the picker (Michelle) whose own reasoning is the row's
  // summary text, not the requester (Marcus) -- secondaryAgentId dropped, RoutingEventRow no longer
  // renders a second agent. durationMs: null (was a fabricated 0) -- not separately measurable from
  // the client, this hop shares its one real round trip with qa_answer above.
  // FEATURE: LOO-010 -- migrated onto automatic crediting (Task 1); hop_type is now a plain string,
  // fires only when Marcus genuinely answered directly (no internal delegation resolved this call).
  const qa = await callCapability({
    capability_slug: "channel-intelligence", intent_slug: "ci-answer-intent", agent_id: "marcus",
    task_context: { goal: message, ...(backgroundContext || {}) }, runtime_context: conversationContext, onProgress, isStale, onRecovery,
    onEvent, hop_type: "qa_answer",
  });
  if (isStale()) return qa; // FEATURE: CHI-04 — stop before Owen's quality-gate hop

  setStatus("Owen is reviewing…"); // FEATURE: MI-42 (was MI-41) -- macro-hop swap, was invisible before
  // FEATURE: MI-52 -- secondaryAgentId dropped; the retry is already named in this row's own summary
  // text (describePipelineEvent's "proofreader" case: " (Owen retried via Marcus)"), no info loss.
  // FEATURE: LOO-010 -- migrated onto automatic crediting (Task 1).
  // FEATURE: CHI-53 -- backgroundContext now threads through to Owen's review call too, not just
  // Marcus's own call above -- he was structurally blind to article-sourced answers otherwise.
  // FEATURE: CHI-56 -- this call's own real round trip, so failure_triage below (an embedded
  // sub-field of this same response, not an independent event) can attribute the same real,
  // honestly-measured duration the sibling "proofreader" event already gets via callCapability's
  // own internal hop_type timing.
  const t0 = Date.now();
  const gate = await callCapability({
    capability_slug: "quality-gate", intent_slug: "qg-review-intent", agent_id: "owen",
    task_context: {
      question: message, candidate_answer: qa.answer, confidence_tier: qa.confidence_tier, citations: qa.citations,
      agent_id: "marcus", capability_slug: "channel-intelligence", intent_slug: "ci-answer-intent",
      ...(backgroundContext || {}),
    },
    onProgress, isStale, onRecovery,
    onEvent, hop_type: "proofreader",
  });
  if (isStale()) return gate; // FEATURE: CHI-04 — stop before the display hand-off hop
  const retried = !!gate.final_answer;

  if (gate.guardrail?.result === "block") {
    // FEATURE: AA-171 fix (S-ARCH-QG-ESCALATION-01) -- Owen's own qg-review-intent turn now
    // performs the escalation hand-off itself (request_help -> Michelle's real recommendation ->
    // delegate_to_agent, non-final) when a block isn't fixable by his own retry. This screen no
    // longer inspects gate.guardrail and picks the next call on Owen's behalf -- that was the
    // AA-171 Rule #1 violation ARCHITECTURE.md §19d exists to prevent. gate.triage carries
    // whatever the real delegate returned, copied verbatim by Owen; gate.last_help_selection
    // carries Michelle's own real reasoning for the pick, surfaced the same way AA-164 already
    // surfaces Marcus's own request_help hop above (qa.last_help_selection).
    // FEATURE: LOG-15 — gate.triage never carried the pattern-line identity; the real value lives
    // one level up on gate itself (the shared callCapability() wrapper's top-level fields), not
    // nested inside gate.triage. Hoisted explicitly so failure_triage's pattern line shows real
    // data. FEATURE: LOG-79 -- that identity is now trace_id/span_id (joined to the
    // ai_call_patterns view at render time), not the legacy patterns_used array.
    // FEATURE: LOG-95 (§19p) -- the row credits the picker when she made the pick, Owen otherwise;
    // its span identity must match: the picker's own span (now carried on last_help_selection via
    // Task 1a's executor threading) when she's credited, the gate execution's when Owen is. A
    // wrong-agent span is worse than a missing one (.claude/rules/hop-event-span-identity.md).
    const triageCredited = gate.last_help_selection?.selected_by_agent_id
      ? { trace_id: gate.last_help_selection.trace_id ?? gate.trace_id, span_id: gate.last_help_selection.span_id ?? null }
      : { trace_id: gate.trace_id, span_id: gate.span_id };
    onEvent(buildHopEvent("failure_triage", gate.last_help_selection?.selected_by_agent_id || "owen", { ...gate.triage, ...triageCredited }, resolveEmbeddedDuration(Date.now() - t0)));
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
  setStatus("Marcus is preparing the response…"); // FEATURE: MI-42 (was MI-41)
  // FEATURE: MI-52 -- agent_selection (the picker's reasoning) and display_format (the formatter's
  // completion) describe two sub-phases of one un-separable server round trip -- one callCapability()
  // call, one client-observable elapsed time. agent_selection's agentId is now the picker (Michelle),
  // not the requester (Marcus); durationMs: null there (not a fabricated duplicate of the real
  // number below). display_format's agentId is now the actual formatter (display.display_agent_id),
  // not the picker with a requester fallback; it keeps the one real, actually-measured durationMs.
  // secondaryAgentId dropped from both -- RoutingEventRow no longer renders a second agent.
  // FEATURE: LOO-009/CHI-37 -- migrated onto the generic hop-completion mechanism (Task 1). Preserves
  // the exact AA-137/AA-135 string-fallback edge case byte-for-byte: when display is a raw string,
  // r.display_agent_id/r.selection both resolve to undefined via the same unconditional property
  // read today's code already performed before the string check ran, so both resolvers return
  // falsy/null and produce zero events -- identical real behavior, not "improved".
  // FEATURE: LOO-009/CHI-37 -- hopEvents order is agent_selection BEFORE display_format, matching
  // the pre-Task-2a hand-written order exactly (Michelle's pick is reasoned/logged first, then the
  // chosen display agent's own completion). Task 2b's live 23-question regression proof (real dev
  // preview run) caught this as a 100%-reproducible order swap when this array was first written in
  // the reverse order (display_format, agent_selection) -- every question that reached the display
  // hand-off showed OLD "agent_selection:michelle -> display_format:X" vs NEW "display_format:X ->
  // agent_selection:michelle", a real hop-sequence/numbering change, not a false positive. Fixed
  // here per this task's own "any diff is a regression, stop and fix" directive.
  // FEATURE: CHI-53 -- backgroundContext now threads through to the Display call too, completing
  // the pipeline (Marcus's own call already had it) -- see Owen's call above for the same fix.
  const display = await callCapability({
    capability_slug: "channel-intelligence", intent_slug: "ci-answer-display-intent", agent_id: "marcus",
    task_context: { answer: finalAnswer.answer, citations: finalAnswer.citations, confidence_tier: finalAnswer.confidence_tier, needs_review, review_reason, ...(backgroundContext || {}) },
    onProgress, isStale, onRecovery,
  });
  if (isStale()) return display; // FEATURE: CHI-04

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

// FEATURE: CHI-33 — backgroundContext threaded straight through to runQaWithQualityGate() below,
// never applied to the routing call above (routing only ever needs the plain question text to
// classify intent). Unset (every existing caller) is byte-identical.
async function runIntentPipeline(message, conversationContext, onEvent, setStatus, onProgress, isStale = () => false, backgroundContext = null, onRecovery = null) { // FEATURE: HAR-17
  const t0 = Date.now();
  const routing = await callCapability({
    capability_slug: "channel-intelligence", intent_slug: "ci-routing-intent", agent_id: "marcus",
    task_context: { goal: message }, runtime_context: conversationContext, onProgress, isStale, onRecovery,
  });
  if (isStale()) return { kind: "non_qa", text: "" }; // FEATURE: CHI-04 — discarded by submit()'s own isStale() check regardless; value here is never rendered
  onEvent(buildHopEvent("intent_routing", "marcus", routing, Date.now() - t0));
  if (routing.intent === "escalate") {
    return { kind: "non_qa", text: ESCALATE_PLACEHOLDER };
  }
  if (routing.intent !== "qa") {
    return { kind: "hyp_entry", intent: routing.intent, extractedHypothesis: routing.extracted_hypothesis, flaggedQuestion: message };
  }
  return runQaWithQualityGate(message, conversationContext, onEvent, setStatus, onProgress, isStale, backgroundContext, onRecovery); // FEATURE: HAR-17
}

// FEATURE: MI-02/MI-03 — Generate Hypotheses (Priya/hypothesis-evaluation). Skips straight to
// the picker, pre-filled, when the user already wrote their own claim.
async function generateHypotheses({ flaggedQuestion, flaggedAnswer, reviewReason, isStale = () => false, onRecovery = null }) { // FEATURE: HAR-17
  const gen = await callCapability({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-generation-intent", agent_id: "priya",
    task_context: {
      flagged_question: flaggedQuestion,
      flagged_answer: flaggedAnswer || "",
      review_reason: reviewReason || "user-initiated, no explicit claim extracted",
    },
    isStale, onRecovery,
  });
  // FEATURE: MI-67b — the pattern-line identity was being discarded here, one layer above
  // callCapability()'s own MI-67 fix; the caller needs both the hypotheses array (unchanged
  // shape/contract) and the real identity for its Agent Routing log event. FEATURE: LOG-79 --
  // that identity is now trace_id/span_id (the render layer joins them to ai_call_patterns),
  // not the legacy patterns_used array.
  return { hypotheses: gen.hypotheses || [], trace_id: gen.trace_id, span_id: gen.span_id };
}

// FEATURE: S-ARCH-DISPLAY-LOOP-02 (AA-116) — real Display-agent hand-off for AI - Hypothesis
// Test, mirroring runQaWithQualityGate's real two-call chain (S-ARCH-DISPLAY-LOOP-01/AA-115):
// Priya's own hyp-hypothesis-test-intent call (her genuine analytical schema, separate from
// Alex's presentational one) followed by a real request_help -> Michelle (agent-selection-intent)
// -> delegate_to_agent(is_final:true) hand-off via hyp-hypothesis-test-display-intent. Alex is one
// candidate Michelle reasons over, not a guaranteed/hardcoded target — the old bundled
// format_skill_profile_slug/display_agent_id override (AA-77 format-last pattern) is gone entirely.
async function runHypothesisTest({ hypothesis, intent, flaggedQuestion, flaggedAnswer, priorHypothesisTest, onEvent, setStatus, onProgress, isStale = () => false, onRecovery = null }) { // FEATURE: HAR-17
  const analysis = await callCapability({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-hypothesis-test-intent", agent_id: "priya",
    task_context: {
      hypothesis, intent,
      flagged_question: flaggedQuestion || "", flagged_answer: flaggedAnswer || "",
      prior_hypothesis_test: priorHypothesisTest || null,
    },
    onProgress, isStale, onRecovery,
  });
  if (isStale()) return analysis; // FEATURE: CHI-04 — stop before the display hand-off hop

  const t0 = Date.now();
  const display = await callCapability({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-hypothesis-test-display-intent", agent_id: "priya",
    task_context: { supports: analysis.supports, complicates: analysis.complicates, consider: analysis.consider, confidence: analysis.confidence },
    onProgress, isStale, onRecovery,
  });
  if (isStale()) return display; // FEATURE: CHI-04
  // FEATURE: MI-52 -- same treatment as runQaWithQualityGate()'s Display-agent hand-off above:
  // agent_selection's agentId is the picker (Michelle), durationMs: null (not a fabricated duplicate);
  // display_format's agentId is the actual formatter (display.display_agent_id), real durationMs kept.
  // secondaryAgentId dropped from both.
  if (display.selection) {
    // FEATURE: CHI-56 -- agent_selection is an embedded sub-field of this same display call, not an
    // independent event; attribute the same real, already-measured parent-call duration the sibling
    // "display_format" event below computes (same t0, same one round trip).
    onEvent(buildHopEvent("agent_selection", display.selection.selected_by_agent_id, display.selection, resolveEmbeddedDuration(Date.now() - t0)));
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
  // data — it must carry the ANALYSIS step's real pattern identity (this function's own hyp-
  // hypothesis-test-intent call), not the DISPLAY step's (hyp-hypothesis-test-display-intent,
  // already correctly attributed to the separate display_format event two lines above). Every
  // branch below explicitly sets the identity from `analysis`, overriding whatever `display`
  // itself carries. FEATURE: LOG-79 -- that identity is now trace_id/span_id (joined to the
  // ai_call_patterns view at render time), not the legacy patterns_used array.
  return typeof display === "string"
    ? { headline: display, supports: null, complicates: null, consider: null, confidence: null, display_agent_card: null, display_agent_id: null, selection: null, trace_id: analysis.trace_id, span_id: analysis.span_id }
    : typeof display.content === "string"
    ? { headline: display.content, supports: null, complicates: null, consider: null, confidence: null, display_agent_card: display.display_agent_card, display_agent_id: display.display_agent_id, selection: display.selection, trace_id: analysis.trace_id, span_id: analysis.span_id }
    : { ...display, trace_id: analysis.trace_id, span_id: analysis.span_id }; // final_delegation shape: every intelligence-review-format field + display_agent_card/id/selection, trace/span identity overridden to the real analytical call's
}

// FEATURE: MI-51 — index/onGoodThanks added so a specific message's reviewChoice can be set
// (Good, thanks / exploring / undecided), threaded through from the parent's messages array.
// FEATURE: CHI-03a — `hyp_submitted`/`hypothesis_test` cases deleted entirely (moved into
// EvidenceColumn, Task 3/4); `qaEvidence` added so the shrunk `qa` case's review-outcome note
// (Good, thanks / Sent to Priya) can still render in chat, sourced from the shared qaEvidence
// state slot instead of msg.reviewChoice (onGoodThanks/onReview no longer index into messages).
function MessageBubble({ msg, index, onReview, onGoodThanks, qaEvidence }) {
  const isMobile = useIsMobile(); // FEATURE: CHI-88 — the qa pointer sentence below is surface-specific
  // FEATURE: CHI-42 — kind:"user_action" narration bubbles (pushed synchronously at the moment of
  // a user decision, before any async ack) render as "You" bubbles too, via kind rather than role —
  // see STYLE-GUIDE.md §36 for the full rationale (role:"user" would leak into conversationContext()).
  const isUser = msg.role === "user" || msg.kind === "user_action";

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
          {/* FEATURE: CHI-36 — pointer sentence always renders first; when needs_review is set, its own
              wording changes to lead into the flag narrative below it instead of closing the thought.
              Reverses CHI-08's original narrative-first order (John's direct call, live walkthrough). */}
          {/* FEATURE: CHI-88 — the pointer has to be true on the surface it renders on. Mobile has no
              "right" (Steps & Evidence is a tab above the chat), so mobile points at the tap; desktop
              keeps its wording but names the column correctly — it was renamed to "Steps & Evidence"
              by CHI-82 and this copy still said "Evidence column" (.claude/rules/chi-vocabulary.md). */}
          {isMobile
            ? (msg.needs_review
              ? "I've pulled together an answer — tap Steps & Evidence above for the full breakdown. Before you do, let me give you a quick background about the data ..."
              : "I've pulled together an answer — tap Steps & Evidence above for the full breakdown. Let me know if you have questions.")
            : (msg.needs_review
              ? "I've pulled together an answer — review the full breakdown in the Steps & Evidence column to the right. Before you do, let me give you a quick background about the data ..."
              : "I've pulled together an answer — review the full breakdown in the Steps & Evidence column to the right. Let me know if you have questions.")}
          {msg.needs_review && (
            <div style={{color:T.brassDeep,marginTop:8}}>
              ⚑ {msg.review_reason || "flagged for review"}
            </div>
          )}
        </div>
        {/* FEATURE: CHI-21 — combined hop badge + elapsed-time row (was 2 stacked divs). FEATURE:
            CHI-56 — estimate prop threaded through so End status shows the original estimate
            alongside the real elapsed time (only this qa branch — the default branch below never
            carries an estimate today). */}
        <HopSummaryLine hopStart={msg.hopStart} hopEnd={msg.hopEnd} totalElapsedMs={msg.totalElapsedMs} accent={T.navy} estimate={msg.estimate}/>
        {qaEvidence?.reviewChoice === "good" && (
          <div style={{marginTop:6,fontFamily:body,fontSize:11,fontStyle:"italic",color:T.muted}}>✓ Good, thanks — no further action.</div>
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
        // FEATURE: CHI-42 — user_action bubbles use T.navyMid (already-existing, already-reused
        // token), not solid T.navy — that fill stays reserved for real typed input. See STYLE-GUIDE.md §36.
        background: msg.kind === "user_action" ? T.navyMid : (isUser ? T.navy : (msg.needs_review ? "#f3e6cc" : T.card)),
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
        {/* FEATURE: CHI-82 — the handoff's step chip, inline at the end of the bubble text: the
            same visual chip the named drawer's title wears (§19n Decision 3). */}
        {msg.stepRef && <span style={{marginLeft:4}}><StepChip n={msg.stepRef.n} label={msg.stepRef.label}/></span>}
      </div>
      {/* FEATURE: CHI-21 — combined hop badge + elapsed-time row (was 2 stacked divs), same
          component as the qa branch above. */}
      {/* FEATURE: CHI-74 -- non-answer grounded-work bubbles carry their own close (elapsed vs expected); estimate + isAnswer=false threaded here */}
      {/* FEATURE: CHI-76 -- isAnswer now message-driven: existing non-answer bubbles (ack, candidates)
          carry no isAnswer field so this still defaults false; the hyp-test completion sets it true. */}
      <HopSummaryLine hopStart={msg.hopStart} hopEnd={msg.hopEnd} totalElapsedMs={msg.totalElapsedMs} accent={T.navy} estimate={msg.estimate} isAnswer={msg.isAnswer ?? false}/>
      {/* FEATURE: MI-51 — mirrors the qa branch's universal 3-state guided prompt above, for the
          non-qa needs_review case (no message today reaches this with needs_review true, but this
          keeps the treatment consistent should a future non-qa kind carry the flag). */}
      {!isUser && msg.needs_review && (
        <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
          {msg.reviewChoice === "good" && (
            <div style={{fontFamily:body,fontSize:11,fontStyle:"italic",color:T.muted}}>✓ Good, thanks — no further action.</div>
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
      {/* FEATURE: CHI-43 — own header row removed; its title text now lives as the wrapping Drawer's
          `title` prop (EvidenceColumn, Task 2) so the two headers don't stack. */}
      {/* FEATURE: CHI-45 — HopBadge relocated out of this body to the wrapping Drawer's headerRight
          (always visible, open or collapsed) — see STYLE-GUIDE.md §40's CHI-45 amendment. */}
      <div style={{borderBottom:`1px solid ${T.line}`}}>
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
    </div>
  );
}

// FEATURE: CHI-13 — extracted from QaEvidenceCard's old inline footer (see STYLE-GUIDE.md §35,
// unchanged) so EvidenceColumn can render it in its own pinned footer slot instead of wherever
// QaEvidenceCard's content happens to end.
// FEATURE: CHI-88a -- `compact` is a pure passthrough to DecisionFooter's own opt-in variant; this
// component holds no layout of its own, so there is nothing here to branch on.
function QaEvidenceCardFooter({ qa, onGoodThanks, onReview, compact }) {
  // FEATURE: CHI-71 -- standardized via the shared DecisionFooter (cream field + tan text + navy CTA)
  return (
    <DecisionFooter
      prompt="Good with this analysis, or would you prefer deeper theories?"
      secondaryLabel="Good, thanks"
      onSecondary={onGoodThanks}
      primaryLabel="Have Priya generate theories →"
      onPrimary={onReview}
      compact={compact}
    />
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
// FEATURE: CHI-58 — simplified: the hypFlow branch is dead code now that the Candidates drawer
// (its only caller that ever passed a real hypFlow) generates its own copy inline (Task 2 above).
// The News drawer's empty-state call site (L1931) always passes no argument.
function getEvidencePanelSentence() {
  return "Once Marcus has an answer or a theory to test, it'll appear here for you to review and act on.";
}

// FEATURE: CHI-38/CHI-39 — shared shimmer sweep overlay. Reuses tokens.js's existing `shimmer`
// keyframe (already used by TaskInstructionsScreen.jsx's step-loading bar) — no new keyframe, no
// new colors. Absolutely positioned; the parent must have position:"relative" and ideally
// overflow:"hidden" so the sweep doesn't bleed past rounded/bordered edges.
function ShimmerSweep() {
  return (
    <div style={{position:"absolute",inset:0,background:`linear-gradient(90deg,transparent 0%,rgba(182,135,58,0.28) 50%,transparent 100%)`,backgroundSize:"200% 100%",animation:"shimmer 1.2s linear infinite",pointerEvents:"none"}}/>
  );
}

// FEATURE: CHI-38 — skeleton placeholder mimicking NewsCard's exact box (same T.cardAlt/T.lineSoft/
// padding as the real card below) so the loading state doesn't jump in size once real cards arrive.
// Three muted bars stand in for headline/snippet/source-line; ShimmerSweep animates over the whole card.
function NewsCardSkeleton() {
  return (
    <div style={{background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:"10px 12px",position:"relative",overflow:"hidden"}}>
      <div style={{height:13,width:"70%",background:T.line,marginBottom:6}}/>
      <div style={{height:10,width:"92%",background:T.line,marginBottom:4,opacity:0.6}}/>
      <div style={{height:10,width:"38%",background:T.line,opacity:0.6}}/>
      <ShimmerSweep/>
    </div>
  );
}

// FEATURE: CHI-73 — shimmering placeholders for a Column-2 drawer that's open but still waiting on
// its content, shaped like the rows about to land (id-chip + text bar for a candidate; stacked bars
// for a result). Reuses ShimmerSweep — same `shimmer` keyframe, same T.card/T.line tokens the News
// drawer's NewsCardSkeleton already uses (no new keyframe, no new color). Parent has position:
// relative + overflow:hidden so the sweep stays inside the card edges.
function CandidateRowSkeleton() {
  return (
    <div style={{padding:"9px 11px",background:T.card,border:`1px solid ${T.lineSoft}`,position:"relative",overflow:"hidden",display:"flex",gap:8,alignItems:"center"}}>
      <div style={{height:11,width:22,background:T.line,flexShrink:0}}/>
      <div style={{height:11,width:"80%",background:T.line,opacity:0.7}}/>
      <ShimmerSweep/>
    </div>
  );
}
function ResultSkeleton() {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,padding:"9px 11px",background:T.card,border:`1px solid ${T.lineSoft}`,position:"relative",overflow:"hidden"}}>
      <div style={{height:11,width:"55%",background:T.line}}/>
      <div style={{height:10,width:"92%",background:T.line,opacity:0.6}}/>
      <div style={{height:10,width:"88%",background:T.line,opacity:0.6}}/>
      <div style={{height:10,width:"40%",background:T.line,opacity:0.6}}/>
      <ShimmerSweep/>
    </div>
  );
}

// FEATURE: CHI-33 — Column 2 news card, true-empty-state only. Reuses EvidenceColumn's existing
// card visual language (T.cardAlt background, T.lineSoft border, mono/body font tokens already in
// scope in this file) -- no new colors, no new border styles, no new spacing scale, per this
// session's DESIGN RULES. String-safe: headline/snippet/source may be absent on a malformed card,
// JSX simply renders nothing for an undefined child rather than throwing.
function NewsCard({ card, loading, onClick, analyzed }) {
  // FEATURE: CHI-33-patch -- card.published_at is "YYYY-MM-DD" per Alex's news-cards-format schema,
  // already live/populated; nullable when Jordan/Alex genuinely don't know the date. The
  // +"T00:00:00" avoids a UTC-midnight-rollback-to-previous-day display bug in timezones west of UTC.
  const formattedDate = card?.published_at
    ? new Date(card.published_at + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  return (
    // FEATURE: CHI-58 — border highlight on analyzed, same T.brassDeep accent + uppercase-label
    // pattern the Candidates drawer's "Chosen" badge already established (STYLE-GUIDE.md §40).
    <div onClick={onClick} style={{background:T.cardAlt,border:`1px solid ${analyzed ? T.brassDeep : T.lineSoft}`,padding:"10px 12px",cursor:"pointer",opacity:loading?0.6:1}}>
      <div style={{display:"flex",gap:8}}>
        <div style={{fontFamily:body,fontSize:12.5,fontWeight:600,color:T.ink,marginBottom:3,flex:1}}>{card?.headline}</div>
        {analyzed && (
          <span style={{fontFamily:mono,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.brassDeep,flexShrink:0}}>Analyzed</span>
        )}
      </div>
      {card?.snippet && <div style={{fontFamily:body,fontSize:11,color:T.muted,lineHeight:1.4,marginBottom:5}}>{card.snippet}</div>}
      <div style={{fontFamily:mono,fontSize:9.5,color:T.mutedDeep,textTransform:"uppercase",letterSpacing:"0.04em"}}>
        {card?.source}{formattedDate ? ` · ${formattedDate}` : ""}{loading ? " · Loading…" : ""}
      </div>
    </div>
  );
}

// FEATURE: CHI-49 — pure, testable: true once a theory has been chosen and a test is
// running/landed/being acted on. Shared between computeAutoCurrent (useDrawerStack's priority
// list) and the Result drawer's own render gate so the two can never drift out of sync on which
// stages count.
// FEATURE: CHI-82 — hoisted verbatim from inside EvidenceColumn to module scope (it's pure, no
// closure state) so the top-level journey arrival effect can share the exact same phase
// definition instead of duplicating it. Logic unchanged.
function isHypInResultPhase(hypFlow) {
  return !!(hypFlow && (hypFlow.stage === "testing" || hypFlow.stage === "result" || hypFlow.stage === "committing" || hypFlow.confirmation));
}

// FEATURE: CHI-50 — true once Nadia's data-patch proposal has actually landed
// (hypFlow.confirmation set) — a strict subset of isHypInResultPhase (every hyp-draft moment is
// also a result-phase moment, since confirmation only ever arrives after a test result exists).
// Drives the "hyp-draft" autoCurrent key and the Draft Forecast drawer's own render gate,
// kept in sync the same way isHypInResultPhase already keeps hyp-result/Result in sync.
// FEATURE: CHI-82 — hoisted to module scope alongside isHypInResultPhase (same reason, above).
function isHypAwaitingConfirmation(hypFlow) {
  return !!(hypFlow && hypFlow.confirmation);
}

// FEATURE: CHI-13 — single source of truth for which decision (if any) is currently pending in
// Evidence, so exactly one footer renders at a time, pinned to the bottom of the card instead of
// wherever it happens to land in scroll flow. Priority order: confirmation > hypothesis result >
// qa review — mirrors the mutual exclusion the old inline gates (!hypFlow.confirmation,
// stage === "result") already enforced implicitly, just centralized instead of scattered.
function selectEvidenceFooterKind(qaEvidence, hypFlow) {
  // FEATURE: CHI-51 — once resolved, no decision is pending anymore; both hyp branches below
  // must not re-fire just because hypFlow.confirmation/hypothesisTest are still populated
  // (Task 2a/2b deliberately keep them, for drawer persistence).
  if (hypFlow?.confirmation && !hypFlow.resolution) return "hyp-confirmation";
  if (hypFlow?.hypothesisTest && hypFlow.stage === "result" && !hypFlow.resolution) return "hyp-result";
  if (qaEvidence && !qaEvidence.reviewChoice) return "qa-review";
  return null;
}

// FEATURE: CHI-51 — generic drawer-stack orchestration service (STYLE-GUIDE.md §40/§29's shared
// pattern, consolidated out of 5 previously-separate pieces of EvidenceColumn local state:
// computeAutoCurrent(), manualOverride, the reset/auto-scroll effect, isDrawerOpen(),
// handleDrawerToggle()). A caller uses this one hook instead of hand-rolling those pieces itself
// — a future 6th drawer type extends the `priorityChecks` list, not five call sites.
//
// priorityChecks: ordered array of [key, isActive] pairs — first active entry wins (list
// highest-priority first). scrollRef: the scroll container to reset-scroll on a genuine
// transition. transitionDeps: extra values (beyond the computed current key itself) that should
// also count as "a genuine transition" — e.g. a stage advancing without the key changing.
// resolved: true once some tracked flow has concluded — today sourced from isHypResolved(hypFlow)
// by this hook's one real caller, but this parameter itself is generic, not hyp-specific; a
// future resolution-having drawer type would pass its own equivalent signal here, not add a
// parallel mechanism. freshDeps: values whose next change ends the post-resolution quiet period
// (a brand-new question, new content arriving) — deliberately separate from transitionDeps, since
// "the same flow advancing a stage" and "something genuinely new arriving" are different events.
function useDrawerStack(priorityChecks, scrollRef, transitionDeps, resolved, freshDeps, alsoOpenWhen = {}) {
  const autoCurrent = priorityChecks.find(([, active]) => active)?.[0] ?? null;
  const [manualOverride, setManualOverride] = useState(null); // {key, open} | null

  useEffect(() => {
    setManualOverride(null);
    const container = scrollRef.current;
    if (!container) return;
    // FEATURE: CHI-71 -- bring the newly-active drawer's TOP into view (was: jump to column bottom)
    const el = autoCurrent ? container.querySelector(`[data-drawer-key="${autoCurrent}"]`) : null;
    if (el) {
      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      container.scrollTo({ top: container.scrollTop + (eRect.top - cRect.top), behavior: "smooth" });
    } else {
      container.scrollTo({ top: 0, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCurrent, ...transitionDeps]);

  // FEATURE: CHI-51 — once `resolved` transitions true, suppress auto-open until freshDeps' next
  // genuine change. Two separate effects, deliberately not one: `resolved` staying true forever
  // (it's a permanent field once a theory cycle concludes) must not itself keep re-suppressing on
  // every render — only the true transition (false→true) should flip suppression on.
  const [suppressed, setSuppressed] = useState(false);
  useEffect(() => { if (resolved) setSuppressed(true); }, [resolved]);
  useEffect(() => {
    setSuppressed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, freshDeps);

  const effectiveAutoCurrent = suppressed ? null : autoCurrent;
  // FEATURE: CHI-58 — generic "stays open alongside" pairing: a key listed here also counts as open
  // whenever the effective current key is one of its named partners, manual override still wins
  // either way. Not hyp-specific — a future drawer pair needing the same relationship reuses this
  // parameter instead of a second bespoke mechanism. Today's only caller passes {"hyp-result":
  // ["hyp-draft"]}: Result stays open once Draft Forecast arrives, reversing CHI-50's original
  // "Result collapses underneath" choice (STYLE-GUIDE.md §40, CHI-58 amendment).
  const isOpen = (key) => {
    if (manualOverride && manualOverride.key === key) return manualOverride.open;
    if (key === effectiveAutoCurrent) return true;
    return !!(alsoOpenWhen[key] && alsoOpenWhen[key].includes(effectiveAutoCurrent));
  };
  const toggle = (key) => (willOpen) => setManualOverride({ key, open: willOpen });

  return { isOpen, toggle };
}

// FEATURE: CHI-82 — getStep reads the parent's journey (arrival-order step numbers, §19n): drawer
// titles wear the number via StepChip, and the ambient flex-order sort keys off it.
// FEATURE: CHI-82b — hypIsCurrent (the top-level hypCurrent membership signal) gates the three
// hyp "Needs Your Decision" badges: an abandoned previous journey's ambient drawers must not
// keep soliciting a decision. The qa/Analysis badge is deliberately NOT gated (qaEvidence is a
// single slot overwritten each journey — no stale case).
function EvidenceColumn({ hypFlow, qaEvidence, onIntentChange, onSelectHypothesis, onDiscard, onCommit, onResolveConfirmation, onGoodThanks, onReview, newsCards, onAnalyzeNewsCard, newsCardLoadingUrl, newsCardsStartedAt, bare, getStep, hypIsCurrent }) {
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

  // FEATURE: CHI-43 — pure, testable: which of the 3 possible Evidence drawers should default to
  // open. null only if the newsCards prop is ever genuinely undefined (defensive-only case, not
  // reachable via the real EvidenceColumn caller today).
  // FEATURE: CHI-46 — added "news" as the 3rd, lowest-priority key: the natural default when
  // nothing else is active. newsCards is always at least `null` (useState(null) in the parent,
  // never `undefined`) from the very first render, so this branch effectively always wins over the
  // final `return null` below in real usage — kept as an explicit check (not collapsed to
  // `return "news"` unconditionally) as a defensive guard against a future caller that omits
  // the prop entirely.
  // FEATURE: CHI-49/CHI-50 — isHypInResultPhase()/isHypAwaitingConfirmation() moved to module
  // scope (CHI-82) so the top-level journey arrival effect shares them; same functions, same logic.

  // FEATURE: CHI-51 — true once this theory cycle has been resolved (Info Only / Store as
  // Forecast accepted / rejected) — hypFlow is no longer nulled on resolve (Task 2), so its
  // drawers persist; this flag distinguishes "still live" from "done, read-only" for the
  // footer/instructional gates and useDrawerStack's auto-open suppression.
  function isHypResolved(hypFlow) {
    return !!(hypFlow && hypFlow.resolution);
  }

  // FEATURE: CHI-49 — the single "hyp" key splits into "hyp-candidates" (generating/choosing —
  // the offered choice) and "hyp-result" (testing onward — the test's own findings), per
  // STYLE-GUIDE.md §40's taxonomy decision record. Distinct mechanism from
  // selectEvidenceFooterKind()'s own "hyp-result" string below (the pinned-footer decision key,
  // not a drawer key) — same English word for the same real-world phase, not a shared constant.
  // FEATURE: CHI-50 — "hyp-draft" added as the highest-priority hyp key, ahead of "hyp-result":
  // once Nadia's proposal lands, Draft Forecast is the new arrival that should auto-open — Result
  // still exists underneath, just collapses, same "papers on a desk" persistence CHI-49 already
  // established for Candidates once a pick is made.
  // FEATURE: CHI-51 — consolidated into useDrawerStack() (defined above EvidenceColumn). Priority
  // order matches CHI-49/50's exact prior sequence (hyp-draft > hyp-result > hyp-candidates > qa
  // > news). transitionDeps carries hypFlow?.stage/newsCards — the same 2 extra values the old
  // useEffect's dependency array had beyond the current key itself. resolved/freshDeps are new
  // (Part B/C of this session).
  // FEATURE: CHI-51b — patch: the 3 hyp-related priority checks now also require
  // !isHypResolved(hypFlow). Without this, useDrawerStack()'s suppression correctly blocks
  // auto-open at the instant of resolution, but the moment it lifts (a genuinely new question
  // arriving), the priority list still ranked hyp-result/hyp-draft/hyp-candidates above qa —
  // isHypInResultPhase()/isHypAwaitingConfirmation() stay true forever post-resolution (Task 2's
  // deliberate design, so the drawers keep rendering/reopenable) but that same truth must not
  // also keep winning the auto-open race once the cycle is resolved. Render gates below (the
  // drawers' own JSX conditions) are untouched — this only changes priority ranking.
  const { isOpen: isDrawerOpen, toggle: handleDrawerToggle } = useDrawerStack(
    [
      ["hyp-draft", isHypAwaitingConfirmation(hypFlow) && !isHypResolved(hypFlow)],
      ["hyp-result", isHypInResultPhase(hypFlow) && !isHypResolved(hypFlow)],
      ["hyp-candidates", !!hypFlow && !isHypResolved(hypFlow)],
      ["qa", !!qaEvidence],
      ["news", newsCards !== undefined],
    ],
    evidenceScrollRef,
    [hypFlow?.stage, newsCards],
    isHypResolved(hypFlow),
    [qaEvidence, newsCards],
    { "hyp-result": ["hyp-draft"] } // FEATURE: CHI-58
  );

  // FEATURE: CHI-46 — the true-empty-state early return that used to live here (gated on
  // `!qaEvidence && !hypFlow`, MI-59/CHI-03a/CHI-33/CHI-38) is deleted: its own News-rendering JSX
  // is relocated, byte-identical, into the "News" Drawer below (now the scroll body's first child,
  // participating in the same computeAutoCurrent/isDrawerOpen mechanism as Analysis/Theory), so News
  // is no longer gated behind "nothing else exists yet" and survives a qaEvidence/hypFlow arrival
  // instead of being permanently unreachable. This also removes the previously-unavoidable second
  // `return` statement, which existed only to serve that gate.
  const hasNewsCards = !!(newsCards && newsCards.length > 0);

  const st = hypFlow?.hypothesisTest;
  const { actual: stActualPoints, theorized: stTheorizedPoints } = groupKeyDataPoints(st?.key_data_points);
  // FEATURE: CHI-65 — unwrap the three sections to plain text once; see sectionText().
  const stSupports = sectionText(st?.supports);
  const stComplicates = sectionText(st?.complicates);
  const stConsider = sectionText(st?.consider);
  const footerKind = selectEvidenceFooterKind(qaEvidence, hypFlow);
  // FEATURE: CHI-49 — shared derived state for the 2-drawer split (Task 2).
  // FEATURE: CHI-82 — intentLabel removed: drawer titles are fixed now (§19n overturns CHI-49's
  // intent-dynamic titles); the intent survives internally for routing, it never names a drawer.
  const hypChosen = !!(hypFlow && hypFlow.chosenText);

  return (
    // FEATURE: MI-54 — bounded to the grid row height with an internal scroll region, matching
    // InteractColumn's existing pattern (flex:1/minHeight:0 outer, overflow:hidden card,
    // overflowY:"auto" inner content div) -- action buttons/ConfirmationCard now scroll into view
    // inside the card instead of growing the whole page past the fold.
    <div style={{display:"flex",flexDirection:"column",gap:14,minHeight:0,flex:1,position:"relative"}}>
      <FeatureBadge id="MI-59"/>
      <FeatureBadge id="CHI-26"/>
      <FeatureBadge id="CHI-29"/>
      <FeatureBadge id="CHI-49"/>
      {/* FEATURE: CHI-34 — renamed "Evidence & Interaction" -> "News & Evidence".
          FEATURE: CHI-82 — renamed again, "News & Evidence" -> "Steps & Evidence" (§19n Decision 1:
          this column now shows the journey's numbered steps, News is just the ambient drawer).
          FEATURE: CHI-35 — suppressed on mobile (bare=true): the tab button above it already
          names the column there; desktop keeps it, no tab affordance to rely on instead. */}
      {!bare && (
        <div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.muted}}>Steps & Evidence</div>
      )}
      {/* FEATURE: CHI-18 — gap:14 between the scroll body and the pinned footer, matching
          AuditColumn's (Column 3) drawer-stack gap value. The footer itself stays fully unchanged
          (padding, border, position as the flex column's last child) — it remains locked to the
          card's bottom regardless of content length; only the separation from the content above it
          is new. */}
      {/* FEATURE: CHI-55 -- background/border removed so this column sits directly on the app's real
          page background (T.paperDeep, AppShell.jsx) instead of a same-colored T.cardAlt box that gave
          every individually-open Drawer inside it (also T.cardAlt) zero contrast against its own
          container -- matches AuditColumn (Column 3)'s equivalent wrapper, which has never set a
          background here. Layout properties (flex/minHeight/overflow/gap) are unchanged; this is a
          visual-only removal, confirmed live against Column 3 as the reference (John, 2026-07-21). */}
      <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0,overflow:"hidden",gap:14}}>
        {/* FEATURE: CHI-29 — third patch (S-CHI-26d): dedicated position:"relative" wrapper around just
            the scroll body + fade, separate from the footer. The original CHI-29 task put position:
            "relative" on this outer card instead (which also contains the footer as a sibling) -- since
            absolute+bottom:0 resolves against the NEAREST positioned ancestor, the fade was gluing itself
            to the bottom of the whole card (behind the footer) instead of the scroll body's own visible
            edge. This wrapper's bounds exactly match the scroll body's own rendered box (same flex:1/
            minHeight:0 sizing, zero added padding/margin), so the fade now correctly overlays the scroll
            body's own bottom edge, sitting above the footer where it belongs. */}
        <div style={{position:"relative",display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
        {/* FEATURE: CHI-18 — padding-bottom dropped to 0: the narrative card above now stretches
            (flex:1, Task 1) to fill this box, so its own trailing padding would otherwise stack on
            top of the outer card's structural 14px gap to the footer (30px total measured, more
            than the AuditColumn-matching 14px target). Top/side padding unchanged. */}
        <div ref={evidenceScrollRef} onScroll={checkEvidenceScroll} style={{padding:"16px 16px 0",display:"flex",flexDirection:"column",gap:14,overflowY:"auto",flex:1,minHeight:0}}>

        {/* FEATURE: CHI-46 — News moves out of the "only when nothing else exists" gate into its own
            persistent drawer, lowest-priority in computeAutoCurrent — collapses once Analysis/Theory
            becomes current, but never disappears. Body content below is byte-identical to the deleted
            true-empty-state branch's own news-rendering JSX (hasNewsCards/loading/empty-sentence), just
            relocated and no longer gated behind `!qaEvidence && !hypFlow`. */}
        {/* FEATURE: CHI-71 -- scrollKey lets useDrawerStack bring this drawer's top into view */}
        {/* FEATURE: CHI-82 — ambient sort: every drawer block in this scroll container sits in a
            flex-order wrapper div — numbered journey steps sort by their number, unnumbered
            ambient drawers sink below (order 90). No JSX block moves; flex `order` only (§19n).
            Title: chip renders only when News started the journey (getStep("news") is assigned
            solely by the news-card click handler) — otherwise plain "News". */}
        <div style={{order: getStep("news") ?? 90}}>
        <Drawer title={<span style={{display:"inline-flex",alignItems:"center",gap:6}}><StepChip n={getStep("news")}/>News</span>} scrollKey="news" open={isDrawerOpen("news")} onToggle={handleDrawerToggle("news")}>
          {hasNewsCards ? (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontFamily:body,fontSize:12,color:T.muted,marginBottom:10}}>
                Today's top channel sales news. Select if you need analysis...
              </div>
              {newsCards.map((card, i) => (
                <NewsCard key={card?.url || i} card={card} loading={!!card?.url && newsCardLoadingUrl === card.url}
                  analyzed={!!card?.url && qaEvidence?.sourceNewsUrl === card.url}
                  onClick={() => onAnalyzeNewsCard && onAnalyzeNewsCard(card)}/>
              ))}
            </div>
          ) : newsCards === null ? (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontFamily:body,fontSize:12,color:T.muted,marginBottom:2}}>
                <NewsCardsLoadingLine startedAt={newsCardsStartedAt}/>
              </div>
              <NewsCardSkeleton/>
              <NewsCardSkeleton/>
              <NewsCardSkeleton/>
            </div>
          ) : (
            <div style={{background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:16}}>
              <div style={{fontFamily:body,fontSize:12,color:T.muted}}>{getEvidencePanelSentence()}</div>
            </div>
          )}
        </Drawer>
        </div>

        {/* FEATURE: CHI-03a — Task 1's extracted card, independent of hypFlow: renders the instant
            Marcus has an answer, whether or not a hypothesis flow is ever started. */}
        {/* FEATURE: CHI-43 — wrapped in a controlled Drawer (STYLE-GUIDE.md §40): auto-opens/collapses
            per isDrawerOpen("qa"), still one click to reopen manually. QaEvidenceCard's own header row
            was removed (Task 3) so this Drawer's title is the card's only header. */}
        {/* FEATURE: CHI-82 — fixed short title "Analysis" (was the descriptive sentence) + journey
            step chip; order wrapper per the ambient-sort rule above. */}
        {qaEvidence && (
        <div style={{order: getStep("qa") ?? 90}}>
          <Drawer title={<span style={{display:"inline-flex",alignItems:"center",gap:6}}><StepChip n={getStep("qa")}/>Analysis</span>} scrollKey="qa" open={isDrawerOpen("qa")} onToggle={handleDrawerToggle("qa")}
            headerRight={<div style={{display:"flex",alignItems:"center",gap:6}}>{!qaEvidence.reviewChoice && <NeedsDecisionBadge/>}<HopBadge hopStart={qaEvidence.hopStart} hopEnd={qaEvidence.hopEnd} accent={T.navy}/></div>}>
            <QaEvidenceCard qa={qaEvidence} onGoodThanks={onGoodThanks} onReview={onReview}/>
          </Drawer>
        </div>
        )}

        {/* FEATURE: CHI-49 — Theory splits into 2 drawers (STYLE-GUIDE.md §40 taxonomy decision
            record): Candidates (the offered choice, generating/choosing) and Result (the test's
            own findings, testing onward). Candidates renders whenever hypFlow exists — it never
            disappears once a pick is made, same "papers on a desk" persistence as every other
            drawer in this cluster; it just collapses and its title gains a chosen-summary. */}
        {hypFlow && (
        /* FEATURE: CHI-58 — title is now always the plain label; the chose-summary sentence
           moves to a separate body line (below), only rendered once a pick exists. Narration-only
           lines removed per this session's governing principle: Column 1's AgentWorkingIndicator
           already narrates "generating," so Column 2 doesn't need its own copy of that status. */
        /* FEATURE: CHI-82 — fixed title "Theories" + journey step chip, replacing CHI-49's
           intent-dynamic Candidates title (§19n: John's explicit supersession — the intent no
           longer names drawers). Order wrapper per the ambient-sort rule above. */
        <div style={{order: getStep("hyp-candidates") ?? 90}}>
        <Drawer title={<span style={{display:"inline-flex",alignItems:"center",gap:6}}><StepChip n={getStep("hyp-candidates")}/>Theories</span>} scrollKey="hyp-candidates"
          count={!hypChosen ? (hypFlow.candidates?.length ?? null) : null}
          open={isDrawerOpen("hyp-candidates")} onToggle={handleDrawerToggle("hyp-candidates")}
          /* FEATURE: CHI-82b — badge gated on journey membership (hypIsCurrent) */
          headerRight={hypFlow.stage === "choosing" && hypIsCurrent ? <NeedsDecisionBadge/> : null}>

        {hypChosen && (
          <div style={{fontFamily:body,fontSize:12,color:T.muted}}>
            {hypFlow.candidates?.length ?? 0} offered, chose: "{hypFlow.chosenText}"
          </div>
        )}

        {/* FEATURE: CHI-73 — motion while candidates generate: shimmering skeleton rows shaped like
            the real candidate cards below, replacing the static "Generating candidate theories…"
            text (Column 1 already narrates the state; Column 2 shows a live placeholder, not words). */}
        {hypFlow.stage === "generating" && (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <CandidateRowSkeleton/>
            <CandidateRowSkeleton/>
            <CandidateRowSkeleton/>
          </div>
        )}

        {hypFlow.stage === "choosing" && hypFlow.candidates && (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Review or Select a theory to include in the analysis</div>
            {hypFlow.candidates.map(h => (
              <div key={h.id} onClick={() => { setShowOwnTheory(false); onSelectHypothesis(h.text, { startTest: true }); }}
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
                  <button onClick={() => { if (customText.trim()) { onSelectHypothesis(customText.trim(), { startTest: true }); setCustomText(""); setShowOwnTheory(false); } }}
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

        {/* FEATURE: CHI-49 — read-only recap once a theory has been picked: reopening this
            drawer after it collapses shows what was offered (same list, unchanged, no click
            handlers) with the chosen one marked, instead of an empty body. Only renders when
            candidates is real — defensive: the extracted-hypothesis entry path (enterHypothesisFlow
            with extractedHypothesis set) can reach hypChosen with candidates still null; the
            collapsed title's own chosen-summary already covers that case on its own. */}
        {hypChosen && hypFlow.candidates && (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Offered</div>
            {hypFlow.candidates.map(h => (
              <div key={h.id}
                style={{padding:"9px 11px",background:T.card,border:`1px solid ${h.text === hypFlow.chosenText ? T.brassDeep : T.lineSoft}`,fontFamily:body,fontSize:12,color:T.ink,display:"flex",gap:8}}>
                <span style={{fontFamily:mono,fontSize:10,color:T.brassDeep,flexShrink:0}}>{h.id}</span>
                <span>{h.text}</span>
                {h.text === hypFlow.chosenText && (
                  <span style={{marginLeft:"auto",fontFamily:mono,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.brassDeep,flexShrink:0}}>Chosen</span>
                )}
              </div>
            ))}
          </div>
        )}

        </Drawer>
        </div>
        )}

        {/* FEATURE: CHI-49 — Result drawer: only exists once a theory has actually been chosen
            (testing onward) — nothing to show before that, so it doesn't render prematurely
            alongside Candidates. Auto-opens the instant it starts existing (isHypInResultPhase
            true the same render CHI-44's auto-fire sets stage:"testing"). */}
        {/* FEATURE: CHI-82 — fixed title "Theory Result" + journey step chip, replacing CHI-49's
            intent-dynamic Result title (§19n). Order wrapper per the ambient-sort rule. */}
        {isHypInResultPhase(hypFlow) && (
        <div style={{order: getStep("hyp-result") ?? 90}}>
        <Drawer title={<span style={{display:"inline-flex",alignItems:"center",gap:6}}><StepChip n={getStep("hyp-result")}/>Theory Result</span>} scrollKey="hyp-result" open={isDrawerOpen("hyp-result")} onToggle={handleDrawerToggle("hyp-result")}
          /* FEATURE: CHI-82b — badge additionally gated on journey membership (hypIsCurrent) */
          headerRight={<div style={{display:"flex",alignItems:"center",gap:6}}>{hypFlow.stage === "result" && !hypFlow.resolution && hypIsCurrent && <NeedsDecisionBadge/>}<HopBadge hopStart={st?.hopStart} hopEnd={st?.hopEnd} accent={T.moss}/></div>}>

        {/* FEATURE: CHI-58 — the submitted-theory recap block previously here was removed: the
            (still-visible, collapsed) Candidates drawer's own chosen-summary already shows this
            text (Task 2), so this drawer no longer duplicates it. */}
        {/* FEATURE: CHI-58-patch — the "testing"-stage narration block previously here (MI-62) was
            removed: the testing stage's progress is already visible via Column 1's AgentWorkingIndicator
            strip, same governing principle CHI-58 already applied to the Candidates drawer's
            "generating"-stage narration. */}

        {/* FEATURE: CHI-73 — the Result drawer auto-opens the instant testing starts (isHypInResultPhase
            includes "testing"), but its only body block is gated on stage === "result", so during
            "testing" it rendered an empty open box. Shimmering placeholder shaped like the result
            content that's about to land. */}
        {hypFlow.stage === "testing" && <ResultSkeleton/>}

        {st && hypFlow.stage === "result" && (
          <>
            {/* FEATURE: CHI-45 — hop-range badge relocated to the wrapping Drawer's headerRight (always
                visible, open or collapsed) — see STYLE-GUIDE.md §40's CHI-45 amendment. */}
            {/* FEATURE: CHI-58 — "Theory Evidence" title and the elapsed-time status line both removed:
                the drawer's own title already says "Result," and the status line now fires as a chat
                message instead (Task 3c) — Column 2 shows content, not status. */}
            {/* FEATURE: CHI-51 — added !hypFlow.resolution: the Info Only path never sets
                confirmation, so without this the "select an option" line would keep showing
                inside a reopened, already-resolved Result drawer with no footer left to act on. */}
            {!hypFlow.confirmation && !hypFlow.resolution && (
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

            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {stSupports && (<div><div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.moss,marginBottom:3}}>✓ Supports</div><p style={{margin:0,fontFamily:body,fontSize:11.5,lineHeight:1.5,color:T.ink}}>{stSupports}</p></div>)}
              {stComplicates && (<div><div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.flag,marginBottom:3}}>⚠ Complicates</div><p style={{margin:0,fontFamily:body,fontSize:11.5,lineHeight:1.5,color:T.ink}}>{stComplicates}</p></div>)}
              {stConsider && (<div><div style={{fontFamily:mono,fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:T.mutedDeep,marginBottom:3}}>→ Consider also</div><p style={{margin:0,fontFamily:body,fontSize:11.5,lineHeight:1.5,color:T.ink}}>{stConsider}</p></div>)}
            </div>
          </>
        )}

        </Drawer>
        </div>
        )}

        {/* FEATURE: CHI-50 — Draft Forecast drawer: Nadia's data-patch proposal, split out of the
            pinned footer (was ConfirmationCard rendered whole there) into its own drawer — it's
            readable content that came back from an action (clicking "Store as Forecast"), the
            same shape as every other drawer in this cluster, not a decision control itself. Only
            exists once hypFlow.confirmation lands; auto-opens the instant it does (Result
            collapses underneath, same relationship Candidates/Result already established). Title
            is fixed, not intent-dynamic — reuses the platform's locked INTENT_LABEL.forecast
            vocabulary since Nadia's write is always a forecast record regardless of which intent
            (theory/forecast/correct) started the flow. */}
        {/* FEATURE: CHI-82 — title word unchanged ("Draft Forecast" was already fixed); gains the
            journey step chip + order wrapper per the ambient-sort rule above. */}
        {isHypAwaitingConfirmation(hypFlow) && (
        <div style={{order: getStep("hyp-draft") ?? 90}}>
        <Drawer title={<span style={{display:"inline-flex",alignItems:"center",gap:6}}><StepChip n={getStep("hyp-draft")}/>Draft Forecast</span>} scrollKey="hyp-draft" open={isDrawerOpen("hyp-draft")} onToggle={handleDrawerToggle("hyp-draft")}
          /* FEATURE: CHI-82b — was unconditional (CHI-50); now gated on journey membership */
          headerRight={hypIsCurrent ? <NeedsDecisionBadge/> : null}>
          <div style={{fontFamily:body,fontSize:12,fontStyle:"italic",color:T.mutedDeep}}>
            Nadia (Data Expert) drafted this Data Room entry — accept, edit, or reject below.
          </div>
          <ConfirmationCardContent agent={nadia} proposedAction={hypFlow.confirmation.proposed_action} critique={hypFlow.confirmation.critique}/>
        </Drawer>
        </div>
        )}
        </div>
        <ScrollFadeHint show={evidenceCanScrollMore} bg={T.paperDeep}/>
        </div>
        {footerKind && (
          <div style={{padding:"10px 14px",borderTop:`1px solid ${T.line}`,position:"relative"}}>
            <FeatureBadge id="CHI-13"/>
            {/* FEATURE: CHI-88a — `bare` is this column's existing mobile flag and is true only at the
                MobileBody call site by construction, so it doubles as the compact gate with zero new
                conditionals and zero desktop reachability. CHI-88 pinned this footer on mobile, where
                it then took 126px of the 200px steps wrapper (39px left for the answer). The
                hyp-confirmation kind (ConfirmationCardActions) is deliberately NOT compacted — out of
                this session's scope, left exactly as-is. */}
            {footerKind === "qa-review" && (
              <QaEvidenceCardFooter qa={qaEvidence} onGoodThanks={onGoodThanks} onReview={onReview} compact={bare}/>
            )}
            {footerKind === "hyp-result" && (
              // FEATURE: CHI-71 -- standardized via the shared DecisionFooter
              // FEATURE: CHI-82 -- "hypothesis" -> "theory" (single vocabulary, chi-vocabulary.md);
              // button labels unchanged.
              <DecisionFooter
                prompt="Ready to act on this theory?"
                secondaryLabel="Store as Info Only"
                onSecondary={onDiscard}
                primaryLabel="Create Forecast"
                onPrimary={() => onCommit()}
                compact={bare}
              />
            )}
            {footerKind === "hyp-confirmation" && (
              <ConfirmationCardActions onResolve={onResolveConfirmation}/>
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
// FEATURE: CHI-56 — renders both boundary-marker types (question_boundary/"start", the pre-existing
// behavior, unchanged wording/trigger; transaction_complete/"complete", new — the closing half of a
// transaction). Label derived from evt.type directly rather than a new prop — QuestionDivider
// already receives the full event.
function QuestionDivider({ evt }) {
  const label = evt.type === "transaction_complete" ? "Transaction complete" : "New question";
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,margin:"2px 0"}}>
      <div style={{flex:1,height:1,background:T.line}}/>
      <span style={{fontFamily:mono,fontSize:9,color:T.muted,whiteSpace:"nowrap"}}>{label} · {formatClockTime(evt.data.timestamp)}</span>
      <div style={{flex:1,height:1,background:T.line}}/>
    </div>
  );
}

// FEATURE: CHI-88 — `terse` is opt-in and set only by MobileBody's pinned feed; it is forwarded to
// each activity line, which passes it on to describePipelineEvent. Desktop's AuditColumn renders this
// card with no terse prop, so its rows are unchanged.
function RoutingHopCard({ hop, agentById, terse }) {
  const primary = agentById(hop.agentId);
  const lastColor = describePipelineEvent(hop.events[0], { terse }).color;
  return (
    <div style={{borderLeft:`3px solid ${lastColor}`,paddingLeft:10,display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:6}}>
        <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{hop.hopNumber}</span>
        {primary && <AgentAvatar who={primary.id} size={20}/>}
        <span style={{fontFamily:body,fontSize:11.5,fontWeight:600,color:T.ink}}>{primary ? firstNameFor(hop.agentId, agentById) : hop.agentId}</span>
        <span style={{fontFamily:mono,fontSize:9,color:T.muted}}>{primary ? primary.role : ""}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {hop.events.map(evt => <RoutingActivityLine key={evt.id} evt={evt} terse={terse}/>)}
      </div>
    </div>
  );
}

// FEATURE: LOG-79 -- module-level cache of span->pattern-name maps, keyed by trace id (mirrors
// usePatternVocabulary's cache shape in useAIActivity.js): the first mount with a given trace
// triggers fetchTracePatterns exactly once; every RoutingActivityLine for that trace shares the
// result; state updates when the fetch resolves. fetchTracePatterns never rejects (LOG-38 fetch
// posture -- warns and resolves {}), so a failure simply renders no pattern lines.
const EMPTY_TRACE_PATTERNS = {};
const _tracePatternCache = new Map();    // traceId -> resolved { [span_id]: [name, ...] }
const _tracePatternPromises = new Map(); // traceId -> in-flight promise

function fetchTracePatternsCached(traceId) {
  if (_tracePatternCache.has(traceId)) return Promise.resolve(_tracePatternCache.get(traceId));
  if (!_tracePatternPromises.has(traceId)) {
    _tracePatternPromises.set(traceId, fetchTracePatterns(traceId).then(map => {
      _tracePatternCache.set(traceId, map);
      _tracePatternPromises.delete(traceId);
      return map;
    }));
  }
  return _tracePatternPromises.get(traceId);
}

// FEATURE: LOG-79 -- governed pattern names for one trace's hops. Returns the span->names map
// ({} until resolved, or when the trace has no classified rows). A null/undefined traceId (an
// in-flight hop whose rows aren't written yet, or a pre-LOG-79 event) fetches nothing.
function useTracePatterns(traceId, spanId) {
  const [spanPatterns, setSpanPatterns] = useState(() => (traceId && _tracePatternCache.get(traceId)) || EMPTY_TRACE_PATTERNS);
  useEffect(() => {
    if (!traceId) { setSpanPatterns(EMPTY_TRACE_PATTERNS); return; }
    let cancelled = false;
    let tries = 0;
    let timer = null;
    const attempt = () => {
      fetchTracePatternsCached(traceId).then(map => {
        if (cancelled) return;
        setSpanPatterns(map);
        // FEATURE: LOG-95b -- streamed rows mount mid-flight (LOG-95), so the trace map can be
        // frozen before this row's execution logged. Bounded refetch: invalidate + retry up to
        // 3 times, 2.5s apart, then accept honestly-unclassified (§19l). needsSpanRefetch is
        // pure -- tests/regression/LOG-95b-span-refetch.js.
        if (needsSpanRefetch(map, spanId, tries)) {
          tries += 1;
          _tracePatternCache.delete(traceId);
          timer = setTimeout(attempt, 2500);
        }
      });
    };
    attempt();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [traceId, spanId]);
  return spanPatterns;
}

// FEATURE: CHI-01 — one activity line within a hop card (no header — RoutingHopCard owns
// that). Replaces the per-row 3px left border with a small 6px color dot per line, since the
// card itself now carries the border. FEATURE: CHI-02 — summary text is never hard-truncated
// upstream anymore (see Task 2); this component owns visual truncation via CSS line-clamp (3
// lines) + a click-to-expand toggle, so the ellipsis lands at the true end of the last visible
// line instead of wrapping alone, and the full text is always one click away.
// FEATURE: LOG-15 — capability never displays here, ever (John's hard rule, 2026-07-17). One
// generic line reads the event's trace/span identity directly — no event-type branching, no
// capability lookup. A hop with no real pattern data shows no line at all (never a fabricated
// placeholder) — same "real data or nothing" principle MI-67 already established here.
// FEATURE: LOG-79 -- pattern names come from the ai_call_patterns view (read-time classification,
// §19k) via useTracePatterns, replacing the frozen legacy evt.data.patterns_used read. The view's
// pattern_name IS the governed vocabulary name, so no patternLabelFor/vocab resolution is needed.
// A hop whose rows match no gold pattern gets no span entry -> no line (honest unclassified
// state, expressed structurally, no boundary/date copy -- John's §19l call).
// FEATURE: CHI-88 — `terse` (mobile feed only) is forwarded straight to describePipelineEvent; the
// "Read more" toggle also gains a real touch target on mobile (it measured 53×13px live at 375×667).
function RoutingActivityLine({ evt, terse }) {
  const isMobile = useIsMobile();
  const { summary, color } = describePipelineEvent(evt, { terse });
  const spanPatterns = useTracePatterns(evt.data?.trace_id, evt.data?.span_id);
  const names = evt.data?.span_id != null ? spanPatterns[evt.data.span_id] : null;
  const patternLabel = names && names.length > 0 ? names.join(', ') : null;
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
          /* FEATURE: CHI-88 — mobile only: 11px of vertical padding cancelled by an equal negative
             margin, so the label sits exactly where it does today (marginTop 2 == -9 + 11) while the
             hit box grows from the measured 53×13px to ~35px tall. Desktop style byte-identical. */
          <button onClick={() => setExpanded(e => !e)}
            style={isMobile
              ? {background:"none",border:"none",padding:"11px 14px 11px 0",margin:"-9px 0 -9px",fontFamily:body,fontSize:10.5,fontStyle:"italic",color:T.brassDeep,textDecoration:"underline",cursor:"pointer"}
              : {background:"none",border:"none",padding:0,marginTop:2,fontFamily:body,fontSize:10.5,fontStyle:"italic",color:T.brassDeep,textDecoration:"underline",cursor:"pointer"}}>
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
  // FEATURE: LOG-112 -- verified pattern names for the per-agent rollup below, from the Log
  // Displayer rollup (the same read AI Audit's By Pattern section makes). Called with no
  // argument on purpose: this drawer needs name + log_ids only, not LOG-81's countable/cost
  // re-derivation, which is what the `log` argument drives. On fetch failure the hook resolves
  // to an empty list and these rows simply do not render -- LOG-102 tracks making that failure
  // state honest rather than indistinguishable from "nothing verified yet".
  const { classified } = usePatternClassification();
  const patternNamesByLogId = useMemo(() => {
    const m = new Map();
    for (const p of classified) {
      for (const id of p.logIds || []) {
        const names = m.get(id);
        if (names) names.push(p.name); else m.set(id, [p.name]);
      }
    }
    return m;
  }, [classified]);
  // FEATURE: MI-31 — separate hook instance (own useState/useEffect), scoped to the
  // 'speed-baseline-test' tenant, unfiltered by MI_LOOP_SCOPE (scope: null) since those rows are
  // already fully isolated deliberate test data, not production MI-loop traffic.
  const baselineActivity = useAgentActivitySummary(PROPOSED_MI_AGENT_IDS, null, 'speed-baseline-test');
  const agentById = (id) => agents.find(a => a.id === id);
  // FEATURE: CHI-90 -- the active/potential split keys on `.operations` (every logged row),
  // not on `.calls` (real model calls only, as of this session). "Not yet used on this screen"
  // is a claim about whether the agent did any work here, not about whether it called a model:
  // an agent whose whole contribution is deterministic (a Librarian read, a directory lookup)
  // is working, and gating the list on `.calls` would silently relabel it as unused. The sort
  // stays on `.calls` so the ranking matches the number actually displayed below.
  const activeIds = PROPOSED_MI_AGENT_IDS
    .filter(id => agentActivity[id]?.operations > 0)
    .sort((a, b) => (agentActivity[b]?.calls || 0) - (agentActivity[a]?.calls || 0));
  const potentialIds = PROPOSED_MI_AGENT_IDS.filter(id => !agentActivity[id]?.operations);

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
          const patternRows = buildAgentPatternRows(stats?.rows, patternNamesByLogId);
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
              {(baseline || Object.keys(patternRows).length > 0) && (
                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                  {baseline && (
                    <LatencyStatRow
                      label="Baseline"
                      valueNumber={(baseline.avgLatency/1000).toFixed(1)}
                      restText={`s avg (${baseline.calls} call${baseline.calls === 1 ? "" : "s"}, max ${(baseline.maxLatency/1000).toFixed(1)}s)`}
                    />
                  )}
                  {/* FEATURE: LOG-112 -- rows are keyed and labelled by the Displayer's own verified
                      pattern_name; there is no slug and no vocabulary resolution left on this surface.
                      An agent with nothing verified yet renders no rows at all (§19l honest-unclassified,
                      expressed structurally). Sort order, row shape and LatencyStatRow are unchanged. */}
                  {Object.entries(patternRows)
                    .sort((a, b) => (b[1].avgLatency || 0) - (a[1].avgLatency || 0))
                    .map(([patternName, p]) => (
                      <LatencyStatRow
                        key={patternName}
                        label={patternName}
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
export function AuditColumn({ events, agentActivity, onAgentsDrawerOpen }) { // FEATURE: LAV-1a -- exported in place (no body/props change); LAV-1b renders it as the Live Agent View's right rail
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
      <FeatureBadge id="CHI-57"/>
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
// FEATURE: CHI-82 — breadcrumb stage highlight in the chat header.
// FEATURE: CHI-82b — the raw hypFlow prop is replaced by crumbStage: the stage is now computed at
// the top-level screen from membership-FILTERED inputs (a stale previous-journey flow must not
// drive the crumb), and this component just renders it. qaEvidence stays a raw prop — it is also
// consumed by MessageBubble's review-outcome note, which must not be membership-filtered. The
// bare (mobile) branch has no header and never reads crumbStage.
function InteractColumn({ messages, loading, workingStatus, onSubmit, onReview, onGoodThanks, onClear, noMinHeight, bare, qaEvidence, crumbStage }) {
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

  // FEATURE: CHI-39 — idle auto-rotation: every 10s while the welcome/idle state is showing
  // (messages.length === 0), re-roll rotation.picks via the exact same splitRotation() call Clear
  // already uses (L2331). STATIC_QUESTION (slot 2) is never part of picks/leftover — unchanged,
  // never rotates. Interval is armed only while idle and torn down the instant that stops being
  // true (messages.length leaves 0) or the component unmounts — no orphaned timers.
  const [isShimmering, setIsShimmering] = useState(false);
  useEffect(() => {
    if (messages.length !== 0) return;
    const shimmerTimeouts = [];
    const interval = setInterval(() => {
      setRotation(splitRotation(ROTATING_POOL, shuffleArray));
      setIsShimmering(true);
      shimmerTimeouts.push(setTimeout(() => setIsShimmering(false), 700));
    }, 10000);
    return () => {
      clearInterval(interval);
      shimmerTimeouts.forEach(clearTimeout);
    };
  }, [messages.length]);

  const visibleQuestions = [rotation.picks[0], STATIC_QUESTION, rotation.picks[1]];
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
            {/* FEATURE: CHI-39 — each button wrapped so ShimmerSweep can overlay it; all 4 blocks
                (2 rotating buttons, static button, drawer toggle below) shimmer together on every
                10s idle tick via the shared isShimmering trigger. */}
            {visibleQuestions.map(q => (
              <div key={q.id} style={{position:"relative",overflow:"hidden"}}>
                <button onClick={() => submit(q.label)} disabled={loading}
                  style={{width:"100%",textAlign:"left",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,padding:"10px 12px",fontFamily:body,fontSize:12.5,color:T.ink,cursor:loading?"default":"pointer"}}>
                  {q.label}
                </button>
                {isShimmering && <ShimmerSweep/>}
              </div>
            ))}
          </div>
          <div style={{marginTop:8,position:"relative",overflow:"hidden"}}>
            {isShimmering && <ShimmerSweep/>}
            {/* FEATURE: CHI-30 (patched by CHI-32) — drawer count is always 20 (8 rotation leftovers + fixed 12-tail) */}
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
        <FeatureBadge id="CHI-32"/>
        <div style={{padding:"13px 16px",borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",gap:10}}>
          {marcus && <AgentAvatar who={marcus.id} size={28}/>}
          <div>
            {/* FEATURE: CHI-71 -- header rename + strategic-purpose branding line + Process/Steps line */}
            <div style={{fontFamily:display,fontSize:13,fontWeight:600,color:T.navy}}>Chat with Marcus</div>
            <div style={{fontFamily:mono,fontSize:9.5,color:T.muted}}>Q&A · Corrections · Escalations</div>
            {/* FEATURE: CHI-82 (T3) — the CHI-71 breadcrumb becomes the fixed stage map (§19n): 5
                spans joined by " › ", the current stage highlighted navy; the other stages keep
                the line's existing muted styling untouched.
                FEATURE: CHI-82b — highlight driven by the membership-filtered crumbStage prop
                (computed top-level), never raw hypFlow/qaEvidence presence. */}
            <div style={{fontFamily:mono,fontSize:9.5,color:T.muted,marginTop:2}}>
              {["Question", "Analysis", "Theory", "Forecast", "Update"].map((s, i) => (
                <span key={s}>
                  {i > 0 && " › "}
                  <span style={s === crumbStage ? {background:T.navy,color:T.paper ?? T.card,padding:"1px 6px"} : undefined}>{s}</span>
                </span>
              ))}
            </div>
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
function MobileBody({ messages, loading, workingStatus, onSubmit, onReview, onGoodThanks, onClear, hypFlow, qaEvidence, onIntentChange, onSelectHypothesis, onDiscard, onCommit, onResolveConfirmation, events, agentActivity, showAgentInfo, setShowAgentInfo, onAgentsDrawerOpen, newsCards, onAnalyzeNewsCard, newsCardLoadingUrl, newsCardsStartedAt, getStep, hypIsCurrent }) { // FEATURE: CHI-82/CHI-82b — getStep + hypIsCurrent passed through to EvidenceColumn
  const [mobileTab, setMobileTab] = useState("chat");
  const [chatUnseen, setChatUnseen] = useState(false);
  const [evidenceUnseen, setEvidenceUnseen] = useState(false);
  // FEATURE: CHI-88 — CHI-40's news heads-up dismiss state and its two effects are removed along with
  // the banner they gated (see the render below). newsCardsStartedAt is still a prop: EvidenceColumn's
  // own NewsCardsLoadingLine timer reads it.
  const agents = useAgents();
  const agentById = (id) => agents.find(a => a.id === id);
  // FEATURE: CHI-03c — was `hasActiveFlow = !!hypFlow`, blind to CHI-03a's qaEvidence: a plain Q&A
  // the user never escalates into a hypothesis flow now has real content in Evidence (qaEvidence)
  // that this gate/flash logic was completely unaware of. Every use of the old hasActiveFlow below
  // (tab-enabled gate, auto-switch-to-evidence trigger, flash-dot gate, selectTab's own gate) is
  // renamed to this corrected name.
  // FEATURE: CHI-33 — mobile parity gap, found during this session's Architect Review: newsCards
  // was not accounted for here, so on mobile the Evidence & Interaction tab would stay
  // disabled/non-flashing even after news cards load, since neither qaEvidence nor hypFlow would be
  // set yet on a fresh page load. Deliberate choice (Tier 2, flagged clearly): this enables + flashes
  // the tab once cards load, consistent with how a plain qaEvidence-only answer is already treated —
  // it does NOT auto-switch mobile to the Evidence tab on load (the auto-switch effect below is keyed
  // off hasEvidenceContent transitioning false->true from a user-initiated flow start; auto-switching
  // away from Chat before the user has done anything on a fresh page load would be a UX change beyond
  // what was asked).
  const hasEvidenceContent = !!qaEvidence || !!hypFlow || !!(newsCards && newsCards.length);
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
  // FEATURE: CHI-33 — also flags unseen content the moment newsCards goes from not-yet-loaded to
  // populated (a real newsCards.length change), so the tab flashes once cards land on a fresh page
  // load (Manual QA checklist item 8) -- tracked separately from the auto-switch effect below, which
  // deliberately does NOT react to newsCards.
  const prevStage = useRef(hypFlow?.stage);
  const prevQaEvidence = useRef(qaEvidence);
  const prevNewsCardsLen = useRef(newsCards ? newsCards.length : 0);
  useEffect(() => {
    const newsCardsLen = newsCards ? newsCards.length : 0;
    if ((qaEvidence !== prevQaEvidence.current || (hypFlow && hypFlow.stage !== prevStage.current) || newsCardsLen !== prevNewsCardsLen.current) && mobileTab !== "evidence") {
      setEvidenceUnseen(true);
    }
    prevQaEvidence.current = qaEvidence;
    prevStage.current = hypFlow?.stage;
    prevNewsCardsLen.current = newsCardsLen;
  }, [qaEvidence, hypFlow?.stage, newsCards, mobileTab]);

  // FEATURE: MI-51 — Evidence auto-activates (switches to the active tab) the moment a theory flow
  // starts (hasFlowContent false -> true, i.e. right when the user clicks "Have Priya... generate a
  // few theories ->"), so the live elapsed/expect status strip is immediately visible without an
  // extra manual tap. This is a one-time switch at flow start, not on every stage change — the user
  // can freely navigate back to Chat mid-generation (status strip stays visible either way, Evidence
  // flashes via the effect above once new content is ready).
  // FEATURE: CHI-33 — deliberately keyed on hasFlowContent (qaEvidence/hypFlow only), NOT the
  // combined hasEvidenceContent used for tab-enable/flash above -- a fresh page load's cards
  // arriving must enable + flash the tab (handled above) without ever auto-navigating the user away
  // from Chat before they've done anything themselves (kickoff's explicit scope boundary).
  const hasFlowContent = !!qaEvidence || !!hypFlow;
  const prevHasFlow = useRef(hasFlowContent);
  useEffect(() => {
    if (hasFlowContent && !prevHasFlow.current) {
      setMobileTab("evidence");
      setEvidenceUnseen(false);
    }
    prevHasFlow.current = hasFlowContent;
  }, [hasFlowContent]);

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
        {/* FEATURE: CHI-82 — tab rename "News & Evidence" -> "Steps & Evidence", matching the
            desktop column header; flashDot logic byte-identical. */}
        <button onClick={() => selectTab("evidence")} style={tabStyle(mobileTab==="evidence", !hasEvidenceContent)}>
          Steps & Evidence {hasEvidenceContent && evidenceUnseen && mobileTab!=="evidence" && <span style={flashDot}/>}
        </button>
      </div>

      {/* FEATURE: CHI-88a — the input row (input + Send + Clear) now lives inside the Chat branch of
          the tab body below, NOT in its old global slot under both tabs: John's call — Steps & Evidence
          was spending ~66px of a 667px screen on an affordance that tab has no use for. Pure relocation;
          every id, handler and style inside it is byte-identical to the global row it replaces, and the
          working-status line stays global (it reads under the input row on Chat, directly above the
          Agent Routing feed on Steps & Evidence).
          FEATURE: MI-56 — input+Send+Clear are one merged row (was two stacked rows; Clear read as a
          stray orphan underneath). STYLE-GUIDE.md §21, 2026-07-14 amendment: the divider does double
          duty as visual grouping + accidental-tap mitigation for the no-confirm-dialog Clear action
          (that S-MI-51 decision is unchanged here).
          FEATURE: CHI-88 — the input's fontSize 16 is the root-cause fix for iOS Safari zooming the
          whole app on focus (it auto-zooms any focused input under 16px and never zooms back out —
          confirmed on John's actual phone); no viewport-meta change, no JS zoom-reset hack. Both submit
          paths blur the input so the on-screen keyboard drops on send.
          FEATURE: MOB-001 — Clear's vertical padding matches Send's own 9px in this same row, taking its
          measured 36×13px tap target (mobile-ui-audit-0717) to ~30px+; font/color/weight and the
          no-confirm-dialog Clear behavior are unchanged. */}
      <div style={{flex:1,minHeight:0,display:"flex",flexDirection:"column"}}>
        {mobileTab === "chat" ? (
          <>
          <InteractColumn messages={messages} loading={loading} onSubmit={onSubmit} onReview={onReview} onGoodThanks={onGoodThanks} qaEvidence={qaEvidence} bare/>
          <div style={{flexShrink:0,padding:"9px 14px 8px",display:"flex",alignItems:"center",gap:8,background:T.card,borderTop:`1px solid ${T.line}`}}>
            <input id="mobile-chat-input" placeholder="Ask about channel performance…" disabled={loading}
              onKeyDown={e => { if (e.key === "Enter") { onSubmit(e.target.value); e.target.value = ""; e.target.blur(); } }}
              style={{flex:1,padding:"9px 12px",border:`1px solid ${T.lineSoft}`,fontFamily:body,fontSize:16,background:T.card,color:T.ink}}/>
            <button onClick={() => { const el = document.getElementById("mobile-chat-input"); onSubmit(el.value); el.value = ""; el.blur(); }} disabled={loading}
              style={{padding:"9px 16px",background:T.navy,color:T.card,border:"none",fontFamily:body,fontSize:13,cursor:loading?"default":"pointer",flexShrink:0}}>
              Send
            </button>
            <div style={{width:1,alignSelf:"stretch",background:T.lineSoft,flexShrink:0}}/>
            <button onClick={onClear} style={{background:"none",border:"none",color:T.muted,fontFamily:mono,fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",cursor:"pointer",flexShrink:0,padding:"9px 10px"}}>
              Clear
            </button>
          </div>
          </>
        ) : (
          /* FEATURE: CHI-88 — this wrapper used to be the scroller (overflowY:"auto"). An auto-scroll
             parent gives its children unbounded height, so EvidenceColumn's flex column inflated to
             2,236px inside a 210px viewport and its own CHI-13/CHI-18 anatomy — the MI-54 internal
             scroll region + the pinned DecisionFooter slot — never engaged; the decision buttons sat
             ~3 window-heights down the document. Bounding this wrapper (overflow hidden + flex column)
             activates the desktop-proven mechanism on mobile too. Nothing inside EvidenceColumn changes,
             and no parallel mobile footer exists. */
          <div style={{flex:1,minHeight:0,overflow:"hidden",padding:14,display:"flex",flexDirection:"column"}}>
            <EvidenceColumn hypFlow={hypFlow} qaEvidence={qaEvidence} onIntentChange={onIntentChange} onSelectHypothesis={onSelectHypothesis} onDiscard={onDiscard} onCommit={onCommit} onResolveConfirmation={onResolveConfirmation} onGoodThanks={onGoodThanks} onReview={onReview} newsCards={newsCards} onAnalyzeNewsCard={(card) => { selectTab("chat"); onAnalyzeNewsCard(card); }} newsCardLoadingUrl={newsCardLoadingUrl} newsCardsStartedAt={newsCardsStartedAt} bare getStep={getStep} hypIsCurrent={hypIsCurrent}/>
          </div>
        )}
      </div>

      {/* FEATURE: CHI-88 — CHI-40's mobile news heads-up banner is deliberately SUPERSEDED and
          removed (John-approved): at 375×667 fixed chrome left content ~176-210px, and the flashing
          Steps & Evidence tab (CHI-03c's gate, tab bar above) is now the only at-rest news signal.
          Its dismiss state and both dismiss effects are gone with it — no dead gating code left
          behind. NewsCardsLoadingLine survives: EvidenceColumn still calls it.
          FEATURE: CHI-88 — the working-status line also left this slot; it now renders as a soft
          one-line strip below the tab body (see the CHI-88a note there). */}

      {/* FEATURE: CHI-88 — the live working status moves out from between the chat body and the input
          row (where it was a boxed strip with its own background + top border) to a soft, unboxed
          single line, above AGENT ROUTING. It reports on the question just sent, so it sits with the
          send affordance rather than splitting the reading surface. One line always: it ellipsizes,
          never wraps, so the fixed chrome height can't grow.
          FEATURE: CHI-88a — this slot stays GLOBAL now that the input row is Chat-only: on Chat it
          still reads directly under Send, on Steps & Evidence it sits directly above the feed. The
          wrapper's own single-line clamp was not enough — AgentWorkingIndicator's inner row is a
          wrapping flex (CHI-56 chat-pane geometry) and wrapped to ~53px here, so it now renders in
          its `compact` variant, which is the one-line renderer this full-width slot needs. */}
      {workingStatus && (
        <div style={{flexShrink:0,padding:"2px 14px 4px",fontStyle:"italic",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
          <AgentWorkingIndicator key={workingStatus.startedAt} message={workingStatus.message} startedAt={workingStatus.startedAt} turnStartedAt={workingStatus.turnStartedAt} expectation={workingStatus.expectation} compact/>
        </div>
      )}

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
          {/* FEATURE: CHI-01 — hop-grouped cards, same shared render path as desktop's AuditColumn. FEATURE: CHI-03c — was "turn-grouped".
              FEATURE: CHI-88 — `terse` is set here and only here: this pinned mobile feed drops raw
              agent task prompts in favour of the routing story. Desktop's AuditColumn passes nothing. */}
          {ordered.length === 0
            ? <div style={{fontFamily:body,fontSize:11,color:T.muted}}>{AGENT_ROUTING_EMPTY_TEXT}</div>
            : groupEventsIntoHops(ordered).map(hop => <RoutingHopCard key={hop.events[hop.events.length - 1].id} hop={hop} agentById={agentById} terse/>)}
        </div>
        <ScrollFadeHint show={routingCanScrollMore} bg={T.cardAlt}/>
      </div>

      {showAgentInfo && (
        <div style={{position:"absolute",inset:0,background:T.paperDeep,zIndex:5,display:"flex",flexDirection:"column"}}>
          <div style={overlayHeadStyle}>
            <span style={{fontFamily:display,fontSize:15,fontWeight:600}}>Agent &amp; Data Info</span>
            <button onClick={()=>setShowAgentInfo(false)} style={backBtnStyle}>← Back to Chat</button>
          </div>
          {/* FEATURE: CHI-88 — the page subtitle mobile's title block no longer carries; same
              CHI_SUBTITLE constant the desktop title block renders, no duplicate literal. */}
          <div style={{fontFamily:body,fontSize:11,color:T.muted,padding:"10px 14px 0"}}>{CHI_SUBTITLE}</div>
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
  // FEATURE: CHI-33 — Column 2 live news feed. null = still loading (or not yet fetched);
  // [] = a fetch completed but returned nothing usable (fails open to the existing empty-state
  // sentence, never a broken/blank card list); populated array = the 3 real cards to render.
  const [newsCards, setNewsCards] = useState(null);
  // FEATURE: CHI-33-patch -- start time of the current/most-recent fetchNewsCards() call, stamped
  // fresh on every call (mount and every Clear-triggered refire); feeds NewsCardsLoadingLine's
  // live elapsed timer while newsCards is still null.
  const [newsCardsStartedAt, setNewsCardsStartedAt] = useState(null);
  // FEATURE: CHI-33 — tracks which card's on-click article fetch is currently in flight (by url),
  // so only that one card shows a loading state, not the whole panel.
  const [newsCardLoadingUrl, setNewsCardLoadingUrl] = useState(null);
  const [pipelineEvents, setPipelineEvents] = useState([]);
  // FEATURE: CHI-03c — mirrors pipelineEvents synchronously (updated inside logEvent's own
  // setPipelineEvents updater, same tick) so hopStart/hopEnd capture inside the async
  // runQaWithQualityGate/runHypothesisTest/ack-call chains always reads the true current count,
  // never a stale value from the closure captured when that async function started.
  const pipelineEventsRef = useRef([]);
  const [workingStatus, setWorkingStatus] = useState(null); // { message, startedAt, turnStartedAt, expectation, expectationMs, kind } | null — FEATURE: HAR-17 -- expectationMs is the raw-ms twin of the formatted `expectation` string so the recovery writer can extend it arithmetically
  // FEATURE: CHI-75 — "is a chat question currently in flight?" A ref, not state, because
  // fetchNewsCards() is async and closes over stale state; this is read at the fetch's completion
  // to decide whether it still owns the shared workingStatus line (see fetchNewsCards below).
  const chatTurnActiveRef = useRef(false);
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

  // FEATURE: CHI-82 — the journey (ARCHITECTURE.md §19n): arrival-order step numbers for the
  // Steps & Evidence drawers. A ref (not state) because chat handlers need the assigned number
  // synchronously in the same tick, before any effect runs; journeyVersion exists purely to
  // re-render the drawer titles/ambient sort that read getStep() off the ref, bumped only when a
  // number is actually assigned or the journey resets.
  const journeyRef = useRef(EMPTY_JOURNEY());
  const [journeyVersion, setJourneyVersion] = useState(0); // value itself intentionally unread — see comment above
  const ensureStep = (key) => {
    const [journey, n] = assignStep(journeyRef.current, key);
    if (journey !== journeyRef.current) {
      journeyRef.current = journey;
      setJourneyVersion(v => v + 1);
    }
    return n;
  };
  const getStep = (key) => journeyRef.current.order[key];
  const resetJourney = () => {
    // FEATURE: CHI-82a — advance the seq (nextJourney), never back to EMPTY_JOURNEY(): content
    // created in a prior journey carries that journey's seq stamp and can then never pass the
    // membership check below.
    journeyRef.current = nextJourney(journeyRef.current);
    setJourneyVersion(v => v + 1);
  };

  // FEATURE: CHI-82b — the journey-membership signal, hoisted to ONE shared const (was computed
  // inside the arrival effect): the effect, the breadcrumb stage filter, and the three decision
  // badges all consume the same expression, so the membership definition can't drift across
  // sites. Safe to read at render time: every seq change is paired with a journeyVersion bump in
  // the same batch, so a render always sees the current seq. An unstamped hypFlow
  // (journeySeq undefined) is non-current by strict equality — the CHI-82a defensive default.
  const hypCurrent = !!(hypFlow && hypFlow.journeySeq === journeyRef.current.seq);

  // FEATURE: CHI-82 — arrival wiring: idempotent ensureStep calls as each drawer's backing state
  // lands, in an ordered if-chain so a single render satisfying several checks still assigns
  // numbers in the order the drawers arrive. "news" is deliberately absent — it is ensured only by
  // its own click handler (analyzeNewsCard), because ambient News at rest stays unnumbered (§19n).
  // FEATURE: CHI-82a — journey-membership guard: the three hyp checks fire only for a hypFlow
  // stamped with the CURRENT journey's seq (hypCurrent, hoisted above in CHI-82b). A previous
  // journey's persisted (CHI-51) hypFlow stays unnumbered ambient instead of renumbering into the
  // new journey the next time an effect dep changes. The `qa` check stays unguarded by design:
  // qaEvidence is a single overwritten slot, so the new journey's answer replaces it under the
  // same key and a pre-arrival stale assignment self-corrects.
  useEffect(() => {
    if (qaEvidence) ensureStep("qa");
    if (hypCurrent) ensureStep("hyp-candidates");
    if (hypCurrent && isHypInResultPhase(hypFlow)) ensureStep("hyp-result");
    if (hypCurrent && isHypAwaitingConfirmation(hypFlow)) ensureStep("hyp-draft");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qaEvidence, hypFlow?.stage, hypFlow?.confirmation]);

  // FEATURE: CHI-82b (T1) — breadcrumb stage from current-journey content only. currentStage()
  // itself is unchanged (pure, sentinel block); its INPUTS are membership-filtered here: qa's
  // membership test is "does qa hold a step in the current journey" (getStep), hypFlow's is the
  // shared hypCurrent above. Fixes QA's repro: stale resolved flow + new Analysis → "Analysis"
  // (not "Update"); right after a news-click reset with a stale unresolved flow → "Question".
  const crumbStage = currentStage({
    qaEvidence: getStep("qa") != null ? qaEvidence : null,
    hypFlow: hypCurrent ? hypFlow : null,
  });

  // FEATURE: MI-51 — Clear resets chat + any active flow back to the seed-question empty state,
  // same end state as a page refresh, no confirm dialog (this session's explicit design decision).
  const onClear = () => {
    clearGenerationRef.current += 1; // FEATURE: CHI-04 — invalidates every in-flight request's result
    resetJourney(); // FEATURE: CHI-82 — Clear is one of the journey's reset doors (§19n)
    setMessages([]);
    setHypFlow(null);
    setQaEvidence(null); // FEATURE: CHI-03a
    setWorkingStatus(null);
    setPipelineEvents([]); // FEATURE: CHI-04 — Agent Routing (Column 3) now resets with everything else
    pipelineEventsRef.current = []; // FEATURE: CHI-03c — must reset alongside setPipelineEvents([]) above, or the hop-count ref stays stale and the next question's hop badges start from the wrong number
    pendingDelegationsRef.current = new Map(); // FEATURE: CHI-04 — stale pending-delegation markers would otherwise mis-target a future event once ids restart from 0
    setNewsCards(null); // FEATURE: CHI-33 — back to the loading/default empty-state sentence until the refetch below lands
    fetchNewsCards(); // FEATURE: CHI-33 — refire on Clear, same as a fresh page load
  };

  // FEATURE: MI-42 -- one shared status-setter for both MI-41's macro-hop swaps (explicit calls
  // below) and this session's live micro-hop delegation events (via onDelegationProgress, forwarded
  // into every callCapability() call as onProgress) -- both write the same workingStatus, so they
  // can never drift into two different timers.
  const setStatus = (message, { expectation, expectationMs, kind = 'scripted' } = {}) =>
    setWorkingStatus(prev => ({
      message,
      startedAt: Date.now(),
      turnStartedAt: prev?.turnStartedAt ?? Date.now(),
      expectation: expectation !== undefined ? expectation : (prev?.expectation ?? null),
      // FEATURE: HAR-17 -- raw-ms twin of `expectation`, same merge semantics (an omitted value
      // carries the previous one forward). Fresh-turn sites with no grounded estimate store 120000
      // -- LIVE_EXPECT_FALLBACK's "< 2m" ceiling as ms -- so no live status is ever string-only.
      expectationMs: expectationMs !== undefined ? expectationMs : (prev?.expectationMs ?? 120000),
      kind,
    }));
  // FEATURE: MI-52 -- tracks still-pending in-flight delegation/delegation_return rows, keyed by the
  // agent expected to produce the real completion event (correlation's own awaitingAgentId). Map<
  // awaitingAgentId, { id, key } >. Not React state -- purely an internal bookkeeping side-table for
  // logEvent's own replace-in-place check below, never read for rendering.
  const pendingDelegationsRef = useRef(new Map());
  // FEATURE: CHI-56 -- running "last event arrival" timestamp for onDelegationProgress's real
  // arrival-delta duration (resolveDelegationDuration()); updated to Date.now() after every
  // resolution. null until the first delegation-family event of a fresh pipeline arrives, which
  // is exactly resolveDelegationDuration()'s own "no prior tick to diff against" case.
  const lastEventAtRef = useRef(null);

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
  // FEATURE: LOO-009b — a still-pending placeholder is now checked FIRST, every call, whether or
  // not `replaces` was supplied. Before this fix, any call carrying `{replaces}` (every
  // onDelegationProgress call, unconditionally) skipped this check entirely and could never
  // resolve an earlier pending row — root cause of the permanently-stuck "X is routing to Y" line.
  const logEvent = (evt, { replaces } = {}) => {
    const prev = pipelineEventsRef.current;
    const pending = pendingDelegationsRef.current.get(evt.agentId);
    let next;
    if (pending) {
      pendingDelegationsRef.current.delete(evt.agentId);
      next = prev.map(e => (e.id === pending.id ? { ...evt, id: pending.id } : e));
    } else if (replaces) {
      const id = prev.length;
      pendingDelegationsRef.current.set(replaces.awaitingAgentId, { id, key: replaces.key });
      next = [...prev, { ...evt, id }];
    } else {
      next = [...prev, { ...evt, id: prev.length }];
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
  // FEATURE: LOO-009b — 'delegation_return'/'delegation_complete' are both terminal: they either
  // claim the pending row 'delegation' registered, or (unclaimed edge case) append plainly — neither
  // ever awaits anything further itself, so neither passes `replaces` anymore. 'delegation_complete'
  // credits toAgentId (the agent who actually finished — same field 'delegation' used to name them
  // as the target); 'delegation_return' keeps its existing fromAgentId convention, unchanged.
  const onDelegationProgress = (evt) => {
    const message = describeDelegationEvent(evt, agents);
    setStatus(message, { kind: 'orchestration' });
    // FEATURE: CHI-56 — real client-side arrival-delta duration (was a literal `null` at both
    // buildHopEvent call sites below): resolveEventDuration() routes every delegation-family type
    // to resolveDelegationDuration(), the delta between this event's arrival and the previous
    // event's arrival. lastEventAtRef is updated after every resolution, unconditionally, so the
    // next tick (of either branch below) always diffs against this one.
    const now = Date.now();
    const durationMs = resolveEventDuration(evt.type, { nowMs: now, lastEventAtMs: lastEventAtRef.current });
    lastEventAtRef.current = now;
    if (evt.type === 'delegation_complete' || evt.type === 'delegation_return') {
      const attributedAgentId = evt.type === 'delegation_complete' ? evt.toAgentId : evt.fromAgentId;
      // FEATURE: LOO-012 — reasoning/task/toCapabilitySlug now carried into the stored event's data
      // (previously dropped — only message/viaTool survived), so describePipelineEvent below can
      // render real content instead of always falling through to the bare "has finished." template.
      // FEATURE: LOG-95 (§19p) -- the stored event's data spreads the credited endpoint's span
      // identity (pickCreditedSpan handles delegation_complete AND delegation_return correctly --
      // no branch-local span logic), so RoutingActivityLine's ai_call_patterns join works on
      // live streamed rows too, not only the result-shape-built ones.
      logEvent(buildHopEvent(evt.type, attributedAgentId, { message, viaTool: evt.viaTool || null, reasoning: evt.reasoning ?? null, task: evt.task ?? null, toCapabilitySlug: evt.toCapabilitySlug ?? null, ...pickCreditedSpan(evt) }, durationMs, {}));
      return;
    }
    const correlationKey = `${evt.fromAgentId}:${evt.toAgentId}:${evt.viaTool || ''}`;
    logEvent(buildHopEvent(evt.type, evt.fromAgentId, { message, viaTool: evt.viaTool || null, ...pickCreditedSpan(evt) }, durationMs, { secondaryAgentId: evt.type === 'delegation' ? evt.toAgentId : null }), { replaces: { key: correlationKey, awaitingAgentId: evt.toAgentId } });
  };

  // FEATURE: HAR-17 -- recovery visibility, John's exact design 2026-07-28: tell the user we hit a
  // snag and self-recovered, keep the same turn/timer identity, and EXTEND the displayed
  // expectation by the re-run's own p90 cost so the promise stays honest. Chat status only --
  // the Agent Routing drawer deliberately shows nothing (supersedes §19o's drawer wording).
  // Written via setWorkingStatus's functional update directly (not setStatus) because setStatus
  // resets startedAt -- the snag message must NOT reset the timers; only a genuinely new hop does.
  // No drawer write, no pendingDelegationsRef touch, no logEvent from this path. The no-live-status
  // guard below is the same ownership posture as CHI-75's chatTurnActiveRef: only annotate a
  // status line that actually exists, never conjure one. Subsequent normal status writes (the next
  // hop's own message) naturally replace the snag message -- that is the "then back on the elapsed
  // time and agent" part of John's design and needs no timer.
  const onRecoveryStatus = (recovery) => {
    setWorkingStatus(prev => {
      if (!prev) return prev; // no live status line owns this turn -- nothing to annotate
      const rerunMs = agentActivity?.[recovery.agent_id]?.byKind?.[recovery.intent_slug]?.byDepth?.depth0?.p90 || 60000;
      const newMs = (prev.expectationMs || 120000) + rerunMs;
      return { ...prev,
        message: "Hit a snag — recovered automatically, continuing…",
        expectation: formatExpectation(newMs), expectationMs: newMs,
        kind: 'orchestration' };
    });
  };

  // FEATURE: CHI-33 — Column 2 live news feed. Jordan Ellsworth (web-search-news) real-delegates
  // to Alex Reeves (screen-controls/news-cards-format) via the ordinary harness delegation loop —
  // onProgress: onDelegationProgress is the same wiring every other capability call already uses to
  // light up the Agent Routing drawer live, not a new mechanism. Fires once on mount and again on
  // every Clear (onClear below); isStale() guards against a Clear firing mid-fetch from either path.
  const fetchNewsCards = async () => {
    setNewsCardsStartedAt(Date.now()); // FEATURE: CHI-33-patch -- stamps a fresh start time on every call (mount and every Clear-triggered refire), feeds NewsCardsLoadingLine's elapsed timer.
    const myGeneration = clearGenerationRef.current;
    const isStale = () => clearGenerationRef.current !== myGeneration;
    try {
      // FEATURE: CHI-92 — Jordan searches first and returns structured stories; a second
      // call is his display request, with those stories already in task_context. This is the
      // same two-step shape ci-answer-display-intent uses (runQaWithQualityGate above): the
      // harness's delegationRequired auto-dispatch spreads task_context into the delegate's
      // envelope, so content reaches Alex the way it already reaches him for a Q&A answer.
      // Before this split, search and hand-off shared one call, so the stories Jordan found
      // existed only in his own turn and the delegate received the help-request text alone.
      const search = await callCapability({
        capability_slug: "web-search-news", intent_slug: "ws-news-search-intent", agent_id: "jordan",
        task_context: {}, onProgress: onDelegationProgress, isStale,
      });
      if (isStale()) return;
      const stories = Array.isArray(search?.stories) ? search.stories : [];
      if (!stories.length) { setNewsCards([]); if (!chatTurnActiveRef.current) setWorkingStatus(null); return; }
      // FEATURE: LOO-010 — still no hop declaration on either call: this one always resolves
      // through a delegation (Alex's credit already arrives live via delegation_complete +
      // onDelegationProgress), and the search call above deliberately declares nothing at all.
      const result = await callCapability({
        capability_slug: "web-search-news", intent_slug: "ws-news-display-intent", agent_id: "jordan",
        task_context: { stories }, onProgress: onDelegationProgress, isStale,
      });
      if (isStale()) return;
      setNewsCards(Array.isArray(result?.cards) ? result.cards : []);
      // FEATURE: CHI-75 — only clear if no chat question owns the status line right now; otherwise a
      // news fetch finishing mid-question would blank the question's live status for ~10s (the gap
      // John reported). The question clears its own status in submit()'s finally.
      if (!chatTurnActiveRef.current) setWorkingStatus(null);
    } catch (e) {
      console.error("[MarketIntelligenceScreen] fetchNewsCards", e.message);
      // Fails open to the existing empty-state sentence (newsCards stays non-null-but-empty),
      // never a broken/blank card list and never a thrown error surfaced to the user.
      if (!isStale()) {
        setNewsCards([]);
        if (!chatTurnActiveRef.current) setWorkingStatus(null); // FEATURE: CHI-75 — same ownership guard on the failure path
      }
    }
  };

  // FEATURE: CHI-33 — fires once on mount. Deliberately empty dependency array: this is a
  // fresh-page-load-only trigger, refire-on-Clear is handled separately inside onClear() above.
  useEffect(() => {
    fetchNewsCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FEATURE: CHI-42 — kind:"user_action" narration bubbles are excluded here so they never get
  // replayed into Marcus's own next prompt as fabricated user speech. See STYLE-GUIDE.md §36.
  const conversationContext = () =>
    messages.filter(m => typeof m.text === "string" && m.kind !== "user_action").map(m => `${m.role}: ${m.text}`).join("\n");

  const enterHypothesisFlow = async ({ intent, extractedHypothesis, flaggedQuestion, flaggedAnswer, citations, reviewReason }) => {
    const myGeneration = clearGenerationRef.current; // FEATURE: CHI-04
    const isStale = () => clearGenerationRef.current !== myGeneration; // FEATURE: CHI-04
    const onProgress = (evt) => { if (!isStale()) onDelegationProgress(evt); }; // FEATURE: CHI-04
    // FEATURE: CHI-82a — every fresh hypFlow is stamped with the journey it was created in
    // (journeySeq); the arrival effect numbers only current-journey content. Both entry doors
    // route through here: a routed question (journey just reset by submit) stamps the new seq;
    // the Review/escalation path stamps the same continuing journey's seq (no reset happened),
    // so escalation keeps numbering onward — exactly the §19n behavior. Stage-advance updates
    // spread the existing object and carry the stamp automatically.
    if (extractedHypothesis) {
      setHypFlow({ stage:"choosing", intent, candidates:null, prefillText:extractedHypothesis, chosenText:null,
        flaggedQuestion, flaggedAnswer, citations: citations || [], reviewReason, hypothesisTest:null, priorHypothesisTest:null, confirmation:null,
        journeySeq: journeyRef.current.seq });
      return;
    }
    setHypFlow({ stage:"generating", intent, candidates:null, prefillText:null, chosenText:null,
      flaggedQuestion, flaggedAnswer, citations: citations || [], reviewReason, hypothesisTest:null, priorHypothesisTest:null, confirmation:null,
      journeySeq: journeyRef.current.seq });
    const t0 = Date.now();
    {
      const est = estimateChainMs(INTENT_CHAINS.hypothesis_generation, agentActivity);
      // FEATURE: CHI-82 — "hypotheses" -> "theories" (single vocabulary, chi-vocabulary.md)
      // FEATURE: HAR-17 -- raw ms stored alongside the string: grounded est when present, else the 120s fallback ceiling
      setStatus("Priya is generating theories…", { expectation: est != null ? formatExpectation(est) : null, expectationMs: est != null ? est : 120000 });
    }
    try {
      const hopBeforeGen = currentHopCount(pipelineEventsRef.current); // FEATURE: CHI-74 -- hop span start for the theory-candidates close line
      // FEATURE: LOG-79 -- trace_id/span_id (not legacy patterns_used) carry the pattern-line identity
      const { hypotheses: candidates, trace_id, span_id } = await generateHypotheses({ flaggedQuestion, flaggedAnswer, reviewReason, isStale, onRecovery: onRecoveryStatus }); // FEATURE: HAR-17
      if (isStale()) return; // FEATURE: CHI-04
      logEvent(buildHopEvent("hypothesis_generation", "priya", { candidates, trace_id, span_id }, Date.now() - t0));
      setHypFlow(prev => prev && ({ ...prev, stage:"choosing", candidates }));
      // FEATURE: CHI-61 -- Marcus's instructive next-step bubble; candidates previously landed with
      // zero chat narration telling the user what to do with them. Only fires on the generated-
      // candidates path (extractedHypothesis's early-return above never reaches here — that path
      // has no candidates array, a single prefilled theory instead, a different UI affordance).
      const n = candidates?.length ?? 0;
      if (n > 0) {
        // FEATURE: CHI-74 -- theory candidates are grounded work (Priya's generation); carry their close (elapsed vs expected + hops)
        // FEATURE: CHI-82 -- directive handoff copy + step chip: the bubble names exactly one step
        // (number + "Theories", same chip the drawer's title wears — §19n Decision 3). ensureStep
        // is computed here, synchronously, so the number is right even before the effect runs.
        setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: `${n} theor${n === 1 ? "y" : "ies"} ready — pick the one that best explains it, or write your own.`,
          totalElapsedMs: Date.now() - t0, hopStart: hopBeforeGen + 1, hopEnd: currentHopCount(pipelineEventsRef.current), estimate: buildEndStatusEstimate("expected < 2m"),
          stepRef: { n: ensureStep("hyp-candidates"), label: "Theories" } })]);
      }
    } catch (e) {
      // FEATURE: MI-29 -- surface real error to chat + Pipeline Log instead of a silent reset
      console.error("[MarketIntelligenceScreen] generateHypotheses", e.message);
      logEvent(buildHopEvent("error", "priya", { step: "hypothesis_generation", message: describeCaughtError(e) }, Date.now() - t0)); // FEATURE: HAR-15 — was a bare e.message
      setMessages(prev => [...prev, buildMessage({ kind: "error", text: faultAdvice(e, "Something went wrong generating theories — try again.") })]); // FEATURE: CHI-82 — vocabulary sweep; HAR-15 — honest fault copy
      setHypFlow(null);
    } finally {
      setWorkingStatus(null);
    }
  };

  // FEATURE: CHI-33 — backgroundContext is an optional second param (analyzeNewsCard() below is the
  // only caller that passes it). setMessages keeps using only `clean` (the visible chat bubble text)
  // -- backgroundContext never reaches the chat bubble, only runIntentPipeline()'s task_context.
  // FEATURE: CHI-82 — skipJourneyReset is an internal opt for the news-card door only:
  // analyzeNewsCard() resets the journey itself and claims step 1 for News BEFORE invoking this,
  // so its internal submit must not reset again (§19n: News is step 1 only on that door).
  const submit = async (text, backgroundContext = null, { skipJourneyReset = false } = {}) => {
    const clean = (text || "").trim();
    if (!clean || loading) return;
    // FEATURE: CHI-82 — a new question is the journey's main entry door: numbering restarts at 1
    // (§19n Decision 1). The Review/escalation path never routes through here, so an escalation
    // correctly continues the same journey's numbering.
    if (!skipJourneyReset) resetJourney();
    setMessages(prev => [...prev, buildMessage({ role: "user", text: clean })]);
    setLoading(true);
    chatTurnActiveRef.current = true; // FEATURE: CHI-75 — claim ownership of the status line for this turn
    const myGeneration = clearGenerationRef.current; // FEATURE: CHI-04
    const isStale = () => clearGenerationRef.current !== myGeneration; // FEATURE: CHI-04
    const onProgress = (evt) => { if (!isStale()) onDelegationProgress(evt); }; // FEATURE: CHI-04
    const turnStart = Date.now(); // FEATURE: MI-42 -- captured once, feeds Task 4's final-timeline caption
    // FEATURE: CHI-56 -- seed the delegation-arrival-delta reference to this turn's own start, not
    // left null/stale from whatever the previous turn's last delegation-family event was. Two real
    // reasons: (1) a genuinely first-of-turn delegation_complete/delegation_return (no preceding
    // "delegation" tick within the same pipeline) would otherwise resolve null, which buildHopEvent's
    // own pre-existing guard treats as an undeclared-type caller bug (a real console.error,
    // live-reproduced this session on a retried call) -- "every hop shows a real time, no exceptions"
    // (John) requires a real reference point from the first tick of every turn, not just most of
    // them. (2) diffing the first delegation-family event of a new turn against the PREVIOUS turn's
    // last one would silently fold the user's own between-questions think-time into that hop's
    // reported duration -- dishonest data, not a measurement of real agent work. Seeding to turnStart
    // makes the first hop's duration mean "time from this question starting to this hand-off," the
    // same honest semantic every other hop already has.
    lastEventAtRef.current = turnStart;
    // FEATURE: CHI-56 -- the estimate live at turn-start, snapshotted here (before intent_routing's
    // later upgrade to a routing-chain-based figure, ~L3244 below) so End status can show what the
    // system originally told the user alongside the real elapsed time, not the upgraded figure.
    const expectationAtStart = buildEndStatusEstimate("expected < 2m"); // FEATURE: CHI-71 -- past-tense always (summary line is retrospective)
    // FEATURE: CHI-04 — only when pipelineEvents is non-empty: skipped on the very first question of a
    // fresh session, and naturally skipped right after Clear too (pipelineEvents is already []).
    // FEATURE: CHI-56 -- now built via buildTransactionBoundaryEvent("start", ...) (turnTracking.js)
    // instead of an inline literal -- byte-identical resulting event shape, unchanged trigger point.
    if (pipelineEvents.length > 0) {
      logEvent(buildTransactionBoundaryEvent("start", turnStart));
    }
    // FEATURE: CHI-23 — the real, current hop total right before this turn's own events start;
    // hopStart for this turn's message is this count + 1 (John's own framing: the label just
    // grabs the final gold number, and for a following question, subtracts the delta from it).
    const hopCountBeforeTurn = currentHopCount(pipelineEventsRef.current);
    // FEATURE: CHI-73 — no longer passes the live ceiling literal; the indicator's centralized
    // LIVE_EXPECT_FALLBACK now supplies it (present-tense "expect < 2m"). The grounded upgrade
    // below (L3349) still fires when the qa chain's p90 resolves. expectationAtStart is retained
    // only for the retrospective message estimate at L3391 (past-tense, unchanged).
    setStatus("Marcus is thinking…");
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
            // FEATURE: HAR-17 -- the grounded upgrade also stores the raw ms twin
            return est != null ? { ...prev, expectation: formatExpectation(est), expectationMs: est } : prev;
          });
        }
      }, setStatus, onProgress, isStale, backgroundContext, onRecoveryStatus); // FEATURE: CHI-23 — getHopCount param removed, no longer threaded through. FEATURE: CHI-33 — backgroundContext threaded through. FEATURE: HAR-17 — recovery visibility threaded through
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
          // FEATURE: CHI-58 — which news article (if any) triggered this answer, so the News drawer
          // can mark it "Analyzed" on reopen. null for a plain typed question, unchanged behavior.
          sourceNewsUrl: backgroundContext?.article_url || null,
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
          // FEATURE: CHI-56 -- the estimate snapshotted at this turn's start, so End status can show
          // it alongside the real elapsed time above.
          estimate: expectationAtStart,
        })]);
      } else if (result.kind === "qa_failed") {
        setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: result.text })]);
      } else if (result.kind === "hyp_entry") {
        // FEATURE: CHI-74 -- the forecast/theory/correct routing ack is grounded work; carry its close (elapsed vs expected + hops), same as the Q&A bubble, using this turn's own in-scope tracking
        // FEATURE: CHI-82 — single-vocabulary rewrite (chi-vocabulary.md): the ack names the routed
        // stage word via INTENT_LABEL (which survives for routing — it just never titles a drawer
        // again) and says what happens next in the one sanctioned noun. CHI-73's HYP_ENTRY_TAIL
        // collapsed into this branch (this was its only caller). No stepRef: this bubble precedes
        // any drawer's arrival, so there is no step to name yet (§19n — never predict a drawer).
        const ackText = result.intent === "correct"
          ? "Got it — reviewing that correction now…"
          : `Got it — this needs a ${(INTENT_LABEL[result.intent] || "theory").toLowerCase()}. First I'm building theories for you to choose from…`;
        setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: ackText,
          totalElapsedMs: Date.now() - turnStart, hopStart: hopCountBeforeTurn + 1, hopEnd: currentHopCount(pipelineEventsRef.current), estimate: expectationAtStart })]);
        await enterHypothesisFlow({ intent: result.intent, extractedHypothesis: result.extractedHypothesis, flaggedQuestion: result.flaggedQuestion, flaggedAnswer: null, citations: [], reviewReason: null });
      } else {
        setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: result.text })]);
      }
    } catch (e) {
      // FEATURE: CHI-77 — the one async catch on this screen that dropped the real reason. Now emits
      // the same MI-29 "error" Pipeline Log event the four sibling catches already do (renders in
      // Column 3 as "Ran into a problem partway through — {reason}", T.flag), so the cause is visible
      // where the audit trail lives instead of only in the browser console. agentId "marcus": onSend
      // can't know which hop threw; the reason string carries the real culprit. Duration is the real
      // time-to-failure. See ARCHITECTURE.md §19j — a fault report, not agent content.
      logEvent(buildHopEvent("error", "marcus", { message: describeCaughtError(e) }, Date.now() - turnStart));
      // FEATURE: CHI-77 — honest copy: "reaching Marcus" was wrong (Marcus was reached; the break is
      // downstream). "Try again" stays — this failure is transient, so retrying is correct advice.
      setMessages(prev => [...prev, buildMessage({ kind: "error", text: faultAdvice(e, "Something went wrong completing your answer — try again.") })]); // FEATURE: HAR-15
      console.error("[MarketIntelligenceScreen]", e);
    } finally {
      setLoading(false);
      chatTurnActiveRef.current = false; // FEATURE: CHI-75 — release ownership (try/finally guarantees no leak)
      setWorkingStatus(null);
    }
  };

  // FEATURE: CHI-33 — card click -> chat. Fetches the full article first (background context,
  // never shown in the chat bubble), then submits the exact confirmed visible question text.
  // String-safe: a card with no url (Category C) shows an error message instead of throwing or
  // silently submitting with no context.
  const analyzeNewsCard = async (card) => {
    if (!card || typeof card.url !== "string" || !card.url) {
      setMessages(prev => [...prev, buildMessage({ kind: "error", text: "That story doesn't have a link to analyze." })]);
      return;
    }
    // FEATURE: CHI-82 — the news-card click is the journey's other entry door (§19n): reset, then
    // claim step 1 for News — the only path that ever numbers the ambient News drawer. Done before
    // the internal submit below, which is told to skip its own reset.
    resetJourney();
    ensureStep("news");
    setNewsCardLoadingUrl(card.url);
    // FEATURE: SES-57 -- the Article Context Resolver owns the fetch, the failure classification and
    // the payload. This screen and the CHI test engine call the same function, so the payload cannot
    // diverge again (the CHI-91 field drift that invalidated regression test #24).
    // setNewsCardLoadingUrl(null) is a plain statement rather than a finally, safe ONLY because
    // resolveNewsCardContext() cannot throw (its no-throw contract IS the fail-open behavior). If
    // that contract ever changes, this becomes a spinner leak.
    const { payload, failure } = await resolveNewsCardContext(card.url, "/api/fetch-article");
    setNewsCardLoadingUrl(null);
    // FEATURE: CHI-91 -- platform fault report before the analysis runs. Fail-open is unchanged
    // (CHI-58, :4032): the question is still submitted with a null article. This only stops the
    // non-answer from being unexplained. Presentation stays in the screen -- the resolver returns
    // the failure, the screen decides to render it.
    const faultText = articleFaultText(failure);
    if (faultText) setMessages(prev => [...prev, buildMessage({ kind: "error", text: faultText })]);
    const visibleMessage = `New industry development: ${card.headline}. What does this mean for our channel program positioning?`; // FEATURE: CHI-33-patch2 -- reworded again to present the headline as delivered news (a given fact), not a causal test, matching ci-routing-intent's new EXTERNAL-FACT QUESTIONS rule; see kickoff CONTEXT.
    // FEATURE: CHI-58 — article_url threaded through so submit()'s qa branch can persist which
    // article this answer came from onto qaEvidence (Task 1b), independent of whether the fetch
    // itself succeeded (a card can still be "the one analyzed" even if fetch-article failed open).
    submit(visibleMessage, payload, { skipJourneyReset: true }); // FEATURE: CHI-82 — see reset above; CHI-91 — the reason rides the same backgroundContext spread as article_source; SES-57 — the payload is the resolver's, byte-identical to the test engine's
  };

  // FEATURE: CHI-03a — onGoodThanks/onReview now operate on qaEvidence directly (were
  // message-index-based, MI-51) since the review-choice buttons moved from chat into
  // EvidenceColumn's QaEvidenceCard, and there is only ever one "most recent" qaEvidence, not an
  // indexable list.
  const onGoodThanks = () => {
    // FEATURE: CHI-42 — instant "You" narration bubble, pushed before any state change. See STYLE-GUIDE.md §36.
    setMessages(prev => [...prev, buildMessage({ kind: "user_action", text: "You're good with this analysis." })]);
    // FEATURE: CHI-56 -- symmetric "transaction complete" marker: the user is done with this plain
    // Q&A, no further action. Only terminal case this session adds (theory/forecast commit-reject-
    // accept flows are Session 2's scope, per this session's kickoff SCOPE RULES).
    logEvent(buildTransactionBoundaryEvent("complete", Date.now()));
    setQaEvidence(prev => prev && ({ ...prev, reviewChoice: "good" }));
  };

  const onReview = () => {
    if (!qaEvidence) return;
    // FEATURE: CHI-42 — instant "You" narration bubble, pushed before any state change. See STYLE-GUIDE.md §36.
    setMessages(prev => [...prev, buildMessage({ kind: "user_action", text: "You asked for deeper theories." })]);
    logEvent(buildTransactionBoundaryEvent("start", Date.now())); // FEATURE: CHI-57
    const { question, text, citations, review_reason } = qaEvidence;
    setQaEvidence(prev => prev && ({ ...prev, reviewChoice: "exploring" }));
    enterHypothesisFlow({ intent:"theory", extractedHypothesis:null, flaggedQuestion: question, flaggedAnswer: text, citations: citations || [], reviewReason: review_reason });
  };

  const onIntentChange = (intent) => setHypFlow(prev => prev && ({ ...prev, intent }));

  const onSelectHypothesis = async (text) => {
    if (!hypFlow) return;
    // FEATURE: CHI-44 — auto-advances straight into the test on selection (was a 2-step select-then-
    // confirm flow, MI-51's own deliberate choice at the time, reversed here per John's direct call,
    // 2026-07-21 — same auto-fire precedent already established by the news-card flow). Collapses
    // CHI-42's 2 bubbles for this flow (select, then a separate test-button click) into 1, since it's
    // now a single physical click.
    setMessages(prev => [...prev, buildMessage({ kind: "user_action", text: "You selected a theory to test." })]);
    logEvent(buildTransactionBoundaryEvent("start", Date.now())); // FEATURE: CHI-57
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
    // FEATURE: HAR-17 -- the fire-and-forget ack calls (this one and its .catch siblings below/in
    // onDiscard/onResolveConfirmation) are deliberately NOT wired for onRecovery: no user-visible
    // wait exists here, so there is no status line to annotate. Recovery still happens server-side.
    // fetchNewsCards is likewise scoped out (CHI-86 owns its stream hygiene).
    callCapability({
      capability_slug: "channel-intelligence", intent_slug: "ci-submission-ack-intent", agent_id: "marcus",
      task_context: { submitted_theory: text },
    }).then(ack => {
      setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: ack.ack_text, hopStart: submissionAckHop, hopEnd: submissionAckHop, totalElapsedMs: Date.now() - turnStart })]);
    }).catch(e => {
      console.error("[MarketIntelligenceScreen] ci-submission-ack-intent", e.message);
      // No user-facing error for this one — it's a nice-to-have narration, not load-bearing;
      // the existing "Priya is running a theory test…" status strip already gives real feedback.
    });
    const t0 = Date.now();
    const turnStart = t0; // FEATURE: MI-42 -- Task 4's caption reads this
    const hopCountBeforeTurn = currentHopCount(pipelineEventsRef.current); // FEATURE: CHI-23
    {
      const est = estimateChainMs(INTENT_CHAINS.hypothesis_test, agentActivity);
      // FEATURE: CHI-82 — "hypothesis test" -> "theory test" (single vocabulary, chi-vocabulary.md)
      // FEATURE: HAR-17 -- raw ms stored alongside the string: grounded est when present, else the 120s fallback ceiling
      setStatus("Priya is running a theory test…", { expectation: est != null ? formatExpectation(est) : null, expectationMs: est != null ? est : 120000 });
    }
    try {
      const st = await runHypothesisTest({ hypothesis: text, intent, flaggedQuestion, flaggedAnswer, priorHypothesisTest: hypothesisTest || null, onEvent: logEvent, setStatus, onProgress, isStale, onRecovery: onRecoveryStatus }); // FEATURE: CHI-23 — getHopCount param removed. FEATURE: HAR-17 — recovery visibility
      if (isStale()) return; // FEATURE: CHI-04
      logEvent(buildHopEvent("hypothesis_test", "priya", st, Date.now() - t0));
      // FEATURE: MI-65 — no chat push here anymore. The raw test result stays in Evidence only
      // until the user resolves it (Info Only / Store as Forecast); testElapsedMs carries onto
      // hypFlow so the eventual chat card (Task 3/4) can still caption real test time.
      // FEATURE: CHI-23 — hop numbers read fresh from the gold count here, after the trailing
      // hypothesis_test event just above (the old code captured hopEnd inside runHypothesisTest,
      // before this trailing event existed — structurally one hop short, every time).
      // FEATURE: CHI-58 — testElapsedMs captured once so the chat push below and hypFlow's own
      // field stay byte-identical (previously only carried on hypFlow — MI-65's comment already
      // anticipated this exact chat push).
      const chiTestElapsedMs = Date.now() - turnStart;
      setHypFlow(prev => prev && ({ ...prev, stage:"result", chosenText: text, hypothesisTest: { ...st, hopStart: hopCountBeforeTurn + 1, hopEnd: currentHopCount(pipelineEventsRef.current) }, priorHypothesisTest: prev.hypothesisTest || null, testElapsedMs: chiTestElapsedMs }));
      // FEATURE: CHI-76 — the test-completion status now renders via the centralized HopSummaryLine
      // caption (hop badge + "Full Agent Routing & Answer in N hops total, Xs (expected < 2m)"), same
      // as the Q&A completion bubble — was a bare hand-formatted "…Given in Xs" bubble (CHI-58), the
      // last grounded-work bubble CHI-74 didn't convert. isAnswer:true → keeps the "& Answer" wording.
      // FEATURE: CHI-82 — directive handoff copy + step chip (number + "Theory Result", the same
      // chip the drawer's title wears — §19n Decision 3); existing hop/elapsed fields untouched.
      setMessages(prev => [...prev, buildMessage({
        kind: "non_qa",
        text: "Priya's evidence is in — review it, then choose Create Forecast or Store as Info Only.",
        hopStart: hopCountBeforeTurn + 1,
        hopEnd: currentHopCount(pipelineEventsRef.current),
        totalElapsedMs: chiTestElapsedMs,
        estimate: buildEndStatusEstimate("expected < 2m"),
        isAnswer: true,
        stepRef: { n: ensureStep("hyp-result"), label: "Theory Result" },
      })]);
    } catch (e) {
      // FEATURE: MI-29 -- surface real error to chat + Pipeline Log instead of a silent reset
      console.error("[MarketIntelligenceScreen] runHypothesisTest", e.message);
      logEvent(buildHopEvent("error", "priya", { step: "hypothesis_test_display", message: describeCaughtError(e) }, Date.now() - t0)); // FEATURE: HAR-15 — was a bare e.message
      setMessages(prev => [...prev, buildMessage({ kind: "error", text: faultAdvice(e, "Something went wrong running that theory test — try again.") })]); // FEATURE: CHI-82 — vocabulary sweep; HAR-15 — honest fault copy
      setHypFlow(prev => prev && ({ ...prev, stage:"choosing" }));
    } finally {
      setWorkingStatus(null);
    }
  };

  const onDiscard = () => {
    // FEATURE: CHI-42 — instant "You" narration bubble, pushed before any state change. See STYLE-GUIDE.md §36.
    setMessages(prev => [...prev, buildMessage({ kind: "user_action", text: "You marked that as info only." })]);
    // FEATURE: CHI-61 -- symmetric "transaction complete" marker, same treatment onGoodThanks() got
    // in CHI-56. Info-only is a real terminal resolution (no further action follows), unlike
    // onSelectHypothesis/onCommit's "start" markers which are mid-flow, not terminal.
    logEvent(buildTransactionBoundaryEvent("complete", Date.now()));
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
    // FEATURE: CHI-51 — no longer nulls hypFlow; Candidates/Result stay rendered (collapsed,
    // reopenable) instead of being destroyed. `resolution` is the new signal the footer/
    // instructional gates and useDrawerStack's suppression key off of.
    setHypFlow(prev => prev && ({ ...prev, resolution: "info_only" }));
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
    // FEATURE: CHI-42 — instant "You" narration bubble, pushed before any state change or async call. See STYLE-GUIDE.md §36.
    setMessages(prev => [...prev, buildMessage({ kind: "user_action", text: "You requested a forecast." })]);
    // FEATURE: CHI-79 -- span start for the draft-ready bubble's close caption. Captured here (not
    // the existing t0, which is reset between the Elena and Nadia hops) so the caption covers the
    // whole commit sequence, mirroring the CHI-74 theory-candidates close line.
    const commitStart = Date.now();
    const hopBeforeCommit = currentHopCount(pipelineEventsRef.current);
    logEvent(buildTransactionBoundaryEvent("start", Date.now())); // FEATURE: CHI-57
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
      // FEATURE: AGT-37 -- every real citation this flow is already holding, gathered once and
      // de-duplicated (order preserved). Two sources, both already in scope and both already correct:
      // hypFlow.citations, the flagged answer's own full 36-character UUIDs (ci-answer-intent's
      // verified live shape), and the citations halves of the three theory-test sections, which arrive
      // as {text, citations} (CHI-65) and which the hypothesisTestText join directly above deliberately
      // discards. Nothing new is fetched, computed, or asked of a model -- the correct value was
      // already known here, which is exactly why no model should be producing it (HAR-21's principle).
      const commitCitationIds = [...new Set([
        ...(Array.isArray(citations) ? citations : []),
        ...[hypothesisTest?.supports, hypothesisTest?.complicates, hypothesisTest?.consider]
          .flatMap(s => (Array.isArray(s?.citations) ? s.citations : [])),
      ])].filter(id => typeof id === "string" && id.length > 0);

      setStatus("Elena is consolidating this into memory…");
      const elenaResult = await callCapability({
        capability_slug: "memory-consolidation", intent_slug: "reasoner-intent", agent_id: "elena",
        task_context: {
          original_question: flaggedQuestion || "", flagged_answer: flaggedAnswer || "",
          committed_hypothesis: chosenText, intent, hypothesis_test: hypothesisTestText,
          was_override: !!hypothesisTest?.override_warning,
        },
        // FEATURE: AGT-37 -- the ids go HERE, as a sibling field, and never into task_context above.
        // task_context is prompt material -- db-assembly.js serializes every non-empty key into the
        // agent's prompt (HAR-06's .goal branch; this intent carries no goal so it takes AI-44's TASK
        // DETAILS fallback, where every key lands). Putting a real chunk id there would render one in
        // front of the single agent this change exists to keep away from ids, and AGT-39 records that
        // these agents write ids they can see into their own prose -- which becomes the next step's
        // decoy. handler_context reaches the write handler and stops; it never reaches assemblePrompt().
        handler_context: { source_chunk_ids: commitCitationIds },
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
      // FEATURE: CHI-50 — chat pointer, same static-message pattern used elsewhere in this
      // function (e.g. the resolution-step "Got it — that's been stored as a forecast." push).
      // Unlike MI-65's deliberate no-chat-push choice for the theory-test-result landing (a
      // read-only arrival), this moment requires a real decision (accept/edit/reject a Data
      // Room write) — worth more than a silent footer/drawer change. No new AI call, no new
      // intent — a plain static string.
      // FEATURE: CHI-79 -- the one draft-ready bubble CHI-74/CHI-76's standardization missed: carry
      // its close caption (elapsed vs expected + hops) like every other grounded-work bubble. No
      // isAnswer -> HopSummaryLine's default (isAnswer=false) reads "Full Agent Routing" (no
      // "& Answer") -- a draft-ready notice is a routing-completion ack, not an answer.
      // FEATURE: CHI-82 -- directive handoff copy + step chip (number + "Draft Forecast", the same
      // chip the drawer's title wears -- §19n Decision 3); CHI-79's hop-caption fields untouched.
      setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: "Nadia drafted your forecast — review it, then Accept, Edit, or Reject.",
        totalElapsedMs: Date.now() - commitStart, hopStart: hopBeforeCommit + 1, hopEnd: currentHopCount(pipelineEventsRef.current), estimate: buildEndStatusEstimate("expected < 2m"),
        stepRef: { n: ensureStep("hyp-draft"), label: "Draft Forecast" } })]);
    } catch (e) {
      // FEATURE: MI-29 -- surface real error to chat + Pipeline Log instead of a silent reset
      console.error("[MarketIntelligenceScreen] onCommit", e.message);
      logEvent(buildHopEvent("error", step === "memory_consolidation" ? "elena" : "nadia", { step, message: describeCaughtError(e) }, Date.now() - t0)); // FEATURE: HAR-15 — was a bare e.message
      setMessages(prev => [...prev, buildMessage({ kind: "error", text: faultAdvice(e, "Something went wrong committing that — try again.") })]); // FEATURE: HAR-15
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
    const { confirmation_id, disputed_chunk_id, user_reasoning: originalUserReasoning } = hypFlow.confirmation;
    // FEATURE: AGT-47 — the edit-resolve call used to send the reviewer's edit ALONE as
    // user_reasoning, so Nadia never received the theory-test figures on this path and had nothing
    // to carry forward. The original theory text is already on hypFlow.confirmation (written at the
    // first patch call, and preserved by the edit round-trip's ...prev.confirmation spread below);
    // this reads it and joins it with the edit. .filter(Boolean) falls back to today's behavior
    // (edit alone) for an older confirmation row that never stored user_reasoning.
    const edited_task_context = resolution === "edit"
      ? { disputed_chunk_id, correction: editedText, user_reasoning: [originalUserReasoning, editedText].filter(Boolean).join("\n") }
      : null;
    const t0 = Date.now();
    setStatus("Nadia is processing your response…");
    try {
      const result = await resolveConfirmation({ confirmation_id, resolution, edited_task_context, isStale, onRecovery: onRecoveryStatus }); // FEATURE: HAR-17 — recovery visibility (still non-streamed — no onProgress, LOO-25 documents why)
      if (isStale()) return; // FEATURE: CHI-04

      if (resolution === "edit") {
        // FEATURE: CHI-42 — instant "You" narration bubble; fires once the branch is known (not
        // fully synchronous with the click, since resolveConfirmation() already resolved above) —
        // accepted narrower exception, see kickoff CONTEXT. See STYLE-GUIDE.md §36.
        setMessages(prev => [...prev, buildMessage({ kind: "user_action", text: "You edited the proposal." })]);
        logEvent(buildTransactionBoundaryEvent("start", Date.now())); // FEATURE: CHI-57
        // FEATURE: LOG-15 — the pattern-line identity exists on `result` (same shared mechanism,
        // threaded through resolveConfirmation()) but wasn't hoisted to the top level the renderer
        // reads; the {resolution, result} wrapper was silently dropping it. FEATURE: LOG-79 --
        // that identity is now trace_id/span_id (if present on this resolve path), not patterns_used.
        logEvent(buildHopEvent("patch_resolved", "nadia", { resolution, result, trace_id: result.trace_id, span_id: result.span_id }, Date.now() - t0));
        setHypFlow(prev => prev && ({
          ...prev,
          confirmation: { ...prev.confirmation, confirmation_id: result.confirmation_id, proposed_action: result.proposed_action, critique: result.critique },
        }));
        return;
      }

      // FEATURE: LOG-15 — same wrapper-nesting fix as the edit branch above. FEATURE: LOG-79 --
      // same trace_id/span_id identity swap as the edit branch above.
      logEvent(buildHopEvent("patch_resolved", "nadia", { resolution, result, trace_id: result.trace_id, span_id: result.span_id }, Date.now() - t0));
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
        // FEATURE: CHI-42 — instant "You" narration bubble; fires once the branch is known (not
        // fully synchronous with the click, since resolveConfirmation() already resolved above) —
        // accepted narrower exception, see kickoff CONTEXT. See STYLE-GUIDE.md §36.
        setMessages(prev => [...prev, buildMessage({ kind: "user_action", text: "You confirmed the forecast." })]);
        logEvent(buildTransactionBoundaryEvent("start", Date.now())); // FEATURE: CHI-57
        // FEATURE: CHI-61 -- terminal marker: accept is a real conclusion (unlike the edit branch
        // above, which loops back into another confirmation round, not terminal).
        logEvent(buildTransactionBoundaryEvent("complete", Date.now()));
        callCapability({
          capability_slug: "channel-intelligence", intent_slug: "ci-resolution-ack-intent", agent_id: "marcus",
          task_context: { resolution: "stored", theory: hypFlow?.chosenText || "" },
        }).then(ack => setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: ack.ack_text, hopStart: resolutionAckHop, hopEnd: resolutionAckHop, totalElapsedMs: Date.now() - t0 })]))
          .catch(e => {
            console.error("[MarketIntelligenceScreen] ci-resolution-ack-intent", e.message);
            setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: "Got it — that's been stored as a forecast.", hopStart: resolutionAckHop, hopEnd: resolutionAckHop, totalElapsedMs: Date.now() - t0 })]);
          });
      } else {
        // FEATURE: CHI-42 — instant "You" narration bubble; fires once the branch is known (not
        // fully synchronous with the click, since resolveConfirmation() already resolved above) —
        // accepted narrower exception, see kickoff CONTEXT. See STYLE-GUIDE.md §36.
        setMessages(prev => [...prev, buildMessage({ kind: "user_action", text: "You rejected that proposal." })]);
        logEvent(buildTransactionBoundaryEvent("start", Date.now())); // FEATURE: CHI-57
        // FEATURE: CHI-61 -- terminal marker, same as the accept branch above.
        logEvent(buildTransactionBoundaryEvent("complete", Date.now()));
        callCapability({
          capability_slug: "channel-intelligence", intent_slug: "ci-resolution-ack-intent", agent_id: "marcus",
          task_context: { resolution: "rejected", theory: hypFlow?.chosenText || "" },
        }).then(ack => setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: ack.ack_text, hopStart: resolutionAckHop, hopEnd: resolutionAckHop, totalElapsedMs: Date.now() - t0 })]))
          .catch(e => {
            console.error("[MarketIntelligenceScreen] ci-resolution-ack-intent", e.message);
            setMessages(prev => [...prev, buildMessage({ kind: "non_qa", text: "Got it — that proposal was rejected, nothing was stored.", hopStart: resolutionAckHop, hopEnd: resolutionAckHop, totalElapsedMs: Date.now() - t0 })]);
          });
      }
      // FEATURE: CHI-51 — no longer nulls hypFlow; Result/Draft Forecast stay rendered (collapsed,
      // reopenable). Reuses the exact same "stored"/"rejected" vocabulary the ack calls above
      // already use for task_context.resolution.
      setHypFlow(prev => prev && ({ ...prev, resolution: resolution === "accept" ? "stored" : "rejected" }));
    } catch (e) {
      // FEATURE: AA-189 — this catch was previously missing entirely; any resolve failure (this
      // bug or a future one) silently stuck ConfirmationCard open with zero feedback. Symmetric to
      // onCommit()'s existing catch, but deliberately does NOT reset hypFlow (John's explicit call,
      // S-AA-189-design) — the drafted confirmation is still valid, only the resolve action failed,
      // so the user can retry Accept/Reject on the same card instead of losing the draft.
      console.error("[MarketIntelligenceScreen] onResolveConfirmation", e.message);
      logEvent(buildHopEvent("error", "nadia", { step: "resolve_confirmation", resolution, message: describeCaughtError(e) }, Date.now() - t0)); // FEATURE: HAR-15 — was a bare e.message
      // FEATURE: DAT-7 -- a denied write (bad chunk_id baked into proposed_action) will fail
      // identically forever; the generic "try again" message is actively wrong advice for it.
      // Only Edit/Reject actually unblock the user in that case.
      const isDeniedWrite = typeof e.detail?.tier === "string" && e.detail.tier.startsWith("denied-");
      // FEATURE: HAR-15 -- credit exhaustion takes precedence, then DAT-7's denied-write branch,
      // then the generic fallback (faultAdvice returns its fallback untouched for both other cases).
      setMessages(prev => [...prev, buildMessage({ kind: "error", text: faultAdvice(e, isDeniedWrite
        ? "This proposal's Data Room reference no longer resolves — use Edit to redraft it, or Reject."
        : "Something went wrong resolving that — try again.") })]);
    } finally {
      setWorkingStatus(null);
    }
  };

  return (
    <AppShell>
      <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",minHeight:0,background:T.paperDeep,padding: isMobile ? "14px 14px 16px" : "20px 28px 28px"}}>
        <FeatureBadge id="MI-01"/>
        {/* FEATURE: MI-51 — "Agent & Data Info" (renamed from "Activity") relocates here, next to the
            page title, mobile-only — was a small button inside MobileBody's own pane-button row.
            FEATURE: CHI-88 — mobile title chrome goes minimal: the row becomes a flex COLUMN so the
            title owns a full-width single line (19px wrapped "(Beta)" at 375px; 17px does not) and the
            trigger drops its box to become a right-aligned text CTA on its own line below. The
            subtitle leaves the mobile title block entirely — it renders at the top of the
            "Agent & Data Info" overlay instead (CHI_SUBTITLE, one source). Desktop keeps the exact
            side-by-side row, 24px title and inline subtitle it has today. */}
        <div style={{marginBottom: isMobile ? 12 : 18, display:"flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "flex-end", justifyContent:"space-between", gap: isMobile ? 0 : 10}}>
          <div>
            {/* FEATURE: SH-23 */}
            <div style={{fontFamily:display,fontSize: isMobile ? 17 : 24,fontWeight:700,color:T.navy}}>Channel Sales Intelligence{FOCUS_AREA_STATUS.channelSales && <span style={FOCUS_STATUS_STYLE}> ({FOCUS_AREA_STATUS.channelSales})</span>}</div>
            {!isMobile && <div style={{fontFamily:body,fontSize:13,color:T.muted,marginTop:2}}>{CHI_SUBTITLE}</div>}
          </div>
          {isMobile && (
            <button onClick={() => setShowAgentInfo(true)} style={{alignSelf:"flex-end",flexShrink:0,background:"none",border:"none",fontFamily:body,fontSize:12,color:T.brassDeep,whiteSpace:"nowrap",padding:"8px 0 8px 12px",cursor:"pointer"}}>
            Agent &amp; Data Info ›
            </button>
          )}
        </div>
        {isMobile ? (
          <MobileBody
            messages={messages} loading={loading} workingStatus={workingStatus} onSubmit={submit} onReview={onReview} onGoodThanks={onGoodThanks} onClear={onClear}
            hypFlow={hypFlow} qaEvidence={qaEvidence} onIntentChange={onIntentChange} onSelectHypothesis={onSelectHypothesis} onDiscard={onDiscard} onCommit={onCommit} onResolveConfirmation={onResolveConfirmation}
            events={pipelineEvents} agentActivity={agentActivity} showAgentInfo={showAgentInfo} setShowAgentInfo={setShowAgentInfo} onAgentsDrawerOpen={onAgentsDrawerOpen}
            newsCards={newsCards} onAnalyzeNewsCard={analyzeNewsCard} newsCardLoadingUrl={newsCardLoadingUrl} newsCardsStartedAt={newsCardsStartedAt}
            getStep={getStep} hypIsCurrent={hypCurrent}
          />
        ) : (
          <div style={{position:"relative",display:"grid",gridTemplateColumns:"1.15fr 1fr 0.9fr",gap:18,flex:1,minHeight:0}}>
            <FeatureBadge id="MI-02"/>
            {/* FEATURE: CHI-82b — breadcrumb stage arrives pre-filtered (crumbStage, top-level membership filter), replacing CHI-82's raw hypFlow prop */}
            <InteractColumn messages={messages} loading={loading} workingStatus={workingStatus} onSubmit={submit} onReview={onReview} onGoodThanks={onGoodThanks} onClear={onClear} qaEvidence={qaEvidence} crumbStage={crumbStage}/>
            <EvidenceColumn hypFlow={hypFlow} qaEvidence={qaEvidence} onIntentChange={onIntentChange} onSelectHypothesis={onSelectHypothesis} onDiscard={onDiscard} onCommit={onCommit} onResolveConfirmation={onResolveConfirmation} onGoodThanks={onGoodThanks} onReview={onReview} newsCards={newsCards} onAnalyzeNewsCard={analyzeNewsCard} newsCardLoadingUrl={newsCardLoadingUrl} newsCardsStartedAt={newsCardsStartedAt} getStep={getStep} hypIsCurrent={hypCurrent}/>
            <AuditColumn events={pipelineEvents} agentActivity={agentActivity} onAgentsDrawerOpen={onAgentsDrawerOpen}/>
          </div>
        )}
      </div>
    </AppShell>
  );
}
