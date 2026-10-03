<!-- DeepBench v7.0.678 | runbooks/model-watch-routine.md | AGT-146 — the model-watch playbook: the routine holds a copy of the prompt block; this file is the source (ARCHITECTURE.md §19v). Steps 0-6 are docs/harvests/AGT-146.md §S, with step 3's exit-4 clause amended against v7.0.677 (AGT-151) — see the note under the steps. -->
# The model-watch routine — playbook and canonical prompt

## What this is

| Field | Value | Why |
|---|---|---|
| name | `model-watch` | separate from `deepbench-runner` and `deepbench-auditor`, its own switch (John's call, Q5 2026-09-25) |
| cron | `30 9 * * *` (UTC) | daily 4:30 AM CDT; after DST ends 2026-11-01 John sets `30 10 * * *` in the routine (the runbook records `30 9 * * *` and says so). ONE cron: the Friday fire IS the weekly mode (`WEEKLY=yes`), so `0 7 * * 5` is not created |
| model | the `lane/orchestrator` row of `public.model_assignments` at creation | the routine that switches models reads its own from the table, never a literal; `scripts/sync-routine-models.js` re-pins it after a switch |
| sources | `roadmapventure/deepbench-frontend` (branch `dev`) | one clone; nothing here reads the private repos |
| connectors | Supabase MCP (`mcp__Supabase__*`, the governance credential) | catalog, assignments, ledger, alerts, secrets by name |
| allowed_tools | the Auditor's, copied from a fresh `RemoteTrigger get` of `trig_01BCzPdanZ1YiK956dAqU6YN`, plus `WebFetch` and `WebSearch` | step 1 reads two Anthropic pages by `curl`, and `dm-release-watch-intent` searches |
| environment | `env_01GuEzm2nCHbCB5SumvQVEQ1` | the environment the other DeepBench routines run in |
| enabled | `true` at creation | John's switch alone |
| notifications | off | nothing is sent; the record of every fire is one `runner_decisions` row the standing brief already renders |
| routine id | `trig_01QTxphS7u5dzD5HdChCBzjV` — created 2026-09-29 by attended session `status-0929` (first run `cse_01PJz14HXKJKsEPENSteezGk`); also in `ROUTINES["model-watch"].id` (`scripts/check-routine-prompt.js`) and `scripts/sync-routine-models.js` `ROUTINES` | AGT-102 ran the Auditor a week on an unfilled placeholder, so the id is absent by design until it is real, and the prompt block never carries one |
| prompt | the block between `<!-- MODEL-WATCH-ROUTINE-PROMPT-BEGIN -->` / `<!-- MODEL-WATCH-ROUTINE-PROMPT-END -->` in `docs/runbooks/model-watch-routine.md`, byte-identical | the routine-prompt.md convention: the file is the source, the routine the copy |

Update rule, as routine-prompt.md and auditor-routine.md: edit the block → suite → commit → on John's word `RemoteTrigger update` with the WHOLE `ccr` (`environment_id`, `events`, `session_context`) read from a fresh `get`, then read back `derived_state.model` and `allowed_tools`.

The block carries no trigger id and no model id. AGT-102 found the Auditor ran a week on the placeholder stamp because the block was written before the routine existed and the id was never filled; AGT-146 is the same sequence (build, then create), so `ROUTINES["model-watch"].id` is `null` and `finding()` falls back to the routine name (`routine/model-watch/prompt`) — the fingerprint is stable whether or not the id is ever filled, and filling it later is a one-line edit, not a drift. No model id either: a routine that switches models must not name one in its own prompt.

## The prompt

<!-- MODEL-WATCH-ROUTINE-PROMPT-BEGIN -->
DEEPBENCH MODEL-WATCH — DAILY 4:30 AM CENTRAL (a Friday fire adds the weekly trials) · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/model-watch-routine.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of DeepBench's model watch. The deepbench-frontend clone is beside you: work there, branch from origin/dev, never main. Supabase MCP tools are attached; secrets by NAME from runner_secrets, never printed — not in a query result, not on a command line. Read docs/runbooks/model-watch-routine.md from that clone and execute its steps 0-6 in order, exactly. Step 0 sets the day stamp, the scratch directory and the session name every ledger write carries; there is no runner_cycles row. The one stop is the weekly wall, or a usage meter that could not be read and is older than its staleness limit — on that stop step 6 writes the did-not-run row and the run ends. The builder's other refusals — the scheduler being off, nothing pickable, the weekly pace — never stop this run.

Steps 1-5 are the work. A cheap read of the two Anthropic pages against the catalog decides whether the release watch runs at all; the watch and the assignment are sub-agents assembled by scripts/agent-prompt.js and logged by scripts/agent-log.js, each on the model the assembly prints. Trials are queued by SQL and never by judgment, and each runs through scripts/model-trial.js; the first no-room exit ends the queue in place, and the pairs behind it keep their turn next fire. Claude models only — nothing here proposes, names or moves to a model outside that family. Every switch is applied by the database function, which writes its own reversible decision and its own before-image.

The hand-off is table rows sequenced by the runbook — never agent to agent. Nothing in this run turns a routine on or off, edits a cron, moves a budget wall, changes the pace stop or touches an API wall: those are John's calls and reach him as rows he decides. Nothing is sent anywhere — the record of this run is one runner_decisions row of kind model-report, written by step 6 whatever happened, and money waiting on John leads its summary. This run ends when that row is written.
<!-- MODEL-WATCH-ROUTINE-PROMPT-END -->

## Steps 0-6

**Step 0 — stamp, clone, drift check, meter, room, the one stop.**
```
export D=$(TZ=America/Chicago date +%F) N=model-watch-$D S=$(mktemp -d); WEEKLY=$([ "$(TZ=America/Chicago date +%u)" = 5 ] && echo yes || echo no)
export SUPABASE_URL=<runner_secrets.SUPABASE_URL> SUPABASE_SERVICE_KEY=<runner_secrets.SUPABASE_SERVICE_KEY>   # read by name over the MCP; export inline; never echo
git fetch origin dev && git checkout -B session/$N origin/dev
# write the prompt this run was given to $S/prompt.txt verbatim (the whole text, unedited), then:
node scripts/check-routine-prompt.js --routine=model-watch --prompt=$S/prompt.txt --out=$S/prompt-drift.json; echo "prompt-drift exit $?"
```
Exit 1 is a step-6 note, never a stop; exit 2 is a check that could not run, noted the same way. Then the meter: run the builder's step-1 meter command verbatim — the one Bash command in `docs/runbooks/routine-prompt.md`'s prompt block, step 1, acted on by its LAST line: an `INSERT` line runs as one `execute_sql`, a `NO_READING` line writes nothing and is quoted in step 6. Then the auditor's room query with four more columns:
```sql
SELECT (detail->>'gated_pct')::numeric >= (detail->>'wall_pct')::numeric               AS weekly_wall,
       (detail->>'reading_age_hours')::numeric > (detail->>'meter_stale_hours')::numeric AS meter_stale,
       detail->>'gated_pct' AS gated_pct, detail->>'wall_pct' AS wall_pct, detail->>'wall_stop' AS wall_stop,
       detail->>'reading_age_hours' AS age_hours,
       detail->>'all_models_pct' AS all_models_pct, detail->>'pace_limit_pct' AS pace_limit_pct,
       detail->>'fable_pct' AS fable_pct, detail->>'fable_share' AS fable_share
FROM public.runner_should_boot();
```
Stop iff `weekly_wall` is true, or `meter_stale` is true AND the self-read printed `NO_READING`: step 6 writes `model-watch did not run — weekly wall: <gated_pct>% ≥ <wall_pct>%` or `— meter unreadable: <age_hours> h old, NO_READING <reason>`, and the run ends. `scheduler_off`, `nothing_pickable`, `weekly_pace` are the builder's refusals and never stop this routine.

**Step 1 — the cheap exit, then the release watch only if it is earned.**
```
curl -sfL https://platform.claude.com/docs/en/release-notes/overview https://platform.claude.com/docs/en/about-claude/model-deprecations | grep -oE 'claude-[a-z0-9]+(-[0-9]+)+' | sort -u > $S/ids.txt; echo "ids exit ${PIPESTATUS[0]}"
```
NEW = lines of `$S/ids.txt` absent from `select model_id from public.model_catalog`; a non-zero curl exit or an empty file = could-not-read. Run the release watch only when NEW is non-empty, could-not-read, `WEEKLY=yes`, or `select max(last_checked) < now() - interval '7 days' from public.model_catalog`; otherwise write `releases 0` and go to step 2. The watch: `$S/watch.task.json` = `{ "catalog": <model_catalog rows>, "assignments": <model_assignments rows>, "ids_seen": <lines of $S/ids.txt> }`, then:
```
node scripts/agent-prompt.js --agent=devmanager --capability=model-assignment --intent=dm-release-watch-intent --task-file=$S/watch.task.json > $S/watch.prompt.md
node scripts/agent-prompt.js --agent=devmanager --capability=model-assignment --intent=dm-release-watch-intent --task-file=$S/watch.task.json --json | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).llm.model))'
```
Run `$S/watch.prompt.md` as an Agent-tool sub-agent on the printed model with WebFetch and WebSearch, stating the clone's absolute path; the answer is one JSON object in `dm-release-watch-intent`'s schema → `$S/watch.json`. Log it, then apply the catalog half only:
```
node scripts/agent-log.js --agent=devmanager --capability=model-assignment --model=<printed> --ai-type=model-assignment --feature=model-assignment:dm-release-watch-intent:depth1 [--input-tokens=<n> --output-tokens=<n>] [--patterns-applied=<csv>]
```
```sql
select public.apply_model_assignment('{"catalog": <watch.json.catalog>, "actions": []}'::jsonb, NULL, '$N');
```
A sub-agent that returns no parseable object is re-run ONCE one tier up; still nothing → `releases could-not-read` in step 6.

**Step 2 — the review of what is already pinned.**
```sql
select public.review_model_watch(NULL, '$N');
```
Reverts write their own `model-revert` decision; the returned json's row count is `watch reviewed <n>`.

**Step 3 — pairs by SQL, then trials.** Release pairs:
```sql
with cur as (select a.job_kind, a.job_key, a.model_id, c.family, coalesce(c.released_on, c.first_seen::date) as cur_date
             from public.model_assignments a join public.model_catalog c on c.model_id = a.model_id)
select cur.job_kind, cur.job_key, n.model_id as candidate from cur
join lateral (select model_id from public.model_catalog n where n.family = cur.family and n.model_id <> cur.model_id
              and n.released_on is not null and n.released_on > cur.cur_date and n.deprecated_on is null
              and n.model_id like 'claude-%' order by n.released_on desc limit 1) n on true;
```
Downgrade pairs (only when `WEEKLY=yes`): the same `cur` joined to `model_pricing mp on mp.model = a.model_id`, candidate = `(select mp2.model from public.model_pricing mp2 join public.model_catalog c2 on c2.model_id = mp2.model where mp2.input_per_1k < mp.input_per_1k and c2.deprecated_on is null and c2.model_id like 'claude-%' order by mp2.input_per_1k desc limit 1)`. (Price lives in `public.model_pricing(model, input_per_1k, output_per_1k)` — `model_catalog` carries no price column.) Remove any pair already named in a `model-report` row of the last 28 days:
```sql
exists (select 1 from public.runner_decisions where kind = 'model-report' and decided_at > now() - interval '28 days'
        and reasoning like '%' || job_kind || '/' || job_key || '->' || candidate || '%')
```
Release pairs first, then downgrade pairs. Per pair:
```
node scripts/model-trial.js --job-kind=<job_kind> --job-key=<job_key> --candidate=<candidate> --out=$S/trial-<job_key>.json; echo "trial exit $?"
```
(AGT-148's flags: no session flag; the script logs its own replays.) Exit 0 = evidence written, the pair goes under `trials:` in step 6; exit 3 (`no-room`) ends the trial queue in place (later pairs keep their turn next fire); exit 4 (fewer than 3 replayable jobs — `REPLAYABLE` declares `design-kickoff:ds-kickoff-intent:depth0` on the judgment lane and, since `v7.0.677` (AGT-151), `build-ticket:bd-build-intent:depth0` on the **orchestrator** lane, so a `lane/orchestrator` pair DOES have an evidence path; a capability pair whose key names no replayable feature has none, and exits 4 as `not-replayable`, until one is declared) goes under `skipped:` with its reason and is NOT deduped, so it is retried every fire at the cost of one query; exit 1 (a replay failed) is noted under `skipped:` too, with the evidence file kept for the manager.

> **Amended against `docs/harvests/AGT-146.md` §S (2026-09-28, `v7.0.678`).** §S was written at `v7.0.595` and says AGT-148 "replays recorded `design-kickoff` turns only, so a `lane/orchestrator` or capability pair has no evidence path until a replayable feature exists." The orchestrator half is no longer true: `v7.0.677` (AGT-151) added `build-ticket:bd-build-intent:depth0` to `REPLAYABLE` declared on lane `orchestrator`, and `pickJobs` honours the lane. Measured on the live log at this ship: `lane/orchestrator` on its current model picks **3** replayable jobs, so the first fire's release pair is tried rather than skipped. The capability half still holds — a `capability` key naming no replayable feature returns `not-replayable`, measured 0 jobs for `capability/data-room-custody`. The clause above is the amended text; §S is the design record and is left as written.

**Step 4 — the assignment, only when there is something to assign.** Only when step 1 changed the catalog or step 3 wrote at least one evidence file: `$S/assign.task.json` = `{ "assignments": <rows>, "catalog": <rows>, "evidence": { "<job_kind>/<job_key>": <trial json> … }, "room": <the step-0 room columns> }`, then:
```
node scripts/agent-prompt.js --agent=devmanager --capability=model-assignment --intent=dm-model-assign-intent --task-file=$S/assign.task.json > $S/assign.prompt.md
node scripts/agent-prompt.js --agent=devmanager --capability=model-assignment --intent=dm-model-assign-intent --task-file=$S/assign.task.json --json | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).llm.model))'
node scripts/agent-log.js --agent=devmanager --capability=model-assignment --model=<printed> --ai-type=model-assignment --feature=model-assignment:dm-model-assign-intent:depth1 [--input-tokens=<n> --output-tokens=<n>] [--patterns-applied=<csv>]
```
Sub-agent on the printed model → `$S/assign.json`, then:
```sql
select public.apply_model_assignment('<assign.json>'::jsonb, NULL, '$N');
```
A refusal (the function raises naming the `job_key`) → re-run the sub-agent ONCE with the refusal appended; a second refusal → no apply, quoted in step 6. Retirements are the Intent's `file-ticket` action; money is its `money` action (a `john_alerts` row, no switch).

**Step 5 — the routine pins, only after a switch.** When any action applied was a `switch`:
```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/sync-routine-models.js --pending --session-name=$N
```
AGT-145 proved a cloud run cannot update a routine (`update_trigger` refuses routines created via http_api), so the manager's record is a `routine-pin-pending` decision per routine, and the next attended session runs AGT-145's `--plan` → `update` → `--verify` → `--record`. Exit 0 = `sync: pending`; a non-zero exit = `sync: refused` with the first output line.

**Step 6 — the report, always, as one row.**
```sql
select public.record_decision(NULL, '$N', 'model-report', NULL, '<summary>', '<reasoning>', NULL);
```
Summary, in this order: for each `select summary, detail from public.john_alerts where source = 'model-assignment' and acknowledged_at is null order by created_at`, one leading clause `MONEY waiting on John: <summary>` (the summary already carries `about $<n>/week`); then `model-watch <D>: releases <n>, retirements <n>, watch reviewed <n>, trials <n>, switched <n>, kept <n>, reverted <n>`; when `WEEKLY=yes` append ` · models: ` + `select string_agg(job_kind || '/' || job_key || '=' || model_id, ', ' order by job_kind, job_key) from public.model_assignments` + ` · changes this week: ` + `select count(*) from public.runner_decisions where kind in ('model-assignment','model-revert') and decided_at > now() - interval '7 days'`. A step-0 stop replaces all of it with the did-not-run text. Reasoning: `trials: <job_kind/job_key->candidate, …|none>; skipped: <job_kind/job_key->candidate (exit N reason), …|none>; drift: <exit>; no-room: <yes|no>; sync: <pending|refused|none>; refusals: <text|none>`. Only `trials:` feeds the 28-day dedupe. The reasoning argument must not be blank — `runner_decisions_reasoning_check` refuses an empty string. The run ends when this row is written.

## On demand

**On demand.** "Run now" on the routine, or any Claude session told "run model-watch", follows steps 0-6 with `N=<its own session name>` (a session name, never a cycle id — `ck_decision_attribution`); a second run on one day re-trials nothing (the 28-day dedupe) and writes its own report row.
