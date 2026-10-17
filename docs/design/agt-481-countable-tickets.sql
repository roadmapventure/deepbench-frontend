-- AGT-481 (v7.0.854) -- THE COUNTABLE-TICKET SENSOR. The floor has a target -- ten open tickets
-- scored 3 or greater on each `executing` project (AGT-432, John's VICTORIA-PRIORITIZE duty) -- and
-- until this migration no `public` function could count what the target counts. Measured live
-- 2026-10-17 on tree `c2a55ae`, not reasoned about: a `pg_proc` scan found no function of either
-- name, and `runner_should_boot()` counts only `pickable_count` / `list_tickets` -- the PICK's
-- numbers, which are a different question (the pick asks "what may I take NOW", the floor asks
-- "how much takeable work does this project still hold"). So Victoria's own duty had no sensor.
--
-- WHAT A COUNTABLE TICKET IS -- eight predicates, every one of them a rule that already exists
-- somewhere on this board, read from its existing home rather than restated (pattern:17/8):
--   P1 status open or partial          P5 latest grade reason does not begin PARKED (DL-09)
--   P2 need_score >= 3                 P6 no undecided `gated_before_build` card (AGT-253)
--   P3 an unreversed requirement-check P7 no `needs-` design flag (needs-decision / -desktop /
--      row exists (AGT-280's gate)        -john, live 2026-10-17)
--   P4 no blocker outside              P8 no claim younger than countable_claim_hours()
--      backlog_unblocking_statuses()
--
-- WHY `countable_claim_hours()` IS ITS OWN FUNCTION AND NOT THE PICK'S 24 (pattern:2/18): John's
-- decision 10 sets SIX hours for this question, and `claim_stale_hours` = 24 is the PICK's number.
-- Two different numbers answering two different questions, so the floor's number gets its own home
-- -- declared once, as a constant function, which `AGT-482` reuses rather than re-deciding.
--
-- WHY `service_role` ONLY: the sensor reads the whole board's grading and claim state. Postgres
-- grants EXECUTE to anon, authenticated and service_role BY NAME the instant a function is
-- created, and `REVOKE ... FROM PUBLIC` does not touch those named grants
-- (.claude/rules/supabase-column-grants.md, SES-315 addendum). Revoked by name below; the GATE
-- asserts both directions rather than trusting the migration's success flag.
--
-- THIS FILE IS THE MIRROR of the migration `agt481_countable_tickets`, to be applied via mcp
-- Supabase `apply_migration` (which wraps the whole file in ONE transaction, so no BEGIN/COMMIT
-- here -- and so the trailing GATE's RAISE rolls every statement below back). Kickoff:
-- docs/kickoffs/v7.0.854-AGT-481-countable-tickets.md; reasoning: docs/harvests/AGT-481.md.
--
-- =================================================================================================
-- *** APPLIED 2026-10-17 by cycle a733e240-8ef8-441c-a816-8dd34cadc250 -- THIS IS NOW THE MIRROR. ***
-- =================================================================================================
--
-- The builder lane held no `apply_migration` capability, so the two steps below were run by the
-- ORCHESTRATOR lane of that cycle, in this order (runbook step 6, kickoff T1(a)/T1(b)):
--
--   (a) THE DOWN, CAPTURED FIRST -- before any statement below ran. Returned row, verbatim:
--
--       captured_up_name     agt481_countable_tickets
--       captured_class       auto-downable
--       objects_captured     2
--       refusals             0
--       derived_down_sql     drop function if exists public.countable_tickets_per_project();
--                            drop function if exists public.countable_claim_hours();
--
--   (b) `apply_migration` name `agt481_countable_tickets` with the body below, byte for byte.
--       RESULT: success -- and the trailing GATE committed with it, which is the evidence (a RAISE
--       would have rolled the whole file back). The success flag alone was NOT taken as proof: every
--       assertion below was re-read independently afterwards.
--
-- T1(c) -- THE LIVE READS, taken after the apply, independently of the gate:
--   * public.countable_tickets_per_project() -> 3 rows, one per executing project:
--       tooling                    | Platform Reliability (Site Reliability Engineering) | 1 | {AGT-304}
--       dev-manager-capabilities   | Product Team Agents                                 | 0 | {}
--       go-to-market               | Go-to-Market (Brand, Marketing and Sales)           | 0 | {}
--   * public.countable_claim_hours() -> 6 (John decision 10, not the pick's 24).
--   * pg_proc: exactly 1 overload of each name.
--   * EXECUTE, both functions, both directions: anon false, authenticated false, service_role true.
--   * THE DONE-WHEN, an INDEPENDENT hand count over the three executing projects, written as an
--     inner-join query with the eight predicates evaluated per ticket rather than reusing this
--     function: tooling 1 {AGT-304} (AGT-237 out on needs-desktop), dev-manager-capabilities 0
--     (AGT-291 out on needs-desktop), go-to-market no rows at all. All three MATCH the sensor --
--     and go-to-market is the case this file's LEFT JOIN exists for: the inner-join hand count
--     makes the project VANISH, while the sensor reports it as 0.
--   * The guard ran green against this applied state: "regression suite: 1/1 passed" for
--     tests/regression/agt-481-countable-tickets.test.mjs, which recomputes the hand count itself.
--     Arm D (the anon key refused from OUTSIDE the database) is DECLARED NOT RUN: no
--     SUPABASE_ANON_KEY in this environment. The denial is asserted in-database both directions by
--     check (b) of the GATE below; arm D would prove it over the wire and has not been run.
--
-- =================================================================================================
-- (1) countable_claim_hours() -- the floor's claim window, John's decision 10. Six, not the pick's
--     24. One home, so AGT-482 reuses the number instead of re-deciding it.
-- =================================================================================================
CREATE OR REPLACE FUNCTION public.countable_claim_hours()
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 PARALLEL SAFE
AS $function$
  SELECT 6
$function$;

REVOKE ALL ON FUNCTION public.countable_claim_hours() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.countable_claim_hours() TO service_role;

-- =================================================================================================
-- (2) countable_tickets_per_project() -- one row per `executing` project, the count and the ids.
--
--     THE LEFT JOIN IS THE POINT, not a convenience: every predicate sits in the JOIN's ON clause,
--     never in WHERE, so a project whose tickets all fail (or that has no ticket at all) still
--     returns its row reading 0 / '{}' -- an empty project reads zero rather than vanishing, which
--     is the designer's call in kickoff §7. Moving one predicate to WHERE would silently drop that
--     project's row, and a sensor that omits a project is worse than one that reports 0.
-- =================================================================================================
CREATE OR REPLACE FUNCTION public.countable_tickets_per_project()
 RETURNS TABLE(project_slug text, project_name text, countable integer, backlog_ids text[])
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT pj.slug::text AS project_slug,
         pj.name::text AS project_name,
         count(b.backlog_id)::integer AS countable,
         coalesce(
           array_agg(b.backlog_id::text ORDER BY b.backlog_id)
             FILTER (WHERE b.backlog_id IS NOT NULL),
           '{}'::text[]
         ) AS backlog_ids
    FROM public.projects pj
    LEFT JOIN public.epics e
           ON e.project_id = pj.id
    LEFT JOIN public.backlog_items b
           ON b.epic_id = e.id
          -- P1: the two statuses that still hold work. `delivered` is built; `removed` is gone.
          AND b.status IN ('open', 'partial')
          -- P2: AGT-427's score gate, the floor's own threshold (John 2026-10-09, AGT-432).
          AND b.need_score >= 3
          -- P3: Victoria has graded it and that grade still stands (AGT-280's requirement gate).
          AND EXISTS (
                SELECT 1 FROM public.runner_decisions d
                 WHERE d.kind = 'requirement-check'
                   AND d.backlog_id = b.backlog_id
                   AND d.reversed_at IS NULL)
          -- P4: no unfinished blocker -- the PICK's rule, read from its one home (SES-424 slice 7)
          -- rather than restated here (pattern:14/17).
          AND (b.blocked_by IS NULL
               OR EXISTS (
                    SELECT 1 FROM public.backlog_items bb
                     WHERE bb.id = b.blocked_by
                       AND bb.status = ANY (public.backlog_unblocking_statuses())))
          -- P5: PARKED has no column -- it lives in the newest unreversed grade's own reasoning
          -- (DL-09: `PARKED (0) until ...`). coalesce so a NULL reason reads countable, ILIKE so
          -- the case of John's own word cannot decide a count.
          AND coalesce((
                SELECT d2.reasoning FROM public.runner_decisions d2
                 WHERE d2.kind = 'requirement-check'
                   AND d2.backlog_id = b.backlog_id
                   AND d2.reversed_at IS NULL
                 ORDER BY d2.decided_at DESC
                 LIMIT 1), '') NOT ILIKE 'PARKED%'
          -- P6: an undecided gate card holds the ticket out of the pick (AGT-253), so it is not
          -- takeable work and must not be counted as if it were.
          AND NOT EXISTS (
                SELECT 1 FROM public.runner_items ri
                 WHERE ri.backlog_id = b.backlog_id
                   AND ri.kind = 'gated_before_build'
                   AND ri.decision IS NULL)
          -- P7: a `needs-` design flag means the ticket is waiting on a decision, a desktop or
          -- John -- live values 2026-10-17: needs-decision, needs-desktop, needs-john. The prefix
          -- is the rule (designer's call, kickoff §7), so a new `needs-` flag is covered on
          -- arrival without a migration.
          AND coalesce(b.design_status, '') NOT LIKE 'needs-%'
          -- P8: a live claim means another session already holds it. NULL `claimed_at` under a
          -- non-null `claimed_by` compares NULL -> not true -> the claim reads LIVE and the ticket
          -- is out, which is the cautious direction for a sensor that drives work intake.
          AND (b.claimed_by IS NULL
               OR b.claimed_at < now() - make_interval(hours => public.countable_claim_hours()))
   WHERE pj.status = 'executing'
   GROUP BY pj.slug, pj.name, pj.priority
   ORDER BY pj.priority, pj.slug
$function$;

REVOKE ALL ON FUNCTION public.countable_tickets_per_project() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.countable_tickets_per_project() TO service_role;

-- =================================================================================================
-- (3) THE GATE. Asserts, writes nothing, and RAISEs -- which rolls every statement above back,
--     because `apply_migration` wraps the file in one transaction. So a COMMITTED migration is
--     itself the proof that all four checks held; the success flag is never the evidence
--     (.claude/rules/supabase-column-grants.md: never trust the migration's success flag).
--
--     BOTH DIRECTIONS ON THE GRANTS, deliberately: the denial AND the legitimate read. A migration
--     that asserts only the revoke cannot tell "closed to anon" from "broken for everybody".
-- =================================================================================================
DO $gate$
declare
  v_n          integer;
  v_executing  integer;
  v_rows       integer;
  v_hours      integer;
begin
  -- (a) exactly one overload of each name -- a signature change creates an overload, it does not
  -- replace one (.claude/rules/supabase-function-signature.md).
  select count(*) into v_n from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'countable_claim_hours';
  if v_n <> 1 then
    raise exception 'agt481: pg_proc holds % overloads of countable_claim_hours, expected 1', v_n;
  end if;

  select count(*) into v_n from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'countable_tickets_per_project';
  if v_n <> 1 then
    raise exception 'agt481: pg_proc holds % overloads of countable_tickets_per_project, expected 1', v_n;
  end if;

  -- (b) EXECUTE: closed to anon and authenticated BY NAME, open to service_role. Both functions,
  -- both directions.
  if has_function_privilege('anon', 'public.countable_claim_hours()', 'EXECUTE') then
    raise exception 'agt481: anon can EXECUTE countable_claim_hours() -- the named revoke did not land';
  end if;
  if has_function_privilege('authenticated', 'public.countable_claim_hours()', 'EXECUTE') then
    raise exception 'agt481: authenticated can EXECUTE countable_claim_hours() -- the named revoke did not land';
  end if;
  if NOT has_function_privilege('service_role', 'public.countable_claim_hours()', 'EXECUTE') then
    raise exception 'agt481: service_role CANNOT EXECUTE countable_claim_hours() -- the grant is missing';
  end if;

  if has_function_privilege('anon', 'public.countable_tickets_per_project()', 'EXECUTE') then
    raise exception 'agt481: anon can EXECUTE countable_tickets_per_project() -- the named revoke did not land';
  end if;
  if has_function_privilege('authenticated', 'public.countable_tickets_per_project()', 'EXECUTE') then
    raise exception 'agt481: authenticated can EXECUTE countable_tickets_per_project() -- the named revoke did not land';
  end if;
  if NOT has_function_privilege('service_role', 'public.countable_tickets_per_project()', 'EXECUTE') then
    raise exception 'agt481: service_role CANNOT EXECUTE countable_tickets_per_project() -- the grant is missing';
  end if;

  -- (c) one row per executing project -- the LEFT JOIN's whole purpose. An inner join would drop
  -- `go-to-market`, which holds no scored open ticket today, and the count would read 2.
  select count(*) into v_executing from public.projects where status = 'executing';
  select count(*) into v_rows from public.countable_tickets_per_project();
  if v_rows <> v_executing then
    raise exception 'agt481: countable_tickets_per_project() returned % rows for % executing projects -- an empty project must read 0, never vanish',
      v_rows, v_executing;
  end if;

  -- (d) the floor's claim window is John's decision 10, not the pick's 24.
  select public.countable_claim_hours() into v_hours;
  if v_hours <> 6 then
    raise exception 'agt481: countable_claim_hours() = %, expected 6 (John decision 10)', v_hours;
  end if;

  raise notice 'AGT-481 GATE PASSED: 1 overload each, EXECUTE closed to anon/authenticated and open to service_role on both, % rows for % executing projects, claim window % hours',
    v_rows, v_executing, v_hours;
end
$gate$;
