-- DeepBench v7.0.889 | docs/design/agt-459-ship-card-retire.sql | AGT-459 --
-- THE MIGRATION `agt459_retire_stale_ship_cards`, prepared by runner cycle
-- 5539aecb-77a1-433c-9195-a0c46a29fdf1 on 2026-10-23.
--
-- !! NOT APPLIED BY THE BUILD CYCLE. This file is the SOURCE to apply, not a mirror of an applied
-- !! migration. Every attempt to land it through the Supabase MCP connector timed out at the
-- !! connector's 60s ceiling: 8 `apply_migration` calls (both the `Supabase` and
-- !! `Supabase-ef5dea6e` servers) and 2 `execute_sql` calls, each one verified afterwards to have
-- !! left the database completely unchanged (0 rows of `retire_stale_ship_cards` in `pg_proc`, 111
-- !! stale cards still undecided, no `card-retire` decision, no fixture row). Diagnosed rather
-- !! than retried blind: payload size is NOT the cause (a 2.5 KB rolled-back `do` block returns
-- !! instantly), `--` inside a string literal is NOT the cause (a form with none still hung),
-- !! there was no blocking session or stuck transaction in `pg_stat_activity`, and `list_migrations`
-- !! and every `select` answer in well under a second. The discriminator: a ~200-byte COMMITTING
-- !! `create or replace function` succeeded once, and a ~200-byte COMMITTING `drop function`
-- !! timed out minutes later -- so it is committing DDL specifically, and intermittently, which
-- !! points at the `pgrst_ddl_watch` / PostgREST schema-reload path rather than at this SQL.
-- !!
-- !! RESIDUE TO CLEAN: that one successful probe left `public.agt459_probe()` behind (a no-argument
-- !! `select 1`, no table access, but it carries the default `anon`/`authenticated` EXECUTE grant
-- !! that every new function gets). Two `drop function if exists public.agt459_probe();` calls both
-- !! timed out. The last line of this file drops it; whoever applies this should confirm it is
-- !! gone.
--
-- WHAT WAS MISSING, measured live this cycle rather than taken from the kickoff. A `runner_items`
-- row with `kind='ship'` is a build report awaiting John's tap. Re-verified by query before any
-- code was written: `runner_items_decision_check` is
-- `CHECK (decision = ANY (ARRAY['accept','reverse','rework','retired']))` -- it ALREADY admits
-- `retired` table-wide -- and `runner_items` is ALREADY in `reversible_tables()` and on
-- `reverse_decision()`'s `k_allowed`, whose Guard B refuses only `kind='gated_before_build'` (and a
-- card belonging to the ACTING cycle). So no constraint change and no reversal-path change is
-- needed. What was missing was a WRITER: nothing in `scripts/`, `api/` or `lib/` ever wrote
-- `decision` on a `kind='ship'` row, so 111 cards whose ticket had already reached `done`,
-- `removed` or `removal proposed` -- or which carried no `backlog_id` at all, and a ship verdict is
-- keyed by `backlog_id` -- could never be ruled by John or by the runner. Measured before the
-- backfill: 111 (`done` 81, `removal proposed` 12, `removed` 9, no ticket 9).
--
-- THE DOWN, CAPTURED BEFORE ANY APPLY (runner-cycle.md step 6):
--   drop function if exists public.retire_stale_ship_cards(uuid, text);
--
-- ONE FIXED IDENTITY ARGUMENT LIST, NO DEFAULT (.claude/rules/supabase-function-signature.md):
-- `(p_cycle_id uuid, p_session_name text)`. A DEFAULT on the second parameter would let a later
-- `CREATE OR REPLACE` that added a third leave TWO overloads standing, and PostgREST answers an
-- ambiguous resolution as an EMPTY RESULT, not an error -- which on this function would read as
-- "nothing was stale" and silently stop sweeping the board. Section 3 below asserts exactly one
-- overload remains.
--
-- DEVIATION FROM THE KICKOFF'S STUB, named rather than silently taken (pattern:89). The kickoff
-- Section 4 specifies the before-image row as `(p_cycle_id, null, 'runner_items', ...)` with a
-- LITERAL null session name. That is wrong and would ship a function that raises on half its
-- callers: `runner_before_images` carries CHECK `ck_before_image_attribution`
-- ((cycle_id IS NOT NULL) <> (session_name IS NOT NULL)), so a session-attributed call
-- (p_cycle_id NULL, p_session_name set) passes `record_decision()`'s own XOR and then violates that
-- constraint on its first image. The form below passes `(p_cycle_id, p_session_name, ...)`, which is
-- exactly what the house sibling `apply_gate_rulings()` does at both of ITS image inserts. QA 3
-- drives the session-attributed path on purpose, so this is proven rather than merely reasoned.
--
-- SECOND DEVIATION, also named: the kickoff asks for one pre-count of the set plus one `by_status`
-- aggregate before the loop. This form makes ONE pass instead -- the decision is created lazily on
-- the first row and `by_status` is accumulated in the loop -- for two reasons. The predicate then
-- appears ONCE rather than three times, so the three copies cannot drift apart; and "nothing stale"
-- falls out as a structural property (no rows, so no `record_decision()` call at all) rather than
-- as an early return somebody could later delete. The decision's `summary` is written after the
-- loop with the loop's OWN count, so the ledger figure is what actually happened, never a
-- pre-count that a concurrent write could have invalidated.

-- ---------------------------------------------------------------------------------------------
-- 1. THE FUNCTION
-- ---------------------------------------------------------------------------------------------
create or replace function public.retire_stale_ship_cards(p_cycle_id uuid,p_session_name text)
returns jsonb language plpgsql security definer set search_path to 'public','pg_catalog' as $f$
declare vd uuid;vc int:=0;vbs jsonb:='{}'::jsonb;vby text;r record;
begin
-- Exactly one author, validated before any write, in `apply_gate_rulings()`'s own words: both
-- `ck_decision_attribution` and `ck_before_image_attribution` are XORs. Raised here so the caller
-- gets the rule rather than a bare 23514 from the constraint later.
if not ((p_cycle_id is not null)<>(p_session_name is not null)) then
raise exception 'retire_stale_ship_cards: exactly one of p_cycle_id / p_session_name must be set (ck_decision_attribution / ck_before_image_attribution); a decision has exactly one author';
end if;
vby:=coalesce(p_session_name,'cycle '||p_cycle_id::text);
-- THE SET, STATED ONCE. `delivered` (140) and `partial` (43) are DELIBERATELY NOT HERE: those cards
-- are still rulable and wait on paths ruled elsewhere. The `backlog_id is null` arm closes the 9
-- cards with no ticket, because a ship verdict is keyed by `backlog_id` and those can never
-- receive a tap by any path.
for r in select i as ri,coalesce(b.status,'(no ticket)') t
 from public.runner_items i left join public.backlog_items b on b.backlog_id=i.backlog_id
 where i.kind='ship' and i.decision is null
  and (b.status in('done','removed','removal proposed') or i.backlog_id is null)
 order by i.created_at
loop
 -- ONE DECISION FOR THE WHOLE SWEEP, created on the first row so an empty board files nothing.
 -- `ladder_work_class` is DELIBERATELY NULL: no rung moves on a machine close. A class here would
 -- make `sweep_decision_windows()` PROMOTE that class when this row's window closed, i.e. the
 -- runner awarding itself a rung for tidying its own board.
 if vd is null then
  vd:=public.record_decision(p_cycle_id,p_session_name,'card-retire',null,
   'AGT-459: retiring stale ship cards by '||vby,
   'AGT-459: a kind=ship card is a build report awaiting Johns tap. These carry no decision and their ticket is already done, removed or removal-proposed, or they carry no backlog_id at all, and a ship verdict is keyed by backlog_id, so no path could ever rule them. A deterministic structural close, not a judgment and not a tap of Johns (pattern:9, pattern:10, pattern:99). Every row is imaged first under this decision, so the whole sweep is reversible through reverse_decision(). Section 19v.',
   null);
 end if;
 -- THE IMAGE FIRST, AND ITS SUCCESS AUTHORISES THE UPDATE (Section 19v: no before-image logged,
 -- the write does not happen). The row is taken as a WHOLE COMPOSITE so `to_jsonb()` carries
 -- exactly the table's own shape -- `reverse_decision()` restores through
 -- `jsonb_populate_record(null::public.runner_items, row_data)`, and an image carrying a joined
 -- extra column is an image that round-trips differently from the row it claims to be.
 insert into public.runner_before_images(cycle_id,session_name,table_name,pk_value,row_data,decision_id)
 values(p_cycle_id,p_session_name,'runner_items',(r.ri).id::text,to_jsonb(r.ri),vd);
 update public.runner_items set decision='retired',
  decision_reason=format('AGT-459 machine close by %s: %s. Structural, not judged; reversible through decision %s.',vby,
   case when (r.ri).backlog_id is null then 'the card carries no backlog_id, and a ship verdict is keyed by backlog_id'
    else format('ticket %s is already %s',(r.ri).backlog_id,r.t) end,vd),
  decided_at=now() where id=(r.ri).id;
 vc:=vc+1;
 vbs:=jsonb_set(vbs,array[r.t],(coalesce((vbs->>r.t)::int,0)+1)::text::jsonb,true);
end loop;
if vd is null then return jsonb_build_object('cards',0,'decision',null,'by_status',vbs);end if;
-- The ledger figure is the LOOP'S OWN count, never a pre-count.
update public.runner_decisions
 set summary=format('AGT-459: retired %s stale ship card(s) by %s, %s',vc,vby,vbs::text)
 where id=vd;
return jsonb_build_object('cards',vc,'decision',vd,'by_status',vbs);
end;$f$;

-- ---------------------------------------------------------------------------------------------
-- 2. GRANTS, BY NAME (.claude/rules/supabase-column-grants.md, SES-315 addendum)
-- ---------------------------------------------------------------------------------------------
-- `pg_default_acl` grants EXECUTE to `anon`, `authenticated` AND `service_role` BY NAME the instant
-- a function is created, so this function is callable with the anon key that ships in the browser
-- bundle until these two lines run. `REVOKE ALL ON FUNCTION ... FROM PUBLIC` alone removes only the
-- PUBLIC grant and leaves the three named grants standing -- the migration reports success and the
-- function stays open. Section 3 asserts both directions rather than trusting that success flag.
revoke all on function public.retire_stale_ship_cards(uuid,text) from public,anon,authenticated;
grant execute on function public.retire_stale_ship_cards(uuid,text) to service_role;

-- ---------------------------------------------------------------------------------------------
-- 3. THE TRAILING GATE -- QA 2 AND QA 3, BOTH DIRECTIONS, EVERY ASSERTION RAISES
-- ---------------------------------------------------------------------------------------------
-- NEVER TRUST THE SUCCESS FLAG. Every check below raises, so an apply that reports success is an
-- apply whose gate held. QA 3 runs the real function against a real fixture and takes it back out
-- with the sub-block's implicit savepoint: the fixture is rolled back, the function and the grants
-- are not.
--
-- RUN THIS BLOCK AFTER THE BACKFILL IN SECTION 4, not before, and the reason is measured: with 111
-- cards still stale, QA 3's fixture call makes the function sweep all 112 and then makes
-- `reverse_decision()` restore 112 rows through its per-row catalog lookups, which is what first
-- hit the 60s ceiling. Run after the backfill the stale set is the fixture ALONE, so the same
-- assertions cost one row each -- cheaper AND strictly more discriminating, since a sweep that
-- closed the fixture by accident alongside 111 others can no longer hide in the count.
do $qa$
declare
  v_n int; v_anon boolean; v_auth boolean; v_svc boolean;
  v_cyc uuid; v_card uuid; v_ret jsonb; v_dec uuid; v_decision text; v_imgs int;
  v_rev record; v_detail text;
begin
  -- QA 2 (a) -- EXACTLY ONE OVERLOAD. A break is invisible from the new call and total from the old.
  select count(*) into v_n from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='retire_stale_ship_cards';
  if v_n <> 1 then
    raise exception 'AGT-459 QA2: expected exactly 1 retire_stale_ship_cards overload, found %', v_n;
  end if;

  -- QA 2 (b) -- BOTH DIRECTIONS. The denial must hold AND the legitimate caller must still work;
  -- one of the two alone proves nothing (the column-grants rule's own found-live lesson).
  v_anon := has_function_privilege('anon','public.retire_stale_ship_cards(uuid,text)','EXECUTE');
  v_auth := has_function_privilege('authenticated','public.retire_stale_ship_cards(uuid,text)','EXECUTE');
  v_svc  := has_function_privilege('service_role','public.retire_stale_ship_cards(uuid,text)','EXECUTE');
  if v_anon or v_auth then
    raise exception 'AGT-459 QA2: this function closes build reports and must not be callable with the anon key that ships in the browser bundle; anon=%, authenticated=%', v_anon, v_auth;
  end if;
  if not v_svc then
    raise exception 'AGT-459 QA2: service_role must hold EXECUTE or the runner cannot call it; a revoke that closed the function to everybody is an outage, not a gate';
  end if;

  -- QA 3 -- REVERSIBILITY, ON A ROLLED-BACK FIXTURE. Driven over the SESSION-attributed path on
  -- purpose: that is the path the kickoff's literal-null before-image would have broken, and it
  -- keeps `reverse_decision()`'s Guard B acting-cycle clause out of the way (that clause fires
  -- only for a cycle actor), so a refusal here means the REVERSAL failed, not that a guard spoke.
  begin
    select c.id into v_cyc from public.runner_cycles c
     where c.id <> '5539aecb-77a1-433c-9195-a0c46a29fdf1'::uuid
     order by c.created_at desc limit 1;
    if v_cyc is null then
      raise exception 'AGT-459 QA3: no runner_cycles row to hang a fixture card on';
    end if;

    insert into public.runner_items (cycle_id, backlog_id, kind, title)
    select v_cyc, b.backlog_id, 'ship', 'AGT-459 QA3 fixture, rolled back'
      from public.backlog_items b where b.status = 'done' limit 1
    returning id into v_card;
    if v_card is null then
      raise exception 'AGT-459 QA3: no done ticket to hang a fixture card on';
    end if;

    v_ret := public.retire_stale_ship_cards(null, 'agt-459-qa3');
    v_dec := (v_ret ->> 'decision')::uuid;
    if v_dec is null then
      raise exception 'AGT-459 QA3: the function returned no decision id over a non-empty set: %', v_ret::text;
    end if;

    select decision into v_decision from public.runner_items where id = v_card;
    if v_decision is distinct from 'retired' then
      raise exception 'AGT-459 QA3: the fixture card must read decision=retired after the call, got %', coalesce(v_decision,'<NULL>');
    end if;

    -- Closed WITH ITS IMAGE: exactly one, for THIS card, under THIS decision. That is what makes
    -- the row restorable rather than merely logged.
    select count(*) into v_imgs from public.runner_before_images
     where decision_id = v_dec and table_name = 'runner_items' and pk_value = v_card::text;
    if v_imgs <> 1 then
      raise exception 'AGT-459 QA3: the fixture card must carry exactly 1 before-image under decision %, got %', v_dec, v_imgs;
    end if;

    -- THE OTHER DIRECTION: the close comes back out through the real reversal path.
    select * into v_rev from public.reverse_decision(v_dec,'agt-459-qa3','AGT-459 QA3: proving the machine close is reversible',null);
    select decision into v_decision from public.runner_items where id = v_card;
    if v_decision is not null then
      raise exception 'AGT-459 QA3: reverse_decision(%) left the fixture card at decision=%; outcome %, restored %, unverified %, refused %, written_since %. A close this path cannot undo is a close Section 19v does not permit',
        v_dec, v_decision, v_rev.outcome, v_rev.restored, v_rev.restored_unverified, v_rev.refused, v_rev.refused_written_since;
    end if;
    if v_rev.outcome not in ('applied','partial') then
      raise exception 'AGT-459 QA3: reverse_decision(%) answered outcome %: %', v_dec, v_rev.outcome, v_rev.reason;
    end if;

    v_detail := format('card %s retired then restored to NULL; 1 image; reversal outcome %s (restored %s, unverified %s, refused %s, written-since %s); sweep returned %s',
                       v_card, v_rev.outcome, v_rev.restored, v_rev.restored_unverified,
                       v_rev.refused, v_rev.refused_written_since, v_ret ->> 'cards');

    -- THE ROLLBACK. Raising out of this sub-block takes every write above back out with its
    -- implicit savepoint -- fixture card, decision, images, reversal row -- while the function and
    -- the grants created outside it stand. A QA step that left its fixture behind would be a QA
    -- step that mutated the board it was grading (pattern:76).
    raise exception 'AGT459_QA3_ROLLBACK %', v_detail;
  exception when others then
    if SQLERRM like 'AGT459_QA3_ROLLBACK %' then
      raise notice 'AGT-459 QA3 PASSED (fixture rolled back): %', substr(SQLERRM, 24);
    else
      raise exception 'AGT-459 QA3 FAILED: %', SQLERRM;
    end if;
  end;

  raise notice 'AGT-459 QA2 PASSED: 1 overload; EXECUTE anon=% authenticated=% service_role=%', v_anon, v_auth, v_svc;
end
$qa$;

-- ---------------------------------------------------------------------------------------------
-- 4. THE BACKFILL, ONCE (kickoff task 7). Run this BEFORE section 3, per section 3's own header.
-- ---------------------------------------------------------------------------------------------
-- QA 1, before:  expect 111.
-- QA 1, after:   expect 0. A build that did nothing leaves 111.
--   select count(*) from runner_items i
--     left join backlog_items b on b.backlog_id = i.backlog_id
--    where i.kind='ship' and i.decision is null
--      and (b.status in ('done','removed','removal proposed') or i.backlog_id is null);
select public.retire_stale_ship_cards('5539aecb-77a1-433c-9195-a0c46a29fdf1', null);

-- ---------------------------------------------------------------------------------------------
-- 5. CLEAN UP THE DIAGNOSTIC RESIDUE named in this file's header.
-- ---------------------------------------------------------------------------------------------
drop function if exists public.agt459_probe();
