<!-- DeepBench v7.0.1020 | runbooks/victoria-daily-check.md | AGT-666 — John's rule (decision 572d2b06): she grades NEW waiting tickets. The daily check's fourth arm (new_waiting) is public.victoria_daily_verdict(jsonb, integer, integer, integer), fed by public.victoria_new_waiting() — the one home of "new", window included; mirror docs/design/agt-666-victoria-new-waiting.sql. On reason new_waiting step 2 takes ONLY the slugs that function returns and passes --new-only to both doors. The live routine follows this only after it is updated from the block (update rule below). -->
<!-- DeepBench v7.0.971 | runbooks/victoria-daily-check.md | AGT-613 — John's rule (decision 087d79ae): she grades in the active projects too. Step 2's lists are the waiting lists AND any active project public.victoria_intake_lists() returns (only while it holds ungraded tickets); on an active project's list she grades in place — a pass with no home, never a move. The daily check's third arm (ungraded_in_active) is public.victoria_daily_verdict(jsonb, integer, integer); mirror docs/design/agt-613-victoria-grades-in-place.sql. The live routine is a COPY of this block: it follows the new behaviour only after the routine is updated from it (update rule below). -->
<!-- DeepBench v7.0.948 | runbooks/victoria-daily-check.md | INTAKE-LIFECYCLE-RCA-1103 D2-D4 — the routine EXISTS and is enabled (trig_01M1rsFP6HHYxELMr8JdhDg5, decision 517b6ebe). Step 2 reads its lists from public.victoria_intake_lists() (docs/design/victoria-intake-lists.sql) on BOTH reasons, never the active projects and never a named list; every sub-agent falls back to the same model family when the exact id cannot be selected. -->
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
and John's ten is declared exactly once, in `public.victoria_daily_verdict(jsonb, integer, integer, integer)` (third arm `ungraded_in_active` since `AGT-613`, fourth arm `new_waiting` since `AGT-666`), so no
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
| cron | `50 10 * * *` (UTC) | daily 4:50 AM CST (Central standard time since 2026-11-01). The minute is 50 rather than 00 because a run on the hour queues behind every other routine on the hour |
| model | the `lane`/`orchestrator` row of `public.model_assignments` at creation | read from the table, never a literal in this file or in the block; `scripts/sync-routine-models.js` re-pins it after a switch |
| sources | `roadmapventure/deepbench-frontend` (branch `dev`) | one clone; every row this run reads and writes lives in Supabase |
| connectors | Supabase MCP (`mcp__Supabase__*`) | the board, the candidate sources and the secrets by name. No web access: a need source is a row, never a page |
| environment | `env_01GuEzm2nCHbCB5SumvQVEQ1` | the environment the other DeepBench routines run in |
| notifications | off | nothing is sent; the `runner_cycles` row each list writes is the ONE record of the run, and the standing brief renders it |
| enabled | `true` — created and switched on 2026-11-03 under John's standing approval (docs/design/INTAKE-LIFECYCLE-RCA-1103.md D2, decision 517b6ebe). Undo: `RemoteTrigger update {enabled:false}` | D2: the platform may create and enable routines an approved design names; it never re-enables one John switched off |
| routine id | `trig_01M1rsFP6HHYxELMr8JdhDg5`, also in `ROUTINES["victoria-daily-check"]` (`scripts/check-routine-prompt.js`) and `scripts/sync-routine-models.js` | the id lives here and in the registries, never in the block (AGT-102, the `model-watch` precedent, AGT-146) |
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

DEEPBENCH VICTORIA-DAILY-CHECK — DAILY 4:50 AM CENTRAL · trigger: scheduled, or manual "Run now". This run is UNATTENDED: nobody reviews it afterward, so decide, record and finish. Do not ask anyone anything.

You are one run of Victoria Chen's prioritization (victoria, The Requirements Analyst). The deepbench-frontend clone is beside you: work there, branch from origin/dev, never main, commit and push nothing. Supabase MCP tools are attached; every secret is read by NAME from public.runner_secrets and exported inline on the one command that needs it — SUPABASE_URL and SUPABASE_SERVICE_KEY. Never print a secret, never write one to a file, never read one into the session. Read docs/runbooks/victoria-reorg.md from that clone: section (b) is the mechanics of the list door. Your DUTY is not in that file, it is in the database.

Step 0 — the shared weekly meter, before anything is spent: select ok, reason, all_models_pct from public.routine_meter_ok();. If ok is false, or the call errors at all, this run STOPS: send no list, spend no sub-agent turn, write no row, and make line 1 of your answer SKIPPED: weekly meter <all_models_pct>% (<reason>).

Step 1 — the check, one call: select * from public.victoria_daily_check();. Exactly one row comes back — prompt, reason, detail. If prompt is false, this run STOPS: write nothing at all — no list, no decision row — and make line 1 of your answer SKIPPED: at floor. The floor's number is not in this prompt and is not yours to restate: it lives once in public.victoria_daily_verdict(jsonb, integer, integer, integer), which that call feeds, and reason tells you which arm answered.

Step 2 — prompt true: make a scratch directory $S, and set the stamp — the day in Central time, so the session name victoria-daily-<yyyymmdd> rides on every write this run makes. Then work the lists. On reason new_waiting the lists are ONLY the slugs this one call returns, in that order: select slug from public.victoria_new_waiting() group by slug order by max(filed_at) desc; — that function is the one answer to which waiting tickets are new and nobody has graded, so no window and no list is named in this prompt. On each of those slugs pass --new-only to BOTH doors below — the validation door and the list door — so only the new tickets that function names are put to a turn; the moving rule below is unchanged. On every other reason the lists are the waiting lists AND any active project public.victoria_intake_lists() returns: an active project is returned only while it holds tickets nobody has graded. Read them, one call: select slug, waiting, ungraded from public.victoria_intake_lists(); — that function is the one answer to which lists hold work for you, newest work first, and no list is named in this prompt, so a list added tomorrow is in it tomorrow. Take each slug in the order returned, one at a time, through section (b)'s list door. On an ACTIVE project's list (its prepare says list_executing true) grade each ungraded ticket WHERE IT SITS: a pass with NO home, never a move — it is already home; a ticket there that is already graded is answered hold. On a waiting list, move every ticket you grade 3 or greater into the active project its charter fits (5s first, then 4s, then 3s; a 5 moves in even when that project already has ten). After each list re-run select prompt from public.victoria_daily_check();: when it reads false the floor is met and the 5s are placed, so stop taking lists. A list the door refuses (exit 1, a held list) is skipped and named in step 4 —

First the validation door, same list: node scripts/ticket-validation.js --prepare --list=<slug> --out=$S/<slug>.validate.md --json (stdout saved as $S/<slug>.validate.prepare.json). Exit 0 means nothing on this list needs validating — go straight to the list door. Exit 3 means the prompt is written and the JSON names the model: ONE sub-agent with the Agent tool on that model (THE MODEL RULE, for every sub-agent this run launches: use the exact id printed; when the Agent tool cannot select that exact id, use the same family — sonnet, opus, haiku or fable — and name the substitution in step 4; never skip a door because of the model), whose prompt is one orientation line plus the full contents of $S/<slug>.validate.md and whose answer is saved to $S/<slug>.validate.answer.json; then node scripts/ticket-validation.js --dry-run=$S/<slug>.validate.answer.json --context=$S/<slug>.validate.prepare.json (a refusal goes back to the same sub-agent to fix; never hand-edit), then node scripts/ticket-validation.js --apply=$S/<slug>.validate.answer.json --context=$S/<slug>.validate.prepare.json --session-name=<the session name>; log it: node scripts/agent-log.js --agent=architect --capability=validate-ticket --model=<printed> --ai-type=validate-ticket --feature=validate-ticket:ga-validate-intent:depth0. Only then the list door.

node scripts/requirement-check.js --prepare-list --project=<slug> --out=$S/<slug>.md --json (exit 3 is the success path and the JSON names the model), then ONE sub-agent with the Agent tool on the model that JSON printed (the model rule above), whose prompt is one orientation line plus the full contents of $S/<slug>.md and whose answer is saved to $S/<slug>.answer.json, then node scripts/requirement-check.js --apply-list=$S/<slug>.answer.json --context=$S/<slug>.prepare.json --session-name=victoria-daily-<yyyymmdd>. A refusal (exit 1) sent nothing: hand the refusals back to the SAME sub-agent, which fixes its own answer, and apply again. Never hand-edit an answer, and never apply a list the validator refused. Score each ticket's real severity through your tree: never raise a score to fill a project, and turn a ticket down (not-needed) only when no candidate source supports it, because a turned-down ticket leaves the pick and nobody is watching.

Step 3 — log each turn on the model that list's render printed: node scripts/agent-log.js --agent=victoria --capability=requirement-check --model=<printed> --ai-type=requirement-check --feature=requirement-check:vc-reorganize-intent:depth0. Pass token counts only when this run observed them.

Step 4 — ONE row, and it is the end of the run: insert into runner_decisions (session_name, kind, summary, reasoning, expires_at) values ('victoria-daily-<yyyymmdd>', 'synthesis', a one-line summary, the reasoning, now() + interval '7 days'). The reasoning carries, per project, its BEFORE count — detail.counts from step 1 — and its AFTER count, re-read by calling public.victoria_daily_check() again once the lists are applied, plus the tickets scored, the tickets turned down, and each step you could not do and why. The runner_cycles row each --apply-list writes is the record of that list.

NEVER file a ticket, write the status removed, push a commit, open a card, send a message, raise a question or ask John anything; never edit your own rules in the database; never grade from a list public.victoria_intake_lists() did not return, never move a ticket that sits on an active project's list, and never move a ticket into a paused or planned project; never spend money; never name a model id of your own choosing. The run ends when the synthesis row is written.
<!-- VICTORIA-DAILY-CHECK-PROMPT-END -->
