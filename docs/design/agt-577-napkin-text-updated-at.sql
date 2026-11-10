-- DeepBench v7.0.998 | docs/design/agt-577-napkin-text-updated-at.sql | AGT-577, migration UP
alter table public.napkin_ideas add column text_updated_at timestamptz;
update public.napkin_ideas set text_updated_at = case
  when updated_at >= '2026-10-17 14:52:00+00' and updated_at < '2026-10-17 15:16:00+00'
  then created_at else updated_at end;
alter table public.napkin_ideas alter column text_updated_at set default now(),
  alter column text_updated_at set not null;

create function public.napkin_ideas_text_stamp() returns trigger
 language plpgsql set search_path to 'public', 'pg_catalog' as $function$
begin
  if new.text is distinct from old.text then new.text_updated_at := clock_timestamp(); end if;
  return new;
end
$function$;
revoke all on function public.napkin_ideas_text_stamp() from public, anon, authenticated;
create trigger napkin_ideas_text_stamp before update on public.napkin_ideas
  for each row execute function public.napkin_ideas_text_stamp();

do $gate$
declare
  f constant text := 'agt577-fixture'; p constant text := 'public.napkin_ideas_text_stamp()';
  o boolean; n boolean; t boolean; nul int; bad int;
begin
  begin
    insert into public.napkin_ideas (id, text, researched_at, text_updated_at)
    values (f, 'a', '2001-01-01+00', '2000-01-01+00');
    update public.napkin_ideas set tags = '{x}', category = 'x', archived = true,
      updated_at = clock_timestamp() where id = f
      returning researched_at < updated_at, researched_at < text_updated_at into o, n;
    update public.napkin_ideas set text = 'b' where id = f
      returning researched_at < text_updated_at into t;
    raise sqlstate 'AG577';
  exception when sqlstate 'AG577' then null;
  end;
  select count(*) filter (where text_updated_at is null),
         count(*) filter (where researched_at < text_updated_at and not researched_at < updated_at)
    into nul, bad from public.napkin_ideas;
  if (o, n, t, nul, bad) is distinct from (true, false, true, 0, 0) then
    raise exception 'AGT-577 gate: tag old/new, text new, null, newly due = %/%/%/%/%, want t/f/t/0/0', o, n, t, nul, bad;
  end if;
  if exists (select 1 from public.napkin_ideas where id = f)
     or has_function_privilege('anon', p, 'EXECUTE') or has_function_privilege('authenticated', p, 'EXECUTE') then
    raise exception 'AGT-577 gate: fixture survived, or a public role holds the function';
  end if;
end
$gate$;
