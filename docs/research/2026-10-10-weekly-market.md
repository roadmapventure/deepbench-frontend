<!-- DeepBench | docs/research/2026-10-10-weekly-market.md | The Researcher, capability
     research-class-lens, run kind weekly-market-review, model claude-fable-5-1, run 2026-10-10.
     Window 2026-10-03 to 2026-10-10 (ISO week 2026-W41).
     FIRST RUN UNDER THE PLAYBOOK: docs/runbooks/researcher-routine.md exists on origin/dev as of
     this run (AGT-138, v7.0.608), so its Steps 0-5 were followed in place of the live routine's
     2026-09-25 INTERIM text, exactly as that interim paragraph instructs. The live trigger still
     carries the interim prompt until John's RemoteTrigger update; check-routine-prompt.js exited 1,
     which the playbook records as EXPECTED drift, and it is filed as a finding anyway.
     LENS: the first FULL census tie since the rule was written -- P2 and P3 both 0 ratified and
     both 101 proposed. Broken by priority order per register A4, so P2 - Inventive. Every prior
     weekly and invention pass chose P3; this is the first run ever to reach the P2 lens, which is
     precisely what VC-LRN-063 said had never happened.
     EGRESS: ok. Live WebSearch answered all 8 queries. Direct page fetches were DNS-blocked for
     every domain except platform.claude.com, so a finding resting on dated search-result text is
     labelled *Digest*; it rests on that text, not the page. The usage leg was read live from
     public.ai_activity_log, and every ticket and claim ref below was read fresh this run.
     NOT CALLED: public.invention_due() and public.file_invention_proposal(). Playbook step 3 states
     neither is called by this routine; proposals reach the intake as ledger findings instead. The
     volume cap of 2 follows the 2026-10-03 precedent. -->

# 2026-10-10 Weekly Market Review — Lens `P2 - Inventive`

**Root claim:** `VC-ROOT-002` (hard-to-replicate uniqueness; a feature competitors can easily copy is
not P2 however new it is to the platform). **Class reading:** `VC-SYN-002`: the P2 bar is the
least-tested goal on the board because John has never applied it to a real feature.
**Allowed:** 2 (a maximum, not a target). **Returned:** 0 — an honest zero, for the reason in
*The usage signal* below. **Ledger findings filed:** 6.

## The pitch

This pass's product is not a proposal. It is the **Test 3 recheck** that `VC-LRN-063` records as never
having run — the P2 definition requires every "the real competitors structurally won't build it"
verdict to decay and be rechecked on a cadence (`C-MAP-34`, `C-MAP-52`), and no recheck had ever
happened because the one recurring outside-research run had never drawn the P2 lens. It drew it this
week, for the first time, on a genuine tie.

The result is worth more than a fourth candidate would have been: **all three "confirmed P2" entries
in the catalog rest on a flaw.** One stands on a misattributed statistic, one on a mechanism that no
longer survives as written, and one on a verification that tested the wrong competitor set. None of
the three collapses — but the record was wrong in three places and is now corrected.

## Test 3 recheck — the mechanism named per `C-MAP-64`

### `C-MAP-37` Deliverable marketplace (`DL-09`, open, P2) — **DECAYED as written; holds in a narrower form**

The entry's stated mechanism is *"conflicts with a frontier lab's own API-revenue model (a paid resale
marketplace cuts into their own API revenue)."* The evidence points the other way. OpenAI's DevDay
recap (2026-09-29) says developers "can directly launch new native experiences inside ChatGPT", and
pre-event reporting says OpenAI hired Patreon's co-founder to lead a "Creator Product". A store inside
ChatGPT **adds take-rate revenue**; it does not cannibalise API revenue. The stated conflict is not a
conflict, so the mechanism fails `C-MAP-64`'s "name the actual reason" bar.

What still holds is **mass-market design**: a consumer store sells prompts and apps, never work product
carrying a named, trained seller and an audit trail. Supporting the lane's continued emptiness: GPT
Store creator compensation "was envisioned" but revenue-sharing implementation details "remain
unclear", and no revenue-share agent marketplace has shipped as of 2026-10-10.

**Obsolescence trigger (`C-MAP-71`), 12 months:** OpenAI ships paid dots with a creator revenue share.

### `C-MAP-38` Public governance record (`AGT-77`, open, P2) — **HOLDING, with a correction and two decay signals**

Mechanism: **liability and disclosure.** None of Copilot, ChatGPT or Claude publishes a per-change
record of which agent proposed, ruled on and built a change in a live product.

**The correction matters more than the verdict.** The catalog records this entry as "adversarially
verified UNIQUE against named competitors 2026-09-11 (Claude Code, Agno, Made by AiMe, Paperclip)."
**Not one of those four is in the `C-MAP-30` competitor set**, which is Copilot, ChatGPT and Claude.
The verification the catalog leans on tested the wrong set. This pass is the first to test the right
one, and the verdict survives it.

**Decay signals, both this week:** Anthropic published a report documenting four categories of
unintended model actions (2026-10-09), and Microsoft published a "Customer Zero" guide on how its own
staff build governed agents. Both are *periodic self-governance records* — not per-decision ones, so
the lane is not closed, but this is the nearest the competitor set has come, and it moved twice in
seven days. This verdict needs its next recheck sooner than the others.

### `C-MAP-39` Training provenance display (`AA-30` / `AA-08` / `AA-09`, open, P2) — **HOLDING on Test 3; grounding wrong, Test 1 narrowed**

Mechanism: **mass-market design.** Checked against each competitor's own launch coverage: dots show a
watchable cloud browser and an auto-review gate for account-touching actions; Muse for Small Business
shows owner approval before posting or buying; Grok Bot teaches a routine by demonstration and "takes
your corrections". **None of them shows what the agent was taught, by whom, when, or what it does not
know.** Test 3 passes.

**But the grounding is misattributed, and it is load-bearing.** `C-MAP-72` attributes "85% of
organizations have no formal accountability structure for agent behavior; only 7.2% can name a
responsible individual" to Fortune/Accenture-Wharton, March 2026. Rechecked: the Fortune piece
(2026-03-26) carries neither figure — its actual line is *"Intelligence may be scalable, but
accountability is not."* **Both figures come from Gravitee's own "State of AI Agent Security 2026"
survey, published via a Gravitee-sponsored TechCrunch post** — a governance vendor's self-published
marketing survey, not independent reporting. `C-MAP-72` is named as the grounding for `C-MAP-30`'s and
`C-MAP-39`'s "whole premise".

The premise nevertheless **survives the correction**, on better evidence found this run: VentureBeat
reports 85% of IT teams claim every AI agent is under control while only 42% say ownership is clear.
The gap's shape is independently corroborated; only the citation was wrong.

**Test 1 has narrowed this week.** `AGT-399` (every Skill visible read-only) and `AGT-409` (the Skill
editor) shipped, so the *display* half of this lane is now built, and Test 1 says deepening something
already built is P5 - Enhancements, never P2. What remains unbuilt is narrower and stronger: the
agent's own derived account of what it was taught, by whom, and what it was **not** — which is the
`AGT-418` / `AGT-251` lane (both open, both P4), not a new ticket.

## The week's market (live, dated)

| Date | Source | What it shows |
|---|---|---|
| 2026-10-09 | platform.claude.com release notes (**opened live**) | Claude Managed Agents gained "dynamic workflows" (beta): the agent writes a program that runs many agents in phases and combines results. **Multi-agent orchestration is now a header flag at a frontier lab** — `C-MAP-30`'s named exclusion, confirmed in practice rather than in principle. |
| 2026-10-07/08 | platform.claude.com release notes (**opened live**) | Claude Haiku 5.5 (1M context, adaptive thinking); SDK browser/computer-use toolsets with an approval callback; Compliance API now returns unified-experience chats and Claude Docs as Word (Enterprise, beta). **A compliance export exists; no per-agent taught-knowledge or provenance display.** |
| 2026-10-07 | unite.ai, geekwire.com (*Digest*) | Copilot on Copilot+ PCs gains local file context, recent activity, OS-wide actions and on-device models; Microsoft's "Customer Zero" guide shows its own staff building governed agents across Agent Builder / Copilot Studio / Foundry. |
| 2026-09-29 | siliconangle.com, openai.com DevDay recap (*Digest*) | OpenAI **dots** launched at DevDay: persistent always-on agents in ChatGPT, each on its own cloud computer, owner can "watch, or take over", account-touching actions pass an auto-review check. 20+ announcements; developers can launch native experiences inside ChatGPT. |
| 2026-09-29 | thestar.com.my, smallbiztrends.com (*Digest*) | **Muse for Small Business** launched (US + Canada): skills and connectors inside Muse (QuickBooks, Shopify, Stripe, Slack, Meta ads), owner approval before posting or buying, free with paid tiers coming; ~2.8M downloads in two weeks (Sensor Tower). |
| 2026-08-12 | techstrong.ai, thenextweb.com (*Digest*) | **Grok Bot** (SpaceXAI) beta: agent teams on cloud computers, "teach a routine by demonstration… takes your corrections", Team Edition ~$120/seat/month; enterprise tier waitlisted, one source says opened 2026-09-03. |

**The white space that is left.** Agent teams, cloud computers, owner approvals and human takeovers all
became table stakes inside seven weeks. What nobody in the competitor set shows the buyer is **what an
agent was taught, who built which capability, or who ruled on a change.** That is one lane, not three,
and it is the only one of the six whitespace lanes that moved *toward* DeepBench this week rather than
away.

## Where I confirmed or contradicted the week's market records

Read as leads, rechecked against original sources, never against the record. **This routine never
writes to `market_records`;** the four corrections below are filed as a ledger finding for whoever
owns that table.

| Record | Verdict |
|---|---|
| **OpenAI dots** — always-on ChatGPT agents | **Confirmed, date wrong.** Launched at DevDay **2026-09-29**, not 2026-10-05 as the record is dated. Pricing sources disagree with each other (a $500/mo plan vs. "first dot included on Pro/Business Premium/Enterprise") — unresolved. |
| **Grok Bot (SpaceXAI)** — agent teams and "Grok Bot for Enterprise" | **Product confirmed; the name is not.** No product literally named *"Grok Bot for Enterprise"* could be found. The real shape is Grok Bot, beta 2026-08-12, a waitlisted enterprise tier, Team Edition ~$120/seat/mo. |
| **Meta Muse and Muse for Small Business** | **Confirmed**, including the launch date and the business connectors. The record's reach-and-price read holds. |
| **Hazel AI** — procurement workflow for cities with a "Spend Visibility module" | **Company confirmed, module not.** Hazel AI is real and sells to cities (Dallas partnership for solicitation drafting, vendor identification and compliance; Carahsoft-listed). **No named "Spend Visibility module" exists** — only a third-party directory line about "real-time spending visibility and alerts". It *is* the vertical incumbent `VC-LRN-058` warned about in the Test 6 starting market. |
| **Reinventing.AI** — "AI Employees" + "Agent Ops Club" | **UNVERIFIED.** The site was unreachable from this session. Both records stay unconfirmed leads, not facts. |
| **`C-MAP-72`'s accountability statistic** (also the grounding the records lean on) | **CONTRADICTED.** Wrong source — Gravitee's sponsored survey, not Fortune/Accenture-Wharton. See `C-MAP-39` above. The gap itself is real on independent evidence. |

## The usage signal — and why this pass files zero

Read live from `public.ai_activity_log`, 2026-10-03 to 2026-10-10:

- **8 `ui` calls in the entire week** — 7 `agent-create` across **3 visitors**, 1 personnel-file.
- 2,124 `mcp` calls, of which **2,089 are `dan-db-assembly` by a single visitor across 208 agents** —
  the platform assembling itself, not a customer.
- 259 `session` calls (the runner, 72 visitors), 13 `script`, 3,525 untagged.

There are **no outside-user retries, abandonments or workarounds to read**, which is the behavioural
evidence `C-MAP-66` asks for. So `VC-LRN-057` holds unchanged: **Test 2 (real demand) has still never
been passed with DeepBench's own evidence.** Every P2 candidate on the board rests on John's stated
wants plus outside survey statistics — and this week one of those statistics turned out to be a
vendor's own marketing.

That is the honest reason for returning zero against an allowance of two. A fourth candidate graded on
the same unpassed test would have added a row, not evidence.

## Proposals for The Development Manager

Nothing is filed as a ticket — `file_invention_proposal()` was not called (playbook step 3). Six
findings were ingested into the one intake, `found_by researcher:weekly-market`, week `2026-W41`,
routed by the `researcher` row in `finding_routes` (precedence 30) to the Development Manager's pick.
`ingest 2026-W41: 6 findings, 6 new, 0 seen, 0 recurring, 0 ruled-out`.

| # | Type / confidence | What it says |
|---|---|---|
| 1 | defect / **high** | **`C-MAP-72` is misattributed.** Re-cite to Gravitee (and mark it vendor-sponsored), or replace it with the VentureBeat corroboration; then re-run `C-MAP-39`'s Test 2 against whichever citation survives. |
| 2 | defect / **high** | **`C-MAP-37`'s Test 3 mechanism has decayed.** Rewrite it from "cuts API revenue" to "a mass-market store cannot carry provenance-stamped work product", and record the 12-month obsolescence trigger. No build. |
| 3 | defect / **high** | **`C-MAP-38`'s verification tested the wrong competitor set.** Correct the line to name which set was tested, record this pass as the first valid recheck, and log the two 2026-10 decay signals with a next-recheck date. |
| 4 | gap / medium | **`C-MAP-39` / `AA-30` need re-scoping after this week's ship.** The display half is built (`AGT-399`, `AGT-409`); re-rank the remainder against Test 7 toward `AGT-418` / `AGT-251` rather than filing a duplicate. Cheapest variant needs **no new deterministic logic** — one capability prompt that has an existing agent read its own skill and knowledge rows and write a dated account of its own training. |
| 5 | defect / medium | **Four `market_records` claims did not survive a recheck** (dots' date, the Grok Bot enterprise product name, Hazel's module name, Reinventing.AI unverified). For the table's owner; the Researcher does not write there. |
| 6 | defect / low | **`routine-prompt-drift`:** `check-routine-prompt.js --routine=researcher` exited 1. The playbook records this as expected until John's `RemoteTrigger update`; filed so it is on the record rather than silently tolerated. The remedy is John's switch alone. |

## Vision-corpus grounding

`VC-ROOT-002` (the bar), `VC-SYN-002` (the class reading), `C-MAP-28`–`C-MAP-35` (the seven tests),
`C-MAP-49` (sourcing), `C-MAP-64` (name the mechanism), `C-MAP-66` (usage as demand), `C-MAP-71`
(obsolescence trigger), `C-MAP-34`/`C-MAP-52` (recheck cadence), `C-MAP-72` (grounding, corrected
here), `C-thesis-30` (two buyers), `C-CUST-16` (the starting market), `VC-LRN-056`/`057`/`058`/`062`/
`063`/`064` (the open gaps this pass was aimed at), `VC-INVAR-005`/`009`/`021`/`025`/`028`/`032`.

Killed on sight, not shortlisted: an **own-your-agent export file** (`AGT-440`). Test 1 passes —
nothing hands the buyer a copy of what he taught — but ChatGPT and Claude already export data on
request, which makes it an administrative expectation (pattern 137), clonable in a sprint (Test 4
fail), with no reasoning in it (Test 7 fail). If the beta prospect raises it, it is a P5/P7 export
ticket and never P2.

## Napkin — ideas reviewed this run

13 ideas, ids and verdicts only; the text stays in the private table.

| Idea | Verdict |
|---|---|
| `n_806d49c825134dd4aac8291cbd0a28ce` | VALIDATED |
| `n_8dd5e740f9ee41aa89030d71f2569d1c` | GO DEEPER |
| `n_ec6f2dd678cf4c6bb0c6544a5ad1d5ea` | GO DEEPER |
| `n_8e274b98e1ad4bce848fafcba62d00ed` | VALIDATED (on the fear, not the remedy) |
| `n_56cad870b9734740a92d996db61fdda3` | GO DEEPER |
| `n_9e8049a941f94319aced6654acc6f3eb` | VALIDATED |
| `n_9686d46e82be4e52993afe0755d240c3` | VALIDATED |
| `n_cf995a695530485797ee2c9546d23094` | VALIDATED |
| `n_05aefd54f4fb44b494aba1d2ae0cf86d` | VALIDATED |
| `n_6e35857b50254c2390919c33fe4fff06` | GO DEEPER |
| `n_bcb76101149b47a9849dd4176d8ec527` | VALIDATED |
| `n_04a3462e6a584a87bded2744aa87f621` | VALIDATED |
| `n_fa49c1efb4cc42e084432071bec5f2f1` | VALIDATED |

9 VALIDATED, 4 GO DEEPER, 0 WEAK. Each row's `research_note` and `researched_at` were written under
its own before-image (`runner_before_images`, `session_name researcher-2026-W41`, 13 rows); `text`,
`status`, `note` and `nathan_note` were verified unchanged against those images afterwards on all 13.

**One pattern across the Napkin worth John's attention:** four of the thirteen ideas
(drift-needs-an-auditor, usage-is-a-black-box, an-agent-needs-a-north-star, training-is-just-tests)
each turned out to be a *named, active* research problem elsewhere in the industry, with the
literature's recommended fix matching what John had already written down — and in two cases the
platform's own tickets (`AGT-461`, `AA-22`/`PE-12`) are the open work. That is the opposite of the P2
catalog's problem above: the Napkin is running ahead of its own evidence base, while the P2 entries
are running behind theirs.

## Method note

Prompt assembled only through `node scripts/agent-prompt.js --agent=researcher
--capability=research-class-lens --intent=rs-research-intent --task-file=<file>`; never hand-built.
Run as one sub-agent on the model that command printed (`claude-fable-5-1`, the `judgment` lane from
`runner_model_lanes`). Turn logged with `scripts/agent-log.js` — `ai_activity_log` id 72260, trace
`1366df4a-19a6-4291-b770-b7ca5460e8fa`, `call_source session`, `cost_usd NULL` (subscription tokens,
not billable). No push, email or Slack notification was sent.
