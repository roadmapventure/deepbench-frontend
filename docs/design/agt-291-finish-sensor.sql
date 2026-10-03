-- DeepBench v7.0.749 | docs/design/agt-291-finish-sensor.sql | AGT-291 -- THE FINISH LINE GETS ITS
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
--   4. The trailing probe: a due batch built as a fixture, the four arms A-D of the kickoff §6.1, the
--      `pg_proc` overload counts, and every fixture rolled back inside a subtransaction that ends in
--      the sentinel P0291 -- so the probe proves both directions without leaving a row behind and the
--      migration still commits. A mismatch raises for real and aborts the whole migration.
--
-- Down: public.capture_migration_down('ba7c3c09-97f2-4f03-9bee-d92523901897', 'agt291_finish_sensor',
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
  'ba7c3c09-97f2-4f03-9bee-d92523901897',
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
-- 4. THE TRAILING PROBE -- the four arms, every fixture rolled back (sentinel P0291)
-- ============================================================================================
-- WHY A PROBE AND NOT A PERMANENT TEST: the arms below move runner_settings, runner_items,
-- backlog_items, audit_findings and epics on the LIVE board. A regression test must never do that
-- (the SES-196 / SES-218 / SES-275 refusal) and PostgREST can neither read pg_proc nor open a
-- transaction to roll a fixture back. So the proof is taken HERE, inside one subtransaction that
-- ends in the sentinel P0291, which the handler swallows -- every fixture write is undone and the
-- migration above still commits. plpgsql variables survive the rollback, so the facts are reported
-- after it.
--
-- WHY IT DISCRIMINATES: on origin/dev's bodies the fixture reads `left` = 1 and BOTH flags false
-- (its one member is `delivered`, which the old LEFT counted), arm B's `paused` project is not due
-- at all, and arm C's board answers `nothing_pickable` with no `finish_due` key in the payload. A
-- pass therefore proves THIS change did something rather than proving the board happens to sit in a
-- convenient state.

do $agt291$
declare
  v_proj   uuid := gen_random_uuid();
  v_epic   uuid := gen_random_uuid();
  v_item   uuid := gen_random_uuid();
  v        record;
  n_pbs    int;
  n_rsb    int;
  v_left   int;
  v_mem    int;
  v_due    boolean;
  v_review boolean;
  v_other  int;
begin
  -- .claude/rules/supabase-function-signature.md, ASSERTED and never taken on the migration's
  -- success flag: project_batch_state() was DROPPED before it was created (its RETURNS TABLE
  -- changed, which CREATE OR REPLACE cannot do), and runner_should_boot() kept its identity
  -- argument list. Either leaving a second overload behind would make every omitted-parameter call
  -- ambiguous, which PostgREST surfaces to its callers as an EMPTY RESULT rather than a crash.
  select count(*)::int into n_pbs from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
   where p.proname = 'project_batch_state' and ns.nspname = 'public';
  select count(*)::int into n_rsb from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
   where p.proname = 'runner_should_boot' and ns.nspname = 'public';
  if n_pbs <> 1 or n_rsb <> 1 then
    raise exception 'AGT-291: % overload(s) of public.project_batch_state and % of '
                    'public.runner_should_boot (want exactly 1 each) -- a stale overload reads as '
                    'an empty result to every caller', n_pbs, n_rsb;
  end if;

  -- THE OMITTED-PARAMETER PATH, which here is the only path: both must answer a real caller.
  select * into v from public.runner_should_boot();
  if v.reason is null then
    raise exception 'AGT-291: runner_should_boot() returned no row on the no-argument call';
  end if;
  raise notice 'AGT-291 live gate answers: reason=% should_boot=% finish_due=% list_tickets=% open_findings=%',
    v.reason, v.should_boot, v.detail->>'finish_due', v.detail->>'list_tickets', v.detail->>'open_findings';

  begin
    -- ---- THE FIXTURE (AGT-312's shape, the member `delivered`): inserted while the project is
    -- ---- `planned` and the list unlocked, so neither epic_lock_guard nor requirement_gate has
    -- ---- anything to refuse; then the project executes and the list locks.
    insert into public.projects (id, slug, name, status, charter)
    values (v_proj, 'zprobe-0291-source', 'AGT-291 probe source', 'planned', 'probe');
    insert into public.epics (id, name, description, project_id)
    values (v_epic, 'AGT-291 probe batch', 'probe', v_proj);
    insert into public.backlog_items
      (id, backlog_id, tier, type, priority_class, title, description, status, epic_id, source_file,
       session_ref, row_ordinal, filed_at, scope_origin, size_stamp, predicted_cycles, defer_status,
       scope_rationale, milestone, enhancement_claim, gate_count, design_status)
    values (v_item, 'ZPROBE-0291', 'next', 'Tooling', 'P10 - Tooling', 'AGT-291 probe member', 'probe',
            'delivered', v_epic, 'agt-291-probe', 'agt291-probe', 999999291, now(), 'john-named', 'S', 1,
            'no', 'probe', null, 'none: probe', 0, null);
    update public.projects set status = 'executing' where id = v_proj;
    update public.epics set locked_at = now() where id = v_epic;

    -- ---- ARM A (D1): one member, `delivered`, and the batch is FINISHED --------------------------
    select s.members, s."left", s.proposal_due, s.review_due
      into v_mem, v_left, v_due, v_review
      from public.project_batch_state() s where s.epic_id = v_epic;
    if v_mem <> 1 or v_left <> 0 or v_due is not true or v_review is not true then
      raise exception 'AGT-291 QA A: members=% left=% proposal_due=% review_due=% (want 1/0/true/true) '
                      '-- on origin/dev this reads left=1 and both flags false, because `delivered` '
                      'counted as left (AGT-240 D2)', v_mem, v_left, v_due, v_review;
    end if;
    raise notice 'AGT-291 QA A PASS: members=% left=% proposal_due=% review_due=%',
      v_mem, v_left, v_due, v_review;

    -- ---- ARM B (D2): the same batch under a `paused` project is STILL due ------------------------
    update public.projects set status = 'paused' where id = v_proj;
    select s."left", s.proposal_due, s.review_due into v_left, v_due, v_review
      from public.project_batch_state() s where s.epic_id = v_epic;
    if v_left <> 0 or v_due is not true or v_review is not true then
      raise exception 'AGT-291 QA B: a paused project''s finished batch reads left=% proposal_due=% '
                      'review_due=% (want 0/true/true) -- D2; origin/dev graded `executing` alone, '
                      'which is why Auditor Enhancements (paused, 16 members, all delivered) could '
                      'never finish', v_left, v_due, v_review;
    end if;
    raise notice 'AGT-291 QA B PASS (paused still finishes): left=% proposal_due=% review_due=%',
      v_left, v_due, v_review;

    -- ---- ARM C (D3): the GATE reads it, and finish_due ALONE carries the verdict -----------------
    -- Every wall above the split is cleared so the ladder can REACH it (AGT-314's fixture A), AND
    -- BOTH of AGT-314's own halves are emptied (its fixture B) -- so the only thing left that can
    -- answer work_to_find is the finish line. Every OTHER review_due batch is claimed, so
    -- finish_due is exactly this fixture and the number is checkable.
    update public.runner_settings
       set scheduler_on = true, meter_limiter_off = true, hard_stop_pct = null, max_lanes = 99
     where id = 1;
    update public.runner_items
       set decision = 'accept', decided_at = now()
     where kind = 'gated_before_build' and decision is null;
    update public.backlog_items
       set claimed_by = 'agt291', claimed_at = now()
     where backlog_id in (select q.ref from public.prime_directive_queue() q
                           where q.lane in ('drain', 'selfbuild'));
    update public.audit_findings set status = 'listed' where status in ('open', 'carried');
    update public.runner_settings set find_work_lists = '{}' where id = 1;
    update public.epics e set proposal_attempted_at = now()
     where e.id <> v_epic
       and e.id in (select s.epic_id from public.project_batch_state() s where s.review_due);
    select count(*)::int into v_other from public.project_batch_state() s
     where s.review_due and s.epic_id <> v_epic;
    if v_other <> 0 then
      raise exception 'AGT-291 QA C: % other review_due batch(es) survived the claim, so finish_due '
                      'would not be checkable', v_other;
    end if;

    select * into v from public.runner_should_boot();
    if v.reason is distinct from 'work_to_find' then
      raise exception 'AGT-291 QA C: reason=% (want work_to_find); detail=%', v.reason, v.detail;
    end if;
    if v.should_boot is not true then
      raise exception 'AGT-291 QA C: should_boot=% (want true) on reason %', v.should_boot, v.reason;
    end if;
    if v.detail->>'mode' is distinct from 'find-work-only' then
      raise exception 'AGT-291 QA C: detail.mode=% (want find-work-only)', v.detail->>'mode';
    end if;
    if v.detail->>'finish_due' is distinct from '1' then
      raise exception 'AGT-291 QA C: detail.finish_due=% (want 1) -- origin/dev carries no such key '
                      'at all and answers nothing_pickable here', coalesce(v.detail->>'finish_due', 'ABSENT');
    end if;
    if v.detail->>'open_findings' is distinct from '0' or v.detail->>'list_tickets' is distinct from '0' then
      raise exception 'AGT-291 QA C: open_findings=% list_tickets=% (want 0 and 0) -- with either '
                      'non-zero, AGT-314''s own halves could have answered work_to_find and this arm '
                      'would prove nothing about the finish line',
        v.detail->>'open_findings', v.detail->>'list_tickets';
    end if;
    raise notice 'AGT-291 QA C PASS: reason=% should_boot=% mode=% finish_due=% (open_findings=% list_tickets=% pickable_count=% gate_cards_to_rule=%)',
      v.reason, v.should_boot, v.detail->>'mode', v.detail->>'finish_due',
      v.detail->>'open_findings', v.detail->>'list_tickets', v.detail->>'pickable_count',
      v.detail->>'gate_cards_to_rule';

    -- ---- ARM D (D4): the CLAIM mutes the sensor without un-finishing the batch -------------------
    -- This is the control for the whole change: the same board, one timestamp different.
    update public.epics set proposal_attempted_at = now() where id = v_epic;
    select s.proposal_due, s.review_due into v_due, v_review
      from public.project_batch_state() s where s.epic_id = v_epic;
    if v_due is not true or v_review is not false then
      raise exception 'AGT-291 QA D: proposal_due=% review_due=% (want true/false) -- a claimed batch '
                      'is still finished and must stay visibly so; only the SENSOR goes quiet',
        v_due, v_review;
    end if;
    select * into v from public.runner_should_boot();
    if v.reason is distinct from 'nothing_pickable' then
      raise exception 'AGT-291 QA D: reason=% (want nothing_pickable); detail=%', v.reason, v.detail;
    end if;
    if v.should_boot is not false then
      raise exception 'AGT-291 QA D: should_boot=% (want false) on reason %', v.should_boot, v.reason;
    end if;
    if v.detail->>'finish_due' is distinct from '0' then
      raise exception 'AGT-291 QA D: detail.finish_due=% (want 0)', v.detail->>'finish_due';
    end if;
    if v.detail->>'mode' is not null then
      raise exception 'AGT-291 QA D: detail.mode=% (want NULL)', v.detail->>'mode';
    end if;
    raise notice 'AGT-291 QA D PASS: reason=% should_boot=% finish_due=% proposal_due=% review_due=%',
      v.reason, v.should_boot, v.detail->>'finish_due', v_due, v_review;

    raise exception using errcode = 'P0291',
      message = 'AGT-291 discriminator complete -- rolling every fixture back';
  exception when sqlstate 'P0291' then
    null;
  end;

  -- After the rollback: the live board answers for a real caller again, from its own real rows, and
  -- the fixture is gone.
  select * into v from public.runner_should_boot();
  raise notice 'AGT-291 after rollback, live board: reason=% should_boot=% finish_due=% open_findings=% list_tickets=% find_work_lists=%',
    v.reason, v.should_boot, v.detail->>'finish_due', v.detail->>'open_findings',
    v.detail->>'list_tickets',
    (select s.find_work_lists::text from public.runner_settings s where s.id = 1);
  raise notice 'AGT-291 after rollback, probe residue: % project(s), % epic(s), % member(s)',
    (select count(*) from public.projects where slug = 'zprobe-0291-source'),
    (select count(*) from public.epics where id = v_epic),
    (select count(*) from public.backlog_items where backlog_id = 'ZPROBE-0291');
end
$agt291$;
