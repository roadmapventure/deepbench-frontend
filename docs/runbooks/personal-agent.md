<!-- DeepBench v7.0.728 | runbooks/personal-agent.md | AGT-156 - the jerry-linkedin-alerts routine: section (e) is the canonical prompt block for the daily 8:00 AM Central alert review, and the SOURCE the live routine copies (ARCHITECTURE.md §19v). The routine itself is created by an attended session (DM ruling 2026-09-28), so the routine id is absent here and in ROUTINES["jerry-linkedin-alerts"].id until it is real -- AGT-146's model-watch precedent. Section (d)'s two bullets now say that the Sunday and Monday runs read the alert posting records (channel linkedin-alert) and name them in their summaries; the two verbatim prompt strings John pastes are byte-unchanged. -->
<!-- DeepBench v7.0.710 | runbooks/personal-agent.md | AGT-155 remainder — the two lead facts reach the producer. Step (b)5 now says what refuses a write: a job marked competitor with no competitor_why, which costs the whole answer — the records and the shared leads inbox both. The ask itself lives in the jm-linkedin-alerts-intent Skill row (migration `agt155_alerts_intent_lead_fields`, mirror docs/design/agt-155-alerts-intent-lead-fields.sql), where assemblePrompt() renders it on every --render: before it, the career-linkedin-alerts render named what_they_sell 0 times and competitor_why once; after it, 3 and 4. Both facts are required CONDITIONALLY, through the job item's allOf/if-then, never its flat required, so a non-competitor job stays valid. No other line moves. -->
<!-- DeepBench v7.0.561 | runbooks/personal-agent.md | AGT-84 — the playbook the /jerry loader reads: map the ask to a capability, render, run one sub-agent, write, log. Method only: no personal fact lives here (the repo is public; John's data lives only in public.career_records). -->
# Personal agent — the call path

## What this is

The method a Claude session follows to run a personal-lane agent (first one: `jerry`, Jerry Maguire — Personal — Career Agent) over its own DeepBench rows. The user-level `/jerry` skill is a thin loader that points here. Every step is a script except one: the single sub-agent turn, which runs on the session's subscription.

- `scripts/personal-agent.js --render` reads the capability's records and assembles the prompt through `assemblePrompt()` — the executor's own path (§19b). Never hand-build or edit the prompt.
- `scripts/personal-agent.js --write` validates the answer and stores it in `public.career_records`.
- `scripts/personal-agent.js --fetch-postings` pulls public job boards into `posting` records.
- `scripts/agent-log.js` logs the turn to `ai_activity_log` (§19k).

Personal data is read and written only through these scripts. Never paste a record into a repository file, a Skill row, or anywhere outside the session scratchpad.

## (a) The ask table

Match the ask to a capability; the capability slug is `career-` + the suffix.

| The ask says | Capability |
|---|---|
| `resume` | `career-resume-review` |
| `intro` / `pitch` | `career-intro-pitch` |
| `cover letter` | `career-cover-letter` |
| `interview` | `career-interview-prep` |
| `who should I talk to` | `career-outreach-plan` |
| `review the week` | `career-growth-review` |
| `watch the market` / `watch list` | `career-market-watch` |
| `matches` | `career-match-finder` |
| `posting` / `job description` | `career-posting-review` |
| `strengths` / `gaps` | `career-strengths-gaps` |
| `mine evidence` | `career-evidence-mining` |
| `log …` | no capability run — `--write` with one `log` item (below) |

When the ask names a target (one of the `target` records' `target_row` values, read live — never listed here), pass it as `--target=<row>`. A posting's text or any pasted document goes in a scratch file passed as `--input-file=<path>`.

## (b) The sequence

Work from the runner's checkout (the loader names it) and write every file to the session scratchpad.

1. **Credentials.** Read `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` by NAME from `public.runner_secrets` over the Supabase MCP. Export them inline on each command that needs them. Never print them, never write them to a file.
2. **Postings first, where the capability reads them.** For `career-market-watch` and `career-match-finder`, run `node scripts/personal-agent.js --fetch-postings --agent=<id>` first. A board that fails is printed and skipped; report it, never invent postings.
3. **Render.** `node scripts/personal-agent.js --render --agent=<id> --capability=<slug> [--target=<row>] [--ask=<the ask>] [--input-file=<path>] --out=<scratch>.md --json`. Stderr prints `# model: <id>`; stdout prints `{model, records_loaded, prompt_bytes}`. A non-zero exit stops the run — report the message, do not work around it.
4. **One sub-agent.** Launch ONE sub-agent with the Agent tool, `model` = the printed model id. Its prompt is one orientation line ("You are running the capability below; return only the JSON object its output contract names, and save it to `<scratch>.json`.") followed by the full contents of `<scratch>.md`. The answer is saved to `<scratch>.json`.
5. **Write.** `node scripts/personal-agent.js --write --agent=<id> --capability=<slug> --answer=<scratch>.json [--session-name=<n>]`. An unknown kind, a missing title, or a job marked `competitor: true` with no `competitor_why` refuses the whole answer (exit 2, nothing written — not the records, not the shared leads inbox) — send the refusal back to the same sub-agent to fix, then write again. A competitor job's two lead facts, `competitor_why` and `what_they_sell`, are named in the capability's intent Skill row (migration `agt155_alerts_intent_lead_fields`), so the render asks for them.
   - For a `log …` ask, skip steps 2–4: write `{"records_to_write":[{"kind":"log","title":"<one line>","body":"<what happened>"}]}` to `<scratch>.json` and run `--write` with `--capability` set to the capability the entry concerns (use `career-growth-review` when it concerns none).
6. **Log the turn.** `node scripts/agent-log.js --agent=<id> --capability=<slug> --model=<printed model> --ai-type=agent-turn --feature=<slug>:<intent>:depth0`, where `<intent>` is the capability's `default_intent_slug` (`jm-<suffix>-intent`). Pass token counts only when the session observed them.
7. **Answer John.** Verdict first, in plain words; every claim cites the record it came from (its title) or the source the answer names. Say what was written back.

## (c) The tryout

While `agents.is_active` is false, every run is the tryout and runs attended. The first `career-market-watch` run and the first `career-evidence-mining` run are graded by John against AGT-82's bar. Each cut he makes is stored as a `correction` record whose `data.capability` is the capability slug — `--render` reads every correction for its capability, so the cut reaches the next run without editing a Skill row.

## (d) The schedules

Two scheduled tasks, created with the scheduled-tasks tool ONLY on John's hire word — `agents.is_active` true for the agent. Never in a build, never before the hire. The prompts, verbatim:

- **Sunday 5:00 AM Central:** `/jerry scheduled: --fetch-postings; career-market-watch for each target record; career-match-finder; one push notification with the summary`
  - AGT-156: that run also reads the alert posting records — the `posting` rows whose channel is `linkedin-alert`, written by `career-linkedin-alerts` — and names them in its summary. `career-market-watch` reads those postings and only those; `career-match-finder` is unchanged.
- **Monday 6:00 AM Central:** `/jerry scheduled: career-growth-review; one push notification with the summary`
  - AGT-156: that run also reads the alert posting records (channel `linkedin-alert`) alongside the rest of the reviewed postings it already reads, and names them in its summary.

## (e) The jerry-linkedin-alerts routine

The daily alert review, run without John. This file is the SOURCE and the routine is the copy
(ARCHITECTURE.md §19v); `scripts/check-routine-prompt.js --routine=jerry-linkedin-alerts` is what
compares the two.

| Field | Value | Why |
|---|---|---|
| name | `jerry-linkedin-alerts` | its own routine, separate from `deepbench-runner` and the Sunday/Monday personal tasks (John's call, walkthrough Q5 2026-09-25) |
| cron | `0 13 * * *` (UTC) | daily 8:00 AM CDT, the time John approved. After DST ends 2026-11-01 John sets `0 14 * * *` in the routine; the runbook records `0 13 * * *` and says so here |
| model | the `lane`/`orchestrator` row of `public.model_assignments` at creation | read from the table, never a literal in this file or in the block; `scripts/sync-routine-models.js` re-pins it after a switch |
| sources | `roadmapventure/deepbench-frontend` (branch `dev`) | one clone; the personal records live only in `public.career_records` |
| connectors | Supabase MCP (`mcp__Supabase__*`), plus `WebFetch` and `WebSearch` | the records and the secrets by name; the legit check reads the public job page and the company careers page |
| environment | `env_01GuEzm2nCHbCB5SumvQVEQ1` | the environment the other DeepBench routines run in |
| notifications | off | John asked for no phone push (Q5); the run's record is the ONE summary the block's step 3 names |
| enabled | `true` at creation | John's switch alone |
| routine id | **not yet created** — the attended session that creates the routine fills it here and in `ROUTINES["jerry-linkedin-alerts"].id` | AGT-102 ran the Auditor a week on an unfilled placeholder, so the id is absent by design until it is real, and the prompt block never carries one (the `model-watch` precedent, AGT-146) |
| prompt | the block between `<!-- JERRY-LINKEDIN-ALERTS-PROMPT-BEGIN -->` / `<!-- JERRY-LINKEDIN-ALERTS-PROMPT-END -->` below, byte-identical | the routine-prompt.md convention: the file is the source, the routine the copy |

Update rule, as routine-prompt.md and auditor-routine.md: edit the block → suite → commit → on John's
word `RemoteTrigger update` with the WHOLE `ccr` (`environment_id`, `events`, `session_context`) read
from a fresh `get`, then read back `derived_state.model` and `allowed_tools`. Until the routine
exists, `--routine=jerry-linkedin-alerts` locates a finding by the routine NAME
(`routine/jerry-linkedin-alerts/prompt`), so the fingerprint is the same before and after the id is
filled and filling it is not itself a drift.

### The prompt

<!-- JERRY-LINKEDIN-ALERTS-PROMPT-BEGIN -->
DEEPBENCH JERRY-LINKEDIN-ALERTS — DAILY 8:00 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/personal-agent.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of Jerry Maguire's LinkedIn alert review. The deepbench-frontend clone is beside you: work there, branch from origin/dev, never main. Supabase MCP tools are attached; every secret is read by NAME from public.runner_secrets and exported inline on the one command that needs it — SUPABASE_URL, SUPABASE_SERVICE_KEY, and the mailbox pair YAHOO_IMAP_USER and YAHOO_IMAP_APP_PASSWORD. Never print a secret, never write one to a file, never read one into the session. Read docs/runbooks/personal-agent.md from that clone and follow section (b), with the three steps below in place of its steps 2 to 6.

Step 1 — the mail. Run node scripts/personal-agent.js --fetch-linkedin-alerts, always scanning at least 7 days back so nothing is ever missed, and never fewer. The mailbox is opened read-only; the run dedupes by message uid and by LinkedIn job id and leaves the mailbox exactly as it found it. If the Yahoo connection or the login fails, the run stops there: the first line of the summary is exactly "Yahoo connection failed", and nothing is written.

Step 2 — the review. Run node scripts/personal-agent.js --render --capability=career-linkedin-alerts with that intake file as the input file, then ONE sub-agent on the model the render prints, then node scripts/personal-agent.js --write with the answer it returns. The write files the competitor leads for Nathan Laan itself, from public facts alone. Then log the turn with node scripts/agent-log.js on that same printed model. A refused write goes back to the same sub-agent to fix and is written again; nothing is ever hand-edited into a record.

Step 3 — ONE summary, in this order: scam warnings first; then Apply now, each with its fit, why, a plain rebuilt job link and the nearest contact; then Apply with prep, each with the gap named and the prep; then the Watch and Skip counts with a one-line reason each; then the leads sent; and one line saying so if nothing new arrived. No phone push, no mail, no message to anyone: that summary is the record of this run, and the run ends when it is written.

This run decides and records alone — verdicts, act calls, records, trends, watch-list adds, leads. NEVER apply/message/contact anyone, click email links (tracking - rebuild the public job URL from the job id), log into LinkedIn or any job site, change the mailbox, share personal data outside career_records, spend money.
<!-- JERRY-LINKEDIN-ALERTS-PROMPT-END -->
