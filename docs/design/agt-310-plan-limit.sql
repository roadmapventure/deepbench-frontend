-- DeepBench v7.0.1074 | docs/design/agt-310-plan-limit.sql | AGT-310 -- the warning line John owns, and the waste cause for a fire the plan refused before it started.
-- Migration agt310_plan_limit. Applied by the orchestrator over the Supabase connector; the Builder writes this mirror and never applies it (kickoff §1).
-- Verified read-only before writing (2026-11-20, service key, PostgREST): runner_settings id=1 reads scheduler_on true, cron_minute 40,
-- interval_hours 1; plan_limit_warn_pct does NOT exist (42703); runner_waste_causes holds no 'plan_limit_rejected' row. So both up statements are
-- additive on this tree and neither collides.
--
-- WHY A COLUMN AND NOT A CONSTANT (D2). 95 is a line John moves, not a fact about the code: it decides when the meter reader starts saying the week
-- is nearly spent, and the only person who can act on that notice -- by pacing the runner or buying extra usage -- is him. A hardcoded 95 would make
-- his own threshold a code change (pattern:2). The CHECK keeps it a warning rather than a second bound: 99 is the highest line that can still fire
-- before 100, which is where scheduled runs stop being refused in theory and start being refused in fact.
--
-- WHY THE CAUSE COUNTS AS WASTE (D5). A pre-boot refusal by the plan limit is not a safeguard of ours acting correctly (those are the weekly_pace /
-- weekly_wall rows AGT-622 is re-ruling). Nothing ran, the scheduled slot is gone, and no ticket moved -- which is exactly what the waste rate exists
-- to report. candidate_tickets stays '{}': there is no ticket to burn down, the remedy is John's.
--
-- UNDO (capture_migration_down, runbooks/runner-cycle.md step 6): the two statements under `-- down` below, in that order. Both are exact inverses --
-- dropping the column removes its CHECK with it, and the delete is keyed on the primary key, so neither touches a row this migration did not write.

alter table public.runner_settings add column plan_limit_warn_pct numeric not null default 95 check (plan_limit_warn_pct between 1 and 99);
insert into public.runner_waste_causes (cause, candidate_tickets, counts_as_waste, plain) values ('plan_limit_rejected', '{}', true, 'The Claude plan limit refused the scheduled run before it started, so nothing ran and the slot was lost.');
-- down
alter table public.runner_settings drop column plan_limit_warn_pct;
delete from public.runner_waste_causes where cause = 'plan_limit_rejected';
