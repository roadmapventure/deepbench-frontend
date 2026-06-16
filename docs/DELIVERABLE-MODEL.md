# DeepBench — Deliverable Model
# Version: v5.2 | Created: 2026-06-16 | Session: S-DELIVER-DESIGN Part 3

> A Deliverable exists at two lifecycle stages: what the user requests (the spec inside a Work Order)
> and what the agent produces (the artifact in the deliverables table).
> Same concept — two stages.
>
> Read alongside: WORK-ORDER-MODEL.md, INTENT-MODEL.md, FORMAT-MODEL.md, CAPABILITIES.md

---

## Two Lifecycle Stages

### Stage 1 — Requested (the spec)

The Deliverable spec lives inside the Work Order's `deliverables[]` array. It names what the user wants:
- Which **Intent** (type of work)
- Which **Format** (type of output)
- Any **constraints** (must / must not)
- Any **template** (past approved Deliverable to start from)

This is the user's intent. It does not yet exist as an artifact.

### Stage 2 — Produced (the artifact)

When a step executes, it produces a Deliverable artifact — a row in the `deliverables` table. The artifact links back to:
- The Work Order that requested it
- The Deliverable spec within that Work Order (`work_order_deliverable_id`)
- The Step that produced it
- The Agent who produced it
- The Capability used

The produced Deliverable fulfills the requested Deliverable.

---

## Deliverable Types

Every Deliverable is typed. Types correspond to Intent + Format combinations and determine what content structure the `content` jsonb field contains.

| Type slug | Intent | Format tier | Badge |
|-----------|--------|-------------|-------|
| `research-summary` | Research & Findings | Standard | AI |
| `nigp-dashboard` | Analysis & Report | Proprietary | Mixed |
| `structured-report` | Analysis & Report | Standard | AI |
| `executive-brief` | Draft a Document | Standard | AI |
| `observation-log` | Take an Action | Standard | Mixed |
| `flags-report` | Analysis & Report | Proprietary | Deterministic |
| `dataset` | Take an Action / Research | Universal | Mixed |
| `plan` | (internal — Michelle's plan) | System | AI |

> This list grows as new Intents and Formats are registered. Type slug = Format slug in most cases.

---

## Versioning Model

Change requests produce new Deliverable rows — not in-place edits. Every revision is a new artifact.

```
v1 (original draft)         version_number: 1  version_of: null
  └── change requested
v2 (first revision)         version_number: 2  version_of: v1.id
  └── change requested
v3 (second revision)        version_number: 3  version_of: v1.id  ← always points to v1
  └── approved
```

`version_of` always points to the original (v1) — not to the prior version. This makes querying all versions of a Deliverable a single lookup. `version_number` preserves sequence.

---

## Status Transitions

```
draft
  └── (agent produces output) → draft
  └── (user approves) → approved
  └── (user requests revision) → change_requested
        └── (agent revises) → new row (v2) → draft
              └── (user approves) → approved
              └── (user requests revision again) → change_requested → new row (v3)
```

| Status | Meaning |
|--------|---------|
| `draft` | Produced — awaiting user review |
| `approved` | User accepted this Deliverable |
| `change_requested` | User requested revision — new version in progress |

---

## Pipeline — Intermediate vs Final

A Work Order Deliverable spec may require multiple steps to fulfill. Intermediate Deliverables are produced along the way; the final Deliverable is the terminal output for that spec.

```
Work Order Deliverable spec: "NIGP Dashboard" (analysis-report / nigp-dashboard)

Step 1 → Research & Analysis capability → produces intermediate Deliverable
            is_final: false
            step_id: step-01

Step 2 → NIGP Dashboard formatting     → consumes Step 1 output
            is_final: true
            step_id: step-02
            prerequisite_ids: ["del-intermediate-01"]
```

`prerequisite_ids` lists the Deliverable IDs that must exist before this Deliverable can be produced. This is the pipeline dependency chain.

---

## The Template Field

A past approved Deliverable can be used as a starting point for a new one. The user selects a template in the Work Order's Deliverable spec (`template` field). The executing agent receives the template content as context — it produces a new Deliverable informed by the template's structure and quality, not a copy of it.

Templates come from:
- The user's own past approved Deliverables
- Intent or Format "Training" — curated example outputs that serve as reference for new production
- Proprietary Format locked sections — the Format itself defines the template structure

---

## DB Table — `deliverables`

```sql
deliverables (
  -- Identity
  id                        uuid primary key,
  tenant_id                 text not null,

  -- Work Order linkage
  work_order_id             uuid not null,
  work_order_deliverable_id text,            -- which spec in the WO's deliverables[] this fulfills
  step_id                   uuid,            -- null if plan-level or final assembly

  -- Producer lineage
  agent_id                  text,            -- null for deterministic outputs
  capability_slug           text,            -- what capability produced this
  level                     int,             -- L1–L4 at execution time

  -- Type & Format
  type                      text not null,   -- type slug (see Type table above)
  intent                    text,            -- intent slug passthrough from Work Order
  format_slug               text,            -- format slug from Format catalog
  title                     text,

  -- Content
  content                   jsonb,           -- artifact — structure determined by format_slug

  -- Pipeline
  prerequisite_ids          jsonb,           -- deliverable IDs consumed to produce this
  is_final                  boolean default false,

  -- Status & Versioning
  status                    text default 'draft',   -- draft | approved | change_requested
  version_number            int default 1,
  version_of                uuid,            -- always points to original v1 (null on v1)

  -- Sharing & Marketplace (Phase 4)
  is_public                 boolean default false,
  share_token               text,
  price_usd                 numeric,

  -- Timestamps
  created_at                timestamptz default now(),
  approved_at               timestamptz
)
```

---

## Content JSONB Structure

Content structure varies by type. Every type shares a common envelope:

```json
{
  "meta": {
    "produced_by": "mike",
    "capability": "nigp-analysis",
    "level": 3,
    "model": "claude-sonnet-4-6",
    "latency_ms": 4200,
    "rag_hits": 7
  },
  "output": {
    // format-specific content
    // for nigp-dashboard: { overview: {}, categories: [], vendors: [], ... }
    // for structured-report: { sections: [{ title, content }] }
    // for observation-log: { actions: [], findings: [], pain_points: [] }
  }
}
```

---

## Feedback Loop

Every Deliverable is a signal:

| Human action | Signal | Feeds into |
|-------------|--------|-----------|
| Approve | Quality confirmed | Approval rate per agent per capability → AI-24 routing |
| Change request | Quality gap | Change request rate → routing penalty; revision → new Deliverable row |
| Use as template | Quality endorsed | Template usage rate → Intent/Format Training layer |
| Flag for training (DL-06) | Explicit quality signal | `knowledge_entries` → RAG improvement for that agent |

---

## Relationship to Agent Projects Tab

Every produced Deliverable (where `agent_id` is set) surfaces on that agent's Projects tab (PE-06). This is the agent's portfolio — what it has produced, at what level, for which Work Orders.

Approved Deliverables at L3+ become the most visible portfolio entries — the agent's best work.

---

## Open Design Questions (future sessions)

- `content` jsonb schema per format type — locked in S-FORMAT-01 per format
- Change request note field — where the user's revision instruction is stored
- DL-06 supervised training ingestion flow — how approved Deliverables enter knowledge_entries
- Deliverable sharing mechanics — signed URLs, preview vs full access tiers (DL-08)
- Deliverable marketplace — publish, price, sell (DL-09, Phase 4)
- Per-Deliverable context override from Work Order (currently global only)
