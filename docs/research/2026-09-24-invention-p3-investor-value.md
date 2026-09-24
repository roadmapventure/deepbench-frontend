<!-- DeepBench | docs/research/2026-09-24-invention-p3-investor-value.md | The Researcher, capability
     research-class-lens, model claude-fable-5-1, run 2026-09-24 under session/cycle-20260924-0041.
     Lens chosen by the census (P3: 0 ratified, 61 proposed; P2: 0 ratified, 95 proposed). Root claim
     VC-ROOT-003. Allowed: 2. Leg 1 ran on live WebSearch (egress ok); WebFetch was refused by the
     egress proxy on every page tried (subjecttoinquiry.com, kognitos.com, fas.org), so every market
     finding is a search digest carrying the date the digest or URL states, marked *Digest*. Leg 2 ran
     read-only against Supabase the same day. Nothing was written to the repository or to any table. -->

# 2026-09-24 Invention Pass, Lens P3 - Investor Value: research leg

**Root claim:** `VC-ROOT-003`, new features that add investor / buyout value. **Class reading used:**
`VC-SYN-001`, a feature adds investor value when a skeptical technical reviewer can confirm a claim
from the product itself. **Allowed:** 2. **Survivors returned:** 2.

## The pitch

The locked pitch (`VC-EXIT-008`) has three clauses: routing, attribution, and a feedback loop
"already built into the data model," so that improving an agent is "a training operation, not a
software release." I measured the third clause today against the rows a reviewer would read:

- `deliverables`: 9,903 rows, 78 in the last 30 days, **0 approved, 0 change-requested, 0 final,
  0 priced, 0 shared; every row is `draft`**. The approval-to-training loop the pitch names has never
  fired once.
- `agent_training_sessions` (columns `class_hours`, `cost`, `skill_delta`): **0 rows**. The table for
  a training operation exists and nothing has ever written it.
- `skill_profiles`: **137 rows, 20 of them added since 2026-09-21** (newest 2026-09-23), and the table
  has no `author`, `origin`, `updated_at` or `version` column. Nobody can say who wrote any Skill, or
  when its text last changed. All 137 name `llm_provider = anthropic`.
- `bench_report_cards`: the judge (`LOG-143`, done) has produced 2 cards, both 2026-09-03, both
  naming a `skill_to_improve` with a paragraph of natural-language `evidence`; `report_card_usage`
  shows 3 judge runs all-time, 0 in 7 days, 0 from a real visitor. Nothing reads the evidence back.

So the asset the exit thesis says an acquirer buys (`VC-EXIT-009`, the trained DEEP) is growing at
twenty rows in three days with no provenance, and the mechanism the pitch sells has no row that
proves it ran. Two survivors, one asset, in build order:

1. **Skill authorship on the record** (second return; first proposed 2026-09-21, never filed because
   the lane is shut). `skill_profiles.origin` (kind human / model / agent / imported, actor, model,
   source_ref, recorded_at) plus an actor stamp on every content change, riding `SES-363`'s version
   trigger if it has landed and otherwise its own append-only trigger that `SES-363` adopts. Backfill
   only from kickoff or design docs that name the slug; a Skill no doc names reads "authorship
   unrecorded" (`VC-INVAR-015`). One line on the Personnel File's Skill card. Two cycles. Unchanged
   from 2026-09-21 except the measurement: 137 rows now, not 117.

2. **The platform drafts the Skill fix.** When a Report Card names a `skill_to_improve`, one drafting
   Capability, run through the generic executor (`ARCHITECTURE.md` §19b) like the judge itself, reads
   the card's `evidence`, the Skill row's current text, and the hops it was assembled into, and writes
   a **revision proposal row** (`skill_revision_proposals`: skill slug, proposed field-level diff,
   the judge row it cites, the drafting call's `ai_activity_log` id, prior-attempt count on this
   Skill, status proposed). It is a §12 card on the briefing. John's Accept applies the diff to
   `skill_profiles` with a `runner_before_images` row under one decision handle, stamps
   `origin.kind = 'model'` via survivor 1, writes the first-ever `agent_training_sessions` row
   (`cost` = the drafting call plus the judge call, `skill_delta` filled when `AGT-74` re-judges),
   and is reversible through `reverse_decision()`, whose allowlist already covers `skill_profiles`
   (`SES-364`, delivered). A Reverse restores the before-image and marks the proposal rejected. Two
   rejected proposals on the same Skill stop the drafter for that Skill and hand the card to John
   with both attempts attached (`VC-REJECTED-008`: after two instruction-level attempts, go
   structural). Nothing touches an active agent's row without John's Accept
   (`.claude/rules/agent-roster-inert.md`). Three cycles.

Why these are P3 and not P1 or P10: the value travels with the asset (`VC-EXIT-027`). An acquirer's
architect (`VC-EXIT-007`) opens one Skill and reads: who wrote it, what the judge found wrong, what
the platform proposed, what John accepted, what it cost, and whether the score moved. That is
`VC-EXIT-020` ("skill/RAG edits changing agent behavior visibly, before/after") as rows, and
`VC-THESIS-016` / `VC-INVAR-025` ("corrections compound into training") as a mechanism instead of a
sentence. `VC-EXIT-011` says the self-building platform is the headline investor artifact; today it
builds code and never trains a Skill.

The honest risks. Survivor 2 has two shipped neighbours thirteen days old (Salesforce Agent
Optimizer, announced 2026-09-11; LangSmith's optimizer agent) and a published method (GEPA, ICLR
2026). Read as "auto-improve the prompt" it is pattern 149, a standard skill. What no neighbour has,
and what `AGT-74`'s adversarial pass recorded them lacking, is a revision to a **Skill row shared by
every agent that carries it**, with the judge's evidence as provenance, a before-image, a reversal
window John already uses for code, and a priced training-session row. The differentiated part is the
data model (`VC-MAP-025`), not the drafting call. Survivor 1 could be read as a legal expectation
(pattern 137): no customer asks for it, an acquirer prices on it, and its function is proving the
asset is ownable, which is this class's function under `VC-EXIT-009`. Usage leg: the judge has not
run on a real visitor's run, so survivor 2's input is three cards today. That is a Heal-lane fact
recorded on 2026-09-21 and again below, not a reason to build something else; the 905 traces in 30
days are the demand the judge is not meeting.

## What the market says (live, dated)

- **The neighbour shipped this month.** *Digest, 2026-09-24:* Salesforce announced Agent Optimizer on
  2026-09-11 (GA targeted October 2026): it "can spot a problem, suggest how to change the agent, and
  help test that change before it goes live," carrying an observed issue into diagnosis, a proposed
  plan, configuration changes, tests and a rollout decision.
  ([salesforce.com/news/stories/toward-self-improving-agents](https://www.salesforce.com/news/stories/toward-self-improving-agents/);
  [crmhacker.com Dreamforce 2026 recap](https://www.crmhacker.com/content/dreamforce-2026-agentforce-keynote-recap))
- **LangSmith rewrites system prompts from eval results.** *Digest, read 2026-09-24, repo undated:*
  `langsmith-prompt-opt`'s optimizer agent pulls baseline experiment results, analyses failure
  patterns per metric, keeps only generalisable changes, and rewrites the prompt; one rewrite improved
  performance ~50% on average. ([github.com/langchain-samples/langsmith-prompt-opt](https://github.com/langchain-samples/langsmith-prompt-opt))
- **The method has a published name.** GEPA, "Reflective Prompt Evolution Can Outperform
  Reinforcement Learning" (arXiv 2507.19457, accepted ICLR 2026 oral): the evaluator returns
  natural-language feedback on what went wrong and the optimizer evolves the prompt from it, beating
  GRPO by ~10% with up to 35x fewer rollouts. Decagon published a production recipe for it on
  2026-03-25. ([arxiv.org/abs/2507.19457](https://arxiv.org/abs/2507.19457);
  [decagon.ai, 2026-03-25](https://decagon.ai/blog/optimizing-gepa-for-production)) The judge's
  `evidence` column is exactly the feedback this method consumes; survivor 2 uses the real term.
- **Approval of prompt changes is now a named control.** *Digest, 2026-09-24:* COSO, "Achieving
  Effective Internal Control Over Generative AI" (released 2026-02-23): "separate the ability to
  configure AI settings from the authority to approve or review outputs" and "require documented
  approvals and evidence for changes to prompts, thresholds, and retrieval corpuses."
  ([journalofaccountancy.com, Feb 2026](https://www.journalofaccountancy.com/news/2026/feb/coso-creates-audit-ready-guidance-for-governing-generative-ai/);
  [dart.deloitte.com, 2026-04-03](https://dart.deloitte.com/USDART/home/publications/deloitte/heads-up/2026/coso-internal-controls-generative-ai))
  Survivor 2's shape (platform configures, John approves, evidence attached) is that control.
- **Public buyers want routing rationale and human oversight in the record.** *Digest, 2026-09-24:*
  GSA's proposed GSAR 552.239-7001 "Basic Safeguarding of Artificial Intelligence Systems" (draft
  2026-03-06; listening sessions and comments, Federal Register 2026-06-17) requires "a means for the
  government to implement human oversight, intervention, and traceability" and audit trails of
  intermediate steps, model routing logic and data retrieval methods.
  ([federalregister.gov, 2026-06-17](https://www.federalregister.gov/documents/2026/06/17/2026-12205/general-services-acquisition-regulation-acquisition-of-information-and-communication-technology);
  [hklaw.com, 2026-03](https://www.hklaw.com/en/insights/publications/2026/03/gsas-proposed-ai-clause-a-deep-dive);
  [bdo.com](https://www.bdo.com/insights/industries/government-contracting/proposed-gsar-552-239-7001-basic-safeguarding-of-artificial-intelligence-systems))
  Still a proposal, unchanged since the 2026-09-11 pass.
- **Ownership of AI-assisted text rests on documented human contribution.** US Copyright Office,
  "Copyright and Artificial Intelligence, Part 2: Copyrightability" (2025-01-29): human authorship is
  required, prompts alone do not qualify, human contribution is judged case by case.
  ([copyright.gov/ai](https://copyright.gov/ai/);
  [mintz.com, 2025-02-07](https://www.mintz.com/insights-center/viewpoints/54731/2025-02-07-us-copyright-office-publishes-second-part-report-ai))
  A Skill corpus with no recorded author cannot answer the first IP-diligence question.
- **The open skill standard already carries author and version.** *Digest, read 2026-09-24:* the
  Agent Skills specification's `metadata` mapping commonly carries `author` and `version`
  ([agentskills.io/specification](https://agentskills.io/specification);
  [github.com/agentskills/agentskills](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx)).
  `skill_profiles` carries neither.
- **Model dependency is a diligence category that kills deals.** *Digest, 2026:* 2026 buyer frameworks
  treat "which models the product depends on" and vendor lock-in as a distinct diligence bucket, and
  report strategic buyers walking away over AI-related concerns.
  ([blog.promise.legal, 2026](https://blog.promise.legal/ma-due-diligence-ai-products-checklist/);
  [feinternational.com, 2026](https://www.feinternational.com/blog/ai-ma-trend);
  [developmentcorporate.com](https://developmentcorporate.com/corporate-development/ai-vendor-concentration-risk-the-diligence-gap-openai-just-exposed/))
  Grounds runner-up 4, which is gated, not the survivors.
- **Enterprise procurement asks for system cards.** *Digest, 2026:* procurement teams now request
  system cards as diligence evidence and add AI transparency questionnaires to vendor review.
  ([aibuzz.blog](https://aibuzz.blog/ai-system-cards-explained/);
  [techaheadcorp.com](https://www.techaheadcorp.com/blog/ai-model-cards-data-provenance/))
- **The named acquirer is unchanged.** *Digest, 2026-09-24:* SOVRA's most recent AI announcement is
  the 2026-08-03 CTO and board appointments "to accelerate next generation of AI-powered public
  procurement"; no September 2026 announcement found.
  ([prnewswire.com, 2026-08-03](https://www.prnewswire.com/news-releases/sovra-strengthens-leadership-team-to-accelerate-next-generation-of-ai-powered-public-procurement-302840609.html))
  `VC-EXIT-005` and `VC-EXIT-028` stay live.

## What the job postings name

Not run for this lens. The postings leg is the P1 instrument (`VC-ROOT-001`, pattern 149); P3 is
tested against buyers, acquirers and diligence, which the market leg covers. Recorded as an
omission, not padded.

## Vision-corpus grounding cited on the rows

- `VC-ROOT-003` (root), `VC-SYN-001` (the reviewer confirms a claim from the product; "that an
  improvement was data and not code").
- `VC-EXIT-008` (the locked pitch's feedback-loop clause), `VC-EXIT-020` (before/after from training
  data, demonstrable live), `VC-EXIT-009` / `VC-EXIT-010` (the DEEP is the asset; ownable and
  separately sellable), `VC-EXIT-011` (self-building platform as investor artifact), `VC-EXIT-022`
  (governance and reversibility convert experiment to operable asset), `VC-EXIT-027` (value travels
  with the asset, not John).
- `VC-THESIS-016`, `VC-INVAR-025` (corrections compound into training), `VC-INVAR-018` (stateable
  provenance: hardcoded or agent-authored, and by whom), `VC-INVAR-014` (attribution from what the
  call did), `VC-INVAR-015` (honest absence, never a fabricated value), `VC-INVAR-024` (improving an
  agent is a content operation in Supabase), `VC-INVAR-031` / `VC-INVAR-032` (nothing without John;
  every autonomous change reversible by one action, before-image or no write).
- `VC-THESIS-021` tiebreaker: a procurement director sees a mistake corrected on the record under
  human sign-off (the GSAR and COSO shape); a VP of Product sees the governed self-improvement loop the
  market is shipping this month, built as data with a reversal window.
- Rejected paths checked: `VC-REJECTED-003` (fix lives in Skill content, not the harness: aligned),
  `VC-REJECTED-007` (no model call where a deterministic value serves: the origin stamp is
  deterministic, the draft is judgment), `VC-REJECTED-008` (two failed wording attempts, then
  structural: built in as the stop rule), `VC-REJECTED-016` (declared config is not evidence: the
  proposal cites judge rows, not a declared score), `VC-REJECTED-017` (no fabricated zeros:
  "authorship unrecorded" renders as absence), `VC-REJECTED-046` (no test mutates working data: the
  proposal row is not a Skill row until John accepts), `VC-REJECTED-048` (real industry term: GEPA /
  reflective prompt evolution, LLM-as-judge).
- Patterns 137 and 149 (`docs/JOHN-DECISION-PATTERNS.md`) applied to every runner-up below.

## The runners-up and why they ranked lower

1. **Deliverable verdict on the record** (`VC-EXIT-008`, `VC-INVAR-007`): the asker approves or
   sends back a deliverable, the send-back routes to the producing agent, and the verdict writes the
   training-session row. The measured zero (0 of 9,903 deliverables ever approved) is the strongest
   single fact of the pass, but the surface is already four open rows from the original backlog
   (`DL-03` P4, `DL-06` P5, `AI-24` P5, `MC-07` P4). Re-classing them is not invention; the zero is
   recorded here so whoever builds them cites it.
2. **Every training operation priced** (`VC-EXIT-025`, `VC-EXIT-020`): a writer for the empty
   `agent_training_sessions` table on every Skill change and Library ingestion, with cost and
   re-judged delta. Folded into survivor 2, which writes the first row; standalone it is the
   "training vs release ratio" tile killed 2026-09-21 (`VC-EXIT-026`).
3. **Judge on every real-visitor run**: `LOG-143` is done, yet 0 of 3 judge runs came from a real
   visitor while 905 traces landed in 30 days. Not an invention; a Heal-lane fact, recorded on
   2026-09-21 and unchanged. It is the precondition for survivor 2's usage signal.
4. **Second-vendor run on the record** (`VC-MAP-023`, `VC-EXIT-017`): one Skill re-run on a
   non-Anthropic model with both judged, proving the DEEP is data, not vendor. The market leg is the
   strongest new one this pass (model dependency as a deal-killer), and `skill_profiles.llm_provider`
   is already honoured by `api/prompt/db-assembly.js`; killed because `ARCHITECTURE.md` §4 locks
   per-agent LLM/BYOK behind `S-INFRA-01` ("do not build before that session") and no chat adapter for
   a second vendor exists (only embeddings). Worth a line to John: `S-INFRA-01` has P3 payoff.
5. **Killed before the shortlist,** for reasons already recorded in this lane: Personnel File
   measured from the ledger (returned 2026-09-20 and 2026-09-21; a third return is a re-run, and its
   figures are unchanged: 46 of 137 Skills ever exercised, 24 in 30 days); Ledger reconciled to the
   provider's bill (refused at filing twice); Cost per deliverable (held by the 2026-09-11 rung-0
   decision until `SES-369`); GSAR run dossier (four kills: overlaps Moat Feature 1 and `LOG-144`,
   pattern 137 until the trail ships); Ask the Auditor (pattern 149); hash-chained ledger (137);
   per-Agent spend governor (137, six passes); paying-customer record (no payer); DEEP asset snapshot
   export (one `select` over views that do not exist yet).

## How it reaches the build queue

Measured 2026-09-24, not assumed: `SES-369` (open) records that `file_invention_proposal()` raises
on every pass while `invention_requires_epic` is true, and `SES-430` (open, filed 2026-09-20) that
`invention_due()` says `due=true` before checking it. The `runner_decisions` directive of 2026-09-14
defers `SES-369` "while John's invention pause stands." So these two proposals will be refused at
filing unless that pause has lifted; this document is the record either way, and the payloads are
complete. Survivor 1 precedes survivor 2 (the origin stamp is what marks a model-authored revision).
Survivor 2 depends on `SES-363` (versions) only for `skill_delta`, not for the proposal row, and on
`AGT-74` for the re-judge; both are open John-named rows. Both survivors sit inside
`AGENT-ROW-AGREED-TICKET`: the proposal row is not an agent row, and the Accept that applies it is
John's, with the before-image the rule requires.

## Usage signal that proves it

- Survivor 1: `skill_profiles` rows with a recorded origin over total, and the share of content
  changes carrying an actor stamp, read from the table; today 0 of 137, with 20 rows written in the
  last three days that no one can attribute.
- Survivor 2: revision proposals per Report Card that names a Skill; Accept / Reverse counts;
  `agent_training_sessions` rows with a non-null `skill_delta`; and, once the judge runs on real
  visitors' traces, proposals whose cited card carries a real `visitor_id`. Each drafting call is an
  `ai_activity_log` row with `call_source` and the judged run's `visitor_id`, so the measure needs no
  new telemetry. Today the denominator is 3 cards, 0 from real visitors; that number is the Heal
  item, not this feature's failure.

---

<!-- SECOND PASS, SAME DAY, SAME LENS. The Researcher, capability research-class-lens, model
     claude-opus-5, run 2026-09-24 under session/cycle-20260924-1541. Allowed: 2. Survivors
     returned: 0. Appended rather than overwritten: the section above is the 00:41 cycle's record
     of this same lens and destroying it would lose the payloads it carries. Leg 1 ran on live
     WebSearch (egress ok, two queries, real results); WebFetch was refused by the egress proxy
     (www.papermark.com, EGRESS_BLOCKED), so every market finding below is a search digest and is
     marked *Digest*. Leg 2 ran read-only against Supabase the same day. Nothing was written to any
     table. -->

## Second pass, `cycle-20260924-1541`: zero survivors, and the measurement that says why

**Root claim:** `VC-ROOT-003`. **Class reading:** `VC-SYN-001`. **Allowed:** 2.
**Survivors returned: 0.** Not for want of candidates — for a reason I measured rather than assumed.

### The pitch

I ran both legs and then asked the question this lane has stopped asking: what happens to a P3
proposal after the Researcher returns it. Measured fresh today, against the rows:

- `public.backlog_items` holds **exactly one** row with `scope_origin = 'enhancement'` in its entire
  history — `LOG-143`, filed 2026-08-23, class P1, status done. **Zero** enhancement rows have been
  filed in the last 21 days, and **zero ever** in `P3 - Investor Value`.
- `docs/research/` holds **seven** P3 invention passes since 2026-09-09 (09-09, 09-11, 09-11-pass2,
  09-19, 09-20, 09-21, 09-24), returning roughly a dozen survivors between them. None became a row.
- `public.invention_due()` returns `(t, 2, "rung 2: 0 of 2 used today (America/Chicago)")` — the pass
  is due and may file two.
- `public.runner_settings.invention_requires_epic` is **true**, and
  `select count(*) from public.runner_directives where type='drain-epic' and status='queued'` is
  **0**. Read against `pg_get_functiondef('file_invention_proposal')`, that combination reaches
  `raise exception 'file_invention_proposal: invention_requires_epic is true and no drain-epic
  directive is queued'` before any payload is examined. **Anything I return today is refused at
  filing, by construction, whatever it says.**
- `SES-369` (open, filed 2026-09-11) is that fact as a ticket: "The invention lane is shut:
  invention_requires_epic is true…". `SES-430` (open, filed 2026-09-20) is the companion:
  `invention_due()` says due before checking the flag, so a full Researcher pass runs and is refused.
- `public.vision_claims` for this class: **61 proposed, 7 rejected, 0 ratified.** Not one P3 claim has
  ever been ratified. The class's own learning rows say why, and they say it ten times
  (`VC-LRN-001`, `-002`, `-005`, `-007`, `-013`, `-014`, `-015`, `-019`, `-020`, `-021`): the
  admission rule is unresolved pending a ruling from you that has not happened.

So the P3 lane's bottleneck is not proposal supply. Supply is running at roughly two proposals a day
into a closed valve, against a claim store where nothing has ever been ratified. A thirteenth and
fourteenth proposal today does not move the class; it adds two more records that cannot be filed and
cannot be ruled on.

That alone would not justify a zero — my job is evidence, not process. What makes the zero honest is
that **every candidate the evidence supports today is already an open, unfiled proposal of this same
lane, and the two strongest were returned seven hours ago in the section above, on this same lens,
from the same measurements.** I re-measured them (137 Skills, 20 written in three days, newest
2026-09-23; 9,903 deliverables, 0 ever out of `draft`, 78 in 30 days; `agent_training_sessions` 0
rows; 3 judge runs all-time, 0 from a real visitor, 0 in 7 days; 936 traces in 30 days) and the
numbers are identical to the 00:41 pass. Returning them again is a re-run wearing an invention
costume, which is the thing this lane is supposed to kill, not produce.

And on one of them the market moved *against* the proposal since this morning — see finding 4 below.

### What the market says (live, dated)

Egress: WebSearch live and returning results (two queries this run). WebFetch refused by the proxy,
so each item is a search digest carrying the date the digest or URL states.

1. **Training-data provenance is the first thing a 2026 buyer checks, and a manifest is not enough.**
   *Digest, read 2026-09-24:* a standard AI review runs nine domains (model provenance and IP,
   training data, contract data rights, architecture, inference economics, compute commitments,
   evaluation evidence, governance, key-person risk); post-LOI adds a training-data provenance audit;
   and "the reconciliation that matters is between the manifest and the training run logs showing what
   was actually loaded."
   ([papermark.com/blog/ai-due-diligence](https://www.papermark.com/blog/ai-due-diligence);
   [valutico.com 2026 buyer's framework](https://valutico.com/ai-vulnerability-in-ma-due-diligence-a-2026-buyers-framework/))
   This is the strongest market fact of the pass and it grounds runners-up 1 and 2 — both already open.
2. **Provenance of generated training material is a named deal-asset question.** Mayer Brown,
   "Synthetic Data as a Deal Asset: Ownership, Provenance, and Diligence Considerations in AI
   Acquisitions," 2026-07.
   ([mayerbrown.com](https://www.mayerbrown.com/en/insights/publications/2026/07/synthetic-data-as-a-deal-asset-ownership-provenance-and-diligence-considerations-in-ai-acquisitions))
   A Skill corpus whose rows carry no author and no origin is the shape this paper says gets
   discounted.
3. **Unprovenanced training data is priced as transferred liability.** *Digest, 2026:* an acquirer
   that cannot trace where the target's training data came from assumes a liability that travels with
   the model; the diligence step now has the highest generative-AI usage of any M&A workflow (58%),
   so inconsistencies surface in week one.
   ([developmentcorporate.com](https://developmentcorporate.com/corporate-development/ai-training-data-due-diligence-the-identity-liability-hiding-in-your-next-acquisition/);
   [blog.pebblous.ai](https://blog.pebblous.ai/blog/ai-acquisition-hidden-data-debt/en/))
4. **The governed self-improvement loop became a published checklist this month — it is no longer
   white space.** *Digest, read 2026-09-24:* Salesforce's Agent Optimizer ships an "autonomy dial"
   that can "require sign-off at every step," investigating, suggesting fixes, building, testing and
   staging changes, stopping at review points you choose; Arize's prompt optimization generates an
   improved prompt from eval feedback, versions it in a Prompt Hub and promotes it in a few clicks;
   and a 2026 pre-deployment checklist now enumerates the governance shape itself — "frozen baseline,
   bounded drift, hidden-objective check, human sign-off where it counts, instant rollback, live-action
   guardrails."
   ([salesforce.com/blog/agent-optimizer](https://www.salesforce.com/blog/agent-optimizer/);
   [salesforce.com/news/stories/toward-self-improving-agents](https://www.salesforce.com/news/stories/toward-self-improving-agents/);
   [pydantic.dev, 2026](https://pydantic.dev/articles/best-ai-agent-optimization-platforms-2026);
   [futureagi.com, 2026](https://futureagi.com/blog/self-improving-ai-agents-pre-deployment-checklist-2026/))
   This is the finding that changed between 00:41 and now. The 00:41 pass admitted "the platform
   drafts the Skill fix" by arguing its governance wrapper — judge evidence as provenance,
   before-image, reversal window, human Accept — is what the neighbours lack. As of this morning's
   reading that wrapper is a *published checklist item* with two shipped implementations of the
   versioned-proposal-then-promote flow. Under pattern 149 that is a standard skill, and under
   `VC-EXIT-026` the remaining delta (a Skill row shared across agents rather than one agent's prompt)
   is a schema detail, not a mechanism a reviewer would call new. It does not clear the bar today.

### What the job postings name

Not run. The postings leg is the P1 instrument (`VC-ROOT-001`, pattern 149); P3 is tested against
buyers, acquirers and diligence, which the market leg covers. Recorded as an omission, not padded.

### Vision-corpus grounding cited on the row

- `VC-ROOT-003` (root); `VC-SYN-001` (a skeptical technical reviewer confirms a claim from the product
  itself) — the reading every candidate below was scored against.
- `VC-LRN-014`: P3's only operative classifier is a negative one, and every survivor so far was
  admitted by arguing it was *not disqualified*. Both of today's re-run candidates are admitted that
  way again, which is the pattern this claim flags, not a new argument.
- `VC-LRN-007`, `VC-LRN-001`, `VC-LRN-013`, `VC-LRN-021`: the class cannot be classified confidently
  until you rule once — on what "investor-ready" means, on the exit shape, and on which of the three
  named assets P3 ranks against. 61 proposed, 0 ratified, measured today.
- `VC-LRN-020`: P3 still has no boundary rule against P4.
- `VC-EXIT-026` (a dashboard without new mechanism does not pass) and patterns 137 / 149
  (`docs/JOHN-DECISION-PATTERNS.md`) — applied to every shortlist row below, and finding 4 is what
  moved candidate 2 across the 149 line.
- `VC-EXIT-009` / `VC-EXIT-010` (the DEEP is the asset), `VC-EXIT-027` (value travels with the asset),
  `VC-INVAR-014` / `VC-INVAR-018` (attribution and stateable provenance) — the grounds the two
  re-run candidates rest on, unchanged and still sound; they are open proposals, not new ones.
- Rejected paths checked, none re-proposed: `VC-REJECTED-016` (declared config is not evidence),
  `VC-REJECTED-017` (no fabricated zeros), `VC-REJECTED-008` (after two instruction-level attempts, go
  structural).

### The shortlist, and why each ranked below the bar

1. **Skill authorship on the record** (`skill_profiles.origin` + actor stamp). Evidence is the
   strongest in the pass (findings 1–3; `VC-EXIT-009`, `VC-INVAR-018`; 137 rows, 20 written in three
   days, no author column). Ranked out as a **fourth return**: proposed 2026-09-21, returned again at
   00:41 today, payload complete and unchanged in the section above. Nothing about it has changed in
   seven hours except that it still cannot be filed.
2. **Personnel File / DEEP measured from the ledger** (`agent_skill_exercise`, `deep_exercise` over
   `assembled_skill_slugs`). Finding 1's "manifest versus what was actually loaded" is a better
   market argument for it than either prior pass had. Ranked out as a **third return** (2026-09-20,
   2026-09-21), same unfiled state; and `SES-363` (open, P10) already owns the versioning half.
3. **The platform drafts the Skill fix** (revision-proposal rows from judge evidence). Ranked out on
   two independent grounds. Market: finding 4 — the governed draft-review-promote loop is now a
   published checklist with shipped neighbours, so it reads as pattern 149. Platform: `AGT-74` (open,
   **already classed P3**, filed 2026-09-11) is "Skill edit with a before-and-after across every agent
   that shares it," which is this candidate's core; and the usage leg cannot feed it — 3 judge cards
   all-time, 0 from a real visitor, 0 in 7 days, against 936 traces in 30 days. Proposing a consumer
   for a producer that has never run for a real visitor is building on a Heal-lane defect.
4. **Deliverable verdict on the record** (approval routes back to the producing agent and writes the
   training row). Carries the pass's single most damning number: **0 of 9,903 deliverables has ever
   left `draft`** — the locked pitch's feedback-loop clause (`VC-EXIT-008`) has never fired once.
   Ranked out because four existing backlog rows already cover the surface (`DL-03`, `DL-06`, `AI-24`,
   `MC-07`). Re-classing open rows is a Prioritizer act, not invention. The zero is recorded here so
   whoever builds them cites it.
5. **Ledger reconciled to the provider's bill.** Still grounded (1,033 model rows in 30 days carry no
   `cost_usd`). Ranked out: returned 2026-09-19, refused at filing twice, and gated on an Admin API
   key whose availability is unresolved.

### How it reaches the build queue

It does not, and that is the finding. Verified this run, not recalled: `invention_requires_epic = true`
with zero queued `drain-epic` directives makes `file_invention_proposal()` raise before it reads a
payload; `invention_due()` reports `due` anyway (`SES-430`); `SES-369` has tracked the shut lane since
2026-09-11 and is still open. **The two rows that would unblock this class are `SES-369` and
`SES-430`, and neither is a P3 invention — they are open P10 tooling rows that only the Execute lane
can clear.** The second unblock is a ruling, not a ticket: one tap from you on any P3 claim would give
the class its first ratified row and turn `VC-LRN-014`'s negative classifier into a positive one.
Until one of those two things happens, this lane should be measured by ratifications, not by
proposals filed.

### The usage signal that proves it

For a zero, the signal is the lane's own throughput, and it is already instrumented:
`select count(*) from backlog_items where scope_origin = 'enhancement'` (1 all-time, 0 in 21 days,
0 ever in P3) against the seven pass documents in `docs/research/`; and
`select status, count(*) from vision_claims where judgment_class = 'P3 - Investor Value' group by 1`
(61 proposed, 7 rejected, 0 ratified). Both are one query, need no new telemetry, and both should
move off zero before this lens is run again.
