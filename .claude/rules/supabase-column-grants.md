# Hiding one column from the public key — a column REVOKE cannot subtract from a table GRANT

`REVOKE SELECT (col) ON t FROM anon` **does nothing** while `anon` still holds a table-level
`GRANT SELECT ON t`. Postgres keeps honouring the broader grant, so the column stays readable.
The statement succeeds, the migration reports success, and nothing changes.

To actually restrict one column:

```sql
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'your_table'
    and column_name <> 'the_secret_column';
  execute 'revoke select on public.your_table from anon, authenticated';
  execute format('grant select (%s) on public.your_table to anon, authenticated', cols);
end $$;
```

- **Assert both directions, and never trust the migration's success flag.** The denied query
  must fail *and* a legitimate projection must still return rows. Best form: run the app's real
  projection, then run that same projection with the restricted column appended — the pair
  proves the gate is real rather than the query failing for an unrelated reason.
- **`select=*` stops working for that role** once the grant is a column list. Every reader must
  name its columns first, or it 403s. Survey them *before* revoking, and land the revoke only
  after the frontend that stopped asking is deployed — otherwise the screen breaks in the gap.
- **This fails closed for future columns:** a newly added column is not readable by `anon`
  until granted. That is the right direction (a blank metric, never a leak), but it will present
  as "my new column returns nothing." Add the grant in the same migration that adds the column.
- RLS is irrelevant here — it filters rows, never columns. A table with RLS disabled and a
  table-wide grant exposes every column to whoever holds the anon key, which ships in the
  browser bundle.

Found live 2026-08-01 (`LOG-124`, `v7.0.39`): `LOG-121a` added `caller_ip` to `ai_activity_log`,
which the AI Audit reads from the browser with the anon key — making every visitor's IP publicly
readable (476 rows, proven with nothing but that key). The first remediation migration used the
column-REVOKE form above, reported success, and left the data fully exposed; it was caught only
because the QA step asserted the denial *and* the still-working read instead of one of them.

Rationale: `docs/ARCHITECTURE.md` §12/§13, and `docs/harvests/LOG-121.md`.

## Addendum (2026-08-08, `DAT-18`): check WRITE grants too, not just SELECT

The rule above is about hiding a column from readers. `S-HAR-33-design` found the inverse hole:
Supabase's defaults had granted `anon`/`authenticated` **table-level INSERT/UPDATE/DELETE/TRUNCATE
on every public table**, RLS disabled — so any column-list SELECT lockdown was guarding a table the
public key could simply rewrite or wipe. When auditing a table's exposure, always read
`information_schema.role_table_grants` for ALL privilege types, not only the SELECT column list —
and remember `role_column_grants` shows per-column rows for table-level grants too, so a column
appearing there does not mean the grant was ever column-scoped. Gate-critical lockdown shipped for
`ip_org_cache` (no public writes) and `ai_activity_log` (append-only + non-negative token check);
`DAT-18` (v7.0.78, 2026-08-08) finished the platform: `anon`/`authenticated` hold **zero write
privileges** on every table except `tasks` (INSERT+UPDATE — the browser's own write path, `DAT-19`
tracks rerouting) and `ai_activity_log`'s INSERT.

Two facts every later grants session needs:

- **Default privileges are closed for WRITES only** (`alter default privileges for role postgres … revoke … on tables`):
  a new table gets NO public write grants automatically. Right direction (fail closed), but a new
  table the browser must write presents as silent 401/42501s — grant explicitly in the migration
  that creates it, same pattern as the SELECT fail-closed note above.
  **Corrected 2026-08-19 (`SES-78a`, found live): SELECT is NOT closed** — the six `runner_`
  tables came up with auto-granted public SELECT (12 rows, 6 tables × 2 roles), caught by the
  migration's own QA. A new table whose content shouldn't be publicly readable needs an explicit
  `REVOKE SELECT … FROM anon, authenticated` in its creating migration, and its QA must assert
  zero grant rows. Detail: `docs/SES-78a-migration-log.md`.
- **`information_schema.role_table_grants` does not report PG17 `MAINTAIN`** — `anon`/`authenticated`
  still hold `m` on all 32 tables (`DAT-20`, latent, not DML, unreachable via PostgREST). Read
  `pg_class.relacl` / `pg_default_acl` when the question is "the complete grant surface," not just
  the information_schema views.
