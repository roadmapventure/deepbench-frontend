-- DeepBench v7.0.588 | docs/design/agt-142-model-catalog.sql | AGT-142 (P10 - Tooling)
-- Migration agt142_model_catalog: one table names the model for every job type.
--
-- model_catalog      one row per model DeepBench knows about. List price is NOT stored here:
--                    model_id FKs public.model_pricing(model) (§19t is the one price home) and a
--                    reader joins for it.
-- model_assignments  one row per job (a runner lane, or a capability whose default Intent Skill
--                    runs a model no lane names) -> the model that job runs.
-- runner_model_lanes stays a TABLE (six readers, capture_migration_down refuses an existing table,
--                    so table->view is irreversible) and becomes a mirror: the AFTER trigger on
--                    model_assignments writes it, the BEFORE guard refuses every other writer.
--
-- Down captured FIRST by capture_migration_down('777c9812-…','agt142_model_catalog', 6 objects):
-- auto-downable, 6 captured, 0 refused. The model_pricing price row is data and is not in the
-- down (on conflict do nothing: it never overwrites a price someone else set).

-- 1. The price home learns the new model.
insert into public.model_pricing (model, input_per_1k, output_per_1k)
values ('claude-opus-5-5', 0.004, 0.020)
on conflict (model) do nothing;

-- 2. model_catalog
create table public.model_catalog (
  model_id          text primary key references public.model_pricing(model),
  family            text not null,
  released_on       date,
  retire_not_before date,
  deprecated_on     date,
  plan_availability jsonb,
  stated_strengths  text,
  source_url        text,
  first_seen        timestamptz not null,
  last_checked      timestamptz,
  created_at        timestamptz not null default now()
);

insert into public.model_catalog
  (model_id, family, released_on, retire_not_before, stated_strengths, source_url, first_seen, last_checked)
values
  ('claude-opus-5-5', 'Opus', date '2026-09-22', date '2027-09-22',
   'Anthropic release notes (2026-09-22): "a model for long-running agentic coding and knowledge work. '
   || 'It has a 1M token context window by default, 128k max output tokens, and always-on adaptive thinking, '
   || 'at $4 / $20 USD per MTok (Claude Opus 5 is $5 / $25)." anthropic.com/claude-opus-5-5: '
   || '"It costs 40% less to run than Opus 5 ... performs at the level of Claude Fable 5.1 on most work". '
   || '(Audit W39 finding 961caae922b0381a, retrieved 2026-09-25.)',
   'https://platform.claude.com/docs/en/release-notes/overview',
   timestamptz '2026-09-25', now()),
  ('claude-opus-5',             'Opus',   null, date '2027-07-24', null, null, timestamptz '2026-09-09', now()),
  ('claude-fable-5-1',          'Fable',  null, null,              null, null, timestamptz '2026-09-09', null),
  ('claude-sonnet-5',           'Sonnet', null, null,              null, null, timestamptz '2026-09-02', null),
  ('claude-sonnet-4-6',         'Sonnet', null, null,              null, null, timestamptz '2026-06-23', null),
  ('claude-haiku-4-5-20251001', 'Haiku',  null, null,              null, null, timestamptz '2026-06-23', null);

-- 3. model_assignments
create table public.model_assignments (
  job_kind            text not null check (job_kind in ('lane', 'capability')),
  job_key             text not null,
  model_id            text not null references public.model_catalog(model_id),
  complexity_band     text check (complexity_band in ('hard-judgment', 'orchestration', 'mechanical')),
  purpose             text,
  since               timestamptz,
  decision_id         uuid,
  trial_evidence      jsonb not null default '[]'::jsonb,
  watch_runs_observed integer not null default 0,
  watch_baseline      jsonb,
  updated_at          timestamptz not null default now(),
  updated_by          text,
  primary key (job_kind, job_key)
);

-- Seed: the three lanes, copied verbatim (updated_at/updated_by kept).
insert into public.model_assignments (job_kind, job_key, model_id, complexity_band, purpose, updated_at, updated_by)
select 'lane', l.lane, l.model_id,
       case l.lane when 'orchestrator' then 'orchestration'
                   when 'judgment'     then 'hard-judgment'
                   when 'mechanical'   then 'mechanical' end,
       l.purpose, l.updated_at, l.updated_by
  from public.runner_model_lanes l;

-- Seed: capabilities whose default Intent Skill runs a model no lane names.
insert into public.model_assignments (job_kind, job_key, model_id, complexity_band, updated_by)
select 'capability', c.slug, sp.llm_model, 'mechanical', 'agt142_model_catalog'
  from public.capabilities c
  join public.skill_profiles sp on sp.slug = c.default_intent_slug
 where sp.llm_model not in (select model_id from public.runner_model_lanes);

-- 4. Sync: model_assignments lane rows -> runner_model_lanes (the mirror).
create or replace function public.model_assignments_sync_lanes()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  perform set_config('deepbench.lane_sync', 'on', true);

  if tg_op in ('DELETE', 'UPDATE') and old.job_kind = 'lane'
     and (tg_op = 'DELETE' or new.job_kind <> 'lane' or new.job_key <> old.job_key) then
    delete from public.runner_model_lanes where lane = old.job_key;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.job_kind = 'lane' then
    insert into public.runner_model_lanes (lane, model_id, purpose, updated_at, updated_by)
    values (new.job_key, new.model_id, new.purpose, new.updated_at, new.updated_by)
    on conflict (lane) do update
       set model_id   = excluded.model_id,
           purpose    = excluded.purpose,
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by;
  end if;

  perform set_config('deepbench.lane_sync', 'off', true);
  return null;
end
$fn$;

-- 5. Guard: runner_model_lanes refuses every writer but the sync.
create or replace function public.runner_model_lanes_guard()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if coalesce(current_setting('deepbench.lane_sync', true), '') <> 'on' then
    raise exception 'runner_model_lanes is a mirror: write public.model_assignments (AGT-142)';
  end if;
  return null;
end
$fn$;

create trigger trg_model_assignments_sync_lanes
  after insert or update or delete on public.model_assignments
  for each row execute function public.model_assignments_sync_lanes();

-- Created AFTER the seed, as the kickoff orders.
create trigger trg_runner_model_lanes_guard
  before insert or update or delete or truncate on public.runner_model_lanes
  for each statement execute function public.runner_model_lanes_guard();

-- 6. Grants: pg_default_acl opens new objects to anon/authenticated -- close them.
revoke all on public.model_catalog, public.model_assignments from anon, authenticated;
grant select, insert, update, delete on public.model_catalog, public.model_assignments to service_role;
revoke all on function public.model_assignments_sync_lanes() from public, anon, authenticated;
revoke all on function public.runner_model_lanes_guard()     from public, anon, authenticated;

-- 7. Assert: grants closed, service_role holds DML, lanes unchanged.
do $assert$
declare n int;
begin
  select count(*) into n from information_schema.role_table_grants
   where table_schema = 'public' and table_name in ('model_catalog', 'model_assignments')
     and grantee in ('anon', 'authenticated');
  if n <> 0 then raise exception 'AGT-142: % anon/authenticated grants remain', n; end if;

  select count(*) into n from information_schema.role_table_grants
   where table_schema = 'public' and table_name in ('model_catalog', 'model_assignments')
     and grantee = 'service_role' and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  if n <> 8 then raise exception 'AGT-142: service_role holds % of 8 DML grants', n; end if;

  if has_function_privilege('anon', 'public.model_assignments_sync_lanes()', 'execute')
     or has_function_privilege('authenticated', 'public.model_assignments_sync_lanes()', 'execute')
     or has_function_privilege('anon', 'public.runner_model_lanes_guard()', 'execute')
     or has_function_privilege('authenticated', 'public.runner_model_lanes_guard()', 'execute') then
    raise exception 'AGT-142: a trigger function is executable by anon/authenticated';
  end if;

  select count(*) into n from public.runner_model_lanes l
   where (l.lane, l.model_id, l.updated_at, l.updated_by) in (
     ('orchestrator', 'claude-opus-5',    timestamptz '2026-09-02T23:17:49.529179+00:00', 'ses-313-coding'),
     ('judgment',     'claude-fable-5-1', timestamptz '2026-09-09T19:20:19.34746+00:00',
        'design-runner-24h-0908 (decision 91d43ca7-8e71-455a-b885-30a336367a27)'),
     ('mechanical',   'claude-sonnet-5',  timestamptz '2026-09-02T23:17:49.529179+00:00', 'ses-313-coding'));
  if n <> 3 or (select count(*) from public.runner_model_lanes) <> 3 then
    raise exception 'AGT-142: runner_model_lanes no longer equals the measured three rows';
  end if;

  select count(*) into n from public.runner_model_lanes l
    join public.model_assignments a on a.job_kind = 'lane' and a.job_key = l.lane
   where a.model_id = l.model_id and a.purpose is not distinct from l.purpose
     and a.updated_at = l.updated_at and a.updated_by is not distinct from l.updated_by;
  if n <> 3 then raise exception 'AGT-142: lane assignments do not mirror runner_model_lanes (% of 3)', n; end if;
end
$assert$;
