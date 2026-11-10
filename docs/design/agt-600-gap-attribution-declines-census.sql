-- DeepBench v7.0.995 | docs/design/agt-600-gap-attribution-declines-census.sql | AGT-600, migration UP
create or replace function public.audit_findings_gap_to_designer()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
begin
  -- AGT-600: DECLINES a census gap (a count of board rows, AGT-169's subject). Never raises.
  -- The detail stays COALESCED: detail is NOT NULL (agt136_gap_attribution).
  insert into public.runner_staff_findings (cycle_id, agent_id, kind, backlog_id, detail, fingerprint)
  select new.cycle_id, 'designer', 'gap finding', c.item_id,
         coalesce(new.check_slug, 'gap') || ': '
           || coalesce(left(new.locations->0->>'text', 240), '(no location text)'),
         new.fingerprint
    from public.runner_cycles c
   where c.id = new.cycle_id
     and new.found_by is distinct from 'ticket-owner:census'
  on conflict (cycle_id, fingerprint) do nothing;
  return null;
end
$function$;

do $gate$
declare
  k constant uuid := '8fc747d2-ed13-4a55-9106-4594c94a1e2a';
  n int; d int; c int; b int;
begin
  begin
    insert into public.audit_findings (fingerprint, iso_week, kind, locations, governing_fact,
      confidence, proposed_resolution, found_by, cycle_id, check_slug, finding_type)
    values
      ('agt600-design', '2026-W46', 'other', '[{"location":"agt600","text":"a use case"}]',
       'agt600', 'high', 'none', 'auditor:run-review:agt600', k, 'agt600', 'gap'),
      ('agt600-census', '2026-W46', 'other', '[{"location":"agt600","text":"9 open rows"}]',
       'agt600', 'high', 'none', 'ticket-owner:census', k, 'owner:agt600', 'gap'),
      ('agt600-bare', '2026-W46', 'other', '[{"location":"agt600"}]',
       'agt600', 'high', 'none', 'runner:cycle:agt600', k, null, 'gap');
    select count(*) into n from public.audit_findings where fingerprint like 'agt600-%';
    select count(*) filter (where fingerprint = 'agt600-design'),
           count(*) filter (where fingerprint = 'agt600-census'),
           count(*) filter (where fingerprint = 'agt600-bare')
      into d, c, b
      from public.runner_staff_findings
     where cycle_id = k and agent_id = 'designer' and kind = 'gap finding';
    raise sqlstate 'AG600';
  exception when sqlstate 'AG600' then null;
  end;
  if (n, d, c, b) is distinct from (3, 1, 0, 1) then
    raise exception 'AGT-600 gate: inserted/design/census/bare = %/%/%/%, want 3/1/0/1', n, d, c, b;
  end if;
  if exists (select 1 from public.audit_findings where fingerprint like 'agt600-%')
     or exists (select 1 from public.runner_staff_findings where fingerprint like 'agt600-%') then
    raise exception 'AGT-600 gate: a fixture row survived';
  end if;
end
$gate$;
