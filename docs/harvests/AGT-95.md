# AGT-95 — why one of the ticket's three fix-clauses was not done

The audit paired `runner-cycle.md:786` ("`unverifiable` and `refused` rows are counted and reported,
**never written**") against `session-setup.md:741` ("`restored_unverified` is a table with no
`updated_at` column: the row was written"). Live line numbers are 852–856 and 818–823. These
describe **two different engines**, so there is no contradiction to retire.

**Decisive measurement**, `pg_get_functiondef` over the live project (re-run independently by the
orchestrator before the kickoff was accepted, same three numbers):

| function | def length | contains `restored_unverified` | contains `decided_at` |
|---|---|---|---|
| `reverse_decision()` | 30,578 | **yes** | **yes** |
| `apply_data_restore()` | 6,960 | no | no |
| `plan_data_restore()` | 5,918 | no | no |

The 852 passage sits under "A REVERSE ON A `ship` CARD PUTS THE PROVABLY-SAFE ROWS BACK" (816) and
the `apply_data_restore()` call at 825 — it is the auto-rollback path, and "never written" is John's
constraint 2 for that path.

The asymmetry is deliberate and already on record:
`docs/kickoffs/v7.0.394-SES-286a-reversal-window.md:25` — tables without `updated_at` are "restored
and reported as `restored_unverified`, because a John-initiated reversal is his explicit word,
**unlike the auto-rollback path where doubtful rows are never written**".
`docs/kickoffs/v7.0.404-SES-315-ship-reverse.md:55` — "Keep `plan_data_restore()`'s
doubtful-rows-are-never-written rule." SES-315 therefore did **not** retire this path.
`runner-cycle.md:810–813` retires only the *surface* (`SES-285`, 2026-09-01) and states "cards
already filed can still be tapped, and for one of those the call below is still the right and only
apply."

**Ruling: marking 852 RETIRED IN PLACE would introduce a factual error into the runbook.** Left
untouched (pattern:89, pattern:94). The ticket's prescribed fix was wrong on this clause; it is
scoped out with evidence rather than dropped silently, and overriding it would need a deliberate
call from John.

**Consequence for scope — a better outcome than fitting the edit in.** `runner-cycle.md` is not
edited, so the 747 B of headroom under `SES-336`'s 381,000 B ceiling is not spent,
`ses-413d-questions-scoreboard.test.mjs:96`'s `BYTES_AT_SHIP = 380253` needs no re-pin and no ledger
comment, and `docs/runbooks/cycle-card.md` needs no re-render — `scripts/render-cycle-card.js:611`
reads only `runner-cycle.md`. Nothing competes for the remaining bytes.

**Stale line numbers found** (the fifth ticket running to carry them): `runner-cycle.md:786`→852
(66 lines), `session-setup.md:579`→589 (11), `:741`→818 (77), `:365`→390, `:400`→410,
`runner-cycle.md:3475`→3665, `:3486`→3676, `:3577`→3580. Only `gate-review.md:152` was accurate.

**Peer check** (run because AGT-93's kickoff proposed editing a live peer's in-flight lines and only
this query caught it): `runner_cycles where ended_at is null` returned
`7c9157e9-0b87-4c2b-a940-bc9a167bc29f`, `last_step = '7 — builder: full suite'`, heartbeat
2026-09-24 06:36Z. Its `item_id` is NULL and it has zero `runner_items` rows, so **its ticket could
not be identified**. The kickoff therefore instructs a fetch/rebase and a re-read of both edit sites
rather than asserting no collision. That unidentifiability is itself a small observability gap —
a cycle at step 7 should be attributable — and is noted here rather than filed, per one-item scope.

**Baseline (step 3b):** `node scripts/baseline-red-set.js --tests=ses-286b-decision-runbooks,
ses-364-reverse-agent-rows,ses-413d-questions-scoreboard` → all green, red set 0 of 3. No existing
clause guards either surviving fact, which is why the QA adds three clauses to the existing
`ses-286b` clause table (pattern:17) rather than standing up a new file.

**Alternative considered and rejected:** adding a disambiguating clause at 852 naming
`apply_data_restore()` explicitly. Rejected — it spends ceiling bytes to fix a reading the enclosing
block already makes unambiguous, and would trigger the full re-pin/re-render chain for prose value
(pattern:65).
