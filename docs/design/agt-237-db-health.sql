-- DeepBench v7.0.658 | docs/design/agt-237-db-health.sql | AGT-237 — migration agt237_db_health, mirrored byte-identical
--
-- FEATURE: AGT-237 (a)(b)(e) -- the database's own health, read every 5 minutes and graded
-- green / amber / red, gates the runner BEFORE it starts work into an outage. (c) is
-- scripts/db-pressure.js; (d), the automatic restart, is the named remainder (it needs a Supabase
-- personal access token only John can create).
--
-- Down captured FIRST by public.capture_migration_down(cycle 028ffdbb, 'agt237_db_health') for
-- runner_should_boot(), drain_chain_gate(uuid), the four new functions and the new table. Not in
-- that down, by construction of the capture: the runner_settings.db_health_thresholds column, the
-- pg_cron job and the M6-14 governance_rules row -- their undo is
--   ALTER TABLE public.runner_settings DROP COLUMN db_health_thresholds;
--   SELECT cron.unschedule('db-health-tick');
--   DELETE FROM public.governance_rules WHERE id = 'M6-14';
--
-- Governing: ARCHITECTURE.md §19v Operations; §19o (fail closed, no silent retry);
-- .claude/rules/supabase-column-grants.md (tables AND functions default open -- every new object
-- below revokes anon/authenticated BY NAME and the trailing DO asserts both directions).

-- ---------------------------------------------------------------------------------------------
-- (1) The thresholds: one home, a column John can move without a migration.
-- ---------------------------------------------------------------------------------------------
INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT '028ffdbb-04b3-4f41-bc40-e2a9e3d64ba7'::uuid, 'runner_settings', s.id::text, to_jsonb(s)
  FROM public.runner_settings s WHERE s.id = 1;

ALTER TABLE public.runner_settings
  ADD COLUMN IF NOT EXISTS db_health_thresholds jsonb NOT NULL
  DEFAULT '{"amber_iowait_pct":35,"red_iowait_pct":60,"amber_probe_ms":3000,"red_probe_ms":10000,"window_minutes":15}'::jsonb;

COMMENT ON COLUMN public.runner_settings.db_health_thresholds IS
  'AGT-237: the grading thresholds for public.db_health_grade() and the release window for public.db_health_level(). iowait percentages over the tick interval, REST probe milliseconds, window in minutes.';

-- ---------------------------------------------------------------------------------------------
-- (2) The readings. A row is FIRED (two pg_net requests) by one tick and COMPLETED by the next.
--     level is NULL while pending; a row with error set and level NULL was never graded.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.db_health_readings (
  id                  bigserial PRIMARY KEY,
  fired_at            timestamptz NOT NULL DEFAULT now(),
  taken_at            timestamptz,
  metrics_request_id  bigint,
  probe_request_id    bigint,
  mem_available_bytes bigint,
  swap_total_bytes    bigint,
  swap_free_bytes     bigint,
  pswpin              bigint,
  pswpout             bigint,
  pswpin_per_s        numeric,
  pswpout_per_s       numeric,
  cpu_iowait_s        numeric,
  cpu_total_s         numeric,
  iowait_pct          numeric,
  backends            integer,
  metrics_status      integer,
  probe_status        integer,
  probe_ms            integer,
  level               text CHECK (level IN ('green', 'amber', 'red')),
  reasons             text[],
  error               text
);
CREATE INDEX IF NOT EXISTS db_health_readings_fired_at_idx ON public.db_health_readings (fired_at DESC);

REVOKE ALL ON public.db_health_readings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.db_health_readings_id_seq FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.db_health_readings TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.db_health_readings_id_seq TO service_role;

COMMENT ON TABLE public.db_health_readings IS
  'AGT-237: one row per db_health_tick() fire -- the metrics endpoint and a REST probe, graded green/amber/red by the NEXT tick. Kept 14 days.';

-- ---------------------------------------------------------------------------------------------
-- (3) Parse the Prometheus text the metrics endpoint returns. Pure.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.db_health_parse(p_text text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $function$
  WITH l AS (
    SELECT m[1] AS metric, m[2] AS labels, m[3] AS val
      FROM regexp_split_to_table(coalesce(p_text, ''), E'\n') AS line
      CROSS JOIN LATERAL regexp_match(line, '^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?[ \t]+([^ \t\r]+)') AS m
     WHERE m IS NOT NULL
  ), v AS (
    SELECT l.metric,
           substring(l.labels FROM 'mode="([^"]*)"') AS mode,
           CASE WHEN l.val ~ '^[-+]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][-+]?[0-9]+)?$'
                THEN l.val::numeric END AS n
      FROM l
  )
  SELECT jsonb_build_object(
    'cpu_iowait_s',        (SELECT sum(v.n) FROM v WHERE v.metric = 'node_cpu_seconds_total' AND v.mode = 'iowait'),
    'cpu_total_s',         (SELECT sum(v.n) FROM v WHERE v.metric = 'node_cpu_seconds_total'),
    'mem_available_bytes', (SELECT max(v.n) FROM v WHERE v.metric = 'node_memory_MemAvailable_bytes'),
    'swap_total_bytes',    (SELECT max(v.n) FROM v WHERE v.metric = 'node_memory_SwapTotal_bytes'),
    'swap_free_bytes',     (SELECT max(v.n) FROM v WHERE v.metric = 'node_memory_SwapFree_bytes'),
    'pswpin',              (SELECT max(v.n) FROM v WHERE v.metric = 'node_vmstat_pswpin'),
    'pswpout',             (SELECT max(v.n) FROM v WHERE v.metric = 'node_vmstat_pswpout'),
    'backends',            (SELECT sum(v.n) FROM v WHERE v.metric = 'pg_stat_database_num_backends')
  )
$function$;

COMMENT ON FUNCTION public.db_health_parse(text) IS
  'AGT-237: Prometheus text -> {cpu_iowait_s, cpu_total_s (node_cpu_seconds_total summed over CPUs), mem_available_bytes, swap_total_bytes, swap_free_bytes, pswpin, pswpout, backends}. A metric absent from the text is null, never 0.';

-- ---------------------------------------------------------------------------------------------
-- (4) Grade one reading against the previous one. Pure. Only evidenced signals are graded:
--     iowait over the interval and the REST probe. Swap and memory are stored, not graded.
--     iowait_pct is returned alongside so the tick stores the same number the grade judged.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.db_health_grade(prev jsonb, cur jsonb, probe_status integer, probe_ms integer, t jsonb)
RETURNS TABLE(level text, reasons text[], iowait_pct numeric)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_red   text[] := '{}';
  v_amber text[] := '{}';
  v_note  text[] := '{}';
  v_dio   numeric;
  v_dtot  numeric;
  v_pct   numeric;
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
  'AGT-237: red = iowait >= red_iowait_pct, or the REST probe not 2xx / no answer, or probe_ms >= red_probe_ms. amber = iowait >= amber_iowait_pct, or probe_ms >= amber_probe_ms, or no metrics (cur null). A counter that went DOWN (restart) is not graded. Swap and memory are stored, never graded.';

-- ---------------------------------------------------------------------------------------------
-- (5) The tick. pg_cron db-health-tick, every 5 minutes. Four parts, each with its own EXCEPTION
--     block that writes `error` rather than failing the whole tick.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.db_health_tick()
RETURNS jsonb
LANGUAGE plpgsql
SET statement_timeout = '60s'
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_t        jsonb;
  r          record;
  v_m        record;
  v_p        record;
  v_cur      jsonb;
  v_prev     record;
  v_prevj    jsonb;
  v_pms      integer;
  v_g        record;
  v_secs     numeric;
  v_done     integer := 0;
  v_filed    integer := 0;
  v_n        integer;
  v_newest   record;
  v_before   record;
  v_start    record;
  v_find     jsonb := '[]'::jsonb;
  v_url      text;
  v_key      text;
  v_new      bigint;
  v_mid      bigint;
  v_pid      bigint;
  v_pruned   integer := 0;
  v_errs     text[] := '{}';
BEGIN
  IF NOT pg_try_advisory_xact_lock(237) THEN
    RETURN jsonb_build_object('skipped', 'another db_health_tick() holds advisory lock 237');
  END IF;

  SELECT s.db_health_thresholds INTO v_t FROM public.runner_settings s WHERE s.id = 1;

  -- (1) Complete every pending row old enough for both 10 s requests to have answered, then
  --     delete its two net._http_response rows.
  FOR r IN
    SELECT * FROM public.db_health_readings d
     WHERE d.level IS NULL AND d.taken_at IS NULL AND d.error IS NULL
       AND d.fired_at < now() - interval '30 seconds'
     ORDER BY d.fired_at
  LOOP
    BEGIN
      SELECT h.status_code, h.content, h.created INTO v_m FROM net._http_response h WHERE h.id = r.metrics_request_id;
      SELECT h.status_code, h.created INTO v_p FROM net._http_response h WHERE h.id = r.probe_request_id;
      v_cur := CASE WHEN v_m.status_code = 200 THEN public.db_health_parse(v_m.content) END;

      SELECT d.id, d.fired_at, d.cpu_iowait_s, d.cpu_total_s, d.pswpin, d.pswpout INTO v_prev
        FROM public.db_health_readings d
       WHERE d.level IS NOT NULL AND d.cpu_total_s IS NOT NULL AND d.fired_at < r.fired_at
       ORDER BY d.fired_at DESC LIMIT 1;
      v_prevj := CASE WHEN v_prev.id IS NOT NULL
                      THEN jsonb_build_object('cpu_iowait_s', v_prev.cpu_iowait_s, 'cpu_total_s', v_prev.cpu_total_s) END;
      v_secs  := CASE WHEN v_prev.id IS NOT NULL THEN extract(epoch FROM (r.fired_at - v_prev.fired_at)) END;
      v_pms   := CASE WHEN v_p.status_code IS NOT NULL
                      THEN round(extract(epoch FROM (v_p.created - r.fired_at)) * 1000)::integer END;

      SELECT * INTO v_g FROM public.db_health_grade(v_prevj, v_cur, v_p.status_code, v_pms, v_t);

      UPDATE public.db_health_readings d SET
        taken_at            = clock_timestamp(),
        metrics_status      = v_m.status_code,
        probe_status        = v_p.status_code,
        probe_ms            = v_pms,
        mem_available_bytes = (v_cur->>'mem_available_bytes')::numeric::bigint,
        swap_total_bytes    = (v_cur->>'swap_total_bytes')::numeric::bigint,
        swap_free_bytes     = (v_cur->>'swap_free_bytes')::numeric::bigint,
        pswpin              = (v_cur->>'pswpin')::numeric::bigint,
        pswpout             = (v_cur->>'pswpout')::numeric::bigint,
        pswpin_per_s        = CASE WHEN v_secs > 0 AND (v_cur->>'pswpin')::numeric >= v_prev.pswpin
                                   THEN round(((v_cur->>'pswpin')::numeric - v_prev.pswpin) / v_secs, 2) END,
        pswpout_per_s       = CASE WHEN v_secs > 0 AND (v_cur->>'pswpout')::numeric >= v_prev.pswpout
                                   THEN round(((v_cur->>'pswpout')::numeric - v_prev.pswpout) / v_secs, 2) END,
        cpu_iowait_s        = (v_cur->>'cpu_iowait_s')::numeric,
        cpu_total_s         = (v_cur->>'cpu_total_s')::numeric,
        iowait_pct          = v_g.iowait_pct,
        backends            = (v_cur->>'backends')::numeric::integer,
        level               = v_g.level,
        reasons             = v_g.reasons
      WHERE d.id = r.id;

      DELETE FROM net._http_response h WHERE h.id IN (r.metrics_request_id, r.probe_request_id);
      v_done := v_done + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.db_health_readings d
         SET taken_at = clock_timestamp(), error = 'complete: ' || SQLERRM
       WHERE d.id = r.id;
      v_errs := v_errs || ('complete ' || r.id || ': ' || SQLERRM);
    END;
  END LOOP;

  -- (2) Findings. Fingerprint = left(md5(slug || ':' || episode-start reading id), 16); a
  --     fingerprint already filed in ANY week is never filed again.
  BEGIN
    SELECT d.* INTO v_newest FROM public.db_health_readings d
     WHERE d.level IS NOT NULL ORDER BY d.fired_at DESC LIMIT 1;
    IF v_newest.id IS NOT NULL THEN
      SELECT d.* INTO v_before FROM public.db_health_readings d
       WHERE d.level IS NOT NULL AND d.fired_at < v_newest.fired_at ORDER BY d.fired_at DESC LIMIT 1;
      IF v_before.id IS NOT NULL
         AND v_newest.fired_at - v_before.fired_at > ((v_t->>'window_minutes')::numeric * interval '1 minute') THEN
        v_find := v_find || jsonb_build_object(
          'slug', 'db-health-readings-gap', 'reading_id', v_newest.id,
          'text', format('No completed health reading between %s and %s (%s min; the window is %s min). While readings are missing the runner cannot see the database, so db_health_level() answers unsafe and both gates refuse.',
                         v_before.fired_at, v_newest.fired_at,
                         round(extract(epoch FROM (v_newest.fired_at - v_before.fired_at)) / 60.0, 1), v_t->>'window_minutes'),
          'fact', 'The database health tick (pg_cron db-health-tick, every 5 min) must complete a reading at least once per window.',
          'fix', 'Check cron.job_run_details for db-health-tick and the error column of public.db_health_readings; a gap during a database restart is expected and needs nothing.');
      END IF;

      IF v_newest.level = 'red' THEN
        SELECT d.* INTO v_start FROM public.db_health_readings d
         WHERE d.level = 'red'
           AND d.fired_at > coalesce((SELECT max(x.fired_at) FROM public.db_health_readings x
                                       WHERE x.level IN ('green', 'amber')), '-infinity'::timestamptz)
         ORDER BY d.fired_at LIMIT 1;
        v_find := v_find || jsonb_build_object(
          'slug', 'db-pressure-red', 'reading_id', v_start.id,
          'text', format('Database health went RED at %s (reading %s): iowait %s%%, REST probe HTTP %s in %s ms, MemAvailable %s MB, swap used %s MB. Reasons: %s.',
                         v_start.fired_at, v_start.id, coalesce(v_start.iowait_pct::text, 'n/a'),
                         coalesce(v_start.probe_status::text, 'none'), coalesce(v_start.probe_ms::text, 'n/a'),
                         coalesce(round(v_start.mem_available_bytes / 1048576.0)::text, 'n/a'),
                         coalesce(round((v_start.swap_total_bytes - v_start.swap_free_bytes) / 1048576.0)::text, 'n/a'),
                         coalesce(array_to_string(v_start.reasons, '; '), '')),
          'fact', 'The runner must not start work into a database outage: runner_should_boot() refuses db_pressure and drain_chain_gate() stops at Gate F while any reading in the window is not green.',
          'fix', 'Nothing to do while it clears by itself: the gates hold the runner. If it stays red, see db-pressure-red-persists.');
        IF v_newest.fired_at - v_start.fired_at >= interval '20 minutes' THEN
          v_find := v_find || jsonb_build_object(
            'slug', 'db-pressure-red-persists', 'reading_id', v_start.id,
            'text', format('Database health has been RED since %s (reading %s), %s min through reading %s. Reasons now: %s.',
                           v_start.fired_at, v_start.id,
                           round(extract(epoch FROM (v_newest.fired_at - v_start.fired_at)) / 60.0, 1), v_newest.id,
                           coalesce(array_to_string(v_newest.reasons, '; '), '')),
            'fact', 'A red episode of 20 minutes or more does not clear by itself on this instance.',
            'fix', 'Restart the project in the Supabase dashboard (automatic restart is AGT-237 (d)).');
        END IF;
      END IF;
    END IF;

    INSERT INTO public.audit_findings
      (fingerprint, iso_week, kind, locations, governing_fact, confidence, proposed_resolution,
       found_by, check_slug, finding_type)
    SELECT left(md5((f->>'slug') || ':' || (f->>'reading_id')), 16),
           to_char(now(), 'IYYY-"W"IW'),
           'other',
           jsonb_build_array(jsonb_build_object(
             'location', 'public.db_health_readings/' || (f->>'reading_id'),
             'text', f->>'text')),
           f->>'fact', 'high', f->>'fix', 'runner:db-health', f->>'slug', 'defect'
      FROM jsonb_array_elements(v_find) f
     WHERE NOT EXISTS (SELECT 1 FROM public.audit_findings a
                        WHERE a.fingerprint = left(md5((f->>'slug') || ':' || (f->>'reading_id')), 16))
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_filed = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    v_errs := v_errs || ('findings: ' || SQLERRM);
    UPDATE public.db_health_readings d
       SET error = coalesce(d.error || '; ', '') || 'findings: ' || SQLERRM
     WHERE d.id = (SELECT max(x.id) FROM public.db_health_readings x);
  END;

  -- (3) Fire: the metrics endpoint (Basic service_role:<key>) and a one-row REST probe, 10 s each.
  BEGIN
    SELECT s.value INTO v_url FROM public.runner_secrets s WHERE s.name = 'SUPABASE_URL';
    SELECT s.value INTO v_key FROM public.runner_secrets s WHERE s.name = 'SUPABASE_SERVICE_KEY';
    IF coalesce(v_url, '') = '' OR coalesce(v_key, '') = '' THEN
      RAISE EXCEPTION 'runner_secrets lacks SUPABASE_URL or SUPABASE_SERVICE_KEY';
    END IF;
    v_url := rtrim(v_url, '/');
    INSERT INTO public.db_health_readings (fired_at) VALUES (clock_timestamp()) RETURNING id INTO v_new;
    v_mid := net.http_get(
      url := v_url || '/customer/v1/privileged/metrics',
      headers := jsonb_build_object('Authorization',
        'Basic ' || translate(encode(convert_to('service_role:' || v_key, 'UTF8'), 'base64'), E'\n\r', '')),
      timeout_milliseconds := 10000);
    v_pid := net.http_get(
      url := v_url || '/rest/v1/runner_settings?select=id&limit=1',
      headers := jsonb_build_object('apikey', v_key, 'Authorization', 'Bearer ' || v_key),
      timeout_milliseconds := 10000);
    UPDATE public.db_health_readings d
       SET metrics_request_id = v_mid, probe_request_id = v_pid
     WHERE d.id = v_new;
  EXCEPTION WHEN OTHERS THEN
    v_new := NULL;
    v_errs := v_errs || ('fire: ' || SQLERRM);
    INSERT INTO public.db_health_readings (fired_at, taken_at, error)
    VALUES (clock_timestamp(), clock_timestamp(), 'fire: ' || SQLERRM);
  END;

  -- (4) Keep 14 days.
  BEGIN
    DELETE FROM public.db_health_readings d WHERE d.fired_at < now() - interval '14 days';
    GET DIAGNOSTICS v_pruned = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    v_errs := v_errs || ('prune: ' || SQLERRM);
    UPDATE public.db_health_readings d
       SET error = coalesce(d.error || '; ', '') || 'prune: ' || SQLERRM
     WHERE d.id = (SELECT max(x.id) FROM public.db_health_readings x);
  END;

  RETURN jsonb_build_object('completed', v_done, 'findings_filed', v_filed, 'fired_reading_id', v_new,
                            'pruned', v_pruned, 'errors', to_jsonb(v_errs));
END
$function$;

COMMENT ON FUNCTION public.db_health_tick() IS
  'AGT-237: pg_cron db-health-tick, */5. Under advisory lock 237: (1) completes pending readings from net._http_response and deletes those responses, (2) files db-pressure-red / db-pressure-red-persists / db-health-readings-gap findings, (3) fires the metrics endpoint and a REST probe, (4) keeps 14 days. Each part writes `error` instead of failing the tick.';

-- ---------------------------------------------------------------------------------------------
-- (6) The level both gates read. unsafe when the newest completed reading is older than the
--     window (or there is none); otherwise the WORST level in the window, so release takes a
--     whole clean window.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.db_health_level()
RETURNS TABLE(level text, reading_at timestamptz, age_minutes numeric, reasons text[], detail jsonb)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $function$
  WITH t AS (
    SELECT (s.db_health_thresholds->>'window_minutes')::numeric AS w, s.db_health_thresholds AS th
      FROM public.runner_settings s WHERE s.id = 1
  ), nw AS (
    SELECT d.id, d.fired_at, d.level,
           extract(epoch FROM (now() - d.fired_at)) / 60.0 AS age
      FROM public.db_health_readings d
     WHERE d.level IS NOT NULL
     ORDER BY d.fired_at DESC LIMIT 1
  ), win AS (
    SELECT d.id, d.level, d.reasons,
           CASE d.level WHEN 'red' THEN 3 WHEN 'amber' THEN 2 ELSE 1 END AS rk
      FROM public.db_health_readings d, t
     WHERE d.level IS NOT NULL AND d.fired_at >= now() - (t.w * interval '1 minute')
  ), worst AS (
    SELECT max(win.rk) AS rk, count(*)::integer AS n FROM win
  ), base AS (
    SELECT nw.id AS newest_id, nw.fired_at, nw.level AS newest_level, nw.age, t.w, t.th, worst.rk, worst.n
      FROM (SELECT 1) one
      LEFT JOIN nw ON true
      LEFT JOIN t ON true
      CROSS JOIN worst
  )
  SELECT
    CASE WHEN b.newest_id IS NULL OR b.w IS NULL OR b.age > b.w THEN 'unsafe'
         WHEN b.rk = 3 THEN 'red'
         WHEN b.rk = 2 THEN 'amber'
         ELSE 'green' END,
    b.fired_at,
    round(b.age::numeric, 1),
    CASE WHEN b.newest_id IS NULL THEN ARRAY['no completed health reading exists']
         WHEN b.w IS NULL THEN ARRAY['no window: runner_settings.db_health_thresholds lacks window_minutes']
         WHEN b.age > b.w THEN ARRAY[format('the newest completed health reading is %s min old; the window is %s min',
                                           round(b.age::numeric, 1), b.w)]
         ELSE coalesce((SELECT array_agg(DISTINCT x ORDER BY x) FROM win, unnest(win.reasons) x WHERE win.rk = b.rk),
                       '{}'::text[]) END,
    jsonb_build_object(
      'window_minutes',     b.w,
      'readings_in_window', b.n,
      'newest_id',          b.newest_id,
      'newest_level',       b.newest_level,
      'worst_ids',          (SELECT jsonb_agg(win.id ORDER BY win.id) FROM win WHERE win.rk = b.rk),
      'thresholds',         b.th)
  FROM base b
$function$;

COMMENT ON FUNCTION public.db_health_level() IS
  'AGT-237: green | amber | red | unsafe. unsafe = no completed reading, or the newest is older than runner_settings.db_health_thresholds.window_minutes. Otherwise the WORST level of every completed reading in that window, so a release takes one whole clean window. Read by runner_should_boot() and drain_chain_gate().';

-- ---------------------------------------------------------------------------------------------
-- (7) Gate (b): runner_should_boot() gains db_pressure as refusal 6.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.runner_should_boot()
 RETURNS TABLE(should_boot boolean, reason text, detail jsonb)
 LANGUAGE sql
 STABLE
AS $function$
WITH chi_month AS (
  SELECT to_char(now() AT TIME ZONE 'America/Chicago', 'YYYY-MM') AS m
),
settings AS (
  SELECT s.scheduler_on, s.meter_stale_hours, s.meter_limiter_off FROM public.runner_settings s WHERE s.id = 1
),
reading AS (
  SELECT u.taken_at,
         u.all_models_pct,
         u.fable_pct,
         u.all_models_pct AS gated_pct,
         'all_models'::text AS gated_meter,
         round((extract(epoch FROM (now() - u.taken_at)) / 3600.0)::numeric, 2) AS age_hours
    FROM public.runner_usage_readings u
   ORDER BY u.taken_at DESC NULLS LAST
   LIMIT 1
),
budget AS (
  SELECT b.month, b.weekly_rest_pct, b.final_day_rest_pct, s.stop AS wall_stop,
    CASE s.stop WHEN 'final_day_rest_pct' THEN b.final_day_rest_pct ELSE b.weekly_rest_pct END AS wall_pct
    FROM public.runner_budget b, chi_month c,
    (SELECT CASE WHEN extract(dow FROM (now() AT TIME ZONE 'America/Chicago') - interval '1 hour') = 4 THEN 'final_day_rest_pct' ELSE 'weekly_rest_pct' END AS stop) s
   WHERE b.month = c.m
),
headroom AS (
  SELECT 100::numeric - r.all_models_pct AS pct FROM reading r
),
week AS (
  SELECT ws.week_started_at,
         LEAST(7, GREATEST(1,
           floor(extract(epoch FROM (now() - ws.week_started_at)) / 86400.0)::int + 1)) AS day_index
    FROM (
      SELECT (date_trunc('day', now() AT TIME ZONE 'America/Chicago')
              - (((extract(dow FROM (now() AT TIME ZONE 'America/Chicago'))::int + 2) % 7) * interval '1 day')
              + interval '1 hour') AT TIME ZONE 'America/Chicago' AS candidate
    ) c
    CROSS JOIN LATERAL (
      SELECT CASE WHEN c.candidate <= now() THEN c.candidate
                  ELSE c.candidate - interval '7 days' END AS week_started_at
    ) ws
),
judgment AS (
  SELECT j.model_id, j.reason, j.fable_share FROM public.judgment_model() j
),
-- The orchestrator lane's live answer, read from its one home as judgment_model() is. Reported
-- only: past the pace line weekly_pace below refuses the boot (SES-410).
orchestrator AS (
  SELECT o.model_id, o.reason FROM public.orchestrator_model() o
),
-- FEATURE: AGT-237 -- the database's own health, read from its one home. Anything but green in
-- the window (red, amber, or unsafe = no fresh reading) refuses at (6) below.
db AS (
  SELECT d.level, d.reading_at, d.age_minutes, d.reasons FROM public.db_health_level() d
),
pickable AS (
  SELECT q.pos, q.lane, q.ref, q.title,
         bi.predicted_cycles,
         round(bi.predicted_cycles::numeric * public.runner_pct_per_cycle(), 2) AS pct_of_week
    FROM public.prime_directive_queue() q
    LEFT JOIN public.backlog_items bi ON bi.backlog_id = q.ref
   WHERE q.lane IN ('drain', 'selfbuild')
),
next_pick AS (SELECT p.* FROM pickable p ORDER BY p.pos LIMIT 1),
cheapest AS (
  SELECT p.* FROM pickable p WHERE p.pct_of_week IS NOT NULL ORDER BY p.pct_of_week, p.pos LIMIT 1
),
-- FEATURE: AGT-127 -- the gate cards a fire could still RULE when it can build nothing. An
-- undecided kind='gated_before_build' card counts here only while NO open question names it: a
-- ruling of `john` (apply_gate_rulings()) opens `gate-card-<first 8 of the card id>` and writes no
-- card, so without this NOT EXISTS the same branch would fire again every hour on a card whose
-- decision is genuinely John's. That is the exit that closes the loop, and it is the only one.
gate_cards AS (
  SELECT count(*)::int AS n
    FROM public.runner_items ri
   WHERE ri.kind = 'gated_before_build'
     AND ri.decision IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.runner_questions q
        WHERE q.qid = 'gate-card-' || left(ri.id::text, 8)
          AND q.status = 'open')
),
facts AS (
  SELECT
    (SELECT c.m FROM chi_month c)                                   AS month,
    (SELECT s.scheduler_on FROM settings s)                         AS scheduler_on,
    (SELECT s.meter_stale_hours FROM settings s)                    AS meter_stale_hours,
    (SELECT COALESCE(s.meter_limiter_off, false) FROM settings s)   AS meter_limiter_off,
    (SELECT r.taken_at FROM reading r)                              AS reading_taken_at,
    (SELECT r.age_hours FROM reading r)                             AS reading_age_hours,
    (SELECT r.all_models_pct FROM reading r)                        AS all_models_pct,
    (SELECT r.fable_pct FROM reading r)                             AS fable_pct,
    (SELECT r.gated_pct FROM reading r)                             AS gated_pct,
    (SELECT r.gated_meter FROM reading r)                           AS gated_meter,
    (SELECT j.model_id FROM judgment j)                             AS judgment_model,
    (SELECT j.reason FROM judgment j)                               AS judgment_reason,
    (SELECT j.fable_share FROM judgment j)                          AS fable_share,
    (SELECT o.model_id FROM orchestrator o)                         AS orchestrator_model,
    (SELECT o.reason FROM orchestrator o)                           AS orchestrator_reason,
    (SELECT d.level FROM db d)                                      AS db_level,
    (SELECT d.reading_at FROM db d)                                 AS db_reading_at,
    (SELECT d.age_minutes FROM db d)                                AS db_age_minutes,
    (SELECT d.reasons FROM db d)                                    AS db_reasons,
    (SELECT b.weekly_rest_pct FROM budget b)                        AS weekly_rest_pct,
    (SELECT b.final_day_rest_pct FROM budget b)                     AS final_day_rest_pct,
    (SELECT b.wall_stop FROM budget b)                              AS wall_stop,
    (SELECT b.wall_pct FROM budget b)                               AS wall_pct,
    EXISTS (SELECT 1 FROM budget)                                   AS budget_row_exists,
    (SELECT h.pct FROM headroom h)                                  AS weekly_headroom_pct,
    (SELECT w.week_started_at FROM week w)                          AS week_started_at,
    (SELECT w.day_index FROM week w)                                AS week_day_index,
    (SELECT round(w.day_index * 100.0 / 7, 2) FROM week w)          AS pace_limit_pct,
    (SELECT count(*)::int FROM pickable)                            AS pickable_count,
    (SELECT count(*)::int FROM pickable p WHERE p.pct_of_week IS NULL) AS unpriced_pickable,
    (SELECT c.pct_of_week FROM cheapest c)                          AS cheapest_pct_of_week,
    (SELECT g.n FROM gate_cards g)                                  AS gate_cards_to_rule
),
verdict AS (
  SELECT
    CASE
      WHEN NOT COALESCE(f.scheduler_on, true)                       THEN 'scheduler_off'
      WHEN NOT f.meter_limiter_off AND f.reading_age_hours > f.meter_stale_hours                THEN 'meter_stale'
      WHEN NOT f.meter_limiter_off AND f.gated_pct >= f.wall_pct                                THEN 'weekly_wall'
      -- SES-368 / M5-16, restored by SES-410: the pace grades the same number the wall did and
      -- REFUSES; NULL-safe like the wall. John 2026-09-16: "i never said remove the stop."
      WHEN NOT f.meter_limiter_off AND f.gated_pct >= f.pace_limit_pct                          THEN 'weekly_pace'
      WHEN NOT f.budget_row_exists                                  THEN 'no_budget_row'
      -- FEATURE: AGT-237 -- REFUSAL 6, and deliberately NOT under meter_limiter_off: that switch
      -- lifts John's spend walls, never the database's health. Anything but green -- red, amber,
      -- or unsafe (no reading inside the window) -- refuses. IS DISTINCT FROM, so a NULL level is
      -- a refusal and never a pass (fail closed, §19o).
      WHEN f.db_level IS DISTINCT FROM 'green'                      THEN 'db_pressure'
      -- FEATURE: AGT-127 -- the nothing-pickable slot SPLITS, AND IT SITS HERE AND NOWHERE EARLIER.
      -- Every wall above -- John's switch, the stale meter, the weekly wall, his pace stop, the
      -- missing budget row, the database -- is graded FIRST, so this branch can never boot a fire
      -- past one of them (pattern:80: the spend caps and budget walls are John's protections alone).
      -- With nothing to build and at least one gate card nobody has ruled, the fire boots to do
      -- exactly that one thing: detail.mode='rule-cards-only'. Zero such cards and the answer is
      -- 'nothing_pickable', byte-for-byte the verdict this line gave before.
      WHEN f.pickable_count = 0
       AND COALESCE(f.gate_cards_to_rule, 0) > 0                    THEN 'gate_cards_to_rule'
      WHEN f.pickable_count = 0                                     THEN 'nothing_pickable'
      WHEN f.cheapest_pct_of_week > f.weekly_headroom_pct           THEN 'unaffordable'
      ELSE 'pickable'
    END AS reason,
    f.*
  FROM facts f
)
SELECT
  v.reason IN ('pickable', 'gate_cards_to_rule') AS should_boot,
  v.reason,
  jsonb_build_object(
    'checked_at',           now(),
    'month',                v.month,
    'scheduler_on',         v.scheduler_on,
    'meter_limiter_off',    v.meter_limiter_off,
    'reading_taken_at',     v.reading_taken_at,
    'reading_age_hours',    v.reading_age_hours,
    'meter_stale_hours',    v.meter_stale_hours,
    'cap_authority',        'public.resolve_day_token_cap()',
    'all_models_pct',       v.all_models_pct,
    'fable_pct',            v.fable_pct,
    'gated_pct',            v.gated_pct,
    'gated_meter',          v.gated_meter,
    'judgment_model',       v.judgment_model,
    'judgment_reason',      v.judgment_reason,
    'fable_share',          v.fable_share,
    'orchestrator_model',   v.orchestrator_model,
    'orchestrator_reason',  v.orchestrator_reason,
    'db_level',             v.db_level,
    'db_reading_at',        v.db_reading_at,
    'db_age_minutes',       v.db_age_minutes,
    'db_reasons',           v.db_reasons,
    'weekly_rest_pct',      v.weekly_rest_pct,
    'final_day_rest_pct',   v.final_day_rest_pct,
    'wall_stop',            v.wall_stop,
    'wall_pct',             v.wall_pct,
    'budget_row_exists',    v.budget_row_exists,
    'weekly_headroom_pct',  v.weekly_headroom_pct,
    'week_started_at',      v.week_started_at,
    'week_day_index',       v.week_day_index,
    'pace_limit_pct',       v.pace_limit_pct,
    'pickable_count',       v.pickable_count,
    'unpriced_pickable',    v.unpriced_pickable,
    'gate_cards_to_rule',   v.gate_cards_to_rule,
    'mode',                 CASE WHEN v.reason = 'gate_cards_to_rule'
                                 THEN 'rule-cards-only' ELSE NULL END,
    'pct_per_cycle',        public.runner_pct_per_cycle(),
    'pick', (SELECT jsonb_build_object('backlog_id', n.ref, 'title', n.title, 'lane', n.lane,
                      'predicted_cycles', n.predicted_cycles, 'predicted_pct_of_week', n.pct_of_week)
               FROM next_pick n),
    'cheapest', (SELECT jsonb_build_object('backlog_id', c.ref, 'title', c.title,
                      'predicted_cycles', c.predicted_cycles, 'predicted_pct_of_week', c.pct_of_week)
               FROM cheapest c)
  ) AS detail
FROM verdict v;
$function$;

COMMENT ON FUNCTION public.runner_should_boot() IS
  'Pre-boot pickability gate (SES-297 / M6-09). EIGHT refusals in precedence order: scheduler_off, meter_stale (SES-389 / M5-15, runner_settings.meter_stale_hours), weekly_wall (M5-06), weekly_pace (M5-16), no_budget_row, db_pressure (AGT-237 / M6-14, runner_settings.db_health_thresholds), nothing_pickable, unaffordable (M5-06); otherwise pickable. STABLE and read-only -- it reads prime_directive_queue(), never drain_epic_next(uuid). It carries no token_cap: the ceiling has one home, public.resolve_day_token_cap().';

-- ---------------------------------------------------------------------------------------------
-- (8) Gate (b), second home: drain_chain_gate() gains Gate F `db-pressure`, same test, after E --
--     on BOTH continue paths (the drain pick and the §2e Prime Directive widening).
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.drain_chain_gate(p_cycle_id uuid)
 RETURNS TABLE(verdict text, reason text, gate_failed text, cycle_outcome text, drain_outcome text, drain_pick text, pick_title text, pick_design_status text, noship_streak integer, noship_max integer, undecided_cards integer, undecided_max integer, directive_id uuid, epic_id uuid, epic_name text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_me        public.runner_cycles%ROWTYPE;
  v_set       public.runner_settings%ROWTYPE;
  v_d         record;
  v_pick_ds   text;
  v_pick_t    text;
  v_streak    integer := 0;
  v_cards     integer := 0;
  v_last_ship timestamptz;
  v_max_streak integer;
  v_max_cards  integer;
  v_prime     boolean := false;
  v_sb_pick   text;
  v_sb_title  text;
  v_db        record;
  -- SES-281: kept identical to drain_epic_next's c_flagged, which is the whole point of the
  -- comment that has always sat here. 'needs-john' is retired (M6-01) and 'john-paced' was
  -- converted by migration ses281_m5_pick_enforcement; 'needs-desktop' is a physical constraint
  -- and still blocks.
  c_flagged   constant text[] := public.pick_blocking_flags();  -- AGT-88 (OD-15): single home
BEGIN
  IF p_cycle_id IS NULL THEN
    RAISE EXCEPTION 'drain_chain_gate: p_cycle_id is required (Gate A reads that row''s own outcome)';
  END IF;

  SELECT * INTO v_me FROM public.runner_cycles WHERE id = p_cycle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'drain_chain_gate: no runner_cycles row for % — close your row before calling', p_cycle_id;
  END IF;

  SELECT * INTO v_set FROM public.runner_settings WHERE id = 1;
  v_max_streak := v_set.chain_max_noship_streak;
  v_max_cards  := v_set.chain_max_undecided_cards;

  SELECT count(*)::integer INTO v_cards FROM public.runner_items WHERE decision IS NULL;

  SELECT max(c.started_at) INTO v_last_ship
    FROM public.runner_cycles c
   WHERE c.started_at <= v_me.started_at AND c.outcome = 'shipped';

  SELECT count(*)::integer INTO v_streak
    FROM public.runner_cycles c
   WHERE c.started_at <= v_me.started_at
     AND c.started_at >= v_me.started_at - INTERVAL '6 hours'
     AND (v_last_ship IS NULL OR c.started_at > v_last_ship)
     AND (c.trigger LIKE 'chained%' OR c.id = p_cycle_id)
     AND c.outcome IS DISTINCT FROM 'shipped';

  -- FEATURE: AGT-237 -- Gate F's input, read once from its one home (public.db_health_level()).
  SELECT d.level, d.reasons INTO v_db FROM public.db_health_level() d;

  -- GATE A — unchanged (SES-139).
  IF v_me.outcome IS NULL OR v_me.outcome NOT IN ('shipped', 'gated_before_build', 'reverted') THEN
    RETURN QUERY SELECT 'stop'::text,
      format('this cycle closed %s, so there is nothing to continue from', COALESCE(v_me.outcome, 'still open'))::text,
      'ran-a-cycle'::text, v_me.outcome, NULL::text, NULL::text, NULL::text, NULL::text,
      v_streak, v_max_streak, v_cards, v_max_cards, NULL::uuid, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  -- GATE B — drain first, unchanged; §2e widening below on failure.
  SELECT * INTO v_d FROM public.drain_epic_next(p_cycle_id);

  IF v_d.outcome IS DISTINCT FROM 'pick' THEN
    -- §2e (SES-238), reading SES-236's single home rather than an inline copy.
    SELECT q.prime_standing INTO v_prime
      FROM public.prime_directive_queue() q
     WHERE q.lane = 'board'
     LIMIT 1;
    v_prime := COALESCE(v_prime, false);

    IF v_prime THEN
      SELECT q.ref, q.title INTO v_sb_pick, v_sb_title
        FROM public.prime_directive_queue() q
       WHERE q.lane = 'selfbuild'
       ORDER BY q.pos
       LIMIT 1;

      IF v_sb_pick IS NOT NULL THEN
        -- Gates D, E and F still stand in front of a §2e continue.
        IF v_streak >= v_max_streak THEN
          RETURN QUERY SELECT 'stop'::text,
            format('%s cycles in a row have finished without shipping, so the chain is not making progress', v_streak)::text,
            'noship-streak'::text, v_me.outcome, v_d.outcome, v_sb_pick, v_sb_title, NULL::text,
            v_streak, v_max_streak, v_cards, v_max_cards, NULL::uuid, NULL::uuid, NULL::text;
          RETURN;
        END IF;
        IF v_max_cards IS NOT NULL AND v_cards >= v_max_cards THEN
          RETURN QUERY SELECT 'stop'::text,
            format('%s cards are already waiting on your decision (your ceiling is %s)', v_cards, v_max_cards)::text,
            'undecided-ceiling'::text, v_me.outcome, v_d.outcome, v_sb_pick, v_sb_title, NULL::text,
            v_streak, v_max_streak, v_cards, v_max_cards, NULL::uuid, NULL::uuid, NULL::text;
          RETURN;
        END IF;
        -- GATE F — AGT-237.
        IF v_db.level IS DISTINCT FROM 'green' THEN
          RETURN QUERY SELECT 'stop'::text,
            format('the database is %s, so the chain does not start more work into it (%s)',
                   COALESCE(v_db.level, 'unreadable'), COALESCE(array_to_string(v_db.reasons, '; '), 'no reasons'))::text,
            'db-pressure'::text, v_me.outcome, v_d.outcome, v_sb_pick, v_sb_title, NULL::text,
            v_streak, v_max_streak, v_cards, v_max_cards, NULL::uuid, NULL::uuid, NULL::text;
          RETURN;
        END IF;
        RETURN QUERY SELECT 'continue'::text,
          format('Prime Directive §2e: %s — %s is buildable work in an executing project, so the chain continues past the empty drain', v_sb_pick, COALESCE(v_sb_title,'(no stored title)'))::text,
          NULL::text, v_me.outcome, v_d.outcome, v_sb_pick, v_sb_title, NULL::text,
          v_streak, v_max_streak, v_cards, v_max_cards, NULL::uuid, NULL::uuid, NULL::text;
        RETURN;
      END IF;
    END IF;

    RETURN QUERY SELECT 'stop'::text,
      format('no standing drain has claimable work right now (%s)', v_d.outcome)::text,
      'drain-has-work'::text, v_me.outcome, v_d.outcome, NULL::text, NULL::text, NULL::text,
      v_streak, v_max_streak, v_cards, v_max_cards,
      v_d.directive_id, v_d.epic_id, v_d.epic_name;
    RETURN;
  END IF;

  SELECT b.design_status, public.backlog_display_title(b.title, b.description)
    INTO v_pick_ds, v_pick_t
    FROM public.backlog_items b
   WHERE b.backlog_id = v_d.backlog_id
   ORDER BY b.id LIMIT 1;

  -- GATE C — unchanged (SES-196).
  IF v_pick_ds = ANY(c_flagged) THEN
    RETURN QUERY SELECT 'stop'::text,
      format('the only work left in %s is %s — %s, and that one is waiting on you (%s)',
             COALESCE(v_d.epic_name, 'the standing drain'), v_d.backlog_id,
             COALESCE(v_pick_t, '(no stored title)'), v_pick_ds)::text,
      'pick-actionable'::text, v_me.outcome, v_d.outcome, v_d.backlog_id, v_pick_t, v_pick_ds,
      v_streak, v_max_streak, v_cards, v_max_cards, v_d.directive_id, v_d.epic_id, v_d.epic_name;
    RETURN;
  END IF;

  -- GATE D — unchanged.
  IF v_streak >= v_max_streak THEN
    RETURN QUERY SELECT 'stop'::text,
      format('%s cycles in a row have finished without shipping, so the chain is not making progress', v_streak)::text,
      'noship-streak'::text, v_me.outcome, v_d.outcome, v_d.backlog_id, v_pick_t, v_pick_ds,
      v_streak, v_max_streak, v_cards, v_max_cards, v_d.directive_id, v_d.epic_id, v_d.epic_name;
    RETURN;
  END IF;

  -- GATE E — unchanged.
  IF v_max_cards IS NOT NULL AND v_cards >= v_max_cards THEN
    RETURN QUERY SELECT 'stop'::text,
      format('%s cards are already waiting on your decision (your ceiling is %s)', v_cards, v_max_cards)::text,
      'undecided-ceiling'::text, v_me.outcome, v_d.outcome, v_d.backlog_id, v_pick_t, v_pick_ds,
      v_streak, v_max_streak, v_cards, v_max_cards, v_d.directive_id, v_d.epic_id, v_d.epic_name;
    RETURN;
  END IF;

  -- GATE F — AGT-237: the same test runner_should_boot() applies as refusal 6. Anything but green
  -- (red, amber, unsafe, or no answer at all) stops the chain; the cron resumes it once a whole
  -- window reads green.
  IF v_db.level IS DISTINCT FROM 'green' THEN
    RETURN QUERY SELECT 'stop'::text,
      format('the database is %s, so the chain does not start more work into it (%s)',
             COALESCE(v_db.level, 'unreadable'), COALESCE(array_to_string(v_db.reasons, '; '), 'no reasons'))::text,
      'db-pressure'::text, v_me.outcome, v_d.outcome, v_d.backlog_id, v_pick_t, v_pick_ds,
      v_streak, v_max_streak, v_cards, v_max_cards, v_d.directive_id, v_d.epic_id, v_d.epic_name;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'continue'::text,
    format('%s — %s is claimable in %s, and the chain is still shipping',
           v_d.backlog_id, COALESCE(v_pick_t, '(no stored title)'),
           COALESCE(v_d.epic_name, 'the standing drain'))::text,
    NULL::text, v_me.outcome, v_d.outcome, v_d.backlog_id, v_pick_t, v_pick_ds,
    v_streak, v_max_streak, v_cards, v_max_cards, v_d.directive_id, v_d.epic_id, v_d.epic_name;
END
$function$;

-- ---------------------------------------------------------------------------------------------
-- (9) Grants: functions default OPEN in this project (SES-315 addendum) -- revoke the three BY
--     NAME, grant service_role. runner_should_boot / drain_chain_gate were already closed; the
--     statements are repeated so the assertion below grades this migration, not history.
-- ---------------------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.db_health_parse(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.db_health_grade(jsonb, jsonb, integer, integer, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.db_health_tick() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.db_health_level() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.runner_should_boot() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.drain_chain_gate(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.db_health_parse(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.db_health_grade(jsonb, jsonb, integer, integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.db_health_tick() TO service_role;
GRANT EXECUTE ON FUNCTION public.db_health_level() TO service_role;
GRANT EXECUTE ON FUNCTION public.runner_should_boot() TO service_role;
GRANT EXECUTE ON FUNCTION public.drain_chain_gate(uuid) TO service_role;

-- ---------------------------------------------------------------------------------------------
-- (10) The register row. Statement byte-identical to docs/RUNNER-GOV-M6-REQUIREMENTS.md#M6-14.
-- ---------------------------------------------------------------------------------------------
INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT '028ffdbb-04b3-4f41-bc40-e2a9e3d64ba7'::uuid, 'governance_rules', 'M6-14',
       (SELECT to_jsonb(g) FROM public.governance_rules g WHERE g.id = 'M6-14');

INSERT INTO public.governance_rules (id, statement, canonical_doc, enforcement, status, source_group)
VALUES ('M6-14',
  'The runner never starts work into a database outage: `public.db_health_tick()` grades the database every five minutes from its own metrics and a REST probe (red at iowait ≥ 60% or a probe that fails or takes ≥ 10 s, amber at iowait ≥ 35%, a probe ≥ 3 s or no metrics; the numbers live in `runner_settings.db_health_thresholds`), and anything but green across the last 15 minutes makes `public.runner_should_boot()` refuse the boot as `db_pressure` and `public.drain_chain_gate()` stop the chain at Gate F, `db-pressure`.',
  'docs/RUNNER-GOV-M6-REQUIREMENTS.md#M6-14', 'script', 'live', 'selfbuild-m6-register')
ON CONFLICT (id) DO UPDATE
   SET statement = excluded.statement, canonical_doc = excluded.canonical_doc,
       enforcement = excluded.enforcement, status = excluded.status,
       source_group = excluded.source_group, updated_at = now();

-- ---------------------------------------------------------------------------------------------
-- (11) The schedule.
-- ---------------------------------------------------------------------------------------------
SELECT cron.schedule('db-health-tick', '*/5 * * * *', 'select public.db_health_tick()');

-- ---------------------------------------------------------------------------------------------
-- (12) Assert both directions; a failure here rolls the whole migration back.
-- ---------------------------------------------------------------------------------------------
DO $assert$
DECLARE
  f   text;
  r   text;
  n   integer;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.db_health_parse(text)',
    'public.db_health_grade(jsonb, jsonb, integer, integer, jsonb)',
    'public.db_health_tick()',
    'public.db_health_level()',
    'public.runner_should_boot()',
    'public.drain_chain_gate(uuid)'] LOOP
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_function_privilege(r, f, 'EXECUTE') THEN
        RAISE EXCEPTION 'AGT-237: % can still EXECUTE %', r, f;
      END IF;
    END LOOP;
    IF NOT has_function_privilege('service_role', f, 'EXECUTE') THEN
      RAISE EXCEPTION 'AGT-237: service_role cannot EXECUTE %', f;
    END IF;
  END LOOP;

  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_table_privilege(r, 'public.db_health_readings', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') THEN
      RAISE EXCEPTION 'AGT-237: % holds a privilege on public.db_health_readings', r;
    END IF;
  END LOOP;
  SELECT count(*) INTO n FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name = 'db_health_readings' AND grantee IN ('anon', 'authenticated');
  IF n <> 0 THEN
    RAISE EXCEPTION 'AGT-237: % anon/authenticated grant rows remain on public.db_health_readings', n;
  END IF;
  IF NOT has_table_privilege('service_role', 'public.db_health_readings', 'SELECT') THEN
    RAISE EXCEPTION 'AGT-237: service_role cannot read public.db_health_readings';
  END IF;

  FOREACH f IN ARRAY ARRAY['runner_should_boot', 'drain_chain_gate', 'db_health_parse', 'db_health_grade',
                           'db_health_tick', 'db_health_level'] LOOP
    SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.proname = f;
    IF n <> 1 THEN
      RAISE EXCEPTION 'AGT-237: public.% has % overloads, expected 1 (.claude/rules/supabase-function-signature.md)', f, n;
    END IF;
  END LOOP;

  SELECT count(*) INTO n FROM cron.job WHERE jobname = 'db-health-tick' AND schedule = '*/5 * * * *';
  IF n <> 1 THEN
    RAISE EXCEPTION 'AGT-237: cron job db-health-tick is not scheduled */5 (found %)', n;
  END IF;
END
$assert$;
