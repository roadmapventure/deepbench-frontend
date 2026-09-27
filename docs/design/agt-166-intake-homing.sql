-- DeepBench v7.0.639 | docs/design/agt-166-intake-homing.sql | AGT-166 slice 1, Migration A
-- `agt166_intake_homing` -- apply via apply_migration AFTER capture_migration_down (kickoff §4).
-- Replace :C with the cycle id '667738d4-89e8-4765-b368-e71c6783ca41' (quoted, ::uuid).
-- Never writes backlog_items.updated_at (SES-316: a bumped stamp makes the row unreversible).

insert into public.projects (slug, name, status, priority, charter, updated_by)
values ('backlog-intake', 'Backlog Intake', 'planned', 10,
        'Rows filed with no epic, homed by ID prefix (AGT-166). planned = never picked; move an epic under an executing project to admit its rows.',
        'cycle-667738d4');

insert into public.epics (name, project_id, description)
select distinct 'Intake — ' || split_part(b.backlog_id, '-', 1), p.id, 'AGT-166 intake epic — legend docs/FEATURES.md#feature-id-format'
  from public.backlog_items b, public.projects p
 where p.slug = 'backlog-intake' and b.epic_id is null and b.status in ('open', 'partial');

do $$
declare d uuid;
begin
  d := public.record_decision(:C, null, 'hygiene', null,
        'AGT-166: 546 homeless open/partial rows homed to Backlog Intake by ID prefix',
        'One decision, 546 before-images; reverse_decision() restores every epic_id. Project is planned: nothing became pickable.',
        null);
  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data, decision_id)
  select :C, 'backlog_items', b.id::text, to_jsonb(b), d
    from public.backlog_items b
   where b.epic_id is null and b.status in ('open', 'partial');
  update public.backlog_items b
     set epic_id = e.id
    from public.epics e
   where b.epic_id is null and b.status in ('open', 'partial')
     and e.name = 'Intake — ' || split_part(b.backlog_id, '-', 1);
end $$;

-- The fence: auto-home, never refuse (SES-279 -- a fail-closed column parks the runner mid-drain).
-- Fails OPEN if the intake project is ever gone: the row lands homeless and the census shows it.
create or replace function public.backlog_home_intake() returns trigger language plpgsql as $$
declare p uuid; n text;
begin
  if new.epic_id is not null then return new; end if;
  select id into p from public.projects where slug = 'backlog-intake';
  if p is null then return new; end if;
  n := 'Intake — ' || split_part(new.backlog_id, '-', 1);
  insert into public.epics (name, project_id, description) values (n, p, 'AGT-166 intake epic')
  on conflict (name) do nothing;
  select id into new.epic_id from public.epics where name = n;
  return new;
end $$;

create trigger backlog_home_intake before insert on public.backlog_items
for each row execute function public.backlog_home_intake();
