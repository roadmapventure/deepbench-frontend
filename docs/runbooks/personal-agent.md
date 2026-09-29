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
- **Monday 6:00 AM Central:** `/jerry scheduled: career-growth-review; one push notification with the summary`
