-- DeepBench v7.0.949 | docs/design/platform-invariants.sql | the daily self-check (INTAKE-LIFECYCLE-RCA-1103 D6)
--
-- WHY. Every stall of 2026-10-30..11-03 ran for a day or more before a person noticed: the meter
-- self-read (40 h of meter_stale), the missing November budget row, the no-ship counter, Victoria's
-- daily routine that was never created. Each one breaks a rule of John's lifecycle that the data can
-- test. This file tests those rules once a day from the database itself (pg_cron, no model, nothing to
-- drift), records every result, and turns a broken rule into a finding -- which the lifecycle already
-- repairs: the Governance Architect writes the tested ticket, Victoria places it, a builder ships it.
-- A rule that stays broken a second day is escalated to John's morning report.
--
-- THE RULES (each reads live state; a new project, list, lane or source needs no edit here):
--   runner_stalled     -- in the last 6 hours the runner either wrote nothing at all, or its last three
--                         start-up refusals were all for a reason that is not pacing or capacity
--                         (meter_stale, no_budget_row, db_pressure, anything new). Pacing, capacity and
--                         an empty board are healthy refusals and never trip it.
--   victoria_missed    -- her daily check says she is needed, her daily routine has existed 26 hours,
--                         and she wrote no victoria-daily synthesis in the last 26 hours.
--   intake_stuck       -- ungraded tickets are waiting and the count is not lower than it was 7 days ago.
--   budget_next_month  -- from the 25th (Central), next month's runner_budget row is missing. Money is
--                         John's: this one is filed with john_call = 'money' and is never repaired here.
--
-- Applied live as migration v7_0_949_platform_invariants.
-- DOWN: select cron.unschedule('platform-invariants-daily'); delete from public.finding_routes where source = 'invariant';
--       drop function public.platform_invariant_check(); drop function public.platform_invariant_eval();
--       drop table public.platform_invariant_results;

create table if not exists public.platform_invariant_results (
  id          uuid primary key default gen_random_uuid(),
  checked_at  timestamptz not null default now(),
  invariant   text not null,
  ok          boolean not null,
  detail      jsonb not null default '{}'::jsonb,
  finding_id  uuid
);
create index if not exists platform_invariant_results_inv_at on public.platform_invariant_results (invariant, checked_at desc);
alter table public.platform_invariant_results enable row level security;

create or replace function public.platform_invariant_eval()
 returns table(invariant text, ok boolean, detail jsonb)
 language plpgsql
 stable
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_healthy  text[] := array['weekly_pace','weekly pace','weekly_wall','lanes_full','nothing_pickable',
                             'work_to_find','gate_cards_to_rule','unaffordable','scheduler_off'];
  v_rows     integer;
  v_last3    text[];
  v_need     boolean;
  v_created  timestamptz;
  v_ran      timestamptz;
  v_ungraded integer;
  v_prior    integer;
  v_next     text;
  v_today    date := (now() at time zone 'America/Chicago')::date;
begin
  -- runner_stalled
  select count(*) into v_rows from public.runner_cycles c where c.started_at > now() - interval '6 hours';
  -- The last three scheduled fires, each reduced to its refusal reason, or NULL when the fire booted.
  select array_agg(r order by s desc) into v_last3 from (
    select case when c.last_step like 'step 0 — pre-boot refusal (%'
                then substring(c.last_step from 'refusal \(([a-z_ ]+)') end r,
           c.started_at s
      from public.runner_cycles c
     where c.started_at > now() - interval '6 hours'
       and c.trigger = 'scheduled'
     order by c.started_at desc limit 3) x;
  invariant := 'runner_stalled';
  -- Broken = no row at all in 6 hours, or three refusals in a row, none of them a healthy reason.
  ok := not (v_rows = 0
             or (coalesce(array_length(v_last3, 1), 0) = 3
                 and (select bool_and(r is not null and not (r = any (v_healthy))) from unnest(v_last3) r)));
  detail := jsonb_build_object('rows_6h', v_rows, 'last3_reasons', to_jsonb(v_last3), 'healthy', to_jsonb(v_healthy));
  return next;

  -- victoria_missed
  select d.prompt into v_need from public.victoria_daily_check() d;
  select min(rd.decided_at) into v_created from public.runner_decisions rd
   where rd.kind = 'routine' and rd.summary like 'Created and enabled routine victoria-daily-check%' and rd.reversed_at is null;
  select max(rd.decided_at) into v_ran from public.runner_decisions rd
   where rd.kind = 'synthesis' and rd.session_name like 'victoria-daily-%';
  invariant := 'victoria_missed';
  ok := not (coalesce(v_need, false) and v_created is not null and v_created < now() - interval '26 hours'
             and (v_ran is null or v_ran < now() - interval '26 hours'));
  detail := jsonb_build_object('needed', v_need, 'routine_since', v_created, 'last_run', v_ran);
  return next;

  -- intake_stuck
  select coalesce(sum(l.ungraded), 0) into v_ungraded from public.victoria_intake_lists() l;
  select (r.detail->>'ungraded')::int into v_prior from public.platform_invariant_results r
   where r.invariant = 'intake_stuck' and r.checked_at <= now() - interval '7 days'
   order by r.checked_at desc limit 1;
  invariant := 'intake_stuck';
  ok := not (v_ungraded > 0 and v_prior is not null and v_ungraded >= v_prior);
  detail := jsonb_build_object('ungraded', v_ungraded, 'ungraded_7d_ago', v_prior);
  return next;

  -- budget_next_month
  v_next := to_char(date_trunc('month', v_today) + interval '1 month', 'YYYY-MM');
  invariant := 'budget_next_month';
  ok := not (extract(day from v_today) >= 25 and not exists (select 1 from public.runner_budget b where b.month = v_next));
  detail := jsonb_build_object('next_month', v_next, 'day', extract(day from v_today));
  return next;
end
$function$;

create or replace function public.platform_invariant_check()
 returns table(invariant text, ok boolean, action text)
 language plpgsql
 volatile
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  r          record;
  v_fp       text;
  v_open     uuid;
  v_prev_bad boolean;
  v_fid      uuid;
  v_action   text;
begin
  for r in select * from public.platform_invariant_eval() loop
    v_fid := null; v_action := 'ok'; v_open := null; v_prev_bad := null;
    if not r.ok then
      v_fp := left(md5('invariant:' || r.invariant), 16);
      select f.id into v_open from public.audit_findings f
       where f.fingerprint = v_fp and f.status in ('open', 'carried', 'listed', 'escalated')
       order by f.created_at desc limit 1;
      select not x.ok into v_prev_bad from public.platform_invariant_results x
       where x.invariant = r.invariant and x.checked_at < now() - interval '12 hours'
       order by x.checked_at desc limit 1;
      if v_open is null then
        insert into public.audit_findings (fingerprint, iso_week, kind, locations, governing_fact, confidence,
               proposed_resolution, status, found_by, finding_type, family, john_call)
        values (v_fp, to_char(now(), 'IYYY-"W"IW'), 'other',
                jsonb_build_array(jsonb_build_object('location', 'public.platform_invariant_eval() ' || r.invariant,
                                                     'text', r.detail::text)),
                'DAILY SELF-CHECK FAILED: ' || r.invariant || '. ' || r.detail::text,
                'high',
                'Find why the rule broke and repair the cause (docs/design/platform-invariants.sql names each rule). '
                  || 'A second failed day escalates this to John''s morning report.',
                case when r.invariant = 'budget_next_month' then 'escalated' else 'open' end,
                'invariant:' || r.invariant, 'defect', 'blocked',
                case when r.invariant = 'budget_next_month' then 'money' else null end)
        returning id into v_fid;
        v_action := 'filed';
      else
        v_fid := v_open;
        if coalesce(v_prev_bad, false) then
          update public.audit_findings set status = 'escalated' where id = v_open and status <> 'escalated';
          v_action := 'escalated';
        else
          v_action := 'already filed';
        end if;
      end if;
    end if;
    insert into public.platform_invariant_results (invariant, ok, detail, finding_id)
    values (r.invariant, r.ok, r.detail, v_fid);
    invariant := r.invariant; ok := r.ok; action := v_action;
    return next;
  end loop;
end
$function$;

revoke all on function public.platform_invariant_eval() from public, anon, authenticated;
revoke all on function public.platform_invariant_check() from public, anon, authenticated;
grant execute on function public.platform_invariant_eval() to service_role;
grant execute on function public.platform_invariant_check() to service_role;

-- The finding's route: without a row, finding_group_epic() RAISEs `unmapped source` and stops the whole
-- review (the AGT-134 / AGT-159 lesson). NULL-free: it lands on the capture list like every other source.
insert into public.finding_routes (precedence, source, finding_type, project_slug, note)
select 30, 'invariant', '*', 'dev-mgr-findings',
       'v7.0.949 (INTAKE-LIFECYCLE-RCA-1103 D6): the daily self-check files a broken lifecycle rule as found_by invariant:<rule>; it goes through the one findings review like any other.'
 where not exists (select 1 from public.finding_routes where source = 'invariant');

-- 5:30 AM Central standard time, after Victoria's 4:50 run has had time to finish.
select cron.schedule('platform-invariants-daily', '30 11 * * *', $$select public.platform_invariant_check()$$);
