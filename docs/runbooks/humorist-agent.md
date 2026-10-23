<!-- DeepBench v7.0.893 | docs/runbooks/humorist-agent.md | AGT-543 -- the humorist's call path: the ask table, the sequence, the tryout and the two routine prompt blocks the cloud routines copy (ARCHITECTURE.md 19v). METHOD ONLY: no personal fact, no graded quip text, no customer, client, prospect or product name, no routine id and no model id live in this file -- the repo is public; the samples, grades and deny list live in public.humor_records. -->
# Humorist agent — the call path

## What this is

The method a Claude session follows to run the humorist (agent `dilbert`, HW-01, lane personal) over his own rows. The user-level `/dilbert` skill is a thin loader that points here. Every step is a script except the single sub-agent turn, which runs on the session's subscription. It is the personal-agent call path (`docs/runbooks/personal-agent.md`) with a second record store: the humor capabilities read and write `public.humor_records`, never `career_records`.

- `scripts/personal-agent.js --render` reads the capability's humor records, every humor `correction`, and the extra reads its slug names (the last 14 days of product-lane copy, career-lane posting titles, market requirements and reviews; the Napkin entries not yet noted under the agent's own column; the personal sources he holds a grant for; the week's ships and recorded decisions), then assembles the prompt through `assemblePrompt()` (§19b). Never hand-build or edit the prompt.
- `scripts/personal-agent.js --write` checks every draft (the sunglasses emoji last, at most 280 characters, plain ASCII otherwise, at most one exclamation mark, no hashtag, no deny-list name, at least one source reference), stores the answer in `public.humor_records` with each draft's character and word count, and writes each Napkin note into the agent's own two columns.
- `scripts/agent-log.js` logs the turn to `ai_activity_log` (§19k).

Personal data is read and written only through these scripts and the Supabase MCP. Never paste a record, a draft or a grade into a repository file, a Skill row, or anywhere outside the session scratchpad.

## (a) The ask table

| The ask says | What runs |
|---|---|
| `draft` | `humor-weekly-draft` |
| `polish` | `humor-weekly-draft` with `--ask=polish` |
| `topics` | `humor-topic-scout` |
| `grade …` | no capability run — `--write` one `grade` record (below) |

A `grade` record carries John's score from 1 to 10, his phrase, and the draft it scores: write `{"records_to_write":[{"kind":"grade","title":"<score>/10","body":"<his phrase, verbatim>","data":{"score":<score>,"draft_id":"<the draft record id>"}}]}` to `<scratch>.json` and run `--write --capability=humor-weekly-draft`.

## (b) The sequence

Personal-agent.md section (b), with `--agent=dilbert` and these differences. Work from the runner's checkout (the loader names it) and write every file to the session scratchpad.

1. **Credentials.** Read `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` by NAME from `public.runner_secrets` over the Supabase MCP. Export them inline on each command that needs them. Never print them, never write them to a file.
2. **The news, first.** WebFetch the three outlets John named, and only these: `https://mashable.com/feeds/rss/all`, `https://www.wired.com/feed/rss`, `https://techcrunch.com/feed/`. Save the last seven days of items (title, link, date, outlet) to `<scratch>-news.md`; it is the render's `--input-file`. No open search. An outlet that fails is named in the answer to John and skipped, never invented.
3. **Render.** `node scripts/personal-agent.js --render --agent=dilbert --capability=<slug> [--ask=<the ask>] --input-file=<scratch>-news.md --out=<scratch>.md --json`. Stderr prints `# model: <id>`; stdout prints `{model, records_loaded, prompt_bytes}`. A non-zero exit stops the run — report the message, do not work around it. There is no `--target`.
4. **One sub-agent.** Launch ONE sub-agent with the Agent tool, `model` = the printed model id. Its prompt is one orientation line ("You are running the capability below; return only the JSON object its output contract names, and save it to `<scratch>.json`.") followed by the full contents of `<scratch>.md`.
5. **Write.** `node scripts/personal-agent.js --write --agent=dilbert --capability=<slug> --answer=<scratch>.json [--session-name=<n>]`. One draft that breaks a write-check rule refuses the whole answer (exit 2, nothing written; the reason on stderr names the draft and the rule, never a deny-list entry) — send the refusal back to the same sub-agent to fix, then write again. Stdout prints `{inserted, ids, napkin_notes, target, drafts}`: `drafts` is each stored draft's `char_count`, `word_count` and `over_target` against the ~200 target, which is a target and never a quota. A missing deny list prints `no phrase_set deny_list -- deny check skipped` on stderr: say so to John.
6. **Log the turn.** `node scripts/agent-log.js --agent=dilbert --capability=<slug> --model=<printed model> --ai-type=agent-turn --feature=<slug>:<intent>:depth0`, where `<intent>` is `hw-weekly-draft-intent` or `hw-topic-scout-intent` (the capability's `default_intent_slug`). Pass token counts only when the session observed them.
7. **Answer John.** Each post shown carries its character count, its word count and its sources (the records and news items it cites); the sources are never part of the post. Say what was written back and which Napkin entries were noted.

## (c) The tryout

While `agents.is_active` is false, every run is the tryout and runs attended. The tryout is grading round four: John scores each draft shown from 1 to 10 with a phrase. Each score is a `grade` record (section (a)); each phrase is also a `correction` record whose `data.grade_id` is that grade's id, title the rule the phrase states, body the phrase verbatim. `--render` reads every humor correction, so the phrase reaches the next run without editing a Skill row. The bar: John posts one as written. The hire is his word alone.

## (d) The routines

Two cloud routines, each run without John. This file is the SOURCE and each routine is a copy (ARCHITECTURE.md §19v). Both are created switched off and switched on only at John's hire word; never in a build, never before the hire.

| Field | `humorist-wednesday-draft` | `humorist-friday-polish` | Why |
|---|---|---|---|
| cron | `0 12 * * 3` (UTC) | `0 15 * * 5` (UTC) | Wednesday 7:00 AM CDT and Friday 10:00 AM CDT, the times John approved. After DST ends 2026-11-01 John sets `0 13 * * 3` and `0 16 * * 5`; the runbook records the CDT values and says so here |
| model | the `lane`/`orchestrator` row of `public.model_assignments` at creation | same | read from the table, never a literal in this file or in a block |
| sources | this repository, branch `dev` | same | one clone; the humor records live only in `public.humor_records` |
| connectors | Supabase MCP (`mcp__Supabase__*`) and `WebFetch`, nothing else | same | the records and the secrets by name; the three named news feeds |
| environment | `env_01GuEzm2nCHbCB5SumvQVEQ1` | same | the environment the other agent routines run in |
| notifications | off | off | no phone push; the run's record is its ONE summary |
| enabled | `false` — John's switch alone, at the hire | same | John's switch alone |
| routine id | not yet created | not yet created | filled only when the attended session creates the routine, never a placeholder |
| prompt | the block between `<!-- HUMORIST-WEDNESDAY-PROMPT-BEGIN -->` / `<!-- HUMORIST-WEDNESDAY-PROMPT-END -->` below, byte-identical | the block between `<!-- HUMORIST-FRIDAY-PROMPT-BEGIN -->` / `<!-- HUMORIST-FRIDAY-PROMPT-END -->` below, byte-identical | the file is the source, the routine the copy |

Update rule, as personal-agent.md (e): edit the block → suite → commit → on John's word update the routine with the WHOLE configuration read from a fresh get, then read back its model and allowed tools.

## (e) The prompts

### Wednesday

<!-- HUMORIST-WEDNESDAY-PROMPT-BEGIN -->
STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.

HUMORIST WEDNESDAY DRAFT — WEDNESDAY 7:00 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/humorist-agent.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of the humorist agent (agent id dilbert, lane personal). The repository clone is beside you: work there from origin/dev, never main. Supabase MCP tools are attached; read SUPABASE_URL and SUPABASE_SERVICE_KEY by NAME from public.runner_secrets and export them inline on the one command that needs them. Never print a secret, never write one to a file. Read docs/runbooks/humorist-agent.md from the clone and follow section (b), with the steps below.

Step 1 — the news. WebFetch the three outlets John named, and only these: https://mashable.com/feeds/rss/all, https://www.wired.com/feed/rss, https://techcrunch.com/feed/. Save the last seven days of items (title, link, date, outlet) to a news file in the scratchpad. No open search. An outlet that fails is named in the summary and skipped, never invented.

Step 2 — the topic scout. Run node scripts/personal-agent.js --render --agent=dilbert --capability=humor-topic-scout with the news file as the input file, then ONE sub-agent on the model the render prints, then node scripts/personal-agent.js --write with the answer it returns, then log the turn with node scripts/agent-log.js on that same printed model.

Step 3 — the drafts. The same four moves for humor-weekly-draft, with the same news file: about twenty drafts, each self-graded, written to the humor records with their character and word counts and their sources; the Napkin notes are written by the write itself. A refused write goes back to the same sub-agent to fix and is written again; nothing is ever hand-edited into a record.

Step 4 — ONE summary: the top five drafts, each with its character count, its word count and its sources; then five topic suggestions; then the Napkin entries noted; then any outlet that failed. That summary is the record of this run, and the run ends when it is written.

This run drafts and records alone. No push notification, no mail, no message to anyone; nothing is published or posted, and nothing is committed or pushed. Never flip agents.is_active.
<!-- HUMORIST-WEDNESDAY-PROMPT-END -->

### Friday

<!-- HUMORIST-FRIDAY-PROMPT-BEGIN -->
STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.

HUMORIST FRIDAY POLISH — FRIDAY 10:00 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/humorist-agent.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of the humorist agent (agent id dilbert, lane personal). The repository clone is beside you: work there from origin/dev, never main. Supabase MCP tools are attached; read SUPABASE_URL and SUPABASE_SERVICE_KEY by NAME from public.runner_secrets and export them inline on the one command that needs them. Never print a secret, never write one to a file. Read docs/runbooks/humorist-agent.md from the clone and follow section (b), with the steps below.

Step 1 — the grades. Over the Supabase MCP, read this week's grade records in public.humor_records (kind grade, created in the last seven days) and every correction record. For each grade whose id no correction carries in data.grade_id, write ONE correction with node scripts/personal-agent.js --write --agent=dilbert --capability=humor-weekly-draft: title the rule the grade's phrase states, body the phrase verbatim, data.grade_id the grade's id.

Step 2 — the news. WebFetch the three outlets John named, and only these: https://mashable.com/feeds/rss/all, https://www.wired.com/feed/rss, https://techcrunch.com/feed/. Save the last seven days of items (title, link, date, outlet) to a news file in the scratchpad. No open search. An outlet that fails is named in the summary and skipped, never invented.

Step 3 — the polish. Run node scripts/personal-agent.js --render --agent=dilbert --capability=humor-weekly-draft --ask=polish with the news file as the input file, then ONE sub-agent on the model the render prints, then node scripts/personal-agent.js --write with the answer it returns, then log the turn with node scripts/agent-log.js on that same printed model. The answer is the top three, rewritten along this week's grades. If no grade arrived this week, the three are the drafts with the highest self_grade, and the summary's first line says so. A refused write goes back to the same sub-agent to fix and is written again; nothing is ever hand-edited into a record.

Step 4 — ONE summary, by noon Central: the three posts, each with its character count, its word count and its sources; then the grades applied as corrections; then any outlet that failed. That summary is the record of this run, and the run ends when it is written.

This run polishes and records alone. No push notification, no mail, no message to anyone; nothing is published or posted, and nothing is committed or pushed. Never flip agents.is_active.
<!-- HUMORIST-FRIDAY-PROMPT-END -->
