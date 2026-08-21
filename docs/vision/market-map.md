<!-- DeepBench v7.0.134 | docs/vision/market-map.md | SES-84 phase 1 — Claude's best-inference draft, 2026-08-21. NOTHING here is ratified until John's tap; confidence marks are the drip queue. -->

# Market Map — Competitors, Neighbors, and DeepBench's Whitespace

Defines **P2 - Inventive** concretely and feeds the Invent engine (§19v): the nearest comparable products, what they do and don't do, and where genuine whitespace is.

## Category 1 — Developer orchestration frameworks (code-first)

- [C-MAP-1] (MED) The consolidated 2026 framework field is LangGraph (largest enterprise production footprint), CrewAI (fastest prototyping, role-based crews), Microsoft AutoGen (research/conversation-pattern leader), plus OpenAI's Swarm/AgentKit for narrow handoffs. — *grounds:* outside: presenc.ai "Multi-Agent Orchestration Frameworks 2026"; turing.com framework comparison; dev.to LangGraph-vs-CrewAI-vs-AutoGen 2026 guide.
- [C-MAP-2] (MED) ~28% of production multi-agent deployments in 2026 still use custom orchestration — the frameworks have not won the harness layer. — *grounds:* outside: presenc.ai 2026 research note.
- [C-MAP-3] (HIGH) What they don't do: agents are code artifacts — changing an agent is a software release. DeepBench's agents are data rows (Skills → Capabilities → Agents, many-to-many), so improving quality is "a training operation, not a software release." — *grounds:* ARCHITECTURE.md §0 [LOCKED], §2; the Generic Capability Executor (§19b: "never hand-roll a capability route; everything is data").
- [C-MAP-4] (MED) These frameworks are DeepBench's infrastructure peers, not competitors for a buyer: none ships an end-user product, personas, or deliverables — but any diligence reviewer will benchmark DeepBench's harness against them. — *grounds:* inference; C-EXIT-7 skeptic-eye bar.

## Category 2 — Enterprise agent platforms (suite-attached)

- [C-MAP-5] (MED) Salesforce Agentforce, Microsoft Copilot Studio, Moveworks (ServiceNow), and UiPath anchor the enterprise segment: agents attached to an existing suite's data and distribution. — *grounds:* outside: noca.ai "Digital Employees: Top 10 Platforms for 2026"; erp.today "AI Agents as Digital Coworkers" (2026).
- [C-MAP-6] (MED) What they don't do: cross-suite generality and transparent internals — their agents are configuration inside a closed suite; audit/attribution exists for admins, not as an end-user product surface. — *grounds:* inference from outside sources above; contrast with DeepBench's AI Audit screen (§19m) being a first-class user screen.
- [C-MAP-7] (MED) The market frame is large and validating: AI agents market ~$12B in early 2026, projected ~$52.6B by 2030; 40% of applications expected to deploy autonomous agents by end of 2026. — *grounds:* outside: litslink.com "AI Agents Market Statistics 2026"; noimosai.com digital-workforce outlook.

## Category 3 — Agent-workforce / "digital employee" products (nearest in spirit)

- [C-MAP-8] (MED) The closest-in-concept products sell named digital workers for one function: Sierra (customer service), 11x and Artisan (AI SDRs, $75M+ raised behind 11x), Lindy and Relevance AI (generalist assistant/workforce builders). — *grounds:* outside: quiq.com "Sierra AI Competitors 2026"; 11x.ai comparison guides; noca.ai top-10 digital-employee platforms.
- [C-MAP-9] (MED) What they don't do: (a) they are single-function verticals, not a bench of collaborating specialists producing a joint deliverable; (b) the persona is marketing skin over one pipeline, not a data-modeled competency; (c) inter-agent orchestration is invisible or nonexistent. — *grounds:* outside sources above; inference; contrast with §19d Agent Loop + Michelle-brokered delegation (RULE #1: no agent's data names another agent).
- [C-MAP-10] (MED) Their weakness is DeepBench's stated lesson: output volume without inspectable quality ("zero quality leads despite high outreach volume" reported against AI SDR products) — exactly the final-output-only failure John rejected with the house/contractors analogy. — *grounds:* outside: 11x.ai/getbreakout.ai comparison content re Artisan reviews; John 2026-07-16 contractor analogy → §19r/§19s.

## Category 4 — Observability / evaluation layers (bolt-on developer tools)

- [C-MAP-11] (MED) The 2026 observability field: LangSmith (LangChain-native), Langfuse (open-source leader, acquired by ClickHouse Jan 2026), Arize Phoenix (OTel-native), Braintrust, Helicone, Datadog/Honeycomb LLM observability. — *grounds:* outside: marktechpost.com 2026-08-09 platform roundup; confident-ai.com and arize.com 2026 comparisons.
- [C-MAP-12] (HIGH) What they don't do: they instrument someone else's app for developers. DeepBench's audit (ai_activity_log lineage, pattern tracking §19i/§19k, Platform Services directory §19m, live Audit Pipeline Log column) is built into the product for the end user and the buyer. — *grounds:* repo: §19i/§19k/§19m; CHI col-3 Audit Pipeline Log (memory `project-mi-screen-layout.md`).
- [C-MAP-13] (MED) The ClickHouse-Langfuse acquisition signals that audit/eval surfaces are acquisition-grade assets on their own — supporting the exit thesis that DeepBench's honest-audit layer carries standalone value. — *grounds:* outside: marktechpost.com (Langfuse acquisition, Jan 2026); cross-ref C-EXIT-17.

## Category 5 — Skills / agent marketplaces (distribution layer)

- [C-MAP-14] (MED) A skills/MCP marketplace layer emerged in 2026: Agensi (curated SKILL.md + MCP marketplace, 80/20 creator split), Smithery (largest MCP registry), Salesforce AgentExchange; SKILL.md is becoming a cross-agent open standard. — *grounds:* outside: agensi.io marketplace landscape 2026; mintmcp.com "AI Agent Marketplaces: 2026 Landscape"; totalum.app skills-marketplace comparison.
- [C-MAP-15] (MED) What they don't do: they distribute atomic skills/tools, not trained competencies with attribution history. DeepBench's priceable, MCP-accessible Capabilities (§0b) plus per-capability audit lineage is a differentiated marketplace unit no registry offers. — *grounds:* §0b; John 2026-07-15 "individually marketable"; inference.
- [C-MAP-16] (HIGH) John is tracking the interop standards himself and knows conformity is open: "so today's standard is mcp, a2a, and acp. Am I practicing any of those?" — standards alignment is a named gap, and closing it is P2 work. — *grounds:* John 2026-08-07 (verbatim).

## DeepBench's genuine whitespace (P2 - Inventive targets)

- [C-MAP-17] (HIGH) Whitespace 1 — Agents-as-data: the entire workforce (skills, capabilities, routing, personas) lives in the data model; no surveyed competitor lets a non-coder retrain, re-route, and re-staff agents without a release. — *grounds:* §0/§0b/§2/§19b; contrast set C-MAP-3/6/9.
- [C-MAP-18] (HIGH) Whitespace 2 — The honest audit surface as product: every model call on the record, patterns classified, costs reconciled, shown to the user in-product — vs. the market's developer-only bolt-ons. — *grounds:* §19i/§19k/§19m; C-MAP-12; John 2026-08-20 (About screen): "On 'Every call is on the record' make sure those metrics are live wired."
- [C-MAP-19] (HIGH) Whitespace 3 — Deliverable build visibility: narrated assembly showing each specialist's tangible contribution to the deliverable (§19r/§19s), answering John's contractor test — the digital-employee market shows only final output. — *grounds:* John 2026-07-16; §19r/§19s; C-MAP-10.
- [C-MAP-20] (HIGH) Whitespace 4 — True brokered multi-agent character layer: named personas with resumes/personnel files whose collaboration is real model-reasoned delegation (traceable, logged — §19d sniff test), brokered so no agent's data hardcodes another (§19e) — vs. choreographed pipelines wearing avatars. — *grounds:* §19d/§19e/§19u; memory `feedback-real-agent-loop-required.md`.
- [C-MAP-21] (MED) Whitespace 5 — The self-building platform: Execute/Heal/Invent engines developing the product 24×7 under one-person Accept/Reverse governance; no comparable product ships its own autonomous development loop as a governed feature. — *grounds:* §19v (live 2026-08-20); outside scan found no product analog (absence-of-evidence, hence MED).
- [C-MAP-22] (MED) Whitespace 6 — Trained-competency marketplace units: capabilities with lineage and provenance sold à la carte over MCP — ahead of where 2026 marketplaces (skills/tools only) currently are. — *grounds:* C-MAP-14/15; §0b.
- [C-MAP-23] (MED) Honest weaknesses the map must carry: no paying users, single-founder, single primary model vendor, and harness credibility must beat frameworks with massive production footprints (C-MAP-1); P2 claims that ignore these will not survive the skeptic eye. — *grounds:* inference; C-EXIT-7; C-CUST-7.

## What P2 - Inventive means concretely

- [C-MAP-24] (MED) A P2 feature must land in one of the six whitespace lanes above (or open a new lane with the same evidence pattern: named neighbors + what they don't do), not merely be new-to-DeepBench. — *grounds:* inference from John 2026-08-19: "new inventive features - white space, competitive differentiation" (the two tests are conjoined in his sentence).
- [C-MAP-25] (MED) P2 candidates rank by differentiation durability: data-model advantages (whitespace 1, 4, 6) outrank surface advantages (2, 3), because surfaces are copyable and the model is the moat. — *grounds:* inference from §0 pitch logic ("built into the data model" is the only-ness claim).
- [C-MAP-26] (MED) Standards conformity (MCP server exposure, A2A/ACP evaluation) is P2, not P10: it is competitive positioning John explicitly probed, and it activates whitespace 6. — *grounds:* C-MAP-16; inference.
- [C-MAP-27] (LOW) The Invent engine should re-run this map's outside scan on a cadence (quarterly-equivalent), since the field consolidated visibly within 12 months (framework consolidation, Langfuse acquisition, marketplace emergence). — *grounds:* inference from the 2025→2026 deltas in the cited sources.

## Sources (outside research, accessed 2026-08-21)

presenc.ai/research/multi-agent-orchestration-frameworks-2026 · turing.com/resources/ai-agent-frameworks · dev.to (LangGraph vs CrewAI vs AutoGen 2026) · quiq.com/blog/sierra-ai-competitors · 11x.ai guides + getbreakout.ai (AI SDR comparisons) · noca.ai/digital-employees-top-10-platforms-for-2026 · litslink.com/blog/ai-agent-statistics · erp.today (AI agents as digital coworkers) · marktechpost.com 2026-08-09 (LLM observability platforms; Langfuse/ClickHouse) · confident-ai.com + arize.com (agent observability 2026) · agensi.io + mintmcp.com + totalum.app (agent/skills marketplaces 2026) · aifundingtracker.com (agent startup funding).

## Open questions for John

1. Which whitespace lane should lead the pitch and the Invent engine's queue: agents-as-data (1), the honest audit surface (2), or the self-building platform (5)?
2. Is the Invent engine itself a product feature you'd show buyers, or internal tooling kept off the marketing surface?
3. Should DeepBench expose its Capabilities as an MCP server (whitespace 6) in the next quarter — is that P2 work you want queued?
4. Who do YOU consider the nearest competitor — is there a product you've personally seen that this map is missing?
5. Do you accept the ranking rule in C-MAP-25 (data-model whitespace outranks surface whitespace) as the tie-breaker for P2 classification?
