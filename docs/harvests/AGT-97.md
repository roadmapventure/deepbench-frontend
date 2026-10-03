# AGT-97 — reasoning harvest (v7.0.575, 2026-09-24)

Not required reading. Every fact a task depends on is in `docs/kickoffs/v7.0.575-AGT-97-w39-doc-corrections.md`.

## Premise: ALIVE. All ten corrections re-verified first-hand against `origin/dev` 95b4f100.

## Live measurements taken this session (read-only)

| What | How | Result |
|---|---|---|
| `skill_types` rows | PostgREST `select=slug,name&order=display_order` | **6**: identity, behavior, knowledge, intent, format, **guardrails** |
| `capabilities` rows | `Prefer: count=exact`, `Range: 0-0` | **44** (not 8, not the ticket's "33") |
| SES-286(a) function set | `pg_proc` join `pg_namespace`, six names | **six**, one overload each incl. `attach_before_images` |
| `resolve_day_token_cap()` rungs | `pg_get_functiondef` unnested | RUNG 4 `'calibrated'` (v_cal, guard='ok'); RUNG 5 `'uncalibrated-default'` over `coalesce(runner_day_token_allowance, 10000000)` |
| `runner_should_boot()` pickable CTE | same | `WHERE q.lane IN ('drain','selfbuild')` — directive lane excluded |
| `runner_model_lanes` | PostgREST | orchestrator/opus-5, judgment/fable-5-1, mechanical/sonnet-5 |
| `runner-cycle.md` size | `wc -c` | 380,253 B; `ses-336` ceiling 381,000; `ses-413d` `BYTES_AT_SHIP = 380253` (strictEqual, imported by `ses-424f`) |

## Three things the ticket gets wrong, and what the design does

1. **Item 9's "live 33" is 44 today.** Design points at the table rather than writing any number — writing 44 restales the sentence by the same mechanism that produced 8 and 33 (`pattern:93`, `pattern:35`). QA therefore asserts the number is ABSENT in both directions (`(8 rows)` → 0 AND `44 rows` → 0).
2. **Item 8's stale `skill_types` claim has FOUR homes, not two** — `~L420` ("only has 5 seeded rows"), `~L543` ("(5 rows, missing"), `~L1072` (five-type list), `~L2483` ("catalog is missing its"). Live `skill_types` is 6 with `guardrails` present, so the "Known drift" note IS the stale text and is deleted, not amended (`pattern:163` — one change, every home).
3. **Every cited line number has drifted 1–32 lines.** Every task anchors on quoted text; the kickoff says so in §1 and gives the grep string per row.

## A FOURTH thing the ticket gets wrong, found this session

**Item 5 names the wrong file.** It says "runner-cycle.md:3577: correct the v7.0.394 function count to what the migration defines." The migration defines **six** (`pg_proc`, above; `ses-286a` independently asserts "exactly 1 overload of each of the six functions"). The runbook already says six and is CORRECT. The drift is `docs/RUNNER-GOV-M6-REQUIREMENTS.md`'s amendment bullet, which names four plus one helper and omits `attach_before_images()`. Task 7 therefore edits the register, not the runbook. Editing the runbook as written would have been a no-op dressed as a fix (`pattern:89` — surface the discrepancy rather than implement the wrong string).

Consequence for the build brief's mandate 7: `runner-cycle.md` changes in **three** spots, not four. The cycle-card regeneration and the `BYTES_AT_SHIP` re-measure still apply unchanged.

## The guard-adjacency check, done per correction

AGT-94 died an hour ago because its kickoff verified the wrong invariant. So each of the ten was checked by finding every test that reads the file, then checking whether its anchors/regexes cover the span being edited.

- **Correction 10 (B21), confirmed directly:** `docs/governance/RULES-SNAPSHOT.md` L98 holds B21's registry statement. It ends at `Attended sessions route to Fable 5 as written.` `ses-313` part 3 collapses whitespace and asserts `govDoc.includes(statement)`, plus a wrong-date mutation control and `govDoc.includes("runner_model_lanes")`. The "Unverified precondition … continues on Opus 5." sentence is trailing prose **outside** that statement — safe, provided no word between `Route judgment-dense` and `as written.` moves and `runner_model_lanes` stays.
- **Correction 7 (`nothing_pickable`) is the one inside a guarded block:** runbook L177 sits in `ses-297`'s gate block (`**PRE-BOOT GATE — ONE QUERY` → `**0. Bootstrap.**`, L83–228). All nine of its clause regexes were read; none matches this line. The nearest, `the-skipped-tail-consequence-is-declared`, needs `/unbounded/i`, which lives at L223.
- `ses-411` pins M6-09 as a `governance_rules` fixture constant, not from the runbook.
- `SES-269` strips `^\s*//` lines before its "never shells out / never notifies" assertions, so a header-comment rewrite is invisible to them — but it also greps `/38\.97/` against the RAW source, and that literal is on L8, outside the edited span.
- `ses-308` slices step 8b but asserts only its exit-code sentences, the `--backlog-ids` clause and `includes("SES-308")`.
- `SES-205`'s before-image assertions read `scripts/tripwire-to-backlog.js`, not the runbook.
- `SES-147` grades the rendered briefing panel; `SES-136` slices regeneration step 4 only — neither reaches briefing-page.md's SES-147 contract paragraph.
- `AGT-44` reads `api/prompt/db-assembly.js`'s `SKILL_ORDER` and live `skill_types`; no test reads ARCHITECTURE's `skill_types` prose. `LOG-73` / `SES-008` slice other sections by their own markers.
- `ses-285` counts anchored rule **sections** in the M6 register; `ses-286a` slices the `M6-02` heading. The amendment bullet is neither.
- `ses-396b` / `agt-65` grade the live `ds-knowledge-environment` row against `--render`, which is why the row re-render must follow the register edit in the same ship.

## Baseline

`node scripts/baseline-red-set.js` over the eighteen tests above, on the unchanged tree: **0 red**. The eleven standing platform reds named in the brief were not re-run and are not in this set.

## Alternatives considered and rejected

- **Re-running the blank-box fixture** (ticket's own wording for item 1) needs a rolled-back write transaction. Reading `pg_get_functiondef` settles the same question with no write at all, and the cheapest variant that proves the claim wins.
- **Writing "44 rows"** into ARCHITECTURE: rejected; it is the same defect with a fresher number.
- **Amending the "Known drift" note** instead of deleting it: rejected; the note asserts a gap that no longer exists.
