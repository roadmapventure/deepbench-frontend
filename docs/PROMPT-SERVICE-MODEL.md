# DeepBench — Prompt Service Model
# Version: v5.2 | Created: 2026-06-19 | Session: Prompt Service Design

> Canonical reference for how DeepBench assembles, optimizes, and sends prompts to an LLM.
> Read alongside: SKILL-PROFILE-MODEL.md (Skill Profile schema + Traits),
>                 ARCHITECTURE.md (Section 2 — Platform Model, Section 12 — AI Call Rules),
>                 EXECUTION-DELIVERY-MODEL.md (how prompts feed the pipeline)

---

## 0. Purpose

The Prompt Service is DeepBench's moat made executable. The platform's value — Personnel
Profiles, Skill Profiles, Capabilities, training data — only becomes a competitive advantage
when it is correctly assembled into a prompt and sent to an LLM. The Prompt Service is that
assembly, optimization, and execution layer.

Its primary job: **produce the best prompt to get the best output from the LLM.**

A secondary job: **be callable by anything** — internal DeepBench capability routes, the
future MCP layer, or external callers who want DeepBench's assembled expertise without
managing DeepBench's internal pipeline.

---

## 1. Architecture — Three Separate APIs

The Prompt Service is three independent API routes, each with a single responsibility.
They are designed to run in sequence but are independently callable.

```
┌─────────────────────────────────────────────────────────┐
│  API 1 — PROMPT CONTAINER                               │
│  api/prompt/container.js                                │
│                                                         │
│  Reads the capability and resolves what goes into       │
│  the prompt. Produces a Prompt Specification —          │
│  a blueprint of which sections are included,            │
│  in what order, with which Skill Profiles,              │
│  which LLM, and what token budget.                      │
│                                                         │
│  Input  → capability_slug, agent_id, task_context       │
│  Output → Prompt Specification (structured object)      │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  API 2 — PROMPT BUILDER                                 │
│  api/prompt/builder.js                                  │
│                                                         │
│  Takes the Specification. Fetches data for each         │
│  section that requires it (RAG, agent_configs,          │
│  skill_profiles). Renders sections into text.           │
│  Optimizes against the token budget.                    │
│                                                         │
│  Input  → Prompt Specification + task_context           │
│  Output → Assembled, optimized system prompt string     │
│           + section-by-section debug object             │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  API 3 — PROMPT SENDER                                  │
│  api/prompt/sender.js                                   │
│                                                         │
│  Takes the assembled prompt. Sends to the LLM.          │
│  Parses the response against the Format Skill's         │
│  output contract. Writes the Deliverable.               │
│  Logs to ai_activity_log. Routes response back          │
│  to the requesting agent or service.                    │
│                                                         │
│  Input  → Assembled prompt + LLM config + Format Skill  │
│  Output → Parsed Deliverable + raw LLM response         │
└─────────────────────────────────────────────────────────┘
```

**Why three separate APIs:**
- An MCP caller can stop at the Builder — they receive the assembled prompt and send it
  to their own LLM, without touching DeepBench's Sender.
- An internal route can call all three in sequence for a full end-to-end execution.
- Each API is independently testable, independently cacheable, independently versioned.

---

## 2. Input Schema — What the Caller Passes

All inputs are optional. The service degrades gracefully based on what is provided.

```
agent_id          (optional) — loads Credentials from Personnel Profile + resolves
                               the agent's assigned Capabilities
capability_slug   (optional) — loads Skill Profiles, LLM assignment, token budget
                               for this specific Capability
task_context      (optional) — the work order goal, step description, or question
                               the LLM is being asked to address
```

### Resolution Rules

| What caller passes | What the service does |
|--------------------|-----------------------|
| `agent_id` + `capability_slug` + `task_context` | Full prompt: Credentials + Capability Skills + task context |
| `agent_id` + `task_context` | Credentials + agent's default Capability + task context |
| `capability_slug` + `task_context` | Capability Skills only — no Credentials (MCP caller case) |
| `task_context` only | Generic LLM, no profile, no Skills — L1 baseline |
| Nothing | Returns error — task_context is the minimum meaningful input |

**L1 Baseline rule:** If no `agent_id` and no `capability_slug` are passed, the service
uses DeepBench's default LLM (Claude Haiku) with no profile context. This is consistent
with ARCHITECTURE.md Section 2: "A Competency with no Skill Profiles still executes
using generic LLM." The Prompt Service enforces the same principle — it never blocks
execution, it enriches it.

---

## 3. The Input Model — Credentials / Skills / Deliverable

The three groups of content the Container reads and the Builder assembles:

### Credentials
Everything that defines who this agent is. Source: Personnel Profile / `agent_configs` table.

| Data | Source | Prompt section |
|------|--------|----------------|
| Title, mission, role | `agents.js` Layer 1 | Identity section |
| Philosophy, epistemology | Identity Skill Profile (`skill_profiles`) | Identity section |
| Reasoning style, tone, autonomy | Behavior Skill Profile (`skill_profiles`) | Behavior section |
| Guardrails, output rules | `agent_configs` → Behavior/Identity Skill guardrails | Guardrails section |
| Resume / work history | `agent_configs` type=resume (future) | Behavior section |
| Playbook | `agent_configs` type=guardrail | Guardrails section |

Credentials are standing data — they are the same regardless of task. They are loaded once
per agent per session and can be cached.

### Skills
The Skill Profiles assigned to this agent via their Capability. Each Skill Profile is
self-describing — its `technical_services[]` field declares what it needs to execute.

| Skill Type | What it needs | Prompt section |
|-----------|---------------|----------------|
| Identity | Reads from Credentials | Identity |
| Behavior | Reads from Credentials | Behavior |
| Knowledge | RAG retrieval from `knowledge_entries` via pgvector | Knowledge / Background |
| Intent | Reads from `skill_profiles.traits` (sections, instructions) | Intent |
| Format | Reads from `skill_profiles.traits` (output_type, structure) | Format instruction |

**Sections are capability-defined.** If a Skill type is not assigned to this Capability,
that section is omitted from the prompt. No `sections_override` flag is needed — a
partial prompt is simply a Capability with fewer Skills assigned.

### Deliverable
The output contract. Defined by the Format Skill Profile assigned to the Capability.

- `traits.output_type` — html / pdf / json / dashboard / structured
- `traits.section_structure` — titled-sections / flat / schema-driven
- `guardrails.must` / `must_not` — output-level constraints

The Format Skill's output contract is the interface the Sender uses to parse the LLM
response. If the LLM response does not conform, the Sender handles retry — not the caller.

---

## 4. LLM Assignment

LLM provider, model, and token budget are properties of the **Skill Profile** — not of
the Capability or the agent. This means different Skills within the same Capability can
use different LLMs and different budgets.

| Property | Location | Notes |
|----------|----------|-------|
| `llm_provider` | `skill_profiles.llm_provider` | 'anthropic' · 'openai' · future: others |
| `llm_model` | `skill_profiles.llm_model` | 'claude-haiku-4-5' · 'claude-sonnet-4-6' · etc. |
| `max_tokens` | `skill_profiles.max_tokens` | Token budget ceiling for this Skill's LLM call |
| `api_key_source` | `skill_profiles.api_key_source` | 'platform' · 'byok' |

**DeepBench default** (when no Skill Profile specifies an LLM):
- Provider: Anthropic
- Model: Claude Haiku (classification, routing, short tasks) / Claude Sonnet (reasoning,
  planning, long-form) — selected by the Builder based on task complexity
- Token budget: 4,000 tokens (Haiku) / 8,000 tokens (Sonnet)

**MCP caller LLM override:** An MCP caller who stops at the Builder receives the assembled
prompt and the recommended LLM config. They may ignore the recommendation and send the
prompt to any LLM they choose. The Builder always returns both.

---

## 5. API 1 — Prompt Container (Specification)

**Route:** `api/prompt/container.js`
**Job:** Read the capability and agent. Produce a Prompt Specification.
**Does NOT:** fetch RAG, call Claude, write anything to the DB.

### Input
```json
{
  "agent_id": "pp-01",
  "capability_slug": "project-manager",
  "task_context": "Analyze vendor concentration in Austin FY2025 procurement data"
}
```

### Output — Prompt Specification
```json
{
  "sections": [
    {
      "slug": "identity",
      "label": "ROLE & IDENTITY",
      "skill_profile_slug": "pm-identity",
      "source": "credentials",
      "required": true,
      "order": 1
    },
    {
      "slug": "behavior",
      "label": "BEHAVIOR & APPROACH",
      "skill_profile_slug": "planning-behavior",
      "source": "credentials",
      "required": true,
      "order": 2
    },
    {
      "slug": "knowledge",
      "label": "BACKGROUND KNOWLEDGE",
      "skill_profile_slug": "capability-registry-knowledge",
      "source": "rag",
      "required": false,
      "order": 3
    },
    {
      "slug": "intent",
      "label": "TASK INSTRUCTION",
      "skill_profile_slug": "work-order-decomposition",
      "source": "skill_profile_traits",
      "required": true,
      "order": 4
    },
    {
      "slug": "format",
      "label": "OUTPUT FORMAT",
      "skill_profile_slug": "execution-plan",
      "source": "skill_profile_traits",
      "required": true,
      "order": 5
    },
    {
      "slug": "guardrails",
      "label": "CONSTRAINTS & GUARDRAILS",
      "skill_profile_slug": "planning-behavior",
      "source": "skill_profile_guardrails",
      "required": true,
      "order": 6
    }
  ],
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "max_tokens": 4000,
    "api_key_source": "platform"
  },
  "agent_id": "pp-01",
  "capability_slug": "project-manager",
  "task_context": "Analyze vendor concentration in Austin FY2025 procurement data"
}
```

The Specification is the sole input to the Builder. Nothing in the Builder hardcodes
section order, section names, or section inclusion — those all come from the Specification.

---

## 6. API 2 — Prompt Builder (Assembly + Optimization)

**Route:** `api/prompt/builder.js`
**Job:** Take the Specification. Fetch what needs fetching. Render. Optimize.
**Does NOT:** call Claude for the main task. Does NOT write to the DB.

### Three sub-steps (run in this order):

**Step 1 — Fetch**
For each section in the Specification, the Builder reads the `source` field and fetches:
- `source: "credentials"` → reads from `agent_configs` or `skill_profiles` named columns
- `source: "rag"` → runs vector search against `knowledge_entries` scoped to `agent_id`
- `source: "skill_profile_traits"` → reads `skill_profiles.traits` jsonb
- `source: "skill_profile_guardrails"` → reads `skill_profiles.guardrails` jsonb

Fetch calls run in parallel where sections have no dependency on each other.

**Step 2 — Render**
Each fetched section is rendered into text with a section header:
```
=== ROLE & IDENTITY ===
[content]

---

=== BACKGROUND KNOWLEDGE ===
[content]

---
```
Sections with empty content (e.g. RAG returns nothing, or a Skill has no traits set) are
omitted from the rendered output. A required section with empty content logs a warning
but does not block assembly.

**Step 3 — Optimize**
The rendered prompt is reviewed against the token budget from the Specification.

- If assembled prompt is within budget → pass through unchanged
- If assembled prompt exceeds budget → compress in priority order:
  1. Truncate Knowledge (RAG) section first — least precise content
  2. Summarize Behavior section if still over budget
  3. Never truncate Intent, Format, or Guardrails sections — these are the output contract

The REFLECT pattern (Haiku pre-run synthesis) is an optional optimization step:
when `reflect: true` is passed, the Builder runs a Haiku call after render to produce
an Execution Plan section from the assembled context. This becomes an additional section
inserted between Knowledge and Intent.

### Output
```json
{
  "system_prompt": "=== ROLE & IDENTITY ===\n...\n\n---\n\n=== BACKGROUND KNOWLEDGE ===\n...",
  "sections": {
    "identity": "...",
    "behavior": "...",
    "knowledge": "...",
    "intent": "...",
    "format": "...",
    "guardrails": "..."
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "max_tokens": 4000
  },
  "debug": {
    "sections_assembled": 6,
    "sections_omitted": [],
    "token_estimate": 1840,
    "token_budget": 4000,
    "budget_used_pct": 46,
    "reflect_used": false,
    "rag_retrieved": true,
    "rag_chunks": 5
  }
}
```

**MCP stop point:** An external MCP caller receives this output and sends `system_prompt`
to their own LLM with their own messages array. They use `llm` as a recommendation only.
They do not call the Sender.

---

## 7. API 3 — Prompt Sender (Execute + Parse + Deliver)

**Route:** `api/prompt/sender.js`
**Job:** Send the assembled prompt to the LLM. Parse the response. Write the Deliverable.
Log. Route back to caller.

### Three sub-steps:

**Step 1 — Send**
Calls the LLM using the `llm` config from the Builder output.
- Passes `system_prompt` as the system message
- Passes `messages` array from the caller (conversation history or single user turn)
- Passes `tools` if the Capability's Skill Profiles declare Tool Use as a Technical Service
- Handles streaming when the Capability declares PAT-03 (Streaming) in `technical_services`

**Step 2 — Parse**
Reads the Format Skill's output contract from the Specification.
- If `output_type: "json"` or `"structured"` → validates response against expected schema
- If response does not conform → single retry with explicit schema reminder appended
- If retry fails → returns raw response with `parse_error: true` flag (caller decides)
- If `output_type: "html"` → passes through — no structural validation

**Step 3 — Deliver**
- Writes Deliverable record to `deliverables` table with full lineage:
  `agent_id`, `capability_slug`, `skill_profile_slug`, `level`, `step_id`, `work_order_id`
- Logs to `ai_activity_log` via `logAICall()` — no exceptions
- Returns parsed response to the requesting agent or service

### Output
```json
{
  "deliverable_id": "uuid",
  "content": { ... },
  "raw_response": { ... },
  "parse_error": false,
  "log_id": "uuid"
}
```

---

## 8. MCP Exposure

The Prompt Service is designed to be fully MCP-accessible. Each of the three APIs becomes
an MCP tool:

| MCP Tool | Wraps | Use case |
|----------|-------|----------|
| `deepbench.prompt.specify` | Container | "What would a project-manager prompt look like?" |
| `deepbench.prompt.build` | Builder | "Build me the assembled prompt for this capability" |
| `deepbench.prompt.send` | Sender | "Build and execute — give me the Deliverable" |

An external agent (outside DeepBench) can call `deepbench.prompt.build` with a
`capability_slug`, receive an assembled prompt, and send it to its own LLM. It receives
DeepBench's expertise — the Skill Profiles, the Credentials, the RAG context — without
being inside the DeepBench execution environment.

This is the MCP monetization path: external systems pay to consume DeepBench's assembled
capabilities as prompts, not just as end-to-end responses.

---

## 9. What Is Not in the Prompt Service

These are explicitly excluded — they belong elsewhere:

| Concern | Where it lives |
|---------|---------------|
| RAG vector search | `api/capabilities/rag-query.js` (called BY the Builder, not inside it) |
| Deliverable storage schema | `DELIVERABLE-MODEL.md` + `deliverables` table |
| LLM adapter (vendor HTTP calls) | `api/adapters/anthropic.js`, `api/adapters/openai.js` |
| Agent routing (which agent gets this task) | `api/capabilities/agent-routing.js` |
| Streaming SSE to frontend | Sender handles, but SSE protocol is a frontend concern |
| HITL gate | Orchestrator Capability (CAP-PM-01) — not the Prompt Service |

---

## 10. Open Design Decisions (Builder + Sender sessions)

The following are confirmed in principle but require their own design sessions before
kickoff docs are written:

| Decision | Status |
|----------|--------|
| Builder token optimization — exact compression algorithm | Design session required |
| REFLECT — always-on vs capability-declared vs caller flag | Design session required |
| Sender retry logic — max retries, backoff, partial parse handling | Design session required |
| Sender streaming — when SSE is used vs batch return | Design session required |
| Container caching — Spec caching strategy (same capability + agent = cache hit) | Design session required |
| `max_tokens` addition to `skill_profiles` DB schema | Schema update required (S-INFRA-01 or earlier) |

---

## 11. Feature IDs

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-03 | Prompt Container API (`api/prompt/container.js`) — reads capability + agent, resolves Prompt Specification (sections, LLM config, token budget). No fetching, no LLM calls. | ❌ Missing | S-PM-02 |
| AA-43 | Prompt Builder API (`api/prompt/builder.js`) — takes Prompt Specification, fetches content per section source type (credentials / RAG / skill_profile_traits), renders sections, optimizes against token budget. Returns assembled system prompt + debug object. | ❌ Missing | S-PM-03 |
| AA-44 | Prompt Sender API (`api/prompt/sender.js`) — takes assembled prompt, calls LLM via adapter, parses response against Format Skill output contract, writes Deliverable, logs to ai_activity_log, routes response to caller. | ❌ Missing | S-PM-04 |
