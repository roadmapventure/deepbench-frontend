# DeepBench — AI Services, Capabilities & Deliverables Registry
# Version: v5.2 | Created: 2026-06-15 | Updated: 2026-06-15 | Session: S-DELIVER-DESIGN

> Canonical reference for all AI Services, Deliverables, and System Artifacts in DeepBench from the deliverable composition perspective.
> Every item here maps to at least one entry in FEATURES.md.
> This document is the source of truth for: sharing patterns, feedback loops, dependencies, and build order.
>
> **AI Services full catalog (14 services, 10 patterns, table schema, AI Audit sections):** `docs/AI-SERVICES.md`
> Read alongside: ARCHITECTURE.md (layer definitions, session rules), FEATURES.md (backlog IDs and session queue).

---

## Definitions

**Layer**
- `AI Service` — DeepBench-owned named implementation; uses 0–N AI Patterns; built once, shared across many callers. Previously called "Method" — renamed 2026-06-15. Full catalog with Pattern assignments and properties: `docs/AI-SERVICES.md`.
- `Capability` — what an agent is authorized to do; shareable and gradable per Agent Profile Model
- `Deliverable` — typed output artifact the human sees, reviews, and acts on; a collection of AI Services
- `System Artifact` — internal platform record; not a user-facing deliverable

**AI Type**
- `AI` — LLM call required; carries ✦ AI badge in UI
- `Deterministic` — rule-based computation; no LLM; no ✦ AI badge
- `System` — infrastructure record; no LLM, no badge
- `Mixed` — combines more than one type in a single item

**Architecture Layer**
- `1` — Shared Foundation (tokens, agents, supabase client, config)
- `2` — Product Modules (what the user sees; calls Layer 3)
- `3` — Agent Capability Services (independent, deployable; the platform nucleus)

**Sharing Pattern** (one or more per item)
- `Producer` — the production capability is called by multiple callers or agents
- `Pipeline` — this item's output is consumed as input by another process downstream
- `Loop` — this item's output feeds back into the knowledge or training layer

**Feedback Loop**
- `Yes` — a human action on this item's output generates a training signal that flows back into the knowledge layer
- `Partial` — the mechanism is designed but not yet fully built, or the signal is implicit rather than explicit
- `No` — no human action on this item generates a training signal

---

## Item Index

| # | Title | Layer | AI Type | User-Visible |
|---|-------|-------|---------|-------------|
| M-01 | Prompt Assembly | AI Service | Mixed | No |
| M-02 | RAG Query | AI Service | Mixed | No |
| M-03 | ReAct Loop | AI Service | Mixed | Yes |
| M-04 | Self-Learning Write-back | AI Service | Mixed | No |
| M-05 | REFLECT | AI Service | AI | Yes |
| M-06 | Flag Computation | AI Service | Deterministic | No |
| D-01 | AI Briefing | Deliverable | AI | Yes |
| D-02 | Web Research Report | Deliverable | AI | Yes |
| D-03 | Data Fetch / Dataset | Deliverable | Mixed | Yes |
| D-04 | Task / Step Plan | Deliverable | AI | Yes |
| D-05 | Flags Report | Deliverable | Deterministic | Yes |
| D-06 | Data Analysis Report | Deliverable | Mixed | Yes |
| D-07 | Portfolio AI Review | Deliverable | AI | Yes |
| SA-01 | Training Entry / Field Note | System Artifact | Mixed | Yes (partial) |
| SA-02 | Partial Run Record | System Artifact | System | No |

---

## Table 1 — Identity, Classification & Sharing

| ID | Title | Purpose | AI Type | Layer | Arch Layer | User-Visible | Sharing Pattern | Callers & Consumers |
|----|-------|---------|---------|-------|-----------|-------------|----------------|---------------------|
| M-01 | Prompt Assembly | Stacks role prompt + guardrails + output format + RAG chunks + REFLECT into one assembled system prompt at call time | Mixed | AI Service | 3 | No | Producer · Pipeline | **Callers:** AI Briefing, Portfolio AI Review, Task Planning (Michelle), Test Agent (PE-12), REFLECT pre-call. **Consumers:** every Deliverable that requires an assembled system prompt receives its output |
| M-02 | RAG Query | Vector similarity search against `knowledge_entries` to retrieve relevant knowledge chunks for a given query text | Mixed | AI Service | 3 | No | Producer · Pipeline · Loop | **Callers:** Prompt Assembly (as a step), AI Briefing direct, Portfolio AI Review, REFLECT. **Consumers:** any Deliverable requiring knowledge-augmented response; output also flows back into knowledge layer when new entries are written post-retrieval |
| M-03 | ReAct Loop | Browser automation reasoning loop — Claude reasons about a screenshot, Playwright executes the action, repeat until terminal state (DOWNLOAD, DONE, or STUCK) | Mixed | Method | 3 (Railway) | Yes — live step log streams to UI in real time | Producer · Pipeline · Loop | **Callers:** Web Research capability (Brent, Pat), Data Fetch capability (Brent, Pat) — same loop, terminal action determines output type. **Consumers:** Web Research Report (synthesis output), Data Fetch/Dataset (file output), Self-Learning Write-back (triggered post-run), REFLECT (reads prior run history pre-run) |
| M-04 | Self-Learning Write-back | Post-run synthesis using Haiku + OpenAI embedding; writes structured knowledge entry to `knowledge_entries` autonomously after any ReAct run — success, failure, or interruption | Mixed | AI Service | 3 | No — result appears in Training tab as agent-sourced entry | Producer · Loop | **Callers:** ReAct Loop post-run (Web Research runs, Data Fetch runs). **Consumers:** RAG Query (future retrieval of written entries), Training tab (PE-03 display), Knowledge Reinforcement capability (AI-17) |
| M-05 | REFLECT | Pre-run Claude (Haiku) call that reads agent memory via RAG and writes a step-by-step execution plan for the upcoming ReAct run — agent plans before it acts | AI | AI Service | 3 | Yes — execution plan shown to user in Fetch UI before run begins | Producer · Pipeline | **Callers:** any ReAct-based capability before run start (Web Research, Data Fetch). **Consumers:** ReAct Loop receives the plan as priming context; user sees the plan in the Fetch screen |
| M-06 | Flag Computation | Deterministic rules engine — evaluates parsed spend data against procurement risk thresholds; produces structured risk flags with dollar amounts, transaction counts, and severity ratings | Deterministic | AI Service | 3 | No — output surfaces in Flags Report and Data Analysis Report | Producer · Pipeline | **Callers:** Flags Report, Data Analysis Report (Concerns tab). **Consumers:** both Deliverables above consume its output as their data source |
| D-01 | AI Briefing | Agent-produced executive analysis document — structured HTML with findings, risk flags, compliance notes, and recommended actions; grounded in agent knowledge and uploaded data | AI | Deliverable | 2 | Yes | Producer · Pipeline | **Callers (production capability):** Step execution (S11), Test Agent (PE-12), Chat flow (DB-14), Portfolio AI Review. **Consumers of output:** Human (direct); in multi-agent workflows, Agent B receives Agent A's brief as context input; Deliverables Card (DL-02); change request flow (DL-05) |
| D-02 | Web Research Report | Agent-produced synthesis of findings from a live web research run — what the agent found, what it tried, what it could not complete; formatted for human review and approval | AI | Deliverable | 2 | Yes | Producer · Pipeline · Loop | **Callers (production capability):** Brent (DR-06), Pat (IR-07, pending), any future ReAct-capable agent. **Consumers of output:** Human (direct); AI Briefing (findings as context in multi-agent handoff); Deliverables Card (DL-02); training layer via approval (DL-06) |
| D-03 | Data Fetch / Dataset | Structured CSV file downloaded from a government portal by the ReAct agent — delivered to the user for download and optionally fed into the Analyzer as the next pipeline stage | Mixed | Deliverable | 2 | Yes — downloadable file; feeds Analyzer | Producer · Pipeline · Loop | **Callers (production capability):** Brent (DR-06), Pat (IR-07, pending). **Consumers of output:** Human (download); Data Analysis Report (Analyzer input — direct pipeline dependency); Deliverables Card (DL-02); change request triggers re-fetch |
| D-04 | Task / Step Plan | Michelle-produced structured plan for a task — named steps, assigned agents, step types — delivered to the user for approval before execution begins | AI | Deliverable | 2 | Yes — Assign Work screen IS the review UI | Producer · Pipeline | **Callers (production capability):** Assign Work flow, future re-planning mid-task (HITL step gate). **Consumers of output:** Human (approve or revise); Step execution engine (S11 reads plan to sequence runs); Deliverables Card (DL-02); approval rate feeds AI-24 routing feedback loop |
| D-05 | Flags Report | Human-readable presentation of procurement risk flags — each flag named with dollar amount, transaction count, and severity; produced from deterministic spend analysis | Deterministic | Deliverable | 2 | Yes — Concerns tab in Analyzer | Producer · Pipeline | **Callers (production capability):** Analyzer (user-triggered on CSV upload); future: agent step output. **Consumers of output:** Human (direct); Data Analysis Report contains it as a section; future: Deliverables Card (DL-02) |
| D-06 | Data Analysis Report | Multi-section visual and tabular analysis of spend CSV — 10 named views: Categories, Treemap, Vendors, Departments, Timeline, Concerns, Local Spend, HHI, AI Review, Cleanup | Mixed | Deliverable | 2 | Yes | Producer · Pipeline | **Callers (production capability):** User (CSV upload direct); Data Fetch completion (dataset fed into Analyzer as next pipeline stage). **Consumers of output:** Human (direct); Portfolio AI Review (structured analysis output injected as data context for AI synthesis); Deliverables Card (DL-02) |
| D-07 | Portfolio AI Review | AI synthesis of the full analyzed procurement portfolio — AI Briefing engine with structured Analyzer output injected as data context; produces strategic recommendations on the full spend picture | AI | Deliverable | 2 | Yes — AI Review tab in Analyzer | Producer · Pipeline | **Callers (production capability):** Analyzer AI Review tab; future: agent step. **Consumers of output:** Human (direct); Deliverables Card (DL-02); change request flow (DL-05) |
| SA-01 | Training Entry / Field Note | Structured knowledge record written to `knowledge_entries` by an agent autonomously after a run — title, category, jurisdiction, content, triggers, vector embedding — feeds future RAG retrieval for that agent | Mixed | System Artifact | 3 | Partial — appears in Training tab as agent-sourced entry (source: "agent"); not surfaced as a reviewable deliverable | Producer · Loop | **Callers:** Self-Learning Write-back (post-run, autonomous); future: any capability via AI-17 auto-train service. **Consumers:** RAG Query (future retrieval), Training tab (PE-03 display), Knowledge Reinforcement capability; human edit re-ingests updated content |
| SA-02 | Partial Run Record | Minimal crash or interrupt record saved to `agent_run_log` when a ReAct run terminates before completion — preserves action history for audit; no embedding, no user-facing deliverable | System | System Artifact | 3 | No — `agent_run_log` only; not surfaced in UI currently | Producer · Loop | **Callers:** SIGTERM handler, crash save — triggered by any ReAct run on any agent. **Consumers:** REFLECT (reads failure history when planning next run — implicit loop); AI Audit screen (AI-12, future) |

---

## Table 2 — Feedback Loop

| ID | Title | Feedback Loop | Human Action That Triggers Signal | Signal Feeds Into |
|----|-------|--------------|----------------------------------|-------------------|
| M-01 | Prompt Assembly | No | No direct human action on assembled prompt | — |
| M-02 | RAG Query | No | No direct human action on retrieved chunks (chunks visible in Test Agent debug panel only) | — |
| M-03 | ReAct Loop | Partial | Human stops run (SSE disconnect) — interruption is a signal that the run failed to self-terminate. Human also implicitly signals quality via approval or change request on the output Deliverable | Stop event → Partial Run Record (SA-02) → REFLECT reads on next run; output Deliverable approval/rejection feeds training loop |
| M-04 | Self-Learning Write-back | Yes | Human edits a Training Entry (PE-11) or deletes it (PE-03) | Edited entry re-ingested via `api/ingest.js` → updated vector embedding → future RAG retrieval reflects the correction |
| M-05 | REFLECT | Partial | No explicit approve/reject on execution plan today. Run outcome vs. plan accuracy is implicit signal. Future: user could edit the plan before confirming run start | Run outcome → Self-Learning Write-back → `knowledge_entries` → future REFLECT reads updated memory |
| M-06 | Flag Computation | No | No human approve/reject on flag computation today. Future: false-positive marking could tune thresholds — not yet designed | — |
| D-01 | AI Briefing | Yes | Change request (DL-05): user requests revision → status → `change_requested` → agent re-runs. Approval (DL-06): user approves → flagged for training ingestion | Change request → agent re-runs briefing capability → new deliverable version. Approval → `knowledge_entries` via DL-06 supervised ingestion → future RAG retrieval quality raised. Approval and change-request rates → AI-24 routing feedback loop (per agent per capability) |
| D-02 | Web Research Report | Yes | Change request (DL-05): user requests revision → agent re-runs web research. Approval (DL-06): flagged for training ingestion | Change request → ReAct Loop re-run → new Web Research Report. Approval → `knowledge_entries` → future REFLECT and RAG for similar research tasks. Rates → AI-24 |
| D-03 | Data Fetch / Dataset | Partial | Change request (DL-05): user requests re-fetch → agent re-runs. Less direct as training signal — fetch quality is harder to formalize as a knowledge entry. Self-Learning Write-back handles the implicit post-run signal | Change request → ReAct Loop re-run → new dataset. Self-Learning Write-back already captures run learnings independent of user action |
| D-04 | Task / Step Plan | Yes | User approves plan (AW-11: "Approve Steps & Launch") or requests HITL revision mid-task (TI-18). Approval rate per plan type is a measurable quality signal | Approval → execution begins. Change requests → Michelle re-plans (surgical replanning directive, AG-06). Approval and revision rates per plan type → AI-24 routing feedback loop |
| D-05 | Flags Report | Partial | No approve/reject today. Future: user marks a flag as "acknowledged" or "false positive" — not yet designed | Future: false-positive signal → flag threshold calibration. Not yet built |
| D-06 | Data Analysis Report | Partial | No direct approve/reject on analysis views. The AI Review tab (D-07) within it goes through the AI Briefing feedback loop | AI Review tab approval/change request → AI Briefing feedback loop (D-01) |
| D-07 | Portfolio AI Review | Yes | Change request (DL-05): user requests revision → agent re-runs with same data context. Approval (DL-06): flagged for training ingestion | Same as AI Briefing (D-01) — same production capability, same feedback path |
| SA-01 | Training Entry / Field Note | Yes | Human edits entry (PE-11) or deletes it (PE-03) in the Training tab | Edited entry → re-ingested → updated vector embedding in `knowledge_entries` → future RAG retrieval corrected. This IS the knowledge feedback loop — every other feedback path eventually lands here |
| SA-02 | Partial Run Record | No | No human action triggers a training signal on the record itself. REFLECT reads failure history implicitly | REFLECT reads `agent_run_log` when planning next run — implicit, not human-triggered |

---

## Table 3 — Current State & Gap

| ID | Title | In NIGP | In DeepBench | Feature ID | Enhancement Needed | New Feature ID |
|----|-------|---------|-------------|-----------|-------------------|----------------|
| M-01 | Prompt Assembly | ✅ Proven — `assembleContext()` in `api/agent-run.js`; 5-layer assembly + REFLECT | 🔶 Partial — logic inline in `api/brief.js` and `api/plan.js`; not a shared service | AA-03 | Extract to `api/capabilities/prompt-assembly.js`; token cap per block; callable by any Capability route | AA-03 (exists in backlog) |
| M-02 | RAG Query | ✅ Proven — `api/rag-query.js`; called by `assembleContext()` | ✅ Done — `api/brief.js` calls RAG inline; `api/rag-query.js` exists | AI-09 | Rename to target route per ARCHITECTURE.md Layer 3 table; no logic change | Route rename only — part of S-INFRA-01 |
| M-03 | ReAct Loop | ✅ Proven — `nigp-analyzer-agent-api/src/agent.js`; MAX_STEPS 25, MAX_RUN_MS 5min; DOWNLOAD terminal state | ✅ Done for Brent — FT-02, FT-03 | FT-02 ✅, FT-03 ✅ | Wire Pat (IR-07) as second authorized agent; write deliverable record to `deliverables` table on terminal state | TI-17, FT-06 (exist); DL linkage needed |
| M-04 | Self-Learning Write-back | ✅ Proven — `api/web-memory.js` POST + `api/ingest.js`; Haiku synthesis + OpenAI embed + Supabase write | 🔶 Partial — hardcoded to Brent persona and "Portal Navigation" category; not generalized | AI-17 | Extract to `api/auto-train`; accept `agent_id`, `source_type` (portal_run / document / conversation / test_result), raw artifact payload; remove hardcoded Brent logic | AI-17 (exists in backlog) |
| M-05 | REFLECT | ✅ Proven — `api/web-memory.js` GET → `assembleContext()` → `executionPlan` field; Haiku call; shown in Fetch UI | 🔶 Partial — called before Brent runs in FT-02; not a named discrete step; not extended to other agents | FT-02 (partial) | Formalize as named Method step; callable before any ReAct-based Capability for any agent | No new ID — part of S-INFRA-01 ReAct wiring |
| M-06 | Flag Computation | ✅ Proven — `computeFlags()` inline in AnalyzerScreen.jsx | ✅ Done (functional) — inline in AnalyzerScreen.jsx; AZ-12 | AZ-12 | Extract to `api/capabilities/procurement-flags.js`; currently violates Architecture Layer 3 rule (AI logic inside React component) | Route extraction only — part of S-INFRA-01 |
| D-01 | AI Briefing | ✅ Proven — `api/brief.js` + AI Review tab in AnalyzerScreen; 5-layer prompt via `assembleContext()` | 🔶 Partial — `api/brief.js` works; not tied to `deliverables` table; not surfaced as a reviewable artifact with approve/change-request flow | AZ-15 (partial) | Write to `deliverables` table on completion (DL-04); surface in Deliverables Card (DL-02); approve and change-request flow (DL-05) | DL-02, DL-05 (exist); no new ID |
| D-02 | Web Research Report | ✅ Proven — post-run synthesis in `api/web-memory.js` POST; structured entry with title, content, category | 🔶 Partial — stored in `agent_run_log` only; not a reviewable deliverable; no approve/change-request flow | FT-04 (partial) | Write synthesis to `deliverables` table on run completion; surface in Deliverables Card; approve and change-request flow | **New: DL-10** |
| D-03 | Data Fetch / Dataset | ✅ Proven — FT-01 through FT-04; DOWNLOAD terminal state; `GET /agent/download` serves file | 🔶 Partial — FT-02 ✅, FT-03 ✅, FT-04 🔶 (download works; Map Fields partial) | FT-04, FT-05 | Write to `deliverables` table on completion; Supabase Storage for file persistence (SH-07); Pat authorized as second fetch agent (FT-06) | FT-05, FT-06 (exist); **DL-10** covers deliverable write |
| D-04 | Task / Step Plan | ❌ No — NIGP has no planning agent or multi-step plan concept | ✅ Done — AW-05, AW-16, `api/plan.js`; Michelle (PP-01); step timeline in Task Instructions | AW-05, AW-16 | Write approved plan to `deliverables` table as a first-class deliverable on launch (type: "plan", is_final: false — parent of all step deliverables) | **New: DL-11** |
| D-05 | Flags Report | ✅ Proven — Concerns tab in AnalyzerScreen; 6 flag types with dollar amounts and transaction counts | ✅ Done (display) — AZ-12 | AZ-12 | Write to `deliverables` table when user exports or views; no ✦ AI badge (deterministic); surface in Deliverables Card | **New: DL-12** |
| D-06 | Data Analysis Report | ✅ Proven — full AnalyzerScreen; AZ-06 through AZ-17; 10 tabs | ✅ Done (display) / 🔶 Partial (AI Review tab) — AZ-06–AZ-17 | AZ-06–AZ-17 | Complete AI Review tab (AZ-15); write analysis summary to `deliverables` table; route Flag Computation and HHI to Layer 3 | AZ-15 completion; **DL-12** for deliverable write |
| D-07 | Portfolio AI Review | 🔶 Partial — AI Review tab partially built in AnalyzerScreen; 3-stage design not completed | 🔶 Partial — AZ-15 | AZ-15 | Complete 3-stage review; write to `deliverables` table; reuses `api/brief.js` with structured Analyzer output injected as data context — not a new route | AZ-15 completion |
| SA-01 | Training Entry / Field Note | ✅ Proven — `api/web-memory.js` POST result; structured record with title, category, jurisdiction, priority, triggers, content, embedding | 🔶 Partial — Brent only; "Portal Navigation" category hardcoded; not generalized to other agents or source types | AI-17 | AI-17 auto-train service generalizes to any agent and any source type; removes hardcoded Brent persona | AI-17 (exists in backlog) |
| SA-02 | Partial Run Record | ✅ Proven — SIGTERM handler + crash save in `server.js`; direct Supabase write to `agent_run_log`; no embedding | ✅ Done — same pattern carried into DeepBench | — | None for MVP; surface action history in AI Audit per-task view (AI-12) in future | AI-12 (exists in backlog) |

---

## Table 4 — Dependencies & Build Order

| ID | Title | Depends On | Required By | Completes (FEATURES.md) | Current Route (NIGP) | Target Route (DeepBench) | DB Tables | Agents Authorized | Build Session |
|----|-------|-----------|------------|------------------------|---------------------|-------------------------|-----------|------------------|---------------|
| M-01 | Prompt Assembly | M-02 (RAG Query), `agent_configs` (role prompt + guardrails + output format) | D-01 AI Briefing, D-07 Portfolio AI Review, D-04 Task/Step Plan, PE-12 Test Agent | AA-03 | `api/agent-run.js` `assembleContext()` | `api/capabilities/prompt-assembly.js` | `agent_configs` (read), `knowledge_entries` (read via M-02) | All agents with a role_prompt in `agent_configs` | S-INFRA-01 |
| M-02 | RAG Query | `knowledge_entries` + pgvector, OpenAI `text-embedding-3-small` | M-01 Prompt Assembly, D-01 AI Briefing, D-07 Portfolio AI Review, M-05 REFLECT | AI-09 ✅ | `api/rag-query.js` | `api/capabilities/rag-query.js` | `knowledge_entries` (read), `ai_activity_log` (log) | All trained agents | Already done; route rename in S-INFRA-01 |
| M-03 | ReAct Loop | Railway process, M-05 REFLECT (pre-run), M-04 Self-Learning Write-back (post-run) | D-02 Web Research Report, D-03 Data Fetch/Dataset | FT-02 ✅, FT-03 ✅; TI-17 + FT-06 when Pat wired | Railway `src/agent.js` | Railway only (per ARCHITECTURE.md Section 6) | `agent_run_log` (write), `deliverables` (write on completion — needs DL-04), `ai_activity_log` (log) | Brent (DR-06) ✅, Pat (IR-07) ❌ pending | S11b (Pat); S-DELIVER-04 (deliverables write) |
| M-04 | Self-Learning Write-back | M-02 RAG Query (dedup check), OpenAI embeddings, `api/ingest.js` | D-02 Web Research Report (post-run), D-03 Data Fetch (post-run), SA-01 Training Entry | AI-17 | `api/web-memory.js` POST + `api/ingest.js` | `api/capabilities/knowledge-reinforcement.js` | `knowledge_entries` (write), `ai_activity_log` (log) | Brent ✅; future: any agent via AI-17 | S-INFRA-02 |
| M-05 | REFLECT | M-02 RAG Query, M-01 Prompt Assembly, `agent_configs` | M-03 ReAct Loop (called before every run) | Part of FT-02 ✅ | `api/web-memory.js` GET → `assembleContext()` | Formalized step inside `api/capabilities/knowledge-reinforcement.js` GET path | `knowledge_entries` (read), `agent_configs` (read) | Brent ✅, Pat ❌ pending | S-INFRA-01 |
| M-06 | Flag Computation | Parsed CSV data (PapaParse output) | D-05 Flags Report, D-06 Data Analysis Report (Concerns tab) | AZ-12 ✅ (display); route extraction in S-INFRA-01 | Inline in `AnalyzerScreen.jsx` | `api/capabilities/procurement-flags.js` | None — stateless computation | N/A — no agent authorization; user-triggered | S-INFRA-01 |
| D-01 | AI Briefing | M-01 Prompt Assembly, M-02 RAG Query, DL-04 (`deliverables` table), S11 step execution | DL-02 Deliverables Card, DL-05 change request flow, DL-07 agent Projects tab, AI-24 routing feedback loop | AZ-15 (full), TI-16, DL-02 | `api/brief.js` | `api/brief.js` (exists); long-term `api/capabilities/rag-query.js` | `deliverables` (write), `knowledge_entries` (read via RAG), `ai_activity_log` (log) | Chloe (JR-01), Mike (SR-02), Bob (PR-04), Robyn (CN-03) | S11 (deliverables write); S-DELIVER-02 (card UI) |
| D-02 | Web Research Report | M-03 ReAct Loop, M-04 Self-Learning Write-back, DL-04 (`deliverables` table) | DL-02 Deliverables Card, DL-05 change request, DL-07 agent Projects tab, D-01 AI Briefing (as context in multi-agent) | FT-04 (partial completion); **DL-10** (new) | `api/web-memory.js` POST (synthesis side) | M-04 Self-Learning Write-back route + `deliverables` table write | `deliverables` (write), `agent_run_log` (write), `ai_activity_log` (log) | Brent (DR-06) ✅, Pat (IR-07) ❌ pending | S-DELIVER-04 |
| D-03 | Data Fetch / Dataset | M-03 ReAct Loop, DL-04 (`deliverables` table), SH-07 (Supabase Storage) | D-06 Data Analysis Report (downstream input), DL-02 Deliverables Card, DL-05 change request | FT-04 (partial), FT-05, FT-06; **DL-10** covers deliverable write | Railway `agent.js` DOWNLOAD + `GET /agent/download` | Same Railway pattern; add Supabase Storage write (SH-07) | `deliverables` (write), `agent_run_log` (write), Supabase Storage `task-data` bucket (write) | Brent (DR-06) ✅, Pat (IR-07) ❌ pending | S-DELIVER-04, S11b |
| D-04 | Task / Step Plan | M-01 Prompt Assembly, DL-04 (`deliverables` table) | S11 step execution (reads plan), DL-02 Deliverables Card, DL-07 agent Projects tab, AI-24 routing feedback loop | AW-05 ✅, AW-16 ✅; **DL-11** (new — plan as stored deliverable) | N/A — no NIGP equivalent | `api/plan.js` (exists); long-term `api/capabilities/task-planning.js` | `tasks` (write steps), `deliverables` (write — needs DL-11), `ai_activity_log` (log) | Michelle (PP-01) | S-DELIVER-04 |
| D-05 | Flags Report | M-06 Flag Computation, AZ-01 CSV upload, DL-04 (`deliverables` table) | DL-02 Deliverables Card, DL-07 agent Projects tab, D-06 Data Analysis Report (contains as section) | AZ-12 ✅ (display); **DL-12** (new — deliverable write) | Inline in `AnalyzerScreen.jsx` | `api/capabilities/procurement-flags.js` (extraction target) | `deliverables` (write — future), `ai_activity_log` (log as deterministic) | N/A — no agent; user-triggered | S-INFRA-01 (route extraction); S-DELIVER-04 (deliverable write) |
| D-06 | Data Analysis Report | M-06 Flag Computation, Vendor Concentration/HHI computation, AZ-01 CSV upload, M-01 + M-02 (for AI Review tab), DL-04 | D-07 Portfolio AI Review (its structured output is the input context), DL-02 Deliverables Card, D-03 Data Fetch (upstream feeder) | AZ-06–AZ-14 ✅; AZ-15 🔶; **DL-12** for deliverable write | Inline in `AnalyzerScreen.jsx` | `api/capabilities/data-analysis.js` (ARCHITECTURE.md target) | `deliverables` (write — future), Supabase Storage (CSV read — SH-07), `ai_activity_log` (log) | N/A — user-driven; no agent assignment | AZ-15 own session; S-DELIVER-04 (deliverable write) |
| D-07 | Portfolio AI Review | M-01 Prompt Assembly, M-02 RAG Query, D-06 Data Analysis Report output as injected context, DL-04 | DL-02 Deliverables Card, DL-05 change request | AZ-15 | `api/brief.js` (same route as AI Briefing, different payload) | `api/brief.js` (same; not a new route — parameterized call) | `deliverables` (write), `ai_activity_log` (log) | Chloe, Mike, Bob, Robyn | AZ-15 completion session |
| SA-01 | Training Entry / Field Note | M-04 Self-Learning Write-back, OpenAI embeddings | M-02 RAG Query (future retrieval), PE-03 Training tab display, PE-11 Edit Course (human correction) | AI-17 (when generalized beyond Brent) | `api/web-memory.js` POST result | `api/capabilities/knowledge-reinforcement.js` | `knowledge_entries` (write) | Brent ✅; future: any agent via AI-17 | S-INFRA-02 |
| SA-02 | Partial Run Record | `agent_run_log` table | M-05 REFLECT (reads failure history for next run plan), AI-12 (full audit screen — future) | — (no feature completed; AI-12 in future) | Direct Supabase write in Railway `server.js` | Same — Railway only | `agent_run_log` (write) | N/A — system | Already done; AI-12 session for surface |

---

## New Feature IDs Required

Three items in this registry have no existing FEATURES.md entry. Add before closing this session:

| New ID | Title | Description |
|--------|-------|-------------|
| **DL-10** | Web Research Report + Data Fetch as `deliverables` table entries | On ReAct run completion (DONE or DOWNLOAD terminal state), write a deliverable record to the `deliverables` table. Covers both Web Research Report (synthesis content) and Data Fetch/Dataset (file reference + metadata). Enables Deliverables Card (DL-02), approve/change-request flow (DL-05), and agent Projects tab (DL-07) for Brent and Pat runs. |
| **DL-11** | Task / Step Plan as `deliverables` table entry | On "Approve Steps & Launch", write the approved plan to `deliverables` as type: "plan", is_final: false. This record becomes the parent of all step-level deliverables produced during execution. Enables plan history, plan-level change requests, and Michelle attribution on the Projects tab. |
| **DL-12** | Flags Report + Data Analysis Report as `deliverables` table entries | When a user views the Flags Report or exports analysis from the Analyzer, write a deliverable record. Type: "flags_report" and "analysis_report" respectively. Enables Deliverables Card and agent Projects tab attribution. No AI badge on Flags Report (deterministic). |

---

## Key Architectural Findings

**1. Two Methods are the highest-leverage builds**
Prompt Assembly (M-01) and RAG Query (M-02) are called by every AI Deliverable in this registry. Building them as proper shared services (S-INFRA-01) unblocks AI Briefing, Portfolio AI Review, Task Planning, and Test Agent in a single session.

**2. S-INFRA-01 is the most load-bearing session in the queue**
It delivers: Prompt Assembly extraction (AA-03), RAG Query rename, REFLECT formalization, Flag Computation extraction, and the route naming convention cleanup across all Layer 3 capability routes.

**3. DL-04 is the gate for six deliverables**
AI Briefing, Web Research Report, Data Fetch/Dataset, Task/Step Plan, Flags Report, and Data Analysis Report all need the `deliverables` table to exist before they can write their output. DL-04 (S-DELIVER-04) unblocks all six simultaneously.

**4. Every item is a shared service**
No item in this registry is isolated. Every Method, Capability, Deliverable, and System Artifact participates in at least one sharing relationship — Producer, Pipeline, or Loop. The platform is self-describing and self-optimizing by construction.

**5. The feedback loop always lands in `knowledge_entries`**
Every feedback path — change requests, approvals, edited training entries, run outcomes — eventually writes to or reads from `knowledge_entries`. This table is the memory of the platform. SA-01 (Training Entry / Field Note) is the artifact form of that memory.

**6. One Layer 3 rule violation exists today**
Flag Computation (M-06) lives inline in a React component (AnalyzerScreen.jsx). This violates Architecture Layer 3 rule: no AI or capability logic inside a React component. Extract to `api/capabilities/procurement-flags.js` in S-INFRA-01.

---

## Session Dependencies (Build Order Summary)

```
M-02 RAG Query (done) ──────────────────┐
                                         ▼
M-05 REFLECT ──────────────────► M-03 ReAct Loop ──► D-02 Web Research Report (needs DL-04)
                                         │             D-03 Data Fetch / Dataset  (needs DL-04)
                                         ▼
                               M-04 Self-Learning Write-back (S-INFRA-02)
                                         │
                                         ▼
M-01 Prompt Assembly (S-INFRA-01) ──────► D-01 AI Briefing   (needs DL-04, S11)
                                         ► D-07 Portfolio AI Review (needs DL-04, AZ-15)
                                         ► D-04 Task / Step Plan  (needs DL-04, DL-11)

M-06 Flag Computation (S-INFRA-01) ─────► D-05 Flags Report        (needs DL-04, DL-12)
                                         ► D-06 Data Analysis Report (needs DL-04, DL-12, AZ-15)

DL-04 deliverables table (S-DELIVER-04) — gates: D-01, D-02, D-03, D-04, D-05, D-06, D-07, DL-11, DL-12
```
