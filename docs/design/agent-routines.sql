-- DeepBench v7.0.951 | docs/design/agent-routines.sql | every trigger has an owning agent
--
-- John 2026-11-03 ("yes"): a trigger is harness, not an agent's job -- "is she needed today" is arithmetic
-- the database answers the same way every time -- but every trigger carries an OWNING agent, so it is
-- accountable to a named agent and a broken rule reaches that agent instead of a nameless finding.
--
-- public.agent_routines -- one row per trigger of any kind (a claude.ai cloud routine or a pg_cron job).
--   The owner does not run it; the owner answers for it. john_switched_off_at records John's "off", which
--   always wins over the platform's standing approval to create/enable design-named routines
--   (INTAKE-LIFECYCLE-RCA-1103 D2). Seeded with the two triggers built 2026-11-03; any other routine is
--   registered the day its design names an owner.
-- public.invariant_owners -- one row per daily self-check rule: which agent a broken rule is filed
--   against. NULL owner = John's own call (money). platform_invariant_check() names the owner in every
--   finding it files.
--
-- Applied live as migration v7_0_951_agent_routines.
-- DOWN: drop table public.invariant_owners; drop table public.agent_routines;
--       then re-apply docs/design/platform-invariants.sql (v7.0.949) to restore the unowned filer.

create table if not exists public.agent_routines (
  name                text primary key,
  kind                text not null check (kind in ('cloud', 'pg_cron')),
  trigger_ref         text not null,
  owner_agent_id      text not null references public.agents(id),
  purpose             text not null,
  design_ref          text not null,
  created_at          timestamptz not null default now(),
  created_by          text not null,
  john_switched_off_at timestamptz
);
alter table public.agent_routines enable row level security;

create table if not exists public.invariant_owners (
  invariant       text primary key,
  owner_agent_id  text references public.agents(id),
  routine_name    text references public.agent_routines(name),
  note            text not null
);
alter table public.invariant_owners enable row level security;

insert into public.agent_routines (name, kind, trigger_ref, owner_agent_id, purpose, design_ref, created_by) values
 ('victoria-daily-check', 'cloud', 'trig_01M1rsFP6HHYxELMr8JdhDg5', 'victoria',
  'Daily 4:50 AM CST: when public.victoria_daily_check() says she is needed, Victoria grades the waiting lists and fills the active projects.',
  'docs/design/INTAKE-LIFECYCLE-RCA-1103.md D4; docs/runbooks/victoria-daily-check.md', 'routine-owners-1103 (John 2026-11-03)'),
 ('platform-invariants-daily', 'pg_cron', 'platform-invariants-daily', 'devmanager',
  'Daily 5:30 AM CST: tests the lifecycle rules and files a broken one as a finding against its owner.',
  'docs/design/INTAKE-LIFECYCLE-RCA-1103.md D6; docs/design/platform-invariants.sql', 'routine-owners-1103 (John 2026-11-03)')
on conflict (name) do nothing;

insert into public.invariant_owners (invariant, owner_agent_id, routine_name, note) values
 ('victoria_missed',   'victoria',   'victoria-daily-check',      'Her daily check said she was needed and she did not run.'),
 ('intake_stuck',      'victoria',   'victoria-daily-check',      'Waiting tickets are not being graded; grading them is her job.'),
 ('runner_stalled',    'devmanager', 'platform-invariants-daily', 'The build pipeline stopped for a non-pacing reason; running it is his job.'),
 ('budget_next_month', null,         'platform-invariants-daily', 'Money: John''s call, never repaired by an agent.')
on conflict (invariant) do nothing;

revoke all on public.agent_routines, public.invariant_owners from anon, authenticated;

-- The filer names the owner. Only the governing_fact text changes; everything else is v7.0.949's body.
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
  v_owner    text;
begin
  for r in select * from public.platform_invariant_eval() loop
    v_fid := null; v_action := 'ok'; v_open := null; v_prev_bad := null;
    if not r.ok then
      select coalesce(a.name || ' (' || a.id || ')', 'John (money)') into v_owner
        from public.invariant_owners o left join public.agents a on a.id = o.owner_agent_id
       where o.invariant = r.invariant;
      v_owner := coalesce(v_owner, 'unassigned -- add a row to public.invariant_owners');
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
                'DAILY SELF-CHECK FAILED: ' || r.invariant || '. OWNER: ' || v_owner || '. ' || r.detail::text,
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
