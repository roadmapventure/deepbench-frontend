-- AGT-721 — migration agt721_writing_store. Designed attended 2026-11-17 (design-laura-1117, need source
-- john:runner_decisions:f229084b-37f4-4708-bbb0-7bba47d5ad49; design docs/design/LAURA-CAREER-WRITER-1117.md §2).
-- (1) Laura's private store public.writing_records. (2) public.personal_source_denies: a per-agent, per-item deny list on
-- the personal Library, because grants are by kind and the principal ruled (Q2) that the career writer never reads the
-- engagement or partner-proposal documents even where their kind is granted. Both tables: RLS on with no policies, zero
-- grants to anon and authenticated, asserted both ways; service_role reads and writes. Shape follows agt653 security_records.

CREATE TABLE public.writing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN
    ('draft','proposal','match_report','fact_candidate','practice','source','method','correction','grade')),
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}',
  source text,
  session_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());

CREATE INDEX writing_records_kind_created ON public.writing_records (kind, created_at DESC);

CREATE TABLE public.personal_source_denies (
  agent_id text NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.personal_sources(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, source_id));

ALTER TABLE public.writing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_source_denies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.writing_records FROM anon, authenticated;
REVOKE ALL ON public.personal_source_denies FROM anon, authenticated;

DO $$
DECLARE n int; t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['writing_records','personal_source_denies'] LOOP
    SELECT count(*) INTO n FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name=t AND grantee IN ('anon','authenticated');
    IF n <> 0 THEN RAISE EXCEPTION '% table grants to anon/authenticated: %', t, n; END IF;
    SELECT count(*) INTO n FROM information_schema.role_column_grants WHERE table_schema='public' AND table_name=t AND grantee IN ('anon','authenticated');
    IF n <> 0 THEN RAISE EXCEPTION '% column grants to anon/authenticated: %', t, n; END IF;
    IF NOT has_table_privilege('service_role', format('public.%I', t), 'SELECT') THEN RAISE EXCEPTION '% service_role cannot SELECT', t; END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = format('public.%I', t)::regclass) THEN RAISE EXCEPTION '% RLS off', t; END IF;
  END LOOP;
END $$;

-- Second migration, agt721_writing_rule_kind (same session): kind 'rule' added for the write guard's private blocked-term
-- list. One rule row was inserted over the MCP (blocked terms live in the row, never in this public file).
ALTER TABLE public.writing_records DROP CONSTRAINT writing_records_kind_check;
ALTER TABLE public.writing_records ADD CONSTRAINT writing_records_kind_check CHECK (kind IN
  ('draft','proposal','match_report','fact_candidate','practice','source','method','correction','grade','rule'));
