-- DeepBench v7.0.1038 | docs/design/agt-317-routine-turn-timings.sql | AGT-317
-- Mirror of migration agt317_routine_turn_timings. One row per harness transcript per session:
-- how long the model took between tool calls, written by scripts/lib/turn-timings.mjs sweep().
-- DOWN (captured by capture_migration_down before the apply): drop table public.routine_turn_timings;
-- ---- THE MIGRATION, VERBATIM ---
create table public.routine_turn_timings (
  session_id      text        not null,
  transcript      text        not null,
  kind            text        not null check (kind in ('main', 'subagent')),
  model           text,
  cycle_id        uuid,
  swept_by        text        not null,
  first_at        timestamptz not null,
  last_at         timestamptz not null,
  turns           integer     not null check (turns >= 0),
  turn_ms         bigint      not null check (turn_ms >= 0),
  tool_calls      integer     not null check (tool_calls >= 0),
  tool_ms         bigint      not null check (tool_ms >= 0),
  p50_ms          integer,
  p90_ms          integer,
  max_ms          integer,
  slow_turns      integer     not null check (slow_turns >= 0),
  slow_generating integer     not null check (slow_generating >= 0),
  slow_waiting    integer     not null check (slow_waiting >= 0),
  output_tokens   bigint      not null check (output_tokens >= 0),
  recorded_at     timestamptz not null default now(),
  primary key (session_id, transcript),
  constraint routine_turn_timings_slow_adds_up check (slow_generating + slow_waiting = slow_turns)
);

comment on table public.routine_turn_timings is
  'AGT-317: model-turn and tool-call time per harness transcript, per session. Written by scripts/lib/turn-timings.mjs; read by scripts/measure-routine-turns.js --report.';

-- A new public table is born readable by anon (SES-384), so close it by name and assert it.
revoke all on public.routine_turn_timings from public, anon, authenticated;
grant select, insert, update, delete on public.routine_turn_timings to service_role;

do $$
declare n integer;
begin
  select count(*) into n
    from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'routine_turn_timings'
     and grantee in ('anon', 'authenticated', 'PUBLIC');
  if n <> 0 then
    raise exception 'AGT-317 GRANTS: % public grant row(s) remain on routine_turn_timings', n;
  end if;
  if has_table_privilege('anon', 'public.routine_turn_timings', 'SELECT')
     or has_table_privilege('authenticated', 'public.routine_turn_timings', 'SELECT')
     or has_table_privilege('anon', 'public.routine_turn_timings', 'INSERT') then
    raise exception 'AGT-317 GRANTS: anon or authenticated can still reach routine_turn_timings';
  end if;
  if not has_table_privilege('service_role', 'public.routine_turn_timings', 'INSERT')
     or not has_table_privilege('service_role', 'public.routine_turn_timings', 'UPDATE')
     or not has_table_privilege('service_role', 'public.routine_turn_timings', 'SELECT') then
    raise exception 'AGT-317 GRANTS: service_role cannot write routine_turn_timings';
  end if;
end $$;
