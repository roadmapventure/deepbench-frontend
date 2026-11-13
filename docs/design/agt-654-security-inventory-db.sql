-- AGT-654 — migration agt654_security_inventory_db. Designed attended 2026-11-12 (design-trenton-1112, need source
-- john:runner_decisions:59e15261-ae76-45e7-ab33-325cf7295974; design docs/design/TRENTON-SECURITY-ADVISOR-1112.md §2).
-- One read-only function the inventory collector (scripts/security-inventory.js) calls over REST, because PostgREST cannot
-- read the catalogs. FACTS ONLY: names, flags, privileges and counts; never a row of user data, never a secret value.
-- Executable by service_role alone, asserted.

CREATE OR REPLACE FUNCTION public.security_inventory_db()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
WITH user_schemas AS (
  SELECT n.oid, n.nspname FROM pg_namespace n
  WHERE n.nspname NOT LIKE 'pg\_%' AND n.nspname NOT IN
    ('information_schema','auth','storage','realtime','extensions','graphql','graphql_public','vault','net','cron','pgsodium','pgsodium_masks','supabase_functions','supabase_migrations','pgbouncer')
)
SELECT jsonb_build_object(
  'collected_at', now(),
  'tables', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'schema', s.nspname, 'name', c.relname, 'kind', c.relkind::text,
      'rls', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity,
      'policies', (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid),
      'policy_roles', (SELECT coalesce(jsonb_agg(DISTINCT r.rolname), '[]') FROM pg_policy p CROSS JOIN LATERAL unnest(p.polroles) pr(oid) LEFT JOIN pg_roles r ON r.oid = pr.oid WHERE p.polrelid = c.oid),
      'anon', (SELECT coalesce(jsonb_agg(pv ORDER BY pv), '[]') FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) pv WHERE has_table_privilege('anon', c.oid, pv)),
      'authenticated', (SELECT coalesce(jsonb_agg(pv ORDER BY pv), '[]') FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) pv WHERE has_table_privilege('authenticated', c.oid, pv)),
      'row_estimate', greatest(c.reltuples, 0)::bigint
    ) ORDER BY s.nspname, c.relname), '[]')
    FROM pg_class c JOIN user_schemas s ON s.oid = c.relnamespace
    WHERE c.relkind IN ('r','p','v','m')),
  'definer_functions_anon', (SELECT coalesce(jsonb_agg(s.nspname || '.' || p.proname ORDER BY 1), '[]')
    FROM pg_proc p JOIN user_schemas s ON s.oid = p.pronamespace
    WHERE p.prosecdef AND has_function_privilege('anon', p.oid, 'EXECUTE')),
  'buckets', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'public', b.public) ORDER BY b.id), '[]') FROM storage.buckets b),
  'extensions', (SELECT coalesce(jsonb_agg(e.extname ORDER BY e.extname), '[]') FROM pg_extension e),
  'auth_users', (SELECT count(*) FROM auth.users),
  'ai_use_30d', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'model', model, 'agent_id', agent_id, 'call_source', call_source, 'calls', n, 'first', f, 'last', l) ORDER BY n DESC), '[]')
    FROM (SELECT model, agent_id, call_source, count(*) n, min(created_at) f, max(created_at) l
          FROM public.ai_activity_log WHERE created_at > now() - interval '30 days'
          GROUP BY 1,2,3) a)
);
$fn$;

REVOKE ALL ON FUNCTION public.security_inventory_db() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_inventory_db() TO service_role;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.security_inventory_db()', 'EXECUTE') THEN RAISE EXCEPTION 'anon can execute'; END IF;
  IF has_function_privilege('authenticated', 'public.security_inventory_db()', 'EXECUTE') THEN RAISE EXCEPTION 'authenticated can execute'; END IF;
  IF NOT has_function_privilege('service_role', 'public.security_inventory_db()', 'EXECUTE') THEN RAISE EXCEPTION 'service_role cannot execute'; END IF;
END $$;
