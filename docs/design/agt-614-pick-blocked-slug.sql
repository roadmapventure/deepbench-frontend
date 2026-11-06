-- DeepBench v7.0.972 | docs/design/agt-614-pick-blocked-slug.sql | AGT-614, migration
-- `agt614_pick_blocked_slug` -- WRITTEN, NOT APPLIED by the Builder. The orchestrator applies it via
-- apply_migration BEFORE scripts/ticket-owner.js v7.0.972 reaches dev.
--
-- WHAT THIS IS. `ticket_owner_findings_check_slug_check` admits exactly the thirteen `CHECKS` slugs
-- scripts/ticket-owner.js held through v7.0.969. AGT-614 appends a FOURTEENTH, `pick-blocked-field`
-- (a live ticket the pick skips for a missing scope rationale or queue number), and applyPlan()
-- POSTs the whole night's findings as ONE array (SES-418): a slug the constraint does not admit
-- answers 400 / 23514 on the batch and discards the entire night, not one row. Measured 2026-11-06,
-- the live board already raises 55 judgment rows of this slug, so the very first judged night after
-- the code lands would fail at `insert findings` without this. The CHECK is widened FIRST; the code
-- learns the slug second -- the order agt-166-unrevalidated-slug.sql set.
--
-- THE DOWN IS CARRIED HERE, VERBATIM -- capture_migration_down() classifies an existing constraint
-- `refused` (see agt-166-unrevalidated-slug.sql). The down is the thirteen-slug re-add, byte-for-byte
-- the definition read live 2026-11-06 from `pg_get_constraintdef`:
--
--   alter table public.ticket_owner_findings
--     drop constraint ticket_owner_findings_check_slug_check;
--   alter table public.ticket_owner_findings
--     add constraint ticket_owner_findings_check_slug_check check (check_slug = any (array[
--       'quote-missing'::text, 'size-missing'::text, 'cost-snapshot-missing'::text,
--       'actual-unknown'::text, 'claim-on-closed'::text, 'claim-expired'::text,
--       'verdict-missing'::text, 'designed-closed'::text, 'type-off-taxonomy'::text,
--       'delivered-unaccepted'::text, 'cycles-over-quote'::text, 'remainder-stranded'::text,
--       'unrevalidated-30d'::text]));
--
-- Reversing is safe only while no `pick-blocked-field` row exists -- the re-add refuses the table
-- otherwise, which is the correct refusal: a down that silently deleted findings would lose nights.
--
-- A CONSTRAINT IS NOT DATA. No row is touched; `count(*) from public.ticket_owner_findings` is
-- identical before and after. The fourteen slugs are in `CHECKS` order, the new one last, and
-- tests/regression/agt-79-ticket-owner.test.mjs part N reads the table's array against the code's.

alter table public.ticket_owner_findings
  drop constraint ticket_owner_findings_check_slug_check;

alter table public.ticket_owner_findings
  add constraint ticket_owner_findings_check_slug_check check (check_slug = any (array[
    'quote-missing'::text,
    'size-missing'::text,
    'cost-snapshot-missing'::text,
    'actual-unknown'::text,
    'claim-on-closed'::text,
    'claim-expired'::text,
    'verdict-missing'::text,
    'designed-closed'::text,
    'type-off-taxonomy'::text,
    'delivered-unaccepted'::text,
    'cycles-over-quote'::text,
    'remainder-stranded'::text,
    'unrevalidated-30d'::text,
    'pick-blocked-field'::text]));
