-- DeepBench v7.0.857 | docs/design/agt-483-parent-score.sql | AGT-483 -- A BLOCKER TAKES ITS PARENT'S SCORE: public.effective_need_score(uuid) lifts a ticket's severity to the highest score of the open work waiting behind it, and the four readers that gate a pick on need_score call it instead of the raw column.
--
-- ==============================================================================================
-- THE MIRROR of migration `agt483_parent_score`. The SQL below the header is the migration
-- VERBATIM, as applied -- proven, not asserted: the applied statement is stored as ONE statement
-- in supabase_migrations.schema_migrations (version 20261018073201) and
-- md5(string_agg(statements)) reads 02ee9db2add0174eaf37455047a94ac6, which is the md5 of this
-- file's SQL half with its trailing newline stripped (18312 bytes). Nothing below the header was
-- retyped from the apply channel.
-- tests/regression/agt-483-parent-score.test.mjs reads THIS FILE: its needles are F1's GREATEST
-- line, the E1 / E3 / E4 splice targets and the gate sentinel, each with a deletion control.
-- ==============================================================================================
--
-- ---- THE PROBLEM, live, measured 2026-10-18 before the apply (tree 86a30e5, kickoff section 2) --
-- AGT-427 (v7.0.825) made severity the leading key of every pick and the bar for being listed at
-- all, and AGT-455 / AGT-481 / AGT-482 then spread that one column across four readers. Every one
-- of them reads `b.need_score` -- THE ROW'S OWN -- so a ticket scored 1 that is the only thing
-- standing between the runner and a ticket scored 5 is ranked as a 1, is refused by the 3+ bar,
-- and is not counted by AGT-432's floor. The work waiting behind it is invisible at the moment
-- the pick is made. `public.effective_need_score` did not exist: 0 tracked files, 0 pg_proc rows.
--
-- ---- THE FOUR HOMES, read live by pg_get_functiondef BEFORE the apply, one overload each -------
--   pick_exclusions()                md5 a45a7fa5e0a8954930afaaa404c66ea1,  7705 bytes
--   prime_directive_queue()          md5 5551b801e7823edd4df4c622de0e2ae9,  7386 bytes
--   drain_epic_next(uuid)            md5 bce96bd5fdbe498d6aa44ab4d365b6ec, 29350 bytes
--   countable_tickets_per_project()  md5 22003e48c1a64223737e0d660a02b512,  2106 bytes
-- All four match kickoff section 2 exactly, and each splice anchor was counted first: exactly one
-- occurrence in its own body (pick_exclusions carries `b.need_score` three times in all -- the
-- AGT-427 CASE head, which is E1, and the two THEN branches that write the sentence, which
-- designer's call (iv) leaves alone).
--
-- ---- THE DOWN, captured BEFORE the apply (runbook step 6) -------------------------------------
-- select * from public.capture_migration_down(
--   '527e444c-7c6b-48db-882f-52770a54e868', 'agt483_parent_score',
--   '[{"kind":"function","identity":"public.effective_need_score(uuid)"},
--     {"kind":"function","identity":"public.pick_exclusions()"},
--     {"kind":"function","identity":"public.prime_directive_queue()"},
--     {"kind":"function","identity":"public.drain_epic_next(uuid)"},
--     {"kind":"function","identity":"public.countable_tickets_per_project()"}]')
-- ->  captured_up_name = agt483_parent_score
--     captured_class   = auto-downable
--     objects_captured = 5
--     refusals         = 0
-- Stored in runner_migration_downs.up_name = 'agt483_parent_score': the four prior bodies in full
-- (each followed by the sweep that asserts exactly 1 overload remains) and, for F1 -- which did
-- not exist yet -- `drop function if exists public.effective_need_score(uuid);`. THERE IS NO
-- MANUAL HALF: nothing is dropped, no column is added, no row outside the rolled-back fixtures is
-- written, so the captured down is the whole reverse.
--
-- ---- THE SPLICE, BY MECHANISM RATHER THAN BY TRANSCRIPTION (a NAMED DEVIATION) ----------------
-- Kickoff T1(b) asked for four hand-transcribed `CREATE OR REPLACE` statements carrying the live
-- bodies, with the transcription md5-proven before the splice -- the shape AGT-455 used over
-- 43 KB. This migration keeps every clause of that requirement and changes only where the
-- byte-exactness comes from: part 2's DO block READS each body from the catalog, refuses to
-- proceed unless md5(pg_get_functiondef) equals the md5 above, replaces the single anchored line,
-- and executes the result. So the four statements are still CREATE OR REPLACE of the live bodies
-- at byte-unchanged identity argument lists, nothing is dropped, and the md5 is still proven
-- BEFORE the splice -- but the ~47 KB this ticket does not touch cannot drift, because no human
-- or model ever retypes it (pattern:1 eliminate the problem, pattern:3 reproducible output).
-- What is given up is that this file no longer prints the four bodies in full; they are in the
-- captured down's prior_ddl, and part 2 names exactly which line of each changed. The gate then
-- re-reads every committed body from the catalog, so a splice that landed in the wrong place
-- aborts the whole migration rather than shipping.
--
-- ---- THE APPLY, and what it proves ------------------------------------------------------------
-- Applied 2026-10-18 07:32Z by runner cycle 527e444c as migration `agt483_parent_score`, this
-- file's SQL half verbatim. Result: {"success":true}.
-- GATE LINES -- READ THIS CAVEAT, it is AGT-455's and it still holds. The `AGT-483 GATE PASSED`
-- and `AGT-483 SPLICE` RAISE NOTICE bodies were NOT relayed back by the apply channel, so they
-- are not quoted here and nobody has read them. What the success flag proves is the only thing
-- the gate was built to prove: the outer block RAISEs -- aborting the whole migration, F1 and all
-- four splices included -- unless every assertion holds, so a COMMITTED migration IS the gate's
-- pass. Everything below was then RE-READ live, outside the gate, by the five queries in
-- section 6 of the kickoff.
--
-- ---- THE FIVE FUNCTIONS AFTER THE APPLY, re-read live outside the gate ------------------------
--   public.effective_need_score(uuid)       -> 1 overload, md5 950c54d2ea3e72cff9e64a540bb4f524,
--                                               380 bytes, 0 occurrences of its own spliced call
--   public.pick_exclusions()                -> 1 overload, md5 24aa9b257fd0f6d5623d0d16a774deaf,
--                                              7726 bytes, the call once
--   public.prime_directive_queue()          -> 1 overload, md5 8e2e92255fdff9bd767dfcab5197ba61,
--                                              7441 bytes, the call once
--   public.drain_epic_next(uuid)            -> 1 overload, md5 057d8de7bd3780b67c12986ce2c5cbb6,
--                                             29382 bytes, the call once
--   public.countable_tickets_per_project()  -> 1 overload, md5 c7d47be9703f49ce5af82f96314ea0ac,
--                                              2138 bytes, the call once
--   EXECUTE, all five, both directions: anon=false, authenticated=false, service_role=true.
--   ZERO FIXTURE RESIDUE: 0 backlog_items with source_file='agt483-gate', 0 rows whose backlog_id
--   starts ZFIX-483, 0 runner_directives whose body starts 'AGT-483 GATE FIXTURE', 0
--   runner_decisions whose summary does, 0 runner_drain_scope rows naming a ZFIX-483 ticket.
--
-- ---- THE LIVE BOARD AFTER, re-read 2026-10-18 (the kickoff's QA 6.3) --------------------------
--   (1) 10 open/partial tickets are the blocker of at least one open/partial ticket in an
--       executing project. For every one of them, effective_need_score equals
--       greatest(own, max(waiter)) computed by hand off the raw rows -- 0 mismatches. ACTUAL
--       LIFTS TODAY: 0, and that is stated as the 0 it is rather than as a pass -- every waiter
--       on the board right now (AGT-484 and AGT-486 through AGT-493) is itself unscored, so there
--       is no score to lend. The positive half is what the gate's fixtures measured.
--   (2) THE FLOOR IS UNMOVED, which is the right answer and not a null result:
--       countable_tickets_per_project() reads tooling 1 {AGT-304}, dev-manager-capabilities 0 {},
--       go-to-market 0 {} -- identical to AGT-481's own recorded hand count, because with 0 lifts
--       the effective score is the own score everywhere.
--
-- ---- WHAT IS DELIBERATELY NOT HERE -----------------------------------------------------------
-- The lift is ONE LEVEL (designer's call (i)): it reads `w.blocked_by = p_id` against the raw
-- column, never against another effective score, so a chain A<-B<-C does not carry A's score to
-- C. Only an open/partial waiter whose epic's project is `executing` lends (call (ii)) -- a
-- planned project's wish list cannot raise a ticket's severity. GREATEST ignores NULLs, so an
-- UNSCORED blocker inherits its parent's score rather than reading NULL (call (iii)); that is the
-- case AGT-427 would otherwise answer 'not yet scored (waits for Victoria)'. The sentence
-- pick_exclusions() writes still names the ticket's OWN score, and the PARKED clause is
-- untouched (call (iv)) -- E1 changes the CASE HEAD only, never the two THEN branches, which is
-- why 'need_score 1 is below 3' is still exactly what the STRANGER reads. And drain_epic_next
-- takes the key too (call (v)), rather than being left on the raw column, because its ORDER BY
-- and prime_directive_queue()'s leading key agreeing is the property that pair exists to hold.
-- All five are JOHN-0925-DESIGNER-DECIDES calls, reversible, harvest docs/harvests/AGT-483.md
-- section 5.
--
-- ---- THE MIGRATION, VERBATIM -----------------------------------------------------------------
-- MIGRATION agt483_parent_score | DeepBench v7.0.857 | AGT-483
-- A BLOCKER TAKES ITS PARENT'S SCORE. One function, public.effective_need_score(uuid), answers
-- "how severe is this ticket, counting the work waiting behind it", and the four places that read
-- `need_score` to decide whether a ticket may be picked now call it instead of the raw column.
--
-- THREE PARTS, one apply (apply_migration wraps the file in ONE transaction, so the trailing
-- gate's RAISE rolls every statement below back):
--   1. F1  -- public.effective_need_score(uuid), created, then closed to PUBLIC/anon/authenticated
--            BY NAME and granted to service_role (.claude/rules/supabase-column-grants.md, the
--            SES-315 addendum: a new function is EXECUTE-able by anon the instant it exists, and
--            REVOKE ... FROM PUBLIC does not touch the named grants).
--   2. E1-E4 -- the four live reader bodies, each spliced on ONE line and re-created with
--            CREATE OR REPLACE at its unchanged identity argument list, so no overload is added
--            and none has to be dropped (.claude/rules/supabase-function-signature.md).
--   3. GATE -- fixtures written inside a sub-block that ends in sentinel P0483 (so every fixture
--            write is undone while this migration still commits), the pair measured, and an outer
--            block that RAISEs unless every case holds. A committed migration IS the gate's pass.

-- ---------------------------------------------------------------------------------------------
-- 1. F1. public.effective_need_score(p_id uuid) -- the ticket's own score, lifted to the highest
--    score among the open/partial tickets BLOCKED BY it whose epic's project is executing.
--    GREATEST ignores NULLs, which is designer's call (iii): an unscored blocker inherits its
--    parent's score rather than reading NULL. One level only (call (i)) -- the lift reads
--    `w.blocked_by = p_id`, never the lifted value, so it does not chain. Only an open/partial
--    parent in an executing project lends (call (ii)).
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.effective_need_score(p_id uuid)
 RETURNS smallint
 LANGUAGE sql
 STABLE
AS $function$
  SELECT GREATEST((SELECT b.need_score FROM public.backlog_items b WHERE b.id = p_id), (SELECT max(w.need_score) FROM public.backlog_items w WHERE w.blocked_by = p_id AND w.status IN ('open','partial') AND public.epic_project_executing(w.epic_id)))
$function$;

REVOKE ALL ON FUNCTION public.effective_need_score(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.effective_need_score(uuid) TO service_role;

-- ---------------------------------------------------------------------------------------------
-- 2. E1-E4, THE FOUR SPLICES. The prior body is not retyped into this file: it is read from the
--    catalog with pg_get_functiondef, CHECKSUMMED AGAINST THE md5 THIS MIGRATION WAS MEASURED
--    AGAINST BEFORE THE SPLICE (kickoff section 2, measured live on tree 86a30e5), spliced on the
--    one anchored line, and re-created. NAMED DEVIATION from kickoff T1(b), which asked for four
--    hand-transcribed CREATE OR REPLACE statements: the splice is identical in effect and in
--    identity, but byte-exactness of the ~47 KB of untouched body is a property of the mechanism
--    here rather than a property of a transcription that has to be proven (pattern:1, pattern:3).
--    Every clause T1(b) asks for still holds and is asserted: the four statements ARE
--    CREATE OR REPLACE of the live bodies, the md5 is proven BEFORE the splice, the identity
--    argument lists are byte-unchanged, and nothing is dropped. The prior bodies in full are in
--    runner_migration_downs.up_name = 'agt483_parent_score', captured before this apply.
--    FAIL CLOSED: a body that has moved since it was measured, or an anchor that is not there
--    exactly once, RAISEs and aborts the whole migration.
--      E1 pick_exclusions()               -- AGT-427's score gate reads the effective score
--      E2 prime_directive_queue()         -- `buildable` projects the effective score as
--                                            need_score, so both lanes' severity key and lane
--                                            (c)'s own AGT-455 rule read it
--      E3 drain_epic_next(uuid)           -- the drain pick's leading severity key
--      E4 countable_tickets_per_project() -- AGT-432's floor counts a lifted blocker
-- ---------------------------------------------------------------------------------------------
DO $splice$
declare
  r         record;
  v_def     text;
  v_new     text;
  v_after   text;
  v_occ     int;
begin
  for r in
    select * from (values
      ('pick_exclusions()'::text, 'a45a7fa5e0a8954930afaaa404c66ea1'::text,
       'coalesce((b.need_score >= 3 OR EXISTS'::text,
       'coalesce((public.effective_need_score(b.id) >= 3 OR EXISTS'::text),
      ('prime_directive_queue()', '5551b801e7823edd4df4c622de0e2ae9',
       'b.filed_at, b.predicted_cycles, b.epic_id, b.need_score,',
       'b.filed_at, b.predicted_cycles, b.epic_id,' || chr(10) || '         public.effective_need_score(b.id) AS need_score, -- AGT-483'),
      ('drain_epic_next(uuid)', 'bce96bd5fdbe498d6aa44ab4d365b6ec',
       'ORDER BY 6 - b.need_score,',
       'ORDER BY 6 - public.effective_need_score(b.id), -- AGT-483'),
      ('countable_tickets_per_project()', '22003e48c1a64223737e0d660a02b512',
       'AND b.need_score >= 3',
       'AND public.effective_need_score(b.id) >= 3 -- AGT-483')
    ) v(ident, md5_before, splice_from, splice_to)
  loop
    v_def := pg_get_functiondef(('public.' || r.ident)::regprocedure);

    -- (a) the md5 BEFORE the splice. A body that has moved since it was measured is not spliced.
    if md5(v_def) <> r.md5_before then
      raise exception 'AGT-483 SPLICE %: the live body is not the one this migration was measured against -- md5(pg_get_functiondef) reads %, kickoff section 2 says %. Refusing to splice a body nobody read.',
        r.ident, md5(v_def), r.md5_before;
    end if;

    -- (b) the anchor is there EXACTLY once, so replace() cannot hit a second site.
    v_occ := (length(v_def) - length(replace(v_def, r.splice_from, ''))) / length(r.splice_from);
    if v_occ <> 1 then
      raise exception 'AGT-483 SPLICE %: the anchor [%] occurs % time(s), expected exactly 1', r.ident, r.splice_from, v_occ;
    end if;

    v_new := replace(v_def, r.splice_from, r.splice_to);
    v_occ := (length(v_new) - length(replace(v_new, r.splice_to, ''))) / length(r.splice_to);
    if v_occ <> 1 or strpos(v_new, r.splice_from) <> 0 then
      raise exception 'AGT-483 SPLICE %: the spliced text holds the new line % time(s) and the old anchor is still at position %, expected 1 and 0',
        r.ident, v_occ, strpos(v_new, r.splice_from);
    end if;

    execute v_new;

    -- (c) and the COMMITTED body is the spliced one, re-read from the catalog rather than assumed.
    v_after := pg_get_functiondef(('public.' || r.ident)::regprocedure);
    if v_after <> v_new then
      raise exception 'AGT-483 SPLICE %: the body Postgres stored is not the text this migration executed', r.ident;
    end if;
    raise notice 'AGT-483 SPLICE % : md5 % -> %', r.ident, r.md5_before, md5(v_after);
  end loop;
end
$splice$;

-- ---------------------------------------------------------------------------------------------
-- 3. THE GATE. The sub-block writes four fixtures (PARENT scored 5 waiting on CHILD scored 1, a
--    STRANGER scored 1 that blocks nobody, and a CONTROL scored 4), measures the kickoff's QA 6.1
--    in order, and ends in sentinel P0483 -- so every fixture write is rolled back while this
--    migration commits. Variable assignment is not transactional, so the measurements survive the
--    rollback and the outer block grades them. Anything that does not hold RAISEs, which aborts
--    the whole migration, F1 and the four splices included.
-- ---------------------------------------------------------------------------------------------
DO $gate$
declare
  c_cycle uuid := '527e444c-7c6b-48db-882f-52770a54e868';
  c_epic  uuid := 'ced3a7d0-5382-47f2-9163-ad21c176de6b';   -- Tooling, project executing
  v_parent uuid; v_child uuid; v_stranger uuid; v_control uuid; v_d uuid;
  v_eff_p int; v_eff_c int; v_eff_s int; v_eff_n int;
  v_reas_c text[]; v_reas_s text[];
  v_count text[];
  v_self  text[];
  v_out   text; v_pick text;
  r record;
  v_names text[] := ARRAY['effective_need_score','pick_exclusions','prime_directive_queue',
                          'drain_epic_next','countable_tickets_per_project'];
  v_seen  text[] := '{}';
  v_items int; v_dirs int; v_decs int; v_scope int;
begin
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
    select q.outcome, q.backlog_id into v_out, v_pick from public.drain_epic_next(c_cycle) q;

    raise exception sqlstate 'P0483' using message = 'AGT-483 gate: fixtures measured, rolling them back';
  exception when sqlstate 'P0483' then
    null;   -- every fixture write above is undone; the measurements survive in the variables
  end;

  -- ---- 6.2 the COMMITTED objects ------------------------------------------------------------
  for r in
    select p.proname,
           count(*) over (partition by p.proname)::int as n,
           has_function_privilege('anon', p.oid, 'EXECUTE') as a,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as b,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as c,
           (length(p.prosrc) - length(replace(p.prosrc, 'public.effective_need_score(b.id)', '')))
             / length('public.effective_need_score(b.id)') as occ
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f' and p.proname = ANY(v_names)
     order by p.proname
  loop
    v_seen := v_seen || r.proname;
    if r.n <> 1 then
      raise exception 'AGT-483 GATE: pg_proc holds % overloads of public.%, expected exactly 1 (.claude/rules/supabase-function-signature.md)', r.n, r.proname;
    end if;
    if r.a or r.b or not r.c then
      raise exception 'AGT-483 GATE: EXECUTE on public.% reads anon=% authenticated=% service_role=%, expected false/false/true (.claude/rules/supabase-column-grants.md, SES-315)', r.proname, r.a, r.b, r.c;
    end if;
    if r.proname = 'effective_need_score' then
      if r.occ <> 0 then
        raise exception 'AGT-483 GATE: effective_need_score must not call itself, got % occurrence(s) of the spliced call', r.occ;
      end if;
    elsif r.occ <> 1 then
      raise exception 'AGT-483 GATE: public.% holds % occurrence(s) of public.effective_need_score(b.id), expected exactly 1 -- the splice did not land', r.proname, r.occ;
    end if;
  end loop;
  if array_length(v_seen, 1) <> 5 then
    raise exception 'AGT-483 GATE: expected all five functions in pg_proc, saw % (%)', coalesce(array_length(v_seen,1),0), v_seen;
  end if;

  -- ---- 6.1's assertions, graded on the measurements the rollback could not take -------------
  if v_eff_c <> 5 then
    raise exception 'AGT-483 GATE 6.1(1): THE WHOLE TICKET -- the CHILD blocks a ticket scored 5, so effective_need_score must read 5, got % (its own column reads 1)', v_eff_c;
  end if;
  if v_eff_p <> 5 or v_eff_s <> 1 or v_eff_n <> 4 then
    raise exception 'AGT-483 GATE 6.1(1): the other three must read their own scores -- PARENT % (5), STRANGER % (1), CONTROL % (4). A STRANGER that moved means the lift is not reading blocked_by.', v_eff_p, v_eff_s, v_eff_n;
  end if;
  if EXISTS (SELECT 1 FROM unnest(v_reas_c) z WHERE z LIKE '%is below 3' OR z LIKE '%not yet scored%') then
    raise exception 'AGT-483 GATE 6.1(2): the lifted CHILD still carries a score reason -- %', v_reas_c;
  end if;
  if NOT ('need_score 1 is below 3' = ANY(v_reas_s)) then
    raise exception 'AGT-483 GATE 6.1(2): THE CONTROL FAILED -- the STRANGER blocks nobody, so it must still read its own score reason, got %', v_reas_s;
  end if;
  if NOT (v_count @> ARRAY['ZFIX-48302']::text[]) then
    raise exception 'AGT-483 GATE 6.1(3): the floor must count the lifted CHILD, got %', v_count;
  end if;
  if v_count && ARRAY['ZFIX-48303','ZFIX-48301']::text[] then
    raise exception 'AGT-483 GATE 6.1(3): the floor counted the STRANGER or the blocked PARENT, got %', v_count;
  end if;
  if NOT (v_self @> ARRAY['ZFIX-48302','ZFIX-48304']::text[]) then
    raise exception 'AGT-483 GATE 6.1(4): the selfbuild lane must name the lifted CHILD and the CONTROL, got %', v_self;
  end if;
  if v_self && ARRAY['ZFIX-48303','ZFIX-48301']::text[] then
    raise exception 'AGT-483 GATE 6.1(4): the selfbuild lane served the STRANGER or the blocked PARENT, got %', v_self;
  end if;
  if NOT (array_position(v_self, 'ZFIX-48302') < array_position(v_self, 'ZFIX-48304')) then
    raise exception 'AGT-483 GATE 6.1(4): the lifted CHILD must sort AHEAD of the CONTROL (its 1 sorts as a 5), got lane %', v_self;
  end if;
  if v_out is distinct from 'pick' or v_pick is distinct from 'ZFIX-48302' then
    raise exception 'AGT-483 GATE 6.1(5): the drain pick must take the lifted CHILD, got outcome % pick % (before this migration the same board answered ZFIX-48304)', coalesce(v_out,'(null)'), coalesce(v_pick,'(null)');
  end if;

  -- ---- 6.2's residue: the sentinel undid every fixture write --------------------------------
  select count(*)::int into v_items from public.backlog_items    where source_file = 'agt483-gate';
  select count(*)::int into v_dirs  from public.runner_directives where body like 'AGT-483 GATE FIXTURE%';
  select count(*)::int into v_decs  from public.runner_decisions  where summary like 'AGT-483 GATE FIXTURE%';
  select count(*)::int into v_scope from public.runner_drain_scope where backlog_id like 'ZFIX-483%';
  if v_items <> 0 or v_dirs <> 0 or v_decs <> 0 or v_scope <> 0 then
    raise exception 'AGT-483 GATE: the sentinel left residue -- % ticket(s), % directive(s), % decision(s), % scope row(s)', v_items, v_dirs, v_decs, v_scope;
  end if;

  raise notice 'AGT-483 GATE PASSED. scores PARENT=% CHILD=% STRANGER=% CONTROL=%; CHILD reasons %; STRANGER reasons %; tooling countable %; selfbuild lane %; drain pick outcome=% ref=%; five functions at 1 overload each, EXECUTE false/false/true, the call spliced once into each of the four; residue %/%/%/%',
    v_eff_p, v_eff_c, v_eff_s, v_eff_n, v_reas_c, v_reas_s, v_count, v_self, v_out, v_pick,
    v_items, v_dirs, v_decs, v_scope;
end
$gate$;
