# Intake lifecycle RCA and fix (2026-11-03)

Status: DESIGN. Lifecycle CONFIRMED by John 2026-11-03 ("Yes, it's right"). Fix walked one decision at a time; nothing built yet. Builds on docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md (decisions 1-40), which stays in force.

## The lifecycle (John's, confirmed)

1. Anyone (Auditor, runner, Dev Manager, Nathan, Jerry, John) reports a problem as a finding, on one findings list.
2. The Governance Architect groups findings, tests the cause, and writes one tested ticket per group. The ticket waits, ungraded.
3. Victoria grades every ungraded ticket once against the active projects' charters. Fits one and scores 3+: she moves it in. Fits none: she parks it in a planned project.
4. Her trigger: once a day, if any active project has fewer than 10 ready tickets, or a 5 is waiting outside.
5. Builders pick from active projects; a ticket is finished when built and released.
6. Tickets older than 14 days are rechecked by the Architect before they move in.
7. Only John and Victoria put tickets into active projects; John only turns projects on or off.
8. It runs without John, indefinitely.

## Diff against the system (2026-11-03)

| # | Status | Evidence |
|---|---|---|
| 1 | Right | One `audit_findings` table, `found_by` per row. |
| 2 | Partly | Tickets are written, but waiting tickets sit in four `planned` holding projects (auditor-findings 76, dev-mgr-findings 205, backlog-intake 239, security 14), not one waiting state. |
| 3 | Partly | Moves work (28 `victoria-placed`, last 2026-11-03 10:52Z), but the live weekly prompt (trig_012xvmXsXAjbVxdbYhUTq6W1) names only executing projects and says "never touch a list or project this prompt does not name"; synthesis victoria-prioritize-20261103 records it could not reach AGT-546..596 in the planned projects. |
| 4 | Not today | `victoria_daily_check()` returned should_run true, project_below_floor (dev-manager-capabilities 0, tooling 1 countable; 6 fives outside). No routine calls it: `victoria-daily-check` was left "NOT CREATED, John's hand" (docs/runbooks/victoria-daily-check.md, AGT-485). `find_work_lists` is `{}` by decision 39, "until the daily check exists". |
| 6 | Not today | The validation door names `claude-sonnet-4-6`, which the sub-agent cannot select (same synthesis, step 1); tickets older than 14 days can never move. |
| 8 | Not today | See the root cause. |

AGT-480..494 (the 10-13 build) all read `delivered`.

## Root cause

The design was built as parts that each wait for a hand to start, and parts that depend on fixed values that go stale, with nothing checking either. Every stall of 2026-10-30..11-03 is this class: the daily check never switched on; prompts that enumerate list names; a setting turned off "until X" with no owner; a pinned model id that retired; monthly `runner_budget` rows with no rollover (finding 68d5f85e); the meter self-read requiring `five_hour` (finding 25440051); the no-ship counter counting lifetime failures (finding fde89d09).

## Fix (proposed; walked one decision at a time)

1. **Waiting is a stage, not a project.** One ticket field: waiting -> graded -> placed -> parked. The holding projects collapse into one waiting queue; the source stays on the ticket. Victoria reads one queue; a new source or agent needs no change.
2. **The database owns the trigger.** A scheduled database job runs `victoria_daily_check()` each morning and starts her routine when it says run. Her prompt names no project or list.
3. **No dated constants.** Models resolved by role with a daily availability check; budget rows roll forward; any "off until X" setting carries an owner and an expiry.
4. **Self-healing.** A daily invariant check: each active project has 10 ready or Victoria recorded why not today; no ticket waits ungraded more than 7 days; no assigned model is retired; every routine the design needs exists and is enabled. A failure retries the step and files a finding; a second failure goes to the morning report.
5. **Standing approval (John's call):** the platform may create and enable the routines its own design requires.

## Decisions

- D1 (2026-11-03, John): the lifecycle above is right.
- D2 (2026-11-03, John: "Yes, standing approval"): the platform may create and enable the routines an approved design doc names. Limits: never one that spends money or touches main; never re-enables a routine John switched off (his off is recorded and wins); each creation is a reversible decision shown in the morning report with its undo line. Replaces "the routine enabled flag is John's alone" for those routines only.

The calls below are Claude's (manager decides by default), each reversible; John may overturn any.

- D3 (fix 1, waiting is a stage): no ticket is moved between projects. One database function, `intake_queue()`, returns every open/partial ticket outside the executing projects that has no current Victoria grade or fit-stamp, oldest-rule order per 10-13 d.7. Any project, list or source added later is in the queue automatically. Victoria's list door gets a queue mode that reads it; her prompt names no list or project. The four holding projects stay as they are (provenance only).
- D4 (fix 2, the trigger): the `victoria-daily-check` routine is created from docs/runbooks/victoria-daily-check.md (under D2), daily 4:50 AM Central. Its first step reads `victoria_daily_check()`; when that says no, the run ends in seconds and writes one line. The weekly `victoria-reorg` is switched off once the daily one has run clean twice. `find_work_lists` stays empty.
- D5 (fix 3, no dated constants): every model a door uses is read from `model_assignments` by role at run time, and the invariant check (D6) flags any assigned id that the sub-agent cannot select. Any setting turned off "until X" carries an owner and an expiry date. The monthly budget rollover stays John's money call (finding 68d5f85e, escalated) and is not decided here.
- D6 (fix 4, self-healing) — see Build below for what shipped: a database scheduled job (pg_cron, like db-health-tick and runner-window-finaliser) runs the invariants each morning at 5:30 AM Central: each active project has 10 ready tickets or Victoria wrote today why not; no ticket waits ungraded more than 7 days; no assigned model is unselectable; every routine an approved design names exists and is enabled. It needs no model, so it cannot drift. Each failure writes a repair row; the hourly runner lanes read repair rows at boot (as they already read gate cards) and perform the repair under D2; a repair that fails twice files a finding and goes in the morning report.

## Build (2026-11-03, John: "ok build it")

- **v7.0.948 (d0728bc6), D3 + D4 + the D5 model rule.** `public.victoria_intake_lists()` (migration v7_0_947_victoria_intake_lists; repo docs/design/victoria-intake-lists.sql) returns the waiting lists; first read: 5 lists, 446 waiting, 332 ungraded. The daily-check block works those lists on both reasons and names none; every sub-agent falls back to the same model family when an exact id cannot be selected (the 11-03 validation blocker: `claude-sonnet-4-6` is active, not retired, but a routine's Agent tool selects families only). Routine `victoria-daily-check` created and enabled under D2: trig_01M1rsFP6HHYxELMr8JdhDg5, 10:50Z daily (4:50 AM CST), decision 517b6ebe, live prompt verified byte-equal to the block. Registered in check-routine-prompt.js and sync-routine-models.js.
- **v7.0.949, D6.** `platform_invariant_eval()` / `platform_invariant_check()` + `platform_invariant_results` (migration v7_0_949_platform_invariants; repo docs/design/platform-invariants.sql), pg_cron `platform-invariants-daily` at 11:30Z (5:30 AM CST), route `invariant` -> dev-mgr-findings. Four rules: runner_stalled, victoria_missed, intake_stuck, budget_next_month. Replay: at 2026-11-02 18:00Z runner_stalled reads meter_stale x3 and FAILS, so the 10-31 outage would have been filed the first morning. Repair path = the lifecycle itself (finding -> Architect ticket -> Victoria -> builder); a second failed day escalates; budget is filed escalated with john_call money and never repaired here.
- **Not built (named, not dropped):** (1) the D5 owner-and-expiry on "off until X" settings — no setting registry exists; the invariants cover the two such settings that bit (meter, budget). (2) Repairs performed by the runner lanes at boot (D6's original wording): replaced by the findings path above, which needs no change to runner_should_boot() or the lane prompts. (3) Switching the weekly `victoria-reorg` off after two clean daily runs: it is harmless while on (it only re-reads the active projects); left for the first attended check of the daily runs.
- **D7 (John 2026-11-03, "yes"): a trigger is harness, never an agent's job, but every trigger has an OWNING agent.** "Is she needed today" is arithmetic the database answers; agents own the judgment it leads to. Built v7.0.951 (docs/design/agent-routines.sql): `agent_routines` (any cloud routine or pg_cron job, its owner, purpose, design ref, and `john_switched_off_at` so John's off always wins over D2) and `invariant_owners` (each self-check rule's owner; NULL = John's money call). Seeded: victoria-daily-check -> Victoria Chen; platform-invariants-daily -> The Development Manager; victoria_missed and intake_stuck -> Victoria; runner_stalled -> The Development Manager; budget_next_month -> John. Every self-check finding now names its OWNER. Not built: showing a trigger on the owner's Personnel File is a screen change and waits for John's design call; the other existing routines are registered when a design names their owner.
