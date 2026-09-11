<!-- DeepBench | docs/research/2026-09-10-p1-skills-lens.md | The Researcher (GV-02) P1-lens run, attended, session review-govtooling-0910, 2026-09-10, commissioned under VC-MISSION-034 (John's P1 skill-set brief, verbatim on the row). System prompt assembled by scripts/agent-prompt.js from the agent's Skill rows (SES-331), run as a session sub-agent on the judgment lane (claude-fable-5-1, subscription tokens, call_source=session, logged via scripts/agent-log.js). Egress: live web search, 43 searches, 68 fetches, 51 usable, 17 dropped (403/404/truncated), nothing cited from memory. Leg 2 from the platform-usage figures supplied in task_context; no database queried. NOTHING FILED: John approves or rejects each of the 25 first; approved rows become P1 tickets in an attended step. The machine-readable twin (54 findings, 25 survivors as filing-shaped proposal objects, 15 runners-up) is docs/research/2026-09-10-p1-skills-lens.json. Body below is the model's research_doc verbatim. -->

# P1 Skills Lens: the 25 use cases a hiring evaluator would credit

Research pass, 2026-09-10. Lens: P1 - Improves John's Skills. Allowed: 25. Nothing filed from this pass; you approve or reject each row first.
Intended repo path once approved: docs/research/2026-09-10-p1-skills-lens.md.

## The pitch

You want to be a Director, VP or Chief Product Officer for AI, and you want a visitor to DeepBench to be able to tell in thirty minutes that you have done the work those titles require. The job postings I could fetch this week say the same six things over and over: agent evaluation, human-in-the-loop design, observability, tool and platform design (MCP, skills), safety and red-teaming, and governance that a buyer can inspect. Government buyers say a seventh thing: show me the intermediary steps, the audit trail, the inventory, the incident report.

DeepBench already has the bones for all seven: a reasoning trail on every Channel Intelligence run, a briefing page, a trust ladder, a verifier record, a librarian-gated RAG library, an MCP server, durable loops with checkpoints, and an auto-rollback engine. What it mostly lacks is the *verdict layer*: the score, the gate, the approval, the denial, the proof. The 25 rows below each add one visible verdict to a surface you already have. None invents a new screen. Ranked first are the ones an evaluator at Google, Microsoft, Anthropic or OpenAI would recognize as their own vocabulary; ranked last are the ones that lean more on government procurement than on the labs.

## What the market says (live, dated)

Egress: live web search was available. I ran 43 searches and 68 fetches; 51 fetches returned usable dated content. Seventeen fetches failed and those sources were dropped or replaced by a dated mirror: OpenAI's careers page (403), five Google careers pages (page truncates before the posting body), two Microsoft careers pages (404), Ropes & Gray, Akin Gump, CDT (twice), the Gartner press release, OpenAI's FedRAMP post, Indeed (403), the Anthropic Frontier Red Team page (not on the fetched board), and OpenAI's agents-guide PDF (binary, unreadable). Every citation below is a page I fetched, or a search result that carried a date; the latter are marked "search snippet".

What the fetched sources agree on:

- **Evals are the skill.** Anthropic's research-system post (2025-06-13) found a single LLM-as-a-judge call scoring 0.0-1.0 on accuracy, citation accuracy, completeness and tool efficiency was the most consistent grader, and graded end state rather than every step. Automation Anywhere's tau-bench guide (2026-05-18) says enterprises must score *both* trajectory accuracy and goal completion because the same answer can come from a wrong path. Braintrust's observability guide (2026-06-21) puts online scorers on live traces and offline golden sets in CI that block merges. MLflow (2026-05-28) says evaluation belongs inside the workflow. Only 38% of production agents run automated evals on every prompt change, and evaluation/observability is the largest blocker to production at 64% (digitalapplied, 2026-04-19). Arize (2026-08-04): "evals replace traditional PRDs."
- **Human-in-the-loop is designed, not bolted on.** The draft NIST AI RMF agentic profile (CSA, 2026-03-27) classifies tools read/write/execute, puts every call through a tool-gateway chokepoint, defines four autonomy tiers, and names a kill switch. AvePoint (2026-08-19): 95.5% of organizations changed controls after an agent incident, human-in-the-loop most often; gate by blast radius. OpenAI's agent docs (undated, fetched 2026-09-10) record an interruption plus resumable state and let the app approve before resuming.
- **Observability means spans.** Braintrust (2026-06-21) names tool-call, reasoning, state-transition and memory-operation spans with per-span cost; MLflow (2026-05-28) wants model version pinned from day one.
- **Context engineering replaced prompt engineering.** Anthropic (2025-09-29): compaction, structured note-taking, just-in-time retrieval, sub-agents, minimal tools. Anthropic's long-running-agent harness post (2025-11-26): fresh-context sessions handing off through artifacts, one feature at a time. Managed Agents (beta 2026-04-08 per Zylos, 2026-04-20) package sessions, checkpoints and permissions.
- **Tools and skills are a designed interface.** Anthropic's tool-writing guide (2025-09-11): few consolidated tools, namespacing, high-signal responses, "describe your tool as you would to a new hire," iterate with evals. Agent Skills (2025-10-16): SKILL.md with progressive disclosure, audit before install; open standard since 2025-12-18 (search snippet). MCP's 2026 roadmap (2026-03-09) names audit trails, SSO auth, gateways and discovery as the enterprise gaps; SDK downloads hit 97 million a month by March 2026 (search snippet).
- **Safety is red-teaming agents.** Anthropic's Red Team Engineer, Safeguards posting (fetched 2026-09-10, $320k-$405k) wants "testing large-scale agentic workflows for non-obvious prompt injection vectors." NIST's agent red-teaming note (CSA, 2026-03-31): novel agent attacks succeed 81% vs 11% baseline; test with repeated attempts. Vectra (fetched 2026-09-10): Claude Opus 4.5 indirect injection 4.7% at one try, 33.6% at ten; all three labs say defense in depth.
- **Governance is the gap buyers see.** Deloitte (2026-04-24): 21% of 3,235 leaders have mature agentic governance; 74% expect moderate agent use by 2027; missing are decision boundaries, monitoring and audit trails. Gartner (via Joget, 2026-02-20): 40% of enterprise apps carry task-specific agents in 2026; 40%+ of agentic projects cancelled by 2027 for lack of oversight. Zylos (2026-07-02): procurement checklists demand kill switches under five minutes, hash-chained per-step audit logs with model version tags, tiered human-in-the-loop, golden sets of 100-300 cases with failure budgets.
- **Identity for agents is a product.** Microsoft Entra Agent ID (2026-08-13): governed identity per agent, OAuth/MCP/A2A, conditional access, full audit; Copilot Studio auto-creates one per agent after May 2026 (search snippet). AWS AgentCore in GovCloud (2026-08-07): memory, natural-language policies compiled to Cedar and enforced at a gateway per tool call, managed harness. NIST's AI Agent Standards Initiative (2026-02-17): security and identity is a pillar. A2A is in production at 150+ organizations (Linux Foundation, 2026-04-09).
- **Government asks for the trail.** GSA's draft "Basic Safeguarding of AI Systems" clause (Gibson Dunn 2026-03-12; Wiley 2026-03-24): disclose all AI systems in 30 days, keep detailed records of processing, 72-hour incident reporting, 7-day notice of any change reducing guardrails, government right to test for bias, truthfulness and safety; and (search snippet, cap50 2026-04) systems using reasoning, retrieval or agentic processes must summarize intermediary steps and expose them through output, audit trail and UI. OMB M-25-21 (Hunton, 2025-04-03): pre-deployment testing, impact assessments, human oversight, annual public use-case inventory; 56 agencies reported 3,611 use cases, 445 high-impact, vendors named (Nextgov, 2026-04-16). Georgia GS-25-002 (2025-07-01): vendors provide decision logs and justifications and an Algorithmic Impact Assessment with low/medium/high aspects. California EO N-5-26 (signed 2026-03-30, search snippet): vendors attest to and explain safeguards. Colorado's replacement ADMT act (GT Law, 2026-05-14; effective 2027-01-01): pre-use notice, 30-day plain-language explanation of the system's role, path to human review. New York RAISE Act (search snippet): 72-hour incident reporting from 2027-01-01. Department of War AI strategy (Holland & Knight, 2026-02-23): provenance, logging and traceability of AI-assisted decisions, operator control. Federal procurement pilot (Nextgov, 2026-05-11): three agents reviewed an $8.5M proposal with precise FAR citations, every determination left to the human. GSA Buy AI (updated 2026-09-10): test in sandboxes first, set usage limits, review consumption. Anthropic's own government product (2026-07-07): hash-chained audit logs, hard spending caps.

## What the job postings name

| Employer and role | Fetched | What it names |
|---|---|---|
| Anthropic, PM Agent Platform (MCP), General Catalyst board | 2026-09-10 (closed, 6+ months old) | "agent infrastructure, skills, MCP, and evaluation frameworks"; "evaluation methodologies for AI systems"; "reliable, interpretable agentic systems"; safety-by-design |
| OpenAI, PM API Agents, Khosla board | 2026-09-10 (6+ months old) | "roadmap for improving agentic infrastructure"; "balancing user needs, safety considerations, and technical innovation"; SDKs, APIs, primitives |
| Google, Director PM Cloud AI and Science, TechNYC mirror | posted 2026-08-28 | "agentic architectures, multi-agent coordination, human-in-the-loop system design"; "advanced evaluation methodologies"; "establish robust evaluation frameworks"; $281k-$391k |
| Amazon, Principal PM-T Agentic AI Core Infra (3202594) | 2026-09-10 (undated) | SDK, Runtime, Builder Tools to "develop, test, and operate production-grade agentic experiences"; agent authorization, guardrails, shared memory |
| Amazon, Principal PM-T AgentCore (3185564) | 2026-09-10 (undated) | "developing, deploying and managing AI products at scale"; owns adoption of an agent runtime |
| Microsoft AI, Principal PM (principal-product-manager-83) | 2026-09-10 (undated) | "define model evaluations", "build relevant benchmarks", "go/no-go decisions that balance capability, risk, and product goals", "agentic and reasoning models" |
| Microsoft AI, Principal PM Agentic Experiences | search snippet only (fetch 404) | "LLM observability tools (traces, evals, datasets) for production monitoring and regression detection" |
| Anthropic, Red Team Engineer Safeguards | 2026-09-10 | "non-obvious prompt injection vectors" in "large-scale agentic workflows"; "automated testing frameworks... continuous assessment at scale" |

Not cited because the fetch failed: Google's Group PM, AI Agent Security and Authorization; Google's Group PM Applied AI (DeepMind) with "evaluation methods, safety protocols, adversarial analysis"; Google's Senior PM AI Garage with "LLM evaluation systems tracking factual alignment"; Microsoft's Senior PM Copilot with tool-use and grounding. Their titles alone corroborate the six themes, but I do not lean on them.

The pattern in one sentence: at Director level the postings stop asking whether you can build an agent and start asking whether you can *evaluate, govern and explain* one.

## Vision-corpus grounding, cited on the row

Every survivor cites VC-ROOT-001 (the platform is your living portfolio for FAANG-level AI roles). Surfaces come from VC-MISSION-031 (a live Channel Intelligence run with its reasoning trail, and the briefing page as proof of governed autonomy; anything a visitor cannot reach in 30 minutes is not P1) and VC-MISSION-032 (the runner counts only through its inspectable parts: briefing, verifier record, trust ladder, standing brief). VC-MISSION-006 (P1 work makes your reasoning a demonstrable object) backs the scorecard. VC-CUST-020 (an agent trained on your knowledge) backs citation verification and memory. VC-THESIS-021 (impress a procurement director *and* a VP of Product) is the tiebreaker that keeps the government-shaped rows in. Pattern 137 (administrative expectations never qualify) and pattern 149 (a standard skill never counts as showcase) were applied to every row; where a row is close to the line I say so in its pull test. No VC-REJ-* path is re-proposed; the six rejected P1 claims were not supplied in the context, so I stayed on surfaces the ratified claims name.

## The 25, in rank order

1. **Run Scorecard: trajectory and outcome evals with LLM-as-a-judge on every run.** A visitor asks a question and next to the answer sees three scores with reasons: did the run take a sensible path, did it reach the goal, are the citations accurate. This is the skill every Director posting names first (Google 2026-08-28, Microsoft, Anthropic) and the practice Anthropic used in production (2025-06-13); tau-bench's guide (2026-05-18) is why both trajectory and outcome are scored. You have the quality-gate reviewer (16 reviews a month) and the full trail; new is a scorer over the trace and a card on the log. Size M, 2 cycles.

2. **Eval Gate: golden-set regression with pass^k on the briefing.** Before each ship point the runner replays ~100 known-good questions three times and the briefing shows pass^1, pass^3, the failure budget and the regressed questions. Buyers now ask vendors for exactly this (Zylos 2026-07-02); Braintrust (2026-06-21) puts it in CI; Microsoft's PM owns the go/no-go on it. You have the verifier record; new is the golden set, the replay job and the card. Size M, 2 cycles.

3. **Approval Gate: human-in-the-loop with read/write/execute tool tiers.** A run pauses before a write or execute tool, records the proposed call, and the visitor approves or rejects in the log; the loop resumes from its checkpoint. Google names human-in-the-loop system design; NIST's draft profile (2026-03-27) makes the tiers the control; AvePoint (2026-08-19) says gate by blast radius. You have checkpoints and the executor; new is the tier column, the interruption record and two buttons. Size M, 2 cycles.

4. **Injection Canary: indirect prompt injection defense on the RAG path.** A planted data-room document tries to hijack the agent; the trail shows the chunk tagged untrusted, the instruction quarantined, the tool call blocked, and a resistance score across ~20 canaries. Anthropic pays $320k-$405k for people who find these vectors; NIST's red-team note (2026-03-31) and Vectra's numbers say it is unsolved. It rides the librarian path that carries 1,902 of your monthly calls. Size M, 2 cycles.

5. **Agent Identity and Least-Privilege Tool Gateway.** Each agent gets a permission manifest enforced in the executor; an out-of-manifest call is denied with the policy line shown, and a registry view lists identity, manifest and last denial. Entra Agent ID (2026-08-13), AWS AgentCore Policy (2026-08-07), NIST's initiative (2026-02-17) and Amazon's agentic-infra PM all say this is now a product. The executor is already the chokepoint. Size M, 2 cycles.

6. **Trace Export: span-level observability export of a run.** One click yields tool-call, reasoning, state-transition and memory spans with model version and cost. Observability is the 64% blocker (2026-04-19) and Microsoft's agentic PM names "traces, evals, datasets." The rows exist; the work is a stitcher and a button. Size S, 1 cycle.

7. **Tamper-evident Intermediary-Steps Record.** Each run's steps are hash-chained and model-version-tagged, with a verify control and an export in the shape GSA's draft clause describes (2026-03-12, 2026-03-24, search snippet 2026-04). Anthropic's own government product ships hash-chained logs (2026-07-07). This is the row a procurement director recognizes on sight. Size S, 1 cycle.

8. **Claim-level Citation Verification.** A citation pass attaches a span to every factual claim and flags what it cannot support, with a precision score. Anthropic needed a dedicated citation agent (2025-06-13); federal reviewers want precise citations (2026-05-11); GSA reserves the right to test truthfulness. Basic RAG is standard; claim-level verification is not. Size M, 2 cycles.

9. **Deep Research Mode: orchestrator-workers fan-out.** A lead agent spawns 3-5 workers over news and data room, synthesizes, and the trail shows fan-out, fan-in and the token multiplier. Anthropic's reference design (2025-06-13, 90.2% better at 15x tokens); Google names multi-agent coordination. Your broker and loops exist; parallel hops are new. Size L, 3 cycles.

10. **Context Engineering on display.** A long run shows compaction, a structured notes object written and read back, and token deltas per hop. Anthropic (2025-09-29, 2025-11-26) and the AI PM roadmap (2026-07-05) put this first among production skills. Size M, 2 cycles.

11. **Critique Loop: evaluator-optimizer with visible diffs.** The reviewer critiques, the drafter revises, up to N cycles, each diff and score shown. One of Anthropic's five named patterns (2024-12-19) and its 2026 production form (Zylos 2026-04-20). Size M, 2 cycles.

12. **Model Routing Cascade with the decision logged.** Cheapest eligible model first, confidence check, escalate on failure, rationale and saved cost in the log. Routing is a named pattern; RouteLLM-style results are 85% savings at 95% quality (2026-06-14). Size M, 2 cycles.

13. **Prompt Caching Economics in AI Audit.** Cache breakpoints on the stable Skill-profile prefix, with hit rate and dollars saved per run. Anthropic's numbers are 90% cost and 85% latency (2025-08-14). Using caching is standard; showing its economics per multi-agent run is not. Size S, 1 cycle.

14. **Cost-per-Task Budgets with a circuit breaker.** Per-run token caps, a breaker on runaway loops, cost per completed task and the runner's spending cap on the briefing. GSA tells buyers to set limits and review consumption (2026-09-10); Anthropic's government product advertises hard caps (2026-07-07). Size S, 1 cycle.

15. **Agent Memory with memory spans.** Per-visitor short-term and extracted long-term memory, each read and write a step in the trail, with expiry. AWS shipped this into GovCloud (2026-08-07) and added metadata (2026-05); Braintrust names memory spans. Serves VC-CUST-020 directly. Size M, 2 cycles.

16. **MCP Enterprise Readiness.** Authenticated server, .well-known discovery, client identity on every call, calls landing in the audit log. The 2026 MCP roadmap (2026-03-09) names exactly these gaps; Anthropic's platform PM owned MCP. Size M, 2 cycles.

17. **Tool Contracts and a tool-selection eval.** A new-hire-style contract page per tool and an accuracy number for how often the broker picks the right tool. Anthropic's tool guide (2025-09-11); trajectory benchmarks score tool choice. Size S, 1 cycle.

18. **Autonomy Tiers on the trust ladder.** Map the ladder to the four tiers NIST's draft uses, with per-agent evidence and promotion rules on the briefing. Turns an internal mechanism into the language buyers and regulators are drafting (2026-03-27, 2026-07-02). Size S, 1 cycle.

19. **Kill Switch with the rollback record shown.** A visitor stops a running loop; the rollback engine reverses side effects; the briefing shows time-to-halt and the ledger reversal. Buyers want it under five minutes (2026-07-02); NIST names it. Size S, 1 cycle.

20. **Agent Skills Packaging (SKILL.md, progressive disclosure).** Export a Skill profile as a SKILL.md package and load skills metadata-first with load events in the trail. Anthropic's spec (2025-10-16) is supported by ~40 products. Pattern 149 is the risk; the visible progressive loading is what lifts it. Size M, 2 cycles.

21. **AI Use-Case Inventory, machine-readable.** A page and JSON listing every agent and capability in the field shape federal and state inventories use (OMB 2025-04-03; 3,611 federal use cases, Nextgov 2026-04-16; Georgia 2025-07-01). Pattern 137 is the risk; it survives because it is generated live from your rows. Size S, 1 cycle.

22. **Impact Assessment Record per capability.** Purpose, risk aspects by level, pre-deployment test results from the eval gate, monitoring plan, and a change log flagging guardrail reductions inside GSA's 7-day window. Georgia's AIA, OMB's testing rule, California's attestation EO. Depends on row 2. Size M, 2 cycles.

23. **AI Incident Record with a 72-hour clock.** Guardrail failures, successful injections, budget breakers and rollbacks open an incident with class, severity and a clock; the briefing lists them. GSA proposes 72 hours (2026-03-24); New York makes it law in 2027. Fed by rows 3, 4 and 14. Size S, 1 cycle.

24. **Decision Notice for work-order outcomes.** Pre-use notice, plain-language explanation of the agent's role generated from the trail, and a human-review request. Colorado's replacement act (2026-05-14) requires this from 2027. Ranks low because DeepBench's decisions are not yet consequential in the legal sense. Size M, 2 cycles.

25. **A2A Endpoint.** Publish an agent card and Tasks endpoint so an external agent can delegate into DeepBench, with the caller in the delegation lineage. 150+ organizations in production (2026-04-09); Entra speaks it. Last because the protocol is still settling and MCP pulls harder. Size M, 2 cycles.

## The runners-up and why they ranked lower

- Hybrid retrieval with reranking and confidence gates: standard RAG engineering (pattern 149); shows up through row 8 instead.
- Structured outputs and JSON-schema tool arguments: standard (pattern 149).
- Streaming answers: standard; no evaluator credits it.
- PII and moderation classifiers: commodity filters; row 4 is the credited variant.
- Model change control and deprecation notices: buyer requirement but administrative (pattern 137); model version tagging in row 7 keeps the technical half.
- ISO/IEC 42001 and SOC 2 pages: pure administration (pattern 137).
- Eyes-off data handling and data localization: real GSA requirement, invisible to a visitor (fails VC-MISSION-033).
- Open-format data portability: an export button with no AI skill on display.
- FedRAMP 20x key security indicators: out of reach and administrative.
- Fine-tuning a small model: outside your stated lane; no fetched posting requires it.
- Computer-use agent driving the UI: off-lane and not exercisable in 30 minutes on a P1 surface.
- Agent Payments Protocol: payments are outside the office-work thesis.
- Extended thinking as a reasoning summary: you already show a trail; presentation only.
- Rainbow deployments: internal correctness nobody can inspect (VC-MISSION-032 excludes it).
- Watermarking generated media: California asks, but DeepBench produces text.

## How it reaches the build queue

Nothing is filed from this pass. Each of the 25 rows above is already in the shape file_invention_proposal() expects (title, priority_class P1, enhancement_claim, scope_rationale, predicted_cycles, description citing a VC- ref and this document's path) in the companion JSON. When you approve a row, an attended step files it as a P1 backlog_items row with scope_origin enhancement and its own decision; the 72-hour window is its ratification. Suggested order if you approve in bulk: rows 1, 3, 6, 7, 13 first (two are size S and all five land on the run trail a visitor already reaches), then 2 and 4, then the rest by rank. Rows 22, 23 and 24 depend on rows 2, 3, 4 and 14 landing first.

## The usage signal that proves it

From the last 30 days of product-lane calls (a handful of visitors): the librarian's RAG queries dominate at 1,902; the full Channel Intelligence run fires about 16-20 times (request-receivable 20, channel-intelligence answer 17, delegation routing 16, quality-gate review 16, knowledge-retrieval 17); the roster is read 124 times; data-room evidence lookups 11; web-search-news 3.

What that says: the reasoning trail is real but thinly exercised, so the highest-value rows are the ones that add a visible verdict to every one of those 16-20 runs (rows 1, 3, 6, 7, 11, 12) and the ones that ride the librarian path every visitor already hits (rows 4, 8, 15). Roster reads outnumber routed runs eight to one, which means visitors browse the agents more than they drive them; rows 5 and 21 give the roster something to prove. Web search is nearly unused, so row 9's deep-research mode is the one row whose usage signal is weakest today; it ranks ninth on evaluator credit, not on current pull. The enhancement_claim on each row names the usage figure it should move; most are honest "none" because a verdict layer changes what a visitor sees, not how many calls fire.

Evidence forced nothing below 25; the thinnest rows are 24 and 25, and I say why on each.
