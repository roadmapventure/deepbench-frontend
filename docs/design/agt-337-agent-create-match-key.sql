-- DeepBench v7.0.767 | docs/design/agt-337-agent-create-match-key.sql | AGT-337 slice 4
-- Applied by the attended session, never by the build. The DOWN is the undo.
update public.platform_services
   set match_keys = '[{"feature":"agent-create"}]'::jsonb,
       tracking_status = 'partial',
       functions = '["agent setup CRUD","private agent create"]'::jsonb,
       updated_at = now()
 where slug = 'agent-config-store'
   and match_keys = '[]'::jsonb
   and tracking_status = 'untracked';
-- DOWN: update public.platform_services set match_keys = '[]'::jsonb, tracking_status = 'untracked',
--   functions = '["agent setup CRUD"]'::jsonb, updated_at = now() where slug = 'agent-config-store';
