# SES-423 slice 3 — harvest: the reading is a delta, and the exact strings the build edits

Design cycle `a6af8e56-573d-42b9-8d2d-a686a325d484`, v7.0.532, 2026-09-20. Measured against `/home/user/deepbench-frontend` @ `b0669903` (branch `session/cycle-20260920-0751`, = `origin/dev`) and live Supabase over PostgREST with the service key, plus one `mcp__Claude_Code_Remote__get_session` call from this session. Nothing here is recalled.

## The premise, revalidated first-hand

The slice-2 rule (`runner-cycle.md:4139-4146`, `v7.0.531`) reads `get_session` twice and charges `est_tokens_dev` = reading 1. `get_session` counts the whole SESSION: this session was created 06:40:52Z and has run two cycles. Measured:

| when | what | tokens |
|---|---|---|
| 07:48Z | `fd4e11f4` reading at close (its `est_tokens_dev`; `est_tokens_qa` NULL — reading 1 was never taken because the rule shipped after its Builder returned) | 32,249,570 |
| 07:51:34Z | `a6af8e56` (this cycle) INSERTed, same session, same `stamp`, `trigger` chained | — |
| ~08:00Z | `get_session` from this cycle: input 1,864 + output 227,106 + cache_read 47,605,577 + cache_write 773,891 | **48,608,438** |

So under the shipped rule this cycle's reading 1 would be ≥ 48.6M and `est_tokens_dev` would re-charge the 32.25M its predecessor already closed with; every further link of the chain re-charges everything before it. Step 3's day sum (`:1328`, `est_tokens_dev + est_tokens_qa` for today against `resolve_day_token_cap()` = 196M) would then hit its wall on double-counted spend — a false `did_not_run`, the same class of false alarm as the stall push this ticket exists for. Premise alive.

**Chosen: a third reading at the row's INSERT (step 1), stored on the row (`tokens_at_open: <sum>` in `notes`), and both columns charged as deltas — dev = reading 1 − reading 0, qa = reading 2 − reading 1.** Alternatives:

- *A new `tokens_at_open` column.* Cleaner to query, but a migration (down-capture, grants that fail closed for new columns, `.claude/rules/supabase-column-grants.md`) for one number that only its own row's close-out reads. `notes` already carries `tokens_basis: get_session` by the same rule; the close-out reads it back from the row (B18: never from the cycle's memory — a compaction between step 1 and step 9 would lose it otherwise). Not the cheapest variant.
- *Reading 0 := the predecessor's reading 2.* Works only for continuations, needs the predecessor to have taken one, and the first cycle of a session would still charge the session boot. One rule at one point (the INSERT, which a continuation re-enters at step 1 per `:4555`) covers both shapes.
- *Reset the session per cycle.* Not available: the chain runs in one session by design (`:4539`).

What it does not do: the spend between session boot and the first INSERT (the routine prompt, step 0's runbook reads, ~48 KB of anchors in `fd4e11f4`'s notes) is charged to no cycle. Stated, small, and in the right direction — under-count, never a re-charge. `fd4e11f4`'s own row stays as written: 32,249,570 is that cycle's true whole-session figure (first cycle of the session) with `est_tokens_qa` NULL and its notes saying why.

**This cycle closes under the delta rule with reading 0 := 32,249,570** — the predecessor's close at 07:48Z stands in for the reading this cycle did not take at 07:51Z (a 3-minute gap: the tail and the chain gate), and the notes say so. QA C in the kickoff — `est_tokens_dev` < 32,249,570 on this row — is the discriminating live check: the session-total rule cannot produce a number below the predecessor's close.

## The ceiling, and the pins that move with the edit

`runner-cycle.md` = 380,399 B; ceiling 381,000 (`ses-413d:73`, `agt-79:827`, `ses-385b:161`); `ses-413d:74` pins the exact byte count; 5 stamps (`agt-70:1015`, `ses-413d:170`, `ses-423b:165`); **`ses-423b:166` pins `stamps[0]` to the `v7.0.531 … slice 2` stamp**, so the new stamp reddens `ses-423b` until that pin moves — the same in-commit re-pin `ses-413d`'s `BYTES_AT_SHIP` needs. Stamp rotation: line 5 `v7.0.516` (899 B) out, verbatim into `docs/SESSIONS.md` after `:13947` (`v7.0.505`). `SES-164` step 2 by grep over lines 6+: `runner_staff_findings` 0, `v7.0.472` 0; `staff-watch` 7, `assignment mismatch` 1, `check-kickoff` 1, `over-cap refusal` 1, `(7d)` 1, `promote --apply` 1, `runner_card_asks` 3, `skill-edit` 1, `v7.0.462` 1, `graded_sha` 3, `7a-bis` 2, `ship_handoff_census` 1, `gradedShaFor` 1, `ses345_verdict_graded_sha` 1. Two facts relocate (S5).

Byte budget: −899 + 483 (S1) + 408 (S2) + (730 − 416) (S3) + (105 − 65) (S4) + 163 (S5) = +509 → **380,911 B predicted**, 89 B under the ceiling; the kickoff's bar is ≤ 380,950. Hard-wrapping swaps a space for a newline and keeps the count.

Card coupling: the runbook's sha256 is on `docs/runbooks/cycle-card.md` line 1, so any edit re-renders the card (`render-cycle-card.js --write`) and drifts `skill_profiles.dm-knowledge-cycle-card` (`traits.source_sha256`, currently `f7508efbd4648fe7`). `--sync-knowledge --apply` refuses a DRIFTED row by design (`render-cycle-card.js:361`, exit 1 before the apply branch); the repair is the shape `v7.0.531` used under decision `06bd3e74`: `record_decision` (kind `agent-row`, `SES-423`) → full-row `runner_before_images` (`table_name` `skill_profiles`, `pk_value` `a3c42311-25da-431f-b96c-59ce2df53cd6`) → PATCH `traits` → read back → `--sync-knowledge` reads `current`.

## The exact strings (tasks 1–4 and §7 name these)

**S1 — stamp, line 1 (483 B):**

```
<!-- DeepBench v7.0.532 | runbooks/runner-cycle.md | SES-423 slice 3 — A READING IS A DELTA, NEVER THE SESSION TOTAL: `get_session` counts the whole SESSION and a drain chain runs many cycles in one (`fd4e11f4` closed at 32,249,570; its continuation opened on that counter), so step 1 takes reading 0 at the INSERT (`tokens_at_open` in `notes`) and step 9 charges deltas. `v7.0.516` moved VERBATIM to `docs/SESSIONS.md`, two ZERO-hit facts RELOCATED; count 5. Guard `ses-423b`. -->
```

**S2 — step 1, inserted after `leaving \`outcome\` NULL until close (the check constraint has no in-progress value; found live, SES-78c).` at `:617` (408 B, leading space included):**

```
 **Reading 0 (`SES-423`, `v7.0.532`): at this INSERT call `mcp__Claude_Code_Remote__get_session` (`session_id` omitted), sum the four `external_metadata.usage` fields and write `tokens_at_open: <sum>` into this row's `notes` — the counter is SESSION-cumulative and a chain runs several cycles in one session, so step 9 charges only the growth from here. Tool unavailable → `tokens_at_open: unmeasured`.**
```

**S3 — step 9, `:4139-4146`. Replace this (416 B):**

```
call `mcp__Claude_Code_Remote__get_session` with `session_id` OMITTED, twice — when the Builder returns (before 7a) and again here. One reading = `input_tokens + output_tokens + cache_read_tokens + cache_write_tokens` of `external_metadata.usage`; `est_tokens_dev` = reading 1, `est_tokens_qa` = reading 2 − reading 1; write `tokens_basis: get_session` in `notes`. Tool unavailable → both NULL, never a number)
```

**with this (730 B):**

```
call `mcp__Claude_Code_Remote__get_session` with `session_id` OMITTED, three times — reading 0 at step 1's INSERT (`tokens_at_open`, read back from this row's `notes`, never from memory), reading 1 when the Builder returns (before 7a), reading 2 here. One reading = `input_tokens + output_tokens + cache_read_tokens + cache_write_tokens` of `external_metadata.usage`; `est_tokens_dev` = reading 1 − reading 0, `est_tokens_qa` = reading 2 − reading 1 — DELTAS, never a session total, because the counter is SESSION-cumulative and a chain runs many cycles in one session (`v7.0.532`). Write `tokens_basis: get_session` in `notes`. A missing reading NULLs each column it feeds; tool unavailable → both NULL, never a number)
```

**S4 — step 3, `:1340`. Replace `All token figures are estimates and are always labeled estimated.` (65 B) with (105 B):**

```
Meter-derived token figures are estimates, labeled so; a cycle row's `est_tokens_*` is measured (step 9).
```

**S5 — relocation, appended after `NEVER a Skill edit this cycle performs:**` at `:4418` (163 B, leading space included):**

```
 (`runner_staff_findings` held ONE hand-written row when this caller shipped at `v7.0.516`, the ship that DROPPED the `v7.0.472` stamp on the `v7.0.462` precedent)
```

**S6 — `docs/ARCHITECTURE.md`. At `:2692` replace `All token figures are estimates, always labeled estimated;` with:**

```
Meter-derived token figures are estimates, labeled estimated — a cycle row's `est_tokens_*` is a measured per-cycle `get_session` delta since `v7.0.532` (`SES-423`);
```

**and insert after line 2 (545 B):**

```
# Amended v7.0.532 | 2026-09-20 | cycle-20260920-0751 (runner) — SES-423 slice 3: §19v's subscription-tokens bullet no longer says every token figure is an estimate. A cycle row's `est_tokens_dev`/`est_tokens_qa` is measured from `mcp__Claude_Code_Remote__get_session` as a PER-CYCLE DELTA (reading at the row's INSERT subtracted from the reading at close), because that counter is session-cumulative and a drain chain runs many cycles in one session; the meter-derived figures (`tokens_per_pct`, allowances) stay estimates and stay labelled.
```

**S7 — the John ask, `runner_card_asks` (`target_kind` `item`, `target_id` `SES-423`, `asked_at` now, before-image `row_data = NULL`), `question` verbatim (788 B):**

```
When a sub-agent turn ends the harness reports ONE combined token figure and no input/output split, so its `ai_activity_log` row lands `input_tokens`/`output_tokens` NULL/NULL — unmeasured, never free (SES-423 slice 1; this cycle's own Designer/Builder rows are such rows). Should `scripts/agent-log.js` accept `--total-tokens=N` and store it in a NEW nullable `ai_activity_log.total_tokens` column, leaving `input_tokens`/`output_tokens` NULL so the AI Audit's By-Service and cost views — which read those two columns — keep their meaning? Recommendation: yes, as a new column; never written into `input_tokens` (that fabricates a split). Answer yes/no on this card: yes files a Tooling ticket for the column, the flag and the audit's read of it; no keeps NULL as the honest value.
```

Why an ask row and not a task: it is a data-semantics decision with an audit blast radius (slice 1's harvest, `docs/harvests/SES-423.md:66`), and John rules on it; `runner_card_asks` is where the platform already puts a runner→John question (`0ca06470`, SES-394, answered). It is not a `gated_before_build` card, so `settle-ship.js` trigger 3 does not fire on it.

## The observations slice 2 owed

- *First close-out under the measured rule:* `fd4e11f4` — one reading, `est_tokens_qa` NULL, 32,249,570 where every shipped row since 2026-09-18 read ≤ 900,000. Observed; the rule as shipped was a partial measurement on its first row and a double count from its second, which is this slice.
- *A build > 20 min with no false push:* no build has run under the `heartbeat` key yet — slice 2's own Builder was creating the script. This cycle's build is the first; task 7 reads the row's own `heartbeat_at` / `last_step` before the push and QA B applies probe (d)'s arithmetic to it. Whether a peer sweeps during it is not controllable and is reported when seen.
- *`tokens_per_pct` from measured rows:* the newest `runner_usage_readings` (`679fe162`, 07:51Z, `routine-self-read`) still carries `tokens_per_pct` NULL — the calibration only runs on a delta between two readings, and no measured window has closed yet. Nothing to read; not owed.

## SES-380 and SES-385, dead — the mechanics

Both rows are already `status = 'removal proposed'` (consolidation write, `updated_at` 2026-09-19T01:39:34Z, `defer_reason` "Folded into SES-423 …"). What step 6 rule 2 (`:2891-2894`) still owes is the evidence card and the 7b decision; no `runner_items` card names SES-380, and SES-385's two cards are its own ship cards. Evidence, re-measured: `tests/regression/SES-177-claude-state-renderer.js:2` — "The whole-file bar (`state.length < 6000`, v7.0.228) is RETIRED"; `CLAUDE-STATE.md` 4,938 B; the guard measures the skeleton (< 3k), bounded by construction (`SES-381`, `v7.0.470`, `done`). `SES-385`: `settle-ship.js` (`v7.0.519`) and the census (`v7.0.524`) shipped; rows carrying `design_status = 'designed'` today by status: open 6, removal proposed 4, partial 4 — none `done` or `delivered`.

## Scope note

Caps 18 files / 19 tasks; the slice uses 6 files / 8 tasks. Baseline red set 1 of 12 — `SES-177`, ledger drift since `b0669903` (this cycle's claim moved the ledger the renderer reads); 7a re-renders before grading (`SES-213`). Standing red on `dev` since 2026-09-16 is `SES-426`'s. Model: `claude-opus-5`, the session Builder on the orchestrator lane — runbook prose under a byte ceiling with test pins moving in the same commit is not mechanical-lane work.
