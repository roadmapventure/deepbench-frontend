-- DeepBench v7.0.691 | docs/design/agt-155-competitors-intent-leads.sql | AGT-155 remainder -- THE
-- LEADS INSTRUCTION REACHES THE RENDER. The Wednesday routine's prompt cannot be updated by an agent
-- (update_trigger refuses every routine of this account: SES-140, AGT-145, AGT-155 -- the paste is
-- John's act), so the review instruction goes where the render actually reads it: the
-- `nl-competitors-intent` Skill row. assemblePrompt() renders that row on every --render, scheduled
-- or attended, so the leads the pmm-competitors render already carries finally arrive with an
-- instruction attached (pattern:7 -- fix agent behavior in the agent's own Skill content, not the
-- harness loop; pattern:8 -- the narrowest layer that actually works).
--
-- THIS FILE IS A MIRROR, NOT THE SOURCE. It is the text of migration
-- `agt155_competitors_intent_leads` exactly as applied by cycle
-- 5a3d7118-5c66-4e3e-bbd3-57b7917c612d, kept in the repo so the appended instruction is reviewable
-- without a database round-trip (the arrangement of docs/design/agt-173-pick-exclusions.sql).
--
-- NO DDL. Not one object is created, dropped or altered -- this is a single-row UPDATE of content,
-- so capture_migration_down() has nothing to classify and is deliberately NOT called
-- (docs/runbooks/runner-cycle.md step 6 asks for it before DDL). The reversal handle is the
-- before-image: record_decision() opens an 'agent-row' handle, and the row's full pre-UPDATE image
-- is filed against it BEFORE a byte changes, so reverse_decision() restores the previous `method`
-- and `traits` byte-for-byte. `skill_profiles` is in reversible_tables() and is keyed by an
-- `id uuid`, so the promise is keepable (pattern:169).
--
-- AGENT-ROW-AGREED-TICKET: AGT-155 is an agreed ticket, so its Skill edit is build work with a
-- before-image, not a gate card.
--
-- IDEMPOTENT BY CONSTRUCTION. The UPDATE's own WHERE carries `method NOT LIKE '%lead_reviews%'`, so
-- a second application matches 0 rows and appends nothing; the DO block then asserts the END STATE
-- (which a re-run still satisfies) rather than a row count.
--
-- RULE #1 (§19d/§19e) holds: the appended text names a TABLE the product lane reads
-- (public.market_leads) and never another agent, nor another agent's private store. The DO block's
-- single NOT ILIKE line below is the guard that proves it -- it is a prohibition, never a write.

BEGIN;

-- The decision handle the before-image hangs from. Recorded against THIS cycle -- a handle on any
-- other cycle would not be reversible from here (the AGT-154 lesson).
CREATE TEMP TABLE seed_ctx ON COMMIT DROP AS
SELECT public.record_decision(
  '5a3d7118-5c66-4e3e-bbd3-57b7917c612d'::uuid,
  NULL,
  'agent-row',
  'AGT-155',
  'Append the COMPETITOR LEADS review instruction and the lead_reviews output property to the nl-competitors-intent Skill row, so every pmm-competitors render carries the instruction for the leads it already carries.',
  'AGT-155 shipped the leads inbox and the render that carries it, but the only instruction to review a lead lived in the Wednesday routine prompt -- which update_trigger refuses an agent on this account (SES-140, AGT-145), so the live routine still runs the 2026-09-25 text and the render reached a sub-agent with leads and no instruction (0 lead_reviews live). The Skill row is the narrowest layer that actually works: assemblePrompt() renders it on every --render, attended or scheduled, so the instruction arrives whether or not John has pasted the block (pattern:7, pattern:8). lead_reviews stays OPTIONAL -- it is added to schema.properties and deliberately NOT to schema.required, because every capability that reads no leads, and every answer written before AGT-155, must stay valid (the validator already treats it as optional). The public_url of a lead is the one job posting this agent may read, for that lead only (designer''s call JOHN-0925-DESIGNER-DECIDES iv).'::text,
  NULL
) AS decision_id;

-- The REAL pre-image, captured before a single byte of the row changes.
INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
SELECT '5a3d7118-5c66-4e3e-bbd3-57b7917c612d'::uuid, NULL, 'skill_profiles', s.id::text, to_jsonb(s.*),
       (SELECT decision_id FROM seed_ctx)
FROM public.skill_profiles s WHERE s.slug = 'nl-competitors-intent';

-- The append. `method` gains the instruction; `traits.schema.properties` gains the output property.
UPDATE public.skill_profiles
   SET method = method || ' COMPETITOR LEADS: task_context.leads holds status-new rows of public.market_leads filed by another lane. Treat each as a LEAD, never a fact: read its public_url (the one job posting you may read, as that lead''s source only) and the company''s site, then return one lead_reviews item per lead, {id, status: confirmed | rejected, note}, the note (<= 400 characters) naming the source read. A confirmed lead needs a competitor record in records_to_write citing that source. No leads: lead_reviews: [].',
       traits = jsonb_set(traits, '{schema,properties,lead_reviews}',
         '{"type":"array","items":{"type":"object","required":["id","status","note"],"properties":{"id":{"type":"string"},"status":{"type":"string","enum":["confirmed","rejected"]},"note":{"type":"string","maxLength":400}}}}'::jsonb)
 WHERE slug = 'nl-competitors-intent'
   AND method NOT LIKE '%lead_reviews%';

DO $$
DECLARE
  dec uuid;
  n   int;
BEGIN
  SELECT decision_id INTO dec FROM seed_ctx;

  -- 1-4. The END STATE of the one row: the instruction is in the method, the property is in the
  -- schema, `required` does NOT list it (lead_reviews is optional by design), and the row names no
  -- other agent's private store.
  SELECT count(*) INTO n FROM public.skill_profiles
   WHERE slug = 'nl-competitors-intent'
     AND method LIKE '%lead_reviews%'
     AND (traits->'schema'->'properties') ? 'lead_reviews'
     AND NOT ((traits->'schema'->'required') @> '["lead_reviews"]'::jsonb)
     AND method NOT ILIKE '%career_records%';
  IF n <> 1 THEN
    RAISE EXCEPTION 'nl-competitors-intent rows in the required end state: % (expected 1)', n;
  END IF;

  -- 5. The reversal promise: exactly ONE before-image on this decision, and it carries the PRE
  -- state -- a `method` without the instruction. An image taken after the UPDATE would restore the
  -- change instead of undoing it, and would pass every assertion above.
  SELECT count(*) INTO n FROM public.runner_before_images
   WHERE decision_id = dec
     AND cycle_id = '5a3d7118-5c66-4e3e-bbd3-57b7917c612d'::uuid
     AND table_name = 'skill_profiles'
     AND row_data IS NOT NULL
     AND row_data->>'method' NOT LIKE '%lead_reviews%';
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
