-- AGT-490 (v7.0.866) -- A PARKED 0 NAMES WHERE IT WAITS.
--
-- THE DEFECT, measured live 2026-10-19 on the unchanged tree (kickoff §2). `need_score` 0 has been
-- accepted everywhere since `v7.0.844` -- `ck_backlog_need_score`, `apply_requirement_verdict()` and
-- both of `scripts/requirement-check.js`'s range tests all take 0-5 -- and yet NOT ONE ticket on the
-- board reads 0. `AGT-383` and `AGT-252` both read 1, which is the score John's own 2026-10-08
-- ruling says they are not: they are PARKED, waiting on `mcp-poc` and `trainer-authored-agents`,
-- neither of which is executing. The live routine prompt still says `score it 1`. And the half of
-- the answer that would make a 0 useful -- WHERE the ticket waits -- had nowhere to go: `home` is
-- `placement_target()`'s, which admits an `executing` project and nothing else (V1), so a paused or
-- planned project could not be named at all, and a `no-fit` only stamps. No project is ever created.
--
-- So a parked ticket was a ticket with a wrong score and no destination, and the one sentence that
-- recorded the truth about it lived in free text at the front of its reason.
--
-- JOHN'S CALLS (JOHN-0925-DESIGNER-DECIDES, reversible, kickoff §2): a placed `no-fit` stays
-- UNGRADED; a 0 may stay exactly where it is (a null home is an answer); a project she names is
-- created `planned` and CAPTURE ONLY -- turning any project on stays John's hand; and `AGT-383` and
-- `AGT-252` take the 0 he recorded.
--
-- WHAT THIS MIGRATION SHIPS.
--
--   (a) `public.victoria_parked_homes()` -- STABLE, `service_role` only. The projects a parked
--       ticket may wait in: every `paused` and `planned` one, as `{slug, name, status}`. It is the
--       mirror of `victoria_charter_state()`'s charters for the other half of the board -- the list
--       door hands it over, so no project slug is ever written into code (requirements d.5, d.17).
--
--   (b) `public.park_target(uuid, text, text)` -- SECURITY DEFINER, `service_role` only, and the ONE
--       home of the parking rules exactly as `placement_target()` is the one home of the placement
--       rules (pattern:14, pattern:15): a `john-named` ticket is never moved (d.10), exactly one of
--       `p_home` / `p_new_name` is named, `p_home` is a PAUSED or PLANNED project (an executing one
--       is `placement_target()`'s job, not a parking place) and resolves to its oldest epic -- one is
--       created, named after the project, when it has none -- and `p_new_name` creates the PLANNED
--       project John's call allows (`updated_by 'victoria'`) with one epic named after it.
--
--   (c) `public.apply_requirement_verdict(uuid, text, jsonb)` -- the LIVE body (md5
--       `9f81533d7084820d887bfb2fb6099765`, read with `pg_get_functiondef`) with the identity
--       argument list UNCHANGED and NO DROP, so no second overload can exist
--       (.claude/rules/supabase-function-signature.md). Three edits: a `pass` AT 0 carrying
--       `home_project` or `new_project` resolves its epic through `park_target()` instead of
--       `placement_target()` (above 0 nothing changes, byte for byte); a `new_project` on a pass
--       scoring above 0 is refused; and a new `park` verdict -- the answer for a `no-fit`, which
--       carries NO grade and therefore gets no grade check -- writes its own `placement` decision, a
--       full-row before-image and the same token-wrapped UPDATE a `move` makes.
--
--   (d) The three `skill_profiles` rows, as DATA and never as code (pattern:2), each under its OWN
--       `agent-row` decision and full-row before-image (`cycle_id` only --
--       `ck_before_image_attribution` refuses both attribution columns at once), so one
--       `reverse_decision()` puts any one of them back whole: `vc-reorganize-intent` (the answer
--       format: `need_score.minimum` 0 and a `new_project` property, with the enum and `required`
--       untouched, and step 3's parked sentence rewritten), `vc-john-severity-tree` (the sentence
--       that said her answer format could not do this yet) and `vc-prioritization-duty` (the tools
--       sentence that said the list door accepts only 1-5, and the gap list that still named a
--       parked 0 as something the tools cannot do).
--
--   (e) The two tickets John ruled on, through the door this migration just built rather than by a
--       hand-written UPDATE: `AGT-383` -> 0 waiting on `mcp-poc`, `AGT-252` -> 0 waiting on
--       `trainer-authored-agents`, each echoing the `need_source` it already carries, each with NO
--       home (both are `john-named`, and a ticket John named is never moved -- d.10), and each with
--       its own `requirement-check` decision and before-image, so one Reverse puts the 1 back.
--
--   (f) The gate. A migration's success flag proves nothing
--       (.claude/rules/supabase-column-grants.md): one overload each, EXECUTE closed to `anon` and
--       `authenticated` and open to `service_role` on both new functions, and both tickets reading 0.
--
-- WHAT IT DOES NOT DO: it changes `placement_target()`, `grade_standing()`,
-- `parent_project_of_blockers()`, `epic_lock_guard()`, `scope_origin_door()` and `requirement_gate()`
-- not at all; it turns no project on; it widens the LIST vocabulary not at all (`park` is a WRITER
-- verdict the door sends after a `no-fit`'s stamp, never an answer she types); and it moves no real
-- ticket -- (e) grades two and homes neither.
--
-- THE DOWN, IN TWO HALVES, BOTH TAKEN BEFORE THIS RAN:
--   the functions `capture_migration_down('6bc9245b-b96b-4619-940a-3bbf3b5dac54',
--                 'agt490_parked_home', '[{"kind":"function","identity":"public.apply_requirement_verdict(uuid, text, jsonb)"},
--                 {"kind":"function","identity":"public.victoria_parked_homes()"},
--                 {"kind":"function","identity":"public.park_target(uuid, text, text)"}]')
--                 -> captured_class `auto-downable`, objects_captured 3, refusals 0. The two new ones
--                 down to a `drop function if exists`; ARV's down is its live body, md5
--                 `9f81533d7084820d887bfb2fb6099765`.
--   the rows      `capture_migration_down()` has NO row kind, so the data half is hand-built in step
--                 (0) below, AGT-487's and AGT-489's shape: one `record_decision` of kind `agent-row`
--                 per row, then the FULL-row `runner_before_images` insert over that row under its
--                 own decision, `cycle_id` only. THREE decisions and three images, never one of each
--                 over three rows -- a single undo of three rows cannot put one of them back.
--
-- Mirror of migration `agt490_parked_home`, byte-identical. Guard
-- `tests/regression/agt-490-parked-home.test.mjs`.

-- ============================================================================================
-- (0) THE DOWN, HALF TWO: the three rows' undo, taken BEFORE any of them is touched.
-- ============================================================================================

do $undo$
declare
  r record;
  d uuid;
  v_n integer := 0;
begin
  for r in
    select * from (values
      ('89d5bbeb-e0a5-4d26-91f7-ecaf84b2c18d'::uuid,
       'vc-reorganize-intent takes need_score 0, gains new_project and names where a parked 0 waits'),
      ('3147ef54-71e9-44b8-b02f-50dfca5f466d'::uuid,
       'vc-john-severity-tree: the parked project is named in her answer, not only in her reason'),
      ('f05a0f2f-d09f-4a45-9aff-5b50377ad7c6'::uuid,
       'vc-prioritization-duty: the list door takes 0-5 and a 0 names where it waits')
    ) as t(row_id, summary)
  loop
    if not exists (select 1 from public.skill_profiles sp where sp.id = r.row_id) then
      raise exception 'AGT-490: no skill_profiles row reads id %', r.row_id;
    end if;

    d := public.record_decision(
      '6bc9245b-b96b-4619-940a-3bbf3b5dac54', NULL, 'agent-row', 'AGT-490', r.summary,
      $why$AGT-490, JOHN-0925-DESIGNER-DECIDES (reversible): a 0 is accepted everywhere and no ticket reads one, because the answer format could not say WHERE a parked ticket waits. The rule is the row, as DATA and never as code: the answer format takes a 0 and a new_project, the tree says to name the project in the answer, and the duty row stops saying the door takes only 1-5. One reverse_decision() of THIS decision puts THIS row back whole -- which is why each of the three rows gets its own. pattern:2$why$,
      NULL);

    insert into public.runner_before_images
      (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    select '6bc9245b-b96b-4619-940a-3bbf3b5dac54', NULL, 'skill_profiles', sp.id::text, to_jsonb(sp), d
      from public.skill_profiles sp where sp.id = r.row_id;

    v_n := v_n + 1;
    raise notice 'AGT-490: skill row undo decision % over skill_profiles %', d, r.row_id;
  end loop;

  if v_n <> 3 then
    raise exception 'AGT-490: three rows get three undos; built %', v_n;
  end if;
end $undo$;

-- ============================================================================================
-- (1) THE TWO FUNCTIONS. service_role only -- Postgres grants EXECUTE to anon, authenticated and
--     service_role BY NAME the instant a function is created, and REVOKE ... FROM PUBLIC leaves
--     those named grants standing (.claude/rules/supabase-column-grants.md, SES-315).
-- ============================================================================================

create or replace function public.victoria_parked_homes()
returns table(slug text, name text, status text)
language sql stable
set search_path = public, pg_catalog
as $$
  -- AGT-490 (a): where a PARKED (0) ticket may wait. Everything that is not executing and not over:
  -- `paused` (it ran and stopped) and `planned` (it has not started). An `executing` project is a
  -- placement, not a park, and `placement_target()` already owns that half.
  select pj.slug::text, pj.name::text, pj.status::text
    from public.projects pj
   where pj.status in ('paused', 'planned')
   order by pj.status, pj.priority nulls last, pj.slug
$$;

create or replace function public.park_target(p_ticket uuid, p_home text, p_new_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_bid    text;
  v_origin text;
  v_home   text := nullif(btrim(coalesce(p_home, '')), '');
  v_new    text := nullif(btrim(coalesce(p_new_name, '')), '');
  v_slug   text;
  v_pid    uuid;
  v_pname  text;
  v_status text;
  v_epic   uuid;
begin
  select b.backlog_id, b.scope_origin into v_bid, v_origin
    from public.backlog_items b where b.id = p_ticket;
  if v_bid is null then
    raise exception 'AGT-490: no backlog_items row has id %', p_ticket using errcode = 'check_violation';
  end if;

  -- d.10, the same first rule placement_target() holds: she never moves a ticket John named.
  if coalesce(v_origin, '') = 'john-named' then
    raise exception 'AGT-490: % is a ticket John named; it is never moved', v_bid
      using errcode = 'check_violation';
  end if;

  -- EXACTLY ONE. Neither is "park it nowhere", which is a null home and not a call at all; both is
  -- an answer that names two destinations, and picking one of them here would be this function
  -- deciding what she meant.
  if (v_home is null) = (v_new is null) then
    raise exception 'AGT-490: a park names exactly one of home_project / new_project; got home %, new_project %',
      coalesce(v_home, '(none)'), coalesce(v_new, '(none)') using errcode = 'check_violation';
  end if;

  if v_home is not null then
    select pj.id, pj.name, pj.status into v_pid, v_pname, v_status
      from public.projects pj where pj.slug = v_home;
    if v_pid is null or v_status not in ('paused', 'planned') then
      raise exception 'AGT-490: home % is not a paused or planned project (%); a parked 0 waits where nothing is running',
        v_home, coalesce(v_status, 'no such project') using errcode = 'check_violation';
    end if;
    -- The project's OWN list, which is its oldest epic -- placement_target()'s rule, over the other
    -- half of the board. A project with no epic yet gets one named after itself rather than a
    -- refusal: the park is the point, and the list it waits on is bookkeeping.
    select e.id into v_epic
      from public.epics e where e.project_id = v_pid
     order by e.created_at, e.id limit 1;
    if v_epic is null then
      insert into public.epics (name, project_id, description)
      values (v_pname, v_pid, 'AGT-490: the parked list of ' || v_home)
      returning id into v_epic;
    end if;
    return v_epic;
  end if;

  -- A PROJECT NAMED FOR THE FIRST TIME. John's call: `planned` and capture only -- nothing is built
  -- there, the pick skips it outright (`epic_project_executing()` is false), and turning it on is
  -- his hand alone. The slug is DERIVED from the name, never asked for: two answers that name the
  -- same project must not be able to create two projects (pattern:3).
  v_slug := btrim(lower(regexp_replace(v_new, '[^a-zA-Z0-9]+', '-', 'g')), '-');
  if length(v_slug) < 3 or length(v_slug) > 60 then
    raise exception 'AGT-490: new_project % makes the slug %, which is % character(s); a slug is 3-60',
      v_new, coalesce(nullif(v_slug, ''), '(empty)'), length(v_slug) using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.projects pj where pj.slug = v_slug) then
    raise exception 'AGT-490: new_project % makes the slug %, which already names a project; park into it by home instead',
      v_new, v_slug using errcode = 'check_violation';
  end if;
  insert into public.projects (slug, name, status, updated_by)
  values (v_slug, v_new, 'planned', 'victoria')
  returning id into v_pid;
  insert into public.epics (name, project_id, description)
  values (v_new, v_pid, 'AGT-490: the parked list of ' || v_slug)
  returning id into v_epic;
  return v_epic;
end
$$;

revoke all on function public.victoria_parked_homes() from PUBLIC, anon, authenticated;
grant execute on function public.victoria_parked_homes() to service_role;
revoke all on function public.park_target(uuid, text, text) from PUBLIC, anon, authenticated;
grant execute on function public.park_target(uuid, text, text) to service_role;

-- ============================================================================================
-- (2) apply_requirement_verdict -- the LIVE body (md5 9f81533d7084820d887bfb2fb6099765) with
--     exactly three edits. The identity argument list is UNCHANGED and there is NO DROP, so no
--     second overload can exist (.claude/rules/supabase-function-signature.md).
--       edit 1 -- the pass branch reads `new_project` too, refuses it above 0, and sends a 0 that
--                 names a destination to park_target() instead of placement_target().
--       edit 2 -- a new `park` branch before the final else.
--       edit 3 -- the final raise names the fourth verdict.
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

-- ============================================================================================
-- (3) THE THREE ROWS, DATA and never code (pattern:2). Every substitution is an EXACT substring
--     counted BEFORE it is made: a replace() that matched nothing reports success and changes
--     nothing, which is the failure this block exists to make impossible.
-- ============================================================================================

do $rows$
declare
  v_from  text;
  v_to    text;
  v_hits  integer;
  v_text  text;
begin
  -- 3a. vc-reorganize-intent -- the ANSWER FORMAT. need_score takes 0, a new_project property is
  --     added, and the enum and `required` are untouched: `new_project` is optional, because the
  --     ordinary parked answer names a home or nothing at all.
  update public.skill_profiles sp
     set traits = jsonb_set(jsonb_set(sp.traits,
                    '{schema,properties,rows,items,properties,need_score,minimum}',
                    '0'::jsonb),
                    '{schema,properties,rows,items,properties,new_project}',
                    '{"type":["string","null"],"maxLength":80,"description":"The name of a PLANNED project to create for a parked ticket to wait in, when no parked_homes slug fits; capture only, nothing is built there. Never beside home, and only on a 0 or a no-fit."}'::jsonb),
         updated_at = now()
   where sp.id = '89d5bbeb-e0a5-4d26-91f7-ecaf84b2c18d';

  v_from := $f1$If the tree says a ticket is PARKED (0), your answer format does not accept 0: put "PARKED (0) until <project> is active" first in its reason and score it 1 (the lowest the checker accepts; the pick skips anything below 3, and the PARKED (0) prefix marks it to be re-scored), and name the project.$f1$;
  v_to := $t1$If the tree says a ticket is PARKED (0): score it 0, begin its reason "PARKED (0) until <project> is active" and name where it waits: home = a paused or planned slug from parked_homes, or new_project = a PLANNED project name (capture only); null home stays. A no-fit may do the same, ungraded.$t1$;
  select sp.method into v_text from public.skill_profiles sp
   where sp.id = '89d5bbeb-e0a5-4d26-91f7-ecaf84b2c18d';
  v_hits := (length(v_text) - length(replace(v_text, v_from, ''))) / length(v_from);
  if v_hits <> 1 then
    raise exception 'AGT-490: vc-reorganize-intent must carry the parked sentence exactly once; it carries it % time(s)', v_hits;
  end if;
  update public.skill_profiles sp set method = replace(sp.method, v_from, v_to), updated_at = now()
   where sp.id = '89d5bbeb-e0a5-4d26-91f7-ecaf84b2c18d';

  -- 3b. vc-john-severity-tree -- the sentence that said the answer format could not do this yet.
  v_from := $f2$Your answer format cannot do this yet: name the project in your reason.$f2$;
  v_to := $t2$Name it in your answer: home for a paused or planned project (parked_homes), or new_project to create a PLANNED one.$t2$;
  select sp.method into v_text from public.skill_profiles sp
   where sp.id = '3147ef54-71e9-44b8-b02f-50dfca5f466d';
  v_hits := (length(v_text) - length(replace(v_text, v_from, ''))) / length(v_from);
  if v_hits <> 1 then
    raise exception 'AGT-490: vc-john-severity-tree must carry the "cannot do this yet" sentence exactly once; it carries it % time(s)', v_hits;
  end if;
  update public.skill_profiles sp set method = replace(sp.method, v_from, v_to), updated_at = now()
   where sp.id = '3147ef54-71e9-44b8-b02f-50dfca5f466d';

  -- 3c. vc-prioritization-duty -- what her tools do TODAY, which is now a different sentence, and
  --     the gap list that still named a parked 0 as something the tools cannot do.
  v_from := $f3$accepts only a whole number 1-5$f3$;
  v_to := $t3$accepts a whole number 0-5 and a 0 names where it waits (home from parked_homes, or new_project)$t3$;
  select sp.method into v_text from public.skill_profiles sp
   where sp.id = 'f05a0f2f-d09f-4a45-9aff-5b50377ad7c6';
  v_hits := (length(v_text) - length(replace(v_text, v_from, ''))) / length(v_from);
  if v_hits <> 1 then
    raise exception 'AGT-490: vc-prioritization-duty must carry the 1-5 clause exactly once; it carries it % time(s)', v_hits;
  end if;
  update public.skill_profiles sp set method = replace(sp.method, v_from, v_to), updated_at = now()
   where sp.id = 'f05a0f2f-d09f-4a45-9aff-5b50377ad7c6';

  v_from := $f4$, a parked 0)$f4$;
  v_to := $t4$)$t4$;
  select sp.method into v_text from public.skill_profiles sp
   where sp.id = 'f05a0f2f-d09f-4a45-9aff-5b50377ad7c6';
  v_hits := (length(v_text) - length(replace(v_text, v_from, ''))) / length(v_from);
  if v_hits <> 1 then
    raise exception 'AGT-490: vc-prioritization-duty must carry the gap-list clause exactly once; it carries it % time(s)', v_hits;
  end if;
  update public.skill_profiles sp set method = replace(sp.method, v_from, v_to), updated_at = now()
   where sp.id = 'f05a0f2f-d09f-4a45-9aff-5b50377ad7c6';
end $rows$;

-- ============================================================================================
-- (4) THE TWO TICKETS JOHN RULED ON (2026-10-08), through the door above and not by hand. Each is
--     a `pass` at 0 echoing the need_source the ticket already carries, with NO home: both are
--     `john-named`, and a ticket John named is never moved (d.10) -- the project it waits for is
--     named in the reason, which is where the PARKED sentence has always lived.
-- ============================================================================================

do $parked$
declare
  r record;
  d uuid;
begin
  for r in
    select * from (values
      ('AGT-383', 'mcp-poc'),
      ('AGT-252', 'trainer-authored-agents')
    ) as t(bid, slug)
  loop
    d := public.apply_requirement_verdict(
      '6bc9245b-b96b-4619-940a-3bbf3b5dac54', NULL,
      jsonb_build_object(
        'verdict', 'pass',
        'backlog_id', r.bid,
        'need_source', (select b.need_source from public.backlog_items b where b.backlog_id = r.bid),
        'need_score', 0,
        'reason', 'PARKED (0) until ' || r.slug || ' is active -- John 2026-10-08 ruled 0',
        'account', 'Recorded two parked tickets'));
    raise notice 'AGT-490: % parked at 0 under decision %', r.bid, d;
  end loop;
end $parked$;

-- ============================================================================================
-- (5) THE GATE. A migration's success flag proves nothing (.claude/rules/supabase-column-grants.md):
--     every claim below is asserted, both directions on the grants, and a RAISE here rolls the
--     whole transaction back.
-- ============================================================================================

do $gate$
declare
  fn      text;
  v_n     integer;
  v_score smallint;
  v_homes integer;
  v_paused integer;
  v_images integer;
  v_traits jsonb;
begin
  -- 5a. ONE overload each, never two (.claude/rules/supabase-function-signature.md).
  foreach fn in array array['apply_requirement_verdict', 'victoria_parked_homes', 'park_target'] loop
    select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = fn;
    if v_n <> 1 then
      raise exception 'AGT-490 gate: public.% must have exactly ONE overload; found %', fn, v_n;
    end if;
  end loop;

  -- 5b. BOTH DIRECTIONS on the two new functions: the public keys are refused, service_role works.
  foreach fn in array array['public.victoria_parked_homes()', 'public.park_target(uuid, text, text)'] loop
    if has_function_privilege('anon', fn, 'EXECUTE') then
      raise exception 'AGT-490 gate: anon must NOT hold EXECUTE on %', fn;
    end if;
    if has_function_privilege('authenticated', fn, 'EXECUTE') then
      raise exception 'AGT-490 gate: authenticated must NOT hold EXECUTE on %', fn;
    end if;
    if not has_function_privilege('service_role', fn, 'EXECUTE') then
      raise exception 'AGT-490 gate: service_role MUST hold EXECUTE on %', fn;
    end if;
  end loop;

  -- 5c. The reader answers the paused and planned projects, and NOTHING that is executing --
  --     against the gate's own inline recount of the same predicate.
  select count(*) into v_homes from public.victoria_parked_homes();
  select count(*) into v_paused from public.projects pj where pj.status in ('paused', 'planned');
  if v_homes <> v_paused then
    raise exception 'AGT-490 gate: victoria_parked_homes() reads % project(s); the inline recount reads %',
      v_homes, v_paused;
  end if;
  if exists (select 1 from public.victoria_parked_homes() h
              join public.projects pj on pj.slug = h.slug where pj.status = 'executing') then
    raise exception 'AGT-490 gate: victoria_parked_homes() named an executing project';
  end if;

  -- 5d. THE ROW that carries the answer format.
  select sp.traits into v_traits from public.skill_profiles sp
   where sp.id = '89d5bbeb-e0a5-4d26-91f7-ecaf84b2c18d';
  if (v_traits #> '{schema,properties,rows,items,properties,need_score,minimum}') <> '0'::jsonb then
    raise exception 'AGT-490 gate: need_score.minimum must be 0; it reads %',
      v_traits #> '{schema,properties,rows,items,properties,need_score,minimum}';
  end if;
  if (v_traits #> '{schema,properties,rows,items,properties,new_project,type}') <> '["string","null"]'::jsonb then
    raise exception 'AGT-490 gate: new_project must be a nullable string; it reads %',
      v_traits #> '{schema,properties,rows,items,properties,new_project}';
  end if;
  if jsonb_array_length(v_traits #> '{schema,properties,rows,items,properties,verdict,enum}') <> 5 then
    raise exception 'AGT-490 gate: the verdict enum is unchanged at five values; it holds %',
      v_traits #> '{schema,properties,rows,items,properties,verdict,enum}';
  end if;
  if (v_traits #> '{schema,properties,rows,items,required}') ? 'new_project' then
    raise exception 'AGT-490 gate: new_project is optional; required must not name it';
  end if;

  -- 5e. EXACTLY THREE before-images name skill_profiles under this cycle -- the rows' whole undo,
  --     one per row.
  select count(*) into v_images from public.runner_before_images i
   where i.cycle_id = '6bc9245b-b96b-4619-940a-3bbf3b5dac54' and i.table_name = 'skill_profiles';
  if v_images <> 3 then
    raise exception 'AGT-490 gate: exactly THREE runner_before_images rows name skill_profiles under this cycle; found %', v_images;
  end if;

  -- 5f. AND THE TWO TICKETS READ 0 -- the whole point of the ship, asserted on the board itself.
  foreach fn in array array['AGT-383', 'AGT-252'] loop
    select b.need_score into v_score from public.backlog_items b where b.backlog_id = fn;
    if v_score is distinct from 0::smallint then
      raise exception 'AGT-490 gate: % must read need_score 0; it reads %', fn, coalesce(v_score::text, '(null)');
    end if;
    if not exists (select 1 from public.pick_exclusions() x
                    where x.backlog_id = fn and 'need_score 0 is below 3' = any(x.reasons)) then
      raise exception 'AGT-490 gate: % reads 0 and the pick must say so', fn;
    end if;
  end loop;

  raise notice 'AGT-490 gate: 3 functions one overload each, parked_homes % = recount %, need_score.minimum 0, new_project nullable, % skill_profiles images, AGT-383 and AGT-252 at 0',
    v_homes, v_paused, v_images;
end $gate$;
