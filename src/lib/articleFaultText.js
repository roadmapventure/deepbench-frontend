// DeepBench v6.3.216 | src/lib/articleFaultText.js | LOG-109/CHI-91 -- articleFaultText lives in
// its own JSX-free module instead of inline in MarketIntelligenceScreen.jsx (kickoff Task 2a's
// original placement). DEVIATION, per the kickoff's own documented contingency: plain Node cannot
// import a .jsx file at all ("Unknown file extension .jsx", confirmed live this session, not a
// JSX-syntax parse error but a loader-level rejection before any parsing happens) -- same reason
// LOG-83 extracted resolveAgent() out of AIActivityPanel.jsx into resolveAgent.js. Kept here so the
// regression test imports the real implementation rather than a copy of the logic.
// MarketIntelligenceScreen.jsx imports this function; it does not define its own copy.

// FEATURE: LOG-109/CHI-91 -- platform fault copy for a news-card article that could not be read.
// A platform fault report, NOT agent content: .claude/rules/agent-section-rendering.md forbids the
// screen writing copy an AGENT failed to supply; this is DeepBench reporting its own failure, the
// same carve-out MarketIntelligenceScreen.jsx's CREDIT_EXHAUSTED_TEXT already occupies (§19j).
// HAR-15's other half applies too -- the sentence is honest about whether retrying helps, because
// a blocked publisher and an unreadable page fail identically forever while a timeout may not.
// Returns null when there is nothing to report, so the caller renders nothing rather than an empty
// bubble.
export function articleFaultText(primaryFailure) {
  if (!primaryFailure) return null;
  const tail = " Answering from the headline alone.";
  if (primaryFailure.http_status == null) {
    return "This publisher didn't respond in time — retrying may work." + tail;
  }
  if (primaryFailure.extraction_outcome === "empty" || primaryFailure.extraction_outcome === "below_threshold") {
    return "This page had no readable article text — retrying won't help." + tail;
  }
  return "This publisher blocks automated readers — retrying won't help." + tail;
}
