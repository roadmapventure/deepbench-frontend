-- DeepBench v7.0.746 | docs/design/agt-308-gate-before-build.sql | AGT-308 — gating is ONE call, mirrored
--
-- ONE migration, mirrored byte-identical: agt308_gate_before_build (v7.0.746). The down was
-- captured FIRST, BEFORE the apply, by
-- public.capture_migration_down('89491155-4dd7-4940-8bb3-c4fecb71c143',
-- 'agt308_gate_before_build',
-- '[{"kind":"function","identity":"public.gate_before_build(uuid, text, text, text, text, text)"}]')
-- -> classification auto-downable, 1 object captured, 0 refusals, derived down
-- `drop function if exists public.gate_before_build(uuid, text, text, text, text, text);` --
-- the function was absent at capture time, so the down is a single DROP and nothing is lost.
-- The grants below are NOT in that down by construction (the capture refuses grant/ACL objects
-- deliberately, .claude/rules/supabase-column-grants.md); their undo is the DROP itself, which
-- takes the function's ACL with it.
--
-- FEATURE: AGT-308 -- GATING A TICKET AT STEP 5 IS ONE CALL: CARD, STATE, SKIP.
-- Measured 2026-10-03: step 5 of docs/runbooks/runner-cycle.md was TWO hand-typed statements -- a
-- `runner_items` INSERT and a `backlog_items` UPDATE -- bound by prose alone (SES-114) with no
-- function and no trigger holding them together. Cycle c71e55fe classified AGT-281 gated at
-- 10:02Z and wrote NEITHER; the card landed at 10:39Z and the ticket sat at prime_directive_queue()
-- position 1 for the 37 minutes between, pickable by any concurrent cycle. This function is the
-- structural fix: one call or none (pattern:14, pattern:19).
--   D1 A ticket classified gated ALWAYS gets the card. The 34865f07 rule governs the card's
--      WORDING -- where the work waits, never an approval John owes -- not whether the act happens.
--      Title: `<ID> — waits on a session you attend`.
--   D2 The runbook edit is byte-neutral (the replaced span is exactly 1,353 B) so both byte pins
--      (agt-253-design-only-lane.test.mjs, ses-413d-questions-scoreboard.test.mjs) hold at
--      380,949 B; re-pinning them would be two more files over this class's 3-file cap.
--   D3 No public.recompute_backlog_queue() in the call -- the ticket keeps its queue slot
--      (pattern:147). The undecided card is what takes it out of prime_directive_queue(), through
--      pick_exclusions()'s existing undecided-card clause, and nothing renumbers the board.
--
-- NO PREDICATE WORK, and that is measured, not assumed: pick_exclusions() ALREADY carries both
-- sentences this call makes true -- 'needs a session John attends (<flag>)' (through
-- pick_blocking_flags(), which is the constant {needs-desktop}) and
-- 'undecided gated_before_build card' (SES-424 slice 1). The gate needed a writer, not a reader.
--
-- SECURITY DEFINER, search_path public, pg_catalog, EXECUTE revoked from PUBLIC, anon and
-- authenticated BY NAME and granted to service_role only -- design_only_stop()'s shape
-- (.claude/rules/supabase-column-grants.md). Governing: docs/ARCHITECTURE.md §19v (before-image
-- first; pick_exclusions() the one home for why a row is out), §19b;
-- .claude/rules/supabase-function-signature.md (the trailing overload assertion).

-- ---------------------------------------------------------------------------------------------
-- (1) gate_before_build() -- ONE call replaces step 5's two hand-typed statements.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gate_before_build(
  p_cycle_id uuid, p_backlog_id text,
  p_plain_cant text, p_plain_after text, p_plain_worth text, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_bi   public.backlog_items%ROWTYPE;
  v_card uuid;
  v_skip public.runner_skips;
begin
  -- 1. VALIDATION, ALL OF IT BEFORE ANY WRITE (design_only_stop()'s own rule). A half-applied
  --    gate is the exact state AGT-308 exists to make impossible: a card with no flag leaves the
  --    ticket pickable, a flag with no card leaves John nothing to answer.
  select * into v_bi from public.backlog_items b where b.backlog_id = p_backlog_id;
  if not found then
    raise exception 'gate_before_build: no backlog_items row %', p_backlog_id;
  end if;
  if public.ticket_design_only(p_backlog_id) then
    raise exception 'gate_before_build: % is on a design-only project -- step 6 calls public.design_only_stop() instead, and that call files its own card and its own question', p_backlog_id;
  end if;
  if exists (select 1 from public.runner_items ri
              where ri.backlog_id = p_backlog_id
                and ri.kind = 'gated_before_build' and ri.decision is null) then
    raise exception 'gate_before_build: % already carries an undecided gated_before_build card -- it is already on John''s desk', p_backlog_id;
  end if;
  if coalesce(btrim(p_plain_cant), '') = '' or coalesce(btrim(p_plain_after), '') = ''
     or coalesce(btrim(p_plain_worth), '') = '' then
    raise exception 'gate_before_build: all three plain-language texts are required (pattern:154 -- what you cannot do today, what you could do after, why it is worth it)';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'gate_before_build: p_reason is required -- it is the one sentence record_skip() stores about where this ticket waits and what unblocks it';
  end if;

  -- 2. THE CARD. An INSERT, so its before-image is row_data NULL (SES-150): there is no prior
  --    row, and reverse_decision() reads a NULL image as "delete this row again". D1: the title
  --    says where the work WAITS, never that John owes an approval (the 34865f07 rule).
  insert into public.runner_items
    (cycle_id, backlog_id, kind, title, plain_cant, plain_after, plain_worth)
  values
    (p_cycle_id, p_backlog_id, 'gated_before_build',
     p_backlog_id || ' — waits on a session you attend',
     btrim(p_plain_cant), btrim(p_plain_after), btrim(p_plain_worth))
  returning id into v_card;

  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data)
  values (p_cycle_id, 'runner_items', v_card::text, NULL);

  -- 3. THE TICKET SIDE, IMAGE FIRST (§19v). 'needs-desktop' is the ONLY value this write may
  --    carry, and it is unconditional: SES-315/M6-01 retired 'needs-john' as a blocking state,
  --    and pick_blocking_flags() is {needs-desktop} alone, so any other value parks a ticket
  --    nothing is waiting to un-park.
  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data)
  values (p_cycle_id, 'backlog_items', v_bi.id::text, to_jsonb(v_bi));

  update public.backlog_items
     set design_status = 'needs-desktop', updated_at = now()
   where id = v_bi.id;

  -- 4. THE SKIP ROW -- the third act of the one gate, so the ticket appears in §10 of the
  --    briefing instead of living as prose in runner_cycles.notes (SES-127). Assigned rather
  --    than PERFORMed for one reason only: the return below hands the caller skip_id, and
  --    PERFORM discards the row record_skip() returns.
  v_skip := public.record_skip(p_cycle_id, p_backlog_id, 'gated', btrim(p_reason),
                               'card', v_card::text);

  -- 5. D3: NO recompute_backlog_queue(). The ticket keeps its slot; the undecided card above is
  --    what pick_exclusions() reads to hold it out of prime_directive_queue().
  return jsonb_build_object(
    'backlog_id', p_backlog_id,
    'card_id', v_card,
    'design_status', 'needs-desktop',
    'skip_id', v_skip.id,
    'next', 'drop to the next queued ticket (B24)');
end
$function$;

REVOKE ALL ON FUNCTION public.gate_before_build(uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gate_before_build(uuid, text, text, text, text, text) TO service_role;

-- ---------------------------------------------------------------------------------------------
-- (2) Catalog assertion in the SAME transaction that wrote the function -- never the migration's
--     success flag (.claude/rules/supabase-function-signature.md). Exactly ONE overload, and the
--     browser keys cannot execute it.
-- ---------------------------------------------------------------------------------------------
do $assert$
declare
  v_n int;
begin
  select count(*)::int into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'gate_before_build' and p.prokind = 'f';
  if v_n <> 1 then
    raise exception 'agt308: public.gate_before_build has % overload(s), expected exactly 1', v_n;
  end if;

  -- BY OID, never by the identity-argument TEXT: pg_get_function_identity_arguments() returns
  -- parameter names, which is not a valid type list for the text form of has_function_privilege
  -- and raises 42601 (AGT-253 measured this).
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               cross join unnest(array['anon', 'authenticated']) g
              where n.nspname = 'public' and p.proname = 'gate_before_build' and p.prokind = 'f'
                and has_function_privilege(g, p.oid, 'execute')) then
    raise exception 'agt308: public.gate_before_build is executable by anon or authenticated -- it is service_role only';
  end if;
end
$assert$;
