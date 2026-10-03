-- AGT-154 — Jerry gains the LinkedIn Alert Review capability: legit check, fit, and an act-on-it call.
-- Designed 2026-09-25 (docs/kickoffs/v7.0.599-AGT-154-linkedin-alert-review.md); applied by the runner cycle
-- 20fedea4-1b7f-40b7-8015-5746780fb148 at v7.0.686. Shape follows docs/design/agt-82-jerry-maguire-seed.sql:
-- NO Format Skill (the executor's Format branch overwrites the Intent contract); every Knowledge Skill carries
-- traits.source = 'inline' (SES-341); one Intent per Capability; the four shared Skills stay linked.
-- METHOD ONLY: no row below carries a personal fact — every fact lives in public.career_records (service key only).
-- Rule #1 (§19d/§19e) holds: no row names another agent; the competitor flag is a fact on the job, and who
-- receives the lead is AGT-155's live routing decision, never a name in this file.
--
-- ONE TRANSACTION, REVERSIBLE BY CONSTRUCTION. record_decision() opens an 'agent-row' decision handle; every one
-- of the 12 inserted rows gets a runner_before_images row with row_data NULL (the reversal deletes it), and
-- jm-guardrails gets a REAL pre-image (to_jsonb(row)) captured BEFORE its UPDATE, so reverse_decision() restores
-- the previous must_not list byte-for-byte. 13 images, all carrying this cycle's id. All four tables touched are
-- in reversible_tables() and keyed by an `id uuid`, so every promise here is keepable (pattern:169).
--
-- TWO MEASURED DRIFTS FROM THE 2026-09-25 KICKOFF, both handled here rather than transcribed:
--   (1) The kickoff's SQL named the design cycle 58d55d09-6c40-4633-afdc-0fc42b9b914d. That cycle is not the one
--       applying this change; before-images filed against it would be unreversible from here. This file names the
--       APPLYING cycle, 20fedea4-1b7f-40b7-8015-5746780fb148, in record_decision() and in every before-image.
--   (2) jm-guardrails.must_not measured 8 entries live (2026-09-28), not the 6 the kickoff measured on 09-25 —
--       two entries landed after the design. The append is unchanged in intent (the existing entries stay
--       byte-identical, the same seven strings follow, in order); only the arithmetic moves, 8 -> 15 not 6 -> 13.
--       The DO block asserts BOTH the absolute 15 and the structural post = pre + 7, so a wrong pre-count cannot
--       pass as green.
--   (3) The harvest says every row stores `temperature 0, as the jm- rows`. That was true when it was measured
--       (2026-09-23) and is not true now: AGT-90 (v7.0.568) NULLed the temperature on all 15 jm- rows, because
--       the claude-fable family REJECTS a stored temperature, and shipped a tripwire
--       (tests/regression/agt-90-fable-temperature.test.mjs) that goes red on any row which stores one. Seeding
--       0 here turned that suite red on the three new rows. They store NULL, like the other fifteen.

BEGIN;

-- The decision handle every before-image below hangs from. Recorded against THIS cycle.
CREATE TEMP TABLE seed_ctx ON COMMIT DROP AS
SELECT public.record_decision(
  '20fedea4-1b7f-40b7-8015-5746780fb148'::uuid,
  NULL,
  'agent-row',
  'AGT-154',
  'Seed the career-linkedin-alerts capability: one Capability, one Intent Skill, two Knowledge Skills, one assignment, seven links, and seven appended guardrail never-rules.',
  'An agreed ticket''s seed is build work with a before-image, not a card (AGENT-ROW-AGREED-TICKET). The rules that decide legit/suspect and the four act calls are reference content the model applies, so they are Knowledge Skills and not identity, behavior or guardrails (pattern:136, pattern:7 — the behaviour lives in the agent''s own Skill content). The fit method is Posting Review''s, reused rather than restated (pattern:14). The guardrails are appended, never rewritten: the existing entries stay byte-identical (pattern:166).'::text,
  NULL
) AS decision_id;

-- The must_not list as it stands BEFORE the UPDATE, so the DO block can prove post = pre + 7 structurally.
-- Column names deliberately unlike the DO block's plpgsql variables: a bare `n` here is ambiguous
-- against the variable `n` and the whole transaction aborts on the SELECT ... INTO.
CREATE TEMP TABLE seed_guardrails_pre ON COMMIT DROP AS
SELECT guardrails->'must_not' AS must_not_pre, jsonb_array_length(guardrails->'must_not') AS pre_count
FROM public.skill_profiles WHERE slug = 'jm-guardrails';

-- The REAL pre-image of jm-guardrails, captured before a single byte of it changes.
INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
SELECT '20fedea4-1b7f-40b7-8015-5746780fb148'::uuid, NULL, 'skill_profiles', s.id::text, to_jsonb(s),
       (SELECT decision_id FROM seed_ctx)
FROM public.skill_profiles s WHERE s.slug = 'jm-guardrails';

-- The Capability ------------------------------------------------------------------------------------------------
WITH ins AS (
  INSERT INTO public.capabilities (slug, name, description, execution_type, tenant_id, display_phrase, default_intent_slug)
  VALUES ('career-linkedin-alerts', 'Career LinkedIn Alert Review',
    'Takes the intake of LinkedIn job-alert cards the platform already fetched and returns, per card, a legit / suspect / could-not-verify verdict with the public sources read, the fit against the evidence as Posting Review scores it, and one act call — apply now, apply with prep, watch or skip — with its reason, the gap and prep, the nearest contact, and a competitor flag. Writes one reviewed posting record per card.',
    'ai', 'global', 'reviewing the LinkedIn alerts', 'jm-linkedin-alerts-intent')
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
SELECT '20fedea4-1b7f-40b7-8015-5746780fb148'::uuid, NULL, 'capabilities', id::text, NULL,
       (SELECT decision_id FROM seed_ctx) FROM ins;

-- The Intent Skill ----------------------------------------------------------------------------------------------
WITH ins AS (
  INSERT INTO public.skill_profiles (slug, name, skill_type_slug, objective, method, output_desc, description, traits, guardrails, technical_services, execution_type, llm_provider, llm_model, max_tokens, temperature, api_key_source) VALUES
   ('jm-linkedin-alerts-intent', 'Review the LinkedIn Alerts', 'intent',
    $q$Turn the intake of LinkedIn job-alert cards into verdicts the principal can act on: legit or not, fit, and an act call — with the records to keep.$q$,
    $q$Your task_context carries intake (the platform's intake file: fetched_at, since, sender, cards — each card job_id, url, title, company, location, message_uid, alert_date), the target, resume_fact, ladder_rung, evidence, network_contact, posting and log records, competitors (public company names and domains), and the corrections. Read the corrections first. For EVERY card, in order: (1) VERIFY — read the public job page at the card's url (web search; never log in, never follow an email link) and apply the Posting Verification rules to reach one verdict: legit, suspect, or could not verify, with the reason and the sources you read; when web search is absent say so and mark could not verify. (2) FIT — extract the must-haves in the posting's own phrases, match each to cited evidence, and state fit as must-haves met over must-haves, exactly as Posting Review does; name the target row the posting belongs to. (3) ACT — apply the Act Call rules to reach one call: apply now, apply with prep, watch, or skip, with the reason; for apply with prep name the one material gap and the prep that closes it; for apply now and apply with prep name the nearest network_contact, or say there is none. (4) COMPETITOR — set competitor true when the company appears in competitors or its public page sells what the platform sells; give the public fact that says so; never send anything — the platform routes the lead. (5) PAY — report stated pay only; never estimate. Put every suspect card in scam_warnings, first. records_to_write: one posting record per card with data {linkedin_job_id, url (plain, rebuilt from the id), title, company, location, alert_date, status: reviewed, legit, legit_reason, act, act_reason, fit, must_haves, gap, prep, nearest_contact, competitor, stated_pay, target_row}; market_requirement records ONLY from cards whose legit verdict is not suspect. Never invent a company, a page, a figure or a URL; an unread page is could not verify, not legit.$q$,
    $q$Per job: company, title, plain url, must-haves, fit, legit verdict and reason, act call and reason, gap and prep, nearest contact, competitor flag; scam warnings first; a one-paragraph summary; records_to_write.$q$,
    NULL,
    $j${"schema":{"type":"object","required":["jobs","scam_warnings","summary","records_to_write"],"properties":{
 "jobs":{"type":"array","items":{"type":"object","required":["job_id","company","title","url","target_row","must_haves","fit","legit","legit_reason","act","act_reason","competitor"],"properties":{
   "job_id":{"type":"string"},"company":{"type":"string"},"title":{"type":"string"},"url":{"type":"string"},"target_row":{"type":"string"},
   "must_haves":{"type":"array","items":{"type":"object","required":["phrase","met","evidence_ids"],"properties":{"phrase":{"type":"string"},"met":{"type":"boolean"},"evidence_ids":{"type":"array","items":{"type":"string"}}}}},
   "fit":{"type":"string"},
   "legit":{"type":"string","enum":["legit","suspect","could not verify"]},"legit_reason":{"type":"string","maxLength":400},
   "sources":{"type":"array","items":{"type":"string"}},
   "act":{"type":"string","enum":["apply now","apply with prep","watch","skip"]},"act_reason":{"type":"string","maxLength":400},
   "gap":{"type":"string","maxLength":300},"prep":{"type":"string","maxLength":300},"nearest_contact":{"type":"string"},
   "competitor":{"type":"boolean"},"competitor_why":{"type":"string","maxLength":300},
   "stated_pay":{"type":"string"},"posted_days":{"type":"integer","minimum":0}}}},
 "scam_warnings":{"type":"array","items":{"type":"string","maxLength":300}},
 "summary":{"type":"string","maxLength":1200},
 "records_to_write":{"type":"array","items":{"type":"object","required":["kind","title"],"properties":{"kind":{"type":"string"},"title":{"type":"string"},"body":{"type":"string"},"data":{"type":"object"},"source":{"type":"string"},"target_row":{"type":"string"}}}}}},
 "can_request_help":false,"enable_web_search":true,"web_search_max_uses":24}$j$::jsonb,
    '{"must":[],"must_not":[]}'::jsonb, '["structured-output","web-search"]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 12000, NULL, 'platform')
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
SELECT '20fedea4-1b7f-40b7-8015-5746780fb148'::uuid, NULL, 'skill_profiles', id::text, NULL,
       (SELECT decision_id FROM seed_ctx) FROM ins;

-- The two Knowledge Skills (traits.source inline, SES-341) --------------------------------------------------------
WITH ins AS (
  INSERT INTO public.skill_profiles (slug, name, skill_type_slug, objective, method, output_desc, description, traits, guardrails, technical_services, execution_type, llm_provider, llm_model, max_tokens, temperature, api_key_source) VALUES
   ('jm-knowledge-posting-verification', 'Jerry Maguire Knowledge — Posting Verification', 'knowledge',
    $q$Hold the rules that decide whether a job-alert posting is real, and which public sources may be read to decide it.$q$,
    $q$THE VERDICTS. LEGIT = the same role is found on the company's own careers page or applicant-tracking system (Greenhouse, Lever, Workday, Ashby) AND the company has a real domain that matches. SUSPECT = any one of: money, a bank account, an ID document or a purchase asked for before an interview; contact moved off LinkedIn to WhatsApp, Telegram or a personal Gmail; the company cannot be found or its domain does not match the posting; the same role reposted three or more times over sixty or more days (count the posting records); the title and the pay do not match. COULD NOT VERIFY = no proof either way — never promote it to legit. THE SOURCES, all public and read without any login: the LinkedIn job page rebuilt from the job id as https://www.linkedin.com/jobs/view/<id>/ (never a link from an email — those carry tracking); the company careers page or ATS board; the company domain, size and recent news; reposting history from the posting records supplied; the pay stated on the posting only — pay is never estimated. Every verdict names the sources read with the date; a page that would not load is recorded as not read.$q$,
    NULL,
    'The legit / suspect / could-not-verify rules and the sources allowed for them.',
    '{"source":"inline"}'::jsonb, '{"must":[],"must_not":[]}'::jsonb, '[]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 8000, NULL, 'platform'),

   ('jm-knowledge-act-call', 'Jerry Maguire Knowledge — the Act Call', 'knowledge',
    $q$Hold the rule that turns a verdict and a fit into one of four calls.$q$,
    $q$FIT is must-haves met over must-haves, stated as a fraction, exactly as Posting Review scores it; "minor" means a must-have the evidence nearly meets; "material" means one it does not. THE FOUR CALLS, tested in this order: SKIP when the posting is suspect, or fit is below one half, or the title sits below Senior Product Manager, or the stated pay is below the target row's pay floor, or the principal already applied (a posting record for the same job id or company and title with an applied status, or a log record saying so). APPLY NOW when every must-have is met or all but one minor one, the title is on the target row's rung, and the posting is at most fourteen days old. APPLY WITH PREP when fit is at least two thirds and exactly one material gap can be named together with the prep that closes it. WATCH when fit is below two thirds, or the posting is more than thirty days old, but the company or role is worth tracking — it goes on the watch list. Age is counted from the posting's own date when the page states it, else from the alert date. Every call carries its reason in one sentence and, for apply now and apply with prep, the nearest network contact or the statement that there is none.$q$,
    NULL,
    'The four act calls and their cut-offs.',
    '{"source":"inline"}'::jsonb, '{"must":[],"must_not":[]}'::jsonb, '[]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 8000, NULL, 'platform')
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
SELECT '20fedea4-1b7f-40b7-8015-5746780fb148'::uuid, NULL, 'skill_profiles', id::text, NULL,
       (SELECT decision_id FROM seed_ctx) FROM ins;

-- The assignment ---------------------------------------------------------------------------------------------------
WITH ins AS (
  INSERT INTO public.agent_capability_assignments (agent_id, capability_slug, tenant_id)
  VALUES ('jerry', 'career-linkedin-alerts', 'global')
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
SELECT '20fedea4-1b7f-40b7-8015-5746780fb148'::uuid, NULL, 'agent_capability_assignments', id::text, NULL,
       (SELECT decision_id FROM seed_ctx) FROM ins;

-- The seven links, in display order ---------------------------------------------------------------------------------
WITH ins AS (
  INSERT INTO public.capability_skill_profiles (capability_slug, skill_profile_slug, level, is_required, display_order)
  SELECT 'career-linkedin-alerts', s.slug, 2, true, s.ord
  FROM (VALUES ('jm-identity', 1), ('jm-knowledge-method', 2), ('jm-behavior', 3),
               ('jm-linkedin-alerts-intent', 4), ('jm-knowledge-posting-verification', 5),
               ('jm-knowledge-act-call', 6), ('jm-guardrails', 7)) AS s(slug, ord)
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
SELECT '20fedea4-1b7f-40b7-8015-5746780fb148'::uuid, NULL, 'capability_skill_profiles', id::text, NULL,
       (SELECT decision_id FROM seed_ctx) FROM ins;

-- The guardrails APPEND. The existing entries are untouched — concatenation, never a rewritten list (pattern:166).
UPDATE public.skill_profiles
   SET guardrails = jsonb_set(guardrails, '{must_not}', (guardrails->'must_not') ||
        $m$["apply to, message or contact anyone",
            "click an email link - rebuild the job URL from the id",
            "log into LinkedIn or any job site",
            "change the mailbox (flag, move, delete, reply)",
            "share personal data outside career_records",
            "spend money",
            "estimate pay - stated pay only"]$m$::jsonb)
 WHERE slug = 'jm-guardrails';

-- Assertions: nothing below may be taken on the migration's success flag ---------------------------------------------
DO $$
DECLARE n int; pre_n int; post jsonb; pre jsonb; bad text; dec uuid;
BEGIN
  SELECT decision_id INTO dec FROM seed_ctx;
  IF dec IS NULL THEN RAISE EXCEPTION 'no decision handle'; END IF;

  SELECT count(*) INTO n FROM public.capabilities WHERE slug LIKE 'career-%';
    IF n <> 12 THEN RAISE EXCEPTION 'capabilities: % (expected 12)', n; END IF;
  SELECT count(*) INTO n FROM public.agent_capability_assignments WHERE agent_id = 'jerry';
    IF n <> 12 THEN RAISE EXCEPTION 'assignments: % (expected 12)', n; END IF;
  SELECT count(*) INTO n FROM public.skill_profiles WHERE slug LIKE 'jm-%';
    IF n <> 18 THEN RAISE EXCEPTION 'jm skills: % (expected 18)', n; END IF;
  SELECT count(*) INTO n FROM public.capability_skill_profiles WHERE capability_slug LIKE 'career-%';
    IF n <> 62 THEN RAISE EXCEPTION 'career links: % (expected 62)', n; END IF;
  SELECT count(*) INTO n FROM public.capability_skill_profiles WHERE capability_slug = 'career-linkedin-alerts';
    IF n <> 7 THEN RAISE EXCEPTION 'new links: % (expected 7)', n; END IF;
  SELECT count(*) INTO n FROM public.capabilities
    WHERE slug = 'career-linkedin-alerts' AND default_intent_slug = 'jm-linkedin-alerts-intent' AND execution_type = 'ai' AND tenant_id = 'global';
    IF n <> 1 THEN RAISE EXCEPTION 'the capability row is not the one designed: %', n; END IF;

  -- Every knowledge Skill in the family is inline (SES-341), the two new ones included.
  SELECT count(*) INTO n FROM public.skill_profiles
    WHERE slug LIKE 'jm-%' AND skill_type_slug = 'knowledge' AND coalesce(traits->>'source','') <> 'inline';
    IF n <> 0 THEN RAISE EXCEPTION 'knowledge not inline: %', n; END IF;

  -- AGT-90: the claude-fable family rejects a stored temperature. No jm- row may carry one.
  SELECT count(*) INTO n FROM public.skill_profiles
    WHERE slug LIKE 'jm-%' AND llm_model LIKE 'claude-fable%' AND temperature IS NOT NULL;
    IF n <> 0 THEN RAISE EXCEPTION '% jm- row(s) store a temperature the fable family rejects (AGT-90)', n; END IF;

  -- The guardrails append, proved BOTH ways: the absolute count, and post = pre + 7 with every prior entry intact.
  SELECT must_not_pre, pre_count INTO pre, pre_n FROM seed_guardrails_pre;
  SELECT guardrails->'must_not' INTO post FROM public.skill_profiles WHERE slug = 'jm-guardrails';
  IF jsonb_array_length(post) <> 15 THEN RAISE EXCEPTION 'must_not: % (expected 15)', jsonb_array_length(post); END IF;
  IF jsonb_array_length(post) <> pre_n + 7 THEN RAISE EXCEPTION 'must_not grew by %, expected exactly 7', jsonb_array_length(post) - pre_n; END IF;
  IF (SELECT jsonb_agg(e ORDER BY ord) FROM jsonb_array_elements(post) WITH ORDINALITY t(e, ord) WHERE ord <= pre_n) <> pre
    THEN RAISE EXCEPTION 'an existing must_not entry changed — the append rewrote the list'; END IF;
  FOR bad IN SELECT x FROM unnest(ARRAY[
      'apply to, message or contact anyone',
      'click an email link - rebuild the job URL from the id',
      'log into LinkedIn or any job site',
      'change the mailbox (flag, move, delete, reply)',
      'share personal data outside career_records',
      'spend money',
      'estimate pay - stated pay only']) x
    WHERE NOT (post @> to_jsonb(x)) LOOP
    RAISE EXCEPTION 'must_not is missing the appended rule: %', bad;
  END LOOP;

  -- Rule #1 (§19d/§19e): no jm- row names another agent. agt-82's regex, jerry excluded.
  SELECT string_agg(s.slug || '~' || a.id, ', ') INTO bad
    FROM public.skill_profiles s JOIN public.agents a ON a.id <> 'jerry'
   WHERE s.slug LIKE 'jm-%'
     AND (coalesce(s.method,'') || coalesce(s.objective,'') || s.traits::text || s.guardrails::text) ~* ('\m' || a.id || '\M');
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'a jm row names another agent: %', bad; END IF;

  -- The reversal promise: 13 images, all on THIS cycle, all on this decision, 12 inserts + 1 real pre-image.
  SELECT count(*) INTO n FROM public.runner_before_images
   WHERE decision_id = dec AND cycle_id = '20fedea4-1b7f-40b7-8015-5746780fb148'::uuid AND session_name IS NULL;
    IF n <> 13 THEN RAISE EXCEPTION 'before-images on this cycle: % (expected 13)', n; END IF;
  SELECT count(*) INTO n FROM public.runner_before_images WHERE decision_id = dec AND row_data IS NULL;
    IF n <> 12 THEN RAISE EXCEPTION 'insert images (row_data NULL): % (expected 12)', n; END IF;
  SELECT count(*) INTO n FROM public.runner_before_images
   WHERE decision_id = dec AND row_data IS NOT NULL AND table_name = 'skill_profiles'
     AND jsonb_array_length(row_data->'guardrails'->'must_not') = pre_n;
    IF n <> 1 THEN RAISE EXCEPTION 'the jm-guardrails pre-image does not carry the pre-UPDATE list'; END IF;
  SELECT count(*) INTO n FROM public.runner_before_images b
   WHERE b.decision_id = dec AND NOT (b.table_name = ANY (public.reversible_tables()));
    IF n <> 0 THEN RAISE EXCEPTION '% images name a table reverse_decision() cannot restore', n; END IF;
END $$;

COMMIT;
