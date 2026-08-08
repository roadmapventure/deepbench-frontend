# `DAT-12` — harvest

Detail moved out of `docs/FEATURES.md` when the row was rewritten, 2026-07-29 (`S-DAT-12-design`).
Nothing here is deleted; the row above it carries the current framing.

---

## The retired framing (filed 2026-07-29 by `S-DAT-11-design`)

> **Demo Reset is unreachable — the one mechanism that restores the seed corpus cannot be invoked by
> anything.** `ARCHITECTURE.md` §19f/§7 describe `bulk_reset` (`archive where is_baseline=false` /
> `restore where is_baseline=true`) as The Library's reset, and it is implemented in
> `lib/librarian.js` — but it is **not** in `library-write-intent`'s `traits.schema` operation enum
> (`["insert","update_status"]`), so Eleanor Voss — The Librarian cannot name it, and no file in
> `src/`, `api/`, or `scripts/` calls it either. Last executed 2026-07-02 (5 calls, all that day;
> `ai_activity_log`). Consequence: seed-corpus drift has no recovery path, and the CHI regression
> driver starts every run against whatever the previous run left behind. Fix: decide how it is
> reached — driver-invoked before a regression run, an operator action, or an exposed operation —
> then wire it. Deliberately **not** folded into `DAT-11`: that ticket stops the drift at the write
> path, this one restores from it.
>
> `DAT-11` stopped runs from corrupting the corpus, but nothing restores it — and runs do legitimately
> supersede baseline scenarios (Nordholm and Elevate Mobility were both superseded during the
> 2026-07-29 00:23–00:40 run), so run N+1 retrieves the superseding row where the designed case
> expects the seed scenario.

## Why it was retired

Three findings, all verified live 2026-07-29, none of which the original row had:

1. **The tag already exists.** `is_baseline = true` marks exactly the 20 seed rows and nothing else,
   seeded 2026-07-01. Nothing needed tagging; the tag needed *reading*. Retrieval keys on `status`
   and never looks at `is_baseline`, which is why a still-tagged row disappears when its status flips.
2. **One of the three proposed fixes was contrary to a locked decision.** "An exposed operation" —
   adding `bulk_reset` to Eleanor Voss — The Librarian's Intent enum — was excluded deliberately by
   `docs/kickoffs/v6.0.5-S-LIBRARIAN-04-eleanor-write-capability.md:39`: Demo Reset is
   human-triggered, "not something an agent's own reasoning should ever be able to decide to fire."
   The live enum on 2026-07-29 was `["insert","update_status","supersede"]`.
3. **The operator-control half was already filed.** `MI-08` (Feature) has carried "Demo Reset UI
   control ❌ Missing" since 2026-07-17.

The decisive objection was John's, stated twice: a regression run must not mutate working data.
Every reset variant — full `bulk_reset`, baseline-only restore, driver-invoked or operator-invoked —
fails that constraint, because they all achieve repeatability by writing to a shared store the live
demo screen reads from.

## Measurements taken while designing the replacement

Kept because they cost real queries and a future session would otherwise re-derive them.

**The Library, `apple-cso-data-room`, 96 rows:** 16 baseline-active, 4 baseline-superseded,
14 non-baseline-active, 50 non-baseline-archived, 12 non-baseline-superseded. All 20 baseline rows
retain their 2026-07-01 content and embeddings — the write path only ever PATCHes `status`.

**The 4 retired seed scenarios and what superseded each:** Vitrine Tech (Brazil) ← "CORRECTION —
Vitrine 40% Completion Rate" (2026-07-15); Nordholm Retail (EMEA) ← "Utilization Gap:
Process-Friction & Leakage Hypothesis" (2026-07-29 00:23); Elevate Mobility (India) ← "Staffing and
Training Pipeline Deficit" (2026-07-29 00:40); Horizon Store (Vietnam) ← "NPI Readiness Strong —
Scope-Narrowed Analysis" (2026-07-29 17:24).

**The 14 retrievable leftovers:** 2 test artifacts (`DAT-7 End-to-End Live Test — Loop-Closure
Confirmed`, `DAT-11 atomicity target`) + 12 agent-authored `consolidated` rows, of which **five are
near-duplicate restatements of one `upgrade-cycles` answer**, all created 2026-07-29. None is demo
content. See `DAT-8` (test artifacts) and `DAT-13` (accumulation).

**Every read path filters `status='active'`** — verified, all five: `match_the_library`,
`match_the_reasoning`, the catalog query at `lib/librarian.js:224`, and the two frontend hooks
`useDataSources()` / `useLearnedContext()` (`src/hooks/useAgents.js:217` / `:72`).

**`the_reasoning` has no `is_baseline` column** (only `status`, `data_room_tag`, `created_at` among
the relevant ones) and **no Skill points any capability at it** — 0 of the `skill_profiles` rows
reference it, against 4 that reference `the_library` (`ci-knowledge`, `hyp-knowledge`,
`eleanor-knowledge`, `eleanor-catalog-knowledge`). 81 active / 51 archived rows nothing reads.
Filed as `DAT-15`.

**Run duration and the concurrency window.** Owen Marsh — Proofreader's `qg-content-context-intent`
is called only by the regression driver, so its call clusters are runs. Eight clusters exist since it
shipped 2026-07-28; seven are spot-checks (3–12 judge calls, 0.3–44 min). One is large enough to be a
full-run attempt: **2026-07-28 18:07–20:22 CST, 134 minutes, 75 judge calls.** **No full 24-case run
has ever completed.** During that 134-minute window **38 commits landed on `dev`**, 3 touching
`src`/`api`/`lib`. `dev` took 11–30 commits/hour during working hours across 2026-07-27→29. Filed as
`SES-58`.

**`bulk_reset` usage, for the record:** 5 calls ever, all 2026-07-02 04:06–04:09 UTC, from its own
build test (`S-LIBRARIAN-02`). Against `librarian-write:insert` 105, `update_status` 51,
`supersede` 5.
