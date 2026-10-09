-- DeepBench v7.0.840 | docs/design/agt-449-rule-cap-case.sql | AGT-449 -- devmanager gains rule-cap-case: a cap case reaches the Development Manager.
--
-- MIRROR AS RUN (mcp Supabase execute_sql, cycle 64b880e5, 2026-10-09). Licence: AGENT-ROW-AGREED-TICKET
-- -- AGT-449 is john-named, so a new Intent, capability, links and assignment for the active agent
-- devmanager are build work under one agent-row decision, every row imaged first. All four images
-- carry row_data NULL (new rows), so reverse_decision() on the decision deletes them. The card
-- re-pin (scripts/render-cycle-card.js --write ... --decision=<D>) adds one more image under the
-- same decision: the full prior dm-knowledge-cycle-card row.

select public.record_decision('64b880e5-8e05-4a81-a0b0-ecc55b14a735', NULL, 'agent-row', 'AGT-449', 'devmanager gains rule-cap-case', 'pattern:172; AGT-449 is john-named.');
-- -> 6ee431f9-a04b-4315-b71b-1ef7a09d7c96

-- 1. The Intent: every other column copied from dm-gate-intent; guardrails empty.
with ins as (
  insert into public.skill_profiles (slug, name, description, skill_type_slug, objective, method, output_desc, tone, confidence,
    traits, guardrails, notes, technical_services, execution_type, tenant_id, llm_provider, llm_model, max_tokens, api_key_source, temperature)
  select 'dm-cap-case-intent', 'Rule the Cap Case', g.description, g.skill_type_slug,
    'Rule one cap case split or waive.',
    $m$CAP CASE (pattern:172). task_context carries ticket and cap_case: the parts, in build order, the design step sent because the ticket will not fit its class caps in one build. Rule split or waive by your cap-ruling duty. split: parts = the already-filed parts' backlog_ids in build order, at least two, never the ticket. waive: parts = [] and the ticket is built whole once. reason: what the case showed and why, plainly.$m$,
    g.output_desc, g.tone, g.confidence,
    '{"can_request_help":false,"schema":{"type":"object","required":["ruling","parts","reason","patterns_applied"],"properties":{"ruling":{"enum":["split","waive"]},"parts":{"type":"array","items":{"type":"string"}},"reason":{"type":"string"},"patterns_applied":{"type":"array","items":{"type":"integer","minimum":1}}}}}'::jsonb,
    '{"must":[],"must_not":[]}'::jsonb,
    g.notes, g.technical_services, g.execution_type, g.tenant_id, g.llm_provider, g.llm_model, g.max_tokens, g.api_key_source, g.temperature
  from public.skill_profiles g where g.slug = 'dm-gate-intent'
  returning id)
insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
select '64b880e5-8e05-4a81-a0b0-ecc55b14a735', NULL, 'skill_profiles', id::text, NULL, '6ee431f9-a04b-4315-b71b-1ef7a09d7c96' from ins;

-- 2. The capability.
with ins as (
  insert into public.capabilities (slug, name, description, execution_type, tenant_id, display_phrase, default_intent_slug)
  values ('rule-cap-case', 'Rule Cap Case',
    'Rules one cap case split or waive through public.rule_capped_ticket(); writes nothing else.',
    'ai', 'global', 'ruling the cap case', 'dm-cap-case-intent')
  returning id)
insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
select '64b880e5-8e05-4a81-a0b0-ecc55b14a735', NULL, 'capabilities', id::text, NULL, '6ee431f9-a04b-4315-b71b-1ef7a09d7c96' from ins;

-- 3. The 8 links, copied from decide-gated-card (slug, level, is_required, display_order); dm-gate-intent -> dm-cap-case-intent.
with ins as (
  insert into public.capability_skill_profiles (capability_slug, skill_profile_slug, level, is_required, display_order)
  select 'rule-cap-case',
         case when l.skill_profile_slug = 'dm-gate-intent' then 'dm-cap-case-intent' else l.skill_profile_slug end,
         l.level, l.is_required, l.display_order
    from public.capability_skill_profiles l where l.capability_slug = 'decide-gated-card'
  returning id)
insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
select '64b880e5-8e05-4a81-a0b0-ecc55b14a735', NULL, 'capability_skill_profiles', id::text, NULL, '6ee431f9-a04b-4315-b71b-1ef7a09d7c96' from ins;

-- 4. The assignment: devmanager only.
with ins as (
  insert into public.agent_capability_assignments (tenant_id, agent_id, capability_slug)
  values ('global', 'devmanager', 'rule-cap-case')
  returning id)
insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
select '64b880e5-8e05-4a81-a0b0-ecc55b14a735', NULL, 'agent_capability_assignments', id::text, NULL, '6ee431f9-a04b-4315-b71b-1ef7a09d7c96' from ins;
