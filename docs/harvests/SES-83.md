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

## Phases (d) and (e) — gated on John, and Accepted 2026-08-21

- **(d)** switches the runner's step-5 selection logic to read the Supabase table via SQL instead
  of the markdown files.
- **(e)** switches human-session ceremony — `CLAUDE-DESIGN.md`, the hygiene scripts, the skills —
  off the files and onto the table.

Both are process changes every session feels, so both waited for John's sign-off rather than
shipping unilaterally through the runner. **John gave it:** he typed *"Table is authority and
files are no longer needed and are now smaller, not needing to carry that info"* into the
briefing on 2026-08-20 (`runner_directives.2255ddf1`), cycle `c1660d2f` turned that into a
designed `gated_before_build` card rather than a build, and he tapped **Accept** on it at
**2026-08-21T00:19Z** (`runner_items` `ae7b57c7`). That tap authorises a five-cycle cut, of which
only cycle 2 is destructive: **(1)** selection flips to SQL and §19v is superseded; **(2)** the
markdown trim itself, with the snapshot's `--check` in the same commit set proving losslessness
at the moment of deletion; **(3)** the ceremony docs; **(4)** the checker scripts and hygiene
skill stop parsing dead files; **(5)** the filing path points at the table.

**Correction (`SES-83` (d), `v7.0.112`) — this section previously said "(d) additionally needs
`SES-86`'s queue engine first, since step-5 selection depends on the `queue` column phase (c)
deferred." That is wrong, and cycle 1 disproved it by running the query.** Ordering needs only
`tier`, `priority_class`, `status`, `description` and `created_at`, all of which exist today. A
materialized `queue` column would let the runner show John *stable queue numbers*, which is why
`SES-86` is still worth building, but selection never depended on it. The note would have blocked
(d) behind an unrelated ticket indefinitely.

## Phase (d) cycle 1 — selection flips to SQL — ✅ done v7.0.112, 2026-08-21, cycle `06b411eb-e95c-4a13-939e-08dafaf325bd`

Doc-only: `docs/runbooks/runner-cycle.md` step 5 layer (3) now carries the canonical selection
query verbatim, and `ARCHITECTURE.md` §19v's "the files are the urgency axis" paragraph is
superseded. No file trimmed, no ticket touched, no schema change. Layers (1) `runner_directives`
and (2) John's automation queue are unchanged and still outrank the table.

**Four traps found live while writing the query — the design card had verified the table's shape,
not its contents:**

1. **Numeric class ordering is mandatory.** `ORDER BY priority_class` is a text sort, so
   `P10 - Tooling` sorts *before* `P2 - Inventive` — the lowest priority would have run first.
2. **`priority_class` carries suffixes.** `P9 - Bug Fixes · FLAGGED` is 19 live tickets; equality
   against the ten legend strings drops every one.
3. **The design's own beta predicate was wrong.** The card proposed `ILIKE '%beta%'`; measured
   live that matches **130** tickets against the real `Beta-gate`/`Post-beta` declarations' 110,
   and 10 of the 20 false positives are the session slug `beta-doc-0728c` quoted as evidence
   inside unrelated bug tickets (`AA-161` is the clean case). Shipped form:
   `description ~* '(Beta-gate|Post-beta)'`.
4. **`title` holds the class string for every imported ticket** (`'P9 - Bug Fixes.'`) — the human
   sentence is the first bolded clause of `description`. Selection is unaffected; anything that
   *displays* the queue is not. The query returns a `gist` expression that strips the prefix.
   Repairing the stored column is filed as its own ticket.

**QA — equivalence proof, live:** the ordered ticket list the new SQL produces was compared
against the ordered list derived from the three markdown files under the old rule; the flip is
behaviour-preserving. Red control: the naive orderings rejected above produce a *different* list,
so the comparison discriminates. Detail: `docs/kickoffs/v7.0.112-SES-83d-selection-flips-to-sql.md`.

## Phase (d) cycle 3 — the ceremony docs — ✅ done v7.0.114, 2026-08-21, cycle `ff76eeb7-757e-45e2-a88d-6290236da141`

Doc-only, 3 files: `CLAUDE-DESIGN.md` (Backlog Capture standing rule + Step 1 reading list +
Step 3 ticket read + close-out steps 8c/9/12 + the 5b gate + 5c's archive move),
`docs/runbooks/runner-cycle.md` (step 7's close-out line) and `docs/WORKING-WITH-JOHN.md`
(Tier-1 autonomy item, measured-detail rule, log-session-findings rule).

**The cycle-2 sweep list was never committed**, so it could not be used as evidence and was
re-derived from scratch by a delegated Sonnet 5 subagent (register B21): **25 filing hits, 23
reading hits, 2 size/hygiene, ~557 benign** — the benign mass being `docs/SESSIONS.md`'s
past-tense session log, correctly left as history. Lesson for later cycles: **a sweep's findings
are evidence only if they land in the repo.** A count quoted on a briefing card is a claim, not a
record.

**Two findings that came from the delegation and not from the orchestrator's own greps:**

1. **The runner's runbook contradicted itself.** `runner-cycle.md` step 7 still read "Close-out
   edits in the same commit set: `FEATURES*.md` row (status + P-class)" while step 5 of the same
   file selected from `backlog_items`. Cycle 1 flipped the READ and left the WRITE pointing at
   the files; the trim then emptied them. Every cycle since `v7.0.113` was instructed to update a
   stub, ~8 times a day. Now a Supabase write with a before-image.
2. **`ARCHITECTURE.md:2497` is still false** — "until then they remain on disk, unchanged, and
   are still where new tickets are filed", one paragraph below §19v's own correct past-tense
   note. §19v is the **gated lane**, so this is a `gated_before_build` card carrying the exact
   proposed replacement, not an unattended edit.

**A constraint worth knowing before cycle 4 plans itself:** this cycle deliberately touched no
`.claude/` path, because step 0 of the runbook records two live stalls (`SES-78c`) from `.claude/`
writes prompting for permission mid-cycle. **Cycle 4's named scope — the hygiene skill — lives
at `.claude/skills/session-hygiene/SKILL.md`.** Establish whether an unattended cycle can write
there *first*; if it cannot, cycle 4 is a gated card or a laptop session, not a build. Left
unfixed for the same reason: `.claude/skills/triage/SKILL.md`'s Classification section, which the
sweep rates the most direct filing instruction in the repo.

**Still open after this cycle:** `docs/STANDARDS.md` (`:359` filing, `:361` row-status vocabulary),
`docs/runbooks/CHI-TRUE-REGRESSION.md` (`:29`, `:93`) and `HAR-17-23q-regression.md` (`:49`) —
three reading hits that gate live QA on `FEATURES.md` rows that no longer exist. And the stored
**routine prompt's step 4** still names the three markdown files for work selection; it is
superseded by runbook step 5, but only John can edit that prompt.

**QA:** 23 paired assertions (absent-from-new **and** present-in-`HEAD`, the latter arming each
control so the suite cannot pass vacuously) + 7 pointer-resolution checks = 30/30, exit 0. Red
control run against a pristine `HEAD` copy: 23/23 fail, exit 1. Detail:
`docs/kickoffs/v7.0.114-SES-83d-ceremony-docs.md`.
