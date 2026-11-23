-- DeepBench v7.0.1112 | docs/design/agt-619a2-ledger-lineage.sql | AGT-619 stage A2 of three applies -- public.ai_activity_log gains pricing_row_id, readable by the public key
--
-- THE MIRROR of migration `agt619a2_ledger_lineage`. Everything below the VERBATIM marker is the
-- migration as designed (kickoff docs/kickoffs/v7.0.1112-AGT-619-each-dollar-names-its-rate-staged.md).
-- It needs stage A1 applied: the foreign key points at public.model_pricing (id).
--
-- WHAT CHANGES (additive; no ledger row is rewritten, no backfill)
--   public.ai_activity_log  + pricing_row_id -> model_pricing(id), nullable; SELECT on that one
--   column granted to anon and authenticated (the table's SELECT is a column list: a new column
--   is unreadable until granted, .claude/rules/supabase-column-grants.md).
-- REACH: the ledger every AI call writes; the public key's readable column list grows by one
-- column that is NULL on every row until the code ships. It applies alone for that reason.
--
-- DOWN. Before the apply: public.capture_migration_down(<cycle>, 'agt619a2_ledger_lineage', the
-- foreign key) -- its down removes the constraint and leaves the column standing, inert. Removing
-- the column is attended-only and is run only AFTER the code that writes it is reverted:
--   alter table public.ai_activity_log drop column pricing_row_id;
-- Guard: tests/regression/agt-619-rate-lineage.test.mjs. Governing: docs/ARCHITECTURE.md section 19t.
--
-- ---- THE MIGRATION, VERBATIM ---
alter table public.ai_activity_log add column pricing_row_id bigint;

alter table public.ai_activity_log
  add constraint ai_activity_log_pricing_row_id_fkey
  foreign key (pricing_row_id) references public.model_pricing (id);

comment on column public.ai_activity_log.pricing_row_id is 'AGT-619: the model_pricing row lib/activity-log.js priced cost_usd with; NULL = not priced from a rate row (unpriced, caller-supplied, or written before v7.0.1112).';

grant select (pricing_row_id) on public.ai_activity_log to anon, authenticated;

do $gate$
declare
  n integer;
begin
  -- A2 GATE 1: the column exists.
  select count(*) into n from information_schema.columns
   where table_schema = 'public' and table_name = 'ai_activity_log' and column_name = 'pricing_row_id';
  if n <> 1 then raise exception 'A2 GATE 1: % of 1 column exists', n; end if;

  -- A2 GATE 2: grants, both directions. The new column is readable; the three columns the ledger
  -- withholds are still withheld; the sheet it points at stays closed.
  if not has_column_privilege('anon', 'public.ai_activity_log', 'pricing_row_id', 'select')
     or not has_column_privilege('authenticated', 'public.ai_activity_log', 'pricing_row_id', 'select') then
    raise exception 'A2 GATE 2: pricing_row_id is not readable by anon and authenticated';
  end if;
  if has_column_privilege('anon', 'public.ai_activity_log', 'caller_ip', 'select')
     or has_column_privilege('anon', 'public.ai_activity_log', 'user_agent', 'select')
     or has_column_privilege('anon', 'public.ai_activity_log', 'server_ip', 'select')
     or has_table_privilege('anon', 'public.ai_activity_log', 'select') then
    raise exception 'A2 GATE 2: a withheld ledger column became readable by anon';
  end if;
  if has_any_column_privilege('anon', 'public.model_pricing', 'select')
     or has_any_column_privilege('authenticated', 'public.model_pricing', 'select') then
    raise exception 'A2 GATE 2: model_pricing is readable by anon or authenticated';
  end if;

  -- A2 GATE 3: nothing is stamped and no existing dollar moved (no backfill).
  select count(*) into n from public.ai_activity_log where pricing_row_id is not null;
  if n <> 0 then raise exception 'A2 GATE 3: % ledger row(s) already stamped', n; end if;
end
$gate$;
