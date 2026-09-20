# SES-424 slice 5 — every governance answer names the patterns it applied; the cycle card can be re-pinned (SES-416 parts 2-3, matrix row 1)

Designer's reasoning for `docs/kickoffs/v7.0.537-SES-424-patterns-cited.md`. Not required reading for the build.

## Premise revalidation (measured 2026-09-20, cycle 427ae6db)

- The three output contracts are not a `format` Skill: `capability_skill_profiles` for design-kickoff / build-ticket / run-project carries no `format`-typed link. The schema each executor call and each session sub-agent is handed lives on the INTENT rows' `traits.schema` (`ds-kickoff-intent` 3203e5c9, `bd-build-intent` 4798a3aa, `dm-run-intent` dcd5b6ae; `traits` keys: `schema, can_request_help`). `api/prompt/db-assembly.js` injects `account` post-hoc (`injectAccountField`, line ~110) and `scripts/agent-prompt.js` `renderFormatContract` prints the post-injection schema — which is why the assembled prompt lists `account` although the rows' `required` do not.
- None of the three has `patterns_applied` (`has_pa = false` on all three); the assembled prompts grep 0/0/0 for `"patterns_applied"`. Premise for SES-416 (2): **alive**.
- No citation object exists (`information_schema.tables ilike '%citation%'` → none); `ai_activity_log` rows with `call_facts ? 'patterns_applied'` = 0. In the last 30 days the three capabilities logged 150 rows, every one `call_source = 'session'` (0 executor rows) — so `scripts/agent-log.js` is the write path that matters today, and the executor path (`lib/activity-log.js` from `request-receivable.js`) is deliberately left alone: widening `api/` for a path with zero rows is the "widen the shared harness when a data-level change suffices" mistake (pattern:8). Premise for SES-416 (3): **alive**.
- `render-cycle-card.js --sync-knowledge` reads `current` (card 8,637 B, pin `04144e4dd059e9a7`), so `--repin` is a missing mechanism, not a live drift. On drift the script exits 1 and says the repair is "an UPDATE over an active agent's Knowledge … under a ticket that names it" and offers no command. `MANAGER-AUTHORITY-MATRIX` row 1 (decision b84e133d, kind `rule`, unreversed) settles who: the Builder, under the ticket whose edit moved the card, in that commit, as an agent-row decision with a full-row image. Premise **alive**.
- SES-415's branch commit `270cf139` is not an object in this clone (`git cat-file -t` fails), so nothing is cherry-pickable; the re-pin path is written fresh against the shipped `--sync-knowledge` code.
- `decision_patterns`: PK `pattern_no`, 172 rows, `anon` holds no grant. `ai_activity_log.id` is `integer`; `capture_migration_down()` handles `kind: "view"` (its source names it). `record_decision` signature confirmed: `(p_cycle_id uuid, p_session_name text, p_kind text, p_backlog_id text, p_summary text, p_reasoning text, p_ladder_work_class text)`.
- Gate: `agent-row-gate.js --ticket=SES-416 --action=edit-active` → BUILD (scope_origin john-named; `update` is not an action the gate knows — `create | edit-active | activate`). SES-416 is `removal proposed`, `defer_status = yes`, `blocked_by` = SES-415's uuid; the folded status is unchanged by this slice.
- `scripts/run-project.js` (line ~507/707) validates the manager's answer with `validateAgentVerdict` against the LIVE Intent schema, and that validator enforces `required` (`scripts/verifier.js` ~1033). So `tests/regression/agt-68-devmanager.test.mjs`'s `GOOD_ANSWER` must gain `patterns_applied: []` or the test reds after the row write. `agt-65`/`agt-66` assert `required` by `includes`, not equality — no pin edit there. `ses-376` clause (E) checks other keys only.
- Runbook: 380,879 B against the 381,000 ceiling (`ses-336-runbook-orchestration.test.mjs`, `SIZE_CEILING_BYTES`). The three `agent-log.js` commands sit at runbook lines 2101, 2887, 3033; adding ` --patterns-applied=<answer.patterns_applied>` to each is ~120 B — over the headroom without a byte removal, and the prior stop line said no runbook byte. That wiring is the named remainder, not a discovery.

## Alternatives weighed

- **Inject `patterns_applied` in `db-assembly.js` like `account`.** One code change for every capability — but it would require the key of every agent, not the three the ticket names, and it is an `api/` change where three imaged data rows suffice (pattern:8, pattern:65, `.claude/rules/capabilities-are-data.md`). Rejected.
- **`patterns_applied` as an `int[]` column on `ai_activity_log`.** One column, no new table — but it cannot carry a foreign key per element, so an invented pattern number would land silently; and a citation row per pattern is what the ticket says ("records each citation"). A table with `references decision_patterns(pattern_no)` makes the library the structural validator (pattern:10) and cascades away with its log row. Chosen.
- **Optional vs required `patterns_applied`.** The ticket's "every answer names the patterns it applied … may be empty" is required-with-empty-allowed. Optional would let the key silently vanish from answers and the count would read as "no patterns applied" rather than "not asked". Required.
- **Citations written inside `logActivity()`.** Would serve the executor path too, but that path has 0 rows for these capabilities in 30 days and the edit is in `lib/`/`api/`. Left for a slice with executor rows to cite.
- **`--repin` self-healing on every `--sync-knowledge`.** Explicitly what the shipped code refuses (a silent side effect of a render over an active agent's Knowledge). `--repin` stays an opt-in flag that owes `--cycle-id` and `--ticket` and one decision handle.
- **Proving `--repin`'s write arm live.** No drift exists and creating one means writing an agent row for a test. The test proves the refusal ladder (exit 1 → 2 → 2, nothing written, pin unchanged) from a temp tree with a one-byte-edited card, and `repinPlan()` offline; the PATCH path mirrors `render-role-patterns.js --write-rows`' UPDATE branch (full-row image first, PATCH, read back).

## Patterns leaned on

pattern:2 (the contract is data, the row is the edit), pattern:8, pattern:10, pattern:16 (the view is self-maintaining), pattern:17 (extend `agent-log.js` and `--sync-knowledge` rather than stand up new scripts where an existing one fits), pattern:65, pattern:95 (SES-416's own sentences: rows, contracts, citations, view), pattern:140 (the weekly view buckets in America/Chicago), pattern:162, pattern:163, pattern:168.

## Not done, and why

- The runbook wiring of `--patterns-applied` (byte headroom 121 B) — remainder.
- Executor-path citations — 0 rows to cite; a later slice.
- SES-397/402/408/417 stay folded; John's three items sit on `3264939c`/`ea320689`.
- SES-426 (the standing red `ses-84-claims-classed`) is not touched; nothing here depends on it, and the baseline set is chosen so it is not in it.
