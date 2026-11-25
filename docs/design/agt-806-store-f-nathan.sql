-- DeepBench v7.0.1120 | docs/design/agt-806-store-f-nathan.sql | AGT-806 -- Nathan's store F grants and the STORE F VOCABULARY paragraph on his four writer intents.
-- Need source: john:runner_decisions:1fcf1d20-03ce-426b-855a-23f2d3fadece (walkthrough Q4/Q6, 2026-11-25).
-- Apply over the Supabase MCP in T4, after the code accepting market_terms on pmm slugs is ready.
-- Undo: delete from personal_source_grants where agent_id='nathan' and kind in ('career_offering','market_term'); restore method from the before-images.

insert into public.personal_source_grants (agent_id, kind)
values ('nathan', 'career_offering'), ('nathan', 'market_term')
on conflict do nothing;

with d as (
  insert into public.runner_decisions (kind, session_name, summary, reasoning, status, finalized_at, expires_at)
  values ('agent-row', 'design-store-f-1125',
    'AGT-806: four of Nathan''s intents gain the STORE F VOCABULARY paragraph',
    'Walkthrough Q4 (Nathan feeds the vocabulary map from DeepBench market and competitor work) and Q5 (agents add or bump entries alone; a change to the record is a proposal). Need source 1fcf1d20.',
    'final', now(), now())
  returning id),
targets as (
  select s.* from public.skill_profiles s
  where s.slug in ('nl-competitors-intent','nl-feature-signals-intent','nl-customer-profile-intent','nl-feature-benefits-intent')
    and position('STORE F VOCABULARY' in coalesce(s.method,'')) = 0),
b as (
  insert into public.runner_before_images (table_name, pk_value, row_data, decision_id, session_name)
  select 'skill_profiles', t.id::text, to_jsonb(t), d.id, 'design-store-f-1125' from targets t, d
  returning pk_value)
update public.skill_profiles s
set method = coalesce(s.method,'') || E'\n\nSTORE F VOCABULARY: when the market or competitor text you read names a role, task or capability that matches the principal''s work (store_f.offering) under words he has not used, add it to market_terms with what they mean, the work it matches, how he says it, how to use it, and strength (strong, or partial with the shortfall). A term already in store_f.terms is re-sent to count the sighting. Store F is private: never put its goals or target roles in a record, and never word anything as job-seeking.',
    updated_at = now(), updated_by_type = 'owner', updated_by_id = 'john'
where s.id::text in (select pk_value from b)
returning s.slug;
