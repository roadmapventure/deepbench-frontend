-- DeepBench v7.0.604 | docs/design/agt-140-project-priority-pick.sql | AGT-140 -- THE PICK HONOURS
-- `projects.priority` IN BOTH PICK HOMES.
--
-- THE INVERSION, MEASURED LIVE 2026-09-26 (not recalled). Three projects carry
-- `status = 'executing'` at once by John's word of 2026-09-25 -- `auditor-enhancements` (priority 1),
-- `dev-manager-capabilities` (2), `agent-training` (3) -- and NEITHER pick home read
-- `projects.priority`. The selfbuild lane therefore served:
--
--   pos 1  AGT-141  agent-training           priority 3, queue 25, 1 cycle
--   pos 2  AGT-132  dev-manager-capabilities priority 2, queue 30, 2 cycles
--   pos 3  AGT-138  agent-training           priority 3, queue 33, 2 cycles
--
-- and `runner_should_boot()` picked `AGT-141`. A one-cycle ticket in the THIRD-priority project
-- outranked an open buildable ticket in the SECOND, because `queue` was the first key that could
-- tell them apart. That is not a display bug: every future cycle's boot pick comes off this order,
-- so the runner would keep building the lower-priority project indefinitely and silently.
--
-- D1 (mine, reversible): project priority is the FIRST key, ahead of the filing lane, the queue and
-- predicted_cycles. Those three still decide WITHIN a project -- nothing about them changes.
-- D2 (mine, reversible): a row whose project is not executing -- an EL-01-admitted enhancement,
-- which clears `buildable`'s fence through its own admission rather than through an epic -- carries
-- a NULL key and sorts LAST, never first.
--
-- BOTH BODIES BELOW ARE `pg_get_functiondef` OUTPUT, taken live this session via
-- `capture_migration_down('7ff68b47-0639-4f1c-9cd7-c366feb69e60', 'agt140_project_priority_pick', ...)`
-- (`auto-downable`, 2 objects, 0 refusals) and edited in place. Nothing here was retyped from memory.
--
-- NEITHER SIGNATURE CHANGES -- `prime_directive_queue()` takes no arguments and
-- `drain_epic_next(uuid)` keeps its one -- so `CREATE OR REPLACE` replaces rather than overloads.
-- .claude/rules/supabase-function-signature.md still applies and is enforced TWICE here, because
-- "no signature change" is a claim to prove, not one to assume. The two `$dbdown$` blocks below --
-- carried through verbatim from the capture's own derived down, and kept deliberately -- are the
-- rule's required drop-and-assert: each DROPs any `pg_proc` row for its function whose
-- `oid::regprocedure` identity is not the one identity this migration ships, then RAISEs unless
-- exactly one remains. The gate block at the foot re-asserts both counts independently, and the
-- kickoff's omitted-parameter path is `prime_directive_queue()` itself -- a no-argument call whose
-- returned rows that same block requires to be non-empty, since an overload ambiguity surfaces to
-- PostgREST callers as an empty result rather than a crash.
--
-- Migration name: agt140_project_priority_pick. Governing: ARCHITECTURE.md §19v (no write without a
-- before-image -- the capture above IS it), §19b, §19d/§19e Rule #1, §19k.

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
     ORDER BY pj.priority,
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
END $function$
;
do $dbdown$
declare r record; c integer;
begin
  for r in select p.oid::regprocedure::text as ident from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'drain_epic_next' and p.prokind = 'f' and p.oid::regprocedure::text <> all ('{drain_epic_next(uuid)}'::text[]) loop execute 'drop function if exists ' || r.ident; end loop;
  select count(*) into c from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'drain_epic_next' and p.prokind = 'f';
  if c <> 1 then raise exception 'down for public.drain_epic_next left % overload(s), expected 1 (.claude/rules/supabase-function-signature.md)', c; end if;
end
$dbdown$;
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
  -- SES-321: the epic join is now a LEFT JOIN, and the fence itself is now
  -- `(Selfbuild epic OR EL-01-admitted enhancement)`, evaluated together rather than the epic half
  -- discarding the row before the enhancement half is ever read. `e.name`/`e.id` stay usable for
  -- every downstream reference (epic_name, the M5-09 gate join on b.epic_id) because those go
  -- through the ticket's own epic_id, not through this join's existence.
  SELECT b.id, b.backlog_id, b.queue, b.status, b.design_status,
         b.filed_at, b.predicted_cycles, b.epic_id,
         public.backlog_display_title(b.title, b.description) AS disp,
         e.name AS epic_name,
         -- AGT-140 (v7.0.604) / D1 + D2: the owning project's `priority`, and NULL for a row whose
         -- project is not executing -- an EL-01-admitted enhancement reaches this CTE through the
         -- second half of the fence below, with no executing project of its own, and D2 sorts it
         -- LAST (the `NULLS LAST` in `ranked`). LEFT JOIN for the same reason the epics join is one.
         CASE WHEN pj.status = 'executing' THEN pj.priority END AS project_priority
    FROM public.backlog_items b
    LEFT JOIN public.epics e ON e.id = b.epic_id
    LEFT JOIN public.projects pj ON pj.id = e.project_id
   WHERE (
           public.epic_project_executing(b.epic_id)
        OR (
             COALESCE(b.scope_origin, '') = 'enhancement'
         AND COALESCE(btrim(b.enhancement_claim), '') <> ''
         AND COALESCE(btrim(b.scope_rationale), '') <> ''
         AND b.predicted_cycles IS NOT NULL
         AND public.enhancement_week_spent_pct() + b.predicted_cycles::numeric * public.runner_pct_per_cycle()
               <= (SELECT s.enhancement_cap_pct FROM public.runner_settings s WHERE s.id = 1)
           )
         )
     AND b.status IN ('open','partial')
     AND b.queue IS NOT NULL
     -- SES-305 / M5-10 + FILE-MATRIX: a deferred ticket is not buildable. Mirrors drain_epic_next.
     AND COALESCE(b.defer_status, '') <> ALL (ARRAY['yes','stuck'])
     -- SES-295 / M5-03: no scope rationale on a post-cut ticket means not promoted, not buildable.
     AND NOT (b.filed_at >= (SELECT s.filing_lane_cutoff FROM public.runner_settings s WHERE s.id = 1) AND COALESCE(btrim(b.scope_rationale), '') = '')
     -- SES-283 / EL-01 + EL-02: an enhancement is buildable only when admitted and under the weekly cap.
     -- SES-321: kept in place. Redundant for a ticket that only cleared the fence above via the new
     -- predicate (that predicate already proves this NOT-clause true), still load-bearing for an
     -- enhancement-origin ticket that ALSO carries a Selfbuild epic link.
     AND NOT (COALESCE(b.scope_origin, '') = 'enhancement' AND (
                COALESCE(btrim(b.enhancement_claim), '') = ''
             OR COALESCE(btrim(b.scope_rationale), '') = ''
             OR b.predicted_cycles IS NULL
             OR public.enhancement_week_spent_pct() + b.predicted_cycles::numeric * public.runner_pct_per_cycle()
                  > (SELECT s.enhancement_cap_pct FROM public.runner_settings s WHERE s.id = 1)))
     -- SES-281: 'needs-john' is retired (M6-01) and 'john-paced' was converted by this same
     -- migration; 'needs-desktop' stays because it is a physical constraint, not a judgment call.
     AND COALESCE(b.design_status,'') <> ALL (public.pick_blocking_flags())
     AND (b.claimed_by IS NULL OR b.claimed_at < now() - make_interval(hours => (SELECT s.claim_stale_hours FROM public.runner_settings s WHERE s.id = 1)))
     AND NOT EXISTS (SELECT 1 FROM public.runner_items ri WHERE ri.backlog_id = b.backlog_id AND ri.kind = 'gated_before_build' AND ri.decision IS NULL) -- SES-424 slice 1 (SES-391): an undecided gate card takes its ticket out of the pick path
     AND (b.blocked_by IS NULL OR EXISTS (SELECT 1 FROM public.backlog_items bb WHERE bb.id = b.blocked_by AND bb.status = ANY (public.backlog_unblocking_statuses()))) -- SES-424 slice 7: one definition, shared with drain_epic_next
     -- SES-281 / M5-09: a member is not buildable while its milestone's own design gate is
     -- unresolved. `g.id <> b.id` keeps a gate ticket pickable while IT is unresolved -- without
     -- it the milestone deadlocks behind the one ticket that could open it.
     AND NOT EXISTS (
           SELECT 1 FROM public.backlog_items g
            WHERE g.epic_id = b.epic_id
              AND g.id <> b.id
              AND g.title ILIKE 'M_ design gate%'
              AND g.status <> 'done')
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
  SELECT 3, 'selfbuild', to_timestamp(0),
         bu.project_priority,   -- AGT-140 / D1
         CASE WHEN bu.filed_at < (SELECT s.filing_lane_cutoff FROM public.runner_settings s WHERE s.id = 1) THEN 0 ELSE 1 END,
         bu.queue, bu.predicted_cycles::int,
         bu.backlog_id, bu.disp, bu.epic_name,
         bu.queue, bu.status, COALESCE(bu.design_status, '—')
    FROM buildable bu
),
ranked AS (
  -- AGT-140 (v7.0.604) / D1 + D2: within a lane the owning project's `priority` comes FIRST, then
  -- SES-281 / M5-02 + M5-07's filing lane, then the queue number, then the cheapest
  -- predicted_cycles with nulls last. drain_epic_next's ORDER BY is the same
  -- four keys in the same order -- that agreement is the property this pair of functions exists
  -- to hold. `sort_project NULLS LAST` is D2: a row with no executing project of its own (an
  -- EL-01-admitted enhancement) sorts behind every chartered one rather than ahead of it.
  SELECT row_number() OVER (
           ORDER BY lane_ord, sort_key, sort_project NULLS LAST, sort_lane, sort_queue, sort_cycles NULLS LAST
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
$function$
;
do $dbdown$
declare r record; c integer;
begin
  for r in select p.oid::regprocedure::text as ident from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'prime_directive_queue' and p.prokind = 'f' and p.oid::regprocedure::text <> all ('{prime_directive_queue()}'::text[]) loop execute 'drop function if exists ' || r.ident; end loop;
  select count(*) into c from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'prime_directive_queue' and p.prokind = 'f';
  if c <> 1 then raise exception 'down for public.prime_directive_queue left % overload(s), expected 1 (.claude/rules/supabase-function-signature.md)', c; end if;
end
$dbdown$;


-- ---------------------------------------------------------------------------------------------
-- THE GATE. This block RAISES, so a migration that reported success while changing nothing cannot
-- pass. Three things are asserted and none of them is the migration's own success flag:
--   1. exactly ONE pg_proc row per function name (.claude/rules/supabase-function-signature.md --
--      a stale overload is invisible from the new call and total from the old one);
--   2. the shipped `prosrc` actually holds the new keys (`sort_project NULLS LAST`, `pj.priority`);
--   3. the BEHAVIOUR: over the live `selfbuild` lane, joined backlog_items -> epics -> projects,
--      `pos` order is NON-DECREASING in `priority`. This is the clause the inversion fails.
-- ---------------------------------------------------------------------------------------------
do $gate$
declare
  n_prime   integer;
  n_drain   integer;
  src_prime text;
  src_drain text;
  bad_pairs integer;
  lane_n    integer;
  detail    text;
begin
  select count(*) into n_prime
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname = 'prime_directive_queue';
  if n_prime <> 1 then
    raise exception 'AGT-140 gate: public.prime_directive_queue has % pg_proc rows, expected exactly 1 -- drop the stale overload by its full identity argument list', n_prime;
  end if;

  select count(*) into n_drain
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname = 'drain_epic_next';
  if n_drain <> 1 then
    raise exception 'AGT-140 gate: public.drain_epic_next has % pg_proc rows, expected exactly 1 -- drop the stale overload by its full identity argument list', n_drain;
  end if;

  select p.prosrc into src_prime
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname = 'prime_directive_queue';
  if position('sort_project NULLS LAST' in src_prime) = 0 then
    raise exception 'AGT-140 gate: the shipped prime_directive_queue() prosrc does not contain "sort_project NULLS LAST" -- the project-priority key did not land';
  end if;

  select p.prosrc into src_drain
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname = 'drain_epic_next';
  if position('pj.priority' in src_drain) = 0 then
    raise exception 'AGT-140 gate: the shipped drain_epic_next(uuid) prosrc does not contain "pj.priority" -- the project-priority key did not land';
  end if;

  -- The behavioural clause. `prime_directive_queue()` takes no arguments, so this call IS the
  -- omitted-parameter path the signature rule demands be exercised: it must return real rows, not
  -- an ambiguity error surfacing as an empty result.
  with lane as (
    select q.pos, q.ref, pr.priority
      from public.prime_directive_queue() q
      join public.backlog_items b on b.backlog_id = q.ref
      join public.epics e on e.id = b.epic_id
      join public.projects pr on pr.id = e.project_id
     where q.lane = 'selfbuild'
  )
  select count(*) into lane_n from lane;
  if lane_n = 0 then
    raise exception 'AGT-140 gate: the selfbuild lane returned ZERO joinable rows -- either the pick path broke or an overload ambiguity is surfacing as an empty result';
  end if;

  with lane as (
    select q.pos, q.ref, pr.priority
      from public.prime_directive_queue() q
      join public.backlog_items b on b.backlog_id = q.ref
      join public.epics e on e.id = b.epic_id
      join public.projects pr on pr.id = e.project_id
     where q.lane = 'selfbuild'
  ),
  pairs as (
    select a.ref as a_ref, a.pos as a_pos, a.priority as a_prio,
           b2.ref as b_ref, b2.pos as b_pos, b2.priority as b_prio
      from lane a join lane b2 on b2.pos > a.pos
     where b2.priority < a.priority
  )
  select count(*),
         string_agg(format('%s(pos %s, prio %s) precedes %s(pos %s, prio %s)',
                           a_ref, a_pos, a_prio, b_ref, b_pos, b_prio), '; ')
    into bad_pairs, detail
    from pairs;

  if COALESCE(bad_pairs, 0) > 0 then
    raise exception 'AGT-140 gate: the selfbuild lane is NOT non-decreasing in projects.priority -- %', detail;
  end if;
end $gate$;
