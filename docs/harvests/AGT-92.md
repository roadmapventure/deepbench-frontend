# AGT-92 — harvest: the scope-cap baseline and its three candidate homes

Not required reading. The kickoff (`docs/kickoffs/v7.0.570-AGT-92-scope-cap-one-home.md`) carries
every fact its tasks depend on.

## Premise revalidation (alive)

Read first-hand from `public.governance_rules` 2026-09-24, all five `status = 'live'`:

| id | source_group | canonical_doc |
|---|---|---|
| `HR-SCOPE` | claude-md-hard-rules | `docs/STANDARDS.md#section-2-session-scope-rules` |
| `CAP-SCOPE-FILES` | standards-caps | `docs/STANDARDS.md#section-2-session-scope-rules` |
| `CAP-SCOPE-TASKS` | standards-caps | `docs/STANDARDS.md#section-2-session-scope-rules` |
| `OD-32` | operational-defaults | `docs/design/2026-09-09-operational-defaults-census.md#OD-32` |
| `OD-33` | operational-defaults | `docs/design/2026-09-09-operational-defaults-census.md#OD-33` |

Four restate the literal numbers (`HR-SCOPE`, `CAP-SCOPE-FILES`, `CAP-SCOPE-TASKS`, `OD-33`); four
state the per-rung widening (`HR-SCOPE`, `CAP-SCOPE-FILES`, `CAP-SCOPE-TASKS`, `OD-32`) — union five,
as the title claims. The home conflict is verbatim:

* `CAP-SCOPE-FILES`: *"The baseline is CLAUDE.md's hard rule; the extra is the class's, read at pick
  time, never assumed."*
* `OD-33`: *"… canonical: `docs/runbooks/runner-cycle.md` step 5a for the baseline,
  `public.class_autonomy()` for the extras."*

Both written homes exist: `CLAUDE.md:57` (*"Scope: One feature per session. Max 3 files. Max 4
tasks."*) and `docs/runbooks/runner-cycle.md` step 5a (*"READ WHAT YOUR CLASS EARNED"*, which names
the baseline 3 and 4).

## The third home, which the ticket does not mention

All three standards/hard-rule rows also carry `canonical_doc =
docs/STANDARDS.md#section-2-session-scope-rules`. So a fix that rewrote only `statement` would leave
`CAP-SCOPE-FILES` pointing at CLAUDE.md in its prose and at STANDARDS.md §2 in its column.

Two senses of "home" are in play and only one of them is free to move:

1. the **`canonical_doc` column** — a registry convention. For the OD group it is pinned to
   `<census>#<own id>` by `ses-234-operational-defaults.test.mjs` clause
   `2-canonical-doc-points-at-its-own-anchor`; moving it would break that test and the census's own
   shape. For the three standards rows it already reads STANDARDS.md §2.
2. the **home the statement names in prose** — the one that actually disagrees.

The fix therefore edits prose only, and asserts the column did *not* move.

## Why STANDARDS.md §2 wins over runner-cycle.md step 5a (the ticket's suggestion)

* `tests/regression/ses-122c-class-caps.test.mjs` exports
  `HR_SCOPE_HOME = "docs/STANDARDS.md#section-2-session-scope-rules"` and asserts `HR-SCOPE`'s
  `canonical_doc` equals it (clause `hr-scope-is-re-homed-off-claude-md`), and asserts all three
  statements appear **byte-for-byte** as statement lines in §2 (clause
  `caps-equal-their-canonical-home`). Choosing step 5a means rewriting that test and reversing
  SES-122 (c)'s shipped M6 ruling, which deliberately re-homed `HR-SCOPE` *off* CLAUDE.md because
  CLAUDE.md is John's file and a cycle may not edit it.
* §2's own prose already says: *"The registry is authoritative and this section is its home: edit the
  row, re-export `docs/governance/RULES-SNAPSHOT.md`, then reconcile the line here."*
* Step 5a never claims canonicality — the word `canonical` appears **zero** times inside the step
  (measured by slicing the step and grepping it).
* Cost: `docs/runbooks/runner-cycle.md` is 380,253 B against SES-336's 381,000 B ceiling, and editing
  it drags in `docs/runbooks/cycle-card.md` (generated from it) and `ses-413d`'s `BYTES_AT_SHIP`
  (imported by `ses-424f`). Three extra artefacts for a home that the tests already disagree with.

Declined too: the ticket's *"Reduce CAP-SCOPE-FILES/CAP-SCOPE-TASKS to … with no numbers."* §2's
numbered rules 2 and 3 **are** those two rows' byte-for-byte canonical text, so stripping the numbers
from the rows means stripping them from §2 — against §2's own note that rules 1–3 are the rows'
canonical text, and against the ticket's own *"The numbers do not change."*

## Rows NOT edited, and why

`HR-SCOPE` and `CAP-SCOPE-TASKS` name no doc home at all; `OD-32`'s `canonical: that column, read by
public.class_autonomy()` is the *extras'* home and is correct. Editing them would be churn with no
contradiction behind it (pattern:65).

## Rendered blocks

`grep -rn "{{rule:(HR-SCOPE|CAP-SCOPE-FILES|CAP-SCOPE-TASKS|OD-32|OD-33)}}" --include=*.md .` →
zero matches. `scripts/render-rule-blocks.js` only verifies or repairs a block already committed
under a marker, so it has nothing to repair here; it is run as a control, not as a step.

## Baseline red set and the peer collision

`node scripts/baseline-red-set.js --tests=ses-280,ses-234,ses-285,ses-122c` on the unchanged tree:
3 of 4 red. Diagnosed rather than inherited — a row-vs-census comparison of all 44 OD rows names the
drift as **`OD-04`, `OD-19`, `OD-42`**, i.e. peer cycle `39b052ce` / `AGT-91`, which amends those rows
and regenerates the same `docs/governance/RULES-SNAPSHOT.md`. `OD-32` and `OD-33` match the census
byte-for-byte today. `export-governance-snapshot.js --check` reports the on-disk snapshot stale
(`changed: true`) for the same reason; `MODEL-LANES-SNAPSHOT.md` is unchanged.

Consequence for the build, carried into the kickoff: fetch/rebase first, regenerate the snapshot
*after* that rebase, and never diff against the snapshot the build started from.

## Alternatives considered

* **Give the baseline a column** (`runner_settings.scope_cap_files/tasks`) — rejected: it is DDL, it
  contradicts `OD-33`'s accepted M6 design (*"held in NO column"*), and the ticket says the numbers do
  not change.
* **Delete the restatements from `runner-cycle.md` and `CLAUDE.md`** — rejected: CLAUDE.md is John's,
  and step 5a's restatement is what a cycle actually reads mid-run (pattern:93 points at the source
  rather than removing the reader's copy).
* **Fix `CAP-SCOPE-FILES` only** — rejected: `OD-33` is the row that states a canonical home in the
  clearest terms, so leaving it would leave the disagreement intact.
