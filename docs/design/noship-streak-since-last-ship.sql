-- DeepBench v7.0.946 | docs/design/noship-streak-since-last-ship.sql | the no-ship fence counts a STREAK
--
-- WHAT WAS WRONG. `runner_settings.chain_max_noship_streak` (4) is a cap on a streak: a ticket that
-- keeps getting picked and keeps not shipping should stop being picked. `ticket_noship_cycles()`, its
-- only reader at pick time (prime_directive_queue() lane (c)), counted every non-shipping cycle in the
-- ticket's whole life and never reset on a ship. A long sliced ticket therefore crossed the cap on
-- scattered failures: AGT-304 had 41 cycles, 37 shipped and 4 not (10-21, 10-27, 10-30 06:44,
-- 10-30 09:46), each followed by ships, and has been fenced out of the pick since 2026-10-30 09:46 CT
-- with no exclusion reason anywhere (lane (c)'s fence is not a pick_exclusions() clause, AGT-173).
-- Found in John's attended session 2026-11-03; the board read nothing_pickable while AGT-304 sat at
-- automation_rank 2, need_score 5.
--
-- THE FIX. Count only the non-shipping cycles that started AFTER the ticket's latest shipped cycle.
-- A ticket with no ship yet counts all of them, exactly as before, so four straight failures still
-- fence it. Callers are unchanged: prime_directive_queue() is the only function that calls this.
--
-- DOWN (restores the lifetime count):
--   create or replace function public.ticket_noship_cycles(p_backlog_id text) returns integer
--   language sql stable as $f$
--     select count(*)::int from public.runner_cycles c
--       left join public.backlog_items b on b.id = c.backlog_item_id
--      where coalesce(b.backlog_id, c.item_id) = p_backlog_id
--        and c.outcome is distinct from 'shipped';
--   $f$;

create or replace function public.ticket_noship_cycles(p_backlog_id text)
 returns integer
 language sql
 stable
as $function$
  with mine as (
    select c.started_at, c.outcome
      from public.runner_cycles c
      left join public.backlog_items b on b.id = c.backlog_item_id
     where coalesce(b.backlog_id, c.item_id) = p_backlog_id
  )
  select count(*)::int
    from mine m
   where m.outcome is distinct from 'shipped'
     and m.started_at > coalesce(
           (select max(s.started_at) from mine s where s.outcome = 'shipped'),
           '-infinity'::timestamptz);
$function$;

comment on function public.ticket_noship_cycles(text) is
  'Non-shipping cycles for one ticket SINCE its latest shipped cycle (a streak, matching runner_settings.chain_max_noship_streak). v7.0.946: was a lifetime count, which fenced AGT-304 on 4 scattered failures among 37 ships.';
