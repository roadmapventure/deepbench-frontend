-- AGT-424 (v7.0.887) -- AN UNROUTABLE FINDING IS COVERED, NEVER OMITTED.
--
-- THE DEFECT, measured live 2026-10-23 on the unchanged tree (kickoff section 2). validateReview()
-- calls routeGroup() only inside anchor 1 (scripts/audit-review.js L492), under `files` (L455) -- a
-- root-cause group without reuse_backlog_id, or a cleanup. public.finding_group_epic() is the same
-- shape. So an open finding whose source has no public.finding_routes row (AGT-380, still open)
-- CAN be covered: by any group that files no ticket. But anchor 3's coverage rule (L534) refuses
-- every omitted open finding with the bare text `finding <id> not covered`, and nothing -- not the
-- refusal, not the runbook, not either review Skill -- told the reviewing agent that the way out is
-- a non-filing group. The agent's only written instruction was `A source with no route stops the
-- review; say so in summary_for_john.`, which reads as a dead end it cannot discharge.
--
-- WHAT THIS MIGRATION SHIPS. DATA only (pattern:2, pattern:8), two rows, one UPDATE each, no DDL:
-- the one sentence above is replaced, in public.skill_profiles.method, by the sentence that names
-- the dispositions. Both review Skills carry it, because one change lands in every home it has
-- (pattern:163):
--   84c096ec-0c5a-41a7-abef-e51ee440a4d9  ga-review-intent         (Governance Architect)
--   a6d3568f-3a39-44ff-a2b9-0aa62035281e  dm-audit-review-intent   (Development Manager)
-- routeGroup()'s own throw text and public.finding_group_epic() keep their words -- the route gate
-- is not what is wrong; the silence about the way out is (designer's call (1), kickoff section 2).
--
-- THE DESIGNER'S CALLS (JOHN-0925-DESIGNER-DECIDES, reversible, kickoff section 2): (1) the router
-- and the SQL function keep their texts and validateReview() gains a route-gated clause; (2) the
-- runbook home is docs/runbooks/auditor-routine.md step 4 only; (3) both rows, one migration, two
-- undos.
--
-- WHY THE BEFORE-IMAGES ARE THIS MIGRATION'S DOWN. public.capture_migration_down() RAISES on an
-- empty object array (asserted against the live function body this cycle: `if p_objects is null or
-- jsonb_typeof(p_objects) <> 'array' or jsonb_array_length(p_objects) = 0 then raise exception`),
-- and this migration creates and changes NO database object -- no table, no view, no function. So
-- there is nothing for it to capture and the undo is the pair below, taken BEFORE each UPDATE and
-- in this order: one public.record_decision() of kind `agent-row` under AGT-424, then a FULL-ROW
-- public.runner_before_images insert carrying to_jsonb(sp) under that decision's id, cycle_id set
-- and session_name NULL -- never both. Two rows, two decisions, two images, two independent undos:
-- `select * from public.reverse_decision('<decision id>', 'John', '<why>');` puts either row back
-- whole. Same shape as AGT-487 (v7.0.862) and AGT-490 (v7.0.866).
--
-- No function is created or changed here, so .claude/rules/supabase-column-grants.md's EXECUTE
-- revoke (PUBLIC, anon, authenticated by name) has no subject in this migration.
--
-- THE GATE. The trailing `do $gate$` RAISEs unless BOTH rows now hold the new sentence EXACTLY ONCE
-- (once, not "contains": a second apply would read as a pass on an .includes() check), hold the old
-- sentence ZERO times, and are covered by exactly two AGT-424 `agent-row` decisions carrying exactly
-- two skill_profiles before-images under this cycle. A migration's success flag proves nothing
-- (.claude/rules/supabase-column-grants.md).

do $$
declare
  c_cycle  constant uuid := 'b490db36-7aea-4b26-b1c5-1dfb635f4293';
  c_old    constant text := $old$A source with no route stops the review; say so in summary_for_john.$old$;
  c_disp   constant text := $disp$cover it with a group that files no ticket (carry, escalate, not-a-defect, list, or root-cause with reuse_backlog_id) and name it in summary_for_john; never omit it -- the coverage rule refuses an omission$disp$;
  c_ids    constant text[] := array['84c096ec-0c5a-41a7-abef-e51ee440a4d9',
                                    'a6d3568f-3a39-44ff-a2b9-0aa62035281e'];
  v_new    text;
  v_id     text;
  v_slug   text;
  v_method text;
  v_hits   integer;
  d        uuid;
begin
  v_new := 'An open finding whose source has no route cannot be ticketed; ' || c_disp || '.';

  foreach v_id in array c_ids loop
    select sp.slug, sp.method into v_slug, v_method
    from public.skill_profiles sp where sp.id = v_id::uuid;
    if v_slug is null then
      raise exception 'AGT-424: no skill_profiles row reads id %', v_id;
    end if;

    -- The STOP LINE (kickoff section 7): the old sentence must sit EXACTLY ONCE in each row.
    v_hits := (length(v_method) - length(replace(v_method, c_old, ''))) / length(c_old);
    if v_hits <> 1 then
      raise exception 'AGT-424: row % (%) must hold the old sentence exactly once; holds % time(s)',
        v_id, v_slug, v_hits;
    end if;

    -- The DOWN, first and in this order: the decision, then the full-row image under it.
    d := public.record_decision(
      c_cycle, NULL, 'agent-row', 'AGT-424',
      v_slug || ': an unroutable finding is covered, never omitted',
      $why$AGT-424, JOHN-0925-DESIGNER-DECIDES (reversible): validateReview() routes only a group that FILES a ticket, so an open finding whose source has no finding_routes row (AGT-380, open) is coverable by any non-filing group -- but the coverage rule refused the omission in bare words and this Skill told the agent only that such a source stops the review. The sentence now names the five dispositions that discharge it. Narrowest layer that works: Supabase content, not the harness (pattern:8); both review Skills carry the same sentence in one migration (pattern:163).$why$,
      public.ladder_work_class('P10 - Tooling'));

    insert into public.runner_before_images
      (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    select c_cycle, NULL, 'skill_profiles', sp.id::text, to_jsonb(sp), d
    from public.skill_profiles sp where sp.id = v_id::uuid;

    -- THE ONE EDIT per row: the kickoff section 4's own text, in place of the old sentence.
    update public.skill_profiles
    set method = replace(method, c_old, v_new), updated_at = now()
    where id = v_id::uuid;

    raise notice 'AGT-424: % (%) decision %, before-image taken, sentence replaced', v_slug, v_id, d;
  end loop;
end $$;

do $gate$
declare
  c_cycle    constant uuid := 'b490db36-7aea-4b26-b1c5-1dfb635f4293';
  c_old      constant text := $old$A source with no route stops the review; say so in summary_for_john.$old$;
  c_disp     constant text := $disp$cover it with a group that files no ticket (carry, escalate, not-a-defect, list, or root-cause with reuse_backlog_id) and name it in summary_for_john; never omit it -- the coverage rule refuses an omission$disp$;
  c_ids      constant text[] := array['84c096ec-0c5a-41a7-abef-e51ee440a4d9',
                                      'a6d3568f-3a39-44ff-a2b9-0aa62035281e'];
  v_new      text;
  v_rows     integer;
  v_new_once integer;
  v_old_any  integer;
  v_decs     integer;
  v_images   integer;
begin
  v_new := 'An open finding whose source has no route cannot be ticketed; ' || c_disp || '.';

  select count(*) into v_rows
  from public.skill_profiles sp where sp.id::text = any(c_ids);
  if v_rows <> 2 then
    raise exception 'AGT-424 gate: both skill_profiles rows must exist; found %', v_rows;
  end if;

  select count(*) into v_new_once
  from public.skill_profiles sp
  where sp.id::text = any(c_ids)
    and (length(sp.method) - length(replace(sp.method, v_new, ''))) / length(v_new) = 1;
  if v_new_once <> 2 then
    raise exception 'AGT-424 gate: the new sentence must sit exactly once in BOTH rows; % of 2 rows hold it once',
      v_new_once;
  end if;

  select count(*) into v_old_any
  from public.skill_profiles sp
  where sp.id::text = any(c_ids) and position(c_old in sp.method) > 0;
  if v_old_any <> 0 then
    raise exception 'AGT-424 gate: the old sentence must be gone from both rows; % row(s) still hold it', v_old_any;
  end if;

  select count(*) into v_decs
  from public.runner_decisions d
  where d.cycle_id = c_cycle and d.kind = 'agent-row' and d.backlog_id = 'AGT-424';
  if v_decs <> 2 then
    raise exception 'AGT-424 gate: exactly TWO agent-row decisions under AGT-424 for this cycle; found %', v_decs;
  end if;

  select count(*) into v_images
  from public.runner_before_images i
  join public.runner_decisions d on d.id = i.decision_id
  where i.cycle_id = c_cycle and i.table_name = 'skill_profiles'
    and d.kind = 'agent-row' and d.backlog_id = 'AGT-424'
    and i.pk_value = any(c_ids);
  if v_images <> 2 then
    raise exception 'AGT-424 gate: exactly TWO skill_profiles before-images under those decisions; found %', v_images;
  end if;

  raise notice 'AGT424_OK: 2 rows, new sentence once each, old sentence 0, % decisions, % before-images',
    v_decs, v_images;
end $gate$;
