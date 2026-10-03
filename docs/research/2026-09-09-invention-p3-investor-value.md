<!-- DeepBench v7.0.429 | docs/research/2026-09-09-invention-p3-investor-value.md | AGT-64 — THE RESEARCHER'S
     FIRST RUN. Capability `research-class-lens`, agent `researcher` (GV-02, governance lane), model
     claude-fable-5-1, run attended 2026-09-09 under session design-runner-24h-0908 as AGT-64's
     discriminating QA. The system prompt was assembled by scripts/agent-prompt.js (SES-331) — the
     executor's own assemblePrompt(), never hand-built; leg 1 ran on live web search (egress ok, 9
     searches, 11 fetches, 2 x 403 dropped rather than cited), leg 2 on the platform-usage figures read
     from Supabase this session. NOTHING WAS FILED: invention_due() reads due=false (rung-0 floor, last
     invention decision 2026-09-03), and filing is SES-335's handoff, not this ticket's. The body below
     is the model's returned `research_doc` verbatim. -->

# 2026-09-09 Invention Pass, Lens P3 - Investor Value: research leg

**Lens:** `P3 - Investor Value`, chosen by the census read live 2026-09-09: P1 ratified 6 / proposed 31; P2 0 / 54; P3 0 / 45; P4 1 / 37. Fewest ratified ties P2 and P3 at 0; fewest proposed breaks it for P3 (45 < 54). The P1-first rule applies only to a full tie, which this was not.
**Root claim:** `VC-ROOT-003` - new features that add investor / buyout value. **Allowed:** 1 (attended QA run; `invention_due()` itself says `due=false`, rung-0 floor until 2026-09-10; nothing is filed from this pass).
**Egress:** live web search worked this turn. Two fetches returned 403 (a Quartz piece on AI spending caps and a Medium post on acqui-hire pricing) and are not cited.

## The pitch

The locked pitch (`VC-THESIS-002`) says improving an agent is a training operation, not a software release. Today the platform can grade an answer (the judge Capability already writes `bench_report_card_rollup` rows for two agents, judged 2026-09-03) but nothing shows what happens after you act on the grade. Edit a Skill row and the score does not move, because nothing re-judges.

The proposal is **Training Delta**. When a Skill row is saved, the platform re-runs the existing judge Capability, through the generic executor, over the stored hops of that Agent's last judged runs using the new Skill text. It writes new score rows stamped with the Skill version and shows old vs new on the Agent profile, naming the Skill that changed. The first real case is already in the data: one judged agent row scores `avg_skill_use` 2 with `lowest_skill` `ci-answer-intent`. Edit that Skill, replay, watch the number.

Why this is P3 and not P1: the value travels with the asset (`VC-EXIT-027`). An acquirer's architect (`VC-EXIT-007`) can verify from rows that quality moved with no deploy in between. It makes `VC-EXIT-020` ("skill/RAG edits changing agent behavior visibly, before/after") literally true.

## What the market says (live, dated)

- **Eval-plus-observability surfaces are being bought.** ClickHouse acquired Langfuse (observability, evals, prompt management; 19 of the Fortune 50) on 2026-01-16 to close what it calls an AI trust gap ([ClickHouse blog](https://clickhouse.com/blog/clickhouse-acquires-langfuse-open-source-llm-observability)). Dynatrace agreed to buy Arize for $915M on 2026-08-13, saying eval tooling and production monitoring are still fragmented and it wants them joined end to end ([Yahoo Finance](https://finance.yahoo.com/technology/ai/articles/dynatrace-acquire-ai-observability-leader-100000125.html)). This is `VC-MAP-013` and `VC-EXIT-017` confirmed twice in eight months.
- **Diligence now asks whether the team can explain what the AI wrote.** A 2026-08-10 technical-diligence checklist adds AI-code provenance and names the demo-vs-fixable gap as what buyers hunt ([justinmckelvey.com](https://justinmckelvey.com/blog/technical-due-diligence)). A before/after that is reproducible from stored rows is the direct answer.
- **Regression on prompt change is the unsolved norm.** A 2026-06-12 practitioner piece cites Snyk's 2026 State of AI Code Security (second-hand; I did not retrieve Snyk directly) that 74% of production agent teams have no automated regression test before a prompt change ships, and reports a client dropping from ~4 regressions a month to 1 a quarter after adding it ([velsof.com](https://www.velsof.com/ai-automation/ai-agent-continuous-evaluation/)).
- **Unit costs are now expected to exist.** State of FinOps 2026 (1,192 respondents, $83B): 98% of practitioners manage AI spend, and the recommended units are cost per query, per user-month, per workflow completion, per transaction ([compresr.ai, 2026-08-04](https://compresr.ai/blog/ai-finops-definitive-guide-costs-and-value)). Outcome pricing is live: Zendesk ~$2/resolution, HubSpot Breeze $0.50/resolved conversation, Agentforce ~$0.10/action ([The Pricing Conundrum, 2026-06-09](https://thepricingconundrum.substack.com/p/outcome-based-pricing-in-practice)). Supports the runner-up, not the survivor.
- **MCP monetization is real but immature.** Most directories are free boards; only MCP Marketplace, Apify and MCPize take payments; freemium converts ([mcp-marketplace.io, 2026-03-03](https://mcp-marketplace.io/blog/state-of-mcp-monetization-2026)).
- **The named strategic acquirer is investing in exactly this.** SOVRA (Periscope's parent, 7,000+ agencies) named a new CTO and board member on 2026-08-03 to accelerate AI embedded in the procurement platform, framed on transparency, compliance and governance ([PR Newswire](https://www.prnewswire.com/news-releases/sovra-strengthens-leadership-team-to-accelerate-next-generation-of-ai-powered-public-procurement-302840609.html)). `VC-EXIT-005` and `VC-EXIT-028` stay live.

## What the job postings name

Not run for this lens. The postings leg is the P1 (`VC-ROOT-001`, pattern 149) instrument; P3 is tested against buyers and diligence, which the market leg above covers. Recording the omission rather than padding it.

## Vision-corpus grounding cited on the row

- `VC-EXIT-020` - P3 features make the locked pitch demonstrable live: skill/RAG edits changing behavior visibly, before/after.
- `VC-INVAR-024` / `VC-THESIS-002` - improving an agent is a content/training operation in Supabase, not a software release.
- `VC-EXIT-007` - the success test is a skeptical technical diligence pass.
- `VC-EXIT-027` - P3 value travels with the asset; this feature's value dominates on the asset side.
- `VC-INVAR-015` - honest absence: where the judge returns Unknown (one judged row has `unknown_rate` 1 and null groundedness), the delta shows a gap, never a fabricated score. `VC-REJECTED-017` and `VC-REJECTED-027` are respected: no padded zeros, no blended average across different score kinds.
- `VC-EXIT-026` (anti-P3) is the check I applied to every runner-up: a dashboard without new mechanism does not pass.

## The runners-up and why they ranked lower

1. **Cost line per deliverable, reconciled from `ai_activity_log`** (`VC-EXIT-025`, `VC-EXIT-021`). The market leg is strongest here (FinOps units, outcome pricing) and the usage leg shows 26,611 real model calls to cost while the spend-analysis screen originated only 6 calls in 30 days. It ranked second because the runner side already keeps cost tables I could not read this turn, so I cannot say whether the per-deliverable line is new mechanism or a re-render; filed under `VC-EXIT-026` risk until that is checked.
2. **Priceable Competency over MCP** (`VC-EXIT-024`, `VC-THESIS-007`). One-leg lead: the task context carries no MCP or export usage figure, and the market says monetization is still mostly free boards.
3. **Per-Agent spend governor** (`VC-EXIT-022`). Real demand, but a budget cap is an administrative expectation (pattern 137) that classifies by function, not as investor showcase.
4. **Lineage completeness** (`VC-EXIT-021`, `VC-INVAR-018`). 1,481 of 1,661 `ai_activity_log` rows in the last 30 days (89%) carry a null `screen_origin`, and 30,562 rows have no `call_source`. This matters to diligence more than anything above it, but it is a Heal-lane fix of existing telemetry, not an invention. I'd route it to the hygiene queue rather than file it as P3.

## How it reaches the build queue

Nothing is filed from this pass: `invention_due()` read live says `due=false` (rung-0 floor, last invention decision 2026-09-03 02:38:27+00). When a pass is due, `public.file_invention_proposal()` files the survivor as a `backlog_items` row (`scope_origin` enhancement, class `P3 - Investor Value`, `enhancement_claim` `none: ...`, `predicted_cycles` 3) plus its own decision; the 72-hour window ratifies. The LOG-143 research recorded that an admitted enhancement is only served once linked to a Selfbuild epic (`SES-321`); the same linkage step applies here.

## The usage signal that proves it

All figures from the task context, measured 2026-09-09; none invented.

- `bench_report_card_rollup`: two agents judged, one run each on 2026-09-03; one row `avg_skill_use` 2 with `lowest_skill` `ci-answer-intent`; the other `unknown_rate` 1, `avg_groundedness` null. The judge works and already names a Skill to edit.
- `report_card_usage`: 3 rows. `ai_activity_log` `screen_origin='teach'`: 1 call in 30 days. The training surface is nearly untouched, which is the gap the feature closes: today a Skill edit has no visible consequence.
- `call_source='ui'`: 4,110 rows from 25 distinct visitors, last seen 2026-08-23. No visitor-attributed UI call in the 17 days before measurement, so the honest statement is that the usage leg proves the mechanism exists, not that visitors are pulling on it yet.
- The proof once built: count of Skill-version-stamped score rows whose before and after differ, over a rolling window, and the share of Skill saves that produced a replay. Both are rows the feature writes itself; no new telemetry is needed.

**Thinness, stated plainly:** the survivor rests on a strong market leg and a small but real usage leg (the rollup rows exist; volume is one run per agent). I returned one survivor because both legs point at the same mechanism and the cheapest variant reuses what already runs; I would have returned zero if the rollup were empty.
