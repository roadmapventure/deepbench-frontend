# AGT-72 — Moat feature 2: Trust tier earned per agent, published with verdict history and rule

<!-- DeepBench | docs/harvests/AGT-72.md | Filed 2026-09-11 by attended session review-govtooling-0910 on John's word ("create these 8 as the project name Moat"). Source of every fact below: the Researcher (GV-02) moat verification pass, docs/research/2026-09-11-p1-moat-verification.json, session lane, logged ai_activity_log 41519. The class argued is Claude's recommendation of 2026-09-11, pending John's ruling. -->

**Class argued:** P3 - Investor Value — no matrix vendor has a ladder at all; a verifier-fed, reversible autonomy record is the governance asset an acquirer verifies from rows.

**Verdict:** PARTIAL. Competitors lack: ladder, ledger.

**Size:** M (2 predicted cycles). **Skill set proven:** AI governance / responsible AI; agent evaluation (LLM-as-a-judge); policy-as-code.

**Depends on (Moat Support):** SES-362.

## The demo an evaluator cannot reproduce elsewhere

Click an agent's tier badge and see the verdict rows from a different agent that earned it plus the rule that would demote it, then reverse one verdict and watch the tier recompute; no competitor page shows a tier with its verdict provenance.

## Closest products

| Product | Source (date) | Has | Lacks |
|---|---|---|---|
| Paperclip agent trust levels (RFC #379) | https://github.com/paperclipai/paperclip/issues/379 (2026-03-09) | Supervised/autonomous levels; auto-promotion after 20 consecutive successful heartbeat runs, auto-demotion at 3 failures in a rolling 10, manual override with cooldown; RFC says a working implementation is ready; release v2026.817.0 references 'standard-trust agents' as a permission scope. | Input is run success/failure counts, not an independent verifier's verdicts on the agent's outputs; no published verdict history behind the tier; reversals are not inputs; shipped form is a trust scope, not a ladder page. |
| CSA Agentic Trust Framework | https://cloudsecurityalliance.org/blog/2026/02/02/the-agentic-trust-framework-zero-trust-governance-for-ai-agents (2026-02-02) | Four levels (Intern, Junior, Senior, Principal) with five promotion gates and minimum tenure. | An open specification, not a shipped product; nothing computes the tier from logged verdicts. |
| Credo AI Agent Registry / Agent Governor | https://www.credo.ai/ai-agent-registry (2026-09-11) | Records an autonomy classification per agent, risks and controls, drift alerts; Governor enforces block/allow/escalate/advise at runtime (research preview for Claude Code). | Autonomy is declared, not earned from verdicts; no promotion/demotion rule; no verdict ledger. |
| IBM watsonx Orchestrate onboarding governance | https://www.ibm.com/new/announcements/revolutionizing-ai-agent-management-with-ibm-watsonx-orchestrate-new-observability-and-governance-capabilities (2026-09-11) | Staging area computes a quality score across journey completion, relevancy, tool accuracy, cost, latency before an agent enters the catalog. | A one-time gate, not a per-agent tier that moves; no verdict history; no demotion. |

## Searched and not found

Microsoft Entra Agent ID (Conditional Access triggered by agent risk, identity governance; no earned autonomy), Agent 365 blog (performance measurement, no tiers); ServiceNow AI Control Tower June 2026 release (risk-based classification at intake, lifecycle gates; no earned tier); AgentCore Policy (Cedar/Dogwood policies, static per session; not adjusted by evaluation results); Anthropic Managed Agents (scoped permissions, no tiers); Salesforce, Glean, Beam (autonomy modes are configured, not earned), Relevance, CrewAI, Lindy: no trust tier mechanism documented. AgentAnchor (0-1000 trust score, tiers T0-T7 per search snippet) could not be fetched: site returns 402 'deployment paused', so dropped.

## Sources

- https://github.com/paperclipai/paperclip/issues/379 (2026-03-09)
- https://paperclip.ing/changelog/v2026.817.0/ (2026-08-17)
- https://cloudsecurityalliance.org/blog/2026/02/02/the-agentic-trust-framework-zero-trust-governance-for-ai-agents (2026-02-02)
- https://www.credo.ai/ai-agent-registry (2026-09-11)
- https://www.credo.ai/agent-governor (2026-09-11)
- https://www.ibm.com/new/announcements/revolutionizing-ai-agent-management-with-ibm-watsonx-orchestrate-new-observability-and-governance-capabilities (2026-09-11)
- https://learn.microsoft.com/en-us/microsoft-agent-365/admin/capabilities-entra (2026-05-12)
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html (2026-09-11)
