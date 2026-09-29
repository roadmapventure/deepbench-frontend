-- DeepBench v7.0.709 | docs/design/agt-276-db-health-swap.sql | AGT-276 — the database health grade
-- reads swap, the signal that leads an outage on this instance, instead of only iowait and the REST
-- probe, which turn red once the database is already failing.
--
-- Evidence (public.db_health_readings, 2026-09-28 11:00-23:00 CT, NANO: 426 MB RAM, 2 CPUs):
--   healthy, one test slot (11:00-19:10):  swap-in <= 711 pages/s, swap used <= 684 MB, iowait <= 13.4%
--   stressed, three test slots (19:15-23:00): swap-in 720-1,530 pages/s, swap used 650-891 MB,
--   iowait 17-46% -- graded green in every reading but one amber (20:40) and one probe miss (20:35);
--   the database stopped answering after the 23:00 reading and was restarted by hand at ~23:40.
-- AGT-237 stored swap and memory ungraded until "the table holds a failing episode"; this is it.
--
-- Applied live as migration agt276_db_health_swap. Undo: re-apply docs/design/agt-237-db-health.sql
-- sections (1b)/(3) for db_health_grade and db_health_tick, and remove the four swap keys.

-- (1) Thresholds -- one home, a column John can move without a migration. iowait 18/35 was set live
--     first (decision 7b73ae2a, before-image 35/60).
UPDATE public.runner_settings
   SET db_health_thresholds = db_health_thresholds || jsonb_build_object(
         'amber_iowait_pct', 18, 'red_iowait_pct', 35,
         'amber_swapin_per_s', 750, 'red_swapin_per_s', 1200,
         'amber_swap_used_mb', 720, 'red_swap_used_mb', 850)
 WHERE id = 1;

-- (2) The grade. prev may carry 'pswpin' and 'secs' (the tick's previous reading and the interval);
--     a prev without them (the AGT-237 test table, a first reading) leaves swap-in ungraded, with a note.
--     Swap used is graded from cur alone. MB = bytes / 1,000,000, the unit the readings report in.
CREATE OR REPLACE FUNCTION public.db_health_grade(prev jsonb, cur jsonb, probe_status integer, probe_ms integer, t jsonb)
RETURNS TABLE(level text, reasons text[], iowait_pct numeric)
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_red   text[] := '{}';
  v_amber text[] := '{}';
  v_note  text[] := '{}';
  v_dio   numeric;
  v_dtot  numeric;
  v_pct   numeric;
  v_rate  numeric;
  v_used  numeric;
BEGIN
  IF t IS NULL THEN
    RETURN QUERY SELECT 'red'::text,
      ARRAY['no thresholds: runner_settings.db_health_thresholds is null, so nothing can be graded (fail closed)'],
      NULL::numeric;
    RETURN;
  END IF;

  IF cur IS NULL THEN
    v_amber := v_amber || 'metrics unavailable: the metrics endpoint did not answer 200'::text;
  ELSIF prev IS NULL THEN
    v_note := v_note || 'iowait not graded: no previous reading to difference against'::text;
  ELSE
    v_dio  := (cur->>'cpu_iowait_s')::numeric - (prev->>'cpu_iowait_s')::numeric;
    v_dtot := (cur->>'cpu_total_s')::numeric  - (prev->>'cpu_total_s')::numeric;
    IF v_dio IS NULL OR v_dtot IS NULL THEN
      v_note := v_note || 'iowait not graded: a CPU counter is missing from one of the two readings'::text;
    ELSIF v_dio < 0 OR v_dtot <= 0 THEN
      v_note := v_note || 'iowait not graded: a CPU counter went down (the database restarted)'::text;
    ELSE
      v_pct := v_dio / v_dtot * 100;
      IF v_pct >= (t->>'red_iowait_pct')::numeric THEN
        v_red := v_red || format('iowait %s%% >= red %s%%', round(v_pct, 2), t->>'red_iowait_pct');
      ELSIF v_pct >= (t->>'amber_iowait_pct')::numeric THEN
        v_amber := v_amber || format('iowait %s%% >= amber %s%%', round(v_pct, 2), t->>'amber_iowait_pct');
      END IF;
    END IF;
  END IF;

  -- AGT-276: swap-in rate -- the leading signal on this instance.
  IF cur IS NOT NULL THEN
    IF prev IS NULL OR prev->>'pswpin' IS NULL OR prev->>'secs' IS NULL OR cur->>'pswpin' IS NULL THEN
      v_note := v_note || 'swap-in not graded: no previous swap counter and interval to difference against'::text;
    ELSIF (prev->>'secs')::numeric <= 0 OR (cur->>'pswpin')::numeric < (prev->>'pswpin')::numeric THEN
      v_note := v_note || 'swap-in not graded: the swap counter went down (the database restarted)'::text;
    ELSIF t->>'amber_swapin_per_s' IS NULL OR t->>'red_swapin_per_s' IS NULL THEN
      v_amber := v_amber || 'swap-in not graded: db_health_thresholds lacks amber_swapin_per_s/red_swapin_per_s'::text;
    ELSE
      v_rate := ((cur->>'pswpin')::numeric - (prev->>'pswpin')::numeric) / (prev->>'secs')::numeric;
      IF v_rate >= (t->>'red_swapin_per_s')::numeric THEN
        v_red := v_red || format('swap-in %s pages/s >= red %s', round(v_rate), t->>'red_swapin_per_s');
      ELSIF v_rate >= (t->>'amber_swapin_per_s')::numeric THEN
        v_amber := v_amber || format('swap-in %s pages/s >= amber %s', round(v_rate), t->>'amber_swapin_per_s');
      END IF;
    END IF;

    -- AGT-276: swap used.
    IF cur->>'swap_total_bytes' IS NOT NULL AND cur->>'swap_free_bytes' IS NOT NULL THEN
      IF t->>'amber_swap_used_mb' IS NULL OR t->>'red_swap_used_mb' IS NULL THEN
        v_amber := v_amber || 'swap used not graded: db_health_thresholds lacks amber_swap_used_mb/red_swap_used_mb'::text;
      ELSE
        v_used := ((cur->>'swap_total_bytes')::numeric - (cur->>'swap_free_bytes')::numeric) / 1000000;
        IF v_used >= (t->>'red_swap_used_mb')::numeric THEN
          v_red := v_red || format('swap used %s MB >= red %s MB', round(v_used), t->>'red_swap_used_mb');
        ELSIF v_used >= (t->>'amber_swap_used_mb')::numeric THEN
          v_amber := v_amber || format('swap used %s MB >= amber %s MB', round(v_used), t->>'amber_swap_used_mb');
        END IF;
      END IF;
    END IF;
  END IF;

  IF probe_status IS NULL THEN
    v_red := v_red || 'REST probe got no answer (timed out or failed)'::text;
  ELSIF probe_status < 200 OR probe_status > 299 THEN
    v_red := v_red || format('REST probe answered HTTP %s', probe_status);
  END IF;

  IF probe_ms IS NOT NULL THEN
    IF probe_ms >= (t->>'red_probe_ms')::numeric THEN
      v_red := v_red || format('REST probe took %s ms >= red %s ms', probe_ms, t->>'red_probe_ms');
    ELSIF probe_ms >= (t->>'amber_probe_ms')::numeric THEN
      v_amber := v_amber || format('REST probe took %s ms >= amber %s ms', probe_ms, t->>'amber_probe_ms');
    END IF;
  END IF;

  RETURN QUERY SELECT
    CASE WHEN cardinality(v_red) > 0 THEN 'red'
         WHEN cardinality(v_amber) > 0 THEN 'amber'
         ELSE 'green' END::text,
    v_red || v_amber || v_note,
    round(v_pct, 2);
END
$function$;

COMMENT ON FUNCTION public.db_health_grade(jsonb, jsonb, integer, integer, jsonb) IS
  'AGT-237 + AGT-276: red = iowait >= red_iowait_pct, swap-in pages/s >= red_swapin_per_s, swap used MB >= red_swap_used_mb, or the REST probe not 2xx / no answer / >= red_probe_ms. amber = the amber keys, or no metrics. A counter that went DOWN (restart) is not graded. Thresholds calibrated on the 2026-09-28 outage.';

-- (3) The tick hands the grade the previous swap counter and the interval. Rewritten on the stored
--     body (the only change is the v_prevj object and computing v_secs before it); asserted below.
DO $$
DECLARE
  v_def text;
  v_old text := $o$      v_prevj := CASE WHEN v_prev.id IS NOT NULL
                      THEN jsonb_build_object('cpu_iowait_s', v_prev.cpu_iowait_s, 'cpu_total_s', v_prev.cpu_total_s) END;
      v_secs  := CASE WHEN v_prev.id IS NOT NULL THEN extract(epoch FROM (r.fired_at - v_prev.fired_at)) END;$o$;
  v_new text := $n$      v_secs  := CASE WHEN v_prev.id IS NOT NULL THEN extract(epoch FROM (r.fired_at - v_prev.fired_at)) END;
      v_prevj := CASE WHEN v_prev.id IS NOT NULL
                      THEN jsonb_build_object('cpu_iowait_s', v_prev.cpu_iowait_s, 'cpu_total_s', v_prev.cpu_total_s,
                                              'pswpin', v_prev.pswpin, 'secs', v_secs) END;$n$;
BEGIN
  SELECT pg_get_functiondef('public.db_health_tick()'::regprocedure) INTO v_def;
  IF position(v_new IN v_def) > 0 THEN
    RETURN;  -- already applied
  END IF;
  IF position(v_old IN v_def) = 0 THEN
    RAISE EXCEPTION 'AGT-276: db_health_tick() body does not contain the expected v_prevj block';
  END IF;
  EXECUTE replace(v_def, v_old, v_new);
END $$;

-- (4) Assert: the tick passes pswpin; the grade grades the 2026-09-28 19:15 reading red and the
--     18:55 reading (the healthiest-looking busy reading) green.
DO $$
DECLARE
  t jsonb;
  g record;
BEGIN
  IF position('''pswpin'', v_prev.pswpin' IN pg_get_functiondef('public.db_health_tick()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'AGT-276: db_health_tick() does not pass pswpin to the grade';
  END IF;
  SELECT s.db_health_thresholds INTO t FROM public.runner_settings s WHERE s.id = 1;
  -- 19:10 -> 19:15: pswpin 37,268,311 -> 37,728,036 over 301 s = 1,527/s; swap used 739 MB
  SELECT * INTO g FROM public.db_health_grade(
    jsonb_build_object('cpu_iowait_s', 0, 'cpu_total_s', 0, 'pswpin', 37268311, 'secs', 301),
    jsonb_build_object('cpu_iowait_s', 34, 'cpu_total_s', 100, 'pswpin', 37728036,
                       'swap_total_bytes', 1073737728, 'swap_free_bytes', 1073737728 - 739000000),
    200, 44, t);
  IF g.level <> 'red' THEN RAISE EXCEPTION 'AGT-276: the 19:15 outage reading graded %, expected red', g.level; END IF;
  -- 18:50 -> 18:55: 213,103 pages over 300 s = 710/s; swap used 572 MB; iowait 12.68%
  SELECT * INTO g FROM public.db_health_grade(
    jsonb_build_object('cpu_iowait_s', 0, 'cpu_total_s', 0, 'pswpin', 36633258, 'secs', 300),
    jsonb_build_object('cpu_iowait_s', 12.68, 'cpu_total_s', 100, 'pswpin', 36846361,
                       'swap_total_bytes', 1073737728, 'swap_free_bytes', 1073737728 - 572000000),
    200, 32, t);
  IF g.level <> 'green' THEN RAISE EXCEPTION 'AGT-276: the healthy 18:55 reading graded % (%), expected green', g.level, g.reasons; END IF;
END $$;
