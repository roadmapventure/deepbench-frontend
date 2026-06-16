# DeepBench — Platform Entity Registry
# Version: v5.2 | Created: 2026-06-16 | Session: S-DELIVER-DESIGN Part 3

> Canonical registry of all first-class entities in DeepBench.
> Each entity is defined independently. Dependencies and cardinalities are NOT locked here —
> they are designed in dedicated design sessions and noted as candidates only.
>
> Read alongside: ARCHITECTURE.md, CAPABILITIES.md, WORK-ORDER-MODEL.md,
>                 DELIVERABLE-MODEL.md, INTENT-MODEL.md, FORMAT-MODEL.md

---

## Core Principle

**Every entity is independent at definition time.**

No entity requires another to exist. Dependencies are optional enhancements — designed in during dedicated sessions. Absence degrades gracefully: missing Capabilities fall back to generic LLM (L1). Missing Agents flag a gap. Nothing breaks — everything operates at lower quality until enriched.

This is the same principle that governs agent profiles: an agent with no Capabilities still runs at L1. The platform grows one enhancement at a time.

---

## Universal Profile Structure

Every entity (except Method) shares the same profile tab pattern. This is the DeepBench Universal Profile — the same structural model applied consistently across all entities.

| Tab | Contents |
|-----|----------|
| **Profile** | Identity — name, slug, description, type, version, configurations |
| **Capabilities / Methods** | What powers this entity — the technical and skill layer |
| **Training** | What improves this entity over time — past Deliverables, knowledge entries, example outputs |
| **Playbook** | How this entity behaves — guardrails, SOPs, default behavior rules |
| **Performance** | How well this entity has done — approval rates, change request rates, latency, cost |
| **History** | What this entity has produced — past executions, past Deliverables, past Work Orders |

Each entity uses a subset of these tabs appropriate to its nature. The tab names may differ slightly per entity (e.g., Agent uses "Projects" instead of "History") but the pattern is the same.

---

## Shared Configuration / Property Set

All entities that carry a Level and can be assigned or priced share this property set:

| Property | Values | Description |
|----------|--------|-------------|
| **Level** | L1 General · L2 Trained · L3 Expert · L4 Proprietary | Quality depth — the result of grading |
| **Availability** | Public · Private | Who can access this entity |
| **Exclusivity** | Shared · Exclusive | How many agents or tenants share this |
| **Pricing** | Free · Priced ($/use) | Revenue model |
| **Trainability** | Trainable · Supervised · Locked | Whether this entity can be improved |
| **Type** | AI · Deterministic · Mixed | Execution type — determines badge and cost model |
| **Version** | integer | Evolves over time; past records reference pinned version |

**Entity-specific additions:** each entity carries additional properties beyond this set. See individual model docs for full property lists.

**What Capability adds:** LLM Provider, LLM Model, API Key Source, Confidence
**What Intent adds:** Default Format, Canned Configurations, Required Data Inputs, Gap Flag, Execution Pattern
**What Format adds:** Intent (parent), Output File Type, Data Variables Schema, Sections, Charts, Preview, Gap Flag
**What Service adds:** Intent (component), Format (component), MCP Tool Path, Marketplace Listing

---

## Entity 1 — Method

**What it is:** The technical implementation layer. How Capabilities and Deliverables execute. Never user-facing.

**Profile tabs:** Definition only — no user-facing profile.

**Examples:** RAG Query, LLM Call, Playwright Browser Automation, OpenAI Embeddings, Document Extraction, Flag Computation

**Candidate relationships (not locked):**
- Methods power Capabilities (one Method can power many Capabilities)
- Capabilities call Methods via the Service Adapter Layer

**Design session:** S-METHOD-01

---

## Entity 2 — Capability

**What it is:** A named, graded, shareable skill. The technical thing an agent is authorized to do at a specific Level.

**Profile tabs:** Profile · Methods · Agents · Intents · Formats · Performance · History

**Shared properties:** Level, Availability, Exclusivity, Pricing, Trainability, Type, Version
**Capability-specific:** LLM Provider, LLM Model, API Key Source, Confidence

**Examples:** NIGP Analysis, RAG Query, Document Extraction, Web Research, Task Planning, Presentation Design

**Candidate relationships (not locked):**
- Capabilities are assigned TO Agents (via agent_capability_assignments)
- Capabilities are assigned TO Intents (optional — what serves this Intent well)
- Capabilities are assigned TO Formats (optional — what produces this Format)
- Capabilities are powered BY Methods (via adapter layer)

**Design session:** S-CAP-01

---

## Entity 3 — Intent

**What it is:** The type of cognitive work being performed. First-class entity with profile, configurations, and assignments.

**Profile tabs:** Profile · Capabilities · Training · Playbook · History

**Shared properties:** Level, Availability, Exclusivity, Pricing, Trainability, Type, Version
**Intent-specific:** Default Format, Canned Configurations, Required Data Inputs, Gap Flag, Execution Pattern

**The 9 Intents:**
1. Research & Findings (`research-findings`)
2. Analysis & Report (`analysis-report`)
3. Extract & Summarize (`extract-summarize`)
4. Organize & Classify (`organize-classify`)
5. Draft a Document (`draft-document`)
6. Review & Feedback (`review-feedback`)
7. Take an Action (`take-action`)
8. Build & Publish (`build-publish`)
9. Monitor & Alert (`monitor-alert`) ← recurring/trigger-based, separate design session

**Candidate relationships (not locked):**
- Intents have many Formats (Format belongs to one Intent)
- Intents have optional Capability assignments
- Intents have optional Agent assignments
- Work Orders reference one or more Intents (via Deliverable specs)
- Services bundle one Intent + one Format

**Design session:** S-INTENT-01

---

## Entity 4 — Format

**What it is:** The output structure of a Deliverable. First-class entity scoped to one Intent.

**Profile tabs:** Profile · Schema · Capabilities · Templates · History

**Shared properties:** Level, Availability, Exclusivity, Pricing, Trainability, Type, Version
**Format-specific:** Intent (parent), Output File Type, Data Variables Schema, Sections, Charts, Preview, Gap Flag

**Three tiers:** Universal (PDF, Word, CSV) · Standard (Structured Report, Executive Brief) · Proprietary (NIGP Dashboard, Vendor Risk Matrix)

**Candidate relationships (not locked):**
- Format belongs to exactly one Intent (locked rule — not a candidate)
- Formats have optional Capability assignments
- Formats have optional Agent assignments
- Deliverables reference one Format
- Services bundle one Format + one Intent

**Design session:** S-FORMAT-01

---

## Entity 5 — Service

**What it is:** A packaged, named, priced, MCP-exposed offering. The product-facing layer. Bundles Intent + Format into a marketable unit.

**Profile tabs:** Profile · Intent · Format · Agents · Pricing · Performance · History

**Shared properties:** Level, Availability, Exclusivity, Pricing, Trainability, Type, Version
**Service-specific:** Intent (component), Format (component), MCP Tool Path, Marketplace Listing, Revenue Split

**Examples:**
- "NIGP Procurement Intelligence Report" = `analysis-report` Intent + `nigp-dashboard` Format
- "Vendor Concentration Risk Analysis" = `analysis-report` Intent + `structured-report` Format
- "Portal Research Report" = `research-findings` Intent + `research-summary` Format

**Candidate relationships (not locked):**
- Service references one Intent + one Format
- Services are assigned to Agents (who can deliver this Service)
- Services are exposed as MCP tools
- Services appear in the marketplace catalog

**Design session:** S-SERVICE-01

---

## Entity 6 — Work Order

**What it is:** The user's request mandate. The top-level unit of work. Replaces "Task" app-wide (see S-RENAME-01).

**Profile tabs:** Not a profile — a lifecycle record. Has status, history, Execution Plan.

**Key fields:** goal, purpose, audience, scope, context, deliverables[], status, parent_work_order_id

**Candidate relationships (not locked):**
- Work Order contains one or more Deliverable specs (minimum 1)
- Work Order may have a parent Work Order (stub — future decomposition)
- Work Order produces Deliverables (via step execution)
- Work Order is planned by Michelle (Planning Agent)

**Full model:** See WORK-ORDER-MODEL.md
**Design session:** S-WO-01

---

## Entity 7 — Deliverable

**What it is:** Both the requested output (spec inside Work Order) and the produced artifact (row in deliverables table). Same concept — two lifecycle stages.

**Profile tabs:** Not a profile — a lifecycle artifact. Has status, version, content, lineage.

**Key fields:** work_order_id, step_id, agent_id, capability_slug, type, format_slug, content jsonb, status, version_number, version_of, is_final, prerequisite_ids

**Candidate relationships (not locked):**
- Deliverable references one Work Order
- Deliverable references one Step (the step that produced it)
- Deliverable references one Agent (producer)
- Deliverable references one Capability (method of production)
- Deliverable references one Format (output structure)
- Deliverable may have prerequisite Deliverables (pipeline)
- Deliverable surfaces on Agent's Projects tab

**Full model:** See DELIVERABLE-MODEL.md
**Design session:** S-DELIVER-04 (first coding session — deliverables table + write wiring)

---

## Entity 8 — Agent

**What it is:** A named persona who performs work. Has identity, voice, avatar, role. Authorized for Capabilities, Intents, and Formats. The human-facing performer.

**Profile tabs:** Profile · Resume · Training · Playbook · Projects

**Candidate relationships (not locked):**
- Agents are assigned Capabilities (via agent_capability_assignments)
- Agents are assigned Intents (optional — authorized to perform this type of work)
- Agents are assigned Formats (optional — authorized to produce this output structure)
- Agents produce Deliverables (recorded in deliverables table)
- Agents receive training (knowledge_entries)
- Agents belong to the Roster

**Full model:** See ARCHITECTURE.md Section 2 (Agent Profile Model)
**Current roster:** Chloe (JR-01), Mike (SR-02), Bob (PR-04), Christy (MK-05), Robyn (CN-03), Brent (DR-06), Pat (IR-07), Michelle (PP-01), Susan (TR-08)

---

## Gap Flagging Mechanic

When Michelle builds an Execution Plan for a Work Order and finds an unserved Intent or Format:

```
1. No Capability assigned to Intent → generic LLM for Intent + gap_flag set on Intent
2. No Agent assigned to Intent → generic LLM for Intent + gap_flag set on Intent
3. No Capability assigned to Format → generic LLM for Format + gap_flag set on Format
4. No Agent assigned to Format → generic LLM for Format + gap_flag set on Format
5. Work Order executes at L1 — never fails, always degrades gracefully
6. Gaps accumulate in product_gaps (future table) → product intelligence signal
7. Product intelligence → informs session queue and capability roadmap
```

Real user demand defines what gets built next. The platform tells you what it needs.

---

## MCP Service Catalog

The 9 Intents are DeepBench's MCP service categories. Each Service (Intent + Format bundle) gets an MCP tool endpoint.

**MCP Resources (discovery):**
```
deepbench://intents/                     — list all Intents
deepbench://intents/{slug}               — Intent detail + canned configs + Formats
deepbench://intents/{slug}/formats       — Formats available for this Intent
deepbench://formats/{slug}               — Format schema (variables, sections, charts)
deepbench://agents/{id}/intents          — Intents this agent is authorized for
deepbench://agents/{id}/formats          — Formats this agent can produce
deepbench://work-orders/{id}             — Work Order status + Deliverables
deepbench://services/                    — all published Services in marketplace
```

**MCP Tools (invocation):**
```
deepbench/work-orders/create             — submit a Work Order
deepbench/work-orders/{id}/change-request — request a Deliverable revision
deepbench/intents/{slug}/invoke          — invoke an Intent directly
deepbench/services/{slug}/invoke         — invoke a packaged Service
```

---

## Terminology Rename Plan (S-RENAME-01)

Pre-requisite before any coding session that touches Work Order flows.

| Current term | New term | Scope |
|-------------|----------|-------|
| Task | Work Order | UI labels, DB table name, route params |
| Create a New Task | Create Work Order | Assign Work screen |
| Task Instructions | Execution Plan | Step detail screen |
| Assign Work (nav) | New Work Order | Nav + header CTA |
| task_id | work_order_id | All DB tables + API routes |
| tasks table | work_orders table | Supabase migration |
| Deliverables (Competency) | Removed | Agent Profile Model (see ARCHITECTURE.md Section 2) |

---

## New Feature Area Codes

| Code | Area | Status |
|------|------|--------|
| `WO` | Work Order | New — added this session |
| `IN` | Intent | New — added this session |
| `FM` | Format | New — added this session |
| `SV` | Service | New — added this session |

---

## Session Queue — New Sessions Added

| Session | Scope | Pre-requisite for |
|---------|-------|------------------|
| S-RENAME-01 | Terminology rename — Tasks → Work Orders app-wide | All WO coding sessions |
| S-WO-01 | Work Order full design + coding kickoff | S-DELIVER-04 |
| S-INTENT-01 | Intent entity full design + coding kickoff | S-WO-01 |
| S-FORMAT-01 | Format entity full design + coding kickoff | S-WO-01 |
| S-SERVICE-01 | Service entity — packaging, marketplace, MCP | S-INTENT-01 + S-FORMAT-01 |
| S-CAP-01 | Capability entity full design + coding kickoff | S-INFRA-01 |
| S-METHOD-01 | Method definition + adapter layer formalization | S-INFRA-01 |
| S-MONITOR-01 | Monitor & Alert intent — recurring execution pattern | S-INTENT-01 |
