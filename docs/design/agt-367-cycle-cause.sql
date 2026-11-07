-- DeepBench v7.0.976 | docs/design/agt-367-cycle-cause.sql | AGT-367 -- every wasted cycle names its cause.
--
-- THE DEFECT, measured live on `runner_cycles` 2026-11-07 rather than reasoned about: 280 cycles in
-- the last 7 days, 27 of them carrying a `push_sha`. Nothing joined a row to a CAUSE, and
-- `audit_flow_checks()` arm (c) printed one percentage -- "N of M cycles were wasted (P%)" -- which
-- tells a reader that the run is burning budget and nothing at all about what to fix. The cause was
-- already ON the row the whole time: 1103 of 1103 rows whose `last_step` starts
-- `step 0 — pre-boot refusal` parse their reason out of the parens.
--
-- THE CALL (reversible, mine): the cause is DERIVED -- a function plus a view over the rows that
-- already exist -- and never a written column. A column would need every writer in the runner to
-- set it, would be wrong for all 280 rows already filed, and would drift the moment one writer
-- forgot. The VOCABULARY is DATA (pattern:2): `runner_waste_causes` holds the 20 causes, whether
-- each one counts as waste, its plain-language line and the ticket that would burn it down, so
-- adding a cause or re-judging one is an INSERT and not a ship. `docs/runbooks/runner-cycle.md` is
-- untouched: this ticket reports the causes, it does not change what a cycle may do.
--
-- GOVERNING: docs/ARCHITECTURE.md §19v, .claude/rules/supabase-column-grants.md (the grants in (f)
-- and their trailing assertions -- new tables come up with auto-granted public SELECT, SES-78a, and
-- new functions come up EXECUTE-able by anon BY NAME, SES-315, so both are revoked BY NAME here).
--
-- DOWN CAPTURED BEFORE THE UP, never after (a down taken afterwards restores the bug):
--   capture_migration_down('a5697278-4232-4a77-bfa4-fba0a1a8280b', 'agt367_cycle_cause', <(a)-(e)>)
--   -> classification `auto-downable`, 5 objects captured, 0 refusals.
--
-- Mirror of migration `agt367_cycle_cause`, byte-identical.

-- ---------------------------------------------------------------------------------------------
-- (a) THE VOCABULARY, AS DATA. 20 causes. `counts_as_waste` is the judgment -- a cycle that MOVED
--     a ticket, a scheduled routine that ran, and a cycle still running are not waste, and folding
--     them into a waste rate is how the old percentage made a healthy run look sick.
--     `candidate_tickets` is what would burn the cause down, so the reader gets a next action and
--     not just a number.
-- ---------------------------------------------------------------------------------------------
create table public.runner_waste_causes (
  cause             text primary key,
  candidate_tickets text[] not null default '{}',
  counts_as_waste   boolean not null,
  plain             text not null
);

insert into public.runner_waste_causes (cause, candidate_tickets, counts_as_waste, plain) values
  ('moved',            '{}',          false, 'The cycle pushed a commit to dev and moved its ticket. This is the outcome the run exists for, never waste.'),
  ('routine_run',      '{}',          false, 'A scheduled agent run that finished its own work. It ships no ticket by design, so counting it as waste would make a healthy routine look like a failure.'),
  ('in_progress',      '{}',          false, 'The cycle is still running. There is nothing to judge yet.'),
  ('reverted',         '{}',          true,  'The cycle pushed and the push was then reverted, so the work did not survive and the budget still went.'),
  ('ship_no_sha',      '{}',          true,  'The cycle reported a ship but left no commit behind, so nothing reached dev.'),
  ('gated',            '{AGT-308}',   true,  'The cycle stopped at a gate before it built anything and is waiting on a person to decide.'),
  ('permission_stall', '{}',          true,  'The cycle froze on a permission prompt nobody could see or answer, and spent its slot waiting.'),
  ('find_work',        '{}',          true,  'The cycle spent its boot looking for work to do instead of doing any.'),
  ('unattributed',     '{}',          true,  'The cycle ended without recording why. The cause is not on the row, which is the gap this report exists to close.'),
  ('lanes_full_self',  '{}',          true,  'A chained continuation refused itself: the busy lanes it counted included its own run.'),
  ('scheduler_off',    '{}',          true,  'The scheduler was switched off, so the cycle refused before it booted.'),
  ('meter_stale',      '{}',          true,  'The spend meter reading was too old to trust, so the cycle refused before it booted.'),
  ('weekly_wall',      '{}',          true,  'The weekly rest wall had been reached, so the cycle refused before it booted.'),
  ('weekly_pace',      '{}',          true,  'The week was being spent faster than its pace allows, so the cycle refused before it booted.'),
  ('no_budget_row',    '{}',          true,  'No budget row existed for the window, so the cycle refused before it booted.'),
  ('hard_stop',        '{}',          true,  'A hard stop was in force, so the cycle refused before it booted.'),
  ('db_pressure',      '{}',          true,  'The database was under too much pressure to start work, so the cycle refused before it booted.'),
  ('lanes_full',       '{}',          true,  'Every runner lane was already busy, so the cycle refused before it booted.'),
  ('nothing_pickable', '{}',          true,  'No ticket was pickable, so the cycle refused before it booted.'),
  ('unaffordable',     '{}',          true,  'The cheapest pickable ticket cost more than the headroom left, so the cycle refused before it booted.');

-- ---------------------------------------------------------------------------------------------
-- (b) THE DERIVATION, one immutable function over the columns a cycle already writes. ORDER IS THE
--     SPEC: a row that pushed is `moved` before anything else can claim it, a revert beats its own
--     push, a scheduled routine is distinguished from a ship that left no commit, and
--     `in_progress` comes AFTER the stall check so a frozen run reads as frozen and not as busy.
--     The pre-boot arm parses the reason the refusal already wrote into `last_step`.
--
--     `lanes_full_self` is the one arm that needs TWO columns: a chained continuation that refused
--     because the lanes were full counted its own open lane, which is a different defect from a
--     genuinely busy runner and must not be reported as the same one.
-- ---------------------------------------------------------------------------------------------
create or replace function public.runner_cycle_cause(
  p_outcome           text,
  p_push_sha          text,
  p_trigger           text,
  p_notes             text,
  p_last_step         text,
  p_stall_notified_at timestamp with time zone,
  p_ended_at          timestamp with time zone
) returns text
language sql
immutable
as $fn$
  select case
    when p_push_sha is not null and p_outcome is distinct from 'reverted' then 'moved'
    when p_outcome = 'reverted'                                           then 'reverted'
    when p_outcome = 'shipped' and p_notes like 'SCHEDULED-AGENT:%'        then 'routine_run'
    when p_outcome = 'shipped'                                            then 'ship_no_sha'
    when p_outcome = 'gated_before_build'                                 then 'gated'
    when p_stall_notified_at is not null                                  then 'permission_stall'
    when p_ended_at is null                                               then 'in_progress'
    when p_last_step ~ 'pre-boot refusal \((.+)\)' then
      case
        when lower(replace(substring(p_last_step from 'pre-boot refusal \((.+)\)'), ' ', '_')) = 'lanes_full'
             and p_trigger = 'chained (drain continuation)'
          then 'lanes_full_self'
        else lower(replace(substring(p_last_step from 'pre-boot refusal \((.+)\)'), ' ', '_'))
      end
    when p_last_step like 'find-work:%'                                   then 'find_work'
    else 'unattributed'
  end
$fn$;

-- ---------------------------------------------------------------------------------------------
-- (c) THE ROW, WITH ITS CAUSE. One view, the columns a reader acts on plus the derived cause and
--     the vocabulary's judgment joined on. The join is a LEFT join and both members are
--     coalesced: a cause the vocabulary has not met yet still gets a row, still counts as waste
--     (the safe direction -- an unknown cause is a cause nobody has burned down) and still shows
--     an empty candidate list, rather than vanishing from the report.
-- ---------------------------------------------------------------------------------------------
create or replace view public.runner_cycle_causes as
select x.id,
       x.item_id,
       x.started_at,
       x.ended_at,
       x.outcome,
       x.trigger,
       x.push_sha,
       x.last_step,
       x.cause,
       coalesce(w.candidate_tickets, '{}') as candidate_tickets,
       coalesce(w.counts_as_waste, true)   as counts_as_waste
  from (select c.id, c.item_id, c.started_at, c.ended_at, c.outcome, c.trigger, c.push_sha,
               c.last_step,
               public.runner_cycle_cause(c.outcome, c.push_sha, c.trigger, c.notes, c.last_step,
                                         c.stall_notified_at, c.ended_at) as cause
          from public.runner_cycles c) x
  left join public.runner_waste_causes w on w.cause = x.cause;

-- ---------------------------------------------------------------------------------------------
-- (d) THE COUNT, per cause, over a window. This is what a reader and the brief both ask for, and
--     it is the one place the grouping is done -- no caller recounts it.
-- ---------------------------------------------------------------------------------------------
create or replace function public.runner_waste_by_cause(p_hours integer default 168)
returns table(cause text, candidate_tickets text[], counts_as_waste boolean, n integer)
language sql
stable
as $fn$
  select v.cause, v.candidate_tickets, v.counts_as_waste, count(*)::integer
    from public.runner_cycle_causes v
   where v.started_at >= now() - p_hours * interval '1 hour'
   group by v.cause, v.candidate_tickets, v.counts_as_waste
   order by count(*) desc, v.cause
$fn$;

-- ---------------------------------------------------------------------------------------------
-- (e) ARM (c) OF audit_flow_checks() NAMES THE CAUSES. Built FROM the live pg_get_functiondef and
--     not retyped: retyping a 150-line plpgsql body to change five fragments is how an unrelated
--     line gets lost. Each fragment is asserted to occur EXACTLY ONCE before it is replaced, so a
--     body that drifted under this migration fails here instead of being silently half-edited.
--     Same signature, so no overload is created (.claude/rules/supabase-function-signature.md).
-- ---------------------------------------------------------------------------------------------
do $agt367e$
declare
  src   text;
  pair  text[];
  f_old text;
  f_new text;
  hits  integer;
  pairs text[][] := array[
    array[
      $f$v_builds integer;$f$,
      $f$v_builds integer;
  v_causes text;$f$
    ],
    array[
      $f$IF v_total >= (t->>'wasted_min_cycles')$f$,
      $f$SELECT string_agg(w.cause || ' ' || w.n, ', ' ORDER BY w.n DESC, w.cause) INTO v_causes FROM public.runner_waste_by_cause((t->>'window_hours')::integer) w WHERE w.counts_as_waste;
  IF v_total >= (t->>'wasted_min_cycles')$f$
    ],
    array[
      $f$%s shipped with no push_sha'$f$,
      $f$%s shipped with no push_sha; by cause: %s'$f$
    ],
    array[
      $f$v_gated, v_dnr, v_nosha))),$f$,
      $f$v_gated, v_dnr, v_nosha, coalesce(v_causes, 'none')))),$f$
    ],
    array[
      $f$'Read the wasted cycles'' last_step and notes for the common cause and remove it before the next run.'$f$,
      $f$'Burn the causes down: runner_cycle_causes names each cycle''s cause, runner_waste_causes its candidate ticket.'$f$
    ]
  ];
begin
  select pg_get_functiondef(p.oid) into src
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'audit_flow_checks' and p.prokind = 'f';
  if src is null then
    raise exception 'AGT-367 (e): public.audit_flow_checks() was not found -- refusing to invent a body';
  end if;

  foreach pair slice 1 in array pairs loop
    f_old := pair[1];
    f_new := pair[2];
    hits  := (length(src) - length(replace(src, f_old, ''))) / length(f_old);
    if hits <> 1 then
      raise exception 'AGT-367 (e): fragment %... occurs % time(s) in audit_flow_checks(), expected exactly 1',
        left(f_old, 48), hits;
    end if;
    src := replace(src, f_old, f_new);
  end loop;

  execute src;
end
$agt367e$;

-- ---------------------------------------------------------------------------------------------
-- (f) THE GRANTS, AND THE GATE. Both defaults in this project point the wrong way and each has
--     bitten it live: a NEW TABLE comes up with auto-granted public SELECT (SES-78a, found on the
--     six runner_ tables), and a NEW FUNCTION comes up EXECUTE-able by anon, authenticated and
--     service_role granted BY NAME in pg_default_acl (SES-315) -- where
--     `REVOKE ALL ON FUNCTION ... FROM PUBLIC` removes only the PUBLIC grant, reports success, and
--     leaves the function open to the anon key that ships in the browser bundle. So the three roles
--     are revoked BY NAME, and the migration's own success flag is never the evidence: the trailing
--     DO asserts BOTH DIRECTIONS -- anon denied on all four objects AND service_role still able to
--     read and call them, because a gate that fails for an unrelated reason looks identical to a
--     gate that works.
-- ---------------------------------------------------------------------------------------------
revoke select on public.runner_waste_causes  from anon, authenticated;
revoke select on public.runner_cycle_causes  from anon, authenticated;

revoke all on function public.runner_cycle_cause(text, text, text, text, text, timestamp with time zone, timestamp with time zone) from public, anon, authenticated;
revoke all on function public.runner_waste_by_cause(integer) from public, anon, authenticated;

grant select on public.runner_waste_causes to service_role;
grant select on public.runner_cycle_causes to service_role;
grant execute on function public.runner_cycle_cause(text, text, text, text, text, timestamp with time zone, timestamp with time zone) to service_role;
grant execute on function public.runner_waste_by_cause(integer) to service_role;

do $agt367f$
declare
  v_cycle_cause text := 'public.runner_cycle_cause(text, text, text, text, text, timestamp with time zone, timestamp with time zone)';
  v_by_cause    text := 'public.runner_waste_by_cause(integer)';
  v_rows        integer;
  v_procs       integer;
  v_unattr      integer;
begin
  -- Direction 1: the anon key, which ships in the browser bundle, reaches NONE of the four.
  if has_table_privilege('anon', 'public.runner_waste_causes', 'SELECT') then
    raise exception 'AGT-367 (f): anon can still SELECT public.runner_waste_causes';
  end if;
  if has_table_privilege('anon', 'public.runner_cycle_causes', 'SELECT') then
    raise exception 'AGT-367 (f): anon can still SELECT public.runner_cycle_causes';
  end if;
  if has_function_privilege('anon', v_cycle_cause, 'EXECUTE') then
    raise exception 'AGT-367 (f): anon can still EXECUTE runner_cycle_cause -- REVOKE ... FROM PUBLIC does not close a function in this project (SES-315)';
  end if;
  if has_function_privilege('anon', v_by_cause, 'EXECUTE') then
    raise exception 'AGT-367 (f): anon can still EXECUTE runner_waste_by_cause -- REVOKE ... FROM PUBLIC does not close a function in this project (SES-315)';
  end if;

  -- Direction 2: and the key the runner actually uses still reads and still calls. Without this
  -- half, a revoke that locked everyone out would pass the four assertions above.
  if not (has_table_privilege('service_role', 'public.runner_waste_causes', 'SELECT')
          and has_table_privilege('service_role', 'public.runner_cycle_causes', 'SELECT')) then
    raise exception 'AGT-367 (f): service_role lost SELECT on the cause table or the cause view';
  end if;
  if not (has_function_privilege('service_role', v_cycle_cause, 'EXECUTE')
          and has_function_privilege('service_role', v_by_cause, 'EXECUTE')) then
    raise exception 'AGT-367 (f): service_role lost EXECUTE on the cause function or the window count';
  end if;

  select count(*)::integer into v_rows from public.runner_waste_causes;
  if v_rows <> 20 then
    raise exception 'AGT-367 (a): the vocabulary holds % row(s), expected 20', v_rows;
  end if;

  select count(*)::integer into v_procs
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'audit_flow_checks' and p.prokind = 'f';
  if v_procs <> 1 then
    raise exception 'AGT-367 (e): audit_flow_checks has % pg_proc row(s), expected exactly 1 (.claude/rules/supabase-function-signature.md)', v_procs;
  end if;

  -- The premise, asserted rather than recalled: every pre-boot refusal row carries its reason in
  -- `last_step`, so NONE of them may come out of the view as `unattributed`. A regex that stopped
  -- matching would land every one of them in that bucket and this is the clause that would catch it.
  select count(*)::integer into v_unattr
    from public.runner_cycle_causes
   where last_step like 'step 0 — pre-boot refusal%' and cause = 'unattributed';
  if v_unattr <> 0 then
    raise exception 'AGT-367 (b): % pre-boot refusal row(s) came out unattributed -- the reason is on the row and the parse missed it', v_unattr;
  end if;
end
$agt367f$;
