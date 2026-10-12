-- DeepBench v7.0.852 | docs/design/agt-454-directive-ticket-ref.sql | AGT-454 -- directive link
-- column ticket_ref; the five of 2026-10-08/09 linked and closed.
--
-- ==============================================================================================
-- THIS IS A MIRROR, NOT A PROPOSAL. Section 4 is the migration `agt454_directive_ticket_ref` AS
-- APPLIED, verbatim, 2026-10-12, cycle c3221bd9, service key. It supersedes
-- `docs/design/agt-454-directive-item-ref.sql` (the option-A proposal, removed this ship -- one
-- name, pattern:53). Re-running section 4 is NOT idempotent: the ALTER would fail 42701 on a
-- column that now exists, which is the correct behaviour for a mirror -- it records what ran, it
-- is not a script to re-run.
-- ==============================================================================================
--
--
-- ---- 1. WHAT WAS MEASURED BEFORE THE WRITE, live 2026-10-12, cycle c3221bd9 ------------------
--
-- (a) THE PREMISE, ALIVE. `runner_directives` had NO `ticket_ref` column
--     (information_schema.columns -> 0) and NO foreign key but `runner_directives_epic_id_fkey`
--     (pg_constraint, contype 'f'). 109 rows, 8 with `item_ref` set, 7 of those 8 resolving to
--     `runner_items` (briefing cards) and one (`009eeb7a`) to `backlog_items`. All five rows the
--     ticket names read `item_ref` NULL.
--
-- (b) THE FIVE, AND THE DERIVED MAP (D2). Each body names `audit finding <uuid>`;
--     `audit_findings.filed_backlog_id` names the ticket. One read, both joins:
--       a738da38  directive  done         item_ref NULL  finding NULL     -> NO TICKET
--       418095d5  directive  done         item_ref NULL  5f5ace1d -> AGT-427  (done)
--       2458c24b  directive  in_progress  item_ref NULL  5d7471d7 -> AGT-433  (delivered)
--       0078af4d  directive  in_progress  item_ref NULL  73dfee73 -> AGT-432  (delivered)
--       3c1cc23d  directive  in_progress  item_ref NULL  89463774 -> AGT-434  (delivered)
--     So the RULE derives FOUR of the five mechanically. Card `1d100088` said "three of five need
--     John's word"; it read the repo only. Named, not quietly corrected (pattern:89): only
--     `a738da38` is genuinely underivable -- it names nine gate cards and no finding, and no row in
--     any table gives it a governing ticket.
--
-- (c) THE GRANT SURFACE. `information_schema.role_table_grants` for `public.runner_directives`
--     with grantee `anon`/`authenticated` -> 0 rows, and `role_column_grants` -> 0 rows (relacl is
--     postgres + service_role). So the new column needs no SELECT grant of its own, and the
--     "a new column is not readable until granted" hazard of
--     `.claude/rules/supabase-column-grants.md` cannot bite: nothing public reads this table at
--     all. The GATE asserts the zero rather than assuming it.
--
-- (d) THE RPC, ONE OVERLOAD, unchanged by this ship:
--     `close_directive(p_cycle uuid, p_directive uuid, p_outcome text, p_note text)` -> count 1 in
--     `pg_proc` (and `record_decision` likewise 1). This migration creates and replaces no
--     function, so `.claude/rules/supabase-function-signature.md` has nothing to drop -- the counts
--     are read anyway, after the apply, because that rule's failure mode is invisible from the new
--     call path.
--
--
-- ---- 2. THE DECISIONS (mine, reversible, JOHN-0925) -------------------------------------------
--
-- D1  Card `1d100088` option B: `ticket_ref uuid` with FK `runner_directives_ticket_ref_fkey` ->
--     `backlog_items(id)` ON DELETE RESTRICT. `item_ref` untouched, and it keeps meaning "card".
--     Option A (overload `item_ref`) is not taken: one column with two meanings resolved by trying
--     both tables is the defect, not the fix.
-- D2  The map is DERIVED by RULE from `audit_findings.filed_backlog_id`, never typed in. See 1(b).
-- D3  The down capture declares the TABLE and the CONSTRAINT and answers `refused`:
--       select * from public.capture_migration_down(
--         'c3221bd9-e445-4877-829f-fa64cbe165e3', 'agt454_directive_ticket_ref',
--         '[{"kind":"table","identity":"public.runner_directives"},
--           {"kind":"constraint","identity":"runner_directives_ticket_ref_fkey on public.runner_directives"}]'::jsonb);
--       ->  captured_up_name agt454_directive_ticket_ref
--           captured_class   refused
--           objects_captured 1
--           refusals         1
--           derived_down_sql NULL
--     `refused` is a RESULT, not a failure: an in-place ALTER on a live table is card-only reversal
--     under runbook step 6, and the five before-images in section 4 are the row-level down.
-- D4  No index on `ticket_ref`: 109 rows, every read is a point lookup by the ticket's row id
--     (pattern:67).
--
--
-- ---- 3. WHAT THE GATE PROVED, read back independently of the apply's success flag -------------
--
-- Counts raised-or-passed inside the migration: 5 imaged / 4 linked / 3 closed.
-- Read back afterwards with a separate query (the success flag is never the evidence):
--   PAIRS   418095d5>AGT-427,2458c24b>AGT-433,0078af4d>AGT-432,3c1cc23d>AGT-434   (exact match)
--   a738da38            ticket_ref NULL, status done, outcome shipped, untouched
--   the four linked     status done, outcome shipped; the THREE that moved carry acted_cycle
--                       c3221bd9 (418095d5 keeps 4d98783c -- it was already closed, SES-129)
--   item_ref            8 non-NULL, unchanged on all 109 rows
--   grants              0 table-grant rows and 0 column-grant rows for anon/authenticated
--   FK                  FOREIGN KEY (ticket_ref) REFERENCES backlog_items(id) ON DELETE RESTRICT
--   decision id         bb4a9707-6199-4ec7-9547-1cfb4d083482
--
-- BOTH DIRECTIONS on the FK, as `.claude/rules/supabase-column-grants.md` requires of any gate --
-- the refusal AND the still-working read, because a query that fails for an unrelated reason
-- proves nothing:
--   do $$ begin
--     update public.runner_directives set ticket_ref = '00000000-0000-0000-0000-000000000000'
--      where left(id::text,8) = 'a738da38';
--     raise exception 'AGT-454: FK missing';
--   exception when foreign_key_violation then raise notice 'FK holds'; end $$;
--   -> `FK holds`; the write rolled back and a738da38 still reads ticket_ref NULL.
--   And the legitimate projection still answers: `ticket_ref = '9888d9fc-3d50-4251-a731-f0150d9551df'`
--   returns row `2458c24b` -- the AGT-433 link, by the FK-enforced column.
--
--
-- ---- 4. THE MIGRATION AS APPLIED -- verbatim ---------------------------------------------------

alter table public.runner_directives
  add column ticket_ref uuid
  constraint runner_directives_ticket_ref_fkey references public.backlog_items(id) on delete restrict;

do $$
declare
  v_cycle  uuid   := 'c3221bd9-e445-4877-829f-fa64cbe165e3';
  v_five   text[] := array['a738da38','418095d5','2458c24b','0078af4d','3c1cc23d'];
  v_dec    uuid;
  v_row    public.runner_directives%rowtype;
  v_imaged int := 0;
  v_linked int := 0;
  v_closed int := 0;
  v_pairs  text;
  v_grants int;
  k        text;
begin
  -- The decision this whole migration hangs off. D1-D4 are recorded in its reasoning, including
  -- D2's discrepancy with card `1d100088`.
  v_dec := public.record_decision(
    v_cycle, null, 'directive', 'AGT-454',
    'Five 2026-10-08/09 directives linked to their governing tickets through ticket_ref; the three whose ticket is delivered closed shipped',
    $r$D1 (card 1d100088, option B): the governing-ticket link gets a column of its own, `ticket_ref uuid` with FK `runner_directives_ticket_ref_fkey` -> `backlog_items(id)` on delete restrict, so the database refuses a wrong answer. `item_ref` is left untouched and keeps meaning "briefing card id" (7 of its 8 populated rows resolve to `runner_items`; `lib/briefing-automation.mjs` reads it that way), so the overload of option A is never created.
D2 the map is DERIVED, not guessed: each directive body names `audit finding <uuid>`, and `audit_findings.filed_backlog_id` names the ticket, so the link is `f.id::text = substring(d.body from 'audit finding ([0-9a-f-]{36})')` joined to `b.backlog_id = f.filed_backlog_id`. Live 2026-10-12 that rule yields exactly four pairs -- 418095d5>AGT-427, 2458c24b>AGT-433, 0078af4d>AGT-432, 3c1cc23d>AGT-434 -- and `a738da38` names no finding at all, so it stays unlinked and has no governing ticket in any table. DISCREPANCY WITH CARD 1d100088, named rather than quietly corrected: the card said "three of five need John's word" because it read the repo only; the database derives four of the five mechanically, and only `a738da38` is genuinely underivable. Nothing here hardcodes a content judgment (pattern:11).
D3 the down capture declares the table and the constraint and answers `refused` with 1 refusal (`captured_class` = refused, `objects_captured` 1): an in-place ALTER on a live table is card-only reversal under runbook step 6, and the five before-images below are the row-level down.
D4 no index on `ticket_ref`: 109 rows, every reader is a point lookup by the ticket row id (pattern:67).
GRANTS: `runner_directives` holds ZERO `anon`/`authenticated` grants (relacl = postgres, service_role), so the new column needs no SELECT grant and the GATE asserts the zero in both directions (.claude/rules/supabase-column-grants.md). pattern:2 pattern:9 pattern:17 pattern:89 pattern:95 pattern:99$r$,
    public.ladder_work_class('P10 - Tooling'));

  -- Every one of the five imaged BEFORE anything moves, including the two already `done` that
  -- nothing updates: the before-image set is this migration's down (pattern:169 -- pk_value is the uuid).
  foreach k in array v_five loop
    select * into v_row from public.runner_directives where left(id::text, 8) = k;
    if not found then raise exception 'AGT-454: directive % not found', k; end if;
    insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data, decision_id)
    values (v_cycle, 'runner_directives', v_row.id::text, to_jsonb(v_row), v_dec);
    v_imaged := v_imaged + 1;
  end loop;

  -- THE LINK, derived by RULE. `a738da38` is excluded by the rule itself, not by a list.
  update public.runner_directives d
     set ticket_ref = b.id
    from public.audit_findings f
    join public.backlog_items b on b.backlog_id = f.filed_backlog_id
   where left(d.id::text, 8) = any (v_five)
     and f.id::text = substring(d.body from 'audit finding ([0-9a-f-]{36})');
  get diagnostics v_linked = row_count;

  -- THE CLOSE, for the open rows whose ticket is finished. `close_directive()` images the row
  -- itself and leaves an already-closed row untouched (SES-129).
  for v_row in
    select d.*
      from public.runner_directives d
      join public.backlog_items b on b.id = d.ticket_ref
     where left(d.id::text, 8) = any (v_five)
       and d.type = 'directive'
       and d.status in ('queued', 'in_progress')
       and b.status in ('delivered', 'done')
     order by d.created_at
  loop
    perform public.close_directive(
      v_cycle, v_row.id, 'shipped',
      'Shipped as ' || (select b.backlog_id from public.backlog_items b where b.id = v_row.ticket_ref)
      || ': the work you asked for is on dev and the ticket settled delivered, so this instruction '
      || 'of yours is finished. (AGT-454, v7.0.852)');
    v_closed := v_closed + 1;
  end loop;

  -- ---- GATE. Every assertion RAISEs, so a committed migration IS the gate's pass. ----------
  if v_imaged <> 5 then raise exception 'AGT-454 GATE: % before-images, expected 5', v_imaged; end if;
  if v_linked <> 4 then raise exception 'AGT-454 GATE: % rows linked, expected 4', v_linked; end if;
  if v_closed <> 3 then raise exception 'AGT-454 GATE: % directives closed, expected 3', v_closed; end if;

  select string_agg(left(d.id::text, 8) || '>' || b.backlog_id, ',' order by d.created_at)
    into v_pairs
    from public.runner_directives d
    join public.backlog_items b on b.id = d.ticket_ref
   where left(d.id::text, 8) = any (v_five);
  if v_pairs is distinct from '418095d5>AGT-427,2458c24b>AGT-433,0078af4d>AGT-432,3c1cc23d>AGT-434' then
    raise exception 'AGT-454 GATE: pairs read back as %', coalesce(v_pairs, '<null>'); end if;

  if exists (select 1 from public.runner_directives
              where left(id::text, 8) = 'a738da38' and ticket_ref is not null) then
    raise exception 'AGT-454 GATE: a738da38 names no finding and must stay unlinked'; end if;

  if exists (select 1 from public.runner_directives
              where left(id::text, 8) = any (v_five) and ticket_ref is not null
                and (status <> 'done' or outcome <> 'shipped')) then
    raise exception 'AGT-454 GATE: a linked row does not read done/shipped'; end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'runner_directives_ticket_ref_fkey'
                    and conrelid = 'public.runner_directives'::regclass and contype = 'f') then
    raise exception 'AGT-454 GATE: the ticket_ref foreign key is not on the table'; end if;

  select count(*) into v_grants from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'runner_directives'
     and grantee in ('anon', 'authenticated');
  if v_grants <> 0 then raise exception 'AGT-454 GATE: % public grant row(s) on runner_directives', v_grants; end if;

  if (select count(*) from public.runner_directives where item_ref is not null) <> 8 then
    raise exception 'AGT-454 GATE: item_ref moved — expected 8 non-null, got %',
      (select count(*) from public.runner_directives where item_ref is not null); end if;

  raise notice 'AGT-454: % imaged, % linked, % closed, pairs %, decision %', v_imaged, v_linked, v_closed, v_pairs, v_dec;
end $$;

-- Rationale: docs/ARCHITECTURE.md §19v (:2551), §19b (:1096); card `1d100088` (D1's option B);
-- SES-129 (`close_directive`, closed stays closed); SES-154 (`done` is UNSETTLEABLE in
-- settle-ship.js, so `delivered` is the trigger); runbook step 6 (capture before apply).
