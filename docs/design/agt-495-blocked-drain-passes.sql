-- DeepBench v7.0.1036 | docs/design/agt-495-blocked-drain-passes.sql | AGT-495 -- a blocked drain passes the pick to the next queued drain and keeps its slot; public.blocked_drain_probe(uuid) proves both directions on rolled-back fixtures, at the apply and on every suite run.
--
-- THE MIRROR of migration `agt495_blocked_drain_passes`. Everything below the VERBATIM marker is
-- the migration as designed (kickoff docs/kickoffs/v7.0.1036-AGT-495-blocked-drain-passes.md).
-- The Designer had no database read: public.drain_epic_next(uuid) is therefore NOT retyped here.
-- It is read from the catalog and spliced on five anchors, each of which must be there exactly
-- once, so a body that has moved since the repo's last record (docs/design/agt-482-claim-stop-fence.sql
-- plus AGT-483's one ORDER BY line) is refused, never guessed at.
--
-- THE RULE (John's pattern 147: go past a blocked item, it keeps its slot). Until this migration
-- the function read the single oldest queued drain-epic directive and RETURNed on `blocked`, so
-- one drain whose members can neither finish nor all be delivered held the pick from every later
-- queued drain. Now a drain read as blocked is passed inside the same call: its row is not
-- written (status stays `queued`, created_at untouched, so it is read first again next call and
-- picks the moment a member frees up), and the mark is the answer itself -- a `pick` handed over
-- from a later drain carries `blocked_detail = 'passed N blocked drain(s) - oldest <epic> (<id8>): <its census>'`.
-- When no later drain picks, the answer is the oldest blocked drain's own `blocked` row, as before.
--
-- NOT TOUCHED: the retirement predicate, the 2026-10-17 delivered exit, the pick predicate, the
-- census sentences, `unscoped` (still stops the scan), public.backlog_done_requires_verdict(),
-- public.pick_exclusions() (AGT-456's exclusive hold over tickets outside every drain stands),
-- public.prime_directive_queue() (its `drain` CTE still reads the oldest queued drain only --
-- filed as a finding by this ship, see the kickoff's STOP LINE). The sweep half is AGT-590.
--
-- DOWN: public.capture_migration_down(<cycle>, 'agt495_blocked_drain_passes', the two identities)
-- before the apply; the down restores drain_epic_next's prior body and drops the probe.
-- Guard: tests/regression/agt-495-blocked-drain-passes.test.mjs. Governing: docs/ARCHITECTURE.md section 19v.
--
-- ---- THE MIGRATION, VERBATIM ---
-- F: the probe. It MEASURES and never asserts (the AGT-483 parent_score_probe form): three
-- fixture drains dated before every real one, three fixture tickets, three calls of
-- drain_epic_next(), all inside one sub-block that ends in sentinel P0495, so every write --
-- including the retirement of fixture drain H and its before-image -- is rolled back.
--   A (2020-01-01) names U: open, blocked_by X (open, named nowhere) -> A can neither retire nor pick.
--   B (2020-01-02) names W: open and workable.
--   H (2019-12-31, added before call 3) names one REAL ticket that is already done/removed and
--     sits in no drain scope -> H is at its finish line. The real ticket is only read.
-- All three drains are exclusive = false: drain_epic_next() never reads that column, and a
-- fixture must not hold AGT-456's exclusive clause over anything.
CREATE FUNCTION public.blocked_drain_probe(p_cycle_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
AS $fn$
declare
  v_cycle uuid;
  v_epic  uuid;
  v_fin   uuid;
  v_fin_id text;
  v_u uuid; v_x uuid; v_w uuid;
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_h uuid := gen_random_uuid();
  v_real int;
  v_out1 text; v_dir1 uuid; v_pick1 text; v_mark1 text; v_a_st1 text; v_b_st1 text; v_a_slot boolean;
  v_out2 text; v_dir2 uuid; v_det2 text;
  v_out3 text; v_h_st3 text; v_h_cyc boolean; v_h_img int; v_a_st3 text; v_b_st3 text;
  v_items int; v_dirs int; v_scope int; v_imgs int;
begin
  -- runner_before_images.cycle_id is an FK to runner_cycles(id), so drain_epic_next() needs a
  -- cycle that really exists; a caller with none of its own (the regression suite) gets the newest.
  v_cycle := coalesce(p_cycle_id, (select id from public.runner_cycles order by started_at desc limit 1));
  if v_cycle is null then
    raise exception 'blocked_drain_probe: no cycle id passed and public.runner_cycles is empty';
  end if;

  select count(*)::int into v_real
    from public.runner_directives where type = 'drain-epic' and status = 'queued';

  -- an epic the pick predicate will accept a member of: its project executes (SES-340) and it
  -- holds no unresolved milestone design gate (M5-09), which would block W for a reason that is
  -- not this probe's subject.
  select e.id into v_epic
    from public.epics e
   where public.epic_project_executing(e.id)
     and not exists (select 1 from public.backlog_items g
                      where g.epic_id = e.id and g.title ilike 'M_ design gate%' and g.status <> 'done')
   -- Tooling first: the epic parent_score_probe() stands its own fixtures in, so the shape is proven there.
   order by (e.id = 'ced3a7d0-5382-47f2-9163-ad21c176de6b') desc, e.id
   limit 1;
  if v_epic is null then
    raise exception 'blocked_drain_probe: no epic of an executing project is free of an unresolved design gate -- the probe has nowhere to stand a workable member';
  end if;

  select b.id, b.backlog_id into v_fin, v_fin_id
    from public.backlog_items b
   where b.status in ('done', 'removed')
     and not exists (select 1 from public.runner_drain_scope s where s.item_id = b.id)
   order by b.id
   limit 1;
  if v_fin is null then
    raise exception 'blocked_drain_probe: no done/removed ticket outside every drain scope -- fixture drain H has no finished member to name';
  end if;

  begin
    insert into public.backlog_items
      (backlog_id, tier, title, status, source_file, row_ordinal, epic_id,
       scope_origin, need_score, queue, filed_at, size_stamp)
    values
      ('ZFIX-49501','later','Probe fixture U -- open and waiting on X, so drain A can neither retire nor pick','open','agt495-probe',1,v_epic,'john-named',4,999981,'2026-08-01','S'),
      ('ZFIX-49502','later','Probe fixture X -- the open blocker, named in no drain','open','agt495-probe',2,v_epic,'john-named',4,999982,'2026-08-01','S'),
      ('ZFIX-49503','later','Probe fixture W -- open and workable, the one member of drain B','open','agt495-probe',3,v_epic,'john-named',4,999983,'2026-08-01','S');
    select id into v_u from public.backlog_items where backlog_id = 'ZFIX-49501';
    select id into v_x from public.backlog_items where backlog_id = 'ZFIX-49502';
    select id into v_w from public.backlog_items where backlog_id = 'ZFIX-49503';
    update public.backlog_items set blocked_by = v_x where id = v_u;

    insert into public.runner_directives (id, type, status, epic_id, exclusive, body, created_at)
    values (v_a, 'drain-epic', 'queued', v_epic, false,
            'AGT-495 PROBE FIXTURE drain A (blocked, dated 2020-01-01). Rolled back by sentinel P0495.', '2020-01-01'),
           (v_b, 'drain-epic', 'queued', v_epic, false,
            'AGT-495 PROBE FIXTURE drain B (workable, dated 2020-01-02). Rolled back by sentinel P0495.', '2020-01-02');
    insert into public.runner_drain_scope (directive_id, item_id, backlog_id)
    values (v_a, v_u, 'ZFIX-49501'),
           (v_b, v_w, 'ZFIX-49503');

    -- CALL 1, direction 1: A is blocked, B behind it has work.
    select q.outcome, q.directive_id, q.backlog_id, q.blocked_detail
      into v_out1, v_dir1, v_pick1, v_mark1
      from public.drain_epic_next(v_cycle) q;
    select d.status, (d.created_at = '2020-01-01'::timestamptz) into v_a_st1, v_a_slot
      from public.runner_directives d where d.id = v_a;
    select d.status into v_b_st1 from public.runner_directives d where d.id = v_b;

    -- CALL 2: B is blocked too, so no fixture drain picks -- the oldest blocked drain answers.
    update public.backlog_items set blocked_by = v_x where id = v_w;
    select q.outcome, q.directive_id, q.blocked_detail
      into v_out2, v_dir2, v_det2
      from public.drain_epic_next(v_cycle) q;

    -- CALL 3, direction 2: H, the oldest of all, is at its finish line; A and B are not.
    insert into public.runner_directives (id, type, status, epic_id, exclusive, body, created_at)
    values (v_h, 'drain-epic', 'queued', v_epic, false,
            'AGT-495 PROBE FIXTURE drain H (at its finish line, dated 2019-12-31). Rolled back by sentinel P0495.', '2019-12-31');
    insert into public.runner_drain_scope (directive_id, item_id, backlog_id)
    values (v_h, v_fin, v_fin_id);
    select q.outcome into v_out3 from public.drain_epic_next(v_cycle) q;
    select d.status, (d.acted_cycle = v_cycle) into v_h_st3, v_h_cyc
      from public.runner_directives d where d.id = v_h;
    select count(*)::int into v_h_img
      from public.runner_before_images i
     where i.cycle_id = v_cycle and i.table_name = 'runner_directives' and i.pk_value = v_h::text;
    select d.status into v_a_st3 from public.runner_directives d where d.id = v_a;
    select d.status into v_b_st3 from public.runner_directives d where d.id = v_b;

    raise exception sqlstate 'P0495' using message = 'AGT-495 probe: fixtures measured, rolling them back';
  exception when sqlstate 'P0495' then
    null;   -- every write above is undone; the measurements survive in the variables
  end;

  -- the residue, read AFTER the sentinel.
  select count(*)::int into v_items from public.backlog_items    where source_file = 'agt495-probe';
  select count(*)::int into v_dirs  from public.runner_directives where body like 'AGT-495 PROBE FIXTURE%';
  select count(*)::int into v_scope from public.runner_drain_scope where directive_id in (v_a, v_b, v_h);
  select count(*)::int into v_imgs  from public.runner_before_images
   where table_name = 'runner_directives' and pk_value in (v_a::text, v_b::text, v_h::text);

  return jsonb_build_object(
    'out1', v_out1,
    'dir1', case when v_dir1 = v_a then 'A' when v_dir1 = v_b then 'B' when v_dir1 = v_h then 'H' when v_dir1 is null then null else 'other' end,
    'pick1', v_pick1,
    'mark1', v_mark1,
    'a_status1', v_a_st1,
    'b_status1', v_b_st1,
    'a_slot_kept', v_a_slot,
    'out2', v_out2,
    'dir2', case when v_dir2 = v_a then 'A' when v_dir2 = v_b then 'B' when v_dir2 = v_h then 'H' when v_dir2 is null then null else 'other' end,
    'detail2', v_det2,
    'out3', v_out3,
    'h_status3', v_h_st3,
    'h_acted_by_cycle', v_h_cyc,
    'h_before_images', v_h_img,
    'a_status3', v_a_st3,
    'b_status3', v_b_st3,
    'real_queued', v_real,
    'finished_member', v_fin_id,
    'residue', jsonb_build_object('items', v_items, 'directives', v_dirs, 'scope', v_scope, 'images', v_imgs),
    'fn_md5', md5(pg_get_functiondef('public.drain_epic_next(uuid)'::regprocedure)),
    'cycle_id', v_cycle);
end
$fn$;

-- pg_default_acl grants EXECUTE to anon, authenticated and service_role BY NAME the instant a
-- function is created; a PUBLIC-only revoke leaves them standing (.claude/rules/supabase-column-grants.md,
-- SES-315). Revoke the three by name; the closing gate asserts both directions.
REVOKE ALL ON FUNCTION public.blocked_drain_probe(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.blocked_drain_probe(uuid) TO service_role;

-- BEFORE: the defect, reproduced on the live body, or nothing is applied. Call 1 must answer
-- `blocked` for A while B has work -- the 2026-10-13 probe's reading. If it already answers a
-- pick from B the premise is dead on live and this migration must not ship.
DO $before$
declare
  j jsonb;
begin
  j := public.blocked_drain_probe('14fe865e-4b1c-4443-b9e0-248ff8a57816');
  if (j->>'out1') = 'pick' and (j->>'dir1') = 'B' then
    raise exception 'AGT-495 PREMISE DEAD ON LIVE: drain_epic_next() already passes a blocked drain to the next queued one. Nothing applied. Probe: %', j;
  end if;
  if ((j->>'out1') = 'blocked' and (j->>'dir1') = 'A'
      and (j->>'out2') = 'blocked' and (j->>'dir2') = 'A'
      and (j->>'h_status3') = 'done' and (j->>'a_status3') = 'queued' and (j->>'b_status3') = 'queued'
      and (j->'residue') = '{"items": 0, "directives": 0, "scope": 0, "images": 0}'::jsonb) is not true then
    raise exception 'AGT-495 BEFORE: the probe did not reproduce the defect cleanly on the unchanged body (want out1 blocked/A, out2 blocked/A, H done, A and B queued, residue 0). Nothing applied. Probe: %', j;
  end if;
end
$before$;

-- THE SPLICE. Five anchors in the live body, each exactly once; anything else RAISEs and the
-- whole migration, the probe included, rolls back.
DO $splice$
declare
  v_def   text;
  v_new   text;
  v_after text;
  v_occ   int;
  i       int;
  c_re constant text := $re$RETURN QUERY SELECT d\.id, d\.epic_id, v_name, NULL::text, NULL::integer, v_open_now,\s+'blocked'::text, v_detail;\s+RETURN;$re$;
  v_from text[] := ARRAY[
    $a$  v_detail        text;$a$,
    $a$WHERE type = 'drain-epic' AND status = 'queued'$a$,
    $a$IF v_retired_n > 0 THEN$a$,
    $a$v_pick, v_queue, v_open_now, 'pick'::text, NULL::text;$a$
  ];
  v_to text[] := ARRAY[
$a$  v_detail        text;
  -- AGT-495 (v7.0.1036). A BLOCKED DRAIN PASSES THE PICK AND KEEPS ITS SLOT. A drain read as
  -- `blocked` is no longer the end of the scan: it is remembered here, left exactly as it was
  -- (status `queued`, created_at untouched -- it is read first again on the next call and picks
  -- the moment a member frees up), and the next queued drain is read. The mark is the answer: a
  -- pick handed over from a later drain names what it passed in blocked_detail, and when no later
  -- drain picks, the OLDEST blocked drain's own `blocked` row is returned, as it always was.
  -- Retirement, the delivered exit and the pick predicate are untouched; `unscoped` still stops.
  v_passed     uuid[]  := '{}';   -- drains read as blocked in THIS call
  v_blk_n      integer := 0;
  v_blk_id     uuid;
  v_blk_epic   uuid;
  v_blk_name   text;
  v_blk_open   integer;
  v_blk_detail text;$a$,
$a$WHERE type = 'drain-epic' AND status = 'queued'
       AND id <> ALL (v_passed) -- AGT-495: a drain already read as blocked in this call is passed$a$,
$a$IF v_blk_n > 0 THEN
        -- AGT-495: every queued drain behind the blocked one was read and none picks. The oldest
        -- blocked drain answers, with its own census -- never a silent empty (SES-196).
        RETURN QUERY SELECT v_blk_id, v_blk_epic, v_blk_name, NULL::text, NULL::integer, v_blk_open,
                            'blocked'::text,
                            v_blk_detail || CASE WHEN v_blk_n > 1
                              THEN format('; %s later queued drain(s) also blocked', v_blk_n - 1) ELSE '' END;
      ELSIF v_retired_n > 0 THEN$a$,
$a$v_pick, v_queue, v_open_now, 'pick'::text,
                        -- AGT-495: the mark. NULL unless this pick was handed past a blocked drain.
                        CASE WHEN v_blk_n > 0
                             THEN format('passed %s blocked drain(s) - oldest %s (%s): %s',
                                         v_blk_n, COALESCE(v_blk_name, '?'), left(v_blk_id::text, 8), v_blk_detail) END;$a$
  ];
  c_blk constant text :=
$a$-- AGT-495: was `RETURN QUERY ... 'blocked'; RETURN;`. Pass it: remember the oldest, keep its
      -- row untouched, read the next queued drain.
      v_passed := v_passed || d.id;
      v_blk_n  := v_blk_n + 1;
      IF v_blk_n = 1 THEN
        v_blk_id := d.id; v_blk_epic := d.epic_id; v_blk_name := v_name;
        v_blk_open := v_open_now; v_blk_detail := v_detail;
      END IF;
      CONTINUE;$a$;
begin
  v_def := pg_get_functiondef('public.drain_epic_next(uuid)'::regprocedure);
  if strpos(v_def, 'v_passed') > 0 then
    raise exception 'AGT-495 SPLICE: the live body already holds v_passed -- this migration, or its rule, is already applied';
  end if;
  v_new := v_def;

  for i in 1 .. array_length(v_from, 1) loop
    v_occ := (length(v_new) - length(replace(v_new, v_from[i], ''))) / length(v_from[i]);
    if v_occ <> 1 then
      raise exception 'AGT-495 SPLICE: anchor % [%] occurs % time(s) in the live body, expected exactly 1 -- the body is not the one the repo records. Nothing applied.', i, v_from[i], v_occ;
    end if;
    v_new := replace(v_new, v_from[i], v_to[i]);
  end loop;

  select count(*)::int into v_occ from regexp_matches(v_new, c_re, 'g');
  if v_occ <> 1 then
    raise exception 'AGT-495 SPLICE: the blocked branch''s RETURN occurs % time(s) in the live body, expected exactly 1. Nothing applied.', v_occ;
  end if;
  v_new := regexp_replace(v_new, c_re, c_blk);

  if strpos(v_new, $a$'blocked'::text, v_detail;$a$) > 0 or strpos(v_new, 'CONTINUE;') = 0 then
    raise exception 'AGT-495 SPLICE: the spliced text still returns on blocked';
  end if;

  execute v_new;

  v_after := pg_get_functiondef('public.drain_epic_next(uuid)'::regprocedure);
  if v_after <> v_new then
    raise exception 'AGT-495 SPLICE: the body Postgres stored is not the text this migration executed';
  end if;
  raise notice 'AGT-495 SPLICE drain_epic_next(uuid): md5 % (% bytes) -> % (% bytes)', md5(v_def), length(v_def), md5(v_after), length(v_after);
end
$splice$;

-- AFTER: the same probe, both directions, or the whole migration rolls back.
DO $gate$
declare
  j jsonb;
  r record;
  v_seen int := 0;
begin
  j := public.blocked_drain_probe('14fe865e-4b1c-4443-b9e0-248ff8a57816');
  raise notice 'AGT-495 PROBE AFTER returned %', j;

  -- direction 1: the blocked drain releases the pick and the next queued drain IS reached.
  if ((j->>'out1') = 'pick' and (j->>'dir1') = 'B' and (j->>'pick1') = 'ZFIX-49503') is not true then
    raise exception 'AGT-495 GATE 1: THE WHOLE TICKET -- with drain A blocked, call 1 must pick ZFIX-49503 from drain B. Probe: %', j;
  end if;
  if ((j->>'mark1') like 'passed 1 blocked drain(s) - oldest %') is not true then
    raise exception 'AGT-495 GATE 1: the pick handed past drain A must carry the mark in blocked_detail. Probe: %', j;
  end if;
  -- the slot: A is not written. Still queued, still dated where it was.
  if ((j->>'a_status1') = 'queued' and (j->>'a_slot_kept')::boolean and (j->>'a_status3') = 'queued') is not true then
    raise exception 'AGT-495 GATE 1: the passed drain must keep its slot -- status queued, created_at untouched. Probe: %', j;
  end if;
  -- nothing later picks: the oldest blocked drain answers. Graded only when no real drain is queued.
  if (j->>'real_queued')::int = 0
     and ((j->>'out2') = 'blocked' and (j->>'dir2') = 'A'
          and (j->>'detail2') like '%; 1 later queued drain(s) also blocked') is not true then
    raise exception 'AGT-495 GATE 1: with every fixture drain blocked and no real drain queued, call 2 must answer blocked for A, the oldest. Probe: %', j;
  end if;
  -- direction 2: a healthy drain retires only on its own finish line.
  if ((j->>'h_status3') = 'done' and (j->>'h_acted_by_cycle')::boolean and (j->>'h_before_images')::int = 1) is not true then
    raise exception 'AGT-495 GATE 2: drain H, at its finish line, must still retire -- status done, acted_cycle stamped, one before-image. Probe: %', j;
  end if;
  if ((j->>'b_status1') = 'queued' and (j->>'b_status3') = 'queued' and (j->>'a_status3') = 'queued') is not true then
    raise exception 'AGT-495 GATE 2: a drain short of its finish line must never retire -- B after it was picked from, A and B after H retired. Probe: %', j;
  end if;
  if (j->'residue') is distinct from '{"items": 0, "directives": 0, "scope": 0, "images": 0}'::jsonb then
    raise exception 'AGT-495 GATE: the sentinel left fixture rows behind. Probe: %', j;
  end if;

  -- the committed objects: one overload each, closed to the browser's keys, open to service_role.
  for r in
    select p.proname, p.provolatile,
           count(*) over (partition by p.proname)::int as n,
           has_function_privilege('anon', p.oid, 'EXECUTE') as a,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as b,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as c
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
       and p.proname in ('drain_epic_next', 'blocked_drain_probe')
  loop
    v_seen := v_seen + 1;
    if r.n <> 1 then
      raise exception 'AGT-495 GATE: pg_proc holds % overloads of public.%, expected exactly 1 (.claude/rules/supabase-function-signature.md)', r.n, r.proname;
    end if;
    if r.a or r.b or not r.c then
      raise exception 'AGT-495 GATE: EXECUTE on public.% reads anon=% authenticated=% service_role=%, expected false/false/true (SES-315)', r.proname, r.a, r.b, r.c;
    end if;
    if r.provolatile <> 'v' then
      raise exception 'AGT-495 GATE: public.% must stay VOLATILE, reads %', r.proname, r.provolatile;
    end if;
  end loop;
  if v_seen <> 2 then
    raise exception 'AGT-495 GATE: expected drain_epic_next and blocked_drain_probe in pg_proc, saw % row(s)', v_seen;
  end if;
end
$gate$;

NOTIFY pgrst, 'reload schema';
