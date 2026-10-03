## Slice 5 — premise revalidation (v7.0.505, cycle 19552f33, 2026-09-16)

### The claim I was handed, and what the live check changed

The ticket is `partial`; four slices shipped (`v7.0.474`/`475`/`477`/`480`). The `kickoff_link`
(`v7.0.480`) is spent. That slice's own STOP LINE said the remainder was John's: apply
`docs/design/agt-79-ticket-owner-seed.sql` attended, run a judged night, then a landing slice.

**The seed has since been applied.** Queried live this cycle over `mcp__Supabase__execute_sql`:

- `public.capabilities` `slug='audit-board'` → 1 row: name `Audit Board`, `execution_type` `ai`,
  `default_intent_slug` `to-audit-intent`, `tenant_id` `global`.
- `public.agents` `id='ticketowner'` → The Ticket Owner, `code` GV-08, `lane` `governance`,
  `is_active` true. (Note for later sessions: this table has BOTH `id` and `code`; the seed keys on
  `id`, and a query filtering `code in ('ticketowner')` returns nothing and reads as "not applied.")
- `public.agent_capability_assignments` `ticketowner → audit-board` → 1.
- `public.capability_skill_profiles` for `audit-board` → 5.
- `public.skill_profiles` `slug like 'to-%'` → 5 (`to-identity`, `to-behavior`, `to-guardrails`,
  `to-knowledge-board`, `to-audit-intent`).

So the gate in `scripts/ticket-owner.js:879` no longer fails. Confirmed from the other side: part K
live of `tests/regression/agt-79-ticket-owner.test.mjs` branches on the row (L843-859) and the
baseline run prints `gate answered 3` — the exit-3 arm, which asserts the assembly succeeded, a
>1000-byte prompt printed and the state file written. `assemblePrompt` therefore resolves the
capability, the agent card and the `to-audit-intent` format contract end to end.

**But nothing has ever been judged.** `ai_activity_log` `agent_id='ticketowner'` → 0 rows.
`runner_cycles` with `notes like 'SCHEDULED-AGENT: audit-board%'` → 5; `ticket_owner_findings` → 217.
Five nights of arithmetic, zero judgments. The single cause is prose:
`docs/runbooks/runner-cycle.md` L2038 still reads
`node scripts/ticket-owner.js --nightly --cycle-id=<your cycle id>` — no `--judge`, no exit-3
ceremony, no fallback. The code is complete and unreachable.

**Conclusion: premise ALIVE, and the open scope is the landing slice only** — not "apply the seed"
(done), not the AVATAR_CFG/AGENT_PRONOUNS entries (`AGT-70` landed both at `src/data/agents.js:348`
and `:396` in `v7.0.485`), not the catalog entry (`shared/ai-patterns.js:272`, `v7.0.480`).

### What I checked and deliberately did not put in scope

- **The standing brief needs no change.** `nightlyNotes` already appends
  ` · judged <c>/<r>/<u> on <model>` when pass two supplies it, and the `Ticket hygiene, last night`
  group prints `runner_cycles.notes` verbatim rather than recomputing (`render-standing-brief.js`
  header, L11-17). A judged night surfaces with no frontend edit.
- **`--nightly --judge` composes already.** `judgePassOne` takes `nightly` and runs the
  once-a-night precondition BEFORE the capability gate (L863-872), so `already run today` still
  exits 0. `judgePassTwo` calls `recordNightly` under `nightly`. No code change is needed to fire
  the judged night — only the instruction to fire it.
- **The `agent-log.js` row is the script's own job** (pass two writes it first, §19k), so the step
  does not need a logging line of its own the way step 4d does.

### The constraint that shapes the slice

`docs/runbooks/runner-cycle.md` = **380,992 B**; ceiling **381,000** (`SES-336`), asserted twice
(`ses-336-runbook-orchestration.test.mjs:87`, `ses-400-b35-citation.test.mjs:49`). **8 bytes free.**
The step edit must free bytes first. The header carries exactly 5 stamps (606 / 2584 / 2423 / 3672 /
3229 B); session-hygiene check 7 holds the count at 5, so the `v7.0.505` stamp displaces the oldest
(`v7.0.467`, 3,229 B), which moves verbatim to `docs/SESSIONS.md` — precisely what the `v7.0.477`
stamp did for `v7.0.452`. That yields roughly 1.2–3.2 KB of working room depending on the new
stamp's length, which is why task 1 is "free the bytes first" and why the QA asserts `wc -c` twice.

`docs/runbooks/cycle-card.md` is a GENERATED view recording the runbook's `sha256`
(`render-cycle-card.js:169`, `SES-377`). That coupling is what makes the strongest available
discriminator: running `render-cycle-card.js` WITHOUT `--write` exits non-zero whenever the runbook
moved and the card did not. A cosmetic edit cannot pass it, and neither can a real edit that forgot
the card.

### Alternatives considered

1. **Also run the first judged night inside this build.** Rejected: it is a model call on the
   judgment lane and a write pass against the live board, which is step 4e's job on a later cycle,
   not a build's. It would also make the ship unreproducible.
2. **Put `--judge` behind a new runbook flag or a config row.** Rejected: one capability row already
   IS the switch (that was slice 4's design), and a second switch is a second thing to drift.
3. **Move `AGT-79` to `done` in this slice.** Rejected: nothing has been judged yet. The honest
   close-out is the first cycle whose step 4e produces a `ticketowner` log row; the STOP LINE says so.

### Baseline (unchanged tree `58accfc`, `/tmp/claude-0/baseline.txt`)

`node tests/regression/run-all.js` → exit 1, `regression suite: 232/233 passed`, and
`NOT A FULL RUN: 71 parts declared not-run across 55 tests`. Exactly one failure:
`[FAIL] agt-70-auditor.test.mjs -- the live corpus must report both detector bands; got: statements
4216 (governance 3392, agent-data 824, retired 264) duplicates 1 stale 1` (`SES-404`).
`agt-79-ticket-owner` and `agt-65-designer` both PASS here.

The Development Manager's brief said three suites were red, including `agt-79-ticket-owner`
(`SES-405`) and `agt-65-designer`. Measured, only one is. `SES-405`'s hardcoded allowlist is real —
`agt-79-ticket-owner.test.mjs` L793-806 pins `cycles-over-quote` to `LOG-143`/`SES-245` and the
derivable `type-off-taxonomy` set to `SES-131`/`SES-208`, both properties of today's board rather
than of the census — but it does not fire on this board today. Either way it is `SES-405`'s ticket:
the kickoff forbids editing part E and forbids greening `SES-404`/`SES-405` to make the ship pass.
