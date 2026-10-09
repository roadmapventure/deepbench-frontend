-- DeepBench v7.0.793 | docs/design/agt-391-skill-rows.sql | AGT-391 -- selective regression: the Builder's
-- and the Verifier's Skill text names the related set.
--
-- Applied by the ATTENDED session after the build's push (the Builder writes no Skill row). Three rows,
-- one decision, one before-image per row, each UPDATE guarded on the text it replaces and refused unless
-- it touched exactly one row:
--   bd-guardrails     (guardrails) must[1]   the Builder keeps its related set green, not the full suite
--   bd-build-intent   (intent)     method    the Builder runs run-all.js --only=<the related set>
--   vf-knowledge-bar  (knowledge)  method    the Verifier's mechanical gate runs --only=<the related set>
-- Replace <decision id> with the id public.record_decision(...) returns for this write before running.
--
-- DOWN (comment only; restores each row's two edited columns from its before-image):
--   UPDATE public.skill_profiles sp
--      SET guardrails = bi.row_data->'guardrails', method = bi.row_data->>'method'
--     FROM public.runner_before_images bi
--    WHERE bi.decision_id = '<decision id>' AND bi.table_name = 'skill_profiles' AND bi.pk_value = sp.id::text;
--   or: select public.reverse_decision('<decision id>', '<who>', '<why>');

DO $$
DECLARE
  v_dec uuid := '<decision id>';
  n integer;
BEGIN
  -- (1) bd-guardrails: must[1]
  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  SELECT NULL, 'design-mcp-teach-1005', 'skill_profiles', sp.id::text, to_jsonb(sp), v_dec
    FROM public.skill_profiles sp WHERE sp.slug = 'bd-guardrails';
  UPDATE public.skill_profiles
     SET guardrails = jsonb_set(guardrails, '{must,1}',
           to_jsonb('keep build and the kickoff''s related test set green before every commit (node tests/regression/run-all.js --only=<the set>, re-measured from your diff with scripts/related-tests.js)'::text))
   WHERE slug = 'bd-guardrails'
     AND guardrails->'must'->>1 = 'keep build and regression green before every commit';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'AGT-391: bd-guardrails must[1] updated % rows, expected 1', n; END IF;

  -- (2) bd-build-intent: method
  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  SELECT NULL, 'design-mcp-teach-1005', 'skill_profiles', sp.id::text, to_jsonb(sp), v_dec
    FROM public.skill_profiles sp WHERE sp.slug = 'bd-build-intent';
  UPDATE public.skill_profiles
     SET method = replace(method, 'node tests/regression/run-all.js (creds',
           'node tests/regression/run-all.js --only=<the kickoff''s related set, re-measured from your diff with scripts/related-tests.js> (creds')
   WHERE slug = 'bd-build-intent'
     AND strpos(method, 'node tests/regression/run-all.js (creds') > 0;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'AGT-391: bd-build-intent method updated % rows, expected 1', n; END IF;

  -- (3) vf-knowledge-bar: method
  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  SELECT NULL, 'design-mcp-teach-1005', 'skill_profiles', sp.id::text, to_jsonb(sp), v_dec
    FROM public.skill_profiles sp WHERE sp.slug = 'vf-knowledge-bar';
  UPDATE public.skill_profiles
     SET method = replace(method, 'tests/regression/run-all.js, scripts/check-session-docs.js',
           'tests/regression/run-all.js --only=<the related set> (AGT-391: full suite weekly and before a release), scripts/check-session-docs.js')
   WHERE slug = 'vf-knowledge-bar'
     AND strpos(method, 'tests/regression/run-all.js, scripts/check-session-docs.js') > 0;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'AGT-391: vf-knowledge-bar method updated % rows, expected 1', n; END IF;
END $$;
