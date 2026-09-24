<!-- DeepBench v7.0.561 | harvest | AGT-84 — Jerry Maguire: the call path (design jerry-maguire-design, 2026-09-23). Not required reading for the build; every fact a task depends on is in the kickoff. -->

# AGT-84 — reasoning behind the kickoff

## 1. Premise revalidation (measured, not recalled)

- Worktree `C:/Projects/deepbench-frontend/.claude/worktrees/jerry-maguire-design` at `7b875722` (v7.0.560 AGT-82 on origin/dev). `ls` and `git ls-files`: `scripts/personal-agent.js`, `docs/runbooks/personal-agent.md`, `tests/regression/agt-84-personal-agent.test.mjs` do not exist. No script anywhere in `scripts/` reads `career_records`.
- Anon REST, 2026-09-23: `agents?id=eq.jerry` → `[{id:'jerry', name:'Jerry Maguire', role:'Personal — Career Agent', lane:'personal', is_active:false}]`; `capabilities?slug=like.career-*` → 11 rows, tenant `global`, every `default_intent_slug` = `jm-<name>-intent`; `agent_capability_assignments?agent_id=eq.jerry` → 11; `skill_profiles?slug=like.jm-*` → 15 (4 shared + 11 intents); `jm-market-watch-intent`, `jm-growth-review-intent`, `jm-evidence-mining-intent`, `jm-resume-review-intent` schemas all end `required` with `records_to_write` whose items require `kind` and `title`; `career_records?select=id&limit=1` → HTTP 401 (service-only, as AGT-82 designed). `runner_model_lanes`, `runner_cycles`, `runner_decisions` → 42501 to anon (service-only; the script runs with the service key).
- So the agent, capabilities, intents and store exist and nothing calls them: the premise is alive. The gap is exactly the call path.

## 2. The one assembly path (§19b)

`scripts/agent-prompt.js:53` imports `assemblePrompt` from `../api/prompt/db-assembly.js` (signature `{capability_slug, agent_id, tenant_id, task_context, runtime_context, enrichment_capability_slug, intent_slug, retrieval_scope}`, `:564`) and exports `resolveJudgmentModel()` (`:123`) and `renderAssembly()` (`:208`). A `task_context` with no `goal` renders as the TASK DETAILS section (`db-assembly.js:775`, AI-44), one `key: JSON` line per field — so `records`, `corrections`, `repos`, `week` and `input` reach the sub-agent as the executor would render them. The new script therefore imports these and adds only the read map and the write; it never builds prompt text.

Why a new script rather than flags on `agent-prompt.js`: `agent-prompt.js` takes `--task=<json>` on the command line and Windows caps argv (the AGT-86 gotcha); 30+ records will not fit. Adding a `--task-file` there would work for `--render` but `--write` and `--fetch-postings` are a different concern (career_records I/O) and `agent-prompt.js` is the shared governance surface — pattern:8 (narrowest layer), pattern:17 (extend what fits: import its exports). Model choice: `resolveJudgmentModel()` is reused unchanged so the printed model is the one in force (SES-395 degrade), not the stored one.

## 3. Rule #1 and the agent-agnostic script (§19d/§19e, pattern:13)

The agent id is a flag. The read map is keyed by capability slug, never by agent. `REPOS` lists local paths only. The runbook names no other agent. The test's negative control (a spliced `agent = 'jerry'`) proves the grep discriminates.

## 4. The read map, and why each capability reads what it reads

The eleven intents were read from `skill_profiles` (anon-readable). Resume/intro/cover/strengths/posting need the facts, the targets, the ladder and the evidence; match-finder adds new postings; interview-prep adds contacts and the log (past conversations); outreach reads contacts and targets; market-watch reads targets, prior requirements and the watch list; evidence-mining reads what evidence exists plus facts and targets so it mines for gaps; growth-review reads the ladder, targets, the log and prior reviews, plus the platform's own week. Every capability also reads its own `correction` rows (`data.capability`), which is how John's tryout cuts reach the next run without editing a Skill row (pattern:7 applied at the data level: corrections are data, read at render).

Growth-review's `week`: `runner_cycles` columns measured from the repo's own selects (`id,push_sha,stamp,trigger`, `item_id`), `runner_decisions` (`id,kind,backlog_id,summary,decided_at`) — the columns the kickoff names are the ones scripts already select.

## 5. Postings fetch

Public JSON boards only (Greenhouse, Lever, Ashby), token from `watch_company.data.board_token`. A failed board is reported and skipped — never fabricated (pattern:33, pattern:34). Dedup by url so a Sunday run never re-inserts.

## 6. The runbook and the skill

The user-level loader `C:/Users/jleon/.claude/skills/jerry/SKILL.md` (read today) already says: checkout `C:/Projects/deepbench-jerry` (shallow clone of dev), read `docs/runbooks/personal-agent.md`, creds by NAME from `runner_secrets`, `--render` → one sub-agent on the printed model → `--write` → `agent-log.js`, personal data only in `career_records`, `is_active` is the hire card. The runbook the kickoff specifies matches that loader line for line; the ask table, the sequence, the tryout rule and the two schedule prompts are the runbook's whole content. Method only: no personal fact may appear in it (the repo is public).

Schedules: created with the local scheduled-tasks tool ONLY on John's hire word — `agents.is_active` true is that word in data. This build creates none (pattern:166: a John rule is never weakened without his words).

## 7. Logging (§19k)

The session sub-agent's turn is logged by `scripts/agent-log.js` (`call_source session`, `cost_usd NULL`, `--ai-type=agent-turn` which is `shared/ai-patterns.js:168`'s catalog slug, `--feature=<slug>:<intent>:depth0`). Token counts only when the session can observe them; an unmeasured pair writes NULL (SES-423).

## 8. Baseline

`node scripts/baseline-red-set.js --tests=tests/regression/agt-84-personal-agent.test.mjs` on the unchanged tree: "these paths do not exist, so no baseline was measured", exit 2. The block is in the kickoff's CONTEXT.

## 9. Model

`claude-fable-5-1`, the judgment lane (`runner_model_lanes`, as v7.0.550/552 kickoffs name it). Three interacting modes, a per-capability read map and a runbook that must stay method-only are judgment-dense; pattern:125 (total economics) favours the short run on the judgment model.

## 10. Alternatives considered

- Flags on `agent-prompt.js` (rejected: argv cap; shared governance surface).
- A capability route in `api/` (rejected: §19b forbids a hand-rolled route; the call path is a session, not the executor).
- Hard-coding the read map in the runbook (rejected: pattern:2 — the map is data in the script the test imports).
- Creating the schedules now (rejected: John's hire word, AGT-82's stop line).

## 11. Patterns leaned on

pattern:2, pattern:7, pattern:8, pattern:13, pattern:17, pattern:33, pattern:34, pattern:65, pattern:125, pattern:164, pattern:166, pattern:168.

## 12. Open, not blocking

- The three target `target_row` values are personal data in `career_records`; the runbook reads them live, the kickoff names only the example `pe-saas`.
- `runner_model_lanes` is service-only to anon; the judgment lane's id is cited from the v7.0.550/552 kickoffs, and the live test asserts against the table itself.
