# DeepBench — Format Model
# Version: v5.2 | Created: 2026-06-16 | Session: S-DELIVER-DESIGN Part 3

> A Format defines the output structure of a Deliverable — how content is presented.
> It is a first-class independent entity scoped to exactly one Intent.
>
> Read alongside: INTENT-MODEL.md, DELIVERABLE-MODEL.md, PLATFORM-ENTITIES.md

---

## Definition

A **Format** names the structural presentation of a Deliverable's output. It answers the question: *what form does the output take?*

Format is NOT a file extension string. It is an independent entity with:
- Its own profile structure (mirrors Agent Personnel Profile)
- Its own shared property set (Level, Availability, Pricing, etc.)
- A defined data variable schema (what inputs the Format needs to populate)
- A defined section structure (what the output contains — locked for Proprietary, flexible for others)
- Optional assignments to Agents and Capabilities
- Its own template layer (past approved Deliverables as quality anchors)

**Hard rule [LOCKED]:** A Format belongs to exactly one Intent. The NIGP Dashboard is always an Analysis & Report output — it cannot be produced by a different Intent. This makes Format schemas deterministic: a Format knows exactly what data it receives because it knows exactly which Intent produced it.

---

## Three Tiers

| Tier | Description | Examples | Locked sections | Pricing | Agents |
|------|-------------|---------|----------------|---------|--------|
| **Universal** | Standard file formats — any agent, any platform can produce | PDF, Word, PowerPoint, CSV, JSON, HTML | No | Free | Any |
| **DeepBench Standard** | DeepBench-defined templates — consistent structure, professionally designed | Structured Report, Executive Brief, Observation Log, Research Summary, Summary Card | Soft (recommended, not enforced) | Free or flat rate | Any trained agent |
| **DeepBench Proprietary** | Locked sections, specific trained agents only, competitive IP | NIGP Dashboard, Vendor Risk Matrix, Compliance Scorecard | Yes — enforced | Paywalled | Specific authorized agents |

---

## Format Profile Structure

Every Format has a profile — same structural pattern as Agent Personnel Profile and Intent Profile:

| Profile Tab | Contents |
|-------------|----------|
| **Profile** | Name, slug, tier, Intent it belongs to, output file type, preview thumbnail |
| **Schema** | Data variables (required + optional), sections (locked or flexible), charts/visualizations |
| **Capabilities** | Which Capabilities are assigned to produce this Format (optional — falls back to generic LLM if none) |
| **Templates** | Past approved Deliverables used as quality anchors and starting point references |
| **History** | Usage frequency, approval rates, change request rates, avg Level achieved |

---

## Shared Property Set

All three entities — Capability, Intent, Format — share this property set:

| Property | Values | Applies to Format |
|----------|--------|------------------|
| **Level** | L1 General · L2 Trained · L3 Expert · L4 Proprietary | Yes — quality of presentation |
| **Availability** | Public · Private | Yes — Proprietary formats are Private |
| **Exclusivity** | Shared · Exclusive | Yes — exclusive formats locked to one agent or tenant |
| **Pricing** | Free · Priced ($/use) | Yes — Proprietary formats are paid |
| **Trainability** | Trainable · Supervised · Locked | Yes — Standard formats improvable; Proprietary sections locked |
| **Type** | AI · Deterministic · Mixed | Yes — NIGP Dashboard is Mixed (AI Review tab + deterministic charts) |
| **Version** | integer | Yes — Format schemas evolve; past Deliverables reference pinned version |

---

## Format-Specific Properties

| Property | Description |
|----------|-------------|
| **Intent** | The one Intent this Format belongs to (locked — cannot be reassigned) |
| **Output File Type** | `html` · `pdf` · `docx` · `pptx` · `csv` · `json` · `dashboard` |
| **Data Variables Schema** | What the Format needs to populate — required and optional variables with types |
| **Sections** | The structural definition — locked for Proprietary, recommended for Standard |
| **Charts / Visualizations** | Chart types this Format uses — `treemap`, `bar`, `timeline`, `hhi-index`, etc. |
| **Preview** | Thumbnail or sample output — shown during Format selection in Work Order creation |
| **Gap Flag** | Boolean — true when no Capability or Agent is assigned to produce this Format |

---

## Format Catalog Entry Shape

```json
{
  "slug": "nigp-dashboard",
  "name": "NIGP Dashboard",
  "tier": "proprietary",
  "intent": "analysis-report",
  "output_file_type": "dashboard",
  "version": 1,
  "availability": "private",
  "exclusivity": "shared",
  "pricing": "priced",
  "trainability": "locked",
  "type": "mixed",
  "level": 3,
  "gap_flag": false,

  "sections": [
    { "slug": "overview",    "name": "Overview",      "required": true,  "locked": true  },
    { "slug": "categories",  "name": "Categories",    "required": true,  "locked": true  },
    { "slug": "treemap",     "name": "Treemap",       "required": false, "locked": true  },
    { "slug": "vendors",     "name": "Vendors",       "required": true,  "locked": true  },
    { "slug": "departments", "name": "Departments",   "required": false, "locked": true  },
    { "slug": "timeline",    "name": "Timeline",      "required": false, "locked": true  },
    { "slug": "concerns",    "name": "Concerns",      "required": true,  "locked": true  },
    { "slug": "local-spend", "name": "Local Spend",   "required": false, "locked": true  },
    { "slug": "hhi",         "name": "HHI Index",     "required": false, "locked": true  },
    { "slug": "ai-review",   "name": "AI Review",     "required": true,  "locked": true  },
    { "slug": "cleanup",     "name": "Cleanup",       "required": false, "locked": true  }
  ],

  "data_variables": [
    { "name": "vendor",       "type": "string",   "required": true  },
    { "name": "amount",       "type": "currency", "required": true  },
    { "name": "department",   "type": "string",   "required": false },
    { "name": "nigp_code",    "type": "string",   "required": false },
    { "name": "fiscal_year",  "type": "string",   "required": true  },
    { "name": "local_flag",   "type": "boolean",  "required": false }
  ],

  "charts": [
    "treemap", "bar", "timeline", "hhi-index", "pie"
  ],

  "badge": "mixed",
  "mcp_tool": "deepbench/analysis-report/nigp-dashboard",
  "preview_url": null
}
```

---

## Why Locked Sections Matter

For Proprietary Formats, the section structure is the IP. Users paying for the NIGP Dashboard get a guaranteed structure — the same 11 tabs, always in the same order, always with the same required sections populated. This is what makes it a contractual output, not a variable one.

For Standard Formats, sections are recommended — the Format ships with a default structure, but agents can add or reorder sections based on the Work Order's constraints.

For Universal Formats (PDF, Word, etc.), there is no section definition — the agent determines structure from the Intent configuration and Work Order constraints.

---

## What "Belongs to One Intent" Guarantees

Because a Format is permanently scoped to one Intent, its data variable schema is fully deterministic at design time:

```
NIGP Dashboard (Format) → Analysis & Report (Intent)
  Always receives: spend data, vendor list, department breakdown, fiscal year, NIGP codes
  Never receives: video transcripts, email content, legal documents
  → Data variables schema can be exact — no runtime ambiguity
  → Sections can reference specific variable names without conditions
```

This determinism is what makes Proprietary Formats reliable and sellable as guarantees.

---

## Currently Registered Formats

### Proprietary (DeepBench IP)

| Slug | Name | Intent | Status |
|------|------|--------|--------|
| `nigp-dashboard` | NIGP Dashboard | `analysis-report` | ✅ Built (AZ-06–AZ-17) — needs Deliverable write wiring (DL-12) |

### Standard (DeepBench Defined)

| Slug | Name | Intent | Status |
|------|------|--------|--------|
| `structured-report` | Structured Report | `analysis-report` | ❌ Not yet registered |
| `executive-brief` | Executive Brief | `draft-document` | ❌ Not yet registered |
| `research-summary` | Research Summary | `research-findings` | ❌ Not yet registered |
| `observation-log` | Observation Log | `take-action` | ❌ Not yet registered |
| `summary-card` | Summary Card | `extract-summarize` | ❌ Not yet registered |

### Universal (pass-through)

| Slug | Name | Intent | Notes |
|------|------|--------|-------|
| `pdf` | PDF | any | Agent produces content; Format is rendering only |
| `word` | Word Document | any | Same |
| `powerpoint` | PowerPoint Deck | any | Requires Presentation Design capability |
| `csv` | CSV / Dataset | any | Data output |
| `json` | JSON | any | Structured data output |
| `html` | HTML | any | Web-renderable output |

---

## Format vs Service

| | Format | Service |
|-|--------|---------|
| **What it is** | The output structure (abstract schema) | A packaged, named, priced offering |
| **Scope** | Defines what the output looks like | Bundles Intent + Format with a name, price, and MCP endpoint |
| **Availability** | In Format catalog | In Service catalog + marketplace |
| **User sees** | In Work Order Format picker | In marketplace, MCP discovery |

A Service wraps a Format. "NIGP Procurement Intelligence Report" (Service) = `analysis-report` (Intent) + `nigp-dashboard` (Format) + pricing + MCP endpoint.

---

## MCP Exposure

Each Format is an MCP resource:

```
deepbench://formats/{slug}               — Format schema (data variables, sections, charts)
deepbench://intents/{slug}/formats       — all Formats available for an Intent
```

External systems query the Format schema before invoking — they know exactly what they'll get back.

---

## Design Sessions Required

| Session | Scope |
|---------|-------|
| S-FORMAT-01 | Full Format entity design — DB schema, Format catalog admin, section editor, data variable schema, preview generation, agent assignment table |
| S-SERVICE-01 | Service entity — packaging Format + Intent into named, priced, MCP-exposed Service |
