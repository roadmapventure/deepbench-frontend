-- AGT-643 — migration agt643_library_strategy_store. Designed attended 2026-11-11 (design-harry-1111, v7.0.1005, need source
-- john:runner_decisions:ae55e64c-35f2-4e93-b0c1-a72bad552320; design docs/design/HARRY-STRATEGY-CONSULTANT-1111.md §2-§3).
-- The principal's Library is the existing personal store WIDENED, never a second store: personal_sources becomes the catalog,
-- two new tables hold the per-heading sections and the original file bytes (the paid plan's daily backups cover the database
-- but not file storage), and strategy_records is the consultant's own private store. Every table: zero grants to anon and
-- authenticated, asserted both ways; service_role reads and writes. Shape follows agt542_humor_records_personal_sources.

ALTER TABLE public.personal_sources
  ADD COLUMN section text CHECK (section IS NULL OR section IN
    ('identity','approach','ideas','facts','evidence','value','works','goals','market','taste','log')),
  ADD COLUMN purpose text,
  ADD COLUMN trust text CHECK (trust IS NULL OR trust IN
    ('john_confirmed','john_authored','measured','extracted','public_page','outside','vision')),
  ADD COLUMN sensitivity text NOT NULL DEFAULT 'personal_private'
    CHECK (sensitivity IN ('reusable','client_private','personal_private')),
  ADD COLUMN audience text,
  ADD COLUMN doc_date date,
  ADD COLUMN version int NOT NULL DEFAULT 1,
  ADD COLUMN status text NOT NULL DEFAULT 'current' CHECK (status IN ('current','superseded')),
  ADD COLUMN superseded_by uuid REFERENCES public.personal_sources(id),
  ADD COLUMN sha256 text,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX personal_sources_section_status ON public.personal_sources (section, status);

CREATE TABLE public.personal_source_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.personal_sources(id) ON DELETE CASCADE,
  ord int NOT NULL,
  heading text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, ord));

CREATE TABLE public.personal_source_files (
  source_id uuid PRIMARY KEY REFERENCES public.personal_sources(id) ON DELETE CASCADE,
  filename text NOT NULL,
  mime text,
  bytes bytea NOT NULL,
  size_bytes int NOT NULL,
  sha256 text NOT NULL,
  stored_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.strategy_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN
    ('brief','review','readiness','offer','roadmap','acquirer','call','gap','research','correction','grade')),
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}',
  source text,
  session_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());

REVOKE ALL ON public.personal_source_sections, public.personal_source_files, public.strategy_records,
              public.personal_sources, public.personal_source_grants FROM anon, authenticated;

DO $$
DECLARE t text; n int;
BEGIN
  FOREACH t IN ARRAY ARRAY['personal_sources','personal_source_grants','personal_source_sections','personal_source_files','strategy_records'] LOOP
    SELECT count(*) INTO n FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name=t AND grantee IN ('anon','authenticated');
    IF n <> 0 THEN RAISE EXCEPTION '% table grants to anon/authenticated: %', t, n; END IF;
    SELECT count(*) INTO n FROM information_schema.role_column_grants WHERE table_schema='public' AND table_name=t AND grantee IN ('anon','authenticated');
    IF n <> 0 THEN RAISE EXCEPTION '% column grants to anon/authenticated: %', t, n; END IF;
    IF NOT has_table_privilege('service_role', 'public.' || t, 'SELECT') THEN RAISE EXCEPTION '% service_role cannot SELECT', t; END IF;
  END LOOP;
END $$;
