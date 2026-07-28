// DeepBench v6.3.166 | tests/regression/LOG-79-trace-pattern-map.js | LOG-79
// FEATURE: LOG-79 — Category A (unit), persisted per SES-009a.
//
// The rule this locks in: the Agent Routing drawer's per-hop pattern names come from
// buildSpanPatternMap() joining a trace's ai_activity_log rows to the ai_call_patterns
// view's matches — pure, generic, no pattern names/slugs/branches in the helper itself
// (.claude/rules/ai-pattern-signature.md). A span with no view match is ABSENT from the
// map (no empty-array fabrication) — the drawer's honest unclassified state is a missing
// key, never a placeholder. tracePatterns.js is JSX-free (LOG-83/resolveAgent.js
// precedent) precisely so this test can import it under plain `node`.
//
// Asserts:
//   1. Two rows sharing a span, with two view matches, collapse to ONE key carrying both
//      names, deduped, insertion-ordered.
//   2. A row with span_id: null contributes nothing.
//   3. A log row with no view match -> its span is absent from the map (no [] fabricated).
//   4. Empty inputs -> {}.

import assert from "assert";
import { buildSpanPatternMap } from "../../src/lib/tracePatterns.js";

export default async function () {
  // ── 1. Two rows sharing one span, two view matches -> one key, both names, deduped ──
  const map1 = buildSpanPatternMap(
    [
      { id: 101, span_id: "span-a" },
      { id: 102, span_id: "span-a" },
    ],
    [
      { ai_activity_log_id: 101, pattern_name: "Retrieval-Augmented Generation" },
      { ai_activity_log_id: 102, pattern_name: "Agent Handoff" },
      { ai_activity_log_id: 102, pattern_name: "Retrieval-Augmented Generation" }, // dupe across rows
    ]
  );
  assert.deepStrictEqual(Object.keys(map1), ["span-a"], "two rows sharing a span collapse to one key");
  assert.deepStrictEqual(
    map1["span-a"],
    ["Retrieval-Augmented Generation", "Agent Handoff"],
    "both names present, deduped, insertion-ordered"
  );

  // ── 2. A row with span_id: null contributes nothing ──
  const map2 = buildSpanPatternMap(
    [
      { id: 201, span_id: null },
      { id: 202, span_id: "span-b" },
    ],
    [
      { ai_activity_log_id: 201, pattern_name: "Guardrails" },
      { ai_activity_log_id: 202, pattern_name: "Agent Handoff" },
    ]
  );
  assert.strictEqual(Object.keys(map2).length, 1, "null-span row contributes no key");
  assert.deepStrictEqual(map2["span-b"], ["Agent Handoff"], "the real-span row still maps normally");

  // ── 3. A log row with no view match -> its span absent (no empty-array fabrication) ──
  const map3 = buildSpanPatternMap(
    [
      { id: 301, span_id: "span-c" }, // no match in patternRows
      { id: 302, span_id: "span-d" },
    ],
    [{ ai_activity_log_id: 302, pattern_name: "Request Routing" }]
  );
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(map3, "span-c"),
    false,
    "an unmatched span must be ABSENT from the map, never an empty array"
  );
  assert.deepStrictEqual(map3["span-d"], ["Request Routing"], "the matched span still maps");

  // ── 4. Empty inputs -> {} ──
  assert.deepStrictEqual(buildSpanPatternMap([], []), {}, "empty inputs yield an empty map");
}
