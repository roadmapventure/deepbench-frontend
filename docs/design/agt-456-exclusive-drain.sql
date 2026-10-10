-- DeepBench v7.0.842 | docs/design/agt-456-exclusive-drain.sql | AGT-456 -- an exclusive drain holds the pick: while an exclusive queued drain still has an open member, every ticket outside its named scope is out of the pick and says why.
--
-- ==============================================================================================
-- THE MIRROR of migration `agt456_exclusive_drain`. The SQL below the header is the migration
-- verbatim, as applied. tests/regression/agt-456-exclusive-drain.test.mjs reads THIS FILE: its
-- needles are the clause, the column, the function, the REVOKE and the gate sentinel, each with a
-- deletion control, so the mirror cannot drift from what shipped without the suite saying so.
-- ==============================================================================================
--
-- ---- INV, read-only, measured 2026-10-10 ~07:26Z before the apply (cycle 065fca46) -----------
-- THE PROBLEM, live. One queued drain-epic stood: 11db3e2d-1051-47d5-90b0-4dfe970d0680, epic
-- ced3a7d0 (Tooling, project 53df250a executing, priority 2), 9 scope rows, 9 open members. And
-- prime_directive_queue() answered 0 `drain` rows and 9 `selfbuild` STRANGERS, AGT-398 first:
--   AGT-398, AGT-304, AGT-393, AGT-394, AGT-395, AGT-340, AGT-341, AGT-387, AGT-418
-- runner_should_boot(): should_boot=false, reason='lanes_full', pickable_count=9,
-- detail.pick=AGT-398 (lane selfbuild), gate_cards_to_rule=0, open_findings=58, list_tickets=240,
-- db_level='green', max_lanes=1, live_lanes=1, meter_limiter_off=false, hard_stop_pct=NULL.
-- THE 9 MEMBERS' OWN REASONS, from pick_exclusions() at the same moment -- every one of them is
-- out for a reason of its own, and NONE of them is "outside the drain", because no such clause
-- existed:
--   AGT-455 {blocked by AGT-450 (open)}            AGT-434 {blocked by AGT-453 (open)}
--   AGT-452 {blocked by AGT-455 (open), need_score 2 is below 3}
--   AGT-451 {blocked by AGT-456 (open)}            AGT-450 {blocked by AGT-433 (partial)}
--   AGT-454 {blocked by AGT-434 (open)}            AGT-433 {blocked by AGT-451 (open)}
--   AGT-453 {blocked by AGT-452 (open), need_score 2 is below 3}
--   AGT-456 {claimed by 065fca46-eb6b-440a-bcb7-870a6e0e9c73}
-- So the board was not short of drain work; the pick simply did not look at the drain. That is the
-- whole of AGT-456.
--
-- ---- THE GRANT SURFACE, checked live before the apply (.claude/rules/supabase-column-grants.md)
-- Both directions, because a column REVOKE cannot subtract from a table GRANT and a migration's
-- success flag proves nothing:
--   * information_schema.role_table_grants on public.runner_directives: anon and authenticated hold
--     ZERO privileges of any type; service_role holds SELECT/INSERT/UPDATE/DELETE/REFERENCES/
--     TRIGGER/TRUNCATE. There is no table-level and no column-list SELECT grant for the public key,
--     so `exclusive` is unreadable by it the moment it exists, and no `select=*` reader breaks.
--   * pick_exclusions() is not SECURITY DEFINER and the new clause makes it read runner_directives
--     for the first time, so a public caller would now need SELECT on that table. It has none:
--     has_function_privilege EXECUTE on pick_exclusions(), prime_directive_queue(),
--     runner_should_boot() and drain_epic_next() reads anon=false, authenticated=false,
--     service_role=true. Nothing the browser can call reaches the new read.
--   * add_to_drain is CREATED here, and pg_default_acl grants EXECUTE to anon, authenticated and
--     service_role BY NAME at creation (addendum SES-315), which `REVOKE ... FROM PUBLIC` does not
--     touch. The migration revokes the three by name and the gate asserts both directions.
--
-- ---- THE DOWN, captured BEFORE the apply (runner-cycle.md step 6) ----------------------------
-- select * from public.capture_migration_down(
--   '065fca46-eb6b-440a-bcb7-870a6e0e9c73', 'agt456_exclusive_drain',
--   '[{"kind":"function","identity":"public.pick_exclusions()"}]')
-- ->  captured_up_name = agt456_exclusive_drain
--     captured_class   = auto-downable
--     objects_captured = 1
--     refusals         = 0
--     derived_down_sql = the prior CREATE OR REPLACE FUNCTION public.pick_exclusions() in full
--                        (md5 6fe579e2dc6b7bdeacb472f38154cce8, 6156 bytes), followed by the
--                        overload sweep that asserts exactly 1 remains.
-- Stored in runner_migration_downs.up_name = 'agt456_exclusive_drain'.
-- MANUAL DOWN, the half no capture can derive (a column added in place, and a function that did
-- not exist before):
--   ALTER TABLE public.runner_directives DROP COLUMN exclusive;
--   DROP FUNCTION public.add_to_drain(uuid, text, text, uuid, text);
--
-- ---- THE SPLICE, proven byte-exact rather than retyped ---------------------------------------
-- The CLAUSE below is ONE new CASE inside an otherwise untouched pick_exclusions(). To prove the
-- "rest of body unchanged" claim instead of asserting it, the prior definition was transcribed and
-- checksummed against the live one BEFORE the clause was spliced in:
--   md5(pg_get_functiondef('public.pick_exclusions()')) live = 6fe579e2dc6b7bdeacb472f38154cce8
--   md5 of the transcription                               = 6fe579e2dc6b7bdeacb472f38154cce8
--   length live = 6156 bytes; transcription = 6156 bytes
-- so every line below other than the new CASE is the shipped body byte-for-byte.
--
-- ---- THE APPLY, and what it proves ----------------------------------------------------------
-- Applied 2026-10-10 ~07:41Z by runner cycle 065fca46 as migration `agt456_exclusive_drain`, this
-- file's SQL verbatim and unedited. Result: {"success":true}.
-- GATE LINES -- READ THIS CAVEAT. The trailing DO block's own `AGT-456 GATE PASSED. ...` RAISE
-- NOTICE body was NOT relayed back by the apply channel, so it is not quoted here and nobody has
-- read it. What the success flag does prove is the only thing the gate was built to prove: the
-- outer block RAISEs -- aborting the whole migration, column and functions included -- unless
-- every one of its assertions holds, so a committed migration IS the gate's pass. The cases it
-- graded, over fixtures ZFIX-45601..3 in epic ced3a7d0 and a fixture exclusive drain D over
-- ZFIX-45601, every other queued drain set exclusive=false, John's walls and the lane cap lifted:
--   A   ZFIX-45601 under an undecided gated_before_build card -> queue refs {} and
--       runner_should_boot().reason = 'gate_cards_to_rule'
--   A2  that card accepted, ZFIX-45601 blocked_by ZFIX-45603 -> queue refs still {}
--   D   add_to_drain(D, 'ZFIX-45603', 'gate', cycle 065fca46, NULL) -> refs exactly {ZFIX-45603},
--       blocked_by NULL, images 1, exactly 1 new ticket-scope decision; then four refusals -- the
--       repeat, AGT-398, a random uuid, an authorless call -- carrying [already a member],
--       [outside the epic], [no exclusive drain], [one author], with the decision count unchanged
--   B   D status='done' -> refs contain both ZFIX-45602 and ZFIX-45603
--   C   THE CONTROL: D queued again but exclusive=false, ZFIX-45601 re-carded -> ZFIX-45602 back
--       in refs, which is what proves the clause reads `exclusive` and not "a queued drain exists"
--   then exactly 1 pg_proc overload of each function, and add_to_drain EXECUTE in both directions.
-- ZERO FIXTURE RESIDUE, re-read after the apply: 0 backlog_items with source_file='agt456-gate',
-- 0 runner_items naming a ZFIX ticket, 0 runner_directives whose body starts 'AGT-456 GATE
-- FIXTURE', 0 runner_drain_scope rows naming a ZFIX ticket, 0 runner_decisions with summary like
-- 'add to drain%'. runner_settings id=1 back to meter_limiter_off=false, max_lanes=1,
-- hard_stop_pct=NULL. The sentinel undid every fixture write; the DDL committed.
--
-- ---- REFS AFTER, re-read live 2026-10-10 ~07:41Z on the real board --------------------------
-- THE DISCRIMINATOR, both directions, same board as the INV above:
--   prime_directive_queue() drain/selfbuild refs = {}  (was: 9 strangers, AGT-398 first)
--   the whole queue is now ONE row: lane 'board', pos NULL, ref NULL
--   runner_should_boot(): should_boot=false, reason='lanes_full', detail.pick=NULL,
--     pickable_count=0 (was 9, pick AGT-398), gate_cards_to_rule=0, db_level='green'
--   HONESTLY: the reason reads 'lanes_full' and not 'nothing_pickable' because THIS cycle holds
--   the only lane while it runs -- that is a wall ABOVE the board, graded before the board is, so
--   it is not evidence about the clause. pickable_count=0 and detail.pick=NULL are the board's own
--   answer, and they are.
--   ALL NINE STRANGERS now carry exactly one reason, and it is the new one:
--     AGT-304, AGT-340, AGT-341, AGT-387, AGT-393, AGT-394, AGT-395, AGT-398, AGT-418
--       -> {outside the exclusive drain}
--   ALL NINE MEMBERS carry their OWN reasons and NONE of them carries the new one -- the clause
--   excludes the strangers without touching the members:
--     AGT-433 {blocked by AGT-451 (open)}            AGT-434 {blocked by AGT-453 (open)}
--     AGT-450 {blocked by AGT-433 (partial)}         AGT-451 {blocked by AGT-456 (open)}
--     AGT-452 {blocked by AGT-455 (open), need_score 2 is below 3}
--     AGT-453 {blocked by AGT-452 (open), need_score 2 is below 3}
--     AGT-454 {blocked by AGT-434 (open)}            AGT-455 {blocked by AGT-450 (open)}
--     AGT-456 {claimed by 065fca46-eb6b-440a-bcb7-870a6e0e9c73}
--   AGT-456's own claim is why pickable_count is 0 and not 1: the ticket this build is for is the
--   drain's one otherwise-pickable member.
--   THE COLUMN backfilled every row: 109 of 109 runner_directives rows read exclusive=true, 0 read
--   false. Exactly 1 queued drain-epic stands (11db3e2d, 9 members, all 9 open) and it is exclusive.
--
-- ---- THE TWO FUNCTIONS AFTER THE APPLY, read live ------------------------------------------
--   public.pick_exclusions()                                 -> 1 overload,
--     md5(pg_get_functiondef) = 88d3f6fd55851d8665b7080c4094fa50
--     (was 6fe579e2dc6b7bdeacb472f38154cce8 before the apply -- the body changed, the identity did not)
--   public.add_to_drain(uuid, text, text, uuid, text)        -> 1 overload,
--     md5(pg_get_functiondef) = 8add5e4a69d7a56559686f5a5aaac84d
--   EXECUTE, both functions, both directions: anon=false, authenticated=false, service_role=true.
--
-- ---- THE MIGRATION, VERBATIM -----------------------------------------------------------------
-- MIGRATION agt456_exclusive_drain | DeepBench v7.0.842 | AGT-456
-- an exclusive drain holds the pick: while an exclusive queued drain still has an open member,
-- every ticket outside its named scope is out of the pick and says why.
--
-- FIVE PARTS, one apply: COL (runner_directives.exclusive), CLAUSE (pick_exclusions()'s new CASE),
-- ADD (public.add_to_drain), the REVOKE/GRANT, and the trailing gated DO block. The DO block writes
-- its fixtures inside a sub-block that ends in sentinel P0456, so every fixture write is undone
-- while this migration still commits; the outer block then RAISEs unless all of A/A2/D/B/C hold.
-- Down: runner_migration_downs.up_name = 'agt456_exclusive_drain' (captured before this apply,
-- class auto-downable, 1 object, 0 refusals) restores pick_exclusions(); the manual half is
--   ALTER TABLE public.runner_directives DROP COLUMN exclusive;
--   DROP FUNCTION public.add_to_drain(uuid, text, text, uuid, text);

-- ---------------------------------------------------------------------------------------------
-- 1. COL. Every drain row is exclusive unless something says otherwise, the cap-split's own
--    included (designer's call (i), JOHN-0925-DESIGNER-DECIDES); rule_capped_ticket() is untouched.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.runner_directives ADD COLUMN exclusive boolean NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------------------------
-- 2. CLAUSE. pick_exclusions() re-created with ONE new CASE appended after the need_score CASE.
--    Identity argument list (none), RETURNS TABLE columns, LANGUAGE sql, STABLE and every other
--    clause are byte-unchanged, so CREATE OR REPLACE replaces the body rather than adding an
--    overload (.claude/rules/supabase-function-signature.md); the gate asserts exactly 1 remains.
--    Grants unchanged: anon and authenticated already hold no EXECUTE on it, and runner_directives
--    -- the table the new clause reads -- grants them nothing at all, so the new read leaks nothing
--    and breaks no public reader (.claude/rules/supabase-column-grants.md, both directions checked
--    live before this apply).
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
         CASE WHEN NOT coalesce((b.need_score >= 3), false)
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
-- 3. ADD. One ticket named into an exclusive drain's scope, shaped like rule_capped_ticket():
--    every refusal RAISEs before the first write and carries its own bracket word, one decision is
--    the handle for every write, and each write carries a runner_before_images row under it so
--    reverse_decision() undoes the whole naming.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_to_drain(p_directive uuid, p_backlog_id text, p_reason text, p_cycle_id uuid DEFAULT NULL::uuid, p_session_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
-- AGT-456 (v7.0.842). NAME ONE TICKET INTO AN EXCLUSIVE DRAIN. The drain's scope is John's fixed
-- named list (SES-142); this is the one path that extends it, and it extends only a drain that is
-- queued, drain-epic and exclusive, only with a ticket that is unfinished and sits in that drain's
-- one epic. The ticket joins the chain BEHIND the tail -- the open member nothing else waits on --
-- so the drain still drains in one order.
declare
  v_dir     public.runner_directives%rowtype;
  v_item    public.backlog_items%rowtype;
  v_tail    uuid;
  v_dec     uuid;
  v_sid     uuid;
  v_blocked uuid;
  v_images  int := 0;
begin
  -- 1. One author.
  if (p_cycle_id is not null) = (p_session_name is not null) then
    raise exception 'add_to_drain: [one author] exactly one of p_cycle_id / p_session_name must be set -- a scope change has exactly one author';
  end if;
  -- 2. The reason.
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'add_to_drain: [no reason] naming a ticket into a drain needs a reason';
  end if;
  -- 3. The drain: queued, drain-epic, exclusive. Anything else holds no pick, so nothing may be
  --    named into it.
  select * into v_dir from public.runner_directives d
   where d.id = p_directive and d.type = 'drain-epic' and d.status = 'queued' and d.exclusive
   for update;
  if not found then
    raise exception 'add_to_drain: [no exclusive drain] % names no queued exclusive drain-epic directive',
      coalesce(p_directive::text, '(none)');
  end if;
  -- 4. The ticket, and it is still work.
  select * into v_item from public.backlog_items b where b.backlog_id = p_backlog_id for update;
  if not found then
    raise exception 'add_to_drain: [no ticket] no backlog_items row reads backlog_id %',
      coalesce(p_backlog_id, '(none)');
  end if;
  if v_item.status in ('done', 'removed') then
    raise exception 'add_to_drain: [finished] % is % -- a finished ticket is not drain work',
      p_backlog_id, v_item.status;
  end if;
  -- 5. Not already named. The scope is a set, and a second row would double the member.
  if exists (select 1 from public.runner_drain_scope s
              where s.directive_id = v_dir.id and s.item_id = v_item.id) then
    raise exception 'add_to_drain: [already a member] % is already named in drain %',
      p_backlog_id, v_dir.id;
  end if;
  -- 6. One epic. A drain names one epic (runner_directives_drain_names_epic), so every member of it
  --    sits in that epic -- the same rule rule_capped_ticket() holds for its parts.
  if v_dir.epic_id is null or v_item.epic_id is distinct from v_dir.epic_id then
    raise exception 'add_to_drain: [outside the epic] % sits outside drain %''s epic',
      p_backlog_id, v_dir.id;
  end if;

  -- THE TAIL: the open member that no other open member is blocked_by. Ties go to the latest
  -- named_at, so the pick is reproducible rather than whichever row the planner returned
  -- (pattern:127). NULL when the drain has no open member yet, and then the ticket is the head.
  select m.id into v_tail
    from public.runner_drain_scope s
    join public.backlog_items m on m.id = s.item_id
   where s.directive_id = v_dir.id
     and m.status not in ('done', 'removed')
     and not exists (
       select 1 from public.runner_drain_scope s2
         join public.backlog_items m2 on m2.id = s2.item_id
        where s2.directive_id = v_dir.id
          and m2.status not in ('done', 'removed')
          and m2.blocked_by = m.id)
   order by s.named_at desc
   limit 1;

  -- The decision. One handle for every write below.
  v_dec := public.record_decision(
    p_cycle_id, p_session_name, 'ticket-scope', p_backlog_id,
    'add to drain ' || p_directive || ': ' || p_backlog_id,
    p_reason);

  -- The chain. An open member ALREADY waiting on this ticket means the ticket is already ahead of
  -- the chain; giving it a blocker as well would close the ring and strand the whole drain, so its
  -- blocked_by is left exactly as it is (designer's call (ii), JOHN-0925-DESIGNER-DECIDES).
  if exists (select 1 from public.runner_drain_scope s
               join public.backlog_items m on m.id = s.item_id
              where s.directive_id = v_dir.id
                and m.status not in ('done', 'removed')
                and m.blocked_by = v_item.id) then
    v_blocked := null;
  else
    insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    values (p_cycle_id, p_session_name, 'backlog_items', v_item.id::text, to_jsonb(v_item), v_dec);
    v_images := v_images + 1;
    update public.backlog_items
       set blocked_by = v_tail, updated_at = now()
     where id = v_item.id;
    v_blocked := v_tail;
  end if;

  -- The scope row. Its before-image carries row_data NULL -- the row did not exist, and that is
  -- what reverse_decision() reads to delete it again.
  v_sid := gen_random_uuid();
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values (p_cycle_id, p_session_name, 'runner_drain_scope', v_sid::text, NULL, v_dec);
  v_images := v_images + 1;
  insert into public.runner_drain_scope (id, directive_id, item_id, backlog_id)
  values (v_sid, v_dir.id, v_item.id, v_item.backlog_id);

  return jsonb_build_object('decision_id', v_dec, 'scope_id', v_sid,
                            'blocked_by', v_blocked, 'images', v_images);
end
$function$;

-- ---------------------------------------------------------------------------------------------
-- 4. REVOKE/GRANT. pg_default_acl grants EXECUTE to anon, authenticated and service_role BY NAME
--    the instant a function is created, and REVOKE ... FROM PUBLIC does not touch a named grant
--    (.claude/rules/supabase-column-grants.md, addendum SES-315). The three go by name, and the
--    gate asserts both directions rather than trusting this statement's success flag.
-- ---------------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.add_to_drain(uuid, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_to_drain(uuid, text, text, uuid, text) TO service_role;

-- ---------------------------------------------------------------------------------------------
-- 5. GATE. The sub-block writes fixtures, measures A / A2 / D / B / C and ends in sentinel P0456,
--    so every fixture write is rolled back while this migration commits. Variable assignment is
--    not transactional, so the measurements survive the rollback and the outer block grades them.
--    Fail-closed: any measurement that does not hold RAISEs, and the whole migration aborts.
-- ---------------------------------------------------------------------------------------------
DO $gate$
declare
  c_cycle   uuid := '065fca46-eb6b-440a-bcb7-870a6e0e9c73';
  c_epic    uuid := 'ced3a7d0-5382-47f2-9163-ad21c176de6b';   -- Tooling, project executing
  v_fake    uuid := gen_random_uuid();
  v_f1 uuid; v_f2 uuid; v_f3 uuid; v_d uuid; v_card uuid;
  v_refs_a  text[]; v_reason_a text;
  v_refs_a2 text[];
  v_refs_d  text[]; v_add jsonb;
  v_dec0 int; v_dec1 int; v_dec2 int;
  v_err     text[] := '{}';
  v_refs_b  text[]; v_refs_c text[];
  v_pe int; v_ad int;
  v_anon boolean; v_auth boolean; v_svc boolean;
  v_anon_pe boolean; v_auth_pe boolean;
begin
  begin
    -- ---- FIXTURES ---------------------------------------------------------------------------
    -- John's spend walls and the lane cap lifted so the boot verdict is decided by the board and
    -- not by a wall above it; hard_stop_pct stays NULL because it is not under meter_limiter_off.
    update public.runner_settings
       set meter_limiter_off = true, max_lanes = 99, hard_stop_pct = NULL
     where id = 1;
    -- every other queued drain made NON-exclusive, so D is the only exclusive drain standing and
    -- the clause is graded on `exclusive` rather than on "a queued drain exists".
    update public.runner_directives
       set exclusive = false
     where type = 'drain-epic' and status = 'queued';

    insert into public.backlog_items
      (backlog_id, tier, title, status, source_file, row_ordinal, epic_id,
       scope_origin, need_score, queue, filed_at, size_stamp)
    values
      ('ZFIX-45601','later','Gate fixture F1, the named member of the exclusive drain','open','agt456-gate',1,c_epic,'john-named',5,999991,'2026-08-01','S'),
      ('ZFIX-45602','later','Gate fixture F2, a stranger that is never named into the drain','open','agt456-gate',2,c_epic,'john-named',5,999992,'2026-08-01','S'),
      ('ZFIX-45603','later','Gate fixture F3, the stranger the add path names into the drain','open','agt456-gate',3,c_epic,'john-named',5,999993,'2026-08-01','S');
    select id into v_f1 from public.backlog_items where backlog_id = 'ZFIX-45601';
    select id into v_f2 from public.backlog_items where backlog_id = 'ZFIX-45602';
    select id into v_f3 from public.backlog_items where backlog_id = 'ZFIX-45603';

    v_d := gen_random_uuid();
    insert into public.runner_directives (id, type, status, epic_id, exclusive, body)
    values (v_d, 'drain-epic', 'queued', c_epic, true,
            'AGT-456 GATE FIXTURE drain D (exclusive, over ZFIX-45601). Rolled back by sentinel P0456.');
    insert into public.runner_drain_scope (directive_id, item_id, backlog_id)
    values (v_d, v_f1, 'ZFIX-45601');

    -- ---- A: the member itself sits under an undecided gated_before_build card ----------------
    -- Nothing is pickable at all: the strangers are out because they are outside the exclusive
    -- drain, and the one member is out because nobody has ruled its card. The boot gate must then
    -- answer with the card branch, not with a build.
    v_card := gen_random_uuid();
    insert into public.runner_items (id, cycle_id, backlog_id, kind, title)
    values (v_card, c_cycle, 'ZFIX-45601', 'gated_before_build',
            'Gate fixture card, first pass: ruled by nobody');
    select coalesce(array_agg(distinct q.ref order by q.ref), '{}')
      into v_refs_a
      from public.prime_directive_queue() q
     where q.lane in ('drain','selfbuild');
    select b.reason into v_reason_a from public.runner_should_boot() b;

    -- ---- A2: the card accepted, and the member waits on F3 ----------------------------------
    update public.runner_items set decision = 'accept', decided_at = now() where id = v_card;
    update public.backlog_items set blocked_by = v_f3, updated_at = now() where id = v_f1;
    select coalesce(array_agg(distinct q.ref order by q.ref), '{}')
      into v_refs_a2
      from public.prime_directive_queue() q
     where q.lane in ('drain','selfbuild');

    -- ---- D: add_to_drain names F3 into D, and four bad calls are refused --------------------
    select count(*)::int into v_dec0 from public.runner_decisions where kind = 'ticket-scope';
    v_add := public.add_to_drain(v_d, 'ZFIX-45603', 'gate', c_cycle, NULL);
    select count(*)::int into v_dec1 from public.runner_decisions where kind = 'ticket-scope';
    select coalesce(array_agg(distinct q.ref order by q.ref), '{}')
      into v_refs_d
      from public.prime_directive_queue() q
     where q.lane in ('drain','selfbuild');

    begin
      perform public.add_to_drain(v_d, 'ZFIX-45603', 'gate repeat', c_cycle, NULL);
      v_err := v_err || 'THE REPEAT DID NOT RAISE'::text;
    exception when others then v_err := v_err || SQLERRM;
    end;
    begin
      perform public.add_to_drain(v_d, 'AGT-398', 'gate stranger', c_cycle, NULL);
      v_err := v_err || 'THE OUT-OF-EPIC TICKET DID NOT RAISE'::text;
    exception when others then v_err := v_err || SQLERRM;
    end;
    begin
      perform public.add_to_drain(v_fake, 'ZFIX-45602', 'gate no drain', c_cycle, NULL);
      v_err := v_err || 'THE RANDOM UUID DID NOT RAISE'::text;
    exception when others then v_err := v_err || SQLERRM;
    end;
    begin
      perform public.add_to_drain(v_d, 'ZFIX-45602', 'gate no author', NULL, NULL);
      v_err := v_err || 'THE AUTHORLESS CALL DID NOT RAISE'::text;
    exception when others then v_err := v_err || SQLERRM;
    end;
    select count(*)::int into v_dec2 from public.runner_decisions where kind = 'ticket-scope';

    -- ---- B: the drain finished holds nothing ------------------------------------------------
    update public.runner_directives set status = 'done' where id = v_d;
    select coalesce(array_agg(distinct q.ref order by q.ref), '{}')
      into v_refs_b
      from public.prime_directive_queue() q
     where q.lane in ('drain','selfbuild');

    -- ---- C: THE CONTROL. A queued drain that is NOT exclusive holds nothing either ----------
    update public.runner_directives set status = 'queued', exclusive = false where id = v_d;
    insert into public.runner_items (cycle_id, backlog_id, kind, title)
    values (c_cycle, 'ZFIX-45601', 'gated_before_build',
            'Gate fixture card, second pass: ruled by nobody');
    select coalesce(array_agg(distinct q.ref order by q.ref), '{}')
      into v_refs_c
      from public.prime_directive_queue() q
     where q.lane in ('drain','selfbuild');

    raise exception sqlstate 'P0456' using message = 'AGT-456 gate: fixtures measured, rolling them back';
  exception when sqlstate 'P0456' then
    null;   -- every fixture write above is undone; the measurements survive in the variables
  end;

  -- ---- the COMMITTED objects: one signature each, and the grant in both directions ----------
  select count(*)::int into v_pe from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'pick_exclusions' and p.prokind = 'f';
  select count(*)::int into v_ad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'add_to_drain' and p.prokind = 'f';
  select has_function_privilege('anon', p.oid, 'EXECUTE'),
         has_function_privilege('authenticated', p.oid, 'EXECUTE'),
         has_function_privilege('service_role', p.oid, 'EXECUTE')
    into v_anon, v_auth, v_svc
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'add_to_drain' and p.prokind = 'f';
  select has_function_privilege('anon', p.oid, 'EXECUTE'),
         has_function_privilege('authenticated', p.oid, 'EXECUTE')
    into v_anon_pe, v_auth_pe
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'pick_exclusions' and p.prokind = 'f';

  -- ---- ASSERTIONS --------------------------------------------------------------------------
  if v_refs_a <> '{}'::text[] then
    raise exception 'AGT-456 GATE A: the queue should name nothing while the exclusive drain stands and its one member is carded, got %', v_refs_a;
  end if;
  if v_reason_a is distinct from 'gate_cards_to_rule' then
    raise exception 'AGT-456 GATE A: the boot reason should be gate_cards_to_rule, got %', coalesce(v_reason_a, '(null)');
  end if;
  if v_refs_a2 <> '{}'::text[] then
    raise exception 'AGT-456 GATE A2: the queue should still name nothing with the card accepted and the member blocked, got %', v_refs_a2;
  end if;
  if v_refs_d <> ARRAY['ZFIX-45603']::text[] then
    raise exception 'AGT-456 GATE D: the queue should name exactly the newly added member, got %', v_refs_d;
  end if;
  if (v_add->>'blocked_by') is not null then
    raise exception 'AGT-456 GATE D: blocked_by should be NULL because an open member already waits on the ticket, got %', v_add->>'blocked_by';
  end if;
  if (v_add->>'images')::int <> 1 then
    raise exception 'AGT-456 GATE D: images should be 1 (the scope row alone), got %', v_add->>'images';
  end if;
  if v_dec1 - v_dec0 <> 1 then
    raise exception 'AGT-456 GATE D: the add should record exactly one ticket-scope decision, got %', v_dec1 - v_dec0;
  end if;
  if v_dec2 <> v_dec1 then
    raise exception 'AGT-456 GATE D: a REFUSED add recorded a decision (% -> %)', v_dec1, v_dec2;
  end if;
  if array_length(v_err, 1) is distinct from 4
     or v_err[1] not like '%[already a member]%'
     or v_err[2] not like '%[outside the epic]%'
     or v_err[3] not like '%[no exclusive drain]%'
     or v_err[4] not like '%[one author]%' then
    raise exception 'AGT-456 GATE D: the four refusals did not each carry their own bracket word: %', v_err;
  end if;
  if not (v_refs_b @> ARRAY['ZFIX-45602','ZFIX-45603']::text[]) then
    raise exception 'AGT-456 GATE B: a drain with no open member left holds no pick, so both strangers belong in the queue, got %', v_refs_b;
  end if;
  if not (v_refs_c @> ARRAY['ZFIX-45602']::text[]) then
    raise exception 'AGT-456 GATE C: a queued drain that is NOT exclusive holds no pick, so ZFIX-45602 belongs in the queue, got %', v_refs_c;
  end if;
  if v_pe <> 1 then
    raise exception 'AGT-456 GATE: pick_exclusions has % overloads, expected exactly 1 (.claude/rules/supabase-function-signature.md)', v_pe;
  end if;
  if v_ad <> 1 then
    raise exception 'AGT-456 GATE: add_to_drain has % overloads, expected exactly 1 (.claude/rules/supabase-function-signature.md)', v_ad;
  end if;
  if v_anon or v_auth or not v_svc then
    raise exception 'AGT-456 GATE: add_to_drain EXECUTE should read anon=false authenticated=false service_role=true, got % / % / % (.claude/rules/supabase-column-grants.md)', v_anon, v_auth, v_svc;
  end if;
  if v_anon_pe or v_auth_pe then
    raise exception 'AGT-456 GATE: pick_exclusions EXECUTE leaked to the public key (anon=%, authenticated=%)', v_anon_pe, v_auth_pe;
  end if;

  raise notice 'AGT-456 GATE PASSED. A refs=% reason=%; A2 refs=%; D refs=% blocked_by=% images=% decisions+%; refusals=%; B refs=%; C refs=%; overloads pick_exclusions=% add_to_drain=%; add_to_drain EXECUTE anon=% authenticated=% service_role=%',
    v_refs_a, v_reason_a, v_refs_a2, v_refs_d, coalesce(v_add->>'blocked_by','NULL'),
    v_add->>'images', v_dec1 - v_dec0, v_err, v_refs_b, v_refs_c, v_pe, v_ad, v_anon, v_auth, v_svc;
end
$gate$;
