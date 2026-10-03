-- DeepBench v7.0.688 | docs/design/agt-173-pick-exclusions.sql | AGT-173 R2 -- THE EXCLUSION REASON
-- IS THE PREDICATE'S: ONE SQL CORE, READ BY THE QUEUE, THE BLOCKER VIEW AND THE DRIVER.
--
-- THIS FILE IS A MIRROR, NOT THE SOURCE. It is the text of migration `agt173_pick_exclusions`
-- exactly as applied on 2026-09-28, kept in the repo so the predicate is reviewable without a
-- database round-trip (the same arrangement as docs/design/agt-173-card-citation-guard.sql).
-- Applying it a second time is a no-op by construction: every statement is CREATE OR REPLACE, the
-- grants are idempotent, and the trailing DO block only asserts.
--
-- WHAT SHIPPED, md5 of the LIVE object as the database renders it back. Each function's md5 is over
-- `pg_get_functiondef(oid)`, which is byte-identical to the span in this file running from its
-- `CREATE OR REPLACE FUNCTION` line through the closing `$function$` plus one newline; the view's is
-- over `pg_get_viewdef('public.project_blockers'::regclass, true)`, which Postgres re-renders and so
-- does NOT match this file's text byte for byte.
--
--   public.pick_exclusions()        pg_get_functiondef  md5 71a30a8d6add5d57f6b5ea0d09395eeb
--   public.prime_directive_queue()  pg_get_functiondef  md5 93186369e5beadd748d143ae443f9ca5
--   public.project_blockers         pg_get_viewdef      md5 136e70f200b7134b25fa0bdcfcda141a
--
-- Re-verify (service_role; the anon key cannot read pg_catalog and cannot EXECUTE the core):
--   select md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'pick_exclusions';
--   select md5(pg_get_viewdef('public.project_blockers'::regclass, true));
--
-- MEASURED BEFORE AND AFTER, live, over every open/partial ticket of an executing project:
--   before  18 tickets / 0 in the queue / project_blockers reasons for 15 / 3 absent with NO reason
--           anywhere (AGT-138, AGT-141, AGT-164 -- all three out on an undecided gate card)
--   after   18 tickets / 0 in the queue / project_blockers reasons for 18 / 0 absent with no reason
--
-- THE DISCRIMINATOR, run as one transaction and rolled back on both trees (QA F): with AGT-173's
-- claim nulled it is a `selfbuild` queue row with no project_blockers row; add one scratch
-- `gated_before_build` card with `decision IS NULL` and it leaves the queue. On origin/dev it then
-- had NO project_blockers row at all -- the defect. Here it reads
-- `{"undecided gated_before_build card"}`.
--
-- The down was captured BEFORE the up (`capture_migration_down`, cycle 0925517d, classification
-- `auto-downable`, 3 objects, 0 refusals) -- docs/runbooks/runner-cycle.md step 6.
-- THE BEFORE-IMAGE OF THE TWO READERS, captured inside this transaction BEFORE either is replaced,
-- so the trailing DO block can assert the change is a REFACTOR and not a behaviour change. Both drop
-- at commit; nothing outside this transaction sees them.
create temp table _agt173_before_queue on commit drop as
  select q.lane, coalesce(q.ref, '(board)') as ref, q.pos from public.prime_directive_queue() q;

create temp table _agt173_before_pb on commit drop as
  select pb.backlog_id, r as reason
    from public.project_blockers pb, unnest(pb.reasons) r
   where pb.scope = 'ticket';

-- AGT-173 R2 (v7.0.688). THE EXCLUSION REASON IS THE PREDICATE'S.
--
-- Before this migration the pick-exclusion predicate had exactly one home -- prime_directive_queue()'s
-- `buildable` WHERE -- and the reason a ticket was excluded had a SECOND, hand-copied one: the
-- project_blockers view re-stated six of the eleven clauses as literals ('2026-08-21', '24:00:00',
-- ARRAY['done','removed','delivered'], 'needs-desktop') and carried neither the SES-424 gate-card
-- clause nor the EL-01 enhancement fence. Measured live 2026-09-28: 18 open/partial tickets in
-- executing projects, 0 in the queue, project_blockers reasons for 15 -- and AGT-138 / AGT-141 /
-- AGT-164, all three out on an undecided `gated_before_build` card, with NO reason anywhere.
--
-- pick_exclusions() is that one home (pattern:14 -- when two code paths compute the same thing, build
-- one shared core they both call; pattern:15 -- the core owns the whole duplicated seam). One CASE per
-- `buildable` clause, each firing on `NOT (<clause>)`, each rendering the sentence the view already
-- used, verbatim. `reasons = '{}'` is therefore the SAME statement as "`buildable` admitted this row",
-- by construction rather than by agreement: the queue joins the core and keeps the empty-reasons rows,
-- the view joins the core and keeps the rest.
--
-- NULL DISCIPLINE: `buildable`'s WHERE admits a row only when every clause is TRUE, so a clause that
-- evaluates to NULL excludes it. `NOT coalesce((<clause>), false)` is TRUE in exactly that case too --
-- which is why every CASE wraps its clause that way rather than negating it bare. Without the
-- coalesce a NULL `filed_at` or a `claimed_by` with no `claimed_at` would leave the row with no
-- reason AND newly buildable, which is a behaviour change wearing a refactor's clothes.
--
-- NOT HERE, DELIBERATELY: `ticket_noship_cycles()`. That fence is lane (c)'s own rule inside
-- prime_directive_queue()'s `picks`, not a property of the ticket, and it stays there (SES-167).
-- `drain_epic_next()`'s own copy also stands: a drain pick writes no exclusion reason.
CREATE OR REPLACE FUNCTION public.pick_exclusions()
 RETURNS TABLE(id uuid, backlog_id text, reasons text[])
 LANGUAGE sql
 STABLE
AS $function$
SELECT b.id, b.backlog_id,
       array_remove(ARRAY[
         -- `b.status IN ('open','partial')`, half one: the delivered row, whose decision window is the
         -- reason it is not pickable. The view's sentence, kept.
         CASE WHEN NOT coalesce((b.status IN ('open','partial')), false) AND b.status = 'delivered'
              THEN 'delivered, decision window open'::text END,
         -- `b.queue IS NOT NULL`
         CASE WHEN NOT coalesce((b.queue IS NOT NULL), false)
              THEN 'no queue number'::text END,
         -- the fence: a Selfbuild-epic row of an executing project, OR an EL-01-admitted enhancement
         -- (SES-321). The view had only the first half, so every admitted enhancement read as
         -- "project not executing" while the queue was building it.
         CASE WHEN NOT coalesce((
                  public.epic_project_executing(b.epic_id)
               OR (
                    COALESCE(b.scope_origin, '') = 'enhancement'
                AND COALESCE(btrim(b.enhancement_claim), '') <> ''
                AND COALESCE(btrim(b.scope_rationale), '') <> ''
                AND b.predicted_cycles IS NOT NULL
                AND public.enhancement_week_spent_pct() + b.predicted_cycles::numeric * public.runner_pct_per_cycle()
                      <= (SELECT s.enhancement_cap_pct FROM public.runner_settings s WHERE s.id = 1)
                  )
                ), false)
              THEN 'project not executing (' || COALESCE(pj.status, 'none') || ')' END,
         -- `COALESCE(b.defer_status, '') <> ALL (ARRAY['yes','stuck'])` (SES-305 / M5-10)
         CASE WHEN NOT coalesce((COALESCE(b.defer_status, '') <> ALL (ARRAY['yes','stuck'])), false)
              THEN 'deferred: ' || COALESCE(b.defer_reason, '') END,
         -- `NOT (post-cut AND no scope rationale)` (SES-295 / M5-03). The cutoff is the SETTING, not
         -- the '2026-08-21' literal the view had frozen into it.
         CASE WHEN NOT coalesce((NOT (b.filed_at >= (SELECT s.filing_lane_cutoff FROM public.runner_settings s WHERE s.id = 1) AND COALESCE(btrim(b.scope_rationale), '') = '')), false)
              THEN 'no scope rationale (post-cut, M5-03)'::text END,
         -- `COALESCE(b.design_status,'') <> ALL (public.pick_blocking_flags())` (SES-281). The FLAG
         -- LIST is the function's, not the view's hardcoded 'needs-desktop', and the sentence names
         -- whichever flag actually fired.
         CASE WHEN NOT coalesce((COALESCE(b.design_status,'') <> ALL (public.pick_blocking_flags())), false)
              THEN 'needs a session John attends (' || COALESCE(b.design_status, '') || ')' END,
         -- the claim, against `claim_stale_hours` rather than the view's '24:00:00' literal.
         CASE WHEN NOT coalesce((b.claimed_by IS NULL OR b.claimed_at < now() - make_interval(hours => (SELECT s.claim_stale_hours FROM public.runner_settings s WHERE s.id = 1))), false)
              THEN 'claimed by ' || b.claimed_by END,
         -- `blocked_by` against `public.backlog_unblocking_statuses()` (SES-424 slice 7) rather than
         -- the view's ARRAY['done','removed','delivered'] copy.
         CASE WHEN NOT coalesce((b.blocked_by IS NULL OR EXISTS (SELECT 1 FROM public.backlog_items bb WHERE bb.id = b.blocked_by AND bb.status = ANY (public.backlog_unblocking_statuses()))), false)
              THEN 'blocked by ' || bl.backlog_id || ' (' || bl.status || ')' END,
         -- the milestone design gate (SES-281 / M5-09)
         CASE WHEN NOT coalesce((NOT EXISTS (
                  SELECT 1 FROM public.backlog_items g
                   WHERE g.epic_id = b.epic_id
                     AND g.id <> b.id
                     AND g.title ILIKE 'M_ design gate%'
                     AND g.status <> 'done')), false)
              THEN 'milestone design gate unresolved'::text END,
         -- `b.status IN ('open','partial')`, half two: every other non-pickable status. NEW -- the
         -- view said nothing at all about a status outside open/partial/delivered.
         CASE WHEN NOT coalesce((b.status IN ('open','partial')), false) AND b.status <> 'delivered'
              THEN 'status ' || b.status || ' is not open or partial' END,
         -- the EL-01 / EL-02 enhancement clause (SES-283). NEW to the reason set.
         CASE WHEN NOT coalesce((NOT (COALESCE(b.scope_origin, '') = 'enhancement' AND (
                     COALESCE(btrim(b.enhancement_claim), '') = ''
                  OR COALESCE(btrim(b.scope_rationale), '') = ''
                  OR b.predicted_cycles IS NULL
                  OR public.enhancement_week_spent_pct() + b.predicted_cycles::numeric * public.runner_pct_per_cycle()
                       > (SELECT s.enhancement_cap_pct FROM public.runner_settings s WHERE s.id = 1)))), false)
              THEN 'enhancement not admitted or over the weekly cap (EL-01)'::text END,
         -- the undecided gate card (SES-424 slice 1 / SES-391). NEW to the reason set, and the clause
         -- that left AGT-138, AGT-141 and AGT-164 out of the queue with no reason anywhere.
         CASE WHEN NOT coalesce((NOT EXISTS (SELECT 1 FROM public.runner_items ri WHERE ri.backlog_id = b.backlog_id AND ri.kind = 'gated_before_build' AND ri.decision IS NULL)), false)
              THEN 'undecided gated_before_build card'::text END
       ], NULL::text) AS reasons
  FROM public.backlog_items b
  LEFT JOIN public.epics e ON e.id = b.epic_id
  LEFT JOIN public.projects pj ON pj.id = e.project_id
  -- the blocker ROW, for the sentence only; the clause above is evaluated by its own EXISTS.
  LEFT JOIN public.backlog_items bl ON bl.id = b.blocked_by;
$function$;

-- The pick predicate is runner-internal: the browser never reads it, and the anon key ships in the
-- bundle (.claude/rules/supabase-column-grants.md).
REVOKE ALL ON FUNCTION public.pick_exclusions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pick_exclusions() TO service_role;

-- prime_directive_queue(): SAME IDENTITY, no parameter added or retyped, so no overload is created
-- and none is owed a DROP (.claude/rules/supabase-function-signature.md; the trailing DO asserts it).
-- `buildable`'s eleven-clause WHERE becomes one JOIN on the core. Everything else is byte-identical.
CREATE OR REPLACE FUNCTION public.prime_directive_queue()
 RETURNS TABLE(prime_standing boolean, lane text, pos integer, ref text, title text, lane_note text, qnum integer, item_status text, design_flag text, board_waiting integer)
 LANGUAGE sql
 STABLE
AS $function$
WITH prime AS (
  -- THE SAME PREDICATE drain_chain_gate USES, so the page and the gate cannot disagree about
  -- whether the Prime Directive stands.
  SELECT EXISTS (SELECT 1 FROM public.projects p WHERE p.status = 'executing') AS standing -- SES-340: projects govern
),
buildable AS (
  -- SES-281: filed_at and predicted_cycles join the projection because M5-02 and M5-07 now order
  -- on them; epic_id joins it because M5-09 resolves the gate through it.
  -- AGT-173 (v7.0.688): the WHERE that used to live here IS public.pick_exclusions(), which renders
  -- the reason for every clause it fails. `x.reasons = '{}'` is the whole of `buildable` now -- the
  -- queue and project_blockers read ONE predicate, so they cannot disagree about why a row is out.
  SELECT b.id, b.backlog_id, b.queue, b.status, b.design_status,
         b.filed_at, b.predicted_cycles, b.epic_id,
         -- AGT-238 (v7.0.660) / D1: what this ticket makes run better and why, written only by
         -- record_leverage(). NULL is the ordinary case; set, it outranks project order (D2).
         b.leverage_reason,
         public.backlog_display_title(b.title, b.description) AS disp,
         e.name AS epic_name,
         -- AGT-140 (v7.0.604) / D1 + D2: the owning project's `priority`, and NULL for a row whose
         -- project is not executing -- an EL-01-admitted enhancement reaches this CTE through the
         -- second half of the fence in pick_exclusions(), with no executing project of its own, and
         -- D2 sorts it LAST (the `NULLS LAST` in `ranked`). LEFT JOIN for the same reason the epics
         -- join is one.
         CASE WHEN pj.status = 'executing' THEN pj.priority END AS project_priority
    FROM public.backlog_items b
    LEFT JOIN public.epics e ON e.id = b.epic_id
    LEFT JOIN public.projects pj ON pj.id = e.project_id
    JOIN public.pick_exclusions() x ON x.id = b.id AND x.reasons = '{}'::text[]
),
drain AS (
  SELECT d.id AS directive_id, e.name AS epic_name
    FROM public.runner_directives d
    JOIN public.epics e ON e.id = d.epic_id
   WHERE d.type = 'drain-epic' AND d.status = 'queued'
   ORDER BY d.created_at
   LIMIT 1
),
board AS (
  SELECT count(*)::int AS waiting
    FROM public.backlog_items b
    LEFT JOIN public.epics e ON e.id = b.epic_id
   WHERE b.queue IS NOT NULL
     AND NOT public.epic_project_executing(b.epic_id)
),
picks AS (
  -- (a) open mission directives, oldest first. NAMED DEVIATION (SES-196 convention):
  -- runner_directives has no column separating a build order from a standing authorization, so
  -- EVERY open queued directive is rendered.
  SELECT 1 AS lane_ord,
         'directive'::text AS lane,
         rd.created_at AS sort_key,
         -- AGT-238: the leverage key. Constant on this lane, which sorts by time.
         0::int AS sort_leverage,
         -- AGT-140: the project-priority key. Constant on this lane, which sorts by time.
         0::int AS sort_project,
         -- SES-281: the three ticket-ordering keys. Constant on this lane, which sorts by time.
         0::int AS sort_lane, 0::int AS sort_queue, 0::int AS sort_cycles,
         left(rd.id::text, 8) AS ref,
         left(regexp_replace(rd.body, '\s+', ' ', 'g'), 96) AS title,
         'directive recorded '
           || to_char(rd.created_at AT TIME ZONE 'America/Chicago', 'Mon DD, FMHH12:MI AM')
           || ' CST' AS lane_note,
         NULL::int AS qnum, 'queued'::text AS item_status, NULL::text AS design_flag
    FROM public.runner_directives rd
   WHERE rd.type = 'directive' AND rd.status = 'queued'

  UNION ALL

  -- (b) the standing drain's next claimable named members (SES-142: the FIXED named scope).
  SELECT 2, 'drain', to_timestamp(0),
         CASE WHEN bu.leverage_reason IS NOT NULL THEN 0 ELSE 1 END,   -- AGT-238 / D2
         bu.project_priority,   -- AGT-140 / D1
         CASE WHEN bu.filed_at < (SELECT s.filing_lane_cutoff FROM public.runner_settings s WHERE s.id = 1) THEN 0 ELSE 1 END,
         bu.queue, bu.predicted_cycles::int,
         bu.backlog_id, bu.disp,
         'named in your standing drain on ' || dr.epic_name,
         bu.queue, bu.status, COALESCE(bu.design_status, '—')
    FROM buildable bu
    JOIN drain dr ON true
    JOIN public.runner_drain_scope s
      ON s.directive_id = dr.directive_id AND s.item_id = bu.id

  UNION ALL

  -- (c) buildable Selfbuild tickets. Deliberately NOT filtered against lane (b).
  -- AGT-173: the noship fence stays HERE. It is this lane's rule, not a property of the ticket, so
  -- pick_exclusions() deliberately carries no clause for it.
  SELECT 3, 'selfbuild', to_timestamp(0),
         CASE WHEN bu.leverage_reason IS NOT NULL THEN 0 ELSE 1 END,   -- AGT-238 / D2
         bu.project_priority,   -- AGT-140 / D1
         CASE WHEN bu.filed_at < (SELECT s.filing_lane_cutoff FROM public.runner_settings s WHERE s.id = 1) THEN 0 ELSE 1 END,
         bu.queue, bu.predicted_cycles::int,
         bu.backlog_id, bu.disp, bu.epic_name,
         bu.queue, bu.status, COALESCE(bu.design_status, '—')
    FROM buildable bu
   WHERE public.ticket_noship_cycles(bu.backlog_id) < (SELECT s.chain_max_noship_streak FROM public.runner_settings s WHERE s.id = 1)
),
ranked AS (
  -- AGT-140 (v7.0.604) / D1 + D2: within a lane the owning project's `priority` comes FIRST, then
  -- SES-281 / M5-02 + M5-07's filing lane, then the queue number, then the cheapest
  -- predicted_cycles with nulls last. drain_epic_next's ORDER BY is the same
  -- four keys in the same order -- that agreement is the property this pair of functions exists
  -- to hold. `sort_project NULLS LAST` is D2: a row with no executing project of its own (an
  -- EL-01-admitted enhancement) sorts behind every chartered one rather than ahead of it.
  -- AGT-238 (v7.0.660) / D2: LEVERAGE FIRST (John 2026-09-27). A ticket The Development Manager
  -- marked as leverage (leverage_reason set) precedes project priority; AGT-140's keys then decide,
  -- unchanged. drain_epic_next's pick carries the same leading key.
  SELECT row_number() OVER (
           ORDER BY lane_ord, sort_key, sort_leverage, sort_project NULLS LAST, sort_lane, sort_queue, sort_cycles NULLS LAST
         )::int AS pos,
         picks.*
    FROM picks
)
SELECT p.standing, r.lane, r.pos, r.ref, r.title, r.lane_note,
       r.qnum, r.item_status, r.design_flag, b.waiting
  FROM ranked r CROSS JOIN prime p CROSS JOIN board b
 WHERE p.standing

UNION ALL

-- The board row is ALWAYS emitted, standing or not (SES-147 "NULL is not zero").
SELECT p.standing, 'board'::text, NULL::int, NULL::text, NULL::text, NULL::text,
       NULL::int, NULL::text, NULL::text, b.waiting
  FROM prime p CROSS JOIN board b

 ORDER BY 3 NULLS LAST;
$function$;

-- project_blockers: the SAME eight columns, in the same order, so CREATE OR REPLACE is a replacement
-- and not a new object. The ticket half's reasons are now pick_exclusions()'s, plus the one reason
-- that is NOT a pick clause -- 'no priority class' is a board-hygiene fact, never a `buildable`
-- clause, so it stays here and is appended rather than folded into the core. The project-scope half
-- below is verbatim.
CREATE OR REPLACE VIEW public.project_blockers AS
 WITH t AS (
         SELECT p.slug AS project,
            p.status AS project_status,
            e.name AS epic,
            b.backlog_id,
            public.backlog_display_title(b.title, b.description) AS title,
            b.status,
            x.reasons || array_remove(ARRAY[
                CASE
                    WHEN b.priority_class IS NULL THEN 'no priority class'::text
                    ELSE NULL::text
                END], NULL::text) AS reasons
           FROM public.projects p
             JOIN public.epics e ON e.project_id = p.id
             JOIN public.backlog_items b ON b.epic_id = e.id
             JOIN public.pick_exclusions() x ON x.id = b.id
          WHERE p.status <> 'done'::text AND (b.status <> ALL (ARRAY['done'::text, 'removed'::text]))
        )
 SELECT t.project,
    t.project_status,
    t.epic,
    t.backlog_id,
    t.title,
    t.status,
    t.reasons,
    'ticket'::text AS scope
   FROM t
  WHERE cardinality(t.reasons) > 0
UNION ALL
 SELECT p.slug AS project,
    p.status AS project_status,
    NULL::text AS epic,
    NULL::text AS backlog_id,
    NULL::text AS title,
    NULL::text AS status,
    array_remove(ARRAY[
        CASE
            WHEN NOT COALESCE(( SELECT s.scheduler_on
               FROM public.runner_settings s
              WHERE s.id = 1), true) THEN 'scheduler off (briefing §2b)'::text
            ELSE NULL::text
        END,
        CASE
            WHEN COALESCE(( SELECT max(u.taken_at) AS max
               FROM public.runner_usage_readings u), '1970-01-01 00:00:00+00'::timestamp with time zone) < (now() - '48:00:00'::interval) THEN 'usage reading older than 48h: day cap sits on the 3M stale floor (John types three numbers)'::text
            ELSE NULL::text
        END,
        CASE
            WHEN NOT (EXISTS ( SELECT 1
               FROM public.runner_budget rb
              WHERE rb.month = to_char((now() AT TIME ZONE 'America/Chicago'::text), 'YYYY-MM'::text))) THEN 'no runner_budget row for this month'::text
            ELSE NULL::text
        END, 'cloud routine enabled? not readable from the database — check deepbench-runner at claude.ai/code/routines'::text], NULL::text) AS reasons,
    'project'::text AS scope
   FROM public.projects p
  WHERE p.status = 'executing'::text;

-- THE AFTER-IMAGE, materialised once. Both readers now call pick_exclusions() over all of
-- backlog_items, so a correlated re-read per graded row would evaluate it dozens of times; the gate
-- below reads these snapshots instead. They drop at commit with the before-images.
create temp table _agt173_after_queue on commit drop as
  select q.lane, coalesce(q.ref, '(board)') as ref, q.pos from public.prime_directive_queue() q;

create temp table _agt173_px on commit drop as
  select x.id, x.backlog_id, x.reasons from public.pick_exclusions() x;

create temp table _agt173_after_pb on commit drop as
  select pb.backlog_id, r as reason
    from public.project_blockers pb, unnest(pb.reasons) r
   where pb.scope = 'ticket';

-- THE GATE. Never the migration's success flag (.claude/rules/supabase-column-grants.md's lesson:
-- a migration that reported success left the data fully exposed).
DO $gate$
declare
  c integer;
  v_pop integer;
  v_bad integer;
  v_no_reason integer;
  v_lost text;
  v_qdiff text;
  v_max integer;
begin
  -- (1) EXACTLY ONE OVERLOAD of each function. A signature change creates an overload and
  -- CREATE OR REPLACE does not replace it (.claude/rules/supabase-function-signature.md).
  select count(*) into c from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'pick_exclusions' and p.prokind = 'f';
  if c <> 1 then raise exception 'pick_exclusions: % overload(s), expected exactly 1', c; end if;
  select count(*) into c from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'prime_directive_queue' and p.prokind = 'f';
  if c <> 1 then raise exception 'prime_directive_queue: % overload(s), expected exactly 1', c; end if;

  -- (2) GRANTS, BOTH DIRECTIONS -- the denied roles denied and the legitimate one still able.
  if has_function_privilege('anon', 'public.pick_exclusions()', 'execute') then
    raise exception 'pick_exclusions: anon can EXECUTE it';
  end if;
  if has_function_privilege('authenticated', 'public.pick_exclusions()', 'execute') then
    raise exception 'pick_exclusions: authenticated can EXECUTE it';
  end if;
  if not has_function_privilege('service_role', 'public.pick_exclusions()', 'execute') then
    raise exception 'pick_exclusions: service_role CANNOT execute it -- the runner reads it';
  end if;

  -- (3) THE QUEUE IS UNCHANGED, row for row, before and after. This is the refactor's whole claim.
  select string_agg(d.side || ' ' || d.lane || '/' || d.ref || '@' || coalesce(d.pos::text, '-'), '; ')
    into v_qdiff
    from (
      select 'LOST' as side, x.lane, x.ref, x.pos from
             (select lane, ref, pos from _agt173_before_queue
              except all
              select lane, ref, pos from _agt173_after_queue) x
      union all
      select 'GAINED', y.lane, y.ref, y.pos from
             (select lane, ref, pos from _agt173_after_queue
              except all
              select lane, ref, pos from _agt173_before_queue) y
    ) d;
  if v_qdiff is not null then
    raise exception 'prime_directive_queue() moved: %', v_qdiff;
  end if;

  -- (4) NOT ONE OLD SENTENCE LOST. Every (ticket, reason) pair project_blockers rendered before this
  -- migration must still be rendered. New sentences are the point; a missing one is a regression.
  select string_agg(b.backlog_id || ': ' || b.reason, '; ') into v_lost
    from (select backlog_id, reason from _agt173_before_pb
          except
          select backlog_id, reason from _agt173_after_pb) b;
  if v_lost is not null then
    raise exception 'project_blockers lost sentence(s): %', v_lost;
  end if;

  -- (5) THE PAIRING, over every open/partial ticket of an executing project: `reasons = '{}'` and
  -- "the queue returned it" are now the same statement. Rows at or past the noship streak are out of
  -- the population, not out of the count -- lane (c)'s fence is not a pick_exclusions() clause -- and
  -- an empty population is itself a failure, so this cannot pass vacuously.
  select s.chain_max_noship_streak into v_max from public.runner_settings s where s.id = 1;
  with tix as (
    select b.id, b.backlog_id
      from public.backlog_items b
      join public.epics e on e.id = b.epic_id
      join public.projects pj on pj.id = e.project_id
     where pj.status = 'executing' and b.status in ('open','partial')
       and public.ticket_noship_cycles(b.backlog_id) < v_max
  )
  select count(*),
         count(*) filter (
           where ((select px.reasons from _agt173_px px where px.id = t.id) = '{}'::text[])
             <> (exists (select 1 from _agt173_after_queue q
                          where q.lane = 'selfbuild' and q.ref = t.backlog_id)
                 and public.ticket_noship_cycles(t.backlog_id) < v_max)),
         count(*) filter (
           where not exists (select 1 from _agt173_after_queue q where q.ref = t.backlog_id)
             and not exists (select 1 from _agt173_after_pb pb where pb.backlog_id = t.backlog_id))
    into v_pop, v_bad, v_no_reason
    from tix t;
  if coalesce(v_pop, 0) = 0 then
    raise exception 'the pairing graded 0 rows -- no open/partial ticket of an executing project is in the population, so this gate proves nothing';
  end if;
  if v_bad <> 0 then
    raise exception 'of % graded rows, % disagree: empty reasons and a selfbuild queue row must be the same statement', v_pop, v_bad;
  end if;
  if v_no_reason <> 0 then
    raise exception 'of % graded rows, % are absent from the queue with NO reason anywhere -- the defect AGT-173 exists to remove', v_pop, v_no_reason;
  end if;
end
$gate$;
