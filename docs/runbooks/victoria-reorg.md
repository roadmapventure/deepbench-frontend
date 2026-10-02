<!-- DeepBench v7.0.745 | runbooks/victoria-reorg.md | AGT-281 — the routine id is FILLED: `trig_012xvmXsXAjbVxdbYhUTq6W1`, created 2026-10-02 by the attended session (decision `956086bc-b83b-4f81-a603-de66f7b669b3`) and left **switched off**. The table below carries the id and the live `enabled` `false`; section (c)'s block is byte-unchanged and still carries no trigger id and no model id. `--routine=victoria-reorg` now locates a finding by the id. Switching the routine ON is John's hand alone, after he has seen the first run's output. -->
<!-- DeepBench v7.0.741 | runbooks/victoria-reorg.md | AGT-281 — the playbook the /victoria loader reads, and section (c) is the canonical prompt block for the weekly Tuesday 5:00 AM Central list reorganization and the SOURCE the live routine copies (ARCHITECTURE.md §19v). The routine itself is created by an attended session (kickoff §7), so the routine id is absent here and in ROUTINES["victoria-reorg"].id until it is real — the model-watch precedent, AGT-146, and AGT-102's reason for it. Method only: no ticket text, no finding text and no secret value lives here. -->
# Victoria's lists — the call path

## What this is

The method a Claude session follows to put one findings LIST to Victoria Chen (`victoria`, The Requirements Analyst) in ONE turn and apply her answer. The user-level `/victoria` skill is a thin loader that points here. Every step is a script except one: the single sub-agent turn, which runs on the session's subscription.

- `scripts/requirement-check.js --prepare` / `--apply` rule ONE ticket against ONE named citation (`AGT-280` slice 2). That is the grain for a filing as it happens.
- `scripts/requirement-check.js --prepare-list` / `--apply-list` rule a WHOLE list — every open/partial ticket of a project's epics against every candidate need source — in one turn (`AGT-281`). That is the grain for reorganizing a backlog.
- Both doors assemble through `assemblePrompt()`, the executor's own path (§19b). Never hand-build or edit the prompt. The list door fires the sibling Intent `vc-reorganize-intent`; the single-ticket door fires `capabilities.default_intent_slug`. Neither takes an `--intent` flag.
- `scripts/agent-log.js` logs the turn to `ai_activity_log` (§19k).

Nothing here writes `removed`. A ticket Victoria turns down lands on `status = 'removal proposed'` — John's waiting room — under its own reversible decision (`SES-113`).

## (a) The loader and the ask table

The user-level `/victoria` skill is this text, verbatim — the whole skill, nothing more:

```
Run DeepBench's Requirements Analyst (victoria) over her own DeepBench rows.
Work from the runner's checkout at C:/Projects/deepbench-frontend, in your own worktree branched
from origin/dev, and read docs/runbooks/victoria-reorg.md from it before anything else: that file
is the complete playbook and outranks this loader. Map my ask to a door with its section (a) table,
then follow section (b) step for step. Write every file to the session scratchpad.
Secrets are read by NAME from public.runner_secrets over the Supabase MCP and exported inline on
the one command that needs them; never print one, never write one to a file.
```

Match the ask to a door:

| The ask says | Door |
|---|---|
| `check` (plus one ticket id and one `who:table:id` source) | `--prepare` → `--dry-run` → `--apply`, the single-ticket path |
| `reorganize` (plus one project slug) | `--prepare-list` → `--apply-list`, the list path |

Both `--apply` and `--apply-list` are run with `--session-name=<name>` in an attended session — never `--cycle-id`, which is the runner's own author and would attribute the write to a cycle that did not make it. A list the ask does not name is not reorganized; `builder-found-tickets` is refused outright (`HELD_LISTS`), and the door exits 1 on it before any read.

## (b) The sequence, for a `reorganize` ask

Work from the runner's checkout (the loader names it) and write every file to the session scratchpad.

1. **Credentials.** Read `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` by NAME from `public.runner_secrets` over the Supabase MCP. Export them inline on each command that needs them. Never print them, never write them to a file.
2. **Prepare the list.** `node scripts/requirement-check.js --prepare-list --project=<slug> [--epic=<uuid>] --out=<scratch>.md --json`. Exit 3 is the success path — the prompt is written and her answer is awaited. Stdout's JSON names the list, the ticket count, the candidate count and the MODEL the assembly resolved. Any other exit stops the run: report the message, never work around it (exit 1 is a refusal — a held list, an unknown slug, an empty list, an allowlisted pair with no head column; exit 2 is a missing argument or credential).
3. **One sub-agent.** Launch ONE sub-agent with the Agent tool, `model` = the printed model id. Its prompt is one orientation line ("You are running the capability below; return only the JSON object its output contract names, and save it to `<scratch>.json`.") followed by the full contents of `<scratch>.md`. The answer is saved to `<scratch>.json`.
4. **Apply it.** `node scripts/requirement-check.js --apply-list=<scratch>.json --context=<scratch-prepare>.json --session-name=<name>`. `validateListVerdict()` runs FIRST and offline: a refusal exits 1 and sends NOTHING — not one pass, not one proposal. Send the refusals back to the same sub-agent to fix, then apply again; never hand-edit the answer. On exit 0 every `pass` has gone through `apply_requirement_verdict()` (its own decision, its before-image, then the ticket's `need_source`/`need_score`), every `not-needed` has its own `removal-proposal` decision, a full-row before-image and `status = 'removal proposed'`, and ONE `runner_cycles` row carries the run's line.
5. **Log the turn.** `node scripts/agent-log.js --agent=victoria --capability=requirement-check --model=<printed model> --ai-type=requirement-check --feature=requirement-check:vc-reorganize-intent:depth0`. Pass token counts only when the session observed them.
6. **Answer John.** Verdict first, in plain words: how many tickets went onto which needs, how many were turned down and why, and the Reverse line for anything he may want back. Every claim cites the row it came from.

## (c) The schedule

| Field | Value | Why |
|---|---|---|
| name | `victoria-reorg` | its own routine, separate from `deepbench-runner`, `deepbench-auditor` and the personal-lane tasks — its own switch |
| cron | `0 10 * * 2` (UTC) | Tuesday 5:00 AM CDT, the Designer's recorded call (e). After DST ends 2026-11-01 John sets `0 11 * * 2` in the routine; the runbook records `0 10 * * 2` and says so here |
| model | the `lane`/`orchestrator` row of `public.model_assignments` at creation | read from the table, never a literal in this file or in the block; `scripts/sync-routine-models.js` re-pins it after a switch |
| sources | `roadmapventure/deepbench-frontend` (branch `dev`) | one clone; every row this run reads and writes lives in Supabase |
| connectors | Supabase MCP (`mcp__Supabase__*`) | the board, the candidate sources and the secrets by name. No web access: a need source is a row, never a page |
| environment | `env_01GuEzm2nCHbCB5SumvQVEQ1` | the environment the other DeepBench routines run in |
| notifications | off | nothing is sent; the `runner_cycles` row each list writes is the ONE record of the run, and the standing brief renders it |
| enabled | `false` — created off; John switches it on himself, after he has seen the first run | John's switch alone |
| routine id | `trig_012xvmXsXAjbVxdbYhUTq6W1` — created 2026-10-02 by the attended session (decision `956086bc-b83b-4f81-a603-de66f7b669b3`), **switched off**; also in `ROUTINES["victoria-reorg"].id` (`scripts/check-routine-prompt.js`) and `scripts/sync-routine-models.js` `ROUTINES` | AGT-102 ran the Auditor a week on an unfilled placeholder, so the id is absent by design until it is real, and the prompt block never carries one (the `model-watch` precedent, AGT-146) |
| prompt | the block between `<!-- VICTORIA-REORG-PROMPT-BEGIN -->` / `<!-- VICTORIA-REORG-PROMPT-END -->` below, byte-identical | the routine-prompt.md convention: the file is the source, the routine the copy |

Update rule, as routine-prompt.md and auditor-routine.md: edit the block → suite → commit → on John's
word `RemoteTrigger update` with the WHOLE `ccr` (`environment_id`, `events`, `session_context`) read
from a fresh `get`, then read back `derived_state.model` and `allowed_tools`. The routine exists, so
`--routine=victoria-reorg` locates a finding by its id (`routine/trig_012xvmXsXAjbVxdbYhUTq6W1/prompt`), as model-watch
does; the block is unchanged and the live prompt equals it (checked 2026-10-02, exit 0).

The block carries no trigger id and no model id: the id lives in the table above, never in the block, and the model is the
`model_assignments` row the sub-agent's own assembly prints at run time.

### The prompt

<!-- VICTORIA-REORG-PROMPT-BEGIN -->
DEEPBENCH VICTORIA-REORG — WEEKLY TUESDAY 5:00 AM CENTRAL · trigger: scheduled, or manual "Run now". The canonical copy of this prompt is docs/runbooks/victoria-reorg.md: if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of Victoria Chen's list reorganization. The deepbench-frontend clone is beside you: work there, branch from origin/dev, never main. Supabase MCP tools are attached; every secret is read by NAME from public.runner_secrets and exported inline on the one command that needs it — SUPABASE_URL and SUPABASE_SERVICE_KEY. Never print a secret, never write one to a file, never read one into the session. Read docs/runbooks/victoria-reorg.md from that clone and follow section (b), with the two lists below in place of its step 2's single slug.

Step 1 — set the stamp and the scratch directory: the day in Central time, and the session name victoria-reorg-<yyyymmdd> that every write this run makes carries.

Step 2 — the two lists, in this order and no other: dev-mgr-findings first, then auditor-findings. NEVER builder-found-tickets — it is a held list, the door refuses it, and this run does not argue with that. For each list, in turn: node scripts/requirement-check.js --prepare-list --project=<slug> --out=$S/<slug>.md --json (exit 3 is the success path and the JSON names the model), then ONE sub-agent with the Agent tool on exactly the model that JSON printed, whose prompt is one orientation line plus the full contents of $S/<slug>.md and whose answer is saved to $S/<slug>.answer.json, then node scripts/requirement-check.js --apply-list=$S/<slug>.answer.json --context=$S/<slug>.prepare.json --session-name=victoria-reorg-<yyyymmdd>. A refusal (exit 1) sent nothing: hand the refusals back to the SAME sub-agent, which fixes its own answer, and apply again. Never hand-edit an answer, and never apply a list the validator refused.

Step 3 — log each turn on the model that list's render printed: node scripts/agent-log.js --agent=victoria --capability=requirement-check --model=<printed> --ai-type=requirement-check --feature=requirement-check:vc-reorganize-intent:depth0.

This run decides and records alone, and the runner_cycles row each --apply-list writes is the record of that list — one row per list, carrying its own line. NEVER file a ticket, write the status removed, push a commit, open a card, send a message, raise a question or ask John anything; never touch a list this prompt does not name; never spend money; never name a model id of your own choosing. The run ends when the second list's row is written.
<!-- VICTORIA-REORG-PROMPT-END -->

## (d) What the first run is, and what it is not

`AGT-281` ships the repo half only and stays `partial`. The routine above exists switched off (`trig_012xvmXsXAjbVxdbYhUTq6W1`, 2026-10-02); switching it on is John's alone, after he has seen the first run's output. Before the two list runs, the FIRST judgment this capability makes is a single-ticket one — a `--prepare` / `--apply` pair on one ticket against one of John's own recorded sources — so the narrow door is proven on one row before the wide one is pointed at 84.
