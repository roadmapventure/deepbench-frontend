-- DeepBench v7.0.710 | docs/design/agt-155-alerts-intent-lead-fields.sql | AGT-155 remainder -- THE
-- TWO LEAD FACTS REACH THE PRODUCER. v7.0.683 shipped the shared leads inbox and v7.0.691 gave the
-- reviewing lane its instruction, but the PRODUCING side was never asked for the two facts a filed
-- lead needs. Live at 726781a3 the career-linkedin-alerts render (1,535,220 bytes) named
-- `what_they_sell` 0 times and `competitor_why` once -- the schema property only, never the method
-- -- so an answer marking a job `competitor: true` arrived without the field the validator demands,
-- --write exited 2, and NOTHING was written: not the records, not the lead. The ask goes where the
-- render actually reads it: the `jm-linkedin-alerts-intent` Skill row, which assemblePrompt()
-- renders on every --render, scheduled or attended (pattern:7 -- fix agent behavior in the agent's
-- own Skill content, not the harness loop; pattern:8 -- the narrowest layer that actually works).
-- No code default and no routine prompt: designer's call JOHN-0925-DESIGNER-DECIDES (i).
--
-- THIS FILE IS A MIRROR, NOT THE SOURCE. It is the text of migration
-- `agt155_alerts_intent_lead_fields` exactly as applied by cycle
-- 57c73a47-5e89-41fa-8ce9-6cd86c91b10d, kept in the repo so the changed instruction is reviewable
-- without a database round-trip (the arrangement of docs/design/agt-155-competitors-intent-leads.sql).
--
-- NO DDL. Not one object is created, dropped or altered -- this is a single-row UPDATE of content,
-- so capture_migration_down() has nothing to classify and is deliberately NOT called
-- (docs/runbooks/runner-cycle.md step 6 asks for it before DDL). The reversal handle is the
-- before-image: record_decision() opens an 'agent-row' handle, and the row's full pre-UPDATE image
-- is filed against it BEFORE a byte changes, so reverse_decision() restores the previous `method`
-- and `traits` byte-for-byte. `skill_profiles` is in reversible_tables() and is keyed by an
-- `id uuid`, so the promise is keepable (pattern:169).
--
-- CONDITIONALLY REQUIRED, NEVER FLAT. The two facts join the job item's `allOf` / `if`-`then`, never
-- its flat `required` -- which keeps its 12 keys untouched. A flat entry would refuse every job that
-- is not a competitor, which is nearly all of them (designer's calls ii and iii).
--
-- AGENT-ROW-AGREED-TICKET: AGT-155 is an agreed ticket, so its Skill edit is build work with a
-- before-image, not a gate card.
--
-- IDEMPOTENT BY CONSTRUCTION. The UPDATE's own WHERE carries `method NOT LIKE '%competitor_why%'`,
-- so a second application matches 0 rows and changes nothing; the DO block then asserts the END
-- STATE (which a re-run still satisfies) rather than a row count.
--
-- RULE #1 (§19d/§19e) holds: the replaced text names two FIELDS of this agent's own answer and
-- never another agent, nor another agent's private store. The DO block's single NOT ILIKE line
-- below is the guard that proves it -- it is a prohibition, never a write.

BEGIN;

-- The decision handle the before-image hangs from. Recorded against THIS cycle -- a handle on any
-- other cycle would not be reversible from here (the AGT-154 lesson).
CREATE TEMP TABLE seed_ctx ON COMMIT DROP AS
SELECT public.record_decision(
  '57c73a47-5e89-41fa-8ce9-6cd86c91b10d'::uuid,
  NULL,
  'agent-row',
  'AGT-155',
  'Name the two lead facts, competitor_why and what_they_sell, in the jm-linkedin-alerts-intent Skill row -- in the method and, conditionally on competitor being true, in the job item schema -- so the career-linkedin-alerts render asks for what a filed lead requires.',
  'AGT-155 shipped the shared leads inbox and the instruction that reviews a lead, but the producing side was never asked for the facts a lead carries. Live at 726781a3 the career-linkedin-alerts render named what_they_sell 0 times and competitor_why once (the schema property, never the method), so a job marked competitor arrived with neither fact: validateLeads refused the answer whole, --write exited 2, and nothing was stored -- 0 rows filed and 0 turns logged for this capability. The Skill row is the narrowest layer that actually works, because assemblePrompt() renders it on every --render, attended or scheduled, and the Wednesday routine prompt cannot be edited by an agent on this account (SES-140, AGT-145 -- the paste stays John''s act). The two facts are required CONDITIONALLY, through allOf / if-then on the job item, and never through its flat required list, which keeps all 12 of its keys: a flat entry would refuse every job that is not a competitor, which is nearly all of them (designer''s calls JOHN-0925-DESIGNER-DECIDES i, ii, iii). The dated AGT-154 seed is deliberately not edited; this change gets its own mirror (call iv).'::text,
  NULL
) AS decision_id;

-- The REAL pre-image, captured before a single byte of the row changes.
INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
SELECT '57c73a47-5e89-41fa-8ce9-6cd86c91b10d'::uuid, NULL, 'skill_profiles', s.id::text, to_jsonb(s.*),
       (SELECT decision_id FROM seed_ctx)
FROM public.skill_profiles s WHERE s.slug = 'jm-linkedin-alerts-intent';

-- The edit. `method` names both facts where the COMPETITOR sentence already stood; the job item's
-- schema gains the what_they_sell property and the conditional rule that requires the pair.
UPDATE public.skill_profiles
   SET method = replace(method,
         'give the public fact that says so; never send anything',
         'put that public fact in competitor_why (<= 300 chars) and what the company sells in what_they_sell (<= 200 chars) -- both REQUIRED when competitor is true; an answer marking a job competitor without competitor_why is refused whole; never send anything'),
       traits = jsonb_set(
         jsonb_set(traits, '{schema,properties,jobs,items,properties,what_they_sell}',
           '{"type":"string","maxLength":200}'::jsonb),
         '{schema,properties,jobs,items,allOf}',
         '[{"if":{"properties":{"competitor":{"const":true}},"required":["competitor"]},"then":{"required":["competitor_why","what_they_sell"]}}]'::jsonb)
 WHERE slug = 'jm-linkedin-alerts-intent'
   AND method NOT LIKE '%competitor_why%';

DO $$
DECLARE
  dec uuid;
  n   int;
BEGIN
  SELECT decision_id INTO dec FROM seed_ctx;

  -- 1. The END STATE of the one row: both facts are named in the method, what_they_sell is a
  -- property of the job item, the conditional rule is present, the flat `required` does NOT list
  -- competitor_why (a flat entry would refuse every non-competitor job), and the row names no other
  -- agent and no other agent's private store.
  SELECT count(*) INTO n FROM public.skill_profiles
   WHERE slug = 'jm-linkedin-alerts-intent'
     AND method LIKE '%competitor_why%'
     AND method LIKE '%what_they_sell%'
     AND (traits->'schema'->'properties'->'jobs'->'items'->'properties') ? 'what_they_sell'
     AND (traits->'schema'->'properties'->'jobs'->'items') ? 'allOf'
     AND NOT ((traits->'schema'->'properties'->'jobs'->'items'->'required') @> '["competitor_why"]'::jsonb)
     AND method NOT ILIKE '%nathan%' AND method NOT ILIKE '%market_leads%';
  IF n <> 1 THEN
    RAISE EXCEPTION 'jm-linkedin-alerts-intent rows in the required end state: % (expected 1)', n;
  END IF;

  -- 2. The reversal promise: exactly ONE before-image on this decision, and it carries the PRE
  -- state -- a `method` naming neither fact. An image taken after the UPDATE would restore the
  -- change instead of undoing it, and would pass every assertion above.
  SELECT count(*) INTO n FROM public.runner_before_images
   WHERE decision_id = dec
     AND cycle_id = '57c73a47-5e89-41fa-8ce9-6cd86c91b10d'::uuid
     AND table_name = 'skill_profiles'
     AND row_data IS NOT NULL
     AND row_data->>'method' NOT LIKE '%competitor_why%';
  IF n <> 1 THEN
    RAISE EXCEPTION 'pre-UPDATE before-images on this decision: % (expected exactly 1)', n;
  END IF;

  -- 3. Nothing was filed that reverse_decision() cannot restore.
  SELECT count(*) INTO n FROM public.runner_before_images b
   WHERE b.decision_id = dec AND NOT (b.table_name = ANY (public.reversible_tables()));
  IF n <> 0 THEN
    RAISE EXCEPTION '% images name a table reverse_decision() cannot restore', n;
  END IF;
END $$;

COMMIT;
