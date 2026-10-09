-- DeepBench v7.0.836 | docs/design/agt-445-cap-ruling.sql | AGT-445 -- capped-ticket ruling: split into a scoped drain, or waive for one build.
--
-- AGT-445 (v7.0.836), step 1 of 4 of the cap-split rule. A ticket over the 3-file / 4-task cap gets
-- a ruling from the Development Manager: WAIVE the cap for one build, or SPLIT it into parts that
-- run in succession as one drain. public.rule_capped_ticket() records that ruling as a reversible
-- ticket-scope decision and, on a split, declares ONE drain-epic directive over exactly the parts --
-- the scoped exception to drain_epic_next() property 5 that rule DRAIN-CAP-SPLIT names. Nothing
-- calls it yet (AGT-448 wires the Designer's stop; AGT-446 / AGT-447 carry the pattern and runbook).
--
-- MIRROR of the migration `agt445_cap_ruling`, applied via mcp Supabase `apply_migration` (which
-- wraps the whole file in ONE transaction, so no BEGIN/COMMIT here -- and so the trailing GATE's
-- RAISE rolls every statement below back). Kickoff: docs/kickoffs/v7.0.836-AGT-445-cap-ruling.md.
--
-- =================================================================================================
-- THE DOWN, CAPTURED FIRST -- before any statement below ran (runbook step 6).
-- =================================================================================================
--
--   select * from public.capture_migration_down('01a2d19c-5d03-4060-8b4d-9aa8f693ca37', 'agt445_cap_ruling',
--     '[{"kind":"function","identity":"public.rule_capped_ticket(text, text, text, text[], uuid, text)"}]'::jsonb);
--
-- RESULT (measured by the builder, cycle 01a2d19c, 2026-10-09, before any statement below ran):
-- captured_up_name agt445_cap_ruling, captured_class auto-downable, objects_captured 1, refusals 0,
-- derived_down_sql `drop function if exists public.rule_capped_ticket(text, text, text, text[], uuid, text);`
-- (runner_migration_downs a6ca6892-dd6e-4d4b-a7b3-22b3053363b8). The function is new, so its down
-- is the drop. The DRAIN-CAP-SPLIT registry row is a data write, not DDL: its down is
-- reverse_decision() on the rule decision (e0b4fafe-b342-460e-afec-ae72b0254f86), whose NULL
-- before-image (2ff9a57f-7918-4c5c-a543-3220d549f279) deletes the row.
--
-- Before T1, measured live: drain_epic_next('01a2d19c-...') returned `none` (no queued drain), and
-- calling rule_capped_ticket raised 42883 (function does not exist).
--
-- =================================================================================================
-- MD5 OF THE LIVE OBJECT, as the database renders it back. Read with:
--   select md5(pg_get_functiondef('public.rule_capped_ticket(text,text,text,text[],uuid,text)'::regprocedure));
-- =================================================================================================
--
--   AFTER (measured by the builder post-apply, 2026-10-09): 73602fb715fdefcffba2963b6af81b69
--   Asserted with it, independently of the GATE's success flag: overloads in public = 1;
--   has_function_privilege anon / authenticated EXECUTE = false / false; prosecdef = false
--   (SECURITY INVOKER); governance_rules DRAIN-CAP-SPLIT = live / script / runner-gov-register.
--
-- =================================================================================================
-- THE MIGRATION, BYTE-IDENTICAL TO WHAT WAS APPLIED
-- =================================================================================================

-- DeepBench v7.0.836 | migration agt445_cap_ruling | AGT-445 -- capped-ticket ruling: split into a scoped drain, or waive for one build.
-- The function, its grants, and the DRAIN-CAP-SPLIT registry row under one rule decision. Rolls back
-- unless the trailing GATE passes. DOWN captured first (cycle 01a2d19c, auto-downable, 1 object).

CREATE OR REPLACE FUNCTION public.rule_capped_ticket(
  p_backlog_id   text,
  p_ruling       text,
  p_reason       text,
  p_parts        text[] DEFAULT NULL,
  p_cycle_id     uuid   DEFAULT NULL,
  p_session_name text   DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public, pg_catalog
AS $function$
-- AGT-445 (v7.0.836). THE DEVELOPMENT MANAGER'S CAP RULING. A ticket over the 3-file / 4-task cap is
-- either WAIVED for one build (a ticket-scope decision, nothing else written) or SPLIT into parts
-- that already exist on the board: the parts are chained by blocked_by, given the parent's
-- need_score and priority_class, the parent goes partial behind the last part, and ONE drain-epic
-- directive is declared over exactly the parts. That declaration is the single scoped exception to
-- drain_epic_next() property 5 (rule DRAIN-CAP-SPLIT); every other drain stays John's alone.
-- Every write carries a runner_before_images row under the one decision, so reverse_decision()
-- undoes the whole ruling. All validation runs before the first write.
declare
  v_ruling  text := lower(btrim(coalesce(p_ruling, '')));
  v_n       int  := coalesce(cardinality(p_parts), 0);
  v_parent  public.backlog_items%rowtype;
  v_part    public.backlog_items%rowtype;
  v_prev    uuid;
  v_dec     uuid;
  v_dir     uuid;
  v_sid     uuid;
  v_images  int := 0;
  v_hit     uuid;
  i         int;
begin
  -- 1. One author.
  if (p_cycle_id is not null) = (p_session_name is not null) then
    raise exception 'rule_capped_ticket: exactly one of p_cycle_id / p_session_name must be set -- a ruling has exactly one author';
  end if;
  -- 2. The ruling.
  if v_ruling not in ('split', 'waive') then
    raise exception 'rule_capped_ticket: ruling must be split or waive; got %', coalesce(p_ruling, '(none)');
  end if;
  -- 3. The reason.
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'rule_capped_ticket: a cap ruling needs a reason';
  end if;
  -- 4. A waiver names no parts.
  if v_ruling = 'waive' and v_n > 0 then
    raise exception 'rule_capped_ticket: waive takes no parts; got %', array_to_string(p_parts, ', ', '(null)');
  end if;
  -- 5. A split names at least two distinct parts, none of them the parent.
  if v_ruling = 'split' and (
       v_n < 2
       or (select count(distinct x) from unnest(p_parts) x) <> v_n
       or array_position(p_parts, NULL) is not null
       or p_backlog_id = any (p_parts)) then
    raise exception 'rule_capped_ticket: a split names at least two parts, distinct, none of them null or the parent %; got %',
      p_backlog_id, coalesce(array_to_string(p_parts, ', ', '(null)'), '(none)');
  end if;
  -- 6. The parent exists and is still work.
  select * into v_parent from public.backlog_items b where b.backlog_id = p_backlog_id for update;
  if not found then
    raise exception 'rule_capped_ticket: no backlog_items row reads backlog_id %', coalesce(p_backlog_id, '(none)');
  end if;
  if v_parent.status in ('done', 'removed', 'delivered') then
    raise exception 'rule_capped_ticket: % is % -- a finished ticket takes no cap ruling', p_backlog_id, v_parent.status;
  end if;

  if v_ruling = 'split' then
    -- 7. Only a scored parent may hand its score down.
    if coalesce(v_parent.need_score, -1) < 3 then
      raise exception 'rule_capped_ticket: % has need_score % -- score the parent first (3 or more) so its parts are pickable',
        p_backlog_id, coalesce(v_parent.need_score::text, 'NULL');
    end if;
    -- 8. Every part exists, is open, sits in the parent's epic, and is in no queued directive's scope.
    for i in 1 .. v_n loop
      select * into v_part from public.backlog_items b where b.backlog_id = p_parts[i] for update;
      if not found then
        raise exception 'rule_capped_ticket: no backlog_items row reads backlog_id % -- file the parts first', p_parts[i];
      end if;
      if v_part.status <> 'open' then
        raise exception 'rule_capped_ticket: part % is % -- a part must be open', p_parts[i], v_part.status;
      end if;
      if v_part.epic_id is distinct from v_parent.epic_id or v_parent.epic_id is null then
        raise exception 'rule_capped_ticket: part % must sit in the same epic as % (the drain names one epic)', p_parts[i], p_backlog_id;
      end if;
      select s.directive_id into v_hit
        from public.runner_drain_scope s
        join public.runner_directives d on d.id = s.directive_id
       where s.item_id = v_part.id and d.status = 'queued'
       limit 1;
      if v_hit is not null then
        raise exception 'rule_capped_ticket: part % is already in queued directive %''s scope', p_parts[i], v_hit;
      end if;
    end loop;
  end if;

  -- The decision. One handle for every write below.
  v_dec := public.record_decision(
    p_cycle_id, p_session_name, 'ticket-scope', p_backlog_id,
    case when v_ruling = 'waive'
         then 'cap ruling: waive ' || p_backlog_id || ' for one build'
         else 'cap ruling: split ' || p_backlog_id || ' into ' || array_to_string(p_parts, ' -> ') end,
    p_reason);

  if v_ruling = 'waive' then
    return jsonb_build_object('decision_id', v_dec, 'ruling', 'waive');
  end if;

  -- The parts, in order: part 1 inherits the parent's blocker, part i waits on part i-1.
  v_prev := v_parent.blocked_by;
  for i in 1 .. v_n loop
    select * into v_part from public.backlog_items b where b.backlog_id = p_parts[i];
    insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    values (p_cycle_id, p_session_name, 'backlog_items', v_part.id::text, to_jsonb(v_part), v_dec);
    v_images := v_images + 1;
    update public.backlog_items
       set need_score = v_parent.need_score,
           priority_class = v_parent.priority_class,
           blocked_by = v_prev,
           updated_at = now()
     where id = v_part.id;
    v_prev := v_part.id;
  end loop;

  -- The parent: partial, and blocked by the last part so a partial parent is never re-picked.
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values (p_cycle_id, p_session_name, 'backlog_items', v_parent.id::text, to_jsonb(v_parent), v_dec);
  v_images := v_images + 1;
  update public.backlog_items
     set status = 'partial', blocked_by = v_prev, updated_at = now()
   where id = v_parent.id;

  -- The one drain (rule DRAIN-CAP-SPLIT), over exactly the parts.
  v_dir := gen_random_uuid();
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values (p_cycle_id, p_session_name, 'runner_directives', v_dir::text, NULL, v_dec);
  v_images := v_images + 1;
  insert into public.runner_directives (id, type, status, epic_id, body)
  values (v_dir, 'drain-epic', 'queued', v_parent.epic_id,
          'CAP-SPLIT DRAIN (rule DRAIN-CAP-SPLIT): ' || p_backlog_id || ' -> ' || array_to_string(p_parts, ', ')
          || '; decision ' || v_dec::text);

  for i in 1 .. v_n loop
    select * into v_part from public.backlog_items b where b.backlog_id = p_parts[i];
    v_sid := gen_random_uuid();
    insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    values (p_cycle_id, p_session_name, 'runner_drain_scope', v_sid::text, NULL, v_dec);
    v_images := v_images + 1;
    insert into public.runner_drain_scope (id, directive_id, item_id, backlog_id)
    values (v_sid, v_dir, v_part.id, v_part.backlog_id);
  end loop;

  return jsonb_build_object('decision_id', v_dec, 'ruling', 'split', 'directive_id', v_dir,
                            'parts', to_jsonb(p_parts), 'images', v_images);
end
$function$;

COMMENT ON FUNCTION public.rule_capped_ticket(text, text, text, text[], uuid, text) IS 'AGT-445: capped-ticket ruling; rule DRAIN-CAP-SPLIT.';
REVOKE ALL ON FUNCTION public.rule_capped_ticket(text, text, text, text[], uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rule_capped_ticket(text, text, text, text[], uuid, text) TO service_role;

-- The registry row: property 5's scoped exception, under one rule decision with its NULL image.
do $rule$
declare
  v_r uuid;
begin
  v_r := public.record_decision('01a2d19c-5d03-4060-8b4d-9aa8f693ca37', NULL, 'rule', 'AGT-445',
    'DRAIN-CAP-SPLIT: property 5 scoped exception',
    'John 2026-10-09: "the dev manager is supposed to be asked to come in and give advice, especially to override and let the ticket be built in one build and not split because of the 3 file rule." and "part of the ruling to allow splits, is that however many tickets it creates, they are run in succession until the original goal/funcitonality is complete."');
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values ('01a2d19c-5d03-4060-8b4d-9aa8f693ca37', NULL, 'governance_rules', 'DRAIN-CAP-SPLIT', NULL, v_r);
  insert into public.governance_rules (id, statement, canonical_doc, enforcement, status, source_group)
  values ('DRAIN-CAP-SPLIT',
    'drain_epic_next() property 5 has one scoped exception: a cap ruling may declare ONE drain via public.rule_capped_ticket() over exactly its parts in the parent''s epic, chained by blocked_by, each with the parent''s need_score and priority_class, the parent partial until the last part ships. Any other drain is John''s alone. John 2026-10-09: "they are run in succession until the original goal/funcitonality is complete."',
    'docs/design/agt-445-cap-ruling.sql', 'script', 'live', 'runner-gov-register');
end
$rule$;

-- GATE. Every arm must hold or this DO raises and the whole migration rolls back.
do $gate$
declare
  v_n int;
begin
  select count(*) into v_n
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'rule_capped_ticket';
  if v_n <> 1 then
    raise exception 'AGT-445 GATE: rule_capped_ticket has % overloads in public (expected 1)', v_n;
  end if;
  if has_function_privilege('anon', 'public.rule_capped_ticket(text, text, text, text[], uuid, text)', 'execute')
     or has_function_privilege('authenticated', 'public.rule_capped_ticket(text, text, text, text[], uuid, text)', 'execute') then
    raise exception 'AGT-445 GATE: anon or authenticated can execute rule_capped_ticket -- the REVOKE did not take';
  end if;
  if not has_function_privilege('service_role', 'public.rule_capped_ticket(text, text, text, text[], uuid, text)', 'execute') then
    raise exception 'AGT-445 GATE: service_role cannot execute rule_capped_ticket';
  end if;
  if not exists (select 1 from public.governance_rules where id = 'DRAIN-CAP-SPLIT' and status = 'live') then
    raise exception 'AGT-445 GATE: DRAIN-CAP-SPLIT is not a live governance_rules row';
  end if;
  if not exists (select 1 from public.runner_before_images
                  where table_name = 'governance_rules' and pk_value = 'DRAIN-CAP-SPLIT'
                    and row_data is null and decision_id is not null) then
    raise exception 'AGT-445 GATE: DRAIN-CAP-SPLIT has no NULL before-image under a decision';
  end if;
  raise notice 'AGT-445 GATE: passed -- 1 overload; anon/authenticated lack EXECUTE; DRAIN-CAP-SPLIT live with its NULL image.';
end
$gate$;
