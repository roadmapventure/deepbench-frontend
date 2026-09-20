# SES-423 slice 2 — harvest: the four runbook items slice 1 deferred, measured, and why each takes the shape it takes

Design cycle `fd4e11f4-711d-4c2e-b159-522887f73f11`, v7.0.531, 2026-09-20. Measured against `/home/user/deepbench-frontend` @ `ba01e42` (branch `session/cycle-20260920-0641`, = `origin/dev`) and live Supabase over PostgREST with the service key. Nothing here is recalled; every number was read this cycle.

## Premise, item by item

| Item | Verdict | Measurement |
|---|---|---|
| SES-412 (false "stalled" push) | **alive** | 13 `stall_notified_at` rows all-time; 9 ended `shipped` — see A |
| SES-409 second half (measure, don't guess) | **alive, and the gap is ~17x, not 6x** | see B |
| Flag text at `:2090/:2873/:3014` | **alive** (true-but-misleading since v7.0.530) | see C |
| SES-380, SES-385 | **dead** (slice 1's §D/§E stand) | `CLAUDE-STATE.md` 3,558 B; 0 closed rows `designed` |

## The ceiling is the first task, not a footnote

`docs/runbooks/runner-cycle.md` = **380,976 B**. Four tests read that number:

- `tests/regression/agt-79-ticket-owner.test.mjs:827` — `< 381_000`, plus `:833` spawns `scripts/render-cycle-card.js` with no flag and requires exit 0 (the committed card carries the runbook's sha256).
- `tests/regression/ses-385b-settle-ship.test.mjs:161` — `<= 381000`.
- `tests/regression/ses-413d-questions-scoreboard.test.mjs:159` — `<= 381000`; **`:163` asserts `bytes === BYTES_AT_SHIP` (380976) exactly**; `:170` asserts 5 header stamps. So any runbook edit at all reddens `ses-413d` unless `BYTES_AT_SHIP` (`:73`) is updated in the same commit — its own header (`:24-27`) says a later editor "will read THIS file to learn what it may spend", which is the intended path.
- `tests/regression/agt-70-auditor.test.mjs:1015` — exactly 5 stamps; `:1016` requires the rotated `v7.0.446` stamp to be verbatim in `docs/SESSIONS.md`.

Header stamps today (line: bytes): 1: 282 (`v7.0.520`), 2: 890 (`v7.0.519`), 3: 897 (`v7.0.517`), 4: 899 (`v7.0.516`), **5: 2,579 (`v7.0.505`)**. Retiring line 5 under `session-hygiene.md` check 7 (keep the newest, move the retired one verbatim to `docs/SESSIONS.md`, relocate any warning that exists nowhere else) frees 2,579 B. `SES-164` step 2 run by grep over lines 6+: `ingestJudgment` 0, `OUTCOME_MAX` 0, `GV-08` 0, `ai-patterns.js:272` 0, `217` 0 — five facts to relocate into step 4e (the step the stamp protects, `:2030`). Already in the body: `--nightly --judge` (1), `--answer=` (3), `SCHEDULED-AGENT: audit-board` (1), `capability_skill_profiles` (1), `v7.0.467` (1), rule (4)'s "re-run `--nightly` alone" (present across a line wrap).

The retired stamps for this file live in `docs/SESSIONS.md` around `:13940-13946` (`v7.0.438`, `v7.0.446`, `v7.0.452`, `v7.0.467` in that order); `v7.0.505` goes after `v7.0.467`.

Byte budget, stated so the Builder can check itself: −2,579 (stamp out) + ≤700 (new stamp) + ≤300 (4e relocation) + ≤250 (0b sentence) + ≤350 (step 7 heartbeat) + ≤440 (step 9 net) + ≤226 (fence brackets + step 6 sentence) = **≤ −313 B net**, landing near 380,660. The kickoff requires net ≤ −24 so the file ends `< 381,000` with margin.

Card coupling: the three flag fences are 248/252/245 B, under `FULL_BLOCK_MAX` 400, so they are copied byte-identical onto `docs/runbooks/cycle-card.md` (`ses-377` asserts this). Editing them changes the card; `node scripts/render-cycle-card.js --write` regenerates it and `--sync-knowledge --apply` re-pins `public.skill_profiles.dm-knowledge-cycle-card` (`ses-378d:175` reads that pin live). The body never names `--sync-knowledge` (grep 0), so the kickoff does.

## A — SES-412: the signal is the Builder's own progress

`runner_cycles` with `stall_notified_at IS NOT NULL`, all time, 13 rows: 9 `shipped` (`v7.0.465/467/469/471/473/502/504` and two more), 4 `failed`. The two the ticket names: `0e57cedd` started 03:16:50Z, notified 03:53:12Z, ended 03:58:17Z `shipped v7.0.502`; `4a19bc9a` started 03:58:32Z, notified 04:43:29Z, shipped `v7.0.504` at 05:09:50Z. Mechanism as filed: `:404-408` has the orchestrator heartbeat "at every numbered step boundary", and step 7 is one boundary that holds a whole build; no script under `scripts/` or `lib/` mentions `heartbeat` at all.

**Chosen: the Builder heartbeats at kickoff-task boundaries through a new `scripts/cycle-heartbeat.js`, carried into the build as the `heartbeat` key of step 7's `--task` JSON plus a one-line opener.** Why this and not the alternatives:

- *Raise (d)'s threshold when `last_step` says step 7.* Rejected: `SES-104` pins probe (d)'s SQL clause-for-clause (`tests/regression/SES-104-heartbeat-basis.js:70-90`), and a longer window is still a guess about how long a build is — v7.0.530's build ran 45 minutes.
- *Orchestrator heartbeats while it waits (background sub-agent + bounded wait).* Viable and named by the ticket, but it proves only that the orchestrator is alive, not that the build is; it also changes how every cycle runs its sub-agent. Deferred; the Builder's own signal is stronger and cheaper.
- *Confirm a stall via `get_session(status)` before pushing.* `runner_cycles` has no session-id column (`stamp` carries the trigger id, not the session), so this needs a schema change. Not the cheapest variant.
- *A new column or a `stall_watchdog()` change.* Neither: probe (d) and the watchdog already share `coalesce(heartbeat_at, started_at)`, and a Builder heartbeat lands in that same column, so both readers stay in agreement by construction (the `SES-104` invariant).

What it does not do: a single kickoff task that runs longer than 20 minutes still trips (d). That is the honest residue and the stated 20-minute rule; slice 3 observes one long build under the new step 7 before closing.

Why the instruction is a `--task` key AND an opener line: the executor's TASK DETAILS renderer prints every task key (this cycle's own Designer prompt shows `ticket:`/`version:`/`cycle_id:`/`caps:`/`worktree:` rendered that way), so the command reaches the prompt as data (§19b, never hand-built); the opener is the one sentence that makes it an instruction rather than a value. No Skill row is edited (a Skill edit is John's, `SES-378` slice 6).

## B — SES-409: one tool call, two readings

`mcp__Claude_Code_Remote__get_session` with `session_id` omitted, called from this cycle at 07:05Z (started 06:42Z): `external_metadata.usage = {cache_read_tokens: 14871913, cache_write_tokens: 337357, cost_usd: 12.83, input_tokens: 560, output_tokens: 59240}` — 15,269,070 tokens 25 minutes in, sub-agent turns included. The 15 shipped rows since 2026-09-18 read `est_tokens_dev` 180,000–900,000 and `est_tokens_qa` NULL–330,000 (v7.0.530 itself: 340,000/60,000). The three hand-corrected rows from the SES-409 finding day (`v7.0.508` 26M/6M, `v7.0.509` 45M/8M, `v7.0.511` 25M/5M) prove the ticket's warning — "the NEXT cycle will guess again" — every row after them guessed again.

**Chosen: two reads, sum of the four token fields, dev = read 1, qa = read 2 − read 1, basis named in `notes`, NULL when the tool is unavailable.** Alternatives:

- *One read at close, split by ratio.* Rejected: a ratio is the estimate the ticket forbids.
- *Input side only (as the 2026-09-16 correction did).* Rejected: `output_tokens` is real spend and the meter (`runner_usage_readings`) is calibrated by `tokens_per_pct` = Σ cycle tokens ÷ meter delta (`:1088`), so any consistent basis calibrates; four fields is the complete one. Field names are the tool's (`cache_read_tokens`, `cache_write_tokens`), not `ai_activity_log`'s.
- *A script that reads it.* Not possible: `get_session` is an MCP tool of the session, not a REST endpoint the clone can reach with its keys.

Consequence, stated: step 3's day-ceiling sum (`:1326`, `resolve_day_token_cap()` at 196M) will now see ~15–25M per cycle instead of ~0.5M. That is the ticket's point ("every pacing decision ... made against a number no cycle measured"), not a regression; slice 3 reads the first `tokens_per_pct` computed from measured rows.

## C — the flag text

Slice 1 (`v7.0.530`) made an omitted token pair legal in `scripts/agent-log.js` (both NULL) while a lone flag or a bad value still exits 2. The three runbook fences still print `--input-tokens=N --output-tokens=N` unconditionally, and step 6's prose (`:2878-2882`) explains exit 2 without saying the pair may be omitted. Bracketing the pair costs 2 B per fence; one sentence after `:2878` carries the rule once (step 7's `:3018` already defers to step 6). A comment line inside each fence was the alternative (+~210 B) — rejected on bytes alone.

## D — what "report SES-380 and SES-385 dead" means mechanically

The consolidated ticket's own text says the prior rows "remain on their own rows (status removal proposed)". `SES-380` is `open`, `SES-385` is `partial` on the board today. Step 6 rule 2 already defines the dead-premise path (`status = 'removal proposed'`, a card carrying the evidence, `recompute_backlog_queue()`, recorded as a 7b decision). The STOP LINE routes both through it; the Builder writes no status.

## E — why slice 2 of 3, not 2 of 2

Every item slice 1's STOP LINE named is built here. What cannot be proven inside this cycle: (1) a row closed under the measured rule exists only after this cycle closes; (2) a build > 20 minutes with no false push needs a later cycle to run one while peers sweep; (3) the deferred `--total-tokens` question is John's, and belongs on a card. Slice 3 is those three observations and the `delivered` close. `settle-ship.js` reads `slice 2 of 3` and writes `partial`.

## Scope note

Caps 18 files / 19 tasks; the slice uses 6 files / 9 tasks — one runbook, its generated card, the SESSIONS appendix, one 80-line script, one new test, one constant in `ses-413d`. Baseline red set: 0 of 8. Pre-existing red on `dev` (`ses-332-first-run`, `ses-415-role-tagged-criteria`, `ses-84-claims-classed`) is not this slice's.
