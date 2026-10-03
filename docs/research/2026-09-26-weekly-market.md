<!-- DeepBench | docs/research/2026-09-26-weekly-market.md | The Researcher, capability
     research-class-lens, run kind weekly-market-review, model claude-fable-5-1, run 2026-09-26 on
     session/researcher-20260926 (branched from origin/dev at 075df07, v7.0.603). Window 2026-09-19 to
     2026-09-26. Lens chosen by the census read live 2026-09-26: P2 and P3 tie at 0 ratified; P3 has 64
     proposed against P2's 95, so P3. Root claim VC-ROOT-003; class reading VC-SYN-001. Allowed 2.
     Nothing filed: file_invention_proposal() is shut (SES-369, open; runner_settings.invention_requires_epic
     true, verified 2026-09-26). The two proposals below are payloads for The Development Manager.
     Egress: live WebSearch answered all 47 queries; WebFetch opened 8 pages (claude.com, support.claude.com,
     platform.claude.com, github.com) and was refused by the egress proxy on 24 domains (x.ai, docs.x.ai,
     openai.com, developers.openai.com, help.openai.com, community.openai.com, datatracker.ietf.org,
     globenewswire.com, gsa.gov, aws.amazon.com, salesforce.com, dataiku.com, harness.io, guild.ai and
     others). A finding marked *Digest* rests on the dated search result, not the page; a finding marked
     *Page* was read from the page itself. Leg 2 was read live from Supabase, read-only. -->

# 2026-09-26 Weekly Market Review, Lens P3 - Investor Value

**Root claim:** `VC-ROOT-003`, new features that add investor / buyout value. **Class reading:**
`VC-SYN-001`: a feature adds investor value when a skeptical technical reviewer can confirm a claim
from the product itself: where a number came from, what a piece of work cost, that an improvement was
data and not code. **Allowed:** 2. **Proposals returned:** 2, not filed.

**Prior runs on this lens, read before shortlisting:** 2026-09-09 (Training Delta, now `AGT-74`),
2026-09-11 (Cost per deliverable, held pending `SES-369`), 2026-09-11 pass 2 and 2026-09-19 (Ledger
reconciled to the provider's bill, refused twice, not returned again), 2026-09-20 and 2026-09-21
(Personnel File measured from the ledger; Skill authorship on the record), 2026-09-24 (Skill
authorship, second return; the platform drafts the Skill fix). None of those is returned here: the
2026-09-20 rule caps a proposal at two returns, and the week's evidence points somewhere new.

## The pitch

The locked pitch (`VC-THESIS-002`) sells a platform where improving an agent is a training operation,
not a software release. This week the platform shipped the mechanism that makes that sentence true
for the *model* underneath every agent: a model catalog, a model-assignments table naming the model
for every job type, a trial runner that replays a recorded turn on a candidate model, and a one-step
undo for a switch (`AGT-142`, `AGT-143`, `AGT-144`, `AGT-148`, `AGT-152`, all delivered 2026-09-25).
Measured today, the mechanism has never produced a record a reviewer could read: five assignment rows,
`trial_evidence = []` on all five, no decision id, zero before-images for `model_assignments`, and the
trial runner writes its result to a temporary file that no table keeps.

The same week, the market re-priced the model layer three times (Grok 4.7 on 2026-09-21, Claude Opus
5.5 at 40% less than Opus 5 on 2026-09-22, GPT-6 the same day), Microsoft moved every agentic Copilot
feature to usage-based billing (2026-09-25), and two surveys found that enterprises claim a complete
picture of spend per agent (74%) while overrunning budget (60%), and claim a complete agent inventory
(96.4%) while only 39.8% keep audit trails. Model choice is now a weekly, priced decision that buyers
cannot evidence. DeepBench has the data model to evidence it and does not write the row.

Both proposals put that row on the record, in build order:

1. **Model trial receipt.** Every trial the runner performs becomes a row: the job replayed, baseline
   and candidate model, pass/fail on the turn's own contract, tokens, minutes, USD from
   `model_pricing`, the judge's verdict where one exists, and the trace ids of both runs. A switch
   cites its rows; a rejected switch keeps its rows. Two cycles.
2. **A real answer replayed on a candidate model, judged and priced.** The replayable set gains the
   customer path (`channel-intelligence:ci-answer-intent`), the Bench Report Card judges both answers,
   and the receipt carries both scores. That is the before/after `VC-EXIT-020` asks for, read from
   rows, with a price on each side. Two cycles, after proposal 1.

Why P3 and not P10: the shipped tooling serves the runner; the receipt serves the reviewer
(`VC-EXIT-027`, value travels with the asset). An acquirer's architect (`VC-EXIT-007`) opens one
assignment and reads why the platform runs this job on this model, what the alternative would have
cost, how it scored, and how the switch would be undone. That is `VC-SYN-001`'s three checks on one
row: where the number came from, what the work cost, that the change was data.

## What shipped this week (from `backlog_items`, delivered/done, 2026-09-19 to 2026-09-26)

39 rows: 33 `P10 - Tooling`, 3 `P1 - Improves John's Skills`, 2 `P7 - Agent Creation`, 1 `P9 - Bug
Fixes`; zero in P2, P3, P4 and P5. 22 discovered by the platform, 14 named by John, 3 unclassified.

What it says about where the platform is going:

- **The factory built its own management layer.** Model catalog and assignments (`AGT-142`), every
  script reading its model from the table (`AGT-143`), the Development Manager's Model Assignment
  capability (`AGT-144`), the model trial runner (`AGT-148`), undoable switches (`AGT-152`); one
  findings list for every agent and process (`AGT-131`); the Auditor as its own weekly routine
  (`AGT-86`, `AGT-102`, `AGT-137`); the Development Manager ruling on stop cards (`AGT-127`); runner
  SQL reading one constants home (`AGT-109`/`AGT-88`); 14 doc-consistency rows from the W39 audit.
- **Two private agents arrived** (`AGT-120`/`AGT-121` Product Marketing Manager with a private
  market-records store; `AGT-82`–`AGT-84` a private career agent with a closed records store). The
  market records this review re-checks are the first output of the first of those.
- **Nothing customer-facing shipped, and nothing customer-facing ran** (leg 2 below). Read together
  with `VC-MAP-023` (no paying users) and `VC-SYN-001` (a sale after two or three paying customers),
  the platform this week is a self-building governance system whose product surface was idle.
- The one P9 (`SES-422`) and `SES-423` are the reliability substrate: the verifier could not tell a
  regression from noise, and the routine under-reported its own token spend about six-fold. Both are
  the kind of number an acquirer checks (`VC-EXIT-021`); both are fixed.

## Leg 1: the market this week (live, dated)

**Inside the window (2026-09-19 to 2026-09-26):**

- *Page, 2026-09-23:* **Claude Marketplace** launched: connectors and plugins, "Claude-powered
  products" from partners, and service firms in one catalog, purchasable with "a portion of your
  committed Anthropic spend". No pricing, margin or vetting criteria on the announcement.
  ([claude.com/blog/claude-marketplace](https://claude.com/blog/claude-marketplace)) *Page, undated:*
  the partner page asks for products "designed for the security, scale, and compliance needs of
  enterprise customers", by waitlist. ([claude.com/marketplace-partners](https://claude.com/marketplace-partners))
  *Digest, 2026-09-23:* limited preview, enterprise customers with a spend commitment only, no
  self-serve. ([therundown.ai](https://www.therundown.ai/tools/claude-marketplace);
  [use-apify.com](https://use-apify.com/blog/anthropic-claude-marketplace-partner-network))
- *Digest, 2026-09-24:* **Dataiku Agent Management**: a standalone product that inventories agents
  across platforms, tracks business KPIs and technical performance per agent, tiers agents by risk,
  and is "priced per instance annually, with monitoring metered per agent"; GA October.
  ([siliconangle.com, 2026-09-24](https://siliconangle.com/2026/09/24/dataiku-debuts-cross-platform-agent-management-expands-cobuild-building-agent/);
  [dataiku.com](https://www.dataiku.com/company/news/dataiku-agent-management-general-availability))
- *Digest, 2026-09-25:* **Microsoft relaunched Copilot** around Home, Code and Autopilot; Autopilot is
  a persistent cloud agent with its own tenant identity, memory and workspace; "everyday Copilot chat
  stays on per-user licenses, while the agentic features run on usage-based billing"; enterprises get
  "audit trails, access controls, and a single pane of glass for every agent".
  ([the-decoder.com](https://the-decoder.com/microsoft-gives-copilot-another-makeover-adding-an-autopilot-agent-and-usage-based-billing/);
  [futurumgroup.com](https://futurumgroup.com/insights/microsoft-copilot-becomes-an-agentic-work-platform/))
  From 2026-11-02 CSP-sold Copilot Business carries a default $10 per user per month AI spending limit.
  ([universal.cloud](https://universal.cloud/en/blog/article/copilot-credits-copilot-business-november-2026/))
- *Digest, 2026-09-22:* **Guild.ai, "The AI Agent Management Gap"** (Morning Consult, 362 US IT
  decision-makers at 100+ employees, fielded 2026-08-04 to 08-09): 96.4% confident in a complete agent
  inventory; 66.7% had an agent-related operational consequence in 12 months; 42.7% have a central
  monitoring tool, 39.8% logging or audit trails, 31% an automated kill switch.
  ([globenewswire.com, 2026-09-22](https://www.globenewswire.com/news-release/2026/09/22/3366611/0/en/the-ai-agent-management-gap-is-growing.html);
  [guild.ai](https://www.guild.ai/ai-agent-management-gap-report))
- *Digest, 2026-09-22:* **Multikor** described an "evidence layer" for agents in regulated industries:
  "authorization is moving from a document reviewed every three years to continuous evidence an
  authorizing official can see in real time"; on its own AWS workloads, spend now resolves to calling
  principal, tenant and model, with "no native cap on token consumption" and about a day of lag.
  ([manilatimes.net mirror, 2026-09-23](https://www.manilatimes.net/2026/09/23/tmt-newswire/globenewswire/an-ai-agent-cannot-be-audited-like-software-multikor-built-the-evidence-layer-that-can/2430782))
- *Page, 2026-09-19 release (README read 2026-09-26):* **Reinventing.AI "AI Employees"**: eight named
  business roles as "a folder of plain text files you can open and change", MIT, running on eleven
  harnesses (Claude Code, Codex, Grok Bot and others); "every send, post, submit, publish and spend is
  held for your click"; "when a page changes, the routine fixes its own instructions"; no audit trail
  described. ([github.com/markfulton/ai-employees](https://github.com/markfulton/ai-employees);
  [einpresswire.com, 2026-09-19](https://www.einpresswire.com/article/941970685/reinventing-ai-releases-eight-open-source-ai-employees-on-github-under-mit-license))
- *Digest, 2026-09-21 / 2026-09-22:* **Model re-pricing.** Grok 4.7 shipped at the same $2/$6 per
  million as 4.6 ([marktechpost.com, 2026-09-21](https://www.marktechpost.com/2026/09/21/spacexai-releases-grok-4-7/));
  Claude Opus 5.5 at $4/$20 versus Opus 5's $5/$25, "40% less to run than Opus 5 on typical
  workloads", 1M context, on the Claude API, Bedrock, Vertex and Foundry
  ([github.blog, 2026-09-22](https://github.blog/changelog/2026-09-22-claude-opus-5-5-is-now-available-in-github-copilot/);
  [cellcog.ai](https://cellcog.ai/blog/cellcog-opus-5-5-day-one/)); GPT-6 the same day
  ([theneuron.ai, 2026-09-22](https://www.theneuron.ai/digest/everything-that-happened-in-ai-today-tuesday-september-22-2026/)).
- *Digest, 2026-09-18:* **AWS AgentCore Runtime** now bills memory on actual use ("you pay for actual
  usage rather than the peak").
  ([aws.amazon.com, 2026-09-18](https://aws.amazon.com/about-aws/whats-new/2026/09/new-agentcore-runtime-generally-available/))
- *Digest, 2026-09-24:* **LiveKit acquired Loophole Labs** (agent start-up latency); 2026-09-10
  Baseten acquired Blaxel (agent sandboxes); early September Palo Alto Networks paid $500M for
  Console (IT help-desk agents; valued $157M before) and ServiceNow bought Sweep (~$400M reported).
  Infrastructure and deployed vertical agents are what changed hands.
  ([fortune.com, 2026-09-24](https://fortune.com/press-releases/livekit-acquires-loophole-labs-ai-agent-infrastructure-2026-09-24/);
  [techcrunch.com, 2026-09-02](https://techcrunch.com/2026/09/02/palo-alto-networks-paid-500m-for-thrive-backed-console-sources-say/);
  [salesforceben.com](https://www.salesforceben.com/servicenow-acquires-sweep-in-deal-worth-hundreds-of-millions/))
- *Digest, 2026-09-21:* **OpenAI DevDay is 2026-09-29** and is expected to introduce Managed Agents,
  "broadly follows what Anthropic currently offers". Whitespace-decay watch for next week's review.
  ([forbes.com, 2026-09-21](https://www.forbes.com/sites/jonmarkman/2026/09/21/openai-plans-to-introduce-managed-agents-at-devday-2026/);
  [openai.com/devday](https://openai.com/devday/))
- *Digest, 2026-09-22 milestone:* **Custom GPT retirement**: Enterprise migration experience and user
  banner targeted 2026-09-22; new-GPT creation ends 2026-10-26; retirement 2026-12-11 (2027-02-11 with
  an approved deferral); a GPT's instructions become a Skill, its files become reference files.
  ([help.openai.com FAQ](https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq);
  [gsmdome.com](https://www.gsmdome.com/openai-to-retire-custom-gpts-on-december-11-2026-shifting-users-to-plugins-and-skills))

**Load-bearing, just outside the window (needed for the record re-checks and the pull test):**

- *Digest, 2026-09-11 / 09-15:* Salesforce shipped seven **named, job-ready Agentforce agents**
  (Casey, Paige, Carter, Hunter, Marshall, Piper, Fin), a long-horizon runtime, and cited 7 billion
  "Agentic Work Units", a unit that "counts every action an agent takes, whether or not it produces a
  useful result". ([salesforce.com](https://www.salesforce.com/news/stories/agentforce-job-ready-ai-agents/);
  [forbes.com, 2026-09-11](https://www.forbes.com/sites/timkeary/2026/09/11/salesforce-brings-long-horizon-ai-agents-to-agentforce/);
  [forkast.news](https://forkast.news/the-agent-measurement-problem-five-competing-metrics-no-standard/);
  [diginomica.com](https://diginomica.com/dreamforce-2026-what-salesforces-awu-experiment-means-agentic-licensing))
  Agent Optimizer targets GA October 2026. ([atrium.ai](https://atrium.ai/resources/dreamforce-2026-takeaways/))
- *Digest, survey July 2026, report Sept 2026:* **Harness, "State of Agent DLC 2026"** (Sapio, 700
  engineering leaders, 1,000+ employee firms): 77% confident of a complete inventory, 44% run discovery
  tooling; "74% say they have a complete picture of true spend per agent, while 60% still overran
  their budget last quarter"; controls in place for under half, "in some cases fewer than one in five".
  ([prnewswire.com](https://www.prnewswire.com/news-releases/new-harness-report-reveals-enterprise-confidence-in-ai-agents-isnt-backed-by-real-controls-302875476.html);
  [harness.io](https://www.harness.io/press-and-news/new-report-reveals-ai-agent-confidence-gap))
- *Digest, 2026-09-05:* **IETF Internet-Draft `draft-sharif-agent-audit-trail-03`**: a JSON record
  with mandatory agent identity, action classification, outcome and trust level, SHA-256 hash-chained,
  mapped to EU AI Act Art. 12, SOC 2, ISO/IEC 42001 and ISO/IEC 24970; no formal IETF standing.
  ([datatracker.ietf.org](https://datatracker.ietf.org/doc/draft-sharif-agent-audit-trail/))
- *Digest, 2026-09-10:* **GSA OneGov with OpenAI**: 27-month consumption-based offer, 50% token
  discount, effective 2026-10-01; the Anthropic and Google OneGov deals expire at the end of September.
  ([gsa.gov, 2026-09-10](https://www.gsa.gov/about-gsa/newsroom/news-releases/gsa-expands-onegov-ai-offerings-with-discounted-openais-chatgpt-09102026);
  [nextgov.com](https://www.nextgov.com/acquisition/2026/09/gsa-unveils-new-token-based-onegov-discount-openai/415908/))
- *Page, undated (read 2026-09-26):* **Anthropic Usage & Cost Admin API** names "Cost reconciliation:
  Match internal records with Anthropic billing" as a use case; `cost_report` returns USD by day,
  groupable by workspace and description (model); data appears "within 5 minutes". It serves Claude
  Console organizations; subscription usage is not in it.
  ([platform.claude.com/docs/en/manage-claude/usage-cost-api](https://platform.claude.com/docs/en/manage-claude/usage-cost-api))
- *Page, undated (read 2026-09-26):* **Claude Compliance API** returns per-event activity, chats, files
  and session transcripts for Enterprise; it is an activity feed, not a per-decision record.
  ([platform.claude.com/docs/en/manage-claude/compliance-api](https://platform.claude.com/docs/en/manage-claude/compliance-api))
  *Digest:* announced 2026-05-21 with 28 integrations.
  ([databreachtoday.com](https://www.databreachtoday.com/everyone-suddenly-wants-claudes-audit-logs-a-31753))
- *Page, undated (read 2026-09-26):* **Claude Skills for an organization**: admins provision skills for
  everyone, approve versions, gate publishing ("Requires review"); "skill sharing events are captured
  in the audit log and Compliance API" but "the audit log doesn't capture the contents of shared
  skills". Team and Enterprise. ([support.claude.com](https://support.claude.com/en/articles/13119606-provision-and-manage-skills-for-your-organization))
- *Page, beta header `managed-agents-2026-04-01`:* **Claude Managed Agents** keeps agent definitions
  by id and "event history is persisted server-side"; sessions "store conversation history, sandbox
  state, and outputs server-side"; a self-hosted sandbox option exists; not eligible for Zero Data
  Retention. ([platform.claude.com/docs/en/managed-agents/overview](https://platform.claude.com/docs/en/managed-agents/overview))
- *Digest, 2026-08-25:* Claude chat and Cowork now share one account-level memory; Team and
  Enterprise admins decide whether memory is available.
  ([techcrunch.com, 2026-08-25](https://techcrunch.com/2026/08/25/claude-cowork-finally-remembers-what-you-told-the-app-in-chat/))
- *Digest, 2026-04-22:* **ChatGPT Workspace Agents**: shared agents a team builds once; "memory is per
  user and per agent"; Compliance API audit; RBAC; research preview on Business, Enterprise, Edu.
  ([openai.com](https://openai.com/index/introducing-workspace-agents-in-chatgpt/);
  [help.openai.com](https://help.openai.com/en/articles/20001143-chatgpt-workspace-agents-for-enterprise-and-business))
- *Digest, 2026-06-03:* **OpenAI Agent Builder** (and the Evals Platform and Reusable Prompts) added
  to the official deprecation tracker with a common shutdown of 2026-11-30; migration to the Agents
  SDK or Workspace Agents. ([developers.openai.com/api/docs/deprecations](https://developers.openai.com/api/docs/deprecations);
  [therouter.ai](https://therouter.ai/news/openai-evals-agent-builder-prompts-deprecation-november-2026/))
- *Digest, 2026-08-11 / 08-26 / 09-03:* **Grok Bot** opened in early beta 2026-08-11 and widened
  2026-08-26; there is "no separate Grok Bot fee": eligible plans run from Cursor Pro $20 and SuperGrok
  $30 through SuperGrok Heavy, Cursor Ultra and Cursor Teams; usage is "metered on your Cursor
  account" with no published spend cap. Enterprise shipped 2026-09-03 with admin and security audit
  logs, off-by-default Action Recording (90-day retention) and OpenTelemetry export; Action Recording
  captures "every tool call and how it ended, the decision that allowed or refused it", and "work it
  handed to subagents"; "Enforce Auto-review" and team rules are Enterprise-only and "Ask first wins
  when rules conflict". The launch page says each Bot has its own computer; the docs say an account's
  Bots share one. ([x.ai/news/grok-bot-for-enterprise](https://x.ai/news/grok-bot-for-enterprise);
  [docs.x.ai/grok-bot/security](https://docs.x.ai/grok-bot/security);
  [docs.x.ai/grok-bot/teams-and-enterprises](https://docs.x.ai/grok-bot/teams-and-enterprises);
  [eesel.ai](https://www.eesel.ai/blog/grok-bot-pricing);
  [digitalapplied.com](https://www.digitalapplied.com/blog/grok-bot-ai-teammates-launch-cloud-computer-2026);
  [aiweekly.co](https://aiweekly.co/alerts/xai-opens-grok-bot-to-enterprises-with-new-audit-controls))
- *Page, dated 2026-03-25:* **Claude for Government** "and Claude via Amazon Bedrock in AWS GovCloud and
  Google Vertex with Assured Workloads are all FedRAMP-High".
  ([support.claude.com](https://support.claude.com/en/articles/13756069-public-sector-faqs))
  *Digest, 2026-04-27:* **ChatGPT Enterprise and the API platform** reached FedRAMP Moderate through
  FedRAMP 20x. ([openai.com](https://openai.com/index/openai-available-at-fedramp-moderate/))
- *Digest, 2026, undated pages citing Gartner March 2026:* agentic tasks use 5 to 30 times the tokens of
  a chatbot turn; investors "open the hood" on inference cost per user and unit economics.
  ([techaheadcorp.com](https://www.techaheadcorp.com/blog/inference-cost-explosion/);
  [beevr.ai](https://beevr.ai/blog/ai-technical-due-diligence-seed-2026))
- *Digest, 2026:* buyers "stopped rewarding polished demonstrations of autonomous AI behavior and now
  demand evidence that agents are deployed in production", with net revenue retention above 120% as
  an underwriting signal. ([feinternational.com](https://www.feinternational.com/blog/ai-ma-trend))

**What the job postings name:** not run. The postings leg is the P1 instrument (`VC-ROOT-001`,
pattern 149); P3 is tested against buyers, acquirers and diligence. Recorded as an omission.

## White space DeepBench could own, scored against the corpus

- **A priced, judged, reversible model decision on the record.** No product in this week's scan
  writes a row that says "this job ran on model A; on model B it would have cost X and scored Y; the
  switch is undone by one action". Salesforce counts actions (AWUs), Dataiku meters monitoring per
  agent, Microsoft bills usage, Harness finds 74% claiming spend visibility and 60% overrunning. Scores:
  `VC-SYN-001` (all three checks on one row), `VC-EXIT-020` (before/after from data), `VC-EXIT-025`
  (unit costs known), `VC-EXIT-017` (model dependency is a diligence bucket), `VC-INVAR-032`
  (reversible by one action, before-image or no write), `VC-THESIS-021` (a procurement director sees a
  documented, reversible change; a VP of Product sees a live cost/quality trade made as data).
  Rejected paths checked: `VC-REJECTED-016` (evidence from what the call did, not a declared field),
  `VC-REJECTED-017` (no fabricated zero: an unjudged trial reads "not judged"), `VC-REJECTED-047`
  (state cost first).
- **The hand-off reason as a queryable fact.** Grok Bot logs that a Bot handed work to a subagent and
  which rule allowed it; the IETF draft has identity, action, outcome and trust level; none has "why
  this agent". DeepBench's routing is model judgment (`VC-THESIS-014`) and the reason is not a stored
  fact: the Project Manager's model calls in the last 30 days carry `tool_calls`, `retrieval_method`,
  `assembled_skill_slugs`, `retrieved_chunk_ids` and `traits` in `call_facts`, no rationale. This is
  already an open row, `LOO-005` ("an agent's pre-delegation reasoning is never logged as its own
  pipeline event", P5). Not re-proposed; the market evidence above is worth a look at its class.
- **The named workforce is now table stakes, not whitespace.** Seven named Salesforce agents,
  Reinventing.AI's eight named roles as files, Autopilot with its own tenant identity. `VC-MAP-055`
  already closed the character layer; this week closes "named" as a differentiator. What remains
  DeepBench's is the data model behind the name (`VC-MAP-017`, `VC-MAP-025`).
- **Evidence over documentation is the compliance direction** (Multikor, IETF draft, EU AI Act Art. 12
  in force 2026-08-02). Still pattern 137 as a feature until the trail it would package exists
  (`LOG-144` open); recorded, not proposed, as in four prior passes.
- **The builder buyer (`VC-THESIS-030`) wants files it owns.** Custom GPTs migrate to Skills this
  month; AI Employees ship as MIT-licensed folders; Claude Skills are provisioned with versions and
  approvals. DeepBench's Skill rows still have no author or version (returned twice, not again).

## Leg 2: the platform's own usage (read live 2026-09-26, measured only)

- `ai_activity_log`: **47,597** rows all-time, **3,564** in the last 7 days. Of those, **162** name a
  model (real model calls, per the `LOG-81` rule; a later read the same morning showed 164, the window is rolling) and **3,402** do not (Librarian retrieval 2,543,
  agent-directory reads 566, Prioritizer classify writes 289). Two models: `claude-fable-5-1`,
  `claude-opus-5`. Tokens on the 162: 3,801,189 input, 689,581 output.
- **Every one of the 162 model calls this week came from a governance agent** (designer 60, builder
  38, devmanager 24, auditor 16, jerry 10, ticketowner 6, prioritizer 5, nathan 3). Customer-side
  agents (Project Manager, Librarian, Marcus, Owen) made **0** model calls in the window; their last
  model call was 2026-09-17 15:19Z. Last 30 days: 1,124 model calls, 144 customer-side, 21 on
  `ci-answer-intent`.
- **Cost: 0 of 3,564 rows priced this week; 81 priced all-time; last priced row 2026-09-15.** This is
  by design, not a defect: `scripts/agent-log.js` writes `cost_usd = NULL` for session-lane turns
  because a session turn runs on the operator's subscription, so no API dollar exists to record (`SES-383`, code comment),
  and every model call this week was session-lane (164 of 164 on the later read, 0 priced). `model_pricing` holds 9 models and was updated
  2026-09-25 (Opus 5.5 added), so the price book is current; the platform knows the week's tokens and
  chooses not to invent a dollar figure for them (`VC-INVAR-015`). The bearing on `VC-SYN-001` is
  exact: a reviewer can be shown tokens per call and a list-price equivalent, never a bill.
- `visitor_id` is set on 147 of the 162 model-call rows (56 distinct values), but on runner rows the
  value is a `runner_cycles.id` (`AGT-148` kickoff, measured 2026-09-25). No row this week is
  attributable to a person. Worth a check that no visitor count on any surface treats a cycle id as a
  visitor (`VC-INVAR-016`, `VC-REJECTED-019`).
- Bench Report Card: `report_card_usage` shows **0** judge runs in 7 days, 3 all-time, 0 from a real
  visitor; `bench_report_card_rollup` has two agents judged once each on 2026-09-03. Unchanged since
  2026-09-21.
- Deliverables: 9,903 rows, **0** created this week, 0 not-draft, 0 priced. `agent_training_sessions`:
  **0** rows.
- `model_assignments`: 5 rows, `trial_evidence = []` on all 5, no `decision_id`, 0 before-images for
  the table. `skill_profiles`: **157** (43 added in 7 days; 137 on 2026-09-24).
- Governance ledgers: `runner_decisions` 1,007; `decision_patterns` 172; `runner_cycles` 684;
  `backlog_items` 1,024 (593 open); `vision_claims` 384; dev at `v7.0.603`.

## Where I confirmed or contradicted the week's market records (one line per record id)

Every record was written 2026-09-24 by the Product Marketing Manager capability; I re-checked each
claim against its original source, not the record. Verdicts:

- **`fe667377-66cc-4c2e-aa6b-b9434fc5930e` (Grok Bot): CONFIRMED with two corrections.** Launch
  2026-08-11 (beta), enterprise 2026-09-03, Enforce Auto-review with admin rules, OpenTelemetry export,
  and "logs what was handed off, not why" all hold (docs.x.ai security and teams pages, aiweekly.co,
  eesel.ai, all digest; x.ai and docs.x.ai refused the fetch). Correction 1: pricing is not "Cursor
  $120-$200"; there is no separate Grok Bot fee, eligible plans start at Cursor Pro $20 and SuperGrok
  $30, usage is metered on the Cursor account, and no spend cap is published. Correction 2: "their own
  cloud computer" is the launch page's wording; the docs say an account's Bots share one.
- **`24b0a0b0-4871-4e32-aeb9-2051f03b66ca` (DIY agents in a Claude account): gap CLOSED, verdict
  CONTRADICTED on timing.** The record admitted it had no dated source. Sources now: org-wide Skills
  provisioning with versions and approvals (support.claude.com, page); Compliance API (platform docs,
  page; announced 2026-05-21, digest); shared Claude/Cowork memory 2026-08-25 (digest); Managed
  Agents keeping definitions and event history server-side (platform docs, page); ChatGPT Workspace
  Agents with per-user-per-agent memory and Compliance API audit, 2026-04-22 (digest); Grok Bot Action
  Recording 2026-09-03 (digest). The record rated sharing, memory and audit as moats "a lab can ship in
  2-3 months": all three shipped between four and five months ago. "Weak" stands and is understated.
  What none of them writes: why a hand-off happened, and what one delivered answer cost.
- **`d8168640-b145-49bb-bc93-dc0b5d18b53e` (Why not a native tool, variant A): CONFIRMED, sources
  upgraded.** Agent Builder shuts 2026-11-30 (notice dated 2026-06-03 on the official deprecations
  page, not a forum thread; digest); custom GPTs in Enterprise retire 2026-12-11 with a 2027-02-11
  deferral, migration banner 2026-09-22, creation ends 2026-10-26 (Help Center FAQ, digest). Managed
  Agents hold definitions, memory and run history on the vendor platform (page; a self-hosted sandbox
  option exists). Claude for Government is FedRAMP High (page dated 2026-03-25); OpenAI's is ChatGPT
  Enterprise and the API at FedRAMP Moderate, 2026-04-27 (digest), so "ChatGPT Gov holds FedRAMP" is
  the wrong product name. Claude Marketplace 2026-09-23 (page); "enterprise-only" holds through the
  committed-spend requirement (digest); "partner-vetted" rests only on the partner page's "designed for
  the security, scale, and compliance needs of enterprise customers" and third-party summaries, soft.
  Skills provisioning for an organization holds (page).
- **`429a8614-a223-4bcf-91a8-b1ab87812df3` (variant B): CONTRADICTED on its one number.** "1,199 logged
  routing decisions by 2026-07-23 (§19i)" misreads the source: `ARCHITECTURE.md` §19i's 1,199 is the
  count of the Project Manager's routing calls permanently mis-tagged `rag` by a collapsed boolean
  (`LOG-42`), a defect statistic, not a proof point. Live today: the Project Manager has 13,229 log rows
  (5,373 before 2026-07-24; 4,322 tagged `rag` all-time). `runner_decisions` (1,007) is the briefing
  decision ledger, a different table. The rest holds: no moat passes durable today (consistent with the
  record above); no FedRAMP; no measured-improvement number (`agent_training_sessions` = 0 rows).
- **`9a13b689-c1c0-4ddf-936a-227bf4e7f07d` (variant C): CONFIRMED.** `decision_patterns` 172 and
  `runner_decisions` 1,007, read live 2026-09-26. The "12 months, temporary" rating is a judgment, not
  a checkable fact, and is consistent with the evidence.
- **The three variants:** they agree on the verdict (no durable moat today) and differ in what they
  lean on: A on outside facts (now verified, two names corrected), B on an internal number (wrong), C
  on internal counts (right). The lead that survives is A's external case with C's numbers; B's 1,199
  line should be dropped wherever it appears.

## Shortlist (at most five)

1. **Model trial receipt on the record** — `VC-SYN-001`, `VC-EXIT-020`, `VC-EXIT-025`, `VC-INVAR-032`.
   Pull test: a reviewer can confirm from rows that the model under a job is a priced, judged,
   reversible data decision; the market this week bills per usage and re-prices models weekly while
   74% of enterprises claim spend-per-agent visibility they cannot evidence. Cheapest variant: a
   `model_trials` table written by the existing runner, USD from `model_pricing`, `trial_evidence`
   pointing at row ids. **Survivor 1.**
2. **A real answer replayed on a candidate model, judged and priced** — `VC-EXIT-020`, `VC-SYN-001`,
   `VC-EXIT-017`, `VC-MAP-023`. Pull test: "improvement was data, not code" shown on the customer path
   with the Report Card scoring both sides; the 2026-09-24 pass's "second-vendor run" was killed only
   for the vendor adapter, and this needs none. Cheapest variant: add `ci-answer-intent` to the
   replayable set, judge both with the existing card, write the receipt. **Survivor 2.**
3. **Session-lane turns priced at list equivalent** — `VC-SYN-001`, `VC-EXIT-025`. Killed: the NULL is a
   deliberate assertion (`SES-383`, "not billable"), and a list-price equivalent on a subscription row
   is a derived number the ledger must not carry as cost (`VC-INVAR-015`, `VC-REJECTED-031`). Belongs
   as a labelled column on a report, which is `VC-EXIT-026`'s "dashboard without mechanism". Not
   proposed.
4. **The hand-off reason as a Layer A fact** — `VC-THESIS-013`, `VC-EXIT-021`. Killed as a proposal:
   it exists as `LOO-005` (open, P5). The finding this week is that no competitor writes it; that is
   an argument about its class, for the Prioritizer, not a new row.
5. **Agent register export in the IETF audit-trail shape** — `VC-EXIT-021`. Killed a fifth time:
   pattern 137 until the per-run trail (`LOG-144`) exists; the draft has no IETF standing.

## Proposals (allowed = 2), in the filing shape, for The Development Manager; NOT filed by this run

### Proposal 1 — Model trial receipt: every trial a priced row, every switch cites its rows

- **title:** Model trial receipt: every trial a priced, judged row; a switch cites its rows
- **priority_class:** P3 - Investor Value
- **scope_origin:** enhancement
- **enhancement_claim:** A reviewer can confirm from rows that the model under any job type is a priced
  and judged data decision with a one-step undo: which recorded turn was replayed, on which two
  models, whether each passed, tokens, minutes, USD from `model_pricing`, the judge verdict where one
  exists, and the two trace ids. Today five assignments carry `trial_evidence = []`, no decision, no
  before-image, and the trial runner's output lives in a temporary file.
- **scope_rationale:** Extends `AGT-148` (delivered 2026-09-25) by keeping what it already computes:
  one `model_trials` table (job_kind, job_key, job_ref, baseline_model, candidate_model,
  baseline/candidate passed, tokens, minutes, usd, verdict or 'not judged', trace ids, cycle id,
  recorded_at), written by `scripts/model-trial.js` in the same run that writes its JSON;
  `apply_model_assignment()` stores row ids in `trial_evidence` instead of copies; the switch card
  on the briefing lists the rows. USD comes from `model_pricing` at the trial's time and reads NULL,
  never 0, for an unpriced model (`VC-INVAR-015`). No agent row is touched; no customer surface
  changes. Read-only for `anon`.
- **predicted_cycles:** 2
- **description:** `VC-ROOT-003`; `VC-SYN-001` (where a number came from, what the work cost, that the
  change was data, on one row); `VC-EXIT-020`, `VC-EXIT-025`, `VC-EXIT-017`, `VC-EXIT-027`;
  `VC-INVAR-032` (reversible by one action, `AGT-152`); `VC-THESIS-021`. Market: Opus 5.5 40% cheaper
  than Opus 5 (2026-09-22), Grok 4.7 (2026-09-21), Microsoft usage-based billing for agents
  (2026-09-25), Harness (74% claim spend-per-agent visibility, 60% overran), Dataiku Agent Management
  metering per agent (2026-09-24). Research: `docs/research/2026-09-26-weekly-market.md`. Rejected
  paths checked: `VC-REJECTED-016`, `VC-REJECTED-017`, `VC-REJECTED-047`.

### Proposal 2 — A real answer replayed on a candidate model, judged by the Report Card, priced

- **title:** A customer answer replayed on a candidate model, judged by the Report Card, priced on the
  record
- **priority_class:** P3 - Investor Value
- **scope_origin:** enhancement
- **enhancement_claim:** For a recorded customer answer (`channel-intelligence:ci-answer-intent`), the
  platform can show two models' answers side by side with the Bench Report Card's delegation-fit,
  groundedness and skill-use scores on each and the USD of each, as rows a reviewer can read, and can
  say whether a model change would have improved the answer before any switch is made.
- **scope_rationale:** Extends proposal 1 and `LOG-143` (done). `REPLAYABLE` in `scripts/model-trial.js`
  gains the `ci-answer-intent` turn with the same assembly path (`agent-prompt.js`, §19b) and a
  read-only tool set; `scoreAnswer` for that job runs the existing `bench-report-card` capability on
  the candidate answer and reads the baseline's card if one exists (else judges it too); both scores
  and both costs land on the `model_trials` row. The replay is logged as `agent-turn` under
  `model-assignment` with the original run's trace id as parent, so the audit ledger keeps the pair.
  No live customer run is altered; no agent row is written; the Report Card's "Unknown" out is kept.
  Material exists: 21 `ci-answer-intent` model calls in the last 30 days.
- **predicted_cycles:** 2
- **description:** `VC-ROOT-003`; `VC-SYN-001`; `VC-EXIT-020` (before/after demonstrable live, from
  data); `VC-EXIT-017` and `VC-MAP-023` (model dependency as a diligence bucket, answered with a judged
  alternative rather than a claim); `VC-THESIS-013` (demonstrably intelligent per hop); `VC-THESIS-021`.
  Market: the 2026-09-24 pass's "second-vendor run" runner-up, killed for the missing vendor adapter;
  this variant needs none. Research: `docs/research/2026-09-26-weekly-market.md`. Rejected paths
  checked: `VC-REJECTED-016`, `VC-REJECTED-017`, `VC-REJECTED-046` (no test mutates working data: the
  replay writes trial rows only).

## How it reaches the build queue

Measured 2026-09-26: `file_invention_proposal()` raises while `runner_settings.invention_requires_epic`
is true (`SES-369`, open), and `invention_due()` still answers due before checking it (`SES-430`,
open). These payloads are therefore not filed by this run; The Development Manager files them when the
gate opens. Proposal 2 depends on proposal 1's table and on `LOG-143` (done). Neither touches an
active agent's row. `AGT-138` (this routine leaving the build routine) is open; until it ships the
invention pass still runs at runner step 4b.

## Usage signal that proves it

- Proposal 1: `model_trials` rows per week; assignments whose `trial_evidence` cites rows; switches with
  a before-image and their reversals. Today 0, 0 of 5, 0.
- Proposal 2: trial rows whose job is `ci-answer-intent` and whose both sides carry a Report Card
  score; the share of model switches on the customer path preceded by such a row. Today 0 and 0; the
  input pool is 21 recorded customer answers in 30 days and none in the last 7, which is the usage
  fact this review leads with, not a reason to build something else.

---

## The Napkin — 25 ideas reviewed

Every idea on the Napkin whose `researched_at` was null or older than its `updated_at`, excluding
`done` and `parked`, was reviewed this run and carries a verdict and cited evidence in its own
`research_note`. **The ideas themselves are not reproduced here — this repository is public and the
Napkin is a private store.** Read the notes on the Napkin page; this section is the index.

Verdict counts: **12 VALIDATED, 8 GO DEEPER, 5 WEAK.**

| Idea id | Verdict |
|---|---|
| `idea-0001` | VALIDATED |
| `e4s0u11m9w8fhinr9mz2` | GO DEEPER |
| `c0il5uu663lzjwu30jf2` | VALIDATED |
| `8lbas1isrmgw99em57bp` | VALIDATED |
| `bjhl3ehi6gn04qg1b9hh` | WEAK |
| `9qkc0dslyckgxxj8wf7x` | GO DEEPER |
| `52ld6xtyiw7k9iy9ngtz` | VALIDATED |
| `93s3i2tag2a4j2qg01st` | GO DEEPER |
| `8uts5ok6nmrdd52omhyf` | VALIDATED |
| `drjg1w47w2ah99ua7urs` | GO DEEPER |
| `5x83ln8jwtgb1cxwn91l` | GO DEEPER |
| `07wt2bl4jn823vkqqcna` | VALIDATED |
| `cj4i09i6g3ymnbwxgqck` | VALIDATED |
| `mtinyjxi1d17hg8qnnxo` | GO DEEPER |
| `fwwug62k7e02ayn162ir` | VALIDATED |
| `7w4xk496udk2za15prv8` | GO DEEPER |
| `fnrgq6d73lns9f696uhy` | GO DEEPER |
| `8hmrgpkbmn5ghayhtzr8` | VALIDATED |
| `iuos79o94oij1dn5gq4h` | VALIDATED |
| `sxxg8ikx01jick7fyhc6` | VALIDATED |
| `t0baph6rrdsqfykl62ay` | WEAK |
| `txo8l245znj4m9bozym3` | WEAK |
| `n_277d36142eca4e7ea870c117e414c7f9` | WEAK |
| `n_5b7389bbdf514afaadc392faa1ac0305` | WEAK |
| `n_e4a3c8204e6446d1932f1b82625f25c9` | VALIDATED |

Two housekeeping notes for the Napkin, neither of which this run acted on because `status` is not
the Researcher's column to change:

- Two rows are write-path test entries from 2026-09-25 (one desktop, one mobile). They are not
  ideas and will be re-swept as "unresearched" every week until someone marks them `parked`.
- The five ideas that already carry an attended session's `note` from 2026-09-24 were reviewed
  again here against live sources, because a note is not research. Where this run's evidence
  disagrees with that note, the disagreement is stated in the `research_note` and in the
  market-records section below.

---

## Run accounting

This is the first run of the Researcher's own weekly routine (Saturday 04:00 America/Chicago,
reviewing the past seven days). Facts about the run itself, so a later reader does not have to
reconstruct them:

- **No Researcher playbook existed to follow.** `docs/runbooks/researcher-routine.md` is not on
  `origin/dev`; `AGT-138`, the ticket that ships it, is open. This run therefore followed its
  interim instructions plus `docs/runbooks/runner-cycle.md` step 4b for how the
  `research-class-lens` capability is called.
- **The prompt was assembled, never hand-built**, through
  `scripts/agent-prompt.js --agent=researcher --capability=research-class-lens
  --intent=rs-research-intent --task-file=…`. The task context was 129,927 bytes, past the 128 KB
  argv ceiling, so `--task-file` (`AGT-129`, delivered 2026-09-25) was load-bearing rather than a
  convenience. The rendered prompt was 139,208 bytes and printed model `claude-fable-5-1`
  (`judgment` lane, confirmed against `judgment_model()`).
- **The Researcher ran twice today, for one week's work.** Runner cycle
  `7ff68b47-0639-4f1c-9cd7-c366feb69e60` (chained drain continuation, started 08:59Z, item
  `AGT-140`) logged its own `research-class-lens:rs-research-intent:depth0` turn at 09:16:07Z as
  its step-4b invention pass, correctly, because its own notes record that step 4b stays until
  `AGT-138` ships. This weekly run is the second. Both passes spend judgment-lane tokens on the same
  lens in the same day, and neither can file, because `invention_due()` still answered
  `due=true, allowed=2, "rung 2: 0 of 2 used today"` after both — the duplication is the cost
  `AGT-138` is meant to remove, and it is now measured rather than predicted.
- **Nothing was filed and nothing else was written.** No call to `file_invention_proposal()`, no row
  in `market_records`, no change to any agent's `is_active` flag or to any routine. The only writes
  this run made anywhere were the 25 `research_note` / `researched_at` pairs on the private Napkin
  table, asserted in both directions afterwards: 25 of 25 notes present, 25 of 25 timestamps present
  and at or after each row's `updated_at`, 0 rows still matching the unresearched predicate, and
  every `text`, `status`, `note` and `nathan_note` value unchanged.
- **Token accounting is partial, and that is stated rather than filled in.** The harness reported
  325,762 sub-agent tokens over 152 tool calls in 1,007,946 ms for the market pass, but not the
  input/output split, so `scripts/agent-log.js` was given `--latency-ms` and no token flags: its own
  rule is that a row recording NULL for "unmeasured" is worth more than an invented split. The real
  total is recorded here, where a person reads it.
