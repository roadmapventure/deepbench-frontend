// DeepBench v6.3.186 | tests/regression/LOG-95b-span-refetch.js | LOG-95b
// FEATURE: LOG-95b — Category B/C (unit), persisted per SES-009a. Imports the real
// implementation, never a reimplementation.
//
// The rule this locks in (§19p read side): streamed rows mount mid-flight (LOG-95), so
// LOG-79's one-shot per-trace cache can freeze before a late execution's log row lands.
// needsSpanRefetch() is the pure bounded-refetch decision: refetch only while the mounted
// row's span is absent from the map AND the retry budget (3) is unspent — then stop,
// honestly unclassified (§19l). Never poll unboundedly; a row with no span identity
// (pre-LOG-49 history) never triggers a refetch.

import assert from "assert";
import { needsSpanRefetch } from "../../src/lib/tracePatterns.js";

export default async function () {
  // ── Category B — refetch decision ──
  assert.strictEqual(needsSpanRefetch({}, "s1", 0), true,  "span missing, tries left -> refetch");
  assert.strictEqual(needsSpanRefetch({ s1: ["Request Routing"] }, "s1", 0), false, "span present -> no refetch");
  assert.strictEqual(needsSpanRefetch({}, "s1", 3), false, "budget exhausted -> honest unclassified, stop");
  assert.strictEqual(needsSpanRefetch({}, "s1", 2), true,  "third try allowed");

  // ── Category C — null/absent safety ──
  assert.strictEqual(needsSpanRefetch({}, null, 0), false, "no span identity -> never refetch (pre-LOG-49 rows)");
  assert.strictEqual(needsSpanRefetch(null, "s1", 0), false, "no map -> no refetch decision");
  assert.strictEqual(needsSpanRefetch({ s1: [] }, "s1", 0), false, "present key (even empty) -> no refetch");
}
