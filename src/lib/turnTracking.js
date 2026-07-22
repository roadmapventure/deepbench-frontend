// DeepBench v6.3.120 | src/lib/turnTracking.js | new file
// FEATURE: CHI-56 — single shared service for hop-duration resolution and transaction-boundary
// events, replacing the ad-hoc Date.now()/buildHopEvent pattern duplicated across submit(),
// onGoodThanks, onReview, and the theory/forecast flows (Architect Review: confirmed no prior
// shared implementation exists). Pure functions only -- no React state, no imports from the
// screen file. MarketIntelligenceScreen.jsx (and, in Session 2, every other flow) calls through
// these instead of hand-rolling duration logic per call site.

// The one true exception: a client-inserted divider marker with no agent work behind it, already
// excluded from hop numbering (groupEventsIntoHops's isBoundary). Every other event type must
// resolve to a real number -- confirmed with John, "a hop is an instance that has work and time,
// no matter how brief."
export const NON_MEASURABLE_EVENT_TYPES = new Set(["question_boundary"]);

// FEATURE: CHI-56 -- delegation-family events arrive as live SSE progress ticks (onDelegationProgress).
// Each has a real client-side arrival moment; duration is the delta between this event's arrival
// and the previous event's arrival within the same pipeline. lastEventAt is the caller's own
// running timestamp (a ref, updated after every resolution call) -- this function is pure, it
// takes the previous timestamp as an argument rather than tracking one itself.
export function resolveDelegationDuration(nowMs, lastEventAtMs) {
  if (lastEventAtMs == null) return null; // first event in a pipeline has no prior tick to diff against
  return Math.max(0, nowMs - lastEventAtMs);
}

// FEATURE: CHI-56 -- agent_selection/failure_triage are sub-fields extracted from inside a single
// non-streaming response that already has its own measured total duration (the sibling
// display_format/proofreader event in the same hop). Confirmed with John: attribute that same
// parent-call duration -- a real, honestly-measured number, not fabricated, just not
// independently sub-measured (the harness doesn't time sub-steps internally).
export function resolveEmbeddedDuration(parentCallDurationMs) {
  return parentCallDurationMs ?? null;
}

// FEATURE: CHI-56 -- central dispatcher so call sites don't need to know which of the 2 rules
// above applies to which event type; they just call resolveEventDuration(type, ...).
export function resolveEventDuration(type, { nowMs, lastEventAtMs, parentCallDurationMs } = {}) {
  if (NON_MEASURABLE_EVENT_TYPES.has(type)) return null;
  if (type === "delegation" || type === "delegation_return" || type === "delegation_complete") {
    return resolveDelegationDuration(nowMs, lastEventAtMs);
  }
  if (type === "agent_selection" || type === "failure_triage") {
    return resolveEmbeddedDuration(parentCallDurationMs);
  }
  return undefined; // caller-measured types (qa_answer, proofreader, etc.) already pass a real value directly -- this function is never consulted for those, this branch exists only as an explicit "not handled here" signal if it's ever called by mistake
}

// FEATURE: CHI-56 -- builds a transaction-boundary event. `kind` is "start" (existing
// question_boundary behavior, unchanged trigger point -- only a genuinely new typed/example
// question, never a follow-up action) or "complete" (new -- fired from a flow's own terminal
// action, e.g. onGoodThanks). Both render via QuestionDivider/a new sibling component in
// MarketIntelligenceScreen.jsx (Task 4) -- this function only builds the event object, it does
// not render anything.
export function buildTransactionBoundaryEvent(kind, timestamp) {
  return { type: kind === "start" ? "question_boundary" : "transaction_complete", agentId: null, data: { timestamp }, durationMs: null };
}

// FEATURE: CHI-56 -- End status needs both the real elapsed time and the estimate that was live
// when the turn started, so John can see whether the system's own estimates are accurate.
// `expectation` is the already-formatted string workingStatus.expectation carries (e.g.
// "expect > 40s") -- snapshotted by the caller at turn-start, passed through untouched; this
// function does no reformatting, it only decides whether there's anything to show.
export function buildEndStatusEstimate(expectation) {
  return expectation || null;
}
