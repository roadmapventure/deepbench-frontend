<!-- DeepBench | docs/research/2026-10-31-weekly-market.md | The Researcher, capability
     research-class-lens, run kind weekly-market-review, run 2026-10-31.
     Window 2026-10-24 to 2026-10-31 (ISO week 2026-W44).
     PLAYBOOK RUN: docs/runbooks/researcher-routine.md IS on origin/dev, so its Steps 0-5 were
     followed in place of the live routine's 2026-09-25 INTERIM text, as that interim paragraph
     instructs. Switch noted in the summary. Two differences from the interim text mattered:
     Step 3 ingests proposals into the findings ledger (the interim text said list them in the
     report only), and the playbook's prompt block names public.apply_claim_recheck(), which
     AGT-470 shipped 2026-10-25 and the interim text does not know about.
     METER: ok -- 23% against the 28.57% Saturday ceiling, 5.6 points of headroom.
     LAST WEEK DID NOT RUN. 2026-W43 was correctly stopped at the meter (33% vs the same 28.57%
     ceiling, proven from runner_usage_readings, not inferred). So the market leg below covers the
     prompt's 7 days, while the Napkin and the market records cover 14.
     LENS: P2 and P3 tie at 0 ratified (128 vs 127 proposed), so NOT a full tie -- fewest proposed
     breaks it and the lens is P3 - Investor Value, for the third consecutive run. The gap is
     still exactly one claim.
     NAPKIN: 50 rows matched the due filter; 7 were genuinely unreviewed and 43 were swept back in
     by a metadata backfill. The 7 were researched and written. Finding 2 below is that filter.
-->

# Weekly Market Review — 2026-10-31 (week 2026-W44)

**Lens:** P3 — Investor Value. **Window:** 2026-10-24 → 2026-10-31.
**Filing gate:** shut (`SES-369`). `file_invention_proposal()` was not called.
**Proposals and findings reach the Development Manager through the ledger**, per the playbook's
Step 3 — not through a filing call.

---

## The two facts that frame this run

**1. There was no run last Saturday, and that was the budget gate working.**
`docs/research/` holds weekly reports for 2026-09-26, 10-03, 10-10 and 10-17, then nothing until
this one. `audit_findings` has `researcher%` rows for `2026-W40`, `W41`, `W42` and then this week.
`ai_activity_log` has no researcher turn since 2026-10-22. The 2026-W43 run did not fail — it hit
`STEP 0`: `runner_usage_readings` read **33%** at both 08:41Z and 09:41Z on 2026-10-24, against a
day-of-week ceiling of **28.57%**. It stopped, as instructed.

That is correct behaviour and it is not filed as a defect. What *is* filed is that the stop left
**no trace of itself anywhere** (finding 3), and that this routine's Saturday-morning slot puts it
against one of the week's tightest ceilings every single time — 33% skipped last week, 23% ran this
week, a six-point swing either side of the line in consecutive weeks (finding 4).

**The cost of that silence, stated plainly:** the Napkin went **three weeks** without review and the
market records went **two**. Nothing in the system said so; this run had to prove it from usage
readings afterwards.

**2. Zero buyer-visible work shipped, for the second consecutive measured week.**
Five tickets reached `delivered` in the seven-day window:

| Ticket | Class | Origin | What it fixed |
|---|---|---|---|
| `AGT-532` | P9 — Bug Fixes | john-named | An undecided gate card silently holds a ticket out of the queue — and the one it held was the P9 fix for the gate |
| `AGT-506` | P9 — Bug Fixes | victoria-placed | A fresh ship's Reverse handle was a hand-typed runbook line; no script wrote `record_ship_decision` |
| `AGT-504` | P10 — Tooling | victoria-placed | A capability's turn was assembled with no read of its own lane's prior proposals, so it re-proposed what was already filed |
| `AGT-470` | P9 — Bug Fixes | victoria-placed | The Researcher could recheck a wrong claim but not correct it, so eight wrong facts stayed live |
| `AGT-429` | P9 — Bug Fixes | victoria-placed | The agent bundle rendered each role prompt and guardrail once per assigned capability instead of once per agent |

**Three P9, one P10, zero P1–P4, zero customer-facing, four of five `victoria-placed`.** Last week
was seven tickets with the same shape. Under the P3 lens this is the whole question: fourteen days
of delivery and nothing an outside reviewer could open.

Two of the five are this routine's own plumbing and both landed in time to be used here: `AGT-504`
gave `agent-prompt.js` the `--prior-proposals` flag this run passed, and `AGT-470` gave the lane
`public.apply_claim_recheck()` — the handle the playbook's prompt block names and the live interim
prompt does not.

---

## Napkin — ideas reviewed this run

The due filter (`researched_at` NULL or older than `updated_at`, excluding `done` and `parked`)
returned **50 rows**. It should have returned 7. **Ids and verdicts only — this repository is
public and the ideas are not.**

| Idea id | Verdict |
|---|---|
| `n_685ed92c17e241219afe7a641d4cbb07` | VALIDATED (confirmed at the vendor's own documentation) |
| `n_4fc3a16cc51944898d9a227298e4b2fb` | VALIDATED |
| `n_c60dd0ef7ea94706b0648f465e941173` | VALIDATED |
| `n_84d0493af3414e82ad2336a7a346cce9` | VALIDATED |
| `n_2e8ffe01e9ca47ceb37014ac4fbfedb7` | GO DEEPER |
| `n_ec4d7a4a8cf54d38845c28a8a49f9579` | GO DEEPER |
| `n_eb803b599cb64dc996768fb09640f173` | GO DEEPER |

**4 VALIDATED, 3 GO DEEPER, 0 WEAK.** Each row's `research_note` and `researched_at` were written
under its own before-image (`runner_before_images`, `session_name researcher-2026-W44`, 7 rows,
`cycle_id` and `decision_id` NULL), one `UPDATE` guarded by the 600-character cap. `text`, `status`,
`note`, `nathan_note`, `dilbert_note`, `category` and `archived` were verified byte-unchanged
against those images afterwards on all 7, and all 7 notes are within the cap (529–596 characters).

### The other 43 were not due, and finding 2 is why

43 of the 50 rows already carried a researched verdict from 2026-09-26, 10-03, 10-10 or 10-17.
**They re-entered the filter because something bumped `updated_at` on 42 rows between 2026-10-17
14:52 and 15:15 UTC** — the whole table in 23 minutes, in descending-id order, six of them five
hours *after* that same morning's run had researched them. The cause is visible in the schema: the
playbook's own column list for `napkin_ideas` predates `category`, `tags`, `archived`,
`dilbert_note` and `dilbert_noted_at`, and all 60 rows now carry a `category` while 59 carry `tags`.
A metadata backfill ran, and the due filter cannot tell a backfill from John editing an idea.

**I did not rewrite those 43 notes and I did not touch their `researched_at`.** Their evidence
stands, nothing in them was answered by a new edit, and stamping `researched_at = now()` on them
would assert research this run did not do. The consequence is that they will match the filter again
next Saturday until finding 2 is fixed — which is the honest state, and the reason the finding is
filed rather than papered over.

### Three patterns worth John's attention, stated without the ideas' content

1. **No WEAK verdicts this run, and that is not the Napkin getting easier.** Three weeks of raw
   ideas accumulated while the routine was stopped, and the batch that came out is unusually
   concrete: one is confirmed word-for-word by a vendor's own published API documentation, one is
   confirmed by a named 2026 research failure mode, and one is a sales deliverable rather than a
   product idea. 2026-W42 ran 6 WEAK of 15 because its batch was raw brainstorm; this batch is
   mostly observation, and observations check out more often than ideas do.

2. **Two of the seven are blocked by somebody else's platform, not by DeepBench.** For both, the
   deciding question named in the private note is about what an outside vendor permits — not about
   what we would have to build. Each already has an open ticket adjacent to it, so the research
   value here was ruling out the build, not scoping it.

3. **Three of the seven land on tickets that are already open and unbuilt** (`AGT-300`, `AGT-301`,
   `AGT-501`, plus `AGT-302` on a fourth). The Napkin is not generating new work so much as
   re-deriving work already on the board — the same pacing signal the P3 lens has now produced for
   `AGT-323` three weeks running.

---

## Findings for The Development Manager

Four findings from the orchestration leg — the half the research sub-agent cannot see, because it
reads the market and not this routine's own machinery. All four were ingested into the findings
ledger under `found_by researcher:weekly-market`, week `2026-W44`, and route to
`dev-mgr-findings` (`finding_routes` precedence 30, `project_slug` NULL — the manager picks the
project). `file_invention_proposal()` was not called; the gate is shut.

### 1. The canonical prompt block is missing John's meter stop — `defect`, high

`check-routine-prompt.js --routine=researcher` exits 1, which the playbook documents as *expected*
drift against the 2026-09-25 INTERIM paragraph. **It is no longer only that paragraph.** The live
routine opens with `STEP 0 — WEEKLY METER STOP (John, 2026-10-17)`; the repo block at
`docs/runbooks/researcher-routine.md:23` opens with `DEEPBENCH — THE RESEARCHER`. The playbook's own
update rule is *"the file is the source and the trigger is the copy"* — so running the prescribed
`RemoteTrigger update` today would overwrite the live prompt with a block that **has no meter stop
in it**, and this routine would stop honouring the budget gate John built for it two weeks ago.

The fix is one file edit, before any update is run: put `STEP 0` verbatim inside the
`BEGIN`/`END` markers, and drop the INTERIM paragraph now that the playbook is on `origin/dev`.

### 2. The Napkin's due filter re-opens the whole table on any metadata backfill — `defect`, high

Evidence and consequence are in the Napkin section above. The mechanism in one line: the rule keys
on `updated_at`, which moves for *any* write, so a column backfill is indistinguishable from John
editing an idea. 50 due rows this run against 15 in 2026-W42, 43 of them already answered.

No `runner_before_images` row exists for `napkin_ideas` after 2026-10-17 10:00 and no migration
exists between `20261017140000` and `20261017160000`, so the sweep was neither an agent write under
§19v nor a migration — worth knowing, because whatever did it can do it again.

Cheapest variant: a `text_updated_at` column set by a `BEFORE UPDATE` trigger only when
`NEW.text IS DISTINCT FROM OLD.text`, backfilled from `researched_at` for rows already reviewed, and
one line of the playbook changed to select on it. One migration, one doc line.

### 3. A meter stop writes nothing, so a skipped routine leaves no trace — `gap`, high

`public.routine_meter_ok()` is `LANGUAGE sql STABLE`: a pure read of `runner_usage_readings`,
`runner_settings` and `runner_should_boot()`. It cannot write, and nothing writes on its behalf. So
2026-W43's correct skip produced no ledger row, no `ai_activity_log` turn, no report and no alert —
**the Napkin going three weeks unreviewed looks identical to the routine being broken.** This run
had to reconstruct the difference from raw usage readings.

Cheapest variant needs no function change at all: the routine's own `STEP 0` appends one
`audit_findings` row of `kind 'other'` naming the routine, the reading and the ceiling when `ok` is
false, before it exits.

### 4. The weekly review is scheduled where its own ceiling is near its minimum — `gap`, medium

The ceiling in force is `least(90, pace_limit_pct)`, and `pace_limit_pct` is the day-of-week pace
(`day index × 100/7`). At this routine's slot — `0 9 * * 6`, Saturday 09:00Z — that is **28.57%**.
Two consecutive weeks have landed within six points of it in opposite directions: 33% skipped,
23% ran. The day-of-week ceiling exists to pace a *builder* running many cycles across a week; a
once-weekly review measured against the week's near-tightest ceiling is being paced by a rule
written for a different shape of work.

Both remedies are John's switch, not a code change: exempt the once-weekly review from the
day-of-week ceiling and leave it under the flat 90% stop, or move its cron later in the runner
week. Filed so the choice is made deliberately rather than discovered by another lost Saturday.

---

## The week's market — what actually moved

The research pass ran as one sub-agent on **`claude-opus-5`** — the model `agent-prompt.js` printed,
with the `judgment` lane degraded from `claude-fable-5-1` on `fable_pace`. **`egress: ok`**, the
third consecutive run to measure it that way: WebSearch worked for all 11 queries. Its full
`research_doc` is reproduced unedited in the appendix; 21 findings, 5 shortlisted, 2 survivors.

**Only one genuinely in-window market launch surfaced.** Virtana introduced *Agentic Observability
Enterprise Management* on **2026-10-28** — cross-vendor agent teams across the whole IT incident
lifecycle, with **MCP supplying enterprise-wide context** and A2A for agent-to-agent work; select
customers now, GA Q1 2027.
Source: [AIwire/HPCwire 2026-10-28](https://www.hpcwire.com/aiwire/2026/10/28/virtana-introduces-ai-agent-orchestration-platform/).

That matters here for one reason and it is not the product: **MCP is now being treated as the
cross-organisation context transport by an observability vendor** — the same transport over which
DeepBench served 898 bundles in these seven days that it cannot attribute to anyone. See below.

**What did not move:** nothing new on DeepBench's exact shape. The pass searched specifically for a
consultant-expertise-as-agent subscription launched in the window and found none; the nearest
neighbours are unchanged (Sia's Agent Store, monday.com's Agentalent.ai from March 2026). What keeps
filling in around the product is marketplaces for **vendor-built** agents, not for a buyer's own
expertise — which is the one distinction still holding.

**One in-window item was dropped rather than cited.** An aggregator dated a BetterCloud "AI spend
tracking and agent lifecycle management" release to 2026-10-29; BetterCloud's own product-update and
documentation pages, checked at source on 2026-10-31, carry no dated October 2026 announcement, and
its spend tracking is the G2 Track line acquired in 2024. Not carried.

### The usage leg, re-measured by this session rather than taken on trust

The pass's two load-bearing platform numbers were re-run here independently, because a proposal was
going to rest on them. Both hold, and the second is **worse than the pass reported**:

| What | The pass said | This session measured (2026-10-24 09:00Z → 2026-10-31 09:00Z) |
|---|---|---|
| MCP servings with no caller | 742 of 906 (82%) | **735 of 898 (81.8%)** `call_source='mcp'`, **exactly 1** distinct visitor all week |
| Last human visit | 2026-10-11 19:04:39Z | **2026-10-11 19:04:39Z** — confirmed exactly, 19 days |
| The part the pass missed | — | a **third bucket**: 1,122 rows with `call_source` NULL, *all* of them with no caller either |

So across all 2,205 logged turns in the window, **1,910 — 86.6% — name no caller at all**, and
`call_source` itself is null on more than half. The pass measured the MCP slice; the whole ledger is
in the same condition.

---

## Proposals for The Development Manager

`invention_due()` allowed **2**; the pass returned **2 survivors** after killing three candidates
and dropping three more as already on the board. Both are P3. `file_invention_proposal()` was not
called — the gate is shut, and under the playbook's Step 3 a proposal is a finding the manager
rules on. Both were ingested with the four findings above:
`ingest 2026-W44: 6 findings, 6 new, 0 seen, 0 recurring, 0 ruled-out`.

**One caveat on proposal 1's ledger row:** its `governing_fact` carries the pass's figure of
*742 of 906* because that string is the row's fingerprint and the fingerprint is the dedupe key
across weeks. **The verified figure is 735 of 898 `mcp` servings, and 1,910 of 2,205 across the
whole ledger** — measured by this session, as in the table above. Use those.

**Before either, the pacing signal the pass put above its own proposals, and I agree with it:**
the P3 shelf already holds **five open, unbuilt tickets** — `AGT-323` (28 days, never updated),
`AGT-302` (29 days), and John's own `AGT-72`, `AGT-73`, `AGT-74` from 2026-09-11 — while fourteen
days of delivery produced zero P1–P4 items. *A sixth P3 ticket does not fix a shelf nobody draws
from.* If only one thing comes out of this report, it should be drawing from that shelf.

### Proposal 1 — the serving ledger cannot name who it served (P3, 1 cycle)

**Claim:** a skeptical technical reviewer can trace any serving number the product shows him back to
a named consumer, *and can see for himself how many servings resolved to nobody*, because the
serving ledger records the caller the MCP handshake supplied and the surface publishes named and
unattributed side by side instead of one total.

**Why it is P3 and not housekeeping:** the locked pitch claims routing, attribution and the feedback
loop are *already built into the data model* (`VC-EXIT-008`), and `VC-EXIT-021` makes complete
lineage with zero unexplained rows a P3 class in its own right. Measured above, the attribution
clause is an empty column for **more than four servings in five**. Under `VC-SYN-001` a feature adds
investor value when it lets a reviewer confirm a claim from the product itself; this is a claim he
cannot confirm today, on the one surface `VC-EXIT-012` promises him as his diligence surface.

**Cheapest variant:** add the caller identity to the `ai_activity_log` row the serving path already
writes, and split one displayed total into two. No new table, no migration, no model call.
Honest absence per `C-invar-15`: a serving with no identifiable caller renders as **unattributed**,
never as an invented attribution.

**Read this against `AGT-323` before filing it.** The pass built it deliberately adjacent and said
so: `AGT-323` is the *served content's* identity (content hash, bundle version, which rows went
out); this is the *caller's* identity on the same row — a different column and a different claim,
and `AGT-323` landing would not close it. **If the manager reads them as one ticket, merge this into
`AGT-323` rather than filing a second row**, and the 82% figure belongs in whichever row survives.
That is the pass's own recommendation and it is the right one: `AGT-323` has been open 28 days and a
second adjacent row would make the shelf longer, not shorter.

### Proposal 2 — bind three locked claims to checks that may fail in public (P3, 2 cycles)

**Claim:** the three checkable clauses of the locked pitch — routing, attribution, feedback loop —
stop being sentences and become rows, each carrying a named check that runs on request and renders
beside its last result and timestamp. A check that has never run reads **never checked**; one that
fails reads **failing**, in public.

**Why it clears the anti-P3 clause:** `VC-EXIT-026` names *additional dashboards without new
mechanism* as what does not move the needle. A dashboard adds a view over numbers that already
exist; this changes what a claim **is** in the data model — prose becomes a row with an executable
check that is allowed to fail where anyone can see it.

**The buyer-side literature has converged on exactly this shape**, and that is the market evidence
rather than a preference: assurance as explicit claims each backed by its own evidence, with
collecting attestations and treating volume as rigor called out as *getting the diligence
backwards* ([RockCyber 2026-05-05](https://rockcyber.com/blog/third-party-ai-assurance-evidence));
and the model-card-states-a-claim versus evaluation-artifacts-let-a-buyer-check-it distinction
(SoftwareSeni). Both are vendor-authored — the agreement *across* them is the signal, not either on
its own. An IETF draft (`draft-messous-eat-ai`) is standardising per-agent claims for model
integrity, training provenance and runtime authorization while explicitly not defining a full AI
Bill of Materials — **UNVERIFIED at source**, `datatracker.ietf.org` is ENOTFOUND from this
environment, and **it must not be quoted externally until someone opens that page.**

**The honest risk, stated rather than hidden:** read as marketing copy with live numbers in it, this
is P5-shaped and fails the pull test. The mitigation has to be on the row — the check, its timestamp
and its verdict visible, with `C-invar-15` (honest absence) and `C-invar-20` (measurement defence)
governing every rendered value. **Proposal 1 should land first**: the first check this would bind is
proposal 1's own attribution number.

### Killed, with the reason on each

| Candidate | Why it died |
|---|---|
| A removal receipt for a client's taught material | The gap is real — `knowledge_entries` has no `updated_at`, no `deleted_at`, no custody record — but retention-and-enforced-deletion is an itemised vendor-questionnaire line (GLACIS DG-3, April 2026): an **administrative expectation**, pattern 137, which classifies by function. Already owned by `AGT-438` over `DAT-29`. |
| A maintained-dashboard Deliverable object | By function this is buy-pull, so it classes to `VC-ROOT-004` and not P3; and the category is mature, not open — Gartner retired its Government Open Data Management Platforms market on 2025-10-01 and Tyler's Open Data Platform already ships catalogue, APIs, charts, maps and dashboards. **Re-file under P4 if John wants the public-sector lane**; see also Napkin idea `n_c60dd0ef…`, which is the sales side of the same ask. |
| Buyer-path telemetry on the product's own funnel | Runs straight into `VC-EXIT-026`'s anti-P3 clause, and web analytics is pattern 137. The underlying fact — nobody has opened the product in 19 days — is load-bearing and was carried into proposal 1 instead. |
| Per-answer cost | Already decided: the **held cost-per-deliverable payload** (2026-09-11 18:20Z, held pending `SES-369`). Not re-proposed. Last week's recommendation to release it rather than accept a duplicate row stands, and this week sharpened it again — the free alternative's per-routine dollars are now reproduced at the primary file (see below). |
| Knowledge-bundle identity | This lane's own 2026-W40 proposal, `audit_findings` row `cf3d80b5`, status `ticketed`, `filed_backlog_id` **`AGT-323`**. Not re-proposed — `AGT-504`, delivered 2026-10-26, is what let the pass see this for itself through `--prior-proposals`. |
| Graded vendor independence | `AGT-302`, open 29 days. Not re-proposed. |

---

## Where I confirmed, and where I contradict, the market records

**90 `market_records` rows were written since the last run** (28 objection, 24 competitor, 15
`feature_benefit`, 15 `release_note`, 8 `feature_signal`) across two product-marketing scans,
2026-10-21 and 2026-10-28. Every one was treated as a lead; the load-bearing competitor claims were
re-checked at their own sources.

**This is the first run that could correct a wrong record instead of only complaining about one.**
`AGT-470` delivered `public.apply_claim_recheck()` on 2026-10-25 — the handle the playbook's prompt
block names and the live interim prompt does not know about. **Eight rechecks were applied**, each
as one reversible decision with its own before-image: `market_records` was never updated directly,
a `holds` stamps the row, and a `corrected` / `unverified` retires it and inserts a same-kind
replacement carrying `supersedes`.

### Five CONFIRMED (`holds`) — four competitor claims here, plus the egress signal further down

| Record | What the recheck found at source |
|---|---|
| Workday / C1.ai | **Confirmed exactly as recorded.** Announced **2026-10-13**, has **not** closed; expected Q4 FY2027 (ends 2027-01-31), terms undisclosed, extending the Agent System of Record from *registering* agents to *governing what they reach*. [c1.ai newsroom](https://www.c1.ai/news/press-release/workday-to-acquire-c1-ai), startwithidentity.com 2026-10-13 |
| Netskope AgentSkope | **Confirmed**, announced **2026-10-06** — one console, one pool of committed capacity credits across agents, one utilisation dashboard. *One nuance to carry:* the docs describe a monthly quantity across the contract term that **resets monthly**, not a single pool. [GlobeNewswire 2026-10-06](https://www.globenewswire.com/news-release/2026/10/06/3375578/0/en/index.html), docs.netskope.com |
| OpenAI dots | **The 2026-10-28 record's caution was right and is upheld.** Secondary coverage agrees dot memories cannot be viewed, deleted or edited and that deleting the dot is the only removal — but the vendor FAQ is unopenable from here, so the **2026-10-21** record's "confirmed at the vendor FAQ" wording is not reproducible. Keep the paraphrase hedge. |
| Reinventing.AI cost table | **Upgraded from existence to figures, at the primary file.** `docs/COST.md` read in full at [raw.githubusercontent.com](https://raw.githubusercontent.com/markfulton/ai-employees/main/docs/COST.md): 8 routines priced at Opus 5 API list, per-routine means **$3.35–$7.50**, a skipped fire ~$0.99, **~$19.49 a weekday and ~$500 a month for ONE employee**, with `cost_usd` and `cost_basis` as run-record fields. Last run confirmed the table existed; this run has its numbers. |

### Two CORRECTED — and in both cases the record's *body* was right and its *title* was not

This is worth stating as a pattern, because it is the same failure twice and it is the half that
gets quoted in a room. **In neither case was the research wrong.**

**Microsoft.** The record's body quotes Microsoft's licensing FAQ 122 correctly: `$15/user/mo` is
the **Agent 365 standalone** list price and `$99` is E7; it also gives Copilot Business at `$18` and
Business Premium with Copilot at `$32`. The **title** put the `$15` next to "Microsoft 365 Copilot",
which reads as Copilot costing $15. Corrected title only, body kept verbatim. The record's "separate
per-user licence on a qualifying tier" clause is correct and stands.

**Sia.** The body already says to use "more than 800, April 2026" and to name 1,000 as an
unconfirmed company headline — *"the direction is certain; the count is not."* The **title**
compressed that into "the defensible count is 800, not 1,000", which overshoots: 800 is the
well-sourced **April** figure, and Sia's own site does carry a later over-1,000 release. Corrected
title only. **This one lands on my own earlier report:** 2026-10-17 cited "over 1,000" off that
headline, so the nuance is exactly the point.

### One UNVERIFIED, deliberately not "corrected"

**Meta Muse.** The record rests its seat-counted claim on adlibrary.com search-result text; my
recheck found TechCrunch 2026-09-29 and eesel describing Muse for Small Business running on ordinary
Muse plans (free / ~$20 / ~$100) with no team plan and no per-seat price, with Business Agent billed
separately per token. **Both sides are secondary and neither opened `meta.com` or `about.fb.com`,
which are ENOTFOUND from here, so I will not assert my secondary over theirs.** Marked `unverified`,
not `corrected`. The record's own cheapest-next-evidence line already names the fix and it is now
three runs old: read Meta's Muse help pages from an environment that can reach them.

### And one place I contradict my own research pass, not the record

The pass reported that **no source says Grok Bot's memory is "server-synced" or under construction,
and recommended dropping that clause.** That is wrong, and I did not act on it. The record names its
source — an analysis of build 0.39.0 reporting memory-shard methods absent from 0.30.0
(`runtimewire.com`) — and grades it correctly in its own body: *"That is reverse engineering, not a
product statement."* The pass simply did not surface that page. **No recheck was filed against this
record**; the shared-weekly-pool half the pass confirmed was already what the record says.

Recording this because a research lane that only ever corrects *other* writers is not checking
itself. The sub-agent's two platform numbers were also re-measured here rather than accepted, and
one of them turned out to understate the problem.

### The egress split is wider than the records have it

The 2026-10-28 `feature_signal` names **five** unreachable vendor hosts. This run adds **four more**
— `datatracker.ietf.org`, `haserjian.github.io`, `finance.yahoo.com`, `www.hpcwire.com` — and
`microsoft.com` answered **503**. WebSearch worked for all 11 queries; WebFetch resolved only
`github.com` and `raw.githubusercontent.com`. Recorded as a `holds` on that signal with the wider
list in its reason: the signal's substance is right, its host list is incomplete. **This is the
fourth consecutive run to file the same split**, and the runbooks still record the inverse.

---

## How this run was performed

- **Playbook:** `docs/runbooks/researcher-routine.md` is on `origin/dev`, so its Steps 0–5 were
  followed in place of the live routine's 2026-09-25 INTERIM text, as that paragraph instructs.
- **Meter (Step 0):** `public.routine_meter_ok()` → `ok=true`, `reason='ok'`,
  `all_models_pct=23`, `threshold=28.57`.
- **Prompt drift (Step 0):** `node scripts/check-routine-prompt.js --routine=researcher` exited
  **1**. The playbook documents exit 1 as expected drift; **finding 1 above is that the drift is no
  longer only the interim paragraph.**
- **Branch:** `session/researcher-20261031`, branched from `origin/dev`.
- **Napkin (Step 1):** 7 rows written, one `UPDATE` each under its own before-image
  (`runner_before_images`, `session_name researcher-2026-W44`), other writers' columns verified
  byte-unchanged afterwards.
- **Prompt assembly (Step 2):** `node scripts/agent-prompt.js --agent=researcher
  --capability=research-class-lens --intent=rs-research-intent
  --prior-proposals=researcher:weekly-market --task-file=…` — exit 0, 19,902 bytes, no section
  omitted. Nothing was hand-built.
- **Model:** `claude-opus-5`, the model that command printed — the `judgment` lane
  (`claude-fable-5-1`) was **degraded to the orchestrator model on `fable_pace`**, reported in the
  assembly's own `# lane:` header.
- **Turn logged** with `scripts/agent-log.js` (`--ai-type=autonomous-research`,
  `--feature=research-class-lens:rs-research-intent:depth0`, model `claude-opus-5`,
  `--latency-ms=585195`), tokens recorded **NULL = unmeasured**: the session could observe a total
  but not the input/output split, and the script's all-or-nothing rule makes an honest "unmeasured"
  worth more than an invented figure. `ai_activity_log id=77439`.
- **Rechecks:** 8 × `public.apply_claim_recheck(NULL, 'researcher-2026-W44', …)` — 5 `holds`,
  2 `corrected`, 1 `unverified`. No direct write to `market_records`.
- **Filing:** `file_invention_proposal()` **not called** (`SES-369`). Findings and proposals went in
  through `scripts/audit-ledger.js --apply --session-name=researcher-2026-W44`.
- **Not touched:** no `agents.is_active` flip, no routine created, edited or flipped, no push
  notification, no write to `career_records`, nothing pushed to `main`.

---

## Appendix — the `research_doc` returned by the pass, unedited

What follows is the `research_doc` the `research-class-lens` turn returned, reproduced without
edits. Where it disagrees with the body of this report, **the body is this run's position** — in
particular the Grok Bot clause (the pass was wrong, see above), the MCP attribution figures (the
pass measured the MCP slice; the whole ledger is worse), and the Sia count (the pass's own form is
the one adopted).

---

<!-- DeepBench | docs/research/2026-10-31-weekly-market.md | The Researcher, capability
     research-class-lens, run kind weekly-market-review, model claude-opus-5 (lane judgment
     degraded to claude-opus-5, fable_pace). Run 2026-10-31. Window 2026-10-24 -> 2026-10-31
     (ISO week 2026-W44).
     LENS: P2 and P3 tie at 0 ratified, so not a full tie; fewest proposed breaks it (127 vs 128)
     and the lens is P3 - Investor Value. THIRD consecutive week on P3.
     EGRESS: ok. WebSearch worked for all 11 queries. WebFetch resolved only github.com and
     raw.githubusercontent.com; it returned ENOTFOUND for datatracker.ietf.org,
     haserjian.github.io, finance.yahoo.com and www.hpcwire.com -- FOUR HOSTS BEYOND the five
     already recorded (akyn.ai, peerpush.com, sia-partners.com, businesswire.com,
     newsroom.workday.com) -- and microsoft.com answered 503. The split filed as a defect on
     2026-10-03 and again on 2026-10-17 is unchanged and the host list is growing.
     FILING GATE: shut (SES-369). file_invention_proposal() was NOT called. Two proposals are
     returned as audit_findings of finding_type proposal.
-->

# Weekly Market Review - 2026-10-31 (week 2026-W44)

**Lens:** P3 - Investor Value. **Window:** 2026-10-24 -> 2026-10-31.
**Filing gate:** shut (`SES-369`). **Proposals this run: two.**

A feature adds P3 value when it lets a skeptical technical reviewer confirm a claim from the
product itself (`VC-SYN-001`). That is the test every candidate below was scored against.

---

## The pitch

DeepBench's investor sentence is locked: *"the only AI workforce platform where improving agent
quality is a training operation, not a software release - because the routing, attribution, and
feedback loop are already built into the data model"* (`VC-EXIT-008`). John's own success test for
that sentence is not a deck: *"passes any chief architect's skeptic eye?"* (`VC-EXIT-007`), and the
audit surface is supposed to double as the diligence surface, so an acquirer's architect can verify
the agentic claims from the product itself (`VC-EXIT-012`).

Measured this week, the sentence has no reachable proof. Of 906 knowledge servings DeepBench
handed out between 2026-10-24 and 2026-10-31, **742 - 82% - carry no caller identity of any kind**:
`visitor_id` null and `caller_ip` null on the same row. Exactly one distinct visitor is named across
the whole week. So "attribution ... already built into the data model" is, for four servings in
five, an empty column. And no human has opened the product since **2026-10-11 19:04:39Z** - 19 days
- so every usage number a reviewer might be shown rests on that ledger and nothing else.

The two proposals are the two cheapest things that turn a sentence a reviewer must take on trust
into something he can check himself: **name the caller on the serving record**, and **bind each
locked claim to a check that runs live and is allowed to fail in public.**

---

## What the market says (live, dated)

### In-window (2026-10-24 -> 2026-10-31)

1. **Virtana launched Agentic Observability Enterprise Management, 2026-10-28** - agents assembled
   across vendors for the whole IT incident lifecycle, with **MCP supplying enterprise-wide context
   and A2A handling agent-to-agent collaboration**; available now to select customers, GA planned
   Q1 2027. Source: [AIwire/HPCwire, 2026-10-28](https://www.hpcwire.com/aiwire/2026/10/28/virtana-introduces-ai-agent-orchestration-for-it-incident-management/)
   and [Virtana's own release](https://www.virtana.com/press-release/virtana-first-to-extend-agentic-ai-across-every-axis-of-the-enterprise-stack/).
   *Read from dated search text; both hosts are ENOTFOUND here.* **Why it matters for P3:** the
   serious observability vendors now treat MCP as the context transport between organisations.
   DeepBench serves 906 knowledge bundles a week over that same transport and cannot say who
   received one.
2. **One in-window claim was dropped rather than cited.** An aggregator dated a BetterCloud "AI
   spend tracking and agent lifecycle management" release to 2026-10-29. Searched at source:
   BetterCloud's own product-updates and press pages carry no dated October 2026 announcement, and
   its spend tracking is the G2 Track line acquired 2024-03-12. **Not cited as a market finding.**

### Still the load-bearing frame (dated, outside the window)

3. **The free alternative publishes per-routine dollars; this is now confirmed at primary source
   with the figures.** Read 2026-10-31 from
   [`docs/COST.md` in markfulton/ai-employees](https://raw.githubusercontent.com/markfulton/ai-employees/main/docs/COST.md):
   eight named routines priced at Opus 5 API list, means **$3.35 to $7.50** per run
   (`gtm-outreach-queue` $3.35, `gtm-scoreboard` $7.50), skipped fires ~$0.99, **~$19.49 on a plain
   weekday and ~$500/month for one employee**, over 27 clean runs 2026-08-26 -> 2026-09-04; and
   `scripts/runlog.mjs` accepts `cost_usd` and `cost_basis` (`api-list` / `subscription` /
   `unknown`) as run-record fields. The 2026-10-17 report confirmed the table existed; **this run
   reproduces its numbers.**
4. **An acquirer paid for agent *identity*, not agents.** Workday's definitive agreement to acquire
   **C1.ai** (the former ConductorOne) was announced **2026-10-13** and **has not closed** -
   expected in Q4 of Workday's FY2027, ending 2027-01-31, terms undisclosed; the stated plan is to
   extend the Agent System of Record from *registering* agents to *governing what they can reach*.
   Sources: [C1.ai's own release](https://www.c1.ai/news/press-release/workday-to-acquire-c1-ai),
   [startwithidentity, 2026-10-13](https://startwithidentity.com/blog/2026-10-13-workday-to-acquire-c1-ai-formerly-conductorone/),
   [AI Magazine](https://aimagazine.com/news/workday-buys-c1-ai-to-govern-what-ai-agents-can-access).
5. **"One catalogue, one credit pool, one view of consumption" is real and dated.** Netskope
   announced the **AgentSkope Marketplace on 2026-10-06**: one console to browse, deploy and manage
   agents, with controls that distribute **one pool of committed capacity credits across agents**, a
   credit calculator, and a dashboard showing utilisation and credit usage. Sources:
   [GlobeNewswire, 2026-10-06](https://www.globenewswire.com/news-release/2026/10/06/3375578/0/en/index.html),
   [docs.netskope.com - AgentSkope Marketplace](https://docs.netskope.com/en/agentskope-marketplace/)
   and [Allocation](https://docs.netskope.com/en/allocation/).
6. **The buyer-side literature has converged on claims-plus-evidence, and against attestation
   volume.** [RockCyber, 2026-05-05](https://rockcyber.com/blog/third-party-ai-assurance-evidence)
   describes the structure as the vendor stating explicit assurance claims and backing each one with
   its own evidence (training-data provenance, test reports), and says collecting attestations and
   treating volume as rigor "gets the diligence backwards"; it attributes the claims-and-evidence
   shape to the DoD framework for AI-enabled systems.
   [SoftwareSeni](https://www.softwareseni.com/how-to-require-evaluation-artifacts-from-ai-vendors-before-signing-any-contract)
   draws the same line: a model card describes what the vendor *claims*, evaluation artifacts let a
   buyer *check* whether it is true. Both are vendor-authored; the agreement across them is the
   signal, not either one alone.
7. **An IETF draft is standardising agent claims, and explicitly stops short of a bill of
   materials.** `draft-messous-eat-ai` proposes EAT-based claims for AI agents covering model
   integrity, training provenance and runtime authorization, and states it does not define a full
   AIBOM. [datatracker.ietf.org/doc/draft-messous-eat-ai](https://datatracker.ietf.org/doc/draft-messous-eat-ai/),
   read as dated search text 2026-10-31 - **the datatracker host is ENOTFOUND here, so this is
   UNVERIFIED at source** and must not be quoted externally until someone opens it.
8. **Deletion evidence is already an itemised procurement question.** The GLACIS AI security
   questionnaire (**updated April 2026**) asks, as DG-3, *"What is the data retention policy for
   user prompts and model outputs? How is deletion enforced?"*, naming EU AI Act Art. 12 and
   expecting retention policy and deletion procedures as the evidence.
   [GLACIS guide](https://glacis-landing-4fg.pages.dev/guide-ai-security-questionnaire).
   This is cited below as the reason a candidate was **killed**, not built.

---

## What the buyer-side diligence literature names

The template's section here is *"what the job postings name."* Job postings are the P1 pull test
(pattern 149) and say nothing about investor value, so for a P3 run the equivalent evidence is what
a buyer's reviewer is documented to check. Named substitution, stated so it is not mistaken for the
P1 leg.

1. **Explicit claims, each with its own evidence** - not a summary and not an attestation count
   (RockCyber, 2026-05-05).
2. **Artifacts that let the buyer check the claim himself**, as against a card that states it
   (SoftwareSeni).
3. **Per-call binding of a specific call to a specific model version, prompt and context** - the
   attestation literature's recurring requirement.
4. **Retention and enforced deletion, with named evidence** (GLACIS DG-3, April 2026).
5. **What the agent can read, what it can change, and who can switch it off** - the agent-specific
   additions to the standard vendor questionnaire.

Items 1-3 are what the two survivors answer. Item 4 is what killed candidate 3 below: it is an
administrative expectation by pattern 137, and already owned.

---

## Vision-corpus grounding cited on the rows

- `VC-SYN-001` (P3, proposed) - investor value is what lets a skeptical technical reviewer confirm a
  claim from the product itself. Both survivors are read directly off this sentence.
- `VC-EXIT-007` (P3) - the success test is a skeptical technical diligence pass, not a pitch deck.
- `VC-EXIT-008` (P3) - the locked pitch: routing, attribution and feedback loop already in the data
  model. Survivor 1 is the attribution clause, measured and found empty 82% of the time.
- `VC-EXIT-012` (P3) - the honest audit surface doubles as a due-diligence surface.
- `VC-EXIT-021` (P3) - P3 features strengthen attribution end to end: complete lineage, zero
  unexplained rows, because diligence trust dies on one wrong number.
- `VC-EXIT-026` (P3, anti-P3) - cosmetic polish, synthetic demo data and additional dashboards
  without new mechanism do not move the needle. This is the clause both survivors had to clear, and
  it is why survivor 2 is claims-bound-to-checks rather than a diligence dashboard.
- `VC-THESIS-021` - the locked tiebreaker: does this impress a procurement director AND a VP of
  Product reviewing John's portfolio. Survivor 1 passes on the procurement side (who was served),
  survivor 2 on the VP side (a claim that can fail in public is a design decision, not a slide).
- `C-invar-14`, `C-invar-15`, `C-invar-20` - if it cannot be verified do not show it; render honest
  absence; any number that leaves the platform ships with its measurement defence. Survivor 1 shows
  unattributed servings as unattributed; survivor 2 shows a failing check as failing.

---

## The runners-up, and why they ranked lower

**3. A removal receipt for a client's own taught material** - where it lives, every serving that
used it, and a dated record of its removal. Real gap: `public.knowledge_entries` carries
`tenant_id`, `origin` and `origin_caller` but **no `updated_at`, no `deleted_at` and no custody
record at all** (read 2026-10-31), and the usage signal says both named demands ask for it.
**Killed on pattern 137 and function.** Retention-and-deletion is an itemised line on an April 2026
vendor questionnaire (GLACIS DG-3) - an administrative expectation, which classifies by function,
not by lens. And it already has owners on the board: `AGT-438` (revoke anon SELECT on
`knowledge_entries`, P9, open), with `DAT-29` as the RLS floor beneath it. The 2026-10-17 run killed
the same family for the same reason; I agree with it.

**4. A maintained-dashboard Deliverable object** for the named public-sector ask. **Killed as P4 by
function, in a mature category.** Gartner retired its "Government Open Data Management Platforms"
market on 2025-10-01 and Tyler's Open Data Platform already ships catalogue, APIs, charts, maps and
dashboards. A buyer-pull feature classifies to `VC-ROOT-004`, not P3.

**5. Buyer-path telemetry** - nobody has opened the product since 2026-10-11 and nothing watches the
path. **Killed on `VC-EXIT-026`**: a funnel view is an additional dashboard without a new mechanism,
and by pattern 137 web analytics is an administrative expectation. The *fact* is load-bearing and
appears in survivor 1's usage argument; the dashboard is not the fix.

**Three candidates were dropped before scoring because they are already on the board.** Named here
so the Development Manager can see the lane is not re-deriving them: per-answer cost is the **held
cost-per-deliverable payload** (decided 2026-09-11 18:20Z); knowledge-bundle identity is
**`AGT-323`** (`audit_findings` row `cf3d80b5-9ce6-4139-adfb-09f670264f9b`, week 2026-W40, status
`ticketed`), P3, open, created 2026-10-03, **never updated in 28 days**; graded vendor independence
is **`AGT-302`**, P3, open since 2026-10-02.

---

## How it reaches the build queue

The filing gate is shut (`SES-369`). `file_invention_proposal()` was not called and no
`backlog_items` row was written. Both proposals are returned as `audit_findings` of
`finding_type proposal` for the Development Manager's ruling, each with its source and locations,
per the 2026-09-25 routine.

**The pacing fact that outranks both proposals.** The P3 shelf already holds **five unbuilt
tickets** - `AGT-323` (28 days), `AGT-302` (29 days), and John's own `AGT-72`, `AGT-73`, `AGT-74`
from 2026-09-11 - and the window delivered **five tickets, four P9 and one P10, zero in P1-P4**
(measured over `backlog_items` 2026-10-31). That is the **second consecutive week with no
buyer-visible delivery**. A sixth and seventh P3 ticket do not fix a shelf that is not being drawn
from. If the Development Manager can take only one action from this run, it should be to **draw from
the P3 shelf**, starting with `AGT-323`, whose fix is one file plus a regression test; the two
proposals below are for the queue behind it.

---

## The usage signal that proves it

Measured live over `public.ai_activity_log` on 2026-10-31, window 2026-10-24 -> 2026-10-31:

| call_source | calls | priced (`cost_usd` not null) | unpriced |
|---|---|---|---|
| `mcp` | 906 | 23 | 883 |
| *(null)* | 1,133 | 0 | 1,133 |
| `session` | 185 | 0 | 185 |
| **total** | **2,224** | **23** | **2,201** |

| Attribution on the 906 `mcp` servings | rows |
|---|---|
| distinct `visitor_id` values | **1** |
| `visitor_id` null **and** `caller_ip` null | **742 (82%)** |

- **Last `ui` call: 2026-10-11 19:04:39Z** - 19 days ago, against 3,167 `ui` calls in the trailing
  90 days. The product is being *served* heavily and *opened* by nobody.
- Only `screen_origin` `mcp` has any priced rows (23 of 906); 1,318 of 2,224 rows carry no
  `screen_origin` at all.

**Survivor 1's measure** is the share of servings that resolve to a named caller, published with the
unattributed share beside it rather than folded into one total - today it starts at 18% and every
point of movement is a fact a reviewer can re-derive from the ledger himself.

**Survivor 2's measure** is each bound claim's last check: when it ran, what it returned, and
whether it passed. A claim whose check has never run reads *never checked*, not *true*.

---

## Where I confirm, and where I contradict, the week's market records

110 `market_records` rows span the two scans (24 competitor, 28 objection, 15 feature_benefit, 15
release_note, 8 feature_signal). Every load-bearing claim was re-checked at its original source.

### CONFIRMED

1. **Netskope AgentSkope Marketplace, 2026-10-06** - one catalogue, one committed credit pool
   distributed across agents, one dashboard of utilisation and credit usage. Confirmed at the
   release and at Netskope's own docs. One nuance the record does not carry: the press release
   describes a single commitment while the docs describe a monthly quantity committed across the
   contract term, and capacity resets monthly.
2. **Workday to acquire C1.ai, announced 2026-10-13, not closed** - confirmed, including at C1.ai's
   own newsroom. Close expected in Q4 FY2027 (ends 2027-01-31), terms undisclosed. The record is
   right to say announced-not-closed and should keep saying so until a completion release exists.
3. **Reinventing.AI's published per-routine cost table** - confirmed at the primary file with the
   numbers reproduced above. Carry the nuance the record must not lose: the dollars are **API-list
   equivalent**, the subscription view is a *share of plan usage* and not dollars, the table covers
   **one employee of eight**, and `cost_usd`/`cost_basis` are optional fields "filled only where a
   harness exposes them."
4. **OpenAI dots' memory is not inspectable, and the 2026-10-28 record is right to hedge.** The
   2026-10-21 record claimed this confirmed at the vendor FAQ. I could not open the FAQ either
   (`help.openai.com` was not reachable through the fetch path). Secondary coverage is consistent -
   a dot's memories cannot be viewed, deleted or edited, and the only removal is deleting the dot -
   but **the "confirmed at the vendor FAQ" wording is not reproducible from this environment**, so
   the 2026-10-28 correction to paraphrase stands and should not be reverted.

### CONTRADICTED

5. **"Microsoft 365 Copilot: $15/user/month" is wrong, and the two products are being conflated.**
   **$15/user/month is Agent 365**, standalone, generally available **2026-05-01**, licensed per
   human user and not per agent, with M365 E7 bundling E5 + Entra Suite + Copilot + Agent 365 at
   **$99/user/month**. **Microsoft 365 Copilot is ~$30/user/month** commercial. The record's second
   clause - Agent 365 governance is a separate per-user licence on a qualifying tier and not
   included - **is correct** and sources agree the standalone price excludes the agents' own
   consumption, which bills as Copilot Studio credits. Sources:
   [SAMexpert](https://samexpert.com/agent-365/), [Rencore](https://rencore.com/en/blog/understanding-microsoft-agent-365-pricing),
   [Monetizely](https://www.getmonetizely.com/articles/microsoft-365-copilot-vs-agent-365-how-is-microsoft-pricing-its-ai-revolution-in-productivity).
   **All secondary** - microsoft.com answered 503 on the fetch. This also *confirms the direction of
   the 2026-10-17 report's own correction*; the record has drifted back. **Never quote
   $15/user/month as Copilot's price.**
6. **"Sia Agent Store: the defensible count is 800, not 1,000" is half right, and the correction
   overshot.** 800 is the **April 2026** figure and it is well sourced -
   [Business Wire](https://www.businesswire.com/news/home/20260409310219/en),
   [Business Wire China, 2026-04-15](https://www.businesswirechina.com/en/news/62652.html),
   [01net](https://www.01net.it/riassunto-da-ambizione-nellintelligenza-artificiale-a-intelligenza-applicata-su-larga-scala-sia-raggiunge-un-nuovo-traguardo-con-oltre-800-agenti-nel-suo-agent-store/).
   But Sia's **own corporate-news page carries a later release headed "Over 1,000 Agents"**, and the
   French edition says *"plus de 1 000 agents"*. So the right form is **"over 800 as of April 2026;
   Sia's own site claims over 1,000 in an undated-from-here later release"** - not "800, not 1,000."
   The 2026-10-21 record's 1,000 was Sia's own claim, which is a provenance problem, not a factual
   error. `sia-partners.com` is ENOTFOUND here, so the later release's date could not be pinned.
7. **"Meta Muse for Small Business: the business bundle is now seat-counted with its own agent
   capacity" is not supported and reads as wrong.** Muse for Small Business launched **2026-09-29**
   (US and Canada) and **is not a separate product with its own price** - it runs on the ordinary
   Muse plans (free with a weekly cap, Power **$20/mo**, Maximum **$100/mo**), and third-party
   analysis finds **no team plan, no per-seat price, no annual option and no invoice billing**
   anywhere. The customer-facing **Meta Business Agent** bills separately at **$2.00 per 1M tokens**
   (~4-5c a message). The only seat-counted figures in circulation are a third-party worked example,
   not a Meta bundle. Sources: [TechCrunch, 2026-09-29](https://techcrunch.com/2026/09/29/meta-is-expanding-its-ai-agent-muse-to-small-businesses/),
   [eesel.ai pricing analysis](https://www.eesel.ai/blog/meta-muse-small-business-pricing).
   Secondary; Meta's own pricing page was not opened.
8. **"Grok Bot: the Bot allowance is now a shared weekly pool" is supported; "server-synced memory
   reported under construction" is not.** The shared pool is consistently reported - Bots draw on
   the same weekly pool as Grok and Cursor, with Premium 4x / Super 15x / Ultra 50x multipliers, and
   one source says team seats do **not** pool. Plan eligibility is genuinely contradictory across
   sources (X Subscription Premium $30/mo vs Cursor Pro+ $60 vs beta-only for SuperGrok Heavy),
   so **do not state an entitlement**. On memory: sources describe persistence between sessions and
   shared team memory with per-person private notes, but **no source uses "server-synced" or
   describes it as under construction**. Source: [Codersera Grok Bot guide 2026](https://codersera.com/blog/grok-bot-complete-guide-2026/).
   Drop the server-synced clause until a primary source carries it.

### Also, on the records' own egress note

The 2026-10-28 feature signal says five named vendor hosts are unreachable and four competitor
records therefore rest on secondary text. **Confirmed, and the number is low.** This run added
**four more** unreachable hosts - `datatracker.ietf.org`, `haserjian.github.io`,
`finance.yahoo.com`, `www.hpcwire.com` - and `microsoft.com` answered 503. WebFetch resolved exactly
two hosts all run: `github.com` and `raw.githubusercontent.com`. WebSearch worked for all 11
queries. The consequence for the records' owner: **secondary-text sourcing is the normal case here,
not the exception**, and every competitor record should carry that label by default.

---

## Proposals for The Development Manager

Both are returned as `audit_findings`, `finding_type proposal`. `invention_due()` allowed 2.

### 1. A knowledge serving that cannot name who it served

**Class:** P3 - Investor Value. **Predicted cycles:** 1.
**Claim refs:** `VC-SYN-001`, `VC-EXIT-008`, `VC-EXIT-021`, `VC-EXIT-012`, `VC-THESIS-021`.
**Locations:** `api/_lib/mcp.js`, `api/_lib/handlers/agent-bundle.js`,
`src/screens/ConnectScreen.jsx`.

The locked pitch says attribution is already built into the data model. Measured 2026-10-31 over the
window: 742 of 906 servings carry `visitor_id` null **and** `caller_ip` null, one distinct visitor
all week, and no human has opened the product since 2026-10-11 - so every usage number a reviewer
could be shown traces back to a ledger that cannot name its own consumer. Meanwhile Workday is
paying an undisclosed sum for an agent-identity platform (2026-10-13) and Netskope shipped one view
of per-agent consumption (2026-10-06): the competitor set is buying exactly the column DeepBench
leaves null. **Cheapest variant:** the serving path records the caller identity the MCP handshake
already supplies on the same ledger row it already writes, and the surface that reports servings
publishes named and unattributed as two numbers instead of one total - honest absence per
`C-invar-15`, never a fabricated attribution. One file plus the display, no new table.

**Deliberately adjacent to `AGT-323`, and not a duplicate of it.** `AGT-323` is the *served content's*
identity - content hash, bundle version, which rows went out. This is the *caller's* identity on the
same row. Different column, different claim, and `AGT-323` landing would not close it. If the
Development Manager reads them as one ticket, **merge this into `AGT-323` rather than filing it
twice** - that is the honest instruction, and the 82% figure is the number that belongs in whichever
row survives.

### 2. The locked claims are prose; bind each to a check that may fail in public

**Class:** P3 - Investor Value. **Predicted cycles:** 2.
**Claim refs:** `VC-SYN-001`, `VC-EXIT-007`, `VC-EXIT-012`, `VC-EXIT-026`, `VC-THESIS-021`.
**Locations:** `src/screens/ConnectScreen.jsx`, `docs/ARCHITECTURE.md` (the locked pitch it binds),
`api/_lib/handlers/` (the check runner).

`VC-SYN-001` says investor value is what lets a skeptical reviewer confirm a claim from the product
itself, and `VC-EXIT-007` says the test is a diligence pass, not a deck - yet the platform's claims
exist only as sentences a reviewer must accept. The buyer-side literature has converged on precisely
the opposite shape: explicit claims each bound to its own evidence, with attestation volume called
out as getting diligence backwards (RockCyber, 2026-05-05), and evaluation artifacts rather than a
card that merely states the claim (SoftwareSeni); an IETF draft is standardising agent claims for
model integrity, training provenance and runtime authorization. **Cheapest variant:** take the three
checkable clauses of the locked pitch - routing, attribution, feedback loop - make each one a row
carrying a named check, run the checks on request, and render each claim beside its last result, its
timestamp and the check that produced it, on the surface a reviewer already lands on. Three claims,
not the corpus.

**Why this is not the dashboard `VC-EXIT-026` forbids.** A dashboard adds a view over numbers that
already exist. This changes what a claim *is* in the data model: prose becomes a row with an
executable check, and a check that fails renders as failing on a public surface rather than being
quietly absent. Start at three claims precisely so it cannot grow into a diligence portal. **The
honest risk, stated:** read as marketing copy with live numbers in it, this would be P5-shaped and
fail the pull test - so the check, its timestamp and its result must be on the row and visible, and
a claim whose check has never run must read *never checked*, never *true*.
