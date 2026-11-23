-- DeepBench v7.0.1109 | docs/design/agt-167b-noship-one-predicate.sql | AGT-167 stage B of three -- the no-ship streak cap is one clause in public.pick_exclusions(), so lanes (b) and (c) of the queue refuse a held ticket and every reader names why.
--
-- THE MIRROR of migration `agt167b_noship_one_predicate`. Everything below the VERBATIM marker is
-- the migration as designed (kickoff docs/kickoffs/v7.0.1109-AGT-167-noship-staged.md, redesign
-- attempt 1). The two bodies are NOT retyped: each is read from the catalog and spliced on anchors
-- that must be there exactly once (the AGT-483 / AGT-495 form), so a body that has moved is refused.
--
-- NEEDS STAGE A (`agt167a_noship_one_home`): the clause reads public.noship_streaks().
--
-- THE RULE (the ticket's governing fact). A ticket the runner has cycled at least
-- runner_settings.chain_max_noship_streak times since its last ship must leave the pickable set and
-- get a ruling, not another cycle. Until this stage only lane (c) `selfbuild` of
-- public.prime_directive_queue() read the streak, and no surface said why a held ticket was held.
--
-- WHAT CHANGES
--   1. public.pick_exclusions()        2 splices: a LEFT JOIN on public.noship_streaks() and one
--                                      reason clause, for open and partial rows only.
--   2. public.prime_directive_queue()  2 splices: lane (c) drops its own copy of the fence -- it
--                                      arrives through `buildable`, as it now does for lane (b).
-- NOT TOUCHED: public.drain_epic_next(uuid) (stage C), governance_rules (stage C), the streak rule,
-- runner_settings, every table, every other row. The gate never calls drain_epic_next().
-- NO release lever is added: a held row returns by a ship or a terminal ruling, as in lane (c)
-- since v7.0.642.
--
-- DOWN: public.capture_migration_down(<cycle>, 'agt167b_noship_one_predicate', the two identities)
-- before the apply; the down restores both prior bodies.
-- Guard: tests/regression/agt-167-noship-pick-fence.test.mjs (arms C and D). Governing: docs/ARCHITECTURE.md section 19v.
--
-- ---- THE MIGRATION, VERBATIM ---
-- THE SPLICES. Four anchors over two bodies; each must be there exactly once, stage A must be in,
-- and pick_exclusions() must not already carry the fence, or nothing is applied.
DO $splice$
declare
  r       record;
  v_def   text;
  v_new   text;
  v_occ   int;
  v_ident text := '';
  c_cap constant text := '(SELECT s.chain_max_noship_streak FROM public.runner_settings s WHERE s.id = 1)';
begin
  if to_regprocedure('public.noship_streaks()') is null then
    raise exception 'AGT-167 B ORDER: public.noship_streaks() is not there -- stage A (agt167a_noship_one_home) has not applied. Nothing applied.';
  end if;
  if strpos(pg_get_functiondef('public.pick_exclusions()'::regprocedure), 'noship') > 0 then
    raise exception 'AGT-167 B PREMISE DEAD ON LIVE: pick_exclusions() already reads the no-ship streak. Nothing applied.';
  end if;

  for r in
    select * from (values
      -- pick_exclusions(): the join the clause reads, FIRST -- the clause below names ns.
      (1, 'pick_exclusions()',
$a$  LEFT JOIN public.backlog_items bl ON bl.id = b.blocked_by;$a$,
$a$  LEFT JOIN public.backlog_items bl ON bl.id = b.blocked_by
  -- AGT-167: one pass over runner_cycles for the whole board; no row reads as a streak of 0.
  LEFT JOIN public.noship_streaks() ns ON ns.backlog_id = b.backlog_id;$a$),
      -- pick_exclusions(): the reason clause, last in the array.
      (2, 'pick_exclusions()',
$a$              THEN 'outside the exclusive drain'::text END$a$,
$a$              THEN 'outside the exclusive drain'::text END,
         -- AGT-167 (v7.0.1109): THE NO-SHIP STREAK HOLDS THE PICK IN EVERY LANE. An open or partial
         -- row cycled chain_max_noship_streak times since its last ship is out of the pick and says
         -- so here, so the queue's lanes, project_blockers and every other reader name one reason.
         -- It returns by a ship or a ruling, never by another cycle. drain_epic_next() carries the
         -- same test; public.noship_streaks() is the one home of the count.
         CASE WHEN b.status IN ('open','partial') AND ns.noship >= $a$ || c_cap || $a$
              THEN 'no-ship streak ' || ns.noship || ' has reached the cap of ' || $a$ || c_cap || $a$ || ' - rule it: re-scope, split or remove' END$a$),
      -- prime_directive_queue(): lane (c)'s comment.
      (3, 'prime_directive_queue()',
$a$  -- AGT-173: the noship fence stays HERE. It is this lane's rule, not a property of the ticket, so
  -- pick_exclusions() deliberately carries no clause for it.$a$,
$a$  -- AGT-167 (v7.0.1109): the noship fence left this lane for public.pick_exclusions(), so lanes
  -- (b) and (c) both read it through `buildable` and drain_epic_next() carries the same test.$a$),
      -- prime_directive_queue(): lane (c)'s own copy of the fence.
      (4, 'prime_directive_queue()',
$a$   WHERE public.ticket_noship_cycles(bu.backlog_id) < (SELECT s.chain_max_noship_streak FROM public.runner_settings s WHERE s.id = 1)
     AND bu.need_score >= 3$a$,
$a$   WHERE bu.need_score >= 3$a$)
    ) v(n, ident, splice_from, splice_to)
    order by n
  loop
    v_def := pg_get_functiondef(('public.' || r.ident)::regprocedure);
    v_occ := (length(v_def) - length(replace(v_def, r.splice_from, ''))) / length(r.splice_from);
    if v_occ <> 1 then
      raise exception 'AGT-167 B SPLICE % on %: the anchor [%] occurs % time(s), expected exactly 1', r.n, r.ident, r.splice_from, v_occ;
    end if;
    v_new := replace(v_def, r.splice_from, r.splice_to);
    execute v_new;
    if pg_get_functiondef(('public.' || r.ident)::regprocedure) <> v_new then
      raise exception 'AGT-167 B SPLICE % on %: the body Postgres stored is not the text this migration executed', r.n, r.ident;
    end if;
    v_ident := v_ident || ' ' || r.n || ':' || md5(v_new);
  end loop;
  raise notice 'AGT-167 B SPLICE md5 after each:%', v_ident;
end
$splice$;

-- THE GATE. Both directions on fixtures that are rolled back, or the whole migration rolls back.
-- It reads pick_exclusions() and prime_directive_queue() only; drain_epic_next() is never called.
DO $gate$
declare
  v_cap   int;
  v_epic  uuid;
  v_h uuid; v_u uuid;
  v_d uuid := gen_random_uuid();
  v_real int;
  v_h_reasons text[]; v_u_reasons text[];
  v_h_lanes text; v_u_lanes text;
  v_h_after text[];
  v_items int; v_cycles int; v_dirs int; v_scope int;
  r record;
  v_seen int := 0;
begin
  select s.chain_max_noship_streak into v_cap from public.runner_settings s where s.id = 1;
  if v_cap is null or v_cap < 1 then
    raise exception 'AGT-167 B GATE: runner_settings.chain_max_noship_streak reads %, expected a positive integer', v_cap;
  end if;

  -- A real queued drain changes what the fixtures can show: AGT-456's exclusive hold puts its own
  -- reason on them. The lane the under-cap fixture is offered by is graded only when none is queued.
  select count(*)::int into v_real
    from public.runner_directives where type = 'drain-epic' and status = 'queued';

  select e.id into v_epic
    from public.epics e
   where public.epic_project_executing(e.id)
     and not exists (select 1 from public.backlog_items g
                      where g.epic_id = e.id and g.title ilike 'M_ design gate%' and g.status <> 'done')
   order by (e.id = 'ced3a7d0-5382-47f2-9163-ad21c176de6b') desc, e.id
   limit 1;
  if v_epic is null then
    raise exception 'AGT-167 B GATE: no epic of an executing project is free of an unresolved design gate -- the fixtures have nowhere to stand';
  end if;

  begin
    -- H sits AT the cap; U sits one under it. A fixture drain names both, so lane (b) speaks too.
    insert into public.backlog_items
      (backlog_id, tier, title, status, source_file, row_ordinal, epic_id,
       scope_origin, need_score, queue, filed_at, size_stamp)
    values
      ('ZFIX-16791','later','Gate fixture H -- open, at the no-ship streak cap','open','agt167-gate',1,v_epic,'john-named',4,999971,'2026-08-01','S'),
      ('ZFIX-16792','later','Gate fixture U -- open, one cycle under the cap','open','agt167-gate',2,v_epic,'john-named',4,999972,'2026-08-01','S');
    select id into v_h from public.backlog_items where backlog_id = 'ZFIX-16791';
    select id into v_u from public.backlog_items where backlog_id = 'ZFIX-16792';

    insert into public.runner_cycles (stamp, trigger, item_id, outcome, started_at)
    select 'AGT-167-GATE-FIXTURE', 'scheduled', 'ZFIX-16791', 'failed', '2020-01-01'::timestamptz + g * interval '1 minute'
      from generate_series(1, v_cap) g;
    insert into public.runner_cycles (stamp, trigger, item_id, outcome, started_at)
    select 'AGT-167-GATE-FIXTURE', 'scheduled', 'ZFIX-16792', 'failed', '2020-01-01'::timestamptz + g * interval '1 minute'
      from generate_series(1, v_cap - 1) g;

    insert into public.runner_directives (id, type, status, epic_id, exclusive, body, created_at)
    values (v_d, 'drain-epic', 'queued', v_epic, false,
            'AGT-167 GATE FIXTURE drain (dated 2020-01-01, names H and U). Rolled back by sentinel P0167.', '2020-01-01');
    insert into public.runner_drain_scope (directive_id, item_id, backlog_id)
    values (v_d, v_h, 'ZFIX-16791'), (v_d, v_u, 'ZFIX-16792');

    -- the one predicate
    select array_remove(x.reasons, 'outside the exclusive drain') into v_h_reasons from public.pick_exclusions() x where x.id = v_h;
    select array_remove(x.reasons, 'outside the exclusive drain') into v_u_reasons from public.pick_exclusions() x where x.id = v_u;
    -- both ticket lanes of the queue
    select string_agg(q.lane, ',' order by q.lane) into v_h_lanes from public.prime_directive_queue() q where q.ref = 'ZFIX-16791';
    select string_agg(q.lane, ',' order by q.lane) into v_u_lanes from public.prime_directive_queue() q where q.ref = 'ZFIX-16792';

    -- the way back: a later ship ends H's streak.
    insert into public.runner_cycles (stamp, trigger, item_id, outcome, started_at)
    values ('AGT-167-GATE-FIXTURE', 'scheduled', 'ZFIX-16791', 'shipped', '2020-01-03');
    select array_remove(x.reasons, 'outside the exclusive drain') into v_h_after from public.pick_exclusions() x where x.id = v_h;

    raise exception sqlstate 'P0167' using message = 'AGT-167 gate: fixtures measured, rolling them back';
  exception when sqlstate 'P0167' then
    null;   -- every write above is undone; the measurements survive in the variables
  end;

  raise notice 'AGT-167 B GATE measured: cap % | H reasons % lanes % | U reasons % lanes % | H after a ship % | real queued drains %',
    v_cap, v_h_reasons, v_h_lanes, v_u_reasons, v_u_lanes, v_h_after, v_real;

  -- 1. direction 1, the one predicate: the row AT the cap is out, for exactly this reason.
  if v_h_reasons is distinct from array['no-ship streak ' || v_cap || ' has reached the cap of ' || v_cap || ' - rule it: re-scope, split or remove'] then
    raise exception 'AGT-167 B GATE 1: a fixture at the cap must carry the streak reason and only it, got %', v_h_reasons;
  end if;
  -- 2. direction 2: the row one UNDER the cap carries no reason at all.
  if v_u_reasons is distinct from '{}'::text[] then
    raise exception 'AGT-167 B GATE 2: THE CONTROL FAILED -- a fixture one cycle under the cap must stay pickable, got %', v_u_reasons;
  end if;
  -- 3. both ticket lanes: H in neither -- before this stage lane (b) `drain` offered it; U in both.
  if v_h_lanes is not null then
    raise exception 'AGT-167 B GATE 3: the at-cap fixture is still offered by lane(s) %', v_h_lanes;
  end if;
  if v_real = 0 and v_u_lanes is distinct from 'drain,selfbuild' then
    raise exception 'AGT-167 B GATE 3: the under-cap fixture must be offered by the drain and selfbuild lanes, got %', coalesce(v_u_lanes, '(none)');
  end if;
  -- 4. the way back is a ship.
  if v_h_after is distinct from '{}'::text[] then
    raise exception 'AGT-167 B GATE 4: a ship after the streak must release the row, got %', v_h_after;
  end if;

  -- nothing left behind
  select count(*)::int into v_items  from public.backlog_items    where source_file = 'agt167-gate';
  select count(*)::int into v_cycles from public.runner_cycles    where stamp = 'AGT-167-GATE-FIXTURE';
  select count(*)::int into v_dirs   from public.runner_directives where body like 'AGT-167 GATE FIXTURE%';
  select count(*)::int into v_scope  from public.runner_drain_scope where directive_id = v_d;
  if v_items + v_cycles + v_dirs + v_scope <> 0 then
    raise exception 'AGT-167 B GATE: the sentinel left residue -- % ticket(s), % cycle(s), % directive(s), % scope row(s)', v_items, v_cycles, v_dirs, v_scope;
  end if;

  -- the committed objects: one overload each, closed to the browser's keys, open to service_role.
  for r in
    select p.proname,
           count(*) over (partition by p.proname)::int as n,
           has_function_privilege('anon', p.oid, 'EXECUTE') as a,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as b,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as c
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
       and p.proname in ('pick_exclusions', 'prime_directive_queue')
  loop
    v_seen := v_seen + 1;
    if r.n <> 1 then
      raise exception 'AGT-167 B GATE: pg_proc holds % overloads of public.%, expected exactly 1 (.claude/rules/supabase-function-signature.md)', r.n, r.proname;
    end if;
    if r.a or r.b or not r.c then
      raise exception 'AGT-167 B GATE: EXECUTE on public.% reads anon=% authenticated=% service_role=%, expected false/false/true (SES-315)', r.proname, r.a, r.b, r.c;
    end if;
  end loop;
  if v_seen <> 2 then
    raise exception 'AGT-167 B GATE: expected two functions in pg_proc, saw % row(s)', v_seen;
  end if;
end
$gate$;

NOTIFY pgrst, 'reload schema';
