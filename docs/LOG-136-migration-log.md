# LOG-136 migration record — `pattern_criteria_matches()` dotted-path traversal

**Session:** `S-LOG-136` (v7.0.87) · **Applied:** 2026-08-10 · **Project:** `rallojeqnkgtxgsdsnqm`

One migration. Zero frontend changes, zero `api/` changes — one Postgres function body, same name/args/return, replaced in place. Fixes the defect isolated live across `S-LOG-135` rounds 1–2 (`docs/harvests/LOG-135.md`): the criteria grammar's validator allowlists dotted signature-field keys (`traits.schema`, `traits.source`, `traits.intent_allowlist`) but the matcher resolved every criteria key with a flat `sig -> k` lookup, so a dotted key could pass validation and still never match at read time — and the semantically-equivalent nested form that *did* match was rejected by the validator. Neither expressible criteria shape cleared both gates. This migration fixes the matcher side only; the validator grammar (`lib/pattern-vocabulary.js`) is untouched, exactly as the kickoff specified.

**Current function body read fresh in Step 0** (not worked from the kickoff's paraphrase) — confirmed identical to `S-LOG-135`'s own isolation of it:
```sql
CREATE OR REPLACE FUNCTION public.pattern_criteria_matches(sig jsonb, crit jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare k text; v jsonb; sval jsonb;
begin
  if crit is null then return false; end if;
  for k, v in select key, value from jsonb_each(crit) loop
    sval := sig -> k;
    if jsonb_typeof(v) = 'object' and v ? 'in' then
      if sval is null then return false; end if;
      if jsonb_typeof(sval) = 'array' then
        if not exists (
          select 1 from jsonb_array_elements(sval) e
          where e in (select jsonb_array_elements(v->'in'))
        ) then return false; end if;
      else
        if not (sval in (select jsonb_array_elements(v->'in'))) then return false; end if;
      end if;
    elsif jsonb_typeof(v) = 'object' and v ? '>' then
      if sval is null then return false; end if;
      if jsonb_typeof(sval) = 'array' then
        if not (jsonb_array_length(sval) > (v->>'>')::numeric) then return false; end if;
      else
        if not ((sval#>>'{}')::numeric > (v->>'>')::numeric) then return false; end if;
      end if;
    else
      if not (sig @> jsonb_build_object(k, v)) then return false; end if;
    end if;
  end loop;
  return true;
end;
$function$
```

## Pre-migration baseline (Task 1)

**Single-function assertion, before:**
```sql
SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname='pattern_criteria_matches' AND n.nspname='public';
```
Result: **1**.

**Per-pattern match counts (baseline):**
```sql
SELECT pattern_slug, count(*) FROM ai_call_patterns GROUP BY 1 ORDER BY 1;
```
| pattern_slug | count |
|---|---|
| brokered-delegation | 1483 |
| evaluator-optimizer | 128 |
| handoff | 903 |
| orchestrator-workers | 499 |
| output-guardrails | 1933 |
| prompt-chaining | 1044 |
| request-routing | 3523 |
| retrieval-augmented-generation | 2819 |

Total: `SELECT count(*) FROM ai_call_patterns` → **12332** (sums to the per-pattern total exactly — one match per row, no double-counting).

**5-row emission count (baseline):**
```sql
SELECT count(*) FROM ai_call_patterns WHERE ai_activity_log_id IN (37603,37640,37644,37670,37682);
```
Result: **0** (matches `LOG-135`'s own recorded before-state — no drift between sessions).

**Point-lookup plan + timing (baseline):**
```sql
EXPLAIN ANALYZE SELECT * FROM ai_call_patterns WHERE ai_activity_log_id = 37603;
```
```
Nested Loop  (cost=0.29..15.25 rows=1 width=412) (actual time=3.725..3.725 rows=0 loops=1)
  Join Filter: pattern_criteria_matches(log_row_signature(l.*), pv.criteria)
  Rows Removed by Join Filter: 9
  ->  Index Scan using ai_activity_log_pkey on ai_activity_log l  (cost=0.29..2.51 rows=1 width=726) (actual time=0.032..0.033 rows=1 loops=1)
        Index Cond: (id = 37603)
  ->  Seq Scan on pattern_vocabulary pv  (cost=0.00..12.23 rows=1 width=426) (actual time=0.029..0.095 rows=9 loops=1)
        Filter: ((criteria IS NOT NULL) AND (superseded_by IS NULL))
        Rows Removed by Filter: 19
Planning Time: 6.212 ms
Execution Time: 3.920 ms
```
`Index Cond: (id = 37603)` on `ai_activity_log_pkey` present — the LOG-131 pkey pushdown shape holds (row 37603 matched zero patterns pre-fix, hence `rows=0`, but the scan shape is what this proof is about).

## Task 2 — the migration

Applied via `apply_migration`, name `log136_criteria_dotted_path`. Identical identity argument list (`sig jsonb, crit jsonb`) — an in-place replace, not a new overload; asserted below. Exactly two edits from the body read fresh in Step 0:

```sql
CREATE OR REPLACE FUNCTION public.pattern_criteria_matches(sig jsonb, crit jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare k text; v jsonb; sval jsonb;
begin
  if crit is null then return false; end if;
  for k, v in select key, value from jsonb_each(crit) loop
    if strpos(k, '.') > 0 then
      sval := sig #> string_to_array(k, '.');
    else
      sval := sig -> k;
    end if;
    if jsonb_typeof(v) = 'object' and v ? 'in' then
      if sval is null then return false; end if;
      if jsonb_typeof(sval) = 'array' then
        if not exists (
          select 1 from jsonb_array_elements(sval) e
          where e in (select jsonb_array_elements(v->'in'))
        ) then return false; end if;
      else
        if not (sval in (select jsonb_array_elements(v->'in'))) then return false; end if;
      end if;
    elsif jsonb_typeof(v) = 'object' and v ? '>' then
      if sval is null then return false; end if;
      if jsonb_typeof(sval) = 'array' then
        if not (jsonb_array_length(sval) > (v->>'>')::numeric) then return false; end if;
      else
        if not ((sval#>>'{}')::numeric > (v->>'>')::numeric) then return false; end if;
      end if;
    else
      if sval is null then return false; end if;
      if not (sval @> v) then return false; end if;
    end if;
  end loop;
  return true;
end;
$function$;
```

Edit 1: key resolution is now path-aware (`strpos(k, '.') > 0` branches to `sig #> string_to_array(k, '.')`, otherwise the original flat `sig -> k`). Edit 2: the final else-branch now uses the resolved `sval` (`if sval is null then return false; end if; if not (sval @> v) then return false; end if;`) instead of re-deriving containment from `sig` directly, so dotted keys work there too. `"in"`/`">"` branches unchanged — they already read `sval`, so they inherit the path-aware resolution automatically. Function stays `plpgsql`/`IMMUTABLE`, same name/args/return.

## Task 3 — post-change proofs (all five green)

**1. Single-function assertion, after:**
```sql
SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname='pattern_criteria_matches' AND n.nspname='public';
```
Result: **1** — exactly one function remains, confirmed in-place replace, no overload.

**2. Equality sweep — the LOG-131 discipline:**
```sql
SELECT pattern_slug, count(*) FROM ai_call_patterns GROUP BY 1 ORDER BY 1;
```
| pattern_slug | count | vs. baseline |
|---|---|---|
| brokered-delegation | 1483 | byte-identical |
| evaluator-optimizer | 128 | byte-identical |
| **function-calling** | **585** | **new — the fix landing** |
| handoff | 903 | byte-identical |
| orchestrator-workers | 499 | byte-identical |
| output-guardrails | 1933 | byte-identical |
| prompt-chaining | 1044 | byte-identical |
| request-routing | 3523 | byte-identical |
| retrieval-augmented-generation | 2819 | byte-identical |

Total: **12917** = baseline `12332` + `585` (the new `function-calling` count) exactly. The diff is EXACTLY `function-calling` appearing — every one of the other 8 pre-existing patterns' counts is byte-identical to baseline, confirmed by direct per-row comparison above (no re-run needed to explain a delta; there wasn't one). **Equality sweep: PASS, byte-identical to baseline on every pattern other than the one this migration was meant to activate.**

**3. The blocked case lands:**
```sql
SELECT ai_activity_log_id, pattern_name FROM ai_call_patterns WHERE ai_activity_log_id IN (37603,37640,37644,37670,37682) ORDER BY ai_activity_log_id;
```
| ai_activity_log_id | pattern_name |
|---|---|
| 37603 | Function Calling |
| 37640 | Function Calling |
| 37644 | Function Calling |
| 37670 | Function Calling |
| 37682 | Function Calling |

All 5 of `LOG-135`'s named emission rows now classify. Spot-check against her actually-stored criteria (not a hand-copied re-derivation):
```sql
SELECT pattern_criteria_matches(log_row_signature(l.*), (SELECT criteria FROM pattern_vocabulary WHERE pattern_slug='function-calling')) FROM ai_activity_log l WHERE l.id = 37603;
```
Result: **true**.

**4. Both prior defect directions retested, same call:**
```sql
SELECT
  pattern_criteria_matches(log_row_signature(l.*), '{"traits.schema":true}'::jsonb) AS dotted_now_matches,          -- true
  pattern_criteria_matches(log_row_signature(l.*), '{"execution_type":"ai"}'::jsonb) AS flat_key_regression_guard   -- true
FROM ai_activity_log l WHERE l.id = 37603;
```
Result: `dotted_now_matches = true` (the exact dotted key that matched zero rows in `LOG-135` now resolves correctly via `sig #> string_to_array('traits.schema', '.')`); `flat_key_regression_guard = true` (a plain non-dotted key, `execution_type`, still matches exactly as before the migration — the flat-lookup path for ordinary keys is untouched). Both defect directions closed, no regression on the unchanged path.

**5. Plan shape — LOG-131 non-regression:**
```sql
EXPLAIN ANALYZE SELECT * FROM ai_call_patterns WHERE ai_activity_log_id = 37603;
```
```
Nested Loop  (cost=0.29..15.25 rows=1 width=412) (actual time=2.940..3.491 rows=1 loops=1)
  Join Filter: pattern_criteria_matches(log_row_signature(l.*), pv.criteria)
  Rows Removed by Join Filter: 8
  ->  Index Scan using ai_activity_log_pkey on ai_activity_log l  (cost=0.29..2.51 rows=1 width=726) (actual time=0.025..0.026 rows=1 loops=1)
        Index Cond: (id = 37603)
  ->  Seq Scan on pattern_vocabulary pv  (cost=0.00..12.23 rows=1 width=426) (actual time=0.027..0.067 rows=9 loops=1)
        Filter: ((criteria IS NOT NULL) AND (superseded_by IS NULL))
        Rows Removed by Filter: 19
Planning Time: 4.775 ms
Execution Time: 3.649 ms
```
`Index Cond: (id = 37603)` on `ai_activity_log_pkey` still present — identical plan shape to baseline (`Nested Loop` → pkey `Index Scan` → `pattern_vocabulary` seq scan filtered to the 9 non-superseded/non-null-criteria rows). Execution time **3.649 ms**, same order as baseline's 3.920 ms (now returning `rows=1` instead of `rows=0`, since row 37603 now genuinely matches — the extra work is one real containment check inside the existing loop, not a new scan). No whole-log recompute — the `LOG-131` regression this proof exists to catch did not happen.

**6. Blast radius, honest and uncapped:**
```sql
SELECT l.feature, count(*) FROM ai_call_patterns p JOIN ai_activity_log l ON l.id = p.ai_activity_log_id
WHERE p.pattern_name = 'Function Calling' GROUP BY l.feature ORDER BY 2 DESC;
```
| feature | count |
|---|---|
| channel-intelligence:ci-answer-intent:depth0 | 320 |
| channel-intelligence:ci-answer-intent:depth2 | 130 |
| channel-intelligence:ci-answer-intent:depth1 | 74 |
| channel-intelligence:ci-answer-intent:depth3 | 48 |
| channel-intelligence:ci-answer-intent:depth4 | 8 |
| channel-intelligence:ci-answer-intent:depth5 | 5 |

Sums to **585**, exactly the new `function-calling` count above. All six rows are the same answer-emission hop shape (`channel-intelligence:ci-answer-intent`) at every loop depth it has actually occurred at in real traffic (0 through 5) — `LOG-135`'s 5 named evidence rows were all `depth2`; this migration's real blast radius is every depth that hop shape has ever fired at, honestly uncapped. No other `feature` value appears — the fix is precisely scoped to the pattern it was meant to activate.

## Governance note

This migration required no live Susan Smith — Trainer call: her `function-calling` criteria was already stored (`S-LOG-135` Round 1's `amend`), validated, and untouched throughout. `LOG-136` fixed only the matcher's read-time resolution of an already-governed, already-validated criteria object — the validator grammar (`lib/pattern-vocabulary.js`'s `SIGNATURE_FIELDS`/`validateCriteria()`) is byte-identical, confirmed by not touching that file this session.
