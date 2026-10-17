# RCA: why the directives are not running (read-only investigation, 2026-10-17)

Nothing was built or changed. Every simulation ran inside a transaction that was rolled back, against the live database.

## One-sentence answer
The first directive finished building on 2026-10-12 but can never be marked finished, because "delivered" tickets have no working exit to "done"; an exclusive drain holds the whole build queue until its members are done, so every later directive waits behind it.

## The chain (what made it break)
1. **Origin, 2026-09-14 to 09-29.** The ship gate graded on the whole regression suite with no trustworthy baseline. 217 block verdicts against 54 approvals (80% blocked). A blocked ship is written `delivered` and carded; by design "a block finalises nothing" (record_ship_decision refuses it). Block rate has since fallen to about 28% (13 blocks, 34 approvals since 10-06), but the pile stayed.
2. **No owner for a block.** The only exits for a blocked delivery are a ratifying decision dated after the verdict, John's Accept, or the CI-based regrade lane. The regrade lane needs a green dev CI (red since 09-29, AGT-304) and a cohort ticket. Nobody rules blocks, so they sit. Today: 144 tickets `delivered`, 96 under a block (95 of them regression-red), 98 older than 14 days, oldest 08-31.
3. **Approved ships have no reliable exit either.** The one automatic exit is a `ship` decision that finalises after a 72-hour window. `record_ship_decision` is a separate step after the push that cycles can skip. Of 144 delivered tickets, 15 have a ship decision, 95 only a `ticket-status` decision (which the sweep never closes), 34 none. Even the 5 approved members of the old drain (AGT-450, 452, 453, 455, 456) have no ship decision.
4. **The finaliser could not have fixed it anyway, then wedged.** In the 15 clean days before 10-05 it finalised hundreds of decisions but closed about 10 tickets. Since 10-05 one refused ticket (AGT-281: ship decision, then a later block verdict) aborts the whole all-or-nothing sweep (AGT-423). 3,578 decisions are past expiry.
5. **A drain retires only on `done`, is exclusive, and is read oldest-first.** The old drain (11db3e2d, 9 members, all delivered) is "blocked, 9 delivered and waiting on your Accept". AGT-456 (built 10-10) made it exclusive, so the pick stopped falling through to other work. The drain function never looks past a blocked oldest drain, so the two new drains (AGT-480..494) are never reached.
6. **Nothing noticed.** No agent checks "is anything pickable, can any drain retire, did a ticket reach done this week". Each of the Auditor, Development Manager and Victoria saw one piece.

## Common or one-off? Common.
- August: SES-285 retired the Accept tap and "sixteen rows sat there" with no exit; SES-320 added the ship-decision exit. Same class, same symptom.
- 09-14 to 09-29: about 217 blocked ships.
- Now: 144 delivered. Any drain whose members need a human exit will freeze the board the same way, and any blocked ship that already has an open ship decision (like AGT-281) can wedge the sweep again.

## Simulations (rolled back, real functions, live data)
- **F1, sweep with per-row fault isolation (what AGT-423 does):** 14 tickets close (incl. AGT-433 and AGT-454), 1 refused (AGT-281). Old drain still blocked, 7 of 9 open. AGT-423 alone does NOT free the board.
- **F2, F1 plus approved ships close at ship:** the 5 approved members close. Old drain still blocked, 2 of 9 open.
- **F3, F2 plus the 2 blocked members (AGT-434, AGT-451) ratified by a decision dated after their verdict:** old drain retires; the Platform Reliability drain picks AGT-480 (queue 459); `should_boot` reads true, pickable 1.
- Conclusion: the new directives DO start the moment the old drain retires. Needs all three exits, not one.
- **Daily cap replay (week 10-09 to 10-15):** the meter ran above the day-by-day pace limit in 169 of 252 readings; flat 90% would have caught only 40. 17 scheduled-agent runs and 23 shipped rows happened while over pace.

## What would need to be built (not built)
1. Every approved delivery gets its ship decision atomically with the status write (settle-ship.js), plus a nightly detector for "delivered without an exit".
2. AGT-423: fault-isolated sweep, counting and naming refused rows.
3. An owner and path for blocked deliveries: the Governance Architect rules each (ratify with evidence, or reopen), with a baseline re-check of unnamed reds on the pre-build tree for the regression-only blocks.
4. Drain design: a stalled drain must not hold the board (skip a drain with no claimable member, raise a finding after 24 hours, give blocked members an owner).
5. An outcome check (pickable count, drain stall age, delivered-without-exit count, tickets reaching done) in a named Auditor job.
6. One shared daily guard for every routine that uses the pace limit (day index times 14.29 points) as well as the 90% ceiling, and per-run token logging so a daily count exists (logs read 0 for most agents).

## Agreed approach (John, 2026-10-17): enhance, change nothing that exists
The root cause, in John's lifecycle terms: a ticket has a status for "built and released" (`delivered`); a drain has none. The system ends a drain only when every ticket is `done`, so a drain whose tickets are all delivered stays queued and blocks the next drain.
John's four rules (the whole fix):
1. When all of a drain's tickets reach `delivered`...
2. ...the drain's status becomes `delivered`.
3. A `delivered` drain lets the runner pick up the next drain.
4. If no drain is available, the runner picks the next prioritized ticket in an active project.
Additive build only: (a) allow the status value `delivered` on drains (the check constraint allows only queued, in_progress, done, expired, cancelled, standing today); (b) the transition when every member is delivered, done or removed; (c) a one-time update of the old drain 11db3e2d (all 9 members delivered). Nothing existing changes: a drain whose members are all `done` still retires as today; an exclusive drain still holds the pick while it has work; a stuck or deferred member still holds its drain open on purpose (SES-305: a signal for the gate to re-rule), which is existing behavior and is NOT being changed. An earlier proposal of mine to step past stalled drains or to count stuck members as settled is withdrawn.
Proof (rolled back, live data): with the old drain marked delivered, the runner picked AGT-480 to AGT-494 in order across both new drains, each drain flipping to delivered after its last ticket; with no drain left, `should_boot` read true, pickable 1, next ticket AGT-304 (rule 4 works today). Negative control: a stuck member (AGT-483) holds its drain queued and stops the sequence, as the existing design intends.

## Confidence
High for the database chain (real functions, live data). Moderate for cycle behavior (whether cycles record decisions, whether the runner boots tonight). Not simulated: the settle-ship change, the stall rule, the pace guard inside routine prompts.
