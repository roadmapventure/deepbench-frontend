-- DeepBench v7.0.722 | docs/design/agt-006-agents-table-seed.sql | AGT-006 — public.agents becomes
-- the authoritative roster store; the AGENTS array fills its blanks ONCE. Data only, no DDL, so no
-- capture_migration_down. ONE transaction, cycle b4a8f284-93cc-4f7b-a4d4-0e76890d6871.
--
-- Under rule AGENT-ROW-AGREED-TICKET (§19v P6/P7): this cycle's `design` decision names AGT-006, so
-- the agent-row writes are build work under ONE decision handle with a runner_before_images row per
-- changed row — no approval card. is_active, name, role, specialty and code are NEVER touched: the
-- table already holds those and D2 says where both hold a value the table stands (nadia's role stays
-- 'Data Analyst', which is what her prompt identity card reads).
--
-- The Designer's recorded reversible decisions (JOHN-0925-DESIGNER-DECIDES), not John's:
--   D1 public.agents is authoritative for every field it holds; agents.js keeps only what the table
--      lacks, until AGT-57 retires the other.
--   D2 where both hold a value, the table stands.
--   D3 the array fills blanks once, under one agent-row decision with a before-image per changed row.
--   D4 the hook renders AGENTS first and overlays the table on arrival.
--
-- The seed VALUES below were PRINTED from src/data/agents.js in AGENTS order, never typed.
-- The DO block's own counts are the gate: a wrong count raises AGT006 gate and rolls everything back.
--
-- APPLIED 2026-09-29 by the Builder of cycle b4a8f284-93cc-4f7b-a4d4-0e76890d6871. The Supabase MCP
-- was NOT available to that runner, so the statements below were applied over the service-key REST
-- path in this order — before-images first, then the UPDATE, then record_decision(), then
-- public.attach_before_images(d, <the 19 image ids>). That order is deliberate and is the only
-- reversible one without a single transaction: reverse_decision() refuses any row whose live state
-- postdates its decision's decided_at (SES-316), so the decision is recorded AFTER the writes, and
-- the images are adopted by attach_before_images() exactly as docs/runbooks/session-setup.md §3d
-- prescribes for images written before their handle existed. Gates 19/19/0 all asserted live.
BEGIN;
DO $$
DECLARE d uuid; n int;
BEGIN
  d := public.record_decision('b4a8f284-93cc-4f7b-a4d4-0e76890d6871', NULL, 'agent-row', 'AGT-006',
    'public.agents is the authoritative roster; agents.js fills its blanks once',
    'D1 public.agents is authoritative for every field it holds; agents.js keeps only what the table lacks until AGT-57. '
    'D2 where both hold a value the table stands. '
    'D3 the array fills blanks once, under one agent-row decision with a before-image per changed row; is_active untouched. '
    'D4 the hook renders AGENTS first, overlays the table on arrival. '
    'AGENT-ROW-AGREED-TICKET second arm: this cycle''s design decision names AGT-006, so this is build work with a before-image, not a card. '
    'pattern:2 pattern:8 pattern:11 pattern:17 pattern:93 pattern:97');

  CREATE TEMP TABLE seed AS
    SELECT id, skill_score, architecture, situational_awareness, salary, yearly_value, hourly_rate,
           report_hours, report_cost, revenue_model, trainer_org
    FROM public.agents WHERE false;
  INSERT INTO seed VALUES
    ('chloe', 18, 'LLM Prompt', 10, 60000, 60000, 31, 2, 63, 'Freemium · Included', 'RMV'),
    ('mike', 42, 'LLM Deep Prompt', 25, 90000, 90000, 47, 3, 141, 'Teaser · 10% NIGP split', 'RMV'),
    ('bob', 71, 'RAG', 25, 120000, 130000, 68, 5, 339, 'Offer · 20% consultant split', 'Gov''t'),
    ('christy', 36, 'LLM Format', 5, 90000, 90000, 47, 3, 141, 'Split · 50% RMV', 'RMV'),
    ('robyn', 88, 'RAG + Deep Prompt', 35, 175000, 200000, 104, 5, 521, 'Split · 50% NIGP · $260/rpt', 'NIGP'),
    ('brent', 79, 'RAG + Web Agent', 40, 115000, 140000, 60, 1, 60, 'Usage · Per Fetch', 'RMV'),
    ('pat', 12, 'No Training', 5, 0, 0, 0, 1, 0, 'Demo Only', 'None'),
    ('michelle', 65, 'LLM Planning', 30, 100000, 110000, 52, 2, 104, 'Included', 'RMV'),
    ('susan', 55, 'LLM Training', 20, 85000, 95000, 44, 2, 88, 'Included', 'RMV'),
    ('dan', 80, 'Prompt Engineering', 40, 105000, 125000, 55, 0, 0, 'Included', 'RMV'),
    ('alex', 72, 'LLM Format', 30, 90000, 95000, 47, 1, 47, 'Included', 'RMV'),
    ('riley', 68, 'LLM Format', 25, 85000, 90000, 44, 1, 44, 'Included', 'RMV'),
    ('claire', 75, 'LLM Format', 28, 95000, 100000, 50, 1, 50, 'Included', 'RMV'),
    ('victoria', 85, 'Catalog', 45, 120000, 140000, 62, 1, 62, 'Platform', 'RMV'),
    ('eleanor', 82, 'RAG Broker + Access Control', 50, 110000, 130000, 58, 0, 0, 'Platform', 'RMV'),
    ('marcus', 82, 'RAG + Deep Prompt', 38, 115000, 135000, 60, 2, 120, 'Included', 'RMV'),
    ('priya', 80, 'RAG + Deep Prompt', 42, 110000, 130000, 57, 2, 114, 'Included', 'RMV'),
    ('nadia', 78, 'RAG + Data Pipeline', 35, 105000, 120000, 55, 1, 55, 'Included', 'RMV'),
    ('owen', 75, 'Structured Output', 30, 95000, 105000, 50, 1, 50, 'Included', 'RMV'),
    ('sam', 70, 'LLM Routing', 28, 90000, 98000, 47, 1, 47, 'Included', 'RMV'),
    ('elena', 84, 'Structured Output', 40, 115000, 130000, 60, 1, 60, 'Included', 'RMV'),
    ('jordan', 74, 'Tool Use + Web Search', 40, 95000, 110000, 50, 1, 50, 'Per-report', 'RMV'),
    ('nathan', 0, 'Deep Prompt + Web Search', 0, 130000, 150000, 68, 2, 136, 'Platform', 'RMV'),
    ('brittany', 0, 'RAG', 0, 0, 0, 0, 0, 0, 'POC · none', 'Customer');

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  SELECT 'b4a8f284-93cc-4f7b-a4d4-0e76890d6871', NULL, 'agents', a.id, to_jsonb(a), d
  FROM public.agents a JOIN seed s ON s.id = a.id
  WHERE coalesce(a.skill_score, 0) = 0
     OR a.architecture IS NULL
     OR a.situational_awareness IS NULL
     OR a.salary IS NULL
     OR a.yearly_value IS NULL
     OR a.hourly_rate IS NULL
     OR a.report_hours IS NULL
     OR a.report_cost IS NULL
     OR a.revenue_model IS NULL
     OR a.trainer_org IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 19 THEN RAISE 'AGT006 gate: % before-images, expected 19', n; END IF;

  UPDATE public.agents a SET
    skill_score           = CASE WHEN coalesce(a.skill_score, 0) = 0 THEN s.skill_score ELSE a.skill_score END,
    architecture          = coalesce(a.architecture, s.architecture),
    situational_awareness = coalesce(a.situational_awareness, s.situational_awareness),
    salary                = coalesce(a.salary, s.salary),
    yearly_value          = coalesce(a.yearly_value, s.yearly_value),
    hourly_rate           = coalesce(a.hourly_rate, s.hourly_rate),
    report_hours          = coalesce(a.report_hours, s.report_hours),
    report_cost           = coalesce(a.report_cost, s.report_cost),
    revenue_model         = coalesce(a.revenue_model, s.revenue_model),
    trainer_org           = coalesce(a.trainer_org, s.trainer_org)
  FROM seed s WHERE s.id = a.id;

  SELECT count(*) INTO n FROM public.agents a JOIN seed s ON s.id = a.id
   WHERE a.architecture IS NULL OR a.situational_awareness IS NULL OR a.salary IS NULL
      OR a.yearly_value IS NULL OR a.hourly_rate IS NULL OR a.report_hours IS NULL
      OR a.report_cost IS NULL OR a.revenue_model IS NULL OR a.trainer_org IS NULL;
  IF n <> 0 THEN RAISE 'AGT006 gate: % seeded ids still blank, expected 0', n; END IF;

  SELECT count(*) INTO n FROM public.agents WHERE id = 'nadia' AND role = 'Data Analyst';
  IF n <> 1 THEN RAISE 'AGT006 gate: nadia.role is not Data Analyst'; END IF;

  SELECT count(*) INTO n FROM public.agents WHERE id = 'dan' AND skill_score = 80;
  IF n <> 1 THEN RAISE 'AGT006 gate: dan.skill_score is not 80'; END IF;
END $$;
COMMIT;
