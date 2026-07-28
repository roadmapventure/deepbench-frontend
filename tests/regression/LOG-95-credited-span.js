// DeepBench v6.3.184 | tests/regression/LOG-95-credited-span.js | LOG-95
// FEATURE: LOG-95 — Category B/C (unit), persisted per SES-009a. Imports the real
// implementation, never a reimplementation.
//
// The rule this locks in (§19p, .claude/rules/hop-event-span-identity.md): a streamed
// delegation-family event's drawer row credits exactly one endpoint's execution, and
// pickCreditedSpan() selects that endpoint's span — delegation_complete rows credit
// toAgentId (to_span_id); delegation and delegation_return rows credit fromAgentId
// (from_span_id). Null-safe; never fabricates identity — an unresolved endpoint stays
// null, never falls back to the other span (a wrong-agent span is worse than a missing
// one). tracePatterns.js stays JSX-free (LOG-83/resolveAgent.js precedent) precisely so
// this test can import it under plain `node`.

import assert from "assert";
import { pickCreditedSpan } from "../../src/lib/tracePatterns.js";

export default async function () {
  // ── Category B — credited-span pick per the §19p identity contract ──
  assert.deepStrictEqual(
    pickCreditedSpan({ type: "delegation_complete", trace_id: "t1", from_span_id: "sA", to_span_id: "sB" }),
    { trace_id: "t1", span_id: "sB" },
    "delegation_complete credits toAgent -> to_span_id"
  );
  assert.deepStrictEqual(
    pickCreditedSpan({ type: "delegation", trace_id: "t1", from_span_id: "sA", to_span_id: null }),
    { trace_id: "t1", span_id: "sA" },
    "delegation credits fromAgent -> from_span_id"
  );
  assert.deepStrictEqual(
    pickCreditedSpan({ type: "delegation_return", trace_id: "t1", from_span_id: "sD", to_span_id: "sP" }),
    { trace_id: "t1", span_id: "sD" },
    "delegation_return credits the returning delegate -> from_span_id"
  );

  // ── Category C — null/absent safety: never fabricates, never throws ──
  assert.deepStrictEqual(pickCreditedSpan({ type: "delegation" }), { trace_id: null, span_id: null });
  assert.deepStrictEqual(pickCreditedSpan(null), { trace_id: null, span_id: null });
  assert.deepStrictEqual(
    pickCreditedSpan({ type: "delegation_complete", trace_id: "t1", from_span_id: "sA" }),
    { trace_id: "t1", span_id: null },
    "unresolved endpoint stays null -- no fallback to the other span"
  );

  // ── Category A — RoutingActivityLine's gate (evt.data?.span_id != null) renders only real identity ──
  const line = (data) => data?.span_id != null;
  assert.strictEqual(line(pickCreditedSpan({ type: "delegation", from_span_id: "s1", trace_id: "t" })), true);
  assert.strictEqual(line(pickCreditedSpan({ type: "delegation", trace_id: "t" })), false);
}
