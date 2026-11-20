-- DeepBench v7.0.1085 | docs/design/agt-553-ledger-shape-guard.sql | AGT-553 -- every door into audit_findings refuses a fingerprint that is not the ledger's 16 hex characters and a locations entry that names no place
--
-- Migration agt553_ledger_shape_guard. ONE transaction (apply_migration's own); the trailing DO block
-- asserts both directions and leaves zero rows, so a failed assertion rolls the whole migration back.
-- Apply: orchestrator over the Supabase connector, down captured first. Down (the orchestrator's capture):
--   drop trigger audit_findings_shape on public.audit_findings; drop function public.audit_findings_shape();
--   then re-run docs/design/agt-490-parked-home.sql lines 248-454 (apply_requirement_verdict, md5 of the
--   live definition before this migration: 34aece358f77d8c99db99916c42e76e7).

-- (1) THE SHAPE GUARD. BEFORE INSERT, named to fire after audit_findings_family and audit_findings_guard
--     (triggers fire in name order), so the one-source refusal still answers first. A NULL fingerprint,
--     a NULL locations and a non-array locations are left to the NOT NULL and CHECK that already refuse them.
create or replace function public.audit_findings_shape()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $shape$
declare
  v_bad int;
begin
  if NEW.fingerprint !~ '^[0-9a-f]{16}$' then
    raise exception 'audit_findings: fingerprint must be the ledger''s 16 hex characters (AGT-553); got % characters. File through node scripts/audit-ledger.js --ingest=<json>, which computes it.', length(NEW.fingerprint)
      using errcode = 'check_violation';
  end if;
  if jsonb_typeof(NEW.locations) = 'array' then
    select count(*) into v_bad
      from jsonb_array_elements(NEW.locations) e
     where jsonb_typeof(e) <> 'object' or btrim(coalesce(e ->> 'location', '')) = '';
    if v_bad > 0 then
      raise exception 'audit_findings: every locations entry is {location, text} with a non-empty location (AGT-553); % of % name no place. File through node scripts/audit-ledger.js --ingest=<json>.', v_bad, jsonb_array_length(NEW.locations)
        using errcode = 'check_violation';
    end if;
  end if;
  return NEW;
end
$shape$;

drop trigger if exists audit_findings_shape on public.audit_findings;
create trigger audit_findings_shape before insert on public.audit_findings
  for each row execute function public.audit_findings_shape();

-- Functions are born executable by anon and authenticated BY NAME (.claude/rules/supabase-column-grants.md,
-- SES-315 addendum): revoke the three by name, never PUBLIC alone.
revoke all on function public.audit_findings_shape() from public, anon, authenticated;

-- (2) THE ONE TRACKED WRITER THAT WROTE BOTH MALFORMED SHAPES. apply_requirement_verdict() below is
--     docs/design/agt-490-parked-home.sql lines 248-454 byte for byte, with exactly TWO lines changed in
--     the not-needed branch: v_fp (83 characters -> 16 hex, the namespace moved inside the hash) and the
--     locations value (a bare string -> one {location, text} object). Same signature, so no overload.
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
  -- AGT-490
  v_new      text;
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
    -- AGT-490: and a PARKED (0) ticket may name where it waits instead -- a paused or planned
    -- project by slug, or a project named here for the first time. Above 0 that answer is refused
    -- outright: a scored ticket goes to a project that is RUNNING, and a new planned project is
    -- somewhere nothing is built.
    v_new := btrim(coalesce(p ->> 'new_project', ''));
    if v_new <> '' and v_score > 0 then
      raise exception 'AGT-490: new_project names where a PARKED (0) ticket waits; % scores %',
        v_bid, v_score using errcode = 'check_violation';
    end if;
    if v_home <> '' or v_new <> '' then
      if v_score = 0 then
        -- AGT-490: the parking rules live in ONE function, as the placement rules do.
        v_epic := public.park_target(v_ticket.id, nullif(v_home, ''), nullif(v_new, ''));
      else
        -- AGT-489: the target epic, the John-named refusal and the parent rule live in ONE function.
        v_epic := public.placement_target(v_ticket.id, v_home);
      end if;
      -- AGT-450: a john: source is John's own naming; the lock admits it. AGT-480: EVERY OTHER
      -- source is Victoria PLACING the ticket, which the lock now admits too -- but only inside
      -- this token, which is transaction-local and set for the one statement that needs it. The
      -- stamp travels in the same UPDATE as epic_id and in the same before-image, so one
      -- reverse_decision() puts the move and the origin back together.
      perform set_config('deepbench.victoria_door', 'apply_requirement_verdict', true);
      update public.backlog_items set epic_id = v_epic, scope_origin = case when split_part(coalesce(v_src, ''), ':', 1) = 'john' or scope_origin = 'john-named' then 'john-named' else 'victoria-placed' end, updated_at = now() where id = v_ticket.id;
      perform set_config('deepbench.victoria_door', '', true);
    end if;

    return v_decision;

  elsif v_verdict = 'not-needed' then
    -- NO ticket row is written. The proposal is LISTED as her ruling, so a cold future session
    -- finds why it was refused (pattern:92).
    v_proposal := btrim(coalesce(p ->> 'proposal', p ->> 'title', ''));
    if v_proposal = '' then
      raise exception 'AGT-280: a not-needed verdict names the proposal it refused';
    end if;
    v_fp := left(encode(sha256(convert_to('agt-280:not-needed:' || v_proposal, 'utf8')), 'hex'), 16);

    insert into public.audit_findings
      (fingerprint, iso_week, kind, family, finding_type, status, confidence, locations,
       governing_fact, proposed_resolution, ruling, ruled_by, found_by, ruled_at, cycle_id)
    values
      (v_fp, v_week, 'other', 'other', 'proposal', 'listed', 'high',
       jsonb_build_array(jsonb_build_object('location', 'requirement-check:not-needed', 'text', v_proposal)),
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

  elsif v_verdict = 'move' then
    -- AGT-489: a ticket she already graded is PLACED, never re-graded (d.13). No score, no source,
    -- no requirement-check row: its own decision kind, its full-row image, then the same
    -- token-wrapped move the pass branch makes. requirement_gate() passes on the grade the ticket
    -- already holds; epic_lock_guard() and scope_origin_door() pass on the token.
    if v_bid = '' then
      raise exception 'AGT-489: a move verdict names its backlog_id';
    end if;
    v_home := btrim(coalesce(p ->> 'home_project', ''));
    if v_home = '' then
      raise exception 'AGT-489: a move verdict names its home_project' using errcode = 'check_violation';
    end if;
    select * into v_ticket from public.backlog_items b where b.backlog_id = v_bid;
    if not found then
      raise exception 'AGT-280: no backlog_items row reads backlog_id %', v_bid;
    end if;
    if not exists (select 1 from public.grade_standing() g where g.backlog_id = v_bid) then
      raise exception 'AGT-489: % is ungraded; it is graded first (answer pass)', v_bid
        using errcode = 'check_violation';
    end if;
    v_epic := public.placement_target(v_ticket.id, v_home);
    v_decision := public.record_decision(
      p_cycle, p_session, 'placement', v_ticket.backlog_id, v_ticket.title, v_reason,
      public.ladder_work_class(v_ticket.priority_class));
    insert into public.runner_before_images
      (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    values
      (p_cycle, p_session, 'backlog_items', v_ticket.id::text, to_jsonb(v_ticket), v_decision);
    perform set_config('deepbench.victoria_door', 'apply_requirement_verdict', true);
    update public.backlog_items
       set epic_id = v_epic, scope_origin = 'victoria-placed', updated_at = now()
     where id = v_ticket.id;
    perform set_config('deepbench.victoria_door', '', true);
    return v_decision;

  elsif v_verdict = 'park' then
    -- AGT-490: a ticket that fits no active charter is PARKED where it waits -- and NOT graded
    -- (John's call: a placed no-fit stays ungraded). So there is no grade check here, the mirror of
    -- `move`'s: `move` places a grade that stands, `park` places a ticket that has none and must
    -- not acquire one. Same decision kind (`placement` -- never `requirement-check`, which IS a
    -- grade to `grade_standing()` and `countable_tickets_per_project()`), same full-row image, same
    -- token-wrapped UPDATE. need_source and need_score are not read and not written.
    if v_bid = '' then
      raise exception 'AGT-490: a park verdict names its backlog_id';
    end if;
    select * into v_ticket from public.backlog_items b where b.backlog_id = v_bid;
    if not found then
      raise exception 'AGT-280: no backlog_items row reads backlog_id %', v_bid;
    end if;
    v_home := btrim(coalesce(p ->> 'home_project', ''));
    v_new  := btrim(coalesce(p ->> 'new_project', ''));
    v_epic := public.park_target(v_ticket.id, nullif(v_home, ''), nullif(v_new, ''));
    v_decision := public.record_decision(
      p_cycle, p_session, 'placement', v_ticket.backlog_id, v_ticket.title, v_reason,
      public.ladder_work_class(v_ticket.priority_class));
    insert into public.runner_before_images
      (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    values
      (p_cycle, p_session, 'backlog_items', v_ticket.id::text, to_jsonb(v_ticket), v_decision);
    perform set_config('deepbench.victoria_door', 'apply_requirement_verdict', true);
    update public.backlog_items
       set epic_id = v_epic, scope_origin = 'victoria-placed', updated_at = now()
     where id = v_ticket.id;
    perform set_config('deepbench.victoria_door', '', true);
    return v_decision;

  else
    raise exception 'AGT-280: verdict must be pass, not-needed, move or park; got %',
      coalesce(p ->> 'verdict', '(none)');
  end if;
end
$function$;

-- (3) BOTH DIRECTIONS, ASSERTED HERE, ZERO ROWS LEFT. Each probe runs in its own sub-block; a probe that
--     lands is undone by raising P0553 inside that sub-block, which rolls the sub-block back.
do $qa$
declare
  v_week text := to_char(now(), 'IYYY-"W"IW');
  v_n0   bigint;
  v_n1   bigint;
  v_msg  text;
  v_id   uuid;
  v_fp   text;
  v_loc  jsonb;
  v_good jsonb := '[{"location":"agt-553:migration-probe","text":"t"}]'::jsonb;
begin
  select count(*) into v_n0 from public.audit_findings;

  begin
    insert into public.audit_findings (fingerprint, iso_week, kind, locations, governing_fact, confidence, proposed_resolution, found_by, finding_type)
    values (repeat('a', 64), v_week, 'other', v_good, 'AGT-553 migration probe', 'low', 'never lands', 'agt-553:migration', 'defect');
    raise exception 'AGT553 gate: a 64-character fingerprint landed';
  exception when check_violation then
    get stacked diagnostics v_msg = message_text;
    if v_msg not like '%fingerprint must be%AGT-553%' then raise exception 'AGT553 gate: wrong fingerprint refusal: %', v_msg; end if;
  end;

  begin
    insert into public.audit_findings (fingerprint, iso_week, kind, locations, governing_fact, confidence, proposed_resolution, found_by, finding_type)
    values ('a553a553a553a553', v_week, 'other', '["agt-553:migration-probe"]'::jsonb, 'AGT-553 migration probe', 'low', 'never lands', 'agt-553:migration', 'defect');
    raise exception 'AGT553 gate: a bare-string location landed';
  exception when check_violation then
    get stacked diagnostics v_msg = message_text;
    if v_msg not like '%every locations entry%AGT-553%1 of 1%' then raise exception 'AGT553 gate: wrong string-location refusal: %', v_msg; end if;
  end;

  begin
    insert into public.audit_findings (fingerprint, iso_week, kind, locations, governing_fact, confidence, proposed_resolution, found_by, finding_type)
    values ('a553a553a553a553', v_week, 'other', '[{"location":"agt-553:migration-probe","text":"t"},{"text":"no place"}]'::jsonb, 'AGT-553 migration probe', 'low', 'never lands', 'agt-553:migration', 'defect');
    raise exception 'AGT553 gate: a location-less entry landed';
  exception when check_violation then
    get stacked diagnostics v_msg = message_text;
    if v_msg not like '%every locations entry%AGT-553%1 of 2%' then raise exception 'AGT553 gate: wrong location refusal: %', v_msg; end if;
  end;

  begin
    insert into public.audit_findings (fingerprint, iso_week, kind, locations, governing_fact, confidence, proposed_resolution, found_by, finding_type)
    values ('a553a553a553a553', v_week, 'other', v_good, 'AGT-553 migration probe', 'low', 'rolled back', 'agt-553:migration', 'defect')
    returning id into v_id;
    if v_id is null then raise exception 'AGT553 gate: a well-formed row did not land'; end if;
    raise exception using errcode = 'P0553', message = 'agt-553 probe rollback';
  exception when sqlstate 'P0553' then null;
  end;

  begin
    v_id := public.apply_requirement_verdict(null, 'agt-553-migration',
      jsonb_build_object('verdict', 'not-needed', 'proposal', 'AGT-553 migration probe -- refused on purpose', 'reason', 'migration probe'));
    select f.fingerprint, f.locations into v_fp, v_loc from public.audit_findings f where f.id = v_id;
    if v_fp is null or v_fp !~ '^[0-9a-f]{16}$'
       or v_fp <> left(encode(sha256(convert_to('agt-280:not-needed:AGT-553 migration probe -- refused on purpose', 'utf8')), 'hex'), 16) then
      raise exception 'AGT553 gate: the not-needed door wrote fingerprint %', coalesce(v_fp, '(no row)');
    end if;
    if v_loc is distinct from jsonb_build_array(jsonb_build_object('location', 'requirement-check:not-needed', 'text', 'AGT-553 migration probe -- refused on purpose')) then
      raise exception 'AGT553 gate: the not-needed door wrote locations %', v_loc;
    end if;
    raise exception using errcode = 'P0553', message = 'agt-553 probe rollback';
  exception when sqlstate 'P0553' then null;
  end;

  select count(*) into v_n1 from public.audit_findings;
  if v_n1 <> v_n0 then raise exception 'AGT553 gate: the probes left % row(s)', v_n1 - v_n0; end if;

  if (select count(*) from pg_trigger where tgrelid = 'public.audit_findings'::regclass and tgname = 'audit_findings_shape' and tgenabled = 'O' and not tgisinternal) <> 1 then
    raise exception 'AGT553 gate: trigger audit_findings_shape is not installed and enabled';
  end if;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'apply_requirement_verdict') <> 1 then
    raise exception 'AGT553 gate: apply_requirement_verdict has more than one overload';
  end if;
  if has_function_privilege('anon', 'public.audit_findings_shape()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.audit_findings_shape()', 'EXECUTE') then
    raise exception 'AGT553 gate: audit_findings_shape() is executable by a public role';
  end if;
  if has_function_privilege('anon', 'public.apply_requirement_verdict(uuid, text, jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.apply_requirement_verdict(uuid, text, jsonb)', 'EXECUTE') then
    raise exception 'AGT553 gate: apply_requirement_verdict() became executable by a public role';
  end if;
end
$qa$;
