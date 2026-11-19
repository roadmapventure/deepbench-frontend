-- DeepBench v7.0.1061 | docs/design/agt-683-attended-park.sql | AGT-683 -- an attended-only redesign parks the ticket; the door says why each ticket is parked.

create or replace function public.park_attended_only(p_cycle_id uuid, p_backlog_id text, p_reason text)
 returns public.runner_refusal_attempts
 language plpgsql
as $function$
declare
  v_row public.runner_refusal_attempts;
begin
  if p_cycle_id is null then
    raise exception 'park_attended_only: p_cycle_id is required -- the park owes a before-image'
      using errcode = '23514';
  end if;
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'park_attended_only: p_reason is required -- name what only an attended session can do'
      using errcode = '23514';
  end if;
  if not exists (select 1 from public.refusal_parked_tickets() t where t.backlog_id = p_backlog_id) then
    raise exception 'park_attended_only: % is not on the redesign list (refusal_parked_tickets) -- nothing to park', p_backlog_id
      using errcode = '23514';
  end if;
  if exists (select 1 from public.runner_refusal_attempts a
              where a.backlog_id = p_backlog_id and a.attempt_no = 0) then
    raise exception 'park_attended_only: % already holds an attempt-0 row -- its ledger is not empty; read it before parking', p_backlog_id
      using errcode = '23514';
  end if;

  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data)
  values (p_cycle_id, 'runner_refusal_attempts', p_backlog_id || '/0', null);

  insert into public.runner_refusal_attempts (backlog_id, attempt_no, kind, opened_cycle, reason, outcome)
  values (p_backlog_id, 0, 'original', p_cycle_id, 'attended-only: ' || btrim(p_reason), 'parked')
  returning * into v_row;

  return v_row;
end
$function$;

create or replace function public.refusal_parked_why(p_backlog_id text)
 returns text
 language sql
 stable
as $function$
  select case
           when exists (select 1 from public.runner_refusal_attempts a
                         where a.backlog_id = p_backlog_id and a.refused_at is not null) then 'refused'
           when exists (select 1 from public.runner_skips s
                         where s.backlog_id = p_backlog_id and s.resolved_at is null
                           and s.reason_kind = 'permission-gate') then 'permission-gate'
           else 'needs-desktop'
         end;
$function$;

create or replace function public.refusal_ledger_brief()
 returns table(backlog_id text, title text, status text, attempts integer, state text, last_label text, last_refused_at timestamp with time zone, unknowns text, feedback_text text, feedback_result text)
 language sql
 stable
as $function$
  select x.backlog_id, x.title, x.status, x.attempts, x.state,
         x.last_label, x.last_refused_at, x.unknowns, x.feedback_text, x.feedback_result
    from (
  with t as (select distinct a.backlog_id from public.runner_refusal_attempts a)
  select t.backlog_id,
         b.title,
         b.status,
         (select count(*)::integer from public.runner_refusal_attempts a
           where a.backlog_id = t.backlog_id and a.kind = 'redesign') as attempts,
         case
           when b.status in ('done','delivered') then 'shipped'
           when exists (select 1 from public.runner_refusal_attempts a
                         where a.backlog_id = t.backlog_id and a.kind = 'diagnostic') then 'parked (diagnosed)'
           when exists (select 1 from public.runner_refusal_attempts a
                         where a.backlog_id = t.backlog_id and a.identical_to is not null) then 'parked (guard)'
           when exists (select 1 from public.runner_refusal_attempts a
                         where a.backlog_id = t.backlog_id and a.kind = 'original' and a.outcome = 'parked') then 'parked (attended-only)'
           when exists (select 1 from public.runner_refusal_attempts a
                         where a.backlog_id = t.backlog_id and a.outcome = 'open') then 'redesign open'
           else 'awaiting redesign'
         end as state,
         (select a.refusal_label from public.runner_refusal_attempts a
           where a.backlog_id = t.backlog_id and a.refused_at is not null
           order by a.refused_at desc limit 1) as last_label,
         (select a.refused_at from public.runner_refusal_attempts a
           where a.backlog_id = t.backlog_id and a.refused_at is not null
           order by a.refused_at desc limit 1) as last_refused_at,
         (select a.unknowns from public.runner_refusal_attempts a
           where a.backlog_id = t.backlog_id and a.kind = 'diagnostic' limit 1) as unknowns,
         (select a.feedback_text from public.runner_refusal_attempts a
           where a.backlog_id = t.backlog_id and a.kind = 'diagnostic' limit 1) as feedback_text,
         (select a.feedback_result from public.runner_refusal_attempts a
           where a.backlog_id = t.backlog_id and a.kind = 'diagnostic' limit 1) as feedback_result
    from t
    left join public.backlog_items b on b.backlog_id = t.backlog_id
    ) x
   order by x.last_refused_at desc nulls last, x.backlog_id;
$function$;

revoke all on function public.park_attended_only(uuid, text, text) from public, anon, authenticated;
revoke all on function public.refusal_parked_why(text) from public, anon, authenticated;
grant execute on function public.park_attended_only(uuid, text, text) to service_role;
grant execute on function public.refusal_parked_why(text) to service_role;
