// DeepBench v7.0.154 | tests/regression/LOG-70-agent-summary-column-set.js | LOG-70
// FEATURE: LOG-70 — Category M (cross-reference consistency), persisted per SES-009a.
//
// The rule this locks in (.claude/rules/ai-pattern-signature.md, ARCHITECTURE.md §19k/§19l):
// `patterns_used` is frozen legacy. A display never reads it, and — the part this test adds —
// a query never FETCHES it either once nothing downstream reads it.
//
// The gap this closes, stated precisely, because it is the whole reason the line survived:
// LOG-112 (v6.3.218) rewrote buildActivitySummary() to stop reading row.patterns_used, and
// shipped tests/regression/LOG-112-drawer-pattern-source.js to hold that. But that test's
// scan roots are ["src/screens", "src/components"] only. src/hooks/useAgents.js —
// buildActivitySummary()'s OTHER caller — kept `patterns_used` in its .select() column list,
// outside the scanned tree, and so kept paying for a column nothing read on every page of
// every agent-activity query. LOG-70 named it as one of its two remaining consumers.
//
// Asserts:
//   1. src/hooks/useAgents.js contains no `patterns_used` reference in CODE (comments stripped,
//      the same approach LOG-36-pattern-display-sources.js and LOG-112 use). This is the
//      anti-regression heart: it fails the moment someone re-adds the column here.
//   2. BEHAVIOURAL, and the reason assertion 1 is safe rather than merely tidy:
//      buildActivitySummary() — the real implementation, never a reimplementation — returns a
//      deep-equal summary whether or not the rows carry patterns_used.
//   3. NEGATIVE CONTROL, so assertion 2 cannot pass vacuously: dropping a column that IS read
//      (latency_ms) must CHANGE the same comparison. Without this, assertion 2 would also pass
//      against a buildActivitySummary() that ignored its input entirely.
//
// Deliberately NOT asserted here: that src/hooks/useAIActivity.js is free of `patterns_used`.
// It is not, legitimately — logAICall() still WRITES the field (AA-44) and the AI Audit's own
// raw row fetch still carries it for display of the stored value. Those are the write path and
// a verbatim echo, not pattern classification. Widening this test to that file would fail on
// correct code; LOG-70's remaining consumer is src/aiPatterns.js, which is a separate design
// question (static AI_PAT badge labels across 8 screens), not a column-set cleanup.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const TARGET = "src/hooks/useAgents.js";

// Strip block and line comments so a comment EXPLAINING the removal (there is one, and it names
// the field) is never mistaken for a re-introduction. Same technique as LOG-36 / LOG-112.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

async function run() {
  // ---- Assertion 1: the column is gone from the query, in code, not just in a comment.
  const full = path.join(ROOT, TARGET);
  assert.ok(fs.existsSync(full), `${TARGET} not found — has the hook moved?`);

  const code = stripComments(fs.readFileSync(full, "utf8"));
  const offenders = code
    .split("\n")
    .map((line, i) => ({ line: line.trim(), n: i + 1 }))
    .filter(({ line }) => line.includes("patterns_used"));

  assert.strictEqual(
    offenders.length, 0,
    `${TARGET} references patterns_used in code. The field is frozen legacy and nothing on this ` +
    "path reads it since LOG-112 (v6.3.218) — fetching it costs payload on every page of every " +
    "agent-activity query and buys nothing (.claude/rules/ai-pattern-signature.md). " +
    "Offending lines:\n  " + offenders.map(o => `${o.n}: ${o.line}`).join("\n  ")
  );

  // Placeholder Supabase env only so the module graph loads under plain `node`
  // (src/lib/supabase.js falls back to process.env); no network call is made here.
  if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = "http://localhost:54321";
  if (!process.env.VITE_SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = "regression-placeholder";
  const { buildActivitySummary } = await import("../../src/hooks/useAIActivity.js");

  // Fixture rows in the shape useAgentActivitySummary() actually fetches. patterns_used is
  // deliberately POPULATED on every row and must influence nothing. Timestamps sit before
  // PAIR_LEGACY_CUTOFF_MS so the AI-51 wrapper/agent-turn pairing heuristic is in force —
  // the same choice LOG-112's fixtures make, so both tests exercise the same code region.
  const M = "claude-haiku-4-5-20251001";
  const T0 = Date.parse("2026-07-10T12:00:00Z");
  const at = ms => new Date(T0 + ms).toISOString();
  const rows = [
    { id: 1, agent_id: "eleanor", ai_type: "librarian", feature: "librarian", model: null,
      created_at: at(0), latency_ms: 12, cost_usd: null, input_tokens: null, output_tokens: null,
      patterns_used: ["rag"] },
    { id: 2, agent_id: "eleanor", ai_type: "agent-turn",
      feature: "data-room-custody:library-catalog-intent:depth1", model: M,
      created_at: at(9e5), latency_ms: 800, cost_usd: 0.02, input_tokens: 100, output_tokens: 50,
      patterns_used: ["rag", "tool-use"] },
    { id: 3, agent_id: "nadia", ai_type: "agent-turn",
      feature: "data-patch:data-patch-execute-intent:depth2", model: M,
      created_at: at(18e5), latency_ms: 1500, cost_usd: 0.04, input_tokens: 220, output_tokens: 90,
      patterns_used: ["structured-output"] },
    { id: 4, agent_id: "nadia", ai_type: "chat", feature: "chat", model: M,
      created_at: at(27e5), latency_ms: 640, cost_usd: 0.01, input_tokens: 60, output_tokens: 30,
      patterns_used: [] },
  ];

  const turnTimestampsByAgent = new Map();
  for (const r of rows) {
    if (r.ai_type !== "agent-turn") continue;
    if (!turnTimestampsByAgent.has(r.agent_id)) turnTimestampsByAgent.set(r.agent_id, []);
    turnTimestampsByAgent.get(r.agent_id).push(new Date(r.created_at).getTime());
  }

  const without = key => rows.map(({ [key]: _dropped, ...rest }) => rest);

  // ---- Assertion 2: the column contributes nothing to the summary.
  const withCol = buildActivitySummary(rows, turnTimestampsByAgent);
  const noPatterns = buildActivitySummary(without("patterns_used"), turnTimestampsByAgent);

  assert.ok(Object.keys(withCol).length > 0, "fixture produced an empty summary — the test would be vacuous");
  assert.deepStrictEqual(
    withCol, noPatterns,
    "buildActivitySummary() produced a DIFFERENT summary once patterns_used was removed from the " +
    "rows, so the column is still load-bearing on this path and useAgents.js must keep selecting " +
    "it. Re-open LOG-70 before changing the query."
  );

  // ---- Assertion 3: negative control. A column that IS read must change the same comparison.
  const noLatency = buildActivitySummary(without("latency_ms"), turnTimestampsByAgent);
  assert.notDeepStrictEqual(
    withCol, noLatency,
    "NEGATIVE CONTROL FAILED: dropping latency_ms — a column buildActivitySummary() demonstrably " +
    "reads — changed nothing, so assertion 2's deep-equal cannot distinguish a dead column from a " +
    "summary that ignores its input. Fix this control before trusting assertion 2."
  );
}

selfRun(import.meta.url, run);
export default run;
