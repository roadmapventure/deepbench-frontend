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
