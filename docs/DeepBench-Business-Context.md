# DeepBench — Business Context & Strategic Direction

> Reference document — not auto-read every session.
> Pull this in when working on: new feature ideas, product positioning,
> design decisions with strategic implications, or portfolio/career discussions.
> To load: "Read DeepBench-Business-Context.md before we discuss [topic]."

---

## What DeepBench Is

DeepBench is an AI agent workforce platform designed for any business domain
that wants to create AI "employees" to perform redundant human work — strategy
briefs, best practice analysis, web research, website form automation, and
domain memory. Users build a "bench" of specialized AI agents, assign them
work tasks, and manage output through dashboards.

**Long-term personal vision:** John trains an agent to represent his own
knowledge and expertise — ultimately generating reports, deliverables, and
research on his behalf. The platform is both a commercial product and a live
portfolio showcase of John Leonard's AI product architecture depth as a
non-coder product executive.

---

## Origin

Evolved from the NIGP Spend Analyzer (v4.x) — a government procurement spend
analysis tool that remains live at `nigp.roadmapventure.com`. DeepBench is the
platform generalization of that concept, no longer limited to government or
procurement domains.

---

## Who It's For

- Businesses, consultants, software companies, and government agencies
- Organizations wanting AI-augmented data analysis or data cleanup
- Any team needing document automation, web research, or workflow intelligence
- Enterprise buyers needing scalable AI workforce tools

---

## Near-Term Milestones (in order)

1. Complete core platform build — remaining ~50% of PRD features
2. Security review — understand attack surface, privacy exposure, data risks
3. Beta testers — friends and trusted contacts for early feedback
4. NIGP partnership — formal relationship with National Institute of
   Governmental Purchasing
5. First 2–3 paying agency customers
6. Acquisition conversation with strategic buyer (after partnership +
   paying customers confirmed)

---

## Strategic Positioning

**Deterministic + generative hybrid**
Domain logic as primary analytical layer, LLM as intelligence layer over
pre-computed findings. Deliberate differentiator from pure LLM products.
Core architectural identity — never position DeepBench as "just an AI tool."

**The Brent Loop**
ReAct self-learning agent: browser perception → Claude decision → Playwright
action → knowledge write-back to Supabase. Key technical differentiator.
Self-improving over time without retraining.

**AI visibility is intentional**
AIDiamond.jsx animated heartbeat and ✦ AI badges show exactly where AI
replaces conditional logic. Framed for employer and acquirer audiences as
proof of architecture depth, not just decoration.

**Multi-agent orchestration**
Michelle (planner), domain analysts, web agent, intern — each with distinct
roles, trainable via RAG, composable into task workflows. This is the core
product differentiator vs. single-agent tools.

---

## Dual Purpose

DeepBench simultaneously serves two audiences:

| Audience | What They See |
|----------|---------------|
| Buyers / agencies | A production AI workforce platform they can deploy |
| Employers / acquirers | Live proof that John can architect and ship production agentic AI systems end-to-end as a non-coder product executive |

Design decisions should work for both audiences. When in doubt, ask:
*"Does this feature impress a procurement director AND a VP of Product
at a tech company reviewing John's portfolio?"*

---

## Portfolio Signal — Target Role Alignment

DeepBench is designed to directly demonstrate every requirement in senior
agentic AI PM roles. Reference job description: Apple CSO Agentic AI PM.

| Role Requirement | DeepBench Evidence |
|-----------------|-------------------|
| LLM apps: RAG, tool use, agent orchestration | RAG pipeline, Claude tool use, ReAct Brent loop, Michelle planner |
| Multi-agent systems / complex LLM orchestration | 7-agent bench, Michelle orchestrates multi-agent step plans |
| Full-stack: data pipelines through user interfaces | Supabase → Railway → React, end-to-end solo build |
| Evaluation frameworks for LLM outputs | AI Audit screen (S16), per-step confidence scoring, agent_run_log |
| MCP or similar tool-use frameworks | Claude structured tool use throughout |
| Ship products people actually use | Live at deepbench.roadmapventure.com with real data |
| Translate ambiguous problems → scoped agent products | NIGP analyzer origin, procurement domain expertise |
| Embed with business teams, non-technical stakeholders | 20+ years doing this in govtech |
| Comfort with ambiguity, startup environment | Solo founder building production AI platform |
| Track record: consider how tools affect existing workflows | HITL design, step gate logic, human-in-the-loop architecture |

**Elevator pitch for job conversations:**
*"I built a production multi-agent AI workforce platform end-to-end —
architecture, prompting, RAG, tool use, React frontend, Node.js backend —
as a non-coder product executive. DeepBench is live and demonstrates every
capability this role requires."*

---

## Key Relationships

| Person / Org | Role | Status |
|-------------|------|--------|
| NIGP | Partnership target — National Institute of Governmental Purchasing | Not yet signed |
| Periscope / Sovra | Highest-probability strategic acquirer, former employer | Existing relationships, timing TBD |

**Recommended acquisition timing:** After NIGP partnership signed and
2–3 paying agency customers confirmed. Do not approach Periscope/Sovra
before those two milestones are in place.

---

## Feature Idea Triggers

When proposing new features or design directions, consider whether they:

1. **Advance a near-term milestone** — does it help close beta users,
   the NIGP partnership, or the first paying customer?
2. **Strengthen the portfolio signal** — does it add a demonstrable
   capability that maps to the target role requirements above?
3. **Support the self-replication vision** — does it move toward John
   being able to train an agent on his own knowledge and expertise?
4. **Fit the deterministic + generative identity** — does it use AI
   where AI creates leverage, and deterministic logic where rules apply?

If a feature idea scores on 2 or more of these — it belongs in the backlog.
