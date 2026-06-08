# DeepBench — Architecture North Star
# Version: v5.1.x | Last updated: 2026-06-08 | Session: S-ARCH-01

> Locked decisions are marked **[LOCKED]**. Do not change without explicit product approval.
> This document supersedes all prior architecture notes.

---

## 0. The Product Pitch [LOCKED]

> "Your team, without the headcount or loss of domain knowledge."

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

## 2. The Capability Spectrum Model [LOCKED — North Star]

This is the most important architectural concept. It is NOT fully implemented yet.
Every session between now and S-INFRA-01 builds toward it.

### Core Concept
A capability has a measurable depth spectrum:

| Level | Name | Description |
|-------|------|-------------|
| 1 | General | Baseline LLM or deterministic logic, no training, lowest cost |
| 2 | Trained | RAG docs added, knows a specific domain |
| 3 | Expert | Deeply trained, specialized, self-improving |
| 4 | Proprietary | User's own IP — private, chargeable to others |

An **agent** is a named persona authorized to use a set of capabilities at specific depth levels.
The persona (name, voice, avatar, behavioral prompt) makes it human-facing.
The capability depth is what makes it valuable and measurable.

### Capability Access Tags
Each capability assignment carries access metadata:
- **Exclusivity** — exclusive (only one agent) or shared (multiple agents)
- **Visibility** — public (discoverable by others) or private (tenant-only)

These tags determine how capabilities are surfaced in the marketplace and resold.

### What This Means for Agents
- Training an agent = deepening a specific capability, not training the agent generically
- A trained capability can be assigned to multiple agents simultaneously (unless tagged exclusive)
- Two agents with the same capability at different depths produce comparable but measurably, statistically, and explicably different outputs — depth difference is a core product proof point
- Two agents with the same capability and depth but different assigned LLMs will produce outputs that are measurably different; the gap (or lack thereof) is unknown until tested
- The Personnel File is not just a profile — it is an agent's **capability dashboard**

### Agent Personality Layer
An agent's behavioral prompt defines its personality — how it communicates, its tone, its reasoning style, its domain voice. This is stored in Supabase `agent_configs`, not in code. Two agents with identical capability assignments can have entirely different personalities (e.g. one pessimistic/risk-focused, one optimistic/opportunity-focused). This behavioral layer is what makes each agent unique and valuable beyond its capability list.

### What This Means for Routing
Routing is capability matching, not agent matching:
1. What capability does this task require?
2. Which agent has the deepest assignment of that capability?
3. Route to that agent

**Two routing modes:**
- **Efficiency mode** — fastest path, lowest cost, lightest capable depth
- **Deep knowledge mode** — highest quality, deepest capability, may be slower and costlier

The routing service accepts `mode` as a parameter.

### What This Means for the Business Model
- Charge by capability depth — deeper = more valuable, higher price
- Charge by agent — the ability to build up an agent's skill set without starting over; the most capable agents are resellable assets; access and outputs can be sold multiple times
- Pre-built agents: capability depth pre-assigned, user pays for the configuration
- Build-your-own: user selects capabilities from a menu, assigns depth, sets persona and behavioral prompt
- Users can publish their trained capability spectrum as a service (their IP, their revenue)
- Users keep capability spectrum private — the output is their competitive advantage
- Test Team screen: compare outputs across capability depths and LLM assignments within one capability

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

```sql
-- Capability registry
capabilities (id, name, slug, description, phase, default_model, created_at)

-- Per-agent capability assignments with access tags
agent_capability_assignments (
  id, tenant_id, agent_id, capability_slug, depth_level (1-4),
  llm_provider, llm_model, api_key_ref,
  is_exclusive, is_public,
  cost_per_use, created_at
)

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

---

## 14. Agent Configuration Model [LOCKED]

All agents share the same configuration options. No agent has unique hard-coded behavior in the codebase.

**Every agent may have:**
- A behavioral prompt (personality, tone, reasoning style) stored in Supabase `agent_configs`
- A set of capability assignments at specific depth levels
- An assigned LLM provider and model per capability (default: platform keys; BYOK: tenant keys)
- A RAG knowledge base in `knowledge_entries` scoped to their assigned capabilities
- Access tags on their capabilities: exclusive/shared, public/private
- `isIntern: true` flag — disables RAG, disables self-learning, reduces cost tier
- `isPlanner: true` flag — surfaces in task planning flows

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
