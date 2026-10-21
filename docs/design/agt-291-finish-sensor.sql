-- DeepBench v7.0.879 | docs/design/agt-291-finish-sensor.sql | AGT-304 slice 19 -- the AGT-291 migration lands: captured 2026-10-03, never applied; parts 2-3 byte-unchanged, part 4 fixture-free.
-- SENSOR.
--
-- AGT-240 gave projects a finish line and `project_batch_state().proposal_due` measures it. Nothing
-- WATCHES it: `runner_should_boot()` has no `finish_due` key (read live 2026-10-03), so a board whose
-- batch is finished still answers `nothing_pickable` and the proposal is only ever noticed by a run
-- that happened to be reviewable. This migration makes the finish line a SENSOR the idle fire reads.
--
-- John's calls, mine under JOHN-0925 (reversible, named in the kickoff §1):
--   D1  FINISHED = no locked member `open` or `partial`. `delivered` is BUILT -- it reverses AGT-240
--       D2's "every member done or removed", which left a batch whose work shipped sitting unfinished
--       because its rows had not yet been graded `done`.
--   D2  A `paused` project's batch can finish. AGT-240 graded `executing` only; Auditor Enhancements
--       is `paused` with 16 members, all `delivered`, and under D1 alone it would still never finish.
--   D3  The sensor is `review_due` -- `proposal_due` AND fresh -- reported on EVERY outcome
--       (`(7e)`), and read inside `runner_should_boot()`'s `work_to_find` parenthesis.
--   D4  `--prepare` CLAIMS a batch for 24 h (`epics.proposal_attempted_at`), <= 3 passes a cycle, so
--       concurrent fires and repeated passes cannot spend the same batch's turns twice (pattern:138:
--       races are fixed with claims, not one-run locks).
--
-- MIRROR of migration `agt291_finish_sensor`. Four parts:
--   1. The down capture, FIRST and before any DDL -- both function identities, so the reversal has a
--      body to restore (docs/runbooks/runner-cycle.md step 6: capture_migration_down() BEFORE apply).
--   2. `epics.proposal_attempted_at` (the claim column; no grant -- `anon`/`authenticated` hold zero
--      write privileges on this table and nothing public reads it, `.claude/rules/supabase-column-grants.md`)
--      and `project_batch_state()` DROPPED then CREATED: its RETURNS TABLE gains two columns, which is
--      a RETURN TYPE change, so CREATE OR REPLACE cannot do it and the DROP is owed
--      (`.claude/rules/supabase-function-signature.md`). The REVOKE/GRANT pair is re-stated because a
--      DROP takes the old function's ACL with it.
--   3. `runner_should_boot()` CREATE OR REPLACE from its LIVE `pg_get_functiondef` with the kickoff
--      §4 edits only -- the identity argument list is UNCHANGED (still zero arguments) and so are the
--      RETURNS TABLE columns, so no overload is created and no DROP is owed there.
--   4. The trailing block (AGT-304 slice 19): overloads, LEFT/DUE/FRESH per row, the finish_due key and number, the ACL -- fixture-free; raises on the pre-migration bodies.
--
-- Down: public.capture_migration_down('0d32431b-2f4e-4f37-836b-a89e750e19b8', 'agt291_finish_sensor',
--   '[{"kind":"function","identity":"public.project_batch_state()"},
--     {"kind":"function","identity":"public.runner_should_boot()"}]'::jsonb)
-- plus `alter table public.epics drop column if exists proposal_attempted_at;` -- a column the capture
-- does not carry, so it is named here as the one hand step of the reversal.
--
-- Rationale: docs/ARCHITECTURE.md §19v Operations; guard tests/regression/agt-291-finish-sensor.test.mjs.

-- ============================================================================================
-- 1. THE DOWN CAPTURE -- FIRST, before any DDL (it reads the CURRENT bodies)
-- ============================================================================================
-- Must return 1. A 0 means neither identity resolved and the reversal would have nothing to
-- restore; the migration stops here rather than changing a function it cannot put back.

SELECT public.capture_migration_down(
  '0d32431b-2f4e-4f37-836b-a89e750e19b8',
  'agt291_finish_sensor',
  '[{"kind":"function","identity":"public.project_batch_state()"},
    {"kind":"function","identity":"public.runner_should_boot()"}]'::jsonb) AS captured;

-- ============================================================================================
-- 2. THE CLAIM COLUMN AND THE SENSOR -- project_batch_state() DROPPED and CREATED
-- ============================================================================================

ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS proposal_attempted_at timestamptz;

COMMENT ON COLUMN public.epics.proposal_attempted_at IS
  'AGT-291 D4: when a --prepare pass last CLAIMED this batch for a proposal. The claim is the '
  'conditional PATCH itself (proposal_attempted_at IS NULL OR < now() - 24h), so two concurrent '
  'fires cannot both spend a turn on the same batch. NULL = never attempted.';

DROP FUNCTION IF EXISTS public.project_batch_state();

CREATE FUNCTION public.project_batch_state()
 RETURNS TABLE(slug text, status text, perpetual boolean, epic_id uuid, epic_name text,
               locked_at timestamptz, finished_at timestamptz, members integer, "left" integer,
               proposal_due boolean, review_due boolean, proposal_attempted_at timestamptz)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  -- AGT-291 D1: `left` is the count of members still OPEN or PARTIAL. `delivered` is BUILT -- the
  -- work shipped and only its grading is outstanding -- so it no longer holds a batch open (this
  -- reverses AGT-240 D2's `NOT IN ('done','removed')`, which counted delivered as left).
  -- AGT-291 D2: a `paused` project's batch can finish too, not `executing` alone.
  -- `review_due` is `proposal_due` AND FRESH: the batch has not been claimed inside 24 hours. It is
  -- the SENSOR -- what runner_should_boot() reads and what --prepare filters on -- while
  -- `proposal_due` stays the plain state of the batch, so a claimed batch is still visibly finished.
  SELECT p.slug, p.status, p.perpetual, e.id, e.name, e.locked_at, e.finished_at,
         count(b.id)::integer,
         (count(b.id) FILTER (WHERE b.status IN ('open', 'partial')))::integer,
         (p.status IN ('executing', 'paused') AND e.locked_at IS NOT NULL AND e.finished_at IS NULL
          AND count(b.id) > 0
          AND count(b.id) FILTER (WHERE b.status IN ('open', 'partial')) = 0),
         (p.status IN ('executing', 'paused') AND e.locked_at IS NOT NULL AND e.finished_at IS NULL
          AND count(b.id) > 0
          AND count(b.id) FILTER (WHERE b.status IN ('open', 'partial')) = 0
          AND (e.proposal_attempted_at IS NULL
               OR e.proposal_attempted_at < now() - interval '24 hours')),
         e.proposal_attempted_at
    FROM public.projects p
    JOIN public.epics e ON e.project_id = p.id
    LEFT JOIN public.backlog_items b ON b.epic_id = e.id
   GROUP BY p.slug, p.status, p.perpetual, e.id, e.name, e.locked_at, e.finished_at,
            e.proposal_attempted_at
   ORDER BY p.slug, e.name;
$function$;

-- The DROP took the old ACL with it, so both halves are re-stated. The browser holds the anon key
-- (.claude/rules/supabase-column-grants.md): this function reads the whole board and is service_role
-- only, exactly as AGT-240 shipped it.
REVOKE EXECUTE ON FUNCTION public.project_batch_state() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_batch_state() TO service_role;

-- ============================================================================================
-- 3. runner_should_boot() -- the idle fire reads the finish line
-- ============================================================================================
-- CREATE OR REPLACE from the LIVE pg_get_functiondef (read 2026-10-03), with the kickoff §4 edits
-- and NOTHING else: one `finish_due` fact after `list_tickets`, one OR inside the `work_to_find`
-- parenthesis, one `finish_due` detail key after `list_tickets`. Identity argument list unchanged
-- (zero arguments) and RETURNS TABLE unchanged, so no overload is created.

CREATE OR REPLACE FUNCTION public.runner_should_boot()
 RETURNS TABLE(should_boot boolean, reason text, detail jsonb)
 LANGUAGE sql
 STABLE
AS $function$
WITH chi_month AS (
  SELECT to_char(now() AT TIME ZONE 'America/Chicago', 'YYYY-MM') AS m
),
settings AS (
  SELECT s.scheduler_on, s.meter_stale_hours, s.meter_limiter_off, s.max_lanes, s.find_work_lists FROM public.runner_settings s WHERE s.id = 1
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
-- FEATURE: AGT-314 -- the two things an idle fire could still GO AND FIND when it can build
-- nothing and has no card to rule. Both are COUNTS of work that already exists, read from the
-- rows themselves, so neither can be true while the board is empty for a reason this gate has
-- already named above.
--   fw_findings: audit_findings still awaiting a classing pass. open AND carried, because a
--   carried finding is work that was deferred, not work that was done (the designer's call,
--   JOHN-0925 (ii)).
fw_findings AS (
  SELECT count(*)::int AS n
    FROM public.audit_findings f
   WHERE f.status IN ('open', 'carried')
),
--   fw_lists: open/partial tickets sitting in a project whose slug is listed in
--   runner_settings.find_work_lists. The slugs are DATA John edits with an UPDATE (pattern:2) --
--   a literal here would make the find-work lane a code change to re-point. An empty array
--   matches no project, so emptying the column turns this half off with no migration.
fw_lists AS (
  SELECT count(*)::int AS n
    FROM public.backlog_items b
    JOIN public.epics e ON e.id = b.epic_id
    JOIN public.projects p ON p.id = e.project_id
    JOIN settings s ON p.slug = ANY (s.find_work_lists)
   WHERE b.status IN ('open', 'partial')
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
    (SELECT g.n FROM gate_cards g)                                  AS gate_cards_to_rule,
    (SELECT fw.n FROM fw_findings fw)                               AS open_findings,
    (SELECT fw.n FROM fw_lists fw)                                  AS list_tickets,
    -- FEATURE: AGT-291 -- the third thing an idle fire can GO AND DO: a batch whose list is
    -- finished and whose proposal has not been attempted inside 24 hours. Read from the one
    -- function that measures the finish line (public.project_batch_state()), never re-derived
    -- here -- a second copy of LEFT and FRESH in this body would be free to disagree with it
    -- (pattern:14). review_due, not proposal_due: a batch already claimed this day is finished
    -- but is NOT work to go and find, so it must not re-boot the fire every hour.
    (SELECT count(*)::int FROM public.project_batch_state() s WHERE s.review_due) AS finish_due
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
      -- FEATURE: AGT-314 -- the slot SPLITS AGAIN, and it sits HERE: after every wall above and
      -- after AGT-127's card branch, so a fire with a card to rule still rules it rather than
      -- going looking. Nothing to build, no card to rule, but work that EXISTS to be found --
      -- unclassed findings, or open/partial tickets on one of John's find-work lists -- and the
      -- fire boots to find it and nothing else: detail.mode='find-work-only'. Zero of both and
      -- the answer is 'nothing_pickable', byte-for-byte the verdict this line gave before.
      WHEN f.pickable_count = 0
       AND (COALESCE(f.open_findings, 0) > 0
            OR COALESCE(f.list_tickets, 0) > 0
            -- FEATURE: AGT-291 -- the third half of the same OR. A finished batch is work that
            -- EXISTS to be found, exactly like an unclassed finding or a list ticket, so it boots
            -- the same find-work-only fire rather than a fourth verdict.
            OR COALESCE(f.finish_due, 0) > 0)                       THEN 'work_to_find'
      WHEN f.pickable_count = 0                                     THEN 'nothing_pickable'
      WHEN f.cheapest_pct_of_week > f.weekly_headroom_pct           THEN 'unaffordable'
      ELSE 'pickable'
    END AS reason,
    f.*
  FROM facts f
)
SELECT
  v.reason IN ('pickable', 'gate_cards_to_rule', 'work_to_find') AS should_boot,
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
    'open_findings',        v.open_findings,
    'list_tickets',         v.list_tickets,
    'finish_due',           v.finish_due,
    -- The mode is what a BOOTING fire reads to know which one thing it may do. A fire that took
    -- the reason and not the mode would try to build on a board with pickable_count = 0.
    'mode',                 CASE WHEN v.reason = 'gate_cards_to_rule' THEN 'rule-cards-only'
                                 WHEN v.reason = 'work_to_find'       THEN 'find-work-only'
                                 ELSE NULL END,
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

-- ============================================================================================
-- 4. THE TRAILING BLOCK -- fixture-free; raises on the pre-migration bodies (AGT-304 slice 19)
-- ============================================================================================

do $agt291$
declare v record; n_pbs int; n_rsb int; n_bad int; n_due int;
begin
  select count(*)::int into n_pbs from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname = 'public' and p.proname = 'project_batch_state';
  select count(*)::int into n_rsb from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname = 'public' and p.proname = 'runner_should_boot';
  if n_pbs <> 1 or n_rsb <> 1 then raise exception 'AGT-291: overloads pbs=% rsb=% (want 1 each)', n_pbs, n_rsb; end if;
  select count(*)::int into n_bad from public.project_batch_state() s
   where s."left" <> (select count(*) from public.backlog_items b where b.epic_id = s.epic_id and b.status in ('open', 'partial'))
      or s.proposal_due is distinct from (s.status in ('executing', 'paused') and s.locked_at is not null and s.finished_at is null and s.members > 0 and s."left" = 0)
      or s.review_due is distinct from (s.proposal_due and (s.proposal_attempted_at is null or s.proposal_attempted_at < now() - interval '24 hours'));
  if n_bad <> 0 then raise exception 'AGT-291: % batch row(s) disagree with LEFT/DUE/FRESH re-derived from backlog_items', n_bad; end if;
  select count(*)::int into n_due from public.project_batch_state() s where s.review_due;
  select * into v from public.runner_should_boot();
  if v.reason is null then raise exception 'AGT-291: runner_should_boot() returned no row'; end if;
  if not (v.detail ? 'finish_due') then raise exception 'AGT-291: detail has no finish_due key (the pre-migration body)'; end if;
  if (v.detail->>'finish_due')::int <> n_due then raise exception 'AGT-291: finish_due=% but % review_due', v.detail->>'finish_due', n_due; end if;
  if has_function_privilege('anon', 'public.project_batch_state()', 'EXECUTE') or has_function_privilege('authenticated', 'public.project_batch_state()', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.project_batch_state()', 'EXECUTE') then raise exception 'AGT-291: project_batch_state() not service_role-only'; end if;
  raise notice 'AGT-291 landed: reason=% finish_due=% review_due=% pbs=% rsb=%', v.reason, v.detail->>'finish_due', n_due, n_pbs, n_rsb;
end
$agt291$;
