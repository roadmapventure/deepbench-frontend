-- AGT-450 (v7.0.846) -- THE JOHN-SOURCE DOOR. A need_source John himself wrote (`john:<table>:<id>`)
-- is John naming the ticket, and `epic_lock_guard()` has always admitted exactly that
-- (`scope_origin = 'john-named'` returns NEW before the lock is read). But nothing WROTE that value:
-- `apply_requirement_verdict()` moved the ticket with `epic_id` alone, so a john-sourced pass homed
-- to an executing project that does not accept findings was refused by AGT-240's lock and the whole
-- verdict rolled back. Measured live 2026-10-11 on tree 5963c52: `scripts/requirement-check.js:495`
-- refused `--home` for every project whose `accepts_findings` is not true -- which today is every
-- executing project except `agent-training` -- and `apply_requirement_verdict()` (md5 below) never
-- wrote `scope_origin` at all.
--
-- THIS FILE IS THE MIRROR of the migration `agt450_john_source_door`, applied via mcp Supabase
-- `apply_migration` (which wraps the whole file in ONE transaction, so no BEGIN/COMMIT here -- and
-- so the trailing GATE's RAISE rolls every statement below back). Kickoff:
-- docs/kickoffs/v7.0.846-AGT-450-john-source-door.md; reasoning: docs/harvests/AGT-450.md.
--
-- =================================================================================================
-- THE DOWN, CAPTURED FIRST -- before any statement below ran (runbook step 6, kickoff T1(a)).
-- =================================================================================================
--
--   select * from public.capture_migration_down('03f77519-413d-40bc-afec-9ba1090f7539','agt450_john_source_door',
--     '[{"kind":"function","identity":"public.apply_requirement_verdict(uuid, text, jsonb)"}]'::jsonb);
--
-- RESULT (measured this cycle, 2026-10-11, BEFORE the apply below ran): captured_up_name
-- agt450_john_source_door, captured_class **auto-downable**, objects_captured **1**, refusals **0**.
-- The derived down sql is the one `CREATE OR REPLACE` that puts the BEFORE body back (md5
-- 87a58305d08b12b6eec33edc437dfb0e), plus a trailing `DO` that drops any other overload and asserts
-- exactly one remains. Nothing here is card-only: the function is replaced IN PLACE and it is the
-- only object this migration touches.
--
-- =================================================================================================
-- MD5 OF THE LIVE OBJECT, as the database renders it back -- proof that this file and the database
-- state one text rather than a claim about it. Read with:
--   select md5(pg_get_functiondef('public.apply_requirement_verdict(uuid,text,jsonb)'::regprocedure));
-- =================================================================================================
--
--   BEFORE (read live 2026-10-11, this cycle, on the unchanged database): 87a58305d08b12b6eec33edc437dfb0e
--          -- the same value kickoff section 2 names, and the md5 of lines 85-207 of
--          docs/design/agt-433-parked-zero.sql, which is where the text below was taken from.
--   AFTER  (measured post-apply, 2026-10-11): a162dba478ef4b742739a8b14f21eb27
--          The prediction made from the edit below BEFORE applying it was
--          a162dba478ef4b742739a8b14f21eb27; it is the same value, so there is no difference and no
--          finding on that account. Re-read OUTSIDE the migration, after it committed: pg_proc
--          count 1, the live body carries `then 'john-named' else scope_origin end`,
--          epic_lock_guard() md5 05432ca5c8c72907cef83d676cc9c6a2 and requirement_gate() md5
--          33191bd23a6f82d2cd5c630f82de1180 both unchanged -- the four reads kickoff section 6.4
--          asks for, taken independently of the GATE that already passed inside.
--
-- ONE EDIT, AND NO OTHER BYTE CHANGED. The anchored line
--   `      update public.backlog_items set epic_id = v_epic, updated_at = now() where id = v_ticket.id;`
-- occurs exactly ONCE in the live body, and it becomes kickoff section 4's H1: the same UPDATE with
-- `scope_origin` set to 'john-named' when -- and only when -- the first segment of the need_source
-- is `john`, and left exactly as it was otherwise. The write happens in the SAME statement as
-- `epic_id`, which is what makes it work: both BEFORE triggers read `NEW.scope_origin`, so the lock
-- (`epic_lock_guard()`) and AGT-309's gate (`requirement_gate()`) each see 'john-named' on the row
-- being moved and return NEW before their refusals are reached. Neither trigger is edited, and
-- their md5s are asserted unchanged in the GATE.
--
-- WHY THE WRITER AND NOT THE LOCK (pattern:8 -- the narrowest layer that actually works): the lock
-- already admits John's naming. What was missing was the one writer recording that the naming
-- happened, under the one decision and the one before-image it already takes -- so a reverse puts
-- `scope_origin` back with `epic_id` and `need_score` in the same undo.
--
-- A non-john source is untouched: `split_part('nathan:market_records:...', ':', 1) = 'nathan'`, the
-- CASE falls to `else scope_origin`, and AGT-240's lock refuses the move exactly as it does today.
--
-- No DROP FUNCTION: the identity argument list `(uuid, text, jsonb)` is unchanged, so there is no
-- second overload to strip (.claude/rules/supabase-function-signature.md). The GATE asserts the
-- count is 1 anyway rather than reasoning that it must be.
--
-- The lone `;` after `$function$` is the CREATE statement's terminator, kept on its own line so
-- that the text below is byte-identical to what `pg_get_functiondef` returns.
--
-- =================================================================================================
-- THE MIGRATION, BYTE-IDENTICAL TO WHAT WAS APPLIED
-- =================================================================================================

-- DeepBench v7.0.846 | migration agt450_john_source_door | AGT-450
-- A john: need_source is John's own naming: the homing UPDATE writes scope_origin = 'john-named',
-- so epic_lock_guard() admits the move into ANY executing project. Rolls back unless the trailing
-- GATE passes. DOWN captured first (auto-downable, 1 object, 0 refusals).

-- The writer, from live pg_get_functiondef('public.apply_requirement_verdict(uuid,text,jsonb)'::regprocedure)
-- read 2026-10-11 (md5 87a58305d08b12b6eec33edc437dfb0e), with exactly ONE edit: the anchored
-- homing UPDATE becomes kickoff section 4's H1 (one comment line + the CASE on split_part).
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
      -- AGT-450: a john: source is John's own naming; the lock admits it.
      update public.backlog_items set epic_id = v_epic, scope_origin = case when split_part(coalesce(v_src, ''), ':', 1) = 'john' then 'john-named' else scope_origin end, updated_at = now() where id = v_ticket.id;
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

-- GATE. Kickoff section 6.4's four reads, asserted INSIDE the migration -- a raise here rolls every
-- statement above back, and the four are re-read outside the migration afterwards because a
-- migration's own success flag is never the evidence (.claude/rules/supabase-column-grants.md).
do $gate$
declare
  v_overloads int;
  v_def       text;
  v_lock      text;
  v_gate      text;
begin
  -- 1. exactly one apply_requirement_verdict in public (asserted, never assumed).
  select count(*) into v_overloads
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where p.proname = 'apply_requirement_verdict' and n.nspname = 'public';
  if v_overloads <> 1 then
    raise exception 'AGT-450 GATE: apply_requirement_verdict has % overloads in public (expected 1)', v_overloads;
  end if;

  -- 2. the edit is IN the live body -- the one thing this migration exists to put there.
  v_def := pg_get_functiondef('public.apply_requirement_verdict(uuid,text,jsonb)'::regprocedure);
  if position('then ''john-named'' else scope_origin end' in v_def) = 0 then
    raise exception 'AGT-450 GATE: the live body does not carry the john-named CASE';
  end if;

  -- 3. epic_lock_guard() is NOT edited by this migration, and the door it already holds open is the
  --    whole mechanism -- so its text is pinned by md5 rather than assumed unchanged.
  v_lock := md5(pg_get_functiondef('public.epic_lock_guard()'::regprocedure));
  if v_lock <> '05432ca5c8c72907cef83d676cc9c6a2' then
    raise exception 'AGT-450 GATE: epic_lock_guard() md5 is % (expected 05432ca5c8c72907cef83d676cc9c6a2)', v_lock;
  end if;

  -- 4. requirement_gate() likewise -- AGT-309's clause stays exactly as it is, including its own
  --    john-named early return.
  v_gate := md5(pg_get_functiondef('public.requirement_gate()'::regprocedure));
  if v_gate <> '33191bd23a6f82d2cd5c630f82de1180' then
    raise exception 'AGT-450 GATE: requirement_gate() md5 is % (expected 33191bd23a6f82d2cd5c630f82de1180)', v_gate;
  end if;

  raise notice 'AGT-450 GATE: passed -- 1 overload; the john-named CASE is live; epic_lock_guard and requirement_gate md5s unchanged.';
end
$gate$;
