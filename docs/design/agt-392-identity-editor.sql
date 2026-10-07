-- DeepBench v7.0.796 | docs/design/agt-392-identity-editor.sql | AGT-392
-- Mirror of migration agt392_identity_editor, applied by the attended session through the Supabase
-- MCP apply_migration BEFORE the build (cycle b55b4072), never by the build. Additive only.
-- The Identity editor on the Resume tab (Proposed arrangement) saves an agent's name, role,
-- specialty and bio; these three columns record where the last identity save came from
-- (deepbench | mcp), the MCP caller's key name when there is one, and when it happened.
-- The grant keeps the three readable by anon/authenticated exactly as their sibling columns are
-- (.claude/rules/supabase-column-grants.md: a new column is not readable until granted).
-- Rollback class: an in-place ALTER of an existing table, which capture_migration_down() refuses by
-- design -- a red range containing this migration is card-only.
--
-- DOWN:
--   alter table public.agents drop constraint if exists ck_agents_identity_origin;
--   alter table public.agents
--     drop column if exists identity_origin,
--     drop column if exists identity_origin_caller,
--     drop column if exists identity_updated_at;

-- (no begin/commit: apply_migration runs the whole file in one transaction)

alter table public.agents
  add column identity_origin text,
  add column identity_origin_caller text,
  add column identity_updated_at timestamptz;

alter table public.agents
  add constraint ck_agents_identity_origin check (identity_origin is null or identity_origin in ('deepbench', 'mcp'));

grant select (identity_origin, identity_origin_caller, identity_updated_at) on public.agents to anon, authenticated;
