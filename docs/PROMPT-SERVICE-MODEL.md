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

### DB Assembly — Section Assembly Spec (locked S-PM-03-design, 2026-06-22)

DB Assembly must produce fully assembled sections — not raw DB rows. The current implementation
(S-PM-02) returns raw `agent_configs`, `capabilities`, and `skill_profiles` rows. S-PM-03a
patches this to produce the assembled Prompt Request with typed sections.

**Section type mapping — how skill_type_slug determines section type:**

| skill_type_slug | Section type | Content source |
|----------------|--------------|----------------|
| `identity` | `stored` | agent_configs (type: role_prompt, is_default: true) → falls back to skill_profiles traits if no agent_config |
| `behavior` | `stored` | agent_configs (type: role_prompt) combined with skill_profiles traits (reasoning_style, writing_style) |
| `knowledge` | `rag` | No content — `fetch_instruction` only (see RAG fetch_instruction spec below) |
| `intent` | `stored` | Built from skill_profiles.traits (analysis_instructions + sections[]) |
| `format` | `stored` | Built from skill_profiles.traits (output_type instruction string) |
| `guardrails` | `stored` | agent_configs (type: guardrail) + skill_profiles.guardrails jsonb |

**Section order** follows the locked priority: Format(1) → Intent(2) → Identity(3) → Behavior(4) → Knowledge(5) → Guardrails(6).
Within each type, `capability_skill_profiles.display_order` determines ordering.

**RAG fetch_instruction spec** (produced by DB Assembly for Knowledge sections):
```json
{
  "method": "rag",
  "agent_id": "<agent_id from input>",
  "query_from": "task_context",
  "match_count": 5,
  "scope": "agent"
}
```
`scope` is always `"agent"` when agent_id is present, `"platform"` when no agent_id provided.

**REFLECT fetch_instruction spec** (produced when Skill Profile declares `technical_services: ["reflect"]`):
```json
{
  "method": "reflect",
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 1024,
  "inserts_after": "knowledge",
  "declared_by": "<skill_profile_slug>"
}
```

**format_contract** — DB Assembly extracts from the Format Skill Profile's traits and adds as a
top-level field on the Prompt Request:
```json
{
  "output_type": "json",
  "skill_profile_slug": "<format skill slug>",
  "schema": "<traits.schema if present, null otherwise>",
  "handler": "<traits.handler — e.g. 'store' | 'dispatch' | 'package' | 'mcp'>",
  "guardrails": { "must": [], "must_not": [] }
}
```
`handler` defaults to `"store"` if not declared on the Skill Profile.
`guardrails` is pulled directly from `skill_profiles.guardrails` jsonb — the same data injected into the prompt as text is also available here for runtime enforcement by the Guardrails pattern.

If no Format Skill Profile exists for the Capability, `format_contract` defaults to:
```json
{ "output_type": "html", "skill_profile_slug": null, "schema": null, "handler": "store", "guardrails": { "must": [], "must_not": [] } }
```

**synthesis** — DB Assembly adds top-level `synthesis` object if any Skill Profile declares
`technical_services: ["intelligent-synthesis"]`:
```json
{
  "enabled": true,
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 2048,
  "declared_by": "<skill_profile_slug>"
}
```
If no Skill Profile declares synthesis: `{ "enabled": false }`.

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
`Promise.all()` waits for ALL parallel fetches to complete before proceeding to Render.
No section is rendered until all fetches resolve or time out.

**Per-fetch timeout: 10 seconds.** If a RAG fetch exceeds 10 seconds, treat as
optional-section-miss and continue. Never let one slow fetch hang the pipeline.

**Fetch failure behavior:**
- Required section fetch fails or times out → omit section, log to `ai_activity_log` only, continue pipeline. Never block. No user exposure.
- Optional section fetch fails or times out → omit section silently, log warning
- Empty sections array (no sections in Prompt Request) → return valid output with `system_prompt: ""` and `debug.warn: "no_sections_assembled"`. Never block the Sender.
- Required RAG section returns zero chunks → omit section, log to `ai_activity_log` only. No user exposure at this time.

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
- **Format section title instruction (locked S-PM-04-design):** When rendering a `format` type section, AI Enrichment appends the following line to the rendered content before assembly: `"Also return a 'title' field (max 8 words) that describes the actual content you produced."` This ensures every LLM response includes a title as part of the main call — no separate title request needed. The title is generated from what was actually produced, not from the task goal.

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

**REFLECT identity source:** The Haiku prompt uses the rendered `identity` section content
as the agent persona — not a separate DB lookup. If no identity section exists, REFLECT
runs on task_context only, producing a thin generic plan. No failure, no user notification.
This degradation is expected and acceptable.

**`inserts_after` fallback:** If the section named in `inserts_after` was omitted (e.g. RAG
returned nothing and knowledge section was dropped), insert REFLECT output at the end of
all currently rendered sections. Future: smarter positioning logic.

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
   Preserve the agent's professional identity, reasoning style, and behavioral character
   as equally important as format and intent instructions — do not compress persona content
   in favor of structural instructions.
   Remove redundancy and resolve any conflicts between sections.
   Tighten language. Preserve all factual content, all constraints,
   and all output format instructions exactly.
   The rewritten prompt must be under [max_tokens] tokens.
   Do not add new instructions. Do not remove guardrails or format requirements."

  [full rendered prompt]
```

> **Implementation note:** The Synthesis prompt above reflects quality guidance locked in
> S-PM-08-design (2026-06-23). The current ai-enrichment.js implementation uses an older
> shorter string. When AA-61 ships (S-PROMPT-ARCH-01), Synthesis will read its prompt from
> `traits.synthesis_prompt` on the declaring skill profile — not from a hardcoded string.
> The guidance above is the required content for that trait value.

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

**Synthesis token budget enforcement:** AI Enrichment trusts Haiku's output as-is.
No post-synthesis token count check. If output exceeds budget, that is the Sender's
problem to handle (future feature). No rollback or quality gate at this time.

**Synthesis quality:** No LLM-as-Judge pass on synthesis output. Used as-is.
Future: quality gate via PAT-15 LLM-as-Judge after pipeline is proven.

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

### RAG Scoping — Locked S-PM-03-design (2026-06-22)

The `fetch_instruction.scope` field controls which knowledge entries are searched.
The existing `match_knowledge` RPC supports `p_agent_id` filtering only.

| scope value | Behavior | p_agent_id passed |
|-------------|----------|------------------|
| `"agent"` | Scoped to this agent's knowledge entries | agent_id from fetch_instruction |
| `"capability"` | Falls back to platform-wide — no capability_slug column on knowledge_entries yet | null |
| `"platform"` | Full platform knowledge base, no agent filter | null |

`capability` scope degradation is expected behavior until S-INFRA-01 adds `capability_slug`
to `knowledge_entries`. Logged in debug as `rag_scope_requested` vs `rag_scope_effective`.

### Shared RAG Service — Locked S-PM-03-design (2026-06-22)

RAG logic (OpenAI embed → Supabase `match_knowledge` RPC) is extracted from `api/rag-query.js`
and `api/agent-run.js` into a single shared module: **`api/lib/rag.js`**.

```js
// api/lib/rag.js — exported interface
export async function queryRAG({ queryText, agentId, tenantId, matchCount, scope })
  → { context: string, chunks: Array, matchCount: number }
```

- `api/rag-query.js` becomes a thin handler that calls `queryRAG()` directly — no behavior change
- `api/agent-run.js` replaces internal HTTP call to `/api/rag-query` with direct `queryRAG()` import
- `api/prompt/ai-enrichment.js` imports `queryRAG()` directly
- No other file calls `/api/rag-query` via internal HTTP after this change

`api/lib/rag.js` has no default export — it is a module, not a Vercel handler. Does not count
toward the Vercel Hobby 12-function limit.

### AI Audit Logging — Locked S-PM-03-design (2026-06-22)

AI Enrichment makes multiple AI calls. Each is logged individually to `ai_activity_log`.
**S-PM-03b** (separate coding session) wires all logging.

| Operation | Log entry | Model |
|-----------|-----------|-------|
| RAG embedding (per section) | One entry per Knowledge section | OpenAI text-embedding-3-small |
| REFLECT Haiku call | One entry | claude-haiku-4-5-20251001 |
| Synthesis Haiku call | One entry | claude-haiku-4-5-20251001 |

All entries roll up to the AI Audit summary. No aggregate entry — individual entries only.
S-PM-03b also adds: `SERVICE_CATALOG` entry for AI Enrichment (patterns: RAG, Embeddings,
Reflection, Prompt Chaining) and `AI_TYPE_TO_SERVICE` mapping.

---

## 7. Service 3 — Request & Receivable (Send + Parse + Guardrails + Deliver)

**Route:** `api/prompt/request-receivable.js`
**Job:** Take the assembled prompt from AI Enrichment. Call the LLM. Parse the response.
Run Guardrails check. Delegate to handler. Write the Deliverable. Log server-side. Return package to caller.
**Does NOT:** read Skill Profiles, agent_configs, or the Prompt Request directly.
**Makes AI calls:** Yes — one main LLM call. One retry call if parse fails. One Haiku call for Guardrails (skipped if no guardrails declared).
**Logs:** Server-side directly to `ai_activity_log` via Supabase service key — not via frontend `logAICall()`. Required because callers are not guaranteed to be the frontend (MCP callers, other API routes).

### AI Patterns (locked S-PM-04-design)

| Pattern | When it runs |
|---------|-------------|
| Prompt Chaining (PAT-04) | Always — Step 3 of DB Assembly → AI Enrichment → Request & Receivable chain |
| Structured Output (PAT-07) | When `format_contract.output_type` is `json` or `dashboard` |
| Tool Use (PAT-03) | Same call as Structured Output — schema passed as tool definition with `tool_choice` |
| Streaming (PAT-06) | When `format_contract.output_type` is `html` or `docx`/`pdf` |
| Guardrails (PAT-13) | When `format_contract.guardrails.must` or `must_not` are non-empty |

`patterns_used` is built at runtime per call and written to `ai_activity_log`.

### Handler Registry (locked S-PM-04-design)

The Sender reads `format_contract.handler` and delegates to a handler module in `api/lib/handlers/`.
New formats and action types are new handler files — zero changes to the Sender itself.

```
api/lib/handlers/
  store.js      ← write content to deliverables table (ships S-PM-04b)
  dispatch.js   ← route to another agent or capability (AA-54, future)
  package.js    ← prose → docx/pdf packaging (future)
  mcp.js        ← call MCP server with result (future)
```

**Two deliverable categories (locked S-PM-04-design):**
- **Content** — LLM produced something a human reads: report, plan, brief. `handler: "store"`. Written to `deliverables` table.
- **Action** — LLM produced an instruction: call this agent, invoke MCP, trigger webhook. `handler: "dispatch"` or `"mcp"`. Audit record written to `deliverables` with `format: "action"`.
- **Hybrid** — Both. Example: Michelle produces an execution plan (store) AND dispatches it to Bob (dispatch). Both handlers run sequentially.

### Title Generation (locked S-PM-04-design)

Every LLM call includes `title` as a required field in the Format Skill's output schema.
AI Enrichment appends the instruction to the Format section render: `"Also return a 'title' field (max 8 words) that describes the actual content you produced."`
Title is generated as part of the main LLM call — not a separate request.
Describes what was actually produced. Written to `deliverables.title`.

### Input

```json
{
  "builder_output":   { ... },    // full AI Enrichment output object
  "messages":         [ ... ],    // conversation history or single user turn from caller
  "task_id":          "uuid",     // optional — null for MCP callers
  "step_id":          "uuid",     // optional — null for MCP callers
  "stream":           true        // default true; auto-overridden by Sender when needed
}
```

---

### Four steps — run in this order

---

#### Step 1 — Send

Direct fetch to Anthropic API — same pattern as `plan.js` and `ai-enrichment.js`. No adapter layer.

**Streaming behavior — default true, auto-overridden:**

| `format_contract.output_type` | Streaming |
|-------------------------------|-----------|
| `html` | `true` — text streams token by token to the UI |
| `docx` / `pdf` | `true` — prose streams, then packaged after completion |
| `json` / `dashboard` | `false` — tool_choice returns a complete block; streaming adds no value |
| MCP caller (`stream: false` passed) | `false` — batch JSON returned |

**Structured output (json / dashboard):**
- Passes `format_contract.schema` as a tool definition (schema always includes `title` field)
- Sets `tool_choice: { type: "any" }` to force tool use

**What the Sender passes to the Anthropic API:**
```
system:      builder_output.system_prompt
messages:    caller's messages array
tools:       [format_contract.schema as tool def]
tool_choice: { type: "any" }   ← only when output_type is json/dashboard
max_tokens:  builder_output.llm.max_tokens
model:       builder_output.llm.model
stream:      resolved streaming flag (after auto-override)
```

---

#### Step 2 — Parse

**`output_type: "json"` or `"dashboard"`**
- Extracts tool_use block from LLM response
- Extracts `title` from `input.title` — required field on every schema
- Validates `input` against `format_contract.schema`
- If invalid → single retry with schema reminder appended to messages
- If retry also fails → return raw response with `parse_error: true`

**`output_type: "html"`**
- Extracts text content and `title` — no structural validation

**`output_type: "docx"` / `"pdf"`**
- Extracts prose text and `title`
- Returns with `requires_packaging: true` — document packaging handled by `package` handler (future)

**Streaming:** parsing happens on completed stream — Sender buffers full response before validating.

---

#### Step 3 — Guardrails (PAT-13)

Runs after Parse. Reads `format_contract.guardrails.must` and `guardrails.must_not`.

**If guardrails are declared (non-empty arrays):**
Fast Haiku call against the parsed response:
```
"Review the following AI response against these rules.
 For each MUST rule: confirm satisfied. For each MUST NOT rule: confirm not violated.
 Return JSON: { passed: boolean, violations: string[] }"
[parsed content] [must rules] [must_not rules]
```

**If violations found:** Deliverable is still written as `draft`. Caller receives `guardrails_passed: false` and `violations[]` in debug. Future: automatic retry or HITL gate on violation.

**If no guardrails declared:** Step is a no-op — no Haiku call, `guardrails_passed: true`.

**Logged separately** as its own `ai_activity_log` row: `ai_type: 'guardrails-check'`, `patterns_used: ['guardrails']`.

---

#### Step 4 — Deliver

Delegate to handler, then log.

**Handler delegation:**
```js
const handler = await import(`./handlers/${format_contract.handler}.js`);
const result = await handler.run({ parsedContent, title, formatContract, builderOutput, taskId, stepId, tenantId });
```

**`store` handler** writes to `deliverables`:

| Column | Value |
|--------|-------|
| `tenant_id` | from request |
| `task_id` | from caller input (null if MCP) |
| `step_id` | from caller input (null if MCP) |
| `agent_id` | `builder_output.agent_id` |
| `skill_profile_slug` | `format_contract.skill_profile_slug` |
| `type` | derived from `format_contract.output_type` |
| `title` | extracted from parsed LLM response |
| `content` | parsed response object |
| `format` | `format_contract.output_type` |
| `status` | `draft` |
| `handler` | `format_contract.handler` |

**Server-side logging:**
```js
await supabase.from('ai_activity_log').insert({
  tenant_id,
  ai_type:      'request-receivable',
  model:        builder_output.llm.model,
  agent_id:     builder_output.agent_id || null,
  task_id:      task_id || null,
  input_tokens: usage.input_tokens,
  latency_ms:   latencyMs,
  cost_usd:     calculatedCost,
  patterns_used: patternsUsed,  // built at runtime from what actually fired
});
```

---

### Sender Output

```json
{
  "deliverable_id": "uuid",
  "title": "Michelle's Vendor Risk Execution Plan",
  "content": {
    "title": "Michelle's Vendor Risk Execution Plan",
    "planSummary": "...",
    "agentId": "pp-01",
    "agentReason": "...",
    "steps": [ ... ],
    "questions": []
  },
  "format": "json",
  "handler": "store",
  "status": "draft",
  "parse_error": false,
  "streamed": false,
  "guardrails_passed": true,
  "violations": [],
  "debug": {
    "model": "claude-sonnet-4-6",
    "tokens_in": 1820,
    "tokens_out": 640,
    "cost_usd": 0.0031,
    "latency_ms": 2140,
    "retry_used": false,
    "patterns_used": ["prompt-chaining", "structured-output", "tool-use", "guardrails"],
    "reflect_tokens_used": 312,
    "synthesis_tokens_used": 480
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
| **[S-PM-08-design 2026-06-23] Dan Bingham (PS-01) owns DB Assembly + AI Enrichment** — named team member, not platform utility. agent_id ps-01 accompanies every Prompt Service call in ai_activity_log. Skill profiles carry traits.reflect_prompt and traits.synthesis_prompt. UI collaboration indicator shown alongside primary agent. | ✅ Locked |
| **[S-PM-08-design 2026-06-23] Prompt Service founding principle preserved** — assembler is dumb/agnostic. No conditionals based on content type, agent type, or deliverable type. All intelligence in skill profile traits. Any improvement to Prompt Service output is accomplished by adding or updating traits — never by adding assembler logic. | ✅ Locked |
| **[S-PM-08-design 2026-06-23] REFLECT prompt → traits.reflect_prompt** — the REFLECT reasoning prompt moves from hardcoded string in ai-enrichment.js to traits.reflect_prompt on the declaring skill profile. AI Enrichment reads from fetch_instruction.reflect_prompt (populated by DB Assembly). Makes each agent's REFLECT unique and trainable. | ❌ Missing — S-PROMPT-ARCH-01 |
| **[S-PM-08-design 2026-06-23] Synthesis prompt → traits.synthesis_prompt** — moves from hardcoded string to traits.synthesis_prompt on declaring skill profile. Quality guidance: preserve persona equally to format/intent; remove redundancy and conflicts. See Synthesis prompt spec in Section 6 Step 4. | ❌ Missing — S-PROMPT-ARCH-01 |
| **[S-PM-08-design 2026-06-23] task_context as always-present separate context block** — task_context (goal, deliverable_type, future fields) is a separate top-level context block, never injected as a hardcoded section inside the assembler. Static sections from skill profiles = who the agent is. task_context = what needs to happen right now. Always present, always separate. The current WORK ORDER section hardcode (AA-57) is a temporary measure until S-PROMPT-ARCH-01. | ❌ Missing — S-PROMPT-ARCH-01 |
| **[S-PM-08-design 2026-06-23] Identity section additive assembly** — Identity combines ALL non-blank sources: agents table (name, role, specialty), all role_prompt entries in agent_configs (not just is_default), skill profile objective + method. No OR logic. Depends on agents table (AA-58). | ❌ Missing — S-PROMPT-ARCH-01 |
| **[S-PM-08-design 2026-06-23] Display agent routing** — content specialist output routes to display agent (Screen Controls / HTML Display / PDF Assembly) based on user's requested output format. Display agents own the Format Skill. No formatting logic in content specialist prompts. | ❌ Missing — S-EDITOR-01 (design required) |
| REFLECT — declared on Skill Profile via `technical_services: ["reflect"]` | ✅ Locked |
| Intelligent synthesis — declared on Intent Skill Profile via `technical_services: ["intelligent-synthesis"]` — Haiku rewrite, runs last | ✅ Locked |
| Builder: Container feeds all stored content directly — Builder never reads DB | ✅ Locked |
| Sender streaming — default true; auto-overridden to false for json/dashboard; MCP callers pass false explicitly | ✅ Locked |
| Sender structured output — driven by `format_contract.output_type`; json/dashboard use tool_choice + schema | ✅ Locked |
| Sender retry — single append retry on parse failure; raw response + parse_error flag if retry also fails | ✅ Locked |
| Sender lineage — task_id + step_id from caller; null for MCP callers (`work_order_id` renamed `task_id` to match live DB FK) | ✅ Locked |
| Sender logging — server-side direct Supabase insert, not frontend logAICall(). Required because caller is not always the frontend. `patterns_used jsonb` column added to ai_activity_log (S-PM-04a). | ✅ Locked |
| docx/pdf packaging — Sender returns prose + requires_packaging flag; document service is separate (`package` handler, future) | ✅ Locked |
| Handler registry — `format_contract.handler` slug delegates to `api/lib/handlers/[handler].js`. New formats/actions = new handler files only. `store.js` ships S-PM-04b. `dispatch`, `package`, `mcp` are future (AA-54). | ✅ Locked |
| Two deliverable categories — content (store) and action (dispatch/mcp). Hybrid runs both handlers. Audit record written for all categories. | ✅ Locked |
| Title generation — required `title` field on every Format Skill schema. Generated by main LLM call, not a separate request. AI Enrichment appends title instruction to Format section render. Written to `deliverables.title`. | ✅ Locked |
| Guardrails pattern (PAT-13) — post-generation Haiku check against `format_contract.guardrails`. No-op when guardrails empty. Violation does not block deliverable write — status stays draft, caller receives violation list. Logged as separate ai_activity_log row. | ✅ Locked |
| format_contract gains `handler` and `guardrails` fields — extracted by DB Assembly from Format Skill Profile traits (patched S-PM-04a). | ✅ Locked |
| No adapter layer — direct fetch to Anthropic API, same as plan.js and ai-enrichment.js. Adapter deferred until multi-provider support required. | ✅ Locked |
| Builder Haiku call costs (REFLECT + synthesis) passed through in debug object — not logged separately. Visible in Sender response debug for caller inspection. | ✅ Locked |
| DB Assembly is a faithful collector — no adjudication, no AI, no writes. Organized by source: agent_configs / capabilities / skill_profiles / task_context | ✅ Locked |
| DB Assembly section priority order: Format → Intent → Identity → Behavior → Knowledge → Guardrails | ✅ Locked |
| DB Assembly inputs: tenant_id (required, always explicit), task_context (required), agent_id (optional), capability_slug (optional) | ✅ Locked |
| DB Assembly degradation: works with whatever data is available — no blocking errors on missing Skills, agent, or capability | ✅ Locked |
| DB Assembly: duplicative/conflicting content (e.g. guardrails in multiple sources) passed through intact — AI Enrichment resolves | ✅ Locked |
| AI Enrichment always runs — even with no DB content. All platform patterns run; RAG always runs scoped to agent/capability/platform-wide | ✅ Locked |
| Service terminology: Container → DB Assembly, Builder → AI Enrichment, Sender → Request & Receivable, Specification → Prompt Request | ✅ Locked |
| DB Assembly caching — same capability + agent = cache hit | Semantic Caching (AA-50) — design session required |
| `max_tokens` / `llm_model` / `llm_provider` columns added to `skill_profiles` table in Supabase | ✅ Done (SK-17, S-PM-02) |
| Two-speed routing — fast path (Haiku, top 3 RAG) vs deep path (Sonnet, top 10 RAG) declared at Capability level | Design session required (AA-04) |
| AI Enrichment: multiple Knowledge Skill Profiles — merge strategy | ✅ Locked — run in parallel, render as separate labeled sections, no dedup. Synthesis resolves redundancy. |
| Multi-LLM conflict resolution — when multiple Skill Profiles declare different LLM configs | Future feature (platform defaults handle for now) |
| User-declared priority in task_context — formal parsing of priority signals embedded in the task string | Future feature (AI Enrichment surfaces naturally for now) |
| DB Assembly relevance flagging — lightweight AI annotation on package sections to guide AI Enrichment prioritization | Future feature (after pipeline is proven) |
| RAG query expansion — using AI to expand task_context into a richer search query before hitting the knowledge store | Future feature (AA-48, design session required) |
| HyDE — generate hypothetical ideal answer before RAG embed for better retrieval quality | Future feature (AA-48 extension or separate — deferred) |
| Synthesis token budget enforcement — verify output fits within budget post-synthesis | Future feature — Sender's problem for now |
| Synthesis quality gate — LLM-as-Judge on synthesis output before returning | Future feature (AA-52) |
| format_contract validation skill — pre-flight capability check before DB Assembly runs, catches missing Format Skill Profiles | Future feature (AA-51) |
| Capability-scoped RAG — scope: "capability" currently falls back to platform-wide; needs capability_slug on knowledge_entries | Future (S-INFRA-01) |
| REFLECT inserts_after smart positioning — currently falls back to end of sections if named section was omitted | Future feature |

---

## 11. Feature IDs

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-03 | DB Assembly (`api/prompt/db-assembly.js`) — reads capability_slug + agent_id, queries agent_configs / capabilities / skill_profiles, returns Prompt Request organized by source. No AI calls, no writes. Degrades gracefully on missing data. | ❌ Missing | S-PM-02 |
| AA-43 | AI Enrichment (`api/prompt/ai-enrichment.js`) — takes Prompt Request, executes platform patterns: RAG (agent/capability/platform-wide scope), REFLECT, intelligent synthesis. Resolves conflicts and duplication. Returns assembled system prompt + debug object. | ❌ Missing | S-PM-03 |
| AA-44 | Request & Receivable (`api/prompt/request-receivable.js`) — takes assembled prompt, calls LLM via adapter, parses response against Format Skill output contract, writes Deliverable, logs to ai_activity_log, routes response to caller. | ❌ Missing | S-PM-04 |
