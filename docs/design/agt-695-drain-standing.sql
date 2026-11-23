-- DeepBench v7.0.1110 | docs/design/agt-695-drain-standing.sql | AGT-695 -- which queued drain the pick is on gets one read-only home, public.drain_standing(); the queue the boot gate counts from and the invention filer read it instead of the oldest queued drain.
--
-- THE MIRROR of migration `agt695_drain_standing`. Everything below the VERBATIM marker is the
-- migration as designed (kickoff docs/kickoffs/v7.0.1110-AGT-695-drain-standing-one-home.md).
-- The two existing bodies are NOT retyped: each is read from the catalog and spliced on one anchor
-- that must be there exactly once (the AGT-483 / AGT-495 form), so a body that has moved is
-- refused, never guessed at.
--
-- THE RULE. Since AGT-495 (v7.0.1036) public.drain_epic_next(uuid) passes a blocked oldest drain
-- and picks from a later queued one. public.prime_directive_queue() -- the only source of pickable
-- work public.runner_should_boot() reads -- and public.file_invention_proposal() still read the
-- single oldest queued drain, so a later drain's member scored below 3 was in no lane and the
-- boot gate could count nothing pickable while the picker would pick. Both now read
-- public.drain_standing(): the first queued drain, oldest first, that has a named member with no
-- pick_exclusions() reason, and the oldest queued drain when none has one (what both read before).
--
-- WHAT CHANGES
--   1. public.drain_standing()            NEW, STABLE, write-free. The one home.
--   2. public.drain_standing_probe(uuid)  NEW. Measures three arms on rolled-back fixtures.
--   3. public.prime_directive_queue()     1 splice: its `drain` CTE reads (1).
--   4. public.file_invention_proposal(uuid, text, jsonb)  1 splice: its epic read, and the
--      comment above it, become (1).
-- NOT TOUCHED: public.drain_epic_next(uuid) (it writes, so no read can call it; the probe proves
-- the two agree), public.pick_exclusions() (AGT-456's exclusive hold stands -- a member of a
-- NON-exclusive drain behind an exclusive one stays out of the queue, as John's rule says),
-- public.runner_should_boot(), public.drain_chain_gate(uuid), every table and row.
--
-- DOWN: public.capture_migration_down(<cycle>, 'agt695_drain_standing', the four identities)
-- before the apply; the down restores the two prior bodies and drops the two new functions.
-- Guard: tests/regression/agt-695-drain-standing.test.mjs. Governing: docs/ARCHITECTURE.md section 19v.
--
-- ---- THE MIGRATION, VERBATIM ---
-- S: THE ONE HOME. One row while a drain-epic directive is queued, none otherwise.
--   directive_id / epic_id / epic_name  the drain the pick is on
--   passed                              queued drains ahead of it that hand no member over
--   oldest_directive_id / oldest_epic_name  the oldest queued drain (the same row when passed = 0)
-- `picks` is lane (b)'s own test -- a named member with no pick_exclusions() reason -- so the queue
-- and this function cannot disagree about a member. A drain with no named member stops the read
-- there, as `unscoped` stops drain_epic_next(). The epics join is INNER, as the CTE it replaces.
CREATE FUNCTION public.drain_standing()
RETURNS TABLE(directive_id uuid, epic_id uuid, epic_name text, passed integer,
              oldest_directive_id uuid, oldest_epic_name text)
LANGUAGE sql
STABLE
AS $fn$
WITH q AS (
  SELECT d.id, d.epic_id, e.name,
         row_number() OVER (ORDER BY d.created_at, d.id)::int AS rn,
         NOT EXISTS (SELECT 1 FROM public.runner_drain_scope s WHERE s.directive_id = d.id) AS unscoped,
         EXISTS (SELECT 1
                   FROM public.runner_drain_scope s
                   JOIN public.pick_exclusions() x ON x.id = s.item_id
                  WHERE s.directive_id = d.id
                    AND x.reasons = '{}'::text[]) AS picks
    FROM public.runner_directives d
    JOIN public.epics e ON e.id = d.epic_id
   WHERE d.type = 'drain-epic' AND d.status = 'queued'
)
SELECT c.id, c.epic_id, c.name, c.rn - 1, o.id, o.name
  FROM q c
  JOIN q o ON o.rn = 1
 WHERE c.rn = COALESCE(
         (SELECT min(p.rn) FROM q p
           WHERE p.picks
             AND p.rn < COALESCE((SELECT min(u.rn) FROM q u WHERE u.unscoped), 2147483647)),
         1);
$fn$;

COMMENT ON FUNCTION public.drain_standing() IS
  'AGT-695: which queued drain-epic directive the pick is on -- the one read-only home. The first queued drain, oldest first, with a named member that carries no pick_exclusions() reason; the oldest queued drain when none has one; no row when none is queued. Read by prime_directive_queue(), file_invention_proposal() and the briefing pages. drain_epic_next(uuid) writes and is never called from a read; public.drain_standing_probe(uuid) proves the two agree.';

-- P: the probe. It MEASURES and never asserts (the AGT-495 blocked_drain_probe form): fixture
-- drains dated before every real one, three fixture tickets, every write inside one sub-block
-- that ends in sentinel P0695, so all of it is rolled back.
--   arm 1  B (2020-01-02) alone, naming W: open, workable, scored 2 -- BELOW 3, the ticket's hole.
--   arm 2  A (2020-01-01) added ahead of B, naming U: open, blocked_by X (open, named nowhere).
--   arm 3  W blocked_by X as well: no fixture drain hands a member over.
-- The fixture drains are exclusive = true (the column default, and all 12 real drains): the rows
-- never commit, so they hold AGT-456's clause over nothing a reader outside this call can see,
-- and W is then listable whatever real drain is queued.
CREATE FUNCTION public.drain_standing_probe(p_cycle_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
AS $fn$
declare
  v_cycle uuid;
  v_epic  uuid;
  v_u uuid; v_x uuid; v_w uuid;
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_real int;
  v_st1 text; v_ps1 int; v_n1 int; v_w1 boolean; v_out1 text; v_dir1 uuid; v_pick1 text;
  v_st2 text; v_ps2 int; v_n2 int; v_w2 boolean; v_out2 text; v_dir2 uuid; v_pick2 text; v_boot2 int;
  v_st3 text; v_ps3 int; v_n3 int; v_w3 boolean; v_out3 text; v_dir3 uuid;
  v_items int; v_dirs int; v_scope int;
begin
  -- drain_epic_next() refuses a NULL cycle; a caller with none of its own gets the newest.
  v_cycle := coalesce(p_cycle_id, (select id from public.runner_cycles order by started_at desc limit 1));
  if v_cycle is null then
    raise exception 'drain_standing_probe: no cycle id passed and public.runner_cycles is empty';
  end if;

  select count(*)::int into v_real
    from public.runner_directives where type = 'drain-epic' and status = 'queued';

  -- the epic blocked_drain_probe() stands its fixtures in: its project executes (SES-340) and it
  -- holds no unresolved milestone design gate (M5-09).
  select e.id into v_epic
    from public.epics e
   where public.epic_project_executing(e.id)
     and not exists (select 1 from public.backlog_items g
                      where g.epic_id = e.id and g.title ilike 'M_ design gate%' and g.status <> 'done')
   order by (e.id = 'ced3a7d0-5382-47f2-9163-ad21c176de6b') desc, e.id
   limit 1;
  if v_epic is null then
    raise exception 'drain_standing_probe: no epic of an executing project is free of an unresolved design gate -- the probe has nowhere to stand a workable member';
  end if;

  begin
    insert into public.backlog_items
      (backlog_id, tier, title, status, source_file, row_ordinal, epic_id,
       scope_origin, need_score, queue, filed_at, size_stamp)
    values
      ('ZFIX-69501','later','Probe fixture U -- open and waiting on X, the one member of drain A','open','agt695-probe',1,v_epic,'john-named',2,999971,'2026-08-01','S'),
      ('ZFIX-69502','later','Probe fixture X -- the open blocker, named in no drain','open','agt695-probe',2,v_epic,'john-named',2,999972,'2026-08-01','S'),
      ('ZFIX-69503','later','Probe fixture W -- open, workable and scored 2, the one member of drain B','open','agt695-probe',3,v_epic,'john-named',2,999973,'2026-08-01','S');
    select id into v_u from public.backlog_items where backlog_id = 'ZFIX-69501';
    select id into v_x from public.backlog_items where backlog_id = 'ZFIX-69502';
    select id into v_w from public.backlog_items where backlog_id = 'ZFIX-69503';
    update public.backlog_items set blocked_by = v_x where id = v_u;

    -- ARM 1: one healthy drain. Every reader names B, as every reader did before AGT-695.
    insert into public.runner_directives (id, type, status, epic_id, exclusive, body, created_at)
    values (v_b, 'drain-epic', 'queued', v_epic, true,
            'AGT-695 PROBE FIXTURE drain B (workable, dated 2020-01-02). Rolled back by sentinel P0695.', '2020-01-02');
    insert into public.runner_drain_scope (directive_id, item_id, backlog_id) values (v_b, v_w, 'ZFIX-69503');
    select case when s.directive_id = v_a then 'A' when s.directive_id = v_b then 'B' else 'other' end, s.passed
      into v_st1, v_ps1 from public.drain_standing() s;
    select count(*) filter (where q.lane in ('drain', 'selfbuild'))::int,
           coalesce(bool_or(q.lane = 'drain' and q.ref = 'ZFIX-69503'), false)
      into v_n1, v_w1 from public.prime_directive_queue() q;
    select q.outcome, q.directive_id, q.backlog_id into v_out1, v_dir1, v_pick1
      from public.drain_epic_next(v_cycle) q;

    -- ARM 2: a blocked drain stands ahead of B. The picker passes it; the queue must list W still.
    insert into public.runner_directives (id, type, status, epic_id, exclusive, body, created_at)
    values (v_a, 'drain-epic', 'queued', v_epic, true,
            'AGT-695 PROBE FIXTURE drain A (blocked, dated 2020-01-01). Rolled back by sentinel P0695.', '2020-01-01');
    insert into public.runner_drain_scope (directive_id, item_id, backlog_id) values (v_a, v_u, 'ZFIX-69501');
    select case when s.directive_id = v_a then 'A' when s.directive_id = v_b then 'B' else 'other' end, s.passed
      into v_st2, v_ps2 from public.drain_standing() s;
    select count(*) filter (where q.lane in ('drain', 'selfbuild'))::int,
           coalesce(bool_or(q.lane = 'drain' and q.ref = 'ZFIX-69503'), false)
      into v_n2, v_w2 from public.prime_directive_queue() q;
    select (r.detail ->> 'pickable_count')::int into v_boot2 from public.runner_should_boot() r;
    select q.outcome, q.directive_id, q.backlog_id into v_out2, v_dir2, v_pick2
      from public.drain_epic_next(v_cycle) q;

    -- ARM 3: B is blocked too. Nothing hands a member over; the oldest drain answers, as before.
    update public.backlog_items set blocked_by = v_x where id = v_w;
    select case when s.directive_id = v_a then 'A' when s.directive_id = v_b then 'B' else 'other' end, s.passed
      into v_st3, v_ps3 from public.drain_standing() s;
    select count(*) filter (where q.lane in ('drain', 'selfbuild'))::int,
           coalesce(bool_or(q.lane = 'drain' and q.ref = 'ZFIX-69503'), false)
      into v_n3, v_w3 from public.prime_directive_queue() q;
    select q.outcome, q.directive_id into v_out3, v_dir3
      from public.drain_epic_next(v_cycle) q;

    raise exception sqlstate 'P0695' using message = 'AGT-695 probe: fixtures measured, rolling them back';
  exception when sqlstate 'P0695' then
    null;   -- every write above is undone; the measurements survive in the variables
  end;

  -- the residue, read AFTER the sentinel.
  select count(*)::int into v_items from public.backlog_items     where source_file = 'agt695-probe';
  select count(*)::int into v_dirs  from public.runner_directives where body like 'AGT-695 PROBE FIXTURE%';
  select count(*)::int into v_scope from public.runner_drain_scope where directive_id in (v_a, v_b);

  return jsonb_build_object(
    'standing1', v_st1, 'passed1', v_ps1, 'pickable1', v_n1, 'w_listed1', v_w1,
    'picker1', v_out1, 'picker_dir1', case when v_dir1 = v_a then 'A' when v_dir1 = v_b then 'B' when v_dir1 is null then null else 'other' end, 'pick1', v_pick1,
    'standing2', v_st2, 'passed2', v_ps2, 'pickable2', v_n2, 'w_listed2', v_w2, 'boot_pickable2', v_boot2,
    'picker2', v_out2, 'picker_dir2', case when v_dir2 = v_a then 'A' when v_dir2 = v_b then 'B' when v_dir2 is null then null else 'other' end, 'pick2', v_pick2,
    'standing3', v_st3, 'passed3', v_ps3, 'pickable3', v_n3, 'w_listed3', v_w3,
    'picker3', v_out3, 'picker_dir3', case when v_dir3 = v_a then 'A' when v_dir3 = v_b then 'B' when v_dir3 is null then null else 'other' end,
    'real_queued', v_real,
    'residue', jsonb_build_object('items', v_items, 'directives', v_dirs, 'scope', v_scope),
    'queue_reads_home', strpos(pg_get_functiondef('public.prime_directive_queue()'::regprocedure), 'public.drain_standing()') > 0,
    'filer_reads_home', strpos(pg_get_functiondef('public.file_invention_proposal(uuid,text,jsonb)'::regprocedure), 'public.drain_standing()') > 0,
    'cycle_id', v_cycle);
end
$fn$;

-- pg_default_acl grants EXECUTE to anon, authenticated and service_role BY NAME the instant a
-- function is created; a PUBLIC-only revoke leaves them standing (.claude/rules/supabase-column-grants.md,
-- SES-315). Revoke the three by name; the closing gate asserts both directions.
REVOKE ALL ON FUNCTION public.drain_standing() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.drain_standing() TO service_role;
REVOKE ALL ON FUNCTION public.drain_standing_probe(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.drain_standing_probe(uuid) TO service_role;

-- THE SPLICES, between two readings of the same probe and the same queue.
DO $splice$
declare
  j        jsonb;
  r        record;
  v_def    text;
  v_occ    int;
  v_before text;
  v_after  text;
  v_passed int;
begin
  -- BEFORE: the defect, reproduced on the live bodies, or nothing is applied.
  j := public.drain_standing_probe();
  if (j->>'queue_reads_home')::boolean or (j->>'filer_reads_home')::boolean then
    raise exception 'AGT-695 PREMISE DEAD ON LIVE: a reader already reads public.drain_standing(). Nothing applied. Probe: %', j;
  end if;
  if (j->>'w_listed2')::boolean then
    raise exception 'AGT-695 PREMISE DEAD ON LIVE: prime_directive_queue() already lists the later drain''s member behind a blocked drain. Nothing applied. Probe: %', j;
  end if;
  if not ((j->>'standing1') = 'B' and (j->>'w_listed1')::boolean
          and (j->>'standing2') = 'B' and (j->>'passed2')::int = 1
          and (j->>'picker2') = 'pick' and (j->>'picker_dir2') = 'B' and (j->>'pick2') = 'ZFIX-69503'
          and (j->>'pickable2')::int = (j->>'pickable1')::int - 1
          -- arm 3 is read only while no real drain is queued: one that picks would answer it.
          and ((j->>'real_queued')::int > 0
               or ((j->>'standing3') = 'A' and (j->>'passed3')::int = 0
                   and (j->>'picker3') = 'blocked' and (j->>'picker_dir3') = 'A'))) then
    raise exception 'AGT-695 BEFORE: the probe does not read the defect as designed (queue one short in arm 2 while the picker picks from B and drain_standing() names B). Nothing applied. Probe: %', j;
  end if;

  select md5(coalesce(string_agg(q::text, '|' order by q.pos nulls last, q.lane, q.ref), '')) into v_before
    from public.prime_directive_queue() q;

  for r in
    select * from (values
      ('public.prime_directive_queue()',
$a$  SELECT d.id AS directive_id, e.name AS epic_name
    FROM public.runner_directives d
    JOIN public.epics e ON e.id = d.epic_id
   WHERE d.type = 'drain-epic' AND d.status = 'queued'
   ORDER BY d.created_at
   LIMIT 1
$a$,
$a$  -- AGT-695: the drain the pick is on, from its one home -- no longer the oldest queued drain only.
  SELECT s.directive_id, s.epic_name
    FROM public.drain_standing() s
$a$),
      ('public.file_invention_proposal(uuid,text,jsonb)',
$a$    -- THE STANDING DRAIN'S EPIC, READ FROM runner_directives -- never a hardcoded epic name, so
    -- this keeps working unchanged when the drain succeeds to M8 and beyond (drain_epic_next()'s
    -- own read, SES-310).
    select d.epic_id into v_epic_id
      from public.runner_directives d
     where d.type = 'drain-epic' and d.status = 'queued'
     order by d.created_at
     limit 1;
$a$,
$a$    -- THE EPIC OF THE DRAIN THE PICK IS ON, READ FROM ITS ONE HOME public.drain_standing() --
    -- never a hardcoded epic name, and no longer the oldest queued drain only (AGT-695): a
    -- proposal filed while a blocked drain is passed lands where the work is being done.
    select s.epic_id into v_epic_id
      from public.drain_standing() s;
$a$)
    ) as t(ident, from_text, to_text)
  loop
    v_def := pg_get_functiondef(r.ident::regprocedure);
    v_occ := (length(v_def) - length(replace(v_def, r.from_text, ''))) / length(r.from_text);
    if v_occ <> 1 then
      raise exception 'AGT-695 SPLICE: the anchor occurs % time(s) in %, expected exactly 1 -- the body has moved. Nothing applied.', v_occ, r.ident;
    end if;
    execute replace(v_def, r.from_text, r.to_text);
  end loop;

  -- AFTER, on the real board: with no queued drain passed, the queue is what it was, row for row.
  select md5(coalesce(string_agg(q::text, '|' order by q.pos nulls last, q.lane, q.ref), '')) into v_after
    from public.prime_directive_queue() q;
  select s.passed into v_passed from public.drain_standing() s;
  if coalesce(v_passed, 0) = 0 and v_after is distinct from v_before then
    raise exception 'AGT-695 GATE: no queued drain is passed, yet prime_directive_queue() changed across the splice (md5 % -> %). Nothing applied. If a parallel cycle moved the board between the two reads, send the apply again.', v_before, v_after;
  end if;

  -- AFTER, on the fixtures: the later drain''s member is listed and the boot gate counts it.
  j := public.drain_standing_probe();
  if not ((j->>'queue_reads_home')::boolean and (j->>'filer_reads_home')::boolean) then
    raise exception 'AGT-695 GATE: a spliced body does not name public.drain_standing(). Nothing applied. Probe: %', j;
  end if;
  if not ((j->>'standing1') = 'B' and (j->>'passed1')::int = 0 and (j->>'w_listed1')::boolean
          and (j->>'picker1') = 'pick' and (j->>'picker_dir1') = 'B'
          and (j->>'standing2') = 'B' and (j->>'passed2')::int = 1 and (j->>'w_listed2')::boolean
          and (j->>'pickable2')::int = (j->>'pickable1')::int
          and (j->>'boot_pickable2')::int = (j->>'pickable2')::int
          and (j->>'picker2') = 'pick' and (j->>'picker_dir2') = 'B' and (j->>'pick2') = 'ZFIX-69503'
          and not (j->>'w_listed3')::boolean
          and ((j->>'real_queued')::int > 0
               or ((j->>'standing3') = 'A' and (j->>'passed3')::int = 0
                   and (j->>'pickable3')::int = (j->>'pickable1')::int - 1
                   and (j->>'picker3') = 'blocked' and (j->>'picker_dir3') = 'A'))) then
    raise exception 'AGT-695 GATE: after the splice the queue and the picker do not agree arm for arm. Nothing applied. Probe: %', j;
  end if;
  if (j->'residue'->>'items')::int + (j->'residue'->>'directives')::int + (j->'residue'->>'scope')::int <> 0 then
    raise exception 'AGT-695 GATE: probe fixtures were left behind. Nothing applied. Probe: %', j;
  end if;

  -- the committed objects: one overload each, the two new ones closed to the browser's keys.
  for r in
    select p.proname, p.provolatile,
           count(*) over (partition by p.proname)::int as n,
           has_function_privilege('anon', p.oid, 'EXECUTE') as a,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as b,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as c
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
       and p.proname in ('drain_standing', 'drain_standing_probe', 'prime_directive_queue', 'file_invention_proposal')
  loop
    if r.n <> 1 then
      raise exception 'AGT-695 GATE: pg_proc holds % overloads of public.%, expected exactly 1 (.claude/rules/supabase-function-signature.md)', r.n, r.proname;
    end if;
    if r.a or r.b or not r.c then
      raise exception 'AGT-695 GATE: EXECUTE on public.% reads anon=% authenticated=% service_role=%, expected false/false/true (SES-315)', r.proname, r.a, r.b, r.c;
    end if;
    if r.provolatile <> (case when r.proname in ('drain_standing', 'prime_directive_queue') then 's' else 'v' end) then
      raise exception 'AGT-695 GATE: public.% reads volatility %, not the one it must keep', r.proname, r.provolatile;
    end if;
  end loop;
end
$splice$;

NOTIFY pgrst, 'reload schema';
