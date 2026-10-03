# AGT-75 — Moat feature 5: Custodian agent for a data asset (librarian gatekeeper)

<!-- DeepBench | docs/harvests/AGT-75.md | Filed 2026-09-11 by attended session review-govtooling-0910 on John's word ("create these 8 as the project name Moat"). Source of every fact below: the Researcher (GV-02) moat verification pass, docs/research/2026-09-11-p1-moat-verification.json, session lane, logged ai_activity_log 41519. The class argued is Claude's recommendation of 2026-09-11, pending John's ruling. -->

**Class argued:** P1 - Improves John's Skills — data custody through a named role is a design story; buyers get custody from permissions.

**Verdict:** PARTIAL. Competitors lack: staff, ledger.

**Size:** S (1 predicted cycle). **Skill set proven:** Retrieval-augmented generation; enterprise search; data governance and stewardship.

**Depends on (Moat Support):** SES-366.

## The demo an evaluator cannot reproduce elsewhere

Ask two different agents the same document question and open one ledger showing both requests routed to the Librarian, one answered with a citation and one refused, each as a logged hop with cost.

## Closest products

| Product | Source (date) | Has | Lacks |
|---|---|---|---|
| Microsoft Copilot Studio Fabric Data agent / connected agents | https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-agent-fabric-data-agent (2026-02-13) | A separate agent owns a data asset and other agents call it to answer; guidance recommends one knowledge source per subagent. | The custodian cannot refuse or supersede on record; citations 'might not always be maintained' passing back; request and answer live in separate transcripts, not one ledger; the caller names the custodian in its own config. |
| Glean Agents / Orchestration | https://www.glean.com/product/agent-orchestration (2026-09-11) | Permission-enforced enterprise search over 275+ connectors as shared context for every agent in a workflow. | Retrieval is a service layer, not a named agent that answers, refuses or supersedes and is rated for it; no per-request custodian log. |
| Microsoft Agent 365 Work IQ | https://www.microsoft.com/en-us/microsoft-365/blog/2025/11/18/microsoft-agent-365-the-control-plane-for-ai-agents/ (2025-11-18) | Agents access organizational data through Work IQ under Purview data protection. | Not an agent, no refusal/supersede semantics, no citation-per-request ledger. |

## Searched and not found

Search for 'librarian agent' / 'knowledge custodian agent' returned only personal knowledge-base MCP servers (arcadeai-labs agent-library, ktundwal/librarian), not enterprise platforms; ServiceNow Workflow Data Fabric, Salesforce Data Cloud, Vertex/Gemini Enterprise data stores, AgentCore Gateway, Anthropic Managed Agents, OpenAI workspace agents, Relevance, CrewAI, Lindy, Beam, Sema4 (403), IBM: retrieval is a tool or data layer; no vendor names a single agent that owns the library and can refuse other agents on record.

## Sources

- https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-agent-fabric-data-agent (2026-02-13)
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/multi-agent-patterns (2026-05-21)
- https://www.glean.com/product/agent-orchestration (2026-09-11)
- https://www.glean.com/product/agents (2026-09-11)
- https://www.microsoft.com/en-us/microsoft-365/blog/2025/11/18/microsoft-agent-365-the-control-plane-for-ai-agents/ (2025-11-18)
