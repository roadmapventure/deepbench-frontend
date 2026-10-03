# AGT-76 — Moat feature 6: Hiring an agent as staff (drafted, tested, activated, then rated and laddered like everyone)

<!-- DeepBench | docs/harvests/AGT-76.md | Filed 2026-09-11 by attended session review-govtooling-0910 on John's word ("create these 8 as the project name Moat"). Source of every fact below: the Researcher (GV-02) moat verification pass, docs/research/2026-09-11-p1-moat-verification.json, session lane, logged ai_activity_log 41519. The class argued is Claude's recommendation of 2026-09-11, pending John's ruling. -->

**Class argued:** P1 - Improves John's Skills — Paperclip and IBM ship the shape; the earned tier underneath is feature 2's asset.

**Verdict:** PARTIAL. Competitors lack: ladder, shared_skills.

**Size:** S (1 predicted cycle). **Skill set proven:** AI agent lifecycle management; AI governance; FinOps for AI.

**Depends on (Moat Support):** SES-362.

## The demo an evaluator cannot reproduce elsewhere

Flip one activation flag and the same roster screen that rates every other agent immediately lists the new hire with a rating, usage count, cost and a starting tier that the next verdict can move.

## Closest products

| Product | Source (date) | Has | Lacks |
|---|---|---|---|
| Paperclip | https://paperclip.ing/ (2026-09-11) | 'Agents can't hire new agents without your approval'; roles, titles, reporting lines and job descriptions; monthly budget per agent with auto-pause; cost per agent/task/project; 'Evals & saved test runs' and 'Performance reviews for agents' listed as product pillars; skills assignable per role. | No per-agent rating from an independent verifier; trust levels only as an RFC/permission scope driven by run counts; skills are procedures, not atomic rows; no capability broker. |
| IBM watsonx Orchestrate agent onboarding | https://www.ibm.com/new/announcements/revolutionizing-ai-agent-management-with-ibm-watsonx-orchestrate-new-observability-and-governance-capabilities (2026-09-11) | Staging area tests quality, security, cost and latency and computes a quality score before an agent enters the catalog; observability drills to transaction level. | Gate is one-time; no continuing tier, no reviewer verdicts, no shared skill rows. |
| OpenAI ChatGPT workspace agents | https://www.itpro.com/technology/artificial-intelligence/four-things-you-need-to-know-about-openais-new-workspace-agents-for-chatgpt-including-how-to-build-your-own (2026-04-24) | Describe the job, ChatGPT turns it into a shared agent; analytics on runs and users; admin policies, permission prompts and suspension via compliance API. | No cost per agent surfaced, no rating, no tier, no agent-to-agent delegation documented. |
| Copilot Studio + Agent 365 registry | https://learn.microsoft.com/en-us/microsoft-copilot-studio/faqs-agent-creation (2025-12-15) | NL creation generates name, description, instructions and suggested knowledge/tools; agents get an Entra Agent ID and appear in the Agent 365 registry with performance measurement. | No earned tier, no rating from verdicts, instructions per agent rather than shared rows. |

## Searched and not found

Salesforce Agent Builder/Testing Center (test before deploy; no roster rating/tier), ServiceNow AI Agent Studio and Control Tower (lifecycle and risk classification, no earned tier), Gemini Enterprise Agent Designer (publish/share, no ratings), AgentCore (no roster), Anthropic Managed Agents (no roster), Glean Agent Library (upvotes/downvotes and ROI, no tier), Relevance, CrewAI, Lindy, Beam, Credo (declared autonomy): none carry a new agent onto a ladder.

## Sources

- https://paperclip.ing/ (2026-09-11)
- https://paperclip.ing/product/ (2026-09-11)
- https://github.com/paperclipai/paperclip (2026-09-11)
- https://www.ibm.com/new/announcements/revolutionizing-ai-agent-management-with-ibm-watsonx-orchestrate-new-observability-and-governance-capabilities (2026-09-11)
- https://www.itpro.com/technology/artificial-intelligence/four-things-you-need-to-know-about-openais-new-workspace-agents-for-chatgpt-including-how-to-build-your-own (2026-04-24)
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/faqs-agent-creation (2025-12-15)
- https://learn.microsoft.com/en-us/entra/agent-id/agent-registry-convergence (2026-04-05)
