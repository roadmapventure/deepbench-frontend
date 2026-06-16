# DeepBench — Intent Model
# Version: v5.2 | Created: 2026-06-16 | Session: S-DELIVER-DESIGN Part 3

> An Intent is the type of work a Work Order requests. It is a first-class independent entity
> with its own profile, configurations, and assignments.
> The 9 Intents are DeepBench's MCP service categories.
>
> Read alongside: FORMAT-MODEL.md, WORK-ORDER-MODEL.md, PLATFORM-ENTITIES.md

---

## Definition

An **Intent** names the cognitive type of work being performed. It answers the question: *what kind of work is this?*

Intent is NOT a label. It is an independent entity with:
- Its own profile structure (mirrors Agent Personnel Profile)
- Its own shared property set (Level, Availability, Pricing, etc.)
- Its own configurations (canned starting points, guardrails)
- Optional assignments to Agents and Capabilities
- Its own training layer (past Deliverables as reference)

Intent is independent — it does not require a Capability or Agent to exist. If no Capability or Agent is assigned, it falls back to generic LLM (L1) and flags the gap.

---

## The 9 Intents

| Slug | Name | The user wants to... | MCP path |
|------|------|---------------------|----------|
| `research-findings` | Research & Findings | Find information that doesn't exist yet | `deepbench/research-findings/` |
| `analysis-report` | Analysis & Report | Interpret data they already have | `deepbench/analysis-report/` |
| `extract-summarize` | Extract & Summarize | Process existing content and distill it | `deepbench/extract-summarize/` |
| `organize-classify` | Organize & Classify | Impose structure on existing content | `deepbench/organize-classify/` |
| `draft-document` | Draft a Document | Create a new written artifact | `deepbench/draft-document/` |
| `review-feedback` | Review & Feedback | Evaluate something against a standard | `deepbench/review-feedback/` |
| `take-action` | Take an Action | Perform steps in a real system | `deepbench/take-action/` |
| `build-publish` | Build & Publish | Create something and send it into the world | `deepbench/build-publish/` |
| `monitor-alert` | Monitor & Alert | Watch something over time, flag changes | `deepbench/monitor-alert/` |

> **Monitor & Alert** is architecturally different — recurring, trigger-based, produces a stream of Deliverables over time. Requires a dedicated design session before building. All other Intents are one-shot execution.

---

## Intent Profile Structure

Every Intent has a profile — the same structural pattern as the Agent Personnel Profile:

| Profile Tab | Contents |
|-------------|----------|
| **Profile** | Name, description, slug, execution type, canned configurations, default Format |
| **Capabilities** | Which Capabilities are assigned to serve this Intent (optional — falls back to generic LLM if none) |
| **Training** | Past approved Deliverables used as reference outputs; example quality anchors |
| **Playbook** | Guardrails, standard operating procedures, default behavior rules for this Intent |
| **History** | Past Work Orders using this Intent; approval rates; change request rates; avg Level achieved |

---

## Shared Property Set

All three entities — Capability, Intent, Format — share this property set:

| Property | Values | Applies to Intent |
|----------|--------|------------------|
| **Level** | L1 General · L2 Trained · L3 Expert · L4 Proprietary | Yes — quality of execution |
| **Availability** | Public · Private | Yes — tenant-only or platform-wide |
| **Exclusivity** | Shared · Exclusive | Yes — any agent or restricted |
| **Pricing** | Free · Priced ($/use) | Yes — some Intents may be paid |
| **Trainability** | Trainable · Supervised · Locked | Yes — canned configs improvable or locked |
| **Type** | AI · Deterministic · Mixed | Yes — Organize & Classify may be deterministic |
| **Version** | integer | Yes — Intents evolve; past Work Orders reference pinned version |

---

## Intent-Specific Properties

| Property | Description |
|----------|-------------|
| **Default Format** | Suggested Format when the user doesn't specify one in the Work Order |
| **Canned Configurations** | Pre-built starting points for common use cases within this Intent — sharable across tenants |
| **Required Data Inputs** | What context or data this Intent typically needs to execute well (hints to user at Work Order creation) |
| **Gap Flag** | Boolean — true when no Capability or Agent is currently assigned; Michelle uses generic LLM + flags |
| **Execution Pattern** | `one-shot` (standard) or `recurring` (Monitor & Alert only) |

---

## Canned Configurations

Each Intent can have multiple canned configurations — pre-built Work Order starting points for common use cases. They are sharable (public or tenant-private).

Example for `analysis-report`:

```json
{
  "intent": "analysis-report",
  "name": "Vendor Concentration Risk Analysis",
  "description": "Standard procurement spend analysis focused on vendor dependency risk",
  "default_format": "nigp-dashboard",
  "pre_filled": {
    "goal": "Analyze spend data for vendor concentration risk",
    "purpose": "Identify over-reliance on single vendors before next budget cycle",
    "constraints": {
      "must": ["Flag any vendor over 25% of total spend", "Include HHI analysis"],
      "must_not": []
    }
  },
  "availability": "public"
}
```

The user picks a canned configuration → Work Order pre-fills → they edit as needed → submit.

---

## Relationship to Formats

One Intent has many Formats. A Format belongs to exactly one Intent.

```
Intent: analysis-report
  ├── Format: nigp-dashboard          (Proprietary)
  ├── Format: structured-report       (Standard)
  └── Format: pdf                     (Universal)

Intent: draft-document
  ├── Format: executive-brief         (Standard)
  ├── Format: word-document           (Universal)
  └── Format: powerpoint-deck         (Standard)
```

When a user picks an Intent, the Format picker filters to only Formats belonging to that Intent.

---

## Relationship to Agents and Capabilities (optional)

Intent and Agent, Intent and Capability — all optional. Absence degrades gracefully.

```
Intent: analysis-report
  Optional Capability assignments:
    ├── nigp-analysis        (required for NIGP Dashboard format)
    ├── rag-query            (for knowledge-augmented analysis)
    └── data-analysis        (for statistical processing)

  Optional Agent assignments:
    ├── Chloe (JR-01)        Level: L2
    ├── Mike (SR-02)         Level: L3
    └── Robyn (CN-03)        Level: L3
```

If Mike is available and authorized for `analysis-report` at L3 → he gets routed.
If no agent is authorized → generic LLM at L1 + gap flagged.

---

## Gap Flagging Mechanic

When Michelle builds an Execution Plan for a Work Order:

```
For each Deliverable spec (Intent + Format):
  1. Check: does any Agent hold authorization for this Intent?
     → No Agent → generic LLM for Intent + flag: "analysis-report — no Agent assigned"
  2. Check: does any Agent hold authorization for the requested Format?
     → No Agent → generic LLM for Format + flag: "nigp-dashboard — no Agent assigned"
  3. Both gaps flagged → Work Order still executes at L1
  4. Gap flags accumulate in product_gaps (future table) → product intelligence signal
```

Gaps surface as product roadmap items — user demand defines what to build next.

---

## MCP Exposure

Each Intent is an MCP resource and tool:

**Resource** (discovery):
```
deepbench://intents/                     — list all Intents
deepbench://intents/{slug}               — Intent detail + available Formats + canned configs
deepbench://intents/{slug}/formats       — Formats available for this Intent
deepbench://agents/{id}/intents          — which Intents this agent is authorized for
```

**Tool** (invocation):
```
deepbench/intents/{slug}/invoke          — invoke an Intent directly (bypasses Work Order UI)
```

---

## Intent vs Service

| | Intent | Service |
|-|--------|---------|
| **What it is** | The type of work (abstract) | A packaged, named, sellable offering (concrete) |
| **Scope** | One cognitive category | One specific Intent + Format combination with pricing |
| **Lives in** | Intent catalog | Service catalog |
| **User sees** | In Work Order creation (Intent picker) | In marketplace, MCP catalog |

A Service IS a named Intent + Format combination. "NIGP Procurement Intelligence Report" is a Service built on `analysis-report` Intent + `nigp-dashboard` Format. The Intent is the foundation; the Service is the product face.

---

## Design Sessions Required

| Session | Scope |
|---------|-------|
| S-INTENT-01 | Full Intent entity design — DB schema, admin UI, canned config management, gap flagging storage, agent assignment table |
| S-MONITOR-01 | Monitor & Alert intent — separate execution pattern, scheduler, trigger model, notification layer |
| S-SERVICE-01 | Service entity — how Intent + Format are packaged into a named, priced, MCP-exposed Service |
