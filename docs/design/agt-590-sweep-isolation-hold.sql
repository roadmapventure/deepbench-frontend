-- DeepBench v7.0.1016 | docs/design/agt-590-sweep-isolation-hold.sql | AGT-590
-- Migration `agt590_sweep_isolation_hold` -- apply via apply_migration AFTER
-- capture_migration_down(:C, 'agt590_sweep_isolation_hold',
--   '[{"kind":"function","identity":"public.sweep_decision_windows(uuid, text)"},
--     {"kind":"function","identity":"public.run_window_finaliser()"}]'::jsonb)  (kickoff section 4, T4).
-- :C = '53254e08-1c19-410f-a23c-257dce9b2177'::uuid (cycle 53254e08-1c19-410f-a23c-257dce9b2177).
-- Requires `agt590_outcome_columns` (docs/design/agt-590-outcome-columns.sql) applied first.
--
-- WHAT THIS CHANGES AND WHY, measured rather than argued. public.sweep_decision_windows(uuid,text)
-- does every expired decision in ONE transaction. Its ship branch ends in
-- `update public.backlog_items set status='done'`, which raises 23514 through
-- backlog_done_requires_verdict() (AGT-166) for a ticket whose latest verdict is a `block` -- and
-- that raise aborts the WHOLE call. Coordinator-measured live 2026-11-13 07:50Z: 9,777 decisions
-- `open` past `expires_at` (oldest window 2026-10-05 09:24:41+00), 83 of kind `ship`; 0 decisions
-- finalised in 30 days; last successful finalise 2026-10-05 09:17:00+00 -- 39 days; 225 tickets
-- standing at `delivered`. The error the hourly record carries names AGT-281 and a verdict block
-- (38959e02-fdd5-4858-bf19-11fc48fdc5d2); it names no decision row, so nothing here assumes a row
-- id -- the refused row is found by its RECORDED REASON.
--
-- THE GUARD IS CORRECT AND IS NOT TOUCHED. backlog_done_requires_verdict() stays exactly as
-- AGT-166 shipped it, no decision is written over a block verdict to clear it, and AGT-281 stays
-- `delivered` with its decision `open`. The defect is the batch-wide raise, so the fix is fault
-- isolation PER DECISION: one subtransaction per row, a refusal RECORDED ON THE ROW instead of
-- aborting its 9,776 siblings.
--
-- THREE THINGS THIS DELIBERATELY DOES NOT DO (Development Manager, decision
-- b3ea67a3-2d48-430c-a129-2037126ab4a7 -- the waived build is "AGT-590's own Fix and Test text and
-- nothing more ... with the ladder arrears HELD"):
--   1. THE HOLD. 4,868 of the expired-open decisions carry a ladder_work_class with
--      ladder_applied_at null (measured 07:55Z, 6 work classes). Handing those to
--      ladder_apply_signal during the catch-up would promote a rung every fifth signal with no
--      ceiling on class_autonomy.extra_files, and John's CAP-SCOPE-FILES 3-file cap would stop
--      binding platform-wide. So `c_hold` below is a CUT-OFF, not a stamp: a window that expired
--      BEFORE it finalises with NO ladder call and its ladder_applied_at left exactly as it was
--      (null for the arrears, readable and reversible on its own row). A window expiring at or
--      after the cut-off pays precisely as the live body pays today -- M6-07 is DEFERRED for the
--      outage's windows, never weakened for new work (pattern:166).
--      NOT THIS TICKET: paying or stamping the held signals. That is a later ruling, and nothing
--      here decides it. Held set:
--        status='final' and ladder_work_class is not null and ladder_applied_at is null
--        and expires_at < c_hold.
--   2. NO ARREARS STAMP. AGT-423's section (f) wrote ladder_applied_at over 4,142 rows and
--      recorded a decision for it. That is a data statement about what the ladder will ever count;
--      it is omitted entirely. No DML outside the two function bodies ships in this file.
--   3. AGT-281's own exit is John's, and AGT-423 is superseded.
--
-- A PER-RUN BOUND, SIZED BY A MEASUREMENT (harvest C4). 9,777 subtransactions, each with a
-- before-image insert, inside one statement is untimed; if it does not fit the 120 s
-- statement_timeout, nothing commits and every later :17 fails the same way -- the present stall
-- with a new cause. `c_max` below is set from the rolled-back timed probe (kickoff T3), targeting
-- ~20 s a run: one sixth of the statement timeout, one third of the 60 s tool ceiling. Steady
-- state needs about 10 windows an hour (9,777 in 39 days), so the bound keeps up with ease and
-- the backlog drains in ceil(9,777 / c_max) runs.
-- `order by d.refused_at nulls first, d.expires_at`: with a bound and plain expiry order the
-- oldest REFUSED rows would hold the head of every batch for ever and stall the platform again.
-- Never-refused rows go first; refused rows are retried with the capacity left over.
--
-- Rules read for this migration:
--   .claude/rules/supabase-function-signature.md -- THE SIGNATURE AND RETURN TYPE ARE UNCHANGED ON
--     PURPOSE. (uuid, text) returns table(finalized integer, promoted integer, closed integer) is
--     what lives today, verified against live pg_get_functiondef before this file was written, so
--     CREATE OR REPLACE is a TRUE in-place replace: no second overload, no ambiguity, no empty
--     result on an omitted-parameter call, and the cycle tail's and run_window_finaliser()'s
--     three-column reads keep working. AGT-423 needed a DROP because it ADDED two OUT columns;
--     this file does not add any, which is why there is no DROP here. The closing block asserts
--     exactly one overload of each function and the exact result type anyway -- the rule's "assert
--     it, never trust the success flag".
--   .claude/rules/supabase-column-grants.md (SES-315 addendum) -- pg_default_acl grants EXECUTE on
--     a function to anon, authenticated and service_role BY NAME, and `REVOKE ALL ... FROM PUBLIC`
--     leaves those three standing while the migration reports success. All three are revoked by
--     name, for BOTH functions, and the closing block asserts BOTH directions.

-- ---------------------------------------------------------------------------------------------
-- (b) + (c) The sweep: fault-isolated per decision, bounded per run, ladder held before the
-- cut-off. CREATE OR REPLACE -- see the signature rule above; there is deliberately no DROP.
-- ---------------------------------------------------------------------------------------------
create or replace function public.sweep_decision_windows(p_actor_cycle uuid, p_actor_session text)
returns table(finalized integer, promoted integer, closed integer)
language plpgsql
as $function$
declare
  r        record;
  v_sig    record;
  v_item   public.backlog_items%rowtype;
  v_fin    integer := 0;
  v_pro    integer := 0;
  v_clo    integer := 0;
  v_stamp  timestamptz;
  v_rowpro integer;
  v_rowclo integer;
  v_why    text;
  -- THE HOLD CUT-OFF. Set to the next whole UTC hour after this migration is applied, so no
  -- window that expired before the apply can be paid, and no fresh work is held for more than an
  -- hour. The closing QA block REFUSES a cut-off that is in the past or more than 3 hours ahead.
  c_hold   constant timestamptz := '2026-11-13 10:00:00+00';
  -- THE PER-RUN BOUND, from the rolled-back timed probe: min(5000, floor(100000 / ms) * 100).
  c_max    constant integer := 5000;
begin
  finalized := 0; promoted := 0; closed := 0;

  if (p_actor_cycle is not null) = (p_actor_session is not null) then
    raise exception 'sweep_decision_windows: exactly one of p_actor_cycle / p_actor_session must be set';
  end if;

  for r in
    select d.*
      from public.runner_decisions d
     where d.status = 'open'
       and d.expires_at <= now()
     order by d.refused_at nulls first, d.expires_at
     limit c_max
       for update skip locked
  loop
    -- AGT-423/AGT-590: ONE DECISION, ONE SUBTRANSACTION. Everything this row writes -- its
    -- before-images, its ladder signal, its own status update and the ticket close -- lives inside
    -- the nested block below, so a raise from ANY of them rolls back THAT ROW ONLY. The decision
    -- then stays `open` and past its expiry, which means it is retried on the next sweep (hourly,
    -- at :17) and carries its own named refusal until it either finalises or the reason changes,
    -- rather than being silently dropped or forced through.
    v_rowpro := 0;
    v_rowclo := 0;
    v_stamp  := r.ladder_applied_at;

    begin
      -- Section 19v: the decision row is about to be written, so its image goes first.
      insert into public.runner_before_images
        (cycle_id, session_name, table_name, pk_value, row_data)
      values (p_actor_cycle, p_actor_session, 'runner_decisions', r.id::text, to_jsonb(r));

      if r.ladder_work_class is not null and r.ladder_applied_at is null
         and r.expires_at >= c_hold then
        -- M6-07: an unreversed decision past its window IS the promote signal. "A decision nobody
        -- reversed is the only evidence of unattended judgment a tap never was."
        -- AGT-590 HOLD: a window that expired BEFORE c_hold does not reach here at all -- no
        -- ladder_apply_signal call, no stamp, no rung moved, and its ladder_applied_at stays null
        -- so the signal remains readable and payable by a later ruling.
        select * into v_sig
          from public.ladder_apply_signal(r.ladder_work_class, 'promote', p_actor_cycle, p_actor_session);
        if v_sig.applied then
          v_rowpro := 1;
          v_stamp  := now();          -- counted once, ever
        end if;
      end if;

      -- A ROW THAT FINALISES CLEARS ITS REFUSAL. The columns describe a STANDING refusal, so they
      -- must not outlive it: a stale refusal_reason on a `final` row would be read as a live stall.
      update public.runner_decisions d
         set status = 'final', finalized_at = now(), ladder_applied_at = v_stamp,
             refused_at = null, refusal_reason = null
       where d.id = r.id;

      -- FEATURE: SES-320 -- THE EXIT, and it is keyed to the DECISION rather than to the class.
      -- A ship decision that nobody reversed inside its window is the verdict-plus-window that
      -- M5-14 promises for `discovered` / `john-named` work; the rung-driven auto-done bar (7a)
      -- keeps its own, earlier timing for `original` / `gate-review` work. Any class, any epic.
      -- A BLOCK NEVER REACHES HERE as a NEW ship: record_ship_decision() refuses a non-approve
      -- verdict, so the attended block-writes-delivered path (session-setup.md 3e) records no ship
      -- decision. A ship decision recorded BEFORE a later block verdict landed does reach here,
      -- and backlog_done_requires_verdict() refuses it. That refusal is now this row's business
      -- alone -- see the handler.
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
          -- convention). The kickoff wrote `SET status='done', updated_at=now()`. THE updated_at
          -- BUMP IS DELIBERATELY OMITTED, and it is not cosmetic: reverse_decision() refuses any
          -- allowlisted row whose live updated_at postdates the decision's own decided_at
          -- (SES-316), and this close runs 72 hours AFTER decided_at. Bumping updated_at here
          -- would therefore make every closed ticket `refused_written_since` on its own ship's
          -- Reverse -- the ticket would stay `done` while the reversal reported `partial`, which
          -- is precisely the lie SES-316 exists to prevent, and it would break this ticket's own
          -- design rule that one Reverse undoes one delivery. Same direction SES-316 took with the
          -- claim/release writes: a write that carries no independent judgment does not bump the
          -- column the undo guard reads. WHEN the close happened is recorded where it belongs --
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
      -- The row's own subtransaction is rolled back: the decision stays `open` and is retried.
      -- AGT-590: the outcome is RECORDED ON THE ROW, and only when the reason CHANGED -- a row
      -- stuck for a month then carries ONE refusal timestamp and ONE before-image, not 24 a day
      -- for ever. `exception when others` does not trap query_canceled, so a statement timeout
      -- still aborts the whole call and reaches run_window_finaliser()'s error row: a timeout is
      -- the sweep being broken, not a row being refused. If the handler's own two writes raise,
      -- the whole sweep aborts and the hourly row carries THAT error -- swallowing it would be the
      -- swallowed reason this ticket exists to remove.
      v_why := left(sqlstate || ' ' || sqlerrm, 2000);
      if r.refusal_reason is distinct from v_why then
        insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data)
        values (p_actor_cycle, p_actor_session, 'runner_decisions', r.id::text, to_jsonb(r));
        update public.runner_decisions d
           set refused_at = coalesce(r.refused_at, now()), refusal_reason = v_why
         where d.id = r.id;
      end if;
    end;
  end loop;

  -- B4/B5: a done ticket releases its queue slot. Idempotent, and skipped when nothing closed so
  -- a sweep that finalised only non-ship decisions stays the cheap no-op it has always been.
  if v_clo > 0 then
    perform public.recompute_backlog_queue();
  end if;

  finalized := v_fin; promoted := v_pro; closed := v_clo;
  return next;
end;
$function$;

-- ---------------------------------------------------------------------------------------------
-- (d) The grants, closed by NAME -- for BOTH functions.
-- ---------------------------------------------------------------------------------------------
-- pg_default_acl in this project grants EXECUTE on a function to anon, authenticated and
-- service_role BY NAME (SES-315, found live). `REVOKE ALL ... FROM PUBLIC` removes only the PUBLIC
-- grant and leaves those three standing, and the migration still reports success. Both functions
-- close tickets and move the autonomy ladder; the browser key must not reach either. The trailing
-- DO block asserts both directions for both.
revoke all on function public.sweep_decision_windows(uuid, text) from public, anon, authenticated;
grant execute on function public.sweep_decision_windows(uuid, text) to service_role;

revoke all on function public.run_window_finaliser() from public, anon, authenticated;
grant execute on function public.run_window_finaliser() to service_role;

-- ---------------------------------------------------------------------------------------------
-- (e) The hourly caller records the refusals the sweep left standing.
-- ---------------------------------------------------------------------------------------------
-- Its OWN return type is UNCHANGED (finalized, promoted, closed), so CREATE OR REPLACE really
-- replaces it, keeps its ACL and creates no second overload.
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
    select s.finalized, s.promoted, s.closed into r
      from public.sweep_decision_windows(null, 'pg-cron finaliser') s;
    finalized := coalesce(r.finalized, 0);
    promoted  := coalesce(r.promoted, 0);
    closed    := coalesce(r.closed, 0);

    -- AGT-590: a refusal is part of a SUCCESSFUL run. It goes in its own columns, never in `error`
    -- -- the suite reads `error` as "the finaliser is broken" and a named refusal is the opposite:
    -- proof that one guard held while every other window still closed. This reads the STANDING
    -- refusals (status `open` with a refusal recorded), which is what a reader of a stall needs:
    -- it does not depend on what this particular run happened to touch, and a row that finalised
    -- cleared its own columns on the way out. One filter over one table once an hour -- not a join
    -- or a lateral, so the AGT-463 EXPLAIN rule does not apply and no index is added.
    select count(*)::integer,
           coalesce(jsonb_agg(jsonb_build_object('decision_id', d.id, 'backlog_id', d.backlog_id,
                                                 'reason', d.refusal_reason) order by d.expires_at), '[]'::jsonb)
      into v_ref, v_refs
      from public.runner_decisions d
     where d.status = 'open' and d.refused_at is not null;

    insert into public.runner_finaliser_runs (actor, finalized, promoted, closed, refused, refusals, silence)
    values ('pg-cron finaliser', finalized, promoted, closed, v_ref, v_refs, v_sil);
  exception when others then
    -- The sweep's partial writes roll back with this subtransaction; the RECORD stands. A broken
    -- finaliser is a row with an error, never a silence -- and the suite reads that row. Since the
    -- sweep no longer raises for a refused row, reaching here means the sweep ITSELF is broken
    -- (a statement timeout, say, which `exception when others` inside the sweep does not trap),
    -- which is exactly what this row should say.
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
-- (g) THE ASSERTIONS (harvest section B4). This block RAISES; it never reports success.
-- ---------------------------------------------------------------------------------------------
-- "Never trust the migration's success flag" -- supabase-column-grants.md. Exactly one overload of
-- each function, the exact three-column result type, the handler and the cut-off actually present
-- in the DEPLOYED body, both grant directions for both functions, and a cut-off that is 0-3 hours
-- ahead of this apply.
do $qa$
declare v_n integer; v_res text; v_src text; f text;
begin
  foreach f in array array['sweep_decision_windows', 'run_window_finaliser'] loop
    select count(*)::integer into v_n
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = f;
    if v_n <> 1 then
      raise exception 'AGT-590 QA: % overload(s) of public.%, expected exactly 1 (.claude/rules/supabase-function-signature.md)', v_n, f;
    end if;
  end loop;

  select pg_get_function_result(p.oid), p.prosrc into v_res, v_src
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'sweep_decision_windows';
  if v_res <> 'TABLE(finalized integer, promoted integer, closed integer)' then
    raise exception 'AGT-590 QA: the sweep returns %, not the three SES-320 columns', v_res;
  end if;
  if position('exception when others' in v_src) = 0 or position('c_hold' in v_src) = 0 then
    raise exception 'AGT-590 QA: the deployed sweep lacks the per-row handler or the hold cut-off';
  end if;

  foreach f in array array['public.sweep_decision_windows(uuid, text)', 'public.run_window_finaliser()'] loop
    if has_function_privilege('anon', f, 'EXECUTE') or has_function_privilege('authenticated', f, 'EXECUTE') then
      raise exception 'AGT-590 QA: EXECUTE on % is still held by anon or authenticated (SES-315: revoke by name)', f;
    end if;
    if not has_function_privilege('service_role', f, 'EXECUTE') then
      raise exception 'AGT-590 QA: service_role lost EXECUTE on % -- the revoke was too wide', f;
    end if;
  end loop;

  if not (timestamptz '2026-11-13 10:00:00+00' >= now() and timestamptz '2026-11-13 10:00:00+00' <= now() + interval '3 hours') then
    raise exception 'AGT-590 QA: the hold cut-off is not 0-3 hours ahead of this apply -- set :H in both places and apply the corrected file';
  end if;
end $qa$;
