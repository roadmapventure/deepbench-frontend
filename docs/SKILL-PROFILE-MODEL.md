# DeepBench — Skill Profile Model
# Version: v5.2 | Created: 2026-06-18 | Session: S-SK-01 Design

> Canonical reference for all Skill Profile, Trait, Capability, and Seniority design decisions.
> This document is the template for every future sprint that creates a new Skill or Capability.
>
> Read alongside: ARCHITECTURE.md (Section 2 — Platform Model hierarchy),
>                 PLATFORM-ENTITIES.md (Entity 2 — Capability),
>                 DELIVERABLE-MODEL.md (how Skills produce Deliverables)

---

## 1. What a Skill Profile Is

A **Skill Profile** is a configured instance of a Skill type. It is the atomic unit where
proprietary value and IP are created — not the Skill type itself. The Skill type is generic
and reusable. The Skill Profile is specific, configurable, and owned.

**Five Skill types:**

| Type | What it captures | Example Skill Profiles |
|------|-----------------|----------------------|
| **Identity** | Who the agent is — mindset, philosophy, personality | Philosophy, Autonomy Level, Skeptic Level |
| **Behavior** | HOW the agent thinks and communicates — approach, style | Executive Communication Style, Risk-First Framing |
| **Knowledge** | What the agent knows — domain facts, training corpus | Procurement Domain, HR & Workforce Domain |
| **Intent** | WHAT the agent is instructed to do — sections, objectives | Data Analysis, Research & Synthesis |
| **Format** | The OUTPUT TYPE the agent produces | Analysis Report (HTML), Executive Brief (PDF) |

**Critical type distinctions [LOCKED]:**
- **Format = output container only.** HTML, PDF, DOCX, JSON, Dashboard. NOT sections or content structure.
- **Intent = instruction set.** What sections to produce, what questions to answer, what to analyze.
- **Behavior = the approach.** Risk-first vs opportunity-first, skeptical vs advisory, narrative-heavy vs data-heavy.
- **Knowledge = the domain lens.** What patterns matter, what thresholds signal risk, what terminology to use.
- **Identity = editorial character.** Philosophy, autonomy dial, confidence calibration.

A future reader should never blur these lines. If a design session proposes putting sections into
a Format Skill — that is a violation. Sections belong in Intent. Format is the file type.

---

## 2. The Domain-Agnostic Principle [LOCKED]

**Skills are generic. Domain specificity lives in Knowledge Skill Profiles only.**

This is the most important architectural decision in the Skill model. It determines how fast
the platform scales.

```
WRONG — domain-coupled skills:
  "Procurement Data Analysis" — not reusable outside procurement

RIGHT — domain-agnostic skills:
  "Data Analysis" (Intent)  +  "Procurement Domain" (Knowledge)  =  procurement intelligence
  "Data Analysis" (Intent)  +  "HR Domain" (Knowledge)           =  HR workforce analytics
  "Data Analysis" (Intent)  +  "Financial Domain" (Knowledge)    =  financial variance analysis
```

**The scaling implication:**
- A generic Skill (Format, Intent, Behavior) is built ONCE and applies to every domain.
- Each new domain costs ONE sprint: one new Knowledge Skill Profile.
- Adding "Executive Communication Style" (Behavior) immediately improves every Capability that includes it.

**Design sessions must enforce this.** If a Skill Profile spec contains domain-specific language
in an Intent or Format Skill, it should be refactored: extract the domain knowledge into a
Knowledge Skill Profile and keep the Intent/Format generic.

---

## 3. Traits — The Items Within a Skill Profile

Each item within a Skill Profile is called a **Trait**.

"Trait" is the canonical term. Do not use: element, attribute, setting, property, component,
parameter, talent, dimension. All are either too engineering or too narrow.

### Standard Trait List

Every Skill Profile has these Traits regardless of type:

| Trait | Type | Description |
|-------|------|-------------|
| **Objective** | text | What is this Skill trying to accomplish? |
| **Method** | text | How does it accomplish it? |
| **Output** | text | What does it produce? |
| **Tone** | select | Communication register: `professional` · `advisory` · `technical` · `executive` |
| **Confidence** | select | Output certainty: `assertive` · `measured` · `hedged` |
| **Guardrails** | list | Must / Must Not rules — same pattern as Playbook tab |
| **Notes** | textarea | Free text for any concept not covered by the standard list |

The **Notes** Trait is the explicit fallback. No Skill concept is ever left undocumented.
When the same concept appears in Notes across three or more Skill Profiles, that is the signal
to promote it to a named Trait in the schema.

### Type-Specific Traits

Type-specific Traits live in a `traits jsonb` column. They are promoted to named columns
when patterns solidify across multiple Skill Profiles of that type.

| Skill Type | Type-specific Traits (in `traits` jsonb) |
|-----------|------------------------------------------|
| **Format** | `output_type` (html/pdf/docx/json/dashboard), `file_format`, `section_structure` |
| **Intent** | `sections[]` (ordered section slugs), `analysis_instructions`, `reporting_depth` |
| **Knowledge** | `domain`, `jurisdiction`, `source_types`, `source_priority` |
| **Behavior** | `reasoning_style`, `writing_style`, `autonomy_level` |
| **Identity** | `philosophy`, `skeptic_level`, `temporal_stance`, `epistemology` |

### Trait Design Rule

When designing a new Skill Profile, fill the standard Traits first. If a concept is not
covered, put it in Notes. Do not create ad-hoc trait names — use Notes until the concept
recurs and earns a named Trait through promotion.

---

## 4. Technical Services (AI Patterns) on Skill Profiles

A Skill Profile declares which Technical Services (AI Patterns) execute it via a
`technical_services` array. This is the contract between the Skill Profile and the
capability route that invokes it.

**Key rules:**
- Technical Services are declared ON the Skill Profile — not on the Capability.
- `technical_services` is seeded as `[]` (empty) until the Work Side execution sprint wires invocation.
- **AiBadge does NOT appear on the Capabilities card until patterns are actually wired to execute.**
- When patterns ARE wired, show ALL patterns for every Skill on the Capabilities card — not just one.

**How invocation works (Work Side — future sprint):**
```
Work Order submitted
  → Michelle plans steps, assigns to Agent with Capability
  → Step execution begins
  → Capability route reads skill_profiles for Agent's Capability
  → For each Skill Profile, reads technical_services[]
  → Invokes each Technical Service in sequence
  → Produces Deliverable → writes to deliverables table
```

**Common Technical Service assignments by Skill type:**

| Skill Type | Common Technical Services |
|-----------|--------------------------|
| Format | `structured-output` |
| Intent | `structured-output` · (future: `prompt-chaining` for multi-step) |
| Knowledge | `rag` · `embeddings` |
| Behavior | `prompt-assembly` · `behavioral-rag` |
| Identity | `persona-replication` · `behavioral-rag` |

**When to add Technical Services:** Only when the coding session that wires them to actually
execute is being planned. Do not seed pattern declarations for capabilities that have no
invocation path yet.

---

## 5. Capabilities — Assembling Skill Profiles

A **Capability** is a named, graded, shareable grouping of Skill Profiles with its own profile.
It is the unit agents are assigned to — not individual Skill Profiles.

**Assembly rules:**
- One Capability groups one or more Skill Profiles
- The Level of each Skill Profile is set at assignment time (on `capability_skill_profiles.level`)
- Agents assigned to a Capability inherit the Skill's Level — no per-agent authorization ceiling (future feature)
- A Capability is independent of any specific Agent — built once, assigned to many
- New Capabilities are additive — never modify an existing Capability to serve a new purpose

**Level lives on the Capability-Skill assignment:**
```sql
capability_skill_profiles.level  ← the quality level of this Skill within this Capability
```

When the Skill Profile improves (more training, better configuration), update this level.
The agent's effective quality level reflects the current state of the Capability's Skill Profiles.

**Multi-tenancy:**
- `capabilities.tenant_id = null` → platform-wide (any tenant can use)
- `capabilities.tenant_id = 'acme'` → private to that tenant
- `agent_capability_assignments` always carries `tenant_id` (which tenant's agents)

---

## 6. DB Schema — The 5 Tables

> These tables are built in S-SK-01. Do not build before that session.
> The full adapter layer and BYOK wiring follows in S-INFRA-01.

```sql
-- Global catalog — platform-wide, no tenant scope
skill_types (
  id            uuid primary key,
  slug          text unique not null,   -- 'identity' | 'behavior' | 'knowledge' | 'intent' | 'format'
  name          text not null,
  description   text,
  display_order int
)

-- Platform catalog — tenant_id null = platform-wide
skill_profiles (
  id                  uuid primary key,
  slug                text unique not null,
  name                text not null,
  description         text,
  skill_type_slug     text not null,     -- FK → skill_types.slug

  -- Standard Traits (named columns — queryable)
  objective           text,
  method              text,
  output_desc         text,
  tone                text,              -- 'professional' | 'advisory' | 'technical' | 'executive'
  confidence          text,              -- 'assertive' | 'measured' | 'hedged'

  -- Type-specific Traits (flexible jsonb — no schema migration per new type)
  traits              jsonb default '{}',

  -- Guardrails (must / must_not — same pattern as Playbook tab)
  guardrails          jsonb default '{"must": [], "must_not": []}',

  -- Fallback
  notes               text,

  -- Technical Services (AI Patterns that execute this Skill — empty until Work Side wired)
  technical_services  jsonb default '[]',

  -- Meta
  execution_type      text default 'ai', -- 'ai' | 'deterministic' | 'mixed'
  tenant_id           text,              -- null = platform-wide
  created_at          timestamptz default now()
)

-- Platform catalog — tenant_id null = platform-wide
capabilities (
  id              uuid primary key,
  slug            text unique not null,
  name            text not null,
  description     text,
  execution_type  text default 'ai',    -- 'ai' | 'deterministic' | 'mixed'
  tenant_id       text,                 -- null = platform-wide
  created_at      timestamptz default now()
)

-- Join: which Skill Profiles belong to which Capability, at what Level
capability_skill_profiles (
  id                  uuid primary key,
  capability_slug     text not null,    -- FK → capabilities.slug
  skill_profile_slug  text not null,    -- FK → skill_profiles.slug
  level               int default 1,   -- L1–L4: this Skill's quality level within this Capability
  is_required         boolean default true,
  display_order       int,
  created_at          timestamptz default now()
)

-- Seniority: which agents are assigned to which Capabilities, per tenant
agent_capability_assignments (
  id               uuid primary key,
  tenant_id        text not null,
  agent_id         text not null,       -- FK → agents.js agent id
  capability_slug  text not null,       -- FK → capabilities.slug
  created_at       timestamptz default now()
  -- note: no level field — agents inherit level from capability_skill_profiles
  -- authorization ceiling is a future feature (S-INFRA-01)
)
```

---

## 7. Currently Defined Skill Profiles

### SP-01 — Data Analysis (type: intent)

```json
{
  "slug": "data-analysis",
  "skill_type_slug": "intent",
  "name": "Data Analysis",
  "description": "Generic data analysis instruction set — finds patterns in any dataset",
  "objective": "Find patterns in data and surface actionable insights",
  "method": "Statistical analysis with narrative synthesis",
  "output_desc": "Structured written report with findings and recommendations",
  "tone": "professional",
  "confidence": "measured",
  "traits": {
    "sections": ["executive-summary", "key-findings", "patterns-anomalies", "recommendations"],
    "analysis_instructions": "Find statistical patterns and distributions. Identify outliers and anomalies. Surface top and bottom performers. Flag concentration risk. Quantify every claim with numbers from the data. Note trend direction where time data exists.",
    "reporting_depth": "quantitative-first"
  },
  "guardrails": {
    "must": ["Quantify every claim with data", "Include an executive summary"],
    "must_not": ["Do not speculate beyond the data", "No undefined jargon"]
  },
  "technical_services": [],
  "execution_type": "ai",
  "tenant_id": null
}
```

> `technical_services` seeded empty. Will be set to `["structured-output"]` when Work Side
> execution is wired in the capability route sprint.

### SP-02 — Analysis Report (type: format)

```json
{
  "slug": "analysis-report",
  "skill_type_slug": "format",
  "name": "Analysis Report",
  "description": "Web-rendered HTML report with structured titled sections",
  "objective": "Render analysis output as a structured, readable web report",
  "method": "HTML rendering with titled sections and navigable layout",
  "output_desc": "HTML page with titled sections — readable on desktop and mobile",
  "tone": "professional",
  "confidence": "assertive",
  "traits": {
    "output_type": "html",
    "file_format": "html",
    "section_structure": "titled-sections"
  },
  "guardrails": {
    "must": ["Include section headings", "Be readable on desktop and mobile"],
    "must_not": []
  },
  "technical_services": [],
  "execution_type": "ai",
  "tenant_id": null
}
```

> `technical_services` seeded empty. Will be set to `["structured-output"]` when Work Side
> execution is wired.

---

## 8. Currently Defined Capabilities

### CAP-01 — Data Analyst

```json
{
  "slug": "data-analyst",
  "name": "Data Analyst",
  "description": "Takes a dataset, finds patterns, produces a structured HTML analysis report",
  "execution_type": "ai",
  "tenant_id": null
}
```

**Skill Profile assignments:**

| Skill Profile | Level | Required |
|--------------|-------|---------|
| `data-analysis` (intent) | L2 | Yes |
| `analysis-report` (format) | L1 | Yes |

**Agent assignments (S-SK-01):**

| Agent | Notes |
|-------|-------|
| Bob Whitfield (PR-04) | Only agent assigned in Sprint 1 |

All other agents: container visible but empty state shown.

**Future additions to this Capability (as sprints complete):**
- `procurement-domain` Knowledge Skill → agents can analyze procurement data with domain precision
- `executive-communication` Behavior Skill → output tone improves
- `analyst-philosophy` Identity Skill → agent develops editorial judgment

Each addition raises the Capability's effective Level and improves Deliverable quality.

---

## 9. Sprint Template — Adding a New Skill

Use this template for every future design session that creates a new Skill Profile.

**Step 1 — Identify the Skill type**
- Is this about output container? → Format
- Is this about what to do and what sections to produce? → Intent
- Is this about how the agent approaches work? → Behavior
- Is this about domain knowledge? → Knowledge
- Is this about who the agent is? → Identity

**Step 2 — Confirm domain-agnostic design**
- Does this Skill contain domain-specific language?
- If yes: extract the domain into a Knowledge Skill Profile
- The Skill itself should work on any dataset / any domain

**Step 3 — Fill Standard Traits**
- Objective, Method, Output, Tone, Confidence, Guardrails, Notes
- Use Notes for any concept not in the standard list

**Step 4 — Identify type-specific Traits**
- Format: `output_type` is required
- Intent: `sections[]` and `analysis_instructions` are required
- Knowledge: `domain` and `jurisdiction` (if applicable) are required
- Behavior: `reasoning_style` is required
- Identity: `philosophy` is required

**Step 5 — Technical Services**
- Leave `technical_services: []` empty
- Do NOT declare patterns until the Work Side execution sprint is planned
- AiBadge does not appear until patterns are actually wired

**Step 6 — Determine Capability assignment**
- Does this Skill belong in an existing Capability? (check currently defined Capabilities)
- Or does it define a new Capability?
- If new: name the Capability, list all Skills it bundles, set Level per Skill

**Step 7 — Agent assignment**
- Which agents hold Seniority in this Capability?
- Start narrow — assign to the most relevant agent first
- All other agents see the empty state container

**Step 8 — Document in SKILL-PROFILE-MODEL.md**
- Add to Section 7 (Skill Profiles) and Section 8 (Capabilities)
- Update FEATURES.md with new SK feature ID
- Update CLAUDE-STATE.md with next session

---

## 10. Work Side Implications (Future)

When the Work Side execution is built, the Skill Profile data drives the capability route:

**Intent Skill Profile → shapes the AI prompt:**
- `traits.sections[]` → tells the capability route what sections to request from Claude
- `traits.analysis_instructions` → injected into the system prompt
- `guardrails.must` / `must_not` → injected as constraints

**Format Skill Profile → shapes the output:**
- `traits.output_type` → tells the route how to format the response (HTML, PDF, etc.)
- `traits.section_structure` → how to structure the rendered output

**Knowledge Skill Profile → shapes RAG retrieval:**
- `traits.domain` → scopes the pgvector query
- `traits.jurisdiction` → filters knowledge_entries by jurisdiction tag

**Behavior Skill Profile → shapes the system prompt:**
- `traits.reasoning_style` → prepended to agent system prompt
- `traits.writing_style` → tone instruction

**Technical Services → invocation order:**
- Capability route reads `technical_services[]` from each Skill Profile
- Invokes in order: RAG retrieval → prompt assembly → structured output call → format rendering
- Deliverable written to `deliverables` table with `capability_slug`, `skill_profile_slug`, `level`

**The Work Order picks up here:**
- Work Order `deliverables[]` spec declares Intent + Format slugs
- Michelle matches Intent slug → finds agent with Capability that includes that Intent Skill
- Michelle matches Format slug → confirms agent's Capability includes that Format Skill
- If no match → generic LLM (L1) + gap_flag

---

## 11. Feature IDs

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| SK-01 | `skill_types` table + 5 type seeds | ❌ Missing | S-SK-01 |
| SK-02 | `skill_profiles` table + SP-01 (Data Analysis) + SP-02 (Analysis Report) seeds | ❌ Missing | S-SK-01 |
| SK-03 | `capabilities` table + CAP-01 (Data Analyst) seed | ❌ Missing | S-SK-01 |
| SK-04 | `capability_skill_profiles` join table + seeds linking SP-01 + SP-02 to CAP-01 | ❌ Missing | S-SK-01 |
| SK-05 | `agent_capability_assignments` table + Bob (PR-04) assigned to CAP-01 | ❌ Missing | S-SK-01 |
| SK-06 | Personnel File Profile tab — Capabilities read section (between profile card and compensation card) | ❌ Missing | S-SK-01 |

---

## 12. Open Design Decisions (future sessions)

- Authorization ceiling per agent per Capability (deferred — agents currently inherit Capability level)
- CRUD UI for Skill Profile creation and editing (deferred — read-only display in S-SK-01)
- Trait promotion process — when a Notes concept gets promoted to a named Trait column
- `technical_services` wiring to capability routes (Work Side execution sprint)
- Skill Profile versioning — when a Skill Profile is updated, past Deliverables reference pinned version
- Skill Profile marketplace — publish, price, sell a Skill Profile independently (Phase 4)
