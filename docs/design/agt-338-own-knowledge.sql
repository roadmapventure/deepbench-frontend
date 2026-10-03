-- DeepBench v7.0.771 | docs/design/agt-338-own-knowledge.sql | AGT-338 slice 2
-- Applied by the attended session BEFORE the build, never by the build. The DOWN is the undo.
begin;
insert into public.skill_profiles
  (slug, name, description, skill_type_slug, objective, method, output_desc, traits, execution_type, tenant_id, llm_model)
select 'agent-bundle-any-intent', 'Agent Knowledge Bundle (any agent)', description, skill_type_slug, objective, method, output_desc,
       traits || '{"any_agent": true}'::jsonb, execution_type, tenant_id, llm_model
  from public.skill_profiles
 where slug = 'agent-bundle-intent'
   and not exists (select 1 from public.skill_profiles where slug = 'agent-bundle-any-intent');
update public.capabilities
   set default_intent_slug = 'agent-bundle-any-intent'
 where slug = 'dan-db-assembly' and default_intent_slug = 'agent-bundle-intent';
update public.capability_skill_profiles
   set skill_profile_slug = 'agent-bundle-any-intent'
 where capability_slug = 'dan-db-assembly' and skill_profile_slug = 'agent-bundle-intent';
update public.skill_profiles
   set traits = jsonb_set(traits, '{input_schema}',
       '{"required": [], "properties": {"agent_id": {"type": "string", "description": "Optional. Leave it out, or pass this agent''s own id."}}, "description": "Returns this agent''s own knowledge, then reason as that agent yourself. No model runs on DeepBench."}'::jsonb)
 where slug = 'agent-bundle-intent' and traits->'input_schema'->'required' = '["agent_id"]'::jsonb;
commit;
-- DOWN (in this order):
-- update public.skill_profiles set traits = jsonb_set(traits, '{input_schema}',
--   (select traits->'input_schema' from public.skill_profiles where slug = 'agent-bundle-any-intent'))
--   where slug = 'agent-bundle-intent';
-- update public.capability_skill_profiles set skill_profile_slug = 'agent-bundle-intent'
--   where capability_slug = 'dan-db-assembly' and skill_profile_slug = 'agent-bundle-any-intent';
-- update public.capabilities set default_intent_slug = 'agent-bundle-intent' where slug = 'dan-db-assembly';
-- delete from public.skill_profiles where slug = 'agent-bundle-any-intent';
