// DeepBench v6.3.204 | tests/regression/LOG-91-single-write.js | LOG-91
// FEATURE: LOG-91 — Category A (unit), persisted per SES-009a.
//
// The rule this locks in: the AI-51 timestamp-pairing heuristic (agent-turn row absorbed by a
// same-agent capability-wrapper row within PAIR_WINDOW_MS) is a LEGACY-WINDOW heuristic only.
// As of v6.3.204 the write path produces exactly one ai_activity_log row per model call (the
// terminal turn's agent-turn row absorbs the wrapper's facts; sendRequest()'s precomputed-path
// write is suppressed), so:
//   1. A pre-cutoff (legacy-era) pair still dedups — the agent-turn half is flagged and the
//      wrapper row classifies include:false when paired.
//   2. The identical row shape at/after PAIR_LEGACY_CUTOFF_MS is NEVER paired — the agent-turn
//      row always counts, and the wrapper row (api/plan.js single-record path) always counts
//      (include: true). Wrongly pairing a fresh wrapper row with an unrelated same-agent turn
//      would zero real spend.
//   3. The write half: logAgentTurn() puts the absorbed wrapper's model-through-dispatch latency
//      in the `dispatch_latency_ms` COLUMN and NEVER in `call_facts`. call_facts is the base of
//      the §19k signature and the Displayer view's performance rests on `SELECT DISTINCT
//      signature` collapsing the table; a per-call millisecond value there makes every row's
//      signature distinct (measured live 2026-07-28: 720 → 24,826) and re-crosses the 3 s anon
//      statement timeout LOG-99 brought back to ~289 ms. This is the one change in LOG-91 that
//      would cause a real regression, and the first implementation attempt made exactly that
//      mistake — hence a real-write-path assertion, not a recreation of the merge rules.
//
// Placeholder Supabase env only so the module graph loads under plain `node`
// (src/lib/supabase.js falls back to process.env); no network call is made here — global fetch
// is intercepted for part 3 and restored before this module returns.

import assert from "assert";

export default async function () {
  if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = "http://localhost:54321";
  if (!process.env.VITE_SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = "regression-placeholder";
  const { pairedAgentTurnIds, classifyRow, PAIR_LEGACY_CUTOFF_MS } =
    await import("../../src/hooks/useAIActivity.js");

  assert.ok(
    Number.isFinite(PAIR_LEGACY_CUTOFF_MS),
    "PAIR_LEGACY_CUTOFF_MS must be a real parsed timestamp"
  );

  const LEGACY = new Date(PAIR_LEGACY_CUTOFF_MS - 86400000).toISOString();          // 1 day pre-cutoff
  const LEGACY2 = new Date(PAIR_LEGACY_CUTOFF_MS - 86400000 + 1000).toISOString();  // +1s, inside PAIR_WINDOW_MS
  const FRESH = new Date(PAIR_LEGACY_CUTOFF_MS + 86400000).toISOString();           // 1 day post-cutoff
  const FRESH2 = new Date(PAIR_LEGACY_CUTOFF_MS + 86400000 + 1000).toISOString();

  const legacyPair = [
    { id: 1, ai_type: "agent-turn", agent_id: "a1", created_at: LEGACY, feature: "channel-intelligence:ci-answer-intent:depth0" },
    { id: 2, ai_type: "channel-intelligence", feature: "request-receivable", agent_id: "a1", created_at: LEGACY2 },
  ];
  const freshPair = [
    { id: 3, ai_type: "agent-turn", agent_id: "a1", created_at: FRESH, feature: "channel-intelligence:ci-answer-intent:depth0" },
    { id: 4, ai_type: "channel-intelligence", feature: "request-receivable", agent_id: "a1", created_at: FRESH2 },
  ];

  // ── 1. Pre-cutoff pair → deduped exactly as AI-51 always did ──
  const pairedLegacy = pairedAgentTurnIds(legacyPair);
  assert.ok(pairedLegacy.has(1), "legacy-era agent-turn half of a pair must be flagged as paired");
  const legacyWrapper = classifyRow(legacyPair[1], new Map([["a1", [new Date(LEGACY).getTime()]]]));
  assert.strictEqual(legacyWrapper.include, false, "legacy-era wrapper row paired with a nearby turn must be excluded");

  // ── 2. Post-cutoff identical shape → NOT paired, both rows counted ──
  const pairedFresh = pairedAgentTurnIds(freshPair);
  assert.ok(!pairedFresh.has(3), "post-cutoff agent-turn row must never be flagged as paired");
  assert.strictEqual(pairedFresh.size, 0, "no post-cutoff row may participate in pairing at all");
  const freshWrapper = classifyRow(freshPair[1], new Map([["a1", [new Date(FRESH).getTime()]]]));
  assert.strictEqual(freshWrapper.include, true, "post-cutoff wrapper row (single-record path) must always count");
  const freshTurn = classifyRow(freshPair[0], new Map());
  assert.strictEqual(freshTurn.include, true, "post-cutoff agent-turn row must always count");

  // ── 3. Real write path: dispatch latency in its own column, never in call_facts ──
  // globalThis.fetch is swapped for a recorder so the actual ai_activity_log POST body is
  // inspected. Restored in `finally` — a sibling regression file (CHI-31) uses the real fetch.
  const realFetch = globalThis.fetch;
  const priorUrl = process.env.SUPABASE_URL;
  const priorKey = process.env.SUPABASE_SERVICE_KEY;
  try {
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_KEY = "regression-placeholder";
    let writes = [];
    globalThis.fetch = async (url, opts) => {
      writes.push(JSON.parse(opts.body));
      return { ok: true, status: 201, json: async () => ({}) };
    };
    const { logAgentTurn } = await import("../../api/capabilities/execute.js");

    const BASE = {
      capability_slug: "channel-intelligence", intent_slug: "ci-answer-intent",
      agent_id: "a1", tenant_id: "global", model: "claude-x", depth: 0,
      latency_ms: 2100, is_delegate_call: false, api_retry_count: 0,
      input_tokens: 10, output_tokens: 20, intent_technical_services: [],
      trace_id: "tr1", tool_calls: ["submit_answer"],
      signatureConfig: { capability_slug: "channel-intelligence", execution_type: "ai" },
    };

    // 3a — terminal turn absorbing the suppressed wrapper row's facts.
    logAgentTurn({
      ...BASE,
      task_id: 77,
      wrapperFacts: {
        task_id: 77, patterns_used: ["rag"],
        call_facts: { rag_chunk_ids_by_section: { s1: ["c1"] } },
        dispatch_latency_ms: 3400,
      },
      dispatchLatencyMs: 3400,
    });
    await new Promise(r => setTimeout(r, 30));
    assert.strictEqual(writes.length, 1, "the merged terminal turn must write exactly one row");
    const merged = writes[0];
    assert.ok(
      !("dispatch_latency_ms" in (merged.call_facts || {})),
      "dispatch_latency_ms must NEVER be a call_facts key — it blows up §19k signature cardinality"
    );
    assert.strictEqual(merged.dispatch_latency_ms, 3400, "dispatch latency must land in its own column");
    assert.strictEqual(merged.latency_ms, 2100, "latency_ms must stay the turn's model-call latency");
    assert.strictEqual(merged.ai_type, "agent-turn", "the surviving row is the agent-turn row");
    assert.strictEqual(merged.feature, "channel-intelligence:ci-answer-intent:depth0", "composite feature preserved");
    assert.strictEqual(merged.task_id, 77, "wrapper's task link must be threaded onto the survivor");
    assert.ok(merged.patterns_used.includes("rag"), "patterns_used must union the wrapper's half");
    assert.ok(merged.call_facts.rag_chunk_ids_by_section, "wrapper's call_facts must survive the merge");
    assert.strictEqual(merged.call_facts.tool_calls[0], "submit_answer", "turn fact-half wins on collision");
    assert.strictEqual(merged.call_facts.capability_slug, "channel-intelligence", "LOG-67 config-half preserved");

    // 3b — every pre-LOG-91 caller is byte-identical: new columns null, call_facts untouched.
    writes = [];
    logAgentTurn({ ...BASE, is_delegate_call: true, tool_calls: ["delegate_to_agent"] });
    await new Promise(r => setTimeout(r, 30));
    const plain = writes[0];
    assert.strictEqual(plain.dispatch_latency_ms, null, "pre-existing callers write dispatch_latency_ms null");
    assert.strictEqual(plain.task_id, null, "pre-existing callers write task_id null");
    assert.deepStrictEqual(
      Object.keys(plain.call_facts).sort(),
      ["capability_slug", "execution_type", "tool_calls"],
      "pre-existing caller call_facts must be fact-half + config-half only"
    );
  } finally {
    globalThis.fetch = realFetch;
    if (priorUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = priorUrl;
    if (priorKey === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = priorKey;
  }
}
