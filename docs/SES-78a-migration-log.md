<!-- DeepBench v7.0.93 | SES-78a-migration-log.md | S-SES-78a — runner tables migration record (SQL-only via MCP, DAT-22 precedent). -->
# SES-78a Migration Log — the `runner_` tables (v7.0.93, 2026-08-19)

Applied 2026-08-19 ~20:00 CST by the `design-ses-78-0819` session via the Supabase MCP
(`apply_migration`), per the SQL-only precedent (`DAT-22`). Design: `docs/SES-78-RUNNER-DESIGN.md`;
constraints: `ARCHITECTURE.md` §19v.

## Migrations

1. **`ses_78a_runner_tables`** — created `runner_directives`, `runner_budget`, `runner_cycles`,
   `runner_items`, `runner_ladder`, `runner_before_images` (full DDL in the migration itself —
   `list_migrations` / the Supabase dashboard is the source; not restated here). Seeds:
   `runner_budget('2026-08', 100.00, 3.30)` (John's approved envelope) and the six §19v work
   classes into `runner_ladder`, all rung 1 / streak 0.
2. **`ses_78a_runner_revoke_public_select`** — `REVOKE ALL … FROM anon, authenticated` on all
   six tables.

## Found live — DAT-18's lockdown does not cover SELECT on new tables

`DAT-18`'s default-privilege lockdown closed public **writes** only: the six new tables came up
with **12 auto-granted SELECT rows** (6 tables × 2 roles), caught by this migration's own QA
assertion, not by memory. The `.claude/rules/supabase-column-grants.md` "defaults are closed"
note is true for writes and **false for reads** — any future table whose content shouldn't be
publicly readable needs an explicit `REVOKE SELECT` (or the grants check in its QA). These
tables carry John's directives and cost data; browser code never reads them (runner uses MCP,
briefing decisions live in the Artifact), so zero public privileges is correct and verified.

## QA (all green, discriminating)

| Assertion | Result |
|---|---|
| 6 `runner_%` tables exist | ✅ 6 |
| Public grants on `runner_%` after revoke | ✅ 0 rows (was 12 — the found-live above) |
| Budget fail-closed: `2026-08` row present, `2026-09` absent | ✅ 1 / 0 |
| Ladder seeded, rung 1 / streak 0 | ✅ 6 |
| **Before-image → restore round-trip:** mutate `runner_ladder('invention')` to rung 99 after
  imaging it, restore from the image, compare `to_jsonb(row) = image` | ✅ `restore_byte_equal: true` |
| QA artifacts cleaned (cycles, images back to 0; ladder pristine) | ✅ 6 / 0 / 0 |

The round-trip is the assertion that discriminates: it fails if the restore path does nothing,
because the row was verifiably corrupted first.
