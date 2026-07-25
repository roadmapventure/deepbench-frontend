# DeepBench — Architecture North Star
# Version: v6.0.0 | Last updated: 2026-07-02 | Session: S-ARCH-OWNERSHIP-01-design — Resource Ownership Brokers (§19e), corrects §19d's agent-naming mistake

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

## 1. The Platform Architecture — 5 Layers + Cross-Cutting Concerns [LOCKED, rewritten 2026-07-17]

**Rewritten 2026-07-17 (John, live design conversation) — supersedes the prior "Four-Layer Architecture" wholesale, not a rename within it.** The prior version (Layer 1–4: Shared Foundation / Product Modules / Agent Capability Services / Platform Services) predated the platform's real evolution — it had no room for the Loop (agent-to-agent orchestration) or the Data Model as its own layer, and its "Platform Services" layer meant something different (Auth/multi-tenancy/security) than what "Platform Services" means below. Two docs describing the same system differently was itself a source of sessions re-deriving or contradicting already-settled architecture — this section is the reconciled replacement.

DeepBench is organized into 5 layers, stacked by real dependency (each layer calls only the one directly below it), plus a set of cross-cutting concerns that intersect every layer rather than sitting at one level of the stack — forcing them into the stack would misrepresent what they are (see Functional Objectives below).

```
┌─────────────────────────────────────────────────────────┐
│  Product Focus Area / Screen                               │
│  HITL-facing dashboards, one per domain of work:            │
│  Channel Intelligence · Project Management · Bench · ...      │
├─────────────────────────────────────────────────────────┤
│  Platform                                                     │
│  The whole system many agents run on:                          │
│    Data Model — Competency · Library · Reasoning                 │
│    Platform Services — logging/AI Audit, knowledge-flow            │
│      plumbing, generic display code                                  │
│    Scaffold — what one agent is given, once, before it starts          │
│    Harness — one agent's operating system for a single turn              │
└─────────────────────────────────────────────────────────┘

Loop — cross-cutting, not a nested layer: how work repeats through
Scaffold + Harness until a gate passes.

Also cross-cutting, not a layer — intersects everything, not yet built
into any of it: Functional Objectives (multi-tenancy, security, revenue/
monetization, MCP exposure).
```

### Product Focus Area / Screen
**(Renamed 2026-07-17 — was briefly "Environment," fully retired the same day; kept appearing as a compound "Environment — Product Focus Area" heading in the initial rewrite by oversight, which a later session legitimately picked up and used. Product Focus Area is the layer name, full stop, matching the single-term pattern of every other layer below.)** The HITL-facing dashboards, one per domain of work. `docs/SCREEN-INVENTORY.md` is the authoritative, current list of Product Focus Areas and their Screens (Channel Intelligence, Project Management, Bench, Spend Analysis, Home, Platform overlays) — read it, don't rely on a list here going stale the way the old Layer 2 did (it named only 2 modules long after the real count grew past 9). A new Product Focus Area can be added without changing any layer below it.

### Platform

**Platform — added 2026-07-17/18 (`SES-001`), adopted from an external source (Weave Intelligence) on John's explicit direction — DeepBench's `§1` previously had no explicit "Platform" entry, only its parts.** The whole system many agents run on. Contains four things, each detailed in its own section: **Data Model** (below — the persistent knowledge/identity substrate: Competency, Library, Reasoning), **Platform Services** (below — shared infrastructure: logging/AI Audit, knowledge-flow plumbing, generic display code), **Scaffold**, and **Harness** (both below). **Loop is not a fifth contained part** — it's cross-cutting, describing how work repeats through Scaffold and Harness (see the diagram above, and Loop's own entry at the end of this list).

Two pieces of the source's own model don't yet have a checked DeepBench equivalent — flagged honestly rather than force-fit: **Tooling** (per-domain external integrations, e.g. Salesforce/GitHub) has no confirmed match in DeepBench today; **Path Specs** (the source's probabilistic/deterministic/hybrid execution-rule distinction) — Skill Profile data is the closest analog, but that specific distinction hasn't been checked against it.

**`runCapability()` (`execute.js`) is the concrete code behind "Platform instantiates one task"** — found during the `SES-001` stress test, worth naming explicitly. It builds Scaffold, sets up the shared time budget and tracing that Loop and Platform Services' Observability both depend on, then hands off to Loop — wrapped in a durable failure safety net (`persistFailureAndRethrow()`): any failure anywhere in the whole chain gets recorded (to the same `durable_hops` table the checkpoint mechanism uses) before the error propagates to the caller. This failure-recording is Platform's own resilience concern, not a content-quality gate (Evaluation's job) and not Loop's continue/stop/checkpoint decision.

### Data Model
Three structurally-separate entities, each answering a different question about an agent's expertise, world knowledge, or judgment. Two are independently RAG-backed (real `embedding` columns); Competency combines a non-RAG structured model with one RAG-backed table.

- **Competency** — the product term for how well an agent can perform, built from the data layer below: the structured Skill/Capability/Agent model (`skill_profiles`, `capabilities`, `agent_capability_assignments`, `skill_types`, `capability_skill_profiles`, `agent_configs` — not itself RAG) plus `knowledge_entries` (an agent's own personal training corpus, RAG-backed, populated via the Teach flow). Example, John's own: an NIGP spend-consultant agent's competency is both its assigned Skills/Capabilities *and* its own uploaded training documents that make it certified — together, not separately. **Same concept as §2's "Competency"** (a Capability-set held by an entity, the same real-time construct as an Agent without a persona) — §2 describes what Competency *is* at the product/runtime level; this entry describes what it's *built from* at the data level. Competency is also the platform's core intellectual-property/monetization unit (John, 2026-07-17) — see Functional Objectives below for the not-yet-built revenue-model layer this eventually plugs into.
- **Library** — `the_library`. Business/company data (Data Room model). §19c.
- **Reasoning** — `the_reasoning`. An agent's own opinion/judgment about Library content — "it becomes the company's culture" (John, §19f). §19f.

### Platform Services
Shared foundational utilities that Scaffold, Harness, and other layers call into — not agent-specific, not orchestration, just shared infrastructure. **Corrected 2026-07-20 (`SES-001` coherence pass) — this used to say "Harness," stale since the Scaffold/Harness split.** `db-assembly.js`/`ai-enrichment.js` genuinely blend with Platform Services at the edges by design (they're simultaneously Scaffold's own construction code *and* callers of Platform Services' knowledge-flow plumbing/display code) — don't force a single bucket where a piece of code spans both.

Files (from the prior Layer 1 — Shared Foundation, folded in here as this layer's foundational component): `src/tokens.js`, `src/data/agents.js`, `src/lib/supabase.js`, `src/config.js`

Three known components:
- **Shared display/utility code** — cross-screen UI logic (data uploads, timing helpers, etc.)
- **Logging / AI Audit** — the centralized `ai_activity_log` write path. See "AI Audit" below and §19i (AI Pattern Detection) for the full detection model.
- **Knowledge-flow plumbing** — the generic retrieval pipeline any capability uses to pull Data Model content into a prompt (`lib/search-harness.js`).

**AI Audit — consolidated summary (added 2026-07-17, first worked example of this section's format; more Product Focus Areas/Layers get this same treatment over time, see `SES-001`).**

Storage: one central table, `ai_activity_log`. Write path: `api/prompt/request-receivable.js`, assembled every capability's call flows through — never duplicated per capability. Catalog: `SERVICE_CATALOG` stays in `shared/ai-patterns.js`; `PATTERN_CATALOG`'s governance half (citation, maturity, review date) is moving to a real Supabase table — see §19i, rewritten 2026-07-21. Pattern tracking is now a three-layer model (real call facts, captured generically → versioned classification rules, evaluated at read time → a citation-governed vocabulary) — this supersedes the prior four-source write-time model. Full detail, not repeated here: §19i.

**Pattern naming — important scope note:** the platform works with the full breadth of real, industry-recognized AI patterns (RAG, ReAct, Tool Use, Reflection, LLM-as-Judge, Chain-of-Verification, and any other genuine pattern, present or future) — the specific patterns currently detected and listed in §19i's status table are examples of what's implemented today, not a fixed or exhaustive catalog. Do not treat any particular named list as the permanent standard.

Presented in 3 places, each showing a different slice of the same central data — not 3 copies:
1. **AI Audit screen** (`AIActivityPanel.jsx`, Platform overlay) — global view, all agents/capabilities, 5 internal sections (By Service/Pattern/Deterministic/LLM/Agent — `docs/AI-SERVICES.md` §6).
2. **Channel Intelligence's Agent Routing drawer** — per-hop delegation/routing events for the current conversation only.
3. **Channel Intelligence's Agents drawer** — per-agent pattern/latency rollup for the current conversation (`MI-72`'s real per-pattern breakdown).

**Known landmine, not part of AI Audit itself — don't conflate:** Channel Intelligence has a *fourth*, adjacent drawer, "Agent Reasoning," which also shows a "patterns" count — but sourced from `the_reasoning` (case-based-reasoning row count), a completely different table and concept. Same word, unrelated meaning, sitting next to the real AI Audit drawers in the same panel. This exact confusion is the open bug `CHI-15` exists to fix.

### Scaffold
What one agent is given, once, before its work starts. Confirmed in code: `assemblePrompt()` (`db-assembly.js`) builds the system prompt from the agent's Competency — specifically its structured Skill Profile half (traits like `can_request_help`, `delegation_required`). `enrichPrompt()` (`ai-enrichment.js`) pulls RAG context from Data Model's Library and Reasoning tables, via Platform Services' knowledge-flow plumbing (`lib/search-harness.js`), and runs its own pre-planning step — a real, separate Anthropic call, on every invocation, uncached today. `conversationHistory` (`execute.js`) is what accumulates as memory across a task's turns. Built once, handed to Harness, which runs on it repeatedly.

**Competency's RAG half isn't wired in yet — by design, not by oversight.** Competency (`§2`) is defined as two halves: the structured Skill Profile model *plus* `knowledge_entries` (an agent's own personal training corpus, RAG-backed, populated via Teach). Checked directly: `knowledge_entries` appears nowhere in `db-assembly.js`, `ai-enrichment.js`, or `request-receivable.js` — only the structured half currently feeds Scaffold. The table and the concept already exist, ready for this (`§19f` separately notes `knowledge_entries`/`queryRAG()` as deferred, not yet ported onto the shared retrieval pipeline `the_library`/`the_reasoning` both use). Tracked as `DAT-004`.

**"REFLECT" isn't the industry Reflection pattern — worth being precise, since the name collision is real.** It drafts a numbered execution plan (Haiku, given the agent's identity/knowledge/task) and splices that plan straight into the assembled system prompt — a pre-planning step, not the industry Reflection pattern (an agent critiquing/revising its own *prior output*, Reflexion/Self-Refine style). It still belongs in Scaffold — its output literally becomes part of what the agent is given before it starts — but the name is misleading against the established industry term. Same shape as the existing `CHI-15` "Agent Reasoning drawer vs. AI Audit" naming collision already on record.

### Harness
One agent's operating system for a single turn. Three sub-parts:
- **Equipment** — what the agent is capable with this turn, and resolving a target when it's used. `REQUEST_HELP_TOOL`/`DELEGATE_TO_AGENT_TOOL` (`request-receivable.js`) are the two fixed tool definitions every scaffolded agent is given; `resolveCapabilityHolder()` (`execute.js`) does the live resolution when one gets used (e.g. finding whoever holds `project-manager`). Named "Equipment," not "Capability" or "Access" — both collide with `§2`'s reserved vocabulary (Capability/Seniority, and permissions like `uber_access`/`data_room_access`).
- **Execution** — calling the model, carrying out its decision. `callModel()` (`request-receivable.js`) sends the call (retrying up to 2 additional times — 3 total attempts, escalating backoff — on a transient Anthropic failure: `429/500/502/503/529`; a non-transient error like a `400` still fails immediately, no retry — via `postToAnthropicWithRetry()`) and parses the response (tool call vs. final answer); `dispatchDelegation()` (`execute.js`) executes a tool call.
- **Evaluation** — gates and judgment, two different kinds. **Per-capability, data-declared rules**, authored in Scaffold and checked here: a real, separate post-generation Haiku call (`request-receivable.js`, "STEP 2: Guardrails") checks the output against the capability's declared `must`/`must_not` rules and sets `guardrails_passed` (fails open on error, not closed); the `requires_human_confirmation` pause; `quality-gate.js` — a real, existing capability (`§19b`'s migration notes), not independently inspected this session. **Platform-wide, hardcoded rules**, uniform for every capability, never data-configurable: the loop depth cap (`MAX_LOOP_DEPTH = 5`) — physically checked inside the `runLoop()` function (`execute.js`), but conceptually Evaluation's rule, not a judgment Loop makes on its own.

Harness consumes the Scaffold built above it; it doesn't build one of its own. No agent is named in this mechanism by identity — every resolution above happens live, by capability, never hardcoded (Rule #1, `§19d`/`§19e`).

Files: `api/capabilities/execute.js`, `api/prompt/db-assembly.js`, `api/prompt/ai-enrichment.js`, `api/prompt/request-receivable.js`

Capability routes (what runs through the Harness) are detailed in §1a below, not repeated here. Full mechanism detail, not repeated here: §19d, §19e, §19h (Live Agent-Orchestration Visibility — the `_onEvent` mechanism threaded through the same `runLoop()`/`runCapability()`/`resumeCapability()`/`resolveAccept()` functions described above, by function name, not yet by this section's vocabulary).

### Loop

**Loop — consolidated summary (added 2026-07-17, `SES-001`).**

**Not a nested layer — cross-cutting**, same shape as Functional Objectives (below): it intersects Scaffold and Harness rather than sitting as a box beside them. Confirmed in code: `runLoop()`'s `for` loop (`api/capabilities/execute.js`).

Loop calls Harness once per turn and decides, based on what comes back, whether to call it again. Scaffold assembles the agent's starting point, once. Then, each turn: the model reasons and decides what to do (Harness's Execution carries that out); if it calls a tool, Harness's Equipment resolves who or what it points to; Harness's Evaluation checks its gates — guardrails, `is_final`, `requires_human_confirmation`, and the hardcoded depth cap (`MAX_LOOP_DEPTH = 5`). **Loop makes no judgment of its own** — it just reads Evaluation's verdict and either stops (a gate passed, or the depth cap was hit) or feeds the result back into memory and calls Harness again.

**A third outcome, added 2026-07-20 (`SES-001` stress test) — Loop can also pause and checkpoint, not just stop or continue.** Before every turn, Loop checks whether there's enough time budget left (`getHopBudgetReserveMs()` against the remaining deadline) — a decision it makes itself, using historical latency data from `ai_activity_log` (the same table Platform Services' Observability writes on every turn), not anything Harness reports. If there isn't enough budget, Loop pauses: persists its state (`checkpointAndReturn()` — `conversationHistory`, hop count, any pending delegation) to a `durable_hops` row and returns, rather than risking a serverless timeout mid-turn. A later, separate invocation (`resumeCapability()`) picks it back up exactly where it left off. So Loop has three outcomes per turn: stop, continue, or checkpoint.

**Resuming after an HITL pause doesn't mean continuing the original loop — structurally different from the checkpoint above.** A human's decision (`resolveAccept()`) never picks the paused agent back up where it left off. Reject or edit just record the resolution, no further execution. Accept does the same unless the capability declares an `on_accept_intent_slug`, in which case it triggers a brand-new, separate capability run for that follow-up intent — a fresh Scaffold+Harness+Loop cycle, not a continuation.

**Industry term:** Agent Loop / ReAct (Yao et al., 2022) — reasoning interleaved with a freely-explored action space, repeated until done. DeepBench's is a real, live instance of the pattern — narrower than full ReAct, but not as narrow as this entry previously claimed. **Corrected 2026-07-20 (`SES-001` stress test):** alongside the two delegation tools (`request_help`, `delegate_to_agent`, gated by `can_request_help`), a third, independently-gated general tool exists — Anthropic's native `web_search` (`enable_web_search` trait, same shape) — live today, not dormant: one real Intent Skill Profile, `ws-news-search-intent`, has it turned on. Full history and rationale: `LOO-008` (`FEATURES.md`).

No agent is named in this mechanism by identity — every resolution happens live, by capability, never hardcoded (Rule #1, §19d/§19e).

Full mechanism detail, not repeated here: §19d (Agent Loop, sniff test, single delegation path), §19e (Resource Ownership Brokers — a distinct, orthogonal concern: *who's allowed to touch a resource*, not *who gets asked*), §19h (Live Agent-Orchestration Visibility — the `_onEvent` mechanism firing at Loop's own dispatch points).

### Functional Objectives (cross-cutting, not a layer)
Requirements that constrain every layer above but aren't themselves one — multi-tenancy, security/auth, revenue model, MCP exposure, monetization. Mostly unbuilt today (stubs only). As each gets built, it's realized as concrete mechanisms distributed across the 5 layers above (e.g. multi-tenancy becomes `tenant_id` scoping in the Data Model plus tenant-aware checks in the Harness) — it does not become its own permanent layer once built.

---

## 1a. Agent Capability Services — Detail
Independent, discrete, deployable capability services. The nucleus of the product; executes through the Harness above.

**Critical rules [LOCKED]:**
- Capabilities are independent of any specific agent
- An agent does not OWN a capability — it holds Seniority to USE one at a certain Level
- Capability routes are named for the capability, never for the agent
  - ❌ Wrong: `api/michelle-plan.js`
  - ✅ Right: `api/capabilities/task-planning.js`
- No UI logic inside capability routes
- Every capability route logs to `ai_activity_log` via `logAICall()` — no exceptions, including deterministic capabilities
- All external service calls go through the adapter layer (see Section 5)
- **[SUPERSEDED 2026-07-01, S-APPLE-03-design — see §19b]** New capabilities are new *data*, not new routes. All capability execution flows through one generic executor (`api/capabilities/execute.js`) — never a hand-rolled route per capability.

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

**Note:** Auth/multi-tenancy/security/API-gateway content (`tenant_id` on every table, `TENANT_ID` constant, stubs only today) previously lived here as "Layer 4 — Platform Services" — moved to **Functional Objectives** above under the rewritten model; "Platform Services" now means the shared-utilities layer, a different concept (see above). Full implementation of these objectives is still v6+ territory.

---

## 2. The Platform Model [LOCKED — Vocabulary + Structure]

> The Platform Model is the core conceptual and data model of DeepBench. Every product feature wraps around this model. All vocabulary defined here is canonical — use it in code comments, UI labels, kickoff docs, and design sessions.
>
> **Rewritten 2026-07-15 (John's explicit correction, `S-ARCH-COMPETENCY-MODEL-design` follow-up):** the prior version of this section (2026-06-18) was wrong and had caused the same misunderstanding roughly 20 times across a month of sessions — it described "Skill" and "Skill Profile" as two separate layers (Skill = generic type, Skill Profile = configured instance), plus an invented "Competency" layer with no table of its own. **Skill is the atomic unit, full stop — there is no separate Skill/Skill Profile split.** Verified directly against the live schema before this rewrite: `skill_profiles` is the one and only table for the atomic unit; `skill_type_slug` is a plain FK into a small tag lookup (`skill_types`); there is no `skills` table and no `competencies` table. This section now states that directly instead of the old 5-layer hierarchy.
>
> **Important:** Skills within each type are listed as examples only. Each Skill type requires a dedicated design and modeling session before any new Skill of that type is built. We can build a single Skill in one sprint without touching anything else in the model.

---

### Vocabulary

| Term | Definition |
|------|-----------|
| **Technical Service** | An AI Pattern or Deterministic engine that executes a Skill. Platform-facing — never user-facing as a concept. |
| **Skill** | The atomic unit of the platform — a configured, ownable, proprietary unit where IP and novel value live. Every Skill carries a `type` tag from a fixed lookup (6 today — see below). Created by users or platform admins. Stored as one row in `skill_profiles`; "Skill" and "Skill Profile" are the same thing — do not treat them as two layers. |
| **Capability** | A grouped set of Skills with its own Profile. Novel and configurable. Many-to-many with Skill (a Skill can belong to multiple Capabilities; a Capability groups multiple Skills). |
| **Competency** | The same real-time construct as an Agent, named without a persona — not a stored row of its own. A Capability-set that hasn't been given a persona is a sellable, MCP-accessible Competency; give it a name/avatar/role/quip and it's an Agent. **This is the product/runtime view; §1's "Data Model — Competency" describes the same concept from the data layer it's built from (the Skill/Capability model plus `knowledge_entries`).** |
| **Agent** | A Competency with a persona — name, avatar, role, quip. The human-facing workforce member. Many-to-many with Capability (an Agent can hold multiple Capabilities; a Capability can be assigned to multiple Agents). |
| **Work Order** | The unit of work assigned to an Agent/Competency. Contains Steps. |
| **Step** | A discrete unit of execution within a Work Order. May consume prior Deliverables as input context. |
| **Deliverable** | An output object produced when a Skill, Capability, Step, or Work Order completes execution. First-class entity. |
| **Deliverable Handoff** | A Step property declaring which prior Deliverable(s) it consumes as input context. |
| **Profile** | The configured state of any entity — Skill, Capability, or Agent. |
| **Level** | Depth and quality grade of a Skill. L1–L4. Determines quality, pricing, and routing. |
| **Grade** | The act of assessing and assigning a Level to a Skill. |
| **Seniority** | Authorizing an Agent to use a Skill or Capability at a specific Level. |
| **Model Score** | Rolled-up score across all Skill Levels held by an Agent/Competency. |

> **Reserved term:** "Assignment" means work assigned to an Agent/Competency — a Work Order or Step. Never use it to describe Seniority or Skill authorization.

---

### The Hierarchy

```
Technical Services  — AI Patterns + Deterministic (platform-facing execution engine)
  ↓ execute
Skills              — the atomic unit; each tagged with one of 6 types (see below);
                       where proprietary IP and novel value live
  ↕ many-to-many (capability_skill_profiles)
Capabilities        — grouped sets of Skills, with their own Profile
  ↕ many-to-many (agent_capability_assignments)
Agents              — a Capability-set + persona (name, avatar, role, quip);
                       without a persona, the same construct is a sellable Competency
  ↓ execute against
Work Orders         — with Steps that may consume prior Deliverables as input
  ↓ produce
Deliverables        — output objects attributed to the producing Agent/Competency
```

Two many-to-many joins, three real layers. No separate "Skill Profile" layer above Skill, no separate "Competency" table above Agent.

**Baseline behavior:** An Agent with no assigned Skills still produces output — operating at L1 (General) using generic LLM. The platform model enriches quality and routing precision but never blocks execution. Agents grow into their Capabilities one sprint at a time.

---

### The Three Visions

| Audience | Vision |
|----------|--------|
| **Human** | Load your Skills, configure your Capabilities, and be recreated as an Agent — your knowledge, behavior, and identity preserved and operational. |
| **Machine** | An LLM assembles Skills and Capabilities at runtime to execute any Work Order or Step without human configuration at call time. |
| **Technical** | Every Skill, Capability, and Agent is configurable, measurable, sharable, revenue-generating, and MCP-accessible at every level of the hierarchy. |

---

### Six Skill Types

Skills are the atomic unit of the platform. Six types are defined today. New Skill types can always be added without changing existing ones.

**Known drift (2026-07-15):** the `skill_types` lookup table itself only has 5 seeded rows — `guardrails` is real and already dispatched on in the harness (`api/prompt/db-assembly.js`'s `SKILL_ORDER`), but was never added to the `skill_types` catalog. Needs a one-row seed to close the gap between code and catalog.

| Skill Type | What it captures | Example Skills |
|-----------|-----------------|----------------------|
| **Identity** | Who the agent is — mindset, philosophy, personality, ethics | Philosophy, Autonomy, Skeptic Level, Temporal Stance, Epistemology |
| **Behavior** | How the agent thinks and communicates — style, reasoning, tone | Behavioral Style, Collaboration Role, Learning Stance, Peter Principle |
| **Knowledge** | Domain and industry-specific background — terminology, risks, signals, and patterns | NIGP Domain Knowledge, Legal Procurement Expertise, Austin FY2025 Data |
| **Intent** | What type of cognitive work the agent performs | Analysis Report, Research Findings, Review Feedback, Draft Document, Monitor & Alert |
| **Format** | What output structures the agent produces | HTML Strategy Brief, Executive Brief, NIGP Dashboard, Structured Report |
| **Guardrails** | Must / must-not rules the agent operates under | Must cite sources, Must not disclose competitor data |

Each Skill type can have unlimited Skills tagged with it — created by users or platform admins. A Skill is where novel, proprietary value lives.

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

### Skills — Universal Properties

A Skill is a configured, ownable unit — the atomic unit where proprietary value and IP are created and stored. Stored as one row in `skill_profiles`.

**Universal properties — apply to every Skill regardless of type:**

| Property | Description | Values |
|----------|-------------|--------|
| **Level** | Depth and quality grade | L1 General · L2 Trained · L3 Expert · L4 Proprietary |
| **Availability** | Who can access this Skill | Public · Private |
| **Exclusivity** | How many Agents share this Skill | Shared · Exclusive |
| **Pricing** | Cost to access or use | Free · Priced ($/use) |
| **Trainability** | Can this Skill be improved | Trainable · Supervised · Locked |
| **Confidence** | Calibration level of output | *(scale TBD in design session)* |
| **LLM Provider** | Which AI provider executes this Skill | Anthropic · OpenAI · *(future: others)* |
| **LLM Model** | Specific model assigned | Haiku · Sonnet · GPT-4o · *(future: others)* |
| **Max Tokens** | Token budget ceiling for this Skill's LLM call | Integer — e.g. 1200 · 4000 · 8000 |
| **API Key Source** | Who provides the API key | Platform · BYOK |
| **Execution Type** | Technical Service category | AI (+ which pattern) · Deterministic |

---

### Capabilities

A Capability is a grouped set of Skills with its own Profile. Capabilities are novel and configurable — created by users or platform admins. Many-to-many with Skill: a Skill can belong to more than one Capability.

**Rules [LOCKED]:**
- A Capability is independent of any specific Agent
- An Agent does not OWN a Capability — it holds Seniority to USE one at a specific Level
- A Capability can be packaged and sold via MCP without being wrapped in an Agent
- New Capabilities are additive — never modify an existing Capability to serve a new purpose
- Capability routes are named for the capability, never for the agent

---

### Competencies and Agents

A Competency is a Capability-set — one or more Capabilities held by the same entity. It can be packaged and exposed with or without a persona; it is not a stored row of its own, it's the same real-time construct as an Agent, viewed without the persona layer.

**Agent = a Competency with a persona.**

| Type | Has persona | Example |
|------|-------------|---------|
| **Agent** | Yes — name, avatar, role, quip | Chloe Okafor (JR-01), Mike Alvarez (SR-02) |
| **Standalone Competency** | No | NIGP Analysis Capability exposed via MCP directly |

An Agent does not own its Skills or Capabilities — it holds Seniority in them at specific Levels. Two Agents can hold Seniority in the same Skill at different Levels. Many-to-many with Capability: an Agent can hold multiple Capabilities; a Capability can be assigned to multiple Agents.

---

### Deliverables

A Deliverable is an output object produced when any level of the hierarchy executes. Deliverables are first-class entities — stored, reviewable, approvable, shareable, and sellable independently.

**Four Deliverable types:**

| Type | When produced | Example |
|------|---------------|---------|
| **Skill Deliverable** | A single Skill executes | RAG retrieval result, extracted document summary |
| **Capability Deliverable** | A Capability completes | NIGP Analysis output |
| **Step Deliverable** | A Work Order Step completes | Vendor concentration report (intermediate) |
| **Work Order Deliverable** | The full Work Order completes | Assembled executive brief (final) |

**Deliverable Handoff:** A Step may declare which prior Deliverable(s) it consumes as input context via a `consumes: [deliverable_id]` property. This enables multi-agent workflows where one Agent/Competency's output becomes another's input.

**Attribution:** Every Deliverable is attributed to the Agent/Competency that produced it — which may be an Agent (persona-bearing) or a standalone Competency (no persona). Attribution field: `competency_id`.

**Status lifecycle:** draft → approved → change_requested → resolved

---

### Key Rules [LOCKED]

1. **Skills are the atomic unit.** Everything else is composition — Capabilities group Skills, Agents/Competencies hold Capabilities. No separate "Skill Profile" layer above Skill.
2. **Skills are where IP lives.** A Skill's `type` is just a tag (6 today). The Skill itself is proprietary, configurable, and revenue-generating.
3. **Technical Services are platform-facing.** Users configure Skills, not Technical Services. Technical Services are visible only in the AI Audit screen for transparency and governance.
4. **Capabilities are shared resources.** Built once, assigned to many Agents at different Levels via Seniority — many-to-many, not 1-to-many.
5. **Agents hold Seniority, not ownership.** An Agent does not own a Skill or Capability — it is authorized to use one at a specific Level.
6. **Agent = Competency with persona.** A Competency without a persona is a valid, sellable, MCP-accessible product — same construct, no separate table.
7. **Every level can produce a Deliverable.** A Skill, Capability, Step, or Work Order can produce a Deliverable. No level is output-less by definition.
8. **Deliverables are attributed to Agents/Competencies.** An Agent is a Competency with a persona — same attribution field either way.
9. **Baseline is always L1.** An Agent/Competency with no assigned Skills still executes using generic LLM. The model enriches; it never blocks.
10. **Grade is the verb; Level is the noun.** Levels roll up to Capability Levels, which roll up to the Agent/Competency's Model Score.
11. **"Assignment" means work.** Never use it for Seniority or Skill authorization. Assignment = Work Order or Step assigned to an Agent/Competency.
12. **Model Score is always derived.** Never hardcoded. Always rolled up from actual assigned Skill Levels.

---

### DB Architecture — Current State
**[CORRECTED 2026-07-01, S-APPLE-02a-design; prose corrected again 2026-07-15 — see rewrite note at the top of this section]** `skill_types` (5 rows, missing `guardrails` — see "Known drift" above), `skill_profiles` (the Skill rows — the atomic unit, not a separate "instance" layer), `capabilities` (8 rows), `capability_skill_profiles` (the Skill↔Capability join), and `agent_capability_assignments` (the Capability↔Agent join) are all live in Supabase today and already wired into `api/prompt/db-assembly.js`'s `assemblePrompt()`. What remains gated behind S-INFRA-01 is only the items explicitly listed in Section 4 (per-Skill LLM/BYOK superadmin config) and the `skill_profile_slug` scoping columns on `agent_configs`/`knowledge_entries` (Section 9) that turn the Library into per-division Data Rooms. The two tables below are live now — new Capabilities and Skills can be created against them without waiting for S-INFRA-01.

**Known gap (2026-07-01):** `assemblePrompt()` loads every `skill_profiles` row attached to a `capability_slug` unconditionally — there is no per-call filter when a Capability has more than one Intent-type Skill (e.g. a capability with both a "routing" intent and an "answer" intent would load both into every call). No existing capability has hit this yet; S-APPLE-02b is the first to need it and must add the filter as part of its own scope.

> For the full Skill design guide — Traits, Capabilities assembly, Technical Services invocation,
> domain-agnostic principle, sprint template — see **docs/SKILL-PROFILE-MODEL.md**. **Note (2026-07-15):**
> that doc predates this section's rewrite and still uses "Skill Profile = configured instance of a
> Skill type" framing in places — read it for the Traits/assembly mechanics, which are still accurate,
> but defer to this section for the hierarchy itself.

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

**Layer 2 — Seniority** *(Capability ↔ Agent — many-to-many)*
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

**`knowledge_entries`** — RAG knowledge base (pgvector embeddings). Stores each agent's own personal training/learning content — production, unchanged since before the Apple track. Read and written directly by that agent's own capabilities and by Trainer agents (e.g. Susan Smith's reinforcement pipeline); never brokered, never shared across agents. `agent_training_sessions.knowledge_entry_id` has a live FK into this table.
**[CORRECTED S-LIBRARIAN-03-design 2026-07-02]** The 10 Data Room columns added here by `S-APPLE-01b-design` (`data_type`, `citeable`, `is_baseline`, `supersedes_id`, `confidence`, `override_flag`, `geo`, `program_area`, `partner_id`, `period`) were a modeling mistake — business data was bolted onto the personal-training table instead of getting its own. Moved to `the_Library` (below), along with the 20 `apple-cso-data-room` rows that had accumulated here. This table reverts to its original, still-live shape: `id, title, category, jurisdiction, priority, triggers, content, embedding, status, created_at, tenant_id, agent_id, teaching_note, source, steps_taken`.
**`the_Library`** *(added S-LIBRARIAN-03)* — RAG knowledge base (pgvector embeddings) for business data — never personnel/training content. See §19c for the full access model. Columns: `id, title, category, jurisdiction, priority, triggers, content, embedding, status, created_at, tenant_id, data_room_tag, teaching_note, source, data_type, citeable, is_baseline, supersedes_id, confidence, override_flag, geo, program_area, partner_id, period`. `data_room_tag` partitions the table by Data Room — never an agent's own identity. Rows are never overwritten, only ever inserted — a correction always supersedes via a new row.
**`data_rooms`** *(added S-LIBRARIAN-03)* — registry of valid `data_room_tag` values: `tag` (primary key), `name`, `tenant_id`, `created_at`. Any `data_room_tag` used anywhere (an agent's `data_room_access`, a `the_Library` row) must exist as a row here first.
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
`knowledge_entries` gains a `skill_profile_slug` column — RAG knowledge scoped by Skill Profile.
`the_Library` gains a `program_area`/`skill_profile_slug`-driven sub-partitioning mechanism — the path to per-division Data Rooms within one company (see §19c).
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

**Known gap (2026-07-01, reconfirmed 2026-07-02):** RLS is currently disabled on all 16 Supabase tables, including `the_Library`/`knowledge_entries`/`agents` — `tenant_id` and `data_room_access` filtering happens only in application code, not enforced at the data layer. Anyone with the anon key can read or write any row directly today, bypassing `queryLibrary()`/`writeLibrary()` entirely. **The Librarian** (§19c) is the application-layer answer to *credentialed* access — it does not close this gap, since RLS-off means the underlying table has no floor under that convention. Real tenant/Data-Room isolation needs RLS policies added on top of §19c's model, not instead of it. Not yet scheduled — surfaced again during `S-LIBRARIAN-03-design`'s review; needs an explicit decision on when to prioritize it.

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
| Streaming | Only where UX benefit justifies overhead. Yes: task planning, AI Review, **live agent-orchestration visibility** (`S-MI-42`, 2026-07-09 — opt-in `stream:true` SSE transport on `api/capabilities/execute.js`, surfaces the harness's own real `request_help`/`delegate_to_agent`/critique dispatch events live as they happen, not just after the fact; see §19f). No: routing, classification. |
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
5. **[SUPERSEDED — see §19b]** Capability execution is data, not routes. Every capability runs through the one generic executor (`api/capabilities/execute.js`); a new capability requires zero new route files — only Skill Profile rows + `capability_skill_profiles` + `agent_capability_assignments`. Never treat existing shared pipeline code (`db-assembly.js`/`ai-enrichment.js`/`request-receivable.js`) as a "precedent to copy" rather than code to import and extend — that exact anti-pattern produced `channel-intelligence.js`/`quality-gate.js`'s drift from the generic pipeline, found and retired via S-APPLE-03/S-CAPABILITY-EXEC (2026-07-01).
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

## 19b. The Generic Capability Executor [LOCKED S-APPLE-03-design 2026-07-01]

**This is the platform's founding intent, restated precisely: capabilities are data, not code.** A capability is a set of Skill Profiles (Identity, Behavior, Knowledge, Intent, Format) plus rows in `capability_skill_profiles` and `agent_capability_assignments`. Building a new capability should never require writing or deploying a new route — only inserting new Supabase rows. The platform is the container; agents are configurations that live inside it.

**The mechanism:** `api/capabilities/execute.js` — one generic route, called with `{ capability_slug, intent_slug, agent_id, task_context, tenant_id, format_skill_profile_slug, display_agent_id }`. The last two are optional, generalized from `AA-69`'s Work Order format-last pattern (`api/plan.js`) so any capability can have its output shaped by a display agent's Format Skill in the same single call (`AA-77`, `S-APPLE-03a-2`). It runs the same three already-generic pipeline steps every capability needs, in sequence:
1. `assemblePrompt()` (`db-assembly.js`) — loads the Skill Profiles for `capability_slug`, filtered to `intent_slug`
2. `enrichPrompt()` (`ai-enrichment.js`) — RAG retrieval via `fetch_instruction`, plus a pre-planning step (internally named "REFLECT" — not the industry Reflection pattern, see `§1`'s Scaffold entry) that drafts an execution plan and splices it into the system prompt
3. `sendRequest()` (`request-receivable.js`) — builds the model call from `format_contract` (model, max_tokens, schema — all Skill Profile data per §2's universal properties and the `AA-75` fix), calls Anthropic, runs declared guardrails, dispatches to a handler, logs to `ai_activity_log`, returns content

**Display-intent sibling pattern (added 2026-07-22, `S-CHI-60`) — now 3x-proven:** when a content-producing intent's own output needs UI-ready display formatting, the fix is never a bespoke per-screen rendering tweak nor a hardcoded call to a specific display agent — it is a small, paired sibling Intent Skill Profile, added under the display agent's own existing capability (never a new agent, never a new capability route), reached through the same generic `request_help`/`delegate_to_agent` round trip every other delegation uses (`§19d`). Three instances confirmed: Marcus/`ci-answer-display-intent`, Jordan/`hyp-hypothesis-test-display-intent` (news), Nadia/`data-patch-display-intent` (`CHI-60`). Which primitive the *content-producing* intent uses depends on whether it also carries `requires_human_confirmation`: `delegation_required` (auto-resolves, never returns to the caller) is structurally incompatible with `requires_human_confirmation` on the same intent — `runLoop()`'s confirmation gate only fires on a turn where `!turn.is_delegate_call` (`execute.js` ~L700), and a `delegationRequired` intent's turns are never anything but delegate calls, so the two traits can never coexist on one intent. `data-patch-intent` (confirmation-gated) therefore uses `can_request_help` only, letting its own final schema call complete the round trip and reach the gate itself — see `§19d`'s new note below for a related gap this combination newly exposed.

**Terminology note (added 2026-07-17/18/20, `SES-001`) — these three steps map onto two distinct concepts in `§1`'s Platform model, not one.** Steps 1-2 are **Scaffold** — what one agent is given, once, before its work starts. Step 3 is part of **Harness** — specifically its Execution sub-part (the model call itself); the guardrail check inside `sendRequest()` is Harness's Evaluation sub-part. The loop that repeats this whole sequence (`runLoop()`, `§19d`) is **Loop** — cross-cutting, not a fourth step nested here. Full definitions, not repeated: `§1`.

None of these three files change per capability. `execute.js` itself contains zero capability-specific logic — no `if (capability_slug === 'x')`, ever. That conditional is exactly the thing this section exists to prevent.

**What this retires:** Prior to this decision, two shipped capabilities (`channel-intelligence.js`, `quality-gate.js`) each hand-rolled their own Anthropic call and `ai_activity_log` write instead of calling `sendRequest()` — duplicating logic that already existed generically. The root cause is on record in the `S-APPLE-02b` kickoff doc, which directed a session to read `request-receivable.js` "as precedent only, not imported or modified" and copy its pattern into a new file. **That instruction, and that pattern, is the anti-pattern this section bans.** If existing shared Layer 3 pipeline code doesn't yet support what a new capability needs, the correct move is to extend the shared code generically (gated by data or parameters, never by agent or capability identity) — not to copy it. If a genuine extension isn't possible, that is itself a decision requiring explicit sign-off from John in the design session, never a silent workaround.

**Cross-capability handoff — [SUPERSEDED 2026-07-02, `S-ARCH-AGENT-LOOP-01-design`, v6.0.0 — see §19d].** This paragraph previously assigned cross-capability handoff to "Layer 2's job (the calling screen)" — e.g. quality-gate's `guardrail.result: 'block'` triggering a retry, the Intake Assistant's `route_to: ['reasoner', 'data-expert']`. That model is screen-scripted sequencing, not agent orchestration: a screen inspecting a capability's structured output and deciding what to call next on the agent's behalf. It contradicts the platform's own pitch language ("the agent reasons and argues, the human declares intent and commits," `APPLE-AGENT-1-v5-DESIGN.md` §2) and has been required to be otherwise since the NIGP build's inception. Corrected in §19d: an agent's decision to call another agent must be an inference the calling agent makes for itself, never code — platform or screen — deciding on its behalf. `route_to`/`guardrail.result`-style fields on the four capabilities still running single-shot (`channel-intelligence`, `hypothesis-evaluation`, `pipeline-triage`, `quality-gate`) remain valid as data until their retrofit (`AA-82`) lands — only the *execution* of that routing moves out of Layer 2, not the data shape.

**Migration status:** `channel-intelligence.js` and `quality-gate.js` are being retrofitted onto `execute.js` and retired as standalone routes (`S-CAPABILITY-EXEC-01`/`02`). `hypothesis-evaluation` and `pipeline-triage` (`S-APPLE-03`) are built directly as Skill Profile data from day one — neither ever gets its own route file. Once the retrofit lands, `SH-11` (`FEATURES.md`) is permanently resolved, not patched: new capabilities cost zero serverless functions, structurally, going forward.

---

## 19c. The Library / Data Room Model [LOCKED S-LIBRARIAN-03-design 2026-07-02]

**Two RAG stores exist, structurally separate, never by convention:**

- **`knowledge_entries`** — an agent's own personal training/learning content. Production, predates the Apple track, unchanged by this section. **Reads:** an agent's own capabilities may read its own `knowledge_entries` directly — self only, no cross-agent access, ever (`AA-92` explicitly confirms this bars even a broker/aggregator role from reading across agents). **Writes:** go through a Trainer agent only (e.g. Susan Smith, TR-08) — an agent never writes its own training data directly, even content it generated itself. The Reasoner handing synthesized content to Susan for the actual embed/write (`AG-24`) is the pattern, not an exception to it. **Correction (2026-07-02, `S-APPLE-04a-design`):** this bullet previously read "an agent's own capabilities and its Trainer... read/write it directly," implying agents could write their own training data — that direct-write path never actually existed as built and is now explicitly ruled out.
- **`the_Library`** — business data belonging to a client company, potentially shared across several agents working that account. Never personnel/training content.

**Why two tables, not one table with a flag:** the two have fundamentally different trust boundaries. An agent (and its Trainer) may always reach its own training corpus, but must never be able to reach another company's business data. Conversely, Eleanor Voss (the Librarian, LB-01) must never be able to read any agent's personal/training content — she has no business reason to, and no code path should make it possible even by mistake. Physical table separation makes both guarantees true by construction: there is no shared function, import, or query path connecting the two tables. A bug in one cannot leak into the other, because nothing calls across the boundary — this is stronger than a runtime permission check, which can be bypassed by a future caller that simply doesn't call it.

**Data Rooms are a field, not a table.** `the_Library` holds every client's business data in one table, partitioned by the `data_room_tag` column — the same pattern the platform already uses for `tenant_id` scoping, one level more granular. A physical table per Data Room doesn't scale (a new table per client onboarded) and fights the "one Library" model. The `data_rooms` table is the registry of which tags are real — a `data_room_tag` must exist there before it can appear in an `agents.data_room_access` array or on a `the_Library` row. This catches a typo'd or invented tag as a hard failure instead of silently creating an orphaned, uncredentialable partition.

**Access rule, enforced structurally, not by opt-in:** every read and write to `the_Library` goes through `lib/librarian.js` — `queryLibrary({ requestingAgentId, ... })` / `writeLibrary({ requestingAgentId, operation, ... })`. These check the requesting agent's `data_room_access`/`uber_access` against the `agents` table before resolving a `data_room_tag`, exactly as already built in `S-LIBRARIAN-01a`/`02`. `the_Library`'s own query/embed-and-upsert primitives live inside `lib/librarian.js` itself and are not exported for use elsewhere — Eleanor's module is the only code in the platform that imports them. No other agent's capability, no Trainer pipeline, no future `api/` route touches `the_Library` directly, structurally, not by discipline.

**What this replaces:** `api/prompt/ai-enrichment.js`'s prior `fetch_instruction.broker === "librarian"` opt-in (`S-LIBRARIAN-01b`) allowed a Knowledge Skill Profile to *optionally* route through the broker — anything that didn't set the flag fell through to a direct, uncredentialed `queryRAG()` call. That fallback is retired for any `the_Library` access: a `fetch_instruction` targeting `the_Library` has exactly one path, full stop. The direct-`queryRAG()` path remains valid, unchanged, for `knowledge_entries` (personal-training) fetches — e.g. Michelle's Work Orders (`api/plan.js`), Brent's automation (`lib/agent-run.js`) — which were never meant to be brokered at all and are not part of this model.

**Origin note:** `the_Library`'s content originally shipped as 6 additive columns directly on `knowledge_entries` (`S-APPLE-01b-design`, 2026-07-01) rather than its own table, conflating shared business data with an unrelated, already-production personal-training table. Corrected here after review surfaced the trust-boundary conflict. See `docs/kickoffs/[version]-S-LIBRARIAN-03-the-library-migration.md` for the migration that moved the 20 existing `apple-cso-data-room` rows and reverted `knowledge_entries` to its original shape.

**Implementation note (found in QA, 2026-07-02):** Postgres folds unquoted mixed-case identifiers to lowercase, so `create table the_Library` in the Task 1 migration actually created a table named `the_library`. `match_the_library`'s RPC body (also unquoted) resolves consistently against that same lowercase name, so vector search worked untouched — but `lib/librarian.js`'s direct PostgREST calls (`writeTheLibraryEntry`, `update_status`, `bulk_reset`) originally targeted `/rest/v1/the_Library` and 404'd until corrected to `/rest/v1/the_library`. The physical table, going forward, is `the_library` (lowercase) — "`the_Library`" survives only as the conceptual/prose name in this document and in code comments.

---

## 19d. The Agent Loop — True Agentic Orchestration [LOCKED `S-ARCH-AGENT-LOOP-01-design`, v6.0.0, 2026-07-02]

**The principle:** an agent's decision to call on another agent, or that a proposed action needs review before it commits, must be an inference the model makes for itself — a tool call it chooses to emit — never code (the executor or a screen) that inspects a result afterward and decides on the agent's behalf. Screen-scripted sequencing that calls itself "agent orchestration" is the anti-pattern this section exists to prevent, the same way §19b exists to prevent hand-rolled capability routes. This has been the required architecture since the NIGP build's inception; §19b's prior "Layer 2 handles handoff" language (see supersession note above) was a miss against it, corrected here before any Market Intelligence capability shipped against the old model.

**Design intent — the sniff test (locked 2026-07-02, `S-ARCH-LOOP-PATCH-01-design`, John):** every decision point this section governs — does an agent need backup, does an action need review — must be judged against one question: *does this show AI intelligence, judgment, and reasoning that is traceable and logged, or have we just hardcoded data/routing dressed up as intelligence?* This is the platform's prevailing spirit and purpose, not a style preference — the whole Agent Loop / Resource Ownership Broker architecture exists so agents reason for themselves instead of being scripted, because that reasoning trail (visible, logged, attributable) is the product's core credibility claim to a sophisticated technical stakeholder (see `AGENT-ARCHITECTURE.md` §2, `MI-09` Platform Leverage callout). Concretely, for "does an agent need backup": a static "always seek backup" trait fails this test even though it's data, not code — the agent never actually reasons about *this* task, it just always fires (see the now-removed `executing_agent_id`/`critique_agent` fields' sibling anti-pattern: genericness alone doesn't cure a decision nobody actually made). The requesting agent's own per-call inference — it decides, states why (`reasoning` field, logged), and only sometimes calls `request_help` — passes. A second agent's own evaluative judgment (Owen Marsh's deferred critique/governance role, `AA-81`) also passes, as a distinct narrative ("the platform has a dedicated agent whose job is watching everyone else's reasoning") — but it is its own capability, built in its own session, never silently folded into another agent's scope. Any future design session that adds a new "does X need Y" decision point to this platform must run it through this test before speccing the mechanism.

**The mechanism — two generic, capability-agnostic primitives added to the existing generic pipeline (`execute.js`/`request-receivable.js`), never as agent- or capability-specific code:**

1. **The loop.** `runCapability()` becomes multi-turn instead of single-shot: call the model with its full tool set (its structured-output schema, plus the two fixed harness tools when enabled) → if the model emits a delegate tool call, the harness dispatches generically to `runCapability()` again for the resolved `capability_slug`/`intent_slug`, feeds the result back as a tool result, and calls the model again → repeats until the model returns its final structured output or hits a depth cap (`MAX_LOOP_DEPTH = 5`). **Corrected 2026-07-17/18 (`SES-001`) — supersedes the `available_delegates` description this replaced, removed the same day it shipped (`AA-87`; see the "one resolution mechanism" correction further down this section).**

   Whether an agent can request help at all is a single boolean, `can_request_help`, read from the calling agent's own targeted Intent Skill Profile — never a per-relationship array, never an agent name. When true, the model gets exactly two fixed harness tools (`request-receivable.js`'s `harnessTools`):
   - **`request_help`** — no `agent_id`, no `capability_slug`. Pure routing: "find me someone," always resolved live to whoever holds `project-manager` (§19e).
   - **`delegate_to_agent`** — dispatches to a specific `agent_id`/`capability_slug` the model must have actually been given as a candidate (e.g. from a prior `request_help` result). Carries its own `is_final` boolean, **set by the model's own judgment, per call**: `true` when nothing more is expected of the caller once the delegate responds (Hand-off); omitted/`false` when the caller expects to see the result and continue (Orchestrator-Workers). A `delegation_required` capability (correction below) forces this terminal regardless of what the model sets — everywhere else, `is_final` is genuine model judgment, not a static trait.

   Loop-mode is still **opt-in**, just by the `can_request_help` boolean's presence rather than by data-array presence: an Intent Skill Profile without it runs exactly as it does today, single-shot. This is what makes the change backward-compatible by construction rather than by scoping promise — confirmed no Work-screen caller reaches `execute.js` today (§19b's migration status note), so nothing there is retrofitted by this change, but the mechanism does not depend on that absence continuing to hold.
2. **The consequential-action gate.** Any tool/delegate declaration can carry `requires_human_confirmation: true` and, optionally, `critique_agent: "<agent_id>"`. The harness's rule is purely structural and names nothing: if the tool the model just called declares `requires_human_confirmation`, the harness (a) dispatches once to the named `critique_agent`'s capability for a single critique pass, if declared, then (b) pauses the loop and surfaces the original proposed action plus the critique to the human, who resolves it with exactly one of three outcomes — accept (proceed as proposed), reject (discard), or edit (revise the intent, which re-enters as a new action and gets its own fresh single critique pass, never an iterative negotiation). This generalizes a pattern already built twice in the Market Intelligence design — Stress Test's `override_warning` + Discard/Track as Assumption/Make Permanent (§5.4), and the Proofreader's guardrail/eval (§5.7) — into one reusable mechanism, not a third bespoke UX.

**Known gap, found live 2026-07-22 (`S-CHI-60`), not fixed this session — the consequential-action gate can silently bypass on checkpoint/resume.** `resumeCapability()` (`execute.js`) hardcodes `requiresHumanConfirmation: false` on every resumed continuation (all three `runLoop()` call sites inside `resumeCapability`) — a pre-existing, deliberately-accepted gap already on record in the file's own `enableWebSearch` comment, which lists `requiresHumanConfirmation` among the fields "not persisted to durable_hops... a resumed chain runs without this flag." Before `CHI-60`, no `requires_human_confirmation: true` intent had ever also declared `can_request_help`, so this code path was structurally unreachable and the gap stayed dormant. `data-patch-intent` (`CHI-60`) is the first to combine them, and its own `request_help`→Michelle round trip realistically consumes enough of the shared 60s hop budget (`AA-139`'s hybrid trigger, `getHopBudgetReserveMs()`) that the continuation checkpoints on essentially every real invocation once Michelle resolves to Alex — confirmed live, twice, via direct `_onEvent` tracing: the resumed turn's own final schema call executes through the default generic-executor path (a normal stored deliverable — no `status`, no `confirmation_id`) instead of ever reaching the `pending_confirmation` short-circuit, silently skipping the human confirmation card entirely. `data-escalate-intent` (`CHI-62`, unscheduled) is the only other `requires_human_confirmation` intent in the platform and will hit the identical gap the moment it gains `can_request_help`. Needs a `src/`/`api/` fix — most likely persisting `requiresHumanConfirmation` onto `durable_hops` and threading it back on resume, mirroring the existing `AA-145`/`AA-148` precedent for `task_context`/`delegation_required` — before `CHI-60` (or any future confirmation-gated, delegating intent) can be considered safe to ship. Out of scope for `S-CHI-60`'s Supabase-only session; flagged here for a follow-up coding session, not silently worked around.

**Orchestration topology is data, not a platform decision.** Whether an agent delegates peer-to-peer, only some agents delegate, or one agent acts as sole orchestrator reading others' self-assessed signals — all three are the identical mechanism above, differing only in how many Intent Skill Profiles have `available_delegates` populated. `ARCHITECTURE.md` does not mandate a topology; each scenario's design session chooses one and documents it as Skill Profile data. (The Market Intelligence build's chosen topology — Marcus Webb/CI-01 as sole orchestrator — is specified in `docs/APPLE-AGENT-1-v5-DESIGN.md`, not here.)

**Depth/turn caps — two tiers, only one is data:**
- **Platform-level hard ceiling** on total delegate hops per top-level request — infrastructure, lives in the harness, never overridable by Skill Profile data. Same category as the existing `maxDuration`/`AbortSignal.timeout()` limits in `request-receivable.js`.
- **Per-relationship intended cap** (e.g. Escalate's 1-round-per-hypothesis limit) — a data field (`max_delegate_rounds`) on the delegate declaration, tunable without a code change.

**The code/data test.** If a piece of logic would only function correctly by naming a specific agent id or capability slug, it is scenario configuration and belongs in Skill Profile data. If it only reads a generic field that any future capability could also set, it may be harness code. Neither `execute.js` nor `request-receivable.js` may contain a conditional keyed to a specific agent or capability identity — enforced by `SE-02` (`FEATURES.md`, extended 2026-07-02 to cover these two new primitives).

**Reference implementation already live:** Brent's Railway/Playwright ReAct loop is the one place in the platform that already works this way today — an agent deciding its own next move turn over turn. This section generalizes that pattern to every capability built on the Skill Profile model, rather than leaving it as a one-off.

**What this does not change:** §19b's still-valid principles remain in force unchanged — capabilities are data, not code; one generic executor, never a capability-specific route file; dispatch by data field (`format_contract.handler`), never by identity conditional. This section extends that discipline one level up, from "how is output formatted" to "does this agent need backup, and does this action need review" — it does not replace it.

**Build sequence (`CLAUDE-STATE.md` Session Queue):** `S-ARCH-AGENT-LOOP-01` (the two generic primitives, `execute.js`/`request-receivable.js`, plus the `SE-02` grep extension) → `S-ARCH-AGENT-LOOP-02` (Market Intelligence agent Skill Profile data — `can_request_help` on Marcus/Priya's relevant intents; Nadia deferred until her own capabilities exist, `AA-81`) → `S-ARCH-AGENT-LOOP-03` (retrofit the 4 already-shipped capabilities, MI-scoped only) → `S-APPLE-04a` onward, now built on this foundation instead of the superseded model.

**Single delegation path — `request_help` only (corrected 2026-07-02, `S-ARCH-LOOP-PATCH-01-design`; this paragraph itself went stale for one session and is fixed here, `S-ARCH-AGENT-LOOP-02-design`).** An earlier version of this section (`S-ARCH-OWNERSHIP-02-design`) described a second "known-capability delegation" path — an Intent Skill Profile's `available_delegates` naming a bare `capability_slug`, harness resolves the current holder, no broker round-trip. **That path was eliminated the same day by `S-ARCH-LOOP-PATCH-01-design`'s sniff test:** a pre-wired capability_slug relationship fails the same test as a static agent-id field — it still removes the requesting agent's actual judgment about whether/who to ask, just one layer of indirection removed from naming an agent directly. `available_delegates` itself was deleted from the harness in that same session (`AA-87`). The generic `resolveCapabilityHolder(capability_slug)` primitive this path would have used still exists and is proven — but only at the two call sites that pass the sniff test: `request_help`'s fixed `project-manager` lookup, and the consequential-action gate's `critique_capability_slug` resolution. **There is one resolution mechanism today, with two distinct outcomes (terminology corrected 2026-07-17/18, `SES-001` — see `§1`'s Loop entry for the full industry-term mapping):** the `request_help` tool (`AA-87`) — every cross-agent call, whether the outcome feels predictable or not, routes through whoever holds `project-manager` (`§19e`), resolved live, reasoned every time. Whether that call is an **Orchestrator-Workers dispatch** (default — the result returns to the caller as an observation, the caller gets another turn) or a true **Hand-off** (terminal, `delegation_required` capabilities only — the caller does not get another turn, the resolved agent's answer stands as final) depends on the *calling capability's own* `delegation_required` flag, not on `request_help` itself. Calling every one of these calls a "hand-off" — as this paragraph previously did — overstates what most of them actually do; reserve "hand-off" for the genuinely terminal case. `docs/SESSIONS.md`'s S-ARCH-OWNERSHIP-02-design entry already noted the `available_delegates` elimination; this paragraph is the fix for `§19d`'s own body text not reflecting it.

**Correction (2026-07-02, `S-ARCH-OWNERSHIP-01-design`) — `available_delegates`'s `executing_agent_id` and `critique_agent` fields are known-wrong, do not build against them.** Both name a specific agent id directly inside another agent's Skill Profile data — the same peer-to-peer dependency this section's own principle bans ("an agent's decision to call on another agent... must be an inference the model makes for itself"), just moved from code into data. A harness-level deterministic lookup (`capability_slug → agent_id`) was also considered and also rejected — genericness doesn't cure it, only real agent judgment does. See `§19e` (Resource Ownership Brokers) for the corrected model: no agent's data ever names another agent; cross-agent skill needs are brokered through Michelle Manning (Project Manager, `PP-01`), who resolves the executing agent herself, as her own reasoning output, not a static field. The loop/depth-cap/`pending_confirmation` machinery in this section is still believed correct and reusable — only the resolution of *who executes* changes. Patch session for the shipped `S-ARCH-AGENT-LOOP-01` harness not yet scheduled as of this note; `S-ARCH-AGENT-LOOP-02`/`03` are blocked until it lands.

**Note (2026-07-08, `AA-148`, `S-ARCH-DELEGATION-REQUIRED-02`) — `delegate_to_agent` is always terminal for a `delegation_required` capability, regardless of the model's own `is_final` value.** `delegation_required` (`AA-142`) already means, structurally, "this capability's entire job is handing off, never answering directly" — a Format Skill hand-off never changes the facts/citations/review status it was given, so there is no legitimate case where the delegator needs another turn after the delegate responds. The harness (`execute.js`'s `runLoop()`) now treats every `delegate_to_agent` call from a `delegation_required` capability as terminal (`delegationRequired || turn.tool_input.is_final === true`), closing a narration leak where the model's own omitted `is_final:true` produced a superfluous wrap-up turn that narrated about the hand-off instead of relaying the delegate's real content. This does not touch the sniff test above — `is_final` remains genuine model judgment for every capability that doesn't declare `delegation_required` (Owen's retry, Priya's Escalate); it is only overridden here because the outcome was already a fixed consequence of a trait the model's own capability data already declares, not a live judgment being taken away.

---

## 19e. Resource Ownership Brokers [LOCKED `S-ARCH-AGENT-LOOP-02-design`, 2026-07-02]

**The rule:** certain platform resources are owned exclusively by one agent. No other agent, no harness code, no future `api/` route gets a second code path to that resource — access is structurally impossible, not merely discouraged. This is distinct from routing/orchestration (`§19d`), which stays fully agent-intelligence-driven with zero hardcoded targets. Ownership answers *"who is allowed to touch this data or state, ever"*; the Agent Loop answers *"how does one agent's request reach another agent's reasoning."* An agent that needs an owned resource cannot go around the owner — it can only ask the owner, through the normal Agent Loop delegation mechanism, and the owner decides how to help. **Rule #1 of this platform: no agent is dependent on another, ever, in its own data.** An ownership broker's code may only answer "is this caller allowed" — never "which agent should handle this." The instant a broker's code starts picking a target agent — even via a "generic" registry lookup — it has become hardcoded routing wearing a broker's costume. Only agent reasoning (the owner's own judgment, or the requester's own judgment to ask at all) may pick a target.

**Two ownership flavors exist in this platform already — do not conflate them:**

| | Exclusive Access-Control Broker | Collaborative Service Attribution |
|---|---|---|
| Example | Eleanor Voss / `the_Library` (`§19c`) | Dan Bingham / DB Assembly + AI Enrichment (`§19`) |
| Who can call it | Only the owner's broker code path | Any agent — it's shared infrastructure |
| What's enforced | Structural: no other file imports the primitives; credential check per caller | Nothing — everyone benefits from the specialist's traits shaping the process |
| Why | Real trust boundary — cross-agent leakage or unauthorized write is a breach | No trust boundary — the specialist is a collaborator, not a gatekeeper |

**A resource needs an Exclusive Access-Control Broker only when unauthorized access would break a real trust boundary** (data leakage across tenants/clients, an unauthorized write, identity impersonation) — not merely because one agent happens to specialize in the domain. Confusing the two produces either an over-locked platform (nobody can use a shared service) or an under-locked one (a real trust boundary left open).

**The registry (open — add rows here as new ownership rules surface, this list is not exhaustive; `S-ARCH-OWNERSHIP-02-design` walks the full agent roster to find the rest):**

| Resource | Owner | Broker | Status |
|---|---|---|---|
| `the_Library` (Data Room reads/writes) | Eleanor Voss (LB-01) | `lib/librarian.js` — `queryLibrary()`/`writeLibrary()` | ✅ Built (`S-LIBRARIAN-01a`/`02`/`03`) |
| DB Assembly + AI Enrichment (shared service, not access-gated — listed for contrast, not as an ownership boundary) | Dan Bingham (PS-01) | none — collaborative attribution only | ✅ Built (`S-PM-08`) |
| Full roster (all 21 agents) — `capabilities`/`skill_profiles`/`agent_capability_assignments` + `agents` table competency fields; **surfacing ranked candidates** for a delegated skill need (never unilaterally selecting — the requesting agent chooses, `S-ARCH-OWNERSHIP-02-design`) | Michelle Manning (PP-01) | `lib/project-manager.js` (`AA-86`) | ✅ Built (`S-ARCH-PM-BROKER-01`) — **but see 2026-07-08 note below: the built broker doesn't yet surface real Skill-level content, only the thin Capability wrapper (`AA-165`)** |
| Writes to an agent's own personnel file (training stats, skill/situational scores, docs/classes/chunks counts) | The Trainer (Susan Smith, TR-08) | *new* — none exists yet | ❌ Not built |
| An agent reading its *own* personnel file (self-read only, agent-to-agent — distinct from the human-facing Personnel screen, which is unrestricted UI display) | Each agent, for itself only | *new* — none exists yet | ❌ Not built |
| **Front-door chat/answer surface specifically** on the Market Intelligence screen (not every HITL moment on it — AI - Hypothesis Test's `override_warning` and Memory Consolidation's commit gate are separate, per-capability `§19d` gates owned by Priya/Elena respectively, clarified `S-ARCH-OWNERSHIP-02-design`) | Marcus Webb (GEO CSO Expert, CI-01) | *new* — screen doesn't exist yet (`S-MARKET-INTEL-01`) | ❌ Not built, blocked on screen |
| Michelle Manning cross-agent `knowledge_entries` (RAG) access | *deferred* | *new* — needs its own gated broker, out of `AA-86`'s scope | ❌ Backlogged (`AA-92`) |
| `the_reasoning` (opinion/reasoning content) — a **third ownership flavor**, "Content-Owner Access," see `§19f` — gated by `data_room_tag`/`uber_access` like `the_library`, but multi-writer, no single arbitrating owner | Nadia Farouk (CI-03) + the Reasoner (`AG-20`, once built), each self-attributed | `lib/search-harness.js` (`store: 'the_reasoning'` branch) | ✅ Built (`S-ARCH-REASONING-LAYER-01`) — confirmed live 2026-07-16, 22 real rows in active use |

**Not yet catalogued — flagged, not resolved.** John noted there are likely more ownership rules not yet named. Any future design session that identifies one adds a row here immediately (Backlog Capture rule) rather than letting it live only in conversation. `S-ARCH-OWNERSHIP-02-design` walked the 7 Market Intelligence-track agents (Michelle, Marcus, Priya, Nadia, Owen, Sam, Elena) plus Alex Reeves — confirmed **Neither** for Priya, Nadia, Sam, and Alex (each reasons/formats and hands off through existing generic mechanisms, nothing exclusive to gate); Owen and Elena's classification stays explicitly deferred (Owen's critique-agent role, Elena's write-gating — both per prior John decisions, see `docs/FEATURES.md` `AA-81`). The remaining 14 platform agents (Chloe, Mike, Bob, Christy, Robyn, Brent, Pat, Susan, Dan, Riley, Claire, Victoria, Eleanor, plus a formal Robyn/v4 boundary decision) are **explicitly deferred to a future pass** — Dan and Eleanor are already resolved elsewhere in this table; the rest have no assigned session yet. Cleanup items found along the way are backlogged individually: `docs/FEATURES.md` `DB-20`, `AG-30`, `AG-31`, `SK-22`, `AA-91`, `AA-92`, `AA-93`.

**Logged reasoning as a byproduct, not a separate feature.** Every ask-the-owner hop is a real Agent Loop tool call — requiring a `reasoning` field on the request/delegate tool schemas costs nothing extra and gives an audit trail of *why* an agent asked and *why* the owner picked who it picked. This reasoning trail is exactly the "annotated decision transcript" training material `AGENT-ARCHITECTURE.md` §2 already defines as the most valuable, hardest-to-replicate kind — an owning agent's routing judgment can become its own Reasoning-dimension training material later (Supervised Adaptive, John approves before ingestion), same mechanism as any other agent, nothing new to invent.

**Note (2026-07-08, `AA-152`, `S-ARCH-DELEGATION-REQUIRED-03`) — for a `delegation_required` capability, Michelle's `recommended_agent_id`/`recommended_capability_slug` is treated as final by the harness, not merely a menu for the requester to pick from.** The registry row above's "never unilaterally selecting — the requesting agent chooses" language remains the default for every ordinary `request_help` caller — that discipline is unchanged, not silently rewritten. But `AA-142`/`AA-148` already established that a `delegation_required` capability's entire job is handing off, with no legitimate second judgment left for the requester to make after a hand-off; this session's own live baseline (5 direct `agent-selection-intent` calls against a realistic MI-screen Q&A display need) found Michelle's own reasoning already reliable — a correct top pick with honest, logged reasoning on every run that completed — while the actual production failure lived in the requester's own *second*, less-informed model turn re-grading a recommendation that was already reasoned once, in the open. `execute.js`'s `request_help` branch now auto-resolves straight to Michelle's own `recommended_agent_id`/`recommended_capability_slug` (validated against her own `candidates` array, never asserted directly) for `delegation_required` callers only — every other `request_help` caller still gets the full two-step hand-off, completely unaffected. This is not the previously-rejected `capability_slug → agent_id` deterministic lookup (`§19d`'s Correction note above) — Michelle's own live LLM reasoning still produces the recommendation every time; only the redundant second reasoning pass grading it, once already reasoned, is removed.

**Note (2026-07-08, `AA-165`, found during the `AA-153` design session, John's explicit priority — "I can't tell you enough how important this is") — Skills, not Capabilities, are supposed to be the atomic differentiating unit (`§2`, LOCKED: "Skills are now the atomic unit of the platform" — hierarchy Skills → Skill Profiles → Capabilities → Competencies → Agents; `PLATFORM-AGENT-RULEBOOK.md` AR-1.0 restates it). This registry row's own scope already named `skill_profiles` as part of what Michelle's broker owns access to. But the shipped code doesn't honor that: `fetchRoster()`/`rosterToContext()` (`lib/project-manager.js`) only surface `capabilities.description` (a short blurb) plus bare `intent_slugs` names and `format_output_types` — never `skill_profiles.method`/`.objective`/`.output_desc`, the actual Skill-level content, for any candidate, for any agent. Two agents with identical capability descriptions but wildly different underlying Skill depth would be indistinguishable to Michelle today; the platform's real differentiator (rich, well-built Skills) is invisible to the one reasoning process that's supposed to reward it. Root-caused, not yet fixed — needs its own session extending `fetchRoster()`/`rosterToContext()` to pull and surface real Skill-level fields. Any future session touching Michelle's broker or agent-selection quality must check this first, not patch at the Capability-description layer as a workaround (see memory `feedback-skills-are-the-differentiator`).**

---

## 19f. The Reasoning Layer [LOCKED `S-ARCH-REASONING-LAYER-01-design`, 2026-07-03]

**Origin — `AA-104`.** Surfaced while diagnosing `S-APPLE-04b`'s hop-budget bug: a `supersede`'s 2 Eleanor round trips (4 of 5 available Agent Loop hops) left almost no margin, and a model wobble exhausted the budget. Diagnosing *why* led to a deeper reframe (John): Eleanor (the Librarian) owns verified business fact, in and out of `the_library` — but Nadia (Data Analyst)'s correction output isn't always a verified fact. Sometimes it's her own interpretation/argument about an existing fact — a kind of content the platform had no home for. Checked against the live schema, not just the design doc's prose: `data_type`/`citeable`/`is_baseline`/`supersedes_id`/`confidence`/`override_flag`/`geo`/`program_area`/`partner_id`/`period` exist only on `the_library`; `knowledge_entries` has none of it. `APPLE-AGENT-1-v5-DESIGN.md` §5.10 (The Reasoner, not yet built) already specs writing `data_type: "learned"` into `knowledge_entries` — a column that table doesn't have. Before this section, there was, structurally, no physical home anywhere in the platform for an agent's own opinion or reasoning about a Data Room's content.

**The rule:** opinion and reasoning content — Nadia's Data Integrity Patch output, and (once built) the Reasoner's Memory Consolidation synthesis — lives in a new, physically separate table, `the_reasoning`. Not agent Behavior (that's the Behavior Skill Profile — config about how an agent thinks, unrelated). Not business fact (that's `the_library`). It is a third structurally-distinct thing: an agent's own judgment about the business data in a Data Room, kept apart from that Data Room's fact layer for the same reason `§19c` physically split `the_library` from `knowledge_entries` — different trust models must not share a table, because a physical boundary makes the guarantee true by construction, not by discipline.

**Why physically separate from `the_library`, specifically:** `§19c` already guarantees, structurally, that `the_library` has exactly one write path — Eleanor's broker, full stop, no exceptions. Nadia (and, once built, the Reasoner) must write opinion/reasoning content directly, with no round trip to Eleanor — that's the entire point, and it's what actually fixes the hop-budget bug (recording an opinion is no longer the same action as promoting a fact; the expensive Eleanor path becomes the rare, deliberate exception, not the default outcome of every correction). Those two requirements — `the_library` has exactly one write path, and Nadia/Reasoner write opinion content with zero round trips — are only simultaneously true if opinion content lives somewhere else, physically. It also keeps Demo Reset (§7, `S-APPLE-04c`) simple: `the_library`'s reset (`archive where is_baseline=false` / `restore where is_baseline=true`) stays completely untouched by anything in `the_reasoning`.

**Schema — `the_reasoning`:**
```sql
id                       uuid PK default gen_random_uuid()
tenant_id                text default 'global'
data_room_tag            text NOT NULL, FK -> data_rooms.tag
agent_id                 text NOT NULL          -- self-attributed author: nadia, reasoner, etc.
content                  text NOT NULL           -- the opinion/reasoning itself
embedding                vector
source_chunk_ids         jsonb default '[]'      -- the_library.id[] this reasoning is about (persists
                                                  -- the citations field both Nadia's and the Reasoner's
                                                  -- output schemas already produce, §5.5/§5.10)
source_question          text null               -- the original hypothesis/dispute/correction that triggered it
confidence               text null               -- high | medium | low
status                   text default 'active'   -- active | superseded | archived
supersedes_id            uuid null, FK -> the_reasoning.id   -- opinion revises opinion, insert-only, same
                                                              -- pattern the_library already proved
promoted_to_library_id   uuid null, FK -> the_library.id      -- set once promoted to fact
created_at               timestamptz default now()
```

**`the_library` gains one new nullable column and one new `data_type` value:**
- `promoted_from_reasoning_id uuid null, FK -> the_reasoning.id` — back-pointer to the `the_reasoning` row a promoted fact came from. Lineage now runs both directions: a `the_library` row can show what opinion produced it; a `the_reasoning` row can show what facts it cited (`source_chunk_ids`).
- `data_type` gains a 4th value, **`consolidated`** — reuses vocabulary already locked in §8 ("Memory Consolidation — the Reasoner turning one human correction into durable, structured long-term knowledge"), naming the action that produced the row rather than inventing new terminology. Distinct from `inferred` (a conclusion derived from real source documents) and `synthesized` (authored scenario content, anchored to real benchmarks but not derived) — a promoted opinion is neither; it's reasoning that was reviewed and accepted as now-authoritative.

**Integrity check, same shape as `AG-33`'s existing fix on `the_library.supersedes_id`:** every id in `source_chunk_ids` must be verified to belong to the same `data_room_tag` as the `the_reasoning` row itself — otherwise a bug could let reasoning cite another tenant's facts without the reasoning text itself leaking.

**Ownership — a third flavor, alongside `§19e`'s existing two:**

| | Exclusive Access-Control Broker (Eleanor/`the_library`) | Collaborative Service Attribution (Dan Bingham) | Content-Owner Access (`the_reasoning`) |
|---|---|---|---|
| Real trust boundary? | Yes | No | Yes — IP moat, per-Data-Room, per John (2026-07-03) |
| Who can write | Only the owner's broker code path | Anyone | Any agent legitimately scoped to that Data Room, writing its own content |
| What's enforced | One arbitrating owner decides for others | Nothing | Self-attribution (`agent_id`) + `data_room_tag`/`uber_access` credential check — no agent arbitrates *for* another agent |

Concretely: Nadia (Data Analyst) and the Reasoner (`AG-20`, once built) each write their own content directly — no delegation hop between them, no single owner agent standing in the middle. The credential check is the same one `queryLibrary()`/`writeLibrary()` already perform (`agents.data_room_access`/`uber_access` against `data_rooms`) — reused, not reinvented. This is deliberately *not* collaborative-shared (Dan Bingham's flavor) — content is gated by `data_room_tag`, same security boundary as `the_library` (Apple's agents never see Verizon's reasoning) — and deliberately *not* single-gatekeeper (Eleanor's flavor) — no one agent arbitrates another's write. `agents.uber_access` (the existing boolean, currently only Eleanor holds it for `the_library`) extends to the Reasoner for `the_reasoning`, same mechanism, second holder.

**Read access is generic, not a bespoke retrieval call.** `the_reasoning` is a `fetch_instruction` target in the shared prompt/enrichment pipeline (`api/prompt/ai-enrichment.js`, Dan Bingham's collaborative infrastructure, §19) — any agent answering a question in a Data Room automatically inherits accumulated reasoning as context, the same way RAG retrieval already works generically today (John, 2026-07-03: "it becomes the company's culture, so they get the same answers"). Gated by `tenant_id` + `data_room_tag`, identical two-tier scoping to `the_library`.

**Promotion (opinion → fact) still goes through Eleanor, unchanged.** Recording an opinion in `the_reasoning` never touches Eleanor. Promoting one to a `the_library` fact (a new `insert` with `data_type: 'consolidated'` and `promoted_from_reasoning_id` set) is still a write to her table, reached the same way any cross-agent ask is — a real, logged Agent Loop delegation, using the already-built `on_accept_intent_slug` hand-off (`AA-103`). Promotion is deliberate and rare, not the default outcome of every correction.

**Code structure — one public entry point, not two, per John's request (2026-07-03) to avoid an unnecessary second importable module:**
- **`lib/search-harness.js`** — the only file any `api/` route imports to reach either `the_library` or `the_reasoning`. Exports `queryContent({ requestingAgentId, store: 'the_library' | 'the_reasoning', ... })` and `writeContent({ requestingAgentId, store, operation, ... })`. Dispatches internally on `store` — a generic data field, same shape as `execute.js`'s `format_contract.handler` dispatch (`§19b`: "dispatch by data field, never by identity") — never an identity conditional.
- Internally, each `store` branch keeps enforcing its own distinct policy (Eleanor's single-gatekeeper check for `the_library`; the multi-writer `data_room_tag`/`uber_access` check for `the_reasoning`) before touching its table. The trust boundaries are not merged — only the public surface is. `§19c`'s guarantee ("no other file imports `the_library`'s primitives") becomes "no file but `lib/search-harness.js`" — same shape, one file instead of two to check against (extends `SE-06`'s planned enforcement grep).
- **`lib/vector-search.js`** — a new, generic, policy-free low-level primitive (`embedAndSearch({ table, rpcName, queryText, matchCount, extraParams })`) extracted from `lib/librarian.js`'s previously-duplicated `embedText()`/`searchTheLibrary()`. Confirmed live duplication (2026-07-03): `lib/rag.js`'s `queryRAG()` and `lib/librarian.js`'s internal primitives were two independently hand-written copies of the same embed-then-RPC-search mechanic. `lib/search-harness.js`'s two internal branches both call this shared primitive instead of hand-rolling their own. `lib/rag.js`/`queryRAG()`/`knowledge_entries` are explicitly **not** touched or ported onto this primitive in this pass — deferred (`AA-105`, `docs/FEATURES.md`) to avoid risking regressions on live functionality; `lib/librarian.js`'s existing exports (`queryLibrary`/`writeLibrary`) are preserved as thin wrappers so no existing caller needs to change.

**MCP exposure — not built now, not blocked by this shape.** Per the platform's existing MCP model (`SV-03`), a Service becomes an MCP tool by wrapping an existing function at a `deepbench/{intent}/{format}` path — `search-harness.js`'s single clean signature is easier to wrap later than multiple scattered ones would have been. The one genuinely new question for that future work — how an external (non-agent) MCP caller maps to a `requestingAgentId`/credential at all — is out of scope here, already deferred (`SV-03`/`SV-04`, `S-future`/`S-MCP-01`).

**What this does not change:** `§19c`'s guarantees for `the_library` are unchanged — still exactly one write path, still Eleanor's alone. `knowledge_entries`/`queryRAG()` are unchanged, untouched this pass (`AA-105`). `§19d`'s Agent Loop mechanism (`request_help`, `on_accept_intent_slug`) is unchanged — promotion still uses it exactly as built.

---

## 19g. The Generic Visualization Layer [LOCKED `S-ARCH-VIZ-01-design`, 2026-07-06]

**Origin — `MI-13`.** Found live 2026-07-06 (`S-ARCH-DISPLAY-LOOP-01-design`, from a screenshot): Theory Evidence's `projected_state` (Stress Test's before/after metrics) rendered as plain text rows even though `recharts` was already a project dependency. The narrow fix — hand-roll one chart component for this one field in `EvidenceColumn` — was rejected mid-design (John, 2026-07-06) as the same anti-pattern `§19b` exists to prevent: a hardcoded, capability-specific piece of Layer 2 code standing in for what should be data. `docs/FEATURES.md`'s other open chart item, `MI-03` (Data Room default charts, `S-MARKET-INTEL-03`), independently confirms nothing in the platform has ever addressed "charting" as a concept — it describes "pre-built static charts carried from v4," not agent-driven, not even live-data-driven.

**The rule:** whether a piece of agent output deserves a chart, what shape that chart should take, and what values/labels go into it are inferences the formatting agent makes for itself — the same standing principle `§19d` established for delegation ("an inference the model makes for itself... never code that inspects a result afterward and decides on the agent's behalf"), applied one layer further down the stack, to visual presentation instead of orchestration. Layer 2 owns exactly one generic thing: given a `chart_type` string and matching `chart_data`, draw it. It never owns *which* type applies to *which* capability's content — that would be `§19b`'s banned `if (capability_slug === 'x')` conditional, wearing a chart instead of a route.

**The mechanism — three pieces, one already fully generic:**

1. **Schema convention (`visualization`)** — an optional object property added to a Format Skill's existing JSON output schema (`format_contract.schema`), alongside whatever content fields that skill already returns (e.g. `qa-answer-format`'s `headline`/`body`/`citations`):
   ```json
   "visualization": {
     "type": ["object", "null"],
     "description": "Only include this if the content you're producing contains metric-driven, comparable, or trend-shaped data that would help the reader more as a chart than as prose. Omit entirely (null) if nothing here is naturally chartable.",
     "properties": {
       "chart_type": {
         "type": "string",
         "enum": ["bar_pair"],
         "description": "bar_pair: a set of one or more before/after or current-vs-target single-value comparisons, one pair per metric."
       },
       "chart_data": { "type": "array", "description": "Shape depends on chart_type — see that type's own registered contract." },
       "caption": { "type": "string", "description": "One plain-language sentence: what this chart shows and why it matters." }
     }
   }
   ```
   `chart_type`'s enum is the platform's current chart-type registry (starts with one member, grows additively — see below). `chart_data`'s inner shape is defined per chart_type, documented where that type is registered, the same way each backend `HANDLERS` entry (`§19b`) documents its own expected request shape without the dispatcher needing to know it. `caption` is the agent's own plain-language read of what the chart shows and why it matters — carried alongside the chart, not reconstructed by Layer 2 from raw values.

2. **Reasoning criteria — JSON Schema `description` fields, not Behavior prose, not RAG.** Verified against the live schema and runtime code, not assumed: a Format Skill Profile's `method`/`objective`/`output_desc` columns are **never assembled into the system prompt for this skill type**, in either path that exists today — the native `buildSections()` path (`db-assembly.js`, the `format`-type branch builds its section content from only `output_type`/`section_structure`, nothing else) or the override path every format-last call actually uses (`execute.js`'s `fetchFormatOverride()`, `AA-77`, an identical minimal `output_type`/`section_structure` build). Those columns are Supabase-side design documentation, not live instruction, for Format Skills specifically — unlike Identity-type profiles, where `objective`/`method` genuinely are assembled into the prompt (`db-assembly.js` lines 82-84). The one channel proven to reach the model in both paths is `format_contract.schema` itself, passed verbatim as the Anthropic tool's `input_schema` (`request-receivable.js`) — including every property's `description` field. So the reasoning criteria for `chart_type`/`chart_data`/`caption` live as `description` text directly on those schema properties, domain-agnostic by construction — "does this content contain metric-driven, comparable, or trend-shaped data that would help the reader more as a chart than as prose? If yes, which registered chart_type's shape matches, and what are the actual values? If no, omit `visualization` entirely" — never "for capability X, always emit chart_type Y." This is also the more portable home for it: copying the `visualization` schema fragment onto a different skill carries its own reasoning with it — no separate profile update required (see Portability, below). **Not `knowledge_entries`/RAG** (`fetch_instruction` → `queryRAG()`, `api/prompt/ai-enrichment.js`) either way: RAG retrieval is semantic and per-query, appropriate for supplementary recalled content, wrong for an instruction that must be present every time the schema property itself is present.

3. **`ChartRenderer` + `CHART_RENDERERS` registry (Layer 2, `SharedUI.jsx`)** — one generic component, dispatch-by-string-key on `chart_type`, structurally identical to the backend `HANDLERS` registry `§19b` already locked (`request-receivable.js:10`): `const CHART_RENDERERS = { bar_pair: BarPairChart }`. A screen that wants to show whatever chart an agent chose does exactly one thing: `result.visualization && <ChartRenderer type={result.visualization.chart_type} data={result.visualization.chart_data} caption={result.visualization.caption}/>`. That call site never branches on which capability produced the data — it would render identically for a Stress Test result, a Data Room chart, or an unrelated future screen's content. Each registered renderer draws its own type-specific presentation (axis labels, legends, bar labels) — that specificity is expected and lives with the renderer, not with the calling screen.

**What stays deterministic, and why that is not a `§19b` violation:** the closed `chart_type` enum and its registered renderers. Layer 2 can only draw types it has renderer code for — unavoidable in any generic system, the same non-violation as `§19b`'s `KNOWN_HANDLERS` throwing a 501 for an unimplemented handler rather than silently no-op-ing. Adding a second chart type later is additive (register one more renderer, extend one enum) — it is never a reason to write capability-specific Layer 2 code, and it never touches an existing renderer or an existing skill's schema.

**No new call, no new latency, no new `ai_activity_log` row.** `visualization` is one more optional property in a JSON schema already sent as an Anthropic tool's `input_schema` on a call the formatting agent was already making (`§19b`, `sendRequest()`). The agent reasons about content and visualization together, in the same single inference pass — there is no separate "chart decision" request/help hop, no second agent in the loop.

**Ownership — an extension of Format Skill Exclusivity, not a new exception.** Only a display/editor agent may hold a Format Skill at all (`STANDARDS.md` §13 rule 14, enforced going forward by `SE-04`) — a content specialist (Priya, Nadia, Sam) never reasons about its own presentation. `visualization` is additive to that same exclusive domain: any display agent that already owns a Format Skill can be given the `visualization` schema fragment and reasoning criteria on its own Skill Profile. It is not inherited platform-wide the moment one agent (Alex) gets it — each display agent that should be able to visualize needs the same fragment added to its own profile, once, the same way each of Alex's existing schema fields had to be defined once for him and would need defining again for a second display agent.

**Portability (worked example, not yet built):** if a future "cooking info" screen's capability also routes its formatting through Alex, he reasons about *that* content with the exact same domain-agnostic criteria — extracting e.g. before/after calorie values from a recipe substitution into the same `bar_pair` shape, with his own labels and caption — with zero changes to his Skill Profile. Two things could still require one-time, additive work, neither of them capability-specific: a genuinely new `chart_type` the registry doesn't have yet (register one renderer, reusable by anyone after), or a different display agent (not Alex) owning that screen's formatting, who would need the same schema fragment and criteria added to their own profile once.

**Migration status:** the mechanism itself — schema convention, reasoning-criteria pattern, `ChartRenderer`/registry — is built and proven live in `S-ARCH-VIZ-01` against Alex's real `intelligence-review-format` skill, independent of any screen. `S-MI-13` is its first concrete consumer: `EvidenceColumn` swaps its old hardcoded `projected_state` plain-text block for the generic `<ChartRenderer/>` call. `MI-03` (Data Room default charts) is not retrofitted onto this mechanism in either session — logged separately, `S-MARKET-INTEL-03`.

---

## 19h. Live Agent-Orchestration Visibility [LOCKED `S-MI-42`, 2026-07-09]

**Origin.** `§19d`'s own words: the Agent Loop's reasoning trail — visible, logged, attributable — is "the product's core credibility claim to a sophisticated technical stakeholder." Before this session, that trail was only visible *after the fact*: a hop's `request_help`/`delegate_to_agent`/critique dispatch had to fully resolve (multi-second real LLM latency) before its result reached Column 3's Agent Routing drawer, or before the chat's working-status indicator swapped to a new message. This section adds live visibility of the same real events, as they happen, without changing what those events are or how they're decided — genuine agent-reasoned delegation (`§19d`) remains the only mechanism that produces them.

**The mechanism — two generic, additive primitives, neither capability-specific:**

1. **`_onEvent` callback, threaded through `runLoop()`/`runCapability()`/`resumeCapability()`/`resolveAccept()`** (`api/capabilities/execute.js`) exactly like `_hop_counter`/`_deadline` already are — an explicit param, never closure state, so it survives arbitrarily deep nested recursion unchanged. Defaults to a no-op when absent, so every existing/future caller that never passes it is byte-identical, zero overhead. Fires a `{ type: 'delegation', fromAgentId, fromCapabilitySlug, toAgentId, toCapabilitySlug, toIntentSlug, viaTool, reasoning? }` event at all 5 real dispatch points in `runLoop()` — critique dispatch, `request_help`'s PM-broker call, the `delegationRequired` auto-resolve, the plain `delegate_to_agent` call, and a new `delegation_return` event when control genuinely falls back to the same agent for another turn (never fired for a terminal hand-off, since nothing legitimately "returns" from one). Every event fires the instant its target is resolved (a real Supabase lookup, the model's own tool-call argument, or Michelle's own already-produced recommendation) — never speculative, never fired before the referenced identity is real.
2. **Opt-in `stream:true` SSE transport on `handler()`** — reuses `api/plan.js`'s own proven idiom verbatim (`text/event-stream`, `data: <json>\n\n` lines, `data: [DONE]` sentinel), not a new transport. Every branch keeps its exact current plain-JSON behavior when `stream` is absent — the opt-in is per-request, not a capability-level or platform-level switch. Client-side, `MarketIntelligenceScreen.jsx`'s `readSSEResult()` mirrors `CreateWorkOrderScreen.jsx`'s existing reader — same idiom, not a second one. Live delegation events forward into the chat's shared `workingStatus` (`setStatus`/`onDelegationProgress`, one write path for both this session's live micro-hop events and the pre-existing scripted macro-hop swaps — see `STYLE-GUIDE.md` §5a) with `kind: 'orchestration'`, rendered with distinct two-tone styling from ordinary scripted status lines.

**What this does not change.** No new delegation decision, no new routing logic, no new agent capability — every event this mechanism emits corresponds to a dispatch point `§19d`'s Agent Loop already reasons through. This is observability layered on top of an existing mechanism, not a new one. `_onEvent` itself is still purely in-request/in-memory and unchanged — a fresh callback is supplied by the handler on every leg, including each `continue` call. **Correction (`S-ARCH-DURABLE-RESUME-02`, 2026-07-14 — this section previously claimed checkpoint-resume semantics were entirely unaffected; live-confirmed false.** A checkpoint landing *after* a delegation decision was announced via `onEvent` but *before* the nested call was dispatched previously caused a resumed hop to re-enter `runLoop()` from persisted `conversation_history`, re-ask the model for a turn it had already answered, and re-fire an identical `onEvent` — the duplicate "routing to X" row (`AA-185`, live-confirmed via two identical consecutive delegation events). The nested call's own partial work was also simply abandoned on resume, never resumed, producing orphaned `durable_hops` rows (`AA-187`, confirmed via two orphaned rows from the live repro). The fix is a pre-dispatch checkpoint: the budget check now runs *before* `onEvent` fires and before the nested call starts, persisting the model's already-decided-but-undispatched delegation in a new `pending_delegation` column; `resumeCapability()` reads it and dispatches directly with a fresh full budget. `onEvent` now only ever fires once a delegation is either dispatched live or resumed from a persisted `pending_delegation`, never re-derived by asking the model again.

**Correction (`S-ARCH-NESTED-RESUME-01`, 2026-07-16 — this section's own prior correction above fixed only half of `S-ARCH-DURABLE-RESUME-02`'s gap; live-confirmed the other half was still open.** The pre-dispatch checkpoint fix persisted a decided-but-undispatched delegation so a resume could dispatch it directly — but if that nested dispatch itself then checkpointed (its own budget ran out one hop later), `dispatchDelegation()`'s `nested_checkpoint` outcome dropped the nested job's `job_id` entirely, and the outer job's own checkpoint persisted `pending_delegation: null` — clearing the only field that recorded a delegation was still owed, while `conversation_history` was left ending in an unresolved `tool_use` block. The client's resume loop then re-entered `runLoop()` from that dangling history, which Anthropic rejects with a 400 (`AA-195`, live-confirmed via `durable_hops` row `64f1a7e7-317a-4907-8ec0-f6b41dae3e37`). The fix: `pending_delegation` gains a second valid shape, `{ waiting_on_job_id, tool_use_id }`, set whenever `dispatchDelegation()` itself checkpoints instead of clearing the field to `null`. `resumeCapability()` now checks this shape first, before its existing "decided but not yet dispatched" branch, and — when present — actively resumes the nested job (`resumeCapability()` called recursively, idempotent on an already-terminal row) so a single outer resume drives real progress down the whole chain: still-in-progress re-checkpoints the same wait-state unchanged, a completed nested job builds the real `tool_result` and resumes `runLoop()` from it, and a failed nested job fails the outer job with an honest error referencing the nested failure instead of ever feeding Anthropic a dangling `tool_use` block again.

**What this does not cover — flagged, not silently hidden (`AA-171`, unfixed as of this session).** `runQaWithQualityGate()`'s guardrail-block path (`MarketIntelligenceScreen.jsx`) still hardcodes `agent_id: "sam"` for the failure-triage call — that call is screen-scripted, bypasses `runLoop()` entirely, and is therefore structurally invisible to `_onEvent` (there is no harness dispatch point to hook). It correctly receives only the plain scripted-style working-status line, never the orchestration marker, until `AA-171` is fixed. If `AA-171`'s eventual fix routes Sam's involvement through Owen's own `request_help` reasoning (the only fix that would pass `§19d`'s sniff test), it lands on an already-instrumented dispatch point automatically — zero new code in this mechanism required.

---

## 19i. AI Pattern Tracking — The Three-Layer Model [LOCKED, rewritten 2026-07-21, supersedes the Four-Source Trust Model below]

**Origin.** Live design conversation with John, prompted by his own framing of *why* pattern tracking exists: it is the platform's primary showcase that real AI reasoning — not deterministic code — drives every hop of every agent loop, at a scale where cost, frequency, and behavior can be measured per pattern, per agent, and per Product Focus Area. Reviewing the prior model (the Four-Source Trust Model, preserved below for history) against that purpose surfaced five unaddressed governance questions, none of which the prior model answered: (1) how do we know we're missing a real pattern a model now exhibits, (2) how do we know our names/definitions are industry-standard rather than invented, (3) how do we know the catalog itself isn't inventing patterns even when detection is honest, (4) how do we handle an industry rename/redefinition, (5) how do we handle a model doing something genuinely new. Grounded in real external research before answering: OpenTelemetry's GenAI Semantic Conventions (a real, versioned, cross-vendor standard for LLM/agent call schema, in active development since April 2024) and Anthropic's own "Building Effective Agents" paper (the real source for 5 of this platform's pattern names — prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer). Full research citations: see the design conversation transcript, `S-AI35-REGISTRY-design`, 2026-07-21.

**The core problem with the prior model:** it tangled three separate concerns — *what really happened* (a fact), *how we prove it* (a detection method), and *what we call it* (a name from the literature) — into one flat catalog plus one hardcoded write-time function. Each of those three has a different lifecycle (real behavior changes only when the model changes; detection quality improves independently; industry terminology shifts independently again), and tangling them is exactly why a rename or a newly-observed behavior felt expensive. The rewrite separates them into three layers.

### Layer A — Call Facts (write-time, generic, no pattern names)

Every call captures real, structural, checkable facts about what happened — independent of whether any pattern currently has a name for it:
- `tool_calls[]` — real name/arguments/result per tool invocation, not a boolean
- `retrieved_chunk_ids[]` — real ids if retrieval happened, not just a `rag_retrieved` boolean
- `sub_calls_chained[]` — which other calls this one's output fed into, or was fed by
- `input_references_other_deliverable` — did this call's input structurally embed another capability's real prior output
- `gated_subroutine_fired[]` — which internal gates actually executed (e.g. the REFLECT sub-call)
- `self_reported_claims` — whatever structured fields the model's own output declared (e.g. a case/reasoning-entry id) — captured, never trusted alone
- **`retrieval_method` per context fetch — added 2026-07-23 (`design-log-23-0723`), John's explicit call.** Record *how* context was obtained, not just that it was: retrieved by similarity/embedding search vs. fetched by direct lookup (and any future mechanism on its own terms). A single "context was fetched" boolean is not a Layer A fact — it collapses two different mechanisms into one signal, and a Layer B rule reading it cannot be honest no matter how it is written. **Live proof this is not hypothetical:** `ai-enrichment.js`'s `rag_retrieved` is exactly that collapsed boolean, and Michelle Manning — Project Manager's `source: "roster"` profile resolves to `getRosterCandidates()` → a plain full-table read with no embedding anywhere — yet trips the flag, so 1,199 of her routing calls are permanently tagged `rag`. See `LOG-42`. Note the consequence for Layer B's own worked example above: `RAG = retrieved_chunk_ids.length > 0` inherits this bug as written, since a lookup also produces "chunks" — the rule must key on the retrieval method, not on chunk presence.

None of this requires knowing a pattern name in advance. This is what makes a genuinely new model behavior show up automatically once someone writes a Layer B rule for it, instead of requiring new capture code at every call site first.

### Layer B — Classification Rules (versioned, evaluated at read time, re-derivable without a backfill)

A pattern name is a *derived label* over Layer A facts, not something baked into the row at write time. Each rule: `pattern_slug`, `rule_version`, `evidence_tier` (the prior model's 4-bucket idea survives here, correctly reframed as *what kind of proof a rule is allowed to use* — mechanical fact / gated-behavior / self-report-then-verify / cross-call inference — not as a fixed list of 24 patterns each needing its own bespoke write-time check), and the actual condition over Layer A facts (e.g. RAG = `retrieved_chunk_ids.length > 0`; Reflection = `gated_subroutine_fired includes 'reflect'`; Case-Based Reasoning = `self_reported_claims.case_id exists AND that id is real in the_reasoning`).

Because classification happens at read time from immutable Layer A facts (the same principle `AA-181` already proved out for `cost_usd`), a rule can be corrected or a pattern renamed by editing the rule once — every past and future row re-derives correctly, with no migration. This directly answers governance questions (4) and (5) above: a rename is a one-line rule edit, and a new pattern is a new rule evaluated against facts already being captured, not new instrumentation.

**Who names a hop — decided 2026-07-23 (`design-log-23-0723`), John's explicit call. Resolves `LOG-26`.**

A pattern name on an individual hop is assigned by a **Layer B rule**, never by an agent asked to judge the hop and never by the model naming its own pattern. The distinctions that matter are structural facts, not interpretations — Request Routing vs. orchestration is exactly `willResolveFinal` (`api/capabilities/execute.js`), i.e. whether the delegating agent synthesized the result or the target's output became final. Reading a model's reasoning text to infer that would be less reliable than reading the fact directly, and would cost a real LLM call per hop for a display label.

The model's own reasoning is not discarded — it displays **alongside** the rule-derived name (already carried on the `delegation` event as `reasoning` and already rendered). The name is earned from verifiable evidence; the reasoning explains it in the agent's own words.

Susan Smith — Trainer's role is unchanged and remains Layer C only: she governs which names are allowed to exist. She is never invoked to classify an individual hop.

*Note this only holds because Layer B computes names at read time — nothing writes a pattern name into the log row. That is what makes a rename free (edit the entry, every past and future row re-derives) and it is precisely what today's write-time stamping does not allow; see `LOG-42` for a live case of a wrong name frozen into 1,199 rows.*

### Layer C — Pattern Vocabulary (citation-governed, answers questions (1)-(3) above)

- `pattern_slug`, `name`, `description`
- `citation` — **required, no exceptions.** Every entry must point to its real published source (a paper, Anthropic's own documentation). An entry without one may not exist.
- `maturity_status` (experimental / stable / roadmap — mirrors OTel's own maturity levels for its GenAI conventions)
- `last_reviewed_date`
- `superseded_by` — nullable forward-pointer for a renamed/retired entry, so historical logged data never silently loses meaning (same "historical data is honestly labeled, never silently corrected" principle the prior model already established below)
- `linked_rule_version` — which Layer B rule, if any, currently detects it. A pattern may legitimately exist here with no rule yet — that's "known but not yet wired," never "doesn't exist," same non-fabrication guarantee the prior model held.

**Schema location, decided this session:** `ai_activity_log` (Layer A) needs new columns/fields for the facts above — no change to its being the one central table. `PATTERN_CATALOG`'s governance fields (citation, maturity, review date) move out of the static `shared/ai-patterns.js` file into a real Supabase table — this metadata is operational and needs editing without a code deploy, the same reasoning already applied to `dev_version_counter`/`feature_id_counter` in this exact codebase. `SERVICE_CATALOG` is unaffected. Layer B's rule *evaluator* is code; whether individual simple rules are data-driven or stay as one-function-per-pattern code is an implementation decision for whichever session builds Layer B, not decided here.

**Governance requirement carried over from the prior model, tightened:** existing `PATTERN_CATALOG` entries were never uniformly checked against this citation requirement — some predate the "verify the real term first" discipline even existing as a written rule. All current entries must be re-verified against real sources under this new schema before the model is considered complete, not grandfathered in. `LOG-28`'s open question (whether Memory Consolidation is a real generic pattern or Elena's own capability-specific mechanism) is the first concrete case this audit must resolve — not a parallel question.

**Historical data cannot be retroactively corrected** — this principle from the prior model is unchanged and still governs Layer A/B: nothing recorded pre-rewrite can be assumed true or false after the fact. Pre-existing rows keep their original frozen classification, labeled honestly, forever; only rows logged after the new model ships get the versioned, re-derivable treatment.

**Amendment — human-authorized anomaly correction [added 2026-07-23, John's explicit ruling, `design-log-37-0723`]**

The "historical data cannot be retroactively corrected" principle above stands as the **default**, not an absolute bar.

**The exception:** a specific, identified anomaly that John and a session have reviewed together and reached alignment on may be corrected — when John explicitly authorizes that correction. Authorization is **per-anomaly and belongs to John alone**. No session may correct historical data on its own judgment, however confident, and reaching alignment is not itself authorization.

**Why the default has an exception at all.** The original principle rests on an epistemic claim: we cannot know after the fact what a historical row really did, so relabelling it would be fabrication. That reasoning is sound where it applies — but it is not universal, and `LOG-37` produced the counter-example. Row `id=19175` (2026-07-23) carries `patterns_used: [… 'rag']` alongside `call_facts: {retrieval_method: 'direct-lookup'}` with zero retrieved chunk ids. That row does not merely look doubtful — it is **mechanically self-contradicting**. Where Layer A facts prove a stored label false, "we cannot know" is no longer true, and freezing a known-false label is not honesty; it is preserving a known error.

**What this does not license:**
- It does **not** weaken the corollary below — no reconciliation table, alias column, or permanent old→new mapping artifact, ever, for any reason.
- It does **not** cover rows that are merely *uncertain* or *named differently today*. **Provable falsity is the bar**, not preference.
- It does **not** authorize a blanket sweep. Each anomaly is its own reviewed, authorized decision.
- Where a row's original meaning is genuinely unrecoverable — `LOG-46`'s `tool-use` conflated two mechanisms and recorded neither — no authorization helps. That data is gone. The honest treatment stays exclusion at read time (`LOG-16`'s `isPatternTrusted()` precedent), never invention.

**Corollary, locked 2026-07-22 (live design conversation, John, `design-ai-35-2b-0721` — a mistake that had already recurred across multiple prior sessions before being caught and written down here):** never build a reconciliation table, alias column, or any other artifact whose job is to map an old/legacy identifier forward to its current Layer C entry. Any such mapping is itself a second thing that must be kept in sync with Layer C — exactly the class of problem this three-layer model exists to eliminate. The correct behavior is always: read Layer A/log data as it currently exists, read Layer C as it currently exists, join them live, and let anything with no current match fall into the existing generic "not yet catalogued" fallback (already built, `useAIActivity.js`) — the same honest treatment as any other unclassified row, no special-casing, no permanent bridge-building between what a pattern used to be called and what it's called now.

**Extension — provable-fact backfill via intent-provability [added 2026-07-24, John's explicit ruling, `design-log-42-0724`]**

The amendment above sanctions correcting a *stored label* where Layer A facts contradict it. This extension adds a **more conservative** remediation that leaves the label untouched, plus a second route to the "mechanically determinable" bar.

**Second route to the bar — intent-provability.** The amendment proves falsity from a row's own `call_facts`, but `call_facts` is null on ~99% of historical rows. A pattern is *also* mechanically determinable when the row's **intent** (in `feature`) **structurally pins a single technique** — evidenced by that intent's realized pattern-set being uniform across runs (`agent-selection-intent` → always the routing signature; contrast task intents like `ci-answer-intent`, whose pattern varies run-to-run). Because intent is present on nearly every row, this route reaches history that `call_facts` cannot.

**Remediation — backfill the fact, never the label.** Where a historical anomaly is provable by either route, the sanctioned fix is to **backfill the provable Layer A fact** (e.g. `call_facts.retrieval_method: "direct-lookup"`), leaving `patterns_used` frozen as the honest legacy record. Layer B then re-derives the pattern correctly at read time, uniformly with every other row. This is preferred over the amendment's label-correction: it adds ground truth rather than overwriting a classification, and needs no display special-casing.

**Bounds.** Backfill only mechanically-determinable facts — never inferred, never fabricated (e.g. never synthesize `retrieved_chunk_ids` for a lost retrieval). Task-intent history whose facts are genuinely unrecoverable stays unresolved — honest read-time fallback, never invention. Per-anomaly, John-authorized, as the amendment requires.

**The sorting test for any anomaly.** Does the intent provably pin the pattern? Yes → structural, backfillable now. No → task, awaits forward facts + Layer B; not recoverable on history.

**Deliberated exceptions [John, 2026-07-24].** The mechanically-determinable bar is the **default, not an absolute**. Specific anomalies will warrant backfilling a fact that is *not* strictly provable. Allowed only under a **higher** gate, never a lower one: the reasoning for that row-class is written down, John and the session reason it through and explicitly find it safe, and John authorizes it per-anomaly. Two hard conditions: (1) **preference is never sufficient** — the documented safety finding is the gate; (2) **provenance is marked** — any non-provable backfill records how it was justified (`proven` vs `authorized-by-judgment`), so the fact layer stays honestly distinguishable and a judgment call is never later read as an observed fact.

### Layer C — Self-Maintenance Mechanism [added 2026-07-21, `design-ai-35-0721`]

The schema above defines what a governed vocabulary entry looks like, but not how it stays current — this closes that gap. Answers the same governance questions (1)-(3) on an ongoing basis, not just for the one-time launch audit.

- **Trigger:** at read time, when Layer B evaluates a row's Layer A facts and no existing rule's condition matches, despite the row carrying non-trivial facts (real tool calls, retrieved chunks, self-reported claims, etc.) — that mismatch is the "new pattern recognized" event. An empty-facts row (nothing happened) is not a trigger; a rich-facts row nothing currently classifies is. **Sequencing note, confirmed 2026-07-21 (`design-ai-35-0721`):** this trigger structurally cannot exist before Layer A's rich fact capture (Step 3) and Layer B's rule evaluator (Step 4) both exist — today's write path only captures a handful of booleans, not the rich fact set this trigger condition depends on. The staging log and Susan's promotion mechanism (below) are fully buildable and independently testable now (fed by direct/manual candidate entries, e.g. the Step 2b citation audit); the live automatic per-call trigger is wired in as part of Step 4, the earliest point the "no rule matches" condition is actually computable.
- **Staging, not direct write:** the trigger appends a row to a new candidate log (proposed table: `pattern_candidates` — exact schema is an implementation decision for whichever session builds this) describing what was observed. It never writes directly into the governed Layer C vocabulary table. Append-only means concurrent triggers from different agents/calls cannot collide with each other, unlike a shared counter or a shared row update.
- **Real-time, async, never blocking:** the trigger fires immediately on detection, not on a batch/scheduled scan. It never blocks the originating call's user-facing response — the user gets their answer first; candidate logging and everything downstream of it happens after, off the critical path.
- **Single owner for promotion:** Susan Smith (Trainer Agent, `src/data/agents.js`) is the sole agent responsible for reading `pattern_candidates` and promoting entries into the governed vocabulary. She is invoked live, as a real agent capability call through the normal harness path (logged like any other agent turn, per Rule #1 — no hardcoded backend script does this instead of an agent reasoning about it), each time a candidate needs evaluating. Single ownership exists specifically to avoid the write-collision class this codebase has already hit twice at the data layer (`dev_version_counter`'s `AZ-19`/`S-MOBILE-ROSTER-01` collision, `feature_id_counter`'s `AA-197`/`AA-198` and `CHI-13`/`CHI-14` collisions) — here applied to the vocabulary table instead of a counter.
- **Her judgment covers two kinds of matching, not one:** (a) against the already-governed vocabulary — is this candidate already known under a different description, in which case she does not create a duplicate; and (b) against other still-pending candidates — if two different calls (e.g. two different agents, or the same agent twice) produced candidates describing the same underlying new behavior, she recognizes and promotes it once, not once per candidate. Only a genuinely new, unmatched candidate gets researched fresh (real citation required, same non-fabrication rule as the base schema) and promoted.
- **Independent of `AA-88`:** Susan has a separate, not-yet-built queued task (`AA-88`, personnel-file-write broker) that this does not depend on — different resource, can be built and shipped on its own.

**Full detail and the ordered build sequence** (doc rewrite → vocabulary schema + self-maintenance mechanism → citation audit run through that mechanism → Layer A capture → Layer B classifier → migration cutover → rollup views): see `AI-35` in `docs/FEATURES.md`, restructured 2026-07-21 to carry this scope.

---

### Archived — Four-Source Trust Model [superseded 2026-07-21 by the Three-Layer Model above — kept for history, not current]

<details>
<summary>Prior model (2026-07-16 – 2026-07-21)</summary>

**Origin.** John live-tested the MI screen, noticed the Agent Routing drawer had stopped showing pattern info for some events, and traced the underlying question further than the display bug: *how does a pattern ever get into `ai_activity_log.patterns_used` in the first place, and can that mechanism lie?* Read live in `request-receivable.js`'s `sendRequest()`: `patterns_used` spread a Supabase-declared field (`intent_technical_services`, set once on an Intent Skill Profile) into **every call** of that intent, unconditionally — no runtime check that the specific call actually exercised the pattern. This section closed that gap by requiring a pattern be logged only from one of four legitimate sources: (1) **Mechanical** — computed directly from the call's own real shape (`structured-output`, `tool-use`, `prompt-chaining`, `guardrails`, `agent-delegation`, `rag`). (2) **Declared-and-triggers-real-behavior** — legitimate only where the declaration causes the behavior to run (REFLECT, Prompt Compression). (3) **Self-reported by the model.** (4) **Deterministically inferred/verified by the harness.** Write side lived in `buildPatternsUsed(isJson, guardrailsRan, delegationOccurred, ragRetrieved)` (`request-receivable.js`); read-side trust boundary in `useAIActivity.js`'s `computeByPattern()`/`isPatternTrusted()`. This model's real limitation, surfaced by the governance questions above: pattern names were written once at write time and frozen forever, with no path to correct a classification or add a new pattern without new per-call-site code — exactly what the Three-Layer Model above replaces.

</details>

---

## 19j. Deliberately-Empty Findings — "I checked and found nothing" [discovery `design-chi-65-0723`, 2026-07-23 — NOT LOCKED, two open questions below]

**Origin.** `CHI-65` — selecting a candidate theory on Channel Intelligence crashed the entire page with React error #31 ("Objects are not valid as a React child (found: object with keys `{text, citations}`)"). Root-caused this session; the crash turned out to be a symptom of a contract gap, not a render bug on its own.

### The gap

Priya Nair — Forecast/Theory/Performance Expert — returns a hypothesis test as three sections (`supports`, `complicates`, `consider`), each shaped `{text, citations}` (`hyp-hypothesis-test-intent`'s `traits.schema`). Alex Reeves — Screen Controls Editor — then renders them into the Column 2 card via `intelligence-review-format` (on the `screen-controls` Capability), whose schema repeats the same shape. **What the screen displays is Alex's output, not Priya's** — worth stating, because the reverse was assumed for most of this session before it was checked.

`complicates.text` is typed `["string","null"]` in **both** schemas, and `intelligence-review-format`'s own guardrail (*"complicates.citations may be empty only if complicates.text is null"*) treats null as a valid state. So:

> **A deliberate "I checked and found nothing" and an accidentally-dropped field arrive as the identical value.** Nothing in the contract, the validator, or the guardrails can tell them apart — and neither can a human reading the card.

Nothing catches it downstream either. `parseModelTurn()` (`request-receivable.js`) validates **only that top-level required keys are present** — `required.filter(key => !(key in input))`. It does not check types, does not recurse into nested objects, and does not reject null. The `stop_reason` truncation signal `HAR-9` added is only consulted when a required key is *missing*, so it never fires here. Tracked as `HAR-14`.

### Decided

- ~~**The section is always shown, never hidden.**~~ **Withdrawn 2026-07-23 by John, later the same session** — see "The screen holds no content policy" below. The screen shows what the agent filled and nothing else; a section the agent never filled simply isn't there.
- **The sentence is authored by the agent, not the screen.** Platform code must never write "no complicating factors found" — that is the platform putting words in an agent's mouth. Wording varying run to run is accepted and expected (John, 2026-07-23). **This is the load-bearing decision of this whole section** — every other conclusion here follows from it, including the withdrawal above.
- **It must be the content specialist who says it, not the display agent.** Only the agent that performed the analysis knows whether it actually looked. A display agent asserting "nothing was found" is asserting something it has no way to verify. This is also why it does not violate `intelligence-review-format`'s own *"never introduces a claim the content specialist did not already make"* rule — the display agent renders the statement, it does not originate it.
- **Once a deliberate empty is always written out, the ambiguity dissolves by construction:** text present means considered, text absent means something broke. They stop being the same value.

### Open — not decided, do not build against either

1. ~~**Who reviews the analysis before it reaches the screen?**~~ **Sequenced 2026-07-23, John's explicit call: ship the instruction first, decide a reviewer on real evidence afterward — do not add one on speculation.** See "Why a reviewer is second, not first" below. The two candidate shapes are recorded here so a future session doesn't re-derive them, **neither chosen**: (a) Alex Reeves — Screen Controls Editor — gains `can_request_help` and pushes back when a card isn't fit to show — costs a turn only when something is wrong, but **requires amending §19d's LOCKED line that a `delegation_required` formatter's hand-off is *always* terminal** ("a Format Skill hand-off never changes the facts... there is no legitimate case where the delegator needs another turn"); that supersession is John's call, not a session's. (b) Owen Marsh — The Proofreader — gains a second Intent Skill on his existing `quality-gate` Capability, scoped to theory review — does not touch §19d, but costs an agent turn on *every* theory test. Note `qg-review-intent` is **not reusable as-is** for either: its schema returns `{answer, citations, confidence_tier}` and its five guardrail rules are Q&A-specific, so pointing it at a hypothesis test would mean rewriting the one Skill Marcus's answers depend on. Also note the hypothesis-test chain has **no review step at all** today (`INTENT_CHAINS.hypothesis_test`), where the Q&A chain runs Marcus → Owen Marsh — The Proofreader → display; that asymmetry is real regardless of which shape is eventually picked.
2. ~~**What the screen does when a section is still unusable after all of the above.**~~ **Decided 2026-07-23 (John) — and the question itself was the wrong one.** The screen does nothing about it: it renders what it was given and never authors content. See "The screen holds no content policy" below.

### The screen holds no content policy [decided 2026-07-23 — supersedes this session's own earlier fallback proposal]

**John, 2026-07-23, overturning a decision this session had already talked him into:** *"why is the screen forcing content? Why are we not just displaying whatever the agent provides? If we want better or enforce content we should do it at the agent level — remember the whole premise of this platform is to remove hardcoding."*

**This session had reached the opposite answer and was wrong.** It proposed the screen render a fallback line (`No input at this time`) whenever a section came back empty, defended as "a fault report, not a finding." That defence was a rationalization: it is still platform code writing a sentence into a card where an agent's words belong. Showing a section the agent never filled is the same error one step further — the screen asserting a section exists when the agent said nothing about it. **Both are recorded here as ruled out, with the reasoning, so a future session doesn't rediscover the same appealing shortcut.** The earlier "always show the section, never hide it" decision falls with them: its rationale (a missing section reads as an oversight) is an argument for making the agent reliable, not for the screen faking reliability the agent didn't deliver.

**The settled division:**

- **Agent level — the guarantee.** The content specialist fills every section. If she has nothing for one, she says so *in her own words* ("no conclusions found for this section," however she phrases it). Enforcement of that belongs to agent mechanisms — the Skill instruction now, an agent guardrail later — never to screen code.
- **Screen level — no content decisions at all.** Render what came back. A value that isn't usable text renders nothing. The screen never invents a line, never labels a gap, never decides a section exists.
- **The one thing that is not a content decision, and stays:** the screen must not hand React an object where a string goes. That is a type error, the same class as passing a number where a date is expected — it decides nothing about what is shown, it only stops the page from dying (`CHI-65`). Everything visible still comes from the agent.

**Accepted gap, John's explicit call:** if the content specialist forgets, the section is simply absent and the user gets no explanation. That is knowingly accepted for now and caught later by an agent guardrail (§19j question 1), not by screen code. `LOG-54` is what will say how often it actually happens.

**What this rule does *not* cover: the platform reporting its own failure [added 2026-07-23, `design-chi-66-0723`].** This section bans the screen writing about *the analysis* — labelling a gap, asserting nothing was found, deciding a section exists. It does **not** ban platform code stating that the platform broke. Those are different jobs and only the first one puts words in an agent's mouth.

That distinction is load-bearing, and it was nearly lost: `CHI-66`'s design session first read this section strictly enough to conclude a crashed drawer must render *nothing at all*, silently. John pushed back on the resulting behaviour and the stricter reading turned out to be wrong on its own terms — a crash notice describes the platform's own state, not Priya Nair's — Forecast/Theory/Performance Expert — findings. The precedent was already shipped and already uncontroversial: `MarketIntelligenceScreen.jsx` has carried five `kind: "error"` chat bubbles for months ("Something went wrong reaching Marcus — try again."), and nobody has ever read those as the screen authoring agent content.

**The test to apply:** does the sentence make a claim about what an agent did, found, or should have returned? If yes, it is content and this section forbids it. If it only says the platform failed, it is a fault report and is allowed. "No complicating factors were found" is forbidden. "Something went wrong displaying this" is not.

**Why staying silent was actively worse, not just unnecessary.** A silently-blank drawer is indistinguishable from a section the agent legitimately left empty — which is *the exact ambiguity this whole section exists to eliminate*, recreated one layer down. And it is recoverable ambiguity: when a drawer crashes the data is intact and merely unrenderable, so a fresh call usually renders fine. Silence withholds the one fact that makes it recoverable. `CHI-66` shipped "Something went wrong displaying this — ask your latest question in chat again." on this reasoning.

**The corollary that survives unchanged:** the fallback still carries no retry control, because re-rendering the same unrenderable data re-crashes deterministically. Not crashing, and not lying about why, are both the screen's job. Authoring the agent's content is not.

**Handoff unchanged.** The content specialist still sends her content to the display agent, who fills the drawer exactly as he does for every other control on that screen. Nothing in this decision changes the existing chain — it only removes the screen-authored copy this session had proposed adding to it.

**Why the earlier rejection doesn't apply here.** A hardcoded line was proposed and rejected earlier in this same session, correctly: at that point it would have *replaced* the agent stating her own finding. Once the always-state-it instruction ships, she is supposed to have spoken — so the fallback is no longer a substitute for content, it is a report that content is missing. Different job, and the rejection does not carry over.

### Scope for the next (coding) session

Three things ship together, and the third is not optional:

1. **The instruction** — `hyp-hypothesis-test-intent`: fill every section; if you have nothing for one, say so in your own words. Mirrored on `intelligence-review-format` so the display agent carries her statement through rather than inventing one of his own.
2. **The crash guard only** — `MarketIntelligenceScreen.jsx` L2106-2108: never hand React an object. A value that isn't usable text renders nothing. **No fallback copy, no placeholder, no forced heading** — see "The screen holds no content policy" above; this is the constraint most likely to be quietly re-broken by someone trying to be helpful.
3. **`intelligence-review-format`'s guardrail must be reworded in the same session.** It currently reads *"complicates.citations may be empty only if complicates.text is null"* — the moment the instruction requires text always, that line contradicts it. This is not part of the deferred reviewer question; leaving it would ship a Skill that argues with itself.

   *Worth knowing while rewording it: that guardrail is already being violated in live data with nothing catching it.* Completed hop `baa64ec7` (2026-07-08) carries a full-paragraph `complicates.text` alongside `citations: []` — the exact combination the rule forbids — and the result was stored and rendered normally. So the rule is not enforced by any mechanism today; rewording it is necessary to remove the contradiction, but do not assume the reworded version will be obeyed either. Enforcement is §19j question 1's problem, not this line's.

`LOG-54`'s signal is *not* folded in here. It was proposed as a natural fourth on the reasoning that the crash guard must already detect the condition — but that reasoning only held while the screen was going to render something about it. With the screen holding no content policy, a detection hook exists solely to serve logging, which is `LOG-54`'s own scope to design, not a rider on this one.

### Why a reviewer is second, not first

**No reviewer can distinguish a deliberate empty from an accidental one today.** Owen Marsh — The Proofreader — and Alex Reeves — Screen Controls Editor — both see exactly what the screen sees: `{text: null}`. Neither holds information the screen lacks, so either would be guessing. A reviewer only becomes meaningful *after* the content specialist is required to always write something — at that point an empty section is unambiguous non-compliance, and there is finally a rule to check against. Adding a reviewer before the instruction exists buys nothing and costs a turn.

**And there is currently no evidence about how often this happens.** Queried live 2026-07-23: `durable_hops` holds only four *completed* `hyp-hypothesis-test-display-intent` rows in the platform's history (latest 2026-07-08), none with an empty section — rows are only written when a call checkpoints, so most calls leave no row at all. `ai_activity_log` stores metrics only, never payload content. The single observed occurrence is `CHI-65`'s own crash.

**That is itself a gap, not just a fact — tracked as `LOG-54`.** "Decide on real evidence" is only executable if the evidence gets collected; today nothing anywhere records that a section came back empty. `LOG-54` must land before question 1 can be answered on data rather than on another single anecdote.

**Whichever shape (1) takes, it must pass §19d's sniff test.** A deterministic "if `text` is null, push back" is a hardcoded reflex — the same shape as the "always seek backup" trait already rejected there. It only passes if the reviewing agent judges *this particular* output unfit and states why in a logged reason.

---

## 19k. AI Pattern Tracking — The Runtime Signature Model [discovery `design-log-38-0724`, 2026-07-24]

**Extends `§19i` (LOCKED, not modified here).** This section is the concrete realization of `§19i`'s
Layer A/B/C model, decided in a live discovery with John. Full reasoning: `docs/harvests/LOG-38-signature-discovery-0724.md`.

**Three named services (John's naming — "Layer A/B/C means nothing and will be forgotten").** Each maps
to a `§19i` layer, and each has a *different* caller:

| Service | `§19i` layer | What it does | Who calls it |
|---|---|---|---|
| **Log Writer** | A | snapshots the structured **signature** into `ai_activity_log.call_facts` at write time | the **harness**, on every AI call (hot path — must be cheap, never block) |
| **Log Displayer** | B | derives the pattern **name** at read time by matching signature → gold criteria | the **frontend** (the 3 consumers), at render time — *not* the harness |
| **Pattern Definer** | C | Susan Smith — Trainer defines gold patterns (name + definition + citation + **criteria**) | the **agent path**, occasionally, when a new pattern needs naming (off critical path) |

### The signature

- A **signature** is the deterministic, **agent-agnostic** decode key for a single log row — the ordered
  set of elements that determine which pattern(s) it used. `agent_id` is **stripped** (that is what makes
  one signature match many rows). The only log column that seeds it is `ai_activity_log.feature` (the
  intent slug); everything else is derived from config.
- **Two zones:** a **config-half** (envelope — always derivable) and a **fact-half** (what happened —
  sparse; a null element drops out).
  - Config-half: `capability_skill_profiles.capability_slug` / `.skill_profile_slug`,
    `skill_profiles.traits` (`source` / `schema` / `intent_allowlist`), `execution_type`. **Skill types
    read: `knowledge`, `intent`, `format` only** — `identity` out (agent-ID, breaks agent-agnosticism),
    `behavior` out for now (no pattern-driving traits today).
  - Fact-half (from the Log Writer): `tool_calls`, `retrieved_chunk_ids`, `retrieval_method`,
    `gated_subroutine_fired` (built, `LOG-37`); `input_references_other_deliverable`, `sub_calls_chained`
    (+ `trace_id`), `self_reported_claims` (unbuilt, `LOG-49`).
- **`guardrails` is a per-skill *column*, not a skill type** (there are **5** skill types, not 6).
  Declared guardrails are on ~100% of skills → no signal; the Guardrails pattern is decoded from the
  **fact** `gated_subroutine_fired`.

### Storage — snapshot the values, derive the name

- The **signature raw values** are **snapshotted at write time** (frozen on the row) → the row never
  drifts. This *extends* `LOG-37`'s existing `call_facts` capture — one unified write-time capture, not a
  parallel mechanism (Log Writer).
- The **pattern name is derived at read time** and **never written into the log.** A pattern rename is a
  one-line edit to the gold row; every past and future row re-derives instantly (self-cleanse). Writing a
  name into the log is exactly the frozen-label defect this replaces (`patterns_used` / the false `rag`).
- **History:** rows predating the snapshot are **backfilled** with a signature computed from current
  config — for structural intents this is provable per `§19i`'s intent-provability, and freezing it also
  ends drift for those rows. The fact-half stays null on history (unrecoverable, `LOG-46`) so contingent
  patterns (RAG-augmented) correctly do not assert. **Provenance is date-based** (`created_at` vs the
  capture-start date), **no per-row flag.**

### The Log Displayer — a plain view, generic match, no per-pattern code

- The connector is a **plain Postgres view** (NOT materialized → live, self-cleansing, no refresh). It
  matches the log's signature against each gold pattern's **structured `criteria`** — one generic
  comparison for every pattern (`signature @> criteria` for equality/presence; a bounded operator set for
  comparisons like `chunks > 0`). **Adding a pattern is a data insert (a gold row) — no CASE branch, no
  view edit, no deploy.**
- The view **never runs AI.** The semantic judgment ("this behavior is Request Routing") happens **once**,
  when the Pattern Definer defines the pattern; the view replays that frozen judgment cheaply, per row.
  Semantics at definition time, equality at query time.
- **Unclassifiable rows fall out** via `LEFT JOIN` (a **rich** signature matching nothing — an empty one is
  expected, not a signal). That is a standing diagnostic pointing at one of three causes: the signature
  (capture bug), the pattern inventory (a new pattern → Pattern Definer), or the criteria (too narrow).
- **Scale:** aggregate by **distinct signature** (~dozens, bounded by ~29 intents), never per-row; compute
  in the DB (`GROUP BY`). No stored summary — the summary *is* the live aggregate.
- **Returns** a *set* of pattern objects per row — `slug`, `name` + `definition`/`citation` (gold), `role`
  (`primary` = the `intent` pattern / `supporting`), `evidence` (which element fired the match). Three
  honest states: governed match / matched-but-uncatalogued (`humanizeSlug`) / not-yet-classified.

### Self-maintenance trigger

An unclassified rich signature → a `pattern_candidates` row stamped with the triggering
`ai_activity_log.id` (`source_ai_activity_log_id`) → Susan Smith — Trainer is invoked to name it. This is
what populates `source_ai_activity_log_id` for new candidates going forward (`§19i` Layer C
self-maintenance; the existing 26 stay null, never backfilled).

### What this eliminates

Hardcoded pattern-naming, wherever it lived: the static `PATTERN_CATALOG`, write-time
`buildPatternsUsed()`/`patterns_used`, per-pattern CASE logic, and the hand-maintained `SERVICE_LABEL`
dictionaries. Every "what pattern is this" call reads the one view; every *pattern* is data. The generic
matcher is the only code, written once, hardcoding no pattern. Legacy code is retired at cutover
(`LOG-40`), not instantly.

### Build breakdown (each its own kickoff-gated coding session; run in parallel where deps allow)

POC first (de-risk before the build): **`LOG-64`** (prove signature→pattern join, hand-built signatures,
one case) → **`LOG-65`** (run every anomaly `LOG-42`/`53`/`59` through it; requirements-missed gate).
Then: **`LOG-66`** (Pattern Definer — add `criteria` column + extend Susan's flow), **`LOG-67`** (Log
Writer config-snapshot capture), **`LOG-68`** (self-maintenance trigger + `source_ai_activity_log_id`),
**`LOG-69`** (historic backfill), **`LOG-38`** (the Displayer view itself), **`LOG-70`** (rewire the 6
consumers), **`LOG-49`** (remaining facts), **`LOG-40`** (cutover), **`LOG-41`** (rollups).

### Signature field order [locked `design-log-64-0724` (LOG-64 POC), 2026-07-24]

The discovery deliberately left exact element positions open; the LOG-64 POC forced and fixed them.
**Ranking principle: intrinsic telling-ness under *full attribution*** — "if this field is present, how much
does it collapse the pattern space?" — **not** telling × coverage. A null field drops out of the signature
entirely, so coverage is already handled by removal; penalizing sparsity again in the stored order
double-counts the same absence. Under full attribution **facts are proof, config is only propensity → facts
rank above config**, below the `intent` anchor:

1. `intent` (anchor) · 2. `retrieval_method` · 3. `tool_calls` · 4. `gated_subroutine_fired` ·
5. `sub_calls_chained` · 6. `retrieved_chunk_ids` (count) · 7. `assembled_skill_slugs` (k→i→f) ·
8. `capability_slug` · 9. `traits.schema` · 10. `traits.source` ·
11. `input_references_other_deliverable` · 12. `self_reported_claims` · 13. `traits.intent_allowlist` ·
14. `execution_type` · 15. `trace_id` (plumbing, last).

Three caveats on the order (all locked with it): **(a)** the order is a diagnostic + canonical-aggregation-key
aid, **not the matcher** — `@>` is order-independent (proven empirically in the POC); get it directionally
right, do not over-perfect (no single order is optimal for every pattern). **(b)** "attributed fields move up"
requires the stored signature be an **ordered projection** (canonical, gaps-removed), not a bare `jsonb` object
(LOG-67). **(c)** facts-over-config holds for **contingent** patterns only; the **primary/structural** pattern
is provable from `intent` + config alone (history/backfill), which is why `intent` is #1 and
`assembled_skill_slugs` stays upper-middle. POC result + full reasoning: `docs/harvests/LOG-64-poc-signature-join-0724.md`.

### Locked constraints (also in `.claude/rules/ai-pattern-signature.md`)

1. The pattern **name is never written into the log** — derived at read time only.
2. The signature is **config + facts, agent-agnostic** (`agent_id` stripped); only `feature` seeds it.
3. Skill types in the signature: **`knowledge`, `intent`, `format` only.**
4. The Displayer view is a **plain view, never materialized.**
5. Pattern detection is **data (criteria on the gold pattern), not per-pattern code.**
6. **No AI in the per-row/query path** — semantics happen once at definition time (Pattern Definer).
7. Unclassifiable rows are surfaced (`LEFT JOIN`), never silently dropped; a **rich** unmatched signature
   is the review signal.

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
