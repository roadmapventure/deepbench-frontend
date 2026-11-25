<!-- DeepBench v7.0.1123 | docs/runbooks/gov-sales-agent.md | AGT-810 -- the government sales agent's call path: the ask table, the sequence, the twice-weekly solicitation scan, the push rule, the agency crawl and the two routine prompt blocks the cloud routines copy (ARCHITECTURE.md 19v). METHOD ONLY: no client name, no routine id and no model id live in this file -- the repo is public; the solicitations, ratings, statuses, keywords and agencies live in the private store public.sales_records. -->
# Government sales agent — the call path

## What this is

The method a Claude session follows to run the government sales agent (agent `bill`, GS-01, lane personal) over his own rows. The user-level `/bill` loader is a thin file that points here. Design: `docs/design/BILL-GOV-SALES-1125.md`. It is the personal-agent call path (`docs/runbooks/personal-agent.md`) with a sixth record store: the sales capabilities read and write `public.sales_records`, never another store.

- `scripts/personal-agent.js --render` reads the capability's sales records, each WITH its data (the due date, the link, the fit sit there): sources (a source whose `data.readable` is `no` is left out of the scan), keywords, solicitations, ratings, statuses, vocabulary and reminders, plus every `correction` and `grade`, store F first, and for the scan and the ask the reminders due today (`reminders_due`, computed by the script, never judged). The ~92,000 `agency` rows are never in a render; only the crawl reads them, a batch at a time. It assembles the prompt through `assemblePrompt()` (§19b). Never hand-build or edit the prompt.
- `scripts/personal-agent.js --write` checks the whole answer against what is stored and writes it in ONE insert, or refuses it all (exit 2, nothing written, every reason listed). A model answer writes only `solicitation`, `rating`, `source`, `vocabulary` and `reminder`; a stored solicitation key is refused (an amended posting is a new `rating` with a later `data.amended`); a rating needs its solicitation's due date and link; a reminder must be one the script computed. Stdout prints `{inserted, ids, strong, reminders, push}`. It never deletes or patches anything.
- `scripts/agent-log.js` logs the turn to `ai_activity_log` (§19k). The script itself makes no model call.

Sales records are read and written only through these scripts and the Supabase MCP. Never paste a solicitation, a rating, an agency or a keyword into a repository file, a Skill row, or anywhere outside the session scratchpad.

### (a) Asks

The contract the user-level `/bill` loader follows.

| The ask says | What runs |
|---|---|
| `scan` | `sales-scan` (section (c)) |
| `rate` + pasted text or a link | `sales-rate` with `--input-file=<scratch>-input.md` holding the text; a link is fetched first with the session's web tool and its text saved to that file |
| any question | `sales-ask` with `--ask="<the question>"` |
| `interested <key>`, `pass <key> <reason>`, `bidding <key>`, `won <key>`, `lost <key>` | no capability run — ONE `status` record through `--write --principal`: `{"records_to_write":[{"kind":"status","title":"<key> <status>","data":{"key":"<key>","status":"Interested\|Pass\|Bidding\|Won\|Lost","reason":"<his reason, for a Pass>"}}]}` |
| `grade <1-10> <phrase> <record id>` | ONE `grade` record the same way: `data: {"score": <n>, "phrase": "<his phrase, verbatim>", "record_id": "<id>"}` |
| `correct <text>` | ONE `correction` record the same way: `data: {"body": "<his words, verbatim>"}` |
| `keyword add <term>` / `keyword drop <term>` | ONE `keyword` record the same way: `data: {"term": "<term>", "status": "approved"}` or `"dropped"` |

Only the principal's own words are written with `--principal`, and `--principal` admits only `status`, `correction`, `grade` and `keyword`; a model answer never carries one of them. A key is a stored solicitation's `data.key`. Sending a solicitation on for a drafted response is the principal's word alone and is not this runbook's.

### (b) Sequence

Career-writer-agent.md section (b), with `--agent=bill`, no `--target` and no `--tick`. Work from the runner's checkout (the loader names it) and write every file to the session scratchpad.

1. **Credentials.** Read `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` by NAME from `public.runner_secrets` over the Supabase MCP. Export them inline on each command that needs them. Never print them, never write them to a file.
2. **Render.** `node scripts/personal-agent.js --render --agent=bill --capability=<slug> [--ask=<the ask>] [--input-file=<scratch>-input.md] --out=<scratch>.md --json`. Stderr prints `# model: <id>`; stdout prints `{model, records_loaded, prompt_bytes}`. A non-zero exit stops the run.
3. **One sub-agent.** Launch ONE sub-agent with the Agent tool, `model` = the printed model id. Its prompt is one orientation line ("You are running the capability below; return only the JSON object its output contract names, and save it to `<scratch>.json`.") followed by the full contents of `<scratch>.md`.
4. **Write.** `node scripts/personal-agent.js --write --agent=bill --capability=<slug> --answer=<scratch>.json --session-name=<name>`. A refusal (exit 2, nothing written, stderr lists every reason) goes back to the same sub-agent to fix, then the write runs again.
5. **Log the turn.** `node scripts/agent-log.js --agent=bill --capability=<slug> --model=<the model that served> --ai-type=agent-turn --feature=<slug>:<its default_intent_slug>:depth0` (`gs-scan-intent`, `gs-rate-intent`, `gs-ask-intent`), with no token or cost flag unless the session observed counts; the row's cost stays empty because the run is on the subscription.
6. **Answer the principal.** The strong matches first, each with its agency, due date, link and why; then the weak ones in a line each; then what was written back.

### (c) The scan

1. Render `sales-scan` (section (b) step 2).
2. The run itself, on the routine's own model, follows the rendered FINDING and SKIP method over the rendered sources. A source that refuses automated reading is already left out; one that fails now is named in the summary and not retried.
3. It saves the candidates as an input file in the scratchpad: for each, `key`, `agency`, `state`, `title`, `number`, `due`, `url`, `source_url`, `posted`, `amended` and a one-line summary — nothing longer copied from the page.
4. No candidate and no `reminders_due`: write nothing and say so. No candidate but reminders due: write an answer holding only those `reminder` records (`data: {"key", "days_out", "due"}` exactly as rendered) and run `--write`.
5. Otherwise render again with `--input-file=<that file>`, launch ONE sub-agent on the model the render prints, which opens each candidate's own page and rates it (a `solicitation` for a new key, a `rating` for each), then `--write` (a refusal goes back to the same sub-agent), then log.

### (d) Push rule

ONE phone alert, only when the write prints `push: true`: a new strong match in this run, or a reminder 10 or 3 days before the due date of a solicitation marked Interested. Nothing else alerts — not a weak match, not a failed source, not an empty run.

### (e) The crawl

The agency list's websites and bids pages, a batch at a time. Mechanical: nothing is assembled and no model is named.

1. `node scripts/personal-agent.js --render --agent=bill --capability=sales-scan --crawl=40 --out=<scratch>.json` writes `{crawl: true, agencies: [{id, title, type, state, city, county, size, website_url}]}`: never-searched agencies, a known website first, smallest first. An agency whose website is `no` is never selected; it waits for the principal's call.
2. For each agency: open `website_url`; when there is none, find the unit's official site (`website_found` yes with its `website_url`, or no). On the site look for a bids, solicitations, procurement or purchasing page (`solicitations_searched` yes with its `solicitations_page`, or no). Beside a website `no`, leave `solicitations_searched` out. Never sign in, never register; a page that refuses automated reading is `no`.
3. Save `{"agencies": [{"id", "website_found", "website_url", "solicitations_searched", "solicitations_page"}]}` to `<scratch>-answer.json` and run `node scripts/personal-agent.js --write --agent=bill --capability=sales-scan --crawl --answer=<scratch>-answer.json --session-name=<name>`. It sets only those keys and `checked_at` on each agency row, adds a `source` for each new bids page, and prints `{patched, sources}`. A refusal writes nothing; a re-run after a failed PATCH is safe.
4. Log with `--feature=sales-scan:agency-crawl:depth0`.
5. Up to 10 batches a run; the STEP 0 meter query runs again before each batch and a false stops the run.

### (f) The routines

Two cloud routines, each run without the principal. This file is the SOURCE and each routine is a copy (ARCHITECTURE.md §19v). Both are created switched off and switched on only at the principal's word; never in a build.

| Field | `bill-solicitation-scan` | `bill-agency-crawl` | Why |
|---|---|---|---|
| cron | `30 10 * * 1,4` (UTC) | `0 6-10 * * *` (UTC) | Monday and Thursday 4:30 AM Central while Central is on standard time (one hour earlier in daylight time unless shifted); the crawl hourly from midnight to 4 AM Central |
| model | `MODELS.HAIKU` in `shared/models.js`, read at creation | same | the cheapest capable class; only candidates reach the model the render prints. Never a literal in this file or in a block |
| sources | this repository, branch `dev` | same | one clone; the records live only in the private store |
| connectors | Supabase MCP, `WebFetch`, `WebSearch` | same | the records and the secrets by name; the outside reading |
| notifications | off, except the one alert of (d) | off | the store is the record |
| enabled | `false` | `false` | the principal's hand, alone |
| routine id | not yet created | not yet created | filled only when the attended session creates the routine, never a placeholder |
| prompt | the block between `<!-- BILL-SCAN-PROMPT-BEGIN -->` / `<!-- BILL-SCAN-PROMPT-END -->` below, byte-identical | the block between `<!-- BILL-CRAWL-PROMPT-BEGIN -->` / `<!-- BILL-CRAWL-PROMPT-END -->` below, byte-identical | the file is the source, the routine the copy |

Update rule, as personal-agent.md (e): edit the block → suite → commit → on the principal's word update the routine with the WHOLE configuration read from a fresh get, then read back its model and allowed tools.

#### Solicitation scan

<!-- BILL-SCAN-PROMPT-BEGIN -->
STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.

Before anything else, in the clone run: npm ci --no-audit --no-fund --ignore-scripts (the scripts need their packages; this is a no-op if they are already installed).

BILL SOLICITATION SCAN — MONDAY AND THURSDAY 4:30 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/gov-sales-agent.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of the government sales agent (agent id bill, lane personal). The repository clone is beside you: work there from origin/dev, never main. Supabase MCP tools are attached; read SUPABASE_URL and SUPABASE_SERVICE_KEY by NAME from public.runner_secrets and export them inline on each command that needs them. Never print a secret, never write one to a file. Read docs/runbooks/gov-sales-agent.md from the clone and follow sections (b) and (c) with --capability=sales-scan, with the steps below.

Step 1 — the render. node scripts/personal-agent.js --render --agent=bill --capability=sales-scan --out=<scratch>.md --json. A non-zero exit stops the run.

Step 2 — the finding. Follow the rendered FINDING and SKIP method over the rendered sources with WebFetch and WebSearch. A source that fails is named in the summary and not retried. Save the candidates to one input file in the scratchpad: key, agency, state, title, number, due, url, source_url, posted, amended and a one-line summary each, nothing longer copied.

Step 3 — the rating. No candidate and no reminders_due: write nothing and say so. No candidate but reminders due: write an answer holding only those reminder records and run --write. Otherwise render again with --input-file=<that file>, launch ONE sub-agent on the model the render prints to open each candidate's own page and rate it, then node scripts/personal-agent.js --write --agent=bill --capability=sales-scan --answer=<scratch>.json; a refused write goes back to the same sub-agent to fix and is written again. Then log the turn with node scripts/agent-log.js --agent=bill --capability=sales-scan --model=<the model that served> --ai-type=agent-turn --feature=sales-scan:gs-scan-intent:depth0.

Step 4 — the alert. ONE phone alert, only when the write printed push: true: the new strong matches and the reminders due, each with its agency, due date and link. Otherwise no alert.

Step 5 — ONE summary: each strong and weak match with its agency, due date and link, each reminder, and each source that failed. The run ends when it is written.

This run finds and rates alone. It bids on nothing, drafts no response, contacts no agency, signs in nowhere, writes no status, and commits or pushes nothing. Never delete a record. Never flip agents.is_active.
<!-- BILL-SCAN-PROMPT-END -->

#### Agency crawl

<!-- BILL-CRAWL-PROMPT-BEGIN -->
STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.

Before anything else, in the clone run: npm ci --no-audit --no-fund --ignore-scripts (the scripts need their packages; this is a no-op if they are already installed).

BILL AGENCY CRAWL — HOURLY, MIDNIGHT TO 4 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/gov-sales-agent.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of the government sales agent (agent id bill, lane personal). The repository clone is beside you: work there from origin/dev, never main. Supabase MCP tools are attached; read SUPABASE_URL and SUPABASE_SERVICE_KEY by NAME from public.runner_secrets and export them inline on each command that needs them. Never print a secret, never write one to a file. Read docs/runbooks/gov-sales-agent.md from the clone and follow section (e), with the steps below.

Step 1 — the batch. node scripts/personal-agent.js --render --agent=bill --capability=sales-scan --crawl=40 --out=<scratch>.json. A non-zero exit stops the run; an empty agencies list ends it.

Step 2 — the reading. For each agency, with WebFetch and WebSearch: open website_url; when there is none, find the unit's official site (website_found yes with its URL, or no). On the site look for a bids, solicitations, procurement or purchasing page (solicitations_searched yes with the page URL, or no). Never sign in, never register; a page that refuses automated reading is no.

Step 3 — the write. Save {"agencies": [{"id", "website_found", "website_url", "solicitations_searched", "solicitations_page"}]} to <scratch>-answer.json and run node scripts/personal-agent.js --write --agent=bill --capability=sales-scan --crawl --answer=<scratch>-answer.json. A refusal writes nothing: fix the named agencies and write again. Then log the turn with node scripts/agent-log.js --agent=bill --capability=sales-scan --model=<the model that served> --ai-type=agent-turn --feature=sales-scan:agency-crawl:depth0.

Step 4 — the next batch. Up to 10 batches a run. Before each one, run the STEP 0 meter query again; a false stops the run.

Step 5 — ONE summary: the batches run, the agency rows patched and the bids pages added as sources. The run ends when it is written.

This run finds and rates alone. It bids on nothing, drafts no response, contacts no agency, signs in nowhere, writes no status, and commits or pushes nothing. Never delete a record. Never flip agents.is_active.
<!-- BILL-CRAWL-PROMPT-END -->
