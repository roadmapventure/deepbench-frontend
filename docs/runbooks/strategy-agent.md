<!-- DeepBench v7.0.1006 | docs/runbooks/strategy-agent.md | AGT-644 -- the strategy consultant's call path: the ask table, the sequence, the tryout, the three routine prompt blocks the cloud routines copy (ARCHITECTURE.md 19v) and the Strategy Desk page contract. METHOD ONLY: no personal fact, no client, customer, prospect or product name, no price, no routine id and no model id live in this file -- the repo is public; the Library, the menu, the briefs and the grades live in the private stores. -->
# Strategy agent — the call path

## What this is

The method a Claude session follows to run the strategy consultant (agent `harry`, SC-01, lane personal) over his own rows and the principal's Library. The user-level `/harry` skill is a thin loader that points here. Every step is a script except the single sub-agent turn, which runs on the session's subscription. It is the personal-agent call path (`docs/runbooks/personal-agent.md`) with a third record store: the strategy capabilities read and write `public.strategy_records`, never `career_records` or `humor_records`.

- `scripts/personal-agent.js --render` reads the capability's strategy records (heads, not bodies), every strategy `correction` and `grade`, and the extra reads its slug names: the **Library** (the catalog of every current item of a kind he holds a grant for, labels only, plus the text of only the sections the capability needs, capped at 200,000 bytes), recent product-lane copy, career-lane posting titles and market requirements, the idea board with its research verdicts, the week's ships and recorded decisions, and, for the readiness check and the weekly review, the vision corpus `docs/vision/*.md`. It never reads an original file's bytes. It assembles the prompt through `assemblePrompt()` (§19b). Never hand-build or edit the prompt.
- `scripts/personal-agent.js --write` checks the whole answer (known kinds, titled records, an `offer` that proposes a price also states its basis, a curating answer's labels name a real section, trust level and sensitivity), stores it in `public.strategy_records` in one insert, and, for `strategy-library-curate` only, writes each label onto its catalog row. It never deletes anything.
- `scripts/agent-log.js` logs the turn to `ai_activity_log` (§19k).

Personal data is read and written only through these scripts and the Supabase MCP. Never paste a Library item, a brief, a price or a grade into a repository file, a Skill row, or anywhere outside the session scratchpad. In any output meant for the public, name no engagement client; describe client work in generic words.

## (a) The ask table

| The ask says | What runs |
|---|---|
| `brief` | `strategy-daily-brief` |
| `review` | `strategy-weekly-review` |
| `readiness` | `strategy-readiness-check` |
| `curate` | `strategy-library-curate` |
| any question | `strategy-advise` with `--ask="<the question>"` |
| `review this draft` | `strategy-advise` with `--input-file=<the draft>` and `--ask="business-accuracy review"` |
| `grade …` | no capability run — `--write` one `grade` record (below) |

A `grade` record carries the principal's score from 1 to 10, his phrase, and the brief it scores: write `{"records_to_write":[{"kind":"grade","title":"<score>/10","data":{"score":<score>,"phrase":"<his phrase, verbatim>","brief_id":"<the brief record id>"}}]}` to `<scratch>.json` and run `--write --capability=strategy-daily-brief`. Every grade and every correction is read on every later render, so the phrase reaches the next run without editing a Skill row.

## (b) The sequence

Personal-agent.md section (b), with `--agent=harry` and these differences. Work from the runner's checkout (the loader names it) and write every file to the session scratchpad.

1. **Credentials.** Read `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` by NAME from `public.runner_secrets` over the Supabase MCP. Export them inline on each command that needs them. Never print them, never write them to a file.
2. **Render.** `node scripts/personal-agent.js --render --agent=harry --capability=<slug> [--ask=<the ask>] [--input-file=<path>] --out=<scratch>.md --json`. Stderr prints `# model: <id>`; stdout prints `{model, records_loaded, prompt_bytes}`. `personal-agent: library text capped at 200000 bytes` on stderr means some section text was left out and only its catalog line reached the prompt: say so to the principal. A non-zero exit stops the run — report the message, do not work around it. There is no `--target`.
3. **One sub-agent.** Launch ONE sub-agent with the Agent tool, `model` = the printed model id. Its prompt is one orientation line ("You are running the capability below; return only the JSON object its output contract names, and save it to `<scratch>.json`.") followed by the full contents of `<scratch>.md`.
4. **Write.** `node scripts/personal-agent.js --write --agent=harry --capability=<slug> --answer=<scratch>.json [--session-name=<n>]`. Any broken rule refuses the whole answer (exit 2, nothing written; stderr lists every reason) — send the refusal back to the same sub-agent to fix, then write again. Stdout prints `{inserted, ids, labels_patched}`.
5. **Log the turn.** `node scripts/agent-log.js --agent=harry --capability=<slug> --model=<printed model> --ai-type=agent-turn --feature=<slug>:<intent>:depth0`, where `<intent>` is the capability's `default_intent_slug` (`sc-<suffix>-intent`, e.g. `sc-advise-intent`). Pass token counts only when the session observed them.
6. **Answer the principal.** Verdict first, in plain words; every recommendation carries its evidence (the Library item or record it rests on) and a confidence. A proposed price always comes with its basis; the principal sets the number. Say what was written back.

## (c) The tryout (AGT-646)

While `agents.is_active` is false, every run is the tryout and runs attended. The tryout is blind, three questions, against plain Claude:

1. What to sell first, to whom, and at what price.
2. How the dashboard line and the agent platform become one product.
3. What makes the company more valuable to an acquirer within 12 months, and who is likely to buy.

Both sides are handed the SAME core Library render: the `strategy-advise` render with the question as `--ask`. The consultant answers through the sequence above; plain Claude gets the Library and the question with no Skill rows. The two answers are shown to the principal unlabeled, in an order he cannot infer. He scores each 1 to 10 with a phrase; each score is a `grade` record (section (a), `data.brief_id` = the answer's record id where one exists) and each phrase is also a `correction` record whose `data.grade_id` is that grade's id. He is hired if he wins two of the three. The hire is the principal's word alone, and so is switching the routines on.

## (d) The routines

Three cloud routines, each run without the principal. This file is the SOURCE and each routine is a copy (ARCHITECTURE.md §19v). All three are created switched off and switched on only at the principal's hire word; never in a build, never before the hire.

| Field | `harry-daily-brief` | `harry-weekly-review` | `harry-readiness-check` | Why |
|---|---|---|---|---|
| cron | `30 12 * * 1-5` (UTC) | `0 13 * * 1` (UTC) | `30 13 1 * *` (UTC) | weekdays 6:30 AM, Monday 7:00 AM and the 1st 7:30 AM Central, in CST; when daylight time starts the principal moves each one hour earlier |
| model | the `lane`/`orchestrator` row of `public.model_assignments` at creation | same | same | read from the table, never a literal in this file or in a block |
| sources | this repository, branch `dev` | same | same | one clone; the records live only in the private stores |
| connectors | Supabase MCP (`mcp__Supabase__*`) and `WebFetch`, nothing else | same | same | the records and the secrets by name; the outside reading the design names |
| notifications | off, except the one urgent-brief alert (section (e)) | off | off | the Strategy Desk is the record |
| enabled | `false` — the principal's switch alone, at the hire | same | same | the principal's switch alone |
| routine id | not yet created | not yet created | not yet created | filled only when the attended session creates the routine, never a placeholder |
| prompt | the block between `<!-- HARRY-DAILY-BRIEF-PROMPT-BEGIN -->` / `<!-- HARRY-DAILY-BRIEF-PROMPT-END -->` below, byte-identical | the block between `<!-- HARRY-WEEKLY-REVIEW-PROMPT-BEGIN -->` / `<!-- HARRY-WEEKLY-REVIEW-PROMPT-END -->` below, byte-identical | the block between `<!-- HARRY-READINESS-CHECK-PROMPT-BEGIN -->` / `<!-- HARRY-READINESS-CHECK-PROMPT-END -->` below, byte-identical | the file is the source, the routine the copy |

Update rule, as personal-agent.md (e): edit the block → suite → commit → on the principal's word update the routine with the WHOLE configuration read from a fresh get, then read back its model and allowed tools.

### Daily brief

<!-- HARRY-DAILY-BRIEF-PROMPT-BEGIN -->
STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.

HARRY DAILY BRIEF — WEEKDAYS 6:30 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/strategy-agent.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of the strategy consultant (agent id harry, lane personal). The repository clone is beside you: work there from origin/dev, never main. Supabase MCP tools are attached; read SUPABASE_URL and SUPABASE_SERVICE_KEY by NAME from public.runner_secrets and export them inline on the one command that needs them. Never print a secret, never write one to a file. Read docs/runbooks/strategy-agent.md from the clone and follow section (b), with the steps below.

Step 1 — the comments. Read the comments left on the Strategy Desk page since the last brief, and save them to a comments file in the scratchpad; it is the render's input file. No comments: an empty file.

Step 2 — the brief. Run node scripts/personal-agent.js --render --agent=harry --capability=strategy-daily-brief with the comments file as the input file, then ONE sub-agent on the model the render prints, then node scripts/personal-agent.js --write with the answer it returns, then log the turn with node scripts/agent-log.js on that same printed model. A refused write goes back to the same sub-agent to fix and is written again; nothing is ever hand-edited into a record.

Step 3 — the alert. Only when the written brief carries urgent: true, send ONE phone alert with its one-line reason. Otherwise send nothing.

Step 4 — ONE summary: the brief's headline, its top three moves, each with its evidence and confidence, and what was written back. That summary is the record of this run, and the run ends when it is written.

This run advises and records alone. No mail, no message to anyone; nothing is published, priced or promised, and nothing is committed or pushed. Never delete a Library item. Never flip agents.is_active.
<!-- HARRY-DAILY-BRIEF-PROMPT-END -->

### Weekly review

<!-- HARRY-WEEKLY-REVIEW-PROMPT-BEGIN -->
STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.

HARRY WEEKLY REVIEW — MONDAY 7:00 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/strategy-agent.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of the strategy consultant (agent id harry, lane personal). The repository clone is beside you: work there from origin/dev, never main. Supabase MCP tools are attached; read SUPABASE_URL and SUPABASE_SERVICE_KEY by NAME from public.runner_secrets and export them inline on the one command that needs them. Never print a secret, never write one to a file. Read docs/runbooks/strategy-agent.md from the clone and follow section (b), with the steps below.

Step 1 — the comments. Read the comments left on the Strategy Desk page in the last seven days, and save them to a comments file in the scratchpad; it is the render's input file.

Step 2 — the curation. Run the four moves of section (b) for strategy-library-curate: render, ONE sub-agent on the printed model, write, log. The write files the labels for unlabelled Library items and the gap records; it never deletes.

Step 3 — the review. The same four moves for strategy-weekly-review with the comments file as the input file: the offering menu, the roadmap and the merge plan, the acquirer watch and the idea board, each change with its evidence and confidence. A refused write goes back to the same sub-agent to fix and is written again; nothing is ever hand-edited into a record.

Step 4 — ONE summary: what changed on the menu, the roadmap and the acquirer watch, the Library items labelled and the gaps filed. That summary is the record of this run, and the run ends when it is written.

This run advises and records alone. No push notification, no mail, no message to anyone; nothing is published, priced or promised, and nothing is committed or pushed. Never delete a Library item. Never flip agents.is_active.
<!-- HARRY-WEEKLY-REVIEW-PROMPT-END -->

### Readiness check

<!-- HARRY-READINESS-CHECK-PROMPT-BEGIN -->
STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.

HARRY READINESS CHECK — THE 1ST OF THE MONTH 7:30 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/strategy-agent.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of the strategy consultant (agent id harry, lane personal). The repository clone is beside you: work there from origin/dev, never main. Supabase MCP tools are attached; read SUPABASE_URL and SUPABASE_SERVICE_KEY by NAME from public.runner_secrets and export them inline on the one command that needs them. Never print a secret, never write one to a file. Read docs/runbooks/strategy-agent.md from the clone and follow section (b), with the steps below.

Step 1 — the check. Run node scripts/personal-agent.js --render --agent=harry --capability=strategy-readiness-check, then ONE sub-agent on the model the render prints, then node scripts/personal-agent.js --write with the answer it returns, then log the turn with node scripts/agent-log.js on that same printed model. A refused write goes back to the same sub-agent to fix and is written again; nothing is ever hand-edited into a record.

Step 2 — ONE summary: what would make the company more valuable to an acquirer this month, scored against last month's readiness record, and the acquirers whose fit changed, each with its evidence and confidence. That summary is the record of this run, and the run ends when it is written.

This run advises and records alone. No push notification, no mail, no message to anyone; nothing is published, priced or promised, and no one is contacted; nothing is committed or pushed. Never delete a Library item. Never flip agents.is_active.
<!-- HARRY-READINESS-CHECK-PROMPT-END -->

## (e) The Strategy Desk page contract

One private artifact, pinned to the principal's sidebar, built once by an attended session (never by a routine) and never published beyond the principal.

- **Sections, in order:** Today's brief · Offering menu · Acquirer watch · Roadmap and the merge plan · Library health · History.
- **Data:** the page reads `public.strategy_records` (and, for Library health, the catalog columns of `public.personal_sources` — never a body, never a file) through the artifact's declared Supabase connector, live at view time. No record is copied into the page source.
- **Today's brief:** the newest `brief` row; its moves, evidence and confidence; its grade if one exists.
- **Offering menu:** the newest `offer` row per offer — buyer, outcome, proof, status, price model, and any proposed price shown beside its basis, marked as a proposal the principal has not set.
- **Acquirer watch:** the `acquirer` rows — company, past deals, what it paid for, why it fits.
- **Roadmap and the merge plan:** the `roadmap` rows grouped by product line, with the plan for bringing the dashboard line and the agent platform together.
- **Library health:** item counts by section and trust, unlabelled items, superseded items, and the open `gap` rows.
- **History:** past briefs, reviews and readiness checks with their grades, and the `call` rows with their outcomes.
- **Comments:** the principal comments on the page; the next run reads those comments as its input (section (d), step 1). A comment is never an instruction to delete, price, publish or contact.
- **Alerts:** a phone alert goes out only when a brief returns `urgent: true` (daily brief, step 3). Nothing else pushes.
