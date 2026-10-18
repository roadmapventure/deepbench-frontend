-- DeepBench v7.0.858 | docs/design/agt-483-pair-probe.sql | AGT-483 closing slice -- THE PAIR, ASSERTED EVERY RUN: public.parent_score_probe(uuid) stands AGT-483's four fixtures and its dated exclusive drain up inside one rolled-back sub-block, returns the measurements as jsonb, and the regression guard grades them.
--
-- ==============================================================================================
-- THE MIRROR of migration `agt483_pair_probe`. The SQL below the header is the migration
-- VERBATIM, as applied -- proven, not asserted: the applied statement is stored as ONE statement
-- in supabase_migrations.schema_migrations (version 20261018091336) and
-- md5(string_agg(statements)) reads fe357ad34e7c0bb12818cc7def015d27, which is the md5 of this
-- file's SQL half with its trailing newline stripped (16191 bytes).
-- F2 AFTER THE APPLY, read live by pg_get_functiondef: public.parent_score_probe(uuid)
-- md5 b902a2dea55c6cb39d137d1a8ae040e1, 6561 bytes, 1 overload, EXECUTE anon=false
-- authenticated=false service_role=true.
-- ==============================================================================================
--
-- ---- THE GAP THIS CLOSES, measured 2026-10-18 before the apply (tree 5e3abfd, kickoff section 2) --
-- `v7.0.857` shipped the lift and it is holding: the five functions read the md5s kickoff section
-- 2 quotes, at one overload each, EXECUTE closed to anon and authenticated. What did NOT survive
-- the apply is the ASSERTION. "Both asserted" -- a scored-1 blocker ranked, listed and picked as
-- the 5 it stands in front of, AND an unrelated scored-1 ticket still refused -- held only as the
-- one-shot trailing gate of migration `agt483_parent_score`, whose NOTICE bodies were never
-- relayed and are quoted nowhere. The standing guard grades the IDENTITY case only, because
-- `effective_need_score(b.id) IS DISTINCT FROM need_score` over the board's open/partial rows is
-- 0 (re-measured this session: 0 actual lifts). So swapping the lift back out for the raw column
-- today leaves the whole suite GREEN -- the false green `docs/STANDARDS.md` Section 4 and
-- pattern:75 exist to make structurally impossible.
--
-- ---- WHAT F2 IS -------------------------------------------------------------------------------
-- public.parent_score_probe(p_cycle_id uuid DEFAULT NULL) RETURNS jsonb. It writes the four
-- fixtures, their grades and the exclusive 2020-dated drain inside a sub-block that ends in
-- sentinel P0483, so every fixture write is undone while the call still returns -- pgTAP's
-- transactional-fixture convention, expressed as a plpgsql sub-block (designer's call (vi)).
-- It MEASURES AND NEVER ASSERTS (call (vii)): the scores, both reason arrays, the floor's tooling
-- ids, the selfbuild lane in pos order, the drain outcome and pick, and the four residue counts
-- come back as one jsonb row. The grading is gradePair() in
-- tests/regression/agt-483-parent-score.test.mjs, so a lift that stops lifting goes red in the
-- suite rather than in a NOTICE. An unpassed cycle id defaults to the newest runner_cycles row
-- (call (viii)) -- runner_before_images.cycle_id is an FK to runner_cycles(id), so
-- drain_epic_next() cannot be driven without a cycle that really exists, and the regression suite
-- has none of its own.
--
-- ---- THE FIXTURE HALF IS SPLICED, NOT RETYPED -------------------------------------------------
-- Lines 260-310 of docs/design/agt-483-parent-score.sql -- FIXTURES through the
-- drain_epic_next() line -- were copied into F2 by `sed`, with the single occurrence of `c_cycle`
-- rewritten to `v_cycle` and `c_epic` kept as the declared Tooling epic. The pair this probe
-- stands up is therefore the pair the one-shot gate stood up, byte for byte, rather than a
-- transcription of it (pattern:3, and the same reason agt483_parent_score spliced the four bodies
-- from the catalog instead of retyping them).
--
-- ---- THE DOWN, captured BEFORE the apply (runbook step 6) -------------------------------------
-- select * from public.capture_migration_down(
--   '420cefbe-f47e-4bb2-a133-a20d9d9c62ee', 'agt483_pair_probe',
--   '[{"kind":"function","identity":"public.parent_score_probe(uuid)"}]')
-- ->  captured_up_name = agt483_pair_probe
--     captured_class   = auto-downable
--     objects_captured = 1
--     refusals         = 0
--     derived_down_sql = drop function if exists public.parent_score_probe(uuid);
-- F2 did not exist before this migration (0 pg_proc rows, 0 tracked files), so its down is the
-- drop by identity argument list and THERE IS NO MANUAL HALF: nothing is dropped, no column is
-- added, no existing object is replaced, and no row outside the rolled-back fixtures is written.
--
-- ---- WHAT IS DELIBERATELY NOT HERE ------------------------------------------------------------
-- Nothing is retired. The five v7.0.857 functions are untouched -- the gate asserts all five
-- md5s are UNCHANGED, so a migration that quietly edited one of them could not commit. F2 holds
-- no assertion of its own beyond the two preconditions it cannot measure around (a cycle id must
-- resolve). It is service_role only, revoked from PUBLIC, anon and authenticated BY NAME, because
-- pg_default_acl in this project grants EXECUTE to the three named roles the instant a function is
-- created and a PUBLIC-only revoke reports success while leaving them standing
-- (.claude/rules/supabase-column-grants.md, SES-315 addendum) -- and the gate asserts both
-- directions rather than trusting the statement's success flag.
-- All three are JOHN-0925-DESIGNER-DECIDES calls, reversible, harvest docs/harvests/AGT-483.md
-- section 4 (vi)-(viii).
--
-- ---- THE MIGRATION, VERBATIM -----------------------------------------------------------------
-- F2 -- public.parent_score_probe(uuid): AGT-483's rolled-back pair, re-runnable on demand.
-- It MEASURES and never asserts (designer's call (vii)): every number the pair is graded on comes
-- back as one jsonb row, and the grading lives in gradePair() in
-- tests/regression/agt-483-parent-score.test.mjs, so the suite -- not a NOTICE nobody reads -- is
-- what goes red when the lift stops lifting.
CREATE FUNCTION public.parent_score_probe(p_cycle_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
AS $fn$
declare
  v_cycle uuid;
  c_epic  uuid := 'ced3a7d0-5382-47f2-9163-ad21c176de6b';   -- Tooling, project executing
  v_parent uuid; v_child uuid; v_stranger uuid; v_control uuid; v_d uuid;
  v_eff_p int; v_eff_c int; v_eff_s int; v_eff_n int;
  v_reas_c text[]; v_reas_s text[];
  v_count text[];
  v_self  text[];
  v_out   text; v_pick text;
  v_items int; v_dirs int; v_decs int; v_scope int;
begin
  -- designer's call (viii): an unpassed cycle id defaults to the newest runner_cycles row.
  -- runner_before_images.cycle_id is an FK to runner_cycles(id), so drain_epic_next() below needs a
  -- cycle that really exists; a caller with no cycle of its own (the regression suite) gets one.
  v_cycle := coalesce(p_cycle_id, (select id from public.runner_cycles order by started_at desc limit 1));
  if v_cycle is null then
    raise exception 'parent_score_probe: no cycle id passed and public.runner_cycles is empty -- drain_epic_next() cannot be driven without one';
  end if;

  -- The fixtures, the five measurements and the sentinel below are
  -- docs/design/agt-483-parent-score.sql lines 260-310 VERBATIM (c_cycle -> v_cycle), so the pair
  -- this probe stands up is the pair the migration's one-shot gate stood up, not a retyping of it.
  begin
    -- ---- FIXTURES ---------------------------------------------------------------------------
    insert into public.backlog_items
      (backlog_id, tier, title, status, source_file, row_ordinal, epic_id,
       scope_origin, need_score, queue, filed_at, size_stamp)
    values
      ('ZFIX-48301','later','Gate fixture PARENT -- scored 5, waiting on the CHILD','open','agt483-gate',1,c_epic,'john-named',5,999991,'2026-08-01','S'),
      ('ZFIX-48302','later','Gate fixture CHILD -- scored 1, the blocker the PARENT waits on','open','agt483-gate',2,c_epic,'john-named',1,999992,'2026-08-01','S'),
      ('ZFIX-48303','later','Gate fixture STRANGER -- scored 1, blocks nobody, the control','open','agt483-gate',3,c_epic,'john-named',1,999993,'2026-08-01','S'),
      ('ZFIX-48304','later','Gate fixture CONTROL -- scored 4, the pick today takes','open','agt483-gate',4,c_epic,'john-named',4,999994,'2026-08-01','S');
    select id into v_parent   from public.backlog_items where backlog_id = 'ZFIX-48301';
    select id into v_child    from public.backlog_items where backlog_id = 'ZFIX-48302';
    select id into v_stranger from public.backlog_items where backlog_id = 'ZFIX-48303';
    select id into v_control  from public.backlog_items where backlog_id = 'ZFIX-48304';
    update public.backlog_items set blocked_by = v_child where id = v_parent;

    -- CHILD and STRANGER are graded, so the floor's P3 is satisfied for both and the only thing
    -- separating them in QA 6.1 case 3 is the lift.
    insert into public.runner_decisions (kind, backlog_id, summary, reasoning, expires_at, session_name)
    values ('requirement-check','ZFIX-48302','AGT-483 GATE FIXTURE grade 1','AGT-483 GATE FIXTURE grade 1', now() + interval '1 day','agt483-gate'),
           ('requirement-check','ZFIX-48303','AGT-483 GATE FIXTURE grade 1','AGT-483 GATE FIXTURE grade 1', now() + interval '1 day','agt483-gate');

    -- ---- 6.1 (1) THE SCORES: the blocker reads its parent's 5, the stranger still reads its 1 --
    select public.effective_need_score(v_parent), public.effective_need_score(v_child),
           public.effective_need_score(v_stranger), public.effective_need_score(v_control)
      into v_eff_p, v_eff_c, v_eff_s, v_eff_n;

    -- ---- 6.1 (2) the pick's own sentence ----------------------------------------------------
    select x.reasons into v_reas_c from public.pick_exclusions() x where x.backlog_id = 'ZFIX-48302';
    select x.reasons into v_reas_s from public.pick_exclusions() x where x.backlog_id = 'ZFIX-48303';

    -- ---- 6.1 (3) the floor counts the lifted blocker, not the stranger ----------------------
    select c.backlog_ids into v_count from public.countable_tickets_per_project() c where c.project_slug = 'tooling';

    -- ---- DRAIN D, exclusive and dated 2020 so both picks read it, naming all four -----------
    v_d := gen_random_uuid();
    insert into public.runner_directives (id, type, status, epic_id, exclusive, body, created_at)
    values (v_d, 'drain-epic', 'queued', c_epic, true,
            'AGT-483 GATE FIXTURE drain D (exclusive, dated 2020 so both picks read it). Rolled back by sentinel P0483.',
            '2020-01-01');
    insert into public.runner_drain_scope (directive_id, item_id, backlog_id)
    values (v_d, v_parent,   'ZFIX-48301'),
           (v_d, v_child,    'ZFIX-48302'),
           (v_d, v_stranger, 'ZFIX-48303'),
           (v_d, v_control,  'ZFIX-48304');

    -- ---- 6.1 (4) the queue's selfbuild lane, in its own pos order ---------------------------
    select coalesce(array_agg(q.ref order by q.pos) filter (where q.lane = 'selfbuild'), '{}')
      into v_self from public.prime_directive_queue() q;

    -- ---- 6.1 (5) the drain pick ------------------------------------------------------------
    select q.outcome, q.backlog_id into v_out, v_pick from public.drain_epic_next(v_cycle) q;

    raise exception sqlstate 'P0483' using message = 'AGT-483 pair probe: fixtures measured, rolling them back';
  exception when sqlstate 'P0483' then
    null;   -- every fixture write above is undone; the measurements survive in the variables
  end;

  -- the residue, read AFTER the sentinel: the sub-block undid every fixture write.
  select count(*)::int into v_items from public.backlog_items    where source_file = 'agt483-gate';
  select count(*)::int into v_dirs  from public.runner_directives where body like 'AGT-483 GATE FIXTURE%';
  select count(*)::int into v_decs  from public.runner_decisions  where summary like 'AGT-483 GATE FIXTURE%';
  select count(*)::int into v_scope from public.runner_drain_scope where backlog_id like 'ZFIX-483%';

  return jsonb_build_object(
    'parent', v_eff_p,
    'child', v_eff_c,
    'stranger', v_eff_s,
    'control', v_eff_n,
    'child_reasons', to_jsonb(v_reas_c),
    'stranger_reasons', to_jsonb(v_reas_s),
    'tooling_countable', to_jsonb(v_count),
    'selfbuild', to_jsonb(v_self),
    'drain_outcome', v_out,
    'drain_pick', v_pick,
    'residue', jsonb_build_object('items', v_items, 'directives', v_dirs,
                                  'decisions', v_decs, 'scope', v_scope),
    'cycle_id', v_cycle);
end
$fn$;

-- Closed to the browser's keys BY NAME, never by REVOKE ... FROM PUBLIC alone: pg_default_acl in
-- this project grants EXECUTE to anon, authenticated and service_role by name the instant a
-- function is created, and a PUBLIC-only revoke leaves those three standing while reporting
-- success (.claude/rules/supabase-column-grants.md, SES-315 addendum). The gate below asserts both
-- directions rather than trusting this statement's success flag.
REVOKE ALL ON FUNCTION public.parent_score_probe(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.parent_score_probe(uuid) TO service_role;

-- ==============================================================================================
-- THE GATE. It drives F2 once with THIS cycle's id and RAISEs unless every clause of kickoff
-- section 6.1 holds, F2 is committed at one overload with EXECUTE closed to anon and
-- authenticated and open to service_role, and the five functions AGT-483 shipped in v7.0.857 are
-- byte-unchanged -- this migration touches none of them. Anything that does not hold aborts the
-- whole migration, F2 included. Its measurements are the SAME numbers tests/regression/
-- agt-483-parent-score.test.mjs's arm C grades through gradePair(), so this gate is the apply-time
-- half of a standing assertion rather than, as in agt483_parent_score, the only place it ever ran.
-- ==============================================================================================
DO $gate$
declare
  c_cycle uuid := '420cefbe-f47e-4bb2-a133-a20d9d9c62ee';
  j jsonb;
  v_eff_p int; v_eff_c int; v_eff_s int; v_eff_n int;
  v_reas_c text[]; v_reas_s text[]; v_count text[]; v_self text[];
  v_out text; v_pick text;
  v_items int; v_dirs int; v_decs int; v_scope int;
  v_n int; v_a boolean; v_b boolean; v_c boolean;
  r record;
  v_frozen int := 0;
begin
  j := public.parent_score_probe(c_cycle);
  raise notice 'AGT-483 PAIR PROBE returned %', j;

  v_eff_p := (j->>'parent')::int;
  v_eff_c := (j->>'child')::int;
  v_eff_s := (j->>'stranger')::int;
  v_eff_n := (j->>'control')::int;
  v_out   := j->>'drain_outcome';
  v_pick  := j->>'drain_pick';
  v_items := (j#>>'{residue,items}')::int;
  v_dirs  := (j#>>'{residue,directives}')::int;
  v_decs  := (j#>>'{residue,decisions}')::int;
  v_scope := (j#>>'{residue,scope}')::int;
  v_reas_c := case when jsonb_typeof(j->'child_reasons') = 'array'
                   then array(select jsonb_array_elements_text(j->'child_reasons')) end;
  v_reas_s := case when jsonb_typeof(j->'stranger_reasons') = 'array'
                   then array(select jsonb_array_elements_text(j->'stranger_reasons')) end;
  v_count  := case when jsonb_typeof(j->'tooling_countable') = 'array'
                   then array(select jsonb_array_elements_text(j->'tooling_countable')) end;
  v_self   := case when jsonb_typeof(j->'selfbuild') = 'array'
                   then array(select jsonb_array_elements_text(j->'selfbuild')) end;

  -- ---- 6.1 (1) THE SCORES -------------------------------------------------------------------
  if v_eff_c is distinct from 5 then
    raise exception 'AGT-483 PAIR GATE 6.1(1): THE WHOLE TICKET -- the CHILD blocks a ticket scored 5, so effective_need_score must read 5, got % (its own column reads 1)', v_eff_c;
  end if;
  if v_eff_p is distinct from 5 or v_eff_s is distinct from 1 or v_eff_n is distinct from 4 then
    raise exception 'AGT-483 PAIR GATE 6.1(1): the other three must read their own scores -- PARENT % (5), STRANGER % (1), CONTROL % (4). A STRANGER that moved means the lift is not reading blocked_by.', v_eff_p, v_eff_s, v_eff_n;
  end if;

  -- ---- 6.1 (2) the pick's own sentence ------------------------------------------------------
  if EXISTS (SELECT 1 FROM unnest(coalesce(v_reas_c, '{}'::text[])) z
              WHERE z LIKE '%is below 3' OR z LIKE '%not yet scored%') then
    raise exception 'AGT-483 PAIR GATE 6.1(2): the lifted CHILD still carries a score reason -- %', v_reas_c;
  end if;
  if v_reas_s is null or NOT ('need_score 1 is below 3' = ANY(v_reas_s)) then
    raise exception 'AGT-483 PAIR GATE 6.1(2): THE CONTROL FAILED -- the STRANGER blocks nobody, so it must still read its own score reason, got %', v_reas_s;
  end if;

  -- ---- 6.1 (3) the floor --------------------------------------------------------------------
  if v_count is null or NOT (v_count @> ARRAY['ZFIX-48302']::text[]) then
    raise exception 'AGT-483 PAIR GATE 6.1(3): the floor must count the lifted CHILD, got %', v_count;
  end if;
  if v_count && ARRAY['ZFIX-48303','ZFIX-48301']::text[] then
    raise exception 'AGT-483 PAIR GATE 6.1(3): the floor counted the STRANGER or the blocked PARENT, got %', v_count;
  end if;

  -- ---- 6.1 (4) the selfbuild lane -----------------------------------------------------------
  if v_self is null or NOT (v_self @> ARRAY['ZFIX-48302','ZFIX-48304']::text[]) then
    raise exception 'AGT-483 PAIR GATE 6.1(4): the selfbuild lane must name the lifted CHILD and the CONTROL, got %', v_self;
  end if;
  if v_self && ARRAY['ZFIX-48303','ZFIX-48301']::text[] then
    raise exception 'AGT-483 PAIR GATE 6.1(4): the selfbuild lane served the STRANGER or the blocked PARENT, got %', v_self;
  end if;
  if NOT (array_position(v_self, 'ZFIX-48302') < array_position(v_self, 'ZFIX-48304')) then
    raise exception 'AGT-483 PAIR GATE 6.1(4): the lifted CHILD must sort AHEAD of the CONTROL (its 1 sorts as a 5), got lane %', v_self;
  end if;

  -- ---- 6.1 (5) the drain pick ---------------------------------------------------------------
  if v_out is distinct from 'pick' or v_pick is distinct from 'ZFIX-48302' then
    raise exception 'AGT-483 PAIR GATE 6.1(5): the drain pick must take the lifted CHILD, got outcome % pick %', coalesce(v_out,'(null)'), coalesce(v_pick,'(null)');
  end if;

  -- ---- the residue: the probe's sentinel undid every fixture write it made -------------------
  if v_items <> 0 or v_dirs <> 0 or v_decs <> 0 or v_scope <> 0 then
    raise exception 'AGT-483 PAIR GATE: the probe left residue -- % ticket(s), % directive(s), % decision(s), % scope row(s)', v_items, v_dirs, v_decs, v_scope;
  end if;
  if (j->>'cycle_id') is distinct from c_cycle::text then
    raise exception 'AGT-483 PAIR GATE: the probe reported cycle_id % for a call passed %', j->>'cycle_id', c_cycle;
  end if;

  -- ---- F2 itself: committed, one overload, closed to the browser's keys ----------------------
  select count(*)::int,
         bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')),
         bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE')),
         bool_and(has_function_privilege('service_role', p.oid, 'EXECUTE'))
    into v_n, v_a, v_b, v_c
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.prokind = 'f' and p.proname = 'parent_score_probe';
  if v_n <> 1 then
    raise exception 'AGT-483 PAIR GATE: pg_proc holds % overload(s) of public.parent_score_probe, expected exactly 1 (.claude/rules/supabase-function-signature.md)', v_n;
  end if;
  if v_a or v_b or not v_c then
    raise exception 'AGT-483 PAIR GATE: EXECUTE on public.parent_score_probe reads anon=% authenticated=% service_role=%, expected false/false/true. A REVOKE ... FROM PUBLIC alone leaves the named role grants standing and still reports success (.claude/rules/supabase-column-grants.md, SES-315).', v_a, v_b, v_c;
  end if;

  -- ---- the five v7.0.857 functions are BYTE-UNCHANGED: this migration touches none of them ---
  for r in
    select x.nm, x.want, count(p.oid)::int as n,
           max(md5(pg_get_functiondef(p.oid))) as got
      from (values ('effective_need_score','950c54d2ea3e72cff9e64a540bb4f524'),
                   ('pick_exclusions','24aa9b257fd0f6d5623d0d16a774deaf'),
                   ('prime_directive_queue','8e2e92255fdff9bd767dfcab5197ba61'),
                   ('drain_epic_next','057d8de7bd3780b67c12986ce2c5cbb6'),
                   ('countable_tickets_per_project','c7d47be9703f49ce5af82f96314ea0ac')) x(nm, want)
      left join (pg_proc p join pg_namespace ns on ns.oid = p.pronamespace)
             on ns.nspname = 'public' and p.prokind = 'f' and p.proname = x.nm
     group by x.nm, x.want
     order by x.nm
  loop
    if r.n <> 1 then
      raise exception 'AGT-483 PAIR GATE: public.% reads % overload(s), expected exactly 1', r.nm, r.n;
    end if;
    if r.got is distinct from r.want then
      raise exception 'AGT-483 PAIR GATE: public.% now hashes to %, kickoff section 2 read % before this migration -- this migration must touch none of the five', r.nm, r.got, r.want;
    end if;
    v_frozen := v_frozen + 1;
  end loop;
  if v_frozen <> 5 then
    raise exception 'AGT-483 PAIR GATE: checked % of the five v7.0.857 functions', v_frozen;
  end if;

  raise notice 'AGT-483 PAIR GATE PASSED. scores PARENT=% CHILD=% STRANGER=% CONTROL=%; CHILD reasons %; STRANGER reasons %; tooling countable %; selfbuild lane %; drain pick outcome=% ref=%; residue %/%/%/%; parent_score_probe at 1 overload, EXECUTE false/false/true; five v7.0.857 md5s unchanged.',
    v_eff_p, v_eff_c, v_eff_s, v_eff_n, v_reas_c, v_reas_s, v_count, v_self, v_out, v_pick,
    v_items, v_dirs, v_decs, v_scope;
end
$gate$;
