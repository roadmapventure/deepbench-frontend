-- DeepBench v7.0.1124 | docs/design/agt-816-market-tables.sql | AGT-816 -- migration agt816_market_tables, applied over the
-- Supabase MCP 2026-11-26 by design-bill-1125. Need source john:runner_decisions:96ccb1d2-a698-401b-b59b-f144b8cae5da.
-- The market segment database: every state and local government unit (Census of Governments 2022), its links, our analysis
-- of them, its spend, our segment and our review history; plus the segment table for analysis. Private: RLS on, no grants
-- to anon or authenticated, asserted both ways. public.market_agencies is the ONE home of the agency list; the sales_records
-- kind 'agency' rows are retired once AGT-817 repoints Bill's crawl.
-- Amounts are in THOUSANDS of dollars, as the Census finance file reports them.
-- down: drop view public.market_segment_state_counts; drop table public.market_agency_reviews; drop table public.market_agencies; drop table public.market_segments;

CREATE TABLE public.market_segments (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  rules jsonb NOT NULL DEFAULT '{}',
  sort int NOT NULL,
  agency_count int,
  with_website int,
  with_bid_page int,
  with_public_data int,
  population_total bigint,
  spend_total_k bigint,
  spend_median_k bigint,
  computed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.market_agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  census_gid text NOT NULL UNIQUE,          -- Census of Governments 14-character government ID
  census_pid6 text,                         -- 6-digit unit id shared with the finance file
  census_fin_id text,                       -- 12-character finance-file ID (state, type, county, unit)
  state text NOT NULL,
  name text NOT NULL,
  unit_type text NOT NULL CHECK (unit_type IN ('county','municipality','township','school district','special district','state','general')),
  function_name text,                       -- special districts: what the district does
  county text,
  city text,
  population int,
  population_year int,
  enrollment int,
  enrollment_year int,
  spend_year int,
  spend_total_k bigint,                     -- total expenditure, $ thousands
  spend_operating_k bigint,                 -- current operations (E codes), $ thousands
  spend_source text,
  spend_rank_national int,                  -- 1 = largest spender among local governments with spend data
  spend_rank_state int,
  spend_rank_type int,
  segment_code text REFERENCES public.market_segments(code),
  segment_reason text,
  website_url text,
  website_status text NOT NULL DEFAULT 'not-yet' CHECK (website_status IN ('yes','no','not-yet')),
  website_source text,                      -- census, dotgov, crawl
  bid_page_url text,
  bid_page_status text NOT NULL DEFAULT 'not-yet' CHECK (bid_page_status IN ('yes','no','not-yet')),
  bid_platform text,                        -- own site, bonfire, opengov, demandstar, bidnet, ...
  link_analysis jsonb NOT NULL DEFAULT '{}',  -- what we found on the links: works, redirects, readable, last posting seen
  public_data jsonb NOT NULL DEFAULT '{}',    -- what the agency posts: open data, checkbook, budget, contracts, vendors, minutes
  public_data_status text NOT NULL DEFAULT 'not-yet' CHECK (public_data_status IN ('yes','no','not-yet')),
  keep_looking text,                        -- the principal's call on an agency with no site or no bid page
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());

CREATE INDEX market_agencies_segment ON public.market_agencies (segment_code, spend_total_k DESC NULLS LAST);
CREATE INDEX market_agencies_state ON public.market_agencies (state, unit_type);
CREATE INDEX market_agencies_pid6 ON public.market_agencies (census_pid6);
CREATE INDEX market_agencies_crawl ON public.market_agencies (bid_page_status, website_status, segment_code);

CREATE TABLE public.market_agency_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.market_agencies(id) ON DELETE CASCADE,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  reviewer text NOT NULL,                   -- agent:bill, session:<name>, principal
  review_kind text NOT NULL CHECK (review_kind IN ('import','website','bid_page','public_data','spend','segment','note')),
  result text,                              -- yes, no, changed, loaded, ...
  details jsonb NOT NULL DEFAULT '{}',
  session_name text);

CREATE INDEX market_agency_reviews_agency ON public.market_agency_reviews (agency_id, reviewed_at DESC);

CREATE VIEW public.market_segment_state_counts WITH (security_invoker = true) AS
SELECT segment_code, state, count(*) AS agencies,
       count(*) FILTER (WHERE website_status = 'yes') AS with_website,
       count(*) FILTER (WHERE bid_page_status = 'yes') AS with_bid_page,
       sum(population) AS population_total,
       sum(spend_total_k) AS spend_total_k
  FROM public.market_agencies GROUP BY segment_code, state;

ALTER TABLE public.market_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_agency_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.market_segments, public.market_agencies, public.market_agency_reviews, public.market_segment_state_counts FROM anon, authenticated;

INSERT INTO public.market_segments (code, name, description, rules, sort) VALUES
 ('A', 'Best fit', 'Counties, municipalities, townships and school districts spending $10M to $500M a year: they buy analytics and AI but rarely have their own data team.', '{"unit_types":["county","municipality","township","school district"],"spend_total_k":{"min":10000,"max":500000}}', 1),
 ('B', 'Possible', 'The same agency types spending $1M to $10M, or more than $500M (larger agencies often have their own IT).', '{"unit_types":["county","municipality","township","school district"],"spend_total_k":{"either":[{"min":1000,"max":10000},{"min":500000}]}}', 2),
 ('C', 'Unlikely', 'Agencies spending under $1M, and special districts (water, fire, cemetery, drainage, housing and the like).', '{"or":["spend_total_k < 1000","unit_type = special district"]}', 3),
 ('U', 'No spend data', 'Agencies the Census finance file does not cover; placed by population or enrollment once reviewed.', '{"spend_total_k":null}', 4);

DO $$
DECLARE n int; t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['market_segments','market_agencies','market_agency_reviews','market_segment_state_counts'] LOOP
    SELECT count(*) INTO n FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name=t AND grantee IN ('anon','authenticated');
    IF n <> 0 THEN RAISE EXCEPTION '% grants to anon/authenticated: %', t, n; END IF;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['market_segments','market_agencies','market_agency_reviews'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = format('public.%I', t)::regclass) THEN RAISE EXCEPTION '% RLS off', t; END IF;
  END LOOP;
END $$;
