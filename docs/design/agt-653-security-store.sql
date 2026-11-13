-- AGT-653 — migration agt653_security_store. Designed attended 2026-11-12 (design-trenton-1112, v7.0.1013, need source
-- john:runner_decisions:59e15261-ae76-45e7-ab33-325cf7295974; design docs/design/TRENTON-SECURITY-ADVISOR-1112.md §2).
-- Trenton's private store. RLS on with no policies, zero grants to anon and authenticated, asserted both ways; service_role
-- reads and writes. Shape follows agt643 strategy_records.

CREATE TABLE public.security_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN
    ('inventory','classification','gap','scorecard','decision','digest','source','document','alert','call','correction','grade')),
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}',
  source text,
  session_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());

CREATE INDEX security_records_kind_created ON public.security_records (kind, created_at DESC);

ALTER TABLE public.security_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.security_records FROM anon, authenticated;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='security_records' AND grantee IN ('anon','authenticated');
  IF n <> 0 THEN RAISE EXCEPTION 'security_records table grants to anon/authenticated: %', n; END IF;
  SELECT count(*) INTO n FROM information_schema.role_column_grants WHERE table_schema='public' AND table_name='security_records' AND grantee IN ('anon','authenticated');
  IF n <> 0 THEN RAISE EXCEPTION 'security_records column grants to anon/authenticated: %', n; END IF;
  IF NOT has_table_privilege('service_role', 'public.security_records', 'SELECT') THEN RAISE EXCEPTION 'service_role cannot SELECT'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.security_records'::regclass) THEN RAISE EXCEPTION 'RLS off'; END IF;
END $$;
