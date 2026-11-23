-- DeepBench v7.0.1109 | docs/design/agt-167a-noship-one-home.sql | AGT-167 stage A of three -- public.noship_streaks() is the one home of the no-ship streak and public.ticket_noship_cycles(text) reads it. No pick changes.
--
-- THE MIRROR of migration `agt167a_noship_one_home`. Everything below the VERBATIM marker is the
-- migration as designed (kickoff docs/kickoffs/v7.0.1109-AGT-167-noship-staged.md, redesign attempt 1).
--
-- WHY THIS IS ITS OWN STAGE. v7.0.1104 designed one migration that created this home, changed three
-- pick functions, amended a rule row and ran a fixture gate, all in one call; that call was never
-- answered and nothing applied. This stage is the part that changes no pick: the count's rule is
-- public.ticket_noship_cycles()'s own (v7.0.946), computed for the whole board in one pass so a
-- later stage can read it once instead of scanning runner_cycles per ticket. Its gate READS ONLY --
-- it writes no row and builds no fixture -- and proves the rule did not move.
--
-- WHAT CHANGES
--   1. public.noship_streaks()            NEW.
--   2. public.ticket_noship_cycles(text)  same identity, same answers; now reads (1).
-- NOT TOUCHED: pick_exclusions(), prime_directive_queue(), drain_epic_next(uuid), every table and row.
--
-- DOWN: public.capture_migration_down(<cycle>, 'agt167a_noship_one_home', the two identities) before
-- the apply; the down restores ticket_noship_cycles' prior body and removes noship_streaks().
-- Guard: tests/regression/agt-167-noship-pick-fence.test.mjs (arms A and D). Governing: docs/ARCHITECTURE.md section 19v.
--
-- ---- THE MIGRATION, VERBATIM ---
CREATE OR REPLACE FUNCTION public.noship_streaks()
 RETURNS TABLE(backlog_id text, noship integer)
 LANGUAGE sql
 STABLE
AS $function$
  -- AGT-167 (v7.0.1109). THE ONE HOME of the no-ship streak: for every ticket with at least one,
  -- its non-shipping cycles since its last ship. A ticket with none has no row -- read it as 0.
  -- The rule is public.ticket_noship_cycles()'s own (v7.0.946), computed for the whole board in one
  -- pass so pick_exclusions() can read it without one scan of runner_cycles per ticket.
  with mine as (
    select coalesce(b.backlog_id, c.item_id) as backlog_id, c.started_at, c.outcome
      from public.runner_cycles c
      left join public.backlog_items b on b.id = c.backlog_item_id
     where coalesce(b.backlog_id, c.item_id) is not null
  )
  select m.backlog_id, count(*)::int as noship
    from mine m
    left join (select s.backlog_id, max(s.started_at) as last_ship
                 from mine s
                where s.outcome = 'shipped'
                group by s.backlog_id) ls on ls.backlog_id = m.backlog_id
   where m.outcome is distinct from 'shipped'
     and m.started_at > coalesce(ls.last_ship, '-infinity'::timestamptz)
   group by m.backlog_id;
$function$;

-- pg_default_acl grants EXECUTE to anon, authenticated and service_role BY NAME the instant a
-- function is created; a PUBLIC-only revoke leaves them standing (.claude/rules/supabase-column-grants.md,
-- SES-315). Revoke the three by name; the closing gate asserts both directions.
REVOKE ALL ON FUNCTION public.noship_streaks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.noship_streaks() TO service_role;

-- Same identity argument list, so this REPLACES the one overload and its grants stand.
CREATE OR REPLACE FUNCTION public.ticket_noship_cycles(p_backlog_id text)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  -- AGT-167 (v7.0.1109): one ticket's reading of public.noship_streaks(), the one home.
  select coalesce((select s.noship from public.noship_streaks() s where s.backlog_id = p_backlog_id), 0);
$function$;

-- THE GATE. Read-only: no row is written and no fixture is built. A raise applies nothing.
DO $gate$
declare
  v_bad  int;
  v_seen int := 0;
  r record;
begin
  -- 1. THE RULE DID NOT MOVE. For every ticket any cycle names, the new home reads what the
  --    v7.0.946 body read -- that body's own text, kept here as the oracle -- and the one-ticket
  --    function reads the new home on every row it holds.
  select count(*)::int into v_bad
    from (select distinct coalesce(b.backlog_id, c.item_id) as bid
            from public.runner_cycles c
            left join public.backlog_items b on b.id = c.backlog_item_id) t
    left join public.noship_streaks() ns on ns.backlog_id = t.bid
   where t.bid is not null
     and coalesce(ns.noship, 0) is distinct from (
            with mine as (
              select c.started_at, c.outcome
                from public.runner_cycles c
                left join public.backlog_items b on b.id = c.backlog_item_id
               where coalesce(b.backlog_id, c.item_id) = t.bid
            )
            select count(*)::int
              from mine m
             where m.outcome is distinct from 'shipped'
               and m.started_at > coalesce(
                     (select max(s.started_at) from mine s where s.outcome = 'shipped'),
                     '-infinity'::timestamptz));
  if v_bad <> 0 then
    raise exception 'AGT-167 A GATE 1: noship_streaks() disagrees with the v7.0.946 rule on % ticket(s)', v_bad;
  end if;
  select count(*)::int into v_bad
    from public.noship_streaks() ns
   where public.ticket_noship_cycles(ns.backlog_id) is distinct from ns.noship;
  if v_bad <> 0 then
    raise exception 'AGT-167 A GATE 1: ticket_noship_cycles() disagrees with noship_streaks() on % ticket(s)', v_bad;
  end if;
  if public.ticket_noship_cycles('ZFIX-NO-SUCH-TICKET') is distinct from 0 then
    raise exception 'AGT-167 A GATE 1: a ticket no cycle names must read a streak of 0';
  end if;
  -- 2. NOT VACUOUS: the board holds streaks, so arm 1 compared something.
  select count(*)::int into v_bad from public.noship_streaks();
  if v_bad = 0 then
    raise exception 'AGT-167 A GATE 2: noship_streaks() returned no row, so arm 1 compared nothing';
  end if;
  raise notice 'AGT-167 A GATE measured: % ticket(s) hold a streak, 0 disagree with the v7.0.946 rule', v_bad;

  -- the committed objects: one overload each, closed to the browser's keys, open to service_role.
  for r in
    select p.proname,
           count(*) over (partition by p.proname)::int as n,
           has_function_privilege('anon', p.oid, 'EXECUTE') as a,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as b,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as c
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
       and p.proname in ('noship_streaks', 'ticket_noship_cycles')
  loop
    v_seen := v_seen + 1;
    if r.n <> 1 then
      raise exception 'AGT-167 A GATE: pg_proc holds % overloads of public.%, expected exactly 1 (.claude/rules/supabase-function-signature.md)', r.n, r.proname;
    end if;
    if r.a or r.b or not r.c then
      raise exception 'AGT-167 A GATE: EXECUTE on public.% reads anon=% authenticated=% service_role=%, expected false/false/true (SES-315)', r.proname, r.a, r.b, r.c;
    end if;
  end loop;
  if v_seen <> 2 then
    raise exception 'AGT-167 A GATE: expected two functions in pg_proc, saw % row(s)', v_seen;
  end if;
end
$gate$;

NOTIFY pgrst, 'reload schema';
