-- DeepBench v7.0.1016 | docs/design/agt-590-outcome-columns.sql | AGT-590
-- Migration `agt590_outcome_columns` -- apply via apply_migration AFTER
-- capture_migration_down(:C, 'agt590_outcome_columns',
--   '[{"kind":"table","identity":"public.runner_decisions"},
--     {"kind":"table","identity":"public.runner_finaliser_runs"}]'::jsonb)  (kickoff section 4, T2).
-- :C = '53254e08-1c19-410f-a23c-257dce9b2177'::uuid (cycle 53254e08-1c19-410f-a23c-257dce9b2177).
--
-- THE DOWN IS HONESTLY `refused`, AND THAT IS REPORTED RATHER THAN WORKED AROUND. This is an
-- in-place ALTER: capture_migration_down() refuses one by design, and the only undo is a column
-- drop, which the tool layer holds for an attended confirmation (cycle a2fcf5a4, AGT-548). So the
-- recorded range of this migration is card-only, said out loud at 8a -- the shape
-- `ses254_epic_id_review_only` already set. The FUNCTION migration that follows
-- (`agt590_sweep_isolation_hold`) captures an `auto-downable` down; this one cannot and does not
-- pretend to.
--
-- WHY IT IS ITS OWN MIGRATION, APPLIED FIRST (harvest C5). The timed probe (T3) runs the new sweep
-- body, which reads `refused_at`. Adding these columns inside the probe would hold an ACCESS
-- EXCLUSIVE lock on runner_decisions for the probe's whole duration. Four additive columns rewrite
-- 0 rows and change 0 behaviour: nothing reads or writes them until the function migration lands,
-- and if this ticket stopped here they would simply sit unused.
--
-- WHY THESE FOUR (harvest C2, pattern:17 / pattern:93). The per-row outcome belongs on the row.
-- Finalised is already per-row (`status`, `finalized_at`); promoted is already per-row
-- (`ladder_applied_at`); the one outcome with nowhere to live is the REFUSAL -- today a guard's
-- 23514 aborts the whole batch and the reason survives only in an hourly `error` string. So the
-- decision row gains `refused_at` / `refusal_reason`, and the hourly record gains the count and
-- the named list.
--
-- Rules read for this migration:
--   .claude/rules/supabase-column-grants.md -- a column's readability comes from the TABLE grant
--     unless the grant is already a column list, and "never trust the migration's success flag":
--     the closing block asserts BOTH directions (denied for anon/authenticated, still working for
--     service_role) rather than reporting success.
--   .claude/rules/supabase-function-signature.md -- no function is touched here.

-- ---------------------------------------------------------------------------------------------
-- The four columns. `if not exists` on every one: AGT-423's (a) shipped the same two columns on
-- runner_finaliser_runs in a mirror that was never applied, and a re-run of this file must be a
-- no-op rather than a 42701.
-- ---------------------------------------------------------------------------------------------
-- `refused_at` is the first refusal of the CURRENT streak, not the latest: the handler writes only
-- when the reason CHANGES, so a row stuck for a month carries one timestamp and one image, never
-- 24 a day for ever.
alter table public.runner_decisions
  add column if not exists refused_at     timestamptz,
  add column if not exists refusal_reason text;

-- `refused` is NOT NULL DEFAULT 0 so every historical row reads "nothing was refused" rather than
-- NULL, which a grader cannot tell from "this build did not report".
alter table public.runner_finaliser_runs
  add column if not exists refused  integer not null default 0,
  add column if not exists refusals jsonb;

comment on column public.runner_decisions.refused_at is
  'AGT-590: when the CURRENT refusal streak began -- set by sweep_decision_windows()''s per-row handler on the first refusal and left alone while the reason is unchanged. Cleared the moment the row finalises.';
comment on column public.runner_decisions.refusal_reason is
  'AGT-590: `<sqlstate> <sqlerrm>` from the guard that refused this row, left(…, 2000). Rewritten only when the reason CHANGES, with a before-image. Cleared the moment the row finalises.';
comment on column public.runner_finaliser_runs.refused is
  'AGT-590: decisions STANDING refused at this run -- a guard refused the row, the sweep rolled THAT row back and carried on. Not an error: the run succeeded.';
comment on column public.runner_finaliser_runs.refusals is
  'AGT-590: one object per standing refusal -- {decision_id, backlog_id, reason}, oldest window first. jsonb_array_length() = refused.';

-- ---------------------------------------------------------------------------------------------
-- THE ASSERTIONS (harvest section B1). This block RAISES; it never reports success.
-- ---------------------------------------------------------------------------------------------
-- If this raises on anon/authenticated, the table carries a public grant nobody measured: STOP and
-- report. A grant or a revoke is NOT added in this ticket.
do $qa$
declare v_cols integer; v_bad text;
begin
  select count(*)::integer into v_cols
    from information_schema.columns
   where table_schema = 'public'
     and (table_name, column_name) in (('runner_decisions','refused_at'), ('runner_decisions','refusal_reason'),
                                       ('runner_finaliser_runs','refused'), ('runner_finaliser_runs','refusals'));
  if v_cols <> 4 then
    raise exception 'AGT-590 QA: % of the 4 outcome columns exist', v_cols;
  end if;

  select string_agg(x.t || '.' || x.c || ' for ' || y.r, ', ') into v_bad
    from (values ('runner_decisions','refused_at'), ('runner_decisions','refusal_reason'),
                 ('runner_finaliser_runs','refused'), ('runner_finaliser_runs','refusals')) as x(t, c)
   cross join (values ('anon', false), ('authenticated', false), ('service_role', true)) as y(r, want)
   where has_column_privilege(y.r, 'public.' || x.t, x.c, 'SELECT') is distinct from y.want;
  if v_bad is not null then
    raise exception 'AGT-590 QA: SELECT must be false for anon and authenticated and true for service_role; wrong for: %', v_bad;
  end if;
end $qa$;
