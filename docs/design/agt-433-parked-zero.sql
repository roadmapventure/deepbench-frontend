-- AGT-433 (v7.0.826), slice 1 of 2 -- NEED_SCORE 0 = PARKED. A ticket John has judged valid but
-- early ("PARKED (0) until project P is active") could not be recorded as a 0: the CHECK
-- `ck_backlog_need_score` and the writer `apply_requirement_verdict()` both took 1-5 only, so the
-- two live cases were stood in at 1 -- a score that means "needed, barely" and lets the pick
-- consider them. This slice widens both to 0-5 and re-scores the two rows through the writer.
-- Slice 2 is `scripts/requirement-check.js`'s two `score < 1` validators and their two tests.
--
-- MIRROR of the migration `agt433_parked_zero`, applied via mcp Supabase `apply_migration` (which
-- wraps the whole file in ONE transaction, so no BEGIN/COMMIT here -- and so the trailing GATE's
-- RAISE rolls every statement below back). Kickoff:
-- docs/kickoffs/v7.0.826-AGT-433-parked-zero.md; reasoning: docs/harvests/AGT-433.md.
--
-- =================================================================================================
-- THE DOWN, CAPTURED FIRST -- before any statement below ran (runbook step 6).
-- =================================================================================================
--
--   select * from public.capture_migration_down('7a6578ed-db8b-452e-977b-c73e7cce550f', 'agt433_parked_zero',
--     '[{"kind":"function","identity":"public.apply_requirement_verdict(uuid, text, jsonb)"}]'::jsonb);
--   -- expect (agt433_parked_zero, auto-downable, 1 captured, 0 refusals, <down sql>)
--
-- RESULT (measured by the orchestrator, cycle 7a6578ed, 2026-10-09, before any statement below
-- ran): captured_up_name agt433_parked_zero, captured_class auto-downable, objects_captured 1,
-- refusals 0. The derived down sql is the one CREATE OR REPLACE that puts the BEFORE body back,
-- plus a trailing DO that drops any other overload and asserts exactly one remains.
--
-- The function is replaced IN PLACE, so it is auto-downable: the captured `down sql` is the one
-- `CREATE OR REPLACE` that puts today's body (md5 below) back.
--
-- CARD-ONLY DOWN FOR (a). The CHECK change is an in-place `ALTER TABLE ... DROP/ADD CONSTRAINT`,
-- which `capture_migration_down()` derives nothing for and refuses by design -- so (a)'s reversal
-- is disclosed here and carried on a card, never implied by the capture's count of 1:
--   alter table public.backlog_items drop constraint ck_backlog_need_score;
--   alter table public.backlog_items add constraint ck_backlog_need_score
--     check (need_score is null or (need_score >= 1 and need_score <= 5));
-- Reversing (a) alone would leave the writer accepting a 0 the table then refuses with 23514, and
-- reversing (a) while the two re-scored rows still read 0 would fail the ADD outright: reverse the
-- two RESCORE decisions (`reverse_decision()`, one per row) BEFORE re-adding the 1-5 constraint.
--
-- =================================================================================================
-- MD5 OF THE LIVE OBJECT, as the database renders it back -- proof that this file and the database
-- state one text rather than a claim about it. Read with:
--   select md5(pg_get_functiondef('public.apply_requirement_verdict(uuid,text,jsonb)'::regprocedure));
-- =================================================================================================
--
--   BEFORE (read live 2026-10-09, this cycle, on the unchanged database): 8609d78628c90c98fe43080f48bc8309
--   AFTER  (measured by the orchestrator post-apply, 2026-10-09): 87a58305d08b12b6eec33edc437dfb0e
--          The builder's prediction, made from (b) as written below without applying it, was the
--          same value, so there is no difference and no finding on that account. Asserted with it:
--          ck_backlog_need_score reads CHECK (need_score IS NULL OR (need_score >= 0 AND
--          need_score <= 5)), pg_proc count for apply_requirement_verdict in public = 1, and the
--          live body contains `v_score < 0`. The GATE below passed inside the migration; these
--          four reads are the independent re-assertion the success flag is never trusted for
--          (.claude/rules/supabase-column-grants.md).
--
-- The three anchor literals were confirmed present in the live body THIS cycle before any edit
-- (kickoff T1's STOP condition), and (b) below is that live body with exactly three substitutions
-- and no other byte changed:
--   'need_score must be a whole number 1-5'  ->  '... whole number 0-5'
--   'if v_score is null or v_score < 1 or v_score > 5 then'  ->  '... v_score < 0 ...'
--   'need_score must be 1-5'  ->  'need_score must be 0-5'
-- No DROP FUNCTION: the identity argument list `(uuid, text, jsonb)` is unchanged, so there is no
-- second overload to strip (.claude/rules/supabase-function-signature.md). The GATE asserts the
-- count is 1 anyway rather than reasoning that it must be.
--
-- The lone `;` after `$function$` is the CREATE statement's terminator, kept on its own line so
-- that (b) is byte-identical to the text `pg_get_functiondef` returns.
--
-- =================================================================================================
-- THE MIGRATION, BYTE-IDENTICAL TO WHAT WAS APPLIED
-- =================================================================================================

-- DeepBench v7.0.826 | migration agt433_parked_zero | AGT-433 slice 1 of 2
-- need_score 0 = PARKED: the CHECK and the writer both accept 0-5. Rolls back unless the
-- trailing GATE passes. DOWN captured first (/tmp/agt433-down.sql); MIG(a) is an in-place
-- ALTER that capture_migration_down() refuses by design -- card-only.

-- (a) the CHECK: 1-5 -> 0-5
alter table public.backlog_items drop constraint ck_backlog_need_score;
alter table public.backlog_items add constraint ck_backlog_need_score check (need_score is null or need_score between 0 and 5);

-- (b) the writer, from live pg_get_functiondef('public.apply_requirement_verdict(uuid,text,jsonb)'::regprocedure)
--     read 2026-10-09 (md5 8609d78628c90c98fe43080f48bc8309), with exactly three edits:
--     'whole number 1-5' -> 'whole number 0-5'; 'v_score < 1' -> 'v_score < 0'; 'must be 1-5' -> 'must be 0-5'.
--     No DROP: the identity argument list is unchanged (.claude/rules/supabase-function-signature.md).
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
      raise exception 'AGT-280: need_score must be a whole number 0-5; got %',
        coalesce(p ->> 'need_score', '(none)') using errcode = 'check_violation';
    end;
    if v_score is null or v_score < 0 or v_score > 5 then
      raise exception 'AGT-280: need_score must be 0-5; got %',
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
$function$
;

-- GATE. Every arm must hold or this DO raises and the whole migration rolls back.
do $gate$
declare
  v_overloads int;
begin
  -- 1. exactly one apply_requirement_verdict in public (asserted, never assumed).
  select count(*) into v_overloads
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where p.proname = 'apply_requirement_verdict' and n.nspname = 'public';
  if v_overloads <> 1 then
    raise exception 'AGT-433 GATE: apply_requirement_verdict has % overloads in public (expected 1)', v_overloads;
  end if;

  -- 2. PROBE(6) -- above the band, still refused.
  begin
    perform public.apply_requirement_verdict(null, 'agt433-gate', jsonb_build_object('verdict','pass','backlog_id','AGT-383','need_source','nathan:market_records:b600e6cc-d365-4100-9336-9026092cc63e','need_score', 6, 'reason','AGT-433 gate probe'));
    raise exception 'AGT-433 GATE: need_score % was accepted', 6;
  exception when check_violation then
    if position('0-5' in sqlerrm) = 0 then
      raise exception 'AGT-433 GATE: PROBE(6) refused without 0-5 in its message: %', sqlerrm;
    end if;
  end;

  -- 3. PROBE(-1) -- below the band, still refused.
  begin
    perform public.apply_requirement_verdict(null, 'agt433-gate', jsonb_build_object('verdict','pass','backlog_id','AGT-383','need_source','nathan:market_records:b600e6cc-d365-4100-9336-9026092cc63e','need_score', -1, 'reason','AGT-433 gate probe'));
    raise exception 'AGT-433 GATE: need_score % was accepted', -1;
  exception when check_violation then
    if position('0-5' in sqlerrm) = 0 then
      raise exception 'AGT-433 GATE: PROBE(-1) refused without 0-5 in its message: %', sqlerrm;
    end if;
  end;

  -- 4. PROBE(2.5) -- not a whole number, still refused.
  begin
    perform public.apply_requirement_verdict(null, 'agt433-gate', jsonb_build_object('verdict','pass','backlog_id','AGT-383','need_source','nathan:market_records:b600e6cc-d365-4100-9336-9026092cc63e','need_score', 2.5, 'reason','AGT-433 gate probe'));
    raise exception 'AGT-433 GATE: need_score % was accepted', 2.5;
  exception when check_violation then
    if position('0-5' in sqlerrm) = 0 then
      raise exception 'AGT-433 GATE: PROBE(2.5) refused without 0-5 in its message: %', sqlerrm;
    end if;
  end;

  -- 5. ZERO -- 0 lands AND reads back 0. The P0433 sentinel carries the read out of the
  --    sub-block and rolls the probe's own write back with it, so the gate proves the write
  --    path without leaving a row behind. A refusal here has no handler: it rolls MIG back.
  begin
    perform public.apply_requirement_verdict(null, 'agt433-gate', jsonb_build_object('verdict','pass','backlog_id','AGT-383','need_source','nathan:market_records:b600e6cc-d365-4100-9336-9026092cc63e','need_score', 0, 'reason','AGT-433 gate probe'));
    raise exception using errcode = 'P0433', message = 'AGT433 ' || (select need_score::text from public.backlog_items where backlog_id = 'AGT-383');
  exception when sqlstate 'P0433' then
    if sqlerrm <> 'AGT433 0' then
      raise exception 'AGT-433 GATE: ZERO read "%" (expected "AGT433 0")', sqlerrm;
    end if;
  end;

  raise notice 'AGT-433 GATE: passed -- 1 overload; 6, -1, 2.5 refused with 0-5; 0 accepted and read back 0 (rolled back).';
end
$gate$;
