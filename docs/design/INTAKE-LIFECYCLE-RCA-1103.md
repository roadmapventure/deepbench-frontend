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
