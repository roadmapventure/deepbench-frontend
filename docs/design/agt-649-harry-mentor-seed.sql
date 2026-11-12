-- AGT-649: Harry's mentor memory store. Designed attended 2026-11-12 (design-harry-mentor-1112, v7.0.1009, need source
-- john:runner_decisions:8ead2741-7a88-4322-bd85-ed0a6a931cd0; design docs/design/HARRY-STRATEGY-CONSULTANT-1111.md section 8).
-- Two parts:
--   1. The MIGRATION block (agt649_harry_mentor_store), applied with apply_migration. It is kept here as the repo's record and
--      is written to be idempotent, so re-running it changes nothing.
--   2. The SEED (BEGIN ... COMMIT), applied VERBATIM over the Supabase MCP in ONE transaction, as AGT-643 did.
-- Rule #1 holds: no row names another agent. METHOD ONLY: skill_profiles is readable with the public browser key, so no row
-- below carries a personal fact, a client, customer, prospect or product name, or a price. The source rows are public URLs.
-- Shapes copy docs/design/agt-643-harry-seed.sql.

-- === MIGRATION agt649_harry_mentor_store: BEGIN ============================================================================
ALTER TABLE public.strategy_records DROP CONSTRAINT IF EXISTS strategy_records_kind_check;
ALTER TABLE public.strategy_records ADD CONSTRAINT strategy_records_kind_check CHECK (kind IN
  ('brief','review','readiness','offer','roadmap','acquirer','call','gap','research','correction','grade',
   'decision','commitment','study','source','method','case','kpi','target','fact'));

-- Full-text: one STORED generated tsvector and one GIN index per searched table.
ALTER TABLE public.personal_sources ADD COLUMN IF NOT EXISTS tsv tsvector GENERATED ALWAYS AS
  (to_tsvector('english'::regconfig, coalesce(title,'') || ' ' || coalesce(purpose,'') || ' ' || coalesce(body,''))) STORED;
ALTER TABLE public.personal_source_sections ADD COLUMN IF NOT EXISTS tsv tsvector GENERATED ALWAYS AS
  (to_tsvector('english'::regconfig, coalesce(heading,'') || ' ' || coalesce(body,''))) STORED;
ALTER TABLE public.strategy_records ADD COLUMN IF NOT EXISTS tsv tsvector GENERATED ALWAYS AS
  (to_tsvector('english'::regconfig, coalesce(title,'') || ' ' || coalesce(body,'') || ' ' || coalesce(data::text,''))) STORED;
CREATE INDEX IF NOT EXISTS personal_sources_tsv ON public.personal_sources USING gin (tsv);
CREATE INDEX IF NOT EXISTS personal_source_sections_tsv ON public.personal_source_sections USING gin (tsv);
CREATE INDEX IF NOT EXISTS strategy_records_tsv ON public.strategy_records USING gin (tsv);

-- Vectors: nullable, filled later by the platform's one embedding service. No index at this size.
ALTER TABLE public.personal_source_sections ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE public.strategy_records ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- library_search: current catalog items and their sections ranked by ts_rank_cd; with an embedding, fused with the cosine
-- rank by reciprocal-rank fusion (k = 60). A catalog-level hit returns section_id NULL.
CREATE OR REPLACE FUNCTION public.library_search(p_query text, p_limit int DEFAULT 20, p_embedding vector(1536) DEFAULT NULL)
RETURNS TABLE (source_id uuid, section_id uuid, score real)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $f$
  WITH q AS (SELECT websearch_to_tsquery('english'::regconfig, coalesce(p_query, '')) AS tsq),
  fts_hits AS (
    SELECT s.id AS source_id, NULL::uuid AS section_id, ts_rank_cd(s.tsv, q.tsq) AS r
      FROM public.personal_sources s, q
     WHERE s.status = 'current' AND s.tsv @@ q.tsq
    UNION ALL
    SELECT x.source_id, x.id, ts_rank_cd(x.tsv, q.tsq)
      FROM public.personal_source_sections x JOIN public.personal_sources s ON s.id = x.source_id, q
     WHERE s.status = 'current' AND x.tsv @@ q.tsq),
  fts AS (SELECT h.source_id, h.section_id, h.r, row_number() OVER (ORDER BY h.r DESC) AS rk FROM fts_hits h),
  vec AS (
    SELECT x.source_id, x.id AS section_id, row_number() OVER (ORDER BY x.embedding <=> p_embedding) AS rk
      FROM public.personal_source_sections x JOIN public.personal_sources s ON s.id = x.source_id
     WHERE p_embedding IS NOT NULL AND x.embedding IS NOT NULL AND s.status = 'current'
     ORDER BY x.embedding <=> p_embedding
     LIMIT greatest(coalesce(p_limit, 20), 1) * 5),
  fused AS (
    SELECT coalesce(f.source_id, v.source_id) AS source_id,
           coalesce(f.section_id, v.section_id) AS section_id,
           CASE WHEN p_embedding IS NULL THEN f.r
                ELSE coalesce(1.0 / (60 + f.rk), 0) + coalesce(1.0 / (60 + v.rk), 0) END AS score
      FROM fts f FULL JOIN vec v ON f.source_id = v.source_id AND f.section_id = v.section_id)
  SELECT fused.source_id, fused.section_id, fused.score::real
    FROM fused
   ORDER BY fused.score DESC
   LIMIT greatest(coalesce(p_limit, 20), 1);
$f$;

-- strategy_memory_search: the same ranking over strategy_records, filtered to p_kinds.
CREATE OR REPLACE FUNCTION public.strategy_memory_search(p_query text, p_kinds text[], p_limit int DEFAULT 20, p_embedding vector(1536) DEFAULT NULL)
RETURNS TABLE (id uuid, score real)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $f$
  WITH q AS (SELECT websearch_to_tsquery('english'::regconfig, coalesce(p_query, '')) AS tsq),
  fts AS (
    SELECT r.id, ts_rank_cd(r.tsv, q.tsq) AS r, row_number() OVER (ORDER BY ts_rank_cd(r.tsv, q.tsq) DESC) AS rk
      FROM public.strategy_records r, q
     WHERE r.kind = ANY (p_kinds) AND r.tsv @@ q.tsq),
  vec AS (
    SELECT r.id, row_number() OVER (ORDER BY r.embedding <=> p_embedding) AS rk
      FROM public.strategy_records r
     WHERE p_embedding IS NOT NULL AND r.embedding IS NOT NULL AND r.kind = ANY (p_kinds)
     ORDER BY r.embedding <=> p_embedding
     LIMIT greatest(coalesce(p_limit, 20), 1) * 5),
  fused AS (
    SELECT coalesce(f.id, v.id) AS id,
           CASE WHEN p_embedding IS NULL THEN f.r
                ELSE coalesce(1.0 / (60 + f.rk), 0) + coalesce(1.0 / (60 + v.rk), 0) END AS score
      FROM fts f FULL JOIN vec v ON f.id = v.id)
  SELECT fused.id, fused.score::real
    FROM fused
   ORDER BY fused.score DESC
   LIMIT greatest(coalesce(p_limit, 20), 1);
$f$;

-- Functions default OPEN in this project (.claude/rules/supabase-column-grants.md, SES-315): revoke the three by name.
REVOKE ALL ON FUNCTION public.library_search(text, int, vector) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.strategy_memory_search(text, text[], int, vector) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.library_search(text, int, vector) TO service_role;
GRANT EXECUTE ON FUNCTION public.strategy_memory_search(text, text[], int, vector) TO service_role;

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
  FOREACH t IN ARRAY ARRAY['public.library_search(text, integer, vector)','public.strategy_memory_search(text, text[], integer, vector)'] LOOP
    IF has_function_privilege('anon', t, 'EXECUTE') THEN RAISE EXCEPTION '% is executable by anon', t; END IF;
    IF has_function_privilege('authenticated', t, 'EXECUTE') THEN RAISE EXCEPTION '% is executable by authenticated', t; END IF;
    IF NOT has_function_privilege('service_role', t, 'EXECUTE') THEN RAISE EXCEPTION '% is not executable by service_role', t; END IF;
  END LOOP;
  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace WHERE s.nspname='public' AND p.proname IN ('library_search','strategy_memory_search');
  IF n <> 2 THEN RAISE EXCEPTION 'search function overloads: % (expected exactly 2)', n; END IF;
END $$;
-- === MIGRATION agt649_harry_mentor_store: END ==============================================================================

BEGIN;

-- Two new Capabilities ----------------------------------------------------------------------------------------------------------
INSERT INTO public.capabilities (slug, name, description, execution_type, tenant_id, display_phrase, default_intent_slug) VALUES
 ('strategy-weekly-study', 'Weekly Study',
  'Saturday: reads three to five pieces from the source registry across the standing topics, writes study notes in his own words with link and date, files founder cases and newly discovered sources, and scores and retires sources.',
  'ai', 'global', 'running the weekly study', 'sc-study-intent'),
 ('strategy-mentor-review', 'Monthly Mentor Review',
  'Monthly: scores the predictions that came due and the hit rate, proposes method changes for the principal to tick, cleans up the source registry, and reports the measures that prove the advice is getting better.',
  'ai', 'global', 'running the monthly mentor review', 'sc-mentor-review-intent');

INSERT INTO public.agent_capability_assignments (agent_id, capability_slug, tenant_id) VALUES
 ('harry', 'strategy-weekly-study', 'global'),
 ('harry', 'strategy-mentor-review', 'global');

-- Two new shared Skills ---------------------------------------------------------------------------------------------------------
-- sc-mentor is a BEHAVIOR Skill: it governs how he engages on every capability (challenge, follow-up, predictions), and a
-- behavior Skill renders its own objective and method (AGT-636). sc-study-method is a KNOWLEDGE Skill held inline, like
-- sc-knowledge-method: it is working method for reading sources, not a rule about conduct.
INSERT INTO public.skill_profiles (slug, name, skill_type_slug, objective, method, output_desc, description, traits, guardrails, technical_services, execution_type, llm_provider, llm_model, max_tokens, temperature, api_key_source) VALUES
 ('sc-mentor', 'Harry Mentor Method', 'behavior',
  $q$Act as a seasoned operator at the principal's side: make him better at the business, not more comfortable.$q$,
  $q$CHALLENGE FIRST: before you agree with the principal or with your own first answer, argue the strongest case against it; agree only if it survives, and say what nearly changed your mind.
COMMITMENTS: when the principal says he will do something, log it as a commitment with its due date; raise it when it comes due; mark it done only with evidence, never on assumption.
DECISIONS: log each decision the principal states, with the date and his reason, so later advice builds on it instead of reopening it.
PREDICTIONS: every forecast you make is a dated call with how it will be scored; score it when it comes due, keep the hit rate, and let a falling hit rate change your method.
NEVER FLATTER: praise only what a record supports; name a weak plan as weak and say why; an honest low grade is worth more than a kind high one.
FACTS VERSUS INFERENCE: keep the principal's own facts apart from your inference; a fact you heard but he has not ticked is a waiting fact, never cited as his; label every inference as yours.$q$,
  NULL, 'Challenge pass, commitment follow-up, logged decisions, scored predictions, no flattery, facts kept apart from inference.',
  '{}'::jsonb, '{"must":[],"must_not":[]}'::jsonb, '[]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 12000, 0.4, 'platform'),

 ('sc-study-method', 'Harry Study Method', 'knowledge',
  $q$Read outside sources the way a careful analyst does, and keep only what will improve future advice.$q$,
  $q$READING: start from the registry; prefer sources with the higher score; read the piece itself, not a summary of it; ask what it changes about the principal's choices before you write a word.
NOTES: write each note in your own words, never copied text, at most 1,500 characters; state the claim, the evidence behind it, and what it means for the principal; cite the URL and the date you read it.
LICENCES: a source whose licence or terms forbid storing its text is linked, not noted; record only its link, its topic and why it matters.
CASES: a founder or company story worth reusing becomes a case: the situation, the choice made, the result, and the lesson.
DISCOVERY: a source cited by a good piece is a candidate; add it to the registry with its topics and type, at score zero.
SCORING AND RETIRING: a source earns a point each time one of its notes is used in an answer the principal grades 8 or more; a source unused for 90 days is retired, kept on record and never deleted; age old notes and merge duplicates.$q$,
  NULL, 'How to read a source, write notes in his own words, respect licences, file cases, and score and retire sources.',
  '{"source":"inline"}'::jsonb, '{"must":[],"must_not":[]}'::jsonb, '[]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 12000, 0.4, 'platform');

-- Two new Intents ---------------------------------------------------------------------------------------------------------------
INSERT INTO public.skill_profiles (slug, name, skill_type_slug, objective, method, output_desc, description, traits, guardrails, technical_services, execution_type, llm_provider, llm_model, max_tokens, temperature, api_key_source) VALUES
 ('sc-study-intent', 'Run the Weekly Study', 'intent',
  $q$Read three to five pieces across the standing topics and keep what will make next week's advice better.$q$,
  $q$Your task_context carries the source registry with each source's topics, score, uses and status, the notes and cases already held for the topics, and the corrections. Steps: (1) read the corrections; (2) pick three to five pieces, at least one from a topic not studied last week, preferring higher-scored sources; (3) for each piece write one study record: claim, evidence, what it means for the principal, URL and date, in your own words and at most 1,500 characters; (4) file any founder or company story worth reusing as a case record; (5) add each newly discovered source as a source record at score zero; (6) update the score and uses of each source you used, and retire any source unused for 90 days by writing its source record with status retired; (7) return summary and records_to_write. You may write only the kinds study, case and source.$q$,
  NULL, NULL,
  $j${"schema":{"type":"object","required":["summary","records_to_write"],"properties":{"summary":{"type":"string"},"records_to_write":{"type":"array","items":{"type":"object","required":["kind","title"],"properties":{"kind":{"type":"string","enum":["study","case","source"]},"title":{"type":"string"},"body":{"type":"string"},"data":{"type":"object"},"source":{"type":"string"}}}}}},"can_request_help":false}$j$::jsonb,
  '{"must":[],"must_not":[]}'::jsonb, '["structured-output"]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 16000, 0.4, 'platform'),

 ('sc-mentor-review-intent', 'Run the Monthly Mentor Review', 'intent',
  $q$Score the month's predictions, propose method changes, clean up the source registry, and report the measures that show whether the advice is getting better.$q$,
  $q$Your task_context carries the call records that came due, the month's grades, the method records, the source registry, the study notes of the month, the proof measures from earlier months, and the corrections. Steps: (1) read the corrections; (2) score each call that came due as hit, miss or unclear, with the evidence, and compute the month's hit rate; (3) report the proof measures: the hit rate, the share of recommendations that rested on something not already in the Library, and the trend of the principal's grades; (4) propose at most three method changes as method records with status proposed, each with its reason; two losing months in a row or a falling month oblige at least one; (5) clean up the registry: merge duplicate sources and retire those unused for 90 days; (6) return summary and records_to_write: one review record carrying the measures, plus the call, method and source records. You may write only the kinds review, call, method and source.$q$,
  NULL, NULL,
  $j${"schema":{"type":"object","required":["summary","hit_rate","records_to_write"],"properties":{"summary":{"type":"string"},"hit_rate":{"type":"number"},"records_to_write":{"type":"array","items":{"type":"object","required":["kind","title"],"properties":{"kind":{"type":"string","enum":["review","call","method","source"]},"title":{"type":"string"},"body":{"type":"string"},"data":{"type":"object"},"source":{"type":"string"}}}}}},"can_request_help":false}$j$::jsonb,
  '{"must":[],"must_not":[]}'::jsonb, '["structured-output"]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 16000, 0.4, 'platform');

-- Links: the five shared Skills plus sc-mentor and sc-study-method to BOTH new Capabilities, each Intent to its own, and
-- sc-mentor to the five existing strategy Capabilities -----------------------------------------------------------------------------
INSERT INTO public.capability_skill_profiles (capability_slug, skill_profile_slug, level, is_required, display_order)
SELECT c.slug, s.slug, 2, true, s.ord
FROM public.capabilities c
CROSS JOIN (VALUES ('sc-identity', 1), ('sc-knowledge-method', 2), ('sc-knowledge-market', 3), ('sc-behavior', 4),
                   ('sc-mentor', 6), ('sc-guardrails', 7), ('sc-study-method', 8)) AS s(slug, ord)
WHERE c.slug IN ('strategy-weekly-study', 'strategy-mentor-review');

INSERT INTO public.capability_skill_profiles (capability_slug, skill_profile_slug, level, is_required, display_order)
SELECT c.slug, c.default_intent_slug, 2, true, 5
FROM public.capabilities c WHERE c.slug IN ('strategy-weekly-study', 'strategy-mentor-review');

INSERT INTO public.capability_skill_profiles (capability_slug, skill_profile_slug, level, is_required, display_order)
SELECT c.slug, 'sc-mentor', 2, true, 6
FROM public.capabilities c
WHERE c.slug IN ('strategy-daily-brief', 'strategy-weekly-review', 'strategy-readiness-check', 'strategy-library-curate', 'strategy-advise');

-- Grants: the new Library kinds ---------------------------------------------------------------------------------------------------
INSERT INTO public.personal_source_grants (agent_id, kind) VALUES
 ('harry', 'confirmed_fact'), ('harry', 'product_snapshot'), ('harry', 'connections')
ON CONFLICT DO NOTHING;

-- The starter source registry: one source record per reachable source in the probed starter list (probed 2026-11-12) ----------
-- Topic key: 1 selling to government, 2 selling a software business, 3 AI and software product, 4 pricing and packaging,
-- 5 go-to-market, 6 founder and operator lessons.
INSERT INTO public.strategy_records (kind, title, body, data, source, session_name)
SELECT 'source', v.title, v.body,
       jsonb_build_object('url', v.url, 'topics', to_jsonb(v.topics), 'type', v.type, 'reachable', v.reachable,
                          'score', 0, 'uses', 0, 'status', 'active', 'added', '2026-11-12', 'origin', 'starter'),
       'starter-list-v1', 'code-agt-649'
FROM (VALUES
 ('SBA Federal Contracting Guide', 'https://www.sba.gov/federal-contracting/contracting-guide', ARRAY[1], 'Government guide', 'partial', $q$Federal contracting basics for small businesses; the top page is mostly navigation, so read its subpages.$q$),
 ('SBA Contracting Assistance Programs', 'https://www.sba.gov/federal-contracting/contracting-assistance-programs', ARRAY[1], 'Government guide', 'yes', $q$Small-business certifications, mentor-protege programs and joint ventures for government work.$q$),
 ('GSA Multiple Award Schedule', 'https://www.gsa.gov/buy-through-us/purchasing-programs/multiple-award-schedule', ARRAY[1], 'Government guide', 'yes', $q$How to get on a GSA Schedule, and how state and local buyers use it through cooperative purchasing; a large page, read in parts.$q$),
 ('FAR Part 13 (acquisition.gov)', 'https://www.acquisition.gov/far/part-13', ARRAY[1], 'Regulation', 'yes', $q$Primary text on federal purchase thresholds and simplified acquisition procedures.$q$),
 ('NASPO ValuePoint', 'https://www.naspovaluepoint.org/', ARRAY[1,5], 'Cooperative contract vehicle', 'yes', $q$Multi-state cooperative contracts: how vendors get on them and which states take part.$q$),
 ('Sourcewell', 'https://www.sourcewell-mn.gov/', ARRAY[1,5], 'Cooperative contract vehicle', 'partial', $q$National cooperative purchasing for local government; the home page is mostly marketing copy.$q$),
 ('NASCIO (Top Ten priorities page)', 'https://www.nascio.org/resource-center/resources/state-cio-top-ten-policy-and-technology-priorities-for-2026/', ARRAY[1,3,5], 'Association', 'partial', $q$What state technology leaders fund each year; the full list sits in a PDF.$q$),
 ('NASBO', 'https://www.nasbo.org/home', ARRAY[1], 'Association', 'partial', $q$State budget cycles and fiscal surveys: when agencies have money to spend.$q$),
 ('GovRAMP (formerly StateRAMP)', 'https://govramp.org/', ARRAY[1,3], 'Compliance program', 'yes', $q$The state and local cloud-security verification program buyers increasingly require.$q$),
 ('Texas DIR, TX-RAMP', 'https://dir.texas.gov/texas-risk-and-authorization-management-program-tx-ramp', ARRAY[1,3], 'State program', 'yes', $q$The Texas cloud-security certification needed to sell software as a service to Texas agencies.$q$),
 ('Texas Comptroller HUB / VetHUB', 'https://comptroller.texas.gov/purchasing/vendor/hub/', ARRAY[1], 'State program', 'yes', $q$A state small and historically underutilized business certification, as a model for other states.$q$),
 ('GovTech (Government Technology)', 'https://www.govtech.com/rss', ARRAY[1,3,5], 'News', 'yes', $q$Daily state and local government technology news; this address returns an HTML list rather than a true feed.$q$),
 ('Route Fifty', 'https://www.route-fifty.com/rss/all/', ARRAY[1,5], 'News', 'yes', $q$State and local government operations, budgets and procurement news.$q$),
 ('StateScoop', 'https://statescoop.com/feed/', ARRAY[1,3], 'News', 'yes', $q$State technology leadership, leadership moves and contract news.$q$),
 ('Federal News Network', 'https://federalnewsnetwork.com/feed/', ARRAY[1], 'News', 'yes', $q$Federal acquisition and workforce news; the feed carries teasers, so follow the links.$q$),
 ('Washington Technology', 'https://www.washingtontechnology.com/rss/all/', ARRAY[1,2], 'News / deal tracker', 'yes', $q$Government-contractor acquisitions with deal values, plus contract wins.$q$),
 ('GovSpend blog', 'https://www.govspend.com/blog/', ARRAY[1,5], 'Vendor blog', 'yes', $q$Practical explainers on selling to state, local and education buyers.$q$),
 ('Software Equity Group research', 'https://softwareequity.com/research/', ARRAY[2,4], 'Deal research', 'yes', $q$Quarterly software acquisition multiples, a government software report and a valuation-factors guide.$q$),
 ('Axial Forum', 'https://www.axial.net/forum/feed/', ARRAY[2], 'M&A newsletter', 'yes', $q$Lower-middle-market deal mechanics: letters of intent, diligence and small-company exits.$q$),
 ('SaaS Capital blog', 'https://www.saas-capital.com/blog/', ARRAY[2,4], 'Research blog', 'partial', $q$Private software valuation and retention benchmarks; the index shows teasers only.$q$),
 ('Crunchbase News', 'https://news.crunchbase.com/feed/', ARRAY[2,6], 'News', 'yes', $q$Funding and acquisition news and founder-risk pieces.$q$),
 ('Stratechery', 'https://stratechery.com/feed/', ARRAY[3,2], 'Newsletter', 'yes', $q$Strategy analysis of platforms and AI; members-only pieces show in part.$q$),
 ('a16z (AI section)', 'https://a16z.com/ai/', ARRAY[3], 'VC essays', 'yes', $q$Investor theses on AI platforms, agents and security for AI.$q$),
 ('Bessemer Atlas', 'https://www.bvp.com/atlas/state-of-the-cloud-2024', ARRAY[3,4,2], 'VC research', 'partial', $q$Cloud benchmarks and annual state-of-the-cloud reports; article pages read well, the index does not.$q$),
 ('Anthropic Engineering', 'https://www.anthropic.com/engineering/building-effective-agents', ARRAY[3], 'Engineering blog', 'yes', $q$First-party guidance on agent design patterns, useful for judging what is commodity and what is defensible.$q$),
 ('Simon Willison''s Weblog', 'https://simonwillison.net/atom/everything/', ARRAY[3], 'Blog', 'yes', $q$Daily, hype-free notes on model tools, agents and prompt-injection security.$q$),
 ('Latent Space', 'https://www.latent.space/feed', ARRAY[3], 'Newsletter / podcast', 'yes', $q$AI-engineering news digest and interviews; a heavy feed without transcripts.$q$),
 ('NIST AI Risk Management Framework', 'https://www.nist.gov/itl/ai-risk-management-framework', ARRAY[3,1], 'Government framework', 'yes', $q$The AI governance vocabulary public buyers cite in solicitations.$q$),
 ('CISA Secure by Design', 'https://www.cisa.gov/securebydesign', ARRAY[3,1], 'Government guide', 'yes', $q$Security expectations government buyers place on software makers.$q$),
 ('Tomasz Tunguz', 'https://tomtunguz.com/index.xml', ARRAY[3,4,2], 'Blog', 'yes', $q$Data-driven posts on software and AI economics, margins and valuation.$q$),
 ('SaaStr', 'https://www.saastr.com/feed/', ARRAY[4,5,6], 'Blog', 'yes', $q$Scaling business software: contract values, sales motions and agent pricing; the feed is not in date order.$q$),
 ('Simon-Kucher Insights', 'https://www.simon-kucher.com/en/insights', ARRAY[4], 'Consultancy', 'partial', $q$Pricing and monetization research; titles read well, the pages carry heavy boilerplate.$q$),
 ('Growth Unhinged', 'https://www.growthunhinged.com/', ARRAY[4,5], 'Newsletter', 'yes', $q$Product-led growth, pricing and packaging benchmarks and current go-to-market plays; read the home page, the feed address fails.$q$),
 ('Paddle resources', 'https://www.paddle.com/resources', ARRAY[4], 'Vendor blog', 'yes', $q$Guides to software pricing strategy and packaging.$q$),
 ('Lenny''s Newsletter', 'https://www.lennysnewsletter.com/feed', ARRAY[4,5,6], 'Newsletter / podcast', 'yes', $q$Product, growth and pricing interviews; show notes in the feed, no transcripts.$q$),
 ('Paul Graham essays', 'https://paulgraham.com/articles.html', ARRAY[6], 'Founder essays', 'yes', $q$A large free collection of founder essays; the index links each one.$q$),
 ('Y Combinator blog', 'https://www.ycombinator.com/blog/feed', ARRAY[6,5], 'Founder blog', 'yes', $q$Startup advice and founder stories.$q$),
 ('First Round Review', 'https://review.firstround.com/', ARRAY[6,5], 'Operator essays', 'yes', $q$Long-form operator playbooks on hiring, go-to-market and leadership.$q$),
 ('HBS Working Knowledge', 'https://www.library.hbs.edu/working-knowledge', ARRAY[6,2], 'Research summaries', 'yes', $q$Free summaries of business-school research and cases.$q$),
 ('Acquired podcast', 'https://www.acquired.fm/episodes/costco', ARRAY[6,2], 'Podcast with transcripts', 'yes', $q$Company histories and deal stories, with full transcripts on episode pages.$q$),
 ('Tim Ferriss Show transcripts', 'https://tim.blog/category/the-tim-ferriss-show-transcripts/', ARRAY[6], 'Podcast transcripts', 'yes', $q$An index of full interview transcripts with founders and operators.$q$),
 ('OpenStax (Entrepreneurship; Principles of Management)', 'https://openstax.org/books/entrepreneurship/pages/1-introduction', ARRAY[6,5], 'Free textbooks', 'partial', $q$Free textbooks whose terms forbid AI ingestion without written permission: cite and link only, never store their text.$q$),
 ('Project Gutenberg', 'https://www.gutenberg.org/ebooks/search/?query=business', ARRAY[6], 'Free public-domain books', 'yes', $q$Public-domain business classics.$q$)
) AS v(title, url, topics, type, reachable, body);

-- Assertions ----------------------------------------------------------------------------------------------------------------------
DO $$
DECLARE n int; bad text;
BEGIN
  SELECT count(*) INTO n FROM pg_constraint c, regexp_matches(pg_get_constraintdef(c.oid), '''[a-z_]+''::text', 'g')
   WHERE c.conname = 'strategy_records_kind_check' AND c.conrelid = 'public.strategy_records'::regclass;
  IF n <> 20 THEN RAISE EXCEPTION 'kinds in strategy_records_kind_check: % (expected 20)', n; END IF;
  IF has_function_privilege('anon', 'public.library_search(text, integer, vector)', 'EXECUTE') THEN RAISE EXCEPTION 'library_search is executable by anon'; END IF;
  IF has_function_privilege('anon', 'public.strategy_memory_search(text, text[], integer, vector)', 'EXECUTE') THEN RAISE EXCEPTION 'strategy_memory_search is executable by anon'; END IF;
  SELECT count(*) INTO n FROM public.capabilities WHERE slug LIKE 'strategy-%'; IF n <> 7 THEN RAISE EXCEPTION 'capabilities: %', n; END IF;
  SELECT count(*) INTO n FROM public.agent_capability_assignments WHERE agent_id = 'harry'; IF n <> 7 THEN RAISE EXCEPTION 'assignments: %', n; END IF;
  SELECT count(*) INTO n FROM public.skill_profiles WHERE slug LIKE 'sc-%'; IF n <> 14 THEN RAISE EXCEPTION 'skills: %', n; END IF;
  SELECT count(*) INTO n FROM public.capability_skill_profiles WHERE capability_slug LIKE 'strategy-%'; IF n <> 51 THEN RAISE EXCEPTION 'links: %', n; END IF;
  SELECT count(*) INTO n FROM public.capability_skill_profiles WHERE skill_profile_slug = 'sc-mentor'; IF n <> 7 THEN RAISE EXCEPTION 'sc-mentor links: %', n; END IF;
  SELECT count(*) INTO n FROM public.strategy_records WHERE kind = 'source' AND data->>'origin' = 'starter'; IF n < 40 THEN RAISE EXCEPTION 'starter sources: %', n; END IF;
  SELECT count(*) INTO n FROM public.strategy_records WHERE kind = 'source' AND (data->>'url' IS NULL OR jsonb_array_length(data->'topics') = 0 OR data->>'status' IS NULL);
  IF n <> 0 THEN RAISE EXCEPTION 'source rows missing url/topics/status: %', n; END IF;
  SELECT count(*) INTO n FROM public.personal_source_grants WHERE agent_id = 'harry' AND kind IN ('confirmed_fact','product_snapshot','connections'); IF n <> 3 THEN RAISE EXCEPTION 'new grants: %', n; END IF;
  SELECT string_agg(s.slug || '~' || a.id, ', ') INTO bad
    FROM public.skill_profiles s JOIN public.agents a ON a.id <> 'harry'
   WHERE s.slug LIKE 'sc-%' AND (coalesce(s.method,'') || coalesce(s.objective,'') || s.traits::text || s.guardrails::text) ~* ('\m' || a.id || '\M');
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'an sc row names another agent: %', bad; END IF;
  SELECT string_agg(s.slug, ', ') INTO bad
    FROM public.skill_profiles s
   WHERE s.slug LIKE 'sc-%' AND (coalesce(s.method,'') || coalesce(s.objective,'') || s.traits::text || s.guardrails::text) ~* '\mdeepbench\M';
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'an sc row names the product: %', bad; END IF;
END $$;

COMMIT;
