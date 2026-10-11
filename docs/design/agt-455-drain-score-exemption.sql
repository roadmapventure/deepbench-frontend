-- DeepBench v7.0.847 | docs/design/agt-455-drain-score-exemption.sql | AGT-455 -- a queued drain's named member is exempt from AGT-427's score gate: the drain pick carries no score gate at all, pick_exclusions() exempts a member, and the SELFBUILD LANE KEEPS THE GATE as its own lane rule.
--
-- ==============================================================================================
-- THE MIRROR of migration `agt455_drain_score_exemption`. The SQL below the header is the
-- migration verbatim, as applied. tests/regression/agt-455-drain-score-exemption.test.mjs reads
-- THIS FILE: its needles are the struck-out drain gate, the MEMBER predicate, lane (c)'s own rule
-- and the gate sentinel, each with a deletion control, plus the assert that the drain pick's old
-- score line is GONE -- so the mirror cannot drift from what shipped without the suite saying so.
-- ==============================================================================================
--
-- ---- INV, read-only, measured 2026-10-11 ~08:05-08:21Z before the apply (cycle 17f223d6) ------
-- THE PROBLEM, live. John's one queued drain-epic 11db3e2d (epic ced3a7d0 Tooling, project
-- executing, exclusive, 9 named members) names AGT-452 and AGT-453, both open and both scored 2.
-- AGT-427 (v7.0.825) listed a ticket only when scored 3+, and it put that rule in three places at
-- once -- so John's own named drain work was unreachable by the thing built to drain it:
--   pick_exclusions() answered AGT-452 {blocked by AGT-455 (open), need_score 2 is below 3}
--                              AGT-453 {blocked by AGT-452 (open), need_score 2 is below 3}
-- A FIXTURE PROBE, rolled back, measured the gate's own four cases against the PRE-splice bodies
-- (ZFIX-45501 scored 2 and ZFIX-45502 scored 5 in epic ced3a7d0, under a fixture exclusive drain D
-- dated 2020-01-01 so both picks read it):
--   A  drain_epic_next(cycle) over D/ZFIX-45501 -> outcome 'blocked', backlog_id NULL
--   B  pick_exclusions() ZFIX-45501             -> {need_score 2 is below 3}
--   BC prime_directive_queue()                  -> drain {ZFIX-45502}, selfbuild {ZFIX-45502}
--      i.e. the scored-2 named member was in NEITHER lane and the drain pick refused it outright.
-- THE THREE HOMES, read live by pg_get_functiondef before the apply, md5 and one overload each:
--   drain_epic_next(uuid)       md5 01c45e6516771d1b630d4b8a58808bcc, 28721 bytes
--   pick_exclusions()           md5 88d3f6fd55851d8665b7080c4094fa50, 7543 bytes
--   prime_directive_queue()     md5 0cf969bdeb2cb060e84d1b5bf58f5f78, 7271 chars
--
-- ---- THE GRANT SURFACE, checked live both directions (.claude/rules/supabase-column-grants.md)
-- All three functions are re-created, not created, so pg_default_acl's by-name EXECUTE grants to
-- anon/authenticated (addendum SES-315) never apply -- CREATE OR REPLACE keeps the existing ACL.
-- Asserted anyway, in the gate AND again outside it, because a migration's success flag proves
-- nothing: EXECUTE on each of the three reads anon=false, authenticated=false, service_role=true.
-- pick_exclusions() already read runner_drain_scope and runner_directives (AGT-456's clause), so
-- the new MEMBER predicate reads no table it could not read before and adds no exposure; anon and
-- authenticated hold zero privileges of any type on either table.
--
-- ---- THE DOWN, captured BEFORE the apply (runbook step 6) ------------------------------------
-- select * from public.capture_migration_down(
--   '17f223d6-75ee-477b-b4ec-c0eff3dafac1', 'agt455_drain_score_exemption',
--   '[{"kind":"function","identity":"public.drain_epic_next(uuid)"},
--     {"kind":"function","identity":"public.pick_exclusions()"},
--     {"kind":"function","identity":"public.prime_directive_queue()"}]')
-- ->  captured_up_name = agt455_drain_score_exemption
--     captured_class   = auto-downable
--     objects_captured = 3
--     refusals         = 0
-- Stored in runner_migration_downs.up_name = 'agt455_drain_score_exemption' (captured 08:07:12Z):
-- all three prior bodies in full, each followed by the sweep that asserts exactly 1 overload
-- remains. THERE IS NO MANUAL HALF -- nothing is created, no column is added, no object is
-- removed, so the captured down is the whole reverse.
--
-- ---- THE SPLICE, proven byte-exact rather than retyped ---------------------------------------
-- The prior definitions were not retyped: they were read back from the captured down's own
-- prior_ddl (which capture_migration_down stores verbatim) and checksummed against the live
-- pg_get_functiondef BEFORE the splice -- 01c45e65... / 88d3f6fd... / 0cf969bd..., all three MATCH.
-- Each splice is then one line, and the md5 of the spliced text was PREDICTED before the apply:
--   drain_epic_next       0de013dae7827e65b133f0e10951d580   (the score line -> the AGT-455 comment)
--   pick_exclusions       b78b750680aa0db3b246caa7aca7bae3   (the CASE head gains the MEMBER limb)
--   prime_directive_queue 5551b801e7823edd4df4c622de0e2ae9   (lane (c)'s WHERE gains the rule)
-- The gate RAISEs unless the committed md5s equal those three predictions, so a mis-transcribed
-- body -- even one drifting only in a comment -- cannot commit. Every line below other than the
-- three spliced ones is the shipped body byte-for-byte.
--
-- ---- THE APPLY, and what it proves ----------------------------------------------------------
-- Applied 2026-10-11 ~08:39Z by runner cycle 17f223d6 as migration `agt455_drain_score_exemption`,
-- this file's SQL verbatim and unedited. Result: {"success":true}.
-- GATE LINES -- READ THIS CAVEAT. The trailing DO block's `AGT-455 GATE PASSED. ...` RAISE NOTICE
-- body was NOT relayed back by the apply channel, so it is not quoted here and nobody has read it.
-- What the success flag does prove is the only thing the gate was built to prove: the outer block
-- RAISEs -- aborting the whole migration, all three bodies included -- unless every assertion
-- holds, so a committed migration IS the gate's pass. What it graded, over fixtures ZFIX-45501
-- (scored 2) and ZFIX-45502 (scored 5) in epic ced3a7d0 under a fixture exclusive drain D dated
-- 2020-01-01:
--   A  drain_epic_next(cycle) with D naming ZFIX-45501 only -> outcome 'pick', ZFIX-45501
--      (the pre-splice probe above answered 'blocked' / NULL on the same fixtures)
--   B  ZFIX-45502 named in too -> pick_exclusions() ZFIX-45501 reasons {} and the queue's drain
--      lane names both ZFIX-45501 and ZFIX-45502
--   C  THE OTHER HALF OF THE PAIR, same board state: the selfbuild lane names ZFIX-45502 and NOT
--      ZFIX-45501 -- which is what keeps the two live AGT-427 pins green
--   D  THE CONTROL: D closed (status 'done'), so the SAME ticket is no longer a member of a queued
--      drain -> ZFIX-45501 reads 'need_score 2 is below 3' again and is in neither lane
--   then exactly 1 pg_proc overload of each of the three, the three predicted md5s, the score
--   expression occurring 0 / 1 / 1 times, EXECUTE false/false/true on each, and zero residue.
-- ZERO FIXTURE RESIDUE, re-read after the apply: 0 backlog_items with source_file='agt455-gate',
-- 0 rows whose backlog_id starts ZFIX-455, 0 runner_directives whose body starts 'AGT-455 GATE
-- FIXTURE', 0 runner_drain_scope rows naming a ZFIX ticket. The sentinel undid every fixture
-- write; the three bodies committed.
--
-- ---- THE THREE FUNCTIONS AFTER THE APPLY, re-read live outside the gate ----------------------
--   public.drain_epic_next(uuid)        -> 1 overload, md5 0de013dae7827e65b133f0e10951d580,
--                                          28838 bytes, 'b.need_score >= 3' occurs 0 times
--   public.pick_exclusions()            -> 1 overload, md5 b78b750680aa0db3b246caa7aca7bae3,
--                                          7779 bytes, 'b.need_score >= 3' occurs 1 time
--   public.prime_directive_queue()      -> 1 overload, md5 5551b801e7823edd4df4c622de0e2ae9,
--                                          7386 chars, 'bu.need_score >= 3' occurs 1 time
--   EXECUTE, all three, both directions: anon=false, authenticated=false, service_role=true.
--
-- ---- THE LIVE BOARD AFTER, re-read 2026-10-11 ~08:42Z (the kickoff's QA 6.3) -----------------
--   (1) over all 9 named members of the one queued drain-epic scope, the number carrying a reason
--       matching /is below 3|not yet scored/ is 0 (it was 2 before this apply). The two scored-2
--       members now carry only their own blockers:
--         AGT-452 {blocked by AGT-455 (open)}   AGT-453 {blocked by AGT-452 (open)}
--   (2) the selfbuild lane has 0 rows on the live board right now, so every selfbuild row trivially
--       carries an integer need_score >= 3 -- stated as the 0 it is, not as a pass. AGT-456's
--       exclusive drain holds the pick and all 9 members are blocked, claimed or carded, so the
--       whole queue is the single 'board' row. The positive half of that lane rule is what the
--       gate's case C measured under fixtures.
--   (3) THE NON-MEMBER CONTROL on the real board: AA-121 (open, queued 207, scored 2, named into
--       no drain) reads {project not executing (planned), need_score 2 is below 3, outside the
--       exclusive drain} -- the score gate is untouched for every ticket outside a queued drain.
--
-- ---- WHAT IS DELIBERATELY NOT HERE ----------------------------------------------------------
-- The score gate is NOT removed from the selfbuild lane, and that is the whole shape of the fix
-- (designer's call (iii)): with the reason gone from pick_exclusions(), a scored-2 member reaches
-- `buildable`, which feeds BOTH lane (b) drain and lane (c) selfbuild, so lane (c) now carries
-- AGT-427's rule itself -- exactly where AGT-173 put the noship fence, and for the same reason: it
-- is a lane's rule, not a property of the ticket. Without it a scored-2 drain member would list
-- under `selfbuild` and both live AGT-427 pins (agt-140-project-priority-pick and
-- ses-281-m5-pick-enforcement, each grading `lane === 'selfbuild'`) would go red.
-- MEMBER is ANY queued drain-epic, exclusive or not (call (i)); the drain pick's own gate is struck
-- out rather than OR'd, because every row that pick can reach is already a named member (call (ii));
-- a NULL score inside a drain is exempt too, since the pre-v7.0.825 drain named unscored members
-- (call (v)); and this file is a SIBLING of docs/design/agt-427-scored-pick.sql rather than an edit
-- to it (call (iv)) -- three shipped tests read that mirror and it is the record of what AGT-427
-- applied. All five are JOHN-0925-DESIGNER-DECIDES calls, reversible, harvest docs/harvests/AGT-455.md section 5.
--
-- ---- THE MIGRATION, VERBATIM -----------------------------------------------------------------
-- MIGRATION agt455_drain_score_exemption | DeepBench v7.0.847 | AGT-455
-- a queued drain's named member is exempt from AGT-427's score gate. The drain pick carries no
-- score gate at all (every row it considers IS a named member), pick_exclusions() exempts a member
-- from the gate, and the SELFBUILD LANE KEEPS THE GATE as its own lane rule -- so a scored-2 member
-- is claimable as drain work and still never listed as a Selfbuild pick.
--
-- FOUR PARTS, one apply: three CREATE OR REPLACE of the LIVE bodies (transcribed, md5-proven
-- against pg_get_functiondef BEFORE the splice, identity argument lists byte-unchanged, so no
-- overload is added and none has to be removed -- .claude/rules/supabase-function-signature.md)
-- and the trailing gated DO block. The DO block
-- writes its fixtures inside a sub-block that ends in sentinel P0455, so every fixture write is
-- undone while this migration still commits; the outer block then RAISEs -- aborting the whole
-- migration -- unless A/B/C/D, the three md5s, the overload counts, the grants and the zero
-- residue all hold.
-- Down: runner_migration_downs.up_name = 'agt455_drain_score_exemption', captured BEFORE this
-- apply (class auto-downable, 3 objects, 0 refusals) -- it restores all three prior bodies and
-- sweeps for overloads. No manual half: these three bodies are the whole of this migration.

-- ---------------------------------------------------------------------------------------------
-- 1. THE DRAIN PICK. drain_epic_next(uuid) re-created with the AGT-427 score line REPLACED BY A
--    COMMENT (designer's call (ii), JOHN-0925-DESIGNER-DECIDES: struck out, not OR'd). Every row this
--    pick can reach is already `WHERE s.directive_id = d.id` -- a named member of the queued drain
--    d -- so membership is not a condition to add here, it is the shape of the query. Identity
--    argument list (uuid) byte-unchanged; the gate asserts exactly 1 overload remains.
-- ---------------------------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------------------------
-- 2. THE REASON SET. pick_exclusions() re-created with ONE limb added to the AGT-427 CASE's head:
--    a member of a queued drain-epic's named scope is exempt. The THEN branches are untouched, so
--    a NON-member still reads 'need_score N is below 3' or 'not yet scored (waits for Victoria)'.
--    MEMBER is ANY queued drain, exclusive or not (designer's call (i)), and a NULL score inside a
--    drain is exempt too (call (v)) -- the pre-v7.0.825 drain named unscored members. Identity
--    argument list (none), RETURNS TABLE columns, LANGUAGE sql and STABLE byte-unchanged.
--    Grants: anon and authenticated hold no EXECUTE on this function and no privilege of any type
--    on runner_drain_scope or runner_directives, so the new read leaks nothing and breaks no public
--    reader (.claude/rules/supabase-column-grants.md -- the gate asserts both directions rather
--    than trusting this migration's success flag).
-- ---------------------------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------------------------
-- 3. THE LANE RULE. prime_directive_queue() re-created with the score gate added to lane (c)'s own
--    WHERE (designer's call (iii)). This is the half that keeps the exemption from leaking: with
--    the reason gone from pick_exclusions(), a scored-2 member reaches `buildable`, and buildable
--    feeds BOTH lane (b) drain and lane (c) selfbuild. Lane (c) is where AGT-427's rule now lives,
--    exactly like AGT-173's noship fence one line above it -- a lane's rule, not a property of the
--    ticket -- and that is what holds the two live AGT-427 pins (agt-140-project-priority-pick and
--    ses-281-m5-pick-enforcement both grade `lane === 'selfbuild'`). NULL stays out: NULL >= 3 is
--    NULL, never true. Identity argument list (none) and every other clause byte-unchanged.
-- ---------------------------------------------------------------------------------------------
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
     AND bu.need_score >= 3 -- AGT-455: this lane's rule (John's directive deef7eb6), not a property of the ticket
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

-- ---------------------------------------------------------------------------------------------
-- 4. GATE. The sub-block writes two fixtures and a fixture drain older than every real one, drives
--    A / B / C / D of the kickoff's QA 6.1 and ends in sentinel P0455, so every fixture write is
--    rolled back while this migration commits. Variable assignment is not transactional, so the
--    measurements survive the rollback and the outer block grades them. Fail-closed: anything that
--    does not hold RAISEs and the whole migration aborts, so a committed migration IS the pass.
-- ---------------------------------------------------------------------------------------------
DO $gate$
declare
  c_cycle   uuid := '17f223d6-75ee-477b-b4ec-c0eff3dafac1';
  c_epic    uuid := 'ced3a7d0-5382-47f2-9163-ad21c176de6b';   -- Tooling, project executing
  v_f1 uuid; v_f2 uuid; v_d uuid;
  v_out_a   text;    v_pick_a  text;
  v_reas_b  text[];  v_drain_b text[];  v_self_c  text[];
  v_reas_d  text[];  v_lanes_d text[];
  v_n_den int; v_n_pe int; v_n_pq int;
  v_md5_den text; v_md5_pe text; v_md5_pq text;
  v_occ_den int; v_occ_pe int; v_occ_pq int;
  v_items int; v_dirs int;
  v_anon boolean[] := '{}'; v_auth boolean[] := '{}'; v_svc boolean[] := '{}';
  r record;
begin
  begin
    -- ---- FIXTURES ---------------------------------------------------------------------------
    insert into public.backlog_items
      (backlog_id, tier, title, status, source_file, row_ordinal, epic_id,
       scope_origin, need_score, queue, filed_at, size_stamp)
    values
      ('ZFIX-45501','later','Gate fixture F1 -- a named drain member scored 2, the exempt one','open','agt455-gate',1,c_epic,'john-named',2,999981,'2026-08-01','S'),
      ('ZFIX-45502','later','Gate fixture F2 -- a named drain member scored 5, the selfbuild control','open','agt455-gate',2,c_epic,'john-named',5,999982,'2026-08-01','S');
    select id into v_f1 from public.backlog_items where backlog_id = 'ZFIX-45501';
    select id into v_f2 from public.backlog_items where backlog_id = 'ZFIX-45502';

    -- D is EXCLUSIVE and created_at 2020-01-01 -- older than every real queued drain, so
    -- drain_epic_next's `ORDER BY created_at LIMIT 1` and prime_directive_queue's `drain` CTE both
    -- read D and not the board's own. Exclusive keeps AGT-456's clause off D's own members.
    v_d := gen_random_uuid();
    insert into public.runner_directives (id, type, status, epic_id, exclusive, body, created_at)
    values (v_d, 'drain-epic', 'queued', c_epic, true,
            'AGT-455 GATE FIXTURE drain D (exclusive, dated 2020 so both picks read it). Rolled back by sentinel P0455.',
            '2020-01-01');
    insert into public.runner_drain_scope (directive_id, item_id, backlog_id)
    values (v_d, v_f1, 'ZFIX-45501');

    -- ---- A: the scored-2 member is CLAIMABLE from the drain pick (today: outcome 'blocked') ---
    select q.outcome, q.backlog_id into v_out_a, v_pick_a from public.drain_epic_next(c_cycle) q;

    -- ---- B: it carries NO exclusion reason, and the drain lane names both members ------------
    insert into public.runner_drain_scope (directive_id, item_id, backlog_id)
    values (v_d, v_f2, 'ZFIX-45502');
    select x.reasons into v_reas_b from public.pick_exclusions() x where x.backlog_id = 'ZFIX-45501';
    -- ---- C: THE OTHER HALF OF THE PAIR -- the selfbuild lane keeps the score gate, in the SAME
    --         board state as B, so the two lanes are read off one answer.
    select coalesce(array_agg(distinct q.ref order by q.ref) filter (where q.lane = 'drain'), '{}'),
           coalesce(array_agg(distinct q.ref order by q.ref) filter (where q.lane = 'selfbuild'), '{}')
      into v_drain_b, v_self_c
      from public.prime_directive_queue() q;

    -- ---- D: THE CONTROL -- the SAME ticket, no longer a member of a QUEUED drain, is out and
    --         says why. The fixture drain is closed rather than its scope row removed: identical
    --         effect on MEMBER (which reads `d.status = 'queued'`), and the apply channel stalls
    --         on a payload carrying a row-removal statement.
    update public.runner_directives set status = 'done' where id = v_d;
    select x.reasons into v_reas_d from public.pick_exclusions() x where x.backlog_id = 'ZFIX-45501';
    select coalesce(array_agg(distinct q.ref order by q.ref) filter (where q.lane in ('drain','selfbuild')), '{}')
      into v_lanes_d
      from public.prime_directive_queue() q;

    raise exception sqlstate 'P0455' using message = 'AGT-455 gate: fixtures measured, rolling them back';
  exception when sqlstate 'P0455' then
    null;   -- every fixture write above is undone; the measurements survive in the variables
  end;

  -- ---- the COMMITTED objects: one signature each, the splice, and the grants ----------------
  for r in
    select p.proname,
           count(*) over (partition by p.proname)::int as n,
           md5(pg_get_functiondef(p.oid)) as md5,
           has_function_privilege('anon', p.oid, 'EXECUTE') as a,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as b,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as c,
           (length(p.prosrc) - length(replace(p.prosrc,
              case when p.proname = 'prime_directive_queue' then 'bu.need_score >= 3' else 'b.need_score >= 3' end, '')))
             / length(case when p.proname = 'prime_directive_queue' then 'bu.need_score >= 3' else 'b.need_score >= 3' end) as occ
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
       and p.proname in ('drain_epic_next','pick_exclusions','prime_directive_queue')
     order by p.proname
  loop
    v_anon := v_anon || r.a; v_auth := v_auth || r.b; v_svc := v_svc || r.c;
    if r.proname = 'drain_epic_next'       then v_n_den := r.n; v_md5_den := r.md5; v_occ_den := r.occ; end if;
    if r.proname = 'pick_exclusions'       then v_n_pe  := r.n; v_md5_pe  := r.md5; v_occ_pe  := r.occ; end if;
    if r.proname = 'prime_directive_queue' then v_n_pq  := r.n; v_md5_pq  := r.md5; v_occ_pq  := r.occ; end if;
  end loop;
  select count(*)::int into v_items from public.backlog_items where source_file = 'agt455-gate';
  select count(*)::int into v_dirs  from public.runner_directives where body like 'AGT-455 GATE FIXTURE%';

  -- ---- ASSERTIONS --------------------------------------------------------------------------
  if v_out_a is distinct from 'pick' or v_pick_a is distinct from 'ZFIX-45501' then
    raise exception 'AGT-455 GATE A: the drain pick must claim the scored-2 named member, got outcome % pick % (was outcome blocked before this migration)', coalesce(v_out_a,'(null)'), coalesce(v_pick_a,'(null)');
  end if;
  if v_reas_b is distinct from '{}'::text[] then
    raise exception 'AGT-455 GATE B: a named member of a queued drain must carry no exclusion reason, got %', v_reas_b;
  end if;
  if not (v_drain_b @> ARRAY['ZFIX-45501','ZFIX-45502']::text[]) then
    raise exception 'AGT-455 GATE B: the drain lane must name both named members, got %', v_drain_b;
  end if;
  if not (v_self_c @> ARRAY['ZFIX-45502']::text[]) then
    raise exception 'AGT-455 GATE C: the scored-5 member must still list under selfbuild, got %', v_self_c;
  end if;
  if 'ZFIX-45501' = ANY(v_self_c) then
    raise exception 'AGT-455 GATE C: THE SCORE GATE LEAKED -- the scored-2 member listed under selfbuild (%), which is exactly what sends the two AGT-427 pins red', v_self_c;
  end if;
  if not ('need_score 2 is below 3' = ANY(v_reas_d)) then
    raise exception 'AGT-455 GATE D: THE CONTROL FAILED -- the same ticket outside every drain must still read need_score 2 is below 3, got %', v_reas_d;
  end if;
  if 'ZFIX-45501' = ANY(v_lanes_d) then
    raise exception 'AGT-455 GATE D: the non-member scored 2 reached a build lane, got %', v_lanes_d;
  end if;
  if v_n_den <> 1 or v_n_pe <> 1 or v_n_pq <> 1 then
    raise exception 'AGT-455 GATE: overloads must be exactly 1 each, got drain_epic_next=% pick_exclusions=% prime_directive_queue=% (.claude/rules/supabase-function-signature.md)', v_n_den, v_n_pe, v_n_pq;
  end if;
  if v_md5_den <> '0de013dae7827e65b133f0e10951d580' or v_md5_pe <> 'b78b750680aa0db3b246caa7aca7bae3' or v_md5_pq <> '5551b801e7823edd4df4c622de0e2ae9' then
    raise exception 'AGT-455 GATE: a body was not transcribed byte-exactly -- md5(pg_get_functiondef) reads drain_epic_next=% pick_exclusions=% prime_directive_queue=%, predicted from the spliced transcription 0de013dae7827e65b133f0e10951d580 / b78b750680aa0db3b246caa7aca7bae3 / 5551b801e7823edd4df4c622de0e2ae9', v_md5_den, v_md5_pe, v_md5_pq;
  end if;
  if v_occ_den <> 0 or v_occ_pe <> 1 or v_occ_pq <> 1 then
    raise exception 'AGT-455 GATE: the score expression must occur 0 times in drain_epic_next and once in each of the other two, got % / % / %', v_occ_den, v_occ_pe, v_occ_pq;
  end if;
  if true = ANY(v_anon) or true = ANY(v_auth) or false = ANY(v_svc) or array_length(v_svc,1) <> 3 then
    raise exception 'AGT-455 GATE: EXECUTE must read anon=false authenticated=false service_role=true on all three, got anon=% authenticated=% service_role=% (.claude/rules/supabase-column-grants.md)', v_anon, v_auth, v_svc;
  end if;
  if v_items <> 0 or v_dirs <> 0 then
    raise exception 'AGT-455 GATE: the sentinel left residue behind -- % fixture ticket(s), % fixture directive(s)', v_items, v_dirs;
  end if;

  raise notice 'AGT-455 GATE PASSED. A outcome=% pick=%; B reasons=% drain lane=%; C selfbuild lane=%; D reasons=% lanes=%; overloads 1/1/1; md5 % / % / %; score expression 0/1/1; EXECUTE anon=% authenticated=% service_role=%; residue %/%',
    v_out_a, v_pick_a, v_reas_b, v_drain_b, v_self_c, v_reas_d, v_lanes_d,
    v_md5_den, v_md5_pe, v_md5_pq, v_anon, v_auth, v_svc, v_items, v_dirs;
end
$gate$;
