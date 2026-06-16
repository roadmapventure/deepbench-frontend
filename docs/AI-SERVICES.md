# DeepBench — AI Services Model
# Version: v5.2 | Created: 2026-06-15 | Session: S-DELIVER-DESIGN

> Canonical reference for how AI is distributed across the DeepBench platform.
> Defines the four-level AI Usage model, the full Services catalog (14 services),
> the AI Patterns catalog (10 patterns), the unified Services table schema,
> and the redesigned AI Audit sections.
>
> Read alongside: ARCHITECTURE.md (layer rules), CAPABILITIES.md (deliverable-focused view),
> FEATURES.md (backlog IDs and session queue).

---

## 1. The Four-Level AI Usage Model

```
AI Pattern          — industry-standard execution approach (RAG, ReAct, Tool Use…)
                      owned by the industry; DeepBench does not define these
      ↓ collected into (with properties + configuration)
AI Service          — DeepBench-owned named implementation
                      a Service uses 0–N Patterns; deterministic Services use 0
      ↓ collected into
Deliverable /       — what the agent produces for the human (or internal platform record)
Capability            a Deliverable uses 1–N Services
      ↓ every execution logged to
AI Usage            — aggregate telemetry: calls, cost, latency
                      rolled up per Pattern → per Service → platform total
```

**Key principle:** AI Services are DeepBench's IP. AI Patterns are how those Services execute — implementation details that belong to the industry. A Service that uses zero Patterns (purely deterministic) is still a DeepBench AI Service — it has a name, a slug, properties, and logs to AI Usage like all others.

**One table for all Services.** AI Services and Deterministic Services share a single `ai_services` table with a `service_type` column (`ai` | `deterministic` | `mixed`). They are the same kind of entity — named, reusable, owned by DeepBench — with different execution approaches.

**Connection to the Agent Profile Model.** The Method layer in ARCHITECTURE.md Section 2 has been renamed to AI Pattern layer. What was listed there (RAG Query, LLM Call, Playwright, Embeddings, Document Extraction) were Patterns, not Methods. In the Agent Profile Model, a Capability or Deliverable points to the AI Service(s) it uses — not directly to Patterns. The Service encapsulates Pattern selection.

---

## 2. AI Patterns Catalog

Industry-standard architectural approaches. DeepBench does not own these — it implements them inside Services.

| ID | Pattern | Description | Industry Source |
|----|---------|-------------|----------------|
| PAT-01 | RAG | Retrieval-Augmented Generation — embed query, vector search, inject retrieved chunks into context before LLM call | Anthropic, OpenAI, LangChain |
| PAT-02 | ReAct | Reasoning + Acting — LLM reasons about current state, selects an action, executes it, observes result, repeats until terminal state | Yao et al. 2022; Anthropic Cookbook |
| PAT-03 | Tool Use | Structured function calling — LLM selects from a declared tool schema and returns a structured response; Claude tool use / response_format | Anthropic, OpenAI |
| PAT-04 | Prompt Chaining | Sequential prompt assembly — output of one prompt feeds as input to the next; multiple calls assembled into a pipeline | Anthropic Cookbook |
| PAT-05 | Reflection | Agent critiques and improves its own prior output — self-review pass before returning result | Anthropic Cookbook |
| PAT-06 | Streaming | Token-by-token output delivery via SSE — response arrives progressively; used where UX latency matters | Anthropic, OpenAI |
| PAT-07 | Structured Output | Constrained generation — response conforms to a declared schema; no free-text JSON parsing | Anthropic tool use, OpenAI response_format |
| PAT-08 | Embeddings | Vector generation — text converted to dense vector for similarity search or storage | OpenAI text-embedding-3-small |
| PAT-09 | Browser Automation | Playwright-controlled browser execution — agent drives a real browser instance on Railway | Microsoft Playwright |
| PAT-10 | HITL | Human-in-the-Loop — full runtime contract: (1) execution pauses at a HITL step, (2) signal emitted to notify human, (3) human provides input (approval / decision / correction / data), (4) input injected into agent context, (5) execution resumes. 🔶 Partial in DeepBench: step type exists in plan model and visual is implemented (TI-01 ✅); runtime gate (TI-18) not yet built — steps do not currently pause or notify. AI Audit metric for HITL is "Gates Triggered" + avg human response time — NOT LLM Calls, because no AI service is invoked at a HITL gate. | DeepBench step gate architecture; enterprise AI workflow patterns |
| PAT-11 | Agent Orchestration | One agent (the orchestrator) delegates work to a peer agent mid-execution; the subagent's output feeds back into the orchestrating task. Distinct from agent routing (pre-call system selection via SVC-08): orchestration happens inside a running agent's execution loop. Not yet implemented — becomes live in S11 (step execution) and fully realized in AW-17 (multi-agent step assignment). | Anthropic multi-agent architecture docs; emerging industry standard |
| PAT-12 | Few-Shot Prompting | Providing worked examples inside the prompt to guide output format, style, and reasoning before the model generates its response. In use implicitly inside SVC-01 Prompt Assembly system prompts — not yet a named, tracked service call. | Brown et al. 2020 (GPT-3); Anthropic prompting guide |
| PAT-13 | Guardrails / Output Filtering | Post-generation safety and quality enforcement — checking model output against declared rules (always/never constraints, topic boundaries, format requirements) before returning to the caller. DeepBench has the data concept in Playbook tab (always/never guardrail records); runtime enforcement not yet wired as a pattern. | NeMo Guardrails; Llama Guard; Anthropic Constitutional AI |
| PAT-14 | Parallelization | Multiple LLM calls executed simultaneously; results combined or compared. DeepBench has 🔶 Partial implementation — Test Team (TT-01/02) runs two agents on the same query in parallel and displays results side by side with a diff metric dashboard. Full pattern wired when AW-17 (multi-agent step assignment) ships. | Anthropic cookbook; LangChain |
| PAT-15 | LLM-as-Judge / Verifier | A second model evaluates the quality, accuracy, or compliance of a first model's output. Distinct from Reflection (self-critique): the judge is a separate call, often a different model or persona. Natural fit for PE-12 Test Agent scoring and AI-24 routing feedback loop. | OpenAI evals; Anthropic cookbook |
| PAT-16 | Multi-Agent Debate | Two agents take opposing positions on a question and argue against each other's output; a synthesis agent reads both arguments and produces a reconciled final answer. Agents are adversarially aware — each sees the other's response. Foundation exists in Test Team (TT-01/02, PAT-14 Parallelization); Debate adds the critique pass and synthesis step. Particularly valuable for procurement risk where conflicting agent assessments need resolution. | Google DeepMind; Du et al. 2023 |
| PAT-17 | Chain-of-Verification (CoVe) | After generating an answer, the model automatically generates a checklist of verification questions about its own factual claims, answers each independently, then revises the original answer based on any corrections. Distinct from Reflection (style/quality critique): CoVe targets factual accuracy claim by claim. High compliance relevance for government procurement deliverables. | Dhuliawala et al. 2023 (Meta AI) |
| PAT-18 | Episodic Memory | Agents recall the context of prior interactions with a specific user, task, or organization — separate from factual knowledge in RAG. RAG retrieves facts; episodic memory retrieves experience. Example: "The last time we analyzed Austin IT spend, you flagged PO splitting and requested a vendor breakdown — applying that lens now." Differentiates AI workforce (colleagues with history) from AI tools (stateless responders). | MemGPT / Letta; cognitive architecture research |
| PAT-19 | HyDE (Hypothetical Document Embedding) | Before retrieving from the knowledge base, generate a hypothetical ideal answer to the query, embed that hypothetical, and use the resulting vector for retrieval instead of the raw query embedding. Significantly improves RAG quality for domain-specific terminology where user query language differs from document language (e.g., "HHI risk" vs. "Herfindahl-Hirschman Index concentration ratio"). One-model change inside SVC-02 Knowledge Retrieval — no schema changes. | Gao et al. 2022 (Stanford) |
| PAT-20 | Adaptive RAG | Dynamically adjusts retrieval depth and strategy based on query complexity. Simple factual queries: shallow retrieval (3 chunks). Complex multi-step analysis: deep retrieval (20+ chunks) with keyword fallback. Prevents over-retrieval cost waste and under-retrieval accuracy loss. Implemented inside SVC-02 Knowledge Retrieval by adding a complexity classifier before the vector search call. | LangChain adaptive retrieval; production RAG engineering |

**Pattern status in DeepBench:**
- PAT-01 through PAT-09: ✅ Active — logged to `ai_activity_log` via service calls
- PAT-10 HITL: 🔶 Partial — plan type and visual exist; runtime gate (TI-18) not yet built
- PAT-11 through PAT-15: 🔲 Roadmap — not yet implemented
- PAT-14 Parallelization: 🔶 Partial — Test Team (TT-01/02) runs agents in parallel; full wiring deferred to AW-17
- PAT-16 through PAT-20: 🔲 Roadmap — differentiating patterns for future phases

**HITL metric note:** HITL is the only pattern in the catalog that does not produce an LLM call. Its AI Audit row shows "Gates Triggered" (count of HITL steps reached during execution) and "Avg Human Response Time" instead of Calls / Cost / Latency. Source: task execution log, not `ai_activity_log`.

---

## 3. AI Services Catalog

All 14 DeepBench AI Services. Services SVC-01 through SVC-11 are AI or Mixed; SVC-12 through SVC-14 are Deterministic.

---

### SVC-01 — Prompt Assembly

| Field | Value |
|-------|-------|
| **Slug** | `prompt-assembly` |
| **Type** | Mixed |
| **Patterns (0–N)** | PAT-04 Prompt Chaining + PAT-05 Reflection + PAT-01 RAG |
| **Purpose** | Assembles the full system prompt at call time: stacks role prompt (from `agent_configs`) + guardrails + output format + RAG chunks (from SVC-02) + REFLECT planning output. One assembled prompt per call — no duplication across services. |
| **LLM** | Haiku (for the REFLECT call inside assembly); rest is deterministic stacking |
| **Execution Mode** | Synchronous |
| **Token Budget** | Configurable per block; total cap enforced |
| **BYOK Eligible** | Yes |
| **In NIGP** | ✅ Proven — `assembleContext()` in `api/agent-run.js` |
| **In DeepBench** | 🔶 Partial — logic duplicated inline in `api/brief.js` and `api/plan.js`; not extracted as shared service |
| **Extraction Needed** | ✅ Yes — violates Layer 3 rule; two separate code copies |
| **Current Route** | Inline in `api/brief.js` + `api/plan.js` |
| **Target Route** | `api/capabilities/prompt-assembly.js` |
| **Used By** | D-01 AI Briefing, D-04 Task/Step Plan, D-07 Portfolio AI Review, D-06 Data Analysis Report (AI Review tab), PE-12 Test Agent |
| **Feature ID** | AA-03 |
| **Design Session Needed** | No — spec locked in AA-03. Coding session: S-INFRA-01 |

---

### SVC-02 — Knowledge Retrieval

| Field | Value |
|-------|-------|
| **Slug** | `knowledge-retrieval` |
| **Type** | Mixed |
| **Patterns (0–N)** | PAT-01 RAG + PAT-08 Embeddings |
| **Purpose** | Vector similarity search against `knowledge_entries` — embed the query text via OpenAI, run pgvector cosine similarity search, return top-N chunks with scores. Called by SVC-01 Prompt Assembly and directly by any service needing knowledge retrieval. |
| **LLM** | OpenAI `text-embedding-3-small` (embeddings only; no generation LLM) |
| **Execution Mode** | Synchronous |
| **Token Budget** | N/A — no generation; `match_count` cap enforced (default 10, never uncapped) |
| **BYOK Eligible** | Yes (OpenAI key) |
| **In NIGP** | ✅ Proven — `api/rag-query.js` |
| **In DeepBench** | ✅ Done — `api/rag-query.js`; AI-09 |
| **Extraction Needed** | Route rename only — no logic change |
| **Current Route** | `api/rag-query.js` |
| **Target Route** | `api/capabilities/rag-query.js` |
| **Used By** | SVC-01 Prompt Assembly, D-01 AI Briefing (direct), D-07 Portfolio AI Review (direct), SVC-05 Pre-Run Planning |
| **Feature ID** | AI-09 ✅ |
| **Design Session Needed** | No. Route rename in S-INFRA-01. |

---

### SVC-03 — Autonomous Research

| Field | Value |
|-------|-------|
| **Slug** | `autonomous-research` |
| **Type** | Mixed |
| **Patterns (0–N)** | PAT-02 ReAct + PAT-09 Browser Automation + PAT-03 Tool Use + PAT-06 Streaming |
| **Purpose** | Browser automation reasoning loop — Claude Sonnet reasons about a screenshot, selects the next action, Playwright executes it, agent observes result and repeats. Runs until terminal state: DOWNLOAD (produces Data Fetch deliverable) or DONE/synthesis (produces Web Research Report deliverable). MAX_STEPS 25, MAX_RUN_MS 5 minutes. Self-interrupts cleanly via SSE disconnect. |
| **LLM** | Claude Sonnet (reasoning); optional Claude Haiku (web SEARCH action when stuck — max 3 per run) |
| **Execution Mode** | Streaming (SSE — step events streamed to UI in real time) |
| **Token Budget** | Per-step budget enforced in ReAct loop; total capped by MAX_RUN_MS |
| **BYOK Eligible** | Yes (Anthropic key) |
| **In NIGP** | ✅ Proven — `nigp-analyzer-agent-api/src/agent.js` |
| **In DeepBench** | ✅ Done for Brent — FT-02 ✅, FT-03 ✅ |
| **Extraction Needed** | No — Railway-only by architecture rule. Extend to Pat (IR-07) via agent authorization. |
| **Current Route** | Railway `src/agent.js` |
| **Target Route** | Railway only — permanent per ARCHITECTURE.md Section 6 |
| **Used By** | D-02 Web Research Report, D-03 Data Fetch/Dataset |
| **Feature ID** | FT-02 ✅, FT-03 ✅, TI-17 (Pat), FT-06 (Pat) |
| **Design Session Needed** | No for Brent. Yes for Pat authorization (S11b). |

---

### SVC-04 — Knowledge Reinforcement

| Field | Value |
|-------|-------|
| **Slug** | `knowledge-reinforcement` |
| **Type** | AI |
| **Patterns (0–N)** | PAT-05 Reflection + PAT-08 Embeddings + PAT-07 Structured Output |
| **Purpose** | Post-run synthesis and autonomous training write-back. After any ReAct run (success, failure, or interruption), synthesizes what the agent learned into a structured knowledge entry (title, category, jurisdiction, priority, triggers, content) and embeds + writes to `knowledge_entries`. No human upload required — agent trains itself from its own run experience. |
| **LLM** | Claude Haiku (synthesis); OpenAI `text-embedding-3-small` (embedding) |
| **Execution Mode** | Async (fire-and-forget post-run; does not block SSE response) |
| **Token Budget** | Haiku synthesis: ~1500 tokens max |
| **BYOK Eligible** | Yes |
| **In NIGP** | ✅ Proven — `api/web-memory.js` POST + `api/ingest.js` |
| **In DeepBench** | 🔶 Partial — hardcoded to Brent persona and "Portal Navigation" category; not generalized |
| **Extraction Needed** | ✅ Yes — generalize to `api/auto-train`; accept `agent_id`, `source_type`, raw artifact; remove Brent hardcoding |
| **Current Route** | `api/web-memory.js` POST + `api/ingest.js` |
| **Target Route** | `api/capabilities/knowledge-reinforcement.js` |
| **Used By** | D-02 Web Research Report (post-run), D-03 Data Fetch/Dataset (post-run); SA-01 Training Entry is its output |
| **Feature ID** | AI-17 |
| **Design Session Needed** | Yes — AI-17 auto-train service needs: input schema, per-agent persona selection, source_type → synthesis prompt mapping, category mapping. Session: S-INFRA-02. |

---

### SVC-05 — Pre-Run Planning (REFLECT)

| Field | Value |
|-------|-------|
| **Slug** | `pre-run-planning` |
| **Type** | AI |
| **Patterns (0–N)** | PAT-01 RAG + PAT-05 Reflection |
| **Purpose** | Before any ReAct run, reads the agent's prior memory via SVC-02 Knowledge Retrieval and produces a step-by-step execution plan for the upcoming task. Agent plans before it acts. Plan is shown to the user in the Fetch UI before confirming run start. |
| **LLM** | Claude Haiku |
| **Execution Mode** | Synchronous (blocks until plan is ready; shown to user before run begins) |
| **Token Budget** | ~2000 tokens max (plan output) |
| **BYOK Eligible** | Yes |
| **In NIGP** | ✅ Proven — `api/web-memory.js` GET → `assembleContext()` → `executionPlan` field |
| **In DeepBench** | 🔶 Partial — called before Brent runs in FT-02; not a formally named discrete service step |
| **Extraction Needed** | Formalize as named discrete step; extend to any ReAct-based agent (Pat pending) |
| **Current Route** | Embedded in `api/web-memory.js` GET |
| **Target Route** | Formalized step inside `api/capabilities/knowledge-reinforcement.js` GET path |
| **Used By** | SVC-03 Autonomous Research (called before every ReAct run) |
| **Feature ID** | Part of FT-02 ✅; formalization in S-INFRA-01 |
| **Design Session Needed** | No — formalization only, no new design. S-INFRA-01. |

---

### SVC-06 — Task Planning

| Field | Value |
|-------|-------|
| **Slug** | `task-planning` |
| **Type** | AI |
| **Patterns (0–N)** | PAT-03 Tool Use + PAT-07 Structured Output + PAT-06 Streaming |
| **Purpose** | Michelle (PP-01) produces a structured multi-step task plan — named steps, assigned agents, step types (agent/HITL/sub-agent), clarifying questions. Uses Claude tool use for structured output. Supports surgical replanning (update subset of steps without regenerating the full plan). Streams plan tokens to UI during generation. |
| **LLM** | Claude Sonnet |
| **Execution Mode** | Streaming |
| **Token Budget** | ~4000 tokens max (plan output) |
| **BYOK Eligible** | Yes |
| **In NIGP** | ❌ No — NIGP has no planning agent |
| **In DeepBench** | ✅ Done — `api/plan.js`; AW-05, AW-16 |
| **Extraction Needed** | Route rename + Prompt Assembly integration (currently assembles prompt inline) |
| **Current Route** | `api/plan.js` |
| **Target Route** | `api/capabilities/task-planning.js` |
| **Used By** | D-04 Task/Step Plan |
| **Feature ID** | AW-05 ✅, AW-16 ✅; target route in S-INFRA-01 |
| **Design Session Needed** | No for current capability. Yes for Michelle full API wiring (AG-05, AG-06) — S-BENCH-01b. |

---

### SVC-07 — Title Generation

| Field | Value |
|-------|-------|
| **Slug** | `title-generation` |
| **Type** | AI |
| **Patterns (0–N)** | PAT-07 Structured Output |
| **Purpose** | Generates a concise task title + step names on first draft save. Called once; `title_edited` flag means user owns the title after first edit — never overwritten. Direct Claude Haiku call; no RAG, no full prompt assembly. |
| **LLM** | Claude Haiku |
| **Execution Mode** | Synchronous |
| **Token Budget** | ~200 tokens max |
| **BYOK Eligible** | Yes |
| **In NIGP** | ❌ No |
| **In DeepBench** | ✅ Done — `api/title.js`; DB-17 |
| **Extraction Needed** | Route rename only |
| **Current Route** | `api/title.js` |
| **Target Route** | `api/capabilities/title-generation.js` |
| **Used By** | DB-17 (task title auto-generation) |
| **Feature ID** | DB-17 ✅ |
| **Design Session Needed** | No. Route rename in S-INFRA-01. |

---

### SVC-08 — Agent Routing

| Field | Value |
|-------|-------|
| **Slug** | `agent-routing` |
| **Type** | AI |
| **Patterns (0–N)** | PAT-01 RAG + PAT-07 Structured Output |
| **Purpose** | Selects the best agent for a task or step based on task type, agent capabilities, seniority, and (future) approval history. Uses semantic similarity to match task description against agent capability profiles. Returns a ranked agent suggestion with reason chips. |
| **LLM** | Claude Haiku |
| **Execution Mode** | Synchronous |
| **Token Budget** | ~500 tokens max |
| **BYOK Eligible** | Yes |
| **In NIGP** | ✅ Partial — inline routing logic in PersonnelScreen and brief.js |
| **In DeepBench** | 🔶 Partial — inline in DashboardScreen; AI-04 ✅ for routing logic; no dedicated route |
| **Extraction Needed** | ✅ Yes — inline in React component; violates Layer 3 rule |
| **Current Route** | Inline in DashboardScreen.jsx + `api/rag-query.js` partial |
| **Target Route** | `api/capabilities/agent-routing.js` |
| **Used By** | AW-06 (agent suggestion on Assign Work), DB-18 (auto-select best agent — future) |
| **Feature ID** | AI-04 ✅; target route extraction in S-INFRA-01 |
| **Design Session Needed** | Yes — future routing feedback loop (AI-24) needs design before S-INFRA-01b. |

---

### SVC-09 — Chat / Consultative Response

| Field | Value |
|-------|-------|
| **Slug** | `chat-response` |
| **Type** | AI |
| **Patterns (0–N)** | PAT-01 RAG + PAT-04 Prompt Chaining + PAT-06 Streaming |
| **Purpose** | Handles conversational AI queries on the Work Dashboard chat panel. Routes query to the best agent, assembles context via RAG, returns a streaming response. Includes knowledge tier indicator, answer provenance chips, and general knowledge disclaimer. |
| **LLM** | Claude Haiku (routing) + Claude Sonnet (response) |
| **Execution Mode** | Streaming |
| **Token Budget** | ~3000 tokens max (chat response) |
| **BYOK Eligible** | Yes |
| **In NIGP** | ✅ Partial — chat calls route through `api/brief.js` in NIGP |
| **In DeepBench** | 🔶 Partial — inline in DashboardScreen.jsx; DB-14 partial |
| **Extraction Needed** | ✅ Yes — inline in React component; violates Layer 3 rule |
| **Current Route** | Inline in DashboardScreen.jsx |
| **Target Route** | `api/capabilities/chat-response.js` |
| **Used By** | DB-07 through DB-14 (chat panel features) |
| **Feature ID** | DB-14 🔶 |
| **Design Session Needed** | Yes — full chat wiring with real RAG + AI call needs its own design session before coding. |

---

### SVC-10 — Document Extraction

| Field | Value |
|-------|-------|
| **Slug** | `document-extraction` |
| **Type** | AI |
| **Patterns (0–N)** | PAT-07 Structured Output |
| **Purpose** | Extracts structured text content from uploaded documents (PDF, DOCX, TXT, MD). Converts raw binary to clean chunked text for the ingest pipeline. MD files skip extraction and go straight to chunking. |
| **LLM** | Claude Sonnet (complex PDFs) / Haiku (simple text) |
| **Execution Mode** | Synchronous |
| **Token Budget** | Varies by document size; chunked output |
| **BYOK Eligible** | Yes |
| **In NIGP** | ✅ Proven — `api/extract.js` |
| **In DeepBench** | ✅ Done — `api/extract.js`; PE-10 (Add Courses pipeline) |
| **Extraction Needed** | Route rename only |
| **Current Route** | `api/extract.js` |
| **Target Route** | `api/capabilities/document-extraction.js` |
| **Used By** | PE-10 Add Courses (Training tab ingest pipeline), SA-01 Training Entry production |
| **Feature ID** | PE-10 ✅ |
| **Design Session Needed** | No. Route rename in S-INFRA-01. |

---

### SVC-11 — Persona Replication

| Field | Value |
|-------|-------|
| **Slug** | `persona-replication` |
| **Type** | AI |
| **Patterns (0–N)** | PAT-01 RAG + PAT-04 Prompt Chaining + PAT-05 Reflection |
| **Purpose** | Replicates a human persona as a named agent. Two-layer approach: behavioral layer (system prompt in `agent_configs` — how the person thinks) + knowledge layer (RAG from annotated session transcripts, documents, and reasoning patterns). The reasoning pattern training type is the most valuable and hardest to replicate — teaches the agent to run the same diagnostic process on new problems. |
| **LLM** | Claude Sonnet |
| **Execution Mode** | Synchronous |
| **Token Budget** | TBD in design session |
| **BYOK Eligible** | Yes |
| **In NIGP** | ❌ No |
| **In DeepBench** | ❌ Not built — stub concept only |
| **Extraction Needed** | N/A — not built |
| **Current Route** | None |
| **Target Route** | `api/capabilities/persona-replication.js` |
| **Used By** | JL-01 (John Leonard agent), future BYOA wizard (AA-41) |
| **Feature ID** | AA-21 (JL-01 agent), S-JL-01 (design session required before building) |
| **Design Session Needed** | ✅ Yes — full design required. Session: S-JL-01. |

---

### SVC-12 — Procurement Flags

| Field | Value |
|-------|-------|
| **Slug** | `procurement-flags` |
| **Type** | Deterministic |
| **Patterns (0–N)** | None |
| **Purpose** | Rules engine that evaluates parsed spend data against procurement risk thresholds. Produces structured risk flags: Maverick Spend, PO Splitting, Vendor Concentration, Spend Spike, Single Source, Long-Tail. Each flag includes dollar amount, transaction count, and severity rating. No LLM — no ✦ AI badge in UI per ARCHITECTURE.md badge rule. |
| **LLM** | None |
| **Execution Mode** | Synchronous |
| **Token Budget** | N/A |
| **BYOK Eligible** | No |
| **In NIGP** | ✅ Proven — `computeFlags()` inline in AnalyzerScreen.jsx |
| **In DeepBench** | ✅ Done (functional) — inline in AnalyzerScreen.jsx; AZ-12 |
| **Extraction Needed** | ✅ Yes — inline in React component; violates Layer 3 rule |
| **Current Route** | Inline in AnalyzerScreen.jsx |
| **Target Route** | `api/capabilities/procurement-flags.js` |
| **Used By** | D-05 Flags Report, D-06 Data Analysis Report (Concerns tab) |
| **Feature ID** | AZ-12 ✅ (display); extraction in S-INFRA-01 |
| **Design Session Needed** | No. Extraction only — no logic change. S-INFRA-01. |

---

### SVC-13 — Vendor Concentration / HHI

| Field | Value |
|-------|-------|
| **Slug** | `vendor-concentration` |
| **Type** | Deterministic |
| **Patterns (0–N)** | None |
| **Purpose** | Computes Herfindahl-Hirschman Index (HHI) and vendor concentration metrics from spend data. HHI score + concentration tier (Competitive < 1500, Moderate 1500–2500, Highly Concentrated > 2500). No LLM — no ✦ AI badge. |
| **LLM** | None |
| **Execution Mode** | Synchronous |
| **Token Budget** | N/A |
| **BYOK Eligible** | No |
| **In NIGP** | ✅ Proven — `computeVendorConc()` inline in AnalyzerScreen.jsx |
| **In DeepBench** | ✅ Done (functional) — inline in AnalyzerScreen.jsx; AZ-14 |
| **Extraction Needed** | ✅ Yes — same Layer 3 violation as SVC-12 |
| **Current Route** | Inline in AnalyzerScreen.jsx |
| **Target Route** | `api/capabilities/vendor-concentration.js` |
| **Used By** | D-06 Data Analysis Report (HHI tab, Vendors tab) |
| **Feature ID** | AZ-14 ✅ (display); extraction in S-INFRA-01 |
| **Design Session Needed** | No. Extraction only. S-INFRA-01. |

---

### SVC-14 — Column Detection / NIGP Lookup

| Field | Value |
|-------|-------|
| **Slug** | `column-detection` |
| **Type** | Deterministic |
| **Patterns (0–N)** | None |
| **Purpose** | Detects column types in an uploaded CSV (amount, vendor, department, NIGP code, date, description) using heuristic matching. Performs NIGP code lookup against a local reference table. Powers the column mapping screen (AZ-02) after CSV upload. No LLM — no ✦ AI badge. |
| **LLM** | None |
| **Execution Mode** | Synchronous |
| **Token Budget** | N/A |
| **BYOK Eligible** | No |
| **In NIGP** | ✅ Proven — inline in AnalyzerScreen.jsx + `nigp-lookup.js` |
| **In DeepBench** | ✅ Done (functional) — inline in AnalyzerScreen.jsx; AZ-02 |
| **Extraction Needed** | ✅ Yes — same Layer 3 violation |
| **Current Route** | Inline in AnalyzerScreen.jsx + `src/nigp-lookup.js` |
| **Target Route** | `api/capabilities/column-detection.js` |
| **Used By** | D-06 Data Analysis Report (column mapping, AZ-02) |
| **Feature ID** | AZ-02 ✅ (display); extraction in S-INFRA-01 |
| **Design Session Needed** | No. Extraction only. S-INFRA-01. |

---

## 4. Services × Deliverables / Capabilities Matrix

Which Services each Deliverable uses — the composition view.

| Deliverable / Capability | Services Used | Notes |
|--------------------------|--------------|-------|
| D-01 AI Briefing | SVC-01 + SVC-02 | Prompt Assembly calls Knowledge Retrieval internally |
| D-02 Web Research Report | SVC-05 + SVC-03 + SVC-04 | Pre-Run Planning → Autonomous Research → Knowledge Reinforcement (post-run) |
| D-03 Data Fetch / Dataset | SVC-05 + SVC-03 + SVC-04 | Same sequence as D-02; terminal action differs (DOWNLOAD vs. synthesis) |
| D-04 Task / Step Plan | SVC-06 + SVC-01 + SVC-02 | Task Planning assembles via Prompt Assembly + Knowledge Retrieval |
| D-05 Flags Report | SVC-12 | Deterministic only |
| D-06 Data Analysis Report | SVC-12 + SVC-13 + SVC-14 + SVC-01 + SVC-02 | Deterministic tabs (SVC-12/13/14) + AI Review tab (SVC-01 + SVC-02) |
| D-07 Portfolio AI Review | SVC-01 + SVC-02 | Same as AI Briefing; structured Analyzer output injected as context |
| SA-01 Training Entry | SVC-04 | Output of Knowledge Reinforcement |
| SA-02 Partial Run Record | SVC-03 (error path) | Produced on SVC-03 crash or SIGTERM |

**Services that call other Services (internal composition):**
- SVC-01 Prompt Assembly calls SVC-02 Knowledge Retrieval as a step
- SVC-06 Task Planning calls SVC-01 Prompt Assembly
- SVC-05 Pre-Run Planning calls SVC-02 Knowledge Retrieval

This is a valid Service-to-Service relationship — like microservices calling each other. Not a design problem; document it explicitly so it is not accidentally flattened.

---

## 5. Unified Services Table Schema

```sql
ai_services (
  id            uuid default gen_random_uuid(),
  slug          text unique not null,          -- e.g. 'prompt-assembly'
  name          text not null,                 -- e.g. 'Prompt Assembly'
  service_type  text not null,                 -- 'ai' | 'deterministic' | 'mixed'
  description   text,
  patterns      jsonb default '[]',            -- array of pattern slugs; [] for deterministic
  properties    jsonb default '{}',            -- llm_provider, llm_model, token_budget,
                                               -- execution_mode, rag_match_count, byok_eligible
  in_nigp       boolean default false,
  in_deepbench  boolean default false,
  current_route text,
  target_route  text,
  version       integer default 1,             -- incremented when LLM or Patterns change
  created_at    timestamptz default now()
)

ai_patterns (
  id          uuid default gen_random_uuid(),
  slug        text unique not null,            -- e.g. 'rag'
  name        text not null,                   -- e.g. 'RAG'
  description text,
  created_at  timestamptz default now()
)
```

`ai_activity_log` gains two new columns (part of AI-22 lineage work):
```sql
service_slug    text references ai_services(slug),
service_version integer   -- version of the service at time of execution
```

---

## 6. Redesigned AI Audit Sections

Five sections replace the current "By Activity Type" (9 informal strings).

### Section 1 — By Service
One row per AI Service (SVC-01 through SVC-11). Columns: Service Name · Type · Calls · Est. Cost · Avg Latency.
*Source: `ai_activity_log` grouped by `service_slug` where `service_type IN ('ai', 'mixed')`.*

### Section 2 — By Pattern
One row per AI Pattern (PAT-01 through PAT-10). Rolled up from all Services that declare the Pattern. Columns: Pattern Name · Services Using It · Total Calls · Est. Cost.
*Source: join `ai_activity_log` → `ai_services.patterns` jsonb array.*

### Section 3 — Deterministic
One row per Deterministic Service (SVC-12 through SVC-14). Columns: Service Name · Executions · Avg Latency · No LLM Cost.
*No cost column — no LLM. Execution count and latency only.*
*Source: `ai_activity_log` grouped by `service_slug` where `service_type = 'deterministic'`.*

### Section 4 — By LLM
Dynamic — one row per provider + model combination found in log. Columns: Provider · Model · Total Calls · Est. Cost · Avg Latency. *(Keep existing — no change)*

### Section 5 — By Agent
Dynamic — one row per `agent_id` found in log. Columns: Agent Name · Code · Total Calls · Est. Cost · Avg Latency. *(Keep existing — no change)*

**Current `ai_type` → new `service_slug` mapping (for backfill / remapping):**

| Current ai_type string | New service_slug |
|-----------------------|-----------------|
| "planning" | `task-planning` |
| "title-generation" | `title-generation` |
| "agent-routing" | `agent-routing` |
| "briefing" | `prompt-assembly` |
| "knowledge-reinforcement" | `knowledge-reinforcement` |
| "web-research" | `autonomous-research` |
| "chat" | `chat-response` |
| "document-extraction" | `document-extraction` |
| "deterministic" | split by feature context → `procurement-flags` / `vendor-concentration` / `column-detection` |

---

## 7. MCP Exposure Surfaces

In a future MCP-enabled phase, DeepBench can expose any level of the model as an MCP server. Each level is a distinct integration surface with different granularity and pricing:

| MCP Surface | What It Exposes | Primary Caller | Tier |
|-------------|----------------|---------------|------|
| MCP Agent | Full agent persona + all authorized Capabilities — "ask Chloe a question" | Claude Desktop, external AI clients | Free / Basic |
| MCP Capability | A specific named Capability without full agent persona — "run NIGP risk assessment" | Specialized integrations | Paid |
| MCP Deliverable | The deliverable production pipeline — "generate an AI Briefing, return structured output" | External systems, other AI agents | Paid |
| MCP Service | A single AI Service directly — "call Knowledge Retrieval with this query" | Infrastructure consumers | Enterprise |
| MCP Workflow | Full multi-step task pipeline — assign → plan → execute → deliver; caller receives completed task with all deliverables | Enterprise clients | Enterprise |
| MCP Training | Push training material to an agent via MCP — enterprise document systems feed agents automatically | External DMS, CMS | Enterprise |
| MCP Feedback | Send approval or change-request signals via MCP — closes feedback loop without requiring login to DeepBench | External workflow systems | Enterprise |

**Design session required before any MCP surface is built.** All MCP items are Phase 4+. Session: S-MCP-01 (not yet scheduled).

---

## 8. Open Design Questions

Items that need a dedicated design session before any coding:

| Question | Blocks | Session |
|----------|--------|---------|
| SVC-09 Chat/Consultative Response — full wiring with real RAG + AI, streaming, knowledge tier indicator, provenance chips | DB-14 full completion | S-CHAT-01 (needs design) |
| SVC-04 Knowledge Reinforcement — input schema, per-agent persona selection, source_type → prompt mapping, category mapping | AI-17 | S-INFRA-02 |
| SVC-11 Persona Replication — full two-layer spec, training material type hierarchy, reasoning pattern ingestion | AA-21, S-JL-01 | S-JL-01 |
| SVC-08 Agent Routing feedback loop — approval rate scoring, per-agent-capability preference score formula | AI-24 | S-INFRA-01b |
| S-INFRA-01 scope — should it split into 01a (Services catalog + extractions) and 01b (capability registry, BYOK, two-speed routing)? | All downstream sessions | Pre-S-INFRA-01 decision |
| MCP architecture — which surface first, auth model, rate limiting, pricing integration | All MCP items | S-MCP-01 |

---

## 9. Service Versioning

When a Service's LLM model or declared Patterns change, the `version` column on `ai_services` increments. Every `ai_activity_log` entry records `service_version` at time of execution.

**Why this matters:**
- Deliverables produced by SVC-01 v1 (Haiku) are different from those produced by SVC-01 v2 (Sonnet). The audit trail must distinguish them.
- For the deliverable marketplace: buyers need to know which Service version produced what they are purchasing.
- For the routing feedback loop (AI-24): approval rates must be segmented by Service version to detect regressions when a Service is upgraded.

Feature ID: AI-26 (see FEATURES.md).

---

## 10. Service Health

Each Service needs uptime and reliability tracking — not just cost and latency averages. A Service that fails 10% of runs must be visible in the AI Audit.

Metrics per Service: success rate · failure rate · p50/p95 latency · last failure timestamp · failure reason categories (timeout / model error / downstream service / crash).

Tracked in `ai_activity_log` via a `success` boolean and `error_type` column (part of AI-22 lineage work or a separate extension).

Feature ID: AI-27 (see FEATURES.md).
