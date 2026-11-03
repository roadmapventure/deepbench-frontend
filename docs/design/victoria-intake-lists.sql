-- DeepBench v7.0.948 | docs/design/victoria-intake-lists.sql | the waiting queue, as data
--
-- docs/design/INTAKE-LIFECYCLE-RCA-1103.md D3. Victoria grades tickets where the routing table
-- (finding_routes) filed them -- the `planned` holding projects -- and moves 3+ into the active ones.
-- Her prompts used to NAME those lists (or name only the active projects), so a list added later was
-- invisible and on 2026-11-03 she could reach none of them. This function is the ONE answer to "which
-- lists hold work waiting for her": every `planned` project with an open/partial ticket that is
-- ungraded, or graded 3+ and not parked or fit-stamped under the current charters. A new holding
-- project, source or route is included the day it gets a ticket. `paused` projects are not hers
-- (10-13 d.10); a held list (requirement-check.js HELD_LISTS) is refused by the door itself.
-- Order: the list with the newest waiting ticket first (10-13 d.7, newest work first).
--
-- Applied live as migration v7_0_947_victoria_intake_lists (named before the version claim landed on 948).
-- DOWN: drop function public.victoria_intake_lists();

create or replace function public.victoria_intake_lists()
 returns table(slug text, waiting integer, ungraded integer, newest_filed timestamptz)
 language sql
 stable
 set search_path to 'public', 'pg_catalog'
as $function$
  with t as (
    select pj.slug, b.backlog_id, b.filed_at,
           (select d.reasoning from public.runner_decisions d
             where d.kind = 'requirement-check' and d.backlog_id = b.backlog_id and d.reversed_at is null
             order by d.decided_at desc limit 1) as grade_reason,
           public.effective_need_score(b.id) as score
      from public.backlog_items b
      join public.epics e on e.id = b.epic_id
      join public.projects pj on pj.id = e.project_id
     where pj.status = 'planned'
       and b.status in ('open', 'partial')
       and not exists (select 1 from public.victoria_charter_state() s where b.backlog_id = any (s.stamped))
  )
  select t.slug,
         count(*)::int as waiting,
         count(*) filter (where t.grade_reason is null)::int as ungraded,
         max(t.filed_at) as newest_filed
    from t
   where t.grade_reason is null
      or (t.score >= 3 and t.grade_reason not ilike 'PARKED%')
   group by t.slug
   order by max(t.filed_at) desc nulls last, t.slug;
$function$;

revoke all on function public.victoria_intake_lists() from public, anon, authenticated;
grant execute on function public.victoria_intake_lists() to service_role;
