<!-- DeepBench v7.0.211 | docs/research/SES-131-market-faang-research.md | SES-131 — the two-leg market/FAANG research John ordered on the briefing page 2026-08-23T00:13Z (rejecting C-mission-29), built in-session by drain-automation-0823 (model: Fable 5). Deliverable: mapped shortlist filed as candidate tickets LOG-143, LOG-144, MCP-3, AGT-60, ADM-3 (tier next) for John to pick from. C-mission-29 itself is re-put to John, not rewritten — see §4. -->

# SES-131 — AI / Multi-Agent Market & FAANG Job-Market Research

**Ticket:** `SES-131` — "Research the AI / multi-agent market and FAANG AI job openings, and turn
what they want into features" (Feature, P1 - Improves John's Skills).
**Session:** drain-automation-0823, 2026-08-23. Live web research, not priors.

## 1. Leg 1 — what the 2026 multi-agent market considers state of the art

Signals, from current industry coverage (sources at end):

- **Orchestration is the year's theme.** "If 2023–2025 were the years of pilots and prototypes,
  2026 is about orchestration, governance, and scale." Gartner has agentic AI as the #1 strategic
  trend; 40% of enterprise applications are projected to carry task-specific agents in 2026
  (vs <5% in 2025); 57%+ of enterprises already run agents in production.
- **Multi-agent systems**: an orchestrator coordinating specialized sub-agents, each with its own
  context — exactly DeepBench's bench-plus-broker shape (Michelle Manning — Project Manager as the
  orchestrator; §19d traceable delegation reasoning).
- **MCP (Model Context Protocol)** is the agent-to-tool standard: native OAuth, multi-tenant
  scoping, enterprise governance. **A2A Protocol** for peer-to-peer agent delegation is in
  production at 150+ organizations (April 2026).
- **Agent observability & evals**: tracing (span-per-hop), eval harnesses, and MCP-specific
  tracing are called out as core design principles "like observability or security"; Anthropic's
  own eval-engineering guidance is the canonical reference.
- **Persistent memory** across sessions, **human-in-the-loop governance** (permission boundaries,
  audit logging, approval checkpoints designed-in), **context engineering**, and **verifiability**
  (agents automate best where outputs are systematically checkable) round out the named trends.

## 2. Leg 2 — what FAANG-level AI postings ask for, by name

- Postings mentioning **"agentic systems"**: 151 (2024) → 16,500+ (2025) — the sharpest tracked
  skill-demand shift. Role titles now include "Agentic AI Engineer", "AI Agent Developer".
- Named skills across postings: **RAG patterns, vector embeddings, agent orchestration, AI evals,
  observability/tracing, MCP**, plus Python baseline. An analysis of 250 AI-PM postings puts
  **practical agents + evals + observability** in ~94% of them.
- Hiring is **portfolio-driven**: "production-grade RAG systems or deployed agents" beat degrees.
  This is precisely the P1 root claim's frame (VC-ROOT-001): the platform is the portfolio.

## 3. The mapped shortlist — trend/skillset → DeepBench functionality

Filed as candidate tickets, tier `next`, for John to pick from. Scored against the root claims
(VC-ROOT-001..004).

| Candidate | Maps from | Class (pull test) |
|---|---|---|
| `LOG-143` Agent eval harness (LLM-as-judge over real runs: delegation correctness, groundedness, per-agent trends) | "AI evals" in ~94% of postings; evals-as-design-principle trend | P1 - Improves John's Skills |
| `LOG-144` Per-run agent trace tree (span per delegation hop / tool call; builds on ai_activity_log + Audit Pipeline Log) | Agent observability/tracing trend; named in postings | P1 - Improves John's Skills |
| `MCP-3` DeepBench MCP server projecting the §19b generic capability executor as MCP tools | MCP standardization; MCP named in requirements | P1 - Improves John's Skills |
| `AGT-60` Persistent per-agent memory, brokered through Eleanor Voss — The Librarian as governed Library data | Persistent-memory trend; uniqueness = governed, auditable memory | P2 - Inventive |
| `ADM-3` Governance showcase: read-only view of the live trust-ladder / acceptance-gating loop | HITL-governance trend; the loop already runs, it just isn't visible | P3 - Investor Value |

**Deliberately not filed:**
- **A2A Agent Cards** — already exists as `SES-108` ("The A2A Agent Card projection proposal is
  parked, not killed", Feature, P2 - Inventive). The market signal (150+ orgs in production)
  strengthens the case to un-park it rather than duplicate it.
- **Agentic commerce / browser agents / sovereign AI** — off-thesis for a bench-of-experts
  product; no vision-corpus anchor.

## 4. Open item put back to John (not decided here)

`C-mission-29` ("done = one presentable screen" / the briefing as hiring-facing artifact) is
contradicted by John's own 2026-08-23 words that briefing-style capability is "standard skills…
like 'knows microsoft office'". Per the ticket's provenance note this claim must be **re-put to
John**, not quietly rewritten. Proposed replacement framing for his verdict: *hireability lives in
frontier capabilities (evals, tracing, MCP/A2A interop, governed memory) demonstrated on the
platform — administrative/expected surfaces are table stakes and classify P5/P10.*

## Sources

- https://www.firecrawl.dev/blog/agentic-ai-trends
- https://www.druidai.com/blog/agentic-ai-trends-in-2026
- https://www.blueprism.com/resources/blog/future-ai-agents-trends/
- https://rasa.com/blog/agent-orchestration-tools
- https://viston.tech/ai-agent-orchestration-in-2026-moving-from-pilots-to-enterprise-wide-execution/
- https://www.gsdcouncil.org/blogs/agentic-ai-jobs-careers-skills-salary
- https://www.novelvista.com/blogs/ai-and-ml/agentic-ai-jobs-skills-salary-career-path
- https://aakashgupta.medium.com/i-analyzed-250-ai-pm-job-postings-four-skills-show-up-in-94-of-them-7947282b0476
- https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- https://aws.amazon.com/about-aws/whats-new/2026/06/opensearch-agentic-observability-mcp-app/
