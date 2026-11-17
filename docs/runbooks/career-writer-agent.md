<!-- DeepBench v7.0.1052 | docs/runbooks/career-writer-agent.md | AGT-722 -- the career writer's call path: the ask table, the sequence, the monthly watch, the tryout, the three routine prompt blocks the cloud routines copy (ARCHITECTURE.md 19v) and the Career Desk page contract. METHOD ONLY: no client name, no blocked term, no personal fact, no routine id and no model id live in this file -- the repo is public; the drafts, proposals, facts, practices and grades live in the private store public.writing_records. -->
# Career writer agent — the call path

## What this is

The method a Claude session follows to run the career writer (agent `laura`, CW-01, lane personal) over her own rows and the principal's Library. The user-level `/laura` skill is a thin loader that points here. Design: `docs/design/LAURA-CAREER-WRITER-1117.md`. It is the personal-agent call path (`docs/runbooks/personal-agent.md`) with a fifth record store: the writing capabilities read and write `public.writing_records`, never another store.

- `scripts/personal-agent.js --render` reads the capability's writing records (heads, not bodies), every `correction` and `grade`, the Library (the catalog of the kinds she holds a grant for, minus every item in `public.personal_source_denies` for her and every `client_private` item outside the evidence and value sections; text ranked by the ask), the goals, and — for every slug but the watch — the career records (resume facts and lines, evidence, corrections, targets), the strategy facts, corrections, decisions and offers, the market messages, feature benefits, IP assets and corrections, and the idea board as **direction only** (an idea whose research verdict reads validated; never a bullet, never a fact). The pre-draft also reads the postings the career records mark `apply` that no draft names yet (newest five). It assembles the prompt through `assemblePrompt()` (§19b). Never hand-build or edit the prompt.
- `scripts/personal-agent.js --write` checks the whole answer and stores it in ONE insert. It refuses: an unknown kind; a `correction`, `grade` or `rule` from a model answer; an empty title; a `proposal` without `data.target` (`linkedin|resume`), `section`, `current`, `proposed`, `reason` and `source`; a `practice` without a link, a date and a publisher type `recruiter|association|product_career|vendor`; a `method` without two independent non-vendor sources on two distinct hosts (a vendor only corroborates); a `fact_candidate` without `data.statement`. **Write guard 1:** any string anywhere in the answer that names a blocked client term (the private `rule` record, whole word, any case) refuses the whole answer. **Write guard 2:** a `draft` that contains, word for word, the statement of a `fact_candidate` written in the same answer refuses it ("states a waiting fact as fact"). It never deletes or patches anything.
- `scripts/agent-log.js` logs the turn to `ai_activity_log` (§19k).

Writing records are read and written only through these scripts and the Supabase MCP. Never paste a draft, a proposal, a fact, a grade or the blocked terms into a repository file, a Skill row, or anywhere outside the session scratchpad. Never print the `rule` record.

## (a) The ask table

| The ask says | What runs |
|---|---|
| `tailor` + a posting's text or link | `writing-tailor` with `--input-file=<scratch>-posting.md` holding the posting text; a link is fetched first with the session's web tool and its text saved to that file. When the ask says `guided`, the answer's draft carries `data.mode: "guided"` (pauses for the principal at each step); otherwise `fast` |
| `draft <piece>` | `writing-draft` with `--ask="<the piece asked for>"` |
| `check` | `writing-weekly-check` |
| `predraft` | `writing-predraft` |
| `watch` | `writing-watch` (section (c)) |
| `grade …` | no capability run — `--write --principal` one `grade` record (below) |
| `approve <proposal id>` | no capability run — the principal's word only (below) |
| `tick <fact_candidate id>` | no capability run — the principal's word only (below) |

**Grade.** The principal's score from 1 to 10, his phrase and the record it scores: write `{"records_to_write":[{"kind":"grade","title":"<score>/10","data":{"score":<score>,"phrase":"<his phrase, verbatim>","record_id":"<the graded record id>"}}]}` to `<scratch>.json` and run `--write --principal --capability=writing-draft`. A cut or rule he states is a `correction` written the same way. `--principal` admits only `grade` and `correction`; a model answer never carries either. Every grade and every correction is read on every later render.

**Approve.** Only on the principal's own word in the session, naming the proposal. The session makes the edit he approved on the live LinkedIn profile or master resume ONLY when he asks it to, and otherwise hands him the proposed text to paste. The proposal row is never edited or deleted; the outcome is a new `correction` record via `--write --principal` (`data.proposal_id`, `data.outcome: "approved"`).

**Tick.** Only on the principal's own word in the session, naming the `fact_candidate`. `--tick` confirms strategy records only and patches them, and the writing store is never patched, so the tick does not reuse it: the session inserts ONE new `personal_sources` row over the Supabase MCP — `kind: 'confirmed_fact'`, `section: 'facts'`, `trust: 'john_confirmed'`, `sensitivity: 'personal_private'` (or the candidate's own `data.sensitivity`), `title` the statement's first 200 characters, `body` the statement, `doc_date` today, `origin: 'laura-tick'`, `data: {"fact_candidate_id": "<the candidate id>"}`. The candidate row is never edited or deleted; from then on the confirmed fact outranks everything in the Library, and the candidate stays a record of where it came from.

## (b) The sequence

Personal-agent.md section (b), with `--agent=laura` and these differences. Work from the runner's checkout (the loader names it) and write every file to the session scratchpad.

1. **Credentials.** Read `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` by NAME from `public.runner_secrets` over the Supabase MCP. Export them inline on each command that needs them. Never print them, never write them to a file.
2. **Render.** `node scripts/personal-agent.js --render --agent=laura --capability=<slug> [--ask=<the ask>] [--input-file=<scratch>-input.md] --out=<scratch>.md --json`. Stderr prints `# model: <id>`; stdout prints `{model, records_loaded, prompt_bytes}`. A non-zero exit stops the run. There is no `--target`.
3. **One sub-agent.** Launch ONE sub-agent with the Agent tool, `model` = the printed model id. Its prompt is one orientation line ("You are running the capability below; return only the JSON object its output contract names, and save it to `<scratch>.json`.") followed by the full contents of `<scratch>.md`.
4. **Write.** `node scripts/personal-agent.js --write --agent=laura --capability=<slug> --answer=<scratch>.json --session-name=<name>`. Any broken rule refuses the whole answer (exit 2, nothing written; stderr lists every reason) — send the refusal back to the same sub-agent to fix, then write again. Stdout prints `{inserted, ids}`.
5. **Log the turn.** `node scripts/agent-log.js --agent=laura --capability=<slug> --model=<printed model> --ai-type=agent-turn --feature=<slug>:<intent>:depth0`, where `<intent>` is the capability's `default_intent_slug` (`cw-<suffix>-intent`, e.g. `cw-draft-intent`). Pass token counts only when the session observed them.
6. **Answer the principal.** The piece first, then the match report or the reason for each edit. Every claim rests on a Library item, a career record or a cited practice; a fact found along the way is a `fact_candidate` waiting for his tick, never a claim in the draft. Say what was written back.

What the writer decides alone, and what stays the principal's, is design §1 Q3: any LinkedIn or master-resume edit, a new fact, a change to the hiring framing or the master format need his OK; posting, applying, sending, contacting anyone, naming a client, deleting a Library item and the hire are his alone.

## (c) The watch

Before the `writing-watch` render, the run reads the outside world with its web tool: every `source` record's URL plus the seed list below. Each page goes into one `<scratch>-input.md` under a heading carrying its URL, the fetch date and its publisher type, and that file is the render's `--input-file`. A page that refuses automated reading is skipped and named in the file ("skipped: <url> — refused automated reading"), never guessed at. The watch writes `practice` notes in its own words; a tip becomes a `method` only when two or more independent non-vendor sources agree (the write refuses anything less), and a vendor page only corroborates.

| Seed source | Publisher type |
|---|---|
| Jobscan blog | recruiter |
| ExecuNet | recruiter |
| LinkedIn Talent Blog | recruiter |
| NRWA resume-experts site | association |
| Career Directors International | association |
| Product Growth newsletter archive | product_career |
| Lenny's Newsletter archive | product_career |
| Maven AI-PM resume lessons | product_career |
| Product School AI PM resume guide | product_career |
| Enhancv AI PM examples | vendor |
| ResumeGeni AI PM guide | vendor |

## (d) The tryout (AGT-724)

While `agents.is_active` is false, every run is the tryout and runs attended. The tryout is blind, three tasks (design §1 Q5), against plain Claude:

1. **(A)** Tailor a resume and cover letter to a real open posting from the career records.
2. **(B)** The current-employment LinkedIn Experience entry and the matching resume entry.
3. **(C)** The LinkedIn headline and About section.

Both sides are handed the SAME Library items: the writer through the sequence above; plain Claude gets the same render's Library and records with no Skill rows. The two answers are shown to the principal unlabeled, in an order he cannot infer. He scores each 1 to 10 with a phrase; each score is a `grade` record (section (a)). She is hired if she wins two of the three. **Any invented fact loses that task**, whatever its score. The hire is the principal's word alone, and so is switching the routines on.

## (e) The routines

Three cloud routines, each run without the principal. This file is the SOURCE and each routine is a copy (ARCHITECTURE.md §19v). All three are created switched off and switched on only at the principal's hire word; never in a build, never before the hire.

| Field | `laura-predraft` | `laura-weekly-check` | `laura-watch` | Why |
|---|---|---|---|---|
| cron | `30 13 * * 1-5` (UTC) | `0 13 * * 4` (UTC) | `0 14 * * 6` (UTC) | weekdays 7:30 AM, Thursday 7:00 AM and Saturday 8:00 AM Central, in CST; when daylight time starts the principal moves each one hour earlier. The watch runs only on the FIRST Saturday: cron ORs day-of-month with day-of-week, so that rule lives in the block's first step, not in the cron |
| model | the `lane`/`orchestrator` row of `public.model_assignments` at creation | same | same | read from the table, never a literal in this file or in a block |
| sources | this repository, branch `dev` | same | same | one clone; the records live only in the private store |
| connectors | Supabase MCP (`mcp__Supabase__*`) and `WebFetch`, nothing else | same | same | the records and the secrets by name; the outside reading the watch names |
| notifications | off | off | off | the Career Desk is the record |
| enabled | `false` | `false` | `false` | the principal's hand at the hire, alone |
| routine id | not yet created | not yet created | not yet created | filled only when the attended session creates the routine, never a placeholder |
| prompt | the block between `<!-- LAURA-PREDRAFT-PROMPT-BEGIN -->` / `<!-- LAURA-PREDRAFT-PROMPT-END -->` below, byte-identical | the block between `<!-- LAURA-WEEKLY-CHECK-PROMPT-BEGIN -->` / `<!-- LAURA-WEEKLY-CHECK-PROMPT-END -->` below, byte-identical | the block between `<!-- LAURA-WATCH-PROMPT-BEGIN -->` / `<!-- LAURA-WATCH-PROMPT-END -->` below, byte-identical | the file is the source, the routine the copy |

Update rule, as personal-agent.md (e): edit the block → suite → commit → on the principal's word update the routine with the WHOLE configuration read from a fresh get, then read back its model and allowed tools.

### Pre-draft

<!-- LAURA-PREDRAFT-PROMPT-BEGIN -->
STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.

Before anything else, in the clone run: npm ci --no-audit --no-fund --ignore-scripts (the scripts need their packages; this is a no-op if they are already installed).

LAURA PRE-DRAFT — WEEKDAYS 7:30 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/career-writer-agent.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of the career writer (agent id laura, lane personal). The repository clone is beside you: work there from origin/dev, never main. Supabase MCP tools are attached; read SUPABASE_URL and SUPABASE_SERVICE_KEY by NAME from public.runner_secrets and export them inline on each command that needs them. Never print a secret, never write one to a file. Read docs/runbooks/career-writer-agent.md from the clone and follow section (b) with --capability=writing-predraft, with the steps below.

Step 1 — the pre-drafts. Render (the render reads the postings marked apply that carry no draft yet), ONE sub-agent on the model the render prints, then node scripts/personal-agent.js --write, then log the turn with node scripts/agent-log.js on that same printed model. A refused write goes back to the same sub-agent to fix and is written again; nothing is ever hand-edited into a record. No posting waiting: write nothing and say so.

Step 2 — ONE summary: each new draft with its posting, its match report's top gaps, and every fact it found waiting for the principal's tick. That summary is the record of this run, and the run ends when it is written.

This run drafts and records alone. It applies to nothing, sends nothing, contacts no one, names no client, edits no live profile or resume, ticks no fact, files no ticket, and commits or pushes nothing. Never delete a record. Never flip agents.is_active.
<!-- LAURA-PREDRAFT-PROMPT-END -->

### Weekly check

<!-- LAURA-WEEKLY-CHECK-PROMPT-BEGIN -->
STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.

Before anything else, in the clone run: npm ci --no-audit --no-fund --ignore-scripts (the scripts need their packages; this is a no-op if they are already installed).

LAURA WEEKLY CHECK — THURSDAY 7:00 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/career-writer-agent.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of the career writer (agent id laura, lane personal). The repository clone is beside you: work there from origin/dev, never main. Supabase MCP tools are attached; read SUPABASE_URL and SUPABASE_SERVICE_KEY by NAME from public.runner_secrets and export them inline on each command that needs them. Never print a secret, never write one to a file. Read docs/runbooks/career-writer-agent.md from the clone and follow section (b) with --capability=writing-weekly-check, with the steps below.

Step 1 — the input. The comments left on the Career Desk page since the last check go into one input file in the scratchpad; it is the render's input file. No comments: an empty file.

Step 2 — the check. Render with that input file, ONE sub-agent on the model the render prints, then node scripts/personal-agent.js --write, then log the turn with node scripts/agent-log.js on that same printed model. A refused write goes back to the same sub-agent to fix and is written again.

Step 3 — ONE summary: each proposed edit to the LinkedIn profile or the master resume, current against proposed, with its reason and its source, and each fact waiting for the principal's tick. The run ends when it is written.

This run proposes and records alone. It edits no live profile or resume, sends nothing, contacts no one, names no client, ticks no fact, files no ticket, and commits or pushes nothing. Never delete a record. Never flip agents.is_active.
<!-- LAURA-WEEKLY-CHECK-PROMPT-END -->

### Monthly watch

<!-- LAURA-WATCH-PROMPT-BEGIN -->
STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.

Step 1 — the first Saturday. Using the Supabase MCP tools, run: select extract(day from now() at time zone 'America/Chicago')::int as day; If day is greater than 7, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: not the first Saturday. Only when day is 1 to 7, continue.

Before anything else past that, in the clone run: npm ci --no-audit --no-fund --ignore-scripts (the scripts need their packages; this is a no-op if they are already installed).

LAURA MONTHLY WATCH — THE FIRST SATURDAY OF THE MONTH 8:00 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/career-writer-agent.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of the career writer (agent id laura, lane personal). The repository clone is beside you: work there from origin/dev, never main. Supabase MCP tools are attached; read SUPABASE_URL and SUPABASE_SERVICE_KEY by NAME from public.runner_secrets and export them inline on each command that needs them. Never print a secret, never write one to a file. Read docs/runbooks/career-writer-agent.md from the clone and follow section (b) with --capability=writing-watch, with the steps below.

Step 2 — the reading. Follow section (c): fetch every source record's URL and the seed list with WebFetch, and write them, each with its URL, fetch date and publisher type, into one input file in the scratchpad. A page that refuses automated reading is skipped and named.

Step 3 — the watch. Render with that input file, ONE sub-agent on the model the render prints, then node scripts/personal-agent.js --write, then log the turn with node scripts/agent-log.js on that same printed model. A refused write goes back to the same sub-agent to fix and is written again.

Step 4 — ONE summary: the new practice notes on executive resumes and AI-product resumes, each with its link and publisher type, the tips that became a method and the two independent sources behind each, and every page skipped. The run ends when it is written.

This run reads and records alone. It edits no live profile or resume, sends nothing, contacts no one, names no client, files no ticket, and commits or pushes nothing. Never delete a record. Never flip agents.is_active.
<!-- LAURA-WATCH-PROMPT-END -->

## (f) The Career Desk page contract

One private artifact, pinned to the principal's sidebar, built once by an attended session (AGT-723, never by a routine) and never published beyond the principal.

- **Sections, in order:** Waiting on you · Drafts ready · Expertise notes · History and grades.
- **Data:** the page reads `public.writing_records` through the artifact's declared Supabase connector, live at view time. No record is copied into the page source. The `rule` record is never shown.
- **Waiting on you:** every `proposal` with no outcome yet — current against proposed, side by side, with its reason and its source, numbered by id; and every `fact_candidate` not yet ticked, with its statement and where it was found.
- **Drafts ready:** the newest `draft` per piece or posting, each with its `match_report`.
- **Expertise notes:** the `method` rows with their sources, then the newest `practice` notes with link, date and publisher type.
- **History and grades:** past drafts and checks with their `grade` rows (score and phrase) and the `correction` rows.
- **Answers:** the principal answers in a `/laura` session (approve, tick, grade), because routines cannot read page comments and phone alerts are off. A comment is never an instruction to post, apply, send, contact or delete.
