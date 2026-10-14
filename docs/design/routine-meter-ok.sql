-- Repo record of the migration `routine_meter_ok` (applied 2026-10-14, John: "build it now with my full permission").
-- Shared stop for non-builder routines. Each of these routines' first step calls it and ends with
-- "SKIPPED: weekly meter <pct>% (<reason>)" when ok is false:
--   victoria-reorg (trig_012xvmXsXAjbVxdbYhUTq6W1), nathan-daily-release-notes (trig_01EVxzUZvLSVaUReeiwEXQ6t),
--   nathan-monthly-refresh (trig_01TH7LgWccUrgb8R8wvYnT16), jerry-market-watch (trig_01Q3wHXJhzPp12czRwvgX86V).
-- The threshold lives in ONE place: the default below (90). The builder lanes keep their own pace gate in runner_should_boot().
-- Fail closed: no reading, or a reading older than runner_settings.meter_stale_hours, is NOT ok. meter_limiter_off lets everything through.
-- Undo: DROP FUNCTION public.routine_meter_ok(numeric); and remove the STEP 0 paragraph from each routine prompt.

CREATE OR REPLACE FUNCTION public.routine_meter_ok(p_threshold numeric DEFAULT 90)
RETURNS TABLE(ok boolean, reason text, all_models_pct numeric, age_hours numeric, threshold numeric)
LANGUAGE sql
STABLE
AS $function$
WITH s AS (
  SELECT meter_stale_hours, meter_limiter_off FROM public.runner_settings WHERE id = 1
),
r AS (
  SELECT u.taken_at, u.all_models_pct AS pct
    FROM public.runner_usage_readings u
   ORDER BY u.taken_at DESC NULLS LAST
   LIMIT 1
),
f AS (
  SELECT (SELECT meter_limiter_off FROM s) AS limiter_off,
         (SELECT count(*) FROM r) AS n,
         (SELECT pct FROM r) AS pct,
         round((extract(epoch FROM (now() - (SELECT taken_at FROM r))) / 3600.0)::numeric, 2) AS age,
         (SELECT meter_stale_hours FROM s) AS stale_h
)
SELECT
  CASE WHEN f.limiter_off IS TRUE THEN true
       WHEN f.n = 0 THEN false
       WHEN f.age > f.stale_h THEN false
       WHEN f.pct >= p_threshold THEN false
       ELSE true END,
  CASE WHEN f.limiter_off IS TRUE THEN 'meter limiter is off (John)'
       WHEN f.n = 0 THEN 'no usage reading'
       WHEN f.age > f.stale_h THEN 'usage reading is stale'
       WHEN f.pct >= p_threshold THEN 'weekly meter at or above the stop'
       ELSE 'ok' END,
  f.pct::numeric,
  f.age,
  p_threshold
FROM f;
$function$;
