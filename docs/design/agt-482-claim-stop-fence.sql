-- DeepBench v7.0.856 | docs/design/agt-482-claim-stop-fence.sql | AGT-482 -- the claim fence: one function holds the claim's window, its STOPPED-BY-JOHN sentinel and the sentence it prints, and the pick and the countable sensor both read it.
--
-- ==============================================================================================
-- THE MIRROR of migration `agt482_claim_stop_fence`. The SQL below the header is the migration
-- verbatim, as applied. The three readers are each a `CREATE OR REPLACE` of their OWN LIVE BODY
-- with only the claim clause changed, so the diff against `pg_get_functiondef()` is exactly the
-- clause and nothing else.
-- ==============================================================================================
--
-- ---- THE DOWN, captured BEFORE the apply (docs/runbooks/runner-cycle.md step 6) ---------------
-- `select * from public.capture_migration_down('45441f25-96f5-4476-812b-c7f5be0405e6',
--  'agt482_claim_stop_fence', '[{"kind":"function","identity":"public.claim_exclusion_reason(text, timestamptz)"},
--  {"kind":"function","identity":"public.pick_exclusions()"},
--  {"kind":"function","identity":"public.drain_epic_next(uuid)"},
--  {"kind":"function","identity":"public.countable_tickets_per_project()"}]'::jsonb)` returned:
--
--   captured_up_name        | captured_class | objects_captured | refusals | length(derived_down_sql)
--   agt482_claim_stop_fence | auto-downable  | 4                | 0        | 41726
--
-- `claim_exclusion_reason` captured `existed: false` (overloads_before 0, down = a bare DROP); the
-- three readers captured their prior definitions, so the down restores today's bodies exactly.
--
-- ---- INV, read-only, measured 2026-10-18 ~04:45Z before the apply (cycle 45441f25) ------------
-- (a) THE STOP RESTS ON NOTHING. No function definition in `public` contains `STOPPED`, and no
--     `governance_rules.statement` contains `STOPPED-BY-JOHN`. Three rows carry the sentinel, all
--     `claimed_by = 'STOPPED-BY-JOHN-2026-09-29'`, all `partial`, all 18d 13h+ old:
--       AGT-020 2026-09-29 14:48:57Z | AGT-159 2026-09-29 14:53:35Z | PRO-3 2026-09-29 14:48:57Z
--     and `public.pick_exclusions()` gave them NO claim reason at all:
--       AGT-020 {project not executing (planned), outside the exclusive drain}
--       AGT-159 {project not executing (planned), outside the exclusive drain}
--       PRO-3   {project not executing (planned), need_score 2 is below 3, outside the exclusive drain}
--     Already 18 days past `claim_stale_hours` = 24, they were held out of the pick by their
--     project's `planned` status and a standing exclusive drain -- two facts that can change
--     without anyone touching the stop. That is the live reverse risk AGT-482 names.
-- (b) TWO NUMBERS, TWO HOMES. `runner_settings.claim_stale_hours` = 24 was read by
--     `pick_exclusions()` (1 clause + 1 comment), `drain_epic_next(uuid)` (pick predicate + peer
--     counter) and `backlog_mode()` (1); `countable_tickets_per_project()` already read
--     `public.countable_claim_hours()` = 6 (AGT-481, v7.0.854).
-- (c) THE GRANT SURFACE, before the apply: `pick_exclusions`, `drain_epic_next`,
--     `countable_tickets_per_project`, `countable_claim_hours`, `backlog_mode` and
--     `prime_directive_queue` are all SECURITY INVOKER with EXECUTE false/false/true for
--     anon/authenticated/service_role. F1 is created to match, by the named-revoke form
--     `.claude/rules/supabase-column-grants.md` (SES-315) requires.
--
-- ---- WHAT IS DELIBERATELY NOT HERE -----------------------------------------------------------
-- `public.backlog_mode()` and `runner_settings.claim_stale_hours` (24) are UNTOUCHED. 24 now
-- serves the display badge alone; pointing the badge at F1 would make AGT-020, AGT-159 and PRO-3
-- read "in development" forever -- wrong, and a visible change John has not seen (pattern:84,
-- pattern:90). Registry row OD-08 is rewritten in the same ship to say exactly that.
-- `drain_epic_next`'s census sentence `'; %s held by a live peer claim'` stays byte-unchanged
-- while a STOPPED member now counts toward it: a stopped claim IS a hold, and rewording a
-- displayed sentence is outside this ticket.
--
-- Guard: tests/regression/agt-482-claim-stop-fence.test.mjs. Rationale: docs/harvests/AGT-482.md.
-- Governing: docs/ARCHITECTURE.md §19v; John's decisions 10 and 23
-- (docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md).
-- ==============================================================================================

-- ---- F1: THE ONE HOME ------------------------------------------------------------------------
-- Three facts that are one fact: the window, the sentinel, and the sentence a reader prints. NULL
-- means "this claim does not keep the ticket out of the pick"; anything else is the reason it does.
-- The 6 is NOT re-declared here -- it stays in `public.countable_claim_hours()` (AGT-481, John's
-- decision 10). The sentinel is a PREFIX match because the live rows carry a date suffix
-- (`STOPPED-BY-JOHN-2026-09-29`), and it is tested BEFORE the age arm so that no amount of elapsed
-- time ever frees a stop (John's decision 23). STABLE, not IMMUTABLE: it reads `now()`.
CREATE OR REPLACE FUNCTION public.claim_exclusion_reason(p_claimed_by text, p_claimed_at timestamptz)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path = public, pg_catalog
AS $function$
  SELECT CASE
    WHEN p_claimed_by IS NULL THEN NULL
    WHEN p_claimed_by LIKE 'STOPPED-BY-JOHN%'
      THEN 'stopped by John (' || p_claimed_by || '); only John releases this claim'
    WHEN p_claimed_at IS NULL
      OR p_claimed_at >= now() - make_interval(hours => public.countable_claim_hours())
      THEN 'claimed by ' || p_claimed_by
    ELSE NULL
  END
$function$;

-- The grant surface, in the order .claude/rules/supabase-column-grants.md (SES-315) requires:
-- `pg_default_acl` grants EXECUTE to anon, authenticated and service_role BY NAME the instant a
-- function is created, and `REVOKE ... FROM PUBLIC` alone leaves those three standing. Revoke the
-- three by name, then grant service_role, and let the gate below assert BOTH directions.
REVOKE ALL ON FUNCTION public.claim_exclusion_reason(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_exclusion_reason(text, timestamptz) TO service_role;

-- ---- READER 1/4: public.pick_exclusions() -- the reason a ticket is out of the pick ----------------
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
         -- AGT-482: the claim, against `public.claim_exclusion_reason()` -- ONE home for the
         -- window (`countable_claim_hours()` = 6), the STOPPED-BY-JOHN sentinel and the sentence.
         public.claim_exclusion_reason(b.claimed_by, b.claimed_at),
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
         CASE WHEN NOT coalesce((b.need_score >= 3 OR EXISTS (SELECT 1 FROM public.runner_drain_scope s JOIN public.runner_directives d ON d.id = s.directive_id WHERE s.item_id = b.id AND d.type = 'drain-epic' AND d.status = 'queued')), false) -- AGT-455: a queued drain's named member is exempt
              THEN CASE WHEN b.need_score IS NULL THEN 'not yet scored (waits for Victoria)'::text
                        ELSE 'need_score ' || b.need_score || ' is below 3' END END,
         -- AGT-456 (v7.0.842), John's standing drain: THE EXCLUSIVE DRAIN HOLDS THE PICK. While a
         -- queued drain-epic marked `exclusive` still has an open member, every ticket OUTSIDE that
         -- drain's named scope is out of the pick and says so. Without this clause the queue answered
         -- 9 strangers (AGT-398 first) while a 9-member Tooling drain stood, and nothing anywhere
         -- named a reason. A drain with no open member left holds nothing, and a drain marked
         -- `exclusive = false` (the cap-split's own, DRAIN-CAP-SPLIT) holds nothing either.
         CASE WHEN EXISTS (
                  SELECT 1 FROM public.runner_directives d
                   WHERE d.type = 'drain-epic' AND d.status = 'queued' AND d.exclusive
                     AND EXISTS (
                       SELECT 1 FROM public.runner_drain_scope s
                         JOIN public.backlog_items m ON m.id = s.item_id
                        WHERE s.directive_id = d.id AND m.status NOT IN ('done','removed')))
              AND NOT EXISTS (
                  SELECT 1 FROM public.runner_drain_scope s
                    JOIN public.runner_directives d ON d.id = s.directive_id
                   WHERE s.item_id = b.id
                     AND d.type = 'drain-epic' AND d.status = 'queued' AND d.exclusive)
              THEN 'outside the exclusive drain'::text END
       ], NULL::text) AS reasons
  FROM public.backlog_items b
  LEFT JOIN public.epics e ON e.id = b.epic_id
  LEFT JOIN public.projects pj ON pj.id = e.project_id
  -- the blocker ROW, for the sentence only; the clause above is evaluated by its own EXISTS.
  LEFT JOIN public.backlog_items bl ON bl.id = b.blocked_by;
$function$;

-- ---- READER 2/4: public.drain_epic_next(uuid) -- the pick predicate and the peer counter -----------
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

    -- DRAIN DELIVERED (John, 2026-10-17): every named member delivered -> the drain is delivered, and the next drain is read. Retirement above is unchanged.
    IF NOT EXISTS (SELECT 1 FROM public.runner_drain_scope s2 JOIN public.backlog_items b2 ON b2.id = s2.item_id
                    WHERE s2.directive_id = d.id AND b2.status <> 'delivered') THEN
      INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
      VALUES (p_cycle_id, 'runner_directives', d.id::text, to_jsonb(d));
      UPDATE public.runner_directives SET status = 'delivered', acted_cycle = p_cycle_id WHERE id = d.id AND status = 'queued';
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
       AND public.claim_exclusion_reason(b.claimed_by, b.claimed_at) IS NULL -- AGT-482: the fence, one home
       AND NOT EXISTS (SELECT 1 FROM public.runner_items ri WHERE ri.backlog_id = b.backlog_id AND ri.kind = 'gated_before_build' AND ri.decision IS NULL) -- SES-424 slice 1 (SES-391): an undecided gate card takes its ticket out of the pick path
       -- AGT-455: no score gate here: every row of this pick is a named member of queued drain d, which is the exemption; pick_exclusions() and the selfbuild lane keep it.
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
                                AND public.claim_exclusion_reason(b.claimed_by, b.claimed_at) IS NOT NULL)::integer,
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

-- ---- READER 3/4: public.countable_tickets_per_project() -- AGT-481's takeable-ticket sensor --------
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
          AND b.status IN ('open', 'partial')
          AND b.need_score >= 3
          AND EXISTS (
                SELECT 1 FROM public.runner_decisions d
                 WHERE d.kind = 'requirement-check'
                   AND d.backlog_id = b.backlog_id
                   AND d.reversed_at IS NULL)
          AND (b.blocked_by IS NULL
               OR EXISTS (
                    SELECT 1 FROM public.backlog_items bb
                     WHERE bb.id = b.blocked_by
                       AND bb.status = ANY (public.backlog_unblocking_statuses())))
          AND coalesce((
                SELECT d2.reasoning FROM public.runner_decisions d2
                 WHERE d2.kind = 'requirement-check'
                   AND d2.backlog_id = b.backlog_id
                   AND d2.reversed_at IS NULL
                 ORDER BY d2.decided_at DESC
                 LIMIT 1), '') NOT ILIKE 'PARKED%'
          AND NOT EXISTS (
                SELECT 1 FROM public.runner_items ri
                 WHERE ri.backlog_id = b.backlog_id
                   AND ri.kind = 'gated_before_build'
                   AND ri.decision IS NULL)
          AND coalesce(b.design_status, '') NOT LIKE 'needs-%'
          AND public.claim_exclusion_reason(b.claimed_by, b.claimed_at) IS NULL
   WHERE pj.status = 'executing'
   GROUP BY pj.slug, pj.name, pj.priority
   ORDER BY pj.priority, pj.slug
$function$;

-- ---- THE GATE: every assert both ways, and a RAISE rolls the whole migration back -----------
do $gate$
declare
  v_n       integer;
  v_name    text;
  v_reason  text;
  v_stopped integer;
  v_fenced  integer;
begin
  -- (a) one overload per name (.claude/rules/supabase-function-signature.md). A changed signature
  -- would leave two, and PostgREST would answer an ambiguity error as an EMPTY result, not a crash.
  foreach v_name in array ARRAY['claim_exclusion_reason','pick_exclusions','drain_epic_next','countable_tickets_per_project'] loop
    select count(*) into v_n
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = v_name and p.prokind = 'f';
    if v_n <> 1 then
      raise exception 'agt482: public.% has % overload(s), expected exactly 1 -- a stale overload is invisible from the new call and total from the old one', v_name, v_n;
    end if;
  end loop;

  -- (b) EXECUTE closed to the public keys and OPEN to service_role -- both directions, never the
  -- migration's own success flag.
  if has_function_privilege('anon', 'public.claim_exclusion_reason(text, timestamptz)', 'EXECUTE') then
    raise exception 'agt482: anon can EXECUTE claim_exclusion_reason() -- the named revoke did not land';
  end if;
  if has_function_privilege('authenticated', 'public.claim_exclusion_reason(text, timestamptz)', 'EXECUTE') then
    raise exception 'agt482: authenticated can EXECUTE claim_exclusion_reason() -- the named revoke did not land';
  end if;
  if NOT has_function_privilege('service_role', 'public.claim_exclusion_reason(text, timestamptz)', 'EXECUTE') then
    raise exception 'agt482: service_role CANNOT EXECUTE claim_exclusion_reason() -- the grant is missing';
  end if;

  -- (c) the 6-hour window, BOTH ways. Doing nothing fails the 7h read; widening alone fails the 5h.
  if public.claim_exclusion_reason('cycle-x', now() - interval '7 hours') is not null then
    raise exception 'agt482: a 7h-old claim still excludes -- the window did not narrow to countable_claim_hours()';
  end if;
  if public.claim_exclusion_reason('cycle-x', now() - interval '5 hours') is distinct from 'claimed by cycle-x' then
    raise exception 'agt482: a 5h-old claim does not read "claimed by cycle-x" (got %) -- the window widened past John decision 10',
      public.claim_exclusion_reason('cycle-x', now() - interval '5 hours');
  end if;
  if public.claim_exclusion_reason(null, now()) is not null then
    raise exception 'agt482: an unclaimed row reads excluded';
  end if;
  if public.claim_exclusion_reason('cycle-x', null) is distinct from 'claimed by cycle-x' then
    raise exception 'agt482: a held claim with no claimed_at must read live -- that is the live bodies cautious direction';
  end if;

  -- (d) the stop, BOTH ways: the SAME sentence at 19 days and at 1 minute. Age never frees it.
  v_reason := public.claim_exclusion_reason('STOPPED-BY-JOHN-2026-09-29', now() - interval '19 days');
  if v_reason is distinct from public.claim_exclusion_reason('STOPPED-BY-JOHN-2026-09-29', now() - interval '1 minute') then
    raise exception 'agt482: the stop reads differently at 19 days than at 1 minute -- age must not touch it';
  end if;
  if v_reason !~ '^stopped by John' then
    raise exception 'agt482: a STOPPED-BY-JOHN claim reads % -- expected a sentence opening "stopped by John"', coalesce(v_reason, '<null>');
  end if;

  -- (e) the readers carry it: every live STOPPED-BY-JOHN row now has that reason in
  -- pick_exclusions(). Before this migration those rows had NO claim reason at all.
  select count(*) into v_stopped from public.backlog_items where claimed_by like 'STOPPED-BY-JOHN%';
  select count(*) into v_fenced
    from public.backlog_items b
    join public.pick_exclusions() x on x.id = b.id
   where b.claimed_by like 'STOPPED-BY-JOHN%'
     and exists (select 1 from unnest(x.reasons) r where r ~ '^stopped by John');
  if v_fenced <> v_stopped then
    raise exception 'agt482: % of % STOPPED-BY-JOHN row(s) carry the stop reason in pick_exclusions() -- the reader was not rewired', v_fenced, v_stopped;
  end if;

  raise notice 'AGT-482 GATE PASSED: 1 overload each on 4 names, EXECUTE closed to anon/authenticated and open to service_role, 6h both ways, the stop identical at 19d and 1min, % STOPPED row(s) fenced in pick_exclusions()', v_fenced;
end
$gate$;
