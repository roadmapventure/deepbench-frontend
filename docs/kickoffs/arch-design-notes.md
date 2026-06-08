# DeepBench — Architecture Design Notes
# Session: S-ARCH-01 Design (2026-06-08)
# Status: DECISIONS CAPTURED — ready for architecture doc writing session

> This file is the source document for the next design session.
> That session reads this file and writes the full ARCHITECTURE.md.
> Do not start coding until ARCHITECTURE.md is written and committed.

---

## Purpose of This Document

All architectural decisions made in the S-ARCH-01 design conversation are captured here.
The next session opens this file, iterates the full ARCHITECTURE.md with John, commits it,
and updates FEATURES.md + CLAUDE.md before any coding resumes.

---

## 1. The Product Pitch (Locked)

> "Your team, without the headcount or loss of domain knowledge."

Two audiences simultaneously:
- **Buyers / agencies** — A production AI workforce platform they can deploy
- **Employers / acquirers** — Live proof that John Leonard can architect and ship production agentic AI systems end-to-end as a non-coder product executive

Design decisions should work for both. When in doubt ask:
*"Does this impress a procurement director AND a VP of Product reviewing John's portfolio?"*

---

## 2. The Four-Layer Architecture

### Layer 1 — Shared Foundation
Design tokens, agent roster data, Supabase client, environment config.
Every other layer reads from this. Nothing duplicates it.

Currently fragmented: NIGP has its own inline copies of tokens, agent data, etc.
Goal: one source in DeepBench, consumed by everything.

Files today: `src/tokens.js`, `src/data/agents.js`, `src/lib/supabase.js`, `src/config.js`

### Layer 2 — Product Modules
The two user-facing dashboards:
- **Work** — task assignment, step execution, HITL management, AI audit
- **Bench** — team roster, personnel files, capability assignments, training

These are what the end user sees. They call Layer 3 for intelligence, Layer 1 for shared data.
New product modules can be added without changing Layers 1 or 3.
A module can be removed without affecting agent capabilities.

### Layer 3 — Agent Capability Services
The nucleus of the product. Independent, discrete, deployable AI services.

**Critical rules:**
- Capabilities are independent of any specific agent
- An agent does not OWN a capability — it is AUTHORIZED to USE one at a certain depth
- Capability routes are named for the capability, never for the agent
  - Wrong: `api/michelle-plan.js`
  - Right: `api/capabilities/task-planning.js`
- No UI logic inside capability routes
- Every capability route logs to `ai_activity_log` via `logAICall()` — no exceptions
- All external service calls (Anthropic, OpenAI, Supabase, Railway) go through a thin adapter layer (see Section 5)

**Phase 1 capabilities (current + to add):**
| Capability | Current route | Notes |
|-----------|---------------|-------|
| Task Planning | `api/plan.js` | Rename to capability path |
| Agent Routing | inline + `api/rag-query.js` | Extract to own route |
| RAG Query / Knowledge Retrieval | `api/brief.js` | |
| Chat / Consultative Response | inline in DashboardScreen | Extract to route |
| Data Analysis | inline in AnalyzerScreen | Deterministic layer + AI briefing layer |
| Document Extraction | `api/extract.js` | |
| Web Research / ReAct Loop | Railway `src/agent.js` | Playwright-only, stays on Railway |
| Self-Learning / Knowledge Reinforcement | `api/web-memory.js` | |
| AI Audit & Cost Tracking | `src/hooks/useAIActivity.js` | Already correct |
| Title Generation | `api/title.js` | Rename to capability path |

More capabilities will be added as product deepens. Each new capability = one new route.
Never bolt new capabilities onto existing routes.

### Layer 4 — Platform Services
Auth, multi-tenancy, security certification, database isolation, API gateway.
Stubs exist today (`tenant_id` on every table, `TENANT_ID` constant).
Full implementation is v6+ territory.
Design Layers 1–3 so this layer can wrap them without rewriting them.

---

## 3. The Capability Spectrum Model (North Star)

This is the most important architectural concept decided in this session.
It is NOT fully implemented yet — it is the north star every session builds toward.

### Core Concept
A capability has a measurable depth spectrum:
- **Level 1 — General** — baseline LLM, no training, free or low cost
- **Level 2 — Trained** — RAG docs added, knows a specific domain
- **Level 3 — Expert** — deeply trained, specialized, self-improving
- **Level 4 — Proprietary** — user's own IP, private, chargeable to others

An agent is a named persona assigned a set of capabilities at specific depth levels.
The persona (name, voice, avatar, quip) makes it human-facing.
The capability depth is what makes it valuable and measurable.

### What This Means for Agents
- Training an agent = deepening a specific capability (not training the agent generically)
- A trained capability can be assigned to multiple agents simultaneously
- Two agents with the same capability at different depths produce comparable, measurable outputs
- The Personnel File is not just a profile — it is an agent's capability dashboard

### What This Means for Routing
Routing is capability matching, not agent matching:
1. What capability does this task require?
2. Which agent has the deepest assignment of that capability?
3. Route to that agent

**Two routing modes:**
- **Efficiency mode** — fastest path, lowest cost, lightest capable depth
- **Deep knowledge mode** — highest quality, deepest capability, may be slower, more HITL, higher cost

The routing service accepts `mode` as a parameter.

### What This Means for the Business Model
- Charge by capability depth, not by agent seat
- Pre-built agents: capability depth pre-assigned, user pays for the configuration
- Build-your-own: user selects capabilities from a menu, assigns depth, sets persona
- Users can publish their trained capability spectrum as a service (their IP, their revenue)
- Users can keep capability spectrum private — the output is their competitive advantage
- Test Team screen: compare outputs across capability depths within one capability

### NIGP Personnel File Already Seeds This
The NIGP agent data already has: `skill`, `situational`, `hourly`, `reportCost`, `docs`, `classes`, `chunks`
These are proto-capability measurements attached to agents as flat numbers.
The evolution: these break out into per-capability scores.
The UI shape stays similar — the data model gets richer.

---

## 4. Per-Agent LLM Assignment + BYOK

Each agent can be assigned a different LLM provider (Anthropic, OpenAI, etc.).
Two agents with the same capability but different LLMs can be compared side by side.
Users bring their own API keys ("BYOK" — Bring Your Own Key) for any agent.

**Implications:**
- The adapter layer (Section 5) routes not just by vendor but by which tenant's key
- A new `tenant_api_keys` table stores tenant-owned keys (encrypted)
- The platform does not require Roadmap Venture's keys for production tenant use
- This is a Layer 4 / S-INFRA-01 implementation — design today so it's not blocked later

---

## 5. The Service Adapter Layer (Vendor Portability)

All external service calls go through a thin adapter layer. No direct vendor API calls
scattered across capability routes. This makes any vendor an easy rip-and-replace.

```
api/adapters/
  anthropic.js     — wraps Anthropic API calls
  openai.js        — wraps OpenAI API calls (embeddings today, LLM future)
  supabase.js      — already exists as src/lib/supabase.js, move/reference here
  railway.js       — wraps Railway SSE calls from frontend
```

Capability routes import from adapters. Never call vendor APIs directly.
Enterprise requirement: a customer can point any adapter at their own infrastructure.

---

## 6. Frontend / Backend Distribution (Current + Target)

**Current state:**
- Vercel: React UI + serverless API routes (`api/*.js`)
- Railway: Node.js + Playwright (`deepbench-backend/src/`)

**Target state (locked):**
- Vercel: ALL React UI + ALL AI/Supabase capability routes
- Railway: Playwright browser automation ONLY (Brent's web agent, Pat's intern tasks)
- No AI calls in Railway. No Playwright in Vercel.

**NIGP migration implication:**
During migration, audit every piece of NIGP code for where it belongs in this split.
NIGP has inline AI calls inside React components — those extract to Vercel capability routes.
NIGP has agent data inline in component files — that moves to Layer 1 shared foundation.

---

## 7. Database — Current + Target State

**Current `agent_configs` table:**
`id, agent_id, tenant_id, type (role_prompt/output_format/guardrail), name, text, is_default, is_user_selectable, created_at, updated_at`

**Target state (S-INFRA-01 — do not build yet, design toward):**

New tables needed for the capability model:
```
capabilities
  id, name, slug, description, phase (1/2), default_model, created_at

agent_capability_assignments
  id, tenant_id, agent_id, capability_slug, depth_level (1-4),
  llm_provider, llm_model, api_key_ref, cost_per_use, created_at

tenant_api_keys
  id, tenant_id, provider, key_encrypted, created_at
```

`agent_configs` evolves to store capability-specific training content (RAG, prompts, guardrails)
scoped by `capability_slug`, not just by agent.

**Do not migrate the DB before S-INFRA-01.** Design all sessions between now and then
to not contradict this target structure.

---

## 8. NIGP Migration Plan

NIGP repo (`nigp-analyzer`, `nigp-analyzer-agent-api`) is proven, QA'd code.
It will eventually be retired once DeepBench is fully operational.
No future development happens in NIGP — DeepBench is the platform going forward.

**Migration session (S-MIGRATE-01):**
1. Audit NIGP `TeamBuilder.jsx` vs DeepBench `RosterScreen.jsx` — side-by-side diff
2. Audit NIGP `PersonnelScreen.jsx` vs DeepBench `PersonnelScreen.jsx` — side-by-side diff
3. Audit NIGP `nigp-analyzer-agent-api/src/server.js` — identify any AI routes not yet in DeepBench
4. Extract and redistribute:
   - Agent data → Layer 1 (`src/data/agents.js`) — already correct in DeepBench
   - Design tokens → Layer 1 (`src/tokens.js`) — already correct in DeepBench
   - UI components → Layer 2 (DeepBench screens), updated to import from Layer 1
   - AI/Supabase calls inline in NIGP components → extract to Layer 3 capability routes
5. Confirm frontend/backend split is correct after extraction
6. Remove NIGP inline copies of tokens, agent data, Supabase calls

**Open pre-migration question (answer at S-MIGRATE-01 start):**
- Do NIGP and DeepBench share the same Supabase instance or different?
  Check: `nigp-analyzer-agent-api` env vars or server.js SUPABASE_URL

---

## 9. Session Seam Line Rules (for every future session)

These rules go into ARCHITECTURE.md and are non-negotiable:

1. Never hardcode design tokens, agent data, or Supabase client outside Layer 1 files
2. Never put AI call logic inside a React component — it belongs in a Layer 3 capability route
3. Every Layer 3 route logs to `ai_activity_log` via `logAICall()` — no exceptions
4. Capability routes are named for the capability, never for the agent
5. Each capability is one independent route — new capabilities are new routes, never bolted onto existing ones
6. All external service calls go through the adapter layer — no direct vendor API calls in routes
7. Agent profiles define voice and persona only — capabilities are never written into an agent's profile
8. Railway is for Playwright only — all AI and Supabase calls go through Vercel serverless
9. Multi-tenancy stubs stay in place on every table and constant — never remove them
10. Per-agent LLM assignment and BYOK must not be blocked by any code written before S-INFRA-01

---

## 10. Revised Session Order (Post-Architecture)

The Bench sessions are reordered. S-BENCH-01 through S-BENCH-04 move AFTER the
migration and architecture work. Session order becomes:

| Session | Work |
|---------|------|
| S-ARCH-01 | Write full ARCHITECTURE.md — iterate with John, commit ← NEXT |
| S-MIGRATE-01 | NIGP migration — port TeamBuilder + PersonnelScreen into DeepBench Layers 1/2/3 |
| S-BENCH-01 | Michelle Manning — built correctly as capability-first agent |
| S-BENCH-02 | Personnel File — post-migration audit + capability dashboard view |
| S-BENCH-03 | Teach screen audit |
| S-BENCH-04 | Test Team audit |
| S-INFRA-01 | Capability registry, per-agent LLM assignment, BYOK infrastructure |
| S-UX-BENCH-01 through 04 | UX reviews after code is stable |

---

## 11. What S-ARCH-01 Writing Session Must Produce

1. Full `docs/ARCHITECTURE.md` — replaces current version — covers all 10 sections above
2. Updated `docs/FEATURES.md` — new session order, new feature IDs for capability model
3. Updated `CLAUDE.md` Section 12 — next session = S-MIGRATE-01
4. Single commit to dev: `docs: S-ARCH-01 architecture north star`
