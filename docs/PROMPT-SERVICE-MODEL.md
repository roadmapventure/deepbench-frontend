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
**Job:** Read the capability and agent. Load all stored content. Produce a fully-loaded
Prompt Specification that the Builder can execute without touching the DB again.
**Does NOT:** fetch RAG, call Claude, write anything to the DB.

### What the Container loads

The Container is responsible for ALL stored data reads. It passes content directly in
the Specification so the Builder is fully decoupled from the data model. The Builder
never reads Supabase directly — it only executes runtime operations declared in the Spec.

| Source type | What Container does | What Builder does |
|-------------|--------------------|--------------------|
| `stored` | Reads and embeds content in Spec | Renders section from embedded content |
| `rag` | Passes fetch instruction only (needs task_context at runtime) | Executes RAG query, receives chunks |
| `reflect` | Passes instruction (declared via `technical_services`) | Runs Haiku call, inserts section |
| `intelligent-synthesis` | Passes instruction (declared via `technical_services`) | Runs Haiku rewrite of full prompt |

### Input
```json
{
  "agent_id": "pp-01",
  "capability_slug": "project-manager",
  "task_context": "Analyze vendor concentration in Austin FY2025 procurement data"
}
```

### Output — Prompt Specification

The Specification carries either embedded content (`content` field populated) or a fetch
instruction (`fetch_instruction` field populated). Never both. Never neither.

```json
{
  "sections": [
    {
      "slug": "identity",
      "label": "ROLE & IDENTITY",
      "skill_profile_slug": "pm-identity",
      "type": "stored",
      "content": "You are Michelle Manning, Project Manager...",
      "required": true,
      "order": 1
    },
    {
      "slug": "behavior",
      "label": "BEHAVIOR & APPROACH",
      "skill_profile_slug": "planning-behavior",
      "type": "stored",
      "content": "Approach every Work Order by first decomposing...",
      "required": true,
      "order": 2
    },
    {
      "slug": "knowledge",
      "label": "BACKGROUND KNOWLEDGE",
      "skill_profile_slug": "capability-registry-knowledge",
      "type": "rag",
      "fetch_instruction": {
        "method": "rag",
        "agent_id": "pp-01",
        "query_from": "task_context",
        "match_count": 5,
        "scope": "agent"
      },
      "required": false,
      "order": 3
    },
    {
      "slug": "execution-plan",
      "label": "EXECUTION PLAN",
      "skill_profile_slug": "planning-behavior",
      "type": "reflect",
      "fetch_instruction": {
        "method": "reflect",
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 1024,
        "inserts_after": "knowledge",
        "declared_by": "planning-behavior"
      },
      "required": false,
      "order": 4
    },
    {
      "slug": "intent",
      "label": "TASK INSTRUCTION",
      "skill_profile_slug": "work-order-decomposition",
      "type": "stored",
      "content": "Decompose the Work Order into discrete executable steps...",
      "required": true,
      "order": 5
    },
    {
      "slug": "format",
      "label": "OUTPUT FORMAT",
      "skill_profile_slug": "execution-plan",
      "type": "stored",
      "content": "Return a JSON object with the following fields: ...",
      "required": true,
      "order": 6
    },
    {
      "slug": "guardrails",
      "label": "CONSTRAINTS & GUARDRAILS",
      "skill_profile_slug": "planning-behavior",
      "type": "stored",
      "content": "Never assign a step to an agent who lacks the required capability...",
      "required": true,
      "order": 7
    }
  ],
  "synthesis": {
    "enabled": true,
    "model": "claude-haiku-4-5-20251001",
    "max_tokens": 2048,
    "declared_by": "work-order-decomposition"
  },
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

**Key rule:** The Specification is the sole input to the Builder. Nothing in the Builder
hardcodes section order, section names, section inclusion, or fetch behavior. Everything
is declared in the Specification.

---

## 6. API 2 — Prompt Builder (Fetch + Render + REFLECT + Synthesis)

**Route:** `api/prompt/builder.js`
**Job:** Execute the Prompt Specification. Fetch runtime data. Render all sections.
Run REFLECT if declared. Run intelligent synthesis if declared. Return the optimized prompt.
**Does NOT:** read Skill Profiles or agent_configs directly. Does NOT write to the DB.
**Makes AI calls:** Yes — REFLECT (Haiku) and intelligent synthesis (Haiku) when declared.

### Four steps — run in this order

---

#### Step 1 — Fetch

The Builder iterates the Specification's `sections` array. For each section:

- `type: "stored"` → content is already in the Spec. No fetch needed. Pass to render.
- `type: "rag"` → execute the `fetch_instruction`: run vector search against
  `knowledge_entries` using `task_context` as the query string. Returns ranked chunks.
  Scope: `agent_id` scoped by default. `match_count` from the fetch instruction.
- `type: "reflect"` → skip for now. Handled in Step 3 after render.
- `type: "intelligent-synthesis"` → skip. Handled in Step 4.

RAG fetches run in parallel if multiple Knowledge sections exist in one Specification.
All other fetches are parallel by default. Sections with no inter-dependency never wait.

**Fetch failure behavior:**
- Required section fetch fails → log error, use empty string, mark `fetch_error: true`
- Optional section fetch fails → omit section silently, log warning
- Never block prompt assembly on a fetch failure

---

#### Step 2 — Render

Each section with resolved content is rendered into a text block:

```
=== ROLE & IDENTITY ===
You are Michelle Manning, Project Manager...

---

=== BACKGROUND KNOWLEDGE ===
[RAG chunks joined by newline]

---

=== TASK INSTRUCTION ===
Decompose the Work Order into discrete executable steps...

---
```

**Render rules:**
- Section header format: `=== LABEL ===` (all caps, matched to `section.label`)
- Section separator: `\n\n---\n\n`
- Sections with empty content after fetch are omitted — required or not
- Section order follows `section.order` from the Specification — never hardcoded in Builder

---

#### Step 3 — REFLECT

Runs only if one or more sections in the Specification have `type: "reflect"`.

**What REFLECT does:**
Takes the rendered prompt so far (all `stored` and `rag` sections assembled), plus
`task_context`, and runs a Haiku call:

```
Prompt to Haiku:
  "You are [agent identity]. Review your background knowledge and the task below.
   Write a numbered execution plan that reflects your role, incorporates relevant
   knowledge, and addresses this specific task concretely."

  [rendered identity + behavior + knowledge sections]
  [task_context]
```

Haiku returns a numbered execution plan. This becomes the content of the `execution-plan`
section, inserted at the `order` position declared in the Specification.

**REFLECT is declared on a Skill Profile** via `technical_services: ["reflect"]`.
The Container reads this and adds the reflect section to the Specification.
Builder checks `type: "reflect"` — if present, runs the Haiku call. If not present,
skips entirely. REFLECT never runs automatically.

After REFLECT, the rendered prompt is updated with the execution plan section inserted
at the correct position.

---

#### Step 4 — Intelligent Synthesis

Runs only if `synthesis.enabled: true` in the Specification.

**What synthesis does:**
Takes the full rendered prompt (all sections including REFLECT output if present) and
runs a Haiku rewrite call against the token budget:

```
Prompt to Haiku:
  "You are a prompt optimization engine. The prompt below will be sent to an AI agent
   to complete a task. Rewrite it to be maximally clear, coherent, and efficient.
   Remove redundancy. Tighten language. Preserve all factual content, all constraints,
   and all output format instructions exactly.
   The rewritten prompt must be under [max_tokens] tokens.
   Do not add new instructions. Do not remove guardrails or format requirements."

  [full rendered prompt]
```

Haiku returns a rewritten system prompt string. This replaces the rendered prompt
as the Builder's output. The section-by-section debug object is preserved from the
pre-synthesis render — it reflects what went in, not what came out.

**Synthesis is declared on a Skill Profile** via `technical_services: ["intelligent-synthesis"]`.
The Intent Skill Profile is the natural home for this declaration — it represents the
cognitive operation the agent is performing and is best positioned to declare that the
full assembled prompt should be synthesized before execution.

**Synthesis runs last** — it sees the complete prompt including REFLECT output.
It never runs before REFLECT.

**Synthesis is a rewrite, not a filter.** It does not score-and-select sections.
It rewrites the whole assembled prompt as a coherent unit. The token budget is passed
as a hard constraint inside the synthesis prompt — Haiku is responsible for honoring it.

---

### Builder Output

```json
{
  "system_prompt": "You are Michelle Manning... [full optimized prompt string]",
  "sections": {
    "identity": "You are Michelle Manning, Project Manager...",
    "behavior": "Approach every Work Order by first decomposing...",
    "knowledge": "[RAG chunks]",
    "execution-plan": "1. Review the Work Order goal...\n2. Identify required capabilities...",
    "intent": "Decompose the Work Order into discrete executable steps...",
    "format": "Return a JSON object with the following fields: ...",
    "guardrails": "Never assign a step to an agent who lacks the required capability..."
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "max_tokens": 4000,
    "api_key_source": "platform"
  },
  "debug": {
    "sections_assembled": 7,
    "sections_omitted": [],
    "fetch_errors": [],
    "rag_retrieved": true,
    "rag_chunks": 5,
    "reflect_ran": true,
    "reflect_model": "claude-haiku-4-5-20251001",
    "reflect_tokens_used": 312,
    "synthesis_ran": true,
    "synthesis_model": "claude-haiku-4-5-20251001",
    "synthesis_tokens_used": 480,
    "token_estimate_pre_synthesis": 2940,
    "token_estimate_post_synthesis": 1820,
    "token_budget": 4000,
    "budget_used_pct": 46
  }
}
```

**MCP stop point:** An external MCP caller receives this output and sends `system_prompt`
to their own LLM with their own messages array. They use `llm` as a recommendation only.
They do not need to call the Sender. The assembled prompt is a self-contained artifact.

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
