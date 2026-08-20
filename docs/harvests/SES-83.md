<!-- DeepBench | harvest record | SES-83 | v7.0.107 -->
# SES-83 — backlog moves from markdown silos to Supabase

`docs/FEATURES.md`'s row is the pointer; this file holds the full design rationale and the
phase-by-phase build record.

## Why: five-file fragmentation, measured

John's decision, 2026-08-20, `design-runner-gov-0820`: the backlog moves off five markdown
silos (`FEATURES.md` + `FEATURES-NEXT.md` + `FEATURES-LATER.md` + the archive + `docs/harvests/`)
onto one `public.backlog_items` Supabase table as source of truth. The fragmentation was
measurably failing, not just inconvenient: `FEATURES.md` had grown to 335 KB against a 40 KB
baseline; there were hand-counted ID collisions; sessions were burning whole passes just to
reclassify rows; and the hygiene tooling kept flagging misfiled rows it had no way to fix
structurally.

## Design

- `tier` (`now`/`next`/`later`) and `priority_class` (`P1`–`P10`) become real columns instead of
  which file a row lives in and a bolded string inside the Feature cell.
- Canonical status values become a CHECK constraint (`done`/`partial`/`missing`) instead of
  free-text agreement across three files.
- Narrative stays in `docs/harvests/`, linked from each row — this file is exactly that pattern
  applied to itself.
- A generated markdown snapshot is committed at every ship point, keeping git history and an
  offline copy of the table. This also mitigates `SES-81`'s finding that the repo-external backup
  tool (`dump-supabase.mjs`) silently skips any table not in its hardcoded list — the six
  `runner_*` tables included — so a committed snapshot is a second, independent copy that doesn't
  depend on that tool knowing the table exists.

Runner-executable phases (a)–(c) were queued by directive; (d) and (e) are gated on John (see
below).

## Phase (a) — schema + FEATURES.md import — ✅ done v7.0.100, 2026-08-20, cycle-20260820-1707

`public.backlog_items` created with `REVOKE ALL PRIVILEGES FROM anon, authenticated` in the same
migration that created the table (the `SES-78a` lesson — grant/revoke in the creating migration,
never a follow-up). 277 rows imported byte-for-byte from `FEATURES.md`. QA reconciled all 277
rows × 9 fields with zero mismatches. Both grant directions proven live: anon key → HTTP 401,
service key → 200. The duplicate `CHI-48` ID (`docs/harvests/CHI-48-ui.md` is a separate row from
the same ID elsewhere) was preserved rather than collapsed, distinguished by a `row_ordinal`
column.

**Status-value mapping note:** `status` stores the canonical 3-value form (`done|partial|missing`)
under the CHECK constraint, per the directive spec. The source files' actual status text is more
varied than that (`Shipped (SQL-only)`, `Superseded`, `Duplicate (merge proposed)`, `— N/A`, etc.)
— those variants map onto the three canonical values per the reconciliation table recorded in
`docs/kickoffs/v7.0.100-SES-83a-backlog-items-schema.md`, rather than being invented ad hoc during
import.

## Phase (b) — NEXT + LATER import — ✅ done v7.0.101, 2026-08-20, cycle-20260820-1910

Scope amended by John same day: **open backlog tickets only** — the archive is history and is
deliberately never imported or maintained in the table. 23 `FEATURES-NEXT.md` + 247
`FEATURES-LATER.md` open tickets imported (`tier='next'`/`'later'`), same reconciliation
discipline as phase (a).

`FEATURES.md` was re-reconciled after commit `573bb84`'s P1–P10 renumbering landed mid-phase: 6
new tickets were added and priority_class strings were rewritten across P9/P10 (they had been
P8/P9 pre-renumber). The table then held 553 tickets. The import parser is header-aware because
`FEATURES-LATER.md` uses a 4-column layout different from the other two files. QA reconciled all
553 tickets × 9 fields with zero mismatches (4,977 comparisons). The grants gate was rechecked and
unchanged: `role_table_grants` = 0 rows; publishable-key SELECT → 401, service-key → 200. A
before-image of the pre-import 277 rows was saved to `runner_before_images` at cycle open, before
any of phase (b)'s writes. Full detail: `docs/kickoffs/v7.0.101-SES-83b-backlog-items-next-later-import.md`.

## Phase (c) — snapshot-export script + runbook step — ✅ done v7.0.107, 2026-08-20, cycle `a463c2a2-cedf-4f50-8c8d-a16368496870`

**Scope actually shipped this cycle, narrower than phase (c)'s original description:** the
snapshot-export script and its runbook wiring only. The additional columns phase (c) was
originally scoped to add — `queue` (materialized position), lifecycle `status`
(`filed`/`queued`/`designed`/`in development`/`completed`/`removal proposed`/`removed`),
`filed_at` mined from git history, and pinned positions — were deliberately **not** built this
cycle. The phase-b/c directive (`runner_directives.5e4bc577`) explicitly says not to build them
yet; they belong to `SES-86`, sequenced after `SES-85`.

**Shipped:**

- `scripts/export-backlog-snapshot.js` (new) — exports `public.backlog_items` to
  `docs/backlog/BACKLOG-SNAPSHOT.md`.
- `docs/runbooks/runner-cycle.md` step 7 now runs it as part of every ship commit set.

**Snapshot contents:** 553 tickets, grouped 3 ways (by tier, by source_file), 528 KB,
payload sha256 `51daf96b8c3cb115606b7d027465ec5d8ef834437f6df573545effef0ad557c3`.

**Deterministic by construction:** the generated body carries no wall-clock timestamp —
provenance is the ticket count plus the payload sha256 — so re-running the export against an
unchanged table writes nothing and the script prints `unchanged`. Verified: run 2 this cycle left
the file byte-identical to run 1.

**Round-trip QA — live against the real table, not a fixture:** the script's own `parseDocument()`
read the generated snapshot back, and all 553 tickets × 11 tracked fields (6,083 comparisons)
matched a fresh PostgREST fetch of the same table — 0 mismatches, 0 missing. The 14 descriptions
that themselves contain pipe characters, and the 4 tickets whose own titles carry leading/trailing
whitespace (`CHI-24`, `DL-12`, `AA-43`, `SE-01`), round-trip exactly.

**Red control that makes the padding/escaping rule load-bearing:** the identical generated file,
read back by a naive `.trim()`-based reader instead of the shipped reader, mismatches on exactly
those same 4 tickets. The shipped reader mismatches on 0. Without this control, "0 mismatches"
would not distinguish a correct reader from a lucky one.

**Exit-code contract, proven, not just asserted:**

| Condition | Exit code |
|---|---|
| `--check` on the clean, matching file | 0 |
| `--check` after a one-character mutation to the file | 1 |
| `--check` again once the file is restored | 0 |
| missing required env var | 2 |
| bad service key (HTTP 401 from PostgREST) | 2 |

An unrunnable check (missing env, bad credentials) exits 2, never 0 — it never reads as a pass by
accident.

**Build/regression:** `npm run build` green. Regression suite 29/29 (run with Supabase
credentials present in env). Kickoff: `docs/kickoffs/v7.0.107-SES-83c-backlog-snapshot-export.md`.

## Phases (d) and (e) — what they are, and why they're gated on John

- **(d)** switches the runner's step-5 selection logic to read the Supabase table via SQL instead
  of the markdown files.
- **(e)** switches human-session ceremony — `CLAUDE-DESIGN.md`, the hygiene scripts, the skills —
  off the files and onto the table.

Both are process changes every session feels, so both wait for John's sign-off rather than
shipping unilaterally through the runner. Until they land, the markdown files stay authoritative
and the table mirrors them — deliberately, so the table can never silently diverge from what
sessions are actually reading and editing. (d) additionally needs `SES-86`'s queue engine first,
since step-5 selection depends on the `queue` column phase (c) deferred.
