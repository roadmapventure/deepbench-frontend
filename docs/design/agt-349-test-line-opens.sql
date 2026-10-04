-- DeepBench v7.0.765 | docs/design/agt-349-test-line-opens.sql | AGT-349
-- Migration `agt349_test_line_opens`. The test line opens up on its own: every five minutes, a
-- minute behind `db-health-tick`, `public.test_slot_tune()` moves
-- `runner_settings.test_slot_capacity` one step at a time between floor 1 and
-- `runner_settings.test_slot_ceiling` (John, 2026-10-03: ceiling 5). The allowance, the acquire
-- and scripts/test-slot.js do not change -- they already read that column.
--
-- The statements from `SET LOCAL lock_timeout` to the closing DO are what was sent to
-- `apply_migration`; this header was not.
--
-- DOWN: `public.capture_migration_down()` was called BEFORE the apply for the new function and the
-- new table. It refuses in-place ALTERs and knows nothing of cron, so the whole undo is stated here:
--   SELECT cron.unschedule('test-slot-tune'); DROP FUNCTION public.test_slot_tune(); DROP TABLE public.test_slot_moves; ALTER TABLE public.runner_settings DROP COLUMN test_slot_ceiling, DROP COLUMN test_slot_tuning;

SET LOCAL lock_timeout = '5s';

-- (1) The ceiling (John's number) and the tuning knobs (the Designer's). Columns, never literals.
ALTER TABLE public.runner_settings
  ADD COLUMN test_slot_ceiling smallint NOT NULL DEFAULT 5,
  ADD COLUMN test_slot_tuning jsonb NOT NULL DEFAULT '{"enabled":true,"wait_minutes":20,"cooloff_hours":24,"up_swap_used_mb":650,"up_swapin_per_s":675,"up_iowait_pct":16}'::jsonb;

COMMENT ON COLUMN public.runner_settings.test_slot_ceiling IS
  'AGT-349: the most suite slots test_slot_tune() may ever set test_slot_capacity to. John''s number (2026-10-03: 5).';
COMMENT ON COLUMN public.runner_settings.test_slot_tuning IS
  'AGT-349: how test_slot_tune() moves test_slot_capacity. enabled; wait_minutes between moves and the green run an up needs; cooloff_hours a down or lock bars the level it left; up_* the headroom every reading in the run must be under.';

-- (2) Every move the tuner makes, with the readings it judged.
CREATE TABLE public.test_slot_moves (
  id bigserial PRIMARY KEY,
  moved_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL CHECK (action IN ('up','down','lock','ceiling')),
  from_capacity smallint NOT NULL,
  to_capacity smallint NOT NULL,
  reading_id bigint,
  evidence jsonb NOT NULL,
  decision_id uuid
);

COMMENT ON TABLE public.test_slot_moves IS
  'AGT-349: one row per write test_slot_tune() made to runner_settings.test_slot_capacity. A down or lock row bars raising back through the level it left for test_slot_tuning.cooloff_hours.';

-- (3) The rule. First match wins; `hold` writes nothing.
CREATE OR REPLACE FUNCTION public.test_slot_tune()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_cap      integer;
  v_ceiling  integer;
  k          jsonb;
  v_wait     numeric;
  v_cool     numeric;
  v_swap     numeric;
  v_swapin   numeric;
  v_iowait   numeric;
  v_level    text;
  n          public.db_health_readings%ROWTYPE;
  p          public.db_health_readings%ROWTYPE;
  v_last     bigint;
  v_held     integer;
  v_waiting  integer;
  v_count    integer;
  v_bad      integer;
  v_action   text;
  v_to       integer;
  v_why      text;
  v_reading  bigint;
  v_ev       jsonb;
  v_decision uuid;
BEGIN
  SELECT s.test_slot_capacity, s.test_slot_ceiling, s.test_slot_tuning
    INTO v_cap, v_ceiling, k
    FROM public.runner_settings s WHERE s.id = 1;

  -- 1. one tuner at a time, and only while switched on.
  IF NOT pg_try_advisory_xact_lock(349) THEN
    RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap, 'why', 'another tune is running');
  END IF;
  IF (k ->> 'enabled') IS DISTINCT FROM 'true' THEN
    RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap, 'why', 'tuning is switched off');
  END IF;

  -- n = the newest graded reading, p = the graded reading before it.
  SELECT d.* INTO n FROM public.db_health_readings d
   WHERE d.level IS NOT NULL ORDER BY d.fired_at DESC, d.id DESC LIMIT 1;
  IF n.id IS NOT NULL THEN
    SELECT d.* INTO p FROM public.db_health_readings d
     WHERE d.level IS NOT NULL AND d.id <> n.id AND d.fired_at <= n.fired_at
     ORDER BY d.fired_at DESC, d.id DESC LIMIT 1;
  END IF;

  SELECT count(*) FILTER (WHERE t.state = 'held')::integer,
         count(*) FILTER (WHERE t.state = 'waiting')::integer
    INTO v_held, v_waiting
    FROM public.test_slots t
   WHERE t.heartbeat_at >= now() - interval '10 minutes';

  IF v_cap > v_ceiling THEN
    -- 2. above the ceiling: come down to it, whatever the health.
    v_action := 'ceiling';
    v_to := v_ceiling;
    v_why := format('capacity %s is above the ceiling %s', v_cap, v_ceiling);
  ELSE
    -- 3. no reading, or a level that cannot be trusted: touch nothing (§19o).
    SELECT h.level INTO v_level FROM public.db_health_level() h;
    IF n.id IS NULL OR v_level IS NULL OR v_level = 'unsafe' THEN
      RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap,
        'why', format('no trustworthy health reading (level %s)', coalesce(v_level, 'unreadable')));
    END IF;

    -- 4. a red or amber reading is acted on once.
    SELECT max(m.reading_id) INTO v_last FROM public.test_slot_moves m;
    IF n.level IN ('red', 'amber') AND n.id <= coalesce(v_last, -1) THEN
      RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap,
        'why', format('reading %s (%s) was already acted on', n.id, n.level));
    END IF;

    IF n.level = 'red' THEN
      -- 5. red locks the line at one.
      IF v_cap > 1 OR p.level IS DISTINCT FROM 'red' THEN
        v_action := 'lock';
        v_to := 1;
        v_why := format('reading %s is red', n.id);
      ELSE
        RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap,
          'why', 'still red, already locked at 1');
      END IF;
    ELSIF n.level = 'amber' THEN
      -- 6. amber steps down one; a second amber in a row goes straight to one.
      v_to := CASE WHEN p.level = 'amber' THEN 1 ELSE GREATEST(1, v_cap - 1) END;
      IF v_to <> v_cap THEN
        v_action := 'down';
        v_why := CASE WHEN p.level = 'amber' THEN format('readings %s and %s are both amber', p.id, n.id)
                      ELSE format('reading %s is amber', n.id) END;
      ELSE
        RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap,
          'why', 'amber, already at 1');
      END IF;
    ELSIF n.level = 'green' THEN
      -- 7. green steps up one, only when every test below holds.
      v_wait   := (k ->> 'wait_minutes')::numeric;
      v_cool   := (k ->> 'cooloff_hours')::numeric;
      v_swap   := (k ->> 'up_swap_used_mb')::numeric;
      v_swapin := (k ->> 'up_swapin_per_s')::numeric;
      v_iowait := (k ->> 'up_iowait_pct')::numeric;
      IF v_wait IS NULL OR v_cool IS NULL OR v_swap IS NULL OR v_swapin IS NULL OR v_iowait IS NULL THEN
        RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap,
          'why', 'a test_slot_tuning key is missing');
      END IF;
      -- a.
      IF v_cap >= v_ceiling THEN
        RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap,
          'why', format('at the ceiling %s', v_ceiling));
      END IF;
      IF v_level <> 'green' THEN
        RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap,
          'why', format('the health window is %s', v_level));
      END IF;
      -- b.
      IF v_held < v_cap OR v_waiting < 1 THEN
        RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap,
          'why', format('no queue to open for (held %s of %s, waiting %s)', v_held, v_cap, v_waiting));
      END IF;
      -- c.
      IF EXISTS (SELECT 1 FROM public.test_slot_moves m
                  WHERE m.moved_at >= now() - (v_wait * interval '1 minute')) THEN
        RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap,
          'why', format('a move was made inside the last %s minutes', v_wait));
      END IF;
      -- d.
      IF EXISTS (SELECT 1 FROM public.test_slot_moves m
                  WHERE m.action IN ('down', 'lock') AND m.from_capacity <= v_cap + 1
                    AND m.moved_at >= now() - (v_cool * interval '1 hour')) THEN
        RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap,
          'why', format('%s is cooling off: the line came down from it inside the last %s hours', v_cap + 1, v_cool));
      END IF;
      -- e. W = every reading of the last wait_minutes up to n. A NULL fails.
      SELECT count(*)::integer,
             (count(*) FILTER (WHERE NOT coalesce(
                d.level = 'green'
                AND (d.swap_total_bytes - d.swap_free_bytes) / 1000000.0 < v_swap
                AND d.pswpin_per_s < v_swapin
                AND d.iowait_pct < v_iowait, false)))::integer,
             jsonb_agg(jsonb_build_object(
               'id', d.id, 'fired_at', d.fired_at, 'level', d.level, 'reasons', d.reasons,
               'swap_mb', round((d.swap_total_bytes - d.swap_free_bytes) / 1000000.0, 1),
               'pswpin_per_s', d.pswpin_per_s, 'iowait_pct', d.iowait_pct) ORDER BY d.fired_at, d.id)
        INTO v_count, v_bad, v_ev
        FROM public.db_health_readings d
       WHERE d.fired_at >= now() - (v_wait * interval '1 minute') AND d.fired_at <= n.fired_at;
      IF v_count < v_wait / 5 - 1 THEN
        RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap,
          'why', format('only %s readings in the last %s minutes', v_count, v_wait));
      END IF;
      IF v_bad > 0 THEN
        RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap,
          'why', format('%s of %s readings in the last %s minutes lack headroom', v_bad, v_count, v_wait));
      END IF;
      v_action := 'up';
      v_to := v_cap + 1;
      v_why := format('%s green readings with headroom, %s held, %s waiting', v_count, v_held, v_waiting);
    ELSE
      RETURN jsonb_build_object('action', 'hold', 'from', v_cap, 'to', v_cap,
        'why', format('reading %s has an unknown level %s', n.id, n.level));
    END IF;
  END IF;

  -- A write: the decision, the before-image, the setting, the move -- in that order.
  IF v_action <> 'up' THEN
    SELECT jsonb_agg(jsonb_build_object(
             'id', d.id, 'fired_at', d.fired_at, 'level', d.level, 'reasons', d.reasons,
             'swap_mb', round((d.swap_total_bytes - d.swap_free_bytes) / 1000000.0, 1),
             'pswpin_per_s', d.pswpin_per_s, 'iowait_pct', d.iowait_pct) ORDER BY d.fired_at, d.id)
      INTO v_ev
      FROM public.db_health_readings d WHERE d.id IN (n.id, p.id);
  END IF;
  v_ev := jsonb_build_object('readings', coalesce(v_ev, '[]'::jsonb), 'held', v_held, 'waiting', v_waiting);
  v_reading := CASE WHEN v_action = 'ceiling' THEN NULL ELSE n.id END;

  v_decision := public.record_decision(NULL, 'test-slot-tune', 'concurrency', 'AGT-349',
    format('Test line %s -> %s (%s): %s', v_cap, v_to, v_action, v_why), v_ev::text, NULL);

  INSERT INTO public.runner_before_images (session_name, table_name, pk_value, row_data, decision_id)
  SELECT 'test-slot-tune', 'runner_settings', '1', to_jsonb(s), v_decision
    FROM public.runner_settings s WHERE s.id = 1;

  UPDATE public.runner_settings SET test_slot_capacity = v_to, updated_at = now() WHERE id = 1;

  INSERT INTO public.test_slot_moves (action, from_capacity, to_capacity, reading_id, evidence, decision_id)
  VALUES (v_action, v_cap, v_to, v_reading, v_ev, v_decision);

  RETURN jsonb_build_object('action', v_action, 'from', v_cap, 'to', v_to, 'why', v_why);
END
$function$;

COMMENT ON FUNCTION public.test_slot_tune() IS
  'AGT-349: moves runner_settings.test_slot_capacity one step between 1 and test_slot_ceiling from the graded health readings and the test line''s own queue. Returns {action, from, to, why}; action hold writes nothing. Every write records a decision, a before-image and a test_slot_moves row.';

-- (4) The seed: today's hand raise to 2 (64c02b5c) went red in five minutes, so 2 is barred until
--     21:35Z on 2026-10-04.
INSERT INTO public.test_slot_moves (moved_at, action, from_capacity, to_capacity, evidence) VALUES ('2026-10-03 21:35:00+00', 'down', 2, 1, '{"source":"hand raise 64c02b5c"}');

-- (5) Every five minutes, a minute behind `db-health-tick`.
SELECT cron.schedule('test-slot-tune', '1-56/5 * * * *', 'select public.test_slot_tune()');

-- (6) Grants by name (.claude/rules/supabase-column-grants.md): functions default OPEN to the
--     public keys, and a new table comes up with public SELECT.
REVOKE ALL ON TABLE public.test_slot_moves FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.test_slot_moves_id_seq FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.test_slot_tune() FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.test_slot_moves TO service_role;
GRANT EXECUTE ON FUNCTION public.test_slot_tune() TO service_role;

-- (7) Assert both directions, one pg_proc row and one cron.job row -- never trust the success flag.
DO $agt349$
DECLARE
  c_fn   integer;
  c_job  integer;
  c_acl  integer;
BEGIN
  SELECT count(*) INTO c_fn FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'test_slot_tune' AND p.prokind = 'f';
  IF c_fn <> 1 THEN
    RAISE EXCEPTION 'AGT-349: public.test_slot_tune has % overloads, expected 1', c_fn;
  END IF;

  SELECT count(*) INTO c_job FROM cron.job j
   WHERE j.jobname = 'test-slot-tune' AND j.schedule = '1-56/5 * * * *'
     AND j.command = 'select public.test_slot_tune()' AND j.active;
  IF c_job <> 1 THEN
    RAISE EXCEPTION 'AGT-349: % active cron.job rows named test-slot-tune on 1-56/5, expected 1', c_job;
  END IF;

  IF has_function_privilege('anon', 'public.test_slot_tune()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.test_slot_tune()', 'EXECUTE') THEN
    RAISE EXCEPTION 'AGT-349: the public keys still hold EXECUTE on test_slot_tune() -- the REVOKE did not take';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.test_slot_tune()', 'EXECUTE') THEN
    RAISE EXCEPTION 'AGT-349: service_role lacks EXECUTE on test_slot_tune() -- the GRANT did not take';
  END IF;

  SELECT count(*) INTO c_acl FROM information_schema.role_table_grants g
   WHERE g.table_schema = 'public' AND g.table_name = 'test_slot_moves'
     AND g.grantee IN ('PUBLIC', 'anon', 'authenticated');
  IF c_acl <> 0 THEN
    RAISE EXCEPTION 'AGT-349: the public keys hold % grants on test_slot_moves, expected 0', c_acl;
  END IF;
  IF has_sequence_privilege('anon', 'public.test_slot_moves_id_seq', 'USAGE')
     OR has_sequence_privilege('authenticated', 'public.test_slot_moves_id_seq', 'USAGE') THEN
    RAISE EXCEPTION 'AGT-349: the public keys can still use test_slot_moves_id_seq';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.test_slot_moves', 'SELECT') THEN
    RAISE EXCEPTION 'AGT-349: service_role cannot read test_slot_moves -- the GRANT did not take';
  END IF;

  IF (SELECT count(*) FROM public.test_slot_moves) <> 1 THEN
    RAISE EXCEPTION 'AGT-349: test_slot_moves must hold exactly the seed row';
  END IF;
  RAISE NOTICE 'AGT-349: test_slot_tune live, capacity % ceiling %',
    (SELECT s.test_slot_capacity FROM public.runner_settings s WHERE s.id = 1),
    (SELECT s.test_slot_ceiling FROM public.runner_settings s WHERE s.id = 1);
END
$agt349$;
