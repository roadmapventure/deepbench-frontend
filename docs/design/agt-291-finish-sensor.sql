-- DeepBench v7.0.1025 | docs/design/agt-291-finish-sensor.sql | AGT-291 -- the finish line gets its
-- sensor, ADDITIVELY (redesign attempt 1, cycle cd7ee6b1-75ee-4ceb-9b90-fbf8f3c35733).
--
-- MIRROR of migration `agt291_finish_sensor`. It REPLACES the v7.0.749 text of this file, which was
-- never applied: that text dropped and recreated project_batch_state() to widen its return type (the
-- DROP is the statement an unattended cycle cannot send) and carried a whole runner_should_boot()
-- body read on 2026-10-03 -- applying it today would have erased AGT-610's and AGT-642's branches.
--
-- Every statement here is CREATE OR REPLACE FUNCTION, REVOKE, GRANT or DO. No DROP, no ALTER.
--   1. project_batch_state(): SAME identity, SAME ten columns, new body. `left` = members that are
--      open or partial (D1: delivered is built). proposal_due = an executing OR paused project (D2),
--      this list locked, not finished, with members -- and the PROJECT holds no open or partial
--      member on ANY locked unfinished list, and has finished no list since this one locked (D5).
--   2. project_finish_line(): NEW. project_batch_state()'s ten columns plus review_due (due AND no
--      claim inside 24 hours) and proposal_attempted_at (D6). Closed to PUBLIC, anon, authenticated
--      BY NAME (.claude/rules/supabase-column-grants.md, SES-315 addendum); service_role only.
--      The shadow project_batch_state_agt291() the v7.0.749 attempt left behind is closed the same
--      way if it is still there (it was executable by anon). Dropping it is AGT-583's.
--   3. runner_should_boot(): three exact insertions into its LIVE text, each asserted to match
--      exactly once, under an md5 guard on the body they were measured against (2026-11-14).
--   4. The assertions: one overload each, the grants in both directions, `left` re-counted from the
--      rows, no due batch inside a project with open work, the gate's md5 after the edit.
--
-- Down: public.capture_migration_down('cd7ee6b1-75ee-4ceb-9b90-fbf8f3c35733', 'agt291_finish_sensor',
--   '[{"kind":"function","identity":"public.project_batch_state()"},
--     {"kind":"function","identity":"public.runner_should_boot()"},
--     {"kind":"function","identity":"public.project_finish_line()"}]'::jsonb)
-- called BEFORE this file is applied. It re-captures over the 2026-10-03 row of the same name, whose
-- bodies are stale. Guard: tests/regression/agt-291-finish-sensor.test.mjs.

-- ============================================================================================
-- 1. project_batch_state() -- same identity, same RETURNS TABLE, new body
-- ============================================================================================
CREATE OR REPLACE FUNCTION public.project_batch_state()
 RETURNS TABLE(slug text, status text, perpetual boolean, epic_id uuid, epic_name text, locked_at timestamp with time zone, finished_at timestamp with time zone, members integer, "left" integer, proposal_due boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  -- AGT-291 D1: `left` = members open or partial (delivered is built). D2: executing OR paused.
  -- D5: finished is a PROJECT fact -- a batch is due only when no locked unfinished list of its
  -- project holds an open or partial member, and the project finished no list since this one locked.
  WITH b AS (
    SELECT p.id AS project_id, p.slug, p.status, p.perpetual, e.id AS epic_id, e.name AS epic_name,
           e.locked_at, e.finished_at,
           count(i.id)::integer AS members,
           (count(i.id) FILTER (WHERE i.status IN ('open', 'partial')))::integer AS "left"
      FROM public.projects p
      JOIN public.epics e ON e.project_id = p.id
      LEFT JOIN public.backlog_items i ON i.epic_id = e.id
     GROUP BY p.id, p.slug, p.status, p.perpetual, e.id, e.name, e.locked_at, e.finished_at)
  SELECT b.slug, b.status, b.perpetual, b.epic_id, b.epic_name, b.locked_at, b.finished_at,
         b.members, b."left",
         (b.status IN ('executing', 'paused') AND b.locked_at IS NOT NULL AND b.finished_at IS NULL
          AND b.members > 0
          AND NOT EXISTS (SELECT 1 FROM b o
                           WHERE o.project_id = b.project_id
                             AND ((o.locked_at IS NOT NULL AND o.finished_at IS NULL AND o."left" > 0)
                                  OR o.finished_at > b.locked_at)))
    FROM b
   ORDER BY b.slug, b.epic_name;
$function$;

-- ============================================================================================
-- 2. project_finish_line() -- NEW: the state plus the sensor
-- ============================================================================================
CREATE OR REPLACE FUNCTION public.project_finish_line()
 RETURNS TABLE(slug text, status text, perpetual boolean, epic_id uuid, epic_name text, locked_at timestamp with time zone, finished_at timestamp with time zone, members integer, "left" integer, proposal_due boolean, review_due boolean, proposal_attempted_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  -- AGT-291 D3/D4/D6: review_due = finished AND no pass claimed the batch inside 24 hours. The
  -- finished state has ONE home, project_batch_state(); this adds only the claim window.
  SELECT s.slug, s.status, s.perpetual, s.epic_id, s.epic_name, s.locked_at, s.finished_at,
         s.members, s."left", s.proposal_due,
         (s.proposal_due AND (e.proposal_attempted_at IS NULL
                              OR e.proposal_attempted_at < now() - interval '24 hours')),
         e.proposal_attempted_at
    FROM public.project_batch_state() s
    JOIN public.epics e ON e.id = s.epic_id
   ORDER BY s.slug, s.epic_name;
$function$;

REVOKE ALL ON FUNCTION public.project_finish_line() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_finish_line() TO service_role;

do $shadow$
begin
  if to_regprocedure('public.project_batch_state_agt291()') is not null then
    execute 'REVOKE ALL ON FUNCTION public.project_batch_state_agt291() FROM PUBLIC, anon, authenticated';
  end if;
end
$shadow$;

-- ============================================================================================
-- 3. runner_should_boot() -- three exact insertions into the live text, md5-guarded
-- ============================================================================================
do $agt291gate$
declare
  d text := pg_get_functiondef('public.runner_should_boot'::regproc);
  n text;
  pairs text[][] := array[
    -- 1. the facts row counts the finished batches nobody claimed
    array[E'AS redesign_due\n),\nverdict AS (',
          E'AS redesign_due,\n    -- AGT-291: finished project batches whose review no pass claimed inside 24 hours.\n    (SELECT count(*)::int FROM public.project_finish_line() s WHERE s.review_due) AS finish_due\n),\nverdict AS ('],
    -- 2. a finished batch is work to go and find
    array[E'OR COALESCE(f.list_tickets, 0) > 0)',
          E'OR COALESCE(f.list_tickets, 0) > 0\n            OR COALESCE(f.finish_due, 0) > 0)'],
    -- 3. the count rides every verdict's detail
    array[E'    ''redesign_ticket'',      v.redesign_due,',
          E'    ''redesign_ticket'',      v.redesign_due,\n    ''finish_due'',           v.finish_due,']
  ];
  i int;
  hits int;
begin
  if md5(d) <> '292753ec6c445b5938344d8038d98c4e' then
    raise exception 'AGT-291: runner_should_boot() is not the body this migration was written against (md5 %); re-read it before applying', md5(d);
  end if;
  n := d;
  for i in 1 .. array_length(pairs, 1) loop
    hits := (length(n) - length(replace(n, pairs[i][1], ''))) / length(pairs[i][1]);
    if hits <> 1 then
      raise exception 'AGT-291: replacement % matched % times, expected exactly 1', i, hits;
    end if;
    n := replace(n, pairs[i][1], pairs[i][2]);
  end loop;
  execute n;
end
$agt291gate$;

-- ============================================================================================
-- 4. The assertions -- any mismatch raises and the whole migration rolls back
-- ============================================================================================
do $agt291$
declare
  n integer;
  f text;
begin
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public'
     and p.proname in ('project_batch_state', 'project_finish_line', 'runner_should_boot');
  if n <> 3 then
    raise exception 'AGT-291: % pg_proc rows across project_batch_state, project_finish_line, runner_should_boot; expected 3 (one overload each)', n;
  end if;

  foreach f in array array['public.project_batch_state()', 'public.project_finish_line()'] loop
    if has_function_privilege('anon', f, 'EXECUTE') or has_function_privilege('authenticated', f, 'EXECUTE') then
      raise exception 'AGT-291: % is executable by anon or authenticated', f;
    end if;
    if not has_function_privilege('service_role', f, 'EXECUTE') then
      raise exception 'AGT-291: service_role cannot execute %', f;
    end if;
  end loop;
  if to_regprocedure('public.project_batch_state_agt291()') is not null
     and (has_function_privilege('anon', 'public.project_batch_state_agt291()', 'EXECUTE')
          or has_function_privilege('authenticated', 'public.project_batch_state_agt291()', 'EXECUTE')) then
    raise exception 'AGT-291: the shadow project_batch_state_agt291() is still executable by anon or authenticated';
  end if;

  select count(*) into n from public.project_batch_state() s
   where s."left" <> (select count(*) from public.backlog_items b
                       where b.epic_id = s.epic_id and b.status in ('open', 'partial'));
  if n <> 0 then
    raise exception 'AGT-291: % batch(es) whose left is not their open/partial member count', n;
  end if;

  select count(*) into n from public.project_batch_state() s
   where s.proposal_due
     and exists (select 1 from public.project_batch_state() o
                  where o.slug = s.slug and o.locked_at is not null and o.finished_at is null
                    and o."left" > 0);
  if n <> 0 then
    raise exception 'AGT-291: % due batch(es) inside a project that still holds open work on a locked list', n;
  end if;

  if (select count(*) from public.project_finish_line()) <> (select count(*) from public.project_batch_state()) then
    raise exception 'AGT-291: project_finish_line() and project_batch_state() disagree on the row count';
  end if;

  if md5(pg_get_functiondef('public.runner_should_boot'::regproc)) <> '4e2611ce347baf21db33753996efa463' then
    raise exception 'AGT-291: runner_should_boot() reads md5 % after the edit, expected 4e2611ce347baf21db33753996efa463',
      md5(pg_get_functiondef('public.runner_should_boot'::regproc));
  end if;
end
$agt291$;

notify pgrst, 'reload schema';
