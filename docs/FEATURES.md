<!-- DeepBench v7.0.113 | docs/FEATURES.md | SES-83 (d) cycle 2 — the trim: 285 ticket rows removed, authority is public.backlog_items (git copy: docs/backlog/BACKLOG-SNAPSHOT.md). Header, Feature ID Format, Type Taxonomy and the Priority Class legend are KEPT VERBATIM — they are cited by name and path across ~330 files. -->
# DeepBench v5.2 — Feature Inventory — NOW

> ## ⚠️ The rows have moved. This file is a legend, not a backlog.
>
> **As of v7.0.113 (2026-08-21, `SES-83` phase (d) cycle 2 — John's call: "Table is authority and
> files are no longer needed"), the authoritative backlog is the Supabase table
> `public.backlog_items`.** The 285 ticket rows that used to live below this legend were removed
> in that commit; `docs/FEATURES-NEXT.md` (23 rows) and `docs/FEATURES-LATER.md` (247 rows) were
> stubbed in the same commit. Nothing was lost — see **Where the rows are now** at the bottom of
> this file for the query, the git-committed copy, and the proof that ran at the moment of
> deletion.
>
> **What this file still is, and why it was stubbed rather than deleted:** the four sections below
> — the header note, `Feature ID Format`, `Type Taxonomy` and the `Priority Class` legend — are
> cited by name and path from `docs/runbooks/runner-cycle.md`, `docs/WORKING-WITH-JOHN.md` and
> roughly 1,210 references across ~330 files, and `DeepBench-Session-Init.md` fetches this file by
> raw GitHub URL from John's Claude.ai sessions. They are kept here, unchanged, as the canonical
> definitions. **Only the ticket rows left.**
>
> **One sentence below is superseded and deliberately left verbatim.** The `Priority Class`
> section states that work is selected `FEATURES.md` → `FEATURES-NEXT.md` → `FEATURES-LATER.md`.
> That file order was retired in `v7.0.112` (2026-08-21), when runner selection moved to a SQL
> query over `public.backlog_items`; `ARCHITECTURE.md` §19v carries the dated supersession and
> `docs/runbooks/runner-cycle.md` step 5 carries the query. **The priority *order* it describes —
> `P1 - Improves John's Skills` → `P10 - Tooling`, beta-marked first, then newest, then oldest —
> is unchanged and still governs; only the three-file traversal is gone.** John's approved wording
> is preserved as written rather than edited around.

> Status: ✅ Done | 🔶 Partial | ❌ Missing | — N/A
> Session: DONE = built | [ID] = assigned | S-future = not yet scheduled
>
> **Split 2026-07-07 into 3 files by priority (John's criterion, updated 2026-07-17 — same CI/MI scope, criterion re-worded/expanded): "Any enhancement for the CI page to work before showing to Apple, to keep from an architect's scrutiny or enduser frustration: from backend to frontend, that is task success rate, end-end q&a, speed, loop, harness, agent model, AI auditing/log, UX/UI, db data model cleanup or seeding, goes to Now. Anything for the CI page outside of the previous is Next, and anything not related to making CI successful goes to Later."** This file holds only **now** — read this one by default at design-session Step 1. `docs/FEATURES-NEXT.md` (other CI backlog) and `docs/FEATURES-LATER.md` (everything else) are read only when scoping work in those areas.
>
> **Beta definition + beta-gate execution queue** → `docs/BETA.md` (added 2026-07-28). When filing any new row, declare `Beta-gate (<bucket>)` or `Post-beta` in the row per that file's maintenance rules.
> **AI Services catalog** (14 services, 10 patterns, AI Audit sections, MCP surfaces, table schema) → `docs/AI-SERVICES.md`
> **Deliverable composition registry** (AI Services × Deliverables, sharing patterns, feedback loops, build order) → `docs/CAPABILITIES.md`
> **✅ Done rows archived:** if a feature isn't listed in any of the 3 files, check `docs/FEATURES-ARCHIVE.md` before assuming it's missing.

---

## Feature ID Format

**As of 2026-07-15, this legend governs existing IDs only — do not use it to assign new ones.** New IDs use `docs/SCREEN-INVENTORY.md`'s codes instead: screen-scoped items get `[SCREEN-CODE]-[NUMBER]` (`CHI`/`PRO`/`SPA`/`AGR`/`HOM`/`TMT`/`AIA`/`ABT`), non-screen platform-layer items get `[LAYER-CODE]-[NUMBER]` (`HAR`/`LOO`/`SCA`/`LOG`/`MCP`/`MKT`, plus `AG`/`SK`/`IN`/`FM`'s eventual replacement once `S-ARCH-COMPETENCY-MODEL-design` lands). **This line itself is already incomplete against `SCREEN-INVENTORY.md`'s fuller table (missing `DAT`/`AGT`/`SES`/`MOB`, all added there since) — added `SCA` here since it's this session's own work, not fixing the rest of the drift now.** Applies prospectively only — nothing below is renamed.

**As of 2026-07-21 (`SES-006`), the number half of a new ID is no longer picked by reading this file — it's claimed atomically from Supabase's `feature_id_counter` table.** See `CLAUDE.md`'s concurrent-sessions hard rule (the one added 2026-07-21, right after rule #8) for the exact claim mechanism. Never assign a new number by eyeballing this file's or `FEATURES-NEXT.md`'s/`FEATURES-LATER.md`'s/`FEATURES-ARCHIVE.md`'s highest existing row and incrementing it yourself — that's the exact race this fixes.

`[AREA]-[NUMBER]` (legacy, existing IDs only)
Areas: `SH`=Shell, `DB`=Dashboard, `AW`=Assign Work, `TI`=Task Instructions, `AZ`=Analyzer, `FT`=Fetch, `RO`=Roster, `PE`=Personnel File, `TC`=Teach, `TT`=Test Team, `AI`=AI Infrastructure, `AG`=Agent Identity, `LA`=Landing, `DL`=Deliverables, `WO`=Work Order, `IN`=Intent, `FM`=Format, `SV`=Service, `SK`=Skills & Capabilities, `MI`=Market Intelligence, `AA`=Agent Architecture

**This is now the only copy of the area index.** It used to be duplicated in `docs/FEATURES-LATER.md`, which was stubbed in v7.0.113 (2026-08-21) — that copy is gone, and the list above is the surviving one. It was already the fuller of the two (`SCA` appears here and never appeared there).

---

## Type Taxonomy

**Added 2026-07-08 (John's explicit call) — every row in this file and `docs/FEATURES-NEXT.md` gets a `Type` tag, so backlog items can be scanned/prioritized by kind, not just read one at a time.** When logging a new item, assign the type that actually fits — invent a new one (add it here) rather than force a row into a type that's close-but-wrong. Keep this list short; don't create a type for a single one-off row if an existing one is defensible.

| Type | Means | Doesn't mean |
|---|---|---|
| **Task Success Rate (TSR)** *(renamed from "Continuity" 2026-07-17 — the old name collided with the unrelated "Data continuity rule" in `ARCHITECTURE.md`'s migration section; same underlying concept, no change in meaning)* | A question fails to reach a complete, correct answer without human intervention — either because it's routed to the wrong agent along the way, or because the chain stalls/hangs/dead-ends/errors out instead of finishing at all (John's bar, 2026-07-16: "a question can get answered fully non-stop... the message is fully routed among all correct agents"). Covers both "wrong agent picked" and "right chain, but it never actually completed." **Spans all 5 architecture layers, not just the Loop** (`ARCHITECTURE.md` §1: Product Focus Area/Screen, Loop, Harness, Platform Services, Data Model) — a TSR-breaking failure can originate in any one of them: a Screen-level UI bug that strands a user, a Loop misrouting, a Harness pipeline defect, a Platform Services/logging gap that hides a failure, or Data Model content bad enough to break an answer. Asking "what are the top TSR issues" should surface all of these together, not just agent-routing bugs. | Not "it completed correctly but slowly" (that's Speed — see `AA-170`'s 2-minute ship-target verdict, already met) and not "the underlying data is thin" (that's Data). |
| **Speed** | How fast routing/response happens end to end — latency, wasted calls, redundant work. No correctness question. | Not a tooling gap that merely helps *measure* speed (that's Observability). |
| **Architecture** | A structural/governance rule violation or infra constraint (broker/ownership patterns, `ARCHITECTURE.md` LOCKED sections) — not necessarily producing a wrong answer today, but a compliance or scaling risk. | Not every code-quality nit — routine cleanup is Tech Debt. |
| **Feature** | Net-new capability or roadmap work. Nothing is broken; it just doesn't exist yet. | — |
| **Tech Debt** | Cosmetic drift, duplication, or non-blocking cleanup — safe to defer indefinitely without user-visible impact. | Not a live bug a user could hit today. |
| **Data** | The seeded Data Room / demo content itself is thin, ambiguous, or insufficiently sourced — the code and routing are behaving correctly given what they were handed. | Not a code fix — the fix (if any) is content curation. |
| **Observability** | Instrumentation/tooling that helps diagnose other issues (e.g. latency tracing) — doesn't fix anything itself. | — |
| **UI** | A layout, visual, or interaction bug/gap in how a screen renders or behaves — no agent routing or backend logic involved. | Not Tech Debt (this is a live, user-visible bug, not deferred cleanup) and not Feature (fixing existing broken behavior, not adding new capability). |

---

## Priority Class (`P1`–`P10`) — how a row gets picked

**Added 2026-08-20 (`SES-80`, John's mapping accepted from the briefing page). Named form made
canonical 2026-08-20 (John, `design-runner-gov-0820`): a priority class is always written named —
`**P10 - Tooling.**`, never a bare `P9` — in rows, briefings, and chat alike; John should never
have to memorize the digits.** Every open row carries its class at the head of its description
cell. The class is `ARCHITECTURE.md` §19v's priority order, and it is how a session (and the
Automated runner) selects work: `FEATURES.md` → `FEATURES-NEXT.md` → `FEATURES-LATER.md`, and
`P1 - Improves John's Skills` → `P10 - Tooling` within each file; within a class, beta-marked
tickets first, then newest filed, then oldest (John, 2026-08-20). **Renumbered 2026-08-20
(John, `design-runner-gov-0820`): a new P1 was inserted at the top and every original class
pushed down one (old P1–P9 → new P2–P10).** Classification authority is delegated: Claude
assigns every class including P1–P4, grounded in the vision corpus (`SES-84`) and
`docs/JOHN-DECISION-PATTERNS.md`; John governs after the fact via the briefing's
Accept / Reverse / Rework (§19v).

| Marker | Means |
|---|---|
| `**P1 - Improves John's Skills.**` | Features that showcase and grow John's frontier AI / agentic-engineering skill and make him more hireable, especially for FAANG-level AI roles. The platform is his living portfolio. |
| `**P2 - Inventive.**` | New inventive features — white space, competitive differentiation. |
| `**P3 - Investor Value.**` | New features that add investor / buyout value. |
| `**P4 - New Customers.**` | New features that win new customers. |
| `**P5 - Enhancements.**` | Enhancements to existing features. Flagged on ship (§19v). |
| `**P6 - Agent Enhancement.**` | Extend existing agents to perform across the platform. |
| `**P7 - Agent Creation.**` | A new agent when functionality requires a competency the bench lacks. |
| `**P8 - Determinism Removal.**` | Harness and platform services become model decisions. |
| `**P9 - Bug Fixes.**` | Non-blocking bug fixes. Ships live. |
| `**P9 - Bug Fixes · FLAGGED.**` | A bug fix whose correction **moves pixels on an approved surface** — §19v routes that to a default-off flag, never a bare live ship. All `UI`-typed rows are born this way. |
| `**P10 - Tooling.**` | Session / governance / tooling work. Ships live. |
| `**P-GATED**` | The gated lane — terminology, LOCKED sections, schema-destructive migrations, §19e-owned writes, active-agent edits, the four harness files. **Deliberately not a digit**, so no cycle can read it as "the backlog ordered me to pick this." No trust rung ever unlocks it. |

**Assignment provenance (updated 2026-08-20).** The original mechanical mapping (approved as a
table, applied by script) is, in renumbered form: `Tooling→P10 - Tooling`,
`Task Success Rate→P9 - Bug Fixes`, `Speed→P9 - Bug Fixes`, `UI→P9 - Bug Fixes · FLAGGED`.
Every other class is assigned by Claude from the ticket's description + type under the
delegated authority above — the pending full sweep over the ~420 unclassed tickets is part of
the `design-runner-gov-0820` automation effort; P1–P4 assignments surface on the briefing for
John's after-the-fact Accept / Reverse / Rework. An unclassed row still means *nobody has
decided yet* and is unpickable.

---

## Where the rows are now

**Authoritative store:** `public.backlog_items` in Supabase (project `rallojeqnkgtxgsdsnqm`).
Read it with SQL; never re-derive the ordering by hand — the canonical selection query, with the
four live traps it has to survive, is quoted verbatim in `docs/runbooks/runner-cycle.md` step 5.

**Git-committed copy:** `docs/backlog/BACKLOG-SNAPSHOT.md`, regenerated at every runner ship point
by `scripts/export-backlog-snapshot.js` and committed when it changes. It is the table's offline
and point-in-time-recovery copy (the backup gap `SES-81` identified), so `git log` on that path is
a durable history of the board. Its generating script's `parseDocument()` is the reference reader
and restores the file to the exact table contents.

**Where each file's rows went**, as verified at the moment of deletion (v7.0.113):

| Was | Rows | Now in the snapshot under |
|---|---|---|
| `docs/FEATURES.md` | 285 | `## tier now — docs/FEATURES.md` |
| `docs/FEATURES-NEXT.md` | 23 | `## tier next — docs/FEATURES-NEXT.md` |
| `docs/FEATURES-LATER.md` | 247 | `## tier later — docs/FEATURES-LATER.md` |

555 rows in, 555 rows out. The `tier` column preserves which file a ticket came from, and
`row_ordinal` preserves its position — including the duplicate `CHI-48`, which appears twice in
the old `FEATURES.md` and twice in the table.

**Filing a new ticket.** Insert a row into `public.backlog_items` — do not add a row here; there
is no table below to add it to. Claim the ID atomically from `feature_id_counter`
(`.claude/skills/session-setup/SKILL.md` §3b), never by reading the highest existing number. The
Heal engine already files this way (`source_file = 'heal-engine'`). Wiring the remaining capture
paths to the table is `SES-83` phase (e), the last of the five cycles.

**`✅ Done` rows** are still archived in `docs/FEATURES-ARCHIVE.md`, which this trim did not touch.
