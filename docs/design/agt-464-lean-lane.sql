-- DeepBench v7.0.963 | docs/design/agt-464-lean-lane.sql | AGT-464 -- mirror of migration agt464_lean_lane
-- A dedicated Postgres role, lean_lane, switched by the JWT role claim (PostgREST's standard mechanism), and
-- four SECURITY DEFINER functions that are the ONLY things it may call. No existing grant is widened:
-- every grant below is to the NEW role. Down (manual, this order): drop function if exists the four lean_*
-- functions by identity; revoke lean_lane from authenticator; drop owned by lean_lane; drop role lean_lane.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'lean_lane') then
    create role lean_lane nologin noinherit;
  end if;
end $$;
grant lean_lane to authenticator;
alter role lean_lane set statement_timeout = '8s';
grant usage on schema public to lean_lane;

-- §2c: the atomic claim (p_write true) or the register-B42 re-assert / holder read (p_write false).
-- No updated_at bump (SES-316). A 0-row claim still returns the holder, so the role needs no SELECT.
create or replace function public.lean_claim_ticket(p_ticket text, p_session text, p_write boolean default true)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_rows integer := 0; r record;
begin
  if p_write then
    update public.backlog_items set claimed_by = p_session, claimed_at = now()
     where backlog_id = p_ticket and status <> 'done'
       and public.claim_exclusion_reason(claimed_by, claimed_at) is null;
    get diagnostics v_rows = row_count;
  end if;
  select backlog_id, claimed_by, claimed_at, status into r
    from public.backlog_items where backlog_id = p_ticket;
  if r.backlog_id is null then
    return jsonb_build_object('claimed', false, 'rows', 0, 'backlog_id', p_ticket, 'claimed_by', null,
                              'claimed_at', null, 'status', null, 'reason', 'no such ticket');
  end if;
  return jsonb_build_object('claimed', case when p_write then v_rows = 1 else r.claimed_by = p_session end,
                            'rows', v_rows, 'backlog_id', r.backlog_id, 'claimed_by', r.claimed_by,
                            'claimed_at', r.claimed_at, 'status', r.status);
end $$;

-- §2c: the one holder-guarded release, AFTER the push (q-claim-release-order). Returns rows affected.
create or replace function public.lean_release_claim(p_ticket text, p_session text)
returns integer language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_rows integer := 0;
begin
  update public.backlog_items set claimed_by = null, claimed_at = null
   where backlog_id = p_ticket and claimed_by = p_session;
  get diagnostics v_rows = row_count;
  return v_rows;
end $$;

-- §3: the version claim. The write IS the reservation; trg_dev_version_counter_issue records it as today.
create or replace function public.lean_claim_version(p_session text)
returns text language plpgsql security definer set search_path = public, pg_catalog as $$
declare v text;
begin
  update public.dev_version_counter
     set patch = patch + 1, updated_at = now(), updated_by_session = p_session
   where id = 1
  returning format('v%s.%s.%s', major, minor, patch) into v;
  return v;
end $$;

-- §3b + §3c in one call: ONE id (counter re-based on the board, environment fact 2026-09-15), then the
-- canonical INSERT with scope_origin john-named (the lane is John typing), then the register-B4 recompute.
create or replace function public.lean_file_ticket(p_session text, p_prefix text, p_priority_class text,
  p_title text, p_rationale text, p_description text default null, p_type text default 'Bug')
returns text language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_max integer; v_n integer; v_id text;
begin
  if p_priority_class !~ '^P([1-9]|10) - ' then
    raise exception 'lean_file_ticket: priority_class must be the full named form, e.g. P9 - Bug Fixes (register B9)';
  end if;
  if coalesce(btrim(p_rationale), '') = '' then
    raise exception 'lean_file_ticket: scope_rationale is required (M5-03) -- a ticket without one is never picked';
  end if;
  select coalesce(max(split_part(backlog_id, '-', 2)::integer), 0) into v_max
    from public.backlog_items where backlog_id ~ ('^' || p_prefix || '-[0-9]+$');
  insert into public.feature_id_counter (prefix, last_issued_number, updated_by_session)
  values (p_prefix, v_max + 1, p_session)
  on conflict (prefix) do update
    set last_issued_number = greatest(feature_id_counter.last_issued_number, v_max) + 1,
        updated_at = now(), updated_by_session = excluded.updated_by_session
  returning last_issued_number into v_n;
  v_id := p_prefix || '-' || v_n;
  insert into public.backlog_items (backlog_id, tier, type, priority_class, title, description, status,
    source_file, session_ref, row_ordinal, filed_at, scope_origin, size_stamp, predicted_cycles,
    defer_status, scope_rationale)
  select v_id, 'now', p_type, p_priority_class, p_title, coalesce(p_description, p_title), 'open',
         'session-' || p_session, p_session || ' ' || to_char(now(), 'YYYY-MM-DD'),
         coalesce(max(row_ordinal), 0) + 1, now(), 'john-named', 'S', 1, 'no', p_rationale
    from public.backlog_items;
  perform public.recompute_backlog_queue();
  return v_id;
end $$;

-- Grants: close to PUBLIC, anon and authenticated BY NAME (pg_default_acl grants them EXECUTE on every new
-- function; REVOKE FROM PUBLIC alone leaves that standing -- SES-315), then open to the new role only.
revoke all on function public.lean_claim_ticket(text, text, boolean) from public, anon, authenticated;
revoke all on function public.lean_release_claim(text, text) from public, anon, authenticated;
revoke all on function public.lean_claim_version(text) from public, anon, authenticated;
revoke all on function public.lean_file_ticket(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.lean_claim_ticket(text, text, boolean) to lean_lane, service_role;
grant execute on function public.lean_release_claim(text, text) to lean_lane, service_role;
grant execute on function public.lean_claim_version(text) to lean_lane, service_role;
grant execute on function public.lean_file_ticket(text, text, text, text, text, text, text) to lean_lane, service_role;
grant execute on function public.recompute_backlog_queue() to lean_lane;
grant select (id, meter_stale_hours, session_max_tickets, session_max_context_tokens,
              daily_max_tokens_millions, claim_stale_hours) on public.runner_settings to lean_lane;
grant select on public.runner_usage_readings to lean_lane;

-- Assert BOTH directions; never trust the success flag (.claude/rules/supabase-column-grants.md).
do $$
declare f text; bad text := '';
begin
  foreach f in array array['public.lean_claim_ticket(text,text,boolean)', 'public.lean_release_claim(text,text)',
                           'public.lean_claim_version(text)', 'public.lean_file_ticket(text,text,text,text,text,text,text)'] loop
    if has_function_privilege('anon', f, 'EXECUTE') or has_function_privilege('authenticated', f, 'EXECUTE') then
      bad := bad || ' open-to-public:' || f; end if;
    if not has_function_privilege('lean_lane', f, 'EXECUTE') then bad := bad || ' closed-to-lean_lane:' || f; end if;
    if not has_function_privilege('service_role', f, 'EXECUTE') then bad := bad || ' closed-to-service_role:' || f; end if;
  end loop;
  if has_table_privilege('lean_lane', 'public.backlog_items', 'SELECT')
     or has_table_privilege('lean_lane', 'public.runner_secrets', 'SELECT') then
    bad := bad || ' lean_lane-reads-a-table-it-must-not'; end if;
  if not has_table_privilege('lean_lane', 'public.runner_usage_readings', 'SELECT') then
    bad := bad || ' lean_lane-cannot-read-the-meter'; end if;
  if not has_column_privilege('lean_lane', 'public.runner_settings', 'meter_stale_hours', 'SELECT') then
    bad := bad || ' lean_lane-cannot-read-runner_settings'; end if;
  if not pg_has_role('authenticator', 'lean_lane', 'MEMBER') then bad := bad || ' authenticator-not-a-member'; end if;
  if (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'lean\_%') <> 4 then
    bad := bad || ' lean_*-function-count-not-4'; end if;
  if bad <> '' then raise exception 'agt464_lean_lane refused:%', bad; end if;
end $$;
