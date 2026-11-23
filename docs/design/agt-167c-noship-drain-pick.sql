-- DeepBench v7.0.1109 | docs/design/agt-167c-noship-drain-pick.sql | AGT-167 stage C of three -- public.drain_epic_next(uuid) passes a named member at the no-ship streak cap and says so in its census, and the written rule OD-21 says what is now true.
--
-- THE MIRROR of migration `agt167c_noship_drain_pick`. Everything below the VERBATIM marker is the
-- migration as designed (kickoff docs/kickoffs/v7.0.1109-AGT-167-noship-staged.md, redesign attempt
-- 1). The body is NOT retyped: it is read from the catalog and spliced on anchors that must be there
-- exactly once (the AGT-483 / AGT-495 form), so a body that has moved is refused, never guessed at.
--
-- NEEDS STAGES A AND B: the clause reads public.noship_streaks(), and OD-21's new sentence names the
-- pick_exclusions() clause stage B wrote.
--
-- WHAT CHANGES
--   1. public.drain_epic_next(uuid)  5 splices: the pick clause, and a census bucket so a drain
--                                    whose members are all held says so in blocked_detail.
--   2. governance_rules OD-21        one row's statement, before-image first: it said the drain
--                                    was deliberately not fenced.
-- NOT TOUCHED: the retirement predicate and the delivered exit of drain_epic_next (a held member
-- still holds its drain open, exactly as a flagged or gated member does), the streak rule itself,
-- runner_settings, every other table and row.
--
-- DOWN: public.capture_migration_down(<cycle>, 'agt167c_noship_drain_pick', the one identity)
-- before the apply; the down restores the prior body. OD-21's prior statement is its
-- runner_before_images row (table_name governance_rules, this cycle).
-- Guard: tests/regression/agt-167-noship-pick-fence.test.mjs (arm D). Governing: docs/ARCHITECTURE.md section 19v.
--
-- ---- THE MIGRATION, VERBATIM ---
-- THE SPLICES. Five anchors over one body; each must be there exactly once, stage B must be in,
-- and drain_epic_next must not already carry the fence, or nothing is applied.
DO $splice$
declare
  r       record;
  v_def   text;
  v_new   text;
  v_occ   int;
  v_ident text := '';
  c_cap constant text := '(SELECT s.chain_max_noship_streak FROM public.runner_settings s WHERE s.id = 1)';
begin
  if to_regprocedure('public.noship_streaks()') is null
     or strpos(pg_get_functiondef('public.pick_exclusions()'::regprocedure), 'ns.noship >= ') = 0 then
    raise exception 'AGT-167 C ORDER: stage A (agt167a_noship_one_home) or stage B (agt167b_noship_one_predicate) has not applied. Nothing applied.';
  end if;
  if strpos(pg_get_functiondef('public.drain_epic_next(uuid)'::regprocedure), 'noship') > 0 then
    raise exception 'AGT-167 C PREMISE DEAD ON LIVE: drain_epic_next() already reads the no-ship streak. Nothing applied.';
  end if;

  for r in
    select * from (values
      -- drain_epic_next(uuid): the census variables.
      (5, 'drain_epic_next(uuid)',
$a$  v_detail        text;$a$,
$a$  v_detail        text;
  v_streak_n      integer;   -- AGT-167
  v_streak_list   text;      -- AGT-167$a$),
      -- drain_epic_next(uuid): the pick clause.
      (6, 'drain_epic_next(uuid)',
$a$       -- AGT-455: no score gate here:$a$,
$a$       -- AGT-167 (v7.0.1109): a named member at the no-ship streak cap is not work either. It was
       -- picked here unchanged while lane (c) refused it; pick_exclusions() carries the same test.
       AND NOT EXISTS (SELECT 1 FROM public.noship_streaks() ns
                        WHERE ns.backlog_id = b.backlog_id
                          AND ns.noship >= $a$ || c_cap || $a$)
       -- AGT-455: no score gate here:$a$),
      -- drain_epic_next(uuid): the census bucket, over the same base the pick reads.
      (7, 'drain_epic_next(uuid)',
$a$      -- SES-310: the opening phrase says "required" ONLY when the gate has ruled a finish line.$a$,
$a$      -- AGT-167: THE STREAK BUCKET. A new way to reject a pick, so it gets its census line (SES-196).
      SELECT count(*)::integer, string_agg(b.backlog_id || ' (' || ns.noship || ')', ', ' ORDER BY b.queue)
        INTO v_streak_n, v_streak_list
        FROM public.runner_drain_scope s
        JOIN public.backlog_items b ON b.id = s.item_id
        JOIN public.noship_streaks() ns ON ns.backlog_id = b.backlog_id
       WHERE s.directive_id = d.id
         AND b.queue IS NOT NULL
         AND b.status <> ALL (c_finished)
         AND ns.noship >= $a$ || c_cap || $a$;

      -- SES-310: the opening phrase says "required" ONLY when the gate has ruled a finish line.$a$),
      -- drain_epic_next(uuid): the census sentence.
      (8, 'drain_epic_next(uuid)',
$a$        || CASE WHEN COALESCE(v_peer_n,0) > 0$a$,
$a$        || CASE WHEN COALESCE(v_streak_n,0) > 0
                THEN format('; %s held at the no-ship streak cap (%s)', v_streak_n, v_streak_list) ELSE '' END
        || CASE WHEN COALESCE(v_peer_n,0) > 0$a$),
      -- drain_epic_next(uuid): the bucket counts toward "explained".
      (9, 'drain_epic_next(uuid)',
$a$                   + COALESCE(v_card_n,0) = 0$a$,
$a$                   + COALESCE(v_card_n,0) + COALESCE(v_streak_n,0) = 0$a$)
    ) v(n, ident, splice_from, splice_to)
    order by n
  loop
    v_def := pg_get_functiondef(('public.' || r.ident)::regprocedure);
    v_occ := (length(v_def) - length(replace(v_def, r.splice_from, ''))) / length(r.splice_from);
    if v_occ <> 1 then
      raise exception 'AGT-167 C SPLICE % on %: the anchor [%] occurs % time(s), expected exactly 1', r.n, r.ident, r.splice_from, v_occ;
    end if;
    v_new := replace(v_def, r.splice_from, r.splice_to);
    execute v_new;
    if pg_get_functiondef(('public.' || r.ident)::regprocedure) <> v_new then
      raise exception 'AGT-167 C SPLICE % on %: the body Postgres stored is not the text this migration executed', r.n, r.ident;
    end if;
    v_ident := v_ident || ' ' || r.n || ':' || md5(v_new);
  end loop;
  raise notice 'AGT-167 C SPLICE md5 after each:%', v_ident;
end
$splice$;

-- THE WRITTEN RULE MOVES WITH THE LAST FUNCTION (pattern:94). governance_rules OD-21 says the drain
-- is "deliberately NOT fenced (`AGT-221`)". AGT-221 was the ticket to fence it, removed unbuilt at
-- the 2026-09-27 epic lock; stages B and C are that work, so the sentence stops being true here and
-- is amended here, before-image first. The same text is the blockquote under #OD-21 in
-- docs/design/2026-09-09-operational-defaults-census.md (ses-234 pins the pair byte for byte).
DO $rule$
declare
  v_n int;
begin
  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data)
  select 'f1ce9c06-e0fd-45aa-9588-dc3f7c65d4ad'::uuid, 'governance_rules', g.id, to_jsonb(g)
    from public.governance_rules g
   where g.id = 'OD-21'
     and g.statement like '%deliberately NOT fenced (`AGT-221`)%';
  get diagnostics v_n = row_count;
  if v_n <> 1 then
    raise exception 'AGT-167 C RULE: OD-21 does not hold the sentence this migration amends (% row(s) matched). Nothing applied.', v_n;
  end if;
  update public.governance_rules
     set statement = $od21$`runner_settings.chain_max_noship_streak` is ONE column with TWO meanings since `AGT-167` (`v7.0.642`), and tuning it moves both: (a) a chain stops when that many consecutive cycles have finished without shipping — `public.drain_chain_gate()`, COALESCE fallback 2; and (b) every pick lane refuses an open or partial ticket whose own non-shipping cycles since its last ship have reached it — one clause in `public.pick_exclusions()`, read by lanes (b) and (c) of `public.prime_directive_queue()`, and the same test in `public.drain_epic_next()`; `public.noship_streaks()` is the one home for that measure and `public.ticket_noship_cycles(text)` reads it. Column default 2, LIVE VALUE 4, `CHECK (1..20)`. A held ticket names the streak as its reason and returns by a ship or a ruling, never by another cycle (`AGT-167`, `v7.0.1109`).$od21$,
         updated_at = now()
   where id = 'OD-21';
end
$rule$;

-- THE GATE. Both directions on fixtures that are rolled back, or the whole migration rolls back.
DO $gate$
declare
  c_cycle constant uuid := 'f1ce9c06-e0fd-45aa-9588-dc3f7c65d4ad';
  v_cap   int;
  v_epic  uuid;
  v_h uuid; v_u uuid;
  v_d uuid := gen_random_uuid();
  v_real int;
  v_out1 text; v_dir1 uuid; v_pick1 text;
  v_out2 text; v_dir2 uuid; v_det2 text;
  v_items int; v_cycles int; v_dirs int; v_scope int;
  r record;
  v_seen int := 0;
begin
  select s.chain_max_noship_streak into v_cap from public.runner_settings s where s.id = 1;
  if v_cap is null or v_cap < 1 then
    raise exception 'AGT-167 C GATE: runner_settings.chain_max_noship_streak reads %, expected a positive integer', v_cap;
  end if;
  if not exists (select 1 from public.runner_cycles c where c.id = c_cycle) then
    raise exception 'AGT-167 C GATE: cycle % is not in runner_cycles, so drain_epic_next() cannot be called under it', c_cycle;
  end if;

  -- A later real drain may pick when the fixture drain cannot, so arm 2 (the fixture drain's own
  -- blocked row) is graded only when no real drain is queued; arm 1 always.
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
    raise exception 'AGT-167 C GATE: no epic of an executing project is free of an unresolved design gate -- the fixtures have nowhere to stand';
  end if;

  begin
    -- H is first in the drain's order (lower queue) and sits AT the cap; U sits one under it.
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

    -- CALL 1: the drain pick. H sorts first; it must be passed over for U.
    select q.outcome, q.directive_id, q.backlog_id into v_out1, v_dir1, v_pick1
      from public.drain_epic_next(c_cycle) q;

    -- CALL 2: U reaches the cap too, so the fixture drain has no claimable member and says why.
    insert into public.runner_cycles (stamp, trigger, item_id, outcome, started_at)
    values ('AGT-167-GATE-FIXTURE', 'scheduled', 'ZFIX-16792', 'failed', '2020-01-02');
    select q.outcome, q.directive_id, q.blocked_detail into v_out2, v_dir2, v_det2
      from public.drain_epic_next(c_cycle) q;

    raise exception sqlstate 'P0167' using message = 'AGT-167 gate: fixtures measured, rolling them back';
  exception when sqlstate 'P0167' then
    null;   -- every write above is undone; the measurements survive in the variables
  end;

  raise notice 'AGT-167 C GATE measured: cap % | call 1 % % | call 2 % [%] | real queued drains %', v_cap, v_out1, v_pick1, v_out2, v_det2, v_real;

  -- 1. the drain pick: with H first in its order, the pick is U. Before this stage it was H.
  if (v_out1 = 'pick' and v_dir1 = v_d and v_pick1 = 'ZFIX-16792') is not true then
    raise exception 'AGT-167 C GATE 1: the drain pick must pass the at-cap member and take ZFIX-16792, got outcome % pick % (before this stage the same board answered ZFIX-16791)', coalesce(v_out1, '(null)'), coalesce(v_pick1, '(null)');
  end if;
  -- 2. both held: never a silent empty. Graded on the fixture drain's own row, which answers
  --    only when no real drain picks.
  if v_real = 0 and (v_out2 = 'blocked' and v_dir2 = v_d
        and v_det2 like '%; 2 held at the no-ship streak cap (ZFIX-16791 (' || v_cap || '), ZFIX-16792 (' || v_cap || '))%'
        and v_det2 not like '%read the scope by hand%') is not true then
    raise exception 'AGT-167 C GATE 2: with both members at the cap the drain must answer blocked and name them, got outcome % detail %', coalesce(v_out2, '(null)'), coalesce(v_det2, '(null)');
  end if;

  -- nothing left behind
  select count(*)::int into v_items  from public.backlog_items    where source_file = 'agt167-gate';
  select count(*)::int into v_cycles from public.runner_cycles    where stamp = 'AGT-167-GATE-FIXTURE';
  select count(*)::int into v_dirs   from public.runner_directives where body like 'AGT-167 GATE FIXTURE%';
  select count(*)::int into v_scope  from public.runner_drain_scope where directive_id = v_d;
  if v_items + v_cycles + v_dirs + v_scope <> 0 then
    raise exception 'AGT-167 C GATE: the sentinel left residue -- % ticket(s), % cycle(s), % directive(s), % scope row(s)', v_items, v_cycles, v_dirs, v_scope;
  end if;

  -- the committed object: one overload, closed to the browser's keys, open to service_role.
  for r in
    select p.proname,
           count(*) over (partition by p.proname)::int as n,
           has_function_privilege('anon', p.oid, 'EXECUTE') as a,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as b,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as c
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
       and p.proname = 'drain_epic_next'
  loop
    v_seen := v_seen + 1;
    if r.n <> 1 then
      raise exception 'AGT-167 C GATE: pg_proc holds % overloads of public.%, expected exactly 1 (.claude/rules/supabase-function-signature.md)', r.n, r.proname;
    end if;
    if r.a or r.b or not r.c then
      raise exception 'AGT-167 C GATE: EXECUTE on public.% reads anon=% authenticated=% service_role=%, expected false/false/true (SES-315)', r.proname, r.a, r.b, r.c;
    end if;
  end loop;
  if v_seen <> 1 then
    raise exception 'AGT-167 C GATE: expected one function in pg_proc, saw % row(s)', v_seen;
  end if;
end
$gate$;

NOTIFY pgrst, 'reload schema';
