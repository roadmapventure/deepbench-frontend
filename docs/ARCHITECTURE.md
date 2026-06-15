# DeepBench — Architecture North Star
# Version: v5.2 | Last updated: 2026-06-15 | Session: S-DELIVER-DESIGN

> Locked decisions are marked **[LOCKED]**. Do not change without explicit product approval.
> This document supersedes all prior architecture notes.

---

## 0. The Product Pitch [LOCKED]

> "Your team, without the headcount or loss of domain knowledge."

**Investor / CTO / Chief AI Architect pitch:**
> "DeepBench is the only AI workforce platform where improving agent quality is a training operation, not a software release — because the routing, attribution, and feedback loop are already built into the data model. The same model that governs the product governs the product's own intelligence. It's self-optimizing, the platform scales through training, and work delivered to the customer, not deployment."

**Two audiences simultaneously:**
- **Buyers / agencies** — A production AI workforce platform they can deploy
- **Employers / acquirers** — Live proof that John Leonard can architect and ship production agentic AI systems end-to-end as a non-coder product executive

Design decisions must work for both. When in doubt ask:
*"Does this impress a procurement director AND a VP of Product reviewing John's portfolio?"*

---

## 1. The Four-Layer Architecture [LOCKED]

DeepBench is organized into four layers. Each layer has one responsibility.
No layer duplicates what another layer owns.

```
┌─────────────────────────────────────────────────────────┐
│  Layer 4 — Platform Services                            │
│  Auth · Multi-tenancy · Security · API Gateway          │
│  (stubs today, full implementation v6+)                 │
├─────────────────────────────────────────────────────────┤
│  Layer 2 — Product Modules                              │
│  Work Dashboard · Bench Dashboard                       │
│  (what the user sees; calls Layer 3 for intelligence)   │
├─────────────────────────────────────────────────────────┤
│  Layer 3 — Agent Capability Services                    │
│  Task Planning · RAG Query · Chat · Data Analysis       │
│  Web Research · Document Extraction · Audit Tracking …  │
│  (independent capability services; the product nucleus) │
├─────────────────────────────────────────────────────────┤
│  Layer 1 — Shared Foundation                            │
│  tokens.js · agents.js · supabase.js · config.js        │
│  (single source of truth; everything else reads from here)│
└─────────────────────────────────────────────────────────┘
```

### Layer 1 — Shared Foundation
Design tokens, agent roster data, Supabase client, environment config.
Every other layer reads from this. Nothing duplicates it.

Files: `src/tokens.js`, `src/data/agents.js`, `src/lib/supabase.js`, `src/config.js`

### Layer 2 — Product Modules
The two user-facing dashboards:
- **Work** — task assignment, step execution, HITL management, capability audit
- **Bench** — team roster, personnel files, capability assignments, training

New modules can be added without changing Layers 1 or 3.
A module can be removed without affecting agent capabilities.

### Layer 3 — Agent Capability Services
Independent, discrete, deployable capability services. The nucleus of the product.

**Critical rules [LOCKED]:**
- Capabilities are independent of any specific agent
- An agent does not OWN a capability — it is AUTHORIZED to USE one at a certain depth
- Capability routes are named for the capability, never for the agent
  - ❌ Wrong: `api/michelle-plan.js`
  - ✅ Right: `api/capabilities/task-planning.js`
- No UI logic inside capability routes
- Every capability route logs to `ai_activity_log` via `logAICall()` — no exceptions, including deterministic capabilities
- All external service calls go through the adapter layer (see Section 5)
- New capabilities are new routes — never bolt onto existing ones

**Phase 1 capability routes:**

| Capability | Type | Current route | Target route |
|-----------|------|---------------|-------------|
| Task Planning | AI | `api/plan.js` | `api/capabilities/task-planning.js` |
| Title Generation | AI | `api/title.js` | `api/capabilities/title-generation.js` |
| Agent Routing | AI | inline + `api/rag-query.js` | `api/capabilities/agent-routing.js` |
| RAG Query / Knowledge Retrieval | AI | `api/brief.js` | `api/capabilities/rag-query.js` |
| Chat / Consultative Response | AI | inline in DashboardScreen | `api/capabilities/chat-response.js` |
| Data Analysis | AI + Deterministic | inline in AnalyzerScreen | `api/capabilities/data-analysis.js` |
| Document Extraction | AI | `api/extract.js` | `api/capabilities/document-extraction.js` |
| Web Research / ReAct Loop | AI | Railway `src/agent.js` | Railway only (browser automation) |
| Self-Learning / Knowledge Reinforcement | AI | `api/web-memory.js` | `api/capabilities/knowledge-reinforcement.js` |
| Capability Audit & Cost Tracking | System | `src/hooks/useAIActivity.js` | stays in hooks (client-side aggregation) |
| Identity / Persona Replication | AI | ❌ Not yet built | `api/capabilities/persona-replication.js` |
| Procurement Flags | Deterministic | `computeFlags()` inline | `api/capabilities/procurement-flags.js` |
| Vendor Concentration / HHI | Deterministic | `computeVendorConc()` inline | `api/capabilities/vendor-concentration.js` |
| Column Detection / NIGP Lookup | Deterministic | inline in AnalyzerScreen | `api/capabilities/column-detection.js` |

**Deterministic capabilities** have no model, tokens, or cost — but they log execution count and latency to `ai_activity_log` with `ai_type = 'deterministic'`. They do NOT receive the `✦ AI` badge in the UI. This distinction is intentional product positioning. All capabilities — AI and deterministic — are productized services with a usage/cost model.

### Layer 4 — Platform Services
Auth, multi-tenancy, security certification, database isolation, API gateway.
Stubs exist today (`tenant_id` on every table, `TENANT_ID` constant).
Full implementation is v6+ territory.
Design Layers 1–3 so this layer can wrap them without rewriting them.

---

## 2. Agent Profile Model [LOCKED — Vocabulary + Structure]

> The Agent Profile Model is the core data model of DeepBench. Every product feature on the Bench side wraps around this model. All vocabulary defined here is canonical — use it in code comments, UI labels, kickoff docs, and design sessions.
>
> **Important:** Capabilities within each Competency are listed as candidates only. They are suggestive — not locked. Each Competency requires a dedicated design and modeling session before any Capability inside it is built. We can build a single Capability with a single Property in one sprint without touching anything else in the model.

---

### Vocabulary

| Term | Definition |
|------|-----------|
| **Agent** | Named persona. Has a voice, avatar, role, quip. The human-facing identity. |
| **Competency** | One of four parent categories that define an agent. Every agent has all four. |
| **Capability** | An individual named element within a Competency. The shareable, gradable unit of agent value. |
| **Grade** | Verb — the act of assessing and assigning a Level to a Capability. |
| **Level** | Noun — the result of grading. L1–L4. Determines quality, pricing, and routing. |
| **Seniority** | Authorizing an agent to use a Capability at a specific Level. |
| **Qualities & Properties** | Universal configuration dials that apply to every Capability regardless of Competency. |
| **Method** | Technical implementation layer. How a Capability or Deliverable executes. Never user-facing. |
| **Model Score** | Rolled-up score across all Competency Levels. The agent's overall grade. |

> **Reserved term:** "Assignment" means work assigned to an agent — a task or step. Never use it to describe Seniority or Capability authorization.

---

### The Four Competencies

```
AGENT PROFILE MODEL
│
│  Model Score = rollup of Competency Levels
│  Competency Level = rollup of Capability Levels within it
│  Capability Level = result of grading its Qualities & Properties
│
├── COMPETENCY: Identity       — Who the agent is
├── COMPETENCY: Skills         — What the agent can do
├── COMPETENCY: Knowledge      — What the agent knows
└── COMPETENCY: Deliverables   — What the agent produces
```

**Baseline behavior:** An agent with no defined Competencies or Capabilities still produces output — operating at L1 (General) across the board using generic LLM. The Agent Profile Model enriches quality and routing precision but never blocks execution. Agents grow into their profiles one sprint at a time.

---

### Competency: Identity
*Who the agent is — mindset, philosophy, personality, ethics.*
Capabilities are agent-scoped. Identity does not share across agents.
Design session required before building any Capability here.

**Candidate Capabilities** *(suggestive — not locked)*
- Character
- Ethics
- Behavioral Style
- Philosophy
- Autonomy
- Skeptic Level
- Temporal Stance
- Epistemology
- Collaboration Role
- Learning Stance
- Peter Principle

---

### Competency: Skills
*What the agent can do — named abilities, each with a Level.*
Skills are **shared resources**. The same Skill can be assigned to multiple agents at different Levels. Training a Skill benefits all agents assigned to it.
Design session required before building any Capability here.

**Candidate Capabilities** *(suggestive — not locked)*
- Domain Expertise
- Behavioral Application
- Reasoning

> **Note:** RAG Query, LLM calls, and Playwright are **Methods** — the technical means by which Skills execute. They are not Skills themselves. See Method layer below.

---

### Competency: Knowledge
*What the agent knows — the training corpus that raises Skill Levels.*
Design session required before building any Capability here.

Three training input types feed this Competency and develop corresponding Skills:

| Training Input | What it captures | Develops → Skill Capability |
|---------------|-----------------|---------------------------|
| Knowledge | Domain facts, reference material | Domain Expertise |
| Behavioral | How agent thinks, communicates | Behavioral Application |
| Reasoning Pattern | Decision arcs, annotated thinking | Reasoning |

**Candidate Capabilities** *(suggestive — not locked)*
- Training Volume
- Knowledge Freshness
- Domain Coverage
- Training Streak / Engagement

---

### Competency: Deliverables
*What the agent produces — typed output artifacts.*

> ⚠️ **Full design and modeling session required before any Capability in this Competency is defined or built.** Naming convention for Deliverable Capabilities is TBD in that session.

**Suggested Requirements** — each Deliverable Capability carries a lightweight list of which Skills and Methods are typically needed to produce it. Used by the Planning agent as routing hints, not hard constraints. A Deliverable may require multiple Skills and multiple Methods (1-to-many). A Deliverable can also be produced by multiple agents, which is the entry point for multi-agent routing (see AA-24 — design session required).

**Generic LLM baseline:** A Deliverable can be produced even when no Skills or Methods are formally declared for it. In that case, the Planning agent uses generic LLM judgment to assign and execute. This is L1. Declaring Suggested Requirements raises routing quality and output Level over time.

**Candidate Capabilities** *(suggestive — naming convention TBD in design session)*
- AI Briefing
- Research Report
- Data Analysis Report
- Project Plan
- Presentation
- Document Review

---

### Qualities & Properties
*Universal — same dials on every Capability regardless of Competency.*

| Property | Description | Values |
|----------|-------------|--------|
| **Level** | Result of grading — depth and quality | L1 General · L2 Trained · L3 Expert · L4 Proprietary |
| **Availability** | Who can access this Capability | Public · Private |
| **Exclusivity** | How many agents share this Capability | Shared · Exclusive |
| **Pricing** | Cost to access or use | Free · Priced ($/use) |
| **Trainability** | Can this Capability be improved | Trainable · Supervised · Locked |
| **Confidence** | Calibration level of the Capability's output | *(scale TBD in design session)* |
| **LLM Provider** | Which AI provider executes this Capability | Anthropic · OpenAI · *(future: others)* |
| **LLM Model** | Specific model assigned | Haiku · Sonnet · GPT-4o · *(future: others)* |
| **API Key Source** | Who provides the API key | Platform · BYOK |
| **Type** | Execution type — determines badge and cost model | AI · Deterministic |

---

### Method Layer
*Technical implementation only. How Capabilities and Deliverables execute. Never user-facing. Not named in the product model.*

Methods are properties of Capabilities (each Skill has a primary Method) and candidate properties of Deliverable Capabilities (a Deliverable may require multiple Methods — defined in the Deliverables design session). Methods are accessed through the Service Adapter Layer (Section 5).

**Candidate Methods** *(grow as Capabilities are built)*
- RAG Query — vector similarity search via pgvector
- LLM Call — Anthropic or OpenAI model invocation
- Playwright — browser automation via Railway
- Embeddings — vector generation via OpenAI
- Document Extraction — PDF/text parsing pipeline

---

### Key Rules [LOCKED]

1. **Capabilities are shared resources.** Built once, assigned to many agents. Each Seniority carries its own Level and Properties.
2. **Seniority is per-agent.** An agent's Competency profile is the set of Capabilities they hold Seniority in, each at its own Level.
3. **Grade is the verb; Level is the noun.** Levels roll up to Competency Levels, which roll up to the Model Score.
4. **Methods are not Capabilities.** RAG Query, LLM calls, and Playwright are how Capabilities execute — not what agents can do.
5. **Deliverables require a dedicated design session.** No Deliverable Capability is defined or built without one.
6. **Knowledge feeds Skills.** Training inputs develop Skills Capabilities and raise their Levels. The Knowledge Competency is the corpus; Skills Competency is what grows from it.
7. **Suggested Requirements are hints, not constraints.** They guide the Planning agent — they do not hard-block assignment.
8. **Model Score is always derived.** Never hardcoded. Always rolled up from actual assigned Capability Levels.
9. **"Assignment" means work.** Never use it for Seniority or Capability authorization. Assignment = task or step assigned to an agent.

---

### DB Architecture — Target State
*(Do not build before S-INFRA-01. Design all sessions to not contradict this structure.)*

**Layer 1 — Taxonomy** *(the catalog — rarely changes)*
```sql
competencies (id, slug, name, display_order)

capabilities (
  id, competency_slug, slug, name,
  default_trainable, default_type,
  display_order
)

deliverable_capability_requirements (
  id, deliverable_capability_slug,
  skill_capability_slug,
  primary_method,
  minimum_level, is_required
)
```

**Layer 2 — Seniority** *(per-agent — 1-to-many)*
```sql
agent_capability_assignments (
  id, tenant_id, agent_id, capability_slug,
  level (1-4),
  availability, exclusivity, pricing,
  trainability, confidence,
  llm_provider, llm_model, api_key_ref,
  type, created_at
)
```

**Layer 3 — Instances** *(runtime output — what agents actually produce)*
```sql
deliverables (
  id, tenant_id, task_id, step_id, agent_id,
  capability_slug, type, title,
  content jsonb, format, status,
  level, is_final, version_of,
  is_public, share_token, price_usd,
  created_at
)
```

---

## 3. Identity / Persona Replication Capability

Replicating a human persona requires two layers. These same two layers apply to all agents — persona replication makes them explicit.

**Layer A — Behavioral (system prompt → Supabase `agent_configs`)**
How the agent thinks. Behavioral profile, working style, decision patterns, tone.
Stored in Supabase, loaded at every call. Not stored in code or config files.
This is private to the agent and makes it unique — it is not shared or exposed.

**Layer B — Knowledge (RAG → pgvector → `knowledge_entries`)**
What the agent knows. Domain expertise, frameworks, past work, IP.
Retrieved at query time. Deepens with every uploaded document.

**Capability depth for Persona Replication:**
- Level 1 — Behavioral profile loaded (system prompt only, no RAG)
- Level 2 — Trained on person's domain knowledge (RAG documents added)
- Level 3 — Self-improving from ongoing work output
- Level 4 — Proprietary IP — private, competitive advantage, chargeable

MD files are valid training documents — same pipeline as PDFs, skip extraction, go straight to chunking and embedding. The Teach screen supports `.md` uploads.

### Three Training Material Types

Not all training material is the same. These types are the inputs that feed the Knowledge Competency and develop corresponding Skills Capabilities (see Section 2):

| Type | What it captures | Where it goes | Develops → |
|------|-----------------|---------------|-----------|
| **Knowledge** | Facts, domain expertise, reference material | RAG → pgvector | Domain Expertise Skill |
| **Behavioral** | How the agent thinks, communicates, prioritizes | System prompt → `agent_configs` | Behavioral Application Skill |
| **Reasoning Pattern** | How decisions were reached — the arc of thinking, not just the conclusion | RAG → pgvector, tagged `training_type = 'reasoning'` | Reasoning Skill |

Reasoning Pattern material is the most valuable and the hardest to replicate. It teaches an agent to run the same diagnostic process on a new problem — not just recall past answers. A session transcript where a human works from a vague problem to a named architecture is more valuable training than a document stating the architecture conclusion alone.

The Teach screen will support tagging uploaded documents by training type. Reasoning Pattern documents are retrieved at higher weight during complex planning and analysis tasks.

---

## 4. Per-Agent LLM Assignment + BYOK [LOCKED — Design Target]

Each agent can be assigned a different LLM provider (Anthropic, OpenAI, etc.) at the capability level.
Users bring their own API keys ("BYOK") for any agent or capability.
Two agents with the same capability but different LLMs produce results whose differences are measurable — the gap is unknown until tested.

**If the user does not bring their own key:** Roadmap Venture provides API access at a margin — a direct revenue line on top of capability pricing.

**Future superadmin + user-facing config:**
- Superadmin backend: configurable LLM model selection per capability type
- User-facing: when building an agent with BYOK, user selects their LLM and model

**Implementation: S-INFRA-01** — do not build before that session.
Design all sessions between now and S-INFRA-01 to not contradict this.

**Implications for the adapter layer:**
- Routes by vendor AND by which tenant's key to use
- New `tenant_api_keys` table stores tenant-owned keys (encrypted)
- Platform does not require Roadmap Venture's keys for production tenant use

---

## 5. The Service Adapter Layer [LOCKED]

All external service calls go through a thin adapter layer.
No direct vendor API calls inside capability routes.
Any vendor becomes a rip-and-replace.
Enterprise requirement: a customer can point any adapter at their own infrastructure.

Vercel is the execution platform for capability routes — it is not an external service and does not need an adapter. The adapters cover external APIs called from within Vercel routes.

```
api/adapters/
  anthropic.js     — wraps all Anthropic API calls
  openai.js        — wraps OpenAI API calls (embeddings today, LLM future)
  supabase.js      — wraps Supabase client (references src/lib/supabase.js)
  railway.js       — wraps Railway SSE calls from frontend to backend
```

Capability routes import from adapters. Never call vendor APIs directly.

---

## 6. Frontend / Backend Distribution [LOCKED]

| Infrastructure | Responsibility |
|---------------|----------------|
| Vercel | ALL React UI + ALL AI/Supabase capability routes |
| Railway | Browser automation capability ONLY (Playwright-based web research and fetch tasks) |

No AI calls in Railway. No Playwright in Vercel. This line is permanent.

**NIGP migration implication:**
NIGP has inline AI calls inside React components — those extract to Vercel capability routes.
NIGP has agent data inline in component files — that moves to Layer 1.
After migration, Railway's scope is defined by the capability it serves (browser automation), not by named agents.

---

## 7. Repos and Branch Strategy [LOCKED]

Two separate GitHub repos — not a monorepo.

| Repo | Tech | Deploy |
|------|------|--------|
| `roadmapventure/deepbench-frontend` | React + Vite | Vercel → `deepbench.roadmapventure.com` |
| `roadmapventure/deepbench-backend` | Node.js + Playwright | Railway |

Branch strategy: `main` = production, `dev` = staging. Commit directly to `dev`.
No feature branches during active development.
**Merge `dev → main` only when John explicitly confirms QA passed.**

---

## 8. Routing

| URL | Screen |
|-----|--------|
| `/` | Work dashboard |
| `/work/new` | Assign new work |
| `/work/[taskId]` | Task instructions / step detail |
| `/work/[taskId]/analyze` | NIGP Analyzer scoped to a task |
| `/work/[taskId]/audit` | Capability Audit per-task (S-AI-01) |
| `/bench` | Team roster |
| `/bench/[agentId]` | Personnel file |

---

## 9. Database — Current + Target State

### Current tables

**`tasks`**
```sql
id, tenant_id, title, agent_id, type, status, priority, due, preview,
csv_path, mapping (jsonb), ai_result (jsonb), has_hitl, steps (jsonb),
created_at, updated_at
```

**`agent_configs`**
`id, agent_id, tenant_id, type, name, text, is_default, is_user_selectable, created_at, updated_at`
Stores behavioral prompts (personality layer), output format rules, and guardrails per agent.
This table evolves — in S-INFRA-01 it gains `capability_slug` scoping.

**`knowledge_entries`** — RAG knowledge base (pgvector embeddings). Not changing in S-INFRA-01.
**`agent_run_log`** — Brent fetch run history.
**`ai_activity_log`** — All capability executions: AI calls (model, tokens, cost, latency) and deterministic calls (execution count, latency, `ai_type = 'deterministic'`). No tokens or cost for deterministic entries.
All tables have `tenant_id`.

**Storage bucket:** `task-data` (private, signed URLs) — path: `{tenant_id}/{task_id}/{filename}.csv`

### Target state — S-INFRA-01 (do not build yet, design toward)

See Section 2 DB Architecture for the full three-layer target state (Taxonomy / Seniority / Instances).

```sql
-- Tenant-owned API keys
tenant_api_keys (id, tenant_id, provider, key_encrypted, created_at)
```

`agent_configs` gains a `capability_slug` column — training content scoped by capability, not just by agent.
`knowledge_entries` gains a `capability_slug` column — RAG knowledge scoped by capability.
No data is deleted. All existing records remain. New columns are additive.

**Do not migrate before S-INFRA-01.** Design all sessions to not contradict this structure.

---

## 10. Auth [LOCKED]

No login screen for Phase 1. Single hardcoded constant:
```js
const CURRENT_USER = { name: "John Leonard", workspace: "Roadmap Venture", tenantId: "global" }
```
Clerk added when multi-tenancy arrives — replaces one constant.

Multi-tenancy stubs stay in place on every table (`tenant_id` column) and constant (`TENANT_ID = "global"`).
Never remove them.

---

## 11. External Services

| Service | Purpose | Env var |
|---------|---------|---------|
| Anthropic Claude Haiku | Classification, routing, short answers | `ANTHROPIC_API_KEY` |
| Anthropic Claude Sonnet | Briefings, reasoning, planning, long-form | `ANTHROPIC_API_KEY` |
| Supabase | Tasks, RAG, agent configs, run logs, capability audit log, CSV storage | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |
| OpenAI `text-embedding-3-small` | RAG vector embeddings | `OPENAI_API_KEY` |
| Railway | Persistent Node.js + Playwright backend (browser automation) | `PORT`, `ALLOWED_ORIGINS`, `VERCEL_API_BASE` |
| Vercel | Frontend + serverless capability routes | auto-configured |

**Future (S-INFRA-01):** Model selection per capability becomes configurable via superadmin backend, not hardcoded. Users with BYOK select their own LLM provider and model when building an agent or capability.

---

## 12. AI Call Rules [LOCKED]

| Rule | Detail |
|------|--------|
| Model selection | Haiku: classification, routing, short answers. Sonnet: complex reasoning, ReAct loops, long briefings. Never Sonnet where Haiku suffices (~20x cost). Future: configurable per capability via superadmin. |
| Structured output | Use Claude tool use / `response_format`. Never parse free-text JSON. |
| Token budgeting | Every call has explicit `max_tokens`. Uncapped calls balloon cost. Future: configurable per capability via superadmin. |
| Streaming | Only where UX benefit justifies overhead. Yes: task planning, AI Review. No: routing, classification. |
| Prompt caching | System prompts that don't change use Anthropic prompt caching. |
| RAG retrieval | Cap `match_count` on vector searches. Never uncap. Future: configurable cap via superadmin. |
| Logging | Every Layer 3 capability route logs to `ai_activity_log` via `logAICall()`. No exceptions — AI and deterministic alike. |

### Capability Badge Rule [LOCKED]
`✦ AI` badge on every AI-touched UI element.
Deterministic logic (`computeFlags`, HHI, column detection, NIGP lookup) does **NOT** get the badge.
This distinction is intentional product positioning — it communicates what is AI and what is rule-based.
Both types are productized capabilities with a usage/cost model and are tracked in the capability audit.

---

## 13. Session Seam Line Rules [LOCKED]

These rules apply to every future session. No exceptions without explicit product approval.

1. Never hardcode design tokens, agent data, or Supabase client outside Layer 1 files
2. Never put AI call logic inside a React component — it belongs in a Layer 3 capability route
3. Every Layer 3 route logs to `ai_activity_log` via `logAICall()` — no exceptions, including deterministic capabilities
4. Capability routes are named for the capability, never for the agent
5. Each capability is one independent route — new capabilities are new routes, never bolted onto existing ones
6. All external service calls go through the adapter layer — no direct vendor API calls in routes
7. Agent profiles define voice and persona only — capabilities are never written into an agent's profile
8. Railway is for browser automation only — all AI and Supabase calls go through Vercel serverless
9. Multi-tenancy stubs stay in place on every table and constant — never remove them
10. Per-agent LLM assignment and BYOK must not be blocked by any code written before S-INFRA-01
11. **Never delete Supabase data or agent configuration data without explicit confirmation from John**
12. Every `logAICall()` invocation must include `capability_slug`, `step_id`, `deliverable_id`, and `level` once S-INFRA-01 ships — no AI call is logged without its full lineage. Until then, pass whatever subset is available and leave the rest null. Never remove an existing logging call.
13. The platform's internal capabilities (Task Planning, Title Generation, Agent Routing) are Deliverables produced by agents — treat them as first-class entries in `ai_activity_log` with the same lineage fields, not as special system events.

---

## 14. Agent Configuration Model [LOCKED]

All agents share the same configuration options. No agent has unique hard-coded behavior in the codebase.

**Every agent may have:**
- A behavioral prompt (personality, tone, reasoning style) stored in Supabase `agent_configs`
- Seniority in a set of Capabilities at specific Levels (see Section 2 Agent Profile Model)
- An assigned LLM provider and model per capability (default: platform keys; BYOK: tenant keys)
- A RAG knowledge base in `knowledge_entries` scoped to their assigned capabilities
- Access tags on their capabilities: exclusive/shared, public/private

**Current code flags** *(do not remove before S-INFRA-01 — future design session will map these to Agent Profile Model Competencies)*
- `isIntern: true` — disables RAG, disables self-learning, reduces cost tier. Will map to Identity + Knowledge Competency constraints.
- `isPlanner: true` — surfaces in task planning flows. Will map to Skills Competency: Task Planning Seniority. May become a Seniority Level designation.

These configuration options are available to any agent. Individual agents (Michelle, Pat, Brent, etc.) are instances of this model — not special cases.

---

## 15. Step State Architecture [LOCKED]

Three named operations — do not create variations:

```
initializeStepsFromSupabase()    — direct set, no mergeSteps
initializeStepsFromFirstPlan()   — mergeSteps([], new, [])
updateStepsFromPlan()            — mergeSteps(active, new, archived)
```

- `mergeSteps()` = single source of truth for step state
- `saveStepsToSupabase()` = writes full array including archived
- `pendingArchive` preserved in all writes; stripped only on user approve
- Answers persisted on `step.questions[n].a` — never ephemeral state
- `stepsContext` for LLM strips `mergeStatus`, `pendingArchive`, `title_edited`
- `task.steps` set to `mergedToSet.active` after Update Plan

### Step Color Coding [LOCKED]

| Step type | Style |
|-----------|-------|
| Agent | Brass `#b6873a` left border |
| HITL | Flag red `#a83319` |
| Sub-agent | Blue |
| Archived | Grey, collapsible drawer |
| New (post-regen) | Brass `#b6873a` |

Colors must be preserved through every plan regeneration cycle.

---

## 16. NIGP Migration Plan (S-MIGRATE-01)

NIGP (`nigp-analyzer`, `nigp-analyzer-agent-api`) is proven, QA'd code.
It will be retired once DeepBench is fully operational.
No future development happens in NIGP repos.

**Migration session (S-MIGRATE-01) steps:**
1. Audit NIGP `TeamBuilder.jsx` vs DeepBench `RosterScreen.jsx` — side-by-side diff including all child screens and button-accessible sub-screens
2. Audit NIGP `PersonnelScreen.jsx` vs DeepBench `PersonnelScreen.jsx` — side-by-side diff including all tabs, drawers, and child screens
3. Audit `nigp-analyzer-agent-api/src/server.js` — identify AI routes not yet in DeepBench
4. Extract and redistribute:
   - Agent data → Layer 1 (`src/data/agents.js`)
   - Design tokens → Layer 1 (`src/tokens.js`)
   - UI components → Layer 2 (DeepBench screens), updated to import from Layer 1
   - AI/Supabase calls inline in NIGP components → extract to Layer 3 capability routes
5. Confirm frontend/backend split is correct after extraction
6. Remove duplicate **code** copies of tokens, agent data from NIGP — Supabase data is never deleted

**Data continuity rule:**
All Supabase data (agent configs, knowledge entries, run logs, capability assignments) persists through migration.
During dev and testing, DeepBench reads the same Supabase instance as NIGP — agents appear identical in both.
Divergence begins only when DeepBench goes live and new training/config work happens exclusively in DeepBench.
**Never delete Supabase data or agent configuration data without explicit confirmation from John.**

**Pre-migration question (answer at S-MIGRATE-01 start):**
Do NIGP and DeepBench share the same Supabase instance?
Check: `nigp-analyzer-agent-api` env vars or server.js `SUPABASE_URL`.

---

## 17. v4 Preservation [LOCKED]

v4.x lives at `nigp.roadmapventure.com` — preserved as-is, not modified.
Tagged on GitHub: `v4.0-production` (frontend), `v4.3.1-backend` (backend).
The NIGP analyzer is not replaced — it is a destination inside DeepBench via `/work/[taskId]/analyze`.

---

## 18. Archived — Capability Spectrum Model (superseded by Section 2)

> Archived 2026-06-15. Superseded by the Agent Profile Model (Section 2). Preserved for historical reference.

The original Capability Spectrum Model established L1–L4 depth levels and the principle that capabilities are independent of agents. These concepts survive in the Agent Profile Model under the vocabulary of Competencies, Capabilities, Levels, and Seniority.

### Original Core Concept
A capability had a measurable depth spectrum:

| Level | Name | Description |
|-------|------|-------------|
| 1 | General | Baseline LLM or deterministic logic, no training, lowest cost |
| 2 | Trained | RAG docs added, knows a specific domain |
| 3 | Expert | Deeply trained, specialized, self-improving |
| 4 | Proprietary | User's own IP — private, chargeable to others |

### Original Capability Access Tags
- **Exclusivity** — exclusive (only one agent) or shared (multiple agents)
- **Visibility** — public (discoverable by others) or private (tenant-only)

### Original Business Model Notes
- Charge by capability depth — deeper = more valuable, higher price
- Pre-built agents: capability depth pre-assigned, user pays for the configuration
- Build-your-own: user selects capabilities from a menu, assigns depth, sets persona and behavioral prompt
- Users can publish their trained capability spectrum as a service (their IP, their revenue)
- Test Team screen: compare outputs across capability depths and LLM assignments within one capability

### Original Agent Personality Layer
An agent's behavioral prompt defines its personality — how it communicates, its tone, its reasoning style, its domain voice. Stored in Supabase `agent_configs`, not in code. Two agents with identical capability assignments can have entirely different personalities. This behavioral layer is what makes each agent unique and valuable beyond its capability list.

### Original Routing Model
Routing is capability matching, not agent matching:
1. What capability does this task require?
2. Which agent has the deepest assignment of that capability?
3. Route to that agent

Two routing modes:
- **Efficiency mode** — fastest path, lowest cost, lightest capable depth
- **Deep knowledge mode** — highest quality, deepest capability, may be slower and costlier
