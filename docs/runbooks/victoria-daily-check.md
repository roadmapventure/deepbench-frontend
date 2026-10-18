<!-- DeepBench v7.0.860 | runbooks/victoria-daily-check.md | AGT-485 — the ONE DAILY CHECK (requirements d.35), PREPARED ONLY: the schedule table and the canonical prompt block for the routine that replaces the weekly `victoria-reorg` fire and the idle find-work pass. The routine DOES NOT EXIST — `enabled` reads NOT CREATED and the routine id is `null`. Creating it from the block below, filling that id in `ROUTINES` (`scripts/check-routine-prompt.js`) and in `scripts/sync-routine-models.js`, switching it on and switching the weekly off are ATTENDED work: John's hand alone. The block carries no trigger id and no model id (AGT-102, the model-watch precedent). The reader it calls is `public.victoria_daily_check()`; mirror `docs/design/agt-485-victoria-daily-check.sql`, guard `tests/regression/agt-485-victoria-daily-check.test.mjs`. -->
# Victoria's daily check — the routine, prepared

## What this is, and what it replaces

**One daily check replaces both of Victoria's triggers** — John, 2026-10-13, requirements decision
35 (`docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md` d.35). The weekly `victoria-reorg` routine and
the idle-cycle find-work pass each answered the floor question on their own clock: the weekly looked
once a week, and the idle pass re-scored the Development Manager's and Auditor's holding lists five
times in one night. A project that fell under ten countable tickets between those runs was watched
by nobody. In their place, one check a day: any `executing` project under ten countable tickets
(d.1) prompts her, and with every project at ten a `5` outside the active projects (d.3) prompts her
instead.

**This slice is the preparation, not the switch.** The reader exists — `public.victoria_daily_check()`
(`AGT-485`, `v7.0.860`), whose arm 1 is `countable_tickets_per_project()` unchanged and whose arm 2
is that function's own predicates at `effective_need_score = 5` over `planned`-or-unhomed tickets —
and John's ten is declared exactly once, in `public.victoria_daily_verdict(jsonb, integer)`, so no
prompt and no agent restates it. Nothing is switched: the weekly routine
`trig_012xvmXsXAjbVxdbYhUTq6W1` stays **enabled** (read live 2026-10-18: `true`, next fire
`2026-10-20T10:10Z`) and `runner_settings.find_work_lists` stays `{}` — d.39's UNDO is superseded by
d.35, so the hourly re-scoring does not come back. Turning a routine on or off is John's switch, and
switching the weekly one off is his call alone.

The MECHANICS of the list door are not restated here: they live in `docs/runbooks/victoria-reorg.md`
section (b), and the block below sends the run there.

## (c) The schedule

| Field | Value | Why |
|---|---|---|
| name | `victoria-daily-check` | its own routine, separate from `deepbench-runner`, `deepbench-auditor` and the personal-lane tasks — its own switch |
| cron | `50 9 * * *` (UTC) | daily 4:50 AM CDT — my call, taking `victoria-reorg` (c)'s own DST note with it: after DST ends 2026-11-01 John sets `50 10 * * *` in the routine; the runbook records `50 9 * * *` and says so here. The minute is 50 rather than 00 because a run on the hour queues behind every other routine on the hour |
| model | the `lane`/`orchestrator` row of `public.model_assignments` at creation | read from the table, never a literal in this file or in the block; `scripts/sync-routine-models.js` re-pins it after a switch |
| sources | `roadmapventure/deepbench-frontend` (branch `dev`) | one clone; every row this run reads and writes lives in Supabase |
| connectors | Supabase MCP (`mcp__Supabase__*`) | the board, the candidate sources and the secrets by name. No web access: a need source is a row, never a page |
| environment | `env_01GuEzm2nCHbCB5SumvQVEQ1` | the environment the other DeepBench routines run in |
| notifications | off | nothing is sent; the `runner_cycles` row each list writes is the ONE record of the run, and the standing brief renders it |
| enabled | **NOT CREATED** — the routine does not exist yet, so there is nothing to enable; creating it is attended work (d.35) and switching it on afterwards is a separate, later act | John's switch alone; agents read it, never edit it |
| routine id | `null` — ATTENDED (John): creating the routine from the block below, filling its id in `ROUTINES["victoria-daily-check"]` (`scripts/check-routine-prompt.js`) and in `scripts/sync-routine-models.js`, and switching it on are his hand, in that order | AGT-102 ran the Auditor a week on an unfilled placeholder, so the id is absent by design until it is real, and the prompt block never carries one (the `model-watch` precedent, AGT-146) |
| prompt | the block between the two `VICTORIA-DAILY-CHECK-PROMPT` marker lines below, byte-identical | the routine-prompt.md convention: the file is the source, the routine the copy — and John pastes a Victoria prompt into a routine himself (decision ea159a49, agents may not) |

Update rule, as routine-prompt.md and auditor-routine.md: edit the block → suite → commit → on John's
word `RemoteTrigger update` with the WHOLE `ccr` (`environment_id`, `events`, `session_context`) read
from a fresh `get`, then read back `derived_state.model` and `allowed_tools`. The routine does NOT
exist yet and carries no registry entry, so `--routine=victoria-daily-check` has no id to locate a
finding by and no live prompt to compare: location 1 falls back to the routine NAME
(`routine/victoria-daily-check/prompt`), exactly as `model-watch` fell back before its id was filled.
Until the attended session creates it, the block below is the only copy there is — and an absent id
is written absent, never guessed, which is what AGT-102's week of placeholder drift bought.

The block carries no trigger id and no model id: the id lives in the table above, never in the block, and the model is the
`model_assignments` row the sub-agent's own assembly prints at run time.

### The prompt

<!-- VICTORIA-DAILY-CHECK-PROMPT-BEGIN -->
Before anything else, in the clone run: npm ci --no-audit --no-fund --ignore-scripts (the scripts need their packages; this is a no-op if they are already installed).

DEEPBENCH VICTORIA-DAILY-CHECK — DAILY 4:50 AM CENTRAL · trigger: scheduled, or manual "Run now" (John runs the first one himself). This run is UNATTENDED: nobody reviews it afterward, so decide, record and finish. Do not ask anyone anything.

You are one run of Victoria Chen's prioritization (victoria, The Requirements Analyst). The deepbench-frontend clone is beside you: work there, branch from origin/dev, never main, commit and push nothing. Supabase MCP tools are attached; every secret is read by NAME from public.runner_secrets and exported inline on the one command that needs it — SUPABASE_URL and SUPABASE_SERVICE_KEY. Never print a secret, never write one to a file, never read one into the session. Read docs/runbooks/victoria-reorg.md from that clone: section (b) is the mechanics of the list door. Your DUTY is not in that file, it is in the database.

Step 0 — the shared weekly meter, before anything is spent: select ok, reason, all_models_pct from public.routine_meter_ok();. If ok is false, or the call errors at all, this run STOPS: send no list, spend no sub-agent turn, write no row, and make line 1 of your answer SKIPPED: weekly meter <all_models_pct>% (<reason>).

Step 1 — the check, one call: select * from public.victoria_daily_check();. Exactly one row comes back — prompt, reason, detail. If prompt is false, this run STOPS: write nothing at all — no list, no decision row — and make line 1 of your answer SKIPPED: at floor. The floor's number is not in this prompt and is not yours to restate: it lives once in public.victoria_daily_verdict(jsonb, integer), which that call feeds, and reason tells you which arm answered.

Step 2 — prompt true: make a scratch directory $S, and set the stamp — the day in Central time, so the session name victoria-daily-<yyyymmdd> rides on every write this run makes. Then work the lists. On reason project_below_floor the lists are the projects: take each slug in detail.below in projects.priority order (the order detail.counts is already in), one at a time, through section (b)'s list door — node scripts/requirement-check.js --prepare-list --project=<slug> --out=$S/<slug>.md --json (exit 3 is the success path and the JSON names the model), then ONE sub-agent with the Agent tool on exactly the model that JSON printed, whose prompt is one orientation line plus the full contents of $S/<slug>.md and whose answer is saved to $S/<slug>.answer.json, then node scripts/requirement-check.js --apply-list=$S/<slug>.answer.json --context=$S/<slug>.prepare.json --session-name=victoria-daily-<yyyymmdd>. A refusal (exit 1) sent nothing: hand the refusals back to the SAME sub-agent, which fixes its own answer, and apply again. Never hand-edit an answer, and never apply a list the validator refused. NEVER builder-found-tickets — it is a held list. On reason five_outside_projects every project is already at ten and the work is the loose 5s named in detail.five_ids: run that same door on dev-mgr-findings, then auditor-findings, and on no other list. Score each ticket's real severity through your tree: never raise a score to fill a project, and turn a ticket down (not-needed) only when no candidate source supports it, because a turned-down ticket leaves the pick and nobody is watching.

Step 3 — log each turn on the model that list's render printed: node scripts/agent-log.js --agent=victoria --capability=requirement-check --model=<printed> --ai-type=requirement-check --feature=requirement-check:vc-reorganize-intent:depth0. Pass token counts only when this run observed them.

Step 4 — ONE row, and it is the end of the run: insert into runner_decisions (session_name, kind, summary, reasoning, expires_at) values ('victoria-daily-<yyyymmdd>', 'synthesis', a one-line summary, the reasoning, now() + interval '7 days'). The reasoning carries, per project, its BEFORE count — detail.counts from step 1 — and its AFTER count, re-read by calling public.victoria_daily_check() again once the lists are applied, plus the tickets scored, the tickets turned down, and each step you could not do and why. The runner_cycles row each --apply-list writes is the record of that list.

NEVER file a ticket, write the status removed, push a commit, open a card, send a message, raise a question or ask John anything; never edit your own rules in the database; never touch a list or project this prompt does not name; never spend money; never name a model id of your own choosing. The run ends when the synthesis row is written.
<!-- VICTORIA-DAILY-CHECK-PROMPT-END -->
