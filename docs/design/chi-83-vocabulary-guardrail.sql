-- CHI-83 — the single-vocabulary guardrail for the CHI intents. One noun per object in every word
-- a channel-intelligence or hypothesis-evaluation user reads: Theory, Forecast, Analysis, News.
-- Designed 2026-09-29 (docs/kickoffs/v7.0.714-CHI-83-chi-vocabulary-guardrail.md); applied by the
-- runner cycle e71c1a40-6b99-4113-bef4-01a75132469a at v7.0.714. This file is the MIRROR of what
-- was applied, byte-identical, not a substitute for applying it.
--
-- WHY A GUARDRAILS-TYPE SKILL AND NOT FIVE EDITED INTENT ROWS. CHI-82 shipped the screen side; the
-- words the user reads are the model's own, so no screen edit can reach them (ARCHITECTURE.md
-- §19n). The narrowest layer that actually works is Supabase content, and the platform already has
-- the exact structure for a rule that must reach several intents of two Capabilities: a
-- guardrails-type skill_profiles row whose text lives in the `guardrails` COLUMN (the only column
-- api/prompt/db-assembly.js's guardrails branch reads), attached per Capability and scoped by
-- traits.intent_allowlist — AGT-44's platform-language-guardrail, the row every column below that
-- is not named in the kickoff's §4 is copied from. pattern:7 (fix agent behaviour in the agent's
-- own Skill content), pattern:8 (narrowest layer — data, not code: zero lines of harness change),
-- pattern:17 (extend the structure that already fits), pattern:136 (the Skill's type is named and
-- justified: guardrails, because this is a standing prohibition on every field the user reads, not
-- reference content the model applies), pattern:166 (nothing existing is weakened — the AGT-44 row
-- is read, asserted unchanged, and never edited).
--
-- THE ALLOWLIST IS FIVE INTENTS AND THE ROUTING INTENT IS OUT, on measurement, not on taste: AGT-54
-- proved a guardrail reaching the five-way routing classification skews it (deterministic 3/3,
-- docs/harvests/AGT-44.md). Both *-display-intent rows are out too — they drive tool calls and
-- write no user text. Marcus's two acks are IN: they write text a user reads.
--
-- ONE TRANSACTION, REVERSIBLE BY CONSTRUCTION. record_decision() opens an 'agent-row' decision
-- handle (rule AGENT-ROW-AGREED-TICKET, second limb: an agreed ticket's seed is build work with a
-- before-image, not a card); each of the three inserted rows gets a runner_before_images row with
-- row_data NULL, so reverse_decision() on the handle deletes exactly those three. Both tables are
-- in reversible_tables() and keyed by an `id uuid`, so every promise here is keepable (pattern:169).
-- Shape follows docs/design/agt-154-linkedin-alerts-seed.sql.

BEGIN;

-- The decision handle every before-image below hangs from. Recorded against the APPLYING cycle —
-- a before-image filed against any other cycle is unreversible from here (agt-154's drift (1)).
CREATE TEMP TABLE chi83_ctx ON COMMIT DROP AS
SELECT public.record_decision(
  'e71c1a40-6b99-4113-bef4-01a75132469a'::uuid,
  NULL,
  'agent-row',
  'CHI-83',
  'CHI-83: one guardrails Skill, chi-vocabulary-guardrail, on channel-intelligence and hypothesis-evaluation, allowlisted to five intents',
  'CHI-82 fixed the screen; the remaining "thesis"/"candidate"/"hypothesis" text is the model''s own, so the fix has to land in the agent''s own Skill content (pattern:7) at the narrowest layer that works — Supabase content, zero harness lines (pattern:8). One guardrails-type row in the structure AGT-44 already proved, rather than five hand-edited intent methods that would drift apart (pattern:17); its type is guardrails because it is a standing prohibition on every field the user reads, not reference content (pattern:136). traits.intent_allowlist scopes it to the five intents that write user text and away from the five-way routing classification intent, where AGT-54 measured a guardrail skewing that classification 3/3, and away from both display intents, which write no user text. The AGT-44 row itself is read and asserted unchanged, never weakened (pattern:166).'::text,
  public.ladder_work_class('P6 - Agent Enhancement')
) AS decision_id;

-- platform-language-guardrail as it stands BEFORE this transaction. It is READ here (every column
-- the kickoff does not name is copied from it) and must come out of this transaction untouched;
-- the DO block proves that with to_jsonb equality rather than taking it on trust.
CREATE TEMP TABLE chi83_plg_pre ON COMMIT DROP AS
SELECT to_jsonb(s) AS plg_row_pre FROM public.skill_profiles s WHERE s.slug = 'platform-language-guardrail';

-- The Skill row. INSERT ... SELECT, so "copied from the live platform-language-guardrail row" is
-- literally a copy rather than a transcription that can drift: only the columns §4 names are
-- literals here, and objective/method/temperature are the NULLs §4 requires.
WITH ins AS (
  INSERT INTO public.skill_profiles
    (slug, name, description, skill_type_slug, objective, method, output_desc, tone, confidence,
     traits, guardrails, notes, technical_services, execution_type, tenant_id,
     llm_provider, llm_model, max_tokens, api_key_source, temperature)
  SELECT
    'chi-vocabulary-guardrail',
    'Single Vocabulary',
    'One noun per object in everything the channel-intelligence user reads (ARCHITECTURE.md §19n, CHI-83).',
    'guardrails',
    NULL, NULL,
    s.output_desc, s.tone, s.confidence,
    $t${"intent_allowlist":["hyp-generation-intent","hyp-hypothesis-test-intent","ci-answer-intent","ci-submission-ack-intent","ci-resolution-ack-intent"]}$t$::jsonb,
    $g$["One noun per object in every word the user reads: Theory (the explanation the user picks and tests), Forecast (the committed record created from a validated Theory), Analysis (your read on a question or article), News (source articles).",
        "Never write hypothesis, hypotheses, thesis, theses or candidate in any field the user reads. The object is a Theory; several are Theories.",
        "Field names such as hypotheses and extracted_hypothesis are internal: keep them exactly as the schema requires and never let those words reach the text you write.",
        "Nothing is a Forecast until the user creates one; a Theory under test stays a Theory."]$g$::jsonb,
    s.notes, s.technical_services, s.execution_type, s.tenant_id,
    s.llm_provider, s.llm_model, s.max_tokens, s.api_key_source, NULL
  FROM public.skill_profiles s WHERE s.slug = 'platform-language-guardrail'
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
SELECT 'e71c1a40-6b99-4113-bef4-01a75132469a'::uuid, NULL, 'skill_profiles', id::text, NULL,
       (SELECT decision_id FROM chi83_ctx) FROM ins;

-- The two attachments. display_order 10 sits after platform-language-guardrail's 9 on both
-- Capabilities; both are level 2 and required — a vocabulary the user reads is not optional.
WITH ins AS (
  INSERT INTO public.capability_skill_profiles (capability_slug, skill_profile_slug, level, is_required, display_order)
  SELECT c.slug, 'chi-vocabulary-guardrail', 2, true, 10
  FROM (VALUES ('channel-intelligence'), ('hypothesis-evaluation')) AS c(slug)
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
SELECT 'e71c1a40-6b99-4113-bef4-01a75132469a'::uuid, NULL, 'capability_skill_profiles', id::text, NULL,
       (SELECT decision_id FROM chi83_ctx) FROM ins;

-- Assertions: nothing below may be taken on the migration's success flag.
DO $$
DECLARE n int; dec uuid; g jsonb; al jsonb; bad text; pre jsonb; post jsonb;
BEGIN
  SELECT decision_id INTO dec FROM chi83_ctx;
  IF dec IS NULL THEN RAISE EXCEPTION 'no decision handle'; END IF;

  -- Exactly one Skill row, of the one type that renders as CONSTRAINTS & GUARDRAILS.
  SELECT count(*) INTO n FROM public.skill_profiles
   WHERE slug = 'chi-vocabulary-guardrail' AND skill_type_slug = 'guardrails';
    IF n <> 1 THEN RAISE EXCEPTION 'chi-vocabulary-guardrail guardrails-type rows: % (expected 1)', n; END IF;

  -- The rule text is in the guardrails COLUMN, array-shaped, four strings. Text in `method` or
  -- `objective` is read by nothing and reaches no model (AGT-44's own discriminator).
  SELECT guardrails, traits->'intent_allowlist' INTO g, al
    FROM public.skill_profiles WHERE slug = 'chi-vocabulary-guardrail';
  IF jsonb_typeof(g) <> 'array' THEN RAISE EXCEPTION 'guardrails is %, expected an array', jsonb_typeof(g); END IF;
  IF jsonb_array_length(g) <> 4 THEN RAISE EXCEPTION 'guardrails holds % strings (expected 4)', jsonb_array_length(g); END IF;
  SELECT count(*) INTO n FROM public.skill_profiles
   WHERE slug = 'chi-vocabulary-guardrail' AND (method IS NOT NULL OR objective IS NOT NULL OR temperature IS NOT NULL);
    IF n <> 0 THEN RAISE EXCEPTION 'chi-vocabulary-guardrail stores a method, objective or temperature'; END IF;

  -- The allowlist is exactly the five intents that write user text.
  IF jsonb_array_length(al) <> 5 THEN RAISE EXCEPTION 'intent_allowlist holds % entries (expected 5)', jsonb_array_length(al); END IF;
  FOR bad IN SELECT x FROM unnest(ARRAY[
      'hyp-generation-intent','hyp-hypothesis-test-intent','ci-answer-intent',
      'ci-submission-ack-intent','ci-resolution-ack-intent']) x
    WHERE NOT (al @> to_jsonb(x)) LOOP
    RAISE EXCEPTION 'intent_allowlist is missing %', bad;
  END LOOP;
  SELECT count(*) INTO n FROM public.skill_profiles WHERE slug = 'chi-vocabulary-guardrail'
     AND NOT (traits->'intent_allowlist' @> to_jsonb('ci-routing-intent'::text));
    IF n <> 1 THEN RAISE EXCEPTION 'intent_allowlist reaches the five-way routing classification (AGT-54, 3/3)'; END IF;

  -- Exactly two attachments, and to exactly the two Capabilities designed.
  SELECT count(*) INTO n FROM public.capability_skill_profiles
   WHERE skill_profile_slug = 'chi-vocabulary-guardrail';
    IF n <> 2 THEN RAISE EXCEPTION 'attachments: % (expected 2)', n; END IF;
  SELECT count(*) INTO n FROM public.capability_skill_profiles
   WHERE skill_profile_slug = 'chi-vocabulary-guardrail'
     AND capability_slug IN ('channel-intelligence','hypothesis-evaluation')
     AND level = 2 AND is_required AND display_order = 10;
    IF n <> 2 THEN RAISE EXCEPTION 'the two attachments are not the pair designed: %', n; END IF;

  -- The AGT-44 row is read by this transaction and changed by none of it.
  SELECT plg_row_pre INTO pre FROM chi83_plg_pre;
  SELECT to_jsonb(s) INTO post FROM public.skill_profiles s WHERE s.slug = 'platform-language-guardrail';
  IF pre IS NULL OR post IS NULL THEN RAISE EXCEPTION 'platform-language-guardrail could not be read on both sides'; END IF;
  IF pre <> post THEN RAISE EXCEPTION 'platform-language-guardrail changed — this transaction copies it, it never edits it'; END IF;

  -- The reversal promise: three images, all on THIS cycle, all inserts, all on restorable tables.
  SELECT count(*) INTO n FROM public.runner_before_images
   WHERE decision_id = dec AND cycle_id = 'e71c1a40-6b99-4113-bef4-01a75132469a'::uuid
     AND session_name IS NULL AND row_data IS NULL;
    IF n <> 3 THEN RAISE EXCEPTION 'before-images on this decision: % (expected 3, all row_data NULL)', n; END IF;
  SELECT count(*) INTO n FROM public.runner_before_images WHERE decision_id = dec;
    IF n <> 3 THEN RAISE EXCEPTION 'before-images on this decision: % (expected exactly 3)', n; END IF;
  SELECT count(*) INTO n FROM public.runner_before_images b
   WHERE b.decision_id = dec AND NOT (b.table_name = ANY (public.reversible_tables()));
    IF n <> 0 THEN RAISE EXCEPTION '% image(s) name a table reverse_decision() cannot restore', n; END IF;

  RAISE NOTICE 'CHI-83 decision % — reverse_decision() on it deletes the 3 rows', dec;
END $$;

COMMIT;
