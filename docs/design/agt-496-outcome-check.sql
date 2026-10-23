-- DeepBench v7.0.890 | docs/design/agt-496-outcome-check.sql | AGT-496 — migration agt496_outcome_check, mirrored byte-identical
--
-- FEATURE: AGT-496 -- ONE CHECK ASKS DAILY WHETHER THE PLATFORM PRODUCED ANYTHING.
-- public.audit_flow_checks() gains block (e), check_slug `flow-nothing-produced`, family `blocked`.
-- Identity args () are UNCHANGED, so no overload is created and no DROP is owed
-- (.claude/rules/supabase-function-signature.md); nothing is created, so no grant is touched
-- (.claude/rules/supabase-column-grants.md). Governing: docs/ARCHITECTURE.md §19v, §19b.
--
-- THE PREMISE, measured live 2026-10-23 on tree 1ccf620 (= origin/dev) before the edit, not recalled:
--   * all four live arms (a)-(d) grade an ARTEFACT; none asks whether work moved;
--   * 0 tickets have EVER settled `done` through a `ticket-status` decision -- every one of the
--     board's close-out decisions reads ``settles `partial` `` (14 x AGT-304, 7 x SES-424, ...),
--     against 28 `delivered` settles in 7 days;
--   * 3 fully-settled `drain-epic` directives were still unretired: 11db3e2d-1051-47d5-90b0-4dfe970d0680,
--     326f062f-50af-46fb-9d2a-3911c7013d57, 7a7dcfbe-78b6-4187-bc27-31be72c490f5;
--   * pickable_count 6 (that one arm is green today);
--   * 40 cycles started in the 24 h window, 2 of them `SCHEDULED-AGENT:` -- 6 moved a ticket.
--   * rpc/audit_flow_checks answered ZERO `flow-nothing-produced` elements.
--
-- AFTER THE APPLY, same session, both directions asserted rather than the success flag believed:
--   EXACTLY ONE element, family `blocked`, one location `runner_cycles/outcome/2026-10-23`, text
--   "2026-10-23 produced nothing on at least one arm: 6 ticket(s) pickable now; 3 fully-settled
--   drain-epic directive(s) still unretired (11db3e2d-..., 326f062f-..., 7a7dcfbe-...); 0 ticket(s)
--   settled `done` since 2026-10-19; 6 builder cycle(s) moved a ticket in the last 24 h", and
--   pg_proc still holds exactly 1 `audit_flow_checks`. 10 elements over 3 slugs in all.
--
-- EVERY ARM KEYS OFF runner_decisions / runner_verdicts / push_sha, never backlog_items.updated_at
-- (AGT-463 is open on that signal). The `SCHEDULED-AGENT:` exclusion is the ticket's own: Victoria
-- and Auditor runs are labelled shipped and are not builds.
--
-- ONE ROW PER DAY IS THE CADENCE, not a schedule: the Chicago date inside `location` feeds the
-- fingerprint, and audit_findings' UNIQUE (fingerprint, iso_week) collapses every later run of the
-- same day onto the same row. No threshold key was added -- window_hours (24) and v_since are reused.
--
-- NOT IN THIS BUILD, AND NOT ROUTED AROUND. The ticket's sentence
--   "Add the slug to the au-*-intent row whose task_context would carry it."
-- is an active agent-row write this cycle has no authority for. Verbatim verdict, re-run live
-- 2026-10-23 (`node scripts/agent-row-gate.js --ticket=AGT-496 --action=edit-active --json`):
--   {"ok":false,"exitCode":1,"kind":"verdict","ticket":"AGT-496","action":"edit-active",
--    "scope_origin":"victoria-placed",
--    "need_source":"nathan:market_records:b46b817b-71ee-4f1e-9221-6be16f2c636d",
--    "decision_names_ticket":false,"verdict":"gated","rule":"AGENT-ROW-AGREED-TICKET",
--    "clause":"no-authority","reason":"no agreed-ticket authority — scope_origin is
--    \"victoria-placed\" (not 'john-named') and no unreversed runner_decisions row was asserted to
--    name this ticket; AGENT-ROW-AGREED-TICKET gates an agent-row write no agreed ticket names."}
-- The check works without that row and files its finding through audit_flow_checks() exactly as the
-- four before it do. The sentence stays on AGT-496 and is NEVER refiled under a new id (pattern:95);
-- AGT-496 therefore settles `partial`.
--
-- Guard: tests/regression/agt-496-outcome-check.test.mjs (arms A discriminator, B oracle, C pure
-- fire predicate). Pinned fifth slug: tests/regression/agt-239-outcomes-first.test.mjs.
--
-- Down captured FIRST, before apply_migration (docs/runbooks/runner-cycle.md step 6/7):
--   SELECT * FROM public.capture_migration_down('39617e5a-13bb-4638-a3ab-127ab8f8ff81',
--     'agt496_outcome_check', '[{"kind":"function","identity":"public.audit_flow_checks()"}]'::jsonb);
--   -> captured_class `auto-downable`, objects_captured 1, refusals 0.

do $mig$
declare
  v_def text;
  v_dec text;
  v_ret text;
  n     integer;
begin
  -- The body is pg_get_functiondef() LIVE at apply time, edited by exact-fragment replace: each
  -- anchor must match exactly once or this migration refuses, so a body that drifted since design
  -- can never be silently half-edited (.claude/rules/supabase-function-signature.md's discipline
  -- applied to a body edit; identity args () are unchanged, so no overload and no DROP is owed).
  v_def := pg_get_functiondef('public.audit_flow_checks()'::regprocedure);

  -- Anchor 1: the last DECLARE line. Block (e)'s seven locals go after it.
  v_dec := $anchor$  ts       text := 'YYYY-MM-DD HH24:MI"Z"';$anchor$;
  n := (length(v_def) - length(replace(v_def, v_dec, ''))) / length(v_dec);
  if n <> 1 then
    raise exception 'agt496_outcome_check: the DECLARE anchor matched % time(s), expected exactly 1 -- the live body drifted; refusing a half-edit', n;
  end if;
  v_def := replace(v_def, v_dec, v_dec || E'\n' || $decl$  v_day    date;
  v_week   timestamp;
  v_pick   integer;
  v_drains integer;
  v_ids    text[];
  v_done   integer;
  v_builds integer;$decl$);

  -- Anchor 2: the single RETURN. Block (e) goes immediately before it, after (a)-(d).
  v_ret := $anchor$  RETURN v_out;$anchor$;
  n := (length(v_def) - length(replace(v_def, v_ret, ''))) / length(v_ret);
  if n <> 1 then
    raise exception 'agt496_outcome_check: the RETURN anchor matched % time(s), expected exactly 1 -- the live body drifted; refusing a half-edit', n;
  end if;
  v_def := replace(v_def, v_ret, $e$  -- (e) flow-nothing-produced (blocked): AGT-496 -- did the platform produce ANYTHING today? The
  --     four arms above all grade an artefact; this one asks whether work MOVED. Every arm keys off
  --     runner_decisions / runner_verdicts / push_sha, never backlog_items.updated_at (AGT-463).
  --     One row per day: the date in `location` plus UNIQUE (fingerprint, iso_week) IS the cadence.
  v_day  := (now() AT TIME ZONE 'America/Chicago')::date;
  v_week := date_trunc('week', now() AT TIME ZONE 'America/Chicago');

  SELECT ((SELECT detail FROM public.runner_should_boot())->>'pickable_count')::integer INTO v_pick;

  SELECT count(*)::integer, (array_agg(d.id::text ORDER BY d.created_at))[1:10]
    INTO v_drains, v_ids
    FROM public.runner_directives d
   WHERE d.type = 'drain-epic' AND d.status = 'delivered'
     AND NOT EXISTS (SELECT 1
                       FROM public.runner_drain_scope s
                       JOIN public.backlog_items b ON b.id = s.item_id
                      WHERE s.directive_id = d.id
                        AND b.status IN ('open', 'partial', 'removal proposed'));

  SELECT count(*)::integer INTO v_done
    FROM public.runner_decisions d
   WHERE d.kind = 'ticket-status'
     AND d.summary LIKE '%settles `done`%'
     AND d.decided_at >= v_week;

  SELECT count(*)::integer INTO v_builds
    FROM public.runner_cycles c
   WHERE c.started_at >= v_since
     AND coalesce(c.notes, '') NOT LIKE 'SCHEDULED-AGENT:%'
     AND (c.push_sha IS NOT NULL
          OR EXISTS (SELECT 1 FROM public.runner_decisions d
                      WHERE d.cycle_id = c.id AND d.backlog_id IS NOT NULL)
          OR EXISTS (SELECT 1 FROM public.runner_verdicts v
                      WHERE v.cycle_id = c.id AND v.backlog_id IS NOT NULL));

  IF v_pick = 0 OR v_drains > 0 OR v_done = 0 OR v_builds = 0 THEN
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'kind', 'other', 'finding_type', 'defect', 'confidence', 'high',
      'check_slug', 'flow-nothing-produced', 'family', 'blocked',
      'locations', jsonb_build_array(jsonb_build_object(
        'location', 'runner_cycles/outcome/' || to_char(v_day, 'YYYY-MM-DD'),
        'text', format('%s produced nothing on at least one arm: %s ticket(s) pickable now; %s fully-settled drain-epic directive(s) still unretired (%s); %s ticket(s) settled `done` since %s; %s builder cycle(s) moved a ticket in the last %s h',
                       to_char(v_day, 'YYYY-MM-DD'), v_pick, v_drains,
                       coalesce(array_to_string(v_ids, ', '), 'none'),
                       v_done, to_char(v_week, 'YYYY-MM-DD'), v_builds, t->>'window_hours'))),
      'governing_fact', 'A day with nothing pickable, no drain retiring, no ticket done and no builder cycle on a ticket is a stalled platform, not a quiet one.',
      'proposed_resolution', 'Diagnose the arm(s) that produced nothing -- '
        || concat_ws('; ',
             CASE WHEN v_pick = 0   THEN 'nothing is pickable, so find what the queue or the boot gate is holding' END,
             CASE WHEN v_drains > 0 THEN 'a drain-epic directive whose whole scope has settled was never retired' END,
             CASE WHEN v_done = 0   THEN 'no ticket settled `done` this week, so the close step is not finishing anything' END,
             CASE WHEN v_builds = 0 THEN 'no builder cycle moved a ticket in the window, so the run is spending without shipping' END)
        || ' -- before scheduling more work into it.'));
  END IF;

$e$ || v_ret);

  execute v_def;

  -- Both directions, never the success flag: exactly one overload, the new slug IS in the shipped
  -- body, and the edited body still compiles and answers an array.
  select count(*) into n
    from pg_proc p join pg_namespace x on x.oid = p.pronamespace
   where x.nspname = 'public' and p.proname = 'audit_flow_checks' and p.prokind = 'f';
  if n <> 1 then
    raise exception 'agt496_outcome_check: % audit_flow_checks overload(s) after the edit, expected exactly 1', n;
  end if;
  if position('flow-nothing-produced' in pg_get_functiondef('public.audit_flow_checks()'::regprocedure)) = 0 then
    raise exception 'agt496_outcome_check: the shipped body does not carry flow-nothing-produced';
  end if;
  if jsonb_typeof(public.audit_flow_checks()) <> 'array' then
    raise exception 'agt496_outcome_check: the edited body does not answer a jsonb array';
  end if;
end
$mig$;
