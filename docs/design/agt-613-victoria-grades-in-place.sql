-- DeepBench v7.0.971 | docs/design/agt-613-victoria-grades-in-place.sql | AGT-613 -- the daily check prompts on an ungraded ticket in a running project
--
-- WHY (John's rule, decision 087d79ae, 2026-11-06): "give a rule to Victoria in her grading pass -
-- not only grades in the staging area, she also grades in active projects". On 2026-11-04/05 an
-- attended session filed AGT-608/609/610 straight into `executing` projects. Victoria's daily routine
-- only worked the lists `victoria_intake_lists()` returned (`planned` projects), and
-- `victoria_daily_check()` only prompted on (a) an executing project under ten countable tickets or
-- (b) a graded 5 outside the active projects. The pick refuses an ungraded ticket ("not yet scored
-- (waits for Victoria)"), so those three sat forever. A POC graded them in place with
-- `apply_requirement_verdict()` and NO `home_project`, and they became pickable without moving.
--
-- WHAT THIS FILE CHANGES (apply AFTER docs/design/victoria-intake-lists.sql, v7.0.971, which adds
-- the executing rows this file reads -- check (0) refuses otherwise):
--   (1) `victoria_daily_verdict(p_counts, p_fives, p_ungraded_active DEFAULT 0)` -- a THIRD arm,
--       `ungraded_in_active`, AFTER the two existing ones, which keep their priority and wording.
--       The old 2-arg overload is DROPPED here, so there is one function; the DEFAULT keeps every
--       2-arg call (AGT-485's guard, arm A) resolving to it.
--   (2) `victoria_daily_check()` -- AGT-516's body (docs/design/agt-516-daily-arm-reads-stamp.sql)
--       VERBATIM, plus ONE CTE `active` that sums `victoria_intake_lists()`'s executing rows (the
--       predicate's ONE home -- not restated here), fed to the verdict, and `detail.ungraded_active`.
--       Every existing `detail` key, identity, RETURNS, STABLE and search_path are unchanged.
--   (3) `victoria_active_probe()` -- the standing proof, AGT-516's probe form: today's board holds
--       ZERO ungraded tickets in executing projects, so a guard reading the board would agree with a
--       function that never learned arm 3. The probe un-grades ONE graded ticket of an executing
--       project inside a sub-block ending in the `P0613` sentinel (sets `reversed_at` on its
--       standing `requirement-check` rows; no trigger fires on that column), re-reads both readers,
--       rolls back, and reports the residue read AFTER the sentinel.
--
-- Wrapped in ONE transaction by `apply_migration` (no BEGIN/COMMIT here): the trailing GATE's RAISE
-- rolls every statement back. DOWN: drop function public.victoria_active_probe(); drop function
-- public.victoria_daily_verdict(jsonb, integer, integer); then re-apply section (1) of
-- docs/design/agt-485-victoria-daily-check.sql and section (1) of
-- docs/design/agt-516-daily-arm-reads-stamp.sql.

-- =================================================================================================
-- (0) THE BODIES THIS FILE REPLACES ARE THE BODIES THAT ARE LIVE (measured 2026-11-06; a re-apply
--     of this same file is also admitted), and the intake-lists file has ALREADY been applied.
-- =================================================================================================
DO $pre$
declare
  v_n   integer;
  v_md5 text;
  v_src text;
begin
  select count(*), max(md5(p.prosrc)) into v_n, v_md5 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'victoria_daily_check' and p.prokind = 'f';
  if v_n <> 1 or v_md5 not in ('db8fff24c1e76a97a97a8ed9fb4ff50b', '0726375de1904fc03dedaadd0328b202') then
    raise exception 'agt613: victoria_daily_check is % overload(s) at md5 %, expected 1 at db8fff24c1e76a97a97a8ed9fb4ff50b (AGT-516) -- the body moved; STOP and re-measure, never splice an unmeasured body', v_n, v_md5;
  end if;

  select count(*), max(md5(p.prosrc)) into v_n, v_md5 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'victoria_daily_verdict' and p.prokind = 'f';
  if v_n <> 1 or v_md5 not in ('b9825ee0024b5a8abbfe81b5a739ff8b', 'e1ca880ebff37f5df7446f05844f5fb2') then
    raise exception 'agt613: victoria_daily_verdict is % overload(s) at md5 %, expected 1 at b9825ee0024b5a8abbfe81b5a739ff8b (AGT-485)', v_n, v_md5;
  end if;

  select p.prosrc into v_src from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'victoria_intake_lists' and p.prokind = 'f';
  if v_src is null or position('''executing''' in v_src) = 0 then
    raise exception 'agt613: victoria_intake_lists() does not yet read executing projects -- apply docs/design/victoria-intake-lists.sql (v7.0.971) FIRST; arm 3 reads its executing rows';
  end if;
end
$pre$;

-- =================================================================================================
-- (1) victoria_daily_verdict -- John's ten AND the new third arm, declared ONCE. Pure, IMMUTABLE.
--     THE ORDER IS THE RULE: the floor (d.1) first, the loose 5 (d.3) second, an ungraded ticket in
--     a running project third (087d79ae). Only with none of the three is it `at_floor`.
-- =================================================================================================
DROP FUNCTION IF EXISTS public.victoria_daily_verdict(jsonb, integer);

CREATE OR REPLACE FUNCTION public.victoria_daily_verdict(p_counts jsonb, p_fives integer, p_ungraded_active integer DEFAULT 0)
 RETURNS TABLE(prompt boolean, reason text)
 LANGUAGE sql
 IMMUTABLE
 PARALLEL SAFE
AS $function$
  WITH below AS (
    SELECT count(*)::integer AS n
      FROM jsonb_array_elements(coalesce(p_counts, '[]'::jsonb)) e
     WHERE (e->>'countable')::integer < 10
  )
  SELECT CASE WHEN b.n > 0 THEN true
              WHEN coalesce(p_fives, 0) > 0 THEN true
              WHEN coalesce(p_ungraded_active, 0) > 0 THEN true
              ELSE false END AS prompt,
         CASE WHEN b.n > 0 THEN 'project_below_floor'
              WHEN coalesce(p_fives, 0) > 0 THEN 'five_outside_projects'
              WHEN coalesce(p_ungraded_active, 0) > 0 THEN 'ungraded_in_active'
              ELSE 'at_floor' END::text AS reason
    FROM below b
$function$;

REVOKE ALL ON FUNCTION public.victoria_daily_verdict(jsonb, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.victoria_daily_verdict(jsonb, integer, integer) TO service_role;

-- =================================================================================================
-- (2) victoria_daily_check() -- AGT-516's body verbatim + arm 3 (the `active` CTE and its key).
-- =================================================================================================
CREATE OR REPLACE FUNCTION public.victoria_daily_check()
 RETURNS TABLE(prompt boolean, reason text, detail jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  WITH arm1 AS (
    SELECT c.project_slug, c.countable, pj.priority
      FROM public.countable_tickets_per_project() c
      JOIN public.projects pj ON pj.slug = c.project_slug
  ),
  counts AS (
    SELECT coalesce(
             jsonb_agg(jsonb_build_object('slug', a.project_slug, 'countable', a.countable)
                       ORDER BY a.priority, a.project_slug),
             '[]'::jsonb) AS js
      FROM arm1 a
  ),
  below AS (
    SELECT coalesce(
             jsonb_agg(to_jsonb(a.project_slug) ORDER BY a.priority, a.project_slug),
             '[]'::jsonb) AS js
      FROM arm1 a
     WHERE a.countable < 10
  ),
  arm2 AS (
    SELECT b.backlog_id::text AS backlog_id
      FROM public.backlog_items b
      LEFT JOIN public.epics e
             ON e.id = b.epic_id
      LEFT JOIN public.projects pj
             ON pj.id = e.project_id
          -- P1: the two statuses that still hold work.
     WHERE b.status IN ('open', 'partial')
          -- P2, CHANGED: the 5s and only the 5s (requirements d.3). `effective_need_score` is
          -- AGT-483's lift, read from its one home.
       AND public.effective_need_score(b.id) = 5
          -- THE SCOPE, CHANGED: outside the active projects means a `planned` project's list or no
          -- epic at all. A `paused` project's ticket is NOT hers to move (requirements d.10), so
          -- `planned` is named rather than "not executing".
       AND (b.epic_id IS NULL OR pj.status = 'planned')
          -- P3: Victoria has graded it and that grade still stands (AGT-280's requirement gate).
       AND EXISTS (
             SELECT 1 FROM public.runner_decisions d
              WHERE d.kind = 'requirement-check'
                AND d.backlog_id = b.backlog_id
                AND d.reversed_at IS NULL)
          -- P4: no unfinished blocker -- the PICK's rule, read from its one home.
       AND (b.blocked_by IS NULL
            OR EXISTS (
                 SELECT 1 FROM public.backlog_items bb
                  WHERE bb.id = b.blocked_by
                    AND bb.status = ANY (public.backlog_unblocking_statuses())))
          -- P5: PARKED has no column -- it lives in the newest unreversed grade's own reasoning
          -- (DL-09: `PARKED (0) until ...`).
       AND coalesce((
             SELECT d2.reasoning FROM public.runner_decisions d2
              WHERE d2.kind = 'requirement-check'
                AND d2.backlog_id = b.backlog_id
                AND d2.reversed_at IS NULL
              ORDER BY d2.decided_at DESC
              LIMIT 1), '') NOT ILIKE 'PARKED%'
          -- P6: an undecided gate card holds the ticket out of the pick (AGT-253).
       AND NOT EXISTS (
             SELECT 1 FROM public.runner_items ri
              WHERE ri.backlog_id = b.backlog_id
                AND ri.kind = 'gated_before_build'
                AND ri.decision IS NULL)
          -- P7: a `needs-` design flag means the ticket is waiting on a decision, a desktop or
          -- John. The prefix is the rule, so a new flag is covered on arrival.
       AND coalesce(b.design_status, '') NOT LIKE 'needs-%'
          -- P8: AGT-482's fence -- the 6-hour window AND John's `STOPPED-BY-JOHN` sentinel, which
          -- no elapsed time frees.
       AND public.claim_exclusion_reason(b.claimed_by, b.claimed_at) IS NULL
          -- P9 (AGT-516): a ticket holding a live `fit-stamp` taken under the CURRENT charter
          -- fingerprint has already been read against every active charter and turned down, and
          -- `AGT-486`'s `--prepare-list` already drops it -- so the sensor that PROMPTS drops it
          -- too, or the daily check asks John about a ticket the door refuses, every day, forever.
          -- `victoria_charter_state()` is that fingerprint rule's ONE home and is READ here rather
          -- than re-derived: a charter edit, a pause or a new active project moves the fingerprint,
          -- no stamp matches, and every stamped ticket returns to arm 2 by itself (pattern:14/17).
       AND NOT EXISTS (SELECT 1 FROM public.victoria_charter_state() s WHERE b.backlog_id = ANY (s.stamped))
  ),
  fives AS (
    SELECT count(*)::integer AS n,
           coalesce(jsonb_agg(to_jsonb(f.backlog_id) ORDER BY f.backlog_id), '[]'::jsonb) AS js
      FROM arm2 f
  ),
  -- ARM 3 (AGT-613): an ungraded ticket sitting in an `executing` project. The predicate is NOT
  -- restated here: `victoria_intake_lists()` is its one home and returns an executing project only
  -- for its ungraded, unstamped open/partial tickets, so this arm is the sum of those rows.
  active AS (
    SELECT coalesce(sum(l.ungraded), 0)::integer AS n
      FROM public.victoria_intake_lists() l
      JOIN public.projects pj ON pj.slug = l.slug
     WHERE pj.status = 'executing'
  )
  SELECT v.prompt,
         v.reason,
         jsonb_build_object(
           'below',           below.js,
           'counts',          counts.js,
           'fives',           fives.n,
           'five_ids',        fives.js,
           'ungraded_active', active.n) AS detail
    FROM counts, below, fives, active,
         public.victoria_daily_verdict(counts.js, fives.n, active.n) v
$function$;

REVOKE ALL ON FUNCTION public.victoria_daily_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.victoria_daily_check() TO service_role;

-- =================================================================================================
-- (3) victoria_active_probe() -- arm 3's standing assertion. Un-grades the FIRST graded, unstamped
--     open/partial ticket of an executing project inside a `P0613` sub-block and demands that
--     `victoria_intake_lists()` lists its project with one more ungraded ticket and that
--     `victoria_daily_check()`'s `ungraded_active` rises by one -- then rolls back. `residue` is the
--     standing-grade count of that ticket before minus the count read AFTER the sentinel: must be 0.
--     VOLATILE because it writes before it rolls back; service_role only (it reads the whole board).
-- =================================================================================================
CREATE OR REPLACE FUNCTION public.victoria_active_probe()
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_id          text;
  v_slug        text;
  v_graded      integer;
  v_before      integer;
  v_list_before integer;
  v_after       integer;
  v_list_after  integer;
  v_reason      text;
  v_left        integer;
begin
  select b.backlog_id, pj.slug into v_id, v_slug
    from public.backlog_items b
    join public.epics e on e.id = b.epic_id
    join public.projects pj on pj.id = e.project_id
   where pj.status = 'executing'
     and b.status in ('open', 'partial')
     and exists (select 1 from public.runner_decisions d
                  where d.kind = 'requirement-check' and d.backlog_id = b.backlog_id and d.reversed_at is null)
     and not exists (select 1 from public.victoria_charter_state() s where b.backlog_id = any (s.stamped))
   order by b.backlog_id
   limit 1;
  if v_id is null then
    -- Said out loud, never returned as a pass (pattern:77).
    return jsonb_build_object('skipped', 'no graded ticket in an executing project');
  end if;

  select count(*)::integer into v_graded from public.runner_decisions d
   where d.kind = 'requirement-check' and d.backlog_id = v_id and d.reversed_at is null;
  select (c.detail->>'ungraded_active')::integer into v_before from public.victoria_daily_check() c;
  select coalesce(max(l.ungraded), 0) into v_list_before from public.victoria_intake_lists() l where l.slug = v_slug;

  begin
    update public.runner_decisions d set reversed_at = now()
     where d.kind = 'requirement-check' and d.backlog_id = v_id and d.reversed_at is null;

    select (c.detail->>'ungraded_active')::integer, c.reason into v_after, v_reason from public.victoria_daily_check() c;
    select coalesce(max(l.ungraded), 0) into v_list_after from public.victoria_intake_lists() l where l.slug = v_slug;

    raise exception sqlstate 'P0613' using message = 'AGT-613 probe: measured, rolling back';
  exception when sqlstate 'P0613' then
    null;   -- the un-grade is undone; the measurements survive in the variables
  end;

  select count(*)::integer into v_left from public.runner_decisions d
   where d.kind = 'requirement-check' and d.backlog_id = v_id and d.reversed_at is null;

  return jsonb_build_object(
    'id',           v_id,
    'slug',         v_slug,
    'before',       v_before,
    'after',        v_after,
    'reason_after', v_reason,
    'list_before',  v_list_before,
    'list_after',   v_list_after,
    'residue',      v_graded - v_left);
end
$function$;

REVOKE ALL ON FUNCTION public.victoria_active_probe() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.victoria_active_probe() TO service_role;

-- =================================================================================================
-- (4) THE GATE. Asserts, leaves nothing behind, RAISEs (rolling the whole file back) on any miss.
-- =================================================================================================
DO $gate$
declare
  v_n      integer;
  v_key    text;
  v_detail jsonb;
  v_probe  jsonb;
  r        record;
begin
  -- (a) one overload of each name.
  foreach v_key in array array['victoria_daily_verdict', 'victoria_daily_check', 'victoria_active_probe', 'victoria_intake_lists'] loop
    select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = v_key and p.prokind = 'f';
    if v_n <> 1 then
      raise exception 'agt613: pg_proc holds % overloads of %, expected 1', v_n, v_key;
    end if;
  end loop;

  -- (b) EXECUTE closed to anon/authenticated BY NAME, open to service_role.
  foreach v_key in array array['public.victoria_daily_verdict(jsonb, integer, integer)', 'public.victoria_daily_check()', 'public.victoria_active_probe()'] loop
    if has_function_privilege('anon', v_key, 'EXECUTE') or has_function_privilege('authenticated', v_key, 'EXECUTE') then
      raise exception 'agt613: anon or authenticated can EXECUTE % -- the named revoke did not land', v_key;
    end if;
    if not has_function_privilege('service_role', v_key, 'EXECUTE') then
      raise exception 'agt613: service_role cannot EXECUTE %', v_key;
    end if;
  end loop;

  -- (c) THE VERDICT'S DISCRIMINATOR: the two old arms keep priority; arm 3 answers only alone; the
  --     2-arg call still resolves (the DEFAULT).
  for r in
    select * from (values
      ('[{"slug":"z","countable":9}]'::jsonb,  0, 1, true,  'project_below_floor'),
      ('[{"slug":"z","countable":10}]'::jsonb, 1, 1, true,  'five_outside_projects'),
      ('[{"slug":"z","countable":10}]'::jsonb, 0, 1, true,  'ungraded_in_active'),
      ('[{"slug":"z","countable":10}]'::jsonb, 0, 0, false, 'at_floor')) t(c, f, u, p, why)
  loop
    if not exists (select 1 from public.victoria_daily_verdict(r.c, r.f, r.u) v where v.prompt = r.p and v.reason = r.why) then
      raise exception 'agt613: victoria_daily_verdict(%, %, %) does not answer % / %', r.c, r.f, r.u, r.p, r.why;
    end if;
  end loop;
  if not exists (select 1 from public.victoria_daily_verdict('[{"slug":"z","countable":10}]'::jsonb, 0) v where v.prompt = false and v.reason = 'at_floor') then
    raise exception 'agt613: the 2-arg call no longer answers at_floor at ten with no five -- the DEFAULT is missing';
  end if;

  -- (d) the reader's contract: one row, every old key, plus ungraded_active.
  select count(*) into v_n from public.victoria_daily_check();
  if v_n <> 1 then
    raise exception 'agt613: victoria_daily_check() returned % rows, expected 1', v_n;
  end if;
  select c.detail into v_detail from public.victoria_daily_check() c;
  foreach v_key in array array['below', 'counts', 'fives', 'five_ids', 'ungraded_active'] loop
    if not (v_detail ? v_key) then
      raise exception 'agt613: victoria_daily_check().detail is missing key % -- %', v_key, v_detail;
    end if;
  end loop;

  -- (e) ARM 3's DISCRIMINATOR: un-grade one ticket of a running project and both readers must see it.
  v_probe := public.victoria_active_probe();
  if v_probe ? 'skipped' then
    raise notice 'agt613: probe skipped -- %', v_probe;
  else
    if (v_probe->>'residue')::integer is distinct from 0 then
      raise exception 'agt613: the probe left the grade of % changed (residue %) -- the sentinel did not roll it back. %', v_probe->>'id', v_probe->>'residue', v_probe;
    end if;
    if (v_probe->>'after')::integer is distinct from (v_probe->>'before')::integer + 1 then
      raise exception 'agt613: un-grading % did not raise ungraded_active by one -- arm 3 is not reading victoria_intake_lists() executing rows. %', v_probe->>'id', v_probe;
    end if;
    if (v_probe->>'list_after')::integer is distinct from (v_probe->>'list_before')::integer + 1 then
      raise exception 'agt613: un-grading % did not add it to the % row of victoria_intake_lists(). %', v_probe->>'id', v_probe->>'slug', v_probe;
    end if;
  end if;

  -- (f) the bodies that landed are the bodies in this file (md5 computed from the file before apply).
  select md5(p.prosrc) into v_key from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'victoria_daily_check' and p.prokind = 'f';
  if v_key <> '0726375de1904fc03dedaadd0328b202' then
    raise exception 'agt613: victoria_daily_check landed at md5 %, this file reads 0726375de1904fc03dedaadd0328b202', v_key;
  end if;
  select md5(p.prosrc) into v_key from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'victoria_daily_verdict' and p.prokind = 'f';
  if v_key <> 'e1ca880ebff37f5df7446f05844f5fb2' then
    raise exception 'agt613: victoria_daily_verdict landed at md5 %, this file reads e1ca880ebff37f5df7446f05844f5fb2', v_key;
  end if;

  raise notice 'AGT-613 GATE PASSED: one overload each, grants both ways, verdict 3 arms in order, detail.ungraded_active present, probe %', v_probe;
end
$gate$;
