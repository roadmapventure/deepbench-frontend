# AGT-74 — Moat feature 4: Skill edit with a before-and-after across every agent that shares it

<!-- DeepBench | docs/harvests/AGT-74.md | Filed 2026-09-11 by attended session review-govtooling-0910 on John's word ("create these 8 as the project name Moat"). Source of every fact below: the Researcher (GV-02) moat verification pass, docs/research/2026-09-11-p1-moat-verification.json, session lane, logged ai_activity_log 41519. The class argued is Claude's recommendation of 2026-09-11, pending John's ruling. -->

**Class argued:** P3 - Investor Value — the Researcher already classed Training Delta P3 on 2026-09-09; the shared-row mechanism is what makes it verifiable from rows.

**Verdict:** PARTIAL. Competitors lack: shared_skills, ledger.

**Size:** M (2 predicted cycles). **Skill set proven:** Prompt engineering and prompt management; evaluation and regression testing for LLM systems; knowledge management / RAG.

**Depends on (Moat Support):** SES-363.

## The demo an evaluator cannot reproduce elsewhere

Edit one guardrails row and, without touching any agent, see a per-agent delta table for every agent that carries it, computed by re-judging their last logged runs.

## Closest products

| Product | Source (date) | Has | Lacks |
|---|---|---|---|
| Paperclip shared skills and Skill Studio | https://paperclip.ing/product/extensions/ (2026-09-11) | 'Write it once and every agent with the skill follows it'; skills version like code; company-wide or per-role assignment; agents cite the skill in the run log; Skill Studio with sandboxed test runs shipped in v2026.831.0. | A skill is a SKILL.md procedure, not atomic identity/knowledge/behavior/intent/guardrails/format rows assembled into each prompt; no re-judging of every carrier's last runs on edit and no per-agent delta. |
| Microsoft Copilot Studio Evaluate (preview) | https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/analytics-agent-evaluation-intro (2026-08-03) | Named test sets run against a chosen agent version to answer 'Did a configuration change improve or degrade response quality?'. | One agent, one version, one 'General quality' method; instructions are per agent, so an edit cannot fan out across agents. |
| Future AGI skill regression testing | https://futureagi.com/blog/agent-skill-regression-testing/ (2026-08-20) | Paired skill-on/skill-off runs with span traces and evaluators; notes a shared-skill fix propagates to every workflow that uses it. | A methodology on eval tooling, not a platform mechanism keyed to shared rows and agents; no staff. |
| Anthropic Agent Skills | https://claude.com/blog/claude-managed-agents (2026-04-08) | Portable SKILL.md folders reusable across Claude Code, claude.ai and Managed Agents. | No evaluation delta on edit, no ledger of prior runs to re-judge, no agents carrying ratings. |

## Searched and not found

Salesforce Testing Center (re-run tests after edits, single agent); AgentCore Evaluations dataset/batch (re-score traces, not keyed to a shared prompt component); Vertex Agent Engine evaluation; IBM AgentOps agent (optimizes one agent's instructions with GEPA/ACE); Glean, ServiceNow AI Agent Studio (use-case vs agent-specific instructions but no shared-row propagation), Relevance, Lindy shared Skills (workspace-shared, no eval), Beam Learning Hub: none show an edit-once, re-judge-all, delta-per-agent mechanism.

## Sources

- https://paperclip.ing/product/extensions/ (2026-09-11)
- https://github.com/paperclipai/paperclip/releases (2026-08-31)
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/analytics-agent-evaluation-intro (2026-08-03)
- https://futureagi.com/blog/agent-skill-regression-testing/ (2026-08-20)
- https://claude.com/blog/claude-managed-agents (2026-04-08)
- https://www.ibm.com/new/announcements/new-in-ibm-watsonx-orchestrate-cross-platform-agent-discovery-custom-evaluation-and-agentops-agent-goes-ga (2026-09-03)
