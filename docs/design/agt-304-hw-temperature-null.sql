-- AGT-304 slice 19 (v7.0.900) -- hw-* rows moved to claude-fable-5-1 kept the seed's 0.7; the family rejects temperature (AGT-90).
-- DOWN (manual): update public.skill_profiles set temperature = 0.7 where slug like 'hw-%' and llm_model like 'claude-fable-%';
do $$ declare n int; k int; begin
  select count(*) into k from public.skill_profiles where llm_model not like 'claude-fable-%' and temperature is not null;
  update public.skill_profiles set temperature = null where llm_model like 'claude-fable-%' and temperature is not null;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'AGT-304: nothing to clear'; end if;
  if k <> (select count(*) from public.skill_profiles where llm_model not like 'claude-fable-%' and temperature is not null) then raise exception 'AGT-304: a non-fable temperature moved'; end if;
  raise notice 'AGT-304 slice 19: % claude-fable- temperatures set NULL; % other rows untouched', n, k;
end $$;
