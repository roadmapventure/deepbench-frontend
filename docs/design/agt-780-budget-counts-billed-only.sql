-- DeepBench v7.0.1105 | docs/design/agt-780-budget-counts-billed-only.sql | AGT-780, migration UP (agt780_budget_counts_billed_only) -- RECORD ONLY: applied 2026-11-21 15:18Z (version 20261121151857), down captured first under cycle 8f109014-9c76-4aa4-803b-07b6cfef7480 (auto-downable). Never re-apply from this file.
-- AGT-780 up: the platform budget counts only API-billed calls.
-- A row's stored cost_usd is the platform's own billable mark (written at log time, LOG-149);
-- NULL means not billable (the subscription seat), so it is skipped rather than re-priced from tokens.
create or replace function public.platform_budget_status()
returns table(
  day_spent_usd numeric, week_spent_usd numeric, month_spent_usd numeric,
  day_limit_usd numeric, week_limit_usd numeric, month_limit_usd numeric,
  day_reopens_at timestamptz, week_reopens_at timestamptz, month_reopens_at timestamptz)
language sql stable
set search_path = public
as $function$
  with b as (
    select date_trunc('day',   now() at time zone 'America/Chicago') as d0,
           date_trunc('week',  now() at time zone 'America/Chicago') as w0,
           date_trunc('month', now() at time zone 'America/Chicago') as m0
  ), r as (
    select l.created_at at time zone 'America/Chicago' as lt,
           l.cost_usd as c
    from public.ai_activity_log l
    cross join b
    where l.created_at >= (least(b.w0, b.m0) at time zone 'America/Chicago')
      and l.cost_usd is not null
  )
  select
    coalesce((select sum(c) from r, b where r.lt >= b.d0), 0),
    coalesce((select sum(c) from r, b where r.lt >= b.w0), 0),
    coalesce((select sum(c) from r, b where r.lt >= b.m0), 0),
    s.platform_budget_day_usd, s.platform_budget_week_usd, s.platform_budget_month_usd,
    (b.d0 + interval '1 day')   at time zone 'America/Chicago',
    (b.w0 + interval '7 days')  at time zone 'America/Chicago',
    (b.m0 + interval '1 month') at time zone 'America/Chicago'
  from public.runner_settings s cross join b
  where s.id = 1;
$function$;

revoke execute on function public.platform_budget_status() from public, anon, authenticated;
grant execute on function public.platform_budget_status() to service_role;
