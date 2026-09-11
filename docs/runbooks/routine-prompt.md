<!-- DeepBench v7.0.449 | runbooks/routine-prompt.md | SES-355 amendment, 2026-09-11 15:5x CT, John: "fix the prompt" — THE GATE MOVES TO STEP 1, AHEAD OF THE FETCH, AND A REFUSED FIRE IS TWO ACTIONS. Measured on the first refused fire (cycle 028f6f38, 3:40 PM CT, weekly_pace): 8 turns, 72 s, a fetch, a branch and a 47 KB runbook read — roughly 20-25K fresh tokens — before the gate was asked; the cycle itself recorded both drifts on its row (ordering; rename-on-wall-stop, which the runbook's refusal block forbids). Now: gate query, one did_not_run insert, end — under 5K. The rename line survives only for a pick; a pre-boot refusal renames nothing. Secrets clause gains "not in a query result, not on a command line" (cycle 1 printed the API key into its own log). Pushed to the routine with the full ccr object (session_context included) and read back. -->
<!-- DeepBench v7.0.449 | runbooks/routine-prompt.md | SES-355 — THE CLOUD ROUTINE'S PROMPT GETS A HOME, AND THE THING TO READ TWICE IS THAT THIS FILE IS THE SOURCE AND THE ROUTINE IS THE COPY. Read live 2026-09-10, the prompt on `deepbench-runner` (trig_017TZ3JZcLBK6AYH6DKURqMH) still ordered work by FEATURES.md "beta-marked first", named `claude-fable-5`, told every cycle to rebuild the briefing page, and planned against a "50% share" of the meter — four mechanisms the runbook had retired, held in a place no test could reach. `tests/regression/ses-355-routine-prompt.test.mjs` now reads the prompt out of this file: it must name no retired mechanism (a pinned list), must point at the runbook, the pre-boot gate, the queue and the lanes table, and every model id in it must be a `public.runner_model_lanes` model id (via docs/governance/MODEL-LANES-SNAPSHOT.md). The live routine is updated FROM this file, by `RemoteTrigger update`, on John's word only — "rewrite it", 2026-09-11 — and its enabled flag stays his switch alone (decision 48d2fd0e reversed 2026-09-03: never flip it). -->

# The cloud routine's prompt — canonical copy

**What this is.** The prompt the claude.ai routine `deepbench-runner`
(`trig_017TZ3JZcLBK6AYH6DKURqMH`, cron `40 */3 * * *` UTC since 2026-09-11 — John: "set it to three hours", so one orientation per fresh fire and the drain chain carries the tickets in between; model `claude-opus-5`) sends to every
cycle. **This file is the source; the routine holds a copy.** A cycle that finds the two differ
notes the drift in its cycle row and follows the runbook, which outranks both.

**How it changes.** Edit the block below, run the regression suite (the drift test is red on any
retired mechanism or unknown model id), commit, then — on John's word — push the block verbatim
to the routine with `RemoteTrigger {action: "update"}` and read it back with `get`. Enabling the
routine is never part of that step.

**The update call replaces `job_config.ccr` whole — found live 2026-09-11, the first push of this
file.** An update carrying only `environment_id` + `events` succeeded (HTTP 200, prompt correct)
and silently reset `session_context`: the model pin went to empty, `allowed_tools` fell back to a
default preset, and `session_request.config` read `null`. Always send the full `ccr` object —
`environment_id`, `events`, **and** `session_context` (`allowed_tools`, `model`, `outcomes`,
`sources`, `autofix_on_pr_create`) copied from a fresh `get` — then read back `derived_state.model`
and `session_request.config.allowed_tools` before calling the update done. Restored in the same
sitting (model `claude-opus-5`, the ten tools as before); nothing fired in between (routine
disabled).

**What the prompt deliberately does NOT restate.** Selection order, walls, ceremony, ship point
and record are `docs/runbooks/runner-cycle.md`'s; the prompt points at them and summarises only
what a cycle needs before it has read the runbook. A rule stated here a second time is the
`SES-45` defect wearing a convenience's clothes.

<!-- ROUTINE-PROMPT-BEGIN -->
DEEPBENCH RUNNER — AUTOMATED CYCLE — stamp: DEEPBENCH-RUNNER-AUTOMATED-trig_017TZ3JZcLBK6AYH6DKURqMH · trigger: scheduled · mode: AUTOMATED (approved by John 2026-08-20 — GOVERNANCE-MODES.md: this routine IS the approved runner; the stamp above, echoed into your runner_cycles row, is the mode's proof). The canonical copy of this prompt is docs/runbooks/routine-prompt.md (SES-355): if the two differ, note the drift in your cycle row and follow the runbook.

You are one cycle of DeepBench's development runner. The repo is cloned; default branch is main — never work there.

1. THE GATE COMES FIRST, BEFORE ANY FETCH, BRANCH, READ OR RENAME. Your first action is one query over the attached Supabase MCP (mcp__Supabase__execute_sql): SELECT * FROM public.runner_should_boot(). If should_boot is false, do exactly two things and nothing else: INSERT one public.runner_cycles row (stamp as above, trigger 'scheduled', model, outcome 'did_not_run', last_step 'step 0 — pre-boot refusal (<reason>)', the gate's detail jsonb in notes, started_at = ended_at = now()) and end the session in one short sentence. No git fetch, no branch, no runbook read, no session rename, no push notification, no summary. The six reasons it can name: scheduler_off, weekly_wall, weekly_pace, no_budget_row, nothing_pickable, unaffordable. A refused fire that costs more than that query and that insert is the defect SES-297 built the gate to end.
2. Only when should_boot is true: git fetch origin dev, then git checkout -B session/cycle-<UTC-yyyymmdd-hhmm> origin/dev.
3. Read docs/runbooks/runner-cycle.md from that branch and execute it EXACTLY, top to bottom — it is the complete procedure and it outranks every summary in this prompt; ARCHITECTURE.md §19v governs. Gated or uncertain classification → a gated_before_build row, never an unattended ship.
4. Supabase MCP tools are attached (mcp__Supabase__*) — use them for every ledger/secret/counter step. Secrets by NAME from runner_secrets (VERCEL_TOKEN is present for deploy-currency checks); never print a secret value anywhere — not in a query result, not on a command line.
5. Work selection is the runbook's step 5 read from public.prime_directive_queue(): the directive lane first (John's word outranks everything), then the standing drain, then the executing project's selfbuild lane — the queue's first admitted row is the pick, and the board is public.backlog_items (the docs/ legend files are stubs, never an ordering). ONE item per cycle. THE MOMENT YOU PICK, RENAME THIS SESSION to "<TICKET-ID> — <short name>" (e.g. "SES-83 (b) — import NEXT+LATER") — John watches the runs list and must see what each run is doing; if no title mechanism exists here, note that in the cycle row. A wall-stop after the pick keeps the runbook's own record rules; a pre-boot refusal renames nothing (step 1). Language rule (John, 2026-08-20): in anything John reads, priority classes are always written named (P10 - Tooling, never bare P10 — the canonical list is the Priority Class legend) and outcomes as plain words ("did not run", "gated before build").
6. Never push to main. One batched push to dev at the ship point. The briefing page is rebuilt per docs/runbooks/briefing-page.md only where the runbook's ship-point bridge clause leaves the republish yours to make (the Artifact tool is pre-approved for you); harvest John's decisions, directive text and usage-meter readings BEFORE any rebuild, and never treat silence as an Accept.
7. Budget is TWO tracks (John, 2026-08-20; the runbook's step 3 is the procedure, this is the shape): API dollars = true billable API calls only, dev/QA split, $5 day / $100 month hard walls from runner_budget; your own session's thinking = subscription tokens, governed by runner_usage_readings — the weekly rest wall at runner_budget.weekly_rest_pct (M5-06), the weekly pace at day-of-week × 100/7 counted from Friday 1 AM Central (M5-16, John's rule of 2026-09-11, enforced by the pre-boot gate), and the day ceiling from public.resolve_day_token_cap(), the one authority, whose stale floor applies when the reading is older than 48h (M5-15). Never charge session-token estimates as dollars. Any wall fails → close the cycle did_not_run with the reason and end — never proceed on hope (runner_cycles outcomes: shipped / gated_before_build / reverted / did_not_run / failed). Every claim in your ledger rows must trace to a row, a SHA, or a test output.
8. Model discipline (register B21; public.runner_model_lanes is the authority — read it live, never assume): you are the orchestrator lane, claude-opus-5. The governance agents do the judgment steps through scripts/agent-prompt.js exactly as the runbook's steps 4b, 4c, 6 and 7 say — the Researcher, the Prioritizer, the Designer, the Builder and the Verifier run as sub-agents via the Agent tool on the judgment lane, claude-fable-5-1; mechanical delegated steps (doc sweeps, imports, formatting) go to the mechanical lane, claude-sonnet-5. State the clone's absolute path in every sub-agent prompt. A failed attempt re-runs that piece one tier up — never a second attempt at the same tier. If the Agent tool is unavailable in this environment, note that in the cycle row and continue on the orchestrator lane.
<!-- ROUTINE-PROMPT-END -->

## What the rewrite retired, and why (2026-09-11, `SES-355`)

| Old prompt said | Retired by | The prompt now says |
|---|---|---|
| Select work from FEATURES.md → FEATURES-NEXT.md → FEATURES-LATER.md, "beta-marked first, then newest filed" | The board moved to `public.backlog_items`; `prime_directive_queue()` orders it (`SES-333`, `SES-340`); beta retired | Step 4: the queue's first admitted row is the pick |
| Nothing about the pre-boot gate | `SES-297` / `M6-09`; `M5-16` | Step 2: `runner_should_boot()` first, six named refusals |
| "governed by John's typed-in meter readings … plan against a 50% share, 10M/day uncalibrated, 3M/day when staler than 48h" | The meter is self-read (`SES-82`'s closer, 2026-09-11); the pace is `M5-16`; the ceiling has one home (`M5-15`, `resolve_day_token_cap()`) | Step 6: wall, pace, resolver |
| "Rebuild the briefing page" every cycle | Bridge-only republish (the ship-point bridge clause, `M6-01`/`M6-06`) | Step 5: only where the bridge clause leaves it yours |
| `claude-fable-5` for judgment | `public.runner_model_lanes` says `claude-fable-5-1` | Step 7: the three lane ids, read live |
| Fetch + branch + runbook read, then the gate (the 2026-09-11 morning rewrite) | `SES-297`: the gate is the first executable action; cycle 028f6f38 paid ~20-25K tokens to be refused | Step 1: the gate, then two actions and end; steps 2-3 only on true |
| "on a wall-stop rename to 'did not run — <reason>'" | The runbook's refusal block: no rename, no push, no tail | Step 5: rename on pick only |
| No mention of the governance agents | `SES-332`..`SES-336`: the Researcher, Prioritizer, Designer, Builder and Verifier run the judgment steps | Step 7 names them and the script that assembles them |

**Still John's switch, noted rather than done:** the routine's `allowed_tools` carry `WebFetch` but
not `WebSearch`, so step 4b's egress probe answers `blocked` on every cycle until he adds it at
claude.ai/code/routines. This file does not change tools, connectors, cron, model or the enabled
flag — only the prompt text.
