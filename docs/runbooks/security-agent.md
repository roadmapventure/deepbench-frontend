<!-- DeepBench v7.0.1015 | docs/runbooks/security-agent.md | AGT-655 -- the security advisor's call path: the ask table, the sequence (inventory first, findings file to the intake last), the weekly watch, the tryout, the three routine prompt blocks the cloud routines copy (ARCHITECTURE.md 19v) and the Security Desk page contract. METHOD ONLY: no client name, no secret value, no finding, no routine id and no model id live in this file -- the repo is public; the inventory, the gaps, the documents and the grades live in the private store public.security_records. -->
# Security agent — the call path

## What this is

The method a Claude session follows to run the security advisor (agent `trenton`, SEC-01, lane personal) over his own rows and the collector's inventory. The user-level `/trenton` skill is a thin loader that points here. Design: `docs/design/TRENTON-SECURITY-ADVISOR-1112.md`. It is the personal-agent call path (`docs/runbooks/personal-agent.md`) with a fourth record store: the security capabilities read and write `public.security_records`, never another store.

- `scripts/security-inventory.js` collects the facts (AGT-654): schema, grants, row-level security, advisor warnings, routes, the MCP server and its connectors, AI use, secret NAMES, hosting, recovery, secrets in new commits. The model never queries a live system; it reads this snapshot.
- `scripts/personal-agent.js --render` reads the capability's security records (heads, not bodies), every `correction` and `grade`, and the newest `inventory` row's facts (the exposure scan also reads the one before it). A section over 40,000 bytes keeps its counts and drops its lists (`truncated: true`); the whole inventory stays under 150,000 bytes. It assembles the prompt through `assemblePrompt()` (§19b). Never hand-build or edit the prompt.
- `scripts/personal-agent.js --write` checks the whole answer (known kinds, titled records; a `gap` names its control, tier `blocker|should_fix|nice_to_have`, fix, effort and cost; a `document` is a `draft`; a `classification` names its store and a label `public|private|client_confidential|personal`; no string anywhere matches a private-scan detector), stores it in one insert, and with `--findings-out=<path>` writes the gaps as a findings ingest file. It never deletes or patches anything.
- `scripts/audit-ledger.js --ingest` files those gaps in the one findings intake; the Governance Architect turns findings into tickets. The advisor never files a ticket.
- `scripts/agent-log.js` logs the turn to `ai_activity_log` (§19k).

Security records are read and written only through these scripts and the Supabase MCP. Never paste an inventory, a gap, a document or a grade into a repository file, a Skill row, or anywhere outside the session scratchpad. Never print or store a secret value: the collector reads secret NAMES only, and the write refuses any value shaped like a key.

## (a) The ask table

| The ask says | What runs |
|---|---|
| `scan` | `security-exposure-scan` |
| `review` | `security-weekly-review` |
| `deep check` | `security-deep-check` |
| `draft <document>` | `security-document-draft` with `--ask="<the document asked for>"` |
| any question | `security-advise` with `--ask="<the question>"` |
| `review this design` | `security-advise` with `--input-file=<the design>` and `--ask="security review of this design"` |
| `grade …` | no capability run — `--write` one `grade` record (below) |
| `approve <document id>` | no capability run — the principal's word only (below) |

A `grade` record carries the principal's score from 1 to 10, his phrase and the record it scores: write `{"records_to_write":[{"kind":"grade","title":"<score>/10","data":{"score":<score>,"phrase":"<his phrase, verbatim>","record_id":"<the graded record id>"}}]}` to `<scratch>.json` and run `--write --capability=security-advise`. Every grade and every correction is read on every later render.

**Approve.** Only on the principal's own word in the session, naming the document. `--write` refuses `approved` from any answer by design, so the session inserts ONE new `document` record over the Supabase MCP: the draft's title, body and data with `data.status: 'approved'` and `data.supersedes: '<the draft's id>'`. The draft row is never edited or deleted.

## (b) The sequence

Personal-agent.md section (b), with `--agent=trenton` and these differences. Work from the runner's checkout (the loader names it) and write every file to the session scratchpad.

1. **Credentials.** Read `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` by NAME from `public.runner_secrets` over the Supabase MCP. Export them inline on each command that needs them. Never print them, never write them to a file.
2. **Inventory first.** `node scripts/security-inventory.js --write --session-name=<name>`; on the principal's machine add `--local --local-config=<path>` (the laptop file scan and the dashboard build folders, which a cloud run cannot see). Cloud runs omit `--local`. A non-zero exit stops the run — report it.
3. **Render.** `node scripts/personal-agent.js --render --agent=trenton --capability=<slug> [--ask=<the ask>] [--input-file=<scratch>-input.md] --out=<scratch>.md --json`. Stderr prints `# model: <id>`; stdout prints `{model, records_loaded, prompt_bytes}`. A non-zero exit stops the run. There is no `--target`.
4. **One sub-agent.** Launch ONE sub-agent with the Agent tool, `model` = the printed model id. Its prompt is one orientation line ("You are running the capability below; return only the JSON object its output contract names, and save it to `<scratch>.json`.") followed by the full contents of `<scratch>.md`.
5. **Write.** `node scripts/personal-agent.js --write --agent=trenton --capability=<slug> --answer=<scratch>.json --session-name=<name> --findings-out=<scratch>-findings.json`. Any broken rule refuses the whole answer (exit 2, nothing written; stderr lists every reason) — send the refusal back to the same sub-agent to fix, then write again. Stdout prints `{inserted, ids, findings_file, urgent}`.
6. **Findings to the intake.** Only when `findings_file` is not null: `node scripts/audit-ledger.js --ingest=<scratch>-findings.json --week=<YYYY-Www> --session-name=<name>` (a dry run: it prints the new / seen / recurring / ruled-out counts and writes nothing), then the same command with `--apply`. The week is this ISO week.
7. **Log the turn.** `node scripts/agent-log.js --agent=trenton --capability=<slug> --model=<printed model> --ai-type=agent-turn --feature=<slug>:<intent>:depth0`, where `<intent>` is the capability's `default_intent_slug` (`sec-<suffix>-intent`, e.g. `sec-advise-intent`). Pass token counts only when the session observed them.
8. **Answer the principal.** Verdict first, in plain words. Every gap comes with its fix, effort and cost — "yes, if…", never just "no" — and every claim rests on an inventory fact or a record. Say what was written back and what went to the intake.

What the advisor decides alone, and what stays the principal's, is design §1 Q4: the GovRAMP target and timing, any spend, accepting a risk, approving a document or an attestation, giving anyone outside the team access, contacting anyone, and the hire are his alone.

## (c) The weekly review's watch

Before the `security-weekly-review` render, the run reads the outside world with its web tool: each `source` record's URL, plus the govramp.org documents and templates, NIST SP 800-53 Rev. 5 and the AI Risk Management Framework pages, CISA advisories, and the vendor trust pages (model provider, database, hosting, backend). The pages go into one `<scratch>-input.md`, each under a heading carrying its URL and the fetch date, and that file is the render's `--input-file`. A page that refuses automated reading is skipped and named in the file ("skipped: <url> — refused automated reading"), never guessed at.

## (d) The tryout (AGT-657)

While `agents.is_active` is false, every run is the tryout and runs attended. The tryout is blind, three questions (design §1 Q6, approved by the principal 2026-11-12), against plain Claude:

1. A county CIO asks: "Does your AI train on our data, and who can see it?" Answer with proof from the company's actual setup.
2. Name the top five things a buyer's security team will flag first in the architecture, each with its fix and its cost.
3. Label the data stores public or private and find a real mismatch, named by table, not described as an idea.

Both sides are handed the SAME inventory and the same security records: the `security-advise` render with the question as `--ask`. The advisor answers through the sequence above; plain Claude gets the same inventory and records with no Skill rows. The two answers are shown to the principal unlabeled, in an order he cannot infer. He scores each 1 to 10 with a phrase; each score is a `grade` record (section (a)). He is hired if he wins two of the three. The hire is the principal's word alone, and so is switching the routines on.

## (e) The routines

Three cloud routines, each run without the principal. This file is the SOURCE and each routine is a copy (ARCHITECTURE.md §19v). All three are created switched off and switched on only at the principal's hire word; never in a build, never before the hire.

| Field | `trenton-exposure-scan` | `trenton-weekly-review` | `trenton-deep-check` | Why |
|---|---|---|---|---|
| cron | `15 11 * * 1-5` (UTC) | `30 11 * * 2` (UTC) | `0 12 1 * *` (UTC) | weekdays 5:15 AM, Tuesday 5:30 AM and the 1st 6:00 AM Central, in CST; when daylight time starts the principal moves each one hour earlier |
| model | the `lane`/`orchestrator` row of `public.model_assignments` at creation | same | same | read from the table, never a literal in this file or in a block |
| sources | this repository, branch `dev` | same | same | one clone; the records live only in the private store |
| connectors | Supabase MCP (`mcp__Supabase__*`) and `WebFetch`, nothing else | same | same | the facts and the secrets by name; the outside reading the watch names |
| notifications | off, except the one urgent-exposure alert (section (f)) | off | off | the Security Desk is the record |
| enabled | `false` | `false` | `false` | the principal's hand at the hire, alone |
| routine id | not yet created | not yet created | not yet created | filled only when the attended session creates the routine, never a placeholder |
| prompt | the block between `<!-- TRENTON-EXPOSURE-SCAN-PROMPT-BEGIN -->` / `<!-- TRENTON-EXPOSURE-SCAN-PROMPT-END -->` below, byte-identical | the block between `<!-- TRENTON-WEEKLY-REVIEW-PROMPT-BEGIN -->` / `<!-- TRENTON-WEEKLY-REVIEW-PROMPT-END -->` below, byte-identical | the block between `<!-- TRENTON-DEEP-CHECK-PROMPT-BEGIN -->` / `<!-- TRENTON-DEEP-CHECK-PROMPT-END -->` below, byte-identical | the file is the source, the routine the copy |

Update rule, as personal-agent.md (e): edit the block → suite → commit → on the principal's word update the routine with the WHOLE configuration read from a fresh get, then read back its model and allowed tools.

### Exposure scan

<!-- TRENTON-EXPOSURE-SCAN-PROMPT-BEGIN -->
STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.

Before anything else, in the clone run: npm ci --no-audit --no-fund --ignore-scripts (the scripts need their packages; this is a no-op if they are already installed).

TRENTON EXPOSURE SCAN — WEEKDAYS 5:15 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/security-agent.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of the security advisor (agent id trenton, lane personal). The repository clone is beside you: work there from origin/dev, never main. Supabase MCP tools are attached; read SUPABASE_URL and SUPABASE_SERVICE_KEY by NAME from public.runner_secrets and export them inline on each command that needs them. Never print a secret, never write one to a file. Read docs/runbooks/security-agent.md from the clone and follow section (b) with --capability=security-exposure-scan, with the steps below.

Step 1 — the facts. Run node scripts/security-inventory.js --write with a session name (no --local: this is a cloud run). Then the comments left on the Security Desk page since the last run go into a comments file in the scratchpad; it is the render's input file. No comments: an empty file.

Step 2 — the scan. Render, ONE sub-agent on the model the render prints, then node scripts/personal-agent.js --write with --findings-out, then, when a findings file was written, node scripts/audit-ledger.js --ingest as a dry run and then with --apply, then log the turn with node scripts/agent-log.js on that same printed model. A refused write goes back to the same sub-agent to fix and is written again; nothing is ever hand-edited into a record.

Step 3 — the alert. Only when the write prints urgent: true, send ONE phone alert with its one-line reason. Otherwise send nothing.

Step 4 — ONE summary: what changed since the last inventory, each new exposure with its fix, effort and cost, and what was written back and filed. That summary is the record of this run, and the run ends when it is written.

This run advises and records alone. It changes no system, grants or revokes nothing, contacts no one, approves no document, files no ticket, and commits or pushes nothing. Never delete a record. Never flip agents.is_active.
<!-- TRENTON-EXPOSURE-SCAN-PROMPT-END -->

### Weekly review

<!-- TRENTON-WEEKLY-REVIEW-PROMPT-BEGIN -->
STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.

Before anything else, in the clone run: npm ci --no-audit --no-fund --ignore-scripts (the scripts need their packages; this is a no-op if they are already installed).

TRENTON WEEKLY REVIEW — TUESDAY 5:30 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/security-agent.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of the security advisor (agent id trenton, lane personal). The repository clone is beside you: work there from origin/dev, never main. Supabase MCP tools are attached; read SUPABASE_URL and SUPABASE_SERVICE_KEY by NAME from public.runner_secrets and export them inline on each command that needs them. Never print a secret, never write one to a file. Read docs/runbooks/security-agent.md from the clone and follow section (b) with --capability=security-weekly-review, with the steps below.

Step 1 — the facts. Run node scripts/security-inventory.js --write with a session name (no --local: this is a cloud run).

Step 2 — the watch. Follow section (c): fetch each source record's URL and the named outside pages with WebFetch, and write them, each with its URL and fetch date, plus the comments left on the Security Desk page since the last review, into one input file in the scratchpad. A page that refuses automated reading is skipped and named.

Step 3 — the review. Render with that input file, ONE sub-agent on the model the render prints, then node scripts/personal-agent.js --write with --findings-out, then, when a findings file was written, node scripts/audit-ledger.js --ingest as a dry run and then with --apply, then log the turn with node scripts/agent-log.js on that same printed model. A refused write goes back to the same sub-agent to fix and is written again.

Step 4 — ONE summary: the change digest (state "no impact" where there is none), the scorecard movement, the top gaps with fix, effort and cost, and what was written back and filed. The run ends when it is written.

This run advises and records alone. It changes no system, grants or revokes nothing, contacts no one, approves no document, files no ticket, and commits or pushes nothing. Never delete a record. Never flip agents.is_active.
<!-- TRENTON-WEEKLY-REVIEW-PROMPT-END -->

### Deep check

<!-- TRENTON-DEEP-CHECK-PROMPT-BEGIN -->
STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.

Before anything else, in the clone run: npm ci --no-audit --no-fund --ignore-scripts (the scripts need their packages; this is a no-op if they are already installed).

TRENTON DEEP CHECK — THE 1ST OF THE MONTH 6:00 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/security-agent.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of the security advisor (agent id trenton, lane personal). The repository clone is beside you: work there from origin/dev, never main. Supabase MCP tools are attached; read SUPABASE_URL and SUPABASE_SERVICE_KEY by NAME from public.runner_secrets and export them inline on each command that needs them. Never print a secret, never write one to a file. Read docs/runbooks/security-agent.md from the clone and follow section (b) with --capability=security-deep-check, with the steps below.

Step 1 — the facts. Run node scripts/security-inventory.js --write with a session name (no --local: this is a cloud run; the laptop file scan waits for an attended run on the principal's machine, and the summary says so).

Step 2 — the check. Render, ONE sub-agent on the model the render prints, then node scripts/personal-agent.js --write with --findings-out, then, when a findings file was written, node scripts/audit-ledger.js --ingest as a dry run and then with --apply, then log the turn with node scripts/agent-log.js on that same printed model. A refused write goes back to the same sub-agent to fix and is written again.

Step 3 — ONE summary: percent of controls met per family, recovery (backup age, last restore drill, replication), the ten gaps a reviewer hits first with fix, effort and cost, and what was written back and filed. The run ends when it is written.

This run advises and records alone. It changes no system, grants or revokes nothing, contacts no one, approves no document, files no ticket, and commits or pushes nothing. Never delete a record. Never flip agents.is_active.
<!-- TRENTON-DEEP-CHECK-PROMPT-END -->

## (f) The Security Desk page contract

One private artifact, pinned to the principal's sidebar, built once by an attended session (AGT-656, never by a routine) and never published beyond the principal.

- **Sections, in order:** Readiness scorecard · Top ten gaps · Data register · Decision log · Change digest · Drafts waiting on you · History.
- **Data:** the page reads `public.security_records` through the artifact's declared Supabase connector, live at view time. No record is copied into the page source.
- **Readiness scorecard:** the newest `scorecard` row — percent of controls met per family.
- **Top ten gaps:** the open `gap` rows ranked blocker, should fix, nice to have — control, risk in plain words, fix, effort, cost.
- **Data register:** the newest `classification` row per store — label, who can read it, the proof.
- **Decision log:** the `decision` rows — decision, reasoning, controls satisfied, residual risk, the principal's acceptance.
- **Change digest:** the newest `digest` row; "no impact" stated where there is none.
- **Drafts waiting on you:** every `document` whose newest row is a `draft`, numbered; the principal approves one by its id (section (a)).
- **History:** past scans, reviews and deep checks with their grades, and the `alert` and `call` rows.
- **Comments:** the principal comments on the page; the next run reads those comments as its input. A comment is never an instruction to change a system, grant access, delete, approve or contact.
- **Alerts:** a phone alert goes out only when an exposure scan's write returns `urgent: true`. Nothing else pushes.
