// DeepBench v6.3.211 | tests/regression/CHI-90-drawer-call-semantics.js | CHI-90
// FEATURE: CHI-90 — Category M (cross-reference consistency), persisted per SES-009a.
//
// The rule this locks in: the CHI Agents drawer and the AI Audit screen's By Agent list
// resolve "a call" the SAME way — a real model call, not a logged operation.
//
// They disagreed before this session. LOG-81 (v6.3.203) redefined a countable call for AI
// Audit but deliberately left the LOG-21 shared aggregation core alone: AI Audit's
// byAgent.calls is computed OUTSIDE that core (countableCallsByAgent) and discards the
// core's own `.calls`, so it never felt the difference. The CHI drawer renders the core's
// `.calls` directly, so it alone kept operations semantics — deterministic Librarian reads
// and agent-directory lookups inflated its number by thousands.
//
// buildActivitySummary() now gates `.calls` with the same exported isCountableCall()
// predicate AI Audit uses, and keeps the old raw every-row count as `.operations`. That
// second field is not cosmetic: the drawer's active/"not yet used on this screen" split
// keys on it, so an agent whose whole contribution is deterministic still reads as active
// while honestly showing 0 model calls.
//
// Assertion 5 is the anti-drift lock — it re-derives the expected count by filtering the
// same fixture rows through isCountableCall() itself, so the two surfaces cannot be pulled
// apart again without reddening this file. Both the predicate and the pairing helper are
// imported from the real implementation; nothing here reimplements them.
//
// Placeholder Supabase env only so the module graph loads under plain `node`
// (src/lib/supabase.js falls back to process.env); no network call is made here.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";

export default async function run() {
  if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = "http://localhost:54321";
  if (!process.env.VITE_SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = "regression-placeholder";
  const {
    buildActivitySummary,
    isCountableCall,
    pairedAgentTurnIds,
    PAIR_WINDOW_MS,
    PAIR_LEGACY_CUTOFF_MS,
  } = await import("../../src/hooks/useAIActivity.js");

  const M = "claude-haiku-4-5-20251001";
  // Anchored to the real exported cutoff rather than a literal date, so this fixture stays
  // inside the AI-51 legacy pairing window no matter when the suite runs (LOG-91 scoped the
  // heuristic to pre-cutoff rows only — a post-cutoff pair would legitimately not pair).
  const T0 = PAIR_LEGACY_CUTOFF_MS - 86_400_000; // one day before the cutoff
  const at = ms => new Date(T0 + ms).toISOString();
  // Comfortably inside PAIR_WINDOW_MS, derived from the constant so a future window change
  // cannot silently turn the "paired dup" fixture below into two unpaired rows.
  const PAIR_GAP = Math.floor(PAIR_WINDOW_MS / 4);

  const rows = [
    // eleanor — 2 deterministic library reads (no model) + 1 real model call
    { id: 1, agent_id: "eleanor", ai_type: "librarian",  feature: "librarian",           model: null, created_at: at(0),   latency_ms: 12,  cost_usd: null },
    { id: 2, agent_id: "eleanor", ai_type: "librarian",  feature: "librarian",           model: null, created_at: at(50),  latency_ms: 9,   cost_usd: null },
    { id: 3, agent_id: "eleanor", ai_type: "agent-turn", feature: "data-room-custody:x", model: M,    created_at: at(9e5), latency_ms: 800, cost_usd: 0.02 },
    // marcus — one terminal turn logged twice: capability wrapper + agent-turn within PAIR_WINDOW_MS
    { id: 4, agent_id: "marcus",  ai_type: "channel-intelligence", feature: "request-receivable",     model: M, created_at: at(0),         latency_ms: 900, cost_usd: 0.05 },
    { id: 5, agent_id: "marcus",  ai_type: "agent-turn",           feature: "channel-intelligence:a", model: M, created_at: at(PAIR_GAP),  latency_ms: 900, cost_usd: 0.05 },
    // michelle — agent-directory lookups only: an entirely deterministic contributor
    { id: 6, agent_id: "michelle", ai_type: "agent-directory", feature: "agent-directory", model: null, created_at: at(0),  latency_ms: 5, cost_usd: null },
    { id: 7, agent_id: "michelle", ai_type: "agent-directory", feature: "agent-directory", model: null, created_at: at(30), latency_ms: 6, cost_usd: null },
  ];

  const turnTimestampsByAgent = new Map();
  for (const r of rows) {
    if (r.ai_type !== "agent-turn") continue;
    if (!turnTimestampsByAgent.has(r.agent_id)) turnTimestampsByAgent.set(r.agent_id, []);
    turnTimestampsByAgent.get(r.agent_id).push(new Date(r.created_at).getTime());
  }

  const summary = buildActivitySummary(rows, turnTimestampsByAgent);

  // ── 1. A null-model row increments operations but never calls ──
  assert.strictEqual(
    summary.eleanor.operations, 3,
    "operations must count every logged row, deterministic ones included"
  );
  assert.strictEqual(
    summary.eleanor.calls, 1,
    "calls must exclude the 2 model-less librarian reads — only the real model call counts"
  );

  // ── 2. A model row increments both ──
  const modelOnly = buildActivitySummary(
    [{ id: 10, agent_id: "solo", ai_type: "agent-turn", feature: "x:y", model: M, created_at: at(0), latency_ms: 100, cost_usd: 0.01 }],
    new Map([["solo", [T0]]])
  );
  assert.strictEqual(modelOnly.solo.operations, 1, "a real model call counts as an operation");
  assert.strictEqual(modelOnly.solo.calls, 1, "a real model call also counts as a call");

  // ── 3. A paired agent-turn duplicate half is an operation but not a second call ──
  assert.strictEqual(
    summary.marcus.operations, 2,
    "both halves of the AI-51 pair are real logged rows and count as operations"
  );
  assert.strictEqual(
    summary.marcus.calls, 1,
    "the duplicate agent-turn half must not double-count — one model call, counted once"
  );

  // ── 4. An agent with ONLY null-model rows still gets an entry, active but call-less ──
  //    This is the Task 2 guarantee: the drawer's active/potential split reads .operations,
  //    so a wholly deterministic contributor is never mislabelled "not yet used on this screen".
  assert.ok(summary.michelle, "a wholly deterministic agent must still get a summary entry");
  assert.ok(
    summary.michelle.operations > 0,
    "a wholly deterministic agent must report operations > 0 so the drawer renders it as active"
  );
  assert.strictEqual(
    summary.michelle.calls, 0,
    "a wholly deterministic agent honestly reports 0 model calls"
  );

  // ── 5. THE ANTI-DRIFT LOCK: the drawer's calls === AI Audit's isCountableCall filter ──
  //    pairedAgentTurnIds() is the same per-row pairing source hydrateFromSupabase() uses to
  //    stamp isPairedDup for AI Audit's entries, so this compares the two surfaces' real math.
  const paired = pairedAgentTurnIds(rows);
  assert.ok(paired.has(5), "fixture sanity: the agent-turn half of the marcus pair must be paired");
  for (const agentId of ["eleanor", "marcus", "michelle"]) {
    const expected = rows
      .filter(r => r.agent_id === agentId)
      .filter(r => isCountableCall({ model: r.model, isPairedDup: paired.has(r.id) }))
      .length;
    assert.strictEqual(
      summary[agentId].calls, expected,
      `${agentId}: the CHI drawer's calls must equal the isCountableCall count AI Audit's By Agent uses`
    );
  }

  // ── 6. The rest of the shared core is untouched — byKind still sees deterministic rows ──
  //    (latency visibility is deliberately NOT gated; byPattern is out of scope per LOG-112)
  assert.strictEqual(
    summary.eleanor.byKind?.librarian?.calls ?? 0, 2,
    "byKind must still count both library reads — only the agent-level `calls` field is gated"
  );
  assert.ok(
    Math.abs(summary.eleanor.avgCost - 0.02) < 1e-9,
    "avgCost is unchanged by this session: model-less rows never entered costCount"
  );
  assert.strictEqual(
    summary.michelle.avgCost, null,
    "an agent with no priced rows still reports a null avgCost, not 0"
  );
}

selfRun(import.meta.url, run);
