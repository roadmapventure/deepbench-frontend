-- DeepBench v7.0.1029 | docs/design/agt-577-napkin-text-stamp.sql | AGT-577, migration UP
alter table public.napkin_ideas add column text_updated_at timestamptz;
update public.napkin_ideas set text_updated_at = updated_at
  where researched_at < updated_at
    and not (updated_at >= '2026-10-17 14:52:00+00' and updated_at < '2026-10-17 15:16:00+00');

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
  o boolean; n boolean; t boolean;
begin
  begin
    insert into public.napkin_ideas (id, text, researched_at) values (f, 'a', '2001-01-01+00');
    update public.napkin_ideas set tags = '{x}', updated_at = clock_timestamp() where id = f
      returning researched_at < updated_at, text_updated_at is null into o, n;
    update public.napkin_ideas set text = 'b' where id = f
      returning researched_at < text_updated_at into t;
    raise sqlstate 'AG577';
  exception when sqlstate 'AG577' then null;
  end;
  if (o, n, t) is distinct from (true, true, true) then
    raise exception 'AGT-577 gate: tag edit old-due/unstamped, text edit due = %/%/%, want t/t/t', o, n, t;
  end if;
  if exists (select 1 from public.napkin_ideas where id = f)
     or has_function_privilege('anon', p, 'EXECUTE') or has_function_privilege('authenticated', p, 'EXECUTE') then
    raise exception 'AGT-577 gate: fixture survived, or a public role holds the function';
  end if;
end
$gate$;
