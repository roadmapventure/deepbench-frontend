-- DeepBench v7.0.643 | docs/design/agt-166-unrevalidated-slug.sql | AGT-166 slice 2, migration
-- `agt166_unrevalidated_slug` -- apply via apply_migration AFTER capture_migration_down (kickoff §4).
-- Replace :C with '76d65990-ce5b-4f49-8870-420d92dacc1c'::uuid.
--
-- WHAT THIS IS. `ticket_owner_findings_check_slug_check` admits exactly the twelve `CHECKS` slugs
-- scripts/ticket-owner.js holds. Slice 2 appends a THIRTEENTH, `unrevalidated-30d`, and
-- applyPlan() POSTs the whole night's findings as ONE array (SES-418): a slug the constraint does
-- not admit answers 400 / 23514 on the batch and discards the entire night, not one row. So the
-- CHECK is widened FIRST, in this file, and only then does the code learn to emit the slug.
--
-- THE DOWN IS CARRIED HERE, VERBATIM, BECAUSE capture_migration_down() REFUSES IT.
-- `capture_migration_down(:C,'agt166_unrevalidated_slug','[{"kind":"constraint","identity":
-- "ticket_owner_findings_check_slug_check on public.ticket_owner_findings"}]'::jsonb)` classifies an
-- EXISTING constraint `refused` -- it generates no down for an object it would have to reconstruct
-- from a definition it does not own. That is a RESULT, not an error to route around, so the down
-- lives below as the twelve-slug re-add, byte-for-byte the definition read live 2026-09-27 from
-- `pg_get_constraintdef`:
--
--   alter table public.ticket_owner_findings
--     drop constraint ticket_owner_findings_check_slug_check;
--   alter table public.ticket_owner_findings
--     add constraint ticket_owner_findings_check_slug_check check (check_slug = any (array[
--       'quote-missing'::text, 'size-missing'::text, 'cost-snapshot-missing'::text,
--       'actual-unknown'::text, 'claim-on-closed'::text, 'claim-expired'::text,
--       'verdict-missing'::text, 'designed-closed'::text, 'type-off-taxonomy'::text,
--       'delivered-unaccepted'::text, 'cycles-over-quote'::text, 'remainder-stranded'::text]));
--
-- Reversing this migration means running exactly that, and it is safe only while no
-- `unrevalidated-30d` row exists -- the re-add would refuse the table otherwise, which is the
-- correct refusal: a down that silently deleted ruled findings would lose a night's judgment.
--
-- A CONSTRAINT IS NOT DATA. No row is touched, no `revalidated_at` is written and no finding is
-- filed here; `count(*) from public.ticket_owner_findings` is identical before and after. The
-- thirteen slugs are in `CHECKS` order plus the new one last, because renderCensus() prints one
-- line per slug in that order and findings sort by that index -- the table's array and the code's
-- array are read side by side by tests/regression/agt-79-ticket-owner.test.mjs part N.

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
    'unrevalidated-30d'::text]));
