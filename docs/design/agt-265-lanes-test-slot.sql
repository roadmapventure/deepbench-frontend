-- DeepBench v7.0.689 | docs/design/agt-265-lanes-test-slot.sql | AGT-265 — migration agt265_lanes_test_slot, mirrored byte-identical
--
-- FEATURE: AGT-265 -- four runner lanes build in parallel; test-suite runs wait in ONE line for a
-- green database. (a) runner_should_boot() refuses `lanes_full` once live runner lanes reach
-- runner_settings.max_lanes; (b) public.test_slots + test_slot_acquire()/test_slot_release() are the
-- line a regression run queues in (scripts/test-slot.js is its one client); (c) ticket_matrix shows
-- a built ticket waiting for, or holding, a test slot.
--
-- Down captured FIRST by public.capture_migration_down(cycle 94b937b2, 'agt265_lanes_test_slot')
-- for runner_should_boot(), ticket_matrix, test_slot_acquire(text, uuid), test_slot_release(text)
-- and test_slots. Not in that down, by construction of the capture (an in-place ALTER of an
-- existing table is refused): the two runner_settings columns -- their undo is
--   ALTER TABLE public.runner_settings DROP COLUMN max_lanes, DROP COLUMN test_slot_capacity;
-- and the captured ticket_matrix down must run AFTER `DROP VIEW public.ticket_matrix` or with the
-- trailing lane_status column dropped first (CREATE OR REPLACE VIEW cannot remove a column).
--
-- runner_should_boot() is the live body with three additions only (the `lanes` CTE, two facts, the
-- `lanes_full` branch right after `db_pressure`, two detail keys). The `hard_stop` branch John's
-- migration john_hard_stop_pct_20260927 added live is PRESERVED verbatim.
--
-- Governing: ARCHITECTURE.md §19v (B42), §19o (fail closed), §19b;
-- .claude/rules/supabase-column-grants.md (tables AND functions default open -- every new object
-- revokes anon/authenticated BY NAME, the trailing DO asserts both directions);
-- .claude/rules/supabase-function-signature.md (one overload each, asserted).

-- ---------------------------------------------------------------------------------------------
-- (1) The two numbers, one home each: live lanes allowed, test slots at once.
-- ---------------------------------------------------------------------------------------------
INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT '94b937b2-8086-476c-b7c5-b763dd690dc9'::uuid, 'runner_settings', s.id::text, to_jsonb(s)
  FROM public.runner_settings s WHERE s.id = 1;

ALTER TABLE public.runner_settings
  ADD COLUMN IF NOT EXISTS max_lanes smallint NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS test_slot_capacity smallint NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.runner_settings.max_lanes IS
  'AGT-265: runner_should_boot() refuses lanes_full when this many runner-stamped cycles are open with a heartbeat inside 20 minutes.';
COMMENT ON COLUMN public.runner_settings.test_slot_capacity IS
  'AGT-265: how many regression-suite runs may hold a test slot at once (public.test_slot_acquire()).';

-- ---------------------------------------------------------------------------------------------
-- (2) The line. One row per holder; a row whose heartbeat is 10 minutes old is a dead lease.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_slots (
  holder        text PRIMARY KEY,
  cycle_id      uuid,
  state         text NOT NULL DEFAULT 'waiting' CHECK (state IN ('waiting', 'held')),
  requested_at  timestamptz NOT NULL DEFAULT now(),
  heartbeat_at  timestamptz NOT NULL DEFAULT now(),
  granted_at    timestamptz
);

REVOKE ALL ON public.test_slots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_slots TO service_role;

COMMENT ON TABLE public.test_slots IS
  'AGT-265: the one line regression-suite runs wait in. state waiting|held; a heartbeat older than 10 minutes expires the row at the next acquire.';

-- ---------------------------------------------------------------------------------------------
-- (3) Acquire = join the line, beat, and take the slot iff the database is green, a slot is free
--     and you are first. Serialized by one advisory lock, so two callers can never both take the
--     last slot. Calling it again is the heartbeat.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.test_slot_acquire(p_holder text, p_cycle_id uuid DEFAULT NULL)
RETURNS TABLE(granted boolean, level text, capacity integer, held integer, "position" integer, expired text[])
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog, public
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

  SELECT d.level INTO v_level FROM public.db_health_level() d;
  SELECT s.test_slot_capacity INTO v_cap FROM public.runner_settings s WHERE s.id = 1;
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

  -- Fail closed (§19o): a NULL level or capacity is never a grant.
  IF v_level IS NOT DISTINCT FROM 'green' AND v_held < coalesce(v_cap, 0) AND v_pos = 1 THEN
    UPDATE public.test_slots t SET state = 'held', granted_at = now() WHERE t.holder = p_holder;
    RETURN QUERY SELECT true, v_level, v_cap, v_held + 1, v_pos, v_expired;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, v_level, v_cap, v_held, v_pos, v_expired;
END
$function$;

COMMENT ON FUNCTION public.test_slot_acquire(text, uuid) IS
  'AGT-265: join the test-slot line (or beat an existing place in it) and take a slot iff db_health_level() is green, fewer than runner_settings.test_slot_capacity are held and the caller is first. Rows 10 minutes without a beat expire first.';

-- ---------------------------------------------------------------------------------------------
-- (4) Release = leave the line, held or waiting. Returns the rows deleted (0 or 1).
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.test_slot_release(p_holder text)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog, public
AS $function$
DECLARE
  n integer;
BEGIN
  PERFORM pg_advisory_xact_lock(265);
  DELETE FROM public.test_slots t WHERE t.holder = p_holder;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$function$;

COMMENT ON FUNCTION public.test_slot_release(text) IS
  'AGT-265: leave the test-slot line (held or waiting). Returns the rows deleted.';

-- ---------------------------------------------------------------------------------------------
-- (5) The boot gate: the live body, plus the lanes count and refusal `lanes_full`.
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
  SELECT s.scheduler_on, s.meter_stale_hours, s.meter_limiter_off, s.max_lanes FROM public.runner_settings s WHERE s.id = 1
),
-- FEATURE: AGT-265 -- the live runner lanes: open runner-stamped cycles whose heartbeat (or start)
-- is inside 20 minutes (SES-103's stall line). A cycle that died without closing stops counting.
lanes AS (
  SELECT count(*)::int AS n
    FROM public.runner_cycles rc
   WHERE rc.ended_at IS NULL
     AND rc.stamp LIKE 'DEEPBENCH-RUNNER-AUTOMATED-%'
     AND coalesce(rc.heartbeat_at, rc.started_at) > now() - interval '20 minutes'
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
    (SELECT l.n FROM lanes l)                                       AS live_lanes,
    (SELECT s.max_lanes FROM settings s)                            AS max_lanes,
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
      -- FEATURE: John 2026-09-27 "stop it at 98%" -- NOT under meter_limiter_off.
      WHEN (SELECT hs.hard_stop_pct FROM public.runner_settings hs WHERE hs.id = 1) IS NOT NULL
       AND f.gated_pct >= (SELECT hs.hard_stop_pct FROM public.runner_settings hs WHERE hs.id = 1) THEN 'hard_stop'
      WHEN f.db_level IS DISTINCT FROM 'green'                      THEN 'db_pressure'
      -- FEATURE: AGT-265 -- live runner lanes at or past runner_settings.max_lanes. NOT under
      -- meter_limiter_off: it is a concurrency cap, not a spend wall.
      WHEN f.live_lanes >= f.max_lanes                              THEN 'lanes_full'
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
    'live_lanes',           v.live_lanes,
    'max_lanes',            v.max_lanes,
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

-- ---------------------------------------------------------------------------------------------
-- (6) ticket_matrix: the live view plus one trailing column, lane_status.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.ticket_matrix AS
 SELECT b.backlog_id,
    b.title,
    e.name AS epic,
    b.status,
    b.design_status,
    b.size_stamp AS dev_size,
    b.scope_origin,
    b.filed_at,
    b.predicted_cycles,
    round(b.predicted_cycles::numeric * runner_pct_per_cycle(), 2) AS predicted_pct_of_week,
    round(b.predicted_cycles::numeric * runner_pct_per_cycle() * tokens_per_pct()) AS predicted_tokens,
    c.actual_cycles,
    c.cycle_pct_of_week,
    c.attended_pct_of_week,
    c.total_pct_of_week AS actual_pct_of_week,
    c.calibrated_tokens AS actual_tokens,
        CASE
            WHEN b.predicted_cycles IS NULL OR c.actual_cycles = 0 THEN NULL::integer
            ELSE c.actual_cycles - b.predicted_cycles
        END AS cycle_variance,
        CASE
            WHEN b.predicted_cycles IS NULL OR c.actual_cycles = 0 THEN NULL::numeric
            ELSE round(c.total_pct_of_week - b.predicted_cycles::numeric * runner_pct_per_cycle(), 2)
        END AS pct_variance,
    b.defer_status,
    b.defer_reason,
    b.tier,
    b.queue,
    b.blocked_by,
    b.scope_rationale,
    b.milestone,
    b.milestone_required,
    b.priority_class,
    b.supports_class,
    b.supports_reason,
    p.slug AS project,
    -- FEATURE: AGT-265 -- the open cycle's place in the test-slot line, else NULL.
    ( SELECT CASE ts.state
                 WHEN 'held' THEN 'testing'
                 ELSE 'built, waiting for a test slot'
             END
        FROM public.test_slots ts
        JOIN public.runner_cycles rc ON ts.cycle_id = rc.id
       WHERE rc.item_id = b.backlog_id AND rc.ended_at IS NULL
       ORDER BY (ts.state = 'held') DESC, ts.requested_at
      LIMIT 1) AS lane_status
   FROM backlog_items b
     LEFT JOIN epics e ON e.id = b.epic_id
     LEFT JOIN projects p ON p.id = e.project_id
     LEFT JOIN ticket_cost c ON c.backlog_id = b.backlog_id;

-- ---------------------------------------------------------------------------------------------
-- (7) Grants, by name (functions default OPEN -- SES-315 addendum).
-- ---------------------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.test_slot_acquire(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.test_slot_release(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.runner_should_boot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.test_slot_acquire(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.test_slot_release(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.runner_should_boot() TO service_role;

-- ---------------------------------------------------------------------------------------------
-- (8) Assert both directions; a failure here rolls the whole migration back.
-- ---------------------------------------------------------------------------------------------
DO $assert$
DECLARE
  f text;
  r text;
  n integer;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.test_slot_acquire(text, uuid)',
    'public.test_slot_release(text)',
    'public.runner_should_boot()'] LOOP
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_function_privilege(r, f, 'EXECUTE') THEN
        RAISE EXCEPTION 'AGT-265: % can still EXECUTE %', r, f;
      END IF;
    END LOOP;
    IF NOT has_function_privilege('service_role', f, 'EXECUTE') THEN
      RAISE EXCEPTION 'AGT-265: service_role cannot EXECUTE %', f;
    END IF;
  END LOOP;

  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_table_privilege(r, 'public.test_slots', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') THEN
      RAISE EXCEPTION 'AGT-265: % holds a privilege on public.test_slots', r;
    END IF;
  END LOOP;
  SELECT count(*) INTO n FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name = 'test_slots' AND grantee IN ('anon', 'authenticated');
  IF n <> 0 THEN
    RAISE EXCEPTION 'AGT-265: % anon/authenticated grant rows remain on public.test_slots', n;
  END IF;
  IF NOT has_table_privilege('service_role', 'public.test_slots', 'SELECT') THEN
    RAISE EXCEPTION 'AGT-265: service_role cannot read public.test_slots';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.ticket_matrix', 'SELECT') THEN
    RAISE EXCEPTION 'AGT-265: service_role cannot read public.ticket_matrix';
  END IF;

  FOREACH f IN ARRAY ARRAY['runner_should_boot', 'test_slot_acquire', 'test_slot_release'] LOOP
    SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.proname = f;
    IF n <> 1 THEN
      RAISE EXCEPTION 'AGT-265: public.% has % overloads, expected 1 (.claude/rules/supabase-function-signature.md)', f, n;
    END IF;
  END LOOP;

  -- John's hard stop survives the rebuild.
  IF position('hard_stop' IN pg_get_functiondef('public.runner_should_boot()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'AGT-265: runner_should_boot() lost the hard_stop refusal';
  END IF;
END
$assert$;
