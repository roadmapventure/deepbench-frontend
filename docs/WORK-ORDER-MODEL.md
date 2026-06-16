# DeepBench — Work Order Model
# Version: v5.2 | Created: 2026-06-16 | Session: S-DELIVER-DESIGN Part 3

> The Work Order is the user's request mandate — the top-level unit of work in DeepBench.
> It replaces the "Task" concept app-wide. See S-RENAME-01 for the full terminology rename session.
>
> Read alongside: DELIVERABLE-MODEL.md, INTENT-MODEL.md, FORMAT-MODEL.md, PLATFORM-ENTITIES.md

---

## Definition

A **Work Order** is the user's formal request to DeepBench. It defines what the user wants to achieve (goal, purpose), who it is for (audience), what it is scoped to, what Deliverables it should produce, and what context the agents need to execute it.

A Work Order is NOT a task list — it is a mandate. Michelle (PP-01, Planning Agent) reads the Work Order and produces the Execution Plan (the steps). The user approves the plan before execution begins.

---

## Pre-Requisite Session

> **S-RENAME-01 must run before any coding session that touches Work Order flows.**
> Current "Task" concept is renamed "Work Order" app-wide — DB schema, routes, UI labels, API contracts.
> See FEATURES.md WO-01 for the full rename scope.

---

## Core Structure

### Global Fields (apply to the entire Work Order)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Primary key |
| `tenant_id` | text | Yes | Multi-tenancy stub |
| `parent_work_order_id` | uuid | No | Stub for future — sub-Work Orders, decomposition |
| `title` | text | Yes | Short name — user-editable, Michelle suggests on first draft |
| `goal` | text | Yes | What we are trying to achieve — one or two sentences |
| `purpose` | text | No | Why — the end goal behind the goal |
| `audience` | text | No | Who receives the output — shapes tone and depth |
| `scope` | text | No | What is in and out — boundaries of the work |
| `context` | jsonb | No | Shared data, documents, prior deliverables available to all steps |
| `status` | text | Yes | Lifecycle state — see Status below |
| `created_at` | timestamptz | Yes | |
| `updated_at` | timestamptz | Yes | |

### Context Shape

```json
{
  "documents": ["Austin FY2025 CSV", "Prior contract draft"],
  "prior_deliverables": ["del-id-123", "del-id-456"],
  "prior_agent": "mike",
  "data": "Supabase tasks table — this tenant"
}
```

> Context is global — available to all steps in the Work Order. Per-Deliverable context overrides can be added in a future design session.

---

## Deliverables Array

A Work Order contains one or more Deliverable specifications. Each Deliverable names an Intent and a Format — what type of work to perform and what form the output takes.

**Rule:** Minimum 1 Deliverable. No maximum. Each additional Deliverable becomes additional steps in the Execution Plan.

### Deliverable Spec Fields (per entry in `deliverables[]`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Local identifier within this Work Order — `del-spec-01`, `del-spec-02`, etc. |
| `intent` | text | Yes | Intent slug — references Intent catalog |
| `format` | text | Yes | Format slug — references Format catalog (must belong to the named Intent) |
| `action` | text | No | Specific action to perform — only for action-type Intents (Take an Action, Build & Publish, Monitor & Alert) |
| `constraints` | object | No | Per-Deliverable rules — `must[]` and `must_not[]` arrays |
| `template` | text | No | Reference to a past approved Deliverable to use as a starting point |

### Constraints Shape (per Deliverable)

```json
{
  "must": [
    "Flag any vendor over 25% of total spend",
    "Include executive summary",
    "Include HHI analysis"
  ],
  "must_not": [
    "Do not include capital projects",
    "No technical jargon"
  ]
}
```

---

## Full Work Order JSON Shape

```json
{
  "id": "wo-uuid",
  "tenant_id": "global",
  "parent_work_order_id": null,
  "title": "Austin FY2025 Procurement Intelligence Package",
  "goal": "Produce a complete procurement intelligence package for FY2025 spend",
  "purpose": "Prepare the Procurement Director for the budget review board",
  "audience": "Procurement Director + City Council",
  "scope": "FY2025 only. Exclude capital projects.",
  "context": {
    "documents": ["Austin FY2025 CSV"],
    "prior_deliverables": [],
    "prior_agent": null,
    "data": null
  },
  "deliverables": [
    {
      "id": "del-spec-01",
      "intent": "research-findings",
      "format": "research-summary",
      "action": null,
      "constraints": {
        "must": ["Plain language", "Max 2 pages"],
        "must_not": ["No technical jargon"]
      },
      "template": null
    },
    {
      "id": "del-spec-02",
      "intent": "analysis-report",
      "format": "nigp-dashboard",
      "action": null,
      "constraints": {
        "must": ["Flag any vendor over 25%", "Include HHI analysis"],
        "must_not": ["Do not include capital projects"]
      },
      "template": "nigp-dashboard-approved-2025-03"
    },
    {
      "id": "del-spec-03",
      "intent": "draft-document",
      "format": "executive-brief",
      "action": null,
      "constraints": {
        "must": ["Executive summary first", "Recommendations section required"],
        "must_not": ["Max 5 pages", "No jargon"]
      },
      "template": null
    }
  ],
  "status": "draft",
  "created_at": "2026-06-16T00:00:00Z",
  "updated_at": "2026-06-16T00:00:00Z"
}
```

---

## Work Order Lifecycle States

| State | Description |
|-------|-------------|
| `draft` | Being configured — Intent + Format chosen, fields being filled out |
| `submitted` | Submitted to Michelle for planning |
| `planning` | Michelle is building the Execution Plan |
| `awaiting_approval` | User reviews Michelle's Execution Plan — approves or edits |
| `in_progress` | Steps are executing |
| `paused` | HITL gate — waiting for user input before execution resumes |
| `change_requested` | A Deliverable revision is in progress |
| `complete` | All Deliverables approved |
| `failed` | Execution error — step could not complete |
| `gap_flagged` | No Service, Capability, or Agent available for the requested Intent or Format — executed at L1 with generic LLM; gap surfaced as product intelligence |

---

## DB Table Target State

```sql
work_orders (
  id                    uuid primary key,
  tenant_id             text not null,
  parent_work_order_id  uuid,                    -- nullable stub for future
  title                 text,
  goal                  text,
  purpose               text,
  audience              text,
  scope                 text,
  context               jsonb default '{}',
  deliverables          jsonb default '[]',      -- array of Deliverable specs
  status                text default 'draft',
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
)
```

> Current `tasks` table maps to this structure. See S-RENAME-01 for migration plan.

---

## Michelle's Role

Michelle reads the Work Order on submission and produces the Execution Plan:

1. Reads `goal`, `purpose`, `audience`, `scope`, `context`
2. Reads `deliverables[]` — each Intent + Format pair
3. For each Deliverable spec:
   - Checks: is there a Service, Capability, and Agent available for this Intent?
   - Checks: is there a Service, Capability, and Agent available for this Format?
   - If yes → routes to best matched agent at highest available Level
   - If no → uses generic LLM (L1) + flags the gap
4. Sequences steps — respects `depends_on` between steps (stub field — not yet active)
5. If Work Order fields are sparse → drafts clarifying questions OR infers from goal
6. Presents Execution Plan to user for approval

---

## What This Replaces in the Current App

| Current | Replaced by | Notes |
|---------|-------------|-------|
| "Create a new Task" flow | Work Order creation flow | S-RENAME-01 |
| `tasks` table | `work_orders` table | Schema migration |
| `task.type` (hardcoded enum) | `deliverables[].intent` + `deliverables[].format` | Open, catalog-driven |
| Task goal field | `work_order.goal` + `work_order.purpose` | Split into two fields |
| HITL comment textarea | `work_order.deliverables[].constraints.must[]` | Structured, per-Deliverable |

---

## Open Design Questions (future sessions)

- Per-Deliverable context override (currently only global context)
- Work Order templates — save and reuse a Work Order configuration
- Recurring Work Orders — scheduled execution on a cadence
- Multi-user collaboration on a Work Order
- Work Order audit trail — human action log (separate from AI audit log)
- `depends_on` between steps — parallel execution design (stub field added to step, full design in S-WO-01)
