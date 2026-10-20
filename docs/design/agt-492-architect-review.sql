-- Repo record of the migration `agt492_architect_review` (AGT-492, v7.0.869, cycle 07f96d2b-29ca-4c00-ad13-f2751aae96f4).
-- What: the `review-audit-worklist` capability moves from the Development Manager (GV-01) to the Governance
-- Architect (GV-09), and the findings review gains John's tested step (decisions 27-29 of
-- docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md, 2026-10-13). Five `ga-*` Skill rows are seeded, links #1..#5
-- are repointed (#6 `dm-knowledge-patterns` stays, AGT-465), the assignment's `agent_id` becomes `architect`,
-- `JOHN-1013-TESTED-TICKETS` goes live and supersedes `JOHN-0925-FINDINGS-STANDARD`, and
-- `public.apply_audit_review(uuid, text, text, jsonb)` reads its ruler from the assignment instead of hardcoding
-- `devmanager` five times, refuses an untested filing root-cause, and writes the Test / Not tested / Prior art lines.
-- Rule #1 holds: no `ga-*` row names another agent.
--
-- Agent-row gate, run before this file was written (T1, kept verbatim):
-- agent-row-gate: AGT-492 · action=edit-active · scope_origin="john-named" → BUILD — action 'edit-active' under scope_origin = 'john-named' AND an unreversed runner_decisions row names this ticket — AGENT-ROW-AGREED-TICKET makes this build work under the ticket, no approval card. It still owes its own runner_before_images row under one decision handle. · need_source=john:runner_decisions:57894411-de47-4718-9d2a-f3426a43cebc (unreversed John decision)
--
-- The `apply_audit_review` edits are applied as a transform over `pg_get_functiondef()` rather than a
-- hand-retyped 23 KB body: the identity argument list is preserved by construction (supabase-function-signature.md)
-- and every untouched line stays verbatim (pattern:3). Each replace asserts it landed before the EXECUTE.

-- =====================================================================================================
-- T1 — the down capture. Runs in the call IMMEDIATELY BEFORE apply_migration, never after.
-- =====================================================================================================
-- DEVIATION (reported): the harvest's section M wrote this call with a {table, pk/where} shape.
-- public.capture_migration_down() refuses that shape -- its contract is a non-empty array of
-- {kind, identity} DDL objects (kinds: function, view, table, index, constraint, trigger), and a data
-- row is not one of them. The one DDL object this migration replaces is the function, so that is what
-- is captured; the five row-level changes are reversible through their runner_before_images rows under
-- DEC below, which is the mechanism the kickoff already requires for them.
-- Result: captured_class auto-downable, objects_captured 1, refusals 0.
select * from public.capture_migration_down('07f96d2b-29ca-4c00-ad13-f2751aae96f4','agt492_architect_review',
 '[{"kind":"function","identity":"public.apply_audit_review(uuid, text, text, jsonb)"}]'::jsonb);

-- =====================================================================================================
-- T2 — the migration `agt492_architect_review`, applied verbatim as below.
-- =====================================================================================================
DO $mig$
DECLARE
  v_cycle  uuid := '07f96d2b-29ca-4c00-ad13-f2751aae96f4';
  v_asn    uuid := 'f4b4faa1-6279-4341-8bd3-d882bd789a73';
  v_dec    uuid;
  v_def    text;
  v_new    text;
  v_uuid   uuid;
  v_links  text[];
  v_n      int;
  k_para   text := $para$THE TESTED STEP (John 2026-10-13, decisions 27-29 of docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md; rule JOHN-1013-TESTED-TICKETS). A finding is a hypothesis. Before any root-cause group: (1) GROUP findings AND open tickets by shared cause. (2) PRIOR ART: search open_audit_tickets and the worklist for the same problem or a competing fix; write what you found in prior_art; reuse_backlog_id when a ticket already covers it. (3) TEST, standard B, once per group: reproduce the cause and test the fix with a read-only query or command and record it in test {reproduced, how, result}; a cause that cannot be reproduced makes the group not-a-defect with that evidence as the reason; a cause that cannot be tested before building goes in untested_reason and the test becomes the first step of the build. (4) ONE tested ticket per group, listing every finding behind it. You file tickets for every source; no other agent does.$para$;
BEGIN
  -- -------------------------------------------------------------------------------------------------
  -- 0. DEC — one decision handle every before-image below hangs from.
  -- -------------------------------------------------------------------------------------------------
  v_dec := public.record_decision(v_cycle, NULL, 'agent-row', 'AGT-492',
    'review-audit-worklist moved GV-01 -> GV-09, tested step',
    $r$Measured 2026-10-20: agent_capability_assignments for review-audit-worklist held 1 row (devmanager), architect 0; its six links were all dm-*; dm-audit-review-intent.method carried no reproduce/test step; apply_audit_review() hardcoded ruled_by = 'devmanager' five times. John's decisions 27-29 (2026-10-13, docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md) make the Governance Architect the one writer of tested tickets: a finding is a hypothesis, grouped with open tickets by shared cause, checked against prior art, and its cause reproduced and fix tested (standard B) once per group before a ticket is written. So the capability, its five dm-* links, its default intent and the function's ruler move to architect as DATA (pattern:2, section 19b) -- the slug, the link rows and the sixth link (dm-knowledge-patterns, AGT-465) are kept rather than re-created, and dm-audit-review-intent is unlinked but left intact. The ruler is read from the assignment at call time so no later move needs a code change (pattern:10). JOHN-1013-TESTED-TICKETS goes live and supersedes JOHN-0925-FINDINGS-STANDARD; AGT-284's description is retargeted. Reversible: every touched row carries a before-image under this decision and capture_migration_down() holds the down.$r$,
    public.ladder_work_class('P10 - Tooling'));

  -- -------------------------------------------------------------------------------------------------
  -- 1. Before-images for every row this migration UPDATES — prior row, captured before the writes.
  -- -------------------------------------------------------------------------------------------------
  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  SELECT v_cycle, NULL, 'capability_skill_profiles', l.id::text, to_jsonb(l), v_dec
  FROM public.capability_skill_profiles l
  WHERE l.id IN ('6172a239-7efe-455a-bc8a-0d546fcc67dd','51921b8d-9c9d-4711-a6d0-df5a90c66e04',
                 '846cc791-56a7-46a1-9d44-bd7cd30731b2','a4b63401-f8ed-4046-88d0-32e7740dc4bf',
                 '4e5b1506-3c6e-4341-ae80-2236410005c9');

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  SELECT v_cycle, NULL, 'agent_capability_assignments', a.id::text, to_jsonb(a), v_dec
  FROM public.agent_capability_assignments a WHERE a.id = v_asn;

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  SELECT v_cycle, NULL, 'capabilities', c.id::text, to_jsonb(c), v_dec
  FROM public.capabilities c WHERE c.slug = 'review-audit-worklist';

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  SELECT v_cycle, NULL, 'governance_rules', r.id, to_jsonb(r), v_dec
  FROM public.governance_rules r WHERE r.id = 'JOHN-0925-FINDINGS-STANDARD';

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  SELECT v_cycle, NULL, 'backlog_items', b.id::text, to_jsonb(b), v_dec
  FROM public.backlog_items b WHERE b.backlog_id = 'AGT-284';

  -- -------------------------------------------------------------------------------------------------
  -- 2. SKILLS — the five ga-* rows. Columns as dm-identity carries them (harvest section S).
  -- -------------------------------------------------------------------------------------------------
  INSERT INTO public.skill_profiles
    (slug, name, skill_type_slug, objective, method, description, traits, guardrails,
     technical_services, execution_type, tenant_id, llm_provider, llm_model, max_tokens, temperature, api_key_source)
  VALUES
   ('ga-identity', 'Governance Architect Identity', 'identity',
    'Be The Governance Architect: a finding is a hypothesis, and you turn a group of them into one tested ticket or close it with evidence.',
    'You group findings and open tickets by shared cause, check prior art, reproduce the cause once per group and test the fix, then write one ticket naming every finding behind it. What cannot be reproduced you rule not-a-defect with the evidence. You never build, verify or grade a build.',
    'Who the Governance Architect is: the platform''s Solutions Architect, the one writer of tested tickets.',
    '{}'::jsonb, '{"must":[],"must_not":[]}'::jsonb,
    '[]'::jsonb, 'ai', NULL, 'anthropic', 'claude-opus-5', 8000, 0, 'platform'),

   ('ga-knowledge-review', 'Governance Architect Knowledge — the review''s instruments', 'knowledge',
    'Hold the instruments the review reads.',
    'public.audit_findings (the one intake, AGT-131; a finding moves open/carried -> ticketed, not-a-defect, carried, listed or escalated), public.backlog_items (open tickets; reuse_backlog_id names one), public.finding_routes and public.projects (task_context.routes / projects), public.apply_audit_review() (the one write path; scripts/audit-review.js --prepare, --dry-run, --apply), public.record_decision() with before-images (every ruling reversible). Standard B: the cause is reproduced and the fix tested with a read-only query or command before a ticket is written.',
    'The tables, function and script the findings review reads and writes, by name.',
    '{"source":"inline"}'::jsonb, '{"must":[],"must_not":[]}'::jsonb,
    '[]'::jsonb, 'ai', NULL, 'anthropic', 'claude-opus-5', 8000, 0, 'platform'),

   ('ga-behavior', 'Governance Architect Behavior', 'behavior',
    NULL, NULL,
    'How the Governance Architect reasons and writes.',
    '{"reasoning_style":"Group first, then prior art, then reproduce, then write. Measure, never recall: every test names its query or command and its result. The cheapest reproduction that proves the cause wins.","writing_style":"Ticket: title, root_cause, fix, test, prior_art, the finding ids. Every reason quotes its evidence."}'::jsonb,
    '{"must":[],"must_not":[]}'::jsonb,
    '[]'::jsonb, 'ai', NULL, 'anthropic', 'claude-opus-5', 8000, 0, 'platform'),

   ('ga-guardrails', 'Governance Architect Guardrails', 'guardrails',
    NULL, NULL,
    'The hard limits of the findings review.',
    '{}'::jsonb,
    '{"must":["group by shared cause before ruling","search open tickets and findings for the same problem or a competing fix","reproduce the cause and test the fix once per group, or say in untested_reason why it cannot be tested before building","write one tested ticket per group listing every finding behind it","close a group that cannot be reproduced as not-a-defect with the evidence"],"must_not":["file a ticket on an untested guess","build, design, verify or grade anything","name another agent in its own rows","escalate a feature or functionality call to John"]}'::jsonb,
    '[]'::jsonb, 'ai', NULL, 'anthropic', 'claude-opus-5', 8000, 0, 'platform');

  -- ga-review-intent: objective, description and traits copied from dm-audit-review-intent by reference
  -- (verbatim by construction), method = that method with the one substitution + PARA.
  INSERT INTO public.skill_profiles
    (slug, name, skill_type_slug, objective, method, description, traits, guardrails,
     technical_services, execution_type, tenant_id, llm_provider, llm_model, max_tokens, temperature, api_key_source)
  SELECT 'ga-review-intent', 'Review the Audit Work List', 'intent',
    s.objective,
    replace(s.method, 'Jerry Maguire or Nathan Laan', 'a career agent (found_by agent:<slug>)')
      || E'\n\n' || k_para,
    s.description,
    jsonb_set(s.traits, '{schema,properties,groups,items,properties}',
      (s.traits #> '{schema,properties,groups,items,properties}')
      || '{"test":{"type":"object","required":["reproduced","how","result"],"properties":{"reproduced":{"type":"boolean"},"how":{"type":"string","maxLength":1200},"result":{"type":"string","maxLength":1200}}},"untested_reason":{"type":"string","maxLength":600},"prior_art":{"type":"string","maxLength":600}}'::jsonb),
    '{"must":[],"must_not":[]}'::jsonb,
    '[]'::jsonb, 'ai', NULL, 'anthropic', 'claude-opus-5', 8000, 0, 'platform'
  FROM public.skill_profiles s WHERE s.slug = 'dm-audit-review-intent';

  -- Before-images for the five INSERTs: row_data NULL, pk_value the new uuid.
  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  SELECT v_cycle, NULL, 'skill_profiles', s.id::text, NULL, v_dec
  FROM public.skill_profiles s
  WHERE s.slug IN ('ga-identity','ga-knowledge-review','ga-behavior','ga-guardrails','ga-review-intent');

  -- -------------------------------------------------------------------------------------------------
  -- 3. LINKS — #1..#5 repointed by primary key; level / is_required / display_order untouched.
  --    #6 e8409f6f (dm-knowledge-patterns) stays, and nothing is DELETEd (AGT-465).
  -- -------------------------------------------------------------------------------------------------
  UPDATE public.capability_skill_profiles SET skill_profile_slug = 'ga-identity'         WHERE id = '6172a239-7efe-455a-bc8a-0d546fcc67dd';
  UPDATE public.capability_skill_profiles SET skill_profile_slug = 'ga-knowledge-review' WHERE id = '51921b8d-9c9d-4711-a6d0-df5a90c66e04';
  UPDATE public.capability_skill_profiles SET skill_profile_slug = 'ga-behavior'         WHERE id = '846cc791-56a7-46a1-9d44-bd7cd30731b2';
  UPDATE public.capability_skill_profiles SET skill_profile_slug = 'ga-review-intent'    WHERE id = 'a4b63401-f8ed-4046-88d0-32e7740dc4bf';
  UPDATE public.capability_skill_profiles SET skill_profile_slug = 'ga-guardrails'       WHERE id = '4e5b1506-3c6e-4341-ae80-2236410005c9';

  -- -------------------------------------------------------------------------------------------------
  -- 4. The assignment and the capability's default intent.
  -- -------------------------------------------------------------------------------------------------
  UPDATE public.agent_capability_assignments SET agent_id = 'architect' WHERE id = v_asn;
  UPDATE public.capabilities SET default_intent_slug = 'ga-review-intent' WHERE slug = 'review-audit-worklist';

  -- -------------------------------------------------------------------------------------------------
  -- 5. RULE — JOHN-1013-TESTED-TICKETS live; JOHN-0925-FINDINGS-STANDARD superseded by it.
  -- -------------------------------------------------------------------------------------------------
  INSERT INTO public.governance_rules (id, statement, canonical_doc, enforcement, status, superseded_by, source_group)
  VALUES ('JOHN-1013-TESTED-TICKETS',
    'Anyone reports findings; only the Governance Architect (GV-09) files tickets, for every source, and only after its group''s cause has been reproduced and the fix tested (standard B) once per group, or the ticket says what could not be tested and why. One tested ticket per group, every finding listed; a group that cannot be reproduced closes not-a-defect with the evidence. Findings and open tickets are grouped by shared cause and checked against prior art first. Replaces JOHN-0925-FINDINGS-STANDARD. John 2026-10-13, decisions 27-29 of docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md.',
    (SELECT canonical_doc FROM public.governance_rules WHERE id = 'JOHN-0925-FINDINGS-STANDARD'),
    'reviewer', 'live', NULL, 'claude-md-hard-rules');

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  VALUES (v_cycle, NULL, 'governance_rules', 'JOHN-1013-TESTED-TICKETS', NULL, v_dec);

  UPDATE public.governance_rules
     SET status = 'superseded', superseded_by = 'JOHN-1013-TESTED-TICKETS'
   WHERE id = 'JOHN-0925-FINDINGS-STANDARD';

  -- -------------------------------------------------------------------------------------------------
  -- 6. AGT-284 — the RETARGET paragraph appended to its description.
  -- -------------------------------------------------------------------------------------------------
  UPDATE public.backlog_items
     SET description = description || E'\n\nRETARGET (AGT-492, 2026-10-20): this review is the Governance Architect''s (review-audit-worklist, GV-09); (a)-(d) feed its worklist and apply path.'
   WHERE backlog_id = 'AGT-284';

  -- -------------------------------------------------------------------------------------------------
  -- 7. apply_audit_review(uuid, text, text, jsonb) — SAME identity argument list, four transforms.
  -- -------------------------------------------------------------------------------------------------
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'apply_audit_review' AND n.nspname = 'public';
  IF v_def IS NULL THEN RAISE EXCEPTION 'agt492: apply_audit_review not found'; END IF;
  v_new := v_def;

  -- 7a. DECLARE gains v_ruler.
  v_new := replace(v_new,
    $a$  v_jn       boolean;           -- is this John's ticket?
BEGIN$a$,
    $a$  v_jn       boolean;           -- is this John's ticket?
  v_ruler    text;              -- AGT-492: the agent that holds review-audit-worklist, read never hardcoded
BEGIN$a$);
  IF v_new NOT LIKE '%v_ruler    text;%' THEN RAISE EXCEPTION 'agt492: 7a did not land'; END IF;

  -- 7b. First statement of the body reads the ruler off the assignment.
  v_new := replace(v_new,
    $b$BEGIN
  -- 1. Validation, all before any write.$b$,
    $b$BEGIN
  SELECT agent_id INTO v_ruler FROM public.agent_capability_assignments WHERE capability_slug = 'review-audit-worklist' LIMIT 1;
  IF v_ruler IS NULL THEN
    RAISE EXCEPTION 'apply_audit_review: no agent holds review-audit-worklist';
  END IF;

  -- 1. Validation, all before any write.$b$);
  IF v_new NOT LIKE '%no agent holds review-audit-worklist%' THEN RAISE EXCEPTION 'agt492: 7b did not land'; END IF;

  -- 7c. The five hardcoded rulers become the one read value.
  IF (length(v_new) - length(replace(v_new, $c$ruled_by = 'devmanager'$c$, ''))) / length($c$ruled_by = 'devmanager'$c$) <> 5 THEN
    RAISE EXCEPTION 'agt492: expected 5 hardcoded rulers, found a different count';
  END IF;
  v_new := replace(v_new, $c$ruled_by = 'devmanager'$c$, $c$ruled_by = v_ruler$c$);
  IF v_new LIKE $c$%'devmanager'%$c$ THEN RAISE EXCEPTION 'agt492: a devmanager literal survived 7c'; END IF;

  -- 7d. The standard-B refusal, inside the v_reuse IS NULL branch that follows the needs-title check.
  --     (Placed in that branch, not on the line after the RAISE itself, which is unreachable — see the
  --     build report's deviation note.)
  v_new := replace(v_new,
    $d$      IF v_reuse IS NULL THEN PERFORM public.finding_group_epic(g); END IF;$d$,
    $d$      IF v_reuse IS NULL THEN
        IF NOT ((jsonb_typeof(g -> 'test' -> 'reproduced') = 'boolean' AND coalesce(btrim(g -> 'test' ->> 'how'), '') <> '' AND coalesce(btrim(g -> 'test' ->> 'result'), '') <> '') OR coalesce(btrim(g ->> 'untested_reason'), '') <> '') THEN
          RAISE EXCEPTION 'apply_audit_review: root-cause needs test (reproduced, how, result) or untested_reason (standard B)';
        END IF;
        PERFORM public.finding_group_epic(g);
      END IF;$d$);
  IF v_new NOT LIKE '%needs test (reproduced, how, result) or untested_reason (standard B)%' THEN
    RAISE EXCEPTION 'agt492: 7d did not land';
  END IF;

  -- 7e. v_desc gains Test / Not tested / Prior art between the Fix line and the Findings list.
  v_new := replace(v_new,
    $e$|| E'\n\nFindings (audit_findings):\n' || coalesce(v_lines, '');$e$,
    $e$|| CASE WHEN g -> 'test' IS NOT NULL THEN E'\n\nTest (standard B): ' || (g -> 'test' ->> 'how') || ' -> ' || (g -> 'test' ->> 'result') ELSE '' END || CASE WHEN coalesce(btrim(g ->> 'untested_reason'), '') <> '' THEN E'\n\nNot tested before build: ' || (g ->> 'untested_reason') ELSE '' END || CASE WHEN coalesce(btrim(g ->> 'prior_art'), '') <> '' THEN E'\nPrior art: ' || (g ->> 'prior_art') ELSE '' END || E'\n\nFindings (audit_findings):\n' || coalesce(v_lines, '');$e$);
  IF v_new NOT LIKE '%Test (standard B): %' THEN RAISE EXCEPTION 'agt492: 7e did not land'; END IF;

  EXECUTE v_new;
END $mig$;

-- =====================================================================================================
-- GATE — reads only, seven arms, each RAISEs on failure (harvest section M).
-- =====================================================================================================
DO $gate$
DECLARE
  v_links text[];
  v_def   text;
  v_n     int;
BEGIN
  -- 1. the six links, in display_order.
  SELECT array_agg(skill_profile_slug ORDER BY display_order) INTO v_links
  FROM public.capability_skill_profiles WHERE capability_slug = 'review-audit-worklist';
  IF v_links IS DISTINCT FROM ARRAY['ga-identity','ga-knowledge-review','ga-behavior','ga-review-intent','ga-guardrails','dm-knowledge-patterns']::text[] THEN
    RAISE EXCEPTION 'GATE 1: links are %', v_links;
  END IF;

  -- 2. the assignment moved.
  SELECT count(*) INTO v_n FROM public.agent_capability_assignments
   WHERE capability_slug = 'review-audit-worklist' AND agent_id = 'architect';
  IF v_n <> 1 THEN RAISE EXCEPTION 'GATE 2: architect rows = %', v_n; END IF;
  SELECT count(*) INTO v_n FROM public.agent_capability_assignments
   WHERE capability_slug = 'review-audit-worklist' AND agent_id = 'devmanager';
  IF v_n <> 0 THEN RAISE EXCEPTION 'GATE 2: devmanager rows = %', v_n; END IF;

  -- 3. the function reads its ruler and names no agent.
  v_def := pg_get_functiondef('public.apply_audit_review(uuid,text,text,jsonb)'::regprocedure);
  IF v_def NOT LIKE '%v_ruler%' THEN RAISE EXCEPTION 'GATE 3: no v_ruler'; END IF;
  IF v_def LIKE $q$%'devmanager'%$q$ THEN RAISE EXCEPTION 'GATE 3: devmanager literal still present'; END IF;

  -- 4. exactly one overload (supabase-function-signature.md).
  SELECT count(*) INTO v_n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'apply_audit_review' AND n.nspname = 'public';
  IF v_n <> 1 THEN RAISE EXCEPTION 'GATE 4: apply_audit_review overloads = %', v_n; END IF;

  -- 5. the rule swap.
  SELECT count(*) INTO v_n FROM public.governance_rules
   WHERE id = 'JOHN-1013-TESTED-TICKETS' AND status = 'live' AND superseded_by IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'GATE 5: JOHN-1013-TESTED-TICKETS not live'; END IF;
  SELECT count(*) INTO v_n FROM public.governance_rules
   WHERE id = 'JOHN-0925-FINDINGS-STANDARD' AND status = 'superseded' AND superseded_by = 'JOHN-1013-TESTED-TICKETS';
  IF v_n <> 1 THEN RAISE EXCEPTION 'GATE 5: JOHN-0925-FINDINGS-STANDARD not superseded'; END IF;

  -- 6. the intent's method: substituted, PARA appended, the copied text intact.
  SELECT count(*) INTO v_n FROM public.skill_profiles
   WHERE slug = 'ga-review-intent'
     AND method NOT ILIKE '%Nathan Laan%'
     AND method ILIKE '%THE TESTED STEP%'
     AND method ILIKE '%weeks_seen >= 3%';
  IF v_n <> 1 THEN RAISE EXCEPTION 'GATE 6: ga-review-intent.method fails its three reads'; END IF;

  -- 7. the capability's default intent and AGT-284's retarget.
  SELECT count(*) INTO v_n FROM public.capabilities
   WHERE slug = 'review-audit-worklist' AND default_intent_slug = 'ga-review-intent';
  IF v_n <> 1 THEN RAISE EXCEPTION 'GATE 7: default_intent_slug not ga-review-intent'; END IF;
  SELECT count(*) INTO v_n FROM public.backlog_items
   WHERE backlog_id = 'AGT-284' AND description ILIKE '%RETARGET (AGT-492%';
  IF v_n <> 1 THEN RAISE EXCEPTION 'GATE 7: AGT-284 carries no RETARGET'; END IF;

  RAISE NOTICE 'GATE: all seven arms pass';
END $gate$;
