-- AGT-808 — migration agt808_sales_store. Designed attended 2026-11-25 (design-bill-1125, need source
-- john:runner_decisions:b1c9ad03-8e41-49dd-a99a-06b613233120; design docs/design/BILL-GOV-SALES-1125.md §2).
-- Bill's private store public.sales_records: the source registry, solicitations, ratings, the principal's status marks
-- (append-only; the newest status row per solicitation wins), keywords, vocabulary suggestions, reminders, corrections and
-- grades. RLS on with no policies, zero grants to anon and authenticated, asserted both ways; service_role reads and writes.
-- Shape follows agt721 writing_records.
-- down: drop table public.sales_records;

CREATE TABLE public.sales_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN
    ('source','solicitation','rating','status','keyword','vocabulary','reminder','correction','grade')),
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}',
  source text,
  session_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());

CREATE INDEX sales_records_kind_created ON public.sales_records (kind, created_at DESC);
-- One solicitation per posting: dedupe key is data.key (agency + solicitation number, or the URL when there is no number).
CREATE UNIQUE INDEX sales_records_solicitation_key ON public.sales_records ((data->>'key')) WHERE kind = 'solicitation';
-- One registry row per URL.
CREATE UNIQUE INDEX sales_records_source_url ON public.sales_records ((data->>'url')) WHERE kind = 'source';

ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_records FROM anon, authenticated;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='sales_records' AND grantee IN ('anon','authenticated');
  IF n <> 0 THEN RAISE EXCEPTION 'sales_records table grants to anon/authenticated: %', n; END IF;
  SELECT count(*) INTO n FROM information_schema.role_column_grants WHERE table_schema='public' AND table_name='sales_records' AND grantee IN ('anon','authenticated');
  IF n <> 0 THEN RAISE EXCEPTION 'sales_records column grants to anon/authenticated: %', n; END IF;
  IF NOT has_table_privilege('service_role', 'public.sales_records', 'SELECT') THEN RAISE EXCEPTION 'service_role cannot SELECT'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.sales_records'::regclass) THEN RAISE EXCEPTION 'RLS off'; END IF;
END $$;
