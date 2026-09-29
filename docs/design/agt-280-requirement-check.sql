-- AGT-280 slice 2 (v7.0.736) -- REQUIREMENT-CHECK AND ITS CALLER: Victoria's one judgment call on
-- whether a cited need source SUPPORTS the ticket, and the Development Manager's list reordered by
-- the score she writes.
-- MIRROR of the applied migration `agt280_requirement_check`. Applied via mcp Supabase
-- apply_migration (which wraps the whole file in ONE transaction, so no BEGIN/COMMIT here).
--
-- (a) DOWN, CAPTURED FIRST, before any of this ran (kickoff §5 T1 (a)):
--   select * from public.capture_migration_down(
--     '95fb0347-c285-4dac-a5e7-9d17d3ceb303'::uuid, 'agt280_requirement_check',
--     '[{"kind":"function","identity":"public.prime_directive_queue()"},
--       {"kind":"function","identity":"public.drain_epic_next(uuid)"}]'::jsonb);
--   -> (agt280_requirement_check, auto-downable, 2 captured, 0 refusals)
-- Only the two edited functions are auto-downable. The four seed rows in section 3 are CARD-ONLY
-- and each carries its own `runner_before_images` row (row_data NULL = "this row did not exist"),
-- so reverse_decision() can delete them; the down in reverse order is:
--   1. delete from public.agent_capability_assignments where capability_slug = 'requirement-check';
--   2. delete from public.capability_skill_profiles   where capability_slug = 'requirement-check';
--   3. delete from public.capabilities                where slug = 'requirement-check';
--   4. delete from public.skill_profiles              where slug = 'vc-requirement-intent';
--
-- WHAT SLICE 1 LEFT OWING, measured live 2026-09-29 on the unchanged tree:
--   * `capabilities` held 0 `requirement-check` rows and `victoria` held 1 assignment
--     (`solution-catalog`), so the judgment half of the gate had no home and no caller.
--   * `need_score` was set on 0 of 1165 `backlog_items` and NOTHING under scripts/ api/ lib/ src/
--     read either new column -- the title's "reorganizes the Development Manager's list by need"
--     was unbuilt.
--   * Both slice-1 functions were callable by `anon`.
--
-- NAMED DEVIATION FROM THE KICKOFF, and it is the whole of (b). The kickoff names T1(b) -- the
-- anon/authenticated EXECUTE lockdown on `apply_requirement_verdict` and `need_source_is_traceable`
-- -- as this build's QA discriminator (red on the unchanged tree, green only if the revoke landed).
-- IT WAS CLOSED BEFORE THIS BUILD STARTED, by migration `agt280_requirement_functions_anon_lockdown`,
-- because the hole was live on a public write path into `runner_decisions`, `audit_findings` and two
-- ticket columns and could not wait for a build to finish. So §6.1 is PRE-SATISFIED and proves
-- nothing about this ship. The revoke below is kept anyway -- it is idempotent and it is the form
-- the ticket owes the record (`.claude/rules/supabase-column-grants.md` addendum SES-315: by name,
-- never `FROM PUBLIC` alone) -- and it is extended to `requirement_gate()`, the third slice-1
-- function, which the kickoff's (b) does not name and which sits on the same trigger path.
-- THE REAL DISCRIMINATOR FOR THIS SHIP IS THE REORDER, section 4, measured both directions with a
-- rolled-back fixture -- see the note at the end of this file.
--
-- Guard: `tests/regression/agt-280-requirement-check.test.mjs`. Architecture: §19v Operations.

-- ------------------------------------------------------------------------------------------------
-- 2. (b) THE LOCKDOWN. By name, never `FROM PUBLIC` alone: `pg_default_acl` grants EXECUTE to
--    `anon`, `authenticated` and `service_role` BY NAME the instant a function is created, so
--    revoking PUBLIC leaves the named grants standing and the migration reports success anyway
--    (`.claude/rules/supabase-column-grants.md`, addendum 2026-09-02 / SES-315). Idempotent: the
--    grants are already in this state, closed ahead of this build (see the deviation note above).
-- ------------------------------------------------------------------------------------------------
revoke execute on function
  public.apply_requirement_verdict(uuid, text, jsonb),
  public.need_source_is_traceable(text),
  public.requirement_gate()
  from public, anon, authenticated;

grant execute on function
  public.apply_requirement_verdict(uuid, text, jsonb),
  public.need_source_is_traceable(text),
  public.requirement_gate()
  to service_role;

-- ------------------------------------------------------------------------------------------------
-- 3. (c) THE CAPABILITY AND ITS INTENT. Four rows, one `runner_before_images` row each with
--    `row_data` NULL -- the shape docs/design/agt-240-project-finish-line.sql:707-745 established:
--    a NULL image says "this row did not exist", which is the only promise reverse_decision() can
--    keep for an INSERT. Every insert is guarded by NOT EXISTS, so a re-run images nothing.
--
--    Rule #1 (§19d/§19e): the intent is CLONED from Victoria's own `solution-catalog` row --
--    tenant, execution type, provider, key source and technical_services come off her row rather
--    than being hand-typed here. `llm_model` reads `runner_model_lanes` where lane='judgment' at
--    apply time: the lane is the source of truth for which model judges, and a literal here would
--    be a second home for it (pattern:93).
-- ------------------------------------------------------------------------------------------------
WITH src AS (
  SELECT sp.tenant_id, sp.execution_type, sp.llm_provider, sp.api_key_source, sp.technical_services
    FROM public.skill_profiles sp
   WHERE sp.slug = 'solution-catalog'
), ins AS (
  INSERT INTO public.skill_profiles
    (slug, name, description, skill_type_slug, objective, method, output_desc, tone, confidence,
     traits, guardrails, technical_services, execution_type, tenant_id,
     llm_provider, llm_model, max_tokens, api_key_source, temperature)
  SELECT
    'vc-requirement-intent',
    'Requirement Check',
    'AGT-280 (v7.0.736): Victoria''s one judgment call on a proposed ticket -- does the row it cites actually support it, and how strongly.',
    'intent',
    'Decide whether the need source this proposal cites SUPPORTS the proposal, and how strongly the platform needs it.',
    E'You are handed one proposed ticket, the `who:table:id` need source it cites, and the candidate rows of every table the allowlist names.\n\n'
      || E'1. Read the cited row first. Whether that row EXISTS is already settled before you are called -- a lookup decided it, and it is never your question. Your question is whether what the row SAYS supports what the proposal asks to build.\n'
      || E'2. If it does, answer `pass`, echo the `need_source` you were given unchanged, and score `need_score` 1-5: 5 = the cited row asks for exactly this and the platform is blocked without it; 3 = the row supports it and the work can wait; 1 = the row touches it only in passing.\n'
      || E'3. If it does not -- the row is about something else, or the proposal has outgrown it -- answer `not-needed` and name the proposal you refused in `proposal`. No ticket is written; your reason is listed on the findings board so a cold future session finds why.\n'
      || E'4. `reason` is one line, in plain business language, quoting the part of the cited row you relied on.\n'
      || E'5. Never invent a need source, never widen the one you were given, and never name a ticket other than the one you were handed.',
    'One JSON object matching the schema: a verdict, the backlog id, the need source, a 1-5 score, the proposal, a one-line reason and your account.',
    'Direct and evidence-first. Quote the cited row; never paraphrase it into agreement.',
    'State the score you actually believe. A 5 you cannot point at a sentence for is a 3.',
    jsonb_build_object(
      'can_request_help', false,
      'schema', jsonb_build_object(
        'type', 'object',
        'required', jsonb_build_array('verdict','backlog_id','need_source','need_score','proposal','reason','account'),
        'properties', jsonb_build_object(
          'verdict',     jsonb_build_object('type','string','enum', jsonb_build_array('pass','not-needed')),
          'backlog_id',  jsonb_build_object('type','string','maxLength',40),
          'need_source', jsonb_build_object('type',jsonb_build_array('string','null'),'maxLength',200,
                                            'description','The need this ticket answers, as who:table:id -- echoed back unchanged, never invented.'),
          'need_score',  jsonb_build_object('type','integer','minimum',1,'maximum',5),
          'proposal',    jsonb_build_object('type','string','maxLength',400),
          'reason',      jsonb_build_object('type','string','maxLength',1200),
          'account',     jsonb_build_object('type','string','maxLength',100)
        )
      )
    ),
    '{"must": [], "must_not": []}'::jsonb,
    src.technical_services,
    src.execution_type,
    src.tenant_id,
    src.llm_provider,
    (SELECT l.model_id FROM public.runner_model_lanes l WHERE l.lane = 'judgment'),
    8000,
    src.api_key_source,
    -- NO TEMPERATURE. The kickoff's §4 stub spells `temperature` 0 AND `llm_model` = the judgment
    -- lane; those two are incompatible on today's board, because the judgment lane is
    -- `claude-fable-5-1` and `shared/models.js`'s NO_TEMPERATURE_PREFIXES = ['claude-fable-'] says
    -- that family REJECTS the parameter. `tests/regression/agt-90-fable-temperature.test.mjs` pins
    -- it, and went red on `vc-requirement-intent=0` the moment `agt280_requirement_check` landed
    -- carrying the literal 0. NULL is correct for EVERY family, not just today's lane. Shipped as
    -- the follow-up migration `agt280_requirement_intent_temperature`, which images the row before
    -- the UPDATE and asserts both directions (the row stores none, and rows on accepting families
    -- keep theirs).
    NULL
  FROM src
  WHERE NOT EXISTS (SELECT 1 FROM public.skill_profiles x WHERE x.slug = 'vc-requirement-intent')
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT '95fb0347-c285-4dac-a5e7-9d17d3ceb303'::uuid, 'skill_profiles', ins.id::text, NULL FROM ins;

WITH ins AS (
  INSERT INTO public.capabilities (slug, name, description, execution_type, tenant_id, display_phrase, default_intent_slug)
  SELECT 'requirement-check', 'Requirement Check',
         'AGT-280 (v7.0.736): grades whether the need source a proposed ticket cites SUPPORTS it, and how strongly (1-5). Whether the cited row exists is a lookup and never this capability''s question; writing the verdict is apply_requirement_verdict()''s, never this capability''s.',
         'ai', 'global', 'screening the requirement', 'vc-requirement-intent'
   WHERE NOT EXISTS (SELECT 1 FROM public.capabilities c WHERE c.slug = 'requirement-check')
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT '95fb0347-c285-4dac-a5e7-9d17d3ceb303'::uuid, 'capabilities', ins.id::text, NULL FROM ins;

WITH ins AS (
  INSERT INTO public.capability_skill_profiles (capability_slug, skill_profile_slug, level, is_required, display_order)
  SELECT 'requirement-check', 'vc-requirement-intent', 3, true, 1
   WHERE NOT EXISTS (SELECT 1 FROM public.capability_skill_profiles x WHERE x.capability_slug = 'requirement-check')
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT '95fb0347-c285-4dac-a5e7-9d17d3ceb303'::uuid, 'capability_skill_profiles', ins.id::text, NULL FROM ins;

WITH ins AS (
  INSERT INTO public.agent_capability_assignments (tenant_id, agent_id, capability_slug)
  SELECT 'global', 'victoria', 'requirement-check'
   WHERE NOT EXISTS (SELECT 1 FROM public.agent_capability_assignments a
                      WHERE a.capability_slug = 'requirement-check' AND a.agent_id = 'victoria')
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT '95fb0347-c285-4dac-a5e7-9d17d3ceb303'::uuid, 'agent_capability_assignments', ins.id::text, NULL FROM ins;

-- ------------------------------------------------------------------------------------------------
-- 4. (d) THE REORDER -- the title's second clause, and the whole reason this slice is not just a
--    capability seed. `need_score` becomes an ordering key in BOTH homes that decide what gets
--    built next, and the two homes must agree (that agreement is the property this pair of
--    functions exists to hold -- prime_directive_queue's own `ranked` comment says so).
--
--    ASCENDING, `6 - COALESCE(need_score, 0)`: a 5 sorts to 1 and goes first; an unscored ticket
--    sorts to 6 and goes last. One expression, no CASE, NULL handled by the COALESCE rather than by
--    a NULLS LAST that would have to be repeated at two sites.
--
--    WHERE THE KEY SITS, and this is a recorded Designer call (kickoff §7 (b), pattern:166): AFTER
--    leverage and AFTER project priority, BEFORE the filing lane and the queue number. No axis John
--    named is weakened -- a ticket The Development Manager marked as leverage still precedes
--    everything, and which executing project a ticket belongs to is still the next question. Need
--    decides WITHIN a project, where the queue number used to decide alone.
--
--    THE EDIT IS AN EXACT-FRAGMENT REPLACE AGAINST THE LIVE `pg_get_functiondef()`, never a
--    hand-retyped function body: each fragment's occurrence count is asserted first and a wrong
--    count REFUSES the migration. Retyping two 7 KB / 28 KB bodies to add one key each is how a
--    SES-424-era comment or an AGT-173 clause silently disappears.
-- ------------------------------------------------------------------------------------------------
do $agt280d$
declare
  v_def  text;
  v_new  text;
  v_n    int;

  -- prime_directive_queue()
  f1 constant text := 'b.filed_at, b.predicted_cycles, b.epic_id,';
  r1 constant text := 'b.filed_at, b.predicted_cycles, b.epic_id, b.need_score,';
  f2 constant text := '0::int AS sort_lane, 0::int AS sort_queue, 0::int AS sort_cycles,';
  r2 constant text := '0::int AS sort_need, 0::int AS sort_lane, 0::int AS sort_queue, 0::int AS sort_cycles,';
  f3 constant text := 'bu.project_priority,   -- AGT-140 / D1';
  r3 constant text := E'bu.project_priority,   -- AGT-140 / D1\n         6 - COALESCE(bu.need_score, 0),';
  f4 constant text := 'sort_project NULLS LAST, sort_lane';
  r4 constant text := 'sort_project NULLS LAST, sort_need, sort_lane';

  -- drain_epic_next(uuid)
  f5 constant text := E'ORDER BY CASE WHEN b.leverage_reason IS NOT NULL THEN 0 ELSE 1 END,\n              pj.priority,';
  r5 constant text := E'ORDER BY CASE WHEN b.leverage_reason IS NOT NULL THEN 0 ELSE 1 END,\n              pj.priority,\n              6 - COALESCE(b.need_score, 0),';
begin
  -- ---- prime_directive_queue() ----------------------------------------------------------------
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'prime_directive_queue' and p.prokind = 'f';
  if v_def is null then
    raise exception 'AGT-280 T1(d): public.prime_directive_queue() not found';
  end if;

  v_n := (length(v_def) - length(replace(v_def, f1, ''))) / length(f1);
  if v_n <> 1 then raise exception 'AGT-280 T1(d) F1: expected 1 occurrence, found %', v_n; end if;
  v_n := (length(v_def) - length(replace(v_def, f2, ''))) / length(f2);
  if v_n <> 1 then raise exception 'AGT-280 T1(d) F2: expected 1 occurrence, found %', v_n; end if;
  v_n := (length(v_def) - length(replace(v_def, f3, ''))) / length(f3);
  if v_n <> 2 then raise exception 'AGT-280 T1(d) F3: expected 2 occurrences (lanes b and c), found %', v_n; end if;
  v_n := (length(v_def) - length(replace(v_def, f4, ''))) / length(f4);
  if v_n <> 1 then raise exception 'AGT-280 T1(d) F4: expected 1 occurrence, found %', v_n; end if;

  -- Already carrying the key? Then this migration has run; refuse rather than double-apply.
  if position('sort_need' in v_def) > 0 then
    raise exception 'AGT-280 T1(d): prime_directive_queue already carries sort_need -- migration is not re-runnable';
  end if;

  v_new := replace(v_def, f1, r1);
  v_new := replace(v_new, f2, r2);
  v_new := replace(v_new, f3, r3);
  v_new := replace(v_new, f4, r4);
  execute v_new;

  -- ---- drain_epic_next(uuid) --------------------------------------------------------------------
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'drain_epic_next' and p.prokind = 'f';
  if v_def is null then
    raise exception 'AGT-280 T1(d): public.drain_epic_next(uuid) not found';
  end if;

  v_n := (length(v_def) - length(replace(v_def, f5, ''))) / length(f5);
  if v_n <> 1 then raise exception 'AGT-280 T1(d) F5: expected 1 occurrence, found %', v_n; end if;
  if position('need_score' in v_def) > 0 then
    raise exception 'AGT-280 T1(d): drain_epic_next already carries need_score -- migration is not re-runnable';
  end if;

  v_new := replace(v_def, f5, r5);
  execute v_new;
end
$agt280d$;

-- ------------------------------------------------------------------------------------------------
-- 5. (e) THE MIGRATION ASSERTS ITS OWN QA, never its success flag (kickoff §6.1-§6.3).
--
--    §6.1 is PRE-SATISFIED (see the deviation note at the top) and is asserted here for the record,
--    not as evidence this ship landed. §6.3's LIVE behavioural proof -- that a `need_score` 5
--    precedes its NULL peer in both edited functions and that a leverage peer still outranks both
--    -- cannot be made here: it needs fixture rows and a rollback, and this block runs inside the
--    migration's own transaction, where a RAISE would take the migration with it. It was measured
--    at this ship instead, over the MCP, inside DO blocks ending in RAISE so every fixture rolled
--    back; the numbers are in the ship report and in the test file's arm C. What IS asserted here
--    is the read-back of the two rewritten definitions: the key landed the right number of times,
--    at the right place in the ORDER BY, and neither function grew an overload.
-- ------------------------------------------------------------------------------------------------
do $agt280q$
declare
  v_def text;
  v_n   int;
begin
  -- §6.1 -- both directions, never a success flag.
  if has_function_privilege('anon', 'public.apply_requirement_verdict(uuid,text,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.apply_requirement_verdict(uuid,text,jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.need_source_is_traceable(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.need_source_is_traceable(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.requirement_gate()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.requirement_gate()', 'EXECUTE') then
    raise exception 'AGT-280 §6.1: the three slice-1 functions must NOT be executable by anon/authenticated';
  end if;
  if not (has_function_privilege('service_role', 'public.apply_requirement_verdict(uuid,text,jsonb)', 'EXECUTE')
      and has_function_privilege('service_role', 'public.need_source_is_traceable(text)', 'EXECUTE')
      and has_function_privilege('service_role', 'public.requirement_gate()', 'EXECUTE')) then
    raise exception 'AGT-280 §6.1: service_role must still hold EXECUTE on all three -- a lockdown that breaks the caller is not a lockdown';
  end if;

  -- §6.2 -- the capability, its link, its assignment and its intent: one row each, and the intent
  -- carries all SEVEN schema keys apply_requirement_verdict() reads.
  select count(*) into v_n from public.capabilities where slug = 'requirement-check';
  if v_n <> 1 then raise exception 'AGT-280 §6.2: capabilities must hold exactly 1 requirement-check row; got %', v_n; end if;
  select count(*) into v_n from public.capability_skill_profiles where capability_slug = 'requirement-check';
  if v_n <> 1 then raise exception 'AGT-280 §6.2: capability_skill_profiles must hold exactly 1 requirement-check row; got %', v_n; end if;
  select count(*) into v_n from public.agent_capability_assignments
   where capability_slug = 'requirement-check' and agent_id = 'victoria';
  if v_n <> 1 then raise exception 'AGT-280 §6.2: victoria must hold exactly 1 requirement-check assignment; got %', v_n; end if;
  select count(*) into v_n from public.skill_profiles where slug = 'vc-requirement-intent';
  if v_n <> 1 then raise exception 'AGT-280 §6.2: skill_profiles must hold exactly 1 vc-requirement-intent row; got %', v_n; end if;

  select count(*) into v_n
    from public.skill_profiles sp,
         jsonb_array_elements_text(sp.traits -> 'schema' -> 'required') k
   where sp.slug = 'vc-requirement-intent'
     and k in ('verdict','backlog_id','need_source','need_score','proposal','reason','account');
  if v_n <> 7 then
    raise exception 'AGT-280 §6.2: the intent''s own traits.schema must require all 7 keys apply_requirement_verdict() reads; got %', v_n;
  end if;

  -- The capability must point at that intent, or assemblePrompt() fires nothing.
  if (select c.default_intent_slug from public.capabilities c where c.slug = 'requirement-check')
     is distinct from 'vc-requirement-intent' then
    raise exception 'AGT-280 §6.2: requirement-check.default_intent_slug must be vc-requirement-intent';
  end if;

  -- §6.3 read-back -- the rewritten definitions, read fresh from pg_get_functiondef().
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'prime_directive_queue' and p.prokind = 'f';
  v_n := (length(v_def) - length(replace(v_def, 'need_score', ''))) / length('need_score');
  if v_n <> 3 then raise exception 'AGT-280 §6.3: prime_directive_queue must name need_score 3 times (projection + lanes b and c); got %', v_n; end if;
  if position('sort_project NULLS LAST, sort_need, sort_lane' in v_def) = 0 then
    raise exception 'AGT-280 §6.3: the need key must sit AFTER sort_project and BEFORE sort_lane -- leverage and project priority keep their places (pattern:166)';
  end if;
  if position('0::int AS sort_need, ' in v_def) = 0 then
    raise exception 'AGT-280 §6.3: the directive lane must carry a constant sort_need or the UNION ALL columns do not line up';
  end if;

  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'drain_epic_next' and p.prokind = 'f';
  v_n := (length(v_def) - length(replace(v_def, 'need_score', ''))) / length('need_score');
  if v_n <> 1 then raise exception 'AGT-280 §6.3: drain_epic_next must name need_score exactly once; got %', v_n; end if;
  if position(E'pj.priority,\n              6 - COALESCE(b.need_score, 0),' in v_def) = 0 then
    raise exception 'AGT-280 §6.3: drain_epic_next''s need key must sit directly after pj.priority';
  end if;

  -- §6.4 / `.claude/rules/supabase-function-signature.md`: CREATE OR REPLACE against the live
  -- definition cannot add an overload, and this proves it rather than assuming it.
  select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f' and p.proname = 'prime_directive_queue';
  if v_n <> 1 then raise exception 'AGT-280 §6.4: exactly 1 prime_directive_queue overload; got %', v_n; end if;
  select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f' and p.proname = 'drain_epic_next';
  if v_n <> 1 then raise exception 'AGT-280 §6.4: exactly 1 drain_epic_next overload; got %', v_n; end if;

  -- The two edited functions are REPLACED, not created, so Postgres keeps their ACLs and
  -- `pg_default_acl`'s create-time grants never apply. Asserted rather than assumed, because a
  -- reset here would hand `anon` the whole pick path.
  if has_function_privilege('anon', 'public.prime_directive_queue()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.prime_directive_queue()', 'EXECUTE')
     or has_function_privilege('anon', 'public.drain_epic_next(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.drain_epic_next(uuid)', 'EXECUTE') then
    raise exception 'AGT-280: the replace reopened prime_directive_queue/drain_epic_next to anon';
  end if;
  if not (has_function_privilege('service_role', 'public.prime_directive_queue()', 'EXECUTE')
      and has_function_privilege('service_role', 'public.drain_epic_next(uuid)', 'EXECUTE')) then
    raise exception 'AGT-280: service_role lost EXECUTE on an edited function';
  end if;
end
$agt280q$;

-- ------------------------------------------------------------------------------------------------
-- THE LIVE REORDER PROOF, measured at this ship over the MCP, both directions, every fixture rolled
-- back by a trailing RAISE (the SES-310 / SES-424c form -- PostgREST can open no transaction, so a
-- permanent regression test must never write these rows).
--
--   BASE, unchanged: prime_directive_queue() returns AGT-273 pos 1 (project priority 2) and AGT-165
--   pos 2 (project priority 3). They are NOT tied, so the fixture first ties them: AGT-165's project
--   priority is set to 2. Tied, the queue number decides -> AGT-165 pos 1 (queue 33), AGT-273 pos 2
--   (queue 518).
--
--   RED, on the UNCHANGED tree: with the tie in place, setting AGT-273.need_score = 5 changed
--   NOTHING -- [{1,AGT-165},{2,AGT-273}] before and after. The score had no runtime.
--
--   GREEN, after this migration: the same fixture returns [{1,AGT-273},{2,AGT-165}] -- the 5
--   precedes its NULL peer.
--
--   THE pattern:166 CONTROL, after this migration: with the REAL project priorities restored (2 vs
--   3) and need_score 5 on AGT-165 instead, AGT-273 STILL holds pos 1. Project priority is not
--   weakened by the new key, which is the Designer's recorded call (kickoff §7 (b)).
-- ------------------------------------------------------------------------------------------------
