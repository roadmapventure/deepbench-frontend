-- AGT-489 (v7.0.864) -- THE MOVE DOOR: GRADED TICKETS ARE PLACED, AND NOTHING IS RE-GRADED.
--
-- THE DEFECT, measured live 2026-10-19 on the unchanged tree (kickoff §2). Victoria's list turn
-- GRADES and never MOVES. `applyList()` builds a `pass` payload as `{ ...row, proposal, account }`
-- and never sends a `home_project` -- only the single-ticket door (`--home`) ever does -- and
-- `prepareList()` offers every open/partial ticket of the list's epics, dropping only the ones
-- already carrying a live `fit-stamp` (AGT-486). It has no notion of "already graded" at all. So
-- the same tickets came back every run: `auditor-findings` holds 43 open/partial = 8 never graded
-- + 35 graded, `dev-mgr-findings` 201 = 6 + 195, and 130 of them have been graded three times or
-- more while `countable_tickets_per_project()` reads tooling 1, dev-manager-capabilities 0,
-- go-to-market 0. A model turn was spent re-answering a question the record had already answered,
-- and no ticket moved anywhere.
--
-- A second wall sat behind it: AGT-309's homing block required ONE executing project with exactly
-- ONE epic (`if v_rc <> 1 then raise`). `tooling` and `dev-manager-capabilities` each hold two, so
-- `home_project` could only ever reach `go-to-market` -- filed as AGT-480 harvest §6, nothing
-- shipped. Call (c) below closes it.
--
-- WHAT THIS MIGRATION SHIPS.
--
--   (1) `public.grade_standing()` -- STABLE, `service_role` only. Which grades STAND: the ticket's
--       NEWEST `requirement-check` decision is unreversed AND the before-image taken under it
--       carries today's `description`. That gives requirements d.13 all three reopeners with no new
--       column -- a text change (the image differs), John reversing that newest grade, and
--       AGT-493's rewrite (a text change) -- where "any unreversed grade" would make John's one
--       reversal meaningless against the 19-22 standing rows a graded ticket carries.
--
--   (2) `public.parent_project_of_blockers()` -- STABLE, `service_role` only. The ticket an
--       open/partial ticket of an `executing` project is `blocked_by`, and that project's slug
--       (d.11). The shape of `effective_need_score()` (AGT-483), which lifts such a ticket's SCORE
--       but moves nothing.
--
--   (3) `public.placement_target(uuid, text)` -- STABLE, `service_role` only, and THE ONE HOME of
--       the three placement rules (pattern:14, pattern:15): a `john-named` ticket is never moved
--       (call (b), d.10), a blocker goes to its parent's project and nowhere else (call (f), d.11),
--       and the destination is an `executing` project's OLDEST epic (call (c), d.10) -- the
--       project's original list, never the John-named Victoria Fill drains of 2026-10-13.
--
--   (4) `public.apply_requirement_verdict(uuid, text, jsonb)` -- the LIVE body with exactly three
--       edits and NO change of identity (so no second overload can exist,
--       .claude/rules/supabase-function-signature.md): the pass branch's seven-line homing block
--       becomes one `placement_target()` call, a `move` branch is added, and the final raise names
--       the third verdict. A `move` writes its OWN `runner_decisions` row of kind `placement` --
--       never `requirement-check`, which would count as a grade in `countable_tickets_per_project()`
--       and in `grade_standing()` itself -- with a full-row before-image and the same
--       transaction-local token-wrapped UPDATE a homed pass makes (AGT-480).
--
--   (5) The `skill_profiles` row `vc-reorganize-intent`, as DATA and never as code (pattern:2): the
--       verdict enum gains `move` and `hold`, a nullable `home` property carries the destination
--       slug, `required` gains `home`, and `method` gains step `0a. PLACE AND HOLD`.
--
-- WHAT IT DOES NOT DO: it touches `epic_lock_guard()`, `scope_origin_door()` and
-- `requirement_gate()` not at all (a graded ticket already satisfies H1, and the door token is
-- unchanged), it widens the single-ticket door's `VERDICTS` not at all (`move` and `hold` are
-- LIST-only, call (d)), and it moves no real ticket.
--
-- THE DOWN, IN TWO HALVES, BOTH TAKEN BEFORE THIS RAN:
--   the functions `capture_migration_down('8cb00c9b-1807-4f3f-9180-aa76ddddc793',
--                 'agt489_move_door', '[{"kind":"function","identity":"public.apply_requirement_verdict(uuid, text, jsonb)"},
--                 {"kind":"function","identity":"public.grade_standing()"},
--                 {"kind":"function","identity":"public.parent_project_of_blockers()"},
--                 {"kind":"function","identity":"public.placement_target(uuid, text)"}]')
--                 -> captured_class `auto-downable`, objects_captured 4, refusals 0. The three new
--                 ones down to a `drop function if exists`; ARV's down is its live body, md5
--                 `9983927cc0647a8ba5d9a104eb7e282c`, 6,220 bytes.
--   the row       `capture_migration_down()` has NO row kind, so the data half is hand-built in
--                 step (0) below, AGT-487's shape: one `record_decision` of kind `agent-row` under
--                 AGT-489, then the FULL-row `runner_before_images` insert over `skill_profiles`
--                 `89d5bbeb-e0a5-4d26-91f7-ecaf84b2c18d` under that decision, `cycle_id` only --
--                 `ck_before_image_attribution` refuses both attribution columns at once. One
--                 Reverse restores the enum, the `home` property, `required` and `method` whole.
--
-- THE AFTER md5s, read with `pg_get_functiondef` once this had applied:
--   public.apply_requirement_verdict(uuid, text, jsonb)  9f81533d7084820d887bfb2fb6099765
--   public.grade_standing()                              dbd6d89571dc54e693c857243725370a
--   public.parent_project_of_blockers()                  6dbcb78ce2906a4381879a7d226cd8a1
--   public.placement_target(uuid, text)                  becb9a269c1d6e6c9f0e9dcb3b463838
--
-- Mirror of migration `agt489_move_door`, byte-identical. Guard
-- `tests/regression/agt-489-move-door.test.mjs`.

-- ============================================================================================
-- (0) THE DOWN, HALF TWO: the skill row's undo, taken BEFORE the row is touched.
-- ============================================================================================

do $undo$
declare
  d uuid;
  v_row_id uuid;
begin
  select sp.id into v_row_id from public.skill_profiles sp where sp.slug = 'vc-reorganize-intent';
  if v_row_id is null then
    raise exception 'AGT-489: no skill_profiles row reads slug vc-reorganize-intent';
  end if;

  d := public.record_decision(
    '8cb00c9b-1807-4f3f-9180-aa76ddddc793', NULL, 'agent-row', 'AGT-489',
    $sum$vc-reorganize-intent gains move and hold, the home property and step 0a PLACE AND HOLD$sum$,
    $why$AGT-489, JOHN-0925-DESIGNER-DECIDES (reversible): the list door graded and never moved, so every run re-read 35 already-graded auditor-findings tickets and offered them the same two answers. The row is the rule, as DATA and never as code: the verdict enum gains move and hold, a home property carries the destination slug, required gains home, and method gains step 0a. One reverse_decision() of this decision puts the whole row back. pattern:2$why$);

  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  select '8cb00c9b-1807-4f3f-9180-aa76ddddc793', NULL, 'skill_profiles', sp.id::text, to_jsonb(sp), d
  from public.skill_profiles sp where sp.slug = 'vc-reorganize-intent';

  raise notice 'AGT-489: skill row undo decision %, before-image over skill_profiles %', d, v_row_id;
end $undo$;

-- ============================================================================================
-- (1) THE THREE FUNCTIONS. service_role only -- Postgres grants EXECUTE to anon, authenticated
--     and service_role BY NAME the instant a function is created, and REVOKE ... FROM PUBLIC
--     leaves those named grants standing (.claude/rules/supabase-column-grants.md, SES-315).
-- ============================================================================================

create or replace function public.grade_standing()
returns table(backlog_id text, decision_id uuid, need_score smallint)
language sql stable
set search_path = public, pg_catalog
as $$
  -- AGT-489 (a): a grade STANDS while the ticket's NEWEST requirement-check decision is unreversed
  -- and the before-image taken under it carries today's description (d.13: a text change, John
  -- reversing the newest grade, or AGT-493's rewrite reopens it; nothing else does).
  select b.backlog_id::text, d.id, b.need_score
    from public.backlog_items b
    join lateral (
      select d.id, d.reversed_at
        from public.runner_decisions d
       where d.kind = 'requirement-check' and d.backlog_id = b.backlog_id
       order by d.decided_at desc
       limit 1
    ) d on true
   where b.status in ('open', 'partial')
     and d.reversed_at is null
     and exists (
       select 1 from public.runner_before_images i
        where i.decision_id = d.id
          and i.row_data ->> 'description' is not distinct from b.description)
$$;

create or replace function public.parent_project_of_blockers()
returns table(backlog_id text, project_slug text)
language sql stable
set search_path = public, pg_catalog
as $$
  -- AGT-489 (f), d.11: a ticket that an open/partial ticket of an executing project is blocked_by
  -- belongs in that project. The shape of effective_need_score() (AGT-483), which lifts its SCORE.
  select distinct on (b.backlog_id) b.backlog_id::text, pj.slug::text
    from public.backlog_items b
    join public.backlog_items w on w.blocked_by = b.id and w.status in ('open', 'partial')
    join public.epics e on e.id = w.epic_id
    join public.projects pj on pj.id = e.project_id and pj.status = 'executing'
   where b.status in ('open', 'partial')
   order by b.backlog_id, pj.priority nulls last, pj.slug
$$;

create or replace function public.placement_target(p_ticket uuid, p_home text)
returns uuid
language plpgsql stable
set search_path = public, pg_catalog
as $$
declare
  v_bid text; v_origin text; v_parent text; v_epic uuid;
begin
  select b.backlog_id, b.scope_origin into v_bid, v_origin
    from public.backlog_items b where b.id = p_ticket;
  if v_bid is null then
    raise exception 'AGT-489: no backlog_items row has id %', p_ticket using errcode = 'check_violation';
  end if;
  -- (b) d.10: she never moves a ticket John named into a different project.
  if coalesce(v_origin, '') = 'john-named' then
    raise exception 'AGT-489: % is a ticket John named; it is never moved', v_bid
      using errcode = 'check_violation';
  end if;
  -- (f) d.11: a blocker goes where its parent is, and nowhere else.
  select p.project_slug into v_parent from public.parent_project_of_blockers() p where p.backlog_id = v_bid;
  if v_parent is not null and v_parent <> coalesce(p_home, '') then
    raise exception 'AGT-489: % blocks a parent in project %; it moves there, not to %',
      v_bid, v_parent, coalesce(p_home, '(none)') using errcode = 'check_violation';
  end if;
  -- (c) d.10: never a paused project (only executing qualifies); the project's OLDEST epic is its list.
  select e.id into v_epic
    from public.epics e join public.projects pj on pj.id = e.project_id
   where pj.slug = p_home and pj.status = 'executing'
   order by e.created_at, e.id
   limit 1;
  if v_epic is null then
    raise exception 'AGT-309: home_project % is not an executing project with an epic',
      coalesce(p_home, '(none)') using errcode = 'check_violation';
  end if;
  return v_epic;
end
$$;

revoke all on function public.grade_standing() from PUBLIC, anon, authenticated;
grant execute on function public.grade_standing() to service_role;
revoke all on function public.parent_project_of_blockers() from PUBLIC, anon, authenticated;
grant execute on function public.parent_project_of_blockers() to service_role;
revoke all on function public.placement_target(uuid, text) from PUBLIC, anon, authenticated;
grant execute on function public.placement_target(uuid, text) to service_role;

-- ============================================================================================
-- (2) apply_requirement_verdict -- the LIVE body (md5 9983927cc0647a8ba5d9a104eb7e282c, read with
--     pg_get_functiondef) with exactly three edits. The identity argument list is UNCHANGED and
--     there is NO DROP, so no second overload can exist (.claude/rules/supabase-function-signature.md).
--       edit 1 -- the pass branch's seven-line homing block becomes one call to placement_target().
--       edit 2 -- a new `move` branch before the final else.
--       edit 3 -- the final raise names the third verdict.
-- ============================================================================================

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
      -- AGT-489: the target epic, the John-named refusal and the parent rule live in ONE function.
      v_epic := public.placement_target(v_ticket.id, v_home);
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

  else
    raise exception 'AGT-280: verdict must be pass, not-needed or move; got %',
      coalesce(p ->> 'verdict', '(none)');
  end if;
end
$function$;

-- ============================================================================================
-- (3) THE SKILL ROW, DATA and never code (pattern:2). One UPDATE over vc-reorganize-intent.
-- ============================================================================================

update public.skill_profiles sp
   set traits = jsonb_set(jsonb_set(jsonb_set(sp.traits,
                  '{schema,properties,rows,items,properties,verdict,enum}',
                  '["pass","not-needed","no-fit","move","hold"]'::jsonb),
                  '{schema,properties,rows,items,properties,home}',
                  '{"type":["string","null"],"maxLength":100,"description":"The active project this ticket moves into, as its slug from the charters you were handed; null when it does not move now."}'::jsonb),
                  '{schema,properties,rows,items,required}',
                  '["backlog_id","verdict","home","need_source","need_score","reason"]'::jsonb),
       method = sp.method || E'\n\n' || $t$0a. PLACE AND HOLD. Each proposal says whether it is graded (its grade stands) and, in parent_home, the project it must join because it blocks a parent there. An UNGRADED ticket that fits a charter: pass, with home = that project's slug when it scores 3 or more and the project is under its floor (a 5 moves in regardless), else home null. A GRADED ticket is never re-graded and never turned down: move, with its home, when it should join a project now; hold (home, need_source and need_score all null) when it fits but waits its turn; no-fit when it fits no charter. A parent_home is always the home. A ticket John named is never moved.$t$,
       updated_at = now()
 where sp.slug = 'vc-reorganize-intent';

-- ============================================================================================
-- (4) THE GATE. A migration's success flag proves nothing (.claude/rules/supabase-column-grants.md):
--     every claim below is asserted, both directions on the grants, and a RAISE here rolls the
--     whole transaction back.
-- ============================================================================================

do $gate$
declare
  fn text;
  v_n integer;
  v_live integer;
  v_recount integer;
  v_parents integer;
  v_method text;
  v_traits jsonb;
  v_hits integer;
  v_fit integer;
  v_images integer;
  v_list_project uuid;
begin
  -- 4a. ONE overload each, never two (.claude/rules/supabase-function-signature.md).
  foreach fn in array array['apply_requirement_verdict', 'grade_standing', 'parent_project_of_blockers', 'placement_target'] loop
    select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = fn;
    if v_n <> 1 then
      raise exception 'AGT-489 gate: public.% must have exactly ONE overload; found %', fn, v_n;
    end if;
  end loop;

  -- 4b. BOTH DIRECTIONS on the three new functions: the public keys are refused, service_role works.
  foreach fn in array array['public.grade_standing()', 'public.parent_project_of_blockers()', 'public.placement_target(uuid, text)'] loop
    if has_function_privilege('anon', fn, 'EXECUTE') then
      raise exception 'AGT-489 gate: anon must NOT hold EXECUTE on %', fn;
    end if;
    if has_function_privilege('authenticated', fn, 'EXECUTE') then
      raise exception 'AGT-489 gate: authenticated must NOT hold EXECUTE on %', fn;
    end if;
    if not has_function_privilege('service_role', fn, 'EXECUTE') then
      raise exception 'AGT-489 gate: service_role MUST hold EXECUTE on %', fn;
    end if;
  end loop;

  select e.project_id into v_list_project from public.epics e
   where e.id = 'ba12f804-9ff1-4160-ac3d-5c0bf8470877';
  if v_list_project is null then
    raise exception 'AGT-489 gate: the auditor-findings epic ba12f804-9ff1-4160-ac3d-5c0bf8470877 is gone';
  end if;

  -- 4c. F1 over the auditor list, against the gate's OWN inline recount of the same predicate --
  --     recomputed here, never pinned to a number this migration was written against.
  select count(*) into v_live
    from public.grade_standing() g
    join public.backlog_items b on b.backlog_id = g.backlog_id
    join public.epics e on e.id = b.epic_id
   where e.project_id = v_list_project;

  select count(*) into v_recount
    from public.backlog_items b
    join public.epics e on e.id = b.epic_id
   where e.project_id = v_list_project
     and b.status in ('open', 'partial')
     and exists (
       select 1
         from public.runner_decisions d
        where d.kind = 'requirement-check' and d.backlog_id = b.backlog_id
          and d.decided_at = (select max(d2.decided_at) from public.runner_decisions d2
                               where d2.kind = 'requirement-check' and d2.backlog_id = b.backlog_id)
          and d.reversed_at is null
          and exists (select 1 from public.runner_before_images i
                       where i.decision_id = d.id
                         and i.row_data ->> 'description' is not distinct from b.description));

  if v_live <> v_recount then
    raise exception 'AGT-489 gate: grade_standing() reads % graded ticket(s) on the auditor list; the inline recount reads %',
      v_live, v_recount;
  end if;

  -- 4d. F2 over the same list, against its own inline recount.
  select count(*) into v_parents
    from public.parent_project_of_blockers() pb
    join public.backlog_items b on b.backlog_id = pb.backlog_id
    join public.epics e on e.id = b.epic_id
   where e.project_id = v_list_project;
  select count(distinct b.backlog_id) into v_n
    from public.backlog_items b
    join public.epics e on e.id = b.epic_id
    join public.backlog_items w on w.blocked_by = b.id and w.status in ('open', 'partial')
    join public.epics we on we.id = w.epic_id
    join public.projects pj on pj.id = we.project_id and pj.status = 'executing'
   where e.project_id = v_list_project and b.status in ('open', 'partial');
  if v_parents <> v_n then
    raise exception 'AGT-489 gate: parent_project_of_blockers() names % ticket(s) of the auditor list; the inline recount names %',
      v_parents, v_n;
  end if;

  -- 4e. THE ROW.
  select sp.method, sp.traits into v_method, v_traits
    from public.skill_profiles sp where sp.slug = 'vc-reorganize-intent';
  if jsonb_array_length(v_traits #> '{schema,properties,rows,items,properties,verdict,enum}') <> 5 then
    raise exception 'AGT-489 gate: the verdict enum must hold five values; it holds %',
      v_traits #> '{schema,properties,rows,items,properties,verdict,enum}';
  end if;
  if not ((v_traits #> '{schema,properties,rows,items,required}') ? 'home') then
    raise exception 'AGT-489 gate: required must name home; it reads %',
      v_traits #> '{schema,properties,rows,items,required}';
  end if;
  if (v_traits #> '{schema,properties,rows,items,properties,home,type}') <> '["string","null"]'::jsonb then
    raise exception 'AGT-489 gate: the home property must be a nullable string; it reads %',
      v_traits #> '{schema,properties,rows,items,properties,home}';
  end if;
  v_hits := (length(v_method) - length(replace(v_method, 'PLACE AND HOLD', ''))) / length('PLACE AND HOLD');
  if v_hits <> 1 then
    raise exception 'AGT-489 gate: method must hold PLACE AND HOLD exactly once; holds % time(s)', v_hits;
  end if;
  v_fit := (length(v_method) - length(replace(v_method, '0. FIT BEFORE GRADE', ''))) / length('0. FIT BEFORE GRADE');
  if v_fit <> 1 then
    raise exception 'AGT-489 gate: AGT-486''s 0. FIT BEFORE GRADE must still stand exactly once; holds % time(s)', v_fit;
  end if;
  v_fit := (length(v_method) - length(replace(v_method, '3a. A TICKET''S OWN SOURCE IS ALWAYS CITABLE', ''))) / length('3a. A TICKET''S OWN SOURCE IS ALWAYS CITABLE');
  if v_fit <> 1 then
    raise exception 'AGT-489 gate: AGT-487''s step 3a must still stand exactly once; holds % time(s)', v_fit;
  end if;

  -- 4f. EXACTLY ONE before-image names skill_profiles under this cycle -- the row's whole undo.
  select count(*) into v_images from public.runner_before_images i
   where i.cycle_id = '8cb00c9b-1807-4f3f-9180-aa76ddddc793' and i.table_name = 'skill_profiles';
  if v_images <> 1 then
    raise exception 'AGT-489 gate: exactly ONE runner_before_images row names skill_profiles under this cycle; found %', v_images;
  end if;

  raise notice 'AGT-489 gate: 4 functions one overload each, F1 % = recount %, F2 % = recount %, enum 5, home required, PLACE AND HOLD once, % skill_profiles image',
    v_live, v_recount, v_parents, v_n, v_images;
end $gate$;
