# LOG-131 migration record — `ai_call_patterns` per-row pushdown

**Session:** `S-LOG-131` (v7.0.83) · **Applied:** 2026-08-10 10:30 CST · **Project:** `rallojeqnkgtxgsdsnqm`

Two migrations, applied in order. Zero frontend changes — `src/lib/tracePatterns.js` is byte-identical.

| # | Migration name | Contents |
|---|---|---|
| 1 | `log131_log_row_signature_fn` | `public.log_row_signature(public.ai_activity_log) RETURNS jsonb`, `LANGUAGE sql STABLE`; `GRANT EXECUTE` to `anon, authenticated, service_role` |
| 2 | `log131_pattern_views_pushdown` | `CREATE OR REPLACE VIEW` × 3 — rollups first (dedup carried internally), then `ai_call_patterns` as a per-row `LATERAL` |

Pre-flight: the live `pg_get_viewdef('ai_call_patterns')` matched the kickoff's transcription of the
§19k signature expression exactly (`~~` is `LIKE`; the `OR … AND` precedence in the
`sub_calls_chained` branch matches the parenthesized form). One `log_row_signature` overload exists.

## Pre-migration baseline

`ai_activity_log` 33,871 rows · `ai_call_patterns` 10,720 rows · 9 rows for the 11 failing IDs ·
`reclassification_count` 26,902 · 2,315 distinct signatures · 7 patterns.

## Task 2 probes (run BEFORE any view was replaced)

| Probe | Result |
|---|---|
| A — per-row shape ≡ current view (pair-level, full log) | `new_not_old = 0`, `old_not_new = 0` |
| B — rollup equality (`call_count`, `cost_sum`, sorted `log_ids`) | `new_not_old = 0`, `old_not_new = 0`; 7 patterns, 10,720 total calls |
| C — reclassification count equality | `new_count = 26902`, `old_count = 26902` |

## Post-swap verification

**1. EXPLAIN on the exact 11 failing IDs — both PASS criteria met:**

```
Nested Loop  (actual time=5.197..11.929 rows=9 loops=1)
  ->  Index Scan using ai_activity_log_pkey on ai_activity_log l  (actual rows=11 loops=7)
        Index Cond: (id = ANY ('{37447,...,37450}'::integer[]))
Execution Time: 13.443 ms
```

`Index Cond` on `ai_activity_log_pkey` present; no full-log CTE scan for signature assembly.
**757 ms → 13 ms**, 9 rows (unchanged).

**2. Rollup timings (admin role, warm):**

| View | Pre-swap | Post-swap |
|---|---|---|
| `ai_pattern_classification_rollup` | 813 ms | **1,735 ms** |
| `ai_pattern_reclassification_count` | 798 ms | **1,749 ms** |

Confirmed without EXPLAIN instrumentation (1,727 ms) — not a profiling artifact. See the caveat below.

**3. Re-probes against the live swapped views:** live rollup ≡ the pre-migration baseline captured
before Task 3 (`live_not_baseline = 0`, `baseline_not_live = 0`, including md5 of sorted `log_ids`);
`ai_call_patterns` 10,720 rows; 9 rows for the 11 IDs; `reclassification_count` 26,902. All unchanged.

**4. Structure/grants unchanged:** column lists byte-identical (names, types, ordinal positions) on
all three views; `pg_class.relacl` and `reloptions` identical to the pre-migration capture.

**5. Node test** (`test-S-LOG-131.mjs`, anon key, browser parity) — `ALL TESTS PASS`:
point lookup 150 ms; three concurrent lookups 105/248/312 ms; rollup 1,851 ms; reclassification
1,720 ms; all 200. `npm run build` passes.

## Caveat for the parent session — rollup regression (Manual QA item 9)

The two rollup views got **~2.1× slower** (≈810 ms → ≈1,730 ms admin; 1,851 ms / 1,720 ms as anon).
They still return correct values and still clear the 3 s anon cap, but headroom dropped from ~2.2 s
to ~1.1 s. This crosses the kickoff's own 1.5 s threshold, so **Manual QA item 9 applies: file a
follow-up growth row.**

**Root cause (from the plan diff, not inference):** the planner does **not inline**
`log_row_signature()`. Pre-swap the `sig` seq scan carried `SubPlan 2` (the `parent_span_id` EXISTS,
hashed and evaluated once) and `SubPlan 3` (the `span_id` EXISTS via `ai_activity_log_span_id_idx`,
12,002 loops). Post-swap those SubPlan nodes are absent — the seq-scan cost estimate collapses from
189,236 to 11,068 because the function is an opaque black box, and each of the 33,871 rows pays a
real function invocation instead of sharing the whole-query SubPlan optimization.

This is inherent to single-sourcing the expression into a function (the approved design): the
full-log paths pay for what the point-lookup path gains. The point-lookup win is the beta-gate fix
and is enormous (757 ms → 13 ms); the rollup cost is the price. Not remediated here — Section 7
forbids improvising a variant migration, and item 9 assigns the call to the parent design session.
