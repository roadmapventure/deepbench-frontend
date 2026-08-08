// DeepBench v6.3.208 | tests/regression/LOG-80-by-llm-model-accuracy.js | LOG-80
// FEATURE: LOG-80 — Category A (unit), persisted per SES-009a.
//
// The rule this locks in: the AI Audit "By LLM" drawer shows REAL model names only, each
// model ONCE. Two accuracy fixes are asserted here against computeByLLM() directly:
//   1. A model-less row (row.model IS NULL — the deterministic librarian/directory lookups
//      that Task 1 stopped fabricating as 'claude-haiku-4-5') produces NO By LLM entry: it
//      resolves to "unknown" and is dropped by the claude-/text-embedding- prefix filter.
//   2. A legacy short-form model id folds into its canonical model via MODEL_ID_NORMALIZE
//      instead of splitting into a duplicate row — calls and cost sum across both.
//
// Placeholder Supabase env only so the module graph loads under plain `node`
// (src/lib/supabase.js falls back to process.env); no network call is made here.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";

export default async function run() {
  if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = "http://localhost:54321";
  if (!process.env.VITE_SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = "regression-placeholder";
  const { computeByLLM } = await import("../../src/hooks/useAIActivity.js");

  // ── 1. A null-model row (e.g. an ai_type:'librarian' lookup) yields no By LLM entry ──
  const onlyNull = computeByLLM([
    { type: "librarian", model: null, cost: 0, tokens: 0, latencyMs: 12 },
  ]);
  assert.strictEqual(
    Object.keys(onlyNull).length, 0,
    "a model-less (null) row must not produce any By LLM entry"
  );

  // ── 2. Legacy short-form Haiku folds into the canonical id; calls + cost sum ──
  const haiku = computeByLLM([
    { type: "chat", model: "claude-haiku-4-5",          cost: 0.10, tokens: 100, latencyMs: 200 },
    { type: "chat", model: "claude-haiku-4-5-20251001", cost: 0.25, tokens: 300, latencyMs: 400 },
  ]);
  assert.deepStrictEqual(
    Object.keys(haiku), ["claude-haiku-4-5-20251001"],
    "claude-haiku-4-5 + claude-haiku-4-5-20251001 must collapse to one canonical entry"
  );
  assert.strictEqual(haiku["claude-haiku-4-5-20251001"].calls, 2, "both Haiku calls counted in the merged row");
  assert.ok(
    Math.abs(haiku["claude-haiku-4-5-20251001"].cost - 0.35) < 1e-9,
    "the merged Haiku row sums the cost of both source rows"
  );

  // ── 3. Legacy sonnet-4-5 folds into canonical sonnet-4-6 ──
  const sonnet = computeByLLM([
    { type: "react_loop", model: "claude-sonnet-4-5", cost: 0.5, tokens: 10, latencyMs: 100 },
    { type: "react_loop", model: "claude-sonnet-4-6", cost: 0.5, tokens: 10, latencyMs: 100 },
  ]);
  assert.deepStrictEqual(
    Object.keys(sonnet), ["claude-sonnet-4-6"],
    "claude-sonnet-4-5 + claude-sonnet-4-6 must collapse to one claude-sonnet-4-6 entry"
  );
  assert.strictEqual(sonnet["claude-sonnet-4-6"].calls, 2, "both Sonnet calls counted in the merged row");

  // ── 4. Haiku + Sonnet + text-embedding-3-small + a null row → exactly 3 entries ──
  const mixed = computeByLLM([
    { type: "chat",       model: "claude-haiku-4-5-20251001", cost: 0.1, tokens: 100, latencyMs: 200 },
    { type: "react_loop", model: "claude-sonnet-4-6",         cost: 0.5, tokens: 10,  latencyMs: 100 },
    { type: "similarity", model: "text-embedding-3-small",    cost: 0.0, tokens: 50,  latencyMs: 30  },
    { type: "librarian",  model: null,                        cost: 0.0, tokens: 0,   latencyMs: 12  },
  ]);
  assert.strictEqual(
    Object.values(mixed).length, 3,
    "Haiku + Sonnet + text-embedding-3-small + a null row must yield exactly 3 By LLM entries"
  );
  assert.deepStrictEqual(
    Object.keys(mixed).sort(),
    ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "text-embedding-3-small"],
    "the three entries are exactly the three real models — the null row drops out"
  );
}

selfRun(import.meta.url, run);
