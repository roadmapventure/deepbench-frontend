-- DeepBench v7.0.838 | docs/design/agt-447-dm-cap-ruling.sql | AGT-447 -- the Development Manager's cap ruling duty and scope.

select public.record_decision('4febe38b-b38e-4774-9b07-3c1eaf40bf62', NULL, 'agent-row', 'AGT-447', 'dm-guardrails gains the cap-ruling duty and its scope; dm-knowledge-cycle-card re-pinned', 'pattern:172, John 2026-10-09: only the Development Manager splits or waives. AGT-447 is john-named.');
-- -> 4cffe9d8-951d-4511-b22f-0504b8ba63a6

do $$
declare g jsonb;
begin
  select guardrails into g from public.skill_profiles where slug = 'dm-guardrails';
  if jsonb_array_length(g->'must') <> 7 or jsonb_array_length(g->'must_not') <> 11 then
    raise exception 'AGT-447: dm-guardrails must hold 7 must / 11 must_not; holds % / %', jsonb_array_length(g->'must'), jsonb_array_length(g->'must_not');
  end if;
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id) select '4febe38b-b38e-4774-9b07-3c1eaf40bf62', NULL, 'skill_profiles', sp.id::text, to_jsonb(sp), '4cffe9d8-951d-4511-b22f-0504b8ba63a6' from public.skill_profiles sp where sp.slug = 'dm-guardrails';
  update public.skill_profiles set guardrails = jsonb_set(jsonb_set(guardrails, '{must}', (guardrails->'must') || to_jsonb('rule every cap case sent to you as split or waive, with one call to public.rule_capped_ticket() and its reason: split only if the first part leaves nothing broken and adds no new failing test or user-visible change, the parts are already filed, and the first part is a real step toward the asked result; a split the function refuses, or any other case, is a waive for that one build (pattern:172)'::text)), '{must_not}', (guardrails->'must_not') || to_jsonb('treat a cap case as licence for anything beyond that one ruling: it scores no ticket, orders no build, declares no other drain and files none of the parts'::text)) where slug = 'dm-guardrails';
end $$;
