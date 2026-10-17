-- Repo record, 2026-10-17 (John: "apply all three changes"). Rule for every scheduled routine and runner lane:
--   stop when the weekly all-models meter reaches the LOWER of the day-of-week ceiling (day index x 100/7) and 90%.
--
-- 1. BUDGET WALL: public.runner_budget row for 2026-10 set weekly_rest_pct 1000 -> 90 and final_day_rest_pct 1000 -> 90.
--    runner_should_boot() (the builder lanes), the Auditor and model-watch already read this wall; it had been switched off at 1000.
--    UNDO: update public.runner_budget set weekly_rest_pct = 1000, final_day_rest_pct = 1000 where month = '2026-10';
--    WATCH: a 2026-11 budget row must carry 90 as well (the 2026-10 row was last edited 2026-09-29; check how a new month's row is created).
--
-- 2. routine_meter_ok() now returns false at or above least(p_threshold, pace limit), the pace limit being read from
--    runner_should_boot() so there is one home for the day-of-week ceiling. The column `threshold` is the ceiling in force.
--    The four routines guarded on 2026-10-14 call this function, so they were upgraded without a prompt change.
--
-- 3. STEP 0 (the same call to routine_meter_ok()) added as the first step of: model-watch (after its schedule gate),
--    deepbench-auditor, researcher-weekly-market, nathan-wednesday-market-scan, jerry-growth-review.
--    Previously guarded (2026-10-14): victoria-reorg, nathan-daily-release-notes, nathan-monthly-refresh, jerry-market-watch.
--    Runner lanes (deepbench-runner, -lane-2, -lane-3, -lane-4) use runner_should_boot(): day-of-week ceiling plus the wall above.
--    UNDO for a routine: remove its "STEP 0 - WEEKLY METER STOP" paragraph.

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
pace AS (
  SELECT (b.detail->>'pace_limit_pct')::numeric AS lim FROM public.runner_should_boot() b
),
f AS (
  SELECT (SELECT meter_limiter_off FROM s) AS limiter_off,
         (SELECT count(*) FROM r) AS n,
         (SELECT pct FROM r) AS pct,
         round((extract(epoch FROM (now() - (SELECT taken_at FROM r))) / 3600.0)::numeric, 2) AS age,
         (SELECT meter_stale_hours FROM s) AS stale_h,
         (SELECT lim FROM pace) AS pace_lim,
         least(p_threshold, coalesce((SELECT lim FROM pace), p_threshold)) AS ceil
)
SELECT
  CASE WHEN f.limiter_off IS TRUE THEN true
       WHEN f.n = 0 THEN false
       WHEN f.age > f.stale_h THEN false
       WHEN f.pct >= f.ceil THEN false
       ELSE true END,
  CASE WHEN f.limiter_off IS TRUE THEN 'meter limiter is off (John)'
       WHEN f.n = 0 THEN 'no usage reading'
       WHEN f.age > f.stale_h THEN 'usage reading is stale'
       WHEN f.pct >= f.ceil AND coalesce(f.pace_lim, p_threshold) < p_threshold THEN 'weekly meter at or above the day-of-week ceiling'
       WHEN f.pct >= f.ceil THEN 'weekly meter at or above the 90% stop'
       ELSE 'ok' END,
  f.pct::numeric,
  f.age,
  f.ceil
FROM f;
$function$;
