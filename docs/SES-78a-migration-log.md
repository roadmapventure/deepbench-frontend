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

---

## Addendum (2026-08-20, `B31`, v7.0.106) — a seventh table: `public.runner_lease`

Applied by Automated runner cycle `cycle-20260820-2106` (`runner_cycles.180c150b`) via
`apply_migration`, same SQL-only precedent. Directive: `runner_directives.e5fb5b2a` (John's
queue, filed by the losing cycle of the collision it fixes). Runbook change shipped in the same
commit: `docs/runbooks/runner-cycle.md` step 0 / step 3 / step 9.

**Why.** Step-0 assertion (2) was `SELECT id FROM runner_cycles WHERE ended_at IS NULL`. On
2026-08-20 cycle `e36d4379` ran that SELECT ~17 seconds after cycle `4da5a7bd` had inserted its
own open row, got zero rows, and both cycles built `ADM-1 v1` in parallel. Theirs pushed first
(`a7c66ad`, v7.0.104); the loser's commit never reached the remote and `v7.0.103` is a permanent
gap in `dev_version_counter`. A read cannot serialise against a concurrent write — the gate has
to be a write.

**Migrations**

1. **`b31_runner_lease_singleton`** — created `public.runner_lease` (`id smallint` pinned to 1 by
   a CHECK, `holder uuid`, `stamp`, `held_since`, `released_at`, `steals`, `updated_at`), seeded
   the single row, `REVOKE ALL … FROM anon, authenticated` in the same migration (the found-live
   above: SELECT is auto-granted on new tables, so the revoke is never optional), table comment
   carrying the rationale.
2. **`b31_runner_lease_drop_fk_holder`** — dropped the `holder → runner_cycles(id)` FK. The claim
   mints the cycle id with `gen_random_uuid()` *inside* the claiming UPDATE and the cycle row is
   inserted with it in the next statement; an FK would reject that, and claim-then-bind inside
   one statement is impossible because Postgres silently drops a second UPDATE of the same row
   in the same statement (it would leave `holder` NULL — a lease that looks free).

**The mechanism.** One `UPDATE … WHERE id = 1 AND (holder IS NULL OR held_since < now() -
INTERVAL '45 minutes') RETURNING holder` — 1 row means you hold it and the returned uuid is your
cycle id; 0 rows means a live cycle holds it, so close `did_not_run` and end. Release is
holder-guarded (`AND holder = '<own id>'`) at every exit path. The 45-minute TTL is the
anti-deadlock for a cloud session that dies mid-cycle (longest real cycle to date ~18 min
against a 3-hour cadence); a steal increments `steals`, so a non-zero value means cycles are
dying.

## QA (v7.0.106, all live against the real table — no fixture table, no mock)

| Assertion | Result |
|---|---|
| Lease held by this cycle after its own claim | ✅ `holder = 180c150b…`, `steals 0` |
| **Second claimer runs the canonical claim while held** | ✅ **0 rows** — no lease, no cycle id |
| **Red control: identical statement after aging `held_since` 60 min past the TTL** | ✅ 1 row, new holder, `steals 1` — so the 0-row result above came from the guard, not from a statement that can never claim |
| Release is holder-guarded: stolen-from cycle attempts release | ✅ 0 rows, new holder untouched |
| `runner_cycles` polluted by the probes | ✅ 0 rows `stamp LIKE 'B31-QA%'`; total unchanged |
| Public grants on `runner_lease` (`role_table_grants`) | ✅ 0 rows |
| **Live both-directions grant proof** | ✅ publishable key: SELECT **401** `42501 permission denied for table runner_lease`, PATCH **401** same; the same key on `tasks` returns **200** (so the 401 is the grant, not a broken request); service role reads it fine |
| QA fixture restored | ✅ lease back to this cycle, `steals` back to 0; before-image `25ea7e86` on file |
