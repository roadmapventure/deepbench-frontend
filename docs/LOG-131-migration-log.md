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

---

# LOG-132 — the rollup regression, closed (v7.0.311, 2026-08-29)

**Cycle** `58416fef-9ca2-492b-b34c-cb01cc4a6f63` · migration `log132_rollup_signature_split` ·
kickoff `docs/kickoffs/v7.0.311-LOG-132-rollup-signature-split.md`

The follow-up row item 9 assigned above is `LOG-132`, and this is its record. The caveat's own
closing sentence — *"the full-log paths pay for what the point-lookup path gains"* — turned out to
be true of the **shape it shipped in**, not of single-sourcing as such. Both can be had.

## What the section above got right, and the one thing it left implicit

Its root cause is correct and is confirmed rather than restated: the planner does not inline
`log_row_signature()`. The mechanism, named here because *"does not inline"* alone invites the wrong
fix: `inline_function()` refuses any SQL function body containing a **subplan**, and this body has
two — the `sub_calls_chained` and `integration_followed` branches are each an
`EXISTS (SELECT 1 FROM public.ai_activity_log ...)`. So no index and no statistics change helps; the
cost is the opaque per-row invocation itself, and only removing the subplans from the inlined path
removes it.

## Measured before a line changed (2026-08-29T14:5xZ, live)

`anon` carries `statement_timeout=3s`, read from `pg_roles.rolconfig` (`authenticated` is 8 s).

| | |
|---|---|
| `ai_pattern_classification_rollup`, warm | **2,871.986 ms** — 96% of `anon`'s cap, one view alone |
| of which the `sig` CTE's Seq Scan | **1,879.275 ms** over 34,840 rows |
| `ai_activity_log` | 34,840 rows; 12,548 with `span_id`; 5,337 with `parent_span_id` (1,408 distinct) |
| matcher loop | 2,372 distinct signatures × 14 active patterns = 33,208 `pattern_criteria_matches()` |

The caveat above recorded ~1,730 ms with *"headroom ~1.1 s"*; the ticket's own 2026-08-11
re-measurement said 2,202 ms warm / 4,164 ms cold. Warm is now **2,872 ms** — the gap closed by a
further ~670 ms while the ticket waited, and the AI Audit mount issues a **concurrent pair**.

## The fix

`LOG-132` names two directions to *"pick + measure"*. They are not alternatives — **(b) is what
makes (a) legal**, so both shipped: precompute the two span-derived facts once per query, and that
lets the inlinable config half be written directly in the view.

- **`parents`** — `SELECT DISTINCT parent_span_id` where non-null, `LEFT JOIN`ed on `span_id`.
  Equivalent to the `EXISTS` by construction: `c.parent_span_id = l.span_id` can never match a NULL
  on either side, and `DISTINCT` means the join cannot duplicate a row.
- **`base`** — one `WindowAgg`:
  `coalesce(bool_or(flag) OVER (PARTITION BY span_id ORDER BY created_at DESC, id DESC ROWS BETWEEN
  UNBOUNDED PRECEDING AND 1 PRECEDING), false)`. In `DESC` order the preceding frame is exactly the
  set `(t.created_at, t.id) > (l.created_at, l.id)` the `EXISTS` scans. `ai_activity_log.id` is
  `integer` and the primary key, so that ordering is **total** and the `ROWS` frame has no ties to
  mis-handle — checked, not assumed. `bool_or` over an empty frame is NULL; the `coalesce` to
  `false` is what the `EXISTS` returns.
- **`sig`** — the config half written out verbatim, concatenation for concatenation, in the same
  left-associative order as the function body.

`log_row_signature()` itself is **not touched** — no new identity, so
`.claude/rules/supabase-function-signature.md`'s stale-overload hazard cannot arise (asserted at
`count(*) = 1` regardless). `CREATE OR REPLACE` with identical column sets, so both views' grants
survive untouched and no `DROP` is needed.

**`ai_call_patterns` keeps calling the whole function, unchanged.** It reads one row, where the
per-row cost is ~150 ms and irrelevant — and leaving it alone keeps a live caller of the function,
so the two forms cannot diverge unobserved.

### The edit this forbids

Moving the two precomputed facts back **inside** `log_row_signature()` — as lateral joins, say — for
"one home". The function is called per row from `ai_call_patterns` with a single row in hand; a
set-level precompute there would **scan the whole log to answer a point lookup**, which is this
defect inverted. The boundary to keep: **a FUNCTION answers about one row, these VIEWS answer about
all of them.**

Also out of scope deliberately: after the fix the dominant node is the `pattern_criteria_matches()`
nested loop (~640 ms). That is real and will need its own ticket as the pattern count grows. It is
not `LOG-132`'s premise, and chasing it here would put a second unmeasured change behind one
equivalence gate.

## The equivalence gate — run over the whole table before the views were replaced

Not a proxy. The old form and the new expression were computed side by side in one query and
compared with `IS DISTINCT FROM` on every row:

```
rows_compared 34,840 · 0 mismatches · old_distinct 2,372 · new_distinct 2,372
```

The distinct count is what `uniq`/`matched` key on, so it being unmoved is what guarantees the
rollup's grouping cannot shift.

**Asserted again after the swap, on output rather than expressions:** all **13** rollup rows
identical to the retired form on `pattern_slug`, `call_count`, `cost_sum` and a sorted `log_ids`
fingerprint — **0 mismatches**; `reclassification_count` **19,838** both ways; `log_row_signature`
and `pattern_criteria_matches` at exactly **one** overload each; column lists byte-identical on both
views; grants asserted in both directions — `anon`, `authenticated` and `service_role` all still
hold `SELECT` on both (these two views are the browser's own read path and were always public).

## Result

| | Before | After |
|---|---|---|
| `ai_pattern_classification_rollup`, warm | **2,871.986 ms** | **1,312.851 ms** |
| the signature CTE alone | 1,879.275 ms | 385.462 ms (7 ms `parents` + 88 ms `base`) |
| share of `anon`'s 3 s cap | 96% | **43%** |
| plan shape | 34,840 opaque `log_row_signature` calls | no `log_row_signature` node at all |
| rows / patterns / distinct signatures | 34,840 / 14 / 2,372 | unchanged |

Output byte-identical, so no pixel moves and nothing sits behind a flag: `P9 - Bug Fixes` ships
live. Guarded by `tests/regression/LOG-132-rollup-signature-split.js`.
