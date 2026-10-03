<!-- DeepBench | docs/research/2026-10-03-weekly-market.md | The Researcher, capability
     research-class-lens, run kind weekly-market-review, model claude-fable-5-1, run 2026-10-03.
     Window 2026-09-26 to 2026-10-03 (ISO week 2026-W40). Lens by the census in the task context: P2 and
     P3 tie at 0 ratified; P3 has 89 proposed against P2's 95, so P3. Allowed 2; returned 1, not filed.
     Egress: live WebSearch answered all 8 queries (egress ok). WebFetch was refused by the egress proxy
     on every domain in the parent session's probe, so every market finding below is *Digest*: it rests on
     the dated search result text, not the page. Leg 2 was read from the task context's platform figures
     (2026-10-02) and from fresh reads of the repo at the paths named, never from memory. -->

# 2026-10-03 Weekly Market Review, Lens P3 - Investor Value

**Root claim:** `VC-ROOT-003` (features that add investor / buyout value). **Class reading:** `VC-SYN-001`:
a feature adds investor value when a skeptical technical reviewer can confirm a claim from the product
itself. **Success test:** `VC-EXIT-007`, a diligence pass, not a pitch. **Allowed:** 2. **Returned:** 1.
One is honest this week: the second-best candidate fails pattern 137 and the third has no subject to
measure (leg 2).

**Prior runs on this lens, read before shortlisting** (`docs/research/2026-09-26-invention-p3-investor-value.md`,
`2026-09-26-weekly-market.md`): Training Delta (`AGT-74`); Cost per deliverable (held pending `SES-369`);
Ledger reconciled to the provider's bill (refused twice, barred from a third return); Personnel File from
the ledger; Skill authorship on the record (two returns, barred); the platform drafts the Skill fix;
Library correction reaches the answers that cited the old chunk; Model trial receipt; a real answer
replayed on a candidate model. None is returned here. `AGT-302` (filed 2026-10-02, P3) already carries
the "same agent graded from a non-Claude client" lead, so the Wednesday feature signals "prove one agent
runs on a non-Claude model" and "score the MCP POC with a number" are not re-proposed either.

## The pitch

This week the platform shipped the first thing an outside buyer can hold: `AGT-162` serves a trained
agent's whole knowledge bundle over MCP with no inference on DeepBench's side, `AGT-163` attributes the
tester's teaching by visitor, `AGT-164` created Brittany with nothing seeded, and `AGT-165` tells the
tester how to connect her from Claude. `AGT-162`'s own ticket text makes the investor claim: "anything
it knows is provably what he taught it." The Connect page then leaves the proof to the tester's eye:
"Ask the same question in a chat with the connector switched off ... The difference is what your
training bought" (`src/screens/ConnectScreen.jsx`, read 2026-10-03).

Measured in the handler itself (`api/_lib/handlers/agent-bundle.js`, v7.0.682, read 2026-10-03): the
response carries `agent`, `role_prompts` (name, text), `guardrails`, `output_formats`, `sections`,
`knowledge_entries` (id, title, content, created_at), `library`, `no_inference: true`. It carries no
content hash, no bundle version, and no list of which `agent_configs` or Skill rows were rendered. The
ledger row it writes records **counts only** (`role_prompts: 2`, `knowledge_entries: 7`, ...). So a
reviewer who pulls Brittany's bundle from Claude cannot match what arrived to a row DeepBench holds, and
two pulls around a Teach event cannot be diffed to show that exactly the taught rows changed. The word
"provably" in `AGT-162` is today an assertion.

**Survivor: the knowledge bundle ships with its own bill of materials, and the serving is on the
record.** The bundle response gains a `manifest`: a SHA-256 over the canonical bundle content, one line
per row served (table, id, created_at or updated_at, per-row content hash), and `served_at`. The same
manifest replaces the counts in the existing `logActivity` call_facts, so the ledger row names the rows
and the hash, not how many. No new table, no model call (`VC-INVAR-005`, `VC-REJECTED-007`), no change
to the Teach path. One cycle.

Why the platform needs it, in order:

1. **It turns `AGT-162`'s "provably" into a procedure a stranger can run** (`VC-EXIT-007`, `VC-EXIT-012`).
   Pull the bundle from any MCP client, hash it locally, find the ledger row with that hash: the asset
   served is the trained rows DeepBench holds, confirmed from outside the product with no trust in a
   screen. That is `VC-SYN-001`'s "where a number came from" applied to the asset itself.
2. **Two manifests around one Teach write are the before/after `VC-EXIT-020` asks for, on the DEEP data.**
   The diff is exactly the `knowledge_entries` rows the tester wrote, attributed by `AGT-163`'s visitor.
   "The difference is what your training bought" becomes rows, not an impression, and it says the
   improvement was data, not code (`VC-EXIT-008`, `VC-EXIT-009`).
3. **It is the control the market now names for agent components.** CycloneDX's Agent BOM proposal lists
   MCP servers and tools with name, version and hash, and 2026 AIBOM practice puts system prompts in the
   BOM "with a hash and an owner" (leg 1). DeepBench's bundle is a system prompt plus a corpus served
   over MCP; today it ships without either.
4. **It is the DeepBench-side half of "governance is lost once the agent leaves"** (Wednesday signal).
   `AGT-297` fixes who called; the manifest fixes what they received. Together the serving is as
   attributable as any model turn in `ai_activity_log`.

The honest risk: read as logging it is pattern 137. What makes it P3 and not P10 is that the hash is
meant to be checked by someone who does not trust DeepBench (`VC-EXIT-027`: value travels with the asset).
A second risk is that the tester never pulls twice; leg 2 is thin on the whole MCP path (below), so the
proof once built is "servings whose hash matches a ledger row" and "Teach events whose diff appears in a
later serving", both read from rows that exist today.

## What shipped this week (from `backlog_items`, delivered/done, 2026-09-26 to 2026-10-02)

59 rows: 29 `P10 - Tooling`, 22 `P9 - Bug Fixes`, 4 `P4 - New Customers`, 2 `P6 - Agent Enhancement`;
zero in P1, P2, P3 and P5. Buyer-visible: `AGT-162`, `AGT-163`, `AGT-164`, `AGT-165`. Governance:
`AGT-138` (this routine), `AGT-280`/`AGT-281`, `AGT-312`, `AGT-132`/`AGT-133`. On `VC-SYN-001`'s open
gap: `AGT-176` and `AGT-204` stopped the ledger writing 0 where nothing was measured, so the cost column
can now say "could not tell" (a prerequisite for any later reconciliation, which stays barred).

## Leg 1: the market this week (live, dated; all *Digest*)

- *2026-09-29:* **OpenAI launched dots** at DevDay: always-on personal agents, each on its own isolated
  cloud computer with a virtual browser, reaching into Slack and Teams, powered by GPT-6 Astra; one dot per
  Pro/Business/Enterprise seat at launch; Bloomberg reports a new $500 paid tier.
  ([techcrunch.com, 2026-09-29](https://techcrunch.com/2026/09/29/openai-launches-dots-its-bubbly-agentic-avatar/);
  [bloomberg.com, 2026-09-29](https://www.bloomberg.com/news/articles/2026-09-29/openai-unveils-always-on-ai-agent-dots-new-500-paid-tier);
  [cnbc.com, 2026-09-30](https://www.cnbc.com/2026/09/30/openai-follows-meta-into-the-red-hot-market-for-personal-agents.html)).
  **Disagrees with the lead:** the Wednesday record's "4000+ apps" figure did not appear in any result
  read; dropped.
- *Undated docs page, read 2026-10-03:* **Grok Bot for teams and enterprises** records every tool call
  and how it ended, connector tool calls, routine runs, guardrail interventions and skills read;
  OpenTelemetry Export delivers each event to the customer's own collector; an opt-in stream carries MCP
  tool-call arguments and results; audit logs, OTel export, MCP allowlist and SCIM are Enterprise only.
  ([docs.x.ai/grok-bot/teams-and-enterprises](https://docs.x.ai/grok-bot/teams-and-enterprises);
  [docs.x.ai/grok-bot/security](https://docs.x.ai/grok-bot/security)). Consistent with the lead.
- *2026-09-19:* **Reinventing.AI released eight open-source AI Employees** on GitHub under MIT: eight
  roles, 59 scheduled routines, 11 harnesses (Claude Code plus ten others), each run writes a morning
  brief, "improve every run. You own the files."
  ([einnews.com press release, 2026-09-19](https://www.einnews.com/pr_news/941970685/reinventing-ai-releases-eight-open-source-ai-employees-on-github-under-mit-license);
  [github.com/markfulton/ai-employees](https://github.com/markfulton/ai-employees)). **Small
  disagreement with the lead:** 59 routines and 11 harnesses, not "~60" and "ten".
- *2026-03-25:* **Agent washing is a disclosure risk.** Debevoise: calling conventional automation
  "agentic", or overstating autonomy, reliability or business impact, carries SEC exposure; Gartner
  estimates only ~130 of thousands of vendors claiming agentic AI offer the real thing.
  ([debevoisedatablog.com, 2026-03-25](https://www.debevoisedatablog.com/2026/03/25/agent-washing-disclosure-risks-in-the-emerging-market-for-ai-agents/);
  [botmemo.com, 2026](https://botmemo.com/ai-startup-due-diligence-guide)). This is `VC-EXIT-007`'s
  reviewer, named by the market.
- *Undated issue, read 2026-10-03:* **CycloneDX Agent BOM proposal** (specification issue #895): record
  the MCP servers an agent connects to (name, version, hash), the tools it can reach (definitions, scopes)
  and the models it uses (id, version, provenance).
  ([github.com/CycloneDX/specification/issues/895](https://github.com/CycloneDX/specification/issues/895)).
- *May 2026:* **AIBOMs for verifiable provenance** (arXiv 2605.19755) extend CycloneDX with
  cryptographic validation and agent-driven automation for machine-verifiable AI provenance; 2026
  practice: model weights carry a digest and lineage, "system prompts belong in the BOM with a hash and
  an owner"; an AI BOM records "dataset snapshots, fine-tuning runs, system prompts and agent tools".
  ([arxiv.org/abs/2605.19755](https://arxiv.org/abs/2605.19755);
  [cranium.ai, 2026](https://cranium.ai/the-ai-bill-of-materials-what-to-track/);
  [kognitos.com, 2026](https://www.kognitos.com/blog/ai-bill-of-materials-aibom-procurement-guide/)).
- *2026 digests:* **Cost per task is the unit buyers now ask for.** Agents consume 5-30x the tokens of a
  chatbot per task; mid-2026 cost per task $0.03-$0.13 "and most engineering teams have zero visibility
  into it"; Anthropic's Enterprise Analytics API (March 2026) gives per-user attribution but not
  per-request; Langfuse records cost inside the trace per step.
  ([kunalganglani.com, 2026](https://www.kunalganglani.com/blog/ai-agent-cost-per-task-2026);
  [bigeye.com, 2026](https://www.bigeye.com/blog/how-to-track-ai-agent-costs-and-token-usage);
  [telerik.com, 2026](https://www.telerik.com/blogs/ai-cost-visibility-before-the-invoice)). Context for
  `VC-SYN-001`; the reconciliation proposal itself stays barred.
- *2026 digests:* **ChatGPT custom connectors require OAuth 2.1 with Dynamic Client Registration;
  bearer tokens are not accepted**; ten major clients support remote MCP with native OAuth 2.1 as of
  March 2026; Copilot Studio connects to existing MCP servers.
  ([coworker.ai, 2026](https://coworker.ai/blog/chatgpt-mcp); [truthifi.com, 2026](https://truthifi.com/education/state-of-mcp-2026-ai-agents-custom-connectors);
  [learn.microsoft.com](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent)).
  **Note for `AGT-302`:** its fix text assumes "OAuth or no-auth" will do for ChatGPT; this digest says
  OAuth 2.1 + DCR is mandatory there. Worth confirming on the page before that ticket is built.
- *May 2026:* **Memory retention has named benchmarks**: LongMemEval (500 questions; knowledge update,
  temporal reasoning, multi-session recall) and LongMemEval-V2 (451 questions over agent trajectories).
  ([alphaxiv.org/abs/2605.12493](https://www.alphaxiv.org/abs/2605.12493);
  [mem0.ai, 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026)). Read for the "knowledge loss"
  lead; see runners-up.

## What the job postings name

Not run for this lens. The postings leg is the P1 (`VC-ROOT-001`, pattern 149) instrument; P3 is tested
against buyers, acquirers and diligence, which leg 1 covers. Recorded as an omission, not padded.

## Vision-corpus grounding cited on the row

- `VC-ROOT-003` (root); `VC-SYN-001` (reviewer confirms from the product: where a number came from, that
  an improvement was data and not code).
- `VC-EXIT-007` (diligence pass, not a pitch), `VC-EXIT-008` (the pitch: training operation, not a
  software release), `VC-EXIT-009` (the acquirer buys the trained data: the manifest is that data's
  receipt), `VC-EXIT-012` (audit surface doubles as diligence surface), `VC-EXIT-020` (before/after of a
  training edit, visible), `VC-EXIT-021` (lineage that reconciles), `VC-EXIT-027` (value travels with the
  asset: the hash is for a reader who does not trust DeepBench).
- `VC-INVAR-005` (no model call where a hash serves); `VC-INVAR-015` / `VC-REJECTED-017` / `-018` (the
  manifest enumerates exactly what was served, never a padded list); `VC-REJECTED-016` (attribute from
  what the call did: the manifest is the served content, not a declared config); `VC-REJECTED-020`
  (capture the real value; masking is a display matter); `VC-REJECTED-031` (an outward number with a
  stated defense: a hash and a row list are their own defense); `VC-REJECTED-042` (not storing a fact a
  live source owns: rows change after serving, so what-was-served has no other home).
- `VC-THESIS-021` tiebreaker: a procurement director reads a packing slip on a delivered knowledge
  product; a VP of Product reads an agent BOM over MCP, a term the market is standardising this year.
- Patterns 137 and 149 applied to every candidate below.

## The runners-up and why they ranked lower

1. **The ledger exported as OpenTelemetry GenAI spans** (`VC-EXIT-012`). Grok Bot Enterprise ships OTel
   export and Microsoft's observability push is on OTel GenAI conventions. Killed on pattern 137: an
   export is an administrative expectation of an enterprise product, easy to replicate, and the reviewer
   it serves already has the AI Audit and SQL. Cheapest variant if John ever wants it: a `security_invoker`
   view mapping `ai_activity_log` columns to `gen_ai.*` attribute names, one cycle.
2. **Knowledge retention measured across sessions** (the Wednesday "best lead"). The market has named
   instruments (LongMemEval, LongMemEval-V2). Killed on leg 2: the platform holds 0 conversation records
   and 0 customer profiles, so there are no sessions to measure loss across; and DeepBench's design puts
   knowledge in rows, not session context, so the measurable claim is the survivor's diff, not a memory
   score. Any graded re-ask belongs to `AGT-74` (Skill before/after) or `AGT-302` (graded from a
   non-Claude client), both open.
3. **"What your training bought" rendered on the Connect page from two manifests.** The visible half of
   the survivor; ranked lower because it depends on the survivor and on a second serving existing. Second
   cycle if the first proves out.
4. **ChatGPT-ready transport (Streamable HTTP + OAuth 2.1 + DCR).** Real gap per leg 1, but it is
   `AGT-302`'s first step and `AGT-297`'s neighbour; filed, not invention. The OAuth 2.1 + DCR note above
   is handed to that ticket.
5. **Killed before the shortlist:** cost reconciled to the provider's bill (barred, two refusals);
   Skill authorship on the record (barred, two returns); per-caller MCP identity (`AGT-297`, filed);
   bundle export "you own the files" parity with the MIT agent team (the bundle over MCP already is the
   export; the differentiator is the attributed, hashed training record, which is the survivor).

**Heal-lane notes, not inventions:** (a) `AGT-302` assumes "OAuth or no-auth" for ChatGPT; leg 1 says
OAuth 2.1 + DCR is mandatory there. (b) The Connect page tells the tester to leave the key blank, which
means every Brittany serving is attributed to Anthropic's egress IP until `AGT-297` lands; the survivor's
manifest is independent of that fix but is more useful after it.

## How it reaches the build queue

**Ingested, not filed as a ticket.** `public.file_invention_proposal()` was not called and
`public.invention_due()` (which returned `due=true, allowed=2`) was read only to set the volume cap.
Per `docs/runbooks/researcher-routine.md` step 3 the proposal reaches the intake as a finding for The
Development Manager's ruling through `scripts/audit-review.js`:

```
node scripts/audit-ledger.js --ingest=proposals.json --week=2026-W40 \
  --found-by=researcher:weekly-market --type=proposal --session-name=researcher-2026-W40 --apply
```

Ledger result: `ingest 2026-W40: 4 findings, 4 new, 0 seen, 0 recurring, 0 ruled-out` (exit 0). All
four rows are `open` under `found_by='researcher:weekly-market'`: one `proposal` (the survivor below),
two `defect`, one `gap` (the three routine-correctness findings in *Findings filed* below). The
`researcher` row in `finding_routes` (precedence 30) routed them without an `unmapped source` raise.

This is the first ever researcher ingest — `audit_findings` held zero rows under any `researcher%`
`found_by` before this run, because the 2026-09-26 run predated `AGT-138` (delivered 2026-09-28) and
followed the interim prompt's "list them in the report" path instead.

## The usage signal that proves it

Leg 2, from the platform figures in the task context (2026-10-02) and fresh repo reads (2026-10-03):

- 59 items delivered/done in the window: 29 P10, 22 P9, 4 P4, 2 P6, 0 P3.
- 0 `customer_profile` rows, 0 conversation records, Bench Report Card run 3 times all-time.
- Every reasoning call in the last 30 days was Anthropic (vendor-independence claim unexercised; `AGT-302`).
- `api/_lib/handlers/agent-bundle.js` (v7.0.682): bundle has no hash or version; ledger call_facts hold
  counts only. `api/_lib/mcp.js` (v7.0.684): MCP key name becomes `visitor_id`; `AGT-297` records that
  no tester key exists, so Brittany's servings are attributed to a shared IP today.
- Visitor pull, stated plainly: the MCP path has one intended outside caller and the Report Card has
  run three times; no figure here is a pull signal. The proof once built: servings whose manifest hash
  matches a ledger row (should be 100% by construction), Teach writes whose row ids appear in a later
  serving's manifest, and the first manifest diff a reader other than John requests.

**Thinness, stated plainly:** leg 1 is digest-only (the proxy refused every page in the parent's probe),
which is enough to establish the shape (agent BOMs with hashes are a 2026 control; agent washing is a
named diligence risk; competitors log every MCP call) but not a usage number. Leg 2 shows an idle product
surface. One survivor, cheapest variant, is what that evidence supports.

## Where I confirmed or contradicted the week's market records

Method: the Wednesday scan's rows are LEADS. Every claim below was re-checked against its own
original source this run, and the citation is that source, never the record.

### Confirmed

- **OpenAI dots is real and dated as recorded.** Announced 2026-09-29, always-on agents on GPT-6
  Astra, each with its own cloud computer, reaching 4,000+ apps through the plugin ecosystem, with
  the first primary dot included on eligible plans
  ([9to5google](https://9to5google.com/2026/09/29/openai-dots-agent/),
  [unite.ai](https://www.unite.ai/openai-rolls-out-dots-agents-powered-by-gpt-6-astra-in-chatgpt/),
  [bravenewcoin](https://bravenewcoin.com/insights/openai-launches-dots-ai-agent-across-4000-apps-after-gpt-6-astra-delay)).
- **Reinventing.AI's AI Employees is real, MIT, and free.** Released 2026-09-19 under the MIT
  license at `github.com/markfulton/ai-employees`; the eight role names in the record match the
  repo exactly (GTM Engineer, SEO/AEO, Web Dev, Social Media, Ad Manager, Sales, Customer
  Satisfaction, Chief of Staff); commercial use included, no membership required
  ([GitHub](https://github.com/markfulton/ai-employees),
  [EIN Presswire](https://www.einpresswire.com/article/941970685/reinventing-ai-releases-eight-open-source-ai-employees-on-github-under-mit-license),
  [Enterprise DNA](https://enterprisedna.co/resources/news/reinventing-ai-open-source-ai-employees-github-mit-2026/)).
- **Hazel AI is a bigger incumbent than the record implies, and its Spend Visibility module is
  real.** The record says only that the home page "lists a Spend Visibility module with no
  description." Confirmed as a module, and the fuller picture matters: Hazel manages about $50B in
  annual procurement with City of Dallas, City of Atlanta, City of Houston, PhilaPort, State of
  Tennessee and the U.S. Air Force named as customers, pricing on request
  ([welcome.ai](https://www.welcome.ai/solution/hazel),
  [Lynx Collective](https://lynxcollective.substack.com/p/startup-profile-hazel-the-ai-procurement),
  [Crunchbase](https://www.crunchbase.com/organization/hazel-22bb)).
- **Off-contract spend and contract leakage carry real money**, which is what makes contract
  coverage a commercial question and not a reporting curiosity: off-contract
  spend costs 12-18% more than it should, contract value leakage drains about 9% of contract value
  a year, and the SLED market exceeds $1.5T across 90,000+ entities
  ([Varisource](https://www.varisource.com/blog/procurement-cost-reduction-strategies-levers-guide),
  [Execo](https://www.execo.com/blog/7-ways-cpos-will-stop-contract-value-leakage-in-2026),
  [SLED AI](https://www.sledai.com/blog/sled-contracting-statistics-2026/)).

### Contradicted or materially corrected

- **CONTRADICTED — "NIGP lists no software" is wrong as stated.** The 2026-10-02 NIGP pitch records
  build the opportunity on NIGP having the trust and the Code but no software offering. NIGP has a
  named technology partner for the NIGP Code, Periscope Holdings, whose NIGP Code is used by over
  1,400 agencies, and Periscope publishes a co-branded NIGP buyer-solutions page for sourcing and
  procurement; NIGP also runs a partners-and-affiliations program and cooperative purchasing
  programs including OMNIA Partners and PEPPM
  ([NIGP Code / cooperative programs](https://www.nigp.org/our-profession/cooperative-purchasing-programs),
  [NIGP partners](https://www.nigp.org/about-nigp/partners-and-affiliations),
  [Periscope NIGP buyer solutions](https://www.periscopeholdings.com/buyer-solutions/nigp)).
  This does not kill the pitch — Periscope's partnership is the commodity *code*, not a spend
  dashboard on an agency's own exports, and Periscope/Sovra is also the named likely acquirer
  (`VC-EXIT-005`). But the sentence "nobody sells them the view" must not be said to a VP at NIGP
  who knows the Periscope relationship. Say instead: NIGP's existing technology partnership covers
  the Code, not the agency's own spend view.
- **CORRECTED — the dots objection overstates the threat on multi-agent ground.** The record's
  answer to "why not OpenAI dots" concedes reach and brand. It omits the limit that matters most
  here: **at launch each user can create only one dot**, with multiple agents and scaling "planned
  for later" ([unite.ai](https://www.unite.ai/openai-rolls-out-dots-agents-powered-by-gpt-6-astra-in-chatgpt/),
  [i10x](https://i10x.ai/news/openai-dots-gpt-6-astra-ai-agents)). DeepBench's cooperating-named-agents
  claim has no equivalent in dots today. That is a true, dated, checkable difference and it is
  currently unsaid.
- **CORRECTED — plan-tier wording.** The record lists dots as included for "Pro, Business, Premium
  and Enterprise." The sources name **Pro, Business Premium, and Enterprise** — "Business Premium"
  is one plan, not two
  ([unite.ai](https://www.unite.ai/openai-rolls-out-dots-agents-powered-by-gpt-6-astra-in-chatgpt/)).
- **CORRECTED — routine count.** The record says Reinventing.AI carries "about 60 scheduled
  routines." The repo header says 60; the release write-up counts 59
  ([GitHub](https://github.com/markfulton/ai-employees),
  [Enterprise DNA](https://enterprisedna.co/resources/news/reinventing-ai-open-source-ai-employees-github-mit-2026/)).
  Either is defensible; "about 60" is fine, "60" as a hard number is not. The harness count is
  eleven in total (Claude Code plus ten others), which matches the record.
- **SHARPENED, not contradicted — the free-alternative objection is worse than recorded.** The
  record frames the free agent team as costing "nothing new" on plan allowance. The stronger fact
  is ownership: the roles are plain files on the buyer's own machine, MIT-licensed, commercial use
  included, no subscription ([GitHub](https://github.com/markfulton/ai-employees)). "You own your
  agent" is therefore not by itself a differentiator against this competitor — it is the thing the
  competitor also offers, for free. The lead claim needs the part the files cannot do.

### Not verified this run — do not quote

- **Claude subscription plan prices** (the record's "Pro $20/mo, Max from $100, Team Standard
  $20/seat and Premium $100/seat, Enterprise $20/seat"). I could not verify these against a primary
  source this run: `WebFetch` is blocked platform-wide by the egress proxy (below), and I did not
  get a primary pricing page through search. The figures may well be right; this report does not
  assert them, and the Development Manager should treat them as unconfirmed until a run reads the
  pricing page directly.

## Egress, measured

`WebSearch` works and ran live this session. `WebFetch` is **blocked by the network egress proxy on
every domain tried** (`www.hazelai.com`, `www.jaggaer.com`, `en.wikipedia.org` all returned
`EGRESS_BLOCKED`), so every claim above rests on search-result text rather than a fetched page.

This **inverts** what `docs/runbooks/researcher-routine.md` records verbatim from `runner-cycle.md`
step 4b, twice: *"THIS ROUTINE'S `allowed_tools` CARRIED `WebFetch` ONLY, NOT `WebSearch`"*, with
`egress = 'blocked'` named as the EXPECTED answer on every cycle until John adds `WebSearch`. The
live tool list is the other way round. Two consequences:

1. **Precondition C3 is closed.** This run's `egress` is `ok` — the first recorded live search
   leg. The runbook says the first `egress = 'ok'` closes C3 permanently; recording that here.
2. The runbook's two `WebFetch`-only paragraphs are now wrong in both directions and will mislead
   the next reader into expecting a skip. Filed as a finding below, not edited here — the method
   text is kept verbatim by `SES-335`'s retirement rule, so changing it is a ticket, not a
   drive-by edit.

### One reconciliation inside this run

The research pass dropped the Wednesday record's "**4,000+ apps**" figure for dots as unsourced in
its own reads. My searches did surface it, from three independent sources, so I keep it as confirmed
and record the disagreement rather than hiding it: 9to5google, unite.ai ("more than 4,000 apps") and
bravenewcoin's headline all carry it
([9to5google](https://9to5google.com/2026/09/29/openai-dots-agent/),
[unite.ai](https://www.unite.ai/openai-rolls-out-dots-agents-powered-by-gpt-6-astra-in-chatgpt/)).
The pass also surfaced one fact no record holds and my own searches missed: **dots arrived with a new
$500 paid tier**, which prices always-on agents as a premium seat rather than a bundled feature
([Bloomberg](https://www.bloomberg.com/news/articles/2026-09-29/openai-unveils-always-on-ai-agent-dots-new-500-paid-tier)).
Sources also disagree on the included tier's name (Pro / Business Premium / Enterprise vs Pro /
Business / Enterprise); treat the tier naming as unsettled and do not quote a seat price from it.

## Proposals (allowed = 2; returned 1) — in the filing shape, for The Development Manager

An honest one beats a forced two. The second slot is deliberately empty: the runner-up (the ledger
exported as OpenTelemetry GenAI spans) fails pattern 137 as an administrative expectation easy to
replicate, and the "knowledge retention measured across sessions" lead has no subject — 0 conversation
records and 0 customer profiles, so there are no sessions to measure loss across.

### Proposal 1 — Knowledge bundle ships with its bill of materials, and the serving is on the record

| Field | Value |
|---|---|
| `priority_class` | `P3 - Investor Value` |
| `predicted_cycles` | 1 |
| `claim_refs` | `VC-ROOT-003`, `VC-SYN-001`, `VC-EXIT-007`, `VC-EXIT-008`, `VC-EXIT-009`, `VC-EXIT-012`, `VC-EXIT-020`, `VC-EXIT-027`, `VC-INVAR-005` |
| `kind` / `confidence` | `other` / `medium` |
| `locations` | `api/_lib/handlers/agent-bundle.js`, `api/_lib/mcp.js`, `src/screens/ConnectScreen.jsx` |

**`enhancement_claim`** — A skeptical reviewer can prove from outside DeepBench, through a standard MCP client, that the knowledge bundle an agent serves is exactly the trained rows DeepBench holds, and that a Teach write changed exactly those rows: the 'training operation, not a software release' pitch (VC-EXIT-008) confirmed from the product (VC-SYN-001, VC-EXIT-012).

**`scope_rationale`** — Smallest variant that proves the claim: a manifest (bundle hash, per-row ids and hashes, served_at) added to agent-bundle.js's return and substituted for the counts in its existing ledger call_facts. One file plus its regression test; no new table, no migration, no model call, no screen change. The Connect-page rendering of the diff is a separate follow-on and is not in scope.

**`description`** — P3 - Investor Value. AGT-162's own ticket says the blank agent's knowledge is 'provably what he taught it', and the Connect page leaves that proof to the tester's eye ('The difference is what your training bought'). Measured 2026-10-03 in api/_lib/handlers/agent-bundle.js (v7.0.682): the bundle returned over MCP carries no content hash and no bundle version, and the ledger row it writes records counts only (role_prompts: n, knowledge_entries: n), not which rows were served. So a reviewer cannot match what arrived in Claude to a row DeepBench holds, and two pulls around a Teach write cannot be diffed to show that exactly the taught rows changed. Fix: the response gains a manifest (SHA-256 over the canonical bundle content; one line per served row with table, id, created_at or updated_at, per-row hash; served_at), and the same manifest replaces the counts in the existing logActivity call_facts. No new table, no model call (VC-INVAR-005), no change to the Teach path. Pull test: a skeptical architect (VC-EXIT-007) pulls the bundle from any MCP client, hashes it locally and finds the ledger row with that hash, confirming from outside the product that the served asset is the trained rows the acquirer is buying (VC-EXIT-009, VC-EXIT-012, VC-SYN-001). Two manifests around one AGT-163-attributed Teach write diff to the taught rows: the before/after of VC-EXIT-020, showing the improvement was data, not code (VC-EXIT-008). Market: CycloneDX's Agent BOM proposal records MCP servers and tools with name, version and hash (github.com/CycloneDX/specification/issues/895, read 2026-10-03); 2026 AIBOM practice puts system prompts in the BOM with a hash and an owner (arXiv 2605.19755, May 2026); agent washing is a named SEC disclosure risk (Debevoise, 2026-03-25); Grok Bot Enterprise logs every MCP tool call (docs.x.ai, read 2026-10-03). Honest risk: read as logging it is pattern 137; what makes it P3 is that the hash is for a reader who does not trust DeepBench (VC-EXIT-027). Regression: the manifest enumerates exactly the rows served and nothing else (VC-REJECTED-017/-018); a serving with zero knowledge_entries lists zero, never a placeholder. Research: docs/research/2026-10-03-weekly-market.md (leg 1 digest-only, leg 2 thin: 0 customer profiles, Report Card run 3 times all-time). Intake fields for the Development Manager: kind other; locations api/_lib/handlers/agent-bundle.js, api/_lib/mcp.js, src/screens/ConnectScreen.jsx; confidence medium.

## Findings filed besides the proposal (routine correctness, found this run)

All three are live reads from 2026-10-03, all `open` in `audit_findings`:

1. **`defect`, high — the egress note in both runbooks is backwards.** See *Egress, measured* above.
   `WebSearch` works, `WebFetch` is proxy-blocked; the runbooks record the inverse and name a skip as
   expected. Precondition C3 is closed by this run.
2. **`gap`, high — `napkin_ideas` is not a reversible table.** Step 1 requires each Napkin write under
   its own §19v before-image. `public.reversible_tables()` returns 17 tables and `napkin_ideas` is not
   one, so `attach_before_images()` would refuse the batch (SES-399 fail-closed) and
   `reverse_decision()` cannot replay a Napkin write. This run wrote the five images (one per idea,
   `decision_id` NULL), so the audit record exists — but §19v's promise, "Reverse restores it exactly",
   is unkeepable for the only table this routine writes. Either widen `reversible_tables()` and
   `reverse_decision()`'s `k_allowed` together, or say in Step 1 that the image is an audit record and
   not a reversal handle.
3. **`defect`, medium — `finding_routes` disagrees with its own note and with the runbook.** Step 3 and
   the row's own `note` both say the `researcher` row carries `project_slug NULL`; the column reads
   `dev-mgr-findings`. Routing works, so nothing is broken today, but "NULL so the manager picks" and
   "pinned to dev-mgr-findings" are different behaviours. The `staff-watch` and `ticket-owner` rows
   carry the same mismatch, so the fix is a sweep of three rows, not one.

Separately, `node scripts/check-routine-prompt.js --routine=researcher` exited **1** as
`AGT-138` predicts: the live trigger still runs its 2026-09-25 interim text (the paragraph deferring to
this playbook, and the `SES-369` sentence) until John runs the `RemoteTrigger update`. That is expected
drift, not a defect, and the drift check files its own finding — not duplicated here.

## The Napkin

Five ideas were due (`researched_at` NULL or older than `updated_at`, excluding `done` and `parked`).
Ids and verdicts only — **this repository is public and the ideas are not.** Each note was written back
to `research_note` with `researched_at = now()`, one `UPDATE` per idea under its own before-image;
`text`, `status`, `note` and `nathan_note` were not touched.

| Idea id | Verdict |
|---|---|
| `n_6fa3f54851ba42cd88094a1384a78bc8` | VALIDATED |
| `n_33ddb91ebfdf406fa939ea772b874226` | VALIDATED |
| `n_ecde38e323f6474a87b79b0d85090bd3` | WEAK |
| `n_fc2e55f01d1a40e7a0db1a2eb1987522` | GO DEEPER |
| `n_bf9d2004931443b9967ce6188365301b` | WEAK |

Two VALIDATED, one GO DEEPER, two WEAK. The GO DEEPER carries the one question that decides it, as the
verdict requires. Nathan Laan's `nathan_note` on two of the five was read as a lead and left unchanged.

## Run accounting

| Item | Value |
|---|---|
| Routine | `researcher-weekly-market`, cron `0 9 * * 6` UTC (Sat 4:00 AM CDT) |
| Playbook followed | `docs/runbooks/researcher-routine.md` (on `origin/dev`) — **switched off the interim prompt** |
| Session name | `researcher-2026-W40` |
| Branch | `session/researcher-20261003` → pushed `HEAD:dev` |
| Lens | `P3 - Investor Value` (P2/P3 tie at 0 ratified; P3 fewer proposed, 89 vs 95) |
| Prompt assembly | `scripts/agent-prompt.js --agent=researcher --capability=research-class-lens --intent=rs-research-intent --task-file=…` (task FILE form; never hand-built) |
| Sub-agent model | `claude-fable-5-1` — the judgment lane, as `agent-prompt.js` printed it |
| Turn logged | `scripts/agent-log.js` → `ai_activity_log` id **65209**, `call_source=session`, `cost_usd` NULL, tokens recorded **unmeasured** (the harness reported one cumulative figure, 126,421, not an input/output split; a half-invented split is not a measurement) |
| Egress | `ok` — 8 live `WebSearch` queries; `WebFetch` proxy-blocked on every domain |
| Ledger | `ingest 2026-W40: 4 findings, 4 new, 0 seen, 0 recurring, 0 ruled-out` |
| Invention filing | `file_invention_proposal()` **not called**; neither it nor `invention_due()` is retired |
| Version claim | none — this is not a builder cycle, and there is no `runner_cycles` row |
| Notifications | none sent (push, email and Slack all `false`; John turned phone notifications off 2026-09-25) |
