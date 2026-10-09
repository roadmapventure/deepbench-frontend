-- DeepBench v7.0.841 | docs/design/agt-427-scored-pick.sql | AGT-427 slice 2 -- SEVERITY IS THE FIRST PICK KEY IN EVERY LANE, GATED.
--
-- SLICE 2, APPLIED 2026-10-09 18:44Z as migration `agt427_severity_first` (watermark 20261009184404)
-- by cycle 76b85201-7ffd-4b7b-9acf-ffa327426e89, branch session/agt427-severity-coding, v7.0.841.
-- John 2026-10-08: "a 5 and 4 always wins, no matter the lane."
--
-- INV, read-only BEFORE the migration (each row whose need_score exceeds the previous row's, over
-- prime_directive_queue() lanes drain/selfbuild in q.pos order, as `ref:need`):
--   AGT-304:5   (lane then: AGT-341:3 AGT-304:5 AGT-393:4 AGT-394:4 AGT-395:4 AGT-387:3 AGT-418:3)
--
-- DOWN, captured BEFORE the apply. Returned `auto-downable`, objects_captured = 2, refusals = 0:
--   SELECT * FROM public.capture_migration_down('76b85201-7ffd-4b7b-9acf-ffa327426e89',
--     'agt427_severity_first',
--     '[{"kind":"function","identity":"public.prime_directive_queue()"},
--       {"kind":"function","identity":"public.drain_epic_next(uuid)"}]'::jsonb);
--
-- LANE AFTER APPLY (`ref:need`, drain/selfbuild; directive 3c1cc23d still pos 1):
--   AGT-304:5 AGT-393:4 AGT-394:4 AGT-395:4 AGT-341:3 AGT-387:3 AGT-418:3
--   md5(pg_get_functiondef('public.pick_exclusions()'::regprocedure)):      6fe579e2dc6b7bdeacb472f38154cce8 (unchanged)
--   md5(pg_get_functiondef('public.prime_directive_queue()'::regprocedure)): 0cf969bdeb2cb060e84d1b5bf58f5f78
--   md5(pg_get_functiondef('public.drain_epic_next(uuid)'::regprocedure)):   01c45e6516771d1b630d4b8a58808bcc
-- The prime_directive_queue() and drain_epic_next(uuid) bodies below ARE their post-apply
-- pg_get_functiondef (the md5s above were computed over this file's text and equal the live ones);
-- pick_exclusions() is slice 1's body, unchanged. The slice-1 header below is kept as history; its
-- md5 lines for the two edited functions are superseded by the two above.
--
-- WHAT SLICE 2 CHANGED (the 3-file cap's split, Designer's call (ii) of slice 1):
--   (a) prime_directive_queue(): `sort_need` moves to the FRONT of `ranked`'s window ORDER BY,
--       ahead of `lane_ord`. A directive's constant 0 keeps lane (a) at the head; drain beats
--       selfbuild only at an equal score; within a score, leverage then project priority decide.
--   (b) drain_epic_next(uuid): the pick's `6 - b.need_score` becomes its first ORDER BY key, the key
--       prime_directive_queue() leads with. The function is never called by the gate.
--   (c) THE GATE appended at the end of this file, which RAISED-or-passed in the same transaction.
--
-- ===================================== SLICE 1 (history) =====================================
-- DeepBench v7.0.825 | docs/design/agt-427-scored-pick.sql | AGT-427 slice 1 -- THE PICK LISTS ONLY
-- TICKETS VICTORIA HAS SCORED 3 OR HIGHER, AND AN UNSCORED ONE IS NOT A ZERO.
--
-- APPLIED 2026-10-09 08:49Z as migration `agt427_scored_pick` (watermark 20261009084922) by cycle
-- 4d98783c-1fb8-4c0f-9341-797aae3ed96b. The DRY gate PASSED first (would_list=9, not the FAIL
-- path) and the down was captured before the up. The applied migration carries the same three
-- edits as a patch over the live definitions plus an md5 assertion against THIS file, so the
-- three md5 lines below are the proof that repo and database state one text, not a claim about it.
--
-- TICKET: AGT-427, P9 - Bug Fixes, slice 1 of 2. Cycle 4d98783c-1fb8-4c0f-9341-797aae3ed96b,
-- directive 418095d5, branch session/cycle-20261009-0742, version v7.0.825.
--
-- THE DEFECT, MEASURED LIVE 2026-10-09 AND NOT RECALLED. `prime_directive_queue()` served all 12
-- buildable Selfbuild tickets, three of them scored `need_score = 1` -- AGT-389, AGT-383, AGT-396 --
-- so an unattended cycle could be handed a ticket Victoria had already ranked as the least needed
-- work on the board. The need key existed -- the score, inverted, wrapped in a COALESCE -- but it
-- only ORDERED the lane;
-- nothing withheld a low score, and the COALESCE made an UNSCORED ticket sort as though it were
-- scored 0 -- ahead of nothing, behind everything, but still served, and `ck_backlog_need_score`
-- refuses a real 0, so that 0 could only ever be a ticket nobody had scored yet.
--
-- DRY, read 2026-10-09 08:31Z over `pick_exclusions() x JOIN backlog_items b ON b.id = x.id
-- WHERE x.reasons = '{}'`, paginated to all 1305 rows (the first read stopped at PostgREST's
-- 1000-row cap and under-reported the join; the four values below are the full read):
--   would_list = 9   unscored = 0   below_3 = 3   buildable = 12
--   rows: AGT-418:3 AGT-340:3 AGT-387:3 AGT-396:1 AGT-304:5 AGT-393:4 AGT-394:4 AGT-383:1
--         AGT-341:3 AGT-389:1 AGT-395:4 AGT-398:5
--   GATE: would_list >= 3 -> PASS. John's own condition: fewer than 3 buildable tickets left
--   standing, or any listed ticket unscored or below 3, and nothing is applied.
--
-- DOWN, captured BEFORE any apply (SES-182 slice 2; ordering is the whole mechanism -- run after
-- the up and it captures the state the up just wrote, which is a down that restores the bug).
-- Returned `auto-downable`, objects_captured = 3, refusals = 0, at 2026-10-09T08:33:02.737639Z:
--   SELECT * FROM public.capture_migration_down('4d98783c-1fb8-4c0f-9341-797aae3ed96b',
--     'agt427_scored_pick',
--     '[{"kind":"function","identity":"public.pick_exclusions()"},
--       {"kind":"function","identity":"public.prime_directive_queue()"},
--       {"kind":"function","identity":"public.drain_epic_next(uuid)"}]'::jsonb);
--
-- READ BACK FROM THE APPLIED DATABASE 2026-10-09 08:49Z -- 9 rows, every one scored 3 or higher,
-- and the three score-1 rows withheld by pick_exclusions() with the sentence it now carries
-- (AGT-383, AGT-389, AGT-396 -> {"need_score 1 is below 3"}):
--   LANE AFTER APPLY (`ref:need` over lanes drain/selfbuild):
--     AGT-398:5 AGT-340:3 AGT-341:3 AGT-304:5 AGT-393:4 AGT-394:4 AGT-395:4 AGT-387:3 AGT-418:3
--   md5(pg_get_functiondef('public.pick_exclusions()'::regprocedure)):      6fe579e2dc6b7bdeacb472f38154cce8
--   md5(pg_get_functiondef('public.prime_directive_queue()'::regprocedure)): 95e1e08f74946f92405305bf12aa6895
--   md5(pg_get_functiondef('public.drain_epic_next(uuid)'::regprocedure)):   f2fcea0f7549fb5319ac81e6fa1a1a9a
--
-- THIS FILE IS A MIRROR, NOT THE SOURCE -- the three function bodies below are
-- `pg_get_functiondef` as read live 2026-10-09 08:33Z out of the down capture's own
-- `prior_definitions` (one overload each, asserted by the capture), with exactly three edits:
--   (a) `pick_exclusions()` gains ONE element at the end of its `reasons` array -- the sentence a
--       withheld ticket now carries, which is the whole reason the predicate has one home (AGT-173
--       R2): the queue drops a row with any reason, the blocker view shows the reason, and neither
--       re-states the rule.
--   (b) `prime_directive_queue()`'s two need keys drop their COALESCE.
--   (c) `drain_epic_next(uuid)`'s need key drops its COALESCE, and its pick WHERE gains
--       a `need_score >= 3` predicate of its own. The drain reads its own WHERE rather than
--       pick_exclusions(), so the
--       predicate has to be stated in both homes or the two picks disagree (pattern:14 is served by
--       the shared sentence in (a); this is the one seam that is genuinely separate).
-- Signatures and grants are unchanged, and the trailing GATE asserts both.
--
-- WHAT SLICE 2 CHANGED (formerly "NOT IN THIS SLICE"): `sort_need` moved to the FRONT of both picks
-- -- prime_directive_queue()'s window ORDER BY and drain_epic_next(uuid)'s pick ORDER BY -- by
-- migration `agt427_severity_first` (v7.0.841); see the slice-2 header at the top of this file.
-- Slice 1 withheld a low score; slice 2 re-ranks what is left, severity first.
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
              THEN 'undecided gated_before_build card'::text END,
         -- AGT-427 (v7.0.825), John 2026-10-09: listed only when scored 3+; NULL is not yet scored, never 0.
         CASE WHEN NOT coalesce((b.need_score >= 3), false)
              THEN CASE WHEN b.need_score IS NULL THEN 'not yet scored (waits for Victoria)'::text
                        ELSE 'need_score ' || b.need_score || ' is below 3' END END
       ], NULL::text) AS reasons
  FROM public.backlog_items b
  LEFT JOIN public.epics e ON e.id = b.epic_id
  LEFT JOIN public.projects pj ON pj.id = e.project_id
  -- the blocker ROW, for the sentence only; the clause above is evaluated by its own EXISTS.
  LEFT JOIN public.backlog_items bl ON bl.id = b.blocked_by;
$function$;

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
         b.filed_at, b.predicted_cycles, b.epic_id, b.need_score,
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
         0::int AS sort_need, 0::int AS sort_lane, 0::int AS sort_queue, 0::int AS sort_cycles,
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
         6 - bu.need_score,
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
         6 - bu.need_score,
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
  -- AGT-427 slice 2 (v7.0.841), John 2026-10-08: severity FIRST in every lane; a directive's constant 0 keeps lane (a) at the head; lane_ord decides only among equal scores.
  SELECT row_number() OVER (
           ORDER BY sort_need, lane_ord, sort_key, sort_leverage, sort_project NULLS LAST, sort_lane, sort_queue, sort_cycles NULLS LAST
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

CREATE OR REPLACE FUNCTION public.drain_epic_next(p_cycle_id uuid)
 RETURNS TABLE(directive_id uuid, epic_id uuid, epic_name text, backlog_id text, queue integer, open_now integer, outcome text, blocked_detail text)
 LANGUAGE plpgsql
AS $function$
-- SES-310 (v7.0.393). THE FINISH LINE IS THE MEMBERS THE GATE RULED REQUIRED, NOT EVERY NAME ON THE
-- LIST. Measured live 2026-09-02, not recalled: the M5 drain (directive 238aa9ca, 18 named members)
-- had all 9 of its milestone_required members done -- the M5 gate record's own words, "completion is
-- a property of the required set" -- yet this function returned 'blocked', because the retirement
-- predicate counted every named member and three non-required ones were still open (DAT-25, SES-123,
-- SES-82, all defer_status='yes' and all ruled out of the required set at that gate). A drain that
-- cannot retire never fires step 8d's gate-review sweep, so directive 0970abad's succession never
-- declares M6: the next milestone cannot start on its own, and charter goal 1 fails at the handoff.
-- THIS IS NOT THE FORBIDDEN EDIT, and the distinction is the whole justification. The boundary
-- written down four times (SES-154 delivered, SES-196 the flags, SES-218 blocked_by, SES-305
-- defer_status) forbids moving a PICK-SIDE clause to the retirement side, because each of those is
-- a cycle's own pick-time judgment and a drain retiring on one retires on the runner's own say-so.
-- milestone_required is the opposite kind of fact: it is set only at a milestone's gate decision
-- (SES-304 / M5-04, "set at its gate decision and never re-judged per question"), by John or by the
-- gate sitting under M6-01 with a 72-hour reversal window. Retiring on it retires on the GATE'S
-- word, which is the authorisation this boundary exists to protect. Pick-side clauses still never
-- move here. FAIL CLOSED FOR DRAINS THAT PREDATE THE FLAG: a named list carrying no
-- milestone_required row at all (M0-M4 shapes, or any future drain declared without a gate ruling)
-- keeps the all-members rule unchanged. The new rule engages only when the finish line has been
-- ruled. AND DEFERRAL NEVER EXEMPTS A REQUIRED MEMBER: a deferred required member holds the drain
-- open, because that is a signal the gate must re-rule, not a reason to retire. The SES-305 census
-- reports it. Non-required and deferred members are not "not work" -- they stay pickable under Prime
-- Directive 2(c) after the drain retires -- they are simply not the finish line, and the census now
-- says which members are.
DECLARE
  d               public.runner_directives%ROWTYPE;
  v_name          text;
  v_scope_n       integer;
  v_open_now      integer;
  v_pick          text;
  v_queue         integer;
  v_retired_n     integer := 0;
  v_last_ret_id   uuid;
  v_last_ret_epic uuid;
  v_last_ret_name text;
  v_guard         integer := 0;
  v_flag_n        integer;
  v_peer_n        integer;
  v_deliv_n       integer;
  v_blocked_n     integer;
  v_gate_n        integer;
  v_fence_n       integer;
  v_flag_list     text;
  v_blocked_list  text;
  v_gate_list     text;
  v_defer_n       integer;   -- SES-305
  v_defer_list    text;      -- SES-305
  v_ration_n      integer;   -- SES-295
  v_ration_list   text;      -- SES-295
  v_enh_n         integer;   -- SES-283
  v_enh_list      text;      -- SES-283
  v_req_n            integer;   -- SES-310
  v_nonreq_open_n    integer;   -- SES-310
  v_nonreq_open_list text;      -- SES-310
  v_card_n           integer;   -- SES-424 slice 3
  v_card_list        text;      -- SES-424 slice 3
  v_detail        text;
  -- SES-196. The design_status values that mean "only John can move this" (runner-cycle.md
  -- step 5's blocked-prefix table). 'designed' is deliberately NOT here -- it is explicitly not a
  -- skip. Kept identical to drain_chain_gate's c_flagged so the two homes cannot drift.
  -- SES-281: the array is down to ONE entry, and both removals are deliberate.
  --   * 'needs-john' was retired outright by M6-01 (SES-285, v7.0.359). Nothing can be in it.
  --   * 'john-paced' was the human gate that migration MISSED -- it matched on the string
  --     'needs-john' rather than on the concept, and left 7 open tickets "paced by John", which is
  --     exactly the blocking-on-a-human-decision M6-01 forbids. This migration converts them.
  -- 'needs-desktop' STAYS, and that is not an oversight: it records a physical constraint (work
  -- that needs a machine John has), never a judgment call, so it is still genuinely unbuildable
  -- by an unattended cycle.
  c_flagged   constant text[] := public.pick_blocking_flags();
  -- SES-218. A blocker in one of these states no longer blocks: done/removed are finished, and
  -- `delivered` means the code is ON DEV. Deliberately NOT the same set as the pick's own
  -- `<> 'delivered'` clause.
  c_unblocking constant text[] := public.backlog_unblocking_statuses();
  -- SES-275. The two statuses that mean "this ticket is finished and is not work". ONE list, read
  -- by both the pick predicate and the blocked_detail census -- two hand-copied literals drift.
  c_finished   constant text[] := ARRAY['done', 'removed'];
  -- SES-281 / M5-09. How a milestone's own design-gate ticket is recognised among its epic's
  -- members. `_` is LIKE's single-character wildcard, so this matches 'M4 design gate: ...',
  -- 'M5 design gate: ...' and so on, and not an ordinary member whose title begins with M.
  -- NAMED DEVIATION from the kickoff doc, measured rather than assumed: the doc identified the
  -- gate as the epic member with scope_origin = 'original' AND this title. Live, only SES-183 (M4)
  -- and SES-184 (M5) carry scope_origin = 'original' -- SES-185 (M6) and SES-186 (M7) carry
  -- 'pre-existing'. Requiring 'original' would have silently disabled M5-09 for M6 and M7, i.e.
  -- for every milestone that has not started yet, which is the only place the rolling wave still
  -- has work to do. The title pattern alone matches exactly the four real gates and nothing else.
  c_gate_pat  constant text := 'M_ design gate%';
  -- SES-281 / M5-02. The filing lane boundary. Tickets filed BEFORE this date are the priority
  -- lane; anything filed on or after it is the review bucket and sorts second. `filed_at`, never
  -- `created_at` -- created_at is the board-migration bulk-load stamp and misdates most of the
  -- board by up to 68 days (SES-295 fixed ticket_matrix for exactly this). A NULL filed_at falls
  -- to the review bucket, which is the safe direction; zero rows carry one today.
  c_lane_cut  constant date := (SELECT s.filing_lane_cutoff FROM public.runner_settings s WHERE s.id = 1);
BEGIN
  IF p_cycle_id IS NULL THEN
    RAISE EXCEPTION 'drain_epic_next: p_cycle_id is required (it stamps the retirement before-image)';
  END IF;

  LOOP
    -- Runaway backstop ONLY. A retirement sets status='done', which leaves the WHERE below, so the
    -- loop advances by construction; 32 retirements in one call is not a real board.
    v_guard := v_guard + 1;
    EXIT WHEN v_guard > 32;

    -- John's standing declaration, oldest first. Read only; never created here (property 5).
    SELECT * INTO d
      FROM public.runner_directives
     WHERE type = 'drain-epic' AND status = 'queued'
     ORDER BY created_at
     LIMIT 1;

    IF NOT FOUND THEN
      -- SES-189: nothing queued is left. Which word that is depends on whether THIS call closed
      -- anything -- 'retired' still means "a drain finished here", and the ledger still names it.
      IF v_retired_n > 0 THEN
        RETURN QUERY SELECT v_last_ret_id, v_last_ret_epic, v_last_ret_name,
                            NULL::text, NULL::integer, 0, 'retired'::text, NULL::text;
      ELSE
        RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text,
                            NULL::text, NULL::integer, NULL::integer, 'none'::text, NULL::text;
      END IF;
      RETURN;
    END IF;

    SELECT e.name INTO v_name FROM public.epics e WHERE e.id = d.epic_id;

    -- The scope John named. NO named list => fail closed, never fall back to the live tier.
    SELECT count(*)::integer INTO v_scope_n
      FROM public.runner_drain_scope s
     WHERE s.directive_id = d.id;

    IF v_scope_n = 0 THEN
      RETURN QUERY SELECT d.id, d.epic_id, v_name, NULL::text, NULL::integer, NULL::integer,
                          'unscoped'::text, NULL::text;
      RETURN;
    END IF;

    -- SES-310: THE FINISH LINE. How many named members did the GATE rule required? This number
    -- decides which retirement rule applies below, and it is also what the census reads to decide
    -- whether it may speak of a "required" finish line at all.
    SELECT count(*)::integer INTO v_req_n
      FROM public.runner_drain_scope s
      JOIN public.backlog_items b ON b.id = s.item_id
     WHERE s.directive_id = d.id
       AND b.milestone_required IS TRUE;

    -- RETIREMENT predicate: is every REQUIRED named member done/removed? Claims deliberately
    -- ignored (prop 4).
    -- SES-154 / SES-196 / SES-218 / SES-275 / SES-305: 'delivered', the design_status flags,
    -- blocked_by, the done/removed clause and defer_status each have their own reason for being
    -- present or absent here; read docs/runbooks/runner-cycle.md step 5 before touching any of them.
    -- SES-281: the epic fence and the M5-09 gate check are ABSENT here for the FIFTH time, same
    -- reason. A drain whose remaining members are all gate-blocked is 'blocked' -- retiring it
    -- would close John's standing directive because a gate he has not answered is still open.
    IF v_req_n > 0 THEN
      -- SES-310: the finish line is the members the GATE ruled required (SES-304 / M5-04), not
      -- every name on the list. Deferral does NOT exempt a required member: that is a signal the
      -- gate must re-rule, and it is reported by the SES-305 census below.
      SELECT count(*)::integer INTO v_open_now
        FROM public.runner_drain_scope s
        JOIN public.backlog_items b ON b.id = s.item_id
       WHERE s.directive_id = d.id
         AND b.milestone_required IS TRUE
         AND b.status <> ALL (c_finished);
    ELSE
      -- SES-310: no gate ruling on this list -- the pre-SES-304 rule, unchanged. Fail closed.
      SELECT count(*)::integer INTO v_open_now
        FROM public.runner_drain_scope s
        JOIN public.backlog_items b ON b.id = s.item_id
       WHERE s.directive_id = d.id
         AND b.status <> ALL (c_finished);
    END IF;

    IF v_open_now = 0 THEN
      INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
      VALUES (p_cycle_id, 'runner_directives', d.id::text, to_jsonb(d));

      UPDATE public.runner_directives
         SET status = 'done', acted_cycle = p_cycle_id
       WHERE id = d.id AND status = 'queued';

      v_retired_n     := v_retired_n + 1;
      v_last_ret_id   := d.id;
      v_last_ret_epic := d.epic_id;
      v_last_ret_name := v_name;
      CONTINUE;
    END IF;

    -- PICK predicate: which NAMED member can I claim AND actually build? `queue IS NULL` is THE
    -- not-pickable condition (SES-86 phase 2); claims filter selection, never the numbering.
    SELECT b.backlog_id, b.queue INTO v_pick, v_queue
      FROM public.runner_drain_scope s
      JOIN public.backlog_items b ON b.id = s.item_id
      -- SES-281 / M5-01: the epic fence is STRUCTURAL now, not a convention. Before this join, a
      -- mis-scoped runner_drain_scope row could name any ticket on the board and this function
      -- would hand it to an unattended cycle -- eligibility was a NAME, which anything can be
      -- given. It is now a property of the ticket's own epic_id, which naming cannot widen.
      JOIN public.epics e ON e.id = b.epic_id AND public.epic_project_executing(e.id) -- SES-340
      -- AGT-140 (v7.0.604) / D1: the owning project's `priority` is the FIRST ordering key below.
      -- An INNER join, deliberately: the fence above already proves the epic's project executes,
      -- so every row reaching here has one, and an epic with no project row must not be picked.
      JOIN public.projects pj ON pj.id = e.project_id
     WHERE s.directive_id = d.id
       AND b.queue IS NOT NULL
       -- SES-275: done/removed EXPLICITLY, never inherited from "the recompute strips their queue"
       -- -- an invariant maintained by whoever writes the status, not by this function.
       AND b.status <> ALL (c_finished)
       -- SES-154: a delivered member is built and awaiting John's verdict, so it is not work.
       AND b.status <> 'delivered'
       -- SES-305 / M5-10 + FILE-MATRIX: a DEFERRED member is not work. 'yes' is a written deferral
       -- (a session's or John's, reason mandatory); 'stuck' is M5-10's three-cycles verdict. Explicit
       -- here, never inherited from "the recompute strips their queue" (SES-275's invariant), and
       -- mirrored in prime_directive_queue's buildable CTE so the two homes cannot drift.
       AND COALESCE(b.defer_status, '') <> ALL (ARRAY['yes','stuck'])
       -- SES-295 / M5-03: the review bucket's promotion criterion. A Selfbuild ticket filed on or
       -- after the M5-02 cut with no scope_rationale has not said why it belongs and is not promoted
       -- out of the bucket. Pre-cut tickets are untouched; the priority lane never needed promotion.
       AND NOT (b.filed_at >= c_lane_cut AND COALESCE(btrim(b.scope_rationale), '') = '')
       -- SES-283 / EL-01 + EL-02: an enhancement is picked only when ADMITTED (rationale, claim and
       -- cost on its own row) and only while John's weekly enhancement cap has room for it. Chartered
       -- work never enters this clause.
       AND NOT (COALESCE(b.scope_origin, '') = 'enhancement' AND (
                  COALESCE(btrim(b.enhancement_claim), '') = ''
               OR COALESCE(btrim(b.scope_rationale), '') = ''
               OR b.predicted_cycles IS NULL
               OR public.enhancement_week_spent_pct() + b.predicted_cycles::numeric * public.runner_pct_per_cycle()
                    > (SELECT s.enhancement_cap_pct FROM public.runner_settings s WHERE s.id = 1)))
       -- SES-196, John's directive 5dc62981: a member only he can move is not work either. NULL
       -- and 'designed' both pass this clause; the flags do not.
       AND COALESCE(b.design_status, '') <> ALL (c_flagged)
       -- SES-218, John's directive 07dea95e: a remainder blocked on a still-open ticket is not
       -- work either. This tests the BLOCKER's live status, so the member returns the instant the
       -- blocker lands.
       AND NOT EXISTS (
             SELECT 1 FROM public.backlog_items bb
              WHERE bb.id = b.blocked_by
                AND bb.status <> ALL (c_unblocking)
           )
       -- SES-281 / M5-09, the rolling wave enforced: a milestone member is not pickable while that
       -- milestone's own design-gate ticket is unresolved. `g.id <> b.id` is LOAD-BEARING -- without
       -- it every gate ticket would block ITSELF and the milestone would deadlock permanently, with
       -- the only ticket that could clear the gate sitting behind the gate.
       AND NOT EXISTS (
             SELECT 1 FROM public.backlog_items g
              WHERE g.epic_id = b.epic_id
                AND g.id <> b.id
                AND g.title ILIKE c_gate_pat
                AND g.status <> 'done'
           )
       AND (b.claimed_by IS NULL OR b.claimed_at < now() - make_interval(hours => (SELECT s.claim_stale_hours FROM public.runner_settings s WHERE s.id = 1)))
       AND NOT EXISTS (SELECT 1 FROM public.runner_items ri WHERE ri.backlog_id = b.backlog_id AND ri.kind = 'gated_before_build' AND ri.decision IS NULL) -- SES-424 slice 1 (SES-391): an undecided gate card takes its ticket out of the pick path
       AND b.need_score >= 3 -- AGT-427: scored 3+ only
     -- SES-281 / M5-02 + M5-07, replacing a bare `ORDER BY b.queue`. Precedence, in order:
     --   1. the filing lane (pre-cut first, post-cut into the review bucket) -- the clause that
     --      supersedes B3, whose ordering ended "newest-to-oldest within class", the exact
     --      INVERSE of the priority lane John set;
     --   2. the queue number, as before;
     --   3. M5-07's cheapest-first tiebreak on predicted_cycles, nulls last. It changes only ties
     --      -- never a lane, never a class.
     -- AGT-140 (v7.0.604) / D1: `pj.priority` precedes all three SES-281 keys. John's word
     -- 2026-09-25: three projects execute at once, so which project a named member belongs to is
     -- the first question; the filing lane, the queue and the cheapest-cycles tiebreak still
     -- decide WITHIN a project, unchanged.
     -- AGT-238 (v7.0.660) / D2: leverage precedes pj.priority -- a named member The Development
     -- Manager marked as leverage (leverage_reason set) is picked first; the rest is AGT-140's order.
     -- AGT-427 slice 2 (v7.0.841): severity first, the key prime_directive_queue() leads with.
     ORDER BY 6 - b.need_score,
              CASE WHEN b.leverage_reason IS NOT NULL THEN 0 ELSE 1 END,
              pj.priority,
              CASE WHEN b.filed_at < c_lane_cut THEN 0 ELSE 1 END,
              b.queue,
              b.predicted_cycles NULLS LAST
     LIMIT 1;

    IF v_pick IS NULL THEN
      -- SES-196, John's QA arm (b): NEVER a silent empty. Name the population that rejected the
      -- pick, over exactly the base the pick predicate reads.
      -- SES-281 adds the gate and fence populations for that same reason: M5-09 and M5-01 are two
      -- NEW ways to reject a pick, and a rejection reason with no census line is precisely the
      -- silent empty this block exists to prevent.
      SELECT count(*) FILTER (WHERE b.design_status = ANY(c_flagged))::integer,
             count(*) FILTER (WHERE b.status <> 'delivered'
                                AND COALESCE(b.design_status,'') <> ALL (c_flagged)
                                AND b.claimed_by IS NOT NULL
                                AND b.claimed_at >= now() - make_interval(hours => (SELECT s.claim_stale_hours FROM public.runner_settings s WHERE s.id = 1)))::integer,
             count(*) FILTER (WHERE b.status = 'delivered')::integer,
             count(*) FILTER (WHERE b.status <> 'delivered'
                                AND COALESCE(b.design_status,'') <> ALL (c_flagged)
                                AND EXISTS (SELECT 1 FROM public.backlog_items bb
                                             WHERE bb.id = b.blocked_by
                                               AND bb.status <> ALL (c_unblocking)))::integer,
             count(*) FILTER (WHERE b.status <> 'delivered'
                                AND COALESCE(b.design_status,'') <> ALL (c_flagged)
                                AND EXISTS (SELECT 1 FROM public.backlog_items g
                                             WHERE g.epic_id = b.epic_id
                                               AND g.id <> b.id
                                               AND g.title ILIKE c_gate_pat
                                               AND g.status <> 'done'))::integer,
             count(*) FILTER (WHERE NOT public.epic_project_executing(b.epic_id))::integer,
             string_agg(b.backlog_id || ' (' || b.design_status || ')', ', ' ORDER BY b.queue)
               FILTER (WHERE b.design_status = ANY(c_flagged)),
             string_agg(b.backlog_id || ' (blocked by ' || COALESCE(
                          (SELECT bb.backlog_id FROM public.backlog_items bb WHERE bb.id = b.blocked_by),
                          '?') || ')', ', ' ORDER BY b.queue)
               FILTER (WHERE b.status <> 'delivered'
                         AND COALESCE(b.design_status,'') <> ALL (c_flagged)
                         AND EXISTS (SELECT 1 FROM public.backlog_items bb
                                      WHERE bb.id = b.blocked_by
                                        AND bb.status <> ALL (c_unblocking))),
             string_agg(b.backlog_id, ', ' ORDER BY b.queue)
               FILTER (WHERE b.status <> 'delivered'
                         AND COALESCE(b.design_status,'') <> ALL (c_flagged)
                         AND EXISTS (SELECT 1 FROM public.backlog_items g
                                      WHERE g.epic_id = b.epic_id
                                        AND g.id <> b.id
                                        AND g.title ILIKE c_gate_pat
                                        AND g.status <> 'done'))
        INTO v_flag_n, v_peer_n, v_deliv_n, v_blocked_n, v_gate_n, v_fence_n,
             v_flag_list, v_blocked_list, v_gate_list
        FROM public.runner_drain_scope s
        JOIN public.backlog_items b ON b.id = s.item_id
       WHERE s.directive_id = d.id
         AND b.queue IS NOT NULL
         AND b.status <> ALL (c_finished);

      -- SES-305: the deferred population, counted WITHOUT the queue filter above -- the recompute has
      -- already stripped their queue numbers, so the census base cannot see them. Same reason the
      -- gate and fence buckets exist (SES-281): a rejection with no census line is a silent empty.
      SELECT count(*)::integer,
             string_agg(b.backlog_id || ' (' || b.defer_status || ')', ', ' ORDER BY b.backlog_id)
        INTO v_defer_n, v_defer_list
        FROM public.runner_drain_scope s
        JOIN public.backlog_items b ON b.id = s.item_id
       WHERE s.directive_id = d.id
         AND b.status <> ALL (c_finished)
         AND COALESCE(b.defer_status, '') = ANY (ARRAY['yes','stuck']);

      -- SES-310: the members that are open but NOT on the finish line. Only meaningful when the
      -- gate has ruled (v_req_n > 0) -- with no ruling every named member IS the finish line and
      -- this bucket would libel the whole list. These are not "not work": they stay on the board
      -- and remain pickable under Prime Directive 2(c) after the drain retires. Counted WITHOUT the
      -- queue filter, same reason as the SES-305 bucket above. This bucket and the deferred one are
      -- independent censuses, NOT a partition -- a non-required deferred member appears in both.
      SELECT count(*)::integer,
             string_agg(b.backlog_id, ', ' ORDER BY b.backlog_id)
        INTO v_nonreq_open_n, v_nonreq_open_list
        FROM public.runner_drain_scope s
        JOIN public.backlog_items b ON b.id = s.item_id
       WHERE s.directive_id = d.id
         AND v_req_n > 0
         AND b.milestone_required IS NOT TRUE
         AND b.status <> ALL (c_finished);

      -- SES-295: the population held in the review bucket for want of a scope rationale.
      SELECT count(*)::integer,
             string_agg(b.backlog_id, ', ' ORDER BY b.backlog_id)
        INTO v_ration_n, v_ration_list
        FROM public.runner_drain_scope s
        JOIN public.backlog_items b ON b.id = s.item_id
       WHERE s.directive_id = d.id
         AND b.status <> ALL (c_finished)
         AND b.filed_at >= c_lane_cut
         AND COALESCE(btrim(b.scope_rationale), '') = '';

      -- SES-283: enhancements held back -- not admitted, or over John's weekly cap.
      SELECT count(*)::integer, string_agg(b.backlog_id, ', ' ORDER BY b.backlog_id)
        INTO v_enh_n, v_enh_list
        FROM public.runner_drain_scope s
        JOIN public.backlog_items b ON b.id = s.item_id
       WHERE s.directive_id = d.id
         AND b.status <> ALL (c_finished)
         AND COALESCE(b.scope_origin, '') = 'enhancement'
         AND (COALESCE(btrim(b.enhancement_claim), '') = ''
              OR COALESCE(btrim(b.scope_rationale), '') = ''
              OR b.predicted_cycles IS NULL
              OR public.enhancement_week_spent_pct() + b.predicted_cycles::numeric * public.runner_pct_per_cycle()
                   > (SELECT s2.enhancement_cap_pct FROM public.runner_settings s2 WHERE s2.id = 1));

      -- SES-424 slice 3: THE GATE-CARD BUCKET. Since slice 1 an undecided `gated_before_build` card
      -- takes its ticket out of the pick predicate above -- a NEW way to reject a pick, and a
      -- rejection with no census line is exactly the silent empty SES-196 built this branch to
      -- prevent. Counted over the SAME base the pick reads (queue IS NOT NULL, not finished), so
      -- the number it prints is the number the pick rejected. An all-gated list is not a finished
      -- drain: it must read as "these are gated", never as "read the scope by hand".
      SELECT count(*)::integer, string_agg(b.backlog_id, ', ' ORDER BY b.queue)
        INTO v_card_n, v_card_list
        FROM public.runner_drain_scope s
        JOIN public.backlog_items b ON b.id = s.item_id
       WHERE s.directive_id = d.id
         AND b.queue IS NOT NULL
         AND b.status <> ALL (c_finished)
         AND EXISTS (SELECT 1 FROM public.runner_items ri
                      WHERE ri.backlog_id = b.backlog_id
                        AND ri.kind = 'gated_before_build'
                        AND ri.decision IS NULL);

      -- SES-310: the opening phrase says "required" ONLY when the gate has ruled a finish line.
      -- With no ruling the old phrase stands -- the census must not claim a finish line the drain
      -- does not have.
      v_detail := format(
          CASE WHEN COALESCE(v_req_n,0) > 0
               THEN '%s required member(s) still open and none is claimable now'
               ELSE '%s named member(s) still open and none is claimable now' END, v_open_now)
        || CASE WHEN COALESCE(v_flag_n,0) > 0
                THEN format('; %s waiting on you (%s)', v_flag_n, v_flag_list) ELSE '' END
        || CASE WHEN COALESCE(v_deliv_n,0) > 0
                THEN format('; %s delivered and waiting on your Accept', v_deliv_n) ELSE '' END
        || CASE WHEN COALESCE(v_blocked_n,0) > 0
                THEN format('; %s blocked on another ticket (%s)', v_blocked_n, v_blocked_list) ELSE '' END
        || CASE WHEN COALESCE(v_gate_n,0) > 0
                THEN format('; %s held behind their milestone''s unresolved design gate (%s)',
                            v_gate_n, v_gate_list) ELSE '' END
        || CASE WHEN COALESCE(v_fence_n,0) > 0
                THEN format('; %s outside an executing project', v_fence_n) ELSE '' END
        || CASE WHEN COALESCE(v_defer_n,0) > 0
                THEN format('; %s deferred (%s)', v_defer_n, v_defer_list) ELSE '' END
        || CASE WHEN COALESCE(v_nonreq_open_n,0) > 0
                THEN format('; %s non-required open (%s) - not on the finish line',
                            v_nonreq_open_n, v_nonreq_open_list) ELSE '' END
        || CASE WHEN COALESCE(v_ration_n,0) > 0
                THEN format('; %s awaiting a scope rationale (%s)', v_ration_n, v_ration_list) ELSE '' END
        || CASE WHEN COALESCE(v_enh_n,0) > 0
                THEN format('; %s enhancement(s) not admitted or over the weekly cap (%s)', v_enh_n, v_enh_list) ELSE '' END
        || CASE WHEN COALESCE(v_card_n,0) > 0
                THEN format('; %s carrying an undecided gate card (%s)', v_card_n, v_card_list) ELSE '' END
        || CASE WHEN COALESCE(v_peer_n,0) > 0
                THEN format('; %s held by a live peer claim', v_peer_n) ELSE '' END
        -- SES-310: v_nonreq_open_n is deliberately ABSENT from this sum. It describes DIFFERENT
        -- tickets than the open required members v_open_now counts, so letting it satisfy this
        -- branch would explain a required member's unclaimability with a fact about someone else --
        -- exactly the silent empty SES-196 built this branch to prevent.
        -- SES-424 slice 3: v_card_n IS in the sum, and for the opposite reason -- it counts members
        -- of the very population the pick just rejected, so an all-gated list has been explained.
        || CASE WHEN COALESCE(v_flag_n,0) + COALESCE(v_deliv_n,0) + COALESCE(v_peer_n,0)
                   + COALESCE(v_blocked_n,0) + COALESCE(v_gate_n,0) + COALESCE(v_fence_n,0)
                   + COALESCE(v_defer_n,0) + COALESCE(v_ration_n,0) + COALESCE(v_enh_n,0)
                   + COALESCE(v_card_n,0) = 0
                THEN '; none of them is flagged, delivered, blocked, gated, deferred, awaiting a scope rationale, out of scope or claimed - read the scope by hand'
                ELSE '' END;

      RETURN QUERY SELECT d.id, d.epic_id, v_name, NULL::text, NULL::integer, v_open_now,
                          'blocked'::text, v_detail;
      RETURN;
    END IF;

    RETURN QUERY SELECT d.id, d.epic_id, v_name, v_pick, v_queue, v_open_now, 'pick'::text, NULL::text;
    RETURN;
  END LOOP;

  RETURN QUERY SELECT v_last_ret_id, v_last_ret_epic, v_last_ret_name,
                      NULL::text, NULL::integer, 0, 'retired'::text, NULL::text;
END $function$;

-- (d) THE GATE. This block is the migration's own refusal to ship a lie: it RAISES -- and the whole
-- migration rolls back, all three functions with it -- unless every clause below holds. Written
-- because a migration's success flag is not evidence (.claude/rules/supabase-column-grants.md),
-- and because an empty lane satisfies "nothing below 3" vacuously, which is the false green a ship
-- gate must make structurally impossible rather than merely document against (pattern:75).
--
-- drain_epic_next(uuid) IS DELIBERATELY NEVER CALLED here, the same refusal ses-281, agt-140 and
-- ses-424a make: invoking it retires John's standing drain directive the moment that drain's
-- required members are done, and a migration must not close a standing directive as a side effect.
-- Its half of the change is graded over its shipped `prosrc` in clause 4 and over the mirror text
-- by the two oracles. Declared, not silently skipped.
DO $do$
DECLARE
  c       integer;
  v_name  text;
  v_ident text;
  v_rows  integer;
  v_bad   integer;
  v_src   text;
BEGIN
  -- 1. EXACTLY ONE OVERLOAD PER NAME. None of the three signatures changed, so none of them may
  --    have gained a second definition; a stale overload leaves PostgREST resolving neither, which
  --    surfaces as an empty result rather than an error (.claude/rules/supabase-function-signature.md).
  FOR v_name IN SELECT unnest(ARRAY['pick_exclusions', 'prime_directive_queue', 'drain_epic_next'])
  LOOP
    SELECT count(*)::integer INTO c
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = v_name AND p.prokind = 'f';
    IF c <> 1 THEN
      RAISE EXCEPTION 'AGT-427 GATE: public.% has % overload(s), not 1', v_name, c;
    END IF;
  END LOOP;

  -- 2. EXECUTE STILL CLOSED TO THE BROWSER AND STILL OPEN TO THE RUNNER, asserted in BOTH
  --    directions for all three. CREATE OR REPLACE preserves an existing ACL, so this clause is a
  --    check and not a re-grant -- but functions in this project default OPEN to anon and
  --    authenticated by name (.claude/rules/supabase-column-grants.md, SES-315), so "unchanged" is
  --    a claim that has to be measured. The service_role direction is asserted too: a one-sided
  --    assertion would pass just as happily on a revoke that took the queue down.
  FOR v_ident IN SELECT unnest(ARRAY['public.pick_exclusions()', 'public.prime_directive_queue()', 'public.drain_epic_next(uuid)'])
  LOOP
    IF has_function_privilege('anon', v_ident, 'EXECUTE') THEN
      RAISE EXCEPTION 'AGT-427 GATE: anon holds EXECUTE on % -- the pick is runner-only', v_ident;
    END IF;
    IF has_function_privilege('authenticated', v_ident, 'EXECUTE') THEN
      RAISE EXCEPTION 'AGT-427 GATE: authenticated holds EXECUTE on % -- the pick is runner-only', v_ident;
    END IF;
    IF NOT has_function_privilege('service_role', v_ident, 'EXECUTE') THEN
      RAISE EXCEPTION 'AGT-427 GATE: service_role has lost EXECUTE on % -- the runner reads it, so this would take the queue down', v_ident;
    END IF;
  END LOOP;

  -- 3. THE BEHAVIOUR, over the function's OWN OUTPUT rather than over its text. Every row the two
  --    pick lanes serve is scored 3+, and the lanes are not empty.
  SELECT count(*)::integer,
         count(*) FILTER (WHERE b.need_score IS NULL OR b.need_score < 3)::integer
    INTO v_rows, v_bad
    FROM public.prime_directive_queue() q
    JOIN public.backlog_items b ON b.backlog_id = q.ref
   WHERE q.lane IN ('drain', 'selfbuild');

  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'AGT-427 GATE: the pick still serves % row(s) whose need_score is NULL or below 3', v_bad;
  END IF;
  IF v_rows < 3 THEN
    RAISE EXCEPTION 'AGT-427 GATE: the pick lanes returned % row(s), fewer than 3 -- refusing to bank a green that an empty lane would also produce', v_rows;
  END IF;

  -- 4. NEITHER PICK'S need KEY STILL WRAPS need_score IN A COALESCE (Designer's call (iii)): an
  --    unscored ticket must never sort as a PARKED 0. Graded over the shipped `prosrc`, which is
  --    the only text that can contradict this file.
  --    THE PATTERN IS BUILT BY CONCATENATION ON PURPOSE, and a later session must not "simplify" it
  --    back into one literal: this file is itself grepped for that exact string by AGT-427's QA
  --    guard, which must count ZERO of it, and a literal here would make this gate the only reason
  --    that guard failed.
  FOR v_name IN SELECT unnest(ARRAY['prime_directive_queue', 'drain_epic_next'])
  LOOP
    SELECT p.prosrc INTO v_src
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = v_name AND p.prokind = 'f';
    IF v_src LIKE ('%6 - ' || 'COALESCE%') THEN
      RAISE EXCEPTION 'AGT-427 GATE: public.%''s shipped body still wraps need_score in a COALESCE -- an unscored ticket would sort as a PARKED 0', v_name;
    END IF;
  END LOOP;

  RAISE NOTICE 'AGT-427 GATE passed: % pick-lane row(s), 0 unscored or below 3, one overload each, EXECUTE closed to anon and authenticated and open to service_role, and neither pick wrapping need_score in a COALESCE.', v_rows;
END
$do$;

-- (slice 2, c) THE GATE of migration `agt427_severity_first` (v7.0.841), as applied after the two
-- patches above. It RAISES -- and the migration rolls back -- unless every clause holds. Proven to
-- fire: the same migration WITHOUT edit (a), run inside a forced rollback 2026-10-09, raised
-- "AGT-427 GATE: prime_directive_queue()'s shipped ORDER BY does not lead with sort_need".
-- drain_epic_next(uuid) is NEVER called here (it can retire John's standing drain directive).
-- THE prime PATTERN IS BUILT BY CONCATENATION ON PURPOSE: AGT-427's QA guard greps this file for
-- the literal ORDER BY and must count exactly ONE -- the function body's own.
DO $gate$
DECLARE
  c integer; v_name text; v_ident text; v_src text;
  v_rows integer; v_bad integer; v_inv integer; v_dir_max integer; v_tix_min integer;
BEGIN
  -- 1. the shipped text leads with severity, in both picks.
  SELECT p.prosrc INTO v_src FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'prime_directive_queue' AND p.prokind = 'f';
  IF v_src NOT LIKE ('%ORDER BY sort_need, ' || 'lane_ord,%') THEN
    RAISE EXCEPTION 'AGT-427 GATE: prime_directive_queue()''s shipped ORDER BY does not lead with sort_need';
  END IF;
  SELECT p.prosrc INTO v_src FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'drain_epic_next' AND p.prokind = 'f';
  IF v_src NOT LIKE '%ORDER BY 6 - b.need_score,%' THEN
    RAISE EXCEPTION 'AGT-427 GATE: drain_epic_next(uuid)''s pick ORDER BY does not lead with 6 - b.need_score';
  END IF;

  -- 2. exactly one overload per name (.claude/rules/supabase-function-signature.md).
  FOR v_name IN SELECT unnest(ARRAY['prime_directive_queue', 'drain_epic_next']) LOOP
    SELECT count(*)::integer INTO c FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = v_name AND p.prokind = 'f';
    IF c <> 1 THEN RAISE EXCEPTION 'AGT-427 GATE: public.% has % overload(s), not 1', v_name, c; END IF;
  END LOOP;

  -- 3. EXECUTE closed to anon and authenticated, open to service_role, both directions.
  FOR v_ident IN SELECT unnest(ARRAY['public.prime_directive_queue()', 'public.drain_epic_next(uuid)']) LOOP
    IF has_function_privilege('anon', v_ident, 'EXECUTE') THEN RAISE EXCEPTION 'AGT-427 GATE: anon holds EXECUTE on %', v_ident; END IF;
    IF has_function_privilege('authenticated', v_ident, 'EXECUTE') THEN RAISE EXCEPTION 'AGT-427 GATE: authenticated holds EXECUTE on %', v_ident; END IF;
    IF NOT has_function_privilege('service_role', v_ident, 'EXECUTE') THEN RAISE EXCEPTION 'AGT-427 GATE: service_role lost EXECUTE on %', v_ident; END IF;
  END LOOP;

  -- 4. the behaviour, over the function's own output, in q.pos order: at least 3 rows, none
  --    unscored or below 3, none outranking a lower score ahead of it, every directive ahead.
  WITH l AS (
    SELECT q.pos, b.need_score, lag(b.need_score) OVER (ORDER BY q.pos) AS prev
      FROM public.prime_directive_queue() q
      JOIN public.backlog_items b ON b.backlog_id = q.ref
     WHERE q.lane IN ('drain', 'selfbuild'))
  SELECT count(*)::integer,
         count(*) FILTER (WHERE need_score IS NULL OR need_score < 3)::integer,
         count(*) FILTER (WHERE need_score > prev)::integer,
         min(pos)
    INTO v_rows, v_bad, v_inv, v_tix_min
    FROM l;
  IF v_rows < 3 THEN RAISE EXCEPTION 'AGT-427 GATE: the pick lanes returned % row(s), fewer than 3', v_rows; END IF;
  IF v_bad <> 0 THEN RAISE EXCEPTION 'AGT-427 GATE: % served row(s) unscored or below 3', v_bad; END IF;
  IF v_inv <> 0 THEN RAISE EXCEPTION 'AGT-427 GATE: % row(s) outrank a lower need_score ahead of them (severity is not first)', v_inv; END IF;
  SELECT max(q.pos) INTO v_dir_max FROM public.prime_directive_queue() q WHERE q.lane = 'directive';
  IF v_dir_max IS NOT NULL AND v_dir_max >= v_tix_min THEN
    RAISE EXCEPTION 'AGT-427 GATE: a directive sits at pos %, not ahead of the first ticket-lane pos %', v_dir_max, v_tix_min;
  END IF;

  RAISE NOTICE 'AGT-427 GATE passed: % pick-lane row(s), 0 below 3, 0 severity inversions, directives ahead, one overload each, EXECUTE closed to anon/authenticated and open to service_role, both picks lead with severity.', v_rows;
END
$gate$;
