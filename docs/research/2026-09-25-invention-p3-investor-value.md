<!-- DeepBench | docs/research/2026-09-25-invention-p3-investor-value.md | Invention pass, lens P3 -
     Investor Value, cycle 9f616773-8219-40b9-b99a-56643b8a9acc, run 2026-09-25 by The Researcher
     (judgment lane, claude-fable-5-1) on branch session/cycle-20260925-1541. Read-only against the
     clone and Supabase; nothing filed from here — file_invention_proposal() is the only writer. -->

# 2026-09-25 Invention Pass, Lens P3 - Investor Value: research leg

**Lens:** P3 - Investor Value, chosen by the census rule (0 ratified / 61 proposed / 7 rejected, 68
total; newest root claim `VC-SYN-001`). **Allowed:** 2 (`invention_due()` read live 2026-09-25:
`due=true, allowed=2, "rung 2: 0 of 2 used today"`). **Survivors returned:** 2.

**Egress:** live WebSearch worked on all 10 queries. WebFetch opened one page — the provider's own
model-deprecations page (platform.claude.com, fetched 2026-09-25) — and was proxy-blocked on 12
(akfpartners.com, tianpan.co, hklaw.com, salesforce.com, dev.to, arxiv.org, dlapiper.com,
360magazine.com, github.blog, docs.cloud.google.com, endoflife.date). A finding marked *digest* rests
on the dated search result, not the page.

**Prior runs on this lens, read before shortlisting:** 2026-09-09 (Training Delta, now `AGT-74`),
2026-09-11 (Cost per deliverable, held pending `SES-369`), 2026-09-11 pass 2 and 2026-09-19 (Ledger
reconciled to the provider's bill, refused at filing twice), 2026-09-20 (Personnel File measured from
the ledger), 2026-09-21 and 2026-09-24 (Skill authorship on the record; the platform drafts the Skill
fix). Nothing from 2026-09-11 onward reached `backlog_items`: the only `scope_origin = 'enhancement'`
row is `LOG-143` (done), and `SES-369` ("the invention lane is shut: `invention_requires_epic` is
true") is still open — `runner_settings.invention_requires_epic = true` read live today.

## The pitch

The locked pitch (`VC-EXIT-008`) sells one mechanism: improving an agent is a training operation,
not a software release. There is exactly one event every agent product on the market must survive as
a software release, and it arrives on the provider's calendar, not the vendor's: the model a Skill
runs on is retired. I measured DeepBench's exposure to that event against the provider's own page.

- `skill_profiles` holds **153** rows (up 16 since 2026-09-24, 36 since 2026-09-21). Every row pins a
  model: **48** `claude-haiku-4-5-20251001`, 54 `claude-fable-5-1`, 30 `claude-opus-5`, 21
  `claude-sonnet-4-6`; all `llm_provider = anthropic`, `api_key_source = platform`. The pin is
  honoured: `api/prompt/db-assembly.js:295-300` and `:385-390` put `sp.llm_model` on the call, and
  the fallback `DEFAULT_LLM` (line 72) is `claude-sonnet-4-6`.
- The provider's deprecations page (fetched 2026-09-25) lists `claude-haiku-4-5-20251001` as Active
  with a tentative retirement of **"Not sooner than October 15, 2026"** — twenty days from today —
  under a policy of at least 60 days' notice. `claude-sonnet-4-6` is "not sooner than February 17,
  2027", `claude-opus-5` July 24, 2027, `claude-fable-5-1` September 1, 2027. Six models were
  retired between January and August 2026.
- The 48 Haiku-pinned Skills reach **14 of the 26 agents** that hold a capability assignment
  (`capability_skill_profiles` 269 rows → `agent_capability_assignments`), and **16 of the 48 were
  assembled into a logged call in the last 30 days** (`ai_activity_log.call_facts.assembled_skill_slugs`,
  1,089 model rows). The most-exercised Skill on the platform in that window, Michelle's
  `agent-selection-intent` (20 calls) — the brokered routing the pitch's first clause names
  (`VC-THESIS-003`, `VC-THESIS-014`) — is Haiku-pinned, as are `ci-answer-intent` (17, Marcus's
  CHI answer) and `ws-news-search-intent` (17).
- A second, quieter exposure on the same page: `temperature`, `top_p`, `top_k` "return a 400 error
  when set to a non-default value on Claude 4.7 and later models." **45 Skills declare a
  `temperature`** (30 of them Opus-5-pinned); `api/prompt/request-receivable.js:292-298` (`SES-334`)
  silently drops the field for models that reject it. So 45 Skill rows declare a setting that never
  reaches the model — a declared configuration that is not evidence of behavior (`VC-REJECTED-016`,
  `VC-INVAR-014`), and nothing on any Skill card says so.
- Nothing on the platform reads the provider's lifecycle: no table, view or capability mentions
  deprecation or retirement (grep of `api/` and `src/`, 2026-09-25); the ledger has **0 rows on any
  retired model** across 46,863 rows, so the platform has never been bitten, and cannot say when it
  will be.

Two survivors, one asset, in build order:

1. **Model retirement as a training operation.** One Capability, run through the generic executor
   (`ARCHITECTURE.md` §19b) on a weekly schedule, reads the provider's deprecations page and writes
   `provider_model_lifecycle` rows (provider, model id, state, deprecated on, tentative retirement,
   recommended replacement, source URL, checked at, the reading call's `ai_activity_log` id) — a
   model reads the page, so a model the page does not list reads "lifecycle unknown"
   (`VC-INVAR-015`), never a guessed date. One `security_invoker` view, `skill_model_exposure`: per
   Skill, the pinned model (or the executor default, named as such), its lifecycle row, the agents
   carrying it, last exercised (from `assembled_skill_slugs`), and whether a declared parameter is
   dropped at call time. One line on the Personnel File's Skill card ("runs on claude-haiku-4-5;
   retirement window opens 2026-10-15; shared by 48 Skills, 14 agents") and one count on the Agent
   Roster header. Then the mechanism the class exists to reward: when a lifecycle row turns
   Deprecated, a drafting call reads the provider's migration guide and the affected Skill texts and
   writes a §12 card proposing the `llm_model` change for that Skill set; John's Accept applies it
   to `skill_profiles` under one decision with `runner_before_images` rows (the `reverse_decision()`
   allowlist already covers `skill_profiles`, `SES-364` delivered), writes the first-ever
   `agent_training_sessions` rows (cost = the drafting call, `skill_delta` filled when `AGT-74`
   re-judges), and is reversible inside the 72-hour window. Three cycles.

2. **The pitch's "only" on the record.** The locked pitch says DeepBench is "the only AI workforce
   platform where improving agent quality is a training operation, not a software release"
   (`VC-EXIT-008`, `VC-THESIS-002`). `VC-LRN-008` records that the word has never been checked
   against the market, and thesis open question 1 asks John whether he wants a standing check. The
   product already flinches: `src/components/AboutPanel.jsx:191` renders the pitch as "An AI
   workforce platform…", without "only", and has since at least 2026-08-07. The check is now
   overdue on evidence: Salesforce announced Agent Optimizer on 2026-09-11 (GA October 2026) — it
   observes production sessions, surfaces friction in an agent's instructions and workflows, and
   recommends the change inside the same workflow — and LangSmith rewrites system prompts from eval
   results (both found 2026-09-24 and confirmed today). The proposal: a `pitch_claim_checks` table
   (clause, competitor, what it ships, source URL, dated, verdict holds / narrowed / broken, the
   checking call's `ai_activity_log` id), written quarterly and on demand by one Capability through
   the executor that runs a live search per clause; the About panel's pitch block gains one line —
   "checked <date> against <n> named products: holds / narrowed" — and the word "only" returns to
   the screen only when the newest row says holds. The first row is already known and honest:
   the "training operation" clause reads *narrowed* — neighbours now recommend instruction changes
   from traces; what no neighbour ships is a revision to one Skill row shared by every agent that
   carries it, with attribution in the data model (`VC-MAP-025`, `AGT-74`'s adversarial table).
   Two cycles.

Why these are P3 and not P1, P5 or P10: the value travels with the asset (`VC-EXIT-027`). An
acquirer's architect (`VC-EXIT-007`) asks two questions of any product built on a third-party model
— what dies when the provider retires a model, and is the "only" in your pitch true — and today the
platform answers neither from rows. After survivor 1 the answer to the first is a view over the
provider's own page and a migration that is literally a training operation with a before-image, a
cost and a re-judged delta (`VC-EXIT-020`, `VC-INVAR-024`, `VC-EXIT-022`); after survivor 2 the
answer to the second is a dated row with a named competitor, which is what a diligence reviewer
tests first (`VC-LRN-008`, `VC-SYN-001`).

The honest risks. Survivor 1 read as a "provider dependency matrix" is an administrative expectation
(pattern 137; AKF Partners' 2026 diligence checklist asks for exactly that matrix), and "run evals
against the n+1 model" is a standard 2026 skill (pattern 149). What survives both patterns is the
second half: a model swap that is 48 row updates under one reversible decision, priced and
re-judged, rather than a release — every framework peer (`VC-MAP-003`) and every suite-attached
platform (`VC-MAP-006`) ships a release or hides the model entirely. Survivor 2 read as competitive
intel is pattern 149 too; the differentiator is thin and I say so — it is a claim register with
dated evidence attached to the investor pitch, the same shape as `LOG-143` (the platform grades its
own answers) applied to the platform's own sentence. Its usage leg is structurally absent (nobody
reads a claim check by clicking), the same admission the 2026-09-21 and 2026-09-24 survivors carried.
If John wants only one, survivor 1 is the one: it has all three legs.

## What the market says (live, dated)

- **The provider's own calendar, primary source.** Anthropic's model-deprecations page (fetched
  2026-09-25): "Anthropic notifies customers with active deployments for models with upcoming
  retirements, providing at least 60 days' notice"; `claude-haiku-4-5-20251001` Active, tentative
  retirement "Not sooner than October 15, 2026"; `claude-sonnet-4-6` "Not sooner than February 17,
  2027"; `claude-opus-5` July 24, 2027; `claude-fable-5-1` September 1, 2027. Retired in 2026:
  Opus 3 (Jan 5), Haiku 3.5 and Sonnet 3.7 (Feb 19), Haiku 3 (Apr 20), Sonnet 4 and Opus 4 (Jun 15),
  Opus 4.1 (Aug 5). `temperature`/`top_p`/`top_k` "return a 400 error when set to a non-default
  value on Claude 4.7 and later models." Recommended audit: export usage by API key and model.
  ([platform.claude.com/docs/en/about-claude/model-deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations))
- **Providers retire on a 6-12 month cadence and failures are silent.** *Digest, 2026-09-25 (page
  blocked):* "In 2026 alone, OpenAI deprecated GPT-4, Anthropic deprecated Claude 4 Opus and Sonnet,
  and Google deprecated Gemini 2.0 Flash"; xAI retired 8 Grok API models on 2026-05-15 with 9 days'
  notice and silent redirects; "responses change shape… JSON fields disappear, and tool calls fire in
  a different order." ([dev.to/modeldeprecation](https://dev.to/modeldeprecation/llm-providers-are-retiring-models-faster-than-you-can-migrate-4pj3))
- **The deprecation treadmill is a named 2026 discipline.** *Digest, 2026-04-27 (page blocked):*
  the recommended practice is an eval suite running "not just against its current pinned model, but
  against the n+1 candidate continuously"; the deepest pain is discovering "on day 28 of a 60-day
  sunset window, that the replacement model fails 12% of the eval cases."
  ([tianpan.co](https://tianpan.co/blog/2026-04-27-model-deprecation-treadmill-pre-sunset-discipline))
- **Diligence asks for the dependency matrix and the migration plan by name.** *Digest, 2026 (page
  blocked):* AI-deal diligence checks "a comprehensive provider dependency matrix mapping API
  providers, specific model versions… and vendor concentration risks" and "model migration and cost
  contingency plans… if… legacy endpoints face deprecation"; the founder-side test is "which product
  features die if a model provider… deprecates an API… and whether there's a fallback."
  ([akfpartners.com](https://akfpartners.com/growth-blog/technical-due-diligence-for-ai-deals-in-2026/);
  [sublimecoding.com](https://sublimecoding.com/blog/surviving-technical-due-diligence-ai-founder))
- **The public buyer wants model changes announced in advance.** *Digest, 2026-03 (pages blocked):*
  GSA's proposed GSAR 552.239-7001 (draft 2026-03-06) would require "at least 30 calendar days'
  written notice before any planned material change to the AI system, including changes to models,"
  plus "comprehensive concurrent access" to successor models for 30 days (major) or 15 (minor)
  before the old one is discontinued. A vendor cannot give that notice without knowing which of its
  own Skills a retirement touches. ([Crowell & Moring](https://www.crowell.com/en/insights/client-alerts/ai-for-government-7-days-for-contractor-comments-on-gsa-proposed-contract-clause-for-ai-systems);
  [Holland & Knight, 2026-03](https://www.hklaw.com/en/insights/publications/2026/03/gsas-proposed-ai-clause-a-deep-dive))
- **The neighbour that tests the pitch's "only" shipped this month.** *Digest, 2026-09-11 and
  2026-09-16 (pages blocked):* Salesforce Agent Optimizer "observes performance, surfaces friction in
  instructions and workflows, and recommends specific changes teams can act on… analyze session
  traces to identify what to improve," GA targeted October 2026.
  ([salesforce.com/blog/agent-optimizer](https://www.salesforce.com/blog/agent-optimizer/);
  [360magazine, 2026-09-16](https://360magazine.com/2026/09/16/salesforce-plans-to-offer-ai-agent-casey-an-optimizer/))
- **Unsubstantiated capability claims are an enforcement category, including B2B.** *Digest, 2026-08
  and 2026-05 (pages blocked):* Holland & Knight, "Operation AI Comply 2 Years Later": the FTC has
  filed more than a dozen AI-washing cases; DLA Piper (2026-05): the thirteenth such case, in a
  business-to-business context; "a vendor's marketing assertion is not substantiation."
  ([hklaw.com, 2026-08](https://www.hklaw.com/en/insights/publications/2026/08/operation-ai-comply-2-years-later-continued-enforcement);
  [dlapiper.com, 2026-05](https://www.dlapiper.com/en-us/insights/publications/2026/05/ftc-ai-washing-action-underscores-enforcement-in-business-to-business-context))
- **Whitespace check for survivor 1.** Searched 2026-09-25 for any agent platform showing a
  per-agent or per-skill model-retirement exposure: found platform-level retirements only — Bedrock
  Agents Classic frozen to new customers 2026-07-30 with its model catalog frozen
  ([enterprisedna.co](https://enterprisedna.co/resources/news/amazon-bedrock-agents-classic-agentcore-enterprise-july-2026/)),
  selected GitHub Copilot models deprecated 2026-09-01 including agent mode
  ([github.blog changelog](https://github.blog/changelog/2026-08-31-selected-github-copilot-models-deprecated/))
  — and no product surface that tells a buyer which of *their* agents a retirement touches. Absence
  of evidence, so MED.
- **The named acquirer is unchanged.** *Digest, 2026-09-25:* SOVRA's most recent AI announcement is
  still the 2026-08-03 CTO and board appointment, "transparency, accountability, and trust at their
  core"; no September 2026 release found.
  ([prnewswire.com](https://www.prnewswire.com/news-releases/sovra-strengthens-leadership-team-to-accelerate-next-generation-of-ai-powered-public-procurement-302840609.html))

## What the job postings name

This lens is judged by an acquirer's reviewer, not a hiring panel (pattern 149 governs P1), so the
postings leg is context only. *Digest, 2026-05-20:* Anthropic's Forward Deployed Engineer
specification requires "production experience with LLMs including advanced prompt engineering, agent
development, evaluation frameworks, and deployment at scale"; "building evaluation suites that catch…
regressions… before production is a non-negotiable FDE skill in 2026"
([marktechpost.com](https://www.marktechpost.com/2026/05/20/what-is-a-forward-deployed-engineer-the-ai-role-openai-anthropic-and-google-are-hiring-in-2026/)).
No posting naming model migration or deprecation by those words was found in a live search
2026-09-25; the regression-on-model-change skill is the nearest named requirement.

## Vision-corpus grounding cited on the rows

- `VC-ROOT-003`: the class root — features that add investor / buyout value.
- `VC-SYN-001`: a feature adds investor value when it lets the reviewer confirm a claim from the
  product itself; both survivors turn a claim ("training not release"; "only") into rows.
- `VC-EXIT-008`, `VC-THESIS-002`, `VC-INVAR-024`: the locked pitch and its central mechanism —
  survivor 1 makes it literal at the one event that forces a release everywhere else; survivor 2
  checks its first word.
- `VC-EXIT-020`: P3 makes the pitch demonstrable live, "skill/RAG edits changing agent behavior
  visibly, before/after" — the migration card with `skill_delta` is that, per Skill.
- `VC-EXIT-017`, `VC-MAP-023`: strategic buyers price capability gaps and model dependency; single
  primary model vendor is the map's own listed weakness. Survivor 1 does not remove the dependency —
  it makes it stateable and its cost visible.
- `VC-EXIT-022`, `VC-INVAR-032`: reversibility — the migration lands under one decision with
  before-images, via the `SES-364` allowlist.
- `VC-EXIT-023`, `VC-INVAR-014`, `VC-REJECTED-016`: attribution from what the call actually did —
  the exposure view names the declared `temperature` that `SES-334` drops, so no Skill card shows a
  setting the model never received.
- `VC-INVAR-015`, `VC-JDP-022`: honest absence — a model the provider page does not list reads
  "lifecycle unknown", and the About line reads "unchecked" until a row exists.
- `VC-LRN-008`: the "only" has never been checked and John has not said whether he wants it checked;
  thesis open question 1 puts the decision to him. Survivor 2 is that question filed as a row.
- `VC-EXIT-007`, `VC-THESIS-021`: the tiebreaker — a procurement director (GSA 30-day model-change
  notice; FTC substantiation) and a VP of Product (the deprecation treadmill; a pitch that survives
  its own check) both read the same rows.
- `VC-EXIT-028`, `VC-LRN-015`: the domain buyer — the GSA clause is the first time this lane has
  ranked a survivor on a procurement requirement rather than domain-neutral economics.
- `VC-EXIT-026` (anti-P3): applied to every runner-up and to both survivors above — survivor 1's
  card line alone would fail it; the migration mechanism is what passes.
- `VC-EXIT-027`: value travels with the asset, not with John — both are rows an acquirer inherits.

## The runners-up and why they ranked lower

1. **Skill authorship on the record** (`VC-INVAR-018`, `VC-EXIT-009`): 153 rows now, still no
   `origin`, `author`, `updated_at` or `version` column; +16 Skills in one day. Killed only as a
   third return — proposed 2026-09-21 and 2026-09-24, never filed because the lane was shut, not
   because John refused it. It remains the lane's most-evidenced unfiled candidate; if the filing
   step wants it, the 2026-09-24 document carries the complete proposal and today's count.
2. **Declared-vs-sent call parameters** (`VC-REJECTED-016`): 45 Skills declare a `temperature` the
   provider refuses on their pinned model. Folded into survivor 1's exposure view as one column; alone
   it is a Heal-lane fact.
3. **Second-vendor run on the record** (`VC-MAP-023`, `VC-EXIT-017`): still the strongest
   dependency-diligence answer, still locked behind `S-INFRA-01` (per-agent LLM/BYOK, "do not build
   before that session"); no second chat adapter exists. Survivor 1 is the part that does not need
   it — knowing the date and making the swap a training row — and is its precondition.
4. **Killed before the shortlist,** for reasons already recorded in this lane: Ledger reconciled to
   the provider's bill (refused at filing twice); Cost per deliverable (held until `SES-369`; measured
   again: 38 of 1,087 model rows in 30 days carry a cost, 78 deliverables in 30 days all `draft`, 0
   with a `task_id`); Personnel File measured from the ledger (three returns; 24 of 153 Skills
   exercised in 30 days); GSAR run dossier (four kills; the GSA finding is used here for the
   notice-of-model-change clause, not the dossier); Diligence self-score page, hash-chained ledger,
   per-Agent spend governor, paying-customer record (pattern 137 or no payer); Judge on every
   real-visitor run (Heal-lane fact: `report_card_usage` still 3 judge runs all-time, 0 from a real
   visitor, while 177 UI-originated model rows landed in 30 days).

## How it reaches the build queue

`invention_due()` returned `(true, 2, "rung 2: 0 of 2 used today (America/Chicago)")`. The
orchestrating cycle files each survivor through `public.file_invention_proposal(<cycle id>, NULL, p)`
as a `backlog_items` row: `scope_origin 'enhancement'`, class `P3 - Investor Value`, the
`enhancement_claim`, `scope_rationale`, `predicted_cycles` and a description citing the VC- refs
above and this file's path; the 72-hour window is its ratification. Measured 2026-09-25:
`runner_settings.invention_requires_epic = true` and `SES-369` is open, which is why no survivor
since `LOG-143` has reached `backlog_items` — the filing step, not this research, has to clear that.
Survivor 1's third cycle depends on `AGT-74` (open, John-named) only for `skill_delta`, and on
`SES-364` (delivered) for reversal; `SES-363` (versions) is not required. Survivor 2 depends on
nothing open.

## Usage signal that proves it

- Survivor 1, today: 48 of 153 Skills on a model whose retirement window opens 2026-10-15; 14 of 26
  assigned agents carry one; 16 of those 48 Skills exercised in the last 30 days, led by
  `agent-selection-intent` (20 calls), `ci-answer-intent` (17), `ws-news-search-intent` (17); 117
  Haiku rows in the 30-day ledger. Once built: lifecycle rows read per week (each a logged call with
  `visitor_id`), Skills with a known lifecycle over total, and — the number an acquirer reads —
  migrations applied as training rows with their cost and re-judged delta, against zero
  `agent_training_sessions` rows today.
- Survivor 2, today: no visitor pull, stated plainly — the About block renders the pitch to whoever
  opens it, without "only", and no telemetry counts that read. Once built: claim-check rows per
  clause with a dated verdict, each a logged call; the visible proof is the About line and, if the
  verdict holds, the word returning to the screen.
- Cross-check for both: 30-day model rows are 895 `call_source = session` (the self-building loop:
  `classify-ticket` 528, `design-kickoff` 100, `build-ticket` 74) against 173 `ui` and 4 `mcp`. The
  factory is the platform's dominant user; a model retirement would stop it too.

**Thinness, stated plainly:** survivor 1's market leg is primary-sourced where it matters (the
provider's own deprecations page, fetched today) and digest where it is context (diligence
checklists, the GSA clause, the treadmill pieces); its usage leg is the strongest this lane has
produced (a dated exposure counted from rows the executor already writes). Survivor 2's market leg
is digest only and its usage leg is absent by construction; I returned it because the corpus itself
(`VC-LRN-008`, thesis open question 1) asks for the decision, and the neighbour that makes the
question urgent shipped fourteen days ago. Zero survivors would have been dishonest; one would have
been defensible.
