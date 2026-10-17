<!-- DeepBench | docs/research/2026-10-17-weekly-market.md | The Researcher, capability
     research-class-lens, run kind weekly-market-review, model claude-fable-5-1, run 2026-10-17.
     Window 2026-10-10 to 2026-10-17 (ISO week 2026-W42).
     PLAYBOOK RUN: docs/runbooks/researcher-routine.md is on origin/dev, so its Steps 0-5 were
     followed in place of the live routine's 2026-09-25 INTERIM text, as that interim paragraph
     instructs. check-routine-prompt.js exited 1 -- EXPECTED drift per the playbook, until John's
     RemoteTrigger update; the drift check files its own finding.
     LENS: P2 and P3 tie at 0 ratified (110 vs 109 proposed), so NOT a full tie -- fewest proposed
     breaks it and the lens is P3 - Investor Value. Last week reached P2 on the first full tie in
     the rule's history; this week the counts moved apart again by one claim.
     EGRESS: ok -- and this is the SECOND consecutive run to measure it that way. WebSearch worked
     throughout (22 queries in the research pass). WebFetch is ENOTFOUND for akyn.ai, peerpush.com,
     sia-partners.com, businesswire.com and newsroom.workday.com. That is the same split 2026-10-03
     filed as a defect finding (the runbooks record the inverse); still unfixed in the runbooks.
     ZERO NEW PROPOSALS, and the reason is the headline of this run: the single survivor the
     research pass returned is already on the board as AGT-323, open and unbuilt since 2026-10-03.
-->

# Weekly Market Review — 2026-10-17 (week 2026-W42)

**Lens:** P3 — Investor Value. **Window:** 2026-10-10 → 2026-10-17.
**Filing gate:** shut (`SES-369`). `file_invention_proposal()` was not called.
**Proposals this run: zero new.** The one survivor duplicates an open ticket; see *Proposals*.

---

## What shipped this week, and the one fact about it that matters

Seven tickets reached `delivered` in the window. **All seven are internal governance or tooling**
— four `P10 - Tooling`, two `P9 - Bug Fixes`, one `P6 - Agent Enhancement` — and every one is
`scope_origin john-named`:

| Class | What it fixed |
|---|---|
| P10 | A directive stays open after the tickets it names are done |
| P6 | A Skill every agent in a set must know has to be pinned per-capability (48 rows, 11 agents) |
| P10 | The test pinning Victoria's requirement-check bindings asserts a list that no longer exists |
| P10 | The repo has no copy of Victoria's prioritization rows, so her rules can drift |
| P9 | A John-declared drain cannot build a ticket he named if it scores under 3 |
| P10 | A fix to the pick/gate/runner has no door into an executing project |
| P9 | A parked ticket cannot be scored 0 though Victoria's own rules require it |

**Zero customer-facing items and zero P3 items shipped in these seven days.** That is not a
criticism of the seven — each closes a real hole in the machine that picks and builds work — but it
is the context the P3 lens asks about: the week's entire output was invisible from outside the
product, and P3 is the class that asks what an outside reviewer can confirm for himself.

---

## The week's market — what actually moved

Full cited table in the appendix. The four moves that matter for P3:

1. **An acquirer paid for agent *governance*, not agents.** Workday signed a definitive agreement
   on **2026-10-13** (announced at Workday Rising, Las Vegas) to acquire **C1.ai**, "a leading
   agentic identity platform for people and agents," extending its existing Agent System of Record
   to govern what agents can *access*; close expected in Q4 FY2027 (ends 2027-01-31), terms
   undisclosed. The release cites research that **95% of large US companies run autonomous agents
   and 21% govern them maturely**.
   Sources: [Workday newsroom](https://newsroom.workday.com/2026-10-13-Workday-to-Acquire-C1-ai,-a-Leading-Agentic-Identity-Platform-for-People-and-Agents),
   [Orrick (counsel)](https://www.orrick.com/en/News/2026/10/Workday-to-Acquire-C1-ai-a-Leading-Agentic-Identity-Platform),
   [AI Magazine](https://aimagazine.com/news/workday-buys-c1-ai-to-govern-what-ai-agents-can-access).
   Verified independently of the research pass, which could not open the newsroom page.

2. **Agent identity becomes an approved, recorded act at the competitor set.** Microsoft Entra
   Message Center **MC1506728** (2026-10-13): from **2026-11-04** an administrator must approve
   `AgentIdentity.CreateAsManager`, which agents currently receive automatically.

3. **The free alternative can now say what each routine cost; DeepBench still cannot say what one
   answer cost.** Read from the primary repo (`github.com/markfulton/ai-employees`, HEAD `7b0d076`,
   pushed 2026-10-14): a per-routine cost table (GTM Engineer, 42 scheduled sessions 2026-08-26 →
   2026-09-04, priced at Opus 5 API list, ~6% of the seat's usage, a skipped fire ≈ $0.90–$1.10),
   and `cost_usd` / `cost_basis` as run-record fields "so what a run cost is a measured field the
   scoreboard can sum, not a guess." This **lifts the 2026-10-10 UNVERIFIED** on that record.
   Nuance to carry: the dollars are API-*equivalent* at list price for a subscription seat, and the
   table covers one employee of eight.

4. **Per-answer cost is becoming a standard shape, and the vendor API will not supply it.**
   Anthropic's Usage and Cost API is daily granularity grouped by workspace or description only,
   with no per-request cost — so a per-answer figure can only come from DeepBench's own ledger
   joined to a price book. Meanwhile **FOCUS 1.5** (roadmap June 2026, target Dec 2026) adds a SKU
   Price dataset and *model identity* — which model was billed and who built it — and a Tokenomics
   Foundation has formed under the Linux Foundation. The held cost-per-deliverable payload already
   has that shape.

Also in-window but not P3: **Salesforce agreed to acquire Loops** (2026-10-12) — monitors KPIs,
flags anomalies, ranks likely causes by estimated impact — folding it into Tableau. That is the
`data-analyst` capability's market, and it bears directly on two Napkin ideas below.

**What did *not* move:** the procurement incumbents. No in-window announcement from Agent 365,
SOVRA, Hazel AI or Celonis. Anthropic's week (Dashboards and Motion in beta; Docs/Slides/Design GA;
Code Review GA) touches neither per-answer cost nor taught-knowledge provenance.

---

## Proposals for The Development Manager

**Zero new proposals this run.** `invention_due()` allowed 2; the research pass returned 1 survivor
and killed four candidates with its reasons on each. I then checked the one survivor against the
board — a check the research pass could not make, and said so — and it does not survive that check.

### The survivor is already a ticket: AGT-323, open and unbuilt for 14 days

The survivor was *"Knowledge bundle ships with its bill of materials, and the serving is on the
record."* It carried its own void-condition: *"the same proposal was ingested 2026-10-03 … this turn
could not read `audit_findings`, so its ruling state is unknown."*

Read live 2026-10-17:

- `audit_findings` row `cf3d80b5`, `found_by researcher:weekly-market`, week **2026-W40**,
  `finding_type proposal`, status **`ticketed`**, `filed_backlog_id` **`AGT-323`** — with a
  governing fact that opens byte-identically to this week's `enhancement_claim` and the same three
  locations (`api/_lib/handlers/agent-bundle.js`, `api/_lib/mcp.js`, `src/screens/ConnectScreen.jsx`).
- `backlog_items` row `0742ddc6` = **AGT-323**, *"The served knowledge bundle has no identity: no
  content hash, no version, and a ledger row that counts rows instead of naming them"* — status
  **`open`**, class **`P3 - Investor Value`**, `predicted_cycles` 1, created **2026-10-03**, never
  updated since.

So the void-condition does not fire — it was not ruled out — but the stronger conclusion holds:
**this is not a permitted second return, it is a duplicate of an open ticket.** Filing it would add
the second row that the ledger's own fingerprinting exists to prevent. Nothing was filed.

**What I ask the Development Manager to take from this instead:** the P3 lens has now independently
derived the same claim twice in three weeks, from different evidence each time (2026-10-03 from
`AGT-162`'s own promise; 2026-10-17 from Workday paying for agent-identity governance and Entra
gating agent identity). A P3-classed, one-cycle ticket that the research lane keeps re-deriving and
that has sat open and unbuilt for 14 days is a **pacing** signal, not a proposal. The evidence for
building AGT-323 is now stronger than it was when it was filed, and the fix remains one file plus a
regression test — no table, no migration, no model call, no screen change.

### Two recommendations carried forward from the pass, unchanged

1. **Release the held cost-per-deliverable payload** (the 2026-09-11 18:20Z decision, held pending
   `SES-369`) rather than accept a duplicate row for it. The week sharpened this three ways: the
   free alternative now publishes per-routine dollars, Anthropic's Usage and Cost API cannot supply
   a per-request figure at all, and FOCUS 1.5 is standardising exactly the price-book-plus-model-
   identity shape the held payload already has.
2. **Leave the taught-knowledge isolation floor out of the invention lane.** The pass killed it
   correctly — by function it is a security fix (P9/P10), and by pattern 137 an administrative
   expectation. See the next section: it also already has an owner, which the pass could not see.

---

## Where I confirmed, and where I contradict, the week's market records

85 `market_records` rows were written in the window (24 competitor, 13 release_note, 12 objection,
9 message, 8 feature_benefit, 4 feature_signal; 15 retired). Every one was treated as a lead, and
the load-bearing claims were re-checked at their own sources. The research pass's own
confirm/contradict table is in the appendix; what follows is the consolidated result, including
three places my own checks go further than the pass could.

### CONFIRMED

**1. The free alternative really does publish per-routine dollars.** Confirmed from the primary
repo, not from the record: `github.com/markfulton/ai-employees` at HEAD `7b0d076` (2026-10-14).
**The 2026-10-10 "UNVERIFIED" on that record is lifted.** Carry the nuance: the dollars are
API-*equivalent* at Opus 5 list price for a subscription seat, and the published table covers one
employee of eight.

**2. Expertise-sold-as-an-agent is a real, growing category.** Beyond the records' own list:
**Sia** (3,000+ consultants, 19 countries) grew its Agent Store from ~100 agents in late 2025 to
400 by 2026-02-11 and **over 1,000** by its April 2026 release, all "available for direct
consultation and deployment" at `siagents.ai`; and **Akyn AI** sells expert-built, AI-ready
knowledge bases over MCP with creator monetization.
Sources: [Sia corporate news](https://www.sia-partners.com/en/about-us/corporate-news/agentic-ai-consulting-sia-accelerates-its-development-with-more-400-agents),
[Sia's own 400-agent release PDF](https://www.sia-partners.com/system/files/document_download/file/2026-02/2026_02_11_EN_400_Agents.pdf),
[01net](https://www.01net.it/agentic-ai-consulting-sia-accelerates-its-development-with-more-than-400-agents-on-its-agent-store/),
[PeerPush on Akyn AI](https://peerpush.com/p/akyn-ai) (2026-01-20).
**Egress caveat:** `sia-partners.com` and `peerpush.com` are both ENOTFOUND here, so these rest on
dated search-result text. The 1,000 figure is Sia's own claim and one unofficial mirror says "over
800" — treat 1,000 as the company's claim, unconfirmed.

**3. The government open-data / centralization category is mature, not open.** Tyler's Open Data
Platform (the former Socrata) already ships catalog + APIs + interactive charts, maps and
dashboards, with CKAN, Junar and NuCivic alongside — and **Gartner retired its "Government Open
Data Management Platforms" market on 2025-10-01**, its definition being exactly portal + metadata +
APIs + visualization.
Source: [Gartner](https://www.gartner.com/reviews/market/government-open-data-management-platforms)
(read 2026-10-17).

### CONTRADICTED

**4. "Microsoft … governed agents at the cheapest seat in the set" is the wrong read.** The record
frames Microsoft as cheapest-seat. The research pass marked this "partly confirmed, price
third-party" and left the objection UNSETTLED. My own check settles the direction, if not
Microsoft's own figures: **the headline Copilot seat is not the governance seat.** M365 Copilot is
~$30/user/month enterprise (annual), $21 Business under 300 users. **Agent 365 — the governance
product — is $15/user/month standalone and requires M365 E5, Defender+Purview Frontline, or
Business Premium as a prerequisite**, is licensed **per user, not per agent**, and excludes
build/run, which bills separately as Copilot Studio credits ($200/month for 25,000, or
$0.01/credit). With E3 at $39 and E5 at $60 after the 2026-07-01 increases, the governed-agent stack
lands around **$69–$105/user/month**.
Sources: [Agent 365 licensing](https://samexpert.com/agent-365/),
[Rencore](https://rencore.com/en/blog/understanding-microsoft-agent-365-pricing/),
[Copilot Studio credits](https://www.getmacha.com/blog/microsoft-copilot-studio-complete-guide),
[M365 Copilot pricing](https://www.epcgroup.net/blog/microsoft-365-copilot-pricing-licensing-enterprise-guide-2026)
(read 2026-10-17; **all secondary** — Microsoft's own pricing pages could not be opened).
**Consequence:** answer *"Microsoft already governs agents and the seat is cheaper"* with the all-in
per-user arithmetic, not a feature comparison. Never quote $15/user/month as Microsoft's own figure.

**5. "Every call's cost is logged and priced on the internal AI Audit screen" is not true of this
week's data.** The feature_signal opening with that sentence is right about the gap it names (an
owner cannot see what his agent cost him) and wrong about its premise. Measured live 2026-10-17 over
`public.ai_activity_log`, past 7 days:

| call_source | calls | `cost_usd` NULL | `cost_usd` > 0 | input_tokens recorded |
|---|---|---|---|---|
| `ui` | 55 | 13 | **40** | 161,133 |
| `session` | 150 | **150** | 0 | 7,486,303 |
| *(null)* | 165 | **165** | 0 | 0 |
| **total** | **370** | **328** | **40** | **7,647,436** |

**40 of 370 calls this week carry a positive dollar figure.** By `screen_origin`, only
`live-agent-console` has any priced rows (40 of its 54); 315 of 370 calls carry no `screen_origin`
at all. The `session` NULLs are *correct* by the platform's own convention — `scripts/agent-log.js`
records NULL as "not billable, do not price," and a stored 0 would be a false assertion — but the
consequence stands: **the platform's own 7.49M input tokens of build work this week have no dollar
figure anywhere.** That is `VC-SYN-001`'s gap, measured.

**6. "The taught-knowledge isolation floor has no owning ticket" was answered the same day it was
written, and the research pass repeated the stale version.** The feature_signal (2026-10-14) and the
pass's own finding 1 both say no row owns it. Read live 2026-10-17: the Development Manager's ruling
on finding `3c925321` — dated **2026-10-14, the same day** — names **AGT-438** as the owner
(*"Taught knowledge is readable with the browser key that ships in the website: revoke anon SELECT
on `knowledge_entries` and …"*, row `a3fba4e7`, **open**, P9, created 2026-10-09), with DAT-29 as
the RLS floor beneath it, AGT-358 inside DAT-29, AGT-364 the address boundary above, and DAT-9
answered as superseded by DAT-29 per AGT-371. **I contradict my own research pass here:** the floor
has an owner, and the open question is only when AGT-438 lands, not who owns it.

**7. Celonis / Oklahoma OMES is accurate but is not this week's news — and this corrects my own
earlier Napkin note.** The research pass dates the release **2025-03-04** with no 2026 update, and I
accept that: the material is real and verified at source (Executive Order 2023-04; the AG's ruling
that OMES must review every exemption purchase; a **PeopleSoft data duplicate, never the live ERP**;
118 agencies per independent coverage versus all 122 in four months per Celonis's own case study;
**>$3bn procured outside OMES oversight**; savings of ~$10M and $190M in flagged purchase-card
transactions, all **vendor-reported and unaudited**) — but **it must not be dated to this window.**
Sources: [diginomica](https://diginomica.com/oklahoma-saves-10-million-and-reforms-procurement-celonis-process-intelligence),
[Celonis](https://www.celonis.com/customer/oklahoma-state-procurement/),
[apolitical](https://apolitical.co/en/navigator/case-studies/12-weeks-122-agencies-how-ai-transformed-public-spending-oversight-in-oklahoma).

---

## Napkin — ideas reviewed this run

15 ideas were due (`researched_at` NULL or older than `updated_at`, excluding `done` and `parked`).
**Ids and verdicts only — this repository is public and the ideas are not.**

| Idea id | Verdict |
|---|---|
| `n_806d49c825134dd4aac8291cbd0a28ce` | VALIDATED (held) |
| `n_a66b0cc4658f45d2a52e9ac6cbf09126` | VALIDATED |
| `n_d8bb5fbb655d4c3f90ece067227de358` | VALIDATED |
| `fnrgq6d73lns9f696uhy` | GO DEEPER (refreshed) |
| `n_ec6f2dd678cf4c6bb0c6544a5ad1d5ea` | GO DEEPER (corrects my own earlier note) |
| `n_56cad870b9734740a92d996db61fdda3` | GO DEEPER (held) |
| `n_db555929494c406cb235e99e987937cc` | GO DEEPER |
| `n_162cfcfd51eb4d239969f3f3dc3f91a2` | GO DEEPER |
| `n_4cf31d64458544ba892d1110afdac633` | GO DEEPER (contradicts that note's own finding) |
| `n_ecde38e323f6474a87b79b0d85090bd3` | WEAK (held) |
| `n_dea9f08d3789476da4472f1638bc0ff0` | WEAK |
| `n_146e7b17cd5041e297ba063d6a92526c` | WEAK |
| `n_cfb30a0225d74798a870d0dd7129fb9e` | WEAK |
| `n_2074630584e44247a711891b0cabacc9` | WEAK |
| `n_73e4e3ecc65f4fb5bd683fa2ccef04ae` | WEAK |

**3 VALIDATED, 6 GO DEEPER, 6 WEAK.** Each row's `research_note` and `researched_at` were written
under its own before-image (`runner_before_images`, `session_name researcher-2026-W42`, 15 rows,
`decision_id` NULL), one `UPDATE` per idea. `text`, `status`, `note` and `nathan_note` were verified
byte-unchanged against those images afterwards on all 15, and all 15 notes are within the
600-character cap.

**Four patterns worth John's attention — stated without the ideas' content, which stays private.**

1. **The ratio inverted, and that is the Napkin working.** Last week: 9 VALIDATED, 4 GO DEEPER, 0
   WEAK. This week: 6 of 15 WEAK. Last week's batch had already been through Nathan's hands and into
   the marketing work; **ten of this week's fifteen are raw ideas from 2026-10-12 to 2026-10-16 with
   no `nathan_note` at all**, and six of those resolved to categories that are already mature — each
   one crowded by named, funded incumbents, and in one case by a market category Gartner has
   formally retired. The review caught them before a ticket did. This is the first week the raw end
   of the Napkin has been mostly crowded ground, and the WEAK verdicts carry the specific vendor
   evidence in the private notes.

2. **Two separate ideas resolve to one build, and it is the strongest thing on the Napkin.** They
   are the same claim approached from two directions, and the white space held up under a direct
   search: nothing was found that does it. The market section above carries the public evidence —
   including the one design constraint the literature names, two-way traceability from conclusion
   back to source passage. **I recommend merging the two ideas into one.**

3. **This week's market closed in on two more of them while they were being reviewed.** Both touch
   the dashboard/BI lane, and the Salesforce–Loops agreement plus Tableau's already-GA MCP and
   semantic layer (see the market section) moved the ground under them in the same seven days. The
   deciding question for that pair turns out to be about the *client*, not about us, and it is named
   in the private notes.

4. **One pasted Napkin note contained research that this week's evidence overturns, and one of my
   own notes was wrong twice.** A note pasted into the Napkin concluded that no direct competitor
   exists for a claim where one demonstrably does, at scale (the market section names it). And my
   own 2026-10-10 note asserted that a search surfaced no public-sector-specific vendor in a
   category where a flagship one exists — wrong on the substance, and wrong a second time in the
   other direction, since that vendor's engagement is a 2025 release and not recent news. Both
   corrections are written into the private notes, each labelled as a correction.

---

## Findings filed into the intake

Ingested with `scripts/audit-ledger.js --ingest --week=2026-W42
--found-by=researcher:weekly-market --session-name=researcher-2026-W42 --apply`. Counts are the
ledger's own, printed in the summary message.

1. **gap / high — the research lane re-derives proposals that are already tickets, because the turn
   cannot read the board.** The pass returned one survivor, already filed as `AGT-323` on
   2026-10-03, and said in its own output that `audit_findings` was "unreadable by this turn." The
   duplicate was caught only because the orchestrating session happened to hold a Supabase
   connection the capability's own turn does not get. Locations:
   `docs/runbooks/researcher-routine.md`, `scripts/agent-prompt.js`.
2. **defect / high — the egress note in the runbooks is still backwards**, two runs after
   2026-10-03 filed it. `WebSearch` works; `WebFetch` is ENOTFOUND for a wide set of domains. The
   runbooks record the inverse and name a skip as the expected result. Locations:
   `docs/runbooks/researcher-routine.md`, `docs/runbooks/runner-cycle.md`.
3. **defect / medium — a sub-agent turn cannot log its own token split, so the mandatory Layer-3 log
   records UNMEASURED.** The harness reports one combined figure for a sub-agent (249,432 tokens
   this run), while `scripts/agent-log.js` requires `--input-tokens` and `--output-tokens`
   all-or-nothing. Passing the total as input with 0 output would assert a false zero, which the
   script's own convention forbids, so both were omitted and the row is NULL. Same family as
   `SES-428` / `SES-409`. Location: `scripts/agent-log.js`.
4. **market_records / medium — three corrections for the table's owner.** Reinventing.AI confirmed
   from its own repo (lift the UNVERIFIED); Agent 365's $15/user/month is third-party-sourced and
   the "cheapest seat" framing is wrong in direction once the E5 prerequisite and Copilot Studio
   credits are counted; Celonis/Oklahoma is a 2025-03-04 release and must not be dated to this
   window. Location: `public.market_records`.
5. **stale-or-irrelevant / medium — the taught-knowledge "no owning ticket" claim is stale within
   its own week.** `AGT-438` was named owner by the Development Manager's ruling on 2026-10-14, the
   same day the feature_signal asserting no owner was written. Locations: `public.market_records`,
   `public.audit_findings`.

Nothing was written to `market_records` (the routine never writes there), no routine or
`agents.is_active` was touched, no notification was sent, and `file_invention_proposal()` was not
called.

---

## Method and egress

- **Lens** picked from `public.judgment_class_census` read live 2026-10-17 by the rule, not by
  preference: fewest ratified (P2 and P3 both 0), then fewest proposed (P3 109 < P2 110). Not a full
  tie, so register A4's P1-first clause does not apply.
- **Prompt** assembled only through
  `node scripts/agent-prompt.js --agent=researcher --capability=research-class-lens
  --intent=rs-research-intent --task-file=…` (the `--task-file` flag exists and was used; argv caps
  at 128 KB). Never hand-built. The command printed model `claude-fable-5-1`, and the pass ran as
  **one** sub-agent on that model with web search available.
- **Egress: ok**, the second consecutive run to measure it so. 22 live WebSearch queries in the pass
  plus 12 in the Napkin and reconciliation legs; one primary repo read in full through the session's
  anonymous git proxy. WebFetch ENOTFOUND for `akyn.ai`, `peerpush.com`, `sia-partners.com`,
  `businesswire.com`, `newsroom.workday.com`. Claims resting on dated search-result text say so.
- **Turn logged** with `scripts/agent-log.js` (`--ai-type=autonomous-research`,
  `--feature=research-class-lens:rs-research-intent:depth0`, model `claude-fable-5-1`), tokens
  UNMEASURED per finding 3 above.
- **Writes this run:** 15 `napkin_ideas` rows (two columns each, under 15 before-images) and the
  ledger ingest. Nothing else.
- **Not a builder cycle:** no `runner_cycles` row, no version claim (playbook step 0).

---

## Appendix — the research pass's own output, verbatim

What follows is the `research_doc` returned by the `research-class-lens` turn, unedited. Where it
disagrees with the body above, the body states the disagreement and why; the two places are its
finding 1 (the taught-knowledge floor's owner) and the ruling state of the 2026-10-03 proposal,
both of which it correctly flagged as beyond its own reach.

> # 2026-10-17 Weekly Market Review — Lens `P3 - Investor Value`
> 
> **Root claims:** `VC-ROOT-003` (features that add investor / buyout value) and the class's newest root,
> `VC-SYN-001`: a feature adds investor value when a skeptical technical reviewer can confirm a claim from
> the product itself — where a number came from, what a piece of work cost, that an improvement was data
> and not code. **Allowed:** 2 (a maximum). **Returned:** 1 — a second return of the 2026-10-03 survivor,
> permitted once by the lane's own rule (one return of an unfiled survivor, with the record saying so;
> a third is a re-run). **Nothing new on the board survived**, and the reasons are written on each row.
> 
> ## The pitch
> 
> `VC-SYN-001` names two gaps: the platform cannot say what one answer cost, and its dollar figures have
> never been checked against the provider's bill. Both halves have been proposed in this lane already —
> cost per deliverable (payload held since 2026-09-11 pending `SES-369`) and the ledger reconciled to the
> bill (refused at filing twice; barred). This week the market made the first gap sharper, not different:
> the free MIT agent team DeepBench is compared against now **publishes a per-routine cost table and makes
> `cost_usd` a field on every run record** (read from its own repo, pushed 2026-10-14). The honest move is
> to say so and ask the Development Manager to release the held payload — not to file a duplicate row.
> 
> What the week did move is the **third** `VC-SYN-001` confirmation — that what the agent knows is data a
> reviewer can verify. Workday paid to acquire an agentic-identity platform (2026-10-13), Microsoft made
> agent-identity creation an admin-approved act (2026-10-13), and enterprise reviewers are being told to
> collect evidence of isolation rather than policy (IDC, 2026-08-06). DeepBench's answer to "prove it knows
> exactly what I taught it" is still a sentence on the Connect page. Measured today in the worktree,
> `api/_lib/handlers/agent-bundle.js` (v7.0.774) returns the knowledge bundle with **no content hash and no
> version**, and its ledger `call_facts` still record `role_prompts` and `knowledge_entries` as **counts**
> (lines 229–240). `DAT-004` edited the file since 2026-10-03; the gap is unchanged.
> 
> **The one survivor — Knowledge bundle ships with its bill of materials, and the serving is on the
> record.** A manifest (SHA-256 over the canonical bundle; one line per served row with table, id,
> `updated_at`, per-row hash; `served_at`) added to the bundle response and substituted for the counts in
> the existing `logActivity` call. One file plus its regression test. No new table, no migration, no model
> call (`VC-INVAR-005`), no change to the Teach path. A reviewer pulls the bundle from any MCP client,
> hashes it, and finds the ledger row with that hash; two manifests around one Teach write diff to exactly
> the taught rows — `VC-EXIT-020`'s before/after, confirmed from outside the product (`VC-SYN-001`).
> 
> ## What the market says (live, dated)
> 
> | Date | Source | What it shows |
> |---|---|---|
> | 2026-10-13 | Workday press release (*Digest*: newsroom.workday.com ENOTFOUND; text from investor.workday.com / orrick.com search results) | Workday signs a definitive agreement to acquire C1.ai, "an agentic identity platform for people and AI agents"; cites C1.ai/Deloitte research: 95% of large US companies run autonomous agents, 21% govern them maturely; Workday to be "the identity governance layer for people, money, and agents", extending its Agent System of Record. Terms undisclosed; close Q4 FY2027. **An acquirer is paying for governance of agents, not for agents** (`VC-EXIT-017`). |
> | 2026-10-13 | Microsoft Entra Message Center MC1506728 (*Digest*, mc.merill.net mirror) | From 2026-11-04 an administrator must approve `AgentIdentity.CreateAsManager`, which agents currently receive automatically. Agent identity creation becomes an approved, recorded act at the competitor set. |
> | 2026-10-12 | Salesforce / Loops (*Digest*: capital.com, futurumgroup.com, fourweekmba.com) | Salesforce to acquire Loops — monitors KPIs, flags anomalies and "ranks the likely causes by estimated impact" — folding it into Tableau; terms undisclosed, Calcalist's ~$30M estimate unconfirmed. Context for the `data-analyst` capability's market, not P3. |
> | 2026-10-14 (HEAD 7b0d076) | github.com/markfulton/ai-employees — `README.md` §"What AI Employees cost to run", `docs/COST.md`, `employees/ad-manager-employee/CONTRACT.md` §4 (**read in full from a shallow clone**) | The free MIT agent team publishes a per-routine cost table: GTM Engineer, 42 scheduled sessions 2026-08-26 to 2026-09-04, priced at Opus 5 API list, ~6% of the seat's Claude usage, a skipped fire ≈ $0.90–$1.10 API-equivalent. Run records carry nine optional fields — `input_tokens`, `output_tokens`, cache tokens, `cost_usd`, `cost_basis` (`api-list` / `subscription` / `unknown`) — "so what a run cost is a measured field the scoreboard can sum, not a guess." **Confirms the week's record; lifts the 2026-10-10 "UNVERIFIED".** |
> | read 2026-10-17 | platform.claude.com Usage and Cost API docs (*Digest*) | Cost report is daily granularity, grouped by workspace or description only; no per-request cost. A per-answer figure can only come from the platform's own ledger joined to a price book. Context for the held cost-per-deliverable payload. |
> | reported 2026-09-30 → 2026-10-11; effective 2026-10-30 | OpenAI Pro 200 change (*Digest*: pcworld.com, officechai.com, community.openai.com) | Pro 200's included ChatGPT Work / Codex usage halves (20x → 10x Plus) at the same $200; dots usage terms to be published "after the launch month". The competitor set reprices the seat without ever stating a per-task cost — `C-MAP-59`'s mechanism, live this week. |
> | roadmap June 2026, target Dec 2026 | FOCUS 1.5 (*Digest*: focus.finops.org, Flexera FinOps X recap) | FOCUS 1.5 adds a SKU Price dataset and "model identity: which model was billed and who built it"; a Tokenomics Foundation formed under the Linux Foundation for AI cost standards. Price-book-as-data and per-row model identity are becoming the standard shape, which is the shape the held payload already has. |
> | 2026-08-06 | IDC, "five questions security" (*Digest*) | Enterprise AI security review "collects reassurance. It rarely collects evidence"; IDC's test is to make the vendor show where tenant isolation is enforced; a SOC 2 report does not say whether tenant data can bleed. |
> | 2026 (checklist dated; revera.legal page undated) | aibusiness.vc due-diligence checklist; revera.legal (*Digest*) | Diligence asks for gross margins after compute costs, data provenance, output reliability, and "whether customer-specific datasets can be isolated". |
> | 2026-10-10 / 2026-10-15 | Anthropic (*Digest*: releasebot.io, code.claude.com whats-new) | Claude Dashboards and Motion in beta; Docs/Slides/Design GA on every plan; Code Review GA for Team/Enterprise. Nothing in Anthropic's week touches per-answer cost or taught-knowledge provenance. |
> | 2026-10-09 | Apple acqui-hires Huxe (*Digest*: 9to5mac.com) | One day before the window; the acqui-hire pattern (`VC-EXIT-015`) continues — Apple's fourth AI deal disclosed this year per the EU DMA site. |
> | checked 2026-10-17 | Agent 365, SOVRA, Hazel AI, Celonis/Oklahoma | **No announcement dated in the window.** Agent 365 GA 2026-05-01, $15/user/mo per third-party licensing analysts (no Microsoft page read; Rencore says it is unclear whom the per-user license covers); SOVRA's newest item is the 2026-08-18 board appointment; Hazel's newest is the 2025 Dallas deal; Celonis/Oklahoma is the 2025-03-04 release. The procurement incumbents did not move this week. |
> 
> ## What the job postings name
> 
> Not run for this lens. The postings leg is the P1 (`VC-ROOT-001`, pattern 149) instrument; P3 is tested
> against buyers, acquirers and diligence, which the market leg covers. Recorded as an omission, not padded.
> 
> ## Vision-corpus grounding cited on the row
> 
> - `VC-ROOT-003` (root); `VC-SYN-001` (the reviewer confirms from the product what the agent knows, what
>   work cost, that an improvement was data).
> - `VC-EXIT-007` (diligence pass, not a pitch), `VC-EXIT-008` (training operation, not a software
>   release), `VC-EXIT-009` (the acquirer buys the trained data; the manifest is that data's receipt),
>   `VC-EXIT-012` (audit surface doubles as diligence surface), `VC-EXIT-017` (strategic buyers acquire
>   governance gaps — Workday/C1.ai this week), `VC-EXIT-020` (before/after of a training edit),
>   `VC-EXIT-027` (value travels with the asset: the hash is for a reader who does not trust DeepBench).
> - `VC-INVAR-005` (no model call where a hash serves), `VC-INVAR-014` / `VC-INVAR-018` (attribution from
>   what the call did; stateable provenance), `VC-INVAR-015` / `VC-REJECTED-017` / `-018` (the manifest
>   enumerates exactly what was served; zero rows lists zero, never a placeholder), `VC-REJECTED-016`
>   (declared config is not evidence; the manifest is the served content), `VC-REJECTED-042` (rows change
>   after serving, so what-was-served has no other home).
> - `VC-THESIS-021` tiebreaker: a procurement director reads a packing slip on a delivered knowledge
>   product; a VP of Product reads an agent BOM over MCP — the shape Prediction Guard and ZeroPath now ship
>   as CycloneDX AIBOM exports (2026, *Digest*).
> - Patterns 137 and 149 applied to every row below. Rejected paths checked; none re-proposed.
> 
> ## The runners-up and why they ranked lower
> 
> 1. **Taught-knowledge isolation proven from the product** (`VC-EXIT-013`, `VC-INVAR-023`). The most
>    directly evidenced lead of the week — Workday/C1.ai, Entra's approval gate, IDC's "evidence not
>    reassurance", the open objection "prove my client's material stays mine" — and, *worktree*, the floor
>    has no owner: `DAT-9` (RLS platform-wide) is `removal proposed`, `DAT-29` is an omnibus P10 security
>    floor, `AGT-358` (RLS off on `agents`) is a separate P9; none names `knowledge_entries`; *context*:
>    RLS on 3 of 89 public tables. **Killed as an invention:** by function it is a security fix (P9/P10) and
>    by pattern 137 an administrative expectation — no buyer pays extra for their data not leaking. The P3
>    sliver (a reviewer-runnable cross-owner pull returning zero rows, stated on the Connect page) is a
>    deepening of the fix and P5 once the fix exists. **Routed instead as an ownership finding:** one row
>    must own the taught-knowledge isolation floor and name the table.
> 2. **The answer carries what it cost** (`VC-SYN-001`, `VC-EXIT-021`, `VC-EXIT-025`, `C-MAP-59`). The
>    week raised its priority three ways — the free team publishes per-routine dollars, Anthropic's cost
>    API cannot supply a per-request figure, FOCUS 1.5 standardises the price-book shape. **Killed as a new
>    row:** the payload is held by the 2026-09-11 18:20Z decision pending `SES-369`; a second row
>    duplicates. Recommendation to the Development Manager: release the held payload.
> 3. **Library correction reaches the answers that cited the old chunk** (2026-09-26 survivor 1;
>    `VC-EXIT-020`, `VC-INVAR-019`). One return is still permitted, but nothing moved this week in either
>    leg and its figures (33 supersessions, 571 traces, recorded 2026-09-26) could not be re-measured by
>    this turn. A return without new evidence is a re-run, so it stays in the 2026-09-26 record.
> 4. **What each shipped ticket cost the platform to build, on the governance record** (`VC-EXIT-011`,
>    `VC-EXIT-025`). Diligence asks for margins after compute, and the self-building platform is the
>    headline investor artifact — but *worktree*: `SES-428` (cloud cycles get no usage metadata),
>    `SES-432` (day cap counts only sub-agent turns) and `SES-409` (hand estimates under-report ~6x) are
>    all open P10. The number does not exist yet; never stack a feature on something unknown that is
>    broken. Revisit once `SES-428` lands.
> 5. **Killed before the shortlist:** agent reach measured from the ledger (the Personnel File proposal in
>    a new coat — barred, two returns); ledger reconciled to the provider's bill (barred); Skill authorship
>    on the record (barred); a FOCUS 1.5-shaped ledger export (pattern 137, an export); per-Agent spend
>    governor (pattern 137, seven passes).
> 
> ## How it reaches the build queue
> 
> Not filed. `file_invention_proposal()` was not called — the gate is SHUT (`SES-369`) — and
> `invention_due()` was not read; the volume cap of 2 came from the task context. The proposal below is
> returned in the filing shape for the Development Manager's ruling. **One caveat the ruling must check:**
> the same proposal was ingested 2026-10-03 as a `proposal` finding under `found_by researcher:weekly-market`
> (week 2026-W40); this turn could not read `audit_findings`, so its ruling state is unknown. If it was
> ruled out there, this return is void and the record should say so. When it files: one `backlog_items`
> row, `scope_origin 'enhancement'`, class `P3 - Investor Value`, `predicted_cycles` 1, description citing
> the `VC-` refs above and this file's path; the 72-hour window ratifies; per the `LOG-143` record an
> admitted enhancement is served only once linked to a Selfbuild epic (`SES-321`).
> 
> ## The usage signal that proves it
> 
> - *worktree*, 2026-10-17: `api/_lib/handlers/agent-bundle.js` v7.0.774 — no hash, no version, counts in
>   `call_facts` (lines 229–240); the file was edited by `DAT-004` after the 2026-10-03 measurement and the
>   gap survived the edit.
> - *context*: 7 items shipped in the window, all internal (4 P10, 2 P9, 1 P6), all john-named; 0
>   customer-facing, 0 P3. `HAR-27`: `ws-news-search-intent` is 344 calls / 36.5M input tokens / ~19% of
>   spend. `AGT-301` (P4, open): Spend Analysis drops the source transaction id. `DL-12` (P4, open).
> - 2026-10-03 record, not re-measured: 0 `customer_profile` rows; Report Card run 3 times all-time; the
>   MCP path has one intended outside caller.
> - Visitor pull, stated plainly: none of these is a pull signal. The proof once built: servings whose
>   manifest hash matches a ledger row (100% by construction), Teach writes whose row ids appear in a later
>   serving's manifest, and the first manifest diff requested by a reader other than John.
> 
> **Thinness, stated plainly:** leg 1 is digest-only except for one repo read in full; leg 2 is two file
> reads plus the task context, with no live table read. That is enough to confirm the 2026-10-03 gap is
> still open and that the week's market moved toward agent-identity governance, not enough to justify a
> second survivor. One return, cheapest variant, is what the evidence supports.
> 
> ## Where I confirmed or contradicted the week's market records
> 
> | Record | Verdict |
> |---|---|
> | **Reinventing.AI AI Employees** — "the free alternative publishes measured per-routine dollars" | **CONFIRMED from the primary source** (shallow clone, HEAD 7b0d076, 2026-10-14). `docs/COST.md` has the per-routine table and method; `CONTRACT.md` §4 makes `cost_usd` / `cost_basis` run-record fields. Nuance: the dollars are API-*equivalent* at Opus 5 list price for a subscription seat, and the table covers one employee (GTM Engineer), not all eight. The 2026-10-10 "UNVERIFIED" is lifted. |
> | **Microsoft Agent 365 — "governed agents at the cheapest seat"** | **Partly confirmed, price third-party.** GA 2026-05-01; $15/user/mo and E7 at $99 come from licensing analysts (Orchestry, Rencore, LicenseQ), not a Microsoft page; Rencore says it is unclear whether per-user applies to every tenant user. Say "$15/user/mo per third-party analysts", never as Microsoft's figure. No in-window announcement. |
> | **OpenAI dots** | **Confirmed**, with the Pro-tier structure ($100/$200/$500, first dot included) from third-party pages; the Pro 200 allowance cut effective 2026-10-30 is press-reported, not an OpenAI page read. |
> | **Celonis (Oklahoma OMES)** | **Confirmed as a 2025-03-04 release**; no 2026 update found. Do not date it this week. |
> | **Hazel AI, SOVRA/Periscope** | **No in-window news.** SOVRA's newest is 2026-08-18 (board). |
> | **Grok Bot, Meta Muse, Akyn AI, Cloneable** | **Not re-checked this run** — no in-window result surfaced and the pages are unreachable; the prior weeks' verdicts stand unexamined. |
> | **Objection: "Why pay when a free agent team costs nothing"** | **SHARPENED.** The free team can now say what each routine cost; DeepBench cannot say what one answer cost (`VC-SYN-001`). This is the week's sharpest contrast and it argues for releasing the held cost-per-deliverable payload. |
> | **Objection: "Microsoft already governs agents and the seat is cheaper"** | **UNSETTLED.** "Cheaper" depends on which users need the $15 license, which Rencore says Microsoft has not made clear. |
> 
> ## Findings for the Development Manager besides the proposal
> 
> 1. **gap / high — the taught-knowledge isolation floor has no owning row.** `DAT-9` is `removal
>    proposed`, `DAT-29` is omnibus, `AGT-358` covers `agents` only; none names `knowledge_entries`. Name an
>    owner; it is heal lane, not invention.
> 2. **proposal-state / medium — the 2026-10-03 bundle-BOM proposal's ruling is unknown to this turn.**
>    If it was ruled out in `audit_findings`, void this return.
> 3. **decision / medium — release the held cost-per-deliverable payload** (2026-09-11 18:20Z decision,
>    pending `SES-369`) rather than accept a duplicate; the week's evidence is above.
> 4. **market_records / low — corrections for the table's owner:** Reinventing.AI confirmed (lift
>    UNVERIFIED); Agent 365 price is third-party-sourced; Celonis/Oklahoma is a 2025 release.
> 
> ## Method note
> 
> Egress: WebSearch live (22 queries); WebFetch ENOTFOUND on newsroom.workday.com; one public repo read
> through the session's anonymous git proxy. No Supabase read, no write, no filing, no push, no
> notification. Figures labelled *worktree* were read from `/home/user/deepbench-frontend` on branch
> `session/researcher-20261017`; figures labelled *context* were measured by the platform this session.
