# AGT-73 — Moat feature 3: One agent grades another on the record, human-reversible inside a window

<!-- DeepBench | docs/harvests/AGT-73.md | Filed 2026-09-11 by attended session review-govtooling-0910 on John's word ("create these 8 as the project name Moat"). Source of every fact below: the Researcher (GV-02) moat verification pass, docs/research/2026-09-11-p1-moat-verification.json, session lane, logged ai_activity_log 41519. The class argued is Claude's recommendation of 2026-09-11, pending John's ruling. -->

**Class argued:** P3 - Investor Value — the verdict ledger with before-images and a reversal window is the same acquirer-verifiable asset.

**Verdict:** PARTIAL. Competitors lack: ledger, ladder.

**Size:** S (1 predicted cycle). **Skill set proven:** LLM-as-a-judge evaluation; human-in-the-loop review design; audit logging and change control.

**Depends on (Moat Support):** SES-345.

## The demo an evaluator cannot reproduce elsewhere

Reverse a reviewer agent's verdict inside 72 hours and show the before-image, the reversal row, and both the graded agent's tier and the reviewer's own record updating from it.

## Closest products

| Product | Source (date) | Has | Lacks |
|---|---|---|---|
| Paperclip review verdict policies | https://paperclip.ing/changelog/v2026.817.0/ (2026-08-17) | Agents can resolve review confirmations under explicit review verdict policies; review rounds are capped and exhausted reviews escalate to the responsible human; v2026.824.0 makes verdicts serialized and transactional. | No time-boxed human reversal window with a before-image evidenced; verdicts gate approval, they do not feed a per-agent trust tier; no fresh-context requirement documented. |
| Amazon Bedrock AgentCore Evaluations | https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html (2026-09-11) | Built-in and custom LLM-as-a-Judge evaluators score traces online, on demand and in batch. | Scores are metrics, not decision rows a human reverses; the judge is a service, not a named staff member; no link to autonomy. |
| Salesforce Agentforce Testing Center | https://www.salesforce.com/blog/agentforce-testing-center-usecase-blog/ (2025-11-04) | Custom LLM-as-judge evaluations return a score with reasoning; HITL feedback captured during tests. | Pre-production test runs; no stored reversible verdict, no window, no tier effect. |
| Google Vertex Agent Engine evaluation | https://docs.cloud.google.com/agent-builder/agent-engine/evaluate (2026-09-03) | Offline evaluations, simulated behaviour, online monitors, failure clusters. | No human override of a verdict documented; no reversal window; no tier. |

## Searched and not found

Anthropic Managed Agents (agent self-evaluates and iterates; not a second agent on the record); Copilot Studio Evaluate (single 'General quality' AI test method, no reversal); IBM watsonx Orchestrate custom LLM-as-a-Judge (GA 2026-08-31, scores not reversible decisions); Beam Learning Hub (auto-rewrites prompts on low scores); Glean, ServiceNow, Relevance, CrewAI, Lindy, Credo: no reviewer-agent verdict row or reversal window found.

## Sources

- https://paperclip.ing/changelog/v2026.817.0/ (2026-08-17)
- https://paperclip.ing/changelog/v2026.824.0/ (2026-08-24)
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html (2026-09-11)
- https://www.salesforce.com/blog/agentforce-testing-center-usecase-blog/ (2025-11-04)
- https://gearset.com/blog/agentforce-testing-center/ (2025-05-22)
- https://docs.cloud.google.com/agent-builder/agent-engine/evaluate (2026-09-03)
- https://www.ibm.com/new/announcements/new-in-ibm-watsonx-orchestrate-cross-platform-agent-discovery-custom-evaluation-and-agentops-agent-goes-ga (2026-09-03)
