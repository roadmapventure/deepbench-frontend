-- DeepBench v7.0.739 | docs/design/agt-273-test-slot-health-ladder.sql | AGT-273
-- Migration `agt273_test_slot_health_ladder`. APPLIED 2026-09-30 ~02:58Z by attended session
-- agt273-slot-ladder-0930 (supervised cycle 9351be06), after the 2026-09-29 attempt failed on a
-- connection timeout. The statements below (1)-(5) are what was applied; the header comments above
-- (1) were not sent. Verified after the apply, not from the success flag: one pg_proc row each for
-- test_slot_acquire and test_slot_allowance, anon/authenticated hold no EXECUTE on the allowance,
-- service_role does, and the schema_migrations row exists.
--
-- The database's health now sets the SLOT COUNT instead of switching the suite off: capacity is
-- read from one home that narrows with health, so amber runs one suite instead of none, and red
-- and an unreadable level still grant nothing (narrowed, never removed -- §19o fail closed).
--
-- Applied on the ORCHESTRATOR lane. Gate card `afb6f649` was ruled rework because the prior
-- kickoff (v7.0.730) put this DDL on a build lane, which reaches Supabase over PostgREST only;
-- the runner cycle itself holds `apply_migration`, so the migration is its task, not a blocker.
--
-- DOWN: captured by `public.capture_migration_down()` into `runner_migration_downs` BEFORE this
-- ran (class `auto-downable`, 1 object, 0 refusals) -- it carries today's `test_slot_acquire`
-- body. `capture_migration_down()` refuses in-place ALTERs, so the column's undo is stated here:
--   ALTER TABLE public.runner_settings DROP COLUMN test_slot_ladder;
--   DROP FUNCTION IF EXISTS public.test_slot_allowance();

-- (1) The rungs. Columns, never literals (pattern:1). Green is deliberately NOT a key: its home
--     stays `runner_settings.test_slot_capacity`, which is John's knob.
ALTER TABLE public.runner_settings
  ADD COLUMN IF NOT EXISTS test_slot_ladder jsonb NOT NULL
  DEFAULT '{"amber":1,"red":0,"unsafe":0}'::jsonb;

COMMENT ON COLUMN public.runner_settings.test_slot_ladder IS
  'AGT-273: suite slots at each NON-green health level. Green is not a key here -- it stays test_slot_capacity. A level absent from this map grants 0 (fail closed, ARCHITECTURE.md §19o).';

-- (2) One home for "how many suites may run at this health level".
CREATE OR REPLACE FUNCTION public.test_slot_allowance()
 RETURNS TABLE(level text, capacity integer, source text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH d AS (SELECT h.level FROM public.db_health_level() h),
       s AS (SELECT r.test_slot_capacity, r.test_slot_ladder
               FROM public.runner_settings r WHERE r.id = 1),
       rung AS (SELECT (s.test_slot_ladder -> d.level) AS entry FROM d, s)
  SELECT d.level,
         CASE WHEN d.level IS NULL        THEN 0
              WHEN d.level = 'green'      THEN s.test_slot_capacity
              WHEN rung.entry IS NULL     THEN 0
              ELSE LEAST(s.test_slot_capacity, (rung.entry #>> '{}')::int) END,
         CASE WHEN d.level IS NULL        THEN 'fail-closed'
              WHEN d.level = 'green'      THEN 'runner_settings'
              WHEN rung.entry IS NULL     THEN 'fail-closed'
              ELSE 'test_slot_ladder' END
    FROM d, s, rung
$function$;

COMMENT ON FUNCTION public.test_slot_allowance() IS
  'AGT-273: the suite slots the current database health allows. green -> runner_settings.test_slot_capacity (source runner_settings); a level keyed in runner_settings.test_slot_ladder -> LEAST(test_slot_capacity, that key) (source test_slot_ladder); a NULL or unmapped level -> 0 (source fail-closed, ARCHITECTURE.md §19o).';

-- (3) The gate. Identity args and return columns are unchanged, so this REPLACES and never adds an
--     overload (.claude/rules/supabase-function-signature.md); the DO at the end asserts that.
CREATE OR REPLACE FUNCTION public.test_slot_acquire(p_holder text, p_cycle_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(granted boolean, level text, capacity integer, held integer, "position" integer, expired text[])
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_expired text[];
  v_level   text;
  v_cap     integer;
  v_held    integer;
  v_pos     integer;
  v_state   text;
  v_req     timestamptz;
BEGIN
  IF p_holder IS NULL OR btrim(p_holder) = '' THEN
    RAISE EXCEPTION 'test_slot_acquire: p_holder is required';
  END IF;

  PERFORM pg_advisory_xact_lock(265);

  WITH d AS (
    DELETE FROM public.test_slots t
     WHERE t.heartbeat_at < now() - interval '10 minutes'
    RETURNING t.holder
  )
  SELECT coalesce(array_agg(d.holder ORDER BY d.holder), ARRAY[]::text[]) INTO v_expired FROM d;

  INSERT INTO public.test_slots AS t (holder, cycle_id)
  VALUES (p_holder, p_cycle_id)
  ON CONFLICT (holder) DO UPDATE
     SET heartbeat_at = now(),
         cycle_id     = coalesce(excluded.cycle_id, t.cycle_id);

  -- AGT-273: the level and the capacity arrive together from one home. Green returns
  -- test_slot_capacity unchanged; a non-green level returns the ladder's narrowed number; an
  -- unreadable level returns 0, which the coalesce below turns into a refusal.
  SELECT a.level, a.capacity INTO v_level, v_cap FROM public.test_slot_allowance() a;
  SELECT count(*)::integer INTO v_held FROM public.test_slots t WHERE t.state = 'held';
  SELECT t.state, t.requested_at INTO v_state, v_req FROM public.test_slots t WHERE t.holder = p_holder;
  SELECT 1 + count(*)::integer INTO v_pos
    FROM public.test_slots t
   WHERE t.state = 'waiting'
     AND t.holder <> p_holder
     AND (t.requested_at, t.holder) < (v_req, p_holder);

  IF v_state = 'held' THEN
    RETURN QUERY SELECT true, v_level, v_cap, v_held, v_pos, v_expired;
    RETURN;
  END IF;

  -- Fail closed (§19o): a NULL level or capacity is never a grant. AGT-273 removed the green-only
  -- test -- red and an unreadable level now arrive as capacity 0 from the allowance, so
  -- coalesce(v_cap, 0) is the whole of the stop and amber grants at its narrowed capacity.
  IF v_held < coalesce(v_cap, 0) AND v_pos = 1 THEN
    UPDATE public.test_slots t SET state = 'held', granted_at = now() WHERE t.holder = p_holder;
    RETURN QUERY SELECT true, v_level, v_cap, v_held + 1, v_pos, v_expired;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, v_level, v_cap, v_held, v_pos, v_expired;
END
$function$;

-- (4) Grants by name, the same shape `db_health_level()` carries: a function body and a health
--     reading are not public material (.claude/rules/supabase-column-grants.md).
REVOKE EXECUTE ON FUNCTION public.test_slot_allowance() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.test_slot_allowance() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.test_slot_allowance() TO service_role;

-- (5) Assert both directions, and one pg_proc row per function -- never trust the success flag.
DO $agt273$
DECLARE
  c_acquire   integer;
  c_allowance integer;
  lvl         text;
  cap         integer;
  src         text;
BEGIN
  SELECT count(*) INTO c_acquire FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'test_slot_acquire' AND p.prokind = 'f';
  IF c_acquire <> 1 THEN
    RAISE EXCEPTION 'AGT-273: public.test_slot_acquire has % overloads, expected 1', c_acquire;
  END IF;

  SELECT count(*) INTO c_allowance FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'test_slot_allowance' AND p.prokind = 'f';
  IF c_allowance <> 1 THEN
    RAISE EXCEPTION 'AGT-273: public.test_slot_allowance has % overloads, expected 1', c_allowance;
  END IF;

  IF has_function_privilege('anon', 'public.test_slot_allowance()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.test_slot_allowance()', 'EXECUTE') THEN
    RAISE EXCEPTION 'AGT-273: the public keys still hold EXECUTE on test_slot_allowance() -- the REVOKE did not take';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.test_slot_allowance()', 'EXECUTE') THEN
    RAISE EXCEPTION 'AGT-273: service_role lost EXECUTE on test_slot_allowance() -- the GRANT did not take';
  END IF;

  SELECT a.level, a.capacity, a.source INTO lvl, cap, src FROM public.test_slot_allowance() a;
  IF lvl IS NULL OR cap IS NULL OR src IS NULL THEN
    RAISE EXCEPTION 'AGT-273: test_slot_allowance() returned no row (level %, capacity %, source %)', lvl, cap, src;
  END IF;
  RAISE NOTICE 'AGT-273: allowance reads level=% capacity=% source=%', lvl, cap, src;
END
$agt273$;
