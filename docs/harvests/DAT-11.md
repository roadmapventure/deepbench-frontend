# DAT-11 (Data) — harvest

Detail moved out of `docs/FEATURES.md`'s `DAT-11` row 2026-07-29 (`S-DAT-11-design`, v6.3.223) per
`CLAUDE-DESIGN.md` step 9's 2,000-char row cap. **A move, never a delete** — every clause below was
verified present in the row at `git HEAD` before the row was trimmed. The row keeps a pointer here.

---

## Original discovery (`S-SES-29` root-cause findings)

**`is_baseline` exists but is unenforced — automated runs mutate the seed corpus.**

- 'Scenario — Signal Mobile' (`59eede59`, `is_baseline=true`) sat orphan-superseded with no
  superseding row — an instant retrieval hole (`match_the_library` filters `status='active'`) that
  broke case 8's designed comparison.
- 'Scenario — Nippo Carrier' was superseded mid-run.
- Supersession is non-transactional (`librarian.js` insert/`update_status` decoupled, `LOO-23`
  precedent) and the run minted residue rows `b88cf8cd` / `629f2184` / `85fa8d76`.

Original fix list: enforce `is_baseline` in `writeLibrary` update_status/supersede; restore
`59eede59`; clean residue; **rule on the ~51 archived caveat rows**; address supersession ordering.
Enforcement semantics (hard block vs gated) = John's call.

## Repair half — done 2026-07-29 (John approved)

Both wrongly-retired baseline rows restored to `active`: `59eede59` (Signal Mobile, a true orphan —
nothing ever superseded it) and `35f01679` (Nippo Carrier, retired mid-run by agent-authored
`b1daf789`). **Nothing deleted:** `b1daf789` keeps its content and stays active; its `supersedes_id`
was simply cleared so it no longer claims to retire a baseline row. **All 20 `is_baseline` rows are
active**, so the runbook §1 gate passes.

## Second defect — opposite direction (found with the repair, fixed by the enforcement half)

The promote chain also leaves the OLD row active when its status flip never lands, so **5 rows were
superseded-but-still-active** with both copies retrievable:

| Old row (`active`) | Title | `is_baseline` | Superseder |
|---|---|---|---|
| `94794176` | Scenario — Vitrine Tech (Brazil): Training Compliance Gap | true | `92131ed8` (itself `superseded` by `2e1c1f2c`) |
| `0d09ac6e` | Smartphone Upgrade Cycles by Country (2009-2026) | true | `01a3a549` — "DAT-7 End-to-End Live Test — Loop-Closure Confirmed" |
| `1c7104c5` | Scenario — Nordholm Retail Group (EMEA): Co-op Budget Underutilization Q3 | true | `b88cf8cd` |
| `b88cf8cd` | Nordholm Retail Group — Utilization Gap: Process-Friction & Leakage Hypothesis | false | `629f2184` |
| `fe58cadd` | Scenario — Elevate Mobility (India): Rapid Expansion | true | `85fa8d76` |

**Correction to the row's original wording:** these are NOT orphan/duplicate debris to delete — they
are real content rows whose status flip never landed, so the repair is *completing the flip*, never
removing content.

**Second correction, made 2026-07-29 (`S-DAT-11-design`):** the row said *"three of the five are
baseline rows"*. It is **four** — `94794176`, `0d09ac6e`, `1c7104c5`, `fe58cadd`. The row's own list
was right and its summary sentence was wrong; verified live by joining `the_library` to itself on
`supersedes_id` where the old row's `status = 'active'`.

## Enforcement semantics — decided 2026-07-29 (John)

**Gate, don't hard-block.** An agent may retire an `is_baseline` row, but only through an operation
that lands a replacement in the same transaction; a bare `update_status` may no longer retire one.

Why not a hard block, grounded in two facts verified this session:

1. `is_baseline` is the **Demo Reset marker** (§19f — `archive where is_baseline=false` / `restore
   where is_baseline=true`), not a permission flag.
2. §19c states *"Rows are never overwritten, only ever inserted — a correction always supersedes via
   a new row."*

A hard block would contradict locked architecture and would turn every legitimate correction — the
real Vitrine correction among them — into a permanent duplicate, which is the exact defect this
ticket exists to remove.

**Root cause, both directions unified:** supersede is two independent model-issued operations
(`insert` carrying `supersedes_id`, then a separate `update_status`). Either half can land alone.
Flip-alone produced the `59eede59` retrieval hole; insert-alone produced the five duplicate-live
rows. Atomicity fixes both. Live evidence of the asymmetry: 102 `librarian-write:insert` rows in
`ai_activity_log` against 43 `librarian-write:update_status`.

**Where enforcement lives, and why:** `lib/librarian.js` — the registered platform service **Library
Custodian** (`library-custodian`, layer `data-model`, `code_anchor: lib/librarian.js`). The invariant
is about one store's content model, so it belongs to the service that owns that store, not to the
harness. No harness file is touched.

**Known, accepted limit:** enforcement is at the write path, not the database. Direct SQL bypasses it
— including this ticket's own repair task. A cross-row trigger would be stronger but would block
legitimate admin repair; deliberately not built.

## Sub-items split out rather than dropped (2026-07-29)

- **`DAT-13` (Data)** — "rule on the ~51 archived caveat rows", carried unresolved in the original
  fix list. Measured live: **50** rows (`apple-cso-data-room`, `is_baseline=false`,
  `status='archived'`), created 2026-07-03 → 2026-07-28, **20 of them carrying a `supersedes_id`**.
  They accumulated over weeks, so they are not simply the residue of the 2026-07-02 `bulk_reset`
  runs. Split out so it cannot leak past `DAT-11`'s close-out.
- **`DAT-12` (Data)** — Demo Reset is unreachable.
- **`LOG-114` (Observability)** — `lib/librarian.js` hardcodes `agentId: 'eleanor'` at 17
  `logActivity()` sites.
