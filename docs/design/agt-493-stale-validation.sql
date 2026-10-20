-- Repo record of the migration `agt493_stale_validation` (AGT-493, v7.0.870, cycle e5d8d8a1-0fb8-4802-85b5-381c7d5bb019).
-- What: a ticket filed more than 14 days ago is validated by the Governance Architect before Victoria's
-- move door can place it (decision 30 of docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md, John 2026-10-13).
-- The `validate-ticket` capability, its `architect` assignment, the six links of the findings review with
-- `ga-review-intent` swapped for the new `ga-validate-intent`, and `JOHN-1013-STALE-VALIDATION` are seeded
-- as DATA (pattern:2, ARCHITECTURE section 19b). `validation_standing()` says which validations still
-- stand (14 days — the age rule's own window, no new knob), `needs_validation()` names what must be
-- validated, `placement_target()` gains block (g) and refuses to place one, and
-- `apply_ticket_validation()` is the one write path: `confirmed` stamps `revalidated_at` and leaves the
-- grade standing, `revised` rewrites the description (which reopens the grade through `grade_standing()`'s
-- own d.13 test — nothing here writes a grade), `not-real` sends the ticket to `removal proposed`.
-- Rule #1 holds: no row seeded here names another agent.
--
-- Measured on this tree before the build (not recalled): 500 open/partial non-john-named tickets filed
-- more than 14 days ago, 94 of them holding `need_score >= 3`, and `placement_target()` had no age test.
--
-- Agent-row gate, run before this file was written (T1, kept verbatim):
-- agent-row-gate: AGT-493 · action=edit-active · scope_origin="john-named" → BUILD — action 'edit-active' under scope_origin = 'john-named' AND an unreversed runner_decisions row names this ticket — AGENT-ROW-AGREED-TICKET makes this build work under the ticket, no approval card. It still owes its own runner_before_images row under one decision handle. · need_source=john:runner_decisions:57894411-de47-4718-9d2a-f3426a43cebc (unreversed John decision)
--
-- GATE-G is applied as a full CREATE OR REPLACE of `placement_target(uuid, text)` with the SAME identity
-- argument list — block (g) added between (f) and the `-- (c) d.10:` comment, every other line the live
-- body verbatim (supabase-function-signature.md: a changed argument list would leave a second overload
-- behind, and PostgREST would answer an ambiguity error as an empty result).

-- =====================================================================================================
-- T1 — the down capture. Run in the call IMMEDIATELY BEFORE apply_migration, never after: run after, it
-- captures the state the up just wrote, which is a down that restores the bug.
-- =====================================================================================================
-- Result: captured_class auto-downable, objects_captured 4, refusals 0. The derived down DROPs the three
-- new functions and restores placement_target()'s pre-change body by CREATE OR REPLACE, then asserts it
-- left exactly one overload behind.
select * from public.capture_migration_down('e5d8d8a1-0fb8-4802-85b5-381c7d5bb019','agt493_stale_validation',
 '[{"kind":"function","identity":"public.validation_standing()"},
   {"kind":"function","identity":"public.needs_validation()"},
   {"kind":"function","identity":"public.placement_target(uuid, text)"},
   {"kind":"function","identity":"public.apply_ticket_validation(uuid, text, jsonb)"}]'::jsonb);

-- =====================================================================================================
-- T2 — the migration `agt493_stale_validation`, applied verbatim as below.
-- =====================================================================================================
DO $mig$
DECLARE
  v_cycle uuid := 'e5d8d8a1-0fb8-4802-85b5-381c7d5bb019';
  v_dec   uuid;
  v_n     int;
BEGIN
  -- -------------------------------------------------------------------------------------------------
  -- 0. DEC — the one decision handle every before-image below hangs from.
  -- -------------------------------------------------------------------------------------------------
  v_dec := public.record_decision(v_cycle, NULL, 'agent-row', 'AGT-493',
    'validate-ticket: stale tickets validated before they move',
    $r$Premise ALIVE (measured 2026-10-20, not recalled): 500 open/partial tickets that are not john-named were filed more than 14 days ago, 94 of them holding need_score >= 3 -- and placement_target() had no age test at all, so Victoria's move door placed every one of them unvalidated. The re-grade half was already built: grade_standing() drops a grade the moment the ticket's description changes (d.13), which is exactly d.30's RESOLVED clause -- a `revised` validation reopens the grade, a `confirmed` one leaves it standing. So this build adds the missing half as DATA and one gate: the Governance Architect gains a `validate-ticket` capability (intent ga-validate-intent, the six links of its review copied with the intent swapped), validation_standing() says which validations still stand (14 days, the age rule's own window), needs_validation() names every open/partial non-john-named ticket filed more than 14 days ago with no standing validation, placement_target() refuses to place one (block (g)), and apply_ticket_validation() records the one `ticket-validation` decision -- confirmed stamps revalidated_at, revised rewrites the description (which reopens the grade through grade_standing(), nothing here writes a grade), not-real sends the ticket to 'removal proposed'. john-named tickets stay outside the sensor because placement_target() (b) never moves them anyway, so a validation turn on one buys nothing (pattern:9). The signal is the decision row, never revalidated_at: two non-architect paths stamp that column, so reading it as "the architect validated this" would let a stamp nobody judged open the door. Reversible: every touched row carries a before-image under this decision, and each validation is its own reversible decision. John 2026-10-13, decision 30 of docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md; rule JOHN-1013-STALE-VALIDATION.$r$,
    public.ladder_work_class('P10 - Tooling'));

  -- -------------------------------------------------------------------------------------------------
  -- 1. ROWS (harvest S1-S3, M6). Every one an INSERT, so every image carries row_data NULL.
  -- -------------------------------------------------------------------------------------------------
  INSERT INTO public.capabilities (slug, name, description, execution_type, tenant_id, display_phrase, default_intent_slug)
  VALUES ('validate-ticket', 'Validate Ticket',
    'Validates a ticket filed more than 14 days ago before it moves into an active project: is the problem still real, is there prior art, does the cause still hold. Confirms it unchanged, revises its text, or rules it no longer real.',
    'ai', 'global', 'validating an old ticket', 'ga-validate-intent');

  INSERT INTO public.skill_profiles
    (slug, name, skill_type_slug, objective, method, output_desc, description, traits, guardrails,
     technical_services, execution_type, tenant_id, llm_provider, llm_model, max_tokens, temperature, api_key_source)
  VALUES ('ga-validate-intent', 'Governance Architect Intent — validate an old ticket', 'intent',
    'Validate every ticket you are handed before it moves into an active project — is the problem STILL REAL, is there prior art, does the cause still hold — and answer one row per ticket.',
    $m$Your task_context carries list (the holding list these tickets wait on), standing_days (14: a validation stands this long, and a ticket is handed to you once it is older than this), and tickets — one per ticket: backlog_id, title, description (whole), filed_at, status, type, priority_class, need_source, need_score, graded (a grade already stands). For EACH ticket answer exactly one row. STILL REAL: read the description as a claim about today's code and data and check it against what you can measure — a table, a function, a file, a count; name the measurement in the reason. PRIOR ART: look for an open or shipped ticket, a migration or a function that already covers it, and name it in prior_art ("none found" when there is none). CAUSE: does the cause the ticket names still hold, or did a later ship move it? Then rule: confirmed — the problem is real and the text is right as it stands; the grade it holds stands and no one re-grades it. revised — the problem is real but the text is wrong or stale: carry the WHOLE corrected description in description (every John sentence kept verbatim, the stale claims corrected, the measurement named); a changed text reopens the grade, so change it only when the finding behind it changed. not-real — the problem no longer exists or never did: say what you measured; the ticket leaves the move queue for the removal room. Never move, grade, build or file anything; never name another agent; the cheapest measurement that settles the claim wins. account: what you did this turn in ten words or fewer.$m$,
    NULL,
    'The validation of a ticket older than 14 days: still real, prior art, cause still holds.',
    $t${"schema":{"type":"object","required":["list","rows","account","patterns_applied"],"properties":{
 "list":{"type":"string"},
 "account":{"type":"string","maxLength":100},
 "patterns_applied":{"type":"array","items":{"type":"integer","minimum":1},"description":"The decision patterns you applied this turn, by number (pattern:N). Empty when none; every number must exist in the library."},
 "rows":{"type":"array","minItems":1,"items":{"type":"object","required":["backlog_id","verdict","reason"],"properties":{
   "backlog_id":{"type":"string","pattern":"^[A-Z]+-[0-9]+[a-z]?$"},
   "verdict":{"enum":["confirmed","revised","not-real"],"type":"string"},
   "reason":{"type":"string","maxLength":400},
   "prior_art":{"type":"string","maxLength":600},
   "description":{"type":"string","minLength":1,"maxLength":8000}}}}}},"can_request_help":false}$t$::jsonb,
    '{"must":[],"must_not":[]}'::jsonb,
    '[]'::jsonb, 'ai', NULL, 'anthropic', 'claude-opus-5', 8000, 0, 'platform');

  INSERT INTO public.agent_capability_assignments (tenant_id, agent_id, capability_slug)
  VALUES ('global', 'architect', 'validate-ticket');

  -- The review's six links, copied with the intent swapped: level, is_required and display_order are
  -- carried over rather than retyped, so the new capability reads in the same order as the review.
  INSERT INTO public.capability_skill_profiles (capability_slug, skill_profile_slug, level, is_required, display_order)
  SELECT 'validate-ticket', replace(skill_profile_slug, 'ga-review-intent', 'ga-validate-intent'),
         level, is_required, display_order
    FROM public.capability_skill_profiles
   WHERE capability_slug = 'review-audit-worklist';

  INSERT INTO public.governance_rules (id, statement, canonical_doc, enforcement, status, superseded_by, source_group)
  VALUES ('JOHN-1013-STALE-VALIDATION',
    'A ticket filed more than 14 days ago (filed_at) moves into an active project only after the Governance Architect validated it — is the problem still real, is there prior art, does the cause still hold — within the last 14 days; a validation that changes the ticket''s text reopens its grade, and a validation that confirms it unchanged leaves the grade as it is (John 2026-10-13, decision 30 of docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md).',
    (SELECT canonical_doc FROM public.governance_rules WHERE id = 'JOHN-1013-TESTED-TICKETS'),
    (SELECT enforcement   FROM public.governance_rules WHERE id = 'JOHN-1013-TESTED-TICKETS'),
    'live', NULL,
    (SELECT source_group  FROM public.governance_rules WHERE id = 'JOHN-1013-TESTED-TICKETS'));

  -- -------------------------------------------------------------------------------------------------
  -- 2. One before-image per inserted row — row_data NULL, AGT-492's convention for an INSERT.
  -- -------------------------------------------------------------------------------------------------
  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  SELECT v_cycle, NULL, 'capabilities', c.id::text, NULL, v_dec
  FROM public.capabilities c WHERE c.slug = 'validate-ticket';

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  SELECT v_cycle, NULL, 'skill_profiles', s.id::text, NULL, v_dec
  FROM public.skill_profiles s WHERE s.slug = 'ga-validate-intent';

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  SELECT v_cycle, NULL, 'agent_capability_assignments', a.id::text, NULL, v_dec
  FROM public.agent_capability_assignments a
  WHERE a.capability_slug = 'validate-ticket' AND a.agent_id = 'architect';

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  SELECT v_cycle, NULL, 'capability_skill_profiles', l.id::text, NULL, v_dec
  FROM public.capability_skill_profiles l WHERE l.capability_slug = 'validate-ticket';

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  VALUES (v_cycle, NULL, 'governance_rules', 'JOHN-1013-STALE-VALIDATION', NULL, v_dec);

  SELECT count(*) INTO v_n FROM public.runner_before_images WHERE decision_id = v_dec;
  IF v_n <> 10 THEN
    RAISE EXCEPTION 'agt493: expected 10 before-images under the decision (1 capability + 1 skill + 1 assignment + 6 links + 1 rule), got %', v_n;
  END IF;
END $mig$;

-- =====================================================================================================
-- STANDING (harvest M1) — which validations still stand.
-- =====================================================================================================
create or replace function public.validation_standing()
returns table(backlog_id text, decision_id uuid, decided_at timestamptz)
language sql stable set search_path = public, pg_catalog as $$
  -- AGT-493 (d.30): a validation STANDS while the ticket's newest ticket-validation decision is
  -- unreversed and no older than the age rule's own window (d.8: 14 days).
  select b.backlog_id::text, d.id, d.decided_at
    from public.backlog_items b
    join lateral (
      select d.id, d.decided_at, d.reversed_at
        from public.runner_decisions d
       where d.kind = 'ticket-validation' and d.backlog_id = b.backlog_id
       order by d.decided_at desc limit 1) d on true
   where b.status in ('open', 'partial')
     and d.reversed_at is null
     and d.decided_at >= now() - interval '14 days'
$$;

-- =====================================================================================================
-- SENSOR (harvest M2) — which tickets must be validated before they move.
-- =====================================================================================================
create or replace function public.needs_validation()
returns table(backlog_id text, filed_at timestamptz)
language sql stable set search_path = public, pg_catalog as $$
  -- AGT-493 (d.8, d.30): filed more than 14 days ago and no validation stands. A john-named ticket
  -- is never moved by the door (d.10, placement_target (b)), so validating it buys nothing (pattern:9).
  select b.backlog_id::text, b.filed_at
    from public.backlog_items b
   where b.status in ('open', 'partial')
     and coalesce(b.scope_origin, '') <> 'john-named'
     and b.filed_at < now() - interval '14 days'
     and not exists (select 1 from public.validation_standing() v where v.backlog_id = b.backlog_id)
$$;

-- =====================================================================================================
-- WRITER (harvest M4) — the one write path of a validation. R1-R6, every rule before any write.
-- =====================================================================================================
create or replace function public.apply_ticket_validation(p_cycle uuid, p_session text, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
declare
  v_verdict  text := lower(btrim(coalesce(p ->> 'verdict', '')));
  v_bid      text := btrim(coalesce(p ->> 'backlog_id', ''));
  v_reason   text := btrim(coalesce(p ->> 'reason', ''));
  v_desc     text := p ->> 'description';
  v_ticket   public.backlog_items%rowtype;
  v_decision uuid;
begin
  -- R1. Exactly one author, the same rule record_decision() and runner_before_images both carry.
  if (p_cycle is not null) = (p_session is not null) then
    raise exception 'apply_ticket_validation: exactly one of p_cycle / p_session must be set -- a validation has exactly one author';
  end if;
  -- R2. A validation without its reason is a stamp, which is the thing this ticket exists to replace.
  if v_reason = '' then
    raise exception 'AGT-493: a validation carries its one-line reason';
  end if;
  -- R3.
  if v_verdict not in ('confirmed', 'revised', 'not-real') then
    raise exception 'AGT-493: verdict must be confirmed, revised or not-real; got %',
      coalesce(p ->> 'verdict', '(none)') using errcode = 'check_violation';
  end if;
  -- R4.
  if v_bid = '' then
    raise exception 'AGT-493: a validation names its backlog_id';
  end if;
  select * into v_ticket from public.backlog_items b where b.backlog_id = v_bid;
  if not found then
    raise exception 'AGT-280: no backlog_items row reads backlog_id %', v_bid;
  end if;
  if v_ticket.status not in ('open', 'partial') then
    raise exception 'AGT-493: % is %; only an open or partial ticket is validated',
      v_bid, v_ticket.status using errcode = 'check_violation';
  end if;
  -- R5. THE TEXT IS THE RE-GRADE TRIGGER, so it is only ever carried by a `revised` answer and it
  --     must actually differ: grade_standing() reopens the grade by comparing the description to the
  --     grade's own before-image (d.13), and a same-text "revision" would reopen nothing while
  --     reading to every later session as a rewrite.
  if v_verdict = 'revised' then
    if coalesce(btrim(v_desc), '') = '' or v_desc is not distinct from v_ticket.description then
      raise exception 'AGT-493: a revised validation carries a description that differs from the ticket''s'
        using errcode = 'check_violation';
    end if;
  elsif v_desc is not null then
    raise exception 'AGT-493: only a revised validation carries a description'
      using errcode = 'check_violation';
  end if;
  -- R6. ONE decision, the full-row image FIRST (pk_value the uuid, pattern:169), then exactly one
  --     UPDATE by id -- so one reverse_decision() puts the whole validation back.
  v_decision := public.record_decision(p_cycle, p_session, 'ticket-validation', v_ticket.backlog_id,
    v_ticket.backlog_id || ' validated: ' || v_verdict,
    v_reason || E'\nPrior art: ' || coalesce(nullif(btrim(p ->> 'prior_art'), ''), 'none named'),
    public.ladder_work_class(v_ticket.priority_class));

  insert into public.runner_before_images
    (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values
    (p_cycle, p_session, 'backlog_items', v_ticket.id::text, to_jsonb(v_ticket), v_decision);

  if v_verdict = 'confirmed' then
    -- Nothing grade_standing() reads is touched, so the grade stands and the list turn answers move.
    update public.backlog_items set revalidated_at = now(), updated_at = now() where id = v_ticket.id;
  elsif v_verdict = 'revised' then
    -- The one re-grade trigger in the platform, by construction: no grade is written here.
    update public.backlog_items set description = v_desc, revalidated_at = now(), updated_at = now()
     where id = v_ticket.id;
  else
    -- not-real: it must LEAVE the move population, or a standing validation on it would let a move
    -- place it. 'removal proposed' is the room the dead-premise path already uses (pattern:17).
    update public.backlog_items set status = 'removal proposed', updated_at = now() where id = v_ticket.id;
  end if;

  return v_decision;
end
$fn$;

-- =====================================================================================================
-- GATE-G (harvest M3) — placement_target(uuid, text), SAME identity argument list. Only block (g) is
-- added, between (f) and the `-- (c) d.10:` comment; every other line is the live body verbatim.
-- =====================================================================================================
CREATE OR REPLACE FUNCTION public.placement_target(p_ticket uuid, p_home text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
  -- (g) d.30 / AGT-493: a ticket filed more than 14 days ago moves only after a validation stands.
  if exists (select 1 from public.needs_validation() n where n.backlog_id = v_bid) then
    raise exception 'AGT-493: % was filed more than 14 days ago and no validation stands on it; it is validated first (d.30)',
      v_bid using errcode = 'check_violation';
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
$function$;

-- =====================================================================================================
-- GRANTS (harvest M5). pg_default_acl grants EXECUTE to anon, authenticated and service_role BY NAME
-- the instant a function is created, and REVOKE ... FROM PUBLIC leaves those named grants standing
-- (.claude/rules/supabase-column-grants.md, SES-315) -- so all three are revoked by name first.
-- =====================================================================================================
revoke all on function public.validation_standing() from PUBLIC, anon, authenticated;
grant execute on function public.validation_standing() to service_role;
revoke all on function public.needs_validation() from PUBLIC, anon, authenticated;
grant execute on function public.needs_validation() to service_role;
revoke all on function public.placement_target(uuid, text) from PUBLIC, anon, authenticated;
grant execute on function public.placement_target(uuid, text) to service_role;
revoke all on function public.apply_ticket_validation(uuid, text, jsonb) from PUBLIC, anon, authenticated;
grant execute on function public.apply_ticket_validation(uuid, text, jsonb) to service_role;

-- =====================================================================================================
-- GATE — seven arms (harvest M7), reads only but for G7, which writes inside a sub-block it then
-- rolls back. Each arm RAISEs on failure.
-- =====================================================================================================
DO $gate$
DECLARE
  v_cycle  uuid := 'e5d8d8a1-0fb8-4802-85b5-381c7d5bb019';
  v_links  text[];
  v_n      int;
  v_id     uuid;
  v_bid    text;
  v_epic   uuid;
  v_home   uuid;
  v_val    uuid;
  f        text;
BEGIN
  -- G1. the six links of the new capability, in display_order.
  SELECT array_agg(skill_profile_slug ORDER BY display_order) INTO v_links
  FROM public.capability_skill_profiles WHERE capability_slug = 'validate-ticket';
  IF v_links IS DISTINCT FROM ARRAY['ga-identity','ga-knowledge-review','ga-behavior','ga-validate-intent','ga-guardrails','dm-knowledge-patterns']::text[] THEN
    RAISE EXCEPTION 'GATE 1: links are %', v_links;
  END IF;

  -- G2. the architect holds it, exactly once.
  SELECT count(*) INTO v_n FROM public.agent_capability_assignments
   WHERE capability_slug = 'validate-ticket' AND agent_id = 'architect';
  IF v_n <> 1 THEN RAISE EXCEPTION 'GATE 2: architect x validate-ticket rows = %', v_n; END IF;

  -- G3. the capability's default intent answers, so no caller names an intent_slug.
  SELECT count(*) INTO v_n FROM public.capabilities
   WHERE slug = 'validate-ticket' AND default_intent_slug = 'ga-validate-intent';
  IF v_n <> 1 THEN RAISE EXCEPTION 'GATE 3: default_intent_slug is not ga-validate-intent'; END IF;

  -- G4. ONE overload each (supabase-function-signature.md), and the grant surface both ways
  --     (supabase-column-grants.md: the success flag of a REVOKE proves nothing).
  FOREACH f IN ARRAY ARRAY['validation_standing','needs_validation','placement_target','apply_ticket_validation'] LOOP
    SELECT count(*) INTO v_n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = f AND n.nspname = 'public';
    IF v_n <> 1 THEN RAISE EXCEPTION 'GATE 4: % has % overload(s), not 1', f, v_n; END IF;
  END LOOP;
  FOREACH f IN ARRAY ARRAY['public.validation_standing()','public.needs_validation()','public.placement_target(uuid, text)','public.apply_ticket_validation(uuid, text, jsonb)'] LOOP
    IF has_function_privilege('anon', f, 'EXECUTE') THEN RAISE EXCEPTION 'GATE 4: anon may EXECUTE %', f; END IF;
    IF has_function_privilege('authenticated', f, 'EXECUTE') THEN RAISE EXCEPTION 'GATE 4: authenticated may EXECUTE %', f; END IF;
    IF NOT has_function_privilege('service_role', f, 'EXECUTE') THEN RAISE EXCEPTION 'GATE 4: service_role may NOT EXECUTE %', f; END IF;
  END LOOP;

  -- G5. the rule is live and supersedes nothing.
  SELECT count(*) INTO v_n FROM public.governance_rules
   WHERE id = 'JOHN-1013-STALE-VALIDATION' AND status = 'live' AND superseded_by IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'GATE 5: JOHN-1013-STALE-VALIDATION is not live'; END IF;

  -- G6. THE SENSOR OVER THE REAL BOARD, and the gate refusing a real ticket. Reads only.
  SELECT count(*) INTO v_n FROM public.needs_validation();
  IF v_n < 1 THEN RAISE EXCEPTION 'GATE 6: needs_validation() names no ticket at all'; END IF;
  SELECT count(*) INTO v_n FROM public.needs_validation() n
    JOIN public.backlog_items b ON b.backlog_id = n.backlog_id
   WHERE coalesce(b.scope_origin, '') = 'john-named';
  IF v_n <> 0 THEN RAISE EXCEPTION 'GATE 6: needs_validation() names % john-named ticket(s)', v_n; END IF;
  SELECT b.id, b.backlog_id INTO v_id, v_bid
    FROM public.needs_validation() n
    JOIN public.backlog_items b ON b.backlog_id = n.backlog_id
   WHERE EXISTS (SELECT 1 FROM public.grade_standing() g WHERE g.backlog_id = n.backlog_id)
     AND NOT EXISTS (SELECT 1 FROM public.parent_project_of_blockers() pp WHERE pp.backlog_id = n.backlog_id)
   ORDER BY b.backlog_id
   LIMIT 1;
  IF v_id IS NULL THEN RAISE EXCEPTION 'GATE 6: no graded, parentless ticket in needs_validation() to test the gate with'; END IF;
  BEGIN
    v_epic := public.placement_target(v_id, 'tooling');
    RAISE EXCEPTION 'GATE 6: placement_target placed % (epic %) though no validation stands on it', v_bid, v_epic;
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM NOT LIKE 'AGT-493:%' THEN
      RAISE EXCEPTION 'GATE 6: % was refused, but not by the age gate: %', v_bid, SQLERRM;
    END IF;
  END;

  -- G7. BOTH WAYS, on a fixture, inside a sub-block that is rolled back whatever happens: the move is
  --     refused unvalidated, lands once confirmed, and the grade is never re-answered (ONE
  --     requirement-check row throughout).
  BEGIN
    SELECT e.id INTO v_home
      FROM public.epics e JOIN public.projects pj ON pj.id = e.project_id
     WHERE pj.slug = 'go-to-market' AND pj.status = 'executing'
     ORDER BY e.created_at, e.id LIMIT 1;
    IF v_home IS NULL THEN RAISE EXCEPTION 'GATE 7: go-to-market has no executing epic to move into'; END IF;

    INSERT INTO public.backlog_items
      (backlog_id, tier, type, priority_class, title, description, status, epic_id, source_file,
       scope_origin, size_stamp, defer_status, scope_rationale, enhancement_claim, queue, row_ordinal, filed_at)
    VALUES
      ('ZAGTVL-1', 'now', 'Tooling', 'P6 - Agent Enhancement', 'AGT-493 gate probe 1',
       'AGT-493 gate fixture: filed 20 days ago, graded, and rolled back with the whole sub-block.',
       'open', 'ba12f804-9ff1-4160-ac3d-5c0bf8470877', 'tests/regression/agt-493-ticket-validation.test.mjs',
       'discovered', 'S', 'no', 'gate probe', 'none: probe', 999493001, 999493001, now() - interval '20 days');

    PERFORM public.apply_requirement_verdict(v_cycle, NULL,
      '{"verdict":"pass","backlog_id":"ZAGTVL-1","need_source":"nathan:market_records:fbaa1d6e-06e4-4015-b0fe-b4915fa7bfef","need_score":4,"reason":"gate","proposal":"gate","account":"gate"}'::jsonb);

    IF NOT EXISTS (SELECT 1 FROM public.needs_validation() n WHERE n.backlog_id = 'ZAGTVL-1') THEN
      RAISE EXCEPTION 'GATE 7: the sensor does not name ZAGTVL-1, so the rest of this arm proves nothing';
    END IF;

    BEGIN
      PERFORM public.apply_requirement_verdict(v_cycle, NULL,
        '{"verdict":"move","backlog_id":"ZAGTVL-1","home_project":"go-to-market","reason":"gate","account":"gate"}'::jsonb);
      RAISE EXCEPTION 'GATE 7: the move was ACCEPTED on an unvalidated ticket filed 20 days ago';
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM NOT LIKE 'AGT-493:%' THEN
        RAISE EXCEPTION 'GATE 7: the move was refused, but not by the age gate: %', SQLERRM;
      END IF;
    END;

    v_val := public.apply_ticket_validation(v_cycle, NULL,
      '{"backlog_id":"ZAGTVL-1","verdict":"confirmed","reason":"gate","account":"gate"}'::jsonb);
    IF v_val IS NULL THEN RAISE EXCEPTION 'GATE 7: apply_ticket_validation returned no handle'; END IF;

    IF NOT EXISTS (SELECT 1 FROM public.grade_standing() g WHERE g.backlog_id = 'ZAGTVL-1') THEN
      RAISE EXCEPTION 'GATE 7: a confirmed validation dropped the grade -- confirmed must leave it standing (d.30)';
    END IF;
    SELECT count(*) INTO v_n FROM public.runner_decisions
     WHERE kind = 'requirement-check' AND backlog_id = 'ZAGTVL-1';
    IF v_n <> 1 THEN RAISE EXCEPTION 'GATE 7: % requirement-check row(s) on ZAGTVL-1; a validation re-graded it', v_n; END IF;

    PERFORM public.apply_requirement_verdict(v_cycle, NULL,
      '{"verdict":"move","backlog_id":"ZAGTVL-1","home_project":"go-to-market","reason":"gate","account":"gate"}'::jsonb);
    SELECT count(*) INTO v_n FROM public.backlog_items
     WHERE backlog_id = 'ZAGTVL-1' AND epic_id = v_home;
    IF v_n <> 1 THEN RAISE EXCEPTION 'GATE 7: the confirmed move did not land on go-to-market''s epic'; END IF;

    RAISE EXCEPTION 'agt493-rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'agt493-rollback' THEN RAISE; END IF;
  END;

  RAISE NOTICE 'GATE: all seven arms pass';
END $gate$;
