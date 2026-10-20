-- DeepBench v7.0.873 | docs/design/agt-423-sweep-fault-isolation.sql | AGT-423
-- Migration `agt423_sweep_fault_isolation` -- apply via apply_migration AFTER
-- capture_migration_down(:C, 'agt423_sweep_fault_isolation', <objects>) (kickoff section 4).
-- :C = 'a2fcf5a4-372c-4da4-95ce-1b950a8f0082'::uuid (cycle a2fcf5a4-372c-4da4-95ce-1b950a8f0082).
--
-- WHAT THIS CHANGES AND WHY, measured rather than argued. public.sweep_decision_windows(uuid,text)
-- did every expired decision in ONE transaction. Its ship branch ends in
-- `update public.backlog_items set status='done'`, which raises 23514 through
-- backlog_done_requires_verdict() (AGT-166) for a ticket whose latest verdict is a `block` --
-- and that raise aborted the WHOLE call. Live at this ship: 6,007 open decisions past
-- expires_at (oldest 2026-10-05 09:24:41Z), 25 of kind `ship`, and ONE of them refused
-- (decision 199f27ef-218c-4e56-991c-98992aaea425, AGT-281, latest verdict `block`
-- 38959e02-fdd5-4858-bf19-11fc48fdc5d2). One refusable ticket wedged every window on the board,
-- and the hourly pg-cron finaliser had been writing an error row every :17 since.
--
-- THE GUARD IS CORRECT AND IS NOT TOUCHED. backlog_done_requires_verdict() stays exactly as
-- AGT-166 shipped it, no decision is written over a block verdict to clear it, and AGT-281 stays
-- `delivered` with its decision `open`. The defect was the batch-wide raise, so the fix is
-- fault isolation PER DECISION: one subtransaction per row, a refusal counted and NAMED instead
-- of aborting its 6,006 siblings.
--
-- Rules read for this migration:
--   .claude/rules/supabase-function-signature.md -- a new OUT column is a NEW RETURN TYPE, so the
--     sweep is DROP + CREATE by its full identity argument list, never CREATE OR REPLACE, and
--     exactly one overload is asserted before this migration is called done.
--   .claude/rules/supabase-column-grants.md (SES-315 addendum) -- pg_default_acl grants EXECUTE on
--     a NEW function to anon, authenticated and service_role BY NAME, so a PUBLIC-only revoke
--     leaves them open. The three are revoked by name and both directions are asserted.

-- ---------------------------------------------------------------------------------------------
-- (a) The record gains the two columns the sweep now reports.
-- ---------------------------------------------------------------------------------------------
-- `refused` is NOT NULL DEFAULT 0 so every historical row reads "nothing was refused" rather than
-- NULL, which a grader cannot tell from "this build did not report". service_role holds
-- TABLE-level SELECT/INSERT on runner_finaliser_runs (anon/authenticated hold none), so both new
-- columns are readable by the suite's key with no new grant -- the column-list trap in
-- supabase-column-grants.md does not apply here, and that was checked, not assumed.
alter table public.runner_finaliser_runs
  add column refused  integer not null default 0,
  add column refusals jsonb;

comment on column public.runner_finaliser_runs.refused is
  'AGT-423: decisions this run could not finalise -- a guard refused the row and the sweep rolled THAT row back and carried on. Not an error: the run succeeded.';
comment on column public.runner_finaliser_runs.refusals is
  'AGT-423: one object per refusal, record_skip''s shape -- {decision_id, backlog_id, reason_kind, reason}. jsonb_array_length() = refused.';

-- ---------------------------------------------------------------------------------------------
-- (b) + (c) The sweep, fault-isolated per decision.
-- ---------------------------------------------------------------------------------------------
drop function if exists public.sweep_decision_windows(uuid, text);

create function public.sweep_decision_windows(p_actor_cycle uuid, p_actor_session text)
returns table(finalized integer, promoted integer, closed integer, refused integer, refusals jsonb)
language plpgsql
as $function$
declare
  r        record;
  v_sig    record;
  v_item   public.backlog_items%rowtype;
  v_fin    integer := 0;
  v_pro    integer := 0;
  v_clo    integer := 0;
  v_ref    integer := 0;
  v_refs   jsonb   := '[]'::jsonb;
  v_stamp  timestamptz;
  v_rowpro integer;
  v_rowclo integer;
begin
  finalized := 0; promoted := 0; closed := 0; refused := 0; refusals := '[]'::jsonb;

  if (p_actor_cycle is not null) = (p_actor_session is not null) then
    raise exception 'sweep_decision_windows: exactly one of p_actor_cycle / p_actor_session must be set';
  end if;

  for r in
    select d.*
      from public.runner_decisions d
     where d.status = 'open'
       and d.expires_at <= now()
     order by d.expires_at
       for update skip locked
  loop
    -- AGT-423: ONE DECISION, ONE SUBTRANSACTION. Everything this row writes -- its before-images,
    -- its ladder signal, its own status update and the ticket close -- lives inside the nested
    -- block below, so a raise from ANY of them rolls back THAT ROW ONLY. The decision then stays
    -- `open` and past its expiry, which means it is retried on the next sweep (hourly, at :17) and
    -- reported in `refusals` every time, rather than silently dropped or forced through.
    v_rowpro := 0;
    v_rowclo := 0;
    v_stamp  := r.ladder_applied_at;

    begin
      -- Section 19v: the decision row is about to be written, so its image goes first.
      insert into public.runner_before_images
        (cycle_id, session_name, table_name, pk_value, row_data)
      values (p_actor_cycle, p_actor_session, 'runner_decisions', r.id::text, to_jsonb(r));

      if r.ladder_work_class is not null and r.ladder_applied_at is null then
        -- M6-07: an unreversed decision past its window IS the promote signal. "A decision nobody
        -- reversed is the only evidence of unattended judgment a tap never was."
        select * into v_sig
          from public.ladder_apply_signal(r.ladder_work_class, 'promote', p_actor_cycle, p_actor_session);
        if v_sig.applied then
          v_rowpro := 1;
          v_stamp  := now();          -- counted once, ever
        end if;
      end if;

      update public.runner_decisions d
         set status = 'final', finalized_at = now(), ladder_applied_at = v_stamp
       where d.id = r.id;

      -- FEATURE: SES-320 -- THE EXIT, and it is keyed to the DECISION rather than to the class.
      -- A ship decision that nobody reversed inside its window is the verdict-plus-window that
      -- M5-14 promises for `discovered` / `john-named` work; the rung-driven auto-done bar (7a)
      -- keeps its own, earlier timing for `original` / `gate-review` work. Any class, any epic.
      -- A BLOCK NEVER REACHES HERE as a NEW ship: record_ship_decision() refuses a non-approve
      -- verdict, so the attended block-writes-delivered path (session-setup.md 3e) records no ship
      -- decision. AGT-423: a ship decision recorded BEFORE a later block verdict landed does reach
      -- here, and backlog_done_requires_verdict() refuses it. That refusal is now this row's
      -- business alone -- see the handler.
      if r.kind = 'ship' and r.backlog_id is not null then
        select * into v_item
          from public.backlog_items b
         where b.backlog_id = r.backlog_id
           and b.status = 'delivered'
         order by b.id
         limit 1
           for update;

        if found then
          -- Section 19v, and the decision_id is the SHIP'S OWN id on purpose: the close joins the
          -- ship decision's undo set, so one Reverse undoes the delivery and this close together.
          -- Never a second decision for one delivery.
          insert into public.runner_before_images
            (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
          values (p_actor_cycle, p_actor_session, 'backlog_items', v_item.id::text, to_jsonb(v_item), r.id);

          -- NAMED DEVIATION FROM THE KICKOFF'S LITERAL SQL, disclosed rather than buried (SES-196
          -- convention), carried forward from SES-320 unchanged. The kickoff wrote
          -- `SET status='done', updated_at=now()`. THE updated_at BUMP IS DELIBERATELY OMITTED,
          -- and it is not cosmetic: reverse_decision() refuses any allowlisted row whose live
          -- updated_at postdates the decision's own decided_at (SES-316), and this close runs 72
          -- hours AFTER decided_at. Bumping updated_at here would therefore make every closed
          -- ticket `refused_written_since` on its own ship's Reverse -- the ticket would stay
          -- `done` while the reversal reported `partial`, which is precisely the lie SES-316
          -- exists to prevent. WHEN the close happened is recorded where it belongs --
          -- runner_decisions.finalized_at, and this row's before-image.
          update public.backlog_items b
             set status = 'done'
           where b.id = v_item.id;

          v_rowclo := 1;
        end if;
      end if;

      -- THE COUNTERS MOVE LAST, AND THAT PLACEMENT IS THE WHOLE CORRECTNESS ARGUMENT. PL/pgSQL
      -- local variables SURVIVE a subtransaction rollback -- only database state is rolled back
      -- (plpgsql "Trapping Errors"). Incrementing them inside the work would therefore count a
      -- row the database threw away. Reaching this line means every write above committed to the
      -- subtransaction, so these three increments are the row's receipt.
      v_fin := v_fin + 1;
      v_pro := v_pro + v_rowpro;
      v_clo := v_clo + v_rowclo;

    exception when others then
      -- A GUARD SAID NO. Not an error for the run: the row is rolled back, the decision is still
      -- `open`, and the refusal is NAMED so a reader knows WHICH ticket and WHY -- record_skip's
      -- own {backlog_id, reason_kind, reason} shape, plus the decision id. Nothing is written over
      -- a verdict to clear it; the ticket's own exit is a ratification judgment, not a sweep fix.
      v_ref  := v_ref + 1;
      v_refs := v_refs || jsonb_build_object(
        'decision_id', r.id,
        'backlog_id',  r.backlog_id,
        'reason_kind', 'guard-refused',
        'reason',      sqlerrm);
    end;
  end loop;

  -- B4/B5: a done ticket releases its queue slot. Idempotent, and skipped when nothing closed so
  -- a sweep that finalised only non-ship decisions stays the cheap no-op it has always been.
  if v_clo > 0 then
    perform public.recompute_backlog_queue();
  end if;

  finalized := v_fin; promoted := v_pro; closed := v_clo; refused := v_ref; refusals := v_refs;
  return next;
end;
$function$;

-- ---------------------------------------------------------------------------------------------
-- (d) The grant, closed by NAME.
-- ---------------------------------------------------------------------------------------------
-- pg_default_acl in this project grants EXECUTE on a new function to anon, authenticated and
-- service_role BY NAME the instant it is created (SES-315, found live). `REVOKE ALL ... FROM
-- PUBLIC` removes only the PUBLIC grant and leaves those three standing, and the migration still
-- reports success. All three are named here; the trailing DO block asserts both directions.
revoke all on function public.sweep_decision_windows(uuid, text) from public, anon, authenticated;
grant execute on function public.sweep_decision_windows(uuid, text) to service_role;

-- ---------------------------------------------------------------------------------------------
-- (e) The hourly caller reads all five columns and records the two new ones.
-- ---------------------------------------------------------------------------------------------
-- Its OWN return type is UNCHANGED (finalized, promoted, closed), so CREATE OR REPLACE really
-- replaces it, keeps its ACL and creates no second overload -- the opposite case to (b), and the
-- reason the rule's DROP is not needed here.
create or replace function public.run_window_finaliser()
returns table(finalized integer, promoted integer, closed integer)
language plpgsql
as $function$
declare
  r      record;
  v_sil  jsonb;
  v_ref  integer := 0;
  v_refs jsonb;
begin
  finalized := 0; promoted := 0; closed := 0;

  -- The reading first, in its own block: a failure inside it stores NULL rather than losing the run row.
  begin
    select to_jsonb(s) into v_sil from public.runner_silence() s;
  exception when others then
    v_sil := null;
  end;

  begin
    -- Session attribution: a scheduler is the p_actor_session half of ck_before_image_attribution
    -- (exactly one of cycle / session), and 'pg-cron finaliser' is what every before-image the sweep
    -- writes on this path will carry.
    select s.finalized, s.promoted, s.closed, s.refused, s.refusals into r
      from public.sweep_decision_windows(null, 'pg-cron finaliser') s;
    finalized := coalesce(r.finalized, 0);
    promoted  := coalesce(r.promoted, 0);
    closed    := coalesce(r.closed, 0);
    -- AGT-423: a refusal is part of a SUCCESSFUL run. It goes in its own columns, never in `error`
    -- -- the suite reads `error` as "the finaliser is broken" and a named refusal is the opposite:
    -- proof that one guard held while every other window still closed.
    v_ref     := coalesce(r.refused, 0);
    v_refs    := r.refusals;
    insert into public.runner_finaliser_runs (actor, finalized, promoted, closed, refused, refusals, silence)
    values ('pg-cron finaliser', finalized, promoted, closed, v_ref, v_refs, v_sil);
  exception when others then
    -- The sweep's partial writes roll back with this subtransaction; the RECORD stands. A broken
    -- finaliser is a row with an error, never a silence -- and the suite reads that row. Since
    -- AGT-423 the sweep no longer raises for a refused row, so reaching here means the sweep
    -- itself is broken, which is exactly what this row should say.
    finalized := 0; promoted := 0; closed := 0; v_ref := 0; v_refs := null;
    insert into public.runner_finaliser_runs (actor, finalized, promoted, closed, refused, refusals, error, silence)
    values ('pg-cron finaliser', 0, 0, 0, v_ref, v_refs, left(sqlerrm, 2000), v_sil);
  end;

  -- Keep the record bounded: 90 days at one row an hour is ~2,160 rows.
  delete from public.runner_finaliser_runs f where f.ran_at < now() - interval '90 days';

  return next;
end;
$function$;

-- ---------------------------------------------------------------------------------------------
-- (f) THE ONE-TIME ARREARS ACT, and it is arrears rather than earned autonomy.
-- ---------------------------------------------------------------------------------------------
-- MEASURED LIVE AT THIS SHIP, not argued: 4,234 of the 6,007 expired open decisions carry
-- ladder_work_class with ladder_applied_at null, and 4,142 of those are kind='requirement-check'
-- -- a kind that has promoted a work class ZERO times in the platform's life (21 other kinds
-- have: ship 73, filing 38, directive 32, agent-row 24, ticket-status 23, ticket-scope 30,
-- design-kickoff 20, gate 15, design-ruling 9, removal 8, and more), and whose first row to carry
-- a class at all was 2026-10-02. Handing those 4,142 to ladder_apply_signal in the catch-up would
-- promote a rung every fifth signal with no ceiling on class_autonomy.extra_files (cap_relax_rung
-- is 13), taking bug_fix from rung 6 to ~394 and tooling from 60 to ~372 -- and John's
-- CAP-SCOPE-FILES 3-file cap would stop binding platform-wide.
--
-- So the stamp below PRESERVES the status quo rather than altering history: it marks exactly those
-- 4,142 decisions as already-counted, and the 92 genuine signals of other kinds still pay out in
-- the catch-up. Scoped to `requirement-check` alone and to rows already past expiry -- no other
-- kind, no standing rule changed, no future decision affected. The before-images below ARE the
-- undo, and the single recorded decision names them.
-- One DO block so the count in the decision's own text is the UPDATE's real ROW_COUNT rather than
-- a re-query that a concurrent write could move.
do $arrears$
declare v_img integer; v_n integer;
begin
  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data)
  select 'a2fcf5a4-372c-4da4-95ce-1b950a8f0082'::uuid, 'runner_decisions', d.id::text, to_jsonb(d)
    from public.runner_decisions d
   where d.status = 'open'
     and d.expires_at <= now()
     and d.kind = 'requirement-check'
     and d.ladder_work_class is not null
     and d.ladder_applied_at is null;
  get diagnostics v_img = row_count;

  update public.runner_decisions d
     set ladder_applied_at = now()
   where d.status = 'open'
     and d.expires_at <= now()
     and d.kind = 'requirement-check'
     and d.ladder_work_class is not null
     and d.ladder_applied_at is null;
  get diagnostics v_n = row_count;

  -- The image count and the stamp count must agree, or the undo does not cover the act.
  if v_img <> v_n then
    raise exception 'AGT-423 arrears: % before-images for % stamped rows -- the undo does not cover the act (section 19v)', v_img, v_n;
  end if;

  perform public.record_decision(
    'a2fcf5a4-372c-4da4-95ce-1b950a8f0082'::uuid,
    null,
    'ticket-status',
    'AGT-423',
    format('AGT-423 — the decision-window sweep, fault-isolated per decision: %s expired `requirement-check` decisions stamped ladder_applied_at as ARREARS before the catch-up sweep, so the backlog of windows closes without awarding autonomy nobody earned.', v_n),
    format('`requirement-check` has NEVER been a promote signal on this platform: measured live at this ship, it has promoted a work class 0 times, while 21 other kinds have, and the first requirement-check decision to carry a ladder_work_class at all was 2026-10-02. The 6,007-window backlog is an artefact of the AGT-166 batch-wide raise this ticket fixes, not of 4,142 unattended judgments. Unstamped, the catch-up would have handed ladder_apply_signal those signals, promoting a rung every fifth one with no ceiling on class_autonomy.extra_files (cap_relax_rung 13) — bug_fix 6 to ~394, tooling 60 to ~372 — and John''s CAP-SCOPE-FILES 3-file cap would have stopped binding platform-wide. Stamping them PRESERVES the status quo; it does not alter history, and the 92 genuine signals of other kinds still pay out. Scoped to requirement-check rows already past expiry only: no other kind, no standing rule, no future decision. THE UNDO IS THE BEFORE-IMAGES: %s runner_before_images rows on table_name=''runner_decisions'' for cycle a2fcf5a4-372c-4da4-95ce-1b950a8f0082 carry each row''s pre-stamp image; reverse this decision to restore them.', v_n),
    null);
end $arrears$;

-- ---------------------------------------------------------------------------------------------
-- (g) THE ASSERTIONS. This block RAISES; it never reports success.
-- ---------------------------------------------------------------------------------------------
-- "Never trust the migration's success flag" -- supabase-column-grants.md. Both directions on the
-- grant, exactly one overload on the function, zero rows left under the arrears predicate, and the
-- two new columns present.
do $qa$
declare
  v_overloads integer;
  v_anon      boolean;
  v_auth      boolean;
  v_svc       boolean;
  v_pred      integer;
  v_cols      integer;
begin
  select count(*)::integer into v_overloads
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'sweep_decision_windows' and p.prokind = 'f';
  if v_overloads <> 1 then
    raise exception 'AGT-423 QA: % overload(s) of public.sweep_decision_windows, expected exactly 1 -- a stale overload makes every omitted-parameter call ambiguous and surfaces as an EMPTY RESULT, not a crash (.claude/rules/supabase-function-signature.md)', v_overloads;
  end if;

  -- The DENIED direction.
  v_anon := has_function_privilege('anon', 'public.sweep_decision_windows(uuid, text)', 'EXECUTE');
  v_auth := has_function_privilege('authenticated', 'public.sweep_decision_windows(uuid, text)', 'EXECUTE');
  if v_anon or v_auth then
    raise exception 'AGT-423 QA: EXECUTE on the sweep is still held by anon=% / authenticated=% -- pg_default_acl granted them BY NAME and a PUBLIC-only revoke leaves them (SES-315). This function closes tickets and promotes the autonomy ladder; the browser key must not reach it', v_anon, v_auth;
  end if;

  -- The STILL-WORKING direction. A denial alone proves nothing: the pair is the proof.
  v_svc := has_function_privilege('service_role', 'public.sweep_decision_windows(uuid, text)', 'EXECUTE');
  if not v_svc then
    raise exception 'AGT-423 QA: service_role LOST EXECUTE on the sweep -- the revoke was too wide and the cycle tail, the hourly finaliser and every PostgREST caller are now dead';
  end if;

  -- The arrears predicate is drained.
  select count(*)::integer into v_pred
    from public.runner_decisions d
   where d.status = 'open' and d.expires_at <= now() and d.kind = 'requirement-check'
     and d.ladder_work_class is not null and d.ladder_applied_at is null;
  if v_pred <> 0 then
    raise exception 'AGT-423 QA: % expired requirement-check decision(s) still unstamped -- the catch-up sweep would hand them to ladder_apply_signal and un-bind the file cap', v_pred;
  end if;

  -- The record carries the two new columns.
  select count(*)::integer into v_cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'runner_finaliser_runs'
     and column_name in ('refused', 'refusals');
  if v_cols <> 2 then
    raise exception 'AGT-423 QA: runner_finaliser_runs carries % of the 2 new columns (refused, refusals) -- the hourly record cannot report a refusal it has nowhere to put', v_cols;
  end if;
end $qa$;
