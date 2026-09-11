# AGT-71 — Moat feature 1: Delegation trail across a staff of agents

<!-- DeepBench | docs/harvests/AGT-71.md | Filed 2026-09-11 by attended session review-govtooling-0910 on John's word ("create these 8 as the project name Moat"). Source of every fact below: the Researcher (GV-02) moat verification pass, docs/research/2026-09-11-p1-moat-verification.json, session lane, logged ai_activity_log 41519. The class argued is Claude's recommendation of 2026-09-11, pending John's ruling. -->

**Class argued:** P1 - Improves John's Skills — every vendor traces hand-offs; the customer-visible broker reason is a showcase, not a moat.

**Verdict:** PARTIAL. Competitors lack: staff, ledger.

**Size:** S (1 predicted cycle). **Skill set proven:** Multi-agent orchestration; LLM observability and distributed tracing (OpenTelemetry); AI cost attribution / FinOps.

**Depends on (Moat Support):** SES-365.

## The demo an evaluator cannot reproduce elsewhere

Open one customer-visible log for a single request and read, hop by hop, which agent was chosen, the broker's stated reason, the AI pattern that ran and that hop's cost; in Copilot Studio you get two transcripts to correlate by ID with no reason and no cost.

## Closest products

| Product | Source (date) | Has | Lacks |
|---|---|---|---|
| Microsoft Copilot Studio connected agents | https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/multi-agent-patterns (2026-05-21) | Parent orchestrator hands off to connected agents; guidance says to log when a connected agent was invoked and correlate parent and child sessions by telemetry identifiers; activity map in the maker test panel. | Routing is by descriptions the parent names in its own configuration (violates the no-agent-names-another rule); separate transcripts per agent, not one ledger; no per-hop rationale, AI pattern or cost; maker-facing, not a customer-openable log. |
| OpenAI Agents SDK tracing | https://openai.github.io/openai-agents-python/tracing/ (2026-09-11) | Handoff, agent, generation, function and guardrail spans in one trace viewed in the Traces dashboard. | No recorded reason an agent was chosen, no cost per span, developer dashboard rather than a customer view; no persistent staff with ratings. |
| Salesforce Agentforce Observability / Session Tracing | https://www.salesforce.com/agentforce/observability/ (2026-09-11) | Session Tracing drills into specific subagents; Session Trace Data Model logs reasoning steps, LLM calls and guardrail checks; credits consumed per agent; quality scores. | Cost is per agent not per hop, no broker rationale per hop, subagents are configured inside the parent agent; admin-facing. |
| Paperclip (open source, off-matrix) | https://github.com/paperclipai/paperclip (2026-09-11) | Every mutating action, cost event and approval recorded as durable activity; 'Every conversation traced. Every decision explained'; cost per agent, task, project and goal. | Delegation flows along org-chart reporting lines (each agent's data names its boss), not a capability broker; no per-hop AI pattern; no customer-facing single-request trail evidenced. |

## Searched and not found

Microsoft Agent 365 blog and Entra Agent ID docs (registry, identity, dashboards; no hop trace); Anthropic Managed Agents blog (session tracing of tool calls, one level of delegation, no per-hop rationale/cost); Glean orchestration and agents pages (routing rules, trace graphs claimed, no per-hop rationale/cost mechanism named); Relevance AI agent-to-agent doc (delegation via 'When to call this agent' text; nothing logged per delegation documented); CrewAI tracing (tokens per agent, delegation not a tracked span); Beam Agent OS (orchestrator triggers agents; audit trail claimed, no hop detail); IBM watsonx Orchestrate Trace Inspector (full execution path of one agent run); AgentCore Observability (OTEL spans, no broker rationale).

## Sources

- https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/multi-agent-patterns (2026-05-21)
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-add-other-agents (2026-05-15)
- https://openai.github.io/openai-agents-python/tracing/ (2026-09-11)
- https://www.salesforce.com/agentforce/observability/ (2026-09-11)
- https://www.salesforce.com/blog/command-center/ (2025-06-23)
- https://github.com/paperclipai/paperclip (2026-09-11)
- https://claude.com/blog/claude-managed-agents (2026-04-08)
- https://docs.crewai.com/en/observability/tracing (2026-09-11)
- https://relevanceai.com/docs/workforce/workforce-features/agent-to-agent-configuration (2026-09-11)
