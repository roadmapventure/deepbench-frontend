-- DeepBench v7.0.792 | docs/design/agt-390-teach-tool.sql | AGT-390
-- Mirror of migration agt390_teach_tool, applied by the attended session (design-mcp-teach-1005)
-- through the Supabase MCP apply_migration BEFORE the build, never by the build. The Builder
-- applies NO DDL. Additive only. Four parts:
--   1. origin tagging: knowledge_entries and agent_configs gain `origin` (deepbench | mcp) and
--      `origin_caller` (the MCP key name when present; null for DeepBench writes). The date a
--      thing was learned is the row's existing created_at. John 2026-10-05 (decision 6eafed1b):
--      "need to make sure we tag knowledge - we know where it came from".
--   2. the Intent Skill row agent-teach-intent: handler agent-teach, with the input contract the
--      AI client fills in (traits.input_schema) and the output shape (traits.schema).
--   3. one "Teach <name>" capability (slug <id>-teach) for each customer agent that already holds
--      a <id>-knowledge capability, assigned to that agent. lib/private-agent-create.js writes the
--      same two rows for every agent created from here on; these are the backfill.
--   4. grants: the two new columns readable by anon/authenticated exactly as their siblings are.
-- Rollback class: part 1 is an in-place ALTER of existing tables, which capture_migration_down()
-- refuses by design -- a red range containing this migration is card-only. The DOWN is below.

-- (no begin/commit: apply_migration runs the whole file in one transaction)

-- 1. Origin tagging. Existing rows were all written on DeepBench.
alter table public.knowledge_entries
  add column if not exists origin text,
  add column if not exists origin_caller text;
alter table public.knowledge_entries
  add constraint ck_knowledge_entries_origin check (origin is null or origin in ('deepbench', 'mcp'));
update public.knowledge_entries set origin = 'deepbench' where origin is null and source = 'user';

alter table public.agent_configs
  add column if not exists origin text,
  add column if not exists origin_caller text;
alter table public.agent_configs
  add constraint ck_agent_configs_origin check (origin is null or origin in ('deepbench', 'mcp'));
update public.agent_configs set origin = 'deepbench' where origin is null;

-- 2. The Intent Skill row, copied from agent-bundle-intent's shape (the AGT-338 pattern), with its
--    own handler name and its own two contracts. No agent is named anywhere in it (§19d Rule #1).
insert into public.skill_profiles
  (slug, name, description, skill_type_slug, objective, method, output_desc, traits, execution_type, tenant_id, llm_model)
select 'agent-teach-intent',
       'Teach This Agent',
       'Saves one teaching to the agent that holds this capability: a fact or instruction to remember, a role prompt, an output format, or a guardrail. Deterministic -- no model runs on DeepBench.',
       skill_type_slug,
       'Record what the connected user taught this agent, tagged with where it came from, so every later handover of the agent''s knowledge includes it.',
       'Platform-executed by api/_lib/handlers/agent-teach.js: the target is the capability''s holder (own-knowledge rule); kind taught writes a knowledge_entries row through lib/knowledge-write.js (source user); kind role_prompt, output_format or guardrail writes an agent_configs row (is_default false; a guardrail''s name is its side, always or never). Every row carries origin mcp and the caller''s key name. No inference on DeepBench''s side.',
       'The saved row: its kind, id, title, origin, origin_caller and created_at, plus where on DeepBench it can be switched off or deleted.',
       jsonb_build_object(
         'handler', 'agent-teach',
         'input_schema', jsonb_build_object(
           'description', 'Teach this agent something it should keep. Say what kind of thing it is, give it a short title, and the content in full. The teaching is saved to the agent on DeepBench and comes back on every later call of its Knowledge tool. No model runs on DeepBench.',
           'required', jsonb_build_array('kind', 'title', 'content'),
           'properties', jsonb_build_object(
             'kind', jsonb_build_object('type', 'string', 'enum', jsonb_build_array('taught', 'role_prompt', 'output_format', 'guardrail'),
               'description', 'taught = a fact or instruction to remember; role_prompt = who the agent is and how it behaves; output_format = how it lays out answers; guardrail = something it must always or never do.'),
             'side', jsonb_build_object('type', 'string', 'enum', jsonb_build_array('always', 'never'),
               'description', 'Guardrails only: always or never. Ignored for the other kinds.'),
             'title', jsonb_build_object('type', 'string', 'description', 'A short name for this teaching, as the user would recognise it.'),
             'content', jsonb_build_object('type', 'string', 'description', 'The teaching itself, in full.'),
             'teaching_note', jsonb_build_object('type', 'string', 'description', 'Optional. When or how the agent should use this; taught items only.')
           )
         ),
         'schema', jsonb_build_object(
           'type', 'object',
           'required', jsonb_build_array('saved', 'undo', 'no_inference'),
           'properties', jsonb_build_object(
             'saved', jsonb_build_object('type', 'object'),
             'undo', jsonb_build_object('type', 'string'),
             'no_inference', jsonb_build_object('type', 'boolean')
           )
         )
       ),
       execution_type, tenant_id, llm_model
  from public.skill_profiles
 where slug = 'agent-bundle-intent'
   and not exists (select 1 from public.skill_profiles where slug = 'agent-teach-intent');

-- 3. The backfill: one Teach capability per customer agent that holds a knowledge capability.
--    The name and description are BYTE-IDENTICAL to lib/private-agent-create.js teachCapabilityRow().
insert into public.capabilities (slug, name, description, execution_type, tenant_id, default_intent_slug)
select a.id || '-teach',
       'Teach ' || a.name,
       'Teaches ' || a.name || ' something new to keep: a fact or instruction (kind taught), a role prompt, an output format, or a guardrail (always or never). Call it when the user asks ' || a.name || ' to remember something or to change how ' || a.name || ' answers. The teaching is saved to ' || a.name || ' on DeepBench and comes back on every later call of ' || a.name || '''s Knowledge.',
       'deterministic', 'global', 'agent-teach-intent'
  from public.agents a
  join public.agent_capability_assignments k on k.agent_id = a.id and k.capability_slug = a.id || '-knowledge'
 where a.agent_origin = 'customer'
   and not exists (select 1 from public.capabilities c where c.slug = a.id || '-teach');

insert into public.agent_capability_assignments (agent_id, capability_slug, tenant_id)
select a.id, a.id || '-teach', 'global'
  from public.agents a
  join public.capabilities c on c.slug = a.id || '-teach'
 where a.agent_origin = 'customer'
   and not exists (select 1 from public.agent_capability_assignments x where x.agent_id = a.id and x.capability_slug = a.id || '-teach');

-- 4. Grants: the new columns read exactly as their siblings (.claude/rules/supabase-column-grants.md:
--    a column-list grant fails closed for a new column).
grant select (origin, origin_caller) on public.knowledge_entries to anon, authenticated;
grant select (origin, origin_caller) on public.agent_configs to anon, authenticated;

-- DOWN (in this order):
-- delete from public.agent_capability_assignments where capability_slug like '%-teach' and capability_slug in (select slug from public.capabilities where default_intent_slug = 'agent-teach-intent');
-- delete from public.capabilities where default_intent_slug = 'agent-teach-intent';
-- delete from public.skill_profiles where slug = 'agent-teach-intent';
-- alter table public.agent_configs drop constraint ck_agent_configs_origin, drop column origin, drop column origin_caller;
-- alter table public.knowledge_entries drop constraint ck_knowledge_entries_origin, drop column origin, drop column origin_caller;
