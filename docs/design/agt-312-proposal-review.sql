-- DeepBench v7.0.747 | docs/design/agt-312-proposal-review.sql | AGT-312 -- A PROPOSAL REACHES JOHN
-- ONLY WHEN BOTH THE MANAGER AND VICTORIA AGREE.
--
-- John, verbatim 2026-10-02 (runner_decisions 6668e1ac-3248-4172-9472-7cede7c15c7a, kind
-- `john-ruling`, open, not reversed): "add one extra item, before it get's proposed, victoria has to
-- review it too, and both the dev mgr and victoria agree it needs to be brought to my attention"
--
-- MIRROR of migration `agt312_proposal_review` (applied over the MCP this cycle). Three parts:
--   1. finish_project_batch() gains the review gate -- CREATE OR REPLACE from the LIVE body, the
--      identity argument list UNCHANGED (uuid, text, uuid, jsonb), so no stale overload is created
--      and no DROP is owed (.claude/rules/supabase-function-signature.md). The gate sits AFTER the
--      attribution check and BEFORE the project_batch_state() read, which is what makes the refusal
--      provable live, over PostgREST, with zero writes and zero fixtures.
--   2. Victoria's `review-proposal` capability as FOUR ROWS (§19b: capabilities are data) -- one
--      agent-row decision, four runner_before_images with row_data NULL (SES-150, so the reversal
--      DELETEs them) THEN the four INSERTs. Authority: AGENT-ROW-AGREED-TICKET, verdict `build`
--      from scripts/agent-row-gate.js --ticket=AGT-312 --action=edit-active.
--   3. The trailing probe: a due batch built as a fixture, the three calls of the discriminator, and
--      every fixture rolled back inside a subtransaction that ends in the sentinel P0312 -- so the
--      probe proves both directions without leaving a row behind, and the migration still commits.
--
-- Down: public.capture_migration_down('dd72eb62-fdde-4b4a-aa5b-d6a079d2530d', 'agt312_proposal_review',
--   '[{"kind":"function","identity":"public.finish_project_batch(uuid, text, uuid, jsonb)"}]'::jsonb)
-- ran BEFORE the apply -- auto-downable, 1 object captured, 0 refusals. The four rows' down is the
-- one agent-row decision: select * from public.reverse_decision('<its id>', 'John', '<why>');

-- ============================================================================================
-- 1. THE GATE
-- ============================================================================================

CREATE OR REPLACE FUNCTION public.finish_project_batch(p_cycle_id uuid, p_session_name text, p_epic uuid, p_proposal jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_state    record;
  v_proj     public.projects%ROWTYPE;
  v_target   public.projects%ROWTYPE;
  v_epic     public.epics%ROWTYPE;
  f          public.audit_findings%ROWTYPE;
  v_slug     text;
  v_name     text;
  v_charter  text;
  v_reason   text;
  v_tickets  jsonb;
  t          jsonb;
  v_i        int := 0;
  v_id       text;
  v_st       text;
  v_seen     text[] := ARRAY[]::text[];
  v_eff      text;
  v_after    text;
  v_dec      uuid;
  v_by       text := coalesce(p_session_name, 'cycle ' || p_cycle_id::text);
  v_new_proj boolean;
  v_target_id uuid;
  v_epic_new uuid := gen_random_uuid();
  v_n        int;
  v_last     int;
  v_next     int;
  v_ord      int;
  v_bid      text;
  v_pc       text;
  v_lines    text;
  v_new_uuid uuid;
  v_filed    text[] := ARRAY[]::text[];
  v_found    int := 0;
  v_patterns text;
  v_review   jsonb;
  v_verdict  text;
BEGIN
  -- 1. Validation, all before any write.
  IF NOT ((p_cycle_id IS NOT NULL) <> (p_session_name IS NOT NULL)) THEN
    RAISE EXCEPTION 'finish_project_batch: exactly one of p_cycle_id / p_session_name';
  END IF;

  -- AGT-312 (John 2026-10-02, decision 6668e1ac): a proposal reaches John only when BOTH the
  -- manager and Victoria's `review-proposal` turn agree it needs his attention. The manager's
  -- proposal IS his agreement; hers rides `p_proposal.review` as her answer verbatim, and both are
  -- recorded on the ONE `proposal` decision below, so one reverse_decision() still undoes the whole
  -- finish. Checked HERE -- after attribution, BEFORE project_batch_state() -- so any non-due epic
  -- answers this sentence to a review-less call and `not due` to an agreed one: the gate is provable
  -- live with no writes (pattern:8, pattern:19).
  v_review := p_proposal -> 'review';
  IF jsonb_typeof(v_review) IS DISTINCT FROM 'object'
     OR coalesce(btrim(v_review ->> 'verdict'), '') = ''
     OR coalesce(btrim(v_review ->> 'reason'), '') = ''
     OR coalesce(btrim(v_review ->> 'account'), '') = '' THEN
    RAISE EXCEPTION 'finish_project_batch: proposal needs a review with verdict, reason and account (John 2026-10-02, decision 6668e1ac)';
  END IF;
  v_verdict := btrim(v_review ->> 'verdict');
  IF v_verdict NOT IN ('agree', 'disagree') THEN
    RAISE EXCEPTION 'finish_project_batch: review verdict % is not agree or disagree', v_verdict;
  END IF;
  IF v_verdict = 'disagree' THEN
    RAISE EXCEPTION 'finish_project_batch: the review verdict is disagree -- a proposal reaches John only when both the manager and the review agree (John 2026-10-02, decision 6668e1ac)';
  END IF;

  SELECT * INTO v_state FROM public.project_batch_state() s WHERE s.epic_id = p_epic;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'finish_project_batch: epic % is not due a proposal (an executing project, a locked list, every member done or removed, not yet finished)', p_epic;
  END IF;
  IF NOT coalesce(v_state.proposal_due, false) THEN
    RAISE EXCEPTION 'finish_project_batch: epic % is not due a proposal (an executing project, a locked list, every member done or removed, not yet finished)', p_epic;
  END IF;
  SELECT * INTO v_epic FROM public.epics e WHERE e.id = p_epic FOR UPDATE;
  SELECT * INTO v_proj FROM public.projects p WHERE p.id = v_epic.project_id FOR UPDATE;

  v_slug := btrim(coalesce(p_proposal ->> 'slug', ''));
  v_name := btrim(coalesce(p_proposal ->> 'name', ''));
  v_charter := btrim(coalesce(p_proposal ->> 'charter', ''));
  v_reason := btrim(coalesce(p_proposal ->> 'reason', ''));
  IF v_slug = '' OR v_name = '' OR v_charter = '' OR v_reason = '' THEN
    RAISE EXCEPTION 'finish_project_batch: proposal needs slug, name, charter and reason';
  END IF;
  IF v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'finish_project_batch: proposal slug % is not lowercase words joined by hyphens', v_slug;
  END IF;
  v_tickets := p_proposal -> 'tickets';
  IF jsonb_typeof(v_tickets) IS DISTINCT FROM 'array' OR jsonb_array_length(v_tickets) = 0 THEN
    RAISE EXCEPTION 'finish_project_batch: proposal needs at least one ticket';
  END IF;
  FOR t IN SELECT value FROM jsonb_array_elements(v_tickets) LOOP
    v_i := v_i + 1;
    IF jsonb_typeof(t) IS DISTINCT FROM 'object'
       OR coalesce(btrim(t ->> 'title'), '') = '' OR coalesce(btrim(t ->> 'root_cause'), '') = ''
       OR coalesce(btrim(t ->> 'fix'), '') = '' OR coalesce(btrim(t ->> 'priority_class'), '') = ''
       OR jsonb_typeof(t -> 'predicted_cycles') IS DISTINCT FROM 'number'
       OR jsonb_typeof(t -> 'finding_ids') IS DISTINCT FROM 'array' OR jsonb_array_length(t -> 'finding_ids') = 0 THEN
      RAISE EXCEPTION 'finish_project_batch: ticket % needs title, root_cause, fix, priority_class, predicted_cycles and finding_ids', v_i;
    END IF;
    IF (t ->> 'priority_class') !~ '^P([1-9]|10) - \S' THEN
      RAISE EXCEPTION 'finish_project_batch: ticket % priority_class % is not a named class (P1 - ... to P10 - ...)', v_i, t ->> 'priority_class';
    END IF;
    IF (t ->> 'predicted_cycles')::numeric < 1 OR (t ->> 'predicted_cycles')::numeric <> floor((t ->> 'predicted_cycles')::numeric) THEN
      RAISE EXCEPTION 'finish_project_batch: ticket % predicted_cycles must be a whole number of at least 1', v_i;
    END IF;
    FOR v_id IN SELECT jsonb_array_elements_text(t -> 'finding_ids') LOOP
      v_st := NULL;
      SELECT a.status INTO v_st FROM public.audit_findings a WHERE a.id::text = v_id;
      IF v_st IS NULL OR v_st NOT IN ('open', 'carried', 'listed') THEN
        RAISE EXCEPTION 'finish_project_batch: finding % is not open, carried or listed', v_id;
      END IF;
      IF v_id = ANY (v_seen) THEN
        RAISE EXCEPTION 'finish_project_batch: finding % in two tickets', v_id;
      END IF;
      v_seen := v_seen || v_id;
    END LOOP;
  END LOOP;

  -- The finishing project leaves executing in this same call (D6), so its own slug is judged by the
  -- status it is about to have.
  v_after := CASE WHEN v_proj.perpetual THEN 'paused' ELSE 'done' END;
  SELECT * INTO v_target FROM public.projects p WHERE p.slug = v_slug FOR UPDATE;
  v_new_proj := NOT FOUND;
  IF NOT v_new_proj THEN
    v_eff := CASE WHEN v_target.id = v_proj.id THEN v_after ELSE v_target.status END;
    IF v_eff NOT IN ('planned', 'paused', 'done') THEN
      RAISE EXCEPTION 'finish_project_batch: project % is %; a proposal names a new slug or a planned, paused or done project', v_slug, v_eff;
    END IF;
  END IF;

  -- 2. ONE decision, carrying BOTH agreements (AGT-312): the manager's reason, then Victoria's.
  --    John reads the reason; the ticket counts ride the summary.
  SELECT coalesce(string_agg('pattern:' || x, ' '), 'pattern:0') INTO v_patterns
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_proposal -> 'patterns_applied') = 'array'
                                        THEN p_proposal -> 'patterns_applied' ELSE '[]'::jsonb END) x;
  v_dec := public.record_decision(
    p_cycle_id, p_session_name, 'proposal', NULL,
    format('Project %s finished batch %s (%s members); proposed %s (%s): %s ticket(s), %s finding(s); review: agree',
           v_proj.slug, v_epic.name, v_state.members, v_slug, v_name,
           jsonb_array_length(v_tickets), array_length(v_seen, 1)),
    v_reason || E'\n' || 'Review: agree -- ' || (p_proposal #>> '{review,reason}') || E'\n' || v_patterns,
    NULL);

  -- 3. Images first, in write order; created_at = clock_timestamp() so a Reverse (newest first)
  --    undoes them in reverse order: findings, tickets, the new epic, the target, the old project, the epic.
  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
  VALUES (p_cycle_id, p_session_name, 'epics', v_epic.id::text, to_jsonb(v_epic), v_dec, clock_timestamp());
  UPDATE public.epics SET finished_at = now(), updated_at = now() WHERE id = v_epic.id;

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
  VALUES (p_cycle_id, p_session_name, 'projects', v_proj.id::text, to_jsonb(v_proj), v_dec, clock_timestamp());
  UPDATE public.projects SET status = v_after, updated_at = now(), updated_by = v_by WHERE id = v_proj.id;

  IF v_new_proj THEN
    v_target_id := gen_random_uuid();
    INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
    VALUES (p_cycle_id, p_session_name, 'projects', v_target_id::text, NULL, v_dec, clock_timestamp());
    INSERT INTO public.projects (id, slug, name, status, charter, proposal_reason, proposed_at, updated_by)
    VALUES (v_target_id, v_slug, v_name, 'proposed', v_charter, v_reason, now(), v_by);
  ELSE
    v_target_id := v_target.id;
    INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
    SELECT p_cycle_id, p_session_name, 'projects', p.id::text, to_jsonb(p), v_dec, clock_timestamp()
      FROM public.projects p WHERE p.id = v_target_id;
    UPDATE public.projects SET status = 'proposed', proposal_reason = v_reason, proposed_at = now(),
           updated_at = now(), updated_by = v_by
     WHERE id = v_target_id;
  END IF;

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
  VALUES (p_cycle_id, p_session_name, 'epics', v_epic_new::text, NULL, v_dec, clock_timestamp());
  INSERT INTO public.epics (id, name, description, project_id)
  VALUES (v_epic_new, format('%s — proposal %s', v_name, left(v_dec::text, 8)),
          'AGT-240 proposal (decision ' || v_dec || '): ' || v_reason, v_target_id);

  -- 4. Tickets: ONE counter block for all n, guarded against counter drift behind the board
  --    (apply_audit_review's block). Normal backlog rows, `discovered`, `open`, under the new epic --
  --    unpicked while the project is `proposed` (epic_project_executing).
  v_n := jsonb_array_length(v_tickets);
  INSERT INTO public.feature_id_counter (prefix, last_issued_number, updated_by_session)
  VALUES ('AGT', v_n, v_by)
  ON CONFLICT (prefix) DO UPDATE
    SET last_issued_number = GREATEST(public.feature_id_counter.last_issued_number,
          (SELECT coalesce(max(split_part(b.backlog_id, '-', 2)::int), 0)
             FROM public.backlog_items b WHERE b.backlog_id ~ '^AGT-[0-9]+$')) + v_n,
        updated_at = now(),
        updated_by_session = EXCLUDED.updated_by_session
  RETURNING last_issued_number INTO v_last;
  v_next := v_last - v_n + 1;
  SELECT coalesce(max(b.row_ordinal), 0) INTO v_ord FROM public.backlog_items b;

  FOR t IN SELECT value FROM jsonb_array_elements(v_tickets) LOOP
    v_bid := 'AGT-' || v_next;
    v_next := v_next + 1;
    v_ord := v_ord + 1;
    v_pc := t ->> 'priority_class';
    SELECT string_agg('- ' || a.id::text || ' ' || a.fingerprint || ' [' || coalesce(a.check_slug, '-') || '] ' ||
                      a.locations::text || ' — ' || a.governing_fact, E'\n' ORDER BY x.ord)
      INTO v_lines
      FROM jsonb_array_elements_text(t -> 'finding_ids') WITH ORDINALITY x(fid, ord)
      JOIN public.audit_findings a ON a.id::text = x.fid;
    v_new_uuid := gen_random_uuid();
    INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
    VALUES (p_cycle_id, p_session_name, 'backlog_items', v_new_uuid::text, NULL, v_dec, clock_timestamp());
    INSERT INTO public.backlog_items
      (id, backlog_id, tier, type, priority_class, title, description, status, epic_id,
       source_file, session_ref, row_ordinal, filed_at, scope_origin, size_stamp, predicted_cycles,
       defer_status, scope_rationale, milestone, enhancement_claim, gate_count, design_status)
    VALUES
      (v_new_uuid, v_bid, 'next', 'Tooling', v_pc, t ->> 'title',
       '**' || v_pc || '.** ' || (t ->> 'root_cause') || E'\n\nFix: ' || (t ->> 'fix') ||
         E'\n\nFindings (audit_findings):\n' || coalesce(v_lines, ''),
       'open', v_epic_new,
       'project-proposal', v_by || ' ' || current_date, v_ord, now(), 'discovered',
       'M', (t ->> 'predicted_cycles')::int,
       'no', format('AGT-240: proposed project %s, root cause of audit findings %s', v_slug,
                    (SELECT string_agg(x, ', ') FROM jsonb_array_elements_text(t -> 'finding_ids') x)),
       NULL, 'none: audit root-cause fix', 0, NULL);
    v_filed := v_filed || v_bid;

    -- 5. Findings: image, then ticketed onto the proposed ticket.
    FOR v_id IN SELECT jsonb_array_elements_text(t -> 'finding_ids') LOOP
      SELECT * INTO f FROM public.audit_findings a WHERE a.id = v_id::uuid;
      INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
      VALUES (p_cycle_id, p_session_name, 'audit_findings', f.id::text, to_jsonb(f), v_dec, clock_timestamp());
      UPDATE public.audit_findings
         SET status = 'ticketed', filed_backlog_id = v_bid,
             ruling = format('AGT-240: proposed in %s as %s -- %s / %s', v_slug, v_bid, t ->> 'root_cause', t ->> 'fix'),
             ruled_by = 'devmanager', ruled_at = now()
       WHERE id = f.id;
      v_found := v_found + 1;
    END LOOP;
  END LOOP;

  PERFORM public.recompute_backlog_queue();
  RETURN jsonb_build_object(
    'decision_id', v_dec,
    'finished', jsonb_build_object('slug', v_proj.slug, 'status', v_after, 'epic_id', v_epic.id, 'members', v_state.members),
    'proposed', jsonb_build_object('slug', v_slug, 'project_id', v_target_id, 'epic_id', v_epic_new, 'new_project', v_new_proj),
    'tickets', to_jsonb(v_filed),
    'findings', v_found);
END
$function$;

-- ============================================================================================
-- 2. VICTORIA'S `review-proposal` CAPABILITY -- FOUR ROWS (§19b), IMAGED FIRST
-- ============================================================================================
-- Authority: AGENT-ROW-AGREED-TICKET. scripts/agent-row-gate.js --ticket=AGT-312
-- --action=edit-active --json returned verdict `build`, clause `agreed-ticket`
-- (scope_origin john-named, need_source john:runner_decisions:6668e1ac-…, decision_names_ticket
-- true) -- build work under the ticket, no approval card, and it still owes its own before-image
-- row under one decision handle. Every image carries row_data NULL (SES-150), so
-- reverse_decision() DELETEs the four rows.
-- A new capability and NOT a sibling intent on `requirement-check`: AGT-281's sibling was the same
-- judgment at a different unit; this is a different judgment (does this proposal need John's
-- attention) on a different object (pattern:17 extends what fits, and this does not).

DO $rows$
DECLARE
  v_cycle   uuid := 'dd72eb62-fdde-4b4a-aa5b-d6a079d2530d';
  v_dec     uuid;
  v_intent  uuid := gen_random_uuid();
  v_cap     uuid := gen_random_uuid();
  v_link    uuid := gen_random_uuid();
  v_assign  uuid := gen_random_uuid();
BEGIN
  v_dec := public.record_decision(
    v_cycle, NULL, 'agent-row', 'AGT-312',
    'AGT-312 (v7.0.747): Victoria gains the review-proposal capability as four rows -- intent Skill vc-proposal-intent, the capability, one required level-3 link and her assignment',
    $why$John 2026-10-02 (runner_decisions 6668e1ac-3248-4172-9472-7cede7c15c7a, kind john-ruling, open, not reversed), verbatim: "add one extra item, before it get's proposed, victoria has to review it too, and both the dev mgr and victoria agree it needs to be brought to my attention". AGENT-ROW-AGREED-TICKET: scripts/agent-row-gate.js --ticket=AGT-312 --action=edit-active returned verdict `build` on clause `agreed-ticket` -- an agreed ticket's seed is build work with a before-image, not an approval card. Capabilities are data (§19b), so the turn John asked for is four rows and zero harness change: the intent Skill carries her question and her {verdict, reason, account} schema, the capability names it as its default intent, one required level-3 link joins them, and one assignment gives it to victoria. Her answer then rides p_proposal.review into finish_project_batch(), which refuses anything but `agree` -- both agreements on the one `proposal` decision, so one reverse_decision() still undoes the whole finish. All four images carry row_data NULL, so this decision's reversal DELETEs them.$why$,
    NULL);
  RAISE NOTICE 'AGT-312 agent-row decision: %', v_dec;

  -- Images FIRST, in write order, row_data NULL (the rows do not exist yet).
  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
  VALUES (v_cycle, NULL, 'skill_profiles',               v_intent::text, NULL, v_dec, clock_timestamp()),
         (v_cycle, NULL, 'capabilities',                 v_cap::text,    NULL, v_dec, clock_timestamp()),
         (v_cycle, NULL, 'capability_skill_profiles',    v_link::text,   NULL, v_dec, clock_timestamp()),
         (v_cycle, NULL, 'agent_capability_assignments', v_assign::text, NULL, v_dec, clock_timestamp());

  -- THEN the four rows. Every column not named takes vc-requirement-intent's own value, read live
  -- this cycle: skill_type_slug intent, tenant_id global, execution_type ai, llm_provider anthropic,
  -- llm_model claude-fable-5-1, max_tokens 8000, api_key_source platform, temperature NULL,
  -- technical_services [], guardrails {"must": [], "must_not": []}.
  INSERT INTO public.skill_profiles
    (id, slug, name, skill_type_slug, tenant_id, execution_type, llm_provider, llm_model, max_tokens,
     api_key_source, temperature, technical_services, guardrails,
     description, objective, method, output_desc, tone, confidence, traits)
  VALUES (
    v_intent, 'vc-proposal-intent', 'Review the Proposed Project', 'intent', 'global', 'ai',
    'anthropic', 'claude-fable-5-1', 8000, 'platform', NULL, '[]'::jsonb,
    '{"must": [], "must_not": []}'::jsonb,
    $d$AGT-312 (v7.0.747): before a next-project proposal is written for John, Victoria reviews it; it reaches him only when both The Development Manager and she agree it needs his attention (John 2026-10-02, decision 6668e1ac).$d$,
    $o$Decide whether the manager's proposed next project needs John's attention: agree, and it is written for him; disagree, and it is not.$o$,
    $m$PROPOSAL REVIEW (AGT-312, John 2026-10-02): "before it gets proposed, victoria has to review it too, and both the dev mgr and victoria agree it needs to be brought to my attention." Your task_context is scripts/propose-project.js --for-review's file: project (the finished project), epic (the finished batch), members (its tickets with status), functionality_review (the Auditor's grading of what the batch built: areas working, broken or missing, with evidence), findings (the findings list: open, carried and listed), projects (every project with its status) and proposal (the manager's answer: slug, name, charter, reason, tickets with root_cause, fix, priority_class, predicted_cycles and finding_ids). Your one question is whether this proposal needs John's attention. Agree when all three hold: (1) every ticket answers findings that are on the list and its root_cause follows from them or from a broken or missing area of functionality_review; (2) against projects, this is the right next project -- it does not duplicate a planned, paused or executing one, and its reason names what John cannot do today, what he can do after, and why now; (3) the reason is true to functionality_review -- nothing graded working is called broken, nothing graded broken or missing is left unanswered without saying why. Disagree otherwise, and say exactly what is missing so the manager can re-propose once. You edit nothing and propose nothing: the proposal is the manager's, the write is finish_project_batch()'s, and the decision to start it is John's. reason is at most 1200 characters, plain business language, quoting the ticket, area or finding you relied on. Return {verdict, reason, account}.$m$,
    $od$One JSON object: verdict agree or disagree, a reason of at most 1200 characters, and your account.$od$,
    $t$Direct and evidence-first. Quote what you relied on; never paraphrase the proposal into agreement.$t$,
    $c$An agree you cannot point at the findings and the review for is a disagree.$c$,
    '{"can_request_help": false, "schema": {"type": "object", "required": ["verdict", "reason", "account"], "properties": {"verdict": {"type": "string", "enum": ["agree", "disagree"]}, "reason": {"type": "string", "maxLength": 1200}, "account": {"type": "string", "maxLength": 100}}}}'::jsonb);

  INSERT INTO public.capabilities
    (id, slug, name, description, execution_type, tenant_id, display_phrase, default_intent_slug)
  VALUES (
    v_cap, 'review-proposal', 'Review Proposal',
    $cd$AGT-312 (v7.0.747): at a project's finish, Victoria reviews The Development Manager's proposed next project before it is written for John; it reaches him only when both agree it needs his attention. Writes nothing itself.$cd$,
    'ai', 'global', 'reviewing the proposed project', 'vc-proposal-intent');

  INSERT INTO public.capability_skill_profiles
    (id, capability_slug, skill_profile_slug, level, is_required, display_order)
  VALUES (v_link, 'review-proposal', 'vc-proposal-intent', 3, true, 1);

  INSERT INTO public.agent_capability_assignments (id, tenant_id, agent_id, capability_slug)
  VALUES (v_assign, 'global', 'victoria', 'review-proposal');
END
$rows$;

-- ============================================================================================
-- 3. THE TRAILING PROBE -- the discriminator, every fixture rolled back (sentinel P0312)
-- ============================================================================================
-- The three calls of §6.1 against a REAL due batch, which no live epic is (0 due, measured this
-- cycle), so the probe builds AGT-240's own fixture shape: a planned project + an unlocked epic +
-- one member and one finding (so no gate fires on the inserts), then the project to `executing` and
-- the list locked -- proposal_due true. The whole fixture and all three calls live inside a
-- SUBTRANSACTION that ends in the sentinel P0312 and catches it, so every write is rolled back
-- while THIS migration still commits (plpgsql variables survive the rollback, so the facts are
-- reported after it). A mismatch raises for real and aborts the whole migration.

DO $probe$
DECLARE
  v_proj    uuid := gen_random_uuid();
  v_epic    uuid := gen_random_uuid();
  v_item    uuid := gen_random_uuid();
  v_find    uuid := gen_random_uuid();
  v_cycle   uuid := 'dd72eb62-fdde-4b4a-aa5b-d6a079d2530d';
  v_base    jsonb;
  v_due     boolean;
  v_m1      text := '(not raised)';
  v_m3      text := '(not raised)';
  v_after_m1 text := '(unmeasured)';
  v_after_m3 text := '(unmeasured)';
  v_ok      jsonb;
  v_status  text := '(unmeasured)';
  v_reason  text := '(unmeasured)';
  v_links   int;
  v_assigns int;
  v_caps    int;
  v_intents int;
  v_over    int;
BEGIN
  BEGIN
    -- ---- the fixture: inserted while the project is `planned` and the list unlocked, so neither
    -- ---- epic_lock_guard nor requirement_gate has anything to refuse.
    INSERT INTO public.projects (id, slug, name, status, charter)
    VALUES (v_proj, 'zprobe-0312-source', 'AGT-312 probe source', 'planned', 'probe');
    INSERT INTO public.epics (id, name, description, project_id)
    VALUES (v_epic, 'AGT-312 probe batch', 'probe', v_proj);
    INSERT INTO public.backlog_items
      (id, backlog_id, tier, type, priority_class, title, description, status, epic_id, source_file,
       session_ref, row_ordinal, filed_at, scope_origin, size_stamp, predicted_cycles, defer_status,
       scope_rationale, milestone, enhancement_claim, gate_count, design_status)
    VALUES (v_item, 'ZPROBE-0312', 'next', 'Tooling', 'P10 - Tooling', 'AGT-312 probe member', 'probe',
            'done', v_epic, 'agt-312-probe', 'agt312-probe', 999999312, now(), 'john-named', 'S', 1,
            'no', 'probe', NULL, 'none: probe', 0, NULL);
    INSERT INTO public.audit_findings
      (id, fingerprint, iso_week, kind, locations, governing_fact, confidence, proposed_resolution,
       status, found_by, finding_type, family)
    VALUES (v_find, 'agt312-probe-finding', '2026-W40', 'other', '["probe"]'::jsonb, 'probe',
            'high', 'probe', 'listed', 'auditor:probe', 'defect', 'other');
    UPDATE public.projects SET status = 'executing' WHERE id = v_proj;
    UPDATE public.epics SET locked_at = now() WHERE id = v_epic;

    SELECT s.proposal_due INTO v_due FROM public.project_batch_state() s WHERE s.epic_id = v_epic;
    IF v_due IS NOT TRUE THEN
      RAISE EXCEPTION 'AGT-312 probe: the fixture batch is not due (proposal_due %), so the three calls would prove nothing', v_due;
    END IF;

    v_base := jsonb_build_object(
      'slug', 'zprobe-0312-target', 'name', 'AGT-312 probe target', 'charter', 'probe',
      'reason', 'probe reason', 'patterns_applied', '[]'::jsonb,
      'tickets', jsonb_build_array(jsonb_build_object(
        'title', 'probe ticket', 'root_cause', 'probe', 'fix', 'probe',
        'priority_class', 'P10 - Tooling', 'predicted_cycles', 1,
        'finding_ids', jsonb_build_array(v_find::text))));

    -- ---- CALL 1: no `review` at all. Today this wrote `proposed`; now it must raise M1 and write nothing.
    BEGIN
      PERFORM public.finish_project_batch(v_cycle, NULL, v_epic, v_base);
      RAISE EXCEPTION 'AGT-312 probe: a review-less proposal was ACCEPTED -- the gate is not there';
    EXCEPTION WHEN others THEN
      v_m1 := SQLERRM;
      IF v_m1 NOT LIKE 'finish_project_batch: proposal needs a review with verdict, reason and account%' THEN
        RAISE EXCEPTION 'AGT-312 probe: call 1 raised the wrong sentence: %', v_m1;
      END IF;
    END;
    SELECT coalesce(string_agg(p.status, ','), '(none)') INTO v_after_m1
      FROM public.projects p WHERE p.slug = 'zprobe-0312-target';
    IF v_after_m1 <> '(none)' THEN
      RAISE EXCEPTION 'AGT-312 probe: the review-less call wrote a target project (%)', v_after_m1;
    END IF;

    -- ---- CALL 2: `disagree`. M3, and still nothing written.
    BEGIN
      PERFORM public.finish_project_batch(v_cycle, NULL, v_epic, v_base || jsonb_build_object(
        'review', jsonb_build_object('verdict', 'disagree', 'reason', 'probe disagrees', 'account', 'probe')));
      RAISE EXCEPTION 'AGT-312 probe: a disagreed proposal was ACCEPTED';
    EXCEPTION WHEN others THEN
      v_m3 := SQLERRM;
      IF v_m3 NOT LIKE 'finish_project_batch: the review verdict is disagree%' THEN
        RAISE EXCEPTION 'AGT-312 probe: call 2 raised the wrong sentence: %', v_m3;
      END IF;
    END;
    SELECT coalesce(string_agg(p.status, ','), '(none)') INTO v_after_m3
      FROM public.projects p WHERE p.slug = 'zprobe-0312-target';
    IF v_after_m3 <> '(none)' THEN
      RAISE EXCEPTION 'AGT-312 probe: the disagreed call wrote a target project (%)', v_after_m3;
    END IF;

    -- ---- CALL 3: `agree`. The control -- the SAME proposal is written, and the one decision
    -- ---- carries her reason, so the pair proves the refusal is the review's and nothing else's.
    v_ok := public.finish_project_batch(v_cycle, NULL, v_epic, v_base || jsonb_build_object(
      'review', jsonb_build_object('verdict', 'agree', 'reason', 'probe agrees', 'account', 'probe')));
    SELECT p.status INTO v_status FROM public.projects p WHERE p.slug = 'zprobe-0312-target';
    IF v_status IS DISTINCT FROM 'proposed' THEN
      RAISE EXCEPTION 'AGT-312 probe: the agreed call left the target %, not proposed', coalesce(v_status, '(absent)');
    END IF;
    SELECT d.reasoning INTO v_reason FROM public.runner_decisions d
     WHERE d.id = (v_ok ->> 'decision_id')::uuid;
    IF v_reason NOT LIKE '%Review: agree -- probe agrees%' THEN
      RAISE EXCEPTION 'AGT-312 probe: the proposal decision does not carry the review line: %', left(v_reason, 200);
    END IF;

    RAISE EXCEPTION 'P0312 AGT-312 probe complete -- rolling every fixture back';
  EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE 'P0312%' THEN RAISE; END IF;
  END;

  -- Outside the rolled-back subtransaction: the four rows this migration just committed.
  SELECT count(*) INTO v_caps    FROM public.capabilities c WHERE c.slug = 'review-proposal';
  SELECT count(*) INTO v_intents FROM public.skill_profiles s WHERE s.slug = 'vc-proposal-intent';
  SELECT count(*) INTO v_links   FROM public.capability_skill_profiles l WHERE l.capability_slug = 'review-proposal';
  SELECT count(*) INTO v_assigns FROM public.agent_capability_assignments a
    WHERE a.capability_slug = 'review-proposal' AND a.agent_id = 'victoria';
  IF v_caps <> 1 OR v_intents <> 1 OR v_links <> 1 OR v_assigns <> 1 THEN
    RAISE EXCEPTION 'AGT-312: expected exactly one of each row; got capability %, intent %, link(s) %, assignment(s) %',
      v_caps, v_intents, v_links, v_assigns;
  END IF;

  -- One overload, identity unchanged (.claude/rules/supabase-function-signature.md).
  SELECT count(*) INTO v_over FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'finish_project_batch' AND p.prokind = 'f';
  IF v_over <> 1 THEN
    RAISE EXCEPTION 'AGT-312: finish_project_batch holds % overload(s), expected 1', v_over;
  END IF;

  RAISE NOTICE 'AGT-312 probe: due=% | M1=% | target after M1=% | M3=% | target after M3=% | agreed target=% | links=% assignments=% overloads=%',
    v_due, left(v_m1, 80), v_after_m1, left(v_m3, 80), v_after_m3, v_status, v_links, v_assigns, v_over;
END
$probe$;
