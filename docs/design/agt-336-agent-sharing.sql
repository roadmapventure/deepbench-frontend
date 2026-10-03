-- DeepBench v7.0.754 | docs/design/agt-336-agent-sharing.sql | AGT-336 slice 1
-- Mirror of migration agt336_agent_sharing, applied by the attended session through the Supabase
-- MCP apply_migration. Additive only. Owner and sharing level on agents and on
-- teams, agent-to-team membership, and a database-made address per team that the anon key cannot
-- read. Nothing is enforced: shared/agent-visibility.js answers "everyone" until a caller has a viewer.
-- agents.visibility (config / create / included) is a different fact and is not touched.

-- The 33 existing rows become 'public' through the first default; rows inserted later are 'private'.
alter table public.agents
  add column owner_id text,
  add column sharing text not null default 'public',
  add column shared_with text[] not null default '{}';
alter table public.agents alter column sharing set default 'private';
alter table public.agents add constraint ck_agents_sharing check (sharing in ('private','users','public'));

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  address text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  owner_id text,
  sharing text not null default 'private' check (sharing in ('private','users','public')),
  shared_with text[] not null default '{}',
  tenant_id text not null default 'global',
  created_at timestamptz not null default now(),
  constraint uq_teams_owner_name unique nulls not distinct (owner_id, name)
);

create table public.agent_teams (
  agent_id text not null references public.agents(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  tenant_id text not null default 'global',
  created_at timestamptz not null default now(),
  primary key (agent_id, team_id)
);
create index agent_teams_team_id_idx on public.agent_teams (team_id);

-- .claude/rules/supabase-column-grants.md: a column is hidden only by replacing the table grant
-- with a column list. Every anon reader of teams must name its columns; select=* is refused.
revoke select on public.teams from anon, authenticated;
grant select (id, name, owner_id, sharing, shared_with, tenant_id, created_at) on public.teams to anon, authenticated;
