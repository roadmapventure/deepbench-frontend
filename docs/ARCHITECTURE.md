# DeepBench — Architecture North Star
# Version: v5.2 | Last updated: 2026-06-18 | Session: Architecture Model Redesign

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

## 0b. The DEEP / BENCH Model [LOCKED]

DeepBench's name is its architecture. The product has two sides — each with named components that map directly to the product experience.

```
DEEP                            BENCH
────────────────────────        ──────────────────────
Services                        Agents
Skills                          Deliverables
Capabilities
```

**DEEP — 3 components** — the engine that builds and trains expertise
- **Services** (Technical Services) — the AI Pattern and Deterministic execution engine; how Skills run
- **Skills** — the atomic unit; five types (Identity, Behavior, Knowledge, Intent, Format) configured into Skill Profiles
- **Capabilities** — grouped Skill Profiles packaged into reusable, priceable, MCP-accessible expertise

**BENCH — 2 components** — the workforce you deploy and the work they produce
- **Agents** — Competencies with a persona (name, avatar, role); the named workforce members
- **Deliverables** — the typed, governed, auditable output produced at every level of execution

**The pitch sentence:**
> *"DeepBench has two sides: DEEP — Technical Services, Skills, and Capabilities — the engine that builds and trains expertise; and BENCH — Agents and Deliverables — the workforce you deploy and the work they produce."*

**Why the name works architecturally:**
- DEEP = depth of training, depth of knowledge, depth levels (L1–L4) — the compounding asset
- BENCH = the workforce bench — the agents ready to deploy, the deliverables they produce
- The deeper the DEEP, the more valuable the BENCH

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
- **Work** — work order assignment, step execution, HITL management, capability audit
- **Bench** — team roster, personnel files, skill profile assignments, training

New modules can be added without changing Layers 1 or 3.
A module can be removed without affecting agent capabilities.

### Layer 3 — Agent Capability Services
Independent, discrete, deployable capability services. The nucleus of the product.

**Critical rules [LOCKED]:**
- Capabilities are independent of any specific agent
- An agent does not OWN a capability — it holds Seniority to USE one at a certain Level
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
| DB Assembly | System | `api/agent-run.js` (partial) | `api/prompt/db-assembly.js` |
| AI Enrichment | AI + System | `api/agent-run.js` (partial) | `api/prompt/ai-enrichment.js` |
| Request & Receivable | AI | `api/agent-run.js` (partial) | `api/prompt/request-receivable.js` |
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

## 2. The Platform Model [LOCKED — Vocabulary + Structure]

> The Platform Model is the core conceptual and data model of DeepBench. Every product feature wraps around this model. All vocabulary defined here is canonical — use it in code comments, UI labels, kickoff docs, and design sessions.
>
> **Updated 2026-06-18 (Architecture Model Redesign):** Supersedes the prior Agent Profile Model (three Competencies). Skills are now the atomic unit of the platform. The hierarchy runs: Technical Services → Skills → Skill Profiles → Capabilities → Competencies → Agents → Deliverables. Intent and Format are now Skill types (no longer standalone entities). AI Patterns and Deterministic logic are now Technical Services — the platform-facing execution engine, not user-facing Skills.
>
> **Important:** Skill Profiles within each Skill type are listed as examples only. Each Skill type requires a dedicated design and modeling session before any Skill Profile inside it is built. We can build a single Skill Profile in one sprint without touching anything else in the model.

---

### Vocabulary

| Term | Definition |
|------|-----------|
| **Technical Service** | An AI Pattern or Deterministic engine that executes a Skill. Platform-facing — never user-facing as a concept. |
| **Skill** | A type of ability the platform supports. Five types: Identity, Behavior, Knowledge, Intent, Format. |
| **Skill Profile** | A configured instance of a Skill type. Where proprietary IP and novel value live. Created by users or platform admins. |
| **Capability** | A grouped set of Skill Profiles with its own Profile. Novel and configurable. |
| **Competency** | An assembled set of Skill Profiles and/or Capabilities. Can be packaged and exposed with or without a persona. |
| **Agent** | A Competency with a persona — name, avatar, role, quip. The human-facing workforce member. |
| **Work Order** | The unit of work assigned to a Competency. Contains Steps. |
| **Step** | A discrete unit of execution within a Work Order. May consume prior Deliverables as input context. |
| **Deliverable** | An output object produced when a Skill, Capability, Step, or Work Order completes execution. First-class entity. |
| **Deliverable Handoff** | A Step property declaring which prior Deliverable(s) it consumes as input context. |
| **Profile** | The configured state of any entity — Skill, Capability, Competency, or Agent. |
| **Level** | Depth and quality grade of a Skill Profile. L1–L4. Determines quality, pricing, and routing. |
| **Grade** | The act of assessing and assigning a Level to a Skill Profile. |
| **Seniority** | Authorizing an Agent to use a Skill Profile or Capability at a specific Level. |
| **Model Score** | Rolled-up score across all Skill Profile Levels held by a Competency. |

> **Reserved term:** "Assignment" means work assigned to a Competency — a Work Order or Step. Never use it to describe Seniority or Skill Profile authorization.

---

### The Hierarchy

```
Technical Services  — AI Patterns + Deterministic (platform-facing execution engine)
  ↓ execute
Skills              — 5 types: Identity, Behavior, Knowledge, Intent, Format
  ↓ configured into
Skill Profiles      — novel, proprietary instances of a Skill (where IP lives)
  ↓ combine into
Capabilities        — grouped Skill Profiles with their own Profile
  ↓ assemble into
Competencies        — packaged Capability sets (with or without a persona)
  ↓ persona-bearing Competency =
Agents              — named, avatared workforce members
  ↓ execute against
Work Orders         — with Steps that may consume prior Deliverables as input
  ↓ produce
Deliverables        — output objects attributed to the producing Competency
```

**Baseline behavior:** A Competency with no defined Skill Profiles still produces output — operating at L1 (General) using generic LLM. The platform model enriches quality and routing precision but never blocks execution. Competencies grow into their profiles one sprint at a time.

---

### The Three Visions

| Audience | Vision |
|----------|--------|
| **Human** | Load your Skills, configure your Profiles, and be recreated as a Competency — your knowledge, behavior, and identity preserved and operational. |
| **Machine** | An LLM assembles Skills, Capabilities, and Competencies at runtime to execute any Work Order or Step without human configuration at call time. |
| **Technical** | Every Skill Profile, Capability, and Agent is configurable, measurable, sharable, revenue-generating, and MCP-accessible at every level of the hierarchy. |

---

### Five Skill Types

Skills are the atomic unit of the platform. Five types are defined. New Skill types can always be added without changing existing ones.

| Skill Type | What it captures | Example Skill Profiles |
|-----------|-----------------|----------------------|
| **Identity** | Who the agent is — mindset, philosophy, personality, ethics | Philosophy, Autonomy, Skeptic Level, Temporal Stance, Epistemology |
| **Behavior** | How the agent thinks and communicates — style, reasoning, tone | Behavioral Style, Collaboration Role, Learning Stance, Peter Principle |
| **Knowledge** | What the agent knows — domain facts, Library content, IP | NIGP Domain Knowledge, Legal Procurement Expertise, Austin FY2025 Data |
| **Intent** | What type of cognitive work the agent performs | Analysis Report, Research Findings, Review Feedback, Draft Document, Monitor & Alert |
| **Format** | What output structures the agent produces | HTML Strategy Brief, Executive Brief, NIGP Dashboard, Structured Report |

Each Skill type can have unlimited Skill Profile instances — created by users or platform admins. A Skill Profile is where novel, proprietary value lives.

---

### Technical Services

Technical Services are the platform-facing execution engine. They are never user-facing as a concept — users configure Skill Profiles, not Technical Services directly. However, Technical Services are visible in the AI Audit screen for cost tracking, governance, and transparency.

**Two categories:**

| Category | Examples | Badge |
|----------|---------|-------|
| **AI Pattern Services** | RAG, Tool Use, Streaming, Structured Output, ReAct, Embeddings, Prompt Chaining, Reflection, Browser Automation, HITL | ✦ AI |
| **Deterministic Services** | Flag Computation, HHI / Vendor Concentration, Column Detection, NIGP Lookup | No badge |

A Skill Profile declares which Technical Service(s) execute it. A Knowledge Skill Profile may use RAG + Embeddings. A Format Skill Profile may use Structured Output. A Deterministic Skill Profile uses a Deterministic Service with no LLM cost.

The `✦ AI` badge appears on every UI element where an AI Pattern Service executes. Deterministic Services do not receive the badge — this distinction is intentional product positioning.

Full Technical Services catalog: `docs/AI-SERVICES.md`

---

### Skill Profiles

A Skill Profile is a configured instance of a Skill type. It is the unit where proprietary value and IP are created and stored.

**Universal properties — apply to every Skill Profile regardless of type:**

| Property | Description | Values |
|----------|-------------|--------|
| **Level** | Depth and quality grade | L1 General · L2 Trained · L3 Expert · L4 Proprietary |
| **Availability** | Who can access this Skill Profile | Public · Private |
| **Exclusivity** | How many Competencies share this Skill Profile | Shared · Exclusive |
| **Pricing** | Cost to access or use | Free · Priced ($/use) |
| **Trainability** | Can this Skill Profile be improved | Trainable · Supervised · Locked |
| **Confidence** | Calibration level of output | *(scale TBD in design session)* |
| **LLM Provider** | Which AI provider executes this Skill Profile | Anthropic · OpenAI · *(future: others)* |
| **LLM Model** | Specific model assigned | Haiku · Sonnet · GPT-4o · *(future: others)* |
| **Max Tokens** | Token budget ceiling for this Skill's LLM call | Integer — e.g. 1200 · 4000 · 8000 |
| **API Key Source** | Who provides the API key | Platform · BYOK |
| **Execution Type** | Technical Service category | AI (+ which pattern) · Deterministic |

---

### Capabilities

A Capability is a grouped set of Skill Profiles with its own Profile. Capabilities are novel and configurable — created by users or platform admins.

**Rules [LOCKED]:**
- A Capability is independent of any specific Agent
- An Agent does not OWN a Capability — it holds Seniority to USE one at a specific Level
- A Capability can be packaged and sold via MCP without being wrapped in an Agent
- New Capabilities are additive — never modify an existing Capability to serve a new purpose
- Capability routes are named for the capability, never for the agent

---

### Competencies and Agents

A Competency is an assembled set of Skill Profiles and/or Capabilities. It can be packaged and exposed with or without a persona.

**Agent = a Competency with a persona.**

| Type | Has persona | Example |
|------|-------------|---------|
| **Agent** | Yes — name, avatar, role, quip | Chloe Okafor (JR-01), Mike Alvarez (SR-02) |
| **Standalone Competency** | No | NIGP Analysis Capability exposed via MCP directly |

An Agent does not own its Skill Profiles or Capabilities — it holds Seniority in them at specific Levels. Two Agents can hold Seniority in the same Skill Profile at different Levels.

---

### Deliverables

A Deliverable is an output object produced when any level of the hierarchy executes. Deliverables are first-class entities — stored, reviewable, approvable, shareable, and sellable independently.

**Four Deliverable types:**

| Type | When produced | Example |
|------|---------------|---------|
| **Skill Deliverable** | A single Skill Profile executes | RAG retrieval result, extracted document summary |
| **Capability Deliverable** | A Capability completes | NIGP Analysis output |
| **Step Deliverable** | A Work Order Step completes | Vendor concentration report (intermediate) |
| **Work Order Deliverable** | The full Work Order completes | Assembled executive brief (final) |

**Deliverable Handoff:** A Step may declare which prior Deliverable(s) it consumes as input context via a `consumes: [deliverable_id]` property. This enables multi-agent workflows where one Competency's output becomes another's input.

**Attribution:** Every Deliverable is attributed to the Competency that produced it — which may be an Agent (Competency with persona) or a standalone Capability (Competency without persona). Attribution field: `competency_id`.

**Status lifecycle:** draft → approved → change_requested → resolved

---

### Key Rules [LOCKED]

1. **Skills are the atomic unit.** Everything else is composition — Capabilities group Skill Profiles, Competencies assemble Capabilities.
2. **Skill Profiles are where IP lives.** The Skill type is generic. The Skill Profile is proprietary, configurable, and revenue-generating.
3. **Technical Services are platform-facing.** Users configure Skill Profiles, not Technical Services. Technical Services are visible only in the AI Audit screen for transparency and governance.
4. **Capabilities are shared resources.** Built once, assigned to many Agents at different Levels via Seniority.
5. **Agents hold Seniority, not ownership.** An Agent does not own a Skill Profile or Capability — it is authorized to use one at a specific Level.
6. **Agent = Competency with persona.** A Competency without a persona is a valid, sellable, MCP-accessible product.
7. **Every level can produce a Deliverable.** A Skill, Capability, Step, or Work Order can produce a Deliverable. No level is output-less by definition.
8. **Deliverables are attributed to Competencies.** Not specifically to Agents. An Agent is a Competency.
9. **Baseline is always L1.** A Competency with no Skill Profiles still executes using generic LLM. The model enriches; it never blocks.
10. **Grade is the verb; Level is the noun.** Levels roll up to Capability Levels, which roll up to the Competency Model Score.
11. **"Assignment" means work.** Never use it for Seniority or Skill Profile authorization. Assignment = Work Order or Step assigned to a Competency.
12. **Model Score is always derived.** Never hardcoded. Always rolled up from actual assigned Skill Profile Levels.

---

### DB Architecture — Current State
**[CORRECTED 2026-07-01, S-APPLE-02a-design]** This section previously read "Target State... do not build before S-INFRA-01." That was stale: `skill_types` (5 rows), `skill_profiles` (13 rows), `capabilities` (8 rows), `capability_skill_profiles` (13 rows), and `agent_capability_assignments` (8 rows) are all live in Supabase today and already wired into `api/prompt/db-assembly.js`'s `assemblePrompt()` — confirmed by direct schema query during S-APPLE-02a-design. What remains gated behind S-INFRA-01 is only the items explicitly listed in Section 4 (per-Skill-Profile LLM/BYOK superadmin config) and the `skill_profile_slug` scoping columns on `agent_configs`/`knowledge_entries` (Section 9) that turn the Library into per-division Data Rooms. The Taxonomy (Layer 1) and Seniority (Layer 2) tables below are live now — new Capabilities and Skill Profiles can be created against them without waiting for S-INFRA-01.

**Known gap (2026-07-01):** `assemblePrompt()` loads every `skill_profiles` row attached to a `capability_slug` unconditionally — there is no per-call filter when a Capability has more than one Intent-type Skill Profile (e.g. a capability with both a "routing" intent and an "answer" intent would load both into every call). No existing capability has hit this yet; S-APPLE-02b is the first to need it and must add the filter as part of its own scope.

> For the full Skill Profile design guide — Traits, Capabilities assembly, Technical Services invocation,
> domain-agnostic principle, sprint template — see **docs/SKILL-PROFILE-MODEL.md**.

**Layer 1 — Taxonomy** *(the catalog — rarely changes)*
```sql
-- Global; no tenant scope
skill_types (id, slug, name, description, display_order)

-- tenant_id null = platform-wide; non-null = tenant-private
skill_profiles (
  id, slug, name, description,
  skill_type_slug,
  objective, method, output_desc,
  tone, confidence,
  traits jsonb,
  guardrails jsonb,
  notes,
  technical_services jsonb,   -- AI Patterns — seeded [] until Work Side wired
  llm_provider,               -- 'anthropic' | 'openai' | future: others (default: 'anthropic')
  llm_model,                  -- e.g. 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6'
  max_tokens int,             -- token budget ceiling for this Skill's LLM call
  api_key_source,             -- 'platform' | 'byok'
  execution_type,
  tenant_id,
  created_at
)

-- tenant_id null = platform-wide; non-null = tenant-private
capabilities (
  id, slug, name, description,
  execution_type,
  tenant_id,
  created_at
)

-- Level lives here (Skill's quality level within a Capability) — NOT on the agent
capability_skill_profiles (
  id, capability_slug, skill_profile_slug,
  level,              -- L1–L4: this Skill's quality level within this Capability
  is_required,
  display_order,
  created_at
)
```

**Layer 2 — Seniority** *(per-Agent — 1-to-many)*
```sql
-- Agents are assigned to Capabilities — not to individual Skill Profiles
-- Agents inherit level from capability_skill_profiles.level (no per-agent ceiling yet)
agent_capability_assignments (
  id, tenant_id, agent_id,
  capability_slug,    -- FK → capabilities.slug
  created_at
)
```

**Layer 3 — Instances** *(runtime output — what Competencies actually produce)*
```sql
deliverables (
  id, tenant_id, work_order_id, step_id, competency_id,
  skill_profile_slug, type, title,
  content jsonb, format, status,
  level, is_final, version_of,
  consumes jsonb,
  is_public, share_token, price_usd,
  created_at
)
```

---

## 3. Identity / Persona Replication Capability

Replicating a human persona requires two layers. These same two layers apply to all agents — persona replication makes them explicit.

**Layer A — Behavioral (system prompt → Supabase `agent_configs`)**
How the agent thinks. Behavioral Skill Profile — working style, decision patterns, tone.
Stored in Supabase, loaded at every call. Not stored in code or config files.
This is private to the Agent and makes it unique — it is not shared or exposed.

**Layer B — Knowledge (RAG → pgvector → `knowledge_entries`)**
What the agent knows. Knowledge Skill Profile — domain expertise, frameworks, past work, IP.
Retrieved at query time. Deepens with every uploaded document.

**The Library and Data Rooms:** `knowledge_entries` is the storage layer for **the Library** — the platform-wide term for all business-data storage, spanning every tenant. **A Data Room is a scoped subset of the Library** — the documents available to one division or Skill Profile (e.g. Apple's CSO's Data Room). Today nothing enforces that scoping in schema; every Apple agent reads from one shared, undivided collection. The planned mechanism for real Data Room boundaries is the `skill_profile_slug` column landing on `knowledge_entries` in S-INFRA-01 (see Section 2 DB Architecture) — filtering the Library by that column is what will produce a specific division's Data Room.

**Skill Profile depth for Persona Replication:**
- Level 1 — Behavioral Skill Profile loaded (system prompt only, no RAG)
- Level 2 — Trained on person's domain knowledge (Knowledge Skill Profile via RAG documents)
- Level 3 — Self-improving from ongoing work output
- Level 4 — Proprietary IP — private, competitive advantage, chargeable

MD files are valid training documents — same pipeline as PDFs, skip extraction, go straight to chunking and embedding. The Teach screen supports `.md` uploads.

### Three Training Material Types

Not all training material is the same. These types are the inputs that feed Knowledge and Behavior Skill Profiles:

| Type | What it captures | Where it goes | Develops → |
|------|-----------------|---------------|-----------|
| **Knowledge** | Facts, domain expertise, reference material | RAG → pgvector | Knowledge Skill Profile |
| **Behavioral** | How the agent thinks, communicates, prioritizes | System prompt → `agent_configs` | Behavior Skill Profile |
| **Reasoning Pattern** | How decisions were reached — the arc of thinking, not just the conclusion | RAG → pgvector, tagged `training_type = 'reasoning'` | Knowledge Skill Profile (reasoning-tagged) |

Reasoning Pattern material is the most valuable and the hardest to replicate. It teaches an agent to run the same diagnostic process on a new problem — not just recall past answers. A session transcript where a human works from a vague problem to a named architecture is more valuable training than a document stating the architecture conclusion alone.

The Teach screen will support tagging uploaded documents by training type. Reasoning Pattern documents are retrieved at higher weight during complex planning and analysis tasks.

---

## 4. Per-Agent LLM Assignment + BYOK [LOCKED — Design Target]

Each Agent can be assigned a different LLM provider (Anthropic, OpenAI, etc.) at the Skill Profile level.
Users bring their own API keys ("BYOK") for any Agent or Skill Profile.
Two Agents with the same Skill Profile but different LLMs produce results whose differences are measurable — the gap is unknown until tested.

**If the user does not bring their own key:** Roadmap Venture provides API access at a margin — a direct revenue line on top of capability pricing.

**Future superadmin + user-facing config:**
- Superadmin backend: configurable LLM model selection per Skill Profile type
- User-facing: when building an Agent with BYOK, user selects their LLM and model

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

api/lib/
  rag.js           — shared RAG service (embed via OpenAI → vector search via Supabase match_knowledge RPC)
                     Single source of truth for all RAG retrieval across the platform.
                     Not a Vercel handler — no default export. Imported directly by:
                       api/rag-query.js (handler wrapper)
                       api/agent-run.js (replacing internal HTTP call)
                       api/prompt/ai-enrichment.js
                     Interface: queryRAG({ queryText, agentId, tenantId, matchCount, scope })
                       → { context: string, chunks: Array, matchCount: number }
```

**Rule [LOCKED — S-PM-03-design 2026-06-22]:** No capability route calls `/api/rag-query`
via internal HTTP. All RAG retrieval imports `queryRAG` from `api/lib/rag.js` directly.
`api/rag-query.js` remains as a thin public handler for external/frontend callers only.

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

**[UPDATED Apple v5 Redesign 2026-06-30]** `/` now routes to Market Intelligence, not Work dashboard — see `docs/APPLE-AGENT-1-v5-DESIGN.md` §1 and `FEATURES.md` SH-15. Work dashboard moves to an explicit path.

| URL | Screen |
|-----|--------|
| `/` | Market Intelligence (default landing route, after splash) |
| `/work` | Work dashboard |
| `/work/new` | Assign new work |
| `/work/[workOrderId]` | Work Order execution / step detail |
| `/work/[workOrderId]/analyze` | NIGP Analyzer scoped to a Work Order |
| `/work/[workOrderId]/audit` | Capability Audit per-Work Order (S-AI-01) |
| `/bench` | Team roster |
| `/bench/[agentId]` | Personnel file |

---

## 9. Database — Current + Target State

### Current tables

**`tasks`** *(will be renamed `work_orders` in a future session)*
```sql
id, tenant_id, title, agent_id, type, status, priority, due, preview,
csv_path, mapping (jsonb), ai_result (jsonb), has_hitl, steps (jsonb),
created_at, updated_at
```

**`agent_configs`**
`id, agent_id, tenant_id, type, name, text, is_default, is_user_selectable, created_at, updated_at`
Stores Behavioral Skill Profile data (personality layer), output format rules, and guardrails per agent.
This table evolves — in S-INFRA-01 it gains `skill_profile_slug` scoping.

**`knowledge_entries`** — RAG knowledge base (pgvector embeddings). Stores Knowledge Skill Profile data.
**[UPDATED S-APPLE-01b-design 2026-07-01, corrected against live schema]** Gains 6 new columns for Data Room versioning, confidence-tier tagging, and Demo Reset (Market Intelligence only — see `docs/APPLE-AGENT-1-v5-DESIGN.md` §7): `data_type text default 'sourced'` (sourced/inferred/synthesized/learned — was referenced throughout the design's §3 model but never actually added to schema until this correction), `citeable boolean default true` (same gap), `is_baseline boolean default false`, `supersedes_id uuid null`, `confidence text null`, `override_flag boolean null`. `status` (existing column, unchanged) gains `superseded`/`archived` as valid values alongside its current `active` default — not a new column. Rule: rows are never overwritten, only ever inserted — a correction always supersedes via a new row, never mutates the original. This is otherwise not changing in S-INFRA-01.
**`agent_run_log`** — Brent fetch run history.
**`ai_activity_log`** — All capability executions: AI calls (model, tokens, cost, latency) and deterministic calls (execution count, latency, `ai_type = 'deterministic'`). No tokens or cost for deterministic entries. `patterns_used jsonb` column added S-PM-04a — records which AI patterns actually fired on each call (e.g. `["structured-output","tool-use"]`). Frontend routes log via `logAICall()`; `api/prompt/request-receivable.js` logs server-side directly (first server-side logger — required because it has no guaranteed frontend caller).
All tables have `tenant_id`.

**`deliverables`** *(created S-PM-04a)*
```sql
id uuid primary key,
tenant_id text not null,
task_id uuid,                    -- FK → tasks.id (null for MCP callers)
step_id uuid,                    -- FK → tasks.steps jsonb (null until S-DELIVER-04)
agent_id text,                   -- agent who produced this deliverable
skill_profile_slug text,         -- Format Skill Profile that governed output
type text,                       -- 'plan' | 'report' | 'brief' | 'analysis' | 'action' | etc.
title text,                      -- LLM-generated title from response content (max 8 words)
content jsonb,                   -- parsed response: structured object, html string, prose, or action payload
format text,                     -- output_type from format_contract: 'json' | 'html' | 'docx' | 'pdf' | 'action'
status text default 'draft',     -- 'draft' | 'approved' | 'change_requested'
handler text,                    -- handler slug used: 'store' | 'dispatch' | 'package' | 'mcp'
level int,                       -- Skill Profile level at time of production (null until S-DELIVER-04)
is_final boolean default false,  -- true when promoted to task-level final deliverable
version_of uuid,                 -- FK → deliverables.id for revision history (null for originals)
consumes jsonb,                  -- upstream deliverable IDs this one consumed as input
is_public boolean default false,
is_shared boolean default false,
share_token text,
price_usd numeric,
created_at timestamptz default now()
```
S-PM-04a only populates: `id, tenant_id, task_id, agent_id, skill_profile_slug, type, title, content, format, status, handler, created_at`. All other columns nullable until S-DELIVER-04.

**Storage bucket:** `task-data` (private, signed URLs) — path: `{tenant_id}/{task_id}/{filename}.csv`

### Target state — S-INFRA-01 (do not build yet, design toward)

See Section 2 DB Architecture for the full three-layer target state (Taxonomy / Seniority / Instances).

```sql
-- Tenant-owned API keys
tenant_api_keys (id, tenant_id, provider, key_encrypted, created_at)
```

`agent_configs` gains a `skill_profile_slug` column — training content scoped by Skill Profile, not just by agent.
`knowledge_entries` gains a `skill_profile_slug` column — RAG knowledge scoped by Skill Profile. This is the mechanism that turns the Library into per-division Data Rooms (see Section 3).
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

**Known gap (2026-07-01):** RLS is currently disabled on `knowledge_entries` and every other Supabase table — `tenant_id` filtering happens only in application code (e.g. `queryRAG()`'s `p_tenant_id` param), not enforced at the data layer. Real tenant isolation (so one tenant's agents cannot read another's Data Room) needs both RLS policies and a real enforcement point at query time. **The Librarian** (`FEATURES.md` AG-27, roadmap) is the proposed agent-level answer to the latter — retrieval brokered through a custodian agent rather than trusted per-caller scoping.

---

## 11. External Services

| Service | Purpose | Env var |
|---------|---------|---------|
| Anthropic Claude Haiku | Classification, routing, short answers | `ANTHROPIC_API_KEY` |
| Anthropic Claude Sonnet | Briefings, reasoning, planning, long-form | `ANTHROPIC_API_KEY` |
| Supabase | Work Orders, RAG, agent configs, run logs, capability audit log, CSV storage | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |
| OpenAI `text-embedding-3-small` | RAG vector embeddings | `OPENAI_API_KEY` |
| Railway | Persistent Node.js + Playwright backend (browser automation) | `PORT`, `ALLOWED_ORIGINS`, `VERCEL_API_BASE` |
| Vercel | Frontend + serverless capability routes | auto-configured |

**Future (S-INFRA-01):** Model selection per Skill Profile becomes configurable via superadmin backend, not hardcoded. Users with BYOK select their own LLM provider and model when building an Agent or Skill Profile.

---

## 12. AI Call Rules [LOCKED]

| Rule | Detail |
|------|--------|
| Model selection | Haiku: classification, routing, short answers. Sonnet: complex reasoning, ReAct loops, long briefings. Never Sonnet where Haiku suffices (~20x cost). Future: configurable per Skill Profile via superadmin. |
| Structured output | Use Claude tool use / `response_format`. Never parse free-text JSON. |
| Token budgeting | Every call has explicit `max_tokens`. Uncapped calls balloon cost. Configurable per Skill Profile via `skill_profiles.max_tokens`. |
| Streaming | Only where UX benefit justifies overhead. Yes: task planning, AI Review. No: routing, classification. |
| Prompt caching | System prompts that don't change use Anthropic prompt caching. |
| RAG retrieval | Cap `match_count` on vector searches. Never uncap. Configurable per Skill Profile via fetch_instruction in Prompt Specification. |
| Logging | Every Layer 3 capability route logs to `ai_activity_log` via `logAICall()`. No exceptions — AI and deterministic alike. |
| REFLECT | Haiku pre-run synthesis. Declared on a Skill Profile via `technical_services: ["reflect"]`. Runs inside Prompt Builder after Fetch + Render. Inserts an Execution Plan section into the assembled prompt. Never runs automatically — must be declared. |
| Intelligent Synthesis | Haiku full-prompt rewrite. Declared on a Skill Profile via `technical_services: ["intelligent-synthesis"]`. Runs inside Prompt Builder last — after REFLECT. Rewrites the complete assembled prompt against the token budget. A rewrite, not a filter. Never runs automatically — must be declared. |

### Capability Badge Rule [LOCKED]
`✦ AI` badge on every AI-touched UI element.
Deterministic Technical Services (`computeFlags`, HHI, column detection, NIGP lookup) do **NOT** get the badge.
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
7. Agent profiles define voice and persona only — Skill Profiles are never written into an Agent's persona definition
8. Railway is for browser automation only — all AI and Supabase calls go through Vercel serverless
9. Multi-tenancy stubs stay in place on every table and constant — never remove them
10. Per-Agent LLM assignment and BYOK must not be blocked by any code written before S-INFRA-01
11. **Never delete Supabase data or agent configuration data without explicit confirmation from John**
12. Every `logAICall()` invocation must include `skill_profile_slug`, `step_id`, `deliverable_id`, and `level` once S-INFRA-01 ships — no AI call is logged without its full lineage. Until then, pass whatever subset is available and leave the rest null. Never remove an existing logging call.
13. The platform's internal capabilities (Task Planning, Title Generation, Agent Routing) are Deliverables produced by Competencies — treat them as first-class entries in `ai_activity_log` with the same lineage fields, not as special system events.
14. **Content specialists (planners, researchers, analysts) never own Format Skills.** Format Skill ownership belongs exclusively to display/editor agents (Screen Controls, HTML Display, PDF Assembly). This enforces the content vs. display separation principle locked in S-PM-08-design (2026-06-23). See Section 19.
15. **Display agents are the single source of truth for all presentation output.** Never hardcode formatting in content specialist skill profiles or request-receivable.js. One trait update to a display agent propagates to all consumers platform-wide with no code changes.
16. **Dan Bingham's agent_id (ps-01) must accompany every Prompt Service call** in ai_activity_log. Dan is a named team member, not a platform utility. His contribution is logged separately from the requesting agent so his value is visible in the AI Audit. See Section 19.

---

## 14. Agent Configuration Model [LOCKED]

All Agents share the same configuration options. No Agent has unique hard-coded behavior in the codebase.

**Every Agent may have:**
- A Behavior Skill Profile (personality, tone, reasoning style) stored in Supabase `agent_configs`
- Seniority in a set of Skill Profiles at specific Levels (see Section 2 Platform Model)
- An assigned LLM provider and model per Skill Profile (default: platform keys; BYOK: tenant keys)
- A Knowledge Skill Profile in `knowledge_entries` scoped to their assigned Skill Profiles
- Access tags on their Skill Profiles: exclusive/shared, public/private

**Current code flags** *(do not remove before S-INFRA-01 — future design session will map these to Platform Model Skill types)*
- `isIntern: true` — disables RAG, disables self-learning, reduces cost tier. Will map to Identity + Knowledge Skill Profile constraints.
- `isPlanner: true` — surfaces in work order planning flows. Will map to Seniority in Task Planning Skill Profile.

These configuration options are available to any Agent. Individual Agents (Michelle, Pat, Brent, etc.) are instances of this model — not special cases.

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
All Supabase data (agent configs, knowledge entries, run logs, Skill Profile assignments) persists through migration.
During dev and testing, DeepBench reads the same Supabase instance as NIGP — agents appear identical in both.
Divergence begins only when DeepBench goes live and new training/config work happens exclusively in DeepBench.
**Never delete Supabase data or agent configuration data without explicit confirmation from John.**

**Pre-migration question (answer at S-MIGRATE-01 start):**
Do NIGP and DeepBench share the same Supabase instance?
Check: `nigp-analyzer-agent-api` env vars or server.js `SUPABASE_URL`.

---

## 19. Agent Collaboration Model — Prompt Architect + Display Specialists [LOCKED S-PM-08-design 2026-06-23]

### The Founding Principle of the Prompt Service (NEVER VIOLATE)

The Prompt Service is a dumb, agnostic assembler and enricher. It has no conditionals based on content type, agent type, or deliverable type. All intelligence lives in skill profile traits. If you find yourself writing an `if (agentId === 'x')` or `if (deliverable_type === 'pdf')` inside db-assembly.js, ai-enrichment.js, or request-receivable.js — stop. The fix is a trait, not a conditional. The value of DeepBench's Prompt Service is that it showcases a higher standard than the industry default (hardcoded prompts, hardcoded logic). That positioning must never be compromised.

---

### Dan Bingham — AI Prompt Strategist (PS-01)

Dan Bingham is a named member of the Bench — not a platform utility. He owns the DB Assembly and AI Enrichment capabilities as his professional expertise. When any agent fires the Prompt Service, Dan is working alongside them as a team member.

| Property | Value |
|----------|-------|
| Code | PS-01 |
| Name | Dan Bingham |
| Role | AI Prompt Strategist |
| Specialty | Prompt Engineering · Context Assembly · Intelligence Architecture |
| Quip | "The right prompt doesn't ask for the answer — it makes the answer inevitable." |
| Capabilities | DB Assembly, AI Enrichment |
| Personnel File | Full: Resume, Playbook, Training, Projects |
| Bench Roster | Yes — visible on Bench alongside all other agents |

**Dan's calling structure:**
- Dan's agent_id (ps-01) is passed alongside the requesting agent in every Prompt Service call
- Dan logs to ai_activity_log separately from the requesting agent (his own service entry in SERVICE_CATALOG)
- The UI shows a small collaboration indicator: "[Primary Agent] + Dan Bingham" wherever the Prompt Service fires
- Dan does NOT appear as a separate step in the work order — his contribution is a background team collaboration

**Dan's skill profiles declare REFLECT and Synthesis configuration via traits:**
- `traits.reflect_prompt` — the REFLECT reasoning prompt, read by AI Enrichment instead of a hardcoded string
- `traits.synthesis_prompt` — the Synthesis quality guidance prompt, read by AI Enrichment instead of a hardcoded string
- Synthesis quality guidance (locked): preserve agent persona and behavioral character as equally important as format and intent; remove redundancy and conflicts between sections; produce one coherent authoritative prompt

---

### Content Specialists vs. Display Specialists

Content specialists focus on domain expertise. Display specialists focus on presentation. These are two separate concerns and must never be mixed in the same agent.

**Content specialists** (Michelle Manning, future Research & Analysis, Data Insights, Document & Compliance agents):
- Own: Identity, Behavior, Knowledge, Intent skills
- **Never own Format Skills** — they are domain experts, not presentation experts
- Their output is the authoritative subject matter content, independent of how it will be displayed
- Adding a new content specialist requires no changes to display logic

**Display/Editor agents** (three agents, named in S-EDITOR-01 design session):
- **Screen Controls Editor** — maps content to defined UI fields and structured screen components
- **HTML Display Editor** — formats content as polished web HTML with proper visual hierarchy
- **PDF Assembly Editor** — renders content as a professional PDF document
- Own the Format Skill for the platform — their traits define presentation for all consumers
- **Updating one display agent's traits propagates everywhere with no code changes**
- Full Personnel Files on the Bench (persona, resume, playbook, training, projects)

**Calling structure:**
1. Work order fires → content specialist agent handles (Michelle for plans, etc.)
2. Content specialist produces subject matter output via DB Assembly + AI Enrichment (Dan's capabilities)
3. Output routes to appropriate display agent based on user's requested output format
4. Display agent applies Format Skill → final Deliverable produced

---

### agents Table in Supabase

A new `agents` table holds professional card data for all agents. Required because DB Assembly needs agent identity data server-side — agents.js is client-only.

| Column | Type | Notes |
|--------|------|-------|
| agent_id | text PK | matches agents.js code (e.g. 'pp-01', 'ps-01') |
| name | text | full display name |
| role | text | job title |
| specialty | text | one-line expertise summary |
| bio | text | longer professional bio |
| tenant_id | uuid | multi-tenancy stub |

Seeded with all 9 existing agents + Dan Bingham + 3 editor agents (names TBD in S-EDITOR-01).
Full agents.js migration (salary, stats, avatar, flags) is a separate future session (S-BENCH-FULL-MIGRATE).

---

## 17. v4 Preservation [LOCKED]

v4.x lives at `nigp.roadmapventure.com` — preserved as-is, not modified.
Tagged on GitHub: `v4.0-production` (frontend), `v4.3.1-backend` (backend).
The NIGP analyzer is not replaced — it is a destination inside DeepBench via `/work/[workOrderId]/analyze`.

---

## 18. Archived — Prior Models (superseded by Section 2)

### 18a — Agent Profile Model / Three Competencies (superseded 2026-06-18)

> Archived 2026-06-18. Superseded by the Platform Model (Section 2). The three-Competency model (Identity / Skills / Knowledge) established the vocabulary of Levels, Seniority, and Grading — all of which survive in the updated model. What changed: Skills are now the atomic unit (not Capabilities within a Competency), Intent and Format are now Skill types, AI Patterns and Deterministic logic are now Technical Services, and Competency is now the assembled entity (not a category container). The core principle — capabilities are independent of agents, agents hold Seniority, the model enriches but never blocks — is unchanged.

### 18b — Capability Spectrum Model (superseded 2026-06-15)

> Archived 2026-06-15. Superseded by the Agent Profile Model, then further by the Platform Model (Section 2). The original Capability Spectrum established L1–L4 depth levels and the principle that capabilities are independent of agents. These concepts survive fully in the current Platform Model under the vocabulary of Skill Profiles, Levels, and Seniority.

#### Original L1–L4 Definition (preserved for reference)

| Level | Name | Description |
|-------|------|-------------|
| 1 | General | Baseline LLM or deterministic logic, no training, lowest cost |
| 2 | Trained | RAG docs added, knows a specific domain |
| 3 | Expert | Deeply trained, specialized, self-improving |
| 4 | Proprietary | User's own IP — private, chargeable to others |
