-- DeepBench v7.0.1082 | docs/design/agt-618-holding-aged-slug.sql | AGT-618, migration
-- `agt618_holding_aged_slug`. Mirror of that file.
--
-- WHAT THIS IS. `ticket_owner_findings_check_slug_check` admits exactly the fourteen `CHECKS` slugs
-- scripts/ticket-owner.js has held since AGT-614 (v7.0.972). AGT-618 appends a FIFTEENTH,
-- `holding-aged`, and applyPlan() POSTs the whole night's findings as ONE array (SES-418): a slug
-- the constraint does not admit answers 400 / 23514 on the batch and discards the entire night, not
-- one row. 56 graded tickets already sit over fourteen days in `planned` projects, so the first
-- judged night after the code lands would fail at `insert findings` without this. The CHECK is
-- widened FIRST; the code learns the slug second.
--
-- THE DOWN IS CARRIED HERE, VERBATIM -- capture_migration_down() classifies an existing constraint
-- `refused`. The down is the fourteen-slug re-add, byte-for-byte the definition read live from
-- `pg_get_constraintdef` this cycle (2026-11-11):
--
--   alter table public.ticket_owner_findings
--     drop constraint ticket_owner_findings_check_slug_check;
--   alter table public.ticket_owner_findings
--     add constraint ticket_owner_findings_check_slug_check check (check_slug = any (array[
--       'quote-missing'::text, 'size-missing'::text, 'cost-snapshot-missing'::text,
--       'actual-unknown'::text, 'claim-on-closed'::text, 'claim-expired'::text,
--       'verdict-missing'::text, 'designed-closed'::text, 'type-off-taxonomy'::text,
--       'delivered-unaccepted'::text, 'cycles-over-quote'::text, 'remainder-stranded'::text,
--       'unrevalidated-30d'::text, 'pick-blocked-field'::text]));
--
-- Reversing is safe only while no `holding-aged` row exists -- the re-add refuses the table
-- otherwise, which is the correct refusal: a down that silently deleted findings would lose nights.
--
-- A CONSTRAINT IS NOT DATA. No row is touched. The fifteen slugs are in `CHECKS` order, the new one
-- last, and tests/regression/agt-79-ticket-owner.test.mjs part N reads the table's array against
-- the code's.

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
    'pick-blocked-field'::text,
    'holding-aged'::text]));
