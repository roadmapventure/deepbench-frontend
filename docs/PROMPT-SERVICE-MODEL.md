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
│  Service 1 — DB ASSEMBLY                                │
│  api/prompt/db-assembly.js                              │
│                                                         │
│  Reads the capability and resolves what goes into       │
│  the prompt. Produces a Prompt Request —          │
│  a blueprint of which sections are included,            │
│  in what order, with which Skill Profiles,              │
│  which LLM, and what token budget.                      │
│                                                         │
│  Input  → capability_slug, agent_id, task_context       │
│  Output → Prompt Request (structured object)      │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Service 2 — AI ENRICHMENT                              │
│  api/prompt/ai-enrichment.js                            │
│                                                         │
│  Takes the Specification. Fetches data for each         │
│  section that requires it (RAG, agent_configs,          │
│  skill_profiles). Renders sections into text.           │
│  Optimizes against the token budget.                    │
│                                                         │
│  Input  → Prompt Request + task_context           │
│  Output → Assembled, optimized system prompt string     │
│           + section-by-section debug object             │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Service 3 — REQUEST & RECEIVABLE                       │
│  api/prompt/request-receivable.js                       │
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

## 5. Service 1 — DB Assembly

**Route:** `api/prompt/db-assembly.js`
**Job:** Read the capability and agent. Load all stored content. Produce a fully-loaded
Prompt Request that AI Enrichment can execute without touching the DB again.
**Does NOT:** fetch RAG, call Claude, write anything to the DB.

### What the Container loads

The Container is responsible for ALL stored data reads. It passes content directly in
the Specification so the Builder is fully decoupled from the data model. The Builder
never reads Supabase directly — it only executes runtime operations declared in the Spec.

| Source type | What Container does | What Builder does |
|-------------|--------------------|--------------------|
| `stored` | Reads and embeds content in Prompt Request | Renders section from embedded content |
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

### Output — Prompt Request

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

**Key rule:** The Prompt Request is the sole input to AI Enrichment. Nothing in AI Enrichment
hardcodes section order, section names, section inclusion, or fetch behavior. Everything
is declared in the Prompt Request.

---

## 6. Service 2 — AI Enrichment (Fetch + Render + REFLECT + Synthesis)

**Route:** `api/prompt/ai-enrichment.js`
**Job:** Execute the Prompt Request. Fetch runtime data. Render all sections.
Run REFLECT if declared. Run intelligent synthesis if declared. Return the optimized prompt.
**Does NOT:** read Skill Profiles or agent_configs directly. Does NOT write to the DB.
**Makes AI calls:** Yes — REFLECT (Haiku) and intelligent synthesis (Haiku) when declared.
**Note:** All platform AI patterns always run regardless of whether DB content was provided.
RAG always runs — scoped to agent if available, capability if available, platform-wide if neither.

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

The Builder output carries a `format_contract` field extracted from the Format Skill traits.
This gives the Sender everything it needs without going back to the Specification or the DB.

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
  "format_contract": {
    "output_type": "json",
    "skill_profile_slug": "execution-plan",
    "schema": {
      "type": "object",
      "properties": {
        "planSummary": { "type": "string" },
        "agentId": { "type": "string" },
        "agentReason": { "type": "string" },
        "steps": { "type": "array" },
        "questions": { "type": "array" }
      }
    }
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

## 7. Service 3 — Request & Receivable (Send + Parse + Deliver)

**Route:** `api/prompt/request-receivable.js`
**Job:** Take the assembled prompt from AI Enrichment. Call the LLM. Parse the response
against the Format Skill output contract. Write the Deliverable. Log. Route back to caller.
**Does NOT:** read Skill Profiles, agent_configs, or the Prompt Request directly.
**Makes AI calls:** Yes — one main LLM call. One retry call if parse fails.

### Input

```json
{
  "builder_output":   { ... },       // full Builder output object
  "messages":         [ ... ],       // conversation history or single user turn from caller
  "step_id":          "uuid",        // optional — null for MCP callers
  "work_order_id":    "uuid",        // optional — null for MCP callers
  "stream":           true           // default true; auto-overridden by Sender when needed
}
```

---

### Three steps — run in this order

---

#### Step 1 — Send

The Sender calls the LLM using the `llm` config from the Builder output.

**Streaming behavior — default true, auto-overridden:**

| `format_contract.output_type` | Streaming |
|-------------------------------|-----------|
| `html` | `true` — text streams token by token to the UI |
| `docx` / `pdf` | `true` — prose streams, then packaged after completion |
| `json` / `dashboard` | `false` — tool_choice returns a complete block; streaming adds no value |
| MCP caller (`stream: false` passed) | `false` — batch JSON returned |

The Sender overrides the caller's `stream` flag automatically when `output_type` is
`json` or `dashboard`. The caller does not need to know about this — it always passes
`stream: true` as the default and the Sender does the right thing.

**Structured output (json / dashboard):**
When `format_contract.output_type` is `json` or `dashboard`, the Sender:
- Passes the `format_contract.schema` to the LLM as a tool definition
- Sets `tool_choice: { type: "any" }` to force the LLM to use it
- This is the same pattern as `plan.js` today — tool_choice for the PM Execution Plan

**Tool use (capability-declared):**
If a Skill Profile in the Capability declares `technical_services: ["tool-use"]`,
the Sender passes additional tool definitions from the Specification alongside the
format schema. Format tool and capability tools are separate — both are passed.

**What the Sender passes to the LLM adapter:**
```
system:      builder_output.system_prompt
messages:    caller's messages array
tools:       [format_contract.schema as tool def] + [any capability-declared tools]
tool_choice: { type: "any" }   ← only when output_type is json/dashboard
max_tokens:  builder_output.llm.max_tokens
model:       builder_output.llm.model
stream:      resolved streaming flag (after auto-override)
```

All LLM calls go through `api/adapters/anthropic.js` (or the appropriate vendor adapter).
No direct vendor API calls inside the Sender.

---

#### Step 2 — Parse

The Sender reads `format_contract.output_type` and handles the response accordingly:

**`output_type: "json"` or `"dashboard"`**
- Extracts the tool_use block from the LLM response
- Validates the `input` object against `format_contract.schema`
- If valid → pass to Step 3
- If invalid → single retry: append a message to the messages array and call again:
  ```
  { role: "user", content: "Your previous response did not match the required format.
    Return the response again conforming exactly to this schema: [schema as JSON string]" }
  ```
- If retry also fails → return raw response with `parse_error: true`. Caller decides.

**`output_type: "html"`**
- Extracts text content from the LLM response
- No structural validation — passes through as-is
- No retry logic for HTML — free text has no contract to validate against

**`output_type: "docx"` / `"pdf"`**
- Extracts prose text from the LLM response
- Passes to a document generation service (outside the Sender's scope)
- Sender returns the prose text and a `requires_packaging: true` flag
- Document packaging is a separate capability route — not the Sender's job

**Streaming responses:**
When streaming is active, parsing happens on the completed stream — the Sender buffers
the full response before validating. The UI sees tokens arriving progressively; the
Sender validates the complete result before writing the Deliverable.

---

#### Step 3 — Deliver

After successful parse, the Sender writes and logs.

**Write Deliverable:**
```sql
INSERT INTO deliverables (
  id, tenant_id, work_order_id, step_id, competency_id,
  skill_profile_slug, type, title,
  content, format, status,
  level, is_final,
  created_at
)
```

| Field | Value |
|-------|-------|
| `work_order_id` | from caller input (null if MCP) |
| `step_id` | from caller input (null if MCP) |
| `competency_id` | `agent_id` from Builder output |
| `skill_profile_slug` | `format_contract.skill_profile_slug` |
| `type` | derived from `format_contract.output_type` |
| `content` | parsed response |
| `format` | `format_contract.output_type` |
| `status` | `draft` (default — HITL or Orchestrator promotes to approved) |

**Log to ai_activity_log:**
```js
logAICall({
  capability_slug:     builder_output.capability_slug,
  skill_profile_slug:  format_contract.skill_profile_slug,
  agent_id:            builder_output.agent_id,
  step_id:             step_id || null,
  work_order_id:       work_order_id || null,
  deliverable_id:      new deliverable uuid,
  model:               builder_output.llm.model,
  provider:            builder_output.llm.provider,
  tokens_in:           from LLM response usage object,
  tokens_out:          from LLM response usage object,
  cost_usd:            calculated from tokens + model pricing,
  latency_ms:          time from Send to parse complete,
  streamed:            resolved streaming flag,
  parse_error:         false / true,
  reflect_tokens:      builder_output.debug.reflect_tokens_used || 0,
  synthesis_tokens:    builder_output.debug.synthesis_tokens_used || 0
})
```

Note: `reflect_tokens` and `synthesis_tokens` are logged here alongside the main call
so the full cost of one Sender execution (including Builder's Haiku calls) is visible
in a single `ai_activity_log` row. Builder Haiku calls are not logged separately —
they are overhead of the Sender execution, not standalone capability calls.

---

### Sender Output

```json
{
  "deliverable_id": "uuid",
  "content": {
    "planSummary": "...",
    "agentId": "pp-01",
    "agentReason": "...",
    "steps": [ ... ],
    "questions": []
  },
  "format": "json",
  "status": "draft",
  "raw_response": { ... },
  "parse_error": false,
  "streamed": false,
  "log_id": "uuid",
  "debug": {
    "model": "claude-sonnet-4-6",
    "tokens_in": 1820,
    "tokens_out": 640,
    "cost_usd": 0.0031,
    "latency_ms": 2140,
    "retry_used": false
  }
}
```

---

## 8. MCP Exposure

The Prompt Service is designed to be fully MCP-accessible. Each of the three APIs becomes
an MCP tool:

| MCP Tool | Wraps | Use case |
|----------|-------|----------|
| `deepbench.prompt.db-assembly` | DB Assembly | "What would a project-manager prompt look like?" |
| `deepbench.prompt.ai-enrichment` | AI Enrichment | "Build me the assembled prompt for this capability" |
| `deepbench.prompt.request-receivable` | Request & Receivable | "Build and execute — give me the Deliverable" |

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

## 10. Open Design Decisions (future sessions)

Resolved decisions are marked ✅. Remaining open items require their own design sessions
before kickoff docs are written.

| Decision | Status |
|----------|--------|
| REFLECT — declared on Skill Profile via `technical_services: ["reflect"]` | ✅ Locked |
| Intelligent synthesis — declared on Intent Skill Profile via `technical_services: ["intelligent-synthesis"]` — Haiku rewrite, runs last | ✅ Locked |
| Builder: Container feeds all stored content directly — Builder never reads DB | ✅ Locked |
| Sender streaming — default true; auto-overridden to false for json/dashboard; MCP callers pass false explicitly | ✅ Locked |
| Sender structured output — driven by `format_contract.output_type`; json/dashboard use tool_choice + schema | ✅ Locked |
| Sender retry — single append retry on parse failure; raw response + parse_error flag if retry also fails | ✅ Locked |
| Sender lineage — step_id + work_order_id from caller; null for MCP callers | ✅ Locked |
| Builder Haiku call costs (REFLECT + synthesis) logged as overhead on Sender's ai_activity_log row | ✅ Locked |
| docx/pdf packaging — Sender returns prose + requires_packaging flag; document service is separate | ✅ Locked |
| DB Assembly is a faithful collector — no adjudication, no AI, no writes. Organized by source: agent_configs / capabilities / skill_profiles / task_context | ✅ Locked |
| DB Assembly section priority order: Format → Intent → Identity → Behavior → Knowledge → Guardrails | ✅ Locked |
| DB Assembly inputs: tenant_id (required, always explicit), task_context (required), agent_id (optional), capability_slug (optional) | ✅ Locked |
| DB Assembly degradation: works with whatever data is available — no blocking errors on missing Skills, agent, or capability | ✅ Locked |
| DB Assembly: duplicative/conflicting content (e.g. guardrails in multiple sources) passed through intact — AI Enrichment resolves | ✅ Locked |
| AI Enrichment always runs — even with no DB content. All platform patterns run; RAG always runs scoped to agent/capability/platform-wide | ✅ Locked |
| Service terminology: Container → DB Assembly, Builder → AI Enrichment, Sender → Request & Receivable, Specification → Prompt Request | ✅ Locked |
| DB Assembly caching — same capability + agent = cache hit | Design session required |
| `max_tokens` / `llm_model` / `llm_provider` columns added to `skill_profiles` table in Supabase | Schema migration required (SK-17, S-PM-02) |
| Two-speed routing — fast path (Haiku, top 3 RAG) vs deep path (Sonnet, top 10 RAG) declared at Capability level | Design session required (AA-04) |
| AI Enrichment: multiple Knowledge Skill Profiles — merge strategy for multiple RAG result sets | Design session required |
| Multi-LLM conflict resolution — when multiple Skill Profiles declare different LLM configs | Future feature (platform defaults handle for now) |
| User-declared priority in task_context — formal parsing of priority signals embedded in the task string | Future feature (AI Enrichment surfaces naturally for now) |
| DB Assembly relevance flagging — lightweight AI annotation on package sections to guide AI Enrichment prioritization | Future feature (after pipeline is proven) |
| RAG query expansion — using AI to expand task_context into a richer search query before hitting the knowledge store | Future feature (design session required) |

---

## 11. Feature IDs

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-03 | DB Assembly (`api/prompt/db-assembly.js`) — reads capability_slug + agent_id, queries agent_configs / capabilities / skill_profiles, returns Prompt Request organized by source. No AI calls, no writes. Degrades gracefully on missing data. | ❌ Missing | S-PM-02 |
| AA-43 | AI Enrichment (`api/prompt/ai-enrichment.js`) — takes Prompt Request, executes platform patterns: RAG (agent/capability/platform-wide scope), REFLECT, intelligent synthesis. Resolves conflicts and duplication. Returns assembled system prompt + debug object. | ❌ Missing | S-PM-03 |
| AA-44 | Request & Receivable (`api/prompt/request-receivable.js`) — takes assembled prompt, calls LLM via adapter, parses response against Format Skill output contract, writes Deliverable, logs to ai_activity_log, routes response to caller. | ❌ Missing | S-PM-04 |
