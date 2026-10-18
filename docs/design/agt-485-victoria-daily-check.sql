-- AGT-485 (v7.0.860) -- THE DAILY CHECK. `AGT-481` built the floor's sensor and nothing called it:
-- measured live 2026-10-18, `countable_tickets_per_project()` has no caller outside the docs, the
-- four `docs/design/*.sql` mirrors and its own guard -- no script, no routine prompt, no `api/`
-- route. Victoria ran WEEKLY (`trig_012xvmXsXAjbVxdbYhUTq6W1`, Tuesday) and on an idle find-work
-- pass that re-scored the Development Manager's list five times in one night, so a project that
-- fell under ten between runs was watched by nobody. John's requirements d.35 replaces both with
-- ONE DAILY CHECK; this migration is its reader, and the switches stay John's hand.
--
-- TWO FUNCTIONS, AND THE SPLIT IS THE POINT (pattern:9/10/18):
--
--   (1) `victoria_daily_verdict(jsonb, integer)` is PURE and IMMUTABLE -- the ONE HOME of John's
--       ten (requirements d.1). It takes the per-project counts and the number of 5s outside the
--       active projects and answers prompt/reason, nothing else. No table, no clock, no model: the
--       threshold is declared once, in a function a test can drive at 9 and at 10 without standing
--       up a board, which is exactly what `tests/regression/agt-485-victoria-daily-check.test.mjs`
--       arm A does.
--
--   (2) `victoria_daily_check()` is the READER -- STABLE, service_role only. Arm 1 asks
--       `countable_tickets_per_project()` and does NOT re-implement it: that function is
--       byte-unchanged by this migration and its own guard (`AGT-481`) still grades it. Arm 2 is
--       that function's own P1-P8 block with exactly TWO changes -- `effective_need_score(b.id) = 5`
--       in place of `>= 3` (the 5s, requirements d.3), and `planned`-or-unhomed in place of
--       `executing` (d.10: never a `paused` project's ticket). Both arms feed the verdict, and
--       `detail` carries the evidence a prompt is acted on with: the slugs below the floor, the
--       per-project counts, and the ids of the fives.
--
-- WHY ARM 2 IS SPLICED AND NOT RETYPED: the P1-P8 predicates below were read out of
-- `pg_get_functiondef(public.countable_tickets_per_project)` live on 2026-10-18 and changed at the
-- two lines named above and nowhere else -- so they carry `AGT-483`'s `effective_need_score()` and
-- `AGT-482`'s `claim_exclusion_reason()` as those tickets left them, rather than a second copy of
-- the rules that drifts (pattern:14/17).
--
-- WHY `service_role` ONLY: both functions read the whole board's grading and claim state. Postgres
-- grants EXECUTE to anon, authenticated and service_role BY NAME the instant a function is created,
-- and `REVOKE ... FROM PUBLIC` does not touch those named grants
-- (.claude/rules/supabase-column-grants.md, SES-315 addendum). Revoked by name below; the GATE
-- asserts both directions rather than trusting the migration's success flag.
--
-- WHAT THIS MIGRATION DOES NOT DO: it creates no routine, fills no routine id, switches nothing on
-- and switches nothing off. The weekly `victoria-reorg` routine stays ON and
-- `runner_settings.find_work_lists` stays `{}` (d.39's UNDO superseded by d.35). Creating the daily
-- routine from `docs/runbooks/victoria-daily-check.md`, filling its id in
-- `scripts/check-routine-prompt.js` and `scripts/sync-routine-models.js`, switching it on and
-- switching the weekly off are ATTENDED work -- John's hand alone.
--
-- THIS FILE IS THE MIRROR of the migration `agt485_victoria_daily_check`, applied via mcp Supabase
-- `apply_migration` (which wraps the whole file in ONE transaction, so no BEGIN/COMMIT here -- and
-- so the trailing GATE's RAISE rolls every statement below back). Kickoff:
-- docs/kickoffs/v7.0.860-AGT-485-victoria-daily-check.md; reasoning: docs/harvests/AGT-485.md.
--
-- =================================================================================================
-- *** APPLIED 2026-10-18 by cycle 85dfe47d-4cad-4205-91ae-4b4827b9eb95 -- THIS IS NOW THE MIRROR. ***
-- =================================================================================================
--
-- (a) THE DOWN, CAPTURED FIRST -- before any statement below ran (runbook step 6). Returned row,
--     verbatim:
--
--       captured_up_name     agt485_victoria_daily_check
--       captured_class       auto-downable
--       objects_captured     2
--       refusals             0
--       derived_down_sql     drop function if exists public.victoria_daily_check();
--                            drop function if exists public.victoria_daily_verdict(jsonb, integer);
--
--     Neither function existed, so the down is a pair of drops and nothing of the prior state had
--     to be recovered -- `countable_tickets_per_project()` is not named in it because this
--     migration does not touch it.
--
-- (b) `apply_migration` name `agt485_victoria_daily_check` with the body below, byte for byte. The
--     trailing GATE committed with it, which is the evidence; the success flag was NOT taken as
--     proof -- every assertion was re-read independently afterwards and the guard was run against
--     the applied state.
--
-- =================================================================================================
-- (1) victoria_daily_verdict(p_counts, p_fives) -- John's ten, declared ONCE. Pure and IMMUTABLE.
--
--     THE ORDER OF THE TWO ARMS IS THE RULE, not a convenience: a project under ten answers
--     `project_below_floor` even when a 5 is also loose outside the active projects, because the
--     floor is the duty (requirements d.1) and the loose 5 is the second question (d.3). Only when
--     every project is at ten does the 5 become the reason -- and with neither, `at_floor` and the
--     run writes nothing.
-- =================================================================================================
CREATE OR REPLACE FUNCTION public.victoria_daily_verdict(p_counts jsonb, p_fives integer)
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
              ELSE false END AS prompt,
         CASE WHEN b.n > 0 THEN 'project_below_floor'
              WHEN coalesce(p_fives, 0) > 0 THEN 'five_outside_projects'
              ELSE 'at_floor' END::text AS reason
    FROM below b
$function$;

REVOKE ALL ON FUNCTION public.victoria_daily_verdict(jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.victoria_daily_verdict(jsonb, integer) TO service_role;

-- =================================================================================================
-- (2) victoria_daily_check() -- the one daily reader. Arm 1 is the sensor, unchanged; arm 2 is that
--     sensor's own P1-P8 block at score 5 over `planned`-or-unhomed tickets.
--
--     ARM 1 JOINS `projects` ONLY FOR `priority`, so `counts` and `below` come back in the sensor's
--     own `priority, slug` order -- the order the prompt's step 2 works the projects in. A
--     jsonb_agg with no ORDER BY would read whatever order the executor handed it, and a run that
--     is not reproducible is not comparable (pattern:3/127).
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
  ),
  fives AS (
    SELECT count(*)::integer AS n,
           coalesce(jsonb_agg(to_jsonb(f.backlog_id) ORDER BY f.backlog_id), '[]'::jsonb) AS js
      FROM arm2 f
  )
  SELECT v.prompt,
         v.reason,
         jsonb_build_object(
           'below',    below.js,
           'counts',   counts.js,
           'fives',    fives.n,
           'five_ids', fives.js) AS detail
    FROM counts, below, fives,
         public.victoria_daily_verdict(counts.js, fives.n) v
$function$;

REVOKE ALL ON FUNCTION public.victoria_daily_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.victoria_daily_check() TO service_role;

-- =================================================================================================
-- (3) THE GATE. Asserts, writes nothing, and RAISEs -- which rolls every statement above back,
--     because `apply_migration` wraps the file in one transaction. So a COMMITTED migration is
--     itself the proof that all five checks held; the success flag is never the evidence
--     (.claude/rules/supabase-column-grants.md: never trust the migration's success flag).
--
--     CHECK (e) IS THE DISCRIMINATOR: the verdict is driven at 9 and at 10 on a hand-built
--     `p_counts`, so a function that prompted on everything -- or on nothing -- cannot commit.
-- =================================================================================================
DO $gate$
declare
  v_n        integer;
  v_prompt   boolean;
  v_reason   text;
  v_rows     integer;
  v_tooling  integer;
  v_ids      text[];
  v_detail   jsonb;
  v_key      text;
begin
  -- (a) exactly one overload of each name -- a signature change creates an overload, it does not
  -- replace one (.claude/rules/supabase-function-signature.md).
  select count(*) into v_n from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'victoria_daily_verdict';
  if v_n <> 1 then
    raise exception 'agt485: pg_proc holds % overloads of victoria_daily_verdict, expected 1', v_n;
  end if;

  select count(*) into v_n from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'victoria_daily_check';
  if v_n <> 1 then
    raise exception 'agt485: pg_proc holds % overloads of victoria_daily_check, expected 1', v_n;
  end if;

  -- (b) EXECUTE: closed to anon and authenticated BY NAME, open to service_role. Both functions,
  -- both directions.
  if has_function_privilege('anon', 'public.victoria_daily_verdict(jsonb, integer)', 'EXECUTE') then
    raise exception 'agt485: anon can EXECUTE victoria_daily_verdict -- the named revoke did not land';
  end if;
  if has_function_privilege('authenticated', 'public.victoria_daily_verdict(jsonb, integer)', 'EXECUTE') then
    raise exception 'agt485: authenticated can EXECUTE victoria_daily_verdict -- the named revoke did not land';
  end if;
  if NOT has_function_privilege('service_role', 'public.victoria_daily_verdict(jsonb, integer)', 'EXECUTE') then
    raise exception 'agt485: service_role CANNOT EXECUTE victoria_daily_verdict -- the grant is missing';
  end if;

  if has_function_privilege('anon', 'public.victoria_daily_check()', 'EXECUTE') then
    raise exception 'agt485: anon can EXECUTE victoria_daily_check -- the named revoke did not land';
  end if;
  if has_function_privilege('authenticated', 'public.victoria_daily_check()', 'EXECUTE') then
    raise exception 'agt485: authenticated can EXECUTE victoria_daily_check -- the named revoke did not land';
  end if;
  if NOT has_function_privilege('service_role', 'public.victoria_daily_check()', 'EXECUTE') then
    raise exception 'agt485: service_role CANNOT EXECUTE victoria_daily_check -- the grant is missing';
  end if;

  -- (c) the sensor this reader stands on is UNCHANGED: three rows, one per executing project, and
  -- `tooling` still reads 1 {AGT-304}. If this moved, the reader is reporting a board nobody
  -- graded -- stop and report, never edit the AGT-481 guard to fit (kickoff §7).
  select count(*) into v_rows from public.countable_tickets_per_project();
  if v_rows <> 3 then
    raise exception 'agt485: countable_tickets_per_project() returned % rows, expected 3 executing projects', v_rows;
  end if;
  select c.countable, c.backlog_ids into v_tooling, v_ids
    from public.countable_tickets_per_project() c where c.project_slug = 'tooling';
  if coalesce(v_tooling, -1) <> 1 or coalesce(v_ids, '{}'::text[]) <> array['AGT-304']::text[] then
    raise exception 'agt485: tooling reads % %, expected 1 {AGT-304}', v_tooling, v_ids;
  end if;

  -- (d) the reader answers ONE row, and its detail carries the four keys the prompt's steps read.
  select count(*) into v_n from public.victoria_daily_check();
  if v_n <> 1 then
    raise exception 'agt485: victoria_daily_check() returned % rows, expected exactly 1', v_n;
  end if;
  select d.prompt, d.reason, d.detail into v_prompt, v_reason, v_detail
    from public.victoria_daily_check() d;
  if v_prompt is null or v_reason is null or v_detail is null then
    raise exception 'agt485: victoria_daily_check() answered % / % / % -- no part of the row may be null',
      v_prompt, v_reason, v_detail;
  end if;
  foreach v_key in array array['below', 'counts', 'fives', 'five_ids'] loop
    if not (v_detail ? v_key) then
      raise exception 'agt485: victoria_daily_check().detail is missing key % -- detail was %', v_key, v_detail;
    end if;
  end loop;

  -- (e) THE DISCRIMINATOR -- John's ten, both ways, on a hand-built count set that touches no
  -- table: nine prompts, ten is silent.
  select v.prompt, v.reason into v_prompt, v_reason
    from public.victoria_daily_verdict('[{"slug":"z","countable":9}]'::jsonb, 0) v;
  if v_prompt is not true or v_reason <> 'project_below_floor' then
    raise exception 'agt485: the verdict answered % / % at nine countable, expected true / project_below_floor',
      v_prompt, v_reason;
  end if;
  select v.prompt, v.reason into v_prompt, v_reason
    from public.victoria_daily_verdict('[{"slug":"z","countable":10}]'::jsonb, 0) v;
  if v_prompt is not false or v_reason <> 'at_floor' then
    raise exception 'agt485: the verdict answered % / % at ten countable with no loose five, expected false / at_floor',
      v_prompt, v_reason;
  end if;
  select v.prompt, v.reason into v_prompt, v_reason
    from public.victoria_daily_verdict('[{"slug":"z","countable":10}]'::jsonb, 1) v;
  if v_prompt is not true or v_reason <> 'five_outside_projects' then
    raise exception 'agt485: the verdict answered % / % at ten with one loose five, expected true / five_outside_projects',
      v_prompt, v_reason;
  end if;

  raise notice 'AGT-485 GATE PASSED: 1 overload each, EXECUTE closed to anon/authenticated and open to service_role on both, sensor unmoved at % rows and tooling 1 {AGT-304}, the verdict prompts at nine and is silent at ten',
    v_rows;
end
$gate$;
