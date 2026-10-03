-- AGT-309 (v7.0.743) -- THE PROCESS-BREAK CLASS. John's 2026-10-02 ruling (decision
-- 874648b6-c254-4a1f-b152-5d94d6b28b72) becomes three things that act: a `governance_rules` row,
-- Victoria's inline Knowledge on `requirement-check`, and the one path a ticket of that class may
-- take into an executing project's list.
--
-- MIRROR of the migration `agt309_process_break_class`, applied via mcp Supabase apply_migration
-- (which wraps the whole file in ONE transaction, so no BEGIN/COMMIT here). Reasoning:
-- docs/harvests/AGT-309.md (H0-H3); kickoff docs/kickoffs/v7.0.743-AGT-309-process-break-class.md.
--
-- THE DEFECT, measured live 2026-10-02 before any of this ran. AGT-309 itself was moved into the
-- executing Agent Training project by decision 35980d96 with a HAND-SET `need_source` -- no
-- `requirement-check` turn, no verdict, no score. `runner_decisions` rows quoting 874648b6: 0.
-- `AGT-160.need_score`: 3 with no decision behind it. `capability_skill_profiles where
-- capability_slug = 'requirement-check'`: Victoria holds 0 Knowledge rows, so the class she is
-- being asked to rule against existed nowhere she could read it. `scripts/agent-row-gate.js`
-- hardcoded `decisionNamesTicket: false`, so the CLI could not see the authority the ticket's own
-- row was citing. `requirement_gate()` read traceability only -- a well-formed citation written by
-- hand satisfied it.

-- =================================================================================================
-- (a) THE DOWN, CAPTURED FIRST -- before any statement below ran (kickoff T2 (a), runbook step 6).
-- =================================================================================================
--
--   select * from public.capture_migration_down(
--     'ada1326b-24a2-48a7-b909-3d3cca0a024c'::uuid, 'agt309_process_break_class',
--     '[{"kind":"function","identity":"public.requirement_gate()"},
--       {"kind":"function","identity":"public.apply_requirement_verdict(uuid, text, jsonb)"}]'::jsonb);
--   -- expect (agt309_process_break_class, auto-downable, 2, 0, <down sql>)
--
-- Both objects are FUNCTIONS this migration replaces in place, so both are auto-downable: the
-- captured `down sql` is the pair of `CREATE OR REPLACE` statements that put today's bodies back.
--
-- CARD-ONLY DOWN FOR THE DATA ROWS of (d), in reverse order -- they are INSERTs, so nothing in
-- `capture_migration_down()` derives them (H0):
--   1. delete from public.capability_skill_profiles where capability_slug = 'requirement-check' and skill_profile_slug = 'vc-process-break-class';
--   2. delete from public.skill_profiles where slug = 'vc-process-break-class';
--   3. delete from public.governance_rules where id = 'JOHN-1002-PROCESS-BREAK-CLASS';
-- or, equivalently and preferably, the one decision (d) records:
--   select * from public.reverse_decision('<the T2 (d) agent-row decision id>', 'John', '<why>');
--   -- all three images carry row_data NULL = "this row did not exist before" (SES-150), so the
--   -- reversal DELETES all three and leaves `requirement-check` with the one intent it has today.

-- =================================================================================================
-- (b) requirement_gate(): A MOVE INTO AN EXECUTING PROJECT NEEDS HER VERDICT (H1).
-- =================================================================================================
--
-- UPDATE-ONLY, and that is the Designer's recorded call (ii), not an oversight. An INSERT carrying a
-- traceable source stays accepted -- `tests/regression/agt-280-requirement-gate.test.mjs` arm A case
-- (ii) is exactly that path and is green today. What AGT-309 closes is the MOVE: a `discovered` row
-- already sitting on an intake or findings list, hand-stamped with a source and PATCHed onto an
-- executing project's epic. The three early returns above the clause stay: a NULL epic, an epic that
-- did not change, and `scope_origin = 'john-named'` (copied from `epic_lock_guard()` by AGT-280).

CREATE OR REPLACE FUNCTION public.requirement_gate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  IF NEW.epic_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.epic_id IS NOT DISTINCT FROM OLD.epic_id THEN RETURN NEW; END IF;
  IF coalesce(NEW.scope_origin, '') = 'john-named' THEN RETURN NEW; END IF;
  IF public.epic_project_executing(NEW.epic_id) AND NOT public.need_source_is_traceable(NEW.need_source) THEN
    RAISE EXCEPTION 'AGT-280: % has no traceable need source; it waits on the intake list', NEW.backlog_id
      USING errcode = 'check_violation';
  END IF;
  -- AGT-309: a MOVE into an executing project happens only on Victoria's recorded verdict. A
  -- traceable source written by hand is not a verdict (decision 35980d96 moved AGT-309 that way).
  IF TG_OP = 'UPDATE'
     AND public.epic_project_executing(NEW.epic_id)
     AND NOT EXISTS (SELECT 1 FROM public.runner_decisions d
                      WHERE d.kind = 'requirement-check'
                        AND d.backlog_id = NEW.backlog_id
                        AND d.reversed_at IS NULL) THEN
    RAISE EXCEPTION 'AGT-309: % moves into an executing project only on a requirement-check decision; it waits on the findings list', NEW.backlog_id
      USING errcode = 'check_violation';
  END IF;
  RETURN NEW;
END
$function$;

-- =================================================================================================
-- (c) apply_requirement_verdict(): HER PASS MAY ALSO HOME THE TICKET (H2).
-- =================================================================================================
--
-- ONE WRITER OF epic_id ON THIS PATH, which is AGT-280's own rule applied to AGT-309's new move: a
-- separate `home_requirement_ticket()` RPC was rejected for exactly that reason (harvest §6). The
-- before-image written above is the FULL ROW, so one `reverse_decision()` puts `epic_id` back with
-- the score. Signature UNCHANGED (`uuid, text, jsonb`), so `CREATE OR REPLACE` replaces in place and
-- there is no stale overload to drop (.claude/rules/supabase-function-signature.md) -- assert it
-- anyway, below.

CREATE OR REPLACE FUNCTION public.apply_requirement_verdict(p_cycle uuid, p_session text, p jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_verdict  text := lower(btrim(coalesce(p ->> 'verdict', '')));
  v_bid      text := btrim(coalesce(p ->> 'backlog_id', ''));
  v_src      text := p ->> 'need_source';
  v_reason   text := btrim(coalesce(p ->> 'reason', ''));
  v_score    smallint;
  v_ticket   public.backlog_items%rowtype;
  v_decision uuid;
  v_finding  uuid;
  v_proposal text;
  v_week     text := to_char(now(), 'IYYY-"W"IW');
  v_fp       text;
  -- AGT-309
  v_home     text;
  v_rc       int;
  v_epic     uuid;
begin
  -- Exactly one author, the same rule record_decision() and runner_before_images both carry.
  if (p_cycle is not null) = (p_session is not null) then
    raise exception 'apply_requirement_verdict: exactly one of p_cycle / p_session must be set -- a verdict has exactly one author';
  end if;
  if v_reason = '' then
    raise exception 'AGT-280: a requirement verdict carries its one-line reason';
  end if;

  if v_verdict = 'pass' then
    if v_bid = '' then
      raise exception 'AGT-280: a pass verdict names its backlog_id';
    end if;
    select * into v_ticket from public.backlog_items b where b.backlog_id = v_bid;
    if not found then
      raise exception 'AGT-280: no backlog_items row reads backlog_id %', v_bid;
    end if;

    if not public.need_source_is_traceable(v_src) then
      raise exception 'AGT-280: % cites no traceable need source (%); it waits on the intake list',
        v_bid, coalesce(v_src, '(none)') using errcode = 'check_violation';
    end if;

    begin
      v_score := (p ->> 'need_score')::smallint;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'AGT-280: need_score must be a whole number 1-5; got %',
        coalesce(p ->> 'need_score', '(none)') using errcode = 'check_violation';
    end;
    if v_score is null or v_score < 1 or v_score > 5 then
      raise exception 'AGT-280: need_score must be 1-5; got %',
        coalesce(v_score::text, '(none)') using errcode = 'check_violation';
    end if;

    v_decision := public.record_decision(
      p_cycle, p_session, 'requirement-check', v_ticket.backlog_id, v_ticket.title, v_reason,
      public.ladder_work_class(v_ticket.priority_class));

    -- THE IMAGE COMES BEFORE THE UPDATE. pk_value is the uuid (pattern:169), and backlog_items is
    -- in reversible_tables(), so this is a promise reverse_decision() can actually keep.
    insert into public.runner_before_images
      (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    values
      (p_cycle, p_session, 'backlog_items', v_ticket.id::text, to_jsonb(v_ticket), v_decision);

    update public.backlog_items
       set need_source = v_src, need_score = v_score
     where id = v_ticket.id;

    -- AGT-309: her pass may also HOME the ticket. The image above is the full row, so one
    -- reverse restores epic_id too. Both BEFORE triggers fire on this UPDATE: epic_lock_guard
    -- (AGT-240 — a locked list that does not accept findings refuses, and that refusal rolls this
    -- whole verdict back) and requirement_gate (the decision recorded above satisfies H1).
    v_home := btrim(coalesce(p ->> 'home_project', ''));
    if v_home <> '' then
      select count(*), min(e.id::text)::uuid into v_rc, v_epic
        from public.epics e join public.projects pj on pj.id = e.project_id
       where pj.slug = v_home and pj.status = 'executing';
      if v_rc <> 1 then
        raise exception 'AGT-309: home_project % is not one executing project with one epic', v_home
          using errcode = 'check_violation';
      end if;
      update public.backlog_items set epic_id = v_epic, updated_at = now() where id = v_ticket.id;
    end if;

    return v_decision;

  elsif v_verdict = 'not-needed' then
    -- NO ticket row is written. The proposal is LISTED as her ruling, so a cold future session
    -- finds why it was refused (pattern:92).
    v_proposal := btrim(coalesce(p ->> 'proposal', p ->> 'title', ''));
    if v_proposal = '' then
      raise exception 'AGT-280: a not-needed verdict names the proposal it refused';
    end if;
    v_fp := 'agt-280:not-needed:' || encode(sha256(convert_to(v_proposal, 'utf8')), 'hex');

    insert into public.audit_findings
      (fingerprint, iso_week, kind, family, finding_type, status, confidence, locations,
       governing_fact, proposed_resolution, ruling, ruled_by, found_by, ruled_at, cycle_id)
    values
      (v_fp, v_week, 'other', 'other', 'proposal', 'listed', 'high',
       jsonb_build_array(v_proposal),
       coalesce(nullif(btrim(coalesce(v_src, '')), ''), '(no source cited)'),
       v_reason, v_reason, 'victoria', 'victoria', now(), p_cycle)
    on conflict (fingerprint, iso_week) do nothing
    returning id into v_finding;

    -- audit_findings is append-only (AGT-70), so a re-ruling of the same proposal in the same week
    -- returns the handle already on the board rather than raising.
    if v_finding is null then
      select f.id into v_finding from public.audit_findings f
       where f.fingerprint = v_fp and f.iso_week = v_week;
    end if;
    return v_finding;

  else
    raise exception 'AGT-280: verdict must be pass or not-needed; got %',
      coalesce(p ->> 'verdict', '(none)');
  end if;
end
$function$;

-- ONE OF EACH, ASSERTED RATHER THAN ASSUMED (.claude/rules/supabase-function-signature.md). Neither
-- signature changed, so neither can have grown an overload -- which is exactly the claim to check,
-- not to state:
--   select p.proname, count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname in ('requirement_gate','apply_requirement_verdict')
--    group by p.proname;
--   -- expect requirement_gate 1, apply_requirement_verdict 1

-- =================================================================================================
-- (d) THE RULE ROW, THE KNOWLEDGE ROW AND THE LINK -- one DO block, one decision, three images (H3).
-- =================================================================================================
--
-- THE RULING IS READ BACK FROM THE DECISION, NEVER RETYPED. `v_rule` is a substring of 874648b6's
-- own `reasoning` column, and the block RAISES if it does not read back -- so the rule row cannot
-- quietly hold a paraphrase of John's words (CLAUDE.md: verify, never assert from memory).
--
-- AUTHORITY FOR WRITING AN AGENT ROW (AGENT-ROW-AGREED-TICKET): AGT-309's own row cites
-- `need_source = john:runner_decisions:874648b6` (unreversed) and decision 6a24f412 names this
-- change, so `scripts/agent-row-gate.js --ticket=AGT-309 --action=edit-active` answers `build` --
-- build work with a before-image, not an approval card. Run live at this ship:
--   agent-row-gate: AGT-309 . action=edit-active . scope_origin="discovered" -> BUILD
--     ... . need_source=john:runner_decisions:874648b6-c254-4a1f-b152-5d94d6b28b72 (unreversed John decision)

do $$
declare
  cyc constant uuid := 'ada1326b-24a2-48a7-b909-3d3cca0a024c';
  d uuid; v_rule text; v_method text; v_sp text; v_link text;
begin
  select substring(reasoning from 'My decisioning is that.*?for a routine to pick up\.') into v_rule
    from public.runner_decisions where id = '874648b6-c254-4a1f-b152-5d94d6b28b72';
  if v_rule is null or v_rule not like 'My decisioning is that%' then
    raise exception 'AGT-309: the ruling sentence did not read back from 874648b6';
  end if;
  v_rule := v_rule || ' - John 2026-10-02 (decision 874648b6); verified before it enters: Victoria''s requirement-check pass (decision 6a24f412).';
  v_method := v_rule || E'\n\nA ticket citing john:runner_decisions:874648b6-c254-4a1f-b152-5d94d6b28b72 is in the class only when its own text shows BOTH: an agent breaking the ticket writing and review process, AND a less important ticket developed over a higher-priority one. In class: pass, need_score 5. Either half missing: not-needed - the ruling is not a general licence to move discovered tickets into executing projects.';

  d := public.record_decision(cyc, null, 'agent-row', 'AGT-309',
    'AGT-309: the process-break class recorded as rule JOHN-1002-PROCESS-BREAK-CLASS and as Victoria''s inline Knowledge on requirement-check',
    'AGT-309 (a). Authority (AGENT-ROW-AGREED-TICKET): AGT-309 cites need_source john:runner_decisions:874648b6 (unreversed) and decision 6a24f412 names this change; scripts/agent-row-gate.js --ticket=AGT-309 --action=edit-active answered build. Three INSERTs, each imaged with row_data NULL. Undo: reverse this decision.',
    public.ladder_work_class('P10 - Tooling'));

  insert into public.governance_rules (id, statement, canonical_doc, enforcement, status, superseded_by, source_group)
  values ('JOHN-1002-PROCESS-BREAK-CLASS', v_rule, 'docs/WORKING-WITH-JOHN.md#decision-authority-matrix', 'script', 'live', null, 'claude-md-hard-rules');
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values (cyc, null, 'governance_rules', 'JOHN-1002-PROCESS-BREAK-CLASS', null, d);

  insert into public.skill_profiles
    (slug, name, description, skill_type_slug, objective, method, traits, guardrails, technical_services,
     execution_type, tenant_id, llm_provider, llm_model, max_tokens, api_key_source, temperature)
  values
    ('vc-process-break-class', 'Process-Break Class',
     'John''s 2026-10-02 ruling on process-break fixes, held as the class test a requirement-check turn applies to the cited need.',
     'knowledge', 'John''s process-break class (JOHN-1002-PROCESS-BREAK-CLASS)', v_method,
     '{"source":"inline"}'::jsonb, '{"must":[],"must_not":[]}'::jsonb, '[]'::jsonb,
     'ai', null, 'anthropic', 'claude-fable-5-1', 4000, 'platform', null)
  returning id::text into v_sp;
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values (cyc, null, 'skill_profiles', v_sp, null, d);

  insert into public.capability_skill_profiles (capability_slug, skill_profile_slug, level, is_required, display_order)
  values ('requirement-check', 'vc-process-break-class', 3, true, 3)
  returning id::text into v_link;
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values (cyc, null, 'capability_skill_profiles', v_link, null, d);
end $$;

-- THREE COLUMN VALUES THAT ARE DELIBERATE AND WOULD BE WRONG IF "TIDIED" (H3's own notes):
--   * `llm_model` is set EXPLICITLY because the column DEFAULT is `claude-haiku-4-5-20251001` --
--     the model AGT-287 / AGT-307 say retires 2026-10-15 with no same-family replacement in the
--     catalog. A Knowledge row inheriting that default ships a known-retiring id.
--   * `temperature` stays NULL (docs/STANDARDS.md Section 12's companion check,
--     `NO_TEMPERATURE_PREFIXES`).
--   * `traits.source = 'inline'` is what makes api/prompt/db-assembly.js render `method` INTO the
--     prompt (SES-341). Without it the row assembles and renders EMPTY -- the failure mode is a
--     turn that silently never saw the class, which is why it is asserted rather than trusted:
--     `scripts/requirement-check.js --prepare --ticket=AGT-160 --source=<SRC> --json` must print
--     the class text inside its assembled prompt (kickoff §6 check 4).

-- =================================================================================================
-- (e) THE REPO COPY. The snapshot export is where the new rule row lands in git:
--       node scripts/export-governance-snapshot.js
-- =================================================================================================
