-- DeepBench v7.0.748 | docs/design/agt-314-find-work-boot.sql | AGT-314 -- AN IDLE FIRE FINDS WORK
-- INSTEAD OF REFUSING.
--
-- ALIVE WHEN THIS WAS WRITTEN (2026-10-03, read live, not recalled): runner_should_boot()'s ladder
-- ended `WHEN f.pickable_count = 0 THEN 'nothing_pickable'` with no find-work sibling, and 8 fires
-- refused `nothing_pickable` between 11:41 and 18:51Z on 2026-10-02 -- while `audit_findings` held
-- 44 `open` rows and the two find-work lists (`dev-mgr-findings` + `auditor-findings`) held 133
-- open/partial tickets. There was work to find; the gate could not see it.
--
-- MIRROR of migration `agt314_find_work_boot` (applied over the MCP this cycle). Three parts:
--   1. runner_settings.find_work_lists -- the list slugs as DATA John edits with an UPDATE
--      (pattern:2), never a literal in the function body.
--   2. runner_should_boot() CREATE OR REPLACE from the LIVE body, identity argument list UNCHANGED
--      (zero arguments) and the RETURNS TABLE column list unchanged -- so no stale overload is
--      created and no DROP is owed (.claude/rules/supabase-function-signature.md). The assertion
--      that exactly ONE overload remains, and that the omitted-parameter path (the only path) still
--      returns a row, is in part 3 rather than taken on the migration's success flag.
--   3. The trailing discriminator: the find-work fixture and the emptied-list fixture, both built
--      and both graded inside one subtransaction that ends in the sentinel P0314 -- so the probe
--      proves BOTH directions and leaves no row behind, and the migration still commits.
--
-- Down: public.capture_migration_down('9ea787a1-ffc7-48fc-a185-6482ac0166cf', 'agt314_find_work_boot',
--   '[{"kind":"function","identity":"public.runner_should_boot()"}]'::jsonb)
-- ran BEFORE the apply, so the down it derived restores the PRE-AGT-314 body. The column's own down
-- is `ALTER TABLE public.runner_settings DROP COLUMN find_work_lists;`, and the row's prior state is
-- carried by the runner_before_images row part 1 writes.

-- ============================================================================================
-- 1. THE LIST SLUGS, AS DATA
-- ============================================================================================

-- SES-150 / pattern:169: the image carries the FULL prior row keyed by the table's own primary key,
-- so the undo is a restore rather than a guess. runner_settings is in reversible_tables().
-- ck_before_image_attribution is an XOR: exactly one of cycle_id / session_name. This is a runner
-- cycle, so the cycle_id carries the attribution and session_name stays NULL (SES-150).
insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data)
select '9ea787a1-ffc7-48fc-a185-6482ac0166cf'::uuid, 'runner_settings', s.id::text, to_jsonb(s)
  from public.runner_settings s where s.id = 1;

alter table public.runner_settings
  add column if not exists find_work_lists text[] not null
  default '{dev-mgr-findings,auditor-findings}';

-- ============================================================================================
-- 2. THE GATE -- the LIVE body with AGT-314's CTEs, facts, verdict branch, should_boot and mode
-- ============================================================================================

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
    (SELECT fw.n FROM fw_lists fw)                                  AS list_tickets
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
            OR COALESCE(f.list_tickets, 0) > 0)                     THEN 'work_to_find'
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
$function$
;

-- ============================================================================================
-- 3. THE DISCRIMINATOR -- both directions, every write rolled back, the migration still commits
-- ============================================================================================
--
-- WHY A PROBE AND NOT A PERMANENT TEST: the fixtures below move runner_settings, runner_items,
-- backlog_items and audit_findings on the LIVE board. A regression test must never do that (the
-- SES-196 / SES-218 / SES-275 refusal), and PostgREST cannot open a transaction to roll one back.
-- So the proof is taken HERE, inside one subtransaction that ends in the sentinel P0314, which the
-- handler swallows -- every fixture write is undone and the migration above still commits.
--
-- WHY IT DISCRIMINATES: on origin/dev's body, fixture A answers `nothing_pickable` and carries no
-- `open_findings` key at all. A pass therefore proves THIS change did something, rather than
-- proving the board happens to be in a convenient state.

do $agt314$
declare
  v record;
  n_overloads int;
begin
  -- .claude/rules/supabase-function-signature.md: the identity argument list did not change (it is
  -- still zero arguments) and the RETURNS TABLE columns did not change, so CREATE OR REPLACE
  -- replaced the body rather than adding an overload. That is ASSERTED, never taken on the
  -- migration's success flag -- an overload break is invisible from the new call and total from
  -- the old one, and PostgREST surfaces it as an EMPTY RESULT rather than a crash.
  select count(*)::int into n_overloads
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where p.proname = 'runner_should_boot' and ns.nspname = 'public';
  if n_overloads <> 1 then
    raise exception 'AGT-314: % overloads of public.runner_should_boot() (want exactly 1) -- a '
                    'stale overload makes every omitted-parameter call ambiguous, which reads as '
                    'an empty result to every caller', n_overloads;
  end if;

  -- THE OMITTED-PARAMETER PATH, which here is the only path: it must return a real row.
  select * into v from public.runner_should_boot();
  if v.reason is null then
    raise exception 'AGT-314: runner_should_boot() returned no row on the no-argument call';
  end if;
  raise notice 'AGT-314 live gate still answers for a real caller: reason=% should_boot=% open_findings=% list_tickets=%',
    v.reason, v.should_boot, v.detail->>'open_findings', v.detail->>'list_tickets';

  begin
    -- ---- FIXTURE A: nothing to build, no card to rule, work that EXISTS to be found ----------
    -- Every wall above the split is cleared so the ladder can REACH the split: John's switch on,
    -- the spend walls lifted (meter_limiter_off), no hard stop, and the lane cap out of the way.
    update public.runner_settings
       set scheduler_on = true, meter_limiter_off = true, hard_stop_pct = null, max_lanes = 99
     where id = 1;
    -- No card left to rule, so AGT-127's branch cannot answer first.
    update public.runner_items
       set decision = 'accept', decided_at = now()
     where kind = 'gated_before_build' and decision is null;
    -- Nothing pickable: a FRESH claim takes every drain/selfbuild row out of the pick predicate
    -- (pick_exclusions() grades claimed_at against runner_settings.claim_stale_hours).
    update public.backlog_items
       set claimed_by = 'agt314', claimed_at = now()
     where backlog_id in (select q.ref from public.prime_directive_queue() q
                           where q.lane in ('drain', 'selfbuild'));

    select * into v from public.runner_should_boot();
    if v.reason is distinct from 'work_to_find' then
      raise exception 'AGT-314 QA A: reason=% (want work_to_find); detail=%', v.reason, v.detail;
    end if;
    if v.should_boot is not true then
      raise exception 'AGT-314 QA A: should_boot=% (want true) on reason %', v.should_boot, v.reason;
    end if;
    if v.detail->>'mode' is distinct from 'find-work-only' then
      raise exception 'AGT-314 QA A: detail.mode=% (want find-work-only)', v.detail->>'mode';
    end if;
    if v.detail->>'open_findings' is distinct from '44' then
      raise exception 'AGT-314 QA A: detail.open_findings=% (want 44)', v.detail->>'open_findings';
    end if;
    raise notice 'AGT-314 QA A PASS: reason=% should_boot=% mode=% open_findings=% list_tickets=% pickable_count=% gate_cards_to_rule=%',
      v.reason, v.should_boot, v.detail->>'mode', v.detail->>'open_findings',
      v.detail->>'list_tickets', v.detail->>'pickable_count', v.detail->>'gate_cards_to_rule';

    -- ---- FIXTURE B: the same board with BOTH halves emptied -> the old verdict, unchanged ----
    -- This is the control. It is what proves the branch is reading the two counts rather than
    -- simply answering work_to_find whenever nothing is pickable.
    update public.audit_findings set status = 'listed' where status in ('open', 'carried');
    update public.runner_settings set find_work_lists = '{}' where id = 1;

    select * into v from public.runner_should_boot();
    if v.reason is distinct from 'nothing_pickable' then
      raise exception 'AGT-314 QA B: reason=% (want nothing_pickable); detail=%', v.reason, v.detail;
    end if;
    if v.should_boot is not false then
      raise exception 'AGT-314 QA B: should_boot=% (want false) on reason %', v.should_boot, v.reason;
    end if;
    if v.detail->>'mode' is not null then
      raise exception 'AGT-314 QA B: detail.mode=% (want NULL)', v.detail->>'mode';
    end if;
    if v.detail->>'open_findings' is distinct from '0' or v.detail->>'list_tickets' is distinct from '0' then
      raise exception 'AGT-314 QA B: open_findings=% list_tickets=% (want 0 and 0)',
        v.detail->>'open_findings', v.detail->>'list_tickets';
    end if;
    raise notice 'AGT-314 QA B PASS: reason=% should_boot=% mode=% open_findings=% list_tickets=%',
      v.reason, v.should_boot, coalesce(v.detail->>'mode', 'NULL'),
      v.detail->>'open_findings', v.detail->>'list_tickets';

    raise exception using errcode = 'P0314',
      message = 'AGT-314 discriminator complete -- rolling every fixture back';
  exception when sqlstate 'P0314' then
    null;
  end;

  -- After the rollback: the live board answers for a real caller again, from its own real rows.
  select * into v from public.runner_should_boot();
  raise notice 'AGT-314 after rollback, live board: reason=% should_boot=% open_findings=% list_tickets=% find_work_lists=%',
    v.reason, v.should_boot, v.detail->>'open_findings', v.detail->>'list_tickets',
    (select s.find_work_lists::text from public.runner_settings s where s.id = 1);
end
$agt314$;
