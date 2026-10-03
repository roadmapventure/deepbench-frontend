<!-- DeepBench v7.0.536 | harvest | SES-424 slice 4 — measurements, alternatives and the premise argument; the kickoff carries every fact a task depends on -->

# SES-424 slice 4 — the three governance agents read the decision patterns tagged for their role (SES-416 part 1)

## Premise, revalidated live (2026-09-20, cycle afb03aa3)

- The eight folded tickets, read live: all `removal proposed`, `defer_status = yes`, `queue` NULL — none is pickable, so consolidation's stated purpose (stop re-picking) holds. `blocked_by`: SES-378 → SES-377 (done); SES-397/402/408 → SES-378; **SES-415 → NULL**; SES-416 → SES-415; SES-417 → SES-416. The ticket's "SES-415/416 formally block each other" is no longer true on the board: only the 416 → 415 edge remains. What remains of the deadlock is its artifact — card `489e7554` (`gated_before_build`, SES-415, undecided, 2026-09-18): "Mining pass 2 is built and proven but cannot ship until SES-416 settles who may re-pin the cycle card." Slice 2's `MANAGER-AUTHORITY-MATRIX` row 1 (decision `b84e133d`, unreversed) settled exactly that.
- SES-415's substance is live: `decision_patterns` 172 rows (171 + reserved pattern:0), every row tagged — `applies_to ov {designer,all}` 137, `{builder,all}` 93, `{manager,all}` 74, `{verifier,all}` 68; `node scripts/export-decision-patterns.js --check` → "no drift — 171 criteria match", source `v7.0.515`. Rows 162-171 are the ten SES-415 lessons (card `07911fd7` shipped 2026-09-18).
- SES-416's finding is still true: `node scripts/agent-prompt.js --agent=designer --capability=design-kickoff` renders 10,222 B, `--agent=builder --capability=build-ticket` 6,167 B, `--agent=devmanager --capability=run-project` 16,126 B; `grep -c decision_patterns` = 0/0/0; pattern 163's imperative `One change, every home, one ship.` 0/0/0; pattern 167's `The staff decide` 0/0/0. No governance Skill row (`capability_skill_profiles` for the three capabilities: 6 + 5 + 6 links, all `ds-/bd-/dm-*`) mentions the library. Premise **alive** for SES-416 part 1; **dead** for the mutual-block lead as a queue problem.
- Commit `270cf139` (session/cycle-20260918-0941), re-verified: `git diff HEAD 270cf139` still differs on `docs/JOHN-DECISION-PATTERNS.md` (+147/-48), `docs/runbooks/session-setup.md` (+22), `scripts/export-decision-patterns.js` (+18, the role-coverage audit), `tests/regression/ses-415-role-tagged-criteria.test.mjs` (+220); `git merge-tree` reports "changed in both" on `SESSIONS.md`, `cycle-card.md`, `runner-cycle.md`, `session-setup.md`. The ses-415 test on dev is RED on criterion 170 (a quote that drifted when SES-382's `defer_reason` was overwritten) — SES-426's. Not cherry-picked: the runbook edit needs bytes the file does not have (380,879 of 381,000 B) and its rows are already live.

## Why this slice, per byte, on the last cycle of the day

144.85M of the 196M day cap spent; the five chain cycles cost 22M-32M each; one cycle fits. Candidates ranked by what one cycle can finish:

1. **SES-416 part 1** (taken): the pipeline's first missing link — three inline Knowledge rows rendered from the tagged library, one script, one test, four one-line pin edits. Everything it needs exists: the tags, the `--write-row` precedent (`check-environment-facts.js`), the sibling-inherited model config (`render-cycle-card.js`), the agreed-ticket gate (`SES-416.scope_origin = 'john-named'`; `agent-row-gate.js --ticket=SES-416 --action=create` → BUILD, exit 0; for SES-424 the same call prints GATED, scope_origin NULL). No runbook byte, no model call.
2. Retiring card `489e7554` rides along (one decision, one image, one PATCH): matrix row 3 gives gate cards to the manager unless the subject is one of John's calls, and this card's subject is answered by row 1. Its reasoning names what the branch still holds so nothing is silently dropped.
3. SES-408 (the staff watch appends environment facts): needs a classifier — a model call per filing — plus a caller in `staff-watch.js`; judgment-lane spend on the day's last cycle, and its QA needs the watch to see a filing. Deferred.
4. SES-397 / SES-402 / SES-417: each hangs on SES-402's finding-decision rows (the manager ruling fix-now/later/John before each pick), which is a multi-cycle build. Not startable in one.
5. SES-378 / SES-413: their shipped slices stand (8 + 4); John's three items are on card `3264939c`; the reversal question on `ea320689`. Nothing to build.

## The rows — sizes measured, not estimated

Rendered offline from the md with the kickoff's RENDER (header + `## section` + `- pattern:N — imperative`): designer 136 `- pattern:` lines / 19,392 B (sha `92f8773215637af2` with a placeholder version — the real one differs by a few bytes); builder 92 / 13,373 B; manager 73 / 10,839 B. Pattern 163 present in designer and builder, absent in manager; 167 present in manager only — that pair is the discriminating grep. Imperatives only, bodies stay in the md by number: pattern 168 ("a fresh agent's reading has a byte budget") is why, and `ROW_BYTE_CAP = 24,576` makes the script refuse rather than grow. Existing Knowledge rows for scale: `dm-knowledge-cycle-card` 8,470 B, `ds-knowledge-standard` 1,339 B, `ds-knowledge-environment` 1,954 B, `pz-knowledge-john` 1,105 B (the one prior row that cites patterns, by number in `traits.patterns`). The three prompts grow to roughly 30 / 20 / 27 KB.

Alternatives rejected: (a) rendering from the live table — the md is the tag's one home and `--check` already pins live = md, so an offline render is testable without credentials and cannot disagree with the export; (b) one row for all roles — the role tag is the whole point, and 172 imperatives is past the budget; (c) a code branch in `db-assembly.js` reading `decision_patterns` by agent — forbidden by `.claude/rules/capabilities-are-data.md`; (d) extending `export-decision-patterns.js` — its header says it is the only writer of `decision_patterns` and nothing else; a Skill-row writer is a different target, so a sibling script that imports its parser keeps one parser and one writer each.

## Gate and undo

`AGENT-ROW-AGREED-TICKET` (§19v P6): SES-416 carries `scope_origin = 'john-named'` (John 2026-09-16) and its build item 4 names "the three agents' row edits" as build work; John approved folding it into SES-424 on 2026-09-18 (every folded row's `defer_reason`). The decision in task 2 is recorded under SES-424 (the ticket being built, as slice 3's `4666c6bd` was) and names SES-416 in its reasoning. `reversible_tables()` includes `skill_profiles`, `capability_skill_profiles` and `runner_items` (ses-364 test L70-71), so every image here is one `reverse_decision()` can act on; `row_data` NULL on the six INSERT images means the undo is a DELETE.

Link-count pins that move with the rows: `agt-65-designer.test.mjs:82` (`SKILL_SLUGS`, 6 → 7), `agt-66-builder.test.mjs:65` (5 → 6), `agt-68-devmanager.test.mjs:125` (6 → 7), `ses-378d-manager-skill-rows.test.mjs:80` (`LINKS_AFTER` 6 → 7). Slot 7 is free on all three (`design-kickoff` 1-6; `build-ticket` 1,2,3,4,6; `run-project` 1-6). Baseline over those four plus `ses-396b`, `ses-004`, `ses-415`: 1 of 7 red (ses-415, SES-426's).

## Lanes and the verifier

`scripts/verifier.js:1490` `kickoffLaneFinding()` requires a line containing `Lanes` and a colon with `session|executor|none`, and when `executor` appears, `executor` followed within 8 non-word chars by `none` or a `$` band. This kickoff's `- **Lanes:** session (the Builder's own calls); executor none; no API dollars.` returns `null` (run this cycle over the draft).

## Not taken

- SES-416 (2) `patterns_applied` on the three output contracts and (3) citation rows via `agent-log.js` + a per-agent weekly view: the next slice, once the rows exist to cite.
- `--repin` in `render-cycle-card.js`; the 270cf139 residue (runbook step 7b sentence, session-setup §3d clause, the ses-415 test's role-coverage arm) — re-file only with runbook bytes and after SES-426 settles the test.
- SES-424's own `supports_class`: the Prioritizer's `classify-ticket` pass; SES-426 owns `ses-332`/`ses-415`/`ses-84`.
