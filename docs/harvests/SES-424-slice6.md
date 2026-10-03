# SES-424 slice 6 — reasoning (not required reading for the build)

## The premise, revalidated 2026-09-20 against live Supabase and this clone (`cbcf75ec`)

- `decision_pattern_citations`: **0 rows**, platform-wide (`Prefer: count=exact`, `Range: 0-0` → `content-range: */0`). The table, the `decision_pattern_citations_weekly` view and `agent-log.js --patterns-applied` all shipped in `v7.0.537` (slice 5) and have never received a row.
- Nothing asks for them. `grep -c -- '--patterns-applied' docs/runbooks/runner-cycle.md` = **0**; same in `docs/runbooks/session-setup.md` = **0**. The three runbook `agent-log.js` blocks are at `runner-cycle.md:2101` (devmanager/run-project), `:2887` (designer/design-kickoff), `:3033` (builder/build-ticket); `session-setup.md:588` and `:614` are the attended-session pair from `SES-359`.
- The cost is visible in this very cycle: the Designer turn for slice 5's own kickoff is `ai_activity_log` id **48851**, `2026-09-20T22:16:20Z`, `call_source='session'`, `feature='design-kickoff:ds-kickoff-intent:depth0'`, model `claude-fable-5-1` — logged, and cited nothing, because the command the runbook prints carries no flag.
- Second half, 30 days (`created_at >= 2026-08-21`), session/executor: `design-kickoff` 67/0, `build-ticket` 53/0, `run-project` 32/0. The executor writes **no** citations — not because it refuses one, but because `logActivity()` (`lib/activity-log.js:84`), the only row writer on that route, has no citation path at all. Latent today for these three capabilities, live the moment any capability whose Intent schema carries `patterns_applied` runs through `api/capabilities/execute.js`.

Premise **alive** on both halves named by `v7.0.537`'s STOP LINE.

## Why the write rides `logActivity()` rather than a second writer

`scripts/agent-log.js` already owns a correct citation writer (`writeCitations`, read-back first, refusal exits 2 without unwriting the audit row). Standing a second one up inside `execute.js` would be the two-paths-compute-the-same-thing shape (pattern:14) and would drift. Moving the writer into `lib/pattern-citations.js` and calling it from the one place both routes already pass through — `logActivity()` — keeps the seam whole (pattern:15) and makes the executor's citation behaviour a property of the platform's single log writer, not of one route.

The chaining posture is not invented here: `LOG-121` already chains the org resolve onto the same `write` promise, after the POST, inside the single `waitUntil()`. The citation write takes that exact slot. Consequences, all intended: the audit row is issued first and is complete whether the citation write succeeds, fails or hangs; nothing on the request path awaits it; and the browser's ~600 rows a month never take the second request, because `patternsApplied` is empty for every one of the 45 existing call sites and the header stays `return=minimal`.

Best-effort on the executor, strict on the driver: `agent-log.js` is a command a runbook step runs and its exit code IS the finding, so a bad pattern number must refuse before anything is written. A model's answer is not a command — `coercePatternNumbers` drops junk and the turn stands (pattern:105; telemetry never breaks the product path).

## Why `session-setup.md` is in scope

The STOP LINE named the three `runner-cycle.md` commands. `session-setup.md:588`/`:614` are the same command in the attended-session home, and shipping the flag in one home and not the other is exactly the split this ticket exists to close (pattern:163 — one change, every home, one ship). Two extra insertions, no extra mechanism, no byte ceiling on that file (63,416 B, unpinned).

## The 296 B, verbatim, so nothing is lost

Removed from step 6 (196 B):

> Measured 2026-09-12 — 2 Designer and 1 Builder rows, all 2026-09-09 fixtures, across the 12 kickoffs written since — which is what an unlogged mandatory run looks like after three days.

Removed from step 6b (100 B):

> , and the Builder's half is the thinner of the two: **1** row on the whole log at the measurement

Both are dated measurements, not rules. Both are superseded by this kickoff's §2 counts (67 Designer / 53 Builder rows in the last 30 days), which is the live source the runbook should not be carrying a stale copy of (pattern:93). The rule sentences around them — "Exit 2 is a finding, not a nuisance", the `v7.0.530` optional-token-pair paragraph, and step 6b's "Exit 2 is a finding here for the same reason step 6 gives." — stay untouched. Net: 380,879 − 296 + 135 = **380,718 B**, 282 B under `SES-336`'s ceiling, and `ses-413d-questions-scoreboard.test.mjs:76` `BYTES_AT_SHIP` is re-pinned in the same commit because that test asserts the size **exactly**, not merely under the cap.

## Alternatives considered and rejected

- **Shorten the flag to `--patterns-applied=<csv>` and skip the byte removal.** 3 × 25 B = 75 B fits inside the 121 B of headroom, and it was tempting. Rejected: it leaves the runbook at 46 B of headroom, which makes the *next* step edit pay for this one, and `<csv>` does not say where the value comes from. The answer's own key name is the fact the operator needs.
- **A migration-backed backfill of the 152 uncited turns.** No: there is nothing to backfill from. Those answers' `patterns_applied` arrays were never persisted anywhere — the citation is a forward-only fact.
- **Wait for the executor to actually run one of these three capabilities before wiring it.** That is the split the STOP LINE already named as the remainder, and the wiring is ~6 lines on a path that is the platform's generic route (§19b). Deferring it means the first executor-run governance turn silently drops its citations and nobody notices, which is the same failure mode as the 0-row table.

## Not this slice

`SES-426`'s three standing dev-CI reds (`ses-84-claims-classed`, `ses-332-first-run`, `ses-415-role-tagged-criteria`) grade live board state, are filed, and are excluded from the baseline red set. The ticket's own two remaining halves — the authority matrix and the `prime_directive_queue()` exclusion pass that unblocks `SES-415`/`SES-416` — are its acceptance criteria and stay under `SES-424` (pattern:95).
