-- DeepBench v7.0.717 | docs/design/sca-4-catalog-intent-no-citations-field.sql | SCA-4 --
-- LIBRARY-CATALOG-INTENT STOPS RE-EMITTING ITS CITATION IDS. The row asked for the same citations
-- twice: `traits.schema` declared a `citations` array output, while `method` already requires the
-- inline `[id: ...]` value of at least one representative entry per category. All 5 `complete` hops
-- returned the array (23/22/4/6/2 ids) and ~20-26% of the post-cap outputs restated those ids in the
-- prose as well, so the field is a paid-for second copy. The contract is the Skill row's
-- `traits.schema` (api/prompt/db-assembly.js:310-314 lifts it into formatContract verbatim), so the
-- fix is one row of content and not one line of harness (pattern:7 -- fix agent behavior in the
-- agent's own Skill content; pattern:8 -- the narrowest layer that actually works).
--
-- THIS FILE IS A MIRROR, NOT THE SOURCE. It is the text of migration
-- `sca4_catalog_intent_no_citations_field` exactly as applied by the cycle named in the
-- record_decision() call below, kept in the repo so the dropped output field is reviewable without a
-- database round-trip (the arrangement of docs/design/agt-155-competitors-intent-leads.sql).
--
-- NO DDL. Not one object is created, dropped or altered -- this is a single-row UPDATE of content,
-- so capture_migration_down() has nothing to classify and is deliberately NOT called
-- (docs/runbooks/runner-cycle.md step 6 asks for it before DDL). The reversal handle is the
-- before-image: record_decision() opens an 'agent-row' handle, and the row's full pre-UPDATE image
-- is filed against it BEFORE a byte changes, so reverse_decision() restores the previous `traits`
-- byte-for-byte. `skill_profiles` is in reversible_tables() and is keyed by an `id uuid`, so the
-- promise is keepable (pattern:169).
--
-- AGENT-ROW-AGREED-TICKET: SCA-4 is an agreed ticket whose `scope_origin` is NULL, so its Skill edit
-- is build work with a before-image, not a gate card.
--
-- NOTHING IS REMOVED THAT A READER NAMES. Measured live before the write: the delegating hop
-- receives the whole result as a `tool_result` (api/capabilities/execute.js:1121-1123) and its method
-- reads the inline `[id: ...]` values, never the field; the 389 `store` deliverables for this slug
-- have no reader of `.citations`; SELF_REPORTED_CLAIM_FIELDS (api/prompt/request-receivable.js:920)
-- captures the field only where a row declares it, and the enrichment renders "(none recorded)"
-- otherwise (pattern:106 -- name the bug that returns if it is gone; here there is none).
--
-- `method` IS UNTOUCHED ON PURPOSE. It is where the citations actually survive. The DO block asserts
-- that it still carries the `Cite the [id: ...] value` instruction and that `max_tokens` is still
-- 3000, so a fix that quietly took the instruction or the cap with it is red here, not in production.
--
-- IDEMPOTENT BY CONSTRUCTION. The UPDATE's own WHERE carries
-- `(traits->'schema'->'properties') ? 'citations'`, so a second application matches 0 rows and
-- changes nothing; the DO block then asserts the END STATE (which a re-run still satisfies) rather
-- than a row count.

BEGIN;

-- The decision handle the before-image hangs from. Recorded against THIS cycle -- a handle on any
-- other cycle would not be reversible from here (the AGT-154 lesson).
CREATE TEMP TABLE seed_ctx ON COMMIT DROP AS
SELECT public.record_decision(
  '35d7f94d-2f0a-458f-8b9b-de71c13c0c4c'::uuid,
  NULL,
  'agent-row',
  'SCA-4',
  'Drop the citations output field from the library-catalog-intent Skill row; the inline [id: ...] values its method already requires are the citations.',
  'Measured live 2026-09-29: the row declared `citations` in BOTH traits.schema.required and traits.schema.properties, all 5 complete hops returned the array (23/22/4/6/2 ids), and ~20-26% of the post-cap outputs restated those same ids inline -- so the field bought a second copy of citations the method already requires in the prose. The truncation half of the premise is closed (max_tokens has been 3000 since HAR-9-done, 0 truncations since), so the duplicated output is the whole remaining cost. NO READER TAKES THE ARRAY BY NAME: the delegating hop receives the entire result as a tool_result and reads the inline [id: ...] values, the 389 store deliverables for this slug have no reader of .citations, and SELF_REPORTED_CLAIM_FIELDS captures the field only where a row declares it (the enrichment renders ''(none recorded)'' otherwise). The method is deliberately UNCHANGED -- it still requires the inline [id: ...] value of at least one representative entry per category, which is where the citations live after this change. AGENT-ROW-AGREED-TICKET second limb: SCA-4 is an agreed ticket with scope_origin NULL, so this Skill-row edit is build work carrying a before-image, not a gate card.'::text,
  NULL
) AS decision_id;

-- The REAL pre-image, captured before a single byte of the row changes.
INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
SELECT '35d7f94d-2f0a-458f-8b9b-de71c13c0c4c'::uuid, NULL, 'skill_profiles', s.id::text, to_jsonb(s.*),
       (SELECT decision_id FROM seed_ctx)
FROM public.skill_profiles s WHERE s.slug = 'library-catalog-intent';

-- The drop. The property leaves `schema.properties`, and `required` is rewritten to the one field
-- that remains. Both halves in one statement: a schema that still REQUIRED a property it no longer
-- declares would fail every validation instead of none.
UPDATE public.skill_profiles
   SET traits = jsonb_set(traits #- '{schema,properties,citations}',
                          '{schema,required}', '["answer"]'::jsonb)
 WHERE slug = 'library-catalog-intent'
   AND (traits->'schema'->'properties') ? 'citations';

DO $$
DECLARE
  dec uuid;
  cyc uuid;
  n   int;
BEGIN
  SELECT decision_id INTO dec FROM seed_ctx;
  -- Read back from the decision rather than re-typing the cycle literal: this asserts the image and
  -- the handle name the SAME cycle, which is the property that makes the reversal reachable.
  SELECT cycle_id INTO cyc FROM public.runner_decisions WHERE id = dec;
  IF cyc IS NULL THEN
    RAISE EXCEPTION 'the decision carries no cycle_id -- the reversal handle names nothing';
  END IF;

  -- 1-4. The END STATE of the one row: the property is gone, `required` is exactly ["answer"], and
  -- the two things this change must NOT touch are still there -- the inline-citation instruction in
  -- `method` and the 3000-token cap that closed the truncation half of the premise.
  SELECT count(*) INTO n FROM public.skill_profiles
   WHERE slug = 'library-catalog-intent'
     AND NOT ((traits->'schema'->'properties') ? 'citations')
     AND (traits->'schema'->'required') = '["answer"]'::jsonb
     AND method LIKE '%Cite the [id: ...] value%'
     AND max_tokens = 3000;
  IF n <> 1 THEN
    RAISE EXCEPTION 'library-catalog-intent rows in the required end state: % (expected 1)', n;
  END IF;

  -- 5. The reversal promise: exactly ONE before-image on this decision, on this cycle, and it
  -- carries the PRE state -- a `traits.schema.properties` that STILL has `citations`. An image taken
  -- after the UPDATE would restore the change instead of undoing it, and would pass every assertion
  -- above.
  SELECT count(*) INTO n FROM public.runner_before_images
   WHERE decision_id = dec
     AND cycle_id = cyc
     AND table_name = 'skill_profiles'
     AND row_data IS NOT NULL
     AND (row_data->'traits'->'schema'->'properties') ? 'citations';
  IF n <> 1 THEN
    RAISE EXCEPTION 'pre-UPDATE before-images on this decision: % (expected exactly 1)', n;
  END IF;

  SELECT count(*) INTO n FROM public.runner_before_images
   WHERE decision_id = dec;
  IF n <> 1 THEN
    RAISE EXCEPTION 'before-images on this decision: % (expected exactly 1)', n;
  END IF;

  SELECT count(*) INTO n FROM public.runner_before_images b
   WHERE b.decision_id = dec AND NOT (b.table_name = ANY (public.reversible_tables()));
  IF n <> 0 THEN
    RAISE EXCEPTION '% images name a table reverse_decision() cannot restore', n;
  END IF;
END $$;

COMMIT;
