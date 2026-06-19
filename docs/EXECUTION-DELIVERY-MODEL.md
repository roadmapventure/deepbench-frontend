# DeepBench — Execution & Delivery Model
# Version: v5.2 | Created: 2026-06-18 | Session: Execution-Delivery Design

> Canonical reference for how Work Orders are planned, executed, and delivered through the agent model.
> Read alongside: SKILL-PROFILE-MODEL.md, ARCHITECTURE.md (Section 2), DELIVERABLE-MODEL.md

---

## 1. The Two-Actor Model

Every Work Order in DeepBench is fulfilled by two types of agents:

**Orchestrator** — plans and coordinates the work. Does not execute steps.
Produces: Ideal Plan → Execution Plan → Reflection Report

**Executor** — performs one step using an assigned Capability.
Produces: Step Deliverable (one per step)

These roles are both modeled as Capabilities. Neither is hardcoded. Any agent
assigned the Project Manager Capability becomes an Orchestrator. Any agent
assigned a domain Capability becomes an Executor.

---

## 2. The Full Execution Pipeline

```
WORK ORDER (user creates)
        ↓
┌─────────────────────────────────────────┐
│  ORCHESTRATOR — Project Manager         │
│  Capability: project-manager            │
│                                         │
│  Pass 1 — Work Order Analysis           │
│  Patterns: RAG, Episodic Memory, HyDE   │
│  → Ideal Plan (unconstrained)           │
│    Names capabilities by what work      │
│    REQUIRES, not what DeepBench has     │
│                                         │
│  Pass 2 — Capability Assignment         │
│  Patterns: ReAct, Chain-of-Verification │
│  → Execution Plan                       │
│    Matches each step to capability      │
│    registry. Assigns agent or flags gap │
└─────────────────┬───────────────────────┘
                  ↓
      ┌───────────────────────┐
      │  HITL — User Reviews  │
      │  Assigned Plan        │
      │  ✅ assigned          │
      │  ⚠️  generic LLM     │
      │  🔴 capability gap   │
      │  Approve / Modify     │
      └───────────┬───────────┘
                  ↓
    ┌─────────────────────────────┐
    │  EXECUTION (per step)       │
    │  Patterns: RAG, Structured  │
    │  Output, Prompt Chaining,   │
    │  Tool Use, Parallelization  │
    │  → Step Deliverable (each)  │
    └──────────────┬──────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  ORCHESTRATOR — Reflection              │
│  Pattern: Reflection                    │
│  Reviews each Step Deliverable vs.      │
│  original step requirement + Work Order │
│  goal. Verdict: met / partial / not met │
│  → not met triggers revision request    │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  JUDGE (optional)                       │
│  Pattern: LLM-as-Judge                  │
│  Independent quality evaluation         │
│  → Quality Verdict (scorecard)          │
│  → Feeds back to Orchestrator's         │
│    episodic memory (training signal)    │
└─────────────────────────────────────────┘
```

---

## 3. AI Patterns Activated by This Model

### Structural Patterns (scaffolding around Claude)

| Pattern | Where It Fires |
|---------|---------------|
| RAG | Orchestrator pass 1 — domain knowledge retrieval |
| Episodic Memory | Orchestrator — past completed Work Orders of similar type |
| HyDE | Orchestrator RAG retrieval — generates hypothetical ideal plan, uses that embedding for search |
| Embeddings | Capability registry embedded for Junior PM semantic matching |
| Structured Output | Execution Plan schema, Step Deliverables, Quality Verdict |
| Guardrails | Each Step Deliverable filtered before passing to next step |
| Parallelization | Independent steps run concurrently during execution |

### Reasoning Patterns (changes how Claude thinks)

| Pattern | Where It Fires |
|---------|---------------|
| Prompt Chaining | Ideal Plan → Execution Plan → Execution → Reflection is a chain |
| ReAct | Capability assignment pass — reason + check registry + reason + assign |
| Chain-of-Verification | After assignment, verify every assignment is valid before HITL |
| Reflection | Orchestrator reviews completed deliverables vs. Work Order goal |
| HITL | User reviews and approves/modifies Execution Plan before execution |
| Agent Orchestration | Orchestrator coordinates Junior PM pass + executor agents |
| Multi-Agent Debate | Orchestrator + secondary reviewer debate unresolved assignments |
| Few-Shot Prompting | Orchestrator RAG includes exemplar plans for similar Work Order types |
| LLM-as-Judge | Independent quality evaluation post-execution |

---

## 4. The Six Deliverables

### Deliverable 1 — Ideal Plan
**Type:** `ideal_plan`
**Produced by:** Orchestrator (Pass 1)
**Description:** Unconstrained decomposition. Names what the work REQUIRES, not what DeepBench has.

**Step schema:**
```json
{
  "id": "string",
  "label": "string (action phrase)",
  "capability_name": "string (free text, no slug)",
  "rationale": "string",
  "complexity": "low | medium | high"
}
```

---

### Deliverable 2 — Execution Plan
**Type:** `execution_plan`
**Produced by:** Orchestrator (Pass 2)
**Description:** Capability-matched plan. Every step resolved to assigned, generic, or gap.

**Step schema:**
```json
{
  "id": "string",
  "label": "string",
  "capability_name": "string (from Ideal Plan)",
  "capability_slug": "string | null",
  "agent_id": "string | 'generic' | null",
  "assignment_status": "assigned | generic | gap",
  "expected_output_type": "string (deliverable type slug)",
  "rationale": "string",
  "depends_on": ["step_id"],
  "status": "pending | running | complete | failed"
}
```

**Plan-level fields:**
```json
{
  "work_order_id": "string",
  "steps": "Step[]",
  "assigned_count": "number",
  "generic_count": "number",
  "gap_count": "number",
  "status": "draft | approved"
}
```

---

### Deliverable 3 — Approved Execution Plan
**Type:** `execution_plan` (status: `approved`)
**Produced by:** User (HITL)

Not a new deliverable — the Execution Plan transitions state on user approval.
User sees: ✅ assigned, ⚠️ generic LLM, 🔴 capability gap per step.
User can: approve as-is, modify assignments, defer or remove steps.

---

### Deliverable 4 — Step Deliverable *(one per step)*
**Type:** varies — `analysis_report`, `research_summary`, `data_extract`, `structured_brief`, etc.
**Produced by:** Assigned executor agent (or generic LLM)

Type is determined by the `expected_output_type` field on the step, which maps to a Format Skill slug.
Each Step Deliverable is stored in the `deliverables` table with `status: draft`.
User can approve or request change (DL-05).

---

### Deliverable 5 — Reflection Report
**Type:** `reflection_report`
**Produced by:** Orchestrator (post-execution)

```json
{
  "work_order_id": "string",
  "step_verdicts": [
    {
      "step_id": "string",
      "status": "met | partial | not_met",
      "notes": "string"
    }
  ],
  "overall_status": "met | partial | not_met",
  "revision_requests": ["step_id"]
}
```

`not_met` steps trigger a revision request back to the assigned executor.

---

### Deliverable 6 — Quality Verdict *(optional)*
**Type:** `quality_verdict`
**Produced by:** Judge agent (LLM-as-Judge)

```json
{
  "work_order_id": "string",
  "criteria_scores": [
    {
      "criterion": "string",
      "score": "number (0-100)",
      "notes": "string"
    }
  ],
  "overall_score": "number",
  "recommendation": "approve | revise | reject"
}
```

Feeds back into Orchestrator's episodic memory as a training signal.

---

## 5. The Capability Gap Log

Steps the Orchestrator cannot assign are product intelligence — not just a fallback.

```json
{
  "work_order_id": "string",
  "step_label": "string",
  "capability_name_requested": "string (from Ideal Plan)",
  "resolution": "generic_llm",
  "logged_at": "timestamp"
}
```

Stored in a `capability_gaps` table (new — not yet built).
Over time answers: what capabilities are users asking for that DeepBench doesn't have?
Feeds directly into the product roadmap and the PM-initiated capability creation pattern.

---

## 6. The Project Manager Capability

**Slug:** `project-manager`
**Description:** Receives a Work Order, decomposes it into executable steps (Pass 1),
matches steps to available DeepBench capabilities and assigns agents (Pass 2),
produces an Execution Plan for user approval.

**Currently assigned to:** Michelle Manning (PP-01)

---

### SP-PM-01 — Work Order Decomposition (type: intent)

```json
{
  "slug": "work-order-decomposition",
  "skill_type_slug": "intent",
  "name": "Work Order Decomposition",
  "description": "Analyzes a Work Order and decomposes it into discrete, independently executable steps. Names the capability each step requires without consulting the registry.",
  "objective": "Understand what the user is actually trying to accomplish. Decompose into the minimum discrete steps required to fulfill it. Name the capability each step requires — unconstrained by what is available in DeepBench.",
  "method": "Top-down decomposition. Start with the end deliverable, work backward to the steps that produce it. Each step must be independently executable by a single agent.",
  "output_desc": "Step list where each step has a label, a required capability name (free text), a rationale, and a complexity estimate.",
  "tone": "technical",
  "confidence": "measured",
  "traits": {
    "sections": ["goal-analysis", "step-list", "dependency-map"],
    "analysis_instructions": "Read the full Work Order. Identify the end deliverable the user needs. Work backward from that deliverable to the minimum steps required. For each step, name the capability type it needs — not a DeepBench slug, just what the work requires. Flag ambiguity explicitly rather than assuming.",
    "reporting_depth": "structured"
  },
  "guardrails": {
    "must": [
      "Name a required capability for every step",
      "Flag ambiguity explicitly rather than assuming",
      "Each step must be independently executable by one agent"
    ],
    "must_not": [
      "Never collapse two distinct capability types into one step",
      "Never invent steps not required by the Work Order",
      "Never consult the capability registry — this pass is unconstrained"
    ]
  },
  "technical_services": [],
  "execution_type": "ai"
}
```

---

### SP-PM-02 — Capability Assignment (type: intent)

```json
{
  "slug": "capability-assignment",
  "skill_type_slug": "intent",
  "name": "Capability Assignment",
  "description": "Takes the decomposed step list and matches each step to the capability registry. Assigns the best authorized agent or flags the step as a gap. Determines which steps warrant human review via the HITL pattern.",
  "objective": "For every step in the Ideal Plan, find the closest matching capability in the DeepBench registry. Assign the highest-level authorized agent. For unmatched steps, create the step with assignment_status: gap and log it. Determine per step whether human review is warranted before execution proceeds.",
  "method": "Semantic match from step's free-text capability name to registry slugs. For matched capabilities, select the highest-level authorized agent. For unmatched, set gap status and preserve the step — do not drop it. Verify every assignment before finalizing. Flag steps for HITL when the deliverable requirements are ambiguous, stakes are high, or a gap step requires human judgment before the next step can proceed.",
  "output_desc": "Same step list with capability_slug, agent_id, assignment_status, and hitl_required added to each step.",
  "tone": "technical",
  "confidence": "assertive",
  "traits": {
    "sections": ["assignment-pass", "gap-log", "verification"],
    "analysis_instructions": "Take each step from the Ideal Plan. Search the capability registry semantically. Match or flag. Never leave a step unresolved — every step gets one of: assigned, generic, or gap. After assignment, verify each assigned step: does the named agent actually hold the named capability? For each step, independently assess whether human review is warranted before execution continues.",
    "reporting_depth": "structured"
  },
  "guardrails": {
    "must": [
      "Every step must have an assignment_status",
      "Verify every assignment against agent_capability_assignments before finalizing",
      "Log every unmatched step to the capability gap log",
      "Gap steps must still appear in the Execution Plan — never drop an unassigned step",
      "Assess HITL need per step independently based on ambiguity, stakes, and gap status"
    ],
    "must_not": [
      "Never assign a capability to an agent who does not hold it",
      "Never leave a step unresolved",
      "Never infer a capability exists — only match against confirmed registry entries",
      "Never hardcode which agent receives which step type — assignment must flow from the capability registry"
    ]
  },
  "technical_services": [],
  "execution_type": "ai"
}
```

> **Intended `technical_services` when wired (S-PM-02/S-PM-03):**
> - `agent-orchestration` (PAT-11) — Orchestrator coordinates which executor agent receives each step
> - `chain-of-verification` (PAT-07) — verifies every assignment against live registry before HITL
> - `hitl` (PAT-10) — fires per step when LLM determines human review is warranted; LLM decides, not a hard rule
```

---

### SP-PM-03 — Execution Plan (type: format)

```json
{
  "slug": "execution-plan",
  "skill_type_slug": "format",
  "name": "Execution Plan",
  "description": "Structured JSON output schema for a Work Order execution plan — both Ideal and Assigned passes. Includes a plain-English plan summary and clarifying questions for the HITL review surface.",
  "objective": "Produce a machine-readable, human-reviewable execution plan that drives Work Order execution. The plan summary pre-populates the HITL review card so the user understands what they are approving. Clarifying questions, when present, are surfaced before decomposition proceeds.",
  "method": "Structured JSON conforming to the Execution Plan step schema. planSummary is generated from the Work Order goal and the assembled step list — one sentence describing what the plan accomplishes. agentId always identifies the Orchestrating PM (not an executor). questions[] is populated only when SP-PM-04 clarification_policy triggers.",
  "output_desc": "JSON object with plan-level fields (including planSummary, agentId, agentReason, questions), a steps array, and assignment counts. planSummary surfaces in the UI at the HITL review point.",
  "tone": "technical",
  "confidence": "assertive",
  "traits": {
    "output_type": "json",
    "file_format": "json",
    "section_structure": "step-array",
    "output_fields": ["planSummary", "agentId", "agentReason", "questions", "steps", "assigned_count", "generic_count", "gap_count", "status"]
  },
  "guardrails": {
    "must": [
      "Output must be valid JSON",
      "Every step must include all required fields",
      "assignment_status must be one of: assigned | generic | gap",
      "planSummary must be present — one plain-English sentence describing what the plan accomplishes",
      "agentId must reference the Orchestrating PM agent — never an executor agent",
      "questions[] must be an empty array when no clarification is needed"
    ],
    "must_not": [
      "No free-text plan descriptions outside of planSummary — structure only",
      "No missing step fields",
      "planSummary must not exceed one sentence",
      "agentId must never reference an executor agent — plan-level agent is always the Orchestrator"
    ]
  },
  "technical_services": [],
  "execution_type": "ai"
}
```

> **UI surface:** `planSummary` pre-populates the HITL review card headline. `agentId` drives the primary agent chip at the top of the plan (always the PM — Michelle today, domain-specific PMs in future). `questions[]` surfaces the clarifying questions panel when populated (driven by SP-PM-04 `clarification_policy: "conditional"`). The UI derives step icons from `step.type` (agent / hitl / subagent) — icon is not an LLM output field.

> **Orchestrator / Executor distinction [LOCKED]:** Plan-level `agentId` = the Orchestrating PM responsible for the full Work Order. Step-level `agent_id` = the Executor assigned to that individual step. These are never the same field. In future, when multiple PM-type agents exist (e.g. Procurement PM, IT PM), `agentId` becomes the PM selector — the user picks which PM runs the Work Order.

> **Storage:** The Execution Plan is held in React state during the Assign Work flow. Steps are persisted to the tasks table (Supabase JSONB) on Work Order save. The Execution Plan is not stored as a first-class deliverable record until S-DELIVER-04 builds the `deliverables` table.

---

### SP-PM-04 — Planning Stance (type: behavior)

```json
{
  "slug": "planning-behavior",
  "skill_type_slug": "behavior",
  "name": "Planning Stance",
  "description": "How the Project Manager reasons through Work Order decomposition and assignment — including when to ask clarifying questions before proceeding.",
  "objective": "Produce plans that are honest, complete, and sequenced correctly. Ask clarifying questions only when they would materially improve the plan.",
  "method": "Risk-first ordering. Steps that block other steps run first. Research before analysis. Analysis before synthesis. Synthesis before reporting. Before decomposing, assess whether requirements are clear enough to produce a quality plan — if not, ask targeted questions first.",
  "output_desc": "A correctly sequenced plan that surfaces gaps honestly. Optionally preceded by up to 3 clarifying questions if requirements are genuinely ambiguous.",
  "tone": "professional",
  "confidence": "measured",
  "traits": {
    "reasoning_style": "risk-first",
    "writing_style": "precise",
    "autonomy_level": "supervised",
    "clarification_policy": "conditional"
  },
  "guardrails": {
    "must": [
      "Surface gaps honestly — do not hide what DeepBench cannot do",
      "Sequence steps by dependency, not by arbitrary order",
      "Ask clarifying questions only when requirements are genuinely ambiguous or when clarification would materially improve step quality",
      "Maximum 3 clarifying questions — never ask if intent is already clear"
    ],
    "must_not": [
      "Never reorder steps to hide gaps",
      "Never present an incomplete plan as complete",
      "Never ask clarifying questions as a default — proceed directly when requirements are sufficient",
      "Never ask questions that could be answered by reading the Work Order again"
    ]
  },
  "technical_services": [],
  "execution_type": "ai"
}
```

---

### SP-PM-05 — Capability Registry Knowledge (type: knowledge)

```json
{
  "slug": "capability-registry-knowledge",
  "skill_type_slug": "knowledge",
  "name": "Capability Registry",
  "description": "Semantic knowledge of all capabilities available in DeepBench — what they do, which agents hold them, at what level.",
  "objective": "Know the DeepBench capability registry well enough to match free-text capability names to registry slugs accurately.",
  "method": "RAG over embedded capability records. Semantic search from step's required capability name to registry slugs.",
  "output_desc": "Matched capability slug and agent assignment, or confirmed gap.",
  "tone": "technical",
  "confidence": "assertive",
  "traits": {
    "domain": "platform-capabilities",
    "source_types": ["capability_records", "skill_profile_records", "agent_assignments"],
    "source_priority": "live-registry-first"
  },
  "guardrails": {
    "must": [
      "Only match against capabilities confirmed in the live registry",
      "Re-embed when new capabilities are added to the registry"
    ],
    "must_not": [
      "Never infer a capability exists",
      "Never match to a capability that has been removed or archived"
    ]
  },
  "technical_services": [],
  "execution_type": "ai"
}
```

---

## 7. Capability Registry — Dual Storage

Capabilities must live in two places for two different reasons:

| Layer | What Is Stored | Used By |
|-------|---------------|---------|
| **DB** (`capabilities` table) | Authoritative record — slug, name, skill profiles, agent assignments, levels | Authorization, display, storage, Chain-of-Verification |
| **RAG** (`knowledge_entries`) | Embedded capability descriptions + trait summaries | Orchestrator semantic matching — free-text names → registry slugs |

**Neither replaces the other.** DB is exact. RAG is fuzzy.

**The auto-training implication:** When a new capability is added to the DB, it must also be
embedded into the knowledge base. This means capability creation should trigger the same
extraction + embedding pipeline used for document uploads. The Orchestrator's knowledge
automatically improves when the registry grows — she can match capabilities she's never
explicitly been told about.

---

## 8. DB & Schema Impact

### Already Exists (S-SK-01 — no changes needed)
- `skill_types` — 5 type seeds ✅
- `skill_profiles` — schema exists, SP-PM-01 through SP-PM-05 need seeding
- `capabilities` — schema exists, CAP-PM-01 needs seeding
- `capability_skill_profiles` — schema exists, 5 links need seeding
- `agent_capability_assignments` — schema exists, Michelle → project-manager needs seeding

### New Seed Data Needed (S-PM-01)
| Table | New Rows |
|-------|----------|
| `skill_profiles` | SP-PM-01, SP-PM-02, SP-PM-03, SP-PM-04, SP-PM-05 |
| `capabilities` | CAP-PM-01 (project-manager) |
| `capability_skill_profiles` | 5 links (one per Skill Profile) |
| `agent_capability_assignments` | Michelle (PP-01) → project-manager |

### New Tables Needed (not yet built)
| Table | Purpose | Session |
|-------|---------|---------|
| `deliverables` | Stores all Deliverables — Execution Plans, Step Deliverables, Reflection Reports, Quality Verdicts | S-DELIVER-04 (DL-04) |
| `capability_gaps` | Logs every unmatched step — capability name requested, Work Order ID, resolution | S-PM-02 or S-DELIVER-04 |

### Embedding Pipeline Extension Needed
Capability records must be embedded into the knowledge base (RAG) when created or updated.
Currently only document uploads are embedded. This extension is required before the
Capability Assignment pass (SP-PM-02) can do semantic matching.

### Step JSONB Schema Changes
The current step schema (free text + agent name) must expand to include:
`capability_slug`, `assignment_status`, `expected_output_type`, `rationale`, `depends_on[]`

No DB migration required (steps are JSONB). But `api/plan.js` output must change.

---

## 9. Michelle Transition Path

The Project Manager Capability is the model replacement for Michelle's current hardcoded implementation.

**What the new model covers:**
- Decomposition logic (currently hand-rolled in api/plan.js) → SP-PM-01 Traits
- Assignment logic (currently not modeled) → SP-PM-02 Traits
- Output structure (currently unstructured step text) → SP-PM-03 Format Skill

**What blocks the removal of hardcoded code:**
1. `prompt-assembly.js` (AA-03) must be built — reads Skill Profiles, builds prompt. Deferred to S-INFRA-01 or earlier sprint.
2. `api/title.js` is separate — title generation is a smaller independent capability, not part of Project Manager scope.

**Clarifying questions — resolved (2026-06-19):** Previously identified as a blocker requiring SP-PM-00 (Work Order Clarification). Decision: conditional clarification is a behavioral trait, not a separate Intent Skill. SP-PM-04 (Planning Stance) now carries `clarification_policy: "conditional"` and the guardrail rules. The LLM decides whether to ask (max 3 questions) before decomposing. SP-PM-00 is not needed.

**Removal sequence:**
```
S-PM-01 — seed capability + show on Michelle's Personnel File
S-PM-02 — build prompt-assembly.js
S-PM-03 — refactor api/plan.js to use prompt-assembly + richer step schema
S-PM-04 — remove hardcoded Michelle prompt from api/plan.js
```

---

## 10. Skill Inventory Across the Full Pipeline

Distinct skills required to run the complete execution pipeline end-to-end:

**Intent Skills**
1. Work Order Decomposition — SP-PM-01
2. Capability Assignment — SP-PM-02
3. Work Order Clarification — (not yet defined; needed before Michelle hardcode can be removed)
4. Step Execution — varies by executor Capability
5. Deliverable Review — needed for Orchestrator Reflection pass
6. Quality Evaluation — needed for Judge

**Format Skills**
1. Execution Plan — SP-PM-03
2. Step Deliverable schemas — one per deliverable type (analysis_report, research_summary, etc.)
3. Reflection Report — needed for Orchestrator Reflection pass
4. Quality Scorecard — needed for Judge

**Behavior Skills**
1. Planning Stance — SP-PM-04
2. Executor reasoning — varies by executor Capability
3. Critical Review — needed for Reflection pass

**Knowledge Skills**
1. Capability Registry — SP-PM-05
2. Domain Knowledge — per executor agent (RAG over knowledge_entries)
3. Episodic Memory — past completed Work Orders (future training corpus for Orchestrator)

---

## 11. Future Capabilities Identified This Session

### JD → Capability Auto-Generation
Upload a job description → DeepBench extracts competencies, maps to Skill types,
matches to existing Skill Profiles (RAG), proposes new ones for unmatched competencies,
assembles into a Capability, assigns to a new or existing agent.
Same upload pipeline as PE-10. Output target: skill_profiles + capabilities tables instead of knowledge_entries.
See FEATURES.md: SK-12.

### PM-Initiated Capability Creation
The Orchestrator detects a capability gap during the Assignment pass. Instead of
only flagging it as generic LLM, the Orchestrator proposes what needs to be built:
draft Skill Profiles, a new Capability spec, and optionally a new Agent identity.
HITL: user approves before any record is created. On approval, the new capability
is created and embedded — closing the gap for future Work Orders.
Extends AA-38 (Agent Builder Agent) with a new trigger: internal gap detection vs. user request.
See FEATURES.md: AA-43.
