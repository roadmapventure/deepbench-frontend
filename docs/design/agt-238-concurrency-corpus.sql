-- DeepBench v7.0.667 | docs/design/agt-238-concurrency-corpus.sql | AGT-238 slice 2 -- migration
-- agt238_concurrency_corpus, mirrored byte-identical.
--
-- FEATURE: AGT-238 slice 2 item (d) -- CONCURRENCY FROM THE CORPUS.
--   D1 the corpus is ONE deterministic read, public.project_concurrency_corpus() -- no model call
--      computes the evidence (pattern:9).
--   D2 the count and the order ALREADY have a home: projects.status='executing' IS the count and
--      projects.priority IS the order. No new column, no max_concurrent knob (pattern:67, 17).
--   D3 the slice-1 boundary is STRUCTURAL, not prose: record_concurrency() RAISES on a `proposed` or
--      `planned` slug -- only executing<->paused moves. Starting a project stays John's words through
--      start_proposed_project() (AGT-240, pattern:10).
--   D4 the answer key mirrors `leverage`: optional, on the existing run-project turn.
--   D5 the new test's anon arm is notRun, never FAIL.
--   D6 the Builder ships the MECHANISM, not a real concurrency call -- the first `concurrency` row is
--      the next manager turn's.
--
-- Down captured FIRST by public.capture_migration_down('86e5a3bf-d279-418a-8d5f-d1ab53542810',
-- 'agt238_concurrency_corpus', <the 2 functions>) -- auto-downable, 2 captured, 0 refusals.
-- NOT in that down, by construction of the capture: the skill_profiles `dm-run-intent` row. The
-- capture has no `row` kind, it REFUSES an unknown kind, and ONE refusal nulls the WHOLE down_sql
-- (measured in capture_migration_down's own prosrc this session) -- so naming the row would have
-- destroyed the down for both functions. Its undo is slice 1's, unchanged:
--   reverse_decision(<the agent-row decision recorded in section (3) below>)
-- which restores the row from its before-image (skill_profiles is in reversible_tables()).
--
-- Governing: ARCHITECTURE.md §19v (before-image FIRST, then the write), §19b, §19d/§19e Rule #1,
-- §19k; .claude/rules/supabase-function-signature.md (one overload each, asserted below);
-- .claude/rules/supabase-column-grants.md (a NEW function is EXECUTE-to-PUBLIC by default: revoke
-- anon/authenticated BY NAME and assert BOTH directions).

-- ---------------------------------------------------------------------------------------------
-- (1) project_concurrency_corpus() -- the deterministic evidence the manager decides FROM.
--     LEFT JOIN twice, so a project with no epics shows epics=0 rather than vanishing: that is the
--     corpus's own first piece of evidence (trainer-authored-agents holds an executing slot with
--     nothing pickable). Column list copied verbatim from docs/harvests/AGT-238.md "Corpus columns".
--     done_7d / done_30d are the close rate: backlog_items has no closed-at column, so updated_at on
--     a `done` row is the honest proxy and is labelled as such wherever it is shown.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.project_concurrency_corpus()
 RETURNS TABLE(slug text, status text, priority integer, epics integer, locked integer,
               finished integer, open_tickets integer, partial_tickets integer, blocked integer,
               leverage_tickets integer, done_7d integer, done_30d integer, proposal_due boolean)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT p.slug,
         p.status,
         p.priority,
         count(distinct e.id)::int,
         count(distinct e.id) filter (where e.locked_at is not null)::int,
         count(distinct e.id) filter (where e.finished_at is not null)::int,
         count(b.id) filter (where b.status in ('open','partial','discovered'))::int,
         count(b.id) filter (where b.status = 'partial')::int,
         count(b.id) filter (where b.blocked_by is not null and b.status not in ('done','removed'))::int,
         count(b.id) filter (where b.leverage_reason is not null and b.status not in ('done','removed'))::int,
         count(b.id) filter (where b.status='done' and b.updated_at > now() - interval '7 days')::int,
         count(b.id) filter (where b.status='done' and b.updated_at > now() - interval '30 days')::int,
         p.status='executing' and bool_and(e.locked_at is not null) and bool_and(e.finished_at is null) and count(b.id) > 0 and count(b.id) filter (where b.status not in ('done','removed')) = 0
    FROM public.projects p
    LEFT JOIN public.epics e ON e.project_id = p.id
    LEFT JOIN public.backlog_items b ON b.epic_id = e.id
   GROUP BY p.slug, p.status, p.priority
   ORDER BY (p.status='executing') DESC, p.priority
$function$;

REVOKE ALL ON FUNCTION public.project_concurrency_corpus() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_concurrency_corpus() TO service_role;

-- ---------------------------------------------------------------------------------------------
-- (2) record_concurrency() -- the ONE writer of the concurrency decision, on record_leverage()'s
--     live shape: validate EVERYTHING first, then one decision, then per CHANGED row a
--     runner_before_images row THEN the UPDATE, so reverse_decision() puts every row back (§19v).
--     `updated_at = now()` is the decision's own transaction timestamp, which equals the decision's
--     decided_at and therefore can never trip reverse_decision()'s written-since guard (`>`).
--
--     THE SEVEN REFUSALS: a null cycle id; a blank `why`; an empty `execute`; an unknown slug; a
--     slug currently `proposed` or `planned` (message names AGT-240 -- D3); a slug in both lists;
--     `order` not exactly the `execute` set.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_concurrency(p_cycle_id uuid, p_plan jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_exec   text[];
  v_pause  text[];
  v_order  text[];
  v_why    text;
  v_slug   text;
  v_bad    text[];
  v_dec    uuid;
  v_row    public.projects%ROWTYPE;
  v_moved  integer := 0;
  i        integer;
BEGIN
  IF p_cycle_id IS NULL THEN
    RAISE EXCEPTION 'record_concurrency: p_cycle_id is required -- how many projects execute at once is a decision and a decision has exactly one author';
  END IF;
  IF p_plan IS NULL OR jsonb_typeof(p_plan) <> 'object' THEN
    RAISE EXCEPTION 'record_concurrency: p_plan must be a JSON object {execute, pause, order, why}';
  END IF;
  FOREACH v_slug IN ARRAY ARRAY['execute', 'pause', 'order'] LOOP
    IF p_plan ? v_slug AND jsonb_typeof(p_plan -> v_slug) <> 'array' THEN
      RAISE EXCEPTION 'record_concurrency: "%" must be a JSON array of project slugs (got %)', v_slug, jsonb_typeof(p_plan -> v_slug);
    END IF;
  END LOOP;

  v_why   := btrim(COALESCE(p_plan ->> 'why', ''));
  v_exec  := COALESCE(ARRAY(SELECT btrim(x.value #>> '{}') FROM jsonb_array_elements(COALESCE(p_plan -> 'execute', '[]'::jsonb)) WITH ORDINALITY x(value, ord) ORDER BY x.ord), ARRAY[]::text[]);
  v_pause := COALESCE(ARRAY(SELECT btrim(x.value #>> '{}') FROM jsonb_array_elements(COALESCE(p_plan -> 'pause',   '[]'::jsonb)) WITH ORDINALITY x(value, ord) ORDER BY x.ord), ARRAY[]::text[]);
  v_order := COALESCE(ARRAY(SELECT btrim(x.value #>> '{}') FROM jsonb_array_elements(COALESCE(p_plan -> 'order',   '[]'::jsonb)) WITH ORDINALITY x(value, ord) ORDER BY x.ord), ARRAY[]::text[]);

  -- (ii) a blank `why`: the corpus is the evidence, and a decision from it says what in it decided.
  IF v_why = '' THEN
    RAISE EXCEPTION 'record_concurrency: "why" is blank -- a concurrency decision says what in the corpus decided it (tickets left, blocked counts, leverage marks, close rate, the walls)';
  END IF;
  -- (iii) an empty `execute`: a board with nothing executing is not a concurrency decision.
  IF array_length(v_exec, 1) IS NULL THEN
    RAISE EXCEPTION 'record_concurrency: "execute" is empty -- a concurrency decision names the projects that RUN, and a board with nothing executing stops the runner';
  END IF;
  -- (iv) an unknown slug, and (v) a slug that is not the manager's to start (D3 / AGT-240).
  FOREACH v_slug IN ARRAY (v_exec || v_pause) LOOP
    SELECT * INTO v_row FROM public.projects p WHERE p.slug = v_slug;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'record_concurrency: "%" is not a projects.slug -- concurrency is decided over the board the corpus returned', v_slug;
    END IF;
    IF v_row.status IN ('proposed', 'planned') THEN
      RAISE EXCEPTION 'record_concurrency: "%" is % -- starting a project that has never run is not the manager''s call, it is John''s words through start_proposed_project() (AGT-240). This function moves executing <-> paused only', v_slug, v_row.status;
    END IF;
  END LOOP;
  -- (vi) a slug in both lists: run it or pause it, never both.
  SELECT array_agg(s) INTO v_bad FROM (SELECT unnest(v_exec) AS s INTERSECT SELECT unnest(v_pause)) d;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'record_concurrency: % is in both "execute" and "pause" -- a project runs or it is paused, never both', array_to_string(v_bad, ', ');
  END IF;
  -- (vii) `order` must name exactly the `execute` set: the order IS projects.priority, so an order
  --       that is not the executing set would leave a priority nobody decided.
  IF array_length(v_order, 1) IS DISTINCT FROM array_length(v_exec, 1)
     OR EXISTS (SELECT 1 FROM (SELECT unnest(v_order) AS s EXCEPT SELECT unnest(v_exec)) d)
     OR EXISTS (SELECT 1 FROM (SELECT unnest(v_exec) AS s EXCEPT SELECT unnest(v_order)) d)
     OR (SELECT count(DISTINCT s) FROM unnest(v_order) s) <> array_length(v_order, 1) THEN
    RAISE EXCEPTION 'record_concurrency: "order" (%) must name exactly the projects in "execute" (%), once each -- the order IS projects.priority', array_to_string(v_order, ', '), array_to_string(v_exec, ', ');
  END IF;

  v_dec := public.record_decision(p_cycle_id, NULL, 'concurrency', NULL,
    'AGT-238 concurrency from the corpus: ' || array_length(v_exec, 1)::text || ' project(s) executing in the order '
      || array_to_string(v_order, ', ')
      || CASE WHEN array_length(v_pause, 1) IS NULL THEN '' ELSE ', pausing ' || array_to_string(v_pause, ', ') END,
    v_why);

  -- The order first: priority is the ordinal in `order`. A row already where the decision wants it
  -- is NOT a changed row and gets no image and no write.
  FOR i IN 1 .. array_length(v_order, 1) LOOP
    SELECT * INTO v_row FROM public.projects p WHERE p.slug = v_order[i] FOR UPDATE;
    IF v_row.status IS DISTINCT FROM 'executing' OR v_row.priority IS DISTINCT FROM i THEN
      INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data, decision_id)
      VALUES (p_cycle_id, 'projects', v_row.id::text, to_jsonb(v_row), v_dec);
      UPDATE public.projects
         SET status = 'executing', priority = i, updated_at = now(),
             updated_by = 'record_concurrency (AGT-238)'
       WHERE id = v_row.id;
      v_moved := v_moved + 1;
    END IF;
  END LOOP;

  FOREACH v_slug IN ARRAY v_pause LOOP
    SELECT * INTO v_row FROM public.projects p WHERE p.slug = v_slug FOR UPDATE;
    IF v_row.status IS DISTINCT FROM 'paused' THEN
      INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data, decision_id)
      VALUES (p_cycle_id, 'projects', v_row.id::text, to_jsonb(v_row), v_dec);
      UPDATE public.projects
         SET status = 'paused', updated_at = now(),
             updated_by = 'record_concurrency (AGT-238)'
       WHERE id = v_row.id;
      v_moved := v_moved + 1;
    END IF;
  END LOOP;

  RETURN v_dec;
END
$function$;

REVOKE ALL ON FUNCTION public.record_concurrency(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_concurrency(uuid, jsonb) TO service_role;

-- ---------------------------------------------------------------------------------------------
-- (3) dm-run-intent (type INTENT: it owns the run-project answer contract, which is exactly what
--     gains the key) learns the optional `concurrency` key and John's paragraph.
--     AGENT-ROW-AGREED-TICKET: one decision, one before-image, then the write.
--     The paragraph goes immediately BEFORE the chain rule, which stays the LAST paragraph
--     (ses-378d / agt-132 pin that position byte-for-byte).
-- ---------------------------------------------------------------------------------------------
DO $skill$
DECLARE
  v_row   public.skill_profiles%ROWTYPE;
  v_dec   uuid;
  v_paras text[];
  v_n     integer;
  c_para  constant text := 'CONCURRENCY FROM THE CORPUS (John 2026-09-27): how many projects execute at once, and in what order, is yours to decide from `concurrency_corpus` — tickets left, blocked counts, leverage marks, close rate and the capacity the walls report — not from a fixed rule. Put the decision in `concurrency` as `{execute, pause, order, why}`; `order` must name exactly the projects in `execute`, and `why` must say what in the corpus decided it. Starting a `proposed` project is not yours: that stays John''s words through `start_proposed_project()`.';
BEGIN
  SELECT * INTO v_row FROM public.skill_profiles WHERE slug = 'dm-run-intent' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'AGT-238: no skill_profiles row dm-run-intent'; END IF;
  IF position(c_para IN v_row.method) > 0 THEN RETURN; END IF;

  v_dec := public.record_decision('86e5a3bf-d279-418a-8d5f-d1ab53542810'::uuid, NULL, 'agent-row', 'AGT-238',
    'AGT-238 slice 2: dm-run-intent gains the optional concurrency answer key and the CONCURRENCY FROM THE CORPUS paragraph',
    'Kickoff v7.0.667 §4. Intent type because it owns the run-project answer contract; the paragraph sits before the chain rule so that rule stays last (ses-378d).');
  INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data, decision_id)
  VALUES ('86e5a3bf-d279-418a-8d5f-d1ab53542810'::uuid, 'skill_profiles', v_row.id::text, to_jsonb(v_row), v_dec);

  v_paras := string_to_array(v_row.method, E'\n\n');
  v_n := array_length(v_paras, 1);
  UPDATE public.skill_profiles
     SET method = array_to_string(v_paras[1:v_n - 1] || c_para || v_paras[v_n:v_n], E'\n\n'),
         traits = jsonb_set(v_row.traits, '{schema,properties,concurrency}',
           '{"type":"object","description":"AGT-238: how many projects execute at once and in what order, decided from the corpus. Optional. `order` names exactly the projects in `execute`.","required":["execute","order","why"],"properties":{"execute":{"type":"array","items":{"type":"string"}},"pause":{"type":"array","items":{"type":"string"}},"order":{"type":"array","items":{"type":"string"}},"why":{"type":"string"}}}'::jsonb)
   WHERE id = v_row.id;
END
$skill$;

-- ---------------------------------------------------------------------------------------------
-- (4) THE GATE. Assert both directions and PROBE the mechanism; a failure here rolls the whole
--     migration back. Each probe runs in its own nested BEGIN…EXCEPTION and ends on a caught
--     sentinel, so every probe write is rolled back with the subtransaction.
--     On origin/dev both probes fail at 42883 -- neither function exists.
-- ---------------------------------------------------------------------------------------------
DO $assert$
DECLARE
  f        text;
  r        text;
  n        integer;
  v_err    text;
  v_dec    uuid;
  v_status text;
  v_img    integer;
  v_cnt    integer;
  v_epics  integer;
  v_rev    text;
  c_cycle  constant uuid := '86e5a3bf-d279-418a-8d5f-d1ab53542810'::uuid;
BEGIN
  -- one overload each (.claude/rules/supabase-function-signature.md)
  FOREACH f IN ARRAY ARRAY['project_concurrency_corpus', 'record_concurrency'] LOOP
    SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.proname = f;
    IF n <> 1 THEN
      RAISE EXCEPTION 'AGT-238: public.% has % overloads, expected 1 (.claude/rules/supabase-function-signature.md)', f, n;
    END IF;
  END LOOP;

  -- both grant directions (.claude/rules/supabase-column-grants.md: a new function is open by default)
  FOREACH f IN ARRAY ARRAY['public.project_concurrency_corpus()', 'public.record_concurrency(uuid, jsonb)'] LOOP
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_function_privilege(r, f, 'EXECUTE') THEN
        RAISE EXCEPTION 'AGT-238: % can still EXECUTE %', r, f;
      END IF;
    END LOOP;
    IF NOT has_function_privilege('service_role', f, 'EXECUTE') THEN
      RAISE EXCEPTION 'AGT-238: service_role cannot EXECUTE %', f;
    END IF;
  END LOOP;

  -- the corpus is one row per project, and an epic-less project is IN it (the LEFT JOIN)
  SELECT count(*) INTO n FROM public.project_concurrency_corpus();
  SELECT count(*) INTO v_cnt FROM public.projects;
  IF n <> v_cnt THEN
    RAISE EXCEPTION 'AGT-238: project_concurrency_corpus() returned % row(s) for % project(s) -- the LEFT JOINs are dropping a project', n, v_cnt;
  END IF;
  SELECT c.epics INTO v_epics FROM public.project_concurrency_corpus() c WHERE c.slug = 'trainer-authored-agents';
  IF v_epics IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'AGT-238: trainer-authored-agents reads epics=% in the corpus, expected 0 -- an epic-less executing project must show itself, not vanish', COALESCE(v_epics::text, 'NULL');
  END IF;

  -- PROBE 1 (discriminating): the mechanism end to end -- one decision, one before-image per CHANGED
  -- row, the row moved, and reverse_decision() putting it back. Rolled back by the sentinel.
  BEGIN
    v_dec := public.record_concurrency(c_cycle, jsonb_build_object(
      'execute', jsonb_build_array('auditor-enhancements', 'dev-manager-capabilities', 'agent-training', 'mcp-poc'),
      'pause',   jsonb_build_array('trainer-authored-agents'),
      'order',   jsonb_build_array('auditor-enhancements', 'dev-manager-capabilities', 'agent-training', 'mcp-poc'),
      'why',     'AGT-238 in-migration probe -- rolled back. trainer-authored-agents holds an executing slot with 0 epics, so epic_project_executing() admits nothing from it.'));

    SELECT count(*) INTO n FROM public.runner_decisions d WHERE d.id = v_dec AND d.kind = 'concurrency';
    IF n <> 1 THEN RAISE EXCEPTION 'AGT-238: probe 1 -- the call did not record exactly one kind=concurrency decision'; END IF;

    SELECT count(*) INTO v_img FROM public.runner_before_images bi
      JOIN public.projects p ON p.id::text = bi.pk_value
     WHERE bi.decision_id = v_dec AND bi.table_name = 'projects'
       AND p.slug = 'trainer-authored-agents' AND bi.row_data ->> 'status' = 'executing';
    IF v_img <> 1 THEN
      RAISE EXCEPTION 'AGT-238: probe 1 -- % before-image(s) for trainer-authored-agents carrying row_data->>status = executing, expected 1 (§19v: the image comes FIRST)', v_img;
    END IF;

    SELECT p.status INTO v_status FROM public.projects p WHERE p.slug = 'trainer-authored-agents';
    IF v_status <> 'paused' THEN RAISE EXCEPTION 'AGT-238: probe 1 -- trainer-authored-agents is % after the pause, expected paused', v_status; END IF;

    SELECT x.outcome INTO v_rev FROM public.reverse_decision(v_dec, 'agt-238-probe', 'AGT-238 in-migration probe -- rolled back') x;
    SELECT p.status INTO v_status FROM public.projects p WHERE p.slug = 'trainer-authored-agents';
    IF v_status <> 'executing' THEN
      RAISE EXCEPTION 'AGT-238: probe 1 -- reverse_decision() returned "%" and trainer-authored-agents is % , expected executing restored', v_rev, v_status;
    END IF;
    RAISE EXCEPTION 'agt238-probe-1-ok';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err <> 'agt238-probe-1-ok' THEN RAISE EXCEPTION '%', v_err; END IF;
  END;
  RAISE NOTICE 'AGT-238 probe 1: record_concurrency() recorded one kind=concurrency decision, imaged trainer-authored-agents at status=executing, paused it, and reverse_decision() restored executing -- all rolled back.';

  -- PROBE 2 (discriminating): a `planned` slug must RAISE, naming AGT-240 (D3). `moat` is planned.
  BEGIN
    PERFORM public.record_concurrency(c_cycle, jsonb_build_object(
      'execute', jsonb_build_array('moat'),
      'pause',   jsonb_build_array(),
      'order',   jsonb_build_array('moat'),
      'why',     'AGT-238 in-migration probe -- this must be refused.'));
    RAISE EXCEPTION 'AGT-238: probe 2 -- record_concurrency() ACCEPTED the planned slug "moat"; starting a project that never ran is John''s, not the manager''s (AGT-240)';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err NOT LIKE '%AGT-240%' OR v_err LIKE '%ACCEPTED%' THEN RAISE EXCEPTION '%', v_err; END IF;
    RAISE NOTICE 'AGT-238 probe 2: record_concurrency() refused the planned slug "moat" -- %', v_err;
  END;
END
$assert$;
