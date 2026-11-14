<!-- DeepBench | docs/research/2026-11-14-weekly-market.md | The Researcher, capability
     research-class-lens, run kind weekly-market-review, run 2026-11-14.
     Window 2026-11-07 to 2026-11-14 (ISO week 2026-W46).
     PLAYBOOK RUN: docs/runbooks/researcher-routine.md is on origin/dev, so AGT-138 has shipped and
     its Steps 0-5 were followed in place of the live routine's INTERIM text, as that interim
     paragraph instructs. Where the playbook and the live prompt differ: Step 3 ingests proposals
     into the findings ledger rather than listing them only, and the playbook's prompt block names
     public.apply_claim_recheck() where the live text does not -- both were followed. The live
     text's SES-369 sentence (the invention filing gate is shut) remains true and was obeyed:
     file_invention_proposal() was NOT called.
     METER: ok -- 21% against the 28.57% Saturday ceiling, 7.57 points of headroom.
     PROMPT DRIFT: check-routine-prompt.js --routine=researcher exits 1, the EXPECTED drift the
     playbook declares (the live trigger still runs the 2026-09-25 interim text plus John's
     2026-10-17 meter stop). A finding, not a stop.
     LENS: P2 and P3 both at 0 ratified (145 vs 144 proposed), so fewest-proposed breaks the tie and
     the lens is P3 - Investor Value for the FIFTH consecutive run. The gap NARROWED from 2 claims
     last week to 1.
     NAPKIN: 43 rows matched the due filter; exactly 2 had never been researched and both were
     researched and written. The other 41 carry current notes and re-qualify only because of the
     2026-10-17 metadata touch of updated_at -- AGT-577, already open, is that filter.
     EGRESS: ok. WebSearch works; WebFetch of vendor hosts still fails DNS (cynomi.com and
     govspend.com both ENOTFOUND 2026-11-14). Precondition C3 was already closed by earlier runs,
     so this run does not claim to close it.
-->

# Weekly Market Review — 2026-11-14 (week 2026-W46)

**Lens:** P3 — Investor Value, fifth consecutive run. **Window:** 2026-11-07 → 2026-11-14.
**Filing gate:** shut (`SES-369`). `file_invention_proposal()` was not called; the one survivor
reached the Development Manager through the findings ledger, per the playbook's Step 3.

---

## The three facts that frame this run

**1. The week's P1–P4 output and the week's unattended output are now two different numbers, and
only one of them is above zero.**

Measured 2026-11-14 on `backlog_items`: 35 tickets reached `delivered` or `done` in the 7 days
(9 more sit at `partial`).

| Class | Count |
|---|---|
| P1 — Improves John's Skills | 14 |
| P9 — Bug Fixes | 13 |
| P10 — Tooling | 8 |
| **P2 / P3 / P4** | **0** |

Fourteen P1 rows is the first non-zero P1–P4 week in four. But **all 14 are `scope_origin`
`john-named` and all 14 sit in the project `Backlog Intake`, status `planned`** — a project the
unattended runner may not pick from at all. They are the Harry (SC-01) strategy-mentor and Library
build (`AGT-643`–`AGT-652`) and the Trenton (SEC-01) security build (`AGT-653`–`AGT-656`).

The gate the 2026-11-11 market record identified has not moved: re-measured today, **73 open P1–P4
tickets, of which exactly 2 sit in an executing project** — against 69 and 2 three days ago — and
the two executing projects are still Product Team Agents and Platform Reliability. So P1–P4
delivery resumed by going *around* the gate, by hand, in attended sessions. The unattended
factory's P1–P4 output this window is still zero, the fourth consecutive measured week.

Under the P3 lens that distinction is the whole point: a skeptical reviewer asked to believe in a
self-building factory will ask which of the two numbers is the product. This week the answer is the
one John produced himself.

**2. Cost coverage jumped 9× and the number a reviewer actually wants did not move at all.**

`cost_usd` is now on **1,878 of 70,910** `ai_activity_log` rows (2.65%), up from 205 of ~68,968
(0.30%) at the 2026-11-11 record. In this window it looks like 1,673 of 2,362 (70.8%).

Do not read that as coverage arriving. **Every one of the 1,673 is an embedding call** —
`text-embedding-3-small`, ~226 input tokens, zero output tokens — written 2026-11-12/13 by the new
Library meaning-search path (`AGT-645`/`AGT-652`), worth well under a cent in total. Of the
window's **14 generative turns** (rows with any output tokens), **0 carry a cost**.

So `VC-SYN-001`'s charge stands untouched: the platform still cannot say what one *answer* cost. It
can now price its retrieval plumbing. Anything that reports the 2.65% or the 70.8% as
cost-per-answer coverage is a narrowed count of the kind `VC-LRN-139`'s display-honesty rules
forbid.

A second, smaller thing the pass found and I am passing straight through: **454 of the 1,673 priced
rows store `cost_usd` exactly 0 while carrying 8–24 input tokens.** `cost_usd` is
`numeric(10,6)` and a sub-micro-dollar embedding rounds to zero. A stored zero on a call that spent
tokens is the fabricated zero `VC-REJECTED-017` rules out, and it now outnumbers every honestly
priced answer in the table. It belongs with `AGT-619`. Filed as a `defect`, not a proposal.

**3. The "nobody follows the client after the engagement" finding is wrong, and the correction makes
the idea behind it stronger rather than weaker.**

The 2026-11-11 Phos AI Labs record states, in its own words, *"I searched on 2026-11-11 for anyone
selling a portal that tracks whether a client implemented a consultancy's recommendations after the
engagement. Nobody."* That is false. There is a funded category doing exactly this — in security
advisory. Cynomi is described as multitenant with ongoing task management, progress tracking and
customer-facing reports, with maturity assessment framed as ongoing rather than one-time, and five
named rivals publish head-to-head comparisons against it on that same axis. Detail and citations
are in "Where I confirmed or contradicted the week's market records" below.

What survives is the *lane*, and it is a better claim than the one it replaces: the shape is proven
and paid for in one vertical, and absent in procurement and government-process advisory, where the
same searches returned only CRM/PSA retainer tools and SaaS customer-success platforms that watch
product usage rather than whether advice was taken.

---
## Where I confirmed or contradicted the week's market records

Records read: **80 `market_records` rows across 17 sources**, every one written since the last run
(2026-11-07 09:00Z) — `pmm-competitors`, `pmm-objections`, `pmm-feature-signals`,
`pmm-feature-benefits` and `pmm-release-notes` — plus the `nathan_note` column on every due Napkin
idea. I read all 80 titles, kinds and sources, and the full bodies of the rows that bore on this
week's questions (the five competitor rows and the two feature_signals below). Leads, never facts:
each claim below was re-checked against its original source and the source is cited, not the
record.
**Nothing was written to `market_records` directly.** The two corrections went through
`public.apply_claim_recheck()`, which retires the wrong row, inserts a same-kind replacement with a
`supersedes` pointer, and writes one reversible decision with a before-image.

### CONTRADICTED — "nobody tracks post-engagement implementation"

`market_records` `0e2443b5-fcaf-4f95-8197-1df367560082` (competitor, Phos AI Labs, 2026-11-11).
**Verdict: corrected.** Decision `6cf12c51-a1a6-4e14-b13c-2d4c8c3da896`; replacement row
`4e043825-249f-4db8-aa1a-2465155ea95f`.

The record's "Nobody" is contradicted by a product category with six named sellers:

- **Cynomi** — described as a multitenant platform with ongoing task management, progress tracking
  and customer-facing reports
  ([capterra.com/p/10005060/Cynomi/](https://capterra.com/p/10005060/Cynomi/), search text
  2026-11-14, UNVERIFIED), with maturity assessment framed as ongoing rather than one-time
  ([cynomi.com/learn/cybersecurity-maturity-assessment/](https://cynomi.com/learn/cybersecurity-maturity-assessment/),
  2026-11-14, UNVERIFIED).
- **Five rivals competing on that same axis** — RealCISO, GetCybr, Nuronus, Enactia and vCISO Lite
  all publish head-to-head comparison pages against Cynomi on multi-client architecture and
  maturity tracking
  ([getcybr.com/insights/best-vciso-platforms-2026-comparison-guide/](https://getcybr.com/insights/best-vciso-platforms-2026-comparison-guide/),
  [realciso.io/realciso-vs-cynomi/](https://www.realciso.io/realciso-vs-cynomi/), 2026-11-14,
  UNVERIFIED). One competitor cites practitioner-reported pricing of roughly $15K–$20K a year to
  start; Cynomi publishes no dollar figure of its own.
- **The sources disagree on one specific and I am not resolving it from vendor material:** one
  comparison lists Cynomi's multi-client architecture as "single-client sessions", directly against
  Capterra's "multitenant". Every page in this set is written by a competitor with a commercial
  interest in the comparison.

**What survives, and it is stronger:** nothing of this shape exists for procurement or
government-process advisory. The same searches returned only CRM/PSA retainer tools
([rocketlane.com](https://www.rocketlane.com/blogs/best-project-management-software-for-consultants),
2026-11-14, UNVERIFIED) and SaaS customer-success platforms that score product usage rather than
whether advice was taken ([gainsight.com](https://www.gainsight.com/), 2026-11-14, UNVERIFIED).
"Nobody does this" becomes "nobody does this in your vertical, and where somebody does, buyers
pay for it" — which is demand evidence the original record could not offer.

### CORRECTED — "four weeks of nothing buyer-visible / zero P1–P4"

`market_records` `1d2e21b0-73ae-4e5b-b891-a4094a1747e5` (feature_signal, 2026-11-11).
**Verdict: corrected.** Decision `0ff1785f-745a-4cfe-ac1a-2032eb554bc6`; replacement row
`ebc1c1be-e1ee-4b18-b85a-ca3816714d0e`.

The record's **cause holds** and its **headline does not**, and the two had been reported as one
number. Re-measured 2026-11-14 on the same tables: 73 open P1–P4 with exactly 2 reachable
(was 69 and 2), the executing projects unchanged — so the gate is real. But 14 P1 tickets shipped,
not zero, every one of them attended `john-named` work in a `planned` project the runner cannot
reach. Fact 1 above has the full measurement. The practical consequence for the marketing lane:
any page or prompt that uses P1–P4 as a proxy for buyer-visible will now overstate by 14.

### HOLDS — vendor hosts still do not resolve

`vision_claims` `VC-LRN-140`. **Verdict: holds.** Decision
`b2753bd0-78c5-466e-a88d-dd381f9011db`.

Re-measured 2026-11-14, one request per host: `cynomi.com` and `govspend.com` both fail DNS;
`claude.com` and GitHub hosts resolve. The claim's condition — no vendor host resolves from the
research environment — stands. The one nuance now stamped on its provenance: WebSearch *does* work,
so the class gets dated search text, and still no primary vendor page. `AGT-324` is open on the
allowlist and I did **not** re-file it.

### CONFIRMED without change

- **Per-answer cost is partial, not absent** (`pmm-objections` 2026-11-04 signal, 0.30%). Confirmed
  in direction and superseded in magnitude by fact 2: the headline moved to 2.65% all-time and the
  per-*answer* figure is still 0%. I did not recheck the row, because its own claim — "partial
  rather than absent" — is what today's measurement shows; what changed is which calls are priced.
- **The DIY-Claude competitor row read at source 2026-11-11** (Pro $17 annual, Ultra $200 at 10×
  Pro, pooled API credit). Not rechecked: `claude.com` was read at a primary source by the market
  agent three days ago, which is better evidence than anything I could add, and nothing in my
  searches contradicted it.
- **Microsoft Agent 365 at $15/user/month standalone**, with the per-credit rate unquotable because
  two licensing sites give two prices for the same $200/25,000 pack. Confirmed as still unresolved;
  I found no primary page either (`www.microsoft.com` was 503 for the market agent and I did not
  retry it).
- **Virtana AOEM** — not re-examined this run. The record's own grade (corroborated across two
  secondary summaries, no primary read, no published price) is the right grade and I have nothing
  to add to it.

---
## The Napkin

Ids and verdicts only. **This repository is public and the ideas are not** — the text of an idea,
and the evidence behind each verdict, stay in `public.napkin_ideas.research_note`, where John reads
them on the Napkin page under the writer's name.

43 rows matched the due filter (`researched_at` null or older than `updated_at`, excluding `done`
and `parked`). **Exactly 2 had never been researched**; both were researched this run and both were
written. The other 41 all carry current notes and re-qualify only because of the 2026-10-17
metadata touch that moved `updated_at` past `researched_at` on every row at once — `AGT-577` is
already open on that filter, and I did not re-file it. Re-researching 41 current notes to satisfy a
timestamp would spend the week's budget on work already done.

| Idea id | Verdict |
|---|---|
| `n_5333a39969cd4e10acb116bbaa725294` | GO DEEPER |
| `n_67f77301be084ce58523821afcaf3e0a` | VALIDATED |

Both writes touched exactly two columns, `research_note` and `researched_at`, each under its own
`runner_before_images` row under session `researcher-2026-W46`. `text`, `status`, `note` (the
attended sessions' column) and `nathan_note` (Nathan Laan's) were verified unchanged against those
before-images after the write. Notes are 593 and 596 characters, inside the 600 limit.

One of the two verdicts is the source of fact 3 above: the idea that prompted the Phos AI Labs
record's "nobody does this" line turns out to describe a funded product category in an adjacent
vertical, which is why the correction strengthens the idea instead of killing it.

---

## Proposals for the Development Manager

The invention filing gate is shut (`SES-369`), so `public.file_invention_proposal()` was **not**
called and no ticket was filed. Both items below reached the intake through
`scripts/audit-ledger.js` as findings for `scripts/audit-review.js` to route, per the playbook's
Step 3. `invention_due()` allowed 2; the pass returned 1 survivor from a shortlist of 5, and an
honest one beats a forced two.

Ledger result: `ingest 2026-W46: 2 findings, 2 new, 0 seen, 0 recurring, 0 ruled-out` — fingerprints
`8b64e43cd620ea95` (the proposal) and `7336c463bc11bd1b` (the defect), both `open`, attributed to
session `researcher-2026-W46`. The `finding_routes` `researcher` row sends the group to the
Development Manager's own pick rather than throwing `unmapped source researcher`.

### Proposal 1 (P3, predicted 2 cycles) — a stop a reviewer can watch work

Switching an agent off writes a reversible decision; every call that stop then refuses writes a
ledger row naming that decision.

DeepBench already refuses a switched-off agent at three separate gates on `agents.is_active`, and
**none of the three leaves a row** — `lib/private-agent-create.js`'s own `archivePrivateAgent`
comment says "Nothing is deleted and no before-image is taken … No activity row." So the platform
has a working off switch and no evidence of it: "it can be stopped" is confirmable today only by
reading source code. The reviewer's test afterwards takes two minutes and can fail in public:
switch a test agent off, call it from any MCP client, get refused, open the AI Audit and find the
refusal citing the stop, switch it back on, get served. No new screen — `VC-EXIT-026` cleared.

Claims served: `VC-SYN-001`, `VC-LRN-145` (the kill-switch item of the only three-test reviewer
checklist this lane holds, which all six open P3 tickets currently miss), `VC-EXIT-022`,
`VC-EXIT-012`, `VC-EXIT-021`.

Risks passed through, not smoothed: an off switch is an expected enterprise control, so by pattern
137 the switch is not showcase — the P3 argument rests on the reviewer-checkable *record*, and if
the record is expected too this is P5 or P9 and the pass says it would not argue. Futurum's
2026-11-06 note that a kill switch acts only after the problem starts is the honest ceiling.
`AGT-139` (P10, open) governs *who* may press the switch and should be designed with this.

### Proposal 2 (defect, not an invention) — 454 stored zeros on calls that spent tokens

454 of the 1,673 newly priced `ai_activity_log` rows store `cost_usd` exactly 0 while carrying
8–24 input tokens, because `numeric(10,6)` rounds a sub-micro-dollar embedding to zero. Belongs
with `AGT-619`: widen the precision, or store unpriced as unpriced. Fact 2 has the measurement.

### The four the pass killed, with its reasons

1. **Decision log with the human reversal rate** (14,839 decisions, 2,984 reversed, 2,966 by John;
   1,216 decided and 358 reversed in-window) — already on the board as `ADM-3`, and a rate over
   existing rows is a display without a new mechanism (`VC-EXIT-026`). *Put the numbers on `ADM-3`.*
2. **A margin on one deliverable** — exactly what `VC-LRN-144` asks for, killed three ways: it is
   the held cost-per-deliverable payload in a new coat; 0 of 9,929 deliverables carry a price and
   the price is John's to set; and not one of the window's ledger rows carries a task id to sum over.
3. **An independent grader for the Bench Report Card** — real outside evidence (arXiv 2604.06996:
   a model can be up to 50% more likely to pass a failing output its own family wrote), killed on
   the `AGT-250` ruling, because the report card has recorded 0 judge runs in 30 days and 3 ever,
   the last on 2026-09-03. Do not stack a fairness feature on a grader that is not running.
4. **A recorded reviewer verdict per shipped P3 feature** (`VC-LRN-151`) — a sign-off field is an
   administrative expectation (pattern 137), and there is no delivered P3 feature to attach one to.
   That claim closes by shipping one P3 feature and having John open it, not by building a form.

**Not re-proposed**, read live from this lane's own prior proposals: `AGT-323` (knowledge-bundle
identity), `AGT-297` (caller identity on servings), `AGT-579` (locked claims bound to live checks),
`AGT-619` (every dollar names its rate). Ledger-reconciled-to-the-provider's-bill stays barred and
cost-per-deliverable stays held.

---
## Part 2 — the week's market, as the research pass returned it

Below is the `research_doc` returned by **The Researcher's own `research-class-lens` capability**,
verbatim. The prompt was assembled only through
`node scripts/agent-prompt.js --agent=researcher --capability=research-class-lens
--intent=rs-research-intent --prior-proposals=researcher:weekly-market --task-file=…` (23,079
bytes, no omitted sections) and run as **one** sub-agent on the model that command printed —
`claude-fable-5-1`, the `judgment` lane read live from `runner_model_lanes`. The turn is logged in
`ai_activity_log` (row 81480, trace `fa9b96e9-3259-4a05-80d8-9a2bca5a0252`), without token counts,
because the harness reports one total for the sub-agent and the script's own rule is that summing
differently-priced input quantities into `--input-tokens` stores a wrong figure. That turn is
itself one of the window's unpriced Claude rows from fact 2.

It returned `lens: "P3 - Investor Value"`, `egress: "ok"`, 18 findings (9 market, 9 usage), a
shortlist of 5 and 1 survivor.

**One number in it disagrees with mine and I have not smoothed it over.** The pass reports 36
tickets delivered in the window (P1 14, P9 14, P10 8); my own measurement, re-run twice on
`status in ('delivered','done')` with the same 7-day floor, is 35 (P1 14, P9 13, P10 8), with 9
further rows at `partial`. The difference is one P9 row and most likely the moving 7-day boundary
between its read and mine. P2/P3/P4 is 0 on both reads, which is the figure either number is being
used to support.

---

# Weekly Market Review — 2026-11-14 (week 2026-W46) — P3 lens research pass

**Lens:** P3 — Investor Value, fifth consecutive run (P2 and P3 tie at 0 ratified; P3 has 144 proposed against 145). **Window:** 2026-11-07 → 2026-11-14. **Allowed:** 2. **Returned:** 1 survivor. **Egress:** search works; vendor hosts do not resolve for fetch, so every vendor claim below is dated search text marked UNVERIFIED. One primary page was read this run (anthropic.com, marked READ).

## The pitch

**A stop you can watch work.** DeepBench already refuses a switched-off agent at three separate places. None of the three leaves a row, and the one stop a customer can press writes no record that it was pressed. So today the platform has a working off switch and no evidence of it: you would have to tell a reviewer "trust me, it stopped."

The proposal is two rows and no new screen. Pressing stop (or restart) writes one reversible decision with its before-image. Every call the stop then refuses writes one ledger row naming the decision that caused the refusal. The outside caller still sees the same single "Unknown agent" message as today, so nothing about the agent inventory is published; the reason lives only in your own ledger, where the AI Audit already lists whatever the log contains.

The reviewer's test takes two minutes and can fail in public: switch a test agent off, call it from any MCP client, get refused, open the audit and find the refusal citing the stop, switch it back on, call again, get served.

It closes two thirds of a named claim. `VC-LRN-145` records that the only outside reviewer checklist this lane holds has three items (autonomy with a verifiable record, decision logging, a kill switch) and that all six open P3 tickets address the first. This one answers the kill switch directly, and the stop decision it writes is a decision-log entry a reviewer opens.

## What the market says (live, dated)

Searches run 2026-11-14. UNVERIFIED means I read dated search text and could not open the page.

**The kill switch is now a named product surface, and the record of it is the selling point.**

- ServiceNow documents a "kill switch protocol log" that lists every agent deactivated or reinstated, with an audit-log tab per agent, a per-enforcement-point confirmation, and a status of Completed or Partial depending on whether every enforcement point obeyed. Source: servicenow.com/docs, "Review the kill switch protocol log" (https://www.servicenow.com/docs/r/intelligent-experiences/gov-sec-review-kill-switch-protocol-log.html), undated documentation page, retrieved by search 2026-11-14. UNVERIFIED. The launch was covered 2026-05-05 (https://theregister.com/2026/05/05/servicenow_clears_agents_for_landing/) and 2026-05-06 (https://fortune.com/2026/05/06/servicenow-kill-switch-ai-agents-bill-mcdermott/). UNVERIFIED.
- The "Partial" status matters to DeepBench specifically: we have three enforcement points (the knowledge-bundle read, the tool listing, the executor) and no record that any of them obeyed.

**Most buyers cannot stop an agent, and fewer have tested that they can.**

- IDC, 2026-09-08, "The audit trail that doesn't exist" (https://www.idc.com/resource-center/blog/the-audit-trail-that-doesnt-exist/): 60% of security leaders lack basic agent containment controls and 35% cannot shut down a rogue agent once deployed. UNVERIFIED.
- Kiteworks 2026 survey of 225 leaders, fieldwork Q4 2025 (https://www.kiteworks.com/cybersecurity-risk-management/agentic-ai-governance-containment-gap/): 30% have a documented capability to terminate a misbehaving agent, 33% lack evidence-quality audit trails, and 23% of those with AI in production have never tested termination. UNVERIFIED. The IDC and Kiteworks figures come from different surveys and do not reconcile; I am citing each as its own number and not averaging them.

**The in-window item cuts against the proposal, and I am keeping it in.**

- Futurum Group, research note dated 2026-11-06 (file path dated 2026/11), "Agent Security: The Kill Switch Is Not a Containment Strategy" (https://futurumgroup.com/wp-content/uploads/2026/11/Agent-Security_-The-Kill-Switch-Is-Not-a-Containment-Strategy_AIOFM202610.pdf): a kill switch is a reasonable control but acts after the problem has started, and customers often get only the whole-agent switch the vendor built. UNVERIFIED. This is the honest ceiling on the proposal: a whole-agent stop is the floor of containment, not the whole of it. What is proposed here is the evidence that the floor holds, not a claim that the floor is enough.

**The provider's own position is that oversight means being able to intervene, with visibility.**

- Anthropic, "Measuring AI agent autonomy in practice", published 2026-02-18 (https://www.anthropic.com/news/measuring-agent-autonomy). READ at source 2026-11-14. It says "effective oversight doesn't require approving every action but being in a position to intervene when it matters", asks product developers for "tools that give users trustworthy visibility into what agents are doing" and "simple intervention mechanisms", and reports human interventions per session falling from 5.4 to 3.3 on its internal coding use between August and December. That is the same two things this proposal joins: an intervention, and visibility that it happened.

**What the skeptical reviewer is told to ask.**

- Gartner's "agent washing" warning (about 130 genuinely agentic vendors, a June 2025 estimate and not a product test) is still the only named reviewer frame in circulation; 2026 coverage adds that its 2026 Hype Cycle for Agentic AI warns about token spend without "financial guardrails, attribution and observability" (https://tray.ai/blog/gartner-agentic-ai-hype-cycle-2026/, undated 2026; https://www.pymnts.com/?p=2862693). UNVERIFIED. I searched again for the full Gartner question list and did not find it; the three-item list in `VC-LRN-145` is still the best this lane has.

**What investors are told to check: a margin, again.**

- 2026 diligence checklists ask for inference-adjusted gross margin, inference cost per active customer and per key workflow, and a stress test of a provider repricing (https://hub.causo.ai/hub/ai-startup-metrics-vcs-want-2026; https://angelinvestorsnetwork.com/venture-capital/an-ai-startup-due-diligence-checklist-for-investors-who-are-tired-of-infrastruct; University of Tennessee Research Foundation framework dated 2026-07-06, https://utventures.tennessee.edu/wp-content/uploads/2026/07/AI-Due-Diligence-Framework-7-6-26.pdf). UNVERIFIED, practitioner sources, excerpts only. This confirms `VC-LRN-144` and adds nothing new to it: the market names a margin and DeepBench has no price to set against a cost.

**What the market says about grading your own agents.**

- Pombal, Rei and Martins, arXiv 2604.06996, April 2026 (https://arxiv.org/abs/2604.06996): on rubric scoring, a model can be up to 50% more likely to pass a failing output when it or its own model family wrote it. Read as the search summary of the abstract, not the paper. This is the evidence behind runner-up 3 below.

**In-window launch, for the record.**

- IBM and Microsoft "Imagine Enterprise", reported 2026-11-10 (https://aiweekly.co/alerts/ibm-microsoft-launch-imagine-enterprise-with-6000-agents): a jointly built platform drawing on 6,000+ IBM Consulting agents and assets, one named early customer, no pricing. Single in-window source. UNVERIFIED. Not a rival for your buyer; coverage did not say how individual agent actions are logged for an auditor.

## What the job postings name

Not run this pass. Postings are the P1 pull test, not P3's, and I did not substitute a search for them this week. Last week's substitute (a Director, FinOps and AI Cost Engineering posting dated 2026-07-11) stands unrefreshed.

## Vision-corpus grounding

- `VC-SYN-001` — investor value is a skeptical technical reviewer confirming a claim from the product itself. "The agent can be stopped" is a claim; today it is confirmable only by reading source code.
- `VC-LRN-145` — the lane's one outside checklist has three tests and the shelf serves one. This proposal is the first ticket for the kill switch and adds an openable decision-log entry.
- `VC-EXIT-022` — P3 deepens governance and reversibility (flags, before-images, Accept/Reverse): the stop becomes a reversible decision like every other one.
- `VC-EXIT-012` — the audit surface doubles as the diligence surface: the refusal appears there because displays list what the log contains.
- `VC-EXIT-021` — complete lineage, zero unexplained rows: a refused call is currently an event with no row at all.
- `VC-EXIT-026` (the anti-P3 clause) — cleared: no new dashboard. Two write paths gain a row each; the existing audit shows them.
- `VC-REJECTED-018` and `VC-REJECTED-017` respected: the audit shows only what was logged, and nothing is padded.
- `VC-THESIS-021` tiebreaker: a procurement director asks "can we turn it off and prove we did"; a VP of Product sees one enforcement rule evidenced at every point it applies.

## What DeepBench already has that this builds on (checked in the repo and database 2026-11-14)

- Three gates on the same column. `api/_lib/handlers/agent-bundle.js` (`bundleTargetReadable`, `is_active !== true` returns false, then `throw new Error('Unknown agent: …')` with the comment "ONE MESSAGE FOR FOUR FACTS"); `api/_lib/mcp.js` (`assembleCapabilityRows` drops a capability with no active holder from the tool listing); `api/capabilities/execute.js` (`resolveCapabilityHolder` throws "No agent currently holds capability").
- The stop a customer can press. `lib/private-agent-create.js`, `archivePrivateAgent`: its own comment reads "Nothing is deleted and no before-image is taken … No activity row."
- A decision ledger that already knows how to reverse an agent row: `runner_decisions` holds 14,839 decisions, 193 of kind `agent-row`, and `reverse_decision()` was widened to `agents` by `SES-364`.
- 46 agents, 39 on and 7 off (five test agents on the product lane, two personal-lane agents).
- Zero rows in `ai_activity_log` whose `call_facts` mention a refusal, an inactive agent or `is_active`.

**The cheapest variant that proves the claim:** the customer stop writes one decision with a before-image, and the bundle read writes one deterministic ledger row on refusal that names that decision. Two files (`lib/private-agent-create.js`, `api/_lib/handlers/agent-bundle.js`). The executor path and the tool-listing confirmation are the second cycle.

**Risks I am passing through and not smoothing.**

1. An off switch is something an enterprise buyer expects. By pattern 137 an expected control is not showcase. My argument for P3 is that the switch already exists and is not what is proposed; what is proposed is the reviewer-checkable record, which is the class's own definition. If you class the record as expected too, this is P5 or P9 and I would not argue.
2. Futurum's point stands: whole-agent stop is the floor.
3. `AGT-139` (P10, open) wants the hire card to be the only route that flips the switch. It is about who may press; this is about what pressing leaves behind. They touch the same column and should be designed together.
4. The external message must stay single. A refusal row that leaked into a public view would publish the inventory the handler deliberately hides.

## The runners-up, and why they ranked lower

1. **The decision log a reviewer can open, with the human reversal rate and its denominator.** The numbers are striking: 14,839 decisions, 2,984 reversed, 2,966 of those by you; in this window 1,216 decided and 358 reversed. The public view (`runner_public_items`) carries kind, ticket, title, decision and date, and no reasoning or reversal. Killed: `ADM-3` (P3, open) is already "read-only view of the human-in-the-loop loop (trust ladder, accept/reject audit trail)", and a rate over existing rows is a display without a new mechanism (`VC-EXIT-026`). The practitioner sources also warn a raw override rate misleads without context. Put these numbers on `ADM-3`.
2. **A margin on one deliverable (price beside the summed cost of its calls).** This is exactly what `VC-LRN-144` asks for and what the market names. Killed three ways: it is the held cost-per-deliverable payload in a new coat, which the lane's 2026-10-17 ruling bars; 0 of 9,929 deliverables carry a price and the price is yours to set, not mine; and not one of this week's 2,410 ledger rows carries a task id to sum over.
3. **An independent grader for the Bench Report Card (a judge from another model family, a held-out set).** The outside evidence is real (arXiv 2604.06996). Killed on your `AGT-250` ruling: the report card recorded 0 judge runs in the last 7 and 30 days, 3 ever, last on 2026-09-03, and `LOG-148` (server-side judge trigger) is still open. Do not stack a fairness feature on a grader that is not running. `AGT-302` and `AGT-73` sit next to it.
4. **A recorded reviewer verdict on each shipped P3 feature** (`VC-LRN-151`). Killed: a sign-off field is an administrative expectation (pattern 137), and there is no delivered P3 feature to attach one to. The claim is closed by shipping one P3 feature and having you open it, not by building a form.

**Not re-proposed.** Knowledge-bundle identity → `AGT-323`. Caller identity on servings → `AGT-297`. Locked claims bound to live checks → `AGT-579`. Every dollar names its rate → `AGT-619`. Ledger reconciled to the provider's bill stays barred. Cost per deliverable stays held.

## How it reaches the build queue

One proposal, P3 — Investor Value, predicted 2 cycles, shaped for `file_invention_proposal()` and for the findings intake as type proposal. The Development Manager rules on it. It is not reachable by the unattended runner unless it is placed in an executing project: the two executing projects are Product Team Agents and Platform Reliability, and of the open P1–P4 tickets only 2 were reachable at the 2026-11-11 measurement.

## The usage signal that proves it — and what the platform's own numbers say this week

All read from `public.ai_activity_log` and neighbours on 2026-11-14, window from 2026-11-07 00:00Z.

**For the proposal.** Success is countable: the number of ledger rows recording a refused call that name a stop decision goes from 0 to at least 1, and every one of the 7 switched-off agents has a decision row saying who switched it off and when. Today both counts are 0 for the customer stop path.

**Cost coverage, re-measured — the headline number moved and the meaning did not.** All-time, `cost_usd` is now stored on 1,878 of 70,910 rows (2.65%, $9.1483 in total), up from 205 of about 68,968 (0.30%) at the 2026-11-11 record. In the window it is 1,673 of 2,410 rows (69.4%). Do not read that as coverage arriving. All 1,673 are embedding calls (1,663 `library-sync`, 10 `strategy-ranked-read`) written on 2026-11-12 and 2026-11-13, worth $0.0075 together. Not one model answer was priced: all 203 Claude-model rows in the window are on the session lane, which is unpriced by design, and only 32 of those carry any token count. There was no paid-lane answer to price: the `ui` lane logged 2 rows all week and the `mcp` lane's 260 rows are almost entirely one deterministic assembly step with no model.

**A new defect, not a proposal: 454 rows say an embedding cost exactly nothing.** 454 of the 1,673 priced rows store `cost_usd = 0` while carrying 8 to 24 input tokens. The column is `numeric(10,6)` and the true cost is below one millionth of a dollar, so it rounds to zero. A stored zero on a call that used tokens is the fabricated zero you ruled out (`VC-REJECTED-017`), and it now outnumbers every honestly priced answer in the table. It belongs with `AGT-619`: widen the precision or store unpriced as unpriced. I am reporting it for the Development Manager and not filing it as an invention.

**Nobody is named.** 2,254 of the window's 2,410 rows (93.5%) carry neither a visitor nor a caller address, up from 84.1% last week. `AGT-297` is open on this.

**Delivery.** By my read 36 tickets reached delivered or done in the window (P1 14, P9 14, P10 8) against the 35 the task context measured; either way P2, P3 and P4 delivered 0, the fourth consecutive measured week. The 14 P1 rows are your named agent builds in a project the unattended runner may not pick from.

**What I am unsure of.** Every vendor claim above except Anthropic's is search text. The Futurum date is from the search summary and the file path. I did not re-measure the "2 reachable" figure. I could not find Gartner's own question list, so the three-test checklist the survivor is built against is still secondary.
