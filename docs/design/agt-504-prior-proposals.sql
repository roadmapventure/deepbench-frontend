-- AGT-504 — the research turn reads its lane's prior proposals. The two Skill-row edits that tell
-- The Researcher what `task_context.prior_proposals` is and what to do with it. Applied by the
-- runner cycle 0d175c9e-5903-4622-99f6-65ca6ab9aca2 at v7.0.899
-- (docs/kickoffs/v7.0.899-AGT-504-prior-proposals.md). This file is the MIRROR of what was applied,
-- byte-identical, not a substitute for applying it.
--
-- WHY THE FIX IS SKILL-ROW TEXT AND NOT HARNESS CODE. `scripts/agent-prompt.js` now carries the rows
-- into the task_context (AGT-504's T1), but carrying them is not the same as the agent USING them: a
-- key the Intent never names is a key the model may read past. The behaviour — drop a candidate that
-- matches a prior proposal, and name that row's `filed_backlog_id` — is the agent's own behaviour, so
-- it lands in the agent's own Skill content (pattern:7) at the narrowest layer that actually works
-- (pattern:8): two UPDATEs on existing rows, zero new structure (pattern:17). Both Skills keep their
-- types — `rs-research-intent` is the intent Skill, which is where the task shape is described, and
-- `rs-guardrails` is the guardrails Skill, which is where a standing prohibition belongs (pattern:136).
--
-- THE `proposal` FILTER IS THE WHOLE FILTER, which is John's spec taken literally (pattern:90).
-- `audit_findings` also holds 14 `defect`/`gap` rows for this lane; they are a different
-- conversation and neither the flag nor this text carries them.
--
-- REVERSIBLE BY CONSTRUCTION, AND THE BEFORE-IMAGE IS THE WHOLE PRE-ROW. These are UPDATEs, not
-- INSERTs, so `row_data` is `to_jsonb(s)` of the row as it stood — the only form from which the prior
-- text can be restored — filed against the APPLYING cycle, because an image on any other cycle is
-- unreversible from here. `skill_profiles` is keyed by an `id uuid`, so both promises are keepable
-- (pattern:169).
--
-- NOTHING BELOW TRUSTS THE SUCCESS FLAG (.claude/rules/supabase-column-grants.md's own lesson, in
-- the general form): each UPDATE is GUARDED so a re-run is a no-op, each is asserted to have touched
-- EXACTLY ONE row, and both edits are then read back and asserted present — the method by its
-- ending, the guardrail by `must_not ? <text>` and by the array's new length. An UPDATE that touched
-- ≠ 1 row raises and the whole DO block rolls back (the kickoff's §7 STOP line).

DO $$
DECLARE
  v_cycle uuid := '0d175c9e-5903-4622-99f6-65ca6ab9aca2';
  c_method text := $t$ It may also carry prior_proposals: this lane's earlier audit_findings proposals, each with status and filed_backlog_id. A candidate matching a prior_proposals row is already on the board: drop it from survivors and name that row's filed_backlog_id in findings.$t$;
  c_must_not text := $t$return a survivor matching a prior_proposals row — drop it and name its filed_backlog_id$t$;
  n int;
  m text;
  g jsonb;
BEGIN
  -- Both before-images FIRST, one per row, captured before either UPDATE runs.
  INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
  SELECT v_cycle, 'skill_profiles', s.id::text, to_jsonb(s)
    FROM public.skill_profiles s
   WHERE s.slug IN ('rs-research-intent', 'rs-guardrails');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN
    RAISE EXCEPTION 'before-images written: % (expected 2 — one per edited skill_profiles row)', n;
  END IF;

  -- (1) The intent Skill's method gains the sentence that names the key and its two uses.
  UPDATE public.skill_profiles
     SET method = method || c_method
   WHERE slug = 'rs-research-intent'
     AND method NOT LIKE '%prior_proposals%';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'rs-research-intent.method UPDATE touched % row(s) (expected exactly 1)', n;
  END IF;

  -- (2) The guardrails Skill's must_not gains the standing prohibition.
  UPDATE public.skill_profiles
     SET guardrails = jsonb_set(guardrails, '{must_not}',
                                (guardrails -> 'must_not') || to_jsonb(c_must_not))
   WHERE slug = 'rs-guardrails'
     AND NOT (guardrails -> 'must_not' ? c_must_not);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'rs-guardrails.must_not UPDATE touched % row(s) (expected exactly 1)', n;
  END IF;

  -- Read back and assert, rather than reporting success.
  SELECT method INTO m FROM public.skill_profiles WHERE slug = 'rs-research-intent';
  IF m IS NULL OR right(m, length(c_method)) <> c_method THEN
    RAISE EXCEPTION 'rs-research-intent.method does not END with the AGT-504 sentence';
  END IF;

  SELECT guardrails INTO g FROM public.skill_profiles WHERE slug = 'rs-guardrails';
  IF NOT (g -> 'must_not' ? c_must_not) THEN
    RAISE EXCEPTION 'rs-guardrails.must_not is missing the AGT-504 item';
  END IF;
  IF jsonb_array_length(g -> 'must_not') <> 6 THEN
    RAISE EXCEPTION 'rs-guardrails.must_not holds % item(s) (expected 6 — 5 before this)',
      jsonb_array_length(g -> 'must_not');
  END IF;

  RAISE NOTICE 'AGT-504: both Skill rows edited, 2 before-images on cycle % — reversible from row_data', v_cycle;
END $$;
