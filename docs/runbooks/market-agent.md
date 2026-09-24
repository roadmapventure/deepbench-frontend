<!-- DeepBench v7.0.583 | runbooks/market-agent.md | AGT-121 — the playbook the /nathan loader reads: map the ask to a pmm-* capability, gather research and the Napkin, render, run one sub-agent, write, return the Napkin notes, log. Method only: no Napkin text, price, prospect or person lives here (the repo is public; market data lives only in public.market_records). -->
# Market agent — the call path

## What this is

The method a Claude session follows to run the product-lane marketing agent (`nathan`, Nathan Laan — product marketing) over its own DeepBench rows. The user-level `/nathan` skill is a thin loader that points here. Every step is a script except three the session does itself: web research, the Napkin read and note write-back, and the single sub-agent turn, which runs on the session's subscription.

- `scripts/market-agent.js --render` reads the capability's `market_records`, its corrections and the platform rows it needs, and assembles the prompt through `assemblePrompt()` — the executor's own path (§19b). Never hand-build or edit the prompt.
- `scripts/market-agent.js --write` checks the answer (copy tests, IP typing, statuses, Napkin notes) and stores it in `public.market_records` in one insert.
- `scripts/agent-log.js` logs the turn to `ai_activity_log` (§19k). That log row is also what the next run's `since` is measured from.

Market data is read and written only through these scripts. Never paste a record, a Napkin entry, a price or a person into a repository file, a Skill row, or anywhere outside the session scratchpad.

## (a) The ask table

Match the ask to a capability; the capability slug is `pmm-` + the suffix.

| The ask says | Capability |
|---|---|
| `why DeepBench` | `pmm-why-deepbench` |
| `pitch` / `messaging` | `pmm-messaging` |
| `gaps` / `feature signals` | `pmm-feature-signals` |
| `moat` / `IP` | `pmm-moat-and-ip` |
| `competitors` | `pmm-competitors` |
| `customer profile` | `pmm-customer-profile` |
| `objections` | `pmm-objections` |
| `feature benefits` | `pmm-feature-benefits` |
| `release notes` | `pmm-release-notes` |
| `pricing proposals` | `pmm-pricing-proposals` |
| `market size` | `pmm-market-size` |

A pasted document or the session's own research goes in a scratch file passed as `--input-file=<path>`.

## (b) The sequence

Work from the market checkout (the loader names it) and write every file to the session scratchpad.

1. **Credentials.** Read `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` by NAME from `public.runner_secrets` over the Supabase MCP. Export them inline on each command that needs them. Never print them, never write them to a file.
2. **Research.** Run the session's own web research (WebSearch / WebFetch) for the capability's question — current competitor documentation, market figures, public sources — and save it, with each source's URL and date, to `<scratch>-input.md`. If search is unavailable, say so in that file; never invent a source.
3. **The Napkin.** The owner's idea board is the Napkin artifact `68TWzNWdF1F8aYGLy6aVSp`, collection `ideas`. Only the session reads it, only with the ArtifactData tool, and saves the entries updated on or after `since` to `<scratch>-napkin.json` as a JSON array. `since` is the `since` the previous render printed for this capability (null on the first run, which reads the whole Napkin). Its text never leaves the scratchpad.
4. **Render.** `node scripts/market-agent.js --render --agent=nathan --capability=<slug> [--ask=<the ask>] [--input-file=<scratch>-input.md] [--napkin-file=<scratch>-napkin.json] [--since=<iso>] --out=<scratch>.md --json`. Stderr prints `# model: <id>`; stdout prints `{model, since, records_loaded, napkin_entries, prompt_bytes}`. A non-zero exit stops the run — report the message, do not work around it.
5. **One sub-agent.** Launch ONE sub-agent with the Agent tool, `model` = the printed model id. Its prompt is one orientation line ("You are running the capability below; return only the JSON object its output contract names, and save it to `<scratch>.json`.") followed by the full contents of `<scratch>.md`. The answer is saved to `<scratch>.json`.
6. **Write.** `node scripts/market-agent.js --write --agent=nathan --capability=<slug> --answer=<scratch>.json [--session-name=<n>]`. A refused answer (exit 2, nothing written) — a missing copy test, a weak claim leading, a feature moat under six months not called weak, a status other than draft or proposed, an untyped or public trade-secret IP asset, a Napkin note over 200 characters — goes back to the same sub-agent to fix, then write again. Stdout prints `{inserted, ids, napkin_notes}`.
7. **Napkin notes back.** For each `napkin_notes` item the write printed, update ONLY that entry's `note` field with ArtifactData. Never its text, never its status, never an entry listed in `napkin_left`.
8. **Log the turn.** `node scripts/agent-log.js --agent=nathan --capability=<slug> --model=<printed model> --ai-type=agent-turn --feature=<slug>:<intent>:depth0`, where `<intent>` is the capability's `default_intent_slug`, read live from `capabilities`. Pass token counts only when the session observed them.
9. **Answer John.** Verdict first, in plain words; every claim cites the record, the Napkin entry id or the source it came from. Say what was written back and which Napkin entries were noted.

## (c) The tryout

While `agents.is_active` is false, every run is the tryout and runs attended by John.

- Run 1: `pmm-competitors`, with the 2026-09-24 Grok Bot research as its `--input-file`; then `pmm-why-deepbench`. The first run reads the whole Napkin.
- Run 2: `pmm-messaging`.
- Each cut John makes is stored as a `correction` record whose `data.capability` is the capability slug. `--render` reads every correction for its capability, so the cut reaches the next run without editing a Skill row.

## (d) The schedules

Three scheduled tasks, US Central, created with the scheduled-tasks tool ONLY on John's hire word — `agents.is_active` true for the agent. Never in a build, never before the hire. The prompts, verbatim:

- **Daily 6:00 AM:** `/nathan scheduled: pmm-feature-benefits and pmm-release-notes for rows shipped since the last run; push only when a release note is publish-ready`
- **Wednesday 5:00 AM:** `/nathan scheduled: review every Napkin entry created or updated since the last run; pmm-competitors; pmm-objections; pmm-feature-signals; ONE push: market changes, proposed builds, waiting on you (prices, publishing, pitch lock only), Napkin entries reviewed and what each became`
- **First Monday 7:00 AM:** `/nathan scheduled: pmm-customer-profile; pmm-market-size; pmm-pricing-proposals; pmm-messaging investor one-pager; ONE push with the link`
