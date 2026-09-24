<!-- DeepBench v7.0.559 | runbooks/auditor-routine.md | AGT-102 s1 adds the routine-prompt drift check (step 0, step 1, step 3); AGT-86 slice 8c — the Auditor's playbook: the routine holds a copy of the prompt block; this file is the source; runner-cycle.md step 4d points here -->
# The Auditor routine — playbook and canonical prompt

## What this is

| Field | Value | Why |
|---|---|---|
| name | `deepbench-auditor` | separate from `deepbench-runner` (`trig_017TZ3JZcLBK6AYH6DKURqMH`), its own switch (A-21) |
| cron | `0 10 * * 1` (UTC) | Monday 5:00 AM CDT; after DST ends 2026-11-01 John sets `0 11 * * 1` in the routine (the runbook records `0 10 * * 1` and says so) |
| model | the `orchestrator` row of `public.runner_model_lanes` at creation (`claude-opus-5` on 2026-09-23) | judgment work runs on the model `scripts/agent-prompt.js` prints |
| sources | `roadmapventure/deepbench-frontend` (branch `dev`), `roadmapventure/interviewquestions`, `roadmapventure/claude-config` | three clones side by side; the two private ones are read-only inputs |
| connectors | Supabase MCP (`mcp__Supabase__*`, the governance credential) | ledger, alerts, secrets by name |
| allowed_tools | the builder routine's ten (copy from a fresh `RemoteTrigger get` of `trig_017…`) plus `WebSearch` | `au-advisor-intent` has `enable_web_search true` |
| enabled | `false` at creation | John's switch alone |
| prompt | the block between `<!-- AUDITOR-ROUTINE-PROMPT-BEGIN -->` / `<!-- AUDITOR-ROUTINE-PROMPT-END -->` in `docs/runbooks/auditor-routine.md`, byte-identical | the routine-prompt.md convention: the file is the source, the routine the copy |

Update rule, as routine-prompt.md: edit the block → suite → commit → on John's word `RemoteTrigger update` with the WHOLE `ccr` (`environment_id`, `events`, `session_context`) read from a fresh `get`, then read back `derived_state.model` and `allowed_tools`.

## The prompt

<!-- AUDITOR-ROUTINE-PROMPT-BEGIN -->
DEEPBENCH AUDITOR — WEEKLY AUDIT — stamp: DEEPBENCH-AUDITOR-trig_01BCzPdanZ1YiK956dAqU6YN · trigger: scheduled (Monday 5:00 AM Central) or manual ("Run now"). The canonical copy of this prompt is docs/runbooks/auditor-routine.md (AGT-86): if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of DeepBench's Auditor. Three repos are cloned side by side: deepbench-frontend (work there; branch from origin/dev; the default branch is main — never push there), interviewquestions and claude-config (read-only sources; both are PRIVATE — never copy their contents into deepbench-frontend, which is PUBLIC). Supabase MCP tools (mcp__Supabase__*) are attached; secrets by NAME from runner_secrets, never printed — not in a query result, not on a command line.

1. Read docs/runbooks/auditor-routine.md from the deepbench-frontend clone and execute its steps 0-7 in order, exactly. Step 0 sets W (the ISO week), S (a scratch directory) and N=auditor-<W> — the session name every ledger write carries; there is no runner_cycles row — checks the three clones, reads the usage meter with the builder's step-1 command, and asks public.runner_should_boot() for its DETAIL only. The one stop is the weekly wall: gated_pct >= wall_pct, or a meter that could not be read and is older than meter_stale_hours. On that stop: one push to John "Auditor did not run — <reason>", then end. scheduler_off, nothing_pickable, weekly_pace and the gate's other reasons are the builder's refusals and never stop the Auditor.
2. Steps 1-2 gather and judge: the corpus with both extra roots and the private scan, the board checks as code, the cluster run under --session-name=$N (config-review clusters route themselves to audit-config-review), then three job sub-agents — board-health, work-quality and advisor (the advisor may use WebSearch) — each on the model scripts/agent-prompt.js prints and each logged with scripts/agent-log.js. Step 3 merges every source into docs/audits/$W-candidates.json and ingests it ONCE with --session-name=$N --apply. Step 4: if scripts/audit-review.js --prepare exits 0, run the Development Manager (review-audit-worklist) as a sub-agent on the model the assembly prints, then --dry-run and --apply; exit 3 means no findings — no manager run, no cost. Step 5 writes the week's report and commits docs/audits/* to dev (git fetch origin dev, rebase, git push origin HEAD:dev — never main). Step 6: SELECT * FROM public.claim_john_alerts() and send one push per row, in plain words, naming which of John's five calls it is. Step 7: always one summary push — found N (new / recurring / gone), tickets filed with ids and titles, not-a-defect, carried, escalated, and the decision handle that reverses the review.
3. The hand-off to the Development Manager is table rows sequenced by the runbook — never agent to agent. You write the work list and stop; the manager rules. Nothing in this run edits a skill row, flips a routine, merges to main or spends money — those are John's calls and reach him as john_alerts.
4. Model discipline: you are the orchestrator lane (public.runner_model_lanes, read live, never assumed); a failed sub-agent re-runs once one tier up, never twice at the same tier. Every claim in a push traces to a row, a SHA or a script's stdout. Priority classes are written named (P10 - Tooling); outcomes as plain words. This run ends when your turn ends — send the summary before you stop.
<!-- AUDITOR-ROUTINE-PROMPT-END -->

## Steps 0-7

**Step 0 — stamp, clones, meter, the one stop.**
```
export W=$(date -u +%G-W%V); export S=$(mktemp -d); export N=auditor-$W
export SUPABASE_URL=<runner_secrets.SUPABASE_URL> SUPABASE_SERVICE_KEY=<runner_secrets.SUPABASE_SERVICE_KEY>   # read by name over the MCP; export inline; never echo
git fetch origin dev && git checkout -B session/$N origin/dev
for r in ../interviewquestions ../claude-config; do git -C "$r" rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "missing source clone $r"; exit 2; }; done
# write the prompt this run was given to $S/prompt.txt verbatim (the whole text, unedited), then:
node scripts/check-routine-prompt.js --routine=auditor --prompt=$S/prompt.txt --out=$S/prompt-auditor.json; echo "prompt-drift exit $?"
```
Prompt drift (AGT-102): exit 1 is a finding (`routine-prompt-drift`, merged in step 3), never a stop; exit 2 is a source that could not run — name it in the summary push.
A missing clone → push "Auditor did not run — missing source clone <path>" and end. Every extra root is a git CHECKOUT (tracked files only): an attended run on John's machine clones fresh — `git clone --depth 1 https://github.com/roadmapventure/interviewquestions.git $S/iq` and `…/claude-config.git $S/cc` — and passes those paths; never a working folder (measured 2026-09-23: the working `C:/Projects/interviewquestions` yields 134,274 statements from an untracked 6.8 MB `spend/ledger/lookups.json`; the repo tracks 25 .md files).
Meter: run the builder's step-1 command verbatim — the one Bash command in `docs/runbooks/routine-prompt.md`'s prompt block, step 1, from `env -C /tmp claude -p` to the end of its `||` fallback — and act on its LAST line: an `INSERT` line runs verbatim as one `mcp__Supabase__execute_sql` query; a `NO_READING` line writes nothing and is quoted in the summary push. Then one query:
```sql
SELECT (detail->>'gated_pct')::numeric >= (detail->>'wall_pct')::numeric               AS weekly_wall,
       (detail->>'reading_age_hours')::numeric > (detail->>'meter_stale_hours')::numeric AS meter_stale,
       detail->>'gated_pct' AS gated_pct, detail->>'wall_pct' AS wall_pct, detail->>'wall_stop' AS wall_stop,
       detail->>'reading_age_hours' AS age_hours
FROM public.runner_should_boot();
```
Stop iff `weekly_wall` is true, or `meter_stale` is true AND the self-read printed `NO_READING` (pattern:165 — a wall nobody can read fails closed). Push "Auditor did not run — weekly wall: <gated_pct>% ≥ <wall_pct>% (<wall_stop>)" or "— meter unreadable: <age_hours> h old, NO_READING <reason>", and end. The `reason` column is never consulted: `scheduler_off`, `nothing_pickable`, `weekly_pace`, `unaffordable` are the builder's. (`wall_pct` is `final_day_rest_pct` on Thursdays — an on-demand Thursday run meets the stricter wall; the Monday fire always meets `weekly_rest_pct`.)

**Step 1 — gather (code; exit 2 from any line = that source could not run: keep going, name it in the summary push, the merge tolerates a missing file).**
```
node scripts/audit-corpus.js --out=$S/s.json --extra-root=interviewquestions=../interviewquestions --extra-root=claude-config=../claude-config --private-scan=$S/private.json
node scripts/audit-cluster.js --build --statements=$S/s.json --week=$W --out-dir=$S/c --repo-visibility=deepbench-frontend=public --repo-visibility=interviewquestions=private --repo-visibility=claude-config=private
node scripts/audit-cluster.js --run --dir=$S/c --session-name=$N
node scripts/audit-cluster.js --collect --dir=$S/c --statements=$S/s.json --week=$W --out=$S/cluster.json
node scripts/audit-board.js --out=$S/board.json
```
(`--run` logs every model call itself through `agent-log.js`; a cluster whose statements carry a `project` label runs `audit-config-review` / `au-config-intent` with `repo_visibility` — the config-review job.)
The runner routine's drift notes (AGT-102), one query:
```sql
SELECT id, notes FROM public.runner_cycles WHERE started_at >= now() - interval '7 days' AND notes ~* 'routine[- ]prompt' AND notes ~* 'drift' AND notes !~* 'no drift|none detected|matched .{0,40}verbatim|no byte-level diff';
```
Each row's `notes` → `$S/note-<id>.txt`, then:
```
node scripts/check-routine-prompt.js --routine=runner --note=$S/note-<id>.txt --cycle=<id> --out=$S/prompt-runner.json
```
(every row fingerprints the same, so the last row's file stands for the week; zero rows → no file, and the merge names it.)

**Step 2 — three job sub-agents (judgment lane).** For each `<job>` / `<cap>` / `<intent>`: `board-health` / `audit-board-health` / `au-board-intent`; `work-quality` / `audit-work-quality` / `au-quality-intent`; `advisor` / `audit-advisor` / `au-advisor-intent`. Write `$S/<job>.task.json` (the intent row's task_context; sources below), then:
```
node scripts/agent-prompt.js --agent=auditor --capability=<cap> --task="$(cat $S/<job>.task.json)" > $S/<job>.prompt.md
node scripts/agent-prompt.js --agent=auditor --capability=<cap> --task="$(cat $S/<job>.task.json)" --json | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).llm.model))'
```
Run `$S/<job>.prompt.md` as an Agent-tool sub-agent on the printed model (the advisor's with WebSearch), stating the clone's absolute path; the answer is one JSON object `{cluster, findings, account}`. Save `{"week":"$W","found_by":"auditor:routine:<job>","findings":<answer.findings>}` as `$S/<job>.json`, then log:
```
node scripts/agent-log.js --agent=auditor --capability=<cap> --model=<printed model> --ai-type=<cap> --feature=<cap>:<intent>:depth1 [--input-tokens=<n> --output-tokens=<n>] [--patterns-applied=<csv>]
```
(token flags only when the sub-agent's usage is known — both or neither.) A sub-agent that returns no parseable object is re-run ONCE one tier up; still nothing → `$S/<job>.json` is written with `findings: []` and the summary names it.
task_context sources (`prior` for all three = `select fingerprint from public.audit_findings where iso_week = '$W'`):
- board-health: `week`; `board` = every `backlog_items` row with status in (open, partial) as `{backlog_id, title, status, epic_id, project (epics.project_id), tier, priority_class, defer_status, filed_at, revalidated_at, delivered_at}`, plus `description` (first 300 chars) only for rows filed or delivered in the last 14 days; `code_findings` = `$S/board.json`'s `findings`.
- work-quality: `week`; `shipped` = rows with `delivered_at` or status `done` in the last 7 days: `{backlog_id, title, description (first 1500), kickoff_path (ls docs/kickoffs/*-<ID>-*.md), ship_summary (latest runner_cycles.notes for that item, first 1500), verdict (latest runner_verdicts row), commits (git log origin/dev --since='8 days ago' --grep=<ID> --name-only --format='%h %s')}`; `code_findings` = `$S/board.json` findings with `check_slug quality-closed-red`.
- advisor: `week`; `platform_facts` = `{lanes: runner_model_lanes rows, claude_design_models: grep -n "claude-" CLAUDE-DESIGN.md, api_functions: node scripts/check-api-function-count.js output, budget: the current-month runner_budget row, hand_built: [scripts/audit-corpus.js, audit-cluster.js, audit-ledger.js, audit-board.js, audit-review.js, agent-prompt.js, agent-log.js, render-cycle-card.js, heal-engine.js, ticket-owner.js, tripwire-to-backlog.js — each with its header's first sentence]}`; `limits_hit` = `select outcome, last_step, count(*) from runner_cycles where started_at >= now() - interval '7 days' and outcome in ('did_not_run','failed') group by 1,2` plus the api/ function count against 12.

**Step 3 — merge, then ONE ingest** (`audit-ledger.js --report` reads exactly one file, `docs/audits/<W>-candidates.json`; several ingests would undercount "found"). Dedupes by `fingerprint()` across `findings` and `carried` — `UNIQUE (fingerprint, iso_week)` would otherwise abort the append mid-run. Tested 2026-09-23 on two fixtures (a shared finding kept once; a missing file skipped and named):
```
OUT=docs/audits/$W-candidates.json INS="$S/cluster.json $S/board.json $S/private.json $S/board-health.json $S/work-quality.json $S/advisor.json $S/prompt-auditor.json docs/audits/runner-prompt-drift.json $S/prompt-runner.json" node --input-type=module -e 'import fs from "node:fs"; import { fingerprint } from "./scripts/audit-ledger.js"; const d = { week: process.env.W, found_by: [], findings: [], carried: [], gone: [] }, seen = new Set(); for (const f of process.env.INS.split(" ")) { if (!fs.existsSync(f)) { console.log("merge: no file " + f); continue; } const j = JSON.parse(fs.readFileSync(f, "utf8")); d.found_by.push(String(j.found_by ?? f)); for (const k of ["findings", "carried"]) for (const x of j[k] ?? []) { const fp = fingerprint(x); if (seen.has(fp)) continue; seen.add(fp); d[k].push(x); } d.gone.push(...(j.gone ?? [])); } d.found_by = d.found_by.join(" + "); fs.writeFileSync(process.env.OUT, JSON.stringify(d, null, 2)); console.log(`merge ${d.week}: ${d.findings.length} findings, ${d.carried.length} carried, ${d.gone.length} gone, found_by ${d.found_by}`)'
node scripts/audit-ledger.js --ingest=docs/audits/$W-candidates.json --week=$W --session-name=$N --apply
```
(the ledger prints `ingest <W>: F findings, a new, b seen, c recurring, d ruled-out` — the summary's numbers.)

**Step 4 — the Development Manager's review, only when there is something to review.**
```
node scripts/audit-review.js --prepare --week=$W --out=$S/ctx.json; echo "prepare exit $?"
```
Exit 3 → "nothing to review — no manager run" goes in the summary; skip to step 5. Exit 0 →
```
node scripts/agent-prompt.js --agent=devmanager --capability=review-audit-worklist --task="$(cat $S/ctx.json)" > $S/review.prompt.md
node scripts/agent-prompt.js --agent=devmanager --capability=review-audit-worklist --task="$(cat $S/ctx.json)" --json | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).llm.model))'
```
Sub-agent on the printed model → `$S/answer.json` (`{groups, summary_for_john, patterns_applied}`); log it: `node scripts/agent-log.js --agent=devmanager --capability=review-audit-worklist --model=<printed> --ai-type=review-audit-worklist --feature=review-audit-worklist:dm-audit-review-intent:depth1 […]`. Then:
```
node scripts/audit-review.js --dry-run=$S/answer.json --context=$S/ctx.json
node scripts/audit-review.js --apply=$S/answer.json --context=$S/ctx.json --week=$W --session-name=$N
```
A `--dry-run` refusal → re-run the sub-agent ONCE with the refusal lines appended to the prompt; a second refusal → no `--apply`, the summary quotes the refusals, the findings stay `open` for next week. Keep `--apply`'s `Decision <id> — reversible until …` line and its ticket ids for step 7.

**Step 5 — report and record.**
```
node scripts/audit-ledger.js --report=$W --write
git add docs/audits/$W-candidates.json docs/audits/$W.md && git commit -m "auditor $W — <F> found, <T> tickets filed" && git fetch origin dev && git rebase origin/dev && git push origin HEAD:dev
```
Never main. An attended run commits in its own session's commit.

**Step 6 — John's calls.** `SELECT id, john_call, summary, detail, ref_table, ref_id FROM public.claim_john_alerts();` — one push per row: "John's call (<john_call>): <summary>", where `rules` = your own rules or past decisions, `money` = spending beyond what you approved, `production` = a dev → main release, `hiring` = creating or activating an agent, `switch` = turning an agent or routine on or off. Zero rows → no push.

**Step 7 — the summary, always.** One push: "Auditor <W>: found <F> (<a> new, <c> recurring, <g> gone); tickets filed: <ID — title, …> or none; not-a-defect <n>; carried <n>; escalated <n>; review decision <id>, reversible until <expires_at in America/Chicago>: select public.reverse_decision('<id>','John','<why>'); report docs/audits/<W>.md on dev; sources that could not run: <list or none>." When step 0 stopped, the did-not-run push IS the summary.

## On demand

**On demand.** "Run now" on the routine, or any Claude session told "run the Auditor", follows steps 0-7 attended with `N=<its own session name>` and fresh clones under `$S` (step 0). No idempotence guard: a second run in one ISO week re-classifies its findings as `seen` and files nothing twice; the cost is the run's tokens, John's to spend. Local caveat, not a blocker: on Windows/Node 24 a script that calls `process.exit()` right after a fetch can abort with a libuv assertion (slice 3 measured it in `audit-ledger.js` and `audit-cluster.js`); the cloud routine is Linux.
