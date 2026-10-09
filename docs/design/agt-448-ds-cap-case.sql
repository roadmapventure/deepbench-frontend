-- DeepBench v7.0.839 | docs/design/agt-448-ds-cap-case.sql | AGT-448 -- ds-guardrails cap-case stop.

select public.record_decision('5928fa21-6b30-4555-88b3-e4b79b22f742', NULL, 'agent-row', 'AGT-448', 'ds-guardrails gains the cap-case stop; card re-pinned', 'pattern:172 (John 2026-10-09); AGT-448 is john-named.');
-- -> 46f9853b-2e1e-43f4-86fe-5f6d33550dca

do $$
declare g jsonb;
begin
  select guardrails into g from public.skill_profiles where slug = 'ds-guardrails';
  if jsonb_array_length(g->'must') <> 7 or jsonb_array_length(g->'must_not') <> 6 then
    raise exception 'AGT-448: ds-guardrails must hold 7 must / 6 must_not; holds % / %', jsonb_array_length(g->'must'), jsonb_array_length(g->'must_not');
  end if;
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id) select '5928fa21-6b30-4555-88b3-e4b79b22f742', NULL, 'skill_profiles', sp.id::text, to_jsonb(sp), '46f9853b-2e1e-43f4-86fe-5f6d33550dca' from public.skill_profiles sp where sp.slug = 'ds-guardrails';
  update public.skill_profiles set guardrails = jsonb_set(jsonb_set(guardrails, '{must}', (guardrails->'must') || to_jsonb('when the file or task cap would force a split, stop and send the case for a ruling instead of a kickoff: premise alive, kickoff_markdown and kickoff_path null, harvest_markdown holding the parts in build order, what each delivers alone, what stays broken, red or unused if only the first ships, and which part must complete before the next; recommend neither split nor waive; design past the caps only when task_context carries cap_waived (pattern:172)'::text)), '{must_not}', (guardrails->'must_not') || to_jsonb('split, slice or narrow a ticket to fit the cap on your own authority (pattern:172)'::text)) where slug = 'ds-guardrails';
end $$;
