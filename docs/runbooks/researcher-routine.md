<!-- DeepBench v7.0.608 | runbooks/researcher-routine.md | AGT-138 — the Researcher's playbook: the routine holds a copy of the prompt block, this file is the source, and `runner-cycle.md` step 4b points here now that the cycle no longer runs the pass -->
# The Researcher routine — playbook and canonical prompt

## What this is

| Field | Value | Why |
|---|---|---|
| name | `researcher-weekly-market` (`trig_01862LsK4ZQF8PTgQoK2cgCV`) | its own switch, separate from `deepbench-runner` and `deepbench-auditor` (John 2026-09-25: *"the researcher should not be part of the dev routine - it should be its own routine"*) |
| cron | `0 9 * * 6` (UTC) | Saturday 4:00 AM CDT, so a run reviews the week that just ended; after DST ends 2026-11-01 John sets `0 10 * * 6` in the routine (this file records `0 9 * * 6` and says so) |
| model | the `orchestrator` row of `public.runner_model_lanes`, read live — `claude-opus-5` on 2026-09-26, which is also the routine's own `derived_state.model` | the run orchestrates and delegates; the research sub-agent runs on the model `scripts/agent-prompt.js` prints for the call, never a literal |
| sources | `roadmapventure/deepbench-frontend` (branch `dev`) | one clone, and the repo is PUBLIC — never write a personal fact into it |
| connectors | Supabase MCP (`mcp__Supabase__*`) | `napkin_ideas`, `market_records`, `backlog_items`, the ledger, secrets by name |
| allowed_tools | the routine's own list, with web search | both legs are live research; a leg with no search tool writes its own honest skip, below |
| enabled | `true` — **already thrown, and it is John's switch alone** (2026-09-25; first fire 2026-09-26 09:02:47Z, SUCCEEDED, output `docs/research/2026-09-26-weekly-market.md`) | nothing in this repo creates, edits or flips a routine |
| notifications | push, email and Slack all `false` | John turned phone notifications off 2026-09-25; a run ends in ONE summary message and pushes nothing |
| prompt | the block between `<!-- RESEARCHER-ROUTINE-PROMPT-BEGIN -->` / `<!-- RESEARCHER-ROUTINE-PROMPT-END -->` in `docs/runbooks/researcher-routine.md`, byte-identical | the routine-prompt.md convention: the file is the source, the routine the copy |

Update rule, as routine-prompt.md: edit the block → suite → commit → on John's word `RemoteTrigger update` with the WHOLE `ccr` (`environment_id`, `events`, `session_context`) read from a fresh `get`, then read back `derived_state.model` and `allowed_tools`.

## The prompt

<!-- RESEARCHER-ROUTINE-PROMPT-BEGIN -->
DEEPBENCH — THE RESEARCHER (GV-02, Governance — Researcher) — WEEKLY MARKET REVIEW — scheduled Saturday 4:00 AM Central, reviewing the past week (cloud routine; John 2026-09-25: "the researcher should not be part of the dev routine - it should be its own routine", "researcher runs early saturday morning, so it reviews the past week", and "also have the researcher review the napkin to validate my ideas or go deeper").

The deepbench-frontend repo is cloned; work from origin/dev (git fetch origin dev; git checkout -B session/researcher-<UTC-yyyymmdd> origin/dev). Supabase MCP tools are attached; secrets by NAME from public.runner_secrets, exported inline, never printed.

SHARED FINDINGS (decided 2026-09-25): before researching, read the product-marketing records written since your last run — public.market_records rows (kind, title, body, data, source, status, created_at) from the Wednesday market scan: competitors, objections, feature signals — and nathan_note on Napkin ideas. Use them as LEADS, never as facts: re-check every claim against its original source and cite that source, not the record. Where your evidence disagrees with a record, say so plainly in the report. Never write to market_records.

PART 1 — JOHN'S NAPKIN (do this first). John's ideas live in the PRIVATE table public.napkin_ideas (id, text, status, note, research_note, researched_at, nathan_note, nathan_noted_at, created_at, updated_at). John reads every note on the Napkin page under the writer's name. Select every row whose researched_at is NULL or older than updated_at, excluding status 'done' and 'parked'. For each idea: validate it or go deeper — live web search for who already does it (competitors, adjacent products), whether demand/evidence exists, the white space DeepBench could own, and what DeepBench already has that it builds on (read shipped backlog_items and the Skill/Capability catalog). Verdict: VALIDATED (real demand, open space), GO DEEPER (promising — name the one question that decides it), or WEAK (crowded or no demand — say why). Cite sources. Write back ONE update per idea: research_note = '<VERDICT> — <two or three plain sentences with the key evidence>' (at most 600 characters) and researched_at = now(). Never change text, status, note (attended Claude sessions' column) or nathan_note (Nathan Laan's). In the Napkin, "nathan" means the beta prospect Nathan B., not the agent. Never write a personal fact into the repository. Never read career_records (Jerry Maguire's private store).

PART 2 — THE WEEK'S MARKET. Read the Researcher's procedure in docs/runbooks/runner-cycle.md (the invention pass, step 4b) for how its research-class-lens capability is called. Run it over the PAST 7 DAYS: what shipped (backlog_items delivered in the last 7 days), new functionality appearing in the market and white space (web search), and the vision corpus it names. Build the prompt only through node scripts/agent-prompt.js --agent=researcher --capability=research-class-lens (from a task FILE if the flag exists; never hand-build a prompt); run it as one sub-agent (Agent tool, web search allowed) on the model agent-prompt.js prints; log the turn with scripts/agent-log.js.

Write ONE report, docs/research/<yyyy-mm-dd>-weekly-market.md: the week's market findings and proposals, a section on where you confirmed or contradicted the week's market records, plus a Napkin section listing each idea reviewed by its id and verdict only (no idea text — the repo is public). Commit it to dev (git fetch origin dev; git rebase origin/dev; git push origin HEAD:dev — never main; the commit message ends with 'Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>').

RULES: Never flip agents.is_active or any routine. Do NOT send any push notification (John turned phone notifications off 2026-09-25). End with ONE summary message: Napkin ideas reviewed with their verdicts, what changed in the market this week, proposals, and the report path.
<!-- RESEARCHER-ROUTINE-PROMPT-END -->

**The live routine still runs its `2026-09-25` INTERIM text** — the paragraph that defers to this file until it is on `origin/dev`, and the sentence naming `SES-369`'s shut filing gate — until John runs the `RemoteTrigger update` above. Until he does, `node scripts/check-routine-prompt.js --routine=researcher` exit 1 is EXPECTED drift against this block (the `AGT-102` / `AGT-137` convention), not a defect to chase; it still files its `routine-prompt-drift` finding, and the finding names this paragraph. **This file is the source and the trigger is the copy: nothing in this repo creates, edits or flips the routine.**

## Steps 0-5

**Step 0 — the week, the clone, the session name.**
```
export W=$(date -u +%G-W%V); export S=$(mktemp -d); export N=researcher-$W
export SUPABASE_URL=<runner_secrets.SUPABASE_URL> SUPABASE_SERVICE_KEY=<runner_secrets.SUPABASE_SERVICE_KEY>   # read by name over the MCP; export inline; never echo
git fetch origin dev && git checkout -B session/researcher-$(date -u +%Y%m%d) origin/dev
# write the prompt this run was given to $S/prompt.txt verbatim (the whole text, unedited), then:
node scripts/check-routine-prompt.js --routine=researcher --prompt=$S/prompt.txt --out=$S/prompt-researcher.json; echo "prompt-drift exit $?"
```
There is no `runner_cycles` row and no version claim: this is not a builder cycle. `$N` is the session name every ledger write and every before-image carries. Exit 1 from the drift check is a FINDING, never a stop (the paragraph above says why it is expected today); exit 2 is a source that could not run and is named in the summary.

**Step 1 — the Napkin (the prompt's PART 1, and it goes first).** The verdict and exactly two columns: `research_note` and `researched_at`. `text`, `status`, `note` and `nathan_note` are other writers' columns and stay untouched — the write is one `UPDATE` per idea under its own before-image (§19v), never a bulk overwrite.

**Step 2 — the week's market (the prompt's PART 2).** The method is below, at *The method*: assemble `research-class-lens` through `scripts/agent-prompt.js`, run it as ONE sub-agent on the model that command prints, log the turn with `scripts/agent-log.js`. Never hand-build the prompt. Egress: obey the agent's own `egress` answer rather than re-testing it — `egress = 'blocked'` writes the honest skip into the report and the summary, and next Saturday retries.

**Step 3 — proposals reach the intake, they are not filed.** A proposal is a finding now, ruled by the Development Manager through `scripts/audit-review.js` like every other finding — the Researcher files no ticket and calls no filing function:
```
node scripts/audit-ledger.js --ingest=$S/proposals.json --week=$W --found-by=researcher:weekly-market --type=proposal --session-name=$N --apply
```
Each finding carries `kind 'other'`, at least one `location`, and a `confidence`; the ledger prints `ingest <W>: F findings, a new, b seen, c recurring, d ruled-out` — those are the summary's numbers. `finding_routes` carries the `researcher` row (`AGT-138`, precedence 30, `project_slug` NULL) so `audit-review.js` routes the group to the manager's own pick rather than throwing `unmapped source researcher`. **Neither `public.file_invention_proposal()` nor `public.invention_due()` is called here, and neither is retired** — the functions are live, the enhancement lane is theirs, and a proposal that reaches the board does it through the manager's ruling.

**Step 4 — one report, committed.** `docs/research/<yyyy-mm-dd>-weekly-market.md`, then `git fetch origin dev && git rebase origin/dev && git push origin HEAD:dev` — never main. The Napkin section lists ids and verdicts only: the repo is public and the ideas are not.

**Step 5 — one summary message.** Napkin ideas reviewed with their verdicts, what moved in the market, the proposals ingested, and the report path. No push, no email, no Slack (the table above).

## The method — moved here verbatim from `runner-cycle.md` step 4b (`AGT-138`, `v7.0.608`)

**This is the only home for the research method now.** Step 4b of `docs/runbooks/runner-cycle.md` retired to a pointer at this file in the same ship, so what follows is not a second copy of a live procedure — it is the procedure, read from here by the routine and by the person debugging a pass. The `runner_cycles` framing in it (a cycle's `notes`, the daily pacing, "continue to step 5 normally") is the shape it was written in and is kept verbatim for the reason the retirement note below gives; in this routine the equivalent of a `notes` line is the report and the summary message, and the equivalent of "continue to step 5 normally" is "carry on to step 3".

<!-- FEATURE: SES-335 — the pass is orchestrated here and performed by The Researcher. -->
**THE PASS IS THE RESEARCHER'S WORK NOW, AND THIS STEP ONLY ORCHESTRATES IT (`SES-335`,
`v7.0.438`; the agent is `AGT-64`, `v7.0.429`).** A cycle no longer runs the research method
itself — it assembles the agent's prompt, runs it, and files what comes back. Four statements,
and there is no fifth:

1. **Assemble `research-class-lens` over the `SES-331` path — never hand-build the prompt.**
   Pick the lens first: read `public.judgment_class_census` and take the P1-P4 class with fewest
   ratified, then fewest proposed claims (P1 first on a full tie, register A4). Then:

```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/agent-prompt.js \
  --agent=researcher --capability=research-class-lens --intent=rs-research-intent \
  --task='{"lens":"<the class>","allowed":<invention_due().allowed>,"census":{…},"corpus":{…}}'
```

   Run the rendered prompt as a sub-agent on the **`judgment`** lane (`claude-fable-5-1` — step 6's
   lanes table, read from `runner_model_lanes`, never a literal), with web search available.
   `--intent` is nameable-and-omittable since `SES-332` — the capability's own
   `capabilities.default_intent_slug` is `rs-research-intent` — but **name it anyway**: an assembly
   that resolves no Intent Skill drops the schema, the handler and the output contract, and the
   sub-agent free-writes without erroring.
2. **`egress` is the agent's answer about the world, and you obey it rather than re-testing it.**
   `egress = 'blocked'` in the returned object → write `INVENTION PASS: egress blocked` in `notes`
   and **continue to step 5 normally**; tomorrow's pass retries. **THIS ROUTINE'S `allowed_tools`
   CARRIED `WebFetch` ONLY, NOT `WebSearch`, when this was written**, so `blocked` is the EXPECTED
   answer on every cycle until John's own switch at `claude.ai/code/routines` adds `WebSearch` —
   never a defect to re-file, and never something a cycle may edit (`SES-335` records the tool list
   as it stood; the switch is John's). The first `egress = 'ok'` closes precondition C3
   permanently; say so in the cycle row.
3. **File each survivor**, per item 5 below — **and map ONE KEY on the way in: the Intent returns
   `priority_class`, `public.file_invention_proposal()` reads `p.class`.** Every other required key
   is spelled identically on both sides (`title`, `enhancement_claim`, `scope_rationale`,
   `predicted_cycles`, `description`), which is exactly what makes this one rename easy to miss —
   the call does not fail on an unknown key, it fails on the missing one, with
   *"class must be one of P1..P4, got (null)"*. `tests/regression/agt-64-researcher.test.mjs`
   exports `covers()` carrying the same rename and is the guard on both shapes.
4. **Write the returned `research_doc` to `docs/research/<yyyy-mm-dd>-invention-<class-slug>.md`
   and commit it in this cycle's commit set.** It is not decoration: `file_invention_proposal()`
   RAISES unless the `description` cites both a `VC-` claim ref and a `docs/research/` path, so a
   proposal whose research file was never written is a proposal that cannot be filed.

<!-- FEATURE: SES-335 — items (1)-(4) as they read before this ship are RETIRED IN PLACE below, kept verbatim. -->
**RETIRED IN PLACE (`SES-335`, `v7.0.438`) — `docs/SELFBUILD-RETIREMENT-LEDGER.md` entry 48.** The
four method items below are no longer steps a cycle performs by hand. They are the Skills of the
agent that now does the research, read by it at assembly time rather than by a cycle here:
`rs-knowledge-corpus` (the corpus, the lens rule, the two legs, the template and the filing
contract), `rs-research-intent` (the task shape and the output schema), `rs-behavior` (the scoring
frame and the pull-test tiebreaker) and `rs-guardrails` (cite-or-drop, honour `allowed`, never
re-propose a `VC-REJ-*`). They are **kept here verbatim** for the same reason `SES-333` kept step
5's: this is the only written record of *what the method is* for the person debugging a pass, and a
summary would be the second, drifting copy the move exists to end. **An editor must not treat
"it is in the Skill now" as permission to delete them.**

(1-legacy) **Egress probe (precondition C3, measured not assumed):** one live WebSearch. **THIS ROUTINE'S
   `allowed_tools` CURRENTLY CARRY `WebFetch` ONLY, NOT `WebSearch`** — a probe that finds no
   WebSearch tool writes `INVENTION PASS: egress blocked (no WebSearch tool)` in `notes` and skips
   the rest; that is the EXPECTED result on every cycle until the routine's own tool list changes,
   never a defect to re-file. If a genuine WebSearch call fails for another reason, write
   `INVENTION PASS: egress blocked` instead — tomorrow's pass retries either way. The first success
   closes C3 permanently; say so in the cycle row.
(2-legacy) **Research, with a class lens:** read `public.judgment_class_census` and take the P1-P4 class
   with fewest ratified, then fewest proposed claims (P1 first on a full tie, register A4) as this
   pass's lens. Run the two-leg live research (`SES-131` shape: market/competitor/whitespace plus
   the platform's own usage signals), grounded in `docs/vision/market-map.md`, `thesis.md` and
   `customer.md` — the corpus is the scoring
   frame, not your generic priors. Write
   `docs/research/<yyyy-mm-dd>-invention-<class-slug>.md`: cited URLs, the claims consulted, the
   shortlist, and the pull-test argument (`docs/research/LOG-143-bench-report-card-research.md` is
   the template).
(3-legacy) **Generate exactly `allowed` proposals** — the number `invention_due()` returned. Volume widens
   only by ladder and pace, never a cycle's own judgment.
(4-legacy) **Score against the vision corpus** and run §19v's R&D gate: research → cheapest-variant
   feasibility check → logged go/no-go with traceable reasoning (§19d sniff test — a proposal
   whose "why" can't be traced to corpus claims + evidence is a feature mill, kill it).
5. **File each survivor with `public.file_invention_proposal(<your cycle id>, NULL, p)`** — one
   transaction: a `backlog_items` row (`scope_origin 'enhancement'`, a named P1-P4 class,
   `enhancement_claim`, `scope_rationale`, `predicted_cycles`, a `description` citing at least one
   `VC-` claim ref and the research file's own `docs/research/` path — the function RAISES on
   either missing one, or on a class outside P1-P4) and its own
   `record_decision(kind='invention')`, whose `reasoning` cites `pattern:N` tokens per step 7b's
   rule (`pattern:0` = new judgment). <!-- FEATURE: SES-333 — relocated from the v7.0.414 stamp by SES-164 step 2; zero body hits before this. -->
   **Its `ladder_work_class` is the LITERAL `'invention'`, never derived from the proposal's own
   P1-P4 priority class, and an editor must not "fix" that into a `ladder_work_class()` call the way
   step 7b's general form uses one.** The literal is what lets the tail's decision-window sweep
   promote the `invention` rung on an unreversed window and `reverse_decision()` demote it on a
   Reverse, both automatically; deriving it from the priority class would file the proposal's
   ratification against whichever rung that class maps to, and the invention pace would stop being
   paced by inventions. It is linked to the standing drain's epic
   (`runner_directives type='drain-epic'`, read live, never hardcoded) when
   `runner_settings.invention_requires_epic` is true. Write the decision id and the filed
   `backlog_id` in `notes`. **THE PROPOSAL'S 72-HOUR REVERSAL WINDOW IS ITS RATIFICATION — THERE IS
   NO CARD AND NO ACCEPT.** An unreversed window promotes the `invention` rung exactly like any
   other decision's window (the tail's `(7b)`); a reversed one demotes it and stores the rejection
   as a claim, below. **The sentence this REPLACES — "file the surviving proposal as a
   `gated_before_build` card; John's Accept turns it into a queued ticket" — is retired, not merely
   annotated: the card surface it named no longer exists at all.**
6. Write `INVENTION PASS: filed <backlog_id[, …]>` (or `: no survivor` — an honest zero beats a
   forced proposal) in `notes`, then **continue to step 5 normally** — the pass is bookkeeping plus
   research, not this cycle's build (B24 logic; the cycle still delivers one).

**AN INVENTION DECISION'S REVERSE STORES THE REJECTION AS A CLAIM, BEFORE ANYTHING ELSE (`SES-160`,
`v7.0.414`).** A `kind='invention'` decision reversed through the same handle
(`public.reverse_decision('<decision id>', 'John', '<why>')`) deletes the filed proposal's
`backlog_items` row (the NULL-image restore, since the row was inserted by that decision) and
demotes the `invention` ladder rung, exactly like any other reversed decision — **and then, before
selection or anything else runs, call**:

```sql
SELECT * FROM public.record_rejected_invention('<decision id>');
```

`applied = true` names the new `VC-REJ-NNN` claim, read off the reversal's own before-image (the
proposal's full state the instant before the undo deleted it) rather than the original decision's
NULL image, which cannot answer the question. A second call for the same decision returns
`applied = false` with `reason` naming the existing ref — idempotent per decision, so a re-run costs
nothing. **The corpus gets richer on every Reverse, and a rejected proposal is never re-proposed
because the next invention pass's research leg reads the same corpus (`SES-157`;
`vision/rejected-paths.md` stays a retired stub, never appended).**
