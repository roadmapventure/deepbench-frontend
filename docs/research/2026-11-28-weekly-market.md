<!-- DeepBench | docs/research/2026-11-28-weekly-market.md | The Researcher, capability
     research-class-lens, run kind weekly-market-review, run 2026-11-28.
     Window 2026-11-21 to 2026-11-28 (ISO week 2026-W48).
     PLAYBOOK RUN: docs/runbooks/researcher-routine.md is on origin/dev, so AGT-138 has shipped and
     its Steps 0-5 were followed in place of the live routine's INTERIM text, as that interim
     paragraph instructs. Two places where the playbook is the stricter source and was followed:
     its PART 1 due-rule reads text_updated_at (the live text still says updated_at), and its
     Step 3 ingests proposals into the findings ledger rather than listing them only. The live
     text's SES-369 sentence (the invention filing gate is shut) remains true and was obeyed:
     file_invention_proposal() was NOT called, and neither was invention_due() acted on beyond
     reading `allowed` = 2.
     METER: ok -- 16% against the 28.57% Saturday ceiling, 12.57 points of headroom.
     PROMPT DRIFT: check-routine-prompt.js --routine=researcher exits 1, the EXPECTED drift the
     playbook declares (the live trigger still runs the 2026-09-25 interim text plus John's
     2026-10-17 meter stop). A finding, not a stop, and not re-filed here.
     LENS: P2 and P3 both at 0 ratified (158 vs 157 proposed), so fewest-proposed breaks the tie and
     the lens is P3 - Investor Value for the SEVENTH consecutive run. The gap NARROWED from 2
     claims last week to 1.
     NAPKIN: 1 idea due -- a new idea written 2026-11-22, never researched. The due rule worked as
     AGT-577 intends: text_updated_at is NULL on the row and it is due on researched_at IS NULL
     alone, not on a metadata touch.
     EGRESS: ok. WebSearch answered all 17 of the pass's queries. WebFetch of arbitrary hosts fails
     DNS in this environment (verified this run on digital-strategy.ec.europa.eu and
     www.checkout.com), so every market claim below is dated search text unless marked READ.
     Precondition C3 was closed long before this run -- egress has read `ok` since 2026-10-03 --
     so nothing here closes it.
     MODEL: the pass ran on claude-fable-5-2, the model scripts/agent-prompt.js printed, which
     matches public.runner_model_lanes.judgment as updated 2026-11-27 by model-watch. The method
     text in runner-cycle.md still names claude-fable-5-1 parenthetically; that literal is one
     version stale, and the surrounding instruction to read the lane live is what was obeyed.
     TURN LOGGED: public.ai_activity_log row 84759, trace 055c9838-d573-4f79-a6de-c118c63eda59,
     ai_type autonomous-research, tokens NULL because the harness reports only a combined total for
     a sub-agent and agent-log.js takes input/output all-or-nothing -- unmeasured, never an
     invented zero. -->
# The week's market — 2026-W48 (2026-11-21 → 2026-11-28)

## The one thing to read if you read nothing else

**A string that may be a client's name is sitting in seven tracked files of this public repository,
and one of them regenerates itself.** The `$30` trial row of `public.mcp_caller_gates` — the first
and only outside site key — carries a `caller_name` whose full value appears as a substring in 7
tracked files, and whose one non-project-vocabulary token appears as a whole word in 4, including
`docs/backlog/BACKLOG-SNAPSHOT.md`, `docs/kickoffs/v7.0.1108-AGT-785-mcp-call-cost.md` and two
committed regression tests. The snapshot is re-exported from `public.backlog_items` every close-out
and `AGT-785.description` carries the token, so the string returns on its own until the ticket text
is corrected. `rmv-company-profile` §6 says plainly: *"No client name or client data in anything
public."* That record also says to flag a disagreement by naming the line rather than restating it,
which is what this is — **whether that string is a client identity is John's to confirm, and the
name is withheld from this report and from the findings ledger on purpose.**

Two things make this worth the top of the page rather than a footnote. First,
`scripts/audit-private-scan.js` does **not** catch this class: it ran clean this week (4 findings,
all the known test-fixture false positives already ruled on in `docs/audits/2026-W48.md`) because
its detectors cover credentials, addresses and home-directory paths — not customer names. Second,
the same gate row is the subject of this week's one proposal, which needs a holder column anyway;
the fix and the feature are the same cycle. Filed as a `security` finding, confidence high.

## What changed in the market this week

**Very little, and that is the honest headline.** The pass ran 17 searches and found **no dated
primary announcement inside 2026-11-21 → 2026-11-28** on the investor-value lens. The only
in-window sources were aggregator briefs, and the one aggregator claim testable at a primary source
was **contradicted**: a 2026-11-27 brief said the supplier had launched agents that approve routine
code changes; the supplier's own documentation says review findings do not approve or block a
change and approval stays human
([code.claude.com/docs/en/code-review](https://code.claude.com/docs/en/code-review), read
2026-11-28). That is the second week running in which an aggregator's "new this week" turned out
not to be either.

What did move, all of it just outside or on the edge of the window:

- **Allowance-per-period is becoming the unit buyers are taught.** Atlassian begins billing its
  usage meters on **2026-12-03**, with allowance limits per period and a meter for requests an AI
  agent resolves without human escalation
  ([atlassian.com](https://www.atlassian.com/blog/company-news/expanded-usage-based-pricing)). Every
  MCP monetisation model a vendor guide lists — per-call, tiered with monthly caps, usage plus
  overage, prepaid credits, outcome-based — is periodic or per-unit
  ([zuplo.com](https://zuplo.com/blog/mcp-monetization-models)). **None is a lifetime ceiling**,
  which is what DeepBench's one live key runs on.
- **Charging for MCP tool calls is now documented payment-provider plumbing, not a novelty** —
  Stripe publishes it ([docs.stripe.com](https://docs.stripe.com/agentic-commerce/monetize-mcp)).
  That cuts both ways: the transport DeepBench sells over is monetisable by default, and metering a
  keyed caller is no longer differentiating on its own.
- **Diligence has started asking the questions this lens exists to answer.** A buyer-side guide
  asks for the boundary between what an agent does alone and what needs sign-off, a full decision
  trail for one output, and **a cost-per-action figure because one action fans into many calls**
  ([peony.ink](https://www.peony.ink/blog/ai-due-diligence)); a technical-diligence checklist
  treats the absence of private continuous evals as a concern
  ([wavect.io](https://wavect.io/blog/technical-due-diligence-ai-mvp/)). Both vendor-authored, so
  weigh them as such.
- **Margin is the first diligence question.** AI application gross margins are reported at 45% in
  2025 and projected 53% in 2026 against 80–90% for traditional software, with one investor saying
  every diligence call now opens with what sits in cost of revenue
  ([cloudzero.com](https://www.cloudzero.com/blog/ai-gross-margin), citing an ICONIQ report of July
  2026).
- **Who wrote the trained material is a contract term.** Counsel recommends seller statements
  covering the quality, accuracy and legality of training data with their own liability caps and
  survival periods ([osler.com](https://www.osler.com/en/insights/updates/ai-companies-representations-and-warranties/)),
  and long-duration data-rights protections with insurers looking harder at provenance
  ([clsbluesky.law.columbia.edu](https://clsbluesky.law.columbia.edu/2026/02/19/skadden-discusses-ma-in-the-ai-era-what-buyers-can-do-to-confirm-and-protect-value/),
  2026-02-19). Against that: **`created_by_type` is NULL on 243 of 243 Skills**, including the one
  the site key ran 72 times.
- **No MCP release fell in the window.** The current revision (2026-07-28) is stateless and puts
  per-request context in `_meta`; the next is targeted 2027-03-30
  ([modelcontextprotocol.io](https://modelcontextprotocol.io/specification/2026-07-28/changelog)).
  DeepBench's own cost block on a tool result, shipped 2026-11-21 as `AGT-785`, sits in that same
  slot.

**On the usage side the week was not quiet at all.** 1,158 log rows; 438 priced, $11.6033 in total,
of which **74 generative MCP turns carry $11.6017** — and all 74 are priced. One outside site key
produced **67 of those 74 answers and $11.5658 of the dollars, 99.7% of every priced dollar**. Its
unit cost rose every day it ran — **$0.032 (11-19) → $0.141 (11-20) → $0.173 (11-21)** — because
input per answer went 14,111 → 68,792 → 83,886 tokens while cache reads stayed at 2.6% of input.
Last week's measured figure was $0.059 an answer; **the unit nearly tripled and no row records
why.** The key has spent **$17.517 of a $30 lifetime ceiling (58%) over 138 answers**, so at this
week's unit it refuses for good in about 72 more; its last call was 2026-11-22 16:43Z and nothing
has come since. The ceiling was raised twice in two days — $5→$10 on 11-20, $10→$30 on 11-21 — and
**`runner_before_images` holds zero rows for that table**, so neither change is reversible and
neither has a value-before. That is a straight breach of the platform's own invariant
(`VC-INVAR-032`, §19v: no before-image, no write) and is filed as its own `gap`, high confidence,
worth doing even if the proposal below is not ruled in.

One caution that belongs here rather than in the proposal: **the site behind that key is John's own
dashboard product.** It is real outside traffic over a real key, and it is *not* evidence of a
paying licensee. Nothing in this week's numbers should be shown to anyone as one.

## Where this run confirmed or contradicted the week's market records

The Wednesday scan wrote heavily this week — 60+ rows dated 2026-11-20 → 2026-11-27, most of them
messaging and release-note drafts for the Procurement KPI Library and the RMV site. Those are the
principal's own wording decisions, not market claims, so they are not re-checkable facts and were
read as leads only. Two rows carried checkable market facts, and **both were re-checked at their
original sources and both hold.** Each was stamped through
`public.apply_claim_recheck(null, 'researcher-2026-W48', …)` with verdict `holds` — the sanctioned
writer, which takes a before-image and mints one reversible decision — never a direct `UPDATE`.
A `holds` appends the recheck stamp and retires nothing.

**1. Gartner's first Magic Quadrant for AI Agent Management Platforms — HOLDS.**
(`cb9d8f74`, decision `50660e96-ac89-4882-90ed-e0dbc3846931`.) The record read the claim off
CX Today and flagged that CX Today's own introduction is inconsistent on ServiceNow. Re-checked at
the **vendors' own announcements** instead: IBM confirms a Leader placement for watsonx Orchestrate
with watsonx.governance
([ibm.com](https://www.ibm.com/new/announcements/ibm-named-a-leader-in-the-2026-gartner-magic-quadrant-for-ai-agent-management-platforms)),
Microsoft confirms one for **Agent 365** in a post dated 2026-11-03
([microsoft.com](https://www.microsoft.com/en-us/security/blog/2026/11/03/microsoft-named-a-leader-in-the-2026-gartner-magic-quadrant-for-ai-agent-management-platforms/)),
and ServiceNow is confirmed a Leader. The CX Today inconsistency reproduces, so the record was
right to flag it.

Detail the record lacks, and it sharpens rather than softens the conclusion: **the quadrant runs
15+ vendors** — Challengers AWS, Salesforce, OneReach.ai and Gravitee; Visionaries Boomi and
Automation Anywhere; Niche Players UnifyApps, Dify, AvePoint and Lyzr
([dev.to](https://dev.to/delimitter/gartner-publishes-its-first-magic-quadrant-for-ai-agent-management-platforms-47g8)).
And Microsoft's Agent 365 is described as doing agent **discovery, inventory, identity, lifecycle
management, policy administration, and security and compliance** — which is, almost line for line,
the governance story. The record's conclusion that *"'governed agents' cannot lead a pitch on its
own"* is confirmed and should be treated as settled, not as one scan's opinion. One timing note the
record did not make: the Gartner report is dated 2026-10-27 and the vendor posts landed 2026-11-03,
so this is a three-to-four-week-old event, not a this-week one — the same clock problem last week's
run corrected on the Managed Agents record.

**2. Flevy as a generic KPI marketplace — HOLDS.** (`bed0f918`, decision
`1a876cd3-952d-4587-969d-5924814ee3d5`.) Both load-bearing figures reproduce at Flevy's own pages:
the Public Sector KPI library page lists **31 KPIs** inside a library of ~15,468
([flevy.com](https://flevy.com/kpi-library/industry/public-sector-206)), and *Procurement KPI
Library and Dashboard — 60 Measures* is listed at **$79.00**
([flevy.com](https://flevy.com/browse/marketplace/procurement-kpi-library-and-dashboard-60-measures-13176)).

Two notes short of a correction, and I deliberately did not record either as one. The $79 pack is a
**15-slide generic-procurement PowerPoint, not public-sector-specific**, which *widens* the white
space the record describes rather than narrowing it. And the subscription page now shows the
**$99/yr rising to $149/yr** — but that came from search text I could not confirm by opening the
page (WebFetch is DNS-blocked here), and my own source called its figure a snapshot, so asserting a
price change would have been asserting what I could not read. Recorded as `holds` with the soft
spot named in the reason, rather than spending a `corrected` that would retire the row on a figure
I could not verify.

**Where I disagree with a record, plainly:** nowhere this week. Neither re-check produced a
contradiction. The one contradiction this run found was against an *aggregator brief* that no
record had adopted (the code-approval claim above), which is a scan that correctly did not write
something, not a record that got it wrong.

**One competitor record I could not finish checking:** ClearPoint Strategy's free Local Government
KPI Library (`20090d68`) is confirmed as a form-gated lead magnet — "143 Key Local Government KPIs
[FREE]", 143 measures across 14 categories in Excel
([clearpointstrategy.com](https://www.clearpointstrategy.com/books/local-government-kpi-library)) —
but **whether any of those 14 categories is procurement could not be established from search text**,
and the record does not claim it is. Left unstamped rather than stamped on a guess. The KPI
Institute's Top 25 Local Government KPIs (2025) does carry an online-public-procurement measure
([news.kpiinstitute.org](https://news.kpiinstitute.org/?p=24235)), so the adjacent-coverage question
is live and worth one targeted check next week.

## Proposals for The Development Manager

Per the playbook's Step 3, proposals reach the intake as findings and are ruled through
`scripts/audit-review.js` — **the Researcher files no ticket and called no filing function.**
`public.file_invention_proposal()` was not called (`SES-369`); `finding_routes` carries the
`researcher` row at precedence 30 with `project_slug` NULL, so the manager picks the project.

```
ingest 2026-W48: 4 findings, 4 new, 0 seen, 0 recurring, 0 ruled-out
```

Four findings, filed under `researcher:weekly-market`, session `researcher-2026-W48`, all `open`:

| # | Type | Conf. | What |
|---|---|---|---|
| 1 | `security` | high | A possible client name in 7 tracked files of this public repo; `BACKLOG-SNAPSHOT.md` re-exports it. Rule line 6 first. |
| 2 | `gap` | high | `mcp_caller_gates` writes take no before-image; two ceiling raises exist only as free text. Breaches `VC-INVAR-032`. |
| 3 | `proposal` | medium | **The licence on the record** — P3, 2 cycles (cheapest 1). The one survivor of the pass. |
| 4 | `gap` | medium | A `nathan_note` cannot re-open an idea for research; two notes from 2026-11-18 went un-researched for ten days. |

**The one survivor, in full: "The licence on the record."** A reviewer can open one licensed key and
read, from rows alone, who holds it, what allowance it runs on and for what period, every change
ever made to that allowance with the value before it, and what the key consumed against it. Today
the first three are a secret's name and a sentence in a note, and the fourth is a query nobody has
written down. It serves `VC-SYN-001` (a reviewer confirms a claim from the product itself),
`VC-LRN-041` (the licence leg has a live transport and no unit, counterparty or entitlement behind
it), `VC-LRN-004` (which *predicted* the first outside consumer would arrive unrecorded — it did),
`VC-EXIT-022`, `VC-EXIT-025` and `VC-INVAR-032`. Scope is deliberately small: no price is stored or
invented (prices are John's alone and read "Contact sales"), no billing, no new screen, no change to
how the gate decides. Out of scope: tiers and overage (`AA-16`), partitioning an agent by client
(`AGT-731`), the per-answer unit (`AGT-743`), rate identity (`AGT-619`).

**Rule these before ruling it in, because the pass named them against itself:**

- **`AA-16`** (P3, open since 2026-08-20, subscription tiers with allowance and overage) is the
  nearest neighbour and may absorb the schema step outright.
- **It may be P5, not P3.** If deepening something already built is P5 for this class as
  `VC-LRN-071` makes it for the inventive class, this is P5. Its sibling `AGT-785` was classed P4.
- **The honest weakness:** a usage statement is something every metered product has, so a reviewer
  expects it more than he admires it (pattern 137). What is specific here is the before-image on the
  term and the statement being *derived* rather than stored.

**Four candidates were dropped before reaching the board, and the reasons are worth recording**
because three of them are the pass declining to re-propose its own earlier work: Skill authorship
(returned 2026-09-21 and 2026-09-24, columns shipped under `AGT-251` — what remains is a write path
skipping its stamp, a defect not an invention); grading the licensed agent's served answers (on the
board as `AGT-73`/`AGT-72`/`AGT-74` — the cheapest move is to point `AGT-73` at the keyed lane and
grade ten real answers, no new ticket); flagging the unit-cost move and caching the repeated payload
(killed — caching a repeated prefix is a standard skill, pattern 149, and the unit belongs to
`AGT-743`; worth a scope note there to report input tokens per answer beside the dollars); and
proving one client's material never reaches another's answer (on the board as
`AGT-731`/`AGT-603`, and the usage leg is empty because only one site key exists — wait for a
second). A further nine board items were read live through `--prior-proposals` and dropped on
sight: `AGT-743`, `AGT-619`, `AGT-579`, `AGT-323`, `AGT-691`, `AGT-297` (done), `AGT-72`/`73`/`74`,
`AGT-731`, `AGT-603`.

**One number for the board's own health:** 21 tickets shipped in the window — 8 in the skills class,
1 in the customer class (`AGT-785`, the cost block on a tool result), and **0 in investor value**,
the class this lens has now led for seven consecutive runs. Every one of the 21 carries an attended
origin.

## Napkin — ideas reviewed this run

Ids and verdicts only. **The repo is public and the ideas are not**, so no idea text appears here;
the reasoning is written back to each row's `research_note`, which is where John reads it under the
writer's name.

| Idea id | Verdict |
|---|---|
| `n_b0c467b98a124413a1246173ec485a53` | **GO DEEPER** |

One idea was due — written 2026-11-22, never researched — and one update was written: that row's
`research_note` (593 characters) and `researched_at`, under its own `runner_before_images` row
(`ae1255fb-c863-41aa-b77e-071ce07af33a`, session `researcher-2026-W48`). `text`, `status`, `note`,
`nathan_note`, `category`, `tags`, `archived` and `text_updated_at` were left untouched and the
write was verified column-by-column afterwards against that before-image.

The deciding question the verdict names, stated here without the idea: **does the thing in question
appear as a scored requirement in a real government procurement document, or only as post-sale
reassurance?** The evidence behind the verdict is that the developer-facing side of it is crowded —
LangSmith, Langfuse, Arize/Phoenix, Datadog and Comet all ship for the team that *builds* the agent
— while the buyer-facing side is genuinely open: the searches found no end-user-facing surface of
this kind, and the nearest work (Ramp's policy agent linking the policy sections its reasoning
relies on, Lorikeet's replayable ticket log) stays inside the product. The regulatory pull is real
and dated — **EU AI Act Article 50 has applied since 2 August 2026**, per the Commission's own
guidelines page, with Article 50(2)'s marking duty carrying a transition to 2 December 2026 for
systems already on the market, and the high-risk Annex III obligations deferred to 2027-12-02 by the
Digital Omnibus. What is missing is any evidence that anyone *pays* for it: no study was found
showing customers pay more or stay longer for cost receipts, and the consumer-trust figures that do
exist (28% citing lack of transparency as a top concern; 49% wanting transparency about what data an
agent can access) are vendor surveys.

**A caveat on those citations, stated because it changes how much they are worth:** the Commission
guidelines page and the consumer-survey page could not be opened directly —
`digital-strategy.ec.europa.eu` and `www.checkout.com` both fail DNS under this environment's
network policy — so both are cited as dated search text, not as pages read. The Article 50 date is
corroborated across several independent secondary sources and the Commission page itself appeared in
results, which is why it is stated plainly; the survey percentages are single-source and vendor-run,
which is why the verdict does not lean on them.

## One process finding from this run

Finding 4 above is worth stating in prose because it is about the Napkin itself. **The due rule
cannot be re-opened by the highest-signal input the Napkin has.** Under `AGT-577` an idea is due
when `researched_at` is NULL or older than `text_updated_at`, and `text_updated_at` moves only when
the idea's own *text* changes. A `nathan_note` — written by the beta prospect, the one person in
this loop who is actually a prospective buyer — therefore never makes an already-researched idea due
again. Measured this run: **two `nathan_note`s written 2026-11-18 landed on ideas last researched
2026-11-14, and neither idea has been re-researched in the ten days since.** Both carry market
signal; one names a competitor's MCP server taking the aggregate half of an idea, the other reframes
an idea as a pricing signal.

The playbook's PART 1 is explicit that a tag, category or archive edit never makes an idea due —
and silent on a `nathan_note`, which is a different kind of input from those three. So this is a
decision to take, not a bug to assume: either the due test becomes
`researched_at IS NULL OR researched_at < greatest(text_updated_at, nathan_noted_at)`, or the
runbook says in so many words that a `nathan_note` does not re-open an idea, so that next
Saturday's run does not re-derive this same finding. Filed as a `gap` for the manager, not acted on
here.

## The research body

What follows is the research document the pass returned, unedited. It was checked for client-name
leakage before being committed — the gate's `caller_name` and its non-project-vocabulary token
appear nowhere in it, which the pass achieved by withholding the name itself and flagging it to the
orchestrator instead.

---

# Weekly market review - P3 - Investor Value - 2026-W48 (2026-11-21 to 2026-11-28)

Lens: P3 - Investor Value, seventh consecutive run (census: 0 ratified, 157 proposed, 7 rejected; the inventive class has 0 ratified and 158 proposed, so fewest-proposed picks this one by a single claim). Allowed: 2 proposals. Returned: 1. Nothing was filed; the survivor is returned for the findings intake.

Egress: ok. WebSearch worked on all 17 queries. Pages could not be opened directly from this run, so every market finding rests on the dated search result for the page named and says so. Where a result carried no date, the row says "page date not shown" instead of guessing one.

## The pitch

The licence leg got its first outside traffic, and it arrived the way VC-LRN-004 said it would: unrecorded as what it is.

In this window one site key produced 67 of the platform's 74 priced answers and $11.5658 of its $11.6033. That is the offering your company record calls "License your agent ... each with its own address, key and usage cap", running for real. The key works, the cap works, the ledger prices every answer, and since 2026-11-21 the answer even carries its own cost back to the caller.

What a reviewer cannot do is read the licence. Who holds the key is the name of a secret. The allowance is a lifetime ceiling with no period, so at this week's cost the one licensee stops for good in about 72 answers. And the ceiling was raised twice in two days, $5 to $10 to $30, with nothing kept but a sentence in a note field, on a platform whose own invariant says a write without a before-image does not happen.

The proposal is to hold the licence as rows: holder, allowance, period, every change with the value before it, and one statement per key derived from the ledger. No price, no billing, no new screen.

I am returning one survivor, not two. Four other candidates had evidence; three are already on the board and one is a standard skill. The reasons are in the shortlist.

## What the market says (live, dated)

**Honest headline: almost nothing on this lens is dated inside the window.** The only in-window sources I found were aggregator briefs (https://aiagentsdirectory.com/news/ai-agents-daily-brief-november-27-2026), and the one claim of theirs I could test at a primary source was wrong. The market picture below is the standing one, re-read on 2026-11-28, with each item's real date.

**How an agent reached over MCP is sold.**
- Per-call fees, tiered subscriptions with monthly caps, usage plus overage, prepaid credits, outcome-based. https://zuplo.com/blog/mcp-monetization-models (vendor guide; page date not shown). None of the listed models is a lifetime ceiling.
- Stripe documents charging agents for MCP tool calls. https://docs.stripe.com/agentic-commerce/monetize-mcp (page date not shown).
- An operator guide says to reconcile the server's own logs against billing totals. https://dodopayments.com/blogs/mcp-server-pricing-models (vendor guide; page date not shown).
- Atlassian sets allowance limits and starts billing its usage meters on **2026-12-03**, including a meter for requests an agent resolves without human escalation. https://www.atlassian.com/blog/company-news/expanded-usage-based-pricing
- Microsoft split Copilot pricing on **2026-09-25**, with pay-as-you-go credits at $0.01. https://futurumgroup.com/?p=96130 (analyst note).
- A weekly pricing tracker's 2026-W46 issue headlines apps folding the agent into the plan tier. https://pricingsaas.com/news/ai/2026W46. The search summary also reports 459 credit-based pricing moves against 259 the period before; I could not tell which issue carries the count, so treat it as a lead.

**What a buyer's reviewer asks.**
- An evaluation set and regression evals; no private continuous evals is a concern. https://wavect.io/blog/technical-due-diligence-ai-mvp/ (vendor checklist; page date not shown).
- The boundary between what the agent does alone and what needs sign-off, a full decision trail for one output, and cost per action. https://www.peony.ink/blog/ai-due-diligence (vendor guide, 2026).
- AI application gross margins of 45% in 2025 and a projected 53% in 2026 against 80-90% for traditional software, and "what is actually in cost of revenue" as the opening diligence question. https://www.cloudzero.com/blog/ai-gross-margin (citing an ICONIQ report of July 2026).
- I found no standards body or major accounting firm checklist. Everything above is vendor-authored.

**What a buyer's lawyer asks.**
- Long-duration protections for data rights; deal insurers may exclude data provenance. Skadden, **2026-02-19**. https://clsbluesky.law.columbia.edu/2026/02/19/skadden-discusses-ma-in-the-ai-era-what-buyers-can-do-to-confirm-and-protect-value/
- Seller statements on the quality, accuracy and legality of training data, with their own liability caps. https://www.osler.com/en/insights/updates/ai-companies-representations-and-warranties/ (page date not shown).
- Expanded requests covering an AI inventory, training data sources and ownership of generated material. https://www.haynesboone.com/news/publications/addressing-ai-risks-in-merger-and-acquisition-transactions (page date not shown).

**The named acquirer and the domain.**
- Nothing from the named acquirer in the window. Its most recent AI statement is the **2026-07-31** appointment of a CTO and a board member. https://www.prnewswire.com/news-releases/sovra-strengthens-leadership-team-to-accelerate-next-generation-of-ai-powered-public-procurement-302840609.html
- Nothing from NIGP on AI in the window. The latest related item found is an AI procurement marketplace joining its Business Council in May 2026. https://windpress.info/fr/press-release/1121387/civic-marketplace-joins-the-nigp-business-council-to-help-shape-the-future-of-public-procurement (reported as May 2026)
- No procurement-AI funding or deal dated in the window. The standing picture (a $42M round; a $30M round plus an acquisition reported in May and June 2026) is unchanged, on dates as the search results gave them. https://govtech.com/biz/procurement-ai-tech-provider-starbridge-raises-42m and https://www.executivebiz.com/articles/procurement-sciences-highergov-acquisition-ai-govcon

**Exits and valuations.**
- November trade summaries list Five9 buying Level AI for about $325M, Meta buying Conductor, Sierra buying Anon, and OpenAI buying a travel agent and closing it. https://fourweekmba.com/ai-13-ai-deals-in-november-openai-and-meta-named-no-price/ (roundup; individual dates not verified). The buy-and-shut shape still dominates the small end, which is VC-LRN-013's open question, not a new one.
- Sierra is reported in talks at about $30B on $400M annualised revenue (**2026-11-18**, unconfirmed). https://aiweekly.co/alerts/bret-taylors-sierra-in-talks-to-raise-15b-at-30b-valuation-nearly-doubling-may

**Standards and certification.**
- No MCP release in the window. The current revision is **2026-07-28** (stateless, per-request context in _meta); a release-cadence post is dated 2026-11-11; the next revision targets 2027-03-30. https://modelcontextprotocol.io/specification/2026-07-28/changelog
- The agent certification scheme added Sierra (2026-09-17) and Harvey (2026-07-30); commentators question a body that writes the standard, tests against it and sells the insurance. https://www.unite.ai/sierra-earns-aiuc-1-certification-after-independent-audit/ and https://zeltser.com/aiuc-1-cert
- The EU's high-risk deadlines were provisionally moved to 2027-12-02 on 2026-05-07; I could not confirm final adoption. https://www.pinsentmasons.com/out-law/news/rules-high-risk-ai-delayed-under-eu-omnibus-deal. Not relied on.

### Where this run's evidence disagrees with a lead

| Lead | Verdict | What the source shows |
|---|---|---|
| The supplier launched agents that approve routine code changes (aggregator, 2026-11-27) | **Contradicted** | The supplier's documentation says review findings do not approve or block a change, and branch protection still needs a human owner. https://code.claude.com/docs/en/code-review. So the self-building engine's "approve" step has not been matched by the supplier, on this evidence. |
| Sierra closed $1.75B at $30B (aggregator, 2026-11-27) | Not confirmed | Reports are of talks at about $1.5B, dated 2026-11-18. |
| "No usage cap exists on a key" (my own first reading of api/_lib/mcp.js) | **Contradicted by the platform** | The cap is not in that file; it is in public.mcp_caller_gates and mcp_caller_gate() (ARCHITECTURE 19t). I checked before asserting, and the survivor is built on what is actually missing. |
| "The platform cannot say who wrote a Skill: 0 author columns" (VC-LRN-023, read 2026-09-25) | Half out of date | The columns now exist. They are empty: created_by_type is NULL on 243 of 243 rows. |

## What the job postings name

Not run. Job postings are the market leg for the skills class. This lens's market leg is the buyer's, the reviewer's and the lawyer's checklist, covered above.

## Vision-corpus grounding cited on the row

- **VC-SYN-001** - a feature adds investor value when a skeptical reviewer can confirm a claim from the product itself. The claim here is the licence plan's own sentence.
- **VC-LRN-041** - the licence leg "has a live transport and no unit behind it"; the first feature in the class is "a price/entitlement/counterparty schema, not another audit surface". This proposal is the entitlement and counterparty half and leaves price to you.
- **VC-LRN-004** - "the first real payer would arrive unrecorded". The first outside consumer did. I am not calling it a payer: the site is your own dashboard product.
- **VC-EXIT-022** - before-images and budget governors convert a solo experiment into an operable asset. The key ceiling is a budget governor whose changes have no before-image.
- **VC-INVAR-032** - no before-image, the write does not happen. Two writes to the ceiling happened without one.
- **VC-EXIT-025** - investors buy a machine whose unit costs are known. The statement puts the unit cost beside the allowance.
- **VC-LRN-038** - which revenue leg leads is unanswered. This week's rows are the first evidence for the MCP leg: 67 keyed answers against 0 ui calls and 0 priced deliverables.
- Rejected paths honoured: the statement reads only what the ledger holds (VC-REJECTED-018), shows an unpriced call as unmeasured and never zero (VC-REJECTED-017), is not narrowed to a convenient scope (VC-REJECTED-019), carries its defence with the number (VC-REJECTED-031), and attributes from what calls did, not from a declared cap (VC-REJECTED-016). Nothing is destroyed or masked at write time (VC-REJECTED-020). The six whitespace rows now in rejected status (VC-MAP-017 to 022) are not leaned on.

## The shortlist, and the runners-up and why they ranked lower

1. **The licence on the record - SURVIVOR.** Both legs. Pull test: the offering's own sentence becomes checkable from rows, and the term's history stops living in a note. Tiebreaker: a procurement director reads a statement against an allowance; a product reviewer reads entitlement held as data with its changes reversible.
2. **Skill authorship stamped on every write path - DROPPED, not new.** The market leg is the strongest of the week (data-rights terms, provenance exclusions) and the usage leg is exact (243 of 243 Skills name no creator; the one licensed Skill names none). But I returned authorship on 2026-09-21 and 2026-09-24, the columns then shipped under AGT-251, and what remains is a write path that skips the stamp. That is a defect, and I am reporting it as one, not returning it a third time as an invention.
3. **Grade a sample of the licensed agent's served answers - DROPPED, on the board** as AGT-73, AGT-72 and AGT-74. 0 judged runs in 30 days while 138 outside answers were served is the best argument yet for starting AGT-73 on the keyed lane.
4. **Flag a unit-cost move and cache the repeated payload - KILLED as a standard skill (pattern 149),** and the unit belongs to AGT-743. Cost per answer rose $0.032 to $0.173 in three days because the caller hands in about 84,000 tokens each time and 2.6% of input was read from cache. A scope note on AGT-743: report input tokens per answer beside the dollars.
5. **Prove one client's material never reaches another's - DROPPED, on the board** as AGT-731 and AGT-603, with an empty usage leg while only one site key exists.

Checked against the prior proposals supplied: AGT-323 (served-bundle identity), AGT-297 (caller identity, now done), AGT-579 (claims bound to checks), AGT-619 (rate identity), AGT-691 (refusal rows), AGT-743 (per-answer cost). The survivor matches none. Its nearest neighbours are AGT-297, which built the gate it extends, and AA-16 (P3, open since 2026-08-20: subscription tiers with allowance and overage), which is not in the supplied list and should be ruled against first.

## How it reaches the build queue

Nothing was filed and file_invention_proposal() was not called. The survivor is returned in this run's response for the findings intake. Predicted cycles: 2; the cheapest variant is 1.

1. Every write to public.mcp_caller_gates takes a before-image and carries one reversible decision.
2. The gate row gains a holder label that is not the secret's name, a period for the allowance (none or month, lifetime remaining the default), and start and end dates.
3. One service-role read returns, per key and period: answers, dollars, share of ceiling, input tokens per answer, last call. Derived from the ledger only.
4. That read is shown where a reviewer already opens cost.

Cheapest variant: steps 1 and 3. Out of scope: any price, invoice or payment; tiers and overage; client partitioning; the per-answer unit; rate identity; any change to how the gate decides.

Any migration here adds a table or function: revoke the public roles by name and assert both directions in the migration's own check, per the grants rule.

**What I am unsure of.**
- Whether this is P3 or P5. If deepening something already built is an enhancement for this class as it is for the inventive class (VC-LRN-071), it is P5. Only you can rule that.
- Whether it is P3 or P4. Its sibling AGT-785 was classed P4 and the class has no boundary rule against P4 (VC-LRN-020).
- Whether a reviewer is impressed or merely satisfied (pattern 137). A usage statement is expected of any metered product. What is specific is the before-image on the term and a statement that is derived, never stored.
- Whether the lifetime ceiling is deliberate. If you mean a trial key to stop for good, step 2 is unnecessary and the proposal is one cycle.
- The cost drift may be the caller's doing, not the agent's. I measured tokens, not the payload.

## The usage signal that proves it

Source: public.ai_activity_log, public.mcp_caller_gates, public.agents, public.skill_profiles, public.knowledge_entries, public.report_card_usage and public.platform_budget_status(), all queried by this run on 2026-11-28. Window 2026-11-21 00:00Z to 2026-11-28.

| Lane | Rows | Priced | Dollars |
|---|---|---|---|
| no call source (embeddings, retrieval, librarian) | 638 | 364 | $0.0016 |
| mcp | 317 | 74 | $11.6017 |
| session (subscription, $0 by design) | 203 | 0 | $0 |
| ui | 0 | 0 | $0 |
| **Total** | **1,158** | **438** | **$11.6033** |

- All 74 API-lane generative turns are priced, again 100%, as in every week measured since 2026-10-05.
- One site key: 67 answers, $11.5658, 83,831 input and 412 output tokens an answer, **$0.1726 an answer** against $0.059 last week. By day under that key: $0.032 (2026-11-19), $0.141 (11-20), $0.173 (11-21).
- The key all-time: 138 answers, 8,748,719 input tokens (223,270 from cache, 2.6%), **$17.517 of a $30 lifetime ceiling**. Last call 2026-11-22 16:43Z. Nothing in the six days since.
- The ceiling: $5 to $10 on 2026-11-20, $10 to $30 on 2026-11-21, recorded in a note. runner_before_images: 0 rows for the table.
- The agent the key calls: 222 MCP answers and $19.5651 all-time; its row reads usage_count 0, rating 0, revenue_model NULL. customer_agents: 0 rows. It holds 0 taught entries and 0 configuration rows; what it sells is one Skill row.
- Rate identity: 168 of 438 priced rows name no rate, including all 74 generative turns (AGT-619 is partial).
- Authorship: created_by_type NULL on 243 of 243 Skills; an updater on 23.
- Judged quality: 0 runs in 7 and 30 days; 3 all-time; none from a real visitor.
- Platform budget on 2026-11-28: $21.26 of the $35 month.
- Of the 317 MCP rows, 231 are knowledge servings with no model call and 64 come from 32 throwaway test agents; 193 name no caller and no address.

## Three board observations, not proposals

- **A write path creates Skills without the author stamp.** The Skill created 2026-11-19 and changed 2026-11-20 carries no creator and no updater, although lib/skill-write.js stamps both. 243 of 243 creators are NULL. This is a defect on a row an outside site is consuming, and it is the cheap half of what a buyer's lawyer asks.
- **AGT-743 should carry input tokens per answer.** The unit cost tripled in three days from the payload, not the price. A dollar figure alone would read as the agent getting more expensive.
- **A client's name sits in a key name, a gate note and AGT-785's text.** Company record line 6 says no client name or client data in anything public. I have withheld the name throughout this document. Whether those three places count as public is your call; I am flagging the line, not restating it differently.
