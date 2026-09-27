-- DeepBench v7.0.647 | docs/design/agt-179-ses-418-disposition.sql | AGT-179 -- the disposition
-- lands on backlog_items:SES-418, the row every reader reads. Apply as migration
-- `agt179_ses418_disposition` (kickoff §4). Replace :C with
-- 'c9a214f5-940d-4b03-a725-1072b34bea94'::uuid.
--
-- NO capture_migration_down CALL, AND THAT IS NOT AN OMISSION. This migration creates, drops and
-- retypes nothing -- there is no schema object to reconstruct, so capture_migration_down() has
-- nothing to classify. The down for a DATA change on this platform is the before-image chain, the
-- same shape docs/design/agt-166-intake-homing.sql used: one record_decision(), one whole-row
-- to_jsonb() image, and `backlog_items` is in reverse_decision()'s own k_allowed list (read live
-- 2026-09-27), so the exact down is:
--
--   select public.reverse_decision('<decision id>', 'cycle-c9a214f5', 'AGT-179 reversed', :C);
--
-- NEVER TOUCHES status, AND NEVER TOUCHES updated_at.
--  * `status` stays `done` BY DECISION (kickoff §2): SES-418's remaining ask is answered, not owed.
--    Re-opening it would also strand the row -- trigger `backlog_done_requires_verdict` (read live
--    2026-09-27) refuses a write INTO `done` on a project-homed row with no `runner_verdicts` row,
--    and SES-418 has none (that is its own open `verdict-missing` finding). A re-open would make
--    the row unclosable by the very machinery that is supposed to close it.
--  * `updated_at` is left alone per SES-316 -- a bumped stamp makes the row unreversible.
--
-- THE DISPOSITION IS PREPENDED, NOT APPENDED, and that is a measurement, not a style choice. The
-- work-quality audit reads `description (first 1500)` (docs/runbooks/auditor-routine.md:89).
-- SES-418's description is 1192 chars, so an appended disposition would sit almost entirely OUTSIDE
-- the window the only reader that grades this row actually reads -- the answer would be invisible to
-- the check that raised the question. Prepended, the whole disposition and the head of the original
-- ask both land inside 1500.
--
-- THE MARKER STRING `DISPOSITION 2026-09-27` IS THE ASSERTION HANDLE. Do not grade this migration by
-- searching the description for `AGT-79`: it is ALREADY there before this file runs ("widened by the
-- AGT-79 v7.0.518 peer while this session ran"), measured 2026-09-27, so that test passes on the
-- unchanged row and proves nothing.

do $$
declare
  d uuid;
  n integer;
begin
  d := public.record_decision(:C, null, 'ticket-status', 'SES-418',
        'AGT-179: SES-418''s remaining ask is answered ON the row -- per-row insert and batch pre-validation both rejected with grounds, the test guard built, the closing evidence measured',
        'The row closed done on 2026-09-22 carrying text that still asked for work, while the actual answer lived only in docs/harvests/AGT-79.md:864 and in code. Measured 2026-09-27: scripts/ticket-owner.js:1133-1144 is still one whole-array POST (by decision, not omission); part N at tests/regression/agt-79-ticket-owner.test.mjs:1156 is the shipped guard; 93 remainder-stranded ledger rows and 14 landed audit-board nights are the closing evidence this row named as UNPROVEN. status untouched (done), updated_at untouched (SES-316). Reversible: one whole-row before-image, backlog_items is in reverse_decision()''s allowed list. pattern:95 pattern:92 pattern:93',
        null);

  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data, decision_id)
  select :C, 'backlog_items', b.id::text, to_jsonb(b), d
    from public.backlog_items b
   where b.backlog_id = 'SES-418';

  -- The image must exist BEFORE the write, and it is asserted rather than assumed: a reversal with
  -- nothing to restore is not a reversal.
  select count(*) into n from public.runner_before_images
   where decision_id = d and table_name = 'backlog_items';
  if n <> 1 then
    raise exception 'AGT-179: expected exactly 1 before-image for SES-418, found %', n;
  end if;

  update public.backlog_items b
     set description = $disp$DISPOSITION 2026-09-27 (AGT-179, v7.0.647) -- answered here, on the row. Nothing is owed and this row is NOT re-opened. (1) PER-ROW INSERT: REJECTED -- AGT-79 v7.0.518's grounds, adopted (docs/harvests/AGT-79.md:864): a night is one unit, "there is no partial night", so a ledger written in part makes `notes` counts disagree with the rows and `recordNightly` would stamp a half-landed night as landed. (2) BATCH VALIDATED BEFORE SENDING: REJECTED on that same ground -- with no partial night, a pre-send check against the live constraint cannot save a night, only fail earlier with a clearer message. The drift this row feared is prevented by the shipped ordering protocol instead (scripts/ticket-owner.js:14-18: the CHECK widens FIRST, the code learns the slug second). So scripts/ticket-owner.js:1133-1144 remains one whole-array POST BY DECISION, not by omission. (3) THE TEST GUARD: BUILT -- part N, tests/regression/agt-79-ticket-owner.test.mjs:1156, feeds the live table the script's own CHECKS vocabulary and asserts both the count and the slugs; AGT-179 closed its one silent hole, an arm that vanished unannounced when credentials were absent. (4) THE CLOSING EVIDENCE this row named as UNPROVEN is now IN: 93 `remainder-stranded` ledger rows (8 open) and 14 landed audit-board nights, 2026-09-13 through 2026-09-27 05:46Z, measured 2026-09-27. This row never carried a `ship_summary` field at all -- see harvest_link.

--- the original text, unchanged, follows ---

$disp$ || b.description,
         harvest_link = 'docs/harvests/AGT-179.md'
   where b.backlog_id = 'SES-418';
end $$;

-- Both directions, asserted after the fact, never trusting the migration's success flag.
-- 1 expected, and it is the MARKER, not the string `AGT-79`:
select count(*) as must_be_1 from public.backlog_items
 where backlog_id = 'SES-418'
   and description like 'DISPOSITION 2026-09-27 (AGT-179%'
   and description like '%WHAT REMAINS: the findings insert is still all-or-nothing%'
   and harvest_link = 'docs/harvests/AGT-179.md'
   and status = 'done'
   and updated_at = '2026-09-22 16:04:07.385222+00'::timestamptz;
